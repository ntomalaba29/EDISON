import type {
  FleetBreakEventRecord,
  FleetBreakEventStatus,
} from '../../types/edison.ts';

type D1SqlValue = string | number | null;

interface D1Result<T> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: D1SqlValue[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

interface D1BreakEventRow {
  event_id: unknown;
  decoder_profile_id: unknown;
  channel_id: unknown;
  scope_id: unknown;
  break_started_at_utc: unknown;
  source_device_ids_json: unknown;
  status: unknown;
  contains_pii: unknown;
  received_at_utc: unknown;
}

const DECODER_PROFILE_ID_RE = /^[A-Za-z0-9._-]{2,120}$/;
const CHANNEL_ID_RE = /^[a-z0-9.-]{3,160}$/;
const EVENT_ID_RE = /^[A-Za-z0-9._-]{3,120}$/;
const MAX_BREAK_EVENT_ROWS = 500;

function isBreakEventStatus(value: unknown): value is FleetBreakEventStatus {
  return (
    value === 'shared_pending_corroboration' ||
    value === 'shared_corroborated' ||
    value === 'conflict_held'
  );
}

function isCanonicalUtc(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function assertD1Success<T>(result: D1Result<T>, operation: string): void {
  if (!result.success) {
    throw new Error(
      `D1_BREAK_EVENT_${operation}_FAILED: ${result.error ?? 'D1 reported an unsuccessful operation.'}`
    );
  }
}

function decodeBreakEvent(row: D1BreakEventRow): FleetBreakEventRecord {
  if (
    typeof row.event_id !== 'string' ||
    !EVENT_ID_RE.test(row.event_id) ||
    typeof row.decoder_profile_id !== 'string' ||
    !DECODER_PROFILE_ID_RE.test(row.decoder_profile_id) ||
    typeof row.channel_id !== 'string' ||
    !CHANNEL_ID_RE.test(row.channel_id) ||
    typeof row.scope_id !== 'string' ||
    row.scope_id.length < 3 ||
    typeof row.break_started_at_utc !== 'string' ||
    !isCanonicalUtc(row.break_started_at_utc) ||
    typeof row.source_device_ids_json !== 'string' ||
    !isBreakEventStatus(row.status) ||
    row.contains_pii !== 0 ||
    typeof row.received_at_utc !== 'string' ||
    !isCanonicalUtc(row.received_at_utc)
  ) {
    throw new Error('D1_BREAK_EVENT_ROW_INVALID: Stored break event failed validation.');
  }

  let sourceDeviceIds: unknown;
  try {
    sourceDeviceIds = JSON.parse(row.source_device_ids_json);
  } catch {
    throw new Error('D1_BREAK_EVENT_ROW_INVALID: Source device list is not valid JSON.');
  }
  if (
    !Array.isArray(sourceDeviceIds) ||
    sourceDeviceIds.length === 0 ||
    !sourceDeviceIds.every(
      (deviceId): deviceId is string => typeof deviceId === 'string' && deviceId.length > 0
    )
  ) {
    throw new Error('D1_BREAK_EVENT_ROW_INVALID: Source device list is invalid.');
  }

  return {
    eventId: row.event_id,
    decoderProfileId: row.decoder_profile_id,
    channelId: row.channel_id,
    scopeId: row.scope_id,
    breakStartedAtUtc: row.break_started_at_utc,
    sourceDeviceIds,
    status: row.status,
    containsPii: false,
    receivedAtUtc: row.received_at_utc,
  };
}

function validateEvent(recordId: string, event: FleetBreakEventRecord): void {
  if (!recordId.trim() || recordId.length > 512) {
    throw new Error('D1_BREAK_EVENT_RECORD_ID_INVALID: Record ID must be 1 to 512 characters.');
  }
  if (
    !EVENT_ID_RE.test(event.eventId) ||
    !DECODER_PROFILE_ID_RE.test(event.decoderProfileId) ||
    !CHANNEL_ID_RE.test(event.channelId) ||
    event.scopeId.length < 3 ||
    event.scopeId.length > 160 ||
    !isCanonicalUtc(event.breakStartedAtUtc) ||
    !isCanonicalUtc(event.receivedAtUtc) ||
    event.sourceDeviceIds.length === 0 ||
    event.sourceDeviceIds.some(
      (deviceId) => typeof deviceId !== 'string' || deviceId.trim().length === 0
    ) ||
    !isBreakEventStatus(event.status) ||
    event.containsPii !== false
  ) {
    throw new Error('D1_BREAK_EVENT_INVALID: Break event failed validation.');
  }
}

export class D1BreakEventStore {
  constructor(private readonly database: D1DatabaseBinding) {}

  async save(recordId: string, event: FleetBreakEventRecord): Promise<void> {
    validateEvent(recordId, event);
    const result = await this.database
      .prepare(
        `INSERT INTO shared_intel_break_events (
           record_id, event_id, decoder_profile_id, channel_id, scope_id,
           break_started_at_utc, source_device_ids_json, status, contains_pii, received_at_utc
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(record_id) DO UPDATE SET
           source_device_ids_json = excluded.source_device_ids_json,
           status = excluded.status,
           received_at_utc = excluded.received_at_utc
         WHERE shared_intel_break_events.event_id = excluded.event_id
           AND shared_intel_break_events.decoder_profile_id = excluded.decoder_profile_id
           AND shared_intel_break_events.channel_id = excluded.channel_id
           AND shared_intel_break_events.scope_id = excluded.scope_id
           AND shared_intel_break_events.break_started_at_utc = excluded.break_started_at_utc`
      )
      .bind(
        recordId.trim(),
        event.eventId,
        event.decoderProfileId,
        event.channelId,
        event.scopeId,
        event.breakStartedAtUtc,
        JSON.stringify(event.sourceDeviceIds),
        event.status,
        event.receivedAtUtc
      )
      .run();

    assertD1Success(result, 'SAVE');
    if (result.meta?.changes !== 1) {
      throw new Error(
        'D1_BREAK_EVENT_IDENTITY_CONFLICT: Record ID is already bound to different event scope or identity.'
      );
    }
  }

  async findFresh(input: {
    channelId: string;
    decoderProfileId: string;
    fromUtc: string;
    toUtc: string;
    limit?: number;
  }): Promise<FleetBreakEventRecord[]> {
    if (
      !CHANNEL_ID_RE.test(input.channelId) ||
      !DECODER_PROFILE_ID_RE.test(input.decoderProfileId) ||
      !isCanonicalUtc(input.fromUtc) ||
      !isCanonicalUtc(input.toUtc) ||
      input.fromUtc > input.toUtc
    ) {
      throw new Error('D1_BREAK_EVENT_QUERY_INVALID: Channel, profile, or time range is invalid.');
    }
    const limit = input.limit ?? MAX_BREAK_EVENT_ROWS;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BREAK_EVENT_ROWS) {
      throw new Error(`D1_BREAK_EVENT_QUERY_INVALID: Limit must be between 1 and ${MAX_BREAK_EVENT_ROWS}.`);
    }

    const result = await this.database
      .prepare(
        `SELECT event_id, decoder_profile_id, channel_id, scope_id,
                break_started_at_utc, source_device_ids_json, status,
                contains_pii, received_at_utc
         FROM shared_intel_break_events
         WHERE channel_id = ?
           AND decoder_profile_id = ?
           AND break_started_at_utc >= ?
           AND break_started_at_utc <= ?
           AND status <> 'conflict_held'
         ORDER BY break_started_at_utc DESC
         LIMIT ?`
      )
      .bind(
        input.channelId,
        input.decoderProfileId,
        input.fromUtc,
        input.toUtc,
        limit
      )
      .all<D1BreakEventRow>();

    assertD1Success(result, 'QUERY');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_BREAK_EVENT_QUERY_FAILED: D1 returned no result rows.');
    }
    return result.results.map(decodeBreakEvent);
  }
}
