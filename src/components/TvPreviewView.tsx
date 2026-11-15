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
  BreakSchedulePlan,
  CampaignPreviewGateResult,
  CampaignRecord,
  PrimaryAdCategory,
  PublicUser,
  QrLinkRecord,
  ScheduledBreakSlot,
} from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';

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
  const [breakPlan, setBreakPlan] = useState<BreakSchedulePlan | null>(null);
  const [planningBreak, setPlanningBreak] = useState(false);
  const [activeSlotCursor, setActiveSlotCursor] = useState(-1); // -1 = single spot, >=0 = multi-slot planned break

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
        fetch('/api/ad-creatives'),
        fetch('/api/campaigns'),
        fetch('/api/qr'),
        fetch('/api/advertiser/profile'),
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
      const res = await fetch(`/api/campaigns/${cmpId}/preview-gate`);
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
      const res = await fetch(`/api/campaigns/${gateResult.campaign.id}/transition`, {
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
        await fetch('/api/simulator/events', {
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
      const res = await fetch('/api/simulator/schedule-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedBreakDurationSeconds: breakDurationInput,
          safetyBufferSeconds: safetyBufferInput,
          requestedSlotCount: 4,
          alternatingPointerStart: alternatingStart,
          allowMockBackfill,
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
                      {breakPlan.skipped
                        ? 'BREAK SKIPPED BY SAFETY BUFFER GUARDRAIL'
                        : `PLANNED ${breakPlan.slots.length} SLOTS (${breakPlan.totalScheduledDurationSeconds}s of ${breakPlan.usableBreakSeconds}s usable) · Next Pointer: ${breakPlan.nextAlternatingPointer}`}
                    </p>
                    <p>{breakPlan.skipReason ?? breakPlan.adapterDisclaimer}</p>
                  </div>
                  {breakPlan.k1ShortBreakRuleApplied && (
                    <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded font-mono font-semibold">
                      k=1 Short-Break Alternation Applied (DEC-OPEN-02)
                    </span>
                  )}
                </div>

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
