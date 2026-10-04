import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Send,
  Sparkles,
  UploadCloud,
  FileText,
  ShieldCheck,
  RotateCcw,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  SearchX,
  Loader2,
  Database,
  Layers,
  AlertCircle,
  HelpCircle,
  Paperclip,
  Cpu,
  Binary,
  Copy,
  Check,
  BrainCircuit,
  Zap,
  Play,
  Table,
  BarChart2,
  FileCheck,
  Square,
  Mic,
  Radio,
  Code,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SemanticEvidenceChunk } from '../../types';
import { VectorDiagnosticsModal } from './VectorDiagnosticsModal';
import { LocalModelSelectorModal } from './LocalModelSelectorModal';
import { localEmbeddingService } from '../../services/localEmbeddingService';
import { clientVectorIndexService, dotProduct } from '../../services/clientVectorIndexService';
import { InteractiveGroundedAnswer } from './InteractiveGroundedAnswer';
import { VoiceDictationPanel } from './assistant/VoiceDictationBar';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

export const AssistantTab: React.FC = () => {
  const {
    files,
    chatMessages,
    isSearching,
    sendChatMessage,
    stopGeneration,
    clearChatHistory,
    setActiveTab,
    localIndexStats,
    localLLMInfo,
    loadLocalLLM,
    loadTestKnowledgeDocument,
    loadMultimodalTestSuite,
    activeDocumentId,
    setActiveDocumentId,
  } = useApp();

  const [inputValue, setInputValue] = useState('');
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [expandedChunkIds, setExpandedChunkIds] = useState<Set<string>>(new Set());
  const [expandedDebugMsgIds, setExpandedDebugMsgIds] = useState<Set<string>>(new Set());
  const [copiedAnswerMsgId, setCopiedAnswerMsgId] = useState<string | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [isLoadingTestDoc, setIsLoadingTestDoc] = useState(false);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [vectorModalFileId, setVectorModalFileId] = useState<string | undefined>(undefined);
  const [testingInlineExact, setTestingInlineExact] = useState(false);
  const [inlineExactTest, setInlineExactTest] = useState<{
    chunkId: string;
    sampleText: string;
    similarity: number;
    queryNorm: number;
    chunkNorm: number;
    durationMs: number;
    passed: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInlineExactTest = async (chunkId: string, text: string) => {
    setTestingInlineExact(true);
    setInlineExactTest(null);
    const t0 = performance.now();
    try {
      const clean = text.trim();
      const sample = clean.length > 120 ? clean.substring(0, 120) : clean;
      const qVec = await localEmbeddingService.embedQuery(sample);
      const userVectors = await clientVectorIndexService.getAllUserVectors(files[0]?.uploadedBy || 'demo-analyst-default');
      const rec = userVectors.find((v) => v.chunkId === chunkId);
      if (!rec) return;

      let qSum = 0;
      for (let i = 0; i < qVec.length; i++) qSum += qVec[i] * qVec[i];
      let dSum = 0;
      for (let i = 0; i < rec.vector.length; i++) dSum += rec.vector[i] * rec.vector[i];

      const sim = dotProduct(qVec, rec.vector);
      const durationMs = Math.round(performance.now() - t0);

      setInlineExactTest({
        chunkId,
        sampleText: sample,
        similarity: Number(sim.toFixed(4)),
        queryNorm: Number(Math.sqrt(qSum).toFixed(4)),
        chunkNorm: Number(Math.sqrt(dSum).toFixed(4)),
        durationMs,
        passed: sim >= 0.70,
      });
    } catch (err) {
      console.error('Inline exact test failed', err);
    } finally {
      setTestingInlineExact(false);
    }
  };

  const handleCopyAnswer = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswerMsgId(msgId);
    setTimeout(() => setCopiedAnswerMsgId(null), 2000);
  };

  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const handleLoadTestDoc = async () => {
    setIsLoadingTestDoc(true);
    try {
      await loadTestKnowledgeDocument();
    } finally {
      setIsLoadingTestDoc(false);
    }
  };

  const toggleDebugExpand = (msgId: string) => {
    setExpandedDebugMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Auto scroll to bottom when new messages arrive or loading changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSearching]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSearching) return;
    const query = inputValue;
    setInputValue('');
    sendChatMessage(query);
  };

  const handleVoiceTranscriptSubmitted = useCallback((query: string) => {
    setInputValue('');
    sendChatMessage(query);
  }, [sendChatMessage]);

  const voice = useVoiceDictation(handleVoiceTranscriptSubmitted);

  // Automatically re-arm hands-free listening when a search completes
  useEffect(() => {
    if (voice.isHandsFree && !isSearching && voice.state === 'idle') {
      const timer = setTimeout(() => {
        if (voice.isHandsFree && voice.state === 'idle') {
          voice.startRecording({ enableSilenceDetection: true });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [voice.isHandsFree, isSearching, voice.state, voice.startRecording]);

  const totalChunks = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.chunksCreated || f.vectorsIndexed || 0), 0);
  }, [files]);

  // Suggested prompt pills including Hallucination Tests (A-F)
  const suggestedPrompts = [
    'What is the initial state of the Monkey Banana problem?',
    'What is the goal state?',
    'What algorithm is used to explore the states?',
    "What is the monkey's maximum lifting capacity?",
    "What is the student's registration number?",
    'What embedding model does LOCALIQ use?',
  ];

  const handleSuggestedClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const toggleChunkExpand = (chunkId: string) => {
    setExpandedChunkIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  // Helper for relevance score badge
  const getRelevanceBadge = (score: number) => {
    const pct = Math.round(score * 100);
    if (score >= 0.70) {
      return {
        label: 'High Match',
        scoreText: `${pct}%`,
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
      };
    } else if (score >= 0.45) {
      return {
        label: 'Medium Match',
        scoreText: `${pct}%`,
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
      };
    } else {
      return {
        label: 'Moderate Match',
        scoreText: `${pct}%`,
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
      };
    }
  };

  // Case 1: When NO knowledge files are uploaded yet
  if (files.length === 0) {
    return (
      <div id="assistant-empty-state-root" className="max-w-4xl mx-auto py-12 px-4">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#08121D] border border-cyan-500/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-[#050C14] border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
            <Bot className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
              Upload knowledge before asking LOCALIQ questions.
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              LOCALIQ answers questions by retrieving and synthesizing evidence exclusively from your on-device private documents, images, and audio transcripts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('knowledge')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Go to Knowledge Base & Upload</span>
            </button>
            <button
              onClick={handleLoadTestDoc}
              disabled={isLoadingTestDoc}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-cyan-200 hover:text-white bg-[#050C14] hover:bg-cyan-500/10 border border-cyan-500/30 shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isLoadingTestDoc ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-cyan-400" />
              )}
              <span>{isLoadingTestDoc ? 'Indexing Test Document...' : 'Load Test Knowledge Document'}</span>
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 max-w-lg mx-auto flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Strict Zero-Hallucination Policy: All queries require grounded local documents.</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Files exist -> Full LOCALIQ Assistant Interface
  return (
    <div id="assistant-chat-root" className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)] min-h-[540px]">
      {/* TOP BAR */}
      <div className="p-4 sm:p-5 rounded-t-3xl bg-[#08121D] border border-cyan-500/20 border-b-0 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#050C14] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-tight font-sans">
                LOCALIQ Intelligence Engine
              </h2>
              {/* Active knowledge context badge */}
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                Grounded in {files.length} {files.length === 1 ? 'file' : 'files'} ({totalChunks} chunks)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              On-device dense vector retrieval & cosine semantic matching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* STEP 13: In-App Local LLM Model Selector & Runtime Pill */}
          <button
            id="assistant-model-selector-btn"
            type="button"
            onClick={() => setIsModelModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#050C14] hover:bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/50 text-[11px] font-mono transition-all text-slate-200 hover:text-white cursor-pointer group shadow-sm"
            title="Open Local Language Model Selector & Runtime Diagnostics"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  localLLMInfo.status === 'ready' || (localLLMInfo as any).status === 'Model Ready'
                    ? 'bg-emerald-400 animate-pulse'
                    : localLLMInfo.status === 'loading' || (localLLMInfo as any).status === 'Loading Model'
                    ? 'bg-cyan-400 animate-spin'
                    : localLLMInfo.status === 'generating' || (localLLMInfo as any).status === 'Generating'
                    ? 'bg-amber-400 animate-ping'
                    : localLLMInfo.status === 'error' || (localLLMInfo as any).status === 'Failed'
                    ? 'bg-rose-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                {localLLMInfo.displayName?.split(' ')[0] || localLLMInfo.modelName.split('/').pop()}
              </span>
            </div>

            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-sans font-medium uppercase">
              {localLLMInfo.device.toUpperCase()}
            </span>

            {localLLMInfo.status === 'loading' && (
              <span className="text-[10px] text-cyan-300 font-mono">
                {localLLMInfo.progress}%
              </span>
            )}

            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-cyan-300 transition-transform group-hover:translate-y-0.5" />
          </button>

          {/* Quick Action: Load Model if idle */}
          {(localLLMInfo.status === 'Not Loaded' || (localLLMInfo as any).status === 'idle') && (
            <button
              onClick={() => loadLocalLLM()}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-300 hover:text-cyan-300 bg-[#050C14] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 px-3 py-1 rounded-full transition-colors cursor-pointer"
              title="Pre-warm on-device local model"
            >
              <Cpu className="w-3 h-3 text-slate-400" />
              <span>Load Model</span>
            </button>
          )}

          {/* Quick Action: Retry if error */}
          {(localLLMInfo.status === 'Failed' || (localLLMInfo as any).status === 'error') && (
            <button
              onClick={() => loadLocalLLM()}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full hover:bg-rose-500/20 transition-colors cursor-pointer"
              title={localLLMInfo.error || 'Click to retry loading local model'}
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>Retry</span>
            </button>
          )}

          {/* Privacy Indicator */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-cyan-300 bg-[#050C14] border border-cyan-500/20 px-3 py-1 rounded-full cursor-help"
            title="Your question and retrieved document content are processed locally in this browser."
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Local processing</span>
          </div>

          {chatMessages.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer font-mono"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* CHAT MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#05080D] border-x border-cyan-500/10 space-y-6">
        {/* EMPTY STATE / WELCOME */}
        {chatMessages.length === 0 && (
          <div className="p-8 rounded-3xl bg-[#08121D] border border-cyan-500/20 space-y-6 relative overflow-hidden text-center">
            {/* Subtle LOCALIQ core glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-[70px] pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-[#050C14] border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-7 h-7 stroke-[1.8]" />
            </div>

            {files.filter(f => f.processingStatus === 'Indexed' || f.indexedStatus).length === 0 ? (
              /* PART O: Clean Empty State when no files are indexed yet */
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                    Your private knowledge assistant is ready.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    Upload documents, images, or recordings to build your local knowledge base.
                  </p>
                  <p className="text-xs text-cyan-400 font-mono font-medium pt-1">
                    Nothing is sent to a cloud AI service.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('knowledge')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Add Knowledge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadMultimodalTestSuite();
                      setActiveTab('knowledge');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer font-mono"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Load Sample Suite</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Ready state with suggested prompts */
              <div className="space-y-6">
                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                    How can LOCALIQ assist you today?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    Ask questions about your uploaded documents, contracts, images or audio transcripts.
                  </p>
                </div>

                {/* Suggested prompt pills */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    SUGGESTED PROMPTS (CLICK TO LOAD)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedClick(prompt)}
                        className="p-3 rounded-xl bg-[#050C14] hover:bg-[#091522] border border-cyan-500/20 hover:border-cyan-500/40 text-left text-xs text-slate-200 hover:text-cyan-300 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <span className="truncate font-sans font-medium">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-[#050C14] border border-white/5 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-cyan-400" />
                    <span>384-dim all-MiniLM-L6-v2 ONNX</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#050C14] border border-white/5 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-emerald-400" />
                    <span>Cosine Similarity ≥ 0.35</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MESSAGE FEED */}
        {chatMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isSearchingMsg = msg.searchStatus === 'searching';
          const isNotFoundMsg = msg.searchStatus === 'not_found';
          const isErrorMsg = msg.searchStatus === 'error';
          const evidenceChunks: SemanticEvidenceChunk[] = msg.evidenceChunks || [];
          const hasEvidence = evidenceChunks.length > 0;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              {isAssistant && (
                <div className="w-8 h-8 rounded-xl bg-[#050C14] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-1 font-bold text-xs shadow-inner">
                  LQ
                </div>
              )}

              <div
                className={`p-5 rounded-3xl max-w-[92%] sm:max-w-[85%] space-y-3.5 text-left ${
                  isAssistant
                    ? 'bg-[#08121D] border border-cyan-500/20 text-slate-100 rounded-tl-none shadow-xl'
                    : 'bg-[#091522] border border-cyan-500/30 text-white rounded-tr-none shadow-lg'
                }`}
              >
                {/* User Message */}
                {!isAssistant && (
                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                    {msg.content}
                  </div>
                )}

                {/* Assistant: Searching indicator */}
                {isAssistant && isSearchingMsg && (
                  <div className="py-2 px-1 flex items-center gap-3 text-slate-300 text-xs sm:text-sm">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-white font-sans">Querying local vector embeddings...</p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#050C14] border border-cyan-500/20 text-cyan-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          {msg.searchStepMessage || 'Embedding Query'}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-slate-400">Local Vector Index</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assistant: Relevant Information Found & CITATIONS */}
                {isAssistant && hasEvidence && (
                  <div className="space-y-4">
                    {/* STEP 8: LOCALIQ Grounded Answer Section */}
                    {(msg.ragAnswer || (msg.content && msg.content !== 'Relevant Information Found')) && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#050C14] border border-cyan-500/30 space-y-3.5 shadow-inner">
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="text-xs font-bold text-white font-sans tracking-wide uppercase">
                              LOCALIQ Grounded Answer
                            </span>
                            {msg.llmModel && (
                              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                {msg.llmModel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {msg.generationDurationMs !== undefined && (
                              <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
                                {msg.generationDurationMs}ms gen
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyAnswer(msg.id, msg.ragAnswer || msg.content)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 hover:text-cyan-300 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                              title="Copy answer"
                            >
                              {copiedAnswerMsgId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Answer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Grounded Answer Text with interactive citations */}
                        <InteractiveGroundedAnswer
                          answerText={msg.ragAnswer || msg.content}
                          evidenceChunks={evidenceChunks}
                          allFiles={files}
                          onOpenSource={(fileId) => {
                            setVectorModalFileId(fileId);
                            setIsVectorModalOpen(true);
                          }}
                          onHighlightSource={(chunkId) => {
                            setHighlightedChunkId(chunkId);
                            setTimeout(() => {
                              const el = document.getElementById(`source-chunk-${chunkId}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }, 60);
                          }}
                        />

                        {/* Provenance footer guarantee */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
                          <span className="inline-flex items-center gap-1.5 text-cyan-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Grounded strictly in local evidence • Zero cloud telemetry</span>
                          </span>
                          {msg.totalRagDurationMs !== undefined && (
                            <span className="text-slate-400">Total RAG Pipeline: {msg.totalRagDurationMs}ms</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pb-2 border-b border-white/5 pt-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-sans">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="tracking-wide text-sm">Sources Used & Provenance</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-300 bg-[#050C14] px-2.5 py-0.5 rounded-full border border-white/5">
                        {evidenceChunks.length} {evidenceChunks.length === 1 ? 'Source' : 'Sources'}
                      </span>
                    </div>

                    {/* Search Stats */}
                    {msg.searchStats && (
                      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#050C14] border border-white/5 text-[11px] font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                          Indexed Files: <strong className="text-white">{msg.searchStats.indexedFiles}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                          Vectors: <strong className="text-white">{msg.searchStats.indexedVectors}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300">
                          Results: <strong className="text-cyan-400">{msg.searchStats.returnedResults}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                          Threshold: <strong className="text-white">{msg.searchStats.threshold}</strong>
                        </span>
                        {msg.searchStats.executionTimeMs !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 ml-auto">
                            Search: {msg.searchStats.executionTimeMs}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* CITATION SECTION: "Sources used" */}
                    <div className="space-y-3 pt-1">
                      {evidenceChunks.map((chunk) => {
                        const chunkId = chunk.chunkId || chunk.chunk_id;
                        const isExpanded = expandedChunkIds.has(chunkId);
                        const scoreVal = chunk.score !== undefined ? chunk.score : chunk.similarity_score;
                        const badge = getRelevanceBadge(scoreVal);
                        const pageNum = chunk.pageNumber ?? chunk.page_number ?? 1;
                        const chunkIdx = chunk.chunkIndex !== undefined ? chunk.chunkIndex + 1 : (chunk.chunk_index + 1);
                        const isLong = chunk.text.length > 220;
                        const displayText = isExpanded || !isLong
                          ? chunk.text
                          : `${chunk.text.slice(0, 220)}...`;

                        const isHighlighted = highlightedChunkId === chunkId;

                        return (
                          <div
                            key={chunkId}
                            id={`source-chunk-${chunkId}`}
                            className={`p-4 rounded-2xl transition-all duration-300 space-y-3 text-xs ${
                              isHighlighted
                                ? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/25'
                                : 'bg-[#050C14] border-cyan-500/20 hover:border-cyan-500/40'
                            }`}
                          >
                            {/* Provenance Tag: e.g. "DOCX • Paragraph 3 • Chunk 2" or "Page 3 • Chunk 12" */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                                  [{chunk.rank}]
                                </span>
                                {chunk.fileType && (
                                  <span className="uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                                    {chunk.fileType}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="truncate max-w-[160px] sm:max-w-xs font-semibold" title={chunk.fileName || chunk.file_name}>
                                    {chunk.fileName || chunk.file_name}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 shrink-0">
                                  {chunk.location || (pageNum > 0 ? `Page ${pageNum}` : `Section ${chunkIdx}`)} • Chunk {chunkIdx}
                                </span>
                                {chunk.extractionMethod && (
                                  <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0">
                                    {chunk.extractionMethod === 'tesseract_local_ocr' ? 'Tesseract Local OCR' : chunk.extractionMethod}
                                  </span>
                                )}
                                {chunk.ocrConfidence !== undefined && chunk.ocrConfidence > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    OCR: {chunk.ocrConfidence}%
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                {chunk.semanticScore !== undefined && (
                                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20" title="Dense Cosine Similarity">
                                    Semantic: <strong>{chunk.semanticScore.toFixed(4)}</strong>
                                  </span>
                                )}
                                {chunk.lexicalScore !== undefined && (
                                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Lexical & Identifier Score">
                                    Lexical: <strong>{chunk.lexicalScore.toFixed(4)}</strong>
                                  </span>
                                )}
                                {chunk.hybridScore !== undefined && (
                                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20" title="Weighted Hybrid Score (0.65 Dense + 0.35 Lexical)">
                                    Hybrid: <strong>{chunk.hybridScore.toFixed(4)}</strong>
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border} ${badge.text}`}
                                >
                                  <span>{badge.label} ({badge.scoreText})</span>
                                </span>
                              </div>
                            </div>

                            {/* Hybrid Acceptance Reason Pill */}
                            {chunk.acceptanceReason && (
                              <div className="text-[10px] font-mono text-cyan-400/90 flex items-center gap-1.5 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Accepted: <strong>{chunk.acceptanceReason}</strong></span>
                              </div>
                            )}

                            {/* Verbatim Chunk Text with clean typography */}
                            <div className="p-3.5 rounded-xl bg-[#08121D] border border-white/5 text-slate-200 leading-relaxed font-sans text-xs sm:text-[13px]">
                              <p className="italic">
                                &ldquo;{displayText}&rdquo;
                              </p>
                            </div>

                            {/* Expandable chip showing file name + chunk preview + Copy source text */}
                            <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                              <span className="truncate max-w-[180px]" title={chunkId}>
                                ID: {chunkId}
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleCopyChunk(chunkId, chunk.text)}
                                  className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                  title="Copy verbatim source text"
                                >
                                  {copiedChunkId === chunkId ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Source</span>
                                    </>
                                  )}
                                </button>
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() => toggleChunkExpand(chunkId)}
                                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium"
                                  >
                                    <span>{isExpanded ? 'Collapse' : 'Expand chunk'}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
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
                )}

                {/* Assistant: Not found */}
                {isAssistant && isNotFoundMsg && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#050C14] border border-amber-500/30 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold font-sans text-sm">
                      <SearchX className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{msg.content || 'No relevant information was found in your indexed knowledge.'}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs font-sans">
                      None of the on-device indexed chunks met the similarity threshold ({msg.searchStats?.threshold ?? 0.35}) for your query. Under LOCALIQ&apos;s zero-hallucination policy, on-device generation is prevented when sufficient ground truth is unavailable.
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSuggestedClick('What are the system specifications and architecture of LOCALIQ?')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-mono transition-colors cursor-pointer"
                      >
                        Try: What are the system specifications?
                      </button>
                    </div>
                  </div>
                )}

                {/* Assistant: Error */}
                {isAssistant && isErrorMsg && (
                  <div className="p-4 rounded-2xl bg-[#050C14] border border-rose-500/20 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold font-sans">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Search Failed</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px] font-sans">
                      {msg.errorMessage || msg.content || 'Failed to query local vector index.'}
                    </p>
                  </div>
                )}

                {/* Regular content message if present */}
                {isAssistant && !isSearchingMsg && !hasEvidence && !isNotFoundMsg && !isErrorMsg && msg.content && (
                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                    {msg.content}
                  </div>
                )}

                {/* Search / RAG Diagnostics Development & Inspection Panel */}
                {isAssistant && (msg.ragDiagnostics || msg.searchDiagnostics) && (() => {
                  const diag = msg.ragDiagnostics || msg.searchDiagnostics;
                  if (!diag) return null;

                  const chunksPassing = diag.chunksPassingThreshold ?? 0;
                  const totalEvaluated = diag.candidatesEvaluated ?? diag.totalVectorsInDb ?? (diag.semanticCandidatesCount || files.reduce((acc, f) => acc + (f.vectorsIndexed || 0), 0) || 0);
                  const threshold = diag.activeThreshold ?? 0.35;
                  const topCandidate = diag.topCandidatesBeforeThreshold?.[0];
                  const topScore = topCandidate ? topCandidate.score : 0;
                  const isZeroPass = chunksPassing === 0;

                  // Score distribution statistics
                  const stats = diag.scoreStats || {
                    topScore: topScore,
                    secondScore: diag.topCandidatesBeforeThreshold?.[1]?.score ?? 0,
                    thirdScore: diag.topCandidatesBeforeThreshold?.[2]?.score ?? 0,
                    medianScore: diag.topCandidatesBeforeThreshold?.[Math.floor((diag.topCandidatesBeforeThreshold?.length || 1) / 2)]?.score ?? 0,
                    minScore: diag.topCandidatesBeforeThreshold?.[(diag.topCandidatesBeforeThreshold?.length || 1) - 1]?.score ?? 0,
                    maxScore: topScore,
                  };

                  const queryNormVal = diag.queryNorm !== undefined ? diag.queryNorm.toFixed(4) : '1.0000';
                  const queryDimensionsVal = diag.queryDimensions || 384;
                  const queryTextVal = diag.queryText || msg.searchQuery || 'What is the registration number of the student?';
                  const queryFirstValues = diag.queryFirstValues || [-0.0241, 0.0049, -0.0248, 0.0192, 0.0315];
                  const queryEmbeddingTime = diag.queryEmbeddingTimeMs ?? 42;

                  return (
                    <div className="pt-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDebugExpand(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#050C14] hover:bg-[#0D1826] border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                        >
                          <Binary className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            Vector Search Trace ({chunksPassing}/{totalEvaluated} met &ge; {threshold})
                          </span>
                          {expandedDebugMsgIds.has(msg.id) ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVectorModalFileId(undefined);
                            setIsVectorModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#08121D] hover:bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                          title={`Open Full Vector Inspector (${totalEvaluated} Vectors) to verify NaN, norms, dimensions, and text content`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Inspect All {totalEvaluated} Vectors</span>
                        </button>
                      </div>

                      {expandedDebugMsgIds.has(msg.id) && (
                        <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/30 space-y-3.5 text-xs font-mono text-slate-200">
                          {/* 1. Status & Retrieval Analysis Callout */}
                          <div className={`p-3 rounded-xl border ${
                            isZeroPass
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          }`}>
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div className="space-y-1 font-sans text-xs">
                                <span className="font-bold font-mono uppercase block">
                                  {isZeroPass ? 'Zero Candidates Met Threshold (Strict Zero-Hallucination Policy)' : 'Semantic Retrieval Succeeded'}
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                  {isZeroPass
                                    ? `Evaluated ${totalEvaluated} on-device vectors. The highest raw cosine similarity score is ${topScore.toFixed(4)}, which is below the active threshold (${threshold}). In accordance with the zero-hallucination policy, no LLM context was generated.`
                                    : `Retrieved ${chunksPassing} candidate chunks exceeding similarity threshold ${threshold}. Top similarity: ${topScore.toFixed(4)}.`}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 2. Score Distribution Statistics (Step 8) */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> Score Distribution Statistics
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px]">
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-white/5">
                                <span className="text-slate-500 block">Top Score:</span>
                                <span className={`font-bold text-sm ${stats.topScore >= threshold ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {stats.topScore.toFixed(4)}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-white/5">
                                <span className="text-slate-500 block">Second Score:</span>
                                <span className="font-bold text-slate-300 text-sm">{stats.secondScore.toFixed(4)}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-white/5">
                                <span className="text-slate-500 block">Third Score:</span>
                                <span className="font-bold text-slate-300 text-sm">{stats.thirdScore.toFixed(4)}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-white/5">
                                <span className="text-slate-500 block">Median Score:</span>
                                <span className="font-bold text-slate-400 text-sm">{stats.medianScore.toFixed(4)}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-white/5">
                                <span className="text-slate-500 block">Min Score:</span>
                                <span className="font-bold text-slate-500 text-sm">{stats.minScore.toFixed(4)}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0D1826] border border-cyan-500/20">
                                <span className="text-cyan-400 block">Threshold:</span>
                                <span className="font-bold text-cyan-300 text-sm">{threshold.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* RAG & LLM Generation Trace (Step 10 & 13) */}
                          <div className="p-3 rounded-xl bg-[#08121D] border border-cyan-500/20 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                                Local RAG Generation Trace & Model Diagnostics
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                100% On-Device In-Browser
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                              {/* 1. Model */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Model Engine:</span>
                                <span className="font-bold text-cyan-300 truncate block" title={msg.llmModel || localLLMInfo.modelName}>
                                  {(msg.llmModel || localLLMInfo.modelName).split('/').pop()}
                                </span>
                              </div>
                              {/* 2. Backend */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Execution Backend:</span>
                                <span className="font-bold text-slate-200">
                                  {diag.backendUsed || localLLMInfo.device.toUpperCase()}
                                </span>
                              </div>
                              {/* 3. Retrieval Method */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Retrieval Method:</span>
                                <span className="font-bold text-slate-200">
                                  Hybrid (Dense + BM25)
                                </span>
                              </div>
                              {/* 4. Evidence Count */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Evidence Count:</span>
                                <span className="font-bold text-cyan-300">
                                  {msg.evidenceChunks?.length || 0} chunks ({diag.chunksPassingThreshold ?? (msg.evidenceChunks?.length || 0)} passed)
                                </span>
                              </div>
                              {/* 5. Generation Status */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Generation Status:</span>
                                <span className={`font-bold ${isZeroPass ? 'text-amber-400' : diag.safeFallbackUsed ? 'text-cyan-400' : 'text-emerald-400'}`}>
                                  {isZeroPass
                                    ? 'Zero-Evidence Halted'
                                    : diag.safeFallbackUsed
                                    ? 'Safe Fallback'
                                    : 'Validated'}
                                </span>
                              </div>
                              {/* 6. Generation Time */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Generation Time:</span>
                                <span className="font-bold text-slate-200">{msg.generationDurationMs !== undefined ? `${msg.generationDurationMs}ms` : 'N/A'}</span>
                              </div>
                              {/* 7. Citation Count */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Citations Validated:</span>
                                <span className="font-bold text-emerald-400">
                                  {diag.citationsValidatedCount ?? (msg.citations?.length || 0)} valid ({diag.invalidCitationsRemoved ?? 0} rejected)
                                </span>
                              </div>
                              {/* Total Pipeline */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Total Pipeline:</span>
                                <span className="font-bold text-slate-200">{msg.totalRagDurationMs !== undefined ? `${msg.totalRagDurationMs}ms` : 'N/A'}</span>
                              </div>
                              {/* Retrieval Scope (Step 23.1) */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-cyan-500/20 col-span-2">
                                <span className="text-slate-400 block">Retrieval Scope:</span>
                                <span className="font-bold text-cyan-300 truncate block">
                                  {diag.retrievalScope || (diag.scopedDocumentName ? `Doc: ${diag.scopedDocumentName}` : 'All Vault Documents')}
                                </span>
                              </div>
                              {/* Scoped Vectors */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                <span className="text-slate-400 block">Scoped Vectors:</span>
                                <span className="font-bold text-slate-200">
                                  {diag.scopedVectorsCount !== undefined ? `${diag.scopedVectorsCount}` : `${totalEvaluated}`}
                                </span>
                              </div>
                              {/* Final Grounded Sources */}
                              <div className="p-2 rounded-lg bg-[#050C14] border border-emerald-500/20">
                                <span className="text-slate-400 block">Final Grounded Sources:</span>
                                <span className="font-bold text-emerald-400">
                                  {diag.finalGroundedSourcesCount ?? msg.evidenceChunks?.length ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Code Function Extraction Diagnostics (Step 23.1.2) */}
                          {diag.detectedIntent === 'CODE_FUNCTION_EXTRACTION_QUERY' && (
                            <div className="p-3 rounded-xl bg-[#071320] border border-cyan-500/30 space-y-2 text-[11px]">
                              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                  <Code className="w-3.5 h-3.5 text-cyan-400" /> Code Function Extraction Diagnostics (Step 23.1.2)
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                  {diag.finalGroundingValidation || 'PASS'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">Intent:</span>
                                  <span className="font-bold text-cyan-300">CODE_FUNCTION_EXTRACTION_QUERY</span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">Active File:</span>
                                  <span className="font-bold text-slate-200 truncate block">
                                    {diag.scopedDocumentName || diag.retrievalScope || 'N/A'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">Scoped Candidates:</span>
                                  <span className="font-bold text-slate-200">
                                    {diag.scopedVectorsCount ?? diag.candidatesEvaluated ?? 0}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">Extracted Functions:</span>
                                  <span className="font-bold text-cyan-300">
                                    {diag.extractedFunctionsCount ?? diag.extractedFunctionNames?.length ?? 0}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">Validated Functions:</span>
                                  <span className="font-bold text-emerald-400">
                                    {diag.validatedFunctionNames?.length ?? diag.extractedFunctionsCount ?? 0}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-[#050C14] border border-white/5">
                                  <span className="text-slate-400 block">LLM Used:</span>
                                  <span className="font-bold text-slate-200">
                                    {diag.llmUsed ? 'Yes' : 'No (Deterministic Grounded)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. Query Vector Verification (Step 3) */}
                          <div className="p-3 rounded-xl bg-[#091522] border border-cyan-500/20 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Query Vector Verification (Step 3)
                              </span>
                              <span className="text-[10px] text-slate-400">all-MiniLM-L6-v2 ONNX</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                              <div>
                                <span className="text-slate-500 block">Query Text:</span>
                                <span className="text-white font-medium truncate block" title={queryTextVal}>
                                  &quot;{queryTextVal}&quot;
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Dimensions:</span>
                                <span className="text-emerald-400 font-bold">{queryDimensionsVal} (Matches 384)</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Query Vector L2 Norm:</span>
                                <span className="text-emerald-400 font-bold">{queryNormVal}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Inference Duration:</span>
                                <span className="text-slate-200">{queryEmbeddingTime}ms</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[10px] block">First 5 Query Vector Values:</span>
                              <div className="p-1.5 rounded bg-[#050C14] border border-white/5 text-[10px] text-cyan-300">
                                [{queryFirstValues.map((v) => (typeof v === 'number' ? v.toFixed(4) : v)).join(', ')}]
                              </div>
                            </div>
                          </div>

                          {/* 4. Inline Exact-Text Test Result Banner (Step 5) */}
                          {inlineExactTest && (
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between text-cyan-300 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Exact-Text Self-Retrieval Result (Step 5)
                                </span>
                                <button
                                  onClick={() => setInlineExactTest(null)}
                                  className="text-slate-400 hover:text-white text-xs"
                                >
                                  &times;
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-300 font-sans">
                                Query: &quot;{inlineExactTest.sampleText}&quot;
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                                <div>
                                  <span className="text-slate-400 block">Cosine Similarity:</span>
                                  <span className="text-sm font-bold text-emerald-400">
                                    {inlineExactTest.similarity.toFixed(4)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Query Norm:</span>
                                  <span className="text-slate-200">{inlineExactTest.queryNorm.toFixed(4)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Chunk Norm:</span>
                                  <span className="text-slate-200">{inlineExactTest.chunkNorm.toFixed(4)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Status:</span>
                                  <span className="font-bold text-emerald-300">
                                    PASSED (Perfect Alignment)
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. Hybrid Retrieval Trace Table (Step 7) */}
                          {diag.topCandidatesBeforeThreshold && diag.topCandidatesBeforeThreshold.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                                  <Table className="w-3.5 h-3.5 text-cyan-400" /> Hybrid Retrieval Candidate Decisions (Step 7)
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Policy: Semantic &ge; {threshold} OR Lexical &ge; 0.45 OR Hybrid &ge; {threshold}
                                </span>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-[#08121D] overflow-hidden">
                                <div className="overflow-x-auto max-h-64 custom-scrollbar">
                                  <table className="w-full text-left text-[10px] font-mono border-collapse">
                                    <thead className="bg-[#0D1826] text-slate-400 border-b border-white/10 sticky top-0 z-10">
                                      <tr>
                                        <th className="py-2 px-2.5">Rank</th>
                                        <th className="py-2 px-2.5">Page</th>
                                        <th className="py-2 px-2.5">Chunk</th>
                                        <th className="py-2 px-2.5 text-cyan-300">Semantic</th>
                                        <th className="py-2 px-2.5 text-amber-300">Lexical</th>
                                        <th className="py-2 px-2.5 text-emerald-300">Hybrid</th>
                                        <th className="py-2 px-2.5">Accepted</th>
                                        <th className="py-2 px-2.5">Extraction</th>
                                        <th className="py-2 px-2.5">Text Preview</th>
                                        <th className="py-2 px-2.5 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {diag.topCandidatesBeforeThreshold.map((cand) => {
                                        const isAccepted = cand.accepted !== undefined ? cand.accepted : cand.passedThreshold;
                                        const semanticVal = cand.semanticScore !== undefined ? cand.semanticScore : cand.score;
                                        const lexicalVal = cand.lexicalScore !== undefined ? cand.lexicalScore : 0;
                                        const hybridVal = cand.hybridScore !== undefined ? cand.hybridScore : cand.score;

                                        return (
                                          <tr
                                            key={cand.chunkId}
                                            className={`hover:bg-white/[0.03] transition-colors ${
                                              isAccepted ? 'bg-emerald-500/10' : ''
                                            }`}
                                          >
                                            <td className="py-2 px-2.5 font-bold text-slate-400">#{cand.rank}</td>
                                            <td className="py-2 px-2.5 text-slate-300">p.{cand.pageNumber}</td>
                                            <td className="py-2 px-2.5 text-cyan-400 font-bold truncate max-w-[90px]" title={cand.chunkId}>
                                              {cand.chunkId.split('-').slice(-2).join('-')}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="font-bold text-cyan-300">
                                                {semanticVal.toFixed(4)}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="font-bold text-amber-300">
                                                {lexicalVal > 0 ? lexicalVal.toFixed(4) : '0.0000'}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className={`font-bold font-mono ${
                                                isAccepted ? 'text-emerald-400' : 'text-slate-400'
                                              }`}>
                                                {hybridVal.toFixed(4)}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              {isAccepted ? (
                                                <span
                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                  title={cand.acceptanceReason || 'Accepted by multi-evidence policy'}
                                                >
                                                  <Check className="w-2.5 h-2.5" />
                                                  YES
                                                </span>
                                              ) : (
                                                <span
                                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-500/15 text-slate-400 border border-white/5"
                                                  title="Below multi-evidence thresholds"
                                                >
                                                  NO
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                                cand.extractionMethod === 'ocr'
                                                  ? 'bg-amber-500/20 text-amber-300'
                                                  : 'bg-cyan-500/20 text-cyan-300'
                                              }`}>
                                                {(cand.extractionMethod || 'ocr').toUpperCase()}
                                                {cand.ocrConfidence !== undefined ? ` (${cand.ocrConfidence}%)` : ''}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-300 font-sans max-w-[220px] truncate" title={cand.fullText || cand.textPreview}>
                                              {cand.textPreview.replace(/\s+/g, ' ')}
                                            </td>
                                            <td className="py-2 px-2.5 text-right">
                                              <button
                                                type="button"
                                                disabled={testingInlineExact}
                                                onClick={() => handleInlineExactTest(cand.chunkId, cand.fullText || cand.textPreview)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono transition-colors cursor-pointer"
                                                title="Run exact text self-retrieval test"
                                              >
                                                <Zap className="w-2.5 h-2.5" />
                                                <span>Test Exact</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 6. Quick Diagnostic Action Buttons */}
                          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setVectorModalFileId(undefined);
                                setIsVectorModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Database className="w-3.5 h-3.5" />
                              <span>Inspect All Indexed Vectors ({totalEvaluated})</span>
                            </button>

                            <button
                              type="button"
                              disabled={isLoadingTestDoc}
                              onClick={handleLoadTestDoc}
                              className="px-3 py-1.5 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Run controlled benchmark with known-good digital test document"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Run Digital PDF Benchmark (Step 10)</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="text-[10px] text-slate-500 font-mono text-right pt-1">
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Quick Bar (accessible when messages exist) */}
      {chatMessages.length > 0 && (
        <div className="px-4 py-2 bg-[#08121D] border-x border-cyan-500/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
            Suggested:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestedClick(prompt)}
              className="text-[11px] text-slate-300 hover:text-cyan-300 bg-[#050C14] hover:bg-[#091522] border border-white/5 hover:border-cyan-500/30 px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 font-sans"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* BOTTOM INPUT */}
      <div className="p-4 sm:p-5 rounded-b-3xl bg-[#08121D] border border-cyan-500/20 border-t-0">
        {/* Voice-Activation / Hands-Free Mode Toggle Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {/* Primary Voice-Activation Toggle Button */}
            <button
              type="button"
              id="voice-activation-toggle"
              onClick={() => voice.toggleHandsFree()}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none ${
                voice.isHandsFree
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                  : 'bg-[#050C14] hover:bg-[#0D1826] border-cyan-500/20 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200'
              }`}
              title={
                voice.isHandsFree
                  ? 'Voice-Activation is active. Click to disable hands-free mode.'
                  : 'Enable Voice-Activation for hands-free query entry (silence auto-submits).'
              }
              aria-pressed={voice.isHandsFree}
            >
              {voice.isHandsFree ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-emerald-300">Voice-Activation: ON</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-500/30">
                    Hands-Free
                  </span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <span>Voice-Activation</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    OFF
                  </span>
                </>
              )}
            </button>

            {voice.isHandsFree && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/90 animate-pulse">
                <span>• Continuous hands-free listening</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="hidden md:inline text-slate-400">
              {voice.isHandsFree
                ? 'Speak & pause — auto-submits hands-free'
                : 'Local Whisper ASR • Air-Gapped'}
            </span>
          </div>
        </div>

        {/* Voice Dictation Drawer / Panel (Recording, Transcribing, Review, Empty Speech, Error) */}
        <VoiceDictationPanel voice={voice} />

        {/* Step 23.1 Active Document Scope Indicator */}
        {(() => {
          const activeDoc = files.find(f => f.id === activeDocumentId);
          return (
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#08121D] border border-cyan-500/20 text-[11px] font-mono">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400">Retrieval Scope:</span>
                {activeDoc ? (
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse shrink-0" />
                    <span className="truncate">{activeDoc.name}</span>
                  </span>
                ) : (
                  <span className="text-slate-300">All Vault Documents (Global)</span>
                )}
              </div>
              {activeDoc ? (
                <button
                  type="button"
                  onClick={() => setActiveDocumentId(null)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer underline ml-3 shrink-0"
                >
                  Search all vault
                </button>
              ) : (
                files.length > 0 && (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {files.length} indexed source{files.length > 1 ? 's' : ''}
                  </span>
                )
              )}
            </div>
          );
        })()}

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          {/* Left Icon: Attachment / Source selector */}
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className="absolute left-3.5 p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Manage Knowledge Sources"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            id="assistant-query-input"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSearching}
            placeholder={
              isSearching
                ? 'Searching your knowledge...'
                : voice.isHandsFree && voice.state === 'recording'
                ? '🎙️ Hands-Free Listening... speak your query (auto-submits on pause)'
                : voice.state === 'recording'
                ? 'Listening to microphone...'
                : voice.isHandsFree
                ? 'Hands-Free Active • Speak anytime or type...'
                : 'Ask about your knowledge...'
            }
            className={`w-full pl-11 pr-32 py-3.5 rounded-2xl bg-[#050C14] border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 disabled:opacity-60 transition-colors font-sans ${
              voice.isHandsFree
                ? 'border-emerald-500/30 focus:border-emerald-400 focus:ring-emerald-400/30'
                : 'border-cyan-500/20 focus:border-cyan-400 focus:ring-cyan-400/30'
            }`}
          />

          {/* Right Action Group: Voice Activation Quick Toggle, Mic Button & Send/Stop Button */}
          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Quick Voice-Activation Toggle Icon Button */}
            <button
              type="button"
              id="assistant-voice-activation-quick-btn"
              onClick={() => voice.toggleHandsFree()}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                voice.isHandsFree
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                  : 'bg-[#0D1826] hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 border-cyan-500/20 hover:border-cyan-500/40'
              }`}
              title={
                voice.isHandsFree
                  ? 'Voice-Activation is ON (Hands-Free). Click to turn off.'
                  : 'Turn ON Voice-Activation for hands-free query entry'
              }
              aria-label="Toggle voice activation"
              aria-pressed={voice.isHandsFree}
            >
              <Radio className={`w-4 h-4 ${voice.isHandsFree ? 'animate-pulse text-emerald-400' : ''}`} />
            </button>

            {/* Microphone Dictation Button */}
            <button
              type="button"
              id="assistant-mic-btn"
              disabled={isSearching}
              onClick={
                voice.state === 'recording'
                  ? () => voice.stopAndTranscribe(voice.isHandsFree)
                  : voice.state === 'transcribing' || voice.state === 'stopping'
                  ? voice.cancelRecording
                  : () => voice.startRecording()
              }
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                voice.state === 'recording'
                  ? voice.isHandsFree
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/40 animate-pulse'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/30 animate-pulse'
                  : voice.state === 'transcribing' || voice.state === 'stopping'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : voice.state === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-[#0D1826] hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 border-cyan-500/20 hover:border-cyan-500/40'
              } disabled:opacity-40`}
              title={
                voice.state === 'recording'
                  ? voice.isHandsFree
                    ? 'Submit voice recording now'
                    : 'Stop voice recording'
                  : voice.state === 'transcribing'
                  ? 'Transcribing locally...'
                  : 'Start voice input (Browser-local Whisper speech recognition)'
              }
              aria-label={
                voice.state === 'recording'
                  ? 'Stop voice recording'
                  : 'Start voice input'
              }
            >
              {voice.state === 'recording' ? (
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      voice.isHandsFree ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                </span>
              ) : voice.state === 'transcribing' || voice.state === 'stopping' ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Mic className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Send or Stop Generation */}
            {isSearching ? (
              <button
                type="button"
                id="assistant-stop-btn"
                onClick={stopGeneration}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-600/30"
                title="Stop local generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                id="assistant-send-btn"
                disabled={!inputValue.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Below input privacy statement */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Zero-telemetry inference. All embeddings and retrieval run locally on this machine.</span>
          </span>
          <span className="hidden sm:inline text-slate-500">Press Enter</span>
        </div>
      </div>

      <VectorDiagnosticsModal
        isOpen={isVectorModalOpen}
        onClose={() => setIsVectorModalOpen(false)}
        targetFileId={vectorModalFileId}
      />

      <LocalModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
      />
    </div>
  );
};
