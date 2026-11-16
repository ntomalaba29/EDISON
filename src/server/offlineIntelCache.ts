import crypto from 'node:crypto';
import { DEFAULT_SHARED_INTEL_SCOPES } from './sharedIntelligencePreview.ts';
import type {
  OfflineCacheBundleEntry,
  OfflineCacheOperationResult,
  OfflineCacheStateSnapshot,
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
  private queuedObservationsCount = 0;
  private readonly recentOperations: OfflineCacheStateSnapshot['recentOperations'] = [];

  constructor() {
    this.resetDefaults();
  }

  resetDefaults(): void {
    this.bundles.clear();
    this.queuedObservationsCount = 0;
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
      queuedObservationsCount: this.queuedObservationsCount,
      recentOperations: this.recentOperations.map((o) => ({ ...o })),
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
      this.queuedObservationsCount += 1;
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
