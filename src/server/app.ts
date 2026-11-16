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
  evaluateCompanionPolicyGuardrail,
  parseAndValidateBroadcastCue,
  runPhase4SoftwareExitSuite,
} from './broadcastMetadataParser.ts';
import { sharedIntelFleetService } from './sharedIntelFleetService.ts';
import {
  listChannelPredictorProfiles,
  predictBreakDurationQuantiles,
  runRecordedStreamCalibrationBenchmark,
} from './breakDurationPredictor.ts';
import {
  edisonDeliveryInfra,
  runDeliveryInfraVerificationSuite,
} from './adDeliveryInfra.ts';
import {
  buildAdvertiserOpsOverview,
  generateProFormaInvoiceBlueprint,
  runAdvertiserOpsVerificationSuite,
} from './advertiserOps.ts';
import {
  listCountryGeoConfigs,
  runTrackBVerificationSuite,
  toPublicHouseholdView,
} from './trackBHouseholdConsent.ts';
import {
  buildBroadcastRenderOverview,
  runBroadcastRenderVerificationSuite,
  validateCreativeForBroadcastRender,
} from './broadcastRenderValidator.ts';
import {
  runBroadcastRenderVerificationSuite as runBroadcastRenderJobVerificationSuite,
} from './broadcastRenderEngine.ts';
import { runOpportunityOpsVerificationSuite } from './opportunityOpsEngine.ts';
import { runPrivacyComplianceVerificationSuite } from './privacyComplianceEngine.ts';
import { runReliabilityChaosVerificationSuite } from './reliabilityChaosEngine.ts';
import { runPilotReadinessVerificationSuite } from './pilotReadinessEngine.ts';
import { runCommercialReadinessVerificationSuite } from './commercialReadinessEngine.ts';
import { runCountryLaunchVerificationSuite } from './countryLaunchEngine.ts';
import { runInternationalExpansionVerificationSuite } from './internationalExpansionEngine.ts';
import fs from 'node:fs';
import path from 'node:path';
import { auraRemoteEngine } from './auraRemoteEngine.ts';
import { commercialDisputeEngine } from './commercialDisputeEngine.ts';
import { EDISON_I18N_BUNDLES, getTranslationBundle } from '../i18n/translations.ts';
import { logStructured } from './logger.ts';
import { FfmpegMediaWorker, edisonMediaWorker } from './mediaWorker.ts';
import { createPgliteExecutor } from './postgres/executor.ts';
import {
  exportPostgresBackupSql,
  importJsonStoreToPostgres,
  probePostgresReadiness,
} from './postgres/jsonToPostgresMigrator.ts';
import { loadMigrationDescriptors } from './postgres/migrator.ts';
import { reliabilityMonitor } from './reliabilityMonitor.ts';
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
  auraBindProfileSchema,
  auraCommandSchema,
  auraConfirmPairingSchema,
  auraHeartbeatSchema,
  auraInitiatePairingSchema,
  breakDurationPredictSchema,
  broadcastCueParseSchema,
  broadcastRenderValidateSchema,
  campaignCreateSchema,
  campaignQuerySchema,
  campaignTransitionSchema,
  campaignUpdateSchema,
  commercialBoardDecisionSchema,
  commercialCostAssumptionsSchema,
  commercialDisputeCreateSchema,
  commercialDisputeResolveSchema,
  companionPolicyEvalSchema,
  complaintCreateSchema,
  countryLaunchDecisionSchema,
  countryPolicyUpdateSchema,
  deliveryEventIngestBatchSchema,
  deliveryManifestRequestSchema,
  emptyStrictSchema,
  fleetDeltaSyncSchema,
  fleetDeviceRegisterSchema,
  fleetFprReportSchema,
  fleetObservationSubmitSchema,
  hdmiCecEvaluateSchema,
  householdConsentRestoreSchema,
  householdConsentWithdrawSchema,
  householdCreateSchema,
  householdDisplaySettingsPatchSchema,
  householdDsrEraseSchema,
  householdLocationSchema,
  householdMemberCreateSchema,
  householdMemberDeleteSchema,
  householdMemberUpdateSchema,
  householdQrIssueSchema,
  internationalExpansionDecisionSchema,
  loginSchema,
  mediaUploadSchema,
  mediaWorkerProbeSchema,
  mediaWorkerTranscodeSchema,
  multiCurrencyEstimateSchema,
  offlineCacheEvaluateBreakSchema,
  offlineCacheRollbackSchema,
  offlineCacheStageSchema,
  offlineQueueDrainSchema,
  offlineQueueEnqueueSchema,
  opportunityCreateSchema,
  opportunityOpsSweepSchema,
  parseWithZod,
  phase4ExitSuiteSchema,
  physicalQrTestCreateSchema,
  pilotCohortCreateSchema,
  pilotTelemetryValidateSchema,
  privacyRetentionSweepSchema,
  proFormaBlueprintRequestSchema,
  qrCreateSchema,
  qrStatusPatchSchema,
  qrValidateSchema,
  regionalLocalizationUpdateSchema,
  registerSchema,
  reliabilityChaosProbeSchema,
  reliabilityFullSuiteSchema,
  renderCompileJobSchema,
  sharedIntelActionSchema,
  sharedIntelObservationSchema,
  simulatorBreakScheduleSchema,
  simulatorEventSchema,
  stageP6CheckPrepareSchema,
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
  const mediaWorker =
    options?.uploadsDir
      ? new FfmpegMediaWorker({ uploadsDir: options.uploadsDir })
      : edisonMediaWorker;

  const recordRequestTelemetry = (entry: RequestTelemetryEntry) => {
    reliabilityMonitor.recordHttpRequest(
      entry.statusCode,
      entry.durationMs,
      entry.path.startsWith('/r/')
    );
    if (entry.path.startsWith('/api') || entry.path.startsWith('/r/')) {
      recentTelemetry.unshift(entry);
      if (recentTelemetry.length > 200) {
        recentTelemetry.length = 200;
      }
    }
    if (entry.statusCode >= 500) {
      logStructured({
        level: 'error',
        component: 'http-api',
        event: 'HTTP_5XX',
        requestId: entry.requestId,
        detail: { method: entry.method, path: entry.path, statusCode: entry.statusCode },
      });
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
      const message = err instanceof Error ? err.message : 'Unable to register user.';
      res.status(message.startsWith('FORBIDDEN:') ? 403 : 409).json({
        error: message,
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
      const message = err instanceof Error ? err.message : 'Invalid credentials.';
      res.status(message.startsWith('FORBIDDEN:') ? 403 : 401).json({
        error: message,
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
      try {
        const plan = store.planSimulatedBreak(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ plan });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
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

  // Block 4.3: Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & Phase 4 Software Exit Gate
  app.post(
    '/api/tv-adapters/parse-cue',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(broadcastCueParseSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = parseAndValidateBroadcastCue(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        'BROADCAST_CUE_FIXTURE_PARSED',
        `${parsed.data.standard}:ch${parsed.data.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${result.action}: ${result.reason}`
      );
      res.json(result);
    }
  );

  app.post(
    '/api/tv-adapters/evaluate-policy',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(companionPolicyEvalSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const evaluation = evaluateCompanionPolicyGuardrail(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        'COMPANION_POLICY_EVALUATED',
        `${parsed.data.platformId}:${parsed.data.requestedCapability}`,
        `[${req.requestId ?? 'req'}] ${evaluation.decision}: ${evaluation.reason}`
      );
      res.json(evaluation);
    }
  );

  app.post(
    '/api/tv-adapters/phase4-exit-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(phase4ExitSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPhase4SoftwareExitSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'PHASE4_SOFTWARE_EXIT_SUITE_RUN',
        'phase4_exit',
        `[${req.requestId ?? 'req'}] Phase 4 software exit suite: ${report.passedChecks}/${report.totalChecks} checks passed (softwareExitReady=${report.softwareExitReady}, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // --- Phase 5 Block 5.1: Production Network-Wide Shared Ad Intelligence Fleet Service (ADR-016 / PRD-19) ---
  app.get(
    '/api/shared-intel-fleet/state',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(sharedIntelFleetService.getSnapshot());
    }
  );

  app.post(
    '/api/shared-intel-fleet/devices/register',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetDeviceRegisterSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const reg = sharedIntelFleetService.registerAttestedDevice(parsed.data);
        store.recordSecurityAudit(
          req.currentUser!,
          'FLEET_DEVICE_ATTESTATION_REGISTERED',
          parsed.data.tvDeviceId,
          `[${req.requestId ?? 'req'}] Registered attested TV ${parsed.data.tvDeviceId} (${parsed.data.country}/${parsed.data.platform}) for scope ${parsed.data.assignedScopeId}.`
        );
        res.status(201).json({
          ...reg,
          state: sharedIntelFleetService.getSnapshot(),
        });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/shared-intel-fleet/observations',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const rawBody = (req.body ?? {}) as Record<string, unknown>;
      const parsed = parseWithZod(fleetObservationSubmitSchema, rawBody);
      if (!parsed.ok) {
        if (parsed.error.includes('Zero-PII policy violation')) {
          store.recordSecurityAudit(
            req.currentUser!,
            'FLEET_ZERO_PII_REJECTED',
            typeof rawBody.scopeId === 'string' ? rawBody.scopeId : 'unknown',
            `[${req.requestId ?? 'req'}] ${parsed.error}`
          );
        }
        sendValidationError(res, parsed);
        return;
      }

      const d = parsed.data;
      const result = sharedIntelFleetService.submitSignedObservation({
        tvDeviceId: d.tvDeviceId,
        scopeId: d.scopeId,
        signalType: d.signalType,
        estimatedBreakDurationSec: d.estimatedBreakDurationSec,
        transitionLatencyMs: d.transitionLatencyMs,
        nonce: d.nonce,
        signatureHex: d.signatureHex,
        useRegisteredDemoSigner: d.useRegisteredDemoSigner,
        outlierAnomaly: d.outlierAnomaly,
        rawPayload: rawBody,
      });

      store.recordSecurityAudit(
        req.currentUser!,
        `FLEET_OBSERVATION_${result.trustDecision.toUpperCase()}`,
        d.scopeId,
        `[${req.requestId ?? 'req'}] ${d.tvDeviceId} -> ${result.trustDecision} (HTTP ${result.httpStatus})`
      );

      res.status(result.httpStatus).json({
        observation: result,
        state: sharedIntelFleetService.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/shared-intel-fleet/sync-delta',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetDeltaSyncSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const sync = sharedIntelFleetService.syncScopedDelta(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        `FLEET_DELTA_SYNC_${sync.status.toUpperCase()}`,
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${sync.detail}`
      );
      res.status(sync.ok ? 200 : 409).json({
        sync,
        state: sharedIntelFleetService.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/shared-intel-fleet/report-fpr',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetFprReportSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = sharedIntelFleetService.reportPostUpdateFpr(parsed.data);
        store.recordSecurityAudit(
          req.currentUser!,
          result.rollbackTriggered ? 'FLEET_AUTO_ROLLBACK_FPR' : 'FLEET_FPR_REPORTED',
          parsed.data.scopeId,
          `[${req.requestId ?? 'req'}] ${result.reason}`
        );
        res.json({
          report: result,
          state: sharedIntelFleetService.getSnapshot(),
        });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/shared-intel-fleet/scenarios-25-35',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = sharedIntelFleetService.runScenarios25To35Suite();
      store.recordSecurityAudit(
        req.currentUser!,
        'SHARED_INTEL_SCENARIOS_25_35_RUN',
        'phase5_shared_intel',
        `[${req.requestId ?? 'req'}] Scenarios 25-35 verified: ${report.passedScenarios}/${report.totalScenarios} passed (hardwareTested=false, stageP6Deferred=true).`
      );
      res.json(report);
    }
  );

  app.post(
    '/api/shared-intel-fleet/reset',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      sharedIntelFleetService.reset();
      store.recordSecurityAudit(
        req.currentUser!,
        'FLEET_SERVICE_RESET',
        'phase5_shared_intel',
        `[${req.requestId ?? 'req'}] Reset Shared Intelligence Fleet simulation state.`
      );
      res.json({ state: sharedIntelFleetService.getSnapshot() });
    }
  );

  // Phase 5 Block 5.2: Per-Channel Break Duration ML Lower-Bound (p10/p5) Predictor & Recorded Stream Calibration
  app.get(
    '/api/break-predictor/profiles',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        stageP6Deferred: true,
        profiles: listChannelPredictorProfiles(),
      });
    }
  );

  app.post(
    '/api/break-predictor/predict',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(breakDurationPredictSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const prediction = predictBreakDurationQuantiles(parsed.data);
      store.recordSecurityAudit(
        req.currentUser!,
        'BREAK_PREDICTOR_EVALUATED',
        `CH_${prediction.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${prediction.decision}: p5=${prediction.p5Sec}s p10=${prediction.p10Sec}s mean=${prediction.meanSec}s safeWindow=${prediction.effectiveSafeWindowSec}s (hardwareTested=false).`
      );
      res.json(prediction);
    }
  );

  app.post(
    '/api/break-predictor/calibrate-benchmark',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runRecordedStreamCalibrationBenchmark();
      store.recordSecurityAudit(
        req.currentUser!,
        'BREAK_CALIBRATION_BENCHMARK_RUN',
        'phase5_break_predictor',
        `[${req.requestId ?? 'req'}] Recorded stream benchmark: ${report.passedFixtures}/${report.totalFixtures} passed, FPR=${report.falsePositiveRatePct}%, MAE=${report.meanAbsoluteErrorSec}s, hardwareTested=false.`
      );
      res.json(report);
    }
  );

  // Phase 6 Block 6.1: Advertising Delivery Infrastructure (CDN Preload Manifests, Frequency Caps, Failover & Idempotent Ingestion)
  app.post(
    '/api/delivery/manifest',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(deliveryManifestRequestSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const user = req.currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');

      if (parsed.data.householdId) {
        try {
          const gate = store.evaluateHouseholdDeliveryGate(
            user,
            parsed.data.householdId,
            parsed.data.expectedConsentEpoch
          );
          if (!gate.allowed) {
            const blockedManifest = edisonDeliveryInfra.compilePreloadManifest({
              platformId: parsed.data.platformId,
              deviceSlotId: parsed.data.deviceSlotId,
              regionCode: parsed.data.regionCode,
              daypart: parsed.data.daypart,
              simulateCdnOutage: parsed.data.simulateCdnOutage,
              campaigns: [],
              creatives: [],
              qrLinks: [],
            });
            store.recordSecurityAudit(
              user,
              'DELIVERY_MANIFEST_SUSPENDED_CONSENT',
              gate.household.id,
              `[${req.requestId ?? 'req'}] ${gate.reason}`
            );
            res.json({
              ...blockedManifest,
              householdId: gate.household.id,
              consentEpoch: gate.household.consentEpoch,
              adDeliverySuspended: true,
              suspensionReason: gate.reason,
            });
            return;
          }
        } catch (err) {
          const { code, message } = mapErrorStatus(err);
          res.status(code).json({ error: message });
          return;
        }
      }

      const manifest = edisonDeliveryInfra.compilePreloadManifest({
        platformId: parsed.data.platformId,
        deviceSlotId: parsed.data.deviceSlotId,
        regionCode: parsed.data.regionCode,
        daypart: parsed.data.daypart,
        simulateCdnOutage: parsed.data.simulateCdnOutage,
        campaigns: store.listCampaignsForUser(user),
        creatives: store.listAdCreativesForUser(user),
        qrLinks: store.listQrLinksForUser(user),
      });
      store.recordSecurityAudit(
        user,
        'DELIVERY_MANIFEST_COMPILED',
        manifest.manifestId,
        `[${req.requestId ?? 'req'}] Platform=${manifest.platformId} region=${manifest.regionCode} edge=${manifest.cdnEdgeStatus} eligible=${manifest.eligibleCount} excluded=${manifest.excludedCount} (hardwareTested=false).`
      );
      res.json({
        ...manifest,
        householdId: parsed.data.householdId ?? null,
        adDeliverySuspended: false,
        suspensionReason: null,
      });
    }
  );

  app.post(
    '/api/delivery/ingest-events',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(deliveryEventIngestBatchSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = edisonDeliveryInfra.ingestDeliveryEvents(parsed.data.events);
      store.recordSecurityAudit(
        req.currentUser!,
        'DELIVERY_EVENTS_INGESTED',
        'phase6_delivery_ingest',
        `[${req.requestId ?? 'req'}] Batch received=${result.receivedCount} accepted=${result.acceptedNewCount} dedup=${result.deduplicatedReplayCount} rejectedAnomaly=${result.rejectedAnomalyCount}.`
      );
      res.json(result);
    }
  );

  app.get(
    '/api/delivery/metrics',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json(edisonDeliveryInfra.getMetricsSnapshot());
    }
  );

  app.post(
    '/api/delivery/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runDeliveryInfraVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'DELIVERY_INFRA_SUITE_RUN',
        'phase6_delivery_infra',
        `[${req.requestId ?? 'req'}] Phase 6 delivery suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // Phase 7 Block 7.1: Advertiser Operations, Pacing, Pro-Forma Blueprints & SLA Triage (Non-Transactional)
  app.get(
    '/api/advertiser-ops/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.currentUser!;
      const overview = buildAdvertiserOpsOverview({
        profile: store.getAdvertiserProfile(user),
        campaigns: store.listCampaignsForUser(user),
        qrLinks: store.listQrLinksForUser(user),
        tickets: store.listSupportTicketsForUser(user),
        analyticsEvents: store.listAnalyticsEvents(250),
      });
      res.json(overview);
    }
  );

  app.post(
    '/api/advertiser-ops/pro-forma-blueprint',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(proFormaBlueprintRequestSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const user = req.currentUser!;
      const blueprint = generateProFormaInvoiceBlueprint(
        store.getAdvertiserProfile(user),
        store.listCampaignsForUser(user),
        parsed.data.billingPeriodLabel
      );
      store.recordSecurityAudit(
        user,
        'PROFORMA_BLUEPRINT_GENERATED',
        blueprint.blueprintId,
        `[${req.requestId ?? 'req'}] Generated non-transactional pro-forma blueprint ${blueprint.blueprintId} ($${blueprint.totalProjectedRateCardUsd.toFixed(2)} simulated; paymentCollectionActive=false).`
      );
      res.json(blueprint);
    }
  );

  app.post(
    '/api/advertiser-ops/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runAdvertiserOpsVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'ADVERTISER_OPS_SUITE_RUN',
        'phase7_advertiser_ops',
        `[${req.requestId ?? 'req'}] Phase 7 advertiser ops suite: ${report.passedChecks}/${report.totalChecks} passed (paymentCollectionActive=false, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // --- Phase 8 Block 8.1: Advertisement Creation & Broadcast Rendering Validation (Software-First) ---
  app.get(
    '/api/broadcast-render/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const user = req.currentUser!;
      const overview = buildBroadcastRenderOverview({
        creatives: store.listAdCreativesForUser(user),
        qrLinks: store.listQrLinksForUser(user),
      });
      res.json(overview);
    }
  );

  app.post(
    '/api/broadcast-render/validate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(broadcastRenderValidateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const user = req.currentUser!;
      const visibleCreatives = store.listAdCreativesForUser(user);
      let creative = visibleCreatives.find((c) => c.id === parsed.data.creativeId) ?? null;

      if (!creative && user.role !== 'admin') {
        const allAsAdmin = store.listAdCreativesForUser({ ...user, role: 'admin' });
        if (allAsAdmin.some((c) => c.id === parsed.data.creativeId)) {
          res.status(403).json({
            error: 'FORBIDDEN: You do not own this ad creative.',
          });
          return;
        }
      }

      if (!creative) {
        res.status(404).json({ error: 'Ad creative not found.' });
        return;
      }

      const qrLinks = store.listQrLinksForUser({ ...user, role: 'admin' });
      const qrLink = creative.qrToken
        ? qrLinks.find((q) => q.token === creative!.qrToken) ?? null
        : null;

      const report = validateCreativeForBroadcastRender({
        creative,
        qrLink,
        referenceIso: parsed.data.referenceIso,
      });

      store.recordSecurityAudit(
        user,
        'BROADCAST_RENDER_VALIDATED',
        creative.id,
        `[${req.requestId ?? 'req'}] Validated creative ${creative.id} (${creative.mode}): broadcastReady=${report.broadcastReady}, requiresAdminReview=${report.requiresAdminReview}, ffmpegWorkerConnected=false, hardwareTested=false.`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  app.post(
    '/api/broadcast-render/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runBroadcastRenderVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'BROADCAST_RENDER_SUITE_RUN',
        'phase8_broadcast_render',
        `[${req.requestId ?? 'req'}] Phase 8 broadcast render suite: ${report.passedChecks}/${report.totalChecks} passed (ffmpegWorkerConnected=false, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  app.post(
    '/api/render/validate-and-compile',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(renderCompileJobSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const job = store.compileCreativeBroadcastRenderJob(
          req.currentUser!,
          parsed.data.creativeId,
          parsed.data.resolutionProfile
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ job });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/render/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runBroadcastRenderJobVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'BROADCAST_RENDER_JOB_SUITE_RUN',
        'phase8_broadcast_render',
        `[${req.requestId ?? 'req'}] Phase 8 render job suite: ${report.passedChecks}/${report.totalChecks} passed (ffmpegBinaryExecuted=false, hardwareTested=false).`
      );
      res.json({ report });
    }
  );

  // --- Phase 9 Block 9.1: Opportunity Verification Operations Hardening (Software-First) ---
  app.get(
    '/api/opportunity-ops/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getOpportunityOpsOverview(req.currentUser!) });
    }
  );

  app.post(
    '/api/admin/opportunity-ops/sweep',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(opportunityOpsSweepSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const sweep = store.runOpportunityExpiryAndReverificationSweep(
        req.currentUser!,
        parsed.data
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ sweep });
    }
  );

  app.post(
    '/api/opportunity-ops/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runOpportunityOpsVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'OPPORTUNITY_OPS_SUITE_RUN',
        'phase9_opportunity_ops',
        `[${req.requestId ?? 'req'}] Phase 9 opportunity ops suite: ${report.passedChecks}/${report.totalChecks} passed (externalKycVendorConnected=false, hardwareTested=false).`
      );
      res.json({ report });
    }
  );

  // --- Phase 10 Block 10.1: Privacy, Security & Statutory Compliance Readiness (Software-First) ---
  app.get(
    '/api/compliance/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getPrivacyComplianceOverview(req.currentUser!) });
    }
  );

  app.post(
    '/api/compliance/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPrivacyComplianceVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'PRIVACY_COMPLIANCE_SUITE_RUN',
        'phase10_privacy_compliance',
        `[${req.requestId ?? 'req'}] Phase 10 compliance suite: ${report.passedChecks}/${report.totalChecks} passed (externalPenTestCompleted=false, legalComplianceClaimed=false).`
      );
      res.json({ report });
    }
  );

  app.post(
    '/api/admin/compliance/retention-sweep',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(privacyRetentionSweepSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = store.runPrivacyRetentionCleanupSweep(req.currentUser!, parsed.data);
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 11 Block 11.1: Reliability, Failure-Mode & Chaos Recovery Suite (Software-First) ---
  app.get(
    '/api/reliability/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getReliabilityChaosOverview(req.currentUser!) });
    }
  );

  app.post(
    '/api/reliability/chaos-probe',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(reliabilityChaosProbeSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.executeFailureModeChaosProbe(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/admin/reliability/run-all-18',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(reliabilityFullSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = store.runFullReliabilityChaosSuite(req.currentUser!, parsed.data);
      res.setHeader('Cache-Control', 'no-store, private');
      res.json(result);
    }
  );

  app.post(
    '/api/reliability/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runReliabilityChaosVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'RELIABILITY_CHAOS_SUITE_RUN',
        'phase11_reliability_chaos',
        `[${req.requestId ?? 'req'}] Phase 11 reliability chaos suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false, stageP6Deferred=true).`
      );
      res.json({ report });
    }
  );

  // --- Phase 12 Block 12.1: Controlled Hardware & Viewer Pilot Readiness & Stage P6 Runbook (Software-First) ---
  app.get(
    '/api/pilot-readiness/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getPilotReadinessOverview(req.currentUser!) });
    }
  );

  app.post(
    '/api/pilot-readiness/cohorts',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(pilotCohortCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.createPilotCohortBlueprint(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/pilot-readiness/validate-telemetry',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(pilotTelemetryValidateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.validatePilotTelemetrySample(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ result });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/pilot-readiness/stage-p6-prep',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(stageP6CheckPrepareSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const overview = store.recordStageP6RunbookPrep(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/pilot-readiness/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPilotReadinessVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'PILOT_READINESS_SUITE_RUN',
        'phase12_pilot_readiness',
        `[${req.requestId ?? 'req'}] Phase 12 pilot readiness suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false, stageP6Deferred=true, countryActivated=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 13 Block 13.1: Commercial Readiness Board Gate, SLA Matrix & Unit Economics (Software-First) ---
  app.get(
    '/api/commercial-readiness/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getCommercialReadinessOverview(req.currentUser!) });
    }
  );

  app.put(
    '/api/commercial-readiness/cost-assumptions',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(commercialCostAssumptionsSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const overview = store.updateCommercialCostAssumptions(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/commercial-readiness/board-decision',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(commercialBoardDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.submitCommercialBoardDecision(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/commercial-readiness/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runCommercialReadinessVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'COMMERCIAL_READINESS_SUITE_RUN',
        'phase13_commercial_readiness',
        `[${req.requestId ?? 'req'}] Phase 13 commercial readiness suite: ${report.passedChecks}/${report.totalChecks} passed (commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 14 Block 14.1: Country-by-Country Launch Readiness Gate & Jurisdiction Policy Engine (Software-First) ---
  app.get(
    '/api/country-launch/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getCountryLaunchOverview(req.currentUser!) });
    }
  );

  app.put(
    '/api/country-launch/policy',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(countryPolicyUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const overview = store.updateCountryPolicyConfig(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/country-launch/decision',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(countryLaunchDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.submitCountryLaunchDecision(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/country-launch/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runCountryLaunchVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'COUNTRY_LAUNCH_SUITE_RUN',
        'phase14_country_launch',
        `[${req.requestId ?? 'req'}] Phase 14 country launch readiness suite: ${report.passedChecks}/${report.totalChecks} passed (countryActivated=false, activeLaunchedMarketsCount=0, legalComplianceClaimed=false, hardwareTested=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 15 Block 15.1: International Multi-Region Expansion, Localization & Residency (Software-First) ---
  app.get(
    '/api/international-expansion/overview',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ overview: store.getInternationalExpansionOverview(req.currentUser!) });
    }
  );

  app.put(
    '/api/international-expansion/region-config',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(regionalLocalizationUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const overview = store.updateRegionalLocalizationConfig(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/international-expansion/estimate-currency',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(multiCurrencyEstimateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const estimate = store.estimateRegionalMultiCurrencyProForma(
          req.currentUser!,
          parsed.data
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ estimate });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/international-expansion/decision',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(internationalExpansionDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.submitInternationalExpansionDecision(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/international-expansion/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runInternationalExpansionVerificationSuite();
      store.recordSecurityAudit(
        req.currentUser!,
        'INTERNATIONAL_EXPANSION_SUITE_RUN',
        'phase15_international_expansion',
        `[${req.requestId ?? 'req'}] Phase 15 international expansion suite: ${report.passedChecks}/${report.totalChecks} passed (regionalExpansionActive=false, activeExpandedRegionsCount=0, prohibitCrossBorderPiiTransfer=true, stageP6Deferred=true).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Track B (DEC-OPEN-01 Locked): Households, Profiles, Matching, Bundled Consent & QR Revocation ---
  app.get('/api/track-b/country-configs', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL',
      initialLaunchMarket: 'ZW',
      countries: listCountryGeoConfigs(),
    });
  });

  app.post('/api/track-b/verify-suite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const report = runTrackBVerificationSuite();
    store.recordSecurityAudit(
      req.currentUser!,
      'TRACK_B_VERIFICATION_SUITE_RUN',
      'track_b_consent',
      `[${req.requestId ?? 'req'}] Track B verification: ${report.passedChecks}/${report.totalChecks} passed (DEC-OPEN-01 locked).`
    );
    res.json(report);
  });

  app.get(
    '/api/advertiser/targeting-aggregates',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const rows = store.getAdvertiserGeoAggregates(req.currentUser!);
      res.json({
        privacyNotice:
          'Aggregate consented households only — exact installation locations and member profiles are strictly redacted.',
        items: rows,
      });
    }
  );

  app.get('/api/households', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const items = store.listHouseholdsForUser(req.currentUser!);
      res.json({ items: items.map(toPublicHouseholdView) });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/households', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(householdCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.createHousehold(req.currentUser!, parsed.data);
      res.status(201).json({ item: toPublicHouseholdView(item) });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/households/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const item = store.getHouseholdForActor(req.currentUser!, req.params.id);
      res.json({ item: toPublicHouseholdView(item) });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.put('/api/households/:id/location', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(householdLocationSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.updateHouseholdLocation(req.currentUser!, req.params.id, parsed.data);
      res.json({ item: toPublicHouseholdView(item) });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch('/api/households/:id/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(householdDisplaySettingsPatchSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.updateHouseholdDisplaySettings(
        req.currentUser!,
        req.params.id,
        parsed.data
      );
      res.json({ item: toPublicHouseholdView(item) });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post(
    '/api/households/:id/consent/withdraw',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(householdConsentWithdrawSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.withdrawHouseholdConsentBundled(
          req.currentUser!,
          req.params.id,
          parsed.data.reason
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ ...result, household: toPublicHouseholdView(result.household) });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/households/:id/consent/restore',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(householdConsentRestoreSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.restoreHouseholdConsentExplicit(
          req.currentUser!,
          req.params.id,
          parsed.data
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ ...result, household: toPublicHouseholdView(result.household) });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/households/:id/members', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const items = store.listHouseholdMembers(req.currentUser!, req.params.id);
      res.json({ items });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/households/:id/members', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(householdMemberCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.createHouseholdMember(req.currentUser!, req.params.id, parsed.data);
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch(
    '/api/households/:id/members/:memberId',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(householdMemberUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.updateHouseholdMember(
          req.currentUser!,
          req.params.id,
          req.params.memberId,
          parsed.data
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.delete(
    '/api/households/:id/members/:memberId',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(householdMemberDeleteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        store.deleteHouseholdMember(
          req.currentUser!,
          req.params.id,
          req.params.memberId,
          parsed.data.pinVerification
        );
        res.json({ ok: true });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/households/:id/matches', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const result = store.evaluateHouseholdOpportunityMatches(req.currentUser!, req.params.id);
      res.json(result);
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/households/:id/qr-issue', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(householdQrIssueSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = store.issueHouseholdEpochQrToken(
        req.currentUser!,
        req.params.id,
        parsed.data
      );
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/households/:id/qr-tokens', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const items = store.listHouseholdQrTokens(req.currentUser!, req.params.id);
      res.json({ items });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get(
    '/api/households/:id/consent-history',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const items = store.listConsentAuditEvents(req.currentUser!, req.params.id);
        res.json({ items });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/households/:id/dsr-export',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const pkg = store.exportHouseholdDsrPackage(req.currentUser!, req.params.id);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ package: pkg });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/households/:id/dsr-erase',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(householdDsrEraseSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const erasure = store.anonymiseHouseholdDsr(
          req.currentUser!,
          req.params.id,
          parsed.data
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ erasure });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
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

  // --- Phase 3: PostgreSQL 16+ Database Migration & Backup Status ---
  app.get('/api/admin/database/status', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const descriptors = loadMigrationDescriptors();
    const backendMeta = store.getStorageBackendMetadata();
    const probe = await probePostgresReadiness(null);
    res.json({
      storageBackend: backendMeta,
      migrationsAvailable: descriptors.map((d) => ({
        version: d.version,
        filename: d.filename,
        hasDownScript: Boolean(d.downFilename),
        checksumSha256: d.checksumSha256,
      })),
      probe,
    });
  });

  app.post('/api/admin/database/verify-pglite', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const executor = await createPgliteExecutor();
    try {
      const dataPath = path.resolve(process.cwd(), 'data', 'edison-store.json');
      const snapshot = fs.existsSync(dataPath)
        ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        : {
            schemaVersion: 8,
            users: [],
            sessions: [],
            qrLinks: store.listQrLinksForUser(req.currentUser!),
            advertiserProfiles: [],
            campaigns: store.listCampaignsForUser(req.currentUser!),
            adCreatives: store.listAdCreativesForUser(req.currentUser!),
            supportTickets: [],
            opportunities: store.listOpportunitiesForUser(req.currentUser!),
            opportunityComplaints: [],
            opportunityAppeals: [],
            analyticsEvents: [],
            physicalQrScanTests: [],
            auditLogs: [],
          };
      const importSummary = await importJsonStoreToPostgres(executor, snapshot);
      const probe = await probePostgresReadiness(executor);
      const backup = await exportPostgresBackupSql(executor);
      reliabilityMonitor.recordDependencySuccess('postgres_primary');
      res.json({
        ok: true,
        verifiedWithEngine: 'pglite_postgresql_16_wasm',
        importSummary,
        probe,
        backup,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Postgres verification failed.';
      reliabilityMonitor.recordDependencyFailure('postgres_primary', msg);
      res.status(500).json({ error: msg });
    } finally {
      await executor.close();
    }
  });

  // --- Phase 3: Dedicated FFmpeg & FFprobe Broadcast Media Worker ---
  app.get('/api/media/worker/status', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      diagnostics: mediaWorker.getWorkerDiagnostics(),
      recentJobs: mediaWorker.listJobs(20),
    });
  });

  app.post('/api/media/worker/probe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(mediaWorkerProbeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const probe = await mediaWorker.probeMediaFile(parsed.data.sourceFilename);
      reliabilityMonitor.recordDependencySuccess('ffmpeg_worker');
      res.json({ probe });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/media/worker/transcode', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(mediaWorkerTranscodeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const job = await mediaWorker.enqueueTranscodeJob({
        requestedByUserId: req.currentUser!.id,
        creativeId: parsed.data.creativeId ?? null,
        sourceFilename: parsed.data.sourceFilename,
        kind: parsed.data.kind,
        targetPlatform: parsed.data.targetPlatform,
        durationSeconds: parsed.data.durationSeconds,
      });
      reliabilityMonitor.recordDependencySuccess('ffmpeg_worker');
      res.status(201).json({ job });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      reliabilityMonitor.recordDependencyFailure('ffmpeg_worker', message);
      res.status(code).json({ error: message });
    }
  });

  // --- Phase 4: AURA Companion Remote Pairing, Commands, Offline Queue & HDMI-CEC Contracts ---
  app.get('/api/aura/contracts', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      oemContracts: auraRemoteEngine.listOemContracts(),
      hardwareTested: false,
      stageP6Deferred: true,
    });
  });

  app.get('/api/aura/discover', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSimulationDiscovery: true,
      devices: auraRemoteEngine.discoverNearbyDevices(),
    });
  });

  app.get('/api/aura/devices', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      items: auraRemoteEngine.listUserDevices(req.currentUser!.id),
    });
  });

  app.post('/api/aura/pair/initiate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraInitiatePairingSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const device = auraRemoteEngine.initiatePairing({
      ownerUserId: req.currentUser!.id,
      householdId: parsed.data.householdId ?? null,
      tvLabel: parsed.data.tvLabel,
      platformId: parsed.data.platformId,
    });
    res.status(201).json({ device });
  });

  app.post('/api/aura/pair/confirm', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraConfirmPairingSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const device = auraRemoteEngine.confirmPairing({
        deviceId: parsed.data.deviceId,
        ownerUserId: req.currentUser!.id,
        pairingCode: parsed.data.pairingCode,
        activeProfileId: parsed.data.activeProfileId ?? null,
      });
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/aura/devices/:deviceId/heartbeat', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraHeartbeatSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const device = auraRemoteEngine.recordHeartbeat({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        networkOnline: parsed.data.networkOnline,
      });
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/aura/devices/:deviceId/command', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraCommandSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const result = auraRemoteEngine.dispatchAuraCommand({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        command: parsed.data.command,
        targetInput: parsed.data.targetInput,
      });
      res.json(result);
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  });

  app.patch('/api/aura/devices/:deviceId/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraBindProfileSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const device = auraRemoteEngine.bindActiveProfile({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        profileId: parsed.data.profileId,
      });
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/aura/devices/:deviceId/disconnect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const device = auraRemoteEngine.disconnectDevice({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
      });
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/tv/hdmi-cec/evaluate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(hdmiCecEvaluateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const result = auraRemoteEngine.evaluateHdmiCecAction(parsed.data);
    res.json(result);
  });

  // --- Phase 7: Commercial Operations Disputes, Credit Ledger & Stream Reconciliation ---
  app.get('/api/advertiser-ops/disputes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.currentUser!;
    const items =
      user.role === 'admin'
        ? commercialDisputeEngine.listDisputes()
        : commercialDisputeEngine.listDisputes({ advertiserUserId: user.id });
    const ledger = store.getRevenueLedgerSnapshot(user);
    const reconciliation = commercialDisputeEngine.reconcileRevenueStreams(ledger);
    res.json({ items, reconciliation });
  });

  app.post('/api/advertiser-ops/disputes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(commercialDisputeCreateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const user = req.currentUser!;
      const campaign = parsed.data.campaignId
        ? store.listCampaignsForUser(user).find((c) => c.id === parsed.data.campaignId) ?? null
        : null;
      const item = commercialDisputeEngine.submitDispute({
        advertiserUserId: user.id,
        campaign,
        billingPeriodLabel: parsed.data.billingPeriodLabel,
        disputeType: parsed.data.disputeType,
        disputedAmountUsd: parsed.data.disputedAmountUsd,
        reason: parsed.data.reason,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  });

  app.patch('/api/advertiser-ops/disputes/:id/resolve', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(commercialDisputeResolveSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const item = commercialDisputeEngine.resolveDispute({
        disputeId: req.params.id,
        decision: parsed.data.decision,
        approvedCreditUsd: parsed.data.approvedCreditUsd,
        resolutionNote: parsed.data.resolutionNote,
      });
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  // --- Phase 15 & Reliability: i18n UI Translation Bundles, Sovereign Deployment Manifests & Observability ---
  app.get('/api/i18n/bundles', (_req: Request, res: Response) => {
    const locale = typeof _req.query.locale === 'string' ? _req.query.locale : undefined;
    if (locale) {
      res.json({ bundle: getTranslationBundle(locale) });
      return;
    }
    res.json({
      supportedLocales: Object.keys(EDISON_I18N_BUNDLES),
      bundles: EDISON_I18N_BUNDLES,
    });
  });

  app.get('/api/international-expansion/deployment-manifests', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    const regionsDir = path.resolve(process.cwd(), 'deploy', 'regions');
    const manifests = fs.existsSync(regionsDir)
      ? fs
          .readdirSync(regionsDir)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((file) => JSON.parse(fs.readFileSync(path.join(regionsDir, file), 'utf8')))
      : [];
    res.json({
      count: manifests.length,
      prohibitCrossBorderPiiTransfer: true,
      regionalExpansionActive: false,
      countryActivated: false,
      manifests,
    });
  });

  app.get('/api/admin/observability/metrics', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(reliabilityMonitor.getMetricsSnapshot());
  });

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
  // Rejects revoked/withdrawn/stale-epoch/expired Track B household QR tokens with HTTP 403 and no-store cache headers.
  app.get('/r/:token', redirectRateMiddleware, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
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
