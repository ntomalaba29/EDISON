import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { createEdisonApp } from './src/server/app.ts';
import { edisonStore } from './src/server/store.ts';

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

async function startServer() {
  const app = createEdisonApp(edisonStore);
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

startServer().catch((err) => {
  console.error('Failed to start EDISON server:', err);
  process.exit(1);
});
