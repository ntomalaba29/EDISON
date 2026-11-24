import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createEdisonApp } from '../src/server/app.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';
import { R2MediaStorage, type R2BucketLike } from '../src/server/cloudflare/r2MediaStorage.ts';
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

const validPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r1sAAAAASUVORK5CYII=';

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

  it('stores and serves validated media through a Worker-compatible R2 stream', async () => {
    const stored = new Map<string, { data: Uint8Array; contentType: string }>();
    const bucket: R2BucketLike = {
      put: async (key, value, options) => {
        stored.set(key, {
          data: new Uint8Array(value as Uint8Array),
          contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream',
        });
      },
      get: async (key) => {
        const object = stored.get(key);
        if (!object) return null;
        return {
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(object.data);
              controller.close();
            },
          }),
          httpMetadata: { contentType: object.contentType },
        };
      },
      delete: async (key) => {
        stored.delete(key);
      },
    };
    const mediaStorage = new R2MediaStorage(bucket, 'https://edison.example.test');
    const app = createEdisonApp(new EdisonPrototypeStore({ storageMode: 'memory' }), {
      disableMediaProcessing: true,
      mediaStorageBackend: mediaStorage,
    });

    const registration = await request(app).post('/api/auth/register').send({
      email: 'r2-media@example.test',
      password: 'WorkerMediaPass!23',
      name: 'R2 Media Test',
      organisationName: 'EDISON Local Test',
      role: 'advertiser',
    });
    expect(registration.status).toBe(201);

    const upload = await request(app)
      .post('/api/media/upload')
      .set({ Authorization: `Bearer ${registration.body.token}` })
      .send({ dataBase64: validPngBase64, declaredKind: 'image' });
    expect(upload.status, JSON.stringify(upload.body)).toBe(201);
    expect(upload.body.fileUrl).toMatch(/^https:\/\/edison\.example\.test\/r2-media\//);

    const mediaPath = new URL(upload.body.fileUrl).pathname;
    const download = await request(app)
      .get(mediaPath)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('image/png');
    expect(download.body).toEqual(Buffer.from(validPngBase64, 'base64'));

    const invalidKey = await request(app).get('/r2-media/../../etc/passwd');
    expect(invalidKey.status).toBe(404);
  });
});
