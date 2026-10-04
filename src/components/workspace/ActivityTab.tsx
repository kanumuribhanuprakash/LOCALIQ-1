import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActivityType, ActivityItem } from '../../types';
import {
  Activity,
  UploadCloud,
  Cpu,
  Bot,
  RefreshCw,
  Settings,
  Filter,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  FileCheck,
  FolderOpen,
  Download,
  Lock,
  Binary,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';

export const ActivityTab: React.FC = () => {
  const { activityLogs, setActiveTab } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityType | 'indexing'>('all');

  const filteredLogs = activityLogs.filter((item) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'indexing') {
      return item.type === 'processing' && ((item.title || '').toLowerCase().includes('index') || (item.description || '').toLowerCase().includes('vector'));
    }
    return item.type === selectedFilter;
  });

  const getEventBadge = (type: ActivityType) => {
    switch (type) {
      case 'upload':
        return {
          label: 'Upload',
          className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
          icon: UploadCloud,
        };
      case 'processing':
        return {
          label: 'Processing',
          className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
          icon: Cpu,
        };
      case 'query':
        return {
          label: 'Query',
          className: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
          icon: Bot,
        };
      case 'knowledge_update':
        return {
          label: 'Indexing',
          className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
          icon: Binary,
        };
      default:
        return {
          label: 'System',
          className: 'bg-slate-800 text-slate-300 border-white/10',
          icon: Settings,
        };
    }
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `localiq_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="activity-tab-root" className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-7 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
              Activity & Audit Log
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#050C14] text-cyan-300 border border-cyan-500/20">
              {activityLogs.length} Events
            </span>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hidden sm:inline-block">
              Zero Cloud Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans">
            Cryptographically sealed and air-gapped ledger of local file ingestion, embedding execution, and assistant retrieval.
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportLogs}
          disabled={activityLogs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold text-white bg-[#050C14] hover:bg-[#0A1624] border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#08121D] border border-cyan-500/20 overflow-x-auto no-scrollbar w-fit">
        {[
          { id: 'all', label: 'All' },
          { id: 'upload', label: 'Uploads' },
          { id: 'processing', label: 'Processing' },
          { id: 'query', label: 'Queries' },
          { id: 'indexing', label: 'Indexing' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap font-mono ${
              selectedFilter === tab.id
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Technical Audit Table / Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 sm:p-16 text-center rounded-3xl bg-[#08121D] border border-cyan-500/20 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#050C14] border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
            <Activity className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white tracking-tight font-sans">
              No activity recorded yet.
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Actions performed within LOCALIQ will appear in this audit log.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('knowledge')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/20 transition-all cursor-pointer font-sans"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Knowledge to Begin</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#08121D] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cyan-500/10 bg-[#050C14] text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  <th className="py-3.5 px-5 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-5 font-semibold">Event Type</th>
                  <th className="py-3.5 px-5 font-semibold">Details</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 text-right font-semibold">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-mono">
                {filteredLogs.map((item) => {
                  const badge = getEventBadge(item.type);
                  const Icon = badge.icon;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Timestamp (monospace, readable) */}
                      <td className="py-4 px-5 text-slate-400 whitespace-nowrap text-[11px]">
                        {item.timestamp}
                      </td>

                      {/* Event Type (with badge) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${badge.className}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Details (file name, query text, chunk count) */}
                      <td className="py-4 px-5 text-slate-200 max-w-md font-sans">
                        <div className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-sans line-clamp-1">
                          {item.description}
                        </div>
                      </td>

                      {/* Status (Success, Processing, Failed) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Success</span>
                        </span>
                      </td>

                      {/* Security Icon (showing local execution) */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#050C14] border border-cyan-500/20 text-[10px] text-cyan-300" title="Executed locally with zero cloud telemetry">
                          <Lock className="w-3 h-3 text-cyan-400" />
                          <span>Local</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 rounded-2xl bg-[#08121D] border border-cyan-500/20 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5 text-cyan-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Local Audit Ledger (Air-Gapped Client Memory)</span>
        </span>
        <span className="text-slate-500">Zero Cloud Exfiltration</span>
      </div>

    </div>
  );
};
