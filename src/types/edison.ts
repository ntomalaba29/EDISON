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
  token: string;
  userId: string;
  role: UserRole;
  createdAt: string;
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

export type DaypartSlot = 'morning' | 'daytime' | 'primetime' | 'late_night' | 'all_day';

export interface BillingEstimateSummary {
  model: 'simulated_cpm_flat_rate';
  currency: 'USD';
  estimatedSpots: number;
  estimatedRatePerSpotUsd: number;
  estimatedTotalUsd: number;
  paymentCollectionActive: false;
  disclaimer: string;
}

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

export type AdStudioMode = 'option_a_studio' | 'option_b_upload';

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
  status: AdCreativeStatus;
  isPrototypeSeed: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface OpportunityVerificationTiers {
  identityVerified: boolean;
  organisationVerified: boolean;
  specificOpportunityVerified: boolean;
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
  | 'verified_conversion';

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
    | 'system';
  targetId: string;
  detail: string;
  createdAt: string;
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
  analyticsEvents: AnalyticsEventRecord[];
  auditLogs: AuditLogRecord[];
}

export interface LiveReportSnapshot {
  generatedAt: string;
  phase: string;
  stage: string;
  block: string;
  gateStatus: string;
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
    redirectRequestsTotal: number;
    redirectIssuedTotal: number;
    suspectedBotRedirects: number;
    verifiedDestinationOpens: number;
    auditLogCount: number;
    storagePath: string;
  };
}
