import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { redactPii } from '../src/server/logger.ts';
import { ReliabilityMonitor } from '../src/server/reliabilityMonitor.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('Workstreams F & G: PII-Redacted Logging, Circuit Breakers, Observability & Latency Benchmark', () => {
  it('redacts sensitive secrets/PII recursively, exercises circuit breaker fallback/recovery, and benchmarks 100 QR redirect resolutions under low latency', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-perf-'));
    try {
      // 1. Recursive PII redaction check
      const redacted = redactPii({
        householdId: 'hh_01',
        pin: '4829',
        pinHash: 'abc123hash',
        exactInstallationLocation: '12 Samora Machel Ave, Harare',
        nested: {
          token: 'secret_bearer',
          safeField: 'Harare Central',
        },
      });
      expect(redacted.pin).toBe('[REDACTED]');
      expect(redacted.pinHash).toBe('[REDACTED]');
      expect(redacted.exactInstallationLocation).toBe('[REDACTED]');
      expect(redacted.nested.token).toBe('[REDACTED]');
      expect(redacted.nested.safeField).toBe('Harare Central');

      // 2. Circuit breaker trip -> LKG fallback -> automatic recovery
      const monitor = new ReliabilityMonitor();
      monitor.recordDependencyFailure('postgres_primary', 'timeout 1');
      monitor.recordDependencyFailure('postgres_primary', 'timeout 2');
      const tripped = monitor.recordDependencyFailure('postgres_primary', 'timeout 3');
      expect(tripped.state).toBe('open');
      expect(tripped.fallbackActive).toBe('atomic_json_store_and_lkg_cache');

      const recovered = monitor.recordDependencySuccess('postgres_primary');
      expect(recovered.state).toBe('closed');
      expect(recovered.consecutiveFailures).toBe(0);

      // 3. HTTP /r/:token redirect latency & throughput benchmark + Admin Observability Metrics endpoint
      const store = new EdisonPrototypeStore({ dataDir: tmpDir });
      const app = createEdisonApp(store, {
        uploadsDir: path.join(tmpDir, 'uploads'),
        rateLimits: { redirectMax: 500, mutationMax: 500 },
      });

      const started = performance.now();
      for (let i = 0; i < 60; i += 1) {
        const res = await request(app).get('/r/edison-demo');
        expect(res.status).toBe(302);
      }
      const elapsedMs = performance.now() - started;
      const avgMs = elapsedMs / 60;
      expect(avgMs).toBeLessThan(100);

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@edison.demo', password: 'EdisonAdmin!2026' });
      expect(adminLogin.status).toBe(200);
      const obsRes = await request(app)
        .get('/api/admin/observability/metrics')
        .set('Authorization', `Bearer ${adminLogin.body.token}`);
      expect(obsRes.status).toBe(200);
      expect(obsRes.body.qrRedirectCount).toBeGreaterThanOrEqual(60);
      expect(obsRes.body.lkgConfigBackupActive).toBe(true);
      expect(obsRes.body.circuits.length).toBe(3);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
