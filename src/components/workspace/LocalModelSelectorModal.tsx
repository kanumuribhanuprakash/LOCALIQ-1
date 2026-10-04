import React from 'react';
import {
  X,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Info,
  RefreshCw,
  HardDrive,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LOCAL_LLM_MODELS, LocalLLMModelConfig } from '../../services/localModelRegistry';

interface LocalModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalModelSelectorModal: React.FC<LocalModelSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { localLLMInfo, loadLocalLLM, switchLocalLLM, settings } = useApp();
  const [switchingModelId, setSwitchingModelId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const currentModelId =
    localLLMInfo.modelId ||
    settings.localProcessing?.inferenceModel ||
    LOCAL_LLM_MODELS[0].id;

  const isModelLoading =
    localLLMInfo.status === 'loading' || localLLMInfo.status === 'Loading Model';
  const isModelReady =
    localLLMInfo.status === 'ready' || localLLMInfo.status === 'Model Ready';
  const isModelError =
    localLLMInfo.status === 'error' || localLLMInfo.status === 'Failed';
  const isModelGenerating =
    localLLMInfo.status === 'generating' || localLLMInfo.status === 'Generating';

  const handleSelectModel = async (model: LocalLLMModelConfig) => {
    if (model.id === currentModelId && isModelReady) {
      return;
    }
    setSwitchingModelId(model.id);
    try {
      await switchLocalLLM(model.id);
    } catch (err) {
      console.error('Failed to switch model:', err);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleReloadCurrent = async () => {
    setSwitchingModelId(currentModelId);
    try {
      await loadLocalLLM(currentModelId);
    } catch (err) {
      console.error('Failed to reload model:', err);
    } finally {
      setSwitchingModelId(null);
    }
  };

  return (
    <div
      id="local-model-selector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#08121D] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-cyan-500/20 bg-[#050C14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">
                  Local Language Model Selector
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                  <Lock className="w-2.5 h-2.5" /> 100% In-Browser Private
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Transformers.js & ONNX Runtime Web • Zero Cloud Dependencies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Active Model Status Card */}
          <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Current Active Engine:</span>
                <span className="text-sm font-bold text-white font-sans">
                  {localLLMInfo.displayName || localLLMInfo.modelName}
                </span>
              </div>
              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {isModelReady && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready
                  </span>
                )}
                {isModelLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    Loading ({localLLMInfo.progress}%)
                  </span>
                )}
                {isModelGenerating && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-3 h-3 animate-pulse text-amber-400" />
                    Generating
                  </span>
                )}
                {isModelError && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    Load Failed
                  </span>
                )}
                {!isModelReady && !isModelLoading && !isModelGenerating && !isModelError && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    Idle (Not Loaded)
                  </span>
                )}
              </div>
            </div>

            {/* Status message or Progress Bar */}
            {isModelLoading && (
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.max(5, localLLMInfo.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{localLLMInfo.statusMessage}</span>
                  <span>{localLLMInfo.progress}%</span>
                </div>
              </div>
            )}

            {isModelError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Model Initialization Error</span>
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed font-sans">
                  {localLLMInfo.error ||
                    'Unable to load this local model. No data was sent to a cloud AI service. Try another verified local model or retry.'}
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleReloadCurrent}
                    disabled={switchingModelId !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Loading</span>
                  </button>
                </div>
              </div>
            )}

            {/* Model Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-2 rounded-xl bg-[#08121D] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Backend:</span>
                <span className="font-bold text-cyan-300">{localLLMInfo.device.toUpperCase()}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#08121D] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Footprint:</span>
                <span className="font-bold text-slate-200">{localLLMInfo.approximateSize || '~45 MB'}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#08121D] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Context:</span>
                <span className="font-bold text-slate-200">{localLLMInfo.contextLimit || 2048} tokens</span>
              </div>
              <div className="p-2 rounded-xl bg-[#08121D] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Grounding Mode:</span>
                <span className="font-bold text-emerald-400">Strict (Temp 0.0)</span>
              </div>
            </div>
          </div>

          {/* Model Registry List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Verified In-Browser Models ({LOCAL_LLM_MODELS.length})
              </h4>
              <span className="text-[10px] font-mono text-cyan-400">
                Client-Side Only
              </span>
            </div>

            <div className="space-y-2.5">
              {LOCAL_LLM_MODELS.map((model) => {
                const isSelected = model.id === currentModelId;
                const isSwitching = switchingModelId === model.id;

                return (
                  <div
                    key={model.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                        : 'bg-[#050C14] hover:bg-[#07111c] border-white/10 hover:border-cyan-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white font-sans">
                            {model.displayName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                            {model.tag}
                          </span>
                          {model.isDefault && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {model.description}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
                          <span>Repository: <strong className="text-slate-300">{model.id}</strong></span>
                          <span>Size: <strong className="text-slate-300">{model.approximateSize}</strong></span>
                          <span>Context: <strong className="text-slate-300">{model.contextLength}</strong></span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 pt-0.5">
                        {isSelected ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                            {!isModelReady && !isModelLoading && (
                              <button
                                onClick={handleReloadCurrent}
                                disabled={isSwitching}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-colors cursor-pointer"
                              >
                                {isSwitching ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'Load Model'
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectModel(model)}
                            disabled={isSwitching || isModelLoading || isModelGenerating}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-500/60 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {isSwitching ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                <span>Switching...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Switch to Model</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Environment Guarantee Notice (Truthfulness rule) */}
          <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Verified In-Browser Model Policy</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
              LOCALIQ strictly enforces in-browser privacy and memory safety. Only models verified to initialize and execute within browser WebGPU/WASM limits are exposed in this selector. Model switching releases existing memory pipelines before initializing new weights to ensure deterministic, leak-free operation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-cyan-500/20 bg-[#050C14] flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Browser-cached neural weights</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
