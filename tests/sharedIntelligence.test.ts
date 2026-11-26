import { describe, expect, it } from 'vitest';
import {
  createInitialSharedIntelPreviewState,
  runSharedIntelSimulationAction,
  submitSharedIntelObservation,
} from '../src/server/sharedIntelligencePreview.ts';

describe('Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / ADR-016)', () => {
  it('identifies seeded device fixtures as a prototype simulation', () => {
    const state = createInitialSharedIntelPreviewState();

    expect(state.isPrototypeSimulation).toBe(true);
    expect(state.implementationNote).toContain('synthetic');
    expect(state.deviceCaches.every((device) => device.tvDeviceId.startsWith('sim_tv_'))).toBe(true);
  });

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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  SharedIntelFleetService,
  canonicalChannelScopeId,
  canonicalObservationSigningMessage,
  SIMULATED_DEFAULT_DECODER_PROFILE_ID,
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
      decoderProfileId: 'decoder-feed-a',
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

  it('shares fresh signed break events by stable channel across TVs and rejects replay, stale, PII, and conflicts', () => {
    const fleet = new SharedIntelFleetService();
    const nowMs = Date.now();
    const scope = fleet.getSnapshot().bundles[0].scope;
    const channelId = canonicalChannelScopeId(scope);
    const decoderProfileId = SIMULATED_DEFAULT_DECODER_PROFILE_ID;
    const firstBreakStartedAtUtc = new Date(nowMs - 30_000).toISOString();
    const firstInput = {
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: scope.scopeId,
      decoderProfileId,
      channelId,
      eventId: 'break-tv1-0001',
      breakStartedAtUtc: firstBreakStartedAtUtc,
      nonce: 'break_nonce_tv1_0001',
      useRegisteredDemoSigner: true,
      nowMs,
    };

    const first = fleet.submitSignedBreakEvent(firstInput);
    expect(first.httpStatus).toBe(201);
    expect(first.status).toBe('shared_pending_corroboration');
    expect(first.signatureVerified).toBe(true);
    expect(first.event?.containsPii).toBe(false);
    expect(first.isSoftwareSimulationOnly).toBe(true);
    expect(first.hardwareTested).toBe(false);

    const peerSync = fleet.getSharedBreakEvents({
      tvDeviceId: 'fleet_tv_gb_02',
      decoderProfileId,
      channelId,
      nowMs,
    });
    expect(peerSync.events).toHaveLength(1);
    expect(peerSync.events[0].sourceDeviceIds).toEqual(['fleet_tv_gb_01']);
    const expiredPeerSync = fleet.getSharedBreakEvents({
      tvDeviceId: 'fleet_tv_gb_02',
      decoderProfileId,
      channelId,
      nowMs: nowMs + 91_000,
    });
    expect(expiredPeerSync.events).toHaveLength(0);

    const replay = fleet.submitSignedBreakEvent(firstInput);
    expect(replay.httpStatus).toBe(401);
    expect(replay.status).toBe('rejected_replay');

    const sameSourceDuplicate = fleet.submitSignedBreakEvent({
      ...firstInput,
      eventId: 'break-tv1-duplicate',
      nonce: 'break_nonce_tv1_0002',
    });
    expect(sameSourceDuplicate.status).toBe('duplicate_ignored');
    expect(sameSourceDuplicate.event?.sourceDeviceIds).toEqual(['fleet_tv_gb_01']);

    const reusedEventId = fleet.submitSignedBreakEvent({
      ...firstInput,
      nonce: 'break_nonce_tv1_reused_id',
      breakStartedAtUtc: new Date(nowMs - 28_000).toISOString(),
    });
    expect(reusedEventId.httpStatus).toBe(409);
    expect(reusedEventId.status).toBe('rejected_event_id_reuse');

    const corroborated = fleet.submitSignedBreakEvent({
      ...firstInput,
      tvDeviceId: 'fleet_tv_gb_02',
      eventId: 'break-tv2-0001',
      breakStartedAtUtc: new Date(nowMs - 29_000).toISOString(),
      nonce: 'break_nonce_tv2_0001',
    });
    expect(corroborated.status).toBe('shared_corroborated');
    expect(corroborated.event?.sourceDeviceIds).toEqual([
      'fleet_tv_gb_01',
      'fleet_tv_gb_02',
    ]);

    const conflict = fleet.submitSignedBreakEvent({
      ...firstInput,
      tvDeviceId: 'fleet_tv_gb_03',
      eventId: 'break-tv3-conflict',
      breakStartedAtUtc: new Date(nowMs - 5_000).toISOString(),
      nonce: 'break_nonce_tv3_0001',
    });
    expect(conflict.httpStatus).toBe(409);
    expect(conflict.status).toBe('conflict_held');
    expect(
      fleet.getSharedBreakEvents({
        tvDeviceId: 'fleet_tv_gb_02',
        decoderProfileId,
        channelId,
        nowMs,
      }).events
    ).toHaveLength(0);

    const stale = fleet.submitSignedBreakEvent({
      ...firstInput,
      eventId: 'break-tv1-stale',
      breakStartedAtUtc: new Date(nowMs - 121_000).toISOString(),
      nonce: 'break_nonce_tv1_stale',
    });
    expect(stale.httpStatus).toBe(409);
    expect(stale.status).toBe('rejected_stale');

    const future = fleet.submitSignedBreakEvent({
      ...firstInput,
      eventId: 'break-tv1-future',
      breakStartedAtUtc: new Date(nowMs + 16_000).toISOString(),
      nonce: 'break_nonce_tv1_future',
    });
    expect(future.httpStatus).toBe(409);
    expect(future.status).toBe('rejected_stale');

    const wrongChannel = fleet.submitSignedBreakEvent({
      ...firstInput,
      eventId: 'break-tv1-wrong-channel',
      channelId: 'gb.sky-news',
      nonce: 'break_nonce_tv1_wrong_channel',
    });
    expect(wrongChannel.httpStatus).toBe(409);
    expect(wrongChannel.status).toBe('rejected_scope_mismatch');

    const pii = fleet.submitSignedBreakEvent({
      ...firstInput,
      eventId: 'break-tv1-pii',
      nonce: 'break_nonce_tv1_pii',
      rawPayload: { householdId: 'hh_private_1' },
    });
    expect(pii.httpStatus).toBe(400);
    expect(pii.status).toBe('rejected_pii');
    expect(pii.containsPii).toBe(false);

    const throttledFleet = new SharedIntelFleetService();
    const rateLimited = Array.from({ length: 9 }, (_, index) =>
      throttledFleet.submitSignedBreakEvent({
        ...firstInput,
        eventId: `break-rate-${index}`,
        breakStartedAtUtc: new Date(nowMs - 1_000).toISOString(),
        nonce: `break_rate_nonce_${index}`,
        nowMs,
      })
    );
    expect(rateLimited[7].httpStatus).not.toBe(429);
    expect(rateLimited[8].httpStatus).toBe(429);
    expect(rateLimited[8].status).toBe('rate_limited');
  });

  it('isolates same-channel break events between decoder profiles', () => {
    const fleet = new SharedIntelFleetService();
    const nowMs = Date.now();
    const scope = fleet.getSnapshot().bundles[0].scope;
    const channelId = canonicalChannelScopeId(scope);

    for (const [tvDeviceId, decoderProfileId] of [
      ['decoder_a_source', 'decoder-feed-a'],
      ['decoder_a_receiver', 'decoder-feed-a'],
      ['decoder_b_receiver', 'decoder-feed-b'],
    ]) {
      fleet.registerAttestedDevice({
        tvDeviceId,
        decoderProfileId,
        platform: scope.platform,
        country: scope.country,
        assignedScopeId: scope.scopeId,
      });
    }

    const eventInput = {
      tvDeviceId: 'decoder_a_source',
      scopeId: scope.scopeId,
      decoderProfileId: 'decoder-feed-a',
      channelId,
      eventId: 'decoder-a-break-0001',
      breakStartedAtUtc: new Date(nowMs - 1_000).toISOString(),
      nonce: 'decoder-a-break-nonce',
      useRegisteredDemoSigner: true,
      nowMs,
    };
    expect(fleet.submitSignedBreakEvent(eventInput).status).toBe(
      'shared_pending_corroboration'
    );

    const matchingProfile = fleet.getSharedBreakEvents({
      tvDeviceId: 'decoder_a_receiver',
      decoderProfileId: 'decoder-feed-a',
      channelId,
      nowMs,
    });
    expect(matchingProfile.events.map((event) => event.eventId)).toEqual([
      eventInput.eventId,
    ]);

    const otherProfileSubmission = fleet.submitSignedBreakEvent({
      ...eventInput,
      tvDeviceId: 'decoder_b_receiver',
      decoderProfileId: 'decoder-feed-b',
      eventId: 'decoder-b-break-0001',
      nonce: 'decoder-b-break-nonce',
    });
    expect(otherProfileSubmission.status).toBe('shared_pending_corroboration');

    const otherProfile = fleet.getSharedBreakEvents({
      tvDeviceId: 'decoder_b_receiver',
      decoderProfileId: 'decoder-feed-b',
      channelId,
      nowMs,
    });
    expect(otherProfile.ok).toBe(true);
    expect(otherProfile.events.map((event) => event.eventId)).toEqual([
      'decoder-b-break-0001',
    ]);

    expect(
      fleet
        .getSharedBreakEvents({
          tvDeviceId: 'decoder_a_receiver',
          decoderProfileId: 'decoder-feed-a',
          channelId,
          nowMs,
        })
        .events.map((event) => event.eventId)
    ).toEqual([eventInput.eventId]);

    const mismatchedSubmission = fleet.submitSignedBreakEvent({
      ...eventInput,
      eventId: 'decoder-a-wrong-profile',
      decoderProfileId: 'decoder-feed-b',
      nonce: 'decoder-a-wrong-profile-nonce',
    });
    expect(mismatchedSubmission.status).toBe('rejected_scope_mismatch');
    expect(mismatchedSubmission.httpStatus).toBe(409);
  });

  it('encrypts break-event state and device keys across service restarts and fails closed on a wrong key', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-fleet-state-'));
    const persistencePath = path.join(tempDir, 'shared-intel.enc');
    const encryptionKeyHex = crypto.randomBytes(32).toString('hex');
    const options = { persistencePath, encryptionKeyHex };

    try {
      const firstProcess = new SharedIntelFleetService(options);
      const nowMs = Date.now();
      const scope = firstProcess.getSnapshot().bundles[0].scope;
      const channelId = canonicalChannelScopeId(scope);
      const externalKeypair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      firstProcess.registerAttestedDevice({
        tvDeviceId: 'durable_external_tv',
        decoderProfileId: 'decoder-feed-a',
        platform: scope.platform,
        country: scope.country,
        assignedScopeId: scope.scopeId,
        publicKeyPem: externalKeypair.publicKey,
      });
      const eventInput = {
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: scope.scopeId,
        decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
        channelId,
        eventId: 'durable-break-0001',
        breakStartedAtUtc: new Date(nowMs - 1_000).toISOString(),
        nonce: 'durable-break-nonce-1',
        useRegisteredDemoSigner: true,
        nowMs,
      };

      expect(firstProcess.submitSignedBreakEvent(eventInput).status).toBe(
        'shared_pending_corroboration'
      );
      const observationInput = {
        tvDeviceId: 'durable_external_tv',
        scopeId: scope.scopeId,
        signalType: 'scte35' as const,
        estimatedBreakDurationSec: 112,
        transitionLatencyMs: 365,
        nonce: 'durable-observation-nonce-1',
      };
      const observationSignature = crypto
        .sign(
          null,
          Buffer.from(canonicalObservationSigningMessage(observationInput), 'utf8'),
          externalKeypair.privateKey
        )
        .toString('hex');
      expect(
        firstProcess.submitSignedObservation({
          ...observationInput,
          signatureHex: observationSignature,
        }).ok
      ).toBe(true);
      const initialSnapshot = firstProcess.getSnapshot();
      const encryptedFile = fs.readFileSync(persistencePath, 'utf8');
      expect(JSON.parse(encryptedFile).version).toBe(2);
      expect(encryptedFile).not.toContain('BEGIN PRIVATE KEY');
      expect(encryptedFile).not.toContain(eventInput.eventId);
      expect(encryptedFile).not.toContain('durable_external_tv');

      const restartedProcess = new SharedIntelFleetService(options);
      const restoredSnapshot = restartedProcess.getSnapshot();
      expect(restoredSnapshot.signingPublicKeyPem).toBe(
        firstProcess.getSnapshot().signingPublicKeyPem
      );
      expect(restoredSnapshot.breakEventPersistence).toBe('encrypted_local_file');
      expect(restoredSnapshot.breakEventsRestartDurable).toBe(true);
      expect(restoredSnapshot.bundles[0].version).toBe(initialSnapshot.bundles[0].version);
      expect(restoredSnapshot.bundles[0].bundleSignatureHex).toBe(
        initialSnapshot.bundles[0].bundleSignatureHex
      );
      expect(
        restoredSnapshot.devices.find((device) => device.tvDeviceId === 'durable_external_tv')
          ?.publicKeyPem
      ).toBe(externalKeypair.publicKey.trim());
      expect(
        restoredSnapshot.recentObservations.map((observation) => observation.tvDeviceId)
      ).toContain('durable_external_tv');
      expect(
        restartedProcess.syncScopedDelta({
          tvDeviceId: 'fleet_tv_gb_01',
          scopeId: scope.scopeId,
          clientPlatform: scope.platform,
          clientCountry: scope.country,
          knownVersion: 0,
        }).signatureValid
      ).toBe(true);
      expect(
        restartedProcess.getSharedBreakEvents({
          tvDeviceId: 'fleet_tv_gb_02',
          decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
          channelId,
          nowMs,
        }).events.map((event) => event.eventId)
      ).toEqual([eventInput.eventId]);
      expect(restartedProcess.submitSignedBreakEvent(eventInput).status).toBe(
        'rejected_replay'
      );
      expect(
        restartedProcess.submitSignedObservation({
          ...observationInput,
          signatureHex: observationSignature,
        }).httpStatus
      ).toBe(401);

      const stateBeforeWrongKey = fs.readFileSync(persistencePath, 'utf8');
      expect(
        () =>
          new SharedIntelFleetService({
            persistencePath,
            encryptionKeyHex: crypto.randomBytes(32).toString('hex'),
          })
      ).toThrow();
      expect(fs.existsSync(persistencePath)).toBe(true);
      expect(fs.readFileSync(persistencePath, 'utf8')).toBe(stateBeforeWrongKey);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('restores legacy persisted break state without decoder-profile fields', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-fleet-legacy-state-'));
    const persistencePath = path.join(tempDir, 'shared-intel.enc');
    const encryptionKeyHex = crypto.randomBytes(32).toString('hex');
    const options = { persistencePath, encryptionKeyHex };

    try {
      const originalService = new SharedIntelFleetService(options);
      const nowMs = Date.now();
      const scope = originalService.getSnapshot().bundles[0].scope;
      const channelId = canonicalChannelScopeId(scope);
      const eventInput = {
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: scope.scopeId,
        decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
        channelId,
        eventId: 'legacy-profile-break-0001',
        breakStartedAtUtc: new Date(nowMs - 1_000).toISOString(),
        nonce: 'legacy-profile-break-nonce',
        useRegisteredDemoSigner: true,
        nowMs,
      };
      expect(originalService.submitSignedBreakEvent(eventInput).ok).toBe(true);

      const envelope = JSON.parse(fs.readFileSync(persistencePath, 'utf8')) as {
        format: string;
        version: number;
        iv: string;
        authTag: string;
        ciphertext: string;
      };
      const aad = Buffer.from('EDISON_SHARED_INTEL_STATE:v1', 'utf8');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(encryptionKeyHex, 'hex'),
        Buffer.from(envelope.iv, 'base64')
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
      const state = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
          decipher.final(),
        ]).toString('utf8')
      ) as {
        devices: Array<Record<string, unknown>>;
        breakEvents: Array<[string, Record<string, unknown>]>;
      };
      state.devices.forEach((device) => delete device.decoderProfileId);
      state.breakEvents.forEach(([, event]) => delete event.decoderProfileId);

      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKeyHex, 'hex'), iv);
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(state), 'utf8'),
        cipher.final(),
      ]);
      fs.writeFileSync(
        persistencePath,
        JSON.stringify({
          format: envelope.format,
          version: envelope.version,
          iv: iv.toString('base64'),
          authTag: cipher.getAuthTag().toString('base64'),
          ciphertext: ciphertext.toString('base64'),
        })
      );

      const restoredService = new SharedIntelFleetService(options);
      const restoredSnapshot = restoredService.getSnapshot();
      expect(
        restoredSnapshot.devices.find((device) => device.tvDeviceId === 'fleet_tv_gb_02')
          ?.decoderProfileId
      ).toBe('legacy_default_decoder');
      expect(
        restoredService.getSharedBreakEvents({
          tvDeviceId: 'fleet_tv_gb_02',
          decoderProfileId: 'legacy_default_decoder',
          channelId,
          nowMs,
        }).events.map((event) => event.eventId)
      ).toEqual([eventInput.eventId]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rotates the local persistence key without losing fleet state or overwriting on invalid input', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-fleet-key-rotation-'));
    const persistencePath = path.join(tempDir, 'shared-intel.enc');
    const currentKeyHex = crypto.randomBytes(32).toString('hex');
    const nextKeyHex = crypto.randomBytes(32).toString('hex');

    try {
      const fleet = new SharedIntelFleetService({ persistencePath, encryptionKeyHex: currentKeyHex });
      const snapshotBeforeRotation = fleet.getSnapshot();
      const currentFile = fs.readFileSync(persistencePath, 'utf8');

      expect(() => fleet.rotatePersistenceKey('not-a-32-byte-key')).toThrow(/64 hex chars/);
      expect(fs.readFileSync(persistencePath, 'utf8')).toBe(currentFile);
      expect(() => fleet.rotatePersistenceKey(currentKeyHex)).toThrow(/must differ/);
      expect(fs.readFileSync(persistencePath, 'utf8')).toBe(currentFile);

      fleet.rotatePersistenceKey(nextKeyHex);
      const rotatedFile = fs.readFileSync(persistencePath, 'utf8');
      expect(rotatedFile).not.toBe(currentFile);

      const restored = new SharedIntelFleetService({
        persistencePath,
        encryptionKeyHex: nextKeyHex,
      }).getSnapshot();
      const stateBeforeOldKeyAttempt = fs.readFileSync(persistencePath, 'utf8');
      expect(restored.signingPublicKeyPem).toBe(snapshotBeforeRotation.signingPublicKeyPem);
      expect(restored.bundles).toEqual(snapshotBeforeRotation.bundles);
      expect(restored.devices).toEqual(snapshotBeforeRotation.devices);

      expect(
        () =>
          new SharedIntelFleetService({
            persistencePath,
            encryptionKeyHex: currentKeyHex,
          })
      ).toThrow();
      expect(fs.readFileSync(persistencePath, 'utf8')).toBe(stateBeforeOldKeyAttempt);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

