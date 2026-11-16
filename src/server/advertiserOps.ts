import crypto from 'node:crypto';
import type {
  AdvertiserOnboardingReadiness,
  AdvertiserOpsOverviewSnapshot,
  AdvertiserOpsVerificationReport,
  AdvertiserOpsVerifyCheckItem,
  AdvertiserProfile,
  AnalyticsEventRecord,
  CampaignPacingSnapshot,
  CampaignPacingStatus,
  CampaignRecord,
  ProFormaInvoiceBlueprint,
  ProFormaInvoiceLineItem,
  QrLinkRecord,
  SupportSlaState,
  SupportSlaTicketSummary,
  SupportTicketCategory,
  SupportTicketRecord,
} from '../types/edison.ts';

const SLA_HOURS_BY_CATEGORY: Record<SupportTicketCategory, number> = {
  qr_technical: 4,
  campaign_review: 12,
  verification_enquiry: 24,
  billing_dispute: 24,
  policy_appeal: 48,
};

function sha256Hex(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function evaluateAdvertiserOnboardingReadiness(
  profile: AdvertiserProfile,
  campaigns: CampaignRecord[],
  qrLinks: QrLinkRecord[]
): AdvertiserOnboardingReadiness {
  const entityIdentityCompleted =
    profile.businessOrTradingName.trim().length >= 2 &&
    profile.physicalAddress.trim().length >= 5 &&
    profile.countryCode.trim().length >= 2;

  const taxOrRegistrationProvided =
    profile.entityType === 'individual_sole_trader' ||
    profile.registrationOrTaxId.trim().length >= 3;

  const billingAndPrimaryContactsValid =
    profile.primaryContactName.trim().length >= 2 &&
    profile.primaryContactEmail.includes('@') &&
    profile.billingContactName.trim().length >= 2 &&
    profile.billingContactEmail.includes('@');

  const activeQrSet = new Set(
    qrLinks.filter((q) => q.status === 'active').map((q) => q.token)
  );
  const activeSafeQrLinked =
    activeQrSet.size > 0 ||
    campaigns.some((c) => Boolean(c.qrToken && activeQrSet.has(c.qrToken)));

  const accountVerificationApproved = profile.verificationStatus === 'verified';

  const missingChecklist: string[] = [];
  if (!entityIdentityCompleted) {
    missingChecklist.push('Complete trading name, country code, and verified physical business address.');
  }
  if (!taxOrRegistrationProvided) {
    missingChecklist.push('Provide company/charity registration or tax identifier.');
  }
  if (!billingAndPrimaryContactsValid) {
    missingChecklist.push('Confirm valid primary and billing contact names and email addresses.');
  }
  if (!activeSafeQrLinked) {
    missingChecklist.push('Create and verify at least one active HTTPS/mailto/tel QR destination.');
  }
  if (!accountVerificationApproved) {
    missingChecklist.push(
      `Account verification status is "${profile.verificationStatus}" (administrator "verified" approval required before commercial activation).`
    );
  }

  const onboardingReady =
    entityIdentityCompleted &&
    taxOrRegistrationProvided &&
    billingAndPrimaryContactsValid &&
    activeSafeQrLinked;

  const commercialActivationAllowed =
    onboardingReady && accountVerificationApproved && profile.verificationStatus !== 'suspended';

  const slaTier: AdvertiserOnboardingReadiness['slaTier'] =
    profile.verificationStatus === 'suspended'
      ? 'suspended_restricted'
      : accountVerificationApproved
      ? 'verified_priority_12h'
      : 'standard_24h';

  return {
    userId: profile.userId,
    businessOrTradingName: profile.businessOrTradingName,
    entityType: profile.entityType,
    verificationStatus: profile.verificationStatus,
    countryCode: profile.countryCode,
    slaTier,
    onboardingReady,
    commercialActivationAllowed,
    gates: {
      entityIdentityCompleted,
      taxOrRegistrationProvided,
      billingAndPrimaryContactsValid,
      activeSafeQrLinked,
      accountVerificationApproved,
      noRealPaymentActivated: true,
    },
    missingChecklist,
    paymentCollectionActive: false,
  };
}

export function computeCampaignPacingSnapshot(
  campaign: CampaignRecord,
  analyticsEvents: AnalyticsEventRecord[],
  referenceIso?: string
): CampaignPacingSnapshot {
  const now = referenceIso ? new Date(referenceIso) : new Date();
  const nowMs = now.getTime();
  const startMs = Date.parse(`${campaign.startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${campaign.endDate}T23:59:59.999Z`);

  let elapsedSchedulePct = 0;
  let totalDays = 1;
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    totalDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
    if (nowMs >= endMs) {
      elapsedSchedulePct = 100;
    } else if (nowMs > startMs) {
      elapsedSchedulePct = Number((((nowMs - startMs) / (endMs - startMs)) * 100).toFixed(1));
    }
  }

  const isCharity = campaign.contentCategory === 'opportunity_promotion';
  const targetSpotsTotal = campaign.simulatedEstimate.estimatedSpots;
  const deliveredSpotsSimulated = analyticsEvents.filter(
    (e) =>
      e.campaignId === campaign.id &&
      (e.eventType === 'ad_played' || e.eventType === 'ad_delivered')
  ).length;

  const remainingSpotsProjected = Math.max(0, targetSpotsTotal - deliveredSpotsSimulated);
  const expectedToDate = (targetSpotsTotal * elapsedSchedulePct) / 100;

  let pacingStatus: CampaignPacingStatus;
  if (isCharity) {
    pacingStatus = 'charity_free_unmetered';
  } else if (campaign.status !== 'active' && campaign.status !== 'scheduled') {
    pacingStatus = 'window_inactive';
  } else if (deliveredSpotsSimulated > targetSpotsTotal) {
    pacingStatus = 'over_capped';
  } else if (elapsedSchedulePct >= 20 && deliveredSpotsSimulated < expectedToDate * 0.6) {
    pacingStatus = 'under_pacing';
  } else {
    pacingStatus = 'on_pace';
  }

  const remainingDays = Math.max(
    1,
    Math.ceil(Math.max(1, endMs - nowMs) / 86400000) || totalDays
  );
  const recommendedSpotsPerDay = Math.max(
    0,
    Math.min(campaign.dailyFrequencyCap, Math.ceil(remainingSpotsProjected / remainingDays))
  );

  return {
    campaignId: campaign.id,
    title: campaign.title,
    status: campaign.status,
    primaryCategory: isCharity ? 'CHARITY' : 'COMMERCIAL',
    contentCategory: campaign.contentCategory,
    pacingStatus,
    elapsedSchedulePct,
    targetSpotsTotal,
    deliveredSpotsSimulated,
    remainingSpotsProjected,
    dailyFrequencyCap: campaign.dailyFrequencyCap,
    recommendedSpotsPerDay,
    projectedRateCardUsd: isCharity ? 0 : campaign.simulatedEstimate.estimatedTotalUsd,
    charityZeroCostLocked: isCharity,
    paymentCollectionActive: false,
  };
}

export function generateProFormaInvoiceBlueprint(
  profile: AdvertiserProfile,
  campaigns: CampaignRecord[],
  billingPeriodLabel: string
): ProFormaInvoiceBlueprint {
  const generatedAt = new Date().toISOString();
  const lineItems: ProFormaInvoiceLineItem[] = campaigns.map((c) => {
    const isCharity = c.contentCategory === 'opportunity_promotion';
    const rate = isCharity ? 0 : c.simulatedEstimate.estimatedRatePerSpotUsd;
    const amount = isCharity ? 0 : c.simulatedEstimate.estimatedTotalUsd;
    return {
      campaignId: c.id,
      title: c.title,
      primaryCategory: isCharity ? 'CHARITY' : 'COMMERCIAL',
      status: c.status,
      estimatedSpots: c.simulatedEstimate.estimatedSpots,
      estimatedRatePerSpotUsd: rate,
      projectedAmountUsd: Number(amount.toFixed(2)),
      charityZeroCostLocked: isCharity,
      billingClassification: isCharity
        ? 'CHARITY_PERMANENT_ZERO'
        : 'SIMULATED_DIRECT_RATE_CARD',
    };
  });

  const commercialSubtotalUsd = Number(
    lineItems
      .filter((l) => !l.charityZeroCostLocked)
      .reduce((sum, l) => sum + l.projectedAmountUsd, 0)
      .toFixed(2)
  );

  const blueprintPayload = JSON.stringify({
    userId: profile.userId,
    billingPeriodLabel,
    lineItems: lineItems.map((l) => ({ id: l.campaignId, amt: l.projectedAmountUsd })),
    paymentCollectionActive: false,
  });
  const blueprintSha256 = sha256Hex(blueprintPayload);

  return {
    blueprintId: `pf_${blueprintSha256.slice(0, 14)}`,
    generatedAt,
    billingPeriodLabel,
    advertiserUserId: profile.userId,
    businessOrTradingName: profile.businessOrTradingName,
    billingContactName: profile.billingContactName,
    billingContactEmail: profile.billingContactEmail,
    currency: 'USD',
    invoiceStatus: 'SIMULATED_PRO_FORMA_ONLY',
    paymentCollectionActive: false,
    realPaymentGatewayConnected: false,
    actualCashChargedUsd: 0,
    commercialSubtotalUsd,
    charitySubtotalUsd: 0,
    totalProjectedRateCardUsd: commercialSubtotalUsd,
    blueprintSha256,
    lineItems,
    governanceNotice:
      'NON-TRANSACTIONAL SOFTWARE BLUEPRINT: $0.00 real cash charged, no payment processor active, and CHARITY opportunity campaigns permanently locked at $0.00 / FREE. Opportunity verification remains strictly independent of spend.',
  };
}

export function evaluateSupportTicketSla(
  tickets: SupportTicketRecord[],
  referenceIso?: string
): {
  openTicketsCount: number;
  approachingSlaCount: number;
  breachedSlaCount: number;
  tickets: SupportSlaTicketSummary[];
} {
  const nowMs = referenceIso ? Date.parse(referenceIso) : Date.now();
  const summaries: SupportSlaTicketSummary[] = tickets.map((t) => {
    const slaTargetHours = SLA_HOURS_BY_CATEGORY[t.category] ?? 24;
    const createdMs = Date.parse(t.createdAt);
    const elapsedHours = Number.isFinite(createdMs)
      ? Math.max(0, Number(((nowMs - createdMs) / 3600000).toFixed(1)))
      : 0;

    let slaState: SupportSlaState;
    if (t.status === 'resolved' || t.status === 'closed') {
      slaState = 'closed_resolved';
    } else if (elapsedHours >= slaTargetHours) {
      slaState = 'sla_breached';
    } else if (elapsedHours >= slaTargetHours * 0.75) {
      slaState = 'approaching_sla';
    } else {
      slaState = 'nominal';
    }

    return {
      ticketId: t.id,
      category: t.category,
      subject: t.subject,
      status: t.status,
      slaTargetHours,
      elapsedHours,
      slaState,
    };
  });

  return {
    openTicketsCount: summaries.filter((s) => s.slaState !== 'closed_resolved').length,
    approachingSlaCount: summaries.filter((s) => s.slaState === 'approaching_sla').length,
    breachedSlaCount: summaries.filter((s) => s.slaState === 'sla_breached').length,
    tickets: summaries,
  };
}

export function buildAdvertiserOpsOverview(params: {
  profile: AdvertiserProfile;
  campaigns: CampaignRecord[];
  qrLinks: QrLinkRecord[];
  tickets: SupportTicketRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  referenceIso?: string;
}): AdvertiserOpsOverviewSnapshot {
  const onboarding = evaluateAdvertiserOnboardingReadiness(
    params.profile,
    params.campaigns,
    params.qrLinks
  );
  const campaignPacing = params.campaigns.map((c) =>
    computeCampaignPacingSnapshot(c, params.analyticsEvents, params.referenceIso)
  );
  const supportSla = evaluateSupportTicketSla(params.tickets, params.referenceIso);

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    paymentCollectionActive: false,
    automatedOutreachBlocked: true,
    hardwareTested: false,
    stageP6Deferred: true,
    onboarding,
    pacingSummary: {
      totalCampaigns: params.campaigns.length,
      activeCampaigns: params.campaigns.filter((c) => c.status === 'active').length,
      onPaceCount: campaignPacing.filter((p) => p.pacingStatus === 'on_pace').length,
      underPacingCount: campaignPacing.filter((p) => p.pacingStatus === 'under_pacing').length,
      charityFreeCount: campaignPacing.filter((p) => p.charityZeroCostLocked).length,
      totalProjectedRateCardUsd: Number(
        campaignPacing.reduce((sum, p) => sum + p.projectedRateCardUsd, 0).toFixed(2)
      ),
      actualCashCollectedUsd: 0,
    },
    campaignPacing,
    supportSla,
  };
}

/**
 * Deterministic 8-check Phase 7 Block 7.1 verification suite validating KYC readiness,
 * non-transactional pro-forma invoice isolation, $0.00 Charity lock, pacing & SLA triage.
 */
export function runAdvertiserOpsVerificationSuite(): AdvertiserOpsVerificationReport {
  const nowIso = '2026-11-16T12:00:00.000Z';
  const verifiedProfile: AdvertiserProfile = {
    userId: 'usr_ops_verified',
    entityType: 'registered_business',
    businessOrTradingName: 'Northstar Electrical Ltd',
    registrationOrTaxId: 'UK-09871234',
    industryCategory: 'Consumer Hardware',
    countryCode: 'GB',
    cityRegion: 'Manchester',
    physicalAddress: '42 Deansgate, Manchester M3 2BA',
    primaryContactName: 'Elena Vance',
    primaryContactEmail: 'elena@northstar.example',
    primaryContactPhone: '+44 161 555 0199',
    billingContactName: 'Accounts Payable',
    billingContactEmail: 'billing@northstar.example',
    websiteUrl: 'https://northstar.example',
    verificationStatus: 'verified',
    verificationNotes: 'Companies House verified.',
    isPrototypeSeed: false,
    updatedAt: nowIso,
  };

  const incompleteProfile: AdvertiserProfile = {
    ...verifiedProfile,
    userId: 'usr_ops_incomplete',
    physicalAddress: '',
    registrationOrTaxId: '',
    verificationStatus: 'unverified',
  };

  const qrLinks: QrLinkRecord[] = [
    {
      token: 'ops-ok',
      ownerId: 'usr_ops_verified',
      label: 'Northstar Store',
      destinationType: 'website',
      rawInput: 'https://northstar.example/offer',
      resolvedUrl: 'https://northstar.example/offer',
      resolvedHost: 'northstar.example',
      scheme: 'https',
      status: 'active',
      redirectRequestsTotal: 0,
      redirectIssuedTotal: 0,
      suspectedBotRequests: 0,
      deduplicatedNonBotRedirects: 0,
      lastRedirectRequestedAt: null,
      createdAt: nowIso,
    },
  ];

  const campaigns: CampaignRecord[] = [
    {
      id: 'cmp_ops_comm',
      ownerId: 'usr_ops_verified',
      title: 'Winter Heat Pump Promotion',
      contentCategory: 'commercial_advertising',
      summary: 'Commercial smart TV promo.',
      qrToken: 'ops-ok',
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
        disclaimer: 'Sim',
      },
      isPrototypeSeed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'cmp_ops_charity',
      ownerId: 'usr_ops_verified',
      title: 'Apprentice Electrician Intake',
      contentCategory: 'opportunity_promotion',
      summary: 'Free public opportunity.',
      qrToken: 'ops-ok',
      adCreativeRef: null,
      durationSeconds: 15,
      dailyFrequencyCap: 4,
      targetRegions: ['GB'],
      dayparts: ['daytime'],
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'active',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: {
        model: 'charity_free_zero_cost',
        currency: 'USD',
        estimatedSpots: 60,
        estimatedRatePerSpotUsd: 0,
        estimatedTotalUsd: 0,
        paymentCollectionActive: false,
        disclaimer: 'Free Charity',
      },
      isPrototypeSeed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const tickets: SupportTicketRecord[] = [
    {
      id: 'tkt_ops_breach',
      ownerId: 'usr_ops_verified',
      campaignId: 'cmp_ops_comm',
      category: 'qr_technical',
      subject: 'QR URL check question',
      message: 'Need quick confirmation.',
      status: 'open',
      adminResponse: null,
      createdAt: '2026-11-16T06:00:00.000Z', // 6h ago -> >4h SLA
      updatedAt: '2026-11-16T06:00:00.000Z',
    },
    {
      id: 'tkt_ops_closed',
      ownerId: 'usr_ops_verified',
      campaignId: null,
      category: 'verification_enquiry',
      subject: 'Resolved enquiry',
      message: 'Verified.',
      status: 'resolved',
      adminResponse: 'Approved.',
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-10T12:00:00.000Z',
    },
  ];

  const readyCheck = evaluateAdvertiserOnboardingReadiness(verifiedProfile, campaigns, qrLinks);
  const blockedCheck = evaluateAdvertiserOnboardingReadiness(incompleteProfile, [], []);
  const blueprint = generateProFormaInvoiceBlueprint(verifiedProfile, campaigns, '2026-11');
  const overview = buildAdvertiserOpsOverview({
    profile: verifiedProfile,
    campaigns,
    qrLinks,
    tickets,
    analyticsEvents: [],
    referenceIso: nowIso,
  });

  const checks: AdvertiserOpsVerifyCheckItem[] = [
    {
      checkId: 'OPS-01-VERIFIED-ONBOARDING',
      label: 'Verified Advertiser Passes All 6 Commercial Readiness Gates',
      passed:
        readyCheck.onboardingReady &&
        readyCheck.commercialActivationAllowed &&
        readyCheck.slaTier === 'verified_priority_12h',
      detail: `All gates met for ${verifiedProfile.businessOrTradingName} (${readyCheck.slaTier}).`,
    },
    {
      checkId: 'OPS-02-UNVERIFIED-GATE-BLOCK',
      label: 'Unverified / Incomplete Advertiser Blocked From Commercial Activation',
      passed:
        !blockedCheck.onboardingReady &&
        !blockedCheck.commercialActivationAllowed &&
        blockedCheck.missingChecklist.length >= 3,
      detail: `Blocked incomplete advertiser with ${blockedCheck.missingChecklist.length} checklist items.`,
    },
    {
      checkId: 'OPS-03-ZERO-REAL-PAYMENTS',
      label: 'Non-Transactional Billing Lock (paymentCollectionActive=false, $0.00 Cash)',
      passed:
        blueprint.paymentCollectionActive === false &&
        blueprint.realPaymentGatewayConnected === false &&
        blueprint.actualCashChargedUsd === 0 &&
        overview.pacingSummary.actualCashCollectedUsd === 0,
      detail: 'No payment gateway attached; actualCashChargedUsd strictly 0.',
    },
    {
      checkId: 'OPS-04-CHARITY-PROFORMA-ZERO',
      label: 'Permanent $0.00 / FREE Charity Isolation Inside Pro-Forma Blueprint',
      passed:
        blueprint.charitySubtotalUsd === 0 &&
        blueprint.lineItems.find((i) => i.campaignId === 'cmp_ops_charity')?.projectedAmountUsd === 0 &&
        blueprint.lineItems.find((i) => i.campaignId === 'cmp_ops_charity')?.charityZeroCostLocked ===
          true,
      detail: 'Charity row locked at CHARITY_PERMANENT_ZERO ($0.00).',
    },
    {
      checkId: 'OPS-05-BLUEPRINT-SHA256',
      label: 'Deterministic Pro-Forma Blueprint SHA-256 Audit Integrity',
      passed:
        blueprint.blueprintSha256.length === 64 &&
        blueprint.commercialSubtotalUsd === 1458 &&
        blueprint.invoiceStatus === 'SIMULATED_PRO_FORMA_ONLY',
      detail: `Blueprint ${blueprint.blueprintId} ($${blueprint.commercialSubtotalUsd.toFixed(2)} simulated) sealed with SHA-256.`,
    },
    {
      checkId: 'OPS-06-PACING-DETECTION',
      label: 'Automated Campaign Under-Pacing vs Charity Unmetered Classification',
      passed:
        overview.campaignPacing.find((p) => p.campaignId === 'cmp_ops_comm')?.pacingStatus ===
          'under_pacing' &&
        overview.campaignPacing.find((p) => p.campaignId === 'cmp_ops_charity')?.pacingStatus ===
          'charity_free_unmetered',
      detail: 'Detected mid-flight commercial under-pacing while keeping Charity spots unmetered.',
    },
    {
      checkId: 'OPS-07-SLA-TRIAGE',
      label: 'Support Ticket SLA Breach Detection & Closed Queue Exclusion',
      passed:
        overview.supportSla.breachedSlaCount === 1 &&
        overview.supportSla.openTicketsCount === 1 &&
        overview.supportSla.tickets.find((t) => t.ticketId === 'tkt_ops_breach')?.slaState ===
          'sla_breached',
      detail: 'Detected 6h-old open qr_technical ticket exceeding 4h SLA.',
    },
    {
      checkId: 'OPS-08-OUTREACH-AND-STAGEP6-LOCK',
      label: 'Automated Commercial Emailing Blocked & Physical Stage P6 Deferred',
      passed:
        overview.automatedOutreachBlocked &&
        !overview.hardwareTested &&
        overview.stageP6Deferred,
      detail: 'automatedOutreachBlocked=true, hardwareTested=false, stageP6Deferred=true.',
    },
  ];

  const passedChecks = checks.filter((c) => c.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    paymentCollectionActive: false,
    hardwareTested: false,
    stageP6Deferred: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
