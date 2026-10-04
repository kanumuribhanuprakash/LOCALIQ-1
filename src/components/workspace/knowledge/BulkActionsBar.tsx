import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, RefreshCw, Binary, X, CheckSquare } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  selectedFiles: KnowledgeFile[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkProcess: () => void;
  onBulkReindex: () => void;
  onBulkDelete: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  selectedFiles,
  onSelectAll,
  onDeselectAll,
  onBulkProcess,
  onBulkReindex,
  onBulkDelete,
}) => {
  if (selectedCount === 0) return null;

  // Determine which actions are applicable
  const canProcess = selectedFiles.some(
    (f) =>
      f.processingStatus !== 'Indexed' &&
      f.processingStatus !== 'OCR Required' &&
      f.processingStatus !== 'Failed' &&
      f.processingStatus !== 'OCR Failed'
  );

  const canReindex = selectedFiles.some(
    (f) =>
      f.processingStatus === 'Indexed' ||
      f.indexedStatus ||
      f.textAvailable ||
      (f.chunks && f.chunks.length > 0)
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.18 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92vw] sm:w-auto px-5 py-3 rounded-2xl bg-[#08121D]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4 flex-wrap select-none text-xs"
        style={{
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px 0 rgba(6, 182, 212, 0.2)',
        }}
      >
        {/* Selected Count & Selection helpers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono font-semibold text-white">
            <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs">
              {selectedCount}
            </span>
            <span className="hidden sm:inline text-slate-300">
              {selectedCount === 1 ? 'file selected' : 'files selected'}
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <button
            type="button"
            onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {selectedCount === totalCount ? 'Deselect All' : `Select All (${totalCount})`}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Bulk Process */}
          <button
            type="button"
            disabled={!canProcess}
            onClick={onBulkProcess}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs transition-all cursor-pointer ${
              canProcess
                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                : 'opacity-40 cursor-not-allowed text-slate-500 border border-white/5'
            }`}
            title="Extract, chunk, and embed selected un-indexed files"
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Process</span>
          </button>

          {/* Bulk Re-index */}
          <button
            type="button"
            disabled={!canReindex}
            onClick={onBulkReindex}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs transition-all cursor-pointer ${
              canReindex
                ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                : 'opacity-40 cursor-not-allowed text-slate-500 border border-white/5'
            }`}
            title="Re-embed and re-index selected documents into BrowserVectorIndex"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-index</span>
          </button>

          {/* Bulk Delete */}
          <button
            type="button"
            onClick={onBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer"
            title="Delete selected files, embeddings, and vector indices"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDeselectAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-1"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
