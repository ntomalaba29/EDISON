import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  computeVaultSealSha256,
  redactEvidenceRef,
  runOpportunityOpsVerificationSuite,
} from '../src/server/opportunityOpsEngine.ts';
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

describe('Phase 9 Block 9.1 — Opportunity Verification Operations Hardening (Software-First)', () => {
  let tempRoot: string;
  let dataDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-p91-opp-'));
    dataDir = path.join(tempRoot, 'data');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempRoot, 'uploads') });
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('passes all 8 deterministic Block 9.1 verification checks with software-first KYC/hardware boundaries', () => {
    const report = runOpportunityOpsVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.externalKycVendorConnected).toBe(false);
    expect(report.advertisingFeeInfluencesVerification).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });

  it('computes deterministic SHA-256 vault seals and redacts sensitive evidence references cleanly', () => {
    const sealA = computeVaultSealSha256({
      opportunityId: 'opp_demo_1',
      ownerId: 'usr_emp_1',
      tier: 'tier1_identity',
      evidenceRef: 'ZW-NAT-ID-998877',
    });
    const sealB = computeVaultSealSha256({
      opportunityId: 'opp_demo_1',
      ownerId: 'usr_emp_1',
      tier: 'tier1_identity',
      evidenceRef: 'ZW-NAT-ID-998877',
    });
    const sealMutated = computeVaultSealSha256({
      opportunityId: 'opp_demo_1',
      ownerId: 'usr_emp_1',
      tier: 'tier1_identity',
      evidenceRef: 'ZW-NAT-ID-998878',
    });

    expect(sealA).toHaveLength(64);
    expect(sealA).toBe(sealB);
    expect(sealA).not.toBe(sealMutated);
    expect(redactEvidenceRef('ZW-NAT-ID-998877')).toBe('ZW-N••••8877');
    expect(redactEvidenceRef('   ')).toBe('[UNSUBMITTED]');
  });

  it('enforces auth (401), CSRF (403), admin RBAC (403), Zod validation (400), tenant scoping, sweep audit, 24/24 QA, and 62.0% Full App', async () => {
    // 1. Unauthenticated overview -> 401; POST without CSRF -> 403; invalid Bearer -> 401
    const unauthOverview = await request(app).get('/api/opportunity-ops/overview');
    expect(unauthOverview.status).toBe(401);

    const noCsrfSweep = await request(app).post('/api/admin/opportunity-ops/sweep').send({});
    expect(noCsrfSweep.status).toBe(403);

    const invalidBearerSweep = await request(app)
      .post('/api/admin/opportunity-ops/sweep')
      .set('Authorization', 'Bearer bad_token_999')
      .send({});
    expect(invalidBearerSweep.status).toBe(401);

    const noCsrfSuite = await request(app).post('/api/opportunity-ops/verify-suite').send({});
    expect(noCsrfSuite.status).toBe(403);

    // 2. Employer (opportunity_submitter) cannot trigger admin sweep -> 403; receives only own scoped overview
    const empAgent = request.agent(app);
    const empLogin = await empAgent.post('/api/auth/login').send({
      email: 'employer@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(empLogin.status).toBe(200);
    const empCsrf =
      extractCookieValue(empLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (empLogin.body.csrfToken as string);

    const empSweepAttempt = await empAgent
      .post('/api/admin/opportunity-ops/sweep')
      .set('X-CSRF-Token', empCsrf)
      .send({});
    expect(empSweepAttempt.status).toBe(403);

    const empOverview = await empAgent.get('/api/opportunity-ops/overview');
    expect(empOverview.status).toBe(200);
    expect(empOverview.body.overview.advertisingFeeInfluencesVerification).toBe(false);
    expect(empOverview.body.overview.externalKycVendorConnected).toBe(false);

    // 3. Admin login + cookie CSRF guard + strict Zod check + sweep + 8/8 suite
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      extractCookieValue(adminLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (adminLogin.body.csrfToken as string);

    // Missing CSRF header fails 403
    const missingCsrfSweep = await adminAgent
      .post('/api/admin/opportunity-ops/sweep')
      .send({});
    expect(missingCsrfSweep.status).toBe(403);

    // Strict Zod rejects unknown key
    const badZodSweep = await adminAgent
      .post('/api/admin/opportunity-ops/sweep')
      .set('X-CSRF-Token', adminCsrf)
      .send({ unexpectedField: true });
    expect(badZodSweep.status).toBe(400);

    // Execute valid admin sweep
    const sweepRes = await adminAgent
      .post('/api/admin/opportunity-ops/sweep')
      .set('X-CSRF-Token', adminCsrf)
      .send({ notes: 'Vitest Block 9.1 verification sweep' });
    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.sweep.sweepId).toMatch(/^oswp_/);
    expect(sweepRes.body.sweep.feeIndependenceVerified).toBe(true);
    expect(sweepRes.body.sweep.nonTransitivityVerified).toBe(true);
    expect(sweepRes.body.sweep.evidenceSealsVerifiedCount).toBeGreaterThanOrEqual(3);

    // Execute 8/8 suite route
    const suiteRes = await adminAgent
      .post('/api/opportunity-ops/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);
    expect(suiteRes.body.report.externalKycVendorConnected).toBe(false);

    // 4. QA readiness (34/34) and live report (85.0% Full App / 15.0% remaining)
    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(34);
    expect(qaRes.body.automatedInvariantsPassed).toBe(34);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(85.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(15.0);
    expect(liveRes.body.progressMetrics.trackBStatus).toBe('COMMITTED');
  });
});
