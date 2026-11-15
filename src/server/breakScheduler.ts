import type {
  AdCreativeRecord,
  BreakSchedulePlan,
  CampaignRecord,
  OpportunityRecord,
  PrimaryAdCategory,
  ScheduledBreakSlot,
} from '../types/edison.ts';

export interface AdNetworkFillRequest {
  slotIndex: number;
  maxDurationSeconds: number;
}

export interface AdNetworkFillResponse {
  filled: boolean;
  providerLabel: string;
  creativeTitle: string;
  durationSeconds: number;
  estimatedMockRevenueUsd: number;
  disclaimer: string;
}

export interface AdNetworkAdapter {
  readonly adapterName: string;
  readonly isMock: boolean;
  requestCommercialBackfill(req: AdNetworkFillRequest): AdNetworkFillResponse;
}

/**
 * MockAdNetworkBackfillAdapter
 *
 * Strictly simulated Phase 2 fallback adapter used only when Direct-Paid
 * Commercial inventory is exhausted or unavailable for a COMMERCIAL break slot.
 * Google Ad Manager CTV account and static/text backfill format eligibility remain
 * UNRESOLVED (DEC-OPEN-03). Zero real network requests or live ad payouts occur.
 */
export class MockAdNetworkBackfillAdapter implements AdNetworkAdapter {
  readonly adapterName = 'MockAdNetworkAdapter (GAM CTV Unconfigured — DEC-OPEN-03)';
  readonly isMock = true;

  requestCommercialBackfill(req: AdNetworkFillRequest): AdNetworkFillResponse {
    const duration = Math.min(15, Math.max(10, req.maxDurationSeconds));
    return {
      filled: true,
      providerLabel: 'MOCK AD NETWORK BACKFILL',
      creativeTitle: `[MOCK AD NETWORK] Partner Commercial Backfill #${req.slotIndex}`,
      durationSeconds: duration,
      estimatedMockRevenueUsd: Number((duration * 0.12).toFixed(2)),
      disclaimer:
        'MOCK BACKFILL ONLY — Google Ad Manager CTV account not configured & format eligibility unresolved (DEC-OPEN-03).',
    };
  }
}

export interface ScheduleBreakParams {
  campaigns: CampaignRecord[];
  creatives: AdCreativeRecord[];
  opportunities: OpportunityRecord[];
  requestedBreakDurationSeconds?: number;
  safetyBufferSeconds?: number;
  requestedSlotCount?: number;
  alternatingPointerStart?: PrimaryAdCategory;
  allowMockBackfill?: boolean;
  adNetworkAdapter?: AdNetworkAdapter;
}

/**
 * Pure non-consent break scheduler for Block P2-V2.2 (SimulationTvAdapter).
 *
 * Rules enforced:
 * 1. Mandatory switching/restoration safety buffer: skips breaks whose remaining
 *    usable duration falls below the 10-second minimum spot + buffer.
 * 2. Strict alternating category order: CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL
 *    (or starting at alternatingPointerStart, flipping per scheduled slot so k=1 short
 *    breaks maintain cross-break alternation per DEC-OPEN-02).
 * 3. Direct-Paid Commercial priority: eligible active/approved/scheduled Direct-Paid
 *    campaigns fill COMMERCIAL slots first; MockAdNetworkBackfillAdapter is invoked
 *    strictly as backfill when direct commercial inventory is exhausted.
 * 4. CHARITY ADS ($0.00 / FREE permanent rule): opportunity_promotion campaigns and
 *    verified_live opportunities always record estimatedValueUsd = 0.
 * 5. Zero DEC-OPEN-01 consent/household/profile logic included.
 */
export function scheduleCommercialBreak(params: ScheduleBreakParams): BreakSchedulePlan {
  const requestedBreakDurationSeconds = Math.max(
    0,
    Math.round(params.requestedBreakDurationSeconds ?? 65)
  );
  const safetyBufferSeconds = Math.max(2, Math.min(15, Math.round(params.safetyBufferSeconds ?? 5)));
  const requestedSlotCount = Math.max(1, Math.min(6, Math.round(params.requestedSlotCount ?? 4)));
  const alternatingPointerStart: PrimaryAdCategory =
    params.alternatingPointerStart === 'COMMERCIAL' ? 'COMMERCIAL' : 'CHARITY';
  const allowMockBackfill = params.allowMockBackfill !== false;
  const networkAdapter = params.adNetworkAdapter ?? new MockAdNetworkBackfillAdapter();

  const usableBreakSeconds = Math.max(0, requestedBreakDurationSeconds - safetyBufferSeconds);
  const MIN_SPOT_SECONDS = 10;

  if (usableBreakSeconds < MIN_SPOT_SECONDS) {
    return {
      generatedAt: new Date().toISOString(),
      adapterId: 'simulation_tv_adapter',
      adapterDisclaimer:
        'SIMULATION TV ADAPTER ONLY — Demonstrates alternating slot logic; does not access Smart TV hardware tuners or SCTE-35 signals.',
      requestedBreakDurationSeconds,
      safetyBufferSeconds,
      usableBreakSeconds,
      requestedSlotCount,
      k1ShortBreakRuleApplied: false,
      skipped: true,
      skipReason: `Break skipped safely: usable duration (${usableBreakSeconds}s = ${requestedBreakDurationSeconds}s - ${safetyBufferSeconds}s buffer) is below ${MIN_SPOT_SECONDS}s minimum spot.`,
      alternatingPointerStart,
      nextAlternatingPointer: alternatingPointerStart,
      slots: [],
      totalScheduledDurationSeconds: 0,
    };
  }

  const eligibleStatuses = new Set(['active', 'approved', 'scheduled']);

  const charityCampaigns = params.campaigns.filter(
    (c) => c.contentCategory === 'opportunity_promotion' && eligibleStatuses.has(c.status)
  );
  const liveOpportunities = params.opportunities.filter((o) => o.status === 'verified_live');
  const commercialCampaigns = params.campaigns.filter(
    (c) => c.contentCategory === 'commercial_advertising' && eligibleStatuses.has(c.status)
  );

  const findCreativeForCampaign = (cmp: CampaignRecord): AdCreativeRecord | null => {
    if (cmp.adCreativeRef) {
      const linked = params.creatives.find((cr) => cr.id === cmp.adCreativeRef);
      if (linked) return linked;
    }
    return params.creatives.find((cr) => cr.campaignId === cmp.id) ?? null;
  };

  let remainingSeconds = usableBreakSeconds;
  let charityIdx = 0;
  let oppIdx = 0;
  let commercialIdx = 0;
  let currentCategory: PrimaryAdCategory = alternatingPointerStart;
  const slots: ScheduledBreakSlot[] = [];

  for (let i = 1; i <= requestedSlotCount; i++) {
    if (remainingSeconds < MIN_SPOT_SECONDS) break;

    if (currentCategory === 'CHARITY') {
      const cmp = charityCampaigns[charityIdx];
      if (cmp) {
        charityIdx += 1;
        const cr = findCreativeForCampaign(cmp);
        const slotDur = Math.min(remainingSeconds, Math.max(MIN_SPOT_SECONDS, Math.min(20, cmp.durationSeconds)));
        slots.push({
          slotIndex: slots.length + 1,
          primaryCategory: 'CHARITY',
          source: 'direct_charity_free',
          campaignId: cmp.id,
          creativeId: cr?.id ?? null,
          opportunityId: null,
          title: cmp.title,
          durationSeconds: slotDur,
          qrToken: cmp.qrToken ?? cr?.qrToken ?? null,
          revenueStream: 'charity_free',
          estimatedValueUsd: 0,
          fillNote: '$0.00 / FREE CHARITY ADS campaign slot.',
          isMockBackfill: false,
        });
        remainingSeconds -= slotDur;
      } else if (liveOpportunities[oppIdx]) {
        const opp = liveOpportunities[oppIdx];
        oppIdx += 1;
        const slotDur = Math.min(remainingSeconds, 15);
        slots.push({
          slotIndex: slots.length + 1,
          primaryCategory: 'CHARITY',
          source: 'direct_charity_free',
          campaignId: opp.linkedCampaignId,
          creativeId: null,
          opportunityId: opp.id,
          title: `${opp.title} (${opp.providerName})`,
          durationSeconds: slotDur,
          qrToken: opp.qrToken,
          revenueStream: 'charity_free',
          estimatedValueUsd: 0,
          fillNote: '$0.00 / FREE verified_live Opportunity listing.',
          isMockBackfill: false,
        });
        remainingSeconds -= slotDur;
      } else {
        const slotDur = Math.min(remainingSeconds, 15);
        slots.push({
          slotIndex: slots.length + 1,
          primaryCategory: 'CHARITY',
          source: 'unfilled',
          campaignId: null,
          creativeId: null,
          opportunityId: null,
          title: 'Unfilled Charity / Opportunity Slot',
          durationSeconds: slotDur,
          qrToken: null,
          revenueStream: 'charity_free',
          estimatedValueUsd: 0,
          fillNote: 'No eligible active Charity campaign or verified_live opportunity available.',
          isMockBackfill: false,
        });
        remainingSeconds -= slotDur;
      }
    } else {
      // COMMERCIAL slot: Direct-Paid Commercial Priority first
      const directCmp = commercialCampaigns[commercialIdx];
      if (directCmp) {
        commercialIdx += 1;
        const cr = findCreativeForCampaign(directCmp);
        const slotDur = Math.min(
          remainingSeconds,
          Math.max(MIN_SPOT_SECONDS, Math.min(20, directCmp.durationSeconds))
        );
        slots.push({
          slotIndex: slots.length + 1,
          primaryCategory: 'COMMERCIAL',
          source: 'direct_commercial_paid',
          campaignId: directCmp.id,
          creativeId: cr?.id ?? null,
          opportunityId: null,
          title: directCmp.title,
          durationSeconds: slotDur,
          qrToken: directCmp.qrToken ?? cr?.qrToken ?? null,
          revenueStream: 'direct_commercial_paid',
          estimatedValueUsd: directCmp.simulatedEstimate.estimatedRatePerSpotUsd,
          fillNote: 'Direct-Paid Commercial Priority slot (simulated rate-card spot estimate).',
          isMockBackfill: false,
        });
        remainingSeconds -= slotDur;
      } else if (allowMockBackfill) {
        const fill = networkAdapter.requestCommercialBackfill({
          slotIndex: slots.length + 1,
          maxDurationSeconds: remainingSeconds,
        });
        if (fill.filled && fill.durationSeconds <= remainingSeconds) {
          slots.push({
            slotIndex: slots.length + 1,
            primaryCategory: 'COMMERCIAL',
            source: 'mock_ad_network_backfill',
            campaignId: null,
            creativeId: null,
            opportunityId: null,
            title: fill.creativeTitle,
            durationSeconds: fill.durationSeconds,
            qrToken: null,
            revenueStream: 'ad_network_estimated',
            estimatedValueUsd: fill.estimatedMockRevenueUsd,
            fillNote: fill.disclaimer,
            isMockBackfill: true,
          });
          remainingSeconds -= fill.durationSeconds;
        } else {
          break;
        }
      } else {
        const slotDur = Math.min(remainingSeconds, 15);
        slots.push({
          slotIndex: slots.length + 1,
          primaryCategory: 'COMMERCIAL',
          source: 'unfilled',
          campaignId: null,
          creativeId: null,
          opportunityId: null,
          title: 'Unfilled Commercial Slot (Backfill Disabled)',
          durationSeconds: slotDur,
          qrToken: null,
          revenueStream: null,
          estimatedValueUsd: 0,
          fillNote: 'Direct Commercial inventory exhausted and Mock Ad Network backfill disabled.',
          isMockBackfill: false,
        });
        remainingSeconds -= slotDur;
      }
    }

    currentCategory = currentCategory === 'CHARITY' ? 'COMMERCIAL' : 'CHARITY';
  }

  const totalScheduledDurationSeconds = slots.reduce((sum, s) => sum + s.durationSeconds, 0);
  const k1ShortBreakRuleApplied = slots.length === 1 && requestedSlotCount > 1;

  return {
    generatedAt: new Date().toISOString(),
    adapterId: 'simulation_tv_adapter',
    adapterDisclaimer:
      'SIMULATION TV ADAPTER ONLY — Demonstrates alternating CHARITY -> COMMERCIAL scheduling & Direct priority; not live Smart TV tuner switching.',
    requestedBreakDurationSeconds,
    safetyBufferSeconds,
    usableBreakSeconds,
    requestedSlotCount,
    k1ShortBreakRuleApplied,
    skipped: slots.length === 0,
    skipReason:
      slots.length === 0 ? 'No slots could be scheduled within usable break duration.' : null,
    alternatingPointerStart,
    nextAlternatingPointer: currentCategory,
    slots,
    totalScheduledDurationSeconds,
  };
}
