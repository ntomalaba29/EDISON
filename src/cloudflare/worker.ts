import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { D1AuthSessionStore } from '../server/cloudflare/d1AuthSessionStore.ts';
import { D1DomainRecordRepository } from '../server/cloudflare/d1DomainRecordRepository.ts';
import { D1TvEnrollmentStore } from '../server/cloudflare/d1TvEnrollmentStore.ts';
import { R2MediaStorage, type R2BucketLike } from '../server/cloudflare/r2MediaStorage.ts';
import type { D1AuthDatabaseBinding } from '../server/cloudflare/d1AuthSessionStore.ts';
import type { Express } from 'express';
import type { GovernanceDocMeta, GovernanceDocRecord } from '../server/docsRegistry.ts';

interface EdisonWorkerEnv {
  EDISON_DB: D1AuthDatabaseBinding;
  ASSETS: { fetch(request: Request): Promise<Response> };
  EDISON_R2_BUCKET?: R2BucketLike;
  EDISON_TV_PAIRING_HMAC_SECRET?: string;
  EDISON_PUBLIC_ORIGIN?: string;
}

interface EdisonWorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const WORKER_MEDIA_PROCESSING_DISABLED = true;

let workerRuntime:
  | {
      database: D1AuthDatabaseBinding;
      tvEnrollmentHmacSecret: string | undefined;
      tvEnrollmentPublicOrigin: string | undefined;
      api: Express;
    }
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
    const tvEnrollmentHmacSecret = env.EDISON_TV_PAIRING_HMAC_SECRET;
    const tvEnrollmentPublicOrigin = env.EDISON_PUBLIC_ORIGIN;
    if (
      !workerRuntime ||
      workerRuntime.database !== database ||
      workerRuntime.tvEnrollmentHmacSecret !== tvEnrollmentHmacSecret ||
      workerRuntime.tvEnrollmentPublicOrigin !== tvEnrollmentPublicOrigin
    ) {
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
        tvEnrollmentHmacSecret,
        tvEnrollmentPublicOrigin,
        api: createEdisonApp(new EdisonPrototypeStore({ storageMode: 'memory' }), {
          authSessionRepository: new D1AuthSessionStore(database, {
            isProduction: () => true,
          }),
          domainRecordRepository: new D1DomainRecordRepository(database),
          tvEnrollmentStore: new D1TvEnrollmentStore(database),
          tvEnrollmentHmacSecret,
          tvEnrollmentPublicOrigin,
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
          disableMediaProcessing: WORKER_MEDIA_PROCESSING_DISABLED,
          mediaStorageBackend,
        }),
      };
      workerRuntime.api.get('/api/_cloudflare/compatibility', (_request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.json({
          runtime: 'cloudflare-workers',
          state: 'd1-backed-app-shell',
          applicationApiReady: false,
          tvEnrollmentHmacKeyConfigured:
            typeof tvEnrollmentHmacSecret === 'string' &&
            /^[a-f0-9]{64}$/i.test(tvEnrollmentHmacSecret),
          tvEnrollmentOriginConfigured: isPublicHttpsOrigin(tvEnrollmentPublicOrigin),
          mediaCompatibilityReady: false,
          mediaStorageConfigured: Boolean(mediaStorageBackend),
          mediaUploadReady: Boolean(mediaStorageBackend),
          mediaProcessingReady: !WORKER_MEDIA_PROCESSING_DISABLED,
        });
      });
    }

    const server = createServer(workerRuntime.api);
    return httpServerHandler(server).fetch(request);
  },
};

function isPublicHttpsOrigin(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value && url.pathname === '/';
  } catch {
    return false;
  }
}
