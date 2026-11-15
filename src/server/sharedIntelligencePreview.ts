import crypto from 'node:crypto';
import type {
  SharedIntelAuditEntry,
  SharedIntelBundleRecord,
  SharedIntelLocalDeviceCache,
  SharedIntelObservationRecord,
  SharedIntelPreviewState,
  SharedIntelScopeKey,
  SharedIntelSignalType,
} from '../types/edison.ts';

export const SHARED_INTEL_QUORUM_REQUIRED = 3;
export const SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT = 2.5;

const FORBIDDEN_PII_FIELDS = new Set([
  'householdId',
  'profileId',
  'userId',
  'viewerName',
  'email',
  'phone',
  'exactLocation',
  'gps',
  'latitude',
  'longitude',
  'viewingHistory',
  'ipAddress',
]);

export const DEFAULT_SHARED_INTEL_SCOPES: SharedIntelScopeKey[] = [
  {
    scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
    country: 'GB',
    broadcaster: 'Freeview',
    channel: 'BBC One HD',
    platform: 'Android TV 14',
    broadcastConfig: 'DVB-T2 + HbbTV',
    displayName: 'GB · Freeview · BBC One HD (Android TV 14 / DVB-T2)',
  },
  {
    scopeId: 'gb_skystream_skysports_tizen7_hls',
    country: 'GB',
    broadcaster: 'Sky Stream',
    channel: 'Sky Sports Main',
    platform: 'Samsung Tizen 7.0',
    broadcastConfig: 'IP-HLS + SCTE-35',
    displayName: 'GB · Sky Stream · Sky Sports Main (Tizen 7.0 / IP-HLS)',
  },
  {
    scopeId: 'de_ard_daserste_webos23_hbbtv',
    country: 'DE',
    broadcaster: 'ARD-ZDF',
    channel: 'Das Erste HD',
    platform: 'LG webOS 23',
    broadcastConfig: 'DVB-C + HbbTV 2.0.3',
    displayName: 'DE · ARD-ZDF · Das Erste HD (LG webOS 23 / HbbTV)',
  },
];

function computeManifestHash(
  scopeId: string,
  version: number,
  p10: number,
  p50: number,
  latencyMs: number
): string {
  return crypto
    .createHash('sha256')
    .update(`${scopeId}:v${version}:p10=${p10}:p50=${p50}:lat=${latencyMs}`)
    .digest('hex')
    .slice(0, 16);
}

export function createInitialSharedIntelPreviewState(): SharedIntelPreviewState {
  const now = '2026-11-15T12:00:00.000Z';

  const bundles: SharedIntelBundleRecord[] = [
    {
      scope: { ...DEFAULT_SHARED_INTEL_SCOPES[0] },
      version: 3,
      previousGoodVersion: 2,
      status: 'corroborated_published',
      corroboratingDeviceIds: ['sim_tv_gb_01', 'sim_tv_gb_02', 'sim_tv_gb_03'],
      pendingObservations: 0,
      quorumRequired: SHARED_INTEL_QUORUM_REQUIRED,
      confidenceScore: 0.94,
      p10BreakDurationSec: 75,
      p50BreakDurationSec: 110,
      switchingLatencyMs: 380,
      falsePositiveRatePct: 0.4,
      sha256Manifest: computeManifestHash(DEFAULT_SHARED_INTEL_SCOPES[0].scopeId, 3, 75, 110, 380),
      rollbackReason: null,
      updatedAt: now,
    },
    {
      scope: { ...DEFAULT_SHARED_INTEL_SCOPES[1] },
      version: 2,
      previousGoodVersion: 1,
      status: 'corroborated_published',
      corroboratingDeviceIds: ['sim_tv_sky_01', 'sim_tv_sky_02', 'sim_tv_sky_03'],
      pendingObservations: 0,
      quorumRequired: SHARED_INTEL_QUORUM_REQUIRED,
      confidenceScore: 0.91,
      p10BreakDurationSec: 90,
      p50BreakDurationSec: 135,
      switchingLatencyMs: 420,
      falsePositiveRatePct: 0.6,
      sha256Manifest: computeManifestHash(DEFAULT_SHARED_INTEL_SCOPES[1].scopeId, 2, 90, 135, 420),
      rollbackReason: null,
      updatedAt: now,
    },
    {
      scope: { ...DEFAULT_SHARED_INTEL_SCOPES[2] },
      version: 2,
      previousGoodVersion: 1,
      status: 'corroborated_published',
      corroboratingDeviceIds: ['sim_tv_de_01', 'sim_tv_de_02', 'sim_tv_de_03'],
      pendingObservations: 0,
      quorumRequired: SHARED_INTEL_QUORUM_REQUIRED,
      confidenceScore: 0.89,
      p10BreakDurationSec: 65,
      p50BreakDurationSec: 95,
      switchingLatencyMs: 460,
      falsePositiveRatePct: 0.5,
      sha256Manifest: computeManifestHash(DEFAULT_SHARED_INTEL_SCOPES[2].scopeId, 2, 65, 95, 460),
      rollbackReason: null,
      updatedAt: now,
    },
  ];

  const deviceCaches: SharedIntelLocalDeviceCache[] = [
    {
      tvDeviceId: 'sim_tv_gb_01',
      deviceLabel: 'Living Room Testbench (Android TV 14)',
      assignedScopeId: bundles[0].scope.scopeId,
      cachedBundleVersion: bundles[0].version,
      cachedScopeId: bundles[0].scope.scopeId,
      cachedP10DurationSec: bundles[0].p10BreakDurationSec,
      cachedSha256: bundles[0].sha256Manifest,
      offlineMode: false,
      queuedObservationsCount: 0,
      lastSyncedAt: now,
      fallbackStatus: 'online_synced',
    },
    {
      tvDeviceId: 'sim_tv_sky_01',
      deviceLabel: 'Studio Monitor B (Samsung Tizen 7.0)',
      assignedScopeId: bundles[1].scope.scopeId,
      cachedBundleVersion: bundles[1].version,
      cachedScopeId: bundles[1].scope.scopeId,
      cachedP10DurationSec: bundles[1].p10BreakDurationSec,
      cachedSha256: bundles[1].sha256Manifest,
      offlineMode: false,
      queuedObservationsCount: 0,
      lastSyncedAt: now,
      fallbackStatus: 'online_synced',
    },
    {
      tvDeviceId: 'sim_tv_de_01',
      deviceLabel: 'DE Compliance Fixture (LG webOS 23)',
      assignedScopeId: bundles[2].scope.scopeId,
      cachedBundleVersion: bundles[2].version,
      cachedScopeId: bundles[2].scope.scopeId,
      cachedP10DurationSec: bundles[2].p10BreakDurationSec,
      cachedSha256: bundles[2].sha256Manifest,
      offlineMode: false,
      queuedObservationsCount: 0,
      lastSyncedAt: now,
      fallbackStatus: 'online_synced',
    },
  ];

  const auditTrail: SharedIntelAuditEntry[] = [
    {
      id: 'sia_init_1',
      action: 'PREVIEW_INITIALISED',
      scopeId: null,
      detail:
        'Prototype Simulation initialised: 3 scoped compatibility bundles, quorum=3, FPR rollback guard=2.5%, zero viewer PII.',
      createdAt: now,
    },
  ];

  return {
    isPrototypeSimulation: true,
    implementationNote:
      'PROTOTYPE SIMULATION ONLY (ADR-016 / PRD-19) — Demonstrates multi-TV corroboration gating, anti-poisoning quarantine, scope isolation, offline local cache fallback, and automatic FPR rollback without real Smart TV OS hardware or PII.',
    quorumThreshold: SHARED_INTEL_QUORUM_REQUIRED,
    fprRollbackThresholdPct: SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT,
    zeroPiiEnforced: true,
    rejectedPiiAttemptCount: 0,
    bundles,
    deviceCaches,
    observations: [],
    auditTrail,
  };
}

function cloneState(state: SharedIntelPreviewState): SharedIntelPreviewState {
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

function appendAudit(
  draft: SharedIntelPreviewState,
  action: string,
  scopeId: string | null,
  detail: string,
  createdAt: string
): void {
  draft.auditTrail.unshift({
    id: `sia_${crypto.randomBytes(4).toString('hex')}`,
    action,
    scopeId,
    detail,
    createdAt,
  });
  if (draft.auditTrail.length > 60) {
    draft.auditTrail.length = 60;
  }
}

export function assertZeroPiiPayload(rawPayload: Record<string, unknown>): string[] {
  const violations: string[] = [];
  for (const key of Object.keys(rawPayload)) {
    if (FORBIDDEN_PII_FIELDS.has(key) && rawPayload[key] !== undefined && rawPayload[key] !== null) {
      violations.push(key);
    }
  }
  return violations;
}

export interface SubmitSharedIntelObservationInput {
  tvDeviceId: string;
  scopeId: string;
  signalType: SharedIntelSignalType;
  estimatedBreakDurationSec: number;
  transitionLatencyMs: number;
  outlierAnomaly?: boolean;
  rawPayload?: Record<string, unknown>;
}

export function submitSharedIntelObservation(
  currentState: SharedIntelPreviewState,
  input: SubmitSharedIntelObservationInput
): { nextState: SharedIntelPreviewState; observation: SharedIntelObservationRecord; bundle: SharedIntelBundleRecord } {
  const nextState = cloneState(currentState);
  const now = new Date().toISOString();

  if (input.rawPayload) {
    const piiViolations = assertZeroPiiPayload(input.rawPayload);
    if (piiViolations.length > 0) {
      throw new Error(
        `ZERO-PII GUARDRAIL: Shared Ad Intelligence rejects viewer PII fields (${piiViolations.join(', ')}).`
      );
    }
  }

  const tvDeviceId = input.tvDeviceId.trim();
  const scopeId = input.scopeId.trim();
  if (tvDeviceId.length < 3) {
    throw new Error('tvDeviceId must be at least 3 characters.');
  }

  const bundle = nextState.bundles.find((b) => b.scope.scopeId === scopeId);
  if (!bundle) {
    throw new Error(`Scope "${scopeId}" not found. Compatibility is never assumed universally.`);
  }

  if (
    !Number.isFinite(input.estimatedBreakDurationSec) ||
    input.estimatedBreakDurationSec < 10 ||
    input.estimatedBreakDurationSec > 1200
  ) {
    throw new Error('estimatedBreakDurationSec must be between 10 and 1200 seconds.');
  }

  if (
    !Number.isFinite(input.transitionLatencyMs) ||
    input.transitionLatencyMs < 50 ||
    input.transitionLatencyMs > 10000
  ) {
    throw new Error('transitionLatencyMs must be between 50 and 10000 ms.');
  }

  const deviceCache = nextState.deviceCaches.find((d) => d.tvDeviceId === tvDeviceId);
  if (deviceCache && deviceCache.offlineMode) {
    deviceCache.queuedObservationsCount += 1;
    deviceCache.fallbackStatus = 'offline_using_local_cache';

    const queuedObs: SharedIntelObservationRecord = {
      id: `obs_${crypto.randomBytes(5).toString('hex')}`,
      tvDeviceId,
      scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
      transitionLatencyMs: Math.round(input.transitionLatencyMs),
      outlierAnomaly: Boolean(input.outlierAnomaly),
      trustDecision: 'queued_offline',
      decisionReason:
        'Device is offline: observation queued locally while TV continues using signed Local Intelligence Cache without interrupting playback.',
      containsPii: false,
      createdAt: now,
    };
    nextState.observations.unshift(queuedObs);
    appendAudit(
      nextState,
      'OBSERVATION_QUEUED_OFFLINE',
      scopeId,
      `${tvDeviceId} queued offline observation (${input.signalType}, ${queuedObs.estimatedBreakDurationSec}s); Local Cache v${deviceCache.cachedBundleVersion} active.`,
      now
    );
    return { nextState, observation: queuedObs, bundle };
  }

  // Outlier / Anti-Poisoning validation (extreme duration anomaly or explicit poison flag)
  const isOutlierDuration =
    input.estimatedBreakDurationSec < 15 ||
    input.estimatedBreakDurationSec > 240 ||
    Math.abs(input.estimatedBreakDurationSec - bundle.p50BreakDurationSec) > 130;

  if (input.outlierAnomaly || isOutlierDuration) {
    const rejectedObs: SharedIntelObservationRecord = {
      id: `obs_${crypto.randomBytes(5).toString('hex')}`,
      tvDeviceId,
      scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
      transitionLatencyMs: Math.round(input.transitionLatencyMs),
      outlierAnomaly: true,
      trustDecision: 'rejected_outlier',
      decisionReason:
        'Anti-poisoning filter rejected extreme outlier telemetry before modifying published fleet bundle.',
      containsPii: false,
      createdAt: now,
    };
    nextState.observations.unshift(rejectedObs);
    appendAudit(
      nextState,
      'POISON_OUTLIER_REJECTED',
      scopeId,
      `Blocked anomalous report from ${tvDeviceId} (${rejectedObs.estimatedBreakDurationSec}s). Published v${bundle.version} protected.`,
      now
    );
    return { nextState, observation: rejectedObs, bundle };
  }

  // Collect pending distinct devices currently queued for next revision
  const recentPendingDeviceIds = new Set<string>();
  for (const prev of nextState.observations) {
    if (prev.scopeId === scopeId && prev.trustDecision === 'quarantined_pending_quorum') {
      recentPendingDeviceIds.add(prev.tvDeviceId);
    }
  }

  if (recentPendingDeviceIds.has(tvDeviceId)) {
    const sybilObs: SharedIntelObservationRecord = {
      id: `obs_${crypto.randomBytes(5).toString('hex')}`,
      tvDeviceId,
      scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
      transitionLatencyMs: Math.round(input.transitionLatencyMs),
      outlierAnomaly: false,
      trustDecision: 'quarantined_pending_quorum',
      decisionReason: `Duplicate/Sybil prevention: ${tvDeviceId} already counted in pending quorum (${recentPendingDeviceIds.size}/${bundle.quorumRequired} distinct TVs).`,
      containsPii: false,
      createdAt: now,
    };
    nextState.observations.unshift(sybilObs);
    appendAudit(
      nextState,
      'SYBIL_DUPLICATE_HELD',
      scopeId,
      `Prevented ${tvDeviceId} from self-corroborating; quorum remains ${recentPendingDeviceIds.size}/${bundle.quorumRequired}.`,
      now
    );
    return { nextState, observation: sybilObs, bundle };
  }

  recentPendingDeviceIds.add(tvDeviceId);
  const distinctCount = recentPendingDeviceIds.size;

  if (distinctCount < bundle.quorumRequired) {
    bundle.status = 'quarantined_pending_corroboration';
    bundle.pendingObservations = distinctCount;
    bundle.updatedAt = now;

    const heldObs: SharedIntelObservationRecord = {
      id: `obs_${crypto.randomBytes(5).toString('hex')}`,
      tvDeviceId,
      scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
      transitionLatencyMs: Math.round(input.transitionLatencyMs),
      outlierAnomaly: false,
      trustDecision: 'quarantined_pending_quorum',
      decisionReason: `Held in quarantine (${distinctCount}/${bundle.quorumRequired} distinct TVs corroborated). Single-TV reports never overwrite fleet intelligence.`,
      containsPii: false,
      createdAt: now,
    };
    nextState.observations.unshift(heldObs);
    appendAudit(
      nextState,
      'OBSERVATION_QUARANTINED_PENDING_QUORUM',
      scopeId,
      `${tvDeviceId} report held (${distinctCount}/${bundle.quorumRequired} distinct TVs). Active published v${bundle.version} unchanged.`,
      now
    );
    return { nextState, observation: heldObs, bundle };
  }

  // Quorum K >= 3 distinct TVs achieved -> promote pending batch to accepted & publish new signed version
  for (const prev of nextState.observations) {
    if (prev.scopeId === scopeId && prev.trustDecision === 'quarantined_pending_quorum') {
      prev.trustDecision = 'accepted_corroborated';
      prev.decisionReason = `Corroborated by ${distinctCount}/${bundle.quorumRequired} distinct attested TVs and promoted.`;
    }
  }

  const nextVersion = bundle.version + 1;
  const nextP50 = Math.round((bundle.p50BreakDurationSec + input.estimatedBreakDurationSec) / 2);
  const nextP10 = Math.max(15, Math.min(bundle.p10BreakDurationSec, nextP50 - 25));
  const nextLatency = Math.round((bundle.switchingLatencyMs + input.transitionLatencyMs) / 2);

  bundle.previousGoodVersion = bundle.version;
  bundle.version = nextVersion;
  bundle.status = 'corroborated_published';
  bundle.corroboratingDeviceIds = Array.from(recentPendingDeviceIds);
  bundle.pendingObservations = 0;
  bundle.confidenceScore = Number(Math.min(0.99, bundle.confidenceScore + 0.02).toFixed(2));
  bundle.p10BreakDurationSec = nextP10;
  bundle.p50BreakDurationSec = nextP50;
  bundle.switchingLatencyMs = nextLatency;
  bundle.falsePositiveRatePct = 0.3;
  bundle.rollbackReason = null;
  bundle.sha256Manifest = computeManifestHash(scopeId, nextVersion, nextP10, nextP50, nextLatency);
  bundle.updatedAt = now;

  // Sync only online TVs whose assignedScopeId strictly matches this scopeId
  for (const cache of nextState.deviceCaches) {
    if (cache.assignedScopeId === scopeId && !cache.offlineMode) {
      cache.cachedBundleVersion = bundle.version;
      cache.cachedP10DurationSec = bundle.p10BreakDurationSec;
      cache.cachedSha256 = bundle.sha256Manifest;
      cache.lastSyncedAt = now;
      cache.fallbackStatus = 'online_synced';
    }
  }

  const acceptedObs: SharedIntelObservationRecord = {
    id: `obs_${crypto.randomBytes(5).toString('hex')}`,
    tvDeviceId,
    scopeId,
    signalType: input.signalType,
    estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
    transitionLatencyMs: Math.round(input.transitionLatencyMs),
    outlierAnomaly: false,
    trustDecision: 'accepted_corroborated',
    decisionReason: `Quorum ${distinctCount}/${bundle.quorumRequired} satisfied -> promoted to signed v${bundle.version} (${bundle.sha256Manifest}).`,
    containsPii: false,
    createdAt: now,
  };
  nextState.observations.unshift(acceptedObs);
  if (nextState.observations.length > 80) {
    nextState.observations.length = 80;
  }

  appendAudit(
    nextState,
    'BUNDLE_CORROBORATED_PUBLISHED',
    scopeId,
    `Promoted ${bundle.scope.channel} (${bundle.scope.platform}) to v${bundle.version} after ${distinctCount}-TV quorum.`,
    now
  );

  return { nextState, observation: acceptedObs, bundle };
}

export function runSharedIntelSimulationAction(
  currentState: SharedIntelPreviewState,
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
  const targetScopeId = params.scopeId ?? DEFAULT_SHARED_INTEL_SCOPES[0].scopeId;
  const now = new Date().toISOString();

  if (params.action === 'reset_preview') {
    return createInitialSharedIntelPreviewState();
  }

  if (params.action === 'corroborate_quorum') {
    let working = cloneState(currentState);
    const baseBundle = working.bundles.find((b) => b.scope.scopeId === targetScopeId);
    if (!baseBundle) {
      throw new Error(`Scope "${targetScopeId}" not found.`);
    }
    const existingCount = working.observations.filter(
      (o) => o.scopeId === targetScopeId && o.trustDecision === 'quarantined_pending_quorum'
    ).length;
    const needed = Math.max(1, working.quorumThreshold - existingCount);
    const stamp = Date.now().toString(36).slice(-4);
    for (let i = 0; i < needed; i++) {
      const res = submitSharedIntelObservation(working, {
        tvDeviceId: `sim_quorum_${stamp}_${i + 1}`,
        scopeId: targetScopeId,
        signalType: 'scte35',
        estimatedBreakDurationSec: baseBundle.p50BreakDurationSec + 5,
        transitionLatencyMs: baseBundle.switchingLatencyMs,
      });
      working = res.nextState;
    }
    return working;
  }

  if (params.action === 'inject_outlier_poison') {
    const res = submitSharedIntelObservation(currentState, {
      tvDeviceId: 'sim_rogue_tv_99',
      scopeId: targetScopeId,
      signalType: 'av_pattern',
      estimatedBreakDurationSec: 950,
      transitionLatencyMs: 2400,
      outlierAnomaly: true,
    });
    return res.nextState;
  }

  if (params.action === 'toggle_offline') {
    const nextState = cloneState(currentState);
    const cache = nextState.deviceCaches.find((d) => d.tvDeviceId === params.tvDeviceId);
    if (!cache) {
      throw new Error('Simulated TV device cache not found.');
    }
    cache.offlineMode = !cache.offlineMode;
    cache.fallbackStatus = cache.offlineMode ? 'offline_using_local_cache' : 'online_synced';
    appendAudit(
      nextState,
      cache.offlineMode ? 'TV_ENTERED_OFFLINE_CACHE_MODE' : 'TV_RESTORED_ONLINE',
      cache.assignedScopeId,
      `${cache.tvDeviceId} switched to ${cache.offlineMode ? 'OFFLINE (Local Cache v' + cache.cachedBundleVersion + ' active)' : 'ONLINE'}.`,
      now
    );
    return nextState;
  }

  if (params.action === 'sync_cache') {
    let nextState = cloneState(currentState);
    const cache = nextState.deviceCaches.find((d) => d.tvDeviceId === params.tvDeviceId);
    if (!cache) {
      throw new Error('Simulated TV device cache not found.');
    }
    if (cache.offlineMode) {
      throw new Error(`${cache.tvDeviceId} is offline. Reconnect before synchronising with Central Service.`);
    }
    const matchingBundle = nextState.bundles.find((b) => b.scope.scopeId === cache.assignedScopeId);
    if (!matchingBundle) {
      throw new Error(`No bundle exists for scope "${cache.assignedScopeId}".`);
    }
    const drained = cache.queuedObservationsCount;
    cache.queuedObservationsCount = 0;
    cache.cachedBundleVersion = matchingBundle.version;
    cache.cachedScopeId = matchingBundle.scope.scopeId;
    cache.cachedP10DurationSec = matchingBundle.p10BreakDurationSec;
    cache.cachedSha256 = matchingBundle.sha256Manifest;
    cache.lastSyncedAt = now;
    cache.fallbackStatus =
      matchingBundle.status === 'rolled_back' ? 'rollback_restored' : 'online_synced';

    appendAudit(
      nextState,
      'SCOPED_CACHE_SYNCED',
      cache.assignedScopeId,
      `Synced ${cache.tvDeviceId} strictly to ${matchingBundle.scope.scopeId} v${matchingBundle.version} (drained ${drained} queued offline observation(s)).`,
      now
    );
    return nextState;
  }

  if (params.action === 'simulate_fpr_spike_rollback') {
    const nextState = cloneState(currentState);
    const bundle = nextState.bundles.find((b) => b.scope.scopeId === targetScopeId);
    if (!bundle) {
      throw new Error(`Scope "${targetScopeId}" not found.`);
    }
    const badVersion = bundle.version;
    const restoredVersion = Math.max(1, bundle.previousGoodVersion);
    bundle.version = restoredVersion;
    bundle.status = 'rolled_back';
    bundle.falsePositiveRatePct = 4.8;
    bundle.pendingObservations = 0;
    bundle.sha256Manifest = computeManifestHash(
      targetScopeId,
      restoredVersion,
      bundle.p10BreakDurationSec,
      bundle.p50BreakDurationSec,
      bundle.switchingLatencyMs
    );
    bundle.rollbackReason = `Automatic rollback triggered: post-update FPR 4.8% breached ${nextState.fprRollbackThresholdPct}% guard (reverted v${badVersion} -> v${restoredVersion}).`;
    bundle.updatedAt = now;

    for (const cache of nextState.deviceCaches) {
      if (cache.assignedScopeId === targetScopeId && !cache.offlineMode) {
        cache.cachedBundleVersion = restoredVersion;
        cache.cachedSha256 = bundle.sha256Manifest;
        cache.lastSyncedAt = now;
        cache.fallbackStatus = 'rollback_restored';
      }
    }

    appendAudit(
      nextState,
      'AUTO_ROLLBACK_FPR_SPIKE',
      targetScopeId,
      bundle.rollbackReason,
      now
    );
    return nextState;
  }

  throw new Error('Unsupported Shared Intelligence simulation action.');
}
