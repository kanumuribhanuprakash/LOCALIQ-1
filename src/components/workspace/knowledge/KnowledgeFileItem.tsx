import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Headphones,
  FileCode,
  FileSpreadsheet,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Binary,
  Cpu,
  Database,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { KnowledgeFile } from '../../../types';
import { getFileTypeBadgeColor, formatUploadLabel } from '../../../utils/fileHelpers';
import { useApp } from '../../../context/AppContext';

interface KnowledgeFileItemProps {
  file: KnowledgeFile;
  viewMode: 'table' | 'cards';
  isSelected?: boolean;
  onToggleSelect?: (fileId: string) => void;
  onViewDetails: (file: KnowledgeFile) => void;
  onRename: (file: KnowledgeFile) => void;
  onDelete: (file: KnowledgeFile) => void;
  onIndexFile?: (file: KnowledgeFile) => void;
}

export const KnowledgeFileItem: React.FC<KnowledgeFileItemProps> = ({
  file,
  viewMode,
  isSelected = false,
  onToggleSelect,
  onViewDetails,
  onRename,
  onDelete,
  onIndexFile,
}) => {
  const { setActiveTab } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const getFileIcon = () => {
    switch (file.category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'audio':
        return <Headphones className="w-5 h-5 text-amber-400" />;
      case 'document':
      default:
        if (file.extension === 'pdf') {
          return <FileText className="w-5 h-5 text-rose-400" />;
        }
        if (file.extension === 'docx' || file.extension === 'doc') {
          return <FileText className="w-5 h-5 text-blue-400" />;
        }
        if (file.extension === 'txt' || file.extension === 'md') {
          return <FileCode className="w-5 h-5 text-cyan-400" />;
        }
        return <FileSpreadsheet className="w-5 h-5 text-indigo-400" />;
    }
  };

  const badgeClass = getFileTypeBadgeColor(file.extension);
  const uploadLabel = formatUploadLabel(file.uploadTimestamp, file.uploadDate);

  const renderStatusBadge = () => {
    switch (file.processingStatus) {
      case 'Uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Uploading</span>
          </span>
        );
      case 'Transcribing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Transcribing</span>
          </span>
        );
      case 'Extracting':
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            <span>{file.processingStatus === 'Extracting' ? 'Extracting' : 'Processing'}</span>
          </span>
        );
      case 'Text Extracted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <FileCheck className="w-3 h-3 text-indigo-400" />
            <span>Text Extracted</span>
          </span>
        );
      case 'Partially Extracted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300">
            <FileCheck className="w-3 h-3 text-amber-400" />
            <span>Partially Extracted</span>
          </span>
        );
      case 'Partially Indexed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-emerald-500/25 text-emerald-300">
            <span className="font-bold text-amber-400">⚡</span>
            <span>Partially Indexed</span>
          </span>
        );
      case 'Chunking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            <span>Chunking</span>
          </span>
        );
      case 'Ready for Embedding':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>Ready for Embedding</span>
          </span>
        );
      case 'Embedding':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Embedding</span>
          </span>
        );
      case 'Ready for Indexing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
            <Binary className="w-3 h-3 text-emerald-400" />
            <span>Ready for Indexing</span>
          </span>
        );
      case 'Indexing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            <span>Indexing</span>
          </span>
        );
      case 'Indexed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span className="font-bold text-emerald-400">✓</span>
            <span>Indexed</span>
          </span>
        );
      case 'Unsupported Format':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300"
            title={file.errorMessage || 'Unsupported file format in browser-only mode'}
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Unsupported Format</span>
          </span>
        );
      case 'OCR Required':
      case 'Requires OCR':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300"
            title={file.errorMessage || 'Scanned PDF - Optical Character Recognition required'}
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>OCR Required</span>
          </span>
        );
      case 'OCR Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-teal-500/10 border border-teal-500/25 text-teal-300 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
            <span>OCR Processing</span>
          </span>
        );
      case 'OCR Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300" title={file.errorMessage}>
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>OCR Failed</span>
          </span>
        );
      case 'Unsupported Image Format':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300" title={file.errorMessage}>
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Unsupported Image Format</span>
          </span>
        );
      case 'No Text Detected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300" title={file.errorMessage}>
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>No Text Detected</span>
          </span>
        );
      case 'Failed':
      case 'Extraction Failed':
      case 'Embedding Failed':
      case 'Indexing Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300" title={file.errorMessage}>
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{file.processingStatus === 'Embedding Failed' ? 'Embedding Failed' : file.processingStatus === 'Indexing Failed' ? 'Indexing Failed' : 'Failed'}</span>
          </span>
        );
      case 'Ready to Process':
      case 'Ready':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#050C14] border border-cyan-500/20 text-cyan-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Ready</span>
          </span>
        );
    }
  };

  const getPageOrDetailText = () => {
    if (file.category === 'audio') {
      if (file.charactersExtracted) {
        return file.pagesOrDuration || `${file.charactersExtracted} chars · Local Speech-to-Text`;
      }
      return file.pagesOrDuration || 'Local Speech-to-Text';
    }
    if (file.category === 'image') {
      if (file.charactersExtracted) {
        return `${file.charactersExtracted} chars · ${file.ocrConfidence || 0}% conf`;
      }
      return file.pagesOrDuration || 'Image OCR';
    }
    if (file.extension === 'docx' || file.extension === 'doc' || file.extension === 'txt' || file.extension === 'md') {
      return file.pagesOrDuration || (file.chunksCreated ? `${file.chunksCreated} chunks` : '—');
    }
    if (file.pagesCount) {
      return `${file.pagesCount} ${file.pagesCount === 1 ? 'page' : 'pages'}`;
    }
    return file.pagesOrDuration || '—';
  };

  // Card View Layout
  if (viewMode === 'cards') {
    return (
      <div
        className={`relative p-5 rounded-3xl transition-all duration-200 flex flex-col justify-between space-y-4 group text-left ${
          isSelected
            ? 'bg-[#08121D] border-2 border-cyan-400/80 shadow-xl shadow-cyan-500/10'
            : 'bg-[#08121D] border border-white/5 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5'
        }`}
      >
        {/* TOP ROW: Checkbox, File Type Icon, Extension Badge, Processing Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(file.id)}
              aria-label={`Select ${file.name}`}
              className="w-4 h-4 rounded border-cyan-500/30 text-cyan-500 bg-[#050C14] focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer accent-cyan-500 shrink-0"
            />
            <div className="p-2.5 rounded-xl bg-[#050C14] border border-white/10 shrink-0 shadow-sm">
              {getFileIcon()}
            </div>
            <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border ${badgeClass}`}>
              .{file.extension}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge()}
            {/* Quick menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 p-1.5 rounded-2xl bg-[#050C14] border border-white/10 shadow-2xl z-30 space-y-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(file);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(file);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: File Name (prominent, readable) & Metadata (size, upload time, pages/chunks) */}
        <div className="space-y-2">
          <h4
            onClick={() => onViewDetails(file)}
            className="text-sm font-bold text-white tracking-tight truncate cursor-pointer hover:text-cyan-300 transition-colors font-sans"
            title={file.name}
          >
            {file.name}
          </h4>

          <div className="text-[11px] text-slate-400 font-mono flex items-center flex-wrap gap-1.5">
            <span>{file.formattedSize}</span>
            <span>•</span>
            <span>{uploadLabel}</span>
            <span>•</span>
            <span>{getPageOrDetailText()}</span>
            {file.chunksCreated ? (
              <>
                <span>•</span>
                <span className="text-cyan-300 font-semibold">{file.chunksCreated} Chunks</span>
              </>
            ) : null}
          </div>

          {file.errorMessage && (
            <p className="text-[10px] text-rose-400 font-mono line-clamp-1" title={file.errorMessage}>
              {file.errorMessage}
            </p>
          )}
        </div>

        {/* BOTTOM: Actions: View Details, Ask Assistant, Re-index, Delete */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-1">
          <button
            onClick={() => onViewDetails(file)}
            className="px-2.5 py-1.5 rounded-lg bg-[#050C14] hover:bg-[#091522] border border-white/5 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Details</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className="px-2.5 py-1.5 rounded-lg bg-[#050C14] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-[11px] font-mono text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            title="Ask LOCALIQ grounded in this file"
          >
            <Bot className="w-3 h-3 text-cyan-400" />
            <span>Ask</span>
          </button>

          {onIndexFile && (
            <button
              onClick={() => onIndexFile(file)}
              className="px-2.5 py-1.5 rounded-lg bg-[#050C14] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-[11px] font-mono text-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Re-index into local vector database"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>Index</span>
            </button>
          )}

          <button
            onClick={() => onDelete(file)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete from local vault"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    );
  }

  // Table Row Layout
  return (
    <tr
      className={`transition-colors group text-left ${
        isSelected ? 'bg-cyan-950/25 hover:bg-cyan-950/35' : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Selection Checkbox */}
      <td className="py-3.5 pl-5 pr-1 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(file.id)}
          aria-label={`Select ${file.name}`}
          className="w-4 h-4 rounded border-cyan-500/30 text-cyan-500 bg-[#050C14] focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer accent-cyan-500"
        />
      </td>

      {/* File Name + Icon */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#050C14] border border-white/10 shrink-0 shadow-sm">
            {getFileIcon()}
          </div>
          <div className="overflow-hidden">
            <button
              onClick={() => onViewDetails(file)}
              className="font-semibold text-slate-200 block truncate max-w-xs sm:max-w-md text-left hover:text-cyan-300 transition-colors cursor-pointer font-sans"
              title={file.name}
            >
              {file.name}
            </button>
            <div className="text-[11px] text-slate-400 font-mono flex items-center flex-wrap gap-1.5 mt-0.5">
              <span className="uppercase font-bold text-cyan-400">.{file.extension}</span>
              <span>•</span>
              <span className="capitalize">{file.category}</span>
              <span>•</span>
              <span>{file.formattedSize}</span>
              <span>•</span>
              <span>{getPageOrDetailText()}</span>
              {file.chunksCreated ? (
                <>
                  <span>•</span>
                  <span className="text-cyan-300 font-semibold">{file.chunksCreated} Chunks</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-3.5 px-5 hidden md:table-cell text-slate-400 capitalize font-mono text-xs">
        {file.category}
      </td>

      {/* Size */}
      <td className="py-3.5 px-5 hidden sm:table-cell text-slate-400 font-mono text-xs">
        {file.formattedSize}
      </td>

      {/* Upload Date */}
      <td className="py-3.5 px-5 hidden lg:table-cell text-slate-400 font-mono text-xs">
        {uploadLabel}
      </td>

      {/* Status */}
      <td className="py-3.5 px-5">
        {renderStatusBadge()}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onViewDetails(file)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="View details & chunks"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="Ask LOCALIQ"
          >
            <Bot className="w-3.5 h-3.5" />
          </button>
          {onIndexFile && (
            <button
              onClick={() => onIndexFile(file)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              title="Re-index document"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onRename(file)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Rename file"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(file)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete file"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
