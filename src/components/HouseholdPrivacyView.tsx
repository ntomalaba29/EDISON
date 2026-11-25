import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Tv,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { edisonFetch } from '../lib/csrfFetch';
import { QrCodePreview } from './QrCodePreview';
import { CopyReportFooter } from './CopyReportFooter';
import type {
  AdvertiserGeoAggregateRow,
  ConsentAuditEventRecord,
  CountryGeoConfig,
  HouseholdMemberProfile,
  HouseholdOpportunityMatchResult,
  HouseholdQrTokenRecord,
  OpportunityCategory,
  PrivacyComplianceOverview,
  PrivacyComplianceVerificationReport,
  PrivacyDsrErasureResult,
  PrivacyDsrExportPackage,
  PrivacyRetentionReport,
  PublicHouseholdInstallationView,
  PublicUser,
  TrackBVerificationReport,
  TvBreakPersonalisationDisplay,
} from '../types/edison';

interface HouseholdPrivacyViewProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

type HouseholdSubTab = 'geo' | 'profiles' | 'matches' | 'consent';

const OPPORTUNITY_CATEGORY_OPTIONS: { value: OpportunityCategory; label: string }[] = [
  { value: 'apprenticeship', label: 'Apprenticeship' },
  { value: 'permanent_employment', label: 'Permanent Employment' },
  { value: 'temporary_employment', label: 'Temporary Employment' },
  { value: 'part_time_employment', label: 'Part-Time Work' },
  { value: 'contract_employment', label: 'Contract Work' },
  { value: 'internship', label: 'Internship' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'education', label: 'Educational Programme' },
  { value: 'training', label: 'Training Programme' },
  { value: 'grant', label: 'Grant / Funding' },
  { value: 'tender', label: 'Tender' },
  { value: 'workshop_seminar', label: 'Workshop / Seminar' },
  { value: 'business_opportunity', label: 'Business Opportunity' },
];

export function HouseholdPrivacyView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: HouseholdPrivacyViewProps) {
  const [subTab, setSubTab] = useState<HouseholdSubTab>('geo');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [countries, setCountries] = useState<CountryGeoConfig[]>([]);
  const [households, setHouseholds] = useState<PublicHouseholdInstallationView[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>('');
  const [members, setMembers] = useState<HouseholdMemberProfile[]>([]);
  const [matchesData, setMatchesData] = useState<{
    household?: PublicHouseholdInstallationView;
    personalisationDisplay?: TvBreakPersonalisationDisplay;
    matches: HouseholdOpportunityMatchResult[];
  } | null>(null);
  const [qrTokens, setQrTokens] = useState<HouseholdQrTokenRecord[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentAuditEventRecord[]>([]);
  const [geoAggregates, setGeoAggregates] = useState<AdvertiserGeoAggregateRow[]>([]);
  const [suiteReport, setSuiteReport] = useState<TrackBVerificationReport | null>(null);
  const [runningSuite, setRunningSuite] = useState(false);

  // Phase 10 Block 10.1 Compliance, DSR & Retention state
  const [complianceOverview, setComplianceOverview] =
    useState<PrivacyComplianceOverview | null>(null);
  const [complianceSuiteReport, setComplianceSuiteReport] =
    useState<PrivacyComplianceVerificationReport | null>(null);
  const [runningComplianceSuite, setRunningComplianceSuite] = useState(false);
  const [dsrExportPkg, setDsrExportPkg] = useState<PrivacyDsrExportPackage | null>(null);
  const [dsrErasePhrase, setDsrErasePhrase] = useState('');
  const [dsrEraseReason, setDsrEraseReason] = useState(
    'Household requested full Right-to-Erasure anonymisation under statutory data-subject rights.'
  );
  const [lastDsrErasure, setLastDsrErasure] = useState<PrivacyDsrErasureResult | null>(null);
  const [lastRetentionReport, setLastRetentionReport] = useState<PrivacyRetentionReport | null>(null);
  const [runningRetentionSweep, setRunningRetentionSweep] = useState(false);

  // Advertiser privacy barrier probe result
  const [privacyProbeResult, setPrivacyProbeResult] = useState<{
    status: number;
    message: string;
  } | null>(null);

  // Register household form
  const [showRegisterHousehold, setShowRegisterHousehold] = useState(false);
  const [newHhLabel, setNewHhLabel] = useState('');
  const [newTvLabel, setNewTvLabel] = useState('Living Room Smart TV');
  const [locCountry, setLocCountry] = useState('ZW');
  const [locProvince, setLocProvince] = useState('Harare Metropolitan');
  const [locMetro, setLocMetro] = useState('Harare Metro');
  const [locCity, setLocCity] = useState('Harare');
  const [locDistrict, setLocDistrict] = useState('Harare Urban');
  const [locSuburb, setLocSuburb] = useState('Avondale');
  const [locExact, setLocExact] = useState('14 Samora Machel Ave, Harare (Private)');

  // Edit active household location form
  const [editCountry, setEditCountry] = useState('ZW');
  const [editProvince, setEditProvince] = useState('Harare Metropolitan');
  const [editMetro, setEditMetro] = useState('Harare Metro');
  const [editCity, setEditCity] = useState('Harare');
  const [editDistrict, setEditDistrict] = useState('Harare Urban');
  const [editSuburb, setEditSuburb] = useState('Avondale');
  const [editExact, setEditExact] = useState('Private household installation street address');

  // Member profile management
  const [memberPins, setMemberPins] = useState<Record<string, string>>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('');
  const [newMemberConsent, setNewMemberConsent] = useState(true);
  const [newMemberEdu, setNewMemberEdu] = useState('National Certificate / Polytechnic');
  const [newMemberQuals, setNewMemberQuals] = useState('Electrical Installation');
  const [newMemberSkills, setNewMemberSkills] = useState('Solar PV, Electrical Maintenance');
  const [newMemberExpSummary, setNewMemberExpSummary] = useState('2 years residential electrical trainee');
  const [newMemberExpYears, setNewMemberExpYears] = useState(2);
  const [newMemberTrade, setNewMemberTrade] = useState('Solar & Electrical Trainee');
  const [newMemberInterests, setNewMemberInterests] = useState('Solar technician, Fibre apprentice');
  const [newMemberAspirations, setNewMemberAspirations] = useState('Certified ZERA solar technician');
  const [newMemberIndustries, setNewMemberIndustries] = useState('Energy, Telecoms');
  const [newMemberCategory, setNewMemberCategory] = useState<OpportunityCategory>('apprenticeship');

  // Consent actions
  const [withdrawReason, setWithdrawReason] = useState(
    'Household requested full pause of commercial and charity advertising.'
  );
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoreReason, setRestoreReason] = useState(
    'Household explicitly opted back in to EDISON break delivery and opportunities.'
  );

  // Latest issued household QR live test
  const [latestIssuedToken, setLatestIssuedToken] = useState<string | null>(null);
  const [qrProbeOutcome, setQrProbeOutcome] = useState<{
    token: string;
    httpStatus: number;
    ok: boolean;
    detail: string;
  } | null>(null);

  const isViewerOrAdmin =
    currentUser?.role === 'household_viewer' || currentUser?.role === 'admin';

  const selectedHousehold = useMemo(
    () => households.find((h) => h.id === selectedHouseholdId) ?? households[0] ?? null,
    [households, selectedHouseholdId]
  );

  const activeCountryConfig = useMemo(
    () => countries.find((c) => c.countryCode === editCountry) ?? countries[0] ?? null,
    [countries, editCountry]
  );

  const loadHouseholdDetails = useCallback(
    async (householdId: string) => {
      if (!householdId || !isViewerOrAdmin) return;
      const [mRes, matchRes, qrRes, histRes] = await Promise.all([
        edisonFetch(`/api/households/${householdId}/members`),
        edisonFetch(`/api/households/${householdId}/matches`),
        edisonFetch(`/api/households/${householdId}/qr-tokens`),
        edisonFetch(`/api/households/${householdId}/consent-history`),
      ]);
      if (mRes.ok) {
        const md = await mRes.json();
        setMembers(md.items || []);
      }
      if (matchRes.ok) {
        const mtd = await matchRes.json();
        setMatchesData(mtd);
      }
      if (qrRes.ok) {
        const qd = await qrRes.json();
        const items = (qd.items || []) as HouseholdQrTokenRecord[];
        setQrTokens(items);
        if (items.length > 0 && !latestIssuedToken) {
          setLatestIssuedToken(items[0].token);
        }
      }
      if (histRes.ok) {
        const hd = await histRes.json();
        setConsentHistory(hd.items || []);
      }
    },
    [isViewerOrAdmin, latestIssuedToken]
  );

  const loadAll = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [cfgRes, aggRes, compRes] = await Promise.all([
        edisonFetch('/api/track-b/country-configs'),
        edisonFetch('/api/advertiser/targeting-aggregates'),
        edisonFetch('/api/compliance/overview'),
      ]);
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setCountries(cfgData.countries || []);
      }
      if (aggRes.ok) {
        const aggData = await aggRes.json();
        setGeoAggregates(aggData.items || []);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setComplianceOverview(compData.overview || null);
      }
      if (isViewerOrAdmin) {
        const hhRes = await edisonFetch('/api/households');
        if (hhRes.ok) {
          const hhData = await hhRes.json();
          const list = (hhData.items || []) as PublicHouseholdInstallationView[];
          setHouseholds(list);
          const targetId =
            list.find((h) => h.id === selectedHouseholdId)?.id ?? list[0]?.id ?? '';
          if (targetId) {
            setSelectedHouseholdId(targetId);
            const target = list.find((h) => h.id === targetId);
            if (target?.publicLocation) {
              setEditCountry(target.publicLocation.countryCode);
              setEditProvince(target.publicLocation.provinceOrRegion);
              setEditMetro(target.publicLocation.metroArea);
              setEditCity(target.publicLocation.cityOrTown);
              setEditDistrict(target.publicLocation.district);
            }
            await loadHouseholdDetails(targetId);
          }
        }
      } else {
        setHouseholds([]);
        setMembers([]);
        setMatchesData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, isViewerOrAdmin, selectedHouseholdId, loadHouseholdDetails]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSelectHousehold = async (id: string) => {
    setSelectedHouseholdId(id);
    const target = households.find((h) => h.id === id);
    if (target?.publicLocation) {
      setEditCountry(target.publicLocation.countryCode);
      setEditProvince(target.publicLocation.provinceOrRegion);
      setEditMetro(target.publicLocation.metroArea);
      setEditCity(target.publicLocation.cityOrTown);
      setEditDistrict(target.publicLocation.district);
    }
    setLatestIssuedToken(null);
    setQrProbeOutcome(null);
    await loadHouseholdDetails(id);
  };

  const applyProvinceDefaults = (countryCode: string, provinceName: string, isNewForm: boolean) => {
    const cfg = countries.find((c) => c.countryCode === countryCode);
    const prov = cfg?.provinces.find((p) => p.name === provinceName) ?? cfg?.provinces[0];
    if (!prov) return;
    const city = prov.cities[0];
    const dist = city?.districts[0];
    const sub = dist?.suburbs[0] ?? '';
    if (isNewForm) {
      setLocProvince(prov.name);
      setLocMetro(prov.metroArea ?? '');
      setLocCity(city?.name ?? '');
      setLocDistrict(dist?.name ?? '');
      setLocSuburb(sub);
    } else {
      setEditProvince(prov.name);
      setEditMetro(prov.metroArea ?? '');
      setEditCity(city?.name ?? '');
      setEditDistrict(dist?.name ?? '');
      setEditSuburb(sub);
    }
  };

  const handleRegisterHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await edisonFetch('/api/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        householdLabel: newHhLabel,
        tvDeviceLabel: newTvLabel,
        location: {
          countryCode: locCountry,
          provinceOrRegion: locProvince,
          metroArea: locMetro,
          cityOrTown: locCity,
          district: locDistrict,
          suburbOrArea: locSuburb,
          exactInstallationLocation: locExact,
        },
        commercialConsentGranted: true,
        neutralDisplayMode: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Unable to register household.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Registered household "${data.item.householdLabel}" (${data.item.publicLocation.targetingKey}).`,
    });
    setShowRegisterHousehold(false);
    setNewHhLabel('');
    setSelectedHouseholdId(data.item.id);
    await loadAll();
    await onSummaryRefresh();
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode: editCountry,
        provinceOrRegion: editProvince,
        metroArea: editMetro,
        cityOrTown: editCity,
        district: editDistrict,
        suburbOrArea: editSuburb,
        exactInstallationLocation: editExact,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Location update failed.' });
      return;
    }
    setFeedback({
      type: data.item.locationValid ? 'ok' : 'err',
      text: data.item.locationValid
        ? `Location updated (${data.item.publicLocation.targetingKey}). Targeting enabled.`
        : `Location invalid: targeting disabled safely while ordinary TV remains usable (${(data.item.locationValidationErrors || []).join('; ')}).`,
    });
    await loadAll();
  };

  const handleToggleNeutralDisplay = async () => {
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        neutralDisplayMode: !selectedHousehold.neutralDisplayMode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Failed to update display mode.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: data.item.neutralDisplayMode
        ? 'Shared household neutral TV display enabled (individual names hidden).'
        : 'Named TV personalisation enabled for consented matching members.',
    });
    await loadAll();
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;
    setFeedback(null);
    const splitCsv = (v: string) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: newMemberName,
        pinCode: newMemberPin.trim() ? newMemberPin.trim() : undefined,
        personalisationConsentGranted: newMemberConsent,
        educationLevel: newMemberEdu,
        qualifications: splitCsv(newMemberQuals),
        skills: splitCsv(newMemberSkills),
        experienceSummary: newMemberExpSummary,
        experienceYears: Number(newMemberExpYears) || 0,
        occupationOrTrade: newMemberTrade,
        employmentInterests: splitCsv(newMemberInterests),
        careerAspirations: newMemberAspirations,
        industries: splitCsv(newMemberIndustries),
        interestedCategories: [newMemberCategory],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Unable to create member profile.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Added profile "${data.item.displayName}" (${data.item.hasPinLock ? 'PIN-protected' : 'open household profile'}).`,
    });
    setNewMemberName('');
    setNewMemberPin('');
    await loadHouseholdDetails(selectedHousehold.id);
    await onSummaryRefresh();
  };

  const handleToggleMemberConsent = async (member: HouseholdMemberProfile) => {
    if (!selectedHousehold) return;
    setFeedback(null);
    const pin = memberPins[member.id]?.trim();
    const res = await edisonFetch(
      `/api/households/${selectedHousehold.id}/members/${member.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-profile-pin': pin } : {}),
        },
        body: JSON.stringify({
          personalisationConsentGranted: !member.personalisationConsentGranted,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: 'err',
        text: data.error || 'Profile update blocked (verify PIN if locked).',
      });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `${member.displayName} personalisation consent set to ${data.item.personalisationConsentGranted ? 'Granted' : 'Withdrawn'}.`,
    });
    await loadHouseholdDetails(selectedHousehold.id);
  };

  const handleDeleteMember = async (member: HouseholdMemberProfile) => {
    if (!selectedHousehold) return;
    setFeedback(null);
    const pin = memberPins[member.id]?.trim();
    const res = await edisonFetch(
      `/api/households/${selectedHousehold.id}/members/${member.id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-profile-pin': pin } : {}),
        },
        body: JSON.stringify(pin ? { pinVerification: pin } : {}),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: 'err',
        text: data.error || 'Cannot delete profile (PIN required if locked).',
      });
      return;
    }
    setFeedback({ type: 'ok', text: `Deleted household member "${member.displayName}".` });
    await loadHouseholdDetails(selectedHousehold.id);
    await onSummaryRefresh();
  };

  const handleIssueEpochQr = async (oppId: string, baseQrToken: string | null) => {
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/qr-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseQrToken: baseQrToken || 'edison-demo',
        opportunityId: oppId,
        ttlMinutes: 60,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: 'err',
        text: data.error || 'Cannot issue household QR while consent is withdrawn.',
      });
      return;
    }
    setLatestIssuedToken(data.item.token);
    setQrProbeOutcome(null);
    setFeedback({
      type: 'ok',
      text: `Issued epoch-bound QR /r/${data.item.token} (Epoch v${data.item.consentEpoch}).`,
    });
    await loadHouseholdDetails(selectedHousehold.id);
  };

  const handleProbeQrToken = async (token: string) => {
    try {
      const res = await fetch(`/r/${token}`, { redirect: 'manual' });
      const isRedirect = res.type === 'opaqueredirect' || res.status === 302 || res.status === 301;
      const status = res.type === 'opaqueredirect' ? 302 : res.status;
      setQrProbeOutcome({
        token,
        httpStatus: status,
        ok: isRedirect,
        detail: isRedirect
          ? `HTTP ${status} Redirect issued cleanly while consent epoch is active.`
          : `HTTP ${status} Rejected (${status === 403 ? 'Consent withdrawn / epoch revoked' : 'Unavailable'}).`,
      });
      if (selectedHousehold) {
        await loadHouseholdDetails(selectedHousehold.id);
      }
    } catch (err) {
      setQrProbeOutcome({
        token,
        httpStatus: 0,
        ok: false,
        detail: err instanceof Error ? err.message : 'Network error',
      });
    }
  };

  const handleWithdrawBundledConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/consent/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: withdrawReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Consent withdrawal failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Bundled withdrawal applied (Epoch v${data.household.consentEpoch}): commercial ads, charity ads, opportunities, and personalisation suspended; ${data.invalidatedQrCount} QR token(s) revoked to HTTP 403; Ordinary TV remains usable.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleRestoreExplicitConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/consent/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        explicitConfirmation: restoreConfirm,
        reason: restoreReason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Consent restoration failed.' });
      return;
    }
    setRestoreConfirm(false);
    setFeedback({
      type: 'ok',
      text: `Explicit consent restored (Epoch v${data.household.consentEpoch}). Previously revoked QR tokens remain permanently blocked with HTTP 403.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleProbeAdvertiserPrivacy = async () => {
    const res = await edisonFetch('/api/households');
    const data = await res.json();
    setPrivacyProbeResult({
      status: res.status,
      message: res.ok
        ? `Returned ${data.items?.length ?? 0} household(s) for authorised viewer/admin role.`
        : data.error || `Blocked with HTTP ${res.status}`,
    });
  };

  const handleRunTrackBSuite = async () => {
    setRunningSuite(true);
    try {
      const res = await edisonFetch('/api/track-b/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setSuiteReport(await res.json());
      }
    } finally {
      setRunningSuite(false);
    }
  };

  const handleRunComplianceSuite = async () => {
    setRunningComplianceSuite(true);
    try {
      const res = await edisonFetch('/api/compliance/verify-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setComplianceSuiteReport(data.report || null);
      }
    } finally {
      setRunningComplianceSuite(false);
    }
  };

  const handleDsrExport = async () => {
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/dsr-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'DSR export failed.' });
      return;
    }
    setDsrExportPkg(data.package);
    setFeedback({
      type: 'ok',
      text: `DSR Subject Access export ${data.package.exportId} generated (PIN hashes redacted; SHA-256 ${data.package.packageSha256.slice(0, 12)}...).`,
    });
    await loadHouseholdDetails(selectedHousehold.id);
    await onSummaryRefresh();
  };

  const handleDownloadDsrJson = () => {
    if (!dsrExportPkg) return;
    const blob = new Blob([JSON.stringify(dsrExportPkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edison-dsr-${dsrExportPkg.householdId}-${dsrExportPkg.exportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDsrErase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHousehold) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/households/${selectedHousehold.id}/dsr-erase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmationPhrase: dsrErasePhrase,
        reason: dsrEraseReason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'DSR erasure failed.' });
      return;
    }
    setLastDsrErasure(data.erasure);
    setDsrErasePhrase('');
    setFeedback({
      type: 'ok',
      text: `Household DSR Right-to-Erasure completed (${data.erasure.membersAnonymisedCount} profiles scrubbed, ${data.erasure.qrTokensRevokedCount} QRs revoked to HTTP 403, Epoch v${data.erasure.newEpoch}; ordinary TV preserved).`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleAdminRetentionSweep = async () => {
    setRunningRetentionSweep(true);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/admin/compliance/retention-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Triggered via EDISON Phase 10 Compliance Console' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Retention cleanup sweep failed.' });
        return;
      }
      setLastRetentionReport(data.report);
      setFeedback({
        type: 'ok',
        text: `Retention sweep ${data.report.sweepId} completed: ${data.report.expiredSessionsPurged} expired session(s) and ${data.report.staleExpiredQrTokensPurged} >30d expired QR token(s) purged.`,
      });
      await loadAll();
      await onSummaryRefresh();
    } finally {
      setRunningRetentionSweep(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <Users className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Access Track B Households, Profiles &amp; Consent Controls
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-lg mx-auto">
            {import.meta.env.DEV
              ? 'Sign in with a household viewer account (e.g. dev seed viewer@edison.demo), advertiser account, or admin account to manage 7-level geo registration, multi-member matching, bundled withdrawal, and HTTP 403 QR revocation.'
              : 'Sign in with a household viewer, advertiser, or administrator account to manage 7-level geo registration, multi-member matching, bundled withdrawal, and HTTP 403 QR revocation.'}
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

  const reportText = [
    'EDISON — TRACK B HOUSEHOLD, MULTI-PROFILE & CONSENT GOVERNANCE REPORT',
    `Actor: ${currentUser.email} (${currentUser.role})`,
    `DEC-OPEN-01 Policy: LOCKED — Scope B Full Model + Bundled Commercial/Charity Withdrawal`,
    `Reference targeting geography: Zimbabwe (ZW); ${countries.length} country targeting profiles are configured. This is not a product-release coverage statement.`,
    selectedHousehold
      ? `Active Household: ${selectedHousehold.householdLabel} (${selectedHousehold.id}) | Epoch v${selectedHousehold.consentEpoch} | Commercial: ${selectedHousehold.commercialConsentStatus} | Charity/Opportunities: ${selectedHousehold.charityAndOpportunityStatus} | Targeting Area: ${selectedHousehold.publicLocation?.targetingKey ?? 'N/A'}`
      : 'Active Household: Advertiser / Submitter aggregate-only view',
    `Suite Verification: ${suiteReport ? `${suiteReport.passedChecks}/${suiteReport.totalChecks} checks passed` : 'Click Verify Track B Suite to run'}`,
  ].join('\n');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Households, Multi-Member Profiles &amp; Consent Enforcement
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            DEC-OPEN-01 Locked: Scope B Full EDISON Model · Bundled Withdrawal suspends commercial, charity, personalisation &amp; epoch QRs while keeping ordinary TV usable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunTrackBSuite}
            disabled={runningSuite}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{runningSuite ? 'Verifying...' : 'Run Track B Suite (7/7)'}</span>
          </button>
          <button
            type="button"
            onClick={loadAll}
            aria-label="Refresh household workspace"
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

      {suiteReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Track B Automated Verification Suite ({suiteReport.passedChecks}/{suiteReport.totalChecks} Passed)
              </h3>
              <p className="text-xs text-slate-600">
                Reference targeting geography: {suiteReport.referenceTargetingCountryCode} · {suiteReport.decOpen01Status}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700">
              {suiteReport.allPassed ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'}
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {suiteReport.checks.map((chk) => (
              <div key={chk.checkId} className="py-2.5 flex items-start gap-2.5 text-xs">
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-slate-900">
                    <span className="font-mono text-slate-500 mr-1.5">{chk.checkId}</span>
                    {chk.label}
                  </p>
                  <p className="text-slate-600 mt-0.5">{chk.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Barrier & Aggregate Geo View for Advertisers / Opportunity Submitters */}
      {!isViewerOrAdmin && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Advertiser Coarse Geo Aggregates &amp; Privacy Isolation
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Signed in as <span className="font-mono">{currentUser.role}</span>. Exact household installation locations, member names, qualifications, and PINs are strictly redacted.
              </p>
            </div>
            <button
              type="button"
              onClick={handleProbeAdvertiserPrivacy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Probe GET /api/households (Expect 403)</span>
            </button>
          </div>

          {privacyProbeResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-900">
              HTTP {privacyProbeResult.status} · {privacyProbeResult.message}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Country</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Province / Region</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">City / Town</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Targeting Key</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Consented Households</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Private Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {geoAggregates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No consented active households available in regional aggregates yet.
                    </td>
                  </tr>
                ) : (
                  geoAggregates.map((row) => (
                    <tr key={row.targetingKey}>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">
                        {row.countryCode}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">{row.provinceOrRegion}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{row.cityOrTown}</td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-600">{row.targetingKey}</td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums text-right font-semibold text-slate-900">
                        {row.consentedEligibleHouseholdsCount}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-emerald-700 font-medium">
                        Redacted
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Viewer / Admin Full Household Management */}
      {isViewerOrAdmin && (
        <>
          {/* 4-Card Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Selected Household</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 truncate">
                {selectedHousehold?.householdLabel ?? 'None Registered'}
              </p>
              <p className="mt-1 text-xs font-mono text-slate-600 truncate">
                {selectedHousehold ? (selectedHousehold.publicLocation?.targetingKey ?? 'N/A') : 'Register below'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Consent Epoch &amp; Bundled Gate</p>
              <p className="mt-1.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
                Epoch v{selectedHousehold?.consentEpoch ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {selectedHousehold?.commercialConsentStatus === 'granted'
                  ? 'Commercial & Charity Active'
                  : 'Suspended (Withdrawn)'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Household Profiles</p>
              <p className="mt-1.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
                {members.length}
              </p>
              <p className="mt-1 text-xs text-slate-600 tabular-nums">
                {members.filter((m) => m.hasPinLock).length} PIN-locked ·{' '}
                {members.filter((m) => m.personalisationConsentGranted).length} consented
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Ordinary TV Functionality</p>
              <p className="mt-1.5 text-base font-semibold text-emerald-700">Usable Always</p>
              <p className="mt-1 text-xs text-slate-600">
                Preserved regardless of consent or location
              </p>
            </div>
          </div>

          {/* Household Selector + Sub-Tab Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-slate-700">Household:</label>
              <select
                value={selectedHousehold?.id ?? ''}
                onChange={(e) => handleSelectHousehold(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
              >
                {households.length === 0 ? (
                  <option value="">No household registered</option>
                ) : (
                  households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.householdLabel} ({h.publicLocation?.countryCode ?? 'ZW'} · Epoch v{h.consentEpoch})
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() => setShowRegisterHousehold((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Household</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'geo', label: 'Location & Geo' },
                  { id: 'profiles', label: 'Member Profiles' },
                  { id: 'matches', label: 'Matches & QR 403' },
                  { id: 'consent', label: 'Consent & Epochs' },
                ] as { id: HouseholdSubTab; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    subTab === t.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {showRegisterHousehold && (
            <form
              onSubmit={handleRegisterHousehold}
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
            >
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Register New Household &amp; Smart TV Installation
                </h3>
                <span className="text-xs text-slate-500">Initial Market: Zimbabwe (ZW)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Household Label</label>
                  <input
                    type="text"
                    required
                    value={newHhLabel}
                    onChange={(e) => setNewHhLabel(e.target.value)}
                    placeholder="e.g. Chiedza Household"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">TV Device Label</label>
                  <input
                    type="text"
                    required
                    value={newTvLabel}
                    onChange={(e) => setNewTvLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Country</label>
                  <select
                    value={locCountry}
                    onChange={(e) => {
                      const code = e.target.value;
                      setLocCountry(code);
                      const cfg = countries.find((c) => c.countryCode === code);
                      if (cfg?.provinces[0]) {
                        applyProvinceDefaults(code, cfg.provinces[0].name, true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {countries.map((c) => (
                      <option key={c.countryCode} value={c.countryCode}>
                        {c.countryName} ({c.countryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Province / Region</label>
                  <select
                    value={locProvince}
                    onChange={(e) => applyProvinceDefaults(locCountry, e.target.value, true)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {(countries.find((c) => c.countryCode === locCountry)?.provinces ?? []).map(
                      (p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Metro Area</label>
                  <input
                    type="text"
                    value={locMetro}
                    onChange={(e) => setLocMetro(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    required
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={locDistrict}
                    onChange={(e) => setLocDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Suburb / Area</label>
                  <input
                    type="text"
                    required
                    value={locSuburb}
                    onChange={(e) => setLocSuburb(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-medium text-slate-700 mb-1">
                  Exact Installation Location (Strictly Private — Never Shared With Advertisers)
                </label>
                <input
                  type="text"
                  required
                  value={locExact}
                  onChange={(e) => setLocExact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Save Household Registration
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterHousehold(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* SUB-TAB 1: GEOGRAPHIC HIERARCHY & LOCATION */}
          {subTab === 'geo' && selectedHousehold && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleUpdateLocation}
                className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      7-Level Geographic Hierarchy &amp; Location Update
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Validates Country -&gt; Province -&gt; Metro -&gt; City/Town -&gt; District -&gt; Suburb -&gt; Private Address. Invalid hierarchy disables targeted ads without affecting ordinary TV.
                    </p>
                  </div>
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Country</label>
                    <select
                      value={editCountry}
                      onChange={(e) => {
                        const code = e.target.value;
                        setEditCountry(code);
                        const cfg = countries.find((c) => c.countryCode === code);
                        if (cfg?.provinces[0]) {
                          applyProvinceDefaults(code, cfg.provinces[0].name, false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {countries.map((c) => (
                        <option key={c.countryCode} value={c.countryCode}>
                          {c.countryName} ({c.countryCode}) {c.isReferenceTargetingProfile ? '· Reference profile' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Province / Region</label>
                    <select
                      value={editProvince}
                      onChange={(e) => applyProvinceDefaults(editCountry, e.target.value, false)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {(activeCountryConfig?.provinces ?? []).map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Metro Area</label>
                    <input
                      type="text"
                      value={editMetro}
                      onChange={(e) => setEditMetro(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      required
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">District</label>
                    <input
                      type="text"
                      required
                      value={editDistrict}
                      onChange={(e) => setEditDistrict(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Suburb / Residential Area</label>
                    <input
                      type="text"
                      required
                      value={editSuburb}
                      onChange={(e) => setEditSuburb(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-medium text-slate-700 mb-1">
                    Exact Installation Location (Private)
                  </label>
                  <input
                    type="text"
                    required
                    value={editExact}
                    onChange={(e) => setEditExact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    Update Household Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCity('NonExistentTown')}
                    className="px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer"
                  >
                    Fill Invalid City (Test Safe Targeting Disable)
                  </button>
                </div>
              </form>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-200">
                  Location Privacy &amp; Advertiser Exposure Check
                </h3>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Hierarchy Valid</dt>
                    <dd
                      className={`font-semibold ${
                        selectedHousehold.locationValid ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {selectedHousehold.locationValid ? 'Valid' : 'Invalid (Targeting Disabled)'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Public Targeting Key</dt>
                    <dd className="font-mono text-slate-900">
                      {selectedHousehold.publicLocation?.targetingKey ?? 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Exact Address Exposed</dt>
                    <dd className="font-semibold text-emerald-700">Never (Redacted)</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Targeted Advertising</dt>
                    <dd className="font-mono text-slate-900">
                      {selectedHousehold.targetingDisabled ? 'DISABLED' : 'ENABLED'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Ordinary TV Playback</dt>
                    <dd className="font-semibold text-emerald-700">Usable Always</dd>
                  </div>
                </dl>

                {selectedHousehold.locationValidationErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                    {selectedHousehold.locationValidationErrors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-800 mb-2">
                    Campaign Targeting Geography Profiles ({countries.length} representative profiles)
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {countries.map((c) => (
                      <div key={c.countryCode} className="flex items-center justify-between">
                        <span>
                          {c.countryName} ({c.countryCode})
                          {c.isReferenceTargetingProfile ? ' · Reference profile' : ''}
                        </span>
                        <span className="font-mono text-slate-500">Targeting profile</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: INDIVIDUAL MEMBER PROFILES */}
          {subTab === 'profiles' && selectedHousehold && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Shared Household Neutral-Display Preference
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    When enabled, TV break prompts omit individual member names even when matches exist. Qualifications, CVs, and skills are NEVER shown on the television screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNeutralDisplay}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap ${
                    selectedHousehold.neutralDisplayMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {selectedHousehold.neutralDisplayMode
                    ? 'Neutral Shared Mode: ON'
                    : 'Neutral Shared Mode: OFF'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">
                      Household Members ({members.length})
                    </h3>
                    {import.meta.env.DEV && (
                      <span className="text-xs text-slate-500">Dev seed PIN for Tariro Moyo: 4321</span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-200">
                    {members.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-500">
                        No individual profiles added to this household yet.
                      </p>
                    ) : (
                      members.map((m) => (
                        <div key={m.id} className="py-4 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-semibold text-slate-900">
                                {m.displayName}
                              </span>
                              <span className="text-slate-400" aria-hidden="true">·</span>
                              <span className="text-slate-600">{m.occupationOrTrade}</span>
                              {m.hasPinLock && (
                                <>
                                  <span className="text-slate-400" aria-hidden="true">·</span>
                                  <span className="font-mono text-amber-800">PIN-Locked</span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {m.hasPinLock && (
                                <input
                                  type="password"
                                  value={memberPins[m.id] ?? ''}
                                  onChange={(e) =>
                                    setMemberPins((prev) => ({
                                      ...prev,
                                      [m.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="PIN"
                                  aria-label={`Profile PIN for ${m.displayName}`}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleMemberConsent(m)}
                                className={`px-2.5 py-1 rounded border font-medium cursor-pointer ${
                                  m.personalisationConsentGranted
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                {m.personalisationConsentGranted
                                  ? 'Personalisation: On'
                                  : 'Personalisation: Off'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(m)}
                                aria-label={`Delete ${m.displayName}`}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600">
                            <p>
                              <strong>Education:</strong> {m.educationLevel || '—'}
                            </p>
                            <p className="tabular-nums">
                              <strong>Experience:</strong> {m.experienceYears} yr(s) — {m.experienceSummary || '—'}
                            </p>
                            <p>
                              <strong>Qualifications:</strong> {m.qualifications.join(', ') || '—'}
                            </p>
                            <p>
                              <strong>Skills:</strong> {m.skills.join(', ') || '—'}
                            </p>
                            <p>
                              <strong>Interests / Industries:</strong>{' '}
                              {[...m.employmentInterests, ...m.industries].join(', ') || '—'}
                            </p>
                            <p>
                              <strong>Target Categories:</strong>{' '}
                              {m.interestedCategories.join(', ') || '—'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleCreateMember}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-3 text-xs"
                >
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">
                      Add Household Member Profile
                    </h3>
                    <p className="text-slate-600 mt-0.5">
                      Optional PIN protects individual profile edits from other household members.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        required
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="e.g. Rudo Moyo"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Optional PIN (4–8 digits)
                      </label>
                      <input
                        type="password"
                        value={newMemberPin}
                        onChange={(e) => setNewMemberPin(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Occupation / Trade</label>
                      <input
                        type="text"
                        value={newMemberTrade}
                        onChange={(e) => setNewMemberTrade(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={newMemberExpYears}
                        onChange={(e) => setNewMemberExpYears(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Education Level</label>
                    <input
                      type="text"
                      value={newMemberEdu}
                      onChange={(e) => setNewMemberEdu(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Qualifications (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newMemberQuals}
                      onChange={(e) => setNewMemberQuals(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newMemberSkills}
                      onChange={(e) => setNewMemberSkills(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Experience Summary
                    </label>
                    <input
                      type="text"
                      value={newMemberExpSummary}
                      onChange={(e) => setNewMemberExpSummary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Employment Interests
                      </label>
                      <input
                        type="text"
                        value={newMemberInterests}
                        onChange={(e) => setNewMemberInterests(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Industries</label>
                      <input
                        type="text"
                        value={newMemberIndustries}
                        onChange={(e) => setNewMemberIndustries(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Career Aspirations
                      </label>
                      <input
                        type="text"
                        value={newMemberAspirations}
                        onChange={(e) => setNewMemberAspirations(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Primary Opportunity Category
                      </label>
                      <select
                        value={newMemberCategory}
                        onChange={(e) => setNewMemberCategory(e.target.value as OpportunityCategory)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        {OPPORTUNITY_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberConsent}
                      onChange={(e) => setNewMemberConsent(e.target.checked)}
                    />
                    <span className="text-slate-700 font-medium">
                      Grant individual TV personalisation consent for this profile
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    Add Member Profile
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: OPPORTUNITY MATCHING, SAFE TV DISPLAY & EPOCH QR 403 */}
          {subTab === 'matches' && selectedHousehold && (
            <div className="space-y-6">
              {/* Simulated Safe TV Display Preview */}
              {(() => {
                const activeTvDisplay =
                  matchesData?.personalisationDisplay ?? matchesData?.matches?.[0]?.tvDisplay ?? null;
                if (!activeTvDisplay) return null;
                return (
                  <div className="bg-slate-950 text-white border border-slate-800 rounded-lg p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
                      <span>
                        SAFE TV PERSONALISATION OUTPUT · MODE: {activeTvDisplay.mode.toUpperCase()}
                      </span>
                      <span>
                        PRIVATE QUALIFICATIONS / SKILLS / ADDRESS EXPOSED: FALSE
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {activeTvDisplay.tvHeadline}
                    </p>
                    <p className="text-sm text-slate-300">
                      {activeTvDisplay.tvSubline}
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">
                      Verified Opportunity Matching (Required · Preferred · Optional Criteria)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Supports 0, 1, or multiple matching consented members. Matching does not guarantee acceptance.
                    </p>
                  </div>

                  {!matchesData || matchesData.matches.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                      {selectedHousehold.commercialConsentStatus === 'withdrawn'
                        ? 'Opportunity and charity delivery are suspended because household commercial advertising consent was withdrawn under DEC-OPEN-01.'
                        : 'No verified live opportunities matched yet.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {matchesData.matches.map((m) => (
                        <div key={m.opportunityId} className="py-4 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {m.opportunityTitle}
                              </p>
                              <p className="text-slate-500">
                                {m.providerName} · {m.locationLabel} · Closes {m.closingDate}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleIssueEpochQr(m.opportunityId, m.baseQrToken)}
                              className="px-3 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap"
                            >
                              Issue Epoch QR
                            </button>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                            <p className="font-medium text-slate-900">{m.tvDisplay.tvHeadline}</p>
                            <p className="text-slate-600">{m.tvDisplay.tvSubline}</p>
                          </div>

                          <p className="text-slate-700 tabular-nums">
                            Matched Members: <strong>{m.matchedCount}</strong>
                            <span className="text-slate-400 mx-1.5">·</span>
                            Excluded (Unconsented / Ineligible):{' '}
                            <strong>{m.excludedMembersCount}</strong>
                          </p>

                          {m.matchedMembers.length > 0 && (
                            <div className="space-y-1">
                              {m.matchedMembers.map((mm) => (
                                <p key={mm.memberId} className="text-slate-700 tabular-nums">
                                  <strong>{mm.displayName}</strong> ({mm.scorePct}% fit) — Required:{' '}
                                  {mm.requiredMet.join(', ') || 'none'} · Preferred:{' '}
                                  {mm.preferredMet.join(', ') || 'none'} · Optional:{' '}
                                  {mm.optionalMatched.join(', ') || 'none'}
                                </p>
                              ))}
                            </div>
                          )}

                          {m.excludedReasons.length > 0 && (
                            <p className="text-slate-500">
                              Excluded: {m.excludedReasons.join(' | ')}
                            </p>
                          )}

                          <p className="text-slate-500">{m.guaranteeDisclaimer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Epoch-Bound QR Scanner & Live 302 vs 403 Tester */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">
                      Epoch-Bound QR Revocation Tester (HTTP 403)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Withdrawing or restoring consent increments the epoch so all prior QR tokens return HTTP 403 immediately.
                    </p>
                  </div>

                  {latestIssuedToken ? (
                    <div className="flex flex-col items-center text-center space-y-3">
                      <QrCodePreview
                        value={`${window.location.origin}/r/${latestIssuedToken}`}
                        size={168}
                        label={`Epoch QR ${latestIssuedToken}`}
                      />
                      <p className="text-xs font-mono text-slate-700 break-all">
                        /r/{latestIssuedToken}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleProbeQrToken(latestIssuedToken)}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          Test /r/:token Status Now
                        </button>
                        <a
                          href={`/r/${latestIssuedToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      Click &quot;Issue Epoch QR&quot; on any matched opportunity to mint an epoch-bound QR token.
                    </p>
                  )}

                  {qrProbeOutcome && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono ${
                        qrProbeOutcome.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      /r/{qrProbeOutcome.token} -&gt; {qrProbeOutcome.detail}
                    </div>
                  )}

                  {qrTokens.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-slate-700">Token</th>
                            <th className="px-3 py-2 font-semibold text-slate-700">Epoch</th>
                            <th className="px-3 py-2 font-semibold text-slate-700">State</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 text-right">403s</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {qrTokens.map((qt) => (
                            <tr
                              key={qt.token}
                              onClick={() => setLatestIssuedToken(qt.token)}
                              className="cursor-pointer hover:bg-slate-50"
                            >
                              <td className="px-3 py-2 font-mono text-slate-900">{qt.token}</td>
                              <td className="px-3 py-2 font-mono tabular-nums text-slate-700">
                                v{qt.consentEpoch}
                              </td>
                              <td
                                className={`px-3 py-2 font-medium ${
                                  qt.revokedAt ? 'text-red-700' : 'text-emerald-700'
                                }`}
                              >
                                {qt.revokedAt ? 'Revoked' : 'Active'}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-right text-slate-700">
                                {qt.rejected403Count}
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

          {/* SUB-TAB 4: BUNDLED CONSENT WITHDRAWAL, RESTORATION & AUDIT TRAIL */}
          {subTab === 'consent' && selectedHousehold && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <form
                  onSubmit={handleWithdrawBundledConsent}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Bundled Consent Withdrawal (DEC-OPEN-01)
                      </h3>
                      <p className="text-slate-600 mt-0.5">
                        Withdrawing commercial advertising consent suspends commercial ads, charity ads, opportunities, and personalisation, and revokes prior QR codes to HTTP 403 while keeping ordinary TV usable.
                      </p>
                    </div>
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Withdrawal Reason (Audited)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={selectedHousehold.commercialConsentStatus === 'withdrawn'}
                    className="px-4 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    Withdraw Commercial Consent (Bundled)
                  </button>
                </form>

                <form
                  onSubmit={handleRestoreExplicitConsent}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Explicit Auditable Consent Restoration
                      </h3>
                      <p className="text-slate-600 mt-0.5">
                        Requires explicit owner confirmation. Restoring consent increments the epoch again so pre-withdrawal QR codes stay permanently revoked (HTTP 403).
                      </p>
                    </div>
                    <KeyRound className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Restoration Reason (Audited)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={restoreReason}
                      onChange={(e) => setRestoreReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restoreConfirm}
                      onChange={(e) => setRestoreConfirm(e.target.checked)}
                    />
                    <span className="text-slate-700 font-medium">
                      Household explicitly confirms opt-in restoration under a new consent epoch
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={
                      selectedHousehold.commercialConsentStatus === 'granted' || !restoreConfirm
                    }
                    className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    Restore Consent Explicitly
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Immutable Consent &amp; Epoch Audit Trail ({consentHistory.length})
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Ordinary TV Preserved On Every Transition</span>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold text-slate-700">Action</th>
                        <th className="px-3.5 py-2.5 font-semibold text-slate-700">Epoch Shift</th>
                        <th className="px-3.5 py-2.5 font-semibold text-slate-700">QRs Revoked</th>
                        <th className="px-3.5 py-2.5 font-semibold text-slate-700">Reason</th>
                        <th className="px-3.5 py-2.5 font-semibold text-slate-700">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {consentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
                            No consent audit transitions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        consentHistory.map((ev) => (
                          <tr key={ev.id}>
                            <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {ev.action}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              v{ev.previousEpoch} -&gt; v{ev.newEpoch}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono tabular-nums text-slate-700">
                              {ev.affectedQrTokensInvalidated}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700">{ev.reason}</td>
                            <td className="px-3.5 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                              {ev.createdAt}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phase 10 DSR Controls (Subject Access Export & Right-to-Erasure Cascade) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs">
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">
                      Data Subject Access Export (GDPR Art. 15 · ZW § 12:07)
                    </h3>
                    <p className="text-slate-600 mt-0.5">
                      Exports owned household metadata, member skills, QR tokens, and consent epochs as a SHA-256 checksummed package with secret <span className="font-mono">pinHash</span> fields permanently redacted.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDsrExport}
                      className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Generate DSR JSON Export
                    </button>
                    {dsrExportPkg && (
                      <button
                        type="button"
                        onClick={handleDownloadDsrJson}
                        className="px-3.5 py-2 font-semibold text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        Download JSON ({dsrExportPkg.exportId})
                      </button>
                    )}
                  </div>

                  {dsrExportPkg && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[11px] text-slate-700">
                      <div>
                        Export ID: <span className="font-semibold text-slate-900">{dsrExportPkg.exportId}</span> · PIN Hashes Redacted: <span className="text-emerald-700 font-semibold">true</span>
                      </div>
                      <div>
                        Members: {dsrExportPkg.members.length} · QR Tokens: {dsrExportPkg.householdQrTokens.length} · Consent Events: {dsrExportPkg.consentAuditEvents.length}
                      </div>
                      <div className="break-all text-slate-600">
                        SHA-256: {dsrExportPkg.packageSha256}
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleDsrErase}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs"
                >
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">
                      Right-to-Erasure DSR Anonymisation Cascade (GDPR Art. 17)
                    </h3>
                    <p className="text-slate-600 mt-0.5">
                      Irreversibly scrubs exact household address, member names/skills/PIN hashes, withdraws bundled consent, and revokes every <span className="font-mono">hqr_*</span> link to HTTP 403 while keeping ordinary TV usable.
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Type <span className="font-mono text-slate-900">ERASE HOUSEHOLD DATA</span> to confirm
                    </label>
                    <input
                      type="text"
                      required
                      value={dsrErasePhrase}
                      onChange={(e) => setDsrErasePhrase(e.target.value)}
                      placeholder="ERASE HOUSEHOLD DATA"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Statutory Erasure Audit Reason
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={dsrEraseReason}
                      onChange={(e) => setDsrEraseReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={dsrErasePhrase !== 'ERASE HOUSEHOLD DATA'}
                    className="px-4 py-2 font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    Execute DSR Household Anonymisation
                  </button>

                  {lastDsrErasure && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-mono text-emerald-900">
                      Erasure {lastDsrErasure.erasureId} · Profiles Scrubbed: {lastDsrErasure.membersAnonymisedCount} · QRs Revoked: {lastDsrErasure.qrTokensRevokedCount} · Epoch v{lastDsrErasure.previousEpoch} -&gt; v{lastDsrErasure.newEpoch} · Ordinary TV Preserved: true
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Phase 10 Block 10.1: Privacy Posture, Retention Automation & Jurisdiction References */}
      {complianceOverview && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Phase 10 · Block 10.1: Privacy Posture, Retention &amp; Jurisdiction References
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Public-source references are not legal advice; qualified review is required (ADR-019). External security review and compliance determinations remain outstanding.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunComplianceSuite}
                disabled={runningComplianceSuite}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {runningComplianceSuite ? 'Verifying...' : 'Run Phase 10 Compliance Suite (8/8)'}
                </span>
              </button>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={handleAdminRetentionSweep}
                  disabled={runningRetentionSweep}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {runningRetentionSweep ? 'Purging...' : 'Run Admin Retention Purge Sweep'}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-slate-500 font-medium">Analytics Zero-PII Check</p>
              <p className="mt-1 text-base font-semibold text-emerald-700">
                {complianceOverview.posture.analyticsZeroPiiVerified
                  ? '0 Leaks Detected'
                  : `${complianceOverview.posture.piiLeaksDetectedInAnalytics} Leak(s)`}
              </p>
              <p className="mt-0.5 text-slate-600">No raw emails or coordinates in telemetry</p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-slate-500 font-medium">Camera / Mic Tracking</p>
              <p className="mt-1 text-base font-semibold text-slate-900">Hard Disabled</p>
              <p className="mt-0.5 text-slate-600">Section 14 zero-biometric invariant</p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-slate-500 font-medium">Retention Queue ({currentUser.role === 'admin' ? 'Fleet' : 'Tenant Scoped'})</p>
              <p className="mt-1 text-base font-semibold font-mono tabular-nums text-slate-900">
                {complianceOverview.posture.expiredSessionsPendingPurge} sess ·{' '}
                {complianceOverview.posture.staleExpiredQrTokensPendingPurge} QR
              </p>
              <p className="mt-0.5 text-slate-600">2h session idle · 30d expired QR window</p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-slate-500 font-medium">Jurisdiction Review Status</p>
              <p className="mt-1 text-base font-semibold text-amber-800">Not assessed</p>
              <p className="mt-0.5 text-slate-600">No compliance determination; qualified review remains outstanding.</p>
            </div>
          </div>

          {lastRetentionReport && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
              Sweep {lastRetentionReport.sweepId} · Expired Sessions Purged: {lastRetentionReport.expiredSessionsPurged} · &gt;30d Stale QRs Purged: {lastRetentionReport.staleExpiredQrTokensPurged} · PII Leaks: {lastRetentionReport.piiLeaksDetectedInAnalytics}
            </div>
          )}

          {complianceSuiteReport && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-900">
                  Phase 10 Compliance Verification ({complianceSuiteReport.passedChecks}/{complianceSuiteReport.totalChecks} Passed)
                </span>
                <span className="font-mono font-semibold text-emerald-700">
                  {complianceSuiteReport.allPassed ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'}
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {complianceSuiteReport.checks.map((chk) => (
                  <div key={chk.checkId} className="py-2 flex items-start gap-2 text-xs">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{chk.label}</p>
                      <p className="text-slate-600">{chk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Territory</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Researched Public Statutes</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700">Unresolved Regulatory Uncertainty</th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {complianceOverview.countries.map((c) => (
                  <tr key={c.countryCode} className="align-top">
                    <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                      <span className="font-mono font-semibold mr-1.5">{c.countryCode}</span>
                      <span>{c.countryName}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700">
                      {c.statutesResearched.join(' · ')}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      {c.unresolvedRegulatoryUncertainties.join(' · ')}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-amber-800 whitespace-nowrap">
                      Not reviewed · no compliance determination
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CopyReportFooter
        reportText={reportText}
        reportTitle="Track B Household & Consent Status"
      />
    </div>
  );
}
