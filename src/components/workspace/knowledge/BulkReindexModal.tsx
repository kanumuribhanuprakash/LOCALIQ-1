import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, X, Binary } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

export interface ReindexResultItem {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  chunksCount?: number;
  vectorsCount?: number;
  message?: string;
}

interface BulkReindexModalProps {
  isOpen: boolean;
  files: KnowledgeFile[];
  onClose: () => void;
  onExecuteReindex: (
    fileId: string,
    onProgress: (msg: string) => void
  ) => Promise<{ success: boolean; chunksCount: number; vectorsCount: number; error?: string }>;
}

export const BulkReindexModal: React.FC<BulkReindexModalProps> = ({
  isOpen,
  files,
  onClose,
  onExecuteReindex,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentProgressMsg, setCurrentProgressMsg] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [results, setResults] = useState<ReindexResultItem[]>([]);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      // Initialize results list
      setResults(
        files.map((f) => ({
          fileId: f.id,
          fileName: f.name,
          status: 'pending',
          message: 'Waiting...',
        }))
      );
      setCurrentIndex(0);
      setCurrentProgressMsg('Starting pipeline...');
      setIsRunning(true);
      setIsCompleted(false);

      // Start re-indexing sequentially
      runBatch(files);
    }
  }, [isOpen, files]);

  const runBatch = async (batchFiles: KnowledgeFile[]) => {
    const updatedResults: ReindexResultItem[] = batchFiles.map((f) => ({
      fileId: f.id,
      fileName: f.name,
      status: 'pending',
      message: 'Waiting in queue...',
    }));

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      setCurrentIndex(i);
      setCurrentProgressMsg(`Re-indexing ${i + 1} of ${batchFiles.length}: ${file.name}`);

      updatedResults[i].status = 'processing';
      updatedResults[i].message = 'Embedding & Indexing into BrowserVectorIndex...';
      setResults([...updatedResults]);

      try {
        const res = await onExecuteReindex(file.id, (progMsg) => {
          setCurrentProgressMsg(`${file.name}: ${progMsg}`);
        });

        if (res.success) {
          updatedResults[i].status = 'success';
          updatedResults[i].chunksCount = res.chunksCount;
          updatedResults[i].vectorsCount = res.vectorsCount;
          updatedResults[i].message = `Indexed ${res.vectorsCount} vectors (384-dim, unit normalized)`;
        } else {
          updatedResults[i].status = 'error';
          updatedResults[i].message = res.error || 'Indexing skipped or failed';
        }
      } catch (err: any) {
        updatedResults[i].status = 'error';
        updatedResults[i].message = err?.message || 'Processing execution failed';
      }

      setResults([...updatedResults]);
    }

    setIsRunning(false);
    setIsCompleted(true);
  };

  if (!isOpen) return null;

  const total = files.length;
  const progressPercent = total > 0 ? Math.round(((currentIndex + (isCompleted ? 1 : 0)) / total) * 100) : 0;
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg p-6 rounded-3xl bg-[#08121D] border border-cyan-500/30 shadow-2xl text-left space-y-5"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px 0 rgba(6, 182, 212, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <RefreshCw className={`w-6 h-6 ${isRunning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">
                  {isCompleted ? 'Bulk Re-index Completed' : 'Re-indexing Knowledge Base'}
                </h3>
                <p className="text-xs text-cyan-300/80 font-mono mt-0.5">
                  {isCompleted
                    ? `Processed ${total} files (${successCount} indexed, ${errorCount} errors)`
                    : `Re-indexing ${currentIndex + 1} of ${total}: ${files[currentIndex]?.name || ''}`}
                </p>
              </div>
            </div>

            {isCompleted && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="truncate max-w-[320px] text-slate-300">
                {currentProgressMsg}
              </span>
              <span className="text-cyan-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#050C14] border border-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Per-File Status Report */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Per-File Status Report:
            </span>
            <div className="max-h-48 overflow-y-auto rounded-xl bg-[#050C14] border border-white/5 p-2 space-y-1 divide-y divide-white/5">
              {results.map((res) => (
                <div
                  key={res.fileId}
                  className="flex items-center justify-between gap-3 py-2 px-2 text-xs font-sans"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {res.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    )}
                    {res.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {res.status === 'error' && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    {res.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                    )}

                    <div className="truncate">
                      <span className="text-slate-200 font-medium block truncate">
                        {res.fileName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {res.message}
                      </span>
                    </div>
                  </div>

                  {res.vectorsCount !== undefined && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      {res.vectorsCount} vectors
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={isRunning}
              onClick={onClose}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                isRunning
                  ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-md shadow-cyan-500/20 cursor-pointer'
              }`}
            >
              {isCompleted ? 'Done' : 'Processing...'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
