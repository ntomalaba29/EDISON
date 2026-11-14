import 'dotenv/config';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
  ALL_CAMPAIGN_STATUSES,
  ALLOWED_CAMPAIGN_TRANSITIONS,
  ALL_OPPORTUNITY_CATEGORIES,
  edisonStore,
} from './src/server/store.ts';
import {
  resolveSafeUploadPath,
  saveValidatedMediaUpload,
} from './src/server/mediaSecurity.ts';
import { validateQrDestination } from './src/server/qrValidator.ts';
import type {
  AccountVerificationStatus,
  AdStudioMode,
  AdvertiserEntityType,
  CampaignContentCategory,
  CampaignStatus,
  DaypartSlot,
  OptionAComposition,
  OptionBUploadSpec,
  OpportunityAppealStatus,
  OpportunityCategory,
  OpportunityComplaintReason,
  OpportunityComplaintStatus,
  OpportunityProviderType,
  OpportunityStatus,
  OpportunityTierStatus,
  PublicUser,
  QrDestinationType,
  QrLinkStatus,
  SupportTicketCategory,
  SupportTicketStatus,
} from './src/types/edison.ts';

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

function mapErrorStatus(err: unknown, defaultCode = 400): { code: number; message: string } {
  const message = err instanceof Error ? err.message : 'Request failed.';
  if (message.startsWith('FORBIDDEN:')) return { code: 403, message };
  if (message.toLowerCase().includes('not found')) return { code: 404, message };
  return { code: defaultCode, message };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(attachSession);

  // Validated media upload endpoint (route-scoped 26MB JSON limit, auth required first)
  app.post(
    '/api/media/upload',
    requireAuth,
    express.json({ limit: '26mb' }),
    (req: AuthenticatedRequest, res: Response) => {
      const { dataBase64, declaredKind } = req.body ?? {};
      if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
        res.status(400).json({ error: 'dataBase64 payload is required.' });
        return;
      }
      const kind =
        declaredKind === 'image' || declaredKind === 'video' || declaredKind === 'any'
          ? declaredKind
          : 'any';
      try {
        const result = saveValidatedMediaUpload({ dataBase64, declaredKind: kind });
        edisonStore.recordMediaUploadAudit(
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

  // Serve strictly validated uploaded media with nosniff header
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const resolved = resolveSafeUploadPath(req.params.filename);
    if (!resolved) {
      res.status(404).json({ error: 'Uploaded media asset not found.' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', resolved.contentType);
    res.sendFile(resolved.fullPath);
  });

  app.use(express.json({ limit: '1mb' }));

  // Health & prototype status
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'edison-prototype-server',
      phase: 'Phase 2 · Block 2.5',
      summary: edisonStore.getFoundationSummary(),
    });
  });

  // Live non-sensitive formal report snapshot for Reports & Copy Console
  app.get('/api/reports/live', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(edisonStore.getLiveReportSnapshot());
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
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  });

  // --- Advertiser Profile Endpoints (Block 2.2) ---
  app.get('/api/advertiser/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const profile = edisonStore.getAdvertiserProfile(req.currentUser!);
    res.json({ profile });
  });

  app.put('/api/advertiser/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const entityType = body.entityType as AdvertiserEntityType;
    if (
      entityType !== 'registered_business' &&
      entityType !== 'individual_sole_trader' &&
      entityType !== 'public_ngo'
    ) {
      res.status(400).json({
        error: 'Invalid entityType. Must be registered_business, individual_sole_trader, or public_ngo.',
      });
      return;
    }

    try {
      const profile = edisonStore.upsertAdvertiserProfile(req.currentUser!, {
        entityType,
        businessOrTradingName: String(body.businessOrTradingName ?? ''),
        registrationOrTaxId: String(body.registrationOrTaxId ?? ''),
        industryCategory: String(body.industryCategory ?? ''),
        countryCode: String(body.countryCode ?? 'GB'),
        cityRegion: String(body.cityRegion ?? ''),
        physicalAddress: String(body.physicalAddress ?? ''),
        primaryContactName: String(body.primaryContactName ?? ''),
        primaryContactEmail: String(body.primaryContactEmail ?? ''),
        primaryContactPhone: String(body.primaryContactPhone ?? ''),
        billingContactName: String(body.billingContactName ?? ''),
        billingContactEmail: String(body.billingContactEmail ?? ''),
        websiteUrl: String(body.websiteUrl ?? ''),
        requestVerification: Boolean(body.requestVerification),
      });
      res.json({ profile });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.get('/api/admin/advertiser-profiles', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ items: edisonStore.listAllAdvertiserProfiles() });
  });

  app.patch(
    '/api/admin/advertiser-profiles/:userId/verification',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const { status, notes } = req.body ?? {};
      const validStatuses: AccountVerificationStatus[] = [
        'unverified',
        'pending_review',
        'verified',
        'suspended',
      ];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid verification status.' });
        return;
      }
      try {
        const profile = edisonStore.adminUpdateAdvertiserVerification(
          req.currentUser!,
          req.params.userId,
          status,
          String(notes ?? '')
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
    const statusParam = typeof req.query.status === 'string' ? req.query.status : 'all';
    const isAll = statusParam === 'all';
    const isValidStatus = (ALL_CAMPAIGN_STATUSES as readonly string[]).includes(statusParam);
    if (!isAll && !isValidStatus) {
      res.status(400).json({ error: 'Invalid campaign status filter.' });
      return;
    }
    const items = edisonStore.listCampaignsForUser(
      req.currentUser!,
      isAll ? 'all' : (statusParam as CampaignStatus)
    );
    res.json({
      items,
      statuses: ALL_CAMPAIGN_STATUSES,
      transitions: ALLOWED_CAMPAIGN_TRANSITIONS,
    });
  });

  app.post('/api/campaigns', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const category = body.contentCategory as CampaignContentCategory;
    if (category !== 'commercial_advertising' && category !== 'opportunity_promotion') {
      res.status(400).json({
        error: 'contentCategory must be commercial_advertising or opportunity_promotion.',
      });
      return;
    }

    try {
      const item = edisonStore.createCampaign(req.currentUser!, {
        title: String(body.title ?? ''),
        contentCategory: category,
        summary: String(body.summary ?? ''),
        qrToken: typeof body.qrToken === 'string' && body.qrToken.trim() ? body.qrToken.trim() : null,
        durationSeconds: Number(body.durationSeconds ?? 30),
        dailyFrequencyCap: Number(body.dailyFrequencyCap ?? 4),
        targetRegions: Array.isArray(body.targetRegions)
          ? body.targetRegions.map(String)
          : typeof body.targetRegions === 'string'
          ? body.targetRegions.split(',')
          : ['United Kingdom · National'],
        dayparts: Array.isArray(body.dayparts)
          ? (body.dayparts as DaypartSlot[])
          : ['daytime'],
        startDate: String(body.startDate ?? ''),
        endDate: String(body.endDate ?? ''),
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.patch('/api/campaigns/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    try {
      const item = edisonStore.updateCampaign(req.currentUser!, req.params.id, {
        title: typeof body.title === 'string' ? body.title : undefined,
        contentCategory:
          body.contentCategory === 'commercial_advertising' ||
          body.contentCategory === 'opportunity_promotion'
            ? body.contentCategory
            : undefined,
        summary: typeof body.summary === 'string' ? body.summary : undefined,
        qrToken: body.qrToken !== undefined ? (body.qrToken ? String(body.qrToken) : null) : undefined,
        durationSeconds:
          body.durationSeconds !== undefined ? Number(body.durationSeconds) : undefined,
        dailyFrequencyCap:
          body.dailyFrequencyCap !== undefined ? Number(body.dailyFrequencyCap) : undefined,
        targetRegions: Array.isArray(body.targetRegions)
          ? body.targetRegions.map(String)
          : typeof body.targetRegions === 'string'
          ? body.targetRegions.split(',')
          : undefined,
        dayparts: Array.isArray(body.dayparts) ? (body.dayparts as DaypartSlot[]) : undefined,
        startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
        endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
      });
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/campaigns/:id/clone', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = edisonStore.cloneCampaign(req.currentUser!, req.params.id);
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/campaigns/:id/transition', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { targetStatus, rejectionReason, fixInstructions } = req.body ?? {};
    if (!(ALL_CAMPAIGN_STATUSES as readonly string[]).includes(String(targetStatus))) {
      res.status(400).json({ error: 'Invalid targetStatus.' });
      return;
    }
    try {
      const item = edisonStore.transitionCampaignStatus(
        req.currentUser!,
        req.params.id,
        targetStatus as CampaignStatus,
        {
          rejectionReason: typeof rejectionReason === 'string' ? rejectionReason : undefined,
          fixInstructions: typeof fixInstructions === 'string' ? fixInstructions : undefined,
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
      edisonStore.deleteCampaign(req.currentUser!, req.params.id);
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
        const gate = edisonStore.evaluateCampaignPreSubmitGate(req.currentUser!, req.params.id);
        res.json({ gate });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post('/api/simulator/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { campaignId, qrToken, eventType } = req.body ?? {};
    const allowedEvents = ['ad_requested', 'ad_delivered', 'ad_played', 'ad_viewable'];
    if (!allowedEvents.includes(eventType)) {
      res.status(400).json({ error: 'Invalid simulated eventType.' });
      return;
    }
    const event = edisonStore.recordSimulatedPlaybackEvent(req.currentUser!, {
      campaignId: typeof campaignId === 'string' && campaignId ? campaignId : null,
      qrToken: typeof qrToken === 'string' && qrToken ? qrToken : null,
      eventType,
    });
    res.status(201).json({ event });
  });

  // --- Advertisement Creation Studio Endpoints (Block 2.3) ---
  app.get('/api/ad-creatives', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: edisonStore.listAdCreativesForUser(req.currentUser!) });
  });

  app.post('/api/ad-creatives', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const mode = body.mode as AdStudioMode;
    if (mode !== 'option_a_studio' && mode !== 'option_b_upload') {
      res.status(400).json({ error: 'mode must be option_a_studio or option_b_upload.' });
      return;
    }
    try {
      const item = edisonStore.saveAdCreative(req.currentUser!, {
        campaignId: typeof body.campaignId === 'string' && body.campaignId ? body.campaignId : null,
        qrToken: typeof body.qrToken === 'string' && body.qrToken ? body.qrToken : null,
        title: String(body.title ?? ''),
        mode,
        displayDurationSeconds: Number(body.displayDurationSeconds ?? 15),
        safeZoneWarnings: Array.isArray(body.safeZoneWarnings) ? body.safeZoneWarnings.map(String) : [],
        contrastWarnings: Array.isArray(body.contrastWarnings) ? body.contrastWarnings.map(String) : [],
        optionA: mode === 'option_a_studio' ? (body.optionA as OptionAComposition) : null,
        optionB: mode === 'option_b_upload' ? (body.optionB as OptionBUploadSpec) : null,
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.put('/api/ad-creatives/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const mode = body.mode as AdStudioMode;
    if (mode !== 'option_a_studio' && mode !== 'option_b_upload') {
      res.status(400).json({ error: 'mode must be option_a_studio or option_b_upload.' });
      return;
    }
    try {
      const item = edisonStore.saveAdCreative(req.currentUser!, {
        id: req.params.id,
        campaignId: typeof body.campaignId === 'string' && body.campaignId ? body.campaignId : null,
        qrToken: typeof body.qrToken === 'string' && body.qrToken ? body.qrToken : null,
        title: String(body.title ?? ''),
        mode,
        displayDurationSeconds: Number(body.displayDurationSeconds ?? 15),
        safeZoneWarnings: Array.isArray(body.safeZoneWarnings) ? body.safeZoneWarnings.map(String) : [],
        contrastWarnings: Array.isArray(body.contrastWarnings) ? body.contrastWarnings.map(String) : [],
        optionA: mode === 'option_a_studio' ? (body.optionA as OptionAComposition) : null,
        optionB: mode === 'option_b_upload' ? (body.optionB as OptionBUploadSpec) : null,
      });
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/ad-creatives/:id/attach', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { campaignId } = req.body ?? {};
    if (typeof campaignId !== 'string' || !campaignId.trim()) {
      res.status(400).json({ error: 'campaignId string is required.' });
      return;
    }
    try {
      const result = edisonStore.attachAdCreativeToCampaign(
        req.currentUser!,
        req.params.id,
        campaignId.trim()
      );
      res.json(result);
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete('/api/ad-creatives/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      edisonStore.deleteAdCreative(req.currentUser!, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  // --- Support & Dispute Tickets (Block 2.2) ---
  app.get('/api/support-tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: edisonStore.listSupportTicketsForUser(req.currentUser!) });
  });

  app.post('/api/support-tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const validCategories: SupportTicketCategory[] = [
      'campaign_review',
      'verification_enquiry',
      'qr_technical',
      'billing_dispute',
      'policy_appeal',
    ];
    if (!validCategories.includes(body.category)) {
      res.status(400).json({ error: 'Invalid support ticket category.' });
      return;
    }
    try {
      const item = edisonStore.createSupportTicket(req.currentUser!, {
        campaignId: typeof body.campaignId === 'string' && body.campaignId ? body.campaignId : null,
        category: body.category,
        subject: String(body.subject ?? ''),
        message: String(body.message ?? ''),
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
      const { status, adminResponse } = req.body ?? {};
      const validStatuses: SupportTicketStatus[] = ['open', 'in_review', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid ticket status.' });
        return;
      }
      try {
        const item = edisonStore.updateSupportTicketStatus(
          req.currentUser!,
          req.params.id,
          status,
          typeof adminResponse === 'string' ? adminResponse : undefined
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
      items: edisonStore.listOpportunitiesForUser(req.currentUser!),
      categories: ALL_OPPORTUNITY_CATEGORIES,
    });
  });

  app.post('/api/opportunities', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body ?? {};
    const providerType: OpportunityProviderType =
      body.providerType === 'individual_informal_employer'
        ? 'individual_informal_employer'
        : 'registered_organisation';
    const category = body.category as OpportunityCategory;
    if (!(ALL_OPPORTUNITY_CATEGORIES as readonly string[]).includes(String(category))) {
      res.status(400).json({ error: 'Invalid opportunity category.' });
      return;
    }

    try {
      const item = edisonStore.createOpportunity(req.currentUser!, {
        providerType,
        providerName: String(body.providerName ?? ''),
        category,
        title: String(body.title ?? ''),
        description: String(body.description ?? ''),
        location: String(body.location ?? ''),
        eligibilityRequirements: String(body.eligibilityRequirements ?? ''),
        applicationMethod: String(body.applicationMethod ?? ''),
        contactInfo: String(body.contactInfo ?? ''),
        qrToken: typeof body.qrToken === 'string' && body.qrToken.trim() ? body.qrToken.trim() : null,
        linkedCampaignId:
          typeof body.linkedCampaignId === 'string' && body.linkedCampaignId.trim()
            ? body.linkedCampaignId.trim()
            : null,
        closingDate: String(body.closingDate ?? ''),
        expiryDate: String(body.expiryDate ?? ''),
        identityEvidenceRef: String(body.identityEvidenceRef ?? ''),
        organisationEvidenceRef: String(body.organisationEvidenceRef ?? ''),
        specificOpportunityEvidenceRef: String(body.specificOpportunityEvidenceRef ?? ''),
        applicationFeeFreeConfirmed: Boolean(body.applicationFeeFreeConfirmed),
        noGuaranteeConfirmed: Boolean(body.noGuaranteeConfirmed),
      });
      res.status(201).json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/opportunities/:id/submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = edisonStore.submitOpportunity(req.currentUser!, req.params.id);
      res.json({ item });
    } catch (err) {
      const { code, message } = mapErrorStatus(err);
      res.status(code).json({ error: message });
    }
  });

  app.delete('/api/opportunities/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      edisonStore.deleteOpportunity(req.currentUser!, req.params.id);
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
      const body = req.body ?? {};
      const validTiers: OpportunityTierStatus[] = [
        'unverified',
        'pending_review',
        'verified',
        'not_applicable',
        'rejected',
      ];
      const validStatuses: OpportunityStatus[] = [
        'draft',
        'submitted',
        'under_review',
        'verified_live',
        'rejected',
        'suspended',
        'expired',
        'revoked',
      ];

      if (body.identityStatus && !validTiers.includes(body.identityStatus)) {
        res.status(400).json({ error: 'Invalid identityStatus.' });
        return;
      }
      if (body.organisationStatus && !validTiers.includes(body.organisationStatus)) {
        res.status(400).json({ error: 'Invalid organisationStatus.' });
        return;
      }
      if (
        body.specificOpportunityStatus &&
        !validTiers.includes(body.specificOpportunityStatus)
      ) {
        res.status(400).json({ error: 'Invalid specificOpportunityStatus.' });
        return;
      }
      if (body.targetStatus && !validStatuses.includes(body.targetStatus)) {
        res.status(400).json({ error: 'Invalid targetStatus.' });
        return;
      }

      try {
        const item = edisonStore.adminUpdateOpportunityVerification(
          req.currentUser!,
          req.params.id,
          {
            identityStatus: body.identityStatus,
            identityNotes: typeof body.identityNotes === 'string' ? body.identityNotes : undefined,
            organisationStatus: body.organisationStatus,
            organisationNotes:
              typeof body.organisationNotes === 'string' ? body.organisationNotes : undefined,
            specificOpportunityStatus: body.specificOpportunityStatus,
            specificOpportunityNotes:
              typeof body.specificOpportunityNotes === 'string'
                ? body.specificOpportunityNotes
                : undefined,
            targetStatus: body.targetStatus,
            rejectionReason:
              typeof body.rejectionReason === 'string' ? body.rejectionReason : undefined,
          }
        );
        res.json({ item });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/opportunity-complaints', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: edisonStore.listOpportunityComplaintsForUser(req.currentUser!) });
  });

  app.post(
    '/api/opportunities/:id/complaints',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body ?? {};
      const validReasons: OpportunityComplaintReason[] = [
        'upfront_fee_scam',
        'misleading_guarantee',
        'expired_or_closed',
        'broken_or_wrong_qr',
        'fake_employer_or_listing',
        'other',
      ];
      if (!validReasons.includes(body.reasonCategory)) {
        res.status(400).json({ error: 'Invalid complaint reasonCategory.' });
        return;
      }
      try {
        const item = edisonStore.createOpportunityComplaint(req.currentUser!, req.params.id, {
          reasonCategory: body.reasonCategory,
          description: String(body.description ?? ''),
          evidenceDetails: typeof body.evidenceDetails === 'string' ? body.evidenceDetails : '',
        });
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
      const body = req.body ?? {};
      const validStatuses: OpportunityComplaintStatus[] = [
        'reported',
        'under_investigation',
        'cleared',
        'suspended',
        'revoked',
      ];
      if (!validStatuses.includes(body.status)) {
        res.status(400).json({ error: 'Invalid complaint status.' });
        return;
      }
      try {
        const result = edisonStore.adminUpdateComplaintStatus(
          req.currentUser!,
          req.params.complaintId,
          {
            status: body.status,
            resolutionNotes: String(body.resolutionNotes ?? ''),
          }
        );
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.get('/api/opportunity-appeals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ items: edisonStore.listOpportunityAppealsForUser(req.currentUser!) });
  });

  app.post(
    '/api/opportunities/:id/appeals',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body ?? {};
      try {
        const item = edisonStore.createOpportunityAppeal(req.currentUser!, req.params.id, {
          reason: String(body.reason ?? ''),
          additionalEvidence: String(body.additionalEvidence ?? ''),
        });
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
      const body = req.body ?? {};
      const validStatuses: OpportunityAppealStatus[] = [
        'submitted',
        'under_review',
        'upheld_reinstated',
        'denied',
      ];
      if (!validStatuses.includes(body.status)) {
        res.status(400).json({ error: 'Invalid appeal decision status.' });
        return;
      }
      try {
        const result = edisonStore.adminResolveAppeal(req.currentUser!, req.params.appealId, {
          status: body.status,
          adminNotes: String(body.adminNotes ?? ''),
        });
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

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
