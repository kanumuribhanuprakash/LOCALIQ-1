export type SupportedFileType = 'pdf' | 'doc' | 'docx' | 'txt' | 'md' | 'png' | 'jpg' | 'jpeg' | 'webp' | 'mp3' | 'wav' | 'm4a';

export type FileCategory = 'document' | 'image' | 'audio';

export type ProcessingStatus =
  | 'Uploading'
  | 'Processing'
  | 'Extracting'
  | 'Text Extracted'
  | 'Partially Extracted'
  | 'Partially Indexed'
  | 'OCR Processing'
  | 'OCR Failed'
  | 'Unsupported Image Format'
  | 'No Text Detected'
  | 'Ready'
  | 'Transcribing'
  | 'Chunking'
  | 'Ready for Embedding'
  | 'Embedding'
  | 'Ready for Indexing'
  | 'Embedding Failed'
  | 'Indexing'
  | 'Indexed'
  | 'Extraction Failed'
  | 'Chunking Failed'
  | 'Indexing Failed'
  | 'Unsupported Format'
  | 'Processed'
  | 'Failed'
  | 'OCR Required'
  | 'Requires OCR'
  | 'Ready to Process';

export interface PageDiagnostic {
  pageNumber: number;
  status: 'SUCCESS' | 'NO_TEXT' | 'FAILED';
  characterCount: number;
  textItemCount: number;
  hasImages?: boolean;
  ocrRequired?: boolean;
  extractionMethod?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio';
  ocrConfidence?: number;
  diagnosticNote?: string;
  error?: string;
  errorType?: string;
  pdfjsError?: string;
  stackTrace?: string;
  pdfjsTextChars?: number;
  ocrChars?: number;
  chunksCount?: number;
}

export interface PdfDiagnosticData {
  fileName: string;
  fileSize: number;
  pdfjsVersion: string;
  pageCount: number;
  currentPage?: number;
  extractablePagesCount: number;
  ocrRequiredPagesCount: number;
  failedPagesCount: number;
  textPagesCount?: number;
  ocrPagesCount?: number;
  textCharacters?: number;
  ocrCharacters?: number;
  totalTextItems: number;
  totalCharacters: number;
  durationMs: number;
  chunkCount: number;
  embeddingCount: number;
  vectorCount: number;
  pageDiagnostics: PageDiagnostic[];
  pages?: Array<{
    pageNumber: number;
    status: 'SUCCESS' | 'NO_TEXT' | 'FAILED';
    characterCount: number;
    textItemCount: number;
    hasImages?: boolean;
    ocrRequired?: boolean;
    extractionMethod?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio';
    ocrConfidence?: number;
    diagnosticNote?: string;
    errorMessage?: string;
    pdfjsTextChars?: number;
    ocrChars?: number;
  }>;
  isEncrypted?: boolean;
  errorStage?:
    | 'validation'
    | 'pdfjs-load'
    | 'document-init'
    | 'page-iteration'
    | 'text-extraction'
    | 'text-normalization'
    | 'chunking'
    | 'embedding'
    | 'indexeddb'
    | 'vector-indexing';
  errorType?: string;
  errorMessage?: string;
  pdfjsError?: string;
  errorStack?: string;
  stackTrace?: string;
}

export interface DocumentChunk {
  chunk_id: string;
  file_id: string;
  file_name: string;
  page_number: number | null;
  page_start?: number | null;
  page_end?: number | null;
  chunk_index: number;
  text: string;
  character_count?: number;
  location_label?: string; // Truthful provenance: "Page 2", "Section 1 / Paragraph 3", "Image OCR", "Transcript 00:15"
  file_type?: SupportedFileType;
  extraction_method?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
  ocr_confidence?: number;
  sourceType?: 'document_content' | 'application_metadata';
  metadata?: {
    isMetadataOnly?: boolean;
    excludedFromIndex?: boolean;
    [key: string]: any;
  };
}

export interface KnowledgeFile {
  id: string;
  name: string;
  originalName?: string;
  extension: SupportedFileType;
  category: FileCategory;
  sizeBytes: number;
  formattedSize: string;
  uploadDate: string;
  uploadTimestamp?: number;
  processingStatus: ProcessingStatus;
  indexedStatus: boolean;
  pagesOrDuration?: string;
  pagesCount?: number;
  sectionsCount?: number;
  textPagesCount?: number;
  ocrPagesCount?: number;
  textCharacters?: number;
  ocrCharacters?: number;
  charactersExtracted?: number;
  chunksCreated?: number;
  embeddingsCreated?: number;
  vectorsIndexed?: number;
  indexType?: string;
  embeddingModel?: string;
  vectorDimension?: number;
  chunks?: DocumentChunk[];
  extractedPages?: Array<{
    page_number: number | null;
    text: string;
    characters: number;
    character_count?: number;
    text_items_count?: number;
    text_item_count?: number;
    location_label?: string;
    extraction_method?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
    ocr_confidence?: number;
    pdfjs_text_chars?: number;
    ocr_chars?: number;
    ocr_required?: boolean;
    chunks_count?: number;
    status?: string;
    error?: string;
    error_type?: string;
  }>;
  extractedFullText?: string;
  extractionStatus?: string;
  extractionMethod?: string;
  provenanceLabel?: string;
  ocrConfidence?: number;
  transcriptText?: string;
  visualLimitationNotice?: string;
  textAvailable?: boolean;
  requiresOcr?: boolean;
  isScanned?: boolean;
  extractablePagesCount?: number;
  ocrRequiredPagesCount?: number;
  failedPagesCount?: number;
  totalTextItems?: number;
  pageDiagnostics?: PageDiagnostic[];
  pdfDiagnostic?: PdfDiagnosticData;
  pdfDiagnostics?: PdfDiagnosticData;
  processingDurationMs?: number;
  isPartiallyExtracted?: boolean;
  errorStage?: string;
  errorType?: string;
  pdfjsError?: string;
  stackTrace?: string;
  backendFileId?: string;
  errorMessage?: string;
  summary?: string;
  tags?: string[];
  localPath?: string;
  imagePreviewUrl?: string;
  imageDimensions?: { width: number; height: number };
}

export interface CitationSource {
  citationIndex?: number;
  fileId: string;
  fileName: string;
  fileType: SupportedFileType;
  location: string; // e.g. "Page 4, Section 2" or "02:15 timestamp"
  snippet: string;
  relevanceScore: number;
  pageNumber?: number;
  chunkIndex?: number;
  chunkId?: string;
  sourceType?: string;
  extractionMethod?: string;
  ocrConfidence?: number;
}

export interface SemanticEvidenceChunk {
  rank: number;
  score: number; // Final / hybrid score
  similarity_score: number;
  semanticScore?: number;
  lexicalScore?: number;
  hybridScore?: number;
  accepted?: boolean;
  acceptanceReason?: string;
  matchedTokens?: string[];
  matchedIdentifiers?: string[];
  chunkId: string;
  chunk_id: string;
  fileId: string;
  file_id: string;
  fileName: string;
  file_name: string;
  pageNumber: number;
  page_number: number;
  chunkIndex: number;
  chunk_index: number;
  text: string;
  location?: string;
  location_label?: string;
  fileType?: SupportedFileType;
  file_type?: SupportedFileType;
  extraction_method?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | string;
  extractionMethod?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | string;
  ocrConfidence?: number;
  sourceType?: string;
  isMetadataOnly?: boolean;
}

export interface SearchExecutionStats {
  indexedFiles: number;
  indexedVectors: number;
  returnedResults: number;
  topK: number;
  threshold: number;
  semanticWeight?: number;
  lexicalWeight?: number;
  embeddingModel: string;
  dimensions: number;
  executionTimeMs?: number;
}

export type LocalLLMStatus =
  | 'idle'
  | 'checking'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'cancelling'
  | 'error'
  | 'Not Loaded'
  | 'Loading Model'
  | 'Model Ready'
  | 'Complete'
  | 'Failed';

export interface LocalLLMInfo {
  status: LocalLLMStatus;
  modelName: string;
  modelId?: string;
  displayName?: string;
  provider?: string;
  progress: number;
  statusMessage: string;
  device: 'webgpu' | 'wasm' | 'cpu';
  backend?: string;
  error?: string | null;
  approximateSize?: string;
  contextLimit?: number;
  runtime?: string;
  tokensGenerated?: number;
  lastGenerationDurationMs?: number;
  verified?: boolean;
}

export interface VectorSearchScoreStats {
  topScore: number;
  secondScore: number;
  thirdScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
}

export interface VectorSearchDebugCandidate {
  rank: number;
  score: number;
  semanticScore?: number;
  lexicalScore?: number;
  hybridScore?: number;
  accepted?: boolean;
  acceptanceReason?: string;
  matchedTokens?: string[];
  matchedIdentifiers?: string[];
  chunkId: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  chunkIndex: number;
  textPreview: string;
  passedThreshold: boolean;
  extractionMethod?: string;
  ocrConfidence?: number;
  characterCount?: number;
  vectorNorm?: number;
  firstValues?: number[];
  fullText?: string;
}

export interface RAGDiagnostics {
  queryEmbeddingTimeMs: number;
  retrievalTimeMs: number;
  generationTimeMs: number;
  totalRagTimeMs: number;
  retrievedChunksCount: number;
  contextChars: number;
  llmModel: string;
  activeThreshold: number;
  queryDimensions: number;
  queryNorm?: number;
  candidatesEvaluated?: number;
  topCandidatesBeforeThreshold?: VectorSearchDebugCandidate[];
  chunksPassingThreshold?: number;
  scoreStats?: VectorSearchScoreStats;
  queryText?: string;
  queryFirstValues?: number[];
  contextChunksSent?: number;
  metadataExcludedCount?: number;
  semanticCandidatesCount?: number;
  lexicalCandidatesCount?: number;
  hybridAcceptedCount?: number;
  tokensGenerated?: number;
  backendUsed?: string;
  deviceUsed?: string;
  citationsValidatedCount?: number;
  invalidCitationsRemoved?: number;
  entailmentPassed?: boolean;
  entailmentViolations?: string[];
  safeFallbackUsed?: boolean;
  multipleChoiceEvaluated?: boolean;
  allOptionsUnsupported?: boolean;
  detectedIntent?: QueryIntentType;
  retrievalStrategy?: string;
  resolvedDocumentName?: string;
  resolvedPageNumber?: number;
  rewrittenQuery?: string;
  sectionsSelectedCount?: number;
  comparisonEntities?: string[];
  isAmbiguousReference?: boolean;
  ambiguousCandidates?: string[];
  retrievalScope?: string;
  scopedDocumentId?: string;
  scopedDocumentName?: string;
  scopedVectorsCount?: number;
  globalCandidatesCount?: number;
  finalGroundedSourcesCount?: number;
  extractedFunctionsCount?: number;
  extractedFunctionNames?: string[];
  validatedFunctionNames?: string[];
  llmUsed?: boolean;
  finalGroundingValidation?: 'PASS' | 'FAIL';
}

export interface ExtractedCodeFunction {
  name: string;
  signature: string;
  language: string;
  sourceChunkId: string;
  sourceFileId: string;
  section: string;
  page: number;
  evidence: string;
  programGroup?: string;
  description?: string;
  rank?: number;
}

export type QueryIntentType =
  | 'FACTUAL_POINT_QUERY'
  | 'DOCUMENT_OVERVIEW_QUERY'
  | 'DOCUMENT_SUMMARY_QUERY'
  | 'MAIN_CONCEPTS_QUERY'
  | 'PAGE_SPECIFIC_QUERY'
  | 'SOURCE_SCOPED_QUERY'
  | 'COMPARISON_QUERY'
  | 'MULTI_CONCEPT_QUERY'
  | 'FOLLOW_UP_QUERY'
  | 'CROSS_DOCUMENT_QUERY'
  | 'NEGATIVE_UNSUPPORTED_QUERY'
  | 'AMBIGUOUS_QUERY'
  | 'NORMAL_CONVERSATIONAL_QUERY'
  | 'CODE_FUNCTION_EXTRACTION_QUERY';

export interface DocumentOutlineSection {
  sectionId: string;
  heading: string;
  level: number;
  startPage: number;
  endPage: number;
  representativeChunkIds: string[];
  leadText: string;
}

export interface DocumentOutlineRecord {
  documentId: string;
  userId: string;
  fileName: string;
  fileType: SupportedFileType;
  title: string;
  pageCount: number;
  sections: DocumentOutlineSection[];
  headings: string[];
  pageDistribution: Record<number, number>;
  representativeChunkIds: string[];
  extractionMethod: string;
  timestamp: number;
  version: number;
}

export interface QueryIntentResult {
  intent: QueryIntentType;
  confidence: number;
  referencedFileId?: string;
  referencedFileName?: string;
  referencedPageNumber?: number;
  detectedEntities?: string[];
  rewrittenQuery?: string;
  requiresDocumentScope: boolean;
  requiresPageFilter: boolean;
  requiresMultiDocumentRetrieval: boolean;
  requiresDocumentOutline: boolean;
  isAmbiguousFileReference?: boolean;
  ambiguousFileCandidates?: string[];
  explanation: string;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: CitationSource[];
  evidenceChunks: SemanticEvidenceChunk[];
  retrievalCount: number;
  indexedFileCount: number;
  vectorCount: number;
  threshold: number;
  model: string;
  executionTime: number;
  searchExecutionTime: number;
  generationTime: number;
  confidence?: number;
  status: 'answered' | 'not_found' | 'no_index' | 'error';
  statusMessage: string;
  diagnostics: RAGDiagnostics;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: CitationSource[];
  evidenceChunks?: SemanticEvidenceChunk[];
  searchQuery?: string;
  searchStatus?: 'searching' | 'found' | 'not_found' | 'error';
  searchStepMessage?: string;
  searchStats?: SearchExecutionStats;
  searchDiagnostics?: {
    totalVectorsInDb: number;
    queryDimensions: number;
    queryNorm: number;
    candidatesEvaluated: number;
    topCandidatesBeforeThreshold: VectorSearchDebugCandidate[];
    activeThreshold: number;
    chunksPassingThreshold: number;
    scoreStats?: VectorSearchScoreStats;
    queryText?: string;
    queryFirstValues?: number[];
    queryEmbeddingTimeMs?: number;
  };
  ragDiagnostics?: RAGDiagnostics;
  ragAnswer?: string;
  llmModel?: string;
  generationDurationMs?: number;
  totalRagDurationMs?: number;
  isGrounded?: boolean;
  errorMessage?: string;
  isLocalOnly?: boolean;
  detectedIntent?: QueryIntentType;
  retrievalStrategy?: string;
  resolvedDocumentName?: string;
  resolvedPageNumber?: number;
}

export type ActivityType = 'upload' | 'processing' | 'query' | 'knowledge_update' | 'settings';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    query?: string;
    fileCount?: number;
    chunkCount?: number;
  };
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  workspaceName: string;
  role: string;
  joinedDate: string;
  avatarSeed?: string;
}

export interface VectorIndexStatusResponse {
  indexed_files: number;
  total_vectors: number;
  dimension: number;
  index_type: string;
  engine: string;
  status: 'ready' | 'empty' | 'uninitialized';
}

export type AppView = 'landing' | 'signin' | 'signup' | 'workspace';
export type WorkspaceTab = 'overview' | 'knowledge' | 'assistant' | 'video' | 'activity' | 'settings';

export interface WorkspaceSettings {
  workspace: {
    name: string;
    description?: string;
    vaultPath: string;
    autoIndexNewFiles: boolean;
    storageLimitGb: number;
    encryptionEnabled: boolean;
  };
  appearance: {
    theme: 'dark' | 'dimmed' | 'midnight';
    density: 'comfortable' | 'compact';
    codeFont: boolean;
    highContrastBorders: boolean;
  };
  privacy: {
    telemetry: boolean;
    localOnlyEnforcement: boolean;
    anonymizeMetadata: boolean;
    sessionAutoLockMinutes: number;
    storeQueryHistory: boolean;
  };
  localProcessing: {
    runtimeBackend: 'webgpu' | 'wasm' | 'onnx_web' | 'browser_local';
    backendUrl?: string;
    embeddingModel: string;
    inferenceModel: string;
    vectorDimension?: number;
    chunkSize: number;
    chunkOverlap: number;
    enableGpuAcceleration: boolean;
    searchTopK?: number;
    similarityThreshold?: number;
  };
  dataManagement: {
    vaultStorageUsedBytes: number;
    totalIndexEntries: number;
    lastBackupDate: string;
  };
}

export type { SemanticSearchResultItem } from './services/clientSemanticSearchService';
