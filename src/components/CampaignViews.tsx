import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  LifeBuoy,
  MonitorPlay,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  AccountVerificationStatus,
  AdvertiserEntityType,
  AdvertiserProfile,
  CampaignContentCategory,
  CampaignRecord,
  CampaignStatus,
  DaypartSlot,
  PublicUser,
  QrLinkRecord,
  SupportTicketCategory,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

const STATUS_TABS: { id: CampaignStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'expired', label: 'Expired' },
];

const DAYPART_OPTIONS: { id: DaypartSlot; label: string }[] = [
  { id: 'morning', label: 'Morning (06–11)' },
  { id: 'daytime', label: 'Daytime (11–17)' },
  { id: 'primetime', label: 'Primetime (17–23)' },
  { id: 'late_night', label: 'Late Night (23–06)' },
  { id: 'all_day', label: 'All Day' },
];

const STATUS_TEXT_COLOR: Record<CampaignStatus, string> = {
  draft: 'text-slate-600',
  submitted: 'text-blue-700',
  under_review: 'text-amber-700',
  approved: 'text-emerald-700',
  rejected: 'text-red-700',
  scheduled: 'text-blue-800',
  active: 'text-emerald-700 font-semibold',
  paused: 'text-amber-700',
  completed: 'text-slate-700',
  expired: 'text-slate-500',
};

function defaultDateRange(): { start: string; end: string } {
  const today = new Date();
  const nextMonth = new Date(today.getTime() + 14 * 86400 * 1000);
  return {
    start: today.toISOString().slice(0, 10),
    end: nextMonth.toISOString().slice(0, 10),
  };
}

function estimatePreviewTotal(
  contentCategory: CampaignContentCategory,
  durationSeconds: number,
  dailyFrequencyCap: number,
  startDate: string,
  endDate: string,
  regionsText: string,
  dayparts: DaypartSlot[]
): { spots: number; rate: number; total: number; isCharityFree: boolean } {
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  const days =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.max(1, Math.round((endMs - startMs) / 86400000) + 1)
      : 7;
  const regions = regionsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const regionCount = Math.max(1, regions.length);
  const spots = days * Math.max(1, dailyFrequencyCap) * regionCount;
  if (contentCategory === 'opportunity_promotion') {
    return { spots, rate: 0, total: 0, isCharityFree: true };
  }
  const durationMultiplier = Math.max(0.5, durationSeconds / 15);
  const primetimeMultiplier =
    dayparts.includes('primetime') || dayparts.includes('all_day') ? 1.35 : 1.0;
  const rate = Number((4.5 * durationMultiplier * primetimeMultiplier).toFixed(2));
  return { spots, rate, total: Number((spots * rate).toFixed(2)), isCharityFree: false };
}

interface ProfileProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

export function AdvertiserProfileView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: ProfileProps) {
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [adminProfiles, setAdminProfiles] = useState<AdvertiserProfile[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [entityType, setEntityType] = useState<AdvertiserEntityType>('registered_business');
  const [businessOrTradingName, setBusinessOrTradingName] = useState('');
  const [registrationOrTaxId, setRegistrationOrTaxId] = useState('');
  const [industryCategory, setIndustryCategory] = useState('');
  const [countryCode, setCountryCode] = useState('GB');
  const [cityRegion, setCityRegion] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [billingContactName, setBillingContactName] = useState('');
  const [billingContactEmail, setBillingContactEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [requestVerification, setRequestVerification] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Admin verification update state
  const [verifyUserId, setVerifyUserId] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<AccountVerificationStatus>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyFeedback, setVerifyFeedback] = useState<string>('');

  // Support ticket form
  const [ticketCategory, setTicketCategory] = useState<SupportTicketCategory>('campaign_review');
  const [ticketCampaignId, setTicketCampaignId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketFeedback, setTicketFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setTickets([]);
      setAdminProfiles([]);
      return;
    }
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        edisonFetch('/api/advertiser/profile'),
        edisonFetch('/api/support-tickets'),
        edisonFetch('/api/campaigns'),
      ];
      if (currentUser.role === 'admin') {
        requests.push(edisonFetch('/api/admin/advertiser-profiles'));
      }
      const [profRes, tktRes, cmpRes, admRes] = await Promise.all(requests);
      if (profRes.ok) {
        const pData = await profRes.json();
        const p = pData.profile as AdvertiserProfile;
        setProfile(p);
        setEntityType(p.entityType);
        setBusinessOrTradingName(p.businessOrTradingName);
        setRegistrationOrTaxId(p.registrationOrTaxId);
        setIndustryCategory(p.industryCategory);
        setCountryCode(p.countryCode);
        setCityRegion(p.cityRegion);
        setPhysicalAddress(p.physicalAddress);
        setPrimaryContactName(p.primaryContactName);
        setPrimaryContactEmail(p.primaryContactEmail);
        setPrimaryContactPhone(p.primaryContactPhone);
        setBillingContactName(p.billingContactName);
        setBillingContactEmail(p.billingContactEmail);
        setWebsiteUrl(p.websiteUrl);
      }
      if (tktRes.ok) {
        const tData = await tktRes.json();
        setTickets(tData.items);
      }
      if (cmpRes.ok) {
        const cData = await cmpRes.json();
        setCampaigns(cData.items);
      }
      if (admRes && admRes.ok) {
        const aData = await admRes.json();
        setAdminProfiles(aData.items);
        if (aData.items.length > 0 && !verifyUserId) {
          setVerifyUserId(aData.items[0].userId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, verifyUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveFeedback(null);
    try {
      const res = await edisonFetch('/api/advertiser/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          businessOrTradingName,
          registrationOrTaxId,
          industryCategory,
          countryCode,
          cityRegion,
          physicalAddress,
          primaryContactName,
          primaryContactEmail,
          primaryContactPhone,
          billingContactName,
          billingContactEmail,
          websiteUrl,
          requestVerification,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveFeedback({ type: 'err', text: data.error || 'Failed to save advertiser profile.' });
      } else {
        setProfile(data.profile);
        setRequestVerification(false);
        setSaveFeedback({
          type: 'ok',
          text: requestVerification
            ? 'Advertiser profile saved and queued for verification review.'
            : 'Advertiser profile updated in atomic persistence.',
        });
        await loadData();
        await onSummaryRefresh();
      }
    } catch (err) {
      setSaveFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Network error.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyFeedback('');
    const res = await edisonFetch(`/api/admin/advertiser-profiles/${verifyUserId}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: verifyStatus, notes: verifyNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setVerifyFeedback(data.error || 'Verification update failed.');
    } else {
      setVerifyFeedback(`Updated ${data.profile.businessOrTradingName} -> ${data.profile.verificationStatus}`);
      setVerifyNotes('');
      await loadData();
      await onSummaryRefresh();
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketFeedback(null);
    const res = await edisonFetch('/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: ticketCategory,
        campaignId: ticketCampaignId || null,
        subject: ticketSubject,
        message: ticketMessage,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTicketFeedback({ type: 'err', text: data.error || 'Failed to submit ticket.' });
    } else {
      setTicketSubject('');
      setTicketMessage('');
      setTicketFeedback({ type: 'ok', text: `Support ticket ${data.item.id} opened.` });
      await loadData();
      await onSummaryRefresh();
    }
  };

  const handleTicketStatus = async (ticketId: string, status: SupportTicketStatus) => {
    const adminResponse =
      currentUser?.role === 'admin' && status === 'resolved'
        ? 'Resolved by EDISON Moderation Operations.'
        : undefined;
    const res = await edisonFetch(`/api/support-tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminResponse }),
    });
    if (res.ok) {
      await loadData();
      await onSummaryRefresh();
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Manage Your Advertiser Profile
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Advertiser profiles, verification submission, and support tickets require an authenticated session. Use a prototype seed account or register a new account.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Go to Auth & RBAC Console
        </button>
      </div>
    );
  }

  const reportText = [
    'EDISON — BLOCK 2.2 ADVERTISER PROFILE & SUPPORT REPORT',
    `Account: ${currentUser.email} (${currentUser.role})`,
    `Business / Trading Name: ${profile?.businessOrTradingName ?? 'Unset'}`,
    `Entity Type: ${profile?.entityType ?? '—'}`,
    `Verification Status: ${profile?.verificationStatus ?? currentUser.verificationStatus}`,
    `Country / Region: ${profile?.countryCode ?? '—'} · ${profile?.cityRegion || 'Unspecified'}`,
    `Support Tickets Accessible: ${tickets.length}`,
    `Admin Profiles Queue Size: ${currentUser.role === 'admin' ? adminProfiles.length : 'N/A (Non-Admin)'}`,
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Organisation / Trader</p>
          <p className="mt-1.5 text-base font-semibold text-slate-900 truncate">
            {profile?.businessOrTradingName || currentUser.organisationName}
          </p>
          <p className="mt-1 text-xs text-slate-600">{profile?.entityType ?? '—'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Verification Status</p>
          <p
            className={`mt-1.5 text-base font-semibold ${
              profile?.verificationStatus === 'verified'
                ? 'text-emerald-700'
                : profile?.verificationStatus === 'pending_review'
                ? 'text-amber-700'
                : profile?.verificationStatus === 'suspended'
                ? 'text-red-700'
                : 'text-slate-800'
            }`}
          >
            {profile?.verificationStatus ?? currentUser.verificationStatus}
          </p>
          <p className="mt-1 text-xs text-slate-600">Independent of payment</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Jurisdiction</p>
          <p className="mt-1.5 text-base font-semibold text-slate-900 font-mono">
            {profile?.countryCode || 'GB'}
          </p>
          <p className="mt-1 text-xs text-slate-600 truncate">
            {profile?.cityRegion || 'Regional location unset'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Support Tickets</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {tickets.length}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {tickets.filter((t) => t.status === 'open' || t.status === 'in_review').length} open / active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Advertiser & Entity Profile
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Supports registered businesses, public/NGO organisations, and informal/individual advertisers.
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              aria-label="Refresh profile data"
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Entity Classification
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as AdvertiserEntityType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="registered_business">Registered Business</option>
                  <option value="individual_sole_trader">Individual / Sole Trader (Informal)</option>
                  <option value="public_ngo">Public Sector / NGO / Educational</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business or Trading Name
                </label>
                <input
                  type="text"
                  required
                  value={businessOrTradingName}
                  onChange={(e) => setBusinessOrTradingName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Registration / Tax ID (Optional for Individuals)
                </label>
                <input
                  type="text"
                  value={registrationOrTaxId}
                  onChange={(e) => setRegistrationOrTaxId(e.target.value)}
                  placeholder="Optional for sole traders"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Industry Category
                </label>
                <input
                  type="text"
                  value={industryCategory}
                  onChange={(e) => setIndustryCategory(e.target.value)}
                  placeholder="e.g. Retail, Education, Trades"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Country Code
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City / Operating Region
                </label>
                <input
                  type="text"
                  value={cityRegion}
                  onChange={(e) => setCityRegion(e.target.value)}
                  placeholder="e.g. London / South East"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Physical Correspondence Address
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder="Street, City, Postal Code"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={primaryContactName}
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Phone (E.164)
                </label>
                <input
                  type="text"
                  value={primaryContactPhone}
                  onChange={(e) => setPrimaryContactPhone(e.target.value)}
                  placeholder="+44..."
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Billing Contact Name
                </label>
                <input
                  type="text"
                  value={billingContactName}
                  onChange={(e) => setBillingContactName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingContactEmail}
                  onChange={(e) => setBillingContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Official Website (HTTPS)
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {profile?.verificationStatus === 'unverified' && (
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestVerification}
                  onChange={(e) => setRequestVerification(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Submit this profile to the administrator verification queue (moves status from{' '}
                  <span className="font-mono">unverified</span> to{' '}
                  <span className="font-mono">pending_review</span>).
                </span>
              </label>
            )}

            {profile?.verificationNotes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Reviewer Note: </span>
                {profile.verificationNotes}
              </div>
            )}

            {saveFeedback && (
              <div
                role="status"
                className={`p-3 rounded-lg border text-xs ${
                  saveFeedback.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {saveFeedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? 'Saving...' : 'Save Advertiser Profile'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex items-center gap-2.5">
            <LifeBuoy className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Advertiser Support & Disputes
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Submit verification enquiries, QR checks, or campaign review appeals.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as SupportTicketCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="campaign_review">Campaign Review</option>
                  <option value="verification_enquiry">Verification Enquiry</option>
                  <option value="qr_technical">QR Technical Check</option>
                  <option value="billing_dispute">Rate-Card / Billing Question</option>
                  <option value="policy_appeal">Policy Appeal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Related Campaign (Optional)
                </label>
                <select
                  value={ticketCampaignId}
                  onChange={(e) => setTicketCampaignId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">General Account Ticket</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                minLength={4}
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Brief summary of request"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Details</label>
              <textarea
                required
                minLength={8}
                rows={3}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Provide campaign ID, QR token, or verification details..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            {ticketFeedback && (
              <p
                className={`text-xs ${
                  ticketFeedback.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {ticketFeedback.text}
              </p>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Submit Support Ticket
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 space-y-2.5 max-h-72 overflow-y-auto">
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No support tickets logged yet.
              </p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">{t.subject}</span>
                    <span className="font-mono text-slate-600 shrink-0">{t.status}</span>
                  </div>
                  <p className="text-slate-600">{t.message}</p>
                  {t.adminResponse && (
                    <p className="text-emerald-800 font-medium">Admin: {t.adminResponse}</p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="font-mono">
                      {t.category} · {t.id}
                    </span>
                    <div className="space-x-2">
                      {currentUser.role === 'admin' && t.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => handleTicketStatus(t.id, 'resolved')}
                          className="text-emerald-700 hover:underline font-medium cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                      {t.status !== 'closed' && (
                        <button
                          type="button"
                          onClick={() => handleTicketStatus(t.id, 'closed')}
                          className="text-slate-700 hover:underline font-medium cursor-pointer"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {currentUser.role === 'admin' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Administrator Profile Verification Control
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Update advertiser entity verification status with a mandatory logged reason.
            </p>
          </div>

          <form onSubmit={handleAdminVerify} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Advertiser Account
              </label>
              <select
                value={verifyUserId}
                onChange={(e) => setVerifyUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {adminProfiles.map((ap) => (
                  <option key={ap.userId} value={ap.userId}>
                    {ap.businessOrTradingName} ({ap.verificationStatus})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">New Status</label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value as AccountVerificationStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="verified">verified</option>
                <option value="pending_review">pending_review</option>
                <option value="unverified">unverified</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mandatory Audit Note
              </label>
              <input
                type="text"
                required
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Reason for verification decision"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Apply Decision
              </button>
            </div>
          </form>

          {verifyFeedback && <p className="text-xs font-mono text-slate-700">{verifyFeedback}</p>}
        </div>
      )}

      <CopyReportFooter reportText={reportText} reportTitle="Block 2.2 Advertiser Profile Report" />
    </div>
  );
}

interface CampaignsProps {
  currentUser: PublicUser | null;
  onOpenPreviewGate?: (campaignId: string) => void;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

export function CampaignsView({
  currentUser,
  onOpenPreviewGate,
  onNavigateAuth,
  onSummaryRefresh,
}: CampaignsProps) {
  const defaults = useMemo(() => defaultDateRange(), []);

  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create / Edit modal state (inline panel)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [contentCategory, setContentCategory] =
    useState<CampaignContentCategory>('commercial_advertising');
  const [summaryText, setSummaryText] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [dailyFrequencyCap, setDailyFrequencyCap] = useState(4);
  const [targetRegionsText, setTargetRegionsText] = useState('United Kingdom · National');
  const [dayparts, setDayparts] = useState<DaypartSlot[]>(['primetime', 'daytime']);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  // Admin rejection panel
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [fixInstructions, setFixInstructions] = useState('');

  const loadAll = useCallback(async () => {
    if (!currentUser) {
      setCampaigns([]);
      setQrLinks([]);
      return;
    }
    setLoading(true);
    try {
      const [cmpRes, qrRes] = await Promise.all([edisonFetch('/api/campaigns'), edisonFetch('/api/qr')]);
      if (cmpRes.ok) {
        const data = await cmpRes.json();
        setCampaigns(data.items);
      }
      if (qrRes.ok) {
        const qData = await qrRes.json();
        setQrLinks(qData.items);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openNewEditor = () => {
    setEditingId(null);
    setTitle('');
    setContentCategory(
      currentUser?.role === 'opportunity_submitter'
        ? 'opportunity_promotion'
        : 'commercial_advertising'
    );
    setSummaryText('');
    const firstActiveQr = qrLinks.find((q) => q.status === 'active')?.token || '';
    setQrToken(firstActiveQr);
    setDurationSeconds(30);
    setDailyFrequencyCap(4);
    setTargetRegionsText('United Kingdom · National');
    setDayparts(['primetime', 'daytime']);
    setStartDate(defaults.start);
    setEndDate(defaults.end);
    setActionError('');
    setEditorOpen(true);
  };

  const openEditEditor = (c: CampaignRecord) => {
    setEditingId(c.id);
    setTitle(c.title);
    setContentCategory(c.contentCategory);
    setSummaryText(c.summary);
    setQrToken(c.qrToken || '');
    setDurationSeconds(c.durationSeconds);
    setDailyFrequencyCap(c.dailyFrequencyCap);
    setTargetRegionsText(c.targetRegions.join(', '));
    setDayparts(c.dayparts);
    setStartDate(c.startDate);
    setEndDate(c.endDate);
    setActionError('');
    setEditorOpen(true);
  };

  const toggleDaypart = (slot: DaypartSlot) => {
    setDayparts((prev) =>
      prev.includes(slot)
        ? prev.length > 1
          ? prev.filter((s) => s !== slot)
          : prev
        : [...prev, slot]
    );
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    const payload = {
      title,
      contentCategory,
      summary: summaryText,
      qrToken: qrToken || null,
      durationSeconds,
      dailyFrequencyCap,
      targetRegions: targetRegionsText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      dayparts,
      startDate,
      endDate,
    };

    const url = editingId ? `/api/campaigns/${editingId}` : '/api/campaigns';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await edisonFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Unable to save campaign.');
      return;
    }

    setEditorOpen(false);
    setActionSuccess(
      editingId
        ? `Updated campaign "${data.item.title}".`
        : `Created draft campaign "${data.item.title}".`
    );
    await loadAll();
    await onSummaryRefresh();
  };

  const handleClone = async (id: string) => {
    setActionError('');
    setActionSuccess('');
    const res = await edisonFetch(`/api/campaigns/${id}/clone`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Clone failed.');
      return;
    }
    setActionSuccess(`Cloned campaign to draft "${data.item.title}".`);
    await loadAll();
    await onSummaryRefresh();
  };

  const handleDelete = async (id: string) => {
    setActionError('');
    setActionSuccess('');
    const res = await edisonFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Delete failed.');
      return;
    }
    setActionSuccess(`Deleted campaign ${id}.`);
    await loadAll();
    await onSummaryRefresh();
  };

  const handleTransition = async (
    id: string,
    targetStatus: CampaignStatus,
    extra?: { rejectionReason?: string; fixInstructions?: string }
  ) => {
    setActionError('');
    setActionSuccess('');
    const res = await edisonFetch(`/api/campaigns/${id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus,
        rejectionReason: extra?.rejectionReason,
        fixInstructions: extra?.fixInstructions,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || `Cannot move to ${targetStatus}.`);
      return;
    }
    setRejectingId(null);
    setRejectionReason('');
    setFixInstructions('');
    setActionSuccess(`Campaign "${data.item.title}" moved to status "${data.item.status}".`);
    await loadAll();
    await onSummaryRefresh();
  };

  const liveEstimate = useMemo(
    () =>
      estimatePreviewTotal(
        contentCategory,
        durationSeconds,
        dailyFrequencyCap,
        startDate,
        endDate,
        targetRegionsText,
        dayparts
      ),
    [contentCategory, durationSeconds, dailyFrequencyCap, startDate, endDate, targetRegionsText, dayparts]
  );

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesQ =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        (c.qrToken && c.qrToken.toLowerCase().includes(q));
      return matchesStatus && matchesQ;
    });
  }, [campaigns, statusFilter, searchQuery]);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Manage Campaigns
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Create, clone, schedule, pause, and submit commercial or opportunity campaigns using an authenticated prototype session.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Go to Auth & RBAC Console
        </button>
      </div>
    );
  }

  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const reviewQueueCount = campaigns.filter(
    (c) => c.status === 'submitted' || c.status === 'under_review'
  ).length;
  const totalSimulatedUsd = campaigns.reduce(
    (sum, c) => sum + c.simulatedEstimate.estimatedTotalUsd,
    0
  );

  const reportText = [
    'EDISON — BLOCK 2.2 CAMPAIGN MANAGEMENT & 10-STATE LIFECYCLE REPORT',
    `Signed-in User: ${currentUser.email} (${currentUser.role})`,
    `Accessible Campaigns: ${campaigns.length}`,
    `Active: ${activeCount} | Moderation Queue (submitted/under_review): ${reviewQueueCount}`,
    `Campaign States Supported: ${STATUS_TABS.filter((s) => s.id !== 'all')
      .map((s) => s.id)
      .join(', ')}`,
    `Simulated Rate-Card Total Across Listed Campaigns: $${totalSimulatedUsd.toFixed(2)} USD [SIMULATED ESTIMATE — NO REAL PAYMENT COLLECTION]`,
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-700 leading-relaxed">
        <strong className="text-slate-900">Billing & Moderation Separation Notice:</strong>{' '}
        All campaign rate-card calculations shown below are{' '}
        <span className="font-mono font-semibold">SIMULATED PROTOTYPE ESTIMATES</span> with zero real card processing or invoice issuance. In accordance with EDISON governance, campaign payments never influence verification decisions.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Accessible Campaigns</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {campaigns.length}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {currentUser.role === 'admin' ? 'All advertiser accounts' : 'Scoped to your account'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Active Broadcast Window</p>
          <p className="mt-1.5 text-lg font-semibold text-emerald-700 tabular-nums">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-slate-600">Approved & live in prototype</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Review Queue</p>
          <p className="mt-1.5 text-lg font-semibold text-amber-700 tabular-nums">
            {reviewQueueCount}
          </p>
          <p className="mt-1 text-xs text-slate-600">Submitted or under review</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Simulated Rate-Card Total</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            ${totalSimulatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-600">Simulated estimate · No real charge</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Campaign Registry & 10-State Lifecycle
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Enforces server-side state transitions, QR attachment checks before submission, and RBAC review controls.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAll}
              aria-label="Refresh campaigns"
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={openNewEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {(actionError || actionSuccess) && (
          <div
            role="status"
            className={`p-3 rounded-lg border text-xs ${
              actionError
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {actionError || actionSuccess}
          </div>
        )}

        {editorOpen && (
          <form
            onSubmit={handleSaveCampaign}
            className="p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingId ? `Edit Campaign (${editingId})` : 'Create New Draft Campaign'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Winter Solar Trade-In Offer"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Advertising Category
                </label>
                <select
                  value={contentCategory}
                  onChange={(e) => setContentCategory(e.target.value as CampaignContentCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="commercial_advertising">
                    COMMERCIAL ADS (Paid Promotion · Simulated Rate Card)
                  </option>
                  <option value="opportunity_promotion">
                    CHARITY ADS ($0.00 / FREE · Opportunities &amp; Job Listings)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Campaign Summary
              </label>
              <textarea
                rows={2}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="Describe offer, audience call-to-action, and TV slot intent..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Validated QR Link
                </label>
                <select
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">(Attach later in Draft)</option>
                  {qrLinks.map((q) => (
                    <option key={q.token} value={q.token}>
                      /r/{q.token} · {q.label} ({q.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Duration (5–120s)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Daily Cap (1–48/day)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={dailyFrequencyCap}
                  onChange={(e) => setDailyFrequencyCap(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Regions (comma-separated)
                </label>
                <input
                  type="text"
                  value={targetRegionsText}
                  onChange={(e) => setTargetRegionsText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Scheduled Dayparts
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYPART_OPTIONS.map((dp) => {
                    const active = dayparts.includes(dp.id);
                    return (
                      <button
                        key={dp.id}
                        type="button"
                        onClick={() => toggleDaypart(dp.id)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {dp.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200">
              {liveEstimate.isCharityFree ? (
                <p className="text-xs text-emerald-800 font-mono tabular-nums">
                  CHARITY ADS Permanent Zero-Cost Lock: ~{liveEstimate.spots} est. spots × $0.00 ={' '}
                  <strong>$0.00 USD (FREE)</strong> — Opportunities &amp; job listings are never charged.
                </p>
              ) : (
                <p className="text-xs text-slate-700 font-mono tabular-nums">
                  COMMERCIAL ADS Simulated Estimate: ~{liveEstimate.spots} spots × ${liveEstimate.rate.toFixed(2)} ={' '}
                  <strong>${liveEstimate.total.toFixed(2)} USD</strong> (No real billing)
                </p>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer shrink-0"
              >
                {editingId ? 'Save Campaign Changes' : 'Save Draft Campaign'}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {STATUS_TABS.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, summary, QR token..."
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full lg:w-64"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Campaign</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">QR Link & Schedule</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">
                  Sim. Estimate
                </th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Status</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">
                  Lifecycle & Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No campaigns match this filter. Click &ldquo;New Campaign&rdquo; to create a draft.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => {
                  const isAdmin = currentUser.role === 'admin';
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="px-3.5 py-3 align-top max-w-xs">
                          <p className="font-semibold text-slate-900">{c.title}</p>
                          <p className="text-slate-600 mt-0.5 line-clamp-2">{c.summary}</p>
                          <p className="mt-1 text-[11px] font-mono text-slate-500">
                            {c.id} ·{' '}
                            <span
                              className={
                                c.contentCategory === 'opportunity_promotion'
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-blue-700 font-semibold'
                              }
                            >
                              {c.contentCategory === 'opportunity_promotion'
                                ? 'CHARITY ADS'
                                : 'COMMERCIAL ADS'}
                            </span>{' '}
                            · {c.durationSeconds}s · {c.dailyFrequencyCap}/day
                          </p>
                          {c.rejectionReason && (
                            <p className="mt-1.5 text-red-700 font-medium">
                              Rejection: {c.rejectionReason}
                              {c.fixInstructions ? ` · Fix: ${c.fixInstructions}` : ''}
                            </p>
                          )}
                        </td>

                        <td className="px-3.5 py-3 align-top">
                          <p className="font-mono text-slate-800">
                            {c.qrToken ? `/r/${c.qrToken}` : 'No QR attached'}
                          </p>
                          <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                            Creative: {c.adCreativeRef ?? 'Unassigned'}
                          </p>
                          <p className="font-mono tabular-nums text-slate-600 mt-0.5">
                            {c.startDate} to {c.endDate}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            {c.targetRegions.join(', ')}
                          </p>
                        </td>

                        <td className="px-3.5 py-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          {c.simulatedEstimate.model === 'charity_free_zero_cost' ||
                          c.contentCategory === 'opportunity_promotion' ? (
                            <>
                              <p className="text-emerald-700 font-bold">FREE ($0.00)</p>
                              <p className="text-[11px] text-emerald-700">
                                {c.simulatedEstimate.estimatedSpots} spots · Permanent Charity Lock
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-slate-900 font-semibold">
                                ${c.simulatedEstimate.estimatedTotalUsd.toFixed(2)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {c.simulatedEstimate.estimatedSpots} est. spots (Sim.)
                              </p>
                            </>
                          )}
                        </td>

                        <td className="px-3.5 py-3 align-top whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 ${STATUS_TEXT_COLOR[c.status]}`}
                          >
                            {c.status === 'active' || c.status === 'approved' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : c.status === 'rejected' ? (
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                            ) : c.status === 'paused' ? (
                              <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="font-mono">{c.status}</span>
                          </span>
                        </td>

                        <td className="px-3.5 py-3 align-top text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {onOpenPreviewGate && (
                              <button
                                type="button"
                                onClick={() => onOpenPreviewGate(c.id)}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium cursor-pointer"
                              >
                                <MonitorPlay className="w-3 h-3" />
                                <span>Pre-Submit TV Gate</span>
                              </button>
                            )}
                            {(c.status === 'draft' || c.status === 'rejected') && (
                              <button
                                type="button"
                                onClick={() => handleTransition(c.id, 'submitted')}
                                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Submit</span>
                              </button>
                            )}

                            {isAdmin && c.status === 'submitted' && (
                              <button
                                type="button"
                                onClick={() => handleTransition(c.id, 'under_review')}
                                className="text-amber-700 hover:underline font-medium cursor-pointer"
                              >
                                Start Review
                              </button>
                            )}

                            {isAdmin &&
                              (c.status === 'submitted' || c.status === 'under_review') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleTransition(c.id, 'approved')}
                                    className="text-emerald-700 hover:underline font-medium cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingId(c.id);
                                      setRejectionReason('');
                                      setFixInstructions('');
                                    }}
                                    className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                            {c.status === 'approved' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'scheduled')}
                                  className="text-blue-700 hover:underline font-medium cursor-pointer"
                                >
                                  Schedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'active')}
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium cursor-pointer"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                  <span>Activate</span>
                                </button>
                              </>
                            )}

                            {c.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => handleTransition(c.id, 'active')}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium cursor-pointer"
                              >
                                <PlayCircle className="w-3 h-3" />
                                <span>Activate</span>
                              </button>
                            )}

                            {c.status === 'active' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'paused')}
                                  className="text-amber-700 hover:underline font-medium cursor-pointer"
                                >
                                  Pause
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'completed')}
                                  className="text-slate-700 hover:underline font-medium cursor-pointer"
                                >
                                  Complete
                                </button>
                              </>
                            )}

                            {c.status === 'paused' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'active')}
                                  className="text-emerald-700 hover:underline font-medium cursor-pointer"
                                >
                                  Resume
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransition(c.id, 'expired')}
                                  className="text-slate-600 hover:underline font-medium cursor-pointer"
                                >
                                  Expire
                                </button>
                              </>
                            )}

                            {(c.status === 'rejected' || c.status === 'expired' || c.status === 'submitted') && (
                              <button
                                type="button"
                                onClick={() => handleTransition(c.id, 'draft')}
                                className="text-slate-700 hover:underline font-medium cursor-pointer"
                              >
                                Move to Draft
                              </button>
                            )}

                            {(c.status === 'draft' || c.status === 'rejected' || c.status === 'paused' || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => openEditEditor(c)}
                                className="text-slate-700 hover:underline font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleClone(c.id)}
                              className="inline-flex items-center gap-1 text-slate-700 hover:underline font-medium cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Clone</span>
                            </button>

                            {(c.status === 'draft' ||
                              c.status === 'rejected' ||
                              c.status === 'expired' ||
                              isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(c.id)}
                                aria-label={`Delete campaign ${c.title}`}
                                className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {rejectingId === c.id && (
                        <tr className="bg-red-50/40">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
                              <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-red-900 mb-1">
                                  Mandatory Rejection Reason
                                </label>
                                <input
                                  type="text"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Explain policy/creative/QR defect..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-red-200 rounded-md"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-red-900 mb-1">
                                  Fix Instructions (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={fixInstructions}
                                  onChange={(e) => setFixInstructions(e.target.value)}
                                  placeholder="Steps required before resubmission..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-red-200 rounded-md"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTransition(c.id, 'rejected', {
                                      rejectionReason,
                                      fixInstructions,
                                    })
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 cursor-pointer whitespace-nowrap"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingId(null)}
                                  className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <CopyReportFooter reportText={reportText} reportTitle="Block 2.2 Campaign Management Report" />
      </div>
    </div>
  );
}
