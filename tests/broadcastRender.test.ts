import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  compileBroadcastRenderJob,
  computeWcagContrastRatio,
  runBroadcastRenderVerificationSuite,
} from '../src/server/broadcastRenderEngine.ts';
import { CSRF_COOKIE_NAME } from '../src/server/security.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import type { AdCreativeRecord, QrLinkRecord } from '../src/types/edison.ts';

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

describe('Phase 8 Block 8.1 — Broadcast Rendering Validation, EBU R128 & QR Vision Gate', () => {
  let tempRoot: string;
  let dataDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-p81-rnd-'));
    dataDir = path.join(tempRoot, 'data');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir: path.join(tempRoot, 'uploads') });
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('passes all 8 deterministic Block 8.1 broadcast render checks with ffmpegBinaryExecuted=false', () => {
    const report = runBroadcastRenderVerificationSuite();
    expect(report.totalChecks).toBe(8);
    expect(report.passedChecks).toBe(8);
    expect(report.allPassed).toBe(true);
    expect(report.ffmpegBinaryExecuted).toBe(false);
    expect(report.isSoftwareSimulationOnly).toBe(true);
    expect(report.hardwareTested).toBe(false);
    expect(report.stageP6Deferred).toBe(true);
  });

  it('computes accurate WCAG contrast ratio and flags undersized QR blocks without silent overwrite', () => {
    expect(computeWcagContrastRatio('#0f172a', '#ffffff')).toBeGreaterThanOrEqual(15);
    expect(computeWcagContrastRatio('#94a3b8', '#cbd5e1')).toBeLessThan(4.5);

    const qrLink: QrLinkRecord = {
      token: 'qr-small',
      ownerId: 'usr_adv_01',
      label: 'Test',
      destinationType: 'website',
      rawInput: 'https://edison.demo/small',
      resolvedUrl: 'https://edison.demo/small',
      resolvedHost: 'edison.demo',
      scheme: 'https',
      status: 'active',
      redirectRequestsTotal: 0,
      redirectIssuedTotal: 0,
      suspectedBotRequests: 0,
      deduplicatedNonBotRedirects: 0,
      lastRedirectRequestedAt: null,
      createdAt: '2026-11-16T08:00:00.000Z',
    };

    const smallQrCreative: AdCreativeRecord = {
      id: 'crt_small_qr',
      ownerId: 'usr_adv_01',
      campaignId: null,
      qrToken: 'qr-small',
      title: 'Small QR Spot',
      mode: 'option_a_studio',
      displayDurationSeconds: 15,
      safeZoneWarnings: [],
      contrastWarnings: [],
      optionA: {
        templateId: 'commercial_offer',
        backgroundColor: '#0f172a',
        gradientEndColor: '#1e293b',
        useGradient: false,
        accentColor: '#38bdf8',
        textColor: '#ffffff',
        scrimOpacity: 0.4,
        logoUrl: null,
        productImageUrl: null,
        backgroundImageUrl: null,
        heading: 'Readable Headline',
        description: 'Clear offer description',
        promoText: 'Offer',
        priceOrValue: '$20',
        contactDetails: 'sales@edison.demo',
        websiteAddress: 'edison.demo',
        callToAction: 'Scan QR',
        qrPlacement: 'bottom_right',
        elements: [
          {
            id: 'el_qr_tiny',
            kind: 'qr_block',
            label: 'Tiny QR',
            xPct: 80,
            yPct: 60,
            widthPct: 8,
            heightPct: 16,
            zIndex: 5,
            fontSizePx: 12,
            visible: true,
          },
        ],
      },
      optionB: null,
      textOnly: null,
      status: 'ready_for_preview',
      isPrototypeSeed: false,
      createdAt: '2026-11-16T08:00:00.000Z',
      updatedAt: '2026-11-16T08:00:00.000Z',
    };

    const job = compileBroadcastRenderJob({
      creative: smallQrCreative,
      qrLink,
      resolutionProfile: '1080p_fhd',
    });
    expect(job.renderStatus).toBe('BLOCKED_FAILED_VALIDATION');
    expect(job.issues.some((i) => i.code === 'QR_SIZE_TOO_SMALL')).toBe(true);
    expect(job.qrVisionGate.silentOverwriteBlocked).toBe(true);
  });

  it('enforces auth (401), CSRF cookie guard (403), cross-owner isolation (403), Zod validation (400), and passes 23/23 QA invariants', async () => {
    // 1. Unauthenticated POST without CSRF fails 403; invalid Bearer fails 401
    const noCsrfCompile = await request(app)
      .post('/api/render/validate-and-compile')
      .send({ creativeId: 'crt_seed_01' });
    expect(noCsrfCompile.status).toBe(403);

    const invalidBearerCompile = await request(app)
      .post('/api/render/validate-and-compile')
      .set('Authorization', 'Bearer invalid_token_123')
      .send({ creativeId: 'crt_seed_01' });
    expect(invalidBearerCompile.status).toBe(401);

    const noCsrfSuite = await request(app).post('/api/render/verify-suite').send({});
    expect(noCsrfSuite.status).toBe(403);

    const invalidBearerSuite = await request(app)
      .post('/api/render/verify-suite')
      .set('Authorization', 'Bearer invalid_token_123')
      .send({});
    expect(invalidBearerSuite.status).toBe(401);

    // 2. Login as advertiser with cookie jar + CSRF
    const advAgent = request.agent(app);
    const advLogin = await advAgent.post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(advLogin.status).toBe(200);
    const advCsrf =
      extractCookieValue(advLogin.headers['set-cookie'], CSRF_COOKIE_NAME) ||
      (advLogin.body.csrfToken as string);

    // Cookie-authenticated POST without CSRF fails 403
    const missingCsrf = await advAgent
      .post('/api/render/verify-suite')
      .send({});
    expect(missingCsrf.status).toBe(403);

    // Strict Zod rejects unknown key
    const badSchema = await advAgent
      .post('/api/render/validate-and-compile')
      .set('X-CSRF-Token', advCsrf)
      .send({ creativeId: 'crt_seed_01', resolutionProfile: '8k_ultra' });
    expect(badSchema.status).toBe(400);

    // Run 8/8 verify suite cleanly
    const suiteRes = await advAgent
      .post('/api/render/verify-suite')
      .set('X-CSRF-Token', advCsrf)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.report.passedChecks).toBe(8);
    expect(suiteRes.body.report.allPassed).toBe(true);
    expect(suiteRes.body.report.ffmpegBinaryExecuted).toBe(false);

    // List advertiser creatives and compile 4K UHD blueprint for owned creative
    const listRes = await advAgent.get('/api/ad-creatives');
    expect(listRes.status).toBe(200);
    const ownedCreativeId = listRes.body.items[0].id as string;

    const compileRes = await advAgent
      .post('/api/render/validate-and-compile')
      .set('X-CSRF-Token', advCsrf)
      .send({ creativeId: ownedCreativeId, resolutionProfile: '4k_uhd' });
    expect(compileRes.status).toBe(200);
    expect(compileRes.body.job.creativeId).toBe(ownedCreativeId);
    expect(compileRes.body.job.targetDimensions.width).toBe(3840);
    expect(compileRes.body.job.ffmpegBinaryExecuted).toBe(false);
    expect(compileRes.body.job.manifestSha256).toHaveLength(64);

    // Cross-owner isolation: employer/submitter cannot validate advertiser creative
    const subLogin = await request(app).post('/api/auth/login').send({
      email: 'employer@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(subLogin.status).toBe(200);
    const crossOwner = await request(app)
      .post('/api/render/validate-and-compile')
      .set('Authorization', `Bearer ${subLogin.body.token}`)
      .send({ creativeId: ownedCreativeId, resolutionProfile: '1080p_fhd' });
    expect(crossOwner.status).toBe(403);

    // Admin QA readiness & live report confirm 23/23 automated invariants and 60.0% Full App progress
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);

    const qaRes = await request(app)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsTotal).toBe(34);
    expect(qaRes.body.automatedInvariantsPassed).toBe(34);

    const liveRes = await request(app).get('/api/reports/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.progressMetrics.executionSubphasePct).toBe(77.8);
    expect(liveRes.body.progressMetrics.remainingExecutionSubphasePct).toBe(22.2);
    expect(liveRes.body.progressMetrics.trackBStatus).toBe('COMMITTED');
  });
});
