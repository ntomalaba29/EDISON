import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { runCommercialReadinessVerificationSuite } from '../src/server/commercialReadinessEngine.ts';

function extractCsrfCookie(setCookies: string[] | string | undefined): string {
  const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  for (const cookieStr of arr) {
    const match = cookieStr.match(/edison_csrf=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

describe('EDISON Phase 13 Block 13.1 — Commercial Readiness Board Gate, SLA Matrix & Unit Economics (Software-First)', () => {
  let tempDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-phase13-test-'));
    store = new EdisonPrototypeStore({ dataDir: tempDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempDir, 'uploads') });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs deterministic 8/8 commercial readiness verification suite with honest launch, billing & hardware locks', () => {
    const report = runCommercialReadinessVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.commercialLaunchAuthorized).toBe(false);
    expect(report.paymentCollectionActive).toBe(false);
    expect(report.countryActivated).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });

  it('enforces auth (401), CSRF (403), admin RBAC (403), strict Zod validation (400), fail-closed launch block (400), unit economics, 28/28 QA & 75.0% Full App', async () => {
    // Unauthenticated POST without CSRF -> 403
    const unauthPost = await request(app).post('/api/commercial-readiness/verify-suite').send({});
    expect(unauthPost.status).toBe(403);

    // Invalid Bearer -> 401
    const badBearer = await request(app)
      .get('/api/commercial-readiness/overview')
      .set('Authorization', 'Bearer bad_token_xyz');
    expect(badBearer.status).toBe(401);

    // Non-admin advertiser session
    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      (advLogin.body.csrfToken as string) || extractCsrfCookie(advLogin.headers['set-cookie']);

    // Advertiser can view read-only overview, cannot mutate cost assumptions or board decisions -> 403
    const advOverview = await advAgent.get('/api/commercial-readiness/overview');
    expect(advOverview.status).toBe(200);

    const advCostUpdate = await advAgent
      .put('/api/commercial-readiness/cost-assumptions')
      .set('X-CSRF-Token', advCsrf)
      .send({
        activeHouseholdsEstimate: 5000,
        monthlyCommercialBreaksPerHousehold: 60,
        estimatedDirectCampaignsCount: 25,
        cdnEgressCostPerGbUsd: 0.085,
        dbHostingTierMonthlyUsd: 140,
        supportAgentHeadcount: 3,
        moderationHoursPerWeek: 30,
      });
    expect(advCostUpdate.status).toBe(403);

    const advBoard = await advAgent
      .post('/api/commercial-readiness/board-decision')
      .set('X-CSRF-Token', advCsrf)
      .send({
        decisionOutcome: 'hold_software_ready_pending_external_gates',
        requestedLaunchAuthorization: false,
        summaryNote: 'Advertiser cannot submit board gate decisions.',
      });
    expect(advBoard.status).toBe(403);

    // Admin session
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      (adminLogin.body.csrfToken as string) || extractCsrfCookie(adminLogin.headers['set-cookie']);

    // Strict Zod unknown-key rejection -> 400
    const strictReject = await adminAgent
      .post('/api/commercial-readiness/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({ rogueKey: true });
    expect(strictReject.status).toBe(400);

    // Overview verifies 10 pillars, 7 SLA targets, $0.00 Charity lock & all external blockers
    const overviewRes = await adminAgent.get('/api/commercial-readiness/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.headers['cache-control']).toContain('no-store');
    const ov = overviewRes.body.overview;
    expect(ov.isSoftwareSimulationOnly).toBe(true);
    expect(ov.commercialLaunchAuthorized).toBe(false);
    expect(ov.paymentCollectionActive).toBe(false);
    expect(ov.countryActivated).toBe(false);
    expect(ov.hardwareTested).toBe(false);
    expect(ov.stageP6Deferred).toBe(true);
    expect(ov.charityListingFeeUsd).toBe(0);
    expect(ov.charityJobFeeLockEnforced).toBe(true);
    expect(ov.pillars).toHaveLength(10);
    expect(ov.productionSlaTargets).toHaveLength(7);

    // Admin updates unit economics model cleanly while keeping Charity=$0.00 & paymentCollectionActive=false
    const costRes = await adminAgent
      .put('/api/commercial-readiness/cost-assumptions')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        activeHouseholdsEstimate: 12000,
        monthlyCommercialBreaksPerHousehold: 65,
        estimatedDirectCampaignsCount: 30,
        cdnEgressCostPerGbUsd: 0.08,
        dbHostingTierMonthlyUsd: 180,
        supportAgentHeadcount: 4,
        moderationHoursPerWeek: 40,
      });
    expect(costRes.status).toBe(200);
    expect(costRes.body.overview.unitEconomics.charityListingFeeUsd).toBe(0);
    expect(costRes.body.overview.unitEconomics.paymentCollectionActive).toBe(false);
    expect(costRes.body.overview.unitEconomics.costModelSha256).toMatch(/^[a-f0-9]{64}$/);

    // Fail-closed: Admin attempting requestedLaunchAuthorization: true is REJECTED (HTTP 400 COMMERCIAL_GATE_LOCKED)
    const prematureLaunch = await adminAgent
      .post('/api/commercial-readiness/board-decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        decisionOutcome: 'hold_software_ready_pending_external_gates',
        requestedLaunchAuthorization: true,
        summaryNote: 'Attempting premature launch approval prior to Stage P6 and pen-test.',
      });
    expect(prematureLaunch.status).toBe(400);
    expect(prematureLaunch.body.error).toContain('COMMERCIAL_GATE_LOCKED:');

    // Admin records legitimate software-ready hold decision -> 201
    const boardHold = await adminAgent
      .post('/api/commercial-readiness/board-decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        decisionOutcome: 'hold_software_ready_pending_external_gates',
        requestedLaunchAuthorization: false,
        summaryNote: 'Phase 13 software-first board gate verified; waiting for Stage P6 physical TV pilot, pen-test, and Phase 14 market sign-off.',
      });
    expect(boardHold.status).toBe(201);
    expect(boardHold.body.decision.commercialLaunchAuthorized).toBe(false);
    expect(boardHold.body.decision.paymentCollectionActive).toBe(false);
    expect(boardHold.body.decision.countryActivated).toBe(false);
    expect(boardHold.body.decision.hardwareTested).toBe(false);
    expect(boardHold.body.decision.boardDecisionSha256).toMatch(/^[a-f0-9]{64}$/);

    // Execute verify-suite endpoint
    const suiteRes = await adminAgent
      .post('/api/commercial-readiness/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);

    // Verify QA invariants and executable-subphase progress.
    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(34);
    expect(qaRes.body.automatedInvariantsPassed).toBe(34);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.executionSubphasePct).toBe(77.8);
    expect(liveRes.body.progressMetrics.remainingExecutionSubphasePct).toBe(22.2);
    expect(liveRes.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
  });
});
