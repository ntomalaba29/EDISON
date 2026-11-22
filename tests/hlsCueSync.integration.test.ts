import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdisonApp } from '../src/server/app.ts';
import {
  canonicalChannelScopeId,
  SIMULATED_DEFAULT_DECODER_PROFILE_ID,
} from '../src/server/sharedIntelFleetService.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { parseHlsBreakCues } from '../src/server/hlsCueParser.ts';
import { makeSpliceInsertPayload } from './fixtures/scte35.ts';

const API_PATH = '/api/shared-intel-fleet/break-events';

describe('local HLS-to-peer break synchronization', () => {
  let temporaryDirectory: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-hls-sync-'));
    const app = createEdisonApp(
      new EdisonPrototypeStore({ dataDir: path.join(temporaryDirectory, 'data') }),
      { uploadsDir: path.join(temporaryDirectory, 'uploads') }
    );
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (temporaryDirectory && fs.existsSync(temporaryDirectory)) {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('sends a decoded SCTE-35 cue to a peer over HTTP, isolates channels, and rejects replay', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@edison.demo',
        password: 'EdisonAdmin!2026',
      }),
    });
    expect(loginResponse.status).toBe(200);
    const login = (await loginResponse.json()) as { token: string };
    const authorization = { Authorization: `Bearer ${login.token}` };

    const breakStartedAtUtc = new Date(Date.now() - 5_000).toISOString();
    const parsed = parseHlsBreakCues(`#EXTM3U
#EXT-X-DATERANGE:ID="live-scte-${Date.now()}",START-DATE="${breakStartedAtUtc}",DURATION=30,SCTE35-OUT="${makeSpliceInsertPayload()}"`);
    const cue = parsed.events.find((event) => event.type === 'break_start');
    expect(cue).toBeDefined();
    expect(cue?.spliceEventId).toBe(0x01020304);
    expect(cue?.programDateTime).toBe(breakStartedAtUtc);

    const channelId = canonicalChannelScopeId({
      country: 'GB',
      broadcaster: 'Freeview',
      channel: 'BBC One HD',
    });
    const payload = {
      tvDeviceId: 'fleet_tv_gb_01',
      scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
      decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
      channelId,
      eventId: cue!.eventId,
      breakStartedAtUtc: cue!.programDateTime!,
      nonce: `local-http-${Date.now()}`,
      useRegisteredDemoSigner: true,
    };

    const submittedResponse = await fetch(`${baseUrl}${API_PATH}`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(submittedResponse.status).toBe(201);
    const submitted = (await submittedResponse.json()) as {
      result: { signatureVerified: boolean; event: { eventId: string } };
    };
    expect(submitted.result.signatureVerified).toBe(true);

    const peerResponse = await fetch(
      `${baseUrl}${API_PATH}?${new URLSearchParams({
        tvDeviceId: 'fleet_tv_gb_02',
        decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
        channelId,
      })}`,
      { headers: authorization }
    );
    expect(peerResponse.status).toBe(200);
    const peerSync = (await peerResponse.json()) as {
      events: Array<{ eventId: string; breakStartedAtUtc: string }>;
    };
    expect(peerSync.events).toHaveLength(1);
    expect(peerSync.events[0]).toMatchObject({
      eventId: payload.eventId,
      breakStartedAtUtc,
    });

    const otherChannelResponse = await fetch(
      `${baseUrl}${API_PATH}?${new URLSearchParams({
        tvDeviceId: 'fleet_tv_gb_02',
        decoderProfileId: SIMULATED_DEFAULT_DECODER_PROFILE_ID,
        channelId: canonicalChannelScopeId({
          country: 'GB',
          broadcaster: 'Freeview',
          channel: 'BBC Two',
        }),
      })}`,
      { headers: authorization }
    );
    expect(otherChannelResponse.status).toBe(409);
    const otherChannelSync = (await otherChannelResponse.json()) as {
      events: unknown[];
    };
    expect(otherChannelSync.events).toEqual([]);

    const replayResponse = await fetch(`${baseUrl}${API_PATH}`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(replayResponse.status).toBe(401);
  });
});
