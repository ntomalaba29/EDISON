import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AnalyticsEventRecord,
  AuditLogRecord,
  EdisonStoreData,
  PublicUser,
  QrDestinationType,
  QrLinkRecord,
  QrLinkStatus,
  SessionRecord,
  UserAccount,
  UserRole,
} from '../types/edison.ts';
import { validateQrDestination } from './qrValidator.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'edison-store.json');
const LOCK_PATH = path.join(DATA_DIR, 'edison-store.lock');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const DEDUP_WINDOW_MS = 5000; // 5s duplicate request suppression
const LOCK_TIMEOUT_MS = 3000;
const STALE_LOCK_MS = 10000;

const PROCESS_HASH_SALT = crypto.randomBytes(16).toString('hex');

const BOT_USER_AGENT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /whatsapp/i,
  /slackbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /discordbot/i,
  /telegrambot/i,
  /linkedinbot/i,
  /preview/i,
  /headlesschrome/i,
  /playwright/i,
  /puppeteer/i,
  /^curl\//i,
  /^wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /^axios\//i,
  /^node-fetch/i,
  /^undici/i,
  /go-http-client/i,
];

export function detectSuspectedBotOrPrefetch(
  userAgent: string,
  headers: { secPurpose?: string; purpose?: string; xMoz?: string }
): boolean {
  const secPurpose = (headers.secPurpose || '').toLowerCase();
  const purpose = (headers.purpose || '').toLowerCase();
  const xMoz = (headers.xMoz || '').toLowerCase();

  if (
    secPurpose.includes('prefetch') ||
    secPurpose.includes('prerender') ||
    purpose.includes('prefetch') ||
    xMoz.includes('prefetch')
  ) {
    return true;
  }

  const ua = userAgent.trim();
  if (!ua || ua === 'unknown') {
    return true;
  }

  return BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(ua));
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function toPublicUser(user: UserAccount): PublicUser {
  const { passwordHash: _removed, ...rest } = user;
  return rest;
}

function createInitialSeed(): EdisonStoreData {
  const now = new Date().toISOString();
  const advertiserId = 'usr_seed_adv_01';
  const submitterId = 'usr_seed_opp_01';
  const adminId = 'usr_seed_adm_01';

  return {
    schemaVersion: 2,
    users: [
      {
        id: advertiserId,
        email: 'advertiser@edison.demo',
        passwordHash: hashPassword('EdisonProto!2026'),
        name: 'Clara Vance (Prototype Seed)',
        organisationName: 'Northstar Retail Group (Sample)',
        role: 'advertiser',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
      {
        id: submitterId,
        email: 'employer@edison.demo',
        passwordHash: hashPassword('EdisonProto!2026'),
        name: 'Samuel Okafor (Prototype Seed)',
        organisationName: 'Civic Skills Academy (Sample)',
        role: 'opportunity_submitter',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
      {
        id: adminId,
        email: 'admin@edison.demo',
        passwordHash: hashPassword('EdisonAdmin!2026'),
        name: 'EDISON Moderation Lead (Prototype Seed)',
        organisationName: 'EDISON Governance Operations',
        role: 'admin',
        verificationStatus: 'verified',
        isPrototypeSeed: true,
        createdAt: now,
      },
    ],
    sessions: [],
    qrLinks: [
      {
        token: 'edison-demo',
        ownerId: advertiserId,
        label: 'Sample Commercial QR (Prototype Seed)',
        destinationType: 'website',
        rawInput: 'https://example.org/edison-commercial-demo',
        resolvedUrl: 'https://example.org/edison-commercial-demo',
        resolvedHost: 'example.org',
        scheme: 'https',
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: now,
      },
      {
        token: 'job-demo',
        ownerId: submitterId,
        label: 'Sample Opportunity QR (Prototype Seed)',
        destinationType: 'job_application',
        rawInput: 'https://example.org/edison-apprenticeship-demo',
        resolvedUrl: 'https://example.org/edison-apprenticeship-demo',
        resolvedHost: 'example.org',
        scheme: 'https',
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: now,
      },
    ],
    analyticsEvents: [],
    auditLogs: [
      {
        id: `aud_${crypto.randomBytes(6).toString('hex')}`,
        actorId: null,
        actorRole: 'system',
        action: 'STORE_INITIALIZED',
        targetType: 'system',
        targetId: 'edison-store',
        detail: 'Prototype persistence initialized with seeded test accounts and sample QR links.',
        createdAt: now,
      },
    ],
  };
}

function normalizeStoreData(parsed: EdisonStoreData): EdisonStoreData {
  const migratedLinks: QrLinkRecord[] = (parsed.qrLinks || []).map((link) => {
    const legacy = link as QrLinkRecord & { scanCount?: number; lastScannedAt?: string | null };
    return {
      ...legacy,
      redirectRequestsTotal: legacy.redirectRequestsTotal ?? legacy.scanCount ?? 0,
      redirectIssuedTotal: legacy.redirectIssuedTotal ?? legacy.scanCount ?? 0,
      suspectedBotRequests: legacy.suspectedBotRequests ?? 0,
      deduplicatedNonBotRedirects: legacy.deduplicatedNonBotRedirects ?? legacy.scanCount ?? 0,
      lastRedirectRequestedAt: legacy.lastRedirectRequestedAt ?? legacy.lastScannedAt ?? null,
    };
  });

  return {
    schemaVersion: 2,
    users: parsed.users || [],
    sessions: parsed.sessions || [],
    qrLinks: migratedLinks,
    analyticsEvents: parsed.analyticsEvents || [],
    auditLogs: parsed.auditLogs || [],
  };
}

class EdisonPrototypeStore {
  private data: EdisonStoreData;
  private lastKnownMtimeMs = 0;
  private recentRedirectMap = new Map<string, number>();

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readFromDisk(): EdisonStoreData | null {
    if (!fs.existsSync(STORE_PATH)) return null;
    const stat = fs.statSync(STORE_PATH);
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as EdisonStoreData;
    if (parsed && typeof parsed.schemaVersion === 'number' && Array.isArray(parsed.users)) {
      this.lastKnownMtimeMs = stat.mtimeMs;
      return normalizeStoreData(parsed);
    }
    return null;
  }

  private loadOrInitialize(): EdisonStoreData {
    this.ensureDataDir();
    try {
      const existing = this.readFromDisk();
      if (existing) return existing;
    } catch {
      // Fall through to re-seed cleanly if corrupt
    }
    const seeded = createInitialSeed();
    this.writeAtomic(seeded);
    return seeded;
  }

  private acquireLock(): void {
    this.ensureDataDir();
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
      try {
        const fd = fs.openSync(LOCK_PATH, 'wx');
        fs.writeSync(fd, `${process.pid}:${Date.now()}`);
        fs.closeSync(fd);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') throw err;
        try {
          const stat = fs.statSync(LOCK_PATH);
          if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
            fs.unlinkSync(LOCK_PATH);
            continue;
          }
        } catch {
          continue;
        }
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for store write lock.');
        }
        // Brief busy-wait yield (1-2ms) for cross-process lock release
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
      }
    }
  }

  private releaseLock(): void {
    try {
      if (fs.existsSync(LOCK_PATH)) {
        fs.unlinkSync(LOCK_PATH);
      }
    } catch {
      // Ignore lock cleanup errors
    }
  }

  private writeAtomic(nextData: EdisonStoreData): void {
    this.ensureDataDir();
    const tmpPath = `${STORE_PATH}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const payload = JSON.stringify(nextData, null, 2);
    const fd = fs.openSync(tmpPath, 'w', 0o600);
    try {
      fs.writeSync(fd, payload, 0, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, STORE_PATH);
    this.lastKnownMtimeMs = fs.statSync(STORE_PATH).mtimeMs;
  }

  /**
   * Executes a read-modify-write transaction under an exclusive advisory lockfile.
   * Reloads from disk if another process modified edison-store.json since our last read,
   * preventing lost updates across concurrent local writers.
   */
  private withWriteTransaction<T>(mutator: (draft: EdisonStoreData) => T): T {
    this.acquireLock();
    try {
      if (fs.existsSync(STORE_PATH)) {
        const stat = fs.statSync(STORE_PATH);
        if (stat.mtimeMs !== this.lastKnownMtimeMs) {
          const diskData = this.readFromDisk();
          if (diskData) {
            this.data = diskData;
          }
        }
      }
      const result = mutator(this.data);
      this.writeAtomic(this.data);
      return result;
    } finally {
      this.releaseLock();
    }
  }

  private syncIfDiskNewer(): void {
    if (!fs.existsSync(STORE_PATH)) return;
    try {
      const stat = fs.statSync(STORE_PATH);
      if (stat.mtimeMs !== this.lastKnownMtimeMs) {
        const diskData = this.readFromDisk();
        if (diskData) {
          this.data = diskData;
        }
      }
    } catch {
      // Keep in-memory state on transient read error
    }
  }

  private addAudit(
    draft: EdisonStoreData,
    actorId: string | null,
    actorRole: UserRole | 'anonymous' | 'system',
    action: string,
    targetType: AuditLogRecord['targetType'],
    targetId: string,
    detail: string
  ): void {
    draft.auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      detail,
      createdAt: new Date().toISOString(),
    });
    if (draft.auditLogs.length > 500) {
      draft.auditLogs.length = 500;
    }
  }

  private pushAnalyticsEvent(draft: EdisonStoreData, event: AnalyticsEventRecord): void {
    draft.analyticsEvents.unshift(event);
    if (draft.analyticsEvents.length > 2000) {
      draft.analyticsEvents.length = 2000;
    }
  }

  registerUser(params: {
    email: string;
    password: string;
    name: string;
    organisationName: string;
    role: 'advertiser' | 'opportunity_submitter';
  }): { user: PublicUser; session: SessionRecord } {
    const emailNorm = params.email.trim().toLowerCase();
    return this.withWriteTransaction((draft) => {
      if (draft.users.some((u) => u.email === emailNorm)) {
        throw new Error('An account with this email already exists.');
      }

      const now = new Date().toISOString();
      const user: UserAccount = {
        id: `usr_${crypto.randomBytes(6).toString('hex')}`,
        email: emailNorm,
        passwordHash: hashPassword(params.password),
        name: params.name.trim(),
        organisationName: params.organisationName.trim() || 'Independent / Individual',
        role: params.role,
        verificationStatus: 'unverified',
        isPrototypeSeed: false,
        createdAt: now,
      };

      draft.users.push(user);
      const session = this.createSessionInDraft(draft, user);
      this.addAudit(
        draft,
        user.id,
        user.role,
        'USER_REGISTERED',
        'auth',
        user.id,
        `Registered ${user.role} account (${user.email}).`
      );
      return { user: toPublicUser(user), session };
    });
  }

  loginUser(email: string, password: string): { user: PublicUser; session: SessionRecord } {
    const emailNorm = email.trim().toLowerCase();
    return this.withWriteTransaction((draft) => {
      const user = draft.users.find((u) => u.email === emailNorm);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        this.addAudit(
          draft,
          null,
          'anonymous',
          'LOGIN_FAILED',
          'auth',
          emailNorm,
          'Invalid login attempt.'
        );
        throw new Error('Invalid email or password.');
      }

      const session = this.createSessionInDraft(draft, user);
      this.addAudit(
        draft,
        user.id,
        user.role,
        'USER_LOGGED_IN',
        'auth',
        user.id,
        `Signed in as ${user.role} (${user.email}).`
      );
      return { user: toPublicUser(user), session };
    });
  }

  private createSessionInDraft(draft: EdisonStoreData, user: UserAccount): SessionRecord {
    const nowMs = Date.now();
    const session: SessionRecord = {
      token: `sess_${crypto.randomBytes(24).toString('hex')}`,
      userId: user.id,
      role: user.role,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + SESSION_TTL_MS).toISOString(),
    };
    draft.sessions = draft.sessions.filter((s) => new Date(s.expiresAt).getTime() > nowMs);
    draft.sessions.push(session);
    return session;
  }

  getUserBySessionToken(token: string | undefined): PublicUser | null {
    if (!token) return null;
    this.syncIfDiskNewer();
    const nowMs = Date.now();
    const session = this.data.sessions.find(
      (s) => s.token === token && new Date(s.expiresAt).getTime() > nowMs
    );
    if (!session) return null;
    const user = this.data.users.find((u) => u.id === session.userId);
    return user ? toPublicUser(user) : null;
  }

  logoutSession(token: string | undefined): void {
    if (!token) return;
    this.withWriteTransaction((draft) => {
      const session = draft.sessions.find((s) => s.token === token);
      draft.sessions = draft.sessions.filter((s) => s.token !== token);
      if (session) {
        this.addAudit(
          draft,
          session.userId,
          session.role,
          'USER_LOGGED_OUT',
          'auth',
          session.userId,
          'Session terminated.'
        );
      }
    });
  }

  listQrLinksForUser(user: PublicUser): QrLinkRecord[] {
    this.syncIfDiskNewer();
    if (user.role === 'admin') {
      return [...this.data.qrLinks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return this.data.qrLinks
      .filter((q) => q.ownerId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createQrLink(
    owner: PublicUser,
    params: { label: string; destinationType: QrDestinationType; rawInput: string }
  ): QrLinkRecord {
    const validation = validateQrDestination(params.rawInput, params.destinationType);
    if (!validation.valid || !validation.scheme) {
      throw new Error(validation.error || 'Invalid QR destination.');
    }

    return this.withWriteTransaction((draft) => {
      const token = crypto.randomBytes(4).toString('hex');
      const record: QrLinkRecord = {
        token,
        ownerId: owner.id,
        label: params.label.trim() || `${params.destinationType} QR`,
        destinationType: params.destinationType,
        rawInput: params.rawInput.trim(),
        resolvedUrl: validation.normalisedUrl,
        resolvedHost: validation.resolvedHost,
        scheme: validation.scheme!,
        status: 'active',
        redirectRequestsTotal: 0,
        redirectIssuedTotal: 0,
        suspectedBotRequests: 0,
        deduplicatedNonBotRedirects: 0,
        lastRedirectRequestedAt: null,
        createdAt: new Date().toISOString(),
      };

      draft.qrLinks.unshift(record);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'QR_LINK_CREATED',
        'qr_link',
        record.token,
        `Created /r/${record.token} -> ${record.resolvedHost}`
      );
      return record;
    });
  }

  updateQrStatus(actor: PublicUser, token: string, status: QrLinkStatus): QrLinkRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.qrLinks.find((q) => q.token === token);
      if (!target) {
        throw new Error('QR token not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this QR link.');
      }
      if (target.status === 'flagged' && actor.role !== 'admin') {
        throw new Error('FORBIDDEN: Only an administrator can unflag a flagged QR link.');
      }

      target.status = status;
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'QR_STATUS_UPDATED',
        'qr_link',
        target.token,
        `Updated /r/${target.token} status to ${status}.`
      );
      return target;
    });
  }

  /**
   * Handles a request to /r/:token with honest event separation:
   * 1. Always records `redirect_requested` when the endpoint receives a request.
   * 2. Never emits `qr_scanned` or `destination_opened` (since HTTP 302 does not prove
   *    either a confirmed human camera scan or that the external destination page loaded).
   * 3. Emits `redirect_issued` only when the HTTP 302 response is cleared to be sent.
   * 4. Tags suspected bot/crawler/prefetch traffic and deduplicates repeated hits within 5s.
   */
  resolveQrRedirect(
    token: string,
    clientIp: string,
    userAgent: string,
    headers: { secPurpose?: string; purpose?: string; xMoz?: string } = {}
  ):
    | { ok: true; record: QrLinkRecord; deduplicated: boolean; isSuspectedBot: boolean }
    | { ok: false; reason: string; statusCode: number } {
    const isSuspectedBot = detectSuspectedBotOrPrefetch(userAgent, headers);
    const ipHash = crypto
      .createHash('sha256')
      .update(`${PROCESS_HASH_SALT}:${clientIp}:${userAgent}`)
      .digest('hex')
      .slice(0, 16);
    const dedupKey = `${token}:${ipHash}`;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const lastHit = this.recentRedirectMap.get(dedupKey);
    const deduplicated = Boolean(lastHit && nowMs - lastHit < DEDUP_WINDOW_MS);

    return this.withWriteTransaction((draft) => {
      const target = draft.qrLinks.find((q) => q.token === token);

      if (!target) {
        this.pushAnalyticsEvent(draft, {
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'not_found',
          createdAt: nowIso,
        });
        return { ok: false, reason: 'QR destination token was not found.', statusCode: 404 };
      }

      target.redirectRequestsTotal += 1;
      target.lastRedirectRequestedAt = nowIso;
      if (isSuspectedBot) {
        target.suspectedBotRequests += 1;
      }

      if (target.status !== 'active') {
        this.pushAnalyticsEvent(draft, {
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: target.token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'inactive',
          createdAt: nowIso,
        });
        return {
          ok: false,
          reason: `This QR destination is currently ${target.status} and cannot redirect.`,
          statusCode: 410,
        };
      }

      const recheck = validateQrDestination(target.resolvedUrl, target.destinationType);
      if (!recheck.valid) {
        target.status = 'flagged';
        this.pushAnalyticsEvent(draft, {
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          qrToken: target.token,
          campaignId: null,
          eventType: 'redirect_requested',
          measurementSource: 'real_measured',
          dedupKey,
          isSuspectedBot,
          isDeduplicated: deduplicated,
          redirectOutcome: 'flagged',
          createdAt: nowIso,
        });
        this.addAudit(
          draft,
          null,
          'system',
          'QR_AUTO_FLAGGED',
          'qr_link',
          target.token,
          `Redirect blocked on re-validation: ${recheck.error}`
        );
        return {
          ok: false,
          reason: 'Destination failed safety validation and was flagged for review.',
          statusCode: 403,
        };
      }

      // Record redirect_requested before issuing HTTP 302
      this.pushAnalyticsEvent(draft, {
        id: `evt_${crypto.randomBytes(6).toString('hex')}`,
        qrToken: target.token,
        campaignId: null,
        eventType: 'redirect_requested',
        measurementSource: 'real_measured',
        dedupKey,
        isSuspectedBot,
        isDeduplicated: deduplicated,
        redirectOutcome: 'issued',
        createdAt: nowIso,
      });

      target.redirectIssuedTotal += 1;
      if (!isSuspectedBot && !deduplicated) {
        this.recentRedirectMap.set(dedupKey, nowMs);
        target.deduplicatedNonBotRedirects += 1;
      }

      // Record redirect_issued (NOT qr_scanned or destination_opened)
      this.pushAnalyticsEvent(draft, {
        id: `evt_${crypto.randomBytes(6).toString('hex')}`,
        qrToken: target.token,
        campaignId: null,
        eventType: 'redirect_issued',
        measurementSource: 'real_measured',
        dedupKey,
        isSuspectedBot,
        isDeduplicated: deduplicated,
        redirectOutcome: 'issued',
        createdAt: nowIso,
      });

      return { ok: true, record: { ...target }, deduplicated, isSuspectedBot };
    });
  }

  listAuditLogs(): AuditLogRecord[] {
    this.syncIfDiskNewer();
    return [...this.data.auditLogs];
  }

  listAnalyticsEvents(limit = 50): AnalyticsEventRecord[] {
    this.syncIfDiskNewer();
    return this.data.analyticsEvents.slice(0, limit);
  }

  getFoundationSummary() {
    this.syncIfDiskNewer();
    return {
      userCount: this.data.users.length,
      qrCount: this.data.qrLinks.length,
      redirectRequestsTotal: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_requested' && e.measurementSource === 'real_measured'
      ).length,
      redirectIssuedTotal: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_issued' && e.measurementSource === 'real_measured'
      ).length,
      suspectedBotRedirects: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'redirect_requested' && e.isSuspectedBot === true
      ).length,
      verifiedDestinationOpens: this.data.analyticsEvents.filter(
        (e) => e.eventType === 'destination_opened'
      ).length,
      auditLogCount: this.data.auditLogs.length,
      storagePath: 'data/edison-store.json (Locked Atomic Write)',
    };
  }
}

export const edisonStore = new EdisonPrototypeStore();
