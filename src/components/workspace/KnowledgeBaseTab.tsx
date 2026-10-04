import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeFile, FileCategory } from '../../types';
import { validateUploadedFiles, FileValidationError } from '../../utils/fileHelpers';
import { KnowledgeUploadZone } from './knowledge/KnowledgeUploadZone';
import { KnowledgeToolbar, SortOption } from './knowledge/KnowledgeToolbar';
import { KnowledgeFileItem } from './knowledge/KnowledgeFileItem';
import { EmptyKnowledgeState } from './knowledge/EmptyKnowledgeState';
import { FileDetailsModal } from './knowledge/FileDetailsModal';
import { RenameFileModal } from './knowledge/RenameFileModal';
import { DeleteConfirmModal } from './knowledge/DeleteConfirmModal';
import { VectorDiagnosticsModal } from './VectorDiagnosticsModal';
import {
  UploadCloud,
  Sparkles,
  Database,
  Layers,
  FolderOpen,
  Search,
  Filter,
  Binary,
  Cpu,
} from 'lucide-react';

export const KnowledgeBaseTab: React.FC = () => {
  const {
    files,
    addUploadedFiles,
    removeFile,
    renameFile,
    loadSampleFiles,
    loadMultimodalTestSuite,
    processAllFilesSimulation,
    embeddingModelStatus,
    searchQuery,
    setSearchQuery,
    backendConnected,
    backendStatus,
    vectorIndexStatus,
    processFileEmbedding,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | FileCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);

  // Modals state
  const [detailsFile, setDetailsFile] = useState<KnowledgeFile | null>(null);
  const [renameTarget, setRenameTarget] = useState<KnowledgeFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeFile | null>(null);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processIncomingFiles = (incomingList: FileList | File[]) => {
    const { validFiles, errors } = validateUploadedFiles(incomingList);

    if (errors.length > 0) {
      setValidationErrors(prev => [...errors, ...prev]);
    }

    if (validFiles.length > 0) {
      addUploadedFiles(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Category and Indexing counts
  const categoryCounts = useMemo(() => {
    return {
      all: files.length,
      document: files.filter(f => f.category === 'document').length,
      image: files.filter(f => f.category === 'image').length,
      audio: files.filter(f => f.category === 'audio').length,
    };
  }, [files]);

  const indexedSourcesCount = useMemo(() => {
    return files.filter(f => f.processingStatus === 'Indexed' || f.indexedStatus).length;
  }, [files]);

  const totalChunksIndexed = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.chunksCreated || f.vectorsIndexed || 0), 0);
  }, [files]);

  // Filter & sort files
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = files.filter((file) => {
      const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        (file.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (file.extension || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.uploadTimestamp || 0;
        const timeB = b.uploadTimestamp || 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.uploadTimestamp || 0;
        const timeB = b.uploadTimestamp || 0;
        return timeA - timeB;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'size') {
        return b.sizeBytes - a.sizeBytes;
      }
      return 0;
    });
  }, [files, selectedCategory, searchQuery, sortBy]);

  return (
    <div id="knowledge-base-tab-root" className="space-y-8 max-w-7xl mx-auto">
      
      {/* Hidden File Input supporting all required formats */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a"
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-7 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl text-left">
        <div className="space-y-1.5">
          <div className="flex items-center flex-wrap gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
              Knowledge Base
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <span className="font-bold text-emerald-400">✓</span>
              <span>{indexedSourcesCount} Indexed</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>{totalChunksIndexed} Chunks</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{backendStatus}</span>
            </span>
            {vectorIndexStatus && vectorIndexStatus.total_vectors > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Database className="w-3 h-3 text-indigo-400" />
                <span>{vectorIndexStatus.total_vectors} Vectors Indexed</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-sans">
            Upload and manage your private documents, images, and audio files for on-device retrieval and vector indexing.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {files.some(f => f.processingStatus !== 'Indexed' && f.processingStatus !== 'OCR Required' && f.processingStatus !== 'Failed') && (
            <button
              onClick={() => processAllFilesSimulation()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all cursor-pointer shadow-sm font-mono"
              title="Process, embed, and index all un-indexed files into BrowserVectorIndex"
            >
              <Binary className="w-3.5 h-3.5 text-emerald-400" />
              <span>Process & Index All</span>
            </button>
          )}

          {files.length === 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={loadSampleFiles}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-cyan-300 bg-[#091522] hover:bg-[#0D1E30] border border-cyan-500/30 transition-all cursor-pointer font-mono"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load Sample Files</span>
              </button>
              <button
                onClick={() => loadMultimodalTestSuite()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer font-mono"
                title="Load real multimodal test files (PDF, DOCX, TXT, OCR)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Load Multimodal Suite</span>
              </button>
            </div>
          )}

          {/* Vector Index Inspector Button */}
          <button
            onClick={() => setIsVectorModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 bg-[#091522] hover:bg-[#0E2033] border border-cyan-500/30 transition-all cursor-pointer font-mono shadow-sm"
            title="Inspect all indexed vectors, embeddings, norms, and OCR text in IndexedDB"
          >
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspect Vectors</span>
          </button>

          {/* Primary Upload Button */}
          <button
            id="header-upload-knowledge-btn"
            onClick={openFilePicker}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Add Knowledge</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Area with validation & error feedback */}
      <KnowledgeUploadZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onBrowseClick={openFilePicker}
        validationErrors={validationErrors}
        onDismissError={(idx) => setValidationErrors(prev => prev.filter((_, i) => i !== idx))}
        onClearErrors={() => setValidationErrors([])}
      />

      {/* Main Content: Files List / Toolbar or Empty State */}
      {files.length === 0 ? (
        <EmptyKnowledgeState
          onUploadClick={openFilePicker}
          onLoadSampleClick={loadSampleFiles}
          onLoadMultimodalClick={loadMultimodalTestSuite}
        />
      ) : (
        <div className="space-y-4">
          
          {/* Toolbar with Search, Category Filter, Sorting, View Toggle */}
          <KnowledgeToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categoryCounts={categoryCounts}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* If search/filter produces zero results */}
          {filteredAndSortedFiles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#16191F]/40 border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0D0F14] border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-200">No matching files found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No uploaded knowledge items match &ldquo;{searchQuery}&rdquo; in the selected filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedFiles.map((file) => (
                <KnowledgeFileItem
                  key={file.id}
                  file={file}
                  viewMode="cards"
                  onViewDetails={(f) => setDetailsFile(f)}
                  onRename={(f) => setRenameTarget(f)}
                  onDelete={(f) => setDeleteTarget(f)}
                  onIndexFile={(f) => processFileEmbedding(f.id)}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#08121D] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-500/10 bg-[#050C14] text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                      <th className="py-3.5 px-5 font-semibold">File & Knowledge Info</th>
                      <th className="py-3.5 px-5 font-semibold hidden md:table-cell">Category</th>
                      <th className="py-3.5 px-5 font-semibold hidden sm:table-cell">Size</th>
                      <th className="py-3.5 px-5 font-semibold hidden lg:table-cell">Upload Date</th>
                      <th className="py-3.5 px-5 font-semibold">Status</th>
                      <th className="py-3.5 px-5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredAndSortedFiles.map((file) => (
                      <KnowledgeFileItem
                        key={file.id}
                        file={file}
                        viewMode="table"
                        onViewDetails={(f) => setDetailsFile(f)}
                        onRename={(f) => setRenameTarget(f)}
                        onDelete={(f) => setDeleteTarget(f)}
                        onIndexFile={(f) => processFileEmbedding(f.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* View Details Modal */}
      <FileDetailsModal
        file={detailsFile}
        onClose={() => setDetailsFile(null)}
        onRename={(f) => setRenameTarget(f)}
        onDelete={(f) => setDeleteTarget(f)}
      />

      {/* Rename File Modal */}
      <RenameFileModal
        file={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={(fileId, newName) => renameFile(fileId, newName)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        file={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(fileId) => removeFile(fileId)}
      />

      {/* Vector Index & OCR Data Diagnostics Modal */}
      <VectorDiagnosticsModal
        isOpen={isVectorModalOpen}
        onClose={() => setIsVectorModalOpen(false)}
      />

    </div>
  );
};
