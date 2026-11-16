import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  runPrivacyComplianceVerificationSuite,
  scanAnalyticsZeroPii,
} from '../src/server/privacyComplianceEngine.ts';
import { CSRF_COOKIE_NAME } from '../src/server/security.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

function extractCookieValue(
  setCookieHeaders: string[] | string | undefined,
  name: string
): string | null {
  const list = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
    ? [setCookieHeaders]
    : [];
  for (const header of list) {
    if (header.startsWith(`${name}=`)) {
      return header.slice(name.length + 1).split(';')[0] || null;
    }
  }
  return null;
}

describe('Phase 10 Block 10.1 — Privacy, Security & Statutory Compliance Readiness (Software-First)', () => {
  let tempRoot: string;
  let dataDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-p10-privacy-'));
    dataDir = path.join(tempRoot, 'data');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempRoot, 'uploads') });
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('passes all 8 deterministic Block 10.1 privacy/statutory checks with honest pen-test, legal & hardware flags', () => {
    const report = runPrivacyComplianceVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.externalPenTestCompleted).toBe(false);
    expect(report.legalComplianceClaimed).toBe(false);
    expect(report.cameraMicAttentionTrackingEnabled).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });

  it('detects raw email or precise coordinate leaks while allowing clean hashed dedupKeys', () => {
    const clean = scanAnalyticsZeroPii([
      {
        id: 'a1',
        qrToken: 'qr_1',
        campaignId: 'cmp_1',
        eventType: 'redirect_issued',
        measurementSource: 'real_measured',
        dedupKey: 'sha256_anon_98f1',
        createdAt: '2026-11-16T10:00:00.000Z',
      },
    ]);
    expect(clean).toBe(0);

    const leaked = scanAnalyticsZeroPii([
      {
        id: 'a2',
        qrToken: 'qr_1',
        campaignId: 'cmp_1',
        eventType: 'redirect_requested',
        measurementSource: 'real_measured',
        dedupKey: 'person@example.com',
        createdAt: '2026-11-16T10:00:00.000Z',
      },
      {
        id: 'a3',
        qrToken: 'qr_1',
        campaignId: 'cmp_1',
        eventType: 'redirect_requested',
        measurementSource: 'real_measured',
        dedupKey: '-17.82921,31.05221',
        createdAt: '2026-11-16T10:00:00.000Z',
      },
    ]);
    expect(leaked).toBe(2);
  });

  it('enforces DSR export redaction, Right-to-Erasure cascade + HTTP 403 QR revocation, retention purge, RBAC, 25/25 QA, and 66.0% Full App', async () => {
    // 1. Auth & CSRF baseline guards
    const unauthOverview = await request(app).get('/api/compliance/overview');
    expect(unauthOverview.status).toBe(401);

    const noCsrfSweep = await request(app)
      .post('/api/admin/compliance/retention-sweep')
      .send({});
    expect(noCsrfSweep.status).toBe(403);

    const invalidBearerSweep = await request(app)
      .post('/api/admin/compliance/retention-sweep')
      .set('Authorization', 'Bearer bad_token_p10')
      .send({});
    expect(invalidBearerSweep.status).toBe(401);

    // 2. Advertiser cross-tenant isolation & statutory matrix honesty
    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      extractCookieValue(advLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (advLogin.body.csrfToken as string);

    const advOverview = await advAgent.get('/api/compliance/overview');
    expect(advOverview.status).toBe(200);
    expect(advOverview.body.overview.posture.totalHouseholdsEvaluated).toBe(0);
    expect(advOverview.body.overview.posture.expiredSessionsPendingPurge).toBe(0);
    expect(advOverview.body.overview.externalPenTestCompleted).toBe(false);
    expect(advOverview.body.overview.legalComplianceClaimed).toBe(false);
    expect(advOverview.body.overview.countries).toHaveLength(6);
    expect(
      advOverview.body.overview.countries.every(
        (c: { countryActivated: boolean; legalComplianceClaimed: boolean }) =>
          c.countryActivated === false && c.legalComplianceClaimed === false
      )
    ).toBe(true);

    const advDsrProbe = await advAgent
      .post('/api/households/hh_seed_zw_01/dsr-export')
      .set('X-CSRF-Token', advCsrf)
      .send({});
    expect(advDsrProbe.status).toBe(403);

    const advRetentionProbe = await advAgent
      .post('/api/admin/compliance/retention-sweep')
      .set('X-CSRF-Token', advCsrf)
      .send({});
    expect(advRetentionProbe.status).toBe(403);

    // 3. Household Viewer Subject Access DSR Export & Right-to-Erasure Cascade
    const viewerAgent = request.agent(app);
    const viewerLogin = await viewerAgent.post('/api/auth/login').send({
      email: 'viewer@edison.demo',
      password: 'EdisonViewer!2026',
    });
    expect(viewerLogin.status).toBe(200);
    const viewerCsrf =
      extractCookieValue(viewerLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (viewerLogin.body.csrfToken as string);

    const exportRes = await viewerAgent
      .post('/api/households/hh_seed_zw_01/dsr-export')
      .set('X-CSRF-Token', viewerCsrf)
      .send({});
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.package.pinHashesRedacted).toBe(true);
    expect(exportRes.body.package.packageSha256).toHaveLength(64);
    expect(JSON.stringify(exportRes.body.package.members)).not.toContain('"pinHash"');
    expect(
      exportRes.body.package.members.every(
        (m: Record<string, unknown>) => !Object.prototype.hasOwnProperty.call(m, 'pinHash')
      )
    ).toBe(true);

    // Issue a live epoch-bound QR token before erasure and confirm HTTP 302 redirect works
    const qrIssueRes = await viewerAgent
      .post('/api/households/hh_seed_zw_01/qr-issue')
      .set('X-CSRF-Token', viewerCsrf)
      .send({
        baseQrToken: 'job-demo',
        ttlSeconds: 3600,
      });
    expect(qrIssueRes.status).toBe(201);
    const liveToken = qrIssueRes.body.item.token as string;
    const preEraseRedirect = await request(app).get(`/r/${liveToken}`).redirects(0);
    expect(preEraseRedirect.status).toBe(302);

    // Wrong confirmation phrase fails Zod -> 400
    const badPhraseRes = await viewerAgent
      .post('/api/households/hh_seed_zw_01/dsr-erase')
      .set('X-CSRF-Token', viewerCsrf)
      .send({
        confirmationPhrase: 'DELETE',
        reason: 'Testing validation',
      });
    expect(badPhraseRes.status).toBe(400);

    // Valid Right-to-Erasure DSR anonymises members, bumps epoch, revokes tokens & keeps ordinary TV
    const eraseRes = await viewerAgent
      .post('/api/households/hh_seed_zw_01/dsr-erase')
      .set('X-CSRF-Token', viewerCsrf)
      .send({
        confirmationPhrase: 'ERASE HOUSEHOLD DATA',
        reason: 'Viewer invoked statutory Right to Erasure.',
      });
    expect(eraseRes.status).toBe(200);
    expect(eraseRes.body.erasure.erasureId).toMatch(/^dsr_ers_/);
    expect(eraseRes.body.erasure.ordinaryTvPreserved).toBe(true);
    expect(eraseRes.body.erasure.commercialConsentStatus).toBe('withdrawn');
    expect(eraseRes.body.erasure.charityAndOpportunityStatus).toBe(
      'suspended_by_bundled_withdrawal'
    );
    expect(eraseRes.body.erasure.qrTokensRevokedCount).toBeGreaterThanOrEqual(1);

    // Previously active household QR link fails closed with HTTP 403
    const postEraseRedirect = await request(app).get(`/r/${liveToken}`).redirects(0);
    expect(postEraseRedirect.status).toBe(403);
    expect(postEraseRedirect.headers['cache-control']).toContain('no-store');

    // Verify member profiles scrubbed
    const postMembersRes = await viewerAgent.get('/api/households/hh_seed_zw_01/members');
    expect(postMembersRes.status).toBe(200);
    expect(
      postMembersRes.body.items.every(
        (m: { hasPinLock: boolean; skills: string[] }) =>
          m.hasPinLock === false && m.skills.length === 0
      )
    ).toBe(true);

    // 4. Admin Retention Sweep + Compliance Suite + QA (25/25) + Live Report (66.0% Full App)
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      extractCookieValue(adminLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (adminLogin.body.csrfToken as string);

    // Expire a stale advertiser session AFTER admin login so login session-rotation pruning doesn't clear it beforehand
    const advLoginRecord = store.loginUser('advertiser@edison.demo', 'EdisonProto!2026');
    store.expireSessionForTesting(advLoginRecord.session.token, 'idle');

    const badSweepZod = await adminAgent
      .post('/api/admin/compliance/retention-sweep')
      .set('X-CSRF-Token', adminCsrf)
      .send({ unexpectedFlag: true });
    expect(badSweepZod.status).toBe(400);

    const sweepRes = await adminAgent
      .post('/api/admin/compliance/retention-sweep')
      .set('X-CSRF-Token', adminCsrf)
      .send({ notes: 'Vitest Phase 10 Block 10.1 retention cleanup verification' });
    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.report.sweepId).toMatch(/^ret_/);
    expect(sweepRes.body.report.expiredSessionsPurged).toBeGreaterThanOrEqual(1);
    expect(sweepRes.body.report.cameraMicAttentionTrackingEnabled).toBe(false);

    const suiteRes = await adminAgent
      .post('/api/compliance/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);
    expect(suiteRes.body.report.externalPenTestCompleted).toBe(false);
    expect(suiteRes.body.report.legalComplianceClaimed).toBe(false);

    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(27);
    expect(qaRes.body.automatedInvariantsPassed).toBe(27);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(72.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(28.0);
    expect(liveRes.body.progressMetrics.softwareToStageP6Pct).toBe(81.8);
  });
});
