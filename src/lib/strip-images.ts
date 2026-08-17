import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getCollection, type CollectionEntry } from 'astro:content';
import { sectionById, type SectionId } from './site';
import { isCacheFresh, recordCacheFresh } from './fingerprint';

/**
 * Home page filmstrip, sourced directly from assets/ — drop a new image
 * into one of the four category folders and it shows up on the next
 * dev-server request or build, no code changes needed.
 *
 * Each source image is compressed into public/images/proyectos/cache/ the
 * first time it's seen, and re-compressed if the source is ever replaced
 * (same filename, new content — see src/lib/fingerprint.ts) — since the
 * originals can be many MB and are shown here as small stills. Sourced from
 * assets/ rather than public/images/ so the (much larger) originals never
 * end up in the deploy output — see the longer note in hub-assets.ts.
 *
 * Title/link: if the filename matches a src/content/work/*.md entry (exactly,
 * loosely, or as a "<id>-something" series like the reflected-radio photos),
 * that entry's title and page are used. Otherwise the filename is humanized
 * and it links to the image's section page instead.
 */

const CATEGORY_SECTION: Record<string, SectionId> = {
  audiovisual: 'av',
  installation: 'interactive',
  live: 'performance',
  sound: 'sound',
};

const SOURCE_DIR = path.join(process.cwd(), 'assets');
const STRIP_DIR = path.join(process.cwd(), 'public/images/proyectos/cache');
const IMAGE_RE = /\.(jpe?g|png)$/i;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Exact id match wins outright. Otherwise, among entries whose id is a
// prefix of the filename (the "reflected-radio-butz belongs to
// reflected-radio" case), the longest/most specific id wins — so
// techno_para_dos_warp.jpg matches "techno-para-dos-warp", not the shorter
// "techno-para-dos".
function findWorkMatch(work: CollectionEntry<'work'>[], base: string) {
  const slug = slugify(base);
  const bare = slug.replace(/-/g, '');

  const exact = work.find((w) => w.id === slug || w.id.replace(/-/g, '') === bare);
  if (exact) return exact;

  const prefixed = work.filter((w) => slug.startsWith(`${w.id}-`) || bare.startsWith(w.id.replace(/-/g, '')));
  if (prefixed.length === 0) return undefined;

  return prefixed.reduce((best, cur) => (cur.id.length > best.id.length ? cur : best));
}

function humanize(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface StripImage {
  src: string;
  title: string;
  href: string;
  w: number;
  h: number;
}

export async function getStripImages(): Promise<StripImage[]> {
  if (!existsSync(SOURCE_DIR)) return [];
  mkdirSync(STRIP_DIR, { recursive: true });

  const work = await getCollection('work', ({ data }) => !data.draft);

  const results: StripImage[] = [];

  for (const [category, sectionId] of Object.entries(CATEGORY_SECTION)) {
    const dir = path.join(SOURCE_DIR, category);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter((f) => IMAGE_RE.test(f));

    for (const file of files) {
      const base = file.replace(IMAGE_RE, '');
      const safeBase = base
        .toLowerCase()
        .replace(/[\s_]+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
      const outName = `${category}-${safeBase}.jpg`;
      const outPath = path.join(STRIP_DIR, outName);
      const inPath = path.join(dir, file);

      let dims: { width: number; height: number };
      if (isCacheFresh(STRIP_DIR, inPath, outName)) {
        const meta = await sharp(outPath).metadata();
        dims = { width: meta.width ?? 800, height: meta.height ?? 800 };
      } else {
        const info = await sharp(inPath)
          .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(outPath);
        dims = { width: info.width, height: info.height };
        recordCacheFresh(STRIP_DIR, inPath, outName);
      }

      const match = findWorkMatch(work, base);

      results.push({
        src: `/images/proyectos/cache/${outName}`,
        title: match ? String(match.data.title) : humanize(base),
        href: match ? `/work/${match.id}` : `/${sectionById(sectionId).id}`,
        w: dims.width,
        h: dims.height,
      });
    }
  }

  return results;
}
