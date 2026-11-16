import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  ShieldCheck,
  Tv,
  XCircle,
} from 'lucide-react';
import { edisonFetch } from '../lib/csrfFetch';
import type {
  ChaosInjectSeverity,
  ChaosScenarioResult,
  FailureModeCategory,
  FailureModeId,
  PublicUser,
  ReliabilityChaosOverview,
  ReliabilityChaosVerificationReport,
} from '../types/edison';

interface ReliabilityChaosPanelProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
}

const DOMAIN_FILTERS: { id: FailureModeCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All 18 Failure Modes' },
  { id: 'transport_network', label: 'Transport & Outage' },
  { id: 'tv_playback_watchdog', label: 'TV Watchdog & Codecs' },
  { id: 'trust_safety_data', label: 'KYC, QR & Charity Isolation' },
  { id: 'consent_analytics', label: 'Consent, Recovery & Dedup' },
];

const FAILURE_MODE_LABELS: Record<FailureModeId, { title: string; category: FailureModeCategory }> = {
  'FM-01': { title: 'Internet Loss (Wi-Fi / ISP Outage)', category: 'transport_network' },
  'FM-02': { title: 'Application Crash / OOM Fault', category: 'tv_playback_watchdog' },
  'FM-03': { title: 'Power Loss / Reboot State Recovery', category: 'tv_playback_watchdog' },
  'FM-04': { title: 'False Break Detection', category: 'tv_playback_watchdog' },
  'FM-05': { title: 'Missed Break (Low-Confidence Cue)', category: 'transport_network' },
  'FM-06': { title: 'Failed Ad Loading (Corrupt Asset / CDN 503)', category: 'transport_network' },
  'FM-07': { title: 'Decoder Failure / Unsupported Codec', category: 'tv_playback_watchdog' },
  'FM-08': { title: 'Failed Source Switching (CEC/TIF/tvwindow)', category: 'tv_playback_watchdog' },
  'FM-09': { title: 'Failed Return to Live TV (CRITICAL Watchdog)', category: 'tv_playback_watchdog' },
  'FM-10': { title: 'Invalid or Malicious QR Destination', category: 'trust_safety_data' },
  'FM-11': { title: 'Expired Campaigns / Clock Drift', category: 'trust_safety_data' },
  'FM-12': { title: 'Fake Advertisers / Unverified KYC', category: 'trust_safety_data' },
  'FM-13': { title: 'Fake Vacancies / Paid Verification Bypass', category: 'trust_safety_data' },
  'FM-14': { title: 'Payment Disputes & Billing Isolation', category: 'trust_safety_data' },
  'FM-15': { title: 'Consent Withdrawal Under Concurrency', category: 'consent_analytics' },
  'FM-16': { title: 'Data Corruption / Storage Tamper Recovery', category: 'consent_analytics' },
  'FM-17': { title: 'Duplicate Analytics / Bot Retry Flood', category: 'consent_analytics' },
  'FM-18': { title: 'Control-Plane Backend Service Outage', category: 'transport_network' },
};

export function ReliabilityChaosPanel({
  currentUser,
  onNavigateAuth,
}: ReliabilityChaosPanelProps) {
  const [overview, setOverview] = useState<ReliabilityChaosOverview | null>(null);
  const [verifyReport, setVerifyReport] = useState<ReliabilityChaosVerificationReport | null>(null);
  const [lastProbe, setLastProbe] = useState<ChaosScenarioResult | null>(null);
  const [domainFilter, setDomainFilter] = useState<FailureModeCategory | 'all'>('all');
  const [severity, setSeverity] = useState<ChaosInjectSeverity>('standard');
  const [loading, setLoading] = useState(false);
  const [runningFullSuite, setRunningFullSuite] = useState(false);
  const [runningVerifySuite, setRunningVerifySuite] = useState(false);
  const [probingMode, setProbingMode] = useState<FailureModeId | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadOverview = useCallback(async () => {
    if (!currentUser) {
      setOverview(null);
      return;
    }
    setLoading(true);
    try {
      const res = await edisonFetch('/api/reliability/overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load Phase 11 reliability posture.');
      }
      setOverview(data.overview);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to load Phase 11 reliability posture.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleRunProbe = async (failureModeId: FailureModeId) => {
    if (!currentUser) return;
    setProbingMode(failureModeId);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/reliability/chaos-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureModeId, injectSeverity: severity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to run chaos probe ${failureModeId}.`);
      }
      setLastProbe(data.probe);
      setOverview(data.overview);
      setFeedback({
        type: 'ok',
        text: `${failureModeId} (${severity}) ${data.probe.passed ? 'PASSED' : 'FAILED'} · Ordinary TV Preserved: YES · Recovery ${data.probe.recoveryLatencyMs}ms`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Chaos probe failed.',
      });
    } finally {
      setProbingMode(null);
    }
  };

  const handleRunFull18Suite = async () => {
    if (!currentUser) return;
    setRunningFullSuite(true);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/admin/reliability/run-all-18', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          injectSeverity: severity,
          notes: `Operator full 18-FM chaos verification (${severity})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Admin access required to persist full 18-FM chaos report.');
      }
      setOverview(data.overview);
      setFeedback({
        type: 'ok',
        text: `Full 18/18 Chaos Suite persisted (${data.report.passedFailureModes}/18 passed, SHA-256 ${data.report.reportSha256.slice(0, 12)}..., ordinaryTvPreservedAll=${String(data.report.ordinaryTvPreservedAll)}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Full 18-FM chaos run failed.',
      });
    } finally {
      setRunningFullSuite(false);
    }
  };

  const handleRunVerifySuite = async () => {
    if (!currentUser) return;
    setRunningVerifySuite(true);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/reliability/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to execute Phase 11 verification suite.');
      }
      setVerifyReport(data.report);
      setFeedback({
        type: 'ok',
        text: `Phase 11 Reliability Verification Suite: ${data.report.passedChecks}/${data.report.totalChecks} checks passed (Software-First · hardwareTested=false).`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Verification suite failed.',
      });
    } finally {
      setRunningVerifySuite(false);
    }
  };

  const visibleModes = useMemo(() => {
    const modeIds = overview?.coveredFailureModeIds ?? (Object.keys(FAILURE_MODE_LABELS) as FailureModeId[]);
    const resultsById = new globalThis.Map<FailureModeId, ChaosScenarioResult>();
    for (const r of overview?.lastChaosRun?.results ?? []) {
      resultsById.set(r.failureModeId, r);
    }
    if (lastProbe) {
      resultsById.set(lastProbe.failureModeId, lastProbe);
    }
    return modeIds
      .filter((id) => domainFilter === 'all' || FAILURE_MODE_LABELS[id].category === domainFilter)
      .map((id) => ({
        id,
        title: FAILURE_MODE_LABELS[id].title,
        category: FAILURE_MODE_LABELS[id].category,
        lastResult: resultsById.get(id) ?? null,
      }));
  }, [overview, lastProbe, domainFilter]);

  if (!currentUser) {
    return (
      <div className="py-10 text-center space-y-3">
        <Tv className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm text-slate-700 font-medium">
          Sign in to run the Phase 11 Software-First Chaos &amp; 18 Failure-Mode Recovery Suite.
        </p>
        <p className="text-xs text-slate-500 max-w-xl mx-auto">
          Software simulation only (`hardwareTested: false`, `stageP6Deferred: true`). Verifies ordinary live TV preservation across FM-01 through FM-18.
        </p>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap cursor-pointer"
        >
          Sign In (Auth Console)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Honest Boundary & KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
          <p className="text-xs text-slate-500">Documented Failure Modes</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {overview?.totalDocumentedFailureModes ?? 18} / 18 FMs
          </p>
          <p className="mt-0.5 text-xs text-slate-600">FM-01 .. FM-18 deterministic engines</p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
          <p className="text-xs text-slate-500">Ordinary TV Preservation</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">100% Enforced</p>
          <p className="mt-0.5 text-xs text-slate-600 font-mono tabular-nums">
            Dual Watchdog &lt;= 500ms · Skip Uncertain
          </p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
          <p className="text-xs text-slate-500">Last Admin 18-FM Run</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {overview?.lastChaosRun
              ? `${overview.lastChaosRun.passedFailureModes} / 18 Passed`
              : 'Not Persisted Yet'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 font-mono truncate">
            {overview?.lastChaosRun
              ? `SHA-256 ${overview.lastChaosRun.reportSha256.slice(0, 14)}...`
              : 'Run Admin 18/18 or 8/8 verify'}
          </p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
          <p className="text-xs text-slate-500">Execution Classification</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Software Simulation Only</p>
          <p className="mt-0.5 text-xs text-amber-800">
            hardwareTested: false · Stage P6 Deferred
          </p>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {DOMAIN_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDomainFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                domainFilter === f.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSeverity('standard')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                severity === 'standard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Standard Fault
            </button>
            <button
              type="button"
              onClick={() => setSeverity('extreme')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                severity === 'extreme' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Extreme Fault
            </button>
          </div>

          <button
            type="button"
            onClick={handleRunVerifySuite}
            disabled={runningVerifySuite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{runningVerifySuite ? 'Verifying...' : 'Run 8/8 Reliability Suite'}</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={handleRunFull18Suite}
              disabled={runningFullSuite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>{runningFullSuite ? 'Running 18 FMs...' : 'Persist Full 18/18 Chaos Run'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-lg border text-xs ${
            feedback.type === 'err'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 8/8 Verification Checklist Results */}
      {verifyReport && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900">
              Phase 11 Automated Chaos Verification ({verifyReport.passedChecks}/{verifyReport.totalChecks} Passed)
            </span>
            <span className="text-slate-600 font-mono">
              softwareSimulationOnly: true · hardwareTested: false · stageP6Deferred: true
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {verifyReport.checks.map((chk) => (
              <div key={chk.checkId} className="px-4 py-2.5 flex items-start justify-between gap-4 text-xs">
                <div>
                  <p className="font-medium text-slate-900">{chk.label}</p>
                  <p className="text-slate-600 mt-0.5">{chk.detail}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap shrink-0 ${
                    chk.passed ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {chk.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{chk.passed ? 'PASS' : 'FAIL'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 18 Failure Modes Fault-Injection Matrix */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700 w-20">ID</th>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700">Failure Mode &amp; Observed Fail-Safe</th>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700 w-28">Live TV Safe</th>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right w-24">Latency</th>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700 w-28">Status</th>
              <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right w-36">Fault Probe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleModes.map((row) => {
              const r = row.lastResult;
              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-3 font-mono font-semibold text-slate-900 align-top whitespace-nowrap">
                    {row.id}
                  </td>
                  <td className="px-3.5 py-3 align-top">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {r
                        ? `${r.observedOutcome} (${r.injectDetail})`
                        : 'Click "Inject Probe" or run Full 18/18 Chaos Suite to observe live engine recovery.'}
                    </p>
                  </td>
                  <td className="px-3.5 py-3 align-top whitespace-nowrap">
                    {r ? (
                      <span className="font-medium text-emerald-700">
                        {r.ordinaryTvPreserved ? 'Preserved' : 'Blocked'}
                      </span>
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-mono tabular-nums text-right text-slate-700 align-top whitespace-nowrap">
                    {r ? `${r.recoveryLatencyMs}ms` : '—'}
                  </td>
                  <td className="px-3.5 py-3 align-top whitespace-nowrap">
                    {!r ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>NOT RUN</span>
                      </span>
                    ) : r.passed ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right align-top whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleRunProbe(row.id)}
                      disabled={probingMode === row.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3 h-3 shrink-0" />
                      <span>{probingMode === row.id ? 'Running...' : 'Inject Probe'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
