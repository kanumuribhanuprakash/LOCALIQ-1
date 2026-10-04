import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { clientBackupService, BackupInspectResult, BackupExportResult, RestoreResult } from '../../services/clientBackupService';
import { formatBytes } from '../../utils/fileHelpers';
import {
  Lock,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  FileCheck,
  RefreshCw,
  Info,
  Binary,
  Layers,
  MessageSquare,
  FileText,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BackupRestorePanel: React.FC = () => {
  const {
    files,
    chatMessages,
    localIndexStats,
    createWorkspaceBackup,
    restoreWorkspaceFromBackup,
  } = useApp();

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportConfirmPassword, setExportConfirmPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<BackupExportResult | null>(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectResult, setInspectResult] = useState<BackupInspectResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<RestoreResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate current stats
  const totalChunks = files.reduce((acc, f) => acc + (f.chunks?.length || 0), 0);
  const totalVectors = localIndexStats?.totalVectors || 0;

  // Handle Export Flow
  const handleStartExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);

    if (!exportPassword) {
      setExportError('Please enter an encryption password.');
      return;
    }
    if (exportPassword.length < 6) {
      setExportError('Password must be at least 6 characters long.');
      return;
    }
    if (exportPassword !== exportConfirmPassword) {
      setExportError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setExportProgress({ stage: 'Initiating backup...', percent: 5 });
      const result = await createWorkspaceBackup(exportPassword, (stage, percent) => {
        setExportProgress({ stage, percent });
      });

      setExportResult(result);
      setExportProgress(null);

      // Trigger automatic browser download
      const a = document.createElement('a');
      a.href = result.blobUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanly revoke blob URL after download dispatch to free memory
      setTimeout(() => {
        try { URL.revokeObjectURL(result.blobUrl); } catch (_) {}
      }, 5000);

      // Wipe sensitive temporary password from component state
      setExportPassword('');
      setExportConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backup generation failed.';
      setExportError(msg);
      setExportProgress(null);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setInspectResult(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setIsInspecting(true);

    try {
      const inspection = await clientBackupService.inspectBackupFile(file);
      setInspectResult(inspection);
      if (!inspection.valid && inspection.error) {
        setRestoreError(inspection.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to inspect file.';
      setRestoreError(msg);
    } finally {
      setIsInspecting(false);
    }
  };

  // Handle Restore Execution
  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectResult?.envelope || !selectedFile) {
      setRestoreError('No valid backup file loaded.');
      return;
    }
    if (!restorePassword) {
      setRestoreError('Please enter the backup decryption password.');
      return;
    }
    if (!confirmTerms) {
      setRestoreError('Please confirm the restoration acknowledgment.');
      return;
    }

    setRestoreError(null);
    setRestoreProgress({ stage: 'Deriving encryption key...', percent: 10 });

    try {
      // 1. Decrypt and validate payload completely before modifying stores
      const decryptedPayload = await clientBackupService.decryptAndValidateBackup(
        inspectResult.envelope,
        restorePassword,
        (stage, percent) => {
          setRestoreProgress({ stage, percent: Math.round(percent * 0.5) });
        }
      );

      // 2. Safely apply to workspace
      const result = await restoreWorkspaceFromBackup(
        decryptedPayload,
        restoreMode,
        (stage, percent) => {
          setRestoreProgress({ stage, percent: 50 + Math.round(percent * 0.5) });
        }
      );

      setRestoreSuccess(result);
      setRestoreProgress(null);
      setRestorePassword('');
      setSelectedFile(null);
      setInspectResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restoration failed.';
      setRestoreError(msg);
      setRestoreProgress(null);
    }
  };

  const closeExportModal = () => {
    if (exportResult?.blobUrl) {
      try { URL.revokeObjectURL(exportResult.blobUrl); } catch (_) {}
    }
    setShowExportModal(false);
    setExportPassword('');
    setExportConfirmPassword('');
    setExportError(null);
    setExportProgress(null);
    setExportResult(null);
  };

  return (
    <div id="backup-restore-panel-root" className="space-y-6">
      
      {/* Privacy & Storage Scope Banner */}
      <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 space-y-2.5">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold font-sans">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Air-Gapped Zero-Cloud Cryptographic Backup</span>
        </div>
        <p className="leading-relaxed font-sans text-slate-300">
          Your backup is encrypted locally using <strong className="text-white">AES-GCM-256</strong> with a key derived via <strong className="text-white">PBKDF2 (100,000 iterations, SHA-256)</strong>. LOCALIQ runs 100% in your browser and never uploads your backup or encryption keys anywhere.
        </p>
        <div className="pt-2 border-t border-cyan-500/20 flex items-start gap-2 text-[11px] text-slate-400 font-sans">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Storage Scope:</strong> Indexed knowledge, text chunks, page provenance, vector embeddings, chat conversations, and workspace settings are backed up. Original uploaded binary files are not included because LOCALIQ does not persist raw binary files in browser storage.
          </span>
        </div>
      </div>

      {/* Grid of Actions: Backup (Left) and Restore (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CREATE ENCRYPTED BACKUP */}
        <div className="p-6 rounded-3xl bg-[#050C14] border border-white/10 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-sans">Create Encrypted Backup</h4>
                <p className="text-[11px] text-slate-400 font-sans">Export current workspace into a secure .localiq vault file.</p>
              </div>
            </div>

            {/* Current Workspace Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#08121D] border border-white/5 text-[11px] font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase block">Documents</span>
                <span className="text-white font-bold">{files.length}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase block">Chunks</span>
                <span className="text-cyan-300 font-bold">{totalChunks}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase block">Vectors</span>
                <span className="text-indigo-300 font-bold">{totalVectors}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase block">Messages</span>
                <span className="text-emerald-300 font-bold">{chatMessages.length}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero authentication credentials or password hashes included</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Protected by fresh 32-byte cryptographic salt & 12-byte IV</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full vector index & cosine similarity geometry preserved</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="open-create-backup-modal-btn"
            onClick={() => setShowExportModal(true)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer font-sans"
          >
            <Lock className="w-4 h-4" />
            <span>Create Encrypted Backup</span>
          </button>
        </div>

        {/* CARD 2: RESTORE ENCRYPTED BACKUP */}
        <div className="p-6 rounded-3xl bg-[#050C14] border border-white/10 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-sans">Restore Encrypted Backup</h4>
                <p className="text-[11px] text-slate-400 font-sans">Select a .localiq backup file to verify and restore.</p>
              </div>
            </div>

            {/* File Picker / Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                selectedFile
                  ? 'border-cyan-500/50 bg-cyan-950/20'
                  : 'border-white/10 hover:border-cyan-500/30 bg-[#08121D]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".localiq,.json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-file-input"
              />
              <div className="flex flex-col items-center gap-2">
                <FileCheck className={`w-6 h-6 ${selectedFile ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="text-xs font-semibold text-white font-sans">
                  {selectedFile ? selectedFile.name : 'Choose .localiq file to restore'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedFile ? formatBytes(selectedFile.size) : 'Click or drop encrypted backup'}
                </span>
              </div>
            </div>

            {/* Inspection Status */}
            {isInspecting && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Inspecting backup header and format...</span>
              </div>
            )}

            {/* Validated Backup Metadata */}
            {inspectResult?.valid && inspectResult.summary && (
              <div className="p-3.5 rounded-2xl bg-[#08121D] border border-cyan-500/20 space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Workspace:</span>
                  <span className="font-semibold text-white">{inspectResult.summary.workspaceName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Payload:</span>
                  <span className="text-cyan-300">
                    {inspectResult.summary.fileCount} files · {inspectResult.summary.vectorCount} vectors ({inspectResult.summary.vectorDimensions}d)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Encryption:</span>
                  <span className="text-emerald-400">AES-GCM (100k PBKDF2)</span>
                </div>
              </div>
            )}

            {/* Restore Success Banner */}
            {restoreSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-sans space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Workspace Restored Successfully!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Mode: <strong className="text-white capitalize">{restoreSuccess.mode}</strong> · Restored {restoreSuccess.restoredFilesCount} files and {restoreSuccess.restoredVectorsCount} vector records.
                </p>
              </div>
            )}

            {/* Restore Error Banner */}
            {restoreError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-sans flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{restoreError}</span>
              </div>
            )}
          </div>

          {/* If file is validated, show password & mode options */}
          {inspectResult?.valid ? (
            <form onSubmit={handleExecuteRestore} className="space-y-4 pt-2 border-t border-white/5">
              {/* Decryption Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 font-sans">
                  Backup Decryption Password
                </label>
                <div className="relative">
                  <input
                    type={showRestorePassword ? 'text' : 'password'}
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    placeholder="Enter backup password..."
                    className="w-full px-4 py-2 rounded-xl bg-[#08121D] border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRestorePassword(!showRestorePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showRestorePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 font-sans">
                  Restoration Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      restoreMode === 'merge'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                        : 'bg-[#08121D] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block font-sans">Merge Workspace</span>
                    <span className="text-[10px] text-slate-400 font-sans block leading-tight mt-0.5">
                      Combines backup into current workspace. Deterministically avoids ID collisions.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      restoreMode === 'replace'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-[#08121D] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block font-sans">Replace Workspace</span>
                    <span className="text-[10px] text-slate-400 font-sans block leading-tight mt-0.5">
                      Replaces existing files, vectors, and chat history with backup contents.
                    </span>
                  </button>
                </div>
              </div>

              {/* Acknowledgment */}
              <label className="flex items-start gap-2 text-[11px] text-slate-300 font-sans cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmTerms}
                  onChange={(e) => setConfirmTerms(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-cyan-500 focus:ring-0"
                />
                <span>
                  I understand this restore will modify my local browser database with verified backup records.
                </span>
              </label>

              {/* Progress indicator */}
              {restoreProgress && (
                <div className="space-y-1.5 p-3 rounded-xl bg-[#08121D] border border-cyan-500/20">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                    <span>{restoreProgress.stage}</span>
                    <span>{restoreProgress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${restoreProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="execute-restore-button"
                disabled={!confirmTerms || !restorePassword || !!restoreProgress}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all cursor-pointer font-sans"
              >
                <KeyRound className="w-4 h-4" />
                <span>Decrypt & Restore Workspace</span>
              </button>
            </form>
          ) : (
            <div className="pt-2 text-center text-xs text-slate-400 font-sans">
              Select a valid .localiq backup file above to initiate verification and restore.
            </div>
          )}
        </div>

      </div>

      {/* EXPORT BACKUP MODAL */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-[#050C14] border border-cyan-500/30 shadow-2xl text-left space-y-5"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Create Encrypted Backup</h3>
                    <p className="text-xs text-slate-400 font-sans">Set an encryption password for your .localiq file</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeExportModal}
                  className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              {!exportResult ? (
                <form onSubmit={handleStartExport} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-sans flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Important:</strong> LOCALIQ never stores your backup password. If you lose this password, this backup file cannot be decrypted by anyone.
                    </span>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300 font-sans">
                      Encryption Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showExportPassword ? 'text' : 'password'}
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        placeholder="Create strong password..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#08121D] border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none pr-10 font-mono"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowExportPassword(!showExportPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showExportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300 font-sans">
                      Confirm Encryption Password
                    </label>
                    <input
                      type={showExportPassword ? 'text' : 'password'}
                      value={exportConfirmPassword}
                      onChange={(e) => setExportConfirmPassword(e.target.value)}
                      placeholder="Re-enter password..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#08121D] border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Progress state */}
                  {exportProgress && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-[#08121D] border border-cyan-500/20">
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                        <span>{exportProgress.stage}</span>
                        <span>{exportProgress.percent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-300"
                          style={{ width: `${exportProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {exportError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      {exportError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={closeExportModal}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="start-export-submit-btn"
                      disabled={!exportPassword || !exportConfirmPassword || !!exportProgress}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Encrypt & Download</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Success View */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Backup Generated & Encrypted!</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Your backup was encrypted with AES-GCM-256 and downloaded to your device as <strong className="text-white">{exportResult.fileName}</strong> ({formatBytes(exportResult.fileSize)}).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#08121D] border border-white/5 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Documents:</span>
                      <span className="text-white">{exportResult.summary.fileCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vector Records:</span>
                      <span className="text-cyan-300">{exportResult.summary.vectorCount} (384d)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Chat Messages:</span>
                      <span className="text-emerald-300">{exportResult.summary.chatMessageCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <a
                      href={exportResult.blobUrl}
                      download={exportResult.fileName}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Re-download file</span>
                    </a>
                    <button
                      type="button"
                      onClick={closeExportModal}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
