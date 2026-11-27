export const ANDROID_TV_AD_MEDIA_CONTRACT = Object.freeze({
  contractVersion: '1.0',
  platform: 'android_tv',
  container: 'mp4',
  videoCodec: 'h264',
  videoProfile: 'high',
  videoLevel: '4.1',
  pixelFormat: 'yuv420p',
  audioCodec: 'aac-lc',
  audioSampleRateHz: 48_000,
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  frameRateMax: 60,
  durationMinSeconds: 5,
  durationMaxSeconds: 90,
  maxBytes: 18 * 1024 * 1024,
  checksum: 'sha256',
  deliveryProtocol: 'https',
  cachePolicy: 'bounded',
  fallback: 'no_playback',
});

export interface AndroidTvAdMediaDescriptor {
  uri: string;
  sha256: string;
  durationSeconds: number;
  expiresAt: string;
}

export interface AndroidTvAdMediaContractResult {
  accepted: boolean;
  reasonCode:
    | 'VALID'
    | 'UNSAFE_URI'
    | 'INVALID_SHA256'
    | 'INVALID_DURATION'
    | 'INVALID_EXPIRY';
  descriptor: AndroidTvAdMediaDescriptor | null;
}

export function validateAndroidTvAdMediaContract(
  descriptor: AndroidTvAdMediaDescriptor,
  now = new Date()
): AndroidTvAdMediaContractResult {
  let uri: URL;
  try {
    uri = new URL(descriptor.uri);
  } catch {
    return { accepted: false, reasonCode: 'UNSAFE_URI', descriptor: null };
  }
  if (
    uri.protocol !== 'https:' ||
    uri.username !== '' ||
    uri.password !== '' ||
    uri.hash !== ''
  ) {
    return { accepted: false, reasonCode: 'UNSAFE_URI', descriptor: null };
  }
  if (!/^[a-f0-9]{64}$/.test(descriptor.sha256)) {
    return { accepted: false, reasonCode: 'INVALID_SHA256', descriptor: null };
  }
  if (
    !Number.isInteger(descriptor.durationSeconds) ||
    descriptor.durationSeconds < ANDROID_TV_AD_MEDIA_CONTRACT.durationMinSeconds ||
    descriptor.durationSeconds > ANDROID_TV_AD_MEDIA_CONTRACT.durationMaxSeconds
  ) {
    return { accepted: false, reasonCode: 'INVALID_DURATION', descriptor: null };
  }
  const expiry = Date.parse(descriptor.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) {
    return { accepted: false, reasonCode: 'INVALID_EXPIRY', descriptor: null };
  }
  return { accepted: true, reasonCode: 'VALID', descriptor: { ...descriptor } };
}
