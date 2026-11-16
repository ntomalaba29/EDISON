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
  SharedIntelFleetSnapshot,
  SharedIntelPreviewState,
  SharedIntelScenarios25To35Report,
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
  const [activeMode, setActiveMode] = useState<'fleet_51' | 'prototype_p2'>('fleet_51');
  const [previewState, setPreviewState] = useState<SharedIntelPreviewState | null>(null);
  const [fleetState, setFleetState] = useState<SharedIntelFleetSnapshot | null>(null);
  const [scenariosReport, setScenariosReport] = useState<SharedIntelScenarios25To35Report | null>(
    null
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('fleet_tv_gb_01');
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
      setFleetState(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const [prevRes, fleetRes] = await Promise.all([
        edisonFetch('/api/shared-intelligence/preview', { cache: 'no-store' }),
        edisonFetch('/api/shared-intel-fleet/state', { cache: 'no-store' }),
      ]);
      if (!prevRes.ok) {
        const d = await prevRes.json().catch(() => ({}));
        throw new Error(d.error || 'Unable to load Shared Intelligence preview state.');
      }
      if (!fleetRes.ok) {
        const d = await fleetRes.json().catch(() => ({}));
        throw new Error(d.error || 'Unable to load Phase 5 Fleet Intelligence state.');
      }
      const prevData = (await prevRes.json()) as SharedIntelPreviewState;
      const fleetData = (await fleetRes.json()) as SharedIntelFleetSnapshot;
      setPreviewState(prevData);
      setFleetState(fleetData);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load Shared Intelligence state.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const submitFleetObservation = async (mode: 'valid_signed' | 'spoof_signature' | 'pii_test') => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const nonce = `ui_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
      const body: Record<string, unknown> = {
        tvDeviceId: selectedDeviceId,
        scopeId: selectedScopeId,
        signalType,
        estimatedBreakDurationSec: Number(durationSec) || 110,
        transitionLatencyMs: 375,
        nonce,
        useRegisteredDemoSigner: mode !== 'spoof_signature',
      };
      if (mode === 'spoof_signature') {
        body.signatureHex = '00'.repeat(64);
      }
      if (mode === 'pii_test') {
        body.householdId = 'hh_forbidden_test_01';
      }

      const res = await edisonFetch('/api/shared-intel-fleet/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.state) {
        setFleetState(data.state);
      }
      if (!res.ok) {
        throw new Error(data.observation?.reason || data.error || 'Observation rejected.');
      }
      setActionMsg(data.observation?.reason || 'Signed fleet observation recorded.');
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fleet observation request failed.');
    } finally {
      setBusy(false);
    }
  };

  const runFleetDeltaSync = async (simulateMismatch = false) => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const res = await edisonFetch('/api/shared-intel-fleet/sync-delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tvDeviceId: selectedDeviceId,
          scopeId: selectedScopeId,
          clientPlatform: simulateMismatch ? 'Samsung Tizen 7.0' : 'Android TV 14',
          clientCountry: simulateMismatch ? 'ZA' : 'GB',
          knownVersion: 1,
          simulateCorruptChecksum: false,
        }),
      });
      const data = await res.json();
      if (data.state) setFleetState(data.state);
      if (!res.ok) {
        setActionMsg(data.sync?.detail || 'Compatibility mismatch blocked cleanly.');
      } else {
        setActionMsg(data.sync?.detail || 'Scoped delta synced.');
      }
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delta sync check failed.');
    } finally {
      setBusy(false);
    }
  };

  const triggerFleetFprRollback = async () => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const res = await edisonFetch('/api/shared-intel-fleet/report-fpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeId: selectedScopeId,
          observedFprPct: 4.8,
        }),
      });
      const data = await res.json();
      if (data.state) setFleetState(data.state);
      if (!res.ok) throw new Error(data.error || 'FPR evaluation failed.');
      setActionMsg(data.report?.reason || 'FPR rollback executed.');
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'FPR evaluation failed.');
    } finally {
      setBusy(false);
    }
  };

  const runScenarios25To35 = async () => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const res = await edisonFetch('/api/shared-intel-fleet/scenarios-25-35', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as SharedIntelScenarios25To35Report;
      if (!res.ok) throw new Error('Scenarios 25-35 execution failed.');
      setScenariosReport(data);
      setActionMsg(
        `Scenarios 25–35 software suite: ${data.passedScenarios}/${data.totalScenarios} verified (hardwareTested=false, Stage P6 deferred).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Scenarios 25-35 failed.');
    } finally {
      setBusy(false);
    }
  };

  const resetFleetService = async () => {
    setErrorMsg('');
    setActionMsg('');
    setBusy(true);
    try {
      const res = await edisonFetch('/api/shared-intel-fleet/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.state) setFleetState(data.state);
      setScenariosReport(null);
      setActionMsg('Reset Phase 5 Block 5.1 Shared Intelligence Fleet Service state.');
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

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
      {/* Software-First Verification Notice & Mode Switcher */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <p className="font-semibold">
              Phase 5 Block 5.1: Shared Ad Intelligence Fleet Service (Software-First · Hardware Deferred to Stage P6)
            </p>
            <p className="leading-relaxed text-amber-900">
              Ed25519 device attestation, signed manifest bundles, multi-TV conflict/quorum resolution, scoped delta sync, automatic 2.5% FPR rollback, and Scenarios 25–35 are verified in software (`hardwareTested: false`).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-amber-200 rounded-lg shrink-0 self-start">
          <button
            type="button"
            onClick={() => setActiveMode('fleet_51')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'fleet_51'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Phase 5 Fleet Service (Block 5.1)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('prototype_p2')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'prototype_p2'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Phase 2 Prototype Preview
          </button>
        </div>
      </div>

      {/* Top 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Corroboration Quorum</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            K ≥ {fleetState?.quorumRequired ?? previewState?.quorumThreshold ?? 3} distinct TVs
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Ed25519 attested fleet · conflict split held
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Signed Scoped Bundles</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {fleetState?.bundles.length ?? previewState?.bundles.length ?? 3} isolated scopes
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {fleetState ? `${fleetState.devices.length} attested TVs · ${fleetState.signingKeyId}` : 'Country · broadcaster · channel · OS'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Zero PII &amp; Signature Gate</p>
          <p className="mt-1.5 text-lg font-semibold text-emerald-700 font-mono tabular-nums">
            0 PII · {fleetState?.rejectedSignatureCount ?? 0} spoof rejected
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {(fleetState?.rejectedPiiCount ?? 0) + (previewState?.rejectedPiiAttemptCount ?? 0)} PII blocked · {fleetState?.rateLimitedFloodCount ?? 0} flood 429s
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">FPR Auto-Rollback Guard</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            ≤ {fleetState?.fprRollbackThresholdPct ?? previewState?.fprRollbackThresholdPct ?? 2.5}% max FPR
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {fleetState?.rollbackCount ?? 0} rollback(s) executed safely
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm text-slate-700">
            Sign in to run Shared Ad Intelligence attestation, scoped delta sync, rollback, and Scenarios 25–35 verification.
          </p>
          <button
            type="button"
            onClick={onNavigateAuth}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Sign In (Auth Console)
          </button>
        </div>
      ) : activeMode === 'fleet_51' ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Phase 5 Fleet Service, Ed25519 Attestation &amp; Scenarios 25–35 Suite
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Test cryptographic device signatures, scoped compatibility enforcement, FPR auto-rollback, and the full 11-scenario ADR-016 verification suite.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runScenarios25To35}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0 self-start cursor-pointer disabled:opacity-50"
              >
                Run Scenarios 25–35 Suite (11 Checks)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label
                  htmlFor="fleet-device-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Attested Simulated TV Device
                </label>
                <select
                  id="fleet-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(fleetState?.devices ?? []).map((d) => (
                    <option key={d.tvDeviceId} value={d.tvDeviceId}>
                      {d.tvDeviceId} ({d.country} · {d.platform})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label
                  htmlFor="fleet-scope-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Scoped Compatibility Bundle
                </label>
                <select
                  id="fleet-scope-select"
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(fleetState?.bundles ?? []).map((b) => (
                    <option key={b.scope.scopeId} value={b.scope.scopeId}>
                      {b.scope.displayName} (v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="fleet-signal-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Signal Type
                </label>
                <select
                  id="fleet-signal-select"
                  value={signalType}
                  onChange={(e) => setSignalType(e.target.value as SharedIntelSignalType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="scte35">SCTE-35</option>
                  <option value="hbbtv">HbbTV</option>
                  <option value="av_pattern">Non-DRM A/V</option>
                  <option value="channel_cadence">Cadence</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="fleet-duration-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Break Sec
                </label>
                <input
                  id="fleet-duration-input"
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
                onClick={() => submitFleetObservation('valid_signed')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Submit Signed Observation
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submitFleetObservation('spoof_signature')}
                className="px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Test Spoofed Signature (401)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runFleetDeltaSync(false)}
                className="px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Sync Scoped Delta
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runFleetDeltaSync(true)}
                className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Test ZA/Tizen Isolation
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={triggerFleetFprRollback}
                className="px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Trigger FPR Rollback (4.8%)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submitFleetObservation('pii_test')}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Test Zero-PII Block
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={resetFleetService}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Fleet</span>
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

          {scenariosReport && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Scenarios 25–35 Automated Software Verification Report
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                    {scenariosReport.passedScenarios}/{scenariosReport.totalScenarios} passed · hardwareTested={String(scenariosReport.hardwareTested)} · stageP6Deferred={String(scenariosReport.stageP6Deferred)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenariosReport.scenarios.map((sc) => (
                  <div
                    key={sc.scenarioNumber}
                    className={`p-3 rounded-lg border text-xs ${
                      sc.passed
                        ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                        : 'bg-red-50/40 border-red-200 text-red-900'
                    }`}
                  >
                    <p className="font-semibold flex items-center justify-between gap-2">
                      <span>
                        #{sc.scenarioNumber}. {sc.title}
                      </span>
                      <span className="font-mono text-[11px] uppercase">
                        {sc.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </p>
                    <p className="text-slate-600 mt-1 leading-snug">{sc.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">
                  Signed Fleet Bundles &amp; Confidence Calibration
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {fleetState?.signingKeyId ?? 'edison_fleet_ed25519_k1'}
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Scope</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Ver / p10</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">FPR / Conf</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(fleetState?.bundles ?? []).map((b) => (
                      <tr key={b.scope.scopeId} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 align-top">
                          <p className="font-medium text-slate-900">
                            {b.scope.country} · {b.scope.broadcaster} · {b.scope.channel}
                          </p>
                          <p className="text-slate-500 font-mono mt-0.5">
                            {b.scope.platform} · #{b.sha256Manifest}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono tabular-nums whitespace-nowrap">
                          <p className="font-semibold text-slate-900">v{b.version}</p>
                          <p className="text-slate-500">
                            p10 {b.p10BreakDurationSec}s / p50 {b.p50BreakDurationSec}s
                          </p>
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono tabular-nums whitespace-nowrap">
                          <p>FPR {b.falsePositiveRatePct}%</p>
                          <p className="text-slate-500">Conf {(b.confidenceScore * 100).toFixed(0)}%</p>
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono">
                          <p className="font-semibold text-slate-800">{b.status}</p>
                          <p className="text-slate-500">
                            Pending {b.pendingDeviceIds.length}/{b.quorumRequired}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Fleet Security &amp; Calibration Audit Trail
                </h3>
              </div>
              <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
                {(fleetState?.auditTrail ?? []).map((entry) => (
                  <div key={entry.id} className="py-2.5 text-xs">
                    <p className="font-mono font-semibold text-slate-800">{entry.action}</p>
                    <p className="text-slate-600 mt-0.5 leading-snug">{entry.detail}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{entry.createdAt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
