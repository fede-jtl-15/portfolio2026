import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const execFileAsync = promisify(execFile);
const EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024 };
const COMPATIBLE_CODEC = 'h264';
const COMPATIBLE_PIX_FMT_RE = /^yuvj?420p$/;

async function probeVideo(inPath) {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height', '-of', 'json', inPath],
    EXEC_OPTS,
  );
  const parsed = JSON.parse(stdout);
  const stream = parsed.streams?.[0];
  return {
    codec: stream?.codec_name ?? null,
    pixFmt: stream?.pix_fmt ?? null,
    width: stream?.width ?? null,
    height: stream?.height ?? null,
  };
}

function isCompatibleVideo(info) {
  return info.codec === COMPATIBLE_CODEC && COMPATIBLE_PIX_FMT_RE.test(info.pixFmt ?? '');
}

async function preparedVideo(inPath, outPath) {
  const info = await probeVideo(inPath);
  if (isCompatibleVideo(info)) {
    await execFileAsync(ffmpegPath, ['-y', '-i', inPath, '-c', 'copy', '-movflags', '+faststart', outPath], EXEC_OPTS);
    return info;
  }
  console.log(`  re-encoding incompatible video (codec=${info.codec}, pix_fmt=${info.pixFmt})`);
  await execFileAsync(
    ffmpegPath,
    ['-y', '-i', inPath, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', outPath],
    EXEC_OPTS,
  );
  return info;
}

const ROOT = process.cwd();
const PROYECTOS_DIR = path.join(ROOT, 'assets');
const HOME_DIR = path.join(ROOT, 'public/images/home');
const VIDEO_RE = /\.(mp4|m4v|mov|webm)$/i;
const STAGING_DIR = path.join(ROOT, '.r2-staging');
const MANIFEST_PATH = path.join(ROOT, 'src/data/r2-media.json');

const creds = readFileSync(path.join(ROOT, 'r2-credentials.txt'), 'utf-8');
const accessKeyId = creds.match(/R2_Access Key ID:\s*(\S+)/)?.[1];
const secretAccessKey = creds.match(/R2_Secret Access Key:\s*(\S+)/)?.[1];
const bucket = creds.match(/R2_BUCKET_NAME:\s*(\S+)/)?.[1];
const publicUrl = creds.match(/R2_PUBLIC_URL:\s*(\S+)/)?.[1];
const accountId = '7871703690d16a064160ce4ff631338a';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

mkdirSync(STAGING_DIR, { recursive: true });

function walkVideos(dir, baseDir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'strip') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkVideos(full, baseDir, out);
    } else if (VIDEO_RE.test(entry.name)) {
      out.push(path.relative(baseDir, full));
    }
  }
  return out;
}

// Must match GIF_COMPRESS_MAX_BYTES in src/lib/hub-assets.ts exactly — that
// threshold is what actually decides whether hub-assets.ts skips local
// recompression and requires an R2 entry to serve the gif at all, not
// Cloudflare's separate (larger) 25MB deploy-output cap. A gif this size is
// effectively a video wearing a gif extension anyway.
const GIF_COMPRESS_MAX_BYTES = 8 * 1024 * 1024;

function walkBigGifs(dir, baseDir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'strip') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkBigGifs(full, baseDir, out);
    } else if (/\.gif$/i.test(entry.name) && statSync(full).size > GIF_COMPRESS_MAX_BYTES) {
      out.push(path.relative(baseDir, full));
    }
  }
  return out;
}

const proyectosVideos = walkVideos(PROYECTOS_DIR, PROYECTOS_DIR, []).map((p) => ({
  key: `proyectos/${p.replace(/\\/g, '/')}`,
  abs: path.join(PROYECTOS_DIR, p),
}));
const homeVideos = walkVideos(HOME_DIR, HOME_DIR, []).map((p) => ({
  key: `home/${p.replace(/\\/g, '/')}`,
  abs: path.join(HOME_DIR, p),
}));
const bigGifs = walkBigGifs(PROYECTOS_DIR, PROYECTOS_DIR, []).map((p) => ({
  key: `proyectos/${p.replace(/\\/g, '/')}`,
  abs: path.join(PROYECTOS_DIR, p),
}));

const all = [...proyectosVideos, ...homeVideos, ...bigGifs];
console.log(`Found ${all.length} files to migrate (${proyectosVideos.length} proyectos videos, ${homeVideos.length} home videos, ${bigGifs.length} oversized gifs)`);

mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) : {};

let done = 0;
for (const item of all) {
  done++;
  const sizeMB = (statSync(item.abs).size / 1024 / 1024).toFixed(1);
  console.log(`[${done}/${all.length}] ${item.key} (${sizeMB}MB)`);

  if (manifest[item.key]) {
    console.log('  already in manifest, skipping');
    continue;
  }

  let uploadPath = item.abs;
  let width = null;
  let height = null;

  if (VIDEO_RE.test(item.abs)) {
    const stagedName = item.key.replace(/[\\/]/g, '__') + '.mp4';
    const stagedPath = path.join(STAGING_DIR, stagedName);
    const info = await probeVideo(item.abs);
    width = info.width;
    height = info.height;
    if (!existsSync(stagedPath)) {
      console.log('  preparing (remux/transcode)...');
      await preparedVideo(item.abs, stagedPath);
    } else {
      console.log('  already staged, skipping ffmpeg step');
    }
    uploadPath = stagedPath;
  }

  const body = readFileSync(uploadPath);
  const ext = path.extname(item.key).toLowerCase();
  const contentType = ext === '.gif' ? 'image/gif' : 'video/mp4';

  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: item.key, Body: body, ContentType: contentType }));

  manifest[item.key] = { url: `${publicUrl}/${item.key}`, width, height, sizeBytes: body.length };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`  uploaded -> ${manifest[item.key].url}`);
}

console.log('Done.');
