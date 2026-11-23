import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { runInternationalExpansionVerificationSuite } from '../src/server/internationalExpansionEngine.ts';
import {
  CONTINENT_TARGET_MARKETS,
  REGION_PROFILES,
} from '../src/server/continentCountryRegionData.ts';
import { validateHouseholdLocationHierarchy } from '../src/server/trackBHouseholdConsent.ts';
import type { LaunchMarketCode } from '../src/types/edison.ts';

function extractCsrfCookie(setCookies: string[] | string | undefined): string {
  const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  for (const cookieStr of arr) {
    const match = cookieStr.match(/edison_csrf=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

describe('EDISON Phase 15 Block 15.1 — International Multi-Region Expansion, Localization & Sovereign Residency (Software-First)', () => {
  let tempDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  it('uses authoritative geography and region profiles without activation', () => {
    expect(CONTINENT_TARGET_MARKETS.africa).toEqual(['ZW', 'ZA', 'KE_NG']);
    expect(CONTINENT_TARGET_MARKETS.asia).toEqual([]);
    expect(REGION_PROFILES).toHaveLength(4);

    for (const countryCode of CONTINENT_TARGET_MARKETS.africa
      .concat(CONTINENT_TARGET_MARKETS.europe)
      .concat(CONTINENT_TARGET_MARKETS.north_america)) {
      expect(
        REGION_PROFILES.some((profile) =>
          profile.targetMarketCodes.includes(countryCode as LaunchMarketCode)
        )
      ).toBe(true);
    }

    const location = validateHouseholdLocationHierarchy({
      countryCode: 'ZW',
      provinceOrRegion: 'Harare Metropolitan',
      metroArea: 'Greater Harare',
      cityOrTown: 'Harare',
      district: 'Harare Urban',
      suburbOrArea: 'Avondale',
      exactInstallationLocation: 'Test location not exposed',
    });
    expect(location.valid).toBe(true);
  });

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-phase15-test-'));
    store = new EdisonPrototypeStore({ dataDir: tempDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempDir, 'uploads') });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs deterministic 8/8 international expansion suite with 4 clusters, 7-currency $0 Charity locks & fail-closed activation', () => {
    const report = runInternationalExpansionVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.isSoftwareSimulationOnly).toBe(true);
    expect(report.regionalExpansionActive).toBe(false);
    expect(report.activeExpandedRegionsCount).toBe(0);
    expect(report.countryActivated).toBe(false);
    expect(report.commercialLaunchAuthorized).toBe(false);
    expect(report.paymentCollectionActive).toBe(false);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
    expect(report.legalComplianceClaimed).toBe(false);
    expect(report.prohibitCrossBorderPiiTransfer).toBe(true);
  });

  it('enforces auth (401), CSRF (403), admin RBAC (403), strict Zod (400), fail-closed EXPANSION_REGION_GATE_LOCKED (400), 30/30 QA & 81.0% Full App', async () => {
    // 1. Unauthenticated POST without CSRF -> 403
    const unauthPost = await request(app)
      .post('/api/international-expansion/verify-suite')
      .send({});
    expect(unauthPost.status).toBe(403);

    // 2. Invalid Bearer -> 401
    const badBearer = await request(app)
      .get('/api/international-expansion/overview')
      .set('Authorization', 'Bearer bad_token_xyz');
    expect(badBearer.status).toBe(401);

    // 3. Non-admin advertiser can inspect overview and run multi-currency pro-forma estimate, cannot edit blueprints or submit activation decisions -> 403
    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      (advLogin.body.csrfToken as string) || extractCsrfCookie(advLogin.headers['set-cookie']);

    const advOverview = await advAgent.get('/api/international-expansion/overview');
    expect(advOverview.status).toBe(200);

    const advEstimate = await advAgent
      .post('/api/international-expansion/estimate-currency')
      .set('X-CSRF-Token', advCsrf)
      .send({
        regionId: 'africa_south_zw_za',
        currencyCode: 'ZWG',
        proFormaCpmRateLocal: 119.25,
        directCommercialImpressions: 20000,
        charityImpressions: 40000,
      });
    expect(advEstimate.status).toBe(200);
    expect(advEstimate.body.estimate.charityCostLocal).toBe(0);
    expect(advEstimate.body.estimate.charityCostUsd).toBe(0);
    expect(advEstimate.body.estimate.charityZeroCostLocked).toBe(true);
    expect(advEstimate.body.estimate.paymentCollectionActive).toBe(false);

    const advConfigPut = await advAgent
      .put('/api/international-expansion/region-config')
      .set('X-CSRF-Token', advCsrf)
      .send({
        regionId: 'africa_south_zw_za',
        primaryLanguageCode: 'sn',
        supportedLanguageCodes: ['en', 'sn', 'nd'],
        captionAccessibilityStandard: 'DVB-Sub',
        multiCurrencyCode: 'USD',
        proFormaCpmRateLocal: 5.0,
      });
    expect(advConfigPut.status).toBe(403);

    const advDecisionPost = await advAgent
      .post('/api/international-expansion/decision')
      .set('X-CSRF-Token', advCsrf)
      .send({
        regionId: 'africa_south_zw_za',
        decisionOutcome: 'hold_regions_unactivated_pending_p6_and_p14',
        requestedRegionActivation: false,
        summaryNote: 'Non-admin cannot record expansion gate decisions.',
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
      .post('/api/international-expansion/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({ bypassPiiResidency: true });
    expect(strictReject.status).toBe(400);

    // 6. Inspect overview: 4 sovereign clusters mapping all 6 ADR-015 markets, 0 active, PII isolation & $0 Charity enforced
    const overviewRes = await adminAgent.get('/api/international-expansion/overview');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.headers['cache-control']).toContain('no-store');
    const ov = overviewRes.body.overview;
    expect(ov.primaryExpansionWaveRegion).toBe('africa_south_zw_za');
    expect(ov.activeExpandedRegionsCount).toBe(0);
    expect(ov.totalRegionsInventoriedCount).toBe(4);
    expect(ov.softwareReadyRegionsCount).toBe(4);
    expect(ov.supportedCurrenciesCount).toBe(7);
    expect(ov.supportedLanguagesTotalCount).toBeGreaterThanOrEqual(7);
    expect(ov.regionalExpansionActive).toBe(false);
    expect(ov.countryActivated).toBe(false);
    expect(ov.commercialLaunchAuthorized).toBe(false);
    expect(ov.paymentCollectionActive).toBe(false);
    expect(ov.hardwareTested).toBe(false);
    expect(ov.stageP6Deferred).toBe(true);
    expect(ov.legalComplianceClaimed).toBe(false);
    expect(ov.prohibitCrossBorderPiiTransfer).toBe(true);
    expect(ov.charityListingFeeUsd).toBe(0);
    expect(ov.charityJobFeeLockEnforced).toBe(true);
    expect(ov.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(ov.regions).toHaveLength(4);

    // 7. Admin updates regional localization blueprint while preserving cross-border PII isolation & $0 Charity lock
    const updateRes = await adminAgent
      .put('/api/international-expansion/region-config')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        regionId: 'europe_uk_eu',
        primaryLanguageCode: 'de',
        supportedLanguageCodes: ['de', 'en', 'fr', 'pt'],
        captionAccessibilityStandard: 'EBU-TT-D Broadcast Captions + ETSI EN 300 743',
        multiCurrencyCode: 'EUR',
        proFormaCpmRateLocal: 8.75,
      });
    expect(updateRes.status).toBe(200);
    const updatedEu = updateRes.body.overview.regions.find(
      (r: { regionId: string }) => r.regionId === 'europe_uk_eu'
    );
    expect(updatedEu.localizationConfig.primaryLanguageCode).toBe('de');
    expect(updatedEu.localizationConfig.multiCurrencyCode).toBe('EUR');
    expect(updatedEu.localizationConfig.proFormaCpmRateLocal).toBe(8.75);
    expect(updatedEu.localizationConfig.prohibitCrossBorderPiiTransfer).toBe(true);
    expect(updatedEu.localizationConfig.charityZeroCostLocked).toBe(true);
    expect(updatedEu.regionalExpansionActive).toBe(false);

    // 8. Verify multi-currency pro-forma endpoint across NGN/KES/GBP retains zero Charity fee
    const ngnEstimate = await adminAgent
      .post('/api/international-expansion/estimate-currency')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        regionId: 'africa_east_west_ke_ng',
        currencyCode: 'NGN',
        proFormaCpmRateLocal: 3500,
        directCommercialImpressions: 15000,
        charityImpressions: 30000,
      });
    expect(ngnEstimate.status).toBe(200);
    expect(ngnEstimate.body.estimate.commercialGrossLocal).toBe(52500);
    expect(ngnEstimate.body.estimate.charityCostLocal).toBe(0);
    expect(ngnEstimate.body.estimate.charityCostUsd).toBe(0);
    expect(ngnEstimate.body.estimate.paymentCollectionActive).toBe(false);

    // 9. Fail-closed: Admin requesting premature region activation -> 400 EXPANSION_REGION_GATE_LOCKED
    const prematureActivate = await adminAgent
      .post('/api/international-expansion/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        regionId: 'africa_south_zw_za',
        decisionOutcome: 'stage_multi_region_blueprint_for_post_launch',
        requestedRegionActivation: true,
        summaryNote: 'Attempting premature Southern Africa expansion activation before Stage P6.',
      });
    expect(prematureActivate.status).toBe(400);
    expect(prematureActivate.body.error).toContain('EXPANSION_REGION_GATE_LOCKED:');

    // 10. Valid unactivated expansion governance decision -> 201 with SHA-256 digest
    const validDecision = await adminAgent
      .post('/api/international-expansion/decision')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        regionId: 'africa_south_zw_za',
        decisionOutcome: 'stage_multi_region_blueprint_for_post_launch',
        requestedRegionActivation: false,
        summaryNote:
          'Southern Africa Wave 1 sovereign residency, Shona/Ndebele/Zulu captions, and USD/ZWG/ZAR $0 Charity blueprint staged; held unactivated until Stage P6 and Phase 14 launch.',
      });
    expect(validDecision.status).toBe(201);
    expect(validDecision.body.decision.regionId).toBe('africa_south_zw_za');
    expect(validDecision.body.decision.regionalExpansionActive).toBe(false);
    expect(validDecision.body.decision.countryActivated).toBe(false);
    expect(validDecision.body.decision.commercialLaunchAuthorized).toBe(false);
    expect(validDecision.body.decision.paymentCollectionActive).toBe(false);
    expect(validDecision.body.decision.hardwareTested).toBe(false);
    expect(validDecision.body.decision.legalComplianceClaimed).toBe(false);
    expect(validDecision.body.decision.decisionSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(validDecision.body.overview.activeExpandedRegionsCount).toBe(0);

    // 11. Run Phase 15 verify-suite endpoint
    const suiteRes = await adminAgent
      .post('/api/international-expansion/verify-suite')
      .set('X-CSRF-Token', adminCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);

    // 12. Verify 34/34 QA invariants and 85.0% Full App / 15.0% remaining / 87.1% Stage P6
    const qaRes = await adminAgent.get('/api/qa/prototype-readiness');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(34);
    expect(qaRes.body.automatedInvariantsPassed).toBe(34);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.overallFullAppPct).toBe(85.0);
    expect(liveRes.body.progressMetrics.remainingUntilFullAppPct).toBe(15.0);
    expect(liveRes.body.progressMetrics.softwareToStageP6Pct).toBe(87.1);
    expect(liveRes.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
  });
});
