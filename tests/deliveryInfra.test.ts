import { describe, expect, it } from 'vitest';
import {
  AdvertisingDeliveryInfrastructure,
  runDeliveryInfraVerificationSuite,
} from '../src/server/adDeliveryInfra.ts';
import type { AdCreativeRecord, CampaignRecord, QrLinkRecord } from '../src/types/edison.ts';

function makeQr(token: string, status: QrLinkRecord['status'] = 'active'): QrLinkRecord {
  const now = '2026-11-16T12:00:00.000Z';
  return {
    token,
    ownerId: 'usr_1',
    label: `QR ${token}`,
    destinationType: 'website',
    rawInput: 'https://example.org',
    resolvedUrl: 'https://example.org',
    resolvedHost: 'example.org',
    scheme: 'https',
    status,
    redirectRequestsTotal: 0,
    redirectIssuedTotal: 0,
    suspectedBotRequests: 0,
    deduplicatedNonBotRedirects: 0,
    lastRedirectRequestedAt: null,
    createdAt: now,
  };
}

function makeCampaign(overrides: Partial<CampaignRecord>): CampaignRecord {
  const now = '2026-11-16T12:00:00.000Z';
  const isCharity = overrides.contentCategory === 'opportunity_promotion';
  return {
    id: overrides.id ?? 'cmp_test',
    ownerId: 'usr_1',
    title: overrides.title ?? 'Test Campaign',
    contentCategory: overrides.contentCategory ?? 'commercial_advertising',
    summary: 'Delivery test campaign.',
    qrToken: 'dlv-active',
    adCreativeRef: null,
    durationSeconds: overrides.durationSeconds ?? 15,
    dailyFrequencyCap: overrides.dailyFrequencyCap ?? 2,
    targetRegions: overrides.targetRegions ?? ['United Kingdom · National'],
    dayparts: overrides.dayparts ?? ['daytime'],
    startDate: '2026-11-01',
    endDate: '2026-12-31',
    status: overrides.status ?? 'active',
    rejectionReason: null,
    fixInstructions: null,
    simulatedEstimate: {
      model: isCharity ? 'charity_free_zero_cost' : 'simulated_cpm_flat_rate',
      currency: 'USD',
      estimatedSpots: 10,
      estimatedRatePerSpotUsd: isCharity ? 0 : 4.5,
      estimatedTotalUsd: isCharity ? 0 : 45,
      paymentCollectionActive: false,
      disclaimer: 'Sim',
    },
    isPrototypeSeed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeWebmCreative(id: string, campaignId: string): AdCreativeRecord {
  const now = '2026-11-16T12:00:00.000Z';
  return {
    id,
    ownerId: 'usr_1',
    campaignId,
    qrToken: 'dlv-active',
    title: 'WebM Upload Spot',
    mode: 'option_b_upload',
    displayDurationSeconds: 20,
    safeZoneWarnings: [],
    contrastWarnings: [],
    optionA: null,
    optionB: {
      mediaKind: 'video',
      fileUrl: '/uploads/edison_vid_1234567890abcdef1234.webm',
      originalFileName: 'spot.webm',
      mimeType: 'video/webm',
      fileSizeBytes: 98000,
      widthPx: 1920,
      heightPx: 1080,
      aspectRatioLabel: '16:9',
      aspectRatioValid: true,
      durationSeconds: 20,
      hasAudioTrack: true,
      audioNotice: 'Stereo',
      qrInspectionStatus: 'none_found',
      decodedQrPayload: null,
      qrOverlayConfirmed: true,
      qrOverlayCorner: 'bottom_right',
      requiresAdminReviewFlag: false,
      contentAttested: true,
      validationWarnings: [],
      validationErrors: [],
    },
    status: 'ready_for_preview',
    isPrototypeSeed: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('Phase 6 Block 6.1: Advertising Delivery Infrastructure (Software-First)', () => {
  it('compiles SHA-256 preload manifests, locks $0.00 Charity cost, enforces regional/QR/Tizen codec gates & CDN failover', () => {
    const infra = new AdvertisingDeliveryInfrastructure();
    const nowIso = '2026-11-16T12:00:00.000Z';
    const qrs = [makeQr('dlv-active', 'active'), makeQr('dlv-flagged', 'flagged')];
    const campaigns = [
      makeCampaign({
        id: 'cmp_charity',
        contentCategory: 'opportunity_promotion',
        targetRegions: ['United Kingdom · National'],
      }),
      makeCampaign({
        id: 'cmp_webm_uk',
        adCreativeRef: 'crt_webm',
        targetRegions: ['GB'],
      }),
      makeCampaign({
        id: 'cmp_de',
        targetRegions: ['Germany · Berlin'],
      }),
      makeCampaign({
        id: 'cmp_bad_qr',
        qrToken: 'dlv-flagged',
        targetRegions: ['GB'],
      }),
      makeCampaign({
        id: 'cmp_expired_window',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        targetRegions: ['GB'],
      }),
    ];
    const creatives = [makeWebmCreative('crt_webm', 'cmp_webm_uk')];

    const androidManifest = infra.compilePreloadManifest({
      platformId: 'android_tv_tif',
      deviceSlotId: 'slot_gb_1',
      regionCode: 'GB',
      daypart: 'daytime',
      campaigns,
      creatives,
      qrLinks: qrs,
      referenceDateIso: nowIso,
    });

    expect(androidManifest.manifestSha256).toHaveLength(64);
    expect(androidManifest.eligibleCount).toBe(2);
    expect(androidManifest.excludedCount).toBe(3);
    expect(androidManifest.ordinaryTvPreserved).toBe(true);
    expect(androidManifest.hardwareTested).toBe(false);
    expect(androidManifest.stageP6Deferred).toBe(true);

    const charityItem = androidManifest.items.find((i) => i.campaignId === 'cmp_charity');
    expect(charityItem?.charityZeroCostLocked).toBe(true);
    expect(charityItem?.estimatedValueUsd).toBe(0);

    expect(
      androidManifest.excluded.find((e) => e.campaignId === 'cmp_de')?.reasonCode
    ).toBe('SKIP_REGION_MISMATCH');
    expect(
      androidManifest.excluded.find((e) => e.campaignId === 'cmp_bad_qr')?.reasonCode
    ).toBe('SKIP_EXPIRED_OR_INVALID_QR');
    expect(
      androidManifest.excluded.find((e) => e.campaignId === 'cmp_expired_window')?.reasonCode
    ).toBe('SKIP_SCHEDULE_WINDOW');

    // Samsung Tizen excludes WebM creatives safely while simulating primary CDN outage failover
    const tizenFailover = infra.compilePreloadManifest({
      platformId: 'samsung_tizen',
      deviceSlotId: 'slot_tizen_1',
      regionCode: 'GB',
      daypart: 'daytime',
      campaigns,
      creatives,
      qrLinks: qrs,
      referenceDateIso: nowIso,
      simulateCdnOutage: true,
    });
    expect(tizenFailover.cdnEdgeStatus).toBe('secondary_failover');
    expect(tizenFailover.failClosedFallbackUsed).toBe(true);
    expect(tizenFailover.ordinaryTvPreserved).toBe(true);
    expect(
      tizenFailover.excluded.find((e) => e.campaignId === 'cmp_webm_uk')?.reasonCode
    ).toBe('SKIP_INCOMPATIBLE_DEVICE');
  });

  it('enforces idempotent event ingestion, rejects negative/excessive duration anomalies, and blocks N+1 frequency cap plays', () => {
    const infra = new AdvertisingDeliveryInfrastructure();
    const nowIso = '2026-11-16T12:00:00.000Z';
    const qrs = [makeQr('dlv-active', 'active')];
    const campaigns = [
      makeCampaign({ id: 'cmp_capped', dailyFrequencyCap: 2, targetRegions: ['GB'] }),
    ];

    const ingest = infra.ingestDeliveryEvents([
      {
        idempotencyKey: 'k1',
        deviceSlotId: 'tv_slot_9',
        campaignId: 'cmp_capped',
        qrToken: 'dlv-active',
        eventType: 'ad_played',
        regionCode: 'GB',
        playbackDurationMs: 15000,
        occurredAt: nowIso,
      },
      {
        idempotencyKey: 'k1', // replay must deduplicate without inflating count
        deviceSlotId: 'tv_slot_9',
        campaignId: 'cmp_capped',
        qrToken: 'dlv-active',
        eventType: 'ad_played',
        regionCode: 'GB',
        playbackDurationMs: 15000,
        occurredAt: nowIso,
      },
      {
        idempotencyKey: 'k2',
        deviceSlotId: 'tv_slot_9',
        campaignId: 'cmp_capped',
        qrToken: 'dlv-active',
        eventType: 'ad_played',
        regionCode: 'GB',
        playbackDurationMs: 15000,
        occurredAt: nowIso,
      },
      {
        idempotencyKey: 'k_bad_neg',
        deviceSlotId: 'tv_slot_9',
        campaignId: 'cmp_capped',
        eventType: 'ad_played',
        regionCode: 'GB',
        playbackDurationMs: -1,
        occurredAt: nowIso,
      },
    ]);

    expect(ingest.ok).toBe(false);
    expect(ingest.acceptedNewCount).toBe(2);
    expect(ingest.deduplicatedReplayCount).toBe(1);
    expect(ingest.rejectedAnomalyCount).toBe(1);
    expect(infra.getDailyImpressions('tv_slot_9', 'cmp_capped', '2026-11-16')).toBe(2);

    const manifestAfterCap = infra.compilePreloadManifest({
      platformId: 'android_tv_tif',
      deviceSlotId: 'tv_slot_9',
      regionCode: 'GB',
      daypart: 'daytime',
      campaigns,
      creatives: [],
      qrLinks: qrs,
      referenceDateIso: nowIso,
    });
    expect(manifestAfterCap.eligibleCount).toBe(0);
    expect(
      manifestAfterCap.excluded.find((e) => e.campaignId === 'cmp_capped')?.reasonCode
    ).toBe('SKIP_FREQUENCY_CAP_REACHED');
  });

  it('passes all 8 deterministic checks in runDeliveryInfraVerificationSuite with hardwareTested=false', () => {
    const suite = runDeliveryInfraVerificationSuite();
    expect(suite.totalChecks).toBe(8);
    expect(suite.passedChecks).toBe(8);
    expect(suite.allPassed).toBe(true);
    expect(suite.isSoftwareSimulationOnly).toBe(true);
    expect(suite.hardwareTested).toBe(false);
    expect(suite.stageP6Deferred).toBe(true);
  });
});
