import crypto from 'node:crypto';

const MEDIA_KEY_RE = /^edison_(img|vid)_[a-f0-9]{20}\.(png|jpg|webp|mp4|webm)$/i;

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(
    key: string
  ): Promise<
    | {
        body: {
          getReader: () => {
            read: () => Promise<{ done: boolean; value?: Uint8Array }>;
            releaseLock?: () => void;
          };
        };
        httpMetadata?: { contentType?: string };
      }
    | null
  >;
  delete(key: string): Promise<void>;
}

function assertMediaKey(key: string): void {
  if (!MEDIA_KEY_RE.test(key)) {
    throw new Error('MEDIA_STORAGE_KEY_REJECTED: Unsafe media storage key.');
  }
}

function contentTypeForKey(key: string): string {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';
}

async function readableStreamToUint8Array(
  body: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
      releaseLock?: () => void;
    };
  }
): Promise<Uint8Array> {
  const chunks: Array<Uint8Array> = [];
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  if (chunks.length === 0) return new Uint8Array(0);
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export class R2MediaStorage {
  private readonly bucket: R2BucketLike;
  private readonly baseUrl: string;

  constructor(bucket: R2BucketLike, baseUrl: string) {
    this.bucket = bucket;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async putObject(params: {
    key: string;
    data: Uint8Array;
    contentType: string;
  }): Promise<{ key: string; sizeBytes: number; sha256: string }> {
    assertMediaKey(params.key);
    if (params.contentType !== contentTypeForKey(params.key)) {
      throw new Error('MEDIA_STORAGE_CONTENT_TYPE_REJECTED: Content type does not match media key.');
    }
    const sha256 = crypto.createHash('sha256').update(params.data).digest('hex');
    await this.bucket.put(params.key, params.data, {
      httpMetadata: { contentType: params.contentType },
    });
    return { key: params.key, sizeBytes: params.data.byteLength, sha256 };
  }

  async getObject(params: { key: string }): Promise<{
    data: Uint8Array;
    contentType: string;
    sizeBytes: number;
  } | null> {
    assertMediaKey(params.key);
    const object = await this.bucket.get(params.key);
    if (!object || !object.body) {
      return null;
    }
    const data = await readableStreamToUint8Array(object.body);
    return {
      data,
      contentType: object.httpMetadata?.contentType ?? contentTypeForKey(params.key),
      sizeBytes: data.byteLength,
    };
  }

  async deleteObject(params: { key: string }): Promise<void> {
    assertMediaKey(params.key);
    await this.bucket.delete(params.key);
  }

  getObjectUrl(params: { key: string }): string {
    assertMediaKey(params.key);
    return `${this.baseUrl}/r2-media/${params.key}`;
  }
}