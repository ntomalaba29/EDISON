import fs from 'node:fs';
import path from 'node:path';
import { validateMediaUpload } from './mediaValidation.ts';
import type { MediaStorageBackend } from './mediaStorage.ts';
export {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION_PX,
  MAX_VIDEO_BYTES,
  validateMediaUpload,
} from './mediaValidation.ts';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
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

export function saveValidatedMediaUpload(params: {
  dataBase64: string;
  declaredKind?: 'image' | 'video' | 'any';
  uploadsDir?: string;
  storageBackend?: MediaStorageBackend;
  mediaBaseUrl?: string;
}): ValidatedUploadResult {
  const validated = validateMediaUpload(params);
  const backend = params.storageBackend;

  if (backend) {
    const stored = backend.putObject({
      key: validated.storedFileName,
      data: validated.data,
      contentType: validated.mimeType,
    });

    return {
      fileUrl: backend.getObjectUrl({ key: validated.storedFileName }),
      storedFileName: validated.storedFileName,
      mimeType: validated.mimeType,
      fileSizeBytes: validated.fileSizeBytes,
      mediaKind: validated.mediaKind,
    };
  }

  const targetDir = params.uploadsDir ? path.resolve(params.uploadsDir) : UPLOADS_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const fullPath = path.join(targetDir, validated.storedFileName);
  fs.writeFileSync(fullPath, validated.data, { mode: 0o600 });

  return {
    fileUrl: `/uploads/${validated.storedFileName}`,
    storedFileName: validated.storedFileName,
    mimeType: validated.mimeType,
    fileSizeBytes: validated.fileSizeBytes,
    mediaKind: validated.mediaKind,
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
