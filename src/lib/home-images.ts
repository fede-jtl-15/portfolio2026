import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { isCacheFresh, recordCacheFresh } from './fingerprint';
import { r2AllHomeMedia, r2MediaForHomeFile } from './r2-media';
import { preparedVideo, probeVideo } from './video-prep';

/**
 * Homepage gallery column — every photo/gif/video dropped into
 * public/images/home shows up automatically, no code changes needed.
 * Compressed/prepared copies are cached in public/images/home/strip/ the
 * first time each source is seen, and regenerated whenever the source file
 * is replaced (same convention as getStripImages/getHubAssets — see
 * src/lib/fingerprint.ts).
 *
 * Videos are the exception — too large for git (GitHub hard-blocks any
 * single file over 100MB), so they're hosted on Cloudflare R2 and served
 * from src/data/r2-media.json instead (see src/lib/r2-media.ts), whether or
 * not the local source file is even present. See the equivalent note in
 * hub-assets.ts for the full reasoning.
 */

const HOME_DIR = path.join(process.cwd(), 'public/images/home');
const CACHE_DIR = path.join(HOME_DIR, 'strip');
const GIF_RE = /\.gif$/i;
const VIDEO_RE = /\.(mp4|m4v|mov|webm)$/i;
const MEDIA_RE = /\.(jpe?g|png|gif|mp4|m4v|mov|webm)$/i;
const MAX_DIMENSION = 1400;

export interface HomeImage {
  kind: 'image';
  src: string;
  w: number;
  h: number;
}

export interface HomeVideo {
  kind: 'video';
  src: string;
  w: number;
  h: number;
}

export type HomeMedia = HomeImage | HomeVideo;

export async function getHomeImages(): Promise<HomeMedia[]> {
  // Not an early-out for "nothing to do" — git doesn't track empty
  // directories, so if every file ever committed here is a gitignored
  // video, this directory won't exist at all on a fresh checkout. The R2
  // sweep below still needs to run in that case, so this only skips the
  // local-file scan, not the whole function.
  const homeDirExists = existsSync(HOME_DIR);
  if (homeDirExists) mkdirSync(CACHE_DIR, { recursive: true });

  const files = homeDirExists ? readdirSync(HOME_DIR).filter((f) => MEDIA_RE.test(f)) : [];
  const items: HomeMedia[] = [];

  for (const file of files) {
    const inPath = path.join(HOME_DIR, file);
    const base = file.replace(MEDIA_RE, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // One unreadable/corrupt source file shouldn't take the whole homepage
    // down — skip it and warn, same fix getHubAssets needed for the same
    // reason.
    try {
      if (VIDEO_RE.test(file)) {
        const r2Entry = r2MediaForHomeFile(file);
        if (r2Entry) {
          items.push({ kind: 'video', src: r2Entry.url, w: r2Entry.width ?? 1280, h: r2Entry.height ?? 1280 });
          continue;
        }
        const outName = `${base}.mp4`;
        const outPath = path.join(CACHE_DIR, outName);
        let dims: { width: number | null; height: number | null };
        if (isCacheFresh(CACHE_DIR, inPath, outName)) {
          dims = await probeVideo(outPath);
        } else {
          dims = await preparedVideo(inPath, outPath);
          recordCacheFresh(CACHE_DIR, inPath, outName);
        }
        items.push({ kind: 'video', src: `/images/home/strip/${outName}`, w: dims.width ?? 1280, h: dims.height ?? 1280 });
        continue;
      }

      const isGif = GIF_RE.test(file);
      const outName = `${base}.${isGif ? 'gif' : 'jpg'}`;
      const outPath = path.join(CACHE_DIR, outName);

      let dims: { width: number; height: number };
      if (isCacheFresh(CACHE_DIR, inPath, outName)) {
        const meta = await sharp(outPath, { animated: isGif }).metadata();
        const pages = isGif ? (meta.pages ?? 1) : 1;
        dims = { width: meta.width ?? 800, height: (meta.height ?? 800) / pages };
      } else if (isGif) {
        const info = await sharp(inPath, { animated: true, limitInputPixels: false })
          .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
          .gif()
          .toFile(outPath);
        const pages = info.pages ?? 1;
        dims = { width: info.width, height: info.height / pages };
        recordCacheFresh(CACHE_DIR, inPath, outName);
      } else {
        const info = await sharp(inPath)
          .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toFile(outPath);
        dims = { width: info.width, height: info.height };
        recordCacheFresh(CACHE_DIR, inPath, outName);
      }
      items.push({ kind: 'image', src: `/images/home/strip/${outName}`, w: dims.width, h: dims.height });
    } catch (err) {
      console.warn(`[home-images] skipping unreadable file: ${inPath}`, err);
    }
  }

  // Manifest videos whose source file isn't present locally at all — the
  // normal case on a fresh CI checkout, since migrated videos are
  // gitignored. Already-handled files were matched inside the loop above.
  const localFiles = new Set(files);
  for (const { file, entry } of r2AllHomeMedia()) {
    if (localFiles.has(file)) continue;
    items.push({ kind: 'video', src: entry.url, w: entry.width ?? 1280, h: entry.height ?? 1280 });
  }

  return items;
}
