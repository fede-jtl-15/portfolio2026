import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { isCacheFresh, recordCacheFresh } from './fingerprint';
import { r2VideosForProyectosDir } from './r2-media';
import { preparedVideo } from './video-prep';

/**
 * Assets for one hub sub-project (see the `hub` field on the work
 * collection schema), read by convention from
 * public/images/proyectos/<relDir>/ — the file named "*_background.*" is
 * the background image, every other photo/gif/video in that folder is a
 * gallery item. Compressed copies of photos and gifs are cached in
 * proyectos/strip/hub/ the first time each source is seen, since originals
 * here run up to ~17MB, and regenerated whenever the source file is
 * replaced (see src/lib/fingerprint.ts) — so replacing a file (same
 * filename, new content) is picked up on the next request instead of
 * silently keeping the old compressed version forever. Videos aren't
 * recompressed (sharp only handles images) — mp4/m4v/mov ones are either
 * remuxed or, when the codec itself isn't safely compatible, re-encoded —
 * see preparedVideo() below for why that turned out to matter.
 *
 * Videos are also too large to commit to git (GitHub hard-blocks any single
 * file over 100MB, and this project's source footage regularly exceeds
 * that) — they're hosted on Cloudflare R2 instead and served from
 * src/data/r2-media.json (see src/lib/r2-media.ts) rather than processed
 * from a local file at build time. A video already in that manifest is
 * served straight from its R2 URL, whether or not the local source is even
 * present — it won't be on a fresh CI checkout, since it's gitignored. A
 * video NOT yet in the manifest (freshly dropped in, not migrated yet)
 * still goes through the old local ffmpeg pipeline below, so it previews
 * locally immediately; it just won't appear on the deployed site until
 * scripts/migrate-videos-to-r2.mjs has been run for it.
 */

const PROYECTOS_DIR = path.join(process.cwd(), 'public/images/proyectos');
const CACHE_DIR = path.join(PROYECTOS_DIR, 'strip', 'hub');
const IMAGE_RE = /\.(jpe?g|png)$/i;
const GIF_RE = /\.gif$/i;
const VIDEO_RE = /\.(mp4|m4v|mov|webm)$/i;
// mp4/mov-family containers store a "moov" atom describing how to decode
// the file — exported at the end by some tools/cameras instead of the
// start. A browser needs it before it can play anything, so a video like
// that either stalls or (observed in practice) just renders blank. webm
// (Matroska-based) doesn't have this failure mode, so it's excluded here.
const FASTSTART_RE = /\.(mp4|m4v|mov)$/i;
const MEDIA_RE = /\.(jpe?g|png|gif|mp4|m4v|mov|webm)$/i;
const BACKGROUND_MAX = 1600;
const GALLERY_MAX = 1000;
// A gif this large (some run 100MB+, hundreds of frames — really a video
// wearing a gif extension) makes sharp's animated resize take minutes,
// which isn't practical on a dev-server request or a build step. Past this
// size, skip recompression and link the original directly — it still
// animates, just not slimmed down. The real fix for one of these is
// converting it to mp4/webm before it lands in this folder, not something
// this pipeline can do on its own.
const GIF_COMPRESS_MAX_BYTES = 8 * 1024 * 1024;

export interface HubImage {
  kind: 'image';
  src: string;
  w: number;
  h: number;
}

export interface HubVideo {
  kind: 'video';
  src: string;
}

export type HubGalleryItem = HubImage | HubVideo;

export interface HubAssets {
  background: HubImage | null;
  gallery: HubGalleryItem[];
}

async function compressedImage(inPath: string, outPath: string, maxDimension: number): Promise<{ width: number; height: number }> {
  const info = await sharp(inPath)
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(outPath);
  return { width: info.width, height: info.height };
}

async function compressedGif(inPath: string, outPath: string, maxDimension: number): Promise<{ width: number; height: number }> {
  const info = await sharp(inPath, { animated: true, limitInputPixels: false })
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .gif()
    .toFile(outPath);
  // For an animated output, sharp reports `height` as every frame stacked
  // into one tall canvas — divide back down to a single frame's height.
  const pages = info.pages ?? 1;
  return { width: info.width, height: info.height / pages };
}

async function cachedImageDims(outPath: string, isGif: boolean): Promise<{ width: number; height: number }> {
  const meta = await sharp(outPath, { animated: isGif }).metadata();
  const pages = isGif ? (meta.pages ?? 1) : 1;
  return { width: meta.width ?? 800, height: (meta.height ?? 800) / pages };
}

function publicSrc(relDir: string, file: string): string {
  return `/images/proyectos/${relDir}/${encodeURIComponent(file)}`;
}

export async function getHubAssets(relDir: string): Promise<HubAssets> {
  const sourceDir = path.join(PROYECTOS_DIR, relDir);
  if (!existsSync(sourceDir)) return { background: null, gallery: [] };
  mkdirSync(CACHE_DIR, { recursive: true });

  const prefix = relDir
    .toLowerCase()
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const files = readdirSync(sourceDir).filter((f) => MEDIA_RE.test(f));
  const r2Media = new Map(r2VideosForProyectosDir(relDir).map(({ file, entry }) => [file, entry]));

  let background: HubImage | null = null;
  const gallery: HubGalleryItem[] = [];

  for (const file of files) {
    const inPath = path.join(sourceDir, file);
    const base = file.replace(MEDIA_RE, '');
    const isBackground = /_background$/i.test(base);
    const safeBase = base.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const r2Entry = r2Media.get(file);

    if (VIDEO_RE.test(file)) {
      // Videos never become the piece's background — .hub__bg-img is a
      // plain <img>, and a "_background" video would have nowhere to go —
      // so it just falls through to the gallery like any other video.
      if (r2Entry) {
        gallery.push({ kind: 'video', src: r2Entry.url });
      } else if (FASTSTART_RE.test(file)) {
        const outName = `${prefix}-${safeBase}.mp4`;
        const outPath = path.join(CACHE_DIR, outName);
        try {
          if (!isCacheFresh(CACHE_DIR, inPath, outName)) {
            await preparedVideo(inPath, outPath);
            recordCacheFresh(CACHE_DIR, inPath, outName);
          }
          gallery.push({ kind: 'video', src: `/images/proyectos/strip/hub/${outName}` });
        } catch (err) {
          console.warn(`[hub-assets] video preparation failed, linking original instead: ${inPath}`, err);
          gallery.push({ kind: 'video', src: publicSrc(relDir, file) });
        }
      } else {
        gallery.push({ kind: 'video', src: publicSrc(relDir, file) });
      }
      continue;
    }

    const isGif = GIF_RE.test(file);
    const outName = `${prefix}-${safeBase}.${isGif ? 'gif' : 'jpg'}`;
    const outPath = path.join(CACHE_DIR, outName);

    if (isGif && statSync(inPath).size > GIF_COMPRESS_MAX_BYTES) {
      const img: HubImage = { kind: 'image', src: r2Entry?.url ?? publicSrc(relDir, file), w: r2Entry?.width ?? 0, h: r2Entry?.height ?? 0 };
      if (isBackground) background = img;
      else gallery.push(img);
      continue;
    }

    // One unreadable source file (a bad export, a truncated upload) used to
    // take the whole page down — compressedImage()/compressedGif() throws,
    // and that rejection propagated out of getHubAssets and through the
    // Promise.all in co-de-sus.astro that fetches every piece's assets
    // together, so a single bad file in one piece 500'd the entire hub
    // page, including pieces with nothing wrong. Skipping just that file
    // and warning is what actually matches "one file is broken," not "this
    // page is broken."
    let dims: { width: number; height: number };
    try {
      if (isCacheFresh(CACHE_DIR, inPath, outName)) {
        dims = await cachedImageDims(outPath, isGif);
      } else {
        dims = isGif
          ? await compressedGif(inPath, outPath, GALLERY_MAX)
          : await compressedImage(inPath, outPath, isBackground ? BACKGROUND_MAX : GALLERY_MAX);
        recordCacheFresh(CACHE_DIR, inPath, outName);
      }
    } catch (err) {
      console.warn(`[hub-assets] skipping unreadable file: ${inPath}`, err);
      continue;
    }
    const img: HubImage = { kind: 'image', src: `/images/proyectos/strip/hub/${outName}`, w: dims.width, h: dims.height };

    if (isBackground) background = img;
    else gallery.push(img);
  }

  // Manifest entries whose source file isn't present locally at all — the
  // normal case on a fresh CI checkout, where migrated videos (and the one
  // oversized gif) are gitignored. Already-handled files were matched
  // against r2Media inside the loop above and skip this by construction.
  const localFiles = new Set(files);
  for (const [file, entry] of r2Media) {
    if (localFiles.has(file)) continue;
    const base = file.replace(MEDIA_RE, '');
    const isBackground = /_background$/i.test(base);
    const item: HubGalleryItem = VIDEO_RE.test(file)
      ? { kind: 'video', src: entry.url }
      : { kind: 'image', src: entry.url, w: entry.width ?? 0, h: entry.height ?? 0 };
    if (isBackground && item.kind === 'image') background = item;
    else gallery.push(item);
  }

  return { background, gallery };
}
