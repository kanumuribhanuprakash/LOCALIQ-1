import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { OverviewTab } from './OverviewTab';
import { KnowledgeBaseTab } from './KnowledgeBaseTab';
import { AssistantTab } from './AssistantTab';
import { VeoVideoTab } from './VeoVideoTab';
import { ActivityTab } from './ActivityTab';
import { SettingsTab } from './SettingsTab';
import { motion, AnimatePresence } from 'motion/react';

export const WorkspaceLayout: React.FC = () => {
  const { activeTab } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab key="overview" />;
      case 'knowledge':
        return <KnowledgeBaseTab key="knowledge" />;
      case 'assistant':
        return <AssistantTab key="assistant" />;
      case 'video':
        return <VeoVideoTab key="video" />;
      case 'activity':
        return <ActivityTab key="activity" />;
      case 'settings':
        return <SettingsTab key="settings" />;
      default:
        return <OverviewTab key="overview-default" />;
    }
  };

  return (
    <div
      id="workspace-layout-root"
      className="h-screen h-[100dvh] w-full bg-[#0A0B0E] text-slate-100 font-sans selection:bg-indigo-500/30 flex overflow-hidden relative"
    >
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-68 min-w-0 min-h-0 h-full overflow-hidden">
        <WorkspaceHeader onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <main
          id="workspace-main-content"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 sm:p-8 lg:p-10 overscroll-contain"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto w-full"
            >
              {renderActiveTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
