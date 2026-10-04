import React from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';
import { WorkspaceTab } from '../../types';
import {
  LayoutDashboard,
  Database,
  Bot,
  Film,
  Activity,
  Settings,
  LogOut,
  FolderLock,
  ChevronRight,
  X,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, files, user, handleSignOut, setCurrentView } = useApp();

  const navItems: { id: WorkspaceTab; label: string; icon: React.ElementType; badge?: string | number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: Database,
      badge: files.length > 0 ? files.length : undefined,
    },
    {
      id: 'assistant',
      label: 'Assistant',
      icon: Bot,
    },
    {
      id: 'video',
      label: 'Veo Video Studio',
      icon: Film,
      badge: 'Cloud',
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (tabId: WorkspaceTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      id="workspace-sidebar"
      className={`fixed inset-y-0 left-0 z-40 w-68 h-screen h-[100dvh] max-h-[100dvh] bg-[#071018] border-r border-white/5 flex flex-col min-h-0 overflow-hidden transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* 1. Header / Logo (fixed at top of sidebar, never scrolled away) */}
      <div className="p-4 pb-3.5 shrink-0 flex items-center justify-between border-b border-white/5 bg-[#050C14]">
        <BrandLogo onClick={() => setCurrentView('landing')} size="sm" />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Middle & Content Section:
          Maintains full viewport height and independent scrolling.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col justify-between p-4 space-y-4 overscroll-contain">
        {/* Top items: Enclave Status Card + Navigation */}
        <div className="space-y-4 shrink-0">
          {/* Enclave Status Card with Local Processing indicator */}
          <div className="p-3.5 rounded-2xl bg-[#091522] border border-cyan-500/25 space-y-2 shadow-sm text-left">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold uppercase tracking-wider">
                <FolderLock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Private Vault</span>
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                <span>On-Device</span>
              </div>
            </div>
            <div className="text-xs text-white font-medium truncate" title={user?.workspaceName || 'Personal Intelligence Enclave'}>
              {user?.workspaceName || 'Personal Intelligence Enclave'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-white/5">
              <span>Indexed: {files.filter(f => f.indexedStatus).length}/{files.length}</span>
              <span className="text-cyan-400 font-semibold">● LOCAL</span>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="space-y-1" aria-label="Workspace Navigation">
            <div className="px-2 pb-1.5 text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-500 text-left">
              WORKSPACE NAVIGATION
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer group ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-[#0E1A29] text-slate-400 border border-white/10'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Flexible spacer */}
        <div className="flex-1 min-h-2" aria-hidden="true" />

        {/* Bottom items: Sovereignty banner + User Profile + Logout */}
        <div className="space-y-2.5 pt-3 border-t border-white/5 shrink-0 text-left">
          {/* Local Status Banner */}
          <div className="bg-[#050C14] p-3 rounded-xl border border-cyan-500/15 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>LOCAL STATUS: SECURE</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight font-mono">
              ● LOCAL · Your data stays here.
            </p>
          </div>

          {/* User Profile Card */}
          <div className="p-2.5 rounded-xl bg-[#091522] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow-sm shadow-cyan-500/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden text-left min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate" title={user?.name || 'Local User'}>
                  {user?.name || 'Local User'}
                </div>
                <div className="text-[9px] text-slate-500 truncate font-mono" title={user?.email || 'local.vault'}>
                  {user?.email || 'local.vault'}
                </div>
              </div>
            </div>

            <button
              id="sidebar-logout-btn"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 ml-1"
              title="Sign Out (Locks Enclave)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
