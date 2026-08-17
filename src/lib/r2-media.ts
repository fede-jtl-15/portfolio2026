import manifestData from '../data/r2-media.json';

/**
 * Videos are too large for a plain git repo — GitHub hard-blocks any single
 * blob over 100MB, and this project's source footage runs well past that
 * (several 200MB+ reels). They're hosted on Cloudflare R2 instead (free
 * tier, and critically no egress fees, unlike S3) and referenced through
 * this manifest rather than scanned from assets/** at build time — see
 * scripts/migrate-videos-to-r2.mjs, which is what
 * generates src/data/r2-media.json. Run that script again after adding a
 * new video to a project; until then it just won't appear on a fresh
 * (CI) checkout, though it'll still show locally via the normal
 * local-file pipeline since the source file is still on disk, just
 * gitignored.
 */

export interface R2MediaEntry {
  url: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
}

const manifest: Record<string, R2MediaEntry> = manifestData;

function encodedUrl(rawUrl: string): string {
  return encodeURI(rawUrl);
}

/** Manifest entries filed directly under proyectos/<relDir>/ — one level deep, matching the non-recursive local folder scan hub-assets.ts otherwise does. */
export function r2VideosForProyectosDir(relDir: string): { file: string; entry: R2MediaEntry }[] {
  const prefix = `proyectos/${relDir}/`;
  return Object.entries(manifest)
    .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
    .map(([key, entry]) => ({ file: key.slice(prefix.length), entry: { ...entry, url: encodedUrl(entry.url) } }));
}

export function r2MediaForHomeFile(filename: string): R2MediaEntry | undefined {
  const entry = manifest[`home/${filename}`];
  return entry ? { ...entry, url: encodedUrl(entry.url) } : undefined;
}

export function r2AllHomeMedia(): { file: string; entry: R2MediaEntry }[] {
  const prefix = 'home/';
  return Object.entries(manifest)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, entry]) => ({ file: key.slice(prefix.length), entry: { ...entry, url: encodedUrl(entry.url) } }));
}
