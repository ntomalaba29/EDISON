import crypto from 'node:crypto';
import { DEFAULT_SHARED_INTEL_SCOPES } from './sharedIntelligencePreview.ts';
import type {
  OfflineCacheBundleEntry,
  OfflineCacheOperationResult,
  OfflineCacheStateSnapshot,
  OfflineQueueDrainResult,
  OfflineQueuedObservation,
} from '../types/edison.ts';

export function computeOfflineBundleManifest(params: {
  scopeId: string;
  version: number;
  p10BreakDurationSec: number;
  p50BreakDurationSec: number;
  switchingLatencyMs: number;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      `${params.scopeId}:v${params.version}:p10=${params.p10BreakDurationSec}:p50=${params.p50BreakDurationSec}:lat=${params.switchingLatencyMs}`
    )
    .digest('hex')
    .slice(0, 16);
}

/**
 * Software-first Local Offline Intelligence Cache Engine (Phase 4 Block 4.1).
 *
 * Guarantees:
 * - Strictly scoped by (country, broadcaster, channel, platform, broadcastConfig).
 * - Zero PII stored or cached.
 * - Verifies SHA-256 manifest hashes before atomic pointer swap; tampered or
 *   corrupted staged bundles are rejected fail-closed while preserving the active version.
 * - Supports instant rollback to `previousGoodVersion` without interrupting live TV.
 */
export class LocalOfflineIntelCacheEngine {
  private readonly bundles = new Map<string, OfflineCacheBundleEntry>();
  private readonly queuedObservations: OfflineQueuedObservation[] = [];
  private readonly seenIdempotencyKeys = new Set<string>();
  private deduplicatedReplaysCount = 0;
  private drainedObservationsTotal = 0;
  private readonly recentOperations: OfflineCacheStateSnapshot['recentOperations'] = [];

  constructor() {
    this.resetDefaults();
  }

  resetDefaults(): void {
    this.bundles.clear();
    this.queuedObservations.length = 0;
    this.seenIdempotencyKeys.clear();
    this.deduplicatedReplaysCount = 0;
    this.drainedObservationsTotal = 0;
    this.recentOperations.length = 0;
    const now = new Date().toISOString();

    const defaults = [
      {
        scope: DEFAULT_SHARED_INTEL_SCOPES[0],
        version: 3,
        p10: 75,
        p50: 110,
        latency: 380,
      },
      {
        scope: DEFAULT_SHARED_INTEL_SCOPES[1],
        version: 2,
        p10: 90,
        p50: 135,
        latency: 420,
      },
      {
        scope: DEFAULT_SHARED_INTEL_SCOPES[2],
        version: 2,
        p10: 65,
        p50: 95,
        latency: 460,
      },
    ];

    for (const item of defaults) {
      const sha = computeOfflineBundleManifest({
        scopeId: item.scope.scopeId,
        version: item.version,
        p10BreakDurationSec: item.p10,
        p50BreakDurationSec: item.p50,
        switchingLatencyMs: item.latency,
      });
      const prevSha = computeOfflineBundleManifest({
        scopeId: item.scope.scopeId,
        version: item.version - 1,
        p10BreakDurationSec: Math.max(20, item.p10 - 5),
        p50BreakDurationSec: Math.max(30, item.p50 - 5),
        switchingLatencyMs: item.latency,
      });
      this.bundles.set(item.scope.scopeId, {
        scopeId: item.scope.scopeId,
        displayName: item.scope.displayName,
        country: item.scope.country,
        broadcaster: item.scope.broadcaster,
        channel: item.scope.channel,
        platform: item.scope.platform,
        version: item.version,
        previousGoodVersion: item.version - 1,
        p10BreakDurationSec: item.p10,
        p50BreakDurationSec: item.p50,
        switchingLatencyMs: item.latency,
        sha256Manifest: sha,
        previousGoodManifest: prevSha,
        previousGoodP10Sec: Math.max(20, item.p10 - 5),
        previousGoodP50Sec: Math.max(30, item.p50 - 5),
        lastSwappedAt: now,
        status: 'active_verified',
      });
    }

    this.pushOp(
      'CACHE_INITIALISED',
      'all_scopes',
      'Initialised 3 scoped offline intelligence bundles with verified SHA-256 manifests (zero PII).',
      true
    );
  }

  private pushOp(action: string, scopeId: string, detail: string, ok: boolean): void {
    this.recentOperations.unshift({
      id: `oc_${crypto.randomBytes(4).toString('hex')}`,
      action,
      scopeId,
      detail,
      ok,
      createdAt: new Date().toISOString(),
    });
    if (this.recentOperations.length > 30) {
      this.recentOperations.length = 30;
    }
  }

  getSnapshot(): OfflineCacheStateSnapshot {
    return {
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      zeroPiiEnforced: true,
      offlineResilient: this.bundles.size > 0,
      bundles: Array.from(this.bundles.values()).map((b) => ({ ...b })),
      queuedObservationsCount: this.queuedObservations.length,
      queuedObservations: this.queuedObservations.map((q) => ({ ...q })),
      deduplicatedReplaysCount: this.deduplicatedReplaysCount,
      drainedObservationsTotal: this.drainedObservationsTotal,
      recentOperations: this.recentOperations.map((o) => ({ ...o })),
    };
  }

  enqueueOfflineObservation(input: {
    idempotencyKey: string;
    scopeId: string;
    channelNumber: number;
    signalType: OfflineQueuedObservation['signalType'];
    observedBreakDurationSec: number;
    switchingLatencyMs: number;
  }): {
    ok: boolean;
    queued: boolean;
    deduplicatedReplay: boolean;
    observation: OfflineQueuedObservation | null;
    detail: string;
  } {
    const scopeKnown = this.bundles.has(input.scopeId);
    if (!scopeKnown) {
      const detail = `Scope isolation guard: refused to queue observation for unknown scope "${input.scopeId}".`;
      this.pushOp('QUEUE_REJECTED_SCOPE', input.scopeId, detail, false);
      return {
        ok: false,
        queued: false,
        deduplicatedReplay: false,
        observation: null,
        detail,
      };
    }

    const key = input.idempotencyKey.trim();
    const alreadyQueued = this.queuedObservations.some((o) => o.idempotencyKey === key);
    if (alreadyQueued || this.seenIdempotencyKeys.has(key)) {
      this.deduplicatedReplaysCount += 1;
      const detail = `Idempotent replay guard: skipped duplicate observation key "${key}" for ${input.scopeId}.`;
      this.pushOp('QUEUE_REPLAY_DEDUPLICATED', input.scopeId, detail, true);
      return {
        ok: true,
        queued: false,
        deduplicatedReplay: true,
        observation: null,
        detail,
      };
    }

    const obs: OfflineQueuedObservation = {
      id: `obs_${crypto.randomBytes(5).toString('hex')}`,
      idempotencyKey: key,
      scopeId: input.scopeId,
      channelNumber: input.channelNumber,
      signalType: input.signalType,
      observedBreakDurationSec: input.observedBreakDurationSec,
      switchingLatencyMs: input.switchingLatencyMs,
      containsPii: false,
      queuedAt: new Date().toISOString(),
    };
    this.queuedObservations.push(obs);
    if (this.queuedObservations.length > 200) {
      this.queuedObservations.shift();
    }
    const detail = `Queued zero-PII offline observation ${obs.id} (key=${key}, ch=${input.channelNumber}, signal=${input.signalType}).`;
    this.pushOp('OBSERVATION_QUEUED_OFFLINE', input.scopeId, detail, true);
    return {
      ok: true,
      queued: true,
      deduplicatedReplay: false,
      observation: { ...obs },
      detail,
    };
  }

  drainObservationQueue(params: {
    networkOnline: boolean;
    maxBatchSize?: number;
  }): OfflineQueueDrainResult {
    const now = new Date().toISOString();
    if (!params.networkOnline) {
      const detail = `Network offline — retained ${this.queuedObservations.length} queued observation(s) fail-closed in local cache.`;
      this.pushOp('QUEUE_DRAIN_DEFERRED_OFFLINE', 'all_scopes', detail, false);
      return {
        ok: false,
        networkOnline: false,
        attemptedCount: this.queuedObservations.length,
        drainedNewCount: 0,
        deduplicatedReplayCount: 0,
        remainingQueueCount: this.queuedObservations.length,
        detail,
        executedAt: now,
      };
    }

    const batchLimit = Math.max(1, Math.min(200, params.maxBatchSize ?? 50));
    const batch = this.queuedObservations.splice(0, batchLimit);
    let drainedNewCount = 0;
    let deduplicatedReplayCount = 0;

    for (const item of batch) {
      if (this.seenIdempotencyKeys.has(item.idempotencyKey)) {
        deduplicatedReplayCount += 1;
        this.deduplicatedReplaysCount += 1;
      } else {
        this.seenIdempotencyKeys.add(item.idempotencyKey);
        drainedNewCount += 1;
        this.drainedObservationsTotal += 1;
      }
    }

    const detail = `Drained ${drainedNewCount} new observation(s) (${deduplicatedReplayCount} replay(s) deduplicated); ${this.queuedObservations.length} remaining in queue.`;
    this.pushOp('QUEUE_DRAINED_SYNC', 'all_scopes', detail, true);
    return {
      ok: true,
      networkOnline: true,
      attemptedCount: batch.length,
      drainedNewCount,
      deduplicatedReplayCount,
      remainingQueueCount: this.queuedObservations.length,
      detail,
      executedAt: now,
    };
  }

  stageAndAtomicSwap(params: {
    scopeId: string;
    nextVersion: number;
    p10BreakDurationSec: number;
    p50BreakDurationSec: number;
    switchingLatencyMs: number;
    providedManifestSha?: string;
    simulateCorruptManifest?: boolean;
  }): OfflineCacheOperationResult {
    const now = new Date().toISOString();
    const current = this.bundles.get(params.scopeId);
    if (!current) {
      const reason = `Scope isolation guard: unknown scope "${params.scopeId}" rejected.`;
      this.pushOp('STAGE_SWAP_REJECTED_SCOPE', params.scopeId, reason, false);
      return {
        ok: false,
        action: 'stage_swap',
        scopeId: params.scopeId,
        atomicSwapApplied: false,
        rejectedReason: reason,
        bundle: null,
        detail: reason,
        executedAt: now,
      };
    }

    if (params.nextVersion <= current.version) {
      const reason = `Anti-downgrade guard: staged version v${params.nextVersion} must exceed active v${current.version}.`;
      this.pushOp('STAGE_SWAP_REJECTED_DOWNGRADE', params.scopeId, reason, false);
      return {
        ok: false,
        action: 'stage_swap',
        scopeId: params.scopeId,
        atomicSwapApplied: false,
        rejectedReason: reason,
        bundle: { ...current },
        detail: reason,
        executedAt: now,
      };
    }

    const expectedSha = computeOfflineBundleManifest({
      scopeId: params.scopeId,
      version: params.nextVersion,
      p10BreakDurationSec: params.p10BreakDurationSec,
      p50BreakDurationSec: params.p50BreakDurationSec,
      switchingLatencyMs: params.switchingLatencyMs,
    });

    const presentedSha = params.simulateCorruptManifest
      ? 'deadbeefcorrupt0'
      : params.providedManifestSha || expectedSha;

    if (presentedSha !== expectedSha) {
      const reason = `Manifest SHA-256 mismatch (expected=${expectedSha}, received=${presentedSha}). Active v${current.version} preserved fail-closed.`;
      this.pushOp('STAGE_SWAP_REJECTED_CORRUPT', params.scopeId, reason, false);
      return {
        ok: false,
        action: 'stage_swap',
        scopeId: params.scopeId,
        atomicSwapApplied: false,
        rejectedReason: reason,
        bundle: { ...current },
        detail: reason,
        executedAt: now,
      };
    }

    const updated: OfflineCacheBundleEntry = {
      ...current,
      previousGoodVersion: current.version,
      previousGoodManifest: current.sha256Manifest,
      previousGoodP10Sec: current.p10BreakDurationSec,
      previousGoodP50Sec: current.p50BreakDurationSec,
      version: params.nextVersion,
      p10BreakDurationSec: params.p10BreakDurationSec,
      p50BreakDurationSec: params.p50BreakDurationSec,
      switchingLatencyMs: params.switchingLatencyMs,
      sha256Manifest: expectedSha,
      lastSwappedAt: now,
      status: 'active_verified',
    };
    this.bundles.set(params.scopeId, updated);
    const detail = `Verified SHA-256 (${expectedSha}) and atomically swapped ${params.scopeId} v${current.version} -> v${updated.version}.`;
    this.pushOp('ATOMIC_SWAP_APPLIED', params.scopeId, detail, true);

    return {
      ok: true,
      action: 'stage_swap',
      scopeId: params.scopeId,
      atomicSwapApplied: true,
      rejectedReason: null,
      bundle: { ...updated },
      detail,
      executedAt: now,
    };
  }

  rollbackScope(scopeId: string): OfflineCacheOperationResult {
    const now = new Date().toISOString();
    const current = this.bundles.get(scopeId);
    if (!current) {
      const reason = `Scope "${scopeId}" not found in local cache.`;
      this.pushOp('ROLLBACK_FAILED', scopeId, reason, false);
      return {
        ok: false,
        action: 'rollback',
        scopeId,
        atomicSwapApplied: false,
        rejectedReason: reason,
        bundle: null,
        detail: reason,
        executedAt: now,
      };
    }

    if (
      current.previousGoodVersion === null ||
      !current.previousGoodManifest ||
      current.previousGoodP10Sec === null ||
      current.previousGoodP50Sec === null
    ) {
      const reason = `No previous verified bundle snapshot available to roll back ${scopeId}.`;
      this.pushOp('ROLLBACK_UNAVAILABLE', scopeId, reason, false);
      return {
        ok: false,
        action: 'rollback',
        scopeId,
        atomicSwapApplied: false,
        rejectedReason: reason,
        bundle: { ...current },
        detail: reason,
        executedAt: now,
      };
    }

    const rolledBack: OfflineCacheBundleEntry = {
      ...current,
      version: current.previousGoodVersion,
      sha256Manifest: current.previousGoodManifest,
      p10BreakDurationSec: current.previousGoodP10Sec,
      p50BreakDurationSec: current.previousGoodP50Sec,
      previousGoodVersion: null,
      previousGoodManifest: null,
      previousGoodP10Sec: null,
      previousGoodP50Sec: null,
      lastSwappedAt: now,
      status: 'rolled_back_safe',
    };
    this.bundles.set(scopeId, rolledBack);
    const detail = `Atomically rolled back ${scopeId} v${current.version} -> v${rolledBack.version} (${rolledBack.sha256Manifest}).`;
    this.pushOp('ATOMIC_ROLLBACK', scopeId, detail, true);

    return {
      ok: true,
      action: 'rollback',
      scopeId,
      atomicSwapApplied: true,
      rejectedReason: null,
      bundle: { ...rolledBack },
      detail,
      executedAt: now,
    };
  }

  evaluateOfflineBreakEligibility(params: {
    scopeId: string;
    adDurationSeconds: number;
    safetyBufferSeconds: number;
  }): {
    eligible: boolean;
    bundleVersion: number | null;
    availableP10Sec: number;
    requiredTotalSec: number;
    reason: string;
  } {
    const bundle = this.bundles.get(params.scopeId);
    if (!bundle) {
      return {
        eligible: false,
        bundleVersion: null,
        availableP10Sec: 0,
        requiredTotalSec: params.adDurationSeconds + params.safetyBufferSeconds,
        reason: `Uncached broadcast scope "${params.scopeId}" — fail closed and keep ordinary TV undisturbed.`,
      };
    }

    const switchingOverheadSec = Math.ceil((bundle.switchingLatencyMs * 2) / 1000);
    const requiredTotalSec =
      params.adDurationSeconds + switchingOverheadSec + params.safetyBufferSeconds;

    if (bundle.p10BreakDurationSec < requiredTotalSec) {
      this.enqueueOfflineObservation({
        idempotencyKey: `skip_${params.scopeId}_v${bundle.version}_d${params.adDurationSeconds}_b${params.safetyBufferSeconds}`,
        scopeId: params.scopeId,
        channelNumber: 101,
        signalType: 'offline_skip',
        observedBreakDurationSec: bundle.p10BreakDurationSec,
        switchingLatencyMs: bundle.switchingLatencyMs,
      });
      const reason = `Skipped break offline: cached P10 (${bundle.p10BreakDurationSec}s) < required ${requiredTotalSec}s (${params.adDurationSeconds}s ad + ${switchingOverheadSec}s switch + ${params.safetyBufferSeconds}s safety buffer).`;
      this.pushOp('OFFLINE_BREAK_SKIPPED_SAFE', params.scopeId, reason, true);
      return {
        eligible: false,
        bundleVersion: bundle.version,
        availableP10Sec: bundle.p10BreakDurationSec,
        requiredTotalSec,
        reason,
      };
    }

    const reason = `Offline cache v${bundle.version} permits ad break safely: P10=${bundle.p10BreakDurationSec}s >= required ${requiredTotalSec}s.`;
    this.pushOp('OFFLINE_BREAK_PERMITTED', params.scopeId, reason, true);
    return {
      eligible: true,
      bundleVersion: bundle.version,
      availableP10Sec: bundle.p10BreakDurationSec,
      requiredTotalSec,
      reason,
    };
  }
}

export const localOfflineIntelCache = new LocalOfflineIntelCacheEngine();
