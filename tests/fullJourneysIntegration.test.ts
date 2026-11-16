import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('Workstreams C, D & E: Full End-to-End Application Journeys, Commercial Disputes & Sovereign Multi-Region Integration', () => {
  it('verifies commercial disputes/refund ledger, permanent $0.00 Charity lock, 9-language i18n bundles, sovereign deployment manifests, and end-to-end API journeys', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-journeys-'));
    try {
      const store = new EdisonPrototypeStore({ dataDir: tmpDir });
      const app = createEdisonApp(store, { uploadsDir: path.join(tmpDir, 'uploads') });

      const advLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'advertiser@edison.demo', password: 'EdisonProto!2026' });
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@edison.demo', password: 'EdisonAdmin!2026' });

      expect(advLogin.status).toBe(200);
      expect(adminLogin.status).toBe(200);
      const advAuth = { Authorization: `Bearer ${advLogin.body.token}` };
      const adminAuth = { Authorization: `Bearer ${adminLogin.body.token}` };

      // 1. Workstream D: Commercial dispute & credit adjustment workflow + permanent $0.00 Charity protection
      const advCampaigns = await request(app).get('/api/campaigns').set(advAuth);
      const commercialCmp = advCampaigns.body.items.find(
        (c: any) => c.contentCategory === 'commercial_advertising'
      );
      const charityCmp = advCampaigns.body.items.find(
        (c: any) => c.contentCategory === 'opportunity_promotion'
      );

      // Non-zero dispute on a $0.00 Charity campaign MUST be rejected
      if (charityCmp) {
        const badCharityDispute = await request(app)
          .post('/api/advertiser-ops/disputes')
          .set(advAuth)
          .send({
            campaignId: charityCmp.id,
            billingPeriodLabel: '2026-11',
            disputeType: 'pro_forma_dispute',
            disputedAmountUsd: 25,
            reason: 'Testing illegal charge check on Charity opportunity slot.',
          });
        expect(badCharityDispute.status).toBe(400);
        expect(badCharityDispute.body.error).toMatch(/CHARITY_PERMANENT_ZERO_LOCK/);
      }

      // Commercial pro-forma dispute & admin simulated credit approval
      const createDispute = await request(app)
        .post('/api/advertiser-ops/disputes')
        .set(advAuth)
        .send({
          campaignId: commercialCmp?.id ?? null,
          billingPeriodLabel: '2026-11',
          disputeType: 'delivery_shortfall_credit',
          disputedAmountUsd: 120,
          reason: 'Two evening primetime slots skipped due to shortened regional break.',
        });
      expect(createDispute.status).toBe(201);
      expect(createDispute.body.item.paymentCollectionActive).toBe(false);

      // Non-admin cannot resolve dispute
      const nonAdminResolve = await request(app)
        .patch(`/api/advertiser-ops/disputes/${createDispute.body.item.id}/resolve`)
        .set(advAuth)
        .send({
          decision: 'credit_approved_simulated',
          approvedCreditUsd: 120,
          resolutionNote: 'Unauthorized self-approval attempt.',
        });
      expect(nonAdminResolve.status).toBe(403);

      const adminResolve = await request(app)
        .patch(`/api/advertiser-ops/disputes/${createDispute.body.item.id}/resolve`)
        .set(adminAuth)
        .send({
          decision: 'credit_approved_simulated',
          approvedCreditUsd: 60,
          resolutionNote: 'Approved 50% simulated rate-card pro-forma credit.',
        });
      expect(adminResolve.status).toBe(200);
      expect(adminResolve.body.item.approvedCreditUsd).toBe(60);

      const disputeList = await request(app).get('/api/advertiser-ops/disputes').set(advAuth);
      expect(disputeList.status).toBe(200);
      expect(disputeList.body.reconciliation.paymentCollectionActive).toBe(false);
      expect(disputeList.body.reconciliation.charityCampaignsTotalUsd).toBe(0);
      expect(disputeList.body.reconciliation.approvedSimulatedCreditsUsd).toBe(60);

      // 2. Workstream E: 9+ Locale i18n Catalog & Sovereign Multi-Region Deployment Manifests
      const i18nRes = await request(app).get('/api/i18n/bundles');
      expect(i18nRes.status).toBe(200);
      expect(i18nRes.body.supportedLocales.length).toBeGreaterThanOrEqual(9);
      expect(i18nRes.body.supportedLocales).toContain('sn');
      expect(i18nRes.body.supportedLocales).toContain('nd');
      expect(i18nRes.body.supportedLocales).toContain('zu');

      const snRes = await request(app).get('/api/i18n/bundles?locale=sn');
      expect(snRes.status).toBe(200);
      expect(snRes.body.bundle.locale).toBe('sn');
      expect(snRes.body.bundle.charityFreeNotice).toBeTruthy();

      const manifestsRes = await request(app)
        .get('/api/international-expansion/deployment-manifests')
        .set(advAuth);
      expect(manifestsRes.status).toBe(200);
      expect(manifestsRes.body.count).toBe(4);
      expect(manifestsRes.body.prohibitCrossBorderPiiTransfer).toBe(true);
      expect(manifestsRes.body.countryActivated).toBe(false);
      expect(manifestsRes.body.regionalExpansionActive).toBe(false);
      for (const m of manifestsRes.body.manifests) {
        expect(m.prohibitCrossBorderPiiTransfer).toBe(true);
        expect(m.countryActivated).toBe(false);
        expect(m.regionalExpansionActive).toBe(false);
        expect(m.charityFeeUsd).toBe(0);
        expect(m.paymentCollectionActive).toBe(false);
      }

      // 3. Workstream A2/C: Admin Database Status & Real Live PGlite Verification Route
      const dbStatusRes = await request(app).get('/api/admin/database/status').set(adminAuth);
      expect(dbStatusRes.status).toBe(200);
      expect(dbStatusRes.body.migrationsAvailable.length).toBe(3);

      const pgVerifyRes = await request(app)
        .post('/api/admin/database/verify-pglite')
        .set(adminAuth)
        .send({});
      expect(pgVerifyRes.status).toBe(200);
      expect(pgVerifyRes.body.ok).toBe(true);
      expect(pgVerifyRes.body.verifiedWithEngine).toBe('pglite_postgresql_16_wasm');
      expect(pgVerifyRes.body.importSummary.charityZeroCostVerified).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
