import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AccountVerificationStatus,
  AdCreativeRecord,
  AdCreativeStatus,
  AdStudioMode,
  AdvertiserEntityType,
  AdvertiserProfile,
  AnalyticsEventRecord,
  AuditLogRecord,
  BillingEstimateSummary,
  CampaignContentCategory,
  CampaignPreviewGateResult,
  CampaignRecord,
  CampaignStatus,
  DaypartSlot,
  EdisonStoreData,
  LiveReportSnapshot,
  OptionAComposition,
  OptionBUploadSpec,
  PreSubmitCheckItem,
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
      adCreativeRef: 'crt_seed_01',
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
      adCreativeRef: 'crt_seed_02',
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

function buildSeedAdCreatives(now: string): AdCreativeRecord[] {
  return [
    {
      id: 'crt_seed_01',
      ownerId: 'usr_seed_adv_01',
      campaignId: 'cmp_seed_01',
      qrToken: 'edison-demo',
      title: 'Northstar Autumn Smart-Home TV Spot (Prototype Seed)',
      mode: 'option_a_studio',
      displayDurationSeconds: 30,
      safeZoneWarnings: [],
      contrastWarnings: [],
      optionA: {
        templateId: 'commercial_offer',
        backgroundColor: '#0F172A',
        gradientEndColor: '#1E3A8A',
        useGradient: true,
        accentColor: '#F59E0B',
        textColor: '#FFFFFF',
        scrimOpacity: 0.35,
        logoUrl: null,
        productImageUrl: null,
        backgroundImageUrl: null,
        heading: 'Upgrade Home Comfort This Autumn',
        description: 'Energy-rated appliances with nationwide installation and 3-year manufacturer warranty.',
        promoText: 'LIMITED OFFER · SAVE 20%',
        priceOrValue: 'From $299',
        contactDetails: '+44 20 7946 0192 · Northstar Retail',
        websiteAddress: 'example.org/edison-commercial-demo',
        callToAction: 'Scan QR to Claim Offer',
        qrPlacement: 'bottom_right',
        elements: [
          { id: 'el_logo', kind: 'logo', label: 'Brand Logo', xPct: 6, yPct: 7, widthPct: 16, heightPct: 12, zIndex: 2, fontSizePx: 14, visible: true },
          { id: 'el_promo', kind: 'promo_badge', label: 'Promo Text', xPct: 6, yPct: 22, widthPct: 42, heightPct: 8, zIndex: 3, fontSizePx: 14, visible: true },
          { id: 'el_head', kind: 'headline', label: 'Main Headline', xPct: 6, yPct: 33, widthPct: 58, heightPct: 18, zIndex: 4, fontSizePx: 32, visible: true },
          { id: 'el_desc', kind: 'description', label: 'Description', xPct: 6, yPct: 54, widthPct: 56, heightPct: 15, zIndex: 4, fontSizePx: 16, visible: true },
          { id: 'el_price', kind: 'price_value', label: 'Price / Offer', xPct: 6, yPct: 72, widthPct: 28, heightPct: 11, zIndex: 5, fontSizePx: 26, visible: true },
          { id: 'el_cta', kind: 'cta_button', label: 'Call to Action', xPct: 6, yPct: 85, widthPct: 34, heightPct: 8, zIndex: 5, fontSizePx: 15, visible: true },
          { id: 'el_contact', kind: 'contact_info', label: 'Contact & Site', xPct: 42, yPct: 86, widthPct: 32, heightPct: 7, zIndex: 4, fontSizePx: 12, visible: true },
          { id: 'el_qr', kind: 'qr_block', label: 'QR Code Block', xPct: 76, yPct: 58, widthPct: 18, heightPct: 32, zIndex: 6, fontSizePx: 12, visible: true },
        ],
      },
      optionB: null,
      status: 'ready_for_preview',
      isPrototypeSeed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'crt_seed_02',
      ownerId: 'usr_seed_opp_01',
      campaignId: 'cmp_seed_03',
      qrToken: 'job-demo',
      title: 'Civic Skills Electrical Apprenticeship Card (Prototype Seed)',
      mode: 'option_a_studio',
      displayDurationSeconds: 30,
      safeZoneWarnings: [],
      contrastWarnings: [],
      optionA: {
        templateId: 'opportunity_job',
        backgroundColor: '#064E3B',
        gradientEndColor: '#0F172A',
        useGradient: true,
        accentColor: '#34D399',
        textColor: '#FFFFFF',
        scrimOpacity: 0.3,
        logoUrl: null,
        productImageUrl: null,
        backgroundImageUrl: null,
        heading: 'Paid Electrical Apprenticeships — 2026 Intake',
        description: 'Manchester & North West cohort · Employer-sponsored Level 3 certification · Zero applicant fees.',
        promoText: 'VERIFIED OPPORTUNITY · NO FEE TO APPLY',
        priceOrValue: '£24,500 Starting Allowance',
        contactDetails: 'Civic Skills Academy · Closing 15 Dec 2026',
        websiteAddress: 'example.org/edison-apprenticeship-demo',
        callToAction: 'Scan QR for Application Form',
        qrPlacement: 'bottom_right',
        elements: [
          { id: 'el_logo', kind: 'logo', label: 'Provider Logo', xPct: 6, yPct: 7, widthPct: 16, heightPct: 12, zIndex: 2, fontSizePx: 14, visible: true },
          { id: 'el_promo', kind: 'promo_badge', label: 'Notice Line', xPct: 6, yPct: 22, widthPct: 50, heightPct: 8, zIndex: 3, fontSizePx: 14, visible: true },
          { id: 'el_head', kind: 'headline', label: 'Opportunity Title', xPct: 6, yPct: 33, widthPct: 60, heightPct: 18, zIndex: 4, fontSizePx: 30, visible: true },
          { id: 'el_desc', kind: 'description', label: 'Eligibility & Location', xPct: 6, yPct: 54, widthPct: 58, heightPct: 15, zIndex: 4, fontSizePx: 16, visible: true },
          { id: 'el_price', kind: 'price_value', label: 'Allowance / Stipend', xPct: 6, yPct: 72, widthPct: 38, heightPct: 10, zIndex: 5, fontSizePx: 22, visible: true },
          { id: 'el_cta', kind: 'cta_button', label: 'Call to Action', xPct: 6, yPct: 85, widthPct: 34, heightPct: 8, zIndex: 5, fontSizePx: 15, visible: true },
          { id: 'el_contact', kind: 'contact_info', label: 'Provider & Closing', xPct: 42, yPct: 86, widthPct: 32, heightPct: 7, zIndex: 4, fontSizePx: 12, visible: true },
          { id: 'el_qr', kind: 'qr_block', label: 'QR Code Block', xPct: 76, yPct: 58, widthPct: 18, heightPct: 32, zIndex: 6, fontSizePx: 12, visible: true },
        ],
      },
      optionB: null,
      status: 'ready_for_preview',
      isPrototypeSeed: true,
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
    schemaVersion: 4,
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
    adCreatives: buildSeedAdCreatives(now),
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
        detail: 'Prototype persistence initialized (schema v4) with seeded accounts, QR links, profiles, campaigns, and studio creatives.',
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

  const existingCreatives = Array.isArray(parsed.adCreatives) ? parsed.adCreatives : [];
  const adCreatives =
    existingCreatives.length > 0 ? existingCreatives : buildSeedAdCreatives(now);

  // Backfill adCreativeRef on seed campaigns if missing
  const hasSeed1 = adCreatives.some((cr) => cr.id === 'crt_seed_01');
  const hasSeed2 = adCreatives.some((cr) => cr.id === 'crt_seed_02');
  for (const c of campaigns) {
    if (c.id === 'cmp_seed_01' && !c.adCreativeRef && hasSeed1) c.adCreativeRef = 'crt_seed_01';
    if (c.id === 'cmp_seed_03' && !c.adCreativeRef && hasSeed2) c.adCreativeRef = 'crt_seed_02';
  }

  const existingTickets = Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [];
  const supportTickets =
    existingTickets.length > 0 ? existingTickets : buildSeedTickets(now);

  return {
    schemaVersion: 4,
    users: parsed.users || [],
    sessions: parsed.sessions || [],
    qrLinks: migratedLinks,
    advertiserProfiles: profiles,
    campaigns,
    adCreatives,
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

      if (
        targetStatus === 'submitted' ||
        targetStatus === 'approved' ||
        targetStatus === 'scheduled' ||
        targetStatus === 'active'
      ) {
        if (!target.qrToken) {
          throw new Error(
            `Attach a validated QR redirect link before transitioning to "${targetStatus}".`
          );
        }
        const qr = draft.qrLinks.find((q) => q.token === target.qrToken);
        if (!qr || qr.status !== 'active') {
          throw new Error(
            `Attached QR redirect link must be active before transitioning to "${targetStatus}".`
          );
        }
        if (targetStatus === 'submitted') {
          const gate = this.computePreviewGateFromData(draft, target);
          if (!gate.readyToSubmit) {
            throw new Error(
              `Pre-Submission Preview Gate blocked submission: ${gate.blockingErrors[0]}`
            );
          }
        } else if (target.adCreativeRef) {
          const creative = draft.adCreatives.find((cr) => cr.id === target.adCreativeRef);
          if (creative?.optionB?.qrInspectionStatus === 'decoded_mismatch') {
            throw new Error(
              `Attached external advertisement (${creative.id}) has a QR destination mismatch and cannot move to "${targetStatus}" until resolved.`
            );
          }
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

  // --- Advertisement Creation Studio (Block 2.3) ---

  listAdCreativesForUser(user: PublicUser): AdCreativeRecord[] {
    this.syncIfDiskNewer();
    const list =
      user.role === 'admin'
        ? [...this.data.adCreatives]
        : this.data.adCreatives.filter((c) => c.ownerId === user.id);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  saveAdCreative(
    actor: PublicUser,
    input: {
      id?: string;
      campaignId?: string | null;
      qrToken?: string | null;
      title: string;
      mode: AdStudioMode;
      displayDurationSeconds: number;
      safeZoneWarnings: string[];
      contrastWarnings: string[];
      optionA: OptionAComposition | null;
      optionB: OptionBUploadSpec | null;
    }
  ): AdCreativeRecord {
    const title = input.title.trim();
    if (title.length < 3) {
      throw new Error('Advertisement creative title must be at least 3 characters.');
    }
    const duration = Math.round(Number(input.displayDurationSeconds));
    if (!Number.isFinite(duration) || duration < 5 || duration > 60) {
      throw new Error('Advertisement playback duration must be between 5 and 60 seconds.');
    }

    const safeUploadUrlRegex = /^\/uploads\/edison_(img|vid)_[a-f0-9]{20}\.(png|jpg|webp|mp4|webm)$/i;
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

    if (input.mode === 'option_a_studio') {
      if (!input.optionA || !input.optionA.heading.trim()) {
        throw new Error('Option A Studio composition requires a main heading.');
      }
      const assetUrls = [
        input.optionA.logoUrl,
        input.optionA.productImageUrl,
        input.optionA.backgroundImageUrl,
      ];
      for (const u of assetUrls) {
        if (u && !safeUploadUrlRegex.test(u)) {
          throw new Error('Invalid Option A media asset URL. Upload media via /api/media/upload.');
        }
      }
      const colors = [
        input.optionA.backgroundColor,
        input.optionA.gradientEndColor,
        input.optionA.accentColor,
        input.optionA.textColor,
      ];
      for (const col of colors) {
        if (!hexColorRegex.test(col)) {
          throw new Error('Option A colour values must be valid 6-digit hex codes.');
        }
      }
    } else {
      if (!input.optionB || !input.optionB.fileUrl) {
        throw new Error('Option B external upload requires a validated media asset.');
      }
      if (!safeUploadUrlRegex.test(input.optionB.fileUrl)) {
        throw new Error('Invalid Option B media URL. Upload files through /api/media/upload first.');
      }
      if (!input.optionB.contentAttested) {
        throw new Error('Confirm the rights & accuracy attestation before saving an external upload.');
      }
      if (input.optionB.validationErrors.length > 0) {
        throw new Error(`External upload failed validation: ${input.optionB.validationErrors[0]}`);
      }
      // Hard QR policy: never allow overlay when an existing QR was detected in the upload
      if (
        input.optionB.qrInspectionStatus !== 'none_found' &&
        input.optionB.qrOverlayConfirmed
      ) {
        throw new Error(
          'EDISON prohibits pasting a new QR overlay over an asset that already contains a QR code.'
        );
      }
    }

    return this.withWriteTransaction((draft) => {
      let linkedCampaign: CampaignRecord | undefined;
      if (input.campaignId) {
        linkedCampaign = draft.campaigns.find((c) => c.id === input.campaignId);
        if (!linkedCampaign) {
          throw new Error('Selected campaign was not found.');
        }
        if (actor.role !== 'admin' && linkedCampaign.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: Cannot attach a creative to another user campaign.');
        }
      }

      if (input.qrToken) {
        const qr = draft.qrLinks.find((q) => q.token === input.qrToken);
        if (!qr) {
          throw new Error('Selected QR token was not found.');
        }
        if (actor.role !== 'admin' && qr.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: You can only link your own QR destinations.');
        }
      }

      const requiresReview = Boolean(
        input.mode === 'option_b_upload' &&
          input.optionB &&
          (input.optionB.requiresAdminReviewFlag ||
            input.optionB.qrInspectionStatus === 'suspected_unreadable' ||
            input.optionB.qrInspectionStatus === 'decoded_mismatch')
      );

      const status: AdCreativeStatus = requiresReview
        ? 'flagged_for_review'
        : input.qrToken || (input.optionB && input.optionB.qrInspectionStatus === 'decoded_matched')
        ? 'ready_for_preview'
        : 'draft';

      const now = new Date().toISOString();

      if (input.id) {
        const existing = draft.adCreatives.find((c) => c.id === input.id);
        if (!existing) {
          throw new Error('Ad creative not found.');
        }
        if (actor.role !== 'admin' && existing.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: You do not own this ad creative.');
        }

        existing.title = title;
        existing.campaignId = input.campaignId ?? null;
        existing.qrToken = input.qrToken ?? null;
        existing.mode = input.mode;
        existing.displayDurationSeconds = duration;
        existing.safeZoneWarnings = input.safeZoneWarnings;
        existing.contrastWarnings = input.contrastWarnings;
        existing.optionA = input.mode === 'option_a_studio' ? input.optionA : null;
        existing.optionB =
          input.mode === 'option_b_upload' && input.optionB
            ? { ...input.optionB, requiresAdminReviewFlag: requiresReview }
            : null;
        existing.status = status;
        existing.isPrototypeSeed = false;
        existing.updatedAt = now;

        if (linkedCampaign) {
          linkedCampaign.adCreativeRef = existing.id;
          linkedCampaign.updatedAt = now;
        }

        this.addAudit(
          draft,
          actor.id,
          actor.role,
          'AD_CREATIVE_UPDATED',
          'ad_creative',
          existing.id,
          `Updated ${input.mode} creative "${existing.title}" (${status}).`
        );
        return { ...existing };
      }

      const created: AdCreativeRecord = {
        id: `crt_${crypto.randomBytes(5).toString('hex')}`,
        ownerId: actor.id,
        campaignId: input.campaignId ?? null,
        qrToken: input.qrToken ?? null,
        title,
        mode: input.mode,
        displayDurationSeconds: duration,
        safeZoneWarnings: input.safeZoneWarnings,
        contrastWarnings: input.contrastWarnings,
        optionA: input.mode === 'option_a_studio' ? input.optionA : null,
        optionB:
          input.mode === 'option_b_upload' && input.optionB
            ? { ...input.optionB, requiresAdminReviewFlag: requiresReview }
            : null,
        status,
        isPrototypeSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.adCreatives.unshift(created);
      if (linkedCampaign) {
        linkedCampaign.adCreativeRef = created.id;
        linkedCampaign.updatedAt = now;
      }

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_CREATED',
        'ad_creative',
        created.id,
        `Created ${input.mode} creative "${created.title}" (${status}).`
      );
      return { ...created };
    });
  }

  attachAdCreativeToCampaign(
    actor: PublicUser,
    creativeId: string,
    campaignId: string
  ): { creative: AdCreativeRecord; campaign: CampaignRecord } {
    return this.withWriteTransaction((draft) => {
      const creative = draft.adCreatives.find((c) => c.id === creativeId);
      if (!creative) {
        throw new Error('Ad creative not found.');
      }
      if (actor.role !== 'admin' && creative.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ad creative.');
      }
      const campaign = draft.campaigns.find((c) => c.id === campaignId);
      if (!campaign) {
        throw new Error('Campaign not found.');
      }
      if (actor.role !== 'admin' && campaign.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this campaign.');
      }

      const now = new Date().toISOString();
      creative.campaignId = campaign.id;
      creative.updatedAt = now;
      campaign.adCreativeRef = creative.id;
      if (creative.qrToken && !campaign.qrToken) {
        campaign.qrToken = creative.qrToken;
      }
      campaign.updatedAt = now;

      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_ATTACHED',
        'campaign',
        campaign.id,
        `Attached creative ${creative.id} to campaign ${campaign.id}.`
      );
      return { creative: { ...creative }, campaign: { ...campaign } };
    });
  }

  deleteAdCreative(actor: PublicUser, creativeId: string): void {
    this.withWriteTransaction((draft) => {
      const idx = draft.adCreatives.findIndex((c) => c.id === creativeId);
      if (idx === -1) {
        throw new Error('Ad creative not found.');
      }
      const target = draft.adCreatives[idx];
      if (actor.role !== 'admin' && target.ownerId !== actor.id) {
        throw new Error('FORBIDDEN: You do not own this ad creative.');
      }
      for (const camp of draft.campaigns) {
        if (camp.adCreativeRef === target.id) {
          camp.adCreativeRef = null;
        }
      }
      draft.adCreatives.splice(idx, 1);
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'AD_CREATIVE_DELETED',
        'ad_creative',
        target.id,
        `Deleted ad creative "${target.title}".`
      );
    });
  }

  recordMediaUploadAudit(
    actor: PublicUser,
    fileName: string,
    mimeType: string,
    sizeBytes: number
  ): void {
    this.withWriteTransaction((draft) => {
      this.addAudit(
        draft,
        actor.id,
        actor.role,
        'MEDIA_UPLOADED',
        'media_upload',
        fileName,
        `Validated ${mimeType} upload (${sizeBytes} bytes).`
      );
    });
  }

  private computePreviewGateFromData(
    data: EdisonStoreData,
    campaign: CampaignRecord
  ): CampaignPreviewGateResult {
    const qrLink = campaign.qrToken
      ? data.qrLinks.find((q) => q.token === campaign.qrToken) ?? null
      : null;
    const creative = campaign.adCreativeRef
      ? data.adCreatives.find((cr) => cr.id === campaign.adCreativeRef) ?? null
      : data.adCreatives.find((cr) => cr.campaignId === campaign.id) ?? null;
    const advertiserProfile =
      data.advertiserProfiles.find((p) => p.userId === campaign.ownerId) ?? null;

    const blockingErrors: string[] = [];
    const warnings: string[] = [];
    const checklist: PreSubmitCheckItem[] = [];
    let requiresAdminQrReview = false;

    // 1. Category & Metadata Check
    if (!campaign.title.trim() || campaign.summary.trim().length < 10) {
      blockingErrors.push('Campaign title and summary (min 10 chars) are required.');
      checklist.push({
        id: 'metadata',
        label: 'Campaign Metadata & Category Classification',
        status: 'fail',
        detail: 'Missing complete campaign title or summary.',
      });
    } else {
      checklist.push({
        id: 'metadata',
        label: 'Campaign Metadata & Category Classification',
        status: 'pass',
        detail: `${
          campaign.contentCategory === 'opportunity_promotion'
            ? 'Opportunity Promotion'
            : 'Commercial Advertising'
        } · ${campaign.durationSeconds}s · ${campaign.startDate} to ${campaign.endDate}`,
      });
    }

    // 2. QR Link & Destination Check
    if (!qrLink) {
      blockingErrors.push('No validated EDISON QR redirect link (/r/:token) attached.');
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'fail',
        detail: 'Attach an active /r/:token QR link before submitting.',
      });
    } else if (qrLink.status !== 'active') {
      blockingErrors.push(`Attached QR link /r/${qrLink.token} is currently "${qrLink.status}".`);
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'fail',
        detail: `/r/${qrLink.token} status is ${qrLink.status}; only active QR links can submit.`,
      });
    } else {
      checklist.push({
        id: 'qr_link',
        label: 'QR Destination & Active Redirect Link',
        status: 'pass',
        detail: `/r/${qrLink.token} -> ${qrLink.resolvedUrl}`,
      });
    }

    // 3. Attached Advertisement Creative & Media Compatibility Check
    if (!creative) {
      blockingErrors.push(
        'No advertisement creative attached. Create or attach an Option A or Option B creative first.'
      );
      checklist.push({
        id: 'creative',
        label: '16:9 Advertisement Creative & Media Compatibility',
        status: 'fail',
        detail: 'Attach an Option A Studio or Option B uploaded spot.',
      });
    } else if (creative.mode === 'option_a_studio') {
      const optA = creative.optionA;
      const qrBlockVisible = Boolean(
        optA?.elements.some((el) => el.kind === 'qr_block' && el.visible)
      );
      if (!optA || !optA.heading.trim() || !qrBlockVisible) {
        blockingErrors.push(
          'Option A Studio composition requires a main headline and a visible QR code block.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Option A creative is missing headline or visible QR overlay block.',
        });
      } else {
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'pass',
          detail: `Option A Studio (${optA.templateId}) · ${creative.displayDurationSeconds}s`,
        });
      }
    } else {
      const optB = creative.optionB;
      if (!optB) {
        blockingErrors.push('Option B external creative is missing media payload.');
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Upload a valid 16:9 PNG/JPG/WebP/MP4/WebM file.',
        });
      } else if (optB.validationErrors.length > 0) {
        blockingErrors.push(optB.validationErrors[0]);
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: optB.validationErrors.join(' '),
        });
      } else if (!optB.contentAttested) {
        blockingErrors.push('Option B broadcast/copyright attestation must be confirmed.');
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'Rights & accuracy attestation unchecked.',
        });
      } else if (optB.qrInspectionStatus === 'decoded_mismatch') {
        blockingErrors.push(
          `Embedded QR ("${optB.decodedQrPayload}") mismatches /r/${campaign.qrToken}. Non-overwrite rule blocks submission.`
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: `Embedded QR mismatch (${optB.decodedQrPayload}).`,
        });
      } else if (optB.qrInspectionStatus === 'none_found' && !optB.qrOverlayConfirmed) {
        blockingErrors.push(
          'Uploaded asset has no detected QR code; confirm the EDISON safe-corner QR overlay in Studio.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'fail',
          detail: 'No QR detected and EDISON corner overlay not yet confirmed.',
        });
      } else if (optB.qrInspectionStatus === 'suspected_unreadable') {
        requiresAdminQrReview = true;
        warnings.push(
          'Asset flagged as suspected_unreadable QR: queued for mandatory Admin human inspection.'
        );
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'warn',
          detail: `${optB.aspectRatioLabel} · Flagged for mandatory Admin QR review`,
        });
      } else {
        checklist.push({
          id: 'creative',
          label: '16:9 Advertisement Creative & Media Compatibility',
          status: 'pass',
          detail: `${optB.aspectRatioLabel} · QR=${optB.qrInspectionStatus}`,
        });
      }
    }

    // 4. TV Readability & Safe-Zone Advisories
    const readabilityWarnings = [
      ...(creative?.contrastWarnings ?? []),
      ...(creative?.safeZoneWarnings ?? []),
    ];
    if (readabilityWarnings.length > 0) {
      warnings.push(...readabilityWarnings);
      checklist.push({
        id: 'readability',
        label: '16:9 Television Readability & 5% Title-Safe Margin',
        status: 'warn',
        detail: `${readabilityWarnings.length} readability/safe-zone warning(s) flagged for review.`,
      });
    } else if (creative) {
      checklist.push({
        id: 'readability',
        label: '16:9 Television Readability & 5% Title-Safe Margin',
        status: 'pass',
        detail: 'No contrast or 5% title-safe overscan warnings.',
      });
    }

    // 5. Opportunity & Profile Governance Check
    if (campaign.contentCategory === 'opportunity_promotion') {
      warnings.push(
        'Opportunity Spot Notice: 3-tier verification (Block 2.5) and non-guarantee disclaimer apply independently of any ad spend.'
      );
      checklist.push({
        id: 'opportunity_notice',
        label: 'Opportunity Verification & Non-Guarantee Policy',
        status: 'warn',
        detail: 'Non-guarantee disclaimer rendered; independent opportunity verification required prior to live broadcast.',
      });
    } else {
      checklist.push({
        id: 'advertiser_profile',
        label: 'Advertiser Profile & Verification Standing',
        status: advertiserProfile?.verificationStatus === 'verified' ? 'pass' : 'warn',
        detail: advertiserProfile
          ? `${advertiserProfile.businessOrTradingName} (${advertiserProfile.verificationStatus})`
          : 'Complete Advertiser Profile recommended prior to admin approval.',
      });
    }

    return {
      campaign: { ...campaign },
      creative: creative ? { ...creative } : null,
      qrLink: qrLink ? { ...qrLink } : null,
      advertiserProfile: advertiserProfile ? { ...advertiserProfile } : null,
      readyToSubmit: blockingErrors.length === 0,
      blockingErrors,
      warnings,
      requiresAdminQrReview,
      checklist,
    };
  }

  evaluateCampaignPreSubmitGate(
    actor: PublicUser,
    campaignId: string
  ): CampaignPreviewGateResult {
    this.syncIfDiskNewer();
    const campaign = this.data.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error('Campaign not found.');
    }
    if (actor.role !== 'admin' && campaign.ownerId !== actor.id) {
      throw new Error('FORBIDDEN: You do not own this campaign.');
    }
    return this.computePreviewGateFromData(this.data, campaign);
  }

  recordSimulatedPlaybackEvent(
    actor: PublicUser,
    input: {
      campaignId?: string | null;
      qrToken?: string | null;
      eventType: 'ad_requested' | 'ad_delivered' | 'ad_played' | 'ad_viewable';
    }
  ): AnalyticsEventRecord {
    return this.withWriteTransaction((draft) => {
      const ev: AnalyticsEventRecord = {
        id: `evt_sim_${crypto.randomBytes(5).toString('hex')}`,
        qrToken: input.qrToken ?? null,
        campaignId: input.campaignId ?? null,
        eventType: input.eventType,
        measurementSource: 'simulated_prototype',
        dedupKey: `sim:${actor.id}:${input.eventType}:${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      draft.analyticsEvents.unshift(ev);
      if (draft.analyticsEvents.length > 2000) {
        draft.analyticsEvents.length = 2000;
      }
      return { ...ev };
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
      adCreativeCount: this.data.adCreatives.length,
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

  getLiveReportSnapshot(): LiveReportSnapshot {
    const summary = this.getFoundationSummary();
    const breakdown: Record<CampaignStatus, number> = {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      scheduled: 0,
      active: 0,
      paused: 0,
      completed: 0,
      expired: 0,
    };
    for (const c of this.data.campaigns) {
      breakdown[c.status] = (breakdown[c.status] || 0) + 1;
    }

    const latestAudit = this.data.auditLogs[0] ?? null;
    return {
      generatedAt: new Date().toISOString(),
      phase: 'Phase 2 — AI Studio Functional Prototype',
      stage: 'Stage 2.4 — Full 16:9 TV Preview, Pre-Submit Gate & Break Simulator',
      block: 'Block 2.4 (Verified)',
      gateStatus: 'VERIFIED · AWAITING COMMIT',
      latestAuditAt: latestAudit?.createdAt ?? null,
      latestAuditAction: latestAudit?.action ?? null,
      campaignStatusBreakdown: breakdown,
      summary,
    };
  }
}

export const edisonStore = new EdisonPrototypeStore();
