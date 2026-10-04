import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, AlertTriangle, HardDrive } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

interface DeleteConfirmModalProps {
  file: KnowledgeFile | null;
  onClose: () => void;
  onConfirm: (fileId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  file,
  onClose,
  onConfirm,
}) => {
  if (!file) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md p-7 rounded-3xl bg-[#08121D] border border-rose-500/25 shadow-2xl space-y-5 relative my-auto max-h-[90vh] overflow-y-auto text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Delete File</h3>
                <span className="text-[11px] font-mono text-rose-400">
                  Confirmation required
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Are you sure you want to permanently delete this file from your private knowledge vault?
            </p>

            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1.5">
              <div className="font-semibold text-white text-xs truncate font-sans" title={file.name}>
                {file.name}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span className="uppercase font-bold text-rose-400">.{file.extension}</span>
                <span>•</span>
                <span>{file.formattedSize}</span>
                <span>•</span>
                <span className="capitalize">{file.category}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>
                This will remove the file and immediately update your dashboard metrics and vector storage.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(file.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/25 cursor-pointer font-sans"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete File</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
