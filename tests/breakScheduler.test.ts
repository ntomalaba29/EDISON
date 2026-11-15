import { describe, expect, it, vi } from 'vitest';
import {
  MockAdNetworkBackfillAdapter,
  scheduleCommercialBreak,
  type AdNetworkAdapter,
} from '../src/server/breakScheduler.ts';
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
