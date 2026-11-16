import { describe, expect, it } from 'vitest';
import {
  buildAdvertiserOpsOverview,
  computeCampaignPacingSnapshot,
  evaluateAdvertiserOnboardingReadiness,
  evaluateSupportTicketSla,
  generateProFormaInvoiceBlueprint,
  runAdvertiserOpsVerificationSuite,
} from '../src/server/advertiserOps.ts';
import type {
  AdvertiserProfile,
  CampaignRecord,
  QrLinkRecord,
  SupportTicketRecord,
} from '../src/types/edison.ts';

function makeProfile(overrides: Partial<AdvertiserProfile> = {}): AdvertiserProfile {
  return {
    userId: 'usr_adv_test',
    entityType: 'registered_business',
    businessOrTradingName: 'Aurora Energy Systems Ltd',
    registrationOrTaxId: 'GB-44129876',
    industryCategory: 'Clean Technology',
    countryCode: 'GB',
    cityRegion: 'Bristol',
    physicalAddress: '18 Harbourside Quay, Bristol BS1 4TR',
    primaryContactName: 'Claire Bennett',
    primaryContactEmail: 'claire@aurora.example',
    primaryContactPhone: '+44 117 555 0144',
    billingContactName: 'Finance Desk',
    billingContactEmail: 'finance@aurora.example',
    websiteUrl: 'https://aurora.example',
    verificationStatus: 'verified',
    verificationNotes: 'Verified business filing.',
    isPrototypeSeed: false,
    updatedAt: '2026-11-16T09:00:00.000Z',
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 'cmp_test_1',
    ownerId: 'usr_adv_test',
    title: 'Smart Thermostat Autumn Offer',
    contentCategory: 'commercial_advertising',
    summary: 'Commercial broadcast spot.',
    qrToken: 'aurora-qr',
    adCreativeRef: null,
    durationSeconds: 30,
    dailyFrequencyCap: 4,
    targetRegions: ['GB'],
    dayparts: ['primetime'],
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'active',
    rejectionReason: null,
    fixInstructions: null,
    simulatedEstimate: {
      model: 'simulated_cpm_flat_rate',
      currency: 'USD',
      estimatedSpots: 120,
      estimatedRatePerSpotUsd: 12.15,
      estimatedTotalUsd: 1458,
      paymentCollectionActive: false,
      disclaimer: 'Non-transactional simulation only.',
    },
    isPrototypeSeed: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

const activeQrLinks: QrLinkRecord[] = [
  {
    token: 'aurora-qr',
    ownerId: 'usr_adv_test',
    label: 'Aurora Landing',
    destinationType: 'website',
    rawInput: 'https://aurora.example/offer',
    resolvedUrl: 'https://aurora.example/offer',
    resolvedHost: 'aurora.example',
    scheme: 'https',
    status: 'active',
    redirectRequestsTotal: 0,
    redirectIssuedTotal: 0,
    suspectedBotRequests: 0,
    deduplicatedNonBotRedirects: 0,
    lastRedirectRequestedAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];

describe('Phase 7 Block 7.1 — Advertiser Operations, Pacing, SLA & Non-Transactional Pro-Forma Billing', () => {
  it('passes all 6 onboarding readiness gates for a verified advertiser and blocks incomplete/unverified profiles', () => {
    const ready = evaluateAdvertiserOnboardingReadiness(
      makeProfile(),
      [makeCampaign()],
      activeQrLinks
    );
    expect(ready.onboardingReady).toBe(true);
    expect(ready.commercialActivationAllowed).toBe(true);
    expect(ready.slaTier).toBe('verified_priority_12h');
    expect(ready.paymentCollectionActive).toBe(false);
    expect(ready.gates.noRealPaymentActivated).toBe(true);
    expect(ready.missingChecklist).toHaveLength(0);

    const incomplete = evaluateAdvertiserOnboardingReadiness(
      makeProfile({
        physicalAddress: '',
        registrationOrTaxId: '',
        verificationStatus: 'unverified',
      }),
      [],
      []
    );
    expect(incomplete.onboardingReady).toBe(false);
    expect(incomplete.commercialActivationAllowed).toBe(false);
    expect(incomplete.missingChecklist.length).toBeGreaterThanOrEqual(3);
  });

  it('generates SHA-256 non-transactional pro-forma blueprint with $0.00 actual cash and Charity permanent zero lock', () => {
    const commercial = makeCampaign();
    const charity = makeCampaign({
      id: 'cmp_charity_free',
      title: 'Youth Apprenticeships Intake',
      contentCategory: 'opportunity_promotion',
      simulatedEstimate: {
        model: 'charity_free_zero_cost',
        currency: 'USD',
        estimatedSpots: 60,
        estimatedRatePerSpotUsd: 99, // even if dirty seed data had non-zero, ops enforces $0.00
        estimatedTotalUsd: 999,
        paymentCollectionActive: false,
        disclaimer: 'Charity Free',
      },
    });

    const bp = generateProFormaInvoiceBlueprint(
      makeProfile(),
      [commercial, charity],
      '2026-11'
    );

    expect(bp.invoiceStatus).toBe('SIMULATED_PRO_FORMA_ONLY');
    expect(bp.paymentCollectionActive).toBe(false);
    expect(bp.realPaymentGatewayConnected).toBe(false);
    expect(bp.actualCashChargedUsd).toBe(0);
    expect(bp.charitySubtotalUsd).toBe(0);
    expect(bp.commercialSubtotalUsd).toBe(1458);
    expect(bp.blueprintSha256).toHaveLength(64);

    const charityRow = bp.lineItems.find((i) => i.campaignId === 'cmp_charity_free');
    expect(charityRow?.charityZeroCostLocked).toBe(true);
    expect(charityRow?.projectedAmountUsd).toBe(0);
    expect(charityRow?.billingClassification).toBe('CHARITY_PERMANENT_ZERO');
  });

  it('classifies commercial under-pacing vs unmetered Charity spots and flags breached SLA tickets', () => {
    const underPaced = computeCampaignPacingSnapshot(
      makeCampaign(),
      [],
      '2026-11-16T12:00:00.000Z'
    );
    expect(underPaced.pacingStatus).toBe('under_pacing');
    expect(underPaced.paymentCollectionActive).toBe(false);

    const charityPacing = computeCampaignPacingSnapshot(
      makeCampaign({
        id: 'cmp_ch',
        contentCategory: 'opportunity_promotion',
      }),
      [],
      '2026-11-16T12:00:00.000Z'
    );
    expect(charityPacing.pacingStatus).toBe('charity_free_unmetered');
    expect(charityPacing.projectedRateCardUsd).toBe(0);
    expect(charityPacing.charityZeroCostLocked).toBe(true);

    const tickets: SupportTicketRecord[] = [
      {
        id: 'tkt_1',
        ownerId: 'usr_adv_test',
        campaignId: 'cmp_test_1',
        category: 'qr_technical',
        subject: 'QR destination check',
        message: 'Urgent QR technical check',
        status: 'open',
        adminResponse: null,
        createdAt: '2026-11-16T05:00:00.000Z',
        updatedAt: '2026-11-16T05:00:00.000Z',
      },
      {
        id: 'tkt_2',
        ownerId: 'usr_adv_test',
        campaignId: null,
        category: 'campaign_review',
        subject: 'Review timing',
        message: 'Approaching 12h SLA',
        status: 'in_review',
        adminResponse: null,
        createdAt: '2026-11-16T02:30:00.000Z', // 9.5h / 12h >= 75%
        updatedAt: '2026-11-16T02:30:00.000Z',
      },
      {
        id: 'tkt_3',
        ownerId: 'usr_adv_test',
        campaignId: null,
        category: 'verification_enquiry',
        subject: 'Closed enquiry',
        message: 'Done',
        status: 'resolved',
        adminResponse: 'Completed',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T02:00:00.000Z',
      },
    ];

    const sla = evaluateSupportTicketSla(tickets, '2026-11-16T12:00:00.000Z');
    expect(sla.openTicketsCount).toBe(2);
    expect(sla.breachedSlaCount).toBe(1);
    expect(sla.approachingSlaCount).toBe(1);

    const overview = buildAdvertiserOpsOverview({
      profile: makeProfile(),
      campaigns: [makeCampaign()],
      qrLinks: activeQrLinks,
      tickets,
      analyticsEvents: [],
      referenceIso: '2026-11-16T12:00:00.000Z',
    });
    expect(overview.automatedOutreachBlocked).toBe(true);
    expect(overview.paymentCollectionActive).toBe(false);
    expect(overview.hardwareTested).toBe(false);
    expect(overview.stageP6Deferred).toBe(true);
  });

  it('passes all 8 deterministic Block 7.1 verification checks', () => {
    const report = runAdvertiserOpsVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.paymentCollectionActive).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });
});
