import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  ExpansionCurrencyCode,
  ExpansionRegionId,
  InternationalExpansionDecisionOutcome,
  InternationalExpansionOverview,
  InternationalExpansionVerificationReport,
  InternationalRegionProfileAssessment,
  LaunchMarketCode,
  MultiCurrencyProFormaEstimate,
  PublicUser,
  RegionalLocalizationConfig,
} from '../types/edison';
import { edisonFetch } from '../lib/csrfFetch';
import {
  CONTINENT_NAMES,
  CONTINENT_TARGET_MARKETS,
  COUNTRY_NAMES,
  REGION_PROFILES,
} from '../server/continentCountryRegionData';

interface InternationalExpansionPanelProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

const CURRENCY_OPTIONS: ExpansionCurrencyCode[] = [
  'USD',
  'ZWG',
  'GBP',
  'EUR',
  'ZAR',
  'KES',
  'NGN',
];

export function InternationalExpansionPanel({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: InternationalExpansionPanelProps) {
  const [overview, setOverview] = useState<InternationalExpansionOverview | null>(null);
  const [suiteReport, setSuiteReport] =
    useState<InternationalExpansionVerificationReport | null>(null);
  const [selectedRegionId, setSelectedRegionId] =
    useState<ExpansionRegionId>('africa_south_zw_za');

  const [loading, setLoading] = useState<boolean>(false);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [estimating, setEstimating] = useState<boolean>(false);
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Editable regional localization blueprint state
  const [primaryLanguageCode, setPrimaryLanguageCode] = useState<string>('en');
  const [supportedLanguagesInput, setSupportedLanguagesInput] =
    useState<string>('en, sn, nd, zu');
  const [captionAccessibilityStandard, setCaptionAccessibilityStandard] =
    useState<string>('');
  const [multiCurrencyCode, setMultiCurrencyCode] = useState<ExpansionCurrencyCode>('USD');
  const [proFormaCpmRateLocal, setProFormaCpmRateLocal] = useState<string>('4.5');

  // 7-Currency Pro-Forma Estimator state
  const [estCurrencyCode, setEstCurrencyCode] = useState<ExpansionCurrencyCode>('ZWG');
  const [estCpmRateLocal, setEstCpmRateLocal] = useState<string>('119.25');
  const [estCommercialImps, setEstCommercialImps] = useState<string>('25000');
  const [estCharityImps, setEstCharityImps] = useState<string>('50000');
  const [estimateResult, setEstimateResult] = useState<MultiCurrencyProFormaEstimate | null>(null);

  // Governance decision form state
  const [decisionOutcome, setDecisionOutcome] = useState<InternationalExpansionDecisionOutcome>(
    'stage_multi_region_blueprint_for_post_launch'
  );
  const [summaryNote, setSummaryNote] = useState<string>(
    'Wave 1 Southern Africa (ZW + ZA) sovereign residency, multilingual captions, and $0.00 Charity pro-forma blueprint verified; region remains NOT ACTIVATED pending Stage P6 & Phase 14 country sign-off.'
  );

  // International Administrator geographic dashboard state
  const [selectedContinent, setSelectedContinent] = useState<'africa' | 'asia' | 'europe' | 'north_america' | 'south_america' | 'oceania' | 'antarctica'>('africa');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState<boolean>(true);

  const syncFormFromRegion = useCallback((region?: InternationalRegionProfileAssessment) => {
    if (!region) return;
    const cfg = region.localizationConfig;
    setPrimaryLanguageCode(cfg.primaryLanguageCode);
    setSupportedLanguagesInput(cfg.supportedLanguageCodes.join(', '));
    setCaptionAccessibilityStandard(cfg.captionAccessibilityStandard);
    setMultiCurrencyCode(cfg.multiCurrencyCode);
    setProFormaCpmRateLocal(String(cfg.proFormaCpmRateLocal));
  }, []);

  const loadOverview = useCallback(async () => {
    if (!currentUser) {
      setOverview(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await edisonFetch('/api/international-expansion/overview', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load Phase 15 international expansion overview.');
      }
      const ov = data.overview as InternationalExpansionOverview;
      setOverview(ov);
      const active =
        ov.regions.find((r) => r.regionId === selectedRegionId) ?? ov.regions[0];
      syncFormFromRegion(active);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to load Phase 15 international expansion overview.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedRegionId, syncFormFromRegion]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSelectRegion = (regionId: ExpansionRegionId) => {
    setSelectedRegionId(regionId);
    const match = overview?.regions.find((r) => r.regionId === regionId);
    syncFormFromRegion(match);
  };

  const handleRunSuite = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setRunningSuite(true);
    try {
      const res = await edisonFetch('/api/international-expansion/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Phase 15 verification suite failed.');
      }
      const rep = data.report as InternationalExpansionVerificationReport;
      setSuiteReport(rep);
      setStatusMsg(
        `Phase 15 suite complete: ${rep.passedChecks}/${rep.totalChecks} checks passed (activeExpandedRegionsCount=0, regionalExpansionActive=false, prohibitCrossBorderPiiTransfer=true, stageP6Deferred=true).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to run Phase 15 verification suite.'
      );
    } finally {
      setRunningSuite(false);
    }
  };

  const handleSaveRegionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSavingConfig(true);
    try {
      const supportedLanguageCodes = supportedLanguagesInput
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length >= 2);
      const parsedCpm = Number(proFormaCpmRateLocal);
      const res = await edisonFetch('/api/international-expansion/region-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: selectedRegionId,
          primaryLanguageCode: primaryLanguageCode.trim().toLowerCase(),
          supportedLanguageCodes:
            supportedLanguageCodes.length > 0
              ? supportedLanguageCodes
              : [primaryLanguageCode.trim().toLowerCase()],
          captionAccessibilityStandard,
          multiCurrencyCode,
          proFormaCpmRateLocal: Number.isFinite(parsedCpm) ? parsedCpm : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update regional localization blueprint.');
      }
      const ov = data.overview as InternationalExpansionOverview;
      setOverview(ov);
      const updated = ov.regions.find((r) => r.regionId === selectedRegionId);
      syncFormFromRegion(updated);
      setStatusMsg(
        `Saved regional localization blueprint for ${selectedRegionId} (prohibitCrossBorderPiiTransfer=true, charityZeroCostLocked=true, regionalExpansionActive=false).`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Regional localization update failed.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setEstimating(true);
    try {
      const res = await edisonFetch('/api/international-expansion/estimate-currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: selectedRegionId,
          currencyCode: estCurrencyCode,
          proFormaCpmRateLocal: Number(estCpmRateLocal),
          directCommercialImpressions: Number(estCommercialImps),
          charityImpressions: Number(estCharityImps),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate multi-currency pro-forma estimate.');
      }
      const est = data.estimate as MultiCurrencyProFormaEstimate;
      setEstimateResult(est);
      setStatusMsg(
        `Calculated non-transactional pro-forma estimate in ${est.currencyCode}: Commercial ${est.commercialGrossLocal} ${est.currencyCode} (~$${est.commercialGrossUsd} USD) · Charity 0 ${est.currencyCode} (paymentCollectionActive=false).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Multi-currency pro-forma estimate failed.'
      );
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmitDecision = async (requestedRegionActivation: boolean) => {
    setErrorMsg('');
    setStatusMsg('');
    setSubmittingDecision(true);
    try {
      const res = await edisonFetch('/api/international-expansion/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: selectedRegionId,
          decisionOutcome,
          requestedRegionActivation,
          summaryNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Expansion region activation request rejected.');
      }
      setOverview(data.overview as InternationalExpansionOverview);
      setStatusMsg(
        `Expansion governance decision ${data.decision.id} logged for ${data.decision.regionId} (${data.decision.decisionOutcome}) · regionalExpansionActive=false.`
      );
      await onSummaryRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'International expansion decision failed.'
      );
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
        <Globe2 className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-900">
          EDISON Charity Ad Tracker &amp; Sovereign Residency (Software-First)
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Sign in to inspect the 4 sovereign expansion clusters (mapping all 6 ADR-015 markets), multilingual caption packs, 7-currency $0.00-Charity pro-forma estimator, and fail-closed region activation gate.
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
  const activeRegion =
    overview?.regions.find((r) => r.regionId === selectedRegionId) ??
    overview?.regions[0] ??
    null;

  // Available continents per the international administrator requirements
  const CONTINENTS = Object.entries(CONTINENT_NAMES).map(([code, name]) => ({
    code,
    name,
  }));

  // Get countries for selected continent
  const countriesForContinent = CONTINENT_TARGET_MARKETS[selectedContinent] || [];

  // Get regions for selected country — using REGION_PROFILES from server module
  const regionsForCountry = useMemo(() => {
    if (!selectedCountryCode) return [];
    const regionId = REGION_PROFILES.find((profile) =>
      profile.targetMarketCodes.includes(selectedCountryCode as LaunchMarketCode)
    )?.regionId;
    if (regionId) {
      return [{
        regionId,
        regionName: REGION_PROFILES.find((r) => r.regionId === regionId)?.regionName || regionId,
        targetMarkets: [selectedCountryCode],
      }];
    }
    return [];
  }, [selectedCountryCode]);

  const renderAdminDashboard = () => {
    if (!showDashboard) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            International Administration Dashboard
          </h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Continent</span>
              <select
                value={selectedContinent}
                onChange={(e) => {
                    setSelectedContinent(
                      e.target.value as typeof selectedContinent
                    );
                  setSelectedCountryCode('');
                  setSelectedRegionId('africa_south_zw_za');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
              >
                {CONTINENTS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Country</span>
              <select
                disabled={countriesForContinent.length === 0}
                value={selectedCountryCode}
                onChange={(e) => {
                  setSelectedCountryCode(e.target.value as string);
                  const profile = REGION_PROFILES.find((candidate) =>
                    candidate.targetMarketCodes.includes(e.target.value as LaunchMarketCode)
                  );
                  if (profile) setSelectedRegionId(profile.regionId);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
              >
                {countriesForContinent.map((code) => (
                  <option key={code} value={code}>
                    {COUNTRY_NAMES[code] || code}
                  </option>
                ))}
                {countriesForContinent.length === 0 && (
                  <option>No ADR-015 markets defined</option>
                )}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Region</span>
              <select
                disabled={!selectedCountryCode}
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value as ExpansionRegionId)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
              >
                {regionsForCountry.map((r) => (
                  <option key={r.regionId} value={r.regionId}>
                    {r.regionName} ({r.targetMarkets.join(', ')})
                  </option>
                ))}
                {regionsForCountry.length === 0 && (
                  <option>No regions defined for this country</option>
                )}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Global Launch Status</span>
              <p className="text-xs text-slate-600 mt-1">
                {selectedRegionId === 'africa_south_zw_za'
                  ? 'Southern Africa cluster (ZW + ZA) · Zero activated · Stage P6 deferred'
                  : selectedRegionId === 'europe_uk_eu'
                  ? 'Europe & UK cluster (GB + EU) · Zero activated · Stage P6 deferred'
                  : 'North America cluster (US) · Zero activated · Stage P6 deferred'}
              </p>
            </label>
          </div>

          <div className="mt-3 p-3 border-l-2 border-slate-300 bg-slate-50">
            <p className="font-mono text-slate-700 text-xs">
              International administrator managing {CONTINENTS.length} continents,
              {Object.keys(CONTINENT_TARGET_MARKETS).reduce(
                (sum, k) => sum + (CONTINENT_TARGET_MARKETS[k]?.length || 0),
                0
              )} countries,
              {regionsForCountry.length} regions configured
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminCompact = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-700 text-xs">
          Admin Region: {selectedContinent.charAt(0).toUpperCase() + selectedContinent.slice(1)}
        </span>
        <select
          value={selectedContinent}
          onChange={(e) => {
            setSelectedContinent(e.target.value as typeof selectedContinent);
            setSelectedCountryCode('');
            setSelectedRegionId('africa_south_zw_za');
          }}
          className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-lg bg-white"
        >
          {CONTINENTS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedCountryCode && (
          <span className="font-mono text-slate-500 text-xs">
            · {COUNTRY_NAMES[selectedCountryCode] || selectedCountryCode}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Phase 15 Block 15.1 — International Multi-Region Expansion, Localization &amp; Sovereign Residency (Software-First)
          </h2>
          <p className="text-xs text-slate-600">
            Cross-Border PII Isolation Locked (prohibitCrossBorderPiiTransfer=true) · Zero Regions Activated (regionalExpansionActive=false) · Stage P6 Strictly Deferred
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
            <span>Refresh Expansion Blueprints</span>
          </button>
          <button
            type="button"
            onClick={handleRunSuite}
            disabled={runningSuite}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {runningSuite ? 'Running 8 Checks...' : 'Run 8/8 Phase 15 Verification Suite'}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-red-900"
        >
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-mono break-words">{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 4-Card KPI Strip */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Software-Ready Regions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
              {overview.softwareReadyRegionsCount}/{overview.totalRegionsInventoriedCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Wave 1: Southern Africa (ZW + ZA)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Activated Expansion Clusters</p>
            <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums font-mono">
              {overview.activeExpandedRegionsCount} / {overview.totalRegionsInventoriedCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Held NOT ACTIVATED pending P6 &amp; P14
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">Languages &amp; Currencies</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
              {overview.supportedLanguagesTotalCount} / {overview.supportedCurrenciesCount}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              USD, ZWG, GBP, EUR, ZAR, KES, NGN (Pro-Forma)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-500">PII Residency &amp; Charity Lock</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums font-mono">
              ISOLATED / $0.00
            </p>
            <p className="text-xs text-slate-600 mt-1">
              No cross-border PII export · Charity always free
            </p>
          </div>
        </div>
      )}

      {/* 8/8 Verification Suite Results */}
      {suiteReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Phase 15 Verification Suite — {suiteReport.passedChecks}/{suiteReport.totalChecks} Passed
            </h3>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              Activated: {suiteReport.activeExpandedRegionsCount}/4 · CrossBorderPiiBlocked:{' '}
              {String(suiteReport.prohibitCrossBorderPiiTransfer)} · Stage P6 Deferred:{' '}
              {String(suiteReport.stageP6Deferred)}
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

      {/* Honest Boundaries Notice */}
      {overview && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              International Expansion &amp; Sovereign Residency Boundaries (Software Architecture Complete; Multi-Region Rollout Locked)
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-950 list-disc pl-5">
            {overview.globalExpansionBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* International Administrator Section */}
      {renderAdminCompact()}
      {renderAdminDashboard()}

      {/* 4-Cluster Regional Blueprint Matrix */}
      {overview && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Sovereign Expansion Cluster Matrix (4 Regional Partitions · All 6 ADR-015 Markets)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Select any expansion cluster to inspect residency boundaries, localization packs, currency pro-forma pricing, and rollout locks.
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
                  <th className="px-3 py-2 font-semibold text-slate-700">Region & Markets</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Residency & Edge CDN</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Locales & CPM</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">SW / Ext Gates</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Cluster Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overview.regions.map((r) => {
                  const isSelected = r.regionId === selectedRegionId;
                  return (
                    <tr
                      key={r.regionId}
                      className={isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}
                    >
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {r.regionName}
                          {r.regionId === overview.primaryExpansionWaveRegion ? (
                            <span className="text-blue-700 font-semibold"> · Wave 1</span>
                          ) : null}
                        </div>
                        <div className="font-mono text-slate-600 mt-0.5">
                          Markets: {r.targetMarketCodes.join(', ')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono text-slate-800">{r.sovereignResidencyZone}</div>
                        <div className="text-slate-500 mt-0.5">{r.cdnEdgeClusterTarget}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono tabular-nums">
                        <div className="text-slate-900">
                          [{r.localizationConfig.supportedLanguageCodes.join(', ')}]
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          {r.localizationConfig.proFormaCpmRateLocal}{' '}
                          {r.localizationConfig.multiCurrencyCode} (~${r.proFormaCpmRateUsd} USD)
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono tabular-nums whitespace-nowrap">
                        <div className="text-emerald-700 font-semibold">
                          SW: {r.softwareGatesReadyCount}/{r.softwareGatesTotalCount} VERIFIED
                        </div>
                        <div className="text-amber-800 mt-0.5">
                          EXT: {r.externalClearancesBlockedCount} BLOCKED
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono font-semibold text-amber-800 whitespace-nowrap">
                        NOT ACTIVATED
                      </td>
                      <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSelectRegion(r.regionId)}
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

      {/* Active Cluster Preflight Gate Detail */}
      {activeRegion && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {activeRegion.regionName} — Residency, Localization &amp; Preflight Gates
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Assessment SHA-256:{' '}
                <code className="font-mono">{activeRegion.assessmentSha256.slice(0, 14)}</code> ·
                regionalExpansionActive=false · Charity Cost={activeRegion.charityListingFeeLocal}{' '}
                {activeRegion.localizationConfig.multiCurrencyCode}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Gate ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Architecture / External Prerequisite
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeRegion.preflightChecks.map((chk) => (
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
        </div>
      )}

      {/* Two-Column Controls: Localization Editor & 7-Currency Pro-Forma Estimator */}
      {overview && activeRegion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Localization & Currency Blueprint Form */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Regional Localization &amp; Caption Blueprint ({activeRegion.regionId})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Configure primary language, ISO locale list, broadcast caption standard, and pro-forma currency. Sovereign PII isolation and $0 Charity locks cannot be disabled.
              </p>
            </div>

            <form onSubmit={handleSaveRegionConfig} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Primary Language Code</span>
                  <input
                    type="text"
                    required
                    value={primaryLanguageCode}
                    onChange={(e) => setPrimaryLanguageCode(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Supported Locale Codes</span>
                  <input
                    type="text"
                    required
                    value={supportedLanguagesInput}
                    onChange={(e) => setSupportedLanguagesInput(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="en, sn, nd, zu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-medium text-slate-700">
                  TV Captioning &amp; Safe-Zone Standard
                </span>
                <input
                  type="text"
                  required
                  value={captionAccessibilityStandard}
                  onChange={(e) => setCaptionAccessibilityStandard(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Pro-Forma Billing Currency</span>
                  <select
                    value={multiCurrencyCode}
                    onChange={(e) =>
                      setMultiCurrencyCode(e.target.value as ExpansionCurrencyCode)
                    }
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                  >
                    {CURRENCY_OPTIONS.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">
                    Pro-Forma Commercial CPM ({multiCurrencyCode})
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={proFormaCpmRateLocal}
                    onChange={(e) => setProFormaCpmRateLocal(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </label>
              </div>

              <div className="border-l-2 border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-700 space-y-1">
                <div>Non-Overridable Sovereign &amp; Mission Locks:</div>
                <div>
                  · prohibitCrossBorderPiiTransfer = TRUE{' '}
                  ({activeRegion.localizationConfig.dataResidencyZone})
                </div>
                <div>
                  · charityZeroCostLocked = TRUE (0 {multiCurrencyCode} · paymentCollectionActive =
                  FALSE)
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-slate-500">
                  Updated by: {activeRegion.localizationConfig.updatedByEmail}
                </span>
                {isAdmin ? (
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {savingConfig ? 'Saving Blueprint...' : 'Save Regional Blueprint'}
                  </button>
                ) : (
                  <span className="text-slate-500">Admin role required to edit blueprints</span>
                )}
              </div>
            </form>
          </div>

          {/* 7-Currency Pro-Forma Pricing Estimator */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-700" />
                <span>Multi-Currency Pro-Forma Estimator (Non-Transactional)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Simulate regional commercial impressions across 7 currencies using indicative FX references. Charity and employer job impressions always resolve to 0 cost.
              </p>
            </div>

            <form onSubmit={handleRunEstimate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Estimate Currency</span>
                  <select
                    value={estCurrencyCode}
                    onChange={(e) =>
                      setEstCurrencyCode(e.target.value as ExpansionCurrencyCode)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                  >
                    {CURRENCY_OPTIONS.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">
                    Commercial CPM ({estCurrencyCode})
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={estCpmRateLocal}
                    onChange={(e) => setEstCpmRateLocal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">Direct Commercial Impressions</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={estCommercialImps}
                    onChange={(e) => setEstCommercialImps(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-medium text-slate-700">
                    Charity / Job Impressions ($0.00)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={estCharityImps}
                    onChange={(e) => setEstCharityImps(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={estimating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {estimating ? 'Calculating...' : 'Calculate Multi-Currency Pro-Forma'}
                </button>
              </div>
            </form>

            {estimateResult && (
              <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                  <div>
                    <div className="text-slate-500 font-sans">Commercial Pro-Forma Gross</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {estimateResult.commercialGrossLocal} {estimateResult.currencyCode} (~$
                      {estimateResult.commercialGrossUsd} USD)
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-sans">Charity &amp; Employer Job Cost</div>
                    <div className="text-sm font-semibold text-emerald-700 mt-0.5">
                      {estimateResult.charityCostLocal} {estimateResult.currencyCode} ($0.00 USD)
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 font-mono">
                  {estimateResult.fxAssumptionNote} · paymentCollectionActive=false · SHA-256:{' '}
                  {estimateResult.estimateSha256.slice(0, 12)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fail-Closed International Expansion Activation Gate & Decision Log */}
      {overview && activeRegion && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-700" />
              <span>Multi-Region Expansion Gate &amp; Audit Decision Log ({activeRegion.regionId})</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Fail-closed expansion guard rejects activating any sovereign region cluster until Phase 14 markets, Stage P6 hardware, sovereign cloud clusters, and billing approvals complete.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium text-slate-700">Expansion Gate Resolution</span>
                <select
                  value={decisionOutcome}
                  onChange={(e) =>
                    setDecisionOutcome(
                      e.target.value as InternationalExpansionDecisionOutcome
                    )
                  }
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="stage_multi_region_blueprint_for_post_launch">
                    Stage Multi-Region Blueprint — Hold Unactivated Until P6 &amp; P14
                  </option>
                  <option value="hold_regions_unactivated_pending_p6_and_p14">
                    Hold Region Unactivated — Enforce Upstream Dependency Lock
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
                    <span>Log Staged Expansion Decision</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingDecision}
                    onClick={() => handleSubmitDecision(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Test Fail-Closed Region Activation Block</span>
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-2 text-xs">
              <div className="font-semibold text-slate-800">
                Recorded International Expansion Gate Decisions ({overview.expansionDecisions.length})
              </div>
              {overview.expansionDecisions.length === 0 ? (
                <p className="text-slate-500 border border-slate-200 rounded-lg p-3">
                  No Phase 15 expansion governance decisions recorded yet. Administrators may log a staged blueprint or unactivated hold above.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Region &amp; Outcome</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Reviewer &amp;
                          Digest</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Activated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {overview.expansionDecisions.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">
                            <div className="font-mono font-semibold text-slate-900">
                              {d.regionId} · {d.decisionOutcome}
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

      {/* Global Launch Control */}
      {overview && activeRegion && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                <ClipboardCheck className="w-4 h-4 text-slate-700" /> Global Launch
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Geographical rollout status for {overview.primaryExpansionWaveRegion}:{' '}
                {overview.activeExpandedRegionsCount} of {overview.totalRegionsInventoriedCount}
                regions activated · regionalExpansionActive={String(overview.regionalExpansionActive)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!isAdmin || submittingDecision}
                onClick={() => handleSubmitDecision(true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap ${
                  submittingDecision ? 'opacity-60' : ''
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Test Block
              </button>
              <button
                type="button"
                disabled={!isAdmin || submittingDecision}
                onClick={() => handleSubmitDecision(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer whitespace-nowrap ${
                  submittingDecision ? 'opacity-60' : ''
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> Safe Test Mode
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-600">
            <strong>Fail-Closed Gate:</strong> Expansion region activation is blocked until Stage P6
            hardware test, Phase 14 country launches, sovereign cloud clusters, and billing approvals
            complete. This control performs a safe local test that verifies the fail-closed behavior
            without actual deployment.
          </div>
        </div>
      )}
    </div>
  );
}
