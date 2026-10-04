import React from 'react';
import { useApp } from '../../context/AppContext';
import { WorkspaceTab } from '../../types';
import {
  Menu,
  Search,
  UploadCloud,
  ShieldCheck,
  Bot,
  Database,
  Film,
  LayoutDashboard,
  Activity,
  Settings,
  Sparkles,
  Radio,
} from 'lucide-react';

interface WorkspaceHeaderProps {
  onToggleMobileMenu: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ onToggleMobileMenu }) => {
  const { activeTab, setActiveTab, searchQuery, setSearchQuery, files } = useApp();

  const tabTitles: Record<WorkspaceTab, { title: string; subtitle: string; icon: React.ElementType }> = {
    overview: {
      title: 'Workspace Overview',
      subtitle: 'Monitor your private knowledge base and local retrieval metrics.',
      icon: LayoutDashboard,
    },
    knowledge: {
      title: 'Knowledge Base',
      subtitle: 'Manage, upload, and inspect local multimodal documents.',
      icon: Database,
    },
    assistant: {
      title: 'LOCALIQ Assistant',
      subtitle: 'Ask questions across your private knowledge with citation audits.',
      icon: Bot,
    },
    video: {
      title: 'Veo Video Studio',
      subtitle: 'Animate photos into cinematic videos with Google Veo 3.1 neural rendering.',
      icon: Film,
    },
    activity: {
      title: 'Activity & Audit Log',
      subtitle: 'Deterministic audit log of extractions, embeddings, and searches.',
      icon: Activity,
    },
    settings: {
      title: 'Workspace Settings',
      subtitle: 'Inspect local inference models, encryption keys, and storage sandbox.',
      icon: Settings,
    },
  };

  const currentTabInfo = tabTitles[activeTab] || tabTitles.overview;
  const TabIcon = currentTabInfo.icon;

  return (
    <header
      id="workspace-top-header"
      className="sticky top-0 z-30 h-16 bg-[#071018]/90 backdrop-blur-xl border-b border-white/5 px-6 sm:px-8 flex items-center justify-between gap-4 shrink-0 select-none"
    >
      {/* Left: Mobile hamburger & Tab Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 focus:outline-none cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-[#091522] border border-cyan-500/20 text-cyan-400 hidden sm:flex shadow-sm">
            <TabIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none font-sans">
              {currentTabInfo.title}
            </h1>
            <p className="text-[11px] text-slate-400 hidden md:block mt-1 font-mono">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Search + Enclave Status + Action button */}
      <div className="flex items-center gap-3">
        {/* Search Bar (visible on Knowledge and Overview) */}
        {(activeTab === 'knowledge' || activeTab === 'overview') && (
          <div className="relative hidden md:block w-52 lg:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter knowledge..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-[#091522] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all font-sans"
            />
          </div>
        )}

        {/* Local Processing Engine Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 font-semibold">LOCAL ENCLAVE:</span>
          <span>ONLINE</span>
        </div>

        {/* Quick Upload CTA button if not on Knowledge base */}
        {activeTab !== 'knowledge' && (
          <button
            onClick={() => setActiveTab('knowledge')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Knowledge</span>
          </button>
        )}
      </div>
    </header>
  );
};
