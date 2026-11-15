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
  hashSessionToken,
  securityHeadersMiddleware,
} from '../src/server/security.ts';
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
});

