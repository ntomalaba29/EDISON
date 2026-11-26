import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  D1AuthSessionStore,
  type D1AuthDatabaseBinding,
} from '../src/server/cloudflare/d1AuthSessionStore.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { D1DomainRecordRepository } from '../src/server/cloudflare/d1DomainRecordRepository.ts';

class SqliteD1Binding implements D1AuthDatabaseBinding {
  failBatch = false;
  failAuditRead = false;
  failRun = false;

  constructor(private readonly database: DatabaseSync) {}

  prepare(query: string) {
    const statement = this.database.prepare(query);
    const binding = this;
    let values: SQLInputValue[] = [];

    return {
      bind(...boundValues: Array<string | number | null>) {
        values = boundValues;
        return this;
      },
      async all<T = Record<string, unknown>>() {
        if (binding.failAuditRead && query.includes('FROM edison_auth_audit_logs')) {
          throw new Error('test audit database unavailable');
        }
        return { success: true, results: statement.all(...values) as T[] };
      },
      async run() {
        if (binding.failRun) {
          throw new Error('test domain database unavailable');
        }
        const result = statement.run(...values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }

  async batch(statements: Parameters<D1AuthDatabaseBinding['batch']>[0]) {
    if (this.failBatch) {
      throw new Error('test database unavailable');
    }
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

describe('D1 authentication/session Express integration', () => {
  let database: DatabaseSync | undefined;
  let tempRoot: string | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
    tempRoot = undefined;
  });

  function createApp() {
    database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    database.exec(
      fs.readFileSync(
        path.resolve(process.cwd(), 'migrations', 'cloudflare-d1', '0003_auth_sessions_audit.sql'),
        'utf8'
      )
    );
    database.exec(
      fs.readFileSync(
        path.resolve(process.cwd(), 'migrations', 'cloudflare-d1', '0002_application_records.sql'),
        'utf8'
      )
    );
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-d1-auth-app-'));
    const binding = new SqliteD1Binding(database);
    const authSessionRepository = new D1AuthSessionStore(binding, {
      isProduction: () => false,
    });
    const domainRecordRepository = new D1DomainRecordRepository(binding);
    const store = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot, 'data'),
    });
    const app = createEdisonApp(store, {
      uploadsDir: path.join(tempRoot, 'uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    return {
      app,
      database,
      authSessionRepository,
      domainRecordRepository,
      binding,
      store,
    };
  }

  it('uses D1 for registration, login, session lookup, logout, and CSRF audit writes', async () => {
    const { app, authSessionRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-advertiser@example.com',
      password: 'StrongPass!234',
      name: 'D1 Advertiser',
      organisationName: 'D1 Trading',
      role: 'advertiser',
    });

    expect(registration.status).toBe(201);
    const token = registration.body.token as string;
    const authenticated = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(authenticated.status).toBe(200);
    expect(authenticated.body.user).toMatchObject({
      email: 'd1-advertiser@example.com',
      role: 'advertiser',
    });

    const profile = await request(app)
      .get('/api/advertiser/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.profile).toMatchObject({
      businessOrTradingName: 'D1 Trading',
      countryCode: 'ZW',
      primaryContactEmail: 'd1-advertiser@example.com',
    });

    const setCookieHeaders = registration.headers['set-cookie'];
    const cookieHeader = (Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders])
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const csrfRejected = await request(app)
      .post('/api/qr')
      .set('Cookie', cookieHeader)
      .send({});
    expect(csrfRejected.status).toBe(403);

    const login = await request(app).post('/api/auth/login').send({
      email: 'D1-Advertiser@example.com',
      password: 'StrongPass!234',
    });
    expect(login.status).toBe(200);

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(logout.status).toBe(200);
    const loggedOut = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(loggedOut.body.user).toBeNull();

    const auditActions = (await authSessionRepository.listAuditRecords()).map(
      (record) => record.action
    );
    expect(auditActions).toEqual(
      expect.arrayContaining([
        'USER_REGISTERED',
        'SECURITY_CSRF_REJECTED',
        'USER_LOGGED_IN',
        'USER_LOGGED_OUT',
      ])
    );
  });

  it('merges D1 and domain audit rows in admin list/export responses', async () => {
    const { app, database: sqlite, authSessionRepository, store, binding } = createApp();
    store.recordSecurityAudit(null, 'DOMAIN_AUDIT_TEST', 'domain-target', 'Domain audit row.');

    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-admin@example.com',
      password: 'StrongPass!234',
      name: 'D1 Admin',
      organisationName: 'D1 Administration',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);

    sqlite!.exec(
      `UPDATE edison_auth_users SET role = 'admin' WHERE email = 'd1-admin@example.com';
       UPDATE edison_auth_sessions SET role = 'admin' WHERE user_id = (
         SELECT user_id FROM edison_auth_users WHERE email = 'd1-admin@example.com'
       );`
    );

    const login = await request(app).post('/api/auth/login').send({
      email: 'd1-admin@example.com',
      password: 'StrongPass!234',
    });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('admin');

    const listed = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'USER_REGISTERED',
          targetType: 'auth',
        }),
        expect.objectContaining({
          action: 'DOMAIN_AUDIT_TEST',
          targetType: 'auth',
        }),
      ])
    );

    const exported = await request(app)
      .get('/api/admin/audit-logs/export?format=json&targetType=auth&limit=1000')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(exported.status).toBe(200);
    expect(exported.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'USER_REGISTERED',
          targetType: 'auth',
        }),
        expect.objectContaining({
          action: 'DOMAIN_AUDIT_TEST',
          targetType: 'auth',
        }),
      ])
    );

    binding.failAuditRead = true;
    const readFailure = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(readFailure.status).toBe(500);
    binding.failAuditRead = false;
    binding.failBatch = true;
    const writeFailure = await request(app)
      .get('/api/admin/audit-logs/export?format=json')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(writeFailure.status).toBe(500);

    const auditActions = (await authSessionRepository.listAuditRecords()).map(
      (record) => record.action
    );
    expect(auditActions).toContain('ADMIN_AUDIT_LOG_EXPORTED');
  });

  it('persists Shared Intelligence preview state through D1 with zero PII', async () => {
    const { app, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-intel@example.com',
      password: 'StrongPass!234',
      name: 'Shared Intel',
      organisationName: '',
      role: 'household_viewer',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const observation = await request(app)
      .post('/api/shared-intelligence/observations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tvDeviceId: 'tv_d1_alpha',
        scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
        signalType: 'scte35',
        estimatedBreakDurationSec: 120,
        transitionLatencyMs: 350,
      });
    expect(observation.status).toBe(201);
    expect(observation.body.observation.containsPii).toBe(false);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'shared-intel-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'shared-intel-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const preview = await request(reconstructedApp)
      .get('/api/shared-intelligence/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.zeroPiiEnforced).toBe(true);
    expect(preview.body.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tvDeviceId: 'tv_d1_alpha',
          containsPii: false,
        }),
      ])
    );
  });

  it('persists AURA paired-device state through D1 after store reconstruction', async () => {
    const { app, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-aura-owner@example.com',
      password: 'StrongPass!234',
      name: 'AURA Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const initiated = await request(app)
      .post('/api/aura/pair/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tvLabel: 'D1 Living Room TV',
        platformId: 'simulation_tv',
      });
    expect(initiated.status).toBe(201);
    const deviceId = initiated.body.device.deviceId as string;

    const confirmed = await request(app)
      .post('/api/aura/pair/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId,
        pairingCode: initiated.body.device.pairingCode,
        activeProfileId: 'profile_d1_aura',
      });
    expect(confirmed.status).toBe(200);
    expect(await domainRecordRepository.listAuraDevicesForUser(registration.body.user))
      .toEqual([expect.objectContaining({ deviceId, pairingStatus: 'paired' })]);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'aura-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'aura-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const listed = await request(reconstructedApp)
      .get('/api/aura/devices')
      .set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual([
      expect.objectContaining({
        deviceId,
        pairingStatus: 'paired',
        activeProfileId: 'profile_d1_aura',
      }),
    ]);
  });

  it('hydrates admin moderation overview records from D1 after store reconstruction', async () => {
    const { app, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-moderation-owner@example.com',
      password: 'StrongPass!234',
      name: 'Moderation Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const qr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({
        label: 'D1 moderation QR',
        destinationType: 'website',
        rawInput: 'https://example.com/d1-moderation',
      });
    expect(qr.status).toBe(201);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'admin-moderation-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'admin-moderation-reconstructed-uploads'),
      domainRecordRepository,
    });
    const adminLogin = await request(reconstructedApp).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const moderation = await request(reconstructedApp)
      .patch(`/api/admin/qr/${qr.body.item.token}/moderate`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ status: 'flagged', reason: 'D1 moderation persistence test.' });
    expect(moderation.status).toBe(200);
    expect(await domainRecordRepository.getQrLinkByToken(qr.body.item.token)).toMatchObject({
      status: 'flagged',
    });
    const overview = await request(reconstructedApp)
      .get('/api/admin/moderation-overview')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.qrLinks).toEqual(
      expect.arrayContaining([expect.objectContaining({ token: qr.body.item.token })])
    );
    const adminQrList = await request(reconstructedApp)
      .get('/api/qr')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(adminQrList.status).toBe(200);
    expect(adminQrList.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: qr.body.item.token, status: 'flagged' }),
      ])
    );
  });

  it('persists ad creatives through D1 and attaches them to campaigns', async () => {
    const { app, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-creative@example.com',
      password: 'StrongPass!234',
      name: 'D1 Creative',
      organisationName: 'D1 Creative Trading',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const campaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Creative Test Campaign',
        contentCategory: 'commercial_advertising',
        summary: 'Campaign for D1 creative persistence',
        durationSeconds: 15,
        dailyFrequencyCap: 4,
        targetRegions: ['ZW'],
        dayparts: ['daytime'],
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    expect(campaign.status).toBe(201);

    const creative = await request(app)
      .post('/api/ad-creatives')
      .set('Authorization', `Bearer ${token}`)
      .send({
        campaignId: campaign.body.item.id,
        title: 'D1 Text Creative',
        mode: 'text_only_commercial',
        displayDurationSeconds: 15,
        safeZoneWarnings: [],
        contrastWarnings: [],
        textOnly: {
          advertiserName: 'D1 Creative',
          headline: 'D1 Headline',
          messageBody: 'A persisted text-only creative.',
          contactInfo: 'd1@example.com',
          backgroundColor: '#0F172A',
          accentColor: '#F59E0B',
          textColor: '#FFFFFF',
          qrPlacement: 'bottom_right',
        },
      });
    expect(creative.status).toBe(201);

    const listed = await request(app)
      .get('/api/ad-creatives')
      .set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: creative.body.item.id,
          title: 'D1 Text Creative',
          ownerId: registration.body.user.id,
        }),
      ])
    );

    const updated = await request(app)
      .put(`/api/ad-creatives/${creative.body.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        campaignId: campaign.body.item.id,
        title: 'D1 Updated Creative',
        mode: 'text_only_commercial',
        displayDurationSeconds: 20,
        safeZoneWarnings: [],
        contrastWarnings: [],
        textOnly: {
          advertiserName: 'D1 Creative',
          headline: 'D1 Updated Headline',
          messageBody: 'Updated persisted creative.',
          contactInfo: 'd1@example.com',
          backgroundColor: '#0F172A',
          accentColor: '#F59E0B',
          textColor: '#FFFFFF',
          qrPlacement: 'bottom_right',
        },
      });
    expect(updated.status).toBe(200);
    expect(updated.body.item.title).toBe('D1 Updated Creative');

    const attached = await request(app)
      .post(`/api/ad-creatives/${creative.body.item.id}/attach`)
      .set('Authorization', `Bearer ${token}`)
      .send({ campaignId: campaign.body.item.id });
    expect(attached.status).toBe(200);
    expect(attached.body.creative.campaignId).toBe(campaign.body.item.id);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'creative-admin-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'creative-admin-reconstructed-uploads'),
      domainRecordRepository,
    });
    const adminLogin = await request(reconstructedApp).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const clearedFlag = await request(reconstructedApp)
      .post(`/api/admin/creatives/${creative.body.item.id}/clear-qr-flag`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ notes: 'Verified D1 creative record.' });
    expect(clearedFlag.status).toBe(200);
    expect(await domainRecordRepository.getAdCreativeById(creative.body.item.id)).toMatchObject({
      status: 'ready_for_preview',
    });

    const persisted = await domainRecordRepository.listAdCreativesForUser(
      registration.body.user,
    );
    expect(persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: creative.body.item.id,
          title: 'D1 Updated Creative',
          campaignId: campaign.body.item.id,
        }),
      ])
    );

    const deleted = await request(app)
      .delete(`/api/ad-creatives/${creative.body.item.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    const remaining = await domainRecordRepository.listAdCreativesForUser(
      registration.body.user,
    );
    expect(remaining.map((item) => item.id)).not.toContain(creative.body.item.id);
  });

  it('persists support tickets through D1 with owner visibility', async () => {
    const { app, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-support@example.com',
      password: 'StrongPass!234',
      name: 'D1 Support',
      organisationName: 'D1 Support Trading',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const created = await request(app)
      .post('/api/support-tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'qr_technical',
        subject: 'QR redirect issue',
        message: 'The campaign QR should open the intended destination.',
      });
    expect(created.status).toBe(201);
    expect(created.body.item.status).toBe('open');

    const listed = await request(app)
      .get('/api/support-tickets')
      .set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.item.id,
          ownerId: registration.body.user.id,
          subject: 'QR redirect issue',
          status: 'open',
        }),
      ])
    );

    const closed = await request(app)
      .patch(`/api/support-tickets/${created.body.item.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed' });
    expect(closed.status).toBe(200);
    expect(closed.body.item.status).toBe('closed');

    const persisted = await domainRecordRepository.listSupportTicketsForUser(
      registration.body.user,
    );
    expect(persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.item.id,
          status: 'closed',
        }),
      ])
    );
  });

  it('persists opportunities and complaints while preserving D1 owner visibility', async () => {
    const {
      app,
      binding,
      database: sqlite,
      authSessionRepository,
      domainRecordRepository,
    } = createApp();
    const ownerRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-opportunity-owner@example.com',
      password: 'StrongPass!234',
      name: 'Opportunity Owner',
      organisationName: 'Opportunity Owner Trading',
      role: 'opportunity_submitter',
    });
    const reporterRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-opportunity-reporter@example.com',
      password: 'StrongPass!234',
      name: 'Opportunity Reporter',
      organisationName: 'Opportunity Reporter Trading',
      role: 'opportunity_submitter',
    });
    expect(ownerRegistration.status).toBe(201);
    expect(reporterRegistration.status).toBe(201);
    const ownerToken = ownerRegistration.body.token as string;
    const reporterToken = reporterRegistration.body.token as string;

    const linkedCampaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'D1 Opportunity Zero-Cost Campaign',
        contentCategory: 'opportunity_promotion',
        summary: 'Free campaign for a verified opportunity.',
        durationSeconds: 30,
        dailyFrequencyCap: 4,
        targetRegions: ['ZW'],
        dayparts: ['daytime'],
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    expect(linkedCampaign.status).toBe(201);

    const opportunityInput = {
      providerType: 'individual_informal_employer',
      providerName: 'D1 Workshop',
      category: 'apprenticeship',
      title: 'D1 Workshop Trainee',
      description: 'A paid, no-fee training opportunity.',
      location: 'Harare, Zimbabwe',
      eligibilityRequirements: 'Reliable attendance.',
      applicationMethod: 'Apply through the free EDISON portal.',
      contactInfo: 'workshop@example.com',
      linkedCampaignId: linkedCampaign.body.item.id,
      closingDate: '2027-03-01',
      expiryDate: '2027-03-15',
      identityEvidenceRef: 'ID-REF-01',
      organisationEvidenceRef: '',
      specificOpportunityEvidenceRef: 'OPP-REF-01',
      applicationFeeFreeConfirmed: true,
      noGuaranteeConfirmed: true,
    };
    const created = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(opportunityInput);
    expect(created.status).toBe(201);

    const hiddenFromOtherUser = await request(app)
      .get('/api/opportunities')
      .set('Authorization', `Bearer ${reporterToken}`);
    expect(hiddenFromOtherUser.body.items.map((item: { id: string }) => item.id)).not.toContain(
      created.body.item.id
    );

    const complaint = await request(app)
      .post(`/api/opportunities/${created.body.item.id}/complaints`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        reasonCategory: 'other',
        description: 'Please verify this listing before publication.',
        evidenceDetails: 'Test evidence reference.',
      });
    expect(complaint.status).toBe(201);

    const ownerComplaints = await request(app)
      .get('/api/opportunity-complaints')
      .set('Authorization', `Bearer ${ownerToken}`);
    const reporterComplaints = await request(app)
      .get('/api/opportunity-complaints')
      .set('Authorization', `Bearer ${reporterToken}`);
    expect(ownerComplaints.body.items.map((item: { id: string }) => item.id)).toContain(
      complaint.body.item.id
    );
    expect(reporterComplaints.body.items.map((item: { id: string }) => item.id)).toContain(
      complaint.body.item.id
    );
    const reporterOverview = await request(app)
      .get('/api/opportunity-ops/overview')
      .set('Authorization', `Bearer ${reporterToken}`);
    expect(reporterOverview.status).toBe(200);
    expect(reporterOverview.body.overview.summary).toMatchObject({
      totalEvaluated: 0,
      openComplaintsCount: 1,
    });

    const reloadedRepository = new D1DomainRecordRepository(binding);
    const persistedOpportunities = await reloadedRepository.listOpportunitiesForUser(
      ownerRegistration.body.user
    );
    expect(persistedOpportunities).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.item.id })])
    );
    const persistedComplaints = await reloadedRepository.listOpportunityComplaintsForUser(
      reporterRegistration.body.user
    );
    expect(persistedComplaints).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: complaint.body.item.id })])
    );

    binding.failRun = true;
    const writeFailure = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(opportunityInput);
    expect(writeFailure.status).toBe(500);
    binding.failRun = false;

    if (!sqlite) throw new Error('D1 test database was not initialized.');
    sqlite
      .prepare('UPDATE edison_auth_users SET role = ? WHERE user_id = ?')
      .run('admin', ownerRegistration.body.user.id);
    const rejected = await request(app)
      .patch(`/api/admin/opportunities/${created.body.item.id}/verify-tiers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ targetStatus: 'rejected', rejectionReason: 'Test listing rejection.' });
    expect(rejected.status).toBe(200);

    const appeal = await request(app)
      .post(`/api/opportunities/${created.body.item.id}/appeals`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'Request another review of this listing.',
        additionalEvidence: 'Additional test evidence.',
      });
    expect(appeal.status).toBe(201);
    const listedAppeals = await request(app)
      .get('/api/opportunity-appeals')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listedAppeals.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: appeal.body.item.id })])
    );

    await domainRecordRepository.putCampaign({
      ...linkedCampaign.body.item,
      simulatedEstimate: {
        ...linkedCampaign.body.item.simulatedEstimate,
        estimatedTotalUsd: 1,
      },
    });
    if (!tempRoot) throw new Error('D1 opportunity overview test directory was not initialized.');
    const reconstructedApp = createEdisonApp(
      new EdisonPrototypeStore({
        dataDir: path.join(tempRoot, 'opportunity-overview-reconstructed-data'),
      }),
      {
        uploadsDir: path.join(tempRoot, 'opportunity-overview-reconstructed-uploads'),
        authSessionRepository,
        domainRecordRepository,
      }
    );
    const adminOverview = await request(reconstructedApp)
      .get('/api/opportunity-ops/overview')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.overview.summary).toMatchObject({
      totalEvaluated: 1,
      openComplaintsCount: 1,
      openAppealsCount: 1,
      feeIndependenceViolations: 1,
    });
    expect(adminOverview.body.overview.assessments[0].opportunityId).toBe(created.body.item.id);

    const resolvedAppeal = await request(app)
      .patch(`/api/admin/opportunity-appeals/${appeal.body.item.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'denied', adminNotes: 'Evidence was reviewed.' });
    expect(resolvedAppeal.status).toBe(200);

    const deleted = await request(app)
      .delete(`/api/opportunities/${created.body.item.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleted.status).toBe(200);
    expect(
      (await reloadedRepository.listOpportunitiesForUser(ownerRegistration.body.user)).map(
        (item) => item.id
      )
    ).not.toContain(created.body.item.id);
    expect(
      (await reloadedRepository.listOpportunityComplaintsForUser(reporterRegistration.body.user))
        .map((item) => item.id)
    ).not.toContain(complaint.body.item.id);
  });

  it('persists household consent state without exposing exact location to other actors', async () => {
    const { app, authSessionRepository, domainRecordRepository, binding } = createApp();
    const ownerRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-household-owner@example.com',
      password: 'StrongPass!234',
      name: 'Household Owner',
      organisationName: 'Household Owner',
      role: 'household_viewer',
    });
    const otherRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-household-other@example.com',
      password: 'StrongPass!234',
      name: 'Other Household',
      organisationName: 'Other Household',
      role: 'household_viewer',
    });
    const advertiserRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-household-advertiser@example.com',
      password: 'StrongPass!234',
      name: 'Household Advertiser',
      organisationName: 'Household Advertiser',
      role: 'advertiser',
    });
    const adminRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-compliance-admin@example.com',
      password: 'StrongPass!234',
      name: 'Compliance Admin',
      organisationName: 'Compliance Admin',
      role: 'household_viewer',
    });
    expect(ownerRegistration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    expect(advertiserRegistration.status).toBe(201);
    expect(adminRegistration.status).toBe(201);
    const ownerToken = ownerRegistration.body.token as string;
    const otherToken = otherRegistration.body.token as string;
    const advertiserToken = advertiserRegistration.body.token as string;
    const adminToken = adminRegistration.body.token as string;
    if (!database) throw new Error('D1 household integration database was not initialized.');
    expect(await authSessionRepository.getSessionByToken(otherToken)).not.toBeNull();
    database
      .prepare('UPDATE edison_auth_users SET role = ? WHERE user_id = ?')
      .run('admin', adminRegistration.body.user.id);
    database
      .prepare('UPDATE edison_auth_sessions SET role = ? WHERE user_id = ?')
      .run('admin', adminRegistration.body.user.id);
    const exactLocation = '1 Test Road, Sample Estate';

    const created = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        householdLabel: 'D1 Test Household',
        tvDeviceLabel: 'D1 Test TV',
        location: {
          countryCode: 'ZW',
          provinceOrRegion: 'Harare Metropolitan',
          metroArea: 'Greater Harare',
          cityOrTown: 'Harare',
          district: 'Harare Urban',
          suburbOrArea: 'Avondale',
          exactInstallationLocation: exactLocation,
        },
        commercialConsentGranted: true,
      });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toContain(exactLocation);
    expect(created.body.item.publicLocation.exactLocationRedacted).toBe(true);

    const householdId = created.body.item.id as string;
    const listed = await request(app)
      .get('/api/households')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(householdId);

    const memberCreated = await request(app)
      .post(`/api/households/${householdId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        displayName: 'Private Test Profile',
        pin: '1357',
        personalisationConsentGranted: true,
        educationLevel: 'Private Test Qualification',
        qualifications: ['Private Test Certificate'],
        skills: ['installation'],
        experienceSummary: 'Private test experience.',
        experienceYears: 2,
        occupationOrTrade: 'Installer',
        interestedCategories: ['training'],
      });
    expect(memberCreated.status).toBe(201);
    expect(memberCreated.body.item).not.toHaveProperty('pinHash');
    const memberId = memberCreated.body.item.id as string;
    const memberList = await request(app)
      .get(`/api/households/${householdId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(memberList.body.items).toEqual([
      expect.objectContaining({ id: memberId, hasPinLock: true }),
    ]);
    expect(memberList.body.items[0]).not.toHaveProperty('pinHash');

    const baseQr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        label: 'D1 household base QR',
        destinationType: 'website',
        rawInput: 'https://example.com/household',
      });
    expect(baseQr.status).toBe(201);

    if (!tempRoot) throw new Error('D1 household integration test directory was not initialized.');
    const restartedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot, 'restarted-store'),
    });
    const restartedApp = createEdisonApp(restartedStore, {
      uploadsDir: path.join(tempRoot, 'restarted-uploads'),
      authSessionRepository,
      domainRecordRepository: new D1DomainRecordRepository(binding),
    });
    const restartedSettings = await request(restartedApp)
      .patch(`/api/households/${householdId}/settings`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ neutralDisplayMode: true });
    expect(restartedSettings.status).toBe(200);
    expect(restartedSettings.body.item.neutralDisplayMode).toBe(true);

    const aggregateBeforeWithdrawal = await request(restartedApp)
      .get('/api/advertiser/targeting-aggregates')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(aggregateBeforeWithdrawal.status).toBe(200);
    expect(aggregateBeforeWithdrawal.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          countryCode: 'ZW',
          cityOrTown: 'Harare',
          privateAddressesExposed: false,
          individualProfilesExposed: false,
        }),
      ])
    );
    expect(JSON.stringify(aggregateBeforeWithdrawal.body.items)).not.toContain(exactLocation);

    const rejectedMemberUpdate = await request(restartedApp)
      .patch(`/api/households/${householdId}/members/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pinVerification: '9999', careerAspirations: 'Should remain private.' });
    expect(rejectedMemberUpdate.status).toBe(403);
    const updatedMember = await request(restartedApp)
      .patch(`/api/households/${householdId}/members/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pinVerification: '1357', careerAspirations: 'Persisted private aspiration.' });
    expect(updatedMember.status).toBe(200);
    const persistedMemberList = await domainRecordRepository.listHouseholdMembersForActor(
      ownerRegistration.body.user,
      householdId
    );
    expect(persistedMemberList[0].careerAspirations).toBe('Persisted private aspiration.');

    const temporaryMember = await request(restartedApp)
      .post(`/api/households/${householdId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ displayName: 'Temporary Test Profile' });
    expect(temporaryMember.status).toBe(201);
    const deletedMember = await request(restartedApp)
      .delete(`/api/households/${householdId}/members/${temporaryMember.body.item.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(deletedMember.status).toBe(200);
    const membersAfterDelete = await domainRecordRepository.listHouseholdMembersForActor(
      ownerRegistration.body.user,
      householdId
    );
    expect(membersAfterDelete.map((member) => member.id)).toEqual([memberId]);

    const otherRead = await request(app)
      .get(`/api/households/${householdId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherRead.status).toBe(403);
    const advertiserList = await request(app)
      .get('/api/households')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(advertiserList.status).toBe(403);

    const withdrawn = await request(restartedApp)
      .post(`/api/households/${householdId}/consent/withdraw`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Household requested withdrawal.' });
    expect(withdrawn.status).toBe(200);
    const ownerCompliance = await request(restartedApp)
      .get('/api/compliance/overview')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerCompliance.status).toBe(200);
    expect(ownerCompliance.headers['cache-control']).toBe('no-store, private');
    expect(ownerCompliance.body.overview.posture).toMatchObject({
      totalHouseholdsEvaluated: 1,
      withdrawnOrErasedHouseholds: 1,
      expiredSessionsPendingPurge: 0,
    });
    expect(JSON.stringify(ownerCompliance.body)).not.toContain(exactLocation);
    const otherCompliance = await request(restartedApp)
      .get('/api/compliance/overview')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherCompliance.status).toBe(200);
    expect(otherCompliance.body.overview.posture.totalHouseholdsEvaluated).toBe(0);
    const advertiserCompliance = await request(restartedApp)
      .get('/api/compliance/overview')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(advertiserCompliance.status).toBe(200);
    expect(advertiserCompliance.body.overview.posture.totalHouseholdsEvaluated).toBe(0);
    database
      .prepare(
        'UPDATE edison_auth_sessions SET idle_expires_at = ?, expires_at = ? WHERE user_id = ?'
      )
      .run(
        '2000-01-01T00:00:00.000Z',
        '2000-01-01T00:00:00.000Z',
        otherRegistration.body.user.id
      );
    expect(await authSessionRepository.listSessionRetentionRecords()).toEqual(
      expect.arrayContaining([
        {
          idleExpiresAt: '2000-01-01T00:00:00.000Z',
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
      ])
    );
    const aggregateAfterWithdrawal = await request(restartedApp)
      .get('/api/advertiser/targeting-aggregates')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(aggregateAfterWithdrawal.status).toBe(200);
    expect(
      aggregateAfterWithdrawal.body.items.some(
        (row: { countryCode?: string; cityOrTown?: string }) =>
          row.countryCode === 'ZW' && row.cityOrTown === 'Harare'
      )
    ).toBe(false);
    const consentHistory = await request(restartedApp)
      .get(`/api/households/${householdId}/consent-history`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(consentHistory.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'CONSENT_WITHDRAWN_BUNDLED' })])
    );

    const restored = await request(restartedApp)
      .post(`/api/households/${householdId}/consent/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ explicitConfirmation: true, reason: 'Household opted in again.' });
    expect(restored.status).toBe(200);

    const matchRead = await request(restartedApp)
      .get(`/api/households/${householdId}/matches`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(matchRead.status).toBe(200);
    const issuedToken = await request(restartedApp)
      .post(`/api/households/${householdId}/qr-issue`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ baseQrToken: baseQr.body.item.token });
    expect(issuedToken.status).toBe(201);
    const persistedTokens = await domainRecordRepository.listHouseholdQrTokensForActor(
      ownerRegistration.body.user,
      householdId
    );
    expect(persistedTokens.map((token) => token.token)).toContain(issuedToken.body.item.token);
    const issuedHouseholdQr = persistedTokens.find(
      (token) => token.token === issuedToken.body.item.token
    );
    if (!issuedHouseholdQr) throw new Error('D1 household QR token was not persisted.');

    const redirectStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'public-redirect-store'),
    });
    const redirectApp = createEdisonApp(redirectStore, {
      uploadsDir: path.join(tempRoot!, 'public-redirect-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const publicRedirect = await request(redirectApp).get(`/r/${issuedToken.body.item.token}`);
    expect(publicRedirect.status).toBe(302);
    expect(await domainRecordRepository.getQrLinkByToken(baseQr.body.item.token)).toMatchObject({
      redirectRequestsTotal: 1,
      redirectIssuedTotal: 1,
    });
    expect(
      (
        await domainRecordRepository.listHouseholdQrTokensForActor(
          ownerRegistration.body.user,
          householdId
        )
      ).find((record) => record.token === issuedToken.body.item.token)?.resolvedCount
    ).toBe(1);
    await domainRecordRepository.putHouseholdQrToken(
      { ...issuedHouseholdQr, expiresAt: '2026-09-01T00:00:00.000Z' },
      ownerRegistration.body.user.id
    );
    const adminCompliance = await request(restartedApp)
      .get('/api/compliance/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminCompliance.status).toBe(200);
    expect(adminCompliance.body.overview.posture).toMatchObject({
      totalHouseholdsEvaluated: 1,
      expiredSessionsPendingPurge: 1,
      staleExpiredQrTokensPendingPurge: 1,
    });
    expect(JSON.stringify(adminCompliance.body)).not.toContain(exactLocation);

    const erasure = await request(restartedApp)
      .post(`/api/households/${householdId}/dsr-erase`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        confirmationPhrase: 'ERASE HOUSEHOLD DATA',
        reason: 'Household owner requested data erasure.',
      });
    expect(erasure.status).toBe(200);
    const persisted = await domainRecordRepository.getHouseholdForActor(
      ownerRegistration.body.user,
      householdId
    );
    expect(persisted?.location.exactInstallationLocation).toBe('[REDACTED BY DSR ERASURE]');
    expect(persisted?.commercialConsentStatus).toBe('withdrawn');
    const deliveryAfterErasure = await request(restartedApp)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'household-tv-1',
        regionCode: 'ZW',
        householdId,
        expectedConsentEpoch: persisted?.consentEpoch,
      });
    expect(deliveryAfterErasure.status).toBe(200);
    expect(deliveryAfterErasure.body.adDeliverySuspended).toBe(true);

    const reloadedRepository = new D1DomainRecordRepository(binding);
    const persistedMembers = await reloadedRepository.listHouseholdMembersForActor(
      ownerRegistration.body.user,
      householdId
    );
    expect(persistedMembers).toEqual([
      expect.objectContaining({
        id: memberId,
        hasPinLock: false,
        displayName: expect.stringContaining('Redacted Profile'),
      }),
    ]);
    expect(persistedMembers[0]).not.toHaveProperty('pinHash');
  });

  it('persists and resolves commercial disputes through D1 after store reconstruction', async () => {
    const {
      app,
      database: sqlite,
      authSessionRepository,
      domainRecordRepository,
    } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-dispute-owner@example.com',
      password: 'StrongPass!234',
      name: 'Dispute Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const advertiserToken = registration.body.token as string;
    const campaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        title: 'D1 Dispute Campaign',
        contentCategory: 'commercial_advertising',
        summary: 'Commercial campaign used to verify D1 revenue reconciliation.',
        durationSeconds: 30,
        dailyFrequencyCap: 4,
        targetRegions: ['ZW'],
        dayparts: ['daytime'],
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    expect(campaign.status).toBe(201);
    const created = await request(app)
      .post('/api/advertiser-ops/disputes')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        campaignId: campaign.body.item.id,
        billingPeriodLabel: '2026-11',
        disputeType: 'delivery_shortfall_credit',
        disputedAmountUsd: 120,
        reason: 'Two scheduled delivery slots were missed.',
      });
    expect(created.status).toBe(201);
    expect(await domainRecordRepository.listCommercialDisputes()).toEqual([
      expect.objectContaining({ id: created.body.item.id, status: 'open' }),
    ]);

    sqlite!.exec(
      `UPDATE edison_auth_users SET role = 'admin' WHERE email = 'd1-dispute-owner@example.com';
       UPDATE edison_auth_sessions SET role = 'admin' WHERE user_id = (
         SELECT user_id FROM edison_auth_users WHERE email = 'd1-dispute-owner@example.com'
       );`
    );
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'd1-dispute-owner@example.com',
      password: 'StrongPass!234',
    });
    expect(adminLogin.status).toBe(200);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'dispute-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'dispute-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const beforeResolution = await request(reconstructedApp)
      .get('/api/advertiser-ops/disputes')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(beforeResolution.status).toBe(200);
    expect(beforeResolution.body.items).toEqual([
      expect.objectContaining({ id: created.body.item.id, status: 'open' }),
    ]);
    expect(beforeResolution.body.reconciliation).toMatchObject({
      directPaidProjectedUsd: campaign.body.item.simulatedEstimate.estimatedTotalUsd,
      openDisputesCount: 1,
      paymentCollectionActive: false,
      charityCampaignsTotalUsd: 0,
    });

    const resolved = await request(reconstructedApp)
      .patch(`/api/advertiser-ops/disputes/${created.body.item.id}/resolve`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({
        decision: 'credit_approved_simulated',
        approvedCreditUsd: 60,
        resolutionNote: 'Approved a simulated partial service credit.',
      });
    expect(resolved.status).toBe(200);
    expect(await domainRecordRepository.listCommercialDisputes()).toEqual([
      expect.objectContaining({
        id: created.body.item.id,
        status: 'credit_approved_simulated',
        approvedCreditUsd: 60,
        paymentCollectionActive: false,
      }),
    ]);
  });

  it('persists physical QR scan logs with tester-only visibility', async () => {
    const { app, authSessionRepository, domainRecordRepository, binding, database: sqlite } =
      createApp();
    const ownerRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-physical-qr-owner@example.com',
      password: 'StrongPass!234',
      name: 'Physical QR Owner',
      organisationName: 'Physical QR Owner',
      role: 'advertiser',
    });
    const otherRegistration = await request(app).post('/api/auth/register').send({
      email: 'd1-physical-qr-other@example.com',
      password: 'StrongPass!234',
      name: 'Other Physical QR User',
      organisationName: 'Other Physical QR User',
      role: 'advertiser',
    });
    expect(ownerRegistration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    const ownerToken = ownerRegistration.body.token as string;
    const otherToken = otherRegistration.body.token as string;
    const qrLink = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'D1 physical scan fixture',
        destinationType: 'website',
        rawInput: 'https://example.com/physical-scan',
      });
    expect(qrLink.status).toBe(201);

      const campaign = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'D1 Readiness Campaign',
          contentCategory: 'commercial_advertising',
          summary: 'Campaign used by the D1 prototype-readiness snapshot.',
          durationSeconds: 15,
          dailyFrequencyCap: 4,
          targetRegions: ['ZW'],
          dayparts: ['daytime'],
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        });
      expect(campaign.status).toBe(201);
      const creative = await request(app)
        .post('/api/ad-creatives')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          campaignId: campaign.body.item.id,
          title: 'D1 Readiness Creative',
          mode: 'text_only_commercial',
          displayDurationSeconds: 15,
          safeZoneWarnings: [],
          contrastWarnings: [],
          textOnly: {
            advertiserName: 'Readiness Advertiser',
            headline: 'Readiness headline',
            messageBody: 'D1 persistence is used by readiness reporting.',
            contactInfo: 'readiness@example.com',
            backgroundColor: '#0F172A',
            accentColor: '#F59E0B',
            textColor: '#FFFFFF',
            qrPlacement: 'bottom_right',
          },
        });
      expect(creative.status).toBe(201);
      const opportunityOwner = await request(app).post('/api/auth/register').send({
        email: 'd1-readiness-opportunity@example.com',
        password: 'StrongPass!234',
        name: 'Readiness Opportunity',
        organisationName: 'Readiness Opportunity',
        role: 'opportunity_submitter',
      });
      expect(opportunityOwner.status).toBe(201);
      const opportunity = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${opportunityOwner.body.token}`)
        .send({
          providerType: 'individual_informal_employer',
          providerName: 'Readiness Workshop',
          category: 'apprenticeship',
          title: 'D1 Readiness Opportunity',
          description: 'A no-fee opportunity used by readiness reporting.',
          location: 'Harare, Zimbabwe',
          eligibilityRequirements: 'Reliable attendance.',
          applicationMethod: 'Apply through the free EDISON portal.',
          contactInfo: 'readiness-workshop@example.com',
          linkedCampaignId: null,
          closingDate: '2027-03-01',
          expiryDate: '2027-03-15',
          identityEvidenceRef: 'READINESS-ID-01',
          organisationEvidenceRef: '',
          specificOpportunityEvidenceRef: 'READINESS-OPP-01',
          applicationFeeFreeConfirmed: true,
          noGuaranteeConfirmed: true,
        });
      expect(opportunity.status).toBe(201);
      await domainRecordRepository.putAnalyticsEvent({
        id: 'd1-readiness-redirect-issued',
        qrToken: qrLink.body.item.token,
        campaignId: campaign.body.item.id,
        eventType: 'redirect_issued',
        measurementSource: 'real_measured',
        dedupKey: 'd1-readiness-redirect-issued',
        createdAt: new Date().toISOString(),
      });

    const created = await request(app)
      .post('/api/qa/physical-qr-tests')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        qrToken: qrLink.body.item.token,
        encodedRedirectUrl: 'https://example.com/physical-scan',
        deviceModel: 'Pixel test device',
        osPlatform: 'Android',
        cameraApp: 'Default camera',
        outcome: 'passed',
        reachedRedirectEndpoint: true,
        landedDestinationObserved: true,
        timeToScanSeconds: 1.2,
        notes: 'Local persistence fixture.',
      });
    expect(created.status).toBe(201);

    if (!tempRoot) throw new Error('D1 physical QR test directory was not initialized.');
    const restartedApp = createEdisonApp(
      new EdisonPrototypeStore({ dataDir: path.join(tempRoot, 'physical-qr-restarted-store') }),
      {
        uploadsDir: path.join(tempRoot, 'physical-qr-restarted-uploads'),
        authSessionRepository,
        domainRecordRepository: new D1DomainRecordRepository(binding),
      }
    );
    const ownerRead = await request(restartedApp)
      .get('/api/qa/physical-qr-tests')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerRead.body.items).toEqual([
      expect.objectContaining({ id: created.body.item.id, testerUserId: ownerRegistration.body.user.id }),
    ]);

    const otherRead = await request(restartedApp)
      .get('/api/qa/physical-qr-tests')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherRead.body.items).toEqual([]);
    const forbiddenDelete = await request(restartedApp)
      .delete(`/api/qa/physical-qr-tests/${created.body.item.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbiddenDelete.status).toBe(403);

    const readiness = await request(restartedApp)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(readiness.status, JSON.stringify(readiness.body)).toBe(200);
    expect(readiness.body.physicalScanTests).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.item.id })])
    );
    if (!sqlite) throw new Error('D1 prototype readiness database was not initialized.');
    sqlite
      .prepare('UPDATE edison_auth_users SET role = ? WHERE user_id = ?')
      .run('admin', ownerRegistration.body.user.id);
    sqlite
      .prepare('UPDATE edison_auth_sessions SET role = ? WHERE user_id = ?')
      .run('admin', ownerRegistration.body.user.id);
    const adminReadiness = await request(restartedApp)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(adminReadiness.status).toBe(200);
    expect(adminReadiness.body.summary).toMatchObject({
      campaignCount: (await domainRecordRepository.listCampaignsForUser({
        ...ownerRegistration.body.user,
        role: 'admin',
      })).length,
      adCreativeCount: (await domainRecordRepository.listAdCreativesForUser({
        ...ownerRegistration.body.user,
        role: 'admin',
      })).length,
      opportunityCount: (await domainRecordRepository.listOpportunitiesForUser({
        ...ownerRegistration.body.user,
        role: 'admin',
      })).length,
      qrCount: (await domainRecordRepository.listQrLinksForActor({
        ...ownerRegistration.body.user,
        role: 'admin',
      })).length,
      redirectIssuedTotal: 1,
    });
    expect(adminReadiness.body.physicalQrPassedCount).toBe(1);
    expect(adminReadiness.body.physicalQrTotalCount).toBe(1);

    const deleted = await request(restartedApp)
      .delete(`/api/qa/physical-qr-tests/${created.body.item.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleted.status).toBe(200);
    const persistedRecords = await domainRecordRepository.listPhysicalQrScanTestsForUser(
      ownerRegistration.body.user
    );
    expect(persistedRecords).toEqual([]);
  });

  it('persists readiness and commercial gate state across store reconstruction', async () => {
    const { store, domainRecordRepository, binding } = createApp();
    if (!tempRoot) throw new Error('D1 pilot cohort test directory was not initialized.');
    const adminApp = createEdisonApp(store, {
      uploadsDir: path.join(tempRoot, 'pilot-admin-uploads'),
      domainRecordRepository,
    });
    const adminLogin = await request(adminApp).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.token as string;
    const created = await request(adminApp)
      .post('/api/pilot-readiness/cohorts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cohortName: 'D1 Restart Cohort',
        targetCountryCode: 'ZW',
        targetArchitectureId: 'opt_in_viewer_prompt',
        maxHouseholdsCap: 5,
        enrolledHouseholdIds: [],
        decOpen02ShortBreakRuleAcknowledged: true,
        decOpen03GamMockOnlyAcknowledged: true,
      });
    expect(created.status).toBe(201);
    const persistedCohorts = await domainRecordRepository.listPilotCohorts();
    expect(persistedCohorts).toEqual([
      expect.objectContaining({ id: created.body.cohort.id, cohortName: 'D1 Restart Cohort' }),
    ]);
    const prepNoteUpdate = await request(adminApp)
      .post('/api/pilot-readiness/stage-p6-prep')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stepId: 'P6-04',
        ownerPrepNote: 'Persist this readiness note across local store reconstruction.',
      });
    expect(prepNoteUpdate.status).toBe(200);
    expect(await domainRecordRepository.listStageP6PrepNotes()).toEqual([
      {
        stepId: 'P6-04',
        ownerPrepNote: 'Persist this readiness note across local store reconstruction.',
      },
    ]);

    const costAssumptions = {
      activeHouseholdsEstimate: 1000,
      monthlyCommercialBreaksPerHousehold: 60,
      estimatedDirectCampaignsCount: 5,
      cdnEgressCostPerGbUsd: 0.085,
      dbHostingTierMonthlyUsd: 50,
      supportAgentHeadcount: 2,
      moderationHoursPerWeek: 10,
    };
    const costUpdate = await request(adminApp)
      .put('/api/commercial-readiness/cost-assumptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(costAssumptions);
    expect(costUpdate.status).toBe(200);
    const boardDecision = await request(adminApp)
      .post('/api/commercial-readiness/board-decision')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decisionOutcome: 'hold_software_ready_pending_external_gates',
        requestedLaunchAuthorization: false,
        summaryNote: 'Continue holding until external gates are verified.',
      });
    expect(boardDecision.status).toBe(201);
    expect(await domainRecordRepository.getCommercialCostAssumptions()).toEqual(costAssumptions);
    expect(await domainRecordRepository.listCommercialBoardDecisions()).toEqual([
      expect.objectContaining({
        id: boardDecision.body.decision.id,
        commercialLaunchAuthorized: false,
        paymentCollectionActive: false,
      }),
    ]);

    const policyUpdate = await request(adminApp)
      .put('/api/country-launch/policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        countryCode: 'ZW',
        consentBannerStrictMode: true,
        requirePreBroadcastHumanModeration: true,
        enforceVppsOrLocalPrivacyLock: true,
        operatorTaxNoticeLabel: 'Zimbabwe test policy notice label',
      });
    expect(policyUpdate.status).toBe(410);
    const countryDecision = await request(adminApp)
      .post('/api/country-launch/decision')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
        requestedCountryActivation: false,
        summaryNote: 'Legacy market activation decision writes must be rejected.',
      });
    expect(countryDecision.status).toBe(410);
    expect(await domainRecordRepository.listCountryLaunchDecisions()).toEqual([]);
    expect(await domainRecordRepository.listCountryPolicyProfiles()).toEqual([]);

    const regionUpdate = await request(adminApp)
      .put('/api/international-expansion/region-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        regionId: 'europe_uk_eu',
        primaryLanguageCode: 'de',
        supportedLanguageCodes: ['de', 'en', 'fr'],
        captionAccessibilityStandard: 'EBU-TT-D Broadcast Captions',
        multiCurrencyCode: 'EUR',
        proFormaCpmRateLocal: 8.5,
      });
    expect(regionUpdate.status).toBe(200);
    const expansionDecision = await request(adminApp)
      .post('/api/international-expansion/decision')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        regionId: 'europe_uk_eu',
        decisionOutcome: 'stage_multi_region_blueprint_for_post_launch',
        requestedRegionActivation: false,
        summaryNote: 'Legacy regional activation decision writes must be rejected.',
      });
    expect(expansionDecision.status).toBe(410);
    expect(await domainRecordRepository.listInternationalExpansionDecisions()).toEqual([]);
    expect(await domainRecordRepository.listRegionalLocalizationProfiles()).toEqual([
      expect.objectContaining({
        regionId: 'europe_uk_eu',
        primaryLanguageCode: 'de',
        prohibitCrossBorderPiiTransfer: true,
      }),
    ]);
    const chaosRun = await request(adminApp)
      .post('/api/admin/reliability/run-all-18')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'D1 restart persistence fixture.' });
    expect(chaosRun.status).toBe(200);
    expect(await domainRecordRepository.getLatestReliabilityChaosReport()).toEqual(
      expect.objectContaining({ reportId: chaosRun.body.report.reportId, totalFailureModes: 18 })
    );

    const restartedApp = createEdisonApp(
      new EdisonPrototypeStore({ dataDir: path.join(tempRoot, 'pilot-restarted-store') }),
      {
        uploadsDir: path.join(tempRoot, 'pilot-restarted-uploads'),
        domainRecordRepository: new D1DomainRecordRepository(binding),
      }
    );
    const restartedAdminLogin = await request(restartedApp).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(restartedAdminLogin.status).toBe(200);
    const overview = await request(restartedApp)
      .get('/api/pilot-readiness/overview')
      .set('Authorization', `Bearer ${restartedAdminLogin.body.token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.overview.cohorts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.cohort.id })])
    );
    expect(overview.body.overview.cohorts[0].id).toBe(created.body.cohort.id);
    expect(
      overview.body.overview.stageP6Runbook.find(
        (step: { stepId: string }) => step.stepId === 'P6-04'
      ).ownerPrepNote
    ).toBe('Persist this readiness note across local store reconstruction.');

    const commercialOverview = await request(restartedApp)
      .get('/api/commercial-readiness/overview')
      .set('Authorization', `Bearer ${restartedAdminLogin.body.token}`);
    expect(commercialOverview.status).toBe(200);
    expect(commercialOverview.body.overview.unitEconomics.assumptions).toEqual(costAssumptions);
    expect(commercialOverview.body.overview.boardDecisions).toEqual([
      expect.objectContaining({ id: boardDecision.body.decision.id }),
    ]);
    const countryOverview = await request(restartedApp)
      .get('/api/country-launch/overview')
      .set('Authorization', `Bearer ${restartedAdminLogin.body.token}`);
    expect(countryOverview.status).toBe(410);
    expect(await domainRecordRepository.listCountryLaunchDecisions()).toEqual([]);
    expect(await domainRecordRepository.listCountryPolicyProfiles()).toEqual([]);

    const expansionOverview = await request(restartedApp)
      .get('/api/international-expansion/overview')
      .set('Authorization', `Bearer ${restartedAdminLogin.body.token}`);
    expect(expansionOverview.status).toBe(200);
    expect(expansionOverview.body.overview.expansionDecisions).toEqual([]);
    expect(
      expansionOverview.body.overview.regions.find(
        (region: { regionId: string }) => region.regionId === 'europe_uk_eu'
      ).localizationConfig.primaryLanguageCode
    ).toBe('de');
    const reliabilityOverview = await request(restartedApp)
      .get('/api/reliability/overview')
      .set('Authorization', `Bearer ${restartedAdminLogin.body.token}`);
    expect(reliabilityOverview.status).toBe(200);
    expect(reliabilityOverview.body.overview.lastChaosRun.reportId).toBe(
      chaosRun.body.report.reportId
    );
  });

  it('persists campaign lifecycle records through D1 domain storage', async () => {
    const { app, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-campaign@example.com',
      password: 'StrongPass!234',
      name: 'D1 Campaign',
      organisationName: 'D1 Campaign Trading',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'D1 Campaign One',
        contentCategory: 'commercial_advertising',
        summary: 'Persisted campaign summary',
        durationSeconds: 30,
        dailyFrequencyCap: 4,
        targetRegions: ['ZW'],
        dayparts: ['daytime'],
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    expect(created.status).toBe(201);
    expect(created.body.item.status).toBe('draft');

    const revenueLedger = await request(app)
      .get('/api/analytics/revenue-ledger')
      .set('Authorization', `Bearer ${token}`);
    expect(revenueLedger.status).toBe(200);
    expect(revenueLedger.body.ledger.scope).toBe('user_owned');
    expect(revenueLedger.body.ledger.paymentCollectionActive).toBe(false);
    expect(
      revenueLedger.body.ledger.streams.find(
        (stream: { stream: string }) => stream.stream === 'direct_commercial_paid'
      ).spotOrRecordCount
    ).toBeGreaterThanOrEqual(1);

    const listed = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.item.id,
          title: 'D1 Campaign One',
          status: 'draft',
        }),
      ])
    );

    const updated = await request(app)
      .patch(`/api/campaigns/${created.body.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'D1 Campaign Updated',
        summary: 'Updated summary',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.item.title).toBe('D1 Campaign Updated');

    const cloned = await request(app)
      .post(`/api/campaigns/${created.body.item.id}/clone`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(cloned.status).toBe(201);
    expect(cloned.body.item.status).toBe('draft');

    const qr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Campaign QR',
        destinationType: 'website',
        rawInput: 'https://example.com/campaign-one',
      });
    expect(qr.status).toBe(201);

    const creative = await request(app)
      .post('/api/ad-creatives')
      .set('Authorization', `Bearer ${token}`)
      .send({
        campaignId: created.body.item.id,
        title: 'D1 Summary Creative',
        mode: 'text_only_commercial',
        displayDurationSeconds: 15,
        safeZoneWarnings: [],
        contrastWarnings: [],
        textOnly: {
          advertiserName: 'D1 Campaign Trading',
          headline: 'Summary headline',
          messageBody: 'D1 persisted creative summary evidence.',
          contactInfo: 'summary@example.com',
          backgroundColor: '#0F172A',
          accentColor: '#F59E0B',
          textColor: '#FFFFFF',
          qrPlacement: 'bottom_right',
        },
      });
    expect(creative.status).toBe(201);
    const opportunityOwner = await request(app).post('/api/auth/register').send({
      email: 'd1-summary-opportunity@example.com',
      password: 'StrongPass!234',
      name: 'D1 Summary Opportunity',
      organisationName: 'D1 Summary Opportunity',
      role: 'opportunity_submitter',
    });
    expect(opportunityOwner.status).toBe(201);
    const opportunity = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${opportunityOwner.body.token}`)
      .send({
        providerType: 'individual_informal_employer',
        providerName: 'Summary Workshop',
        category: 'apprenticeship',
        title: 'D1 Summary Opportunity',
        description: 'A no-fee opportunity for D1 summary verification.',
        location: 'Harare, Zimbabwe',
        eligibilityRequirements: 'Reliable attendance.',
        applicationMethod: 'Apply through the free EDISON portal.',
        contactInfo: 'summary-workshop@example.com',
        linkedCampaignId: null,
        closingDate: '2027-03-01',
        expiryDate: '2027-03-15',
        identityEvidenceRef: 'SUMMARY-ID-01',
        organisationEvidenceRef: '',
        specificOpportunityEvidenceRef: 'SUMMARY-OPP-01',
        applicationFeeFreeConfirmed: true,
        noGuaranteeConfirmed: true,
      });
    expect(opportunity.status).toBe(201);
    await domainRecordRepository.putAnalyticsEvent({
      id: 'd1-summary-redirect-issued',
      qrToken: qr.body.item.token,
      campaignId: created.body.item.id,
      eventType: 'redirect_issued',
      measurementSource: 'real_measured',
      dedupKey: 'd1-summary-redirect-issued',
      createdAt: new Date().toISOString(),
    });

    const attached = await request(app)
      .patch(`/api/campaigns/${created.body.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken: qr.body.item.token });
    expect(attached.status).toBe(200);

    const expired = await request(app)
      .post(`/api/campaigns/${created.body.item.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetStatus: 'expired' });
    expect(expired.status).toBe(200);
    expect(expired.body.item.status).toBe('expired');

    const persisted = await domainRecordRepository.listCampaignsForUser(
      registration.body.user,
    );
    expect(persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.item.id,
          title: 'D1 Campaign Updated',
          status: 'expired',
        }),
        expect.objectContaining({
          id: cloned.body.item.id,
          status: 'draft',
        }),
      ])
    );

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'manifest-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'manifest-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const restartedLedger = await request(reconstructedApp)
      .get('/api/analytics/revenue-ledger')
      .set('Authorization', `Bearer ${token}`);
    expect(restartedLedger.status).toBe(200);
    expect(
      restartedLedger.body.ledger.streams.find(
        (stream: { stream: string }) => stream.stream === 'direct_commercial_paid'
      ).spotOrRecordCount
    ).toBeGreaterThanOrEqual(1);
    const health = await request(reconstructedApp).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.summary).toMatchObject({
      userCount: 2,
      qrCount: 1,
      campaignCount: 2,
      adCreativeCount: 1,
      profileCount: 2,
      opportunityCount: 1,
      redirectIssuedTotal: 1,
      storagePath: 'Cloudflare D1 application-record store',
    });
    const liveReport = await request(reconstructedApp).get('/api/reports/live');
    expect(liveReport.status).toBe(200);
    expect(liveReport.body.summary).toEqual(health.body.summary);
    expect(liveReport.body.campaignStatusBreakdown).toMatchObject({
      draft: 1,
      expired: 1,
    });
    const authMe = await request(reconstructedApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(authMe.status).toBe(200);
    expect(authMe.body.summary).toEqual(health.body.summary);
    const manifest = await request(reconstructedApp)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'd1-manifest-test',
        regionCode: 'ZW',
        daypart: 'daytime',
      });
    expect(manifest.status).toBe(200);
    expect(manifest.body.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaignId: created.body.item.id,
          reasonCode: 'SKIP_STATUS_INELIGIBLE',
        }),
      ])
    );
    const advertiserOverview = await request(reconstructedApp)
      .get('/api/advertiser-ops/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(advertiserOverview.status).toBe(200);
    expect(advertiserOverview.body.campaignPacing).toEqual(
      expect.arrayContaining([expect.objectContaining({ campaignId: created.body.item.id })])
    );

    const deleted = await request(app)
      .delete(`/api/campaigns/${cloned.body.item.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const remaining = await domainRecordRepository.listCampaignsForUser(
      registration.body.user,
    );
    expect(remaining.map((campaign) => campaign.id)).not.toContain(cloned.body.item.id);
  });

  it('persists advertiser profiles and QR links through D1 domain records', async () => {
    const { app, database: sqlite, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-domain@example.com',
      password: 'StrongPass!234',
      name: 'D1 Domain',
      organisationName: 'D1 Domain Trading',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const profileUpdate = await request(app)
      .put('/api/advertiser/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entityType: 'registered_business',
        businessOrTradingName: 'D1 Persisted Business',
        registrationOrTaxId: 'ZW-123',
        industryCategory: 'Technology',
        countryCode: 'ZW',
        cityRegion: 'Harare',
        physicalAddress: '12 Network Way',
        primaryContactName: 'D1 Domain',
        primaryContactEmail: 'd1-domain@example.com',
        primaryContactPhone: '+263000000',
        billingContactName: 'D1 Domain',
        billingContactEmail: 'd1-domain@example.com',
        websiteUrl: 'https://example.com',
        requestVerification: true,
      });
    expect(profileUpdate.status).toBe(200);

    const qrCreate = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'D1 campaign',
        destinationType: 'website',
        rawInput: 'https://example.com/campaign',
      });
    expect(qrCreate.status).toBe(201);

    const profile = await domainRecordRepository.getAdvertiserProfile(registration.body.user.id);
    expect(profile).toMatchObject({
      userId: registration.body.user.id,
      businessOrTradingName: 'D1 Persisted Business',
      countryCode: 'ZW',
    });
    const links = await domainRecordRepository.listQrLinksForUser(registration.body.user.id);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownerId: registration.body.user.id,
          label: 'D1 campaign',
        }),
      ])
    );

    const profileRead = await request(app)
      .get('/api/advertiser/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRead.status).toBe(200);
    expect(profileRead.body.profile.businessOrTradingName).toBe('D1 Persisted Business');

    const qrRead = await request(app)
      .get('/api/qr')
      .set('Authorization', `Bearer ${token}`);
    expect(qrRead.status).toBe(200);
    expect(qrRead.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownerId: registration.body.user.id,
          label: 'D1 campaign',
        }),
      ])
    );

    const qrStatus = await request(app)
      .patch(`/api/qr/${qrCreate.body.item.token}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' });
    expect(qrStatus.status).toBe(200);
    expect(qrStatus.body.item.status).toBe('disabled');
    const persistedLinks = await domainRecordRepository.listQrLinksForUser(
      registration.body.user.id
    );
    expect(persistedLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: qrCreate.body.item.token,
          status: 'disabled',
        }),
      ])
    );

    const advertiserListingDenied = await request(app)
      .get('/api/admin/advertiser-profiles')
      .set('Authorization', `Bearer ${token}`);
    expect(advertiserListingDenied.status).toBe(403);

    sqlite!.exec(
      `UPDATE edison_auth_users SET role = 'admin' WHERE email = 'd1-domain@example.com';
       UPDATE edison_auth_sessions SET role = 'admin' WHERE user_id = (
         SELECT user_id FROM edison_auth_users WHERE email = 'd1-domain@example.com'
       );`
    );
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'd1-domain@example.com',
      password: 'StrongPass!234',
    });
    expect(adminLogin.status).toBe(200);

    if (!tempRoot) throw new Error('D1 advertiser-profile test directory was not initialized.');
    const reconstructedApp = createEdisonApp(
      new EdisonPrototypeStore({
        dataDir: path.join(tempRoot, 'advertiser-profiles-reconstructed-data'),
      }),
      {
        uploadsDir: path.join(tempRoot, 'advertiser-profiles-reconstructed-uploads'),
        authSessionRepository,
        domainRecordRepository,
      }
    );
    const adminListing = await request(reconstructedApp)
      .get('/api/admin/advertiser-profiles')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(adminListing.status).toBe(200);
    expect(adminListing.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: registration.body.user.id,
          businessOrTradingName: 'D1 Persisted Business',
        }),
      ])
    );
  });

  it('forwards D1 domain write failures to Express error middleware', async () => {
    const { app, binding } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'd1-domain-failure@example.com',
      password: 'StrongPass!234',
      name: 'D1 Domain Failure',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);

    binding.failRun = true;
    const profileUpdate = await request(app)
      .put('/api/advertiser/profile')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({
        entityType: 'registered_business',
        businessOrTradingName: 'D1 Failure Business',
        registrationOrTaxId: '',
        industryCategory: 'Technology',
        countryCode: 'ZW',
        cityRegion: 'Harare',
        physicalAddress: '12 Failure Way',
        primaryContactName: 'D1 Domain Failure',
        primaryContactEmail: 'd1-domain-failure@example.com',
        primaryContactPhone: '',
        billingContactName: '',
        billingContactEmail: '',
        websiteUrl: '',
        requestVerification: false,
      });
    expect(profileUpdate.status).toBe(500);
    expect(profileUpdate.body.error).toBe('Internal server error.');
  });

  it('awaits route-level D1 audit writes and forwards write failures', async () => {
    const { app, authSessionRepository, binding } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'route-audit@example.com',
      password: 'StrongPass!234',
      name: 'Route Audit',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);

    const routeResponse = await request(app)
      .post('/api/broadcast-render/verify-suite')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({});
    expect(routeResponse.status).toBe(200);

    const auditActions = (await authSessionRepository.listAuditRecords()).map(
      (record) => record.action
    );
    expect(auditActions).toContain('BROADCAST_RENDER_SUITE_RUN');

    binding.failBatch = true;
    const failure = await request(app)
      .post('/api/broadcast-render/verify-suite')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({});
    expect(failure.status).toBe(500);
    expect(failure.body.error).toBe('Internal server error.');
  });

  it('forwards D1 write failures to Express error middleware instead of returning an auth conflict', async () => {
    const { app, binding } = createApp();
    binding.failBatch = true;

    const response = await request(app).post('/api/auth/register').send({
      email: 'db-failure@example.com',
      password: 'StrongPass!234',
      name: 'DB Failure',
      organisationName: '',
      role: 'household_viewer',
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error.');
  });

  it('persists simulated analytics events in D1 and scopes QR event reads after store reconstruction', async () => {
    const {
      app,
      authSessionRepository,
      domainRecordRepository,
    } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'analytics-owner@example.com',
      password: 'StrongPass!234',
      name: 'Analytics Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;
    const qr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Analytics QR',
        destinationType: 'website',
        rawInput: 'https://example.com/analytics',
      });
    expect(qr.status).toBe(201);

    const eventResponse = await request(app)
      .post('/api/simulator/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        qrToken: qr.body.item.token,
        eventType: 'ad_played',
      });
    expect(eventResponse.status).toBe(201);
    expect(await domainRecordRepository.listAnalyticsEvents()).toEqual([
      expect.objectContaining({
        id: eventResponse.body.event.id,
        qrToken: qr.body.item.token,
        eventType: 'ad_played',
      }),
    ]);
    const otherRegistration = await request(app).post('/api/auth/register').send({
      email: 'analytics-other@example.com',
      password: 'StrongPass!234',
      name: 'Other Analytics User',
      organisationName: '',
      role: 'advertiser',
    });
    expect(otherRegistration.status).toBe(201);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const events = await request(reconstructedApp)
      .get('/api/qr/events')
      .set('Authorization', `Bearer ${token}`);
    expect(events.status).toBe(200);
    expect(events.body.items).toEqual([
      expect.objectContaining({
        id: eventResponse.body.event.id,
        qrToken: qr.body.item.token,
      }),
    ]);
    const otherEvents = await request(reconstructedApp)
      .get('/api/qr/events')
      .set('Authorization', `Bearer ${otherRegistration.body.token}`);
    expect(otherEvents.status).toBe(200);
    expect(otherEvents.body.items).toEqual([]);
  });

  it('persists delivery manifests through D1 across store reconstruction', async () => {
    const { app, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'manifest-owner@example.com',
      password: 'StrongPass!234',
      name: 'Manifest Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const manifest = await request(app)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'slot-manifest-001',
        regionCode: 'GB',
        daypart: 'daytime',
      });
    expect(manifest.status).toBe(200);
    expect(manifest.body.hardwareTested).toBe(false);

    const persisted = await domainRecordRepository.listDeliveryManifestsForActor(
      registration.body.user,
    );
    expect(persisted.map((item) => item.manifestId)).toContain(manifest.body.manifestId);

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'manifest-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'manifest-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const reconstructed = await request(reconstructedApp)
      .get('/api/admin/moderation-overview')
      .set('Authorization', `Bearer ${token}`);
    expect(reconstructed.status).toBe(403);
  });

  it('hydrates, updates, and persists measured QR redirects across store reconstruction', async () => {
    const { app, authSessionRepository, domainRecordRepository } = createApp();
    const registration = await request(app).post('/api/auth/register').send({
      email: 'redirect-owner@example.com',
      password: 'StrongPass!234',
      name: 'Redirect Owner',
      organisationName: '',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;
    const otherRegistration = await request(app).post('/api/auth/register').send({
      email: 'redirect-other@example.com',
      password: 'StrongPass!234',
      name: 'Other Redirect User',
      organisationName: '',
      role: 'advertiser',
    });
    expect(otherRegistration.status).toBe(201);
    const qr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Persistent Redirect QR',
        destinationType: 'website',
        rawInput: 'https://example.com/persistent-redirect',
      });
    expect(qr.status).toBe(201);

    const firstRedirect = await request(app).get(`/r/${qr.body.item.token}`);
    expect(firstRedirect.status).toBe(302);
    expect(firstRedirect.headers.location).toBe('https://example.com/persistent-redirect');
    expect(await domainRecordRepository.getQrLinkByToken(qr.body.item.token)).toMatchObject({
      redirectRequestsTotal: 1,
      redirectIssuedTotal: 1,
    });
    expect((await domainRecordRepository.listAnalyticsEvents(10)).map((event) => event.eventType))
      .toEqual(expect.arrayContaining(['redirect_requested', 'redirect_issued']));

    const reconstructedStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot!, 'redirect-reconstructed-data'),
    });
    const reconstructedApp = createEdisonApp(reconstructedStore, {
      uploadsDir: path.join(tempRoot!, 'redirect-reconstructed-uploads'),
      authSessionRepository,
      domainRecordRepository,
    });
    const secondRedirect = await request(reconstructedApp).get(`/r/${qr.body.item.token}`);
    expect(secondRedirect.status).toBe(302);
    expect(await domainRecordRepository.getQrLinkByToken(qr.body.item.token)).toMatchObject({
      redirectRequestsTotal: 2,
      redirectIssuedTotal: 2,
    });
    const qrWatch = await request(reconstructedApp)
      .get(`/api/qa/qr-watch/${qr.body.item.token}`)
      .set('Authorization', `Bearer ${token}`);
    expect(qrWatch.status).toBe(200);
    expect(qrWatch.body.qrLink.redirectRequestsTotal).toBe(2);
    expect(qrWatch.body.recentEvents.length).toBeGreaterThan(0);
    expect(
      qrWatch.body.recentEvents.every(
        (event: { measurementSource: string }) =>
          event.measurementSource === 'real_measured'
      )
    ).toBe(true);

    const otherQrWatch = await request(reconstructedApp)
      .get(`/api/qa/qr-watch/${qr.body.item.token}`)
      .set('Authorization', `Bearer ${otherRegistration.body.token}`);
    expect(otherQrWatch.status).toBe(403);

    const missingQrWatch = await request(reconstructedApp)
      .get('/api/qa/qr-watch/missing-d1-token')
      .set('Authorization', `Bearer ${token}`);
    expect(missingQrWatch.status).toBe(404);
    const funnel = await request(reconstructedApp)
      .get('/api/analytics/funnel')
      .set('Authorization', `Bearer ${token}`);
    expect(funnel.status).toBe(200);
    expect(funnel.body.stages.find((stage: { stageNumber: number }) => stage.stageNumber === 5).rawCount)
      .toBe(2);
    expect(funnel.body.stages.find((stage: { stageNumber: number }) => stage.stageNumber === 6).rawCount)
      .toBe(2);
  });
});
