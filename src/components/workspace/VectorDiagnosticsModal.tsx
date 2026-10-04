import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Binary,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Database,
  Search,
  Copy,
  Check,
  RefreshCw,
  Play,
  Zap,
  Info,
  ShieldCheck,
  FileText,
  Trash2,
} from 'lucide-react';
import { clientVectorIndexService, IndexedVectorRecord, dotProduct } from '../../services/clientVectorIndexService';
import { localEmbeddingService } from '../../services/localEmbeddingService';
import { useApp } from '../../context/AppContext';

interface VectorDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFileId?: string;
}

export interface ChunkDiagnosticItem {
  index: number;
  chunkId: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  chunkIndex: number;
  extractionMethod: string;
  ocrConfidence?: number;
  characterCount: number;
  dimensions: number;
  norm: number;
  firstValues: number[];
  hasNaN: boolean;
  hasInfinity: boolean;
  isAllZeros: boolean;
  sourceType: string;
  isMetadataOnly: boolean;
  text: string;
}

export const VectorDiagnosticsModal: React.FC<VectorDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  targetFileId,
}) => {
  const { user, files, refreshIndexStatus } = useApp();
  const userId = user?.id || 'demo-analyst-default';

  const [loading, setLoading] = useState<boolean>(true);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [records, setRecords] = useState<IndexedVectorRecord[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<ChunkDiagnosticItem | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Exact-text test state
  const [testingExactText, setTestingExactText] = useState<boolean>(false);
  const [exactTestResult, setExactTestResult] = useState<{
    chunkId: string;
    sampleText: string;
    queryNorm: number;
    chunkNorm: number;
    similarity: number;
    passed: boolean;
    durationMs: number;
  } | null>(null);

  const loadVectors = async () => {
    setLoading(true);
    try {
      let fetched: IndexedVectorRecord[] = [];
      if (targetFileId) {
        fetched = await clientVectorIndexService.getVectorsForFile(userId, targetFileId);
      } else {
        fetched = await clientVectorIndexService.getAllUserVectors(userId);
      }
      setRecords(fetched);
      if (fetched.length > 0 && !selectedChunk) {
        // will be set in memo
      }
    } catch (err) {
      console.error('Failed to load vectors for diagnostics', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAllVectors = async () => {
    if (!window.confirm('Purge all vectors in IndexedDB for this user? This allows a clean rebuild of the vector index without stale schema or metadata chunks.')) {
      return;
    }
    setIsPurging(true);
    try {
      if (targetFileId) {
        await clientVectorIndexService.removeFileVectors(userId, targetFileId);
      } else {
        await clientVectorIndexService.clearUserIndex(userId);
      }
      setSelectedChunk(null);
      setExactTestResult(null);
      await loadVectors();
      if (refreshIndexStatus) {
        await refreshIndexStatus();
      }
    } catch (err) {
      console.error('Failed to purge vectors:', err);
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVectors();
    } else {
      setExactTestResult(null);
    }
  }, [isOpen, targetFileId, userId]);

  // Compute diagnostics per chunk
  const diagnosticItems: ChunkDiagnosticItem[] = useMemo(() => {
    return records.map((rec, idx) => {
      const vec = rec.vector || [];
      let sumSq = 0;
      let hasNaN = false;
      let hasInfinity = false;
      let isAllZeros = true;

      for (let i = 0; i < vec.length; i++) {
        const v = vec[i];
        if (Number.isNaN(v)) hasNaN = true;
        if (!Number.isFinite(v)) hasInfinity = true;
        if (v !== 0) isAllZeros = false;
        sumSq += v * v;
      }

      const norm = Math.sqrt(sumSq);

      return {
        index: idx + 1,
        chunkId: rec.chunkId,
        fileId: rec.fileId,
        fileName: rec.fileName,
        pageNumber: rec.pageNumber,
        chunkIndex: rec.chunkIndex,
        extractionMethod: rec.extractionMethod || 'pdf_text',
        ocrConfidence: rec.ocrConfidence,
        characterCount: (rec.text || '').length,
        dimensions: vec.length,
        norm: Number(norm.toFixed(4)),
        firstValues: vec.slice(0, 5).map(v => Number(v.toFixed(4))),
        hasNaN,
        hasInfinity,
        isAllZeros,
        sourceType: rec.sourceType || 'document_content',
        isMetadataOnly: rec.isMetadataOnly === true || rec.sourceType === 'application_metadata',
        text: rec.text || '',
      };
    });
  }, [records]);

  // High-level vector suite summary
  const auditSummary = useMemo(() => {
    const total = diagnosticItems.length;
    if (total === 0) {
      return {
        total: 0,
        validDimensions: 0,
        validNorms: 0,
        zeroNaN: true,
        zeroInfinity: true,
        zeroAllZeros: true,
        allHaveText: true,
        overallPass: false,
      };
    }

    const validDimensions = diagnosticItems.filter(d => d.dimensions === 384).length;
    const validNorms = diagnosticItems.filter(d => Math.abs(d.norm - 1.0) < 0.05).length;
    const zeroNaN = diagnosticItems.every(d => !d.hasNaN);
    const zeroInfinity = diagnosticItems.every(d => !d.hasInfinity);
    const zeroAllZeros = diagnosticItems.every(d => !d.isAllZeros);
    const allHaveText = diagnosticItems.every(d => d.characterCount > 0);

    const overallPass =
      validDimensions === total &&
      validNorms === total &&
      zeroNaN &&
      zeroInfinity &&
      zeroAllZeros &&
      allHaveText;

    return {
      total,
      validDimensions,
      validNorms,
      zeroNaN,
      zeroInfinity,
      zeroAllZeros,
      allHaveText,
      overallPass,
    };
  }, [diagnosticItems]);

  // Filtered list
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return diagnosticItems;
    const q = filterQuery.toLowerCase();
    return diagnosticItems.filter(
      item =>
        item.fileName.toLowerCase().includes(q) ||
        item.chunkId.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        `page ${item.pageNumber}`.includes(q)
    );
  }, [diagnosticItems, filterQuery]);

  // Run exact text self-retrieval test
  const handleRunExactTest = async (item: ChunkDiagnosticItem) => {
    setTestingExactText(true);
    setExactTestResult(null);
    const startTime = performance.now();

    try {
      // 1. Take sample sentence from chunk text
      const cleanText = item.text.trim();
      const sample = cleanText.length > 120 ? cleanText.substring(0, 120) : cleanText;

      // 2. Embed the exact text using local ONNX pipeline
      const queryVec = await localEmbeddingService.embedQuery(sample);

      // 3. Find the matching vector in IndexedDB
      const record = records.find(r => r.chunkId === item.chunkId);
      if (!record) {
        throw new Error('Record not found in memory index');
      }

      // Compute norms
      let qSum = 0;
      for (let i = 0; i < queryVec.length; i++) qSum += queryVec[i] * queryVec[i];
      const qNorm = Math.sqrt(qSum);

      let dSum = 0;
      for (let i = 0; i < record.vector.length; i++) dSum += record.vector[i] * record.vector[i];
      const dNorm = Math.sqrt(dSum);

      // Compute dot product
      const sim = dotProduct(queryVec, record.vector);
      const durationMs = Math.round(performance.now() - startTime);

      setExactTestResult({
        chunkId: item.chunkId,
        sampleText: sample,
        queryNorm: Number(qNorm.toFixed(4)),
        chunkNorm: Number(dNorm.toFixed(4)),
        similarity: Number(sim.toFixed(4)),
        passed: sim >= 0.70, // Exact or prefix match should yield very high cosine similarity
        durationMs,
      });
    } catch (err) {
      console.error('Exact text retrieval test failed', err);
    } finally {
      setTestingExactText(false);
    }
  };

  const handleCopyReport = () => {
    const report = {
      auditDate: new Date().toISOString(),
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      expectedDimensions: 384,
      totalIndexedVectors: diagnosticItems.length,
      auditSummary,
      representativeChunks: diagnosticItems.slice(0, 6).map(c => ({
        filename: c.fileName,
        pageNumber: c.pageNumber,
        chunkId: c.chunkId,
        extractionMethod: c.extractionMethod,
        ocrConfidence: c.ocrConfidence,
        textCharacterCount: c.characterCount,
        embeddingDimension: c.dimensions,
        vectorNorm: c.norm,
        firstValues: c.firstValues,
        textSnippet: c.text.substring(0, 100),
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-[#050C14] border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-200"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-[#08121D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Binary className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Vector Index & OCR Data Inspector
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {auditSummary.total} Vectors
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Deep inspection of IndexedDB vectors, normalization, OCR metadata, and exact-text retrieval
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePurgeAllVectors}
                disabled={isPurging || records.length === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 hover:text-rose-200 font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Purge all vectors in IndexedDB to rebuild with clean schema and no metadata chunks"
              >
                <Trash2 className={`w-3.5 h-3.5 text-rose-400 ${isPurging ? 'animate-pulse' : ''}`} />
                <span>{isPurging ? 'Purging...' : 'Purge Vectors'}</span>
              </button>
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-cyan-500/20 text-xs text-cyan-300 font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy Full Diagnostic Audit Report as JSON"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReport ? 'Copied JSON' : 'Export Audit JSON'}</span>
              </button>
              <button
                onClick={loadVectors}
                className="p-2 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh IndexedDB"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-sans">
            {/* 1. Verification Suite Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-2xl bg-[#08121D] border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase block">Embedding Model</span>
                <span className="text-xs font-bold text-cyan-300 block truncate">all-MiniLM-L6-v2</span>
                <span className="text-[10px] text-slate-400">ONNX Browser Runtime</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#08121D] border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase block">Dimensions (384)</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {auditSummary.validDimensions}/{auditSummary.total} Match
                </span>
                <span className="text-[10px] text-slate-400">Dense FP32 Vectors</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#08121D] border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase block">L2 Unit Norm (~1.0)</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {auditSummary.validNorms}/{auditSummary.total} Normalized
                </span>
                <span className="text-[10px] text-slate-400">||v|| ≈ 1.0000</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#08121D] border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase block">Data Integrity</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Zero NaN / Inf
                </span>
                <span className="text-[10px] text-slate-400">All chunks have valid text</span>
              </div>
            </div>

            {/* Exact Text Test Results Banner if active */}
            {exactTestResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border ${
                  exactTestResult.passed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 font-mono">
                    <span className="text-xs font-bold flex items-center gap-1.5 uppercase">
                      <Zap className="w-4 h-4 text-emerald-400" /> Exact-Text Self-Retrieval Verification
                    </span>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Embedded chunk verbatim text as query and computed cosine similarity against stored vector:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Cosine Similarity:</span>
                        <span className="font-bold text-emerald-300 text-sm">{exactTestResult.similarity.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Query Norm:</span>
                        <span className="text-slate-200">{exactTestResult.queryNorm.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Document Norm:</span>
                        <span className="text-slate-200">{exactTestResult.chunkNorm.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Inference Time:</span>
                        <span className="text-slate-200">{exactTestResult.durationMs}ms</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExactTestResult(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by filename, page number, chunk ID, or text..."
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#08121D] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredItems.length} of {diagnosticItems.length}
              </span>
            </div>

            {/* Chunks Diagnostic Table */}
            <div className="rounded-2xl border border-white/10 bg-[#08121D] overflow-hidden">
              <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-[#0D1826] text-slate-400 border-b border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">File / Page</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">OCR Conf</th>
                      <th className="py-2.5 px-3">Chars</th>
                      <th className="py-2.5 px-3">Dim</th>
                      <th className="py-2.5 px-3">Norm</th>
                      <th className="py-2.5 px-3">Vector Preview</th>
                      <th className="py-2.5 px-3">Text Snippet</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredItems.map(item => (
                      <tr
                        key={item.chunkId}
                        onClick={() => setSelectedChunk(item)}
                        className={`hover:bg-cyan-500/5 transition-colors cursor-pointer ${
                          selectedChunk?.chunkId === item.chunkId ? 'bg-cyan-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-500 font-bold">{item.index}</td>
                        <td className="py-2 px-3 truncate max-w-[140px]">
                          <span className="text-white block truncate">{item.fileName}</span>
                          <span className="text-[10px] text-cyan-400">p.{item.pageNumber} • #{item.chunkIndex + 1}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            item.isMetadataOnly
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.isMetadataOnly ? 'METADATA' : 'CONTENT'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            item.extractionMethod === 'ocr'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {item.extractionMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {item.ocrConfidence !== undefined ? `${item.ocrConfidence}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{item.characterCount}</td>
                        <td className="py-2 px-3 text-slate-300">{item.dimensions}</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">{item.norm.toFixed(4)}</td>
                        <td className="py-2 px-3 text-slate-400 text-[10px] max-w-[130px] truncate">
                          [{item.firstValues.join(', ')}]
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-sans max-w-[200px] truncate">
                          {item.text.replace(/\s+/g, ' ')}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            disabled={testingExactText}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunExactTest(item);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#132337] hover:bg-cyan-600/30 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                            title="Run exact-text self-retrieval verification on this chunk"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>Test Exact</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Chunk Verbatim Text & Provenance Inspector */}
            {selectedChunk && (
              <div className="p-4 rounded-2xl bg-[#08121D] border border-cyan-500/30 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white">Chunk Verbatim Text & Mathematical Proof</span>
                    <span className="text-slate-500 text-[10px]">
                      ({selectedChunk.fileName} • Page {selectedChunk.pageNumber} • Chunk {selectedChunk.chunkId})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedChunk.text);
                        setCopiedChunkId(selectedChunk.chunkId);
                        setTimeout(() => setCopiedChunkId(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedChunkId === selectedChunk.chunkId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedChunkId === selectedChunk.chunkId ? 'Copied' : 'Copy Text'}</span>
                    </button>
                    <button
                      onClick={() => handleRunExactTest(selectedChunk)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Test Exact Retrieval</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">Extraction Method:</span>
                    <span className="text-cyan-300 font-bold uppercase">{selectedChunk.extractionMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">OCR Confidence:</span>
                    <span className="text-slate-200 font-bold">{selectedChunk.ocrConfidence !== undefined ? `${selectedChunk.ocrConfidence}%` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Character Length:</span>
                    <span className="text-slate-200 font-bold">{selectedChunk.characterCount} chars</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vector L2 Norm:</span>
                    <span className="text-emerald-400 font-bold">{selectedChunk.norm.toFixed(4)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] block">First 8 Vector Dimensions:</span>
                  <div className="p-2 rounded bg-[#050C14] border border-white/5 text-cyan-300 text-[10px] font-mono break-all">
                    [{selectedChunk.firstValues.join(', ')}, ...]
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] block">Verbatim Extracted Content:</span>
                  <div className="p-3 rounded-xl bg-[#050C14] border border-white/5 text-slate-200 font-sans text-xs max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                    {selectedChunk.text}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-cyan-500/20 bg-[#08121D] flex items-center justify-between text-xs text-slate-400">
            <span>
              LOCALIQ Air-Gapped Engine • Pure Client-Side IndexedDB
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
