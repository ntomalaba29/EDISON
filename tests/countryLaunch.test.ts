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

describe('Legacy jurisdiction reference checks and retired market activation API', () => {
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
  });

  it('enforces authorization and validation while retiring phased market activation writes', async () => {
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

    // 6. Inspect legacy jurisdiction overview without treating it as launch approval.
    const overviewRes = await adminAgent.get('/api/country-launch/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.headers['cache-control']).toContain('no-store');
    const ov = overviewRes.body.overview;
    expect(ov.referenceTargetingCountryCode).toBe('ZW');
    expect(ov.activeLaunchedMarketsCount).toBe(0);
    expect(ov.totalInventoriedMarketsCount).toBe(6);
    expect(ov.softwareReadyMarketsCount).toBe(6);
    expect(ov.countryActivated).toBe(false);
    expect(ov.commercialLaunchAuthorized).toBe(false);
    expect(ov.paymentCollectionActive).toBe(false);
    expect(ov.hardwareTested).toBe(false);
    expect(ov.stageP6Deferred).toBe(true);
    expect(ov.legalComplianceClaimed).toBe(false);
    expect(ov.charityListingFeeUsd).toBe(0);
    expect(ov.charityJobFeeLockEnforced).toBe(true);
    expect(ov.countries).toHaveLength(6);
    const zw = ov.countries.find((c: { countryCode: string }) => c.countryCode === 'ZW');
    expect(zw.isReferenceTargetingProfile).toBe(true);
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

    // 8. Country-by-country activation is retired; it cannot create a phased release.
    const prematureActivate = await adminAgent
      .post('/api/country-launch/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
        requestedCountryActivation: true,
        summaryNote: 'Attempting premature ZW live launch before Stage P6 and POTRAZ registration.',
      });
    expect(prematureActivate.status).toBe(410);
    expect(prematureActivate.body.error).toContain('not release waves');

    // 9. Even a non-activation decision cannot recreate the retired country rollout workflow.
    const validDecision = await adminAgent
      .post('/api/country-launch/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        countryCode: 'ZW',
        decisionOutcome: 'stage_software_ready_for_stage_p6_and_filing',
        requestedCountryActivation: false,
        summaryNote: 'Zimbabwe is a reference targeting geography, not a product-release wave.',
      });
    expect(validDecision.status).toBe(410);

    // 10. Execute verify-suite endpoint
    const suiteRes = await adminAgent
      .post('/api/country-launch/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);

    // 11. Verify QA invariants and executable-subphase progress.
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
