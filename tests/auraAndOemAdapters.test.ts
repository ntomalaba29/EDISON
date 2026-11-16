import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('Workstream B: AURA Companion Remote Engine, HDMI-CEC & OEM Native Adapter Contracts', () => {
  it('completes AURA discovery, PIN pairing, multi-profile binding, offline queuing + reconnect flush, safe disconnect, and HDMI-CEC HDCP/hijack guardrails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-aura-'));
    try {
      const store = new EdisonPrototypeStore({ dataDir: tmpDir });
      const app = createEdisonApp(store, { uploadsDir: path.join(tmpDir, 'uploads') });

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@edison.demo', password: 'EdisonViewer!2026' });
      expect(login.status).toBe(200);
      const token = login.body.token as string;
      const auth = { Authorization: `Bearer ${token}` };

      // 1. OEM native adapter contracts strictly prohibit HDCP/DRM bypass & preserve ordinary TV
      const contractsRes = await request(app).get('/api/aura/contracts').set(auth);
      expect(contractsRes.status).toBe(200);
      expect(contractsRes.body.hardwareTested).toBe(false);
      expect(contractsRes.body.stageP6Deferred).toBe(true);
      expect(contractsRes.body.oemContracts.length).toBe(5);
      for (const c of contractsRes.body.oemContracts) {
        expect(c.hdcpDrmBypassProhibited).toBe(true);
        expect(c.ordinaryTvPreservedOnFailure).toBe(true);
        expect(c.hardwareTested).toBe(false);
      }

      // 2. Discover nearby simulated devices & initiate PIN/QR pairing
      const discRes = await request(app).get('/api/aura/discover').set(auth);
      expect(discRes.status).toBe(200);
      expect(discRes.body.devices.length).toBeGreaterThanOrEqual(3);

      const initRes = await request(app)
        .post('/api/aura/pair/initiate')
        .set(auth)
        .send({ tvLabel: 'Harare Lounge Android TV', platformId: 'android_tv_tif' });
      expect(initRes.status).toBe(201);
      const deviceId = initRes.body.device.deviceId;
      const pairingCode = initRes.body.device.pairingCode;
      expect(pairingCode).toMatch(/^\d{6}$/);

      // Reject wrong PIN
      const badPin = await request(app)
        .post('/api/aura/pair/confirm')
        .set(auth)
        .send({ deviceId, pairingCode: '000000' });
      expect(badPin.status).toBe(400);

      // Confirm valid PIN
      const confirmRes = await request(app)
        .post('/api/aura/pair/confirm')
        .set(auth)
        .send({ deviceId, pairingCode });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.device.pairingStatus).toBe('paired');
      expect(confirmRes.body.device.connectionState).toBe('online');

      // 3. Bind active profile
      const bindRes = await request(app)
        .patch(`/api/aura/devices/${deviceId}/profile`)
        .set(auth)
        .send({ profileId: 'mbr_seed_01' });
      expect(bindRes.status).toBe(200);
      expect(bindRes.body.device.activeProfileId).toBe('mbr_seed_01');

      // 4. Simulate offline network drop -> exponential backoff reconnect -> queue remote commands -> flush on recovery
      const off1 = await request(app)
        .post(`/api/aura/devices/${deviceId}/heartbeat`)
        .set(auth)
        .send({ networkOnline: false });
      expect(off1.status).toBe(200);
      expect(off1.body.device.pairingStatus).toBe('reconnecting');
      expect(off1.body.device.nextReconnectBackoffMs).toBe(1000);

      const off2 = await request(app)
        .post(`/api/aura/devices/${deviceId}/heartbeat`)
        .set(auth)
        .send({ networkOnline: false });
      expect(off2.body.device.nextReconnectBackoffMs).toBe(2000);

      const queuedCmd = await request(app)
        .post(`/api/aura/devices/${deviceId}/command`)
        .set(auth)
        .send({ command: 'volume_up' });
      expect(queuedCmd.status).toBe(200);
      expect(queuedCmd.body.queuedWhileOffline).toBe(true);
      expect(queuedCmd.body.device.offlineQueue.length).toBe(1);

      const recover = await request(app)
        .post(`/api/aura/devices/${deviceId}/heartbeat`)
        .set(auth)
        .send({ networkOnline: true });
      expect(recover.status).toBe(200);
      expect(recover.body.device.connectionState).toBe('online');
      expect(recover.body.device.offlineQueue.length).toBe(0);
      expect(recover.body.device.tvState.ordinaryTvIntact).toBe(true);

      // 5. HDMI-CEC guardrails: block HDCP override & block unsolicited input hijack; yield on viewer key
      const cecHdcp = await request(app)
        .post('/api/tv/hdmi-cec/evaluate')
        .set(auth)
        .send({
          action: 'active_source_claim',
          targetInput: 'EDISON_APP',
          hdcpProtectedSurface: true,
          breakWindowActive: true,
        });
      expect(cecHdcp.status).toBe(200);
      expect(cecHdcp.body.permitted).toBe(false);
      expect(cecHdcp.body.ordinaryTvPreserved).toBe(true);
      expect(cecHdcp.body.hdcpRespected).toBe(true);

      const cecHijack = await request(app)
        .post('/api/tv/hdmi-cec/evaluate')
        .set(auth)
        .send({
          action: 'active_source_claim',
          targetInput: 'EDISON_APP',
          breakWindowActive: false,
        });
      expect(cecHijack.body.permitted).toBe(false);

      // 6. Safe disconnect always restores ordinary TV
      const disc = await request(app)
        .post(`/api/aura/devices/${deviceId}/disconnect`)
        .set(auth)
        .send({});
      expect(disc.status).toBe(200);
      expect(disc.body.device.pairingStatus).toBe('disconnected');
      expect(disc.body.device.tvState.ordinaryTvIntact).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
