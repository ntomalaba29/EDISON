import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import type { GovernanceDocRecord } from '../src/server/docsRegistry.ts';

const governanceDoc: GovernanceDocRecord = {
  id: 'readme',
  title: 'Project Overview & Index',
  filename: 'README.md',
  category: 'Core & Governance',
  content: '# EDISON',
  bytes: 8,
  updatedAt: '',
};

describe('Worker-compatible documentation and media routes', () => {
  it('serves allowlisted governance documents through the injected asset repository', async () => {
    const app = createEdisonApp(new EdisonPrototypeStore({ storageMode: 'memory' }), {
      governanceDocRepository: {
        listGovernanceDocs: async () => [governanceDoc],
        getGovernanceDocById: async (id) => id === governanceDoc.id ? governanceDoc : null,
      },
    });

    const list = await request(app).get('/api/docs');
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([governanceDoc]);

    const detail = await request(app).get('/api/docs/readme');
    expect(detail.status).toBe(200);
    expect(detail.body.item.content).toBe('# EDISON');

    const missing = await request(app).get('/api/docs/not-allowlisted');
    expect(missing.status).toBe(404);
  });

  it('returns an explicit unavailable response for disabled Worker media processing', async () => {
    const app = createEdisonApp(new EdisonPrototypeStore({ storageMode: 'memory' }), {
      disableMediaProcessing: true,
    });
    const registration = await request(app).post('/api/auth/register').send({
      email: 'worker-media@example.test',
      password: 'WorkerMediaPass!23',
      name: 'Worker Media Test',
      organisationName: 'EDISON Local Test',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);
    const auth = { Authorization: `Bearer ${registration.body.token}` };

    const status = await request(app).get('/api/media/worker/status').set(auth);
    expect(status.status).toBe(503);
    expect(status.body.error).toBe('MEDIA_PROCESSING_UNAVAILABLE');

    const transcode = await request(app)
      .post('/api/media/worker/transcode')
      .set(auth)
      .send({});
    expect(transcode.status).toBe(503);
    expect(transcode.body.error).toBe('MEDIA_PROCESSING_UNAVAILABLE');

    const upload = await request(app)
      .post('/api/media/upload')
      .set(auth)
      .send({});
    expect(upload.status).toBe(503);
    expect(upload.body.error).toBe('MEDIA_PROCESSING_UNAVAILABLE');
  });
});
