import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Tv,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  PublicUser,
  SharedIntelBundleRecord,
  SharedIntelPreviewState,
  SharedIntelSignalType,
} from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

interface SharedIntelligencePreviewViewProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

function formatBundleStatus(status: SharedIntelBundleRecord['status']): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'corroborated_published':
      return { label: 'CORROBORATED · PUBLISHED', className: 'text-emerald-700' };
    case 'quarantined_pending_corroboration':
      return { label: 'QUARANTINED · PENDING QUORUM', className: 'text-amber-700' };
    case 'rolled_back':
      return { label: 'AUTO-ROLLED BACK', className: 'text-red-700' };
    case 'rejected_poison_outlier':
      return { label: 'OUTLIER REJECTED', className: 'text-red-700' };
  }
}

export function SharedIntelligencePreviewView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: SharedIntelligencePreviewViewProps) {
  const [previewState, setPreviewState] = useState<SharedIntelPreviewState | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string>(
    'gb_freeview_bbcone_androidtv14_dvbt2'
  );
  const [signalType, setSignalType] = useState<SharedIntelSignalType>('scte35');
  const [durationSec, setDurationSec] = useState<string>('95');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadPreview = useCallback(async () => {
    if (!currentUser) {
      setPreviewState(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await edisonFetch('/api/shared-intelligence/preview', { cache: 'no-store' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Unable to load Shared Intelligence preview state.');
      }
      const data = (await res.json()) as SharedIntelPreviewState;
      setPreviewState(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load preview state.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const submitSingleObservation = async (includeForbiddenPii = false) => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const uniqueDevice = `sim_single_tv_${Math.random().toString(16).slice(2, 6)}`;
      const payload: Record<string, unknown> = {
        tvDeviceId: uniqueDevice,
        scopeId: selectedScopeId,
        signalType,
        estimatedBreakDurationSec: Number(durationSec) || 95,
        transitionLatencyMs: 390,
        outlierAnomaly: false,
      };
      if (includeForbiddenPii) {
        payload.householdId = 'hh_forbidden_test_01';
      }

      const res = await edisonFetch('/api/shared-intelligence/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        await loadPreview();
        throw new Error(data.error || 'Observation rejected.');
      }
      setPreviewState(data.state);
      setActionMsg(data.observation.decisionReason);
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit simulated observation.');
    } finally {
      setBusy(false);
    }
  };

  const runSimulationAction = async (
    action:
      | 'corroborate_quorum'
      | 'inject_outlier_poison'
      | 'toggle_offline'
      | 'sync_cache'
      | 'simulate_fpr_spike_rollback'
      | 'reset_preview',
    extra?: { scopeId?: string; tvDeviceId?: string }
  ) => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const res = await edisonFetch('/api/shared-intelligence/simulate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          scopeId: extra?.scopeId ?? selectedScopeId,
          tvDeviceId: extra?.tvDeviceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Simulation action failed.');
      }
      setPreviewState(data.state);
      const latestAudit = data.state?.auditTrail?.[0]?.detail;
      setActionMsg(latestAudit || `Executed ${action}.`);
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Simulation action failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectedBundle = useMemo(
    () => previewState?.bundles.find((b) => b.scope.scopeId === selectedScopeId) ?? null,
    [previewState, selectedScopeId]
  );

  const reportText = useMemo(() => {
    if (!previewState) {
      return 'EDISON — SHARED AD INTELLIGENCE PROTOTYPE PREVIEW\nSign in to inspect live simulation state.';
    }
    return [
      'EDISON — NETWORK-WIDE SHARED AD INTELLIGENCE PROTOTYPE PREVIEW REPORT',
      'Status Tag: PROTOTYPE SIMULATION ONLY (ADR-016 / PRD-19) — Phase 5 Production Service NOT STARTED',
      `Quorum Threshold: ${previewState.quorumThreshold} distinct TVs required before promotion`,
      `FPR Rollback Guard: > ${previewState.fprRollbackThresholdPct}% triggers automatic rollback`,
      `Zero Viewer PII Enforced: ${previewState.zeroPiiEnforced} (Rejected PII Attempts: ${previewState.rejectedPiiAttemptCount})`,
      '',
      'SCOPED COMPATIBILITY BUNDLES:',
      ...previewState.bundles.map(
        (b) =>
          `- ${b.scope.displayName} | v${b.version} (prev v${b.previousGoodVersion}) | ${b.status} | p10=${b.p10BreakDurationSec}s p50=${b.p50BreakDurationSec}s | FPR=${b.falsePositiveRatePct}% | Pending Quorum=${b.pendingObservations}/${b.quorumRequired} | SHA=${b.sha256Manifest}`
      ),
      '',
      'SIMULATED LOCAL DEVICE CACHES:',
      ...previewState.deviceCaches.map(
        (d) =>
          `- ${d.tvDeviceId} (${d.assignedScopeId}) | v${d.cachedBundleVersion} | ${d.offlineMode ? 'OFFLINE_LOCAL_CACHE' : 'ONLINE'} | Queued=${d.queuedObservationsCount}`
      ),
    ].join('\n');
  }, [previewState]);

  return (
    <div className="space-y-6">
      {/* Explicit Prototype Simulation Boundary Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1">
          <p className="font-semibold">
            PROTOTYPE SIMULATION PREVIEW (ADR-016 / PRD-19) — PHASE 5 SERVICE NOT STARTED
          </p>
          <p className="leading-relaxed text-amber-900">
            This interactive workbench demonstrates EDISON&apos;s Network-Wide Shared Ad Intelligence rules using simulated TV caches and synthetic technical telemetry. Production Central Shared Intelligence Service deployment, cryptographic attestation keys, and Smart TV OS integrations remain scoped for Phases 4–5.
          </p>
        </div>
      </div>

      {/* Top 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Corroboration Quorum</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            K ≥ {previewState?.quorumThreshold ?? 3} distinct TVs
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Single TV held in quarantine until corroborated
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Scoped Compatibility Keys</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {previewState?.bundles.length ?? 3} isolated scopes
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Country · broadcaster · channel · OS · config
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Zero Viewer PII Policy</p>
          <p className="mt-1.5 text-lg font-semibold text-emerald-700 font-mono tabular-nums">
            0 PII fields
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {previewState?.rejectedPiiAttemptCount ?? 0} PII payload attempt(s) blocked
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">FPR Auto-Rollback Guard</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            ≤ {previewState?.fprRollbackThresholdPct ?? 2.5}% max FPR
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Automatic fallback to prior signed bundle
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm text-slate-700">
            Sign in to run interactive Shared Ad Intelligence corroboration, offline cache, and rollback simulations.
          </p>
          <button
            type="button"
            onClick={onNavigateAuth}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Sign In (Auth Console)
          </button>
        </div>
      ) : (
        <>
          {/* Interactive Simulation Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Interactive Trust, Quarantine &amp; Rollback Simulator
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Verify that single-TV reports never alter fleet rules, outlier telemetry is quarantined, and high false-positive rates automatically roll back.
                </p>
              </div>
              <button
                type="button"
                onClick={loadPreview}
                disabled={loading || busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 self-start cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh State</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label
                  htmlFor="intel-scope-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Scoped Compatibility Tuple
                </label>
                <select
                  id="intel-scope-select"
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(previewState?.bundles ?? []).map((b) => (
                    <option key={b.scope.scopeId} value={b.scope.scopeId}>
                      {b.scope.displayName} (Active v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="intel-signal-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Lawful Signal Type
                </label>
                <select
                  id="intel-signal-select"
                  value={signalType}
                  onChange={(e) => setSignalType(e.target.value as SharedIntelSignalType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="scte35">SCTE-35 Splice Cue</option>
                  <option value="hbbtv">HbbTV Signalling</option>
                  <option value="av_pattern">Non-DRM A/V Classifier</option>
                  <option value="channel_cadence">Channel Cadence Timing</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="intel-duration-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Observed Break Length (s)
                </label>
                <input
                  id="intel-duration-input"
                  type="number"
                  min={15}
                  max={240}
                  value={durationSec}
                  onChange={(e) => setDurationSec(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => submitSingleObservation(false)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Submit Single TV Report (1/3)
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => runSimulationAction('corroborate_quorum')}
                className="px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Corroborate Quorum (3/3 Publish)
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => runSimulationAction('inject_outlier_poison')}
                className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Inject Outlier Poison (950s)
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => runSimulationAction('simulate_fpr_spike_rollback')}
                className="px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Trigger FPR Rollback (4.8%)
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => submitSingleObservation(true)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Test Zero-PII Block
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => runSimulationAction('reset_preview')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {actionMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{actionMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Main 12-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Central Registry + Telemetry */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-600 shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Central Shared Intelligence Registry (Scoped Bundles)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    No Universal Compatibility
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold text-slate-700">
                          Scope (Country · Channel · OS)
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-slate-700">Ver</th>
                        <th className="px-3 py-2.5 font-semibold text-slate-700">
                          p10 / p50
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-slate-700">Trust Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(previewState?.bundles ?? []).map((bundle) => {
                        const statusInfo = formatBundleStatus(bundle.status);
                        const isSelected = bundle.scope.scopeId === selectedScopeId;
                        return (
                          <tr
                            key={bundle.scope.scopeId}
                            className={isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'}
                          >
                            <td className="px-3 py-3 align-top">
                              <p className="font-medium text-slate-900">
                                {bundle.scope.country} · {bundle.scope.broadcaster} · {bundle.scope.channel}
                              </p>
                              <p className="text-slate-500 mt-0.5 font-mono">
                                {bundle.scope.platform} · {bundle.scope.broadcastConfig}
                              </p>
                              <p className="text-slate-500 mt-0.5 font-mono">
                                manifest #{bundle.sha256Manifest}
                              </p>
                            </td>
                            <td className="px-3 py-3 align-top font-mono tabular-nums whitespace-nowrap">
                              <p className="font-semibold text-slate-900">v{bundle.version}</p>
                              <p className="text-slate-500">prev v{bundle.previousGoodVersion}</p>
                            </td>
                            <td className="px-3 py-3 align-top font-mono tabular-nums whitespace-nowrap text-slate-700">
                              <p>
                                {bundle.p10BreakDurationSec}s / {bundle.p50BreakDurationSec}s
                              </p>
                              <p className="text-slate-500">
                                {bundle.switchingLatencyMs}ms · FPR {bundle.falsePositiveRatePct}%
                              </p>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p className={`font-semibold whitespace-nowrap ${statusInfo.className}`}>
                                {statusInfo.label}
                              </p>
                              <p className="text-slate-500 mt-0.5 font-mono tabular-nums">
                                Queue: {bundle.pendingObservations}/{bundle.quorumRequired} TVs · Conf{' '}
                                {(bundle.confidenceScore * 100).toFixed(0)}%
                              </p>
                              {bundle.rollbackReason && (
                                <p className="text-red-700 mt-1 leading-snug">
                                  {bundle.rollbackReason}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedBundle && (
                  <p className="text-xs text-slate-600 font-mono">
                    Selected Scope Corroborators: {selectedBundle.corroboratingDeviceIds.join(', ')}
                  </p>
                )}
              </div>

              {/* Observation Log */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Technical Observation Gate Log (Zero PII)
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {previewState?.observations.length ?? 0} observation(s)
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Device &amp; Signal</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Dur</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Gate Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(previewState?.observations ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                            No simulated observations submitted yet. Click &ldquo;Submit Single TV Report (1/3)&rdquo; above to verify quarantine gating.
                          </td>
                        </tr>
                      ) : (
                        (previewState?.observations ?? []).slice(0, 12).map((obs) => (
                          <tr key={obs.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5 align-top">
                              <p className="font-mono font-medium text-slate-900">
                                {obs.tvDeviceId}
                              </p>
                              <p className="text-slate-500">
                                {obs.signalType} · containsPii={String(obs.containsPii)}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 align-top font-mono tabular-nums text-slate-800 whitespace-nowrap">
                              {obs.estimatedBreakDurationSec}s
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <p
                                className={`font-semibold font-mono ${
                                  obs.trustDecision === 'accepted_corroborated'
                                    ? 'text-emerald-700'
                                    : obs.trustDecision === 'rejected_outlier'
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {obs.trustDecision}
                              </p>
                              <p className="text-slate-600 mt-0.5 leading-snug">
                                {obs.decisionReason}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Local Caches + Audit Trail */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-slate-600 shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Simulated Local TV Intelligence Caches
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Offline-Ready</span>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {(previewState?.deviceCaches ?? []).map((cache) => (
                    <div key={cache.tvDeviceId} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {cache.deviceLabel}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {cache.tvDeviceId} · {cache.assignedScopeId}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono font-semibold whitespace-nowrap ${
                            cache.offlineMode ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {cache.offlineMode ? (
                            <>
                              <WifiOff className="w-3.5 h-3.5 shrink-0" />
                              <span>OFFLINE</span>
                            </>
                          ) : (
                            <>
                              <Wifi className="w-3.5 h-3.5 shrink-0" />
                              <span>ONLINE</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-xs font-mono tabular-nums text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Cached v{cache.cachedBundleVersion}</span>
                        <span>· p10={cache.cachedP10DurationSec}s</span>
                        <span>· Queued={cache.queuedObservationsCount}</span>
                        <span>· #{cache.cachedSha256}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runSimulationAction('toggle_offline', {
                              tvDeviceId: cache.tvDeviceId,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          {cache.offlineMode ? 'Restore Online' : 'Simulate Offline'}
                        </button>

                        <button
                          type="button"
                          disabled={busy || cache.offlineMode}
                          onClick={() =>
                            runSimulationAction('sync_cache', {
                              tvDeviceId: cache.tvDeviceId,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap cursor-pointer disabled:opacity-40"
                        >
                          Sync Scoped Cache
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Simulation Audit &amp; Safeguard Log
                  </h3>
                </div>

                <div className="divide-y divide-slate-200 max-h-72 overflow-y-auto">
                  {(previewState?.auditTrail ?? []).map((entry) => (
                    <div key={entry.id} className="py-2.5 text-xs">
                      <p className="font-mono font-semibold text-slate-800">{entry.action}</p>
                      <p className="text-slate-600 mt-0.5 leading-snug">{entry.detail}</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {entry.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <CopyReportFooter
        reportText={reportText}
        reportTitle="Shared Ad Intelligence Prototype Preview Report"
      />
    </div>
  );
}
