import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { runPilotReadinessVerificationSuite } from '../src/server/pilotReadinessEngine.ts';

function extractCsrfCookie(setCookies: string[] | string | undefined): string {
  const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  for (const cookieStr of arr) {
    const match = cookieStr.match(/edison_csrf=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

describe('EDISON Phase 12 Block 12.1 — Controlled Pilot Readiness, Zero-PII Telemetry & Stage P6 Runbook', () => {
  let tempDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-phase12-test-'));
    store = new EdisonPrototypeStore({ dataDir: tempDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempDir, 'uploads') });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs deterministic 8/8 pilot readiness suite with honest hardwareTested=false & countryActivated=false flags', () => {
    const report = runPilotReadinessVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.hardwareTested).toBe(false);
    expect(report.pilotHardwareExecuted).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
    expect(report.realBroadcastTunerConnected).toBe(false);
    expect(report.countryActivated).toBe(false);
    expect(report.paymentCollectionActive).toBe(false);
  });

  it('enforces auth (401), CSRF (403), admin RBAC (403), strict Zod validation (400), telemetry Zero-PII & cohort consent gates', async () => {
    // Unauthenticated POST without CSRF -> 403
    const unauthPost = await request(app).post('/api/pilot-readiness/verify-suite').send({});
    expect(unauthPost.status).toBe(403);

    // Invalid Bearer token -> 401
    const badBearer = await request(app)
      .get('/api/pilot-readiness/overview')
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

    // Advertiser cannot register cohort blueprints or edit Stage P6 prep notes -> 403
    const advCohort = await advAgent
      .post('/api/pilot-readiness/cohorts')
      .set('X-CSRF-Token', advCsrf)
      .send({
        cohortName: 'Unauthorised Cohort',
        targetCountryCode: 'ZW',
        targetArchitectureId: 'opt_in_viewer_prompt',
        maxHouseholdsCap: 10,
        enrolledHouseholdIds: [],
        decOpen02ShortBreakRuleAcknowledged: true,
        decOpen03GamMockOnlyAcknowledged: true,
      });
    expect(advCohort.status).toBe(403);

    const advPrep = await advAgent
      .post('/api/pilot-readiness/stage-p6-prep')
      .set('X-CSRF-Token', advCsrf)
      .send({
        stepId: 'P6-01',
        ownerPrepNote: 'Should be rejected for non-admin',
      });
    expect(advPrep.status).toBe(403);

    // Admin session
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      (adminLogin.body.csrfToken as string) || extractCsrfCookie(adminLogin.headers['set-cookie']);

    // Strictly reject unknown Zod keys -> 400
    const strictReject = await adminAgent
      .post('/api/pilot-readiness/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({ rogueField: 'nope' });
    expect(strictReject.status).toBe(400);

    // Overview verifies 6/6 pre-pilot software gates, 5 architectures, 8 Stage P6 steps & honest boundaries
    const overviewRes = await adminAgent.get('/api/pilot-readiness/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.headers['cache-control']).toContain('no-store');
    const overview = overviewRes.body.overview;
    expect(overview.isSoftwareSimulationOnly).toBe(true);
    expect(overview.hardwareTested).toBe(false);
    expect(overview.pilotHardwareExecuted).toBe(false);
    expect(overview.stageP6Deferred).toBe(true);
    expect(overview.countryActivated).toBe(false);
    expect(overview.paymentCollectionActive).toBe(false);
    expect(overview.softwareGatesReadyCount).toBe(6);
    expect(overview.softwareGatesTotalCount).toBe(6);
    expect(overview.allSoftwareGatesReady).toBe(true);
    expect(overview.targetArchitectures).toHaveLength(5);
    expect(overview.stageP6Runbook).toHaveLength(8);
    expect(overview.stageP6Runbook.every((s: { hardwareExecuted: boolean }) => s.hardwareExecuted === false)).toBe(true);

    // Telemetry validator: valid coarse telemetry passes with SHA-256
    const cleanTelRes = await adminAgent
      .post('/api/pilot-readiness/validate-telemetry')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        cohortId: 'plt_zw_optin_01',
        regionCode: 'ZW-HRE',
        architectureId: 'opt_in_viewer_prompt',
        householdConsentStatus: 'granted',
        claimedHardwareTested: false,
        consentEpoch: 1,
        expectedConsentEpoch: 1,
        switchLatencyMs: 390,
        returnToLiveTvMs: 280,
        qrScanObservedMs: 1450,
        ordinaryTvPreserved: true,
      });
    expect(cleanTelRes.status).toBe(200);
    expect(cleanTelRes.body.result.valid).toBe(true);
    expect(cleanTelRes.body.result.hardwareTested).toBe(false);
    expect(cleanTelRes.body.result.sanitisedTelemetrySample.payloadSha256).toMatch(/^[a-f0-9]{64}$/);

    // Telemetry validator: blocks PII + forged hardwareTested=true + withdrawn consent
    const badTelRes = await adminAgent
      .post('/api/pilot-readiness/validate-telemetry')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        cohortId: 'plt_zw_optin_01',
        regionCode: 'ZW-HRE',
        architectureId: 'android_tv_tif',
        householdConsentStatus: 'withdrawn',
        claimedHardwareTested: true,
        consentEpoch: 1,
        expectedConsentEpoch: 2,
        switchLatencyMs: 390,
        returnToLiveTvMs: 280,
        ordinaryTvPreserved: true,
        extraPayload: {
          email: 'viewer@example.org',
          exactCoordinates: '-17.8292, 31.0522',
        },
      });
    expect(badTelRes.status).toBe(200);
    expect(badTelRes.body.result.valid).toBe(false);
    expect(badTelRes.body.result.consentValid).toBe(false);
    expect(badTelRes.body.result.forgedHardwareClaimBlocked).toBe(true);
    expect(badTelRes.body.result.piiDetectedFields.length).toBeGreaterThanOrEqual(2);
    expect(badTelRes.body.result.hardwareTested).toBe(false);

    // Fetch existing consented household from Track B & verify cohort registration
    const hhRes = await adminAgent.get('/api/households');
    expect(hhRes.status).toBe(200);
    const seedHouseholdId = hhRes.body.items[0].id as string;

    const cohortCreateRes = await adminAgent
      .post('/api/pilot-readiness/cohorts')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        cohortName: 'ZW Closed Pilot Cohort Blueprint 1',
        targetCountryCode: 'ZW',
        targetArchitectureId: 'opt_in_viewer_prompt',
        maxHouseholdsCap: 15,
        enrolledHouseholdIds: [seedHouseholdId],
        decOpen02ShortBreakRuleAcknowledged: true,
        decOpen03GamMockOnlyAcknowledged: true,
      });
    expect(cohortCreateRes.status).toBe(201);
    expect(cohortCreateRes.body.cohort.status).toBe('ready_for_stage_p6');
    expect(cohortCreateRes.body.cohort.countryActivated).toBe(false);
    expect(cohortCreateRes.body.cohort.paymentCollectionActive).toBe(false);
    expect(cohortCreateRes.body.cohort.hardwareTested).toBe(false);

    // Update Stage P6 pre-flight note cleanly without altering hardwareExecuted=false
    const prepRes = await adminAgent
      .post('/api/pilot-readiness/stage-p6-prep')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        stepId: 'P6-04',
        ownerPrepNote: 'Verify LAN host reachable from iPhone + Android native camera before Stage P6.',
      });
    expect(prepRes.status).toBe(200);
    const p604 = prepRes.body.overview.stageP6Runbook.find((s: { stepId: string }) => s.stepId === 'P6-04');
    expect(p604.ownerPrepNote).toContain('Verify LAN host');
    expect(p604.hardwareExecuted).toBe(false);

    // Run verify-suite via API
    const verifyRes = await adminAgent
      .post('/api/pilot-readiness/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.report.passedChecks).toBe(8);
    expect(verifyRes.body.report.allPassed).toBe(true);

    // Prototype readiness (27/27) & live report (72.0% Full App / 28.0% remaining)
    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(27);
    expect(qaRes.body.automatedInvariantsPassed).toBe(27);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(72.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(28.0);
    expect(liveRes.body.progressMetrics.softwareToStageP6Pct).toBe(81.8);
    expect(liveRes.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
  });
});
