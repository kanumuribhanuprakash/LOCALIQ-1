import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Image as ImageIcon,
  Headphones,
  Database,
  UploadCloud,
  Bot,
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
  Layers,
  Binary,
  Activity,
  Radio,
  FileCode,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedKnowledgeVisual } from '../landing/AnimatedKnowledgeVisual';

export const OverviewTab: React.FC = () => {
  const { files, setActiveTab, loadSampleFiles, vectorIndexStatus, user, activityLogs, setSelectedFileId } = useApp();

  // Greeting based on client time
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = user?.name ? user.name.split(' ')[0] : 'Operator';

  // Compute metric counts
  const documentCount = files.filter(f => f.category === 'document').length;
  const imageCount = files.filter(f => f.category === 'image').length;
  const audioCount = files.filter(f => f.category === 'audio').length;
  const totalCount = files.length;

  const indexedCount = files.filter(f => f.processingStatus === 'Indexed' || f.indexedStatus).length;
  const totalChunksIndexed = files.reduce((sum, f) => sum + (f.chunksCreated || f.vectorsIndexed || 0), 0);
  const totalVectorsIndexed = vectorIndexStatus?.total_vectors || totalChunksIndexed;
  const indexPercentage = totalCount > 0 ? Math.round((indexedCount / totalCount) * 100) : 100;

  const recentFiles = [...files].slice(0, 5);

  const getStatusBadge = (status: string, indexedStatus?: boolean) => {
    const s = status || (indexedStatus ? 'Indexed' : 'Processing');
    switch (s) {
      case 'Indexed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Indexed</span>
          </span>
        );
      case 'Processing':
      case 'Embedding':
      case 'Indexing':
      case 'Chunking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{s}</span>
          </span>
        );
      case 'Text Extracted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <span>Text Extracted</span>
          </span>
        );
      case 'OCR Required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span>OCR Required</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-500/10 border border-slate-500/20 text-slate-300">
            <span>{s}</span>
          </span>
        );
    }
  };

  const getFileIcon = (fileType?: string) => {
    const t = (fileType || '').toLowerCase();
    if (t.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    if (t.includes('doc')) return <FileCode className="w-4 h-4 text-indigo-400" />;
    if (t.includes('png') || t.includes('jpg') || t.includes('image')) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (t.includes('audio') || t.includes('mp3') || t.includes('wav')) return <Headphones className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div id="overview-tab-root" className="space-y-8 max-w-7xl mx-auto text-left">
      
      {/* 1. HERO GREETING WITH CORNER KNOWLEDGE VISUAL */}
      <div className="relative p-7 sm:p-9 rounded-3xl bg-gradient-to-br from-[#08121D] via-[#070F18] to-[#05080D] border border-cyan-500/20 shadow-2xl overflow-hidden">
        {/* Subtle background cyan blur */}
        <div className="absolute right-10 top-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-4">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1827] border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>● Local Processing</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1827] border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>● Knowledge Ready</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1827] border border-indigo-500/30 text-[11px] font-mono text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>● Private Workspace</span>
              </span>
            </div>

            {/* Greeting Headline */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                {timeGreeting}, {userName}
              </h1>
              <p className="text-sm sm:text-base text-cyan-300/80 font-mono mt-1">
                Your private knowledge workspace.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                id="overview-quick-add-btn"
                onClick={() => setActiveTab('knowledge')}
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Add Knowledge</span>
              </button>

              <button
                id="overview-quick-ask-btn"
                onClick={() => setActiveTab('assistant')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-slate-100 bg-[#0C1724] hover:bg-[#122234] hover:text-white border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Ask LOCALIQ</span>
              </button>

              <button
                id="overview-quick-video-btn"
                onClick={() => setActiveTab('video')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/20 hover:bg-amber-900/30 border border-amber-500/30 hover:border-amber-400/50 transition-all cursor-pointer shadow-sm"
                title="Optional cloud feature: Upload a photo and generate video with Google Veo 3.1"
              >
                <Film className="w-4 h-4 text-amber-400" />
                <span>Veo Video Studio</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                  Cloud
                </span>
              </button>

              <button
                id="overview-quick-activity-btn"
                onClick={() => setActiveTab('activity')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-[#08121D] hover:bg-[#0E1B2B] border border-white/5 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>View Activity</span>
              </button>

              {totalCount === 0 && (
                <button
                  onClick={loadSampleFiles}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/30 transition-all cursor-pointer"
                  title="Populate 4 sample documents to quickly inspect features"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Load Sample Files</span>
                </button>
              )}
            </div>
          </div>

          {/* Corner Knowledge Visual */}
          <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
            <div className="scale-75 origin-center pointer-events-none">
              <AnimatedKnowledgeVisual compact />
            </div>
          </div>

        </div>
      </div>

      {/* 2. DASHBOARD METRICS: COMPACT CARDS WITH PROGRESS & MINI-INDICATOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
            SYSTEM METRICS & INDEX STATE
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Indexing Integrity:</span>
            <span className="text-cyan-400 font-bold">{indexPercentage}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Documents */}
          <div className="p-5 rounded-2xl bg-[#08121D] border border-white/5 hover:border-cyan-500/30 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono block">Documents</span>
                <span className="text-3xl font-bold font-mono text-white mt-1 block">
                  {totalCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{documentCount} docs • {imageCount} imgs • {audioCount} audio</span>
              <button
                onClick={() => setActiveTab('knowledge')}
                className="text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2: Indexed Chunks */}
          <div className="p-5 rounded-2xl bg-[#08121D] border border-white/5 hover:border-cyan-500/30 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono block">Indexed Chunks</span>
                <span className="text-3xl font-bold font-mono text-cyan-300 mt-1 block">
                  {totalChunksIndexed.toLocaleString()}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>512-Token Windows</span>
              <span className="text-emerald-400 font-semibold">64 Overlap</span>
            </div>
          </div>

          {/* Card 3: Knowledge Vectors */}
          <div className="p-5 rounded-2xl bg-[#08121D] border border-white/5 hover:border-cyan-500/30 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono block">Knowledge Vectors</span>
                <span className="text-3xl font-bold font-mono text-indigo-300 mt-1 block">
                  {totalVectorsIndexed.toLocaleString()}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Binary className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>384 Dim MiniLM</span>
              <span className="text-indigo-400 font-semibold">Normalized IP</span>
            </div>
          </div>

          {/* Card 4: Recent Activity */}
          <div className="p-5 rounded-2xl bg-[#08121D] border border-white/5 hover:border-cyan-500/30 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono block">Recent Activity</span>
                <span className="text-3xl font-bold font-mono text-white mt-1 block">
                  {activityLogs.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Audit Entries Logged</span>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="p-4 rounded-2xl bg-[#071018] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-slate-400">Vault Readiness</span>
            <div className="flex-1 sm:w-64 h-2 bg-[#0E1A29] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${indexPercentage}%` }}
              />
            </div>
          </div>
          <div className="text-slate-400 flex items-center gap-4 text-[11px]">
            <span>{indexedCount} of {totalCount} files indexed</span>
            <span className="text-cyan-400 font-semibold">● 100% In-Memory RAG</span>
          </div>
        </div>
      </div>

      {/* 3. RECENT KNOWLEDGE TABLE / CARDS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#08121D] border border-white/5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Knowledge
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Recently ingested documents, schematics, and audio records.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('knowledge')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Knowledge</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentFiles.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#050C14] border border-white/5 space-y-3">
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No knowledge sources currently in your private vault.</p>
            <button
              onClick={() => setActiveTab('knowledge')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 transition-colors cursor-pointer"
            >
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">File Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Chunks</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedFileId(file.id);
                    }}
                  >
                    <td className="py-3 pr-3 text-slate-200 font-medium font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-[#0C1724] border border-white/5">
                          {getFileIcon(file.extension || file.category)}
                        </div>
                        <span className="truncate max-w-xs">{file.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-400 uppercase text-[10px]">
                      {file.extension || file.category}
                    </td>
                    <td className="py-3 pr-3 text-slate-400">
                      {file.formattedSize || (file.sizeBytes ? `${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB')}
                    </td>
                    <td className="py-3 pr-3 text-cyan-300 font-bold">
                      {file.chunksCreated || file.vectorsIndexed || 0}
                    </td>
                    <td className="py-3 pr-3">
                      {getStatusBadge(file.processingStatus, file.indexedStatus)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFileId(file.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Inspect file chunks & vector status"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
