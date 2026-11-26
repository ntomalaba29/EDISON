import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { D1TvEnrollmentStore } from '../src/server/cloudflare/d1TvEnrollmentStore.ts';
import type { D1AuthDatabaseBinding } from '../src/server/cloudflare/d1AuthSessionStore.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

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
        return { success: true, results: statement.all(...values) as T[] };
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
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

describe('Cloudflare D1 Android TV enrollment', () => {
  let database: DatabaseSync | undefined;
  let temporaryRoot: string | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    if (temporaryRoot && fs.existsSync(temporaryRoot)) {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
    temporaryRoot = undefined;
  });

  function createApp(secret = 'a'.repeat(64)) {
    database = new DatabaseSync(':memory:');
    database.exec(
      fs.readFileSync(
        path.resolve(process.cwd(), 'migrations', 'cloudflare-d1', '0004_tv_enrollments.sql'),
        'utf8'
      )
    );
    const store = new EdisonPrototypeStore({ storageMode: 'memory' });
    const app = createEdisonApp(store, {
      tvEnrollmentStore: new D1TvEnrollmentStore(new SqliteD1Binding(database)),
      tvEnrollmentHmacSecret: secret,
    });
    return { app, database };
  }

  async function registerViewer(app: ReturnType<typeof createApp>['app']) {
    const response = await request(app).post('/api/auth/register').send({
      email: 'tv-owner@example.test',
      password: 'StrongPass!234',
      name: 'TV Owner',
      organisationName: 'EDISON Test',
      role: 'household_viewer',
    });
    expect(response.status).toBe(201);
    return { Authorization: `Bearer ${response.body.token}` };
  }

  it('creates a hashed D1 enrollment, requires owner approval, and supports status and revocation', async () => {
    const { app, database: db } = createApp();
    const auth = await registerViewer(app);
    const start = await request(app)
      .post('/api/tv/enrollment/start')
      .send({ deviceLabel: 'Living Room TV' });

    expect(start.status, JSON.stringify(start.body)).toBe(201);
    expect(start.body.pairingCode).toMatch(/^\d{8}$/);
    expect(start.body.deviceToken).toMatch(/^[A-Za-z0-9_-]{40,64}$/);
    const stored = db
      .prepare(
        'SELECT pairing_code_hash, device_token_hash FROM edison_tv_enrollments WHERE enrollment_id = ?'
      )
      .get(start.body.enrollmentId) as { pairing_code_hash: string; device_token_hash: string };
    expect(stored.pairing_code_hash).not.toBe(start.body.pairingCode);
    expect(stored.device_token_hash).not.toBe(start.body.deviceToken);

    const unapprovedStatus = await request(app)
      .get(`/api/tv/enrollment/${start.body.enrollmentId}`)
      .set('Authorization', `Bearer ${start.body.deviceToken}`);
    expect(unapprovedStatus.status).toBe(200);
    expect(unapprovedStatus.body.status).toBe('pending');

    const unauthenticatedApproval = await request(app)
      .post('/api/tv/enrollment/approve')
      .send({
        enrollmentId: start.body.enrollmentId,
        pairingCode: start.body.pairingCode,
      });
    expect(unauthenticatedApproval.status).toBe(403);

    const approvalDetails = await request(app)
      .get(`/api/tv/enrollment/${start.body.enrollmentId}/approval-details`)
      .set(auth);
    expect(approvalDetails.body.enrollment.deviceLabel).toBe('Living Room TV');

    const advertiserRegistration = await request(app).post('/api/auth/register').send({
      email: 'tv-advertiser@example.test',
      password: 'StrongPass!234',
      name: 'TV Advertiser',
      organisationName: 'EDISON Test',
      role: 'advertiser',
    });
    const forbiddenApproval = await request(app)
      .post('/api/tv/enrollment/approve')
      .set({ Authorization: `Bearer ${advertiserRegistration.body.token}` })
      .send({
        enrollmentId: start.body.enrollmentId,
        pairingCode: start.body.pairingCode,
      });
    expect(forbiddenApproval.status).toBe(403);

    const approval = await request(app)
      .post('/api/tv/enrollment/approve')
      .set(auth)
      .send({
        enrollmentId: start.body.enrollmentId,
        pairingCode: start.body.pairingCode,
      });
    expect(approval.status).toBe(200);

    const approvedStatus = await request(app)
      .get(`/api/tv/enrollment/${start.body.enrollmentId}`)
      .set('Authorization', `Bearer ${start.body.deviceToken}`);
    expect(approvedStatus.body.status).toBe('approved');
    expect(approvedStatus.body.deviceId).toBe(start.body.deviceId);

    const devices = await request(app).get('/api/tv/devices').set(auth);
    expect(devices.body.items).toHaveLength(1);
    expect(devices.body.items[0].deviceLabel).toBe('Living Room TV');

    const otherOwner = await request(app).post('/api/auth/register').send({
      email: 'other-tv-owner@example.test',
      password: 'StrongPass!234',
      name: 'Other TV Owner',
      organisationName: 'EDISON Test',
      role: 'household_viewer',
    });
    const crossOwnerRevocation = await request(app)
      .post(`/api/tv/devices/${start.body.enrollmentId}/revoke`)
      .set({ Authorization: `Bearer ${otherOwner.body.token}` });
    expect(crossOwnerRevocation.status).toBe(404);

    const revoked = await request(app)
      .post(`/api/tv/devices/${start.body.enrollmentId}/revoke`)
      .set(auth);
    expect(revoked.status).toBe(204);
    const revokedStatus = await request(app)
      .get(`/api/tv/enrollment/${start.body.enrollmentId}`)
      .set('Authorization', `Bearer ${start.body.deviceToken}`);
    expect(revokedStatus.body.status).toBe('revoked');
  });

  it('locks approval after five bad codes and refuses invalid or expired sessions', async () => {
    const { app, database: db } = createApp();
    const auth = await registerViewer(app);
    const start = await request(app)
      .post('/api/tv/enrollment/start')
      .send({ deviceLabel: 'Bedroom TV' });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const invalid = await request(app)
        .post('/api/tv/enrollment/approve')
        .set(auth)
        .send({ enrollmentId: start.body.enrollmentId, pairingCode: '00000000' });
      expect(invalid.status).toBe(400);
    }
    const locked = await request(app)
      .post('/api/tv/enrollment/approve')
      .set(auth)
      .send({ enrollmentId: start.body.enrollmentId, pairingCode: '00000000' });
    expect(locked.status).toBe(429);

    const expiredStart = await request(app)
      .post('/api/tv/enrollment/start')
      .send({ deviceLabel: 'Guest Room TV' });
    db.prepare(
      "UPDATE edison_tv_enrollments SET expires_at = '2000-01-01T00:00:00.000Z' WHERE enrollment_id = ?"
    ).run(expiredStart.body.enrollmentId);
    const expired = await request(app)
      .post('/api/tv/enrollment/approve')
      .set(auth)
      .send({
        enrollmentId: expiredStart.body.enrollmentId,
        pairingCode: expiredStart.body.pairingCode,
      });
    expect(expired.status).toBe(410);
    const expiredStatus = await request(app)
      .get(`/api/tv/enrollment/${expiredStart.body.enrollmentId}`)
      .set('Authorization', `Bearer ${expiredStart.body.deviceToken}`);
    expect(expiredStatus.body.status).toBe('expired');
  });

  it('fails closed when the pairing HMAC secret is missing or too short', async () => {
    const { app } = createApp('short');
    const response = await request(app)
      .post('/api/tv/enrollment/start')
      .send({ deviceLabel: 'Office TV' });
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('TV_ENROLLMENT_UNAVAILABLE');
  });

  it('retains approved device enrollment after the D1 connection is reopened', async () => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-tv-enrollment-'));
    const databasePath = path.join(temporaryRoot, 'enrollments.sqlite');
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), 'migrations', 'cloudflare-d1', '0004_tv_enrollments.sql'),
      'utf8'
    );
    database = new DatabaseSync(databasePath);
    database.exec(migration);
    database.exec(migration);
    const store = new D1TvEnrollmentStore(new SqliteD1Binding(database));
    const pairingCodeHash = crypto
      .createHmac('sha256', Buffer.from('a'.repeat(64), 'hex'))
      .update('12345678')
      .digest('hex');
    const deviceTokenHash = crypto.createHash('sha256').update('device-token').digest('hex');
    const now = new Date().toISOString();
    await store.create({
      enrollmentId: 'enrollment_persistent_01',
      deviceId: 'tv_persistent_device_01',
      deviceLabel: 'Persistent TV',
      pairingCodeHash,
      deviceTokenHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: now,
    });
    await expect(
      store.approve({
        enrollmentId: 'enrollment_persistent_01',
        pairingCodeHash,
        ownerId: 'owner_persistent_01',
        now,
      })
    ).resolves.toBe('approved');
    database.close();
    database = new DatabaseSync(databasePath);

    await expect(
      new D1TvEnrollmentStore(new SqliteD1Binding(database)).getByDeviceTokenHash(
        'enrollment_persistent_01',
        deviceTokenHash
      )
    ).resolves.toMatchObject({
      deviceId: 'tv_persistent_device_01',
      ownerId: 'owner_persistent_01',
      status: 'approved',
    });
  });
});
