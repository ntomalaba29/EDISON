import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import {
  ALL_CAMPAIGN_STATUSES,
  ALLOWED_CAMPAIGN_TRANSITIONS,
  ALL_OPPORTUNITY_CATEGORIES,
  edisonStore,
} from './store.ts';
import type { EdisonDataRepository } from './repository.ts';
import {
  STATIC_ASSET_SECURITY_HEADERS,
  UPLOADS_DIR,
  resolveSafeUploadPath,
  saveValidatedMediaUpload,
} from './mediaSecurity.ts';
import { validateQrDestination } from './qrValidator.ts';
import { getGovernanceDocById, listGovernanceDocs } from './docsRegistry.ts';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  InMemoryRateLimiter,
  SESSION_COOKIE_NAME,
  apiErrorMiddleware,
  apiTimeoutMiddleware,
  buildClearCookieOptions,
  buildHardenedCookieOptions,
  generateCsrfToken,
  isSameOriginRequest,
  neutralizeCsvCell,
  parseCookies,
  requestCorrelationMiddleware,
  securityHeadersMiddleware,
  timingSafeMatch,
  type CorrelatedRequest,
  type RequestTelemetryEntry,
} from './security.ts';
import { edisonTvControlEngine } from './tvPlatformAdapter.ts';
import { localOfflineIntelCache } from './offlineIntelCache.ts';
import {
  adCreativeAttachSchema,
  adCreativeSaveSchema,
  adminAppealResolveSchema,
  adminClearQrFlagSchema,
  adminComplaintUpdateSchema,
  adminQrModerateSchema,
  adminVerifyProfileSchema,
  adminVerifyTiersSchema,
  advertiserProfilePutSchema,
  appealCreateSchema,
  auditLogExportQuerySchema,
  auditLogQuerySchema,
  campaignCreateSchema,
  campaignQuerySchema,
  campaignTransitionSchema,
  campaignUpdateSchema,
  complaintCreateSchema,
  loginSchema,
  mediaUploadSchema,
  offlineCacheEvaluateBreakSchema,
  offlineCacheRollbackSchema,
  offlineCacheStageSchema,
  offlineQueueDrainSchema,
  offlineQueueEnqueueSchema,
  opportunityCreateSchema,
  parseWithZod,
  physicalQrTestCreateSchema,
  qrCreateSchema,
  qrStatusPatchSchema,
  qrValidateSchema,
  registerSchema,
  sharedIntelActionSchema,
  sharedIntelObservationSchema,
  simulatorBreakScheduleSchema,
  simulatorEventSchema,
  supportTicketCreateSchema,
  supportTicketStatusSchema,
  tvBreakLifecycleSchema,
  tvCadenceSimulateSchema,
  tvConformanceVectorsSchema,
  tvFaultSuiteSchema,
  tvRemoteSimulateSchema,
} from './validationSchemas.ts';
import type {
  OptionAComposition,
  OptionBUploadSpec,
  PublicUser,
  QrDestinationType,
  SessionRecord,
  TextOnlyCommercialSpec,
} from '../types/edison.ts';

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

interface AuthenticatedRequest extends CorrelatedRequest {
  currentUser?: PublicUser | null;
  currentSession?: SessionRecord | null;
  sessionToken?: string;
  authTransport?: 'bearer' | 'cookie' | 'none';
}

export interface EdisonRateLimitOptions {
  authMax?: number;
  authWindowMs?: number;
  redirectMax?: number;
  redirectWindowMs?: number;
  mutationMax?: number;
  mutationWindowMs?: number;
  uploadMax?: number;
  uploadWindowMs?: number;
}

function extractSessionToken(req: Request): {
  token: string | undefined;
  transport: 'bearer' | 'cookie' | 'none';
} {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    return { token: bearer || undefined, transport: bearer ? 'bearer' : 'none' };
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  return { token: cookieToken || undefined, transport: cookieToken ? 'cookie' : 'none' };
}

function setAuthCookies(req: Request, res: Response, rawToken: string, csrfToken: string): void {
  res.cookie(
    SESSION_COOKIE_NAME,
    rawToken,
    buildHardenedCookieOptions(req, { httpOnly: true, maxAgeMs: SEVEN_DAYS_MS })
  );
  res.cookie(
    CSRF_COOKIE_NAME,
    csrfToken,
    buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function mapErrorStatus(err: unknown, defaultCode = 400): { code: number; message: string } {
  const message = err instanceof Error ? err.message : 'Request failed.';
  if (message.startsWith('FORBIDDEN:')) return { code: 403, message };
  if (message.toLowerCase().includes('not found')) return { code: 404, message };
  return { code: defaultCode, message };
}

function sendValidationError(
  res: Response,
  parsed: { ok: false; error: string; validationIssues: Array<{ path: string; message: string }> }
): void {
  res.status(400).json({
    error: parsed.error,
    validationIssues: parsed.validationIssues,
  });
}

export function createEdisonApp(
  store: EdisonDataRepository = edisonStore,
  options?: {
    uploadsDir?: string;
    rateLimits?: EdisonRateLimitOptions;
    requestTimeoutMs?: number;
  }
): Express {
  const uploadsDir = options?.uploadsDir ?? UPLOADS_DIR;
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  const recentTelemetry: RequestTelemetryEntry[] = [];
  const recordRequestTelemetry = (entry: RequestTelemetryEntry) => {
    if (entry.path.startsWith('/api') || entry.path.startsWith('/r/')) {
      recentTelemetry.unshift(entry);
      if (recentTelemetry.length > 200) {
        recentTelemetry.length = 200;
      }
    }
  };

  const limiter = new InMemoryRateLimiter();
  const rl = options?.rateLimits ?? {};

  const authRateMiddleware = limiter.middleware(
    {
      name: 'auth',
      windowMs: rl.authWindowMs ?? 15 * 60 * 1000,
      maxRequests: rl.authMax ?? 25,
    },
    (req) => req.ip || 'unknown'
  );

  const uploadRateMiddleware = limiter.middleware(
    {
      name: 'media-upload',
      windowMs: rl.uploadWindowMs ?? 60 * 1000,
      maxRequests: rl.uploadMax ?? 30,
    },
    (req: AuthenticatedRequest) => req.currentUser?.id || req.ip || 'unknown'
  );

  const redirectRateMiddleware = limiter.middleware(
    {
      name: 'qr-redirect',
      windowMs: rl.redirectWindowMs ?? 60 * 1000,
      maxRequests: rl.redirectMax ?? 200,
    },
    (req) => req.ip || 'unknown'
  );

  const mutationRateMiddleware = limiter.middleware(
    {
      name: 'api-mutation',
      windowMs: rl.mutationWindowMs ?? 60 * 1000,
      maxRequests: rl.mutationMax ?? 240,
    },
    (req: AuthenticatedRequest) => req.currentUser?.id || req.ip || 'unknown'
  );

  function attachSession(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const { token, transport } = extractSessionToken(req);
    req.sessionToken = token;
    req.authTransport = transport;
    const resolved = store.getSessionByToken(token);
    req.currentUser = resolved?.user ?? null;
    req.currentSession = resolved?.session ?? null;
    if (resolved && token) {
      store.touchSessionActivity(token);
    }
    next();
  }

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.currentUser || !req.currentSession) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    next();
  }

  function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.currentUser || !req.currentSession) {
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

  const CSRF_PUBLIC_BOOTSTRAP_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/qr/validate',
  ]);

  function requireCsrfAndSameOrigin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }

    const fullPath = req.originalUrl.split('?')[0];

    if (!isSameOriginRequest(req)) {
      store.recordSecurityAudit(
        req.currentUser ?? null,
        'SECURITY_CROSS_ORIGIN_REJECTED',
        fullPath,
        `Rejected cross-origin ${method} to ${fullPath} (origin=${req.get('origin') || 'none'}).`
      );
      res.status(403).json({
        error: 'Cross-origin state-changing request rejected by same-origin policy.',
      });
      return;
    }

    if (CSRF_PUBLIC_BOOTSTRAP_PATHS.has(fullPath)) {
      next();
      return;
    }

    // Explicit Authorization: Bearer clients do not send ambient cookies
    if (req.authTransport === 'bearer') {
      next();
      return;
    }

    // Idempotent logout when no valid session cookie is present
    if (fullPath === '/api/auth/logout' && !req.currentSession) {
      next();
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieCsrf = cookies[CSRF_COOKIE_NAME];
    const headerCsrf = req.get(CSRF_HEADER_NAME);
    const sessionBoundOk = req.currentSession
      ? timingSafeMatch(req.currentSession.csrfToken, headerCsrf)
      : true;

    if (!cookieCsrf || !headerCsrf || !timingSafeMatch(cookieCsrf, headerCsrf) || !sessionBoundOk) {
      store.recordSecurityAudit(
        req.currentUser ?? null,
        'SECURITY_CSRF_REJECTED',
        fullPath,
        `CSRF token missing or mismatched on ${method} ${fullPath}.`
      );
      res.status(403).json({
        error: 'CSRF validation failed. Refresh security token and retry.',
      });
      return;
    }

    next();
  }

  app.use(securityHeadersMiddleware);
  app.use(requestCorrelationMiddleware(recordRequestTelemetry));
  app.use('/api', apiTimeoutMiddleware(options?.requestTimeoutMs ?? 15_000));
  app.use(attachSession);
  app.use('/api', requireCsrfAndSameOrigin);
  app.use('/api', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }
    if (
      req.path === '/auth/login' ||
      req.path === '/auth/register' ||
      req.path === '/media/upload' ||
      req.path === '/qr/validate'
    ) {
      next();
      return;
    }
    mutationRateMiddleware(req, res, next);
  });

  // Validated media upload endpoint (auth + CSRF + upload rate limit before parsing 26MB JSON)
  app.post(
    '/api/media/upload',
    requireAuth,
    uploadRateMiddleware,
    express.json({ limit: '26mb' }),
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(mediaUploadSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = saveValidatedMediaUpload({
          dataBase64: parsed.data.dataBase64,
          declaredKind: parsed.data.declaredKind,
          uploadsDir,
        });
        store.recordMediaUploadAudit(
          req.currentUser!,
          result.storedFileName,
          result.mimeType,
          result.fileSizeBytes
        );
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  // Serve strictly validated uploaded media with hardened CSP, CORP, and nosniff headers
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const resolved = resolveSafeUploadPath(req.params.filename, uploadsDir);
    if (!resolved) {
      res.status(404).json({ error: 'Uploaded media asset not found.' });
      return;
    }
    for (const [header, value] of Object.entries(STATIC_ASSET_SECURITY_HEADERS)) {
      res.setHeader(header, value);
    }
    res.setHeader('Content-Type', resolved.contentType);
    res.sendFile(resolved.fullPath);
  });

  app.use(express.json({ limit: '1mb' }));

  // Health & prototype status
  app.get('/api/health', (_req: Request, res: Response) => {
    const live = store.getLiveReportSnapshot();
    const storageBackend = store.getStorageBackendMetadata();
    res.json({
      ok: true,
      service: 'edison-prototype-server',
      phase: live.phase,
      block: live.block,
      storageBackend,
      progressMetrics: live.progressMetrics,
      summary: live.summary,
    });
  });

  // Live non-sensitive formal report snapshot for Reports & Copy Console
  app.get('/api/reports/live', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(store.getLiveReportSnapshot());
  });

  // Read-only governance & architecture documentation endpoints (strict allowlist of 25 Markdown files)
  app.get('/api/docs', (_req: Request, res: Response) => {
    try {
      res.json({ items: listGovernanceDocs() });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 500);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/docs/:id', (req: Request, res: Response) => {
    try {
      const doc = getGovernanceDocById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Governance document not found.' });
        return;
      }
      res.json({ item: doc });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 500);
      res.status(code).json({ error: message });
    }
  });

  // Auth, CSRF Bootstrap & RBAC endpoints
  app.get('/api/auth/csrf', (req: AuthenticatedRequest, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const csrfToken =
      req.currentSession?.csrfToken || cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
    res.cookie(
      CSRF_COOKIE_NAME,
      csrfToken,
      buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
    );
    res.json({ csrfToken });
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    if (req.currentSession?.csrfToken) {
      const cookies = parseCookies(req.headers.cookie);
      if (!timingSafeMatch(req.currentSession.csrfToken, cookies[CSRF_COOKIE_NAME])) {
        res.cookie(
          CSRF_COOKIE_NAME,
          req.currentSession.csrfToken,
          buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
        );
      }
    }
    res.json({
      user: req.currentUser ?? null,
      csrfToken: req.currentSession?.csrfToken ?? null,
      summary: store.getFoundationSummary(),
    });
  });

  app.post('/api/auth/register', authRateMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(registerSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }

    try {
      const { user, session } = store.registerUser(parsed.data, req.sessionToken);
      setAuthCookies(req, res, session.token, session.csrfToken);
      res.status(201).json({
        user,
        token: session.token,
        csrfToken: session.csrfToken,
      });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to register user.',
      });
    }
  });

  app.post('/api/auth/login', authRateMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(loginSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }

    try {
      const { user, session } = store.loginUser(
        parsed.data.email,
        parsed.data.password,
        req.sessionToken
      );
      setAuthCookies(req, res, session.token, session.csrfToken);
      res.json({
        user,
        token: session.token,
        csrfToken: session.csrfToken,
      });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Invalid credentials.',
      });
    }
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    store.logoutSession(req.sessionToken);
    res.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(req, true));
    res.clearCookie(CSRF_COOKIE_NAME, buildClearCookieOptions(req, false));
    res.json({ ok: true });
  });

  // QR Destination Validation & Management
  app.post('/api/qr/validate', redirectRateMiddleware, (req: Request, res: Response) => {
    const parsed = parseWithZod(qrValidateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const result = validateQrDestination(
      parsed.data.rawInput,
      parsed.data.destinationType as QrDestinationType
    );
    res.json(result);
  });

  app.get('/api/qr', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    res.json({
      items: store.listQrLinksForUser(user),
    });
  });

  app.post('/api/qr', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(qrCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const record = store.createQrLink(req.currentUser!, {
        label: parsed.data.label,
        destinationType: parsed.data.destinationType as QrDestinationType,
        rawInput: parsed.data.rawInput,
      });
      res.status(201).json({ item: record });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid QR destination.',
      });
    }
  });

  app.patch('/api/qr/:token/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(qrStatusPatchSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const updated = store.updateQrStatus(req.currentUser!, req.params.token, parsed.data.status);
      res.json({ item: updated });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  // --- Advertiser Profile Endpoints (Block 2.2) ---
  app.get('/api/advertiser/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const profile = store.getAdvertiserProfile(req.currentUser!);
    res.json({ profile });
  });

  app.put('/api/advertiser/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(advertiserProfilePutSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const profile = store.upsertAdvertiserProfile(req.currentUser!, parsed.data);
      res.json({ profile });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/admin/advertiser-profiles', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listAllAdvertiserProfiles() });
  });

  app.patch(
    '/api/admin/advertiser-profiles/:userId/verification',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminVerifyProfileSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const profile = store.adminUpdateAdvertiserVerification(
          req.currentUser!,
          req.params.userId,
          parsed.data.status,
          parsed.data.notes
        );
        res.json({ profile });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Campaign Management Endpoints (Block 2.2) ---
  app.get('/api/campaigns', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsedQuery = parseWithZod(campaignQuerySchema, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    if (!parsedQuery.ok) {
      sendValidationError(res, parsedQuery);
      return;
    }
    const items = store.listCampaignsForUser(req.currentUser!, parsedQuery.data.status);
    res.json({
      items,
      statuses: ALL_CAMPAIGN_STATUSES,
      transitions: ALLOWED_CAMPAIGN_TRANSITIONS,
    });
  });

  app.post('/api/campaigns', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(campaignCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.createCampaign(req.currentUser!, {
        title: d.title,
        contentCategory: d.contentCategory,
        summary: d.summary,
        qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
        durationSeconds: d.durationSeconds,
        dailyFrequencyCap: d.dailyFrequencyCap,
        targetRegions: Array.isArray(d.targetRegions)
          ? d.targetRegions
          : d.targetRegions.split(','),
        dayparts: d.dayparts,
        startDate: d.startDate,
        endDate: d.endDate,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch('/api/campaigns/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(campaignUpdateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.updateCampaign(req.currentUser!, req.params.id, {
        title: d.title,
        contentCategory: d.contentCategory,
        summary: d.summary,
        qrToken: d.qrToken !== undefined ? (d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null) : undefined,
        durationSeconds: d.durationSeconds,
        dailyFrequencyCap: d.dailyFrequencyCap,
        targetRegions:
          d.targetRegions === undefined
            ? undefined
            : Array.isArray(d.targetRegions)
            ? d.targetRegions
            : d.targetRegions.split(','),
        dayparts: d.dayparts,
        startDate: d.startDate,
        endDate: d.endDate,
      });
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/campaigns/:id/clone', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = store.cloneCampaign(req.currentUser!, req.params.id);
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/campaigns/:id/transition', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(campaignTransitionSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.transitionCampaignStatus(
        req.currentUser!,
        req.params.id,
        parsed.data.targetStatus,
        {
          rejectionReason: parsed.data.rejectionReason,
          fixInstructions: parsed.data.fixInstructions,
        }
      );
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete('/api/campaigns/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      store.deleteCampaign(req.currentUser!, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  // --- 16:9 TV Preview Gate & Commercial-Break Simulator Telemetry (Block 2.4) ---
  app.get(
    '/api/campaigns/:id/preview-gate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const gate = store.evaluateCampaignPreSubmitGate(req.currentUser!, req.params.id);
        res.json({ gate });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post('/api/simulator/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(simulatorEventSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const event = store.recordSimulatedPlaybackEvent(req.currentUser!, {
      campaignId: parsed.data.campaignId && parsed.data.campaignId.trim() ? parsed.data.campaignId.trim() : null,
      qrToken: parsed.data.qrToken && parsed.data.qrToken.trim() ? parsed.data.qrToken.trim() : null,
      eventType: parsed.data.eventType,
    });
    res.status(201).json({ event });
  });

  app.post(
    '/api/simulator/schedule-break',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(simulatorBreakScheduleSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const plan = store.planSimulatedBreak(req.currentUser!, parsed.data);
      res.json({ plan });
    }
  );

  // --- Advertisement Creation Studio Endpoints (Block 2.3) ---
  app.get('/api/ad-creatives', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listAdCreativesForUser(req.currentUser!) });
  });

  app.post('/api/ad-creatives', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(adCreativeSaveSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.saveAdCreative(req.currentUser!, {
        campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
        qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
        title: d.title,
        mode: d.mode,
        displayDurationSeconds: d.displayDurationSeconds,
        safeZoneWarnings: d.safeZoneWarnings,
        contrastWarnings: d.contrastWarnings,
        optionA: d.mode === 'option_a_studio' ? (d.optionA as unknown as OptionAComposition) : null,
        optionB: d.mode === 'option_b_upload' ? (d.optionB as unknown as OptionBUploadSpec) : null,
        textOnly:
          d.mode === 'text_only_commercial'
            ? (d.textOnly as unknown as TextOnlyCommercialSpec)
            : null,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.put('/api/ad-creatives/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(adCreativeSaveSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.saveAdCreative(req.currentUser!, {
        id: req.params.id,
        campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
        qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
        title: d.title,
        mode: d.mode,
        displayDurationSeconds: d.displayDurationSeconds,
        safeZoneWarnings: d.safeZoneWarnings,
        contrastWarnings: d.contrastWarnings,
        optionA: d.mode === 'option_a_studio' ? (d.optionA as unknown as OptionAComposition) : null,
        optionB: d.mode === 'option_b_upload' ? (d.optionB as unknown as OptionBUploadSpec) : null,
        textOnly:
          d.mode === 'text_only_commercial'
            ? (d.textOnly as unknown as TextOnlyCommercialSpec)
            : null,
      });
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/ad-creatives/:id/attach', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(adCreativeAttachSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const result = store.attachAdCreativeToCampaign(
        req.currentUser!,
        req.params.id,
        parsed.data.campaignId
      );
      res.json(result);
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete('/api/ad-creatives/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      store.deleteAdCreative(req.currentUser!, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  // --- Support & Dispute Tickets (Block 2.2) ---
  app.get('/api/support-tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listSupportTicketsForUser(req.currentUser!) });
  });

  app.post('/api/support-tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(supportTicketCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.createSupportTicket(req.currentUser!, {
        campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
        category: d.category,
        subject: d.subject,
        message: d.message,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch(
    '/api/support-tickets/:id/status',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(supportTicketStatusSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.updateSupportTicketStatus(
          req.currentUser!,
          req.params.id,
          parsed.data.status,
          parsed.data.adminResponse
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Opportunity Management, 3-Tier Verification, Complaints & Appeals (Block 2.5) ---
  app.get('/api/opportunities', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      items: store.listOpportunitiesForUser(req.currentUser!),
      categories: ALL_OPPORTUNITY_CATEGORIES,
    });
  });

  app.post('/api/opportunities', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(opportunityCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const d = parsed.data;
    try {
      const item = store.createOpportunity(req.currentUser!, {
        providerType: d.providerType,
        providerName: d.providerName,
        category: d.category,
        title: d.title,
        description: d.description,
        location: d.location,
        eligibilityRequirements: d.eligibilityRequirements,
        applicationMethod: d.applicationMethod,
        contactInfo: d.contactInfo,
        qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
        linkedCampaignId:
          d.linkedCampaignId && d.linkedCampaignId.trim() ? d.linkedCampaignId.trim() : null,
        closingDate: d.closingDate,
        expiryDate: d.expiryDate,
        identityEvidenceRef: d.identityEvidenceRef,
        organisationEvidenceRef: d.organisationEvidenceRef,
        specificOpportunityEvidenceRef: d.specificOpportunityEvidenceRef,
        applicationFeeFreeConfirmed: d.applicationFeeFreeConfirmed,
        noGuaranteeConfirmed: d.noGuaranteeConfirmed,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/opportunities/:id/submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = store.submitOpportunity(req.currentUser!, req.params.id);
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete('/api/opportunities/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      store.deleteOpportunity(req.currentUser!, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch(
    '/api/admin/opportunities/:id/verify-tiers',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminVerifyTiersSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.adminUpdateOpportunityVerification(
          req.currentUser!,
          req.params.id,
          parsed.data
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/opportunity-complaints', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listOpportunityComplaintsForUser(req.currentUser!) });
  });

  app.post(
    '/api/opportunities/:id/complaints',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(complaintCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.createOpportunityComplaint(
          req.currentUser!,
          req.params.id,
          parsed.data
        );
        res.status(201).json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.patch(
    '/api/admin/opportunity-complaints/:complaintId',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminComplaintUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.adminUpdateComplaintStatus(
          req.currentUser!,
          req.params.complaintId,
          parsed.data
        );
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/opportunity-appeals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listOpportunityAppealsForUser(req.currentUser!) });
  });

  app.post(
    '/api/opportunities/:id/appeals',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(appealCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.createOpportunityAppeal(req.currentUser!, req.params.id, parsed.data);
        res.status(201).json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.patch(
    '/api/admin/opportunity-appeals/:appealId',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminAppealResolveSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.adminResolveAppeal(
          req.currentUser!,
          req.params.appealId,
          parsed.data
        );
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // Admin Moderation Overview, QR Moderation, Creative Flag Clearance & 7-Stage Analytics (Block 2.6)
  app.get(
    '/api/admin/moderation-overview',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        res.json(store.getAdminModerationOverview(req.currentUser!));
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.patch(
    '/api/admin/qr/:token/moderate',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminQrModerateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.adminModerateQrLink(
          req.currentUser!,
          req.params.token,
          parsed.data.status,
          parsed.data.reason
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/admin/creatives/:id/clear-qr-flag',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminClearQrFlagSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.adminClearCreativeQrFlag(
          req.currentUser!,
          req.params.id,
          parsed.data.notes
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/analytics/funnel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const campaignId =
      typeof req.query.campaignId === 'string' && req.query.campaignId.trim()
        ? req.query.campaignId.trim()
        : null;
    try {
      res.json(store.getSevenStageAnalyticsFunnel(req.currentUser!, campaignId));
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get(
    '/api/analytics/revenue-ledger',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        res.json({ ledger: store.getRevenueLedgerSnapshot(req.currentUser!) });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Physical Mobile QR Scan Testing & Final Prototype Readiness (Block 2.7 / Block P3-A) ---
  app.get(
    '/api/qa/prototype-readiness',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        res.json(store.getPrototypeReadinessSnapshot(req.currentUser!));
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/qa/qr-watch/:token', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(store.getQrWatchSnapshot(req.currentUser!, req.params.token));
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/qa/physical-qr-tests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: store.listPhysicalQrScanTests(req.currentUser!) });
  });

  app.post('/api/qa/physical-qr-tests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(physicalQrTestCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.recordPhysicalQrScanTest(req.currentUser!, parsed.data);
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete(
    '/api/qa/physical-qr-tests/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        store.deletePhysicalQrScanTest(req.currentUser!, req.params.id);
        res.json({ ok: true });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / MOCK SIMULATION ONLY) ---
  app.get(
    '/api/shared-intelligence/preview',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(store.getSharedIntelPreviewState());
    }
  );

  app.post(
    '/api/shared-intelligence/observations',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const rawBody = (req.body ?? {}) as Record<string, unknown>;
      const parsed = parseWithZod(sharedIntelObservationSchema, rawBody);
      if (!parsed.ok) {
        if (parsed.error.includes('Zero-PII policy violation')) {
          store.recordSharedIntelPiiRejection(
            typeof rawBody.scopeId === 'string' ? rawBody.scopeId : undefined,
            parsed.error
          );
        }
        sendValidationError(res, parsed);
        return;
      }

      try {
        const result = store.submitSharedIntelPreviewObservation(req.currentUser!, {
          ...parsed.data,
          rawPayload: rawBody,
        });
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/shared-intelligence/simulate-action',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(sharedIntelActionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const state = store.runSharedIntelPreviewAction(req.currentUser!, parsed.data);
        res.json({ state });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Software-Only Phase 4 Modular TV Adapter & AURA Normal Everyday Remote Simulator (Block P3-C) ---
  app.get('/api/tv-adapters/profiles', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      stageP6Deferred: true,
      profiles: edisonTvControlEngine.listCapabilityProfiles(),
    });
  });

  app.post(
    '/api/tv-adapters/remote-simulate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvRemoteSimulateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      const result = edisonTvControlEngine.dispatchRemoteCommand({
        platformId: d.platformId,
        intentSource: d.intentSource,
        command: d.command,
        targetInput: d.targetInput,
        faultMode: d.faultMode,
        simulateActiveAdSession: d.simulateActiveAdSession,
        currentState: d.currentState,
      });
      store.recordSecurityAudit(
        req.currentUser!,
        'TV_ADAPTER_REMOTE_SIMULATED',
        d.platformId,
        `[${req.requestId ?? 'req'}] ${d.intentSource} -> ${d.command} (fault=${d.faultMode}, outcome=${result.restorationOutcome})`
      );
      res.json(result);
    }
  );

  // --- Phase 4 Block 4.1: Software-First Smart TV Adapter Harnesses & Local Offline Intelligence Cache ---
  app.post(
    '/api/tv-adapters/break-lifecycle',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvBreakLifecycleSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      const result = edisonTvControlEngine.runBreakLifecycle({
        platformId: d.platformId,
        action: d.action,
        faultMode: d.faultMode,
        currentState: d.currentState,
      });
      store.recordSecurityAudit(
        req.currentUser!,
        'TV_ADAPTER_BREAK_LIFECYCLE',
        d.platformId,
        `[${req.requestId ?? 'req'}] ${d.action} (${result.harnessTelemetry.harnessName}, fault=${d.faultMode}, phase=${result.harnessTelemetry.harnessPhase})`
      );
      res.json(result);
    }
  );

  app.post(
    '/api/tv-adapters/fault-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvFaultSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = edisonTvControlEngine.runDeterministicFaultSuite(parsed.data.platformId);
      store.recordSecurityAudit(
        req.currentUser!,
        'TV_ADAPTER_FAULT_SUITE_RUN',
        parsed.data.platformId ?? 'all_platforms',
        `[${req.requestId ?? 'req'}] Deterministic fault suite ${report.passedCases}/${report.totalCases} passed (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  app.get(
    '/api/offline-intel-cache/state',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(localOfflineIntelCache.getSnapshot());
    }
  );

  app.post(
    '/api/offline-intel-cache/stage-swap',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheStageSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = localOfflineIntelCache.stageAndAtomicSwap(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        result.ok ? 'OFFLINE_CACHE_ATOMIC_SWAP' : 'OFFLINE_CACHE_SWAP_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.status(result.ok ? 200 : 400).json({
        ...result,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/rollback',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheRollbackSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = localOfflineIntelCache.rollbackScope(parsed.data.scopeId);
      store.recordSecurityAudit(
        req.currentUser!,
        result.ok ? 'OFFLINE_CACHE_ROLLBACK' : 'OFFLINE_CACHE_ROLLBACK_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.status(result.ok ? 200 : 400).json({
        ...result,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/evaluate-break',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheEvaluateBreakSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const evaluation = localOfflineIntelCache.evaluateOfflineBreakEligibility(parsed.data);
      res.json({
        ...evaluation,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  // --- Phase 4 Block 4.2: Offline Telemetry Sync Queue, Multi-Channel Cadence & Conformance Vectors ---
  app.get('/api/tv-adapters/channels', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      channels: edisonTvControlEngine.listChannelBindings(),
    });
  });

  app.post(
    '/api/offline-intel-cache/queue-observation',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineQueueEnqueueSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const queued = localOfflineIntelCache.enqueueOfflineObservation(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        queued.ok
          ? queued.deduplicatedReplay
            ? 'OFFLINE_QUEUE_REPLAY_DEDUPED'
            : 'OFFLINE_QUEUE_OBSERVATION_ADDED'
          : 'OFFLINE_QUEUE_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${queued.detail}`
      );
      res.status(queued.ok ? 200 : 400).json({
        ...queued,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/drain-queue',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineQueueDrainSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const drain = localOfflineIntelCache.drainObservationQueue(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        drain.ok ? 'OFFLINE_QUEUE_DRAINED' : 'OFFLINE_QUEUE_DRAIN_OFFLINE_HELD',
        'all_scopes',
        `[${req.requestId ?? 'req'}] ${drain.detail}`
      );
      res.json({
        ...drain,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/tv-adapters/cadence-simulate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvCadenceSimulateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = edisonTvControlEngine.runBroadcastCadenceSimulation(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        'TV_ADAPTER_CADENCE_SIMULATED',
        `${parsed.data.platformId}:ch${parsed.data.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.json({
        ...result,
        cacheState: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/tv-adapters/conformance-vectors',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvConformanceVectorsSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = edisonTvControlEngine.runEmulatorConformanceVectors();
      store.recordSecurityAudit(
        req.currentUser!,
        'TV_EMULATOR_CONFORMANCE_RUN',
        'all_platforms',
        `[${req.requestId ?? 'req'}] Ran ${report.passedVectors}/${report.totalVectors} emulator conformance vectors (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // Admin-only Audit Log, Hardened Export & Request Telemetry Endpoints
  app.get('/api/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const parsedQuery = parseWithZod(auditLogQuerySchema, {
      targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
    });
    if (!parsedQuery.ok) {
      sendValidationError(res, parsedQuery);
      return;
    }
    res.json({
      items: store.listAuditLogs({
        targetType: parsedQuery.data.targetType,
        limit: parsedQuery.data.limit,
      }),
    });
  });

  app.get(
    '/api/admin/audit-logs/export',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsedQuery = parseWithZod(auditLogExportQuerySchema, {
        targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
        format: typeof req.query.format === 'string' ? req.query.format : undefined,
      });
      if (!parsedQuery.ok) {
        sendValidationError(res, parsedQuery);
        return;
      }

      const { targetType, limit, format } = parsedQuery.data;
      const items = store.listAuditLogs({ targetType, limit });

      store.recordSecurityAudit(
        req.currentUser!,
        'ADMIN_AUDIT_LOG_EXPORTED',
        targetType,
        `[${req.requestId ?? 'req'}] Exported ${items.length} audit log row(s) as ${format.toUpperCase()}.`
      );

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="edison-audit-logs.${format}"`
      );

      if (format === 'csv') {
        const header = ['id', 'createdAt', 'actorId', 'actorRole', 'action', 'targetType', 'targetId', 'detail'].join(',');
        const lines = items.map((row) =>
          [
            neutralizeCsvCell(row.id),
            neutralizeCsvCell(row.createdAt),
            neutralizeCsvCell(row.actorId ?? ''),
            neutralizeCsvCell(row.actorRole),
            neutralizeCsvCell(row.action),
            neutralizeCsvCell(row.targetType),
            neutralizeCsvCell(row.targetId),
            neutralizeCsvCell(row.detail),
          ].join(',')
        );
        res.type('text/csv; charset=utf-8').send([header, ...lines].join('\n'));
        return;
      }

      res.json({
        exportedAt: new Date().toISOString(),
        requestId: req.requestId ?? null,
        targetType,
        count: items.length,
        items,
      });
    }
  );

  app.get(
    '/api/admin/request-telemetry',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        requestId: req.requestId ?? null,
        count: recentTelemetry.length,
        items: recentTelemetry.slice(0, 50),
      });
    }
  );

  app.get('/api/qr/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    const allowedTokens = new Set(store.listQrLinksForUser(user).map((q) => q.token));
    const events = store
      .listAnalyticsEvents(100)
      .filter((e) => user.role === 'admin' || (e.qrToken && allowedTokens.has(e.qrToken)));
    res.json({ items: events });
  });

  // Real Direct-to-Destination QR Tracking Redirect (/r/:token)
  // Records `redirect_requested` on receipt and `redirect_issued` on HTTP 302.
  // Never emits `destination_opened` or claims confirmed human QR scans.
  app.get('/r/:token', redirectRateMiddleware, (req: Request, res: Response) => {
    const token = req.params.token;
    const clientIp = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const outcome = store.resolveQrRedirect(token, clientIp, userAgent, {
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

  // Structured JSON error handler prevents Express HTML error pages or stack leaks on malformed JSON / runtime errors
  app.use(apiErrorMiddleware);

  return app;
}
