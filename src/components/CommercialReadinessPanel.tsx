import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  CommercialBoardDecisionOutcome,
  CommercialReadinessOverview,
  CommercialReadinessVerificationReport,
  PublicUser,
} from '../types/edison';
import { edisonFetch } from '../lib/csrfFetch';

interface CommercialReadinessPanelProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

export function CommercialReadinessPanel({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: CommercialReadinessPanelProps) {
  const [overview, setOverview] = useState<CommercialReadinessOverview | null>(null);
  const [suiteReport, setSuiteReport] = useState<CommercialReadinessVerificationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [savingAssumptions, setSavingAssumptions] = useState<boolean>(false);
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Budget assumption inputs
  const [householdsEst, setHouseholdsEst] = useState<string>('5000');
  const [breaksPerHh, setBreaksPerHh] = useState<string>('60');
  const [directCampaignsEst, setDirectCampaignsEst] = useState<string>('25');
  const [cdnCostPerGb, setCdnCostPerGb] = useState<string>('0.085');
  const [dbHostingUsd, setDbHostingUsd] = useState<string>('140');
  const [supportAgents, setSupportAgents] = useState<string>('3');
  const [modHoursPerWeek, setModHoursPerWeek] = useState<string>('30');

  // Board review form
  const [decisionOutcome, setDecisionOutcome] = useState<CommercialBoardDecisionOutcome>(
    'hold_software_ready_pending_external_gates'
  );
  const [summaryNote, setSummaryNote] = useState<string>(
    'Software-first commercial gates, 7 SLA targets, and $0.00 Charity unit economics verified; holding live launch until Stage P6, pen-test, and Phase 14 market approvals.'
  );

  const loadOverview = useCallback(async () => {
    if (!currentUser) {
      setOverview(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await edisonFetch('/api/commercial-readiness/overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load Phase 13 commercial readiness overview.');
      }
      const ov = data.overview as CommercialReadinessOverview;
      setOverview(ov);
      const a = ov.unitEconomics.assumptions;
      setHouseholdsEst(String(a.activeHouseholdsEstimate));
      setBreaksPerHh(String(a.monthlyCommercialBreaksPerHousehold));
      setDirectCampaignsEst(String(a.estimatedDirectCampaignsCount));
      setCdnCostPerGb(String(a.cdnEgressCostPerGbUsd));
      setDbHostingUsd(String(a.dbHostingTierMonthlyUsd));
      setSupportAgents(String(a.supportAgentHeadcount));
      setModHoursPerWeek(String(a.moderationHoursPerWeek));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load commercial readiness overview.'
      );
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
      const res = await edisonFetch('/api/commercial-readiness/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Commercial readiness suite failed.');
      }
      const rep = data.report as CommercialReadinessVerificationReport;
      setSuiteReport(rep);
      setStatusMsg(
        `Phase 13 suite complete: ${rep.passedChecks}/${rep.totalChecks} checks passed (commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to execute commercial readiness suite.');
    } finally {
      setRunningSuite(false);
    }
  };

  const handleSaveAssumptions = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSavingAssumptions(true);
    try {
      const res = await edisonFetch('/api/commercial-readiness/cost-assumptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeHouseholdsEstimate: Number(householdsEst),
          monthlyCommercialBreaksPerHousehold: Number(breaksPerHh),
          estimatedDirectCampaignsCount: Number(directCampaignsEst),
          cdnEgressCostPerGbUsd: Number(cdnCostPerGb),
          dbHostingTierMonthlyUsd: Number(dbHostingUsd),
          supportAgentHeadcount: Number(supportAgents),
          moderationHoursPerWeek: Number(modHoursPerWeek),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update unit economics assumptions.');
      }
      setOverview(data.overview as CommercialReadinessOverview);
      setStatusMsg(
        `Updated unit-economics simulation model (OPEX $${data.overview.unitEconomics.estimatedTotalMonthlyOpexUsd}/mo, $0.00 Charity lock, paymentCollectionActive=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save budget assumptions.');
    } finally {
      setSavingAssumptions(false);
    }
  };

  const handleSubmitBoardDecision = async (requestedLaunchAuthorization: boolean) => {
    setErrorMsg('');
    setStatusMsg('');
    setSubmittingDecision(true);
    try {
      const res = await edisonFetch('/api/commercial-readiness/board-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionOutcome,
          requestedLaunchAuthorization,
          summaryNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Board review request rejected.');
      }
      setOverview(data.overview as CommercialReadinessOverview);
      setStatusMsg(
        `Board review ${data.decision.id} logged (${data.decision.decisionOutcome}) · commercialLaunchAuthorized=false · paymentCollectionActive=false.`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Board submission failed.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
        <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-900">
          Phase 13 Commercial Readiness Board Gate (Software-First)
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Sign in to inspect the 10-pillar commercial readiness assessment, 7-domain Production SLA matrix, unit-economics budget model, and fail-closed launch board gate.
        </p>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
        >
          Go to Auth &amp; RBAC Console
        </button>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Phase 13 Block 13.1 — Commercial Readiness Board Gate, SLA Matrix &amp; Unit Economics (Software-First)
          </h2>
          <p className="text-xs text-slate-600">
            Honest Launch Lock: commercialLaunchAuthorized=false · paymentCollectionActive=false · countryActivated=false · hardwareTested=false (Stage P6 deferred) · Charity Jobs=$0.00 / FREE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Board Gate</span>
          </button>
          <button
            type="button"
            onClick={handleRunSuite}
            disabled={runningSuite}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningSuite ? 'Running 8 Checks...' : 'Run 8/8 Phase 13 Verification Suite'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-red-900">
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-mono break-words">{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* KPI Strip */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Software Pillars Verified</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
              {overview.softwarePillarsReadyCount}/{overview.pillarsTotalCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">All 10 Phase 13 pillars inventoried</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">External Launch Blockers</p>
            <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums font-mono">
              {overview.blockedExternalPillarsCount} Gated
            </p>
            <p className="text-xs text-slate-600 mt-1">Launch Authorized: FALSE (Locked)</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Simulated Monthly OPEX</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
              ${overview.unitEconomics.estimatedTotalMonthlyOpexUsd.toFixed(2)}
            </p>
            <p className="text-xs text-slate-600 mt-1 tabular-nums font-mono">
              Est. CPM: ${overview.unitEconomics.costPerThousandAdDeliveriesUsd.toFixed(4)}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Charity &amp; Billing Lock</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums font-mono">
              $0.00 / FREE
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Payments Active: {overview.paymentCollectionActive ? 'YES' : 'NO (Disabled)'}
            </p>
          </div>
        </div>
      )}

      {/* Suite Results */}
      {suiteReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Phase 13 Verification Suite — {suiteReport.passedChecks}/{suiteReport.totalChecks} Passed
            </h3>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              LaunchAuth: {String(suiteReport.commercialLaunchAuthorized)} · Payments: {String(suiteReport.paymentCollectionActive)} · Stage P6 Deferred: {String(suiteReport.stageP6Deferred)}
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Check</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suiteReport.checks.map((c) => (
                  <tr key={c.checkId}>
                    <td className="px-3 py-2 font-medium text-slate-900">{c.label}</td>
                    <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                      {c.passed ? (
                        <span className="text-emerald-700">PASS</span>
                      ) : (
                        <span className="text-red-700">FAIL</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-mono">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-Launch Blockers Banner (No thick left border) */}
      {overview && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Active External &amp; Hardware Pre-Launch Locks (Preventing Premature Launch)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-950 list-disc pl-5">
            {overview.launchBlockersSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 10-Pillar Commercial Readiness Board Table */}
      {overview && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                10-Pillar Commercial Readiness Assessment
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Software-first verification is strictly separated from physical hardware, payment gateway, external pen-test, and Phase 14 country sign-offs.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              SHA-256: {overview.commercialReadinessSha256.slice(0, 14)}
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Pillar</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Software</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Live Gate</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Evidence &amp; Blocking Dependency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overview.pillars.map((p) => (
                  <tr key={p.pillarId}>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-semibold text-slate-900">{p.categoryLabel}</div>
                      <div className="text-slate-600 mt-0.5">{p.title}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono whitespace-nowrap">
                      <span className={p.softwareVerified ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                        {p.softwareVerified ? 'SW VERIFIED' : 'SW PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono whitespace-nowrap">
                      <span className={p.gateStatus === 'software_ready' ? 'text-slate-700' : 'text-amber-700 font-semibold'}>
                        {p.gateStatus === 'software_ready' ? 'Ops Ready' : 'External Lock'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top space-y-1">
                      <div className="text-slate-800">{p.evidenceSummary}</div>
                      {p.blockingDependency && (
                        <div className="text-amber-800 font-medium">Blocker: {p.blockingDependency}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production SLA Matrix */}
      {overview && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              7-Domain Production SLA &amp; Escalation Matrix
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Operational reliability SLAs codified from Phase 4–12 software simulations; hardware execution calibrated during Stage P6.
            </p>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Domain</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Target Threshold</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Owner &amp; Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overview.productionSlaTargets.map((sla) => (
                  <tr key={sla.slaId}>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {sla.slaId}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{sla.serviceDomain}</div>
                      <div className="text-slate-500">{sla.metric}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-800 tabular-nums">
                      {sla.targetThreshold}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-800">{sla.escalationOwner}</div>
                      <div className="text-slate-500 font-mono">
                        {sla.currentSoftwareStatus === 'verified_in_simulation'
                          ? 'Verified in Sim'
                          : 'Baseline Defined'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two-Column Split: Unit Economics Model + Board Review Gate */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Unit Economics Calculator */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Infrastructure Cost &amp; Unit-Economics Simulator (Budget Only)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Simulates cloud CDN, DB, and moderation OPEX. Charity listings remain permanently $0.00 / FREE; real billing stays disabled.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs">
              <div>
                <div className="text-slate-500">Monthly Commercial Slots</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {overview.unitEconomics.estimatedMonthlyCommercialImpressions.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Charity Slots ($0.00)</div>
                <div className="font-mono font-semibold text-emerald-700 tabular-nums mt-0.5">
                  {overview.unitEconomics.estimatedMonthlyCharityImpressions.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Cloud + Support Ops</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  ${overview.unitEconomics.estimatedMonthlyCloudCostUsd.toFixed(2)} + ${overview.unitEconomics.estimatedSupportOpsCostUsd.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Break-Even / Direct Campaign</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  ${overview.unitEconomics.estimatedRevenuePerDirectCampaignRequiredUsd.toFixed(2)} / mo
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveAssumptions} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Active Households Estimate</span>
                  <input
                    type="number"
                    value={householdsEst}
                    onChange={(e) => setHouseholdsEst(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Monthly Breaks / Household</span>
                  <input
                    type="number"
                    value={breaksPerHh}
                    onChange={(e) => setBreaksPerHh(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Est. Direct Campaigns / Mo</span>
                  <input
                    type="number"
                    value={directCampaignsEst}
                    onChange={(e) => setDirectCampaignsEst(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">CDN Egress ($/GB)</span>
                  <input
                    type="number"
                    step="0.001"
                    value={cdnCostPerGb}
                    onChange={(e) => setCdnCostPerGb(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">DB Tier ($/Mo)</span>
                  <input
                    type="number"
                    step="1"
                    value={dbHostingUsd}
                    onChange={(e) => setDbHostingUsd(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Support Agents / Mod Hrs</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={supportAgents}
                      onChange={(e) => setSupportAgents(e.target.value)}
                      disabled={!isAdmin}
                      aria-label="Support Agents"
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                    />
                    <input
                      type="number"
                      value={modHoursPerWeek}
                      onChange={(e) => setModHoursPerWeek(e.target.value)}
                      disabled={!isAdmin}
                      aria-label="Moderation Hours per Week"
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                </label>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-slate-500">
                  Hash: {overview.unitEconomics.costModelSha256.slice(0, 14)}
                </span>
                {isAdmin ? (
                  <button
                    type="submit"
                    disabled={savingAssumptions}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {savingAssumptions ? 'Recalculating...' : 'Update Budget Assumptions'}
                  </button>
                ) : (
                  <span className="text-slate-500">Admin role required to edit assumptions</span>
                )}
              </div>
            </form>
          </div>

          {/* Commercial Board Gate Review */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-700" />
                <span>Commercial Readiness Board Decision Log</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Enforces fail-closed gate: premature launch authorization is blocked while Stage P6 hardware, payments, pen-test, and country approvals remain open.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium text-slate-700">Board Review Resolution</span>
                <select
                  value={decisionOutcome}
                  onChange={(e) =>
                    setDecisionOutcome(e.target.value as CommercialBoardDecisionOutcome)
                  }
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="hold_software_ready_pending_external_gates">
                    Software Ready — Hold Commercial Launch Pending Stage P6 &amp; External Gates
                  </option>
                  <option value="defer_pending_stage_p6_and_compliance">
                    Defer — Complete Stage P6 Physical Pilot, Pen-Test &amp; Legal Clearances
                  </option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-slate-700">Board Review Summary Note</span>
                <textarea
                  rows={3}
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </label>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingDecision}
                    onClick={() => handleSubmitBoardDecision(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Log Hold/Deferral Decision</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingDecision}
                    onClick={() => handleSubmitBoardDecision(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Test Fail-Closed Launch Block</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Recorded Board Minutes ({overview.boardDecisions.length})
              </div>
              {overview.boardDecisions.length === 0 ? (
                <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3">
                  No board review minutes recorded yet. Admins may log a formal Phase 13 software-readiness hold decision above.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Resolution</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Reviewer &amp; Digest</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Launch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {overview.boardDecisions.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">
                            <div className="font-mono text-slate-900">{d.decisionOutcome}</div>
                            <div className="text-slate-600 mt-0.5">{d.summaryNote}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            <div>{d.boardReviewerEmail}</div>
                            <div>{d.boardDecisionSha256.slice(0, 12)}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-amber-800 whitespace-nowrap">
                            LOCKED (false)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
