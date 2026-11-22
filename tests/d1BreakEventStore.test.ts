import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { FleetBreakEventRecord } from '../src/types/edison.ts';
import {
  D1BreakEventStore,
  type D1DatabaseBinding,
} from '../src/server/cloudflare/d1BreakEventStore.ts';

class SqliteD1Binding implements D1DatabaseBinding {
  constructor(private readonly database: DatabaseSync) {}

  prepare(query: string) {
    const statement = this.database.prepare(query);
    let values: SQLInputValue[] = [];

    return {
      bind(...boundValues: Array<string | number | null>) {
        values = boundValues;
        return this;
      },
      async all<T = Record<string, unknown>>() {
        const rows = statement.all(...values);
        return { success: true, results: rows as T[] };
      },
      async run() {
        const result = statement.run(...values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }
}

const migrationPath = path.resolve(
  process.cwd(),
  'migrations',
  'cloudflare-d1',
  '0001_shared_intel_break_events.sql'
);

function event(
  overrides: Partial<FleetBreakEventRecord> = {}
): FleetBreakEventRecord {
  const timestamp = new Date('2026-11-18T15:00:00.000Z').toISOString();
  return {
    eventId: 'break-event-001',
    decoderProfileId: 'decoder-feed-a',
    channelId: 'gb.broadcaster.channel',
    scopeId: 'gb_channel_scope_01',
    breakStartedAtUtc: timestamp,
    sourceDeviceIds: ['tv-device-a'],
    status: 'shared_pending_corroboration',
    containsPii: false,
    receivedAtUtc: timestamp,
    ...overrides,
  };
}

describe('Cloudflare D1 break-event persistence adapter', () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function createStore(): D1BreakEventStore {
    database = new DatabaseSync(':memory:');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    database.exec(migrationSql);
    database.exec(migrationSql);
    return new D1BreakEventStore(new SqliteD1Binding(database));
  }

  it('applies the D1 migration idempotently and isolates results by channel and decoder profile', async () => {
    const store = createStore();
    const matchingEvent = event();
    const otherProfileEvent = event({
      eventId: 'break-event-002',
      decoderProfileId: 'decoder-feed-b',
      sourceDeviceIds: ['tv-device-b'],
    });
    const otherChannelEvent = event({
      eventId: 'break-event-003',
      channelId: 'gb.broadcaster.other',
      sourceDeviceIds: ['tv-device-c'],
    });
    const heldConflict = event({
      eventId: 'break-event-004',
      status: 'conflict_held',
      sourceDeviceIds: ['tv-device-d'],
    });

    await store.save('record-a', matchingEvent);
    await store.save('record-b', otherProfileEvent);
    await store.save('record-c', otherChannelEvent);
    await store.save('record-d', heldConflict);

    const result = await store.findFresh({
      channelId: matchingEvent.channelId,
      decoderProfileId: matchingEvent.decoderProfileId,
      fromUtc: '2026-11-18T14:59:00.000Z',
      toUtc: '2026-11-18T15:01:00.000Z',
    });
    expect(result).toEqual([matchingEvent]);

    await store.save('record-a', {
      ...matchingEvent,
      sourceDeviceIds: ['tv-device-a', 'tv-device-peer'],
      status: 'shared_corroborated',
    });
    await expect(
      store.findFresh({
        channelId: matchingEvent.channelId,
        decoderProfileId: matchingEvent.decoderProfileId,
        fromUtc: '2026-11-18T14:59:00.000Z',
        toUtc: '2026-11-18T15:01:00.000Z',
      })
    ).resolves.toEqual([
      {
        ...matchingEvent,
        sourceDeviceIds: ['tv-device-a', 'tv-device-peer'],
        status: 'shared_corroborated',
      },
    ]);
  });

  it('rejects invalid profiles, unsafe row rebinding, and attempts to persist PII', async () => {
    const store = createStore();
    const original = event();
    await store.save('record-a', original);

    await expect(
      store.save('record-a', {
        ...original,
        decoderProfileId: 'decoder-feed-b',
      })
    ).rejects.toThrow(/IDENTITY_CONFLICT/);
    await expect(
      store.findFresh({
        channelId: original.channelId,
        decoderProfileId: 'invalid profile',
        fromUtc: '2026-11-18T14:59:00.000Z',
        toUtc: '2026-11-18T15:01:00.000Z',
      })
    ).rejects.toThrow(/QUERY_INVALID/);

    expect(() =>
      database?.prepare(
        `INSERT INTO shared_intel_break_events (
           record_id, event_id, decoder_profile_id, channel_id, scope_id,
           break_started_at_utc, source_device_ids_json, status, contains_pii, received_at_utc
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).run(
        'pii-row',
        original.eventId,
        original.decoderProfileId,
        original.channelId,
        original.scopeId,
        original.breakStartedAtUtc,
        JSON.stringify(original.sourceDeviceIds),
        original.status,
        original.receivedAtUtc
      )
    ).toThrow();

    expect(() =>
      database?.prepare(
        `INSERT INTO shared_intel_break_events (
           record_id, event_id, decoder_profile_id, channel_id, scope_id,
           break_started_at_utc, source_device_ids_json, status, received_at_utc
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'invalid-time-row',
        original.eventId,
        original.decoderProfileId,
        original.channelId,
        original.scopeId,
        'not-a-utc-timestamp',
        JSON.stringify(original.sourceDeviceIds),
        original.status,
        original.receivedAtUtc
      )
    ).toThrow();
  });
});
