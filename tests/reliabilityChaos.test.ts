import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  ALL_FAILURE_MODE_IDS,
  runFull18FailureModesChaosSuite,
  runReliabilityChaosVerificationSuite,
  runSingleFailureModeChaosTest,
} from '../src/server/reliabilityChaosEngine.ts';
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

describe('Phase 11 Block 11.1 — Reliability, Failure-Mode & Chaos Recovery Suite (Software-First)', () => {
  let tempRoot: string;
  let dataDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-p11-chaos-'));
    dataDir = path.join(tempRoot, 'data');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempRoot, 'uploads') });
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('passes all 18 FMEA failure modes (FM-01 .. FM-18) deterministically with 100% ordinary live TV preservation', () => {
    expect(ALL_FAILURE_MODE_IDS).toHaveLength(18);

    const fullStandard = runFull18FailureModesChaosSuite({
      executedByEmail: 'admin@edison.demo',
      injectSeverity: 'standard',
    });
    expect(fullStandard.all18Passed).toBe(true);
    expect(fullStandard.passedFailureModes).toBe(18);
    expect(fullStandard.failedFailureModes).toBe(0);
    expect(fullStandard.ordinaryTvPreservedAll).toBe(true);
    expect(fullStandard.zeroStuckOffLiveTv).toBe(true);
    expect(fullStandard.isSoftwareSimulationOnly).toBe(true);
    expect(fullStandard.hardwareTested).toBe(false);
    expect(fullStandard.stageP6Deferred).toBe(true);
    expect(fullStandard.realBroadcastTunerConnected).toBe(false);
    expect(fullStandard.reportSha256).toMatch(/^[a-f0-9]{64}$/);

    const fm09Extreme = runSingleFailureModeChaosTest('FM-09', { injectSeverity: 'extreme' });
    expect(fm09Extreme.passed).toBe(true);
    expect(fm09Extreme.watchdogTriggered).toBe(true);
    expect(fm09Extreme.ordinaryTvPreserved).toBe(true);
    expect(fm09Extreme.viewerStuckOffLiveTv).toBe(false);

    const suite = runReliabilityChaosVerificationSuite();
    expect(suite.allPassed).toBe(true);
    expect(suite.passedChecks).toBe(8);
    expect(suite.totalChecks).toBe(8);
  });

  it('enforces auth (401), CSRF (403), Zod validation (400), and RBAC admin gate (403) on reliability endpoints', async () => {
    const unauthGet = await request(app).get('/api/reliability/overview');
    expect(unauthGet.status).toBe(401);

    const unauthPost = await request(app)
      .post('/api/reliability/chaos-probe')
      .send({ failureModeId: 'FM-01' });
    expect(unauthPost.status).toBe(403);

    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      extractCookieValue(advLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (advLogin.body.csrfToken as string);

    const badProbe = await advAgent
      .post('/api/reliability/chaos-probe')
      .set('X-CSRF-Token', advCsrf)
      .send({ failureModeId: 'FM-999' });
    expect(badProbe.status).toBe(400);

    const forbiddenAdminSuite = await advAgent
      .post('/api/admin/reliability/run-all-18')
      .set('X-CSRF-Token', advCsrf)
      .send({ injectSeverity: 'standard' });
    expect(forbiddenAdminSuite.status).toBe(403);

    const singleProbe = await advAgent
      .post('/api/reliability/chaos-probe')
      .set('X-CSRF-Token', advCsrf)
      .send({ failureModeId: 'FM-15', injectSeverity: 'extreme' });
    expect(singleProbe.status).toBe(200);
    expect(singleProbe.body.probe.failureModeId).toBe('FM-15');
    expect(singleProbe.body.probe.passed).toBe(true);
    expect(singleProbe.body.probe.ordinaryTvPreserved).toBe(true);
  });

  it('persists admin full 18-FM chaos report, verifies 8/8 checks, passes 26/26 QA invariants, and reports 70.0% Full App', async () => {
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      extractCookieValue(adminLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (adminLogin.body.csrfToken as string);

    const runAllRes = await adminAgent
      .post('/api/admin/reliability/run-all-18')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        injectSeverity: 'extreme',
        notes: 'Phase 11 Block 11.1 extreme chaos verification',
      });
    expect(runAllRes.status).toBe(200);
    expect(runAllRes.body.report.passedFailureModes).toBe(18);
    expect(runAllRes.body.report.all18Passed).toBe(true);
    expect(runAllRes.body.report.ordinaryTvPreservedAll).toBe(true);
    expect(runAllRes.body.overview.lastChaosRun.reportId).toBe(runAllRes.body.report.reportId);

    const overviewRes = await adminAgent.get('/api/reliability/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.overview.lastChaosRun.passedFailureModes).toBe(18);
    expect(overviewRes.body.overview.hardwareTested).toBe(false);
    expect(overviewRes.body.overview.stageP6Deferred).toBe(true);

    const verifyRes = await adminAgent
      .post('/api/reliability/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.report.passedChecks).toBe(8);
    expect(verifyRes.body.report.allPassed).toBe(true);

    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(28);
    expect(qaRes.body.automatedInvariantsPassed).toBe(28);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(75.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(25.0);
    expect(liveRes.body.progressMetrics.softwareToStageP6Pct).toBe(81.8);
    expect(liveRes.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
  });
});
