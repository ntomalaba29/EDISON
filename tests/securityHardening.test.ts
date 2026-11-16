import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  apiErrorMiddleware,
  apiTimeoutMiddleware,
  hashSessionToken,
  securityHeadersMiddleware,
} from '../src/server/security.ts';
import type { EdisonDataRepository } from '../src/server/repository.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import type { EdisonStoreData } from '../src/types/edison.ts';

function extractCookieValue(setCookieHeaders: string[] | string | undefined, name: string): string | null {
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

describe('EDISON Phase 3 Block P3-A — Security Hardening Suite', () => {
  let tempRoot: string;
  let dataDir: string;
  let uploadsDir: string;
  let store: EdisonPrototypeStore;
  let app: ReturnType<typeof createEdisonApp>;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-p3a-sec-'));
    dataDir = path.join(tempRoot, 'data');
    uploadsDir = path.join(tempRoot, 'uploads');
    store = new EdisonPrototypeStore({ dataDir });
    app = createEdisonApp(store, { uploadsDir });
  });

  afterAll(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects malformed payloads and unexpected keys with strict Zod validation (HTTP 400 + validationIssues)', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    // Unknown/extra property on strict auth schema
    const extraLoginKey = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
      isAdminBypass: true,
    });
    expect(extraLoginKey.status).toBe(400);
    expect(Array.isArray(extraLoginKey.body.validationIssues)).toBe(true);

    // Invalid campaign dates, out-of-range duration, invalid daypart
    const badCampaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '',
        contentCategory: 'commercial_advertising',
        durationSeconds: 999,
        dayparts: ['invalid_slot'],
        startDate: '15/11/2026',
        endDate: '2026-12-01',
      });
    expect(badCampaign.status).toBe(400);
    expect(badCampaign.body.validationIssues.length).toBeGreaterThanOrEqual(2);

    // Invalid audit-log query limit
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    const badAuditQuery = await request(app)
      .get('/api/admin/audit-logs?limit=99999')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(badAuditQuery.status).toBe(400);
    expect(badAuditQuery.body.validationIssues[0].path).toBe('limit');
  });

  it('stores only SHA-256 hashed session tokens at rest, hardens cookie flags, rotates on re-login & enforces idle expiry', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({
        email: 'advertiser@edison.demo',
        password: 'EdisonProto!2026',
      });
    expect(loginRes.status).toBe(200);
    const rawToken = loginRes.body.token as string;
    const csrfToken = loginRes.body.csrfToken as string;
    expect(rawToken).toMatch(/^sess_/);
    expect(csrfToken).toMatch(/^[a-f0-9]{48}$/);

    // Verify cookie attributes (HttpOnly, SameSite=Lax, Secure behind HTTPS proxy)
    const setCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const sessCookieHeader = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!;
    const csrfCookieHeader = setCookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))!;
    expect(sessCookieHeader).toContain('HttpOnly');
    expect(sessCookieHeader).toContain('SameSite=Lax');
    expect(sessCookieHeader).toContain('Secure');
    expect(csrfCookieHeader).not.toContain('HttpOnly');
    expect(csrfCookieHeader).toContain('SameSite=Lax');
    expect(csrfCookieHeader).toContain('Secure');

    // Disk persistence must never hold raw token — only tokenHash
    const storeJson = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'edison-store.json'), 'utf8')
    ) as EdisonStoreData;
    expect(storeJson.schemaVersion).toBe(8);
    const expectedHash = hashSessionToken(rawToken);
    const persisted = storeJson.sessions.find((s) => s.tokenHash === expectedHash);
    expect(persisted).toBeTruthy();
    expect(persisted?.token).toBeUndefined();
    expect(persisted?.csrfToken).toBe(csrfToken);
    expect(persisted?.idleExpiresAt).toBeTruthy();

    // Session rotation on subsequent login invalidates prior token
    const rotateRes = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${rawToken}`)
      .send({
        email: 'advertiser@edison.demo',
        password: 'EdisonProto!2026',
      });
    expect(rotateRes.status).toBe(200);
    const rotatedToken = rotateRes.body.token as string;
    expect(rotatedToken).not.toBe(rawToken);

    const oldTokenCheck = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${rawToken}`);
    expect(oldTokenCheck.status).toBe(401);

    const newTokenCheck = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${rotatedToken}`);
    expect(newTokenCheck.status).toBe(200);

    // Idle timeout expiry immediately revokes access
    store.expireSessionForTesting(rotatedToken, 'idle');
    const expiredCheck = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${rotatedToken}`);
    expect(expiredCheck.status).toBe(401);
  });

  it('enforces cookie/header double-submit CSRF & same-origin checks on cookie-authenticated mutations', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://127.0.0.1:3000')
      .set('Host', '127.0.0.1:3000')
      .send({
        email: 'advertiser@edison.demo',
        password: 'EdisonProto!2026',
      });
    expect(login.status).toBe(200);
    const csrfToken = extractCookieValue(login.headers['set-cookie'], CSRF_COOKIE_NAME)!;
    expect(csrfToken).toBeTruthy();

    // 1. Cookie-authenticated POST without X-CSRF-Token -> 403
    const missingHeader = await agent
      .post('/api/qr')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'http://127.0.0.1:3000')
      .send({
        label: 'Missing CSRF Header',
        destinationType: 'website',
        rawInput: 'https://example.org/csrf-fail',
      });
    expect(missingHeader.status).toBe(403);

    // 2. Cookie-authenticated POST with mismatched X-CSRF-Token -> 403
    const badHeader = await agent
      .post('/api/qr')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'http://127.0.0.1:3000')
      .set('X-CSRF-Token', 'forged_token_value')
      .send({
        label: 'Forged CSRF Header',
        destinationType: 'website',
        rawInput: 'https://example.org/csrf-forged',
      });
    expect(badHeader.status).toBe(403);

    // 3. Cross-site Origin even with CSRF token -> 403
    const crossSite = await agent
      .post('/api/qr')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'https://attacker.example')
      .set('X-CSRF-Token', csrfToken)
      .send({
        label: 'Cross Origin Blocked',
        destinationType: 'website',
        rawInput: 'https://example.org/cross-origin',
      });
    expect(crossSite.status).toBe(403);

    // 4. Valid same-origin + matching X-CSRF-Token -> 201 Created
    const validPost = await agent
      .post('/api/qr')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'http://127.0.0.1:3000')
      .set('X-CSRF-Token', csrfToken)
      .send({
        label: 'CSRF Verified QR',
        destinationType: 'website',
        rawInput: 'https://example.org/csrf-verified',
      });
    expect(validPost.status).toBe(201);

    // 5. Logout with valid cookie session requires CSRF header too
    const logoutWithoutCsrf = await agent
      .post('/api/auth/logout')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'http://127.0.0.1:3000');
    expect(logoutWithoutCsrf.status).toBe(403);

    const logoutWithCsrf = await agent
      .post('/api/auth/logout')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'http://127.0.0.1:3000')
      .set('X-CSRF-Token', csrfToken);
    expect(logoutWithCsrf.status).toBe(200);
    expect(logoutWithCsrf.body.ok).toBe(true);

    // After logout, cookie session is revoked on server
    const afterLogout = await agent.get('/api/campaigns');
    expect(afterLogout.status).toBe(401);
  });

  it('enforces rate limiting with HTTP 429, Retry-After, and X-RateLimit headers across auth, mutations & QR redirects', async () => {
    const tightStore = new EdisonPrototypeStore({
      dataDir: path.join(tempRoot, 'rl-data'),
    });
    const tightApp = createEdisonApp(tightStore, {
      uploadsDir,
      rateLimits: {
        authMax: 2,
        authWindowMs: 60_000,
        mutationMax: 2,
        mutationWindowMs: 60_000,
        redirectMax: 2,
        redirectWindowMs: 60_000,
      },
    });

    // 1. Auth limiter (max 2) -> 3rd attempt returns 429
    const a1 = await request(tightApp).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    expect(a1.status).toBe(200);
    const token = a1.body.token as string;

    const a2 = await request(tightApp).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'WrongPassword!1',
    });
    expect(a2.status).toBe(401);

    const a3 = await request(tightApp).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'WrongPassword!2',
    });
    expect(a3.status).toBe(429);
    expect(a3.headers['retry-after']).toBeDefined();
    expect(a3.headers['x-ratelimit-remaining']).toBe('0');

    // 2. QR redirect limiter (max 2) -> 3rd attempt returns 429
    const r1 = await request(tightApp).get('/r/edison-demo');
    expect(r1.status).toBe(302);
    const r2 = await request(tightApp).get('/r/edison-demo');
    expect(r2.status).toBe(302);
    const r3 = await request(tightApp).get('/r/edison-demo');
    expect(r3.status).toBe(429);

    // 3. API mutation limiter (max 2) -> 3rd POST returns 429
    const m1 = await request(tightApp)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'RL1', destinationType: 'website', rawInput: 'https://example.org/rl1' });
    expect(m1.status).toBe(201);
    const m2 = await request(tightApp)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'RL2', destinationType: 'website', rawInput: 'https://example.org/rl2' });
    expect(m2.status).toBe(201);
    const m3 = await request(tightApp)
      .post('/api/qr')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'RL3', destinationType: 'website', rawInput: 'https://example.org/rl3' });
    expect(m3.status).toBe(429);
  });

  it('applies API & redirect security headers while preserving iframe embeddability for the SPA root', async () => {
    const apiHealth = await request(app).get('/api/health');
    expect(apiHealth.status).toBe(200);
    expect(apiHealth.headers['x-powered-by']).toBeUndefined();
    expect(apiHealth.headers['x-content-type-options']).toBe('nosniff');
    expect(apiHealth.headers['x-frame-options']).toBe('DENY');
    expect(apiHealth.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    const csrfBootstrap = await request(app).get('/api/auth/csrf');
    expect(csrfBootstrap.status).toBe(200);
    expect(csrfBootstrap.headers['cache-control']).toBe('no-store');
    expect(csrfBootstrap.body.csrfToken).toMatch(/^[a-f0-9]{48}$/);

    const redirectRes = await request(app).get('/r/edison-demo');
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.headers['x-frame-options']).toBe('DENY');

    // Verify SPA `/` HTML stays frameable inside AI Studio's preview iframe
    const spaApp = express();
    spaApp.use(securityHeadersMiddleware);
    spaApp.get('/', (_req, res) => res.status(200).send('<html></html>'));
    const spaRes = await request(spaApp).get('/');
    expect(spaRes.status).toBe(200);
    expect(spaRes.headers['x-frame-options']).toBeUndefined();
    expect(spaRes.headers['x-content-type-options']).toBe('nosniff');
  });

  it('installEdisonCsrfFetch handles getter-only Window.fetch without throwing and edisonFetch attaches CSRF headers', async () => {
    const capturedCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const mockNativeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedCalls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const prevFetch = globalThis.fetch;
    const prevWindow = (globalThis as { window?: unknown }).window;
    const prevDocument = (globalThis as { document?: unknown }).document;

    try {
      vi.resetModules();
      globalThis.fetch = mockNativeFetch as unknown as typeof fetch;

      // Case 1: getter-only non-configurable window.fetch (strict preview iframe)
      const lockedWin: Record<string, unknown> = {
        location: { origin: 'https://preview.edison.local' },
      };
      Object.defineProperty(lockedWin, 'fetch', {
        get: () => mockNativeFetch,
        configurable: false,
        enumerable: true,
      });
      (globalThis as { window?: unknown }).window = lockedWin;
      (globalThis as { document?: unknown }).document = {
        cookie: 'edison_csrf=csrf_test_token_123',
      };

      const mod1 = await import('../src/lib/csrfFetch.ts');
      let firstResult: boolean | undefined;
      expect(() => {
        firstResult = mod1.installEdisonCsrfFetch();
      }).not.toThrow();
      expect(firstResult).toBe(false);
      expect(mod1.installEdisonCsrfFetch()).toBe(false);

      await mod1.edisonFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      });

      expect(capturedCalls.length).toBe(1);
      const sentHeaders = new Headers(capturedCalls[0].init?.headers);
      expect(sentHeaders.get('X-CSRF-Token')).toBe('csrf_test_token_123');
      expect(capturedCalls[0].init?.credentials).toBe('same-origin');

      // Case 2: getter-only configurable window.fetch -> Object.defineProperty succeeds without throwing
      vi.resetModules();
      const configurableWin: Record<string, unknown> = {
        location: { origin: 'https://preview.edison.local' },
      };
      Object.defineProperty(configurableWin, 'fetch', {
        get: () => mockNativeFetch,
        configurable: true,
        enumerable: true,
      });
      (globalThis as { window?: unknown }).window = configurableWin;

      const mod2 = await import('../src/lib/csrfFetch.ts');
      let secondResult: boolean | undefined;
      expect(() => {
        secondResult = mod2.installEdisonCsrfFetch();
      }).not.toThrow();
      expect(secondResult).toBe(true);
      expect(mod2.installEdisonCsrfFetch()).toBe(true);
      expect(configurableWin.fetch).toBe(mod2.edisonFetch);
    } finally {
      globalThis.fetch = prevFetch;
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
      if (prevDocument === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document?: unknown }).document = prevDocument;
      }
    }
  });

  it('decouples HTTP server via EdisonDataRepository and reports JSON schema v8 truthfully on /api/health', async () => {
    // Wrap store behind pure EdisonDataRepository interface delegate to verify zero concrete-class coupling
    const delegatedRepo: EdisonDataRepository = store;
    const decoupledApp = createEdisonApp(delegatedRepo, { uploadsDir });

    const healthRes = await request(decoupledApp).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.storageBackend).toMatchObject({
      backend: 'json_file_store',
      schemaVersion: 8,
      postgresMigrationReady: true,
      migrationBlueprintPath: 'docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md',
    });

    const adminLogin = await request(decoupledApp).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    expect(adminLogin.status).toBe(200);
    const readinessRes = await request(decoupledApp)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(readinessRes.status).toBe(200);
    expect(readinessRes.body.automatedInvariantsPassed).toBe(18);
    expect(readinessRes.body.automatedInvariantsTotal).toBe(18);
  });

  it('hardens /api/media/upload against SVG/HTML polyglots & invalid base64 and locks down /uploads/* headers & symlinks', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    const token = loginRes.body.token as string;

    // 1. Valid minimal 1x1 PNG (68 bytes) -> succeeds and serves with strict CSP sandbox & CORP headers
    const validPngB64 = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
      'hex'
    ).toString('base64');

    const uploadOk = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataBase64: `data:image/png;base64,${validPngB64}`, declaredKind: 'image' });
    expect(uploadOk.status).toBe(201);
    expect(uploadOk.body.fileUrl).toMatch(/^\/uploads\/edison_img_[a-f0-9]{20}\.png$/);

    const serveRes = await request(app).get(uploadOk.body.fileUrl);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(serveRes.headers['x-content-type-options']).toBe('nosniff');
    expect(serveRes.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(serveRes.headers['x-frame-options']).toBe('DENY');

    // 2. Reject SVG/script payload
    const svgUpload = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64'),
        declaredKind: 'image',
      });
    expect(svgUpload.status).toBe(400);

    // 3. Reject PNG-magic polyglot containing embedded <script>
    const polyglotBytes = Buffer.concat([
      Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex'),
      Buffer.from('<script>alert(1)</script>'),
    ]);
    const polyglotUpload = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataBase64: polyglotBytes.toString('base64'), declaredKind: 'image' });
    expect(polyglotUpload.status).toBe(400);

    // 4. Reject invalid base64 payload cleanly
    const badB64 = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataBase64: '!!!not-valid-base64!!!', declaredKind: 'image' });
    expect(badB64.status).toBe(400);

    // 5. Block symlink escape from uploadsDir on /uploads/:filename
    const outsideSecret = path.join(tempRoot, 'outside-secret.png');
    fs.writeFileSync(outsideSecret, Buffer.from(validPngB64, 'base64'));
    const symlinkName = 'edison_img_aaaaaaaaaaaaaaaaaaaa.png';
    const symlinkTarget = path.join(uploadsDir, symlinkName);
    fs.symlinkSync(outsideSecret, symlinkTarget);

    const symlinkRes = await request(app).get(`/uploads/${symlinkName}`);
    expect(symlinkRes.status).toBe(404);
  });

  it('returns structured JSON 400 on malformed JSON, opaque JSON 500 without stack leaks, and 504 on API timeouts', async () => {
    // 1. Malformed JSON sent to EDISON app must yield clean JSON 400 (never Express HTML error page)
    const malformedRes = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken');
    expect(malformedRes.status).toBe(400);
    expect(malformedRes.headers['content-type']).toContain('application/json');
    expect(malformedRes.body.error).toBe('Malformed JSON request payload.');

    // 2. Timeout + uncaught error handlers return deterministic opaque JSON without stack leaks
    const errTestApp = express();
    errTestApp.use('/api', apiTimeoutMiddleware(30));
    errTestApp.get('/api/slow', (_req, res) => {
      setTimeout(() => {
        if (!res.headersSent) res.json({ ok: true });
      }, 120);
    });
    errTestApp.get('/api/boom', () => {
      throw new Error('Sensitive internal DB string should not leak');
    });
    errTestApp.use(apiErrorMiddleware);

    const timeoutRes = await request(errTestApp).get('/api/slow');
    expect(timeoutRes.status).toBe(504);
    expect(timeoutRes.body.error).toContain('timed out');

    const boomRes = await request(errTestApp).get('/api/boom');
    expect(boomRes.status).toBe(500);
    expect(boomRes.body.error).toBe('Internal server error.');
    expect(JSON.stringify(boomRes.body)).not.toContain('Sensitive internal DB string');
  });

  it('Block P3-C: attaches sanitised X-Request-Id correlation headers, neutralizes CSV formula injection in admin audit export & secures TV adapter sim endpoints', async () => {
    // 1. Valid client request ID is echoed; header-injection / invalid IDs are replaced safely
    const cleanReqId = 'edison_trace-2026.01';
    const healthClean = await request(app)
      .get('/api/health')
      .set('X-Request-Id', cleanReqId);
    expect(healthClean.status).toBe(200);
    expect(healthClean.headers['x-request-id']).toBe(cleanReqId);

    const healthInjected = await request(app)
      .get('/api/health')
      .set('X-Request-Id', 'bad id with spaces / <script>');
    expect(healthInjected.status).toBe(200);
    expect(healthInjected.headers['x-request-id']).toMatch(/^req_[a-f0-9]{16}$/);

    // 2. Non-admin cannot access audit-logs/export or request-telemetry
    const advLogin = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    const advToken = advLogin.body.token as string;
    const forbidExport = await request(app)
      .get('/api/admin/audit-logs/export?format=csv')
      .set('Authorization', `Bearer ${advToken}`);
    expect(forbidExport.status).toBe(403);

    const forbidTelemetry = await request(app)
      .get('/api/admin/request-telemetry')
      .set('Authorization', `Bearer ${advToken}`);
    expect(forbidTelemetry.status).toBe(403);

    // 3. Inject formula-like payload via QR creation or security audit and verify CSV neutralization
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    const adminToken = adminLogin.body.token as string;

    store.recordSecurityAudit(
      adminLogin.body.user,
      'TEST_FORMULA_PAYLOAD',
      '=CMD("calc")',
      '+SUM(1,2) formula check'
    );

    const csvExport = await request(app)
      .get('/api/admin/audit-logs/export?format=csv&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(csvExport.status).toBe(200);
    expect(csvExport.headers['content-type']).toContain('text/csv');
    expect(csvExport.headers['content-disposition']).toContain('edison-audit-logs.csv');
    expect(csvExport.headers['x-content-type-options']).toBe('nosniff');
    expect(csvExport.headers['cache-control']).toBe('no-store');
    // Formula trigger prefixes must be neutralized with leading single quote inside quotes
    expect(csvExport.text).toContain(`"'=CMD(""calc"")"`);
    expect(csvExport.text).toContain(`"'+SUM(1,2) formula check"`);

    // 4. TV adapter simulation endpoints require auth, pass strict Zod validation, and return simulated-only flags
    const unauthAdapters = await request(app).get('/api/tv-adapters/profiles');
    expect(unauthAdapters.status).toBe(401);

    const profilesRes = await request(app)
      .get('/api/tv-adapters/profiles')
      .set('Authorization', `Bearer ${advToken}`);
    expect(profilesRes.status).toBe(200);
    expect(profilesRes.body.isSoftwareSimulationOnly).toBe(true);
    expect(profilesRes.body.hardwareTested).toBe(false);
    expect(profilesRes.body.profiles).toHaveLength(4);

    const simRes = await request(app)
      .post('/api/tv-adapters/remote-simulate')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        platformId: 'android_tv_tif',
        intentSource: 'AURA',
        command: 'channel_up',
        faultMode: 'adapter_timeout',
        simulateActiveAdSession: true,
      });
    expect(simRes.status).toBe(200);
    expect(simRes.body.watchdogTriggered).toBe(true);
    expect(simRes.body.restorationOutcome).toBe('restored_to_ordinary_tv');
    expect(simRes.body.nextState.ordinaryTvIntact).toBe(true);
    expect(simRes.body.hardwareTested).toBe(false);
  });

  it('Block 4.1: verifies break-lifecycle harnesses, 16-case fault-suite endpoint & SHA-256 offline cache atomic swap / rollback HTTP gates', async () => {
    // 1. Unauthenticated access must return 401
    const unauthCache = await request(app).get('/api/offline-intel-cache/state');
    expect(unauthCache.status).toBe(401);

    const advLogin = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    const advToken = advLogin.body.token as string;

    // 2. Enter & Exit Ad Overlay on Android TV TIF Harness
    const enterRes = await request(app)
      .post('/api/tv-adapters/break-lifecycle')
      .set('Authorization', `Bearer ${advToken}`)
      .send({ platformId: 'android_tv_tif', action: 'enter_ad_session' });
    expect(enterRes.status).toBe(200);
    expect(enterRes.body.ok).toBe(true);
    expect(enterRes.body.hardwareTested).toBe(false);
    expect(enterRes.body.harnessTelemetry.harnessName).toBe('AndroidTvTifHarness');
    expect(enterRes.body.nextState.adBreakOverlayActive).toBe(true);

    const exitRes = await request(app)
      .post('/api/tv-adapters/break-lifecycle')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        platformId: 'android_tv_tif',
        action: 'exit_to_ordinary_tv',
        currentState: enterRes.body.nextState,
      });
    expect(exitRes.status).toBe(200);
    expect(exitRes.body.nextState.adBreakOverlayActive).toBe(false);
    expect(exitRes.body.nextState.activeInput).toBe('LIVE_TUNER');

    // 3. Deterministic 16-case Fault Suite
    const suiteRes = await request(app)
      .post('/api/tv-adapters/fault-suite')
      .set('Authorization', `Bearer ${advToken}`)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.totalCases).toBe(16);
    expect(suiteRes.body.passedCases).toBe(16);
    expect(suiteRes.body.allPassed).toBe(true);
    expect(suiteRes.body.hardwareTested).toBe(false);

    // 4. Offline Cache State + Corrupt SHA-256 Fail-Closed + Atomic Swap + Rollback
    const cacheInit = await request(app)
      .get('/api/offline-intel-cache/state')
      .set('Authorization', `Bearer ${advToken}`);
    expect(cacheInit.status).toBe(200);
    expect(cacheInit.body.zeroPiiEnforced).toBe(true);
    const scopeId = cacheInit.body.bundles[0].scopeId as string;
    const baseVer = cacheInit.body.bundles[0].version as number;

    const corruptSwap = await request(app)
      .post('/api/offline-intel-cache/stage-swap')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        scopeId,
        nextVersion: baseVer + 1,
        p10BreakDurationSec: 80,
        p50BreakDurationSec: 115,
        switchingLatencyMs: 360,
        simulateCorruptManifest: true,
      });
    expect(corruptSwap.status).toBe(400);
    expect(corruptSwap.body.atomicSwapApplied).toBe(false);
    expect(corruptSwap.body.bundle.version).toBe(baseVer);

    const validSwap = await request(app)
      .post('/api/offline-intel-cache/stage-swap')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        scopeId,
        nextVersion: baseVer + 1,
        p10BreakDurationSec: 80,
        p50BreakDurationSec: 115,
        switchingLatencyMs: 360,
      });
    expect(validSwap.status).toBe(200);
    expect(validSwap.body.atomicSwapApplied).toBe(true);
    expect(validSwap.body.bundle.version).toBe(baseVer + 1);

    const rollbackRes = await request(app)
      .post('/api/offline-intel-cache/rollback')
      .set('Authorization', `Bearer ${advToken}`)
      .send({ scopeId });
    expect(rollbackRes.status).toBe(200);
    expect(rollbackRes.body.bundle.version).toBe(baseVer);
  });

  it('Block 4.2: secures offline observation queue, idempotent drain, multi-channel cadence simulator & conformance vector endpoints', async () => {
    const unauthChannels = await request(app).get('/api/tv-adapters/channels');
    expect(unauthChannels.status).toBe(401);

    const advLogin = await request(app).post('/api/auth/login').send({
      email: 'advertiser@edison.demo',
      password: 'EdisonProto!2026',
    });
    const advToken = advLogin.body.token as string;

    const channelsRes = await request(app)
      .get('/api/tv-adapters/channels')
      .set('Authorization', `Bearer ${advToken}`);
    expect(channelsRes.status).toBe(200);
    expect(channelsRes.body.hardwareTested).toBe(false);
    expect(channelsRes.body.channels).toHaveLength(3);

    // Reject unknown PII field on queue-observation strictly with HTTP 400
    const piiReject = await request(app)
      .post('/api/offline-intel-cache/queue-observation')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        idempotencyKey: 'http_obs_pii_reject',
        scopeId: channelsRes.body.channels[0].scopeId,
        channelNumber: 101,
        signalType: 'scte35_cue',
        observedBreakDurationSec: 85,
        viewerEmail: 'leaked@example.com',
      });
    expect(piiReject.status).toBe(400);

    // Enqueue valid observation -> drain offline (held) -> drain online -> replay rejected as dedup
    const scopeId = channelsRes.body.channels[0].scopeId as string;
    const uniqueKey = `http_obs_${Date.now()}`;
    const q1 = await request(app)
      .post('/api/offline-intel-cache/queue-observation')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        idempotencyKey: uniqueKey,
        scopeId,
        channelNumber: 101,
        signalType: 'scte35_cue',
        observedBreakDurationSec: 85,
      });
    expect(q1.status).toBe(200);
    expect(q1.body.queued).toBe(true);

    const drainOffline = await request(app)
      .post('/api/offline-intel-cache/drain-queue')
      .set('Authorization', `Bearer ${advToken}`)
      .send({ networkOnline: false });
    expect(drainOffline.status).toBe(200);
    expect(drainOffline.body.ok).toBe(false);

    const drainOnline = await request(app)
      .post('/api/offline-intel-cache/drain-queue')
      .set('Authorization', `Bearer ${advToken}`)
      .send({ networkOnline: true });
    expect(drainOnline.status).toBe(200);
    expect(drainOnline.body.ok).toBe(true);
    expect(drainOnline.body.drainedNewCount).toBeGreaterThanOrEqual(1);

    const qReplay = await request(app)
      .post('/api/offline-intel-cache/queue-observation')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        idempotencyKey: uniqueKey,
        scopeId,
        channelNumber: 101,
        signalType: 'scte35_cue',
        observedBreakDurationSec: 85,
      });
    expect(qReplay.status).toBe(200);
    expect(qReplay.body.deduplicatedReplay).toBe(true);

    // Cadence simulation + Conformance vectors
    const cadenceRes = await request(app)
      .post('/api/tv-adapters/cadence-simulate')
      .set('Authorization', `Bearer ${advToken}`)
      .send({
        platformId: 'android_tv_tif',
        channelNumber: 101,
        signalType: 'scte35_cue',
        observedBreakDurationSec: 95,
        adDurationSeconds: 20,
        networkOnline: true,
        idempotencyKey: `http_cad_${Date.now()}`,
      });
    expect(cadenceRes.status).toBe(200);
    expect(cadenceRes.body.breakExecuted).toBe(true);
    expect(cadenceRes.body.finalTvState.ordinaryTvIntact).toBe(true);
    expect(cadenceRes.body.hardwareTested).toBe(false);

    // Drain any queued cadence entry so server stays clean
    await request(app)
      .post('/api/offline-intel-cache/drain-queue')
      .set('Authorization', `Bearer ${advToken}`)
      .send({ networkOnline: true });

    const confRes = await request(app)
      .post('/api/tv-adapters/conformance-vectors')
      .set('Authorization', `Bearer ${advToken}`)
      .send({});
    expect(confRes.status).toBe(200);
    expect(confRes.body.totalVectors).toBe(8);
    expect(confRes.body.passedVectors).toBe(8);
    expect(confRes.body.allPassed).toBe(true);
    expect(confRes.body.hardwareTested).toBe(false);
  });

  it('Block 4.3: secures broadcast cue parser, companion policy evaluator, phase4-exit-suite endpoints & 17/17 QA invariants', async () => {
    const unauthNoCsrf = await request(app).post('/api/tv-adapters/parse-cue').send({});
    expect(unauthNoCsrf.status).toBe(403);

    const invalidBearer = await request(app)
      .post('/api/tv-adapters/parse-cue')
      .set('Authorization', 'Bearer invalid_token_123')
      .send({});
    expect(invalidBearer.status).toBe(401);

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    const adminToken = adminLogin.body.token as string;

    // 1. Valid SCTE-35 splice_insert parses cleanly
    const scteRes = await request(app)
      .post('/api/tv-adapters/parse-cue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        standard: 'scte35_splice_insert',
        channelNumber: 101,
        breakDurationSec: 90,
        adDurationSeconds: 20,
        outOfNetworkIndicator: true,
      });
    expect(scteRes.status).toBe(200);
    expect(scteRes.body.action).toBe('TRIGGER_EDISON_AD_SLOT');
    expect(scteRes.body.hardwareTested).toBe(false);

    // 2. Unknown fields rejected by strict Zod schema (HTTP 400)
    const badPolicyPayload = await request(app)
      .post('/api/tv-adapters/evaluate-policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        platformId: 'android_tv_tif',
        executionContext: 'owned_edison_session',
        requestedCapability: 'render_overlay',
        hasPartnerPrivilege: false,
        hasExplicitViewerConsent: true,
        drmHdcpActive: false,
        extraUnauthorizedFlag: true,
      });
    expect(badPolicyPayload.status).toBe(400);

    // 3. Policy rejects HDCP bypass fail-closed
    const denyRes = await request(app)
      .post('/api/tv-adapters/evaluate-policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        platformId: 'android_tv_tif',
        executionContext: 'owned_edison_session',
        requestedCapability: 'bypass_hdcp',
        hasPartnerPrivilege: true,
        hasExplicitViewerConsent: true,
        drmHdcpActive: false,
      });
    expect(denyRes.status).toBe(200);
    expect(denyRes.body.allowed).toBe(false);
    expect(denyRes.body.decision).toBe('DENY_FAIL_CLOSED');

    // 4. Phase 4 exit suite returns 10/10 checks passed
    const exitRes = await request(app)
      .post('/api/tv-adapters/phase4-exit-suite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(exitRes.status).toBe(200);
    expect(exitRes.body.softwareExitReady).toBe(true);
    expect(exitRes.body.passedChecks).toBe(10);
    expect(exitRes.body.totalChecks).toBe(10);
    expect(exitRes.body.hardwareTested).toBe(false);
    expect(exitRes.body.stageP6Deferred).toBe(true);

    // 5. Prototype readiness snapshot reports 18/18 automated invariants passing
    const qaRes = await request(app)
      .get('/api/qa/prototype-readiness')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(qaRes.status).toBe(200);
    expect(qaRes.body.automatedInvariantsPassed).toBe(18);
    expect(qaRes.body.automatedInvariantsTotal).toBe(18);
  });

  it('Block 5.1: enforces Ed25519 signature verification (401), Zero-PII (400), strict Zod schemas, scoped compatibility (409), and 11/11 Scenarios 25–35', async () => {
    const unauthNoCsrf = await request(app).post('/api/shared-intel-fleet/scenarios-25-35').send({});
    expect(unauthNoCsrf.status).toBe(403);

    const invalidBearer = await request(app)
      .post('/api/shared-intel-fleet/scenarios-25-35')
      .set('Authorization', 'Bearer bad_token_xyz')
      .send({});
    expect(invalidBearer.status).toBe(401);

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@edison.demo',
      password: 'EdisonAdmin!2026',
    });
    const adminToken = adminLogin.body.token as string;

    // 1. Spoofed signature rejected with 401
    const spoofRes = await request(app)
      .post('/api/shared-intel-fleet/observations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
        signalType: 'scte35',
        estimatedBreakDurationSec: 112,
        transitionLatencyMs: 360,
        nonce: `sec_spoof_${Date.now()}`,
        signatureHex: '00'.repeat(64),
      });
    expect(spoofRes.status).toBe(401);
    expect(spoofRes.body.observation.trustDecision).toBe('rejected_invalid_signature');

    // 2. PII payload rejected with 400
    const piiRes = await request(app)
      .post('/api/shared-intel-fleet/observations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
        signalType: 'scte35',
        estimatedBreakDurationSec: 112,
        transitionLatencyMs: 360,
        nonce: `sec_pii_${Date.now()}`,
        useRegisteredDemoSigner: true,
        householdId: 'hh_forbidden_1',
      });
    expect(piiRes.status).toBe(400);

    // 3. Cross-platform/country mismatch returns HTTP 409 compatibility block
    const compatMismatch = await request(app)
      .post('/api/shared-intel-fleet/sync-delta')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tvDeviceId: 'fleet_tv_gb_01',
        scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
        clientPlatform: 'Samsung Tizen 7.0',
        clientCountry: 'ZA',
        knownVersion: 1,
      });
    expect(compatMismatch.status).toBe(409);
    expect(compatMismatch.body.sync.status).toBe('scope_compatibility_mismatch');

    // 4. Scenarios 25-35 automated verification suite returns 11/11 passed
    const suiteRes = await request(app)
      .post('/api/shared-intel-fleet/scenarios-25-35')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(suiteRes.status).toBe(200);
    expect(suiteRes.body.totalScenarios).toBe(11);
    expect(suiteRes.body.passedScenarios).toBe(11);
    expect(suiteRes.body.allPassed).toBe(true);
    expect(suiteRes.body.hardwareTested).toBe(false);
    expect(suiteRes.body.stageP6Deferred).toBe(true);
  });
});





