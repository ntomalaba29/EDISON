import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { createEdisonApp } from './src/server/app.ts';
import { getEdisonStore } from './src/server/store.ts';
import { SharedIntelFleetService } from './src/server/sharedIntelFleetService.ts';

function getCliFlag(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqArg = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return eqArg ? eqArg.slice(flag.length + 1) : undefined;
}

const PORT = Number(getCliFlag('--port') || process.env.PORT || 3000);
const HOST = getCliFlag('--host') || '0.0.0.0';
const fleetStorageKey = process.env.EDISON_SHARED_INTEL_STORAGE_KEY?.trim();
const fleetStatePath = process.env.EDISON_SHARED_INTEL_STATE_PATH?.trim();
const fleetRotationTargetKey = process.env.EDISON_SHARED_INTEL_ROTATE_TO_KEY?.trim();
const fleetPersistencePath =
  fleetStatePath || path.resolve(process.cwd(), 'data', 'shared-intel-fleet.enc');

if (!fleetStorageKey && fleetStatePath) {
  throw new Error(
    'EDISON_SHARED_INTEL_STATE_PATH requires EDISON_SHARED_INTEL_STORAGE_KEY.'
  );
}

if (fleetRotationTargetKey && !fleetStorageKey) {
  throw new Error(
    'EDISON_SHARED_INTEL_ROTATE_TO_KEY requires the current EDISON_SHARED_INTEL_STORAGE_KEY.'
  );
}

if (fleetRotationTargetKey && !fs.existsSync(fleetPersistencePath)) {
  throw new Error(
    `Cannot rotate shared-intelligence persistence because no state file exists at ${fleetPersistencePath}.`
  );
}

const fleetService = fleetStorageKey
  ? new SharedIntelFleetService({
      encryptionKeyHex: fleetStorageKey,
      persistencePath: fleetPersistencePath,
    })
  : undefined;

async function startServer() {
  const app = createEdisonApp(
    getEdisonStore(),
    fleetService ? { sharedIntelFleetService: fleetService } : undefined
  );
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.on('error', (err) => {
    console.error('EDISON HTTP server error:', err);
    process.exit(1);
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`EDISON server listening on http://${HOST}:${PORT}`);
  });
}

if (fleetRotationTargetKey) {
  if (!fleetService) {
    throw new Error('Shared-intelligence persistence key rotation could not be initialized.');
  }
  fleetService.rotatePersistenceKey(fleetRotationTargetKey);
  console.info(
    'Shared-intelligence persistence key rotated. Update EDISON_SHARED_INTEL_STORAGE_KEY to the new key and clear EDISON_SHARED_INTEL_ROTATE_TO_KEY before restarting.'
  );
} else {
  startServer().catch((err) => {
    console.error('Failed to start EDISON server:', err);
    process.exit(1);
  });
}
