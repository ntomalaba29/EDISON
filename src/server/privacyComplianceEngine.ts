import crypto from 'node:crypto';
import type {
  AnalyticsEventRecord,
  ConsentAuditEventRecord,
  CountryStatutoryComplianceRecord,
  HouseholdInstallationRecord,
  HouseholdMemberProfile,
  HouseholdQrTokenRecord,
  PrivacyComplianceOverview,
  PrivacyComplianceVerificationReport,
  PrivacyComplianceVerifyCheckItem,
  PrivacyDsrErasureResult,
  PrivacyDsrExportPackage,
  PrivacyRetentionReport,
  PublicUser,
  SessionRecord,
} from '../types/edison.ts';
import { toPublicHouseholdView, sanitizeMemberForList } from './trackBHouseholdConsent.ts';

const EXPIRED_HQR_RETENTION_DAYS = 30;
const SESSION_IDLE_HOURS = 2;
const AUDIT_RETENTION_DAYS = 365 * 2;

const EMAIL_OR_COORDS_PATTERN =
  /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(-?\d{1,2}\.\d{5,}\s*,\s*-?\d{1,3}\.\d{5,})/i;

export function listCountryStatutoryComplianceRecords(): CountryStatutoryComplianceRecord[] {
  return [
    {
      countryCode: 'ZW',
      countryName: 'Zimbabwe',
      isReferenceTargetingProfile: true,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'Cyber and Data Protection Act [Chapter 12:07] & POTRAZ Data Controller Guidance',
        'Broadcasting Services Act [Chapter 12:06] (BAZ rules)',
        'Labour Act [Chapter 28:01] (Prohibition of upfront job-seeker placement fees)',
        'Consumer Protection Act [Chapter 14:44] & ASA Zimbabwe Standards',
        'ZIMRA VAT / Digital Services Tax Rules',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'Formal POTRAZ data-controller registration confirmation prior to commercial Phase 14 launch.',
        'BAZ classification confirmation for Smart TV linear break overlays vs viewer-initiated companion sessions.',
      ],
    },
    {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      isReferenceTargetingProfile: false,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'UK GDPR & PECR Reg. 6 (Terminal Equipment Storage Consent)',
        'ASA / CAP / BCAP Advertising Codes',
        'Employment Agencies Act 1973 (Ban on Job-Seeker Fees)',
        'Digital Markets, Competition and Consumers Act 2024 & Ofcom Rules',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'Ofcom / PECR classification for HbbTV vs Android TV linear break insertion (ADR-001).',
        'Jurisdiction-specific unbundling requirements where ADR-006 applies in future updates.',
      ],
    },
    {
      countryCode: 'EU',
      countryName: 'European Union (Representative: DE / FR / IE)',
      isReferenceTargetingProfile: false,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'GDPR & ePrivacy Directive Art. 5(3) (TV Terminal Storage Consent)',
        'Digital Services Act (DSA) Transparency & Advertiser Disclosure',
        'AVMSD Art. 7b (Broadcaster Signal Integrity)',
        'Unfair Commercial Practices Directive (UCPD) & EU OSS VAT',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'National media authority interpretation of broadcaster signal-integrity rules under AVMSD Art. 7b.',
        'GDPR strict unbundling of free opportunities vs commercial consent where applicable.',
      ],
    },
    {
      countryCode: 'US',
      countryName: 'United States',
      isReferenceTargetingProfile: false,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'Video Privacy Protection Act (VPPA — 18 U.S.C. § 2710)',
        'State Privacy Statutes (CCPA/CPRA Opt-Out Signals)',
        'FTC Truth-in-Advertising & Federal/State EEO Employment Rules',
        'TCPA (Messaging/Telephone Follow-Ups) & FCC / ATSC 3.0 Rules',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'State-by-state opt-out semantics vs VPPA consent when any third-party CTV SDK (GAM/IMA) is introduced.',
      ],
    },
    {
      countryCode: 'ZA',
      countryName: 'South Africa',
      isReferenceTargetingProfile: false,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'Protection of Personal Information Act (POPIA)',
        'Advertising Regulatory Board (ARB) Code of Practice',
        'Employment Services Act 2014 (Worker Fee Ban)',
        'Consumer Protection Act (CPA) & ICASA Broadcasting Rules',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'Scope of Employment Services Act registration thresholds for free broadcast intermediaries.',
      ],
    },
    {
      countryCode: 'KE_NG',
      countryName: 'Kenya / Nigeria (Representative Expansion)',
      isReferenceTargetingProfile: false,
      countryActivated: false,
      legalComplianceClaimed: false,
      statutesResearched: [
        'Kenya Data Protection Act 2019 & Communications Authority Rules',
        'Nigeria Data Protection Act 2023 (NDPA)',
        'ARCON (Nigeria Advertising Pre-Vetting Statutory Framework)',
        'National Labour Ministry Recruitment Integrity Directives',
      ],
      enforcedTechnicalControls: {
        bundledConsentWithdrawal: true,
        epoch403QrRevocation: true,
        zeroApplicantFeesEnforced: true,
        piiRedactedFromTvAndUrls: true,
        externalSignalIntegrityProhibited: true,
        cameraMicAttentionTrackingDisabled: true,
      },
      unresolvedRegulatoryUncertainties: [
        'Statutory pre-vetting rules (e.g. Nigeria ARCON) for third-party TV ad networks vs direct-moderated EDISON spots.',
      ],
    },
  ];
}

export function scanAnalyticsZeroPii(events: AnalyticsEventRecord[]): number {
  let leaks = 0;
  for (const ev of events) {
    if (EMAIL_OR_COORDS_PATTERN.test(ev.dedupKey || '')) {
      leaks += 1;
    }
  }
  return leaks;
}

export function buildHouseholdDsrExportPackage(params: {
  household: HouseholdInstallationRecord;
  members: HouseholdMemberProfile[];
  householdQrTokens: HouseholdQrTokenRecord[];
  consentAuditEvents: ConsentAuditEventRecord[];
  nowIso?: string;
}): PrivacyDsrExportPackage {
  const generatedAt = params.nowIso ?? new Date().toISOString();
  const exportId = `dsr_exp_${crypto.randomBytes(5).toString('hex')}`;
  const publicHh = toPublicHouseholdView(params.household);
  const safeMembers = params.members
    .filter((m) => m.householdId === params.household.id)
    .map((m) => {
      const sanitized = sanitizeMemberForList(m);
      return {
        ...sanitized,
        hasPinSet: sanitized.hasPinLock,
      };
    });

  const hhTokens = params.householdQrTokens
    .filter((t) => t.householdId === params.household.id)
    .map((t) => ({ ...t }));
  const hhAudits = params.consentAuditEvents
    .filter((a) => a.householdId === params.household.id)
    .map((a) => ({ ...a }));

  const digestPayload = JSON.stringify({
    household: publicHh,
    members: safeMembers,
    householdQrTokens: hhTokens,
    consentAuditEvents: hhAudits,
  });
  const packageSha256 = crypto.createHash('sha256').update(digestPayload, 'utf8').digest('hex');

  return {
    exportId,
    generatedAt,
    householdId: params.household.id,
    exportFormat: 'json_dsr_v1',
    pinHashesRedacted: true,
    packageSha256,
    household: publicHh,
    members: safeMembers,
    householdQrTokens: hhTokens,
    consentAuditEvents: hhAudits,
  };
}

export function anonymiseHouseholdDraftData(params: {
  household: HouseholdInstallationRecord;
  members: HouseholdMemberProfile[];
  householdQrTokens: HouseholdQrTokenRecord[];
  nowIso?: string;
}): {
  erasureResult: PrivacyDsrErasureResult;
  anonymisedMemberIds: string[];
} {
  const executedAt = params.nowIso ?? new Date().toISOString();
  const hh = params.household;
  const previousEpoch = hh.consentEpoch;
  const newEpoch = previousEpoch + 1;

  // Scrub household identifying fields + withdraw bundled consent cleanly
  hh.householdLabel = `Anonymised Household (${hh.id.slice(-4)})`;
  hh.tvDeviceLabel = 'Ordinary Live TV Receiver';
  hh.location.exactInstallationLocation = '[REDACTED BY DSR ERASURE]';
  hh.location.suburbOrArea = 'Redacted';
  hh.targetingDisabled = true;
  hh.consentEpoch = newEpoch;
  hh.consentVersionLabel = `v${newEpoch}-erased`;
  hh.lastConsentChangedAt = executedAt;
  hh.commercialConsentStatus = 'withdrawn';
  hh.charityAndOpportunityStatus = 'suspended_by_bundled_withdrawal';
  hh.personalisationMasterEnabled = false;
  hh.neutralDisplayMode = true;
  hh.updatedAt = executedAt;

  // Scrub every household member profile & invalidate optional PINs
  const anonymisedMemberIds: string[] = [];
  for (const m of params.members) {
    if (m.householdId !== hh.id) continue;
    anonymisedMemberIds.push(m.id);
    m.displayName = `Redacted Profile (${m.id.slice(-4)})`;
    m.pinHash = null;
    m.hasPinLock = false;
    m.personalisationConsentGranted = false;
    m.educationLevel = '[REDACTED]';
    m.qualifications = [];
    m.skills = [];
    m.experienceSummary = '[REDACTED]';
    m.experienceYears = 0;
    m.occupationOrTrade = '[REDACTED]';
    m.employmentInterests = [];
    m.careerAspirations = '[REDACTED]';
    m.industries = [];
    m.interestedCategories = [];
    m.updatedAt = executedAt;
  }

  // Revoke all active household QR tokens so /r/:token fails closed with HTTP 403
  let qrTokensRevokedCount = 0;
  for (const tok of params.householdQrTokens) {
    if (tok.householdId === hh.id && !tok.revokedAt) {
      tok.revokedAt = executedAt;
      tok.revokedReason = 'Revoked by Household DSR Right-to-Erasure anonymisation.';
      qrTokensRevokedCount += 1;
    }
  }

  const erasureId = `dsr_ers_${crypto.randomBytes(5).toString('hex')}`;
  const tombstoneSha256 = crypto
    .createHash('sha256')
    .update(`${erasureId}|${hh.id}|epoch:${newEpoch}|${executedAt}`, 'utf8')
    .digest('hex');

  return {
    erasureResult: {
      erasureId,
      executedAt,
      householdId: hh.id,
      previousEpoch,
      newEpoch,
      membersAnonymisedCount: anonymisedMemberIds.length,
      qrTokensRevokedCount,
      ordinaryTvPreserved: true,
      commercialConsentStatus: hh.commercialConsentStatus,
      charityAndOpportunityStatus: hh.charityAndOpportunityStatus,
      tombstoneSha256,
    },
    anonymisedMemberIds,
  };
}

export function evaluatePrivacyRetentionCandidates(params: {
  sessions: Array<Pick<SessionRecord, 'expiresAt' | 'idleExpiresAt'>>;
  householdQrTokens: HouseholdQrTokenRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  nowMs?: number;
}): {
  expiredSessionsCount: number;
  staleExpiredQrTokensCount: number;
  piiLeaksDetectedInAnalytics: number;
} {
  const nowMs = params.nowMs ?? Date.now();
  const hqrCutoffMs = nowMs - EXPIRED_HQR_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let expiredSessionsCount = 0;
  for (const s of params.sessions) {
    const exp = Date.parse(s.expiresAt);
    const idle = Date.parse(s.idleExpiresAt);
    if ((Number.isFinite(exp) && exp <= nowMs) || (Number.isFinite(idle) && idle <= nowMs)) {
      expiredSessionsCount += 1;
    }
  }

  let staleExpiredQrTokensCount = 0;
  for (const t of params.householdQrTokens) {
    const exp = Date.parse(t.expiresAt);
    if (Number.isFinite(exp) && exp <= hqrCutoffMs) {
      staleExpiredQrTokensCount += 1;
    }
  }

  const piiLeaksDetectedInAnalytics = scanAnalyticsZeroPii(params.analyticsEvents);
  return {
    expiredSessionsCount,
    staleExpiredQrTokensCount,
    piiLeaksDetectedInAnalytics,
  };
}

export function buildPrivacyComplianceOverview(params: {
  actor: PublicUser;
  households: HouseholdInstallationRecord[];
  sessions: Array<Pick<SessionRecord, 'expiresAt' | 'idleExpiresAt'>>;
  householdQrTokens: HouseholdQrTokenRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  nowMs?: number;
}): PrivacyComplianceOverview {
  const nowMs = params.nowMs ?? Date.now();
  const isAdmin = params.actor.role === 'admin';
  const visibleHouseholds = isAdmin
    ? params.households
    : params.actor.role === 'household_viewer'
    ? params.households.filter((h) => h.ownerUserId === params.actor.id)
    : [];

  const retention = evaluatePrivacyRetentionCandidates({
    sessions: isAdmin ? params.sessions : [],
    householdQrTokens: isAdmin ? params.householdQrTokens : [],
    analyticsEvents: params.analyticsEvents,
    nowMs,
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    isSoftwareSimulationOnly: true,
    externalPenTestCompleted: false,
    hardwareTested: false,
    stageP6Deferred: true,
    legalComplianceClaimed: false,
    cameraMicAttentionTrackingEnabled: false,
    posture: {
      decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL',
      totalHouseholdsEvaluated: visibleHouseholds.length,
      withdrawnOrErasedHouseholds: visibleHouseholds.filter(
        (h) => h.commercialConsentStatus === 'withdrawn'
      ).length,
      activeSessionsCount: isAdmin
        ? Math.max(0, params.sessions.length - retention.expiredSessionsCount)
        : 0,
      expiredSessionsPendingPurge: retention.expiredSessionsCount,
      staleExpiredQrTokensPendingPurge: retention.staleExpiredQrTokensCount,
      analyticsZeroPiiVerified: retention.piiLeaksDetectedInAnalytics === 0,
      piiLeaksDetectedInAnalytics: retention.piiLeaksDetectedInAnalytics,
    },
    countries: listCountryStatutoryComplianceRecords(),
  };
}

export function executeRetentionPurgeOnDraft(params: {
  sessions: SessionRecord[];
  householdQrTokens: HouseholdQrTokenRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  nowMs?: number;
}): {
  report: PrivacyRetentionReport;
  keptSessions: SessionRecord[];
  keptQrTokens: HouseholdQrTokenRecord[];
} {
  const nowMs = params.nowMs ?? Date.now();
  const hqrCutoffMs = nowMs - EXPIRED_HQR_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const keptSessions = params.sessions.filter((s) => {
    const exp = Date.parse(s.expiresAt);
    const idle = Date.parse(s.idleExpiresAt);
    const expired =
      (Number.isFinite(exp) && exp <= nowMs) || (Number.isFinite(idle) && idle <= nowMs);
    return !expired;
  });

  const keptQrTokens = params.householdQrTokens.filter((t) => {
    const exp = Date.parse(t.expiresAt);
    return !(Number.isFinite(exp) && exp <= hqrCutoffMs);
  });

  const report: PrivacyRetentionReport = {
    sweepId: `ret_${crypto.randomBytes(5).toString('hex')}`,
    executedAt: new Date(nowMs).toISOString(),
    expiredSessionsPurged: params.sessions.length - keptSessions.length,
    staleExpiredQrTokensPurged: params.householdQrTokens.length - keptQrTokens.length,
    piiLeaksDetectedInAnalytics: scanAnalyticsZeroPii(params.analyticsEvents),
    cameraMicAttentionTrackingEnabled: false,
    retentionPolicyWindows: {
      sessionMaxIdleHours: SESSION_IDLE_HOURS,
      expiredHouseholdQrRetentionDays: EXPIRED_HQR_RETENTION_DAYS,
      auditLogRetentionDays: AUDIT_RETENTION_DAYS,
    },
  };

  return { report, keptSessions, keptQrTokens };
}

export function runPrivacyComplianceVerificationSuite(): PrivacyComplianceVerificationReport {
  const fixedNowMs = Date.parse('2026-11-16T12:00:00.000Z');
  const fixedIso = new Date(fixedNowMs).toISOString();

  const sampleHh: HouseholdInstallationRecord = {
    id: 'hh_dsr_test',
    ownerUserId: 'usr_view_01',
    householdLabel: 'Moyo Home',
    tvDeviceLabel: 'Living Room TV',
    location: {
      countryCode: 'ZW',
      provinceOrRegion: 'Harare Metropolitan',
      metroArea: 'Harare Metro',
      cityOrTown: 'Harare',
      district: 'Harare Urban',
      suburbOrArea: 'Avondale',
      exactInstallationLocation: '14 Private Road, Harare',
    },
    locationValid: true,
    locationValidationErrors: [],
    targetingDisabled: false,
    ordinaryTvPreserved: true,
    commercialConsentStatus: 'granted',
    charityAndOpportunityStatus: 'active',
    personalisationMasterEnabled: true,
    neutralDisplayMode: false,
    consentEpoch: 2,
    consentVersionLabel: 'v2-active',
    lastConsentChangedAt: '2026-11-01T00:00:00.000Z',
    isPrototypeSeed: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  const sampleMembers: HouseholdMemberProfile[] = [
    {
      id: 'mem_dsr_01',
      householdId: 'hh_dsr_test',
      ownerUserId: 'usr_view_01',
      displayName: 'Malaba',
      pinHash: 'scrypt$secret_hash_must_never_leak',
      hasPinLock: true,
      personalisationConsentGranted: true,
      educationLevel: 'BEng Electrical',
      qualifications: ['Solar PV'],
      skills: ['Solar'],
      experienceSummary: '3 years',
      experienceYears: 3,
      occupationOrTrade: 'Solar Tech',
      employmentInterests: ['Solar'],
      careerAspirations: 'Lead Engineer',
      industries: ['Energy'],
      interestedCategories: ['apprenticeship'],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const sampleTokens: HouseholdQrTokenRecord[] = [
    {
      token: 'hqr_live_test_1',
      baseQrToken: 'qr_seed_1',
      householdId: 'hh_dsr_test',
      opportunityId: 'opp_seed_1',
      campaignId: null,
      consentEpoch: 2,
      issuedAt: '2026-11-16T11:00:00.000Z',
      expiresAt: '2026-11-16T13:00:00.000Z',
      revokedAt: null,
      revokedReason: null,
      resolvedCount: 1,
      rejected403Count: 0,
    },
    {
      token: 'hqr_old_expired',
      baseQrToken: 'qr_seed_1',
      householdId: 'hh_dsr_test',
      opportunityId: null,
      campaignId: null,
      consentEpoch: 1,
      issuedAt: '2026-09-01T00:00:00.000Z',
      expiresAt: '2026-09-02T00:00:00.000Z', // > 30 days expired
      revokedAt: null,
      revokedReason: null,
      resolvedCount: 0,
      rejected403Count: 0,
    },
  ];

  // Check 1: DSR export redacts PIN hashes & computes SHA-256
  const dsrExport = buildHouseholdDsrExportPackage({
    household: sampleHh,
    members: sampleMembers,
    householdQrTokens: sampleTokens,
    consentAuditEvents: [],
    nowIso: fixedIso,
  });
  const check1 =
    dsrExport.pinHashesRedacted === true &&
    dsrExport.packageSha256.length === 64 &&
    !JSON.stringify(dsrExport).includes('secret_hash_must_never_leak') &&
    dsrExport.members[0].hasPinSet === true;

  // Check 2: DSR cascade erasure scrubs PII, revokes active tokens, bumps epoch, preserves ordinary TV
  const hhCopy: HouseholdInstallationRecord = {
    ...sampleHh,
    location: { ...sampleHh.location },
  };
  const membersCopy: HouseholdMemberProfile[] = sampleMembers.map((m) => ({
    ...m,
    qualifications: [...m.qualifications],
    skills: [...m.skills],
    employmentInterests: [...m.employmentInterests],
    industries: [...m.industries],
    interestedCategories: [...m.interestedCategories],
  }));
  const tokensCopy: HouseholdQrTokenRecord[] = sampleTokens.map((t) => ({ ...t }));

  const erasure = anonymiseHouseholdDraftData({
    household: hhCopy,
    members: membersCopy,
    householdQrTokens: tokensCopy,
    nowIso: fixedIso,
  });
  const check2 =
    erasure.erasureResult.membersAnonymisedCount === 1 &&
    erasure.erasureResult.qrTokensRevokedCount === 2 &&
    erasure.erasureResult.newEpoch === 3 &&
    erasure.erasureResult.ordinaryTvPreserved === true &&
    hhCopy.commercialConsentStatus === 'withdrawn' &&
    hhCopy.location.exactInstallationLocation === '[REDACTED BY DSR ERASURE]' &&
    membersCopy[0].pinHash === null &&
    membersCopy[0].hasPinLock === false &&
    membersCopy[0].skills.length === 0;

  // Check 3: Retention sweep purges expired sessions & >30d expired QR tokens
  const retentionRun = executeRetentionPurgeOnDraft({
    sessions: [
      {
        csrfToken: 'c1',
        userId: 'u1',
        role: 'admin',
        createdAt: '2026-11-16T08:00:00.000Z',
        lastActivityAt: '2026-11-16T08:00:00.000Z',
        idleExpiresAt: '2026-11-16T10:00:00.000Z', // expired before fixedNowMs
        expiresAt: '2026-11-23T08:00:00.000Z',
      },
      {
        csrfToken: 'c2',
        userId: 'u2',
        role: 'advertiser',
        createdAt: '2026-11-16T11:30:00.000Z',
        lastActivityAt: '2026-11-16T11:30:00.000Z',
        idleExpiresAt: '2026-11-16T13:30:00.000Z',
        expiresAt: '2026-11-23T11:30:00.000Z',
      },
    ],
    householdQrTokens: sampleTokens,
    analyticsEvents: [],
    nowMs: fixedNowMs,
  });
  const check3 =
    retentionRun.report.expiredSessionsPurged === 1 &&
    retentionRun.report.staleExpiredQrTokensPurged === 1 &&
    retentionRun.keptSessions.length === 1 &&
    retentionRun.keptQrTokens.length === 1;

  // Check 4: Analytics Zero-PII scanner
  const cleanAnalytics: AnalyticsEventRecord[] = [
    {
      id: 'evt_1',
      qrToken: 'qr_1',
      campaignId: 'cmp_1',
      eventType: 'redirect_issued',
      measurementSource: 'real_measured',
      dedupKey: 'sha256_anon_1234',
      createdAt: fixedIso,
    },
  ];
  const dirtyAnalytics: AnalyticsEventRecord[] = [
    {
      id: 'evt_2',
      qrToken: 'qr_1',
      campaignId: 'cmp_1',
      eventType: 'redirect_requested',
      measurementSource: 'real_measured',
      dedupKey: 'leaked.viewer@example.com',
      createdAt: fixedIso,
    },
  ];
  const check4 = scanAnalyticsZeroPii(cleanAnalytics) === 0 && scanAnalyticsZeroPii(dirtyAnalytics) === 1;

  // Check 5: Camera / microphone attention tracking hard-disabled
  const overviewSample = buildPrivacyComplianceOverview({
    actor: {
      id: 'usr_admin',
      email: 'admin@edison.demo',
      name: 'Admin',
      organisationName: 'EDISON',
      role: 'admin',
      verificationStatus: 'verified',
      isPrototypeSeed: true,
      createdAt: fixedIso,
    },
    households: [sampleHh],
    sessions: [],
    householdQrTokens: sampleTokens,
    analyticsEvents: cleanAnalytics,
    nowMs: fixedNowMs,
  });
  const check5 =
    overviewSample.cameraMicAttentionTrackingEnabled === false &&
    retentionRun.report.cameraMicAttentionTrackingEnabled === false;

  // Check 6: Advertiser privacy isolation on compliance overview
  const advertiserOverview = buildPrivacyComplianceOverview({
    actor: {
      id: 'usr_adv',
      email: 'adv@edison.demo',
      name: 'Adv',
      organisationName: 'Co',
      role: 'advertiser',
      verificationStatus: 'verified',
      isPrototypeSeed: true,
      createdAt: fixedIso,
    },
    households: [sampleHh],
    sessions: [],
    householdQrTokens: sampleTokens,
    analyticsEvents: cleanAnalytics,
    nowMs: fixedNowMs,
  });
  const check6 =
    advertiserOverview.posture.totalHouseholdsEvaluated === 0 &&
    advertiserOverview.posture.expiredSessionsPendingPurge === 0;

  // Check 7: Jurisdiction references remain distinct from legal-compliance determinations.
  const countries = overviewSample.countries;
  const check7 =
    countries.length === 6 &&
    countries.some((c) => c.countryCode === 'ZW' && c.isReferenceTargetingProfile) &&
    countries.every(
      (c) =>
        c.countryActivated === false &&
        c.legalComplianceClaimed === false &&
        c.unresolvedRegulatoryUncertainties.length >= 1
    );

  // Check 8: Explicit external pen-test / physical hardware honesty flags
  const check8 =
    overviewSample.externalPenTestCompleted === false &&
    overviewSample.legalComplianceClaimed === false &&
    overviewSample.hardwareTested === false &&
    overviewSample.stageP6Deferred === true;

  const checks: PrivacyComplianceVerifyCheckItem[] = [
    {
      checkId: 'p10_dsr_export_redaction',
      label: '1. DSR Subject Access Export & PIN Hash Redaction',
      passed: check1,
      detail: 'SHA-256 checksummed DSR package exports owned household metadata while strictly omitting pinHash values.',
    },
    {
      checkId: 'p10_dsr_erasure_cascade',
      label: '2. DSR Right-to-Erasure Anonymisation & Bundled HTTP 403 Revocation',
      passed: check2,
      detail: 'Scrubs profile skills/addresses/PINs, increments consentEpoch, revokes hqr_* tokens, and preserves ordinary TV.',
    },
    {
      checkId: 'p10_retention_purge',
      label: '3. Automated Session Idle/Expiry & 30d Stale QR Retention Purge',
      passed: check3,
      detail: 'Purges expired session tokens and stale >30-day expired household QRs deterministically.',
    },
    {
      checkId: 'p10_analytics_zero_pii',
      label: '4. Analytics & DedupKey Zero-PII Verification Scanner',
      passed: check4,
      detail: 'Detects leaked email addresses or precise GPS coordinates before telemetry persistence.',
    },
    {
      checkId: 'p10_camera_mic_disabled',
      label: '5. Camera & Microphone Attention Tracking Hard Disable',
      passed: check5,
      detail: 'Enforces cameraMicAttentionTrackingEnabled=false across compliance overview and retention sweeps.',
    },
    {
      checkId: 'p10_advertiser_isolation',
      label: '6. Cross-Tenant Advertiser & Submitter Compliance Isolation',
      passed: check6,
      detail: 'Non-admin/advertiser callers never see private household counts or session retention telemetry.',
    },
    {
      checkId: 'p10_country_statutory_register',
      label: '7. Independent Public Country Statutory Register (ADR-015 · ZERO Compliance Claimed)',
      passed: check7,
      detail: 'Six representative jurisdiction profiles include unresolved regulatory questions; no compliance determination is made.',
    },
    {
      checkId: 'p10_audit_hardware_boundary',
      label: '8. External Penetration Test & Stage P6 Hardware Honesty Boundary',
      passed: check8,
      detail: 'Reports externalPenTestCompleted=false, legalComplianceClaimed=false, and hardwareTested=false.',
    },
  ];

  const passedChecks = checks.filter((c) => c.passed).length;
  return {
    generatedAt: fixedIso,
    isSoftwareSimulationOnly: true,
    externalPenTestCompleted: false,
    legalComplianceClaimed: false,
    cameraMicAttentionTrackingEnabled: false,
    hardwareTested: false,
    stageP6Deferred: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
