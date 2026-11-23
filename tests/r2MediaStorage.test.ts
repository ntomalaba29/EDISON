import { describe, expect, it, vi } from 'vitest';
import { R2MediaStorage, type R2BucketLike } from '../src/server/cloudflare/r2MediaStorage.ts';

function makeMockBucket(overrides: {
  putReturn?: unknown;
  getReturn?: { body: unknown; httpMetadata?: { contentType?: string } } | null;
  deleteReturn?: unknown;
  putCalls?: Array<{ key: string; contentType?: string }>;
} = {}) {
  const putCalls: Array<{ key: string; dataLength: number; contentType?: string }> = [];
  const stored = new Map<string, { data: Uint8Array; contentType: string }>();

  const bucket = {
    put: vi.fn(async (key: string, data: ArrayBuffer | ArrayBufferView | string, options?: { httpMetadata?: { contentType?: string } }) => {
      putCalls.push({ key, dataLength: (data as Uint8Array | ArrayBuffer).byteLength || 0, contentType: options?.httpMetadata?.contentType });
      if (data instanceof Uint8Array) {
        stored.set(key, { data: new Uint8Array(data), contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream' });
      } else if (data instanceof ArrayBuffer) {
        stored.set(key, { data: new Uint8Array(data), contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream' });
      }
      return overrides.putReturn;
    }),
    get: vi.fn(async (key: string) => {
      const entry = stored.get(key);
      if (!entry) return null;
      return {
        body: {
          pipeTo: async (destination: { write: (chunk: Uint8Array) => void; close: () => void }) => {
            destination.write(entry.data);
            destination.close();
          },
        },
        httpMetadata: { contentType: entry.contentType },
      };
    }),
    delete: vi.fn(async (key: string): Promise<void> => {
      stored.delete(key);
    }),
  };

  return { bucket, putCalls, stored };
}

describe('Phase 5.11b — R2MediaStorage (durable object storage adapter)', () => {
  const TEST_KEY = 'edison_vid_abcdef0123456789abcd.mp4';
  const BASE_URL = 'https://edison.example.com';

  it('stores and retrieves media through a mock R2 bucket', async () => {
    const { bucket } = makeMockBucket();
    const storage = new R2MediaStorage(bucket as R2BucketLike, BASE_URL);

    const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const stored = await storage.putObject({
      key: TEST_KEY,
      data,
      contentType: 'video/mp4',
    });

    expect(stored.key).toBe(TEST_KEY);
    expect(stored.sizeBytes).toBe(data.byteLength);
    expect(stored.sha256.length).toBe(64);

    const retrieved = await storage.getObject({ key: TEST_KEY });
    expect(retrieved).not.toBeNull();
    expect(retrieved!.data).toEqual(data);
    expect(retrieved!.contentType).toBe('video/mp4');
    expect(retrieved!.sizeBytes).toBe(data.byteLength);

    const url = storage.getObjectUrl({ key: TEST_KEY });
    expect(url).toBe(`${BASE_URL}/r2-media/${TEST_KEY}`);
  });

  it('returns null for missing objects in R2', async () => {
    const { bucket } = makeMockBucket();
    const storage = new R2MediaStorage(bucket as R2BucketLike, BASE_URL);

    const result = await storage.getObject({ key: 'edison_img_abcdef0123456789abcd.png' });
    expect(result).toBeNull();
  });

  it('rejects unsafe media storage keys', async () => {
    const { bucket } = makeMockBucket();
    const storage = new R2MediaStorage(bucket as R2BucketLike, BASE_URL);

    await expect(
      storage.putObject({
        key: '../../../etc/passwd',
        data: new Uint8Array([1]),
        contentType: 'text/plain',
      })
    ).rejects.toThrow('MEDIA_STORAGE_KEY_REJECTED');

    await expect(
      storage.getObject({ key: '../../../etc/passwd' })
    ).rejects.toThrow('MEDIA_STORAGE_KEY_REJECTED');
  });

  it('deletes objects from the mock R2 bucket', async () => {
    const { bucket } = makeMockBucket();
    const storage = new R2MediaStorage(bucket as R2BucketLike, BASE_URL);

    await storage.putObject({
      key: 'edison_img_abcdef0123456789abcd.png',
      data: new Uint8Array([1, 2, 3]),
      contentType: 'image/png',
    });

    expect(await storage.getObject({ key: 'edison_img_abcdef0123456789abcd.png' })).not.toBeNull();

    await storage.deleteObject({ key: 'edison_img_abcdef0123456789abcd.png' });
    expect(await storage.getObject({ key: 'edison_img_abcdef0123456789abcd.png' })).toBeNull();
  });

  it('passes content type through to R2 put options', async () => {
    const { bucket, putCalls } = makeMockBucket();
    const storage = new R2MediaStorage(bucket as R2BucketLike, BASE_URL);

    await storage.putObject({
      key: 'edison_img_abcdef0123456789abcd.png',
      data: new Uint8Array([1]),
      contentType: 'image/png',
    });

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0]!.contentType).toBe('image/png');
    expect(putCalls[0]!.key).toBe('edison_img_abcdef0123456789abcd.png');
  });
});