export type UserRole = 'advertiser' | 'opportunity_submitter' | 'admin' | 'household_viewer';

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
  countryCode?: string;
  provinceOrRegion?: string;
  structuredCriteria?: OpportunityStructuredCriteria;
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
  redirectOutcome?:
    | 'issued'
    | 'not_found'
    | 'inactive'
    | 'flagged'
    | 'revoked_consent'
    | 'expired_token';
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
    | 'household'
    | 'consent'
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
  households?: HouseholdInstallationRecord[];
  householdMembers?: HouseholdMemberProfile[];
  householdQrTokens?: HouseholdQrTokenRecord[];
  consentAuditEvents?: ConsentAuditEventRecord[];
  lastReliabilityChaosReport?: ReliabilityChaosReport | null;
  pilotCohorts?: PilotCohortBlueprintRecord[];
  stageP6PrepNotes?: Record<string, string>;
  commercialBoardDecisions?: CommercialBoardDecisionRecord[];
  commercialCostAssumptions?: CommercialCostAssumptionsInput;
  countryPolicyProfiles?: Partial<Record<TargetingGeographyCode, CountryJurisdictionPolicyConfig>>;
  countryLaunchDecisions?: CountryLaunchDecisionRecord[];
  regionalLocalizationProfiles?: Partial<Record<ExpansionRegionId, RegionalLocalizationConfig>>;
  internationalExpansionDecisions?: InternationalExpansionDecisionRecord[];
}

export interface EdisonProgressMetrics {
  aiStudioAssignmentPct: number;
  executionSubphasesCompleted: number;
  executionSubphasesTotal: number;
  executionSubphasePct: number;
  remainingExecutionSubphasePct: number;
  consentBlockedScopePct: number;
  trackBStatus?: string;
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
  householdConsentEvaluated?: boolean;
  householdId?: string | null;
  consentEpoch?: number | null;
  adDeliverySuspended?: boolean;
  suspensionReason?: string | null;
  ordinaryTvPreserved?: true;
  tvPersonalisation?: TvBreakPersonalisationDisplay | null;
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

// --- Phase 4 Block 4.3: Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & Software Exit ---

export type BroadcastCueStandard =
  | 'scte35_splice_insert'
  | 'hbbtv_ait_dsmcc'
  | 'av_cadence_marker';

export interface BroadcastCueParseRequest {
  standard: BroadcastCueStandard;
  channelNumber: number;
  breakDurationSec: number;
  adDurationSeconds: number;
  safetyBufferSeconds?: number;
  drmProtected?: boolean;
  // SCTE-35 fields
  spliceEventId?: number;
  outOfNetworkIndicator?: boolean;
  autoReturn?: boolean;
  ptsTimeTicks?: number;
  // HbbTV AIT/DSM-CC fields
  orgId?: number;
  applicationId?: number;
  controlCode?: 'AUTOSTART' | 'PRESENT' | 'KILL';
  ownSessionOnly?: boolean;
  // AV Cadence fields
  blackFrameDurationMs?: number;
  audioSilenceRmsDb?: number;
  confidenceScore?: number;
}

export interface BroadcastCueParseResult {
  ok: boolean;
  validCue: boolean;
  safeToTriggerBreak: boolean;
  action: 'TRIGGER_EDISON_AD_SLOT' | 'RETURN_TO_PROGRAM' | 'SKIP_FAIL_CLOSED';
  standard: BroadcastCueStandard;
  channelNumber: number;
  effectiveWindowSec: number;
  requiredWindowSec: number;
  confidenceScore: number;
  reason: string;
  normalizedCue: Record<string, string | number | boolean>;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  parsedAt: string;
}

export type CompanionExecutionContext =
  | 'owned_edison_session'
  | 'third_party_broadcaster_stream'
  | 'system_global_tuner';

export type CompanionRequestedCapability =
  | 'render_overlay'
  | 'inject_remote_key'
  | 'monitor_epg_global'
  | 'hdmi_cec_switch'
  | 'bypass_hdcp'
  | 'background_screen_scrape';

export interface CompanionPolicyEvalRequest {
  platformId: TvPlatformId;
  executionContext: CompanionExecutionContext;
  requestedCapability: CompanionRequestedCapability;
  hasPartnerPrivilege: boolean;
  hasExplicitViewerConsent: boolean;
  drmHdcpActive: boolean;
}

export interface CompanionPolicyEvalResult {
  allowed: boolean;
  decision: 'ALLOW_BOUNDED' | 'DENY_FAIL_CLOSED';
  platformId: TvPlatformId;
  executionContext: CompanionExecutionContext;
  requestedCapability: CompanionRequestedCapability;
  violatedPolicy: string | null;
  reason: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  evaluatedAt: string;
}

export interface Phase4SoftwareExitCheckItem {
  checkId: string;
  category: 'cue_parser' | 'companion_policy' | 'fault_recovery' | 'emulator_conformance';
  label: string;
  passed: boolean;
  detail: string;
}

export interface Phase4SoftwareExitReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  softwareExitReady: boolean;
  passedChecks: number;
  totalChecks: number;
  faultSuiteSummary: {
    passedCases: number;
    totalCases: number;
    allPassed: boolean;
  };
  conformanceSummary: {
    passedVectors: number;
    totalVectors: number;
    allPassed: boolean;
  };
  checks: Phase4SoftwareExitCheckItem[];
}

// --- Phase 5 Block 5.1: Production Network-Wide Shared Ad Intelligence Fleet Service (ADR-016 / PRD-19) ---

export type FleetTrustDecision =
  | 'quarantined_pending_quorum'
  | 'accepted_corroborated'
  | 'conflicting_held'
  | 'rejected_outlier'
  | 'rejected_invalid_signature'
  | 'rejected_pii_violation'
  | 'rate_limited_flood'
  | 'queued_offline_replayed';

export interface FleetAttestedDeviceRecord {
  tvDeviceId: string;
  decoderProfileId: string;
  keyId: string;
  publicKeyPem: string;
  platform: string;
  country: string;
  assignedScopeId: string;
  status: 'attested_active' | 'quarantined_spoof';
  registeredAt: string;
  lastSeenAt: string;
  acceptedCount: number;
  rejectedCount: number;
}

export interface FleetSignedBundleRecord {
  scope: SharedIntelScopeKey;
  version: number;
  previousGoodVersion: number;
  status:
    | 'corroborated_published'
    | 'quarantined_pending_corroboration'
    | 'conflict_split_held'
    | 'rolled_back';
  corroboratingDeviceIds: string[];
  pendingDeviceIds: string[];
  conflictingClusterCount: number;
  quorumRequired: number;
  confidenceScore: number;
  p10BreakDurationSec: number;
  p50BreakDurationSec: number;
  switchingLatencyMs: number;
  falsePositiveRatePct: number;
  falseNegativeRatePct: number;
  signingKeyId: string;
  sha256Manifest: string;
  bundleSignatureHex: string;
  previousGoodManifest: string | null;
  rollbackReason: string | null;
  updatedAt: string;
}

export interface FleetObservationResult {
  ok: boolean;
  httpStatus: 201 | 400 | 401 | 429;
  observationId: string;
  tvDeviceId: string;
  scopeId: string;
  signalType: SharedIntelSignalType;
  estimatedBreakDurationSec: number;
  transitionLatencyMs: number;
  trustDecision: FleetTrustDecision;
  signatureVerified: boolean;
  containsPii: false;
  reason: string;
  bundleVersionAfter: number | null;
  createdAt: string;
}

export type FleetBreakEventStatus =
  | 'shared_pending_corroboration'
  | 'shared_corroborated'
  | 'conflict_held';

export interface FleetBreakEventRecord {
  eventId: string;
  decoderProfileId: string;
  channelId: string;
  scopeId: string;
  breakStartedAtUtc: string;
  sourceDeviceIds: string[];
  status: FleetBreakEventStatus;
  containsPii: false;
  receivedAtUtc: string;
}

export interface FleetBreakEventSubmissionResult {
  ok: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  httpStatus: 200 | 201 | 400 | 401 | 409 | 429;
  status:
    | FleetBreakEventStatus
    | 'duplicate_ignored'
    | 'rejected_pii'
    | 'rejected_invalid_signature'
    | 'rejected_replay'
    | 'rejected_scope_mismatch'
    | 'rejected_event_id_reuse'
    | 'rate_limited'
    | 'rejected_stale';
  eventId: string;
  decoderProfileId: string;
  tvDeviceId: string;
  scopeId: string;
  channelId: string;
  breakStartedAtUtc: string;
  signatureVerified: boolean;
  containsPii: false;
  reason: string;
  event: FleetBreakEventRecord | null;
  receivedAtUtc: string;
}

export interface FleetBreakEventSyncResult {
  ok: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  httpStatus: 200 | 401 | 409;
  tvDeviceId: string;
  decoderProfileId: string;
  channelId: string;
  events: FleetBreakEventRecord[];
  detail: string;
  syncedAtUtc: string;
}

export interface FleetDeltaSyncResult {
  ok: boolean;
  status:
    | 'delta_delivered'
    | 'up_to_date'
    | 'scope_compatibility_mismatch'
    | 'device_not_attested'
    | 'checksum_mismatch_rolled_back';
  tvDeviceId: string;
  scopeId: string;
  deliveredVersion: number | null;
  sha256Manifest: string | null;
  bundleSignatureHex: string | null;
  signatureValid: boolean;
  playbackInterrupted: false;
  detail: string;
  syncedAt: string;
}

export interface FleetFprReportResult {
  ok: boolean;
  scopeId: string;
  reportedFprPct: number;
  thresholdPct: number;
  rollbackTriggered: boolean;
  activeVersionAfter: number;
  restoredFromVersion: number | null;
  reason: string;
  evaluatedAt: string;
}

export interface SharedIntelScenarioCheckItem {
  scenarioNumber: 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35;
  title: string;
  passed: boolean;
  detail: string;
}

export interface SharedIntelScenarios25To35Report {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  zeroPiiVerified: true;
  totalScenarios: number;
  passedScenarios: number;
  allPassed: boolean;
  scenarios: SharedIntelScenarioCheckItem[];
}

export interface SharedIntelFleetSnapshot {
  serviceStage: string;
  signingKeyId: string;
  signingPublicKeyPem: string;
  breakEventPersistence: 'encrypted_local_file' | 'in_memory';
  breakEventsRestartDurable: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  quorumRequired: number;
  fprRollbackThresholdPct: number;
  zeroPiiEnforced: true;
  rejectedSignatureCount: number;
  rejectedPiiCount: number;
  rateLimitedFloodCount: number;
  conflictHeldCount: number;
  rollbackCount: number;
  devices: FleetAttestedDeviceRecord[];
  bundles: FleetSignedBundleRecord[];
  recentObservations: FleetObservationResult[];
  auditTrail: SharedIntelAuditEntry[];
}

// --- Phase 5 Block 5.2: Per-Channel Break Duration ML Lower-Bound (p10/p5) Predictor & Calibration ---

export type BreakDaypart = 'morning' | 'daytime' | 'prime_time' | 'late_night';

export type BreakProgrammeGenre = 'news' | 'drama' | 'live_sport' | 'entertainment';

export interface BreakChannelPredictorProfile {
  channelNumber: number;
  channelName: string;
  broadcaster: string;
  scopeId: string;
  defaultSignalType: SharedIntelSignalType;
  baselineSampleCount: number;
  baselineP5Sec: number;
  baselineP10Sec: number;
  baselineP50Sec: number;
  baselineMeanSec: number;
  historicalBreaksSec: number[];
}

export interface BreakDurationPredictionRequest {
  channelNumber: number;
  daypart: BreakDaypart;
  programmeGenre: BreakProgrammeGenre;
  signalType: SharedIntelSignalType;
  elapsedBreakSec?: number;
  requestedAdDurationSec: number;
  switchingOverheadSec?: number;
  safetyBufferSeconds?: number;
  confidenceScore?: number;
  drmProtected?: boolean;
  observedHistoricalBreaksSec?: number[];
}

export type BreakPredictionDecision =
  | 'SCHEDULE_WITH_P10_BOUND'
  | 'SKIP_MEAN_UNSAFE_P10_SHORT'
  | 'SKIP_LOW_CONFIDENCE'
  | 'SKIP_DRM_PROTECTED';

export interface BreakDurationPredictionResult {
  channelNumber: number;
  channelName: string;
  scopeId: string;
  daypart: BreakDaypart;
  programmeGenre: BreakProgrammeGenre;
  signalType: SharedIntelSignalType;
  sampleCount: number;
  p5Sec: number;
  p10Sec: number;
  p50Sec: number;
  meanSec: number;
  stdDevSec: number;
  elapsedBreakSec: number;
  remainingP5Sec: number;
  remainingP10Sec: number;
  remainingMeanSec: number;
  switchingOverheadSec: number;
  safetyBufferSeconds: number;
  effectiveSafeWindowSec: number;
  requestedAdDurationSec: number;
  confidenceScore: number;
  safeToSchedule: boolean;
  wouldMeanOverestimate: boolean;
  decision: BreakPredictionDecision;
  decisionReason: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  predictedAt: string;
}

export interface RecordedStreamFixtureResult {
  fixtureId: string;
  title: string;
  channelNumber: number;
  daypart: BreakDaypart;
  programmeGenre: BreakProgrammeGenre;
  signalType: SharedIntelSignalType;
  groundTruthIsBreak: boolean;
  actualRemainingDurationSec: number;
  requestedAdDurationSec: number;
  predictedP5Sec: number;
  predictedP10Sec: number;
  predictedMeanSec: number;
  safeToScheduleDecision: boolean;
  falsePositiveTriggered: boolean;
  safeConservativeSkip: boolean;
  p10DidNotOverestimate: boolean;
  detectionLatencyMs: number;
  absErrorP10VsActualSec: number;
  passed: boolean;
  note: string;
}

export interface BreakCalibrationBenchmarkReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  totalFixtures: number;
  passedFixtures: number;
  allPassed: boolean;
  falsePositiveRatePct: number;
  falseNegativeSafeSkipRatePct: number;
  p10SafeContainmentRatePct: number;
  meanAbsoluteErrorSec: number;
  avgDetectionLatencyMs: number;
  fixtures: RecordedStreamFixtureResult[];
}

// --- Phase 6 Block 6.1: Advertising Delivery Infrastructure (Software-First CDN Preload, Frequency Caps & Event Ingestion) ---

export type DeliveryCdnEdgeStatus = 'primary_healthy' | 'secondary_failover' | 'degraded_offline_cache';

export interface DeliveryManifestItem {
  campaignId: string;
  creativeId: string | null;
  title: string;
  primaryCategory: PrimaryAdCategory;
  contentCategory: CampaignContentCategory;
  durationSeconds: number;
  dailyFrequencyCap: number;
  dailyImpressionsRecorded: number;
  remainingDailyCap: number;
  qrToken: string | null;
  preloadAssetUri: string;
  fallbackAssetUri: string;
  assetSha256: string;
  codecProfile: string;
  targetRegions: string[];
  estimatedValueUsd: number;
  charityZeroCostLocked: boolean;
}

export interface DeliveryExcludedCampaign {
  campaignId: string;
  title: string;
  reasonCode:
    | 'SKIP_STATUS_INELIGIBLE'
    | 'SKIP_SCHEDULE_WINDOW'
    | 'SKIP_REGION_MISMATCH'
    | 'SKIP_DAYPART_MISMATCH'
    | 'SKIP_FREQUENCY_CAP_REACHED'
    | 'SKIP_INCOMPATIBLE_DEVICE'
    | 'SKIP_EXPIRED_OR_INVALID_QR';
  detail: string;
}

export interface DeliveryPreloadManifestResult {
  manifestId: string;
  generatedAt: string;
  expiresAt: string;
  platformId: TvPlatformId;
  deviceSlotId: string;
  regionCode: string;
  daypart: DaypartSlot;
  cdnEdgeStatus: DeliveryCdnEdgeStatus;
  cdnMirrorOrigin: string;
  failClosedFallbackUsed: boolean;
  ordinaryTvPreserved: true;
  eligibleCount: number;
  excludedCount: number;
  manifestSha256: string;
  items: DeliveryManifestItem[];
  excluded: DeliveryExcludedCampaign[];
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  householdId?: string | null;
  consentEpoch?: number | null;
  adDeliverySuspended?: boolean;
  suspensionReason?: string | null;
}

export interface DeliveryEventIngestItem {
  idempotencyKey: string;
  deviceSlotId: string;
  campaignId: string;
  qrToken?: string | null;
  eventType: 'ad_requested' | 'ad_delivered' | 'ad_played' | 'ad_viewable';
  regionCode: string;
  playbackDurationMs: number;
  occurredAt?: string;
}

export interface DeliveryEventIngestResult {
  ok: boolean;
  processedAt: string;
  receivedCount: number;
  acceptedNewCount: number;
  deduplicatedReplayCount: number;
  rejectedAnomalyCount: number;
  rejectedReasons: string[];
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
}

export interface DeliveryInfraMetricsSnapshot {
  generatedAt: string;
  cdnEdgeStatus: DeliveryCdnEdgeStatus;
  manifestsCompiledTotal: number;
  failoverRecoveriesTotal: number;
  ingestedEventsAcceptedTotal: number;
  ingestedEventsDeduplicatedTotal: number;
  ingestedEventsRejectedAnomalyTotal: number;
  activeDeviceCapKeysCount: number;
  estimatedP95ManifestLatencyMs: number;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
}

export interface DeliveryInfraVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DeliveryInfraVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: DeliveryInfraVerifyCheckItem[];
}

// --- Phase 7 Block 7.1: Advertiser Management, Commercial Operations & Non-Transactional Billing Boundaries ---

export interface AdvertiserOnboardingReadiness {
  userId: string;
  businessOrTradingName: string;
  entityType: AdvertiserEntityType;
  verificationStatus: AccountVerificationStatus;
  countryCode: string;
  slaTier: 'standard_24h' | 'verified_priority_12h' | 'suspended_restricted';
  onboardingReady: boolean;
  commercialActivationAllowed: boolean;
  gates: {
    entityIdentityCompleted: boolean;
    taxOrRegistrationProvided: boolean;
    billingAndPrimaryContactsValid: boolean;
    activeSafeQrLinked: boolean;
    accountVerificationApproved: boolean;
    noRealPaymentActivated: true;
  };
  missingChecklist: string[];
  paymentCollectionActive: false;
}

export type CampaignPacingStatus =
  | 'on_pace'
  | 'under_pacing'
  | 'over_capped'
  | 'charity_free_unmetered'
  | 'window_inactive';

export interface CampaignPacingSnapshot {
  campaignId: string;
  title: string;
  status: CampaignStatus;
  primaryCategory: PrimaryAdCategory;
  contentCategory: CampaignContentCategory;
  pacingStatus: CampaignPacingStatus;
  elapsedSchedulePct: number;
  targetSpotsTotal: number;
  deliveredSpotsSimulated: number;
  remainingSpotsProjected: number;
  dailyFrequencyCap: number;
  recommendedSpotsPerDay: number;
  projectedRateCardUsd: number;
  charityZeroCostLocked: boolean;
  paymentCollectionActive: false;
}

export interface ProFormaInvoiceLineItem {
  campaignId: string;
  title: string;
  primaryCategory: PrimaryAdCategory;
  status: CampaignStatus;
  estimatedSpots: number;
  estimatedRatePerSpotUsd: number;
  projectedAmountUsd: number;
  charityZeroCostLocked: boolean;
  billingClassification: 'CHARITY_PERMANENT_ZERO' | 'SIMULATED_DIRECT_RATE_CARD';
}

export interface ProFormaInvoiceBlueprint {
  blueprintId: string;
  generatedAt: string;
  billingPeriodLabel: string;
  advertiserUserId: string;
  businessOrTradingName: string;
  billingContactName: string;
  billingContactEmail: string;
  currency: 'USD';
  invoiceStatus: 'SIMULATED_PRO_FORMA_ONLY';
  paymentCollectionActive: false;
  realPaymentGatewayConnected: false;
  actualCashChargedUsd: 0;
  commercialSubtotalUsd: number;
  charitySubtotalUsd: 0;
  totalProjectedRateCardUsd: number;
  blueprintSha256: string;
  lineItems: ProFormaInvoiceLineItem[];
  governanceNotice: string;
}

export type SupportSlaState = 'nominal' | 'approaching_sla' | 'sla_breached' | 'closed_resolved';

export interface SupportSlaTicketSummary {
  ticketId: string;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  slaTargetHours: number;
  elapsedHours: number;
  slaState: SupportSlaState;
}

export interface AdvertiserOpsOverviewSnapshot {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  paymentCollectionActive: false;
  automatedOutreachBlocked: true;
  hardwareTested: false;
  stageP6Deferred: true;
  onboarding: AdvertiserOnboardingReadiness;
  pacingSummary: {
    totalCampaigns: number;
    activeCampaigns: number;
    onPaceCount: number;
    underPacingCount: number;
    charityFreeCount: number;
    totalProjectedRateCardUsd: number;
    actualCashCollectedUsd: 0;
  };
  campaignPacing: CampaignPacingSnapshot[];
  supportSla: {
    openTicketsCount: number;
    approachingSlaCount: number;
    breachedSlaCount: number;
    tickets: SupportSlaTicketSummary[];
  };
}

export interface AdvertiserOpsVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AdvertiserOpsVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  paymentCollectionActive: false;
  hardwareTested: false;
  stageP6Deferred: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: AdvertiserOpsVerifyCheckItem[];
}

// --- Track B (DEC-OPEN-01 Locked): Household Registration, Multi-Profile, Personalisation, Bundled Consent & QR Revocation ---

export interface CountryGeoProvinceConfig {
  name: string;
  metroArea: string | null;
  cities: Array<{
    name: string;
    districts: Array<{
      name: string;
      suburbs: string[];
    }>;
  }>;
}

export interface CountryGeoConfig {
  countryCode: string;
  countryName: string;
  isReferenceTargetingProfile: boolean;
  countryActivated: false;
  metroAreasSupported: boolean;
  bundledWithdrawalEnforced: true;
  legalConsentBaseline: string;
  provinces: CountryGeoProvinceConfig[];
}

export interface HouseholdLocation {
  countryCode: string;
  provinceOrRegion: string;
  metroArea: string;
  cityOrTown: string;
  district: string;
  suburbOrArea: string;
  exactInstallationLocation: string;
}

export interface PublicHouseholdLocation {
  countryCode: string;
  provinceOrRegion: string;
  metroArea: string;
  cityOrTown: string;
  district: string;
  targetingKey: string;
  exactLocationRedacted: true;
}

export type HouseholdConsentStatus = 'granted' | 'withdrawn';

export type CharityDeliveryConsentState = 'active' | 'suspended_by_bundled_withdrawal';

export interface HouseholdInstallationRecord {
  id: string;
  ownerUserId: string;
  householdLabel: string;
  tvDeviceLabel: string;
  location: HouseholdLocation;
  locationValid: boolean;
  locationValidationErrors: string[];
  targetingDisabled: boolean;
  ordinaryTvPreserved: true;
  commercialConsentStatus: HouseholdConsentStatus;
  charityAndOpportunityStatus: CharityDeliveryConsentState;
  personalisationMasterEnabled: boolean;
  neutralDisplayMode: boolean;
  consentEpoch: number;
  consentVersionLabel: string;
  lastConsentChangedAt: string;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicHouseholdInstallationView {
  id: string;
  ownerUserId: string;
  householdLabel: string;
  tvDeviceLabel: string;
  publicLocation: PublicHouseholdLocation;
  locationValid: boolean;
  locationValidationErrors: string[];
  targetingDisabled: boolean;
  ordinaryTvPreserved: true;
  commercialConsentStatus: HouseholdConsentStatus;
  charityAndOpportunityStatus: CharityDeliveryConsentState;
  personalisationMasterEnabled: boolean;
  neutralDisplayMode: boolean;
  consentEpoch: number;
  consentVersionLabel: string;
  lastConsentChangedAt: string;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberProfile {
  id: string;
  householdId: string;
  ownerUserId: string;
  displayName: string;
  pinHash?: string | null;
  hasPinLock: boolean;
  personalisationConsentGranted: boolean;
  educationLevel: string;
  qualifications: string[];
  skills: string[];
  experienceSummary: string;
  experienceYears: number;
  occupationOrTrade: string;
  employmentInterests: string[];
  careerAspirations: string;
  industries: string[];
  interestedCategories: OpportunityCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityStructuredCriteria {
  requiredKeywords: string[];
  preferredKeywords: string[];
  optionalKeywords: string[];
  minExperienceYears?: number;
  targetProvinces?: string[];
  targetCities?: string[];
}

export interface HouseholdMatchMemberDetail {
  memberId: string;
  displayName: string;
  scorePct: number;
  requiredMet: string[];
  requiredMissing: string[];
  preferredMet: string[];
  optionalMatched: string[];
  eligible: boolean;
}

export interface TvBreakPersonalisationDisplay {
  mode: 'single_named' | 'multi_named' | 'neutral_shared' | 'suspended_no_consent';
  tvHeadline: string;
  tvSubline: string;
  namedRecipientsCount: number;
  privateDataExposed: false;
  ordinaryTvUsable: true;
}

export interface HouseholdOpportunityMatchResult {
  opportunityId: string;
  opportunityTitle: string;
  providerName: string;
  category: OpportunityCategory;
  locationLabel: string;
  closingDate: string;
  matchedCount: number;
  matchedMembers: HouseholdMatchMemberDetail[];
  excludedMembersCount: number;
  excludedReasons: string[];
  tvDisplay: TvBreakPersonalisationDisplay;
  guaranteeDisclaimer: string;
  baseQrToken: string | null;
}

export interface HouseholdQrTokenRecord {
  token: string;
  baseQrToken: string;
  householdId: string;
  opportunityId: string | null;
  campaignId: string | null;
  consentEpoch: number;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  resolvedCount: number;
  rejected403Count: number;
}

export type ConsentAuditAction =
  | 'CONSENT_GRANTED'
  | 'CONSENT_WITHDRAWN_BUNDLED'
  | 'CONSENT_RESTORED_EXPLICIT'
  | 'NEUTRAL_MODE_CHANGED'
  | 'MEMBER_CONSENT_UPDATED'
  | 'LOCATION_UPDATED'
  | 'QR_EPOCH_REVOKED_403'
  | 'BYPASS_ATTEMPT_BLOCKED';

export interface ConsentAuditEventRecord {
  id: string;
  householdId: string;
  actorId: string | null;
  actorRole: UserRole | 'anonymous' | 'system';
  action: ConsentAuditAction;
  previousEpoch: number;
  newEpoch: number;
  reason: string;
  affectedQrTokensInvalidated: number;
  ordinaryTvPreserved: true;
  createdAt: string;
}

export interface HouseholdQrRedirectPersistenceState {
  householdQrToken: HouseholdQrTokenRecord;
  household: HouseholdInstallationRecord | null;
  opportunity: OpportunityRecord | null;
  baseQrLink: QrLinkRecord | null;
}

export interface AdvertiserGeoAggregateRow {
  countryCode: string;
  provinceOrRegion: string;
  cityOrTown: string;
  targetingKey: string;
  consentedEligibleHouseholdsCount: number;
  activeTvSlotsCount: number;
  privateAddressesExposed: false;
  individualProfilesExposed: false;
}

export interface TrackBVerificationCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface TrackBVerificationReport {
  generatedAt: string;
  decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL';
  referenceTargetingCountryCode: 'ZW';
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: TrackBVerificationCheckItem[];
}

// --- Phase 8 Block 8.1: Advertisement Creation & Broadcast Rendering Validation (Software-First) ---

export type BroadcastQrIntegrityDecision =
  | 'PASS_MATCHED_OR_OVERLAY'
  | 'FLAG_ADMIN_HUMAN_REVIEW'
  | 'BLOCK_MISMATCH'
  | 'BLOCK_UNCONFIRMED_NO_QR'
  | 'WARN_NO_QR_ATTACHED';

export interface BroadcastTargetPlatformStatus {
  platformId: TvPlatformId;
  platformName: string;
  compatible: boolean;
  requiresTranscodeToH264Mp4: boolean;
  preferredProfile: string;
  reason: string;
}

export interface BroadcastSafeMarginIssue {
  elementId: string;
  label: string;
  issueType: 'title_safe_violation' | 'qr_overlap' | 'qr_too_small' | 'qr_missing';
  detail: string;
}

export interface BroadcastContrastDiagnostic {
  pairLabel: string;
  foregroundHex: string;
  backgroundHex: string;
  contrastRatio: number;
  requiredMinRatio: number;
  passed: boolean;
}

export interface BroadcastLoudnessSpec {
  targetStandard: 'EBU_R128_AND_ATSC_A85';
  targetIntegratedLufs: number;
  truePeakMaxDbtp: number;
  audioRequired: boolean;
  hasAudioTrack: boolean | null;
  loudnessNote: string;
}

export interface BroadcastRenderFrameElement {
  id: string;
  kind: string;
  label: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  fontSizePx1080p: number;
}

export interface BroadcastRenderFrameSpec {
  canvasWidthPx: 1920;
  canvasHeightPx: 1080;
  titleSafeInsetPct: 5;
  actionSafeInsetPct: 3.5;
  headlineScalePx: number;
  bodyScalePx: number;
  qrQuietZonePct: number;
  elements: BroadcastRenderFrameElement[];
}

export interface BroadcastRenderBlueprint {
  blueprintId: string;
  creativeId: string;
  generatedAt: string;
  outputProfile: string;
  ffmpegWorkerConnected: false;
  simulatedTranscodeCommand: string;
  renderSpecSha256: string;
  frameSpec: BroadcastRenderFrameSpec;
}

export interface BroadcastRenderValidationReport {
  creativeId: string;
  creativeTitle: string;
  mode: AdStudioMode;
  evaluatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  ffmpegWorkerConnected: false;
  broadcastReady: boolean;
  requiresAdminReview: boolean;
  blockingReasons: string[];
  warnings: string[];
  resolutionLabel: string;
  aspectRatioValid: boolean;
  durationSeconds: number;
  durationValid: boolean;
  contrastDiagnostics: BroadcastContrastDiagnostic[];
  safeMarginIssues: BroadcastSafeMarginIssue[];
  qrIntegrityDecision: BroadcastQrIntegrityDecision;
  loudnessSpec: BroadcastLoudnessSpec;
  platformMatrix: BroadcastTargetPlatformStatus[];
  renderBlueprint: BroadcastRenderBlueprint;
}

export interface BroadcastRenderOverviewSnapshot {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  ffmpegWorkerConnected: false;
  totalCreatives: number;
  broadcastReadyCount: number;
  flaggedForReviewCount: number;
  blockedCount: number;
  items: BroadcastRenderValidationReport[];
}

export interface BroadcastRenderVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface BroadcastRenderVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  ffmpegWorkerConnected?: false;
  ffmpegBinaryExecuted?: false;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: BroadcastRenderVerifyCheckItem[];
}

export type BroadcastResolutionProfile = '1080p_fhd' | '4k_uhd';

export interface BroadcastValidationIssue {
  code: string;
  severity: 'blocking' | 'warning';
  message: string;
}

export interface PlatformRenderTarget {
  platformId: TvPlatformId;
  targetVideoCodec: string;
  targetContainer: string;
  maxVideoBitrateKbps: number;
  audioProfile: string;
  transcodeRequired: boolean;
  notes: string;
}

export interface BroadcastRenderJobResult {
  renderJobId: string;
  generatedAt: string;
  creativeId: string;
  creativeTitle: string;
  creativeMode: AdStudioMode;
  resolutionProfile: BroadcastResolutionProfile;
  targetDimensions: {
    width: 1920 | 3840;
    height: 1080 | 2160;
    aspectRatio: '16:9';
  };
  renderStatus: 'RENDER_BLUEPRINT_VERIFIED' | 'BLOCKED_FAILED_VALIDATION';
  ffmpegBinaryExecuted: false;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  durationSeconds: number;
  contrastRatio: number | null;
  safeMarginPassed: boolean;
  qrVisionGate: {
    passed: boolean;
    qrToken: string | null;
    inspectionStatus: string;
    resolvedUrl: string | null;
    silentOverwriteBlocked: true;
  };
  audioLoudnessSpec: {
    hasAudioTrack: boolean;
    standard: 'ITU-R BS.1770-4 / EBU R128' | 'SILENT_VIDEO_LESS_CARD';
    targetIntegratedLufs: number | null;
    maxTruePeakDbtp: number | null;
    filterExpression: string;
  };
  platformTargets: PlatformRenderTarget[];
  issues: BroadcastValidationIssue[];
  blockingIssuesCount: number;
  warningIssuesCount: number;
  manifestSha256: string;
  ffmpegFilterGraphSpec: string;
}

// --- Phase 9 Block 9.1: Opportunity Verification Operations Hardening ---

export type OpportunityEvidenceTierKey =
  | 'tier1_identity'
  | 'tier2_organisation'
  | 'tier3_specific_opportunity';

export interface OpportunityVaultSealRecord {
  opportunityId: string;
  tier: OpportunityEvidenceTierKey;
  tierStatus: OpportunityTierStatus;
  verifiedAt: string | null;
  redactedRef: string;
  vaultSealSha256: string;
  encryptionEnvelope: {
    algorithm: 'AES-256-GCM';
    keyAlias: 'edison-opp-vault-v1';
    sealedInSoftwareBlueprint: true;
  };
  staleOrExpired: boolean;
}

export interface OpportunityVerificationAssessment {
  opportunityId: string;
  title: string;
  providerType: OpportunityProviderType;
  status: OpportunityStatus;
  closingDate: string;
  expiryDate: string;
  eligibleForTvSchedule: boolean;
  expiredByDate: boolean;
  reverificationRequired: boolean;
  reverificationReasons: string[];
  feeIndependenceVerified: boolean;
  nonTransitivityVerified: boolean;
  riskFlags: string[];
  vaultSeals: OpportunityVaultSealRecord[];
  openComplaintsCount: number;
  criticalComplaintsCount: number;
  recommendImmediateSuspension: boolean;
}

export interface OpportunityOpsSlaItem {
  itemType: 'complaint' | 'appeal';
  id: string;
  opportunityId: string;
  status: string;
  categoryOrReason: string;
  slaHoursTarget: number;
  elapsedHours: number;
  slaBreached: boolean;
  createdAt: string;
}

export interface OpportunityOpsOverview {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  externalKycVendorConnected: false;
  hardwareTested: false;
  stageP6Deferred: true;
  automatedOutreachBlocked: true;
  advertisingFeeInfluencesVerification: false;
  summary: {
    totalEvaluated: number;
    verifiedLiveCount: number;
    eligibleForTvCount: number;
    reverificationRequiredCount: number;
    expiredCount: number;
    feeIndependenceViolations: number;
    nonTransitivityViolations: number;
    openComplaintsCount: number;
    slaBreachedComplaintsCount: number;
    openAppealsCount: number;
    slaBreachedAppealsCount: number;
    immediateSuspensionRecommendedCount: number;
  };
  assessments: OpportunityVerificationAssessment[];
  slaItems: OpportunityOpsSlaItem[];
}

export interface OpportunityOpsSweepResult {
  sweepId: string;
  executedAt: string;
  notes: string;
  evidenceSealsVerifiedCount: number;
  expiredTransitionedCount: number;
  flaggedForReverificationCount: number;
  feeIndependenceVerified: boolean;
  nonTransitivityVerified: boolean;
  overview: OpportunityOpsOverview;
}

export interface OpportunityOpsVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface OpportunityOpsVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  externalKycVendorConnected: false;
  advertisingFeeInfluencesVerification: false;
  hardwareTested: false;
  stageP6Deferred: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: OpportunityOpsVerifyCheckItem[];
}

// --- Phase 10 Block 10.1: Privacy, Security & Statutory Compliance Readiness ---

export interface CountryStatutoryComplianceRecord {
  countryCode: string;
  countryName: string;
  isReferenceTargetingProfile: boolean;
  countryActivated: false;
  legalComplianceClaimed: false;
  statutesResearched: string[];
  enforcedTechnicalControls: {
    bundledConsentWithdrawal: true;
    epoch403QrRevocation: true;
    zeroApplicantFeesEnforced: true;
    piiRedactedFromTvAndUrls: true;
    externalSignalIntegrityProhibited: true;
    cameraMicAttentionTrackingDisabled: true;
  };
  unresolvedRegulatoryUncertainties: string[];
}

export interface PrivacyDsrExportPackage {
  exportId: string;
  generatedAt: string;
  householdId: string;
  exportFormat: 'json_dsr_v1';
  pinHashesRedacted: true;
  packageSha256: string;
  household: PublicHouseholdInstallationView;
  members: Array<Omit<HouseholdMemberProfile, 'pinHash'> & { hasPinSet: boolean }>;
  householdQrTokens: HouseholdQrTokenRecord[];
  consentAuditEvents: ConsentAuditEventRecord[];
}

export interface PrivacyDsrErasureResult {
  erasureId: string;
  executedAt: string;
  householdId: string;
  previousEpoch: number;
  newEpoch: number;
  membersAnonymisedCount: number;
  qrTokensRevokedCount: number;
  ordinaryTvPreserved: true;
  commercialConsentStatus: HouseholdConsentStatus;
  charityAndOpportunityStatus: CharityDeliveryConsentState;
  tombstoneSha256: string;
}

export interface PrivacyComplianceOverview {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  externalPenTestCompleted: false;
  hardwareTested: false;
  stageP6Deferred: true;
  legalComplianceClaimed: false;
  cameraMicAttentionTrackingEnabled: false;
  posture: {
    decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL';
    totalHouseholdsEvaluated: number;
    withdrawnOrErasedHouseholds: number;
    activeSessionsCount: number;
    expiredSessionsPendingPurge: number;
    staleExpiredQrTokensPendingPurge: number;
    analyticsZeroPiiVerified: boolean;
    piiLeaksDetectedInAnalytics: number;
  };
  countries: CountryStatutoryComplianceRecord[];
}

export interface PrivacyRetentionReport {
  sweepId: string;
  executedAt: string;
  expiredSessionsPurged: number;
  staleExpiredQrTokensPurged: number;
  piiLeaksDetectedInAnalytics: number;
  cameraMicAttentionTrackingEnabled: false;
  retentionPolicyWindows: {
    sessionMaxIdleHours: number;
    expiredHouseholdQrRetentionDays: number;
    auditLogRetentionDays: number;
  };
}

export interface PrivacyComplianceVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PrivacyComplianceVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  externalPenTestCompleted: false;
  legalComplianceClaimed: false;
  cameraMicAttentionTrackingEnabled: false;
  hardwareTested: false;
  stageP6Deferred: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: PrivacyComplianceVerifyCheckItem[];
}

// --- Phase 11 Block 11.1: Reliability, Failure-Mode & Chaos Recovery Suite ---

export type FailureModeId =
  | 'FM-01'
  | 'FM-02'
  | 'FM-03'
  | 'FM-04'
  | 'FM-05'
  | 'FM-06'
  | 'FM-07'
  | 'FM-08'
  | 'FM-09'
  | 'FM-10'
  | 'FM-11'
  | 'FM-12'
  | 'FM-13'
  | 'FM-14'
  | 'FM-15'
  | 'FM-16'
  | 'FM-17'
  | 'FM-18';

export type FailureModeCategory =
  | 'transport_network'
  | 'tv_playback_watchdog'
  | 'trust_safety_data'
  | 'consent_analytics';

export type ChaosInjectSeverity = 'standard' | 'extreme';

export interface ChaosScenarioResult {
  failureModeId: FailureModeId;
  title: string;
  category: FailureModeCategory;
  verificationStageRef: string;
  severity: ChaosInjectSeverity;
  trigger: string;
  injectDetail: string;
  expectedFailSafe: string;
  observedOutcome: string;
  passed: boolean;
  ordinaryTvPreserved: boolean;
  viewerStuckOffLiveTv: boolean;
  adSkippedOrAbortedSafely: boolean;
  watchdogTriggered: boolean;
  recoveryLatencyMs: number;
  executedAt: string;
}

export interface ReliabilityChaosReport {
  reportId: string;
  executedAt: string;
  executedByEmail: string;
  notes?: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  totalFailureModes: 18;
  passedFailureModes: number;
  failedFailureModes: number;
  all18Passed: boolean;
  ordinaryTvPreservedAll: boolean;
  zeroStuckOffLiveTv: boolean;
  maxRecoveryLatencyMs: number;
  reportSha256: string;
  results: ChaosScenarioResult[];
}

export interface ReliabilityChaosOverview {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  totalDocumentedFailureModes: 18;
  coveredFailureModeIds: FailureModeId[];
  lastChaosRun: ReliabilityChaosReport | null;
  domainSummaries: Array<{
    category: FailureModeCategory;
    label: string;
    modeIds: FailureModeId[];
    lastPassedCount: number;
    totalCount: number;
  }>;
  hardInvariants: {
    ordinaryTvPreservedGuarantee: true;
    skipBreakWhenUncertain: true;
    dualWatchdogReturnTimeoutMs: number;
    maxSwitchAckLatencyMs: number;
    paymentCollectionActive: false;
  };
}

export interface ReliabilityChaosVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ReliabilityChaosVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: ReliabilityChaosVerifyCheckItem[];
}

// --- Phase 12 Block 12.1: Controlled Hardware & Viewer Pilot Readiness (Software-First) & Stage P6 Runbook ---

export type PilotTargetArchitectureId =
  | 'opt_in_viewer_prompt'
  | 'android_tv_tif'
  | 'external_hdmi_cec'
  | 'samsung_tizen_partner'
  | 'lg_webos_partner';

export type PilotCohortStatus =
  | 'draft_blueprint'
  | 'ready_for_stage_p6'
  | 'suspended_consent_withdrawn';

export type StageP6StepId =
  | 'P6-01'
  | 'P6-02'
  | 'P6-03'
  | 'P6-04'
  | 'P6-05'
  | 'P6-06'
  | 'P6-07'
  | 'P6-08';

export type StageP6PreflightStatus = 'software_preflight_ready' | 'deferred_pending_stage_p6';

export interface PilotTargetArchitectureProfile {
  architectureId: PilotTargetArchitectureId;
  label: string;
  architectureTier: 'Recommended Initial Pilot' | 'Arch A (Permitted Session)' | 'Arch C (Companion Hardware)' | 'Arch B (OEM Partnership)';
  requiresOemPartnerContract: boolean;
  thirdPartyChannelHijackAllowed: false;
  hardwareTested: false;
  physicalPilotExecuted: false;
  keyConstraints: string;
  telemetryScopeNote: string;
}

export interface PilotSoftwareGateItem {
  gateId: string;
  phaseRef: string;
  label: string;
  ready: boolean;
  detail: string;
}

export interface StageP6RunbookStep {
  stepId: StageP6StepId;
  title: string;
  hardwareScope: 'Smart TV + Mobile Phone' | 'Smart TV Hardware' | 'Smartphone Camera + Redirect';
  prerequisites: string;
  executionProcedure: string;
  passCriteria: string;
  preflightStatus: StageP6PreflightStatus;
  hardwareExecuted: false;
  ownerPrepNote: string | null;
}

export interface PilotCohortBlueprintRecord {
  id: string;
  cohortName: string;
  targetCountryCode: string;
  targetArchitectureId: PilotTargetArchitectureId;
  maxHouseholdsCap: number;
  enrolledHouseholdIds: string[];
  decOpen02ShortBreakRuleAcknowledged: boolean;
  decOpen03GamMockOnlyAcknowledged: boolean;
  status: PilotCohortStatus;
  countryActivated: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  zeroPiiTelemetryEnforced: true;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  cohortSha256: string;
}

export interface PilotTelemetryValidationResult {
  valid: boolean;
  acceptedForPilotSchema: boolean;
  rejectedReasons: string[];
  piiDetectedFields: string[];
  consentValid: boolean;
  ordinaryTvPreserved: boolean;
  forgedHardwareClaimBlocked: boolean;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  stageP6Deferred: true;
  sanitisedTelemetrySample: {
    cohortId: string;
    regionCode: string;
    architectureId: PilotTargetArchitectureId;
    consentEpoch: number;
    switchLatencyMs: number;
    returnToLiveTvMs: number;
    qrScanObservedMs: number | null;
    ordinaryTvPreserved: boolean;
    payloadSha256: string;
  } | null;
  evaluatedAt: string;
}

export interface PilotReadinessOverview {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  countryActivated: false;
  paymentCollectionActive: false;
  externalKycVendorConnected: false;
  externalPenTestCompleted: false;
  legalComplianceClaimed: false;
  ffmpegBinaryExecuted: false;
  softwareGatesReadyCount: number;
  softwareGatesTotalCount: number;
  allSoftwareGatesReady: boolean;
  softwareGates: PilotSoftwareGateItem[];
  targetArchitectures: PilotTargetArchitectureProfile[];
  stageP6Runbook: StageP6RunbookStep[];
  cohorts: PilotCohortBlueprintRecord[];
  openDecisionsSummary: {
    decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL';
    decOpen02Note: string;
    decOpen03Note: string;
    taskP3001Status: 'READY_JSON_RETAINED';
  };
  readinessManifestSha256: string;
}

export interface PilotReadinessVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PilotReadinessVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  countryActivated: false;
  paymentCollectionActive: false;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: PilotReadinessVerifyCheckItem[];
}

// --- Phase 13 Block 13.1: Commercial Readiness Board Gate, SLA Matrix & Unit Economics (Software-First) ---

export type CommercialReadinessPillarId =
  | 'technical_readiness'
  | 'operational_readiness'
  | 'security_privacy'
  | 'legal_regulatory'
  | 'advertiser_onboarding'
  | 'customer_support'
  | 'revenue_model_charity_lock'
  | 'infrastructure_unit_economics'
  | 'reliability_live_tv'
  | 'pilot_hardware_evidence';

export type CommercialGateStatus = 'software_ready' | 'blocked_pending_external_gate';

export interface CommercialPillarAssessment {
  pillarId: CommercialReadinessPillarId;
  categoryLabel: string;
  title: string;
  gateStatus: CommercialGateStatus;
  softwareVerified: boolean;
  liveExecutionVerified: false | boolean;
  evidenceSummary: string;
  blockingDependency: string | null;
}

export interface ProductionSlaTarget {
  slaId: string;
  serviceDomain: string;
  metric: string;
  targetThreshold: string;
  measurementSource: string;
  escalationOwner: string;
  currentSoftwareStatus: 'verified_in_simulation' | 'baseline_defined';
}

export interface CommercialCostAssumptionsInput {
  activeHouseholdsEstimate: number;
  monthlyCommercialBreaksPerHousehold: number;
  estimatedDirectCampaignsCount: number;
  cdnEgressCostPerGbUsd: number;
  dbHostingTierMonthlyUsd: number;
  supportAgentHeadcount: number;
  moderationHoursPerWeek: number;
}

export interface CommercialUnitEconomicsSnapshot {
  assumptions: CommercialCostAssumptionsInput;
  estimatedMonthlyCommercialImpressions: number;
  estimatedMonthlyCharityImpressions: number;
  estimatedMonthlyCloudCostUsd: number;
  estimatedSupportOpsCostUsd: number;
  estimatedTotalMonthlyOpexUsd: number;
  costPerThousandAdDeliveriesUsd: number;
  charityListingFeeUsd: 0;
  charityJobFeeLockEnforced: true;
  estimatedRevenuePerDirectCampaignRequiredUsd: number;
  paymentCollectionActive: false;
  isSimulatedBudgetModel: true;
  costModelSha256: string;
}

export type CommercialBoardDecisionOutcome =
  | 'hold_software_ready_pending_external_gates'
  | 'defer_pending_stage_p6_and_compliance';

export interface CommercialBoardDecisionRecord {
  id: string;
  boardReviewerEmail: string;
  decisionOutcome: CommercialBoardDecisionOutcome;
  summaryNote: string;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  countryActivated: false;
  hardwareTested: false;
  boardDecisionSha256: string;
  createdAt: string;
}

export interface CommercialReadinessOverview {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  countryActivated: false;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  realBroadcastTunerConnected: false;
  externalKycVendorConnected: false;
  externalPenTestCompleted: false;
  legalComplianceClaimed: false;
  ffmpegBinaryExecuted: false;
  charityListingFeeUsd: 0;
  charityJobFeeLockEnforced: true;
  softwarePillarsReadyCount: number;
  pillarsTotalCount: number;
  blockedExternalPillarsCount: number;
  pillars: CommercialPillarAssessment[];
  productionSlaTargets: ProductionSlaTarget[];
  unitEconomics: CommercialUnitEconomicsSnapshot;
  boardDecisions: CommercialBoardDecisionRecord[];
  launchBlockersSummary: string[];
  commercialReadinessSha256: string;
}

export interface CommercialReadinessVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CommercialReadinessVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  countryActivated: false;
  hardwareTested: false;
  stageP6Deferred: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: CommercialReadinessVerifyCheckItem[];
}

// --- Legacy jurisdiction reference and policy data; not a product-release control ---

export type TargetingGeographyCode = 'ZW' | 'GB' | 'EU' | 'US' | 'ZA' | 'KE_NG';

export type CountryLaunchReadinessGateStatus =
  | 'software_controls_verified_awaiting_external_clearances';

export interface CountryLaunchPreflightItem {
  gateId: string;
  label: string;
  scope: 'software_control' | 'external_hardware_or_statutory';
  passed: boolean;
  detail: string;
}

export interface CountryJurisdictionPolicyConfig {
  countryCode: TargetingGeographyCode;
  consentBannerStrictMode: boolean;
  requirePreBroadcastHumanModeration: boolean;
  jobFeeZeroLockEnforced: true;
  prohibitExternalSignalHijack: true;
  redactHouseholdGeoFromAdvertisers: true;
  enforceVppsOrLocalPrivacyLock: boolean;
  operatorTaxNoticeLabel: string;
  updatedAt: string;
  updatedByEmail: string;
}

export interface CountryLaunchAssessment {
  countryCode: TargetingGeographyCode;
  countryName: string;
  isReferenceTargetingProfile: boolean;
  countryActivated: false;
  legalComplianceClaimed: false;
  gateStatus: CountryLaunchReadinessGateStatus;
  softwareGatesReadyCount: number;
  softwareGatesTotalCount: number;
  externalClearancesBlockedCount: number;
  statutesResearched: string[];
  unresolvedRegulatoryUncertainties: string[];
  policyConfig: CountryJurisdictionPolicyConfig;
  preflightChecks: CountryLaunchPreflightItem[];
  liveSeedCoverage: {
    householdsInMarket: number;
    campaignsTargetingMarket: number;
    verifiedLiveOpportunities: number;
  };
  activationBlockers: string[];
  assessmentSha256: string;
}

export type CountryLaunchDecisionOutcome =
  | 'hold_country_unactivated_pending_clearances'
  | 'stage_software_ready_for_stage_p6_and_filing';

export interface CountryLaunchDecisionRecord {
  id: string;
  countryCode: TargetingGeographyCode;
  reviewerEmail: string;
  decisionOutcome: CountryLaunchDecisionOutcome;
  summaryNote: string;
  countryActivated: false;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  legalComplianceClaimed: false;
  decisionSha256: string;
  createdAt: string;
}

export interface CountryLaunchOverview {
  generatedAt: string;
  referenceTargetingCountryCode: 'ZW';
  activeLaunchedMarketsCount: 0;
  totalInventoriedMarketsCount: 6;
  softwareReadyMarketsCount: number;
  isSoftwareSimulationOnly: true;
  countryActivated: false;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  externalPenTestCompleted: false;
  externalKycVendorConnected: false;
  legalComplianceClaimed: false;
  charityListingFeeUsd: 0;
  charityJobFeeLockEnforced: true;
  countries: CountryLaunchAssessment[];
  launchDecisions: CountryLaunchDecisionRecord[];
  releaseReadinessBlockers: string[];
  manifestSha256: string;
}

export interface CountryLaunchVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CountryLaunchVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  countryActivated: false;
  activeLaunchedMarketsCount: 0;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  stageP6Deferred: true;
  legalComplianceClaimed: false;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: CountryLaunchVerifyCheckItem[];
}

// --- Phase 15 Block 15.1: International Multi-Region Expansion, Localization & Residency Architecture (Software-First) ---

export type ExpansionRegionId =
  | 'africa_south_zw_za'
  | 'europe_uk_eu'
  | 'africa_east_west_ke_ng'
  | 'north_america_us';

export type ExpansionCurrencyCode = 'USD' | 'ZWG' | 'GBP' | 'EUR' | 'ZAR' | 'KES' | 'NGN';

export interface RegionalLocalizationConfig {
  regionId: ExpansionRegionId;
  primaryLanguageCode: string;
  supportedLanguageCodes: string[];
  captionAccessibilityStandard: string;
  multiCurrencyCode: ExpansionCurrencyCode;
  proFormaCpmRateLocal: number;
  dataResidencyZone: string;
  prohibitCrossBorderPiiTransfer: true;
  charityZeroCostLocked: true;
  updatedAt: string;
  updatedByEmail: string;
}

export interface ExpansionPreflightItem {
  gateId: string;
  label: string;
  scope: 'software_architecture' | 'external_rollout_or_acquirer';
  passed: boolean;
  detail: string;
}

export interface InternationalRegionProfileAssessment {
  regionId: ExpansionRegionId;
  regionName: string;
  targetMarketCodes: TargetingGeographyCode[];
  sovereignResidencyZone: string;
  cdnEdgeClusterTarget: string;
  regionalExpansionActive: false;
  localizationConfig: RegionalLocalizationConfig;
  proFormaCpmRateUsd: number;
  charityListingFeeLocal: 0;
  softwareGatesReadyCount: number;
  softwareGatesTotalCount: number;
  externalClearancesBlockedCount: number;
  preflightChecks: ExpansionPreflightItem[];
  blockers: string[];
  assessmentSha256: string;
}

export interface MultiCurrencyProFormaEstimate {
  regionId: ExpansionRegionId;
  currencyCode: ExpansionCurrencyCode;
  fxReferenceRateToUsd: number;
  fxAssumptionNote: string;
  directCommercialImpressions: number;
  proFormaCpmRateLocal: number;
  commercialGrossLocal: number;
  commercialGrossUsd: number;
  charityImpressions: number;
  charityCostLocal: 0;
  charityCostUsd: 0;
  charityZeroCostLocked: true;
  paymentCollectionActive: false;
  isSimulatedEstimateOnly: true;
  estimateSha256: string;
  generatedAt: string;
}

export type InternationalExpansionDecisionOutcome =
  | 'hold_regions_unactivated_pending_p6_and_p14'
  | 'stage_multi_region_blueprint_for_post_launch';

export interface InternationalExpansionDecisionRecord {
  id: string;
  regionId: ExpansionRegionId;
  reviewerEmail: string;
  decisionOutcome: InternationalExpansionDecisionOutcome;
  summaryNote: string;
  regionalExpansionActive: false;
  countryActivated: false;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  legalComplianceClaimed: false;
  decisionSha256: string;
  createdAt: string;
}

export interface InternationalExpansionOverview {
  generatedAt: string;
  primaryTargetingReferenceRegion: 'africa_south_zw_za';
  activeExpandedRegionsCount: 0;
  totalRegionsInventoriedCount: 4;
  softwareReadyRegionsCount: number;
  supportedLanguagesTotalCount: number;
  supportedCurrenciesCount: 7;
  isSoftwareSimulationOnly: true;
  regionalExpansionActive: false;
  countryActivated: false;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  pilotHardwareExecuted: false;
  stageP6Deferred: true;
  legalComplianceClaimed: false;
  prohibitCrossBorderPiiTransfer: true;
  charityListingFeeUsd: 0;
  charityJobFeeLockEnforced: true;
  regions: InternationalRegionProfileAssessment[];
  expansionDecisions: InternationalExpansionDecisionRecord[];
  targetingAndReadinessCaveats: string[];
  manifestSha256: string;
}

export interface InternationalExpansionVerifyCheckItem {
  checkId: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface InternationalExpansionVerificationReport {
  generatedAt: string;
  isSoftwareSimulationOnly: true;
  regionalExpansionActive: false;
  activeExpandedRegionsCount: 0;
  countryActivated: false;
  commercialLaunchAuthorized: false;
  paymentCollectionActive: false;
  hardwareTested: false;
  stageP6Deferred: true;
  legalComplianceClaimed: false;
  prohibitCrossBorderPiiTransfer: true;
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  checks: InternationalExpansionVerifyCheckItem[];
}
