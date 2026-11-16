import crypto from 'node:crypto';
import type {
  CampaignRecord,
  OpportunityAppealRecord,
  OpportunityComplaintRecord,
  OpportunityEvidenceTierKey,
  OpportunityOpsOverview,
  OpportunityOpsSlaItem,
  OpportunityOpsVerificationReport,
  OpportunityOpsVerifyCheckItem,
  OpportunityRecord,
  OpportunityTierStatus,
  OpportunityVaultSealRecord,
  OpportunityVerificationAssessment,
  PublicUser,
} from '../types/edison.ts';

const TIER_1_REVERIFY_DAYS = 180;
const TIER_2_REVERIFY_DAYS = 365;
const TIER_3_REVERIFY_DAYS = 90;

const CRITICAL_COMPLAINT_SLA_HOURS = 4;
const STANDARD_COMPLAINT_SLA_HOURS = 24;
const APPEAL_SLA_HOURS = 48;

const OPS_RISK_RULES: { pattern: RegExp; label: string }[] = [
  {
    pattern: /\b(pay\s+to\s+apply|application\s+fee|processing\s+fee|registration\s+fee|uniform\s+deposit|admin\s+fee\s+required)\b/i,
    label: 'Potential upfront applicant fee demand detected',
  },
  {
    pattern: /\b(guaranteed\s+(job|employment|placement|scholarship|funding|grant)|100%\s+job\s+guarantee)\b/i,
    label: 'Prohibited outcome guarantee claim detected',
  },
  {
    pattern: /\b(wire\s+transfer\s+before|advance\s+payment\s+required)\b/i,
    label: 'Suspicious advance-payment instruction detected',
  },
];

export function scanOpportunityOpsRiskPhrases(fields: string[]): string[] {
  const combined = fields.join(' \n ');
  const flags: string[] = [];
  for (const rule of OPS_RISK_RULES) {
    if (rule.pattern.test(combined)) {
      flags.push(rule.label);
    }
  }
  return flags;
}

export function redactEvidenceRef(rawRef: string): string {
  const trimmed = rawRef.trim();
  if (!trimmed) return '[UNSUBMITTED]';
  if (trimmed.length <= 6) {
    return `${trimmed.slice(0, 2)}***`;
  }
  const head = trimmed.slice(0, 4);
  const tail = trimmed.slice(-4);
  return `${head}••••${tail}`;
}

export function computeVaultSealSha256(params: {
  opportunityId: string;
  ownerId: string;
  tier: OpportunityEvidenceTierKey;
  evidenceRef: string;
}): string {
  const normalized = [
    params.opportunityId.trim(),
    params.ownerId.trim(),
    params.tier,
    params.evidenceRef.trim(),
  ].join('|');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function daysSinceIso(isoTimestamp: string | null, nowMs: number): number | null {
  if (!isoTimestamp) return null;
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return null;
  return (nowMs - parsed) / (1000 * 60 * 60 * 24);
}

function buildVaultSeal(params: {
  opportunity: OpportunityRecord;
  tier: OpportunityEvidenceTierKey;
  tierStatus: OpportunityTierStatus;
  verifiedAt: string | null;
  evidenceRef: string;
  staleDaysThreshold: number;
  nowMs: number;
}): OpportunityVaultSealRecord {
  const ageDays = daysSinceIso(params.verifiedAt, params.nowMs);
  const stale =
    params.tierStatus === 'verified' &&
    ageDays !== null &&
    ageDays > params.staleDaysThreshold;

  return {
    opportunityId: params.opportunity.id,
    tier: params.tier,
    tierStatus: params.tierStatus,
    verifiedAt: params.verifiedAt,
    redactedRef: redactEvidenceRef(params.evidenceRef),
    vaultSealSha256: computeVaultSealSha256({
      opportunityId: params.opportunity.id,
      ownerId: params.opportunity.ownerId,
      tier: params.tier,
      evidenceRef: params.evidenceRef,
    }),
    encryptionEnvelope: {
      algorithm: 'AES-256-GCM',
      keyAlias: 'edison-opp-vault-v1',
      sealedInSoftwareBlueprint: true,
    },
    staleOrExpired: stale,
  };
}

export function evaluateOpportunityVerificationOps(params: {
  opportunity: OpportunityRecord;
  complaints: OpportunityComplaintRecord[];
  linkedCampaign?: CampaignRecord | null;
  nowMs?: number;
}): OpportunityVerificationAssessment {
  const nowMs = params.nowMs ?? Date.now();
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const opp = params.opportunity;
  const t = opp.verificationTiers;

  const expiredByDate =
    opp.status === 'expired' || opp.closingDate < today || opp.expiryDate < today;

  const reverificationReasons: string[] = [];

  const tier1Seal = buildVaultSeal({
    opportunity: opp,
    tier: 'tier1_identity',
    tierStatus: t.identityStatus,
    verifiedAt: t.identityVerifiedAt,
    evidenceRef: t.identityEvidenceRef,
    staleDaysThreshold: TIER_1_REVERIFY_DAYS,
    nowMs,
  });
  if (tier1Seal.staleOrExpired) {
    reverificationReasons.push(`Tier 1 identity verification exceeded ${TIER_1_REVERIFY_DAYS}-day validity window.`);
  }

  const tier2Seal = buildVaultSeal({
    opportunity: opp,
    tier: 'tier2_organisation',
    tierStatus: t.organisationStatus,
    verifiedAt: t.organisationVerifiedAt,
    evidenceRef: t.organisationEvidenceRef,
    staleDaysThreshold: TIER_2_REVERIFY_DAYS,
    nowMs,
  });
  if (opp.providerType === 'registered_organisation' && tier2Seal.staleOrExpired) {
    reverificationReasons.push(`Tier 2 organisation check exceeded ${TIER_2_REVERIFY_DAYS}-day renewal cadence.`);
  }

  const tier3Seal = buildVaultSeal({
    opportunity: opp,
    tier: 'tier3_specific_opportunity',
    tierStatus: t.specificOpportunityStatus,
    verifiedAt: t.specificOpportunityVerifiedAt,
    evidenceRef: t.specificOpportunityEvidenceRef,
    staleDaysThreshold: TIER_3_REVERIFY_DAYS,
    nowMs,
  });
  if (tier3Seal.staleOrExpired) {
    reverificationReasons.push(`Tier 3 specific vacancy verification exceeded ${TIER_3_REVERIFY_DAYS}-day currency window.`);
  }

  const reverificationRequired = reverificationReasons.length > 0;

  // Strict Non-Transitivity:
  // Organisation verified (`Tier 2 === 'verified'`) NEVER implies `specificOpportunityStatus === 'verified'`,
  // and `verified_live` cannot hold if Tier 1 or Tier 3 (or Tier 2 for registered_organisation) isn't independently verified.
  const requiredTiersVerified =
    t.identityStatus === 'verified' &&
    (opp.providerType === 'individual_informal_employer'
      ? t.organisationStatus === 'not_applicable'
      : t.organisationStatus === 'verified') &&
    t.specificOpportunityStatus === 'verified';

  const nonTransitivityViolated =
    (opp.status === 'verified_live' && !requiredTiersVerified) ||
    (opp.providerType === 'registered_organisation' &&
      t.organisationStatus === 'verified' &&
      t.specificOpportunityStatus === 'verified' &&
      (!t.specificOpportunityEvidenceRef.trim() || !t.specificOpportunityVerifiedAt));

  const nonTransitivityVerified = !nonTransitivityViolated;

  // Strict Financial Independence:
  // Advertising payments never authorise verification, and linked Charity campaigns remain $0.00 / FREE.
  const linkedPaidViolation =
    Boolean(params.linkedCampaign) &&
    params.linkedCampaign!.contentCategory === 'opportunity_promotion' &&
    params.linkedCampaign!.simulatedEstimate.estimatedTotalUsd > 0;
  const feeIndependenceVerified =
    opp.advertisingFeeInfluencesVerification === false &&
    opp.applicationFeeFreeConfirmed === true &&
    !linkedPaidViolation;

  const riskFlags = [
    ...opp.scamRiskFlags,
    ...scanOpportunityOpsRiskPhrases([
      opp.title,
      opp.description,
      opp.eligibilityRequirements,
      opp.applicationMethod,
    ]),
  ];
  const uniqueRiskFlags = Array.from(new Set(riskFlags));

  const relatedOpenComplaints = params.complaints.filter(
    (c) =>
      c.opportunityId === opp.id &&
      (c.status === 'reported' || c.status === 'under_investigation')
  );
  const criticalComplaintsCount = relatedOpenComplaints.filter(
    (c) =>
      c.reasonCategory === 'upfront_fee_scam' ||
      c.reasonCategory === 'misleading_guarantee'
  ).length;

  const recommendImmediateSuspension =
    (criticalComplaintsCount >= 1 ||
      relatedOpenComplaints.length >= 2 ||
      uniqueRiskFlags.length > 0) &&
    opp.status !== 'suspended' &&
    opp.status !== 'revoked' &&
    opp.status !== 'rejected';

  const eligibleForTvSchedule =
    opp.status === 'verified_live' &&
    !expiredByDate &&
    !reverificationRequired &&
    nonTransitivityVerified &&
    feeIndependenceVerified &&
    uniqueRiskFlags.length === 0 &&
    !recommendImmediateSuspension;

  return {
    opportunityId: opp.id,
    title: opp.title,
    providerType: opp.providerType,
    status: opp.status,
    closingDate: opp.closingDate,
    expiryDate: opp.expiryDate,
    eligibleForTvSchedule,
    expiredByDate,
    reverificationRequired,
    reverificationReasons,
    feeIndependenceVerified,
    nonTransitivityVerified,
    riskFlags: uniqueRiskFlags,
    vaultSeals: [tier1Seal, tier2Seal, tier3Seal],
    openComplaintsCount: relatedOpenComplaints.length,
    criticalComplaintsCount,
    recommendImmediateSuspension,
  };
}

export function buildOpportunityOpsOverview(params: {
  actor: PublicUser;
  opportunities: OpportunityRecord[];
  complaints: OpportunityComplaintRecord[];
  appeals: OpportunityAppealRecord[];
  campaigns?: CampaignRecord[];
  nowMs?: number;
}): OpportunityOpsOverview {
  const nowMs = params.nowMs ?? Date.now();
  const isAdmin = params.actor.role === 'admin';

  const visibleOpportunities = isAdmin
    ? params.opportunities
    : params.opportunities.filter((o) => o.ownerId === params.actor.id);
  const visibleOppIds = new Set(visibleOpportunities.map((o) => o.id));

  const visibleComplaints = isAdmin
    ? params.complaints
    : params.complaints.filter(
        (c) => c.reporterId === params.actor.id || visibleOppIds.has(c.opportunityId)
      );

  const visibleAppeals = isAdmin
    ? params.appeals
    : params.appeals.filter((a) => a.ownerId === params.actor.id);

  const campaignById = new Map<string, CampaignRecord>();
  for (const c of params.campaigns ?? []) {
    campaignById.set(c.id, c);
  }

  const assessments = visibleOpportunities.map((opp) =>
    evaluateOpportunityVerificationOps({
      opportunity: opp,
      complaints: params.complaints,
      linkedCampaign: opp.linkedCampaignId ? campaignById.get(opp.linkedCampaignId) ?? null : null,
      nowMs,
    })
  );

  const slaItems: OpportunityOpsSlaItem[] = [];

  for (const c of visibleComplaints) {
    const isOpen = c.status === 'reported' || c.status === 'under_investigation';
    const isCritical =
      c.reasonCategory === 'upfront_fee_scam' ||
      c.reasonCategory === 'misleading_guarantee';
    const targetHours = isCritical ? CRITICAL_COMPLAINT_SLA_HOURS : STANDARD_COMPLAINT_SLA_HOURS;
    const createdMs = Date.parse(c.createdAt);
    const elapsedHours = Number.isFinite(createdMs)
      ? Math.max(0, Number(((nowMs - createdMs) / (1000 * 60 * 60)).toFixed(1)))
      : 0;
    slaItems.push({
      itemType: 'complaint',
      id: c.id,
      opportunityId: c.opportunityId,
      status: c.status,
      categoryOrReason: c.reasonCategory,
      slaHoursTarget: targetHours,
      elapsedHours,
      slaBreached: isOpen && elapsedHours > targetHours,
      createdAt: c.createdAt,
    });
  }

  for (const a of visibleAppeals) {
    const isOpen = a.status === 'submitted' || a.status === 'under_review';
    const createdMs = Date.parse(a.createdAt);
    const elapsedHours = Number.isFinite(createdMs)
      ? Math.max(0, Number(((nowMs - createdMs) / (1000 * 60 * 60)).toFixed(1)))
      : 0;
    slaItems.push({
      itemType: 'appeal',
      id: a.id,
      opportunityId: a.opportunityId,
      status: a.status,
      categoryOrReason: a.reason.slice(0, 64),
      slaHoursTarget: APPEAL_SLA_HOURS,
      elapsedHours,
      slaBreached: isOpen && elapsedHours > APPEAL_SLA_HOURS,
      createdAt: a.createdAt,
    });
  }

  slaItems.sort((a, b) => Number(b.slaBreached) - Number(a.slaBreached) || b.elapsedHours - a.elapsedHours);

  const openComplaints = slaItems.filter(
    (s) => s.itemType === 'complaint' && (s.status === 'reported' || s.status === 'under_investigation')
  );
  const openAppeals = slaItems.filter(
    (s) => s.itemType === 'appeal' && (s.status === 'submitted' || s.status === 'under_review')
  );

  return {
    generatedAt: new Date(nowMs).toISOString(),
    isSoftwareSimulationOnly: true,
    externalKycVendorConnected: false,
    hardwareTested: false,
    stageP6Deferred: true,
    automatedOutreachBlocked: true,
    advertisingFeeInfluencesVerification: false,
    summary: {
      totalEvaluated: assessments.length,
      verifiedLiveCount: assessments.filter((a) => a.status === 'verified_live').length,
      eligibleForTvCount: assessments.filter((a) => a.eligibleForTvSchedule).length,
      reverificationRequiredCount: assessments.filter((a) => a.reverificationRequired).length,
      expiredCount: assessments.filter((a) => a.expiredByDate).length,
      feeIndependenceViolations: assessments.filter((a) => !a.feeIndependenceVerified).length,
      nonTransitivityViolations: assessments.filter((a) => !a.nonTransitivityVerified).length,
      openComplaintsCount: openComplaints.length,
      slaBreachedComplaintsCount: openComplaints.filter((s) => s.slaBreached).length,
      openAppealsCount: openAppeals.length,
      slaBreachedAppealsCount: openAppeals.filter((s) => s.slaBreached).length,
      immediateSuspensionRecommendedCount: assessments.filter((a) => a.recommendImmediateSuspension).length,
    },
    assessments,
    slaItems,
  };
}

export function runOpportunityOpsVerificationSuite(): OpportunityOpsVerificationReport {
  const fixedNowMs = Date.parse('2026-11-16T12:00:00.000Z');
  const futureDate = '2027-01-15';
  const pastDate = '2026-01-01';

  const makeBaseOpp = (overrides: Partial<OpportunityRecord>): OpportunityRecord => ({
    id: 'opp_test_base',
    ownerId: 'usr_emp_01',
    providerType: 'registered_organisation',
    providerName: 'Harare Civic Skills Trust',
    category: 'apprenticeship',
    title: 'Solar Maintenance Apprenticeship',
    description: 'Accredited 12-month technical solar installation apprenticeship with free application.',
    location: 'Harare, Zimbabwe',
    eligibilityRequirements: 'Aged 18+ with secondary school certificate.',
    applicationMethod: 'Apply online free via QR code portal.',
    contactInfo: 'jobs@hararecivic.demo',
    qrToken: 'qr_opp_01',
    linkedCampaignId: null,
    closingDate: futureDate,
    expiryDate: futureDate,
    status: 'verified_live',
    verificationTiers: {
      identityStatus: 'verified',
      identityEvidenceRef: 'ZW-NAT-ID-884210',
      identityNotes: 'Confirmed submitter photo ID match',
      identityVerifiedAt: '2026-11-01T10:00:00.000Z',
      organisationStatus: 'verified',
      organisationEvidenceRef: 'ZW-TRUST-REG-9041',
      organisationNotes: 'Active charity trust deed confirmed',
      organisationVerifiedAt: '2026-11-01T10:05:00.000Z',
      specificOpportunityStatus: 'verified',
      specificOpportunityEvidenceRef: 'SIGNED-LETTERHEAD-SOLAR-2026',
      specificOpportunityNotes: 'Official signed vacancy notice',
      specificOpportunityVerifiedAt: '2026-11-02T09:00:00.000Z',
    },
    scamRiskFlags: [],
    applicationFeeFreeConfirmed: true,
    noGuaranteeConfirmed: true,
    advertisingFeeInfluencesVerification: false,
    rejectionReason: null,
    suspensionReason: null,
    isPrototypeSeed: false,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-02T09:00:00.000Z',
    ...overrides,
  });

  // 1. Vault seal SHA-256 + redaction
  const validOpp = makeBaseOpp({});
  const validAssess = evaluateOpportunityVerificationOps({
    opportunity: validOpp,
    complaints: [],
    nowMs: fixedNowMs,
  });
  const check1 =
    validAssess.vaultSeals.length === 3 &&
    validAssess.vaultSeals.every(
      (s) =>
        s.vaultSealSha256.length === 64 &&
        s.encryptionEnvelope.algorithm === 'AES-256-GCM' &&
        !s.redactedRef.includes('884210')
    );

  // 2. Tier 2 -> Tier 3 strict non-transitivity
  const nonTransOpp = makeBaseOpp({
    id: 'opp_nontrans',
    status: 'verified_live',
    verificationTiers: {
      ...validOpp.verificationTiers,
      organisationStatus: 'verified',
      specificOpportunityStatus: 'pending_review',
      specificOpportunityVerifiedAt: null,
    },
  });
  const nonTransAssess = evaluateOpportunityVerificationOps({
    opportunity: nonTransOpp,
    complaints: [],
    nowMs: fixedNowMs,
  });
  const check2 =
    nonTransAssess.nonTransitivityVerified === false &&
    nonTransAssess.eligibleForTvSchedule === false;

  // 3. Individual / Informal Employer accommodation
  const informalOpp = makeBaseOpp({
    id: 'opp_informal',
    providerType: 'individual_informal_employer',
    providerName: 'T. Moyo Carpentry Workshop',
    verificationTiers: {
      ...validOpp.verificationTiers,
      organisationStatus: 'not_applicable',
      organisationEvidenceRef: 'Individual / Informal Employer (Corporate Registration Not Required)',
      organisationVerifiedAt: null,
    },
  });
  const informalAssess = evaluateOpportunityVerificationOps({
    opportunity: informalOpp,
    complaints: [],
    nowMs: fixedNowMs,
  });
  const check3 =
    informalAssess.nonTransitivityVerified === true &&
    informalAssess.eligibleForTvSchedule === true;

  // 4. Financial independence ($0.00 Charity lock & paid campaign separation)
  const paidViolationCampaign: CampaignRecord = {
    id: 'cmp_bad_paid_opp',
    ownerId: 'usr_emp_01',
    title: 'Paid Opp Attempt',
    contentCategory: 'opportunity_promotion',
    summary: 'Violation test fixture attempting paid opportunity fee coupling.',
    qrToken: 'qr_opp_01',
    adCreativeRef: 'crt_01',
    durationSeconds: 15,
    dailyFrequencyCap: 2,
    targetRegions: ['Harare'],
    dayparts: ['primetime'],
    startDate: '2026-11-10',
    endDate: '2026-12-10',
    status: 'active',
    rejectionReason: null,
    fixInstructions: null,
    simulatedEstimate: {
      model: 'simulated_cpm_flat_rate',
      currency: 'USD',
      estimatedSpots: 60,
      estimatedRatePerSpotUsd: 5,
      estimatedTotalUsd: 300,
      paymentCollectionActive: false,
      disclaimer: 'Violation test fixture',
    },
    isPrototypeSeed: false,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  };
  const feeOpp = makeBaseOpp({ id: 'opp_fee_test', linkedCampaignId: 'cmp_bad_paid_opp' });
  const feeAssess = evaluateOpportunityVerificationOps({
    opportunity: feeOpp,
    complaints: [],
    linkedCampaign: paidViolationCampaign,
    nowMs: fixedNowMs,
  });
  const check4 =
    feeAssess.feeIndependenceVerified === false && feeAssess.eligibleForTvSchedule === false;

  // 5. Expired date + stale 90d Tier 3 re-verification quarantine
  const expiredOpp = makeBaseOpp({ id: 'opp_exp', closingDate: pastDate });
  const staleTier3Opp = makeBaseOpp({
    id: 'opp_stale_t3',
    verificationTiers: {
      ...validOpp.verificationTiers,
      specificOpportunityVerifiedAt: '2026-07-01T00:00:00.000Z', // > 90 days before 2026-11-16
    },
  });
  const expAssess = evaluateOpportunityVerificationOps({
    opportunity: expiredOpp,
    complaints: [],
    nowMs: fixedNowMs,
  });
  const staleAssess = evaluateOpportunityVerificationOps({
    opportunity: staleTier3Opp,
    complaints: [],
    nowMs: fixedNowMs,
  });
  const check5 =
    expAssess.expiredByDate === true &&
    expAssess.eligibleForTvSchedule === false &&
    staleAssess.reverificationRequired === true &&
    staleAssess.eligibleForTvSchedule === false;

  // 6. Scam risk phrase detection (upfront fee + guaranteed placement)
  const riskFlags = scanOpportunityOpsRiskPhrases([
    'Pay to apply with uniform deposit',
    '100% job guarantee after training',
  ]);
  const check6 = riskFlags.length >= 2;

  // 7. Critical 4h complaint SLA breach & immediate suspension recommendation
  const criticalComplaint: OpportunityComplaintRecord = {
    id: 'cmpn_crit_01',
    opportunityId: validOpp.id,
    reporterId: 'usr_view_01',
    reporterRole: 'household_viewer',
    reasonCategory: 'upfront_fee_scam',
    description: 'Employer demanded $25 registration fee over WhatsApp.',
    evidenceDetails: 'Screenshot ref #441',
    status: 'reported',
    resolutionNotes: null,
    createdAt: '2026-11-16T06:00:00.000Z', // 6 hours before fixedNowMs (breaches 4h SLA)
    updatedAt: '2026-11-16T06:00:00.000Z',
  };
  const critAssess = evaluateOpportunityVerificationOps({
    opportunity: validOpp,
    complaints: [criticalComplaint],
    nowMs: fixedNowMs,
  });
  const check7 =
    critAssess.criticalComplaintsCount === 1 &&
    critAssess.recommendImmediateSuspension === true &&
    critAssess.eligibleForTvSchedule === false;

  // 8. Overview SLA aggregation + strict software-first KYC boundary
  const overview = buildOpportunityOpsOverview({
    actor: {
      id: 'usr_admin_01',
      email: 'admin@edison.demo',
      name: 'EDISON Admin',
      organisationName: 'EDISON Ops',
      role: 'admin',
      verificationStatus: 'verified',
      isPrototypeSeed: true,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    opportunities: [validOpp],
    complaints: [criticalComplaint],
    appeals: [
      {
        id: 'apl_sla_01',
        opportunityId: validOpp.id,
        ownerId: validOpp.ownerId,
        reason: 'Updated letterhead uploaded.',
        additionalEvidence: 'DOC-2026-11-13',
        status: 'submitted',
        adminNotes: null,
        createdAt: '2026-11-14T00:00:00.000Z', // 60 hours before fixedNowMs (breaches 48h SLA)
        updatedAt: '2026-11-14T00:00:00.000Z',
      },
    ],
    nowMs: fixedNowMs,
  });
  const check8 =
    overview.summary.slaBreachedComplaintsCount === 1 &&
    overview.summary.slaBreachedAppealsCount === 1 &&
    overview.externalKycVendorConnected === false &&
    overview.advertisingFeeInfluencesVerification === false &&
    overview.hardwareTested === false;

  const checks: OpportunityOpsVerifyCheckItem[] = [
    {
      checkId: 'opp_91_vault_seals_redaction',
      label: '1. Tier 1–3 SHA-256 Evidence Vault Sealing & PII Redaction',
      passed: check1,
      detail: 'AES-256-GCM blueprint envelope + 64-hex SHA-256 vault seals computed across Tier 1, Tier 2, and Tier 3 with masked display refs.',
    },
    {
      checkId: 'opp_91_non_transitivity',
      label: '2. Strict Tier 2 -> Tier 3 Non-Transitivity Quarantine',
      passed: check2,
      detail: 'Verified organisation (Tier 2) never auto-verifies Tier 3 vacancy or permits TV scheduling until Tier 3 passes.',
    },
    {
      checkId: 'opp_91_informal_employer_na',
      label: '3. Individual / Informal Employer Tier 2 N/A Accommodation',
      passed: check3,
      detail: 'Legitimate individual/informal employers pass Tier 1 + Tier 3 with Tier 2 marked not_applicable without corporate bias.',
    },
    {
      checkId: 'opp_91_zero_fee_influence',
      label: '4. Financial Independence & $0.00 Charity Lock Enforcement',
      passed: check4,
      detail: 'Linked paid commercial billing cannot authorise opportunity verification; violations fail closed.',
    },
    {
      checkId: 'opp_91_expiry_reverification',
      label: '5. Automated Date Expiry & 90-Day Tier 3 Re-Verification Quarantine',
      passed: check5,
      detail: 'Past closing/expiry dates and Tier 3 verifications older than 90 days block TV scheduling cleanly.',
    },
    {
      checkId: 'opp_91_scam_risk_scanner',
      label: '6. Upfront Applicant Fee & Outcome-Guarantee Phrase Detection',
      passed: check6,
      detail: 'Viewer protection rules detect fee-to-apply scams and prohibited job/grant guarantee phrasing.',
    },
    {
      checkId: 'opp_91_critical_complaint_sla',
      label: '7. 4-Hour Critical Complaint SLA & Immediate Suspension Recommendation',
      passed: check7,
      detail: 'Open upfront_fee_scam complaint flags immediate suspension and revokes TV schedule eligibility.',
    },
    {
      checkId: 'opp_91_appeals_sla_software_boundary',
      label: '8. 48-Hour Appeal SLA Tracking & Software-First KYC Boundary',
      passed: check8,
      detail: 'Breached complaint/appeal SLAs surfaced cleanly with externalKycVendorConnected=false and hardwareTested=false.',
    },
  ];

  const passedChecks = checks.filter((c) => c.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    externalKycVendorConnected: false,
    advertisingFeeInfluencesVerification: false,
    hardwareTested: false,
    stageP6Deferred: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
