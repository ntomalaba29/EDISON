import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FastForward,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tv,
  XCircle,
} from 'lucide-react';
import type {
  AdCreativeRecord,
  AdvertiserProfile,
  BreakCalibrationBenchmarkReport,
  BreakDaypart,
  BreakDurationPredictionResult,
  BreakProgrammeGenre,
  BreakSchedulePlan,
  BroadcastCueParseResult,
  BroadcastCueStandard,
  CampaignPreviewGateResult,
  CampaignRecord,
  CompanionExecutionContext,
  CompanionPolicyEvalResult,
  CompanionRequestedCapability,
  OfflineCacheOperationResult,
  OfflineCacheStateSnapshot,
  OfflineQueueDrainResult,
  Phase4SoftwareExitReport,
  PrimaryAdCategory,
  PublicHouseholdInstallationView,
  PublicUser,
  QrLinkRecord,
  ScheduledBreakSlot,
  SharedIntelSignalType,
  SimulatedTvDeviceState,
  TvBreakLifecycleResult,
  TvCadenceSimulationResult,
  TvChannelProfileBinding,
  TvEmulatorConformanceReport,
  TvFaultSimulationMode,
  TvFaultSuiteReport,
  TvPlatformCapabilityProfile,
  TvPlatformId,
  TvRemoteCommand,
  TvRemoteDispatchResult,
} from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

export type TvPreviewSubTab = 'player' | 'gate' | 'simulator';

interface TvPreviewViewProps {
  currentUser: PublicUser | null;
  initialSubTab?: TvPreviewSubTab;
  initialCreativeId?: string | null;
  initialCampaignId?: string | null;
  onNavigateAuth: () => void;
  onReturnToEditor: (creativeId?: string | null) => void;
  onSummaryRefresh: () => Promise<void>;
}

type SimulatorPhase = 'live_tv' | 'break_countdown' | 'ad_playing';

function formatClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

interface CreativeStageProps {
  creative: AdCreativeRecord;
  qrLink: QrLinkRecord | null;
  qrDataUrl: string;
  isPlaying: boolean;
  showSafeGuide: boolean;
  elapsedSeconds: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onVideoEnded?: () => void;
}

export function CreativeStage({
  creative,
  qrDataUrl,
  isPlaying,
  showSafeGuide,
  elapsedSeconds,
  videoRef,
  onVideoEnded,
}: CreativeStageProps) {
  const total = Math.max(5, creative.displayDurationSeconds || 15);
  const pct = Math.min(100, Math.round((elapsedSeconds / total) * 100));

  if (creative.mode === 'option_b_upload' && creative.optionB) {
    const optB = creative.optionB;
    return (
      <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
        {optB.mediaKind === 'video' ? (
          <video
            ref={videoRef}
            src={optB.fileUrl}
            playsInline
            onEnded={onVideoEnded}
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={optB.fileUrl}
            alt={creative.title}
            className="w-full h-full object-contain"
          />
        )}

        {showSafeGuide && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none border border-dashed border-amber-400/80 z-20"
            style={{ left: '5%', top: '5%', width: '90%', height: '90%' }}
          />
        )}

        {optB.qrInspectionStatus === 'none_found' &&
          optB.qrOverlayConfirmed &&
          creative.qrToken && (
            <div
              className={`absolute bottom-[6%] ${
                optB.qrOverlayCorner === 'bottom_left' ? 'left-[5%]' : 'right-[5%]'
              } bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm flex flex-col items-center w-[17%] z-30`}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR overlay /r/${creative.qrToken}`}
                  className="w-full aspect-square object-contain"
                />
              ) : (
                <QrCode className="w-8 h-8 text-slate-800" />
              )}
              <span className="mt-0.5 text-[9px] font-mono font-semibold text-slate-800 truncate max-w-full">
                /r/{creative.qrToken}
              </span>
            </div>
          )}

        <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80 z-30">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>

        {!isPlaying && optB.mediaKind === 'image' && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-900/80 text-[11px] font-mono text-white z-30">
            PAUSED · {formatClock(elapsedSeconds)} / {formatClock(total)}
          </div>
        )}
      </div>
    );
  }

  if (creative.mode === 'text_only_commercial' && creative.textOnly) {
    const t = creative.textOnly;
    return (
      <div
        className="relative w-full h-full overflow-hidden select-none flex flex-col justify-between p-[6%]"
        style={{ backgroundColor: t.backgroundColor, color: t.textColor }}
      >
        {showSafeGuide && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none border border-dashed border-amber-400/80 z-30"
            style={{ left: '5%', top: '5%', width: '90%', height: '90%' }}
          />
        )}

        <div className="flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block w-2 h-5 rounded-sm shrink-0"
              style={{ backgroundColor: t.accentColor }}
            />
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider opacity-90">
              {t.advertiserName}
            </span>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-current/25 uppercase tracking-wide"
            style={{ color: t.accentColor }}
          >
            Commercial Text-Only
          </span>
        </div>

        <div
          className={`my-auto flex flex-col justify-center gap-2.5 z-10 ${
            creative.qrToken
              ? t.qrPlacement === 'bottom_left'
                ? 'pl-[23%]'
                : 'pr-[23%]'
              : ''
          }`}
        >
          <h3 className="text-base sm:text-2xl font-bold leading-tight tracking-tight">
            {t.headline}
          </h3>
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed">{t.messageBody}</p>
        </div>

        <div
          className={`flex items-end justify-between gap-4 z-10 ${
            creative.qrToken && t.qrPlacement === 'bottom_left' ? 'pl-[23%]' : ''
          }`}
        >
          <p className="text-[11px] sm:text-xs font-mono opacity-85 truncate">
            {t.contactInfo || 'Scan QR or visit destination link'}
          </p>
        </div>

        {creative.qrToken && (
          <div
            className={`absolute bottom-[7%] ${
              t.qrPlacement === 'bottom_left' ? 'left-[5.5%]' : 'right-[5.5%]'
            } bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 shadow-sm flex flex-col items-center w-[17%] z-20`}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Scannable QR /r/${creative.qrToken}`}
                className="w-full aspect-square object-contain"
              />
            ) : (
              <QrCode className="w-6 h-6 text-slate-800" />
            )}
            <span className="mt-0.5 text-[8px] font-mono font-semibold text-slate-700 truncate max-w-full">
              /r/{creative.qrToken}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30 z-30">
          <div
            className="h-full transition-all duration-200"
            style={{ width: `${pct}%`, backgroundColor: t.accentColor }}
          />
        </div>

        {!isPlaying && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-900/80 text-[11px] font-mono text-white z-30">
            PAUSED · {formatClock(elapsedSeconds)} / {formatClock(total)}
          </div>
        )}
      </div>
    );
  }

  const optA = creative.optionA;
  if (!optA) {
    return (
      <div className="w-full h-full bg-slate-900 text-slate-300 flex items-center justify-center text-xs">
        No composition payload found for creative {creative.id}.
      </div>
    );
  }

  const sortedElements = [...optA.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: optA.useGradient
          ? `linear-gradient(135deg, ${optA.backgroundColor}, ${optA.gradientEndColor})`
          : optA.backgroundColor,
        color: optA.textColor,
      }}
    >
      {optA.backgroundImageUrl && (
        <>
          <img
            src={optA.backgroundImageUrl}
            alt="TV Ad Backdrop"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(15, 23, 42, ${optA.scrimOpacity})` }}
          />
        </>
      )}

      {showSafeGuide && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none border border-dashed border-amber-400/80 z-30"
          style={{ left: '5%', top: '5%', width: '90%', height: '90%' }}
        />
      )}

      {sortedElements.map((el) => {
        if (!el.visible) return null;
        return (
          <div
            key={el.id}
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.widthPct}%`,
              height: `${el.heightPct}%`,
              zIndex: el.zIndex,
              fontSize: `${Math.max(9, Math.round(el.fontSizePx * 0.54))}px`,
            }}
            className="absolute overflow-hidden text-left"
          >
            {el.kind === 'logo' &&
              (optA.logoUrl ? (
                <img
                  src={optA.logoUrl}
                  alt="Advertiser logo"
                  className="w-full h-full object-contain object-left"
                />
              ) : (
                <div className="w-full h-full border border-current/25 rounded flex items-center justify-center text-[10px] opacity-75">
                  LOGO
                </div>
              ))}

            {el.kind === 'product_image' &&
              (optA.productImageUrl ? (
                <img
                  src={optA.productImageUrl}
                  alt="Featured visual"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full border border-current/25 rounded flex items-center justify-center text-[10px] opacity-75 bg-black/15">
                  MEDIA
                </div>
              ))}

            {el.kind === 'promo_badge' && (
              <div
                className="w-full h-full flex items-center font-semibold tracking-wide truncate"
                style={{ color: optA.accentColor }}
              >
                {optA.promoText}
              </div>
            )}

            {el.kind === 'headline' && (
              <div className="w-full h-full font-bold leading-tight">{optA.heading}</div>
            )}

            {el.kind === 'description' && (
              <div className="w-full h-full opacity-90 leading-snug">{optA.description}</div>
            )}

            {el.kind === 'price_value' && (
              <div className="w-full h-full flex items-center font-bold tabular-nums">
                {optA.priceOrValue}
              </div>
            )}

            {el.kind === 'cta_button' && (
              <div
                className="w-full h-full rounded flex items-center justify-center font-semibold text-white px-2 text-center"
                style={{ backgroundColor: optA.accentColor }}
              >
                {optA.callToAction}
              </div>
            )}

            {el.kind === 'contact_info' && (
              <div className="w-full h-full flex items-center opacity-85 truncate">
                {optA.contactDetails}
              </div>
            )}

            {el.kind === 'website_url' && (
              <div className="w-full h-full flex items-center font-mono opacity-80 truncate">
                {optA.websiteAddress}
              </div>
            )}

            {el.kind === 'qr_block' && (
              <div className="w-full h-full bg-white text-slate-900 rounded p-1 flex flex-col items-center justify-center shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scannable TV QR code"
                    className="w-full h-[82%] object-contain"
                  />
                ) : (
                  <QrCode className="w-6 h-6 text-slate-800" />
                )}
                <span className="text-[8px] font-mono font-semibold text-slate-700 truncate max-w-full">
                  {creative.qrToken ? `/r/${creative.qrToken}` : '/r/edison-demo'}
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30 z-30">
        <div
          className="h-full bg-blue-500 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TvPreviewView({
  currentUser,
  initialSubTab = 'player',
  initialCreativeId = null,
  initialCampaignId = null,
  onNavigateAuth,
  onReturnToEditor,
  onSummaryRefresh,
}: TvPreviewViewProps) {
  const [subTab, setSubTab] = useState<TvPreviewSubTab>(initialSubTab);
  const [creatives, setCreatives] = useState<AdCreativeRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedCreativeId, setSelectedCreativeId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [showSafeGuide, setShowSafeGuide] = useState<boolean>(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrTestFeedback, setQrTestFeedback] = useState<{
    ok: boolean;
    redirectUrl: string;
    destinationUrl: string;
    status: string;
  } | null>(null);

  // Pre-Submit Gate state
  const [gateResult, setGateResult] = useState<CampaignPreviewGateResult | null>(null);
  const [loadingGate, setLoadingGate] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [gateActionFeedback, setGateActionFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Commercial-Break Simulator state
  const [simRunning, setSimRunning] = useState(false);
  const [simPhase, setSimPhase] = useState<SimulatorPhase>('live_tv');
  const [liveBroadcastClock, setLiveBroadcastClock] = useState(124); // starts at 02:04 simulated programme
  const [breakCountdown, setBreakCountdown] = useState(3);
  const [simAdElapsed, setSimAdElapsed] = useState(0);
  const [simPhoneOpened, setSimPhoneOpened] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  // Block P2-V2.2 Alternating 4-Slot Break Scheduler state
  const [breakDurationInput, setBreakDurationInput] = useState(75);
  const [safetyBufferInput, setSafetyBufferInput] = useState(5);
  const [alternatingStart, setAlternatingStart] = useState<PrimaryAdCategory>('CHARITY');
  const [allowMockBackfill, setAllowMockBackfill] = useState(true);
  const [households, setHouseholds] = useState<PublicHouseholdInstallationView[]>([]);
  const [selectedBreakHouseholdId, setSelectedBreakHouseholdId] = useState<string>('');
  const [breakPlan, setBreakPlan] = useState<BreakSchedulePlan | null>(null);
  const [planningBreak, setPlanningBreak] = useState(false);
  const [activeSlotCursor, setActiveSlotCursor] = useState(-1); // -1 = single spot, >=0 = multi-slot planned break

  // Block P3-C Software-Only Modular TvPlatformAdapter & AURA Normal TV Remote Simulator
  const [tvAdapterProfiles, setTvAdapterProfiles] = useState<TvPlatformCapabilityProfile[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<TvPlatformId>('android_tv_tif');
  const [tvFaultMode, setTvFaultMode] = useState<TvFaultSimulationMode>('none');
  const [simulateAdActive, setSimulateAdActive] = useState(false);
  const [simTvDeviceState, setSimTvDeviceState] = useState<SimulatedTvDeviceState>({
    platformId: 'android_tv_tif',
    powerOn: true,
    volume: 24,
    muted: false,
    activeInput: 'LIVE_TUNER',
    previousOrdinaryInput: 'LIVE_TUNER',
    channelNumber: 101,
    adBreakOverlayActive: false,
    lastDpadAction: null,
    lastRestoredAt: null,
    ordinaryTvIntact: true,
  });
  const [tvDispatchResult, setTvDispatchResult] = useState<TvRemoteDispatchResult | null>(null);
  const [dispatchingTvCmd, setDispatchingTvCmd] = useState(false);
  const [tvLifecycleResult, setTvLifecycleResult] = useState<TvBreakLifecycleResult | null>(null);
  const [tvFaultSuiteReport, setTvFaultSuiteReport] = useState<TvFaultSuiteReport | null>(null);
  const [runningFaultSuite, setRunningFaultSuite] = useState(false);
  const [offlineCacheState, setOfflineCacheState] = useState<OfflineCacheStateSnapshot | null>(
    null
  );
  const [offlineCacheFeedback, setOfflineCacheFeedback] =
    useState<OfflineCacheOperationResult | null>(null);
  const [cacheScopeId, setCacheScopeId] = useState('gb_freeview_bbcone_androidtv14_dvbt2');
  const [cacheBusy, setCacheBusy] = useState(false);
  const [channelBindings, setChannelBindings] = useState<TvChannelProfileBinding[]>([]);
  const [selectedChannelNumber, setSelectedChannelNumber] = useState<number>(101);
  const [cadenceBreakSec, setCadenceBreakSec] = useState<number>(90);
  const [cadenceNetworkOnline, setCadenceNetworkOnline] = useState<boolean>(true);
  const [cadenceResult, setCadenceResult] = useState<TvCadenceSimulationResult | null>(null);
  const [queueDrainResult, setQueueDrainResult] = useState<OfflineQueueDrainResult | null>(null);
  const [conformanceReport, setConformanceReport] = useState<TvEmulatorConformanceReport | null>(
    null
  );
  const [runningBlock42, setRunningBlock42] = useState(false);

  // Block 4.3 Broadcast Cue Fixtures, Companion Policy Guardrails & Phase 4 Software Exit
  const [cueStandard, setCueStandard] = useState<BroadcastCueStandard>('scte35_splice_insert');
  const [cueDrmProtected, setCueDrmProtected] = useState(false);
  const [cueOwnSessionOnly, setCueOwnSessionOnly] = useState(true);
  const [cueParseResult, setCueParseResult] = useState<BroadcastCueParseResult | null>(null);
  const [policyExecContext, setPolicyExecContext] =
    useState<CompanionExecutionContext>('owned_edison_session');
  const [policyCapability, setPolicyCapability] =
    useState<CompanionRequestedCapability>('render_overlay');
  const [policyPartnerPrivilege, setPolicyPartnerPrivilege] = useState(false);
  const [policyResult, setPolicyResult] = useState<CompanionPolicyEvalResult | null>(null);
  const [phase4ExitReport, setPhase4ExitReport] = useState<Phase4SoftwareExitReport | null>(null);
  const [runningBlock43, setRunningBlock43] = useState(false);

  // Block 5.2 Break-Duration ML Lower-Bound (p10/p5) Predictor & Recorded Stream Calibration Benchmark
  const [predChannelNumber, setPredChannelNumber] = useState<number>(401);
  const [predDaypart, setPredDaypart] = useState<BreakDaypart>('daytime');
  const [predGenre, setPredGenre] = useState<BreakProgrammeGenre>('live_sport');
  const [predSignalType, setPredSignalType] = useState<SharedIntelSignalType>('av_pattern');
  const [predRequestedAdSec, setPredRequestedAdSec] = useState<number>(30);
  const [predResult, setPredResult] = useState<BreakDurationPredictionResult | null>(null);
  const [benchmarkReport, setBenchmarkReport] =
    useState<BreakCalibrationBenchmarkReport | null>(null);
  const [runningBlock52, setRunningBlock52] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);
  const simVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (initialCreativeId) setSelectedCreativeId(initialCreativeId);
  }, [initialCreativeId]);

  useEffect(() => {
    if (initialCampaignId) setSelectedCampaignId(initialCampaignId);
  }, [initialCampaignId]);

  const loadAll = useCallback(async () => {
    if (!currentUser) {
      setCreatives([]);
      setCampaigns([]);
      setQrLinks([]);
      setProfile(null);
      return;
    }
    setLoading(true);
    try {
      const [crtRes, cmpRes, qrRes, profRes] = await Promise.all([
        edisonFetch('/api/ad-creatives'),
        edisonFetch('/api/campaigns'),
        edisonFetch('/api/qr'),
        edisonFetch('/api/advertiser/profile'),
      ]);
      if (crtRes.ok) {
        const d = await crtRes.json();
        setCreatives(d.items || []);
        if (!selectedCreativeId && d.items?.length > 0) {
          setSelectedCreativeId(d.items[0].id);
        }
      }
      if (cmpRes.ok) {
        const c = await cmpRes.json();
        setCampaigns(c.items || []);
        if (!selectedCampaignId && c.items?.length > 0) {
          const preferred =
            c.items.find((x: CampaignRecord) => x.status === 'draft' || x.status === 'rejected') ??
            c.items[0];
          setSelectedCampaignId(preferred.id);
        }
      }
      if (qrRes.ok) {
        const q = await qrRes.json();
        setQrLinks(q.items || []);
      }
      if (profRes.ok) {
        const p = await profRes.json();
        setProfile(p.profile ?? null);
      }
      const [adapterRes, cacheRes, channelsRes] = await Promise.all([
        edisonFetch('/api/tv-adapters/profiles'),
        edisonFetch('/api/offline-intel-cache/state'),
        edisonFetch('/api/tv-adapters/channels'),
      ]);
      if (adapterRes.ok) {
        const adData = await adapterRes.json();
        if (Array.isArray(adData.profiles)) {
          setTvAdapterProfiles(adData.profiles);
        }
      }
      if (cacheRes.ok) {
        const cData = (await cacheRes.json()) as OfflineCacheStateSnapshot;
        setOfflineCacheState(cData);
      }
      if (channelsRes.ok) {
        const chData = await channelsRes.json();
        if (Array.isArray(chData.channels)) {
          setChannelBindings(chData.channels);
        }
      }
      if (currentUser.role === 'household_viewer' || currentUser.role === 'admin') {
        const hhRes = await edisonFetch('/api/households');
        if (hhRes.ok) {
          const hhData = await hhRes.json();
          setHouseholds(hhData.items || []);
        }
      } else {
        setHouseholds([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedCreativeId, selectedCampaignId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeCreative = useMemo(
    () => creatives.find((c) => c.id === selectedCreativeId) ?? creatives[0] ?? null,
    [creatives, selectedCreativeId]
  );

  const activeQrLink = useMemo(() => {
    const tok = activeCreative?.qrToken;
    if (!tok) return null;
    return qrLinks.find((q) => q.token === tok) ?? null;
  }, [activeCreative, qrLinks]);

  const linkedCampaignForCreative = useMemo(() => {
    if (!activeCreative) return null;
    return (
      campaigns.find(
        (c) => c.id === activeCreative.campaignId || c.adCreativeRef === activeCreative.id
      ) ?? null
    );
  }, [activeCreative, campaigns]);

  const activeQrRedirectUrl = useMemo(() => {
    const token = activeCreative?.qrToken || 'edison-demo';
    return `${window.location.origin}/r/${token}`;
  }, [activeCreative]);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(activeQrRedirectUrl, {
      errorCorrectionLevel: 'Q',
      margin: 2,
      width: 300,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrDataUrl('');
      });
    return () => {
      mounted = false;
    };
  }, [activeQrRedirectUrl]);

  // Player timer & video sync
  useEffect(() => {
    if (!isPlaying || !activeCreative) return;
    const maxDur = Math.max(5, activeCreative.displayDurationSeconds || 15);
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev + 1 >= maxDur) {
          setIsPlaying(false);
          return maxDur;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeCreative]);

  useEffect(() => {
    const vid = playerVideoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, activeCreative]);

  // Fullscreen listener
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    const el = stageContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleRestartPlayer = () => {
    setElapsedSeconds(0);
    if (playerVideoRef.current) {
      playerVideoRef.current.currentTime = 0;
    }
    setIsPlaying(true);
  };

  const handleTestQrDestination = () => {
    if (!activeCreative?.qrToken) {
      setQrTestFeedback({
        ok: false,
        redirectUrl: '(none)',
        destinationUrl: 'No validated /r/:token attached to this creative.',
        status: 'unlinked',
      });
      return;
    }
    setQrTestFeedback({
      ok: activeQrLink ? activeQrLink.status === 'active' : true,
      redirectUrl: activeQrRedirectUrl,
      destinationUrl: activeQrLink?.resolvedUrl ?? 'Validated EDISON Redirect Token',
      status: activeQrLink?.status ?? 'active',
    });
  };

  // Fetch Pre-Submit Gate
  const fetchGate = useCallback(async (cmpId: string) => {
    if (!cmpId) {
      setGateResult(null);
      return;
    }
    setLoadingGate(true);
    try {
      const res = await edisonFetch(`/api/campaigns/${cmpId}/preview-gate`);
      if (res.ok) {
        const data = await res.json();
        setGateResult(data.gate);
      }
    } finally {
      setLoadingGate(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'gate' && selectedCampaignId) {
      fetchGate(selectedCampaignId);
    }
  }, [subTab, selectedCampaignId, fetchGate]);

  const handleSubmitViaGate = async () => {
    if (!gateResult) return;
    setSubmittingCampaign(true);
    setGateActionFeedback(null);
    try {
      const res = await edisonFetch(`/api/campaigns/${gateResult.campaign.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: 'submitted' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGateActionFeedback({
          type: 'err',
          text: data.error || 'Pre-Submission Gate rejected submission.',
        });
        return;
      }
      setGateActionFeedback({
        type: 'ok',
        text: `Preview approved and campaign "${data.item.title}" submitted for review (${data.item.status}).`,
      });
      await loadAll();
      await fetchGate(gateResult.campaign.id);
      await onSummaryRefresh();
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const currentPlannedSlot: ScheduledBreakSlot | null = useMemo(() => {
    if (!breakPlan || activeSlotCursor < 0 || activeSlotCursor >= breakPlan.slots.length) {
      return null;
    }
    return breakPlan.slots[activeSlotCursor] ?? null;
  }, [breakPlan, activeSlotCursor]);

  const activeSimCreative = useMemo(() => {
    if (currentPlannedSlot) {
      if (currentPlannedSlot.creativeId) {
        return creatives.find((c) => c.id === currentPlannedSlot.creativeId) ?? null;
      }
      return null;
    }
    return activeCreative;
  }, [currentPlannedSlot, creatives, activeCreative]);

  const activeSimQrLink = useMemo(() => {
    const tok = currentPlannedSlot?.qrToken ?? activeSimCreative?.qrToken ?? null;
    if (!tok) return null;
    return qrLinks.find((q) => q.token === tok) ?? null;
  }, [currentPlannedSlot, activeSimCreative, qrLinks]);

  // Simulator Telemetry helper
  const emitSimEvent = useCallback(
    async (
      eventType:
        | 'ad_requested'
        | 'ad_delivered'
        | 'ad_played'
        | 'ad_viewable'
        | 'ad_network_backfill_simulated',
      label: string,
      overrides?: { campaignId?: string | null; qrToken?: string | null }
    ) => {
      setSimLogs((prev) => [
        `[${formatClock(liveBroadcastClock)} · SIMULATED] ${label}`,
        ...prev.slice(0, 18),
      ]);
      try {
        await edisonFetch('/api/simulator/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId:
              overrides && 'campaignId' in overrides
                ? overrides.campaignId
                : linkedCampaignForCreative?.id ?? null,
            qrToken:
              overrides && 'qrToken' in overrides
                ? overrides.qrToken
                : activeCreative?.qrToken ?? null,
            eventType,
          }),
        });
      } catch {
        // Non-blocking in simulation
      }
    },
    [liveBroadcastClock, linkedCampaignForCreative, activeCreative]
  );

  // Plan Alternating 4-Slot Break via SimulationTvAdapter
  const handlePlanBreak = async () => {
    setPlanningBreak(true);
    try {
      const selectedHh = households.find((h) => h.id === selectedBreakHouseholdId);
      const res = await edisonFetch('/api/simulator/schedule-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedBreakDurationSeconds: breakDurationInput,
          safetyBufferSeconds: safetyBufferInput,
          requestedSlotCount: 4,
          alternatingPointerStart: alternatingStart,
          allowMockBackfill,
          ...(selectedHh
            ? {
                householdId: selectedHh.id,
                expectedConsentEpoch: selectedHh.consentEpoch,
              }
            : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const plan: BreakSchedulePlan = data.plan;
        setBreakPlan(plan);
        setSimLogs((prev) => [
          plan.skipped
            ? `[${formatClock(liveBroadcastClock)} · SCHEDULER] Break SKIPPED safely: ${plan.skipReason}`
            : `[${formatClock(liveBroadcastClock)} · SCHEDULER] Planned ${plan.slots.length} alternating slots (${plan.slots.map((s) => s.primaryCategory).join(' -> ')}) · next=${plan.nextAlternatingPointer}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setPlanningBreak(false);
    }
  };

  const handleSimulateAuraRemote = async (
    command: TvRemoteCommand,
    targetInput?: 'LIVE_TUNER' | 'HDMI_1' | 'HDMI_2'
  ) => {
    setDispatchingTvCmd(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/remote-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          intentSource: 'AURA',
          command,
          targetInput,
          faultMode: tvFaultMode,
          simulateActiveAdSession: simulateAdActive,
          currentState: { ...simTvDeviceState, platformId: selectedPlatformId },
        }),
      });
      if (res.ok) {
        const result = (await res.json()) as TvRemoteDispatchResult;
        setTvDispatchResult(result);
        setSimTvDeviceState(result.nextState);
        setSimulateAdActive(result.nextState.adBreakOverlayActive);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · TV-ADAPTER-SIM] ${result.detail}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setDispatchingTvCmd(false);
    }
  };

  const handleRunBreakLifecycle = async (
    action: 'enter_ad_session' | 'exit_to_ordinary_tv'
  ) => {
    setDispatchingTvCmd(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/break-lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          action,
          faultMode: tvFaultMode,
          currentState: { ...simTvDeviceState, platformId: selectedPlatformId },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as TvBreakLifecycleResult;
        setTvLifecycleResult(data);
        setSimTvDeviceState(data.nextState);
        setSimulateAdActive(data.nextState.adBreakOverlayActive);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · HARNESS-4.1] ${data.detail}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setDispatchingTvCmd(false);
    }
  };

  const handleRunFaultSuite = async () => {
    setRunningFaultSuite(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/fault-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const report = (await res.json()) as TvFaultSuiteReport;
        setTvFaultSuiteReport(report);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · FAULT-SUITE] ${report.passedCases}/${report.totalCases} deterministic fault cases passed (hardwareTested=false).`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningFaultSuite(false);
    }
  };

  const handleCacheStageSwap = async (simulateCorruptManifest: boolean) => {
    setCacheBusy(true);
    try {
      const activeBundle = offlineCacheState?.bundles.find((b) => b.scopeId === cacheScopeId);
      const nextVer = (activeBundle?.version ?? 2) + 1;
      const res = await edisonFetch('/api/offline-intel-cache/stage-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeId: cacheScopeId,
          nextVersion: nextVer,
          p10BreakDurationSec: (activeBundle?.p10BreakDurationSec ?? 70) + 5,
          p50BreakDurationSec: (activeBundle?.p50BreakDurationSec ?? 100) + 5,
          switchingLatencyMs: activeBundle?.switchingLatencyMs ?? 380,
          simulateCorruptManifest,
        }),
      });
      const data = await res.json();
      if (data.state) setOfflineCacheState(data.state);
      setOfflineCacheFeedback(data);
    } finally {
      setCacheBusy(false);
    }
  };

  const handleCacheRollback = async () => {
    setCacheBusy(true);
    try {
      const res = await edisonFetch('/api/offline-intel-cache/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId: cacheScopeId }),
      });
      const data = await res.json();
      if (data.state) setOfflineCacheState(data.state);
      setOfflineCacheFeedback(data);
    } finally {
      setCacheBusy(false);
    }
  };

  const handleRunCadenceSimulation = async () => {
    setRunningBlock42(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/cadence-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          channelNumber: selectedChannelNumber,
          signalType: selectedChannelNumber === 201 ? 'hbbtv_ait' : 'scte35_cue',
          observedBreakDurationSec: cadenceBreakSec,
          adDurationSeconds: 20,
          safetyBufferSeconds: 5,
          networkOnline: cadenceNetworkOnline,
          faultMode: tvFaultMode,
          currentState: { ...simTvDeviceState, platformId: selectedPlatformId },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCadenceResult(data);
        if (data.cacheState) setOfflineCacheState(data.cacheState);
        if (data.finalTvState) setSimTvDeviceState(data.finalTvState);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · CADENCE-4.2] ${data.detail}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock42(false);
    }
  };

  const handleDrainOfflineQueue = async (online: boolean) => {
    setRunningBlock42(true);
    try {
      const res = await edisonFetch('/api/offline-intel-cache/drain-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkOnline: online, maxBatchSize: 50 }),
      });
      const data = await res.json();
      setQueueDrainResult(data);
      if (data.state) setOfflineCacheState(data.state);
      setSimLogs((prev) => [
        `[${formatClock(liveBroadcastClock)} · QUEUE-DRAIN] ${data.detail}`,
        ...prev.slice(0, 18),
      ]);
    } finally {
      setRunningBlock42(false);
    }
  };

  const handleRunConformanceVectors = async () => {
    setRunningBlock42(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/conformance-vectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const report = (await res.json()) as TvEmulatorConformanceReport;
        setConformanceReport(report);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · CONFORMANCE-4.2] ${report.passedVectors}/${report.totalVectors} emulator vectors passed (hardwareTested=false).`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock42(false);
    }
  };

  const handleParseBroadcastCue = async () => {
    setRunningBlock43(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/parse-cue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard: cueStandard,
          channelNumber: selectedChannelNumber,
          breakDurationSec: cadenceBreakSec,
          adDurationSeconds: 20,
          safetyBufferSeconds: 5,
          drmProtected: cueDrmProtected,
          ownSessionOnly: cueOwnSessionOnly,
          spliceEventId: 4001,
          outOfNetworkIndicator: true,
          confidenceScore: 0.92,
        }),
      });
      if (res.ok) {
        const parsed = (await res.json()) as BroadcastCueParseResult;
        setCueParseResult(parsed);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · CUE-4.3] ${parsed.action}: ${parsed.reason}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock43(false);
    }
  };

  const handleEvaluateCompanionPolicy = async () => {
    setRunningBlock43(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/evaluate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          executionContext: policyExecContext,
          requestedCapability: policyCapability,
          hasPartnerPrivilege: policyPartnerPrivilege,
          hasExplicitViewerConsent: true,
          drmHdcpActive: cueDrmProtected,
        }),
      });
      if (res.ok) {
        const evaluated = (await res.json()) as CompanionPolicyEvalResult;
        setPolicyResult(evaluated);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · POLICY-4.3] ${evaluated.decision}: ${evaluated.reason}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock43(false);
    }
  };

  const handleRunPhase4ExitSuite = async () => {
    setRunningBlock43(true);
    try {
      const res = await edisonFetch('/api/tv-adapters/phase4-exit-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const report = (await res.json()) as Phase4SoftwareExitReport;
        setPhase4ExitReport(report);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · PHASE4-EXIT] ${report.passedChecks}/${report.totalChecks} checks passed (softwareExitReady=${report.softwareExitReady}, hardwareTested=false).`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock43(false);
    }
  };

  const handlePredictBreakBounds = async () => {
    setRunningBlock52(true);
    try {
      const res = await edisonFetch('/api/break-predictor/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelNumber: predChannelNumber,
          daypart: predDaypart,
          programmeGenre: predGenre,
          signalType: predSignalType,
          elapsedBreakSec: 0,
          requestedAdDurationSec: predRequestedAdSec,
          switchingOverheadSec: 2,
          safetyBufferSeconds: 5,
          drmProtected: false,
        }),
      });
      if (res.ok) {
        const result = (await res.json()) as BreakDurationPredictionResult;
        setPredResult(result);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · ML-P10-5.2] CH ${result.channelNumber} (${result.daypart}/${result.programmeGenre}) -> p5=${result.p5Sec}s p10=${result.p10Sec}s mean=${result.meanSec}s -> ${result.decision}`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock52(false);
    }
  };

  const handleRunCalibrationBenchmark = async () => {
    setRunningBlock52(true);
    try {
      const res = await edisonFetch('/api/break-predictor/calibrate-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const report = (await res.json()) as BreakCalibrationBenchmarkReport;
        setBenchmarkReport(report);
        setSimLogs((prev) => [
          `[${formatClock(liveBroadcastClock)} · CALIBRATION-5.2] ${report.passedFixtures}/${report.totalFixtures} fixtures passed · FPR=${report.falsePositiveRatePct}% · MAE=${report.meanAbsoluteErrorSec}s (hardwareTested=false).`,
          ...prev.slice(0, 18),
        ]);
      }
    } finally {
      setRunningBlock52(false);
    }
  };

  // Commercial-Break Simulator Engine
  // Live TV broadcast clock continues advancing even during ad breaks so Return to TV lands at current live point.
  useEffect(() => {
    if (!simRunning) return;
    const adDuration = currentPlannedSlot
      ? Math.max(5, currentPlannedSlot.durationSeconds)
      : Math.max(5, activeCreative?.displayDurationSeconds ?? 15);

    const tick = window.setInterval(() => {
      setLiveBroadcastClock((t) => t + 1);

      if (simPhase === 'break_countdown') {
        setBreakCountdown((c) => {
          if (c <= 1) {
            setSimPhase('ad_playing');
            setSimAdElapsed(0);
            if (currentPlannedSlot) {
              if (currentPlannedSlot.isMockBackfill) {
                emitSimEvent(
                  'ad_network_backfill_simulated',
                  `Slot #${currentPlannedSlot.slotIndex} [${currentPlannedSlot.primaryCategory}] -> ${currentPlannedSlot.title} [MOCK AD NETWORK]`,
                  { campaignId: null, qrToken: null }
                );
              } else {
                emitSimEvent(
                  'ad_delivered',
                  `Slot #${currentPlannedSlot.slotIndex} [${currentPlannedSlot.primaryCategory}] -> "${currentPlannedSlot.title}" ($${currentPlannedSlot.estimatedValueUsd.toFixed(2)})`,
                  {
                    campaignId: currentPlannedSlot.campaignId,
                    qrToken: currentPlannedSlot.qrToken,
                  }
                );
                emitSimEvent(
                  'ad_played',
                  `Playing Slot #${currentPlannedSlot.slotIndex} (${currentPlannedSlot.source})`,
                  {
                    campaignId: currentPlannedSlot.campaignId,
                    qrToken: currentPlannedSlot.qrToken,
                  }
                );
              }
            } else {
              emitSimEvent(
                'ad_delivered',
                `Break safety buffer passed -> Playing "${activeCreative?.title ?? 'EDISON Spot'}"`
              );
              emitSimEvent('ad_played', 'EDISON 16:9 ad started inside simulated TV frame');
            }
            return 0;
          }
          return c - 1;
        });
      } else if (simPhase === 'ad_playing') {
        setSimAdElapsed((e) => {
          const next = e + 1;
          if (next === 2 && (!currentPlannedSlot || !currentPlannedSlot.isMockBackfill)) {
            emitSimEvent(
              'ad_viewable',
              '2s continuous playback threshold reached [SIMULATED]',
              currentPlannedSlot
                ? { campaignId: currentPlannedSlot.campaignId, qrToken: currentPlannedSlot.qrToken }
                : undefined
            );
          }
          if (next >= adDuration) {
            if (breakPlan && activeSlotCursor >= 0 && activeSlotCursor + 1 < breakPlan.slots.length) {
              const nextCursor = activeSlotCursor + 1;
              const nextSlot = breakPlan.slots[nextCursor];
              setActiveSlotCursor(nextCursor);
              if (nextSlot.isMockBackfill) {
                emitSimEvent(
                  'ad_network_backfill_simulated',
                  `Slot #${nextSlot.slotIndex} [${nextSlot.primaryCategory}] -> ${nextSlot.title} [MOCK AD NETWORK]`,
                  { campaignId: null, qrToken: null }
                );
              } else {
                emitSimEvent(
                  'ad_delivered',
                  `Slot #${nextSlot.slotIndex} [${nextSlot.primaryCategory}] -> "${nextSlot.title}" ($${nextSlot.estimatedValueUsd.toFixed(2)})`,
                  { campaignId: nextSlot.campaignId, qrToken: nextSlot.qrToken }
                );
                emitSimEvent(
                  'ad_played',
                  `Playing Slot #${nextSlot.slotIndex} (${nextSlot.source})`,
                  { campaignId: nextSlot.campaignId, qrToken: nextSlot.qrToken }
                );
              }
              return 0;
            }
            setSimPhase('live_tv');
            setActiveSlotCursor(-1);
            if (breakPlan) {
              setAlternatingStart(breakPlan.nextAlternatingPointer);
            }
            setSimLogs((prev) => [
              `[SIMULATED] Break ended (${adDuration}s final spot) -> Returned to Live TV at advancing broadcast clock`,
              ...prev.slice(0, 18),
            ]);
            return adDuration;
          }
          return next;
        });
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [simRunning, simPhase, activeCreative, breakPlan, activeSlotCursor, currentPlannedSlot, emitSimEvent]);

  useEffect(() => {
    const vid = simVideoRef.current;
    if (!vid) return;
    if (simRunning && simPhase === 'ad_playing') {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [simRunning, simPhase]);

  const triggerSimulatedBreak = () => {
    setActiveSlotCursor(-1);
    setSimRunning(true);
    setSimPhase('break_countdown');
    setBreakCountdown(3);
    setSimAdElapsed(0);
    setSimPhoneOpened(false);
    emitSimEvent('ad_requested', 'Break marker simulated -> Checking duration & safety buffer (3s)');
  };

  const triggerPlannedBreakSequence = () => {
    if (!breakPlan || breakPlan.skipped || breakPlan.slots.length === 0) return;
    setActiveSlotCursor(0);
    setSimRunning(true);
    setSimPhase('break_countdown');
    setBreakCountdown(2);
    setSimAdElapsed(0);
    setSimPhoneOpened(false);
    emitSimEvent(
      'ad_requested',
      `Planned ${breakPlan.slots.length}-slot alternating sequence triggered (${breakPlan.slots.map((s) => s.primaryCategory).join(' -> ')})`,
      {
        campaignId: breakPlan.slots[0]?.campaignId ?? null,
        qrToken: breakPlan.slots[0]?.qrToken ?? null,
      }
    );
  };

  const handleManualReturnToTv = () => {
    setSimPhase('live_tv');
    setSimAdElapsed(0);
    setActiveSlotCursor(-1);
    setSimLogs((prev) => [
      `[${formatClock(liveBroadcastClock)} · SIMULATED] Immediate Manual Return pressed -> Restored live channel stream`,
      ...prev.slice(0, 18),
    ]);
  };

  const handleResetSimulator = () => {
    setSimRunning(false);
    setSimPhase('live_tv');
    setBreakCountdown(3);
    setSimAdElapsed(0);
    setActiveSlotCursor(-1);
    setSimPhoneOpened(false);
    setSimLogs([]);
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <Tv className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Open 16:9 TV Preview &amp; Commercial-Break Simulator
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Inspect playable 16:9 advertisements, verify the Pre-Submission Approval Gate, and run the simulated break switcher using an authenticated prototype session.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Go to Auth &amp; RBAC Console
        </button>
      </div>
    );
  }

  const isOpportunitySpot =
    activeCreative?.optionA?.templateId.startsWith('opportunity_') ||
    linkedCampaignForCreative?.contentCategory === 'opportunity_promotion';

  const reportText = [
    'EDISON — BLOCK 2.4 TELEVISION PREVIEW, PRE-SUBMIT GATE & BREAK SIMULATOR REPORT',
    `Account: ${currentUser.email} (${currentUser.role})`,
    `Active Mode: ${subTab}`,
    `Selected Creative: ${activeCreative ? `${activeCreative.title} (${activeCreative.id}, ${activeCreative.displayDurationSeconds}s)` : 'None'}`,
    `Selected Gate Campaign: ${gateResult ? `${gateResult.campaign.title} (${gateResult.campaign.status}) · Ready=${gateResult.readyToSubmit}` : 'None loaded'}`,
    `Commercial-Break Simulator State: ${simPhase} | Live Simulated Broadcast Clock: ${formatClock(liveBroadcastClock)} [SIMULATION — NOT LIVE BROADCAST TUNER]`,
  ].join('\n');

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            16:9 Television Preview, Pre-Submit Gate &amp; Break Simulator
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Playable 16:9 verification engine, server-enforced pre-submission readiness gate, and clearly labelled commercial-break simulation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubTab('player')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'player'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. 16:9 TV Preview
            </button>
            <button
              type="button"
              onClick={() => setSubTab('gate')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'gate'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Pre-Submit Gate
            </button>
            <button
              type="button"
              onClick={() => setSubTab('simulator')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Break Simulator
            </button>
          </div>
          <button
            type="button"
            onClick={loadAll}
            aria-label="Refresh preview data"
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MODE 1: FULL 16:9 TELEVISION PREVIEW PLAYER */}
      {subTab === 'player' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Advertisement Creative to Preview on 16:9 TV
                </label>
                <select
                  value={activeCreative?.id ?? ''}
                  onChange={(e) => {
                    setSelectedCreativeId(e.target.value);
                    setElapsedSeconds(0);
                    setIsPlaying(false);
                    setQrTestFeedback(null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  {creatives.length === 0 ? (
                    <option value="">No saved creatives yet — create one in Ad Creation Studio</option>
                  ) : (
                    creatives.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ·{' '}
                        {c.mode === 'option_a_studio'
                          ? 'Option A'
                          : c.mode === 'option_b_upload'
                          ? 'Option B'
                          : 'Text-Only Commercial'}{' '}
                        · {c.displayDurationSeconds}s ({c.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSafeGuide}
                    onChange={(e) => setShowSafeGuide(e.target.checked)}
                  />
                  <span>5% Title-Safe Guide</span>
                </label>
                <button
                  type="button"
                  onClick={() => onReturnToEditor(activeCreative?.id ?? null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Editor</span>
                </button>
              </div>
            </div>

            {activeCreative ? (
              <div className="space-y-4">
                <div
                  ref={stageContainerRef}
                  className="bg-slate-950 p-2 sm:p-4 rounded-xl border border-slate-800 space-y-3"
                >
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
                    <CreativeStage
                      creative={activeCreative}
                      qrLink={activeQrLink}
                      qrDataUrl={qrDataUrl}
                      isPlaying={isPlaying}
                      showSafeGuide={showSafeGuide}
                      elapsedSeconds={elapsedSeconds}
                      videoRef={playerVideoRef}
                      onVideoEnded={() => setIsPlaying(false)}
                    />
                  </div>

                  {/* TV Player Transport Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (elapsedSeconds >= activeCreative.displayDurationSeconds) {
                            setElapsedSeconds(0);
                            if (playerVideoRef.current) playerVideoRef.current.currentTime = 0;
                          }
                          setIsPlaying((p) => !p);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRestartPlayer}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restart</span>
                      </button>

                      <span className="text-xs font-mono tabular-nums text-slate-300 px-2">
                        {formatClock(elapsedSeconds)} / {formatClock(activeCreative.displayDurationSeconds)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestQrDestination}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 rounded-lg cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Test QR Destination</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {qrTestFeedback && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                      qrTestFeedback.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        QR Destination Verification ({qrTestFeedback.status})
                      </p>
                      <p className="font-mono break-all">
                        Redirect: {qrTestFeedback.redirectUrl} -&gt; {qrTestFeedback.destinationUrl}
                      </p>
                    </div>
                    {qrTestFeedback.ok && activeCreative.qrToken && (
                      <a
                        href={`/r/${activeCreative.qrToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold bg-white border border-emerald-300 rounded-lg text-emerald-800 hover:bg-emerald-100 whitespace-nowrap self-start sm:self-center"
                      >
                        <span>Open /r/{activeCreative.qrToken}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Opportunity Metadata & Non-Guarantee Panel */}
                {isOpportunitySpot && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Opportunity Television Metadata &amp; Verification Card</span>
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-white border border-emerald-300 rounded">
                        {profile?.verificationStatus === 'verified'
                          ? 'Organisation Verified · Specific Opportunity Verification Pending (Block 2.5)'
                          : 'Verification Tiers Assessed in Block 2.5'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900">
                      <p>
                        <strong>Title:</strong> {activeCreative.optionA?.heading || activeCreative.title}
                      </p>
                      <p>
                        <strong>Provider:</strong> {profile?.businessOrTradingName || currentUser.organisationName || currentUser.name}
                      </p>
                      <p>
                        <strong>Location / Details:</strong> {activeCreative.optionA?.contactDetails || 'See destination link'}
                      </p>
                      <p>
                        <strong>Application / Instructions:</strong> {activeCreative.optionA?.callToAction || 'Scan QR to apply free'}
                      </p>
                    </div>
                    <p className="text-[11px] text-emerald-800 border-t border-emerald-200 pt-2">
                      <strong>Mandatory Non-Guarantee Notice:</strong> Opportunity verification confirms legitimacy checks; EDISON does not guarantee employment, funding, scholarships, or acceptance.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No advertisement creatives available yet. Create one in the Ad Creation Studio first.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: FINAL PRE-SUBMISSION APPROVAL GATE */}
      {subTab === 'gate' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Campaign to Run Final Pre-Submission Approval Gate
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setGateActionFeedback(null);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} [{c.status}] · {c.durationSeconds}s
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => selectedCampaignId && fetchGate(selectedCampaignId)}
              disabled={loadingGate}
              className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {loadingGate ? 'Evaluating Gate...' : 'Re-Evaluate Gate'}
            </button>
          </div>

          {gateActionFeedback && (
            <div
              role="status"
              className={`p-3.5 rounded-lg border text-xs ${
                gateActionFeedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {gateActionFeedback.text}
            </div>
          )}

          {gateResult && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-6 space-y-3">
                <p className="text-xs font-semibold text-slate-800">
                  Playable 16:9 Gate Preview ({gateResult.creative?.title ?? 'No Creative Attached'})
                </p>
                {gateResult.creative ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-300 bg-black">
                    <CreativeStage
                      creative={gateResult.creative}
                      qrLink={gateResult.qrLink}
                      qrDataUrl={qrDataUrl}
                      isPlaying={true}
                      showSafeGuide={true}
                      elapsedSeconds={0}
                      videoRef={playerVideoRef}
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-lg border border-dashed border-red-300 bg-red-50 flex flex-col items-center justify-center p-6 text-center text-xs text-red-800 space-y-2">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <p className="font-semibold">Blocking Error: No Advertisement Creative Attached</p>
                    <p>Attach an Option A, Option B, or Text-Only Commercial spot in Ad Creation Studio before submitting.</p>
                  </div>
                )}

                {gateResult.qrLink && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all">
                    QR Target: /r/{gateResult.qrLink.token} -&gt; {gateResult.qrLink.resolvedUrl} ({gateResult.qrLink.status})
                  </div>
                )}
              </div>

              <div className="xl:col-span-6 space-y-4">
                <div
                  className={`p-4 rounded-lg border text-xs space-y-1 ${
                    gateResult.readyToSubmit
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}
                >
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {gateResult.readyToSubmit ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-700" />
                    )}
                    <span>
                      {gateResult.readyToSubmit
                        ? 'Pre-Submission Approval Gate PASSED'
                        : `Pre-Submission Gate BLOCKED (${gateResult.blockingErrors.length} blocking issue)`}
                    </span>
                  </p>
                  {gateResult.blockingErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {gateResult.checklist.map((item) => (
                    <div key={item.id} className="p-3 text-xs flex items-start gap-2.5">
                      {item.status === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : item.status === 'warn' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-slate-600 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onReturnToEditor(gateResult.creative?.id ?? null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit Creative in Studio</span>
                  </button>

                  {(gateResult.campaign.status === 'draft' ||
                    gateResult.campaign.status === 'rejected') && (
                    <button
                      type="button"
                      disabled={!gateResult.readyToSubmit || submittingCampaign}
                      onClick={handleSubmitViaGate}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingCampaign
                        ? 'Submitting...'
                        : 'Approve Preview & Submit Campaign'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: COMMERCIAL-BREAK SIMULATOR */}
      {subTab === 'simulator' && (
        <div className="space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <p className="font-bold font-mono tracking-wide">
                SIMULATION — NOT LIVE BROADCAST TUNER
              </p>
              <p>
                Demonstrates EDISON&apos;s break-transition UX and continuous live TV clock recovery. Does not prove Smart TV OS tuner access, SCTE-35 broadcast detection, or physical HDMI switching.
              </p>
            </div>
            <span className="font-mono font-semibold text-amber-900 whitespace-nowrap shrink-0">
              State: {simPhase.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Simulated Television Screen */}
            <div className="xl:col-span-8 bg-slate-950 p-3 sm:p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-mono">
                <span>SIMULATED TV INPUT · CH 04 LIVE STREAM</span>
                <span className="tabular-nums">
                  LIVE BROADCAST CLOCK: {formatClock(liveBroadcastClock)}
                </span>
              </div>

              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                {simPhase === 'ad_playing' && (activeSimCreative || currentPlannedSlot) ? (
                  <>
                    {activeSimCreative ? (
                      <CreativeStage
                        creative={activeSimCreative}
                        qrLink={activeSimQrLink}
                        qrDataUrl={qrDataUrl}
                        isPlaying={simRunning}
                        showSafeGuide={false}
                        elapsedSeconds={simAdElapsed}
                        videoRef={simVideoRef}
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 text-white ${
                          currentPlannedSlot?.primaryCategory === 'CHARITY'
                            ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950'
                            : currentPlannedSlot?.isMockBackfill
                            ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950'
                            : 'bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded bg-white/15 font-semibold">
                            {currentPlannedSlot?.primaryCategory} · {currentPlannedSlot?.source}
                          </span>
                          <span className="px-2.5 py-1 rounded bg-white/10">
                            {currentPlannedSlot?.isMockBackfill
                              ? 'MOCK AD NETWORK ESTIMATE'
                              : currentPlannedSlot?.primaryCategory === 'CHARITY'
                              ? '$0.00 / FREE OPPORTUNITY'
                              : `DIRECT COMMERCIAL ($${currentPlannedSlot?.estimatedValueUsd.toFixed(2)})`}
                          </span>
                        </div>
                        <div className="my-auto space-y-2 max-w-2xl">
                          <h3 className="text-xl sm:text-2xl font-bold leading-snug">
                            {currentPlannedSlot?.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-200">
                            {currentPlannedSlot?.fillNote}
                          </p>
                          {currentPlannedSlot?.qrToken && (
                            <p className="font-mono text-xs text-emerald-300">
                              Scan QR Target: {window.location.origin}/r/{currentPlannedSlot.qrToken}
                            </p>
                          )}
                        </div>
                        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (simAdElapsed /
                                    Math.max(5, currentPlannedSlot?.durationSeconds ?? 15)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-900/85 text-white text-[11px] font-mono z-40">
                      {currentPlannedSlot
                        ? `SLOT #${currentPlannedSlot.slotIndex}/${breakPlan?.slots.length ?? 1} [${currentPlannedSlot.primaryCategory}] · `
                        : 'EDISON BREAK SPOT · '}
                      {formatClock(simAdElapsed)} /{' '}
                      {formatClock(
                        currentPlannedSlot?.durationSeconds ??
                          activeSimCreative?.displayDurationSeconds ??
                          15
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleManualReturnToTv}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow z-40 cursor-pointer"
                    >
                      Manual Return to Live TV
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col justify-between p-6 text-white bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-white/10">
                        SIMULATED PROGRAMME: EVENING NEWS &amp; WEATHER
                      </span>
                      <span className="tabular-nums text-emerald-400">
                        ● LIVE {formatClock(liveBroadcastClock)}
                      </span>
                    </div>

                    <div className="text-center space-y-2 my-auto">
                      <MonitorPlay className="w-10 h-10 text-blue-400 mx-auto" />
                      <p className="text-lg sm:text-xl font-bold">
                        {simRunning
                          ? 'Simulated Linear Television Broadcast Playing'
                          : 'Simulated Television Stream Ready'}
                      </p>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        Live clock continues advancing in real time even while an EDISON break spot is displayed, so returning lands at the live moment.
                      </p>
                    </div>

                    {simPhase === 'break_countdown' && (
                      <div className="p-3 bg-blue-600/90 rounded-lg text-center text-xs font-semibold">
                        Simulated Break Triggered · Safety Buffer Verified · Displaying{' '}
                        {currentPlannedSlot
                          ? `Planned Slot #1 (${currentPlannedSlot.primaryCategory})`
                          : 'EDISON Spot'}{' '}
                        in {breakCountdown}s...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Simulator Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimRunning((r) => !r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{simRunning ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerSimulatedBreak}
                    disabled={simPhase !== 'live_tv'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Trigger Single Spot</span>
                  </button>

                  {breakPlan && !breakPlan.skipped && breakPlan.slots.length > 0 && (
                    <button
                      type="button"
                      onClick={triggerPlannedBreakSequence}
                      disabled={simPhase !== 'live_tv'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Play {breakPlan.slots.length}-Slot Alternating Break</span>
                    </button>
                  )}

                  {simPhase === 'ad_playing' && (
                    <button
                      type="button"
                      onClick={handleManualReturnToTv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                    >
                      <span>Skip / Manual Return</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetSimulator}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <select
                  value={activeCreative?.id ?? ''}
                  onChange={(e) => setSelectedCreativeId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white max-w-[240px]"
                >
                  {creatives.map((c) => (
                    <option key={c.id} value={c.id}>
                      Spot: {c.title} ({c.displayDurationSeconds}s)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simulated Mobile Phone Companion & Event Log */}
            <div className="xl:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Viewer Mobile Scan Companion</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  EDISON routes viewers directly to the advertiser or opportunity URL via HTTP 302—never a secondary EDISON ad feed on the phone.
                </p>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <p className="font-mono text-slate-700 break-all">
                    QR Token:{' '}
                    {(currentPlannedSlot?.qrToken ?? activeCreative?.qrToken)
                      ? `/r/${currentPlannedSlot?.qrToken ?? activeCreative?.qrToken}`
                      : 'None'}
                  </p>
                  <p className="font-mono text-slate-600 break-all">
                    Target:{' '}
                    {activeSimQrLink?.resolvedUrl ??
                      activeQrLink?.resolvedUrl ??
                      'https://example.org/edison-demo'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSimPhoneOpened(true)}
                    className="w-full py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Simulate Phone QR Scan
                  </button>
                  {simPhoneOpened && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                      [SIMULATED] Phone browser opened direct destination URL directly (zero intermediate EDISON ads).
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5">
                <p className="text-xs font-semibold text-slate-900">
                  Simulator Event Trace (Simulated Only)
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px] font-mono text-slate-700">
                  {simLogs.length === 0 ? (
                    <p className="text-slate-400">
                      Press Start, Trigger Single Spot, or Plan Alternating Break below.
                    </p>
                  ) : (
                    simLogs.map((line, idx) => (
                      <p key={idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                        {line}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Block P2-V2.2: Alternating 4-Slot Break Scheduler & Direct Priority vs Mock AdNetworkAdapter */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Alternating 4-Slot Break Scheduler (SimulationTvAdapter · Block P2-V2.2)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Enforces strict <strong>CHARITY -&gt; COMMERCIAL -&gt; CHARITY -&gt; COMMERCIAL</strong> alternation, direct-paid commercial priority before{' '}
                  <span className="font-mono">MockAdNetworkBackfillAdapter</span> (GAM CTV unresolved <span className="font-mono">DEC-OPEN-03</span>), and safety-buffer break skipping (&lt;10s usable).
                </p>
              </div>
              <button
                type="button"
                onClick={handlePlanBreak}
                disabled={planningBreak}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {planningBreak ? 'Planning Break...' : 'Plan Alternating Break'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Break Duration (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={breakDurationInput}
                  onChange={(e) => setBreakDurationInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Safety Buffer (seconds)
                </label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={safetyBufferInput}
                  onChange={(e) => setSafetyBufferInput(Number(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alternating Pointer Start
                </label>
                <select
                  value={alternatingStart}
                  onChange={(e) => setAlternatingStart(e.target.value as PrimaryAdCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                >
                  <option value="CHARITY">CHARITY (Charity -&gt; Commercial...)</option>
                  <option value="COMMERCIAL">COMMERCIAL (Commercial -&gt; Charity...)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMockBackfill}
                    onChange={(e) => setAllowMockBackfill(e.target.checked)}
                  />
                  <span className="text-slate-700 font-medium">
                    Allow Mock Ad Network Backfill
                  </span>
                </label>
              </div>
            </div>

            {households.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs pt-1">
                <label className="font-medium text-slate-700 whitespace-nowrap">
                  Bind Household Consent &amp; Personalisation Gate (Track B):
                </label>
                <select
                  value={selectedBreakHouseholdId}
                  onChange={(e) => setSelectedBreakHouseholdId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Unbound Simulator Mode (No Household Consent Filter)</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.householdLabel} ({h.publicLocation.countryCode} · Epoch v{h.consentEpoch} ·{' '}
                      {h.commercialConsentStatus === 'granted' ? 'Consent Active' : 'Withdrawn'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {breakPlan && (
              <div className="space-y-3 pt-2">
                <div
                  className={`p-3.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    breakPlan.skipped
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold font-mono">
                      {breakPlan.adDeliverySuspended
                        ? 'COMMERCIAL & CHARITY AD DELIVERY SUSPENDED BY CONSENT WITHDRAWAL (ORDINARY TV PRESERVED)'
                        : breakPlan.skipped
                        ? 'BREAK SKIPPED BY SAFETY BUFFER GUARDRAIL'
                        : `PLANNED ${breakPlan.slots.length} SLOTS (${breakPlan.totalScheduledDurationSeconds}s of ${breakPlan.usableBreakSeconds}s usable) · Next Pointer: ${breakPlan.nextAlternatingPointer}`}
                    </p>
                    <p>
                      {breakPlan.suspensionReason ??
                        breakPlan.skipReason ??
                        breakPlan.adapterDisclaimer}
                    </p>
                  </div>
                  {breakPlan.k1ShortBreakRuleApplied && (
                    <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded font-mono font-semibold">
                      k=1 Short-Break Alternation Applied (DEC-OPEN-02)
                    </span>
                  )}
                </div>

                {breakPlan.tvPersonalisation && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-900 text-white text-xs space-y-1">
                    <p className="font-mono text-slate-400">
                      SAFE TV PERSONALISATION ({breakPlan.tvPersonalisation.mode.toUpperCase()} · PRIVATE DATA EXPOSED: FALSE)
                    </p>
                    <p className="font-semibold text-sm">
                      {breakPlan.tvPersonalisation.tvHeadline}
                    </p>
                    <p className="text-slate-300">{breakPlan.tvPersonalisation.tvSubline}</p>
                  </div>
                )}

                {breakPlan.slots.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Slot</th>
                          <th className="py-2 px-3 font-semibold">Primary Category</th>
                          <th className="py-2 px-3 font-semibold">Inventory Source</th>
                          <th className="py-2 px-3 font-semibold">Selected Creative / Listing</th>
                          <th className="py-2 px-3 font-semibold text-right">Duration</th>
                          <th className="py-2 px-3 font-semibold text-right">Ledger Estimate</th>
                          <th className="py-2 px-3 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {breakPlan.slots.map((sl) => (
                          <tr
                            key={sl.slotIndex}
                            className={
                              activeSlotCursor >= 0 &&
                              breakPlan.slots[activeSlotCursor]?.slotIndex === sl.slotIndex
                                ? 'bg-blue-50'
                                : 'hover:bg-slate-50/70'
                            }
                          >
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              #{sl.slotIndex}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold">
                              <span
                                className={
                                  sl.primaryCategory === 'CHARITY'
                                    ? 'text-emerald-700'
                                    : 'text-blue-700'
                                }
                              >
                                {sl.primaryCategory}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {sl.isMockBackfill ? (
                                <span className="text-amber-700 font-semibold">
                                  mock_ad_network_backfill [MOCK]
                                </span>
                              ) : (
                                sl.source
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {sl.title}
                              {sl.qrToken && (
                                <span className="block font-mono text-[11px] text-slate-500">
                                  /r/{sl.qrToken}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                              {sl.durationSeconds}s
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                              {sl.primaryCategory === 'CHARITY' ? (
                                <span className="text-emerald-700">$0.00 FREE</span>
                              ) : sl.isMockBackfill ? (
                                <span className="text-amber-700">
                                  ~${sl.estimatedValueUsd.toFixed(2)} MOCK
                                </span>
                              ) : (
                                <span className="text-slate-900">
                                  ${sl.estimatedValueUsd.toFixed(2)} SIM
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{sl.fillNote}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Block P3-C: Software-Only Modular TvPlatformAdapter & AURA Normal Everyday TV Remote Simulator */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Modular TvPlatformAdapter &amp; AURA Normal Everyday TV Remote (Software-Only Sim)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Exercises <span className="font-mono">AURA → EDISON Control Engine → platform adapter → TV</span> and
                    deterministic watchdog restoration under fault injection. Physical TV hardware testing remains strictly deferred to <span className="font-mono">Stage P6</span>.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded">
                  SOFTWARE SIMULATION · HARDWARE TESTED: FALSE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Target Modular Adapter
                  </label>
                  <select
                    aria-label="Target Modular Adapter"
                    value={selectedPlatformId}
                    onChange={(e) => {
                      const nextId = e.target.value as TvPlatformId;
                      setSelectedPlatformId(nextId);
                      setSimTvDeviceState((s) => ({ ...s, platformId: nextId }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {(tvAdapterProfiles.length > 0
                      ? tvAdapterProfiles
                      : [
                          { platformId: 'android_tv_tif', displayName: 'Android TV / Google TV (TIF Mock)' },
                          { platformId: 'samsung_tizen', displayName: 'Samsung Tizen TV (Mock)' },
                          { platformId: 'lg_webos', displayName: 'LG webOS TV (Mock)' },
                          { platformId: 'simulation_tv', displayName: 'SimulationTvAdapter (Contract)' },
                        ]
                    ).map((p) => (
                      <option key={p.platformId} value={p.platformId}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Fault Injection Mode (Watchdog Test)
                  </label>
                  <select
                    aria-label="Fault Injection Mode"
                    value={tvFaultMode}
                    onChange={(e) => setTvFaultMode(e.target.value as TvFaultSimulationMode)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="none">None (Normal Execution)</option>
                    <option value="adapter_timeout">adapter_timeout (Watchdog Restore)</option>
                    <option value="hdcp_blocked">hdcp_blocked (Refuse &amp; Preserve TV)</option>
                    <option value="decoder_crash">decoder_crash (Isolate &amp; Restore)</option>
                    <option value="network_drop">network_drop (Abort Overlay)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateAdActive}
                      onChange={(e) => setSimulateAdActive(e.target.checked)}
                    />
                    <span className="font-medium text-slate-700">
                      Simulate Active Ad Break Overlay
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('power_toggle')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Power
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('volume_up')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Vol +
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('volume_down')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Vol -
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('mute_toggle')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Mute
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('channel_up')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  CH +
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('channel_down')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  CH -
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('input_source_select', 'HDMI_1')}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Input HDMI 1
                </button>
                <button
                  type="button"
                  disabled={dispatchingTvCmd}
                  onClick={() => handleSimulateAuraRemote('back')}
                  className="px-2.5 py-1.5 border border-blue-200 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold cursor-pointer"
                >
                  Back / Restore TV
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Power</span>
                  <span className="font-semibold text-slate-900">
                    {simTvDeviceState.powerOn ? 'ON' : 'STANDBY'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Input</span>
                  <span className="font-semibold text-slate-900">
                    {simTvDeviceState.activeInput}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Channel / Vol</span>
                  <span className="font-semibold text-slate-900">
                    CH {simTvDeviceState.channelNumber} · {simTvDeviceState.muted ? 'MUTE' : `V${simTvDeviceState.volume}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ad Overlay</span>
                  <span className="font-semibold text-slate-900">
                    {simTvDeviceState.adBreakOverlayActive ? 'ACTIVE (SIM)' : 'INACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ordinary TV Intact</span>
                  <span className="font-semibold text-emerald-700">
                    {simTvDeviceState.ordinaryTvIntact ? 'TRUE' : 'FALSE'}
                  </span>
                </div>
              </div>

              {tvDispatchResult && (
                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                    <span>Trace: {tvDispatchResult.auditTraceId}</span>
                    <span>
                      Watchdog: {tvDispatchResult.watchdogTriggered ? 'TRIGGERED' : 'IDLE'} · Outcome:{' '}
                      {tvDispatchResult.restorationOutcome}
                    </span>
                  </div>
                  <p className="text-emerald-300">{tvDispatchResult.detail}</p>
                </div>
              )}

              {/* Phase 4 Block 4.1: Harness Session Lifecycle & Deterministic Fault Suite */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      Phase 4 Block 4.1 · Platform Harness Lifecycle &amp; 16-Case Fault Suite
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Verifies TIF / Tizen / webOS session entry, fail-closed privilege gates, and deterministic watchdog recovery.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={dispatchingTvCmd}
                      onClick={() => handleRunBreakLifecycle('enter_ad_session')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Enter Ad Overlay
                    </button>
                    <button
                      type="button"
                      disabled={dispatchingTvCmd}
                      onClick={() => handleRunBreakLifecycle('exit_to_ordinary_tv')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Yield / Exit to TV
                    </button>
                    <button
                      type="button"
                      disabled={runningFaultSuite}
                      onClick={handleRunFaultSuite}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {runningFaultSuite ? 'Running Suite...' : 'Run 16-Case Fault Suite'}
                    </button>
                  </div>
                </div>

                {tvLifecycleResult && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <span>
                        Harness: {tvLifecycleResult.harnessTelemetry.harnessName} · Phase:{' '}
                        {tvLifecycleResult.harnessTelemetry.harnessPhase}
                      </span>
                      <span>
                        Latency: {tvLifecycleResult.simulatedLatencyMs}ms · Surface:{' '}
                        {tvLifecycleResult.harnessTelemetry.nativeSurfaceId}
                      </span>
                    </div>
                    <p className={tvLifecycleResult.ok ? 'text-emerald-800' : 'text-amber-800'}>
                      {tvLifecycleResult.detail}
                    </p>
                  </div>
                )}

                {tvFaultSuiteReport && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono font-semibold text-emerald-950">
                      <span>
                        Fault Suite Result: {tvFaultSuiteReport.passedCases}/{tvFaultSuiteReport.totalCases} PASSED
                      </span>
                      <span>SOFTWARE SIMULATION · HARDWARE TESTED: FALSE</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 font-mono text-[11px]">
                      {tvFaultSuiteReport.cases.map((fc) => (
                        <div
                          key={`${fc.platformId}-${fc.faultMode}`}
                          className="p-1.5 bg-white border border-emerald-200 rounded flex items-center justify-between gap-1"
                        >
                          <span className="truncate text-slate-700">
                            {fc.platformId}:{fc.faultMode}
                          </span>
                          <span className={fc.passed ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                            {fc.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 4 Block 4.1: Local Offline Intelligence Cache (SHA-256 Atomic Swap & Rollback) */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      Local Offline Intelligence Cache Engine (SHA-256 Atomic Swap &amp; Rollback)
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Zero-PII scoped broadcast bundles verified by SHA-256 before atomic pointer swap; corrupt manifests fail closed.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      aria-label="Offline Cache Scope"
                      value={cacheScopeId}
                      onChange={(e) => setCacheScopeId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      {(offlineCacheState?.bundles ?? []).map((b) => (
                        <option key={b.scopeId} value={b.scopeId}>
                          {b.country} · {b.channel} ({b.platform}) · v{b.version}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={cacheBusy}
                      onClick={() => handleCacheStageSwap(false)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Stage &amp; Atomic Swap
                    </button>
                    <button
                      type="button"
                      disabled={cacheBusy}
                      onClick={() => handleCacheStageSwap(true)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Inject Bad SHA-256
                    </button>
                    <button
                      type="button"
                      disabled={cacheBusy}
                      onClick={handleCacheRollback}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Rollback
                    </button>
                  </div>
                </div>

                {offlineCacheFeedback && (
                  <div
                    className={`p-2.5 rounded border text-xs font-mono ${
                      offlineCacheFeedback.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {offlineCacheFeedback.detail}
                  </div>
                )}

                {offlineCacheState && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
                    {offlineCacheState.bundles.map((b) => (
                      <div key={b.scopeId} className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-0.5">
                        <div className="flex items-center justify-between gap-1 font-semibold text-slate-900">
                          <span className="truncate">{b.channel}</span>
                          <span className="text-blue-700">v{b.version}</span>
                        </div>
                        <p className="text-slate-600 truncate">{b.broadcaster} · {b.platform}</p>
                        <p className="text-slate-700">P10={b.p10BreakDurationSec}s · SHA={b.sha256Manifest}</p>
                        <p className="text-slate-500">Status: {b.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Phase 4 Block 4.2: Multi-Channel Cadence Simulator, Offline Queue Drain & Conformance Vectors */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      Phase 4 Block 4.2 · Multi-Channel Cadence Simulator, Offline Queue Sync &amp; Conformance Vectors
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Drives channel-scoped SCTE-35/HbbTV breaks through offline P10 cache + platform harnesses with idempotent replay deduplication.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      aria-label="Broadcast Channel Binding"
                      value={selectedChannelNumber}
                      onChange={(e) => setSelectedChannelNumber(Number(e.target.value))}
                      className="px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      {(channelBindings.length > 0
                        ? channelBindings
                        : [
                            { channelNumber: 101, channelName: 'BBC One (SCTE-35)' },
                            { channelNumber: 103, channelName: 'ITV1 HD (SCTE-35)' },
                            { channelNumber: 201, channelName: 'ZDF HD (HbbTV-AIT)' },
                          ]
                      ).map((ch) => (
                        <option key={ch.channelNumber} value={ch.channelNumber}>
                          CH {ch.channelNumber} · {ch.channelName}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Observed Break Duration Seconds"
                      type="number"
                      min={10}
                      max={300}
                      value={cadenceBreakSec}
                      onChange={(e) => setCadenceBreakSec(Number(e.target.value) || 20)}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    />
                    <label className="flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 rounded bg-slate-50 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={cadenceNetworkOnline}
                        onChange={(e) => setCadenceNetworkOnline(e.target.checked)}
                      />
                      <span>Online</span>
                    </label>
                    <button
                      type="button"
                      disabled={runningBlock42}
                      onClick={handleRunCadenceSimulation}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Simulate Cadence
                    </button>
                    <button
                      type="button"
                      disabled={runningBlock42}
                      onClick={() => handleDrainOfflineQueue(cadenceNetworkOnline)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Drain Queue ({offlineCacheState?.queuedObservationsCount ?? 0})
                    </button>
                    <button
                      type="button"
                      disabled={runningBlock42}
                      onClick={handleRunConformanceVectors}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Run 8-Vector Conformance
                    </button>
                  </div>
                </div>

                {cadenceResult && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs font-mono space-y-1 text-indigo-950">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>
                        CH {cadenceResult.channelBinding.channelNumber} ({cadenceResult.signalType}) ·{' '}
                        {cadenceResult.breakExecuted ? 'EXECUTED & RESTORED' : 'SAFELY SKIPPED'}
                      </span>
                      <span>
                        Queued: {cadenceResult.observationQueued ? 'YES' : 'DEDUPED'} · Ordinary TV Intact:{' '}
                        {cadenceResult.finalTvState.ordinaryTvIntact ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>
                    <p>{cadenceResult.detail}</p>
                  </div>
                )}

                {queueDrainResult && (
                  <div
                    className={`p-2.5 rounded border text-xs font-mono ${
                      queueDrainResult.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {queueDrainResult.detail} (Total Drained: {offlineCacheState?.drainedObservationsTotal ?? 0} ·
                    Deduplicated Replays: {offlineCacheState?.deduplicatedReplaysCount ?? 0})
                  </div>
                )}

                {conformanceReport && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono font-semibold text-emerald-950">
                      <span>
                        Emulator Conformance Vectors: {conformanceReport.passedVectors}/
                        {conformanceReport.totalVectors} PASSED
                      </span>
                      <span>SOFTWARE SIMULATION · HARDWARE TESTED: FALSE</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-[11px]">
                      {conformanceReport.vectors.map((vec) => (
                        <div
                          key={vec.vectorId}
                          className="p-1.5 bg-white border border-emerald-200 rounded flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-slate-700">
                            {vec.vectorId} ({vec.platformId})
                          </span>
                          <span className={vec.passed ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                            {vec.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 4 Block 4.3: Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & Software Exit Gate */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      Phase 4 Block 4.3 · Broadcast Cue Fixtures, Companion Policy Guardrails &amp; Exit Gate
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Validates lawful SCTE-35/HbbTV/AV-cadence fixtures, ADR-001/ADR-017 privilege &amp; HDCP boundaries, and the 10-check Phase 4 software exit suite.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={runningBlock43}
                    onClick={handleRunPhase4ExitSuite}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {runningBlock43 ? 'Running Exit Gate...' : 'Run Phase 4 Exit Suite (10 Checks)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="font-semibold text-slate-800">Broadcast Cue Fixture Parser</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Broadcast Cue Standard"
                        value={cueStandard}
                        onChange={(e) => setCueStandard(e.target.value as BroadcastCueStandard)}
                        className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                      >
                        <option value="scte35_splice_insert">SCTE-35 splice_insert</option>
                        <option value="hbbtv_ait_dsmcc">HbbTV AIT / DSM-CC</option>
                        <option value="av_cadence_marker">AV Cadence Marker</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cueDrmProtected}
                          onChange={(e) => setCueDrmProtected(e.target.checked)}
                        />
                        <span>DRM/HDCP Protected</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cueOwnSessionOnly}
                          onChange={(e) => setCueOwnSessionOnly(e.target.checked)}
                        />
                        <span>Own Session Only</span>
                      </label>
                      <button
                        type="button"
                        disabled={runningBlock43}
                        onClick={handleParseBroadcastCue}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                      >
                        Parse Cue
                      </button>
                    </div>
                    {cueParseResult && (
                      <div
                        className={`p-2 rounded border font-mono text-[11px] ${
                          cueParseResult.action === 'TRIGGER_EDISON_AD_SLOT'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="font-semibold">{cueParseResult.action}</div>
                        <p>{cueParseResult.reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="font-semibold text-slate-800">Companion Policy Guardrail (ADR-001 / ADR-017)</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Companion Execution Context"
                        value={policyExecContext}
                        onChange={(e) => setPolicyExecContext(e.target.value as CompanionExecutionContext)}
                        className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                      >
                        <option value="owned_edison_session">owned_edison_session</option>
                        <option value="third_party_broadcaster_stream">third_party_broadcaster_stream</option>
                        <option value="system_global_tuner">system_global_tuner</option>
                      </select>
                      <select
                        aria-label="Companion Requested Capability"
                        value={policyCapability}
                        onChange={(e) => setPolicyCapability(e.target.value as CompanionRequestedCapability)}
                        className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                      >
                        <option value="render_overlay">render_overlay</option>
                        <option value="inject_remote_key">inject_remote_key</option>
                        <option value="monitor_epg_global">monitor_epg_global</option>
                        <option value="hdmi_cec_switch">hdmi_cec_switch</option>
                        <option value="bypass_hdcp">bypass_hdcp</option>
                        <option value="background_screen_scrape">background_screen_scrape</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policyPartnerPrivilege}
                          onChange={(e) => setPolicyPartnerPrivilege(e.target.checked)}
                        />
                        <span>Partner Privilege</span>
                      </label>
                      <button
                        type="button"
                        disabled={runningBlock43}
                        onClick={handleEvaluateCompanionPolicy}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                      >
                        Evaluate Policy
                      </button>
                    </div>
                    {policyResult && (
                      <div
                        className={`p-2 rounded border font-mono text-[11px] ${
                          policyResult.allowed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="font-semibold">
                          {policyResult.decision}
                          {policyResult.violatedPolicy ? ` (${policyResult.violatedPolicy})` : ''}
                        </div>
                        <p>{policyResult.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {phase4ExitReport && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono font-semibold text-emerald-950">
                      <span>
                        Phase 4 Software Exit Suite: {phase4ExitReport.passedChecks}/
                        {phase4ExitReport.totalChecks} PASSED · Ready={String(phase4ExitReport.softwareExitReady)}
                      </span>
                      <span>SOFTWARE SIMULATION · HARDWARE TESTED: FALSE · STAGE P6 DEFERRED</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-[11px]">
                      {phase4ExitReport.checks.map((chk) => (
                        <div
                          key={chk.checkId}
                          className="p-1.5 bg-white border border-emerald-200 rounded flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-slate-700">{chk.checkId}</span>
                          <span className={chk.passed ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                            {chk.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 5 Block 5.2: Per-Channel Break Duration ML Lower-Bound (p10/p5) Predictor & Calibration Benchmark */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">
                      Phase 5 Block 5.2 · Break-Duration ML Lower-Bound (p10/p5) Predictor &amp; Recorded Stream Calibration
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Computes channel/daypart/genre empirical quantiles (p5/p10/p50/mean) and never schedules on mean duration—safely skipping unstable live-sport or sub-confidence transitions.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={runningBlock52}
                    onClick={handleRunCalibrationBenchmark}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {runningBlock52 ? 'Running Calibration...' : 'Run 10-Fixture Calibration Benchmark'}
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Predictor Channel"
                      value={predChannelNumber}
                      onChange={(e) => setPredChannelNumber(Number(e.target.value))}
                      className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      <option value={101}>CH 101 · BBC One HD</option>
                      <option value={103}>CH 103 · ITV1 HD</option>
                      <option value={201}>CH 201 · ZDF HD</option>
                      <option value={401}>CH 401 · Premier Sport HD</option>
                    </select>
                    <select
                      aria-label="Predictor Daypart"
                      value={predDaypart}
                      onChange={(e) => setPredDaypart(e.target.value as BreakDaypart)}
                      className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      <option value="morning">morning</option>
                      <option value="daytime">daytime</option>
                      <option value="prime_time">prime_time</option>
                      <option value="late_night">late_night</option>
                    </select>
                    <select
                      aria-label="Predictor Genre"
                      value={predGenre}
                      onChange={(e) => setPredGenre(e.target.value as BreakProgrammeGenre)}
                      className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      <option value="news">news</option>
                      <option value="drama">drama</option>
                      <option value="entertainment">entertainment</option>
                      <option value="live_sport">live_sport</option>
                    </select>
                    <select
                      aria-label="Predictor Signal Type"
                      value={predSignalType}
                      onChange={(e) => setPredSignalType(e.target.value as SharedIntelSignalType)}
                      className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                    >
                      <option value="scte35">scte35</option>
                      <option value="hbbtv">hbbtv</option>
                      <option value="channel_cadence">channel_cadence</option>
                      <option value="av_pattern">av_pattern</option>
                    </select>
                    <input
                      aria-label="Requested Ad Spot Duration Seconds"
                      type="number"
                      min={5}
                      max={120}
                      value={predRequestedAdSec}
                      onChange={(e) => setPredRequestedAdSec(Number(e.target.value) || 15)}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded bg-white font-mono tabular-nums text-[11px]"
                    />
                    <button
                      type="button"
                      disabled={runningBlock52}
                      onClick={handlePredictBreakBounds}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                    >
                      Predict Lower Bounds (p10/p5)
                    </button>
                  </div>

                  {predResult && (
                    <div
                      className={`p-2.5 rounded border font-mono text-[11px] space-y-1.5 ${
                        predResult.safeToSchedule
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                        <span>
                          {predResult.decision} · {predResult.channelName}
                        </span>
                        <span className="tabular-nums">
                          Confidence: {predResult.confidenceScore} · Safe Window: {predResult.effectiveSafeWindowSec}s vs Spot {predResult.requestedAdDurationSec}s
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <div className="text-[10px] text-slate-500">p5 Floor</div>
                          <div className="font-bold text-slate-900">{predResult.p5Sec}s</div>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <div className="text-[10px] text-slate-500">p10 Lower Bound</div>
                          <div className="font-bold text-slate-900">{predResult.p10Sec}s</div>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <div className="text-[10px] text-slate-500">p50 Median</div>
                          <div className="font-bold text-slate-900">{predResult.p50Sec}s</div>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <div className="text-[10px] text-slate-500">Mean (Never Used Alone)</div>
                          <div className="font-bold text-slate-900">{predResult.meanSec}s</div>
                        </div>
                      </div>
                      <p>{predResult.decisionReason}</p>
                    </div>
                  )}
                </div>

                {benchmarkReport && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono font-semibold text-emerald-950 tabular-nums">
                      <span>
                        Recorded Stream Calibration: {benchmarkReport.passedFixtures}/
                        {benchmarkReport.totalFixtures} PASSED · FPR={benchmarkReport.falsePositiveRatePct}% · P10 Containment={benchmarkReport.p10SafeContainmentRatePct}% · MAE={benchmarkReport.meanAbsoluteErrorSec}s · Avg Detect={benchmarkReport.avgDetectionLatencyMs}ms
                      </span>
                      <span>SOFTWARE FIXTURE BENCHMARK · HARDWARE TESTED: FALSE</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-[11px] tabular-nums">
                      {benchmarkReport.fixtures.map((fix) => (
                        <div
                          key={fix.fixtureId}
                          className="p-1.5 bg-white border border-emerald-200 rounded flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-slate-700">
                            {fix.fixtureId} (p10={fix.predictedP10Sec}s / mean={fix.predictedMeanSec}s)
                          </span>
                          <span className={fix.passed ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                            {fix.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CopyReportFooter
        reportText={reportText}
        reportTitle="Block 2.4 Television Preview & Simulator Report"
      />
    </div>
  );
}
