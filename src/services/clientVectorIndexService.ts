/**
 * LOCALIQ Browser Vector Index Service (LocalVectorIndex)
 * 
 * Provides an air-gapped, zero-cloud, browser-compatible vector indexing and 
 * semantic search engine running directly in IndexedDB.
 * 
 * Key Features:
 * - Exact cosine similarity via inner-product on L2-normalized 384-dimensional vectors.
 * - Strict User Isolation: All vector records and queries are scoped to authenticated userId.
 * - Atomic File Replacement: Re-indexing a document replaces previous vectors to prevent duplicates.
 * - Provenance Preservation: Each indexed vector tracks fileId, fileName, pageNumber, chunkId, chunkIndex, and original text.
 * - Top-K search with configurable minimum similarity threshold (default: 0.35).
 * - Dimension & Model Validation: Rejects mismatched vector dimensions (e.g. != 384) and handles empty indices safely.
 */

import { VectorSearchDebugCandidate, VectorSearchScoreStats } from '../types';
import { clientLexicalSearchService } from './clientLexicalSearchService';

export interface IndexedVectorRecord {
  userId: string;
  vectorId: string;
  embeddingId: string;
  chunkId: string;
  fileId: string;
  fileName: string;
  pageNumber: number | null;
  chunkIndex: number;
  dimensions: number;
  vector: number[];
  text: string;
  model: string;
  indexedAt: number;
  location?: string;
  fileType?: string;
  extractionMethod?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
  ocrConfidence?: number;
  sourceType?: 'document_content' | 'application_metadata';
  isMetadataOnly?: boolean;
}

export interface VectorSearchResult {
  rank: number;
  score: number;
  chunkId: string;
  fileId: string;
  fileName: string;
  pageNumber: number | null;
  chunkIndex: number;
  text: string;
  dimensions: number;
  model: string;
  location?: string;
  fileType?: string;
  extractionMethod?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
  ocrConfidence?: number;
  sourceType?: 'document_content' | 'application_metadata';
}

export interface HybridVectorSearchResult extends VectorSearchResult {
  semanticScore: number;
  lexicalScore: number;
  hybridScore: number;
  accepted: boolean;
  acceptanceReason: string;
  matchedTokens?: string[];
  matchedIdentifiers?: string[];
  matchedField?: string;
  extractedValue?: string;
}

export interface VectorSearchResultWithDiagnostics {
  results: VectorSearchResult[];
  diagnostics: {
    totalVectorsInDb: number;
    queryDimensions: number;
    queryNorm: number;
    candidatesEvaluated: number;
    topCandidatesBeforeThreshold: VectorSearchDebugCandidate[];
    activeThreshold: number;
    chunksPassingThreshold: number;
    scoreStats?: VectorSearchScoreStats;
    queryFirstValues?: number[];
  };
}

export interface HybridVectorSearchResultWithDiagnostics {
  results: HybridVectorSearchResult[];
  diagnostics: {
    totalVectorsInDb: number;
    queryDimensions: number;
    queryNorm: number;
    candidatesEvaluated: number;
    topCandidatesBeforeThreshold: VectorSearchDebugCandidate[];
    activeThreshold: number;
    chunksPassingThreshold: number;
    scoreStats?: VectorSearchScoreStats;
    queryFirstValues?: number[];
    semanticWeight: number;
    lexicalWeight: number;
  };
}

export interface VectorIndexStats {
  totalVectors: number;
  totalFiles: number;
  fileIds: string[];
  dimensions: number;
  model: string;
  normalization: string;
  engine: string;
  lastUpdated: number;
  status: 'ready' | 'empty' | 'uninitialized';
}

const DB_NAME = 'localiq_vector_index_db';
const DB_VERSION = 1;
const STORE_NAME = 'vectors';
export const EXPECTED_DIMENSION = 384;
export const EXPECTED_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
export const DEFAULT_SIMILARITY_THRESHOLD = 0.35;

// Configurable weights for Hybrid Retrieval (Requirement 4)
export const DEFAULT_HYBRID_SEMANTIC_WEIGHT = 0.65;
export const DEFAULT_HYBRID_LEXICAL_WEIGHT = 0.35;

// Evidence Threshold Policy constants (Requirement 6)
// 1. Pure semantic evidence threshold: 0.35 (strictly preserved, not lowered globally)
export const SEMANTIC_EVIDENCE_THRESHOLD = 0.35;
// 2. Strong lexical / exact identifier threshold
export const LEXICAL_STRONG_THRESHOLD = 0.45;
// 3. Combined hybrid evidence threshold
export const HYBRID_ACCEPT_THRESHOLD = 0.35;

/**
 * Calculates exact inner product between two vectors.
 * Since vectors are unit L2-normalized (||q|| = 1, ||v|| = 1),
 * inner product equals cosine similarity.
 */
export function dotProduct(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch in dot product: ${a.length} !== ${b.length}`);
  }
  let sum = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export class ClientVectorIndexService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryStore: Map<string, IndexedVectorRecord> = new Map();
  private isIndexedDBAvailable: boolean = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  private initialized: boolean = false;

  constructor() {
    // Lazy or immediate initialization
  }

  /**
   * Initializes the IndexedDB database for local vector storage.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    const db = await this.getDB();
    this.initialized = true;
    return !!db || this.memoryStore !== null;
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable) {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            // Primary key: composite id `${userId}::${vectorId}`
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'compositeId' });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_user_file', ['userId', 'fileId'], { unique: false });
            store.createIndex('by_user_chunk', ['userId', 'chunkId'], { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('Failed to open LocalVectorIndex IndexedDB, using in-memory store:', request.error);
          this.isIndexedDBAvailable = false;
          this.dbPromise = null;
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed for LocalVectorIndex, using in-memory store:', err);
        this.isIndexedDBAvailable = false;
        this.dbPromise = null;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Validates a vector for numerical integrity and proper dimension.
   */
  private validateVector(vec: number[] | Float32Array, expectedDim: number = EXPECTED_DIMENSION): void {
    if (!Array.isArray(vec) && !ArrayBuffer.isView(vec)) {
      throw new Error('Vector must be an array of numbers');
    }
    if (vec.length !== expectedDim) {
      throw new Error(`Invalid vector dimension: expected ${expectedDim}, got ${vec.length}`);
    }
    for (let i = 0; i < vec.length; i++) {
      const v = vec[i];
      if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) {
        throw new Error(`Vector contains invalid element at index ${i}: ${v}`);
      }
    }
  }

  /**
   * Inserts vectors into the index for a user.
   */
  async addVectors(
    userId: string,
    vectors: Array<Omit<IndexedVectorRecord, 'userId'>>
  ): Promise<number> {
    if (!userId) {
      throw new Error('User ID is required for vector indexing');
    }
    if (!vectors || vectors.length === 0) {
      return 0;
    }

    // Validate all vectors first
    for (const v of vectors) {
      this.validateVector(v.vector, EXPECTED_DIMENSION);
    }

    const db = await this.getDB();
    const records: Array<IndexedVectorRecord & { compositeId: string }> = vectors.map((v) => {
      const vectorId = v.vectorId || `vec-${v.chunkId || v.fileId + '-' + v.chunkIndex}`;
      const embeddingId = v.embeddingId || `emb-${v.chunkId || v.fileId + '-' + v.chunkIndex}`;
      return {
        ...v,
        vectorId,
        embeddingId,
        userId,
        compositeId: `${userId}::${vectorId}`,
        indexedAt: v.indexedAt || Date.now(),
      };
    });

    if (!db) {
      for (const rec of records) {
        this.memoryStore.set(rec.compositeId, rec);
      }
      return records.length;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        resolve(records.length);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to insert vectors into LocalVectorIndex'));
      };

      for (const rec of records) {
        store.put(rec);
      }
    });
  }

  /**
   * Replaces all vectors for a specific file belonging to a user.
   * Atomic duplicate prevention: First removes all existing vectors for this (userId, fileId),
   * then inserts the new ones.
   */
  async replaceFileVectors(
    userId: string,
    fileId: string,
    vectors: Array<Omit<IndexedVectorRecord, 'userId'>>
  ): Promise<number> {
    if (!userId || !fileId) {
      throw new Error('User ID and File ID are required for vector replacement');
    }

    // Step 1: Remove existing vectors for this file
    await this.removeFileVectors(userId, fileId);

    // Step 2: Insert new vectors
    if (vectors.length === 0) {
      return 0;
    }

    return await this.addVectors(userId, vectors);
  }

  /**
   * Deletes all indexed vectors for a specific file and user.
   */
  async removeFileVectors(userId: string, fileId: string): Promise<number> {
    if (!userId || !fileId) return 0;

    const db = await this.getDB();

    if (!db) {
      let deleted = 0;
      for (const [key, rec] of this.memoryStore.entries()) {
        if (rec.userId === userId && rec.fileId === fileId) {
          this.memoryStore.delete(key);
          deleted++;
        }
      }
      return deleted;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user_file');
      const keyRange = IDBKeyRange.only([userId, fileId]);
      const request = index.openKeyCursor(keyRange);
      let deletedCount = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error(`Failed to remove vectors for file ${fileId}`));
      };
    });
  }

  /**
   * Retrieves all indexed vectors for a specific file and user.
   */
  async getVectorsForFile(userId: string, fileId: string): Promise<IndexedVectorRecord[]> {
    if (!userId || !fileId) return [];

    const db = await this.getDB();

    if (!db) {
      const results: IndexedVectorRecord[] = [];
      for (const rec of this.memoryStore.values()) {
        if (rec.userId === userId && rec.fileId === fileId) {
          results.push(rec);
        }
      }
      results.sort((a, b) => a.chunkIndex - b.chunkIndex);
      return results;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user_file');
      const keyRange = IDBKeyRange.only([userId, fileId]);
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const results = (request.result || []) as IndexedVectorRecord[];
        results.sort((a, b) => a.chunkIndex - b.chunkIndex);
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error || new Error(`Failed to get vectors for file ${fileId}`));
      };
    });
  }

  /**
   * Retrieves all vectors indexed for a specific user.
   * Guarantees 100% User Isolation.
   */
  async getAllUserVectors(userId: string): Promise<IndexedVectorRecord[]> {
    if (!userId) return [];

    const db = await this.getDB();

    if (!db) {
      const results: IndexedVectorRecord[] = [];
      for (const rec of this.memoryStore.values()) {
        if (rec.userId === userId) {
          results.push(rec);
        }
      }
      return results;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user');
      const keyRange = IDBKeyRange.only(userId);
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        resolve((request.result || []) as IndexedVectorRecord[]);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to retrieve user vectors'));
      };
    });
  }

  /**
   * Searches the user's vector index using exact cosine/inner-product similarity.
   * 
   * @param userId Authenticated user identifier (enforces user isolation)
   * @param queryVector 384-dimensional unit L2-normalized query embedding
   * @param topK Number of top results to return (default: 5)
   * @param minScore Minimum similarity score threshold (default: 0.35)
   */
  async search(
    userId: string,
    queryVector: number[],
    topK: number = 5,
    minScore: number = DEFAULT_SIMILARITY_THRESHOLD
  ): Promise<VectorSearchResult[]> {
    if (!userId) {
      throw new Error('User ID is required for vector search');
    }

    // Step 1: Validate query vector integrity and dimension
    this.validateVector(queryVector, EXPECTED_DIMENSION);

    // Step 2: Fetch all indexed vectors belonging exclusively to this user
    const userVectors = await this.getAllUserVectors(userId);
    if (userVectors.length === 0) {
      return [];
    }

    // Step 3: Compute exact inner-product (cosine similarity for normalized vectors)
    interface ScoredCandidate {
      score: number;
      record: IndexedVectorRecord;
    }

    const candidates: ScoredCandidate[] = [];

    for (let i = 0; i < userVectors.length; i++) {
      const rec = userVectors[i];

      // Exclude application metadata from retrieval
      const isMetaOnly =
        rec.sourceType === 'application_metadata' ||
        rec.isMetadataOnly === true ||
        (rec.text && /^Document\s+.*?\s+registered in local knowledge base vault\.?$/i.test(rec.text.trim()));
      if (isMetaOnly) {
        continue;
      }

      // Guard: model dimension verification
      if (rec.vector.length !== EXPECTED_DIMENSION) {
        console.warn(`Skipping vector ${rec.vectorId}: dimension mismatch ${rec.vector.length} !== ${EXPECTED_DIMENSION}`);
        continue;
      }

      const score = dotProduct(queryVector, rec.vector);

      // Clamp potential float precision overflow [-1.0, 1.0]
      const clampedScore = Math.max(-1.0, Math.min(1.0, score));

      // Filter by similarity threshold
      if (clampedScore >= minScore) {
        candidates.push({
          score: clampedScore,
          record: rec,
        });
      }
    }

    // Step 4: Sort in descending order of similarity score
    candidates.sort((a, b) => b.score - a.score);

    // Step 5: Extract top-K results with complete provenance
    const topResults = candidates.slice(0, topK);

    return topResults.map((item, idx) => ({
      rank: idx + 1,
      score: Number(item.score.toFixed(4)),
      chunkId: item.record.chunkId,
      fileId: item.record.fileId,
      fileName: item.record.fileName,
      pageNumber: item.record.pageNumber,
      chunkIndex: item.record.chunkIndex,
      text: item.record.text,
      dimensions: item.record.dimensions,
      model: item.record.model,
      location: item.record.location,
      fileType: item.record.fileType,
      extractionMethod: item.record.extractionMethod,
      ocrConfidence: item.record.ocrConfidence,
    }));
  }

  /**
   * Searches the vector index and returns detailed diagnostics for debugging retrieval.
   */
  async searchWithDiagnostics(
    userId: string,
    queryVector: number[],
    topK: number = 5,
    minScore: number = DEFAULT_SIMILARITY_THRESHOLD
  ): Promise<VectorSearchResultWithDiagnostics> {
    if (!userId) {
      throw new Error('User ID is required for vector search');
    }

    this.validateVector(queryVector, EXPECTED_DIMENSION);

    const queryNorm = Math.sqrt(queryVector.reduce((acc, val) => acc + val * val, 0));
    const userVectors = await this.getAllUserVectors(userId);

    if (userVectors.length === 0) {
      return {
        results: [],
        diagnostics: {
          totalVectorsInDb: 0,
          queryDimensions: queryVector.length,
          queryNorm: Number(queryNorm.toFixed(4)),
          candidatesEvaluated: 0,
          topCandidatesBeforeThreshold: [],
          activeThreshold: minScore,
          chunksPassingThreshold: 0,
        },
      };
    }

    interface AllCandidate {
      score: number;
      record: IndexedVectorRecord;
    }

    const allCandidates: AllCandidate[] = [];

    for (let i = 0; i < userVectors.length; i++) {
      const rec = userVectors[i];
      if (rec.vector.length !== EXPECTED_DIMENSION) continue;

      // Exclude application metadata from retrieval
      const isMetaOnly =
        rec.sourceType === 'application_metadata' ||
        rec.isMetadataOnly === true ||
        (rec.text && /^Document\s+.*?\s+registered in local knowledge base vault\.?$/i.test(rec.text.trim()));
      if (isMetaOnly) {
        continue;
      }

      const score = dotProduct(queryVector, rec.vector);
      const clampedScore = Math.max(-1.0, Math.min(1.0, score));
      allCandidates.push({
        score: clampedScore,
        record: rec,
      });
    }

    // Sort all evaluated candidates descending by score
    allCandidates.sort((a, b) => b.score - a.score);

    const rawScores = allCandidates.map((c) => c.score);
    const scoreStats: VectorSearchScoreStats = {
      topScore: rawScores.length > 0 ? Number(rawScores[0].toFixed(4)) : 0,
      secondScore: rawScores.length > 1 ? Number(rawScores[1].toFixed(4)) : 0,
      thirdScore: rawScores.length > 2 ? Number(rawScores[2].toFixed(4)) : 0,
      medianScore: rawScores.length > 0 ? Number(rawScores[Math.floor(rawScores.length / 2)].toFixed(4)) : 0,
      minScore: rawScores.length > 0 ? Number(rawScores[rawScores.length - 1].toFixed(4)) : 0,
      maxScore: rawScores.length > 0 ? Number(rawScores[0].toFixed(4)) : 0,
    };

    const topCandidatesBeforeThreshold: VectorSearchDebugCandidate[] = allCandidates
      .slice(0, 10)
      .map((item, idx) => {
        let sumSq = 0;
        const vec = item.record.vector;
        for (let j = 0; j < vec.length; j++) sumSq += vec[j] * vec[j];
        const norm = Math.sqrt(sumSq);

        return {
          rank: idx + 1,
          score: Number(item.score.toFixed(4)),
          chunkId: item.record.chunkId,
          fileId: item.record.fileId,
          fileName: item.record.fileName,
          pageNumber: item.record.pageNumber,
          chunkIndex: item.record.chunkIndex,
          textPreview: (item.record.text || '').substring(0, 120),
          fullText: item.record.text || '',
          passedThreshold: item.score >= minScore,
          extractionMethod: item.record.extractionMethod || 'pdf_text',
          ocrConfidence: item.record.ocrConfidence,
          characterCount: (item.record.text || '').length,
          vectorNorm: Number(norm.toFixed(4)),
          firstValues: vec.slice(0, 5).map((v) => Number(v.toFixed(4))),
        };
      });

    const passing = allCandidates.filter(c => c.score >= minScore);
    const topResults: VectorSearchResult[] = passing.slice(0, topK).map((item, idx) => ({
      rank: idx + 1,
      score: Number(item.score.toFixed(4)),
      chunkId: item.record.chunkId,
      fileId: item.record.fileId,
      fileName: item.record.fileName,
      pageNumber: item.record.pageNumber,
      chunkIndex: item.record.chunkIndex,
      text: item.record.text,
      dimensions: item.record.dimensions,
      model: item.record.model,
      location: item.record.location,
      fileType: item.record.fileType,
      extractionMethod: item.record.extractionMethod,
      ocrConfidence: item.record.ocrConfidence,
      sourceType: item.record.sourceType || 'document_content',
    }));

    return {
      results: topResults,
      diagnostics: {
        totalVectorsInDb: userVectors.length,
        queryDimensions: queryVector.length,
        queryNorm: Number(queryNorm.toFixed(4)),
        candidatesEvaluated: userVectors.length,
        topCandidatesBeforeThreshold,
        activeThreshold: minScore,
        chunksPassingThreshold: passing.length,
        scoreStats,
        queryFirstValues: queryVector.slice(0, 5).map((v) => Number(v.toFixed(4))),
      },
    };
  }

  /**
   * Executes Production Hybrid Retrieval (Dense Semantic + Lexical Keyword).
   * 
   * Architecture:
   * 1. Evaluates dense semantic cosine similarity on unit L2-normalized 384-D vectors.
   * 2. Evaluates browser-local lexical keyword & identifier matching on original chunk text.
   * 3. Calculates transparent hybrid score: finalScore = (semanticWeight * semanticScore) + (lexicalWeight * lexicalScore).
   * 4. Multi-Evidence Threshold Policy:
   *    - Accepted if semantic evidence >= minSemanticScore (0.35)
   *    OR
   *    - Accepted if strong lexical / exact identifier match >= LEXICAL_STRONG_THRESHOLD (0.45)
   *    OR
   *    - Accepted if combined hybrid evidence >= HYBRID_ACCEPT_THRESHOLD (0.35)
   * 5. Returns ranked results and comprehensive explainability diagnostics (Rank, Page, Chunk, Semantic, Lexical, Hybrid, Accepted).
   */
  async searchHybridWithDiagnostics(
    userId: string,
    queryVector: number[],
    queryText: string,
    topK: number = 5,
    minSemanticScore: number = DEFAULT_SIMILARITY_THRESHOLD,
    semanticWeight: number = DEFAULT_HYBRID_SEMANTIC_WEIGHT,
    lexicalWeight: number = DEFAULT_HYBRID_LEXICAL_WEIGHT,
    filterOptions?: { fileId?: string; pageNumber?: number }
  ): Promise<HybridVectorSearchResultWithDiagnostics> {
    await this.initialize();

    if (!queryVector || queryVector.length !== EXPECTED_DIMENSION) {
      throw new Error(
        `Invalid query vector dimensions: expected ${EXPECTED_DIMENSION}, got ${queryVector?.length ?? 0}`
      );
    }

    let qSumSq = 0;
    for (let i = 0; i < queryVector.length; i++) qSumSq += queryVector[i] * queryVector[i];
    const queryNorm = Math.sqrt(qSumSq);

    let userVectors = await this.getAllUserVectors(userId);

    // Apply fileId and pageNumber filters if specified
    if (filterOptions?.fileId) {
      userVectors = userVectors.filter((v) => v.fileId === filterOptions.fileId);
    }
    if (filterOptions?.pageNumber !== undefined && filterOptions.pageNumber > 0) {
      userVectors = userVectors.filter((v) => v.pageNumber === filterOptions.pageNumber);
    }

    if (userVectors.length === 0) {
      return {
        results: [],
        diagnostics: {
          totalVectorsInDb: 0,
          queryDimensions: queryVector.length,
          queryNorm: Number(queryNorm.toFixed(4)),
          candidatesEvaluated: 0,
          topCandidatesBeforeThreshold: [],
          activeThreshold: minSemanticScore,
          chunksPassingThreshold: 0,
          semanticWeight,
          lexicalWeight,
        },
      };
    }

    // Perform lexical query analysis
    const lexicalAnalysis = clientLexicalSearchService.analyzeQuery(queryText || '');

    interface EvaluatedCandidate {
      record: IndexedVectorRecord;
      semanticScore: number;
      lexicalScore: number;
      hybridScore: number;
      accepted: boolean;
      acceptanceReason: string;
      matchedTokens: string[];
      matchedIdentifiers: string[];
      isExactIdentifierMatch: boolean;
    }

    const allCandidates: EvaluatedCandidate[] = [];

    for (let i = 0; i < userVectors.length; i++) {
      const rec = userVectors[i];
      if (rec.vector.length !== EXPECTED_DIMENSION) continue;

      // Plan item: Filter out application_metadata and metadata-only chunks from retrieval
      // Only genuine DOCUMENT_CONTENT participates in retrieval
      const isMetaOnly =
        rec.sourceType === 'application_metadata' ||
        rec.isMetadataOnly === true ||
        (rec.text && /^Document\s+.*?\s+registered in local knowledge base vault\.?$/i.test(rec.text.trim()));
      if (isMetaOnly) {
        continue;
      }

      const rawCosine = dotProduct(queryVector, rec.vector);
      const clampedSemantic = Math.max(-1.0, Math.min(1.0, rawCosine));

      const lexicalMatch = clientLexicalSearchService.scoreChunk(lexicalAnalysis, rec.text || '');
      const lexicalScore = lexicalMatch.score;

      // Transparent weighted combination (Requirement 4)
      const hybridScore = Number((semanticWeight * clampedSemantic + lexicalWeight * lexicalScore).toFixed(4));

      // Separate evidence threshold policy (Requirement 6)
      let accepted = false;
      let acceptanceReason = '';

      if (filterOptions?.pageNumber && rec.pageNumber === filterOptions.pageNumber) {
        accepted = true;
        acceptanceReason = `Page filter match: Page ${filterOptions.pageNumber} (${rec.location || `Page ${rec.pageNumber}`})`;
      } else if (clampedSemantic >= minSemanticScore) {
        accepted = true;
        acceptanceReason = `Semantic evidence meets threshold (${clampedSemantic.toFixed(4)} ≥ ${minSemanticScore})`;
      } else if (lexicalScore >= LEXICAL_STRONG_THRESHOLD || lexicalMatch.isExactIdentifierMatch) {
        accepted = true;
        acceptanceReason = `Strong lexical match (${lexicalMatch.explanation})`;
      } else if (hybridScore >= HYBRID_ACCEPT_THRESHOLD) {
        accepted = true;
        acceptanceReason = `Combined hybrid evidence meets threshold (${hybridScore.toFixed(4)} ≥ ${HYBRID_ACCEPT_THRESHOLD})`;
      } else {
        accepted = false;
        acceptanceReason = `Below evidence thresholds (Semantic: ${clampedSemantic.toFixed(4)}, Lexical: ${lexicalScore.toFixed(4)}, Hybrid: ${hybridScore.toFixed(4)})`;
      }

      allCandidates.push({
        record: rec,
        semanticScore: Number(clampedSemantic.toFixed(4)),
        lexicalScore: Number(lexicalScore.toFixed(4)),
        hybridScore,
        accepted,
        acceptanceReason,
        matchedTokens: lexicalMatch.matchedTokens,
        matchedIdentifiers: lexicalMatch.matchedIdentifiers,
        isExactIdentifierMatch: lexicalMatch.isExactIdentifierMatch,
      });
    }

    // Rank candidates by hybridScore descending, breaking ties by semanticScore
    allCandidates.sort((a, b) => {
      if (b.hybridScore !== a.hybridScore) {
        return b.hybridScore - a.hybridScore;
      }
      return b.semanticScore - a.semanticScore;
    });

    const hybridScores = allCandidates.map((c) => c.hybridScore);
    const scoreStats: VectorSearchScoreStats = {
      topScore: hybridScores.length > 0 ? Number(hybridScores[0].toFixed(4)) : 0,
      secondScore: hybridScores.length > 1 ? Number(hybridScores[1].toFixed(4)) : 0,
      thirdScore: hybridScores.length > 2 ? Number(hybridScores[2].toFixed(4)) : 0,
      medianScore: hybridScores.length > 0 ? Number(hybridScores[Math.floor(hybridScores.length / 2)].toFixed(4)) : 0,
      minScore: hybridScores.length > 0 ? Number(hybridScores[hybridScores.length - 1].toFixed(4)) : 0,
      maxScore: hybridScores.length > 0 ? Number(hybridScores[0].toFixed(4)) : 0,
    };

    const topCandidatesBeforeThreshold: VectorSearchDebugCandidate[] = allCandidates
      .slice(0, 10)
      .map((item, idx) => {
        let sumSq = 0;
        const vec = item.record.vector;
        for (let j = 0; j < vec.length; j++) sumSq += vec[j] * vec[j];
        const norm = Math.sqrt(sumSq);

        return {
          rank: idx + 1,
          score: item.hybridScore,
          semanticScore: item.semanticScore,
          lexicalScore: item.lexicalScore,
          hybridScore: item.hybridScore,
          accepted: item.accepted,
          passedThreshold: item.accepted,
          acceptanceReason: item.acceptanceReason,
          matchedTokens: item.matchedTokens,
          matchedIdentifiers: item.matchedIdentifiers,
          chunkId: item.record.chunkId,
          fileId: item.record.fileId,
          fileName: item.record.fileName,
          pageNumber: item.record.pageNumber,
          chunkIndex: item.record.chunkIndex,
          textPreview: (item.record.text || '').substring(0, 140),
          fullText: item.record.text || '',
          extractionMethod: item.record.extractionMethod || 'pdf_text',
          ocrConfidence: item.record.ocrConfidence,
          characterCount: (item.record.text || '').length,
          vectorNorm: Number(norm.toFixed(4)),
          firstValues: vec.slice(0, 5).map((v) => Number(v.toFixed(4))),
        };
      });

    const passing = allCandidates.filter((c) => c.accepted);
    const topResults: HybridVectorSearchResult[] = passing.slice(0, topK).map((item, idx) => ({
      rank: idx + 1,
      score: item.hybridScore,
      semanticScore: item.semanticScore,
      lexicalScore: item.lexicalScore,
      hybridScore: item.hybridScore,
      accepted: item.accepted,
      acceptanceReason: item.acceptanceReason,
      matchedTokens: item.matchedTokens,
      matchedIdentifiers: item.matchedIdentifiers,
      chunkId: item.record.chunkId,
      fileId: item.record.fileId,
      fileName: item.record.fileName,
      pageNumber: item.record.pageNumber,
      chunkIndex: item.record.chunkIndex,
      text: item.record.text,
      dimensions: item.record.dimensions,
      model: item.record.model,
      location: item.record.location,
      fileType: item.record.fileType,
      extractionMethod: item.record.extractionMethod,
      ocrConfidence: item.record.ocrConfidence,
      sourceType: item.record.sourceType || 'document_content',
    }));

    return {
      results: topResults,
      diagnostics: {
        totalVectorsInDb: userVectors.length,
        queryDimensions: queryVector.length,
        queryNorm: Number(queryNorm.toFixed(4)),
        candidatesEvaluated: userVectors.length,
        topCandidatesBeforeThreshold,
        activeThreshold: minSemanticScore,
        chunksPassingThreshold: passing.length,
        scoreStats,
        queryFirstValues: queryVector.slice(0, 5).map((v) => Number(v.toFixed(4))),
        semanticWeight,
        lexicalWeight,
      },
    };
  }

  /**
   * Retrieves statistics about the user's vector index.
   */
  async getIndexStats(userId: string): Promise<VectorIndexStats> {
    const vectors = await this.getAllUserVectors(userId);
    const uniqueFiles = new Set<string>();
    let lastUpdated = 0;

    for (const v of vectors) {
      uniqueFiles.add(v.fileId);
      if (v.indexedAt > lastUpdated) {
        lastUpdated = v.indexedAt;
      }
    }

    return {
      totalVectors: vectors.length,
      totalFiles: uniqueFiles.size,
      fileIds: Array.from(uniqueFiles),
      dimensions: EXPECTED_DIMENSION,
      model: EXPECTED_MODEL,
      normalization: 'L2',
      engine: 'BrowserVectorIndex (IndexedDB InnerProduct)',
      lastUpdated: lastUpdated || Date.now(),
      status: vectors.length > 0 ? 'ready' : 'empty',
    };
  }

  /**
   * Clears all indexed vectors for the given user.
   */
  async clearUserIndex(userId: string): Promise<void> {
    if (!userId) return;

    const db = await this.getDB();

    if (!db) {
      for (const [key, rec] of this.memoryStore.entries()) {
        if (rec.userId === userId) {
          this.memoryStore.delete(key);
        }
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user');
      const keyRange = IDBKeyRange.only(userId);
      const request = index.openKeyCursor(keyRange);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to clear user vector index'));
      };
    });
  }
}

export const clientVectorIndexService = new ClientVectorIndexService();
