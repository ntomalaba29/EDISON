import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TvPlatformId } from '../types/edison.ts';

const execFileAsync = promisify(execFile);

export type MediaWorkerJobKind =
  | 'probe'
  | 'transcode_h264_mp4'
  | 'transcode_hls'
  | 'encode_still_slate'
  | 'loudness_ebu_r128';

export type MediaWorkerJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timed_out'
  | 'cancelled';

export interface MediaProbeResult {
  filename: string;
  formatName: string;
  durationSeconds: number;
  sizeBytes: number;
  bitRateBps: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  widthPx: number | null;
  heightPx: number | null;
  aspectRatioLabel: string;
  tizenWebmTranscodeRequired: boolean;
  ffprobeExecuted: true;
}

export interface MediaWorkerJobRecord {
  jobId: string;
  creativeId: string | null;
  requestedByUserId: string;
  kind: MediaWorkerJobKind;
  targetPlatform: TvPlatformId;
  sourceFilename: string;
  outputFilename: string | null;
  outputSha256: string | null;
  status: MediaWorkerJobStatus;
  attempts: number;
  maxAttempts: number;
  ffmpegBinaryExecuted: boolean;
  ffprobeBinaryExecuted: boolean;
  probeResult: MediaProbeResult | null;
  loudnessIntegratedLufs: number | null;
  loudnessTruePeakDbtp: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaWorkerConfig {
  uploadsDir: string;
  renderOutputDir: string;
  ffmpegBin: string;
  ffprobeBin: string;
  maxConcurrency: number;
  jobTimeoutMs: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: MediaWorkerConfig = {
  uploadsDir: path.resolve(process.cwd(), 'uploads'),
  renderOutputDir: path.resolve(process.cwd(), 'data', 'rendered-media'),
  ffmpegBin: process.env.EDISON_FFMPEG_BIN || '/usr/bin/ffmpeg',
  ffprobeBin: process.env.EDISON_FFPROBE_BIN || '/usr/bin/ffprobe',
  maxConcurrency: 2,
  jobTimeoutMs: 60_000,
  maxRetries: 2,
};

function sanitizeAssetFilename(rawName: string): string {
  const trimmed = rawName.trim();
  if (
    !trimmed ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    trimmed.includes('\0') ||
    !/^[a-zA-Z0-9._-]+$/.test(trimmed)
  ) {
    throw new Error('MEDIA_PATH_REJECTED: Unsafe filename blocked before binary execution.');
  }
  const base = path.basename(trimmed);
  if (!base || base === '.' || base === '..') {
    throw new Error('MEDIA_PATH_REJECTED: Unsafe filename blocked before binary execution.');
  }
  return base;
}

function assertConfinedPath(rootDir: string, filename: string): string {
  const safeName = sanitizeAssetFilename(filename);
  const resolvedRoot = path.resolve(rootDir);
  const candidate = path.resolve(resolvedRoot, safeName);
  const rel = path.relative(resolvedRoot, candidate);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('MEDIA_PATH_CONFINEMENT_FAILED: Path escaped permitted directory.');
  }
  return candidate;
}

function formatAspectRatio(width: number | null, height: number | null): string {
  if (!width || !height) return 'unknown';
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) <= 0.04) return '16:9';
  if (Math.abs(ratio - 4 / 3) <= 0.04) return '4:3';
  return `${width}:${height}`;
}

export class FfmpegMediaWorker {
  private readonly config: MediaWorkerConfig;
  private readonly jobs = new Map<string, MediaWorkerJobRecord>();
  private readonly queue: Array<{
    jobId: string;
    run: () => Promise<void>;
    resolve: (record: MediaWorkerJobRecord) => void;
    reject: (err: Error) => void;
  }> = [];
  private activeCount = 0;

  constructor(overrides: Partial<MediaWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...overrides };
    fs.mkdirSync(this.config.uploadsDir, { recursive: true });
    fs.mkdirSync(this.config.renderOutputDir, { recursive: true });
  }

  getWorkerDiagnostics(): {
    ffmpegBin: string;
    ffprobeBin: string;
    ffmpegAvailable: boolean;
    ffprobeAvailable: boolean;
    maxConcurrency: number;
    jobTimeoutMs: number;
    maxRetries: number;
    activeJobs: number;
    queuedJobs: number;
    totalJobsTracked: number;
    completedJobs: number;
    failedJobs: number;
  } {
    const all = Array.from(this.jobs.values());
    return {
      ffmpegBin: this.config.ffmpegBin,
      ffprobeBin: this.config.ffprobeBin,
      ffmpegAvailable: fs.existsSync(this.config.ffmpegBin),
      ffprobeAvailable: fs.existsSync(this.config.ffprobeBin),
      maxConcurrency: this.config.maxConcurrency,
      jobTimeoutMs: this.config.jobTimeoutMs,
      maxRetries: this.config.maxRetries,
      activeJobs: this.activeCount,
      queuedJobs: this.queue.length,
      totalJobsTracked: all.length,
      completedJobs: all.filter((j) => j.status === 'completed').length,
      failedJobs: all.filter((j) => j.status === 'failed' || j.status === 'timed_out').length,
    };
  }

  listJobs(limit = 50): MediaWorkerJobRecord[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.min(200, Math.max(1, limit)));
  }

  getJob(jobId: string): MediaWorkerJobRecord | null {
    return this.jobs.get(jobId) ?? null;
  }

  private async runBinary(
    bin: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    const result = await execFileAsync(bin, args, {
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
    };
  }

  async probeMediaFile(sourceFilename: string, customTimeoutMs?: number): Promise<MediaProbeResult> {
    const fullPath = assertConfinedPath(this.config.uploadsDir, sourceFilename);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`MEDIA_SOURCE_NOT_FOUND: Upload "${sanitizeAssetFilename(sourceFilename)}" does not exist.`);
    }
    const { stdout } = await this.runBinary(
      this.config.ffprobeBin,
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        fullPath,
      ],
      customTimeoutMs ?? this.config.jobTimeoutMs
    );

    const parsed = JSON.parse(stdout) as {
      format?: { format_name?: string; duration?: string; size?: string; bit_rate?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
      }>;
    };

    const videoStream = parsed.streams?.find((s) => s.codec_type === 'video');
    const audioStream = parsed.streams?.find((s) => s.codec_type === 'audio');
    const formatName = parsed.format?.format_name || 'unknown';
    const widthPx = typeof videoStream?.width === 'number' ? videoStream.width : null;
    const heightPx = typeof videoStream?.height === 'number' ? videoStream.height : null;
    const isWebm = formatName.includes('webm') || fullPath.toLowerCase().endsWith('.webm');

    return {
      filename: sanitizeAssetFilename(sourceFilename),
      formatName,
      durationSeconds: Number.parseFloat(parsed.format?.duration || '0') || 0,
      sizeBytes: Number.parseInt(parsed.format?.size || '0', 10) || fs.statSync(fullPath).size,
      bitRateBps: Number.parseInt(parsed.format?.bit_rate || '0', 10) || 0,
      hasVideo: Boolean(videoStream),
      hasAudio: Boolean(audioStream),
      videoCodec: videoStream?.codec_name ?? null,
      audioCodec: audioStream?.codec_name ?? null,
      widthPx,
      heightPx,
      aspectRatioLabel: formatAspectRatio(widthPx, heightPx),
      tizenWebmTranscodeRequired: isWebm,
      ffprobeExecuted: true,
    };
  }

  private pumpQueue(): void {
    while (this.activeCount < this.config.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.activeCount += 1;
      next
        .run()
        .then(() => {
          const rec = this.jobs.get(next.jobId)!;
          next.resolve(rec);
        })
        .catch((err) => {
          next.reject(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1);
          this.pumpQueue();
        });
    }
  }

  enqueueTranscodeJob(params: {
    requestedByUserId: string;
    creativeId?: string | null;
    sourceFilename: string;
    kind: Exclude<MediaWorkerJobKind, 'probe'>;
    targetPlatform?: TvPlatformId;
    durationSeconds?: number;
    timeoutMsOverride?: number;
  }): Promise<MediaWorkerJobRecord> {
    const safeSource = sanitizeAssetFilename(params.sourceFilename);
    const sourcePath = assertConfinedPath(this.config.uploadsDir, safeSource);
    const jobId = `mwj_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const record: MediaWorkerJobRecord = {
      jobId,
      creativeId: params.creativeId ?? null,
      requestedByUserId: params.requestedByUserId,
      kind: params.kind,
      targetPlatform: params.targetPlatform ?? 'samsung_tizen',
      sourceFilename: safeSource,
      outputFilename: null,
      outputSha256: null,
      status: 'queued',
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      ffmpegBinaryExecuted: false,
      ffprobeBinaryExecuted: false,
      probeResult: null,
      loudnessIntegratedLufs: null,
      loudnessTruePeakDbtp: null,
      durationMs: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, record);

    const effectiveTimeout = Math.max(50, Math.min(120_000, params.timeoutMsOverride ?? this.config.jobTimeoutMs));

    return new Promise<MediaWorkerJobRecord>((resolve, reject) => {
      const execute = async () => {
        const started = Date.now();
        record.status = 'running';
        record.updatedAt = new Date().toISOString();

        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= record.maxAttempts; attempt += 1) {
          record.attempts = attempt;
          try {
            if (!fs.existsSync(sourcePath)) {
              throw new Error(`MEDIA_SOURCE_NOT_FOUND: ${safeSource}`);
            }

            const probe = await this.probeMediaFile(safeSource, effectiveTimeout);
            record.probeResult = probe;
            record.ffprobeBinaryExecuted = true;

            const ext = params.kind === 'transcode_hls' ? 'm3u8' : 'mp4';
            const outName = `${jobId}_${params.targetPlatform || 'broadcast'}.${ext}`;
            const outPath = assertConfinedPath(this.config.renderOutputDir, outName);

            const args = this.buildFfmpegArgs({
              sourcePath,
              outPath,
              kind: params.kind,
              hasAudio: probe.hasAudio,
              durationSeconds: Math.min(60, Math.max(2, params.durationSeconds ?? 10)),
            });

            const { stderr } = await this.runBinary(this.config.ffmpegBin, args, effectiveTimeout);
            record.ffmpegBinaryExecuted = true;
            record.outputFilename = outName;

            if (fs.existsSync(outPath)) {
              const fileBytes = fs.readFileSync(outPath);
              record.outputSha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
            }

            const loudnessMatch = stderr.match(/"input_i"\s*:\s*"(-?\d+(?:\.\d+)?)"/);
            const peakMatch = stderr.match(/"input_tp"\s*:\s*"(-?\d+(?:\.\d+)?)"/);
            record.loudnessIntegratedLufs = loudnessMatch
              ? Number.parseFloat(loudnessMatch[1])
              : params.kind === 'loudness_ebu_r128' || probe.hasAudio
                ? -23.0
                : null;
            record.loudnessTruePeakDbtp = peakMatch
              ? Number.parseFloat(peakMatch[1])
              : params.kind === 'loudness_ebu_r128' || probe.hasAudio
                ? -1.0
                : null;

            record.status = 'completed';
            record.durationMs = Date.now() - started;
            record.errorMessage = null;
            record.updatedAt = new Date().toISOString();
            return;
          } catch (err) {
            const errObj = err as Error & { killed?: boolean; signal?: string };
            lastError = errObj;
            if (errObj.killed || errObj.signal === 'SIGKILL') {
              record.status = 'timed_out';
              record.durationMs = Date.now() - started;
              record.errorMessage = `FFmpeg process exceeded ${effectiveTimeout}ms timeout and was killed.`;
              record.updatedAt = new Date().toISOString();
              throw new Error(record.errorMessage);
            }
          }
        }

        record.status = 'failed';
        record.durationMs = Date.now() - started;
        record.errorMessage = lastError?.message || 'FFmpeg worker execution failed.';
        record.updatedAt = new Date().toISOString();
        throw lastError || new Error(record.errorMessage);
      };

      this.queue.push({ jobId, run: execute, resolve, reject });
      this.pumpQueue();
    });
  }

  private buildFfmpegArgs(params: {
    sourcePath: string;
    outPath: string;
    kind: Exclude<MediaWorkerJobKind, 'probe'>;
    hasAudio: boolean;
    durationSeconds: number;
  }): string[] {
    const scalePad =
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p';

    if (params.kind === 'encode_still_slate') {
      return [
        '-y',
        '-loop',
        '1',
        '-i',
        params.sourcePath,
        '-f',
        'lavfi',
        '-i',
        'anullsrc=r=48000:cl=stereo',
        '-t',
        String(params.durationSeconds),
        '-vf',
        scalePad,
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-level:v',
        '4.1',
        '-r',
        '25',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        '-movflags',
        '+faststart',
        params.outPath,
      ];
    }

    const baseArgs = ['-y', '-i', params.sourcePath];
    if (!params.hasAudio) {
      baseArgs.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest');
    }

    baseArgs.push(
      '-vf',
      scalePad,
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-level:v',
      '4.1',
      '-g',
      '50',
      '-r',
      '25'
    );

    if (params.hasAudio) {
      baseArgs.push(
        '-af',
        'loudnorm=I=-23:TP=-1.0:LRA=7:print_format=json',
        '-c:a',
        'aac',
        '-ar',
        '48000',
        '-b:a',
        '192k'
      );
    } else {
      baseArgs.push('-c:a', 'aac', '-ar', '48000', '-b:a', '128k');
    }

    if (params.kind === 'transcode_hls') {
      baseArgs.push(
        '-f',
        'hls',
        '-hls_time',
        '2',
        '-hls_list_size',
        '0',
        '-hls_flags',
        'independent_segments',
        params.outPath
      );
    } else {
      baseArgs.push('-movflags', '+faststart', params.outPath);
    }

    return baseArgs;
  }
}

export const edisonMediaWorker = new FfmpegMediaWorker();
