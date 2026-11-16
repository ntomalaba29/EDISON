import crypto from 'node:crypto';
import type {
  CampaignRecord,
  CountryJurisdictionPolicyConfig,
  CountryLaunchAssessment,
  CountryLaunchDecisionOutcome,
  CountryLaunchDecisionRecord,
  CountryLaunchOverview,
  CountryLaunchPreflightItem,
  CountryLaunchVerificationReport,
  CountryLaunchVerifyCheckItem,
  HouseholdInstallationRecord,
  LaunchMarketCode,
  OpportunityRecord,
  QrLinkRecord,
} from '../types/edison.ts';
import {
  listCountryStatutoryComplianceRecords,
  runPrivacyComplianceVerificationSuite,
} from './privacyComplianceEngine.ts';
import { listCountryGeoConfigs, runTrackBVerificationSuite } from './trackBHouseholdConsent.ts';
import { runPilotReadinessVerificationSuite } from './pilotReadinessEngine.ts';
import { runCommercialReadinessVerificationSuite } from './commercialReadinessEngine.ts';

const DEFAULT_POLICY_BY_MARKET: Record<
  LaunchMarketCode,
  Omit<CountryJurisdictionPolicyConfig, 'updatedAt' | 'updatedByEmail'>
> = {
  ZW: {
    countryCode: 'ZW',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'ZIMRA VAT / Digital Services Tax Baseline (Unactivated)',
  },
  GB: {
    countryCode: 'GB',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'HMRC VAT / UK PECR Reg. 6 Baseline (Unactivated)',
  },
  EU: {
    countryCode: 'EU',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'EU OSS VAT / DSA & AVMSD Art. 7b Baseline (Unactivated)',
  },
  US: {
    countryCode: 'US',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'US VPPA (18 U.S.C. 2710) & State Opt-Out Baseline (Unactivated)',
  },
  ZA: {
    countryCode: 'ZA',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'SARS VAT / POPIA & ARB Baseline (Unactivated)',
  },
  KE_NG: {
    countryCode: 'KE_NG',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'CA Kenya / Nigeria ARCON Pre-Vetting & DST Baseline (Unactivated)',
  },
};

export function resolveCountryPolicyConfig(
  countryCode: LaunchMarketCode,
  storedProfiles?: Partial<Record<LaunchMarketCode, CountryJurisdictionPolicyConfig>>
): CountryJurisdictionPolicyConfig {
  const defaults = DEFAULT_POLICY_BY_MARKET[countryCode];
  const saved = storedProfiles?.[countryCode];
  return {
    countryCode,
    consentBannerStrictMode: saved?.consentBannerStrictMode ?? defaults.consentBannerStrictMode,
    requirePreBroadcastHumanModeration:
      saved?.requirePreBroadcastHumanModeration ?? defaults.requirePreBroadcastHumanModeration,
    // Non-overridable safety locks per ADR-001, ADR-003, ADR-011, ADR-015 & Privacy-by-Design
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock:
      saved?.enforceVppsOrLocalPrivacyLock ?? defaults.enforceVppsOrLocalPrivacyLock,
    operatorTaxNoticeLabel: saved?.operatorTaxNoticeLabel ?? defaults.operatorTaxNoticeLabel,
    updatedAt: saved?.updatedAt ?? '2026-11-16T00:00:00.000Z',
    updatedByEmail: saved?.updatedByEmail ?? 'system_baseline',
  };
}

export function buildUpdatedCountryPolicyConfig(params: {
  countryCode: LaunchMarketCode;
  consentBannerStrictMode: boolean;
  requirePreBroadcastHumanModeration: boolean;
  enforceVppsOrLocalPrivacyLock: boolean;
  operatorTaxNoticeLabel: string;
  actorEmail: string;
}): CountryJurisdictionPolicyConfig {
  return {
    countryCode: params.countryCode,
    consentBannerStrictMode: params.consentBannerStrictMode,
    requirePreBroadcastHumanModeration: params.requirePreBroadcastHumanModeration,
    jobFeeZeroLockEnforced: true,
    prohibitExternalSignalHijack: true,
    redactHouseholdGeoFromAdvertisers: true,
    enforceVppsOrLocalPrivacyLock: params.enforceVppsOrLocalPrivacyLock,
    operatorTaxNoticeLabel: params.operatorTaxNoticeLabel.trim(),
    updatedAt: new Date().toISOString(),
    updatedByEmail: params.actorEmail,
  };
}

function doesCampaignTargetMarket(campaign: CampaignRecord, code: LaunchMarketCode): boolean {
  const regions = campaign.targetRegions.map((r) => r.toUpperCase());
  if (regions.includes('GLOBAL') || regions.includes(code)) return true;
  if (code === 'ZW') {
    return regions.some((r) =>
      ['ZW', 'HARARE', 'BULAWAYO', 'MIDLANDS', 'MANICALAND', 'ZIMBABWE'].some((k) =>
        r.includes(k)
      )
    );
  }
  if (code === 'KE_NG') {
    return regions.some((r) => r.includes('KE') || r.includes('NG'));
  }
  return false;
}

export function buildCountryLaunchDecision(params: {
  countryCode: LaunchMarketCode;
  actorEmail: string;
  decisionOutcome: CountryLaunchDecisionOutcome;
  requestedCountryActivation: boolean;
  summaryNote: string;
}): CountryLaunchDecisionRecord {
  // Fail-closed honesty gate: No country territory can transition from NOT ACTIVATED while
  // Stage P6 physical TV verification, external pen-test, commercial authorization, and PSP settlement are unexecuted.
  if (params.requestedCountryActivation) {
    throw new Error(
      `COUNTRY_LAUNCH_GATE_LOCKED: Territory "${params.countryCode}" cannot be activated because hardwareTested=false (Stage P6 deferred), commercialLaunchAuthorized=false, paymentCollectionActive=false, externalPenTestCompleted=false, and legalComplianceClaimed=false.`
    );
  }

  const nowIso = new Date().toISOString();
  const base = {
    id: `cldec_${crypto.randomBytes(5).toString('hex')}`,
    countryCode: params.countryCode,
    reviewerEmail: params.actorEmail,
    decisionOutcome: params.decisionOutcome,
    summaryNote: params.summaryNote.trim(),
    countryActivated: false as const,
    commercialLaunchAuthorized: false as const,
    paymentCollectionActive: false as const,
    hardwareTested: false as const,
    legalComplianceClaimed: false as const,
    noLawyerDependencyPolicy: true as const,
    createdAt: nowIso,
  };

  return {
    ...base,
    decisionSha256: crypto.createHash('sha256').update(JSON.stringify(base)).digest('hex'),
  };
}

export function buildCountryLaunchOverview(params: {
  households: HouseholdInstallationRecord[];
  campaigns: CampaignRecord[];
  opportunities: OpportunityRecord[];
  qrLinks: QrLinkRecord[];
  storedPolicyProfiles?: Partial<Record<LaunchMarketCode, CountryJurisdictionPolicyConfig>>;
  launchDecisions?: CountryLaunchDecisionRecord[];
}): CountryLaunchOverview {
  const statutoryRecords = listCountryStatutoryComplianceRecords();
  const geoConfigs = listCountryGeoConfigs();
  const privacySuite = runPrivacyComplianceVerificationSuite();
  const trackBSuite = runTrackBVerificationSuite();
  const pilotSuite = runPilotReadinessVerificationSuite();
  const commercialSuite = runCommercialReadinessVerificationSuite();

  const countries: CountryLaunchAssessment[] = statutoryRecords.map((stat) => {
    const code = stat.countryCode as LaunchMarketCode;
    const policyConfig = resolveCountryPolicyConfig(code, params.storedPolicyProfiles);
    const hasGeoConfig = geoConfigs.some((g) => g.countryCode === code);

    const householdsInMarket = params.households.filter((h) => {
      const hhCode = h.location.countryCode.toUpperCase();
      if (code === 'KE_NG') return hhCode === 'KE' || hhCode === 'NG' || hhCode === 'KE_NG';
      return hhCode === code;
    }).length;

    const campaignsTargetingMarket = params.campaigns.filter((c) =>
      doesCampaignTargetMarket(c, code)
    ).length;

    const verifiedLiveOpportunities = params.opportunities.filter(
      (o) => o.status === 'verified_live' && o.advertisingFeeInfluencesVerification === false
    ).length;

    const preflightChecks: CountryLaunchPreflightItem[] = [
      {
        gateId: `${code}-SW-01`,
        label: 'Privacy, Consent Epoch & HTTP 403 QR Revocation',
        scope: 'software_control',
        passed:
          privacySuite.allPassed &&
          trackBSuite.allPassed &&
          stat.enforcedTechnicalControls.bundledConsentWithdrawal &&
          stat.enforcedTechnicalControls.epoch403QrRevocation &&
          policyConfig.consentBannerStrictMode,
        detail: `${stat.countryCode}: DEC-OPEN-01 bundled consent, DSR erasure cascade, Zero-PII & camera/mic disable active.`,
      },
      {
        gateId: `${code}-SW-02`,
        label: '$0.00 / FREE Charity & Anti-Recruitment-Fee Lock',
        scope: 'software_control',
        passed:
          policyConfig.jobFeeZeroLockEnforced &&
          stat.enforcedTechnicalControls.zeroApplicantFeesEnforced &&
          params.campaigns.every(
            (c) =>
              c.contentCategory !== 'opportunity_promotion' ||
              c.simulatedEstimate.estimatedTotalUsd === 0
          ),
        detail: `Worker/applicant fee ban enforced ($0.00 Charity tier + Tier 1–3 fee-independent QA).`,
      },
      {
        gateId: `${code}-SW-03`,
        label: 'Broadcast Signal Integrity & No-Hijack Policy (ADR-001 / ADR-017)',
        scope: 'software_control',
        passed:
          policyConfig.prohibitExternalSignalHijack &&
          stat.enforcedTechnicalControls.externalSignalIntegrityProhibited &&
          commercialSuite.allPassed,
        detail: `No interception/modification of third-party broadcaster feeds; Stage-ready pre-broadcast moderation=${policyConfig.requirePreBroadcastHumanModeration}.`,
      },
      {
        gateId: `${code}-SW-04`,
        label: 'Geo Hierarchy Isolation & Local Tax/Privacy Notice Binding',
        scope: 'software_control',
        passed:
          policyConfig.redactHouseholdGeoFromAdvertisers &&
          policyConfig.enforceVppsOrLocalPrivacyLock &&
          (code === 'ZW' ? hasGeoConfig : Boolean(policyConfig.operatorTaxNoticeLabel)),
        detail: `Exact household locations redacted; ${policyConfig.operatorTaxNoticeLabel} (${hasGeoConfig ? 'Geo hierarchy mapped' : 'Country policy mapped'}).`,
      },
      {
        gateId: `${code}-EXT-01`,
        label: 'Stage P6 Physical Smart TV + Mobile Hardware Execution',
        scope: 'external_hardware_or_statutory',
        passed: false,
        detail: `BLOCKED (Deferred until app completion): hardwareTested=false, pilotHardwareExecuted=${pilotSuite.pilotHardwareExecuted}.`,
      },
      {
        gateId: `${code}-EXT-02`,
        label: 'External Pen-Test, Regulator Filing & Commercial Auth Gate',
        scope: 'external_hardware_or_statutory',
        passed: false,
        detail: `BLOCKED: externalPenTestCompleted=false, commercialLaunchAuthorized=false, paymentCollectionActive=false, legalComplianceClaimed=false (Zero formal compliance claimed).`,
      },
    ];

    const softwareGates = preflightChecks.filter((p) => p.scope === 'software_control');
    const externalGates = preflightChecks.filter(
      (p) => p.scope === 'external_hardware_or_statutory'
    );

    const activationBlockers = [
      ...stat.unresolvedRegulatoryUncertainties,
      'Stage P6 physical Smart TV + smartphone verification unexecuted (hardwareTested=false).',
      'Commercial launch & live payment collection remain disabled (commercialLaunchAuthorized=false, paymentCollectionActive=false).',
    ];

    const assessmentCanonical = {
      code,
      countryActivated: false,
      legalComplianceClaimed: false,
      swReady: softwareGates.filter((g) => g.passed).length,
      policyConfig,
      statutesCount: stat.statutesResearched.length,
    };

    return {
      countryCode: code,
      countryName: stat.countryName,
      isInitialLaunchMarket: stat.isInitialLaunchMarket,
      countryActivated: false,
      legalComplianceClaimed: false,
      noLawyerDependencyPolicy: true,
      gateStatus: 'software_controls_verified_awaiting_external_clearances',
      softwareGatesReadyCount: softwareGates.filter((g) => g.passed).length,
      softwareGatesTotalCount: softwareGates.length,
      externalClearancesBlockedCount: externalGates.filter((g) => !g.passed).length,
      statutesResearched: stat.statutesResearched,
      unresolvedRegulatoryUncertainties: stat.unresolvedRegulatoryUncertainties,
      policyConfig,
      preflightChecks,
      liveSeedCoverage: {
        householdsInMarket,
        campaignsTargetingMarket,
        verifiedLiveOpportunities,
      },
      activationBlockers,
      assessmentSha256: crypto
        .createHash('sha256')
        .update(JSON.stringify(assessmentCanonical))
        .digest('hex'),
    };
  });

  const softwareReadyMarketsCount = countries.filter(
    (c) => c.softwareGatesReadyCount === c.softwareGatesTotalCount
  ).length;

  const launchDecisions = params.launchDecisions ?? [];

  const globalLaunchBlockers = [
    'ALL MARKETS UNACTIVATED: 0 of 6 markets activated (ZW Initial Launch Market, GB, EU, US, ZA, KE/NG all strictly countryActivated=false).',
    'STAGE P6 HARDWARE DEFERRED: Single final physical Smart TV + mobile scan test (hardwareTested=false) required before ZW or any market goes live.',
    'INDEPENDENT STATUTORY RESEARCH ONLY (NO LAWYER DEPENDENCY): Public statutes & regulator guidance mapped to code, but legalComplianceClaimed=false until operator registration/filing completes.',
    'COMMERCIAL & SECURITY GATES LOCKED: commercialLaunchAuthorized=false, paymentCollectionActive=false, externalPenTestCompleted=false, externalKycVendorConnected=false.',
  ];

  const manifestCanonical = {
    countries: countries.map((c) => ({
      code: c.countryCode,
      activated: c.countryActivated,
      hash: c.assessmentSha256,
    })),
    decisions: launchDecisions.map((d) => d.decisionSha256),
    activeLaunchedMarketsCount: 0,
    qrCount: params.qrLinks.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    initialLaunchMarket: 'ZW',
    activeLaunchedMarketsCount: 0,
    totalInventoriedMarketsCount: 6,
    softwareReadyMarketsCount,
    isSoftwareSimulationOnly: true,
    countryActivated: false,
    commercialLaunchAuthorized: false,
    paymentCollectionActive: false,
    hardwareTested: false,
    pilotHardwareExecuted: false,
    stageP6Deferred: true,
    externalPenTestCompleted: false,
    externalKycVendorConnected: false,
    legalComplianceClaimed: false,
    noLawyerDependencyPolicy: true,
    charityListingFeeUsd: 0,
    charityJobFeeLockEnforced: true,
    countries,
    launchDecisions,
    globalLaunchBlockers,
    manifestSha256: crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestCanonical))
      .digest('hex'),
  };
}

export function runCountryLaunchVerificationSuite(): CountryLaunchVerificationReport {
  const checks: CountryLaunchVerifyCheckItem[] = [];

  const overview = buildCountryLaunchOverview({
    households: [],
    campaigns: [],
    opportunities: [],
    qrLinks: [],
  });

  // 1. All 6 baseline markets inventoried & ZW flagged as Initial Launch Market
  const zw = overview.countries.find((c) => c.countryCode === 'ZW');
  checks.push({
    checkId: 'p14_6_markets_zw_initial',
    label: 'All 6 Country Activation Register markets inventoried with ZW as Initial Launch Market',
    passed:
      overview.countries.length === 6 &&
      overview.initialLaunchMarket === 'ZW' &&
      Boolean(zw && zw.isInitialLaunchMarket) &&
      overview.countries.filter((c) => c.isInitialLaunchMarket).length === 1,
    detail: `6/6 territories mapped (${overview.countries.map((c) => c.countryCode).join(', ')}); ZW initial=${Boolean(zw?.isInitialLaunchMarket)}.`,
  });

  // 2. Zero markets activated & legalComplianceClaimed=false across every territory
  checks.push({
    checkId: 'p14_zero_markets_activated_honesty',
    label: 'Zero markets activated & Independent Statutory Research honesty flags preserved',
    passed:
      overview.activeLaunchedMarketsCount === 0 &&
      overview.countryActivated === false &&
      overview.legalComplianceClaimed === false &&
      overview.noLawyerDependencyPolicy === true &&
      overview.countries.every(
        (c) =>
          c.countryActivated === false &&
          c.legalComplianceClaimed === false &&
          c.noLawyerDependencyPolicy === true &&
          c.externalClearancesBlockedCount === 2
      ),
    detail: `activeLaunchedMarketsCount=0, legalComplianceClaimed=false, noLawyerDependencyPolicy=true across all 6 markets.`,
  });

  // 3. All 6 markets have 4/4 software preflight gates verified & 2 external gates honestly blocked
  checks.push({
    checkId: 'p14_software_vs_external_gate_split',
    label: 'Software-first controls (4/4 per market) strictly separated from Stage P6 & statutory clearances',
    passed:
      overview.softwareReadyMarketsCount === 6 &&
      overview.countries.every(
        (c) => c.softwareGatesTotalCount === 4 && c.softwareGatesReadyCount === 4
      ),
    detail: `${overview.softwareReadyMarketsCount}/6 markets pass all 4 software gates while keeping 2 external gates blocked.`,
  });

  // 4. Non-overridable statutory safety locks cannot be turned off by policy update
  const updatedUsPolicy = buildUpdatedCountryPolicyConfig({
    countryCode: 'US',
    consentBannerStrictMode: true,
    requirePreBroadcastHumanModeration: true,
    enforceVppsOrLocalPrivacyLock: true,
    operatorTaxNoticeLabel: 'US VPPA & State Opt-Out Custom Label (Unactivated)',
    actorEmail: 'admin@edison.demo',
  });
  checks.push({
    checkId: 'p14_mandatory_statutory_safety_locks',
    label: 'Jurisdiction policy updates preserve mandatory $0 Charity fee ban, no signal hijack & geo redaction',
    passed:
      updatedUsPolicy.jobFeeZeroLockEnforced === true &&
      updatedUsPolicy.prohibitExternalSignalHijack === true &&
      updatedUsPolicy.redactHouseholdGeoFromAdvertisers === true,
    detail: `US policy preserves jobFeeZeroLockEnforced=true, prohibitExternalSignalHijack=true, redactHouseholdGeoFromAdvertisers=true.`,
  });

  // 5. Fail-closed territory activation rejection while Stage P6 & external gates are pending
  let zwActivationRejected = false;
  let gbActivationRejected = false;
  try {
    buildCountryLaunchDecision({
      countryCode: 'ZW',
      actorEmail: 'admin@edison.demo',
      decisionOutcome: 'hold_country_unactivated_pending_clearances',
      requestedCountryActivation: true,
      summaryNote: 'Premature attempt to flip ZW countryActivated=true before Stage P6.',
    });
  } catch (err) {
    zwActivationRejected =
      err instanceof Error && err.message.startsWith('COUNTRY_LAUNCH_GATE_LOCKED:');
  }
  try {
    buildCountryLaunchDecision({
      countryCode: 'GB',
      actorEmail: 'admin@edison.demo',
      decisionOutcome: 'hold_country_unactivated_pending_clearances',
      requestedCountryActivation: true,
      summaryNote: 'Premature attempt to activate GB before Stage P6 and Ofcom/UK GDPR clearance.',
    });
  } catch (err) {
    gbActivationRejected =
      err instanceof Error && err.message.startsWith('COUNTRY_LAUNCH_GATE_LOCKED:');
  }
  checks.push({
    checkId: 'p14_fail_closed_country_activation_block',
    label: 'Country activation requests fail closed with COUNTRY_LAUNCH_GATE_LOCKED before Stage P6',
    passed: zwActivationRejected && gbActivationRejected,
    detail: `ZW premature activation blocked=${zwActivationRejected}; GB blocked=${gbActivationRejected}.`,
  });

  // 6. Valid hold/staging decision yields SHA-256 digest & preserves unactivated locks
  const zwDecision = buildCountryLaunchDecision({
    countryCode: 'ZW',
    actorEmail: 'admin@edison.demo',
    decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
    requestedCountryActivation: false,
    summaryNote: 'ZW software controls (POTRAZ/BAZ/Labour Act/ZIMRA baseline) staged; awaiting Stage P6 and POTRAZ filing.',
  });
  checks.push({
    checkId: 'p14_decision_sha256_integrity',
    label: 'Territory launch review decision creates SHA-256 digest keeping countryActivated=false',
    passed:
      zwDecision.countryActivated === false &&
      zwDecision.commercialLaunchAuthorized === false &&
      zwDecision.paymentCollectionActive === false &&
      zwDecision.hardwareTested === false &&
      zwDecision.legalComplianceClaimed === false &&
      /^[a-f0-9]{64}$/.test(zwDecision.decisionSha256),
    detail: `decision=${zwDecision.id} (ZW), sha=${zwDecision.decisionSha256.slice(0, 12)}`,
  });

  // 7. ZW Initial Launch Market carries POTRAZ, BAZ, Labour Act & Track B geo statutes
  checks.push({
    checkId: 'p14_zw_statutes_and_track_b_geo',
    label: 'ZW Initial Launch Market maps POTRAZ, BAZ, Labour Act, ZIMRA & Track B geo controls',
    passed:
      Boolean(zw) &&
      zw!.statutesResearched.some((s) => s.includes('POTRAZ')) &&
      zw!.statutesResearched.some((s) => s.includes('BAZ')) &&
      zw!.statutesResearched.some((s) => s.includes('Labour Act')) &&
      zw!.statutesResearched.some((s) => s.includes('ZIMRA')) &&
      zw!.preflightChecks.some((c) => c.gateId === 'ZW-SW-04' && c.passed),
    detail: `${zw?.statutesResearched.length ?? 0} ZW statutes mapped with Track B geo hierarchy check.`,
  });

  // 8. Global non-commercial, hardware-deferred & $0 Charity posture intact
  checks.push({
    checkId: 'p14_global_non_commercial_hardware_posture',
    label: 'Global commercialLaunchAuthorized=false, paymentCollectionActive=false, stageP6Deferred=true, Charity=$0.00',
    passed:
      overview.isSoftwareSimulationOnly &&
      !overview.commercialLaunchAuthorized &&
      !overview.paymentCollectionActive &&
      !overview.hardwareTested &&
      !overview.pilotHardwareExecuted &&
      overview.stageP6Deferred &&
      overview.charityListingFeeUsd === 0 &&
      overview.charityJobFeeLockEnforced &&
      /^[a-f0-9]{64}$/.test(overview.manifestSha256),
    detail: `All non-commercial, Charity $0.00, and Stage P6 deferral locks enforced (sha=${overview.manifestSha256.slice(0, 12)}).`,
  });

  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    countryActivated: false,
    activeLaunchedMarketsCount: 0,
    commercialLaunchAuthorized: false,
    paymentCollectionActive: false,
    hardwareTested: false,
    stageP6Deferred: true,
    legalComplianceClaimed: false,
    noLawyerDependencyPolicy: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
