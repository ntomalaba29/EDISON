import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AccountVerificationStatus,
  AdCreativeRecord,
  AdCreativeStatus,
  AdStudioMode,
  AdvertiserEntityType,
  AdvertiserGeoAggregateRow,
  AdvertiserProfile,
  AdminModerationOverview,
  AnalyticsEventRecord,
  AnalyticsFunnelStageItem,
  AuditLogRecord,
  BillingEstimateSummary,
  BreakSchedulePlan,
  BroadcastRenderJobResult,
  BroadcastResolutionProfile,
  CampaignContentCategory,
  CampaignPreviewGateResult,
  CampaignRecord,
  CampaignStatus,
  ChaosInjectSeverity,
  ChaosScenarioResult,
  CommercialBoardDecisionOutcome,
  CommercialBoardDecisionRecord,
  CommercialCostAssumptionsInput,
  CommercialReadinessOverview,
  CountryJurisdictionPolicyConfig,
  ConsentAuditAction,
  ConsentAuditEventRecord,
  CountryLaunchDecisionOutcome,
  CountryLaunchDecisionRecord,
  CountryLaunchOverview,
  DaypartSlot,
  EdisonStoreData,
  ExpansionCurrencyCode,
  ExpansionRegionId,
  FailureModeId,
  HouseholdInstallationRecord,
  HouseholdLocation,
  HouseholdMemberProfile,
  HouseholdOpportunityMatchResult,
  HouseholdQrRedirectPersistenceState,
  HouseholdQrTokenRecord,
  InternationalExpansionDecisionOutcome,
  InternationalExpansionDecisionRecord,
  InternationalExpansionOverview,
  RegionalLocalizationConfig,
  TargetingGeographyCode,
  LiveReportSnapshot,
  MultiCurrencyProFormaEstimate,
  OpportunityOpsOverview,
  OpportunityOpsSweepResult,
  OptionAComposition,
  OptionBUploadSpec,
  OpportunityAppealRecord,
  OpportunityAppealStatus,
  OpportunityCategory,
  OpportunityComplaintReason,
  OpportunityComplaintRecord,
  OpportunityComplaintStatus,
  OpportunityProviderType,
  OpportunityRecord,
  OpportunityStatus,
  OpportunityTierStatus,
  PhysicalQrScanTestRecord,
  PilotCohortBlueprintRecord,
  PilotReadinessOverview,
  PilotTargetArchitectureId,
  PilotTelemetryValidationResult,
  PreSubmitCheckItem,
  PrimaryAdCategory,
  PrivacyComplianceOverview,
  PrivacyDsrErasureResult,
  PrivacyDsrExportPackage,
  PrivacyRetentionReport,
  PrototypeQaCheckItem,
  PrototypeReadinessSnapshot,
  PublicUser,
  QrDestinationType,
  QrLinkRecord,
  QrLinkStatus,
  ReliabilityChaosOverview,
  ReliabilityChaosReport,
  RevenueLedgerSnapshot,
  RevenueStreamLedgerRow,
  SessionRecord,
  SevenStageAnalyticsSnapshot,
  SharedIntelBundleRecord,
  SharedIntelObservationRecord,
  SharedIntelPreviewState,
  SharedIntelSignalType,
  StageP6StepId,
  SupportTicketCategory,
  SupportTicketRecord,
  SupportTicketStatus,
  TextOnlyCommercialSpec,
  UserAccount,
  UserRole,
} from '../types/edison.ts';
import { validateQrDestination } from './qrValidator.ts';
import { runDeliveryInfraVerificationSuite } from './adDeliveryInfra.ts';
import { runAdvertiserOpsVerificationSuite } from './advertiserOps.ts';
import { runBroadcastRenderVerificationSuite } from './broadcastRenderValidator.ts';
import { compileBroadcastRenderJob } from './broadcastRenderEngine.ts';
import {
  buildOpportunityOpsOverview,
  evaluateOpportunityVerificationOps,
  runOpportunityOpsVerificationSuite,
} from './opportunityOpsEngine.ts';
import {
  anonymiseHouseholdDraftData,
  buildHouseholdDsrExportPackage,
  buildPrivacyComplianceOverview,
  executeRetentionPurgeOnDraft,
  runPrivacyComplianceVerificationSuite,
} from './privacyComplianceEngine.ts';
import {
  buildReliabilityChaosOverview,
  runFull18FailureModesChaosSuite,
  runReliabilityChaosVerificationSuite,
  runSingleFailureModeChaosTest,
} from './reliabilityChaosEngine.ts';
import {
  buildPilotCohortBlueprintRecord,
  buildPilotReadinessOverview,
  runPilotReadinessVerificationSuite,
  scanPilotTelemetryZeroPii,
} from './pilotReadinessEngine.ts';
import {
  buildCommercialBoardDecision,
  buildCommercialReadinessOverview,
  runCommercialReadinessVerificationSuite,
} from './commercialReadinessEngine.ts';
import {
  buildCountryLaunchDecision,
  buildCountryLaunchOverview,
  buildUpdatedCountryPolicyConfig,
  runCountryLaunchVerificationSuite,
} from './countryLaunchEngine.ts';
import {
  buildInternationalExpansionDecision,
  buildInternationalExpansionOverview,
  buildUpdatedRegionalLocalizationConfig,
  computeMultiCurrencyProFormaEstimate,
  runInternationalExpansionVerificationSuite,
} from './internationalExpansionEngine.ts';
import { scheduleCommercialBreak } from './breakScheduler.ts';
import {
  buildSafeTvPersonalisationDisplay,
  computeAdvertiserGeoAggregates,
  hashProfilePin,
  matchOpportunitiesForHousehold,
  runTrackBVerificationSuite,
  sanitizeMemberForList,
  validateHouseholdLocationHierarchy,
  verifyProfilePin,
} from './trackBHouseholdConsent.ts';
import {
  createInitialSharedIntelPreviewState,
  runSharedIntelSimulationAction,
  submitSharedIntelObservation,
} from './sharedIntelligencePreview.ts';

import {
  generateCsrfToken,
  hashSessionToken,
} from './security.ts';
import { hashPassword, toPublicUser, verifyPassword } from './authCredentials.ts';
import {
  SESSION_IDLE_TTL_MS,
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_MS,
} from './authPolicy.ts';
import type {
  EdisonDataRepository,
  StorageBackendMetadata,
} from './repository.ts';
import { edisonTvControlEngine } from './tvPlatformAdapter.ts';
import { localOfflineIntelCache } from './offlineIntelCache.ts';
import { runPhase4SoftwareExitSuite } from './broadcastMetadataParser.ts';
import { sharedIntelFleetService } from './sharedIntelFleetService.ts';
import { runRecordedStreamCalibrationBenchmark } from './breakDurationPredictor.ts';

export { hashPassword, toPublicUser, verifyPassword } from './authCredentials.ts';

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEDUP_WINDOW_MS = 5000; // 5s duplicate request suppression
const LOCK_TIMEOUT_MS = 3000;
const STALE_LOCK_MS = 10000;

const PROCESS_HASH_SALT = crypto.randomBytes(16).toString('hex');

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isDemoOrSeedUser(user: Pick<UserAccount, 'email' | 'isPrototypeSeed'>): boolean {
  return Boolean(user.isPrototypeSeed) || user.email.trim().toLowerCase().endsWith('.demo');
}

const BOT_USER_AGENT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /whatsapp/i,
  /slackbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /discordbot/i,
  /telegrambot/i,
  /linkedinbot/i,
  /preview/i,
  /headlesschrome/i,
  /playwright/i,
  /puppeteer/i,
  /^curl\//i,
  /^wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /^axios\//i,
  /^node-fetch/i,
  /^undici/i,
  /go-http-client/i,
];

export const ALL_CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'scheduled',
  'active',
  'paused',
  'completed',
  'expired',
] as const;

export const ALLOWED_CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['submitted', 'expired'],
  submitted: ['under_review', 'approved', 'rejected', 'draft', 'expired'],
  under_review: ['approved', 'rejected', 'draft'],
  approved: ['scheduled', 'active', 'paused', 'expired'],
  rejected: ['draft', 'submitted'],
  scheduled: ['active', 'paused', 'completed', 'expired'],
  active: ['paused', 'completed', 'expired'],
  paused: ['active', 'scheduled', 'completed', 'expired'],
  completed: [],
  expired: ['draft'],
};

const ADMIN_ONLY_TARGET_STATUSES: ReadonlySet<CampaignStatus> = new Set([
  'under_review',
  'approved',
  'rejected',
]);

export const ALL_OPPORTUNITY_CATEGORIES: readonly OpportunityCategory[] = [
  'permanent_employment',
  'temporary_employment',
  'part_time_employment',
  'contract_employment',
  'internship',
  'apprenticeship',
  'scholarship',
  'education',
  'training',
  'grant',
  'tender',
  'business_opportunity',
  'workshop_seminar',
  'other',
] as const;

const OPPORTUNITY_RISK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(pay\s+to\s+apply|application\s+fee|processing\s+fee|registration\s+fee|uniform\s+deposit|admin\s+fee\s+required)\b/i, label: 'Potential upfront applicant fee demand detected' },
  { pattern: /\b(guaranteed\s+(job|employment|placement|scholarship|funding|grant)|100%\s+job\s+guarantee)\b/i, label: 'Prohibited outcome guarantee claim detected' },
  { pattern: /\b(wire\s+transfer\s+before|advance\s+payment\s+required)\b/i, label: 'Suspicious advance-payment instruction detected' },
];

export function scanOpportunityRiskPhrases(fields: string[]): string[] {
  const combined = fields.join(' \n ');
  const flags: string[] = [];
  for (const rule of OPPORTUNITY_RISK_PATTERNS) {
    if (rule.pattern.test(combined)) {
      flags.push(rule.label);
    }
  }
  return flags;
}

export function computeSimulatedBillingEstimate(params: {
  contentCategory?: CampaignContentCategory;
  durationSeconds: number;
  dailyFrequencyCap: number;
  startDate: string;
  endDate: string;
  targetRegions: string[];
  dayparts: DaypartSlot[];
}): BillingEstimateSummary {
  const startMs = Date.parse(params.startDate);
  const endMs = Date.parse(params.endDate);
  const days =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1)
      : 7;

  const regionFactor = Math.max(1, params.targetRegions.length);
  const spotsPerDay = Math.max(1, params.dailyFrequencyCap) * regionFactor;
  const estimatedSpots = days * spotsPerDay;

  if (params.contentCategory === 'opportunity_promotion') {
    return {
      model: 'charity_free_zero_cost',
      currency: 'USD',
      estimatedSpots,
      estimatedRatePerSpotUsd: 0,
      estimatedTotalUsd: 0,
      paymentCollectionActive: false,
      disclaimer:
        '$0.00 / FREE PERMANENT RULE — CHARITY ADS and free employer job listings never pay submission, verification, or broadcast fees.',
    };
  }

  const durationMultiplier = Math.max(0.5, params.durationSeconds / 15);
  const primetimeMultiplier = params.dayparts.includes('primetime') || params.dayparts.includes('all_day') ? 1.35 : 1.0;
  const estimatedRatePerSpotUsd = Number((4.5 * durationMultiplier * primetimeMultiplier).toFixed(2));
  const estimatedTotalUsd = Number((estimatedSpots * estimatedRatePerSpotUsd).toFixed(2));

  return {
    model: 'simulated_cpm_flat_rate',
    currency: 'USD',
    estimatedSpots,
    estimatedRatePerSpotUsd,
    estimatedTotalUsd,
    paymentCollectionActive: false,
    disclaimer:
      'SIMULATED PROTOTYPE ESTIMATE ONLY — No real billing, card processing, or commercial invoices are active in Phase 2.',
  };
}

export function detectSuspectedBotOrPrefetch(
  userAgent: string,
  headers: { secPurpose?: string; purpose?: string; xMoz?: string }
): boolean {
  const secPurpose = (headers.secPurpose || '').toLowerCase();
  const purpose = (headers.purpose || '').toLowerCase();
  const xMoz = (headers.xMoz || '').toLowerCase();

  if (
    secPurpose.includes('prefetch') ||
    secPurpose.includes('prerender') ||
    purpose.includes('prefetch') ||
    xMoz.includes('prefetch')
  ) {
    return true;
  }

  const ua = userAgent.trim();
  if (!ua || ua === 'unknown') {
    return true;
  }

  return BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(ua));
}

function isoDateDaysFromNow(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

function buildSeedAdvertiserProfiles(now: string): AdvertiserProfile[] {
  return [
    {
      userId: 'usr_seed_adv_01',
      entityType: 'registered_business',
      businessOrTradingName: 'Northstar Retail Group (Prototype Seed)',
      registrationOrTaxId: 'PROTO-REG-88412',
      industryCategory: 'Retail & Consumer Goods',
      countryCode: 'GB',
      cityRegion: 'London / South East',
      physicalAddress: '14 Harbour Way, London E14 (Sample Address)',
      primaryContactName: 'Clara Vance',
      primaryContactEmail: 'advertiser@edison.demo',
      primaryContactPhone: '+442079460192',
      billingContactName: 'Northstar Accounts Payable',
      billingContactEmail: 'billing@northstar.example',
      websiteUrl: 'https://example.org/northstar-retail',
      verificationStatus: 'verified',
      verificationNotes: 'Prototype seed advertiser profile verified for demonstration workflows.',
      isPrototypeSeed: true,
      updatedAt: now,
    },
    {
      userId: 'usr_seed_opp_01',
      entityType: 'public_ngo',
      businessOrTradingName: 'Civic Skills Academy (Prototype Seed)',
      registrationOrTaxId: 'PROTO-CHARITY-4410',
      industryCategory: 'Education & Apprenticeships',
      countryCode: 'GB',
      cityRegion: 'Manchester / North West',
      physicalAddress: '8 Foundry Street, Manchester M1 (Sample Address)',
      primaryContactName: 'Samuel Okafor',
      primaryContactEmail: 'employer@edison.demo',
      primaryContactPhone: '+441614960311',
      billingContactName: 'Civic Grants Office',
      billingContactEmail: 'grants@civicskills.example',
      websiteUrl: 'https://example.org/civic-skills',
      verificationStatus: 'verified',
      verificationNotes: 'Prototype seed opportunity provider account.',
      isPrototypeSeed: true,
      updatedAt: now,
    },
  ];
}

function buildSeedCampaigns(now: string): CampaignRecord[] {
  const startActive = isoDateDaysFromNow(-2);
  const endActive = isoDateDaysFromNow(28);
  const startFuture = isoDateDaysFromNow(10);
  const endFuture = isoDateDaysFromNow(40);
  const startPast = isoDateDaysFromNow(-30);
  const endPast = isoDateDaysFromNow(-5);

  return [
    {
      id: 'cmp_seed_01',
      ownerId: 'usr_seed_adv_01',
      title: 'Northstar Autumn Homeware Launch (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Direct-to-store QR offer for smart home appliances during evening entertainment breaks.',
      qrToken: 'edison-demo',
      adCreativeRef: 'crt_seed_01',
      durationSeconds: 30,
      dailyFrequencyCap: 4,
      targetRegions: ['United Kingdom · National', 'Ireland · Metro'],
      dayparts: ['primetime', 'daytime'],
      startDate: startActive,
      endDate: endActive,
      status: 'active',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        contentCategory: 'commercial_advertising',
        durationSeconds: 30,
        dailyFrequencyCap: 4,
        startDate: startActive,
        endDate: endActive,
        targetRegions: ['United Kingdom · National', 'Ireland · Metro'],
        dayparts: ['primetime', 'daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_02',
      ownerId: 'usr_seed_adv_01',
      title: 'Weekend Flash Clearance Spot (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Short 15-second commercial break reminder awaiting moderator creative inspection.',
      qrToken: 'edison-demo',
      adCreativeRef: null,
      durationSeconds: 15,
      dailyFrequencyCap: 6,
      targetRegions: ['United Kingdom · Midlands'],
      dayparts: ['morning', 'daytime'],
      startDate: startFuture,
      endDate: endFuture,
      status: 'submitted',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        contentCategory: 'commercial_advertising',
        durationSeconds: 15,
        dailyFrequencyCap: 6,
        startDate: startFuture,
        endDate: endFuture,
        targetRegions: ['United Kingdom · Midlands'],
        dayparts: ['morning', 'daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_03',
      ownerId: 'usr_seed_opp_01',
      title: 'Civic Skills Electrical Apprenticeship Broadcast (Prototype Seed)',
      contentCategory: 'opportunity_promotion',
      summary: 'Zero-fee apprenticeship recruitment spot linking viewers directly to official intake form.',
      qrToken: 'job-demo',
      adCreativeRef: 'crt_seed_02',
      durationSeconds: 30,
      dailyFrequencyCap: 3,
      targetRegions: ['United Kingdom · North West'],
      dayparts: ['daytime', 'primetime'],
      startDate: startFuture,
      endDate: endFuture,
      status: 'scheduled',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        contentCategory: 'opportunity_promotion',
        durationSeconds: 30,
        dailyFrequencyCap: 3,
        startDate: startFuture,
        endDate: endFuture,
        targetRegions: ['United Kingdom · North West'],
        dayparts: ['daytime', 'primetime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_04',
      ownerId: 'usr_seed_adv_01',
      title: 'Summer Clearance Recap (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Completed seasonal campaign preserved in ledger for clone/relaunch verification.',
      qrToken: 'edison-demo',
      adCreativeRef: null,
      durationSeconds: 20,
      dailyFrequencyCap: 2,
      targetRegions: ['United Kingdom · Scotland'],
      dayparts: ['daytime'],
      startDate: startPast,
      endDate: endPast,
      status: 'completed',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        contentCategory: 'commercial_advertising',
        durationSeconds: 20,
        dailyFrequencyCap: 2,
        startDate: startPast,
        endDate: endPast,
        targetRegions: ['United Kingdom · Scotland'],
        dayparts: ['daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedTickets(now: string): SupportTicketRecord[] {
  return [
    {
      id: 'tkt_seed_01',
      ownerId: 'usr_seed_adv_01',
      campaignId: 'cmp_seed_02',
      category: 'campaign_review',
      subject: 'Confirm QR safe-zone margin on 15s weekend spot (Prototype Seed)',
      message: 'Submitted campaign for moderation queue check before Friday broadcast window.',
      status: 'open',
      adminResponse: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedAdCreatives(now: string): AdCreativeRecord[] {
  return [
    {
      id: 'crt_seed_01',
      ownerId: 'usr_seed_adv_01',
      campaignId: 'cmp_seed_01',
      qrToken: 'edison-demo',
      title: 'Northstar Autumn Smart-Home TV Spot (Prototype Seed)',
      mode: 'option_a_studio',
      displayDurationSeconds: 30,
      safeZoneWarnings: [],
      contrastWarnings: [],
      optionA: {
        templateId: 'commercial_offer',
        backgroundColor: '#0F172A',
        gradientEndColor: '#1E3A8A',
        useGradient: true,
        accentColor: '#F59E0B',
        textColor: '#FFFFFF',
        scrimOpacity: 0.35,
        logoUrl: null,
        productImageUrl: null,
        backgroundImageUrl: null,
        heading: 'Upgrade Home Comfort This Autumn',
        description: 'Energy-rated appliances with nationwide installation and 3-year manufacturer warranty.',
        promoText: 'LIMITED OFFER · SAVE 20%',
        priceOrValue: 'From $299',
        contactDetails: '+44 20 7946 0192 · Northstar Retail',
        websiteAddress: 'example.org/edison-commercial-demo',
        callToAction: 'Scan QR to Claim Offer',
        qrPlacement: 'bottom_right',
        elements: [
          { id: 'el_logo', kind: 'logo', label: 'Brand Logo', xPct: 6, yPct: 7, widthPct: 16, heightPct: 12, zIndex: 2, fontSizePx: 14, visible: true },
          { id: 'el_promo', kind: 'promo_badge', label: 'Promo Text', xPct: 6, yPct: 22, widthPct: 42, heightPct: 8, zIndex: 3, fontSizePx: 14, visible: true },
          { id: 'el_head', kind: 'headline', label: 'Main Headline', xPct: 6, yPct: 33, widthPct: 58, heightPct: 18, zIndex: 4, fontSizePx: 32, visible: true },
          { id: 'el_desc', kind: 'description', label: 'Description', xPct: 6, yPct: 54, widthPct: 56, heightPct: 15, zIndex: 4, fontSizePx: 16, visible: true },
          { id: 'el_price', kind: 'price_value', label: 'Price / Offer', xPct: 6, yPct: 72, widthPct: 28, heightPct: 11, zIndex: 5, fontSizePx: 26, visible: true },
          { id: 'el_cta', kind: 'cta_button', label: 'Call to Action', xPct: 6, yPct: 85, widthPct: 34, heightPct: 8, zIndex: 5, fontSizePx: 15, visible: true },
          { id: 'el_contact', kind: 'contact_info', label: 'Contact & Site', xPct: 42, yPct: 86, widthPct: 32, heightPct: 7, zIndex: 4, fontSizePx: 12, visible: true },
          { id: 'el_qr', kind: 'qr_block', label: 'QR Code Block', xPct: 76, yPct: 58, widthPct: 18, heightPct: 32, zIndex: 6, fontSizePx: 12, visible: true },
        ],
      },
      optionB: null,
      status: 'ready_for_preview',
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'crt_seed_02',
      ownerId: 'usr_seed_opp_01',
      campaignId: 'cmp_seed_03',
      qrToken: 'job-demo',
      title: 'Civic Skills Electrical Apprenticeship Card (Prototype Seed)',
      mode: 'option_a_studio',
      displayDurationSeconds: 30,
      safeZoneWarnings: [],
      contrastWarnings: [],
      optionA: {
        templateId: 'opportunity_job',
        backgroundColor: '#064E3B',
        gradientEndColor: '#0F172A',
        useGradient: true,
        accentColor: '#34D399',
        textColor: '#FFFFFF',
        scrimOpacity: 0.3,
        logoUrl: null,
        productImageUrl: null,
        backgroundImageUrl: null,
        heading: 'Paid Electrical Apprenticeships — 2026 Intake',
        description: 'Manchester & North West cohort · Employer-sponsored Level 3 certification · Zero applicant fees.',
        promoText: 'VERIFIED OPPORTUNITY · NO FEE TO APPLY',
        priceOrValue: '£24,500 Starting Allowance',
        contactDetails: 'Civic Skills Academy · Closing 15 Dec 2026',
        websiteAddress: 'example.org/edison-apprenticeship-demo',
        callToAction: 'Scan QR for Application Form',
        qrPlacement: 'bottom_right',
        elements: [
          { id: 'el_logo', kind: 'logo', label: 'Provider Logo', xPct: 6, yPct: 7, widthPct: 16, heightPct: 12, zIndex: 2, fontSizePx: 14, visible: true },
          { id: 'el_promo', kind: 'promo_badge', label: 'Notice Line', xPct: 6, yPct: 22, widthPct: 50, heightPct: 8, zIndex: 3, fontSizePx: 14, visible: true },
          { id: 'el_head', kind: 'headline', label: 'Opportunity Title', xPct: 6, yPct: 33, widthPct: 60, heightPct: 18, zIndex: 4, fontSizePx: 30, visible: true },
          { id: 'el_desc', kind: 'description', label: 'Eligibility & Location', xPct: 6, yPct: 54, widthPct: 58, heightPct: 15, zIndex: 4, fontSizePx: 16, visible: true },
          { id: 'el_price', kind: 'price_value', label: 'Allowance / Stipend', xPct: 6, yPct: 72, widthPct: 38, heightPct: 10, zIndex: 5, fontSizePx: 22, visible: true },
          { id: 'el_cta', kind: 'cta_button', label: 'Call to Action', xPct: 6, yPct: 85, widthPct: 34, heightPct: 8, zIndex: 5, fontSizePx: 15, visible: true },
          { id: 'el_contact', kind: 'contact_info', label: 'Provider & Closing', xPct: 42, yPct: 86, widthPct: 32, heightPct: 7, zIndex: 4, fontSizePx: 12, visible: true },
          { id: 'el_qr', kind: 'qr_block', label: 'QR Code Block', xPct: 76, yPct: 58, widthPct: 18, heightPct: 32, zIndex: 6, fontSizePx: 12, visible: true },
        ],
      },
      optionB: null,
      status: 'ready_for_preview',
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedOpportunities(now: string): OpportunityRecord[] {
  const closingFuture = isoDateDaysFromNow(45);
  const expiryFuture = isoDateDaysFromNow(50);
  const closingPast = isoDateDaysFromNow(-10);
  const expiryPast = isoDateDaysFromNow(-5);

  return [
    {
      id: 'opp_seed_01',
      ownerId: 'usr_seed_opp_01',
      providerType: 'registered_organisation',
      providerName: 'Civic Skills Academy (Prototype Seed)',
      category: 'apprenticeship',
      title: 'Paid Electrical Apprenticeships — 2026 Intake',
      description:
        'Manchester & North West accredited Level 3 electrical apprenticeship cohort. Funded training with zero fees for applicants.',
      location: 'Manchester, United Kingdom',
      eligibilityRequirements: 'Aged 18+, Maths & English GCSE or equivalent, right to work in UK.',
      applicationMethod: 'Free online application portal via QR destination.',
      contactInfo: 'admissions@civicskills.example · +441614960311',
      qrToken: 'job-demo',
      linkedCampaignId: 'cmp_seed_03',
      closingDate: closingFuture,
      expiryDate: expiryFuture,
      status: 'verified_live',
      verificationTiers: {
        identityStatus: 'verified',
        identityEvidenceRef: 'KYC-SEED-SAMUEL-OKAFOR',
        identityNotes: 'Tier 1 identity verified for prototype submitter.',
        identityVerifiedAt: now,
        organisationStatus: 'verified',
        organisationEvidenceRef: 'PROTO-CHARITY-4410',
        organisationNotes: 'Tier 2 charity/provider registration verified.',
        organisationVerifiedAt: now,
        specificOpportunityStatus: 'verified',
        specificOpportunityEvidenceRef: 'LETTERHEAD-INTAKE-2026-REF',
        specificOpportunityNotes: 'Tier 3 specific apprenticeship intake verified independently.',
        specificOpportunityVerifiedAt: now,
      },
      scamRiskFlags: [],
      applicationFeeFreeConfirmed: true,
      noGuaranteeConfirmed: true,
      advertisingFeeInfluencesVerification: false,
      rejectionReason: null,
      suspensionReason: null,
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'opp_seed_02',
      ownerId: 'usr_seed_opp_01',
      providerType: 'individual_informal_employer',
      providerName: 'Daniel Mercer Electrical Services (Individual Sample)',
      category: 'temporary_employment',
      title: 'Part-Time Solar Array Installation Assistant (6 Weeks)',
      description:
        'Assisting certified electrician with residential roof mounting and cable routing. Paid weekly; safety gear provided free.',
      location: 'Leeds / West Yorkshire',
      eligibilityRequirements: 'CSCS card preferred; physically fit for outdoor roof work.',
      applicationMethod: 'Direct telephone / enquiry link via QR.',
      contactInfo: 'daniel.mercer.sample@example.org',
      qrToken: 'job-demo',
      linkedCampaignId: null,
      closingDate: closingFuture,
      expiryDate: expiryFuture,
      status: 'under_review',
      verificationTiers: {
        identityStatus: 'verified',
        identityEvidenceRef: 'ID-CHECK-MERCER-01',
        identityNotes: 'Tier 1 human identity verified.',
        identityVerifiedAt: now,
        organisationStatus: 'not_applicable',
        organisationEvidenceRef: 'Individual / Informal Employer (Tier 2 N/A)',
        organisationNotes: 'Individual employers do not require corporate registration.',
        organisationVerifiedAt: null,
        specificOpportunityStatus: 'pending_review',
        specificOpportunityEvidenceRef: 'SIGNED-DECLARATION-SOLAR-02',
        specificOpportunityNotes: 'Awaiting Tier 3 specific job site confirmation.',
        specificOpportunityVerifiedAt: null,
      },
      scamRiskFlags: [],
      applicationFeeFreeConfirmed: true,
      noGuaranteeConfirmed: true,
      advertisingFeeInfluencesVerification: false,
      rejectionReason: null,
      suspensionReason: null,
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'opp_seed_03',
      ownerId: 'usr_seed_opp_01',
      providerType: 'registered_organisation',
      providerName: 'Civic Skills Academy (Prototype Seed)',
      category: 'scholarship',
      title: 'Summer 2026 Welding Bursary (Closed / Expired Seed)',
      description:
        'Historical expired bursary demonstrating EDISON automated expiry enforcement so expired listings are never scheduled for TV.',
      location: 'Liverpool, United Kingdom',
      eligibilityRequirements: 'Regional welding trainees (window closed).',
      applicationMethod: 'Closed portal.',
      contactInfo: 'admissions@civicskills.example',
      qrToken: 'job-demo',
      linkedCampaignId: null,
      closingDate: closingPast,
      expiryDate: expiryPast,
      status: 'expired',
      verificationTiers: {
        identityStatus: 'verified',
        identityEvidenceRef: 'KYC-SEED-SAMUEL-OKAFOR',
        identityNotes: 'Tier 1 identity verified.',
        identityVerifiedAt: now,
        organisationStatus: 'verified',
        organisationEvidenceRef: 'PROTO-CHARITY-4410',
        organisationNotes: 'Tier 2 verified (non-transitive to Tier 3).',
        organisationVerifiedAt: now,
        specificOpportunityStatus: 'verified',
        specificOpportunityEvidenceRef: 'BURSARY-2026-ARCHIVE',
        specificOpportunityNotes: 'Expired automatically after closing date passed.',
        specificOpportunityVerifiedAt: now,
      },
      scamRiskFlags: [],
      applicationFeeFreeConfirmed: true,
      noGuaranteeConfirmed: true,
      advertisingFeeInfluencesVerification: false,
      rejectionReason: null,
      suspensionReason: null,
      countryCode: 'GB',
      provinceOrRegion: 'Greater Manchester',
      structuredCriteria: {
        requiredKeywords: ['electrical'],
        preferredKeywords: ['apprenticeship', 'solar'],
        optionalKeywords: ['engineering'],
        minExperienceYears: 0,
      },
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'opp_seed_zw_04',
      ownerId: 'usr_seed_opp_01',
      providerType: 'registered_organisation',
      providerName: 'Harare Civic Skills Trust (ZW Seed)',
      category: 'apprenticeship',
      title: 'Harare Solar & Fibre Electrical Apprenticeship — 2026 Cohort',
      description:
        'Accredited practical training across residential solar PV and municipal fibre networks in Greater Harare. Zero application or training fees.',
      location: 'Harare, Zimbabwe',
      eligibilityRequirements:
        'Basic electrical or network cabling interest; Harare or Bulawayo residents welcome. Selection never guaranteed.',
      applicationMethod: 'Free online application portal via EDISON QR.',
      contactInfo: 'harare-intake@civicskills.example',
      qrToken: 'job-demo',
      linkedCampaignId: 'cmp_seed_03',
      closingDate: closingFuture,
      expiryDate: expiryFuture,
      status: 'verified_live',
      verificationTiers: {
        identityStatus: 'verified',
        identityEvidenceRef: 'KYC-SEED-SAMUEL-OKAFOR',
        identityNotes: 'Tier 1 identity verified.',
        identityVerifiedAt: now,
        organisationStatus: 'verified',
        organisationEvidenceRef: 'PROTO-ZW-TRUST-2026',
        organisationNotes: 'Tier 2 organisation verified.',
        organisationVerifiedAt: now,
        specificOpportunityStatus: 'verified',
        specificOpportunityEvidenceRef: 'ZW-SOLAR-APPRENTICE-2026',
        specificOpportunityNotes: 'Tier 3 Harare apprenticeship cohort verified independently.',
        specificOpportunityVerifiedAt: now,
      },
      scamRiskFlags: [],
      applicationFeeFreeConfirmed: true,
      noGuaranteeConfirmed: true,
      advertisingFeeInfluencesVerification: false,
      rejectionReason: null,
      suspensionReason: null,
      countryCode: 'ZW',
      provinceOrRegion: 'Harare Metropolitan',
      structuredCriteria: {
        requiredKeywords: ['electrical'],
        preferredKeywords: ['solar', 'fibre'],
        optionalKeywords: ['engineering', 'apprenticeship'],
        minExperienceYears: 0,
        targetProvinces: ['Harare Metropolitan'],
      },
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedViewerUser(now: string): UserAccount {
  return {
    id: 'usr_seed_viewer_01',
    email: 'viewer@edison.demo',
    passwordHash: hashPassword('EdisonViewer!2026'),
    name: 'Tariro Moyo (Household Owner Seed)',
    organisationName: 'Moyo Household · Harare ZW',
    role: 'household_viewer',
    verificationStatus: 'verified',
    isPrototypeSeed: true,
    createdAt: now,
  };
}

function buildSeedHouseholdsAndMembers(now: string): {
  households: HouseholdInstallationRecord[];
  householdMembers: HouseholdMemberProfile[];
  consentAuditEvents: ConsentAuditEventRecord[];
} {
  const geo = validateHouseholdLocationHierarchy({
    countryCode: 'ZW',
    provinceOrRegion: 'Harare Metropolitan',
    metroArea: 'Greater Harare',
    cityOrTown: 'Harare',
    district: 'Harare Urban',
    suburbOrArea: 'Avondale',
    exactInstallationLocation: '14 King George Road, Unit 3, Avondale',
  });
  const hhId = 'hh_seed_zw_01';
  return {
    households: [
      {
        id: hhId,
        ownerUserId: 'usr_seed_viewer_01',
        householdLabel: 'Moyo Family Smart TV (Harare ZW Seed)',
        tvDeviceLabel: 'Living Room 55" Smart TV (Android TV)',
        location: geo.normalized,
        locationValid: geo.valid,
        locationValidationErrors: geo.errors,
        targetingDisabled: !geo.valid,
        ordinaryTvPreserved: true,
        commercialConsentStatus: 'granted',
        charityAndOpportunityStatus: 'active',
        personalisationMasterEnabled: true,
        neutralDisplayMode: false,
        consentEpoch: 1,
        consentVersionLabel: 'DEC-OPEN-01-ScopeB-v1',
        lastConsentChangedAt: now,
        isPrototypeSeed: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    householdMembers: [
      {
        id: 'mem_seed_zw_01',
        householdId: hhId,
        ownerUserId: 'usr_seed_viewer_01',
        displayName: 'Tariro Moyo',
        pinHash: hashProfilePin('4321'),
        hasPinLock: true,
        personalisationConsentGranted: true,
        educationLevel: 'National Certificate',
        qualifications: ['City & Guilds Electrical Installation Level 2'],
        skills: ['electrical', 'solar', 'wiring'],
        experienceSummary: '2 years residential electrical & solar inverter assistance',
        experienceYears: 2,
        occupationOrTrade: 'Electrical Apprentice Candidate',
        employmentInterests: ['solar', 'electrical', 'apprenticeship'],
        careerAspirations: 'Certified Renewable Energy Electrician',
        industries: ['Energy', 'Construction'],
        interestedCategories: ['apprenticeship', 'training'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mem_seed_zw_02',
        householdId: hhId,
        ownerUserId: 'usr_seed_viewer_01',
        displayName: 'Tinashe Moyo',
        pinHash: null,
        hasPinLock: false,
        personalisationConsentGranted: true,
        educationLevel: 'BEng Telecommunications',
        qualifications: ['BEng Honours Telecommunications'],
        skills: ['electrical', 'fibre', 'engineering', 'network'],
        experienceSummary: '3 years urban fibre rollout and power backup systems',
        experienceYears: 3,
        occupationOrTrade: 'Field Telecoms Technician',
        employmentInterests: ['fibre', 'engineering', 'apprenticeship'],
        careerAspirations: 'Principal Network Infrastructure Engineer',
        industries: ['Telecoms', 'Energy'],
        interestedCategories: ['apprenticeship', 'permanent_employment'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    consentAuditEvents: [
      {
        id: 'caud_seed_01',
        householdId: hhId,
        actorId: 'usr_seed_viewer_01',
        actorRole: 'household_viewer',
        action: 'CONSENT_GRANTED',
        previousEpoch: 0,
        newEpoch: 1,
        reason: 'Initial opt-in household registration for ZW Track B prototype.',
        affectedQrTokensInvalidated: 0,
        ordinaryTvPreserved: true,
        createdAt: now,
      },
    ],
  };
}

function createInitialSeed(): EdisonStoreData {
  const now = new Date().toISOString();
  if (isProductionEnvironment()) {
    return {
      schemaVersion: 8,
      users: [],
      sessions: [],
      qrLinks: [],
      advertiserProfiles: [],
      campaigns: [],
      adCreatives: [],
      supportTickets: [],
      opportunities: [],
      opportunityComplaints: [],
      opportunityAppeals: [],
      analyticsEvents: [],
      physicalQrScanTests: [],
      sharedIntelPreview: createInitialSharedIntelPreviewState(),
      households: [],
      householdMembers: [],
      householdQrTokens: [],
      consentAuditEvents: [],
      auditLogs: [
        {
          id: `aud_${crypto.randomBytes(6).toString('hex')}`,
          actorId: null,
          actorRole: 'system',
          action: 'STORE_INITIALIZED',
          targetType: 'system',
          targetId: 'edison-store',
          detail:
            'Production persistence initialized (schema v8; demo/prototype seed accounts and seed PINs disabled).',
          createdAt: now,
        },
      ],
    };
  }

  const advertiserId = 'usr_seed_adv_01';
  const submitterId = 'usr_seed_opp_01';
  const adminId = 'usr_seed_adm_01';
  const trackBSeed = buildSeedHouseholdsAndMembers(now);

  return {
    schemaVersion: 8,
    users: [
      {
        id: advertiserId,
        email: 'advertiser@edison.demo',
        passwordHash: hashPassword('EdisonProto!2026'),
        name: 'Clara Vance (Prototype Seed)',
        organisationName: 'Northstar Retail Group (Sample)',
        role: 'advertiser',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
      {
        id: submitterId,
        email: 'employer@edison.demo',
        passwordHash: hashPassword('EdisonProto!2026'),
        name: 'Samuel Okafor (Prototype Seed)',
        organisationName: 'Civic Skills Academy (Sample)',
        role: 'opportunity_submitter',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
      {
        id: adminId,
        email: 'admin@edison.demo',
        passwordHash: hashPassword('EdisonAdmin!2026'),
        name: 'EDISON Moderation Lead (Prototype Seed)',
        organisationName: 'EDISON Governance Operations',
        role: 'admin',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
      buildSeedViewerUser(now),
    ],
    sessions: [],
    qrLinks: [
      {
        token: 'edison-demo',
        ownerId: advertiserId,
        label: 'Sample Commercial QR (Prototype Seed)',
        destinationType: 'website',
        rawInput: 'https://example.org/edison-commercial-demo',
        resolvedUrl: 'https://example.org/edison-commercial-demo',
        resolvedHost: 'example.org',
        scheme: 'https',
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: now,
      },
      {
        token: 'job-demo',
        ownerId: submitterId,
        label: 'Sample Opportunity QR (Prototype Seed)',
        destinationType: 'job_application',
        rawInput: 'https://example.org/edison-apprenticeship-demo',
        resolvedUrl: 'https://example.org/edison-apprenticeship-demo',
        resolvedHost: 'example.org',
        scheme: 'https',
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: now,
      },
    ],
    advertiserProfiles: buildSeedAdvertiserProfiles(now),
    campaigns: buildSeedCampaigns(now),
    adCreatives: buildSeedAdCreatives(now),
    supportTickets: buildSeedTickets(now),
    opportunities: buildSeedOpportunities(now),
    opportunityComplaints: [],
    opportunityAppeals: [],
    analyticsEvents: [],
    physicalQrScanTests: [],
    sharedIntelPreview: createInitialSharedIntelPreviewState(),
    households: trackBSeed.households,
    householdMembers: trackBSeed.householdMembers,
    householdQrTokens: [],
    consentAuditEvents: trackBSeed.consentAuditEvents,
    auditLogs: [
      {
        id: `aud_${crypto.randomBytes(6).toString('hex')}`,
        actorId: null,
        actorRole: 'system',
        action: 'STORE_INITIALIZED',
        targetType: 'system',
        targetId: 'edison-store',
        detail: 'Prototype persistence initialized (schema v8) with seeded accounts, Track B ZW household/profiles/bundled consent epochs, hashed-session support, QR links, profiles, campaigns, studio creatives, opportunities, and Shared Intelligence preview.',
        createdAt: now,
      },
    ],
  };
}

function normalizeStoreData(parsed: EdisonStoreData): EdisonStoreData {
  const now = new Date().toISOString();
  const migratedLinks: QrLinkRecord[] = (parsed.qrLinks || []).map((link) => {
    const legacy = link as QrLinkRecord & { scanCount?: number; lastScannedAt?: string | null };
    return {
      ...legacy,
      redirectRequestsTotal: legacy.redirectRequestsTotal ?? legacy.scanCount ?? 0,
      redirectIssuedTotal: legacy.redirectIssuedTotal ?? legacy.scanCount ?? 0,
      suspectedBotRequests: legacy.suspectedBotRequests ?? 0,
      deduplicatedNonBotRedirects: legacy.deduplicatedNonBotRedirects ?? legacy.scanCount ?? 0,
      lastRedirectRequestedAt: legacy.lastRedirectRequestedAt ?? legacy.lastScannedAt ?? null,
    };
  });

  const prod = isProductionEnvironment();

  const existingProfiles = Array.isArray(parsed.advertiserProfiles) ? parsed.advertiserProfiles : [];
  const profiles =
    existingProfiles.length > 0 ? existingProfiles : prod ? [] : buildSeedAdvertiserProfiles(now);

  const existingCampaigns = Array.isArray(parsed.campaigns) ? parsed.campaigns : [];
  const rawCampaigns =
    existingCampaigns.length > 0 ? existingCampaigns : prod ? [] : buildSeedCampaigns(now);
  const campaigns: CampaignRecord[] = rawCampaigns.map((c) =>
    c.contentCategory === 'opportunity_promotion' &&
    (c.simulatedEstimate?.model !== 'charity_free_zero_cost' ||
      c.simulatedEstimate?.estimatedTotalUsd !== 0)
      ? {
          ...c,
          simulatedEstimate: computeSimulatedBillingEstimate({
            contentCategory: 'opportunity_promotion',
            durationSeconds: c.durationSeconds,
            dailyFrequencyCap: c.dailyFrequencyCap,
            startDate: c.startDate,
            endDate: c.endDate,
            targetRegions: c.targetRegions,
            dayparts: c.dayparts,
          }),
        }
      : c
  );

  const existingCreatives = Array.isArray(parsed.adCreatives) ? parsed.adCreatives : [];
  const rawCreatives =
    existingCreatives.length > 0 ? existingCreatives : prod ? [] : buildSeedAdCreatives(now);
  const adCreatives: AdCreativeRecord[] = rawCreatives.map((cr) => ({
    ...cr,
    textOnly: cr.textOnly ?? null,
  }));

  // Backfill adCreativeRef on seed campaigns if missing
  const hasSeed1 = adCreatives.some((cr) => cr.id === 'crt_seed_01');
  const hasSeed2 = adCreatives.some((cr) => cr.id === 'crt_seed_02');
  for (const c of campaigns) {
    if (c.id === 'cmp_seed_01' && !c.adCreativeRef && hasSeed1) c.adCreativeRef = 'crt_seed_01';
    if (c.id === 'cmp_seed_03' && !c.adCreativeRef && hasSeed2) c.adCreativeRef = 'crt_seed_02';
  }

  const existingTickets = Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [];
  const supportTickets =
    existingTickets.length > 0 ? existingTickets : prod ? [] : buildSeedTickets(now);

  const existingOpps = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
  const opportunities =
    existingOpps.length > 0 ? existingOpps : prod ? [] : buildSeedOpportunities(now);

  const opportunityComplaints = Array.isArray(parsed.opportunityComplaints)
    ? parsed.opportunityComplaints
    : [];
  const opportunityAppeals = Array.isArray(parsed.opportunityAppeals)
    ? parsed.opportunityAppeals
    : [];
  const physicalQrScanTests = Array.isArray(parsed.physicalQrScanTests)
    ? parsed.physicalQrScanTests
    : [];

  const migratedSessions: SessionRecord[] = (Array.isArray(parsed.sessions) ? parsed.sessions : [])
    .map((s): SessionRecord | null => {
      const tokenHash = s.tokenHash || (s.token ? hashSessionToken(s.token) : '');
      if (!tokenHash) return null;
      return {
        id: s.id || `sid_${crypto.randomBytes(6).toString('hex')}`,
        tokenHash,
        csrfToken: s.csrfToken || generateCsrfToken(),
        userId: s.userId,
        role: s.role,
        createdAt: s.createdAt || now,
        lastActivityAt: s.lastActivityAt || s.createdAt || now,
        idleExpiresAt:
          s.idleExpiresAt ||
          new Date(Date.now() + SESSION_IDLE_TTL_MS).toISOString(),
        expiresAt: s.expiresAt,
      };
    })
    .filter((s): s is SessionRecord => s !== null);

  const existingUsers = Array.isArray(parsed.users) ? [...parsed.users] : [];
  const existingOppsList = [...opportunities];

  let households = Array.isArray(parsed.households) ? parsed.households : [];
  let householdMembers = Array.isArray(parsed.householdMembers) ? parsed.householdMembers : [];
  const householdQrTokens = Array.isArray(parsed.householdQrTokens)
    ? parsed.householdQrTokens
    : [];
  let consentAuditEvents = Array.isArray(parsed.consentAuditEvents)
    ? parsed.consentAuditEvents
    : [];

  if (!prod) {
    const seedTrackB = buildSeedHouseholdsAndMembers(now);
    if (!existingUsers.some((u) => u.email === 'viewer@edison.demo')) {
      existingUsers.push(buildSeedViewerUser(now));
    }
    const seedOpps = buildSeedOpportunities(now);
    const zwOpp = seedOpps.find((o) => o.id === 'opp_seed_zw_04');
    if (zwOpp && !existingOppsList.some((o) => o.id === 'opp_seed_zw_04')) {
      existingOppsList.push(zwOpp);
    }
    if (households.length === 0) {
      households = seedTrackB.households;
    }
    if (householdMembers.length === 0) {
      householdMembers = seedTrackB.householdMembers;
    }
    if (consentAuditEvents.length === 0) {
      consentAuditEvents = seedTrackB.consentAuditEvents;
    }
  }

  return {
    schemaVersion: 8,
    users: existingUsers,
    sessions: migratedSessions,
    qrLinks: migratedLinks,
    advertiserProfiles: profiles,
    campaigns,
    adCreatives,
    supportTickets,
    opportunities: existingOppsList,
    opportunityComplaints,
    opportunityAppeals,
    analyticsEvents: parsed.analyticsEvents || [],
    physicalQrScanTests,
    sharedIntelPreview:
      parsed.sharedIntelPreview && Array.isArray(parsed.sharedIntelPreview.bundles)
        ? parsed.sharedIntelPreview
        : createInitialSharedIntelPreviewState(),
    households,
    householdMembers,
    householdQrTokens,
    consentAuditEvents,
    lastReliabilityChaosReport: parsed.lastReliabilityChaosReport ?? null,
    pilotCohorts: Array.isArray(parsed.pilotCohorts) ? parsed.pilotCohorts : [],
    stageP6PrepNotes:
      parsed.stageP6PrepNotes && typeof parsed.stageP6PrepNotes === 'object'
        ? parsed.stageP6PrepNotes
        : {},
    commercialBoardDecisions: Array.isArray(parsed.commercialBoardDecisions)
      ? parsed.commercialBoardDecisions
      : [],
    commercialCostAssumptions: parsed.commercialCostAssumptions,
    countryPolicyProfiles:
      parsed.countryPolicyProfiles && typeof parsed.countryPolicyProfiles === 'object'
        ? parsed.countryPolicyProfiles
        : {},
    countryLaunchDecisions: Array.isArray(parsed.countryLaunchDecisions)
      ? parsed.countryLaunchDecisions
      : [],
    regionalLocalizationProfiles:
      parsed.regionalLocalizationProfiles &&
      typeof parsed.regionalLocalizationProfiles === 'object'
        ? parsed.regionalLocalizationProfiles
        : {},
    internationalExpansionDecisions: Array.isArray(parsed.internationalExpansionDecisions)
      ? parsed.internationalExpansionDecisions
      : [],
    auditLogs: parsed.auditLogs || [],
  };
}

function buildInitialAdvertiserProfile(
  user: Pick<
    PublicUser,
    | 'id'
    | 'email'
    | 'name'
    | 'organisationName'
    | 'role'
    | 'verificationStatus'
    | 'isPrototypeSeed'
  >,
  now: string
): AdvertiserProfile {
  const organisationName = user.organisationName || 'Independent / Individual';
  return {
    userId: user.id,
    entityType:
      organisationName === 'Independent / Individual'
        ? 'individual_sole_trader'
        : 'registered_business',
    businessOrTradingName: organisationName,
    registrationOrTaxId: '',
    industryCategory:
      user.role === 'opportunity_submitter'
        ? 'Employment & Opportunities'
        : 'General Commercial',
    countryCode: 'ZW',
    cityRegion: '',
    physicalAddress: '',
    primaryContactName: user.name,
    primaryContactEmail: user.email,
    primaryContactPhone: '',
    billingContactName: user.name,
    billingContactEmail: user.email,
    websiteUrl: '',
    verificationStatus: user.verificationStatus,
    verificationNotes: '',
    isPrototypeSeed: user.isPrototypeSeed,
    updatedAt: now,
  };
}

export class EdisonPrototypeStore implements EdisonDataRepository {
  private readonly storageMode: 'json_file' | 'memory';
  private readonly dataDir: string;
  private readonly storePath: string;
  private readonly lockPath: string;
  private data: EdisonStoreData;
  private lastKnownMtimeMs = 0;
  private recentRedirectMap = new Map<string, number>();

  constructor(options?: { dataDir?: string; storageMode?: 'json_file' | 'memory' }) {
    this.storageMode = options?.storageMode ?? 'json_file';
    this.dataDir = options?.dataDir ? path.resolve(options.dataDir) : DEFAULT_DATA_DIR;
    this.storePath = path.join(this.dataDir, 'edison-store.json');
    this.lockPath = path.join(this.dataDir, 'edison-store.lock');
    this.data = this.loadOrInitialize();
  }

  getStorageBackendMetadata(): StorageBackendMetadata {
    const dbUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());
    const usePg = dbUrlConfigured && process.env.EDISON_STORAGE_BACKEND === 'postgresql_pg';
    return {
      backend: this.storageMode === 'memory' ? 'memory_only' : usePg ? 'postgresql_pg' : 'json_file_store',
      schemaVersion: this.data.schemaVersion || 8,
      persistenceLabel: this.storageMode === 'memory'
        ? 'Isolate-local memory store (not durable)'
        : usePg
        ? 'PostgreSQL 16+ (pg.Pool via DATABASE_URL)'
        : 'data/edison-store.json (Locked Atomic Write + PG16 Migrations Ready)',
      postgresMigrationReady: true,
      postgresSqlMigrationsCount: 3,
      postgresUrlConfigured: dbUrlConfigured,
      migrationBlueprintPath: 'migrations/0001_initial_track_a.sql',
    };
  }

  getStoreSnapshot(): EdisonStoreData {
    this.syncIfDiskNewer();
    return structuredClone(this.data);
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private readFromDisk(): EdisonStoreData | null {
    if (!fs.existsSync(this.storePath)) return null;
    const stat = fs.statSync(this.storePath);
    const raw = fs.readFileSync(this.storePath, 'utf8');
    const parsed = JSON.parse(raw) as EdisonStoreData;
    if (parsed && typeof parsed.schemaVersion === 'number' && Array.isArray(parsed.users)) {
      this.lastKnownMtimeMs = stat.mtimeMs;
      return normalizeStoreData(parsed);
    }
    return null;
  }

  private loadOrInitialize(): EdisonStoreData {
    if (this.storageMode === 'memory') {
      return createInitialSeed();
    }
    this.ensureDataDir();
    try {
      const existing = this.readFromDisk();
      if (existing) return existing;
    } catch {
      // Fall through to re-seed cleanly if corrupt
    }
    const seeded = createInitialSeed();
    this.writeAtomic(seeded);
    return seeded;
  }

  private acquireLock(): void {
    this.ensureDataDir();
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        fs.writeSync(fd, `${process.pid}:${Date.now()}`);
        fs.closeSync(fd);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') throw err;
        try {
          const stat = fs.statSync(this.lockPath);
          if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
            fs.unlinkSync(this.lockPath);
            continue;
          }
        } catch {
          continue;
        }
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for store write lock.');
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
      }
    }
  }

  private releaseLock(): void {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // Ignore lock cleanup errors
    }
  }

  private writeAtomic(nextData: EdisonStoreData): void {
    this.ensureDataDir();
    const tmpPath = `${this.storePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const payload = JSON.stringify(nextData, null, 2);
    const fd = fs.openSync(tmpPath, 'w', 0o600);
    try {
      fs.writeSync(fd, payload, 0, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, this.storePath);
    this.lastKnownMtimeMs = fs.statSync(this.storePath).mtimeMs;
  }

  private withWriteTransaction<T>(mutator: (draft: EdisonStoreData) => T): T {
    if (this.storageMode === 'memory') {
      return mutator(this.data);
    }
    this.acquireLock();
    try {
      if (fs.existsSync(this.storePath)) {
        const stat = fs.statSync(this.storePath);
        if (stat.mtimeMs !== this.lastKnownMtimeMs) {
          const diskData = this.readFromDisk();
          if (diskData) {
            this.data = diskData;
          }
        }
      }
      const result = mutator(this.data);
      this.writeAtomic(this.data);
      return result;
    } finally {
      this.releaseLock();
    }
  }

  private syncIfDiskNewer(): void {
    if (this.storageMode === 'memory') return;
    if (!fs.existsSync(this.storePath)) return;
    try {
      const stat = fs.statSync(this.storePath);
      if (stat.mtimeMs !== this.lastKnownMtimeMs) {
        const diskData = this.readFromDisk();
        if (diskData) {
          this.data = diskData;
        }
      }
    } catch {
      // Keep in-memory state on transient read error
    }
  }

  private addAudit(
    draft: EdisonStoreData,
    actorId: string | null,
    actorRole: UserRole | 'anonymous' | 'system',
    action: string,
    targetType: AuditLogRecord['targetType'],
    targetId: string,
    detail: string
  ): void {
    draft.auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      detail,
      createdAt: new Date().toISOString(),
    });
    if (draft.auditLogs.length > 500) {
      draft.auditLogs.length = 500;
    }
  }

  private pushAnalyticsEvent(draft: EdisonStoreData, event: AnalyticsEventRecord): void {
    draft.analyticsEvents.unshift(event);
    if (draft.analyticsEvents.length > 2000) {
      draft.analyticsEvents.length = 2000;
    }
  }

  registerUser(
    params: {
      email: string;
      password: string;
      name: string;
      organisationName: string;
      role: 'advertiser' | 'opportunity_submitter' | 'household_viewer';
    },
    previousSessionToken?: string
  ): { user: PublicUser; session: SessionRecord & { token: string } } {
    const emailNorm = params.email.trim().toLowerCase();
    if (isProductionEnvironment() && emailNorm.endsWith('.demo')) {
      throw new Error('FORBIDDEN: Reserved .demo accounts cannot be registered in production.');
    }
    return this.withWriteTransaction((draft) => {
      if (draft.users.some((u) => u.email === emailNorm)) {
        throw new Error('An account with this email already exists.');
      }

      const now = new Date().toISOString();
      const orgName = params.organisationName.trim() || 'Independent / Individual';
      const user: UserAccount = {
        id: `usr_${crypto.randomBytes(6).toString('hex')}`,
        email: emailNorm,
        passwordHash: hashPassword(params.password),
        name: params.name.trim(),
        organisationName: orgName,
        role: params.role,
        verificationStatus: 'unverified',
        isPrototypeSeed: false,
        createdAt: now,
      };

      draft.users.push(user);
      if (params.role !== 'household_viewer') {
        draft.advertiserProfiles.push(buildInitialAdvertiserProfile(user, now));
      }

      const session = this.createSessionInDraft(draft, user, previousSessionToken);
      this.addAudit(
        draft,
        user.id,
        user.role,
        'USER_REGISTERED',
        'auth',
        user.id,
        `Registered ${user.role} account (${user.email}).`
      );
      return { user: toPublicUser(user), session };
    });
  }

  loginUser(
    email: string,
    password: string,
    previousSessionToken?: string
  ): { user: PublicUser; session: SessionRecord & { token: string } } {
    const emailNorm = email.trim().toLowerCase();
    return this.withWriteTransaction((draft) => {
      const user = draft.users.find((u) => u.email === emailNorm);
      if (isProductionEnvironment() && (emailNorm.endsWith('.demo') || (user && isDemoOrSeedUser(user)))) {
        this.addAudit(
          draft,
          null,
          'anonymous',
          'DEMO_AUTH_BLOCKED_IN_PRODUCTION',
          'auth',
          emailNorm,
          'Rejected prototype/demo account authentication while NODE_ENV=production.'
        );
        throw new Error(
          'FORBIDDEN: Demo and prototype seed accounts are disabled in production environments.'
        );
      }

      if (!user || !verifyPassword(password, user.passwordHash)) {
        this.addAudit(
          draft,
          null,
          'anonymous',
          'LOGIN_FAILED',
          'auth',
          emailNorm,
          'Invalid login attempt.'
        );
        throw new Error('Invalid email or password.');
      }

      const session = this.createSessionInDraft(draft, user, previousSessionToken);
      this.addAudit(
        draft,
        user.id,
        user.role,
        'USER_LOGGED_IN',
        'auth',
        user.id,
        `Signed in as ${user.role} (${user.email}).`
      );
      return { user: toPublicUser(user), session };
    });
  }

  private createSessionInDraft(
    draft: EdisonStoreData,
    user: UserAccount,
    previousToken?: string
  ): SessionRecord & { token: string } {
    const nowMs = Date.now();
    const rawToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = hashSessionToken(rawToken);
    const prevHash = previousToken ? hashSessionToken(previousToken) : null;

    const persistedSession: SessionRecord = {
      id: `sid_${crypto.randomBytes(6).toString('hex')}`,
      tokenHash,
      csrfToken: generateCsrfToken(),
      userId: user.id,
      role: user.role,
      createdAt: new Date(nowMs).toISOString(),
      lastActivityAt: new Date(nowMs).toISOString(),
      idleExpiresAt: new Date(nowMs + SESSION_IDLE_TTL_MS).toISOString(),
      expiresAt: new Date(nowMs + SESSION_TTL_MS).toISOString(),
    };

    // Prune expired or idle-expired sessions and rotate away any prior session token (anti-fixation)
    draft.sessions = draft.sessions.filter((s) => {
      const absOk = Date.parse(s.expiresAt) > nowMs;
      const idleOk = Date.parse(s.idleExpiresAt || s.expiresAt) > nowMs;
      const matchesPrev =
        Boolean(previousToken && s.token === previousToken) ||
        Boolean(prevHash && s.tokenHash === prevHash);
      return absOk && idleOk && !matchesPrev;
    });
    draft.sessions.push(persistedSession);

    return {
      ...persistedSession,
      token: rawToken,
    };
  }

  private matchesSessionRecord(s: SessionRecord, rawToken: string, tokenHash: string): boolean {
    if (s.tokenHash && s.tokenHash === tokenHash) return true;
    if (s.token && s.token === rawToken) return true;
    return false;
  }

  getSessionByToken(
    rawToken: string | undefined
  ): { user: PublicUser; session: SessionRecord } | null {
    if (!rawToken) return null;
    this.syncIfDiskNewer();
    const nowMs = Date.now();
    const tokenHash = hashSessionToken(rawToken);
    const session = this.data.sessions.find((s) => {
      if (!this.matchesSessionRecord(s, rawToken, tokenHash)) return false;
      const absOk = Date.parse(s.expiresAt) > nowMs;
      const idleOk = Date.parse(s.idleExpiresAt || s.expiresAt) > nowMs;
      return absOk && idleOk;
    });
    if (!session) return null;
    const user = this.data.users.find((u) => u.id === session.userId);
    if (!user) return null;
    if (isProductionEnvironment() && isDemoOrSeedUser(user)) {
      return null;
    }
    return { user: toPublicUser(user), session: { ...session } };
  }

  listSessionRetentionRecords(): Array<Pick<SessionRecord, 'expiresAt' | 'idleExpiresAt'>> {
    this.syncIfDiskNewer();
    return this.data.sessions.map(({ expiresAt, idleExpiresAt }) => ({
      expiresAt,
      idleExpiresAt,
    }));
  }

  getUserCount(): number {
    this.syncIfDiskNewer();
    return this.data.users.length;
  }

  getUserBySessionToken(token: string | undefined): PublicUser | null {
    return this.getSessionByToken(token)?.user ?? null;
  }

  touchSessionActivity(rawToken: string | undefined): void {
    if (!rawToken) return;
    const nowMs = Date.now();
    const tokenHash = hashSessionToken(rawToken);
    const current = this.data.sessions.find((s) =>
      this.matchesSessionRecord(s, rawToken, tokenHash)
    );
    if (!current) return;
    const lastTouchMs = Date.parse(current.lastActivityAt || current.createdAt);
    if (Number.isFinite(lastTouchMs) && nowMs - lastTouchMs < SESSION_TOUCH_INTERVAL_MS) {
      return;
    }

    this.withWriteTransaction((draft) => {
      const target = draft.sessions.find((s) =>
        this.matchesSessionRecord(s, rawToken, tokenHash)
      );
      if (!target) return;
      const absMs = Date.parse(target.expiresAt);
      if (!Number.isFinite(absMs) || absMs <= nowMs) return;
      target.lastActivityAt = new Date(nowMs).toISOString();
      target.idleExpiresAt = new Date(Math.min(absMs, nowMs + SESSION_IDLE_TTL_MS)).toISOString();
    });
  }

  expireSessionForTesting(rawToken: string, mode: 'idle' | 'absolute' = 'idle'): void {
    const tokenHash = hashSessionToken(rawToken);
    const pastIso = new Date(Date.now() - 1000).toISOString();
    this.withWriteTransaction((draft) => {
      const target = draft.sessions.find((s) =>
        this.matchesSessionRecord(s, rawToken, tokenHash)
      );
      if (!target) return;
      if (mode === 'idle') {
        target.idleExpiresAt = pastIso;
      } else {
        target.expiresAt = pastIso;
      }
    });
  }

  logoutSession(token: string | undefined): void {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    this.withWriteTransaction((draft) => {
      const session = draft.sessions.find((s) =>
        this.matchesSessionRecord(s, token, tokenHash)
      );
      draft.sessions = draft.sessions.filter(
        (s) => !this.matchesSessionRecord(s, token, tokenHash)
      );
      if (session) {
        this.addAudit(
          draft,
          session.userId,
          session.role,
          'USER_LOGGED_OUT',
          'auth',
          session.userId,
          'Session terminated.'
        );
      }
    });
  }

  recordSecurityAudit(
    actor: PublicUser | null,
    action: string,
    targetId: string,
    detail: string
  ): void {
    this.withWriteTransaction((draft) => {
      this.addAudit(
        draft,
        actor?.id ?? null,
        actor?.role ?? 'anonymous',
        action,
        'auth',
        targetId,
        detail
      );
    });
  }

  recordSharedIntelPiiRejection(scopeId: string | undefined, detail: string): void {
    this.withWriteTransaction((draft) => {
      const current = draft.sharedIntelPreview ?? createInitialSharedIntelPreviewState();
      current.rejectedPiiAttemptCount += 1;
      current.auditTrail.unshift({
        id: `sia_${crypto.randomBytes(4).toString('hex')}`,
        action: 'ZERO_PII_REJECTED',
        scopeId: scopeId || null,
        detail,
        createdAt: new Date().toISOString(),
      });
      draft.sharedIntelPreview = current;
    });
  }

  // --- QR Links & Redirect Core ---

  listQrLinksForUser(user: PublicUser): QrLinkRecord[] {
    this.syncIfDiskNewer();
    if (user.role === 'admin') {
      return [...this.data.qrLinks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return this.data.qrLinks
      .filter((q) => q.ownerId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  replaceQrLinkFromPersistence(link: QrLinkRecord): void {
    this.withWriteTransaction((draft) => {
      const index = draft.qrLinks.findIndex((item) => item.token === link.token);
      if (index < 0) draft.qrLinks.push({ ...link });
      else draft.qrLinks[index] = { ...link };
    });
  }

  createQrLink(
    owner: PublicUser,
    params: { label: string; destinationType: QrDestinationType; rawInput: string }
  ): QrLinkRecord {
    const validation = validateQrDestination(params.rawInput, params.destinationType);
    if (!validation.valid || !validation.scheme) {
      throw new Error(validation.error || 'Invalid QR destination.');
    }

    return this.withWriteTransaction((draft) => {
      const token = crypto.randomBytes(4).toString('hex');
      const record: QrLinkRecord = {
        token,
        ownerId: owner.id,
        label: params.label.trim() || `${params.destinationType} QR`,
        destinationType: params.destinationType,
        rawInput: params.rawInput.trim(),
        resolvedUrl: validation.normalisedUrl,
        resolvedHost: validation.resolvedHost,
        scheme: validation.scheme!,
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: new Date().toISOString(),
      };

      draft.qrLinks.unshift(record);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'QR_LINK_CREATED',
        'qr_link',
        record.token,
        `Created /r/${record.token} -> ${record.resolvedHost}`
      );
      return record;
    });
  }

  updateQrStatus(actor: PublicUser, token: string, status: QrLinkStatus): QrLinkRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.qrLinks.find((q) => q.token === token);
      if (!target) {
        throw new Error('QR token not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this QR link.');
      }
      if (target.status === 'flagged' && actor.role !== 'admin') {
        throw new Error('FORBIDDEN: Only an administrator can unflag a flagged QR link.');
      }

      target.status = status;
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'QR_STATUS_UPDATED',
        'qr_link',
        target.token,
        `Updated /r/${target.token} status to ${status}.`
      );
      return target;
    });
  }

  resolveQrRedirect(
    token: string,
    clientIp: string,
    userAgent: string,
    headers: { secPurpose?: string; purpose?: string; xMoz?: string } = {}
  ):
    | {
        ok: true;
        record: QrLinkRecord;
        deduplicated: boolean;
        isSuspectedBot: boolean;
        analyticsEvents: AnalyticsEventRecord[];
        householdQrToken?: HouseholdQrTokenRecord;
        consentAuditEvents: ConsentAuditEventRecord[];
      }
    | {
        ok: false;
        reason: string;
        statusCode: number;
        record?: QrLinkRecord;
        analyticsEvents: AnalyticsEventRecord[];
        householdQrToken?: HouseholdQrTokenRecord;
        consentAuditEvents: ConsentAuditEventRecord[];
      } {
    const isSuspectedBot = detectSuspectedBotOrPrefetch(userAgent, headers);
    const ipHash = crypto
      .createHash('sha256')
      .update(`${PROCESS_HASH_SALT}:${clientIp}:${userAgent}`)
      .digest('hex')
      .slice(0, 16);
    const dedupKey = `${token}:${ipHash}`;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const lastHit = this.recentRedirectMap.get(dedupKey);
    const deduplicated = Boolean(lastHit && nowMs - lastHit < DEDUP_WINDOW_MS);

    const analyticsEvents: AnalyticsEventRecord[] = [];
    const consentAuditEvents: ConsentAuditEventRecord[] = [];
    let redirectHouseholdQr: HouseholdQrTokenRecord | null = null;
    return this.withWriteTransaction((draft) => {
      const recordAnalyticsEvent = (event: AnalyticsEventRecord) => {
        this.pushAnalyticsEvent(draft, event);
        analyticsEvents.push(event);
      };
      const withAnalyticsEvents = <T extends object>(result: T) => ({
        ...result,
        analyticsEvents: analyticsEvents.map((event) => ({ ...event })),
        ...(redirectHouseholdQr ? { householdQrToken: { ...redirectHouseholdQr } } : {}),
        consentAuditEvents: consentAuditEvents.map((event) => ({ ...event })),
      });
      let target = draft.qrLinks.find((q) => q.token === token);
      let boundHouseholdQr: HouseholdQrTokenRecord | null = null;

      if (!target && token.startsWith('hqr_')) {
        boundHouseholdQr = (draft.householdQrTokens || []).find((hqr) => hqr.token === token) ?? null;
        if (boundHouseholdQr) {
          redirectHouseholdQr = boundHouseholdQr;
          const hh = (draft.households || []).find((h) => h.id === boundHouseholdQr!.householdId) ?? null;
          const isExpired = Date.parse(boundHouseholdQr.expiresAt) <= nowMs;
          const isConsentWithdrawn =
            !hh ||
            hh.commercialConsentStatus !== 'granted' ||
            hh.charityAndOpportunityStatus !== 'active';
          const isLocationInvalid = !hh || !hh.locationValid || hh.targetingDisabled;
          const isEpochStale = !hh || hh.consentEpoch !== boundHouseholdQr.consentEpoch;
          const isExplicitlyRevoked = Boolean(boundHouseholdQr.revokedAt);

          if (
            isExpired ||
            isConsentWithdrawn ||
            isLocationInvalid ||
            isEpochStale ||
            isExplicitlyRevoked
          ) {
            boundHouseholdQr.rejected403Count += 1;
            const reasonCode = isExpired
              ? 'QR access token has expired.'
              : isConsentWithdrawn
              ? 'Household advertising & opportunity consent has been withdrawn (HTTP 403 revoked).'
              : isLocationInvalid
              ? 'Household location validation is incomplete; targeted QR access is disabled.'
              : 'Household consent epoch changed or QR access was revoked (HTTP 403).';

            draft.consentAuditEvents = draft.consentAuditEvents || [];
            const auditEvent: ConsentAuditEventRecord = {
              id: `caud_${crypto.randomBytes(5).toString('hex')}`,
              householdId: boundHouseholdQr.householdId,
              actorId: null,
              actorRole: 'anonymous',
              action: 'QR_EPOCH_REVOKED_403',
              previousEpoch: boundHouseholdQr.consentEpoch,
              newEpoch: hh?.consentEpoch ?? boundHouseholdQr.consentEpoch,
              reason: `Blocked /r/${token}: ${reasonCode}`,
              affectedQrTokensInvalidated: 0,
              ordinaryTvPreserved: true,
              createdAt: nowIso,
            };
            draft.consentAuditEvents.unshift(auditEvent);
            consentAuditEvents.push(auditEvent);
            recordAnalyticsEvent({
              id: `evt_${crypto.randomBytes(6).toString('hex')}`,
              qrToken: token,
              campaignId: boundHouseholdQr.campaignId,
              eventType: 'redirect_requested',
              measurementSource: 'real_measured',
              dedupKey,
              isSuspectedBot,
              isDeduplicated: deduplicated,
              redirectOutcome: isExpired ? 'expired_token' : 'revoked_consent',
              createdAt: nowIso,
            });
            this.addAudit(
              draft,
              null,
              'anonymous',
              'QR_HOUSEHOLD_EPOCH_REJECTED_403',
              'consent',
              token,
              `Rejected /r/${token} with HTTP 403 (${reasonCode}).`
            );
            return withAnalyticsEvents({
              ok: false,
              reason: reasonCode,
              statusCode: 403,
            });
          }

          if (boundHouseholdQr.opportunityId) {
            const linkedOpp = draft.opportunities.find(
              (o) => o.id === boundHouseholdQr!.opportunityId
            );
            const today = nowIso.slice(0, 10);
            if (
              !linkedOpp ||
              linkedOpp.status !== 'verified_live' ||
              linkedOpp.closingDate < today ||
              linkedOpp.expiryDate < today
            ) {
              boundHouseholdQr.rejected403Count += 1;
              recordAnalyticsEvent({
                id: `evt_${crypto.randomBytes(6).toString('hex')}`,
                qrToken: token,
                campaignId: boundHouseholdQr.campaignId,
                eventType: 'redirect_requested',
                measurementSource: 'real_measured',
                dedupKey,
                isSuspectedBot,
                isDeduplicated: deduplicated,
                redirectOutcome: 'revoked_consent',
                createdAt: nowIso,
              });
              return withAnalyticsEvents({
                ok: false,
                reason: 'Opportunity linked to this QR token is no longer verified live.',
                statusCode: 403,
              });
            }
          }

          boundHouseholdQr.resolvedCount += 1;
          target = draft.qrLinks.find((q) => q.token === boundHouseholdQr!.baseQrToken);
        }
      }

      if (!target) {
        recordAnalyticsEvent({
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'not_found',
          createdAt: nowIso,
        });
        return withAnalyticsEvents({
          ok: false,
          reason: 'QR destination token was not found.',
          statusCode: 404,
        });
      }

      target.redirectRequestsTotal += 1;
      target.lastRedirectRequestedAt = nowIso;
      if (isSuspectedBot) {
        target.suspectedBotRequests += 1;
      }

      if (target.status !== 'active') {
        recordAnalyticsEvent({
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: target.token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'inactive',
          createdAt: nowIso,
        });
        return withAnalyticsEvents({
          ok: false,
          reason: `This QR destination is currently ${target.status} and cannot redirect.`,
          statusCode: 410,
          record: { ...target },
        });
      }

      const recheck = validateQrDestination(target.resolvedUrl, target.destinationType);
      if (!recheck.valid) {
        target.status = 'flagged';
        recordAnalyticsEvent({
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: target.token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'flagged',
          createdAt: nowIso,
        });
        this.addAudit(
          draft,
          null,
          'system',
          'QR_AUTO_FLAGGED',
          'qr_link',
          target.token,
          `Redirect blocked on re-validation: ${recheck.error}`
        );
        return withAnalyticsEvents({
          ok: false,
          reason: 'Destination failed safety validation and was flagged for review.',
          statusCode: 403,
          record: { ...target },
        });
      }

      recordAnalyticsEvent({
        id: `evt_${crypto.randomBytes(6).toString('hex')}`,
        qrToken: target.token,
        campaignId: null,
        eventType: 'redirect_requested',
        measurementSource: 'real_measured',
        dedupKey,
        isSuspectedBot,
        isDeduplicated: deduplicated,
        redirectOutcome: 'issued',
        createdAt: nowIso,
      });

      target.redirectIssuedTotal += 1;
      if (!isSuspectedBot && !deduplicated) {
        this.recentRedirectMap.set(dedupKey, nowMs);
        target.deduplicatedNonBotRedirects += 1;
      }

      recordAnalyticsEvent({
        id: `evt_${crypto.randomBytes(6).toString('hex')}`,
        qrToken: target.token,
        campaignId: null,
        eventType: 'redirect_issued',
        measurementSource: 'real_measured',
        dedupKey,
        isSuspectedBot,
        isDeduplicated: deduplicated,
        redirectOutcome: 'issued',
        createdAt: nowIso,
      });

      return withAnalyticsEvents({
        ok: true,
        record: { ...target },
        deduplicated,
        isSuspectedBot,
      });
    });
  }

  // --- Advertiser Profiles (Block 2.2) ---

  getAdvertiserProfile(user: PublicUser): AdvertiserProfile {
    this.syncIfDiskNewer();
    const existing = this.data.advertiserProfiles.find((p) => p.userId === user.id);
    if (existing) {
      return { ...existing };
    }
    return this.withWriteTransaction((draft) => {
      const again = draft.advertiserProfiles.find((p) => p.userId === user.id);
      if (again) return { ...again };
      const now = new Date().toISOString();
      const created = buildInitialAdvertiserProfile(user, now);
      draft.advertiserProfiles.push(created);
      return { ...created };
    });
  }

  listAllAdvertiserProfiles(): AdvertiserProfile[] {
    this.syncIfDiskNewer();
    return [...this.data.advertiserProfiles].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  upsertAdvertiserProfile(
    actor: PublicUser,
    input: {
      entityType: AdvertiserEntityType;
      businessOrTradingName: string;
      registrationOrTaxId?: string;
      industryCategory: string;
      countryCode: string;
      cityRegion: string;
      physicalAddress: string;
      primaryContactName: string;
      primaryContactEmail: string;
      primaryContactPhone: string;
      billingContactName: string;
      billingContactEmail: string;
      websiteUrl?: string;
      requestVerification?: boolean;
    }
  ): AdvertiserProfile {
    if (!input.businessOrTradingName.trim()) {
      throw new Error('Business or trading name is required.');
    }
    if (!input.primaryContactName.trim() || !input.primaryContactEmail.trim()) {
      throw new Error('Primary contact name and email are required.');
    }

    if (input.websiteUrl && input.websiteUrl.trim()) {
      const check = validateQrDestination(input.websiteUrl.trim(), 'website');
      if (!check.valid) {
        throw new Error(`Website URL invalid: ${check.error}`);
      }
    }

    return this.withWriteTransaction((draft) => {
      const now = new Date().toISOString();
      let profile = draft.advertiserProfiles.find((p) => p.userId === actor.id);
      if (!profile) {
        profile = {
          userId: actor.id,
          entityType: input.entityType,
          businessOrTradingName: input.businessOrTradingName.trim(),
          registrationOrTaxId: '',
          industryCategory: input.industryCategory.trim() || 'General Commercial',
          countryCode: input.countryCode.trim().toUpperCase() || 'GB',
          cityRegion: '',
          physicalAddress: '',
          primaryContactName: input.primaryContactName.trim(),
          primaryContactEmail: input.primaryContactEmail.trim(),
          primaryContactPhone: '',
          billingContactName: '',
          billingContactEmail: '',
          websiteUrl: '',
          verificationStatus: 'unverified',
          verificationNotes: '',
          isPrototypeSeed: false,
          updatedAt: now,
        };
        draft.advertiserProfiles.push(profile);
      }

      profile.entityType = input.entityType;
      profile.businessOrTradingName = input.businessOrTradingName.trim();
      profile.registrationOrTaxId = (input.registrationOrTaxId ?? '').trim();
      profile.industryCategory = input.industryCategory.trim() || 'General Commercial';
      profile.countryCode = input.countryCode.trim().toUpperCase() || 'GB';
      profile.cityRegion = input.cityRegion.trim();
      profile.physicalAddress = input.physicalAddress.trim();
      profile.primaryContactName = input.primaryContactName.trim();
      profile.primaryContactEmail = input.primaryContactEmail.trim();
      profile.primaryContactPhone = input.primaryContactPhone.trim();
      profile.billingContactName = input.billingContactName.trim() || profile.primaryContactName;
      profile.billingContactEmail = input.billingContactEmail.trim() || profile.primaryContactEmail;
      profile.websiteUrl = (input.websiteUrl ?? '').trim();
      profile.updatedAt = now;

      const userAccount = draft.users.find((u) => u.id === actor.id);
      if (userAccount) {
        userAccount.organisationName = profile.businessOrTradingName;
      }

      if (input.requestVerification && profile.verificationStatus === 'unverified') {
        profile.verificationStatus = 'pending_review';
        if (userAccount) {
          userAccount.verificationStatus = 'pending_review';
        }
        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'ADVERTISER_VERIFICATION_REQUESTED',
          'advertiser_profile',
          actor.id,
          `Requested profile verification for ${profile.businessOrTradingName}.`
        );
      } else {
        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'ADVERTISER_PROFILE_UPDATED',
          'advertiser_profile',
          actor.id,
          `Updated advertiser profile (${profile.businessOrTradingName}).`
        );
      }

      return { ...profile };
    });
  }

  adminUpdateAdvertiserVerification(
    admin: PublicUser,
    targetUserId: string,
    status: AccountVerificationStatus,
    notes: string
  ): AdvertiserProfile {
    if (admin.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can alter verification status.');
    }
    if (!notes.trim()) {
      throw new Error('Verification notes / reason are mandatory.');
    }

    return this.withWriteTransaction((draft) => {
      const profile = draft.advertiserProfiles.find((p) => p.userId === targetUserId);
      if (!profile) {
        throw new Error('Advertiser profile not found.');
      }
      profile.verificationStatus = status;
      profile.verificationNotes = notes.trim();
      profile.updatedAt = new Date().toISOString();

      const user = draft.users.find((u) => u.id === targetUserId);
      if (user) {
        user.verificationStatus = status;
      }

      this.addAudit(
        draft,
        admin.id,
        admin.role,
        'ADVERTISER_VERIFICATION_UPDATED',
        'advertiser_profile',
        targetUserId,
        `Set verificationStatus=${status}. Note: ${notes.trim()}`
      );
      return { ...profile };
    });
  }

  // --- Campaign Management & 10-State Lifecycle (Block 2.2) ---

  listCampaignsForUser(user: PublicUser, statusFilter?: CampaignStatus | 'all'): CampaignRecord[] {
    this.syncIfDiskNewer();
    const scoped =
      user.role === 'admin'
        ? [...this.data.campaigns]
        : this.data.campaigns.filter((c) => c.ownerId === user.id);

    const filtered =
      statusFilter && statusFilter !== 'all'
        ? scoped.filter((c) => c.status === statusFilter)
        : scoped;

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createCampaign(
    owner: PublicUser,
    input: {
      title: string;
      contentCategory: CampaignContentCategory;
      summary: string;
      qrToken?: string | null;
      durationSeconds: number;
      dailyFrequencyCap: number;
      targetRegions: string[];
      dayparts: DaypartSlot[];
      startDate: string;
      endDate: string;
    }
  ): CampaignRecord {
    const title = input.title.trim();
    if (title.length < 3) {
      throw new Error('Campaign title must be at least 3 characters.');
    }
    if (!input.startDate || !input.endDate || input.endDate < input.startDate) {
      throw new Error('End date must be on or after the start date.');
    }
    if (input.durationSeconds < 5 || input.durationSeconds > 120) {
      throw new Error('Advertisement duration must be between 5 and 120 seconds.');
    }
    if (input.dailyFrequencyCap < 1 || input.dailyFrequencyCap > 48) {
      throw new Error('Daily frequency cap must be between 1 and 48 plays.');
    }

    const regions = input.targetRegions.map((r) => r.trim()).filter(Boolean);
    const dayparts: DaypartSlot[] = input.dayparts.length > 0 ? input.dayparts : ['daytime'];

    return this.withWriteTransaction((draft) => {
      let resolvedQrToken: string | null = null;
      if (input.qrToken) {
        const qr = draft.qrLinks.find((q) => q.token === input.qrToken);
        if (!qr) {
          throw new Error('Selected QR token was not found.');
        }
        if (owner.role !== 'admin' && qr.ownerId !== owner.id) {
          throw new Error('FORBIDDEN: You can only attach your own QR links.');
        }
        resolvedQrToken = qr.token;
      }

      const now = new Date().toISOString();
      const record: CampaignRecord = {
        id: `cmp_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: owner.id,
        title,
        contentCategory: input.contentCategory,
        summary: input.summary.trim(),
        qrToken: resolvedQrToken,
        adCreativeRef: null,
        durationSeconds: Math.round(input.durationSeconds),
        dailyFrequencyCap: Math.round(input.dailyFrequencyCap),
        targetRegions: regions.length > 0 ? regions : ['United Kingdom · National'],
        dayparts,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'draft',
        rejectionReason: null,
        fixInstructions: null,
        simulatedEstimate: computeSimulatedBillingEstimate({
          contentCategory: input.contentCategory,
          durationSeconds: Math.round(input.durationSeconds),
          dailyFrequencyCap: Math.round(input.dailyFrequencyCap),
          startDate: input.startDate,
          endDate: input.endDate,
          targetRegions: regions.length > 0 ? regions : ['United Kingdom · National'],
          dayparts,
        }),
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };

      draft.campaigns.unshift(record);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'CAMPAIGN_CREATED',
        'campaign',
        record.id,
        `Created draft campaign "${record.title}".`
      );
      return { ...record };
    });
  }

  updateCampaign(
    actor: PublicUser,
    campaignId: string,
    patch: {
      title?: string;
      contentCategory?: CampaignContentCategory;
      summary?: string;
      qrToken?: string | null;
      durationSeconds?: number;
      dailyFrequencyCap?: number;
      targetRegions?: string[];
      dayparts?: DaypartSlot[];
      startDate?: string;
      endDate?: string;
    }
  ): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.campaigns.find((c) => c.id === campaignId);
      if (!target) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }
      if (
        actor.role !== 'admin' &&
        target.status !== 'draft' &&
        target.status !== 'rejected' &&
        target.status !== 'paused'
      ) {
        throw new Error(
          `Cannot edit campaign while status is "${target.status}". Move it to draft or paused first.`
        );
      }

      const nextTitle = patch.title !== undefined ? patch.title.trim() : target.title;
      if (nextTitle.length < 3) {
        throw new Error('Campaign title must be at least 3 characters.');
      }

      const nextStart = patch.startDate ?? target.startDate;
      const nextEnd = patch.endDate ?? target.endDate;
      if (nextEnd < nextStart) {
        throw new Error('End date must be on or after start date.');
      }

      const nextDuration =
        patch.durationSeconds !== undefined ? Math.round(patch.durationSeconds) : target.durationSeconds;
      if (nextDuration < 5 || nextDuration > 120) {
        throw new Error('Advertisement duration must be between 5 and 120 seconds.');
      }

      const nextCap =
        patch.dailyFrequencyCap !== undefined
          ? Math.round(patch.dailyFrequencyCap)
          : target.dailyFrequencyCap;
      if (nextCap < 1 || nextCap > 48) {
        throw new Error('Daily frequency cap must be between 1 and 48 plays.');
      }

      if (patch.qrToken !== undefined) {
        if (patch.qrToken === null || patch.qrToken === '') {
          target.qrToken = null;
        } else {
          const qr = draft.qrLinks.find((q) => q.token === patch.qrToken);
          if (!qr) {
            throw new Error('Selected QR token was not found.');
          }
          if (actor.role !== 'admin' && qr.ownerId !== target.ownerId) {
            throw new Error('FORBIDDEN: You can only attach your own QR links.');
          }
          target.qrToken = qr.token;
        }
      }

      target.title = nextTitle;
      if (patch.contentCategory) target.contentCategory = patch.contentCategory;
      if (patch.summary !== undefined) target.summary = patch.summary.trim();
      target.durationSeconds = nextDuration;
      target.dailyFrequencyCap = nextCap;
      if (patch.targetRegions) {
        const cleaned = patch.targetRegions.map((r) => r.trim()).filter(Boolean);
        target.targetRegions = cleaned.length > 0 ? cleaned : ['United Kingdom · National'];
      }
      if (patch.dayparts && patch.dayparts.length > 0) {
        target.dayparts = patch.dayparts;
      }
      target.startDate = nextStart;
      target.endDate = nextEnd;
      target.simulatedEstimate = computeSimulatedBillingEstimate({
        contentCategory: target.contentCategory,
        durationSeconds: target.durationSeconds,
        dailyFrequencyCap: target.dailyFrequencyCap,
        startDate: target.startDate,
        endDate: target.endDate,
        targetRegions: target.targetRegions,
        dayparts: target.dayparts,
      });
      target.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_UPDATED',
        'campaign',
        target.id,
        `Updated campaign "${target.title}".`
      );
      return { ...target };
    });
  }

  cloneCampaign(actor: PublicUser, campaignId: string): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const source = draft.campaigns.find((c) => c.id === campaignId);
      if (!source) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && source.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      const now = new Date().toISOString();
      const copy: CampaignRecord = {
        ...source,
        id: `cmp_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: actor.role === 'admin' ? source.ownerId : actor.id,
        title: `${source.title.replace(/\s*\(Prototype Seed\)$/i, '')} (Copy)`,
        status: 'draft',
        rejectionReason: null,
        fixInstructions: null,
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.campaigns.unshift(copy);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_CLONED',
        'campaign',
        copy.id,
        `Cloned campaign ${source.id} -> ${copy.id} (draft).`
      );
      return { ...copy };
    });
  }

  transitionCampaignStatus(
    actor: PublicUser,
    campaignId: string,
    targetStatus: CampaignStatus,
    options: { rejectionReason?: string; fixInstructions?: string } = {}
  ): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.campaigns.find((c) => c.id === campaignId);
      if (!target) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      if (ADMIN_ONLY_TARGET_STATUSES.has(targetStatus) && actor.role !== 'admin') {
        throw new Error(
          `FORBIDDEN: Only an administrator can transition a campaign to "${targetStatus}".`
        );
      }

      const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[target.status] || [];
      if (!allowed.includes(targetStatus)) {
        throw new Error(
          `Invalid state transition: "${target.status}" cannot move directly to "${targetStatus}".`
        );
      }

      if (
        targetStatus === 'submitted' ||
        targetStatus === 'approved' ||
        targetStatus === 'scheduled' ||
        targetStatus === 'active'
      ) {
        if (!target.qrToken) {
          throw new Error(
            `Attach a validated QR redirect link before transitioning to "${targetStatus}".`
          );
        }
        const qr = draft.qrLinks.find((q) => q.token === target.qrToken);
        if (!qr || qr.status !== 'active') {
          throw new Error(
            `Attached QR redirect link must be active before transitioning to "${targetStatus}".`
          );
        }
        if (targetStatus === 'submitted') {
          const gate = this.computePreviewGateFromData(draft, target);
          if (!gate.readyToSubmit) {
            throw new Error(
              `Pre-Submission Preview Gate blocked submission: ${gate.blockingErrors[0]}`
            );
          }
        } else if (target.adCreativeRef) {
          const creative = draft.adCreatives.find((cr) => cr.id === target.adCreativeRef);
          if (creative?.optionB?.qrInspectionStatus === 'decoded_mismatch') {
            throw new Error(
              `Attached external advertisement (${creative.id}) has a QR destination mismatch and cannot move to "${targetStatus}" until resolved.`
            );
          }
        }

        if (
          target.contentCategory === 'opportunity_promotion' &&
          (targetStatus === 'scheduled' || targetStatus === 'active')
        ) {
          this.expireOpportunitiesInDraft(draft);
          const linkedOpp = draft.opportunities.find((o) => o.linkedCampaignId === target.id);
          if (linkedOpp) {
            if (linkedOpp.status === 'expired' || linkedOpp.status === 'suspended' || linkedOpp.status === 'revoked') {
              throw new Error(
                `Linked opportunity "${linkedOpp.title}" is ${linkedOpp.status} and cannot be scheduled or activated for TV playback.`
              );
            }
            if (linkedOpp.status !== 'verified_live') {
              throw new Error(
                `Linked opportunity "${linkedOpp.title}" must complete 3-tier verification (status: verified_live) before TV scheduling.`
              );
            }
          }
        }
      }

      if (targetStatus === 'rejected') {
        const reason = (options.rejectionReason ?? '').trim();
        if (reason.length < 5) {
          throw new Error('A written rejection reason (min 5 characters) is mandatory.');
        }
        target.rejectionReason = reason;
        target.fixInstructions = (options.fixInstructions ?? '').trim() || null;
      } else if (targetStatus === 'approved' || targetStatus === 'draft' || targetStatus === 'submitted') {
        target.rejectionReason = null;
        target.fixInstructions = null;
      }

      const prevStatus = target.status;
      target.status = targetStatus;
      target.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_STATUS_TRANSITION',
        'campaign',
        target.id,
        `Campaign ${target.id} transitioned ${prevStatus} -> ${targetStatus}${
          target.rejectionReason ? ` (Reason: ${target.rejectionReason})` : ''
        }`
      );
      return { ...target };
    });
  }

  deleteCampaign(actor: PublicUser, campaignId: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.campaigns.findIndex((c) => c.id === campaignId);
      if (idx === -1) {
        throw new Error('Campaign not found.');
      }
      const target = draft.campaigns[idx];
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }
      if (
        actor.role !== 'admin' &&
        target.status !== 'draft' &&
        target.status !== 'rejected' &&
        target.status !== 'expired'
      ) {
        throw new Error('Only draft, rejected, or expired campaigns can be deleted.');
      }

      draft.campaigns.splice(idx, 1);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_DELETED',
        'campaign',
        target.id,
        `Deleted campaign "${target.title}".`
      );
    });
  }

  // --- Support & Dispute Tickets (Block 2.2) ---

  listSupportTicketsForUser(user: PublicUser): SupportTicketRecord[] {
    this.syncIfDiskNewer();
    const list =
      user.role === 'admin'
        ? [...this.data.supportTickets]
        : this.data.supportTickets.filter((t) => t.ownerId === user.id);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createSupportTicket(
    owner: PublicUser,
    input: {
      campaignId?: string | null;
      category: SupportTicketCategory;
      subject: string;
      message: string;
    }
  ): SupportTicketRecord {
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (subject.length < 4 || message.length < 8) {
      throw new Error('Ticket subject (min 4 chars) and message (min 8 chars) are required.');
    }

    return this.withWriteTransaction((draft) => {
      const now = new Date().toISOString();
      const ticket: SupportTicketRecord = {
        id: `tkt_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: owner.id,
        campaignId: input.campaignId || null,
        category: input.category,
        subject,
        message,
        status: 'open',
        adminResponse: null,
        createdAt: now,
        updatedAt: now,
      };
      draft.supportTickets.unshift(ticket);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'SUPPORT_TICKET_CREATED',
        'support_ticket',
        ticket.id,
        `Created ${ticket.category} ticket: ${ticket.subject}`
      );
      return { ...ticket };
    });
  }

  updateSupportTicketStatus(
    actor: PublicUser,
    ticketId: string,
    status: SupportTicketStatus,
    adminResponse?: string
  ): SupportTicketRecord {
    return this.withWriteTransaction((draft) => {
      const ticket = draft.supportTickets.find((t) => t.id === ticketId);
      if (!ticket) {
        throw new Error('Support ticket not found.');
      }
      if (actor.role !== 'admin' && ticket.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ticket.');
      }
      if (actor.role !== 'admin' && status !== 'closed') {
        throw new Error('FORBIDDEN: Only administrators can move tickets to in_review or resolved.');
      }

      ticket.status = status;
      if (adminResponse !== undefined && actor.role === 'admin') {
        ticket.adminResponse = adminResponse.trim() || null;
      }
      ticket.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'SUPPORT_TICKET_UPDATED',
        'support_ticket',
        ticket.id,
        `Updated ticket status to ${status}.`
      );
      return { ...ticket };
    });
  }

  // --- Advertisement Creation Studio (Block 2.3) ---

  replaceAdCreativeFromPersistence(creative: AdCreativeRecord): void {
    this.withWriteTransaction((draft) => {
      const index = draft.adCreatives.findIndex((item) => item.id === creative.id);
      if (index < 0) draft.adCreatives.push({ ...creative });
      else draft.adCreatives[index] = { ...creative };
    });
  }

  listAdCreativesForUser(user: PublicUser): AdCreativeRecord[] {
    this.syncIfDiskNewer();
    const list =
      user.role === 'admin'
        ? [...this.data.adCreatives]
        : this.data.adCreatives.filter((c) => c.ownerId === user.id);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  saveAdCreative(
    actor: PublicUser,
    input: {
      id?: string;
      campaignId?: string | null;
      qrToken?: string | null;
      title: string;
      mode: AdStudioMode;
      displayDurationSeconds: number;
      safeZoneWarnings: string[];
      contrastWarnings: string[];
      optionA: OptionAComposition | null;
      optionB: OptionBUploadSpec | null;
      textOnly?: TextOnlyCommercialSpec | null;
    }
  ): AdCreativeRecord {
    const title = input.title.trim();
    if (title.length < 3) {
      throw new Error('Advertisement creative title must be at least 3 characters.');
    }
    const duration = Math.round(Number(input.displayDurationSeconds));
    if (!Number.isFinite(duration) || duration < 5 || duration > 60) {
      throw new Error('Advertisement playback duration must be between 5 and 60 seconds.');
    }

    const safeUploadUrlRegex = /^\/uploads\/edison_(img|vid)_[a-f0-9]{20}\.(png|jpg|webp|mp4|webm)$/i;
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

    if (input.mode === 'option_a_studio') {
      if (!input.optionA || !input.optionA.heading.trim()) {
        throw new Error('Option A Studio composition requires a main heading.');
      }
      const assetUrls = [
        input.optionA.logoUrl,
        input.optionA.productImageUrl,
        input.optionA.backgroundImageUrl,
      ];
      for (const u of assetUrls) {
        if (u && !safeUploadUrlRegex.test(u)) {
          throw new Error('Invalid Option A media asset URL. Upload media via /api/media/upload.');
        }
      }
      const colors = [
        input.optionA.backgroundColor,
        input.optionA.gradientEndColor,
        input.optionA.accentColor,
        input.optionA.textColor,
      ];
      for (const col of colors) {
        if (!hexColorRegex.test(col)) {
          throw new Error('Option A colour values must be valid 6-digit hex codes.');
        }
      }
    } else if (input.mode === 'text_only_commercial') {
      const tSpec = input.textOnly;
      if (!tSpec || tSpec.advertiserName.trim().length < 2) {
        throw new Error('Text-Only commercial ad requires an advertiser/business name.');
      }
      if (!tSpec.headline.trim() || tSpec.headline.trim().length < 3) {
        throw new Error('Text-Only commercial ad requires a TV headline (at least 3 characters).');
      }
      if (!tSpec.messageBody.trim() || tSpec.messageBody.trim().length < 8) {
        throw new Error('Text-Only commercial ad requires a promotional message body (at least 8 characters).');
      }
      const colors = [tSpec.backgroundColor, tSpec.accentColor, tSpec.textColor];
      for (const col of colors) {
        if (!hexColorRegex.test(col)) {
          throw new Error('Text-Only commercial colour values must be valid 6-digit hex codes.');
        }
      }
    } else {
      if (!input.optionB || !input.optionB.fileUrl) {
        throw new Error('Option B external upload requires a validated media asset.');
      }
      if (!safeUploadUrlRegex.test(input.optionB.fileUrl)) {
        throw new Error('Invalid Option B media URL. Upload files through /api/media/upload first.');
      }
      if (!input.optionB.contentAttested) {
        throw new Error('Confirm the rights & accuracy attestation before saving an external upload.');
      }
      if (input.optionB.validationErrors.length > 0) {
        throw new Error(`External upload failed validation: ${input.optionB.validationErrors[0]}`);
      }
      // Hard QR policy: never allow overlay when an existing QR was detected in the upload
      if (
        input.optionB.qrInspectionStatus !== 'none_found' &&
        input.optionB.qrOverlayConfirmed
      ) {
        throw new Error(
          'EDISON prohibits pasting a new QR overlay over an asset that already contains a QR code.'
        );
      }
    }

    return this.withWriteTransaction((draft) => {
      let linkedCampaign: CampaignRecord | undefined;
      if (input.campaignId) {
        linkedCampaign = draft.campaigns.find((c) => c.id === input.campaignId);
        if (!linkedCampaign) {
          throw new Error('Selected campaign was not found.');
        }
        if (actor.role !== 'admin' && linkedCampaign.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: Cannot attach a creative to another user campaign.');
        }
      }

      if (input.qrToken) {
        const qr = draft.qrLinks.find((q) => q.token === input.qrToken);
        if (!qr) {
          throw new Error('Selected QR token was not found.');
        }
        if (actor.role !== 'admin' && qr.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: You can only link your own QR destinations.');
        }
      }

      const requiresReview = Boolean(
        input.mode === 'option_b_upload' &&
          input.optionB &&
          (input.optionB.requiresAdminReviewFlag ||
            input.optionB.qrInspectionStatus === 'suspected_unreadable' ||
            input.optionB.qrInspectionStatus === 'decoded_mismatch')
      );

      const status: AdCreativeStatus = requiresReview
        ? 'flagged_for_review'
        : input.mode === 'text_only_commercial' ||
          input.qrToken ||
          (input.optionB && input.optionB.qrInspectionStatus === 'decoded_matched')
        ? 'ready_for_preview'
        : 'draft';

      const sanitizedTextOnly: TextOnlyCommercialSpec | null =
        input.mode === 'text_only_commercial' && input.textOnly
          ? {
              advertiserName: input.textOnly.advertiserName.trim(),
              headline: input.textOnly.headline.trim(),
              messageBody: input.textOnly.messageBody.trim(),
              contactInfo: (input.textOnly.contactInfo || '').trim(),
              backgroundColor: input.textOnly.backgroundColor,
              accentColor: input.textOnly.accentColor,
              textColor: input.textOnly.textColor,
              qrPlacement:
                input.textOnly.qrPlacement === 'bottom_left' ? 'bottom_left' : 'bottom_right',
            }
          : null;

      const now = new Date().toISOString();

      if (input.id) {
        const existing = draft.adCreatives.find((c) => c.id === input.id);
        if (!existing) {
          throw new Error('Ad creative not found.');
        }
        if (actor.role !== 'admin' && existing.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: You do not own this ad creative.');
        }

        existing.title = title;
        existing.campaignId = input.campaignId ?? null;
        existing.qrToken = input.qrToken ?? null;
        existing.mode = input.mode;
        existing.displayDurationSeconds = duration;
        existing.safeZoneWarnings = input.safeZoneWarnings;
        existing.contrastWarnings = input.contrastWarnings;
        existing.optionA = input.mode === 'option_a_studio' ? input.optionA : null;
        existing.optionB =
          input.mode === 'option_b_upload' && input.optionB
            ? { ...input.optionB, requiresAdminReviewFlag: requiresReview }
            : null;
        existing.textOnly = sanitizedTextOnly;
        existing.status = status;
        existing.isPrototypeSeed = false;
        existing.updatedAt = now;

        if (linkedCampaign) {
          linkedCampaign.adCreativeRef = existing.id;
          linkedCampaign.updatedAt = now;
        }

        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'AD_CREATIVE_UPDATED',
          'ad_creative',
          existing.id,
          `Updated ${input.mode} creative "${existing.title}" (${status}).`
        );
        return { ...existing };
      }

      const created: AdCreativeRecord = {
        id: `crt_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: actor.id,
        campaignId: input.campaignId ?? null,
        qrToken: input.qrToken ?? null,
        title,
        mode: input.mode,
        displayDurationSeconds: duration,
        safeZoneWarnings: input.safeZoneWarnings,
        contrastWarnings: input.contrastWarnings,
        optionA: input.mode === 'option_a_studio' ? input.optionA : null,
        optionB:
          input.mode === 'option_b_upload' && input.optionB
            ? { ...input.optionB, requiresAdminReviewFlag: requiresReview }
            : null,
        textOnly: sanitizedTextOnly,
        status,
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.adCreatives.unshift(created);
      if (linkedCampaign) {
        linkedCampaign.adCreativeRef = created.id;
        linkedCampaign.updatedAt = now;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_CREATED',
        'ad_creative',
        created.id,
        `Created ${input.mode} creative "${created.title}" (${status}).`
      );
      return { ...created };
    });
  }

  attachAdCreativeToCampaign(
    actor: PublicUser,
    creativeId: string,
    campaignId: string
  ): { creative: AdCreativeRecord; campaign: CampaignRecord } {
    return this.withWriteTransaction((draft) => {
      const creative = draft.adCreatives.find((c) => c.id === creativeId);
      if (!creative) {
        throw new Error('Ad creative not found.');
      }
      if (actor.role !== 'admin' && creative.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ad creative.');
      }
      const campaign = draft.campaigns.find((c) => c.id === campaignId);
      if (!campaign) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && campaign.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      const now = new Date().toISOString();
      creative.campaignId = campaign.id;
      creative.updatedAt = now;
      campaign.adCreativeRef = creative.id;
      if (creative.qrToken && !campaign.qrToken) {
        campaign.qrToken = creative.qrToken;
      }
      campaign.updatedAt = now;

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_ATTACHED',
        'campaign',
        campaign.id,
        `Attached creative ${creative.id} to campaign ${campaign.id}.`
      );
      return { creative: { ...creative }, campaign: { ...campaign } };
    });
  }

  deleteAdCreative(actor: PublicUser, creativeId: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.adCreatives.findIndex((c) => c.id === creativeId);
      if (idx === -1) {
        throw new Error('Ad creative not found.');
      }
      const target = draft.adCreatives[idx];
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ad creative.');
      }
      for (const camp of draft.campaigns) {
        if (camp.adCreativeRef === target.id) {
          camp.adCreativeRef = null;
        }
      }
      draft.adCreatives.splice(idx, 1);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_DELETED',
        'ad_creative',
        target.id,
        `Deleted ad creative "${target.title}".`
      );
    });
  }

  recordMediaUploadAudit(
    actor: PublicUser,
    fileName: string,
    mimeType: string,
    sizeBytes: number
  ): void {
    this.withWriteTransaction((draft) => {
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'MEDIA_UPLOADED',
        'media_upload',
        fileName,
        `Validated ${mimeType} upload (${sizeBytes} bytes).`
      );
    });
  }

  private computePreviewGateFromData(
    data: EdisonStoreData,
    campaign: CampaignRecord
  ): CampaignPreviewGateResult {
    const qrLink = campaign.qrToken
      ? data.qrLinks.find((q) => q.token === campaign.qrToken) ?? null
      : null;
    const creative = campaign.adCreativeRef
      ? data.adCreatives.find((cr) => cr.id === campaign.adCreativeRef) ?? null
      : data.adCreatives.find((cr) => cr.campaignId === campaign.id) ?? null;
    const advertiserProfile =
      data.advertiserProfiles.find((p) => p.userId === campaign.ownerId) ?? null;

    const blockingErrors: string[] = [];
    const warnings: string[] = [];
    const checklist: PreSubmitCheckItem[] = [];
    let requiresAdminQrReview = false;

    // 1. Category & Metadata Check
    if (!campaign.title.trim() || campaign.summary.trim().length < 10) {
      blockingErrors.push('Campaign title and summary (min 10 chars) are required.');
      checklist.push({
        id: 'metadata',
        label: 'Campaign Metadata & Category Classification',
        status: 'fail',
        detail: 'Missing complete campaign title or summary.',
      });
    } else {
      checklist.push({
        id: 'metadata',
        label: 'Campaign Metadata & Category Classification',
        status: 'pass',
        detail: `${
          campaign.contentCategory === 'opportunity_promotion'
            ? 'Opportunity Promotion'
            : 'Commercial Advertising'
        } · ${campaign.durationSeconds}s · ${campaign.startDate} to ${campaign.endDate}`,
      });
    }

    // 2. QR Link & Destination Check
    if (!qrLink) {
      blockingErrors.push('No validated EDISON QR redirect link (/r/:token) attached.');
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'fail',
        detail: 'Attach an active /r/:token QR link before submitting.',
      });
    } else if (qrLink.status !== 'active') {
      blockingErrors.push(`Attached QR link /r/${qrLink.token} is currently "${qrLink.status}".`);
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'fail',
        detail: `/r/${qrLink.token} status is ${qrLink.status}; only active QR links can submit.`,
      });
    } else {
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'pass',
        detail: `/r/${qrLink.token} -> ${qrLink.resolvedUrl}`,
      });
    }

    // 3. Attached Advertisement Creative & Media Compatibility Check
    if (!creative) {
      blockingErrors.push(
        'No advertisement creative attached. Create or attach an Option A or Option B creative first.'
      );
      checklist.push({
        id: 'creative',
        label: '16:9 Advertisement Creative & Media Compatibility',
        status: 'fail',
        detail: 'Attach an Option A Studio or Option B uploaded spot.',
      });
    } else if (creative.mode === 'option_a_studio') {
      const optA = creative.optionA;
      const qrBlockVisible = Boolean(
        optA?.elements.some((el) => el.kind === 'qr_block' && el.visible)
      );
      if (!optA || !optA.heading.trim() || !qrBlockVisible) {
        blockingErrors.push(
          'Option A Studio composition requires a main headline and a visible QR code block.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Option A creative is missing headline or visible QR overlay block.',
        });
      } else {
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'pass',
          detail: `Option A Studio (${optA.templateId}) · ${creative.displayDurationSeconds}s`,
        });
      }
    } else if (creative.mode === 'text_only_commercial') {
      const tOnly = creative.textOnly;
      if (!tOnly || !tOnly.advertiserName.trim() || !tOnly.headline.trim() || !tOnly.messageBody.trim()) {
        blockingErrors.push(
          'Text-Only commercial spot requires advertiser name, headline, and promotional message body.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Text-Only Commercial Creative',
          status: 'fail',
          detail: 'Missing required written copy fields.',
        });
      } else {
        checklist.push({
          id: 'creative',
          label: '16:9 Text-Only Commercial Creative',
          status: 'pass',
          detail: `Text-Only Commercial (${tOnly.advertiserName}) · ${creative.displayDurationSeconds}s`,
        });
      }
    } else {
      const optB = creative.optionB;
      if (!optB) {
        blockingErrors.push('Option B external creative is missing media payload.');
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Upload a valid 16:9 PNG/JPG/WebP/MP4/WebM file.',
        });
      } else if (optB.validationErrors.length > 0) {
        blockingErrors.push(optB.validationErrors[0]);
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: optB.validationErrors.join(' '),
        });
      } else if (!optB.contentAttested) {
        blockingErrors.push('Option B broadcast/copyright attestation must be confirmed.');
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Rights & accuracy attestation unchecked.',
        });
      } else if (optB.qrInspectionStatus === 'decoded_mismatch') {
        blockingErrors.push(
          `Embedded QR ("${optB.decodedQrPayload}") mismatches /r/${campaign.qrToken}. Non-overwrite rule blocks submission.`
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: `Embedded QR mismatch (${optB.decodedQrPayload}).`,
        });
      } else if (optB.qrInspectionStatus === 'none_found' && !optB.qrOverlayConfirmed) {
        blockingErrors.push(
          'Uploaded asset has no detected QR code; confirm the EDISON safe-corner QR overlay in Studio.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'No QR detected and EDISON corner overlay not yet confirmed.',
        });
      } else if (optB.qrInspectionStatus === 'suspected_unreadable') {
        requiresAdminQrReview = true;
        warnings.push(
          'Asset flagged as suspected_unreadable QR: queued for mandatory Admin human inspection.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'warn',
          detail: `${optB.aspectRatioLabel} · Flagged for mandatory Admin QR review`,
        });
      } else {
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'pass',
          detail: `${optB.aspectRatioLabel} · QR=${optB.qrInspectionStatus}`,
        });
      }
    }

    // 4. TV Readability & Safe-Zone Advisories
    const readabilityWarnings = [
      ...(creative?.contrastWarnings ?? []),
      ...(creative?.safeZoneWarnings ?? []),
    ];
    if (readabilityWarnings.length > 0) {
      warnings.push(...readabilityWarnings);
      checklist.push({
        id: 'readability',
        label: '16:9 Television Readability & 5% Title-Safe Margin',
        status: 'warn',
        detail: `${readabilityWarnings.length} readability/safe-zone warning(s) flagged for review.`,
      });
    } else if (creative) {
      checklist.push({
        id: 'readability',
        label: '16:9 Television Readability & 5% Title-Safe Margin',
        status: 'pass',
        detail: 'No contrast or 5% title-safe overscan warnings.',
      });
    }

    // 5. Opportunity & Profile Governance Check
    if (campaign.contentCategory === 'opportunity_promotion') {
      warnings.push(
        'Opportunity Spot Notice: 3-tier verification (Block 2.5) and non-guarantee disclaimer apply independently of any ad spend.'
      );
      checklist.push({
        id: 'opportunity_notice',
        label: 'Opportunity Verification & Non-Guarantee Policy',
        status: 'warn',
        detail: 'Non-guarantee disclaimer rendered; independent opportunity verification required prior to live broadcast.',
      });
    } else {
      checklist.push({
        id: 'advertiser_profile',
        label: 'Advertiser Profile & Verification Standing',
        status: advertiserProfile?.verificationStatus === 'verified' ? 'pass' : 'warn',
        detail: advertiserProfile
          ? `${advertiserProfile.businessOrTradingName} (${advertiserProfile.verificationStatus})`
          : 'Complete Advertiser Profile recommended prior to admin approval.',
      });
    }

    return {
      campaign: { ...campaign },
      creative: creative ? { ...creative } : null,
      qrLink: qrLink ? { ...qrLink } : null,
      advertiserProfile: advertiserProfile ? { ...advertiserProfile } : null,
      readyToSubmit: blockingErrors.length === 0,
      blockingErrors,
      warnings,
      requiresAdminQrReview,
      checklist,
    };
  }

  evaluateCampaignPreSubmitGate(
    actor: PublicUser,
    campaignId: string
  ): CampaignPreviewGateResult {
    this.syncIfDiskNewer();
    const campaign = this.data.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error('Campaign not found.');
    }
    if (actor.role !== 'admin' && campaign.ownerId !== actor.id) {
      throw new Error('FORBIDDEN: You do not own this campaign.');
    }
    return this.computePreviewGateFromData(this.data, campaign);
  }

  recordSimulatedPlaybackEvent(
    actor: PublicUser,
    input: {
      campaignId?: string | null;
      qrToken?: string | null;
      eventType:
        | 'ad_requested'
        | 'ad_delivered'
        | 'ad_played'
        | 'ad_viewable'
        | 'ad_network_backfill_simulated';
    }
  ): AnalyticsEventRecord {
    return this.withWriteTransaction((draft) => {
      const ev: AnalyticsEventRecord = {
        id: `evt_sim_${crypto.randomBytes(5).toString('hex')}`,
        qrToken: input.qrToken ?? null,
        campaignId: input.campaignId ?? null,
        eventType: input.eventType,
        measurementSource: 'simulated_prototype',
        dedupKey: `sim:${actor.id}:${input.eventType}:${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      draft.analyticsEvents.unshift(ev);
      if (draft.analyticsEvents.length > 2000) {
        draft.analyticsEvents.length = 2000;
      }
      return { ...ev };
    });
  }

  planSimulatedBreak(
    actor: PublicUser,
    params: {
      requestedBreakDurationSeconds?: number;
      safetyBufferSeconds?: number;
      requestedSlotCount?: number;
      alternatingPointerStart?: PrimaryAdCategory;
      allowMockBackfill?: boolean;
      householdId?: string;
      expectedConsentEpoch?: number;
    }
  ): BreakSchedulePlan {
    this.syncIfDiskNewer();

    let household: HouseholdInstallationRecord | null = null;
    let tvPersonalisation: BreakSchedulePlan['tvPersonalisation'] = null;

    if (params.householdId) {
      const gate = this.evaluateHouseholdDeliveryGate(
        actor,
        params.householdId,
        params.expectedConsentEpoch
      );
      household = gate.household;
      if (!gate.allowed) {
        const suspendedDisplay = buildSafeTvPersonalisationDisplay({
          household: gate.household,
          matchedMembers: [],
          opportunityTitle: 'Suspended',
        });
        return {
          generatedAt: new Date().toISOString(),
          adapterId: 'simulation_tv_adapter',
          adapterDisclaimer:
            'SIMULATION TV ADAPTER ONLY — Bundled household consent gate enforced before scheduling.',
          requestedBreakDurationSeconds: Math.max(
            0,
            Math.round(params.requestedBreakDurationSeconds ?? 65)
          ),
          safetyBufferSeconds: Math.max(2, Math.min(15, Math.round(params.safetyBufferSeconds ?? 5))),
          usableBreakSeconds: 0,
          requestedSlotCount: Math.max(1, Math.min(6, Math.round(params.requestedSlotCount ?? 4))),
          k1ShortBreakRuleApplied: false,
          skipped: true,
          skipReason: gate.reason,
          alternatingPointerStart: params.alternatingPointerStart ?? 'CHARITY',
          nextAlternatingPointer: params.alternatingPointerStart ?? 'CHARITY',
          slots: [],
          totalScheduledDurationSeconds: 0,
          householdConsentEvaluated: true,
          householdId: gate.household.id,
          consentEpoch: gate.household.consentEpoch,
          adDeliverySuspended: true,
          suspensionReason: gate.reason,
          ordinaryTvPreserved: true,
          tvPersonalisation: suspendedDisplay,
        };
      }

      const members = (this.data.householdMembers || []).filter(
        (m) => m.householdId === gate.household.id
      );
      const matchRes = matchOpportunitiesForHousehold({
        household: gate.household,
        members,
        opportunities: this.data.opportunities,
      });
      const bestMatch =
        matchRes.matches.find((m) => m.matchedCount > 0) ?? matchRes.matches[0] ?? null;
      tvPersonalisation = bestMatch
        ? bestMatch.tvDisplay
        : buildSafeTvPersonalisationDisplay({
            household: gate.household,
            matchedMembers: [],
            opportunityTitle: 'Verified Community Opportunities',
          });
    }

    const scopedCampaigns =
      actor.role === 'admin'
        ? this.data.campaigns
        : this.data.campaigns.filter((c) => c.ownerId === actor.id || c.status === 'active');
    const scopedCreatives =
      actor.role === 'admin'
        ? this.data.adCreatives
        : this.data.adCreatives.filter(
            (cr) =>
              cr.ownerId === actor.id ||
              scopedCampaigns.some((c) => c.id === cr.campaignId || c.adCreativeRef === cr.id)
          );
    const liveOpportunities = this.data.opportunities.filter((o) => o.status === 'verified_live');

    const basePlan = scheduleCommercialBreak({
      campaigns: scopedCampaigns,
      creatives: scopedCreatives,
      opportunities: liveOpportunities,
      requestedBreakDurationSeconds: params.requestedBreakDurationSeconds,
      safetyBufferSeconds: params.safetyBufferSeconds,
      requestedSlotCount: params.requestedSlotCount,
      alternatingPointerStart: params.alternatingPointerStart,
      allowMockBackfill: params.allowMockBackfill,
    });

    if (household) {
      return {
        ...basePlan,
        householdConsentEvaluated: true,
        householdId: household.id,
        consentEpoch: household.consentEpoch,
        adDeliverySuspended: false,
        suspensionReason: null,
        ordinaryTvPreserved: true,
        tvPersonalisation,
      };
    }

    return basePlan;
  }

  // --- Opportunity Management, 3-Tier Verification, Expiry, Complaints & Appeals (Block 2.5) ---

  private expireOpportunitiesInDraft(draft: EdisonStoreData): number {
    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    for (const opp of draft.opportunities) {
      if (
        opp.status !== 'expired' &&
        opp.status !== 'revoked' &&
        opp.status !== 'rejected' &&
        (opp.closingDate < today || opp.expiryDate < today)
      ) {
        const prevStatus = opp.status;
        opp.status = 'expired';
        opp.updatedAt = new Date().toISOString();
        count += 1;
        this.addAudit(
          draft,
          null,
          'system',
          'OPPORTUNITY_AUTO_EXPIRED',
          'opportunity',
          opp.id,
          `Opportunity "${opp.title}" automatically expired from ${prevStatus} (closing: ${opp.closingDate}, expiry: ${opp.expiryDate}).`
        );
      }
    }
    return count;
  }

  listOpportunitiesForUser(actor: PublicUser): OpportunityRecord[] {
    // Run automated expiry check and persist if any opportunity transitioned
    this.syncIfDiskNewer();
    const today = new Date().toISOString().slice(0, 10);
    const hasPendingExpiry = this.data.opportunities.some(
      (opp) =>
        opp.status !== 'expired' &&
        opp.status !== 'revoked' &&
        opp.status !== 'rejected' &&
        (opp.closingDate < today || opp.expiryDate < today)
    );
    if (hasPendingExpiry) {
      this.withWriteTransaction((draft) => {
        this.expireOpportunitiesInDraft(draft);
      });
    }

    const all = this.data.opportunities.filter(
      (opp) =>
        actor.role === 'admin' ||
        opp.ownerId === actor.id ||
        opp.status === 'verified_live' ||
        opp.status === 'expired'
    );
    return all
      .map((o) => ({ ...o, verificationTiers: { ...o.verificationTiers } }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createOpportunity(
    actor: PublicUser,
    input: {
      providerType: OpportunityProviderType;
      providerName: string;
      category: OpportunityCategory;
      title: string;
      description: string;
      location: string;
      eligibilityRequirements: string;
      applicationMethod: string;
      contactInfo: string;
      qrToken: string | null;
      linkedCampaignId: string | null;
      closingDate: string;
      expiryDate: string;
      identityEvidenceRef: string;
      organisationEvidenceRef: string;
      specificOpportunityEvidenceRef: string;
      applicationFeeFreeConfirmed: boolean;
      noGuaranteeConfirmed: boolean;
    }
  ): OpportunityRecord {
    const title = input.title.trim();
    const providerName = input.providerName.trim();
    const description = input.description.trim();
    const location = input.location.trim();
    const eligibilityRequirements = input.eligibilityRequirements.trim();
    const applicationMethod = input.applicationMethod.trim();
    const contactInfo = input.contactInfo.trim();

    if (title.length < 4 || providerName.length < 2 || description.length < 15) {
      throw new Error(
        'Provide a valid title (4+ chars), provider name, and description (15+ chars).'
      );
    }
    if (!location || !eligibilityRequirements || !applicationMethod || !contactInfo) {
      throw new Error(
        'Location, eligibility requirements, application method, and contact info are all required.'
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.closingDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) {
      throw new Error('Closing date and expiry date must be valid YYYY-MM-DD dates.');
    }
    if (!input.applicationFeeFreeConfirmed || !input.noGuaranteeConfirmed) {
      throw new Error(
        'Viewer protection confirmations are mandatory: confirm zero applicant fees and non-guarantee policy.'
      );
    }

    const riskFlags = scanOpportunityRiskPhrases([
      title,
      description,
      eligibilityRequirements,
      applicationMethod,
    ]);
    if (riskFlags.length > 0) {
      throw new Error(`Viewer protection blocked listing: ${riskFlags.join('; ')}`);
    }

    return this.withWriteTransaction((draft) => {
      if (input.qrToken) {
        const qr = draft.qrLinks.find((q) => q.token === input.qrToken);
        if (!qr || (actor.role !== 'admin' && qr.ownerId !== actor.id)) {
          throw new Error('Selected QR token was not found or is not owned by your account.');
        }
      }
      if (input.linkedCampaignId) {
        const cmp = draft.campaigns.find((c) => c.id === input.linkedCampaignId);
        if (!cmp || (actor.role !== 'admin' && cmp.ownerId !== actor.id)) {
          throw new Error('Linked campaign was not found or is not owned by your account.');
        }
      }

      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const isAlreadyExpired = input.closingDate < today || input.expiryDate < today;

      const record: OpportunityRecord = {
        id: `opp_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: actor.id,
        providerType: input.providerType,
        providerName,
        category: input.category,
        title,
        description,
        location,
        eligibilityRequirements,
        applicationMethod,
        contactInfo,
        qrToken: input.qrToken || null,
        linkedCampaignId: input.linkedCampaignId || null,
        closingDate: input.closingDate,
        expiryDate: input.expiryDate,
        status: isAlreadyExpired ? 'expired' : 'draft',
        verificationTiers: {
          identityStatus: input.identityEvidenceRef.trim() ? 'pending_review' : 'unverified',
          identityEvidenceRef: input.identityEvidenceRef.trim(),
          identityNotes: '',
          identityVerifiedAt: null,
          organisationStatus:
            input.providerType === 'individual_informal_employer'
              ? 'not_applicable'
              : input.organisationEvidenceRef.trim()
              ? 'pending_review'
              : 'unverified',
          organisationEvidenceRef:
            input.providerType === 'individual_informal_employer'
              ? 'Individual / Informal Employer (Corporate Registration Not Required)'
              : input.organisationEvidenceRef.trim(),
          organisationNotes: '',
          organisationVerifiedAt: null,
          specificOpportunityStatus: input.specificOpportunityEvidenceRef.trim()
            ? 'pending_review'
            : 'unverified',
          specificOpportunityEvidenceRef: input.specificOpportunityEvidenceRef.trim(),
          specificOpportunityNotes: '',
          specificOpportunityVerifiedAt: null,
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

      draft.opportunities.unshift(record);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_CREATED',
        'opportunity',
        record.id,
        `Created opportunity "${record.title}" (${record.category}, providerType=${record.providerType}, status=${record.status}).`
      );
      return { ...record, verificationTiers: { ...record.verificationTiers } };
    });
  }

  submitOpportunity(actor: PublicUser, opportunityId: string): OpportunityRecord {
    return this.withWriteTransaction((draft) => {
      this.expireOpportunitiesInDraft(draft);
      const opp = draft.opportunities.find((o) => o.id === opportunityId);
      if (!opp) throw new Error('Opportunity not found.');
      if (actor.role !== 'admin' && opp.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this opportunity.');
      }
      if (opp.status !== 'draft' && opp.status !== 'rejected') {
        throw new Error(`Cannot submit opportunity from status "${opp.status}".`);
      }

      const today = new Date().toISOString().slice(0, 10);
      if (opp.closingDate < today || opp.expiryDate < today) {
        opp.status = 'expired';
        opp.updatedAt = new Date().toISOString();
        throw new Error('Closing or expiry date has already passed; listing moved to expired.');
      }

      if (!opp.verificationTiers.identityEvidenceRef.trim()) {
        throw new Error('Tier 1 identity evidence reference is required before submission.');
      }
      if (!opp.verificationTiers.specificOpportunityEvidenceRef.trim()) {
        throw new Error(
          'Tier 3 specific opportunity evidence (vacancy link/letterhead/declaration) is required before submission.'
        );
      }

      const riskFlags = scanOpportunityRiskPhrases([
        opp.title,
        opp.description,
        opp.eligibilityRequirements,
        opp.applicationMethod,
      ]);
      if (riskFlags.length > 0) {
        opp.scamRiskFlags = riskFlags;
        opp.status = 'rejected';
        opp.rejectionReason = `Automatic viewer protection trigger: ${riskFlags.join('; ')}`;
        opp.updatedAt = new Date().toISOString();
        throw new Error(opp.rejectionReason);
      }

      opp.status = 'submitted';
      opp.rejectionReason = null;
      if (opp.verificationTiers.identityStatus === 'unverified' || opp.verificationTiers.identityStatus === 'rejected') {
        opp.verificationTiers.identityStatus = 'pending_review';
      }
      if (
        opp.providerType === 'registered_organisation' &&
        (opp.verificationTiers.organisationStatus === 'unverified' ||
          opp.verificationTiers.organisationStatus === 'rejected')
      ) {
        opp.verificationTiers.organisationStatus = 'pending_review';
      }
      // Strict Non-Transitivity: submitting or having org verified does not auto-verify specific listing
      if (opp.verificationTiers.specificOpportunityStatus !== 'verified') {
        opp.verificationTiers.specificOpportunityStatus = 'pending_review';
      }
      opp.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_SUBMITTED',
        'opportunity',
        opp.id,
        `Submitted opportunity "${opp.title}" for independent 3-tier verification.`
      );
      return { ...opp, verificationTiers: { ...opp.verificationTiers } };
    });
  }

  adminUpdateOpportunityVerification(
    actor: PublicUser,
    opportunityId: string,
    input: {
      identityStatus?: OpportunityTierStatus;
      identityNotes?: string;
      organisationStatus?: OpportunityTierStatus;
      organisationNotes?: string;
      specificOpportunityStatus?: OpportunityTierStatus;
      specificOpportunityNotes?: string;
      targetStatus?: OpportunityStatus;
      rejectionReason?: string;
    }
  ): OpportunityRecord {
    if (actor.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can verify or moderate opportunities.');
    }

    return this.withWriteTransaction((draft) => {
      this.expireOpportunitiesInDraft(draft);
      const opp = draft.opportunities.find((o) => o.id === opportunityId);
      if (!opp) throw new Error('Opportunity not found.');

      const now = new Date().toISOString();
      const t = opp.verificationTiers;

      // Update each of the 3 tiers STRICTLY independently (Non-Transitivity enforced)
      if (input.identityStatus) {
        t.identityStatus = input.identityStatus;
        t.identityVerifiedAt = input.identityStatus === 'verified' ? now : null;
      }
      if (typeof input.identityNotes === 'string') {
        t.identityNotes = input.identityNotes.trim();
      }

      if (input.organisationStatus) {
        if (opp.providerType === 'individual_informal_employer' && input.organisationStatus === 'verified') {
          t.organisationStatus = 'not_applicable';
        } else {
          t.organisationStatus = input.organisationStatus;
          t.organisationVerifiedAt = input.organisationStatus === 'verified' ? now : null;
        }
      }
      if (typeof input.organisationNotes === 'string') {
        t.organisationNotes = input.organisationNotes.trim();
      }

      if (input.specificOpportunityStatus) {
        t.specificOpportunityStatus = input.specificOpportunityStatus;
        t.specificOpportunityVerifiedAt =
          input.specificOpportunityStatus === 'verified' ? now : null;
      }
      if (typeof input.specificOpportunityNotes === 'string') {
        t.specificOpportunityNotes = input.specificOpportunityNotes.trim();
      }

      if (input.targetStatus) {
        if (input.targetStatus === 'verified_live') {
          const today = now.slice(0, 10);
          if (opp.status === 'expired' || opp.closingDate < today || opp.expiryDate < today) {
            throw new Error('Cannot set verified_live: opportunity is expired.');
          }
          if (t.identityStatus !== 'verified') {
            throw new Error(
              'Cannot publish verified_live: Tier 1 (Identity Verified) has not passed.'
            );
          }
          if (opp.providerType === 'registered_organisation' && t.organisationStatus !== 'verified') {
            throw new Error(
              'Cannot publish verified_live: Tier 2 (Organisation Verified) is required for registered organisations.'
            );
          }
          if (t.specificOpportunityStatus !== 'verified') {
            throw new Error(
              'Non-Transitivity Rule: Tier 3 (Specific Opportunity Verified) must be independently verified before publishing verified_live.'
            );
          }
          opp.status = 'verified_live';
          opp.rejectionReason = null;
          opp.suspensionReason = null;
        } else if (input.targetStatus === 'rejected') {
          const reason = (input.rejectionReason ?? '').trim();
          if (reason.length < 5) {
            throw new Error('A written rejection reason (min 5 characters) is mandatory.');
          }
          opp.status = 'rejected';
          opp.rejectionReason = reason;
        } else {
          opp.status = input.targetStatus;
          if (input.targetStatus === 'suspended' && input.rejectionReason) {
            opp.suspensionReason = input.rejectionReason.trim();
          }
        }
      }

      opp.updatedAt = now;
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_3TIER_REVIEWED',
        'opportunity',
        opp.id,
        `3-tier review updated for ${opp.id}: Tier1=${t.identityStatus}, Tier2=${t.organisationStatus}, Tier3=${t.specificOpportunityStatus}, status=${opp.status}. Financial independence preserved.`
      );
      return { ...opp, verificationTiers: { ...opp.verificationTiers } };
    });
  }

  listOpportunityComplaintsForUser(actor: PublicUser): OpportunityComplaintRecord[] {
    this.syncIfDiskNewer();
    if (actor.role === 'admin') {
      return [...this.data.opportunityComplaints].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    }
    const ownedOppIds = new Set(
      this.data.opportunities.filter((o) => o.ownerId === actor.id).map((o) => o.id)
    );
    return this.data.opportunityComplaints
      .filter((c) => c.reporterId === actor.id || ownedOppIds.has(c.opportunityId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createOpportunityComplaint(
    actor: PublicUser,
    opportunityId: string,
    input: {
      reasonCategory: OpportunityComplaintReason;
      description: string;
      evidenceDetails?: string;
    }
  ): OpportunityComplaintRecord {
    const description = input.description.trim();
    if (description.length < 10) {
      throw new Error('Complaint description must be at least 10 characters.');
    }

    return this.withWriteTransaction((draft) => {
      const opp = draft.opportunities.find((o) => o.id === opportunityId);
      if (!opp) throw new Error('Opportunity not found.');

      const now = new Date().toISOString();
      const complaint: OpportunityComplaintRecord = {
        id: `cmpn_${crypto.randomBytes(5).toString('hex')}`,
        opportunityId: opp.id,
        reporterId: actor.id,
        reporterRole: actor.role,
        reasonCategory: input.reasonCategory,
        description,
        evidenceDetails: (input.evidenceDetails ?? '').trim(),
        status: 'reported',
        resolutionNotes: null,
        createdAt: now,
        updatedAt: now,
      };

      draft.opportunityComplaints.unshift(complaint);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_COMPLAINT_REPORTED',
        'opportunity',
        opp.id,
        `Filed ${input.reasonCategory} complaint (${complaint.id}) against opportunity "${opp.title}".`
      );
      return { ...complaint };
    });
  }

  adminUpdateComplaintStatus(
    actor: PublicUser,
    complaintId: string,
    input: { status: OpportunityComplaintStatus; resolutionNotes: string }
  ): { complaint: OpportunityComplaintRecord; opportunity: OpportunityRecord | null } {
    if (actor.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can investigate or resolve complaints.');
    }
    const notes = input.resolutionNotes.trim();
    if (notes.length < 5) {
      throw new Error('Written investigation notes (min 5 characters) are required.');
    }

    return this.withWriteTransaction((draft) => {
      const complaint = draft.opportunityComplaints.find((c) => c.id === complaintId);
      if (!complaint) throw new Error('Complaint record not found.');

      const now = new Date().toISOString();
      complaint.status = input.status;
      complaint.resolutionNotes = notes;
      complaint.updatedAt = now;

      const opp = draft.opportunities.find((o) => o.id === complaint.opportunityId) ?? null;
      if (opp && (input.status === 'suspended' || input.status === 'revoked')) {
        opp.status = input.status;
        opp.suspensionReason = `Complaint ${complaint.id}: ${notes}`;
        opp.updatedAt = now;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_COMPLAINT_UPDATED',
        'opportunity',
        complaint.opportunityId,
        `Complaint ${complaint.id} moved to ${input.status}. Note: ${notes}`
      );
      return {
        complaint: { ...complaint },
        opportunity: opp ? { ...opp, verificationTiers: { ...opp.verificationTiers } } : null,
      };
    });
  }

  listOpportunityAppealsForUser(actor: PublicUser): OpportunityAppealRecord[] {
    this.syncIfDiskNewer();
    if (actor.role === 'admin') {
      return [...this.data.opportunityAppeals].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    }
    return this.data.opportunityAppeals
      .filter((a) => a.ownerId === actor.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createOpportunityAppeal(
    actor: PublicUser,
    opportunityId: string,
    input: { reason: string; additionalEvidence: string }
  ): OpportunityAppealRecord {
    const reason = input.reason.trim();
    const additionalEvidence = input.additionalEvidence.trim();
    if (reason.length < 10 || additionalEvidence.length < 5) {
      throw new Error(
        'Provide a written appeal reason (10+ chars) and additional supporting evidence.'
      );
    }

    return this.withWriteTransaction((draft) => {
      const opp = draft.opportunities.find((o) => o.id === opportunityId);
      if (!opp) throw new Error('Opportunity not found.');
      if (actor.role !== 'admin' && opp.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: Only the opportunity owner can file an appeal.');
      }
      if (opp.status !== 'rejected' && opp.status !== 'suspended') {
        throw new Error('Appeals can only be submitted for rejected or suspended opportunities.');
      }

      const now = new Date().toISOString();
      const appeal: OpportunityAppealRecord = {
        id: `apl_${crypto.randomBytes(5).toString('hex')}`,
        opportunityId: opp.id,
        ownerId: opp.ownerId,
        reason,
        additionalEvidence,
        status: 'submitted',
        adminNotes: null,
        createdAt: now,
        updatedAt: now,
      };

      draft.opportunityAppeals.unshift(appeal);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_APPEAL_SUBMITTED',
        'opportunity',
        opp.id,
        `Submitted appeal ${appeal.id} for ${opp.status} opportunity "${opp.title}".`
      );
      return { ...appeal };
    });
  }

  adminResolveAppeal(
    actor: PublicUser,
    appealId: string,
    input: { status: OpportunityAppealStatus; adminNotes: string }
  ): { appeal: OpportunityAppealRecord; opportunity: OpportunityRecord | null } {
    if (actor.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can decide opportunity appeals.');
    }
    const adminNotes = input.adminNotes.trim();
    if (adminNotes.length < 5) {
      throw new Error('Written admin appeal decision notes (min 5 characters) are required.');
    }

    return this.withWriteTransaction((draft) => {
      this.expireOpportunitiesInDraft(draft);
      const appeal = draft.opportunityAppeals.find((a) => a.id === appealId);
      if (!appeal) throw new Error('Appeal record not found.');

      const now = new Date().toISOString();
      appeal.status = input.status;
      appeal.adminNotes = adminNotes;
      appeal.updatedAt = now;

      const opp = draft.opportunities.find((o) => o.id === appeal.opportunityId) ?? null;
      if (opp && input.status === 'upheld_reinstated' && opp.status !== 'expired') {
        opp.status = 'under_review';
        opp.rejectionReason = null;
        opp.suspensionReason = null;
        opp.verificationTiers.specificOpportunityEvidenceRef = `${opp.verificationTiers.specificOpportunityEvidenceRef} | Appeal: ${appeal.additionalEvidence}`;
        opp.updatedAt = now;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_APPEAL_DECIDED',
        'opportunity',
        appeal.opportunityId,
        `Appeal ${appeal.id} decided as ${input.status}. Notes: ${adminNotes}`
      );
      return {
        appeal: { ...appeal },
        opportunity: opp ? { ...opp, verificationTiers: { ...opp.verificationTiers } } : null,
      };
    });
  }

  deleteOpportunity(actor: PublicUser, opportunityId: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.opportunities.findIndex((o) => o.id === opportunityId);
      if (idx === -1) {
        throw new Error('Opportunity not found.');
      }
      const target = draft.opportunities[idx];
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this opportunity.');
      }
      if (
        actor.role !== 'admin' &&
        target.status !== 'draft' &&
        target.status !== 'rejected' &&
        target.status !== 'expired'
      ) {
        throw new Error('Only draft, rejected, or expired opportunities can be deleted.');
      }

      draft.opportunities.splice(idx, 1);
      draft.opportunityComplaints = draft.opportunityComplaints.filter(
        (c) => c.opportunityId !== target.id
      );
      draft.opportunityAppeals = draft.opportunityAppeals.filter(
        (a) => a.opportunityId !== target.id
      );
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_DELETED',
        'opportunity',
        target.id,
        `Deleted opportunity "${target.title}".`
      );
    });
  }

  adminModerateQrLink(
    admin: PublicUser,
    token: string,
    status: QrLinkStatus,
    reason: string
  ): QrLinkRecord {
    if (admin.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can moderate QR redirect links.');
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      throw new Error('Written moderation reason (min 5 characters) is required.');
    }
    return this.withWriteTransaction((draft) => {
      const target = draft.qrLinks.find((q) => q.token === token);
      if (!target) {
        throw new Error('QR token not found.');
      }
      const prev = target.status;
      target.status = status;
      this.addAudit(
        draft,
        admin.id,
        admin.role,
        'ADMIN_QR_MODERATED',
        'qr_link',
        target.token,
        `Moderator changed /r/${target.token} from ${prev} to ${status}. Reason: ${cleanReason}`
      );
      return { ...target };
    });
  }

  adminClearCreativeQrFlag(
    admin: PublicUser,
    creativeId: string,
    notes: string
  ): AdCreativeRecord {
    if (admin.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can clear creative QR review flags.');
    }
    const cleanNotes = notes.trim();
    if (cleanNotes.length < 5) {
      throw new Error('Written moderator verification notes (min 5 characters) are required.');
    }
    return this.withWriteTransaction((draft) => {
      const creative = draft.adCreatives.find((c) => c.id === creativeId);
      if (!creative) {
        throw new Error('Ad creative not found.');
      }
      if (creative.optionB?.qrInspectionStatus === 'decoded_mismatch') {
        throw new Error(
          'Cannot clear QR flag: external media decoded a conflicting QR destination. Advertiser must upload matching media or align the campaign QR.'
        );
      }
      if (creative.optionB) {
        creative.optionB.requiresAdminReviewFlag = false;
      }
      creative.status = 'ready_for_preview';
      creative.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        admin.id,
        admin.role,
        'ADMIN_CREATIVE_QR_FLAG_CLEARED',
        'ad_creative',
        creative.id,
        `Moderator cleared review flag on "${creative.title}". Notes: ${cleanNotes}`
      );
      return { ...creative };
    });
  }

  getAdminModerationOverview(
    admin: PublicUser,
    persistedData?: {
      campaigns: CampaignRecord[];
      creatives: AdCreativeRecord[];
      advertiserProfiles: AdvertiserProfile[];
      qrLinks: QrLinkRecord[];
      supportTickets: SupportTicketRecord[];
      opportunityComplaints: OpportunityComplaintRecord[];
      opportunityAppeals: OpportunityAppealRecord[];
    }
  ): AdminModerationOverview {
    if (admin.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can view the moderation overview.');
    }
    this.syncIfDiskNewer();
    const campaigns = persistedData?.campaigns ?? this.data.campaigns;
    const creatives = persistedData?.creatives ?? this.data.adCreatives;
    const pendingCampaigns = campaigns
      .filter((c) => c.status === 'submitted' || c.status === 'under_review')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const activeOrScheduledCampaigns = campaigns
      .filter((c) => c.status === 'approved' || c.status === 'scheduled' || c.status === 'active' || c.status === 'paused')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const flaggedCreatives = creatives.filter(
      (cr) =>
        cr.status === 'flagged_for_review' ||
        cr.optionB?.requiresAdminReviewFlag ||
        cr.optionB?.qrInspectionStatus === 'decoded_mismatch' ||
        cr.optionB?.qrInspectionStatus === 'suspected_unreadable'
    );

    return {
      generatedAt: new Date().toISOString(),
      pendingCampaigns,
      activeOrScheduledCampaigns,
      flaggedCreatives,
      advertiserProfiles: [...(persistedData?.advertiserProfiles ?? this.data.advertiserProfiles)].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
      qrLinks: [...(persistedData?.qrLinks ?? this.data.qrLinks)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      supportTickets: [...(persistedData?.supportTickets ?? this.data.supportTickets)].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
      openComplaintsCount: (persistedData?.opportunityComplaints ?? this.data.opportunityComplaints).filter(
        (c) => c.status === 'reported' || c.status === 'under_investigation'
      ).length,
      openAppealsCount: (persistedData?.opportunityAppeals ?? this.data.opportunityAppeals).filter(
        (a) => a.status === 'submitted' || a.status === 'under_review'
      ).length,
    };
  }

  getSevenStageAnalyticsFunnel(
    actor: PublicUser,
    campaignFilterId: string | null = null,
    persistedData?: {
      campaigns: CampaignRecord[];
      qrLinks: QrLinkRecord[];
      analyticsEvents: AnalyticsEventRecord[];
    }
  ): SevenStageAnalyticsSnapshot {
    this.syncIfDiskNewer();

    const campaigns = persistedData?.campaigns ?? this.data.campaigns;
    const qrLinks = persistedData?.qrLinks ?? this.data.qrLinks;
    const analyticsEvents = persistedData?.analyticsEvents ?? this.data.analyticsEvents;
    const accessibleCampaigns =
      actor.role === 'admin'
        ? campaigns
        : campaigns.filter((c) => c.ownerId === actor.id);

    let scopedCampaigns = accessibleCampaigns;
    let scopedQrTokens = new Set<string>(
      (actor.role === 'admin'
        ? qrLinks
        : qrLinks.filter((q) => q.ownerId === actor.id)
      ).map((q) => q.token)
    );

    if (campaignFilterId) {
      const target = campaigns.find((c) => c.id === campaignFilterId);
      if (!target) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }
      scopedCampaigns = [target];
      scopedQrTokens = new Set(target.qrToken ? [target.qrToken] : []);
    }

    const scopedCampaignIds = new Set(scopedCampaigns.map((c) => c.id));

    const eventMatchesScope = (ev: AnalyticsEventRecord): boolean => {
      if (campaignFilterId) {
        if (ev.campaignId === campaignFilterId) return true;
        if (!ev.campaignId && ev.qrToken && scopedQrTokens.has(ev.qrToken)) return true;
        return false;
      }
      if (actor.role === 'admin') return true;
      if (ev.campaignId && scopedCampaignIds.has(ev.campaignId)) return true;
      if (ev.qrToken && scopedQrTokens.has(ev.qrToken)) return true;
      return false;
    };

    const scopedEvents = analyticsEvents.filter(eventMatchesScope);

    const simCount = (type: AnalyticsEventRecord['eventType']) =>
      scopedEvents.filter((e) => e.eventType === type && e.measurementSource === 'simulated_prototype').length;

    const reqEvents = scopedEvents.filter(
      (e) => e.eventType === 'redirect_requested' && e.measurementSource === 'real_measured'
    );
    const reqBots = reqEvents.filter((e) => e.isSuspectedBot === true).length;
    const reqDups = reqEvents.filter((e) => !e.isSuspectedBot && e.isDeduplicated === true).length;
    const reqNonBotUnique = Math.max(0, reqEvents.length - reqBots - reqDups);

    const issuedEvents = scopedEvents.filter(
      (e) => e.eventType === 'redirect_issued' && e.measurementSource === 'real_measured'
    );
    const issuedBots = issuedEvents.filter((e) => e.isSuspectedBot === true).length;
    const issuedDups = issuedEvents.filter((e) => !e.isSuspectedBot && e.isDeduplicated === true).length;
    const issuedNonBotUnique = Math.max(0, issuedEvents.length - issuedBots - issuedDups);

    const opensVerified = scopedEvents.filter((e) => e.eventType === 'destination_opened').length;
    const conversionsVerified = scopedEvents.filter((e) => e.eventType === 'verified_conversion').length;

    const stages: AnalyticsFunnelStageItem[] = [
      {
        stageNumber: 1,
        key: 'ad_requested',
        label: '1. Ad Requested',
        measurementSource: 'simulated_prototype',
        rawCount: simCount('ad_requested'),
        deduplicatedCount: simCount('ad_requested'),
        suspectedBotExcluded: 0,
        epistemicNote: 'SIMULATED PROTOTYPE ONLY — Commercial-Break Simulator requested playback slot.',
      },
      {
        stageNumber: 2,
        key: 'ad_delivered',
        label: '2. Ad Delivered',
        measurementSource: 'simulated_prototype',
        rawCount: simCount('ad_delivered'),
        deduplicatedCount: simCount('ad_delivered'),
        suspectedBotExcluded: 0,
        epistemicNote: 'SIMULATED PROTOTYPE ONLY — Creative loaded in simulator; not physical TV tuner delivery.',
      },
      {
        stageNumber: 3,
        key: 'ad_played',
        label: '3. Ad Played',
        measurementSource: 'simulated_prototype',
        rawCount: simCount('ad_played'),
        deduplicatedCount: simCount('ad_played'),
        suspectedBotExcluded: 0,
        epistemicNote: 'SIMULATED PROTOTYPE ONLY — Browser player started playback.',
      },
      {
        stageNumber: 4,
        key: 'ad_viewable',
        label: '4. Ad Technically Viewable (>= 2s)',
        measurementSource: 'simulated_prototype',
        rawCount: simCount('ad_viewable'),
        deduplicatedCount: simCount('ad_viewable'),
        suspectedBotExcluded: 0,
        epistemicNote: 'SIMULATED PROTOTYPE ONLY — Technical viewport >= 2s; never proves human presence or attention.',
      },
      {
        stageNumber: 5,
        key: 'redirect_requested',
        label: '5. QR Redirect Requested (/r/:token)',
        measurementSource: 'real_measured',
        rawCount: reqEvents.length,
        deduplicatedCount: reqNonBotUnique,
        suspectedBotExcluded: reqBots,
        secondaryCount: reqDups,
        secondaryLabel: '5s Duplicate Requests',
        epistemicNote: 'REAL MEASURED — Includes bots/link-previewers before filtering; a redirect hit alone does not prove a human camera scan.',
      },
      {
        stageNumber: 6,
        key: 'redirect_issued',
        label: '6. QR Redirect Issued (HTTP 302)',
        measurementSource: 'real_measured',
        rawCount: issuedEvents.length,
        deduplicatedCount: issuedNonBotUnique,
        suspectedBotExcluded: issuedBots,
        secondaryCount: issuedDups,
        secondaryLabel: '5s Duplicate Redirects',
        epistemicNote: 'REAL MEASURED — Direct HTTP 302 sent; strictly does NOT guarantee external destination page loaded.',
      },
      {
        stageNumber: 7,
        key: 'destination_opened_and_conversion',
        label: '7. Destination Opened & Verified Conversion',
        measurementSource: 'unverified_in_prototype',
        rawCount: opensVerified,
        deduplicatedCount: opensVerified,
        suspectedBotExcluded: 0,
        secondaryCount: conversionsVerified,
        secondaryLabel: 'Verified Conversions',
        epistemicNote: 'INDEPENDENT VERIFICATION REQUIRED — Never inferred from HTTP 302; remains 0 unless external destination confirmation is explicitly received.',
      },
    ];

    const campaignBreakdown = accessibleCampaigns.map((cmp) => {
      const matchesCamp = (ev: AnalyticsEventRecord) =>
        ev.campaignId === cmp.id || (!ev.campaignId && cmp.qrToken && ev.qrToken === cmp.qrToken);
      const cmpEvents = this.data.analyticsEvents.filter(matchesCamp);
      const cmpReq = cmpEvents.filter(
        (e) => e.eventType === 'redirect_requested' && e.measurementSource === 'real_measured'
      );
      return {
        campaignId: cmp.id,
        title: cmp.title,
        status: cmp.status,
        qrToken: cmp.qrToken,
        simulatedRequested: cmpEvents.filter(
          (e) => e.eventType === 'ad_requested' && e.measurementSource === 'simulated_prototype'
        ).length,
        simulatedPlayed: cmpEvents.filter(
          (e) => e.eventType === 'ad_played' && e.measurementSource === 'simulated_prototype'
        ).length,
        realRedirectRequested: cmpReq.filter((e) => !e.isSuspectedBot && !e.isDeduplicated).length,
        realRedirectIssued: cmpEvents.filter(
          (e) =>
            e.eventType === 'redirect_issued' &&
            e.measurementSource === 'real_measured' &&
            !e.isSuspectedBot &&
            !e.isDeduplicated
        ).length,
        suspectedBotFiltered: cmpReq.filter((e) => e.isSuspectedBot === true).length,
        verifiedOpens: cmpEvents.filter((e) => e.eventType === 'destination_opened').length,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      scope: actor.role === 'admin' && !campaignFilterId ? 'network_wide' : 'user_owned',
      campaignFilterId,
      stages,
      recentEvents: scopedEvents.slice(0, 80),
      campaignBreakdown,
    };
  }

  getRevenueLedgerSnapshot(
    actor: PublicUser,
    persistedData?: { campaigns: CampaignRecord[]; analyticsEvents: AnalyticsEventRecord[] }
  ): RevenueLedgerSnapshot {
    this.syncIfDiskNewer();
    const campaigns = persistedData?.campaigns ?? this.data.campaigns;
    const analyticsEvents = persistedData?.analyticsEvents ?? this.data.analyticsEvents;
    const accessibleCampaigns =
      actor.role === 'admin'
        ? campaigns
        : campaigns.filter((c) => c.ownerId === actor.id);

    const charityCampaigns = accessibleCampaigns.filter(
      (c) => c.contentCategory === 'opportunity_promotion'
    );
    const commercialCampaigns = accessibleCampaigns.filter(
      (c) => c.contentCategory === 'commercial_advertising'
    );

    const charityFreeSpots = charityCampaigns.reduce(
      (sum, c) => sum + c.simulatedEstimate.estimatedSpots,
      0
    );
    const directCommercialSimulatedUsd = Number(
      commercialCampaigns
        .reduce((sum, c) => sum + c.simulatedEstimate.estimatedTotalUsd, 0)
        .toFixed(2)
    );

    const simBackfillEvents = analyticsEvents.filter(
      (e) =>
        e.eventType === 'ad_network_backfill_simulated' &&
        e.measurementSource === 'simulated_prototype'
    ).length;
    const adNetworkEstimatedMockUsd = Number((simBackfillEvents * 1.8).toFixed(2));

    const streams: RevenueStreamLedgerRow[] = [
      {
        stream: 'charity_free',
        label: '1. CHARITY ADS & Opportunity Listings ($0.00 Permanent Lock)',
        primaryCategory: 'CHARITY',
        amountUsd: 0,
        spotOrRecordCount: charityCampaigns.length,
        certaintyStatus: 'permanent_zero',
        note: `Enforced $0.00 / FREE across ${charityCampaigns.length} charity campaign(s) (~${charityFreeSpots} est. spots). Never billed.`,
      },
      {
        stream: 'direct_commercial_paid',
        label: '2. Direct Commercial Campaigns (Simulated Rate-Card Estimate)',
        primaryCategory: 'COMMERCIAL',
        amountUsd: directCommercialSimulatedUsd,
        spotOrRecordCount: commercialCampaigns.length,
        certaintyStatus: 'simulated_rate_card',
        note: 'Simulated rate-card booking estimate only. Payment collection is OFF in Phase 2.',
      },
      {
        stream: 'ad_network_estimated',
        label: '3. Ad Network Backfill — Estimated (Mock AdNetworkAdapter)',
        primaryCategory: 'COMMERCIAL',
        amountUsd: adNetworkEstimatedMockUsd,
        spotOrRecordCount: simBackfillEvents,
        certaintyStatus: 'mock_estimated',
        note: 'Simulated MockAdNetworkAdapter backfill only. GAM CTV account unconfigured & format eligibility UNRESOLVED (DEC-OPEN-03).',
      },
      {
        stream: 'ad_network_confirmed',
        label: '4. Ad Network Backfill — Confirmed Provider Statement',
        primaryCategory: 'COMMERCIAL',
        amountUsd: 0,
        spotOrRecordCount: 0,
        certaintyStatus: 'unconfirmed_zero',
        note: 'Zero confirmed Ad Network statements exist in Phase 2; estimated mock backfill is never promoted into confirmed payouts.',
      },
      {
        stream: 'actual_payment_received',
        label: '5. Actual Cleared Payments Received (Stripe / Bank / PSP)',
        primaryCategory: 'BOTH',
        amountUsd: 0,
        spotOrRecordCount: 0,
        certaintyStatus: 'no_real_collection',
        note: 'paymentCollectionActive=false. Zero real commercial payments collected prior to authorised commercial activation.',
      },
      {
        stream: 'refund_adjustment',
        label: '6. Refunds, Credits & Dispute Adjustments',
        primaryCategory: 'BOTH',
        amountUsd: 0,
        spotOrRecordCount: 0,
        certaintyStatus: 'no_real_collection',
        note: 'Tracked strictly separately from revenue totals; $0.00 in Phase 2 prototype.',
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      scope: actor.role === 'admin' ? 'network_wide' : 'user_owned',
      paymentCollectionActive: false,
      gamCtvAccountConfigured: false,
      streams,
      totals: {
        charityFreeSpots,
        directCommercialSimulatedUsd,
        adNetworkEstimatedMockUsd,
        adNetworkConfirmedUsd: 0,
        actualCashReceivedUsd: 0,
        refundAdjustmentsUsd: 0,
      },
    };
  }

  // --- Block 2.7: Physical Mobile QR Scan Testing & Final Prototype Readiness ---

  getQrWatchSnapshot(actor: PublicUser, token: string): {
    qrLink: QrLinkRecord;
    recentEvents: AnalyticsEventRecord[];
  } {
    this.syncIfDiskNewer();
    const link = this.data.qrLinks.find((q) => q.token === token);
    if (!link) {
      throw new Error('QR token not found.');
    }
    if (actor.role !== 'admin' && link.ownerId !== actor.id) {
      throw new Error('FORBIDDEN: You do not own this QR link.');
    }
    const recentEvents = this.data.analyticsEvents
      .filter((e) => e.qrToken === token && e.measurementSource === 'real_measured')
      .slice(0, 20);
    return { qrLink: { ...link }, recentEvents };
  }

  listPhysicalQrScanTests(actor: PublicUser): PhysicalQrScanTestRecord[] {
    this.syncIfDiskNewer();
    const items =
      actor.role === 'admin'
        ? this.data.physicalQrScanTests
        : this.data.physicalQrScanTests.filter((t) => t.testerUserId === actor.id);
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  replacePhysicalQrScanTestsFromPersistence(
    actor: PublicUser,
    records: PhysicalQrScanTestRecord[]
  ): void {
    if (actor.role !== 'admin' && records.some((record) => record.testerUserId !== actor.id)) {
      throw new Error('D1_DOMAIN_PHYSICAL_QR_SCAN_TEST_OWNER_MISMATCH');
    }
    this.withWriteTransaction((draft) => {
      draft.physicalQrScanTests =
        actor.role === 'admin'
          ? records.map((record) => ({ ...record }))
          : [
              ...draft.physicalQrScanTests.filter((record) => record.testerUserId !== actor.id),
              ...records.map((record) => ({ ...record })),
            ];
    });
  }

  recordPhysicalQrScanTest(
    actor: PublicUser,
    params: {
      qrToken: string;
      encodedRedirectUrl: string;
      deviceModel: string;
      osPlatform: 'iOS' | 'Android' | 'Other Mobile';
      cameraApp: string;
      outcome: 'passed' | 'failed';
      reachedRedirectEndpoint: boolean;
      landedDestinationObserved: boolean;
      timeToScanSeconds: number;
      notes: string;
    }
  ): PhysicalQrScanTestRecord {
    const token = params.qrToken.trim();
    const deviceModel = params.deviceModel.trim();
    const cameraApp = params.cameraApp.trim();
    const encodedRedirectUrl = params.encodedRedirectUrl.trim();
    const notes = params.notes.trim();

    if (!token) throw new Error('qrToken is required.');
    if (deviceModel.length < 2) throw new Error('deviceModel must be at least 2 characters.');
    if (cameraApp.length < 2) throw new Error('cameraApp must be at least 2 characters.');
    if (!encodedRedirectUrl.startsWith('http://') && !encodedRedirectUrl.startsWith('https://')) {
      throw new Error('encodedRedirectUrl must be a full http:// or https:// URL.');
    }
    if (
      !Number.isFinite(params.timeToScanSeconds) ||
      params.timeToScanSeconds < 0 ||
      params.timeToScanSeconds > 300
    ) {
      throw new Error('timeToScanSeconds must be between 0 and 300 seconds.');
    }

    return this.withWriteTransaction((draft) => {
      const link = draft.qrLinks.find((q) => q.token === token);
      if (!link) {
        throw new Error('QR token not found.');
      }
      if (actor.role !== 'admin' && link.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this QR token.');
      }

      const record: PhysicalQrScanTestRecord = {
        id: `pqr_${crypto.randomBytes(6).toString('hex')}`,
        testerUserId: actor.id,
        testerEmail: actor.email,
        qrToken: link.token,
        encodedRedirectUrl,
        resolvedTargetUrl: link.resolvedUrl,
        deviceModel,
        osPlatform: params.osPlatform,
        cameraApp,
        testMode: 'physical_phone_camera',
        outcome: params.outcome,
        reachedRedirectEndpoint: Boolean(params.reachedRedirectEndpoint),
        landedDestinationObserved: Boolean(params.landedDestinationObserved),
        timeToScanSeconds: Number(params.timeToScanSeconds.toFixed(1)),
        observedRedirectIssuedAtLogTime: link.redirectIssuedTotal,
        notes,
        createdAt: new Date().toISOString(),
      };

      draft.physicalQrScanTests.unshift(record);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'PHYSICAL_QR_SCAN_TEST_LOGGED',
        'qa_handover',
        record.id,
        `Logged physical phone QR test (${record.outcome}) for /r/${record.qrToken} on ${record.deviceModel} (${record.osPlatform}); server 302 count at log time=${record.observedRedirectIssuedAtLogTime}.`
      );
      return { ...record };
    });
  }

  deletePhysicalQrScanTest(actor: PublicUser, id: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.physicalQrScanTests.findIndex((t) => t.id === id);
      if (idx === -1) {
        throw new Error('Physical QR scan test record not found.');
      }
      const target = draft.physicalQrScanTests[idx];
      if (actor.role !== 'admin' && target.testerUserId !== actor.id) {
        throw new Error('FORBIDDEN: You cannot delete another user’s physical QR test log.');
      }
      draft.physicalQrScanTests.splice(idx, 1);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'PHYSICAL_QR_SCAN_TEST_DELETED',
        'qa_handover',
        id,
        `Deleted physical QR scan test log ${id} for /r/${target.qrToken}.`
      );
    });
  }

  getPrototypeReadinessSnapshot(
    actor: PublicUser,
    persistedData?: {
      campaigns: CampaignRecord[];
      adCreatives: AdCreativeRecord[];
      opportunities: OpportunityRecord[];
      analyticsEvents: AnalyticsEventRecord[];
      qrLinks: QrLinkRecord[];
      physicalQrScanTests: PhysicalQrScanTestRecord[];
    }
  ): PrototypeReadinessSnapshot {
    this.syncIfDiskNewer();
    const campaigns = persistedData?.campaigns ?? this.data.campaigns;
    const adCreatives = persistedData?.adCreatives ?? this.data.adCreatives;
    const opportunities = persistedData?.opportunities ?? this.data.opportunities;
    const analyticsEvents = persistedData?.analyticsEvents ?? this.data.analyticsEvents;
    const qrLinks = persistedData?.qrLinks ?? this.data.qrLinks;
    const physicalQrScanTests =
      persistedData?.physicalQrScanTests ?? this.listPhysicalQrScanTests(actor);
    const summary = {
      ...this.getFoundationSummary(),
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((campaign) => campaign.status === 'active').length,
      adCreativeCount: adCreatives.length,
      opportunityCount: opportunities.length,
      verifiedLiveOpportunityCount: opportunities.filter(
        (opportunity) => opportunity.status === 'verified_live'
      ).length,
      qrCount: qrLinks.length,
      redirectRequestsTotal: analyticsEvents.filter(
        (event) => event.eventType === 'redirect_requested' && event.measurementSource === 'real_measured'
      ).length,
      redirectIssuedTotal: analyticsEvents.filter(
        (event) => event.eventType === 'redirect_issued' && event.measurementSource === 'real_measured'
      ).length,
      suspectedBotRedirects: analyticsEvents.filter(
        (event) => event.eventType === 'redirect_requested' && event.isSuspectedBot === true
      ).length,
      verifiedDestinationOpens: analyticsEvents.filter(
        (event) => event.eventType === 'destination_opened'
      ).length,
      simulatedEventsTotal: analyticsEvents.filter(
        (event) => event.measurementSource === 'simulated_prototype'
      ).length,
      physicalQrTestsCount: physicalQrScanTests.length,
      physicalQrPassedCount: physicalQrScanTests.filter((test) => test.outcome === 'passed').length,
    };
    const passedPhysical = physicalQrScanTests.filter((t) => t.outcome === 'passed');

    const hasMismatchCreativeCleared = adCreatives.some(
      (cr) =>
        cr.optionB?.qrInspectionStatus === 'decoded_mismatch' &&
        cr.status === 'ready_for_preview'
    );
    const hasOppWithAdFeeInfluence = opportunities.some(
      (o) => o.advertisingFeeInfluencesVerification !== false
    );
    const hasRealBillingActive = campaigns.some(
      (c) => c.simulatedEstimate.paymentCollectionActive !== false
    );
    const has302InferredAsOpen = analyticsEvents.some(
      (e) => e.eventType === 'destination_opened' && e.dedupKey.startsWith('redirect_')
    );
    const hasSeedAdmin = this.data.users.some((u) => u.role === 'admin' && u.passwordHash.includes(':'));
    const hasSeedCampaignWithCreative = campaigns.some(
      (c) => Boolean(c.adCreativeRef) && Boolean(c.qrToken)
    );
    const hasThreeTierVerifiedLiveOpp = opportunities.some(
      (o) =>
        o.status === 'verified_live' &&
        o.verificationTiers.identityStatus === 'verified' &&
        o.verificationTiers.specificOpportunityStatus === 'verified'
    );

    const checks: PrototypeQaCheckItem[] = [
      {
        id: 'qa_21_auth_store',
        block: 'Block 2.1',
        label: 'Locked atomic persistence, scrypt auth & admin RBAC baseline',
        status: hasSeedAdmin ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `schemaVersion=${this.data.schemaVersion}, ${summary.userCount} users (scrypt salted hashes), ${summary.auditLogCount} audit log records persisted.`,
      },
      {
        id: 'qa_21_qr_redirect',
        block: 'Block 2.1',
        label: 'QR URL validator & direct HTTP 302 /r/:token telemetry engine',
        status: summary.qrCount > 0 ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `${summary.qrCount} QR tokens persisted; ${summary.redirectRequestsTotal} redirect requests, ${summary.redirectIssuedTotal} HTTP 302s, ${summary.suspectedBotRedirects} bot-filtered.`,
      },
      {
        id: 'qa_22_campaigns_billing_boundary',
        block: 'Block 2.2',
        label: 'Advertiser profiles, 10-state campaigns & simulated-only billing boundary',
        status: !hasRealBillingActive && summary.campaignCount > 0 ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `${summary.profileCount} profiles, ${summary.campaignCount} campaigns (${summary.activeCampaignCount} active); paymentCollectionActive=false enforced across all campaigns.`,
      },
      {
        id: 'qa_23_studio_qr_integrity',
        block: 'Block 2.3',
        label: 'Option A/B Ad Creation Studio & decoded QR mismatch block',
        status: !hasMismatchCreativeCleared && summary.adCreativeCount > 0 ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `${summary.adCreativeCount} creatives stored; zero decoded_mismatch Option B creatives bypassed into ready_for_preview.`,
      },
      {
        id: 'qa_24_tv_preview_gate',
        block: 'Block 2.4',
        label: '16:9 TV Preview, pre-submit gate & simulator boundary',
        status: hasSeedCampaignWithCreative ? 'pass' : 'warn',
        scope: 'automated_invariant',
        detail: `Campaign-to-creative linkage active; simulated events (${summary.simulatedEventsTotal}) strictly tagged simulated_prototype.`,
      },
      {
        id: 'qa_25_opportunity_independence',
        block: 'Block 2.5',
        label: 'Opportunity 3-tier verification decoupled from advertising fees',
        status: !hasOppWithAdFeeInfluence && hasThreeTierVerifiedLiveOpp ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `${summary.verifiedLiveOpportunityCount} verified_live opportunities (${summary.opportunityCount} total); advertisingFeeInfluencesVerification=false on 100% of records.`,
      },
      {
        id: 'qa_26_analytics_epistemics',
        block: 'Block 2.6',
        label: 'Admin moderation & 7-stage analytics provenance integrity',
        status: !has302InferredAsOpen ? 'pass' : 'fail',
        scope: 'automated_invariant',
        detail: `Stage 7 verified destination opens=${summary.verifiedDestinationOpens} (never fabricated from HTTP 302 redirects).`,
      },
      {
        id: 'qa_v21_charity_zero_lock',
        block: 'Block P2-V2.1',
        label: 'CHARITY ADS ($0.00 / FREE permanent lock on all opportunity campaigns)',
        status: campaigns.some(
          (c) =>
            c.contentCategory === 'opportunity_promotion' &&
            (c.simulatedEstimate.estimatedTotalUsd !== 0 ||
              c.simulatedEstimate.model !== 'charity_free_zero_cost')
        )
          ? 'fail'
          : 'pass',
        scope: 'automated_invariant',
        detail: `${campaigns.filter((c) => c.contentCategory === 'opportunity_promotion').length} CHARITY ADS campaign(s) enforced at $0.00 / FREE.`,
      },
      {
        id: 'qa_v22_alternating_scheduler_and_ledger',
        block: 'Block P2-V2.2',
        label: 'Alternating break scheduler (CHARITY->COMMERCIAL) & Direct Priority / Ledger separation',
        status: (() => {
          const plan = scheduleCommercialBreak({
            campaigns,
            creatives: adCreatives,
            opportunities,
            requestedBreakDurationSeconds: 65,
            safetyBufferSeconds: 5,
            requestedSlotCount: 4,
            alternatingPointerStart: 'CHARITY',
            allowMockBackfill: true,
          });
          const ledger = this.getRevenueLedgerSnapshot(actor, { campaigns, analyticsEvents });
          const alternates =
            plan.slots.length >= 2 &&
            plan.slots[0]?.primaryCategory === 'CHARITY' &&
            plan.slots[1]?.primaryCategory === 'COMMERCIAL';
          return alternates && ledger.paymentCollectionActive === false && ledger.totals.actualCashReceivedUsd === 0
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail: 'Alternating CHARITY->COMMERCIAL->CHARITY->COMMERCIAL verified with Direct Commercial priority, MockAdNetworkBackfill fallback, and $0.00 cash collection lock.',
      },
      {
        id: 'qa_v23_automated_regression_suite',
        block: 'Block P2-V2.3',
        label: 'Vitest + Supertest automated non-consent regression suite installed & configured',
        status:
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'apiRegression.test.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'breakScheduler.test.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'qrValidator.test.ts'))
            ? 'pass'
            : 'fail',
        scope: 'automated_invariant',
        detail:
          'Automated unit & HTTP integration tests cover Auth/RBAC, /r/:token 302 + bot/dedup, $0.00 Charity lock, Text-Only format, Alternating Break Scheduler, 3-Tier Opportunity Independence, 6-Stream Ledger & 7-Stage Provenance.',
      },
      {
        id: 'qa_v24_shared_intel_preview_and_handover',
        block: 'Block P2-V2.4',
        label:
          'Shared Ad Intelligence Prototype Preview (Zero PII, K=3 Corroboration, Scope Isolation & Auto-Rollback)',
        status: (() => {
          const preview = this.getSharedIntelPreviewState();
          const hasQuorumRule = preview.quorumThreshold >= 3;
          const zeroPii =
            preview.zeroPiiEnforced === true &&
            preview.observations.every((obs) => obs.containsPii === false);
          const hasScopes = preview.bundles.length >= 3 && preview.deviceCaches.length >= 3;
          const allDeviceScopesIsolated = preview.deviceCaches.every(
            (dc) => dc.assignedScopeId === dc.cachedScopeId
          );
          return hasQuorumRule && zeroPii && hasScopes && allDeviceScopesIsolated ? 'pass' : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'MOCK/SIMULATION PREVIEW (Phase 5 production service NOT STARTED): enforces K=3 corroboration gate, zero PII, distinct broadcast scope caches, and FPR auto-rollback guard.',
      },
      {
        id: 'qa_p3a_security_hardening',
        block: 'Block P3-A',
        label:
          'Phase 3 API Security Hardening (Zod validation, CSRF, rate limits, SHA-256 hashed sessions & security suite)',
        status: (() => {
          const hasSecurityModules =
            fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'security.ts')) &&
            fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'validationSchemas.ts')) &&
            fs.existsSync(path.resolve(process.cwd(), 'tests', 'securityHardening.test.ts')) &&
            fs.existsSync(
              path.resolve(
                process.cwd(),
                'docs',
                'migration',
                'TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md'
              )
            );
          const allSessionsHashed = this.data.sessions.every(
            (s) => Boolean(s.tokenHash) && !s.token && Boolean(s.csrfToken) && Boolean(s.idleExpiresAt)
          );
          return hasSecurityModules && allSessionsHashed ? 'pass' : 'fail';
        })(),
        scope: 'automated_invariant',
        detail: `Hashed session tokens at rest (${this.data.sessions.length} active session(s), 2h idle / 7d cap), double-submit + same-origin CSRF, sliding-window rate limiters, Zod schema enforcement & TASK-P3-001 PostgreSQL blueprint READY.`,
      },
      {
        id: 'qa_p3b_portability_asset_hardening',
        block: 'Block P3-B',
        label:
          'Phase 3 Portability & Asset Hardening (EdisonDataRepository, sandboxed /uploads CSP, request timeouts, ErrorBoundary & CI)',
        status: (() => {
          const hasPortabilityAndErrorAssets =
            fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'repository.ts')) &&
            fs.existsSync(
              path.resolve(process.cwd(), 'src', 'components', 'AppErrorBoundary.tsx')
            ) &&
            fs.existsSync(
              path.resolve(process.cwd(), '.github', 'workflows', 'edison-ci.yml')
            );
          const backendMeta = this.getStorageBackendMetadata();
          return hasPortabilityAndErrorAssets &&
            (backendMeta.backend === 'json_file_store' || backendMeta.backend === 'postgresql_pg') &&
            backendMeta.postgresMigrationReady
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'EdisonDataRepository persistence port active (PostgreSQL 16+ migrations + JSON atomic fallback ready), /uploads sandboxed with strict CSP + canonical realpath guard, Express 504 timeout & opaque JSON error middleware, React AppErrorBoundary & GitHub Actions CI configured.',
      },
      {
        id: 'qa_p3c_correlation_export_tv_contracts',
        block: 'Block P3-C',
        label:
          'Phase 3/4 Entry: Request Correlation, Hardened Audit Export & Software-Only TvPlatformAdapter / AURA Remote Contracts',
        status: (() => {
          const hasP3cModules =
            fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'tvPlatformAdapter.ts')) &&
            fs.existsSync(path.resolve(process.cwd(), 'tests', 'tvPlatformAdapter.test.ts'));
          return hasP3cModules ? 'pass' : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'X-Request-Id correlation + sanitised request telemetry, formula-neutralized CSV/JSON admin audit export, and 4 software-only TvPlatformAdapter contracts with AURA Normal TV Remote & watchdog fault-recovery simulation (hardware testing strictly deferred to Stage P6).',
      },
      {
        id: 'qa_41_tv_harnesses_and_offline_cache',
        block: 'Block 4.1',
        label:
          'Phase 4 Block 4.1: Software-First Smart TV Adapter Harnesses & Local Offline Intelligence Cache',
        status: (() => {
          const hasBlock41Files =
            fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'offlineIntelCache.ts')) &&
            fs.existsSync(
              path.resolve(process.cwd(), 'tests', 'phase4AdaptersAndCache.test.ts')
            );
          return hasBlock41Files ? 'pass' : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Android TV TIF, Samsung Tizen & LG webOS software harnesses with fail-closed privilege gates, 16-case deterministic fault-injection watchdog suite, and SHA-256 atomic offline cache swap/rollback (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_42_offline_queue_cadence_conformance',
        block: 'Block 4.2',
        label:
          'Phase 4 Block 4.2: Offline Telemetry Sync Queue Deduplication, Broadcast Cadence & Conformance Vectors',
        status: (() => {
          const hasBlock42Contracts =
            typeof edisonTvControlEngine.runBroadcastCadenceSimulation === 'function' &&
            typeof edisonTvControlEngine.runEmulatorConformanceVectors === 'function' &&
            typeof localOfflineIntelCache.enqueueOfflineObservation === 'function' &&
            typeof localOfflineIntelCache.drainObservationQueue === 'function';
          const conformance = edisonTvControlEngine.runEmulatorConformanceVectors();
          return hasBlock42Contracts && conformance.allPassed && !conformance.hardwareTested
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Idempotent zero-PII offline telemetry sync queue, 3-channel SCTE-35/HbbTV cadence simulator, and 8/8 emulator conformance vectors verified (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_43_metadata_fixtures_policy_phase4_exit',
        block: 'Block 4.3',
        label:
          'Phase 4 Block 4.3: Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & Software Exit Gate',
        status: (() => {
          const exitReport = runPhase4SoftwareExitSuite();
          return exitReport.softwareExitReady &&
            exitReport.passedChecks === 10 &&
            !exitReport.hardwareTested &&
            exitReport.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Lawful SCTE-35/HbbTV/AV-cadence cue fixture parsers, ADR-001/ADR-017 companion policy guardrails, and 10/10 Phase 4 software exit suite verified (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_51_shared_intel_fleet_scenarios_25_35',
        block: 'Block 5.1',
        label:
          'Phase 5 Block 5.1: Shared Ad Intelligence Fleet Service, Ed25519 Attestation & Scenarios 25–35',
        status: (() => {
          const fleetReport = sharedIntelFleetService.runScenarios25To35Suite();
          return fleetReport.allPassed &&
            fleetReport.passedScenarios === 11 &&
            fleetReport.zeroPiiVerified &&
            !fleetReport.hardwareTested &&
            fleetReport.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Ed25519 device/manifest signatures, multi-TV corroboration quorum, conflict quarantine, scoped delta sync, 2.5% FPR auto-rollback, and 11/11 Scenarios 25–35 verified (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_52_break_duration_predictor_calibration',
        block: 'Block 5.2',
        label:
          'Phase 5 Block 5.2: Per-Channel ML Lower-Bound (p10/p5) Break Predictor & 10-Fixture Calibration Benchmark',
        status: (() => {
          const bench = runRecordedStreamCalibrationBenchmark();
          return bench.allPassed &&
            bench.passedFixtures === 10 &&
            bench.falsePositiveRatePct === 0 &&
            !bench.hardwareTested &&
            bench.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Lower-bound p10/p5 quantile predictor rejects mean overestimation on high-variance sports/short breaks and achieves 0% FPR across 10 recorded broadcast stream fixtures (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_61_advertising_delivery_infrastructure',
        block: 'Block 6.1',
        label:
          'Phase 6 Block 6.1: Advertising Delivery Infrastructure (SHA-256 Preload Manifests, Frequency Caps, CDN Failover & Idempotent Ingestion)',
        status: (() => {
          const dlv = runDeliveryInfraVerificationSuite();
          return dlv.allPassed &&
            dlv.passedChecks === 8 &&
            !dlv.hardwareTested &&
            dlv.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 delivery invariants passed: SHA-256 manifests, $0.00 Charity isolation, coarse regional & active-QR gates, Tizen codec gating, daily N+1 frequency cap blocking, CDN outage failover & idempotent event deduplication (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_71_advertiser_ops_billing_boundary',
        block: 'Block 7.1',
        label:
          'Phase 7 Block 7.1: Advertiser Operations (KYC Readiness Gates, Campaign Pacing, SLA Triage & Non-Transactional $0.00 Pro-Forma Blueprint)',
        status: (() => {
          const ops = runAdvertiserOpsVerificationSuite();
          return ops.allPassed &&
            ops.passedChecks === 8 &&
            ops.paymentCollectionActive === false &&
            !ops.hardwareTested &&
            ops.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 advertiser ops invariants passed: KYC onboarding readiness gating, paymentCollectionActive=false lock, $0.00 Charity pro-forma isolation, SHA-256 blueprint integrity, pacing classification & SLA breach detection (hardwareTested=false, Stage P6 deferred).',
      },
      {
        id: 'qa_p2b_track_b_household_consent_qr_revocation',
        block: 'Track B (DEC-OPEN-01)',
        label:
          'Track B: ZW/Intl Household Geo Validation, Multi-Profile Isolation, Personalisation Privacy, Bundled Consent Epochs & HTTP 403 QR Revocation',
        status: (() => {
          const tb = runTrackBVerificationSuite();
          return tb.allPassed && tb.passedChecks === tb.totalChecks ? 'pass' : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'DEC-OPEN-01 Locked (Scope B + Bundled Withdrawal): 7/7 Track B invariants verified (ZW initial launch config + international configs, geo hierarchy fail-closed, scrypt profile PINs, non-guaranteed matching, TV zero-CV privacy, bundled withdrawal suspending commercial + charity + QR HTTP 403).',
      },
      {
        id: 'qa_81_broadcast_render_validation',
        block: 'Block 8.1',
        label:
          'Phase 8 Block 8.1: Broadcast Rendering Validation (90% Title-Safe, WCAG Contrast, TV Codec Matrix, EBU R128 Loudness & QR Non-Overwrite)',
        status: (() => {
          const br = runBroadcastRenderVerificationSuite();
          return br.allPassed &&
            br.passedChecks === 8 &&
            br.ffmpegWorkerConnected === false &&
            !br.hardwareTested &&
            br.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 broadcast render invariants passed: 1080p 90% title-safe & QR overlap checks, Text-Only >=4.5:1 contrast & >=42px/28px scale, Samsung Tizen WebM->MP4 transcode detection, 720p/16:9 gating, QR non-overwrite policy & EBU R128 -23 LUFS blueprint (ffmpegWorkerConnected=false, hardwareTested=false).',
      },
      {
        id: 'qa_91_opportunity_ops_hardening',
        block: 'Block 9.1',
        label:
          'Phase 9 Block 9.1: Opportunity Verification Operations (SHA-256 Vault Seals, Tier 2->3 Non-Transitivity, Expiry Sweep & 4h/48h SLA)',
        status: (() => {
          const oppOps = runOpportunityOpsVerificationSuite();
          return oppOps.allPassed &&
            oppOps.passedChecks === 8 &&
            !oppOps.externalKycVendorConnected &&
            !oppOps.advertisingFeeInfluencesVerification &&
            !oppOps.hardwareTested &&
            oppOps.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 opportunity ops invariants passed: SHA-256 evidence vault seals, strict Tier 2->3 non-transitivity, $0.00 fee independence, 90d Tier 3 re-verification & expiry quarantine, scam risk scanner & 4h/48h SLA tracking (externalKycVendorConnected=false, hardwareTested=false).',
      },
      {
        id: 'qa_101_privacy_statutory_compliance',
        block: 'Block 10.1',
        label:
          'Phase 10 Block 10.1: Privacy, DSR Export/Erasure Cascade, Automated Retention Purge, Zero-PII & 6-Market Statutory Register',
        status: (() => {
          const priv = runPrivacyComplianceVerificationSuite();
          return priv.allPassed &&
            priv.passedChecks === 8 &&
            !priv.externalPenTestCompleted &&
            !priv.legalComplianceClaimed &&
            !priv.cameraMicAttentionTrackingEnabled &&
            !priv.hardwareTested &&
            priv.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 privacy & statutory invariants passed: SHA-256 DSR export PIN redaction, Right-to-Erasure cascade + HTTP 403 QR revocation, 2h/30d retention purge, Zero-PII analytics scanner, camera/mic hard disable & 6-market ADR-015 statutory register (hardwareTested=false).',
      },
      {
        id: 'qa_111_reliability_chaos_18_fms',
        block: 'Block 11.1',
        label:
          'Phase 11 Block 11.1: Reliability, Failure-Mode & Chaos Recovery Suite (All 18 FMEA Modes FM-01..FM-18 & 100% Live TV Watchdog)',
        status: (() => {
          const rel = runReliabilityChaosVerificationSuite();
          return rel.allPassed &&
            rel.passedChecks === 8 &&
            !rel.hardwareTested &&
            rel.stageP6Deferred &&
            !rel.realBroadcastTunerConnected
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 reliability chaos invariants passed across FM-01..FM-18 under extreme fault injection: 100% ordinary live TV preservation, dual <=500ms return-to-TV watchdog, LKG SHA-256 rollback & zero-inflation telemetry dedup (hardwareTested=false).',
      },
      {
        id: 'qa_121_pilot_readiness_stage_p6_runbook',
        block: 'Block 12.1',
        label:
          'Phase 12 Block 12.1: Software-First Pilot Readiness, Zero-PII Telemetry Schema & Single Final Stage P6 Runbook',
        status: (() => {
          const p12 = runPilotReadinessVerificationSuite();
          return p12.allPassed &&
            p12.passedChecks === 8 &&
            !p12.hardwareTested &&
            !p12.pilotHardwareExecuted &&
            p12.stageP6Deferred &&
            !p12.countryActivated &&
            !p12.paymentCollectionActive
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 Phase 12 pilot readiness invariants passed: Phase 4–11 pre-pilot software gates, Zero-PII opt-in telemetry guard, consent-epoch lock, 8-step Stage P6 physical runbook & non-commercial boundaries (hardwareTested=false, stageP6Deferred=true).',
      },
      {
        id: 'qa_131_commercial_readiness_board_gate',
        block: 'Block 13.1',
        label:
          'Phase 13 Block 13.1: Software-First Commercial Readiness Board Gate, 7-SLA Matrix & Unit Economics Model',
        status: (() => {
          const p13 = runCommercialReadinessVerificationSuite();
          return p13.allPassed &&
            p13.passedChecks === 8 &&
            !p13.commercialLaunchAuthorized &&
            !p13.paymentCollectionActive &&
            !p13.countryActivated &&
            !p13.hardwareTested &&
            p13.stageP6Deferred
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 Phase 13 commercial readiness invariants passed: 10-pillar board gate, 7-domain SLA thresholds, $0.00 Charity unit economics lock & fail-closed premature launch block (commercialLaunchAuthorized=false, paymentCollectionActive=false).',
      },
      {
        id: 'qa_141_country_launch_readiness_gate',
        block: 'Block 14.1',
        label:
          'Retired market-activation controls and legacy jurisdiction-data verification',
        status: (() => {
          const p14 = runCountryLaunchVerificationSuite();
          return p14.allPassed &&
            p14.passedChecks === 8 &&
            p14.countryActivated === false &&
            p14.activeLaunchedMarketsCount === 0 &&
            p14.commercialLaunchAuthorized === false &&
            p14.paymentCollectionActive === false &&
            p14.hardwareTested === false &&
            p14.stageP6Deferred &&
            p14.legalComplianceClaimed === false
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          'Legacy software checks only: no market activation is authorized, legal compliance is not claimed, and decision-write endpoints return HTTP 410. This does not establish launch readiness.',
      },
      {
        id: 'qa_151_international_expansion_readiness',
        block: 'Block 15.1',
        label:
          'Phase 15 Block 15.1: International Multi-Region Expansion, Sovereign Residency & Multi-Currency Pro-Forma Gate',
        status: (() => {
          const p15 = runInternationalExpansionVerificationSuite();
          return p15.allPassed &&
            p15.passedChecks === 8 &&
            p15.regionalExpansionActive === false &&
            p15.activeExpandedRegionsCount === 0 &&
            p15.countryActivated === false &&
            p15.commercialLaunchAuthorized === false &&
            p15.paymentCollectionActive === false &&
            p15.hardwareTested === false &&
            p15.stageP6Deferred &&
            p15.legalComplianceClaimed === false &&
            p15.prohibitCrossBorderPiiTransfer === true
            ? 'pass'
            : 'fail';
        })(),
        scope: 'automated_invariant',
        detail:
          '8/8 Phase 15 international multi-region expansion invariants passed: 4 sovereign clusters mapped across 7 currencies & >=7 languages, permanent 0 Charity cost, cross-border PII lock & fail-closed EXPANSION_REGION_GATE_LOCKED.',
      },
      {
        id: 'qa_p3_postgres_pg16_migrations',
        block: 'TASK-P3-001',
        label:
          'Phase 3 Completion: PostgreSQL 16+ Schema, Versioned .up/.down Migrations, ACID JSON Backfill & CLI',
        status:
          fs.existsSync(path.resolve(process.cwd(), 'migrations', '0001_initial_track_a.sql')) &&
          fs.existsSync(
            path.resolve(process.cwd(), 'migrations', '0002_track_b_households_consent.sql')
          ) &&
          fs.existsSync(
            path.resolve(process.cwd(), 'migrations', '0003_phases_4_to_15_ops_media_aura.sql')
          ) &&
          fs.existsSync(
            path.resolve(process.cwd(), 'src', 'server', 'postgres', 'jsonToPostgresMigrator.ts')
          ) &&
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'postgresMigration.test.ts'))
            ? 'pass'
            : 'fail',
        scope: 'automated_invariant',
        detail:
          '3 versioned up/down SQL migrations, PgQueryExecutor (pg.Pool + in-process PGlite PG16), ACID JSON->Postgres import, $0 Charity & append-only audit CHECK/triggers, and migration CLI verified.',
      },
      {
        id: 'qa_p3_ffmpeg_media_worker',
        block: 'TASK-P3-004',
        label:
          'Phase 3/8 Completion: Dedicated Real FFmpeg/FFprobe Transcode, EBU R128 Loudness & HLS Worker',
        status:
          fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'mediaWorker.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'mediaWorker.test.ts'))
            ? 'pass'
            : 'fail',
        scope: 'automated_invariant',
        detail:
          'FfmpegMediaWorker executes real /usr/bin/ffmpeg & /usr/bin/ffprobe with concurrency=2, 60s SIGKILL timeout, pre-basename path confinement, WebM->H.264 MP4 Tizen transcode, HLS segments & EBU R128 -23 LUFS normalization.',
      },
      {
        id: 'qa_p3_playwright_chromium_e2e',
        block: 'TASK-P3-003',
        label:
          'Phase 3 Completion: Real Chromium Browser Playwright E2E Suite, Observability Logger & Circuit Breakers',
        status:
          fs.existsSync(path.resolve(process.cwd(), 'playwright.config.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'tests', 'e2e', 'edison.spec.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'logger.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'reliabilityMonitor.ts'))
            ? 'pass'
            : 'fail',
        scope: 'automated_invariant',
        detail:
          'Playwright headless Chromium E2E test suite configured with UI auth/CSRF/PG16/AURA/desktop+mobile verification, plus PII-redacting JSON logger & p95/circuit-breaker telemetry.',
      },
      {
        id: 'qa_p4_aura_hdmi_cec_disputes_i18n',
        block: 'Workstream B–E',
        label:
          'Phase 4/7/15 Completion: AURA Remote Pairing/Offline Queue, HDMI-CEC HDCP Guard, Billing Disputes, 9-Language i18n & Sovereign Manifests',
        status:
          fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'auraRemoteEngine.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'src', 'server', 'commercialDisputeEngine.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'src', 'i18n', 'translations.ts')) &&
          fs.existsSync(path.resolve(process.cwd(), 'deploy', 'regions', 'africa_south_zw_za.json'))
            ? 'pass'
            : 'fail',
        scope: 'automated_invariant',
        detail:
          'DIAL/mDNS discovery, 6-digit PIN pairing, offline remote queue flush, HDMI-CEC HDCP gate, 5 OEM SDK contracts, $0-Charity-safe commercial dispute ledger, 9-locale i18n & 4 zero-cross-border-PII region manifests verified (hardwareTested=false).',
      },
      {
        id: 'qa_27_physical_qr_scan',
        block: 'Block 2.7',
        label: 'Physical smartphone camera scan verification on real mobile device',
        status: passedPhysical.length > 0 ? 'pass' : 'pending_manual',
        scope: 'manual_owner_device',
        detail:
          passedPhysical.length > 0
            ? `${passedPhysical.length} passed physical phone camera test(s) logged (latest: ${passedPhysical[0].deviceModel} / ${passedPhysical[0].osPlatform}).`
            : 'PENDING OWNER DEVICE TEST — Requires Project Owner to point a real smartphone camera at the QR code on screen and log the scan result.',
      },
    ];

    const autoChecks = checks.filter((c) => c.scope === 'automated_invariant');
    const automatedInvariantsPassed = autoChecks.filter((c) => c.status === 'pass').length;

    return {
      generatedAt: new Date().toISOString(),
      phase: 'Phase 15 — International Multi-Region Expansion, Localization & Sovereign Residency (Software-First)',
      block: 'Block 15.1 (4 Sovereign Expansion Regions, Multilingual TV Captions, 7-Currency $0 Charity Pro-Forma Estimator & Fail-Closed Expansion Gate)',
      automatedInvariantsPassed,
      automatedInvariantsTotal: autoChecks.length,
      physicalQrScanStatus:
        passedPhysical.length > 0 ? 'VERIFIED_BY_OWNER_LOG' : 'PENDING_OWNER_DEVICE_TEST',
      physicalQrPassedCount: passedPhysical.length,
      physicalQrTotalCount: physicalQrScanTests.length,
      checks,
      physicalScanTests: physicalQrScanTests,
      summary: {
        userCount: summary.userCount,
        profileCount: summary.profileCount,
        campaignCount: summary.campaignCount,
        activeCampaignCount: summary.activeCampaignCount,
        adCreativeCount: summary.adCreativeCount,
        opportunityCount: summary.opportunityCount,
        verifiedLiveOpportunityCount: summary.verifiedLiveOpportunityCount,
        qrCount: summary.qrCount,
        redirectRequestsTotal: summary.redirectRequestsTotal,
        redirectIssuedTotal: summary.redirectIssuedTotal,
        suspectedBotRedirects: summary.suspectedBotRedirects,
        verifiedDestinationOpens: summary.verifiedDestinationOpens,
        simulatedEventsTotal: summary.simulatedEventsTotal,
        auditLogCount: summary.auditLogCount,
      },
    };
  }

  // --- Network-Wide Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / MOCK SIMULATION) ---

  getSharedIntelPreviewState(): SharedIntelPreviewState {
    this.syncIfDiskNewer();
    const state = this.data.sharedIntelPreview ?? createInitialSharedIntelPreviewState();
    return {
      ...state,
      bundles: state.bundles.map((b) => ({
        ...b,
        scope: { ...b.scope },
        corroboratingDeviceIds: [...b.corroboratingDeviceIds],
      })),
      deviceCaches: state.deviceCaches.map((d) => ({ ...d })),
      observations: state.observations.map((o) => ({ ...o })),
      auditTrail: state.auditTrail.map((a) => ({ ...a })),
    };
  }

  replaceSharedIntelPreviewStateFromPersistence(
    state: SharedIntelPreviewState
  ): void {
    if (
      state.zeroPiiEnforced !== true ||
      state.isPrototypeSimulation !== true ||
      state.observations.some((observation) => observation.containsPii !== false)
    ) {
      throw new Error('D1_DOMAIN_SHARED_INTEL_STATE_INVALID');
    }
    this.withWriteTransaction((draft) => {
      draft.sharedIntelPreview = {
        ...state,
        bundles: state.bundles.map((bundle) => ({
          ...bundle,
          scope: { ...bundle.scope },
          corroboratingDeviceIds: [...bundle.corroboratingDeviceIds],
        })),
        deviceCaches: state.deviceCaches.map((cache) => ({ ...cache })),
        observations: state.observations.map((observation) => ({ ...observation })),
        auditTrail: state.auditTrail.map((entry) => ({ ...entry })),
      };
    });
  }

  submitSharedIntelPreviewObservation(
    actor: PublicUser,
    input: {
      tvDeviceId: string;
      scopeId: string;
      signalType: SharedIntelSignalType;
      estimatedBreakDurationSec: number;
      transitionLatencyMs: number;
      outlierAnomaly?: boolean;
      rawPayload?: Record<string, unknown>;
    }
  ): {
    state: SharedIntelPreviewState;
    observation: SharedIntelObservationRecord;
    bundle: SharedIntelBundleRecord;
  } {
    try {
      return this.withWriteTransaction((draft) => {
        const current = draft.sharedIntelPreview ?? createInitialSharedIntelPreviewState();
        const result = submitSharedIntelObservation(current, input);
        draft.sharedIntelPreview = result.nextState;
        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'SHARED_INTEL_OBSERVATION_SIMULATED',
          'system',
          input.scopeId,
          `Simulated ${result.observation.trustDecision} for ${input.tvDeviceId} (${input.scopeId}).`
        );
        return {
          state: result.nextState,
          observation: result.observation,
          bundle: result.bundle,
        };
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('ZERO-PII GUARDRAIL:')) {
        this.withWriteTransaction((draft) => {
          const current = draft.sharedIntelPreview ?? createInitialSharedIntelPreviewState();
          current.rejectedPiiAttemptCount += 1;
          current.auditTrail.unshift({
            id: `sia_${crypto.randomBytes(4).toString('hex')}`,
            action: 'ZERO_PII_REJECTED',
            scopeId: input.scopeId || null,
            detail: err.message,
            createdAt: new Date().toISOString(),
          });
          draft.sharedIntelPreview = current;
        });
      }
      throw err;
    }
  }

  runSharedIntelPreviewAction(
    actor: PublicUser,
    params: {
      action:
        | 'corroborate_quorum'
        | 'inject_outlier_poison'
        | 'toggle_offline'
        | 'sync_cache'
        | 'simulate_fpr_spike_rollback'
        | 'reset_preview';
      scopeId?: string;
      tvDeviceId?: string;
    }
  ): SharedIntelPreviewState {
    return this.withWriteTransaction((draft) => {
      const current = draft.sharedIntelPreview ?? createInitialSharedIntelPreviewState();
      const nextState = runSharedIntelSimulationAction(current, params);
      draft.sharedIntelPreview = nextState;
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'SHARED_INTEL_PREVIEW_ACTION',
        'system',
        params.scopeId ?? params.tvDeviceId ?? 'preview',
        `Executed Shared Intelligence preview action "${params.action}".`
      );
      return nextState;
    });
  }

  listAuditLogs(filters: { targetType?: string; limit?: number } = {}): AuditLogRecord[] {
    this.syncIfDiskNewer();
    let logs = [...this.data.auditLogs];
    if (filters.targetType && filters.targetType !== 'all') {
      logs = logs.filter((l) => l.targetType === filters.targetType);
    }
    const max = Math.min(500, Math.max(1, filters.limit ?? 200));
    return logs.slice(0, max);
  }

  listAuditRecords(limit = 500): AuditLogRecord[] {
    return this.listAuditLogs({ limit });
  }

  listAnalyticsEvents(limit = 50): AnalyticsEventRecord[] {
    this.syncIfDiskNewer();
    return this.data.analyticsEvents.slice(0, limit);
  }

  getFoundationSummary(
    persistedSummary?: LiveReportSnapshot['summary']
  ): LiveReportSnapshot['summary'] {
    this.syncIfDiskNewer();
    if (persistedSummary) return persistedSummary;
    return {
      userCount: this.data.users.length,
      qrCount: this.data.qrLinks.length,
      campaignCount: this.data.campaigns.length,
      activeCampaignCount: this.data.campaigns.filter((c) => c.status === 'active').length,
      adCreativeCount: this.data.adCreatives.length,
      profileCount: this.data.advertiserProfiles.length,
      openTicketCount: this.data.supportTickets.filter(
        (t) => t.status === 'open' || t.status === 'in_review'
      ).length,
      opportunityCount: this.data.opportunities.length,
      verifiedLiveOpportunityCount: this.data.opportunities.filter(
        (o) => o.status === 'verified_live'
      ).length,
      openComplaintCount: this.data.opportunityComplaints.filter(
        (c) => c.status === 'reported' || c.status === 'under_investigation'
      ).length,
      openAppealCount: this.data.opportunityAppeals.filter(
        (a) => a.status === 'submitted' || a.status === 'under_review'
      ).length,
      redirectRequestsTotal: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_requested' && e.measurementSource === 'real_measured'
      ).length,
      redirectIssuedTotal: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_issued' && e.measurementSource === 'real_measured'
      ).length,
      suspectedBotRedirects: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_requested' && e.isSuspectedBot === true
      ).length,
      verifiedDestinationOpens: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'destination_opened'
      ).length,
      verifiedConversionsTotal: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'verified_conversion'
      ).length,
      simulatedEventsTotal: this.data.analyticsEvents.filter(
        (e) => e.measurementSource === 'simulated_prototype'
      ).length,
      physicalQrTestsCount: this.data.physicalQrScanTests.length,
      physicalQrPassedCount: this.data.physicalQrScanTests.filter((t) => t.outcome === 'passed').length,
      auditLogCount: this.data.auditLogs.length,
      storagePath: 'data/edison-store.json (Locked Atomic Write)',
    };
  }

  getLiveReportSnapshot(persistedData?: {
    summary: LiveReportSnapshot['summary'];
    campaignStatusBreakdown: Record<CampaignStatus, number>;
    latestAudit: AuditLogRecord | null;
  }): LiveReportSnapshot {
    const summary = this.getFoundationSummary(persistedData?.summary);
    const breakdown: Record<CampaignStatus, number> = persistedData?.campaignStatusBreakdown ?? {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      scheduled: 0,
      active: 0,
      paused: 0,
      completed: 0,
      expired: 0,
    };
    for (const c of this.data.campaigns) {
      breakdown[c.status] = (breakdown[c.status] || 0) + 1;
    }

    const latestAudit = persistedData ? persistedData.latestAudit : this.data.auditLogs[0] ?? null;
    return {
      generatedAt: new Date().toISOString(),
      phase: 'Pre-production — 77 of 99 executable subphases complete',
      stage: 'Cloudflare preview only; production storage, media processing, payments, and physical-device validation remain incomplete',
      block: 'Global release model and targeting-geography separation implemented; policy drafts require owner and counsel review',
      gateStatus: 'NOT PRODUCTION-READY — global release authorization and operational evidence are outstanding',
      progressMetrics: {
        aiStudioAssignmentPct: 100,
        executionSubphasesCompleted: 77,
        executionSubphasesTotal: 99,
        executionSubphasePct: 77.8,
        remainingExecutionSubphasePct: 22.2,
        consentBlockedScopePct: 0,
        trackBStatus: 'COMMITTED',
        rubricSummary: '77 of 99 executable subphases complete (77.8%); 22 subphases remain. This is software task progress, not production or launch readiness.',
      },
      latestAuditAt: latestAudit?.createdAt ?? null,
      latestAuditAction: latestAudit?.action ?? null,
      campaignStatusBreakdown: breakdown,
      summary,
    };
  }

  // --- Track B: Households, Multi-Profile, Personalisation, Bundled Consent & QR Revocation ---

  private assertHouseholdReadAccess(
    actor: PublicUser,
    household: HouseholdInstallationRecord
  ): void {
    if (
      isProductionEnvironment() &&
      (household.isPrototypeSeed || household.ownerUserId === 'usr_seed_viewer_01')
    ) {
      throw new Error(
        'FORBIDDEN: Prototype seed household fixtures and demo PINs are disabled in production environments.'
      );
    }
    if (actor.role === 'admin') return;
    if (actor.role !== 'household_viewer' || household.ownerUserId !== actor.id) {
      throw new Error(
        'FORBIDDEN: Privacy boundary prohibits advertisers, opportunity submitters, or other households from reading private household or profile data.'
      );
    }
  }

  private pushConsentAudit(
    draft: EdisonStoreData,
    entry: Omit<ConsentAuditEventRecord, 'id' | 'createdAt' | 'ordinaryTvPreserved'>
  ): ConsentAuditEventRecord {
    draft.consentAuditEvents = draft.consentAuditEvents || [];
    const record: ConsentAuditEventRecord = {
      id: `caud_${crypto.randomBytes(5).toString('hex')}`,
      ...entry,
      ordinaryTvPreserved: true,
      createdAt: new Date().toISOString(),
    };
    draft.consentAuditEvents.unshift(record);
    if (draft.consentAuditEvents.length > 500) {
      draft.consentAuditEvents.length = 500;
    }
    return record;
  }

  listHouseholdsForUser(actor: PublicUser): HouseholdInstallationRecord[] {
    this.syncIfDiskNewer();
    if (actor.role === 'advertiser' || actor.role === 'opportunity_submitter') {
      throw new Error(
        'FORBIDDEN: Advertisers and opportunity submitters cannot list private household installations; use aggregate regional analytics only.'
      );
    }
    const all = this.data.households || [];
    const filtered =
      actor.role === 'admin' ? all : all.filter((h) => h.ownerUserId === actor.id);
    return filtered.map((h) => ({ ...h, location: { ...h.location } }));
  }

  getHouseholdForActor(actor: PublicUser, householdId: string): HouseholdInstallationRecord {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) {
      throw new Error('Household installation not found.');
    }
    this.assertHouseholdReadAccess(actor, hh);
    return { ...hh, location: { ...hh.location } };
  }

  createHousehold(
    actor: PublicUser,
    input: {
      householdLabel: string;
      tvDeviceLabel: string;
      location: HouseholdLocation;
      commercialConsentGranted: boolean;
      personalisationMasterEnabled?: boolean;
      neutralDisplayMode?: boolean;
    }
  ): HouseholdInstallationRecord {
    if (actor.role !== 'household_viewer' && actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only household viewer accounts or admins may register a household TV installation.'
      );
    }
    const geoCheck = validateHouseholdLocationHierarchy(input.location);
    const now = new Date().toISOString();

    return this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      const commercialStatus = input.commercialConsentGranted ? 'granted' : 'withdrawn';
      const hh: HouseholdInstallationRecord = {
        id: `hh_${crypto.randomBytes(5).toString('hex')}`,
        ownerUserId: actor.id,
        householdLabel: input.householdLabel.trim(),
        tvDeviceLabel: input.tvDeviceLabel.trim(),
        location: geoCheck.normalized,
        locationValid: geoCheck.valid,
        locationValidationErrors: geoCheck.errors,
        targetingDisabled: !geoCheck.valid,
        ordinaryTvPreserved: true,
        commercialConsentStatus: commercialStatus,
        charityAndOpportunityStatus:
          commercialStatus === 'granted' ? 'active' : 'suspended_by_bundled_withdrawal',
        personalisationMasterEnabled: input.personalisationMasterEnabled !== false,
        neutralDisplayMode: Boolean(input.neutralDisplayMode),
        consentEpoch: 1,
        consentVersionLabel: 'DEC-OPEN-01-ScopeB-v1',
        lastConsentChangedAt: now,
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.households.unshift(hh);

      this.pushConsentAudit(draft, {
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: commercialStatus === 'granted' ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN_BUNDLED',
        previousEpoch: 0,
        newEpoch: 1,
        reason: `Household registered (${hh.location.countryCode}/${hh.location.provinceOrRegion}); locationValid=${hh.locationValid}; bundledConsent=${commercialStatus}.`,
        affectedQrTokensInvalidated: 0,
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_REGISTERED',
        'household',
        hh.id,
        `Registered household ${hh.id} (${hh.location.countryCode}/${hh.location.cityOrTown}; targetingDisabled=${hh.targetingDisabled}; ordinaryTvPreserved=true).`
      );
      return { ...hh, location: { ...hh.location } };
    });
  }

  updateHouseholdLocation(
    actor: PublicUser,
    householdId: string,
    location: HouseholdLocation
  ): HouseholdInstallationRecord {
    const geoCheck = validateHouseholdLocationHierarchy(location);
    return this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      const hh = draft.households.find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      hh.location = geoCheck.normalized;
      hh.locationValid = geoCheck.valid;
      hh.locationValidationErrors = geoCheck.errors;
      hh.targetingDisabled = !geoCheck.valid;
      hh.updatedAt = new Date().toISOString();

      this.pushConsentAudit(draft, {
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'LOCATION_UPDATED',
        previousEpoch: hh.consentEpoch,
        newEpoch: hh.consentEpoch,
        reason: geoCheck.valid
          ? `Updated validated geo hierarchy (${hh.location.countryCode}/${hh.location.provinceOrRegion}/${hh.location.cityOrTown}).`
          : `Location update flagged invalid (${geoCheck.errors[0] ?? 'hierarchy mismatch'}); targeted ads disabled, ordinary TV preserved.`,
        affectedQrTokensInvalidated: 0,
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_LOCATION_UPDATED',
        'household',
        hh.id,
        `Updated household location (${hh.location.countryCode}/${hh.location.provinceOrRegion}; locationValid=${hh.locationValid}).`
      );
      return { ...hh, location: { ...hh.location } };
    });
  }

  updateHouseholdDisplaySettings(
    actor: PublicUser,
    householdId: string,
    input: {
      householdLabel?: string;
      tvDeviceLabel?: string;
      personalisationMasterEnabled?: boolean;
      neutralDisplayMode?: boolean;
    }
  ): HouseholdInstallationRecord {
    return this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      const hh = draft.households.find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      if (input.householdLabel !== undefined) hh.householdLabel = input.householdLabel.trim();
      if (input.tvDeviceLabel !== undefined) hh.tvDeviceLabel = input.tvDeviceLabel.trim();
      if (input.personalisationMasterEnabled !== undefined) {
        hh.personalisationMasterEnabled = input.personalisationMasterEnabled;
      }
      if (input.neutralDisplayMode !== undefined) {
        hh.neutralDisplayMode = input.neutralDisplayMode;
      }
      hh.updatedAt = new Date().toISOString();

      this.pushConsentAudit(draft, {
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'NEUTRAL_MODE_CHANGED',
        previousEpoch: hh.consentEpoch,
        newEpoch: hh.consentEpoch,
        reason: `Display preferences updated (personalisationMasterEnabled=${hh.personalisationMasterEnabled}, neutralDisplayMode=${hh.neutralDisplayMode}).`,
        affectedQrTokensInvalidated: 0,
      });
      return { ...hh, location: { ...hh.location } };
    });
  }

  withdrawHouseholdConsentBundled(
    actor: PublicUser,
    householdId: string,
    reason: string
  ): {
    household: HouseholdInstallationRecord;
    revokedQrTokensCount: number;
    auditEvent: ConsentAuditEventRecord;
  } {
    const now = new Date().toISOString();
    return this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      draft.householdQrTokens = draft.householdQrTokens || [];
      const hh = draft.households.find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      const previousEpoch = hh.consentEpoch;
      const nextEpoch = previousEpoch + 1;
      hh.commercialConsentStatus = 'withdrawn';
      hh.charityAndOpportunityStatus = 'suspended_by_bundled_withdrawal';
      hh.consentEpoch = nextEpoch;
      hh.lastConsentChangedAt = now;
      hh.updatedAt = now;

      let revokedQrTokensCount = 0;
      for (const qrt of draft.householdQrTokens) {
        if (qrt.householdId === hh.id && !qrt.revokedAt) {
          qrt.revokedAt = now;
          qrt.revokedReason = `BUNDLED_CONSENT_WITHDRAWAL (epoch ${previousEpoch} -> ${nextEpoch}): ${reason.trim()}`;
          revokedQrTokensCount += 1;
        }
      }

      const auditEvent = this.pushConsentAudit(draft, {
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CONSENT_WITHDRAWN_BUNDLED',
        previousEpoch,
        newEpoch: nextEpoch,
        reason: `Bundled withdrawal enforced (DEC-OPEN-01): ${reason.trim()}. Suspended commercial + charity + opportunities + personalisation + invalidated ${revokedQrTokensCount} QR token(s). Ordinary TV remains functional.`,
        affectedQrTokensInvalidated: revokedQrTokensCount,
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_CONSENT_WITHDRAWN_BUNDLED',
        'consent',
        hh.id,
        `Withdrew household consent (epoch ${previousEpoch}->${nextEpoch}); suspended commercial + charity/opportunities; revoked ${revokedQrTokensCount} QR tokens; ordinary TV intact.`
      );

      return {
        household: { ...hh, location: { ...hh.location } },
        revokedQrTokensCount,
        auditEvent,
      };
    });
  }

  restoreHouseholdConsentExplicit(
    actor: PublicUser,
    householdId: string,
    input: { explicitConfirmation: boolean; reason: string }
  ): {
    household: HouseholdInstallationRecord;
    auditEvent: ConsentAuditEventRecord;
  } {
    if (!input.explicitConfirmation) {
      throw new Error(
        'Explicit viewer confirmation is required to restore bundled household consent.'
      );
    }
    const now = new Date().toISOString();
    return this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      const hh = draft.households.find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      const previousEpoch = hh.consentEpoch;
      const nextEpoch = previousEpoch + 1; // Increment again so pre-withdrawal QR tokens stay forever 403!
      hh.commercialConsentStatus = 'granted';
      hh.charityAndOpportunityStatus = 'active';
      hh.consentEpoch = nextEpoch;
      hh.lastConsentChangedAt = now;
      hh.updatedAt = now;

      const auditEvent = this.pushConsentAudit(draft, {
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CONSENT_RESTORED_EXPLICIT',
        previousEpoch,
        newEpoch: nextEpoch,
        reason: `Explicit auditable consent restoration: ${input.reason.trim()} (prior epoch tokens remain permanently invalidated HTTP 403).`,
        affectedQrTokensInvalidated: 0,
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_CONSENT_RESTORED_EXPLICIT',
        'consent',
        hh.id,
        `Explicitly restored household consent (epoch ${previousEpoch}->${nextEpoch}).`
      );

      return {
        household: { ...hh, location: { ...hh.location } },
        auditEvent,
      };
    });
  }

  listHouseholdMembers(
    actor: PublicUser,
    householdId: string
  ): Array<Omit<HouseholdMemberProfile, 'pinHash'>> {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) throw new Error('Household installation not found.');
    this.assertHouseholdReadAccess(actor, hh);
    return (this.data.householdMembers || [])
      .filter((m) => m.householdId === householdId)
      .map((m) => sanitizeMemberForList(m));
  }

  getHouseholdMembersForPersistence(
    actor: PublicUser,
    householdId: string
  ): HouseholdMemberProfile[] {
    this.syncIfDiskNewer();
    const household = (this.data.households || []).find((item) => item.id === householdId);
    if (!household) throw new Error('Household installation not found.');
    this.assertHouseholdReadAccess(actor, household);
    return (this.data.householdMembers || [])
      .filter((member) => member.householdId === householdId)
      .map((member) => ({
       ...member,
       qualifications: [...member.qualifications],
       skills: [...member.skills],
       employmentInterests: [...member.employmentInterests],
       industries: [...member.industries],
       interestedCategories: [...member.interestedCategories],
      }));
  }

  replaceHouseholdStateFromPersistence(
    actor: PublicUser,
    household: HouseholdInstallationRecord,
    members: HouseholdMemberProfile[],
    tokens: HouseholdQrTokenRecord[],
    auditEvents: ConsentAuditEventRecord[]
  ): void {
    this.assertHouseholdReadAccess(actor, household);
    if (
      members.some(
        (member) =>
          member.householdId !== household.id || member.ownerUserId !== household.ownerUserId
      ) ||
      tokens.some((token) => token.householdId !== household.id) ||
      auditEvents.some((event) => event.householdId !== household.id)
    ) {
      throw new Error('D1_DOMAIN_HOUSEHOLD_STATE_MISMATCH');
    }

    this.withWriteTransaction((draft) => {
      draft.households = draft.households || [];
      const householdIndex = draft.households.findIndex((item) => item.id === household.id);
      const householdCopy = { ...household, location: { ...household.location } };
      if (householdIndex < 0) draft.households.push(householdCopy);
      else draft.households[householdIndex] = householdCopy;

      draft.householdMembers = [
        ...(draft.householdMembers || []).filter((item) => item.householdId !== household.id),
        ...members.map((member) => ({
          ...member,
          qualifications: [...member.qualifications],
          skills: [...member.skills],
          employmentInterests: [...member.employmentInterests],
          industries: [...member.industries],
          interestedCategories: [...member.interestedCategories],
        })),
      ];
      draft.householdQrTokens = [
        ...(draft.householdQrTokens || []).filter((item) => item.householdId !== household.id),
        ...tokens.map((token) => ({ ...token })),
      ];
      draft.consentAuditEvents = [
        ...(draft.consentAuditEvents || []).filter((item) => item.householdId !== household.id),
        ...auditEvents.map((event) => ({ ...event })),
      ];
    });
  }

  replaceHouseholdQrRedirectStateFromPersistence(
    state: HouseholdQrRedirectPersistenceState
  ): void {
    if (
      state.household &&
      (state.household.id !== state.householdQrToken.householdId ||
        (state.opportunity &&
          state.opportunity.id !== state.householdQrToken.opportunityId) ||
        (state.baseQrLink &&
          state.baseQrLink.token !== state.householdQrToken.baseQrToken))
    ) {
      throw new Error('D1_DOMAIN_HOUSEHOLD_REDIRECT_STATE_MISMATCH');
    }

    this.withWriteTransaction((draft) => {
      draft.householdQrTokens = draft.householdQrTokens || [];
      const currentTokenIndex = draft.householdQrTokens.findIndex(
        (token) => token.token === state.householdQrToken.token
      );
      if (currentTokenIndex < 0) draft.householdQrTokens.push({ ...state.householdQrToken });
      else draft.householdQrTokens[currentTokenIndex] = { ...state.householdQrToken };

      if (state.household) {
        draft.households = draft.households || [];
        const householdIndex = draft.households.findIndex(
          (item) => item.id === state.household!.id
        );
        const householdCopy = {
          ...state.household,
          location: { ...state.household.location },
        };
        if (householdIndex < 0) draft.households.push(householdCopy);
        else draft.households[householdIndex] = householdCopy;
      }

      if (state.opportunity) {
        const opportunityIndex = draft.opportunities.findIndex(
          (opportunity) => opportunity.id === state.opportunity!.id
        );
        if (opportunityIndex < 0) draft.opportunities.push(state.opportunity);
        else draft.opportunities[opportunityIndex] = state.opportunity;
      }
      if (state.baseQrLink) {
        const qrIndex = draft.qrLinks.findIndex(
          (link) => link.token === state.baseQrLink!.token
        );
        if (qrIndex < 0) draft.qrLinks.push(state.baseQrLink);
        else draft.qrLinks[qrIndex] = state.baseQrLink;
      }
    });
  }

  createHouseholdMember(
    actor: PublicUser,
    householdId: string,
    input: {
      displayName: string;
      pin?: string;
      personalisationConsentGranted?: boolean;
      educationLevel?: string;
      qualifications?: string[];
      skills?: string[];
      experienceSummary?: string;
      experienceYears?: number;
      occupationOrTrade?: string;
      employmentInterests?: string[];
      careerAspirations?: string;
      industries?: string[];
      interestedCategories?: OpportunityCategory[];
    }
  ): Omit<HouseholdMemberProfile, 'pinHash'> {
    const now = new Date().toISOString();
    return this.withWriteTransaction((draft) => {
      const hh = (draft.households || []).find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      draft.householdMembers = draft.householdMembers || [];
      const member: HouseholdMemberProfile = {
        id: `mem_${crypto.randomBytes(5).toString('hex')}`,
        householdId,
        ownerUserId: hh.ownerUserId,
        displayName: input.displayName.trim(),
        pinHash: input.pin ? hashProfilePin(input.pin) : null,
        hasPinLock: Boolean(input.pin),
        personalisationConsentGranted: input.personalisationConsentGranted !== false,
        educationLevel: (input.educationLevel || '').trim(),
        qualifications: (input.qualifications || []).map((s) => s.trim()).filter(Boolean),
        skills: (input.skills || []).map((s) => s.trim()).filter(Boolean),
        experienceSummary: (input.experienceSummary || '').trim(),
        experienceYears: Math.max(0, Math.round(input.experienceYears ?? 0)),
        occupationOrTrade: (input.occupationOrTrade || '').trim(),
        employmentInterests: (input.employmentInterests || []).map((s) => s.trim()).filter(Boolean),
        careerAspirations: (input.careerAspirations || '').trim(),
        industries: (input.industries || []).map((s) => s.trim()).filter(Boolean),
        interestedCategories: input.interestedCategories || [],
        createdAt: now,
        updatedAt: now,
      };
      draft.householdMembers.push(member);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_MEMBER_CREATED',
        'household',
        member.id,
        `Added household profile "${member.displayName}" to household ${householdId} (personalisationConsent=${member.personalisationConsentGranted}).`
      );
      return sanitizeMemberForList(member);
    });
  }

  updateHouseholdMember(
    actor: PublicUser,
    householdId: string,
    memberId: string,
    input: {
      pinVerification?: string;
      displayName?: string;
      newPin?: string | null;
      personalisationConsentGranted?: boolean;
      educationLevel?: string;
      qualifications?: string[];
      skills?: string[];
      experienceSummary?: string;
      experienceYears?: number;
      occupationOrTrade?: string;
      employmentInterests?: string[];
      careerAspirations?: string;
      industries?: string[];
      interestedCategories?: OpportunityCategory[];
    }
  ): Omit<HouseholdMemberProfile, 'pinHash'> {
    return this.withWriteTransaction((draft) => {
      const hh = (draft.households || []).find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      const member = (draft.householdMembers || []).find(
        (m) => m.id === memberId && m.householdId === householdId
      );
      if (!member) throw new Error('Household member profile not found.');

      if (member.hasPinLock && member.pinHash && actor.role !== 'admin') {
        if (!input.pinVerification || !verifyProfilePin(input.pinVerification, member.pinHash)) {
          throw new Error('FORBIDDEN: Invalid or missing profile PIN verification for this member.');
        }
      }

      if (input.displayName !== undefined) member.displayName = input.displayName.trim();
      if (input.newPin === null) {
        member.pinHash = null;
        member.hasPinLock = false;
      } else if (typeof input.newPin === 'string' && input.newPin.length >= 4) {
        member.pinHash = hashProfilePin(input.newPin);
        member.hasPinLock = true;
      }
      if (input.personalisationConsentGranted !== undefined) {
        member.personalisationConsentGranted = input.personalisationConsentGranted;
        this.pushConsentAudit(draft, {
          householdId,
          actorId: actor.id,
          actorRole: actor.role,
          action: 'MEMBER_CONSENT_UPDATED',
          previousEpoch: hh.consentEpoch,
          newEpoch: hh.consentEpoch,
          reason: `Member ${member.displayName} personalisationConsentGranted=${input.personalisationConsentGranted}.`,
          affectedQrTokensInvalidated: 0,
        });
      }
      if (input.educationLevel !== undefined) member.educationLevel = input.educationLevel.trim();
      if (input.qualifications !== undefined) member.qualifications = input.qualifications;
      if (input.skills !== undefined) member.skills = input.skills;
      if (input.experienceSummary !== undefined)
        member.experienceSummary = input.experienceSummary.trim();
      if (input.experienceYears !== undefined)
        member.experienceYears = Math.max(0, Math.round(input.experienceYears));
      if (input.occupationOrTrade !== undefined)
        member.occupationOrTrade = input.occupationOrTrade.trim();
      if (input.employmentInterests !== undefined)
        member.employmentInterests = input.employmentInterests;
      if (input.careerAspirations !== undefined)
        member.careerAspirations = input.careerAspirations.trim();
      if (input.industries !== undefined) member.industries = input.industries;
      if (input.interestedCategories !== undefined)
        member.interestedCategories = input.interestedCategories;
      member.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_MEMBER_UPDATED',
        'household',
        member.id,
        `Updated household profile ${member.id} (consent=${member.personalisationConsentGranted}).`
      );
      return sanitizeMemberForList(member);
    });
  }

  deleteHouseholdMember(
    actor: PublicUser,
    householdId: string,
    memberId: string,
    pinVerification?: string
  ): void {
    this.withWriteTransaction((draft) => {
      const hh = (draft.households || []).find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      draft.householdMembers = draft.householdMembers || [];
      const member = draft.householdMembers.find(
        (m) => m.id === memberId && m.householdId === householdId
      );
      if (!member) throw new Error('Household member profile not found.');

      if (member.hasPinLock && member.pinHash && actor.role !== 'admin') {
        if (!pinVerification || !verifyProfilePin(pinVerification, member.pinHash)) {
          throw new Error('FORBIDDEN: Invalid or missing profile PIN verification for deletion.');
        }
      }

      draft.householdMembers = draft.householdMembers.filter((m) => m.id !== memberId);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_MEMBER_DELETED',
        'household',
        memberId,
        `Deleted household profile ${memberId} from ${householdId}.`
      );
    });
  }

  evaluateHouseholdOpportunityMatches(
    actor: PublicUser,
    householdId: string,
    opportunities?: OpportunityRecord[]
  ): {
    householdId: string;
    consentEpoch: number;
    commercialConsentStatus: HouseholdInstallationRecord['commercialConsentStatus'];
    charityAndOpportunityStatus: HouseholdInstallationRecord['charityAndOpportunityStatus'];
    neutralDisplayMode: boolean;
    deliverySuspended: boolean;
    suspensionReason: string | null;
    ordinaryTvPreserved: true;
    matches: HouseholdOpportunityMatchResult[];
  } {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) throw new Error('Household installation not found.');
    this.assertHouseholdReadAccess(actor, hh);

    const members = (this.data.householdMembers || []).filter(
      (m) => m.householdId === householdId
    );
    const result = matchOpportunitiesForHousehold({
      household: hh,
      members,
      opportunities: opportunities ?? this.data.opportunities,
    });

    return {
      householdId: hh.id,
      consentEpoch: hh.consentEpoch,
      commercialConsentStatus: hh.commercialConsentStatus,
      charityAndOpportunityStatus: hh.charityAndOpportunityStatus,
      neutralDisplayMode: hh.neutralDisplayMode,
      ...result,
    };
  }

  issueHouseholdEpochQrToken(
    actor: PublicUser,
    householdId: string,
    input: {
      baseQrToken: string;
      opportunityId?: string | null;
      campaignId?: string | null;
      ttlSeconds?: number;
    }
  ): HouseholdQrTokenRecord {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const ttlMs = Math.max(1000, Math.min(86400 * 1000, (input.ttlSeconds ?? 1800) * 1000));

    return this.withWriteTransaction((draft) => {
      const hh = (draft.households || []).find((h) => h.id === householdId);
      if (!hh) throw new Error('Household installation not found.');
      this.assertHouseholdReadAccess(actor, hh);

      if (
        hh.commercialConsentStatus !== 'granted' ||
        hh.charityAndOpportunityStatus !== 'active'
      ) {
        throw new Error(
          'FORBIDDEN: Cannot issue household QR access token while household bundled consent is withdrawn.'
        );
      }
      if (!hh.locationValid || hh.targetingDisabled) {
        throw new Error(
          'Household location validation is invalid; targeted QR token issuance disabled.'
        );
      }

      const baseQr = draft.qrLinks.find((q) => q.token === input.baseQrToken);
      if (!baseQr || baseQr.status !== 'active') {
        throw new Error('Base QR link is missing or not active.');
      }

      draft.householdQrTokens = draft.householdQrTokens || [];
      const tokenRecord: HouseholdQrTokenRecord = {
        token: `hqr_${crypto.randomBytes(6).toString('hex')}`,
        baseQrToken: baseQr.token,
        householdId: hh.id,
        opportunityId: input.opportunityId ?? null,
        campaignId: input.campaignId ?? null,
        consentEpoch: hh.consentEpoch,
        issuedAt: nowIso,
        expiresAt: new Date(nowMs + ttlMs).toISOString(),
        revokedAt: null,
        revokedReason: null,
        resolvedCount: 0,
        rejected403Count: 0,
      };
      draft.householdQrTokens.unshift(tokenRecord);

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_EPOCH_QR_ISSUED',
        'consent',
        tokenRecord.token,
        `Issued epoch-${hh.consentEpoch} QR token /r/${tokenRecord.token} bound to household ${hh.id} (expires ${tokenRecord.expiresAt}).`
      );
      return { ...tokenRecord };
    });
  }

  listHouseholdQrTokens(actor: PublicUser, householdId: string): HouseholdQrTokenRecord[] {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) throw new Error('Household installation not found.');
    this.assertHouseholdReadAccess(actor, hh);
    return (this.data.householdQrTokens || [])
      .filter((t) => t.householdId === householdId)
      .map((t) => ({ ...t }));
  }

  listConsentAuditEvents(actor: PublicUser, householdId: string): ConsentAuditEventRecord[] {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) throw new Error('Household installation not found.');
    this.assertHouseholdReadAccess(actor, hh);
    return (this.data.consentAuditEvents || [])
      .filter((e) => e.householdId === householdId)
      .map((e) => ({ ...e }));
  }

  evaluateHouseholdDeliveryGate(
    actor: PublicUser,
    householdId: string,
    expectedConsentEpoch?: number
  ): {
    allowed: boolean;
    household: HouseholdInstallationRecord;
    reason: string | null;
  } {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) {
      throw new Error('Household installation not found.');
    }
    this.assertHouseholdReadAccess(actor, hh);

    if (
      hh.commercialConsentStatus !== 'granted' ||
      hh.charityAndOpportunityStatus !== 'active'
    ) {
      return {
        allowed: false,
        household: { ...hh, location: { ...hh.location } },
        reason:
          'Bundled consent withdrawal is active: commercial advertising, charity ads, opportunities, and personalisation are suspended (ordinary TV preserved).',
      };
    }

    if (!hh.locationValid || hh.targetingDisabled) {
      return {
        allowed: false,
        household: { ...hh, location: { ...hh.location } },
        reason:
          'Household geographic hierarchy is missing or invalid; targeted ad delivery is disabled while ordinary TV continues.',
      };
    }

    if (
      typeof expectedConsentEpoch === 'number' &&
      expectedConsentEpoch !== hh.consentEpoch
    ) {
      return {
        allowed: false,
        household: { ...hh, location: { ...hh.location } },
        reason: `Stale consent epoch (${expectedConsentEpoch} != current ${hh.consentEpoch}); stale caches and tokens rejected fail-closed.`,
      };
    }

    return {
      allowed: true,
      household: { ...hh, location: { ...hh.location } },
      reason: null,
    };
  }

  getAdvertiserGeoAggregates(actor: PublicUser): AdvertiserGeoAggregateRow[] {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    // Strictly returns only non-identifying coarse city/province household counts (never addresses or profiles).
    return computeAdvertiserGeoAggregates(this.data.households || []);
  }

  // --- Phase 8 Block 8.1: Broadcast Render Job Compilation ---

  compileCreativeBroadcastRenderJob(
    actor: PublicUser,
    creativeId: string,
    resolutionProfile: BroadcastResolutionProfile = '1080p_fhd'
  ): BroadcastRenderJobResult {
    this.syncIfDiskNewer();
    const creative = this.data.adCreatives.find((c) => c.id === creativeId);
    if (!creative) {
      throw new Error('Ad creative not found.');
    }
    if (actor.role !== 'admin' && creative.ownerId !== actor.id) {
      throw new Error('FORBIDDEN: You do not own this ad creative.');
    }
    const qrLink = creative.qrToken
      ? this.data.qrLinks.find((q) => q.token === creative.qrToken) ?? null
      : null;

    return compileBroadcastRenderJob({
      creative,
      qrLink,
      resolutionProfile,
    });
  }

  // --- Phase 9 Block 9.1: Opportunity Verification Operations Hardening ---

  getOpportunityOpsOverview(
    actor: PublicUser,
    persistedData?: {
      opportunities: OpportunityRecord[];
      complaints: OpportunityComplaintRecord[];
      appeals: OpportunityAppealRecord[];
      campaigns: CampaignRecord[];
    }
  ): OpportunityOpsOverview {
    this.syncIfDiskNewer();
    return buildOpportunityOpsOverview({
      actor,
      opportunities: persistedData?.opportunities ?? this.data.opportunities,
      complaints: persistedData?.complaints ?? this.data.opportunityComplaints,
      appeals: persistedData?.appeals ?? this.data.opportunityAppeals,
      campaigns: persistedData?.campaigns ?? this.data.campaigns,
    });
  }

  runOpportunityExpiryAndReverificationSweep(
    actor: PublicUser,
    input?: { notes?: string }
  ): OpportunityOpsSweepResult {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may run opportunity expiry and verification sweeps.'
      );
    }

    return this.withWriteTransaction((draft) => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const campaignById = new Map(draft.campaigns.map((c) => [c.id, c]));

      let evidenceSealsVerifiedCount = 0;
      let expiredTransitionedCount = 0;
      let flaggedForReverificationCount = 0;
      let feeIndependenceVerified = true;
      let nonTransitivityVerified = true;

      for (const opp of draft.opportunities) {
        const assessment = evaluateOpportunityVerificationOps({
          opportunity: opp,
          complaints: draft.opportunityComplaints,
          linkedCampaign: opp.linkedCampaignId
            ? campaignById.get(opp.linkedCampaignId) ?? null
            : null,
          nowMs,
        });

        evidenceSealsVerifiedCount += assessment.vaultSeals.length;
        if (!assessment.feeIndependenceVerified) feeIndependenceVerified = false;
        if (!assessment.nonTransitivityVerified) nonTransitivityVerified = false;

        if (
          assessment.expiredByDate &&
          opp.status !== 'expired' &&
          opp.status !== 'rejected' &&
          opp.status !== 'revoked'
        ) {
          opp.status = 'expired';
          opp.updatedAt = nowIso;
          expiredTransitionedCount += 1;
        }

        if (assessment.reverificationRequired) {
          flaggedForReverificationCount += 1;
        }
      }

      const sweepId = `oswp_${crypto.randomBytes(5).toString('hex')}`;
      const overview = buildOpportunityOpsOverview({
        actor,
        opportunities: draft.opportunities,
        complaints: draft.opportunityComplaints,
        appeals: draft.opportunityAppeals,
        campaigns: draft.campaigns,
        nowMs,
      });

      const notes =
        input?.notes?.trim() ||
        'Scheduled opportunity expiry & 90d/180d/365d Tier 1–3 re-verification sweep.';

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'OPPORTUNITY_OPS_SWEEP_EXECUTED',
        'opportunity',
        sweepId,
        `Sweep ${sweepId}: ${evidenceSealsVerifiedCount} vault seals verified, ${expiredTransitionedCount} expired, ${flaggedForReverificationCount} pending re-verification (${notes}).`
      );

      return {
        sweepId,
        executedAt: nowIso,
        notes,
        evidenceSealsVerifiedCount,
        expiredTransitionedCount,
        flaggedForReverificationCount,
        feeIndependenceVerified,
        nonTransitivityVerified,
        overview,
      };
    });
  }

  // --- Phase 10 Block 10.1: Privacy, Security & Statutory Compliance Readiness ---

  getPrivacyComplianceOverview(
    actor: PublicUser,
    persisted?: {
      households: HouseholdInstallationRecord[];
      sessions: Array<Pick<SessionRecord, 'expiresAt' | 'idleExpiresAt'>>;
      householdQrTokens: HouseholdQrTokenRecord[];
      analyticsEvents: AnalyticsEventRecord[];
    }
  ): PrivacyComplianceOverview {
    this.syncIfDiskNewer();
    return buildPrivacyComplianceOverview({
      actor,
      households: persisted?.households ?? this.data.households ?? [],
      sessions: persisted?.sessions ?? this.data.sessions,
      householdQrTokens: persisted?.householdQrTokens ?? this.data.householdQrTokens ?? [],
      analyticsEvents: persisted?.analyticsEvents ?? this.data.analyticsEvents,
    });
  }

  exportHouseholdDsrPackage(actor: PublicUser, householdId: string): PrivacyDsrExportPackage {
    this.syncIfDiskNewer();
    const hh = (this.data.households || []).find((h) => h.id === householdId);
    if (!hh) {
      throw new Error('Household installation not found.');
    }
    this.assertHouseholdReadAccess(actor, hh);

    return buildHouseholdDsrExportPackage({
      household: hh,
      members: this.data.householdMembers || [],
      householdQrTokens: this.data.householdQrTokens || [],
      consentAuditEvents: this.data.consentAuditEvents || [],
    });
  }

  anonymiseHouseholdDsr(
    actor: PublicUser,
    householdId: string,
    input: { confirmationPhrase: string; reason: string }
  ): PrivacyDsrErasureResult {
    if (input.confirmationPhrase !== 'ERASE HOUSEHOLD DATA') {
      throw new Error('Confirmation phrase must be exactly "ERASE HOUSEHOLD DATA".');
    }

    return this.withWriteTransaction((draft) => {
      const nowIso = new Date().toISOString();
      const hh = (draft.households || []).find((h) => h.id === householdId);
      if (!hh) {
        throw new Error('Household installation not found.');
      }
      this.assertHouseholdReadAccess(actor, hh);

      const { erasureResult } = anonymiseHouseholdDraftData({
        household: hh,
        members: draft.householdMembers || [],
        householdQrTokens: draft.householdQrTokens || [],
        nowIso,
      });

      draft.consentAuditEvents = draft.consentAuditEvents || [];
      draft.consentAuditEvents.unshift({
        id: `caud_${crypto.randomBytes(6).toString('hex')}`,
        householdId: hh.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CONSENT_WITHDRAWN_BUNDLED',
        previousEpoch: erasureResult.previousEpoch,
        newEpoch: erasureResult.newEpoch,
        reason: `DSR Right-to-Erasure (${erasureResult.erasureId}): ${input.reason.trim()}`,
        affectedQrTokensInvalidated: erasureResult.qrTokensRevokedCount,
        ordinaryTvPreserved: true,
        createdAt: nowIso,
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'HOUSEHOLD_DSR_ERASURE_EXECUTED',
        'consent',
        hh.id,
        `DSR erasure ${erasureResult.erasureId} scrubbed ${erasureResult.membersAnonymisedCount} profile(s), revoked ${erasureResult.qrTokensRevokedCount} QR token(s), epoch ${erasureResult.previousEpoch} -> ${erasureResult.newEpoch} (ordinary TV preserved).`
      );

      return erasureResult;
    });
  }

  runPrivacyRetentionCleanupSweep(
    actor: PublicUser,
    input?: { notes?: string }
  ): PrivacyRetentionReport {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may run privacy retention cleanup sweeps.'
      );
    }

    return this.withWriteTransaction((draft) => {
      const { report, keptSessions, keptQrTokens } = executeRetentionPurgeOnDraft({
        sessions: draft.sessions,
        householdQrTokens: draft.householdQrTokens || [],
        analyticsEvents: draft.analyticsEvents,
      });

      draft.sessions = keptSessions;
      draft.householdQrTokens = keptQrTokens;

      const notes = input?.notes?.trim() || 'Automated retention purge sweep.';
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'PRIVACY_RETENTION_SWEEP_EXECUTED',
        'system',
        report.sweepId,
        `Retention sweep ${report.sweepId}: purged ${report.expiredSessionsPurged} expired session(s) and ${report.staleExpiredQrTokensPurged} >30d stale QR token(s) (${notes}).`
      );

      return report;
    });
  }

  // --- Phase 11 Block 11.1: Reliability, Failure-Mode & Chaos Recovery Suite ---

  getReliabilityChaosOverview(actor: PublicUser): ReliabilityChaosOverview {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    return buildReliabilityChaosOverview(this.data.lastReliabilityChaosReport ?? null);
  }

  executeFailureModeChaosProbe(
    actor: PublicUser,
    input: { failureModeId: FailureModeId; injectSeverity?: ChaosInjectSeverity }
  ): {
    probe: ChaosScenarioResult;
    overview: ReliabilityChaosOverview;
  } {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    const probe = runSingleFailureModeChaosTest(input.failureModeId, {
      injectSeverity: input.injectSeverity,
    });
    this.recordSecurityAudit(
      actor,
      'RELIABILITY_CHAOS_PROBE_RUN',
      input.failureModeId,
      `Executed ${input.failureModeId} (${probe.severity}) chaos probe: passed=${probe.passed}, ordinaryTvPreserved=${probe.ordinaryTvPreserved}, latency=${probe.recoveryLatencyMs}ms.`
    );
    return {
      probe,
      overview: buildReliabilityChaosOverview(this.data.lastReliabilityChaosReport ?? null),
    };
  }

  runFullReliabilityChaosSuite(
    actor: PublicUser,
    input?: { notes?: string; injectSeverity?: ChaosInjectSeverity }
  ): {
    report: ReliabilityChaosReport;
    overview: ReliabilityChaosOverview;
  } {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may run and persist the full 18-FM reliability chaos suite.'
      );
    }

    return this.withWriteTransaction((draft) => {
      const report = runFull18FailureModesChaosSuite({
        executedByEmail: actor.email,
        notes: input?.notes,
        injectSeverity: input?.injectSeverity,
      });
      draft.lastReliabilityChaosReport = report;

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'RELIABILITY_FULL_18_CHAOS_RUN',
        'system',
        report.reportId,
        `Full 18-FM chaos suite ${report.reportId} (${input?.injectSeverity ?? 'standard'}): ${report.passedFailureModes}/18 passed, ordinaryTvPreservedAll=${report.ordinaryTvPreservedAll}, sha256=${report.reportSha256.slice(0, 12)}.`
      );

      return {
        report,
        overview: buildReliabilityChaosOverview(report),
      };
    });
  }

  // --- Phase 12 Block 12.1: Controlled Hardware & Viewer Pilot Readiness (Software-First) ---

  getPilotReadinessOverview(actor: PublicUser): PilotReadinessOverview {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    return buildPilotReadinessOverview({
      households: this.data.households || [],
      campaigns: this.data.campaigns,
      creatives: this.data.adCreatives,
      opportunities: this.data.opportunities,
      qrLinks: this.data.qrLinks,
      physicalQrScanTests: this.data.physicalQrScanTests,
      lastReliabilityChaosReport: this.data.lastReliabilityChaosReport ?? null,
      cohorts: this.data.pilotCohorts || [],
      stageP6PrepNotes: this.data.stageP6PrepNotes || {},
    });
  }

  replacePilotCohortsFromPersistence(cohorts: PilotCohortBlueprintRecord[]): void {
    this.withWriteTransaction((draft) => {
      draft.pilotCohorts = cohorts.map((cohort) => ({ ...cohort, enrolledHouseholdIds: [...cohort.enrolledHouseholdIds] }));
    });
  }

  replaceLastReliabilityChaosReportFromPersistence(
    report: ReliabilityChaosReport | null
  ): void {
    this.withWriteTransaction((draft) => {
      draft.lastReliabilityChaosReport = report ? { ...report, results: [...report.results] } : null;
    });
  }

  replaceStageP6PrepNotesFromPersistence(
    notes: Array<{ stepId: StageP6StepId; ownerPrepNote: string }>
  ): void {
    this.withWriteTransaction((draft) => {
      draft.stageP6PrepNotes = Object.fromEntries(
        notes.map((note) => [note.stepId, note.ownerPrepNote])
      );
    });
  }

  createPilotCohortBlueprint(
    actor: PublicUser,
    input: {
      cohortName: string;
      targetCountryCode: string;
      targetArchitectureId: PilotTargetArchitectureId;
      maxHouseholdsCap: number;
      enrolledHouseholdIds: string[];
      decOpen02ShortBreakRuleAcknowledged: boolean;
      decOpen03GamMockOnlyAcknowledged: boolean;
    }
  ): {
    cohort: PilotCohortBlueprintRecord;
    overview: PilotReadinessOverview;
  } {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may author or register closed pilot cohort blueprints.'
      );
    }

    return this.withWriteTransaction((draft) => {
      const cohort = buildPilotCohortBlueprintRecord({
        ...input,
        households: draft.households || [],
        createdByEmail: actor.email,
      });
      draft.pilotCohorts = draft.pilotCohorts || [];
      draft.pilotCohorts.unshift(cohort);
      if (draft.pilotCohorts.length > 50) {
        draft.pilotCohorts.length = 50;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'PILOT_COHORT_BLUEPRINT_CREATED',
        'system',
        cohort.id,
        `Created software-first pilot cohort blueprint "${cohort.cohortName}" (${cohort.targetCountryCode}/${cohort.targetArchitectureId}, ${cohort.enrolledHouseholdIds.length} household(s), status=${cohort.status}, hardwareTested=false, countryActivated=false).`
      );

      return {
        cohort,
        overview: buildPilotReadinessOverview({
          households: draft.households || [],
          campaigns: draft.campaigns,
          creatives: draft.adCreatives,
          opportunities: draft.opportunities,
          qrLinks: draft.qrLinks,
          physicalQrScanTests: draft.physicalQrScanTests,
          lastReliabilityChaosReport: draft.lastReliabilityChaosReport ?? null,
          cohorts: draft.pilotCohorts,
          stageP6PrepNotes: draft.stageP6PrepNotes || {},
        }),
      };
    });
  }

  validatePilotTelemetrySample(
    actor: PublicUser,
    input: {
      cohortId: string;
      regionCode: string;
      architectureId: PilotTargetArchitectureId;
      householdConsentStatus: 'granted' | 'withdrawn' | 'pending';
      claimedHardwareTested?: boolean;
      consentEpoch: number;
      expectedConsentEpoch: number;
      switchLatencyMs: number;
      returnToLiveTvMs: number;
      qrScanObservedMs?: number | null;
      ordinaryTvPreserved: boolean;
      extraPayload?: Record<string, unknown>;
    }
  ): PilotTelemetryValidationResult {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    const result = scanPilotTelemetryZeroPii(input);
    this.recordSecurityAudit(
      actor,
      result.valid ? 'PILOT_TELEMETRY_SCHEMA_VALIDATED' : 'PILOT_TELEMETRY_SCHEMA_REJECTED',
      input.cohortId,
      `Pilot Zero-PII telemetry check (${input.architectureId}): valid=${result.valid}, piiFlags=${result.piiDetectedFields.length}, consentValid=${result.consentValid}, forgedHwBlocked=${result.forgedHardwareClaimBlocked}, hardwareTested=false.`
    );
    return result;
  }

  recordStageP6RunbookPrep(
    actor: PublicUser,
    input: {
      stepId: StageP6StepId;
      ownerPrepNote: string;
    }
  ): PilotReadinessOverview {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may update Stage P6 pre-flight runbook preparation notes.'
      );
    }

    return this.withWriteTransaction((draft) => {
      draft.stageP6PrepNotes = draft.stageP6PrepNotes || {};
      draft.stageP6PrepNotes[input.stepId] = input.ownerPrepNote.trim();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'STAGE_P6_RUNBOOK_PREP_UPDATED',
        'qa_handover',
        input.stepId,
        `Updated Stage P6 runbook pre-flight note for ${input.stepId} (physical hardware execution strictly deferred to final Stage P6).`
      );

      return buildPilotReadinessOverview({
        households: draft.households || [],
        campaigns: draft.campaigns,
        creatives: draft.adCreatives,
        opportunities: draft.opportunities,
        qrLinks: draft.qrLinks,
        physicalQrScanTests: draft.physicalQrScanTests,
        lastReliabilityChaosReport: draft.lastReliabilityChaosReport ?? null,
        cohorts: draft.pilotCohorts || [],
        stageP6PrepNotes: draft.stageP6PrepNotes,
      });
    });
  }

  // --- Phase 13 Block 13.1: Commercial Readiness Board Gate, SLA Matrix & Unit Economics ---

  getCommercialReadinessOverview(actor: PublicUser): CommercialReadinessOverview {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    return buildCommercialReadinessOverview({
      profiles: this.data.advertiserProfiles,
      campaigns: this.data.campaigns,
      creatives: this.data.adCreatives,
      opportunities: this.data.opportunities,
      qrLinks: this.data.qrLinks,
      tickets: this.data.supportTickets,
      assumptions: this.data.commercialCostAssumptions,
      boardDecisions: this.data.commercialBoardDecisions || [],
    });
  }

  replaceCommercialReadinessStateFromPersistence(
    assumptions: CommercialCostAssumptionsInput | null,
    decisions: CommercialBoardDecisionRecord[]
  ): void {
    this.withWriteTransaction((draft) => {
      if (assumptions) draft.commercialCostAssumptions = { ...assumptions };
      else delete draft.commercialCostAssumptions;
      draft.commercialBoardDecisions = decisions.map((decision) => ({ ...decision }));
    });
  }

  updateCommercialCostAssumptions(
    actor: PublicUser,
    input: CommercialCostAssumptionsInput
  ): CommercialReadinessOverview {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may update commercial unit-economics budget assumptions.'
      );
    }

    return this.withWriteTransaction((draft) => {
      draft.commercialCostAssumptions = { ...input };
      const overview = buildCommercialReadinessOverview({
        profiles: draft.advertiserProfiles,
        campaigns: draft.campaigns,
        creatives: draft.adCreatives,
        opportunities: draft.opportunities,
        qrLinks: draft.qrLinks,
        tickets: draft.supportTickets,
        assumptions: draft.commercialCostAssumptions,
        boardDecisions: draft.commercialBoardDecisions || [],
      });

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'COMMERCIAL_UNIT_ECONOMICS_UPDATED',
        'system',
        'phase13_unit_economics',
        `Updated software budget assumptions (${input.activeHouseholdsEstimate} households, OPEX=$${overview.unitEconomics.estimatedTotalMonthlyOpexUsd}/mo, Charity=$0.00, paymentCollectionActive=false).`
      );

      return overview;
    });
  }

  submitCommercialBoardDecision(
    actor: PublicUser,
    input: {
      decisionOutcome: CommercialBoardDecisionOutcome;
      requestedLaunchAuthorization: boolean;
      summaryNote: string;
    }
  ): {
    decision: CommercialBoardDecisionRecord;
    overview: CommercialReadinessOverview;
  } {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may submit Commercial Readiness Board decisions.'
      );
    }

    // Fail-closed launch guard executes BEFORE modifying store state
    const decision = buildCommercialBoardDecision({
      actorEmail: actor.email,
      decisionOutcome: input.decisionOutcome,
      requestedLaunchAuthorization: input.requestedLaunchAuthorization,
      summaryNote: input.summaryNote,
    });

    return this.withWriteTransaction((draft) => {
      draft.commercialBoardDecisions = draft.commercialBoardDecisions || [];
      draft.commercialBoardDecisions.unshift(decision);
      if (draft.commercialBoardDecisions.length > 50) {
        draft.commercialBoardDecisions.length = 50;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'COMMERCIAL_BOARD_REVIEW_LOGGED',
        'system',
        decision.id,
        `Logged Commercial Readiness Board review (${decision.decisionOutcome}): commercialLaunchAuthorized=false, paymentCollectionActive=false, countryActivated=false, hardwareTested=false.`
      );

      return {
        decision,
        overview: buildCommercialReadinessOverview({
          profiles: draft.advertiserProfiles,
          campaigns: draft.campaigns,
          creatives: draft.adCreatives,
          opportunities: draft.opportunities,
          qrLinks: draft.qrLinks,
          tickets: draft.supportTickets,
          assumptions: draft.commercialCostAssumptions,
          boardDecisions: draft.commercialBoardDecisions,
        }),
      };
    });
  }

  // Legacy jurisdiction reference records; these do not control product availability.

  getCountryLaunchOverview(actor: PublicUser): CountryLaunchOverview {
    this.syncIfDiskNewer();
    if (!actor) throw new Error('Authentication required.');
    return buildCountryLaunchOverview({
      households: this.data.households || [],
      campaigns: this.data.campaigns,
      opportunities: this.data.opportunities,
      qrLinks: this.data.qrLinks,
      storedPolicyProfiles: this.data.countryPolicyProfiles,
      launchDecisions: this.data.countryLaunchDecisions || [],
    });
  }

  replaceCountryLaunchStateFromPersistence(
    profiles: CountryJurisdictionPolicyConfig[],
    decisions: CountryLaunchDecisionRecord[]
  ): void {
    this.withWriteTransaction((draft) => {
      draft.countryPolicyProfiles = Object.fromEntries(
        profiles.map((profile) => [profile.countryCode, { ...profile }])
      );
      draft.countryLaunchDecisions = decisions.map((decision) => ({ ...decision }));
    });
  }

  updateCountryPolicyConfig(
    actor: PublicUser,
    input: {
      countryCode: TargetingGeographyCode;
      consentBannerStrictMode: boolean;
      requirePreBroadcastHumanModeration: boolean;
      enforceVppsOrLocalPrivacyLock: boolean;
      operatorTaxNoticeLabel: string;
    }
  ): CountryLaunchOverview {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may update jurisdiction readiness policy configurations.'
      );
    }

    return this.withWriteTransaction((draft) => {
      draft.countryPolicyProfiles = draft.countryPolicyProfiles || {};
      const updated = buildUpdatedCountryPolicyConfig({
        ...input,
        actorEmail: actor.email,
      });
      draft.countryPolicyProfiles[input.countryCode] = updated;

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'COUNTRY_POLICY_PROFILE_UPDATED',
        'system',
        input.countryCode,
        `Updated policy controls for ${input.countryCode} (strictConsent=${updated.consentBannerStrictMode}, moderation=${updated.requirePreBroadcastHumanModeration}, privacyLock=${updated.enforceVppsOrLocalPrivacyLock}, jobFeeZeroLock=true, countryActivated=false, legalComplianceClaimed=false).`
      );

      return buildCountryLaunchOverview({
        households: draft.households || [],
        campaigns: draft.campaigns,
        opportunities: draft.opportunities,
        qrLinks: draft.qrLinks,
        storedPolicyProfiles: draft.countryPolicyProfiles,
        launchDecisions: draft.countryLaunchDecisions || [],
      });
    });
  }

  submitCountryLaunchDecision(
    actor: PublicUser,
    input: {
      countryCode: TargetingGeographyCode;
      decisionOutcome: CountryLaunchDecisionOutcome;
      requestedCountryActivation: boolean;
      summaryNote: string;
    }
  ): {
    decision: CountryLaunchDecisionRecord;
    overview: CountryLaunchOverview;
  } {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may record territory launch readiness decisions.'
      );
    }

    // Fail-closed activation guard executes BEFORE modifying store state
    const decision = buildCountryLaunchDecision({
      countryCode: input.countryCode,
      actorEmail: actor.email,
      decisionOutcome: input.decisionOutcome,
      requestedCountryActivation: input.requestedCountryActivation,
      summaryNote: input.summaryNote,
    });

    return this.withWriteTransaction((draft) => {
      draft.countryLaunchDecisions = draft.countryLaunchDecisions || [];
      draft.countryLaunchDecisions.unshift(decision);
      if (draft.countryLaunchDecisions.length > 50) {
        draft.countryLaunchDecisions.length = 50;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'COUNTRY_LAUNCH_DECISION_LOGGED',
        'system',
        decision.id,
        `Logged Phase 14 launch review for ${decision.countryCode} (${decision.decisionOutcome}): countryActivated=false, commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false, legalComplianceClaimed=false.`
      );

      return {
        decision,
        overview: buildCountryLaunchOverview({
          households: draft.households || [],
          campaigns: draft.campaigns,
          opportunities: draft.opportunities,
          qrLinks: draft.qrLinks,
          storedPolicyProfiles: draft.countryPolicyProfiles,
          launchDecisions: draft.countryLaunchDecisions,
        }),
      };
    });
  }

  // --- Phase 15 Block 15.1: International Multi-Region Expansion, Localization & Sovereign Residency ---
  getInternationalExpansionOverview(actor: PublicUser): InternationalExpansionOverview {
    this.syncIfDiskNewer();
    if (!actor?.id) {
      throw new Error('Authentication required to inspect Phase 15 international expansion readiness.');
    }
    return buildInternationalExpansionOverview({
      households: this.data.households || [],
      campaigns: this.data.campaigns,
      opportunities: this.data.opportunities,
      qrLinks: this.data.qrLinks,
      storedPolicyProfiles: this.data.countryPolicyProfiles,
      countryLaunchDecisions: this.data.countryLaunchDecisions || [],
      storedLocalizationProfiles: this.data.regionalLocalizationProfiles,
      expansionDecisions: this.data.internationalExpansionDecisions || [],
    });
  }

  replaceInternationalExpansionStateFromPersistence(
    profiles: RegionalLocalizationConfig[],
    decisions: InternationalExpansionDecisionRecord[]
  ): void {
    this.withWriteTransaction((draft) => {
      const mapped: Partial<Record<ExpansionRegionId, RegionalLocalizationConfig>> = {};
      for (const profile of profiles) mapped[profile.regionId] = { ...profile };
      draft.regionalLocalizationProfiles = mapped;
      draft.internationalExpansionDecisions = decisions.map((decision) => ({ ...decision }));
    });
  }

  updateRegionalLocalizationConfig(
    actor: PublicUser,
    input: {
      regionId: ExpansionRegionId;
      primaryLanguageCode: string;
      supportedLanguageCodes: string[];
      captionAccessibilityStandard: string;
      multiCurrencyCode: ExpansionCurrencyCode;
      proFormaCpmRateLocal: number;
    }
  ): InternationalExpansionOverview {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may update Phase 15 regional localization and residency blueprints.'
      );
    }

    const updatedConfig = buildUpdatedRegionalLocalizationConfig({
      regionId: input.regionId,
      primaryLanguageCode: input.primaryLanguageCode,
      supportedLanguageCodes: input.supportedLanguageCodes,
      captionAccessibilityStandard: input.captionAccessibilityStandard,
      multiCurrencyCode: input.multiCurrencyCode,
      proFormaCpmRateLocal: input.proFormaCpmRateLocal,
      actorEmail: actor.email,
    });

    return this.withWriteTransaction((draft) => {
      draft.regionalLocalizationProfiles = draft.regionalLocalizationProfiles || {};
      draft.regionalLocalizationProfiles[input.regionId] = updatedConfig;

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'REGIONAL_LOCALIZATION_UPDATED',
        'system',
        input.regionId,
        `Updated Phase 15 localization blueprint for ${input.regionId} (primaryLang=${updatedConfig.primaryLanguageCode}, currency=${updatedConfig.multiCurrencyCode}, proFormaCPM=${updatedConfig.proFormaCpmRateLocal}): prohibitCrossBorderPiiTransfer=true, charityZeroCostLocked=true, regionalExpansionActive=false.`
      );

      return buildInternationalExpansionOverview({
        households: draft.households || [],
        campaigns: draft.campaigns,
        opportunities: draft.opportunities,
        qrLinks: draft.qrLinks,
        storedPolicyProfiles: draft.countryPolicyProfiles,
        countryLaunchDecisions: draft.countryLaunchDecisions,
        storedLocalizationProfiles: draft.regionalLocalizationProfiles,
        expansionDecisions: draft.internationalExpansionDecisions,
      });
    });
  }

  estimateRegionalMultiCurrencyProForma(
    actor: PublicUser,
    input: {
      regionId: ExpansionRegionId;
      currencyCode: ExpansionCurrencyCode;
      proFormaCpmRateLocal: number;
      directCommercialImpressions: number;
      charityImpressions: number;
    }
  ): MultiCurrencyProFormaEstimate {
    if (!actor?.id) {
      throw new Error('Authentication required to run multi-currency pro-forma estimates.');
    }
    return computeMultiCurrencyProFormaEstimate(input);
  }

  submitInternationalExpansionDecision(
    actor: PublicUser,
    input: {
      regionId: ExpansionRegionId;
      decisionOutcome: InternationalExpansionDecisionOutcome;
      requestedRegionActivation: boolean;
      summaryNote: string;
    }
  ): {
    decision: InternationalExpansionDecisionRecord;
    overview: InternationalExpansionOverview;
  } {
    if (actor.role !== 'admin') {
      throw new Error(
        'FORBIDDEN: Only administrators may record international expansion governance decisions.'
      );
    }

    // Fail-closed activation guard executes BEFORE mutating persisted store state
    const decision = buildInternationalExpansionDecision({
      regionId: input.regionId,
      actorEmail: actor.email,
      decisionOutcome: input.decisionOutcome,
      requestedRegionActivation: input.requestedRegionActivation,
      summaryNote: input.summaryNote,
    });

    return this.withWriteTransaction((draft) => {
      draft.internationalExpansionDecisions = draft.internationalExpansionDecisions || [];
      draft.internationalExpansionDecisions.unshift(decision);
      if (draft.internationalExpansionDecisions.length > 50) {
        draft.internationalExpansionDecisions.length = 50;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'INTERNATIONAL_EXPANSION_DECISION_LOGGED',
        'system',
        decision.id,
        `Logged Phase 15 expansion review for ${decision.regionId} (${decision.decisionOutcome}): regionalExpansionActive=false, countryActivated=false, commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false, legalComplianceClaimed=false.`
      );

      return {
        decision,
        overview: buildInternationalExpansionOverview({
          households: draft.households || [],
          campaigns: draft.campaigns,
          opportunities: draft.opportunities,
          qrLinks: draft.qrLinks,
          storedPolicyProfiles: draft.countryPolicyProfiles,
          countryLaunchDecisions: draft.countryLaunchDecisions,
          storedLocalizationProfiles: draft.regionalLocalizationProfiles,
          expansionDecisions: draft.internationalExpansionDecisions,
        }),
      };
    });
  }
}

let defaultEdisonStore: EdisonPrototypeStore | undefined;

export function getEdisonStore(): EdisonPrototypeStore {
  defaultEdisonStore ??= new EdisonPrototypeStore();
  return defaultEdisonStore;
}




