import { describe, expect, it } from 'vitest';
import {
  ALL_TV_PLATFORM_IDS,
  EdisonTvControlEngine,
} from '../src/server/tvPlatformAdapter.ts';
import { LocalOfflineIntelCacheEngine } from '../src/server/offlineIntelCache.ts';

describe('EDISON Phase 4 Block 4.1 — Software TV Adapter Harnesses & Offline Intelligence Cache', () => {
  it('executes Android TV TIF and Samsung Tizen break-session lifecycles while keeping LG webOS fail-closed without partner privilege', () => {
    const engine = new EdisonTvControlEngine();

    // Android TV TIF lifecycle: enter -> exit
    const androidEnter = engine.runBreakLifecycle({
      platformId: 'android_tv_tif',
      action: 'enter_ad_session',
    });
    expect(androidEnter.ok).toBe(true);
    expect(androidEnter.isSoftwareSimulationOnly).toBe(true);
    expect(androidEnter.hardwareTested).toBe(false);
    expect(androidEnter.harnessTelemetry.harnessName).toBe('AndroidTvTifHarness');
    expect(androidEnter.harnessTelemetry.harnessPhase).toBe('ad_overlay_active');
    expect(androidEnter.nextState.adBreakOverlayActive).toBe(true);
    expect(androidEnter.nextState.activeInput).toBe('EDISON_APP');

    const androidExit = engine.runBreakLifecycle({
      platformId: 'android_tv_tif',
      action: 'exit_to_ordinary_tv',
      currentState: androidEnter.nextState,
    });
    expect(androidExit.ok).toBe(true);
    expect(androidExit.harnessTelemetry.harnessPhase).toBe('yielded_to_ordinary');
    expect(androidExit.nextState.adBreakOverlayActive).toBe(false);
    expect(androidExit.nextState.activeInput).toBe('LIVE_TUNER');
    expect(androidExit.nextState.ordinaryTvIntact).toBe(true);

    // Samsung Tizen lifecycle
    const tizenEnter = engine.runBreakLifecycle({
      platformId: 'samsung_tizen',
      action: 'enter_ad_session',
    });
    expect(tizenEnter.ok).toBe(true);
    expect(tizenEnter.harnessTelemetry.harnessName).toBe('SamsungTizenHarness');
    expect(tizenEnter.nextState.adBreakOverlayActive).toBe(true);

    // LG webOS own-session overlay without partner privilege must fail closed cleanly
    const webOsEnter = engine.runBreakLifecycle({
      platformId: 'lg_webos',
      action: 'enter_ad_session',
    });
    expect(webOsEnter.ok).toBe(false);
    expect(webOsEnter.harnessTelemetry.harnessName).toBe('LgWebOsHarness');
    expect(webOsEnter.harnessTelemetry.harnessPhase).toBe('tuned_ordinary');
    expect(webOsEnter.nextState.adBreakOverlayActive).toBe(false);
    expect(webOsEnter.nextState.activeInput).toBe('LIVE_TUNER');
    expect(webOsEnter.nextState.ordinaryTvIntact).toBe(true);
  });

  it('passes the 16-case deterministic fault-injection suite across all 4 adapters and all 4 fault modes', () => {
    const engine = new EdisonTvControlEngine();
    const report = engine.runDeterministicFaultSuite();

    expect(report.isSoftwareSimulationOnly).toBe(true);
    expect(report.hardwareTested).toBe(false);
    expect(report.totalCases).toBe(ALL_TV_PLATFORM_IDS.length * 4);
    expect(report.passedCases).toBe(16);
    expect(report.allPassed).toBe(true);

    for (const c of report.cases) {
      expect(c.passed).toBe(true);
      expect(c.watchdogTriggered).toBe(true);
      expect(c.ordinaryTvIntact).toBe(true);
      expect(c.adOverlayCleared).toBe(true);
      expect(c.restoredInput).toBe('LIVE_TUNER');
    }
  });

  it('enforces SHA-256 manifest verification, scope isolation, anti-downgrade, atomic swap, and instant rollback in LocalOfflineIntelCacheEngine', () => {
    const cache = new LocalOfflineIntelCacheEngine();
    const initial = cache.getSnapshot();
    expect(initial.isSoftwareSimulationOnly).toBe(true);
    expect(initial.hardwareTested).toBe(false);
    expect(initial.zeroPiiEnforced).toBe(true);
    expect(initial.bundles.length).toBe(3);

    const targetScope = initial.bundles[0].scopeId;
    const baseVersion = initial.bundles[0].version;

    // 1. Corrupt manifest SHA must be rejected fail-closed without mutating active bundle
    const corrupt = cache.stageAndAtomicSwap({
      scopeId: targetScope,
      nextVersion: baseVersion + 1,
      p10BreakDurationSec: 85,
      p50BreakDurationSec: 120,
      switchingLatencyMs: 360,
      simulateCorruptManifest: true,
    });
    expect(corrupt.ok).toBe(false);
    expect(corrupt.atomicSwapApplied).toBe(false);
    expect(corrupt.rejectedReason).toContain('SHA-256 mismatch');
    expect(corrupt.bundle?.version).toBe(baseVersion);

    // 2. Cross-scope / unknown scope must fail closed
    const badScope = cache.stageAndAtomicSwap({
      scopeId: 'unknown_unisolated_scope',
      nextVersion: 10,
      p10BreakDurationSec: 85,
      p50BreakDurationSec: 120,
      switchingLatencyMs: 360,
    });
    expect(badScope.ok).toBe(false);
    expect(badScope.atomicSwapApplied).toBe(false);

    // 3. Anti-downgrade guard rejects version <= current
    const downgrade = cache.stageAndAtomicSwap({
      scopeId: targetScope,
      nextVersion: baseVersion,
      p10BreakDurationSec: 85,
      p50BreakDurationSec: 120,
      switchingLatencyMs: 360,
    });
    expect(downgrade.ok).toBe(false);

    // 4. Valid manifest applies atomic swap cleanly
    const swapped = cache.stageAndAtomicSwap({
      scopeId: targetScope,
      nextVersion: baseVersion + 1,
      p10BreakDurationSec: 85,
      p50BreakDurationSec: 120,
      switchingLatencyMs: 350,
    });
    expect(swapped.ok).toBe(true);
    expect(swapped.atomicSwapApplied).toBe(true);
    expect(swapped.bundle?.version).toBe(baseVersion + 1);
    expect(swapped.bundle?.previousGoodVersion).toBe(baseVersion);

    // 5. Instant rollback reverts to previousGoodVersion safely
    const rolled = cache.rollbackScope(targetScope);
    expect(rolled.ok).toBe(true);
    expect(rolled.bundle?.version).toBe(baseVersion);
    expect(rolled.bundle?.status).toBe('rolled_back_safe');
  });

  it('evaluates offline break feasibility safely and skips uncertain or insufficient breaks without interrupting TV', () => {
    const cache = new LocalOfflineIntelCacheEngine();
    const targetScope = cache.getSnapshot().bundles[0].scopeId; // P10=75s, latency=380ms -> switchOverhead=1s

    const allowed = cache.evaluateOfflineBreakEligibility({
      scopeId: targetScope,
      adDurationSeconds: 30,
      safetyBufferSeconds: 5,
    });
    expect(allowed.eligible).toBe(true);
    expect(allowed.availableP10Sec).toBe(75);
    expect(allowed.requiredTotalSec).toBe(36);

    const skippedTooLong = cache.evaluateOfflineBreakEligibility({
      scopeId: targetScope,
      adDurationSeconds: 90,
      safetyBufferSeconds: 5,
    });
    expect(skippedTooLong.eligible).toBe(false);
    expect(skippedTooLong.reason).toContain('Skipped break offline');

    const uncachedScope = cache.evaluateOfflineBreakEligibility({
      scopeId: 'non_existent_broadcaster_scope',
      adDurationSeconds: 15,
      safetyBufferSeconds: 5,
    });
    expect(uncachedScope.eligible).toBe(false);
    expect(uncachedScope.reason).toContain('fail closed');
  });
});
