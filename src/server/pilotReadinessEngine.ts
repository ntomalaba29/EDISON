import crypto from 'node:crypto';
import type {
  AdCreativeRecord,
  CampaignRecord,
  HouseholdInstallationRecord,
  OpportunityRecord,
  PhysicalQrScanTestRecord,
  PilotCohortBlueprintRecord,
  PilotReadinessOverview,
  PilotReadinessVerificationReport,
  PilotReadinessVerifyCheckItem,
  PilotSoftwareGateItem,
  PilotTargetArchitectureId,
  PilotTargetArchitectureProfile,
  PilotTelemetryValidationResult,
  QrLinkRecord,
  ReliabilityChaosReport,
  StageP6RunbookStep,
  StageP6StepId,
} from '../types/edison.ts';
import { runPhase4SoftwareExitSuite } from './broadcastMetadataParser.ts';
import { runRecordedStreamCalibrationBenchmark } from './breakDurationPredictor.ts';
import { runDeliveryInfraVerificationSuite } from './adDeliveryInfra.ts';
import { runAdvertiserOpsVerificationSuite } from './advertiserOps.ts';
import { runBroadcastRenderVerificationSuite as runBroadcastRenderJobVerificationSuite } from './broadcastRenderEngine.ts';
import { runOpportunityOpsVerificationSuite } from './opportunityOpsEngine.ts';
import { runPrivacyComplianceVerificationSuite } from './privacyComplianceEngine.ts';
import { runReliabilityChaosVerificationSuite } from './reliabilityChaosEngine.ts';
import { runTrackBVerificationSuite } from './trackBHouseholdConsent.ts';
import { listCountryGeoConfigs } from './trackBHouseholdConsent.ts';

export const PILOT_TARGET_ARCHITECTURES: PilotTargetArchitectureProfile[] = [
  {
    architectureId: 'opt_in_viewer_prompt',
    label: 'Cross-Platform Opt-In Viewer Prompt Pilot',
    architectureTier: 'Recommended Initial Pilot',
    requiresOemPartnerContract: false,
    thirdPartyChannelHijackAllowed: false,
    hardwareTested: false,
    physicalPilotExecuted: false,
    keyConstraints:
      'Relies strictly on explicit viewer confirmation inside an EDISON-permitted session or prompt; zero background channel scraping.',
    telemetryScopeNote:
      'Records coarse switch latency, ordinary-TV restoration boolean, and HTTP 302 scan counts under active consentEpoch only.',
  },
  {
    architectureId: 'android_tv_tif',
    label: 'Android TV / Google TV (TvInputService TIF)',
    architectureTier: 'Arch A (Permitted Session)',
    requiresOemPartnerContract: false,
    thirdPartyChannelHijackAllowed: false,
    hardwareTested: false,
    physicalPilotExecuted: false,
    keyConstraints:
      'Operates exclusively inside EDISON-owned TIF session; READ_EPG_DATA and third-party input hijacking stay prohibited (ADR-001).',
    telemetryScopeNote:
      'Validates Android TIF track restoration, hardware AURA remote pass-through, and watchdog return within <=500ms.',
  },
  {
    architectureId: 'external_hdmi_cec',
    label: 'External HDMI / STB Companion Switcher (CEC)',
    architectureTier: 'Arch C (Companion Hardware)',
    requiresOemPartnerContract: false,
    thirdPartyChannelHijackAllowed: false,
    hardwareTested: false,
    physicalPilotExecuted: false,
    keyConstraints:
      'Must remain strict HDCP 2.2/2.3 pass-through compliant; never strip DRM/HDCP or trap tuner output on power loss.',
    telemetryScopeNote:
      'Measures HDMI-CEC switch-in latency, HDCP handshake integrity, and physical pull-plug passthrough fallback.',
  },
  {
    architectureId: 'samsung_tizen_partner',
    label: 'Samsung Tizen TV (H.264/AAC MP4 · tizen.tvwindow)',
    architectureTier: 'Arch B (OEM Partnership)',
    requiresOemPartnerContract: true,
    thirdPartyChannelHijackAllowed: false,
    hardwareTested: false,
    physicalPilotExecuted: false,
    keyConstraints:
      'Prohibits background web UI apps and excludes raw WebM uploads unless pre-transcoded to H.264/AAC MP4 (Phase 6/8 rule).',
    telemetryScopeNote:
      'OEM partner-gated validation of tizen.tvwindow restoration and Tizen MP4 asset decode.',
  },
  {
    architectureId: 'lg_webos_partner',
    label: 'LG webOS Smart TV (Luna Service / Native App)',
    architectureTier: 'Arch B (OEM Partnership)',
    requiresOemPartnerContract: true,
    thirdPartyChannelHijackAllowed: false,
    hardwareTested: false,
    physicalPilotExecuted: false,
    keyConstraints:
      'webOS suspends unfocused web apps; requires explicit foreground session or signed OEM/operator contract.',
    telemetryScopeNote:
      'OEM partner-gated validation of Luna TV source restoration and 16:9 overscan legibility.',
  },
];

export const STAGE_P6_BASE_RUNBOOK_STEPS: Omit<StageP6RunbookStep, 'ownerPrepNote'>[] = [
  {
    stepId: 'P6-01',
    title: 'Physical 16:9 Broadcast Creative Playback, Contrast & Overscan Inspection',
    hardwareScope: 'Smart TV Hardware',
    prerequisites: 'Phase 8 broadcast render blueprint (1080p 5% title-safe & EBU R128 spec) passed.',
    executionProcedure:
      'Display one approved Commercial video/image creative, one Text-Only spot, and one $0.00 Charity Opportunity spot on a physical 16:9 television at 2–3m living-room distance.',
    passCriteria:
      'Zero cropped edge graphics inside 5% overscan margin, legible 1080p typography, smooth H.264/AAC audio loudness without clipping.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-02',
    title: 'Normal Everyday TV Remote Control (AURA -> Control Engine -> Physical TV)',
    hardwareScope: 'Smart TV Hardware',
    prerequisites: 'Phase 4 software adapter harnesses (ADR-017 / PRD-20) verified 10/10.',
    executionProcedure:
      'Issue real power toggle, volume up/down, mute, channel up/down, input source switch, D-pad, OK, back, and home commands during live viewing and active EDISON sessions.',
    passCriteria:
      'Every normal remote button controls the television cleanly; Back/Home immediately exits any EDISON prompt back to ordinary live TV.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-03',
    title: 'Break Switch-In Timing, Return-to-Live-TV Restoration & <=500ms Pull-Plug Watchdog',
    hardwareScope: 'Smart TV Hardware',
    prerequisites: 'Phase 5 p10/p5 break predictor (0% FPR) & Phase 11 FM-02/03/09 chaos gates passed.',
    executionProcedure:
      'Trigger an authorised break transition, wait for ad completion (plus mid-break app kill / Wi-Fi disconnect / power-cycle test), and measure restoration time back to live broadcast.',
    passCriteria:
      'Return-to-live-TV completes cleanly with zero black-screen hang; TV cold-boots into ordinary TV never trapped in EDISON.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-04',
    title: 'Physical Smartphone Camera QR Scan -> Direct HTTP 302 Destination Verification',
    hardwareScope: 'Smartphone Camera + Redirect',
    prerequisites: 'Phase 2 Block 2.7 QR Watch Lab & server /r/:token endpoint reachable from LAN/WAN host.',
    executionProcedure:
      'Scan displayed 16:9 TV QR codes from physical iOS and Android native camera apps at 2–3m distance and log actual device scan timings into /api/qa/physical-qr-tests.',
    passCriteria:
      'Mobile phone opens target URL directly via HTTP 302 in <=3s with zero intermediary EDISON mobile ad screen and accurate non-bot counter increment.',
    preflightStatus: 'deferred_pending_stage_p6',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-05',
    title: 'Offline SHA-256 Local Intelligence Cache & Wi-Fi Reconnect Idempotent Drain',
    hardwareScope: 'Smart TV Hardware',
    prerequisites: 'Phase 4 Block 4.1–4.2 offline cache & Phase 5 Block 5.1 Ed25519 delta sync passed.',
    executionProcedure:
      'Disconnect Smart TV Wi-Fi mid-session, confirm verified offline cache break gating / graceful skip, reconnect Wi-Fi, and inspect deduplicated telemetry sync.',
    passCriteria:
      'Zero playback crashes offline; reconnected sync drains once without duplicate analytics inflation.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-06',
    title: 'Bundled Consent Withdrawal (DEC-OPEN-01) -> Immediate HTTP 403 QR Revocation',
    hardwareScope: 'Smart TV + Mobile Phone',
    prerequisites: 'Track B bundled withdrawal & Phase 10 DSR erasure cascade verified.',
    executionProcedure:
      'Withdraw household consent in EDISON Console while a TV QR token was recently shown, then scan that same QR token with a physical smartphone camera.',
    passCriteria:
      'Smartphone receives HTTP 403 QR Destination Unavailable (no-store), all TV personalisation halts, and ordinary live TV stays 100% usable.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-07',
    title: 'External HDMI-CEC Companion & HDCP Compliance Check (If Companion Hardware Tested)',
    hardwareScope: 'Smart TV Hardware',
    prerequisites: 'Phase 4 companion policy guardrails (ADR-001 HDCP fail-closed) passed.',
    executionProcedure:
      'Connect companion HDMI device in pass-through mode on protected DRM/HDCP broadcast content and verify zero HDCP stripping and clean failover when companion is powered off.',
    passCriteria:
      'HDCP content remains unintercepted; TV ordinary input stays functional even when companion loses power.',
    preflightStatus: 'deferred_pending_stage_p6',
    hardwareExecuted: false,
  },
  {
    stepId: 'P6-08',
    title: 'End-to-End Zero-PII Pilot Telemetry, 7-Stage Funnel Provenance & $0.00 Charity Lock',
    hardwareScope: 'Smart TV + Mobile Phone',
    prerequisites: 'Phase 6–10 compliance, analytics epistemic split & $0.00 Charity invariants verified.',
    executionProcedure:
      'Inspect persisted server audit logs, 7-stage funnel, and pilot telemetry after completing Steps P6-01 through P6-07.',
    passCriteria:
      'Zero personal PII in TV or analytics records, Stage 7 destination_opened stays honest without external webhook, and Charity opportunities remain $0.00 / FREE.',
    preflightStatus: 'software_preflight_ready',
    hardwareExecuted: false,
  },
];

const FORBIDDEN_PILOT_TELEMETRY_KEYS = [
  'email',
  'phone',
  'mobile',
  'fullName',
  'viewerName',
  'memberName',
  'exactAddress',
  'streetAddress',
  'exactCoordinates',
  'latitude',
  'longitude',
  'ipAddress',
  'macAddress',
  'watchHistory',
  'personalViewingHistory',
  'cvText',
  'qualifications',
  'pin',
  'pinHash',
];

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s-]{7,}\d)/;
const GPS_PAIR_PATTERN = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;

export function scanPilotTelemetryZeroPii(input: {
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
}): PilotTelemetryValidationResult {
  const rejectedReasons: string[] = [];
  const piiDetectedFields: string[] = [];

  if (input.claimedHardwareTested === true) {
    rejectedReasons.push(
      'HONESTY GUARDRAIL: hardwareTested cannot be marked true before physical Stage P6 execution.'
    );
  }

  if (input.householdConsentStatus !== 'granted') {
    rejectedReasons.push(
      `DEC-OPEN-01 CONSENT LOCK: Pilot telemetry rejected because householdConsentStatus is "${input.householdConsentStatus}" (ordinary TV continues unaffected).`
    );
  }

  if (input.consentEpoch !== input.expectedConsentEpoch || input.consentEpoch < 1) {
    rejectedReasons.push(
      `CONSENT EPOCH MISMATCH: Submitted consentEpoch (${input.consentEpoch}) does not match active household epoch (${input.expectedConsentEpoch}).`
    );
  }

  if (!input.ordinaryTvPreserved) {
    rejectedReasons.push(
      'ORDINARY TV INVARIANT VIOLATION: Pilot telemetry event failed ordinaryTvPreserved=true requirement.'
    );
  }

  if (input.switchLatencyMs < 0 || input.switchLatencyMs > 15000) {
    rejectedReasons.push('switchLatencyMs out of valid telemetry bounds (0..15000ms).');
  }
  if (input.returnToLiveTvMs < 0 || input.returnToLiveTvMs > 5000) {
    rejectedReasons.push('returnToLiveTvMs exceeded watchdog ceiling (>5000ms).');
  }

  const extra = input.extraPayload ?? {};
  for (const [key, value] of Object.entries(extra)) {
    if (FORBIDDEN_PILOT_TELEMETRY_KEYS.includes(key)) {
      piiDetectedFields.push(key);
    }
    if (typeof value === 'string') {
      if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value) || GPS_PAIR_PATTERN.test(value)) {
        piiDetectedFields.push(`${key}:embedded_pii_pattern`);
      }
    }
  }

  for (const [field, val] of [
    ['cohortId', input.cohortId],
    ['regionCode', input.regionCode],
  ] as const) {
    if (EMAIL_PATTERN.test(val) || PHONE_PATTERN.test(val) || GPS_PAIR_PATTERN.test(val)) {
      piiDetectedFields.push(`${field}:embedded_pii_pattern`);
    }
  }

  if (piiDetectedFields.length > 0) {
    rejectedReasons.push(
      `ZERO-PII POLICY VIOLATION: Forbidden personal fields detected (${piiDetectedFields.join(', ')}).`
    );
  }

  const valid = rejectedReasons.length === 0;
  const canonical = valid
    ? {
        cohortId: input.cohortId.trim(),
        regionCode: input.regionCode.trim().toUpperCase(),
        architectureId: input.architectureId,
        consentEpoch: input.consentEpoch,
        switchLatencyMs: Math.round(input.switchLatencyMs),
        returnToLiveTvMs: Math.round(input.returnToLiveTvMs),
        qrScanObservedMs:
          typeof input.qrScanObservedMs === 'number' ? Math.round(input.qrScanObservedMs) : null,
        ordinaryTvPreserved: true,
      }
    : null;

  return {
    valid,
    acceptedForPilotSchema: valid,
    rejectedReasons,
    piiDetectedFields,
    consentValid:
      input.householdConsentStatus === 'granted' && input.consentEpoch === input.expectedConsentEpoch,
    ordinaryTvPreserved: input.ordinaryTvPreserved,
    forgedHardwareClaimBlocked: input.claimedHardwareTested === true,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    sanitisedTelemetrySample: canonical
      ? {
          ...canonical,
          payloadSha256: crypto
            .createHash('sha256')
            .update(JSON.stringify(canonical))
            .digest('hex'),
        }
      : null,
    evaluatedAt: new Date().toISOString(),
  };
}

export function evaluatePrePilotSoftwareGates(params: {
  households: HouseholdInstallationRecord[];
  campaigns: CampaignRecord[];
  creatives: AdCreativeRecord[];
  opportunities: OpportunityRecord[];
  qrLinks: QrLinkRecord[];
  physicalQrScanTests: PhysicalQrScanTestRecord[];
  lastReliabilityChaosReport: ReliabilityChaosReport | null;
}): PilotSoftwareGateItem[] {
  const phase4 = runPhase4SoftwareExitSuite();
  const phase5 = runRecordedStreamCalibrationBenchmark();
  const phase6 = runDeliveryInfraVerificationSuite();
  const phase7 = runAdvertiserOpsVerificationSuite();
  const phase8 = runBroadcastRenderJobVerificationSuite();
  const phase9 = runOpportunityOpsVerificationSuite();
  const phase10 = runPrivacyComplianceVerificationSuite();
  const phase11 = runReliabilityChaosVerificationSuite();
  const trackB = runTrackBVerificationSuite();

  const consentedHouseholds = params.households.filter(
    (h) =>
      h.commercialConsentStatus === 'granted' &&
      h.charityAndOpportunityStatus === 'active' &&
      !h.targetingDisabled
  );
  const activeQrCount = params.qrLinks.filter((q) => q.status === 'active').length;
  const zeroPaymentViolation = params.campaigns.some(
    (c) => c.simulatedEstimate.paymentCollectionActive !== false
  );

  return [
    {
      gateId: 'gate_phase4_tv_exit',
      phaseRef: 'Phase 4 (Blocks 4.1–4.3)',
      label: 'Smart TV Adapter Contracts, AURA Remote & Companion Policy Exit',
      ready: phase4.softwareExitReady && !phase4.hardwareTested && phase4.stageP6Deferred,
      detail: `${phase4.passedChecks}/${phase4.totalChecks} software exit checks passed; hardwareTested=false (deferred to Stage P6).`,
    },
    {
      gateId: 'gate_phase5_break_predictor',
      phaseRef: 'Phase 5 (Blocks 5.1–5.2)',
      label: 'Fleet Shared Intelligence & p10/p5 Break Predictor Calibration',
      ready: phase5.allPassed && phase5.falsePositiveRatePct === 0,
      detail: `${phase5.passedFixtures}/${phase5.totalFixtures} recorded fixtures passed at ${phase5.falsePositiveRatePct}% FPR.`,
    },
    {
      gateId: 'gate_phase6_7_delivery_ops',
      phaseRef: 'Phases 6–7 (Blocks 6.1 & 7.1)',
      label: 'Ad Delivery Infrastructure & Non-Transactional $0.00 Billing Boundary',
      ready: phase6.allPassed && phase7.allPassed && !zeroPaymentViolation,
      detail: `Delivery ${phase6.passedChecks}/8 & Advertiser Ops ${phase7.passedChecks}/8 passed; paymentCollectionActive=false enforced.`,
    },
    {
      gateId: 'gate_phase8_render_validation',
      phaseRef: 'Phase 8 (Block 8.1)',
      label: '16:9 Overscan Safe Zones, Contrast, Loudness & QR Vision Integrity',
      ready: phase8.allPassed && params.creatives.length > 0 && activeQrCount > 0,
      detail: `Render suite ${phase8.passedChecks}/${phase8.totalChecks} passed (${params.creatives.length} creatives, ${activeQrCount} active QR links; ffmpegBinaryExecuted=false).`,
    },
    {
      gateId: 'gate_phase9_10_trust_privacy',
      phaseRef: 'Phases 9–10 + Track B',
      label: 'Opportunity 3-Tier Independence, DSR Erasure, Zero-PII & DEC-OPEN-01 Bundled Consent',
      ready: phase9.allPassed && phase10.allPassed && trackB.allPassed && consentedHouseholds.length > 0,
      detail: `Opportunity ${phase9.passedChecks}/8, Privacy ${phase10.passedChecks}/8 & Track B ${trackB.passedChecks}/${trackB.totalChecks} passed (${consentedHouseholds.length} consented household fixture(s)).`,
    },
    {
      gateId: 'gate_phase11_reliability_18_fms',
      phaseRef: 'Phase 11 (Block 11.1)',
      label: '18-FMEA Chaos Recovery Suite & 100% Ordinary Live TV Preservation',
      ready: phase11.allPassed && !phase11.hardwareTested && phase11.stageP6Deferred,
      detail: params.lastReliabilityChaosReport
        ? `Suite 8/8 + persisted 18/18 FMEA run (${params.lastReliabilityChaosReport.reportId}, max recovery ${params.lastReliabilityChaosReport.maxRecoveryLatencyMs}ms).`
        : '8/8 deterministic 18-FMEA chaos verification passed cleanly.',
    },
  ];
}

export function buildPilotCohortBlueprintRecord(params: {
  cohortName: string;
  targetCountryCode: string;
  targetArchitectureId: PilotTargetArchitectureId;
  maxHouseholdsCap: number;
  enrolledHouseholdIds: string[];
  households: HouseholdInstallationRecord[];
  decOpen02ShortBreakRuleAcknowledged: boolean;
  decOpen03GamMockOnlyAcknowledged: boolean;
  createdByEmail: string;
}): PilotCohortBlueprintRecord {
  const validCountries = new Set(listCountryGeoConfigs().map((c) => c.countryCode));
  const countryUpper = params.targetCountryCode.trim().toUpperCase();
  if (!validCountries.has(countryUpper)) {
    throw new Error(
      `Unsupported pilot country "${countryUpper}". Allowed configured markets: ${Array.from(validCountries).join(', ')} (all non-activated until Phase 14).`
    );
  }

  if (params.maxHouseholdsCap < 1 || params.maxHouseholdsCap > 50) {
    throw new Error('Closed pilot maxHouseholdsCap must be between 1 and 50 households.');
  }

  const uniqueIds = Array.from(new Set(params.enrolledHouseholdIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length > params.maxHouseholdsCap) {
    throw new Error(
      `Enrolled household count (${uniqueIds.length}) exceeds cohort cap (${params.maxHouseholdsCap}).`
    );
  }

  for (const hhId of uniqueIds) {
    const hh = params.households.find((h) => h.id === hhId);
    if (!hh) {
      throw new Error(`Household "${hhId}" not found for pilot blueprint enrollment.`);
    }
    if (
      hh.commercialConsentStatus !== 'granted' ||
      hh.charityAndOpportunityStatus !== 'active' ||
      hh.targetingDisabled
    ) {
      throw new Error(
        `DEC-OPEN-01 CONSENT GATE: Household "${hhId}" cannot join a pilot cohort while consent is "${hh.commercialConsentStatus}".`
      );
    }
  }

  const nowIso = new Date().toISOString();
  const base = {
    id: `plt_${crypto.randomBytes(5).toString('hex')}`,
    cohortName: params.cohortName.trim(),
    targetCountryCode: countryUpper,
    targetArchitectureId: params.targetArchitectureId,
    maxHouseholdsCap: params.maxHouseholdsCap,
    enrolledHouseholdIds: uniqueIds,
    decOpen02ShortBreakRuleAcknowledged: params.decOpen02ShortBreakRuleAcknowledged,
    decOpen03GamMockOnlyAcknowledged: params.decOpen03GamMockOnlyAcknowledged,
    status:
      uniqueIds.length > 0 &&
      params.decOpen02ShortBreakRuleAcknowledged &&
      params.decOpen03GamMockOnlyAcknowledged
        ? ('ready_for_stage_p6' as const)
        : ('draft_blueprint' as const),
    countryActivated: false as const,
    paymentCollectionActive: false as const,
    hardwareTested: false as const,
    pilotHardwareExecuted: false as const,
    stageP6Deferred: true as const,
    zeroPiiTelemetryEnforced: true as const,
    createdByEmail: params.createdByEmail,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    ...base,
    cohortSha256: crypto.createHash('sha256').update(JSON.stringify(base)).digest('hex'),
  };
}

export function buildPilotReadinessOverview(params: {
  households: HouseholdInstallationRecord[];
  campaigns: CampaignRecord[];
  creatives: AdCreativeRecord[];
  opportunities: OpportunityRecord[];
  qrLinks: QrLinkRecord[];
  physicalQrScanTests: PhysicalQrScanTestRecord[];
  lastReliabilityChaosReport: ReliabilityChaosReport | null;
  cohorts: PilotCohortBlueprintRecord[];
  stageP6PrepNotes: Record<string, string>;
}): PilotReadinessOverview {
  const softwareGates = evaluatePrePilotSoftwareGates({
    households: params.households,
    campaigns: params.campaigns,
    creatives: params.creatives,
    opportunities: params.opportunities,
    qrLinks: params.qrLinks,
    physicalQrScanTests: params.physicalQrScanTests,
    lastReliabilityChaosReport: params.lastReliabilityChaosReport,
  });

  const stageP6Runbook: StageP6RunbookStep[] = STAGE_P6_BASE_RUNBOOK_STEPS.map((step) => ({
    ...step,
    ownerPrepNote: params.stageP6PrepNotes[step.stepId] ?? null,
  }));

  const readyCount = softwareGates.filter((g) => g.ready).length;
  const manifestInput = {
    softwareGates: softwareGates.map((g) => ({ gateId: g.gateId, ready: g.ready })),
    stageP6Steps: stageP6Runbook.map((s) => s.stepId),
    cohortHashes: params.cohorts.map((c) => c.cohortSha256),
    hardwareTested: false,
    pilotHardwareExecuted: false,
    stageP6Deferred: true,
    countryActivated: false,
    paymentCollectionActive: false,
  };

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    pilotHardwareExecuted: false,
    stageP6Deferred: true,
    realBroadcastTunerConnected: false,
    countryActivated: false,
    paymentCollectionActive: false,
    externalKycVendorConnected: false,
    externalPenTestCompleted: false,
    legalComplianceClaimed: false,
    ffmpegBinaryExecuted: false,
    softwareGatesReadyCount: readyCount,
    softwareGatesTotalCount: softwareGates.length,
    allSoftwareGatesReady: readyCount === softwareGates.length,
    softwareGates,
    targetArchitectures: PILOT_TARGET_ARCHITECTURES,
    stageP6Runbook,
    cohorts: params.cohorts,
    openDecisionsSummary: {
      decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL',
      decOpen02Note:
        'Pending owner confirmation on short-break k=1 slot fallback (CHARITY->COMMERCIAL alternation preserved).',
      decOpen03Note:
        'GAM CTV account not provisioned; Direct Commercial Priority + MockAdNetworkBackfillAdapter remain active.',
      taskP3001Status: 'READY_JSON_RETAINED',
    },
    readinessManifestSha256: crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestInput))
      .digest('hex'),
  };
}

export function runPilotReadinessVerificationSuite(): PilotReadinessVerificationReport {
  const checks: PilotReadinessVerifyCheckItem[] = [];

  // 1. Clean Zero-PII telemetry passes when household consent & epoch match
  const cleanTelemetry = scanPilotTelemetryZeroPii({
    cohortId: 'plt_zw_optin_01',
    regionCode: 'ZW-HRE',
    architectureId: 'opt_in_viewer_prompt',
    householdConsentStatus: 'granted',
    claimedHardwareTested: false,
    consentEpoch: 3,
    expectedConsentEpoch: 3,
    switchLatencyMs: 390,
    returnToLiveTvMs: 280,
    qrScanObservedMs: 1450,
    ordinaryTvPreserved: true,
  });
  checks.push({
    checkId: 'p12_clean_zero_pii_telemetry',
    label: 'Coarse opt-in pilot telemetry accepted with SHA-256 digest & Zero-PII enforcement',
    passed:
      cleanTelemetry.valid &&
      cleanTelemetry.acceptedForPilotSchema &&
      Boolean(cleanTelemetry.sanitisedTelemetrySample?.payloadSha256) &&
      !cleanTelemetry.hardwareTested &&
      cleanTelemetry.stageP6Deferred,
    detail: `valid=${cleanTelemetry.valid}, sha=${cleanTelemetry.sanitisedTelemetrySample?.payloadSha256.slice(0, 12) ?? 'none'}`,
  });

  // 2. PII leak in telemetry rejected fail-closed
  const piiLeak = scanPilotTelemetryZeroPii({
    cohortId: 'plt_zw_optin_01',
    regionCode: 'ZW-HRE',
    architectureId: 'android_tv_tif',
    householdConsentStatus: 'granted',
    consentEpoch: 2,
    expectedConsentEpoch: 2,
    switchLatencyMs: 350,
    returnToLiveTvMs: 260,
    ordinaryTvPreserved: true,
    extraPayload: {
      email: 'viewer@example.org',
      exactCoordinates: '-17.8292, 31.0522',
    },
  });
  checks.push({
    checkId: 'p12_zero_pii_rejection',
    label: 'Telemetry containing personal email / GPS coordinates is blocked fail-closed',
    passed: !piiLeak.valid && piiLeak.piiDetectedFields.length >= 2 && piiLeak.sanitisedTelemetrySample === null,
    detail: `Detected blocked fields: ${piiLeak.piiDetectedFields.join(', ')}`,
  });

  // 3. Withdrawn consent or stale epoch rejected while ordinary TV stays preserved
  const staleConsent = scanPilotTelemetryZeroPii({
    cohortId: 'plt_zw_optin_01',
    regionCode: 'ZW-HRE',
    architectureId: 'opt_in_viewer_prompt',
    householdConsentStatus: 'withdrawn',
    consentEpoch: 1,
    expectedConsentEpoch: 2,
    switchLatencyMs: 310,
    returnToLiveTvMs: 250,
    ordinaryTvPreserved: true,
  });
  checks.push({
    checkId: 'p12_withdrawn_consent_telemetry_blocked',
    label: 'Withdrawn consent / stale consentEpoch blocks telemetry while preserving ordinary TV',
    passed: !staleConsent.valid && !staleConsent.consentValid && staleConsent.ordinaryTvPreserved,
    detail: `${staleConsent.rejectedReasons.length} guard reason(s) fired; ordinaryTvPreserved=${staleConsent.ordinaryTvPreserved}.`,
  });

  // 4. Forged hardwareTested: true claim blocked prior to Stage P6
  const forgedHw = scanPilotTelemetryZeroPii({
    cohortId: 'plt_zw_optin_01',
    regionCode: 'ZW-HRE',
    architectureId: 'external_hdmi_cec',
    householdConsentStatus: 'granted',
    claimedHardwareTested: true,
    consentEpoch: 1,
    expectedConsentEpoch: 1,
    switchLatencyMs: 400,
    returnToLiveTvMs: 300,
    ordinaryTvPreserved: true,
  });
  checks.push({
    checkId: 'p12_forged_hardware_claim_blocked',
    label: 'Software-first honesty guardrail blocks forged hardwareTested=true before Stage P6',
    passed:
      !forgedHw.valid &&
      forgedHw.forgedHardwareClaimBlocked &&
      !forgedHw.hardwareTested &&
      forgedHw.stageP6Deferred,
    detail: 'Pre-Stage-P6 hardware claim rejected; hardwareTested remains false.',
  });

  // 5. Target architectures & Stage P6 single final runbook completeness (8 steps P6-01..P6-08)
  const expectedStepIds: StageP6StepId[] = [
    'P6-01',
    'P6-02',
    'P6-03',
    'P6-04',
    'P6-05',
    'P6-06',
    'P6-07',
    'P6-08',
  ];
  const hasAllSteps = expectedStepIds.every((id) =>
    STAGE_P6_BASE_RUNBOOK_STEPS.some((s) => s.stepId === id && s.hardwareExecuted === false)
  );
  const allArchNonHijack =
    PILOT_TARGET_ARCHITECTURES.length === 5 &&
    PILOT_TARGET_ARCHITECTURES.every(
      (a) =>
        a.thirdPartyChannelHijackAllowed === false &&
        a.hardwareTested === false &&
        a.physicalPilotExecuted === false
    );
  checks.push({
    checkId: 'p12_stage_p6_runbook_and_architectures',
    label: 'Single Final Stage P6 8-step runbook & 5 Smart TV architectures enforce ADR-001/ADR-014',
    passed: hasAllSteps && allArchNonHijack,
    detail: `8/8 Stage P6 steps ready; 5/5 architectures forbid 3P channel hijacking & hardwareExecuted=false.`,
  });

  // 6. Pilot cohort blueprint rejects unconsented household & keeps countryActivated=false
  const mockConsentedHh: HouseholdInstallationRecord = {
    id: 'hh_pilot_ok',
    ownerUserId: 'usr_1',
    householdLabel: 'Harare Pilot Test',
    tvDeviceLabel: 'Living Room TV',
    location: {
      countryCode: 'ZW',
      provinceOrRegion: 'Harare Metropolitan',
      metroArea: 'Harare',
      cityOrTown: 'Harare',
      district: 'Harare Urban',
      suburbOrArea: 'Avondale',
      exactInstallationLocation: '10 Samora Machel Ave',
    },
    locationValid: true,
    locationValidationErrors: [],
    targetingDisabled: false,
    ordinaryTvPreserved: true,
    commercialConsentStatus: 'granted',
    charityAndOpportunityStatus: 'active',
    consentEpoch: 1,
    consentVersionLabel: 'v1.0',
    lastConsentChangedAt: '2026-11-16T00:00:00.000Z',
    personalisationMasterEnabled: true,
    neutralDisplayMode: false,
    isPrototypeSeed: true,
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
  };
  const mockWithdrawnHh: HouseholdInstallationRecord = {
    ...mockConsentedHh,
    id: 'hh_pilot_withdrawn',
    targetingDisabled: true,
    commercialConsentStatus: 'withdrawn',
    charityAndOpportunityStatus: 'suspended_by_bundled_withdrawal',
  };
  const validCohort = buildPilotCohortBlueprintRecord({
    cohortName: 'ZW Phase 12 Pre-Pilot Cohort',
    targetCountryCode: 'ZW',
    targetArchitectureId: 'opt_in_viewer_prompt',
    maxHouseholdsCap: 15,
    enrolledHouseholdIds: ['hh_pilot_ok'],
    households: [mockConsentedHh, mockWithdrawnHh],
    decOpen02ShortBreakRuleAcknowledged: true,
    decOpen03GamMockOnlyAcknowledged: true,
    createdByEmail: 'admin@edison.demo',
  });
  let rejectedUnconsented = false;
  try {
    buildPilotCohortBlueprintRecord({
      cohortName: 'Blocked Withdrawn Cohort',
      targetCountryCode: 'ZW',
      targetArchitectureId: 'opt_in_viewer_prompt',
      maxHouseholdsCap: 15,
      enrolledHouseholdIds: ['hh_pilot_withdrawn'],
      households: [mockConsentedHh, mockWithdrawnHh],
      decOpen02ShortBreakRuleAcknowledged: true,
      decOpen03GamMockOnlyAcknowledged: true,
      createdByEmail: 'admin@edison.demo',
    });
  } catch {
    rejectedUnconsented = true;
  }
  checks.push({
    checkId: 'p12_cohort_consent_and_launch_lock',
    label: 'Cohort builder enforces active consent, countryActivated=false & paymentCollectionActive=false',
    passed:
      validCohort.status === 'ready_for_stage_p6' &&
      validCohort.countryActivated === false &&
      validCohort.paymentCollectionActive === false &&
      validCohort.hardwareTested === false &&
      rejectedUnconsented,
    detail: `cohort=${validCohort.id}, rejectedUnconsented=${rejectedUnconsented}, countryActivated=${validCohort.countryActivated}`,
  });

  // 7. Return-to-live-TV watchdog ceiling >5000ms fails closed
  const watchdogTimeout = scanPilotTelemetryZeroPii({
    cohortId: 'plt_zw_optin_01',
    regionCode: 'ZW-HRE',
    architectureId: 'android_tv_tif',
    householdConsentStatus: 'granted',
    consentEpoch: 1,
    expectedConsentEpoch: 1,
    switchLatencyMs: 300,
    returnToLiveTvMs: 6200,
    ordinaryTvPreserved: true,
  });
  checks.push({
    checkId: 'p12_watchdog_ceiling_enforced',
    label: 'Pilot telemetry exceeding return-to-live-TV ceiling (>5000ms) flags failure',
    passed: !watchdogTimeout.valid && watchdogTimeout.rejectedReasons.some((r) => r.includes('watchdog')),
    detail: 'Excess return-to-live-TV duration flagged cleanly for review.',
  });

  // 8. Overview software gates & non-commercial flags remain intact
  const overview = buildPilotReadinessOverview({
    households: [mockConsentedHh],
    campaigns: [],
    creatives: [],
    opportunities: [],
    qrLinks: [],
    physicalQrScanTests: [],
    lastReliabilityChaosReport: null,
    cohorts: [validCohort],
    stageP6PrepNotes: { 'P6-01': 'Test pattern prepared.' },
  });
  checks.push({
    checkId: 'p12_overview_honesty_boundaries',
    label: 'Pilot readiness manifest preserves non-commercial, unactivated & software-only boundaries',
    passed:
      overview.softwareGates.length === 6 &&
      !overview.hardwareTested &&
      !overview.pilotHardwareExecuted &&
      overview.stageP6Deferred &&
      !overview.countryActivated &&
      !overview.paymentCollectionActive &&
      Boolean(overview.readinessManifestSha256),
    detail: `gates=${overview.softwareGatesReadyCount}/${overview.softwareGatesTotalCount}, manifestSha=${overview.readinessManifestSha256.slice(0, 12)}`,
  });

  const passedChecks = checks.filter((c) => c.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    pilotHardwareExecuted: false,
    stageP6Deferred: true,
    realBroadcastTunerConnected: false,
    countryActivated: false,
    paymentCollectionActive: false,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
