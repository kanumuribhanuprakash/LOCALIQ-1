import React from 'react';
import { UploadCloud, FolderOpen, Sparkles, FileText, Image as ImageIcon, Headphones, AlertTriangle, X, ShieldCheck, Lock } from 'lucide-react';
import { FileValidationError } from '../../../utils/fileHelpers';

interface KnowledgeUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowseClick: () => void;
  validationErrors: FileValidationError[];
  onDismissError: (index: number) => void;
  onClearErrors: () => void;
}

export const KnowledgeUploadZone: React.FC<KnowledgeUploadZoneProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  validationErrors,
  onDismissError,
  onClearErrors,
}) => {
  const supportedGroups = [
    {
      category: 'Documents',
      icon: FileText,
      exts: ['PDF', 'DOC', 'DOCX', 'TXT'],
      badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      category: 'Images',
      icon: ImageIcon,
      exts: ['PNG', 'JPG', 'JPEG', 'WEBP'],
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      category: 'Audio',
      icon: Headphones,
      exts: ['MP3', 'WAV', 'M4A'],
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div
          id="upload-validation-errors"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2.5 animate-fadeIn text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {validationErrors.length} {validationErrors.length === 1 ? 'file could not be uploaded' : 'files could not be uploaded'}
              </span>
            </div>
            <button
              onClick={onClearErrors}
              className="text-xs text-rose-400 hover:text-rose-200 underline cursor-pointer"
            >
              Dismiss all
            </button>
          </div>
          <ul className="space-y-1 text-xs font-mono">
            {validationErrors.map((err, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-2 p-2 rounded-xl bg-[#050C14] border border-rose-500/10 text-slate-300"
              >
                <div className="flex items-start gap-2 overflow-hidden">
                  <span className="font-semibold text-rose-400 shrink-0 text-[11px] mt-0.5">
                    {err.fileName}:
                  </span>
                  <span className="text-slate-300 text-xs font-sans">{err.reason}</span>
                </div>
                <button
                  onClick={() => onDismissError(idx)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        id="knowledge-dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-500/20 animate-pulse'
            : 'border-white/10 hover:border-cyan-500/40 bg-[#08121D]/70 hover:bg-[#0A1624]'
        }`}
        onClick={onBrowseClick}
      >
        <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/20 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
          <UploadCloud className="w-8 h-8 stroke-[1.8]" />
        </div>

        <h3 className="text-base sm:text-xl font-bold text-white mb-1.5 font-sans">
          Add knowledge to LOCALIQ
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-300 mb-2 max-w-lg leading-relaxed font-sans">
          Drop PDF, DOCX, TXT, images or audio files here
        </p>

        <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 mb-6 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          <Lock className="w-3 h-3 text-cyan-400" />
          <span>Processed locally. Never sent to the cloud.</span>
        </div>

        {/* Browse Files Button */}
        <div className="mb-7" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            id="browse-files-btn"
            onClick={onBrowseClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Browse Local Files</span>
          </button>
        </div>

        {/* Supported file types structured information */}
        <div className="w-full max-w-2xl pt-5 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] block font-semibold mb-3">
            SUPPORTED FORMATS & MULTIMODAL INGESTION
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {supportedGroups.map((grp) => {
              const Icon = grp.icon;
              return (
                <div
                  key={grp.category}
                  className="p-3 rounded-xl bg-[#050C14] border border-white/5 space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{grp.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.exts.map((ext) => (
                      <span
                        key={ext}
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${grp.badgeClass}`}
                      >
                        .{ext}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
