import { z } from 'zod';
import {
  ALL_CAMPAIGN_STATUSES,
  ALL_OPPORTUNITY_CATEGORIES,
} from './store.ts';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const registerSchema = z
  .object({
    email: z.string().trim().email('Provide a valid email address.').max(160),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be at most 128 characters.'),
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be at most 120 characters.'),
    organisationName: z.string().trim().max(160).optional().default(''),
    role: z.enum(['advertiser', 'opportunity_submitter', 'household_viewer'], {
      message:
        'Self-registration role must be "advertiser", "opportunity_submitter", or "household_viewer". Admin accounts cannot be self-registered.',
    }),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email('Valid email is required.').max(160),
    password: z.string().min(1, 'Email and password are required.').max(200),
  })
  .strict();

export const mediaUploadSchema = z
  .object({
    dataBase64: z.string().trim().min(1, 'dataBase64 payload is required.'),
    declaredKind: z.enum(['image', 'video', 'any']).optional().default('any'),
  })
  .strict();

export const qrDestinationTypeEnum = z.enum([
  'website',
  'product',
  'store',
  'whatsapp',
  'telephone',
  'enquiry',
  'job_application',
  'scholarship',
  'training',
  'grant_tender',
  'other',
]);

export const qrValidateSchema = z
  .object({
    rawInput: z.string({ message: 'rawInput string is required.' }).max(2048),
    destinationType: qrDestinationTypeEnum.optional().default('website'),
  })
  .strict();

export const qrCreateSchema = z
  .object({
    label: z.string().trim().max(120).optional().default(''),
    destinationType: qrDestinationTypeEnum.optional().default('website'),
    rawInput: z.string({ message: 'rawInput is required.' }).trim().min(1, 'rawInput is required.').max(2048),
  })
  .strict();

export const qrStatusPatchSchema = z
  .object({
    status: z.enum(['active', 'disabled', 'flagged'], {
      message: 'Invalid status. Must be active, disabled, or flagged.',
    }),
  })
  .strict();

export const advertiserProfilePutSchema = z
  .object({
    entityType: z.enum(['registered_business', 'individual_sole_trader', 'public_ngo'], {
      message:
        'Invalid entityType. Must be registered_business, individual_sole_trader, or public_ngo.',
    }),
    businessOrTradingName: z.string().trim().max(160).optional().default(''),
    registrationOrTaxId: z.string().trim().max(80).optional().default(''),
    industryCategory: z.string().trim().max(100).optional().default(''),
    countryCode: z.string().trim().min(2).max(12).optional().default('GB'),
    cityRegion: z.string().trim().max(120).optional().default(''),
    physicalAddress: z.string().trim().max(300).optional().default(''),
    primaryContactName: z.string().trim().max(120).optional().default(''),
    primaryContactEmail: z.string().trim().max(160).optional().default(''),
    primaryContactPhone: z.string().trim().max(60).optional().default(''),
    billingContactName: z.string().trim().max(120).optional().default(''),
    billingContactEmail: z.string().trim().max(160).optional().default(''),
    websiteUrl: z.string().trim().max(300).optional().default(''),
    requestVerification: z.boolean().optional().default(false),
  })
  .strict();

export const adminVerifyProfileSchema = z
  .object({
    status: z.enum(['unverified', 'pending_review', 'verified', 'suspended'], {
      message: 'Invalid verification status.',
    }),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .strict();

export const daypartSlotEnum = z.enum(['morning', 'daytime', 'primetime', 'late_night', 'all_day']);

export const campaignQuerySchema = z.object({
  status: z
    .union([z.literal('all'), z.enum(ALL_CAMPAIGN_STATUSES)])
    .optional()
    .default('all'),
});

export const campaignCreateSchema = z
  .object({
    title: z.string().trim().min(1, 'Campaign title is required.').max(180),
    contentCategory: z.enum(['commercial_advertising', 'opportunity_promotion'], {
      message: 'contentCategory must be commercial_advertising or opportunity_promotion.',
    }),
    summary: z.string().trim().max(1500).optional().default(''),
    qrToken: z.string().trim().max(120).nullable().optional().default(null),
    durationSeconds: z.coerce.number().int().min(5).max(120).optional().default(30),
    dailyFrequencyCap: z.coerce.number().int().min(1).max(200).optional().default(4),
    targetRegions: z
      .union([z.array(z.string().trim().min(1).max(120)).min(1).max(50), z.string().trim().min(1).max(1000)])
      .optional()
      .default(['United Kingdom · National']),
    dayparts: z.array(daypartSlotEnum).min(1).max(5).optional().default(['daytime']),
    startDate: z.string().trim().regex(ISO_DATE_RE, 'startDate must be YYYY-MM-DD.').optional().default(''),
    endDate: z.string().trim().regex(ISO_DATE_RE, 'endDate must be YYYY-MM-DD.').optional().default(''),
  })
  .strict();

export const campaignUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    contentCategory: z.enum(['commercial_advertising', 'opportunity_promotion']).optional(),
    summary: z.string().trim().max(1500).optional(),
    qrToken: z.string().trim().max(120).nullable().optional(),
    durationSeconds: z.coerce.number().int().min(5).max(120).optional(),
    dailyFrequencyCap: z.coerce.number().int().min(1).max(200).optional(),
    targetRegions: z
      .union([z.array(z.string().trim().min(1).max(120)).min(1).max(50), z.string().trim().min(1).max(1000)])
      .optional(),
    dayparts: z.array(daypartSlotEnum).min(1).max(5).optional(),
    startDate: z.string().trim().regex(ISO_DATE_RE, 'startDate must be YYYY-MM-DD.').optional(),
    endDate: z.string().trim().regex(ISO_DATE_RE, 'endDate must be YYYY-MM-DD.').optional(),
  })
  .strict();

export const campaignTransitionSchema = z
  .object({
    targetStatus: z.enum(ALL_CAMPAIGN_STATUSES, { message: 'Invalid targetStatus.' }),
    rejectionReason: z.string().trim().max(1000).optional(),
    fixInstructions: z.string().trim().max(1000).optional(),
  })
  .strict();

export const simulatorEventSchema = z
  .object({
    campaignId: z.string().trim().max(120).nullable().optional(),
    qrToken: z.string().trim().max(120).nullable().optional(),
    eventType: z.enum(
      [
        'ad_requested',
        'ad_delivered',
        'ad_played',
        'ad_viewable',
        'ad_network_backfill_simulated',
      ],
      { message: 'Invalid simulated eventType.' }
    ),
  })
  .strict();

export const simulatorBreakScheduleSchema = z
  .object({
    requestedBreakDurationSeconds: z.coerce.number().finite().min(0).max(600).optional(),
    safetyBufferSeconds: z.coerce.number().finite().min(0).max(60).optional(),
    requestedSlotCount: z.coerce.number().int().min(1).max(4).optional(),
    alternatingPointerStart: z.enum(['CHARITY', 'COMMERCIAL']).optional().default('CHARITY'),
    allowMockBackfill: z.boolean().optional().default(true),
    householdId: z.string().trim().min(2).max(120).optional(),
    expectedConsentEpoch: z.coerce.number().int().min(1).max(1000000).optional(),
  })
  .strict();

const optionACompositionSchema = z.object({}).passthrough();
const optionBUploadSpecSchema = z.object({}).passthrough();

const textOnlyCommercialSpecSchema = z
  .object({
    advertiserName: z.string().trim().min(1).max(120),
    headline: z.string().trim().min(1).max(160),
    messageBody: z.string().trim().min(1).max(600),
    contactInfo: z.string().trim().max(140).optional().default(''),
    backgroundColor: z.string().trim().max(40).optional(),
    accentColor: z.string().trim().max(40).optional(),
    textColor: z.string().trim().max(40).optional(),
    qrPlacement: z.enum(['bottom_right', 'bottom_left', 'top_right']).optional(),
  })
  .passthrough();

export const adCreativeSaveSchema = z
  .object({
    campaignId: z.string().trim().max(120).nullable().optional(),
    qrToken: z.string().trim().max(120).nullable().optional(),
    title: z.string().trim().max(180).optional().default(''),
    mode: z.enum(['option_a_studio', 'option_b_upload', 'text_only_commercial'], {
      message: 'mode must be option_a_studio, option_b_upload, or text_only_commercial.',
    }),
    displayDurationSeconds: z.coerce.number().int().min(5).max(120).optional().default(15),
    safeZoneWarnings: z.array(z.string().max(300)).max(20).optional().default([]),
    contrastWarnings: z.array(z.string().max(300)).max(20).optional().default([]),
    optionA: optionACompositionSchema.nullable().optional(),
    optionB: optionBUploadSpecSchema.nullable().optional(),
    textOnly: textOnlyCommercialSpecSchema.nullable().optional(),
  })
  .strict();

export const adCreativeAttachSchema = z
  .object({
    campaignId: z.string({ message: 'campaignId string is required.' }).trim().min(1, 'campaignId string is required.').max(120),
  })
  .strict();

export const supportTicketCreateSchema = z
  .object({
    campaignId: z.string().trim().max(120).nullable().optional(),
    category: z.enum(
      [
        'campaign_review',
        'verification_enquiry',
        'qr_technical',
        'billing_dispute',
        'policy_appeal',
      ],
      { message: 'Invalid support ticket category.' }
    ),
    subject: z.string().trim().min(1, 'Subject is required.').max(200),
    message: z.string().trim().min(1, 'Message is required.').max(4000),
  })
  .strict();

export const supportTicketStatusSchema = z
  .object({
    status: z.enum(['open', 'in_review', 'resolved', 'closed'], {
      message: 'Invalid ticket status.',
    }),
    adminResponse: z.string().trim().max(2000).optional(),
  })
  .strict();

export const opportunityCreateSchema = z
  .object({
    providerType: z
      .enum(['registered_organisation', 'individual_informal_employer'])
      .optional()
      .default('registered_organisation'),
    providerName: z.string().trim().max(180).optional().default(''),
    category: z.enum(ALL_OPPORTUNITY_CATEGORIES, {
      message: 'Invalid opportunity category.',
    }),
    title: z.string().trim().max(200).optional().default(''),
    description: z.string().trim().max(4000).optional().default(''),
    location: z.string().trim().max(180).optional().default(''),
    eligibilityRequirements: z.string().trim().max(2000).optional().default(''),
    applicationMethod: z.string().trim().max(1000).optional().default(''),
    contactInfo: z.string().trim().max(300).optional().default(''),
    qrToken: z.string().trim().max(120).nullable().optional(),
    linkedCampaignId: z.string().trim().max(120).nullable().optional(),
    closingDate: z.string().trim().max(30).optional().default(''),
    expiryDate: z.string().trim().max(30).optional().default(''),
    identityEvidenceRef: z.string().trim().max(300).optional().default(''),
    organisationEvidenceRef: z.string().trim().max(300).optional().default(''),
    specificOpportunityEvidenceRef: z.string().trim().max(300).optional().default(''),
    applicationFeeFreeConfirmed: z.boolean().optional().default(false),
    noGuaranteeConfirmed: z.boolean().optional().default(false),
  })
  .strict();

const tierStatusEnum = z.enum([
  'unverified',
  'pending_review',
  'verified',
  'not_applicable',
  'rejected',
]);

const opportunityStatusEnum = z.enum([
  'draft',
  'submitted',
  'under_review',
  'verified_live',
  'rejected',
  'suspended',
  'expired',
  'revoked',
]);

export const adminVerifyTiersSchema = z
  .object({
    identityStatus: tierStatusEnum.optional(),
    identityNotes: z.string().trim().max(1000).optional(),
    organisationStatus: tierStatusEnum.optional(),
    organisationNotes: z.string().trim().max(1000).optional(),
    specificOpportunityStatus: tierStatusEnum.optional(),
    specificOpportunityNotes: z.string().trim().max(1000).optional(),
    targetStatus: opportunityStatusEnum.optional(),
    rejectionReason: z.string().trim().max(1000).optional(),
  })
  .strict();

export const complaintCreateSchema = z
  .object({
    reasonCategory: z.enum(
      [
        'upfront_fee_scam',
        'misleading_guarantee',
        'expired_or_closed',
        'broken_or_wrong_qr',
        'fake_employer_or_listing',
        'other',
      ],
      { message: 'Invalid complaint reasonCategory.' }
    ),
    description: z.string().trim().max(3000).optional().default(''),
    evidenceDetails: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export const adminComplaintUpdateSchema = z
  .object({
    status: z.enum(['reported', 'under_investigation', 'cleared', 'suspended', 'revoked'], {
      message: 'Invalid complaint status.',
    }),
    resolutionNotes: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export const appealCreateSchema = z
  .object({
    reason: z.string().trim().max(3000).optional().default(''),
    additionalEvidence: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export const adminAppealResolveSchema = z
  .object({
    status: z.enum(['submitted', 'under_review', 'upheld_reinstated', 'denied'], {
      message: 'Invalid appeal decision status.',
    }),
    adminNotes: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export const adminQrModerateSchema = z
  .object({
    status: z.enum(['active', 'disabled', 'flagged'], {
      message: 'status must be active, disabled, or flagged.',
    }),
    reason: z.string().trim().max(1000).optional().default(''),
  })
  .strict();

export const adminClearQrFlagSchema = z
  .object({
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .strict();

export const auditLogQuerySchema = z.object({
  targetType: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const physicalQrTestCreateSchema = z
  .object({
    qrToken: z.string().trim().max(120).optional().default(''),
    encodedRedirectUrl: z.string().trim().max(1024).optional().default(''),
    deviceModel: z.string().trim().max(120).optional().default(''),
    osPlatform: z.enum(['iOS', 'Android', 'Other Mobile']).optional().default('Other Mobile'),
    cameraApp: z.string().trim().max(120).optional().default(''),
    outcome: z.enum(['passed', 'failed']).optional().default('passed'),
    reachedRedirectEndpoint: z.boolean().optional().default(false),
    landedDestinationObserved: z.boolean().optional().default(false),
    timeToScanSeconds: z.coerce.number().finite().min(0.1).max(120).optional().default(1.5),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .strict();

const FORBIDDEN_SHARED_INTEL_PII_KEYS = [
  'householdId',
  'profileId',
  'viewerName',
  'userName',
  'email',
  'phone',
  'exactAddress',
  'exactCoordinates',
  'latitude',
  'longitude',
  'personalViewingHistory',
];

export const sharedIntelObservationSchema = z
  .object({
    tvDeviceId: z.string().trim().min(1).max(120),
    scopeId: z.string().trim().min(1).max(160),
    signalType: z.enum(['scte35', 'hbbtv', 'av_pattern', 'channel_cadence']).optional().default('scte35'),
    estimatedBreakDurationSec: z.coerce.number().finite().min(5).max(600).optional().default(90),
    transitionLatencyMs: z.coerce.number().finite().min(0).max(30000).optional().default(400),
    outlierAnomaly: z.boolean().optional().default(false),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    for (const key of FORBIDDEN_SHARED_INTEL_PII_KEYS) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Zero-PII policy violation: "${key}" is strictly forbidden in Shared Intelligence observations.`,
        });
      }
    }
  });

export const sharedIntelActionSchema = z
  .object({
    action: z.enum(
      [
        'corroborate_quorum',
        'inject_outlier_poison',
        'toggle_offline',
        'sync_cache',
        'simulate_fpr_spike_rollback',
        'reset_preview',
      ],
      { message: 'Invalid simulation action.' }
    ),
    scopeId: z.string().trim().max(160).optional(),
    tvDeviceId: z.string().trim().max(120).optional(),
  })
  .strict();

export const auditLogExportQuerySchema = z
  .object({
    targetType: z.string().trim().max(60).optional().default('all'),
    limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict();

const simulatedTvDeviceStateSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    powerOn: z.boolean(),
    volume: z.coerce.number().int().min(0).max(100),
    muted: z.boolean(),
    activeInput: z.enum(['LIVE_TUNER', 'HDMI_1', 'HDMI_2', 'EDISON_APP']),
    previousOrdinaryInput: z.enum(['LIVE_TUNER', 'HDMI_1', 'HDMI_2']),
    channelNumber: z.coerce.number().int().min(1).max(999),
    adBreakOverlayActive: z.boolean(),
    lastDpadAction: z.string().max(40).nullable(),
    lastRestoredAt: z.string().max(60).nullable(),
    ordinaryTvIntact: z.boolean(),
  })
  .strict();

export const tvRemoteSimulateSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    intentSource: z.enum(['AURA', 'EDISON_UI']).optional().default('AURA'),
    command: z.enum([
      'power_toggle',
      'volume_up',
      'volume_down',
      'mute_toggle',
      'channel_up',
      'channel_down',
      'input_source_select',
      'dpad_up',
      'dpad_down',
      'dpad_left',
      'dpad_right',
      'dpad_ok',
      'back',
      'home',
    ]),
    targetInput: z.enum(['LIVE_TUNER', 'HDMI_1', 'HDMI_2', 'EDISON_APP']).optional(),
    faultMode: z
      .enum(['none', 'adapter_timeout', 'hdcp_blocked', 'decoder_crash', 'network_drop'])
      .optional()
      .default('none'),
    simulateActiveAdSession: z.boolean().optional().default(false),
    currentState: simulatedTvDeviceStateSchema.optional(),
  })
  .strict();

export const tvBreakLifecycleSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    action: z.enum(['enter_ad_session', 'exit_to_ordinary_tv']),
    faultMode: z
      .enum(['none', 'adapter_timeout', 'hdcp_blocked', 'decoder_crash', 'network_drop'])
      .optional()
      .default('none'),
    currentState: simulatedTvDeviceStateSchema.optional(),
  })
  .strict();

export const tvFaultSuiteSchema = z
  .object({
    platformId: z
      .enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos'])
      .optional(),
  })
  .strict();

export const offlineCacheStageSchema = z
  .object({
    scopeId: z.string().trim().min(3).max(160),
    nextVersion: z.coerce.number().int().min(1).max(10000),
    p10BreakDurationSec: z.coerce.number().int().min(10).max(600),
    p50BreakDurationSec: z.coerce.number().int().min(10).max(600),
    switchingLatencyMs: z.coerce.number().int().min(50).max(5000),
    providedManifestSha: z.string().trim().max(64).optional(),
    simulateCorruptManifest: z.boolean().optional().default(false),
  })
  .strict();

export const offlineCacheRollbackSchema = z
  .object({
    scopeId: z.string().trim().min(3).max(160),
  })
  .strict();

export const offlineCacheEvaluateBreakSchema = z
  .object({
    scopeId: z.string().trim().min(3).max(160),
    adDurationSeconds: z.coerce.number().int().min(5).max(120),
    safetyBufferSeconds: z.coerce.number().int().min(2).max(20).optional().default(5),
  })
  .strict();

export const offlineQueueEnqueueSchema = z
  .object({
    idempotencyKey: z.string().trim().min(3).max(120),
    scopeId: z.string().trim().min(3).max(160),
    channelNumber: z.coerce.number().int().min(1).max(999),
    signalType: z.enum(['scte35_cue', 'hbbtv_ait', 'av_cadence', 'offline_skip']),
    observedBreakDurationSec: z.coerce.number().int().min(5).max(600),
    switchingLatencyMs: z.coerce.number().int().min(50).max(5000).optional().default(380),
  })
  .strict();

export const offlineQueueDrainSchema = z
  .object({
    networkOnline: z.boolean(),
    maxBatchSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  })
  .strict();

export const tvCadenceSimulateSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    channelNumber: z.coerce.number().int().min(1).max(999),
    signalType: z.enum(['scte35_cue', 'hbbtv_ait', 'av_cadence']).optional().default('scte35_cue'),
    observedBreakDurationSec: z.coerce.number().int().min(5).max(600),
    adDurationSeconds: z.coerce.number().int().min(5).max(120).optional().default(20),
    safetyBufferSeconds: z.coerce.number().int().min(2).max(20).optional().default(5),
    networkOnline: z.boolean().optional().default(true),
    faultMode: z
      .enum(['none', 'adapter_timeout', 'hdcp_blocked', 'decoder_crash', 'network_drop'])
      .optional()
      .default('none'),
    idempotencyKey: z.string().trim().min(3).max(120).optional(),
    currentState: simulatedTvDeviceStateSchema.optional(),
  })
  .strict();

export const tvConformanceVectorsSchema = z.object({}).strict();

export const broadcastCueParseSchema = z
  .object({
    standard: z.enum(['scte35_splice_insert', 'hbbtv_ait_dsmcc', 'av_cadence_marker']),
    channelNumber: z.coerce.number().int().min(1).max(999),
    breakDurationSec: z.coerce.number().int().min(5).max(600),
    adDurationSeconds: z.coerce.number().int().min(5).max(120).optional().default(20),
    safetyBufferSeconds: z.coerce.number().int().min(2).max(20).optional().default(5),
    drmProtected: z.boolean().optional().default(false),
    spliceEventId: z.coerce.number().int().min(1).max(99999999).optional(),
    outOfNetworkIndicator: z.boolean().optional(),
    autoReturn: z.boolean().optional(),
    ptsTimeTicks: z.coerce.number().int().min(0).max(9000000000).optional(),
    orgId: z.coerce.number().int().min(1).max(99999999).optional(),
    applicationId: z.coerce.number().int().min(1).max(65535).optional(),
    controlCode: z.enum(['AUTOSTART', 'PRESENT', 'KILL']).optional(),
    ownSessionOnly: z.boolean().optional(),
    blackFrameDurationMs: z.coerce.number().int().min(0).max(10000).optional(),
    audioSilenceRmsDb: z.coerce.number().finite().min(-120).max(0).optional(),
    confidenceScore: z.coerce.number().finite().min(0).max(1).optional(),
  })
  .strict();

export const companionPolicyEvalSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    executionContext: z.enum([
      'owned_edison_session',
      'third_party_broadcaster_stream',
      'system_global_tuner',
    ]),
    requestedCapability: z.enum([
      'render_overlay',
      'inject_remote_key',
      'monitor_epg_global',
      'hdmi_cec_switch',
      'bypass_hdcp',
      'background_screen_scrape',
    ]),
    hasPartnerPrivilege: z.boolean(),
    hasExplicitViewerConsent: z.boolean(),
    drmHdcpActive: z.boolean(),
  })
  .strict();

export const phase4ExitSuiteSchema = z.object({}).strict();

// --- Phase 5 Block 5.1: Shared Ad Intelligence Fleet Production Service Schemas ---

export const fleetDeviceRegisterSchema = z
  .object({
    tvDeviceId: z.string().trim().min(3).max(120),
    platform: z.string().trim().min(2).max(80),
    country: z.string().trim().min(2).max(12),
    assignedScopeId: z.string().trim().min(3).max(160),
    publicKeyPem: z.string().trim().min(40).max(2000).optional(),
  })
  .strict();

export const fleetObservationSubmitSchema = z
  .object({
    tvDeviceId: z.string().trim().min(2).max(120),
    scopeId: z.string().trim().min(3).max(160),
    signalType: z.enum(['scte35', 'hbbtv', 'av_pattern', 'channel_cadence']).default('scte35'),
    estimatedBreakDurationSec: z.coerce.number().finite().min(5).max(1200),
    transitionLatencyMs: z.coerce.number().finite().min(0).max(30000).default(380),
    nonce: z.string().trim().min(2).max(120),
    signatureHex: z.string().trim().max(512).optional(),
    useRegisteredDemoSigner: z.boolean().optional().default(false),
    outlierAnomaly: z.boolean().optional().default(false),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    for (const key of FORBIDDEN_SHARED_INTEL_PII_KEYS) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Zero-PII policy violation: "${key}" is strictly forbidden in Fleet Shared Intelligence observations.`,
        });
      }
    }
  });

export const fleetDeltaSyncSchema = z
  .object({
    tvDeviceId: z.string().trim().min(2).max(120),
    scopeId: z.string().trim().min(3).max(160),
    clientPlatform: z.string().trim().min(2).max(80),
    clientCountry: z.string().trim().min(2).max(12),
    knownVersion: z.coerce.number().int().min(0).max(100000).default(0),
    simulateCorruptChecksum: z.boolean().optional().default(false),
  })
  .strict();

export const fleetFprReportSchema = z
  .object({
    scopeId: z.string().trim().min(3).max(160),
    observedFprPct: z.coerce.number().finite().min(0).max(100),
  })
  .strict();

export const breakDurationPredictSchema = z
  .object({
    channelNumber: z.coerce.number().int().min(1).max(999),
    daypart: z.enum(['morning', 'daytime', 'prime_time', 'late_night']),
    programmeGenre: z.enum(['news', 'drama', 'live_sport', 'entertainment']),
    signalType: z.enum(['scte35', 'hbbtv', 'av_pattern', 'channel_cadence']),
    elapsedBreakSec: z.coerce.number().finite().min(0).max(600).optional().default(0),
    requestedAdDurationSec: z.coerce.number().int().min(5).max(120),
    switchingOverheadSec: z.coerce.number().finite().min(0).max(15).optional().default(2),
    safetyBufferSeconds: z.coerce.number().finite().min(2).max(20).optional().default(5),
    confidenceScore: z.coerce.number().finite().min(0).max(1).optional(),
    drmProtected: z.boolean().optional().default(false),
    observedHistoricalBreaksSec: z
      .array(z.coerce.number().finite().min(5).max(600))
      .max(50)
      .optional(),
  })
  .strict();

export const deliveryManifestRequestSchema = z
  .object({
    platformId: z.enum(['simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos']),
    deviceSlotId: z.string().trim().min(2).max(120),
    regionCode: z.string().trim().min(2).max(20),
    daypart: daypartSlotEnum.optional().default('daytime'),
    simulateCdnOutage: z.boolean().optional().default(false),
    householdId: z.string().trim().min(2).max(120).optional(),
    expectedConsentEpoch: z.coerce.number().int().min(1).max(1000000).optional(),
  })
  .strict();

export const deliveryEventIngestBatchSchema = z
  .object({
    events: z
      .array(
        z
          .object({
            idempotencyKey: z.string().trim().min(3).max(120),
            deviceSlotId: z.string().trim().min(2).max(120),
            campaignId: z.string().trim().min(2).max(120),
            qrToken: z.string().trim().max(120).nullable().optional(),
            eventType: z.enum(['ad_requested', 'ad_delivered', 'ad_played', 'ad_viewable']),
            regionCode: z.string().trim().min(2).max(20),
            playbackDurationMs: z.coerce.number().finite().min(-1000).max(600000),
            occurredAt: z.string().trim().max(60).optional(),
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict();

export const proFormaBlueprintRequestSchema = z
  .object({
    billingPeriodLabel: z.string().trim().min(4).max(32).default('2026-11'),
  })
  .strict();

export const emptyStrictSchema = z.object({}).strict();

export const householdLocationSchema = z
  .object({
    countryCode: z.string().trim().min(2).max(12),
    provinceOrRegion: z.string().trim().min(1).max(120),
    metroArea: z.string().trim().max(120).optional().default(''),
    cityOrTown: z.string().trim().min(1).max(120),
    district: z.string().trim().min(1).max(120),
    suburbOrArea: z.string().trim().min(1).max(120),
    exactInstallationLocation: z.string().trim().min(1).max(240),
  })
  .strict();

export const householdCreateSchema = z
  .object({
    householdLabel: z.string().trim().min(2).max(120),
    tvDeviceLabel: z.string().trim().min(2).max(120),
    location: householdLocationSchema,
    commercialConsentGranted: z.boolean(),
    personalisationMasterEnabled: z.boolean().optional().default(true),
    neutralDisplayMode: z.boolean().optional().default(false),
  })
  .strict();

export const householdDisplaySettingsPatchSchema = z
  .object({
    householdLabel: z.string().trim().min(2).max(120).optional(),
    tvDeviceLabel: z.string().trim().min(2).max(120).optional(),
    personalisationMasterEnabled: z.boolean().optional(),
    neutralDisplayMode: z.boolean().optional(),
  })
  .strict();

export const householdConsentWithdrawSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const householdConsentRestoreSchema = z
  .object({
    explicitConfirmation: z.boolean(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

const opportunityCategoryEnum = z.enum(ALL_OPPORTUNITY_CATEGORIES);

export const householdMemberCreateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    pin: z.string().trim().regex(/^\d{4,8}$/, 'PIN must be 4–8 digits.').optional(),
    personalisationConsentGranted: z.boolean().optional().default(true),
    educationLevel: z.string().trim().max(120).optional().default(''),
    qualifications: z.array(z.string().trim().max(120)).max(20).optional().default([]),
    skills: z.array(z.string().trim().max(80)).max(30).optional().default([]),
    experienceSummary: z.string().trim().max(500).optional().default(''),
    experienceYears: z.coerce.number().int().min(0).max(60).optional().default(0),
    occupationOrTrade: z.string().trim().max(120).optional().default(''),
    employmentInterests: z.array(z.string().trim().max(80)).max(20).optional().default([]),
    careerAspirations: z.string().trim().max(300).optional().default(''),
    industries: z.array(z.string().trim().max(80)).max(20).optional().default([]),
    interestedCategories: z.array(opportunityCategoryEnum).max(14).optional().default([]),
  })
  .strict();

export const householdMemberUpdateSchema = z
  .object({
    pinVerification: z.string().trim().max(12).optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    newPin: z.string().trim().regex(/^\d{4,8}$/, 'PIN must be 4–8 digits.').nullable().optional(),
    personalisationConsentGranted: z.boolean().optional(),
    educationLevel: z.string().trim().max(120).optional(),
    qualifications: z.array(z.string().trim().max(120)).max(20).optional(),
    skills: z.array(z.string().trim().max(80)).max(30).optional(),
    experienceSummary: z.string().trim().max(500).optional(),
    experienceYears: z.coerce.number().int().min(0).max(60).optional(),
    occupationOrTrade: z.string().trim().max(120).optional(),
    employmentInterests: z.array(z.string().trim().max(80)).max(20).optional(),
    careerAspirations: z.string().trim().max(300).optional(),
    industries: z.array(z.string().trim().max(80)).max(20).optional(),
    interestedCategories: z.array(opportunityCategoryEnum).max(14).optional(),
  })
  .strict();

export const householdMemberDeleteSchema = z
  .object({
    pinVerification: z.string().trim().max(12).optional(),
  })
  .strict();

export const householdQrIssueSchema = z
  .object({
    baseQrToken: z.string().trim().min(2).max(120),
    opportunityId: z.string().trim().max(120).nullable().optional(),
    campaignId: z.string().trim().max(120).nullable().optional(),
    ttlSeconds: z.coerce.number().int().min(1).max(86400).optional().default(1800),
  })
  .strict();

export const broadcastRenderJobRequestSchema = z
  .object({
    creativeId: z.string().trim().min(2).max(120),
    resolutionProfile: z.enum(['1080p_fhd', '4k_uhd']).optional().default('1080p_fhd'),
  })
  .strict();

export const opportunityOpsSweepSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const privacyDsrEraseSchema = z
  .object({
    confirmationPhrase: z.literal('ERASE HOUSEHOLD DATA', {
      message: 'confirmationPhrase must equal exact string "ERASE HOUSEHOLD DATA".',
    }),
    reason: z.string().trim().min(5, 'reason must be at least 5 characters.').max(300),
  })
  .strict();

export const privacyRetentionSweepSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const reliabilityChaosProbeSchema = z
  .object({
    failureModeId: z.enum([
      'FM-01',
      'FM-02',
      'FM-03',
      'FM-04',
      'FM-05',
      'FM-06',
      'FM-07',
      'FM-08',
      'FM-09',
      'FM-10',
      'FM-11',
      'FM-12',
      'FM-13',
      'FM-14',
      'FM-15',
      'FM-16',
      'FM-17',
      'FM-18',
    ]),
    injectSeverity: z.enum(['standard', 'extreme']).optional().default('standard'),
  })
  .strict();

export const reliabilityChaosSweepSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
    injectSeverity: z.enum(['standard', 'extreme']).optional().default('standard'),
  })
  .strict();

export function parseWithZod<T extends z.ZodTypeAny>(
  schema: T,
  payload: unknown
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: string; validationIssues: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(payload ?? {});
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const validationIssues = result.error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
  const first = validationIssues[0];
  const error =
    validationIssues.length === 1
      ? first.message
      : `Validation failed (${validationIssues.length} issues): ${first.path}: ${first.message}`;
  return { ok: false, error, validationIssues };
}
