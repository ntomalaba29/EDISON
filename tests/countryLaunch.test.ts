import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { runCountryLaunchVerificationSuite } from '../src/server/countryLaunchEngine.ts';

function extractCsrfCookie(setCookies: string[] | string | undefined): string {
  const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  for (const cookieStr of arr) {
    const match = cookieStr.match(/edison_csrf=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

describe('EDISON Phase 14 Block 14.1 — Country-by-Country Launch Readiness Gate & Jurisdiction Policy Engine (Software-First)', () => {
  let tempDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-phase14-test-'));
    store = new EdisonPrototypeStore({ dataDir: tempDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempDir, 'uploads') });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs deterministic 8/8 country launch verification suite with zero activated markets and independent research locks', () => {
    const report = runCountryLaunchVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.isSoftwareSimulationOnly).toBe(true);
    expect(report.countryActivated).toBe(false);
    expect(report.activeLaunchedMarketsCount).toBe(0);
    expect(report.commercialLaunchAuthorized).toBe(false);
    expect(report.paymentCollectionActive).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
    expect(report.legalComplianceClaimed).toBe(false);
    expect(report.noLawyerDependencyPolicy).toBe(true);
  });

  it('enforces auth (401), CSRF (403), admin RBAC (403), strict Zod (400), fail-closed COUNTRY_LAUNCH_GATE_LOCKED (400), 30/30 QA & 81.0% Full App', async () => {
    // 1. Unauthenticated POST without CSRF -> 403
    const unauthPost = await request(app).post('/api/country-launch/verify-suite').send({});
    expect(unauthPost.status).toBe(403);

    // 2. Invalid Bearer -> 401
    const badBearer = await request(app)
      .get('/api/country-launch/overview')
      .set('Authorization', 'Bearer bad_token_xyz');
    expect(badBearer.status).toBe(401);

    // 3. Non-admin advertiser session can read overview, cannot mutate policy or log activation decisions -> 403
    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      (advLogin.body.csrfToken as string) || extractCsrfCookie(advLogin.headers['set-cookie']);

    const advOverview = await advAgent.get('/api/country-launch/overview');
    expect(advOverview.status).toBe(200);

    const advPolicyPut = await advAgent
      .put('/api/country-launch/policy')
      .set('X-CSRF-Token', advCsrf)
      .send({
        countryCode: 'ZW',
        consentBannerStrictMode: true,
        requirePreBroadcastHumanModeration: true,
        enforceVppsOrLocalPrivacyLock: true,
        operatorTaxNoticeLabel: 'Unauthorized advertiser update attempt',
      });
    expect(advPolicyPut.status).toBe(403);

    const advDecisionPost = await advAgent
      .post('/api/country-launch/decision')
      .set('X-CSRF-Token', advCsrf)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'hold_country_unactivated_pending_clearances',
        requestedCountryActivation: false,
        summaryNote: 'Non-admin cannot submit country launch decisions.',
      });
    expect(advDecisionPost.status).toBe(403);

    // 4. Admin session
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf =
      (adminLogin.body.csrfToken as string) || extractCsrfCookie(adminLogin.headers['set-cookie']);

    // 5. Strict Zod rejects unknown payload fields -> 400
    const strictReject = await adminAgent
      .post('/api/country-launch/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({ forceActivate: true });
    expect(strictReject.status).toBe(400);

    // 6. Inspect 6-country overview (ZW Initial + 5 markets, 0 active, Charity=$0.00, noLawyerDependencyPolicy=true)
    const overviewRes = await adminAgent.get('/api/country-launch/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.headers['cache-control']).toContain('no-store');
    const ov = overviewRes.body.overview;
    expect(ov.initialLaunchMarket).toBe('ZW');
    expect(ov.activeLaunchedMarketsCount).toBe(0);
    expect(ov.totalInventoriedMarketsCount).toBe(6);
    expect(ov.softwareReadyMarketsCount).toBe(6);
    expect(ov.countryActivated).toBe(false);
    expect(ov.commercialLaunchAuthorized).toBe(false);
    expect(ov.paymentCollectionActive).toBe(false);
    expect(ov.hardwareTested).toBe(false);
    expect(ov.stageP6Deferred).toBe(true);
    expect(ov.legalComplianceClaimed).toBe(false);
    expect(ov.noLawyerDependencyPolicy).toBe(true);
    expect(ov.charityListingFeeUsd).toBe(0);
    expect(ov.charityJobFeeLockEnforced).toBe(true);
    expect(ov.countries).toHaveLength(6);
    const zw = ov.countries.find((c: { countryCode: string }) => c.countryCode === 'ZW');
    expect(zw.isInitialLaunchMarket).toBe(true);
    expect(zw.countryActivated).toBe(false);
    expect(zw.softwareGatesReadyCount).toBe(4);
    expect(zw.externalClearancesBlockedCount).toBe(2);
    expect(zw.liveSeedCoverage.householdsInMarket).toBeGreaterThanOrEqual(1);

    // 7. Admin updates policy controls for ZW while non-overridable safety locks stay TRUE
    const policyRes = await adminAgent
      .put('/api/country-launch/policy')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        countryCode: 'ZW',
        consentBannerStrictMode: true,
        requirePreBroadcastHumanModeration: true,
        enforceVppsOrLocalPrivacyLock: true,
        operatorTaxNoticeLabel: 'ZIMRA VAT / Digital Services Tax Baseline — Pre-Filing Reviewed',
      });
    expect(policyRes.status).toBe(200);
    const updatedZw = policyRes.body.overview.countries.find(
      (c: { countryCode: string }) => c.countryCode === 'ZW'
    );
    expect(updatedZw.policyConfig.operatorTaxNoticeLabel).toContain('ZIMRA VAT');
    expect(updatedZw.policyConfig.jobFeeZeroLockEnforced).toBe(true);
    expect(updatedZw.policyConfig.prohibitExternalSignalHijack).toBe(true);
    expect(updatedZw.policyConfig.redactHouseholdGeoFromAdvertisers).toBe(true);
    expect(updatedZw.countryActivated).toBe(false);

    // 8. Fail-closed: Admin requesting territory activation (requestedCountryActivation: true) -> 400 COUNTRY_LAUNCH_GATE_LOCKED
    const prematureActivate = await adminAgent
      .post('/api/country-launch/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
        requestedCountryActivation: true,
        summaryNote: 'Attempting premature ZW live launch before Stage P6 and POTRAZ registration.',
      });
    expect(prematureActivate.status).toBe(400);
    expect(prematureActivate.body.error).toContain('COUNTRY_LAUNCH_GATE_LOCKED:');

    // 9. Admin records valid unactivated territory staging decision -> 201 with SHA-256 digest
    const validDecision = await adminAgent
      .post('/api/country-launch/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
        requestedCountryActivation: false,
        summaryNote: 'ZW Initial Launch Market software controls verified; holding activation pending Stage P6 physical TV verification and POTRAZ filing.',
      });
    expect(validDecision.status).toBe(201);
    expect(validDecision.body.decision.countryCode).toBe('ZW');
    expect(validDecision.body.decision.countryActivated).toBe(false);
    expect(validDecision.body.decision.commercialLaunchAuthorized).toBe(false);
    expect(validDecision.body.decision.paymentCollectionActive).toBe(false);
    expect(validDecision.body.decision.hardwareTested).toBe(false);
    expect(validDecision.body.decision.legalComplianceClaimed).toBe(false);
    expect(validDecision.body.decision.decisionSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(validDecision.body.overview.activeLaunchedMarketsCount).toBe(0);

    // 10. Execute verify-suite endpoint
    const suiteRes = await adminAgent
      .post('/api/country-launch/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);

    // 11. Verify 30/30 QA invariants and 81.0% Full App / 19.0% remaining / 81.8% Stage P6
    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(30);
    expect(qaRes.body.automatedInvariantsPassed).toBe(30);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(81.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(19.0);
    expect(liveRes.body.progressMetrics.softwareToStageP6Pct).toBe(81.8);
    expect(liveRes.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
  });
});
