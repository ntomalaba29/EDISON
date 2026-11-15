import type {
  AccountVerificationStatus,
  AdCreativeRecord,
  AdStudioMode,
  AdminModerationOverview,
  AdvertiserEntityType,
  AdvertiserProfile,
  AnalyticsEventRecord,
  AuditLogRecord,
  BreakSchedulePlan,
  CampaignContentCategory,
  CampaignPreviewGateResult,
  CampaignRecord,
  CampaignStatus,
  DaypartSlot,
  LiveReportSnapshot,
  OpportunityAppealRecord,
  OpportunityAppealStatus,
  OpportunityCategory,
  OpportunityComplaintReason,
  OpportunityComplaintRecord,
  OpportunityComplaintStatus,
  OpportunityProviderType,
  OpportunityRecord,
  OpportunityStatus,
  OpportunityTierStatus,
  OptionAComposition,
  OptionBUploadSpec,
  PhysicalQrScanTestRecord,
  PrimaryAdCategory,
  PrototypeReadinessSnapshot,
  PublicUser,
  QrDestinationType,
  QrLinkRecord,
  QrLinkStatus,
  RevenueLedgerSnapshot,
  SessionRecord,
  SevenStageAnalyticsSnapshot,
  SharedIntelBundleRecord,
  SharedIntelObservationRecord,
  SharedIntelPreviewState,
  SharedIntelSignalType,
  SupportTicketCategory,
  SupportTicketRecord,
  SupportTicketStatus,
  TextOnlyCommercialSpec,
} from '../types/edison.ts';

export type EdisonStorageBackend = 'json_file_store' | 'postgresql_planned';

export interface StorageBackendMetadata {
  backend: EdisonStorageBackend;
  schemaVersion: number;
  persistenceLabel: string;
  postgresMigrationReady: boolean;
  migrationBlueprintPath: string;
}

/**
 * Persistence and domain repository port for EDISON Track A.
 *
 * `EdisonPrototypeStore` implements this interface backed by atomic JSON file
 * storage (`data/edison-store.json`, schema v8). External PostgreSQL migration
 * (`TASK-P3-001`) can implement this exact interface without altering HTTP
 * route handlers, Zod validation, CSRF controls, or RBAC middleware.
 */
export interface EdisonDataRepository {
  getStorageBackendMetadata(): StorageBackendMetadata;

  // --- Auth & Session Hardening ---
  registerUser(
    params: {
      email: string;
      password: string;
      name: string;
      organisationName: string;
      role: 'advertiser' | 'opportunity_submitter';
    },
    previousSessionToken?: string
  ): { user: PublicUser; session: SessionRecord & { token: string } };

  loginUser(
    email: string,
    password: string,
    previousSessionToken?: string
  ): { user: PublicUser; session: SessionRecord & { token: string } };

  getSessionByToken(
    rawToken: string | undefined
  ): { user: PublicUser; session: SessionRecord } | null;

  getUserBySessionToken(token: string | undefined): PublicUser | null;
  touchSessionActivity(rawToken: string | undefined): void;
  expireSessionForTesting(rawToken: string, mode?: 'idle' | 'absolute'): void;
  logoutSession(token: string | undefined): void;

  recordSecurityAudit(
    actor: PublicUser | null,
    action: string,
    targetId: string,
    detail: string
  ): void;

  recordSharedIntelPiiRejection(scopeId: string | undefined, detail: string): void;

  // --- QR Links & Redirect Core ---
  listQrLinksForUser(user: PublicUser): QrLinkRecord[];

  createQrLink(
    owner: PublicUser,
    params: { label: string; destinationType: QrDestinationType; rawInput: string }
  ): QrLinkRecord;

  updateQrStatus(actor: PublicUser, token: string, status: QrLinkStatus): QrLinkRecord;

  resolveQrRedirect(
    token: string,
    clientIp: string,
    userAgent: string,
    headers?: { secPurpose?: string; purpose?: string; xMoz?: string }
  ):
    | { ok: true; record: QrLinkRecord; deduplicated: boolean; isSuspectedBot: boolean }
    | { ok: false; reason: string; statusCode: number };

  // --- Advertiser Profiles ---
  getAdvertiserProfile(user: PublicUser): AdvertiserProfile;
  listAllAdvertiserProfiles(): AdvertiserProfile[];

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
  ): AdvertiserProfile;

  adminUpdateAdvertiserVerification(
    admin: PublicUser,
    targetUserId: string,
    status: AccountVerificationStatus,
    notes: string
  ): AdvertiserProfile;

  // --- Campaign Lifecycle ---
  listCampaignsForUser(
    user: PublicUser,
    statusFilter?: CampaignStatus | 'all'
  ): CampaignRecord[];

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
  ): CampaignRecord;

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
  ): CampaignRecord;

  cloneCampaign(actor: PublicUser, campaignId: string): CampaignRecord;

  transitionCampaignStatus(
    actor: PublicUser,
    campaignId: string,
    targetStatus: CampaignStatus,
    options?: { rejectionReason?: string; fixInstructions?: string }
  ): CampaignRecord;

  deleteCampaign(actor: PublicUser, campaignId: string): void;

  // --- Support Tickets ---
  listSupportTicketsForUser(user: PublicUser): SupportTicketRecord[];

  createSupportTicket(
    owner: PublicUser,
    input: {
      campaignId?: string | null;
      category: SupportTicketCategory;
      subject: string;
      message: string;
    }
  ): SupportTicketRecord;

  updateSupportTicketStatus(
    actor: PublicUser,
    ticketId: string,
    status: SupportTicketStatus,
    adminResponse?: string
  ): SupportTicketRecord;

  // --- Ad Creation Studio & Media Audit ---
  listAdCreativesForUser(user: PublicUser): AdCreativeRecord[];

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
      textOnly?: TextOnlyCommercialSpec | null;
    }
  ): AdCreativeRecord;

  attachAdCreativeToCampaign(
    actor: PublicUser,
    creativeId: string,
    campaignId: string
  ): { creative: AdCreativeRecord; campaign: CampaignRecord };

  deleteAdCreative(actor: PublicUser, creativeId: string): void;

  recordMediaUploadAudit(
    actor: PublicUser,
    fileName: string,
    mimeType: string,
    sizeBytes: number
  ): void;

  // --- TV Preview Gate & Break Simulator ---
  evaluateCampaignPreSubmitGate(
    actor: PublicUser,
    campaignId: string
  ): CampaignPreviewGateResult;

  recordSimulatedPlaybackEvent(
    actor: PublicUser,
    input: {
      campaignId?: string | null;
      qrToken?: string | null;
      eventType:
        | 'ad_requested'
        | 'ad_delivered'
        | 'ad_played'
        | 'ad_viewable'
        | 'ad_network_backfill_simulated';
    }
  ): AnalyticsEventRecord;

  planSimulatedBreak(
    actor: PublicUser,
    params: {
      requestedBreakDurationSeconds?: number;
      safetyBufferSeconds?: number;
      requestedSlotCount?: number;
      alternatingPointerStart?: PrimaryAdCategory;
      allowMockBackfill?: boolean;
    }
  ): BreakSchedulePlan;

  // --- Opportunities & 3-Tier Verification ---
  listOpportunitiesForUser(actor: PublicUser): OpportunityRecord[];

  createOpportunity(
    actor: PublicUser,
    input: {
      providerType: OpportunityProviderType;
      providerName: string;
      category: OpportunityCategory;
      title: string;
      description: string;
      location: string;
      eligibilityRequirements: string;
      applicationMethod: string;
      contactInfo: string;
      qrToken: string | null;
      linkedCampaignId: string | null;
      closingDate: string;
      expiryDate: string;
      identityEvidenceRef: string;
      organisationEvidenceRef: string;
      specificOpportunityEvidenceRef: string;
      applicationFeeFreeConfirmed: boolean;
      noGuaranteeConfirmed: boolean;
    }
  ): OpportunityRecord;

  submitOpportunity(actor: PublicUser, opportunityId: string): OpportunityRecord;

  adminUpdateOpportunityVerification(
    actor: PublicUser,
    opportunityId: string,
    input: {
      identityStatus?: OpportunityTierStatus;
      identityNotes?: string;
      organisationStatus?: OpportunityTierStatus;
      organisationNotes?: string;
      specificOpportunityStatus?: OpportunityTierStatus;
      specificOpportunityNotes?: string;
      targetStatus?: OpportunityStatus;
      rejectionReason?: string;
    }
  ): OpportunityRecord;

  listOpportunityComplaintsForUser(actor: PublicUser): OpportunityComplaintRecord[];

  createOpportunityComplaint(
    actor: PublicUser,
    opportunityId: string,
    input: {
      reasonCategory: OpportunityComplaintReason;
      description: string;
      evidenceDetails?: string;
    }
  ): OpportunityComplaintRecord;

  adminUpdateComplaintStatus(
    actor: PublicUser,
    complaintId: string,
    input: { status: OpportunityComplaintStatus; resolutionNotes: string }
  ): { complaint: OpportunityComplaintRecord; opportunity: OpportunityRecord | null };

  listOpportunityAppealsForUser(actor: PublicUser): OpportunityAppealRecord[];

  createOpportunityAppeal(
    actor: PublicUser,
    opportunityId: string,
    input: { reason: string; additionalEvidence: string }
  ): OpportunityAppealRecord;

  adminResolveAppeal(
    actor: PublicUser,
    appealId: string,
    input: { status: OpportunityAppealStatus; adminNotes: string }
  ): { appeal: OpportunityAppealRecord; opportunity: OpportunityRecord | null };

  deleteOpportunity(actor: PublicUser, opportunityId: string): void;

  // --- Admin Moderation, Analytics & Ledger ---
  adminModerateQrLink(
    admin: PublicUser,
    token: string,
    status: QrLinkStatus,
    reason: string
  ): QrLinkRecord;

  adminClearCreativeQrFlag(
    admin: PublicUser,
    creativeId: string,
    notes: string
  ): AdCreativeRecord;

  getAdminModerationOverview(admin: PublicUser): AdminModerationOverview;

  getSevenStageAnalyticsFunnel(
    actor: PublicUser,
    campaignFilterId?: string | null
  ): SevenStageAnalyticsSnapshot;

  getRevenueLedgerSnapshot(actor: PublicUser): RevenueLedgerSnapshot;

  // --- QA Handover & Physical QR Verification ---
  getQrWatchSnapshot(
    actor: PublicUser,
    token: string
  ): {
    qrLink: QrLinkRecord;
    recentEvents: AnalyticsEventRecord[];
  };

  listPhysicalQrScanTests(actor: PublicUser): PhysicalQrScanTestRecord[];

  recordPhysicalQrScanTest(
    actor: PublicUser,
    params: {
      qrToken: string;
      encodedRedirectUrl: string;
      deviceModel: string;
      osPlatform: 'iOS' | 'Android' | 'Other Mobile';
      cameraApp: string;
      outcome: 'passed' | 'failed';
      reachedRedirectEndpoint: boolean;
      landedDestinationObserved: boolean;
      timeToScanSeconds: number;
      notes: string;
    }
  ): PhysicalQrScanTestRecord;

  deletePhysicalQrScanTest(actor: PublicUser, id: string): void;

  getPrototypeReadinessSnapshot(actor: PublicUser): PrototypeReadinessSnapshot;

  // --- Shared Intelligence Prototype Simulation ---
  getSharedIntelPreviewState(): SharedIntelPreviewState;

  submitSharedIntelPreviewObservation(
    actor: PublicUser,
    input: {
      tvDeviceId: string;
      scopeId: string;
      signalType: SharedIntelSignalType;
      estimatedBreakDurationSec: number;
      transitionLatencyMs: number;
      outlierAnomaly?: boolean;
      rawPayload?: Record<string, unknown>;
    }
  ): {
    state: SharedIntelPreviewState;
    observation: SharedIntelObservationRecord;
    bundle: SharedIntelBundleRecord;
  };

  runSharedIntelPreviewAction(
    actor: PublicUser,
    params: {
      action:
        | 'corroborate_quorum'
        | 'inject_outlier_poison'
        | 'toggle_offline'
        | 'sync_cache'
        | 'simulate_fpr_spike_rollback'
        | 'reset_preview';
      scopeId?: string;
      tvDeviceId?: string;
    }
  ): SharedIntelPreviewState;

  // --- Audit, Events & Snapshots ---
  listAuditLogs(filters?: { targetType?: string; limit?: number }): AuditLogRecord[];
  listAnalyticsEvents(limit?: number): AnalyticsEventRecord[];

  getFoundationSummary(): LiveReportSnapshot['summary'];
  getLiveReportSnapshot(): LiveReportSnapshot;
}
