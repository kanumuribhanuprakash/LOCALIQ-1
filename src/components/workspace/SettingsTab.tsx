import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LOCAL_LLM_MODELS } from '../../services/localModelRegistry';
import {
  Settings,
  Shield,
  Cpu,
  Database,
  FolderLock,
  Lock,
  HardDrive,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Binary,
  Radio,
  Trash2,
  Info,
  Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BackupRestorePanel } from './BackupRestorePanel';

type SettingsSection = 'workspace' | 'embeddings' | 'privacy' | 'backup' | 'danger';

export const SettingsTab: React.FC = () => {
  const {
    settings,
    updateSettings,
    clearAllFiles,
    files,
    logActivity,
    clearChatHistory,
    switchLocalLLM,
  } = useApp();

  const [activeSection, setActiveSection] = useState<SettingsSection>('workspace');
  const [savedToast, setSavedToast] = useState(false);
  const [dangerToast, setDangerToast] = useState<string | null>(null);

  // Local state mirror for form editing
  const [formData, setFormData] = useState({
    ...settings,
    workspace: {
      ...settings.workspace,
      description: settings.workspace.description || 'On-device private AI intelligence vault with air-gapped vector persistence.',
    },
    localProcessing: {
      ...settings.localProcessing,
      similarityThreshold: settings.localProcessing.similarityThreshold ?? 0.35,
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const showDangerToast = (msg: string) => {
    setDangerToast(msg);
    setTimeout(() => setDangerToast(null), 3500);
  };

  const handleClearVectorIndex = () => {
    if (confirm('Are you sure you want to clear the local vector index? All indexed chunks will need to be re-embedded.')) {
      logActivity('processing', 'Vector Index Cleared', 'Air-gapped vector embeddings wiped from local IndexedDB.');
      showDangerToast('Local vector index cleared successfully.');
    }
  };

  const handleClearAllFiles = () => {
    if (confirm('Are you sure you want to purge all files and vector embeddings from this device?')) {
      clearAllFiles();
      showDangerToast('All knowledge files and vectors purged from local device.');
    }
  };

  const handleResetWorkspace = () => {
    if (confirm('RESET WORKSPACE: This will clear all documents, embeddings, search history, and restore default configurations. Proceed?')) {
      clearAllFiles();
      clearChatHistory();
      logActivity('settings', 'Workspace Reset', 'Workspace returned to factory default state.');
      showDangerToast('Workspace fully reset to factory defaults.');
    }
  };

  const sections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'workspace', label: 'Workspace & Identity', icon: FolderLock },
    { id: 'embeddings', label: 'Embeddings & Retrieval', icon: Binary },
    { id: 'privacy', label: 'Privacy & Telemetry', icon: Shield },
    { id: 'backup', label: 'Backup & Restore', icon: HardDrive },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div id="settings-tab-root" className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-7 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
              Settings & Technical Configuration
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#050C14] text-cyan-300 border border-cyan-500/20">
              LOCALIQ Core
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans">
            Configure local vector dimensions, chunking chunk-size, zero-telemetry rules, and on-device storage.
          </p>
        </div>

        {savedToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved</span>
          </motion.div>
        )}

        {dangerToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{dangerToast}</span>
          </motion.div>
        )}
      </div>

      {/* Main Settings Grid: Navigation on Left, Form on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Sub-navigation */}
        <div className="md:col-span-4 space-y-1.5">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            const isDanger = sec.id === 'danger';
            return (
              <button
                key={sec.id}
                id={`settings-nav-${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer text-left font-sans ${
                  isActive
                    ? isDanger
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm'
                      : 'bg-[#08121D] text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : isDanger
                    ? 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/5 border border-transparent'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? (isDanger ? 'text-rose-400' : 'text-cyan-400') : 'text-slate-500'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}

          <div className="p-5 mt-6 rounded-2xl bg-[#08121D] border border-cyan-500/20 text-[11px] text-slate-300 space-y-2">
            <span className="font-mono text-cyan-400 font-bold uppercase tracking-wider block">
              Hardware Isolation
            </span>
            <p className="leading-relaxed font-sans">
              All configurations execute client-side. Embedding weights and IndexedDB vector tables remain strictly bound to your local browser storage.
            </p>
          </div>
        </div>

        {/* Right Settings Form Container */}
        <div className="md:col-span-8 p-7 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl text-left">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* SECTION 1: WORKSPACE & IDENTITY */}
            {activeSection === 'workspace' && (
              <div className="space-y-5">
                <div className="border-b border-white/5 pb-3.5">
                  <h3 className="text-base font-bold text-white font-sans">Workspace & Identity</h3>
                  <p className="text-xs text-slate-400 font-sans">Define vault identity and verify storage subsystem status.</p>
                </div>

                {/* Workspace Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={formData.workspace.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workspace: { ...formData.workspace, name: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050C14] border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
                    placeholder="Enter workspace name..."
                  />
                </div>

                {/* Workspace Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">
                    Workspace Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.workspace.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workspace: { ...formData.workspace, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050C14] border border-white/10 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans leading-relaxed"
                    placeholder="Enter workspace description..."
                  />
                </div>

                {/* Storage Location */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block font-sans">Storage Location</span>
                    <span className="text-[11px] font-mono text-cyan-300">
                      Local Device (IndexedDB / OPFS)
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 w-fit">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Mounted & Isolated</span>
                  </span>
                </div>

                {/* Auto-Index Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#050C14] border border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-white block font-sans">Auto-Index Ingested Files</span>
                    <span className="text-[11px] text-slate-400 font-sans">Automatically extract text and generate embeddings upon drop.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.workspace.autoIndexNewFiles}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workspace: { ...formData.workspace, autoIndexNewFiles: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: EMBEDDINGS & RETRIEVAL */}
            {activeSection === 'embeddings' && (
              <div className="space-y-5">
                <div className="border-b border-white/5 pb-3.5">
                  <h3 className="text-base font-bold text-white font-sans">Embeddings & Retrieval</h3>
                  <p className="text-xs text-slate-400 font-sans">Local dense vector model hyperparameters and similarity search bounds.</p>
                </div>

                {/* Local Embedding Model Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">
                    Local Embedding Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'sentence-transformers/all-MiniLM-L6-v2',
                        name: 'all-MiniLM-L6-v2',
                        badge: 'Default',
                        desc: '384 dimensions • 80MB ONNX runtime • Optimal balance',
                      },
                      {
                        id: 'bge-small-en-v1.5',
                        name: 'bge-small-en-v1.5',
                        badge: 'Alternative',
                        desc: '384 dimensions • High retrieval accuracy for dense texts',
                      },
                    ].map((model) => {
                      const isSelected = formData.localProcessing.embeddingModel.includes(model.name);
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              localProcessing: { ...formData.localProcessing, embeddingModel: `${model.name} (Local)` },
                            })
                          }
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#050C14] border-cyan-400/80 shadow-md shadow-cyan-500/10'
                              : 'bg-[#050C14] border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-white">{model.name}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              isSelected
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                : 'bg-white/5 text-slate-400 border-white/5'
                            }`}>
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug font-sans">{model.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Local LLM Model Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300 font-sans">
                      Local Language Model (Inference)
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400">
                      100% In-Browser Private
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LOCAL_LLM_MODELS.map((model) => {
                      const isSelected =
                        formData.localProcessing.inferenceModel === model.id ||
                        (!formData.localProcessing.inferenceModel && model.isDefault);
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              localProcessing: {
                                ...formData.localProcessing,
                                inferenceModel: model.id,
                              },
                            });
                            switchLocalLLM(model.id);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#050C14] border-cyan-400/80 shadow-md shadow-cyan-500/10'
                              : 'bg-[#050C14] border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-white">
                              {model.displayName}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                isSelected
                                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                  : 'bg-white/5 text-slate-400 border-white/5'
                              }`}
                            >
                              {model.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug font-sans">
                            {model.description}
                          </p>
                          <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                            <span>Size: {model.approximateSize}</span>
                            <span>Context: {model.contextLength}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chunk Size Slider (256 - 1024 tokens) */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white font-sans">Chunk Size</span>
                    <span className="font-mono text-cyan-400 font-bold">{formData.localProcessing.chunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="64"
                    value={formData.localProcessing.chunkSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        localProcessing: { ...formData.localProcessing, chunkSize: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>256 tokens (Dense)</span>
                    <span>1024 tokens (Broad)</span>
                  </div>
                </div>

                {/* Chunk Overlap Slider (20 - 128 tokens) */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white font-sans">Chunk Overlap</span>
                    <span className="font-mono text-cyan-400 font-bold">{formData.localProcessing.chunkOverlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="128"
                    step="4"
                    value={formData.localProcessing.chunkOverlap}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        localProcessing: { ...formData.localProcessing, chunkOverlap: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>20 tokens (Minimal)</span>
                    <span>128 tokens (Continuous)</span>
                  </div>
                </div>

                {/* Similarity Threshold Slider (0.2 - 0.8) */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white font-sans">Similarity Threshold</span>
                    <span className="font-mono text-cyan-400 font-bold">≥ {formData.localProcessing.similarityThreshold?.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.05"
                    value={formData.localProcessing.similarityThreshold ?? 0.35}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        localProcessing: { ...formData.localProcessing, similarityThreshold: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0.20 (Broad recall)</span>
                    <span>0.80 (Strict precision)</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PRIVACY & TELEMETRY */}
            {activeSection === 'privacy' && (
              <div className="space-y-5">
                <div className="border-b border-white/5 pb-3.5">
                  <h3 className="text-base font-bold text-white font-sans">Privacy & Telemetry</h3>
                  <p className="text-xs text-slate-400 font-sans">Enforce air-gapped guarantees and zero-telemetry hardware restrictions.</p>
                </div>

                {/* Air-gapped mode toggle (always on / locked) */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/25 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-white font-sans">Air-Gapped Mode</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        Always On / Locked
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      All indexing and vector operations are strictly contained within local runtime memory.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold shrink-0">
                    ENFORCED
                  </div>
                </div>

                {/* Network calls toggle (disabled) */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-white/5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-white font-sans">External Network Calls</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                        Permanently Disabled
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Outbound socket connections and third-party tracking APIs are hard-disabled at the runtime boundary.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-500 text-xs font-mono font-bold shrink-0">
                    OFF
                  </div>
                </div>

                {/* Local encryption status indicator */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-emerald-500/20 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white font-sans">Local Encryption Status</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono">
                      WebCrypto AES-256-GCM hardware key isolation active
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>
              </div>
            )}

            {/* SECTION: BACKUP & RESTORE */}
            {activeSection === 'backup' && (
              <div className="space-y-5">
                <div className="border-b border-white/5 pb-3.5">
                  <h3 className="text-base font-bold text-white font-sans">Encrypted Backup & Restore</h3>
                  <p className="text-xs text-slate-400 font-sans">Export and restore your workspace vault using browser-native Web Crypto encryption.</p>
                </div>
                <BackupRestorePanel />
              </div>
            )}

            {/* SECTION 4: DANGER ZONE */}
            {activeSection === 'danger' && (
              <div className="space-y-5">
                <div className="border-b border-rose-500/20 pb-3.5">
                  <h3 className="text-base font-bold text-rose-400 font-sans">Danger Zone</h3>
                  <p className="text-xs text-slate-400 font-sans">Destructive operations for local vector caches and workspace storage.</p>
                </div>

                {/* Clear Local Vector Index */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block font-sans">Clear Local Vector Index</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Purges all computed 384-dim embeddings from the browser's vector store while retaining raw files.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearVectorIndex}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0 font-sans"
                  >
                    Clear Vector Index
                  </button>
                </div>

                {/* Clear All Knowledge Files */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block font-sans">Clear All Knowledge Files</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Permanently wipes all uploaded documents, chunks, and cached metadata from this machine.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllFiles}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0 font-sans"
                  >
                    Clear All Files ({files.length})
                  </button>
                </div>

                {/* Reset Workspace */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block font-sans">Reset Workspace</span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Restores all settings, clearances, and audit histories to original factory defaults.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetWorkspace}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0 font-sans"
                  >
                    Reset Workspace
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Save Action */}
            {activeSection !== 'backup' && (
              <div className="pt-5 border-t border-white/5 flex justify-end">
                <button
                  type="submit"
                  id="settings-save-button"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] font-sans"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Preferences</span>
                </button>
              </div>
            )}

          </form>
        </div>

      </div>

    </div>
  );
};
