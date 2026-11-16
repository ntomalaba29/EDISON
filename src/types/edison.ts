export type UserRole = 'advertiser' | 'opportunity_submitter' | 'admin';

export type AccountVerificationStatus =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'suspended';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  organisationName: string;
  role: UserRole;
  verificationStatus: AccountVerificationStatus;
  isPrototypeSeed: boolean;
  createdAt: string;
}

export type PublicUser = Omit<UserAccount, 'passwordHash'>;

export interface SessionRecord {
  id?: string;
  token?: string;
  tokenHash?: string;
  csrfToken: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  lastActivityAt: string;
  idleExpiresAt: string;
  expiresAt: string;
}

export type QrDestinationType =
  | 'website'
  | 'product'
  | 'store'
  | 'whatsapp'
  | 'telephone'
  | 'enquiry'
  | 'job_application'
  | 'scholarship'
  | 'training'
  | 'grant_tender'
  | 'other';

export type QrLinkStatus = 'active' | 'disabled' | 'flagged';

export interface QrLinkRecord {
  token: string;
  ownerId: string;
  label: string;
  destinationType: QrDestinationType;
  rawInput: string;
  resolvedUrl: string;
  resolvedHost: string;
  scheme: 'https' | 'tel' | 'http';
  status: QrLinkStatus;
  redirectRequestsTotal: number;
  redirectIssuedTotal: number;
  suspectedBotRequests: number;
  deduplicatedNonBotRedirects: number;
  lastRedirectRequestedAt: string | null;
  createdAt: string;
}

export type CampaignStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired';

export type AdvertiserEntityType = 'registered_business' | 'individual_sole_trader' | 'public_ngo';

export interface AdvertiserProfile {
  userId: string;
  entityType: AdvertiserEntityType;
  businessOrTradingName: string;
  registrationOrTaxId: string;
  industryCategory: string;
  countryCode: string;
  cityRegion: string;
  physicalAddress: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  billingContactName: string;
  billingContactEmail: string;
  websiteUrl: string;
  verificationStatus: AccountVerificationStatus;
  verificationNotes: string;
  isPrototypeSeed: boolean;
  updatedAt: string;
}

export type CampaignContentCategory = 'commercial_advertising' | 'opportunity_promotion';

export type PrimaryAdCategory = 'CHARITY' | 'COMMERCIAL';

export type DaypartSlot = 'morning' | 'daytime' | 'primetime' | 'late_night' | 'all_day';

export interface BillingEstimateSummary {
  model: 'simulated_cpm_flat_rate' | 'charity_free_zero_cost';
  currency: 'USD';
  estimatedSpots: number;
  estimatedRatePerSpotUsd: number;
  estimatedTotalUsd: number;
  paymentCollectionActive: false;
  disclaimer: string;
}

export type FinancialRevenueStream =
  | 'charity_free'
  | 'direct_commercial_paid'
  | 'ad_network_estimated'
  | 'ad_network_confirmed'
  | 'actual_payment_received'
  | 'refund_adjustment';

export interface CampaignRecord {
  id: string;
  ownerId: string;
  title: string;
  contentCategory: CampaignContentCategory;
  summary: string;
  qrToken: string | null;
  adCreativeRef: string | null;
  durationSeconds: number;
  dailyFrequencyCap: number;
  targetRegions: string[];
  dayparts: DaypartSlot[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  rejectionReason: string | null;
  fixInstructions: string | null;
  simulatedEstimate: BillingEstimateSummary;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export type SupportTicketCategory =
  | 'campaign_review'
  | 'verification_enquiry'
  | 'qr_technical'
  | 'billing_dispute'
  | 'policy_appeal';

export interface SupportTicketRecord {
  id: string;
  ownerId: string;
  campaignId: string | null;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Advertisement Creation Studio (Block 2.3) ---

export type AdStudioMode = 'option_a_studio' | 'option_b_upload' | 'text_only_commercial';

export type StudioTemplateId =
  | 'commercial_offer'
  | 'retail_promo'
  | 'product_launch'
  | 'brand_spotlight'
  | 'event_notice'
  | 'opportunity_job'
  | 'opportunity_scholarship'
  | 'opportunity_grant';

export type CanvasElementKind =
  | 'logo'
  | 'product_image'
  | 'headline'
  | 'description'
  | 'promo_badge'
  | 'price_value'
  | 'contact_info'
  | 'website_url'
  | 'cta_button'
  | 'qr_block';

export interface CanvasElementLayout {
  id: string;
  kind: CanvasElementKind;
  label: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  zIndex: number;
  fontSizePx: number;
  visible: boolean;
}

export type QrPlacementPreset = 'bottom_right' | 'bottom_left' | 'sidebar_right' | 'custom';

export interface OptionAComposition {
  templateId: StudioTemplateId;
  backgroundColor: string;
  gradientEndColor: string;
  useGradient: boolean;
  accentColor: string;
  textColor: string;
  scrimOpacity: number;
  logoUrl: string | null;
  productImageUrl: string | null;
  backgroundImageUrl: string | null;
  heading: string;
  description: string;
  promoText: string;
  priceOrValue: string;
  contactDetails: string;
  websiteAddress: string;
  callToAction: string;
  qrPlacement: QrPlacementPreset;
  elements: CanvasElementLayout[];
}

export type ExternalQrInspectionStatus =
  | 'none_found'
  | 'decoded_matched'
  | 'decoded_mismatch'
  | 'suspected_unreadable';

export interface OptionBUploadSpec {
  mediaKind: 'image' | 'video';
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  widthPx: number;
  heightPx: number;
  aspectRatioLabel: string;
  aspectRatioValid: boolean;
  durationSeconds: number | null;
  hasAudioTrack: boolean | null;
  audioNotice: string;
  qrInspectionStatus: ExternalQrInspectionStatus;
  decodedQrPayload: string | null;
  qrOverlayConfirmed: boolean;
  qrOverlayCorner: 'bottom_right' | 'bottom_left';
  requiresAdminReviewFlag: boolean;
  contentAttested: boolean;
  validationWarnings: string[];
  validationErrors: string[];
}

export interface TextOnlyCommercialSpec {
  advertiserName: string;
  headline: string;
  messageBody: string;
  contactInfo: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  qrPlacement: 'bottom_right' | 'bottom_left';
}

export type AdCreativeStatus = 'draft' | 'ready_for_preview' | 'flagged_for_review';

export interface AdCreativeRecord {
  id: string;
  ownerId: string;
  campaignId: string | null;
  qrToken: string | null;
  title: string;
  mode: AdStudioMode;
  displayDurationSeconds: number;
  safeZoneWarnings: string[];
  contrastWarnings: string[];
  optionA: OptionAComposition | null;
  optionB: OptionBUploadSpec | null;
  textOnly?: TextOnlyCommercialSpec | null;
  status: AdCreativeStatus;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PreSubmitCheckStatus = 'pass' | 'warn' | 'fail';

export interface PreSubmitCheckItem {
  id: string;
  label: string;
  status: PreSubmitCheckStatus;
  detail: string;
}

export interface CampaignPreviewGateResult {
  campaign: CampaignRecord;
  creative: AdCreativeRecord | null;
  qrLink: QrLinkRecord | null;
  advertiserProfile: AdvertiserProfile | null;
  readyToSubmit: boolean;
  blockingErrors: string[];
  warnings: string[];
  requiresAdminQrReview: boolean;
  checklist: PreSubmitCheckItem[];
}

export type OpportunityCategory =
  | 'permanent_employment'
  | 'temporary_employment'
  | 'part_time_employment'
  | 'contract_employment'
  | 'internship'
  | 'apprenticeship'
  | 'scholarship'
  | 'education'
  | 'training'
  | 'grant'
  | 'tender'
  | 'business_opportunity'
  | 'workshop_seminar'
  | 'other';

export type OpportunityProviderType =
  | 'registered_organisation'
  | 'individual_informal_employer';

export type OpportunityStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'verified_live'
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'revoked';

export type OpportunityTierStatus =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'not_applicable'
  | 'rejected';

export interface OpportunityVerificationTiers {
  identityStatus: OpportunityTierStatus;
  identityEvidenceRef: string;
  identityNotes: string;
  identityVerifiedAt: string | null;
  organisationStatus: OpportunityTierStatus;
  organisationEvidenceRef: string;
  organisationNotes: string;
  organisationVerifiedAt: string | null;
  specificOpportunityStatus: OpportunityTierStatus;
  specificOpportunityEvidenceRef: string;
  specificOpportunityNotes: string;
  specificOpportunityVerifiedAt: string | null;
}

export interface OpportunityRecord {
  id: string;
  ownerId: string;
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
  status: OpportunityStatus;
  verificationTiers: OpportunityVerificationTiers;
  scamRiskFlags: string[];
  applicationFeeFreeConfirmed: boolean;
  noGuaranteeConfirmed: boolean;
  advertisingFeeInfluencesVerification: false;
  rejectionReason: string | null;
  suspensionReason: string | null;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityComplaintStatus =
  | 'reported'
  | 'under_investigation'
  | 'cleared'
  | 'suspended'
  | 'revoked';

export type OpportunityComplaintReason =
  | 'upfront_fee_scam'
  | 'misleading_guarantee'
  | 'expired_or_closed'
  | 'broken_or_wrong_qr'
  | 'fake_employer_or_listing'
  | 'other';

export interface OpportunityComplaintRecord {
  id: string;
  opportunityId: string;
  reporterId: string;
  reporterRole: UserRole;
  reasonCategory: OpportunityComplaintReason;
  description: string;
  evidenceDetails: string;
  status: OpportunityComplaintStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityAppealStatus =
  | 'submitted'
  | 'under_review'
  | 'upheld_reinstated'
  | 'denied';

export interface OpportunityAppealRecord {
  id: string;
  opportunityId: string;
  ownerId: string;
  reason: string;
  additionalEvidence: string;
  status: OpportunityAppealStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalyticsEventType =
  | 'ad_requested'
  | 'ad_delivered'
  | 'ad_played'
  | 'ad_viewable'
  | 'redirect_requested'
  | 'redirect_issued'
  | 'qr_scanned'
  | 'destination_opened'
  | 'verified_conversion'
  | 'ad_network_backfill_simulated';

export interface AnalyticsEventRecord {
  id: string;
  qrToken: string | null;
  campaignId: string | null;
  eventType: AnalyticsEventType;
  measurementSource: 'real_measured' | 'simulated_prototype';
  dedupKey: string;
  isSuspectedBot?: boolean;
  isDeduplicated?: boolean;
  redirectOutcome?: 'issued' | 'not_found' | 'inactive' | 'flagged';
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: UserRole | 'anonymous' | 'system';
  action: string;
  targetType:
    | 'auth'
    | 'qr_link'
    | 'advertiser_profile'
    | 'campaign'
    | 'ad_creative'
    | 'media_upload'
    | 'support_ticket'
    | 'opportunity'
    | 'qa_handover'
    | 'system';
  targetId: string;
  detail: string;
  createdAt: string;
}

export interface PhysicalQrScanTestRecord {
  id: string;
  testerUserId: string;
  testerEmail: string;
  qrToken: string;
  encodedRedirectUrl: string;
  resolvedTargetUrl: string;
  deviceModel: string;
  osPlatform: 'iOS' | 'Android' | 'Other Mobile';
  cameraApp: string;
  testMode: 'physical_phone_camera';
  outcome: 'passed' | 'failed';
  reachedRedirectEndpoint: boolean;
  landedDestinationObserved: boolean;
  timeToScanSeconds: number;
  observedRedirectIssuedAtLogTime: number;
  notes: string;
  createdAt: string;
}

export interface PrototypeQaCheckItem {
  id: string;
  block: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'pending_manual';
  scope: 'automated_invariant' | 'manual_owner_device';
  detail: string;
}

export interface PrototypeReadinessSnapshot {
  generatedAt: string;
  phase: string;
  block: string;
  automatedInvariantsPassed: number;
  automatedInvariantsTotal: number;
  physicalQrScanStatus: 'PENDING_OWNER_DEVICE_TEST' | 'VERIFIED_BY_OWNER_LOG';
  physicalQrPassedCount: number;
  physicalQrTotalCount: number;
  checks: PrototypeQaCheckItem[];
  physicalScanTests: PhysicalQrScanTestRecord[];
  summary: {
    userCount: number;
    profileCount: number;
    campaignCount: number;
    activeCampaignCount: number;
    adCreativeCount: number;
    opportunityCount: number;
    verifiedLiveOpportunityCount: number;
    qrCount: number;
    redirectRequestsTotal: number;
    redirectIssuedTotal: number;
    suspectedBotRedirects: number;
    verifiedDestinationOpens: number;
    simulatedEventsTotal: number;
    auditLogCount: number;
  };
}

export interface EdisonStoreData {
  schemaVersion: number;
  users: UserAccount[];
  sessions: SessionRecord[];
  qrLinks: QrLinkRecord[];
  advertiserProfiles: AdvertiserProfile[];
  campaigns: CampaignRecord[];
  adCreatives: AdCreativeRecord[];
  supportTickets: SupportTicketRecord[];
  opportunities: OpportunityRecord[];
  opportunityComplaints: OpportunityComplaintRecord[];
  opportunityAppeals: OpportunityAppealRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  physicalQrScanTests: PhysicalQrScanTestRecord[];
  auditLogs: AuditLogRecord[];
  sharedIntelPreview?: SharedIntelPreviewState;
}

export interface EdisonProgressMetrics {
  aiStudioAssignmentPct: number;
  softwareToStageP6Pct: number;
  overallFullAppPct: number;
  remainingUntilFullAppPct: number;
  consentBlockedScopePct: number;
  rubricSummary: string;
}

export interface LiveReportSnapshot {
  generatedAt: string;
  phase: string;
  stage: string;
  block: string;
  gateStatus: string;
  progressMetrics?: EdisonProgressMetrics;
  latestAuditAt: string | null;
  latestAuditAction: string | null;
  campaignStatusBreakdown: Record<CampaignStatus, number>;
  summary: {
    userCount: number;
    qrCount: number;
    campaignCount: number;
    activeCampaignCount: number;
    adCreativeCount: number;
    profileCount: number;
    openTicketCount: number;
    opportunityCount?: number;
    verifiedLiveOpportunityCount?: number;
    openComplaintCount?: number;
    openAppealCount?: number;
    redirectRequestsTotal: number;
    redirectIssuedTotal: number;
    suspectedBotRedirects: number;
    verifiedDestinationOpens: number;
    verifiedConversionsTotal?: number;
    simulatedEventsTotal?: number;
    physicalQrTestsCount?: number;
    physicalQrPassedCount?: number;
    auditLogCount: number;
    storagePath: string;
  };
}

export interface AnalyticsFunnelStageItem {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  key: string;
  label: string;
  measurementSource: 'real_measured' | 'simulated_prototype' | 'unverified_in_prototype';
  rawCount: number;
  deduplicatedCount: number;
  suspectedBotExcluded: number;
  secondaryCount?: number;
  secondaryLabel?: string;
  epistemicNote: string;
}

export interface SevenStageAnalyticsSnapshot {
  generatedAt: string;
  scope: 'network_wide' | 'user_owned';
  campaignFilterId: string | null;
  stages: AnalyticsFunnelStageItem[];
  recentEvents: AnalyticsEventRecord[];
  campaignBreakdown: Array<{
    campaignId: string;
    title: string;
    status: CampaignStatus;
    qrToken: string | null;
    simulatedRequested: number;
    simulatedPlayed: number;
    realRedirectRequested: number;
    realRedirectIssued: number;
    suspectedBotFiltered: number;
    verifiedOpens: number;
  }>;
}

export interface AdminModerationOverview {
  generatedAt: string;
  pendingCampaigns: CampaignRecord[];
  activeOrScheduledCampaigns: CampaignRecord[];
  flaggedCreatives: AdCreativeRecord[];
  advertiserProfiles: AdvertiserProfile[];
  qrLinks: QrLinkRecord[];
  supportTickets: SupportTicketRecord[];
  openComplaintsCount: number;
  openAppealsCount: number;
}

export type BreakSlotSource =
  | 'direct_charity_free'
  | 'direct_commercial_paid'
  | 'mock_ad_network_backfill'
  | 'unfilled';

export interface ScheduledBreakSlot {
  slotIndex: number;
  primaryCategory: PrimaryAdCategory;
  source: BreakSlotSource;
  campaignId: string | null;
  creativeId: string | null;
  opportunityId: string | null;
  title: string;
  durationSeconds: number;
  qrToken: string | null;
  revenueStream: FinancialRevenueStream | null;
  estimatedValueUsd: number;
  fillNote: string;
  isMockBackfill: boolean;
}

export interface BreakSchedulePlan {
  generatedAt: string;
  adapterId: 'simulation_tv_adapter';
  adapterDisclaimer: string;
  requestedBreakDurationSeconds: number;
  safetyBufferSeconds: number;
  usableBreakSeconds: number;
  requestedSlotCount: number;
  k1ShortBreakRuleApplied: boolean;
  skipped: boolean;
  skipReason: string | null;
  alternatingPointerStart: PrimaryAdCategory;
  nextAlternatingPointer: PrimaryAdCategory;
  slots: ScheduledBreakSlot[];
  totalScheduledDurationSeconds: number;
}

export interface RevenueStreamLedgerRow {
  stream: FinancialRevenueStream;
  label: string;
  primaryCategory: PrimaryAdCategory | 'BOTH';
  amountUsd: number;
  spotOrRecordCount: number;
  certaintyStatus:
    | 'permanent_zero'
    | 'simulated_rate_card'
    | 'mock_estimated'
    | 'unconfirmed_zero'
    | 'no_real_collection';
  note: string;
}

export interface RevenueLedgerSnapshot {
  generatedAt: string;
  scope: 'network_wide' | 'user_owned';
  paymentCollectionActive: false;
  gamCtvAccountConfigured: false;
  streams: RevenueStreamLedgerRow[];
  totals: {
    charityFreeSpots: number;
    directCommercialSimulatedUsd: number;
    adNetworkEstimatedMockUsd: number;
    adNetworkConfirmedUsd: number;
    actualCashReceivedUsd: number;
    refundAdjustmentsUsd: number;
  };
}

// --- Network-Wide Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / ADR-016) ---

export type SharedIntelSignalType = 'scte35' | 'hbbtv' | 'av_pattern' | 'channel_cadence';

export type SharedIntelBundleStatus =
  | 'corroborated_published'
  | 'quarantined_pending_corroboration'
  | 'rolled_back'
  | 'rejected_poison_outlier';

export type SharedIntelTrustDecision =
  | 'accepted_corroborated'
  | 'quarantined_pending_quorum'
  | 'rejected_outlier'
  | 'queued_offline';

export interface SharedIntelScopeKey {
  scopeId: string;
  country: string;
  broadcaster: string;
  channel: string;
  platform: string;
  broadcastConfig: string;
  displayName: string;
}

export interface SharedIntelBundleRecord {
  scope: SharedIntelScopeKey;
  version: number;
  previousGoodVersion: number;
  status: SharedIntelBundleStatus;
  corroboratingDeviceIds: string[];
  pendingObservations: number;
  quorumRequired: number;
  confidenceScore: number;
  p10BreakDurationSec: number;
  p50BreakDurationSec: number;
  switchingLatencyMs: number;
  falsePositiveRatePct: number;
  sha256Manifest: string;
  rollbackReason: string | null;
  updatedAt: string;
}

export interface SharedIntelObservationRecord {
  id: string;
  tvDeviceId: string;
  scopeId: string;
  signalType: SharedIntelSignalType;
  estimatedBreakDurationSec: number;
  transitionLatencyMs: number;
  outlierAnomaly: boolean;
  trustDecision: SharedIntelTrustDecision;
  decisionReason: string;
  containsPii: false;
  createdAt: string;
}

export interface SharedIntelLocalDeviceCache {
  tvDeviceId: string;
  deviceLabel: string;
  assignedScopeId: string;
  cachedBundleVersion: number;
  cachedScopeId: string;
  cachedP10DurationSec: number;
  cachedSha256: string;
  offlineMode: boolean;
  queuedObservationsCount: number;
  lastSyncedAt: string;
  fallbackStatus: 'online_synced' | 'offline_using_local_cache' | 'rollback_restored';
}

export interface SharedIntelAuditEntry {
  id: string;
  action: string;
  scopeId: string | null;
  detail: string;
  createdAt: string;
}

export interface SharedIntelPreviewState {
  isPrototypeSimulation: true;
  implementationNote: string;
  quorumThreshold: number;
  fprRollbackThresholdPct: number;
  zeroPiiEnforced: true;
  rejectedPiiAttemptCount: number;
  bundles: SharedIntelBundleRecord[];
  deviceCaches: SharedIntelLocalDeviceCache[];
  observations: SharedIntelObservationRecord[];
  auditTrail: SharedIntelAuditEntry[];
}

// --- Phase 3 Block P3-C / Phase 4 Entry Prep: Modular TvPlatformAdapter & AURA Normal TV Remote (Software-Only Simulation) ---

export type TvPlatformId = 'simulation_tv' | 'android_tv_tif' | 'samsung_tizen' | 'lg_webos';

export type TvRemoteCommand =
  | 'power_toggle'
  | 'volume_up'
  | 'volume_down'
  | 'mute_toggle'
  | 'channel_up'
  | 'channel_down'
  | 'input_source_select'
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right'
  | 'dpad_ok'
  | 'back'
  | 'home';

export type TvInputSource = 'LIVE_TUNER' | 'HDMI_1' | 'HDMI_2' | 'EDISON_APP';

export type TvFaultSimulationMode =
  | 'none'
  | 'adapter_timeout'
  | 'hdcp_blocked'
  | 'decoder_crash'
  | 'network_drop';

export interface TvPlatformCapabilityProfile {
  platformId: TvPlatformId;
  displayName: string;
  isSimulated: true;
  hardwareTested: false;
  officiallyDocumentedPath: string;
  requiresPartnerPrivilegeForGlobalTuner: boolean;
  supportsOwnSessionOverlay: boolean;
  supportedRemoteCommands: TvRemoteCommand[];
  restorationGuaranteeMode: string;
  stageP6Note: string;
}

export interface SimulatedTvDeviceState {
  platformId: TvPlatformId;
  powerOn: boolean;
  volume: number;
  muted: boolean;
  activeInput: TvInputSource;
  previousOrdinaryInput: Exclude<TvInputSource, 'EDISON_APP'>;
  channelNumber: number;
  adBreakOverlayActive: boolean;
  lastDpadAction: string | null;
  lastRestoredAt: string | null;
  ordinaryTvIntact: boolean;
}

export interface TvRemoteDispatchResult {
  ok: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  platformId: TvPlatformId;
  intentSource: 'AURA' | 'EDISON_UI';
  command: TvRemoteCommand;
  faultInjected: TvFaultSimulationMode;
  watchdogTriggered: boolean;
  restorationOutcome:
    | 'not_needed'
    | 'restored_to_ordinary_tv'
    | 'command_rejected_safely';
  previousState: SimulatedTvDeviceState;
  nextState: SimulatedTvDeviceState;
  detail: string;
  auditTraceId: string;
  executedAt: string;
}

// --- Phase 4 Block 4.1: Software-First Smart TV Adapter Harnesses & Offline Intelligence Cache ---

export type TvAdapterHarnessPhase =
  | 'idle'
  | 'session_created'
  | 'tuned_ordinary'
  | 'ad_overlay_active'
  | 'restoring_ordinary'
  | 'yielded_to_ordinary'
  | 'fault_recovered';

export interface TvPlatformHarnessTelemetry {
  platformId: TvPlatformId;
  harnessName: string;
  harnessPhase: TvAdapterHarnessPhase;
  nativeSurfaceId: string;
  lifecycleNotes: string;
  privilegeBoundaryEnforced: boolean;
  isSimulated: true;
  hardwareTested: false;
}

export interface TvBreakLifecycleResult {
  ok: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  platformId: TvPlatformId;
  action: 'enter_ad_session' | 'exit_to_ordinary_tv';
  faultInjected: TvFaultSimulationMode;
  watchdogTriggered: boolean;
  simulatedLatencyMs: number;
  harnessTelemetry: TvPlatformHarnessTelemetry;
  previousState: SimulatedTvDeviceState;
  nextState: SimulatedTvDeviceState;
  detail: string;
  auditTraceId: string;
  executedAt: string;
}

export interface TvFaultSuiteCaseResult {
  platformId: TvPlatformId;
  faultMode: Exclude<TvFaultSimulationMode, 'none'>;
  watchdogTriggered: boolean;
  ordinaryTvIntact: boolean;
  adOverlayCleared: boolean;
  restoredInput: TvInputSource;
  passed: boolean;
  detail: string;
}

export interface TvFaultSuiteReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  totalCases: number;
  passedCases: number;
  allPassed: boolean;
  cases: TvFaultSuiteCaseResult[];
}

export interface OfflineCacheBundleEntry {
  scopeId: string;
  displayName: string;
  country: string;
  broadcaster: string;
  channel: string;
  platform: string;
  version: number;
  previousGoodVersion: number | null;
  p10BreakDurationSec: number;
  p50BreakDurationSec: number;
  switchingLatencyMs: number;
  sha256Manifest: string;
  previousGoodManifest: string | null;
  previousGoodP10Sec: number | null;
  previousGoodP50Sec: number | null;
  lastSwappedAt: string;
  status: 'active_verified' | 'rolled_back_safe';
}

export interface OfflineCacheOperationResult {
  ok: boolean;
  action: 'stage_swap' | 'rollback' | 'evaluate_break' | 'queue_offline';
  scopeId: string;
  atomicSwapApplied: boolean;
  rejectedReason: string | null;
  bundle: OfflineCacheBundleEntry | null;
  detail: string;
  executedAt: string;
}

export interface OfflineQueuedObservation {
  id: string;
  idempotencyKey: string;
  scopeId: string;
  channelNumber: number;
  signalType: 'scte35_cue' | 'hbbtv_ait' | 'av_cadence' | 'offline_skip';
  observedBreakDurationSec: number;
  switchingLatencyMs: number;
  containsPii: false;
  queuedAt: string;
}

export interface OfflineQueueDrainResult {
  ok: boolean;
  networkOnline: boolean;
  attemptedCount: number;
  drainedNewCount: number;
  deduplicatedReplayCount: number;
  remainingQueueCount: number;
  detail: string;
  executedAt: string;
}

export interface OfflineCacheStateSnapshot {
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  zeroPiiEnforced: true;
  offlineResilient: boolean;
  bundles: OfflineCacheBundleEntry[];
  queuedObservationsCount: number;
  queuedObservations: OfflineQueuedObservation[];
  deduplicatedReplaysCount: number;
  drainedObservationsTotal: number;
  recentOperations: Array<{
    id: string;
    action: string;
    scopeId: string;
    detail: string;
    ok: boolean;
    createdAt: string;
  }>;
}

// --- Phase 4 Block 4.2: Multi-Channel Adapter State, Cadence Simulator & Conformance Vectors ---

export interface TvChannelProfileBinding {
  channelNumber: number;
  channelName: string;
  broadcaster: string;
  scopeId: string;
  defaultInput: Exclude<TvInputSource, 'EDISON_APP'>;
  signalStandard: 'SCTE-35' | 'HbbTV-AIT' | 'DVB-Cadence';
}

export interface TvCadenceSimulationResult {
  ok: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  platformId: TvPlatformId;
  channelBinding: TvChannelProfileBinding;
  signalType: 'scte35_cue' | 'hbbtv_ait' | 'av_cadence';
  networkOnline: boolean;
  cacheEligibility: {
    eligible: boolean;
    bundleVersion: number | null;
    availableP10Sec: number;
    requiredTotalSec: number;
    reason: string;
  };
  breakExecuted: boolean;
  adDisplayedDuringBreak: boolean;
  watchdogRecovered: boolean;
  observationQueued: boolean;
  deduplicatedReplay: boolean;
  finalTvState: SimulatedTvDeviceState;
  detail: string;
  auditTraceId: string;
  executedAt: string;
}

export interface TvEmulatorConformanceVector {
  vectorId: string;
  platformId: TvPlatformId;
  scenario: string;
  expectedOutcome: string;
  actualOutcome: string;
  ordinaryTvPreserved: boolean;
  passed: boolean;
}

export interface TvEmulatorConformanceReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  totalVectors: number;
  passedVectors: number;
  allPassed: boolean;
  vectors: TvEmulatorConformanceVector[];
}


