import { describe, expect, it } from 'vitest';
import {
  createInitialSharedIntelPreviewState,
  runSharedIntelSimulationAction,
  submitSharedIntelObservation,
} from '../src/server/sharedIntelligencePreview.ts';

describe('Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / ADR-016)', () => {
  it('holds a single TV observation in quarantine and prevents Sybil self-corroboration', () => {
    const init = createInitialSharedIntelPreviewState();
    const targetScope = init.bundles[0].scope.scopeId;
    const initialVersion = init.bundles[0].version;

    // 1. Single TV submits observation -> held at 1/3, active version unchanged
    const first = submitSharedIntelObservation(init, {
      tvDeviceId: 'tv_alpha_1',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 120,
      transitionLatencyMs: 360,
    });
    expect(first.observation.trustDecision).toBe('quarantined_pending_quorum');
    expect(first.bundle.version).toBe(initialVersion);
    expect(first.bundle.pendingObservations).toBe(1);

    // 2. Same TV submits 2 more times (Sybil duplicate) -> quorum MUST remain 1/3
    const repeat = submitSharedIntelObservation(first.nextState, {
      tvDeviceId: 'tv_alpha_1',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 120,
      transitionLatencyMs: 360,
    });
    expect(repeat.observation.trustDecision).toBe('quarantined_pending_quorum');
    expect(repeat.bundle.version).toBe(initialVersion);
  });

  it('promotes new bundle only after 3 distinct TVs corroborate and keeps incompatible scopes isolated', () => {
    let state = createInitialSharedIntelPreviewState();
    const bbcScope = state.bundles[0].scope.scopeId;
    const otherScopeCacheBefore = state.deviceCaches[1].cachedSha256;
    const otherScopeVerBefore = state.deviceCaches[1].cachedBundleVersion;

    state = submitSharedIntelObservation(state, {
      tvDeviceId: 'tv_distinct_1',
      scopeId: bbcScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 118,
      transitionLatencyMs: 370,
    }).nextState;
    state = submitSharedIntelObservation(state, {
      tvDeviceId: 'tv_distinct_2',
      scopeId: bbcScope,
      signalType: 'hbbtv',
      estimatedBreakDurationSec: 122,
      transitionLatencyMs: 380,
    }).nextState;
    const third = submitSharedIntelObservation(state, {
      tvDeviceId: 'tv_distinct_3',
      scopeId: bbcScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 120,
      transitionLatencyMs: 365,
    });

    expect(third.observation.trustDecision).toBe('accepted_corroborated');
    expect(third.bundle.status).toBe('corroborated_published');
    expect(third.bundle.version).toBe(4);
    expect(third.nextState.deviceCaches[0].cachedBundleVersion).toBe(4);
    // Incompatible Tizen / webOS caches remain strictly isolated
    expect(third.nextState.deviceCaches[1].cachedBundleVersion).toBe(otherScopeVerBefore);
    expect(third.nextState.deviceCaches[1].cachedSha256).toBe(otherScopeCacheBefore);
  });

  it('rejects outlier poison attempts, blocks PII payloads, supports offline queue & triggers FPR auto-rollback', () => {
    let state = createInitialSharedIntelPreviewState();
    const targetScope = state.bundles[0].scope.scopeId;

    // 1. Outlier poison rejected cleanly
    const poisoned = runSharedIntelSimulationAction(state, {
      action: 'inject_outlier_poison',
      scopeId: targetScope,
    });
    expect(poisoned.observations[0].trustDecision).toBe('rejected_outlier');
    expect(poisoned.bundles[0].version).toBe(3);

    // 2. Zero PII guardrail blocks household/profile/email fields
    expect(() =>
      submitSharedIntelObservation(poisoned, {
        tvDeviceId: 'tv_pii_test',
        scopeId: targetScope,
        signalType: 'scte35',
        estimatedBreakDurationSec: 95,
        transitionLatencyMs: 350,
        rawPayload: { householdId: 'hh_01', email: 'viewer@example.org' },
      })
    ).toThrow(/ZERO-PII GUARDRAIL/);

    // 3. Offline TV continues on Local Cache and queues observations until synced online
    state = runSharedIntelSimulationAction(poisoned, {
      action: 'toggle_offline',
      tvDeviceId: 'sim_tv_gb_01',
    });
    expect(state.deviceCaches[0].offlineMode).toBe(true);

    const queued = submitSharedIntelObservation(state, {
      tvDeviceId: 'sim_tv_gb_01',
      scopeId: targetScope,
      signalType: 'channel_cadence',
      estimatedBreakDurationSec: 90,
      transitionLatencyMs: 390,
    });
    expect(queued.observation.trustDecision).toBe('queued_offline');
    expect(queued.nextState.deviceCaches[0].queuedObservationsCount).toBe(1);

    state = runSharedIntelSimulationAction(queued.nextState, {
      action: 'toggle_offline',
      tvDeviceId: 'sim_tv_gb_01',
    });
    state = runSharedIntelSimulationAction(state, {
      action: 'sync_cache',
      tvDeviceId: 'sim_tv_gb_01',
    });
    expect(state.deviceCaches[0].queuedObservationsCount).toBe(0);

    // 4. FPR spike rollback restores previousGoodVersion automatically
    state = runSharedIntelSimulationAction(state, {
      action: 'corroborate_quorum',
      scopeId: targetScope,
    });
    expect(state.bundles[0].version).toBe(4);
    state = runSharedIntelSimulationAction(state, {
      action: 'simulate_fpr_spike_rollback',
      scopeId: targetScope,
    });
    expect(state.bundles[0].status).toBe('rolled_back');
    expect(state.bundles[0].version).toBe(3);
    expect(state.deviceCaches[0].cachedBundleVersion).toBe(3);
    expect(state.deviceCaches[0].fallbackStatus).toBe('rollback_restored');
  });
});

import crypto from 'node:crypto';
import {
  SharedIntelFleetService,
  canonicalObservationSigningMessage,
} from '../src/server/sharedIntelFleetService.ts';

describe('Phase 5 Block 5.1: Shared Ad Intelligence Fleet Service & Scenarios 25–35 (ADR-016)', () => {
  it('passes all 11 Scenarios 25–35 deterministically with zero PII and hardwareTested=false', () => {
    const fleet = new SharedIntelFleetService();
    const report = fleet.runScenarios25To35Suite();

    expect(report.totalScenarios).toBe(11);
    expect(report.passedScenarios).toBe(11);
    expect(report.allPassed).toBe(true);
    expect(report.zeroPiiVerified).toBe(true);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });

  it('verifies external Ed25519 key registration, rejects spoofed/replayed signatures (401), and holds conflicting clusters', () => {
    const fleet = new SharedIntelFleetService();
    const scopeId = fleet.getSnapshot().bundles[0].scope.scopeId;
    const keypair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const reg = fleet.registerAttestedDevice({
      tvDeviceId: 'ext_ed25519_tv_01',
      platform: 'Android TV 14',
      country: 'GB',
      assignedScopeId: scopeId,
      publicKeyPem: keypair.publicKey,
    });
    expect(reg.device.status).toBe('attested_active');
    expect(reg.signingHelperAvailable).toBe(false);

    const payload = {
      tvDeviceId: 'ext_ed25519_tv_01',
      scopeId,
      signalType: 'scte35' as const,
      estimatedBreakDurationSec: 112,
      transitionLatencyMs: 365,
      nonce: 'ext_nonce_1',
    };
    const sigHex = crypto
      .sign(null, Buffer.from(canonicalObservationSigningMessage(payload), 'utf8'), keypair.privateKey)
      .toString('hex');

    const acceptedFirst = fleet.submitSignedObservation({
      ...payload,
      signatureHex: sigHex,
    });
    expect(acceptedFirst.ok).toBe(true);
    expect(acceptedFirst.signatureVerified).toBe(true);
    expect(acceptedFirst.trustDecision).toBe('quarantined_pending_quorum');

    // Nonce replay must fail with HTTP 401
    const replayRes = fleet.submitSignedObservation({
      ...payload,
      signatureHex: sigHex,
    });
    expect(replayRes.ok).toBe(false);
    expect(replayRes.httpStatus).toBe(401);

    // Conflicting observation from another attested device reduces confidence without mutating published version
    const conflicting = fleet.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_02',
      scopeId,
      signalType: 'av_pattern',
      estimatedBreakDurationSec: 45,
      transitionLatencyMs: 410,
      nonce: 'conflict_nonce_2',
      useRegisteredDemoSigner: true,
    });
    expect(conflicting.trustDecision).toBe('conflicting_held');
    expect(fleet.getSnapshot().bundles[0].status).toBe('conflict_split_held');
    expect(fleet.getSnapshot().bundles[0].version).toBe(3);
  });
});

