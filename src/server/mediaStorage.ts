import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface MediaStorageBackend {
  putObject(params: {
    key: string;
    data: Uint8Array;
    contentType: string;
  }): Promise<{ key: string; sizeBytes: number; sha256: string }>;
  getObject(params: { key: string }): Promise<{
    data: Uint8Array;
    contentType: string;
    sizeBytes: number;
  } | null>;
  deleteObject(params: { key: string }): Promise<void>;
  getObjectUrl(params: { key: string }): string;
}

const MEDIA_KEY_RE = /^edison_(img|vid)_[a-f0-9]{20}\.(png|jpg|webp|mp4|webm)$/i;

function assertMediaKey(key: string): void {
  if (!MEDIA_KEY_RE.test(key)) {
    throw new Error('MEDIA_STORAGE_KEY_REJECTED: Unsafe media storage key.');
  }
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export class LocalFileSystemMediaStorage implements MediaStorageBackend {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  async putObject(params: {
    key: string;
    data: Uint8Array;
    contentType: string;
  }): Promise<{ key: string; sizeBytes: number; sha256: string }> {
    assertMediaKey(params.key);
    const fullPath = path.resolve(this.rootDir, params.key);
    const rel = path.relative(this.rootDir, fullPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('MEDIA_STORAGE_PATH_CONFINEMENT_FAILED: Key escaped storage root.');
    }
    fs.mkdirSync(this.rootDir, { recursive: true });
    fs.writeFileSync(fullPath, Buffer.from(params.data), { mode: 0o600 });
    const sha256 = crypto.createHash('sha256').update(params.data).digest('hex');
    return { key: params.key, sizeBytes: params.data.byteLength, sha256 };
  }

  async getObject(params: { key: string }): Promise<{
    data: Uint8Array;
    contentType: string;
    sizeBytes: number;
  } | null> {
    assertMediaKey(params.key);
    const fullPath = path.resolve(this.rootDir, params.key);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return null;
    }
    const data = new Uint8Array(fs.readFileSync(fullPath));
    const ext = path.extname(params.key).toLowerCase();
    return {
      data,
      contentType: CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream',
      sizeBytes: data.byteLength,
    };
  }

  async deleteObject(params: { key: string }): Promise<void> {
    assertMediaKey(params.key);
    const fullPath = path.resolve(this.rootDir, params.key);
    try {
      fs.rmSync(fullPath, { force: true });
    } catch {
      // Deletion of missing object is idempotent.
    }
  }

  getObjectUrl(params: { key: string }): string {
    assertMediaKey(params.key);
    return `/uploads/${params.key}`;
  }
}

export const localMediaStorage = new LocalFileSystemMediaStorage(
  path.resolve(process.cwd(), 'data', 'uploads')
);