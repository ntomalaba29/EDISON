import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Map,
  Tv,
  FolderGit2,
  Terminal,
  ShieldAlert,
  Menu,
  X,
  KeyRound,
  QrCode,
  Building2,
  Megaphone,
  Palette,
  Check,
  Copy,
  MonitorPlay,
  Briefcase,
  BarChart3,
  Smartphone,
} from 'lucide-react';
import {
  ReportsView,
  RoadmapView,
  ResearchView,
  DocsBrowserView,
  CommandCentreView,
  RiskFmeaView,
} from './components/Views';
import { AuthRbacView, QrEngineView } from './components/FoundationViews';
import { AdvertiserProfileView, CampaignsView } from './components/CampaignViews';
import { AdStudioView } from './components/AdStudioView';
import { TvPreviewView, type TvPreviewSubTab } from './components/TvPreviewView';
import { OpportunityView } from './components/OpportunityView';
import { AdminAnalyticsView } from './components/AdminAnalyticsView';
import { QaHandoverView } from './components/QaHandoverView';
import { SharedIntelligencePreviewView } from './components/SharedIntelligencePreviewView';
import { HouseholdPrivacyView } from './components/HouseholdPrivacyView';
import { COMMIT_AND_NEXT_MESSAGE, copyTextWithFallback } from './components/CopyReportFooter';
import { EDISON_DOCUMENTS } from './data/documents';
import { edisonFetch } from './lib/csrfFetch';
import type { PublicUser } from './types/edison';

type NavTab =
  | 'auth'
  | 'household'
  | 'profile'
  | 'campaigns'
  | 'studio'
  | 'tv_preview'
  | 'opportunities'
  | 'admin_analytics'
  | 'shared_intel'
  | 'qa_handover'
  | 'qr'
  | 'reports'
  | 'roadmap'
  | 'research'
  | 'docs'
  | 'command'
  | 'risks';

interface FoundationSummary {
  userCount: number;
  qrCount: number;
  campaignCount?: number;
  activeCampaignCount?: number;
  adCreativeCount?: number;
  profileCount?: number;
  openTicketCount?: number;
  redirectRequestsTotal: number;
  redirectIssuedTotal: number;
  suspectedBotRedirects: number;
  verifiedDestinationOpens: number;
  auditLogCount: number;
  storagePath: string;
}

const PROTOTYPE_NAV: { id: NavTab; label: string; icon: typeof KeyRound }[] = [
  { id: 'auth', label: 'Auth & RBAC Console', icon: KeyRound },
  { id: 'household', label: 'Households, Profiles & Consent', icon: Tv },
  { id: 'profile', label: 'Advertiser Profile', icon: Building2 },
  { id: 'campaigns', label: 'Campaigns (10-State)', icon: Megaphone },
  { id: 'studio', label: 'Ad Creation Studio', icon: Palette },
  { id: 'tv_preview', label: 'TV Preview & Break Sim', icon: MonitorPlay },
  { id: 'opportunities', label: 'Opportunities & 3-Tier QA', icon: Briefcase },
  { id: 'admin_analytics', label: 'Moderation & Analytics', icon: BarChart3 },
  { id: 'shared_intel', label: 'Shared Intel (Preview)', icon: Tv },
  { id: 'qa_handover', label: 'QR QA & VS Code Handover', icon: Smartphone },
  { id: 'qr', label: 'QR Redirect Engine', icon: QrCode },
];

const GOVERNANCE_NAV: { id: NavTab; label: string; icon: typeof ClipboardCheck }[] = [
  { id: 'reports', label: 'Reports & Copy Console', icon: ClipboardCheck },
  { id: 'roadmap', label: 'Roadmap (Phases 1–15)', icon: Map },
  { id: 'research', label: 'Smart TV Research', icon: Tv },
  { id: 'docs', label: `Documentation (${EDISON_DOCUMENTS.length})`, icon: FolderGit2 },
  { id: 'command', label: 'Command Centre', icon: Terminal },
  { id: 'risks', label: 'Risks, FMEA & Legal', icon: ShieldAlert },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('qa_handover');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [summary, setSummary] = useState<FoundationSummary | null>(null);
  const [headerShortcutCopied, setHeaderShortcutCopied] = useState(false);
  const [previewSubTab, setPreviewSubTab] = useState<TvPreviewSubTab>('player');
  const [previewCreativeId, setPreviewCreativeId] = useState<string | null>(null);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [studioLoadCreativeId, setStudioLoadCreativeId] = useState<string | null>(null);

  const handleHeaderCommitAndNext = async () => {
    try {
      await copyTextWithFallback(COMMIT_AND_NEXT_MESSAGE);
      setHeaderShortcutCopied(true);
      window.setTimeout(() => setHeaderShortcutCopied(false), 2500);
    } catch {
      setActiveTab('reports');
    }
  };

  const refreshAuthState = useCallback(async () => {
    try {
      const res = await edisonFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user ?? null);
        setSummary(data.summary ?? null);
      }
    } catch {
      // Handled gracefully when server restarts
    }
  }, []);

  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  const allItems = [...PROTOTYPE_NAV, ...GOVERNANCE_NAV];
  const currentItem = allItems.find((item) => item.id === activeTab) ?? PROTOTYPE_NAV[0];
  const isPrototypeTab = PROTOTYPE_NAV.some((item) => item.id === activeTab);

  const handleNavClick = (id: NavTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            EDISON
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-5" aria-label="EDISON navigation">
          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500">
              Phase 2 Track A + Track B Complete
            </p>
            <div className="space-y-1">
              {PROTOTYPE_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500">
              Governance & Specifications
            </p>
            <div className="space-y-1">
              {GOVERNANCE_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 m-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Prototype Boundary</p>
          <p className="leading-relaxed">
            Phase 2 Track B verified (DEC-OPEN-01 locked: Scope B + Bundled Withdrawal; 100% AI Studio scope) alongside Phases 1–7 software-first milestones (TASK-P3-001 READY, JSON retained). Non-transactional billing only; zero physical TV hardware tested (Stage P6 deferred).
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 py-2 sm:py-0 bg-white border-b border-slate-200 px-4 sm:px-8 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 whitespace-nowrap">EDISON</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                {isPrototypeTab ? 'Phase 2 Complete (Track A + B)' : 'Governance'}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{currentItem.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 font-mono">
              {currentUser ? `${currentUser.role} · ${currentUser.email}` : 'Signed Out'}
            </span>
            <button
              type="button"
              onClick={handleHeaderCommitAndNext}
              title={`Copy "${COMMIT_AND_NEXT_MESSAGE}" after committing to GitHub`}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                headerShortcutCopied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {headerShortcutCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Commit &amp; Next</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="sm:hidden">Reports</span>
              <span className="hidden sm:inline">Copy Report Console</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'auth' && (
            <AuthRbacView
              currentUser={currentUser}
              summary={summary}
              onAuthChange={refreshAuthState}
            />
          )}
          {activeTab === 'household' && (
            <HouseholdPrivacyView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'profile' && (
            <AdvertiserProfileView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'campaigns' && (
            <CampaignsView
              currentUser={currentUser}
              onOpenPreviewGate={(cmpId) => {
                setPreviewCampaignId(cmpId);
                setPreviewSubTab('gate');
                setActiveTab('tv_preview');
              }}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'studio' && (
            <AdStudioView
              currentUser={currentUser}
              initialCreativeId={studioLoadCreativeId}
              onConsumedInitialCreative={() => setStudioLoadCreativeId(null)}
              onPreviewCreative={(crtId) => {
                setPreviewCreativeId(crtId);
                setPreviewSubTab('player');
                setActiveTab('tv_preview');
              }}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'tv_preview' && (
            <TvPreviewView
              currentUser={currentUser}
              initialSubTab={previewSubTab}
              initialCreativeId={previewCreativeId}
              initialCampaignId={previewCampaignId}
              onNavigateAuth={() => setActiveTab('auth')}
              onReturnToEditor={(crtId) => {
                setStudioLoadCreativeId(crtId ?? null);
                setActiveTab('studio');
              }}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'opportunities' && (
            <OpportunityView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'admin_analytics' && (
            <AdminAnalyticsView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'shared_intel' && (
            <SharedIntelligencePreviewView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'qa_handover' && (
            <QaHandoverView
              currentUser={currentUser}
              onNavigateAuth={() => setActiveTab('auth')}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'qr' && (
            <QrEngineView
              currentUser={currentUser}
              onSummaryRefresh={refreshAuthState}
            />
          )}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'roadmap' && <RoadmapView />}
          {activeTab === 'research' && <ResearchView />}
          {activeTab === 'docs' && <DocsBrowserView />}
          {activeTab === 'command' && <CommandCentreView />}
          {activeTab === 'risks' && <RiskFmeaView />}
        </main>
      </div>
    </div>
  );
}
