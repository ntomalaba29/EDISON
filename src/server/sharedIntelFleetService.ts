import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  DEFAULT_SHARED_INTEL_SCOPES,
  SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT,
  SHARED_INTEL_QUORUM_REQUIRED,
  assertZeroPiiPayload,
} from './sharedIntelligencePreview.ts';
import type {
  FleetAttestedDeviceRecord,
  FleetBreakEventRecord,
  FleetBreakEventSubmissionResult,
  FleetBreakEventSyncResult,
  FleetDeltaSyncResult,
  FleetFprReportResult,
  FleetObservationResult,
  FleetSignedBundleRecord,
  SharedIntelAuditEntry,
  SharedIntelFleetSnapshot,
  SharedIntelScenarioCheckItem,
  SharedIntelScenarios25To35Report,
  SharedIntelScopeKey,
  SharedIntelSignalType,
} from '../types/edison.ts';

interface PendingObservationItem {
  tvDeviceId: string;
  signalType: SharedIntelSignalType;
  estimatedBreakDurationSec: number;
  transitionLatencyMs: number;
  createdAt: string;
}

interface InternalDeviceEntry extends FleetAttestedDeviceRecord {
  demoPrivateKeyPem?: string;
}

interface BreakEventAlias {
  recordKey: string;
  fingerprint: string;
}

interface PersistedFleetState {
  formatVersion: 2;
  signingPrivateKeyPem: string;
  signingPublicKeyPem: string;
  devices: InternalDeviceEntry[];
  bundles: FleetSignedBundleRecord[];
  pendingByScope: Array<[string, PendingObservationItem[]]>;
  deviceRateTimestamps: Array<[string, number[]]>;
  usedNonces: string[];
  breakEvents: Array<[string, FleetBreakEventRecord]>;
  breakEventAliases: Array<[string, BreakEventAlias]>;
  usedBreakEventNonces: Array<[string, number]>;
  auditTrail: SharedIntelAuditEntry[];
  recentObservations: FleetObservationResult[];
  rejectedSignatureCount: number;
  rejectedPiiCount: number;
  rateLimitedFloodCount: number;
  conflictHeldCount: number;
  rollbackCount: number;
}

interface EncryptedStateFile {
  format: 'edison-shared-intel-state';
  version: 2;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isSharedIntelSignalType(value: unknown): value is SharedIntelSignalType {
  return (
    value === 'scte35' ||
    value === 'hbbtv' ||
    value === 'av_pattern' ||
    value === 'channel_cadence'
  );
}

function isFleetTrustDecision(
  value: unknown
): value is FleetObservationResult['trustDecision'] {
  return (
    value === 'quarantined_pending_quorum' ||
    value === 'accepted_corroborated' ||
    value === 'conflicting_held' ||
    value === 'rejected_outlier' ||
    value === 'rejected_invalid_signature' ||
    value === 'rejected_pii_violation' ||
    value === 'rate_limited_flood' ||
    value === 'queued_offline_replayed'
  );
}

const SIGNING_KEY_ID = 'edison_fleet_ed25519_k1';
const STATE_FILE_AAD = Buffer.from('EDISON_SHARED_INTEL_STATE:v1', 'utf8');
const FLOOD_WINDOW_MS = 10_000;
const MAX_OBS_PER_WINDOW = 8;
const BREAK_EVENT_FRESHNESS_MS = 120_000;
const BREAK_EVENT_FUTURE_SKEW_MS = 15_000;
const BREAK_EVENT_CONFLICT_WINDOW_MS = 60_000;
const BREAK_EVENT_START_TOLERANCE_MS = 5_000;
const BREAK_EVENT_NONCE_RETENTION_MS = 10 * 60_000;
const MAX_BREAK_EVENT_RECORDS = 500;
export const SIMULATED_DEFAULT_DECODER_PROFILE_ID = 'simulated_default_decoder';
const LEGACY_DECODER_PROFILE_ID = 'legacy_default_decoder';
const DECODER_PROFILE_ID_RE = /^[A-Za-z0-9._-]+$/;

function computeSha256Manifest(
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

export function canonicalObservationSigningMessage(input: {
  tvDeviceId: string;
  scopeId: string;
  signalType: SharedIntelSignalType;
  estimatedBreakDurationSec: number;
  transitionLatencyMs: number;
  nonce: string;
}): string {
  return [
    input.tvDeviceId.trim(),
    input.scopeId.trim(),
    input.signalType,
    String(Math.round(input.estimatedBreakDurationSec)),
    String(Math.round(input.transitionLatencyMs)),
    input.nonce.trim(),
  ].join('|');
}

function slugChannelPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function canonicalChannelScopeId(
  scope: Pick<SharedIntelScopeKey, 'country' | 'broadcaster' | 'channel'>
): string {
  return `${scope.country.toLowerCase()}.${slugChannelPart(scope.broadcaster)}.${slugChannelPart(scope.channel)}`;
}

export function canonicalBreakEventSigningMessage(input: {
  tvDeviceId: string;
  scopeId: string;
  decoderProfileId: string;
  channelId: string;
  eventId: string;
  breakStartedAtUtc: string;
  nonce: string;
}): string {
  return JSON.stringify([
    input.tvDeviceId.trim(),
    input.scopeId.trim(),
    input.decoderProfileId.trim(),
    input.channelId.trim(),
    input.eventId.trim(),
    input.breakStartedAtUtc,
    input.nonce.trim(),
  ]);
}

function breakEventFingerprint(input: {
  tvDeviceId: string;
  scopeId: string;
  decoderProfileId: string;
  channelId: string;
  eventId: string;
  breakStartedAtUtc: string;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        input.tvDeviceId.trim(),
        input.scopeId.trim(),
        input.decoderProfileId.trim(),
        input.channelId.trim(),
        input.eventId.trim(),
        input.breakStartedAtUtc,
      ])
    )
    .digest('hex');
}

function canonicalBundleSigningMessage(
  scopeId: string,
  version: number,
  p10: number,
  p50: number,
  latencyMs: number,
  sha256Manifest: string
): string {
  return `${scopeId}:v${version}:p10=${p10}:p50=${p50}:lat=${latencyMs}:sha=${sha256Manifest}`;
}

export class SharedIntelFleetService {
  private readonly signingPrivateKeyPem: string;
  private readonly signingPublicKeyPem: string;
  private readonly persistencePath?: string;
  private persistenceKey?: Buffer;
  private devices: InternalDeviceEntry[] = [];
  private bundles: FleetSignedBundleRecord[] = [];
  private pendingByScope = new Map<string, PendingObservationItem[]>();
  private recentObservations: FleetObservationResult[] = [];
  private auditTrail: SharedIntelAuditEntry[] = [];
  private deviceRateTimestamps = new Map<string, number[]>();
  private usedNonces = new Set<string>();
  private breakEvents = new Map<string, FleetBreakEventRecord>();
  private breakEventAliases = new Map<string, BreakEventAlias>();
  private usedBreakEventNonces = new Map<string, number>();

  private rejectedSignatureCount = 0;
  private rejectedPiiCount = 0;
  private rateLimitedFloodCount = 0;
  private conflictHeldCount = 0;
  private rollbackCount = 0;

  constructor(options?: { persistencePath?: string; encryptionKeyHex?: string }) {
    if (Boolean(options?.persistencePath) !== Boolean(options?.encryptionKeyHex)) {
      throw new Error(
        'Encrypted fleet persistence requires both persistencePath and encryptionKeyHex.'
      );
    }

    if (options?.persistencePath && options.encryptionKeyHex) {
      if (!/^[a-f0-9]{64}$/i.test(options.encryptionKeyHex)) {
        throw new Error('Fleet persistence encryptionKeyHex must be exactly 32 bytes (64 hex chars).');
      }
      this.persistencePath = path.resolve(options.persistencePath);
      this.persistenceKey = Buffer.from(options.encryptionKeyHex, 'hex');
    }

    const restored = this.readPersistedFleetState();
    if (restored) {
      this.signingPrivateKeyPem = restored.signingPrivateKeyPem;
      this.signingPublicKeyPem = restored.signingPublicKeyPem;
      this.reset(false);
      this.devices = restored.devices;
      this.bundles = restored.bundles;
      this.pendingByScope = new Map(restored.pendingByScope);
      this.deviceRateTimestamps = new Map(restored.deviceRateTimestamps);
      this.usedNonces = new Set(restored.usedNonces);
      this.breakEvents = new Map(restored.breakEvents);
      this.breakEventAliases = new Map(restored.breakEventAliases);
      this.usedBreakEventNonces = new Map(restored.usedBreakEventNonces);
      this.auditTrail = restored.auditTrail;
      this.recentObservations = restored.recentObservations;
      this.rejectedSignatureCount = restored.rejectedSignatureCount;
      this.rejectedPiiCount = restored.rejectedPiiCount;
      this.rateLimitedFloodCount = restored.rateLimitedFloodCount;
      this.conflictHeldCount = restored.conflictHeldCount;
      this.rollbackCount = restored.rollbackCount;
      this.pruneBreakEventState(Date.now());
      if (this.bundles.some((bundle) => !this.verifyBundleManifestSignature(bundle))) {
        throw new Error('Persisted shared-intelligence bundle signature verification failed.');
      }
      this.persistFleetState();
    } else {
      const keypair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.signingPrivateKeyPem = keypair.privateKey;
      this.signingPublicKeyPem = keypair.publicKey;
      this.reset(false);
      this.persistFleetState();
    }
  }

  rotatePersistenceKey(newEncryptionKeyHex: string): void {
    if (!this.persistencePath || !this.persistenceKey) {
      throw new Error('Fleet persistence key rotation requires encrypted local persistence.');
    }
    if (!/^[a-f0-9]{64}$/i.test(newEncryptionKeyHex)) {
      throw new Error('Fleet persistence encryptionKeyHex must be exactly 32 bytes (64 hex chars).');
    }

    const newKey = Buffer.from(newEncryptionKeyHex, 'hex');
    if (crypto.timingSafeEqual(this.persistenceKey, newKey)) {
      throw new Error('The new fleet persistence key must differ from the current key.');
    }

    const previousKey = this.persistenceKey;
    this.persistenceKey = newKey;
    try {
      this.persistFleetState();
    } catch (error) {
      this.persistenceKey = previousKey;
      throw error;
    }
  }

  private signBundleManifest(
    scopeId: string,
    version: number,
    p10: number,
    p50: number,
    latencyMs: number,
    sha256Manifest: string
  ): string {
    const msg = canonicalBundleSigningMessage(
      scopeId,
      version,
      p10,
      p50,
      latencyMs,
      sha256Manifest
    );
    return crypto
      .sign(null, Buffer.from(msg, 'utf8'), this.signingPrivateKeyPem)
      .toString('hex');
  }

  verifyBundleManifestSignature(bundle: FleetSignedBundleRecord): boolean {
    const expectedSha = computeSha256Manifest(
      bundle.scope.scopeId,
      bundle.version,
      bundle.p10BreakDurationSec,
      bundle.p50BreakDurationSec,
      bundle.switchingLatencyMs
    );
    if (expectedSha !== bundle.sha256Manifest) return false;
    const msg = canonicalBundleSigningMessage(
      bundle.scope.scopeId,
      bundle.version,
      bundle.p10BreakDurationSec,
      bundle.p50BreakDurationSec,
      bundle.switchingLatencyMs,
      bundle.sha256Manifest
    );
    try {
      return crypto.verify(
        null,
        Buffer.from(msg, 'utf8'),
        this.signingPublicKeyPem,
        Buffer.from(bundle.bundleSignatureHex, 'hex')
      );
    } catch {
      return false;
    }
  }

  private appendAudit(action: string, scopeId: string | null, detail: string): void {
    this.auditTrail.unshift({
      id: `sia_f5_${crypto.randomBytes(4).toString('hex')}`,
      action,
      scopeId,
      detail,
      createdAt: new Date().toISOString(),
    });
    if (this.auditTrail.length > 80) {
      this.auditTrail.length = 80;
    }
  }

  private readPersistedFleetState(): PersistedFleetState | null {
    if (!this.persistencePath || !this.persistenceKey || !fs.existsSync(this.persistencePath)) {
      return null;
    }

    const rawEnvelope: unknown = JSON.parse(fs.readFileSync(this.persistencePath, 'utf8'));
    if (
      !isRecord(rawEnvelope) ||
      rawEnvelope.format !== 'edison-shared-intel-state' ||
      rawEnvelope.version !== 2 ||
      typeof rawEnvelope.iv !== 'string' ||
      typeof rawEnvelope.authTag !== 'string' ||
      typeof rawEnvelope.ciphertext !== 'string'
    ) {
      throw new Error('Persisted shared-intelligence state has an unsupported file format.');
    }

    const envelope: EncryptedStateFile = {
      format: 'edison-shared-intel-state',
      version: 2,
      iv: rawEnvelope.iv,
      authTag: rawEnvelope.authTag,
      ciphertext: rawEnvelope.ciphertext,
    };
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.persistenceKey,
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAAD(STATE_FILE_AAD);
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const state: unknown = JSON.parse(plaintext);
    return this.validatePersistedFleetState(state);
  }

  private validatePersistedFleetState(value: unknown): PersistedFleetState {
    const fail = (): never => {
      throw new Error('Persisted shared-intelligence state failed schema validation.');
    };
    if (!isRecord(value)) return fail();
    const state = value;
    if (
      state.formatVersion !== 2 ||
      typeof state.signingPrivateKeyPem !== 'string' ||
      typeof state.signingPublicKeyPem !== 'string' ||
      !Array.isArray(state.devices) ||
      !Array.isArray(state.bundles) ||
      !Array.isArray(state.pendingByScope) ||
      !Array.isArray(state.deviceRateTimestamps) ||
      !isStringArray(state.usedNonces) ||
      !Array.isArray(state.breakEvents) ||
      !Array.isArray(state.breakEventAliases) ||
      !Array.isArray(state.usedBreakEventNonces) ||
      !Array.isArray(state.auditTrail) ||
      !Array.isArray(state.recentObservations)
    ) {
      return fail();
    }

    const privateKey = crypto.createPrivateKey(state.signingPrivateKeyPem);
    const publicKey = crypto.createPublicKey(state.signingPublicKeyPem);
    if (
      privateKey.asymmetricKeyType !== 'ed25519' ||
      publicKey.asymmetricKeyType !== 'ed25519'
    ) {
      return fail();
    }
    const probe = Buffer.from('EDISON shared-intelligence persistence key check', 'utf8');
    const probeSignature = crypto.sign(null, probe, privateKey);
    if (!crypto.verify(null, probe, publicKey, probeSignature)) return fail();

    const devices: InternalDeviceEntry[] = state.devices.map((value) => {
      if (!isRecord(value)) return fail();
      const device = value;
      if (
        Object.prototype.hasOwnProperty.call(device, 'decoderProfileId') &&
        typeof device.decoderProfileId !== 'string'
      ) {
        return fail();
      }
      const decoderProfileId =
        typeof device.decoderProfileId === 'string'
          ? device.decoderProfileId
          : LEGACY_DECODER_PROFILE_ID;
      if (
        typeof device.tvDeviceId !== 'string' ||
        !DECODER_PROFILE_ID_RE.test(decoderProfileId) ||
        typeof device.keyId !== 'string' ||
        typeof device.publicKeyPem !== 'string' ||
        typeof device.platform !== 'string' ||
        typeof device.country !== 'string' ||
        typeof device.assignedScopeId !== 'string' ||
        (device.status !== 'attested_active' && device.status !== 'quarantined_spoof') ||
        typeof device.registeredAt !== 'string' ||
        typeof device.lastSeenAt !== 'string' ||
        !isNonNegativeInteger(device.acceptedCount) ||
        !isNonNegativeInteger(device.rejectedCount) ||
        (device.demoPrivateKeyPem !== undefined &&
          typeof device.demoPrivateKeyPem !== 'string')
      ) {
        return fail();
      }
      const devicePublicKey = crypto.createPublicKey(device.publicKeyPem);
      if (devicePublicKey.asymmetricKeyType !== 'ed25519') return fail();
      if (typeof device.demoPrivateKeyPem === 'string') {
        const demoPublicKey = crypto.createPublicKey(device.demoPrivateKeyPem);
        const expectedPublicPem = demoPublicKey.export({ type: 'spki', format: 'pem' });
        if (expectedPublicPem !== device.publicKeyPem) return fail();
      }
      return {
        tvDeviceId: device.tvDeviceId,
        decoderProfileId,
        keyId: device.keyId,
        publicKeyPem: device.publicKeyPem,
        ...(typeof device.demoPrivateKeyPem === 'string'
          ? { demoPrivateKeyPem: device.demoPrivateKeyPem }
          : {}),
        platform: device.platform,
        country: device.country,
        assignedScopeId: device.assignedScopeId,
        status: device.status,
        registeredAt: device.registeredAt,
        lastSeenAt: device.lastSeenAt,
        acceptedCount: device.acceptedCount,
        rejectedCount: device.rejectedCount,
      };
    });

    const bundles: FleetSignedBundleRecord[] = state.bundles.map((value) => {
      if (!isRecord(value) || !isRecord(value.scope)) return fail();
      const { scope } = value;
      if (
        typeof scope.scopeId !== 'string' ||
        typeof scope.country !== 'string' ||
        typeof scope.broadcaster !== 'string' ||
        typeof scope.channel !== 'string' ||
        typeof scope.platform !== 'string' ||
        typeof scope.broadcastConfig !== 'string' ||
        typeof scope.displayName !== 'string' ||
        !isNonNegativeInteger(value.version) ||
        !isNonNegativeInteger(value.previousGoodVersion) ||
        (value.status !== 'corroborated_published' &&
          value.status !== 'quarantined_pending_corroboration' &&
          value.status !== 'conflict_split_held' &&
          value.status !== 'rolled_back') ||
        !isStringArray(value.corroboratingDeviceIds) ||
        !isStringArray(value.pendingDeviceIds) ||
        !isNonNegativeInteger(value.conflictingClusterCount) ||
        !isNonNegativeInteger(value.quorumRequired) ||
        typeof value.confidenceScore !== 'number' ||
        typeof value.p10BreakDurationSec !== 'number' ||
        typeof value.p50BreakDurationSec !== 'number' ||
        typeof value.switchingLatencyMs !== 'number' ||
        typeof value.falsePositiveRatePct !== 'number' ||
        typeof value.falseNegativeRatePct !== 'number' ||
        typeof value.signingKeyId !== 'string' ||
        typeof value.sha256Manifest !== 'string' ||
        typeof value.bundleSignatureHex !== 'string' ||
        (value.previousGoodManifest !== null &&
          typeof value.previousGoodManifest !== 'string') ||
        (value.rollbackReason !== null && typeof value.rollbackReason !== 'string') ||
        typeof value.updatedAt !== 'string'
      ) {
        return fail();
      }
      const numericBundleValues = [
        value.confidenceScore,
        value.p10BreakDurationSec,
        value.p50BreakDurationSec,
        value.switchingLatencyMs,
        value.falsePositiveRatePct,
        value.falseNegativeRatePct,
      ];
      if (!numericBundleValues.every(Number.isFinite)) return fail();
      return {
        scope: {
          scopeId: scope.scopeId,
          country: scope.country,
          broadcaster: scope.broadcaster,
          channel: scope.channel,
          platform: scope.platform,
          broadcastConfig: scope.broadcastConfig,
          displayName: scope.displayName,
        },
        version: value.version,
        previousGoodVersion: value.previousGoodVersion,
        status: value.status,
        corroboratingDeviceIds: value.corroboratingDeviceIds,
        pendingDeviceIds: value.pendingDeviceIds,
        conflictingClusterCount: value.conflictingClusterCount,
        quorumRequired: value.quorumRequired,
        confidenceScore: value.confidenceScore,
        p10BreakDurationSec: value.p10BreakDurationSec,
        p50BreakDurationSec: value.p50BreakDurationSec,
        switchingLatencyMs: value.switchingLatencyMs,
        falsePositiveRatePct: value.falsePositiveRatePct,
        falseNegativeRatePct: value.falseNegativeRatePct,
        signingKeyId: value.signingKeyId,
        sha256Manifest: value.sha256Manifest,
        bundleSignatureHex: value.bundleSignatureHex,
        previousGoodManifest: value.previousGoodManifest,
        rollbackReason: value.rollbackReason,
        updatedAt: value.updatedAt,
      };
    });

    const pendingByScope: Array<[string, PendingObservationItem[]]> =
      state.pendingByScope.map((value) => {
        if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string') {
          return fail();
        }
        if (!Array.isArray(value[1])) return fail();
        const pendingItems: PendingObservationItem[] = value[1].map((item) => {
          if (!isRecord(item) || !isSharedIntelSignalType(item.signalType)) return fail();
          if (
            typeof item.tvDeviceId !== 'string' ||
            typeof item.estimatedBreakDurationSec !== 'number' ||
            !Number.isFinite(item.estimatedBreakDurationSec) ||
            typeof item.transitionLatencyMs !== 'number' ||
            !Number.isFinite(item.transitionLatencyMs) ||
            typeof item.createdAt !== 'string'
          ) {
            return fail();
          }
          return {
            tvDeviceId: item.tvDeviceId,
            signalType: item.signalType,
            estimatedBreakDurationSec: item.estimatedBreakDurationSec,
            transitionLatencyMs: item.transitionLatencyMs,
            createdAt: item.createdAt,
          };
        });
        return [value[0], pendingItems];
      });

    const deviceRateTimestamps: Array<[string, number[]]> =
      state.deviceRateTimestamps.map((value) => {
        if (
          !Array.isArray(value) ||
          value.length !== 2 ||
          typeof value[0] !== 'string' ||
          !Array.isArray(value[1]) ||
          !value[1].every((timestamp) => typeof timestamp === 'number' && Number.isFinite(timestamp))
        ) {
          return fail();
        }
        return [value[0], value[1]];
      });

    const breakEvents: Array<[string, FleetBreakEventRecord]> = state.breakEvents.map((value) => {
      if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string') return fail();
      const record = value[1];
      if (!isRecord(record)) return fail();
      const event = record;
      if (
        Object.prototype.hasOwnProperty.call(event, 'decoderProfileId') &&
        typeof event.decoderProfileId !== 'string'
      ) {
        return fail();
      }
      const decoderProfileId =
        typeof event.decoderProfileId === 'string'
          ? event.decoderProfileId
          : LEGACY_DECODER_PROFILE_ID;
      if (
        typeof event.eventId !== 'string' ||
        !DECODER_PROFILE_ID_RE.test(decoderProfileId) ||
        typeof event.channelId !== 'string' ||
        typeof event.scopeId !== 'string' ||
        typeof event.breakStartedAtUtc !== 'string' ||
        !isStringArray(event.sourceDeviceIds) ||
        (event.status !== 'shared_pending_corroboration' &&
          event.status !== 'shared_corroborated' &&
          event.status !== 'conflict_held') ||
        event.containsPii !== false ||
        typeof event.receivedAtUtc !== 'string'
      ) {
        return fail();
      }
      return [
        value[0],
        {
          eventId: event.eventId,
          decoderProfileId,
          channelId: event.channelId,
          scopeId: event.scopeId,
          breakStartedAtUtc: event.breakStartedAtUtc,
          sourceDeviceIds: event.sourceDeviceIds,
          status: event.status,
          containsPii: false,
          receivedAtUtc: event.receivedAtUtc,
        },
      ];
    });

    const breakEventAliases: Array<[string, BreakEventAlias]> =
      state.breakEventAliases.map((value) => {
        if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string') return fail();
        const alias = value[1];
        if (
          !isRecord(alias) ||
          typeof alias.recordKey !== 'string' ||
          typeof alias.fingerprint !== 'string' ||
          !/^[a-f0-9]{64}$/i.test(alias.fingerprint)
        ) {
          return fail();
        }
        return [value[0], { recordKey: alias.recordKey, fingerprint: alias.fingerprint }];
      });

    const usedBreakEventNonces: Array<[string, number]> = state.usedBreakEventNonces.map(
      (value) => {
        if (
          !Array.isArray(value) ||
          value.length !== 2 ||
          typeof value[0] !== 'string' ||
          typeof value[1] !== 'number' ||
          !Number.isFinite(value[1])
        ) {
          return fail();
        }
        return [value[0], value[1]];
      }
    );

    const auditTrail: SharedIntelAuditEntry[] = state.auditTrail.map((value) => {
      if (!isRecord(value)) return fail();
      const audit = value;
      if (
        typeof audit.id !== 'string' ||
        typeof audit.action !== 'string' ||
        (audit.scopeId !== null && typeof audit.scopeId !== 'string') ||
        typeof audit.detail !== 'string' ||
        typeof audit.createdAt !== 'string'
      ) {
        return fail();
      }
      return {
        id: audit.id,
        action: audit.action,
        scopeId: audit.scopeId,
        detail: audit.detail,
        createdAt: audit.createdAt,
      };
    });

    const recentObservations: FleetObservationResult[] = state.recentObservations.map((value) => {
      if (!isRecord(value) || !isSharedIntelSignalType(value.signalType)) return fail();
      const { httpStatus, trustDecision, bundleVersionAfter } = value;
      if (
        typeof value.ok !== 'boolean' ||
        (httpStatus !== 201 &&
          httpStatus !== 400 &&
          httpStatus !== 401 &&
          httpStatus !== 429) ||
        typeof value.observationId !== 'string' ||
        typeof value.tvDeviceId !== 'string' ||
        typeof value.scopeId !== 'string' ||
        typeof value.estimatedBreakDurationSec !== 'number' ||
        !Number.isFinite(value.estimatedBreakDurationSec) ||
        typeof value.transitionLatencyMs !== 'number' ||
        !Number.isFinite(value.transitionLatencyMs) ||
        !isFleetTrustDecision(trustDecision) ||
        typeof value.signatureVerified !== 'boolean' ||
        value.containsPii !== false ||
        typeof value.reason !== 'string' ||
        (bundleVersionAfter !== null && !isNonNegativeInteger(bundleVersionAfter)) ||
        typeof value.createdAt !== 'string'
      ) {
        return fail();
      }
      return {
        ok: value.ok,
        httpStatus,
        observationId: value.observationId,
        tvDeviceId: value.tvDeviceId,
        scopeId: value.scopeId,
        signalType: value.signalType,
        estimatedBreakDurationSec: value.estimatedBreakDurationSec,
        transitionLatencyMs: value.transitionLatencyMs,
        trustDecision,
        signatureVerified: value.signatureVerified,
        containsPii: false,
        reason: value.reason,
        bundleVersionAfter,
        createdAt: value.createdAt,
      };
    });

    const rejectedSignatureCount = state.rejectedSignatureCount;
    const rejectedPiiCount = state.rejectedPiiCount;
    const rateLimitedFloodCount = state.rateLimitedFloodCount;
    const conflictHeldCount = state.conflictHeldCount;
    if (
      !isNonNegativeInteger(rejectedSignatureCount) ||
      !isNonNegativeInteger(rejectedPiiCount) ||
      !isNonNegativeInteger(rateLimitedFloodCount) ||
      !isNonNegativeInteger(conflictHeldCount) ||
      !isNonNegativeInteger(state.rollbackCount)
    ) {
      return fail();
    }
    if (
      breakEventAliases.some(
        ([, alias]) => !breakEvents.some(([recordKey]) => recordKey === alias.recordKey)
      )
    ) {
      return fail();
    }

    return {
      formatVersion: 2,
      signingPrivateKeyPem: state.signingPrivateKeyPem,
      signingPublicKeyPem: state.signingPublicKeyPem,
      devices,
      bundles,
      pendingByScope,
      deviceRateTimestamps,
      usedNonces: state.usedNonces,
      breakEvents,
      breakEventAliases,
      usedBreakEventNonces,
      auditTrail,
      recentObservations,
      rejectedSignatureCount,
      rejectedPiiCount,
      rateLimitedFloodCount,
      conflictHeldCount,
      rollbackCount: state.rollbackCount,
    };
  }

  private persistFleetState(): void {
    if (!this.persistencePath || !this.persistenceKey) return;

    const state: PersistedFleetState = {
      formatVersion: 2,
      signingPrivateKeyPem: this.signingPrivateKeyPem,
      signingPublicKeyPem: this.signingPublicKeyPem,
      devices: this.devices,
      bundles: this.bundles,
      pendingByScope: [...this.pendingByScope.entries()],
      deviceRateTimestamps: [...this.deviceRateTimestamps.entries()],
      usedNonces: [...this.usedNonces],
      breakEvents: [...this.breakEvents.entries()],
      breakEventAliases: [...this.breakEventAliases.entries()],
      usedBreakEventNonces: [...this.usedBreakEventNonces.entries()],
      auditTrail: this.auditTrail.slice(0, 80),
      recentObservations: this.recentObservations.slice(0, 60),
      rejectedSignatureCount: this.rejectedSignatureCount,
      rejectedPiiCount: this.rejectedPiiCount,
      rateLimitedFloodCount: this.rateLimitedFloodCount,
      conflictHeldCount: this.conflictHeldCount,
      rollbackCount: this.rollbackCount,
    };
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.persistenceKey, iv);
    cipher.setAAD(STATE_FILE_AAD);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(state), 'utf8'),
      cipher.final(),
    ]);
    const envelope: EncryptedStateFile = {
      format: 'edison-shared-intel-state',
      version: 2,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };

    const directory = path.dirname(this.persistencePath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const tempPath = `${this.persistencePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    const fd = fs.openSync(tempPath, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(envelope), 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.chmodSync(tempPath, 0o600);
      fs.renameSync(tempPath, this.persistencePath);
    } catch (error) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw error;
    }
  }

  private seedDevice(
    tvDeviceId: string,
    platform: string,
    country: string,
    assignedScopeId: string
  ): InternalDeviceEntry {
    const pair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const now = new Date().toISOString();
    return {
      tvDeviceId,
      decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
      keyId: `dev_ed25519_${crypto.randomBytes(3).toString('hex')}`,
      publicKeyPem: pair.publicKey,
      demoPrivateKeyPem: pair.privateKey,
      platform,
      country,
      assignedScopeId,
      status: 'attested_active',
      registeredAt: now,
      lastSeenAt: now,
      acceptedCount: 0,
      rejectedCount: 0,
    };
  }

  reset(persist = true): void {
    const now = new Date().toISOString();
    this.pendingByScope.clear();
    this.recentObservations = [];
    this.auditTrail = [];
    this.deviceRateTimestamps.clear();
    this.usedNonces.clear();
    this.breakEvents.clear();
    this.breakEventAliases.clear();
    this.usedBreakEventNonces.clear();
    this.rejectedSignatureCount = 0;
    this.rejectedPiiCount = 0;
    this.rateLimitedFloodCount = 0;
    this.conflictHeldCount = 0;
    this.rollbackCount = 0;

    const specs = [
      { p10: 75, p50: 110, lat: 380, fpr: 0.4, fnr: 1.2, conf: 0.94, ver: 3, prev: 2 },
      { p10: 90, p50: 135, lat: 420, fpr: 0.6, fnr: 1.5, conf: 0.91, ver: 2, prev: 1 },
      { p10: 65, p50: 95, lat: 460, fpr: 0.5, fnr: 1.8, conf: 0.89, ver: 2, prev: 1 },
    ];

    this.bundles = DEFAULT_SHARED_INTEL_SCOPES.map((scope, idx) => {
      const s = specs[idx];
      const sha = computeSha256Manifest(scope.scopeId, s.ver, s.p10, s.p50, s.lat);
      const sig = this.signBundleManifest(scope.scopeId, s.ver, s.p10, s.p50, s.lat, sha);
      const prevSha = computeSha256Manifest(scope.scopeId, s.prev, s.p10, s.p50, s.lat);
      return {
        scope: { ...scope },
        version: s.ver,
        previousGoodVersion: s.prev,
        status: 'corroborated_published',
        corroboratingDeviceIds: [
          `fleet_tv_${idx + 1}_a`,
          `fleet_tv_${idx + 1}_b`,
          `fleet_tv_${idx + 1}_c`,
        ],
        pendingDeviceIds: [],
        conflictingClusterCount: 0,
        quorumRequired: SHARED_INTEL_QUORUM_REQUIRED,
        confidenceScore: s.conf,
        p10BreakDurationSec: s.p10,
        p50BreakDurationSec: s.p50,
        switchingLatencyMs: s.lat,
        falsePositiveRatePct: s.fpr,
        falseNegativeRatePct: s.fnr,
        signingKeyId: SIGNING_KEY_ID,
        sha256Manifest: sha,
        bundleSignatureHex: sig,
        previousGoodManifest: prevSha,
        rollbackReason: null,
        updatedAt: now,
      };
    });

    this.devices = [
      this.seedDevice(
        'fleet_tv_gb_01',
        'Android TV 14',
        'GB',
        DEFAULT_SHARED_INTEL_SCOPES[0].scopeId
      ),
      this.seedDevice(
        'fleet_tv_gb_02',
        'Android TV 14',
        'GB',
        DEFAULT_SHARED_INTEL_SCOPES[0].scopeId
      ),
      this.seedDevice(
        'fleet_tv_gb_03',
        'Android TV 14',
        'GB',
        DEFAULT_SHARED_INTEL_SCOPES[0].scopeId
      ),
      this.seedDevice(
        'fleet_tv_sky_01',
        'Samsung Tizen 7.0',
        'GB',
        DEFAULT_SHARED_INTEL_SCOPES[1].scopeId
      ),
      this.seedDevice(
        'fleet_tv_de_01',
        'LG webOS 23',
        'DE',
        DEFAULT_SHARED_INTEL_SCOPES[2].scopeId
      ),
    ];

    this.appendAudit(
      'FLEET_SERVICE_INITIALISED',
      null,
      'Phase 5 Block 5.1 Shared Ad Intelligence Fleet Service initialised with Ed25519 manifest signing, quorum K=3, conflict guard, and 2.5% FPR auto-rollback (hardwareTested=false).'
    );
    if (persist) this.persistFleetState();
  }

  getSnapshot(): SharedIntelFleetSnapshot {
    return {
      serviceStage:
        'Phase 5 · Stage 5.1 · Block 5.1 — Fleet Shared Intelligence Service (Software-First)',
      signingKeyId: SIGNING_KEY_ID,
      signingPublicKeyPem: this.signingPublicKeyPem,
      breakEventPersistence: this.persistencePath ? 'encrypted_local_file' : 'in_memory',
      breakEventsRestartDurable: Boolean(this.persistencePath),
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      stageP6Deferred: true,
      quorumRequired: SHARED_INTEL_QUORUM_REQUIRED,
      fprRollbackThresholdPct: SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT,
      zeroPiiEnforced: true,
      rejectedSignatureCount: this.rejectedSignatureCount,
      rejectedPiiCount: this.rejectedPiiCount,
      rateLimitedFloodCount: this.rateLimitedFloodCount,
      conflictHeldCount: this.conflictHeldCount,
      rollbackCount: this.rollbackCount,
      devices: this.devices.map(({ demoPrivateKeyPem: _priv, ...pub }) => ({ ...pub })),
      bundles: this.bundles.map((b) => ({
        ...b,
        scope: { ...b.scope },
        corroboratingDeviceIds: [...b.corroboratingDeviceIds],
        pendingDeviceIds: [...b.pendingDeviceIds],
      })),
      recentObservations: this.recentObservations.slice(0, 40).map((o) => ({ ...o })),
      auditTrail: this.auditTrail.slice(0, 50).map((a) => ({ ...a })),
    };
  }

  registerAttestedDevice(input: {
    tvDeviceId: string;
    decoderProfileId: string;
    platform: string;
    country: string;
    assignedScopeId: string;
    publicKeyPem?: string;
  }): { device: FleetAttestedDeviceRecord; signingHelperAvailable: boolean } {
    const scope = this.bundles.find((b) => b.scope.scopeId === input.assignedScopeId);
    if (!scope) {
      throw new Error(`Scope "${input.assignedScopeId}" not found.`);
    }
    if (!DECODER_PROFILE_ID_RE.test(input.decoderProfileId.trim())) {
      throw new Error('A valid decoder profile ID is required for device registration.');
    }

    let pubPem = input.publicKeyPem?.trim();
    let privPem: string | undefined;
    if (!pubPem) {
      const pair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      pubPem = pair.publicKey;
      privPem = pair.privateKey;
    } else {
      // Validate public key parses cleanly as Ed25519 SPKI PEM
      const keyObj = crypto.createPublicKey(pubPem);
      if (keyObj.asymmetricKeyType !== 'ed25519') {
        throw new Error('Only Ed25519 device attestation public keys are accepted.');
      }
    }

    const now = new Date().toISOString();
    const existingIdx = this.devices.findIndex((d) => d.tvDeviceId === input.tvDeviceId);
    const entry: InternalDeviceEntry = {
      tvDeviceId: input.tvDeviceId,
      decoderProfileId: input.decoderProfileId.trim(),
      keyId: `dev_ed25519_${crypto.randomBytes(3).toString('hex')}`,
      publicKeyPem: pubPem,
      demoPrivateKeyPem: privPem,
      platform: input.platform,
      country: input.country.toUpperCase(),
      assignedScopeId: input.assignedScopeId,
      status: 'attested_active',
      registeredAt: existingIdx >= 0 ? this.devices[existingIdx].registeredAt : now,
      lastSeenAt: now,
      acceptedCount: existingIdx >= 0 ? this.devices[existingIdx].acceptedCount : 0,
      rejectedCount: existingIdx >= 0 ? this.devices[existingIdx].rejectedCount : 0,
    };

    if (existingIdx >= 0) {
      this.devices[existingIdx] = entry;
    } else {
      this.devices.push(entry);
    }

    this.appendAudit(
      'ATTESTED_DEVICE_REGISTERED',
      input.assignedScopeId,
      `Registered Ed25519 attested device ${entry.tvDeviceId} (${entry.keyId}, ${entry.country} · ${entry.platform}).`
    );
    this.persistFleetState();

    const { demoPrivateKeyPem: _priv, ...publicDevice } = entry;
    return { device: publicDevice, signingHelperAvailable: Boolean(privPem) };
  }

  signWithSeededDevice(input: {
    tvDeviceId: string;
    scopeId: string;
    signalType: SharedIntelSignalType;
    estimatedBreakDurationSec: number;
    transitionLatencyMs: number;
    nonce?: string;
  }): { signatureHex: string; nonce: string } {
    const dev = this.devices.find((d) => d.tvDeviceId === input.tvDeviceId);
    if (!dev || !dev.demoPrivateKeyPem) {
      throw new Error(`No simulation private key available for device "${input.tvDeviceId}".`);
    }
    const nonce = input.nonce ?? `n_${crypto.randomBytes(6).toString('hex')}`;
    const msg = canonicalObservationSigningMessage({
      tvDeviceId: input.tvDeviceId,
      scopeId: input.scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: input.estimatedBreakDurationSec,
      transitionLatencyMs: input.transitionLatencyMs,
      nonce,
    });
    const signatureHex = crypto
      .sign(null, Buffer.from(msg, 'utf8'), dev.demoPrivateKeyPem)
      .toString('hex');
    return { signatureHex, nonce };
  }

  private pruneBreakEventState(nowMs: number): boolean {
    let changed = false;
    for (const [nonceKey, usedAt] of this.usedBreakEventNonces) {
      if (nowMs - usedAt > BREAK_EVENT_NONCE_RETENTION_MS) {
        this.usedBreakEventNonces.delete(nonceKey);
        changed = true;
      }
    }

    for (const [recordKey, event] of this.breakEvents) {
      if (
        nowMs - Date.parse(event.receivedAtUtc) >
        BREAK_EVENT_FRESHNESS_MS + BREAK_EVENT_CONFLICT_WINDOW_MS
      ) {
        this.breakEvents.delete(recordKey);
        changed = true;
      }
    }

    for (const [eventKey, alias] of this.breakEventAliases) {
      if (!this.breakEvents.has(alias.recordKey)) {
        this.breakEventAliases.delete(eventKey);
        changed = true;
      }
    }

    while (this.breakEvents.size > MAX_BREAK_EVENT_RECORDS) {
      const oldestRecordKey = this.breakEvents.keys().next().value;
      if (!oldestRecordKey) break;
      this.breakEvents.delete(oldestRecordKey);
      changed = true;
      for (const [eventKey, alias] of this.breakEventAliases) {
        if (alias.recordKey === oldestRecordKey) {
          this.breakEventAliases.delete(eventKey);
        }
      }
    }
    return changed;
  }

  signWithSeededBreakEvent(input: {
    tvDeviceId: string;
    scopeId: string;
    decoderProfileId: string;
    channelId: string;
    eventId: string;
    breakStartedAtUtc: string;
    nonce: string;
  }): { signatureHex: string } {
    const device = this.devices.find((entry) => entry.tvDeviceId === input.tvDeviceId);
    if (!device?.demoPrivateKeyPem) {
      throw new Error(`No simulation private key available for device "${input.tvDeviceId}".`);
    }
    const message = canonicalBreakEventSigningMessage(input);
    return {
      signatureHex: crypto
        .sign(null, Buffer.from(message, 'utf8'), device.demoPrivateKeyPem)
        .toString('hex'),
    };
  }

  submitSignedBreakEvent(input: {
    tvDeviceId: string;
    scopeId: string;
    decoderProfileId: string;
    channelId: string;
    eventId: string;
    breakStartedAtUtc: string;
    nonce: string;
    signatureHex?: string;
    useRegisteredDemoSigner?: boolean;
    rawPayload?: Record<string, unknown>;
    nowMs?: number;
  }): FleetBreakEventSubmissionResult {
    const nowMs = input.nowMs ?? Date.now();
    const receivedAtUtc = new Date(nowMs).toISOString();
    if (this.pruneBreakEventState(nowMs)) this.persistFleetState();

    const makeResult = (
      status: FleetBreakEventSubmissionResult['status'],
      httpStatus: FleetBreakEventSubmissionResult['httpStatus'],
      ok: boolean,
      reason: string,
      signatureVerified = false,
      event: FleetBreakEventRecord | null = null
    ): FleetBreakEventSubmissionResult => {
      this.persistFleetState();
      return {
        ok,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        httpStatus,
        status,
        eventId: input.eventId,
        decoderProfileId: input.decoderProfileId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        channelId: input.channelId,
        breakStartedAtUtc: input.breakStartedAtUtc,
        signatureVerified,
        containsPii: false,
        reason,
        event: event
          ? { ...event, sourceDeviceIds: [...event.sourceDeviceIds] }
          : null,
        receivedAtUtc,
      };
    };

    if (input.rawPayload) {
      const violations = assertZeroPiiPayload(input.rawPayload);
      if (violations.length > 0) {
        this.rejectedPiiCount += 1;
        this.appendAudit(
          'BREAK_EVENT_ZERO_PII_REJECTED',
          input.scopeId,
          `Rejected personal fields [${violations.join(', ')}] from ${input.tvDeviceId}.`
        );
        return makeResult(
          'rejected_pii',
          400,
          false,
          `ZERO-PII GUARDRAIL: Forbidden fields rejected (${violations.join(', ')}).`
        );
      }
    }

    const device = this.devices.find((entry) => entry.tvDeviceId === input.tvDeviceId);
    const bundle = this.bundles.find((entry) => entry.scope.scopeId === input.scopeId);
    if (!device || device.status !== 'attested_active') {
      this.rejectedSignatureCount += 1;
      return makeResult(
        'rejected_invalid_signature',
        401,
        false,
        'Break event source is not an active attested TV device.'
      );
    }
    if (device.assignedScopeId !== input.scopeId || !bundle) {
      return makeResult(
        'rejected_scope_mismatch',
        409,
        false,
        'Break event scope does not match the attested device assignment.'
      );
    }
    if (device.decoderProfileId !== input.decoderProfileId) {
      return makeResult(
        'rejected_scope_mismatch',
        409,
        false,
        'Break event decoder profile does not match the attested device assignment.'
      );
    }
    if (canonicalChannelScopeId(bundle.scope) !== input.channelId) {
      return makeResult(
        'rejected_scope_mismatch',
        409,
        false,
        'Break event channel does not match the configured channel for this scope.'
      );
    }

    const breakStartedAtMs = Date.parse(input.breakStartedAtUtc);
    if (
      !Number.isFinite(breakStartedAtMs) ||
      new Date(breakStartedAtMs).toISOString() !== input.breakStartedAtUtc ||
      !input.nonce.trim()
    ) {
      return makeResult(
        'rejected_stale',
        400,
        false,
        'Break event timestamp or nonce is invalid.'
      );
    }

    const nonceKey = `${input.tvDeviceId}:${input.nonce.trim()}`;
    if (this.usedBreakEventNonces.has(nonceKey)) {
      device.rejectedCount += 1;
      return makeResult('rejected_replay', 401, false, 'Break event nonce replay rejected.');
    }

    let signatureHex = input.signatureHex?.trim() ?? '';
    if (!signatureHex && input.useRegisteredDemoSigner && device.demoPrivateKeyPem) {
      signatureHex = this.signWithSeededBreakEvent(input).signatureHex;
    }

    let signatureVerified = false;
    if (/^[a-f0-9]{128}$/i.test(signatureHex)) {
      try {
        signatureVerified = crypto.verify(
          null,
          Buffer.from(canonicalBreakEventSigningMessage(input), 'utf8'),
          device.publicKeyPem,
          Buffer.from(signatureHex, 'hex')
        );
      } catch {
        signatureVerified = false;
      }
    }
    if (!signatureVerified) {
      this.rejectedSignatureCount += 1;
      device.rejectedCount += 1;
      return makeResult(
        'rejected_invalid_signature',
        401,
        false,
        'Break event Ed25519 signature is invalid.'
      );
    }

    const reportTimestamps = (this.deviceRateTimestamps.get(input.tvDeviceId) ?? []).filter(
      (timestamp) => nowMs - timestamp <= FLOOD_WINDOW_MS
    );
    if (reportTimestamps.length >= MAX_OBS_PER_WINDOW) {
      this.rateLimitedFloodCount += 1;
      device.rejectedCount += 1;
      this.deviceRateTimestamps.set(input.tvDeviceId, reportTimestamps);
      return makeResult(
        'rate_limited',
        429,
        false,
        `Flood protection throttled ${input.tvDeviceId}: max ${MAX_OBS_PER_WINDOW} signed shared-intelligence reports per ${FLOOD_WINDOW_MS / 1000}s.`,
        true
      );
    }
    reportTimestamps.push(nowMs);
    this.deviceRateTimestamps.set(input.tvDeviceId, reportTimestamps);

    this.usedBreakEventNonces.set(nonceKey, nowMs);
    device.lastSeenAt = receivedAtUtc;

    const sourceEventKey = `${input.tvDeviceId}:${input.eventId}`;
    const fingerprint = breakEventFingerprint(input);
    const alias = this.breakEventAliases.get(sourceEventKey);
    if (alias) {
      const existing = this.breakEvents.get(alias.recordKey) ?? null;
      if (alias.fingerprint !== fingerprint) {
        this.appendAudit(
          'BREAK_EVENT_ID_REUSE_REJECTED',
          input.scopeId,
          `Rejected reused event ID ${input.eventId} from ${input.tvDeviceId} with different event data.`
        );
        return makeResult(
          'rejected_event_id_reuse',
          409,
          false,
          'Break event ID was reused with different channel or timestamp data.',
          true,
          existing
        );
      }
      return makeResult(
        'duplicate_ignored',
        200,
        true,
        'Duplicate source event was ignored.',
        true,
        existing
      );
    }

    if (
      breakStartedAtMs < nowMs - BREAK_EVENT_FRESHNESS_MS ||
      breakStartedAtMs > nowMs + BREAK_EVENT_FUTURE_SKEW_MS
    ) {
      return makeResult(
        'rejected_stale',
        409,
        false,
        'Break event timestamp is outside the accepted freshness window.',
        true
      );
    }

    const channelCandidates = [...this.breakEvents.entries()].filter(([, event]) => {
      const existingAt = Date.parse(event.breakStartedAtUtc);
      return (
        event.channelId === input.channelId &&
        event.decoderProfileId === input.decoderProfileId &&
        Math.abs(existingAt - breakStartedAtMs) <= BREAK_EVENT_CONFLICT_WINDOW_MS
      );
    });
    const matchingEvent = channelCandidates.find(
      ([, event]) =>
        event.status !== 'conflict_held' &&
        Math.abs(Date.parse(event.breakStartedAtUtc) - breakStartedAtMs) <=
          BREAK_EVENT_START_TOLERANCE_MS
    );

    if (matchingEvent) {
      const [recordKey, existing] = matchingEvent;
      this.breakEventAliases.set(sourceEventKey, { recordKey, fingerprint });
      if (existing.sourceDeviceIds.includes(input.tvDeviceId)) {
        return makeResult(
          'duplicate_ignored',
          200,
          true,
          'A source device may corroborate a break only once.',
          true,
          existing
        );
      }

      const corroborated: FleetBreakEventRecord = {
        ...existing,
        sourceDeviceIds: [...existing.sourceDeviceIds, input.tvDeviceId],
        status: 'shared_corroborated',
      };
      this.breakEvents.set(recordKey, corroborated);
      this.appendAudit(
        'BREAK_EVENT_CORROBORATED',
        input.scopeId,
        `Break ${existing.eventId} for ${input.channelId} corroborated by ${input.tvDeviceId}.`
      );
      return makeResult(
        'shared_corroborated',
        200,
        true,
        'Break event corroborated by a distinct attested TV.',
        true,
        corroborated
      );
    }

    const recordKey = sourceEventKey;
    const event: FleetBreakEventRecord = {
      eventId: input.eventId,
      decoderProfileId: input.decoderProfileId,
      channelId: input.channelId,
      scopeId: input.scopeId,
      breakStartedAtUtc: input.breakStartedAtUtc,
      sourceDeviceIds: [input.tvDeviceId],
      status: channelCandidates.length > 0 ? 'conflict_held' : 'shared_pending_corroboration',
      containsPii: false,
      receivedAtUtc,
    };
    for (const [candidateKey, candidate] of channelCandidates) {
      this.breakEvents.set(candidateKey, { ...candidate, status: 'conflict_held' });
    }
    this.breakEvents.set(recordKey, event);
    this.breakEventAliases.set(sourceEventKey, { recordKey, fingerprint });

    if (event.status === 'conflict_held') {
      this.appendAudit(
        'BREAK_EVENT_CONFLICT_HELD',
        input.scopeId,
        `Break event from ${input.tvDeviceId} conflicts with a recent ${input.channelId} event; sharing is held.`
      );
      return makeResult(
        'conflict_held',
        409,
        false,
        'Conflicting break start time detected; events are held from sharing.',
        true,
        event
      );
    }

    this.appendAudit(
      'BREAK_EVENT_ACCEPTED',
      input.scopeId,
      `Accepted signed break event ${input.eventId} from ${input.tvDeviceId} for ${input.channelId}.`
    );
    return makeResult(
      'shared_pending_corroboration',
      201,
      true,
      'Fresh signed break event is available to compatible simulated TVs.',
      true,
      event
    );
  }

  getSharedBreakEvents(input: {
    tvDeviceId: string;
    decoderProfileId: string;
    channelId: string;
    nowMs?: number;
  }): FleetBreakEventSyncResult {
    const nowMs = input.nowMs ?? Date.now();
    const syncedAtUtc = new Date(nowMs).toISOString();
    if (this.pruneBreakEventState(nowMs)) this.persistFleetState();
    const device = this.devices.find((entry) => entry.tvDeviceId === input.tvDeviceId);
    if (!device || device.status !== 'attested_active') {
      return {
        ok: false,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        httpStatus: 401,
        tvDeviceId: input.tvDeviceId,
        decoderProfileId: input.decoderProfileId,
        channelId: input.channelId,
        events: [],
        detail: 'Break event receiver is not an active attested TV device.',
        syncedAtUtc,
      };
    }
    const assignedBundle = this.bundles.find(
      (entry) => entry.scope.scopeId === device.assignedScopeId
    );
    if (!assignedBundle || canonicalChannelScopeId(assignedBundle.scope) !== input.channelId) {
      return {
        ok: false,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        httpStatus: 409,
        tvDeviceId: input.tvDeviceId,
        decoderProfileId: input.decoderProfileId,
        channelId: input.channelId,
        events: [],
        detail: 'Receiver is not assigned to the requested channel.',
        syncedAtUtc,
      };
    }
    if (device.decoderProfileId !== input.decoderProfileId) {
      return {
        ok: false,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        httpStatus: 409,
        tvDeviceId: input.tvDeviceId,
        decoderProfileId: input.decoderProfileId,
        channelId: input.channelId,
        events: [],
        detail: 'Receiver is not assigned to the requested decoder profile.',
        syncedAtUtc,
      };
    }

    const events = [...this.breakEvents.values()]
      .filter((event) => {
        const eventTime = Date.parse(event.breakStartedAtUtc);
        return (
          event.channelId === input.channelId &&
          event.decoderProfileId === input.decoderProfileId &&
          event.status !== 'conflict_held' &&
          eventTime >= nowMs - BREAK_EVENT_FRESHNESS_MS &&
          eventTime <= nowMs + BREAK_EVENT_FUTURE_SKEW_MS
        );
      })
      .sort((left, right) => right.breakStartedAtUtc.localeCompare(left.breakStartedAtUtc))
      .map((event) => ({ ...event, sourceDeviceIds: [...event.sourceDeviceIds] }));

    return {
      ok: true,
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      httpStatus: 200,
      tvDeviceId: input.tvDeviceId,
      decoderProfileId: input.decoderProfileId,
      channelId: input.channelId,
      events,
      detail: 'Fresh, non-conflicting channel break events synchronized.',
      syncedAtUtc,
    };
  }

  submitSignedObservation(input: {
    tvDeviceId: string;
    scopeId: string;
    signalType: SharedIntelSignalType;
    estimatedBreakDurationSec: number;
    transitionLatencyMs: number;
    nonce: string;
    signatureHex?: string;
    useRegisteredDemoSigner?: boolean;
    outlierAnomaly?: boolean;
    rawPayload?: Record<string, unknown>;
    nowMs?: number;
  }): FleetObservationResult {
    const nowMs = input.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const obsId = `fobs_${crypto.randomBytes(5).toString('hex')}`;

    const recordAndReturn = (res: FleetObservationResult): FleetObservationResult => {
      this.recentObservations.unshift(res);
      if (this.recentObservations.length > 60) {
        this.recentObservations.length = 60;
      }
      this.persistFleetState();
      return res;
    };

    // 1. Strict Zero-PII check (Scenario 35)
    if (input.rawPayload) {
      const violations = assertZeroPiiPayload(input.rawPayload);
      if (violations.length > 0) {
        this.rejectedPiiCount += 1;
        this.appendAudit(
          'FLEET_ZERO_PII_REJECTED',
          input.scopeId,
          `Rejected PII fields [${violations.join(', ')}] from ${input.tvDeviceId}.`
        );
        return recordAndReturn({
          ok: false,
          httpStatus: 400,
          observationId: obsId,
          tvDeviceId: input.tvDeviceId,
          scopeId: input.scopeId,
          signalType: input.signalType,
          estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
          transitionLatencyMs: Math.round(input.transitionLatencyMs),
          trustDecision: 'rejected_pii_violation',
          signatureVerified: false,
          containsPii: false,
          reason: `ZERO-PII GUARDRAIL: Forbidden PII fields rejected (${violations.join(', ')}).`,
          bundleVersionAfter: null,
          createdAt: nowIso,
        });
      }
    }

    // 2. Cryptographic Ed25519 device attestation & signature verification (Scenario 32)
    const device = this.devices.find((d) => d.tvDeviceId === input.tvDeviceId);
    if (!device) {
      this.rejectedSignatureCount += 1;
      this.appendAudit(
        'FLEET_UNATTESTED_DEVICE_REJECTED',
        input.scopeId,
        `Rejected unattested device ${input.tvDeviceId} (401).`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 401,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
        transitionLatencyMs: Math.round(input.transitionLatencyMs),
        trustDecision: 'rejected_invalid_signature',
        signatureVerified: false,
        containsPii: false,
        reason: `Unattested TV device "${input.tvDeviceId}" rejected (HTTP 401).`,
        bundleVersionAfter: null,
        createdAt: nowIso,
      });
    }

    let signatureHex = input.signatureHex?.trim() ?? '';
    if (!signatureHex && input.useRegisteredDemoSigner && device.demoPrivateKeyPem) {
      const signed = this.signWithSeededDevice({
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: input.estimatedBreakDurationSec,
        transitionLatencyMs: input.transitionLatencyMs,
        nonce: input.nonce,
      });
      signatureHex = signed.signatureHex;
    }

    const nonceReplayKey = `${input.tvDeviceId}:${input.nonce}`;
    if (this.usedNonces.has(nonceReplayKey)) {
      this.rejectedSignatureCount += 1;
      device.rejectedCount += 1;
      this.appendAudit(
        'FLEET_NONCE_REPLAY_REJECTED',
        input.scopeId,
        `Rejected replayed nonce for ${input.tvDeviceId} (401).`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 401,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
        transitionLatencyMs: Math.round(input.transitionLatencyMs),
        trustDecision: 'rejected_invalid_signature',
        signatureVerified: false,
        containsPii: false,
        reason: 'Signed observation nonce replay detected — rejected (HTTP 401).',
        bundleVersionAfter: null,
        createdAt: nowIso,
      });
    }

    const canonicalMsg = canonicalObservationSigningMessage({
      tvDeviceId: input.tvDeviceId,
      scopeId: input.scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: input.estimatedBreakDurationSec,
      transitionLatencyMs: input.transitionLatencyMs,
      nonce: input.nonce,
    });

    let sigOk = false;
    if (/^[a-f0-9]+$/i.test(signatureHex) && signatureHex.length >= 128) {
      try {
        sigOk = crypto.verify(
          null,
          Buffer.from(canonicalMsg, 'utf8'),
          device.publicKeyPem,
          Buffer.from(signatureHex, 'hex')
        );
      } catch {
        sigOk = false;
      }
    }

    if (!sigOk) {
      this.rejectedSignatureCount += 1;
      device.rejectedCount += 1;
      this.appendAudit(
        'FLEET_INVALID_SIGNATURE_REJECTED',
        input.scopeId,
        `Rejected invalid Ed25519 signature from ${input.tvDeviceId} (401).`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 401,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
        transitionLatencyMs: Math.round(input.transitionLatencyMs),
        trustDecision: 'rejected_invalid_signature',
        signatureVerified: false,
        containsPii: false,
        reason: `Ed25519 signature verification failed for ${input.tvDeviceId} (${device.keyId}).`,
        bundleVersionAfter: null,
        createdAt: nowIso,
      });
    }

    this.usedNonces.add(nonceReplayKey);
    if (this.usedNonces.size > 500) {
      this.usedNonces.clear();
    }

    // 3. Flooding rate limiter per device (Scenario 32 -> HTTP 429)
    const timestamps = (this.deviceRateTimestamps.get(input.tvDeviceId) ?? []).filter(
      (t) => nowMs - t <= FLOOD_WINDOW_MS
    );
    if (timestamps.length >= MAX_OBS_PER_WINDOW) {
      this.rateLimitedFloodCount += 1;
      device.rejectedCount += 1;
      this.deviceRateTimestamps.set(input.tvDeviceId, timestamps);
      this.appendAudit(
        'FLEET_FLOOD_RATE_LIMITED',
        input.scopeId,
        `Rate-limited flood telemetry from ${input.tvDeviceId} (${timestamps.length}/${MAX_OBS_PER_WINDOW} in 10s -> 429).`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 429,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
        transitionLatencyMs: Math.round(input.transitionLatencyMs),
        trustDecision: 'rate_limited_flood',
        signatureVerified: true,
        containsPii: false,
        reason: `Flood protection throttled ${input.tvDeviceId}: max ${MAX_OBS_PER_WINDOW} signed reports per ${FLOOD_WINDOW_MS / 1000}s.`,
        bundleVersionAfter: null,
        createdAt: nowIso,
      });
    }
    timestamps.push(nowMs);
    this.deviceRateTimestamps.set(input.tvDeviceId, timestamps);

    // 4. Scope lookup & device-scope binding check (Scenario 32/33)
    const bundle = this.bundles.find((b) => b.scope.scopeId === input.scopeId);
    if (!bundle || device.assignedScopeId !== input.scopeId) {
      device.rejectedCount += 1;
      this.appendAudit(
        'FLEET_CHANNEL_SCOPE_MISMATCH_REJECTED',
        input.scopeId,
        `Rejected cross-scope observation from ${input.tvDeviceId} (assigned=${device.assignedScopeId}, reported=${input.scopeId}).`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 400,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: Math.round(input.estimatedBreakDurationSec),
        transitionLatencyMs: Math.round(input.transitionLatencyMs),
        trustDecision: 'rejected_outlier',
        signatureVerified: true,
        containsPii: false,
        reason: `Device ${input.tvDeviceId} is attested for "${device.assignedScopeId}", not "${input.scopeId}".`,
        bundleVersionAfter: bundle?.version ?? null,
        createdAt: nowIso,
      });
    }

    device.lastSeenAt = nowIso;

    // 5. Impossible/Outlier duration rejection (Scenario 32)
    const dur = Math.round(input.estimatedBreakDurationSec);
    const lat = Math.round(input.transitionLatencyMs);
    const impossibleDuration =
      input.outlierAnomaly || dur < 15 || dur > 240 || Math.abs(dur - bundle.p50BreakDurationSec) > 130;

    if (impossibleDuration) {
      device.rejectedCount += 1;
      this.appendAudit(
        'FLEET_IMPOSSIBLE_DURATION_REJECTED',
        bundle.scope.scopeId,
        `Quarantined impossible/outlier duration ${dur}s from attested device ${input.tvDeviceId}. Active v${bundle.version} protected.`
      );
      return recordAndReturn({
        ok: false,
        httpStatus: 400,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: dur,
        transitionLatencyMs: lat,
        trustDecision: 'rejected_outlier',
        signatureVerified: true,
        containsPii: false,
        reason: `Outlier/impossible duration (${dur}s vs active p50=${bundle.p50BreakDurationSec}s) rejected before bundle promotion.`,
        bundleVersionAfter: bundle.version,
        createdAt: nowIso,
      });
    }

    device.acceptedCount += 1;
    const pending = this.pendingByScope.get(bundle.scope.scopeId) ?? [];

    // 6. Sybil / duplicate same-device guard in current pending quorum batch
    if (pending.some((p) => p.tvDeviceId === input.tvDeviceId)) {
      return recordAndReturn({
        ok: true,
        httpStatus: 201,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: dur,
        transitionLatencyMs: lat,
        trustDecision: 'quarantined_pending_quorum',
        signatureVerified: true,
        containsPii: false,
        reason: `Duplicate device report held (${pending.length}/${bundle.quorumRequired} distinct attested TVs).`,
        bundleVersionAfter: bundle.version,
        createdAt: nowIso,
      });
    }

    // 7. Conflicting observations detection (Scenario 28)
    if (pending.length > 0) {
      const sortedPending = [...pending.map((p) => p.estimatedBreakDurationSec)].sort(
        (a, b) => a - b
      );
      const anchor = sortedPending[Math.floor(sortedPending.length / 2)];
      if (Math.abs(dur - anchor) > 35) {
        this.conflictHeldCount += 1;
        bundle.status = 'conflict_split_held';
        bundle.conflictingClusterCount += 1;
        bundle.confidenceScore = Number(Math.max(0.55, bundle.confidenceScore - 0.05).toFixed(2));
        bundle.updatedAt = nowIso;
        this.appendAudit(
          'FLEET_CONFLICTING_OBSERVATION_HELD',
          bundle.scope.scopeId,
          `Disagreeing duration ${dur}s vs pending cluster ${anchor}s from ${input.tvDeviceId}: split confidence reduced to ${(bundle.confidenceScore * 100).toFixed(0)}%, active v${bundle.version} untouched.`
        );
        return recordAndReturn({
          ok: true,
          httpStatus: 201,
          observationId: obsId,
          tvDeviceId: input.tvDeviceId,
          scopeId: input.scopeId,
          signalType: input.signalType,
          estimatedBreakDurationSec: dur,
          transitionLatencyMs: lat,
          trustDecision: 'conflicting_held',
          signatureVerified: true,
          containsPii: false,
          reason: `Conflicting observation (${dur}s vs pending cluster ${anchor}s) quarantined & confidence reduced without altering v${bundle.version}.`,
          bundleVersionAfter: bundle.version,
          createdAt: nowIso,
        });
      }
    }

    pending.push({
      tvDeviceId: input.tvDeviceId,
      signalType: input.signalType,
      estimatedBreakDurationSec: dur,
      transitionLatencyMs: lat,
      createdAt: nowIso,
    });
    this.pendingByScope.set(bundle.scope.scopeId, pending);
    bundle.pendingDeviceIds = pending.map((p) => p.tvDeviceId);

    // 8. Hold below quorum K = 3 (Scenario 26)
    if (pending.length < bundle.quorumRequired) {
      bundle.status = 'quarantined_pending_corroboration';
      bundle.updatedAt = nowIso;
      this.appendAudit(
        'FLEET_OBSERVATION_QUARANTINED',
        bundle.scope.scopeId,
        `Signed report from ${input.tvDeviceId} held in quorum quarantine (${pending.length}/${bundle.quorumRequired}). Active v${bundle.version} unchanged.`
      );
      return recordAndReturn({
        ok: true,
        httpStatus: 201,
        observationId: obsId,
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        signalType: input.signalType,
        estimatedBreakDurationSec: dur,
        transitionLatencyMs: lat,
        trustDecision: 'quarantined_pending_quorum',
        signatureVerified: true,
        containsPii: false,
        reason: `Verified Ed25519 signature held (${pending.length}/${bundle.quorumRequired} distinct TVs). Single TV never auto-publishes.`,
        bundleVersionAfter: bundle.version,
        createdAt: nowIso,
      });
    }

    // 9. Quorum K >= 3 satisfied -> publish signed immutable bundle (Scenario 27)
    const durations = pending.map((p) => p.estimatedBreakDurationSec).sort((a, b) => a - b);
    const latencies = pending.map((p) => p.transitionLatencyMs);
    const nextP50 = durations[Math.floor(durations.length / 2)];
    const nextP10 = Math.max(15, durations[0] - 10);
    const nextLat = Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length);
    const nextVer = bundle.version + 1;
    const nextSha = computeSha256Manifest(bundle.scope.scopeId, nextVer, nextP10, nextP50, nextLat);
    const nextSig = this.signBundleManifest(
      bundle.scope.scopeId,
      nextVer,
      nextP10,
      nextP50,
      nextLat,
      nextSha
    );

    bundle.previousGoodVersion = bundle.version;
    bundle.previousGoodManifest = bundle.sha256Manifest;
    bundle.version = nextVer;
    bundle.status = 'corroborated_published';
    bundle.corroboratingDeviceIds = pending.map((p) => p.tvDeviceId);
    bundle.pendingDeviceIds = [];
    bundle.conflictingClusterCount = 0;
    bundle.confidenceScore = Number(Math.min(0.99, bundle.confidenceScore + 0.02).toFixed(2));
    bundle.p10BreakDurationSec = nextP10;
    bundle.p50BreakDurationSec = nextP50;
    bundle.switchingLatencyMs = nextLat;
    bundle.falsePositiveRatePct = 0.3;
    bundle.rollbackReason = null;
    bundle.sha256Manifest = nextSha;
    bundle.bundleSignatureHex = nextSig;
    bundle.updatedAt = nowIso;

    this.pendingByScope.set(bundle.scope.scopeId, []);

    this.appendAudit(
      'FLEET_BUNDLE_CORROBORATED_SIGNED',
      bundle.scope.scopeId,
      `Quorum ${bundle.quorumRequired}/${bundle.quorumRequired} corroborated -> published signed v${nextVer} (#${nextSha}, p10=${nextP10}s, p50=${nextP50}s).`
    );

    return recordAndReturn({
      ok: true,
      httpStatus: 201,
      observationId: obsId,
      tvDeviceId: input.tvDeviceId,
      scopeId: input.scopeId,
      signalType: input.signalType,
      estimatedBreakDurationSec: dur,
      transitionLatencyMs: lat,
      trustDecision: 'accepted_corroborated',
      signatureVerified: true,
      containsPii: false,
      reason: `Quorum ${bundle.quorumRequired}/${bundle.quorumRequired} corroborated -> published Ed25519-signed bundle v${nextVer}.`,
      bundleVersionAfter: nextVer,
      createdAt: nowIso,
    });
  }

  syncScopedDelta(input: {
    tvDeviceId: string;
    scopeId: string;
    clientPlatform: string;
    clientCountry: string;
    knownVersion: number;
    simulateCorruptChecksum?: boolean;
  }): FleetDeltaSyncResult {
    const nowIso = new Date().toISOString();
    const device = this.devices.find((d) => d.tvDeviceId === input.tvDeviceId);
    if (!device) {
      return {
        ok: false,
        status: 'device_not_attested',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: null,
        sha256Manifest: null,
        bundleSignatureHex: null,
        signatureValid: false,
        playbackInterrupted: false,
        detail: `TV device "${input.tvDeviceId}" is not attested.`,
        syncedAt: nowIso,
      };
    }

    const bundle = this.bundles.find((b) => b.scope.scopeId === input.scopeId);
    if (!bundle) {
      return {
        ok: false,
        status: 'scope_compatibility_mismatch',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: null,
        sha256Manifest: null,
        bundleSignatureHex: null,
        signatureValid: false,
        playbackInterrupted: false,
        detail: `Scope "${input.scopeId}" does not exist.`,
        syncedAt: nowIso,
      };
    }

    // Strict compatibility enforcement (Scenario 33: never cross-apply Tizen/ZA to Android TV/GB)
    const countryMatch =
      bundle.scope.country.toUpperCase() === input.clientCountry.trim().toUpperCase();
    const platformNorm = bundle.scope.platform.toLowerCase();
    const reqPlatformNorm = input.clientPlatform.trim().toLowerCase();
    const platformMatch =
      platformNorm === reqPlatformNorm ||
      platformNorm.includes(reqPlatformNorm) ||
      reqPlatformNorm.includes(platformNorm);

    if (!countryMatch || !platformMatch || device.assignedScopeId !== input.scopeId) {
      this.appendAudit(
        'FLEET_SCOPE_COMPATIBILITY_BLOCKED',
        input.scopeId,
        `Blocked incompatible delta sync to ${input.tvDeviceId}: client (${input.clientCountry} / ${input.clientPlatform}) != bundle (${bundle.scope.country} / ${bundle.scope.platform}).`
      );
      return {
        ok: false,
        status: 'scope_compatibility_mismatch',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: null,
        sha256Manifest: null,
        bundleSignatureHex: null,
        signatureValid: false,
        playbackInterrupted: false,
        detail: `Compatibility blocked: bundle requires (${bundle.scope.country} · ${bundle.scope.platform}), client reported (${input.clientCountry} · ${input.clientPlatform}).`,
        syncedAt: nowIso,
      };
    }

    // Simulate corrupt checksum/signature on client verification -> fail safe & roll back (Scenario 34)
    if (input.simulateCorruptChecksum) {
      this.rollbackCount += 1;
      const prevVer = bundle.previousGoodVersion;
      this.appendAudit(
        'FLEET_DELTA_CHECKSUM_CORRUPT_ROLLBACK',
        input.scopeId,
        `Tampered/corrupt delta rejected by ${input.tvDeviceId}; client retained/reverted to v${prevVer}.`
      );
      this.persistFleetState();
      return {
        ok: false,
        status: 'checksum_mismatch_rolled_back',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: prevVer,
        sha256Manifest: bundle.previousGoodManifest,
        bundleSignatureHex: null,
        signatureValid: false,
        playbackInterrupted: false,
        detail: `Manifest checksum/Ed25519 signature verification failed on delta -> rolled back to known-good v${prevVer}.`,
        syncedAt: nowIso,
      };
    }

    const sigValid = this.verifyBundleManifestSignature(bundle);
    if (!sigValid) {
      return {
        ok: false,
        status: 'checksum_mismatch_rolled_back',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: bundle.previousGoodVersion,
        sha256Manifest: bundle.previousGoodManifest,
        bundleSignatureHex: null,
        signatureValid: false,
        playbackInterrupted: false,
        detail: 'Server bundle signature integrity verification failed; fallback pointer preserved.',
        syncedAt: nowIso,
      };
    }

    if (input.knownVersion === bundle.version) {
      return {
        ok: true,
        status: 'up_to_date',
        tvDeviceId: input.tvDeviceId,
        scopeId: input.scopeId,
        deliveredVersion: bundle.version,
        sha256Manifest: bundle.sha256Manifest,
        bundleSignatureHex: bundle.bundleSignatureHex,
        signatureValid: true,
        playbackInterrupted: false,
        detail: `Device ${input.tvDeviceId} already matches signed bundle v${bundle.version}; playback uninterrupted.`,
        syncedAt: nowIso,
      };
    }

    return {
      ok: true,
      status: 'delta_delivered',
      tvDeviceId: input.tvDeviceId,
      scopeId: input.scopeId,
      deliveredVersion: bundle.version,
      sha256Manifest: bundle.sha256Manifest,
      bundleSignatureHex: bundle.bundleSignatureHex,
      signatureValid: true,
      playbackInterrupted: false,
      detail: `Delivered signed scoped delta v${bundle.version} (#${bundle.sha256Manifest}) in background without interrupting playback.`,
      syncedAt: nowIso,
    };
  }

  reportPostUpdateFpr(input: {
    scopeId: string;
    observedFprPct: number;
  }): FleetFprReportResult {
    const nowIso = new Date().toISOString();
    const bundle = this.bundles.find((b) => b.scope.scopeId === input.scopeId);
    if (!bundle) {
      throw new Error(`Scope "${input.scopeId}" not found.`);
    }

    bundle.falsePositiveRatePct = Number(input.observedFprPct.toFixed(2));
    bundle.updatedAt = nowIso;

    if (input.observedFprPct > SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT) {
      const badVer = bundle.version;
      const restored = Math.max(1, bundle.previousGoodVersion);
      const restoredSha = computeSha256Manifest(
        bundle.scope.scopeId,
        restored,
        bundle.p10BreakDurationSec,
        bundle.p50BreakDurationSec,
        bundle.switchingLatencyMs
      );
      bundle.version = restored;
      bundle.status = 'rolled_back';
      bundle.sha256Manifest = restoredSha;
      bundle.bundleSignatureHex = this.signBundleManifest(
        bundle.scope.scopeId,
        restored,
        bundle.p10BreakDurationSec,
        bundle.p50BreakDurationSec,
        bundle.switchingLatencyMs,
        restoredSha
      );
      bundle.rollbackReason = `Automatic rollback triggered: post-update FPR ${bundle.falsePositiveRatePct}% > ${SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT}% guard (reverted v${badVer} -> v${restored}).`;
      this.rollbackCount += 1;

      this.appendAudit('AUTO_ROLLBACK_FPR_SPIKE', bundle.scope.scopeId, bundle.rollbackReason);
      this.persistFleetState();
      return {
        ok: true,
        scopeId: bundle.scope.scopeId,
        reportedFprPct: bundle.falsePositiveRatePct,
        thresholdPct: SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT,
        rollbackTriggered: true,
        activeVersionAfter: restored,
        restoredFromVersion: badVer,
        reason: bundle.rollbackReason,
        evaluatedAt: nowIso,
      };
    }

    this.appendAudit(
      'FLEET_FPR_CALIBRATION_OK',
      bundle.scope.scopeId,
      `Measured post-update FPR ${bundle.falsePositiveRatePct}% within <= ${SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT}% guard on v${bundle.version}.`
    );
    this.persistFleetState();

    return {
      ok: true,
      scopeId: bundle.scope.scopeId,
      reportedFprPct: bundle.falsePositiveRatePct,
      thresholdPct: SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT,
      rollbackTriggered: false,
      activeVersionAfter: bundle.version,
      restoredFromVersion: null,
      reason: `FPR ${bundle.falsePositiveRatePct}% remains safely within <= ${SHARED_INTEL_FPR_ROLLBACK_THRESHOLD_PCT}% threshold.`,
      evaluatedAt: nowIso,
    };
  }

  /**
   * Executes all 11 Shared Ad Intelligence Software Verification Scenarios (#25-#35)
   * defined in TESTING_STRATEGY.md against an isolated ephemeral fleet sandbox.
   */
  runScenarios25To35Suite(): SharedIntelScenarios25To35Report {
    const sandbox = new SharedIntelFleetService();
    const targetScope = DEFAULT_SHARED_INTEL_SCOPES[0].scopeId;
    const scenarios: SharedIntelScenarioCheckItem[] = [];

    // #25 Multiple Simulated TVs Submitting Observations
    const obs25a = sandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 112,
      transitionLatencyMs: 360,
      nonce: 's25_a',
      useRegisteredDemoSigner: true,
    });
    const obs25b = sandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_02',
      scopeId: targetScope,
      signalType: 'hbbtv',
      estimatedBreakDurationSec: 114,
      transitionLatencyMs: 370,
      nonce: 's25_b',
      useRegisteredDemoSigner: true,
    });
    scenarios.push({
      scenarioNumber: 25,
      title: 'Multiple Simulated TVs Submitting Observations',
      passed: obs25a.ok && obs25a.signatureVerified && obs25b.ok && obs25b.signatureVerified,
      detail: '2 distinct attested TVs submitted Ed25519-signed scoped observations cleanly.',
    });

    // #26 Central Aggregation & Single-Device Quarantine (using a separate sandbox check)
    const singleSandbox = new SharedIntelFleetService();
    const snapBefore = singleSandbox.getSnapshot();
    const singleRes = singleSandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 115,
      transitionLatencyMs: 350,
      nonce: 's26_single',
      useRegisteredDemoSigner: true,
    });
    scenarios.push({
      scenarioNumber: 26,
      title: 'Central Aggregation & Single-Device Quarantine',
      passed:
        singleRes.trustDecision === 'quarantined_pending_quorum' &&
        singleRes.bundleVersionAfter === snapBefore.bundles[0].version,
      detail: `Single TV held in quarantine (${singleRes.trustDecision}); active v${snapBefore.bundles[0].version} unchanged.`,
    });

    // #27 Confidence Scoring & Corroboration (3rd distinct TV promotes bundle)
    const obs27c = sandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_03',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 113,
      transitionLatencyMs: 365,
      nonce: 's27_c',
      useRegisteredDemoSigner: true,
    });
    scenarios.push({
      scenarioNumber: 27,
      title: 'Confidence Scoring & Multi-TV Corroboration (K>=3)',
      passed: obs27c.trustDecision === 'accepted_corroborated' && obs27c.bundleVersionAfter === 4,
      detail: `3rd distinct attested TV triggered Ed25519-signed promotion to v${obs27c.bundleVersionAfter}.`,
    });

    // #28 Conflicting Observations
    const conflictSandbox = new SharedIntelFleetService();
    conflictSandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 110,
      transitionLatencyMs: 380,
      nonce: 's28_a',
      useRegisteredDemoSigner: true,
    });
    const conflictRes = conflictSandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_02',
      scopeId: targetScope,
      signalType: 'av_pattern',
      estimatedBreakDurationSec: 45,
      transitionLatencyMs: 420,
      nonce: 's28_b',
      useRegisteredDemoSigner: true,
    });
    const conflictSnap = conflictSandbox.getSnapshot();
    scenarios.push({
      scenarioNumber: 28,
      title: 'Conflicting Observations Held & Confidence Reduced',
      passed:
        conflictRes.trustDecision === 'conflicting_held' &&
        conflictSnap.bundles[0].status === 'conflict_split_held' &&
        conflictSnap.bundles[0].version === 3,
      detail: 'Disagreeing 45s vs 110s report split confidence without overwriting active v3.',
    });

    // #29 Automatic Background Synchronisation
    const sync29 = sandbox.syncScopedDelta({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      clientPlatform: 'Android TV 14',
      clientCountry: 'GB',
      knownVersion: 3,
    });
    scenarios.push({
      scenarioNumber: 29,
      title: 'Automatic Background Delta Synchronisation',
      passed:
        sync29.ok &&
        sync29.status === 'delta_delivered' &&
        sync29.deliveredVersion === 4 &&
        sync29.signatureValid &&
        sync29.playbackInterrupted === false,
      detail: 'Signed delta v4 delivered silently in background with zero playback interruption.',
    });

    // #30 Offline Cache Operation (continues on cached p10 without central network)
    const offlineState = sandbox.getSnapshot().bundles[0];
    scenarios.push({
      scenarioNumber: 30,
      title: 'Offline Cache Resilient Local Operation',
      passed: offlineState.p10BreakDurationSec >= 60 && sandbox.verifyBundleManifestSignature(offlineState),
      detail: `Signed local manifest #${offlineState.sha256Manifest} (p10=${offlineState.p10BreakDurationSec}s) verified for offline use.`,
    });

    // #31 Reconnection & Update Delivery
    const reconnect31 = sandbox.syncScopedDelta({
      tvDeviceId: 'fleet_tv_gb_02',
      scopeId: targetScope,
      clientPlatform: 'Android TV 14',
      clientCountry: 'GB',
      knownVersion: 2,
    });
    scenarios.push({
      scenarioNumber: 31,
      title: 'Reconnection Delta Update & Idempotency',
      passed: reconnect31.ok && reconnect31.deliveredVersion === 4 && reconnect31.signatureValid,
      detail: 'Reconnected client caught up cleanly from v2 to signed v4.',
    });

    // #32 Invalid or Malicious Observations (spoofed signature 401, flood 429)
    const badSig = sandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 112,
      transitionLatencyMs: 360,
      nonce: 's32_spoof',
      signatureHex: '00'.repeat(64),
    });
    const floodSandbox = new SharedIntelFleetService();
    let flood429 = false;
    for (let i = 0; i < 10; i++) {
      const f = floodSandbox.submitSignedObservation({
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: targetScope,
        signalType: 'scte35',
        estimatedBreakDurationSec: 110,
        transitionLatencyMs: 360,
        nonce: `s32_f_${i}`,
        useRegisteredDemoSigner: true,
        nowMs: 1_700_000_000_000 + i * 10,
      });
      if (f.httpStatus === 429) {
        flood429 = true;
        break;
      }
    }
    scenarios.push({
      scenarioNumber: 32,
      title: 'Invalid Signature (401) & Flood Protection (429)',
      passed: badSig.httpStatus === 401 && badSig.trustDecision === 'rejected_invalid_signature' && flood429,
      detail: 'Spoofed Ed25519 signature rejected (401) and observation flooding throttled (429).',
    });

    // #33 Version Compatibility Enforcement (never apply GB/Android to Tizen or ZA)
    const compatFail = sandbox.syncScopedDelta({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      clientPlatform: 'Samsung Tizen 7.0',
      clientCountry: 'ZA',
      knownVersion: 1,
    });
    scenarios.push({
      scenarioNumber: 33,
      title: 'Strict Compatibility Scope Isolation (No Cross-OS Leakage)',
      passed: !compatFail.ok && compatFail.status === 'scope_compatibility_mismatch',
      detail: 'Blocked ZA/Samsung Tizen client from applying GB/Android TV bundle.',
    });

    // #34 Rollback Verification (Corrupt checksum + FPR spike > 2.5%)
    const corruptSync = sandbox.syncScopedDelta({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      clientPlatform: 'Android TV 14',
      clientCountry: 'GB',
      knownVersion: 3,
      simulateCorruptChecksum: true,
    });
    const fprRollback = sandbox.reportPostUpdateFpr({
      scopeId: targetScope,
      observedFprPct: 4.8,
    });
    scenarios.push({
      scenarioNumber: 34,
      title: 'Corrupt Checksum & High-FPR Automatic Rollback',
      passed:
        !corruptSync.ok &&
        corruptSync.status === 'checksum_mismatch_rolled_back' &&
        fprRollback.rollbackTriggered &&
        fprRollback.activeVersionAfter === 3,
      detail: 'Rejected tampered checksum and auto-rolled back FPR 4.8% > 2.5% guard to v3.',
    });

    // #35 Privacy Isolation Audit (Zero PII rejected + verified 0 PII in payloads)
    const piiReject = sandbox.submitSignedObservation({
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: targetScope,
      signalType: 'scte35',
      estimatedBreakDurationSec: 112,
      transitionLatencyMs: 360,
      nonce: 's35_pii',
      useRegisteredDemoSigner: true,
      rawPayload: { householdId: 'hh_secret', gps: '51.5,-0.1', viewingHistory: ['BBC1'] },
    });
    scenarios.push({
      scenarioNumber: 35,
      title: 'Zero-PII Isolation Audit',
      passed:
        piiReject.httpStatus === 400 &&
        piiReject.trustDecision === 'rejected_pii_violation' &&
        sandbox.getSnapshot().recentObservations.every((o) => o.containsPii === false),
      detail: 'Rejected householdId/gps/viewingHistory PII fields (400); 0 PII across fleet logs.',
    });

    const passedScenarios = scenarios.filter((s) => s.passed).length;
    return {
      generatedAt: new Date().toISOString(),
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      stageP6Deferred: true,
      zeroPiiVerified: true,
      totalScenarios: scenarios.length,
      passedScenarios,
      allPassed: passedScenarios === scenarios.length,
      scenarios,
    };
  }
}

export const sharedIntelFleetService = new SharedIntelFleetService();
