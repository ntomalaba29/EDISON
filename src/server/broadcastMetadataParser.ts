import { edisonTvControlEngine } from './tvPlatformAdapter.ts';
import type {
  BroadcastCueParseRequest,
  BroadcastCueParseResult,
  CompanionPolicyEvalRequest,
  CompanionPolicyEvalResult,
  Phase4SoftwareExitCheckItem,
  Phase4SoftwareExitReport,
} from '../types/edison.ts';

const DEFAULT_SWITCHING_OVERHEAD_SEC = 2;
const MIN_AV_CONFIDENCE_THRESHOLD = 0.85;
const MIN_BLACK_FRAME_MS = 250;
const MAX_SILENCE_RMS_DB = -45;

export function parseAndValidateBroadcastCue(
  input: BroadcastCueParseRequest
): BroadcastCueParseResult {
  const safetyBuffer = input.safetyBufferSeconds ?? 5;
  const requiredWindowSec = input.adDurationSeconds + DEFAULT_SWITCHING_OVERHEAD_SEC + safetyBuffer;
  const parsedAt = new Date().toISOString();

  // Fail closed immediately on DRM / HDCP protected broadcast frames
  if (input.drmProtected) {
    return {
      ok: true,
      validCue: false,
      safeToTriggerBreak: false,
      action: 'SKIP_FAIL_CLOSED',
      standard: input.standard,
      channelNumber: input.channelNumber,
      effectiveWindowSec: 0,
      requiredWindowSec,
      confidenceScore: 0,
      reason:
        'DRM/HDCP-protected stream marker encountered — skipped fail-closed per ADR-001 (zero DRM/HDCP bypass).',
      normalizedCue: {
        standard: input.standard,
        channelNumber: input.channelNumber,
        drmProtected: true,
      },
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      parsedAt,
    };
  }

  if (input.standard === 'scte35_splice_insert') {
    const spliceEventId = input.spliceEventId ?? 1001;
    const outOfNetwork = input.outOfNetworkIndicator ?? true;
    const autoReturn = input.autoReturn ?? true;
    const ptsTimeTicks = input.ptsTimeTicks ?? 900000;

    if (!outOfNetwork) {
      return {
        ok: true,
        validCue: true,
        safeToTriggerBreak: false,
        action: 'RETURN_TO_PROGRAM',
        standard: input.standard,
        channelNumber: input.channelNumber,
        effectiveWindowSec: input.breakDurationSec,
        requiredWindowSec,
        confidenceScore: 1,
        reason: `SCTE-35 splice_insert #${spliceEventId} has outOfNetworkIndicator=false — signals return to ordinary live programming.`,
        normalizedCue: {
          spliceEventId,
          outOfNetworkIndicator: false,
          autoReturn,
          ptsTimeTicks,
        },
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        parsedAt,
      };
    }

    const sufficient = input.breakDurationSec >= requiredWindowSec;
    return {
      ok: true,
      validCue: true,
      safeToTriggerBreak: sufficient,
      action: sufficient ? 'TRIGGER_EDISON_AD_SLOT' : 'SKIP_FAIL_CLOSED',
      standard: input.standard,
      channelNumber: input.channelNumber,
      effectiveWindowSec: input.breakDurationSec,
      requiredWindowSec,
      confidenceScore: 0.99,
      reason: sufficient
        ? `Valid SCTE-35 splice_insert #${spliceEventId} (${input.breakDurationSec}s >= ${requiredWindowSec}s required incl. switch & safety buffer).`
        : `SCTE-35 splice_insert #${spliceEventId} skipped fail-closed: ${input.breakDurationSec}s window < ${requiredWindowSec}s required.`,
      normalizedCue: {
        spliceEventId,
        outOfNetworkIndicator: true,
        autoReturn,
        ptsTimeTicks,
        breakDurationSec: input.breakDurationSec,
      },
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      parsedAt,
    };
  }

  if (input.standard === 'hbbtv_ait_dsmcc') {
    const orgId = input.orgId ?? 65537;
    const applicationId = input.applicationId ?? 101;
    const controlCode = input.controlCode ?? 'AUTOSTART';
    const ownSessionOnly = input.ownSessionOnly ?? true;

    if (!ownSessionOnly) {
      return {
        ok: true,
        validCue: false,
        safeToTriggerBreak: false,
        action: 'SKIP_FAIL_CLOSED',
        standard: input.standard,
        channelNumber: input.channelNumber,
        effectiveWindowSec: 0,
        requiredWindowSec,
        confidenceScore: 0,
        reason:
          'Rejected HbbTV AIT cue targeting external third-party broadcaster stream (ownSessionOnly=false violates ADR-001).',
        normalizedCue: {
          orgId,
          applicationId,
          controlCode,
          ownSessionOnly: false,
        },
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        parsedAt,
      };
    }

    if (controlCode === 'KILL') {
      return {
        ok: true,
        validCue: true,
        safeToTriggerBreak: false,
        action: 'RETURN_TO_PROGRAM',
        standard: input.standard,
        channelNumber: input.channelNumber,
        effectiveWindowSec: input.breakDurationSec,
        requiredWindowSec,
        confidenceScore: 0.98,
        reason: `HbbTV AIT controlCode=KILL for app ${orgId}:${applicationId} — terminating ad overlay cleanly to ordinary broadcast.`,
        normalizedCue: { orgId, applicationId, controlCode, ownSessionOnly: true },
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        parsedAt,
      };
    }

    const sufficient = input.breakDurationSec >= requiredWindowSec;
    return {
      ok: true,
      validCue: true,
      safeToTriggerBreak: sufficient,
      action: sufficient ? 'TRIGGER_EDISON_AD_SLOT' : 'SKIP_FAIL_CLOSED',
      standard: input.standard,
      channelNumber: input.channelNumber,
      effectiveWindowSec: input.breakDurationSec,
      requiredWindowSec,
      confidenceScore: 0.95,
      reason: sufficient
        ? `Valid HbbTV AIT/DSM-CC cue (org=${orgId}, app=${applicationId}, ${input.breakDurationSec}s >= ${requiredWindowSec}s).`
        : `HbbTV AIT cue skipped fail-closed: ${input.breakDurationSec}s < ${requiredWindowSec}s required.`,
      normalizedCue: {
        orgId,
        applicationId,
        controlCode,
        ownSessionOnly: true,
        breakDurationSec: input.breakDurationSec,
      },
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      parsedAt,
    };
  }

  // av_cadence_marker
  const blackFrameDurationMs = input.blackFrameDurationMs ?? 350;
  const audioSilenceRmsDb = input.audioSilenceRmsDb ?? -52;
  const confidenceScore = input.confidenceScore ?? 0.9;
  const meetsAcousticAndFrameGate =
    blackFrameDurationMs >= MIN_BLACK_FRAME_MS &&
    audioSilenceRmsDb <= MAX_SILENCE_RMS_DB &&
    confidenceScore >= MIN_AV_CONFIDENCE_THRESHOLD;
  const sufficient = meetsAcousticAndFrameGate && input.breakDurationSec >= requiredWindowSec;

  return {
    ok: true,
    validCue: meetsAcousticAndFrameGate,
    safeToTriggerBreak: sufficient,
    action: sufficient ? 'TRIGGER_EDISON_AD_SLOT' : 'SKIP_FAIL_CLOSED',
    standard: input.standard,
    channelNumber: input.channelNumber,
    effectiveWindowSec: input.breakDurationSec,
    requiredWindowSec,
    confidenceScore,
    reason: sufficient
      ? `Lawful AV cadence fixture verified (black=${blackFrameDurationMs}ms, silence=${audioSilenceRmsDb}dBFS, confidence=${confidenceScore.toFixed(2)}).`
      : `Uncertain or insufficient AV cadence fixture skipped fail-closed (confidence=${confidenceScore.toFixed(2)}, black=${blackFrameDurationMs}ms, silence=${audioSilenceRmsDb}dBFS, duration=${input.breakDurationSec}s/${requiredWindowSec}s) — ordinary TV uninterrupted.`,
    normalizedCue: {
      blackFrameDurationMs,
      audioSilenceRmsDb,
      confidenceScore,
      breakDurationSec: input.breakDurationSec,
    },
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    parsedAt,
  };
}

export function evaluateCompanionPolicyGuardrail(
  input: CompanionPolicyEvalRequest
): CompanionPolicyEvalResult {
  const evaluatedAt = new Date().toISOString();
  const deny = (violatedPolicy: string, reason: string): CompanionPolicyEvalResult => ({
    allowed: false,
    decision: 'DENY_FAIL_CLOSED',
    platformId: input.platformId,
    executionContext: input.executionContext,
    requestedCapability: input.requestedCapability,
    violatedPolicy,
    reason,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    evaluatedAt,
  });

  if (input.requestedCapability === 'bypass_hdcp' || input.drmHdcpActive) {
    return deny(
      'ADR-001 / DRM-HDCP Compliance',
      'Denied fail-closed: EDISON strictly prohibits bypassing DRM/HDCP or rendering overlays over active HDCP-protected streams.'
    );
  }

  if (input.requestedCapability === 'background_screen_scrape') {
    return deny(
      'ADR-001 / Smart TV Store Policy',
      'Denied fail-closed: continuous background tuner scraping or screen capture violates Android TV / Tizen / webOS store rules.'
    );
  }

  if (input.requestedCapability === 'monitor_epg_global' && !input.hasPartnerPrivilege) {
    return deny(
      'Android READ_EPG_DATA / OEM Privilege Boundary',
      'Denied fail-closed: global tuner/EPG monitoring requires OEM/operator partner system signature and is unavailable to 3P apps.'
    );
  }

  if (
    input.requestedCapability === 'render_overlay' &&
    input.executionContext !== 'owned_edison_session' &&
    !input.hasPartnerPrivilege
  ) {
    return deny(
      'ADR-001 No Third-Party Broadcaster Hijack',
      `Denied fail-closed: rendering overlays inside "${input.executionContext}" without partner privilege would hijack third-party broadcasts.`
    );
  }

  if (
    input.requestedCapability === 'render_overlay' &&
    input.platformId === 'lg_webos' &&
    !input.hasPartnerPrivilege
  ) {
    return deny(
      'LG webOS Partner Luna Privilege Gate',
      'Denied fail-closed: LG webOS blocks unprivileged third-party own-session broadcast overlays without partner Luna/SSAP privilege.'
    );
  }

  if (input.requestedCapability === 'hdmi_cec_switch' && !input.hasExplicitViewerConsent) {
    return deny(
      'ADR-017 Explicit Viewer Control Boundary',
      'Denied fail-closed: HDMI-CEC companion switching requires explicit viewer opt-in / prompt consent.'
    );
  }

  if (input.requestedCapability === 'inject_remote_key' && input.platformId === 'lg_webos') {
    // Normal conventional controls are allowed inside EDISON AURA controller; privileged source changes fail closed separately
    return {
      allowed: true,
      decision: 'ALLOW_BOUNDED',
      platformId: input.platformId,
      executionContext: input.executionContext,
      requestedCapability: input.requestedCapability,
      violatedPolicy: null,
      reason:
        'Allowed bounded conventional SSAP/LAN remote key dispatch (non-privileged keys only; global input switching stays fail-closed).',
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      evaluatedAt,
    };
  }

  return {
    allowed: true,
    decision: 'ALLOW_BOUNDED',
    platformId: input.platformId,
    executionContext: input.executionContext,
    requestedCapability: input.requestedCapability,
    violatedPolicy: null,
    reason: `Allowed within bounded "${input.executionContext}" capability envelope (hardwareTested=false).`,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    evaluatedAt,
  };
}

export function runPhase4SoftwareExitSuite(): Phase4SoftwareExitReport {
  const checks: Phase4SoftwareExitCheckItem[] = [];

  // 1. SCTE-35 healthy splice insert
  const scteValid = parseAndValidateBroadcastCue({
    standard: 'scte35_splice_insert',
    channelNumber: 101,
    breakDurationSec: 90,
    adDurationSeconds: 20,
    safetyBufferSeconds: 5,
    spliceEventId: 4001,
    outOfNetworkIndicator: true,
    drmProtected: false,
  });
  checks.push({
    checkId: 'EXIT-CUE-SCTE35-VALID',
    category: 'cue_parser',
    label: 'SCTE-35 splice_insert outOfNetwork=true triggers bounded slot cleanly',
    passed: scteValid.validCue && scteValid.safeToTriggerBreak && scteValid.action === 'TRIGGER_EDISON_AD_SLOT',
    detail: scteValid.reason,
  });

  // 2. DRM/HDCP-protected SCTE-35 fails closed
  const scteDrm = parseAndValidateBroadcastCue({
    standard: 'scte35_splice_insert',
    channelNumber: 103,
    breakDurationSec: 90,
    adDurationSeconds: 20,
    drmProtected: true,
  });
  checks.push({
    checkId: 'EXIT-CUE-DRM-FAILCLOSED',
    category: 'cue_parser',
    label: 'DRM/HDCP stream cue skips fail-closed without interruption',
    passed: !scteDrm.validCue && !scteDrm.safeToTriggerBreak && scteDrm.action === 'SKIP_FAIL_CLOSED',
    detail: scteDrm.reason,
  });

  // 3. HbbTV AIT own-session allowed vs external stream hijack denied
  const hbbtvHijack = parseAndValidateBroadcastCue({
    standard: 'hbbtv_ait_dsmcc',
    channelNumber: 201,
    breakDurationSec: 90,
    adDurationSeconds: 20,
    ownSessionOnly: false,
  });
  checks.push({
    checkId: 'EXIT-CUE-HBBTV-NO-HIJACK',
    category: 'cue_parser',
    label: 'HbbTV AIT cue outside own session rejected (ADR-001)',
    passed: !hbbtvHijack.validCue && hbbtvHijack.action === 'SKIP_FAIL_CLOSED',
    detail: hbbtvHijack.reason,
  });

  // 4. Low-confidence AV cadence marker skipped safely
  const avLowConf = parseAndValidateBroadcastCue({
    standard: 'av_cadence_marker',
    channelNumber: 101,
    breakDurationSec: 90,
    adDurationSeconds: 20,
    confidenceScore: 0.62,
  });
  checks.push({
    checkId: 'EXIT-CUE-AV-CONFIDENCE-GATE',
    category: 'cue_parser',
    label: 'Uncertain AV cadence (<0.85 confidence) skipped fail-closed',
    passed: !avLowConf.validCue && avLowConf.action === 'SKIP_FAIL_CLOSED',
    detail: avLowConf.reason,
  });

  // 5. Companion policy denies HDCP bypass unconditionally
  const denyHdcp = evaluateCompanionPolicyGuardrail({
    platformId: 'android_tv_tif',
    executionContext: 'owned_edison_session',
    requestedCapability: 'bypass_hdcp',
    hasPartnerPrivilege: true,
    hasExplicitViewerConsent: true,
    drmHdcpActive: false,
  });
  checks.push({
    checkId: 'EXIT-POL-DENY-HDCP-BYPASS',
    category: 'companion_policy',
    label: 'Companion guardrail unconditionally blocks bypass_hdcp even with partner flag',
    passed: !denyHdcp.allowed && denyHdcp.decision === 'DENY_FAIL_CLOSED',
    detail: denyHdcp.reason,
  });

  // 6. Companion policy blocks 3P broadcaster stream overlay hijack
  const deny3pHijack = evaluateCompanionPolicyGuardrail({
    platformId: 'samsung_tizen',
    executionContext: 'third_party_broadcaster_stream',
    requestedCapability: 'render_overlay',
    hasPartnerPrivilege: false,
    hasExplicitViewerConsent: true,
    drmHdcpActive: false,
  });
  checks.push({
    checkId: 'EXIT-POL-DENY-3P-HIJACK',
    category: 'companion_policy',
    label: 'Companion guardrail blocks unprivileged overlay over 3P broadcaster stream',
    passed: !deny3pHijack.allowed && deny3pHijack.decision === 'DENY_FAIL_CLOSED',
    detail: deny3pHijack.reason,
  });

  // 7. Companion policy blocks unprivileged READ_EPG_DATA global monitor
  const denyGlobalEpg = evaluateCompanionPolicyGuardrail({
    platformId: 'android_tv_tif',
    executionContext: 'system_global_tuner',
    requestedCapability: 'monitor_epg_global',
    hasPartnerPrivilege: false,
    hasExplicitViewerConsent: true,
    drmHdcpActive: false,
  });
  checks.push({
    checkId: 'EXIT-POL-DENY-GLOBAL-EPG',
    category: 'companion_policy',
    label: 'Companion guardrail blocks unprivileged READ_EPG_DATA monitoring',
    passed: !denyGlobalEpg.allowed && denyGlobalEpg.decision === 'DENY_FAIL_CLOSED',
    detail: denyGlobalEpg.reason,
  });

  // 8. Companion policy allows bounded owned-session overlay on TIF
  const allowOwnedOverlay = evaluateCompanionPolicyGuardrail({
    platformId: 'android_tv_tif',
    executionContext: 'owned_edison_session',
    requestedCapability: 'render_overlay',
    hasPartnerPrivilege: false,
    hasExplicitViewerConsent: true,
    drmHdcpActive: false,
  });
  checks.push({
    checkId: 'EXIT-POL-ALLOW-OWNED-TIF',
    category: 'companion_policy',
    label: 'Companion guardrail permits bounded TIF overlay inside owned EDISON session',
    passed: allowOwnedOverlay.allowed && allowOwnedOverlay.decision === 'ALLOW_BOUNDED',
    detail: allowOwnedOverlay.reason,
  });

  // 9. All 16 deterministic adapter fault-recovery cases pass
  const faultSuite = edisonTvControlEngine.runDeterministicFaultSuite();
  checks.push({
    checkId: 'EXIT-FAULT-SUITE-16',
    category: 'fault_recovery',
    label: 'Deterministic 16-case multi-OS watchdog fault suite passes',
    passed: faultSuite.allPassed && faultSuite.passedCases === 16 && !faultSuite.hardwareTested,
    detail: `${faultSuite.passedCases}/${faultSuite.totalCases} fault recovery cases passed (hardwareTested=false).`,
  });

  // 10. All 8 emulator conformance vectors pass
  const conformance = edisonTvControlEngine.runEmulatorConformanceVectors();
  checks.push({
    checkId: 'EXIT-EMULATOR-CONFORMANCE-8',
    category: 'emulator_conformance',
    label: '8-vector software emulator conformance suite passes (Stage P6 deferred)',
    passed:
      conformance.allPassed &&
      conformance.passedVectors === 8 &&
      !conformance.hardwareTested &&
      conformance.stageP6Deferred,
    detail: `${conformance.passedVectors}/${conformance.totalVectors} emulator conformance vectors passed (Stage P6 deferred).`,
  });

  const passedChecks = checks.filter((c) => c.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    softwareExitReady: passedChecks === checks.length,
    passedChecks,
    totalChecks: checks.length,
    faultSuiteSummary: {
      passedCases: faultSuite.passedCases,
      totalCases: faultSuite.totalCases,
      allPassed: faultSuite.allPassed,
    },
    conformanceSummary: {
      passedVectors: conformance.passedVectors,
      totalVectors: conformance.totalVectors,
      allPassed: conformance.allPassed,
    },
    checks,
  };
}
