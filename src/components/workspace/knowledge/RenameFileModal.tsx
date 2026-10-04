import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, Check, AlertCircle } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

interface RenameFileModalProps {
  file: KnowledgeFile | null;
  onClose: () => void;
  onSave: (fileId: string, newName: string) => void;
}

export const RenameFileModal: React.FC<RenameFileModalProps> = ({
  file,
  onClose,
  onSave,
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (file) {
      setNewName(file.name);
      setError('');
    }
  }, [file]);

  if (!file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('File name cannot be empty.');
      return;
    }
    onSave(file.id, trimmed);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md p-7 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-2xl space-y-5 relative my-auto max-h-[90vh] overflow-y-auto text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#050C14] border border-cyan-500/20 text-cyan-400">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Rename File</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Update displayed name in local vault
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 font-sans">
                File Display Name
              </label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[#050C14] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
                placeholder="Enter new file name..."
              />
              {error && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-[#050C14] border border-white/5 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Format: .{file.extension.toUpperCase()}</span>
              <span className="capitalize">Category: {file.category}</span>
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
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Name</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
