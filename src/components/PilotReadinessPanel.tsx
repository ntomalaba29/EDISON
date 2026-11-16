import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Play,
  RefreshCw,
  ShieldCheck,
  Tv,
  XCircle,
} from 'lucide-react';
import type {
  PilotReadinessOverview,
  PilotReadinessVerificationReport,
  PilotTargetArchitectureId,
  PilotTelemetryValidationResult,
  PublicUser,
  StageP6StepId,
} from '../types/edison';
import { edisonFetch } from '../lib/csrfFetch';

interface PilotReadinessPanelProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

export function PilotReadinessPanel({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: PilotReadinessPanelProps) {
  const [overview, setOverview] = useState<PilotReadinessOverview | null>(null);
  const [suiteReport, setSuiteReport] = useState<PilotReadinessVerificationReport | null>(null);
  const [telemetryResult, setTelemetryResult] = useState<PilotTelemetryValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [submittingCohort, setSubmittingCohort] = useState<boolean>(false);
  const [testingTelemetry, setTestingTelemetry] = useState<boolean>(false);
  const [savingNoteStep, setSavingNoteStep] = useState<StageP6StepId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Closed pilot cohort form
  const [cohortName, setCohortName] = useState<string>('ZW Opt-In Closed Pre-Pilot Cohort A');
  const [targetCountryCode, setTargetCountryCode] = useState<string>('ZW');
  const [targetArchId, setTargetArchId] = useState<PilotTargetArchitectureId>('opt_in_viewer_prompt');
  const [maxHouseholdsCap, setMaxHouseholdsCap] = useState<string>('15');
  const [enrolledHouseholdIdsText, setEnrolledHouseholdIdsText] = useState<string>('');
  const [ackDec02, setAckDec02] = useState<boolean>(true);
  const [ackDec03, setAckDec03] = useState<boolean>(true);

  // Telemetry Zero-PII & Consent Epoch validator sandbox
  const [telCohortId, setTelCohortId] = useState<string>('plt_zw_optin_01');
  const [telRegion, setTelRegion] = useState<string>('ZW-HRE');
  const [telArch, setTelArch] = useState<PilotTargetArchitectureId>('opt_in_viewer_prompt');
  const [telConsent, setTelConsent] = useState<'granted' | 'withdrawn' | 'pending'>('granted');
  const [telEpoch, setTelEpoch] = useState<string>('1');
  const [telExpectedEpoch, setTelExpectedEpoch] = useState<string>('1');
  const [telSwitchMs, setTelSwitchMs] = useState<string>('380');
  const [telReturnMs, setTelReturnMs] = useState<string>('270');
  const [telQrMs, setTelQrMs] = useState<string>('1420');
  const [telClaimHw, setTelClaimHw] = useState<boolean>(false);
  const [telExtraJson, setTelExtraJson] = useState<string>('{}');

  // Stage P6 prep note inputs
  const [prepNotesDraft, setPrepNotesDraft] = useState<Record<string, string>>({});

  const loadOverview = useCallback(async () => {
    if (!currentUser) {
      setOverview(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await edisonFetch('/api/pilot-readiness/overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load Phase 12 pilot readiness overview.');
      }
      const ov = data.overview as PilotReadinessOverview;
      setOverview(ov);
      const nextNotes: Record<string, string> = {};
      for (const s of ov.stageP6Runbook) {
        nextNotes[s.stepId] = s.ownerPrepNote ?? '';
      }
      setPrepNotesDraft(nextNotes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load pilot readiness overview.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleRunSuite = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setRunningSuite(true);
    try {
      const res = await edisonFetch('/api/pilot-readiness/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification suite failed.');
      }
      const rep = data.report as PilotReadinessVerificationReport;
      setSuiteReport(rep);
      setStatusMsg(
        `Phase 12 Pilot Readiness suite complete: ${rep.passedChecks}/${rep.totalChecks} checks passed (hardwareTested=false, stageP6Deferred=true, countryActivated=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to execute pilot readiness suite.');
    } finally {
      setRunningSuite(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSubmittingCohort(true);
    try {
      const householdIds = enrolledHouseholdIdsText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const res = await edisonFetch('/api/pilot-readiness/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortName,
          targetCountryCode,
          targetArchitectureId: targetArchId,
          maxHouseholdsCap: Number(maxHouseholdsCap),
          enrolledHouseholdIds: householdIds,
          decOpen02ShortBreakRuleAcknowledged: ackDec02,
          decOpen03GamMockOnlyAcknowledged: ackDec03,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to register pilot cohort blueprint.');
      }
      setOverview(data.overview);
      setStatusMsg(
        `Registered pilot cohort blueprint "${data.cohort.cohortName}" (${data.cohort.id}, status=${data.cohort.status}, countryActivated=false, hardwareTested=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Cohort blueprint creation failed.');
    } finally {
      setSubmittingCohort(false);
    }
  };

  const handleValidateTelemetry = async (override?: {
    consent?: 'granted' | 'withdrawn' | 'pending';
    epoch?: number;
    expectedEpoch?: number;
    claimHw?: boolean;
    extraJson?: string;
  }) => {
    setErrorMsg('');
    setStatusMsg('');
    setTestingTelemetry(true);
    try {
      let extraPayload: Record<string, unknown> | undefined;
      const rawJson = override?.extraJson ?? telExtraJson;
      if (rawJson.trim()) {
        const parsed = JSON.parse(rawJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          extraPayload = parsed as Record<string, unknown>;
        }
      }
      const res = await edisonFetch('/api/pilot-readiness/validate-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId: telCohortId,
          regionCode: telRegion,
          architectureId: telArch,
          householdConsentStatus: override?.consent ?? telConsent,
          claimedHardwareTested: override?.claimHw ?? telClaimHw,
          consentEpoch: override?.epoch ?? Number(telEpoch),
          expectedConsentEpoch: override?.expectedEpoch ?? Number(telExpectedEpoch),
          switchLatencyMs: Number(telSwitchMs),
          returnToLiveTvMs: Number(telReturnMs),
          qrScanObservedMs: telQrMs.trim() === '' ? null : Number(telQrMs),
          ordinaryTvPreserved: true,
          extraPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Telemetry validation request failed.');
      }
      setTelemetryResult(data.result as PilotTelemetryValidationResult);
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to validate pilot telemetry payload.');
    } finally {
      setTestingTelemetry(false);
    }
  };

  const handleSavePrepNote = async (stepId: StageP6StepId) => {
    const note = (prepNotesDraft[stepId] || '').trim();
    if (note.length < 3) {
      setErrorMsg(`Enter at least 3 characters for ${stepId} pre-flight preparation note.`);
      return;
    }
    setErrorMsg('');
    setStatusMsg('');
    setSavingNoteStep(stepId);
    try {
      const res = await edisonFetch('/api/pilot-readiness/stage-p6-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, ownerPrepNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to save Stage P6 pre-flight note.');
      }
      setOverview(data.overview);
      setStatusMsg(`Saved pre-flight preparation note for ${stepId} (physical TV test remains deferred to Stage P6).`);
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save Stage P6 note.');
    } finally {
      setSavingNoteStep(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
        <Tv className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-900">
          Phase 12 Pilot Readiness &amp; Stage P6 Physical Runbook
        </h2>
        <p className="text-xs text-slate-600 max-w-xl mx-auto">
          Sign in to inspect pre-pilot software gates across Phases 4–11, test the Zero-PII opt-in telemetry guard, configure closed pilot cohort blueprints, and prepare the single final Stage P6 verification runbook.
        </p>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Sign In (Auth &amp; RBAC Console)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Honesty Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Phase 12 · Block 12.1 — Software-First Pilot Readiness &amp; Single Final Stage P6 Runbook
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            Enforces EDISON’s single-hardware-pass discipline (<strong>ADR-014</strong>):{' '}
            <code className="font-mono">hardwareTested=false</code>,{' '}
            <code className="font-mono">pilotHardwareExecuted=false</code>,{' '}
            <code className="font-mono">stageP6Deferred=true</code>,{' '}
            <code className="font-mono">countryActivated=false</code>, and{' '}
            <code className="font-mono">paymentCollectionActive=false</code>. Physical Smart TV + smartphone verification runs once at Stage P6 after software completion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Readiness</span>
          </button>
          <button
            type="button"
            onClick={handleRunSuite}
            disabled={runningSuite}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningSuite ? 'Running 8/8 Checks...' : 'Run 8/8 Pilot Readiness Suite'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          {statusMsg}
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Pre-Pilot Software Gates</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
            {overview
              ? `${overview.softwareGatesReadyCount} / ${overview.softwareGatesTotalCount} Ready`
              : 'Loading...'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">Phases 4–11 + Track B invariants</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Hardware Pilot Execution</p>
          <p className="mt-1 text-sm font-semibold text-amber-700 font-mono">
            FALSE (STAGE P6 DEFERRED)
          </p>
          <p className="mt-0.5 text-xs text-slate-600">Zero repeated Smart TV tests prior to P6</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Country &amp; Commercial Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">
            NOT ACTIVATED ($0.00)
          </p>
          <p className="mt-0.5 text-xs text-slate-600">countryActivated=false · paymentCollectionActive=false</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Readiness Manifest SHA-256</p>
          <p className="mt-1 text-xs font-mono text-slate-900 break-all tabular-nums">
            {overview ? overview.readinessManifestSha256.slice(0, 20) + '…' : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
            {overview ? `${overview.cohorts.length} cohort blueprint(s) · 8 Stage P6 steps` : 'Tamper-evident hash'}
          </p>
        </div>
      </div>

      {/* 8/8 Suite Report */}
      {suiteReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Phase 12 Automated Readiness Verification Suite ({suiteReport.passedChecks}/{suiteReport.totalChecks} Passed)
              </h3>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                hardwareTested={String(suiteReport.hardwareTested)} · stageP6Deferred={String(suiteReport.stageP6Deferred)} · countryActivated={String(suiteReport.countryActivated)}
              </p>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Check</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Verification Detail</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 w-24">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suiteReport.checks.map((chk) => (
                  <tr key={chk.checkId}>
                    <td className="px-3 py-2 font-medium text-slate-900">{chk.label}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{chk.detail}</td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      {chk.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-Pilot Software Gates & Target Architectures */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Pre-Pilot Software Gate Evaluation (Phases 4–11)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Live server verification across adapters, predictor, delivery, billing boundary, render, trust, privacy &amp; 18-FM chaos.
            </p>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Phase</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Gate &amp; Evidence</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 w-24">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(overview?.softwareGates ?? []).map((g) => (
                  <tr key={g.gateId}>
                    <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap align-top">
                      {g.phaseRef}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <p className="font-medium text-slate-900">{g.label}</p>
                      <p className="text-slate-600 mt-0.5">{g.detail}</p>
                    </td>
                    <td className="px-3 py-2.5 font-semibold align-top whitespace-nowrap">
                      {g.ready ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>READY</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zero-PII & Consent Epoch Telemetry Validator */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Opt-In Zero-PII &amp; Consent-Epoch Telemetry Validator
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Rejects personal PII, withdrawn consent, stale epochs, or forged <code className="font-mono">hardwareTested=true</code> claims.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTelConsent('granted');
                setTelEpoch('1');
                setTelExpectedEpoch('1');
                setTelClaimHw(false);
                setTelExtraJson('{}');
                handleValidateTelemetry({
                  consent: 'granted',
                  epoch: 1,
                  expectedEpoch: 1,
                  claimHw: false,
                  extraJson: '{}',
                });
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
            >
              Valid Coarse Event
            </button>
            <button
              type="button"
              onClick={() => {
                const leak = JSON.stringify({
                  email: 'viewer@example.org',
                  exactCoordinates: '-17.8292, 31.0522',
                });
                setTelConsent('granted');
                setTelClaimHw(false);
                setTelExtraJson(leak);
                handleValidateTelemetry({
                  consent: 'granted',
                  claimHw: false,
                  extraJson: leak,
                });
              }}
              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer whitespace-nowrap"
            >
              Inject Email + GPS Leak
            </button>
            <button
              type="button"
              onClick={() => {
                setTelConsent('withdrawn');
                setTelEpoch('1');
                setTelExpectedEpoch('2');
                setTelExtraJson('{}');
                handleValidateTelemetry({
                  consent: 'withdrawn',
                  epoch: 1,
                  expectedEpoch: 2,
                  claimHw: false,
                  extraJson: '{}',
                });
              }}
              className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md cursor-pointer whitespace-nowrap"
            >
              Withdrawn Consent
            </button>
            <button
              type="button"
              onClick={() => {
                setTelConsent('granted');
                setTelClaimHw(true);
                setTelExtraJson('{}');
                handleValidateTelemetry({
                  consent: 'granted',
                  claimHw: true,
                  extraJson: '{}',
                });
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
            >
              Forge hardwareTested=true
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Cohort ID</label>
              <input
                type="text"
                value={telCohortId}
                onChange={(e) => setTelCohortId(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Coarse Region</label>
              <input
                type="text"
                value={telRegion}
                onChange={(e) => setTelRegion(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Consent State</label>
              <select
                value={telConsent}
                onChange={(e) =>
                  setTelConsent(e.target.value as 'granted' | 'withdrawn' | 'pending')
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="granted">granted</option>
                <option value="withdrawn">withdrawn</option>
                <option value="pending">pending</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Switch Latency (ms)</label>
              <input
                type="number"
                value={telSwitchMs}
                onChange={(e) => setTelSwitchMs(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono tabular-nums border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Return-to-TV (ms)</label>
              <input
                type="number"
                value={telReturnMs}
                onChange={(e) => setTelReturnMs(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono tabular-nums border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">QR Scan Time (ms)</label>
              <input
                type="number"
                value={telQrMs}
                onChange={(e) => setTelQrMs(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono tabular-nums border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={telClaimHw}
                onChange={(e) => setTelClaimHw(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Test claim <code className="font-mono">hardwareTested: true</code> (must block)</span>
            </label>

            <button
              type="button"
              onClick={() => handleValidateTelemetry()}
              disabled={testingTelemetry}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {testingTelemetry ? 'Validating...' : 'Validate Telemetry Sample'}
            </button>
          </div>

          {telemetryResult && (
            <div
              className={`p-3.5 border rounded-lg text-xs space-y-1.5 ${
                telemetryResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <p className="font-semibold">
                {telemetryResult.valid
                  ? 'ACCEPTED — Coarse Zero-PII Pilot Telemetry Validated'
                  : `REJECTED FAIL-CLOSED (${telemetryResult.rejectedReasons.length} guardrail violation(s))`}
              </p>
              {telemetryResult.rejectedReasons.map((r, idx) => (
                <p key={idx} className="font-mono text-[11px]">
                  • {r}
                </p>
              ))}
              {telemetryResult.sanitisedTelemetrySample && (
                <p className="font-mono text-[11px] break-all">
                  SHA-256: {telemetryResult.sanitisedTelemetrySample.payloadSha256}
                </p>
              )}
              <p className="font-mono text-[11px]">
                ordinaryTvPreserved={String(telemetryResult.ordinaryTvPreserved)} · hardwareTested={String(telemetryResult.hardwareTested)} · stageP6Deferred={String(telemetryResult.stageP6Deferred)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Closed Pilot Cohort Blueprints & Admin Registration */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Closed Pilot Cohort Blueprints (Admin Only Write · Country Non-Activated)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Prepares closed opt-in household cohorts (max 50 households) enforcing <code className="font-mono">DEC-OPEN-01</code> active consent and <code className="font-mono">countryActivated=false</code>.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Role: {currentUser.role}
          </span>
        </div>

        {currentUser.role === 'admin' && (
          <form onSubmit={handleCreateCohort} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Cohort Name</label>
              <input
                type="text"
                required
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Market</label>
              <select
                value={targetCountryCode}
                onChange={(e) => setTargetCountryCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="ZW">ZW (Zimbabwe — Initial)</option>
                <option value="GB">GB (UK Research)</option>
                <option value="ZA">ZA (South Africa Research)</option>
                <option value="KE">KE (Kenya Research)</option>
                <option value="NG">NG (Nigeria Research)</option>
                <option value="US">US (United States Research)</option>
                <option value="EU">EU (European Union Research)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Architecture Path</label>
              <select
                value={targetArchId}
                onChange={(e) => setTargetArchId(e.target.value as PilotTargetArchitectureId)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {(overview?.targetArchitectures ?? []).map((a) => (
                  <option key={a.architectureId} value={a.architectureId}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Household IDs (optional CSV)</label>
              <input
                type="text"
                value={enrolledHouseholdIdsText}
                onChange={(e) => setEnrolledHouseholdIdsText(e.target.value)}
                placeholder="hh_seed_zw_harare_01"
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cap (Max 50)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxHouseholdsCap}
                onChange={(e) => setMaxHouseholdsCap(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-1">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackDec02}
                  onChange={(e) => setAckDec02(e.target.checked)}
                />
                <span>Acknowledge DEC-OPEN-02 (k=1 short-break rule pending confirmation)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackDec03}
                  onChange={(e) => setAckDec03(e.target.checked)}
                />
                <span>Acknowledge DEC-OPEN-03 (Mock GAM backfill only)</span>
              </label>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submittingCohort}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {submittingCohort ? 'Saving Blueprint...' : 'Register Cohort Blueprint'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Cohort Blueprint</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Market / Arch</th>
                <th className="px-3 py-2 font-semibold text-slate-700 text-right">Enrolled / Cap</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Honesty Flags</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Status &amp; Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!overview || overview.cohorts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No closed pilot cohort blueprints registered yet. Admins can register a pre-pilot cohort above (remains unactivated until Phase 14).
                  </td>
                </tr>
              ) : (
                overview.cohorts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{c.cohortName}</p>
                      <p className="font-mono text-slate-500">{c.id}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">
                      {c.targetCountryCode} · {c.targetArchitectureId}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-right text-slate-800">
                      {c.enrolledHouseholdIds.length} / {c.maxHouseholdsCap}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">
                      countryActivated=false · hwTested=false
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono font-semibold text-slate-900">{c.status}</p>
                      <p className="font-mono text-slate-500">{c.cohortSha256.slice(0, 12)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Final Stage P6 Integrated Physical Verification Runbook */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Single Final Stage P6 Integrated Physical Verification Runbook (ADR-014 · 8 Mandatory Hardware Checks)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Executable only once at app completion on physical Smart TV + iOS/Android camera hardware. Every step remains <code className="font-mono">hardwareExecuted=false</code> during software phases.
            </p>
          </div>
          <ClipboardCheck className="w-4 h-4 text-slate-500 shrink-0" />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700 w-20">Step</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Physical Procedure &amp; Pass Criteria</th>
                <th className="px-3 py-2 font-semibold text-slate-700 w-44">Hardware Scope</th>
                <th className="px-3 py-2 font-semibold text-slate-700 w-72">Pre-Flight Prep Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(overview?.stageP6Runbook ?? []).map((step) => (
                <tr key={step.stepId}>
                  <td className="px-3 py-3 font-mono font-semibold text-slate-900 align-top whitespace-nowrap">
                    {step.stepId}
                  </td>
                  <td className="px-3 py-3 align-top space-y-1">
                    <p className="font-medium text-slate-900">{step.title}</p>
                    <p className="text-slate-600">{step.executionProcedure}</p>
                    <p className="text-slate-700 font-medium">Pass: {step.passCriteria}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-mono text-slate-800">{step.hardwareScope}</p>
                    <p className="font-mono text-amber-700 mt-0.5">hwExecuted=false</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {currentUser.role === 'admin' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={prepNotesDraft[step.stepId] ?? ''}
                          onChange={(e) =>
                            setPrepNotesDraft((prev) => ({
                              ...prev,
                              [step.stepId]: e.target.value,
                            }))
                          }
                          placeholder="Add pre-Stage P6 prep note..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePrepNote(step.stepId)}
                          disabled={savingNoteStep === step.stepId}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded whitespace-nowrap cursor-pointer"
                        >
                          {savingNoteStep === step.stepId ? '...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">
                        {step.ownerPrepNote || 'No admin pre-flight note recorded'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
