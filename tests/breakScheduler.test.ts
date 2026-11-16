import { describe, expect, it, vi } from 'vitest';
import {
  MockAdNetworkBackfillAdapter,
  scheduleCommercialBreak,
  type AdNetworkAdapter,
} from '../src/server/breakScheduler.ts';
import {
  listChannelPredictorProfiles,
  predictBreakDurationQuantiles,
  runRecordedStreamCalibrationBenchmark,
} from '../src/server/breakDurationPredictor.ts';
import type { CampaignRecord, OpportunityRecord } from '../src/types/edison.ts';

function makeCampaign(overrides: Partial<CampaignRecord>): CampaignRecord {
  const now = '2026-11-15T10:00:00.000Z';
  const isCharity = overrides.contentCategory === 'opportunity_promotion';
  return {
    id: overrides.id ?? 'cmp_test',
    ownerId: 'usr_1',
    title: overrides.title ?? 'Test Campaign',
    contentCategory: overrides.contentCategory ?? 'commercial_advertising',
    summary: 'Test campaign summary for scheduler validation.',
    qrToken: 'edison-demo',
    adCreativeRef: null,
    durationSeconds: overrides.durationSeconds ?? 15,
    dailyFrequencyCap: 4,
    targetRegions: ['United Kingdom · National'],
    dayparts: ['daytime'],
    startDate: '2026-11-01',
    endDate: '2026-12-01',
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
      disclaimer: 'Simulated test campaign',
    },
    isPrototypeSeed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeOpportunity(id: string): OpportunityRecord {
  const now = '2026-11-15T10:00:00.000Z';
  return {
    id,
    ownerId: 'usr_opp',
    providerType: 'registered_organisation',
    providerName: 'Civic Skills Academy',
    category: 'apprenticeship',
    title: 'Free Welding Apprenticeship',
    description: 'Zero-fee national training intake.',
    location: 'Manchester, UK',
    eligibilityRequirements: 'Aged 18+',
    applicationMethod: 'QR portal',
    contactInfo: 'admissions@example.org',
    qrToken: 'job-demo',
    linkedCampaignId: null,
    closingDate: '2027-01-01',
    expiryDate: '2027-01-15',
    status: 'verified_live',
    verificationTiers: {
      identityStatus: 'verified',
      identityEvidenceRef: 'ID-1',
      identityNotes: 'OK',
      identityVerifiedAt: now,
      organisationStatus: 'verified',
      organisationEvidenceRef: 'ORG-1',
      organisationNotes: 'OK',
      organisationVerifiedAt: now,
      specificOpportunityStatus: 'verified',
      specificOpportunityEvidenceRef: 'OPP-1',
      specificOpportunityNotes: 'OK',
      specificOpportunityVerifiedAt: now,
    },
    scamRiskFlags: [],
    applicationFeeFreeConfirmed: true,
    noGuaranteeConfirmed: true,
    advertisingFeeInfluencesVerification: false,
    rejectionReason: null,
    suspensionReason: null,
    isPrototypeSeed: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('scheduleCommercialBreak (SimulationTvAdapter)', () => {
  it('skips breaks safely when usable time after safetyBufferSeconds falls below 10s', () => {
    const plan = scheduleCommercialBreak({
      campaigns: [makeCampaign({ id: 'c1', contentCategory: 'commercial_advertising' })],
      creatives: [],
      opportunities: [makeOpportunity('opp_1')],
      requestedBreakDurationSeconds: 14,
      safetyBufferSeconds: 5,
      requestedSlotCount: 4,
      alternatingPointerStart: 'CHARITY',
    });

    expect(plan.skipped).toBe(true);
    expect(plan.usableBreakSeconds).toBe(9);
    expect(plan.slots).toHaveLength(0);
    expect(plan.nextAlternatingPointer).toBe('CHARITY');
  });

  it('alternates CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL with Direct Priority before MockAdNetworkBackfillAdapter', () => {
    const mockAdapter = new MockAdNetworkBackfillAdapter();
    const spy = vi.spyOn(mockAdapter, 'requestCommercialBackfill');

    const plan = scheduleCommercialBreak({
      campaigns: [
        makeCampaign({ id: 'ch_1', title: 'Charity 1', contentCategory: 'opportunity_promotion' }),
        makeCampaign({ id: 'cm_1', title: 'Direct Commercial 1', contentCategory: 'commercial_advertising' }),
      ],
      creatives: [],
      opportunities: [makeOpportunity('opp_live_1')],
      requestedBreakDurationSeconds: 65,
      safetyBufferSeconds: 5,
      requestedSlotCount: 4,
      alternatingPointerStart: 'CHARITY',
      allowMockBackfill: true,
      adNetworkAdapter: mockAdapter,
    });

    expect(plan.skipped).toBe(false);
    expect(plan.slots).toHaveLength(4);
    expect(plan.slots.map((s) => s.primaryCategory)).toEqual([
      'CHARITY',
      'COMMERCIAL',
      'CHARITY',
      'COMMERCIAL',
    ]);

    // Slot 1 & 3 are Charity ($0.00 / FREE)
    expect(plan.slots[0].source).toBe('direct_charity_free');
    expect(plan.slots[0].estimatedValueUsd).toBe(0);
    expect(plan.slots[2].source).toBe('direct_charity_free');
    expect(plan.slots[2].estimatedValueUsd).toBe(0);

    // Slot 2 uses Direct-Paid Commercial campaign first; Slot 4 falls back to MockAdNetworkAdapter once
    expect(plan.slots[1].source).toBe('direct_commercial_paid');
    expect(plan.slots[1].isMockBackfill).toBe(false);
    expect(plan.slots[3].source).toBe('mock_ad_network_backfill');
    expect(plan.slots[3].isMockBackfill).toBe(true);
    expect(plan.slots[3].revenueStream).toBe('ad_network_estimated');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('uses Direct-Paid Commercial inventory exclusively when enough direct commercial slots exist', () => {
    const adapter: AdNetworkAdapter = {
      adapterName: 'TestAdapter',
      isMock: true,
      requestCommercialBackfill: vi.fn(),
    };

    const plan = scheduleCommercialBreak({
      campaigns: [
        makeCampaign({ id: 'ch_1', contentCategory: 'opportunity_promotion' }),
        makeCampaign({ id: 'cm_1', contentCategory: 'commercial_advertising' }),
        makeCampaign({ id: 'cm_2', contentCategory: 'commercial_advertising' }),
      ],
      creatives: [],
      opportunities: [makeOpportunity('opp_1')],
      requestedBreakDurationSeconds: 70,
      safetyBufferSeconds: 5,
      requestedSlotCount: 4,
      alternatingPointerStart: 'CHARITY',
      allowMockBackfill: true,
      adNetworkAdapter: adapter,
    });

    expect(plan.slots[1].source).toBe('direct_commercial_paid');
    expect(plan.slots[3].source).toBe('direct_commercial_paid');
    expect(adapter.requestCommercialBackfill).not.toHaveBeenCalled();
  });

  it('applies k=1 short-break rule and flips nextAlternatingPointer across consecutive short breaks', () => {
    const first = scheduleCommercialBreak({
      campaigns: [makeCampaign({ id: 'ch_1', contentCategory: 'opportunity_promotion', durationSeconds: 15 })],
      creatives: [],
      opportunities: [],
      requestedBreakDurationSeconds: 20,
      safetyBufferSeconds: 5,
      requestedSlotCount: 4,
      alternatingPointerStart: 'CHARITY',
    });

    expect(first.slots).toHaveLength(1);
    expect(first.slots[0].primaryCategory).toBe('CHARITY');
    expect(first.k1ShortBreakRuleApplied).toBe(true);
    expect(first.nextAlternatingPointer).toBe('COMMERCIAL');

    const second = scheduleCommercialBreak({
      campaigns: [makeCampaign({ id: 'cm_1', contentCategory: 'commercial_advertising', durationSeconds: 15 })],
      creatives: [],
      opportunities: [],
      requestedBreakDurationSeconds: 20,
      safetyBufferSeconds: 5,
      requestedSlotCount: 4,
      alternatingPointerStart: first.nextAlternatingPointer,
    });

    expect(second.slots).toHaveLength(1);
    expect(second.slots[0].primaryCategory).toBe('COMMERCIAL');
    expect(second.k1ShortBreakRuleApplied).toBe(true);
    expect(second.nextAlternatingPointer).toBe('CHARITY');
  });

  it('leaves COMMERCIAL slot unfilled when Direct Commercial inventory is exhausted and allowMockBackfill=false', () => {
    const plan = scheduleCommercialBreak({
      campaigns: [],
      creatives: [],
      opportunities: [],
      requestedBreakDurationSeconds: 40,
      safetyBufferSeconds: 5,
      requestedSlotCount: 2,
      alternatingPointerStart: 'COMMERCIAL',
      allowMockBackfill: false,
    });

    expect(plan.slots[0].primaryCategory).toBe('COMMERCIAL');
    expect(plan.slots[0].source).toBe('unfilled');
    expect(plan.slots[0].estimatedValueUsd).toBe(0);
    expect(plan.slots[0].isMockBackfill).toBe(false);
  });
});

describe('Block 5.2: Break Duration ML Lower-Bound (p10/p5) Predictor & Calibration Benchmark', () => {
  it('computes empirical p5 <= p10 <= p50 <= mean and safely rejects high-mean live_sport breaks whose p10 lower bound is too short', () => {
    const profiles = listChannelPredictorProfiles();
    expect(profiles).toHaveLength(4);

    const sportPred = predictBreakDurationQuantiles({
      channelNumber: 401,
      daypart: 'daytime',
      programmeGenre: 'live_sport',
      signalType: 'av_pattern',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 30,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.85,
      drmProtected: false,
    });

    expect(sportPred.p5Sec).toBeLessThanOrEqual(sportPred.p10Sec);
    expect(sportPred.p10Sec).toBeLessThanOrEqual(sportPred.p50Sec);
    expect(sportPred.meanSec).toBeGreaterThan(45);
    expect(sportPred.safeToSchedule).toBe(false);
    expect(sportPred.wouldMeanOverestimate).toBe(true);
    expect(sportPred.decision).toBe('SKIP_MEAN_UNSAFE_P10_SHORT');
    expect(sportPred.hardwareTested).toBe(false);
    expect(sportPred.stageP6Deferred).toBe(true);
  });

  it('approves prime-time structured SCTE-35 breaks inside p10 safety window and fails closed on DRM or sub-threshold confidence', () => {
    const primeOk = predictBreakDurationQuantiles({
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'scte35',
      requestedAdDurationSec: 30,
      confidenceScore: 0.96,
      drmProtected: false,
    });
    expect(primeOk.safeToSchedule).toBe(true);
    expect(primeOk.decision).toBe('SCHEDULE_WITH_P10_BOUND');

    const drmSkip = predictBreakDurationQuantiles({
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'scte35',
      requestedAdDurationSec: 20,
      confidenceScore: 0.99,
      drmProtected: true,
    });
    expect(drmSkip.safeToSchedule).toBe(false);
    expect(drmSkip.decision).toBe('SKIP_DRM_PROTECTED');

    const lowConfSkip = predictBreakDurationQuantiles({
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'av_pattern',
      requestedAdDurationSec: 15,
      confidenceScore: 0.58,
      drmProtected: false,
    });
    expect(lowConfSkip.safeToSchedule).toBe(false);
    expect(lowConfSkip.decision).toBe('SKIP_LOW_CONFIDENCE');
  });

  it('passes all 10 recorded broadcast stream calibration fixtures with 0% FPR and hardwareTested=false', () => {
    const benchmark = runRecordedStreamCalibrationBenchmark();
    expect(benchmark.totalFixtures).toBe(10);
    expect(benchmark.passedFixtures).toBe(10);
    expect(benchmark.allPassed).toBe(true);
    expect(benchmark.falsePositiveRatePct).toBe(0);
    expect(benchmark.p10SafeContainmentRatePct).toBe(100);
    expect(benchmark.isSoftwareSimulationOnly).toBe(true);
    expect(benchmark.hardwareTested).toBe(false);
    expect(benchmark.stageP6Deferred).toBe(true);
  });
});

