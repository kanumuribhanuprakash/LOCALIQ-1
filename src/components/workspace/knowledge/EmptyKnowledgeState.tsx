import React from 'react';
import { Database, UploadCloud, Sparkles, Lock, ShieldCheck } from 'lucide-react';

interface EmptyKnowledgeStateProps {
  onUploadClick: () => void;
  onLoadSampleClick?: () => void;
  onLoadMultimodalClick?: () => void;
}

export const EmptyKnowledgeState: React.FC<EmptyKnowledgeStateProps> = ({
  onUploadClick,
  onLoadSampleClick,
  onLoadMultimodalClick,
}) => {
  return (
    <div
      id="empty-knowledge-state"
      className="p-10 sm:p-16 text-center rounded-3xl bg-[#08121D] border border-cyan-500/20 space-y-6 shadow-2xl max-w-2xl mx-auto"
    >
      <div className="w-16 h-16 rounded-3xl bg-[#050C14] border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
        <Database className="w-8 h-8 stroke-[1.7]" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-sans">
          No knowledge added yet.
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
          Upload your files to begin asking questions.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#050C14] border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Your files are processed locally and never leave this device.</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          id="empty-state-upload-btn"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File</span>
        </button>

        {onLoadSampleClick && (
          <button
            onClick={onLoadSampleClick}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs font-medium text-slate-300 bg-[#050C14] hover:bg-[#0A1624] hover:text-white border border-white/10 transition-colors cursor-pointer font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Demo Knowledge Files</span>
          </button>
        )}

        {onLoadMultimodalClick && (
          <button
            onClick={onLoadMultimodalClick}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer font-mono"
            title="Load live real files across TXT, DOCX, Image OCR, and PDF"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Load Multimodal Suite (PDF, DOCX, TXT, OCR)</span>
          </button>
        )}
      </div>
    </div>
  );
};
