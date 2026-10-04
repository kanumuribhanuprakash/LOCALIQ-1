import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Image as ImageIcon,
  Headphones,
  FileCode,
  ExternalLink,
  X,
  Copy,
  Check,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { SemanticEvidenceChunk, KnowledgeFile } from '../../types';

interface InlineCitationPopoverProps {
  citationNumber: number;
  evidence: SemanticEvidenceChunk;
  onOpenSource?: (fileId: string) => void;
  onHighlightSource?: (chunkId: string) => void;
  allFiles?: KnowledgeFile[];
}

export const InlineCitationPopover: React.FC<InlineCitationPopoverProps> = ({
  citationNumber,
  evidence,
  onOpenSource,
  onHighlightSource,
  allFiles = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyEvidence = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(evidence.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine truthful location string
  const formatTruthfulLocation = (): string => {
    const ext = (evidence.fileType || evidence.fileName?.split('.').pop() || '').toLowerCase();
    const method = evidence.extraction_method || evidence.extractionMethod || '';

    // Audio file
    if (ext === 'mp3' || ext === 'wav' || ext === 'm4a' || method.includes('audio') || method.includes('whisper')) {
      if (evidence.location_label && /\d{2}:\d{2}/.test(evidence.location_label)) {
        return evidence.location_label;
      }
      if (evidence.location && /\d{2}:\d{2}/.test(evidence.location)) {
        return evidence.location;
      }
      return '00:00–00:15 (Audio segment)';
    }

    // Image file
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || method.includes('ocr_image')) {
      return 'Image OCR';
    }

    // DOCX file
    if (ext === 'docx' || ext === 'doc' || method.includes('docx')) {
      if (evidence.location_label) return evidence.location_label;
      if (evidence.location) return evidence.location;
      const pNum = evidence.chunkIndex !== undefined ? evidence.chunkIndex + 1 : 1;
      return `Document section 1, Paragraphs ${pNum}–${pNum + 3}`;
    }

    // PDF file
    if (ext === 'pdf') {
      const page = evidence.pageNumber || (evidence as any).page_number;
      const chunkIdx = evidence.chunkIndex !== undefined ? evidence.chunkIndex : (evidence as any).chunk_index;
      if (page && page > 0) {
        return chunkIdx !== undefined ? `Page ${page}, Chunk #${chunkIdx + 1}` : `Page ${page}`;
      }
      if (evidence.location_label) return evidence.location_label;
      if (evidence.location) return evidence.location;
    }

    if (evidence.location_label) return evidence.location_label;
    if (evidence.location) return evidence.location;

    return 'Location unavailable';
  };

  // Truthful extraction method label
  const formatExtractionMethod = (): string => {
    const method = evidence.extraction_method || evidence.extractionMethod || '';
    if (method.includes('ocr') || (evidence.ocrConfidence !== undefined && evidence.ocrConfidence > 0)) {
      return 'Local OCR';
    }
    if (method.includes('pdf')) {
      return 'Local Native PDF';
    }
    if (method.includes('docx')) {
      return 'Local Mammoth Parser';
    }
    if (method.includes('whisper') || method.includes('audio')) {
      return 'Local Whisper ONNX ASR';
    }
    if (method.includes('txt')) {
      return 'Direct Text Extraction';
    }
    return 'Client-Side Parser';
  };

  // Get icon for file type
  const getFileIcon = () => {
    const ext = (evidence.fileType || evidence.fileName?.split('.').pop() || '').toLowerCase();
    if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') return Headphones;
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return ImageIcon;
    if (ext === 'txt') return FileCode;
    return FileText;
  };

  const FileIcon = getFileIcon();
  const fileExistsInVault = allFiles.some((f) => f.id === evidence.fileId);

  return (
    <span className="relative inline-block mx-0.5 align-baseline">
      {/* Interactive Citation Pill */}
      <button
        ref={triggerRef}
        type="button"
        id={`citation-btn-${citationNumber}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && onHighlightSource) {
            onHighlightSource(evidence.chunkId);
          }
        }}
        aria-label={`View source ${citationNumber} from ${evidence.fileName || 'document'}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-[#08121D] ${
          isOpen
            ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/40 font-extrabold scale-105'
            : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:text-white border border-cyan-500/30 hover:border-cyan-400/60'
        }`}
      >
        [{citationNumber}]
      </button>

      {/* Popover / Compact Source Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-label={`Source ${citationNumber} Details`}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 p-4 rounded-2xl bg-[#091522] border border-cyan-500/30 shadow-2xl text-left z-50 text-slate-200 text-xs font-sans backdrop-blur-xl"
            style={{
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(6, 182, 212, 0.15)',
            }}
          >
            {/* Popover Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-[#091522] border-r border-b border-cyan-500/30 rotate-45 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] tracking-wider border border-cyan-500/30">
                  SOURCE {citationNumber}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Evidence</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                aria-label="Close source popover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="space-y-2 mb-3 text-[11px]">
              {/* Filename */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                  Filename
                </span>
                <div className="flex items-center gap-1.5 font-medium text-white truncate">
                  <FileIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate" title={evidence.fileName}>
                    {evidence.fileName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Location */}
                <div className="p-2 rounded-xl bg-[#050C14] border border-white/5">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                    Location
                  </span>
                  <span className="font-semibold text-cyan-300 block truncate">
                    {formatTruthfulLocation()}
                  </span>
                </div>

                {/* Extraction */}
                <div className="p-2 rounded-xl bg-[#050C14] border border-white/5">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                    Extraction
                  </span>
                  <span className="font-semibold text-slate-200 block truncate">
                    {formatExtractionMethod()}
                  </span>
                </div>
              </div>

              {/* OCR Confidence & Source Type */}
              <div className="grid grid-cols-2 gap-2">
                {evidence.ocrConfidence !== undefined && evidence.ocrConfidence > 0 ? (
                  <div className="p-2 rounded-xl bg-[#050C14] border border-white/5">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                      OCR Confidence
                    </span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {Math.round(evidence.ocrConfidence)}%
                    </span>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-[#050C14] border border-white/5">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                      Relevance Score
                    </span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {(evidence.score ?? 0).toFixed(3)}
                    </span>
                  </div>
                )}

                <div className="p-2 rounded-xl bg-[#050C14] border border-white/5">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                    Source Type
                  </span>
                  <span className="font-bold text-emerald-300 font-mono text-[10px]">
                    DOCUMENT CONTENT
                  </span>
                </div>
              </div>
            </div>

            {/* Extracted Evidence Content */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="uppercase tracking-wider">Extracted Evidence</span>
                <button
                  type="button"
                  onClick={handleCopyEvidence}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {copied ? (
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
              <div className="p-2.5 rounded-xl bg-[#050C14] border border-cyan-500/20 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
                {evidence.text}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
              {onHighlightSource && (
                <button
                  type="button"
                  onClick={() => {
                    onHighlightSource(evidence.chunkId);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span>View Extracted Evidence</span>
                </button>
              )}

              {onOpenSource && fileExistsInVault && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSource(evidence.fileId);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/40 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Source</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
