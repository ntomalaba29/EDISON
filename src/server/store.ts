import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AccountVerificationStatus,
  AdvertiserEntityType,
  AdvertiserProfile,
  AnalyticsEventRecord,
  AuditLogRecord,
  BillingEstimateSummary,
  CampaignContentCategory,
  CampaignRecord,
  CampaignStatus,
  DaypartSlot,
  EdisonStoreData,
  PublicUser,
  QrDestinationType,
  QrLinkRecord,
  QrLinkStatus,
  SessionRecord,
  SupportTicketCategory,
  SupportTicketRecord,
  SupportTicketStatus,
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

export const ALL_CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'scheduled',
  'active',
  'paused',
  'completed',
  'expired',
] as const;

export const ALLOWED_CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['submitted', 'expired'],
  submitted: ['under_review', 'approved', 'rejected', 'draft', 'expired'],
  under_review: ['approved', 'rejected', 'draft'],
  approved: ['scheduled', 'active', 'paused', 'expired'],
  rejected: ['draft', 'submitted'],
  scheduled: ['active', 'paused', 'completed', 'expired'],
  active: ['paused', 'completed', 'expired'],
  paused: ['active', 'scheduled', 'completed', 'expired'],
  completed: [],
  expired: ['draft'],
};

const ADMIN_ONLY_TARGET_STATUSES: ReadonlySet<CampaignStatus> = new Set([
  'under_review',
  'approved',
  'rejected',
]);

export function computeSimulatedBillingEstimate(params: {
  durationSeconds: number;
  dailyFrequencyCap: number;
  startDate: string;
  endDate: string;
  targetRegions: string[];
  dayparts: DaypartSlot[];
}): BillingEstimateSummary {
  const startMs = Date.parse(params.startDate);
  const endMs = Date.parse(params.endDate);
  const days =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1)
      : 7;

  const regionFactor = Math.max(1, params.targetRegions.length);
  const spotsPerDay = Math.max(1, params.dailyFrequencyCap) * regionFactor;
  const estimatedSpots = days * spotsPerDay;

  const durationMultiplier = Math.max(0.5, params.durationSeconds / 15);
  const primetimeMultiplier = params.dayparts.includes('primetime') || params.dayparts.includes('all_day') ? 1.35 : 1.0;
  const estimatedRatePerSpotUsd = Number((4.5 * durationMultiplier * primetimeMultiplier).toFixed(2));
  const estimatedTotalUsd = Number((estimatedSpots * estimatedRatePerSpotUsd).toFixed(2));

  return {
    model: 'simulated_cpm_flat_rate',
    currency: 'USD',
    estimatedSpots,
    estimatedRatePerSpotUsd,
    estimatedTotalUsd,
    paymentCollectionActive: false,
    disclaimer:
      'SIMULATED PROTOTYPE ESTIMATE ONLY — No real billing, card processing, or commercial invoices are active in Phase 2.',
  };
}

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

function isoDateDaysFromNow(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

function buildSeedAdvertiserProfiles(now: string): AdvertiserProfile[] {
  return [
    {
      userId: 'usr_seed_adv_01',
      entityType: 'registered_business',
      businessOrTradingName: 'Northstar Retail Group (Prototype Seed)',
      registrationOrTaxId: 'PROTO-REG-88412',
      industryCategory: 'Retail & Consumer Goods',
      countryCode: 'GB',
      cityRegion: 'London / South East',
      physicalAddress: '14 Harbour Way, London E14 (Sample Address)',
      primaryContactName: 'Clara Vance',
      primaryContactEmail: 'advertiser@edison.demo',
      primaryContactPhone: '+442079460192',
      billingContactName: 'Northstar Accounts Payable',
      billingContactEmail: 'billing@northstar.example',
      websiteUrl: 'https://example.org/northstar-retail',
      verificationStatus: 'verified',
      verificationNotes: 'Prototype seed advertiser profile verified for demonstration workflows.',
      isPrototypeSeed: true,
      updatedAt: now,
    },
    {
      userId: 'usr_seed_opp_01',
      entityType: 'public_ngo',
      businessOrTradingName: 'Civic Skills Academy (Prototype Seed)',
      registrationOrTaxId: 'PROTO-CHARITY-4410',
      industryCategory: 'Education & Apprenticeships',
      countryCode: 'GB',
      cityRegion: 'Manchester / North West',
      physicalAddress: '8 Foundry Street, Manchester M1 (Sample Address)',
      primaryContactName: 'Samuel Okafor',
      primaryContactEmail: 'employer@edison.demo',
      primaryContactPhone: '+441614960311',
      billingContactName: 'Civic Grants Office',
      billingContactEmail: 'grants@civicskills.example',
      websiteUrl: 'https://example.org/civic-skills',
      verificationStatus: 'verified',
      verificationNotes: 'Prototype seed opportunity provider account.',
      isPrototypeSeed: true,
      updatedAt: now,
    },
  ];
}

function buildSeedCampaigns(now: string): CampaignRecord[] {
  const startActive = isoDateDaysFromNow(-2);
  const endActive = isoDateDaysFromNow(28);
  const startFuture = isoDateDaysFromNow(10);
  const endFuture = isoDateDaysFromNow(40);
  const startPast = isoDateDaysFromNow(-30);
  const endPast = isoDateDaysFromNow(-5);

  return [
    {
      id: 'cmp_seed_01',
      ownerId: 'usr_seed_adv_01',
      title: 'Northstar Autumn Homeware Launch (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Direct-to-store QR offer for smart home appliances during evening entertainment breaks.',
      qrToken: 'edison-demo',
      adCreativeRef: null,
      durationSeconds: 30,
      dailyFrequencyCap: 4,
      targetRegions: ['United Kingdom · National', 'Ireland · Metro'],
      dayparts: ['primetime', 'daytime'],
      startDate: startActive,
      endDate: endActive,
      status: 'active',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        durationSeconds: 30,
        dailyFrequencyCap: 4,
        startDate: startActive,
        endDate: endActive,
        targetRegions: ['United Kingdom · National', 'Ireland · Metro'],
        dayparts: ['primetime', 'daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_02',
      ownerId: 'usr_seed_adv_01',
      title: 'Weekend Flash Clearance Spot (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Short 15-second commercial break reminder awaiting moderator creative inspection.',
      qrToken: 'edison-demo',
      adCreativeRef: null,
      durationSeconds: 15,
      dailyFrequencyCap: 6,
      targetRegions: ['United Kingdom · Midlands'],
      dayparts: ['morning', 'daytime'],
      startDate: startFuture,
      endDate: endFuture,
      status: 'submitted',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        durationSeconds: 15,
        dailyFrequencyCap: 6,
        startDate: startFuture,
        endDate: endFuture,
        targetRegions: ['United Kingdom · Midlands'],
        dayparts: ['morning', 'daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_03',
      ownerId: 'usr_seed_opp_01',
      title: 'Civic Skills Electrical Apprenticeship Broadcast (Prototype Seed)',
      contentCategory: 'opportunity_promotion',
      summary: 'Zero-fee apprenticeship recruitment spot linking viewers directly to official intake form.',
      qrToken: 'job-demo',
      adCreativeRef: null,
      durationSeconds: 30,
      dailyFrequencyCap: 3,
      targetRegions: ['United Kingdom · North West'],
      dayparts: ['daytime', 'primetime'],
      startDate: startFuture,
      endDate: endFuture,
      status: 'scheduled',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        durationSeconds: 30,
        dailyFrequencyCap: 3,
        startDate: startFuture,
        endDate: endFuture,
        targetRegions: ['United Kingdom · North West'],
        dayparts: ['daytime', 'primetime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp_seed_04',
      ownerId: 'usr_seed_adv_01',
      title: 'Summer Clearance Recap (Prototype Seed)',
      contentCategory: 'commercial_advertising',
      summary: 'Completed seasonal campaign preserved in ledger for clone/relaunch verification.',
      qrToken: 'edison-demo',
      adCreativeRef: null,
      durationSeconds: 20,
      dailyFrequencyCap: 2,
      targetRegions: ['United Kingdom · Scotland'],
      dayparts: ['daytime'],
      startDate: startPast,
      endDate: endPast,
      status: 'completed',
      rejectionReason: null,
      fixInstructions: null,
      simulatedEstimate: computeSimulatedBillingEstimate({
        durationSeconds: 20,
        dailyFrequencyCap: 2,
        startDate: startPast,
        endDate: endPast,
        targetRegions: ['United Kingdom · Scotland'],
        dayparts: ['daytime'],
      }),
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedTickets(now: string): SupportTicketRecord[] {
  return [
    {
      id: 'tkt_seed_01',
      ownerId: 'usr_seed_adv_01',
      campaignId: 'cmp_seed_02',
      category: 'campaign_review',
      subject: 'Confirm QR safe-zone margin on 15s weekend spot (Prototype Seed)',
      message: 'Submitted campaign for moderation queue check before Friday broadcast window.',
      status: 'open',
      adminResponse: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createInitialSeed(): EdisonStoreData {
  const now = new Date().toISOString();
  const advertiserId = 'usr_seed_adv_01';
  const submitterId = 'usr_seed_opp_01';
  const adminId = 'usr_seed_adm_01';

  return {
    schemaVersion: 3,
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
    advertiserProfiles: buildSeedAdvertiserProfiles(now),
    campaigns: buildSeedCampaigns(now),
    supportTickets: buildSeedTickets(now),
    analyticsEvents: [],
    auditLogs: [
      {
        id: `aud_${crypto.randomBytes(6).toString('hex')}`,
        actorId: null,
        actorRole: 'system',
        action: 'STORE_INITIALIZED',
        targetType: 'system',
        targetId: 'edison-store',
        detail: 'Prototype persistence initialized (schema v3) with seeded accounts, QR links, profiles, and campaigns.',
        createdAt: now,
      },
    ],
  };
}

function normalizeStoreData(parsed: EdisonStoreData): EdisonStoreData {
  const now = new Date().toISOString();
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

  const existingProfiles = Array.isArray(parsed.advertiserProfiles) ? parsed.advertiserProfiles : [];
  const profiles =
    existingProfiles.length > 0 ? existingProfiles : buildSeedAdvertiserProfiles(now);

  const existingCampaigns = Array.isArray(parsed.campaigns) ? parsed.campaigns : [];
  const campaigns =
    existingCampaigns.length > 0 ? existingCampaigns : buildSeedCampaigns(now);

  const existingTickets = Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [];
  const supportTickets =
    existingTickets.length > 0 ? existingTickets : buildSeedTickets(now);

  return {
    schemaVersion: 3,
    users: parsed.users || [],
    sessions: parsed.sessions || [],
    qrLinks: migratedLinks,
    advertiserProfiles: profiles,
    campaigns,
    supportTickets,
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
      const orgName = params.organisationName.trim() || 'Independent / Individual';
      const user: UserAccount = {
        id: `usr_${crypto.randomBytes(6).toString('hex')}`,
        email: emailNorm,
        passwordHash: hashPassword(params.password),
        name: params.name.trim(),
        organisationName: orgName,
        role: params.role,
        verificationStatus: 'unverified',
        isPrototypeSeed: false,
        createdAt: now,
      };

      draft.users.push(user);
      draft.advertiserProfiles.push({
        userId: user.id,
        entityType: orgName === 'Independent / Individual' ? 'individual_sole_trader' : 'registered_business',
        businessOrTradingName: orgName,
        registrationOrTaxId: '',
        industryCategory: params.role === 'opportunity_submitter' ? 'Employment & Opportunities' : 'General Commercial',
        countryCode: 'GB',
        cityRegion: '',
        physicalAddress: '',
        primaryContactName: user.name,
        primaryContactEmail: user.email,
        primaryContactPhone: '',
        billingContactName: user.name,
        billingContactEmail: user.email,
        websiteUrl: '',
        verificationStatus: 'unverified',
        verificationNotes: '',
        isPrototypeSeed: false,
        updatedAt: now,
      });

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

  // --- QR Links & Redirect Core ---

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

  // --- Advertiser Profiles (Block 2.2) ---

  getAdvertiserProfile(user: PublicUser): AdvertiserProfile {
    this.syncIfDiskNewer();
    const existing = this.data.advertiserProfiles.find((p) => p.userId === user.id);
    if (existing) {
      return { ...existing };
    }
    return this.withWriteTransaction((draft) => {
      const again = draft.advertiserProfiles.find((p) => p.userId === user.id);
      if (again) return { ...again };
      const now = new Date().toISOString();
      const created: AdvertiserProfile = {
        userId: user.id,
        entityType: 'registered_business',
        businessOrTradingName: user.organisationName,
        registrationOrTaxId: '',
        industryCategory: 'General Commercial',
        countryCode: 'GB',
        cityRegion: '',
        physicalAddress: '',
        primaryContactName: user.name,
        primaryContactEmail: user.email,
        primaryContactPhone: '',
        billingContactName: user.name,
        billingContactEmail: user.email,
        websiteUrl: '',
        verificationStatus: user.verificationStatus,
        verificationNotes: '',
        isPrototypeSeed: user.isPrototypeSeed,
        updatedAt: now,
      };
      draft.advertiserProfiles.push(created);
      return { ...created };
    });
  }

  listAllAdvertiserProfiles(): AdvertiserProfile[] {
    this.syncIfDiskNewer();
    return [...this.data.advertiserProfiles].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  upsertAdvertiserProfile(
    actor: PublicUser,
    input: {
      entityType: AdvertiserEntityType;
      businessOrTradingName: string;
      registrationOrTaxId?: string;
      industryCategory: string;
      countryCode: string;
      cityRegion: string;
      physicalAddress: string;
      primaryContactName: string;
      primaryContactEmail: string;
      primaryContactPhone: string;
      billingContactName: string;
      billingContactEmail: string;
      websiteUrl?: string;
      requestVerification?: boolean;
    }
  ): AdvertiserProfile {
    if (!input.businessOrTradingName.trim()) {
      throw new Error('Business or trading name is required.');
    }
    if (!input.primaryContactName.trim() || !input.primaryContactEmail.trim()) {
      throw new Error('Primary contact name and email are required.');
    }

    if (input.websiteUrl && input.websiteUrl.trim()) {
      const check = validateQrDestination(input.websiteUrl.trim(), 'website');
      if (!check.valid) {
        throw new Error(`Website URL invalid: ${check.error}`);
      }
    }

    return this.withWriteTransaction((draft) => {
      const now = new Date().toISOString();
      let profile = draft.advertiserProfiles.find((p) => p.userId === actor.id);
      if (!profile) {
        profile = {
          userId: actor.id,
          entityType: input.entityType,
          businessOrTradingName: input.businessOrTradingName.trim(),
          registrationOrTaxId: '',
          industryCategory: input.industryCategory.trim() || 'General Commercial',
          countryCode: input.countryCode.trim().toUpperCase() || 'GB',
          cityRegion: '',
          physicalAddress: '',
          primaryContactName: input.primaryContactName.trim(),
          primaryContactEmail: input.primaryContactEmail.trim(),
          primaryContactPhone: '',
          billingContactName: '',
          billingContactEmail: '',
          websiteUrl: '',
          verificationStatus: 'unverified',
          verificationNotes: '',
          isPrototypeSeed: false,
          updatedAt: now,
        };
        draft.advertiserProfiles.push(profile);
      }

      profile.entityType = input.entityType;
      profile.businessOrTradingName = input.businessOrTradingName.trim();
      profile.registrationOrTaxId = (input.registrationOrTaxId ?? '').trim();
      profile.industryCategory = input.industryCategory.trim() || 'General Commercial';
      profile.countryCode = input.countryCode.trim().toUpperCase() || 'GB';
      profile.cityRegion = input.cityRegion.trim();
      profile.physicalAddress = input.physicalAddress.trim();
      profile.primaryContactName = input.primaryContactName.trim();
      profile.primaryContactEmail = input.primaryContactEmail.trim();
      profile.primaryContactPhone = input.primaryContactPhone.trim();
      profile.billingContactName = input.billingContactName.trim() || profile.primaryContactName;
      profile.billingContactEmail = input.billingContactEmail.trim() || profile.primaryContactEmail;
      profile.websiteUrl = (input.websiteUrl ?? '').trim();
      profile.updatedAt = now;

      const userAccount = draft.users.find((u) => u.id === actor.id);
      if (userAccount) {
        userAccount.organisationName = profile.businessOrTradingName;
      }

      if (input.requestVerification && profile.verificationStatus === 'unverified') {
        profile.verificationStatus = 'pending_review';
        if (userAccount) {
          userAccount.verificationStatus = 'pending_review';
        }
        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'ADVERTISER_VERIFICATION_REQUESTED',
          'advertiser_profile',
          actor.id,
          `Requested profile verification for ${profile.businessOrTradingName}.`
        );
      } else {
        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'ADVERTISER_PROFILE_UPDATED',
          'advertiser_profile',
          actor.id,
          `Updated advertiser profile (${profile.businessOrTradingName}).`
        );
      }

      return { ...profile };
    });
  }

  adminUpdateAdvertiserVerification(
    admin: PublicUser,
    targetUserId: string,
    status: AccountVerificationStatus,
    notes: string
  ): AdvertiserProfile {
    if (admin.role !== 'admin') {
      throw new Error('FORBIDDEN: Only administrators can alter verification status.');
    }
    if (!notes.trim()) {
      throw new Error('Verification notes / reason are mandatory.');
    }

    return this.withWriteTransaction((draft) => {
      const profile = draft.advertiserProfiles.find((p) => p.userId === targetUserId);
      if (!profile) {
        throw new Error('Advertiser profile not found.');
      }
      profile.verificationStatus = status;
      profile.verificationNotes = notes.trim();
      profile.updatedAt = new Date().toISOString();

      const user = draft.users.find((u) => u.id === targetUserId);
      if (user) {
        user.verificationStatus = status;
      }

      this.addAudit(
        draft,
        admin.id,
        admin.role,
        'ADVERTISER_VERIFICATION_UPDATED',
        'advertiser_profile',
        targetUserId,
        `Set verificationStatus=${status}. Note: ${notes.trim()}`
      );
      return { ...profile };
    });
  }

  // --- Campaign Management & 10-State Lifecycle (Block 2.2) ---

  listCampaignsForUser(user: PublicUser, statusFilter?: CampaignStatus | 'all'): CampaignRecord[] {
    this.syncIfDiskNewer();
    const scoped =
      user.role === 'admin'
        ? [...this.data.campaigns]
        : this.data.campaigns.filter((c) => c.ownerId === user.id);

    const filtered =
      statusFilter && statusFilter !== 'all'
        ? scoped.filter((c) => c.status === statusFilter)
        : scoped;

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createCampaign(
    owner: PublicUser,
    input: {
      title: string;
      contentCategory: CampaignContentCategory;
      summary: string;
      qrToken?: string | null;
      durationSeconds: number;
      dailyFrequencyCap: number;
      targetRegions: string[];
      dayparts: DaypartSlot[];
      startDate: string;
      endDate: string;
    }
  ): CampaignRecord {
    const title = input.title.trim();
    if (title.length < 3) {
      throw new Error('Campaign title must be at least 3 characters.');
    }
    if (!input.startDate || !input.endDate || input.endDate < input.startDate) {
      throw new Error('End date must be on or after the start date.');
    }
    if (input.durationSeconds < 5 || input.durationSeconds > 120) {
      throw new Error('Advertisement duration must be between 5 and 120 seconds.');
    }
    if (input.dailyFrequencyCap < 1 || input.dailyFrequencyCap > 48) {
      throw new Error('Daily frequency cap must be between 1 and 48 plays.');
    }

    const regions = input.targetRegions.map((r) => r.trim()).filter(Boolean);
    const dayparts: DaypartSlot[] = input.dayparts.length > 0 ? input.dayparts : ['daytime'];

    return this.withWriteTransaction((draft) => {
      let resolvedQrToken: string | null = null;
      if (input.qrToken) {
        const qr = draft.qrLinks.find((q) => q.token === input.qrToken);
        if (!qr) {
          throw new Error('Selected QR token was not found.');
        }
        if (owner.role !== 'admin' && qr.ownerId !== owner.id) {
          throw new Error('FORBIDDEN: You can only attach your own QR links.');
        }
        resolvedQrToken = qr.token;
      }

      const now = new Date().toISOString();
      const record: CampaignRecord = {
        id: `cmp_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: owner.id,
        title,
        contentCategory: input.contentCategory,
        summary: input.summary.trim(),
        qrToken: resolvedQrToken,
        adCreativeRef: null,
        durationSeconds: Math.round(input.durationSeconds),
        dailyFrequencyCap: Math.round(input.dailyFrequencyCap),
        targetRegions: regions.length > 0 ? regions : ['United Kingdom · National'],
        dayparts,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'draft',
        rejectionReason: null,
        fixInstructions: null,
        simulatedEstimate: computeSimulatedBillingEstimate({
          durationSeconds: Math.round(input.durationSeconds),
          dailyFrequencyCap: Math.round(input.dailyFrequencyCap),
          startDate: input.startDate,
          endDate: input.endDate,
          targetRegions: regions.length > 0 ? regions : ['United Kingdom · National'],
          dayparts,
        }),
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };

      draft.campaigns.unshift(record);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'CAMPAIGN_CREATED',
        'campaign',
        record.id,
        `Created draft campaign "${record.title}".`
      );
      return { ...record };
    });
  }

  updateCampaign(
    actor: PublicUser,
    campaignId: string,
    patch: {
      title?: string;
      contentCategory?: CampaignContentCategory;
      summary?: string;
      qrToken?: string | null;
      durationSeconds?: number;
      dailyFrequencyCap?: number;
      targetRegions?: string[];
      dayparts?: DaypartSlot[];
      startDate?: string;
      endDate?: string;
    }
  ): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.campaigns.find((c) => c.id === campaignId);
      if (!target) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }
      if (
        actor.role !== 'admin' &&
        target.status !== 'draft' &&
        target.status !== 'rejected' &&
        target.status !== 'paused'
      ) {
        throw new Error(
          `Cannot edit campaign while status is "${target.status}". Move it to draft or paused first.`
        );
      }

      const nextTitle = patch.title !== undefined ? patch.title.trim() : target.title;
      if (nextTitle.length < 3) {
        throw new Error('Campaign title must be at least 3 characters.');
      }

      const nextStart = patch.startDate ?? target.startDate;
      const nextEnd = patch.endDate ?? target.endDate;
      if (nextEnd < nextStart) {
        throw new Error('End date must be on or after start date.');
      }

      const nextDuration =
        patch.durationSeconds !== undefined ? Math.round(patch.durationSeconds) : target.durationSeconds;
      if (nextDuration < 5 || nextDuration > 120) {
        throw new Error('Advertisement duration must be between 5 and 120 seconds.');
      }

      const nextCap =
        patch.dailyFrequencyCap !== undefined
          ? Math.round(patch.dailyFrequencyCap)
          : target.dailyFrequencyCap;
      if (nextCap < 1 || nextCap > 48) {
        throw new Error('Daily frequency cap must be between 1 and 48 plays.');
      }

      if (patch.qrToken !== undefined) {
        if (patch.qrToken === null || patch.qrToken === '') {
          target.qrToken = null;
        } else {
          const qr = draft.qrLinks.find((q) => q.token === patch.qrToken);
          if (!qr) {
            throw new Error('Selected QR token was not found.');
          }
          if (actor.role !== 'admin' && qr.ownerId !== target.ownerId) {
            throw new Error('FORBIDDEN: You can only attach your own QR links.');
          }
          target.qrToken = qr.token;
        }
      }

      target.title = nextTitle;
      if (patch.contentCategory) target.contentCategory = patch.contentCategory;
      if (patch.summary !== undefined) target.summary = patch.summary.trim();
      target.durationSeconds = nextDuration;
      target.dailyFrequencyCap = nextCap;
      if (patch.targetRegions) {
        const cleaned = patch.targetRegions.map((r) => r.trim()).filter(Boolean);
        target.targetRegions = cleaned.length > 0 ? cleaned : ['United Kingdom · National'];
      }
      if (patch.dayparts && patch.dayparts.length > 0) {
        target.dayparts = patch.dayparts;
      }
      target.startDate = nextStart;
      target.endDate = nextEnd;
      target.simulatedEstimate = computeSimulatedBillingEstimate({
        durationSeconds: target.durationSeconds,
        dailyFrequencyCap: target.dailyFrequencyCap,
        startDate: target.startDate,
        endDate: target.endDate,
        targetRegions: target.targetRegions,
        dayparts: target.dayparts,
      });
      target.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_UPDATED',
        'campaign',
        target.id,
        `Updated campaign "${target.title}".`
      );
      return { ...target };
    });
  }

  cloneCampaign(actor: PublicUser, campaignId: string): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const source = draft.campaigns.find((c) => c.id === campaignId);
      if (!source) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && source.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      const now = new Date().toISOString();
      const copy: CampaignRecord = {
        ...source,
        id: `cmp_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: actor.role === 'admin' ? source.ownerId : actor.id,
        title: `${source.title.replace(/\s*\(Prototype Seed\)$/i, '')} (Copy)`,
        status: 'draft',
        rejectionReason: null,
        fixInstructions: null,
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.campaigns.unshift(copy);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_CLONED',
        'campaign',
        copy.id,
        `Cloned campaign ${source.id} -> ${copy.id} (draft).`
      );
      return { ...copy };
    });
  }

  transitionCampaignStatus(
    actor: PublicUser,
    campaignId: string,
    targetStatus: CampaignStatus,
    options: { rejectionReason?: string; fixInstructions?: string } = {}
  ): CampaignRecord {
    return this.withWriteTransaction((draft) => {
      const target = draft.campaigns.find((c) => c.id === campaignId);
      if (!target) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      if (ADMIN_ONLY_TARGET_STATUSES.has(targetStatus) && actor.role !== 'admin') {
        throw new Error(
          `FORBIDDEN: Only an administrator can transition a campaign to "${targetStatus}".`
        );
      }

      const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[target.status] || [];
      if (!allowed.includes(targetStatus)) {
        throw new Error(
          `Invalid state transition: "${target.status}" cannot move directly to "${targetStatus}".`
        );
      }

      if (targetStatus === 'submitted') {
        if (!target.qrToken) {
          throw new Error('Attach a validated QR redirect link before submitting a campaign.');
        }
        const qr = draft.qrLinks.find((q) => q.token === target.qrToken);
        if (!qr || qr.status !== 'active') {
          throw new Error('Attached QR redirect link must be active before submission.');
        }
      }

      if (targetStatus === 'rejected') {
        const reason = (options.rejectionReason ?? '').trim();
        if (reason.length < 5) {
          throw new Error('A written rejection reason (min 5 characters) is mandatory.');
        }
        target.rejectionReason = reason;
        target.fixInstructions = (options.fixInstructions ?? '').trim() || null;
      } else if (targetStatus === 'approved' || targetStatus === 'draft' || targetStatus === 'submitted') {
        target.rejectionReason = null;
        target.fixInstructions = null;
      }

      const prevStatus = target.status;
      target.status = targetStatus;
      target.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_STATUS_TRANSITION',
        'campaign',
        target.id,
        `Campaign ${target.id} transitioned ${prevStatus} -> ${targetStatus}${
          target.rejectionReason ? ` (Reason: ${target.rejectionReason})` : ''
        }`
      );
      return { ...target };
    });
  }

  deleteCampaign(actor: PublicUser, campaignId: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.campaigns.findIndex((c) => c.id === campaignId);
      if (idx === -1) {
        throw new Error('Campaign not found.');
      }
      const target = draft.campaigns[idx];
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }
      if (
        actor.role !== 'admin' &&
        target.status !== 'draft' &&
        target.status !== 'rejected' &&
        target.status !== 'expired'
      ) {
        throw new Error('Only draft, rejected, or expired campaigns can be deleted.');
      }

      draft.campaigns.splice(idx, 1);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'CAMPAIGN_DELETED',
        'campaign',
        target.id,
        `Deleted campaign "${target.title}".`
      );
    });
  }

  // --- Support & Dispute Tickets (Block 2.2) ---

  listSupportTicketsForUser(user: PublicUser): SupportTicketRecord[] {
    this.syncIfDiskNewer();
    const list =
      user.role === 'admin'
        ? [...this.data.supportTickets]
        : this.data.supportTickets.filter((t) => t.ownerId === user.id);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createSupportTicket(
    owner: PublicUser,
    input: {
      campaignId?: string | null;
      category: SupportTicketCategory;
      subject: string;
      message: string;
    }
  ): SupportTicketRecord {
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (subject.length < 4 || message.length < 8) {
      throw new Error('Ticket subject (min 4 chars) and message (min 8 chars) are required.');
    }

    return this.withWriteTransaction((draft) => {
      const now = new Date().toISOString();
      const ticket: SupportTicketRecord = {
        id: `tkt_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: owner.id,
        campaignId: input.campaignId || null,
        category: input.category,
        subject,
        message,
        status: 'open',
        adminResponse: null,
        createdAt: now,
        updatedAt: now,
      };
      draft.supportTickets.unshift(ticket);
      this.addAudit(
        draft,
        owner.id,
        owner.role,
        'SUPPORT_TICKET_CREATED',
        'support_ticket',
        ticket.id,
        `Created ${ticket.category} ticket: ${ticket.subject}`
      );
      return { ...ticket };
    });
  }

  updateSupportTicketStatus(
    actor: PublicUser,
    ticketId: string,
    status: SupportTicketStatus,
    adminResponse?: string
  ): SupportTicketRecord {
    return this.withWriteTransaction((draft) => {
      const ticket = draft.supportTickets.find((t) => t.id === ticketId);
      if (!ticket) {
        throw new Error('Support ticket not found.');
      }
      if (actor.role !== 'admin' && ticket.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ticket.');
      }
      if (actor.role !== 'admin' && status !== 'closed') {
        throw new Error('FORBIDDEN: Only administrators can move tickets to in_review or resolved.');
      }

      ticket.status = status;
      if (adminResponse !== undefined && actor.role === 'admin') {
        ticket.adminResponse = adminResponse.trim() || null;
      }
      ticket.updatedAt = new Date().toISOString();

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'SUPPORT_TICKET_UPDATED',
        'support_ticket',
        ticket.id,
        `Updated ticket status to ${status}.`
      );
      return { ...ticket };
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
      campaignCount: this.data.campaigns.length,
      activeCampaignCount: this.data.campaigns.filter((c) => c.status === 'active').length,
      profileCount: this.data.advertiserProfiles.length,
      openTicketCount: this.data.supportTickets.filter(
        (t) => t.status === 'open' || t.status === 'in_review'
      ).length,
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
