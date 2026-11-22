import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { hashSessionToken } from '../src/server/security.ts';
import type { D1AuthDatabaseBinding } from '../src/server/cloudflare/d1AuthSessionStore.ts';
import { D1AuthSessionStore } from '../src/server/cloudflare/d1AuthSessionStore.ts';

class SqliteD1Binding implements D1AuthDatabaseBinding {
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

  async batch(statements: Parameters<D1AuthDatabaseBinding['batch']>[0]) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

const migrationPath = path.resolve(
  process.cwd(),
  'migrations',
  'cloudflare-d1',
  '0003_auth_sessions_audit.sql'
);

describe('Cloudflare D1 auth, session, and audit store', () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function createDatabase(): { database: DatabaseSync; binding: SqliteD1Binding } {
    database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    database.exec(migrationSql);
    database.exec(migrationSql);
    return { database, binding: new SqliteD1Binding(database) };
  }

  it('persists registration, hashed sessions, login, rotation, expiry, logout, and audit across store instances', async () => {
    const { database: sqlite, binding } = createDatabase();
    let now = Date.parse('2026-11-18T15:00:00.000Z');
    const store = new D1AuthSessionStore(binding, {
      now: () => now,
      isProduction: () => false,
    });
    const registration = await store.registerUser({
      email: 'person@example.com',
      password: 'StrongPass!234',
      name: 'Test Person',
      organisationName: '',
      role: 'advertiser',
    });

    expect(registration.user).not.toHaveProperty('passwordHash');
    expect(registration.user.organisationName).toBe('Independent / Individual');
    expect(registration.session.token).toMatch(/^sess_[a-f0-9]{48}$/);
    expect(registration.session.tokenHash).toBe(hashSessionToken(registration.session.token));

    const persistedSession = sqlite
      .prepare('SELECT token_hash, csrf_token FROM edison_auth_sessions LIMIT 1')
      .get() as { token_hash: string; csrf_token: string };
    expect(persistedSession.token_hash).toBe(hashSessionToken(registration.session.token));
    expect(persistedSession.token_hash).not.toContain(registration.session.token);

    const restartedStore = new D1AuthSessionStore(binding, {
      now: () => now,
      isProduction: () => false,
    });
    await expect(restartedStore.getSessionByToken(registration.session.token)).resolves.toMatchObject({
      user: registration.user,
      session: {
        id: registration.session.id,
        csrfToken: registration.session.csrfToken,
        tokenHash: hashSessionToken(registration.session.token),
      },
    });

    await expect(
      restartedStore.registerUser({
        email: 'PERSON@example.com',
        password: 'AnotherPass!456',
        name: 'Duplicate Person',
        organisationName: '',
        role: 'household_viewer',
      })
    ).rejects.toThrow(/already exists/);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM edison_auth_sessions').get()).toMatchObject({
      count: 1,
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM edison_auth_users').get()).toMatchObject({
      count: 1,
    });
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM edison_auth_audit_logs').get()
    ).toMatchObject({ count: 1 });

    await expect(
      restartedStore.loginUser('person@example.com', 'incorrect-password')
    ).rejects.toThrow('Invalid email or password.');

    now += 1_000;
    const login = await restartedStore.loginUser(
      'PERSON@example.com',
      'StrongPass!234',
      registration.session.token
    );
    await expect(restartedStore.getSessionByToken(registration.session.token)).resolves.toBeNull();
    await expect(restartedStore.getSessionByToken(login.session.token)).resolves.toMatchObject({
      user: registration.user,
    });

    now += 61_000;
    await restartedStore.touchSessionActivity(login.session.token);
    const touched = sqlite
      .prepare('SELECT last_activity_at FROM edison_auth_sessions WHERE token_hash = ?')
      .get(hashSessionToken(login.session.token)) as { last_activity_at: string };
    expect(touched.last_activity_at).toBe(new Date(now).toISOString());

    await restartedStore.logoutSession(login.session.token);
    await expect(restartedStore.getSessionByToken(login.session.token)).resolves.toBeNull();

    now += 1_000;
    const idleSession = await restartedStore.loginUser('person@example.com', 'StrongPass!234');
    now = Date.parse(idleSession.session.idleExpiresAt) + 1;
    await expect(restartedStore.getSessionByToken(idleSession.session.token)).resolves.toBeNull();

    now += 1_000;
    const absoluteSession = await restartedStore.loginUser(
      'person@example.com',
      'StrongPass!234'
    );
    now = Date.parse(absoluteSession.session.expiresAt) + 1;
    await expect(
      restartedStore.getSessionByToken(absoluteSession.session.token)
    ).resolves.toBeNull();

    const auditActions = (await restartedStore.listAuditRecords()).map((record) => record.action);
    expect(auditActions).toContain('USER_REGISTERED');
    expect(auditActions).toContain('LOGIN_FAILED');
    expect(auditActions).toContain('USER_LOGGED_IN');
    expect(auditActions).toContain('USER_LOGGED_OUT');
  });

  it('records blocked production demo login and rejects invalid stored session records', async () => {
    const { database: sqlite, binding } = createDatabase();
    const productionStore = new D1AuthSessionStore(binding, {
      now: () => Date.parse('2026-11-18T15:00:00.000Z'),
      isProduction: () => true,
    });

    await expect(
      productionStore.loginUser('person@prototype.demo', 'password')
    ).rejects.toThrow(/disabled in production/);
    await expect(productionStore.listAuditRecords()).resolves.toMatchObject([
      { action: 'DEMO_AUTH_BLOCKED_IN_PRODUCTION', actorRole: 'anonymous' },
    ]);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO edison_auth_sessions (
             token_hash, session_id, user_id, role, csrf_token,
             created_at, last_activity_at, idle_expires_at, expires_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'not-a-token-hash',
          'sid-invalid',
          'missing-user',
          'advertiser',
          'csrf',
          'not-a-date',
          'not-a-date',
          'not-a-date',
          'not-a-date'
        )
    ).toThrow(/CHECK constraint failed/);
  });

  it('retains only the 500 newest authentication audit records', async () => {
    const { binding } = createDatabase();
    let now = Date.parse('2026-11-18T15:00:00.000Z');
    const store = new D1AuthSessionStore(binding, {
      now: () => now,
      isProduction: () => false,
    });

    for (let index = 0; index < 502; index += 1) {
      now += 1;
      await store.recordSecurityAudit(null, 'AUDIT_TEST', String(index), '');
    }

    const records = await store.listAuditRecords();
    expect(records).toHaveLength(500);
    expect(records[0].targetId).toBe('501');
    expect(records.some((record) => record.targetId === '0')).toBe(false);
    expect(records.some((record) => record.targetId === '1')).toBe(false);
  });
});
