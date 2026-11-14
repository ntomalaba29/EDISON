import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AccountVerificationStatus,
  AdCreativeRecord,
  AdminModerationOverview,
  AuditLogRecord,
  CampaignRecord,
  PublicUser,
  QrLinkRecord,
  QrLinkStatus,
  SevenStageAnalyticsSnapshot,
  SupportTicketStatus,
} from '../types/edison';
import { CreativeStage } from './TvPreviewView';
import { CopyReportFooter } from './CopyReportFooter';

interface AdminAnalyticsViewProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

type AdminSubTab = 'funnel' | 'campaigns' | 'governance';

function formatClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function provenanceLabel(
  source: 'real_measured' | 'simulated_prototype' | 'unverified_in_prototype'
): { text: string; colorClass: string } {
  if (source === 'real_measured') {
    return { text: 'Real Measured', colorClass: 'text-emerald-700 font-semibold' };
  }
  if (source === 'simulated_prototype') {
    return { text: 'Simulated Prototype', colorClass: 'text-amber-700 font-semibold' };
  }
  return { text: 'Independent Verification Required', colorClass: 'text-slate-600 font-semibold' };
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function AdminAnalyticsView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: AdminAnalyticsViewProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('funnel');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Analytics State
  const [funnel, setFunnel] = useState<SevenStageAnalyticsSnapshot | null>(null);
  const [campaignFilterId, setCampaignFilterId] = useState<string>('');

  // Admin Moderation State
  const [overview, setOverview] = useState<AdminModerationOverview | null>(null);
  const [creatives, setCreatives] = useState<AdCreativeRecord[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<CampaignRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditTargetFilter, setAuditTargetFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Selected campaign in Admin 16:9 Moderation Stage
  const [queueFilter, setQueueFilter] = useState<'pending' | 'active_scheduled' | 'all'>('pending');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [fixInstructions, setFixInstructions] = useState<string>('');
  const [flagClearNotes, setFlagClearNotes] = useState<string>('');

  // Playable 16:9 Moderation Stage controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSafeGuide, setShowSafeGuide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrTestNotice, setQrTestNotice] = useState<string | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);

  // Governance action inputs
  const [profileNotesMap, setProfileNotesMap] = useState<Record<string, string>>({});
  const [qrReasonMap, setQrReasonMap] = useState<Record<string, string>>({});
  const [ticketResponseMap, setTicketResponseMap] = useState<Record<string, string>>({});

  const isAdmin = currentUser?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setFunnel(null);
      setOverview(null);
      setCreatives([]);
      setAllCampaigns([]);
      setAuditLogs([]);
      return;
    }

    setLoading(true);
    try {
      const funnelUrl = campaignFilterId
        ? `/api/analytics/funnel?campaignId=${encodeURIComponent(campaignFilterId)}`
        : '/api/analytics/funnel';
      const promises: Promise<Response>[] = [fetch(funnelUrl)];
      if (isAdmin) {
        promises.push(fetch('/api/admin/moderation-overview'));
        promises.push(fetch('/api/ad-creatives'));
        promises.push(fetch('/api/campaigns'));
        promises.push(
          fetch(`/api/admin/audit-logs?targetType=${encodeURIComponent(auditTargetFilter)}&limit=150`)
        );
      }
      const results = await Promise.all(promises);
      if (results[0].ok) {
        setFunnel(await results[0].json());
      }
      if (isAdmin && results.length >= 5) {
        if (results[1].ok) setOverview(await results[1].json());
        if (results[2].ok) setCreatives(((await results[2].json()).items as AdCreativeRecord[]) || []);
        if (results[3].ok) {
          const cmps: CampaignRecord[] = (await results[3].json()).items || [];
          setAllCampaigns(cmps);
          setSelectedCampaignId((prev) => {
            if (prev && cmps.some((c) => c.id === prev)) return prev;
            const pending = cmps.find((c) => c.status === 'submitted' || c.status === 'under_review');
            return (pending ?? cmps[0])?.id ?? '';
          });
        }
        if (results[4].ok) {
          setAuditLogs(((await results[4].json()).items as AuditLogRecord[]) || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, campaignFilterId, auditTargetFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQueueCampaigns = useMemo(() => {
    if (queueFilter === 'pending') {
      return allCampaigns.filter((c) => c.status === 'submitted' || c.status === 'under_review');
    }
    if (queueFilter === 'active_scheduled') {
      return allCampaigns.filter(
        (c) =>
          c.status === 'approved' ||
          c.status === 'scheduled' ||
          c.status === 'active' ||
          c.status === 'paused'
      );
    }
    return allCampaigns;
  }, [allCampaigns, queueFilter]);

  const selectedCampaign = useMemo(
    () => allCampaigns.find((c) => c.id === selectedCampaignId) ?? filteredQueueCampaigns[0] ?? null,
    [allCampaigns, selectedCampaignId, filteredQueueCampaigns]
  );

  const selectedCreative = useMemo(() => {
    if (!selectedCampaign?.adCreativeRef) return null;
    return creatives.find((cr) => cr.id === selectedCampaign.adCreativeRef) ?? null;
  }, [selectedCampaign, creatives]);

  const selectedQrLink = useMemo(() => {
    const token = selectedCampaign?.qrToken || selectedCreative?.qrToken || null;
    if (!token || !overview) return null;
    return overview.qrLinks.find((q) => q.token === token) ?? null;
  }, [selectedCampaign, selectedCreative, overview]);

  // Generate QR data URL for playable 16:9 moderation stage
  useEffect(() => {
    const token = selectedCreative?.qrToken || selectedCampaign?.qrToken || 'edison-demo';
    const targetUrl = `${window.location.origin}/r/${token}`;
    QRCode.toDataURL(targetUrl, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [selectedCreative, selectedCampaign]);

  // Play/Pause timer for Option A & static Option B images in moderation stage
  useEffect(() => {
    if (!isPlaying || !selectedCreative) return;
    if (selectedCreative.mode === 'option_b_upload' && selectedCreative.optionB?.mediaKind === 'video') {
      return;
    }
    const maxSecs = Math.max(5, selectedCreative.displayDurationSeconds || 15);
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev + 1 >= maxSecs) {
          setIsPlaying(false);
          return maxSecs;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, selectedCreative]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = () => {
    if (!selectedCreative) return;
    const isVideo =
      selectedCreative.mode === 'option_b_upload' && selectedCreative.optionB?.mediaKind === 'video';
    if (isVideo && playerVideoRef.current) {
      if (isPlaying) {
        playerVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        playerVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    const maxSecs = Math.max(5, selectedCreative.displayDurationSeconds || 15);
    if (!isPlaying && elapsedSeconds >= maxSecs) {
      setElapsedSeconds(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleRestart = () => {
    setElapsedSeconds(0);
    setQrTestNotice(null);
    if (
      selectedCreative?.mode === 'option_b_upload' &&
      selectedCreative.optionB?.mediaKind === 'video' &&
      playerVideoRef.current
    ) {
      playerVideoRef.current.currentTime = 0;
      playerVideoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      setIsPlaying(true);
    }
  };

  const handleFullscreen = async () => {
    if (!stageContainerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await stageContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleModerateCampaign = async (
    targetStatus: 'under_review' | 'approved' | 'rejected' | 'paused' | 'draft'
  ) => {
    if (!selectedCampaign) return;
    setFeedback(null);
    const res = await fetch(`/api/campaigns/${selectedCampaign.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus,
        rejectionReason: targetStatus === 'rejected' ? rejectionReason : undefined,
        fixInstructions: targetStatus === 'rejected' ? fixInstructions : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || `Transition to ${targetStatus} failed.` });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Campaign "${data.item.title}" transitioned cleanly to ${data.item.status}.`,
    });
    if (targetStatus === 'rejected') {
      setRejectionReason('');
      setFixInstructions('');
    }
    await loadData();
    await onSummaryRefresh();
  };

  const handleClearCreativeFlag = async (creativeId: string) => {
    setFeedback(null);
    const res = await fetch(`/api/admin/creatives/${creativeId}/clear-qr-flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: flagClearNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Unable to clear creative review flag.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Cleared review flag for creative "${data.item.title}" (${data.item.id}) and logged moderator notes.`,
    });
    setFlagClearNotes('');
    await loadData();
    await onSummaryRefresh();
  };

  const handleProfileVerification = async (userId: string, status: AccountVerificationStatus) => {
    const notes =
      (profileNotesMap[userId] ?? '').trim() || `Administrator marked profile ${status}.`;
    setFeedback(null);
    const res = await fetch(`/api/admin/advertiser-profiles/${userId}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Profile verification update failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Updated advertiser "${data.profile.businessOrTradingName}" verification -> ${data.profile.verificationStatus}.`,
    });
    await loadData();
    await onSummaryRefresh();
  };

  const handleQrModerate = async (qr: QrLinkRecord, status: QrLinkStatus) => {
    const reason =
      (qrReasonMap[qr.token] ?? '').trim() || `Moderator set /r/${qr.token} to ${status}.`;
    setFeedback(null);
    const res = await fetch(`/api/admin/qr/${encodeURIComponent(qr.token)}/moderate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'QR moderation failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `QR link /r/${data.item.token} updated to ${data.item.status}.`,
    });
    await loadData();
    await onSummaryRefresh();
  };

  const handleTicketUpdate = async (ticketId: string, status: SupportTicketStatus) => {
    const adminResponse =
      (ticketResponseMap[ticketId] ?? '').trim() || `Admin updated ticket status to ${status}.`;
    setFeedback(null);
    const res = await fetch(`/api/support-tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminResponse }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Ticket update failed.' });
      return;
    }
    setFeedback({ type: 'ok', text: `Support ticket ${ticketId} marked ${data.item.status}.` });
    await loadData();
    await onSummaryRefresh();
  };

  const handleExportCsv = () => {
    if (!funnel) return;
    const rows: string[] = [
      ['Section', 'StageOrCampaign', 'MeasurementSource', 'RawCount', 'NetNonBotCount', 'BotsExcluded', 'SecondaryMetric', 'Notes']
        .map(csvEscape)
        .join(','),
    ];
    for (const s of funnel.stages) {
      rows.push(
        [
          '7-Stage Funnel',
          s.label,
          s.measurementSource,
          s.rawCount,
          s.deduplicatedCount,
          s.suspectedBotExcluded,
          s.secondaryLabel ? `${s.secondaryLabel}: ${s.secondaryCount ?? 0}` : '',
          s.epistemicNote,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    for (const c of funnel.campaignBreakdown) {
      rows.push(
        [
          'Campaign Breakdown',
          `${c.title} (${c.campaignId})`,
          c.status,
          c.simulatedRequested,
          c.realRedirectIssued,
          c.suspectedBotFiltered,
          `VerifiedOpens: ${c.verifiedOpens}`,
          c.qrToken ? `/r/${c.qrToken}` : 'No QR',
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edison-7-stage-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.targetId.toLowerCase().includes(q) ||
        a.targetType.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Access Moderation &amp; 7-Stage Analytics
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Advertisers and opportunity providers can inspect 7-stage funnel metrics for their own campaigns, while administrators unlock 16:9 creative moderation, QR domain verification, and immutable audit logs.
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

  const stage5 = funnel?.stages.find((s) => s.key === 'redirect_requested');
  const stage6 = funnel?.stages.find((s) => s.key === 'redirect_issued');
  const stage7 = funnel?.stages.find((s) => s.key === 'destination_opened_and_conversion');

  const reportText = [
    'EDISON — BLOCK 2.6 MODERATION & 7-STAGE ANALYTICS REPORT',
    `Account: ${currentUser.email} (${currentUser.role}) · Scope: ${funnel?.scope ?? 'loading'}`,
    `Stage 5 Redirect Requests (Raw / Net Non-Bot / Bots): ${stage5?.rawCount ?? 0} / ${stage5?.deduplicatedCount ?? 0} / ${stage5?.suspectedBotExcluded ?? 0}`,
    `Stage 6 Redirects Issued (HTTP 302): ${stage6?.rawCount ?? 0} (Net Non-Bot: ${stage6?.deduplicatedCount ?? 0})`,
    `Stage 7 Verified Destination Opens / Conversions: ${stage7?.rawCount ?? 0} / ${stage7?.secondaryCount ?? 0} (Never inferred from HTTP 302)`,
    isAdmin
      ? `Moderation Queues -> Pending Campaigns: ${overview?.pendingCampaigns.length ?? 0} | Flagged Creatives: ${overview?.flaggedCreatives.length ?? 0} | Audit Logs: ${auditLogs.length}`
      : 'Admin queues restricted to admin role (RBAC verified).',
  ].join('\n');

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Moderation Console &amp; 7-Stage Measurement Integrity
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Simulated UI playback is permanently isolated from real `/r/:token` HTTP 302 telemetry, bot filtering, and verified destination opens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubTab('funnel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'funnel'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. 7-Stage Analytics Funnel
            </button>
            <button
              type="button"
              onClick={() => setSubTab('campaigns')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'campaigns'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. 16:9 Campaign Moderation
            </button>
            <button
              type="button"
              onClick={() => setSubTab('governance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'governance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Accounts, QR, Tickets &amp; Audits
            </button>
          </div>
          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh moderation and analytics"
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-xs ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* SUBTAB 1: 7-STAGE ANALYTICS FUNNEL */}
      {subTab === 'funnel' && (
        <div className="space-y-5">
          {/* Measurement Integrity Guardrail */}
          <div className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>EDISON Measurement Integrity Policy Active</span>
              </p>
              <p className="text-slate-300">
                HTTP 302 redirects never fabricate human QR scans or destination page opens. Bot crawlers, WhatsApp/Slack link previewers, and 5-second duplicates are counted transparently.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Filter analytics by campaign"
                value={campaignFilterId}
                onChange={(e) => setCampaignFilterId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg"
              >
                <option value="">
                  {isAdmin ? 'Network-Wide Accessible Scope' : 'All My Campaigns & QR Links'}
                </option>
                {(funnel?.campaignBreakdown ?? []).map((cb) => (
                  <option key={cb.campaignId} value={cb.campaignId}>
                    {cb.title} ({cb.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!funnel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 7-Stage Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Seven-Stage EDISON Delivery &amp; QR Conversion Funnel
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Scope: {funnel?.scope ?? '...'} · Events Sampled: {funnel?.recentEvents.length ?? 0}
              </span>
            </div>

            {!funnel ? (
              <div className="p-6 text-xs text-slate-500">Loading analytics snapshot...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Funnel Stage</th>
                      <th className="py-2.5 px-4 font-semibold">Measurement Source</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Raw</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Bots Excluded</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Net Non-Bot</th>
                      <th className="py-2.5 px-4 font-semibold">Integrity &amp; Epistemic Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {funnel.stages.map((st) => {
                      const prov = provenanceLabel(st.measurementSource);
                      return (
                        <tr key={st.key} className="hover:bg-slate-50/70 align-top">
                          <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                            {st.label}
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap ${prov.colorClass}`}>
                            {prov.text}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                            {st.rawCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                            {st.suspectedBotExcluded}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {st.deduplicatedCount}
                            {st.secondaryLabel && (
                              <div className="text-[11px] font-normal text-slate-500">
                                {st.secondaryLabel}: {st.secondaryCount ?? 0}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-md">{st.epistemicNote}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Per-Campaign Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Per-Campaign Telemetry Comparison
              </h3>
            </div>
            {funnel && funnel.campaignBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Campaign</th>
                      <th className="py-2.5 px-4 font-semibold">Status &amp; QR</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Sim Requested</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Sim Played</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Net Redirect Req</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Net HTTP 302</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Bots Filtered</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Verified Opens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {funnel.campaignBreakdown.map((c) => (
                      <tr key={c.campaignId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {c.title}
                          <div className="font-mono text-[11px] text-slate-500">{c.campaignId}</div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {c.status} · {c.qrToken ? `/r/${c.qrToken}` : 'Unlinked'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700">
                          {c.simulatedRequested}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700">
                          {c.simulatedPlayed}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                          {c.realRedirectRequested}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {c.realRedirectIssued}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                          {c.suspectedBotFiltered}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                          {c.verifiedOpens}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 text-xs text-slate-500">
                No accessible campaigns found yet for analytics comparison.
              </div>
            )}
          </div>

          {/* Recent Analytics Event Stream */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Raw Measurement Event Ledger
              </h3>
            </div>
            {funnel && funnel.recentEvents.length > 0 ? (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 font-semibold">Timestamp</th>
                      <th className="py-2 px-4 font-semibold">Event Type</th>
                      <th className="py-2 px-4 font-semibold">Provenance</th>
                      <th className="py-2 px-4 font-semibold">QR / Campaign</th>
                      <th className="py-2 px-4 font-semibold">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {funnel.recentEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-2 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {ev.createdAt.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2 px-4 font-mono font-medium text-slate-900">
                          {ev.eventType}
                        </td>
                        <td
                          className={`py-2 px-4 font-mono ${
                            ev.measurementSource === 'real_measured'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {ev.measurementSource}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-600">
                          {ev.qrToken ? `/r/${ev.qrToken}` : '—'} · {ev.campaignId ?? '—'}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-600">
                          {ev.isSuspectedBot ? 'bot_filtered ' : ''}
                          {ev.isDeduplicated ? 'deduplicated ' : ''}
                          {ev.redirectOutcome ? `outcome=${ev.redirectOutcome}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 text-xs text-slate-500">
                No analytics events recorded yet. Run the Commercial-Break Simulator or trigger an `/r/:token` redirect to observe isolated real vs simulated telemetry.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ADMIN 16:9 CAMPAIGN MODERATION */}
      {subTab === 'campaigns' &&
        (!isAdmin ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-2 text-xs">
            <p className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Administrator Role Required for Campaign Moderation</span>
            </p>
            <p className="text-slate-600">
              Signed in as <strong className="font-mono">{currentUser.email}</strong> ({currentUser.role}). Server-side RBAC restricts campaign approval, rejection, suspension, and creative QR flag clearance strictly to administrators. Switch to <span className="font-mono">admin@edison.demo</span> in Auth &amp; RBAC Console to inspect playable 16:9 submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Queue Selector */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Campaign Moderation Queue ({filteredQueueCampaigns.length})
                  </h3>
                  <p className="text-xs text-slate-600">
                    Inspect full playable 16:9 media, verify exact resolved destination hosts, and record written rejection/fix instructions.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQueueFilter('pending')}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      queueFilter === 'pending'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    Pending ({overview?.pendingCampaigns.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('active_scheduled')}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      queueFilter === 'active_scheduled'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    Live &amp; Scheduled ({overview?.activeOrScheduledCampaigns.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      queueFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    All ({allCampaigns.length})
                  </button>
                </div>
              </div>

              {filteredQueueCampaigns.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No campaigns match the selected moderation filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredQueueCampaigns.map((cmp) => {
                    const isSelected = selectedCampaign?.id === cmp.id;
                    return (
                      <button
                        key={cmp.id}
                        type="button"
                        onClick={() => {
                          setSelectedCampaignId(cmp.id);
                          setElapsedSeconds(0);
                          setIsPlaying(false);
                          setQrTestNotice(null);
                        }}
                        className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer space-y-1 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {cmp.title}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {cmp.status} · {cmp.contentCategory}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {cmp.id} · QR: {cmp.qrToken ? `/r/${cmp.qrToken}` : 'None'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Playable 16:9 Inspection Stage + Decision Controls */}
            {selectedCampaign && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Moderating: {selectedCampaign.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      ID: {selectedCampaign.id} · Status: {selectedCampaign.status} · Schedule:{' '}
                      {selectedCampaign.startDate} to {selectedCampaign.endDate} · Resolved Host:{' '}
                      {selectedQrLink?.resolvedHost ?? 'No active QR linked'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowSafeGuide((s) => !s)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      {showSafeGuide ? 'Hide 5% Safe Guide' : 'Show 5% Safe Guide'}
                    </button>
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 16:9'}</span>
                    </button>
                  </div>
                </div>

                {/* 16:9 Playable Stage */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-3">
                    <div
                      ref={stageContainerRef}
                      className="w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-300"
                    >
                      {selectedCreative ? (
                        <CreativeStage
                          creative={selectedCreative}
                          qrLink={selectedQrLink}
                          qrDataUrl={qrDataUrl}
                          isPlaying={isPlaying}
                          showSafeGuide={showSafeGuide}
                          elapsedSeconds={elapsedSeconds}
                          videoRef={playerVideoRef}
                          onVideoEnded={() => setIsPlaying(false)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-300 p-6 text-center">
                          No advertisement creative attached to campaign {selectedCampaign.id}.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={togglePlay}
                          disabled={!selectedCreative}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{isPlaying ? 'Pause' : 'Play Ad'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestart}
                          disabled={!selectedCreative}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restart</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedQrLink) {
                              setQrTestNotice(
                                `Redirect /r/${selectedQrLink.token} -> ${selectedQrLink.resolvedUrl} (Host: ${selectedQrLink.resolvedHost} · Status: ${selectedQrLink.status})`
                              );
                            } else {
                              setQrTestNotice('No valid active QR redirect link attached.');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Inspect QR Destination</span>
                        </button>
                      </div>
                      <span className="font-mono tabular-nums text-slate-600">
                        {formatClock(elapsedSeconds)} /{' '}
                        {formatClock(selectedCreative?.displayDurationSeconds ?? 15)}
                      </span>
                    </div>

                    {qrTestNotice && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono break-all">{qrTestNotice}</span>
                        {selectedQrLink && (
                          <a
                            href={`/r/${selectedQrLink.token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline shrink-0"
                          >
                            <span>Open /r/{selectedQrLink.token}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Moderation Checklist & Decision Controls */}
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <p className="font-semibold text-slate-900">Creative &amp; QR QA Findings</p>
                      {selectedCreative ? (
                        <>
                          <p className="text-slate-600">
                            Creative: <strong className="font-mono">{selectedCreative.id}</strong> ({selectedCreative.mode}) · Status: <strong className="font-mono">{selectedCreative.status}</strong>
                          </p>
                          {selectedCreative.optionB && (
                            <p className="text-slate-600">
                              Option B QR Inspection:{' '}
                              <strong className="font-mono">
                                {selectedCreative.optionB.qrInspectionStatus}
                              </strong>
                            </p>
                          )}
                          {(selectedCreative.status === 'flagged_for_review' ||
                            selectedCreative.optionB?.requiresAdminReviewFlag) && (
                            <div className="pt-2 border-t border-slate-200 space-y-2">
                              <p className="text-amber-800 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Manual Moderator QR Review Required</span>
                              </p>
                              <input
                                type="text"
                                placeholder="Written moderator verification note (min 5 chars)..."
                                value={flagClearNotes}
                                onChange={(e) => setFlagClearNotes(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleClearCreativeFlag(selectedCreative.id)}
                                className="w-full px-3 py-1.5 font-semibold text-slate-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded cursor-pointer"
                              >
                                Clear Suspected-Unreadable Flag
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-red-700">Missing linked creative.</p>
                      )}
                    </div>

                    <div className="p-3.5 border border-slate-200 rounded-lg space-y-3">
                      <p className="font-semibold text-slate-900">Moderator Transitions</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCampaign.status === 'submitted' && (
                          <button
                            type="button"
                            onClick={() => handleModerateCampaign('under_review')}
                            className="px-3 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                          >
                            Start Under Review
                          </button>
                        )}
                        {(selectedCampaign.status === 'submitted' ||
                          selectedCampaign.status === 'under_review') && (
                          <button
                            type="button"
                            onClick={() => handleModerateCampaign('approved')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Campaign</span>
                          </button>
                        )}
                        {(selectedCampaign.status === 'active' ||
                          selectedCampaign.status === 'scheduled' ||
                          selectedCampaign.status === 'approved') && (
                          <button
                            type="button"
                            onClick={() => handleModerateCampaign('paused')}
                            className="px-3 py-1.5 font-semibold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded cursor-pointer"
                          >
                            Pause / Halt Playback
                          </button>
                        )}
                      </div>

                      {(selectedCampaign.status === 'submitted' ||
                        selectedCampaign.status === 'under_review') && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <input
                            type="text"
                            placeholder="Mandatory rejection reason (min 5 chars)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                          />
                          <input
                            type="text"
                            placeholder="Required fix instructions for advertiser..."
                            value={fixInstructions}
                            onChange={(e) => setFixInstructions(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleModerateCampaign('rejected')}
                            className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject with Reason &amp; Instructions</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flagged Option B Creatives Queue */}
            {overview && overview.flaggedCreatives.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
                <h3 className="text-sm font-semibold text-slate-900">
                  Flagged Creative Assets ({overview.flaggedCreatives.length})
                </h3>
                <div className="space-y-2">
                  {overview.flaggedCreatives.map((cr) => (
                    <div
                      key={cr.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{cr.title}</span> ·{' '}
                        <span className="font-mono text-slate-600">
                          {cr.id} · status={cr.status} · qrInspection={cr.optionB?.qrInspectionStatus ?? 'n/a'}
                        </span>
                      </div>
                      <span className="font-mono text-amber-800">
                        {cr.optionB?.qrInspectionStatus === 'decoded_mismatch'
                          ? 'Mismatch Blocked Until Re-Upload'
                          : 'Select Linked Campaign Above to Inspect'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

      {/* SUBTAB 3: ACCOUNTS, QR LINKS, TICKETS & IMMUTABLE AUDIT TRAIL */}
      {subTab === 'governance' &&
        (!isAdmin ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-2 text-xs">
            <p className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Administrator Role Required for Governance Queues &amp; Audit Logs</span>
            </p>
            <p className="text-slate-600">
              Account verification toggles, QR domain suspension, support ticket resolutions, and immutable audit logs are strictly limited to verified EDISON administrators.
            </p>
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Advertiser Verification Queue */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Advertiser Account Verification ({overview?.advertiserProfiles.length ?? 0})
              </h3>
              <div className="space-y-3">
                {(overview?.advertiserProfiles ?? []).map((prof) => (
                  <div
                    key={prof.userId}
                    className="p-3.5 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {prof.businessOrTradingName}
                        </span>{' '}
                        · <span className="font-mono text-slate-600">{prof.entityType}</span> ·{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {prof.verificationStatus}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500">
                        {prof.countryCode} · Reg: {prof.registrationOrTaxId || 'Informal / None'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Mandatory audit reason (min 3 chars)..."
                        value={profileNotesMap[prof.userId] ?? ''}
                        onChange={(e) =>
                          setProfileNotesMap((m) => ({ ...m, [prof.userId]: e.target.value }))
                        }
                        className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-200 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleProfileVerification(prof.userId, 'verified')}
                        className="px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                      >
                        Verify Account
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProfileVerification(prof.userId, 'suspended')}
                        className="px-3 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                      >
                        Suspend Account
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Redirect Link Moderation */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                QR Redirect Links Moderation ({overview?.qrLinks.length ?? 0})
              </h3>
              <div className="space-y-3">
                {(overview?.qrLinks ?? []).map((qr) => (
                  <div
                    key={qr.token}
                    className="p-3.5 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">
                          /r/{qr.token}
                        </span>{' '}
                        -&gt; <span className="font-mono text-slate-700">{qr.resolvedHost}</span> ·{' '}
                        <span className="font-mono font-semibold text-slate-800">{qr.status}</span>
                      </div>
                      <span className="font-mono tabular-nums text-slate-500">
                        Reqs: {qr.redirectRequestsTotal} · Issued: {qr.redirectIssuedTotal} · Bots:{' '}
                        {qr.suspectedBotRequests}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Mandatory moderation reason (min 5 chars)..."
                        value={qrReasonMap[qr.token] ?? ''}
                        onChange={(e) =>
                          setQrReasonMap((m) => ({ ...m, [qr.token]: e.target.value }))
                        }
                        className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-200 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleQrModerate(qr, 'active')}
                        className="px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                      >
                        Set Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQrModerate(qr, 'flagged')}
                        className="px-3 py-1.5 font-semibold text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded cursor-pointer"
                      >
                        Flag Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQrModerate(qr, 'disabled')}
                        className="px-3 py-1.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                      >
                        Disable Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Tickets */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Support &amp; Dispute Tickets ({overview?.supportTickets.length ?? 0})
              </h3>
              <div className="space-y-3">
                {(overview?.supportTickets ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{t.subject}</span>
                      <span className="font-mono text-slate-600">
                        {t.id} · {t.category} · {t.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{t.message}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Moderator response..."
                        value={ticketResponseMap[t.id] ?? ''}
                        onChange={(e) =>
                          setTicketResponseMap((m) => ({ ...m, [t.id]: e.target.value }))
                        }
                        className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-200 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleTicketUpdate(t.id, 'in_review')}
                        className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        In Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTicketUpdate(t.id, 'resolved')}
                        className="px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Audit Log Explorer */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Immutable Audit Trail ({filteredAudits.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter audit logs by entity type"
                    value={auditTargetFilter}
                    onChange={(e) => setAuditTargetFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="all">All Target Types</option>
                    <option value="campaign">Campaign</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="ad_creative">Ad Creative</option>
                    <option value="qr_link">QR Link</option>
                    <option value="advertiser_profile">Advertiser Profile</option>
                    <option value="support_ticket">Support Ticket</option>
                    <option value="auth">Auth</option>
                  </select>
                  <input
                    type="search"
                    placeholder="Filter action, ID, or details..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Time</th>
                      <th className="py-2 px-3 font-semibold">Actor</th>
                      <th className="py-2 px-3 font-semibold">Action</th>
                      <th className="py-2 px-3 font-semibold">Target</th>
                      <th className="py-2 px-3 font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAudits.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {log.createdAt.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {log.actorRole}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {log.targetType}:{log.targetId}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{log.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      <CopyReportFooter reportTitle="Block 2.6 Moderation & Analytics Summary" reportText={reportText} />
    </div>
  );
}
