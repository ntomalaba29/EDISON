import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('EDISON Non-Consent API & Domain Regression Suite (Block P2-V2.3)', () => {
  let tempRoot: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  let adminToken = '';
  let advertiserToken = '';
  let submitterToken = '';

  // Minimal valid 16+ byte PNG payload for upload security verification
  const VALID_PNG_B64 =
    'data:image/png;base64,' +
    Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]).toString('base64');

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-v23-test-'));
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
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('enforces auth/RBAC, blocks admin self-registration, and strips password hashes', async () => {
    const unauth = await request(app).get('/api/campaigns');
    expect(unauth.status).toBe(401);

    const forbidAdmin = await request(app)
      .get('/api/admin/moderation-overview')
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(forbidAdmin.status).toBe(403);

    const badSelfAdmin = await request(app).post('/api/auth/register').send({
      email: 'rogue@example.org',
      password: 'StrongPassword123',
      name: 'Rogue Admin',
      organisationName: 'Rogue',
      role: 'admin',
    });
    expect(badSelfAdmin.status).toBe(400);

    const reg = await request(app).post('/api/auth/register').send({
      email: 'fresh.advertiser@example.org',
      password: 'StrongPassword123',
      name: 'Fresh Advertiser',
      organisationName: 'Fresh Co',
      role: 'advertiser',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user.role).toBe('advertiser');
    expect(reg.body.user.passwordHash).toBeUndefined();
    expect(reg.body.token).toMatch(/^sess_/);
  });

  it('serves direct HTTP 302 QR redirects with real-measured bot & 5s-dedup tags without inflating Stage 7', async () => {
    const createQr = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        label: 'Regression QR Link',
        destinationType: 'website',
        rawInput: 'https://example.org/edison-regression-target',
      });
    expect(createQr.status).toBe(201);
    const token: string = createQr.body.item.token;

    // 1. Human-like redirect request -> HTTP 302 straight to destination
    const humanHit1 = await request(app)
      .get(`/r/${token}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15');
    expect(humanHit1.status).toBe(302);
    expect(humanHit1.headers.location).toBe('https://example.org/edison-regression-target');

    // 2. Immediate repeat within 5s -> still returns 302 but tagged deduplicated
    const humanHit2 = await request(app)
      .get(`/r/${token}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15');
    expect(humanHit2.status).toBe(302);

    // 3. Prefetch / link previewer -> tagged suspected bot
    const botHit = await request(app)
      .get(`/r/${token}`)
      .set('User-Agent', 'WhatsApp/2.24')
      .set('Sec-Purpose', 'prefetch');
    expect(botHit.status).toBe(302);

    const qrList = await request(app)
      .get('/api/qr')
      .set('Authorization', `Bearer ${advertiserToken}`);
    const saved = qrList.body.items.find((q: { token: string }) => q.token === token);
    expect(saved.redirectRequestsTotal).toBe(3);
    expect(saved.redirectIssuedTotal).toBe(3);
    expect(saved.suspectedBotRequests).toBe(1);
    expect(saved.deduplicatedNonBotRedirects).toBe(1);

    // Disabled QR returns 410 and unknown returns 404
    const disableRes = await request(app)
      .patch(`/api/qr/${token}/status`)
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({ status: 'disabled' });
    expect(disableRes.status).toBe(200);

    const disabledRedirect = await request(app).get(`/r/${token}`);
    expect(disabledRedirect.status).toBe(410);

    const missingRedirect = await request(app).get('/r/nonexistent-token-xyz');
    expect(missingRedirect.status).toBe(404);
  });

  it('enforces $0.00 / FREE Charity lock across creation/update and 10-state campaign transitions', async () => {
    const charityCmp = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${submitterToken}`)
      .send({
        title: 'National Nursing Bursary Broadcast',
        contentCategory: 'opportunity_promotion',
        summary: 'Zero-fee bursary announcement for regional healthcare trainees.',
        qrToken: 'job-demo',
        durationSeconds: 30,
        dailyFrequencyCap: 10,
        targetRegions: ['United Kingdom · National', 'Ireland · Metro'],
        dayparts: ['primetime', 'all_day'],
        startDate: '2026-12-01',
        endDate: '2026-12-30',
      });
    expect(charityCmp.status).toBe(201);
    const charityEst = charityCmp.body.item.simulatedEstimate;
    expect(charityEst.model).toBe('charity_free_zero_cost');
    expect(charityEst.estimatedTotalUsd).toBe(0);
    expect(charityEst.estimatedRatePerSpotUsd).toBe(0);
    expect(charityEst.paymentCollectionActive).toBe(false);

    // Updating a commercial campaign to opportunity_promotion recalculates strictly to $0.00
    const commCmp = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        title: 'Winter Appliances Promotion',
        contentCategory: 'commercial_advertising',
        summary: 'Direct commercial retail promotion with verified QR destination.',
        qrToken: 'edison-demo',
        durationSeconds: 20,
        dailyFrequencyCap: 3,
        targetRegions: ['United Kingdom · National'],
        dayparts: ['daytime'],
        startDate: '2026-12-01',
        endDate: '2026-12-10',
      });
    expect(commCmp.status).toBe(201);
    expect(commCmp.body.item.simulatedEstimate.estimatedTotalUsd).toBeGreaterThan(0);
    expect(commCmp.body.item.simulatedEstimate.paymentCollectionActive).toBe(false);

    // Invalid jump: draft -> active directly must fail
    const badJump = await request(app)
      .post(`/api/campaigns/${commCmp.body.item.id}/transition`)
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({ targetStatus: 'active' });
    expect(badJump.status).toBe(400);

    // Non-admin cannot self-approve a campaign
    const badSelfApprove = await request(app)
      .post(`/api/campaigns/${commCmp.body.item.id}/transition`)
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({ targetStatus: 'approved' });
    expect(badSelfApprove.status).toBe(403);
  });

  it('supports validated uploads, Text-Only Commercial ads, decoded_mismatch locking, and Pre-Submit Gate', async () => {
    // Reject SVG XSS disguised upload
    const svgRes = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        declaredKind: 'image',
        dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64'),
      });
    expect(svgRes.status).toBe(400);

    // Accept valid PNG magic bytes
    const pngRes = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({ declaredKind: 'image', dataBase64: VALID_PNG_B64 });
    expect(pngRes.status).toBe(201);
    expect(pngRes.body.mimeType).toBe('image/png');

    // Create a campaign to test Text-Only commercial mode & Pre-Submit Gate
    const cmpRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        title: 'Text-Only Commercial TV Card Test',
        contentCategory: 'commercial_advertising',
        summary: 'Local plumbing service commercial displayed without custom artwork.',
        qrToken: 'edison-demo',
        durationSeconds: 15,
        dailyFrequencyCap: 2,
        targetRegions: ['United Kingdom · South East'],
        dayparts: ['daytime'],
        startDate: '2026-12-05',
        endDate: '2026-12-12',
      });
    expect(cmpRes.status).toBe(201);
    const cmpId: string = cmpRes.body.item.id;

    // Gate blocks before creative is attached
    const gateBefore = await request(app)
      .get(`/api/campaigns/${cmpId}/preview-gate`)
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(gateBefore.status).toBe(200);
    expect(gateBefore.body.gate.readyToSubmit).toBe(false);

    // Save Text-Only Commercial Creative attached to the campaign (zero media URL required)
    const textOnlyRes = await request(app)
      .post('/api/ad-creatives')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        campaignId: cmpId,
        qrToken: 'edison-demo',
        title: 'Thames Plumbing 24/7 Text Spot',
        mode: 'text_only_commercial',
        displayDurationSeconds: 15,
        safeZoneWarnings: [],
        contrastWarnings: [],
        textOnly: {
          advertiserName: 'Thames Valley Plumbing Ltd',
          headline: '24/7 Emergency Boiler & Leak Repairs',
          messageBody: 'Fixed call-out rate across Reading and Oxford. Scan QR to book today.',
          contactInfo: '+44 118 496 0100',
          backgroundColor: '#0F172A',
          accentColor: '#F59E0B',
          textColor: '#FFFFFF',
          qrPlacement: 'bottom_right',
        },
      });
    expect(textOnlyRes.status).toBe(201);
    expect(textOnlyRes.body.item.status).toBe('ready_for_preview');
    expect(textOnlyRes.body.item.mode).toBe('text_only_commercial');

    const gateReady = await request(app)
      .get(`/api/campaigns/${cmpId}/preview-gate`)
      .set('Authorization', `Bearer ${advertiserToken}`);
    expect(gateReady.status).toBe(200);
    expect(gateReady.body.gate.readyToSubmit).toBe(true);

    // Option B with decoded_mismatch forces flagged_for_review and admin cannot clear mismatch flag
    const mismatchCreative = await request(app)
      .post('/api/ad-creatives')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        title: 'Mismatched External Poster',
        mode: 'option_b_upload',
        qrToken: 'edison-demo',
        displayDurationSeconds: 15,
        safeZoneWarnings: [],
        contrastWarnings: [],
        optionB: {
          mediaKind: 'image',
          fileUrl: pngRes.body.fileUrl,
          originalFileName: 'poster.png',
          mimeType: 'image/png',
          fileSizeBytes: pngRes.body.fileSizeBytes,
          widthPx: 1920,
          heightPx: 1080,
          aspectRatioLabel: '16:9',
          aspectRatioValid: true,
          durationSeconds: null,
          hasAudioTrack: false,
          audioNotice: 'Static image',
          qrInspectionStatus: 'decoded_mismatch',
          decodedQrPayload: 'https://different-destination.example.org',
          qrOverlayConfirmed: false,
          qrOverlayCorner: 'bottom_right',
          requiresAdminReviewFlag: true,
          contentAttested: true,
          validationWarnings: [],
          validationErrors: [],
        },
      });
    expect(mismatchCreative.status).toBe(201);
    expect(mismatchCreative.body.item.status).toBe('flagged_for_review');

    const clearAttempt = await request(app)
      .post(`/api/admin/creatives/${mismatchCreative.body.item.id}/clear-qr-flag`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Attempting to override mismatch should fail' });
    expect(clearAttempt.status).toBe(400);
  });

  it('enforces Opportunity scam blocking, non-transitive 3-tier verification, expiry, complaints, and appeals', async () => {
    const categoriesRes = await request(app)
      .get('/api/opportunities')
      .set('Authorization', `Bearer ${submitterToken}`);
    expect(categoriesRes.status).toBe(200);
    expect(categoriesRes.body.categories).toHaveLength(14);

    // Scam / fee-charging / guaranteed-job phrases must be rejected
    const scamOpp = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${submitterToken}`)
      .send({
        providerType: 'registered_organisation',
        providerName: 'Shady Agency',
        category: 'permanent_employment',
        title: 'Warehouse Role — Guaranteed Job',
        description: 'Applicants must send an application fee before interview scheduling.',
        location: 'London, UK',
        eligibilityRequirements: 'Open to all',
        applicationMethod: 'Pay processing fee via QR',
        contactInfo: 'scam@example.org',
        qrToken: 'job-demo',
        closingDate: '2027-02-01',
        expiryDate: '2027-02-10',
        identityEvidenceRef: 'ID-99',
        organisationEvidenceRef: 'ORG-99',
        specificOpportunityEvidenceRef: 'VAC-99',
        applicationFeeFreeConfirmed: true,
        noGuaranteeConfirmed: true,
      });
    expect(scamOpp.status).toBe(400);

    // Legitimate individual/informal employer opportunity
    const oppCreate = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${submitterToken}`)
      .send({
        providerType: 'individual_informal_employer',
        providerName: 'Maria Gomez Carpentry',
        category: 'apprenticeship',
        title: 'Workshop Joinery Trainee (12 Months)',
        description: 'Hands-on carpentry trainee placement with paid weekly allowance and tool kit provided free.',
        location: 'Bristol, United Kingdom',
        eligibilityRequirements: 'Aged 18+, reliable workshop attendance.',
        applicationMethod: 'Free application via EDISON QR portal.',
        contactInfo: 'maria.carpentry@example.org',
        qrToken: 'job-demo',
        closingDate: '2027-03-01',
        expiryDate: '2027-03-15',
        identityEvidenceRef: 'PASSPORT-REF-MG-2026',
        organisationEvidenceRef: '',
        specificOpportunityEvidenceRef: 'SIGNED-WORKSHOP-INTAKE-2026',
        applicationFeeFreeConfirmed: true,
        noGuaranteeConfirmed: true,
      });
    expect(oppCreate.status).toBe(201);
    const oppId: string = oppCreate.body.item.id;
    expect(oppCreate.body.item.advertisingFeeInfluencesVerification).toBe(false);
    expect(oppCreate.body.item.verificationTiers.organisationStatus).toBe('not_applicable');

    const submitOpp = await request(app)
      .post(`/api/opportunities/${oppId}/submit`)
      .set('Authorization', `Bearer ${submitterToken}`);
    expect(submitOpp.status).toBe(200);
    expect(submitOpp.body.item.status).toBe('submitted');

    // Non-Transitivity: Verifying Tier 1 without verifying Tier 3 cannot publish verified_live
    const partialVerify = await request(app)
      .patch(`/api/admin/opportunities/${oppId}/verify-tiers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        identityStatus: 'verified',
        identityNotes: 'ID confirmed.',
        targetStatus: 'verified_live',
      });
    expect(partialVerify.status).toBe(400);

    // Now verify Tier 3 independently -> publishes verified_live
    const fullVerify = await request(app)
      .patch(`/api/admin/opportunities/${oppId}/verify-tiers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        specificOpportunityStatus: 'verified',
        specificOpportunityNotes: 'Independent placement confirmation reviewed.',
        targetStatus: 'verified_live',
      });
    expect(fullVerify.status).toBe(200);
    expect(fullVerify.body.item.status).toBe('verified_live');

    // Complaint -> Admin suspends opportunity -> Owner files appeal -> Admin reinstates to under_review
    const complaintRes = await request(app)
      .post(`/api/opportunities/${oppId}/complaints`)
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        reasonCategory: 'broken_or_wrong_qr',
        description: 'Testing complaint workflow when external form momentarily timed out.',
      });
    expect(complaintRes.status).toBe(201);

    const suspendRes = await request(app)
      .patch(`/api/admin/opportunity-complaints/${complaintRes.body.item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
        resolutionNotes: 'Suspended pending external portal uptime confirmation.',
      });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.opportunity.status).toBe('suspended');

    const appealRes = await request(app)
      .post(`/api/opportunities/${oppId}/appeals`)
      .set('Authorization', `Bearer ${submitterToken}`)
      .send({
        reason: 'External portal SSL certificate renewed and uptime verified.',
        additionalEvidence: 'UPTIME-LOG-2026-11-15',
      });
    expect(appealRes.status).toBe(201);

    const reinstateRes = await request(app)
      .patch(`/api/admin/opportunity-appeals/${appealRes.body.item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'upheld_reinstated',
        adminNotes: 'Moved back to under_review for fresh verification check.',
      });
    expect(reinstateRes.status).toBe(200);
    expect(reinstateRes.body.opportunity.status).toBe('under_review');
  });

  it('keeps 6-Stream Revenue Ledger, 7-Stage Analytics Provenance, Simulator Scheduler & QA Invariants strictly honest', async () => {
    // 1. Alternating Break Scheduler via API (80s total - 5s buffer = 75s usable -> full 4 alternating slots)
    const breakRes = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestedBreakDurationSeconds: 80,
        safetyBufferSeconds: 5,
        requestedSlotCount: 4,
        alternatingPointerStart: 'CHARITY',
        allowMockBackfill: true,
      });
    expect(breakRes.status).toBe(200);
    expect(breakRes.body.plan.skipped).toBe(false);
    expect(breakRes.body.plan.slots.map((s: { primaryCategory: string }) => s.primaryCategory)).toEqual([
      'CHARITY',
      'COMMERCIAL',
      'CHARITY',
      'COMMERCIAL',
    ]);

    const shortBreakSkip = await request(app)
      .post('/api/simulator/schedule-break')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestedBreakDurationSeconds: 12,
        safetyBufferSeconds: 5,
        requestedSlotCount: 4,
        alternatingPointerStart: 'CHARITY',
      });
    expect(shortBreakSkip.status).toBe(200);
    expect(shortBreakSkip.body.plan.skipped).toBe(true);
    expect(shortBreakSkip.body.plan.slots).toHaveLength(0);

    // 2. Simulated backfill telemetry stays strictly separated from real cash / confirmed payouts
    const simBackfill = await request(app)
      .post('/api/simulator/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ eventType: 'ad_network_backfill_simulated' });
    expect(simBackfill.status).toBe(201);
    expect(simBackfill.body.event.measurementSource).toBe('simulated_prototype');

    const ledgerRes = await request(app)
      .get('/api/analytics/revenue-ledger')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.ledger.paymentCollectionActive).toBe(false);
    expect(ledgerRes.body.ledger.gamCtvAccountConfigured).toBe(false);
    expect(ledgerRes.body.ledger.streams).toHaveLength(6);
    expect(ledgerRes.body.ledger.totals.adNetworkEstimatedMockUsd).toBe(1.8);
    expect(ledgerRes.body.ledger.totals.adNetworkConfirmedUsd).toBe(0);
    expect(ledgerRes.body.ledger.totals.actualCashReceivedUsd).toBe(0);
    expect(ledgerRes.body.ledger.totals.refundAdjustmentsUsd).toBe(0);

    // 3. 7-Stage Funnel isolates real 302s from Stage 7 destination_opened (stays 0)
    const funnelRes = await request(app)
      .get('/api/analytics/funnel')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(funnelRes.status).toBe(200);
    expect(funnelRes.body.stages).toHaveLength(7);
    const stage6 = funnelRes.body.stages.find((s: { stageNumber: number }) => s.stageNumber === 6);
    const stage7 = funnelRes.body.stages.find((s: { stageNumber: number }) => s.stageNumber === 7);
    expect(stage6.measurementSource).toBe('real_measured');
    expect(stage6.rawCount).toBeGreaterThanOrEqual(3);
    expect(stage7.measurementSource).toBe('unverified_in_prototype');
    expect(stage7.rawCount).toBe(0);

    // 4. QA Prototype Readiness invariants pass with honest PENDING_OWNER_DEVICE_TEST
    const qaRes = await request(app)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsPassed).toBe(qaRes.body.automatedInvariantsTotal);
    expect(qaRes.body.automatedInvariantsTotal).toBeGreaterThanOrEqual(11);
    expect(qaRes.body.physicalQrScanStatus).toBe('PENDING_OWNER_DEVICE_TEST');

    // 5. Docs allowlist serves all 25 governance documents & blocks traversal
    const docsRes = await request(app).get('/api/docs');
    expect(docsRes.status).toBe(200);
    expect(docsRes.body.items).toHaveLength(25);
  });

  it('serves Shared Ad Intelligence Prototype Preview API with Zero-PII enforcement, quorum gating, rollback & 85% progress', async () => {
    const unauth = await request(app).get('/api/shared-intelligence/preview');
    expect(unauth.status).toBe(401);

    const previewGet = await request(app)
      .get('/api/shared-intelligence/preview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(previewGet.status).toBe(200);
    expect(previewGet.body.isPrototypeSimulation).toBe(true);
    expect(previewGet.body.zeroPiiEnforced).toBe(true);
    expect(previewGet.body.bundles).toHaveLength(3);

    // Reject PII payload cleanly with HTTP 400
    const piiReject = await request(app)
      .post('/api/shared-intelligence/observations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tvDeviceId: 'sim_tv_api_pii',
        scopeId: previewGet.body.bundles[0].scope.scopeId,
        signalType: 'scte35',
        estimatedBreakDurationSec: 95,
        transitionLatencyMs: 380,
        householdId: 'forbidden_household_id',
      });
    expect(piiReject.status).toBe(400);

    // Corroborate quorum (3/3) and verify automatic rollback on FPR spike
    const promo = await request(app)
      .post('/api/shared-intelligence/simulate-action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'corroborate_quorum',
        scopeId: previewGet.body.bundles[0].scope.scopeId,
      });
    expect(promo.status).toBe(200);
    expect(promo.body.state.bundles[0].version).toBe(4);
    expect(promo.body.state.rejectedPiiAttemptCount).toBe(1);

    const rollback = await request(app)
      .post('/api/shared-intelligence/simulate-action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'simulate_fpr_spike_rollback',
        scopeId: previewGet.body.bundles[0].scope.scopeId,
      });
    expect(rollback.status).toBe(200);
    expect(rollback.body.state.bundles[0].status).toBe('rolled_back');
    expect(rollback.body.state.bundles[0].version).toBe(3);

    const liveReport = await request(app).get('/api/reports/live');
    expect(liveReport.status).toBe(200);
    expect(liveReport.body.progressMetrics.aiStudioAssignmentPct).toBe(100);
    expect(liveReport.body.progressMetrics.overallFullAppPct).toBe(85);
    expect(liveReport.body.progressMetrics.consentBlockedScopePct).toBe(0);
  });
});

