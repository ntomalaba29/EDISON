import 'dotenv/config';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { edisonStore } from './src/server/store.ts';
import { validateQrDestination } from './src/server/qrValidator.ts';
import type { PublicUser, QrDestinationType, QrLinkStatus } from './src/types/edison.ts';

const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE_NAME = 'edison_proto_session';

interface AuthenticatedRequest extends Request {
  currentUser?: PublicUser | null;
  sessionToken?: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

function extractSessionToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

function attachSession(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  req.sessionToken = token;
  req.currentUser = edisonStore.getUserBySessionToken(token);
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.currentUser.role !== 'admin') {
    res.status(403).json({
      error: `Forbidden: Role "${req.currentUser.role}" cannot access administrator endpoints.`,
    });
    return;
  }
  next();
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));
  app.use(attachSession);

  // Health & prototype status
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'edison-prototype-server',
      phase: 'Phase 2 · Block 2.1',
      summary: edisonStore.getFoundationSummary(),
    });
  });

  // Auth & RBAC endpoints
  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: req.currentUser ?? null,
      summary: edisonStore.getFoundationSummary(),
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, name, organisationName, role } = req.body ?? {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Provide a valid email address.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters.' });
      return;
    }
    if (role !== 'advertiser' && role !== 'opportunity_submitter') {
      res.status(400).json({
        error: 'Self-registration role must be "advertiser" or "opportunity_submitter". Admin accounts cannot be self-registered.',
      });
      return;
    }

    try {
      const { user, session } = edisonStore.registerUser({
        email,
        password,
        name,
        organisationName: typeof organisationName === 'string' ? organisationName : '',
        role,
      });
      setSessionCookie(res, session.token);
      res.status(201).json({ user, token: session.token });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to register user.',
      });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    try {
      const { user, session } = edisonStore.loginUser(email, password);
      setSessionCookie(res, session.token);
      res.json({ user, token: session.token });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Invalid credentials.',
      });
    }
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    edisonStore.logoutSession(req.sessionToken);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  // QR Destination Validation & Management
  app.post('/api/qr/validate', (req: Request, res: Response) => {
    const { rawInput, destinationType } = req.body ?? {};
    if (typeof rawInput !== 'string') {
      res.status(400).json({ error: 'rawInput string is required.' });
      return;
    }
    const result = validateQrDestination(
      rawInput,
      (destinationType as QrDestinationType) || 'website'
    );
    res.json(result);
  });

  app.get('/api/qr', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    res.json({
      items: edisonStore.listQrLinksForUser(user),
    });
  });

  app.post('/api/qr', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    const { label, destinationType, rawInput } = req.body ?? {};
    if (typeof rawInput !== 'string') {
      res.status(400).json({ error: 'rawInput is required.' });
      return;
    }
    try {
      const record = edisonStore.createQrLink(user, {
        label: typeof label === 'string' ? label : '',
        destinationType: (destinationType as QrDestinationType) || 'website',
        rawInput,
      });
      res.status(201).json({ item: record });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid QR destination.',
      });
    }
  });

  app.patch('/api/qr/:token/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    const token = req.params.token;
    const { status } = req.body ?? {};
    if (status !== 'active' && status !== 'disabled' && status !== 'flagged') {
      res.status(400).json({ error: 'Invalid status. Must be active, disabled, or flagged.' });
      return;
    }
    try {
      const updated = edisonStore.updateQrStatus(user, token, status as QrLinkStatus);
      res.json({ item: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update QR status.';
      const code = message.startsWith('FORBIDDEN:') ? 403 : 404;
      res.status(code).json({ error: message });
    }
  });

  // Admin-only Audit Log & Redirect Event Endpoints (RBAC Verification Targets)
  app.get('/api/admin/audit-logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      items: edisonStore.listAuditLogs(),
    });
  });

  app.get('/api/qr/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    const allowedTokens = new Set(edisonStore.listQrLinksForUser(user).map((q) => q.token));
    const events = edisonStore
      .listAnalyticsEvents(100)
      .filter((e) => user.role === 'admin' || (e.qrToken && allowedTokens.has(e.qrToken)));
    res.json({ items: events });
  });

  // Real Direct-to-Destination QR Tracking Redirect (/r/:token)
  // Records `redirect_requested` on receipt and `redirect_issued` on HTTP 302.
  // Never emits `destination_opened` or claims confirmed human QR scans.
  app.get('/r/:token', (req: Request, res: Response) => {
    const token = req.params.token;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const outcome = edisonStore.resolveQrRedirect(token, clientIp, userAgent, {
      secPurpose: req.get('sec-purpose'),
      purpose: req.get('purpose'),
      xMoz: req.get('x-moz'),
    });

    if (!outcome.ok) {
      res.status(outcome.statusCode).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EDISON QR Link Unavailable</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { max-width: 440px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 14px; color: #475569; line-height: 1.5; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>QR Destination Unavailable</h1>
      <p>${escapeHtml(outcome.reason)}</p>
    </div>
  </body>
</html>`);
      return;
    }

    res.redirect(302, outcome.record.resolvedUrl);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EDISON server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EDISON server:', err);
  process.exit(1);
});
