import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express';
import {
  ALL_CAMPAIGN_STATUSES,
  ALLOWED_CAMPAIGN_TRANSITIONS,
  ALL_OPPORTUNITY_CATEGORIES,
  getEdisonStore,
} from './store.ts';
import type {
  EdisonAuthSessionRepository,
  EdisonDataRepository,
} from './repository.ts';
import { D1DomainRecordRepository } from './cloudflare/d1DomainRecordRepository.ts';
import {
  STATIC_ASSET_SECURITY_HEADERS,
  UPLOADS_DIR,
  resolveSafeUploadPath,
  saveValidatedMediaUpload,
} from './mediaSecurity.ts';
import { validateQrDestination } from './qrValidator.ts';
import {
  getGovernanceDocById,
  getGovernanceDocMetadata,
  listGovernanceDocMetadata,
  listGovernanceDocs,
  type GovernanceDocRecord,
} from './docsRegistry.ts';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  InMemoryRateLimiter,
  SESSION_COOKIE_NAME,
  apiErrorMiddleware,
  apiTimeoutMiddleware,
  buildClearCookieOptions,
  buildHardenedCookieOptions,
  generateCsrfToken,
  isSameOriginRequest,
  neutralizeCsvCell,
  parseCookies,
  requestCorrelationMiddleware,
  securityHeadersMiddleware,
  timingSafeMatch,
  type CorrelatedRequest,
  type RequestTelemetryEntry,
} from './security.ts';
import { edisonTvControlEngine } from './tvPlatformAdapter.ts';
import { localOfflineIntelCache } from './offlineIntelCache.ts';
import {
  evaluateCompanionPolicyGuardrail,
  parseAndValidateBroadcastCue,
  runPhase4SoftwareExitSuite,
} from './broadcastMetadataParser.ts';
import {
  SharedIntelFleetService,
  sharedIntelFleetService,
} from './sharedIntelFleetService.ts';
import {
  listChannelPredictorProfiles,
  predictBreakDurationQuantiles,
  runRecordedStreamCalibrationBenchmark,
} from './breakDurationPredictor.ts';
import {
  edisonDeliveryInfra,
  runDeliveryInfraVerificationSuite,
} from './adDeliveryInfra.ts';
import {
  buildAdvertiserOpsOverview,
  generateProFormaInvoiceBlueprint,
  runAdvertiserOpsVerificationSuite,
} from './advertiserOps.ts';
import {
  computeAdvertiserGeoAggregates,
  listCountryGeoConfigs,
  runTrackBVerificationSuite,
  toPublicHouseholdView,
} from './trackBHouseholdConsent.ts';
import {
  buildBroadcastRenderOverview,
  runBroadcastRenderVerificationSuite,
  validateCreativeForBroadcastRender,
} from './broadcastRenderValidator.ts';
import {
  runBroadcastRenderVerificationSuite as runBroadcastRenderJobVerificationSuite,
} from './broadcastRenderEngine.ts';
import { runOpportunityOpsVerificationSuite } from './opportunityOpsEngine.ts';
import { runPrivacyComplianceVerificationSuite } from './privacyComplianceEngine.ts';
import { runReliabilityChaosVerificationSuite } from './reliabilityChaosEngine.ts';
import { runPilotReadinessVerificationSuite } from './pilotReadinessEngine.ts';
import { runCommercialReadinessVerificationSuite } from './commercialReadinessEngine.ts';
import { runCountryLaunchVerificationSuite } from './countryLaunchEngine.ts';
import { runInternationalExpansionVerificationSuite } from './internationalExpansionEngine.ts';
import fs from 'node:fs';
import path from 'node:path';
import { auraRemoteEngine } from './auraRemoteEngine.ts';
import {
  commercialDisputeEngine,
  type CommercialDisputeRecord,
} from './commercialDisputeEngine.ts';
import type { AuraPairedDeviceRecord } from './auraRemoteEngine.ts';
import { EDISON_I18N_BUNDLES, getTranslationBundle } from '../i18n/translations.ts';
import { logStructured } from './logger.ts';
import { FfmpegMediaWorker, edisonMediaWorker } from './mediaWorker.ts';
import { createPgliteExecutor } from './postgres/executor.ts';
import {
  exportPostgresBackupSql,
  importJsonStoreToPostgres,
  probePostgresReadiness,
} from './postgres/jsonToPostgresMigrator.ts';
import { loadMigrationDescriptors } from './postgres/migrator.ts';
import { reliabilityMonitor } from './reliabilityMonitor.ts';
import {
  adCreativeAttachSchema,
  adCreativeSaveSchema,
  adminAppealResolveSchema,
  adminClearQrFlagSchema,
  adminComplaintUpdateSchema,
  adminQrModerateSchema,
  adminVerifyProfileSchema,
  adminVerifyTiersSchema,
  advertiserProfilePutSchema,
  appealCreateSchema,
  auditLogExportQuerySchema,
  auditLogQuerySchema,
  auraBindProfileSchema,
  auraCommandSchema,
  auraConfirmPairingSchema,
  auraHeartbeatSchema,
  auraInitiatePairingSchema,
  breakDurationPredictSchema,
  broadcastCueParseSchema,
  broadcastRenderValidateSchema,
  campaignCreateSchema,
  campaignQuerySchema,
  campaignTransitionSchema,
  campaignUpdateSchema,
  commercialBoardDecisionSchema,
  commercialCostAssumptionsSchema,
  commercialDisputeCreateSchema,
  commercialDisputeResolveSchema,
  companionPolicyEvalSchema,
  complaintCreateSchema,
  countryLaunchDecisionSchema,
  countryPolicyUpdateSchema,
  deliveryEventIngestBatchSchema,
  deliveryManifestRequestSchema,
  emptyStrictSchema,
  fleetBreakEventSubmitSchema,
  fleetBreakEventSyncQuerySchema,
  fleetDeltaSyncSchema,
  fleetDeviceRegisterSchema,
  fleetFprReportSchema,
  fleetObservationSubmitSchema,
  hdmiCecEvaluateSchema,
  householdConsentRestoreSchema,
  householdConsentWithdrawSchema,
  householdCreateSchema,
  householdDisplaySettingsPatchSchema,
  householdDsrEraseSchema,
  householdLocationSchema,
  householdMemberCreateSchema,
  householdMemberDeleteSchema,
  householdMemberUpdateSchema,
  householdQrIssueSchema,
  internationalExpansionDecisionSchema,
  loginSchema,
  mediaUploadSchema,
  mediaWorkerProbeSchema,
  mediaWorkerTranscodeSchema,
  multiCurrencyEstimateSchema,
  offlineCacheEvaluateBreakSchema,
  offlineCacheRollbackSchema,
  offlineCacheStageSchema,
  offlineQueueDrainSchema,
  offlineQueueEnqueueSchema,
  opportunityCreateSchema,
  opportunityOpsSweepSchema,
  parseWithZod,
  phase4ExitSuiteSchema,
  physicalQrTestCreateSchema,
  pilotCohortCreateSchema,
  pilotTelemetryValidateSchema,
  privacyRetentionSweepSchema,
  proFormaBlueprintRequestSchema,
  qrCreateSchema,
  qrStatusPatchSchema,
  qrValidateSchema,
  regionalLocalizationUpdateSchema,
  registerSchema,
  reliabilityChaosProbeSchema,
  reliabilityFullSuiteSchema,
  renderCompileJobSchema,
  sharedIntelActionSchema,
  sharedIntelObservationSchema,
  simulatorBreakScheduleSchema,
  simulatorEventSchema,
  stageP6CheckPrepareSchema,
  supportTicketCreateSchema,
  supportTicketStatusSchema,
  tvBreakLifecycleSchema,
  tvCadenceSimulateSchema,
  tvConformanceVectorsSchema,
  tvFaultSuiteSchema,
  tvRemoteSimulateSchema,
} from './validationSchemas.ts';
import type {
  AuditLogRecord,
  AnalyticsEventRecord,
  AdvertiserProfile,
  CommercialBoardDecisionRecord,
  CommercialCostAssumptionsInput,
  CampaignRecord,
  CampaignStatus,
  LiveReportSnapshot,
  AdvertiserGeoAggregateRow,
  CountryJurisdictionPolicyConfig,
  CountryLaunchDecisionRecord,
  ConsentAuditEventRecord,
  DeliveryPreloadManifestResult,
  InternationalExpansionDecisionRecord,
  HouseholdMemberProfile,
  HouseholdInstallationRecord,
  HouseholdQrRedirectPersistenceState,
  HouseholdQrTokenRecord,
  AdCreativeRecord,
  OpportunityAppealRecord,
  OpportunityComplaintRecord,
  OpportunityRecord,
  PhysicalQrScanTestRecord,
  PilotCohortBlueprintRecord,
  RegionalLocalizationConfig,
  ReliabilityChaosReport,
  SharedIntelPreviewState,
  StageP6StepId,
  SupportTicketRecord,
  SupportTicketStatus,
  OptionAComposition,
  OptionBUploadSpec,
  PublicUser,
  QrLinkRecord,
  QrDestinationType,
  SessionRecord,
  TextOnlyCommercialSpec,
} from '../types/edison.ts';

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

interface AuthenticatedRequest extends CorrelatedRequest {
  currentUser?: PublicUser | null;
  currentSession?: SessionRecord | null;
  sessionToken?: string;
  authTransport?: 'bearer' | 'cookie' | 'none';
  pendingAuditWrites?: Promise<void>[];
}

export interface EdisonRateLimitOptions {
  authMax?: number;
  authWindowMs?: number;
  redirectMax?: number;
  redirectWindowMs?: number;
  mutationMax?: number;
  mutationWindowMs?: number;
  uploadMax?: number;
  uploadWindowMs?: number;
}

export interface EdisonDomainRecordRepository {
  getFoundationSummaryCounts(): Promise<
    Partial<Omit<LiveReportSnapshot['summary'], 'userCount' | 'auditLogCount'>>
  >;
  getCampaignStatusBreakdown(): Promise<Record<CampaignStatus, number>>;
  listDeliveryManifestsForActor(user: PublicUser): Promise<DeliveryPreloadManifestResult[]>;
  putDeliveryManifest(manifest: DeliveryPreloadManifestResult, ownerId: string): Promise<void>;
  getAdvertiserProfile(userId: string): Promise<AdvertiserProfile | null>;
  putAdvertiserProfile(profile: AdvertiserProfile): Promise<void>;
  listAdvertiserProfiles(): Promise<AdvertiserProfile[]>;
  listQrLinksForUser(userId: string): Promise<QrLinkRecord[]>;
  listQrLinksForActor(user: PublicUser): Promise<QrLinkRecord[]>;
  getQrLinkByToken(token: string): Promise<QrLinkRecord | null>;
  putQrLink(link: QrLinkRecord): Promise<void>;
  deleteQrLink(token: string): Promise<void>;
  listPhysicalQrScanTestsForUser(user: PublicUser): Promise<PhysicalQrScanTestRecord[]>;
  getPhysicalQrScanTestForActor(
    user: PublicUser,
    testId: string
  ): Promise<PhysicalQrScanTestRecord | null>;
  putPhysicalQrScanTest(record: PhysicalQrScanTestRecord): Promise<void>;
  deletePhysicalQrScanTest(user: PublicUser, testId: string): Promise<void>;
  listPilotCohorts(): Promise<PilotCohortBlueprintRecord[]>;
  putPilotCohort(cohort: PilotCohortBlueprintRecord): Promise<void>;
  listStageP6PrepNotes(): Promise<Array<{ stepId: StageP6StepId; ownerPrepNote: string }>>;
  putStageP6PrepNote(stepId: StageP6StepId, ownerPrepNote: string): Promise<void>;
  getCommercialCostAssumptions(): Promise<CommercialCostAssumptionsInput | null>;
  putCommercialCostAssumptions(assumptions: CommercialCostAssumptionsInput): Promise<void>;
  listCommercialBoardDecisions(): Promise<CommercialBoardDecisionRecord[]>;
  putCommercialBoardDecision(decision: CommercialBoardDecisionRecord): Promise<void>;
  listCommercialDisputes(): Promise<CommercialDisputeRecord[]>;
  putCommercialDispute(dispute: CommercialDisputeRecord): Promise<void>;
  listAuraDevicesForUser(user: PublicUser): Promise<AuraPairedDeviceRecord[]>;
  putAuraDevice(device: AuraPairedDeviceRecord): Promise<void>;
  getSharedIntelPreviewState(): Promise<SharedIntelPreviewState | null>;
  putSharedIntelPreviewState(state: SharedIntelPreviewState): Promise<void>;
  listCountryPolicyProfiles(): Promise<CountryJurisdictionPolicyConfig[]>;
  putCountryPolicyProfile(profile: CountryJurisdictionPolicyConfig): Promise<void>;
  listCountryLaunchDecisions(): Promise<CountryLaunchDecisionRecord[]>;
  putCountryLaunchDecision(decision: CountryLaunchDecisionRecord): Promise<void>;
  listRegionalLocalizationProfiles(): Promise<RegionalLocalizationConfig[]>;
  putRegionalLocalizationProfile(profile: RegionalLocalizationConfig): Promise<void>;
  listInternationalExpansionDecisions(): Promise<InternationalExpansionDecisionRecord[]>;
  putInternationalExpansionDecision(
    decision: InternationalExpansionDecisionRecord
  ): Promise<void>;
  getLatestReliabilityChaosReport(): Promise<ReliabilityChaosReport | null>;
  putLatestReliabilityChaosReport(report: ReliabilityChaosReport): Promise<void>;
  listAnalyticsEvents(limit?: number): Promise<AnalyticsEventRecord[]>;
  putAnalyticsEvent(event: AnalyticsEventRecord, ownerId?: string): Promise<void>;
  listCampaignsForUser(user: PublicUser, statusFilter?: CampaignStatus | 'all'): Promise<CampaignRecord[]>;
  putCampaign(campaign: CampaignRecord): Promise<void>;
  deleteCampaign(campaignId: string): Promise<void>;
  listSupportTicketsForUser(user: PublicUser): Promise<SupportTicketRecord[]>;
  putSupportTicket(ticket: SupportTicketRecord): Promise<void>;
  listAdCreativesForUser(user: PublicUser): Promise<AdCreativeRecord[]>;
  getAdCreativeById(creativeId: string): Promise<AdCreativeRecord | null>;
  putAdCreative(creative: AdCreativeRecord): Promise<void>;
  deleteAdCreative(creativeId: string): Promise<void>;
  listOpportunitiesForUser(user: PublicUser): Promise<OpportunityRecord[]>;
  putOpportunity(opportunity: OpportunityRecord): Promise<void>;
  deleteOpportunity(opportunityId: string): Promise<void>;
  listOpportunityComplaintsForUser(user: PublicUser): Promise<OpportunityComplaintRecord[]>;
  putOpportunityComplaint(complaint: OpportunityComplaintRecord): Promise<void>;
  listOpportunityAppealsForUser(user: PublicUser): Promise<OpportunityAppealRecord[]>;
  putOpportunityAppeal(appeal: OpportunityAppealRecord): Promise<void>;
  listHouseholdsForUser(user: PublicUser): Promise<HouseholdInstallationRecord[]>;
  getAdvertiserGeoAggregates(): Promise<AdvertiserGeoAggregateRow[]>;
  getHouseholdForActor(
    user: PublicUser,
    householdId: string
  ): Promise<HouseholdInstallationRecord | null>;
  putHousehold(household: HouseholdInstallationRecord): Promise<void>;
  listHouseholdMembersForActor(
    user: PublicUser,
    householdId: string
  ): Promise<Array<Omit<HouseholdMemberProfile, 'pinHash'>>>;
  listHouseholdMemberPersistenceRecordsForActor(
    user: PublicUser,
    householdId: string
  ): Promise<HouseholdMemberProfile[]>;
  putHouseholdMember(user: PublicUser, member: HouseholdMemberProfile): Promise<void>;
  deleteHouseholdMember(user: PublicUser, householdId: string, memberId: string): Promise<void>;
  listHouseholdQrTokensForActor(
    user: PublicUser,
    householdId: string
  ): Promise<HouseholdQrTokenRecord[]>;
  getHouseholdQrRedirectState(
    token: string
  ): Promise<HouseholdQrRedirectPersistenceState | null>;
  putHouseholdQrToken(token: HouseholdQrTokenRecord, ownerUserId: string): Promise<void>;
  listConsentAuditEventsForActor(
    user: PublicUser,
    householdId: string
  ): Promise<ConsentAuditEventRecord[]>;
  putConsentAuditEvent(event: ConsentAuditEventRecord, ownerUserId: string): Promise<void>;
}

function extractSessionToken(req: Request): {
  token: string | undefined;
  transport: 'bearer' | 'cookie' | 'none';
} {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    return { token: bearer || undefined, transport: bearer ? 'bearer' : 'none' };
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  return { token: cookieToken || undefined, transport: cookieToken ? 'cookie' : 'none' };
}

function setAuthCookies(req: Request, res: Response, rawToken: string, csrfToken: string): void {
  res.cookie(
    SESSION_COOKIE_NAME,
    rawToken,
    buildHardenedCookieOptions(req, { httpOnly: true, maxAgeMs: SEVEN_DAYS_MS })
  );
  res.cookie(
    CSRF_COOKIE_NAME,
    csrfToken,
    buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
  );
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

function isD1DomainError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return (
    message.startsWith('D1_APPLICATION_RECORD') ||
    message.startsWith('D1_DOMAIN')
  );
}

function sendValidationError(
  res: Response,
  parsed: { ok: false; error: string; validationIssues: Array<{ path: string; message: string }> }
): void {
  res.status(400).json({
    error: parsed.error,
    validationIssues: parsed.validationIssues,
  });
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function createEdisonApp(
  store: EdisonDataRepository = getEdisonStore(),
  options?: {
    uploadsDir?: string;
    sharedIntelFleetService?: SharedIntelFleetService;
    rateLimits?: EdisonRateLimitOptions;
    requestTimeoutMs?: number;
    authSessionRepository?: EdisonAuthSessionRepository;
    domainRecordRepository?: EdisonDomainRecordRepository;
    governanceDocRepository?: {
      listGovernanceDocs: () => Promise<GovernanceDocRecord[]>;
      getGovernanceDocById: (id: string) => Promise<GovernanceDocRecord | null>;
    };
    disableMediaProcessing?: boolean;
    mediaStorageBackend?: import('./mediaStorage.ts').MediaStorageBackend;
  }
): Express {
  const uploadsDir = options?.uploadsDir ?? UPLOADS_DIR;
  const mediaStorageBackend = options?.mediaStorageBackend;
  const authSessionRepository = options?.authSessionRepository ?? store;
  const domainRecordRepository = options?.domainRecordRepository;
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  const recentTelemetry: RequestTelemetryEntry[] = [];
  const mediaWorker =
    options?.uploadsDir
      ? new FfmpegMediaWorker({ uploadsDir: options.uploadsDir })
      : edisonMediaWorker;
  const fleetService = options?.sharedIntelFleetService ?? sharedIntelFleetService;

  async function listMergedAuditRecords(
    filters: { targetType?: string; limit?: number } = {}
  ): Promise<AuditLogRecord[]> {
    const limit = Math.min(500, Math.max(1, filters.limit ?? 200));
    const domainItems = store.listAuditLogs({ ...filters, limit });
    const includesAuth =
      !filters.targetType || filters.targetType === 'all' || filters.targetType === 'auth';
    const d1Items = includesAuth ? await authSessionRepository.listAuditRecords(limit) : [];
    let items = [...domainItems, ...d1Items];
    if (filters.targetType && filters.targetType !== 'all') {
      items = items.filter((item) => item.targetType === filters.targetType);
    }
    return items
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)
      )
      .slice(0, limit);
  }

  async function getFoundationSummary(): Promise<LiveReportSnapshot['summary']> {
    if (!domainRecordRepository) return store.getFoundationSummary();
    const [persistedCounts, userCount, auditRecords] = await Promise.all([
      domainRecordRepository.getFoundationSummaryCounts(),
      authSessionRepository.getUserCount(),
      authSessionRepository.listAuditRecords(500),
    ]);
    return {
      ...store.getFoundationSummary(),
      ...persistedCounts,
      userCount,
      auditLogCount: auditRecords.length,
      storagePath: 'Cloudflare D1 application-record store',
    };
  }

  async function getLiveReportSnapshot(): Promise<LiveReportSnapshot> {
    if (!domainRecordRepository) return store.getLiveReportSnapshot();
    const [summary, campaignStatusBreakdown, auditRecords] = await Promise.all([
      getFoundationSummary(),
      domainRecordRepository.getCampaignStatusBreakdown(),
      authSessionRepository.listAuditRecords(500),
    ]);
    return store.getLiveReportSnapshot({
      summary,
      campaignStatusBreakdown,
      latestAudit: auditRecords[0] ?? null,
    });
  }

  function recordRouteAudit(
    req: AuthenticatedRequest,
    actor: PublicUser | null,
    action: string,
    targetId: string,
    detail: string
  ): void {
    store.recordSecurityAudit(actor, action, targetId, detail);
    if (authSessionRepository === store) {
      return;
    }
    const write = authSessionRepository.recordSecurityAudit(actor, action, targetId, detail);
    if (write instanceof Promise) {
      req.pendingAuditWrites ??= [];
      req.pendingAuditWrites.push(write);
    }
  }

  async function synchronizeAuraStateFromD1(actor: PublicUser): Promise<void> {
    if (!domainRecordRepository) return;
    auraRemoteEngine.replaceDevicesFromPersistence(
      await domainRecordRepository.listAuraDevicesForUser(actor),
    );
  }

  async function persistHouseholdState(
    actor: PublicUser,
    household: HouseholdInstallationRecord
  ): Promise<void> {
    if (!domainRecordRepository) return;
    await domainRecordRepository.putHousehold(household);
    const [members, tokens, events] = await Promise.all([
      Promise.resolve(store.getHouseholdMembersForPersistence(actor, household.id)),
      Promise.resolve(store.listHouseholdQrTokens(actor, household.id)),
      Promise.resolve(store.listConsentAuditEvents(actor, household.id)),
    ]);
    await Promise.all([
      ...members.map((member) => domainRecordRepository.putHouseholdMember(actor, member)),
      ...tokens.map((token) =>
        domainRecordRepository.putHouseholdQrToken(token, household.ownerUserId)
      ),
      ...events.map((event) =>
        domainRecordRepository.putConsentAuditEvent(event, household.ownerUserId)
      ),
    ]);
  }

  async function synchronizeHouseholdStateFromD1(
    actor: PublicUser,
    householdId: string
  ): Promise<boolean> {
    if (!domainRecordRepository) return false;
    const household = await domainRecordRepository.getHouseholdForActor(actor, householdId);
    if (!household) return false;
    const [members, tokens, auditEvents] = await Promise.all([
      domainRecordRepository.listHouseholdMemberPersistenceRecordsForActor(actor, householdId),
      domainRecordRepository.listHouseholdQrTokensForActor(actor, householdId),
      domainRecordRepository.listConsentAuditEventsForActor(actor, householdId),
    ]);
    store.replaceHouseholdStateFromPersistence(actor, household, members, tokens, auditEvents);
    return true;
  }

  async function synchronizePilotCohortsFromD1(): Promise<void> {
    if (!domainRecordRepository) return;
    const [cohorts, prepNotes] = await Promise.all([
      domainRecordRepository.listPilotCohorts(),
      domainRecordRepository.listStageP6PrepNotes(),
    ]);
    store.replacePilotCohortsFromPersistence(cohorts);
    store.replaceStageP6PrepNotesFromPersistence(prepNotes);
  }

  async function synchronizeCommercialReadinessFromD1(): Promise<void> {
    if (!domainRecordRepository) return;
    const [assumptions, decisions] = await Promise.all([
      domainRecordRepository.getCommercialCostAssumptions(),
      domainRecordRepository.listCommercialBoardDecisions(),
    ]);
    store.replaceCommercialReadinessStateFromPersistence(assumptions, decisions);
  }

  async function synchronizeCountryLaunchStateFromD1(): Promise<void> {
    if (!domainRecordRepository) return;
    const [profiles, decisions] = await Promise.all([
      domainRecordRepository.listCountryPolicyProfiles(),
      domainRecordRepository.listCountryLaunchDecisions(),
    ]);
    store.replaceCountryLaunchStateFromPersistence(profiles, decisions);
  }

  async function synchronizeInternationalExpansionStateFromD1(): Promise<void> {
    if (!domainRecordRepository) return;
    const [profiles, decisions] = await Promise.all([
      domainRecordRepository.listRegionalLocalizationProfiles(),
      domainRecordRepository.listInternationalExpansionDecisions(),
    ]);
    store.replaceInternationalExpansionStateFromPersistence(profiles, decisions);
  }

  async function synchronizeReliabilityChaosReportFromD1(): Promise<void> {
    if (!domainRecordRepository) return;
    const report = await domainRecordRepository.getLatestReliabilityChaosReport();
    store.replaceLastReliabilityChaosReportFromPersistence(report);
  }

  const recordRequestTelemetry = (entry: RequestTelemetryEntry) => {
    reliabilityMonitor.recordHttpRequest(
      entry.statusCode,
      entry.durationMs,
      entry.path.startsWith('/r/')
    );
    if (entry.path.startsWith('/api') || entry.path.startsWith('/r/')) {
      recentTelemetry.unshift(entry);
      if (recentTelemetry.length > 200) {
        recentTelemetry.length = 200;
      }
    }
    if (entry.statusCode >= 500) {
      logStructured({
        level: 'error',
        component: 'http-api',
        event: 'HTTP_5XX',
        requestId: entry.requestId,
        detail: { method: entry.method, path: entry.path, statusCode: entry.statusCode },
      });
    }
  };

  const limiter = new InMemoryRateLimiter();
  const rl = options?.rateLimits ?? {};

  const authRateMiddleware = limiter.middleware(
    {
      name: 'auth',
      windowMs: rl.authWindowMs ?? 15 * 60 * 1000,
      maxRequests: rl.authMax ?? 25,
    },
    (req) => req.ip || 'unknown'
  );

  const uploadRateMiddleware = limiter.middleware(
    {
      name: 'media-upload',
      windowMs: rl.uploadWindowMs ?? 60 * 1000,
      maxRequests: rl.uploadMax ?? 30,
    },
    (req: AuthenticatedRequest) => req.currentUser?.id || req.ip || 'unknown'
  );

  const redirectRateMiddleware = limiter.middleware(
    {
      name: 'qr-redirect',
      windowMs: rl.redirectWindowMs ?? 60 * 1000,
      maxRequests: rl.redirectMax ?? 200,
    },
    (req) => req.ip || 'unknown'
  );

  const mutationRateMiddleware = limiter.middleware(
    {
      name: 'api-mutation',
      windowMs: rl.mutationWindowMs ?? 60 * 1000,
      maxRequests: rl.mutationMax ?? 240,
    },
    (req: AuthenticatedRequest) => req.currentUser?.id || req.ip || 'unknown'
  );

  async function attachSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const authenticatedReq = req as AuthenticatedRequest;
    const { token, transport } = extractSessionToken(req);
    authenticatedReq.sessionToken = token;
    authenticatedReq.authTransport = transport;
    const resolved = await authSessionRepository.getSessionByToken(token);
    authenticatedReq.currentUser = resolved?.user ?? null;
    authenticatedReq.currentSession = resolved?.session ?? null;
    if (resolved && token) {
      await authSessionRepository.touchSessionActivity(token);
    }
    next();
  }

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.currentUser || !req.currentSession) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    next();
  }

  function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.currentUser || !req.currentSession) {
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

  const CSRF_PUBLIC_BOOTSTRAP_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/qr/validate',
  ]);

  async function requireCsrfAndSameOrigin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authenticatedReq = req as AuthenticatedRequest;
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }

    const fullPath = req.originalUrl.split('?')[0];

    if (!isSameOriginRequest(req)) {
      await authSessionRepository.recordSecurityAudit(
        authenticatedReq.currentUser ?? null,
        'SECURITY_CROSS_ORIGIN_REJECTED',
        fullPath,
        `Rejected cross-origin ${method} to ${fullPath} (origin=${req.get('origin') || 'none'}).`
      );
      res.status(403).json({
        error: 'Cross-origin state-changing request rejected by same-origin policy.',
      });
      return;
    }

    if (CSRF_PUBLIC_BOOTSTRAP_PATHS.has(fullPath)) {
      next();
      return;
    }

    // Explicit Authorization: Bearer clients do not send ambient cookies
    if (authenticatedReq.authTransport === 'bearer') {
      next();
      return;
    }

    // Idempotent logout when no valid session cookie is present
    if (fullPath === '/api/auth/logout' && !authenticatedReq.currentSession) {
      next();
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieCsrf = cookies[CSRF_COOKIE_NAME];
    const headerCsrf = req.get(CSRF_HEADER_NAME);
    const sessionBoundOk = authenticatedReq.currentSession
      ? timingSafeMatch(authenticatedReq.currentSession.csrfToken, headerCsrf)
      : true;

    if (!cookieCsrf || !headerCsrf || !timingSafeMatch(cookieCsrf, headerCsrf) || !sessionBoundOk) {
      await authSessionRepository.recordSecurityAudit(
        authenticatedReq.currentUser ?? null,
        'SECURITY_CSRF_REJECTED',
        fullPath,
        `CSRF token missing or mismatched on ${method} ${fullPath}.`
      );
      res.status(403).json({
        error: 'CSRF validation failed. Refresh security token and retry.',
      });
      return;
    }

    next();
  }

  app.use(securityHeadersMiddleware);
  app.use(requestCorrelationMiddleware(recordRequestTelemetry));
  app.use('/api', apiTimeoutMiddleware(options?.requestTimeoutMs ?? 15_000));
  app.use(asyncHandler(attachSession));
  app.use('/api', asyncHandler(requireCsrfAndSameOrigin));
  app.use('/api', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }
    if (
      req.path === '/auth/login' ||
      req.path === '/auth/register' ||
      req.path === '/media/upload' ||
      req.path === '/qr/validate'
    ) {
      next();
      return;
    }
    mutationRateMiddleware(req, res, next);
  });

  app.use('/api', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const drainAuditWrites = (thenSend: () => Response): Response => {
      const writes = req.pendingAuditWrites ?? [];
      req.pendingAuditWrites = [];
      if (writes.length === 0) {
        return thenSend();
      }
      void Promise.all(writes)
        .then(() => {
          if (!res.headersSent) {
            thenSend();
          }
        })
        .catch(next);
      return res;
    };

    res.json = ((body: unknown) =>
      drainAuditWrites(() => originalJson(body))) as Response['json'];
    res.send = ((body?: unknown) =>
      drainAuditWrites(() => originalSend(body))) as Response['send'];
    next();
  });

  // Validated media upload endpoint (auth + CSRF + upload rate limit before parsing 26MB JSON)
  app.post(
    '/api/media/upload',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (options?.disableMediaProcessing) {
        res.status(503).json({
          error: 'MEDIA_PROCESSING_UNAVAILABLE',
          message: 'Media storage and FFmpeg execution are not configured for this Worker.',
        });
        return;
      }
      next();
    },
    uploadRateMiddleware,
    express.json({ limit: '26mb' }),
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(mediaUploadSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = saveValidatedMediaUpload({
          dataBase64: parsed.data.dataBase64,
          declaredKind: parsed.data.declaredKind,
          uploadsDir,
          storageBackend: mediaStorageBackend,
        });
        store.recordMediaUploadAudit(
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

  // Serve strictly validated uploaded media with hardened CSP, CORP, and nosniff headers
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const resolved = resolveSafeUploadPath(req.params.filename, uploadsDir);
    if (!resolved) {
      res.status(404).json({ error: 'Uploaded media asset not found.' });
      return;
    }
    for (const [header, value] of Object.entries(STATIC_ASSET_SECURITY_HEADERS)) {
      res.setHeader(header, value);
    }
    res.setHeader('Content-Type', resolved.contentType);
    res.sendFile(resolved.fullPath);
  });

  app.use(express.json({ limit: '1mb' }));

  // Health & prototype status
  app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
    const live = await getLiveReportSnapshot();
    const storageBackend = store.getStorageBackendMetadata();
    res.json({
      ok: true,
      service: 'edison-prototype-server',
      phase: live.phase,
      block: live.block,
      storageBackend,
      progressMetrics: live.progressMetrics,
      summary: live.summary,
    });
  }));

  // Live non-sensitive formal report snapshot for Reports & Copy Console
  app.get('/api/reports/live', asyncHandler(async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await getLiveReportSnapshot());
  }));

  // Read-only governance & architecture documentation endpoints (strict allowlist of 25 Markdown files)
  app.get('/api/docs', asyncHandler(async (_req: Request, res: Response) => {
    if (options?.governanceDocRepository) {
      res.json({ items: await options.governanceDocRepository.listGovernanceDocs() });
      return;
    }
    try {
      res.json({ items: listGovernanceDocs() });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 500);
      res.status(code).json({ error: message });
    }
  }));

  app.get('/api/docs/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      if (options?.governanceDocRepository) {
        const meta = getGovernanceDocMetadata(req.params.id);
        if (!meta) {
          res.status(404).json({ error: 'Governance document not found.' });
          return;
        }
        const doc = await options.governanceDocRepository.getGovernanceDocById(meta.id);
        if (!doc) {
          res.status(404).json({ error: 'Governance document not found.' });
          return;
        }
        res.json({ item: doc });
        return;
      }
      const doc = getGovernanceDocById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Governance document not found.' });
        return;
      }
      res.json({ item: doc });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 500);
      res.status(code).json({ error: message });
    }
  }));

  // Auth, CSRF Bootstrap & RBAC endpoints
  app.get('/api/auth/csrf', (req: AuthenticatedRequest, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const csrfToken =
      req.currentSession?.csrfToken || cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
    res.cookie(
      CSRF_COOKIE_NAME,
      csrfToken,
      buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
    );
    res.json({ csrfToken });
  });

  app.get('/api/auth/me', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.currentSession?.csrfToken) {
      const cookies = parseCookies(req.headers.cookie);
      if (!timingSafeMatch(req.currentSession.csrfToken, cookies[CSRF_COOKIE_NAME])) {
        res.cookie(
          CSRF_COOKIE_NAME,
          req.currentSession.csrfToken,
          buildHardenedCookieOptions(req, { httpOnly: false, maxAgeMs: SEVEN_DAYS_MS })
        );
      }
    }
    res.json({
      user: req.currentUser ?? null,
      csrfToken: req.currentSession?.csrfToken ?? null,
      summary: await getFoundationSummary(),
    });
  }));

  app.post(
    '/api/auth/register',
    authRateMiddleware,
    asyncHandler(async (req, res, next) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(registerSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }

      try {
        const { user, session } = await authSessionRepository.registerUser(
          parsed.data,
          authenticatedReq.sessionToken
        );
        if (user.role !== 'household_viewer') {
          const profile = store.getAdvertiserProfile(user);
          if (domainRecordRepository) {
            await domainRecordRepository.putAdvertiserProfile(profile);
          }
        }
        setAuthCookies(req, res, session.token, session.csrfToken);
        res.status(201).json({
          user,
          token: session.token,
          csrfToken: session.csrfToken,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to register user.';
        if (message.startsWith('FORBIDDEN:') || message.includes('already exists')) {
          res.status(message.startsWith('FORBIDDEN:') ? 403 : 409).json({
            error: message,
          });
          return;
        }
        next(err);
      }
    })
  );

  app.post(
    '/api/auth/login',
    authRateMiddleware,
    asyncHandler(async (req, res, next) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(loginSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }

      try {
        const { user, session } = await authSessionRepository.loginUser(
          parsed.data.email,
          parsed.data.password,
          authenticatedReq.sessionToken
        );
        setAuthCookies(req, res, session.token, session.csrfToken);
        res.json({
          user,
          token: session.token,
          csrfToken: session.csrfToken,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid credentials.';
        if (message === 'Invalid email or password.' || message.startsWith('FORBIDDEN:')) {
          res.status(message.startsWith('FORBIDDEN:') ? 403 : 401).json({
            error: message,
          });
          return;
        }
        next(err);
      }
    })
  );

  app.post(
    '/api/auth/logout',
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      await authSessionRepository.logoutSession(authenticatedReq.sessionToken);
      res.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(req, true));
      res.clearCookie(CSRF_COOKIE_NAME, buildClearCookieOptions(req, false));
      res.json({ ok: true });
    })
  );

  // QR Destination Validation & Management
  app.post('/api/qr/validate', redirectRateMiddleware, (req: Request, res: Response) => {
    const parsed = parseWithZod(qrValidateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const result = validateQrDestination(
      parsed.data.rawInput,
      parsed.data.destinationType as QrDestinationType
    );
    res.json(result);
  });

  app.get(
    '/api/qr',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      if (!domainRecordRepository) {
        res.json({ items: store.listQrLinksForUser(user) });
        return;
      }
      const items = await domainRecordRepository.listQrLinksForActor(user);
      res.json({ items });
    })
  );

  app.post(
    '/api/qr',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(qrCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const record = store.createQrLink(authenticatedReq.currentUser!, {
          label: parsed.data.label,
          destinationType: parsed.data.destinationType as QrDestinationType,
          rawInput: parsed.data.rawInput,
        });
        if (domainRecordRepository) await domainRecordRepository.putQrLink(record);
        res.status(201).json({ item: record });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Invalid QR destination.',
        });
      }
    })
  );

  app.patch(
    '/api/qr/:token/status',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(qrStatusPatchSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const updated = store.updateQrStatus(
          authenticatedReq.currentUser!,
          req.params.token,
          parsed.data.status
        );
        if (domainRecordRepository) {
          await domainRecordRepository.putQrLink(updated);
        }
        res.json({ item: updated });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 404);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- Advertiser Profile Endpoints (Block 2.2) ---
  app.get(
    '/api/advertiser/profile',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const fallback = store.getAdvertiserProfile(authenticatedReq.currentUser!);
      if (!domainRecordRepository) {
        res.json({ profile: fallback });
        return;
      }
      const profile =
        (await domainRecordRepository.getAdvertiserProfile(authenticatedReq.currentUser!.id)) ??
        fallback;
      res.json({ profile });
    })
  );

  app.put(
    '/api/advertiser/profile',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(advertiserProfilePutSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const profile = store.upsertAdvertiserProfile(authenticatedReq.currentUser!, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putAdvertiserProfile(profile);
        }
        res.json({ profile });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/admin/advertiser-profiles',
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const items = domainRecordRepository
          ? await domainRecordRepository.listAdvertiserProfiles()
          : store.listAllAdvertiserProfiles();
        res.json({ items });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/admin/advertiser-profiles/:userId/verification',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminVerifyProfileSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const profile = store.adminUpdateAdvertiserVerification(
          req.currentUser!,
          req.params.userId,
          parsed.data.status,
          parsed.data.notes
        );
        res.json({ profile });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Campaign Management Endpoints (Block 2.2) ---
  app.get(
    '/api/campaigns',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsedQuery = parseWithZod(campaignQuerySchema, {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      if (!parsedQuery.ok) {
        sendValidationError(res, parsedQuery);
        return;
      }
      const items = domainRecordRepository
        ? await domainRecordRepository.listCampaignsForUser(
            authenticatedReq.currentUser!,
            parsedQuery.data.status
          )
        : store.listCampaignsForUser(
            authenticatedReq.currentUser!,
            parsedQuery.data.status
          );
      res.json({
        items,
        statuses: ALL_CAMPAIGN_STATUSES,
        transitions: ALLOWED_CAMPAIGN_TRANSITIONS,
      });
    })
  );

  app.post(
    '/api/campaigns',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(campaignCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.createCampaign(authenticatedReq.currentUser!, {
          title: d.title,
          contentCategory: d.contentCategory,
          summary: d.summary,
          qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
          durationSeconds: d.durationSeconds,
          dailyFrequencyCap: d.dailyFrequencyCap,
          targetRegions: Array.isArray(d.targetRegions)
            ? d.targetRegions
            : d.targetRegions.split(','),
          dayparts: d.dayparts,
          startDate: d.startDate,
          endDate: d.endDate,
        });
        if (domainRecordRepository) await domainRecordRepository.putCampaign(item);
        res.status(201).json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/campaigns/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(campaignUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.updateCampaign(authenticatedReq.currentUser!, req.params.id, {
          title: d.title,
          contentCategory: d.contentCategory,
          summary: d.summary,
          qrToken: d.qrToken !== undefined ? (d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null) : undefined,
          durationSeconds: d.durationSeconds,
          dailyFrequencyCap: d.dailyFrequencyCap,
          targetRegions:
            d.targetRegions === undefined
              ? undefined
              : Array.isArray(d.targetRegions)
              ? d.targetRegions
              : d.targetRegions.split(','),
          dayparts: d.dayparts,
          startDate: d.startDate,
          endDate: d.endDate,
        });
        if (domainRecordRepository) await domainRecordRepository.putCampaign(item);
        res.json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/campaigns/:id/clone',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      try {
        const item = store.cloneCampaign(authenticatedReq.currentUser!, req.params.id);
        if (domainRecordRepository) await domainRecordRepository.putCampaign(item);
        res.status(201).json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/campaigns/:id/transition',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(campaignTransitionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.transitionCampaignStatus(
          authenticatedReq.currentUser!,
          req.params.id,
          parsed.data.targetStatus,
          {
            rejectionReason: parsed.data.rejectionReason,
            fixInstructions: parsed.data.fixInstructions,
          }
        );
        if (domainRecordRepository) await domainRecordRepository.putCampaign(item);
        res.json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.delete(
    '/api/campaigns/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      try {
        store.deleteCampaign(authenticatedReq.currentUser!, req.params.id);
        if (domainRecordRepository) {
          await domainRecordRepository.deleteCampaign(req.params.id);
        }
        res.json({ ok: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- 16:9 TV Preview Gate & Commercial-Break Simulator Telemetry (Block 2.4) ---
  app.get(
    '/api/campaigns/:id/preview-gate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const gate = store.evaluateCampaignPreSubmitGate(req.currentUser!, req.params.id);
        res.json({ gate });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/simulator/events',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(simulatorEventSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const event = store.recordSimulatedPlaybackEvent(req.currentUser!, {
        campaignId:
          parsed.data.campaignId && parsed.data.campaignId.trim()
            ? parsed.data.campaignId.trim()
            : null,
        qrToken:
          parsed.data.qrToken && parsed.data.qrToken.trim()
            ? parsed.data.qrToken.trim()
            : null,
        eventType: parsed.data.eventType,
      });
      if (domainRecordRepository) {
        await domainRecordRepository.putAnalyticsEvent(event, req.currentUser!.id);
      }
      res.status(201).json({ event });
    }),
  );

  app.post(
    '/api/simulator/schedule-break',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(simulatorBreakScheduleSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const plan = store.planSimulatedBreak(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ plan });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  // --- Advertisement Creation Studio Endpoints (Block 2.3) ---
  app.get(
    '/api/ad-creatives',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const items = domainRecordRepository
        ? await domainRecordRepository.listAdCreativesForUser(authenticatedReq.currentUser!)
        : store.listAdCreativesForUser(authenticatedReq.currentUser!);
      res.json({ items });
    })
  );

  app.post(
    '/api/ad-creatives',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(adCreativeSaveSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.saveAdCreative(authenticatedReq.currentUser!, {
          campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
          qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
          title: d.title,
          mode: d.mode,
          displayDurationSeconds: d.displayDurationSeconds,
          safeZoneWarnings: d.safeZoneWarnings,
          contrastWarnings: d.contrastWarnings,
          optionA: d.mode === 'option_a_studio' ? (d.optionA as unknown as OptionAComposition) : null,
          optionB: d.mode === 'option_b_upload' ? (d.optionB as unknown as OptionBUploadSpec) : null,
          textOnly:
            d.mode === 'text_only_commercial'
              ? (d.textOnly as unknown as TextOnlyCommercialSpec)
              : null,
        });
        if (domainRecordRepository) await domainRecordRepository.putAdCreative(item);
        res.status(201).json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.put(
    '/api/ad-creatives/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(adCreativeSaveSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.saveAdCreative(authenticatedReq.currentUser!, {
          id: req.params.id,
          campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
          qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
          title: d.title,
          mode: d.mode,
          displayDurationSeconds: d.displayDurationSeconds,
          safeZoneWarnings: d.safeZoneWarnings,
          contrastWarnings: d.contrastWarnings,
          optionA: d.mode === 'option_a_studio' ? (d.optionA as unknown as OptionAComposition) : null,
          optionB: d.mode === 'option_b_upload' ? (d.optionB as unknown as OptionBUploadSpec) : null,
          textOnly:
            d.mode === 'text_only_commercial'
              ? (d.textOnly as unknown as TextOnlyCommercialSpec)
              : null,
        });
        if (domainRecordRepository) await domainRecordRepository.putAdCreative(item);
        res.json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/ad-creatives/:id/attach',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(adCreativeAttachSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.attachAdCreativeToCampaign(
          authenticatedReq.currentUser!,
          req.params.id,
          parsed.data.campaignId
        );
        if (domainRecordRepository) {
          await domainRecordRepository.putAdCreative(result.creative);
          await domainRecordRepository.putCampaign(result.campaign);
        }
        res.json(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.delete(
    '/api/ad-creatives/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      try {
        store.deleteAdCreative(authenticatedReq.currentUser!, req.params.id);
        if (domainRecordRepository) {
          await domainRecordRepository.deleteAdCreative(req.params.id);
        }
        res.json({ ok: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- Support & Dispute Tickets (Block 2.2) ---
  app.get(
    '/api/support-tickets',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const items = domainRecordRepository
        ? await domainRecordRepository.listSupportTicketsForUser(authenticatedReq.currentUser!)
        : store.listSupportTicketsForUser(authenticatedReq.currentUser!);
      res.json({ items });
    })
  );

  app.post(
    '/api/support-tickets',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(supportTicketCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.createSupportTicket(authenticatedReq.currentUser!, {
          campaignId: d.campaignId && d.campaignId.trim() ? d.campaignId.trim() : null,
          category: d.category,
          subject: d.subject,
          message: d.message,
        });
        if (domainRecordRepository) await domainRecordRepository.putSupportTicket(item);
        res.status(201).json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/support-tickets/:id/status',
    requireAuth,
    asyncHandler(async (req, res) => {
      const authenticatedReq = req as AuthenticatedRequest;
      const parsed = parseWithZod(supportTicketStatusSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.updateSupportTicketStatus(
          authenticatedReq.currentUser!,
          req.params.id,
          parsed.data.status,
          parsed.data.adminResponse
        );
        if (domainRecordRepository) await domainRecordRepository.putSupportTicket(item);
        res.json({ item });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.startsWith('D1_APPLICATION_RECORD') || errorMessage.startsWith('D1_DOMAIN')) {
          throw err;
        }
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- Opportunity Management, 3-Tier Verification, Complaints & Appeals (Block 2.5) ---
  app.get(
    '/api/opportunities',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.json({
        items: domainRecordRepository
          ? await domainRecordRepository.listOpportunitiesForUser(user)
          : store.listOpportunitiesForUser(user),
        categories: ALL_OPPORTUNITY_CATEGORIES,
      });
    })
  );

  app.post(
    '/api/opportunities',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(opportunityCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      try {
        const item = store.createOpportunity(user, {
          providerType: d.providerType,
          providerName: d.providerName,
          category: d.category,
          title: d.title,
          description: d.description,
          location: d.location,
          eligibilityRequirements: d.eligibilityRequirements,
          applicationMethod: d.applicationMethod,
          contactInfo: d.contactInfo,
          qrToken: d.qrToken && d.qrToken.trim() ? d.qrToken.trim() : null,
          linkedCampaignId:
            d.linkedCampaignId && d.linkedCampaignId.trim() ? d.linkedCampaignId.trim() : null,
          closingDate: d.closingDate,
          expiryDate: d.expiryDate,
          identityEvidenceRef: d.identityEvidenceRef,
          organisationEvidenceRef: d.organisationEvidenceRef,
          specificOpportunityEvidenceRef: d.specificOpportunityEvidenceRef,
          applicationFeeFreeConfirmed: d.applicationFeeFreeConfirmed,
          noGuaranteeConfirmed: d.noGuaranteeConfirmed,
        });
        if (domainRecordRepository) await domainRecordRepository.putOpportunity(item);
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/opportunities/:id/submit',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const item = store.submitOpportunity(
          (req as AuthenticatedRequest).currentUser!,
          req.params.id
        );
        if (domainRecordRepository) await domainRecordRepository.putOpportunity(item);
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.delete(
    '/api/opportunities/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        store.deleteOpportunity((req as AuthenticatedRequest).currentUser!, req.params.id);
        if (domainRecordRepository) {
          await domainRecordRepository.deleteOpportunity(req.params.id);
        }
        res.json({ ok: true });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/admin/opportunities/:id/verify-tiers',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(adminVerifyTiersSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.adminUpdateOpportunityVerification(
          (req as AuthenticatedRequest).currentUser!,
          req.params.id,
          parsed.data
        );
        if (domainRecordRepository) await domainRecordRepository.putOpportunity(item);
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/opportunity-complaints',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.json({
        items: domainRecordRepository
          ? await domainRecordRepository.listOpportunityComplaintsForUser(user)
          : store.listOpportunityComplaintsForUser(user),
      });
    })
  );

  app.post(
    '/api/opportunities/:id/complaints',
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(complaintCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.createOpportunityComplaint(
          (req as AuthenticatedRequest).currentUser!,
          req.params.id,
          parsed.data
        );
        if (domainRecordRepository) await domainRecordRepository.putOpportunityComplaint(item);
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/admin/opportunity-complaints/:complaintId',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(adminComplaintUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.adminUpdateComplaintStatus(
          (req as AuthenticatedRequest).currentUser!,
          req.params.complaintId,
          parsed.data
        );
        if (domainRecordRepository) {
          await domainRecordRepository.putOpportunityComplaint(result.complaint);
          if (result.opportunity) {
            await domainRecordRepository.putOpportunity(result.opportunity);
          }
        }
        res.json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/opportunity-appeals',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.json({
        items: domainRecordRepository
          ? await domainRecordRepository.listOpportunityAppealsForUser(user)
          : store.listOpportunityAppealsForUser(user),
      });
    })
  );

  app.post(
    '/api/opportunities/:id/appeals',
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(appealCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.createOpportunityAppeal(
          (req as AuthenticatedRequest).currentUser!,
          req.params.id,
          parsed.data
        );
        if (domainRecordRepository) await domainRecordRepository.putOpportunityAppeal(item);
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/admin/opportunity-appeals/:appealId',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(adminAppealResolveSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.adminResolveAppeal(
          (req as AuthenticatedRequest).currentUser!,
          req.params.appealId,
          parsed.data
        );
        if (domainRecordRepository) {
          await domainRecordRepository.putOpportunityAppeal(result.appeal);
          if (result.opportunity) {
            await domainRecordRepository.putOpportunity(result.opportunity);
          }
        }
        res.json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // Admin Moderation Overview, QR Moderation, Creative Flag Clearance & 7-Stage Analytics (Block 2.6)
  app.get(
    '/api/admin/moderation-overview',
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const admin = req.currentUser!;
        const persistedData = domainRecordRepository
          ? await Promise.all([
              domainRecordRepository.listCampaignsForUser(admin),
              domainRecordRepository.listAdCreativesForUser(admin),
              domainRecordRepository.listAdvertiserProfiles(),
              domainRecordRepository.listQrLinksForActor(admin),
              domainRecordRepository.listSupportTicketsForUser(admin),
              domainRecordRepository.listOpportunityComplaintsForUser(admin),
              domainRecordRepository.listOpportunityAppealsForUser(admin),
            ]).then(
              ([
                campaigns,
                creatives,
                advertiserProfiles,
                qrLinks,
                supportTickets,
                opportunityComplaints,
                opportunityAppeals,
              ]) => ({
                campaigns,
                creatives,
                advertiserProfiles,
                qrLinks,
                supportTickets,
                opportunityComplaints,
                opportunityAppeals,
              }),
            )
          : undefined;
        res.json(store.getAdminModerationOverview(admin, persistedData));
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.patch(
    '/api/admin/qr/:token/moderate',
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminQrModerateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        if (domainRecordRepository) {
          const persistedQr = await domainRecordRepository.getQrLinkByToken(req.params.token);
          if (persistedQr) store.replaceQrLinkFromPersistence(persistedQr);
        }
        const item = store.adminModerateQrLink(
          req.currentUser!,
          req.params.token,
          parsed.data.status,
          parsed.data.reason
        );
        if (domainRecordRepository) await domainRecordRepository.putQrLink(item);
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.post(
    '/api/admin/creatives/:id/clear-qr-flag',
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(adminClearQrFlagSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        if (domainRecordRepository) {
          const persistedCreative = await domainRecordRepository.getAdCreativeById(req.params.id);
          if (persistedCreative) store.replaceAdCreativeFromPersistence(persistedCreative);
        }
        const item = store.adminClearCreativeQrFlag(
          req.currentUser!,
          req.params.id,
          parsed.data.notes
        );
        if (domainRecordRepository) await domainRecordRepository.putAdCreative(item);
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.get(
    '/api/analytics/funnel',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const campaignId =
        typeof req.query.campaignId === 'string' && req.query.campaignId.trim()
          ? req.query.campaignId.trim()
          : null;
      try {
        const persistedData = domainRecordRepository
          ? await Promise.all([
              domainRecordRepository.listCampaignsForUser(req.currentUser!),
              domainRecordRepository.listQrLinksForActor(req.currentUser!),
              domainRecordRepository.listAnalyticsEvents(500),
            ]).then(([campaigns, qrLinks, analyticsEvents]) => ({
              campaigns,
              qrLinks,
              analyticsEvents,
            }))
          : undefined;
        res.json(
          store.getSevenStageAnalyticsFunnel(
            req.currentUser!,
            campaignId,
            persistedData,
          ),
        );
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.get(
    '/api/analytics/revenue-ledger',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const actor = req.currentUser!;
        const persistedData = domainRecordRepository
          ? await Promise.all([
              domainRecordRepository.listCampaignsForUser(actor),
              domainRecordRepository.listAnalyticsEvents(500),
            ]).then(([campaigns, analyticsEvents]) => ({ campaigns, analyticsEvents }))
          : undefined;
        res.json({ ledger: store.getRevenueLedgerSnapshot(actor, persistedData) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- Physical Mobile QR Scan Testing & Final Prototype Readiness (Block 2.7 / Block P3-A) ---
  app.get(
    '/api/qa/prototype-readiness',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      try {
        if (domainRecordRepository) {
          const [
            physicalQrScanTests,
            campaigns,
            adCreatives,
            opportunities,
            analyticsEvents,
            qrLinks,
          ] = await Promise.all([
            domainRecordRepository.listPhysicalQrScanTestsForUser(user),
            domainRecordRepository.listCampaignsForUser(user),
            domainRecordRepository.listAdCreativesForUser(user),
            domainRecordRepository.listOpportunitiesForUser(user),
            domainRecordRepository.listAnalyticsEvents(500),
            domainRecordRepository.listQrLinksForActor(user),
          ]);
          res.json(
            store.getPrototypeReadinessSnapshot(user, {
              physicalQrScanTests,
              campaigns,
              adCreatives,
              opportunities,
              analyticsEvents,
              qrLinks,
            })
          );
          return;
        }
        res.json(store.getPrototypeReadinessSnapshot(user));
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/qa/qr-watch/:token',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const actor = req.currentUser!;
        if (!domainRecordRepository) {
          res.json(store.getQrWatchSnapshot(actor, req.params.token));
          return;
        }

        const qrLink = await domainRecordRepository.getQrLinkByToken(req.params.token);
        if (!qrLink) throw new Error('QR token not found.');
        if (actor.role !== 'admin' && qrLink.ownerId !== actor.id) {
          throw new Error('FORBIDDEN: You do not own this QR link.');
        }
        const recentEvents = (await domainRecordRepository.listAnalyticsEvents(500))
          .filter(
            (event) =>
              event.qrToken === req.params.token &&
              event.measurementSource === 'real_measured',
          )
          .slice(0, 20);
        res.json({ qrLink, recentEvents });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err, 404);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.get(
    '/api/qa/physical-qr-tests',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      try {
        const items = domainRecordRepository
          ? await domainRecordRepository.listPhysicalQrScanTestsForUser(user)
          : store.listPhysicalQrScanTests(user);
        res.json({ items });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/qa/physical-qr-tests',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(physicalQrTestCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        if (domainRecordRepository) {
          const qrLink = await domainRecordRepository.getQrLinkByToken(parsed.data.qrToken);
          if (qrLink) store.replaceQrLinkFromPersistence(qrLink);
        }
        const item = store.recordPhysicalQrScanTest(user, parsed.data);
        if (domainRecordRepository) await domainRecordRepository.putPhysicalQrScanTest(item);
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.delete(
    '/api/qa/physical-qr-tests/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      try {
        let persistedRecord: PhysicalQrScanTestRecord | null = null;
        if (domainRecordRepository) {
          persistedRecord = await domainRecordRepository.getPhysicalQrScanTestForActor(
            user,
            req.params.id
          );
          if (persistedRecord) {
            const records = await domainRecordRepository.listPhysicalQrScanTestsForUser(user);
            store.replacePhysicalQrScanTestsFromPersistence(user, records);
          }
        }
        store.deletePhysicalQrScanTest(user, req.params.id);
        if (persistedRecord && domainRecordRepository) {
          await domainRecordRepository.deletePhysicalQrScanTest(user, req.params.id);
        }
        res.json({ ok: true });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // --- Shared Ad Intelligence Prototype Preview (Block P2-V2.4 / MOCK SIMULATION ONLY) ---
  app.get(
    '/api/shared-intelligence/preview',
    requireAuth,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      if (domainRecordRepository) {
        const persisted = await domainRecordRepository.getSharedIntelPreviewState();
        if (persisted) store.replaceSharedIntelPreviewStateFromPersistence(persisted);
      }
      res.json(store.getSharedIntelPreviewState());
    }),
  );

  app.post(
    '/api/shared-intelligence/observations',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const rawBody = (req.body ?? {}) as Record<string, unknown>;
      const parsed = parseWithZod(sharedIntelObservationSchema, rawBody);
      if (!parsed.ok) {
        if (parsed.error.includes('Zero-PII policy violation')) {
          store.recordSharedIntelPiiRejection(
            typeof rawBody.scopeId === 'string' ? rawBody.scopeId : undefined,
            parsed.error
          );
          if (domainRecordRepository) {
            await domainRecordRepository.putSharedIntelPreviewState(
              store.getSharedIntelPreviewState(),
            );
          }
        }
        sendValidationError(res, parsed);
        return;
      }

      try {
        if (domainRecordRepository) {
          const persisted = await domainRecordRepository.getSharedIntelPreviewState();
          if (persisted) store.replaceSharedIntelPreviewStateFromPersistence(persisted);
        }
        const result = store.submitSharedIntelPreviewObservation(req.currentUser!, {
          ...parsed.data,
          rawPayload: rawBody,
        });
        if (domainRecordRepository) {
          await domainRecordRepository.putSharedIntelPreviewState(result.state);
        }
        res.status(201).json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.post(
    '/api/shared-intelligence/simulate-action',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(sharedIntelActionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        if (domainRecordRepository) {
          const persisted = await domainRecordRepository.getSharedIntelPreviewState();
          if (persisted) store.replaceSharedIntelPreviewStateFromPersistence(persisted);
        }
        const state = store.runSharedIntelPreviewAction(req.currentUser!, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putSharedIntelPreviewState(state);
        }
        res.json({ state });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }),
  );

  // --- Software-Only Phase 4 Modular TV Adapter & AURA Normal Everyday Remote Simulator (Block P3-C) ---
  app.get('/api/tv-adapters/profiles', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      stageP6Deferred: true,
      profiles: edisonTvControlEngine.listCapabilityProfiles(),
    });
  });

  app.post(
    '/api/tv-adapters/remote-simulate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvRemoteSimulateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      const result = edisonTvControlEngine.dispatchRemoteCommand({
        platformId: d.platformId,
        intentSource: d.intentSource,
        command: d.command,
        targetInput: d.targetInput,
        faultMode: d.faultMode,
        simulateActiveAdSession: d.simulateActiveAdSession,
        currentState: d.currentState,
      });
      recordRouteAudit(req,
        req.currentUser!,
        'TV_ADAPTER_REMOTE_SIMULATED',
        d.platformId,
        `[${req.requestId ?? 'req'}] ${d.intentSource} -> ${d.command} (fault=${d.faultMode}, outcome=${result.restorationOutcome})`
      );
      res.json(result);
    }
  );

  // --- Phase 4 Block 4.1: Software-First Smart TV Adapter Harnesses & Local Offline Intelligence Cache ---
  app.post(
    '/api/tv-adapters/break-lifecycle',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvBreakLifecycleSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const d = parsed.data;
      const result = edisonTvControlEngine.runBreakLifecycle({
        platformId: d.platformId,
        action: d.action,
        faultMode: d.faultMode,
        currentState: d.currentState,
      });
      recordRouteAudit(req,
        req.currentUser!,
        'TV_ADAPTER_BREAK_LIFECYCLE',
        d.platformId,
        `[${req.requestId ?? 'req'}] ${d.action} (${result.harnessTelemetry.harnessName}, fault=${d.faultMode}, phase=${result.harnessTelemetry.harnessPhase})`
      );
      res.json(result);
    }
  );

  app.post(
    '/api/tv-adapters/fault-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvFaultSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = edisonTvControlEngine.runDeterministicFaultSuite(parsed.data.platformId);
      recordRouteAudit(req,
        req.currentUser!,
        'TV_ADAPTER_FAULT_SUITE_RUN',
        parsed.data.platformId ?? 'all_platforms',
        `[${req.requestId ?? 'req'}] Deterministic fault suite ${report.passedCases}/${report.totalCases} passed (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  app.get(
    '/api/offline-intel-cache/state',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(localOfflineIntelCache.getSnapshot());
    }
  );

  app.post(
    '/api/offline-intel-cache/stage-swap',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheStageSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = localOfflineIntelCache.stageAndAtomicSwap(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        result.ok ? 'OFFLINE_CACHE_ATOMIC_SWAP' : 'OFFLINE_CACHE_SWAP_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.status(result.ok ? 200 : 400).json({
        ...result,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/rollback',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheRollbackSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = localOfflineIntelCache.rollbackScope(parsed.data.scopeId);
      recordRouteAudit(req,
        req.currentUser!,
        result.ok ? 'OFFLINE_CACHE_ROLLBACK' : 'OFFLINE_CACHE_ROLLBACK_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.status(result.ok ? 200 : 400).json({
        ...result,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/evaluate-break',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineCacheEvaluateBreakSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const evaluation = localOfflineIntelCache.evaluateOfflineBreakEligibility(parsed.data);
      res.json({
        ...evaluation,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  // --- Phase 4 Block 4.2: Offline Telemetry Sync Queue, Multi-Channel Cadence & Conformance Vectors ---
  app.get('/api/tv-adapters/channels', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      channels: edisonTvControlEngine.listChannelBindings(),
    });
  });

  app.post(
    '/api/offline-intel-cache/queue-observation',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineQueueEnqueueSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const queued = localOfflineIntelCache.enqueueOfflineObservation(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        queued.ok
          ? queued.deduplicatedReplay
            ? 'OFFLINE_QUEUE_REPLAY_DEDUPED'
            : 'OFFLINE_QUEUE_OBSERVATION_ADDED'
          : 'OFFLINE_QUEUE_REJECTED',
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${queued.detail}`
      );
      res.status(queued.ok ? 200 : 400).json({
        ...queued,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/offline-intel-cache/drain-queue',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(offlineQueueDrainSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const drain = localOfflineIntelCache.drainObservationQueue(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        drain.ok ? 'OFFLINE_QUEUE_DRAINED' : 'OFFLINE_QUEUE_DRAIN_OFFLINE_HELD',
        'all_scopes',
        `[${req.requestId ?? 'req'}] ${drain.detail}`
      );
      res.json({
        ...drain,
        state: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/tv-adapters/cadence-simulate',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvCadenceSimulateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = edisonTvControlEngine.runBroadcastCadenceSimulation(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        'TV_ADAPTER_CADENCE_SIMULATED',
        `${parsed.data.platformId}:ch${parsed.data.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${result.detail}`
      );
      res.json({
        ...result,
        cacheState: localOfflineIntelCache.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/tv-adapters/conformance-vectors',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(tvConformanceVectorsSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = edisonTvControlEngine.runEmulatorConformanceVectors();
      recordRouteAudit(req,
        req.currentUser!,
        'TV_EMULATOR_CONFORMANCE_RUN',
        'all_platforms',
        `[${req.requestId ?? 'req'}] Ran ${report.passedVectors}/${report.totalVectors} emulator conformance vectors (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // Block 4.3: Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & Phase 4 Software Exit Gate
  app.post(
    '/api/tv-adapters/parse-cue',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(broadcastCueParseSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = parseAndValidateBroadcastCue(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        'BROADCAST_CUE_FIXTURE_PARSED',
        `${parsed.data.standard}:ch${parsed.data.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${result.action}: ${result.reason}`
      );
      res.json(result);
    }
  );

  app.post(
    '/api/tv-adapters/evaluate-policy',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(companionPolicyEvalSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const evaluation = evaluateCompanionPolicyGuardrail(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        'COMPANION_POLICY_EVALUATED',
        `${parsed.data.platformId}:${parsed.data.requestedCapability}`,
        `[${req.requestId ?? 'req'}] ${evaluation.decision}: ${evaluation.reason}`
      );
      res.json(evaluation);
    }
  );

  app.post(
    '/api/tv-adapters/phase4-exit-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(phase4ExitSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPhase4SoftwareExitSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'PHASE4_SOFTWARE_EXIT_SUITE_RUN',
        'phase4_exit',
        `[${req.requestId ?? 'req'}] Phase 4 software exit suite: ${report.passedChecks}/${report.totalChecks} checks passed (softwareExitReady=${report.softwareExitReady}, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // --- Phase 5 Block 5.1: Production Network-Wide Shared Ad Intelligence Fleet Service (ADR-016 / PRD-19) ---
  app.get(
    '/api/shared-intel-fleet/state',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(fleetService.getSnapshot());
    }
  );

  app.get(
    '/api/shared-intel-fleet/break-events',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetBreakEventSyncQuerySchema, req.query);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const sync = fleetService.getSharedBreakEvents(parsed.data);
      res.status(sync.httpStatus).json(sync);
    }
  );

  app.post(
    '/api/shared-intel-fleet/devices/register',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetDeviceRegisterSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const reg = fleetService.registerAttestedDevice(parsed.data);
        recordRouteAudit(req,
          req.currentUser!,
          'FLEET_DEVICE_ATTESTATION_REGISTERED',
          parsed.data.tvDeviceId,
          `[${req.requestId ?? 'req'}] Registered attested TV ${parsed.data.tvDeviceId} (${parsed.data.country}/${parsed.data.platform}) for scope ${parsed.data.assignedScopeId}.`
        );
        res.status(201).json({
          ...reg,
          state: fleetService.getSnapshot(),
        });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/shared-intel-fleet/break-events',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetBreakEventSubmitSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = fleetService.submitSignedBreakEvent(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        `FLEET_BREAK_EVENT_${result.status.toUpperCase()}`,
        result.scopeId,
        `[${req.requestId ?? 'req'}] ${result.tvDeviceId} -> ${result.status} (${result.httpStatus})`
      );
      res.status(result.httpStatus).json({ result });
    }
  );

  app.post(
    '/api/shared-intel-fleet/observations',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const rawBody = (req.body ?? {}) as Record<string, unknown>;
      const parsed = parseWithZod(fleetObservationSubmitSchema, rawBody);
      if (!parsed.ok) {
        if (parsed.error.includes('Zero-PII policy violation')) {
          recordRouteAudit(req,
            req.currentUser!,
            'FLEET_ZERO_PII_REJECTED',
            typeof rawBody.scopeId === 'string' ? rawBody.scopeId : 'unknown',
            `[${req.requestId ?? 'req'}] ${parsed.error}`
          );
        }
        sendValidationError(res, parsed);
        return;
      }

      const d = parsed.data;
      const result = fleetService.submitSignedObservation({
        tvDeviceId: d.tvDeviceId,
        scopeId: d.scopeId,
        signalType: d.signalType,
        estimatedBreakDurationSec: d.estimatedBreakDurationSec,
        transitionLatencyMs: d.transitionLatencyMs,
        nonce: d.nonce,
        signatureHex: d.signatureHex,
        useRegisteredDemoSigner: d.useRegisteredDemoSigner,
        outlierAnomaly: d.outlierAnomaly,
        rawPayload: rawBody,
      });

      recordRouteAudit(req,
        req.currentUser!,
        `FLEET_OBSERVATION_${result.trustDecision.toUpperCase()}`,
        d.scopeId,
        `[${req.requestId ?? 'req'}] ${d.tvDeviceId} -> ${result.trustDecision} (HTTP ${result.httpStatus})`
      );

      res.status(result.httpStatus).json({
        observation: result,
        state: fleetService.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/shared-intel-fleet/sync-delta',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetDeltaSyncSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const sync = fleetService.syncScopedDelta(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        `FLEET_DELTA_SYNC_${sync.status.toUpperCase()}`,
        parsed.data.scopeId,
        `[${req.requestId ?? 'req'}] ${sync.detail}`
      );
      res.status(sync.ok ? 200 : 409).json({
        sync,
        state: fleetService.getSnapshot(),
      });
    }
  );

  app.post(
    '/api/shared-intel-fleet/report-fpr',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(fleetFprReportSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = fleetService.reportPostUpdateFpr(parsed.data);
        recordRouteAudit(req,
          req.currentUser!,
          result.rollbackTriggered ? 'FLEET_AUTO_ROLLBACK_FPR' : 'FLEET_FPR_REPORTED',
          parsed.data.scopeId,
          `[${req.requestId ?? 'req'}] ${result.reason}`
        );
        res.json({
          report: result,
          state: fleetService.getSnapshot(),
        });
      } catch (err) {
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/shared-intel-fleet/scenarios-25-35',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = fleetService.runScenarios25To35Suite();
      recordRouteAudit(req,
        req.currentUser!,
        'SHARED_INTEL_SCENARIOS_25_35_RUN',
        'phase5_shared_intel',
        `[${req.requestId ?? 'req'}] Scenarios 25-35 verified: ${report.passedScenarios}/${report.totalScenarios} passed (hardwareTested=false, stageP6Deferred=true).`
      );
      res.json(report);
    }
  );

  app.post(
    '/api/shared-intel-fleet/reset',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      fleetService.reset();
      recordRouteAudit(req,
        req.currentUser!,
        'FLEET_SERVICE_RESET',
        'phase5_shared_intel',
        `[${req.requestId ?? 'req'}] Reset Shared Intelligence Fleet simulation state.`
      );
      res.json({ state: fleetService.getSnapshot() });
    }
  );

  // Phase 5 Block 5.2: Per-Channel Break Duration ML Lower-Bound (p10/p5) Predictor & Recorded Stream Calibration
  app.get(
    '/api/break-predictor/profiles',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        stageP6Deferred: true,
        profiles: listChannelPredictorProfiles(),
      });
    }
  );

  app.post(
    '/api/break-predictor/predict',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(breakDurationPredictSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const prediction = predictBreakDurationQuantiles(parsed.data);
      recordRouteAudit(req,
        req.currentUser!,
        'BREAK_PREDICTOR_EVALUATED',
        `CH_${prediction.channelNumber}`,
        `[${req.requestId ?? 'req'}] ${prediction.decision}: p5=${prediction.p5Sec}s p10=${prediction.p10Sec}s mean=${prediction.meanSec}s safeWindow=${prediction.effectiveSafeWindowSec}s (hardwareTested=false).`
      );
      res.json(prediction);
    }
  );

  app.post(
    '/api/break-predictor/calibrate-benchmark',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runRecordedStreamCalibrationBenchmark();
      recordRouteAudit(req,
        req.currentUser!,
        'BREAK_CALIBRATION_BENCHMARK_RUN',
        'phase5_break_predictor',
        `[${req.requestId ?? 'req'}] Recorded stream benchmark: ${report.passedFixtures}/${report.totalFixtures} passed, FPR=${report.falsePositiveRatePct}%, MAE=${report.meanAbsoluteErrorSec}s, hardwareTested=false.`
      );
      res.json(report);
    }
  );

  // Phase 6 Block 6.1: Advertising Delivery Infrastructure (CDN Preload Manifests, Frequency Caps, Failover & Idempotent Ingestion)
  app.post(
    '/api/delivery/manifest',
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(deliveryManifestRequestSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const authenticatedReq = req as AuthenticatedRequest;
      const user = authenticatedReq.currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');

      if (parsed.data.householdId) {
        try {
          await synchronizeHouseholdStateFromD1(user, parsed.data.householdId);
          const gate = store.evaluateHouseholdDeliveryGate(
            user,
            parsed.data.householdId,
            parsed.data.expectedConsentEpoch
          );
          if (!gate.allowed) {
            const blockedManifest = edisonDeliveryInfra.compilePreloadManifest({
              platformId: parsed.data.platformId,
              deviceSlotId: parsed.data.deviceSlotId,
              regionCode: parsed.data.regionCode,
              daypart: parsed.data.daypart,
              simulateCdnOutage: parsed.data.simulateCdnOutage,
              campaigns: [],
              creatives: [],
              qrLinks: [],
            });
            recordRouteAudit(authenticatedReq,
              user,
              'DELIVERY_MANIFEST_SUSPENDED_CONSENT',
              gate.household.id,
              `[${authenticatedReq.requestId ?? 'req'}] ${gate.reason}`
            );
            res.json({
              ...blockedManifest,
              householdId: gate.household.id,
              consentEpoch: gate.household.consentEpoch,
              adDeliverySuspended: true,
              suspensionReason: gate.reason,
            });
            if (domainRecordRepository) {
              await domainRecordRepository.putDeliveryManifest(
                {
                  ...blockedManifest,
                  householdId: gate.household.id,
                  consentEpoch: gate.household.consentEpoch,
                  adDeliverySuspended: true,
                  suspensionReason: gate.reason,
                },
                user.id,
              );
            }
            return;
          }
        } catch (err) {
          if (isD1DomainError(err)) throw err;
          const { code, message } = mapErrorStatus(err);
          res.status(code).json({ error: message });
          return;
        }
      }

      const campaigns = domainRecordRepository
        ? await domainRecordRepository.listCampaignsForUser(user)
        : store.listCampaignsForUser(user);
      const creatives = domainRecordRepository
        ? await domainRecordRepository.listAdCreativesForUser(user)
        : store.listAdCreativesForUser(user);
      const qrLinks = domainRecordRepository
        ? await domainRecordRepository.listQrLinksForActor(user)
        : store.listQrLinksForUser(user);
      const manifest = edisonDeliveryInfra.compilePreloadManifest({
        platformId: parsed.data.platformId,
        deviceSlotId: parsed.data.deviceSlotId,
        regionCode: parsed.data.regionCode,
        daypart: parsed.data.daypart,
        simulateCdnOutage: parsed.data.simulateCdnOutage,
        campaigns,
        creatives,
        qrLinks,
      });
      if (domainRecordRepository) {
        await domainRecordRepository.putDeliveryManifest(
          {
            ...manifest,
            householdId: parsed.data.householdId ?? null,
            adDeliverySuspended: false,
            suspensionReason: null,
          },
          user.id,
        );
      }
      recordRouteAudit(authenticatedReq,
        user,
        'DELIVERY_MANIFEST_COMPILED',
        manifest.manifestId,
        `[${authenticatedReq.requestId ?? 'req'}] Platform=${manifest.platformId} region=${manifest.regionCode} edge=${manifest.cdnEdgeStatus} eligible=${manifest.eligibleCount} excluded=${manifest.excludedCount} (hardwareTested=false).`
      );
      res.json({
        ...manifest,
        householdId: parsed.data.householdId ?? null,
        adDeliverySuspended: false,
        suspensionReason: null,
      });
    })
  );

  app.post(
    '/api/delivery/ingest-events',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(deliveryEventIngestBatchSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const result = edisonDeliveryInfra.ingestDeliveryEvents(parsed.data.events);
      recordRouteAudit(req,
        req.currentUser!,
        'DELIVERY_EVENTS_INGESTED',
        'phase6_delivery_ingest',
        `[${req.requestId ?? 'req'}] Batch received=${result.receivedCount} accepted=${result.acceptedNewCount} dedup=${result.deduplicatedReplayCount} rejectedAnomaly=${result.rejectedAnomalyCount}.`
      );
      res.json(result);
    }
  );

  app.get(
    '/api/delivery/metrics',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json(edisonDeliveryInfra.getMetricsSnapshot());
    }
  );

  app.post(
    '/api/delivery/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runDeliveryInfraVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'DELIVERY_INFRA_SUITE_RUN',
        'phase6_delivery_infra',
        `[${req.requestId ?? 'req'}] Phase 6 delivery suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // Phase 7 Block 7.1: Advertiser Operations, Pacing, Pro-Forma Blueprints & SLA Triage (Non-Transactional)
  app.get(
    '/api/advertiser-ops/overview',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const user = req.currentUser!;
      const [persistedProfile, campaigns, qrLinks, tickets, analyticsEvents] =
        domainRecordRepository
          ? await Promise.all([
              domainRecordRepository.getAdvertiserProfile(user.id),
              domainRecordRepository.listCampaignsForUser(user),
              domainRecordRepository.listQrLinksForActor(user),
              domainRecordRepository.listSupportTicketsForUser(user),
              domainRecordRepository.listAnalyticsEvents(250),
            ])
          : [null, null, null, null, null];
      const overview = buildAdvertiserOpsOverview({
        profile: persistedProfile ?? store.getAdvertiserProfile(user),
        campaigns: campaigns ?? store.listCampaignsForUser(user),
        qrLinks: qrLinks ?? store.listQrLinksForUser(user),
        tickets: tickets ?? store.listSupportTicketsForUser(user),
        analyticsEvents: analyticsEvents ?? store.listAnalyticsEvents(250),
      });
      res.json(overview);
    }),
  );

  app.post(
    '/api/advertiser-ops/pro-forma-blueprint',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(proFormaBlueprintRequestSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const user = req.currentUser!;
      const profile = domainRecordRepository
        ? (await domainRecordRepository.getAdvertiserProfile(user.id)) ??
          store.getAdvertiserProfile(user)
        : store.getAdvertiserProfile(user);
      const campaigns = domainRecordRepository
        ? await domainRecordRepository.listCampaignsForUser(user)
        : store.listCampaignsForUser(user);
      const blueprint = generateProFormaInvoiceBlueprint(
        profile,
        campaigns,
        parsed.data.billingPeriodLabel
      );
      recordRouteAudit(req,
        user,
        'PROFORMA_BLUEPRINT_GENERATED',
        blueprint.blueprintId,
        `[${req.requestId ?? 'req'}] Generated non-transactional pro-forma blueprint ${blueprint.blueprintId} ($${blueprint.totalProjectedRateCardUsd.toFixed(2)} simulated; paymentCollectionActive=false).`
      );
      res.json(blueprint);
    }),
  );

  app.post(
    '/api/advertiser-ops/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runAdvertiserOpsVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'ADVERTISER_OPS_SUITE_RUN',
        'phase7_advertiser_ops',
        `[${req.requestId ?? 'req'}] Phase 7 advertiser ops suite: ${report.passedChecks}/${report.totalChecks} passed (paymentCollectionActive=false, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  // --- Phase 8 Block 8.1: Advertisement Creation & Broadcast Rendering Validation (Software-First) ---
  app.get(
    '/api/broadcast-render/overview',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const user = req.currentUser!;
      const creatives = domainRecordRepository
        ? await domainRecordRepository.listAdCreativesForUser(user)
        : store.listAdCreativesForUser(user);
      const qrLinks = domainRecordRepository
        ? await domainRecordRepository.listQrLinksForActor(user)
        : store.listQrLinksForUser(user);
      const overview = buildBroadcastRenderOverview({
        creatives,
        qrLinks,
      });
      res.json(overview);
    }),
  );

  app.post(
    '/api/broadcast-render/validate',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(broadcastRenderValidateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const user = req.currentUser!;
      const visibleCreatives = domainRecordRepository
        ? await domainRecordRepository.listAdCreativesForUser(user)
        : store.listAdCreativesForUser(user);
      let creative = visibleCreatives.find((c) => c.id === parsed.data.creativeId) ?? null;

      if (!creative && user.role !== 'admin') {
        const allAsAdmin = domainRecordRepository
          ? await domainRecordRepository.listAdCreativesForUser({ ...user, role: 'admin' })
          : store.listAdCreativesForUser({ ...user, role: 'admin' });
        if (allAsAdmin.some((c) => c.id === parsed.data.creativeId)) {
          res.status(403).json({
            error: 'FORBIDDEN: You do not own this ad creative.',
          });
          return;
        }
      }

      if (!creative) {
        res.status(404).json({ error: 'Ad creative not found.' });
        return;
      }

      const qrLinks = domainRecordRepository
        ? await domainRecordRepository.listQrLinksForActor({ ...user, role: 'admin' })
        : store.listQrLinksForUser({ ...user, role: 'admin' });
      const qrLink = creative.qrToken
        ? qrLinks.find((q) => q.token === creative!.qrToken) ?? null
        : null;

      const report = validateCreativeForBroadcastRender({
        creative,
        qrLink,
        referenceIso: parsed.data.referenceIso,
      });

      recordRouteAudit(req,
        user,
        'BROADCAST_RENDER_VALIDATED',
        creative.id,
        `[${req.requestId ?? 'req'}] Validated creative ${creative.id} (${creative.mode}): broadcastReady=${report.broadcastReady}, requiresAdminReview=${report.requiresAdminReview}, ffmpegWorkerConnected=false, hardwareTested=false.`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }),
  );

  app.post(
    '/api/broadcast-render/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runBroadcastRenderVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'BROADCAST_RENDER_SUITE_RUN',
        'phase8_broadcast_render',
        `[${req.requestId ?? 'req'}] Phase 8 broadcast render suite: ${report.passedChecks}/${report.totalChecks} passed (ffmpegWorkerConnected=false, hardwareTested=false).`
      );
      res.json(report);
    }
  );

  app.post(
    '/api/render/validate-and-compile',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(renderCompileJobSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const job = store.compileCreativeBroadcastRenderJob(
          req.currentUser!,
          parsed.data.creativeId,
          parsed.data.resolutionProfile
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ job });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/render/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runBroadcastRenderJobVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'BROADCAST_RENDER_JOB_SUITE_RUN',
        'phase8_broadcast_render',
        `[${req.requestId ?? 'req'}] Phase 8 render job suite: ${report.passedChecks}/${report.totalChecks} passed (ffmpegBinaryExecuted=false, hardwareTested=false).`
      );
      res.json({ report });
    }
  );

  // --- Phase 9 Block 9.1: Opportunity Verification Operations Hardening (Software-First) ---
  app.get(
    '/api/opportunity-ops/overview',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const actor = req.currentUser!;
      try {
        const persistedData = domainRecordRepository
          ? await Promise.all([
              domainRecordRepository.listOpportunitiesForUser(actor),
              domainRecordRepository.listOpportunityComplaintsForUser(actor),
              domainRecordRepository.listOpportunityAppealsForUser(actor),
              domainRecordRepository.listCampaignsForUser(actor),
            ]).then(([opportunities, complaints, appeals, campaigns]) => ({
              opportunities,
              complaints,
              appeals,
              campaigns,
            }))
          : undefined;
        res.json({ overview: store.getOpportunityOpsOverview(actor, persistedData) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/admin/opportunity-ops/sweep',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(opportunityOpsSweepSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const sweep = store.runOpportunityExpiryAndReverificationSweep(
        req.currentUser!,
        parsed.data
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ sweep });
    }
  );

  app.post(
    '/api/opportunity-ops/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runOpportunityOpsVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'OPPORTUNITY_OPS_SUITE_RUN',
        'phase9_opportunity_ops',
        `[${req.requestId ?? 'req'}] Phase 9 opportunity ops suite: ${report.passedChecks}/${report.totalChecks} passed (externalKycVendorConnected=false, hardwareTested=false).`
      );
      res.json({ report });
    }
  );

  // --- Phase 10 Block 10.1: Privacy, Security & Statutory Compliance Readiness (Software-First) ---
  app.get(
    '/api/compliance/overview',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const actor = req.currentUser!;
      if (!domainRecordRepository) {
        res.json({ overview: store.getPrivacyComplianceOverview(actor) });
        return;
      }

      const canReadHouseholds = actor.role === 'admin' || actor.role === 'household_viewer';
      const [households, sessions, analyticsEvents] = await Promise.all([
        canReadHouseholds ? domainRecordRepository.listHouseholdsForUser(actor) : [],
        actor.role === 'admin' ? authSessionRepository.listSessionRetentionRecords() : [],
        domainRecordRepository.listAnalyticsEvents(500),
      ]);
      const householdQrTokens =
        actor.role === 'admin'
          ? (
              await Promise.all(
                households.map((household) =>
                  domainRecordRepository.listHouseholdQrTokensForActor(actor, household.id)
                )
              )
            ).flat()
          : [];

      res.json({
        overview: store.getPrivacyComplianceOverview(actor, {
          households,
          sessions,
          householdQrTokens,
          analyticsEvents,
        }),
      });
    })
  );

  app.post(
    '/api/compliance/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPrivacyComplianceVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'PRIVACY_COMPLIANCE_SUITE_RUN',
        'phase10_privacy_compliance',
        `[${req.requestId ?? 'req'}] Phase 10 compliance suite: ${report.passedChecks}/${report.totalChecks} passed (externalPenTestCompleted=false, legalComplianceClaimed=false).`
      );
      res.json({ report });
    }
  );

  app.post(
    '/api/admin/compliance/retention-sweep',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(privacyRetentionSweepSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = store.runPrivacyRetentionCleanupSweep(req.currentUser!, parsed.data);
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 11 Block 11.1: Reliability, Failure-Mode & Chaos Recovery Suite (Software-First) ---
  app.get(
    '/api/reliability/overview',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizeReliabilityChaosReportFromD1();
        res.json({ overview: store.getReliabilityChaosOverview(user) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/reliability/chaos-probe',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(reliabilityChaosProbeSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.executeFailureModeChaosProbe(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json(result);
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/admin/reliability/run-all-18',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(reliabilityFullSuiteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeReliabilityChaosReportFromD1();
        const result = store.runFullReliabilityChaosSuite(user, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putLatestReliabilityChaosReport(result.report);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/reliability/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runReliabilityChaosVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'RELIABILITY_CHAOS_SUITE_RUN',
        'phase11_reliability_chaos',
        `[${req.requestId ?? 'req'}] Phase 11 reliability chaos suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false, stageP6Deferred=true).`
      );
      res.json({ report });
    }
  );

  // --- Phase 12 Block 12.1: Controlled Hardware & Viewer Pilot Readiness & Stage P6 Runbook (Software-First) ---
  app.get(
    '/api/pilot-readiness/overview',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizePilotCohortsFromD1();
        res.json({ overview: store.getPilotReadinessOverview(user) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/pilot-readiness/cohorts',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(pilotCohortCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizePilotCohortsFromD1();
        const result = store.createPilotCohortBlueprint(user, parsed.data);
        if (domainRecordRepository) await domainRecordRepository.putPilotCohort(result.cohort);
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/pilot-readiness/validate-telemetry',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(pilotTelemetryValidateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const result = store.validatePilotTelemetrySample(req.currentUser!, parsed.data);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ result });
      } catch (err) {
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    }
  );

  app.post(
    '/api/pilot-readiness/stage-p6-prep',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(stageP6CheckPrepareSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizePilotCohortsFromD1();
        const overview = store.recordStageP6RunbookPrep(user, parsed.data);
        if (domainRecordRepository) {
          const prepNote = overview.stageP6Runbook.find(
            (step) => step.stepId === parsed.data.stepId
          )?.ownerPrepNote;
          if (prepNote !== undefined && prepNote !== null) {
            await domainRecordRepository.putStageP6PrepNote(parsed.data.stepId, prepNote);
          }
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/pilot-readiness/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runPilotReadinessVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'PILOT_READINESS_SUITE_RUN',
        'phase12_pilot_readiness',
        `[${req.requestId ?? 'req'}] Phase 12 pilot readiness suite: ${report.passedChecks}/${report.totalChecks} passed (hardwareTested=false, stageP6Deferred=true, countryActivated=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 13 Block 13.1: Commercial Readiness Board Gate, SLA Matrix & Unit Economics (Software-First) ---
  app.get(
    '/api/commercial-readiness/overview',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizeCommercialReadinessFromD1();
        res.json({ overview: store.getCommercialReadinessOverview(user) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.put(
    '/api/commercial-readiness/cost-assumptions',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(commercialCostAssumptionsSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeCommercialReadinessFromD1();
        const overview = store.updateCommercialCostAssumptions(user, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putCommercialCostAssumptions(parsed.data);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/commercial-readiness/board-decision',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(commercialBoardDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeCommercialReadinessFromD1();
        const result = store.submitCommercialBoardDecision(user, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putCommercialBoardDecision(result.decision);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/commercial-readiness/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runCommercialReadinessVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'COMMERCIAL_READINESS_SUITE_RUN',
        'phase13_commercial_readiness',
        `[${req.requestId ?? 'req'}] Phase 13 commercial readiness suite: ${report.passedChecks}/${report.totalChecks} passed (commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 14 Block 14.1: Country-by-Country Launch Readiness Gate & Jurisdiction Policy Engine (Software-First) ---
  app.get(
    '/api/country-launch/overview',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizeCountryLaunchStateFromD1();
        res.json({ overview: store.getCountryLaunchOverview(user) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.put(
    '/api/country-launch/policy',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(countryPolicyUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeCountryLaunchStateFromD1();
        const overview = store.updateCountryPolicyConfig(user, parsed.data);
        if (domainRecordRepository) {
          const profile = overview.countries.find(
            (country) => country.countryCode === parsed.data.countryCode
          )?.policyConfig;
          if (profile) await domainRecordRepository.putCountryPolicyProfile(profile);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/country-launch/decision',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(countryLaunchDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeCountryLaunchStateFromD1();
        const result = store.submitCountryLaunchDecision(user, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putCountryLaunchDecision(result.decision);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/country-launch/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runCountryLaunchVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'COUNTRY_LAUNCH_SUITE_RUN',
        'phase14_country_launch',
        `[${req.requestId ?? 'req'}] Phase 14 country launch readiness suite: ${report.passedChecks}/${report.totalChecks} passed (countryActivated=false, activeLaunchedMarketsCount=0, legalComplianceClaimed=false, hardwareTested=false).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Phase 15 Block 15.1: International Multi-Region Expansion, Localization & Residency (Software-First) ---
  app.get(
    '/api/international-expansion/overview',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizeInternationalExpansionStateFromD1();
        res.json({ overview: store.getInternationalExpansionOverview(user) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.put(
    '/api/international-expansion/region-config',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(regionalLocalizationUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeInternationalExpansionStateFromD1();
        const overview = store.updateRegionalLocalizationConfig(user, parsed.data);
        if (domainRecordRepository) {
          const profile = overview.regions.find(
            (region) => region.regionId === parsed.data.regionId
          )?.localizationConfig;
          if (profile) await domainRecordRepository.putRegionalLocalizationProfile(profile);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ overview });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/international-expansion/estimate-currency',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(multiCurrencyEstimateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeInternationalExpansionStateFromD1();
        const estimate = store.estimateRegionalMultiCurrencyProForma(
          user,
          parsed.data
        );
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ estimate });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/international-expansion/decision',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(internationalExpansionDecisionSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeInternationalExpansionStateFromD1();
        const result = store.submitInternationalExpansionDecision(user, parsed.data);
        if (domainRecordRepository) {
          await domainRecordRepository.putInternationalExpansionDecision(result.decision);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(201).json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/international-expansion/verify-suite',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      const report = runInternationalExpansionVerificationSuite();
      recordRouteAudit(req,
        req.currentUser!,
        'INTERNATIONAL_EXPANSION_SUITE_RUN',
        'phase15_international_expansion',
        `[${req.requestId ?? 'req'}] Phase 15 international expansion suite: ${report.passedChecks}/${report.totalChecks} passed (regionalExpansionActive=false, activeExpandedRegionsCount=0, prohibitCrossBorderPiiTransfer=true, stageP6Deferred=true).`
      );
      res.setHeader('Cache-Control', 'no-store, private');
      res.json({ report });
    }
  );

  // --- Track B (DEC-OPEN-01 Locked): Households, Profiles, Matching, Bundled Consent & QR Revocation ---
  app.get('/api/track-b/country-configs', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      decOpen01Status: 'LOCKED_SCOPE_B_BUNDLED_WITHDRAWAL',
      initialLaunchMarket: 'ZW',
      countries: listCountryGeoConfigs(),
    });
  });

  app.post('/api/track-b/verify-suite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const report = runTrackBVerificationSuite();
    recordRouteAudit(req,
      req.currentUser!,
      'TRACK_B_VERIFICATION_SUITE_RUN',
      'track_b_consent',
      `[${req.requestId ?? 'req'}] Track B verification: ${report.passedChecks}/${report.totalChecks} passed (DEC-OPEN-01 locked).`
    );
    res.json(report);
  });

  app.get(
    '/api/advertiser/targeting-aggregates',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const rows = domainRecordRepository
          ? await domainRecordRepository.getAdvertiserGeoAggregates()
          : store.getAdvertiserGeoAggregates(req.currentUser!);
        res.json({
          privacyNotice:
            'Aggregate consented households only — exact installation locations and member profiles are strictly redacted.',
          items: rows,
        });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const items = domainRecordRepository
          ? await domainRecordRepository.listHouseholdsForUser(user)
          : store.listHouseholdsForUser(user);
        res.json({ items: items.map(toPublicHouseholdView) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const item = store.createHousehold(user, parsed.data);
        await persistHouseholdState(user, item);
        res.status(201).json({ item: toPublicHouseholdView(item) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const item = domainRecordRepository
          ? (await domainRecordRepository.getHouseholdForActor(user, req.params.id)) ??
            store.getHouseholdForActor(user, req.params.id)
          : store.getHouseholdForActor(user, req.params.id);
        res.json({ item: toPublicHouseholdView(item) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.put(
    '/api/households/:id/location',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdLocationSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const item = store.updateHouseholdLocation(user, req.params.id, parsed.data);
        await persistHouseholdState(user, item);
        res.json({ item: toPublicHouseholdView(item) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/households/:id/settings',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdDisplaySettingsPatchSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const item = store.updateHouseholdDisplaySettings(user, req.params.id, parsed.data);
        await persistHouseholdState(user, item);
        res.json({ item: toPublicHouseholdView(item) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/consent/withdraw',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdConsentWithdrawSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const result = store.withdrawHouseholdConsentBundled(
          user,
          req.params.id,
          parsed.data.reason
        );
        await persistHouseholdState(user, result.household);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ ...result, household: toPublicHouseholdView(result.household) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/consent/restore',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdConsentRestoreSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const result = store.restoreHouseholdConsentExplicit(
          user,
          req.params.id,
          parsed.data
        );
        await persistHouseholdState(user, result.household);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ ...result, household: toPublicHouseholdView(result.household) });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households/:id/members',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        let items: Array<Omit<HouseholdMemberProfile, 'pinHash'>>;
        if (domainRecordRepository) {
          const household = await domainRecordRepository.getHouseholdForActor(
            user,
            req.params.id
          );
          items = household
            ? await domainRecordRepository.listHouseholdMembersForActor(user, req.params.id)
            : store.listHouseholdMembers(user, req.params.id);
        } else {
          items = store.listHouseholdMembers(user, req.params.id);
        }
        res.json({ items });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/members',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdMemberCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const item = store.createHouseholdMember(user, req.params.id, parsed.data);
        if (domainRecordRepository) {
          const household = store.getHouseholdForActor(user, req.params.id);
          await persistHouseholdState(user, household);
        }
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.patch(
    '/api/households/:id/members/:memberId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdMemberUpdateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const item = store.updateHouseholdMember(
          user,
          req.params.id,
          req.params.memberId,
          parsed.data
        );
        if (domainRecordRepository) {
          const household = store.getHouseholdForActor(user, req.params.id);
          await persistHouseholdState(user, household);
        }
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.delete(
    '/api/households/:id/members/:memberId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdMemberDeleteSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        store.deleteHouseholdMember(
          user,
          req.params.id,
          req.params.memberId,
          parsed.data.pinVerification
        );
        if (domainRecordRepository) {
          await domainRecordRepository.deleteHouseholdMember(
            user,
            req.params.id,
            req.params.memberId
          );
          const household = store.getHouseholdForActor(user, req.params.id);
          await persistHouseholdState(user, household);
        }
        res.json({ ok: true });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households/:id/matches',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const opportunities = domainRecordRepository
          ? await domainRecordRepository.listOpportunitiesForUser(user)
          : undefined;
        const result = store.evaluateHouseholdOpportunityMatches(
          user,
          req.params.id,
          opportunities
        );
        res.json(result);
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/qr-issue',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdQrIssueSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        if (domainRecordRepository) {
          const baseQr = await domainRecordRepository.getQrLinkByToken(parsed.data.baseQrToken);
          if (baseQr) store.replaceQrLinkFromPersistence(baseQr);
        }
        const item = store.issueHouseholdEpochQrToken(user, req.params.id, parsed.data);
        if (domainRecordRepository) {
          const household = store.getHouseholdForActor(user, req.params.id);
          await domainRecordRepository.putHouseholdQrToken(item, household.ownerUserId);
        }
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households/:id/qr-tokens',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const fallback = store.listHouseholdQrTokens(user, req.params.id);
        const items = domainRecordRepository
          ? await domainRecordRepository.listHouseholdQrTokensForActor(user, req.params.id)
          : fallback;
        res.json({ items });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.get(
    '/api/households/:id/consent-history',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      res.setHeader('Cache-Control', 'no-store, private');
      try {
        const fallback = store.listConsentAuditEvents(user, req.params.id);
        const items = domainRecordRepository
          ? await domainRecordRepository.listConsentAuditEventsForActor(user, req.params.id)
          : fallback;
        res.json({ items });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/dsr-export',
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = parseWithZod(emptyStrictSchema, req.body ?? {});
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const user = (req as AuthenticatedRequest).currentUser!;
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const pkg = store.exportHouseholdDsrPackage(user, req.params.id);
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ package: pkg });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  app.post(
    '/api/households/:id/dsr-erase',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthenticatedRequest).currentUser!;
      const parsed = parseWithZod(householdDsrEraseSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        await synchronizeHouseholdStateFromD1(user, req.params.id);
        const erasure = store.anonymiseHouseholdDsr(
          user,
          req.params.id,
          parsed.data
        );
        if (domainRecordRepository) {
          const household = store.getHouseholdForActor(user, req.params.id);
          await persistHouseholdState(user, household);
        }
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({ erasure });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err);
        res.status(code).json({ error: message });
      }
    })
  );

  // Admin-only Audit Log, Hardened Export & Request Telemetry Endpoints
  app.get(
    '/api/admin/audit-logs',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const parsedQuery = parseWithZod(auditLogQuerySchema, {
        targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
      });
      if (!parsedQuery.ok) {
        sendValidationError(res, parsedQuery);
        return;
      }
      res.json({
        items: await listMergedAuditRecords({
          targetType: parsedQuery.data.targetType,
          limit: parsedQuery.data.limit,
        }),
      });
    })
  );

  app.get(
    '/api/admin/audit-logs/export',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const parsedQuery = parseWithZod(auditLogExportQuerySchema, {
        targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
        format: typeof req.query.format === 'string' ? req.query.format : undefined,
      });
      if (!parsedQuery.ok) {
        sendValidationError(res, parsedQuery);
        return;
      }

      const { targetType, limit, format } = parsedQuery.data;
      const authenticatedReq = req as AuthenticatedRequest;
      const items = await listMergedAuditRecords({ targetType, limit });

      await authSessionRepository.recordSecurityAudit(
        authenticatedReq.currentUser!,
        'ADMIN_AUDIT_LOG_EXPORTED',
        targetType,
        `[${authenticatedReq.requestId ?? 'req'}] Exported ${items.length} audit log row(s) as ${format.toUpperCase()}.`
      );

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="edison-audit-logs.${format}"`
      );

      if (format === 'csv') {
        const header = ['id', 'createdAt', 'actorId', 'actorRole', 'action', 'targetType', 'targetId', 'detail'].join(',');
        const lines = items.map((row) =>
          [
            neutralizeCsvCell(row.id),
            neutralizeCsvCell(row.createdAt),
            neutralizeCsvCell(row.actorId ?? ''),
            neutralizeCsvCell(row.actorRole),
            neutralizeCsvCell(row.action),
            neutralizeCsvCell(row.targetType),
            neutralizeCsvCell(row.targetId),
            neutralizeCsvCell(row.detail),
          ].join(',')
        );
        res.type('text/csv; charset=utf-8').send([header, ...lines].join('\n'));
        return;
      }

      res.json({
        exportedAt: new Date().toISOString(),
        requestId: authenticatedReq.requestId ?? null,
        targetType,
        count: items.length,
        items,
      });
    })
  );

  app.get(
    '/api/admin/request-telemetry',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        requestId: req.requestId ?? null,
        count: recentTelemetry.length,
        items: recentTelemetry.slice(0, 50),
      });
    }
  );

  // --- Phase 3: PostgreSQL 16+ Database Migration & Backup Status ---
  app.get('/api/admin/database/status', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const descriptors = loadMigrationDescriptors();
    const backendMeta = store.getStorageBackendMetadata();
    const probe = await probePostgresReadiness(null);
    res.json({
      storageBackend: backendMeta,
      migrationsAvailable: descriptors.map((d) => ({
        version: d.version,
        filename: d.filename,
        hasDownScript: Boolean(d.downFilename),
        checksumSha256: d.checksumSha256,
      })),
      probe,
    });
  });

  app.post('/api/admin/database/verify-pglite', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    let executor: Awaited<ReturnType<typeof createPgliteExecutor>> | null = null;
    try {
      executor = await createPgliteExecutor();
      const dataPath = path.resolve(process.cwd(), 'data', 'edison-store.json');
      const snapshot = fs.existsSync(dataPath)
        ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        : {
            schemaVersion: 8,
            users: [],
            sessions: [],
            qrLinks: store.listQrLinksForUser(req.currentUser!),
            advertiserProfiles: [],
            campaigns: store.listCampaignsForUser(req.currentUser!),
            adCreatives: store.listAdCreativesForUser(req.currentUser!),
            supportTickets: [],
            opportunities: store.listOpportunitiesForUser(req.currentUser!),
            opportunityComplaints: [],
            opportunityAppeals: [],
            analyticsEvents: [],
            physicalQrScanTests: [],
            auditLogs: [],
          };
      const importSummary = await importJsonStoreToPostgres(executor, snapshot);
      const probe = await probePostgresReadiness(executor);
      const backup = await exportPostgresBackupSql(executor);
      reliabilityMonitor.recordDependencySuccess('postgres_primary');
      res.json({
        ok: true,
        verifiedWithEngine: 'pglite_postgresql_16_wasm',
        importSummary,
        probe,
        backup,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Postgres verification failed.';
      reliabilityMonitor.recordDependencyFailure('postgres_primary', msg);
      res.status(500).json({ error: msg });
    } finally {
      if (executor) {
        await executor.close();
      }
    }
  });

  // --- Phase 3: Dedicated FFmpeg & FFprobe Broadcast Media Worker ---
  app.get('/api/media/worker/status', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    if (options?.disableMediaProcessing) {
      res.status(503).json({
        error: 'MEDIA_PROCESSING_UNAVAILABLE',
        message: 'Media storage and FFmpeg execution are not configured for this Worker.',
      });
      return;
    }
    res.json({
      diagnostics: mediaWorker.getWorkerDiagnostics(),
      recentJobs: mediaWorker.listJobs(20),
    });
  });

  app.post('/api/media/worker/probe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (options?.disableMediaProcessing) {
      res.status(503).json({
        error: 'MEDIA_PROCESSING_UNAVAILABLE',
        message: 'Media storage and FFmpeg execution are not configured for this Worker.',
      });
      return;
    }
    const parsed = parseWithZod(mediaWorkerProbeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const probe = await mediaWorker.probeMediaFile(parsed.data.sourceFilename);
      reliabilityMonitor.recordDependencySuccess('ffmpeg_worker');
      res.json({ probe });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  });

  app.post('/api/media/worker/transcode', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (options?.disableMediaProcessing) {
      res.status(503).json({
        error: 'MEDIA_PROCESSING_UNAVAILABLE',
        message: 'Media storage and FFmpeg execution are not configured for this Worker.',
      });
      return;
    }
    const parsed = parseWithZod(mediaWorkerTranscodeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      const job = await mediaWorker.enqueueTranscodeJob({
        requestedByUserId: req.currentUser!.id,
        creativeId: parsed.data.creativeId ?? null,
        sourceFilename: parsed.data.sourceFilename,
        kind: parsed.data.kind,
        targetPlatform: parsed.data.targetPlatform,
        durationSeconds: parsed.data.durationSeconds,
      });
      reliabilityMonitor.recordDependencySuccess('ffmpeg_worker');
      res.status(201).json({ job });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      reliabilityMonitor.recordDependencyFailure('ffmpeg_worker', message);
      res.status(code).json({ error: message });
    }
  });

  // --- Phase 4: AURA Companion Remote Pairing, Commands, Offline Queue & HDMI-CEC Contracts ---
  app.get('/api/aura/contracts', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      oemContracts: auraRemoteEngine.listOemContracts(),
      hardwareTested: false,
      stageP6Deferred: true,
    });
  });

  app.get('/api/aura/discover', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      isSimulationDiscovery: true,
      devices: auraRemoteEngine.discoverNearbyDevices(),
    });
  });

  app.get(
    '/api/aura/devices',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (domainRecordRepository) {
        auraRemoteEngine.replaceDevicesFromPersistence(
          await domainRecordRepository.listAuraDevicesForUser(req.currentUser!),
        );
      }
      res.json({
        items: auraRemoteEngine.listUserDevices(req.currentUser!.id),
      });
    }),
  );

  app.post('/api/aura/pair/initiate', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraInitiatePairingSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const device = auraRemoteEngine.initiatePairing({
      ownerUserId: req.currentUser!.id,
      householdId: parsed.data.householdId ?? null,
      tvLabel: parsed.data.tvLabel,
      platformId: parsed.data.platformId,
    });
    if (domainRecordRepository) await domainRecordRepository.putAuraDevice(device);
    res.status(201).json({ device });
  }));

  app.post('/api/aura/pair/confirm', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraConfirmPairingSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      await synchronizeAuraStateFromD1(req.currentUser!);
      const device = auraRemoteEngine.confirmPairing({
        deviceId: parsed.data.deviceId,
        ownerUserId: req.currentUser!.id,
        pairingCode: parsed.data.pairingCode,
        activeProfileId: parsed.data.activeProfileId ?? null,
      });
      if (domainRecordRepository) await domainRecordRepository.putAuraDevice(device);
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  }));

  app.post('/api/aura/devices/:deviceId/heartbeat', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraHeartbeatSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      await synchronizeAuraStateFromD1(req.currentUser!);
      const device = auraRemoteEngine.recordHeartbeat({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        networkOnline: parsed.data.networkOnline,
      });
      if (domainRecordRepository) await domainRecordRepository.putAuraDevice(device);
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  }));

  app.post('/api/aura/devices/:deviceId/command', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraCommandSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      await synchronizeAuraStateFromD1(req.currentUser!);
      const result = auraRemoteEngine.dispatchAuraCommand({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        command: parsed.data.command,
        targetInput: parsed.data.targetInput,
      });
      if (domainRecordRepository) await domainRecordRepository.putAuraDevice(result.device);
      res.json(result);
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 400);
      res.status(code).json({ error: message });
    }
  }));

  app.patch('/api/aura/devices/:deviceId/profile', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(auraBindProfileSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    try {
      await synchronizeAuraStateFromD1(req.currentUser!);
      const device = auraRemoteEngine.bindActiveProfile({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
        profileId: parsed.data.profileId,
      });
      if (domainRecordRepository) await domainRecordRepository.putAuraDevice(device);
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  }));

  app.post('/api/aura/devices/:deviceId/disconnect', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      await synchronizeAuraStateFromD1(req.currentUser!);
      const device = auraRemoteEngine.disconnectDevice({
        deviceId: req.params.deviceId,
        ownerUserId: req.currentUser!.id,
      });
      if (domainRecordRepository) await domainRecordRepository.putAuraDevice(device);
      res.json({ device });
    } catch (err) {
      const { code, message } = mapErrorStatus(err, 404);
      res.status(code).json({ error: message });
    }
  }));

  app.post('/api/tv/hdmi-cec/evaluate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const parsed = parseWithZod(hdmiCecEvaluateSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed);
      return;
    }
    const result = auraRemoteEngine.evaluateHdmiCecAction(parsed.data);
    res.json(result);
  });

  // --- Phase 7: Commercial Operations Disputes, Credit Ledger & Stream Reconciliation ---
  app.get(
    '/api/advertiser-ops/disputes',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const user = req.currentUser!;
      const persistedDisputes = domainRecordRepository
        ? await domainRecordRepository.listCommercialDisputes()
        : undefined;
      const persistedRevenueData = domainRecordRepository
        ? await Promise.all([
            domainRecordRepository.listCampaignsForUser(user),
            domainRecordRepository.listAnalyticsEvents(500),
          ]).then(([campaigns, analyticsEvents]) => ({ campaigns, analyticsEvents }))
        : undefined;
      if (persistedDisputes) {
        commercialDisputeEngine.replaceDisputesFromPersistence(persistedDisputes);
      }
      const items =
        user.role === 'admin'
          ? commercialDisputeEngine.listDisputes()
          : commercialDisputeEngine.listDisputes({ advertiserUserId: user.id });
      const ledger = store.getRevenueLedgerSnapshot(user, persistedRevenueData);
      const reconciliation = commercialDisputeEngine.reconcileRevenueStreams(
        ledger,
        persistedDisputes,
      );
      res.json({ items, reconciliation });
    }),
  );

  app.post(
    '/api/advertiser-ops/disputes',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(commercialDisputeCreateSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        const user = req.currentUser!;
        if (domainRecordRepository) {
          commercialDisputeEngine.replaceDisputesFromPersistence(
            await domainRecordRepository.listCommercialDisputes(),
          );
        }
        const campaigns = domainRecordRepository
          ? await domainRecordRepository.listCampaignsForUser(user)
          : store.listCampaignsForUser(user);
        const campaign = parsed.data.campaignId
          ? campaigns.find((item) => item.id === parsed.data.campaignId) ?? null
          : null;
        const item = commercialDisputeEngine.submitDispute({
          advertiserUserId: user.id,
          campaign,
          billingPeriodLabel: parsed.data.billingPeriodLabel,
          disputeType: parsed.data.disputeType,
          disputedAmountUsd: parsed.data.disputedAmountUsd,
          reason: parsed.data.reason,
        });
        if (domainRecordRepository) await domainRecordRepository.putCommercialDispute(item);
        res.status(201).json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err, 400);
        res.status(code).json({ error: message });
      }
    }),
  );

  app.patch(
    '/api/advertiser-ops/disputes/:id/resolve',
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const parsed = parseWithZod(commercialDisputeResolveSchema, req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed);
        return;
      }
      try {
        if (domainRecordRepository) {
          commercialDisputeEngine.replaceDisputesFromPersistence(
            await domainRecordRepository.listCommercialDisputes(),
          );
        }
        const item = commercialDisputeEngine.resolveDispute({
          disputeId: req.params.id,
          decision: parsed.data.decision,
          approvedCreditUsd: parsed.data.approvedCreditUsd,
          resolutionNote: parsed.data.resolutionNote,
        });
        if (domainRecordRepository) await domainRecordRepository.putCommercialDispute(item);
        res.json({ item });
      } catch (err) {
        if (isD1DomainError(err)) throw err;
        const { code, message } = mapErrorStatus(err, 404);
        res.status(code).json({ error: message });
      }
    }),
  );

  // --- Phase 15 & Reliability: i18n UI Translation Bundles, Sovereign Deployment Manifests & Observability ---
  app.get('/api/i18n/bundles', (_req: Request, res: Response) => {
    const locale = typeof _req.query.locale === 'string' ? _req.query.locale : undefined;
    if (locale) {
      res.json({ bundle: getTranslationBundle(locale) });
      return;
    }
    res.json({
      supportedLocales: Object.keys(EDISON_I18N_BUNDLES),
      bundles: EDISON_I18N_BUNDLES,
    });
  });

  app.get('/api/international-expansion/deployment-manifests', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    const regionsDir = path.resolve(process.cwd(), 'deploy', 'regions');
    const manifests = fs.existsSync(regionsDir)
      ? fs
          .readdirSync(regionsDir)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((file) => JSON.parse(fs.readFileSync(path.join(regionsDir, file), 'utf8')))
      : [];
    res.json({
      count: manifests.length,
      prohibitCrossBorderPiiTransfer: true,
      regionalExpansionActive: false,
      countryActivated: false,
      manifests,
    });
  });

  app.get('/api/admin/observability/metrics', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(reliabilityMonitor.getMetricsSnapshot());
  });

  app.get(
    '/api/qr/events',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const user = req.currentUser!;
      const allowedTokens = new Set(
        domainRecordRepository
          ? (await domainRecordRepository.listQrLinksForActor(user)).map((qr) => qr.token)
          : store.listQrLinksForUser(user).map((qr) => qr.token),
      );
      const sourceEvents = domainRecordRepository
        ? await domainRecordRepository.listAnalyticsEvents(500)
        : store.listAnalyticsEvents(100);
      const events = sourceEvents
        .filter((event) => user.role === 'admin' || (event.qrToken && allowedTokens.has(event.qrToken)))
        .slice(0, 100);
      res.json({ items: events });
    }),
  );

  // Real Direct-to-Destination QR Tracking Redirect (/r/:token)
  // Records `redirect_requested` on receipt and `redirect_issued` on HTTP 302.
  // Rejects revoked/withdrawn/stale-epoch/expired Track B household QR tokens with HTTP 403 and no-store cache headers.
  app.get(
    '/r/:token',
    redirectRateMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, private');
      const token = req.params.token;
      const clientIp = req.ip || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const householdRedirectState =
        domainRecordRepository && token.startsWith('hqr_')
          ? await domainRecordRepository.getHouseholdQrRedirectState(token)
          : null;
      if (householdRedirectState) {
        store.replaceHouseholdQrRedirectStateFromPersistence(householdRedirectState);
      } else if (domainRecordRepository && !token.startsWith('hqr_')) {
        const persistedQr = await domainRecordRepository.getQrLinkByToken(token);
        if (persistedQr) store.replaceQrLinkFromPersistence(persistedQr);
      }
      const outcome = store.resolveQrRedirect(token, clientIp, userAgent, {
        secPurpose: req.get('sec-purpose'),
        purpose: req.get('purpose'),
        xMoz: req.get('x-moz'),
      });

      if (domainRecordRepository) {
        if (outcome.record) await domainRecordRepository.putQrLink(outcome.record);
        if (householdRedirectState?.household && outcome.householdQrToken) {
          await domainRecordRepository.putHouseholdQrToken(
            outcome.householdQrToken,
            householdRedirectState.household.ownerUserId,
          );
        }
        if (householdRedirectState?.household) {
          await Promise.all(
            outcome.consentAuditEvents.map((event) =>
              domainRecordRepository.putConsentAuditEvent(
                event,
                householdRedirectState.household!.ownerUserId,
              ),
            ),
          );
        }
        await Promise.all(
          outcome.analyticsEvents.map((event) =>
            domainRecordRepository.putAnalyticsEvent(
              event,
              outcome.record?.ownerId ?? householdRedirectState?.household?.ownerUserId,
            ),
          ),
        );
      }

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
    }),
  );

  // Structured JSON error handler prevents Express HTML error pages or stack leaks on malformed JSON / runtime errors
  app.use(apiErrorMiddleware);

  return app;
}
