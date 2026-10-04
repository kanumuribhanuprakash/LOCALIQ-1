import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Headphones,
  FileCode,
  Calendar,
  HardDrive,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  AlertCircle,
  FileCheck,
  Layers,
  FileStack,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Binary,
  Database,
  Terminal,
  Activity,
  Info,
  ShieldAlert,
  FileWarning,
} from 'lucide-react';
import { KnowledgeFile, DocumentChunk } from '../../../types';
import { getFileTypeBadgeColor } from '../../../utils/fileHelpers';
import { localEmbeddingStore, StoredEmbedding } from '../../../services/localEmbeddingStore';
import { useApp } from '../../../context/AppContext';

interface FileDetailsModalProps {
  file: KnowledgeFile | null;
  onClose: () => void;
  onRename: (file: KnowledgeFile) => void;
  onDelete: (file: KnowledgeFile) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  file,
  onClose,
  onRename,
  onDelete,
}) => {
  if (!file) return null;

  const { user, processFileEmbedding } = useApp();
  const [showExtractedText, setShowExtractedText] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [showChunks, setShowChunks] = useState<boolean>(false);
  const [loadedChunks, setLoadedChunks] = useState<DocumentChunk[]>(file.chunks || []);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [copiedPageNum, setCopiedPageNum] = useState<number | null>(null);
  const [storedEmbeddings, setStoredEmbeddings] = useState<StoredEmbedding[]>([]);
  const [showPdfDiagnostics, setShowPdfDiagnostics] = useState<boolean>(false);
  const [embeddingInfo, setEmbeddingInfo] = useState<{
    embeddingsCount: number;
    dimension: number;
    modelName: string;
    sampleVector?: number[];
    norm?: number;
    source?: string;
  } | null>(null);

  useEffect(() => {
    if (file.chunks && file.chunks.length > 0) {
      setLoadedChunks(file.chunks);
    }

    const currentUserId = user?.id || 'demo-analyst-default';

    // 1. Fetch real client-side local embeddings from IndexedDB
    localEmbeddingStore
      .getEmbeddingsForFile(currentUserId, file.id)
      .then((stored) => {
        if (stored && stored.length > 0) {
          setStoredEmbeddings(stored);
          setEmbeddingInfo({
            embeddingsCount: stored.length,
            dimension: stored[0].dimensions || 384,
            modelName: stored[0].model || 'sentence-transformers/all-MiniLM-L6-v2',
            sampleVector: stored[0].vector.slice(0, 8),
            norm: stored[0].norm,
            source: 'Local Browser ONNX Runtime (IndexedDB)',
          });
        }
      })
      .catch(console.error);
  }, [file.id, file.chunks, file.processingStatus, user?.id]);

  const handleCopyChunk = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(id);
    setTimeout(() => setCopiedChunkId(null), 1500);
  };

  const getFileIcon = (category: string, ext: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-6 h-6 text-emerald-400" />;
      case 'audio':
        return <Headphones className="w-6 h-6 text-amber-400" />;
      case 'document':
      default:
        if (ext === 'pdf') return <FileText className="w-6 h-6 text-rose-400" />;
        if (ext === 'txt') return <FileCode className="w-6 h-6 text-slate-300" />;
        return <FileSpreadsheet className="w-6 h-6 text-blue-400" />;
    }
  };

  const badgeClass = getFileTypeBadgeColor(file.extension);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg p-7 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/25 shadow-2xl shadow-black/80 space-y-6 relative my-auto max-h-[90vh] max-h-[90dvh] overflow-y-auto"
        >
          {/* Subtle Ambient Accent */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3.5 overflow-hidden">
              <div className="p-3 rounded-2xl bg-[#050C14] border border-cyan-500/20 shrink-0 shadow-inner">
                {getFileIcon(file.category, file.extension)}
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold block">
                  Knowledge Source Details
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-sm font-sans" title={file.name}>
                  {file.name}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Structured Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* File Name */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1 sm:col-span-2">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Displayed File Name
              </span>
              <div className="font-semibold text-slate-100 break-all select-all font-sans">
                {file.name}
              </div>
              {file.originalName && file.originalName !== file.name && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Original: {file.originalName}
                </div>
              )}
            </div>

            {/* Original File Type & Category */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Original File Type
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[11px] uppercase font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                  .{file.extension}
                </span>
                <span className="text-slate-300 capitalize font-medium">({file.category})</span>
              </div>
            </div>

            {/* File Size */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                File Size
              </span>
              <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>{file.formattedSize}</span>
                <span className="text-[10px] text-slate-500">({file.sizeBytes.toLocaleString()} B)</span>
              </div>
            </div>

            {/* Upload Date */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Upload Date
              </span>
              <div className="flex items-center gap-2 text-slate-200 font-mono font-medium">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{file.uploadDate}</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Processing Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    file.processingStatus === 'Uploading'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : file.processingStatus === 'Processing'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : file.processingStatus === 'OCR Processing'
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/25'
                      : file.processingStatus === 'Transcribing'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                      : file.processingStatus === 'Text Extracted'
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : file.processingStatus === 'Partially Extracted'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                      : file.processingStatus === 'Partially Indexed'
                      ? 'bg-amber-500/10 text-emerald-300 border border-emerald-500/25'
                      : file.processingStatus === 'Chunking'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : file.processingStatus === 'Ready for Embedding'
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25'
                      : file.processingStatus === 'Embedding'
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : file.processingStatus === 'Ready for Indexing'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                      : file.processingStatus === 'Embedding Failed'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                      : file.processingStatus === 'Indexing'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : file.processingStatus === 'Indexed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : file.processingStatus === 'Processed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : file.processingStatus === 'OCR Required'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      : file.processingStatus === 'OCR Processing'
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/25'
                      : file.processingStatus === 'OCR Failed'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                      : file.processingStatus === 'No Text Detected'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                      : file.processingStatus === 'Unsupported Image Format'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                      : file.processingStatus === 'Unsupported Format'
                      ? 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/30'
                      : file.processingStatus === 'Failed'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {file.processingStatus === 'Indexed' ? (
                    <span className="font-bold text-emerald-400">✓</span>
                  ) : file.processingStatus === 'Ready for Indexing' ? (
                    <Binary className="w-3 h-3 text-emerald-400" />
                  ) : file.processingStatus === 'Processed' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : file.processingStatus === 'Ready for Embedding' ? (
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  ) : file.processingStatus === 'Text Extracted' ? (
                    <FileCheck className="w-3 h-3 text-teal-400" />
                  ) : file.processingStatus === 'Partially Extracted' ? (
                    <FileCheck className="w-3 h-3 text-amber-400" />
                  ) : file.processingStatus === 'Partially Indexed' ? (
                    <span className="font-bold text-amber-400">⚡</span>
                  ) : file.processingStatus === 'Embedding Failed' || file.processingStatus === 'OCR Failed' ? (
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                  ) : file.processingStatus === 'OCR Required' || file.processingStatus === 'No Text Detected' || file.processingStatus === 'Unsupported Image Format' ? (
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                  ) : file.processingStatus === 'Unsupported Format' ? (
                    <AlertCircle className="w-3 h-3 text-zinc-400" />
                  ) : file.processingStatus === 'Failed' ? (
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-indigo-400" />
                  )}
                  <span>{file.processingStatus === 'Indexed' ? 'Indexed' : file.processingStatus}</span>
                </span>
              </div>
            </div>

            {/* Image Preview & Visual Details (Section 14) */}
            {file.category === 'image' && (
              <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/20 sm:col-span-2 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">Local Image Preview</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    100% In-Browser · Air-Gapped
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                  {file.imagePreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/10 max-h-56 shrink-0 flex items-center justify-center p-1">
                      <img
                        src={file.imagePreviewUrl}
                        alt={file.name}
                        className="max-h-52 max-w-full rounded-lg object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-black/30 border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 gap-1 shrink-0">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-[10px] font-mono">No Preview</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 flex-1 w-full text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Filename</div>
                      <div className="text-slate-200 font-semibold truncate" title={file.name}>
                        {file.name}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Dimensions</div>
                      <div className="text-cyan-300 font-semibold">
                        {file.imageDimensions
                          ? `${file.imageDimensions.width} × ${file.imageDimensions.height} px`
                          : '—'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Extraction Method</div>
                      <div className="text-slate-200 font-semibold truncate">
                        Tesseract Local OCR
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">OCR Confidence</div>
                      <div className="text-emerald-400 font-semibold">
                        {file.ocrConfidence !== undefined ? `${file.ocrConfidence}%` : '—'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Extracted Characters</div>
                      <div className="text-slate-200 font-semibold">
                        {(file.charactersExtracted ?? 0).toLocaleString()} chars
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Chunks & Vectors</div>
                      <div className="text-slate-200 font-semibold">
                        {file.chunksCreated ?? file.chunks?.length ?? 0} chunks · {file.vectorsIndexed ?? 0} vectors
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Player & Transcription Details */}
            {file.category === 'audio' && (
              <div className="p-4 rounded-2xl bg-[#050C14] border border-amber-500/20 sm:col-span-2 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Local Audio Playback</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    100% On-Device · Whisper Speech-to-Text
                  </span>
                </div>

                {file.audioUrl && (
                  <div className="p-2.5 rounded-xl bg-[#08121D] border border-white/5">
                    <audio controls className="w-full h-8" src={file.audioUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            )}

            {/* Extraction Engine & Truthful Provenance */}
            <div className="p-3.5 rounded-2xl bg-[#050C14] border border-white/5 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                  Extraction Engine & Provenance Model
                </span>
                {file.ocrConfidence !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    OCR Confidence: {file.ocrConfidence}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-[#0D0F14] border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase">Extraction Method</div>
                  <div className="text-slate-200 font-medium">
                    {file.extension === 'pdf'
                      ? 'PDF.js In-Memory Stream Parser'
                      : file.extension === 'docx'
                      ? 'DOCX Local Parser (Mammoth.js)'
                      : file.extension === 'txt' || file.extension === 'md'
                      ? 'Native Text Decoder'
                      : ['png', 'jpg', 'jpeg', 'webp'].includes((file.extension || '').toLowerCase())
                      ? 'Tesseract.js WASM On-Device OCR'
                      : file.extension === 'doc'
                      ? 'Legacy Binary Word (DOC) — Unsupported'
                      : ['mp3', 'wav', 'm4a'].includes((file.extension || '').toLowerCase())
                      ? 'Local Whisper Speech-to-Text (ONNX)'
                      : 'Local Air-Gapped Processor'}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0D0F14] border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase">Provenance Labeling</div>
                  <div className="text-cyan-300 font-medium">
                    {file.provenanceLabel ||
                      (file.extension === 'pdf'
                        ? 'Page-Accurate Citations'
                        : file.extension === 'docx'
                        ? 'Document Section / Paragraph'
                        : file.category === 'image'
                        ? 'Image OCR Content Provenance'
                        : file.category === 'audio'
                        ? 'Audio Transcript (Timestamps Preserved)'
                        : 'Section Provenance')}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion, Chunking & Embedding Pipeline Metrics (Step 4, 5 & 6) */}
            <div className="p-3.5 rounded-2xl bg-[#0D0F14] border border-white/5 space-y-2.5 sm:col-span-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider block">
                  Extraction, Chunking & Local Embeddings Pipeline
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Binary className="w-3 h-3 text-emerald-400" /> Vector Index Active (384-dim)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* Metric 1: Pages Count */}
                <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5 flex items-center gap-2.5">
                  <FileStack className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {file.extension === 'docx' ? 'Sections' : 'Pages Count'}
                    </div>
                    <div className="font-bold text-slate-200 truncate">
                      {file.extension === 'docx'
                        ? `${file.sectionsCount || file.pagesCount || 1} Sections`
                        : file.pagesCount
                        ? `${file.pagesCount} Pages`
                        : file.pagesOrDuration || '1 Page'}
                    </div>
                    {file.isPartiallyExtracted && file.extractablePagesCount !== undefined && (
                      <div className="text-[9px] text-amber-300 font-mono">
                        {file.extractablePagesCount} extractable · {file.ocrRequiredPagesCount || 0} OCR
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric 2: Characters Extracted */}
                <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5 flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-mono">Characters</div>
                    <div className="font-bold text-slate-200 truncate">
                      {file.charactersExtracted ? `${file.charactersExtracted.toLocaleString()}` : file.textAvailable ? 'Extracted' : 'Pending'}
                    </div>
                    {file.totalTextItems !== undefined && (
                      <div className="text-[9px] text-slate-400 font-mono">
                        {file.totalTextItems.toLocaleString()} text items
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric 3: Chunks Created */}
                <div className="p-2.5 rounded-xl bg-[#16191F] border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-cyan-300 font-mono font-semibold">Chunks</div>
                    <div className="font-bold text-cyan-300 truncate">
                      {file.chunksCreated ? `${file.chunksCreated} Chunks` : (loadedChunks.length > 0 ? `${loadedChunks.length} Chunks` : (file.charactersExtracted ? `${Math.max(1, Math.ceil(file.charactersExtracted / 580))} Chunks` : 'Pending'))}
                    </div>
                    {file.chunksCreated ? (
                      <div className="text-[9px] text-cyan-400 font-mono">
                        ~500-800 chars/chunk
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Metric 4: Embeddings Created */}
                <div className="p-2.5 rounded-xl bg-[#16191F] border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2.5">
                  <Binary className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-emerald-300 font-mono font-semibold">Embeddings</div>
                    <div className="font-bold text-emerald-300 truncate">
                      {file.embeddingsCreated ? `${file.embeddingsCreated} Vectors` : (file.chunksCreated ? `${file.chunksCreated} Vectors` : 'Indexed')}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono">
                      All-MiniLM-L6-v2
                    </div>
                  </div>
                </div>
              </div>

              {/* Extraction Breakdown Summary Pills (Section 8) */}
              {(file.extractablePagesCount !== undefined || file.ocrRequiredPagesCount !== undefined || file.failedPagesCount !== undefined || file.ocrPagesCount !== undefined) && (
                <div className="p-2.5 rounded-xl bg-[#16191F]/60 border border-white/5 flex items-center gap-2 flex-wrap text-[11px] font-mono">
                  <span className="text-slate-400 font-semibold text-[10px] uppercase">Extraction Breakdown:</span>
                  {file.textPagesCount !== undefined && file.textPagesCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Digital Text: {file.textPagesCount} {file.textPagesCount === 1 ? 'page' : 'pages'} ({file.textCharacters?.toLocaleString() || 0} chars)
                    </span>
                  )}
                  {file.ocrPagesCount !== undefined && file.ocrPagesCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Local OCR: {file.ocrPagesCount} {file.ocrPagesCount === 1 ? 'page' : 'pages'} ({file.ocrCharacters?.toLocaleString() || 0} chars)
                    </span>
                  )}
                  {file.textPagesCount === undefined && file.ocrPagesCount === undefined && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Extractable: {file.extractablePagesCount ?? (file.extractedPages?.length || 0)}
                    </span>
                  )}
                  {(file.ocrRequiredPagesCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      OCR Required: {file.ocrRequiredPagesCount}
                    </span>
                  )}
                  {(file.failedPagesCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      Failed: {file.failedPagesCount}
                    </span>
                  )}
                  {file.totalTextItems !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Items: {file.totalTextItems.toLocaleString()}
                    </span>
                  )}
                  {file.processingDurationMs !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">
                      Duration: {file.processingDurationMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Embedding Model Metadata Bar */}
              <div className="p-2.5 rounded-xl bg-[#16191F]/80 border border-white/5 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Embedding Model:</span>
                  <span className="text-indigo-300 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    {file.embeddingModel || 'all-MiniLM-L6-v2'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                  <span>Dimension: <strong className="text-slate-200">384</strong></span>
                  <span>•</span>
                  <span>Type: <strong className="text-slate-200">Dense Float32</strong></span>
                  <span>•</span>
                  <span>Engine: <strong className="text-emerald-400">Sentence Transformers (Local)</strong></span>
                </div>
              </div>

              {/* Browser Vector Store Card */}
              <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      Local Vector Index (Air-Gapped)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                    {file.indexType || 'BrowserVectorIndex (InnerProduct)'} · Cosine Similarity
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-[#0D0F14]/70 border border-white/5">
                    <div className="text-[10px] text-slate-400">Vectors Indexed</div>
                    <div className="text-indigo-300 font-bold">
                      {file.vectorsIndexed || file.embeddingsCreated || file.chunksCreated || 0} Vectors
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0D0F14]/70 border border-white/5">
                    <div className="text-[10px] text-slate-400">Normalization</div>
                    <div className="text-emerald-400 font-bold">L2 Normalized (Unit Norm)</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0D0F14]/70 border border-white/5 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400">Duplicate Guard</div>
                    <div className="text-cyan-400 font-bold">Unique File ID Ingestion</div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 pt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500">Extraction Vault:</span>
                  <span className="text-slate-400 select-all truncate">Browser Memory & IndexedDB (Air-Gapped)</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-cyan-500/80">Chunks Vault:</span>
                  <span className="text-cyan-400/90 select-all truncate">IndexedDB: localiq_embeddings_db (Local Chunks)</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-emerald-500/80">Embeddings Vault:</span>
                  <span className="text-emerald-400/90 select-all truncate">IndexedDB: localiq_embeddings_db (384D all-MiniLM-L6-v2)</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-indigo-400/90">Vector Index:</span>
                  <span className="text-indigo-300/90 select-all truncate">IndexedDB: localiq_vector_index_db (Cosine Inner Product)</span>
                </div>
              </div>
            </div>

            {file.isPartiallyExtracted && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 sm:col-span-2">
                <span className="text-amber-400 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <FileWarning className="w-3.5 h-3.5 text-amber-400" /> Partial Extraction Notice
                </span>
                <p className="text-xs text-amber-200/90 font-sans leading-relaxed">
                  {file.extractablePagesCount ?? (file.extractedPages?.length || 0)} of {file.pagesCount || 1} pages contained readable digital text streams and were successfully parsed and indexed into the vector store.
                  {(file.ocrRequiredPagesCount || 0) > 0 && ` ${file.ocrRequiredPagesCount} page(s) consist of scanned or rasterized imagery requiring OCR.`}
                  {(file.failedPagesCount || 0) > 0 && ` ${file.failedPagesCount} page(s) encountered formatting anomalies.`}
                  {' '}The extracted portion is fully available for semantic search and page-accurate citations.
                </p>
              </div>
            )}

            {file.errorStage && file.errorMessage && !file.requiresOcr && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> Pipeline Error Stage: {file.errorStage}
                  </span>
                  {file.errorType && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      {file.errorType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-200 font-mono">{file.errorMessage}</p>
              </div>
            )}

            {file.requiresOcr && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 sm:col-span-2">
                <span className="text-amber-400 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Optical Character Recognition (OCR) Required
                </span>
                <p className="text-xs text-amber-200/90 font-sans leading-relaxed">
                  This document contains scanned images or non-selectable rasterized pages with no native digital text stream. To query its contents, Optical Character Recognition (OCR) is required. The pipeline stopped cleanly at the text extraction stage.
                </p>
              </div>
            )}

            {file.category === 'image' && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 space-y-1.5 sm:col-span-2">
                <span className="text-indigo-300 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-400" /> Visual Limitation Notice (Image OCR)
                </span>
                <p className="text-xs text-indigo-200/80 font-sans leading-relaxed">
                  Local on-device OCR extracts recognized text characters and spatial headings from images. Diagrams, geometric charts, visual layouts, and handwriting cannot be semantically interpreted without multimodal vision models.
                </p>
              </div>
            )}

            {file.category === 'audio' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 sm:col-span-2">
                <span className="text-amber-400 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <Headphones className="w-3.5 h-3.5 text-amber-400" /> Speech-to-Text Runtime Notice
                </span>
                <p className="text-xs text-amber-200/90 font-sans leading-relaxed">
                  {file.errorMessage || 'Local on-device transcription requires WebAssembly Whisper or native browser speech recognition. Cloud speech APIs are strictly disabled.'}
                </p>
              </div>
            )}

            {file.errorMessage && !file.requiresOcr && file.category !== 'audio' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1 sm:col-span-2">
                <span className="text-rose-400 font-mono text-[10px] uppercase tracking-wider block flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Extraction Error Log
                </span>
                <p className="text-xs text-rose-300 font-mono">{file.errorMessage}</p>
              </div>
            )}

          </div>

          {/* PDF Pipeline Diagnostics Panel (Section 15) */}
          {(file.extension === 'pdf' || file.pdfDiagnostics) && (
            <div className="rounded-2xl bg-[#0D0F14] border border-cyan-500/20 overflow-hidden shrink-0">
              <button
                onClick={() => setShowPdfDiagnostics(!showPdfDiagnostics)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>PDF Diagnostics & Extraction Telemetry</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    PDF.js {file.pdfDiagnostics?.pdfJsVersion || 'v4.10.38'}
                  </span>
                </div>
                {showPdfDiagnostics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showPdfDiagnostics && (
                <div className="p-4 border-t border-white/5 space-y-3.5 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[11px]">
                  {/* Telemetry Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Engine & Version</div>
                      <div className="text-cyan-300 font-bold truncate">PDF.js {file.pdfDiagnostics?.pdfJsVersion || '4.10.38'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Extraction Duration</div>
                      <div className="text-slate-200 font-bold">{file.pdfDiagnostics?.durationMs || file.processingDurationMs || '—'} ms</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Extraction Health</div>
                      <div className={`font-bold ${file.requiresOcr ? 'text-amber-400' : file.isPartiallyExtracted ? 'text-amber-300' : 'text-emerald-400'}`}>
                        {file.requiresOcr ? 'OCR Required' : file.isPartiallyExtracted ? 'Partial' : 'Full Digital Stream'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Page Breakdown</div>
                      <div className="text-slate-200 font-bold">
                        {file.extractablePagesCount ?? (file.extractedPages?.length || 0)} ok · {file.ocrRequiredPagesCount || 0} ocr · {file.failedPagesCount || 0} err
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Text Items / Chars</div>
                      <div className="text-indigo-300 font-bold">
                        {(file.totalTextItems ?? file.pdfDiagnostics?.totalTextItems ?? 0).toLocaleString()} items · {(file.charactersExtracted || 0).toLocaleString()} chars
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#16191F] border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Vectors In Vector Store</div>
                      <div className="text-emerald-400 font-bold">
                        {file.vectorsIndexed || file.embeddingsCreated || file.chunksCreated || 0} Vectors
                      </div>
                    </div>
                  </div>

                  {/* Encryption / Password Status */}
                  {file.pdfDiagnostics?.isEncrypted && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                      Notice: PDF contains encrypted dictionary or digital protection.
                    </div>
                  )}

                  {/* Pipeline Error Trace (if any) */}
                  {(file.errorStage || file.pdfDiagnostics?.errorStage || file.errorMessage) && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
                      <div className="flex items-center justify-between text-rose-400 font-bold text-[10px]">
                        <span>Pipeline Error: {file.errorStage || file.pdfDiagnostics?.errorStage || 'Extraction Stage'}</span>
                        <span>{file.errorType || file.pdfDiagnostics?.errorType || 'Error'}</span>
                      </div>
                      <div className="text-rose-200 text-[10px] break-all">
                        {file.errorMessage || file.pdfDiagnostics?.errorMessage}
                      </div>
                      {file.pdfDiagnostics?.errorStack && (
                        <pre className="p-2 rounded bg-black/40 text-[9px] text-rose-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-28">
                          {file.pdfDiagnostics.errorStack}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Per-Page Diagnostic Table */}
                  {(() => {
                    const pagesList = file.pdfDiagnostics?.pages || file.pdfDiagnostics?.pageDiagnostics || file.pageDiagnostics || [];
                    if (pagesList.length === 0) return null;
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Per-Page Diagnostic & OCR Audit Log
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {pagesList.length} {pagesList.length === 1 ? 'Page' : 'Pages'} Audited
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-white/5 rounded-xl">
                          <table className="w-full text-left text-[10px]">
                            <thead className="bg-[#16191F] text-slate-400 border-b border-white/5">
                              <tr>
                                <th className="py-2 px-2.5">Page</th>
                                <th className="py-2 px-2.5">PDF.js Chars</th>
                                <th className="py-2 px-2.5">OCR Req</th>
                                <th className="py-2 px-2.5">OCR Chars</th>
                                <th className="py-2 px-2.5">Confidence</th>
                                <th className="py-2 px-2.5">Method</th>
                                <th className="py-2 px-2.5">Chunks</th>
                                <th className="py-2 px-2.5">Status</th>
                                <th className="py-2 px-2.5">Diagnostic Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-[#0D0F14]">
                              {pagesList.map((p) => {
                                const isOcr = p.extractionMethod === 'ocr' || (p.status === 'SUCCESS' && p.characterCount > 0 && p.textItemCount === 0);
                                const pdfjsChars = p.pdfjsTextChars !== undefined ? p.pdfjsTextChars : (isOcr ? 0 : p.characterCount);
                                const ocrChars = p.ocrChars !== undefined ? p.ocrChars : (isOcr ? p.characterCount : 0);
                                const ocrReq = p.ocrRequired || isOcr || pdfjsChars < 25;

                                return (
                                  <tr key={`diag-${p.pageNumber}`} className="hover:bg-white/[0.02]">
                                    <td className="py-2 px-2.5 text-slate-200 font-bold font-mono">#{p.pageNumber}</td>
                                    <td className="py-2 px-2.5 font-mono text-slate-300">
                                      {pdfjsChars.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          ocrReq
                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                            : 'bg-slate-700/30 text-slate-400 border border-white/5'
                                        }`}
                                      >
                                        {ocrReq ? 'Yes' : 'No'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-amber-300">
                                      {ocrChars > 0 ? ocrChars.toLocaleString() : '-'}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono">
                                      {p.ocrConfidence !== undefined && p.ocrConfidence > 0 ? (
                                        <span className="text-emerald-400 font-bold">{p.ocrConfidence}%</span>
                                      ) : (
                                        <span className="text-slate-500">N/A</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          isOcr
                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                            : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                        }`}
                                      >
                                        {isOcr ? 'Local OCR' : 'Digital Text'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-indigo-300">
                                      {p.chunksCount !== undefined ? p.chunksCount : '-'}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          p.status === 'SUCCESS'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : p.status === 'NO_TEXT'
                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}
                                      >
                                        {p.status === 'NO_TEXT' ? 'NO TEXT' : p.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-400 max-w-xs truncate" title={p.diagnosticNote || p.errorMessage}>
                                      {p.diagnosticNote || p.errorMessage || 'Digital text extracted cleanly'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Extracted Text Inspector */}
          {(file.textAvailable || (file.extractedPages && file.extractedPages.length > 0) || file.extractedFullText) && (
            <div className="rounded-2xl bg-[#0D0F14] border border-white/10 overflow-hidden shrink-0">
              <button
                onClick={() => setShowExtractedText(!showExtractedText)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>View Extracted Text</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {file.charactersExtracted ? `${file.charactersExtracted.toLocaleString()} Chars` : 'Available'}
                  </span>
                </div>
                {showExtractedText ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showExtractedText && (
                <div className="p-3.5 border-t border-white/5 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      Provenance: {file.extractedPages ? `${file.extractedPages.length} Pages Extracted` : 'Digital Text Stream'}
                    </span>
                    <button
                      onClick={() => {
                        const fullText = file.extractedFullText || (file.extractedPages ? file.extractedPages.map(p => p.text).join('\n\n') : '');
                        navigator.clipboard.writeText(fullText);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 hover:text-teal-300 px-2 py-1 rounded bg-white/[0.04] border border-white/10 transition-colors cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied All</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Full Text</span>
                        </>
                      )}
                    </button>
                  </div>

                  {file.extractedPages && file.extractedPages.length > 0 ? (
                    file.extractedPages.map((page, pIdx) => (
                      <div key={`page-${page.page_number ?? pIdx}`} className="p-3 rounded-xl bg-[#16191F] border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-mono text-teal-300">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white">
                              {page.location_label || (page.page_number ? `Page ${page.page_number}` : `Section ${pIdx + 1}`)}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                page.extraction_method === 'local_speech_to_text' || file.category === 'audio'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : page.extraction_method === 'ocr'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : page.extraction_method === 'docx_local_parser' || page.extraction_method === 'docx' || file.extension === 'docx'
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              }`}
                            >
                              Method:{' '}
                              {page.extraction_method === 'local_speech_to_text' || file.category === 'audio'
                                ? 'Local Speech-to-Text'
                                : page.extraction_method === 'ocr'
                                ? 'Local OCR'
                                : page.extraction_method === 'docx_local_parser' || page.extraction_method === 'docx' || file.extension === 'docx'
                                ? 'DOCX Local Parser'
                                : 'Digital Text'}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-300">
                              Characters: {(page.character_count || page.characters || page.text.length).toLocaleString()}
                            </span>
                            {(() => {
                              const pdfChars = page.pdfjs_text_chars ?? (page as any).pdfjsTextChars;
                              const ocrCh = page.ocr_chars ?? (page as any).ocrChars;
                              const chCount = page.chunks_count ?? (page as any).chunksCount;
                              return (
                                <>
                                  {pdfChars !== undefined && page.extraction_method === 'ocr' && (
                                    <>
                                      <span className="text-slate-500">•</span>
                                      <span className="text-slate-400">PDF.js Chars: {pdfChars}</span>
                                    </>
                                  )}
                                  {ocrCh !== undefined && ocrCh > 0 && (
                                    <>
                                      <span className="text-slate-500">•</span>
                                      <span className="text-amber-300">OCR Chars: {ocrCh.toLocaleString()}</span>
                                    </>
                                  )}
                                  {page.ocr_confidence !== undefined && page.ocr_confidence > 0 && (
                                    <>
                                      <span className="text-slate-500">•</span>
                                      <span className="text-emerald-400 font-medium">Confidence: {page.ocr_confidence}%</span>
                                    </>
                                  )}
                                  {chCount !== undefined && (
                                    <>
                                      <span className="text-slate-500">•</span>
                                      <span className="text-indigo-300 font-medium">{chCount} Chunks</span>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                            {page.text_items_count !== undefined && page.extraction_method !== 'ocr' && (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">{page.text_items_count} items</span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(page.text);
                              setCopiedPageNum(page.page_number);
                              setTimeout(() => setCopiedPageNum(null), 1500);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
                            title={`Copy text of page ${page.page_number}`}
                          >
                            {copiedPageNum === page.page_number ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Page</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed bg-[#0D0F14] p-2.5 rounded-lg border border-white/5 select-text whitespace-pre-wrap">
                          {page.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-[#16191F] border border-white/5 text-xs">
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed bg-[#0D0F14] p-2.5 rounded-lg border border-white/5 select-text whitespace-pre-wrap">
                        {file.extractedFullText || 'Text extracted successfully.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chunk Inspector Interactive Dropdown */}
          {(file.chunksCreated || loadedChunks.length > 0 || file.charactersExtracted) && (
            <div className="rounded-2xl bg-[#0D0F14] border border-white/10 overflow-hidden shrink-0">
              <button
                onClick={() => setShowChunks(!showChunks)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  <span>Inspect Semantic Chunks & Metadata</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {loadedChunks.length > 0 ? loadedChunks.length : (file.chunksCreated || (file.charactersExtracted ? Math.max(1, Math.ceil(file.charactersExtracted / 580)) : 1))} Chunks
                  </span>
                </div>
                {showChunks ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showChunks && (
                <div className="p-3.5 border-t border-white/5 space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar">
                  {isLoadingChunks ? (
                    <div className="py-4 text-center text-xs text-slate-400 font-mono">
                      Loading chunk records from local storage...
                    </div>
                  ) : loadedChunks.length > 0 ? (
                    loadedChunks.map((chunk, idx) => (
                      <div
                        key={chunk.chunk_id || `chunk-${idx}`}
                        className="p-3 rounded-xl bg-[#16191F] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                              Chunk #{typeof chunk.chunk_index === 'number' ? chunk.chunk_index : idx}
                            </span>
                            <span className="text-slate-200 font-medium">
                              {chunk.location_label || (chunk.page_number && chunk.page_number > 0 ? `Page ${chunk.page_number}` : `Section ${(chunk.chunk_index || 0) + 1}`)}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                chunk.extraction_method === 'ocr'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : chunk.extraction_method === 'docx_local_parser' || chunk.extraction_method === 'docx' || file.extension === 'docx'
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              }`}
                            >
                              Method:{' '}
                              {chunk.extraction_method === 'ocr'
                                ? 'Local OCR'
                                : chunk.extraction_method === 'docx_local_parser' || chunk.extraction_method === 'docx' || file.extension === 'docx'
                                ? 'DOCX Local Parser'
                                : 'PDF Text'}
                            </span>
                            {chunk.ocr_confidence !== undefined && chunk.ocr_confidence > 0 && (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-medium">{chunk.ocr_confidence}% OCR Conf</span>
                              </>
                            )}
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{chunk.character_count || chunk.text.length} chars</span>
                          </div>
                          <button
                            onClick={() => handleCopyChunk(chunk.text, chunk.chunk_id || `chunk-${idx}`)}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Copy chunk text"
                          >
                            {copiedChunkId === (chunk.chunk_id || `chunk-${idx}`) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Provenance Metadata Attributes: file ID, filename, page number, chunk ID, chunk index, extraction method */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-lg bg-[#0D0F14]/70 border border-white/5 text-[10px] font-mono text-slate-400">
                          <div>
                            <span className="text-slate-500">File ID:</span>{' '}
                            <span className="text-slate-300 truncate select-all">{chunk.file_id || file.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Filename:</span>{' '}
                            <span className="text-slate-300 truncate select-all">{chunk.file_name || file.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Page Number:</span>{' '}
                            <span className="text-cyan-300 font-bold">
                              {chunk.page_number && chunk.page_number > 0 ? `Page ${chunk.page_number}` : 'N/A (Flowable DOCX / Section)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Chunk ID:</span>{' '}
                            <span className="text-indigo-300 font-semibold truncate select-all">
                              {chunk.chunk_id || `${file.id}_${chunk.page_number ? `p${chunk.page_number}` : 'sec'}_c${chunk.chunk_index ?? idx}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Chunk Index:</span>{' '}
                            <span className="text-cyan-400 font-bold">#{chunk.chunk_index ?? idx}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Method:</span>{' '}
                            <span
                              className={
                                chunk.extraction_method === 'ocr'
                                  ? 'text-amber-300 font-bold'
                                  : chunk.extraction_method === 'docx_local_parser' || chunk.extraction_method === 'docx' || file.extension === 'docx'
                                  ? 'text-blue-300 font-bold'
                                  : 'text-teal-300 font-bold'
                              }
                            >
                              {chunk.extraction_method === 'ocr'
                                ? 'Local OCR'
                                : chunk.extraction_method === 'docx_local_parser' || chunk.extraction_method === 'docx' || file.extension === 'docx'
                                ? 'DOCX Local Parser'
                                : chunk.extraction_method || 'pdf_text'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed bg-[#0D0F14] p-2.5 rounded-lg border border-white/5 select-text">
                          {chunk.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-[#16191F] border border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                        <span>Chunk Strategy: 500–800 chars (target 700) • 120 chars overlap</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed bg-[#0D0F14] p-2.5 rounded-lg border border-white/5">
                        Semantic chunks generated across {file.pagesCount || 1} pages with paragraph and sentence boundary preservation. Stored in IndexedDB with local 384-dimensional dense vector embeddings.
                      </p>
                    </div>
                  )}

                  {/* Sample Vector Tensor View */}
                  {embeddingInfo?.sampleVector && (
                    <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-emerald-500/20 text-[10px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="font-semibold flex items-center gap-1">
                          <Binary className="w-3 h-3" /> Sample Dense Vector (First 8 of 384 dimensions):
                        </span>
                        <span className="text-slate-400">
                          {embeddingInfo.norm !== undefined ? `Norm: ${embeddingInfo.norm.toFixed(4)}` : 'Unit-normalized'}
                        </span>
                      </div>
                      <div className="text-slate-300 bg-[#16191F] p-2 rounded border border-white/5 truncate select-all">
                        [{embeddingInfo.sampleVector.map(v => v.toFixed(6)).join(', ')}, ...]
                      </div>
                      {embeddingInfo.source && (
                        <div className="text-[9px] text-slate-500 flex items-center justify-between pt-0.5">
                          <span>Store: <strong className="text-slate-400">{embeddingInfo.source}</strong></span>
                          <span>Model: <strong className="text-indigo-300">{embeddingInfo.modelName}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Engine Note: Step 6 Local Embeddings Pipeline */}
          <div className="p-3.5 rounded-2xl bg-[#0D0F14] border border-white/5 flex items-start gap-3 text-xs text-slate-400 shrink-0">
            <Binary className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200 block">Step 6 Local Embeddings with Sentence Transformers</span>
              <p className="leading-relaxed text-[11px]">
                Vector embeddings are generated on-device using <code className="text-indigo-300 font-mono">sentence-transformers/all-MiniLM-L6-v2</code> (384-dimensional dense vectors). Zero external cloud AI API calls ensure complete data privacy and air-gapped readiness for local semantic search.
              </p>
            </div>
          </div>

          {/* Actions: Rename, Delete, Embed/Re-embed, Close */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onRename(file);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#0D0F14] hover:bg-[#1C2028] rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Rename</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onDelete(file);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {file.processingStatus !== 'OCR Required' && (
                <button
                  onClick={() => {
                    processFileEmbedding(file.id);
                    onClose();
                  }}
                  disabled={file.processingStatus === 'Embedding'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate 384-dimensional real local embeddings using sentence-transformers/all-MiniLM-L6-v2"
                >
                  <Binary className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {file.processingStatus === 'Indexed'
                      ? 'Re-index Document'
                      : file.processingStatus === 'Ready for Indexing'
                      ? 'Index into Vector Store'
                      : file.processingStatus === 'Embedding'
                      ? 'Embedding...'
                      : file.processingStatus === 'Indexing'
                      ? 'Indexing...'
                      : 'Embed & Index (MiniLM)'}
                  </span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl transition-all cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Close
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
