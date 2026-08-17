import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/**
 * Shared by every pipeline that serves an uploaded video (see hub-assets.ts,
 * home-images.ts): probes each source with ffprobe and either remuxes it (a
 * fast, lossless container rewrite — needed because mp4/mov store their
 * decode index, the "moov" atom, wherever the export tool put it, and a
 * browser that needs it up front just renders blank instead of playing) or,
 * for a codec/pixel format that isn't safely compatible everywhere, actually
 * re-encodes it to H.264 8-bit. Necessary in practice, not hypothetical: a
 * 10-bit AV1 clip in this project reproducibly hard-failed mid-playback in
 * Chrome (`dav1d_send_data() failed`, leaving a black/green frame on
 * screen), and a 10-bit HEVC clip is exactly the kind of file whose support
 * varies by browser and OS.
 */

const execFileAsync = promisify(execFile);
// ffmpeg's progress output streams to stderr continuously — the default 1MB
// exec buffer is easy to blow past on a multi-minute transcode of a large
// source file, which would otherwise kill the process partway through.
const EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024 };

const COMPATIBLE_CODEC = 'h264';
const COMPATIBLE_PIX_FMT_RE = /^yuvj?420p$/;

export interface VideoStreamInfo {
  codec: string | null;
  pixFmt: string | null;
  width: number | null;
  height: number | null;
}

export async function probeVideo(inPath: string): Promise<VideoStreamInfo> {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height', '-of', 'json', inPath],
    EXEC_OPTS,
  );
  const parsed = JSON.parse(stdout) as { streams?: { codec_name?: string; pix_fmt?: string; width?: number; height?: number }[] };
  const stream = parsed.streams?.[0];
  return {
    codec: stream?.codec_name ?? null,
    pixFmt: stream?.pix_fmt ?? null,
    width: stream?.width ?? null,
    height: stream?.height ?? null,
  };
}

function isCompatibleVideo(info: VideoStreamInfo): boolean {
  return info.codec === COMPATIBLE_CODEC && COMPATIBLE_PIX_FMT_RE.test(info.pixFmt ?? '');
}

// For an already-compatible codec, this just rewrites the container's index
// to the front of the file — `-c copy` means the actual video/audio streams
// are never re-encoded, so it's fast and lossless (confirmed: well under a
// second even on a ~7MB clip). For an incompatible codec (HEVC, AV1, 10-bit,
// ...), a remux can't help — the bytes themselves need decoding a browser
// can't do, so this re-encodes to H.264 8-bit instead. Slower (real
// CPU-bound encoding, not just a container rewrite), but it only ever runs
// once per source file (see src/lib/fingerprint.ts), and it's what actually
// makes the clip play. Returns the probed info either way, since callers
// generally need the source dimensions too.
export async function preparedVideo(inPath: string, outPath: string): Promise<VideoStreamInfo> {
  if (!ffmpegPath) throw new Error('ffmpeg-static did not resolve a binary path');
  const info = await probeVideo(inPath);
  if (isCompatibleVideo(info)) {
    await execFileAsync(ffmpegPath, ['-y', '-i', inPath, '-c', 'copy', '-movflags', '+faststart', outPath], EXEC_OPTS);
    return info;
  }
  console.warn(`[video-prep] re-encoding incompatible video (codec=${info.codec}, pix_fmt=${info.pixFmt}): ${inPath}`);
  await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-i',
      inPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      outPath,
    ],
    EXEC_OPTS,
  );
  return info;
}
