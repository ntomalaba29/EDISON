import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  LogOut,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Lock,
} from 'lucide-react';
import type {
  AnalyticsEventRecord,
  AuditLogRecord,
  PublicUser,
  QrDestinationType,
  QrLinkRecord,
} from '../types/edison';
import type { QrValidationResult } from '../server/qrValidator';
import { QrCodePreview } from './QrCodePreview';
import { CopyReportFooter } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

interface FoundationSummary {
  userCount: number;
  qrCount: number;
  redirectRequestsTotal: number;
  redirectIssuedTotal: number;
  suspectedBotRedirects: number;
  verifiedDestinationOpens: number;
  auditLogCount: number;
  storagePath: string;
}

interface AuthSessionProps {
  currentUser: PublicUser | null;
  summary: FoundationSummary | null;
  onAuthChange: () => Promise<void>;
}

export function AuthRbacView({ currentUser, summary, onAuthChange }: AuthSessionProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [role, setRole] = useState<'advertiser' | 'opportunity_submitter' | 'household_viewer'>(
    'advertiser'
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rbacResult, setRbacResult] = useState<{
    statusCode: number;
    message: string;
    logs: AuditLogRecord[];
  } | null>(null);
  const [testingRbac, setTestingRbac] = useState(false);

  const fillSeed = (seedEmail: string, seedPass: string) => {
    setMode('login');
    setEmail(seedEmail);
    setPassword(seedPass);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, name, organisationName, role };

      const res = await edisonFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Authentication failed.' });
      } else {
        setFeedback({
          type: 'ok',
          text:
            mode === 'login'
              ? `Signed in as ${data.user.name} (${data.user.role}).`
              : `Registered and signed in as ${data.user.name} (${data.user.role}).`,
        });
        setPassword('');
        setRbacResult(null);
        await onAuthChange();
      }
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Network error.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await edisonFetch('/api/auth/logout', { method: 'POST' });
    setFeedback({ type: 'ok', text: 'Signed out. Session terminated.' });
    setRbacResult(null);
    await onAuthChange();
  };

  const testAdminEndpoint = async () => {
    setTestingRbac(true);
    try {
      const res = await edisonFetch('/api/admin/audit-logs');
      const data = await res.json();
      if (!res.ok) {
        setRbacResult({
          statusCode: res.status,
          message: data.error || `HTTP ${res.status}`,
          logs: [],
        });
      } else {
        setRbacResult({
          statusCode: res.status,
          message: `Authorized (HTTP 200). Loaded ${data.items.length} audit log records.`,
          logs: data.items,
        });
      }
    } catch (err) {
      setRbacResult({
        statusCode: 0,
        message: err instanceof Error ? err.message : 'Request failed.',
        logs: [],
      });
    } finally {
      setTestingRbac(false);
    }
  };

  const reportText = [
    'EDISON — BLOCK 2.1 AUTHENTICATION, PERSISTENCE & RBAC STATUS',
    `Active User: ${currentUser ? `${currentUser.email} (${currentUser.role})` : 'Unauthenticated'}`,
    `Storage: ${summary?.storagePath ?? 'data/edison-store.json (Locked Atomic Write)'}`,
    `Registered Users: ${summary?.userCount ?? 0}`,
    `QR Links Stored: ${summary?.qrCount ?? 0}`,
    `Redirect Requests Received: ${summary?.redirectRequestsTotal ?? 0}`,
    `HTTP 302 Redirects Issued: ${summary?.redirectIssuedTotal ?? 0}`,
    `Suspected Bot/Prefetch Hits: ${summary?.suspectedBotRedirects ?? 0}`,
    `Verified Destination Opens: ${summary?.verifiedDestinationOpens ?? 0} (Not inferred from 302 redirects)`,
    `Audit Log Entries: ${summary?.auditLogCount ?? 0}`,
    rbacResult
      ? `Last RBAC Probe (/api/admin/audit-logs): HTTP ${rbacResult.statusCode} — ${rbacResult.message}`
      : 'Last RBAC Probe: Not executed in this view yet',
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Active Session</p>
          <p className="mt-1.5 text-base font-semibold text-slate-900 truncate">
            {currentUser ? currentUser.name : 'Signed Out'}
          </p>
          <p className="mt-1 text-xs font-mono text-slate-600">
            {currentUser ? `Role: ${currentUser.role}` : 'No active cookie session'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Accounts Stored</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {summary?.userCount ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-600">scrypt password hashes</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Redirect Telemetry</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {summary?.redirectIssuedTotal ?? 0} / {summary?.redirectRequestsTotal ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            Issued / Requested ({summary?.suspectedBotRedirects ?? 0} bot-flagged)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Persistence Layer</p>
          <p className="mt-1.5 text-sm font-semibold font-mono text-slate-900 truncate">
            data/edison-store.json
          </p>
          <p className="mt-1 text-xs text-slate-600">Lockfile + fsync atomic rename</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Account Authentication & Registration
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Server-backed sessions with scrypt hashing and non-self-registerable admin role.
              </p>
            </div>

            {!currentUser && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="mt-5 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-mono text-slate-900">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Organisation</span>
                  <span className="text-slate-900">{currentUser.organisationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Role</span>
                  <span className="font-mono font-semibold text-blue-700">{currentUser.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Verification</span>
                  <span className="text-slate-900">{currentUser.verificationStatus}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jordan Patel"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Organisation or Individual Employer Name
                    </label>
                    <input
                      type="text"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      placeholder="e.g. Brightline Bakery or Independent"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Account Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(
                          e.target.value as
                            | 'advertiser'
                            | 'opportunity_submitter'
                            | 'household_viewer'
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="advertiser">Commercial Advertiser</option>
                      <option value="opportunity_submitter">Opportunity Submitter</option>
                      <option value="household_viewer">Household TV Viewer</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.example"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Prototype Account'}
              </button>

              {import.meta.env.DEV && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-medium text-slate-600">
                    Quick-Fill Prototype Seed Test Accounts (Development Only):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillSeed('advertiser@edison.demo', 'EdisonProto!2026')}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Advertiser Seed
                    </button>
                    <button
                      type="button"
                      onClick={() => fillSeed('employer@edison.demo', 'EdisonProto!2026')}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Opportunity Seed
                    </button>
                    <button
                      type="button"
                      onClick={() => fillSeed('admin@edison.demo', 'EdisonAdmin!2026')}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Admin Seed
                    </button>
                    <button
                      type="button"
                      onClick={() => fillSeed('viewer@edison.demo', 'EdisonViewer!2026')}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Household Viewer Seed
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {feedback && (
            <div
              role="status"
              className={`mt-4 p-3 rounded-lg text-xs border ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Server-Side RBAC & Audit Log Probe
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Verify that non-admin callers receive HTTP 403 while signed-in admins load the immutable audit trail.
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          </div>

          <button
            type="button"
            onClick={testAdminEndpoint}
            disabled={testingRbac}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {testingRbac ? 'Testing Endpoint...' : 'Test GET /api/admin/audit-logs'}
            </span>
          </button>

          {rbacResult && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  rbacResult.statusCode === 200
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                HTTP {rbacResult.statusCode} · {rbacResult.message}
              </div>

              {rbacResult.logs.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Action</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Actor Role</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rbacResult.logs.slice(0, 15).map((log) => (
                        <tr key={log.id}>
                          <td className="px-3 py-2 font-mono text-slate-800 whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                            {log.actorRole}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{log.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <CopyReportFooter
            reportText={reportText}
            reportTitle="Block 2.1 Auth & RBAC Status"
          />
        </div>
      </div>
    </div>
  );
}

interface QrEngineProps {
  currentUser: PublicUser | null;
  onSummaryRefresh: () => Promise<void>;
}

const DESTINATION_TYPES: { value: QrDestinationType; label: string }[] = [
  { value: 'website', label: 'Official Website' },
  { value: 'product', label: 'Product / Service Page' },
  { value: 'store', label: 'Online Store' },
  { value: 'whatsapp', label: 'WhatsApp Conversation' },
  { value: 'telephone', label: 'Telephone Number (E.164)' },
  { value: 'enquiry', label: 'Enquiry Form' },
  { value: 'job_application', label: 'Job Application' },
  { value: 'scholarship', label: 'Scholarship Application' },
  { value: 'training', label: 'Training Programme' },
  { value: 'grant_tender', label: 'Grant / Tender Application' },
  { value: 'other', label: 'Other Approved Destination' },
];

export function QrEngineView({ currentUser, onSummaryRefresh }: QrEngineProps) {
  const [label, setLabel] = useState('');
  const [destinationType, setDestinationType] = useState<QrDestinationType>('website');
  const [rawInput, setRawInput] = useState('https://example.org/edison-offer');
  const [validation, setValidation] = useState<QrValidationResult | null>(null);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('edison-demo');
  const [loadingList, setLoadingList] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [creating, setCreating] = useState(false);

  const loadQrLinks = useCallback(async () => {
    if (!currentUser) {
      setQrLinks([]);
      setEvents([]);
      return;
    }
    setLoadingList(true);
    try {
      const [qrRes, evtRes] = await Promise.all([edisonFetch('/api/qr'), edisonFetch('/api/qr/events')]);
      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrLinks(data.items);
        if (data.items.length > 0 && !data.items.some((x: QrLinkRecord) => x.token === selectedToken)) {
          setSelectedToken(data.items[0].token);
        }
      }
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        setEvents(evtData.items);
      }
    } finally {
      setLoadingList(false);
    }
  }, [currentUser, selectedToken]);

  useEffect(() => {
    loadQrLinks();
  }, [loadQrLinks]);

  const handleValidate = async (inputVal: string, typeVal: QrDestinationType) => {
    try {
      const res = await edisonFetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: inputVal, destinationType: typeVal }),
      });
      const data = (await res.json()) as QrValidationResult;
      setValidation(data);
    } catch {
      setValidation(null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      handleValidate(rawInput, destinationType);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [rawInput, destinationType]);

  const handleCreateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setCreating(true);
    try {
      const res = await edisonFetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, destinationType, rawInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Unable to create QR link.');
      } else {
        setLabel('');
        setSelectedToken(data.item.token);
        await loadQrLinks();
        await onSummaryRefresh();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (item: QrLinkRecord) => {
    const nextStatus = item.status === 'active' ? 'disabled' : 'active';
    const res = await edisonFetch(`/api/qr/${item.token}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadQrLinks();
    }
  };

  const activeQr = qrLinks.find((q) => q.token === selectedToken) ?? null;
  const redirectFullUrl = activeQr
    ? `${window.location.origin}/r/${activeQr.token}`
    : `${window.location.origin}/r/edison-demo`;

  const reportText = [
    'EDISON — BLOCK 2.1 QR VALIDATION & REDIRECT ENGINE REPORT',
    `Signed-in User: ${currentUser ? `${currentUser.email} (${currentUser.role})` : 'Signed out'}`,
    `Displayed QR Redirect URL: ${redirectFullUrl}`,
    `Resolved Final Destination: ${activeQr?.resolvedUrl ?? 'https://example.org/edison-commercial-demo'}`,
    `Redirect Requests Received: ${activeQr?.redirectRequestsTotal ?? 0}`,
    `HTTP 302 Redirects Issued: ${activeQr?.redirectIssuedTotal ?? 0}`,
    `Deduplicated Non-Bot Redirects: ${activeQr?.deduplicatedNonBotRedirects ?? 0}`,
    `Suspected Bot/Prefetch Requests: ${activeQr?.suspectedBotRequests ?? 0}`,
    'Verified Destination Opens: 0 (Not emitted by HTTP 302; requires independent target verification)',
    'Measurement Honesty: /r/:token records redirect_requested and redirect_issued only—never confirmed human QR scans or destination_opened.',
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-700 leading-relaxed">
        <strong className="text-slate-900">Measurement Honesty Standard:</strong>{' '}
        Requests to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/r/:token</code> record{' '}
        <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">redirect_requested</code> on receipt and{' '}
        <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">redirect_issued</code> when HTTP 302 is sent.
        EDISON does <strong>not</strong> record <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">destination_opened</code> without independent confirmation and does not equate every redirect hit with a confirmed human QR scan (User-Agent/prefetch bot filtering + 5s deduplication apply).
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              QR Destination Validator & Link Generator
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Blocks unsafe URI schemes, IP literals, and opaque third-party shorteners. Creates real HTTP 302 tracking redirects at /r/:token.
            </p>
          </div>

          <form onSubmit={handleCreateQr} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destination Type
                </label>
                <select
                  value={destinationType}
                  onChange={(e) => setDestinationType(e.target.value as QrDestinationType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DESTINATION_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Campaign / Link Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Autumn Apprenticeship Drive"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Destination URL or Phone Number
              </label>
              <input
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="https://example.org/apply or +442079460000"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDestinationType('website');
                    setRawInput('javascript:alert(1)');
                  }}
                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Test XSS Block
                </button>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDestinationType('website');
                    setRawInput('https://bit.ly/3xyz');
                  }}
                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Test Shortener Block
                </button>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDestinationType('whatsapp');
                    setRawInput('+447700900123');
                  }}
                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Test WhatsApp Normalisation
                </button>
              </div>
            </div>

            {validation && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  validation.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {validation.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Destination Validated · Host: {validation.resolvedHost}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Destination Blocked</span>
                    </>
                  )}
                </div>
                {validation.valid ? (
                  <p className="font-mono break-all">Normalised: {validation.normalisedUrl}</p>
                ) : (
                  <p>{validation.error}</p>
                )}
                {validation.warnings.map((w, idx) => (
                  <p key={idx} className="text-amber-800">
                    Note: {w}
                  </p>
                ))}
              </div>
            )}

            {submitError && (
              <p role="alert" className="text-xs text-red-700 font-medium">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={!currentUser || !validation?.valid || creating}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>
                {!currentUser
                  ? 'Sign In (Auth Console) to Save QR Link'
                  : creating
                  ? 'Creating Redirect...'
                  : 'Create Tracked QR Redirect'}
              </span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live Scannable QR Output</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Error Correction Level Q · Redirects directly via /r/:token
              </p>
            </div>
            {currentUser && (
              <button
                type="button"
                onClick={async () => {
                  await loadQrLinks();
                  await onSummaryRefresh();
                }}
                aria-label="Refresh QR redirect metrics"
                className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center text-center py-2 space-y-3">
            <QrCodePreview
              value={redirectFullUrl}
              size={196}
              label={activeQr?.label || 'EDISON Prototype QR'}
            />
            <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-slate-800 truncate">
                {activeQr?.label ?? 'Sample Redirect Preview (Sign in to manage tokens)'}
              </p>
              <p className="font-mono text-slate-600 break-all">Encoded: {redirectFullUrl}</p>
              <p className="font-mono text-slate-700 break-all">
                Target: {activeQr?.resolvedUrl ?? 'https://example.org/edison-commercial-demo'}
              </p>
              <p className="text-slate-700 tabular-nums">
                Requested: <strong>{activeQr?.redirectRequestsTotal ?? 0}</strong>
                <span className="text-slate-400 mx-1.5">·</span>
                302 Issued: <strong>{activeQr?.redirectIssuedTotal ?? 0}</strong>
                <span className="text-slate-400 mx-1.5">·</span>
                Non-Bot Dedup: <strong>{activeQr?.deduplicatedNonBotRedirects ?? 0}</strong>
              </p>
            </div>

            <a
              href={redirectFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                window.setTimeout(() => {
                  loadQrLinks();
                  onSummaryRefresh();
                }, 700);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Direct 302 Redirect in New Tab</span>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Persisted QR Redirect Registry
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {currentUser
              ? `Showing QR links accessible to ${currentUser.email} (${currentUser.role}).`
              : 'Sign in on the Auth & RBAC tab to list, create, and toggle your persisted QR redirects.'}
          </p>

          {currentUser && (
            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700">Token</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700">Label & Type</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700">Resolved Host</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Requested</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">302 Issued</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Non-Bot Dedup</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Bot/Prefetch</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700">Status</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {qrLinks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                        No QR links created for this account yet. Create one using the form above.
                      </td>
                    </tr>
                  ) : (
                    qrLinks.map((item) => (
                      <tr
                        key={item.token}
                        className={`hover:bg-slate-50 ${
                          selectedToken === item.token ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          /r/{item.token}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="text-slate-500">{item.destinationType}</p>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-700">{item.resolvedHost}</td>
                        <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-900">
                          {item.redirectRequestsTotal}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-900">
                          {item.redirectIssuedTotal}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-900">
                          {item.deduplicatedNonBotRedirects}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-600">
                          {item.suspectedBotRequests}
                        </td>
                        <td
                          className={`px-3.5 py-2.5 font-medium ${
                            item.status === 'active'
                              ? 'text-emerald-700'
                              : item.status === 'flagged'
                              ? 'text-red-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.status}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedToken(item.token)}
                            className="text-blue-700 hover:underline font-medium cursor-pointer"
                          >
                            Display QR
                          </button>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className="text-slate-700 hover:underline font-medium cursor-pointer"
                          >
                            {item.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {currentUser && events.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Redirect Telemetry Events (Real Measured)
            </h3>
            <div className="mt-2 overflow-x-auto border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">Event</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Token</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Bot/Prefetch</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Dedup</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Outcome</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.slice(0, 20).map((evt) => (
                    <tr key={evt.id}>
                      <td className="px-3 py-2 font-mono text-slate-900">{evt.eventType}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{evt.qrToken}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {evt.isSuspectedBot ? 'Suspected Bot/Prefetch' : 'Standard Client'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {evt.isDeduplicated ? 'Suppressed (5s)' : 'Unique Window'}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {evt.redirectOutcome ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-slate-500">
                        {evt.createdAt}
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
          reportTitle="Block 2.1 QR Validation & Redirect Report"
        />
      </div>
    </div>
  );
}
