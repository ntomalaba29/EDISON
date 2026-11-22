import type { D1DatabaseBinding } from './d1BreakEventStore.ts';

interface D1ApplicationRecordRow {
  collection: unknown;
  record_id: unknown;
  owner_id: unknown;
  payload_json: unknown;
  created_at: unknown;
  updated_at: unknown;
}

export type D1RecordCodec<T> = (value: unknown) => T;

const MAX_RECORD_ID_LENGTH = 512;
const MAX_RECORDS_PER_QUERY = 500;
const COLLECTION_RE = /^[a-z0-9_]{1,63}$/;
const COUNT_FIELDS = new Set([
  'status',
  'eventType',
  'measurementSource',
  'isSuspectedBot',
  'outcome',
]);

function assertKey(collection: string, recordId?: string): void {
  if (!COLLECTION_RE.test(collection)) {
    throw new Error('D1_APPLICATION_RECORD_COLLECTION_INVALID: Collection name is invalid.');
  }
  if (
    recordId !== undefined &&
    (!recordId.trim() || recordId.length > MAX_RECORD_ID_LENGTH)
  ) {
    throw new Error(
      `D1_APPLICATION_RECORD_ID_INVALID: Record ID must be 1 to ${MAX_RECORD_ID_LENGTH} characters.`
    );
  }
}

function assertOwnerId(ownerId: string | undefined): void {
  if (
    ownerId !== undefined &&
    (!ownerId.trim() || ownerId.length > MAX_RECORD_ID_LENGTH)
  ) {
    throw new Error(
      `D1_APPLICATION_RECORD_OWNER_INVALID: Owner ID must be 1 to ${MAX_RECORD_ID_LENGTH} characters.`
    );
  }
}

function assertD1Success<T>(
  result: { success: boolean; results?: T[]; error?: string },
  operation: string
): void {
  if (!result.success) {
    throw new Error(
      `D1_APPLICATION_RECORD_${operation}_FAILED: ${result.error ?? 'D1 reported an unsuccessful operation.'}`
    );
  }
}

function decodeRow<T>(
  row: D1ApplicationRecordRow,
  collection: string,
  codec: D1RecordCodec<T>
): T {
  if (
    row.collection !== collection ||
    typeof row.record_id !== 'string' ||
    row.record_id.length < 1 ||
    row.record_id.length > MAX_RECORD_ID_LENGTH ||
    (row.owner_id !== null && typeof row.owner_id !== 'string') ||
    typeof row.payload_json !== 'string' ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('D1_APPLICATION_RECORD_ROW_INVALID: Stored application record is malformed.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    throw new Error('D1_APPLICATION_RECORD_ROW_INVALID: Stored payload is not valid JSON.');
  }
  return codec(payload);
}

export class D1ApplicationRecordStore {
  constructor(private readonly database: D1DatabaseBinding) {}

  async count(
    collection: string,
    filters: Partial<Record<'status' | 'eventType' | 'measurementSource' | 'isSuspectedBot' | 'outcome', string | number | boolean>> = {}
  ): Promise<number> {
    assertKey(collection);
    const entries = Object.entries(filters);
    for (const [field, value] of entries) {
      if (!COUNT_FIELDS.has(field) || !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error('D1_APPLICATION_RECORD_COUNT_FILTER_INVALID: Filter is unsupported.');
      }
    }

    const clauses = entries.map(([field]) => `json_extract(payload_json, '$.${field}') = ?`);
    const query = `SELECT COUNT(*) AS record_count
      FROM edison_application_records
      WHERE collection = ?${clauses.length ? ` AND ${clauses.join(' AND ')}` : ''}`;
    const values = entries.map(([, value]) => (typeof value === 'boolean' ? Number(value) : value));
    const result = await this.database
      .prepare(query)
      .bind(collection, ...values)
      .all<{ record_count: unknown }>();
    assertD1Success(result, 'COUNT');
    if (!Array.isArray(result.results) || result.results.length !== 1) {
      throw new Error('D1_APPLICATION_RECORD_COUNT_FAILED: D1 returned no count row.');
    }
    const count = result.results[0].record_count;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error('D1_APPLICATION_RECORD_COUNT_FAILED: D1 returned an invalid count.');
    }
    return count;
  }

  async get<T>(
    collection: string,
    recordId: string,
    codec: D1RecordCodec<T>
  ): Promise<T | null> {
    assertKey(collection, recordId);
    const result = await this.database
      .prepare(
        `SELECT collection, record_id, owner_id, payload_json, created_at, updated_at
         FROM edison_application_records
         WHERE collection = ? AND record_id = ?
         LIMIT 1`
      )
      .bind(collection, recordId.trim())
      .all<D1ApplicationRecordRow>();

    assertD1Success(result, 'READ');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_APPLICATION_RECORD_READ_FAILED: D1 returned no result rows.');
    }
    const row = result.results[0];
    return row ? decodeRow(row, collection, codec) : null;
  }

  async list<T>(
    collection: string,
    codec: D1RecordCodec<T>,
    options: { ownerId?: string; limit?: number } = {}
  ): Promise<T[]> {
    assertKey(collection);
    assertOwnerId(options.ownerId);
    const limit = options.limit ?? MAX_RECORDS_PER_QUERY;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECORDS_PER_QUERY) {
      throw new Error(
        `D1_APPLICATION_RECORD_QUERY_INVALID: Limit must be between 1 and ${MAX_RECORDS_PER_QUERY}.`
      );
    }

    const query = options.ownerId
      ? `SELECT collection, record_id, owner_id, payload_json, created_at, updated_at
         FROM edison_application_records
         WHERE collection = ? AND owner_id = ?
         ORDER BY updated_at DESC, record_id
         LIMIT ?`
      : `SELECT collection, record_id, owner_id, payload_json, created_at, updated_at
         FROM edison_application_records
         WHERE collection = ?
         ORDER BY updated_at DESC, record_id
         LIMIT ?`;
    const statement = this.database.prepare(query);
    const result = options.ownerId
      ? await statement.bind(collection, options.ownerId.trim(), limit).all<D1ApplicationRecordRow>()
      : await statement.bind(collection, limit).all<D1ApplicationRecordRow>();

    assertD1Success(result, 'QUERY');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_APPLICATION_RECORD_QUERY_FAILED: D1 returned no result rows.');
    }
    return result.results.map((row) => decodeRow(row, collection, codec));
  }

  async put<T>(
    collection: string,
    recordId: string,
    value: T,
    codec: D1RecordCodec<T>,
    ownerId?: string
  ): Promise<void> {
    assertKey(collection, recordId);
    assertOwnerId(ownerId);

    const validatedValue = codec(value);
    const payload = JSON.stringify(validatedValue);
    if (typeof payload !== 'string') {
      throw new Error('D1_APPLICATION_RECORD_VALUE_INVALID: Record cannot be serialized as JSON.');
    }

    const result = await this.database
      .prepare(
        `INSERT INTO edison_application_records (
           collection, record_id, owner_id, payload_json
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(collection, record_id) DO UPDATE SET
           owner_id = excluded.owner_id,
           payload_json = excluded.payload_json,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
      )
      .bind(collection, recordId.trim(), ownerId?.trim() ?? null, payload)
      .run();

    assertD1Success(result, 'WRITE');
  }

  async delete(collection: string, recordId: string): Promise<void> {
    assertKey(collection, recordId);
    const result = await this.database
      .prepare(
        `DELETE FROM edison_application_records
         WHERE collection = ? AND record_id = ?`
      )
      .bind(collection, recordId.trim())
      .run();

    assertD1Success(result, 'DELETE');
  }
}
