import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_BYTES = 18 * 1024 * 1024; // 18 MB prototype cap
export const MAX_IMAGE_DIMENSION_PX = 16384;

export interface ValidatedUploadResult {
  fileUrl: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mediaKind: 'image' | 'video';
}

export const STATIC_ASSET_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'public, max-age=86400, immutable',
};

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

function sniffMagicMime(buf: Buffer): { mime: string; ext: string; kind: 'image' | 'video' } | null {
  if (buf.length < 16) return null;

  if (containsActiveMarkupOrScript(buf)) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A + valid IHDR chunk bounds
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

  // JPEG: FF D8 FF followed by plausible marker byte (E0..EF, DB, C0, C2, etc.)
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && buf[3] >= 0xc0) {
    return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  }

  // WebP: RIFF .... WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  }

  // MP4 / ISO BMFF: plausible ftyp box header (size >= 16, valid brand) at byte offset 4
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const boxSize = buf.readUInt32BE(0);
    const brand = buf.subarray(8, 12).toString('ascii');
    if (boxSize >= 16 && boxSize <= 65536 && /^[A-Za-z0-9 ]{4}$/.test(brand)) {
      return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
    }
  }

  // WebM (EBML header): 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  }

  return null;
}

export function saveValidatedMediaUpload(params: {
  dataBase64: string;
  declaredKind?: 'image' | 'video' | 'any';
  uploadsDir?: string;
}): ValidatedUploadResult {
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

  const targetDir = params.uploadsDir ? path.resolve(params.uploadsDir) : UPLOADS_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const prefix = sniffed.kind === 'video' ? 'vid' : 'img';
  const storedFileName = `edison_${prefix}_${crypto.randomBytes(10).toString('hex')}.${sniffed.ext}`;
  const fullPath = path.join(targetDir, storedFileName);
  fs.writeFileSync(fullPath, buffer, { mode: 0o600 });

  return {
    fileUrl: `/uploads/${storedFileName}`,
    storedFileName,
    mimeType: sniffed.mime,
    fileSizeBytes: buffer.length,
    mediaKind: sniffed.kind,
  };
}

export function resolveSafeUploadPath(
  requestedName: string,
  uploadsDir: string = UPLOADS_DIR
): {
  fullPath: string;
  contentType: string;
} | null {
  if (!requestedName || requestedName.includes('/') || requestedName.includes('\\')) {
    return null;
  }
  const safeName = path.basename(requestedName);
  if (!/^edison_(img|vid)_[a-f0-9]{20}\.(png|jpg|webp|mp4|webm)$/i.test(safeName)) {
    return null;
  }

  const targetDir = path.resolve(uploadsDir);
  if (!fs.existsSync(targetDir)) {
    return null;
  }

  const candidatePath = path.join(targetDir, safeName);
  if (!fs.existsSync(candidatePath)) {
    return null;
  }

  // Canonical realpath guard blocks any symlink escape out of uploadsDir
  let realDir: string;
  let realFile: string;
  try {
    realDir = fs.realpathSync(targetDir);
    realFile = fs.realpathSync(candidatePath);
    const stat = fs.statSync(realFile);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  const expectedPrefix = realDir.endsWith(path.sep) ? realDir : `${realDir}${path.sep}`;
  if (!realFile.startsWith(expectedPrefix)) {
    return null;
  }

  const ext = path.extname(safeName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return {
    fullPath: realFile,
    contentType: mimeMap[ext] ?? 'application/octet-stream',
  };
}
