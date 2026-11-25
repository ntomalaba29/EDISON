import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('EDISON Track B — Households, Profiles, Personalisation, Bundled Consent & HTTP 403 QR Revocation', () => {
  let tempRoot: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  let adminToken = '';
  let advertiserToken = '';
  let submitterToken = '';
  let viewerToken = '';
  let secondViewerToken = '';

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-track-b-test-'));
    const dataDir = path.join(tempRoot, 'data');
    const uploadsDir = path.join(tempRoot, 'uploads');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    const advLogin = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    advertiserToken = advLogin.body.token;

    const oppLogin = await request(app).post('/api/auth/login').send({
      email: 'employer@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(oppLogin.status).toBe(200);
    submitterToken = oppLogin.body.token;

    const viewerLogin = await request(app).post('/api/auth/login').send({
      email: 'viewer@edison.demo',
      password: 'EdisonViewer!2026',
    });
    expect(viewerLogin.status).toBe(200);
    expect(viewerLogin.body.user.role).toBe('household_viewer');
    viewerToken = viewerLogin.body.token;

    const secondViewerReg = await request(app).post('/api/auth/register').send({
      email: 'household.two@example.org',
      password: 'StrongPassword123',
      name: 'Farai Nyoni',
      organisationName: 'Nyoni Household',
      role: 'household_viewer',
    });
    expect(secondViewerReg.status).toBe(201);
    secondViewerToken = secondViewerReg.body.token;
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('serves representative geographic targeting profiles and passes the Track B verification suite', async () => {
    const cfgRes = await request(app)
      .get('/api/track-b/country-configs')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.body.decOpen01Status).toBe('LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL');
    expect(cfgRes.body.referenceTargetingCountryCode).toBe('ZW');
    expect(Array.isArray(cfgRes.body.countries)).toBe(true);
    const zw = cfgRes.body.countries.find((c: { countryCode: string }) => c.countryCode === 'ZW');
    const gb = cfgRes.body.countries.find((c: { countryCode: string }) => c.countryCode === 'GB');
    expect(zw?.isReferenceTargetingProfile).toBe(true);
    expect(gb).toBeTruthy();
    expect(cfgRes.body.countries.every((c: { countryActivated: boolean }) => c.countryActivated === false)).toBe(true);

    const suiteRes = await request(app)
      .post('/api/track-b/verify-suite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.allPassed).toBe(true);
    expect(suiteRes.body.passedChecks).toBe(7);
    expect(suiteRes.body.totalChecks).toBe(7);
  });

  it('enforces household privacy RBAC (403 for advertisers, submitters, and other viewers) while exposing coarse aggregates only', async () => {
    // Advertiser & opportunity submitter blocked from reading private household records
    const advHouseholds = await request(app)
      .get('/api/households')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(advHouseholds.status).toBe(403);

    const oppHouseholds = await request(app)
      .get('/api/households/hh_seed_zw_01')
      .set('Authorization', `Bearer ${submitterToken}`);
    expect(oppHouseholds.status).toBe(403);

    // Other household viewer blocked from reading hh_seed_zw_01
    const otherViewerRead = await request(app)
      .get('/api/households/hh_seed_zw_01')
      .set('Authorization', `Bearer ${secondViewerToken}`);
    expect(otherViewerRead.status).toBe(403);

    // Advertiser cannot probe private household via break scheduler or delivery manifest
    const advScheduleProbe = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        requestedBreakDurationSeconds: 65,
        householdId: 'hh_seed_zw_01',
      });
    expect(advScheduleProbe.status).toBe(403);

    const advManifestProbe = await request(app)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'tv_probe',
        regionCode: 'ZW',
        householdId: 'hh_seed_zw_01',
      });
    expect(advManifestProbe.status).toBe(403);

    // Advertiser geo aggregates endpoint exposes strictly non-identifying coarse counts
    const aggRes = await request(app)
      .get('/api/advertiser/targeting-aggregates')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(aggRes.status).toBe(200);
    expect(aggRes.headers['cache-control']).toContain('no-store');
    expect(Array.isArray(aggRes.body.items)).toBe(true);
    const serialized = JSON.stringify(aggRes.body.items);
    expect(serialized).toContain('Harare');
    expect(serialized).not.toContain('Tariro');
    expect(serialized).not.toContain('Samora Machel');
    expect(serialized).not.toContain('exactInstallationLocation');
  });

  it('registers households, validates 7-level geo hierarchy, and disables targeting without breaking ordinary TV when location is invalid', async () => {
    const createInvalid = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${secondViewerToken}`)
      .send({
        householdLabel: 'Byo Mismatch Test Home',
        tvDeviceLabel: 'Guestroom Smart TV',
        location: {
          countryCode: 'ZW',
          provinceOrRegion: 'Harare Metropolitan',
          metroArea: 'Greater Harare',
          cityOrTown: 'Bulawayo', // cross-province mismatch
          district: 'Bulawayo Central',
          suburbOrArea: 'Hillside',
          exactInstallationLocation: 'Plot 21 Hillside Avenue',
        },
        commercialConsentGranted: true,
        personalisationMasterEnabled: true,
        neutralDisplayMode: false,
      });
    expect(createInvalid.status).toBe(201);
    const hhId = createInvalid.body.item.id as string;
    expect(createInvalid.body.item.locationValid).toBe(false);
    expect(createInvalid.body.item.targetingDisabled).toBe(true);
    expect(createInvalid.body.item.ordinaryTvPreserved).toBe(true);

    // Targeting invalid -> matches suspended & delivery manifest/break scheduler fail-closed
    const matchSuspended = await request(app)
      .get(`/api/households/${hhId}/matches`)
      .set('Authorization', `Bearer ${secondViewerToken}`);
    expect(matchSuspended.status).toBe(200);
    expect(matchSuspended.body.deliverySuspended).toBe(true);
    expect(matchSuspended.body.ordinaryTvPreserved).toBe(true);
    expect(matchSuspended.body.matches).toHaveLength(0);

    const breakBlocked = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${secondViewerToken}`)
      .send({
        requestedBreakDurationSeconds: 65,
        householdId: hhId,
      });
    expect(breakBlocked.status).toBe(200);
    expect(breakBlocked.body.plan.adDeliverySuspended).toBe(true);
    expect(breakBlocked.body.plan.skipped).toBe(true);
    expect(breakBlocked.body.plan.ordinaryTvPreserved).toBe(true);

    // Ordinary TV AURA remote still works cleanly
    const remoteRes = await request(app)
      .post('/api/tv-adapters/remote-simulate')
      .set('Authorization', `Bearer ${secondViewerToken}`)
      .send({
        platformId: 'android_tv_tif',
        intentSource: 'AURA',
        command: 'volume_up',
      });
    expect(remoteRes.status).toBe(200);
    expect(remoteRes.body.ok).toBe(true);
    expect(remoteRes.body.nextState.ordinaryTvIntact).toBe(true);

    // Repair location hierarchy -> targeting re-enables
    const repairGeo = await request(app)
      .put(`/api/households/${hhId}/location`)
      .set('Authorization', `Bearer ${secondViewerToken}`)
      .send({
        countryCode: 'ZW',
        provinceOrRegion: 'Bulawayo Metropolitan',
        metroArea: 'Greater Bulawayo',
        cityOrTown: 'Bulawayo',
        district: 'Bulawayo Central',
        suburbOrArea: 'Hillside',
        exactInstallationLocation: 'Plot 21 Hillside Avenue',
      });
    expect(repairGeo.status).toBe(200);
    expect(repairGeo.body.item.locationValid).toBe(true);
    expect(repairGeo.body.item.targetingDisabled).toBe(false);
    expect(repairGeo.body.item.ordinaryTvPreserved).toBe(true);
  });

  it('enforces multi-member scrypt PIN isolation, individual consent exclusions, safe TV personalisation, and zero PII leaks on TV', async () => {
    const membersRes = await request(app)
      .get('/api/households/hh_seed_zw_01/members')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(membersRes.status).toBe(200);
    const tariro = membersRes.body.items.find(
      (m: { displayName: string }) => m.displayName === 'Tariro Moyo'
    );
    expect(tariro).toBeTruthy();
    expect(tariro.hasPinLock).toBe(true);
    expect(tariro.pinHash).toBeUndefined();

    // Missing or wrong PIN rejected with 403
    const missingPinPatch = await request(app)
      .patch(`/api/households/hh_seed_zw_01/members/${tariro.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ careerAspirations: 'Should fail without PIN' });
    expect(missingPinPatch.status).toBe(403);

    const wrongPinDelete = await request(app)
      .delete(`/api/households/hh_seed_zw_01/members/${tariro.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ pinVerification: '9999' });
    expect(wrongPinDelete.status).toBe(403);

    // Add a temporary 3rd unconsented member and verify exclusion + CRUD delete
    const addMember = await request(app)
      .post('/api/households/hh_seed_zw_01/members')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        displayName: 'Kudzai Moyo',
        pin: '2468',
        personalisationConsentGranted: false,
        educationLevel: 'BEng Electrical',
        qualifications: ['Secret Private Qualification X'],
        skills: ['fibre', 'solar', 'electrical'],
        experienceSummary: '5 years confidential private work history',
        experienceYears: 5,
        occupationOrTrade: 'Electrical Engineer',
        interestedCategories: ['apprenticeship', 'training'],
      });
    expect(addMember.status).toBe(201);
    const kudzaiId = addMember.body.item.id as string;

    const matchRes = await request(app)
      .get('/api/households/hh_seed_zw_01/matches')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(matchRes.status).toBe(200);
    expect(matchRes.body.deliverySuspended).toBe(false);
    const zwApprenticeship = matchRes.body.matches.find(
      (m: { opportunityId: string }) => m.opportunityId === 'opp_seed_zw_04'
    );
    expect(zwApprenticeship).toBeTruthy();
    expect(zwApprenticeship.matchedCount).toBe(2); // Tariro + Tinashe
    expect(zwApprenticeship.excludedMembersCount).toBe(1); // Kudzai unconsented
    expect(
      zwApprenticeship.matchedMembers.some((m: { memberId: string }) => m.memberId === kudzaiId)
    ).toBe(false);
    expect(zwApprenticeship.guaranteeDisclaimer).toContain('never guarantees');

    // Safe TV display contains names only — NEVER qualifications, CV history, or private address
    const tvPayload = JSON.stringify(zwApprenticeship.tvDisplay);
    expect(zwApprenticeship.tvDisplay.mode).toBe('multi_named');
    expect(tvPayload).toContain('Tariro');
    expect(tvPayload).toContain('Tinashe');
    expect(tvPayload).not.toContain('City & Guilds');
    expect(tvPayload).not.toContain('Computer Science');
    expect(tvPayload).not.toContain('Samora Machel');

    // Neutral shared-household toggle hides individual names cleanly
    const toggleNeutral = await request(app)
      .patch('/api/households/hh_seed_zw_01/settings')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ neutralDisplayMode: true });
    expect(toggleNeutral.status).toBe(200);

    const neutralBreak = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        requestedBreakDurationSeconds: 65,
        householdId: 'hh_seed_zw_01',
      });
    expect(neutralBreak.status).toBe(200);
    expect(neutralBreak.body.plan.tvPersonalisation.mode).toBe('neutral_shared');
    expect(neutralBreak.body.plan.tvPersonalisation.namedRecipientsCount).toBe(0);
    expect(JSON.stringify(neutralBreak.body.plan.tvPersonalisation)).not.toContain('Tariro');

    // Restore neutralDisplayMode back to false and delete temporary member with correct PIN
    await request(app)
      .patch('/api/households/hh_seed_zw_01/settings')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ neutralDisplayMode: false });

    const delOk = await request(app)
      .delete(`/api/households/hh_seed_zw_01/members/${kudzaiId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ pinVerification: '2468' });
    expect(delOk.status).toBe(200);
  });

  it('enforces DEC-OPEN-01 bundled consent withdrawal, HTTP 403 QR revocation across epochs, cache/break gates, and explicit auditable restoration', async () => {
    const hhBefore = await request(app)
      .get('/api/households/hh_seed_zw_01')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(hhBefore.status).toBe(200);
    const epochBefore = hhBefore.body.item.consentEpoch as number;

    // 1. Issue active household epoch-bound QR token
    const issueQr = await request(app)
      .post('/api/households/hh_seed_zw_01/qr-issue')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        baseQrToken: 'job-demo',
        opportunityId: 'opp_seed_zw_04',
        ttlSeconds: 1800,
      });
    expect(issueQr.status).toBe(201);
    const activeToken = issueQr.body.item.token as string;
    expect(activeToken).toMatch(/^hqr_/);
    expect(issueQr.body.item.consentEpoch).toBe(epochBefore);

    // Confirm /r/:token issues HTTP 302 with no-store cache headers before withdrawal
    const activeRedirect = await request(app).get(`/r/${activeToken}`);
    expect(activeRedirect.status).toBe(302);
    expect(activeRedirect.headers['cache-control']).toContain('no-store');

    // Also issue a 1s TTL token to verify expiry -> HTTP 403
    const shortQr = await request(app)
      .post('/api/households/hh_seed_zw_01/qr-issue')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        baseQrToken: 'edison-demo',
        ttlSeconds: 1,
      });
    expect(shortQr.status).toBe(201);
    const expiringToken = shortQr.body.item.token as string;

    // 2. Execute Bundled Consent Withdrawal (DEC-OPEN-01)
    const withdrawRes = await request(app)
      .post('/api/households/hh_seed_zw_01/consent/withdraw')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        reason: 'Viewer opts out of commercial advertising; bundled withdrawal must suspend all categories.',
      });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.household.commercialConsentStatus).toBe('withdrawn');
    expect(withdrawRes.body.household.charityAndOpportunityStatus).toBe(
      'suspended_by_bundled_withdrawal'
    );
    expect(withdrawRes.body.household.consentEpoch).toBe(epochBefore + 1);
    expect(withdrawRes.body.revokedQrTokensCount).toBeGreaterThanOrEqual(2);

    // 3. Previously issued QR token immediately returns HTTP 403
    const revokedRedirect = await request(app).get(`/r/${activeToken}`);
    expect(revokedRedirect.status).toBe(403);
    expect(revokedRedirect.headers['cache-control']).toContain('no-store');

    // 4. Opportunity matching, break scheduler, delivery manifest, and QR issuance fail closed
    const withdrawnMatches = await request(app)
      .get('/api/households/hh_seed_zw_01/matches')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(withdrawnMatches.status).toBe(200);
    expect(withdrawnMatches.body.deliverySuspended).toBe(true);
    expect(withdrawnMatches.body.ordinaryTvPreserved).toBe(true);
    expect(withdrawnMatches.body.matches).toHaveLength(0);

    const withdrawnBreak = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        requestedBreakDurationSeconds: 65,
        householdId: 'hh_seed_zw_01',
        expectedConsentEpoch: epochBefore,
      });
    expect(withdrawnBreak.status).toBe(200);
    expect(withdrawnBreak.body.plan.adDeliverySuspended).toBe(true);
    expect(withdrawnBreak.body.plan.slots).toHaveLength(0);
    expect(withdrawnBreak.body.plan.ordinaryTvPreserved).toBe(true);

    const withdrawnManifest = await request(app)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'tv_hh_01',
        regionCode: 'ZW',
        householdId: 'hh_seed_zw_01',
        expectedConsentEpoch: epochBefore,
      });
    expect(withdrawnManifest.status).toBe(200);
    expect(withdrawnManifest.body.adDeliverySuspended).toBe(true);
    expect(withdrawnManifest.body.eligibleCount).toBe(0);

    const blockedQrIssue = await request(app)
      .post('/api/households/hh_seed_zw_01/qr-issue')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ baseQrToken: 'job-demo', ttlSeconds: 600 });
    expect(blockedQrIssue.status).toBe(403);

    // Ordinary live TV & AURA remote remain unaffected
    const ordinaryTvRemote = await request(app)
      .post('/api/tv-adapters/remote-simulate')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        platformId: 'android_tv_tif',
        intentSource: 'AURA',
        command: 'channel_up',
      });
    expect(ordinaryTvRemote.status).toBe(200);
    expect(ordinaryTvRemote.body.ok).toBe(true);
    expect(ordinaryTvRemote.body.nextState.ordinaryTvIntact).toBe(true);

    // 5. Explicit auditable restoration requires explicitConfirmation: true
    const badRestore = await request(app)
      .post('/api/households/hh_seed_zw_01/consent/restore')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        explicitConfirmation: false,
        reason: 'Must reject unconfirmed restore',
      });
    expect(badRestore.status).toBe(400);

    const okRestore = await request(app)
      .post('/api/households/hh_seed_zw_01/consent/restore')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        explicitConfirmation: true,
        reason: 'Viewer explicitly opts back in under audited confirmation.',
      });
    expect(okRestore.status).toBe(200);
    const restoredEpoch = okRestore.body.household.consentEpoch as number;
    expect(restoredEpoch).toBe(epochBefore + 2);
    expect(okRestore.body.household.commercialConsentStatus).toBe('granted');
    expect(okRestore.body.household.charityAndOpportunityStatus).toBe('active');

    // CRITICAL: Pre-withdrawal QR tokens remain permanently HTTP 403 even after restoration!
    const preWithdrawalStillDead = await request(app).get(`/r/${activeToken}`);
    expect(preWithdrawalStillDead.status).toBe(403);

    // Stale expectedConsentEpoch from before restoration is still rejected by manifest/break gates
    const staleManifestAfterRestore = await request(app)
      .post('/api/delivery/manifest')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        platformId: 'simulation_tv',
        deviceSlotId: 'tv_hh_01',
        regionCode: 'ZW',
        householdId: 'hh_seed_zw_01',
        expectedConsentEpoch: epochBefore,
      });
    expect(staleManifestAfterRestore.status).toBe(200);
    expect(staleManifestAfterRestore.body.adDeliverySuspended).toBe(true);

    // Verify 1s TTL token expiry after waiting 1.1s on a fresh epoch token
    const postRestoreQr = await request(app)
      .post('/api/households/hh_seed_zw_01/qr-issue')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        baseQrToken: 'job-demo',
        ttlSeconds: 1,
      });
    expect(postRestoreQr.status).toBe(201);
    const freshShortToken = postRestoreQr.body.item.token as string;
    await new Promise((resolve) => setTimeout(resolve, 1150));
    const expiredRedirect = await request(app).get(`/r/${freshShortToken}`);
    expect(expiredRedirect.status).toBe(403);
    const earlierExpired = await request(app).get(`/r/${expiringToken}`);
    expect(earlierExpired.status).toBe(403);

    // Verify immutable consent audit history captured withdrawal + explicit restore
    const histRes = await request(app)
      .get('/api/households/hh_seed_zw_01/consent-history')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(histRes.status).toBe(200);
    expect(
      histRes.body.items.some((e: { action: string }) => e.action === 'CONSENT_WITHDRAWN_BUNDLED')
    ).toBe(true);
    expect(
      histRes.body.items.some((e: { action: string }) => e.action === 'CONSENT_RESTORED_EXPLICIT')
    ).toBe(true);
  });

  it('disables demo/prototype seed accounts, .demo registrations, persisted demo sessions, and seed household PINs when NODE_ENV=production', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prodRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-prod-demo-gate-'));

    try {
      // 1. Simulate pre-existing dev store containing demo accounts + an active dev session
      const preSeedStore = new EdisonPrototypeStore({ dataDir: path.join(prodRoot, 'seeded') });
      const devViewerSession = preSeedStore.loginUser('viewer@edison.demo', 'EdisonViewer!2026');
      expect(devViewerSession.user.email).toBe('viewer@edison.demo');

      // 2. Switch runtime to NODE_ENV=production
      process.env.NODE_ENV = 'production';

      // Fresh production store must initialize with ZERO demo users or prototype households
      const freshProdStore = new EdisonPrototypeStore({ dataDir: path.join(prodRoot, 'fresh') });
      const freshProdApp = createEdisonApp(freshProdStore, {
        uploadsDir: path.join(prodRoot, 'uploads-fresh'),
      });
      const freshSeedAttempt = await request(freshProdApp).post('/api/auth/login').send({
        email: 'viewer@edison.demo',
        password: 'EdisonViewer!2026',
      });
      expect(freshSeedAttempt.status).toBe(403);

      // Even if a pre-seeded dev store file exists, production refuses all demo account logins
      const prodApp = createEdisonApp(preSeedStore, {
        uploadsDir: path.join(prodRoot, 'uploads-seeded'),
      });

      for (const creds of [
        { email: 'viewer@edison.demo', password: 'EdisonViewer!2026' },
        { email: 'advertiser@edison.demo', password: 'EdisonProto!2026' },
        { email: 'employer@edison.demo', password: 'EdisonProto!2026' },
        { email: 'admin@edison.demo', password: 'EdisonAdmin!2026' },
      ]) {
        const res = await request(prodApp).post('/api/auth/login').send(creds);
        expect(res.status).toBe(403);
        expect(res.body.token).toBeUndefined();
      }

      // Pre-existing dev session token for demo account is rejected in production
      const staleDemoMe = await request(prodApp)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${devViewerSession.session.token}`);
      expect(staleDemoMe.status).toBe(200);
      expect(staleDemoMe.body.user).toBeNull();

      const staleDemoHouseholds = await request(prodApp)
        .get('/api/households')
        .set('Authorization', `Bearer ${devViewerSession.session.token}`);
      expect(staleDemoHouseholds.status).toBe(401);

      // Self-registering a reserved .demo email is rejected in production
      const demoRegisterBlocked = await request(prodApp).post('/api/auth/register').send({
        email: 'rogue@edison.demo',
        password: 'StrongPassword123',
        name: 'Rogue Demo',
        organisationName: 'Rogue',
        role: 'household_viewer',
      });
      expect(demoRegisterBlocked.status).toBe(403);

      // Legitimate non-demo household account works normally in production while seed household hh_seed_zw_01 stays blocked
      const realRegister = await request(prodApp).post('/api/auth/register').send({
        email: 'tatenda.mupfumi@example.org',
        password: 'StrongPassword123',
        name: 'Tatenda Mupfumi',
        organisationName: 'Mupfumi Household',
        role: 'household_viewer',
      });
      expect(realRegister.status).toBe(201);
      const realToken = realRegister.body.token as string;

      const seedHouseholdBlocked = await request(prodApp)
        .get('/api/households/hh_seed_zw_01')
        .set('Authorization', `Bearer ${realToken}`);
      expect(seedHouseholdBlocked.status).toBe(403);

      const createRealHh = await request(prodApp)
        .post('/api/households')
        .set('Authorization', `Bearer ${realToken}`)
        .send({
          householdLabel: 'Mupfumi Production ZW TV',
          tvDeviceLabel: 'Living Room Smart TV',
          location: {
            countryCode: 'ZW',
            provinceOrRegion: 'Harare Metropolitan',
            metroArea: 'Greater Harare',
            cityOrTown: 'Harare',
            district: 'Harare Urban',
            suburbOrArea: 'Avondale',
            exactInstallationLocation: '22 Cork Road, Avondale',
          },
          commercialConsentGranted: true,
        });
      expect(createRealHh.status).toBe(201);
      expect(createRealHh.body.item.consentEpoch).toBe(1);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      fs.rmSync(prodRoot, { recursive: true, force: true });
    }
  });
});
