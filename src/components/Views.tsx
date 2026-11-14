import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  FileText,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { EDISON_DOCUMENTS, DocCategory } from '../data/documents';
import {
  ROADMAP_PHASES,
  SMART_TV_MATRIX,
  PHASE1_CHECKLIST,
  ReportCommandType,
  generateFormalReport,
} from '../data/phase1Data';
import type { LiveReportSnapshot } from '../types/edison';
import { CopyReportFooter } from './CopyReportFooter';
import { MarkdownRenderer } from './MarkdownRenderer';

export function ReportsView() {
  const [selectedCommand, setSelectedCommand] = useState<ReportCommandType>('PHASE_1_COMPLETION');
  const [liveSnapshot, setLiveSnapshot] = useState<LiveReportSnapshot | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  const fetchLiveReport = useCallback(async () => {
    setLoadingLive(true);
    try {
      const res = await fetch('/api/reports/live', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as LiveReportSnapshot;
        setLiveSnapshot(data);
      }
    } catch {
      // Keep last known snapshot cleanly if server restarts
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveReport();
    const onFocus = () => fetchLiveReport();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(fetchLiveReport, 10000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [fetchLiveReport]);

  const report = useMemo(
    () => generateFormalReport(selectedCommand, liveSnapshot),
    [selectedCommand, liveSnapshot]
  );

  const commands: { id: ReportCommandType; label: string }[] = [
    { id: 'PHASE_1_COMPLETION', label: 'Block 2.7 Final Report' },
    { id: 'STATUS', label: 'STATUS' },
    { id: 'CHECK', label: 'CHECK' },
    { id: 'NEXT', label: 'NEXT' },
    { id: 'COMMIT', label: 'COMMIT' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Current Stage (Live)</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900">
            {liveSnapshot?.block ?? 'Phase 2 · Block 2.7'}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            {liveSnapshot?.gateStatus ?? 'VERIFIED · AWAITING COMMIT'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Live Store Telemetry</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
            {liveSnapshot
              ? `${liveSnapshot.summary.adCreativeCount} creatives · ${liveSnapshot.summary.campaignCount} campaigns`
              : 'Syncing live counts...'}
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {liveSnapshot
              ? `${liveSnapshot.summary.auditLogCount} audits · ${liveSnapshot.summary.qrCount} QR links`
              : 'Phase 1 + Blocks 2.1–2.2 committed'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Last Live Server Sync</p>
          <p className="mt-1.5 text-sm font-semibold font-mono tabular-nums text-slate-900 truncate">
            {liveSnapshot?.generatedAt ?? 'Connecting...'}
          </p>
          <p className="mt-1 text-xs text-slate-600">Auto-refreshes from /api/reports/live</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{report.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchLiveReport}
              disabled={loadingLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
              <span>Refresh Live</span>
            </button>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {commands.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    setSelectedCommand(cmd.id);
                    fetchLiveReport();
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCommand === cmd.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <pre className="mt-5 p-5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto select-all">
          {report.body}
        </pre>

        <CopyReportFooter reportText={report.body} reportTitle={report.title} />
      </div>
    </div>
  );
}

export function RoadmapView() {
  const reportText = useMemo(() => {
    const lines = [
      'EDISON — COMPLETE ROADMAP & ASSIGNMENT VERIFICATION REPORT',
      'Current Gate: Phase 2 · Block 2.7 (VERIFIED · AWAITING COMMIT)',
      'Committed Baseline: Phase 1 + Phase 2 Blocks 2.1–2.6',
      '',
      'PHASE 1 ASSIGNMENT CHECKLIST:',
      ...PHASE1_CHECKLIST.map((c) => `${c.id}. ${c.item} — [${c.status}]`),
      '',
      '15-PHASE ROADMAP:',
      ...ROADMAP_PHASES.map((p) => `Phase ${p.phase}: ${p.title} [${p.status}] — Gate: ${p.milestoneGate}`),
    ];
    return lines.join('\n');
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900">Phase 1 Assignment Checklist (Section 24)</h2>
        <p className="text-sm text-slate-600 mt-1">
          Verification status of all 17 first-assignment deliverables before transitioning to Phase 2.
        </p>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700 w-14">#</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700">Deliverable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700 w-48">Verified Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {PHASE1_CHECKLIST.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-slate-500">{item.id}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-800">{item.item}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900">Complete 15-Phase EDISON Development Roadmap</h2>
        <p className="text-sm text-slate-600 mt-1">
          Sequential lifecycle from Project Definition (Phase 1) through International Expansion (Phase 15).
        </p>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700 w-24">Phase</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700">Scope & Exit Gate</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-700 w-40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ROADMAP_PHASES.map((phase) => (
                <tr key={phase.phase} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs font-mono tabular-nums font-semibold text-slate-800 align-top">
                    Phase {phase.phase}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm font-medium text-slate-900">{phase.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{phase.summary}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Exit Gate: <span className="text-slate-700">{phase.milestoneGate}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium align-top whitespace-nowrap">
                    {phase.status === 'COMMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>COMMITTED</span>
                      </span>
                    ) : phase.status === 'IN PROGRESS' ? (
                      <span className="inline-flex items-center gap-1.5 text-blue-700">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>IN PROGRESS</span>
                      </span>
                    ) : phase.status === 'AWAITING COMMIT' ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>AWAITING COMMIT</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">{phase.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CopyReportFooter reportText={reportText} reportTitle="EDISON Complete Roadmap Report" />
      </div>
    </div>
  );
}

export function ResearchView() {
  const smartTvDoc = EDISON_DOCUMENTS.find((d) => d.id === 'smart-tv');
  const breakDoc = EDISON_DOCUMENTS.find((d) => d.id === 'break-detection');

  const fullResearchReport = useMemo(() => {
    return [
      smartTvDoc?.content ?? '',
      '\n---\n',
      breakDoc?.content ?? '',
    ].join('\n');
  }, [smartTvDoc, breakDoc]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Smart TV Platform Feasibility Matrix
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Preliminary documentation research distinguishing technical possibility, official support, platform permission, hardware testing, and production readiness.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-amber-700 whitespace-nowrap shrink-0">
            PRELIMINARY RESEARCH · NOT HARDWARE TESTED
          </span>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Platform</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Architecture Path</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">1. Possible</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">2. Documented</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">3. Permitted</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">4. HW Tested</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">5. Prod Suitable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {SMART_TV_MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 font-medium text-slate-900 align-top whitespace-nowrap">{row.platform}</td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-slate-800">{row.architecturePath}</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">{row.keyConstraints}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700 align-top whitespace-nowrap">{row.technicallyPossible}</td>
                  <td className="px-3 py-3 text-slate-700 align-top">{row.officiallyDocumented}</td>
                  <td className="px-3 py-3 text-slate-700 align-top">{row.platformPermitted}</td>
                  <td className="px-3 py-3 text-amber-700 align-top">{row.hardwareTested}</td>
                  <td
                    className={`px-3 py-3 font-semibold align-top whitespace-nowrap ${
                      row.productionSuitable.startsWith('NO') ? 'text-red-700' : 'text-blue-700'
                    }`}
                  >
                    {row.productionSuitable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {smartTvDoc && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <MarkdownRenderer content={smartTvDoc.content} />
          <hr className="my-8 border-slate-200" />
          {breakDoc && <MarkdownRenderer content={breakDoc.content} />}
          <CopyReportFooter
            reportText={fullResearchReport}
            reportTitle="Smart TV Compatibility & Break Detection Research Report"
          />
        </div>
      )}
    </div>
  );
}

export function DocsBrowserView() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DocCategory>('ALL');
  const [selectedDocId, setSelectedDocId] = useState<string>(EDISON_DOCUMENTS[0].id);
  const [rawMode, setRawMode] = useState(false);

  const categories: ('ALL' | DocCategory)[] = [
    'ALL',
    'Core & Governance',
    'Architecture & Smart TV',
    'Product & Studios',
    'Compliance, Risk & QA',
    'Coordination',
  ];

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EDISON_DOCUMENTS.filter((doc) => {
      const matchesCat = categoryFilter === 'ALL' || doc.category === categoryFilter;
      const matchesQuery =
        !q ||
        doc.filename.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [search, categoryFilter]);

  const activeDoc =
    EDISON_DOCUMENTS.find((d) => d.id === selectedDocId) ?? filteredDocs[0] ?? EDISON_DOCUMENTS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${EDISON_DOCUMENTS.length} documentation files...`}
            aria-label="Filter documentation files"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? `All (${EDISON_DOCUMENTS.length})` : cat}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-200 border-t border-slate-200 max-h-[560px] overflow-y-auto">
          {filteredDocs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No documentation files match your filter.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = activeDoc.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left py-3 px-2.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? 'text-blue-700' : 'text-slate-900'
                      }`}
                    >
                      {doc.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-mono text-slate-500 truncate">
                    {doc.filename}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono text-slate-500">{activeDoc.filename}</p>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{activeDoc.title}</h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setRawMode(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                !rawMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Formatted
            </button>
            <button
              type="button"
              onClick={() => setRawMode(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                rawMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Raw Markdown
            </button>
          </div>
        </div>

        <div className="mt-5">
          {rawMode ? (
            <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {activeDoc.content}
            </pre>
          ) : (
            <MarkdownRenderer content={activeDoc.content} />
          )}
        </div>

        <CopyReportFooter reportText={activeDoc.content} reportTitle={activeDoc.filename} />
      </div>
    </div>
  );
}

export function CommandCentreView() {
  const commandDoc = EDISON_DOCUMENTS.find((d) => d.id === 'command-center');
  if (!commandDoc) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                AI Studio & VS Code Copilot Command Centre
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                coordination/EDISON_COMMAND_CENTER.md · Manual owner-triggered sync only
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">
            COPILOT TASK STATUS: DRAFT (STANDBY)
          </span>
        </div>

        <div className="mt-5">
          <MarkdownRenderer content={commandDoc.content} />
        </div>

        <CopyReportFooter
          reportText={commandDoc.content}
          reportTitle="coordination/EDISON_COMMAND_CENTER.md"
        />
      </div>
    </div>
  );
}

export function RiskFmeaView() {
  const riskDoc = EDISON_DOCUMENTS.find((d) => d.id === 'risk-reg');
  const fmeaDoc = EDISON_DOCUMENTS.find((d) => d.id === 'fmea');
  const countryDoc = EDISON_DOCUMENTS.find((d) => d.id === 'country-reg');

  const [tab, setTab] = useState<'risk' | 'fmea' | 'country'>('risk');
  const activeDoc = tab === 'risk' ? riskDoc : tab === 'fmea' ? fmeaDoc : countryDoc;

  if (!activeDoc) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-slate-700 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Risk, Failure Modes & Country Compliance
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              TV-preservation fail-safe controls, trust & safety risks, and international statutory gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('risk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              tab === 'risk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Risk Register
          </button>
          <button
            type="button"
            onClick={() => setTab('fmea')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              tab === 'fmea' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            18 Failure Modes
          </button>
          <button
            type="button"
            onClick={() => setTab('country')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              tab === 'country' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Country Register
          </button>
        </div>
      </div>

      <div className="mt-5">
        <MarkdownRenderer content={activeDoc.content} />
      </div>

      <CopyReportFooter reportText={activeDoc.content} reportTitle={activeDoc.filename} />
    </div>
  );
}
