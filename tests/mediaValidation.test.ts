import { describe, expect, it } from 'vitest';
import { validateMediaUpload } from '../src/server/mediaValidation.ts';

const validPngBase64 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
  'hex'
).toString('base64');

describe('storage-independent media validation', () => {
  it('returns validated bytes and storage metadata without writing to disk', () => {
    const payload = validateMediaUpload({
      dataBase64: `data:image/png;base64,${validPngBase64}`,
      declaredKind: 'image',
    });

    expect(payload.data).toBeInstanceOf(Uint8Array);
    expect(payload.mimeType).toBe('image/png');
    expect(payload.mediaKind).toBe('image');
    expect(payload.fileSizeBytes).toBe(payload.data.byteLength);
    expect(payload.storedFileName).toMatch(/^edison_img_[a-f0-9]{20}\.png$/);
  });

  it('rejects unsafe markup and declared-kind mismatches before persistence', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    ).toString('base64');

    expect(() => validateMediaUpload({ dataBase64: svg, declaredKind: 'image' }))
      .toThrow(/Unsupported or unsafe file bytes/);
    expect(() => validateMediaUpload({ dataBase64: validPngBase64, declaredKind: 'video' }))
      .toThrow(/Expected video file/);
  });
});
