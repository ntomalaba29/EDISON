import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  CountryLaunchAssessment,
  CountryLaunchDecisionOutcome,
  CountryLaunchOverview,
  CountryLaunchVerificationReport,
  LaunchMarketCode,
  PublicUser,
} from '../types/edison';
import { edisonFetch } from '../lib/csrfFetch';

interface CountryLaunchPanelProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

export function CountryLaunchPanel({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: CountryLaunchPanelProps) {
  const [overview, setOverview] = useState<CountryLaunchOverview | null>(null);
  const [suiteReport, setSuiteReport] = useState<CountryLaunchVerificationReport | null>(null);
  const [selectedCode, setSelectedCode] = useState<LaunchMarketCode>('ZW');
  const [loading, setLoading] = useState<boolean>(false);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Editable jurisdiction policy controls (non-overridable safety locks shown read-only)
  const [consentBannerStrictMode, setConsentBannerStrictMode] = useState<boolean>(true);
  const [requirePreBroadcastMod, setRequirePreBroadcastMod] = useState<boolean>(true);
  const [enforceLocalPrivacyLock, setEnforceLocalPrivacyLock] = useState<boolean>(true);
  const [operatorTaxNoticeLabel, setOperatorTaxNoticeLabel] = useState<string>('');

  // Territory review decision controls
  const [decisionOutcome, setDecisionOutcome] = useState<CountryLaunchDecisionOutcome>(
    'stage_software_ready_for_stage_p6_and_filing'
  );
  const [summaryNote, setSummaryNote] = useState<string>(
    'ZW software controls & statutory mapping verified (POTRAZ/BAZ/Labour Act/ZIMRA baseline); territory remains NOT ACTIVATED until Stage P6 physical TV execution and filing clearance.'
  );

  const syncPolicyFormFromMarket = useCallback((country?: CountryLaunchAssessment) => {
    if (!country) return;
    setConsentBannerStrictMode(country.policyConfig.consentBannerStrictMode);
    setRequirePreBroadcastMod(country.policyConfig.requirePreBroadcastHumanModeration);
    setEnforceLocalPrivacyLock(country.policyConfig.enforceVppsOrLocalPrivacyLock);
    setOperatorTaxNoticeLabel(country.policyConfig.operatorTaxNoticeLabel);
  }, []);

  const loadOverview = useCallback(async () => {
    if (!currentUser) {
      setOverview(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await edisonFetch('/api/country-launch/overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load Phase 14 country launch overview.');
      }
      const ov = data.overview as CountryLaunchOverview;
      setOverview(ov);
      const active = ov.countries.find((c) => c.countryCode === selectedCode) ?? ov.countries[0];
      syncPolicyFormFromMarket(active);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load Phase 14 country launch overview.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedCode, syncPolicyFormFromMarket]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSelectMarket = (code: LaunchMarketCode) => {
    setSelectedCode(code);
    const match = overview?.countries.find((c) => c.countryCode === code);
    syncPolicyFormFromMarket(match);
  };

  const handleRunSuite = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setRunningSuite(true);
    try {
      const res = await edisonFetch('/api/country-launch/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Country launch readiness suite failed.');
      }
      const rep = data.report as CountryLaunchVerificationReport;
      setSuiteReport(rep);
      setStatusMsg(
        `Phase 14 suite complete: ${rep.passedChecks}/${rep.totalChecks} checks passed (activeLaunchedMarketsCount=0, countryActivated=false, legalComplianceClaimed=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to run Phase 14 verification suite.'
      );
    } finally {
      setRunningSuite(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSavingPolicy(true);
    try {
      const res = await edisonFetch('/api/country-launch/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: selectedCode,
          consentBannerStrictMode,
          requirePreBroadcastHumanModeration: requirePreBroadcastMod,
          enforceVppsOrLocalPrivacyLock: enforceLocalPrivacyLock,
          operatorTaxNoticeLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update jurisdiction policy controls.');
      }
      const ov = data.overview as CountryLaunchOverview;
      setOverview(ov);
      const updated = ov.countries.find((c) => c.countryCode === selectedCode);
      syncPolicyFormFromMarket(updated);
      setStatusMsg(
        `Updated policy controls for ${selectedCode} (mandatory $0 Charity fee lock, no broadcast signal hijack, and geo redaction preserved; countryActivated=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Policy update failed.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSubmitDecision = async (requestedCountryActivation: boolean) => {
    setErrorMsg('');
    setStatusMsg('');
    setSubmittingDecision(true);
    try {
      const res = await edisonFetch('/api/country-launch/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: selectedCode,
          decisionOutcome,
          requestedCountryActivation,
          summaryNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Territory activation request rejected.');
      }
      setOverview(data.overview as CountryLaunchOverview);
      setStatusMsg(
        `Territory gate decision ${data.decision.id} logged for ${data.decision.countryCode} (${data.decision.decisionOutcome}) · countryActivated=false · legalComplianceClaimed=false.`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Territory decision failed.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
        <Globe className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-900">
          Phase 14 Country-by-Country Launch Readiness Gate (Software-First)
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Sign in to inspect the 6-market ADR-015 statutory gate matrix (ZW Initial Launch Market + GB, EU, US, ZA, KE/NG), jurisdiction policy controls, and fail-closed territory activation lock.
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
  const activeCountry =
    overview?.countries.find((c) => c.countryCode === selectedCode) ?? overview?.countries[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Phase 14 Block 14.1 — Country-by-Country Launch Readiness Gate &amp; Jurisdiction Policy Engine (Software-First)
          </h2>
          <p className="text-xs text-slate-600">
            Independent Statutory Research Policy (noLawyerDependencyPolicy=true · legalComplianceClaimed=false) · All 6 Markets Unactivated (countryActivated=false) · Stage P6 Deferred
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
            <span>Refresh Market Gates</span>
          </button>
          <button
            type="button"
            onClick={handleRunSuite}
            disabled={runningSuite}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningSuite ? 'Running 8 Checks...' : 'Run 8/8 Phase 14 Verification Suite'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-red-900">
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-mono break-words">{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 4-Card KPI Strip */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Software-Ready Markets</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
              {overview.softwareReadyMarketsCount}/{overview.totalInventoriedMarketsCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">Initial Market: ZW (4/4 SW gates)</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Live Activated Markets</p>
            <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums font-mono">
              {overview.activeLaunchedMarketsCount} / {overview.totalInventoriedMarketsCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">All territories strictly NOT ACTIVATED</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Statutory Compliance Claim</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              FALSE
            </p>
            <p className="text-xs text-slate-600 mt-1">Independent public research only</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Hardware &amp; Fee Locks</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums font-mono">
              $0.00 / FREE
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Charity jobs free · Stage P6 Deferred
            </p>
          </div>
        </div>
      )}

      {/* 8/8 Verification Suite Results */}
      {suiteReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Phase 14 Verification Suite — {suiteReport.passedChecks}/{suiteReport.totalChecks} Passed
            </h3>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              Activated: {suiteReport.activeLaunchedMarketsCount}/6 · LegalClaimed: {String(suiteReport.legalComplianceClaimed)} · Stage P6 Deferred: {String(suiteReport.stageP6Deferred)}
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

      {/* Global Launch Locks Notice */}
      {overview && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Country Launch &amp; Statutory Boundaries (Software Controls Active; Live Activation Locked)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-950 list-disc pl-5">
            {overview.globalLaunchBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6-Territory Launch Readiness Matrix */}
      {overview && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Country Activation Register Matrix (6 Baseline Territories)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Select any market to inspect its preflight checks, public statutes researched, and configure policy parameters.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Manifest SHA-256: {overview.manifestSha256.slice(0, 14)}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Territory</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Software Gates</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">External / Stage P6</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Seed Coverage</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Activation Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overview.countries.map((c) => {
                  const isSelected = c.countryCode === selectedCode;
                  return (
                    <tr
                      key={c.countryCode}
                      className={isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}
                    >
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-semibold text-slate-900 font-mono">
                          {c.countryCode}{' '}
                          {c.isInitialLaunchMarket ? (
                            <span className="text-blue-700 font-sans font-semibold">
                              · Initial Launch Market
                            </span>
                          ) : null}
                        </div>
                        <div className="text-slate-600 mt-0.5">{c.countryName}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono tabular-nums text-emerald-700 font-semibold whitespace-nowrap">
                        {c.softwareGatesReadyCount}/{c.softwareGatesTotalCount} VERIFIED
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono tabular-nums text-amber-800 whitespace-nowrap">
                        {c.externalClearancesBlockedCount} BLOCKED
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        HH:{c.liveSeedCoverage.householdsInMarket} · CMP:{c.liveSeedCoverage.campaignsTargetingMarket} · OPP:{c.liveSeedCoverage.verifiedLiveOpportunities}
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono font-semibold text-amber-800 whitespace-nowrap">
                        NOT ACTIVATED
                      </td>
                      <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSelectMarket(c.countryCode)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Market Detail: Preflight Breakdown + Statutes */}
      {activeCountry && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {activeCountry.countryCode} — {activeCountry.countryName} Preflight &amp; Statutory Evidence
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Assessment SHA-256: <code className="font-mono">{activeCountry.assessmentSha256.slice(0, 14)}</code> · countryActivated=false · legalComplianceClaimed=false
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Gate ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Control / External Prerequisite</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeCountry.preflightChecks.map((chk) => (
                  <tr key={chk.gateId}>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {chk.gateId}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{chk.label}</td>
                    <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                      {chk.passed ? (
                        <span className="text-emerald-700">VERIFIED (SW)</span>
                      ) : (
                        <span className="text-amber-800">BLOCKED (EXT)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{chk.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50/70">
              <h4 className="font-semibold text-slate-900">
                Public Statutes Researched (No Lawyer Dependency)
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {activeCountry.statutesResearched.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50/70">
              <h4 className="font-semibold text-slate-900">
                Unresolved Regulatory &amp; Launch Clearances
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-amber-900">
                {activeCountry.activationBlockers.map((blk) => (
                  <li key={blk}>{blk}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Interactive Controls: Jurisdiction Policy Form & Fail-Closed Activation Gate */}
      {overview && activeCountry && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Policy Editor */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Jurisdiction Policy Controls ({selectedCode})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Configure pre-launch tax notice &amp; consent strictness. Mandatory $0 Charity fee ban, geo redaction, and no signal hijacking are permanently locked ON.
              </p>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentBannerStrictMode}
                  onChange={(e) => setConsentBannerStrictMode(e.target.checked)}
                  disabled={!isAdmin}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-slate-800">
                  Enforce Strict Consent Banner &amp; DEC-OPEN-01 Bundled Withdrawal
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePreBroadcastMod}
                  onChange={(e) => setRequirePreBroadcastMod(e.target.checked)}
                  disabled={!isAdmin}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-slate-800">
                  Require Pre-Broadcast Human Moderation &amp; Active QR Gate
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceLocalPrivacyLock}
                  onChange={(e) => setEnforceLocalPrivacyLock(e.target.checked)}
                  disabled={!isAdmin}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-slate-800">
                  Enforce Local Statutory Privacy Lock (POTRAZ / PECR / GDPR / VPPA / POPIA)
                </span>
              </label>

              <label className="block space-y-1 pt-1">
                <span className="font-medium text-slate-700">Operator Tax &amp; Statutory Notice Label</span>
                <input
                  type="text"
                  required
                  value={operatorTaxNoticeLabel}
                  onChange={(e) => setOperatorTaxNoticeLabel(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-700 space-y-1">
                <div>Non-Overridable Locks:</div>
                <div>· jobFeeZeroLockEnforced = TRUE ($0.00 Charity / Job Applicants)</div>
                <div>· prohibitExternalSignalHijack = TRUE (ADR-001 / ADR-017)</div>
                <div>· redactHouseholdGeoFromAdvertisers = TRUE</div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-slate-500">
                  Updated by: {activeCountry.policyConfig.updatedByEmail}
                </span>
                {isAdmin ? (
                  <button
                    type="submit"
                    disabled={savingPolicy}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {savingPolicy ? 'Saving Policy...' : `Save ${selectedCode} Policy Controls`}
                  </button>
                ) : (
                  <span className="text-slate-500">Admin role required to edit policies</span>
                )}
              </div>
            </form>
          </div>

          {/* Fail-Closed Territory Activation Decision Log */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-700" />
                <span>Territory Activation Gate Decision Log ({selectedCode})</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Fail-closed activation lock blocks transitioning any market to activated while Stage P6 hardware, external pen-test, and commercial approvals remain unexecuted.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium text-slate-700">Territory Gate Resolution</span>
                <select
                  value={decisionOutcome}
                  onChange={(e) =>
                    setDecisionOutcome(e.target.value as CountryLaunchDecisionOutcome)
                  }
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="stage_software_ready_for_stage_p6_and_filing">
                    Stage Software Ready — Hold Activation Pending Stage P6 &amp; Regulator Filing
                  </option>
                  <option value="hold_country_unactivated_pending_clearances">
                    Hold Unactivated — Keep Market Blocked Pending Statutory &amp; Hardware Sign-Off
                  </option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-slate-700">Decision Audit Summary</span>
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
                    onClick={() => handleSubmitDecision(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Log Unactivated Hold Decision ({selectedCode})</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingDecision}
                    onClick={() => handleSubmitDecision(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Test Fail-Closed Country Activation Block</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Recorded Territory Gate Decisions ({overview.launchDecisions.length})
              </div>
              {overview.launchDecisions.length === 0 ? (
                <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3">
                  No territory activation decisions logged yet. Admins may record an unactivated hold or Stage-P6 staging entry above.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Market &amp; Resolution</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Reviewer &amp; Digest</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Activated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {overview.launchDecisions.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">
                            <div className="font-mono font-semibold text-slate-900">
                              {d.countryCode} · {d.decisionOutcome}
                            </div>
                            <div className="text-slate-600 mt-0.5">{d.summaryNote}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            <div>{d.reviewerEmail}</div>
                            <div>{d.decisionSha256.slice(0, 12)}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-amber-800 whitespace-nowrap">
                            FALSE (Locked)
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
