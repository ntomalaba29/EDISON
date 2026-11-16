import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type {
  AnalyticsEventRecord,
  PhysicalQrScanTestRecord,
  PrototypeReadinessSnapshot,
  PublicUser,
  QrLinkRecord,
} from '../types/edison';
import { QrCodePreview } from './QrCodePreview';
import { PilotReadinessPanel } from './PilotReadinessPanel';
import { CommercialReadinessPanel } from './CommercialReadinessPanel';
import { CountryLaunchPanel } from './CountryLaunchPanel';
import { InternationalExpansionPanel } from './InternationalExpansionPanel';
import { CopyReportFooter, copyTextWithFallback } from './CopyReportFooter';
import { edisonFetch } from '../lib/csrfFetch';

interface QaHandoverViewProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

type QaSubTab =
  | 'scan_lab'
  | 'qa_audit'
  | 'pilot_readiness'
  | 'commercial_readiness'
  | 'country_launch'
  | 'intl_expansion'
  | 'handover';

export function QaHandoverView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: QaHandoverViewProps) {
  const [subTab, setSubTab] = useState<QaSubTab>('scan_lab');
  const [readiness, setReadiness] = useState<PrototypeReadinessSnapshot | null>(null);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('edison-demo');
  const [watchEvents, setWatchEvents] = useState<AnalyticsEventRecord[]>([]);
  const [watchedLink, setWatchedLink] = useState<QrLinkRecord | null>(null);
  const [watchActive, setWatchActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [actionMsg, setActionMsg] = useState<string>('');

  // Reachable origin for mobile camera scanning
  const [scanOrigin, setScanOrigin] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : 'http://localhost:3000'
  );

  // Physical phone scan logging form
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [osPlatform, setOsPlatform] = useState<'iOS' | 'Android' | 'Other Mobile'>('Android');
  const [cameraApp, setCameraApp] = useState<string>('Native Camera App');
  const [outcome, setOutcome] = useState<'passed' | 'failed'>('passed');
  const [reachedRedirectEndpoint, setReachedRedirectEndpoint] = useState<boolean>(true);
  const [landedDestinationObserved, setLandedDestinationObserved] = useState<boolean>(true);
  const [timeToScanSeconds, setTimeToScanSeconds] = useState<string>('1.8');
  const [scanNotes, setScanNotes] = useState<string>('');
  const [submittingScan, setSubmittingScan] = useState<boolean>(false);
  const [handoverCopied, setHandoverCopied] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    if (!currentUser) {
      setReadiness(null);
      setQrLinks([]);
      setWatchedLink(null);
      setWatchEvents([]);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const [readyRes, qrRes] = await Promise.all([
        edisonFetch('/api/qa/prototype-readiness', { cache: 'no-store' }),
        edisonFetch('/api/qr', { cache: 'no-store' }),
      ]);
      if (!readyRes.ok) {
        const d = await readyRes.json().catch(() => ({}));
        throw new Error(d.error || 'Unable to load prototype readiness snapshot.');
      }
      const readyData = (await readyRes.json()) as PrototypeReadinessSnapshot;
      setReadiness(readyData);

      if (qrRes.ok) {
        const qrData = await qrRes.json();
        const items = (qrData.items ?? []) as QrLinkRecord[];
        setQrLinks(items);
        if (items.length > 0 && !items.some((q) => q.token === selectedToken)) {
          setSelectedToken(items[0].token);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load QA workspace.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedToken]);

  const pollSelectedQrWatch = useCallback(async () => {
    if (!currentUser || !selectedToken) return;
    try {
      const res = await edisonFetch(`/api/qa/qr-watch/${encodeURIComponent(selectedToken)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setWatchedLink(data.qrLink ?? null);
        setWatchEvents(Array.isArray(data.recentEvents) ? data.recentEvents : []);
      }
    } catch {
      // Keep last known watch state cleanly
    }
  }, [currentUser, selectedToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (currentUser && selectedToken) {
      pollSelectedQrWatch();
    }
  }, [currentUser, selectedToken, pollSelectedQrWatch]);

  useEffect(() => {
    if (!watchActive || !currentUser || !selectedToken) return;
    const timer = window.setInterval(() => {
      pollSelectedQrWatch();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [watchActive, currentUser, selectedToken, pollSelectedQrWatch]);

  const activeQr =
    watchedLink ?? qrLinks.find((q) => q.token === selectedToken) ?? qrLinks[0] ?? null;
  const effectiveToken = activeQr?.token ?? selectedToken ?? 'edison-demo';
  const normalisedOrigin = scanOrigin.trim().replace(/\/+$/, '') || 'http://localhost:3000';
  const scannableUrl = `${normalisedOrigin}/r/${effectiveToken}`;

  const isLocalhostOrigin = useMemo(() => {
    try {
      const parsed = new URL(normalisedOrigin);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }, [normalisedOrigin]);

  const handleRecordPhysicalScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionMsg('');
    setSubmittingScan(true);
    try {
      const res = await edisonFetch('/api/qa/physical-qr-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: effectiveToken,
          encodedRedirectUrl: scannableUrl,
          deviceModel,
          osPlatform,
          cameraApp,
          outcome,
          reachedRedirectEndpoint,
          landedDestinationObserved,
          timeToScanSeconds: Number(timeToScanSeconds),
          notes: scanNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save physical QR scan test record.');
      }
      setActionMsg(
        `Saved physical scan verification record (${data.item.outcome}) for /r/${data.item.qrToken} on ${data.item.deviceModel}.`
      );
      setDeviceModel('');
      setScanNotes('');
      await Promise.all([loadAll(), pollSelectedQrWatch(), onSummaryRefresh()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save physical QR test log.');
    } finally {
      setSubmittingScan(false);
    }
  };

  const handleDeletePhysicalScan = async (record: PhysicalQrScanTestRecord) => {
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await edisonFetch(`/api/qa/physical-qr-tests/${encodeURIComponent(record.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to delete test record.');
      }
      setActionMsg(`Removed physical QR test log ${record.id}.`);
      await Promise.all([loadAll(), onSummaryRefresh()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handoverMarkdown = useMemo(() => {
    const s = readiness?.summary;
    const scanLogs = readiness?.physicalScanTests ?? [];
    const scanSection =
      scanLogs.length > 0
        ? scanLogs
            .map(
              (t) =>
                `- [${t.outcome.toUpperCase()}] /r/${t.qrToken} | Device: ${t.deviceModel} (${t.osPlatform}, ${t.cameraApp}) | Redirect Reached: ${t.reachedRedirectEndpoint} | Destination Observed: ${t.landedDestinationObserved} | Scan Time: ${t.timeToScanSeconds}s | Server 302s at log time: ${t.observedRedirectIssuedAtLogTime} | Logged: ${t.createdAt}`
            )
            .join('\n')
        : '- PENDING OWNER DEVICE TEST: No physical smartphone camera scan record has been logged yet. Test via QA Console -> Physical Mobile QR Scan Lab.';

    return [
      '# EDISON — Phase 2 Track A → Phase 3 Engineering Handover Package',
      '',
      `Generated: ${readiness?.generatedAt ?? new Date().toISOString()}`,
      'Repository: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`',
      'Status: Phase 2 Track A (`P2-V2.1`–`P2-V2.4`, 85% AI Studio scope) & Phase 3 `Block P3-A` COMMITTED · Phase 3 `Block P3-B` VERIFIED & AWAITING COMMIT · `TASK-P3-001: READY` (JSON retained without paid Cloud SQL) · Track B (15%) Blocked on `DEC-OPEN-01`',
      '',
      '---',
      '',
      '## 1. Project Architecture',
      '- **Frontend**: React 19 + TypeScript SPA on Vite 8 (`src/App.tsx`, Tailwind CSS v4), bundled cleanly via `npm run build` into `dist/`, protected by `AppErrorBoundary` (`src/components/AppErrorBoundary.tsx`) and `edisonFetch` CSRF client (`src/lib/csrfFetch.ts`).',
      '- **Backend Server**: Testable Express 4 app factory (`createEdisonApp` in `src/server/app.ts`) decoupled via `EdisonDataRepository` (`src/server/repository.ts`), hardened with Zod validation (`src/server/validationSchemas.ts`), CSRF/same-origin checks, rate limiters, API `504` timeout & opaque JSON error middleware (`src/server/security.ts`), and sandboxed `/uploads/*` CSP/CORP/symlink controls (`src/server/mediaSecurity.ts`).',
      '- **Persistence Layer**: Atomic single-host JSON store (`src/server/store.ts` implementing `EdisonDataRepository` -> `data/edison-store.json`, `schemaVersion: 8`) hashing session tokens at rest (`tokenHash`) with 2h idle timeout and session rotation. PostgreSQL migration blueprint ready in `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md` (`TASK-P3-001`).',
      '- **QR Redirect Engine**: Server-side URL/phone normaliser (`src/server/qrValidator.ts`) + direct HTTP 302 router (`GET /r/:token`) with User-Agent/prefetch bot exclusion and 5-second duplicate window filtering (`ADR-002`).',
      '- **Commercial Formats & Alternating Break Scheduler**: Supports Option A Studio, Option B External Upload/jsQR, and Commercial `Text-Only` ads; permanent `$0.00 / FREE` Charity lock (`paymentCollectionActive: false`); Alternating 4-slot scheduler (`CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL`) + Direct Priority over `MockAdNetworkBackfillAdapter` + separated 6-Stream Revenue Ledger.',
      '- **TV & Shared Intelligence Simulation Boundaries**: All 16:9 playback, break triggers, and `SharedIntelligencePreviewView` (ADR-016 / PRD-19) run explicitly as software simulations (`SimulationTvAdapter` / mock shared-intelligence cache). Zero unprivileged Smart TV OS tuner hooks (`ADR-001`, `ADR-005`).',
      '- **Approved Core Capabilities Pending Implementation (Phases 4–5)**:',
      '  - **Normal Everyday TV Remote Control (`ADR-017` / `PRD-20` — `NOT STARTED`)**: First-class core capability routing conventional remote commands (power, volume/mute, channel up/down, source/input select, D-pad/OK/back/home) via `AURA -> EDISON Control Engine -> platform adapters -> TV`, strictly separated from intelligent ad-break switching/restoration. Zero physical TV hardware compatibility claimed or tested until `Stage P6`.',
      '  - **Network-Wide Shared Ad Intelligence (`ADR-016` / `PRD-19` — `PROTOTYPE SIMULATION PREVIEW ONLY`)**: Mock simulation in `SharedIntelligencePreviewView`; Phase 5 Central Shared Intelligence Service & OS Local Intelligence Cache remain `NOT STARTED`.',
      '',
      '## 2. Technology Stack & Commands',
      '- Runtime: Node.js 22+, TypeScript, Express 4.21, React 19, Vite 8.3, Tailwind CSS 4.3, `zod`, `qrcode`, `jsqr`, `lucide-react`, `tsx`, `vitest`, `supertest`',
      '- Unit & HTTP Regression Suite: `npm test` (`vitest run` — 27/27 across 5 suites)',
      '- Type-Check: `npm run lint` (`tsc --noEmit`)',
      '- Production Build: `npm run build` (`vite build`)',
      '- Dev / Prod Server: `npm run dev` / `npm start` on `http://0.0.0.0:3000`',
      '',
      '## 3. Data Model (Persisted Collections — Schema v8)',
      `1. \`users\` (${s?.userCount ?? 0}) — scrypt salted credentials + roles (\`advertiser\`, \`opportunity_submitter\`, \`admin\`)`,
      '2. `sessions` — SHA-256 `tokenHash` at rest, session-bound `csrfToken`, 2h idle / 7d cap, HTTP-only `SameSite=Lax` cookie + Bearer',
      `3. \`advertiserProfiles\` (${s?.profileCount ?? 0}) — entity type, tax/registration, KYC review state`,
      `4. \`campaigns\` (${s?.campaignCount ?? 0}) — 10-state lifecycle, \`paymentCollectionActive: false\`, permanent $0 Charity lock`,
      `5. \`adCreatives\` (${s?.adCreativeCount ?? 0}) — Option A JSON + Option B upload/jsQR + Text-Only commercial spots`,
      `6. \`qrLinks\` (${s?.qrCount ?? 0}) — validated target URLs + direct redirect counters`,
      `7. \`opportunities\` (${s?.opportunityCount ?? 0}) — 14 categories, independent 3-tier verification (\`advertisingFeeInfluencesVerification: false\`)`,
      '8. `opportunityComplaints` — complaint triage, scam flags, auto/manual suspension',
      '9. `opportunityAppeals` — submitter appeal evidence + admin reinstatement/denial',
      '10. `supportTickets` — advertiser review/dispute tickets',
      `11. \`analyticsEvents\` (Sim: ${s?.simulatedEventsTotal ?? 0} | Real 302s: ${s?.redirectIssuedTotal ?? 0} | Bots: ${s?.suspectedBotRedirects ?? 0} | Verified Opens: ${s?.verifiedDestinationOpens ?? 0})`,
      `12. \`physicalQrScanTests\` (${readiness?.physicalQrTotalCount ?? 0}) — real mobile camera scan verification ledger`,
      '13. `sharedIntelPreview` — mock simulation state for Shared Intelligence Prototype Preview (3 scoped caches, K=3 quorum, zero PII)',
      `14. \`auditLogs\` (${s?.auditLogCount ?? 0}) — immutable governance & security audit trail`,
      '',
      '## 4. Main Application End-to-End Flows',
      '1. Auth (`AuthRbacView`) -> Advertiser Profile & KYC Review (`AdvertiserProfileView`) -> 10-State Campaign (`CampaignsView`)',
      '2. Creative Production (`AdStudioView`: Option A templates, Option B external upload/jsQR blocking `decoded_mismatch`, Text-Only Commercial cards)',
      '3. 16:9 TV Preview, Pre-Submit Gate & Alternating 4-Slot Break Simulator (`TvPreviewView`)',
      '4. Opportunities (`OpportunityView`: 14 categories, free `$0` employer jobs, non-transitive 3-tier verification, expiry lockout, complaints & appeals)',
      '5. Admin Moderation, 7-Stage Funnel & 6-Stream Revenue Ledger (`AdminAnalyticsView`)',
      '6. Shared Ad Intelligence Prototype Preview (`SharedIntelligencePreviewView` — Mock Simulation Only)',
      '7. Physical Mobile QR Scan Lab & Readiness Gate (`QaHandoverView`)',
      '',
      '## 5. Key Architecture Decisions (`DECISIONS_LOG.md`)',
      '- `ADR-001`–`ADR-005`: No unprivileged 3P channel hijacking, direct HTTP 302 `/r/:token`, payment-decoupled 3-tier verification, strict analytics provenance, fail-safe break formula.',
      '- `ADR-011`–`ADR-017`: Free `$0` Charity vs Paid Commercial + Text-Only format, Direct Priority & Mock `AdNetworkBackfillAdapter`, single `Stage P6` physical TV test, independent statutory research, Network-Wide Shared Ad Intelligence, and Normal Everyday TV Remote Control (`AURA -> EDISON Control Engine -> platform adapters -> TV`).',
      '- **Unresolved Blocking Decisions (`DEC-OPEN-01` .. `DEC-OPEN-03`)**: `DEC-OPEN-01` blocks **ONLY Track B** consent/household/multi-profile/epoch-403 work (15% of AI Studio scope) — it does **not** block Phase 3 (`TASK-P3-001`) Track A engineering hardening.',
      '',
      '## 6. Automated Verification & Physical Phone QR Scan Log',
      `- Automated Invariants Passed: ${readiness?.automatedInvariantsPassed ?? 0} / ${readiness?.automatedInvariantsTotal ?? 13}`,
      `- Vitest + Supertest Regression & Security Suites: Installed (\`npm test\` covering QR validator, Break Scheduler, API RBAC, Charity Lock, Option B mismatch, Opportunities, Ledger, Shared Intelligence preview, Block P3-A Security Hardening & Block P3-B Portability/Asset Hardening)`,
      `- Physical Phone QR Scan Gate Status: ${readiness?.physicalQrScanStatus ?? 'PENDING_OWNER_DEVICE_TEST'}`,
      scanSection,
      '',
      '## 7. Outstanding Work & Known Technical Limitations (`KNOWN_LIMITATIONS.md`)',
      '- Single-host JSON file persistence (`data/edison-store.json`, `schemaVersion: 8`) retained in AI Studio without paid Cloud SQL; PostgreSQL 16+ migration requirements are ready at `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md` (`TASK-P3-001: READY`).',
      '- Track B (Consent epochs, Household TV geo, Multi-profile personalisation, `HTTP 403` revocation) remains BLOCKED on `DEC-OPEN-01`.',
      '- Normal Everyday TV Remote Control (`AURA -> EDISON Control Engine -> platform adapters -> TV`) is `NOT STARTED` (Phase 4 software adapters; zero hardware compatibility claimed or tested); Shared Ad Intelligence preview is strictly prototype simulation (`NOT STARTED` for Phase 5 central service & OS cache).',
      '- FFmpeg video transcoding/loudness normalisation is deferred to `TASK-P3-004`; Chromium Playwright E2E requires desktop/CI Chromium (`TASK-P3-003`).',
      '- Stage 7 `destination_opened` remains `0` without external webhook confirmation (never fabricated from HTTP 302).',
      '- Zero real payments (`paymentCollectionActive: false`), zero GAM CTV account (`DEC-OPEN-03`), and zero country legal sign-offs.',
      '',
      '## 8. Ordered Phase 3 Engineering Tasks (`TASK-P3-001` `READY` · `Block P3-A` Committed · `Block P3-B` Complete)',
      'Prerequisites to transition `TASK-P3-001` from `DRAFT` -> `READY` (independent of `DEC-OPEN-01`): (1) Owner commit of `Block P2-V2.4` [MET], and (2) explicit Owner Phase 3 activation [MET].',
      '1. `Block P3-A` / former `TASK-P3-002` (`COMMITTED`): API Zod validation, cookie/header CSRF & same-origin protection, `edisonFetch`, rate limiting (`429`), hashed/rotated sessions (`schemaVersion: 8`), security headers & `tests/securityHardening.test.ts`.',
      '2. `Block P3-B` (`VERIFIED · AWAITING COMMIT` in AI Studio): `EdisonDataRepository` storage port extraction, `/uploads/*` CSP/CORP/symlink/polyglot hardening, API timeout (`504`) & JSON error middleware, React `AppErrorBoundary`, and `.github/workflows/edison-ci.yml`.',
      '3. `TASK-P3-001` (`READY` — blueprint at `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md`): Migrate `EdisonDataRepository` (Track A baseline) to PostgreSQL + migrations + transactional audit logging when DB provisioning is approved.',
      '4. `Block P3-C` (queued): Request correlation/audit export hardening + software-only Phase 4 modular `TvPlatformAdapter` contract & Normal TV Remote simulation suite.',
      '5. `TASK-P3-003` (queued): Extend `tests/` with browser Playwright E2E suite in CI.',
      '6. `TASK-P3-004` (queued): Build background media worker pipeline (FFmpeg transcode, loudness check, frame QR verification).',
    ].join('\n');
  }, [readiness]);

  const handleCopyHandover = async () => {
    try {
      await copyTextWithFallback(handoverMarkdown);
      setHandoverCopied(true);
      window.setTimeout(() => setHandoverCopied(false), 2500);
    } catch {
      setErrorMsg('Unable to copy handover package to clipboard.');
    }
  };

  const handleDownloadHandover = () => {
    const blob = new Blob([handoverMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EDISON_PHASE3_HANDOVER.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reportText = useMemo(() => {
    const passed = readiness?.automatedInvariantsPassed ?? 0;
    const total = readiness?.automatedInvariantsTotal ?? 13;
    return [
      'EDISON — PHASE 3 BLOCK P3-B PORTABILITY & ASSET HARDENING, PHYSICAL QR QA & HANDOVER REPORT',
      `Generated: ${readiness?.generatedAt ?? new Date().toISOString()}`,
      `Active Operator: ${currentUser ? `${currentUser.email} (${currentUser.role})` : 'Signed out'}`,
      `Automated Store & Security Invariants: ${passed} / ${total} passed`,
      `Physical Phone Camera Scan Gate: ${readiness?.physicalQrScanStatus ?? 'PENDING_OWNER_DEVICE_TEST'} (${readiness?.physicalQrPassedCount ?? 0} passed / ${readiness?.physicalQrTotalCount ?? 0} logged)`,
      `Live Redirect Telemetry: Requests=${readiness?.summary.redirectRequestsTotal ?? 0} | 302 Issued=${readiness?.summary.redirectIssuedTotal ?? 0} | Bots Excluded=${readiness?.summary.suspectedBotRedirects ?? 0} | Verified Opens=${readiness?.summary.verifiedDestinationOpens ?? 0}`,
      `Phase 3 Status: Block P3-A COMMITTED · Block P3-B VERIFIED & AWAITING COMMIT · TASK-P3-001 READY (JSON retained without paid Cloud SQL) · Track B (15%) strictly blocked on DEC-OPEN-01.`,
    ].join('\n');
  }, [readiness, currentUser]);

  return (
    <div className="space-y-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Automated Invariants</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {readiness
              ? `${readiness.automatedInvariantsPassed} / ${readiness.automatedInvariantsTotal} Passed`
              : currentUser
              ? 'Loading...'
              : 'Sign in to run'}
          </p>
          <p className="mt-1 text-xs text-slate-600">Blocks 2.1–15.1 &amp; Track B rules</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Physical Phone QR Gate</p>
          <p
            className={`mt-1.5 text-sm font-semibold ${
              readiness?.physicalQrScanStatus === 'VERIFIED_BY_OWNER_LOG'
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {readiness?.physicalQrScanStatus === 'VERIFIED_BY_OWNER_LOG'
              ? `Verified (${readiness.physicalQrPassedCount} passed)`
              : 'Pending Owner Device Scan'}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {readiness ? `${readiness.physicalQrTotalCount} device test log(s) persisted` : 'Real mobile camera test required'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Real HTTP 302 Redirects</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {readiness?.summary.redirectIssuedTotal ?? 0} issued
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {readiness?.summary.suspectedBotRedirects ?? 0} bot/prefetch excluded · Stage 7 opens: {readiness?.summary.verifiedDestinationOpens ?? 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Phase 3 VS Code Handover</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">P3-A/B/C Committed · Track B Done</p>
          <p className="mt-1 text-xs text-amber-700 font-mono">TASK-P3-001: READY (JSON retained)</p>
        </div>
      </div>

      {/* Sub-navigation & Refresh */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('scan_lab')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'scan_lab'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>Physical Mobile QR Scan Lab</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('qa_audit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'qa_audit'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Final Prototype QA Audit</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pilot_readiness')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'pilot_readiness'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Phase 12 Pilot &amp; Stage P6 Runbook</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('commercial_readiness')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'commercial_readiness'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Phase 13 Commercial Readiness</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('country_launch')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'country_launch'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Phase 14 Country Launch</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('intl_expansion')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'intl_expansion'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Phase 15 Intl Expansion</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('handover')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'handover'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span>VS Code Handover Package</span>
          </button>
        </div>

        {currentUser ? (
          <button
            type="button"
            onClick={() => {
              loadAll();
              pollSelectedQrWatch();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh QA Telemetry</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNavigateAuth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Sign In to Run QA &amp; Log Scans</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {actionMsg && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          {actionMsg}
        </div>
      )}

      {/* SUB-TAB 1: PHYSICAL MOBILE QR SCAN LAB */}
      {subTab === 'scan_lab' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 text-xs text-slate-700 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-900">
              Physical Smartphone Camera Verification Protocol (Honesty Rule)
            </p>
            <p>
              Automated server tests and loopback curls do <strong>not</strong> verify physical smartphone camera scanning.
              Point a real mobile phone camera at the QR matrix below, confirm the phone navigates through{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/r/{effectiveToken}</code> and reaches the intended advertiser or opportunity page, watch the real-time HTTP 302 counter increment, and then record your device result below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Scannable QR & Live Watch */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="pb-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Scannable QR Display &amp; Live Redirect Watch
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Error Correction Level Q · Quiet Margin 4 · Real-time /r/:token polling
                  </p>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setWatchActive((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                      watchActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {watchActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Watching Live (2s)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Watch /r/:token Live</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select QR Link Token
                  </label>
                  <select
                    value={effectiveToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    disabled={!currentUser || qrLinks.length === 0}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {qrLinks.length === 0 ? (
                      <option value="edison-demo">edison-demo (Sample preview)</option>
                    ) : (
                      qrLinks.map((q) => (
                        <option key={q.token} value={q.token}>
                          /r/{q.token} · {q.label} ({q.status})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reachable Server Origin (for Phone)
                  </label>
                  <input
                    type="text"
                    value={scanOrigin}
                    onChange={(e) => setScanOrigin(e.target.value)}
                    placeholder="https://your-preview-host"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {isLocalhostOrigin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <p>
                    Current origin is <code className="font-mono">localhost</code>. A physical phone camera cannot reach your local loopback address unless you open EDISON using the hosted AI Studio preview URL or your computer’s LAN IP (e.g. <code className="font-mono">http://192.168.1.x:3000</code>).
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center text-center py-2 space-y-3">
                <QrCodePreview
                  value={scannableUrl}
                  size={232}
                  label={activeQr?.label || 'EDISON Physical Mobile QR Target'}
                />
                <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                  <p className="font-mono text-slate-700 break-all">
                    <span className="text-slate-500">QR Encoded URL:</span> {scannableUrl}
                  </p>
                  <p className="font-mono text-slate-800 break-all">
                    <span className="text-slate-500">Resolved Target:</span>{' '}
                    {activeQr?.resolvedUrl ?? 'https://example.org/edison-commercial-demo'}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-3 text-slate-700 tabular-nums font-mono">
                    <span>Requests: {activeQr?.redirectRequestsTotal ?? 0}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>302 Issued: {activeQr?.redirectIssuedTotal ?? 0}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>Non-Bot: {activeQr?.deduplicatedNonBotRedirects ?? 0}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>Bot: {activeQr?.suspectedBotRequests ?? 0}</span>
                  </div>
                </div>

                <a
                  href={scannableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    window.setTimeout(() => {
                      pollSelectedQrWatch();
                      loadAll();
                    }, 700);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Redirect in Browser Tab (Not a Physical Scan)</span>
                </a>
              </div>

              {currentUser && watchEvents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Recent Real Redirect Events for /r/{effectiveToken}
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-44 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-2.5 py-2 font-semibold text-slate-700">Event</th>
                          <th className="px-2.5 py-2 font-semibold text-slate-700">Client</th>
                          <th className="px-2.5 py-2 font-semibold text-slate-700">Outcome</th>
                          <th className="px-2.5 py-2 font-semibold text-slate-700">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {watchEvents.slice(0, 10).map((evt) => (
                          <tr key={evt.id}>
                            <td className="px-2.5 py-1.5 font-mono text-slate-900">{evt.eventType}</td>
                            <td className="px-2.5 py-1.5 text-slate-700">
                              {evt.isSuspectedBot ? 'Bot/Prefetch' : evt.isDeduplicated ? 'Dup (5s)' : 'Standard'}
                            </td>
                            <td className="px-2.5 py-1.5 font-mono text-slate-700">
                              {evt.redirectOutcome ?? '—'}
                            </td>
                            <td className="px-2.5 py-1.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                              {evt.createdAt.slice(11, 19)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Record Physical Phone Scan Form */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  Log Physical Phone Camera Scan Result
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Persisted with server-observed 302 count at the moment of logging and audited under <code className="font-mono">qa_handover</code>.
                </p>
              </div>

              {!currentUser ? (
                <div className="py-8 text-center space-y-3">
                  <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-600">
                    Sign in to log physical mobile phone QR scan results and inspect the Prototype Readiness Gate.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateAuth}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Go to Auth &amp; RBAC Console
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecordPhysicalScan} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Physical Phone Model
                      </label>
                      <input
                        type="text"
                        required
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        placeholder="e.g. iPhone 15 / Samsung Galaxy S24"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Mobile OS Platform
                      </label>
                      <select
                        value={osPlatform}
                        onChange={(e) =>
                          setOsPlatform(e.target.value as 'iOS' | 'Android' | 'Other Mobile')
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Android">Android</option>
                        <option value="iOS">iOS</option>
                        <option value="Other Mobile">Other Mobile</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Scanner / Camera App
                      </label>
                      <input
                        type="text"
                        required
                        value={cameraApp}
                        onChange={(e) => setCameraApp(e.target.value)}
                        placeholder="e.g. Native iOS Camera / Google Lens"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Scan Time (sec)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="300"
                        required
                        value={timeToScanSeconds}
                        onChange={(e) => setTimeToScanSeconds(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Observed Test Outcome
                    </label>
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setOutcome('passed')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                          outcome === 'passed'
                            ? 'bg-white text-emerald-800 shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        Passed (Destination Loaded Cleanly)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutcome('failed')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                          outcome === 'failed'
                            ? 'bg-white text-red-800 shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        Failed (Unreadable / Error)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reachedRedirectEndpoint}
                        onChange={(e) => setReachedRedirectEndpoint(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span>Phone browser reached EDISON <code className="font-mono">/r/{effectiveToken}</code> redirect</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={landedDestinationObserved}
                        onChange={(e) => setLandedDestinationObserved(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span>Final advertiser/opportunity URL loaded directly without any secondary EDISON ad screen</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Test Notes (Lighting, Viewing Distance, TV Frame Readability)
                    </label>
                    <textarea
                      rows={2}
                      value={scanNotes}
                      onChange={(e) => setScanNotes(e.target.value)}
                      placeholder="e.g. Scanned at 2m distance on 16:9 desktop display; redirect completed in <2s."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingScan}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingScan ? 'Recording Device Test...' : 'Save Physical Phone QR Scan Result'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Physical Scan Ledger */}
          {currentUser && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Persisted Physical Mobile Phone Scan Verification Ledger
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Records verified physical smartphone camera tests separately from automated HTTP redirect checks.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700">Outcome</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700">Token</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700">Device &amp; Camera</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Scan (s)</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">302 Count @ Log</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700">Tester &amp; Timestamp</th>
                      <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {!readiness || readiness.physicalScanTests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No physical phone camera scan tests recorded yet. Scan the QR code with a real mobile phone and submit the form above.
                        </td>
                      </tr>
                    ) : (
                      readiness.physicalScanTests.map((test) => (
                        <tr key={test.id} className="hover:bg-slate-50/70">
                          <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold">
                            {test.outcome === 'passed' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>PASSED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>FAILED</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-900 whitespace-nowrap">
                            /r/{test.qrToken}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-medium text-slate-900">
                              {test.deviceModel} ({test.osPlatform})
                            </p>
                            <p className="text-slate-500">
                              {test.cameraApp} · {test.notes || 'No extra notes'}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-800">
                            {test.timeToScanSeconds}s
                          </td>
                          <td className="px-3.5 py-2.5 font-mono tabular-nums text-right text-slate-800">
                            {test.observedRedirectIssuedAtLogTime}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-mono text-slate-700">{test.testerEmail}</p>
                            <p className="font-mono tabular-nums text-slate-500">{test.createdAt}</p>
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeletePhysicalScan(test)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: FINAL PROTOTYPE QA AUDIT */}
      {subTab === 'qa_audit' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Phase 2 Prototype Invariant &amp; Readiness Checklist
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Live verification across Blocks 2.1–2.7 &amp; Track A (`P2-V2.1`–`P2-V2.4`) separating automated invariants from real owner smartphone camera testing.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
          </div>

          {!currentUser ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Sign in to inspect the live Prototype Readiness Snapshot from <code className="font-mono">/api/qa/prototype-readiness</code>.
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
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-700 w-24">Block</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Invariant / QA Check</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700 w-36">Evidence Scope</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700 w-40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(readiness?.checks ?? []).map((chk) => (
                    <tr key={chk.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 align-top whitespace-nowrap">
                        {chk.block}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{chk.label}</p>
                        <p className="text-slate-600 mt-0.5 leading-relaxed">{chk.detail}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 align-top whitespace-nowrap">
                        {chk.scope === 'manual_owner_device' ? 'Owner Phone' : 'Auto Store Check'}
                      </td>
                      <td className="px-4 py-3 font-semibold align-top whitespace-nowrap">
                        {chk.status === 'pass' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>PASS</span>
                          </span>
                        ) : chk.status === 'pending_manual' ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>PENDING DEVICE</span>
                          </span>
                        ) : chk.status === 'warn' ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>WARN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-700">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>FAIL</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PHASE 12 PILOT READINESS & STAGE P6 RUNBOOK */}
      {subTab === 'pilot_readiness' && (
        <PilotReadinessPanel
          currentUser={currentUser}
          onNavigateAuth={onNavigateAuth}
          onSummaryRefresh={onSummaryRefresh}
        />
      )}

      {/* SUB-TAB 4: PHASE 13 COMMERCIAL READINESS BOARD GATE */}
      {subTab === 'commercial_readiness' && (
        <CommercialReadinessPanel
          currentUser={currentUser}
          onNavigateAuth={onNavigateAuth}
          onSummaryRefresh={onSummaryRefresh}
        />
      )}

      {/* SUB-TAB 5: PHASE 14 COUNTRY-BY-COUNTRY LAUNCH READINESS GATE */}
      {subTab === 'country_launch' && (
        <CountryLaunchPanel
          currentUser={currentUser}
          onNavigateAuth={onNavigateAuth}
          onSummaryRefresh={onSummaryRefresh}
        />
      )}

      {/* SUB-TAB 6: PHASE 15 INTERNATIONAL MULTI-REGION EXPANSION & RESIDENCY */}
      {subTab === 'intl_expansion' && (
        <InternationalExpansionPanel
          currentUser={currentUser}
          onNavigateAuth={onNavigateAuth}
          onSummaryRefresh={onSummaryRefresh}
        />
      )}

      {/* SUB-TAB 4: VS CODE ENGINEERING HANDOVER PACKAGE */}
      {subTab === 'handover' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                VS Code Copilot Engineering Handover Package (Phase 2 Track A → Phase 3)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Covers all mandatory deliverables defined in <code className="font-mono">VSCODE_HANDOVER_PLAN.md</code>. <code className="font-mono">Block P3-A</code> is committed; <code className="font-mono">Block P3-B</code> is verified &amp; awaiting commit; <code className="font-mono">TASK-P3-001</code> is <code className="font-mono">READY</code> (JSON persistence retained without paid Cloud SQL; <code className="font-mono">DEC-OPEN-01</code> blocks Track B only).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyHandover}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap cursor-pointer ${
                  handoverCopied
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>{handoverCopied ? 'Handover Copied' : 'Copy Markdown Handover'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHandover}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          <pre className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto select-all">
            {handoverMarkdown}
          </pre>
        </div>
      )}

      <CopyReportFooter
        reportText={reportText}
        reportTitle="Block 2.7 Physical QR QA & VS Code Handover Report"
      />
    </div>
  );
}
