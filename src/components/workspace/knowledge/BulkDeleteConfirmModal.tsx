import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, FileText, Layers, Database } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  files: KnowledgeFile[];
  onClose: () => void;
  onConfirm: (fileIds: string[]) => void;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  isOpen,
  files,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || files.length === 0) return null;

  const totalChunks = files.reduce((acc, f) => acc + (f.chunksCreated || f.vectorsIndexed || 0), 0);

  const handleConfirm = () => {
    const ids = files.map((f) => f.id);
    onConfirm(ids);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg p-6 rounded-3xl bg-[#08121D] border border-rose-500/30 shadow-2xl text-left space-y-5"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px 0 rgba(244, 63, 94, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">
                  Delete {files.length} {files.length === 1 ? 'file' : 'files'}?
                </h3>
                <p className="text-xs text-rose-300/80 font-mono mt-0.5">
                  Permanent removal from local device storage
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning Description */}
          <div className="p-3.5 rounded-2xl bg-[#050C14] border border-rose-500/20 text-xs text-slate-300 leading-relaxed font-sans space-y-2">
            <p>
              This permanently removes their local knowledge, chunks, embeddings, and index entries.
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>{files.length} Files</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>~{totalChunks} Chunks & Vectors</span>
              </span>
            </div>
          </div>

          {/* List of files to delete */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Files to be deleted ({files.length}):
            </span>
            <div className="max-h-40 overflow-y-auto rounded-xl bg-[#050C14] border border-white/5 p-2 space-y-1 divide-y divide-white/5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 text-xs font-sans"
                >
                  <span className="text-slate-200 truncate font-medium max-w-[300px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
                    .{file.extension} • {file.formattedSize}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
