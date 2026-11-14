import { useState } from 'react';
import {
  ClipboardCheck,
  Map,
  Tv,
  FolderGit2,
  Terminal,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';
import {
  ReportsView,
  RoadmapView,
  ResearchView,
  DocsBrowserView,
  CommandCentreView,
  RiskFmeaView,
} from './components/Views';

type NavTab = 'reports' | 'roadmap' | 'research' | 'docs' | 'command' | 'risks';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof ClipboardCheck }[] = [
  { id: 'reports', label: 'Reports & Copy Console', icon: ClipboardCheck },
  { id: 'roadmap', label: 'Roadmap (Phases 1–15)', icon: Map },
  { id: 'research', label: 'Smart TV Research', icon: Tv },
  { id: 'docs', label: 'Documentation (25)', icon: FolderGit2 },
  { id: 'command', label: 'Command Centre', icon: Terminal },
  { id: 'risks', label: 'Risks, FMEA & Legal', icon: ShieldAlert },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('reports');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentItem = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

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

        <nav className="p-3 space-y-1" aria-label="EDISON Phase 1 navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 m-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800">Phase 1 Scope Notice</p>
          <p className="leading-relaxed">
            Prototype TV/Studio application build is deferred to Phase 2 until Phase 1 documentation is reviewed and committed.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 whitespace-nowrap">EDISON</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">Phase 1</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{currentItem.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('command')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Command Centre
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
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
