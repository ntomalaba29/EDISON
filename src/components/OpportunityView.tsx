import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck2,
  Flag,
  Plus,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  CampaignRecord,
  OpportunityAppealRecord,
  OpportunityAppealStatus,
  OpportunityCategory,
  OpportunityComplaintReason,
  OpportunityComplaintRecord,
  OpportunityComplaintStatus,
  OpportunityProviderType,
  OpportunityRecord,
  OpportunityStatus,
  OpportunityTierStatus,
  PublicUser,
  QrLinkRecord,
} from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

interface OpportunityViewProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

type OppSubTab = 'submit' | 'directory' | 'admin';

const CATEGORY_OPTIONS: { id: OpportunityCategory; label: string }[] = [
  { id: 'permanent_employment', label: 'Permanent Employment' },
  { id: 'temporary_employment', label: 'Temporary Employment' },
  { id: 'part_time_employment', label: 'Part-Time Employment' },
  { id: 'contract_employment', label: 'Contract Employment' },
  { id: 'internship', label: 'Internship' },
  { id: 'apprenticeship', label: 'Apprenticeship' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'education', label: 'Education Programme' },
  { id: 'training', label: 'Training Programme' },
  { id: 'grant', label: 'Grant & Funding' },
  { id: 'tender', label: 'Public / Commercial Tender' },
  { id: 'business_opportunity', label: 'Business Opportunity' },
  { id: 'workshop_seminar', label: 'Workshop & Seminar' },
  { id: 'other', label: 'Other Legitimate Opportunity' },
];

const COMPLAINT_REASONS: { id: OpportunityComplaintReason; label: string }[] = [
  { id: 'upfront_fee_scam', label: 'Demands upfront / application fee' },
  { id: 'misleading_guarantee', label: 'Claims guaranteed job / funding' },
  { id: 'expired_or_closed', label: 'Closed or expired opportunity still shown' },
  { id: 'broken_or_wrong_qr', label: 'Broken or misleading QR destination' },
  { id: 'fake_employer_or_listing', label: 'Suspected fake provider or vacancy' },
  { id: 'other', label: 'Other viewer protection concern' },
];

function futureDateString(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86400 * 1000).toISOString().slice(0, 10);
}

function tierBadgeClass(status: OpportunityTierStatus): string {
  if (status === 'verified') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  if (status === 'rejected') return 'bg-red-50 border-red-200 text-red-800';
  if (status === 'not_applicable') return 'bg-slate-100 border-slate-200 text-slate-600';
  if (status === 'pending_review') return 'bg-amber-50 border-amber-200 text-amber-800';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

function statusColorClass(status: OpportunityStatus): string {
  if (status === 'verified_live') return 'text-emerald-700 font-semibold';
  if (status === 'rejected' || status === 'suspended' || status === 'revoked')
    return 'text-red-700 font-semibold';
  if (status === 'expired') return 'text-slate-500';
  if (status === 'under_review' || status === 'submitted') return 'text-blue-700 font-medium';
  return 'text-slate-600';
}

export function OpportunityView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: OpportunityViewProps) {
  const [subTab, setSubTab] = useState<OppSubTab>('submit');
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [complaints, setComplaints] = useState<OpportunityComplaintRecord[]>([]);
  const [appeals, setAppeals] = useState<OpportunityAppealRecord[]>([]);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Submission Form State
  const [formOpen, setFormOpen] = useState(false);
  const [providerType, setProviderType] =
    useState<OpportunityProviderType>('registered_organisation');
  const [providerName, setProviderName] = useState('');
  const [category, setCategory] = useState<OpportunityCategory>('apprenticeship');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Manchester, United Kingdom');
  const [eligibilityRequirements, setEligibilityRequirements] = useState(
    'Open to eligible applicants aged 18+; zero applicant fees.'
  );
  const [applicationMethod, setApplicationMethod] = useState(
    'Free online application portal accessible directly via QR destination.'
  );
  const [contactInfo, setContactInfo] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [linkedCampaignId, setLinkedCampaignId] = useState('');
  const [closingDate, setClosingDate] = useState(() => futureDateString(21));
  const [expiryDate, setExpiryDate] = useState(() => futureDateString(25));
  const [identityEvidenceRef, setIdentityEvidenceRef] = useState('GOV-ID-PROTO-ATT-01');
  const [organisationEvidenceRef, setOrganisationEvidenceRef] = useState('REG-ENTITY-PROTO-01');
  const [specificOpportunityEvidenceRef, setSpecificOpportunityEvidenceRef] = useState(
    'SIGNED-VACANCY-DECL-01'
  );
  const [applicationFeeFreeConfirmed, setApplicationFeeFreeConfirmed] = useState(false);
  const [noGuaranteeConfirmed, setNoGuaranteeConfirmed] = useState(false);

  // Complaint Form State
  const [reportingOppId, setReportingOppId] = useState<string | null>(null);
  const [complaintReason, setComplaintReason] =
    useState<OpportunityComplaintReason>('upfront_fee_scam');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintEvidence, setComplaintEvidence] = useState('');

  // Appeal Form State
  const [appealingOppId, setAppealingOppId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');

  // Admin Review State per opportunity
  const [reviewEdits, setReviewEdits] = useState<
    Record<
      string,
      {
        identityStatus: OpportunityTierStatus;
        organisationStatus: OpportunityTierStatus;
        specificOpportunityStatus: OpportunityTierStatus;
        targetStatus: OpportunityStatus;
        rejectionReason: string;
      }
    >
  >({});
  const [complaintNotesMap, setComplaintNotesMap] = useState<Record<string, string>>({});
  const [appealNotesMap, setAppealNotesMap] = useState<Record<string, string>>({});

  const hasInitializedQr = useRef(false);

  const loadAll = useCallback(async () => {
    if (!currentUser) {
      hasInitializedQr.current = false;
      setOpportunities([]);
      setComplaints([]);
      setAppeals([]);
      setQrLinks([]);
      setCampaigns([]);
      return;
    }
    setLoading(true);
    try {
      const [oppRes, cmpnRes, aplRes, qrRes, cmpRes] = await Promise.all([
        edisonFetch('/api/opportunities'),
        edisonFetch('/api/opportunity-complaints'),
        edisonFetch('/api/opportunity-appeals'),
        edisonFetch('/api/qr'),
        edisonFetch('/api/campaigns'),
      ]);
      if (oppRes.ok) {
        const d = await oppRes.json();
        const items: OpportunityRecord[] = d.items || [];
        setOpportunities(items);
        setReviewEdits((prev) => {
          const next = { ...prev };
          for (const o of items) {
            next[o.id] = {
              identityStatus: o.verificationTiers.identityStatus,
              organisationStatus: o.verificationTiers.organisationStatus,
              specificOpportunityStatus: o.verificationTiers.specificOpportunityStatus,
              targetStatus: o.status,
              rejectionReason: o.rejectionReason ?? '',
            };
          }
          return next;
        });
      }
      if (cmpnRes.ok) setComplaints((await cmpnRes.json()).items || []);
      if (aplRes.ok) setAppeals((await aplRes.json()).items || []);
      if (qrRes.ok) {
        const qItems: QrLinkRecord[] = (await qrRes.json()).items || [];
        setQrLinks(qItems);
        if (!hasInitializedQr.current && qItems.length > 0) {
          const active = qItems.find((q) => q.status === 'active') ?? qItems[0];
          setQrToken(active.token);
          hasInitializedQr.current = true;
        }
      }
      if (cmpRes.ok) setCampaigns((await cmpRes.json()).items || []);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (currentUser && !providerName) {
      setProviderName(currentUser.organisationName || currentUser.name);
      setContactInfo(currentUser.email);
    }
  }, [currentUser, providerName]);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await edisonFetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerType,
        providerName,
        category,
        title,
        description,
        location,
        eligibilityRequirements,
        applicationMethod,
        contactInfo,
        qrToken: qrToken || null,
        linkedCampaignId: linkedCampaignId || null,
        closingDate,
        expiryDate,
        identityEvidenceRef,
        organisationEvidenceRef:
          providerType === 'individual_informal_employer' ? '' : organisationEvidenceRef,
        specificOpportunityEvidenceRef,
        applicationFeeFreeConfirmed,
        noGuaranteeConfirmed,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Unable to save opportunity draft.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Created opportunity "${data.item.title}" (${data.item.status}). Submit it for independent 3-tier verification.`,
    });
    setFormOpen(false);
    setTitle('');
    setDescription('');
    setApplicationFeeFreeConfirmed(false);
    setNoGuaranteeConfirmed(false);
    await loadAll();
    await onSummaryRefresh();
  };

  const handleSubmitOpportunity = async (id: string) => {
    setFeedback(null);
    const res = await edisonFetch(`/api/opportunities/${id}/submit`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Submission failed.' });
      await loadAll();
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Opportunity "${data.item.title}" submitted for independent 3-tier review.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleDeleteOpportunity = async (id: string) => {
    setFeedback(null);
    const res = await edisonFetch(`/api/opportunities/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Unable to delete opportunity.' });
      return;
    }
    setFeedback({ type: 'ok', text: `Deleted opportunity ${id}.` });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleFileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingOppId) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/opportunities/${reportingOppId}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reasonCategory: complaintReason,
        description: complaintDesc,
        evidenceDetails: complaintEvidence,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Complaint submission failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Complaint ${data.item.id} logged (${data.item.status}) for administrator investigation.`,
    });
    setReportingOppId(null);
    setComplaintDesc('');
    setComplaintEvidence('');
    await loadAll();
    await onSummaryRefresh();
  };

  const handleFileAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealingOppId) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/opportunities/${appealingOppId}/appeals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: appealReason,
        additionalEvidence: appealEvidence,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Appeal submission failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Formal appeal ${data.item.id} submitted with additional supporting evidence.`,
    });
    setAppealingOppId(null);
    setAppealReason('');
    setAppealEvidence('');
    await loadAll();
    await onSummaryRefresh();
  };

  const handleAdminVerifySave = async (oppId: string) => {
    const edit = reviewEdits[oppId];
    if (!edit) return;
    setFeedback(null);
    const res = await edisonFetch(`/api/admin/opportunities/${oppId}/verify-tiers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edit),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || '3-tier verification update failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Saved 3-tier assessment for "${data.item.title}" -> status: ${data.item.status}.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleAdminComplaintAction = async (
    complaintId: string,
    status: OpportunityComplaintStatus
  ) => {
    const notes =
      (complaintNotesMap[complaintId] ?? '').trim() ||
      `Moderator investigation updated to ${status}.`;
    setFeedback(null);
    const res = await edisonFetch(`/api/admin/opportunity-complaints/${complaintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolutionNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Complaint investigation update failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Complaint ${complaintId} marked ${status}.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleAdminAppealDecision = async (appealId: string, status: OpportunityAppealStatus) => {
    const adminNotes =
      (appealNotesMap[appealId] ?? '').trim() || `Appeal decision recorded as ${status}.`;
    setFeedback(null);
    const res = await edisonFetch(`/api/admin/opportunity-appeals/${appealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'err', text: data.error || 'Appeal decision update failed.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: `Appeal ${appealId} resolved (${status}).`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const stats = useMemo(() => {
    const live = opportunities.filter((o) => o.status === 'verified_live').length;
    const expired = opportunities.filter((o) => o.status === 'expired').length;
    const openComplaints = complaints.filter(
      (c) => c.status === 'reported' || c.status === 'under_investigation'
    ).length;
    const openAppeals = appeals.filter(
      (a) => a.status === 'submitted' || a.status === 'under_review'
    ).length;
    return { live, expired, openComplaints, openAppeals };
  }, [opportunities, complaints, appeals]);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Access Opportunities &amp; 3-Tier Verification
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Submit employment, scholarship, grant, or training opportunities, verify Tier 1–3 evidence independently, file complaints, or resolve appeals using a prototype session.
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
    'EDISON — BLOCK 2.5 OPPORTUNITY SUBMISSION & 3-TIER VERIFICATION REPORT',
    `Account: ${currentUser.email} (${currentUser.role})`,
    `Total Opportunities Accessible: ${opportunities.length} | Verified Live: ${stats.live} | Auto-Expired: ${stats.expired}`,
    `Complaints: ${complaints.length} (Open: ${stats.openComplaints}) | Appeals: ${appeals.length} (Pending: ${stats.openAppeals})`,
    'Governance Rules Enforced: 3-Tier Non-Transitivity | Financial Independence (advertisingFeeInfluencesVerification=false) | Free QR Access & Anti-Scam Phrase Guard',
  ].join('\n');

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Opportunity Management &amp; Independent 3-Tier Verification
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Supports organisations &amp; individual/informal employers. Tier 2 organisation checks never auto-verify Tier 3 listings, and ad fees never influence verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubTab('submit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'submit'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Submit &amp; Appeals
            </button>
            <button
              type="button"
              onClick={() => setSubTab('directory')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'directory'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Directory &amp; Complaints ({stats.openComplaints})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. 3-Tier Admin QA
            </button>
          </div>
          <button
            type="button"
            onClick={loadAll}
            aria-label="Refresh opportunities"
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Viewer Protection & Non-Transitivity Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Viewer Protection, Non-Transitivity &amp; Financial Independence Enforced</span>
          </p>
          <p className="text-emerald-900">
            Free for viewers to scan &amp; apply. EDISON never guarantees employment, scholarships, or funding. Expired opportunities automatically lock out of TV scheduling.
          </p>
        </div>
        <div className="font-mono text-[11px] bg-white border border-emerald-300 rounded px-2.5 py-1.5 whitespace-nowrap self-start md:self-center">
          Live: {stats.live} · Expired: {stats.expired} · Open Complaints: {stats.openComplaints}
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

      {/* SUBTAB 1: SUBMIT & MANAGE MY OPPORTUNITIES + APPEALS */}
      {subTab === 'submit' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Opportunity Submission &amp; Evidence Collection
                </h3>
                <p className="text-xs text-slate-600">
                  Both registered organisations and individual/informal employers may submit legitimate opportunities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{formOpen ? 'Close Submission Form' : 'New Opportunity Listing'}</span>
              </button>
            </div>

            {formOpen && (
              <form
                onSubmit={handleCreateOpportunity}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Provider Type</label>
                    <select
                      value={providerType}
                      onChange={(e) =>
                        setProviderType(e.target.value as OpportunityProviderType)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="registered_organisation">
                        Registered Organisation / Institution
                      </option>
                      <option value="individual_informal_employer">
                        Individual / Informal Employer (Tier 1 + Tier 3)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Provider / Employer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Opportunity Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Junior Renewable Technician Apprenticeship"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Full Opportunity Description (min 15 chars — upfront-fee or guarantee phrases blocked)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Eligibility Requirements
                    </label>
                    <input
                      type="text"
                      required
                      value={eligibilityRequirements}
                      onChange={(e) => setEligibilityRequirements(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Application Method (Free)
                    </label>
                    <input
                      type="text"
                      required
                      value={applicationMethod}
                      onChange={(e) => setApplicationMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Contact Info</label>
                    <input
                      type="text"
                      required
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Closing Date</label>
                    <input
                      type="date"
                      required
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">TV Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">QR Destination</label>
                    <select
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">No QR linked yet</option>
                      {qrLinks.map((q) => (
                        <option key={q.token} value={q.token}>
                          /r/{q.token} ({q.label})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Optional Linked Campaign
                    </label>
                    <select
                      value={linkedCampaignId}
                      onChange={(e) => setLinkedCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">Unlinked listing</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tier 1 Evidence Ref (Human Identity)
                    </label>
                    <input
                      type="text"
                      required
                      value={identityEvidenceRef}
                      onChange={(e) => setIdentityEvidenceRef(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tier 2 Evidence Ref (Organisation)
                    </label>
                    <input
                      type="text"
                      disabled={providerType === 'individual_informal_employer'}
                      value={
                        providerType === 'individual_informal_employer'
                          ? 'Not required for individual employer'
                          : organisationEvidenceRef
                      }
                      onChange={(e) => setOrganisationEvidenceRef(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tier 3 Evidence Ref (Specific Opportunity)
                    </label>
                    <input
                      type="text"
                      required
                      value={specificOpportunityEvidenceRef}
                      onChange={(e) => setSpecificOpportunityEvidenceRef(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applicationFeeFreeConfirmed}
                      onChange={(e) => setApplicationFeeFreeConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I confirm viewers are <strong>never charged</strong> to scan the QR code or apply for this opportunity.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noGuaranteeConfirmed}
                      onChange={(e) => setNoGuaranteeConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I confirm this listing makes <strong>zero guarantees</strong> of employment, scholarships, grants, or acceptance, and acknowledge advertising fees never buy verification.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Save Opportunity Draft
                  </button>
                </div>
              </form>
            )}

            {/* Opportunities Table */}
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 border border-slate-200 rounded-lg bg-white space-y-3 text-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{opp.title}</span>
                        <span className={`font-mono ${statusColorClass(opp.status)}`}>
                          [{opp.status}]
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {opp.id} · {opp.category}
                        </span>
                      </div>
                      <p className="text-slate-600">{opp.description}</p>
                      <p className="text-slate-600">
                        <strong>Provider:</strong> {opp.providerName} ({opp.providerType}) ·{' '}
                        <strong>Location:</strong> {opp.location} ·{' '}
                        <strong>Closing:</strong> <span className="font-mono">{opp.closingDate}</span>
                      </p>
                      {opp.rejectionReason && (
                        <p className="text-red-700 font-medium">
                          Rejection Reason: {opp.rejectionReason}
                        </p>
                      )}
                      {opp.suspensionReason && (
                        <p className="text-red-700 font-medium">
                          Suspension Note: {opp.suspensionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(opp.status === 'draft' || opp.status === 'rejected') &&
                        (currentUser.role === 'admin' || opp.ownerId === currentUser.id) && (
                          <button
                            type="button"
                            onClick={() => handleSubmitOpportunity(opp.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Submit for 3-Tier QA</span>
                          </button>
                        )}
                      {(opp.status === 'rejected' || opp.status === 'suspended') &&
                        (currentUser.role === 'admin' || opp.ownerId === currentUser.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              setAppealingOppId(opp.id);
                              setAppealReason('');
                              setAppealEvidence('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>File Appeal</span>
                          </button>
                        )}
                      {(currentUser.role === 'admin' ||
                        (opp.ownerId === currentUser.id &&
                          (opp.status === 'draft' ||
                            opp.status === 'rejected' ||
                            opp.status === 'expired'))) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOpportunity(opp.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Tier Badges Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div
                      className={`p-2 rounded border ${tierBadgeClass(
                        opp.verificationTiers.identityStatus
                      )}`}
                    >
                      <p className="font-semibold">
                        Tier 1 Identity: {opp.verificationTiers.identityStatus}
                      </p>
                      <p className="font-mono text-[11px] truncate">
                        Ref: {opp.verificationTiers.identityEvidenceRef || 'None'}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded border ${tierBadgeClass(
                        opp.verificationTiers.organisationStatus
                      )}`}
                    >
                      <p className="font-semibold">
                        Tier 2 Organisation: {opp.verificationTiers.organisationStatus}
                      </p>
                      <p className="font-mono text-[11px] truncate">
                        Ref: {opp.verificationTiers.organisationEvidenceRef || 'None'}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded border ${tierBadgeClass(
                        opp.verificationTiers.specificOpportunityStatus
                      )}`}
                    >
                      <p className="font-semibold">
                        Tier 3 Specific Listing: {opp.verificationTiers.specificOpportunityStatus}
                      </p>
                      <p className="font-mono text-[11px] truncate">
                        Ref: {opp.verificationTiers.specificOpportunityEvidenceRef || 'None'}
                      </p>
                    </div>
                  </div>

                  {appealingOppId === opp.id && (
                    <form
                      onSubmit={handleFileAppeal}
                      className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5"
                    >
                      <p className="font-semibold text-amber-950">
                        Submit Formal Verification Appeal for &ldquo;{opp.title}&rdquo;
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Reason for appeal (min 10 chars)..."
                          value={appealReason}
                          onChange={(e) => setAppealReason(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-amber-300 rounded"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Additional evidence reference / employer verification URL..."
                          value={appealEvidence}
                          onChange={(e) => setAppealEvidence(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-amber-300 rounded"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 font-semibold text-white bg-slate-900 rounded cursor-pointer"
                        >
                          Submit Appeal
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppealingOppId(null)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>

          {appeals.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Submitted Appeals History</h3>
              <div className="space-y-2 text-xs">
                {appeals.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        Appeal {a.id} for {a.opportunityId} ·{' '}
                        <span className="font-mono text-blue-700">{a.status}</span>
                      </p>
                      <p className="text-slate-600">{a.reason}</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        Evidence: {a.additionalEvidence}
                        {a.adminNotes ? ` · Decision Note: ${a.adminNotes}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DIRECTORY & VIEWER COMPLAINTS */}
      {subTab === 'directory' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Verified &amp; Tracked Opportunities Directory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900">{opp.title}</p>
                      {opp.status === 'verified_live' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>3-Tier Verified</span>
                        </span>
                      ) : opp.status === 'expired' ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-mono whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" />
                          <span>expired</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-mono whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>UNVERIFIED ({opp.status})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">{opp.description}</p>
                    <p className="text-slate-600">
                      <strong>Provider:</strong> {opp.providerName} · <strong>Location:</strong>{' '}
                      {opp.location}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      Closing: {opp.closingDate} · Free to Apply ·{' '}
                      {opp.qrToken ? `/r/${opp.qrToken}` : 'No QR'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Outcomes never guaranteed by EDISON
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReportingOppId(opp.id);
                        setComplaintDesc('');
                        setComplaintEvidence('');
                      }}
                      className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium cursor-pointer"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report Concern</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {reportingOppId && (
              <form
                onSubmit={handleFileComplaint}
                className="p-4 bg-red-50/70 border border-red-200 rounded-lg space-y-3 text-xs"
              >
                <p className="font-semibold text-red-950">
                  Report Suspicious, Expired, or Deceptive Opportunity ({reportingOppId})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={complaintReason}
                    onChange={(e) =>
                      setComplaintReason(e.target.value as OpportunityComplaintReason)
                    }
                    className="px-3 py-2 bg-white border border-red-200 rounded-lg"
                  >
                    {COMPLAINT_REASONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Describe the concern (min 10 chars)..."
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    className="px-3 py-2 bg-white border border-red-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Evidence details / URL / phone message (optional)..."
                    value={complaintEvidence}
                    onChange={(e) => setComplaintEvidence(e.target.value)}
                    className="px-3 py-2 bg-white border border-red-200 rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-2 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
                  >
                    Submit Complaint
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportingOppId(null)}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Complaints &amp; Investigation Ledger
            </h3>
            {complaints.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No complaints filed in this session yet.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {c.reasonCategory} on {c.opportunityId}
                      </span>
                      <span className="font-mono text-red-700 font-semibold">{c.status}</span>
                    </div>
                    <p className="text-slate-700">{c.description}</p>
                    {c.resolutionNotes && (
                      <p className="text-emerald-800 font-medium">
                        Investigation: {c.resolutionNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: ADMIN 3-TIER VERIFICATION, INVESTIGATIONS & APPEALS WORKBENCH */}
      {subTab === 'admin' && (
        <div className="space-y-5">
          {currentUser.role !== 'admin' ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Administrator Role Required for 3-Tier Approvals &amp; Investigations</span>
              </p>
              <p>
                Signed in as <span className="font-mono">{currentUser.email}</span> ({currentUser.role}). Server-side RBAC blocks non-admin modifications to Tiers 1–3, complaint suspensions, and appeal decisions. Sign in as <span className="font-mono">admin@edison.demo</span> in Auth &amp; RBAC Console to operate moderation controls.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Independent 3-Tier Verification Queue
                  </h3>
                  <p className="text-xs text-slate-600">
                    Each tier is evaluated independently. Approving Tier 2 Organisation never auto-approves Tier 3 Specific Listing; publishing verified_live is blocked by server enforcement unless required tiers pass.
                  </p>
                </div>

                <div className="space-y-4">
                  {opportunities.map((opp) => {
                    const edit = reviewEdits[opp.id];
                    if (!edit) return null;
                    return (
                      <div
                        key={opp.id}
                        className="p-4 border border-slate-200 rounded-lg space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{opp.title}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {opp.id} · {opp.providerName} ({opp.providerType}) · Current:{' '}
                              {opp.status}
                            </p>
                          </div>
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 rounded">
                            adFeeInfluencesVerification: false
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Tier 1: Identity Verified
                            </label>
                            <select
                              value={edit.identityStatus}
                              onChange={(e) =>
                                setReviewEdits({
                                  ...reviewEdits,
                                  [opp.id]: {
                                    ...edit,
                                    identityStatus: e.target.value as OpportunityTierStatus,
                                  },
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                            >
                              <option value="unverified">unverified</option>
                              <option value="pending_review">pending_review</option>
                              <option value="verified">verified</option>
                              <option value="rejected">rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Tier 2: Organisation Verified
                            </label>
                            <select
                              value={edit.organisationStatus}
                              disabled={opp.providerType === 'individual_informal_employer'}
                              onChange={(e) =>
                                setReviewEdits({
                                  ...reviewEdits,
                                  [opp.id]: {
                                    ...edit,
                                    organisationStatus: e.target.value as OpportunityTierStatus,
                                  },
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded disabled:bg-slate-100"
                            >
                              <option value="not_applicable">not_applicable</option>
                              <option value="unverified">unverified</option>
                              <option value="pending_review">pending_review</option>
                              <option value="verified">verified</option>
                              <option value="rejected">rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Tier 3: Specific Opportunity
                            </label>
                            <select
                              value={edit.specificOpportunityStatus}
                              onChange={(e) =>
                                setReviewEdits({
                                  ...reviewEdits,
                                  [opp.id]: {
                                    ...edit,
                                    specificOpportunityStatus:
                                      e.target.value as OpportunityTierStatus,
                                  },
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                            >
                              <option value="unverified">unverified</option>
                              <option value="pending_review">pending_review</option>
                              <option value="verified">verified</option>
                              <option value="rejected">rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Decision Status
                            </label>
                            <select
                              value={edit.targetStatus}
                              onChange={(e) =>
                                setReviewEdits({
                                  ...reviewEdits,
                                  [opp.id]: {
                                    ...edit,
                                    targetStatus: e.target.value as OpportunityStatus,
                                  },
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                            >
                              <option value="submitted">submitted</option>
                              <option value="under_review">under_review</option>
                              <option value="verified_live">verified_live</option>
                              <option value="rejected">rejected</option>
                              <option value="suspended">suspended</option>
                              <option value="revoked">revoked</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                          <input
                            type="text"
                            placeholder="Rejection / suspension reason (required if rejecting)..."
                            value={edit.rejectionReason}
                            onChange={(e) =>
                              setReviewEdits({
                                ...reviewEdits,
                                [opp.id]: { ...edit, rejectionReason: e.target.value },
                              })
                            }
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdminVerifySave(opp.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Save 3-Tier Decision</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Complaints & Appeals Workbench */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Complaints Investigation Queue
                  </h3>
                  {complaints.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No complaints pending.</p>
                  ) : (
                    complaints.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 border border-slate-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {c.reasonCategory} ({c.opportunityId})
                          </span>
                          <span className="font-mono text-red-700">{c.status}</span>
                        </div>
                        <p className="text-slate-700">{c.description}</p>
                        <input
                          type="text"
                          placeholder="Written investigation notes..."
                          value={complaintNotesMap[c.id] ?? ''}
                          onChange={(e) =>
                            setComplaintNotesMap({ ...complaintNotesMap, [c.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              'under_investigation',
                              'cleared',
                              'suspended',
                              'revoked',
                            ] as OpportunityComplaintStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAdminComplaintAction(c.id, st)}
                              className="px-2.5 py-1 font-medium border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-slate-900">Appeals Decision Queue</h3>
                  {appeals.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No appeals submitted.</p>
                  ) : (
                    appeals.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 border border-slate-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Appeal {a.id} ({a.opportunityId})
                          </span>
                          <span className="font-mono text-blue-700">{a.status}</span>
                        </div>
                        <p className="text-slate-700">{a.reason}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          Additional Evidence: {a.additionalEvidence}
                        </p>
                        <input
                          type="text"
                          placeholder="Admin decision notes..."
                          value={appealNotesMap[a.id] ?? ''}
                          onChange={(e) =>
                            setAppealNotesMap({ ...appealNotesMap, [a.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdminAppealDecision(a.id, 'upheld_reinstated')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reinstate to Under Review</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminAppealDecision(a.id, 'denied')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-red-800 bg-red-50 border border-red-300 rounded cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Deny Appeal</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <CopyReportFooter
        reportText={reportText}
        reportTitle="Block 2.5 Opportunity & 3-Tier Verification Report"
      />
    </div>
  );
}
