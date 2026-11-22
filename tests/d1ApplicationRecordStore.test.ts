import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { D1DatabaseBinding } from '../src/server/cloudflare/d1BreakEventStore.ts';
import { D1ApplicationRecordStore } from '../src/server/cloudflare/d1ApplicationRecordStore.ts';

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
  '0002_application_records.sql'
);

interface WorkItem {
  id: string;
  ownerId: string;
  title: string;
}

function decodeWorkItem(value: unknown): WorkItem {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('ownerId' in value) ||
    typeof value.ownerId !== 'string' ||
    !('title' in value) ||
    typeof value.title !== 'string'
  ) {
    throw new Error('WORK_ITEM_INVALID');
  }
  return { id: value.id, ownerId: value.ownerId, title: value.title };
}

describe('Cloudflare D1 application record store', () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function createStore(): D1ApplicationRecordStore {
    database = new DatabaseSync(':memory:');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    database.exec(migrationSql);
    database.exec(migrationSql);
    return new D1ApplicationRecordStore(new SqliteD1Binding(database));
  }

  it('applies its migration idempotently and validates bounded reads, writes, updates, and deletes', async () => {
    const store = createStore();
    const first = { id: 'item-1', ownerId: 'owner-a', title: 'Initial' };
    const second = { id: 'item-2', ownerId: 'owner-b', title: 'Other' };
    await store.put('work_items', first.id, first, decodeWorkItem, first.ownerId);
    await store.put('work_items', second.id, second, decodeWorkItem, second.ownerId);

    await expect(store.get('work_items', first.id, decodeWorkItem)).resolves.toEqual(first);
    await expect(
      store.list('work_items', decodeWorkItem, { ownerId: 'owner-a' })
    ).resolves.toEqual([first]);
    await expect(
      store.list('work_items', decodeWorkItem, { limit: 1 })
    ).resolves.toHaveLength(1);

    const updated = { ...first, title: 'Updated' };
    await store.put('work_items', first.id, updated, decodeWorkItem, first.ownerId);
    await expect(store.get('work_items', first.id, decodeWorkItem)).resolves.toEqual(updated);

    await store.delete('work_items', first.id);
    await expect(store.get('work_items', first.id, decodeWorkItem)).resolves.toBeNull();
  });

  it('rejects invalid keys, codecs, query bounds, malformed rows, and database failures', async () => {
    const store = createStore();
    const item = { id: 'item-1', ownerId: 'owner-a', title: 'Valid' };
    const invalidItem: unknown = { ...item, title: 1 };
    await expect(
      store.put('Invalid-Collection', item.id, item, decodeWorkItem, item.ownerId)
    ).rejects.toThrow(/COLLECTION_INVALID/);
    await expect(
      store.put(
        'work_items',
        item.id,
        invalidItem,
        decodeWorkItem,
        item.ownerId
      )
    ).rejects.toThrow('WORK_ITEM_INVALID');
    await expect(
      store.list('work_items', decodeWorkItem, { limit: 501 })
    ).rejects.toThrow(/QUERY_INVALID/);

    expect(() =>
      database
        ?.prepare(
          `INSERT INTO edison_application_records (collection, record_id, payload_json)
           VALUES (?, ?, ?)`
        )
        .run('work_items', 'invalid-json', '{')
    ).toThrow(/CHECK constraint failed/);

    const corruptBinding: D1DatabaseBinding = {
      prepare: () => ({
        bind() {
          return this;
        },
        async all<T = Record<string, unknown>>() {
          return {
            success: true,
            results: [
              {
                collection: 'work_items',
                record_id: 'malformed',
                owner_id: null,
                payload_json: '{',
                created_at: '2026-11-18T15:00:00.000Z',
                updated_at: '2026-11-18T15:00:00.000Z',
              } as T,
            ],
          };
        },
        async run() {
          return { success: true };
        },
      }),
    };
    const corruptStore = new D1ApplicationRecordStore(corruptBinding);
    await expect(corruptStore.get('work_items', 'malformed', decodeWorkItem)).rejects.toThrow(
      /ROW_INVALID/
    );

    const failingBinding: D1DatabaseBinding = {
      prepare: () => ({
        bind() {
          return this;
        },
        async all<T = Record<string, unknown>>() {
          return { success: false, error: 'database unavailable' };
        },
        async run() {
          return { success: false, error: 'database unavailable' };
        },
      }),
    };
    const failingStore = new D1ApplicationRecordStore(failingBinding);
    await expect(failingStore.get('work_items', 'item-1', decodeWorkItem)).rejects.toThrow(
      /D1_APPLICATION_RECORD_READ_FAILED: database unavailable/
    );
    await expect(
      failingStore.put('work_items', item.id, item, decodeWorkItem, item.ownerId)
    ).rejects.toThrow(/D1_APPLICATION_RECORD_WRITE_FAILED: database unavailable/);
  });
});
