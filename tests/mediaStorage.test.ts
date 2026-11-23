import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalFileSystemMediaStorage } from '../src/server/mediaStorage.ts';

describe('Phase 5.11b — LocalFileSystemMediaStorage (durable object storage adapter)', () => {
  const TEST_KEY = 'edison_img_abcdef0123456789abcd.png';

  it('stores and retrieves validated media bytes with path confinement', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-media-storage-'));
    const storage = new LocalFileSystemMediaStorage(tmpRoot);

    try {
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const stored = await storage.putObject({
        key: TEST_KEY,
        data,
        contentType: 'image/png',
      });

      expect(stored.key).toBe(TEST_KEY);
      expect(stored.sizeBytes).toBe(data.byteLength);
      expect(typeof stored.sha256).toBe('string');
      expect(stored.sha256.length).toBe(64);

      const retrieved = await storage.getObject({ key: TEST_KEY });
      expect(retrieved).not.toBeNull();
      expect(retrieved!.data).toEqual(data);
      expect(retrieved!.contentType).toBe('image/png');
      expect(retrieved!.sizeBytes).toBe(data.byteLength);

      const url = storage.getObjectUrl({ key: TEST_KEY });
      expect(url).toBe(`/uploads/${TEST_KEY}`);

      await storage.deleteObject({ key: TEST_KEY });
      const afterDelete = await storage.getObject({ key: TEST_KEY });
      expect(afterDelete).toBeNull();
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('rejects unsafe media storage keys (path traversal)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-media-storage-'));
    const storage = new LocalFileSystemMediaStorage(tmpRoot);

    try {
      await expect(
        storage.putObject({
          key: '../../../etc/passwd',
          data: new Uint8Array([1]),
          contentType: 'text/plain',
        })
      ).rejects.toThrow('MEDIA_STORAGE_KEY_REJECTED');

      await expect(
        storage.putObject({
          key: 'edison_img_abcdef0123456789ab.png/../../escape',
          data: new Uint8Array([1]),
          contentType: 'text/plain',
        })
      ).rejects.toThrow('MEDIA_STORAGE_KEY_REJECTED');

      await expect(
        storage.getObject({ key: '../../../etc/passwd' })
      ).rejects.toThrow('MEDIA_STORAGE_KEY_REJECTED');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('returns null for missing objects', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-media-storage-'));
    const storage = new LocalFileSystemMediaStorage(tmpRoot);

    try {
      const result = await storage.getObject({ key: TEST_KEY });
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('computes correct SHA-256 for stored content', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-media-storage-'));
    const storage = new LocalFileSystemMediaStorage(tmpRoot);

    try {
      const data = new TextEncoder().encode('hello world');
      const stored = await storage.putObject({
        key: TEST_KEY,
        data,
        contentType: 'image/png',
      });

      const expectedHash = crypto.createHash('sha256').update(data).digest('hex');
      expect(stored.sha256).toBe(expectedHash);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});