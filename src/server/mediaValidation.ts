import crypto from 'node:crypto';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 18 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION_PX = 16384;

export interface ValidatedMediaPayload {
  data: Uint8Array;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mediaKind: 'image' | 'video';
}

const ACTIVE_MARKUP_MARKERS = [
  '<svg',
  '<?xml',
  '<html',
  '<!doctype',
  '<script',
  '</script',
  '<iframe',
  '<?php',
  'javascript:',
];

function containsActiveMarkupOrScript(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(buf.length, 4096)).toString('utf8').toLowerCase();
  const tailStart = Math.max(0, buf.length - 512);
  const tail = buf.subarray(tailStart).toString('utf8').toLowerCase();
  const trimmedHead = head.trimStart();

  if (
    trimmedHead.startsWith('<') ||
    trimmedHead.startsWith('<?') ||
    ACTIVE_MARKUP_MARKERS.some((marker) => head.includes(marker) || tail.includes(marker))
  ) {
    return true;
  }
  return false;
}

function isStrictBase64(cleaned: string): boolean {
  const compact = cleaned.replace(/\s+/g, '');
  if (!compact || compact.length % 4 !== 0) {
    return false;
  }
  return /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

function sniffMagicMime(buf: Buffer): {
  mime: string;
  ext: string;
  kind: 'image' | 'video';
} | null {
  if (buf.length < 16 || containsActiveMarkupOrScript(buf)) {
    return null;
  }

  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    if (buf.subarray(12, 16).toString('ascii') === 'IHDR') {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (
        width === 0 ||
        height === 0 ||
        width > MAX_IMAGE_DIMENSION_PX ||
        height > MAX_IMAGE_DIMENSION_PX
      ) {
        return null;
      }
    }
    return { mime: 'image/png', ext: 'png', kind: 'image' };
  }

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && buf[3] >= 0xc0) {
    return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  }

  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  }

  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const boxSize = buf.readUInt32BE(0);
    const brand = buf.subarray(8, 12).toString('ascii');
    if (boxSize >= 16 && boxSize <= 65536 && /^[A-Za-z0-9 ]{4}$/.test(brand)) {
      return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
    }
  }

  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  }

  return null;
}

export function validateMediaUpload(params: {
  dataBase64: string;
  declaredKind?: 'image' | 'video' | 'any';
}): ValidatedMediaPayload {
  const cleanedB64 = (
    params.dataBase64.includes(',')
      ? params.dataBase64.slice(params.dataBase64.indexOf(',') + 1)
      : params.dataBase64
  ).trim();

  if (!isStrictBase64(cleanedB64)) {
    throw new Error('Malformed base64 media payload.');
  }

  const buffer = Buffer.from(cleanedB64, 'base64');
  if (buffer.length < 16) {
    throw new Error('Uploaded file is empty or too small to be valid media.');
  }

  const sniffed = sniffMagicMime(buffer);
  if (!sniffed) {
    throw new Error(
      'Unsupported or unsafe file bytes. Only validated PNG, JPG, WebP images and MP4/WebM videos are permitted (SVG/HTML/polyglot uploads blocked).'
    );
  }

  if (
    params.declaredKind &&
    params.declaredKind !== 'any' &&
    sniffed.kind !== params.declaredKind
  ) {
    throw new Error(
      `Expected ${params.declaredKind} file, but magic bytes matched ${sniffed.mime}.`
    );
  }

  const maxBytes = sniffed.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.length > maxBytes) {
    throw new Error(
      `File exceeds prototype ${sniffed.kind} size limit of ${Math.round(maxBytes / (1024 * 1024))} MB.`
    );
  }

  const prefix = sniffed.kind === 'video' ? 'vid' : 'img';
  return {
    data: buffer,
    storedFileName: `edison_${prefix}_${crypto.randomBytes(10).toString('hex')}.${sniffed.ext}`,
    mimeType: sniffed.mime,
    fileSizeBytes: buffer.length,
    mediaKind: sniffed.kind,
  };
}
