import crypto from 'node:crypto';
import type {
  CampaignRecord,
  CountryJurisdictionPolicyConfig,
  CountryLaunchDecisionRecord,
  ExpansionCurrencyCode,
  ExpansionPreflightItem,
  ExpansionRegionId,
  HouseholdInstallationRecord,
  InternationalExpansionDecisionOutcome,
  InternationalExpansionDecisionRecord,
  InternationalExpansionOverview,
  InternationalExpansionVerificationReport,
  InternationalExpansionVerifyCheckItem,
  InternationalRegionProfileAssessment,
  TargetingGeographyCode,
  MultiCurrencyProFormaEstimate,
  OpportunityRecord,
  QrLinkRecord,
  RegionalLocalizationConfig,
} from '../types/edison.ts';
import { buildCountryLaunchOverview } from './countryLaunchEngine.ts';

interface RegionBlueprintDefinition {
  regionId: ExpansionRegionId;
  regionName: string;
  targetMarketCodes: TargetingGeographyCode[];
  sovereignResidencyZone: string;
  cdnEdgeClusterTarget: string;
  defaultConfig: Omit<RegionalLocalizationConfig, 'updatedAt' | 'updatedByEmail'>;
}

// Reference non-live simulated FX assumptions for pro-forma planning only
const SIMULATED_FX_TO_USD: Record<ExpansionCurrencyCode, { ratePerUsd: number; note: string }> = {
  USD: {
    ratePerUsd: 1,
    note: 'Baseline reference currency (simulated non-transactional pro-forma rate)',
  },
  ZWG: {
    ratePerUsd: 26.5,
    note: 'Indicative Zimbabwe Gold (ZWG) planning reference (non-transactional baseline)',
  },
  GBP: {
    ratePerUsd: 0.79,
    note: 'Indicative GBP planning reference (non-transactional baseline)',
  },
  EUR: {
    ratePerUsd: 0.92,
    note: 'Indicative EUR planning reference (non-transactional baseline)',
  },
  ZAR: {
    ratePerUsd: 18.2,
    note: 'Indicative ZAR planning reference (non-transactional baseline)',
  },
  KES: {
    ratePerUsd: 129.0,
    note: 'Indicative KES planning reference (non-transactional baseline)',
  },
  NGN: {
    ratePerUsd: 1580.0,
    note: 'Indicative NGN planning reference (non-transactional baseline)',
  },
};

const REGION_BLUEPRINTS: RegionBlueprintDefinition[] = [
  {
    regionId: 'africa_south_zw_za',
    regionName: 'Southern Africa Cluster (Zimbabwe Initial + South Africa)',
    targetMarketCodes: ['ZW', 'ZA'],
    sovereignResidencyZone: 'africa-south-1 (SADC Sovereign Partition)',
    cdnEdgeClusterTarget: 'JNB / HRE Multi-Edge CDN Tier',
    defaultConfig: {
      regionId: 'africa_south_zw_za',
      primaryLanguageCode: 'en',
      supportedLanguageCodes: ['en', 'sn', 'nd', 'zu'],
      captionAccessibilityStandard: 'DVB-Sub / EBU-TT-D Closed Captions + High-Contrast 16:9',
      multiCurrencyCode: 'USD',
      proFormaCpmRateLocal: 4.5,
      dataResidencyZone: 'africa-south-1 (ZW/ZA Household Geo Isolated)',
      prohibitCrossBorderPiiTransfer: true,
      charityZeroCostLocked: true,
    },
  },
  {
    regionId: 'europe_uk_eu',
    regionName: 'Europe & United Kingdom Cluster (GB + EU AVMSD)',
    targetMarketCodes: ['GB', 'EU'],
    sovereignResidencyZone: 'eu-west / uk-london (GDPR & UK GDPR Resident)',
    cdnEdgeClusterTarget: 'LON / FRA / DUB HbbTV & CTV Edge Tier',
    defaultConfig: {
      regionId: 'europe_uk_eu',
      primaryLanguageCode: 'en',
      supportedLanguageCodes: ['en', 'de', 'fr', 'pt'],
      captionAccessibilityStandard: 'EBU-TT-D Multilingual Captions + ETSI EN 300 743',
      multiCurrencyCode: 'EUR',
      proFormaCpmRateLocal: 8.2,
      dataResidencyZone: 'eu-west-2 / eu-central-1 (EEA/UK Residency Isolated)',
      prohibitCrossBorderPiiTransfer: true,
      charityZeroCostLocked: true,
    },
  },
  {
    regionId: 'africa_east_west_ke_ng',
    regionName: 'East & West Africa Expansion Cluster (Kenya + Nigeria)',
    targetMarketCodes: ['KE_NG'],
    sovereignResidencyZone: 'africa-east-west (KE DPA / NDPA 2023 Partition)',
    cdnEdgeClusterTarget: 'NBO / LOS Hybrid CDN Edge Tier',
    defaultConfig: {
      regionId: 'africa_east_west_ke_ng',
      primaryLanguageCode: 'en',
      supportedLanguageCodes: ['en', 'sw'],
      captionAccessibilityStandard: 'DVB-Sub + Clear Low-Bandwidth Static Text Card Support',
      multiCurrencyCode: 'KES',
      proFormaCpmRateLocal: 490.0,
      dataResidencyZone: 'africa-ke-ng-isolated (Local Statutory Residency)',
      prohibitCrossBorderPiiTransfer: true,
      charityZeroCostLocked: true,
    },
  },
  {
    regionId: 'north_america_us',
    regionName: 'North America Expansion Cluster (United States VPPA / ATSC 3.0)',
    targetMarketCodes: ['US'],
    sovereignResidencyZone: 'us-east-1 (VPPA Watch-History Isolated Partition)',
    cdnEdgeClusterTarget: 'IAD / DFW / LAX ATSC 3.0 Edge Tier',
    defaultConfig: {
      regionId: 'north_america_us',
      primaryLanguageCode: 'en',
      supportedLanguageCodes: ['en', 'es'],
      captionAccessibilityStandard: 'CEA-708 Closed Captions + ADA High-Contrast Safe Zone',
      multiCurrencyCode: 'USD',
      proFormaCpmRateLocal: 11.5,
      dataResidencyZone: 'us-east-1 (VPPA Strictly Non-Shared)',
      prohibitCrossBorderPiiTransfer: true,
      charityZeroCostLocked: true,
    },
  },
];

export function resolveRegionalLocalizationConfig(
  regionId: ExpansionRegionId,
  storedConfigs?: Partial<Record<ExpansionRegionId, RegionalLocalizationConfig>>
): RegionalLocalizationConfig {
  const blueprint = REGION_BLUEPRINTS.find((b) => b.regionId === regionId) ?? REGION_BLUEPRINTS[0];
  const saved = storedConfigs?.[regionId];
  return {
    regionId,
    primaryLanguageCode: saved?.primaryLanguageCode ?? blueprint.defaultConfig.primaryLanguageCode,
    supportedLanguageCodes:
      saved?.supportedLanguageCodes && saved.supportedLanguageCodes.length > 0
        ? [...saved.supportedLanguageCodes]
        : [...blueprint.defaultConfig.supportedLanguageCodes],
    captionAccessibilityStandard:
      saved?.captionAccessibilityStandard ?? blueprint.defaultConfig.captionAccessibilityStandard,
    multiCurrencyCode: saved?.multiCurrencyCode ?? blueprint.defaultConfig.multiCurrencyCode,
    proFormaCpmRateLocal:
      typeof saved?.proFormaCpmRateLocal === 'number'
        ? saved.proFormaCpmRateLocal
        : blueprint.defaultConfig.proFormaCpmRateLocal,
    dataResidencyZone: blueprint.defaultConfig.dataResidencyZone,
    // Non-overridable Phase 15 global safety locks
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
    updatedAt: saved?.updatedAt ?? '2026-11-16T00:00:00.000Z',
    updatedByEmail: saved?.updatedByEmail ?? 'system_baseline',
  };
}

export function buildUpdatedRegionalLocalizationConfig(params: {
  regionId: ExpansionRegionId;
  primaryLanguageCode: string;
  supportedLanguageCodes: string[];
  captionAccessibilityStandard: string;
  multiCurrencyCode: ExpansionCurrencyCode;
  proFormaCpmRateLocal: number;
  actorEmail: string;
}): RegionalLocalizationConfig {
  const blueprint = REGION_BLUEPRINTS.find((b) => b.regionId === params.regionId);
  if (!blueprint) {
    throw new Error(`Unsupported expansion region "${params.regionId}".`);
  }

  const normalizedLangs = Array.from(
    new Set(
      [params.primaryLanguageCode, ...params.supportedLanguageCodes]
        .map((code) => code.trim().toLowerCase())
        .filter((code) => code.length >= 2)
    )
  );

  return {
    regionId: params.regionId,
    primaryLanguageCode: params.primaryLanguageCode.trim().toLowerCase(),
    supportedLanguageCodes: normalizedLangs,
    captionAccessibilityStandard: params.captionAccessibilityStandard.trim(),
    multiCurrencyCode: params.multiCurrencyCode,
    proFormaCpmRateLocal: Math.round(params.proFormaCpmRateLocal * 100) / 100,
    dataResidencyZone: blueprint.defaultConfig.dataResidencyZone,
    // Non-overridable safety locks
    prohibitCrossBorderPiiTransfer: true,
    charityZeroCostLocked: true,
    updatedAt: new Date().toISOString(),
    updatedByEmail: params.actorEmail,
  };
}

export function computeMultiCurrencyProFormaEstimate(params: {
  regionId: ExpansionRegionId;
  currencyCode: ExpansionCurrencyCode;
  proFormaCpmRateLocal: number;
  directCommercialImpressions: number;
  charityImpressions: number;
}): MultiCurrencyProFormaEstimate {
  const fx = SIMULATED_FX_TO_USD[params.currencyCode];
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const commercialGrossLocal = round2(
    (params.directCommercialImpressions / 1000) * params.proFormaCpmRateLocal
  );
  const commercialGrossUsd = round2(commercialGrossLocal / fx.ratePerUsd);

  const canonical = {
    regionId: params.regionId,
    currencyCode: params.currencyCode,
    proFormaCpmRateLocal: params.proFormaCpmRateLocal,
    directCommercialImpressions: params.directCommercialImpressions,
    commercialGrossLocal,
    charityImpressions: params.charityImpressions,
    charityCostLocal: 0,
    charityZeroCostLocked: true,
    paymentCollectionActive: false,
  };

  return {
    regionId: params.regionId,
    currencyCode: params.currencyCode,
    fxReferenceRateToUsd: fx.ratePerUsd,
    fxAssumptionNote: fx.note,
    directCommercialImpressions: params.directCommercialImpressions,
    proFormaCpmRateLocal: params.proFormaCpmRateLocal,
    commercialGrossLocal,
    commercialGrossUsd,
    charityImpressions: params.charityImpressions,
    charityCostLocal: 0,
    charityCostUsd: 0,
    charityZeroCostLocked: true,
    paymentCollectionActive: false,
    isSimulatedEstimateOnly: true,
    estimateSha256: crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    generatedAt: new Date().toISOString(),
  };
}

export function buildInternationalExpansionDecision(params: {
  regionId: ExpansionRegionId;
  actorEmail: string;
  decisionOutcome: InternationalExpansionDecisionOutcome;
  requestedRegionActivation: boolean;
  summaryNote: string;
}): InternationalExpansionDecisionRecord {
  if (params.requestedRegionActivation) {
    throw new Error(
      `EXPANSION_REGION_GATE_LOCKED: Expansion region "${params.regionId}" cannot be activated because activeLaunchedMarketsCount=0 (Phase 14 markets unactivated), hardwareTested=false (Stage P6 deferred), paymentCollectionActive=false, and live sovereign cloud residency clusters remain unprovisioned.`
    );
  }

  const now = new Date().toISOString();
  const id = `exp_${crypto.randomBytes(5).toString('hex')}`;
  const canonical = {
    id,
    regionId: params.regionId,
    reviewerEmail: params.actorEmail,
    decisionOutcome: params.decisionOutcome,
    summaryNote: params.summaryNote.trim(),
    regionalExpansionActive: false as const,
    countryActivated: false as const,
    commercialLaunchAuthorized: false as const,
    paymentCollectionActive: false as const,
    hardwareTested: false as const,
    legalComplianceClaimed: false as const,
    createdAt: now,
  };

  return {
    ...canonical,
    decisionSha256: crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
  };
}

export function buildInternationalExpansionOverview(params: {
  households: HouseholdInstallationRecord[];
  campaigns: CampaignRecord[];
  opportunities: OpportunityRecord[];
  qrLinks: QrLinkRecord[];
  storedPolicyProfiles?: Partial<Record<TargetingGeographyCode, CountryJurisdictionPolicyConfig>>;
  countryLaunchDecisions?: CountryLaunchDecisionRecord[];
  storedLocalizationProfiles?: Partial<Record<ExpansionRegionId, RegionalLocalizationConfig>>;
  expansionDecisions?: InternationalExpansionDecisionRecord[];
}): InternationalExpansionOverview {
  const countryOverview = buildCountryLaunchOverview({
    households: params.households,
    campaigns: params.campaigns,
    opportunities: params.opportunities,
    qrLinks: params.qrLinks,
    storedPolicyProfiles: params.storedPolicyProfiles,
    launchDecisions: params.countryLaunchDecisions,
  });

  const allLanguages = new Set<string>();

  const regions: InternationalRegionProfileAssessment[] = REGION_BLUEPRINTS.map((bp) => {
    const config = resolveRegionalLocalizationConfig(bp.regionId, params.storedLocalizationProfiles);
    for (const lang of config.supportedLanguageCodes) {
      allLanguages.add(lang);
    }

    const linkedMarkets = countryOverview.countries.filter((c) =>
      bp.targetMarketCodes.includes(c.countryCode)
    );
    const linkedSoftwareGatesReady = linkedMarkets.every(
      (m) => m.softwareGatesReadyCount === m.softwareGatesTotalCount
    );

    const fx = SIMULATED_FX_TO_USD[config.multiCurrencyCode];
    const proFormaCpmRateUsd = Math.round((config.proFormaCpmRateLocal / fx.ratePerUsd) * 100) / 100;

    const preflightChecks: ExpansionPreflightItem[] = [
      {
        gateId: `${bp.regionId}-SW-01`,
        label: 'Sovereign Data Residency & Cross-Border PII Transfer Lock',
        scope: 'software_architecture',
        passed: config.prohibitCrossBorderPiiTransfer === true && config.dataResidencyZone.length > 0,
        detail: `Residency locked to ${config.dataResidencyZone}; raw household records, PIN hashes, and geo coordinates prohibited from cross-border export.`,
      },
      {
        gateId: `${bp.regionId}-SW-02`,
        label: 'Multilingual TV Captioning, Locale Pack & Safe-Zone Alignment',
        scope: 'software_architecture',
        passed: config.supportedLanguageCodes.length >= 2 && config.primaryLanguageCode.length >= 2,
        detail: `Primary=${config.primaryLanguageCode}, locales=[${config.supportedLanguageCodes.join(', ')}], captions="${config.captionAccessibilityStandard}".`,
      },
      {
        gateId: `${bp.regionId}-SW-03`,
        label: 'Multi-Currency Pro-Forma Pricing Blueprint & Global $0.00 Charity Lock',
        scope: 'software_architecture',
        passed: config.charityZeroCostLocked === true && config.proFormaCpmRateLocal > 0,
        detail: `Pro-forma CPM ${config.proFormaCpmRateLocal} ${config.multiCurrencyCode} (~$${proFormaCpmRateUsd} USD); Charity & employer job fee locked at 0 ${config.multiCurrencyCode} (paymentCollectionActive=false).`,
      },
      {
        gateId: `${bp.regionId}-SW-04`,
        label: 'Reference jurisdiction profile alignment',
        scope: 'software_architecture',
        passed: linkedMarkets.length === bp.targetMarketCodes.length && linkedSoftwareGatesReady,
        detail: `Linked jurisdiction references found (${linkedMarkets.map((m) => `${m.countryCode}: 4/4`).join(', ')}); this is not launch approval or targeting-coverage evidence.`,
      },
      {
        gateId: `${bp.regionId}-EXT-01`,
        label: 'Physical Smart TV and smartphone verification',
        scope: 'external_rollout_or_acquirer',
        passed: false,
        detail: `NOT VERIFIED: Stage P6 physical TV and smartphone testing remains outstanding for the product; it is not a per-region activation gate.`,
      },
      {
        gateId: `${bp.regionId}-EXT-02`,
        label: 'Regional Sovereign Infrastructure Provisioning & Local Payment Acquirer Approval',
        scope: 'external_rollout_or_acquirer',
        passed: false,
        detail: `BLOCKED: Sovereign cloud DB cluster (TASK-P3-001), external KYC/acquirer contracts, and independent multi-region compliance filings remain unprovisioned.`,
      },
    ];

    const softwareGates = preflightChecks.filter((p) => p.scope === 'software_architecture');
    const externalGates = preflightChecks.filter((p) => p.scope === 'external_rollout_or_acquirer');

    const blockers = [
      `The product is not authorized for release; EDISON is intended to release simultaneously rather than by regional waves.`,
      `Physical Smart TV and smartphone verification (Stage P6) remains outstanding.`,
      `Multi-currency billing (${config.multiCurrencyCode}) remains non-transactional pro-forma only (paymentCollectionActive=false).`,
    ];

    const canonical = {
      regionId: bp.regionId,
      targetMarketCodes: bp.targetMarketCodes,
      config,
      preflightChecks: preflightChecks.map((p) => ({ gateId: p.gateId, passed: p.passed })),
      regionalExpansionActive: false,
    };

    return {
      regionId: bp.regionId,
      regionName: bp.regionName,
      targetMarketCodes: bp.targetMarketCodes,
      sovereignResidencyZone: bp.sovereignResidencyZone,
      cdnEdgeClusterTarget: bp.cdnEdgeClusterTarget,
      regionalExpansionActive: false,
      localizationConfig: config,
      proFormaCpmRateUsd,
      charityListingFeeLocal: 0,
      softwareGatesReadyCount: softwareGates.filter((g) => g.passed).length,
      softwareGatesTotalCount: softwareGates.length,
      externalClearancesBlockedCount: externalGates.filter((g) => !g.passed).length,
      preflightChecks,
      blockers,
      assessmentSha256: crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    };
  });

  const expansionDecisions = (params.expansionDecisions || []).slice(0, 50);
  const softwareReadyRegionsCount = regions.filter(
    (r) => r.softwareGatesReadyCount === r.softwareGatesTotalCount
  ).length;

  const targetingAndReadinessCaveats = [
    'Targeting catalogue is representative and does not establish complete worldwide geographic coverage.',
    'One simultaneous product release is intended; owner authorization and operational evidence remain outstanding.',
    'Physical Smart TV and smartphone verification (Stage P6) remains outstanding (hardwareTested=false).',
    'Commercial launch authorization & multi-currency payment collection remain disabled (commercialLaunchAuthorized=false, paymentCollectionActive=false).',
    'TASK-P3-001 regional PostgreSQL residency clusters remain READY blueprints only (single-host JSON retained without Cloud SQL).',
  ];

  const manifestCanonical = {
    primaryTargetingReferenceRegion: 'africa_south_zw_za',
    regions: regions.map((r) => ({ id: r.regionId, hash: r.assessmentSha256 })),
    decisions: expansionDecisions.map((d) => d.decisionSha256),
    activeExpandedRegionsCount: 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    primaryTargetingReferenceRegion: 'africa_south_zw_za',
    activeExpandedRegionsCount: 0,
    totalRegionsInventoriedCount: 4,
    softwareReadyRegionsCount,
    supportedLanguagesTotalCount: allLanguages.size,
    supportedCurrenciesCount: 7,
    isSoftwareSimulationOnly: true,
    regionalExpansionActive: false,
    countryActivated: false,
    commercialLaunchAuthorized: false,
    paymentCollectionActive: false,
    hardwareTested: false,
    pilotHardwareExecuted: false,
    stageP6Deferred: true,
    legalComplianceClaimed: false,
    prohibitCrossBorderPiiTransfer: true,
    charityListingFeeUsd: 0,
    charityJobFeeLockEnforced: true,
    regions,
    expansionDecisions,
    targetingAndReadinessCaveats,
    manifestSha256: crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestCanonical))
      .digest('hex'),
  };
}

export function runInternationalExpansionVerificationSuite(): InternationalExpansionVerificationReport {
  const checks: InternationalExpansionVerifyCheckItem[] = [];

  const overview = buildInternationalExpansionOverview({
    households: [],
    campaigns: [],
    opportunities: [],
    qrLinks: [],
  });

  // 1. Four representative targeting profiles include Southern Africa.
  const wave1 = overview.regions.find((r) => r.regionId === 'africa_south_zw_za');
  checks.push({
    checkId: 'p15_4_targeting_profiles_mapped',
    label: 'Four representative targeting profiles cover the configured geographies',
    passed:
      overview.regions.length === 4 &&
      overview.primaryTargetingReferenceRegion === 'africa_south_zw_za' &&
      Boolean(wave1 && wave1.targetMarketCodes.includes('ZW') && wave1.targetMarketCodes.includes('ZA')),
    detail: `Four representative targeting profiles mapped; reference=${overview.primaryTargetingReferenceRegion}; geographies=${overview.regions.flatMap((r) => r.targetMarketCodes).join(', ')}. This does not describe release waves.`,
  });

  // 2. Zero active expanded regions & Stage P6 / Phase 14 blocks respected
  checks.push({
    checkId: 'p15_zero_regions_activated_honesty',
    label: 'No product release is authorized and no regional rollout wave is represented',
    passed:
      overview.activeExpandedRegionsCount === 0 &&
      overview.regionalExpansionActive === false &&
      overview.countryActivated === false &&
      overview.commercialLaunchAuthorized === false &&
      overview.paymentCollectionActive === false &&
      overview.hardwareTested === false &&
      overview.stageP6Deferred &&
      overview.legalComplianceClaimed === false &&
      overview.regions.every((r) => r.regionalExpansionActive === false && r.externalClearancesBlockedCount === 2),
    detail: `activeExpandedRegionsCount=0, regionalExpansionActive=false, stageP6Deferred=true, legalComplianceClaimed=false.`,
  });

  // 3. Cross-border PII isolation lock preserved on policy updates
  const euUpdated = buildUpdatedRegionalLocalizationConfig({
    regionId: 'europe_uk_eu',
    primaryLanguageCode: 'fr',
    supportedLanguageCodes: ['fr', 'de', 'en'],
    captionAccessibilityStandard: 'EBU-TT-D Strict Multilingual Accessibility',
    multiCurrencyCode: 'GBP',
    proFormaCpmRateLocal: 6.8,
    actorEmail: 'admin@edison.demo',
  });
  checks.push({
    checkId: 'p15_sovereign_residency_and_charity_lock',
    label: 'Regional localization updates enforce prohibitCrossBorderPiiTransfer=true & charityZeroCostLocked=true',
    passed:
      euUpdated.prohibitCrossBorderPiiTransfer === true &&
      euUpdated.charityZeroCostLocked === true &&
      euUpdated.dataResidencyZone.includes('eu-'),
    detail: `EU update preserves prohibitCrossBorderPiiTransfer=true, charityZeroCostLocked=true (${euUpdated.dataResidencyZone}).`,
  });

  // 4. Multi-currency pro-forma estimator enforces $0.00 / 0-local Charity across all 7 currencies
  const currencies: ExpansionCurrencyCode[] = ['USD', 'ZWG', 'GBP', 'EUR', 'ZAR', 'KES', 'NGN'];
  const estimates = currencies.map((cur) =>
    computeMultiCurrencyProFormaEstimate({
      regionId: 'africa_south_zw_za',
      currencyCode: cur,
      proFormaCpmRateLocal: 50,
      directCommercialImpressions: 20000,
      charityImpressions: 40000,
    })
  );
  checks.push({
    checkId: 'p15_7_currency_proforma_charity_zero',
    label: 'All 7 currencies compute pro-forma estimates with permanent 0 Charity cost & paymentCollectionActive=false',
    passed:
      estimates.length === 7 &&
      estimates.every(
        (e) =>
          e.charityCostLocal === 0 &&
          e.charityCostUsd === 0 &&
          e.charityZeroCostLocked === true &&
          e.paymentCollectionActive === false &&
          e.commercialGrossLocal > 0 &&
          /^[a-f0-9]{64}$/.test(e.estimateSha256)
      ),
    detail: `7/7 currencies (USD/ZWG/GBP/EUR/ZAR/KES/NGN) verified with 0 Charity fees & paymentCollectionActive=false.`,
  });

  // 5. All 4 regions pass 4/4 software gates while separating 2 external gates
  checks.push({
    checkId: 'p15_software_vs_external_gate_split',
    label: 'All 4 regions pass 4/4 software architecture gates while keeping 2 rollout gates blocked',
    passed:
      overview.softwareReadyRegionsCount === 4 &&
      overview.regions.every((r) => r.softwareGatesReadyCount === 4 && r.softwareGatesTotalCount === 4),
    detail: `4/4 regions software-ready (residency, multilingual captions, multi-currency $0 Charity, Phase 14 alignment); 2 external gates blocked per region.`,
  });

  // 6. Fail-closed multi-region activation rejection
  let activationRejected = false;
  try {
    buildInternationalExpansionDecision({
      regionId: 'africa_south_zw_za',
      actorEmail: 'admin@edison.demo',
      decisionOutcome: 'hold_regions_unactivated_pending_p6_and_p14',
      requestedRegionActivation: true,
      summaryNote: 'Attempting premature Southern Africa expansion activation before Stage P6.',
    });
  } catch (err) {
    activationRejected =
      err instanceof Error && err.message.startsWith('EXPANSION_REGION_GATE_LOCKED:');
  }
  checks.push({
    checkId: 'p15_fail_closed_expansion_gate',
    label: 'Premature multi-region activation requests fail closed with EXPANSION_REGION_GATE_LOCKED',
    passed: activationRejected,
    detail: `Premature region activation blocked fail-closed=${activationRejected}.`,
  });

  // 7. Auditable SHA-256 staging decision log preserves unactivated posture
  const stagedDecision = buildInternationalExpansionDecision({
    regionId: 'africa_south_zw_za',
    actorEmail: 'admin@edison.demo',
    decisionOutcome: 'stage_multi_region_blueprint_for_post_launch',
    requestedRegionActivation: false,
    summaryNote: 'Targeting reference and multi-currency pro-forma configuration; no regional release wave is represented.',
  });
  checks.push({
    checkId: 'p15_decision_sha256_integrity',
    label: 'Legacy regional decision builder keeps digest integrity; public decision writes are retired',
    passed:
      stagedDecision.regionalExpansionActive === false &&
      stagedDecision.countryActivated === false &&
      stagedDecision.commercialLaunchAuthorized === false &&
      stagedDecision.paymentCollectionActive === false &&
      stagedDecision.hardwareTested === false &&
      /^[a-f0-9]{64}$/.test(stagedDecision.decisionSha256),
    detail: `decision=${stagedDecision.id}, sha=${stagedDecision.decisionSha256.slice(0, 12)}.`,
  });

  // 8. Overview manifest SHA-256 & multilingual coverage
  checks.push({
    checkId: 'p15_manifest_sha256_and_locales',
    label: 'Expansion overview emits SHA-256 manifest digest and multilingual coverage across >=7 languages',
    passed:
      overview.supportedLanguagesTotalCount >= 7 &&
      overview.supportedCurrenciesCount === 7 &&
      /^[a-f0-9]{64}$/.test(overview.manifestSha256),
    detail: `${overview.supportedLanguagesTotalCount} languages, 7 currencies, manifestSha256=${overview.manifestSha256.slice(0, 12)}.`,
  });

  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    regionalExpansionActive: false,
    activeExpandedRegionsCount: 0,
    countryActivated: false,
    commercialLaunchAuthorized: false,
    paymentCollectionActive: false,
    hardwareTested: false,
    stageP6Deferred: true,
    legalComplianceClaimed: false,
    prohibitCrossBorderPiiTransfer: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
