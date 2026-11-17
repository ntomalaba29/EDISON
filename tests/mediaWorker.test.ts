import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FfmpegMediaWorker } from '../src/server/mediaWorker.ts';

const execFileAsync = promisify(execFile);

function resolveFfmpegBinary(environmentVariable: string, linuxPath: string, windowsName: string): string {
  const configured = process.env[environmentVariable];
  if (configured) return configured;
  if (process.platform !== 'win32') return linuxPath;

  const candidate = (process.env.PATH ?? '')
    .split(path.delimiter)
    .map((directory) => path.join(directory, windowsName))
    .find((filePath) => fs.existsSync(filePath));
  return candidate ?? windowsName;
}

describe('TASK-P3-004 Dedicated FFmpeg & FFprobe Broadcast Media Worker', () => {
  it('executes real FFmpeg and FFprobe binaries to transcode WebM->H.264 MP4, normalize EBU R128 loudness, encode still slates, and enforce path confinement', async () => {
    const ffmpegBin = resolveFfmpegBinary('EDISON_FFMPEG_BIN', '/usr/bin/ffmpeg', 'ffmpeg.exe');
    const ffprobeBin = resolveFfmpegBinary('EDISON_FFPROBE_BIN', '/usr/bin/ffprobe', 'ffprobe.exe');
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-ffmpeg-'));
    const uploadsDir = path.join(tmpRoot, 'uploads');
    const renderDir = path.join(tmpRoot, 'rendered');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(renderDir, { recursive: true });

    try {
      // Generate real valid 2s WebM video with 1kHz sine audio & a 1920x1080 PNG slate via real FFmpeg
      const webmPath = path.join(uploadsDir, 'sample_ad.webm');
      await execFileAsync(ffmpegBin, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=navy:s=1280x720:d=2',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=2',
        '-c:v',
        'libvpx',
        '-c:a',
        'libvorbis',
        webmPath,
      ]);

      const pngPath = path.join(uploadsDir, 'sample_slate.png');
      await execFileAsync(ffmpegBin, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=darkgreen:s=1920x1080',
        '-frames:v',
        '1',
        pngPath,
      ]);

      const worker = new FfmpegMediaWorker({
        uploadsDir,
        renderOutputDir: renderDir,
        ffmpegBin,
        ffprobeBin,
        maxConcurrency: 2,
        jobTimeoutMs: 30_000,
        maxRetries: 2,
      });

      const diag = worker.getWorkerDiagnostics();
      expect(diag.ffmpegAvailable).toBe(true);
      expect(diag.ffprobeAvailable).toBe(true);

      // 1. Real ffprobe metadata check
      const probe = await worker.probeMediaFile('sample_ad.webm');
      expect(probe.ffprobeExecuted).toBe(true);
      expect(probe.hasVideo).toBe(true);
      expect(probe.hasAudio).toBe(true);
      expect(probe.widthPx).toBe(1280);
      expect(probe.heightPx).toBe(720);
      expect(probe.aspectRatioLabel).toBe('16:9');
      expect(probe.tizenWebmTranscodeRequired).toBe(true);

      // 2. Real Samsung Tizen WebM -> H.264 High@L4.1 MP4 transcode + EBU R128 loudness normalization
      const tizenJob = await worker.enqueueTranscodeJob({
        requestedByUserId: 'usr_adv_01',
        creativeId: 'crt_seed_01',
        sourceFilename: 'sample_ad.webm',
        kind: 'transcode_h264_mp4',
        targetPlatform: 'samsung_tizen',
      });
      expect(tizenJob.status).toBe('completed');
      expect(tizenJob.ffmpegBinaryExecuted).toBe(true);
      expect(tizenJob.ffprobeBinaryExecuted).toBe(true);
      expect(tizenJob.outputFilename).toMatch(/samsung_tizen\.mp4$/);
      expect(tizenJob.outputSha256).toHaveLength(64);
      expect(fs.existsSync(path.join(renderDir, tizenJob.outputFilename!))).toBe(true);
      expect(typeof tizenJob.loudnessIntegratedLufs).toBe('number');

      // 3. Real Still PNG -> H.264 MP4 Slate encoding
      const slateJob = await worker.enqueueTranscodeJob({
        requestedByUserId: 'usr_adv_01',
        sourceFilename: 'sample_slate.png',
        kind: 'encode_still_slate',
        targetPlatform: 'android_tv_tif',
        durationSeconds: 3,
      });
      expect(slateJob.status).toBe('completed');
      expect(slateJob.ffmpegBinaryExecuted).toBe(true);
      expect(slateJob.outputSha256).toHaveLength(64);

      // 4. Path traversal / injection fails closed BEFORE invoking binary
      await expect(worker.probeMediaFile('../etc/passwd')).rejects.toThrow(/MEDIA_PATH_REJECTED/);
      await expect(worker.probeMediaFile('foo;rm -rf /.mp4')).rejects.toThrow(/MEDIA_PATH_REJECTED/);

      // 5. Missing file fails cleanly with recorded failure status after retries
      await expect(
        worker.enqueueTranscodeJob({
          requestedByUserId: 'usr_adv_01',
          sourceFilename: 'does_not_exist.mp4',
          kind: 'transcode_h264_mp4',
        })
      ).rejects.toThrow(/MEDIA_SOURCE_NOT_FOUND/);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }, 45_000);
});
