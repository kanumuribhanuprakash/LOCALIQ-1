import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppView,
  WorkspaceTab,
  KnowledgeFile,
  ChatMessage,
  ActivityItem,
  UserProfile,
  WorkspaceSettings,
  SupportedFileType,
  SemanticEvidenceChunk,
  LocalLLMInfo,
  VectorIndexStatusResponse,
  DocumentChunk,
} from '../types';
import { defaultUserProfile, defaultSettings, samplePreloadedFiles } from '../data/initialData';
import { formatBytes, formatDate, getFileCategory } from '../utils/fileHelpers';
import { localEmbeddingService, ModelProgressInfo } from '../services/localEmbeddingService';
import { localEmbeddingStore } from '../services/localEmbeddingStore';
import { ClientChunkingService, ExtractedPageInput } from '../services/clientChunkingService';
import { ClientDocumentProcessingService } from '../services/clientDocumentProcessingService';
import {
  clientVectorIndexService,
  VectorIndexStats,
  IndexedVectorRecord,
  EXPECTED_DIMENSION,
} from '../services/clientVectorIndexService';
import { clientSemanticSearchService } from '../services/clientSemanticSearchService';
import { clientLocalLLMService } from '../services/clientLocalLLMService';
import { clientRAGService } from '../services/clientRAGService';
import {
  AuthResult,
  getActiveSession,
  clearActiveSession,
  findUserById,
  toUserProfile,
  registerLocalUser,
  authenticateLocalUser,
  getOrCreateDemoUser,
  performSafeDataMigration,
  getUserFilesKey,
  getUserChatKey,
  getUserActivityKey,
  getUserSettingsKey,
} from '../services/localAuthService';

import {
  clientBackupService,
  BackupExportResult,
  RestoreResult,
  DecryptedWorkspacePayload,
} from '../services/clientBackupService';

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  user: UserProfile | null;
  isAuthenticated: boolean;
  files: KnowledgeFile[];
  chatMessages: ChatMessage[];
  activityLogs: ActivityItem[];
  settings: WorkspaceSettings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lastSearchDebug: any | null;
  setLastSearchDebug: (debug: any | null) => void;
  
  // Local Vector Index status & statistics
  backendConnected: boolean;
  backendStatus: string;
  vectorIndexStatus: VectorIndexStatusResponse | null;
  localIndexStats: VectorIndexStats | null;
  refreshIndexStatus: () => Promise<void>;

  // Actions
  navigateToWorkspaceTab: (tab: WorkspaceTab) => void;
  handleSignIn: (email: string, password?: string) => Promise<AuthResult>;
  handleSignUp: (name: string, email: string, password?: string, confirmPassword?: string) => Promise<AuthResult>;
  handleSignOut: () => void;
  handleQuickDemoAccess: () => Promise<AuthResult>;
  addUploadedFiles: (fileList: FileList | File[]) => Promise<void>;
  addCustomFile: (file: KnowledgeFile) => void;
  removeFile: (fileId: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => void;
  processFileEmbedding: (fileId: string) => Promise<void>;
  indexFile: (fileId: string) => Promise<void>;
  embedQuery: (query: string) => Promise<number[]>;
  embeddingModelStatus: ModelProgressInfo;
  processFileSimulation: (fileId: string) => void;
  processAllFilesSimulation: () => void;
  loadSampleFiles: () => void;
  clearAllFiles: () => Promise<void>;
  isSearching: boolean;
  sendChatMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearChatHistory: () => void;
  localLLMInfo: LocalLLMInfo;
  loadLocalLLM: (modelId?: string) => Promise<void>;
  switchLocalLLM: (modelId: string) => Promise<void>;
  loadTestKnowledgeDocument: () => Promise<void>;
  loadMultimodalTestSuite: () => Promise<void>;
  updateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  logActivity: (type: ActivityItem['type'], title: string, description: string, metadata?: ActivityItem['metadata']) => void;
  saveVoiceTranscript: (transcriptText: string, durationSeconds?: number) => Promise<string>;
  createWorkspaceBackup: (password: string, onProgress?: (stage: string, percent: number) => void) => Promise<BackupExportResult>;
  restoreWorkspaceFromBackup: (payload: DecryptedWorkspacePayload, mode: 'replace' | 'merge', onProgress?: (stage: string, percent: number) => void) => Promise<RestoreResult>;
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session check on initial state load
  const initialSession = getActiveSession();
  const initialStoredUser = initialSession ? findUserById(initialSession.userId) : null;
  const initialUser: UserProfile | null = initialStoredUser ? toUserProfile(initialStoredUser) : null;

  const getInitialTab = (): WorkspaceTab => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const validTabs: WorkspaceTab[] = ['overview', 'knowledge', 'assistant', 'video', 'activity', 'settings'];
      if (validTabs.includes(hash as WorkspaceTab)) {
        return hash as WorkspaceTab;
      }
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab')?.toLowerCase();
      if (tabParam && validTabs.includes(tabParam as WorkspaceTab)) {
        return tabParam as WorkspaceTab;
      }
    }
    return 'overview';
  };

  const [currentView, setCurrentView] = useState<AppView>(initialUser ? 'workspace' : 'landing');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(getInitialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // User state
  const [user, setUser] = useState<UserProfile | null>(initialUser);

  // Files state (isolated per authenticated user)
  const [files, setFiles] = useState<KnowledgeFile[]>(() => {
    if (initialUser?.id) {
      const saved = localStorage.getItem(getUserFilesKey(initialUser.id));
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return []; }
      }
    }
    return [];
  });

  // Chat Messages state (isolated per authenticated user)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (initialUser?.id) {
      const saved = localStorage.getItem(getUserChatKey(initialUser.id));
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return []; }
      }
    }
    return [];
  });

  // Assistant Search state (Step 8 Semantic Search pipeline)
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [lastSearchDebug, setLastSearchDebug] = useState<any | null>(null);

  // Local LLM State (Step 9 Air-gapped on-device answer generation)
  const [localLLMInfo, setLocalLLMInfo] = useState<LocalLLMInfo>(() => clientLocalLLMService.getInfo());

  useEffect(() => {
    const unsubscribe = clientLocalLLMService.addStatusListener((info) => {
      setLocalLLMInfo(info);
    });
    return unsubscribe;
  }, []);

  // Activity Log state (isolated per authenticated user)
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>(() => {
    if (initialUser?.id) {
      const saved = localStorage.getItem(getUserActivityKey(initialUser.id));
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return []; }
      }
    }
    return [];
  });

  // Settings (isolated per authenticated user)
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    if (initialUser?.id) {
      const saved = localStorage.getItem(getUserSettingsKey(initialUser.id));
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return defaultSettings; }
      }
    }
    return defaultSettings;
  });

  // Run backward-compatible data migration on mount
  useEffect(() => {
    performSafeDataMigration();
  }, []);

  // Backend Health & Connectivity
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<string>('Local Browser Vector Engine (Air-Gapped)');
  const [vectorIndexStatus, setVectorIndexStatus] = useState<VectorIndexStatusResponse | null>(null);
  const [localIndexStats, setLocalIndexStats] = useState<VectorIndexStats | null>(null);
  const [embeddingModelStatus, setEmbeddingModelStatus] = useState<ModelProgressInfo>(() =>
    localEmbeddingService.getStatusInfo()
  );

  // Keep embedding model status synchronized
  useEffect(() => {
    const unsub = localEmbeddingService.onStatusChange((info) => {
      setEmbeddingModelStatus(info);
    });
    return unsub;
  }, []);

  const refreshIndexStatus = useCallback(async () => {
    const currentUserId = user?.id || 'demo-analyst-default';
    try {
      const stats = await clientVectorIndexService.getIndexStats(currentUserId);
      setLocalIndexStats(stats);
      setVectorIndexStatus({
        indexed_files: stats.totalFiles,
        total_vectors: stats.totalVectors,
        dimension: stats.dimensions,
        index_type: 'InnerProduct / Cosine',
        engine: 'BrowserVectorIndex (IndexedDB)',
        status: stats.status,
      });
    } catch {
      // Ignore when uninitialized
    }
  }, [user?.id]);

  useEffect(() => {
    refreshIndexStatus();
  }, [refreshIndexStatus]);

  // Persist files scoped to current user
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserFilesKey(user.id), JSON.stringify(files));
    }
  }, [files, user?.id]);

  // Persist chat scoped to current user
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserChatKey(user.id), JSON.stringify(chatMessages));
    }
  }, [chatMessages, user?.id]);

  // Persist activity scoped to current user
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserActivityKey(user.id), JSON.stringify(activityLogs));
    }
  }, [activityLogs, user?.id]);

  // Persist settings scoped to current user
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserSettingsKey(user.id), JSON.stringify(settings));
    }
  }, [settings, user?.id]);

  // Load isolated workspace data for a specific user ID
  const loadUserData = (userId: string) => {
    const filesRaw = localStorage.getItem(getUserFilesKey(userId));
    if (filesRaw) {
      try { setFiles(JSON.parse(filesRaw)); } catch { setFiles([]); }
    } else {
      setFiles([]);
    }

    const chatRaw = localStorage.getItem(getUserChatKey(userId));
    if (chatRaw) {
      try { setChatMessages(JSON.parse(chatRaw)); } catch { setChatMessages([]); }
    } else {
      setChatMessages([]);
    }

    const actRaw = localStorage.getItem(getUserActivityKey(userId));
    if (actRaw) {
      try { setActivityLogs(JSON.parse(actRaw)); } catch { setActivityLogs([]); }
    } else {
      setActivityLogs([]);
    }

    const settingsRaw = localStorage.getItem(getUserSettingsKey(userId));
    if (settingsRaw) {
      try {
        const parsed = JSON.parse(settingsRaw);
        setSettings(parsed);
        if (parsed?.localProcessing?.inferenceModel) {
          clientLocalLLMService.setActiveModel(parsed.localProcessing.inferenceModel);
        }
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      setSettings(defaultSettings);
      if (defaultSettings.localProcessing?.inferenceModel) {
        clientLocalLLMService.setActiveModel(defaultSettings.localProcessing.inferenceModel);
      }
    }
  };

  const logActivity = (type: ActivityItem['type'], title: string, description: string, metadata?: ActivityItem['metadata']) => {
    const newItem: ActivityItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      type,
      title,
      description,
      timestamp: formatDate(new Date()),
      metadata,
    };
    setActivityLogs(prev => [newItem, ...prev]);
  };

  // Protected navigation: prevent unauthenticated access to workspace
  const safeSetCurrentView = (view: AppView) => {
    if (view === 'workspace' && !user) {
      setCurrentView('signin');
      return;
    }
    setCurrentView(view);
  };

  const handleSetActiveTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        if (window.location.hash !== `#${tab}`) {
          window.history.replaceState(null, '', `#${tab}`);
        }
      } catch {
        // ignore history state error
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const validTabs: WorkspaceTab[] = ['overview', 'knowledge', 'assistant', 'video', 'activity', 'settings'];
      if (validTabs.includes(hash as WorkspaceTab)) {
        setActiveTab(hash as WorkspaceTab);
        if (user && currentView !== 'workspace') {
          setCurrentView('workspace');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, currentView]);

  const navigateToWorkspaceTab = (tab: WorkspaceTab) => {
    if (!user) {
      setCurrentView('signin');
      return;
    }
    handleSetActiveTab(tab);
    if (currentView !== 'workspace') {
      setCurrentView('workspace');
    }
  };

  const handleSignIn = async (email: string, password = ''): Promise<AuthResult> => {
    const result = await authenticateLocalUser(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      if (result.user.id) {
        loadUserData(result.user.id);
      }
      setCurrentView('workspace');
      setActiveTab('overview');
      logActivity('settings', 'Workspace Access Granted', `Authenticated as ${result.user.name} via Web Crypto local vault.`);
    }
    return result;
  };

  const handleSignUp = async (
    name: string,
    email: string,
    password = '',
    confirmPassword?: string
  ): Promise<AuthResult> => {
    const result = await registerLocalUser(name, email, password, confirmPassword);
    if (result.success && result.user) {
      setUser(result.user);
      if (result.user.id) {
        loadUserData(result.user.id);
      }
      setCurrentView('workspace');
      setActiveTab('overview');
      logActivity('settings', 'Local Workspace Initialized', `Created encrypted local storage space: ${result.user.workspaceName}.`);
    }
    return result;
  };

  const handleQuickDemoAccess = async (): Promise<AuthResult> => {
    const result = await getOrCreateDemoUser();
    if (result.success && result.user) {
      setUser(result.user);
      if (result.user.id) {
        loadUserData(result.user.id);
      }
      setCurrentView('workspace');
      setActiveTab('overview');
      logActivity('settings', 'Demo Enclave Accessed', `Loaded local demonstration workspace for ${result.user.name}.`);
    }
    return result;
  };

  const handleSignOut = () => {
    clearActiveSession();
    setUser(null);
    setFiles([]);
    setChatMessages([]);
    setActivityLogs([]);
    setSettings(defaultSettings);
    setCurrentView('landing');
    setActiveTab('overview');
  };

  const addUploadedFiles = async (fileList: FileList | File[]) => {
    const arrayFiles = Array.from(fileList);
    if (arrayFiles.length === 0) return;

    const now = Date.now();
    const newItems: KnowledgeFile[] = arrayFiles.map((f, idx) => {
      const extensionName = (f.name.split('.').pop() || 'pdf').toLowerCase() as SupportedFileType;
      const category = getFileCategory(extensionName);
      return {
        id: 'file-' + (now + idx) + '-' + Math.random().toString(36).substring(2, 6),
        name: f.name,
        originalName: f.name,
        extension: extensionName,
        category,
        sizeBytes: f.size,
        formattedSize: formatBytes(f.size),
        uploadDate: 'Uploaded Today',
        uploadTimestamp: now + idx,
        processingStatus: 'Uploading',
        indexedStatus: false,
        pagesOrDuration: category === 'document' ? 'Processing...' : category === 'image' ? 'Visual asset' : 'Audio recording',
        tags: [category.toUpperCase(), extensionName.toUpperCase()],
        imagePreviewUrl: category === 'image' ? URL.createObjectURL(f) : undefined,
        audioUrl: category === 'audio' ? URL.createObjectURL(f) : undefined,
      };
    });

    // 1. Immediately display files in UI with 'Uploading' status
    setFiles(prev => [...newItems, ...prev]);

    logActivity(
      'upload',
      `Uploaded ${newItems.length} Knowledge ${newItems.length === 1 ? 'Source' : 'Sources'}`,
      `Added ${newItems.map(f => f.name).join(', ')} to local workspace vault. Initiating extraction engine.`,
      { fileCount: newItems.length }
    );

    // 2. Process each file
    for (let i = 0; i < arrayFiles.length; i++) {
      const originalFile = arrayFiles[i];
      const fileRecord = newItems[i];
      setActiveDocumentId(fileRecord.id);
      const ext = (fileRecord.extension || '').toLowerCase();
      const isImage = fileRecord.category === 'image';
      const isAudio = fileRecord.category === 'audio';

      // Initial truthful status transition
      const initialStatus = isImage
        ? 'OCR Processing'
        : isAudio
        ? 'Transcribing'
        : ext === 'doc'
        ? 'Processing'
        : 'Extracting';

      const initialDurationLabel = isImage
        ? 'Initializing local on-device OCR engine...'
        : isAudio
        ? 'Inspecting local speech runtime...'
        : ext === 'pdf'
        ? 'Validating PDF & extracting text...'
        : ext === 'docx'
        ? 'Extracting DOCX headings & paragraphs...'
        : 'Extracting document text...';

      setFiles(prev =>
        prev.map(f =>
          f.id === fileRecord.id
            ? {
                ...f,
                processingStatus: initialStatus,
                pagesOrDuration: initialDurationLabel,
              }
            : f
        )
      );

      try {
        // Execute unified in-browser processing with zero cloud calls
        const result = await ClientDocumentProcessingService.processFile(originalFile, {
          fileId: fileRecord.id,
          chunkSize: settings.localProcessing.chunkSize || 500,
          chunkOverlap: settings.localProcessing.chunkOverlap || 50,
          onProgress: (p) => {
            setFiles(prev =>
              prev.map(f =>
                f.id === fileRecord.id
                  ? {
                      ...f,
                      processingStatus:
                        p.stage === 'ocr'
                          ? 'OCR Processing'
                          : p.stage === 'transcribing'
                          ? 'Transcribing'
                          : p.stage === 'chunking'
                          ? 'Chunking'
                          : p.stage === 'extracting'
                          ? 'Extracting'
                          : 'Processing',
                      pagesOrDuration: p.message,
                    }
                  : f
              )
            );
          },
        });

        // Case 1: Unsupported Format (e.g. DOC legacy binary Word 97-2003)
        if (result.extractionStatus === 'Unsupported Format') {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'Unsupported Format',
                    indexedStatus: false,
                    pagesCount: 0,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: result.errorMessage || 'Unsupported format in browser-only mode.',
                    pagesOrDuration: 'Unsupported format',
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `Format Unsupported: ${fileRecord.name}`,
            result.errorMessage || 'Format cannot be parsed in browser-only mode.',
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 1B: Unsupported Image Format
        if (result.extractionStatus === 'Unsupported Image Format') {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'Unsupported Image Format',
                    indexedStatus: false,
                    pagesCount: 0,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: result.errorMessage || 'Unsupported image format. LOCALIQ supports PNG, JPG, and JPEG for local OCR.',
                    pagesOrDuration: 'Unsupported image format',
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `Unsupported Image Format: ${fileRecord.name}`,
            result.errorMessage || 'LOCALIQ supports PNG, JPG, and JPEG images for local OCR.',
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 1C: OCR Failed
        if (result.extractionStatus === 'OCR Failed') {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'OCR Failed',
                    indexedStatus: false,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: result.errorMessage || 'Local on-device OCR recognition failed.',
                    pagesOrDuration: 'OCR Failed',
                    imageDimensions: result.metadata?.imageDimensions,
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `OCR Failed: ${fileRecord.name}`,
            result.errorMessage || 'Local OCR engine encountered an execution error.',
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 1D: No Meaningful Text Detected in Image
        if (result.extractionStatus === 'No Text Detected') {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'No Text Detected',
                    indexedStatus: false,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: result.errorMessage || 'No meaningful text detected.',
                    pagesOrDuration: 'No text detected',
                    ocrConfidence: result.metadata?.ocrConfidence,
                    imageDimensions: result.metadata?.imageDimensions,
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `No Text Detected: ${fileRecord.name}`,
            'No meaningful text detected. The image does not contain readable typographic characters or text lines.',
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 2: Scanned / Image-only Document -> OCR Required (Rule 10)
        if (result.extractionStatus === 'OCR Required' || result.metadata?.requiresOcr) {
          const totalPages = result.metadata.pageCount || 1;
          const ocrMsg =
            result.errorMessage ||
            'No selectable text was found in this PDF. The document may be scanned or image-based. OCR is required.';

          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'OCR Required',
                    indexedStatus: false,
                    requiresOcr: true,
                    isScanned: true,
                    pagesCount: totalPages,
                    extractablePagesCount: result.metadata.extractablePagesCount ?? 0,
                    ocrRequiredPagesCount: result.metadata.ocrRequiredPagesCount ?? totalPages,
                    failedPagesCount: result.metadata.failedPagesCount ?? 0,
                    totalTextItems: result.metadata.totalTextItems ?? 0,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: ocrMsg,
                    pagesOrDuration: `${totalPages} pages · OCR Required`,
                    pdfDiagnostic: result.metadata.pdfDiagnostic,
                    pageDiagnostics: result.metadata.pageDiagnostics,
                    errorStage: result.errorStage,
                    errorType: result.errorType,
                    pdfjsError: result.pdfjsError,
                    stackTrace: result.stackTrace,
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `Scanned Document Detected: ${fileRecord.name}`,
            ocrMsg,
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 3: Fatal Extraction Failure (password protected, corrupt structure, etc.)
        if (result.extractionStatus === 'Failed') {
          const isAudioFail = isAudio || (result.errorMessage && result.errorMessage.includes('Audio transcription is unavailable'));
          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'Failed',
                    indexedStatus: false,
                    pagesCount: result.metadata.pageCount || 0,
                    charactersExtracted: 0,
                    chunksCreated: 0,
                    textAvailable: false,
                    errorMessage: result.errorMessage || 'Processing failed.',
                    errorStage: result.errorStage,
                    errorType: result.errorType,
                    pdfjsError: result.pdfjsError,
                    stackTrace: result.stackTrace,
                    pdfDiagnostic: result.metadata.pdfDiagnostic,
                    pageDiagnostics: result.metadata.pageDiagnostics,
                    pagesOrDuration: isAudioFail
                      ? 'Transcription unavailable'
                      : result.isEmpty
                      ? 'Empty document'
                      : result.errorMessage || 'Extraction failed',
                  }
                : f
            )
          );

          logActivity(
            'processing',
            `Processing Failed: ${fileRecord.name}`,
            result.errorMessage || 'Extraction error.',
            { fileName: fileRecord.name, fileType: ext }
          );
          continue;
        }

        // Case 4: Text Extracted Successfully (Full OR Partial)
        const isPartial = result.extractionStatus === 'Partially Extracted';
        const sectionCount = result.metadata.pageCount || result.sections.length || 1;
        const extractableCount = result.metadata.extractablePagesCount ?? sectionCount;
        const ocrRequiredCount = result.metadata.ocrRequiredPagesCount ?? 0;
        const failedCount = result.metadata.failedPagesCount ?? 0;
        const ocrPagesCount = result.metadata.ocrPagesCount ?? 0;
        const textPagesCount = result.metadata.textPagesCount ?? 0;
        const ocrChars = result.metadata.ocrCharacters ?? 0;
        const textChars = result.metadata.textCharacters ?? 0;
        const totalChars = result.totalCharacters;

        setFiles(prev =>
          prev.map(f => {
            if (f.id === fileRecord.id) {
              return {
                ...f,
                processingStatus: isPartial ? 'Partially Extracted' : 'Text Extracted',
                isPartiallyExtracted: isPartial,
                textAvailable: true,
                pagesCount: sectionCount,
                extractablePagesCount: extractableCount,
                ocrRequiredPagesCount: ocrRequiredCount,
                failedPagesCount: failedCount,
                ocrPagesCount,
                textPagesCount,
                ocrCharacters: ocrChars,
                textCharacters: textChars,
                totalTextItems: result.metadata.totalTextItems,
                sectionsCount: result.sections.length,
                charactersExtracted: totalChars,
                extractedPages: result.sections,
                extractedFullText: result.fullText,
                ocrConfidence: result.metadata.ocrConfidence,
                imageDimensions: result.metadata.imageDimensions,
                visualLimitationNotice: result.metadata.visualLimitationNotice,
                provenanceLabel: result.metadata.truthfulProvenanceType,
                pdfDiagnostic: result.metadata.pdfDiagnostic,
                pageDiagnostics: result.metadata.pageDiagnostics,
                errorMessage: result.errorMessage,
                errorStage: result.errorStage,
                errorType: result.errorType,
                pdfjsError: result.pdfjsError,
                stackTrace: result.stackTrace,
                pagesOrDuration:
                  result.fileType === 'pdf'
                    ? ocrPagesCount > 0
                      ? `${sectionCount} pages (${ocrPagesCount} OCR / ${textPagesCount} Text) · ${totalChars.toLocaleString()} chars`
                      : isPartial
                      ? `${extractableCount}/${sectionCount} pages extracted (${totalChars.toLocaleString()} chars)`
                      : `${sectionCount} ${sectionCount === 1 ? 'page' : 'pages'} · Extracted (${totalChars.toLocaleString()} chars)`
                    : result.category === 'image'
                    ? `OCR: ${totalChars.toLocaleString()} chars (${result.metadata.ocrConfidence || 0}% conf)`
                    : result.category === 'audio'
                    ? `${result.sections.length} ${result.sections.length === 1 ? 'segment' : 'segments'} · Transcribed (${totalChars.toLocaleString()} chars)`
                    : `${result.sections.length} sections · Extracted (${totalChars.toLocaleString()} chars)`,
              };
            }
            return f;
          })
        );

        logActivity(
          'processing',
          isPartial ? `Content Partially Extracted: ${fileRecord.name}` : `Content Extracted: ${fileRecord.name}`,
          isImage
            ? `Extracted ${totalChars.toLocaleString()} characters via local OCR (${result.metadata.ocrConfidence || 0}% confidence).`
            : isAudio
            ? `Transcribed ${totalChars.toLocaleString()} characters in ${result.sections.length} segments via local speech-to-text (Whisper).`
            : isPartial
            ? `Extracted ${extractableCount} of ${sectionCount} pages with ${totalChars.toLocaleString()} characters (${ocrRequiredCount} pages require OCR).`
            : `Extracted ${sectionCount} ${result.fileType === 'pdf' ? 'pages' : 'sections'} with ${totalChars.toLocaleString()} characters of text.`,
          { fileName: fileRecord.name, fileType: ext }
        );

        // Stage 3: Transition to Chunking
        await new Promise(r => setTimeout(r, 200));
        setFiles(prev =>
          prev.map(f =>
            f.id === fileRecord.id
              ? {
                  ...f,
                  processingStatus: 'Chunking',
                  pagesOrDuration: `Creating semantic chunks (${result.chunks.length} chunks)...`,
                }
              : f
          )
        );

        // Stage 4: Chunks Generated -> Ready for Embedding
        await new Promise(r => setTimeout(r, 200));
        setFiles(prev =>
          prev.map(f => {
            if (f.id === fileRecord.id) {
              return {
                ...f,
                processingStatus: 'Ready for Embedding',
                indexedStatus: false,
                pagesCount: sectionCount,
                sectionsCount: result.sections.length,
                charactersExtracted: totalChars,
                chunksCreated: result.chunks.length,
                embeddingsCreated: 0,
                vectorsIndexed: 0,
                chunks: result.chunks,
                pagesOrDuration:
                  result.fileType === 'pdf'
                    ? `${sectionCount} ${sectionCount === 1 ? 'page' : 'pages'} · ${result.chunks.length} chunks`
                    : `${result.chunks.length} chunks ready for embedding`,
                textAvailable: true,
                errorMessage: undefined,
              };
            }
            return f;
          })
        );

        logActivity(
          'processing',
          `Semantic Chunks Generated: ${fileRecord.name}`,
          `Created ${result.chunks.length} chunks with preserved sentence boundaries and honest ${result.metadata.truthfulProvenanceType.toLowerCase()} provenance. Ready for vector embedding.`,
          { fileName: fileRecord.name, fileType: ext }
        );

        // Stage 5 & 6: Real Local Neural Embedding Generation (sentence-transformers/all-MiniLM-L6-v2)
        if (result.chunks && result.chunks.length > 0) {
          await new Promise(r => setTimeout(r, 200));

          setFiles(prev =>
            prev.map(f =>
              f.id === fileRecord.id
                ? {
                    ...f,
                    processingStatus: 'Embedding',
                    pagesOrDuration: 'Generating 384-D neural embeddings (all-MiniLM-L6-v2)...',
                  }
                : f
            )
          );

          try {
            const currentUserId = user?.id || 'demo-analyst-default';
            const embeddings = await localEmbeddingService.embedChunks(
              currentUserId,
              { id: fileRecord.id, name: fileRecord.name },
              result.chunks,
              (prog) => {
                setFiles(prev =>
                  prev.map(f =>
                    f.id === fileRecord.id
                      ? {
                          ...f,
                          pagesOrDuration: prog.message,
                        }
                      : f
                  )
                );
              }
            );

            // Stage 6: Transition to Indexing
            setFiles(prev =>
              prev.map(f =>
                f.id === fileRecord.id
                  ? {
                      ...f,
                      processingStatus: 'Indexing',
                      pagesOrDuration: 'Indexing into LocalVectorIndex...',
                    }
                  : f
              )
            );

            const vectorRecords: Array<Omit<IndexedVectorRecord, 'userId'>> = embeddings.map((emb, idx) => {
              const chunk = result.chunks[idx];
              const isMetadataOnly = chunk?.sourceType === 'application_metadata' || chunk?.metadata?.isMetadataOnly === true;
              return {
                vectorId: `vec_${fileRecord.id}_${emb.chunk_id}`,
                embeddingId: emb.embedding_id,
                chunkId: emb.chunk_id,
                fileId: fileRecord.id,
                fileName: fileRecord.name,
                pageNumber: emb.page_number ?? null,
                chunkIndex: emb.chunk_index,
                dimensions: emb.dimensions || 384,
                vector: emb.vector,
                text: chunk?.text || '',
                model: emb.model || 'sentence-transformers/all-MiniLM-L6-v2',
                indexedAt: Date.now(),
                location: chunk?.location_label || (emb.page_number && emb.page_number > 0 ? `Page ${emb.page_number}` : `Section ${emb.chunk_index + 1}`),
                fileType: fileRecord.extension,
                extractionMethod: chunk?.extraction_method,
                ocrConfidence: chunk?.ocr_confidence,
                sourceType: chunk?.sourceType || 'document_content',
                isMetadataOnly,
              };
            });

            // Atomic File Replacement: replaces existing vectors for this fileId to prevent duplicates
            const indexedCount = await clientVectorIndexService.replaceFileVectors(
              currentUserId,
              fileRecord.id,
              vectorRecords
            );

            // Stage 7: Indexed (only after persistent vector insertion succeeds)
            setFiles(prev =>
              prev.map(f => {
                if (f.id === fileRecord.id) {
                  return {
                    ...f,
                    processingStatus: 'Indexed',
                    indexedStatus: true,
                    isPartiallyExtracted: isPartial,
                    extractablePagesCount: extractableCount,
                    ocrRequiredPagesCount: ocrRequiredCount,
                    failedPagesCount: failedCount,
                    ocrPagesCount,
                    textPagesCount,
                    ocrCharacters: ocrChars,
                    textCharacters: textChars,
                    totalTextItems: result.metadata.totalTextItems,
                    chunksCreated: result.chunks.length,
                    embeddingsCreated: embeddings.length,
                    vectorsIndexed: indexedCount,
                    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
                    vectorDimension: 384,
                    indexType: 'BrowserVectorIndex (InnerProduct)',
                    pagesOrDuration:
                      result.fileType === 'pdf'
                        ? ocrPagesCount > 0
                          ? `${sectionCount} pages (${ocrPagesCount} OCR / ${textPagesCount} Text) · ${indexedCount} vectors indexed`
                          : isPartial
                          ? `${extractableCount}/${sectionCount} pages indexed (${indexedCount} vectors) · ${ocrRequiredCount} require OCR`
                          : `${sectionCount} ${sectionCount === 1 ? 'page' : 'pages'} · ${indexedCount} vectors indexed`
                        : isImage
                        ? `Image OCR · ${indexedCount} vectors indexed`
                        : isAudio
                        ? `${result.sections.length} ${result.sections.length === 1 ? 'segment' : 'segments'} · ${indexedCount} vectors indexed`
                        : `${result.sections.length} sections · ${indexedCount} vectors indexed`,
                    errorMessage: undefined,
                  };
                }
                return f;
              })
            );

            await refreshIndexStatus();

            logActivity(
              'processing',
              `Knowledge Indexed: ${fileRecord.name}`,
              `Successfully indexed ${indexedCount} vectors into LocalVectorIndex (384-dim, unit L2-normalized). Format: ${ext.toUpperCase()}. Status: Indexed.`,
              { fileName: fileRecord.name, fileType: ext }
            );
          } catch (embErr: any) {
            const embErrMsg = embErr?.message || 'Local vector indexing failed';
            setFiles(prev =>
              prev.map(f =>
                f.id === fileRecord.id
                  ? {
                      ...f,
                      processingStatus: 'Indexing Failed',
                      indexedStatus: false,
                      errorMessage: embErrMsg,
                      pagesOrDuration: 'Indexing failed',
                    }
                  : f
              )
            );

            logActivity(
              'processing',
              `Indexing Failed: ${fileRecord.name}`,
              `Vector indexing error: ${embErrMsg}`,
              { fileName: fileRecord.name, fileType: ext }
            );
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Document processing failed';
        setFiles(prev =>
          prev.map(f => {
            if (f.id === fileRecord.id) {
              return {
                ...f,
                processingStatus: 'Failed',
                indexedStatus: false,
                errorMessage: errorMsg,
                textAvailable: false,
                pagesOrDuration: 'Processing failed',
              };
            }
            return f;
          })
        );

        logActivity(
          'processing',
          `Extraction Failed: ${fileRecord.name}`,
          `Extraction error: ${errorMsg}`,
          { fileName: fileRecord.name, fileType: ext }
        );
      }
    }
  };

  const addCustomFile = (file: KnowledgeFile) => {
    setFiles(prev => [file, ...prev]);
    logActivity('upload', `Added ${file.name}`, `Source file registered to local index.`);
  };

  const removeFile = async (fileId: string) => {
    const target = files.find(f => f.id === fileId);
    if (target?.imagePreviewUrl && target.imagePreviewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(target.imagePreviewUrl); } catch (_) {}
    }
    if (target?.audioUrl && target.audioUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(target.audioUrl); } catch (_) {}
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
    const currentUserId = user?.id || 'demo-analyst-default';
    try {
      await localEmbeddingStore.deleteEmbeddingsForFile(currentUserId, fileId);
      await clientVectorIndexService.removeFileVectors(currentUserId, fileId);
      await refreshIndexStatus();
    } catch (err) {
      console.error('Failed to remove vectors for deleted file:', err);
    }
    if (target) {
      logActivity('knowledge_update', `Removed File: ${target.name}`, `Deleted document, embeddings, and vector indices.`);
    }
  };

  const renameFile = (fileId: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;

    setFiles(prev =>
      prev.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            name: cleanName,
          };
        }
        return f;
      })
    );
    const target = files.find(f => f.id === fileId);
    if (target) {
      logActivity('knowledge_update', `Renamed File`, `Renamed "${target.name}" to "${cleanName}".`);
    }
  };

  /**
   * Real Local Embedding & Vector Indexing Pipeline:
   * 1. Extracts/Chunks text
   * 2. Generates 384-dimensional dense vectors using browser ONNX sentence-transformers/all-MiniLM-L6-v2
   * 3. Performs unit L2 normalization & stores in IndexedDB localEmbeddingStore
   * 4. Indexes vectors into LocalVectorIndex (BrowserVectorIndex) with duplicate prevention
   * 5. Transitions file to 'Indexed' only after persistence succeeds.
   */
  const processFileEmbedding = async (fileId: string) => {
    const target = files.find(f => f.id === fileId);
    if (!target) return;

    if (
      target.requiresOcr ||
      target.isScanned ||
      target.processingStatus === 'OCR Required' ||
      target.processingStatus === 'No Text Detected' ||
      target.processingStatus === 'Unsupported Image Format' ||
      target.processingStatus === 'OCR Failed'
    ) {
      logActivity(
        'processing',
        `Embedding Skipped: ${target.name}`,
        target.processingStatus === 'No Text Detected'
          ? 'Cannot embed image with no detectable text.'
          : target.processingStatus === 'Unsupported Image Format'
          ? 'Cannot embed unsupported image format.'
          : target.processingStatus === 'OCR Failed'
          ? 'Cannot embed image because OCR failed.'
          : 'Document is an image-only scan and requires Optical Character Recognition.'
      );
      return;
    }

    // Step 1: Ensure chunks exist for this file
    let fileChunks = target.chunks;
    if (!fileChunks || fileChunks.length === 0) {
      if (target.extractedPages && target.extractedPages.length > 0) {
        fileChunks = ClientChunkingService.chunkDocumentPages(
          target.id,
          target.name,
          target.extractedPages,
          {
            chunkSize: settings.localProcessing.chunkSize,
            chunkOverlap: settings.localProcessing.chunkOverlap,
          }
        );
      } else {
        const textToChunk = target.extractedFullText || target.summary || `Document ${target.name} registered in local knowledge base vault.`;
        const isAppMetadataOnly = !target.extractedFullText && !target.summary;
        fileChunks = ClientChunkingService.splitTextIntoChunks(
          textToChunk,
          fileId,
          target.name,
          1,
          0,
          settings.localProcessing.chunkSize,
          settings.localProcessing.chunkOverlap,
          target.extractedPages?.[0]?.extraction_method || 'txt',
          isAppMetadataOnly ? 'Application Metadata' : undefined,
          isAppMetadataOnly ? 'application_metadata' : 'document_content'
        );
      }
    }

    // Step 2: Transition to Embedding stage
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              chunks: fileChunks,
              chunksCreated: fileChunks.length,
              processingStatus: 'Embedding',
              pagesOrDuration: 'Generating 384-dim neural embeddings...',
            }
          : f
      )
    );

    try {
      const currentUserId = user?.id || 'demo-analyst-default';
      const embeddings = await localEmbeddingService.embedChunks(
        currentUserId,
        { id: target.id, name: target.name },
        fileChunks,
        (prog) => {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileId
                ? {
                    ...f,
                    pagesOrDuration: prog.message,
                  }
                : f
            )
          );
        }
      );

      // Step 3: Transition to Indexing stage
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                processingStatus: 'Indexing',
                indexedStatus: false,
                pagesOrDuration: 'Indexing into BrowserVectorIndex...',
              }
            : f
        )
      );

      // Step 4: Prepare vector records with preserved provenance
      const vectorRecords: Array<Omit<IndexedVectorRecord, 'userId'>> = embeddings.map((emb, idx) => {
        const chunk = fileChunks?.find(c => c.chunk_id === emb.chunk_id) || fileChunks?.[idx];
        const isMetadataOnly = chunk?.sourceType === 'application_metadata' || chunk?.metadata?.isMetadataOnly === true;
        return {
          vectorId: `vec_${target.id}_${emb.chunk_id}`,
          embeddingId: emb.embedding_id,
          chunkId: emb.chunk_id,
          fileId: target.id,
          fileName: target.name,
          pageNumber: emb.page_number ?? null,
          chunkIndex: emb.chunk_index,
          dimensions: emb.dimensions || 384,
          vector: emb.vector,
          text: chunk?.text || '',
          model: emb.model || 'sentence-transformers/all-MiniLM-L6-v2',
          indexedAt: Date.now(),
          location: chunk?.location_label || (emb.page_number && emb.page_number > 0 ? `Page ${emb.page_number}` : `Section ${emb.chunk_index + 1}`),
          fileType: target.extension,
          extractionMethod: chunk?.extraction_method,
          ocrConfidence: chunk?.ocr_confidence,
          sourceType: chunk?.sourceType || 'document_content',
          isMetadataOnly,
        };
      });

      // Step 5: Atomic insertion (removes previous vectors for this file first to prevent duplicates)
      const indexedCount = await clientVectorIndexService.replaceFileVectors(
        currentUserId,
        target.id,
        vectorRecords
      );

      // Step 6: Transition to Indexed ONLY after successful persistence
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                processingStatus: 'Indexed',
                indexedStatus: true,
                chunksCreated: fileChunks.length,
                embeddingsCreated: embeddings.length,
                vectorsIndexed: indexedCount,
                embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
                vectorDimension: 384,
                indexType: 'BrowserVectorIndex (InnerProduct)',
                pagesOrDuration: `${target.pagesCount || 1} ${target.pagesCount === 1 ? 'page' : 'pages'} · ${indexedCount} vectors indexed (384-dim)`,
                errorMessage: undefined,
              }
            : f
        )
      );

      await refreshIndexStatus();

      logActivity(
        'processing',
        `Document Indexed: ${target.name}`,
        `Successfully indexed ${indexedCount} vectors into LocalVectorIndex (384-dim, unit L2-normalized). Status: Indexed.`,
        { fileName: target.name, fileType: target.extension || target.category }
      );
    } catch (embErr: any) {
      const embErrMsg = embErr?.message || 'Local embedding or indexing failed';
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                processingStatus: 'Indexing Failed',
                indexedStatus: false,
                errorMessage: embErrMsg,
                pagesOrDuration: 'Indexing failed',
              }
            : f
        )
      );

      logActivity(
        'processing',
        `Indexing Failed: ${target.name}`,
        `Vector indexing error: ${embErrMsg}`,
        { fileName: target.name, fileType: target.extension || target.category }
      );
    }
  };

  const indexFile = async (fileId: string) => {
    await processFileEmbedding(fileId);
  };

  const processFileSimulation = (fileId: string) => {
    processFileEmbedding(fileId);
  };

  const processAllFilesSimulation = async () => {
    const unIndexed = files.filter(
      f => f.processingStatus !== 'Indexed' && f.processingStatus !== 'OCR Required' && f.processingStatus !== 'Failed'
    );
    for (const f of unIndexed) {
      await processFileEmbedding(f.id);
    }
  };

  const embedQuery = useCallback(async (query: string): Promise<number[]> => {
    return await localEmbeddingService.embedQuery(query);
  }, []);

  const loadSampleFiles = () => {
    setFiles(samplePreloadedFiles);
    logActivity('knowledge_update', 'Loaded 4 Sample Multimodal Documents', 'Populated sample documents, schematics, and audio logs for demonstration.');
  };

  const clearAllFiles = async () => {
    setFiles([]);
    const currentUserId = user?.id || 'demo-analyst-default';
    try {
      await localEmbeddingStore.clearUserEmbeddings(currentUserId);
      await clientVectorIndexService.clearUserIndex(currentUserId);
      await refreshIndexStatus();
    } catch (err) {
      console.error('Failed to clear user index:', err);
    }
    logActivity('knowledge_update', 'Vault Emptied', 'Removed all knowledge files and vector indices from workspace.');
  };

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    clientLocalLLMService.cancelGeneration();
    setIsSearching(false);
  }, []);

  const sendChatMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: formatDate(new Date()),
    };

    setChatMessages(prev => [...prev, userMessage]);
    logActivity('query', 'Semantic Search Query', `Question: "${trimmed.slice(0, 45)}${trimmed.length > 45 ? '...' : ''}"`, { query: trimmed });

    const currentUserId = user?.id || 'demo-analyst-default';
    const indexStats = await clientVectorIndexService.getIndexStats(currentUserId);

    // Requirement 10: NO INDEXED DATA check
    // If there are no indexed documents: 'No indexed knowledge available. Process and index a document first.'
    if (files.length === 0 || indexStats.totalVectors === 0) {
      const emptyKnowledgeMessage: ChatMessage = {
        id: 'msg-resp-' + Date.now(),
        role: 'assistant',
        content: 'No indexed knowledge available. Process and index a document first.',
        searchStatus: 'not_found',
        searchQuery: trimmed,
        evidenceChunks: [],
        timestamp: formatDate(new Date()),
        isLocalOnly: true,
      };
      setChatMessages(prev => [...prev, emptyKnowledgeMessage]);
      return;
    }

    setIsSearching(true);

    const searchingId = 'msg-rag-' + Date.now();
    const searchingMessage: ChatMessage = {
      id: searchingId,
      role: 'assistant',
      content: 'Querying local knowledge & synthesizing grounded answer...',
      searchQuery: trimmed,
      searchStatus: 'searching',
      searchStepMessage: 'Embedding Query (384-D)',
      timestamp: formatDate(new Date()),
      isLocalOnly: true,
    };
    setChatMessages(prev => [...prev, searchingMessage]);

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    try {
      const ragResult = await clientRAGService.answerQuestion(
        currentUserId,
        trimmed,
        {
          topK: settings.localProcessing.searchTopK ?? 5,
          threshold: settings.localProcessing.similarityThreshold ?? 0.35,
          abortSignal: abortController.signal,
          availableFiles: files,
          conversationHistory: chatMessages,
          selectedFileId: activeDocumentId || undefined,
          onProgress: (stage) => {
            let stepLabel = 'Embedding Query';
            if (stage === 'searching_index') {
              stepLabel = 'Searching Local Vector Index';
            } else if (stage === 'ranking_results') {
              stepLabel = 'Ranking Retrieved Chunks';
            } else if (stage === 'preparing_context') {
              stepLabel = 'Formatting Grounded Context';
            } else if (stage === 'loading_model') {
              stepLabel = 'Loading Local Instruct Model';
            } else if (stage === 'generating_answer') {
              stepLabel = 'Synthesizing Grounded Answer';
            }
            setChatMessages(prev =>
              prev.map(msg => (msg.id === searchingId ? { ...msg, searchStepMessage: stepLabel } : msg))
            );
          },
          onToken: (_token, accumulated) => {
            setChatMessages(prev =>
              prev.map(msg => {
                if (msg.id !== searchingId) return msg;
                return {
                  ...msg,
                  content: accumulated,
                  ragAnswer: accumulated,
                  searchStatus: 'searching',
                  searchStepMessage: 'Generating on-device...',
                };
              })
            );
          },
        }
      );

      if (ragResult.status === 'no_index') {
        setChatMessages(prev =>
          prev.map(msg => {
            if (msg.id !== searchingId) return msg;
            return {
              ...msg,
              content: ragResult.answer,
              ragAnswer: ragResult.answer,
              searchStatus: 'not_found',
              searchStepMessage: 'No Indexed Documents',
              evidenceChunks: [],
              citations: [],
              totalRagDurationMs: ragResult.executionTime,
            };
          })
        );
        return;
      }

      if (ragResult.status === 'not_found' || ragResult.evidenceChunks.length === 0) {
        setChatMessages(prev =>
          prev.map(msg => {
            if (msg.id !== searchingId) return msg;
            return {
              ...msg,
              content: ragResult.answer,
              ragAnswer: ragResult.answer,
              searchStatus: 'not_found',
              searchStepMessage: 'No Relevant Results',
              evidenceChunks: [],
              citations: [],
              searchStats: {
                indexedFiles: ragResult.indexedFileCount,
                indexedVectors: ragResult.vectorCount,
                returnedResults: 0,
                threshold: ragResult.threshold,
                executionTimeMs: ragResult.searchExecutionTime,
                dimensions: 384,
              },
              ragDiagnostics: ragResult.diagnostics,
              searchDiagnostics: {
                totalVectorsInDb: ragResult.vectorCount,
                queryDimensions: ragResult.diagnostics.queryDimensions,
                queryNorm: ragResult.diagnostics.queryNorm || 1.0,
                candidatesEvaluated: ragResult.diagnostics.candidatesEvaluated || ragResult.vectorCount,
                topCandidatesBeforeThreshold: ragResult.diagnostics.topCandidatesBeforeThreshold || [],
                activeThreshold: ragResult.diagnostics.activeThreshold,
                chunksPassingThreshold: ragResult.diagnostics.chunksPassingThreshold || 0,
                scoreStats: ragResult.diagnostics.scoreStats,
                queryText: ragResult.diagnostics.queryText || trimmed,
                queryFirstValues: ragResult.diagnostics.queryFirstValues,
                queryEmbeddingTimeMs: ragResult.diagnostics.queryEmbeddingTimeMs,
              },
              totalRagDurationMs: ragResult.executionTime,
              detectedIntent: ragResult.diagnostics.detectedIntent,
              retrievalStrategy: ragResult.diagnostics.retrievalStrategy,
              resolvedDocumentName: ragResult.diagnostics.resolvedDocumentName,
              resolvedPageNumber: ragResult.diagnostics.resolvedPageNumber,
            };
          })
        );
        return;
      }

      // Step 8 & 9: Successful Grounded Answer with Provenance
      setChatMessages(prev =>
        prev.map(msg => {
          if (msg.id !== searchingId) return msg;
          return {
            ...msg,
            content: ragResult.answer,
            ragAnswer: ragResult.answer,
            searchStatus: 'found',
            searchStepMessage: 'Answer Generated',
            evidenceChunks: ragResult.evidenceChunks,
            citations: ragResult.citations,
            llmModel: ragResult.model,
            generationDurationMs: ragResult.generationTime,
            totalRagDurationMs: ragResult.executionTime,
            isGrounded: true,
            detectedIntent: ragResult.diagnostics.detectedIntent,
            retrievalStrategy: ragResult.diagnostics.retrievalStrategy,
            resolvedDocumentName: ragResult.diagnostics.resolvedDocumentName,
            resolvedPageNumber: ragResult.diagnostics.resolvedPageNumber,
            searchStats: {
              indexedFiles: ragResult.indexedFileCount,
              indexedVectors: ragResult.vectorCount,
              returnedResults: ragResult.retrievalCount,
              threshold: ragResult.threshold,
              executionTimeMs: ragResult.searchExecutionTime,
              dimensions: 384,
            },
            ragDiagnostics: ragResult.diagnostics,
            searchDiagnostics: {
              totalVectorsInDb: ragResult.vectorCount,
              queryDimensions: ragResult.diagnostics.queryDimensions,
              queryNorm: ragResult.diagnostics.queryNorm || 1.0,
              candidatesEvaluated: ragResult.diagnostics.candidatesEvaluated || ragResult.vectorCount,
              topCandidatesBeforeThreshold: ragResult.diagnostics.topCandidatesBeforeThreshold || [],
              activeThreshold: ragResult.diagnostics.activeThreshold,
              chunksPassingThreshold: ragResult.diagnostics.chunksPassingThreshold || ragResult.retrievalCount,
              scoreStats: ragResult.diagnostics.scoreStats,
              queryText: ragResult.diagnostics.queryText || trimmed,
              queryFirstValues: ragResult.diagnostics.queryFirstValues,
              queryEmbeddingTimeMs: ragResult.diagnostics.queryEmbeddingTimeMs,
            },
          };
        })
      );

      logActivity(
        'query',
        'Local RAG Answer Generated',
        `Generated grounded answer for "${trimmed.slice(0, 40)}..." using ${ragResult.evidenceChunks.length} local chunks (${ragResult.executionTime}ms)`,
        { fileCount: ragResult.indexedFileCount, chunkCount: ragResult.retrievalCount }
      );
    } catch (err: any) {
      setChatMessages(prev =>
        prev.map(msg => {
          if (msg.id !== searchingId) return msg;
          return {
            ...msg,
            content: 'RAG Answer Generation Failed',
            searchStatus: 'error',
            searchStepMessage: 'Generation Failed',
            errorMessage: err?.message || 'Local RAG pipeline error',
            evidenceChunks: [],
          };
        })
      );
    } finally {
      activeAbortControllerRef.current = null;
      setIsSearching(false);
    }
  };

  const loadLocalLLM = async (modelId?: string) => {
    const target = modelId || settings.localProcessing.inferenceModel || 'HuggingFaceTB/SmolLM-135M-Instruct';
    await clientLocalLLMService.loadModel(target);
  };

  const switchLocalLLM = async (modelId: string) => {
    updateSettings({
      localProcessing: {
        ...settings.localProcessing,
        inferenceModel: modelId,
      },
    });
    await clientLocalLLMService.switchModel(modelId);
    logActivity('settings', 'Local LLM Model Switched', `Active model set to ${modelId}.`);
  };

  const loadTestKnowledgeDocument = async () => {
    try {
      const response = await fetch('/LOCALIQ_Test_Knowledge_Document.pdf');
      if (!response.ok) {
        throw new Error('Failed to load test PDF from public assets');
      }
      const blob = await response.blob();
      const file = new File([blob], 'LOCALIQ_Test_Knowledge_Document.pdf', {
        type: 'application/pdf',
        lastModified: Date.now(),
      });
      await addUploadedFiles([file]);
    } catch (err: any) {
      console.error('Failed to load test document:', err);
      logActivity('upload', 'Test Document Load Error', err?.message || 'Failed to load test PDF');
    }
  };

  const loadMultimodalTestSuite = async () => {
    try {
      const testFilesToFetch = [
        { path: '/Sample_Candidate_Resume.txt', name: 'Sample_Candidate_Resume.txt', type: 'text/plain' },
        { path: '/Sample_Technical_Brief.docx', name: 'Sample_Technical_Brief.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { path: '/Sample_Receipt_OCR.jpg', name: 'Sample_Receipt_OCR.jpg', type: 'image/jpeg' },
        { path: '/LOCALIQ_Test_Knowledge_Document.pdf', name: 'LOCALIQ_Test_Knowledge_Document.pdf', type: 'application/pdf' },
        { path: '/Sample_Audio_LOCALIQ.wav', name: 'Sample_Audio_LOCALIQ.wav', type: 'audio/wav' },
      ];

      const loadedFiles: File[] = [];
      for (const item of testFilesToFetch) {
        try {
          const res = await fetch(item.path);
          if (res.ok) {
            const blob = await res.blob();
            loadedFiles.push(new File([blob], item.name, { type: item.type, lastModified: Date.now() }));
          }
        } catch (e) {
          console.warn(`Could not load test asset ${item.name}:`, e);
        }
      }

      if (loadedFiles.length > 0) {
        await addUploadedFiles(loadedFiles);
        logActivity('upload', 'Multimodal Test Suite Ingested', `Loaded ${loadedFiles.length} multimodal test files across TXT, DOCX, Image OCR, PDF, and Audio.`);
      }
    } catch (err: any) {
      console.error('Failed to load multimodal test suite:', err);
      logActivity('upload', 'Multimodal Test Error', err?.message || 'Failed to load test suite');
    }
  };

  const clearChatHistory = () => {
    setChatMessages([]);
  };

  const updateSettings = (newSettings: Partial<WorkspaceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    logActivity('settings', 'Settings Updated', 'Workspace configuration parameters updated.');
  };

  const saveVoiceTranscript = async (transcriptText: string, durationSeconds?: number): Promise<string> => {
    const trimmed = transcriptText.trim();
    if (!trimmed) throw new Error('Transcript content is empty.');

    const now = Date.now();
    const timestampFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/[:\s]/g, '-');
    const fileName = `Voice_Transcript_${timestampFormatted}.txt`;
    const fileId = `transcript-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const currentUserId = user?.id || 'demo-analyst-default';

    const blobSize = new Blob([trimmed]).size;
    const initialFile: KnowledgeFile = {
      id: fileId,
      name: fileName,
      originalName: fileName,
      extension: 'txt',
      category: 'document',
      sizeBytes: blobSize,
      formattedSize: formatBytes(blobSize),
      uploadDate: 'Recorded Today',
      uploadTimestamp: now,
      processingStatus: 'Embedding',
      indexedStatus: false,
      pagesOrDuration: durationSeconds ? `Voice Transcript (${Math.round(durationSeconds)}s)` : 'Voice Transcript',
      tags: ['VOICE', 'TRANSCRIPT', 'TXT'],
      textAvailable: true,
      charactersExtracted: trimmed.length,
      extractedFullText: trimmed,
      provenanceLabel: 'Voice Transcript',
    };

    setFiles(prev => [initialFile, ...prev]);

    try {
      // Chunk using ClientChunkingService
      const chunkingPages: ExtractedPageInput[] = [
        {
          page_number: 1,
          text: trimmed,
          characters: trimmed.length,
        },
      ];

      const rawChunks = ClientChunkingService.chunkDocumentPages(fileId, fileName, chunkingPages, {
        chunkSize: settings.localProcessing.chunkSize || 500,
        chunkOverlap: settings.localProcessing.chunkOverlap || 50,
      });

      const chunks: DocumentChunk[] = rawChunks.map((c) => ({
        ...c,
        page_number: undefined,
        location_label: 'Voice Transcript',
        file_type: 'txt' as const,
        extraction_method: 'local_microphone_speech_to_text',
        sourceType: 'document_content' as const,
      }));

      // Generate local neural embeddings
      const embeddings = await localEmbeddingService.embedChunks(
        currentUserId,
        { id: fileId, name: fileName },
        chunks
      );

      // Create vector records with required truthful metadata
      const vectorRecords: Array<Omit<IndexedVectorRecord, 'userId'>> = embeddings.map((emb, idx) => {
        const chunk = chunks[idx];
        return {
          vectorId: `vec_${fileId}_${emb.chunk_id}`,
          embeddingId: emb.embedding_id,
          chunkId: emb.chunk_id,
          fileId: fileId,
          fileName: fileName,
          pageNumber: null,
          chunkIndex: emb.chunk_index,
          dimensions: emb.dimensions || 384,
          vector: emb.vector,
          text: chunk?.text || '',
          model: emb.model || 'sentence-transformers/all-MiniLM-L6-v2',
          indexedAt: Date.now(),
          location: 'Voice Transcript',
          fileType: 'txt',
          extractionMethod: 'local_microphone_speech_to_text',
          sourceType: 'document_content',
          isMetadataOnly: false,
        };
      });

      const indexedCount = await clientVectorIndexService.replaceFileVectors(
        currentUserId,
        fileId,
        vectorRecords
      );

      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                processingStatus: 'Indexed',
                indexedStatus: true,
                chunksCreated: chunks.length,
                embeddingsCreated: embeddings.length,
                vectorsIndexed: indexedCount,
                pagesOrDuration: `${chunks.length} ${chunks.length === 1 ? 'chunk' : 'chunks'} · Indexed`,
              }
            : f
        )
      );

      logActivity(
        'upload',
        `Saved Voice Transcript to Knowledge Base`,
        `Indexed "${fileName}" (${chunks.length} chunks) via local on-device embeddings. Available for RAG assistant retrieval.`,
        { fileName, fileType: 'txt', chunkCount: chunks.length }
      );

      return fileId;
    } catch (err: any) {
      console.error('Failed to save voice transcript to knowledge base:', err);
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                processingStatus: 'Failed',
                indexedStatus: false,
                errorMessage: err?.message || 'Failed to index voice transcript.',
              }
            : f
        )
      );
      throw err;
    }
  };

  const createWorkspaceBackup = async (
    password: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<BackupExportResult> => {
    const currentUserId = user?.id || 'demo-analyst-default';
    const workspaceName = settings?.workspace?.name || user?.workspaceName || 'My Private Vault';
    const result = await clientBackupService.createEncryptedBackup({
      userId: currentUserId,
      workspaceName,
      password,
      files,
      chatMessages,
      activityLogs,
      settings,
      onProgress,
    });
    logActivity('settings', 'Encrypted Backup Created', `Exported encrypted workspace backup (${formatBytes(result.fileSize)}) protected by AES-GCM-256.`);
    return result;
  };

  const restoreWorkspaceFromBackup = async (
    payload: DecryptedWorkspacePayload,
    mode: 'replace' | 'merge',
    onProgress?: (stage: string, percent: number) => void
  ): Promise<RestoreResult> => {
    const currentUserId = user?.id || 'demo-analyst-default';
    const result = await clientBackupService.restoreWorkspace({
      currentUserId,
      payload,
      mode,
      currentFiles: files,
      currentChat: chatMessages,
      currentActivity: activityLogs,
      currentSettings: settings,
      onProgress,
    });

    // Immediately reflect restored collections in AppContext state
    setFiles(result.finalFiles);
    setChatMessages(result.finalChat);
    setActivityLogs(result.finalActivity);
    setSettings(result.finalSettings);

    if (result.finalSettings?.localProcessing?.inferenceModel) {
      clientLocalLLMService.setActiveModel(result.finalSettings.localProcessing.inferenceModel);
    }

    await refreshIndexStatus();

    logActivity(
      'settings',
      `Workspace Restored (${mode === 'replace' ? 'Replaced' : 'Merged'})`,
      `Restored ${result.restoredFilesCount} files and ${result.restoredVectorsCount} vector records from encrypted backup.`
    );

    return result;
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView: safeSetCurrentView,
        activeTab,
        setActiveTab: handleSetActiveTab,
        user,
        isAuthenticated: !!user,
        files,
        chatMessages,
        activityLogs,
        settings,
        searchQuery,
        setSearchQuery,
        lastSearchDebug,
        setLastSearchDebug,
        backendConnected,
        backendStatus,
        vectorIndexStatus,
        localIndexStats,
        refreshIndexStatus,
        navigateToWorkspaceTab,
        handleSignIn,
        handleSignUp,
        handleSignOut,
        handleQuickDemoAccess,
        addUploadedFiles,
        addCustomFile,
        removeFile,
        renameFile,
        processFileEmbedding,
        indexFile,
        embedQuery,
        embeddingModelStatus,
        processFileSimulation,
        processAllFilesSimulation,
        loadSampleFiles,
        clearAllFiles,
        isSearching,
        sendChatMessage,
        stopGeneration,
        clearChatHistory,
        localLLMInfo,
        loadLocalLLM,
        switchLocalLLM,
        loadTestKnowledgeDocument,
        loadMultimodalTestSuite,
        updateSettings,
        logActivity,
        saveVoiceTranscript,
        createWorkspaceBackup,
        restoreWorkspaceFromBackup,
        activeDocumentId,
        setActiveDocumentId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
