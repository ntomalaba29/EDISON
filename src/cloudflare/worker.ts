import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { D1AuthSessionStore } from '../server/cloudflare/d1AuthSessionStore.ts';
import { D1DomainRecordRepository } from '../server/cloudflare/d1DomainRecordRepository.ts';
import { R2MediaStorage, type R2BucketLike } from '../server/cloudflare/r2MediaStorage.ts';
import type { D1AuthDatabaseBinding } from '../server/cloudflare/d1AuthSessionStore.ts';
import type { Express } from 'express';
import type { GovernanceDocMeta, GovernanceDocRecord } from '../server/docsRegistry.ts';

interface EdisonWorkerEnv {
  EDISON_DB: D1AuthDatabaseBinding;
  ASSETS: { fetch(request: Request): Promise<Response> };
  EDISON_R2_BUCKET?: R2BucketLike;
}

interface EdisonWorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

let workerRuntime:
  | { database: D1AuthDatabaseBinding; api: Express }
  | undefined;

async function readWorkerGovernanceDoc(
  meta: GovernanceDocMeta,
  assets: EdisonWorkerEnv['ASSETS'],
  baseUrl: string
): Promise<GovernanceDocRecord> {
  const assetPath = meta.filename.split('/').map(encodeURIComponent).join('/');
  const response = await assets.fetch(
    new Request(new URL(`/governance-docs/${assetPath}`, baseUrl))
  );
  if (!response.ok) {
    throw new Error(`Governance document asset unavailable: ${meta.id} (${response.status}).`);
  }
  const content = await response.text();
  return {
    ...meta,
    content,
    bytes: new TextEncoder().encode(content).byteLength,
    updatedAt: response.headers.get('last-modified') ?? '',
  };
}

export default {
  async fetch(
    request: Request,
    env: EdisonWorkerEnv,
    _context: EdisonWorkerExecutionContext
  ): Promise<Response> {
    if (!env?.EDISON_DB) {
      return Response.json(
        {
          error: 'CLOUDFLARE_D1_NOT_BOUND',
          message: 'EDISON_DB is not configured for this Worker.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const database = env.EDISON_DB;
    if (!workerRuntime || workerRuntime.database !== database) {
      const [
        { createEdisonApp },
        { EdisonPrototypeStore },
        { getGovernanceDocMetadata, listGovernanceDocMetadata },
      ] = await Promise.all([
        import('../server/app.ts'),
        import('../server/store.ts'),
        import('../server/docsRegistry.ts'),
      ]);
      const r2Bucket = env.EDISON_R2_BUCKET;
      const mediaStorageBackend = r2Bucket
        ? new R2MediaStorage(r2Bucket, new URL(request.url).origin)
        : undefined;
      workerRuntime = {
        database,
        api: createEdisonApp(new EdisonPrototypeStore({ storageMode: 'memory' }), {
          authSessionRepository: new D1AuthSessionStore(database, {
            isProduction: () => true,
          }),
          domainRecordRepository: new D1DomainRecordRepository(database),
          governanceDocRepository: {
            listGovernanceDocs: () =>
              Promise.all(
                listGovernanceDocMetadata().map((meta) =>
                  readWorkerGovernanceDoc(meta, env.ASSETS, request.url)
                )
              ),
            getGovernanceDocById: async (id) => {
              const meta = getGovernanceDocMetadata(id);
              return meta
                ? readWorkerGovernanceDoc(meta, env.ASSETS, request.url)
                : null;
            },
          },
          disableMediaProcessing: true,
          mediaStorageBackend,
        }),
      };
      workerRuntime.api.get('/api/_cloudflare/compatibility', (_request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.json({
          runtime: 'cloudflare-workers',
          state: 'd1-backed-app-shell',
          applicationApiReady: false,
          mediaCompatibilityReady: false,
          mediaStorageConfigured: Boolean(mediaStorageBackend),
          mediaUploadReady: Boolean(mediaStorageBackend),
          mediaProcessingReady: false,
        });
      });
    }

    const server = createServer(workerRuntime.api);
    return httpServerHandler(server).fetch(request);
  },
};
