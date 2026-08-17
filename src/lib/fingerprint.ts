import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Tracks which exact version of a source file each cached/compressed output
 * was generated from, so replacing a source (same filename, new content)
 * always gets picked up on the next request — a plain
 * `outPath.mtime >= inPath.mtime` comparison isn't reliable enough on its
 * own: a tool that overwrites a file in place can leave the OS-reported
 * "modified" date pointing at whenever the original was first exported
 * rather than when it actually landed here (confirmed — happened to a real
 * source photo mid-project, and silently kept serving the old compressed
 * version). Size is folded in alongside mtime so a replacement is still
 * caught even when its own timestamp is unreliable; two different files
 * landing on both the same byte size and the same millisecond mtime isn't
 * worth guarding against.
 *
 * One small JSON manifest per cache directory (not a fingerprint baked into
 * each filename) keeps every existing `/strip/...` URL stable — nothing
 * downstream that matches on filename needs to change.
 */

function computeFingerprint(sourcePath: string): string {
  const stat = statSync(sourcePath);
  return `${stat.size}:${Math.trunc(stat.mtimeMs)}`;
}

function manifestPath(cacheDir: string): string {
  return path.join(cacheDir, '.fingerprints.json');
}

function readManifest(cacheDir: string): Record<string, string> {
  const file = manifestPath(cacheDir);
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

/** True when `outputFileName` exists in `cacheDir` AND was generated from exactly this version of `sourcePath`. */
export function isCacheFresh(cacheDir: string, sourcePath: string, outputFileName: string): boolean {
  if (!existsSync(path.join(cacheDir, outputFileName))) return false;
  return readManifest(cacheDir)[outputFileName] === computeFingerprint(sourcePath);
}

/** Call once a fresh copy of `outputFileName` has actually been written, to record what it was generated from. */
export function recordCacheFresh(cacheDir: string, sourcePath: string, outputFileName: string): void {
  const manifest = readManifest(cacheDir);
  manifest[outputFileName] = computeFingerprint(sourcePath);
  writeFileSync(manifestPath(cacheDir), JSON.stringify(manifest), 'utf-8');
}
