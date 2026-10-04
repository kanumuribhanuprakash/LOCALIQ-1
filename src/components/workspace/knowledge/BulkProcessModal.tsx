import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Binary, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { KnowledgeFile } from '../../../types';

export interface ProcessResultItem {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

interface BulkProcessModalProps {
  isOpen: boolean;
  files: KnowledgeFile[];
  onClose: () => void;
  onExecuteProcess: (
    fileId: string,
    onProgress: (msg: string) => void
  ) => Promise<{ success: boolean; error?: string }>;
}

export const BulkProcessModal: React.FC<BulkProcessModalProps> = ({
  isOpen,
  files,
  onClose,
  onExecuteProcess,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentProgressMsg, setCurrentProgressMsg] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessResultItem[]>([]);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      setResults(
        files.map((f) => ({
          fileId: f.id,
          fileName: f.name,
          status: 'pending',
          message: 'Waiting in queue...',
        }))
      );
      setCurrentIndex(0);
      setCurrentProgressMsg('Starting processing...');
      setIsRunning(true);
      setIsCompleted(false);

      runBatch(files);
    }
  }, [isOpen, files]);

  const runBatch = async (batchFiles: KnowledgeFile[]) => {
    const updatedResults: ProcessResultItem[] = batchFiles.map((f) => ({
      fileId: f.id,
      fileName: f.name,
      status: 'pending',
      message: 'Waiting...',
    }));

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      setCurrentIndex(i);
      setCurrentProgressMsg(`Processing ${i + 1} of ${batchFiles.length}: ${file.name}`);

      updatedResults[i].status = 'processing';
      updatedResults[i].message = 'Extracting, chunking & generating embeddings...';
      setResults([...updatedResults]);

      try {
        const res = await onExecuteProcess(file.id, (progMsg) => {
          setCurrentProgressMsg(`${file.name}: ${progMsg}`);
        });

        if (res.success) {
          updatedResults[i].status = 'success';
          updatedResults[i].message = 'Processed and Indexed successfully';
        } else {
          updatedResults[i].status = 'error';
          updatedResults[i].message = res.error || 'Processing skipped';
        }
      } catch (err: any) {
        updatedResults[i].status = 'error';
        updatedResults[i].message = err?.message || 'Processing failed';
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
          className="relative w-full max-w-lg p-6 rounded-3xl bg-[#08121D] border border-emerald-500/30 shadow-2xl text-left space-y-5"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px 0 rgba(16, 185, 129, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Binary className={`w-6 h-6 ${isRunning ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">
                  {isCompleted ? 'Bulk Processing Completed' : 'Processing Documents'}
                </h3>
                <p className="text-xs text-emerald-300/80 font-mono mt-0.5">
                  {isCompleted
                    ? `Finished ${total} files (${successCount} successful, ${errorCount} failed)`
                    : `Processing ${currentIndex + 1} of ${total}: ${files[currentIndex]?.name || ''}`}
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
              <span className="text-emerald-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#050C14] border border-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Per-File Status Report */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Processing Status:
            </span>
            <div className="max-h-48 overflow-y-auto rounded-xl bg-[#050C14] border border-white/5 p-2 space-y-1 divide-y divide-white/5">
              {results.map((res) => (
                <div
                  key={res.fileId}
                  className="flex items-center justify-between gap-3 py-2 px-2 text-xs font-sans"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {res.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
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
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20 cursor-pointer'
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
