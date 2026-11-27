import { describe, expect, it } from 'vitest';
import {
  ANDROID_TV_AD_MEDIA_CONTRACT,
  validateAndroidTvAdMediaContract,
} from '../src/server/androidTvAdMediaContract.ts';

describe('Android TV ad media contract', () => {
  const now = new Date('2026-11-27T09:00:00.000Z');
  const validDescriptor = {
    uri: 'https://media.example.test/edison/ad.mp4',
    sha256: 'a'.repeat(64),
    durationSeconds: 30,
    expiresAt: '2026-11-27T10:00:00.000Z',
  };

  it('defines a bounded Android-native H.264/AAC MP4 contract', () => {
    expect(ANDROID_TV_AD_MEDIA_CONTRACT).toMatchObject({
      contractVersion: '1.0',
      container: 'mp4',
      videoCodec: 'h264',
      videoProfile: 'high',
      audioCodec: 'aac-lc',
      width: 1920,
      height: 1080,
      durationMinSeconds: 5,
      durationMaxSeconds: 90,
      deliveryProtocol: 'https',
      fallback: 'no_playback',
    });
  });

  it('accepts one complete HTTPS, checksum, duration and expiry descriptor', () => {
    expect(validateAndroidTvAdMediaContract(validDescriptor, now)).toEqual({
      accepted: true,
      reasonCode: 'VALID',
      descriptor: validDescriptor,
    });
  });

  it('rejects insecure URIs, invalid checksums, durations and expired assets', () => {
    expect(validateAndroidTvAdMediaContract({
      ...validDescriptor,
      uri: 'http://media.example.test/ad.mp4',
    }, now).reasonCode).toBe('UNSAFE_URI');

    expect(validateAndroidTvAdMediaContract({
      ...validDescriptor,
      uri: 'https://user:password@media.example.test/ad.mp4',
    }, now).reasonCode).toBe('UNSAFE_URI');

    expect(validateAndroidTvAdMediaContract({
      ...validDescriptor,
      sha256: 'xyz',
    }, now).reasonCode).toBe('INVALID_SHA256');

    expect(validateAndroidTvAdMediaContract({
      ...validDescriptor,
      durationSeconds: 91,
    }, now).reasonCode).toBe('INVALID_DURATION');

    expect(validateAndroidTvAdMediaContract({
      ...validDescriptor,
      expiresAt: '2026-11-27T09:00:00.000Z',
    }, now).reasonCode).toBe('INVALID_EXPIRY');
  });
});
