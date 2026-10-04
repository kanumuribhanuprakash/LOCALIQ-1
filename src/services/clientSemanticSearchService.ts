/**
 * LOCALIQ Client Semantic Search Service (ClientSemanticSearchService)
 * 
 * Provides an air-gapped, zero-cloud semantic retrieval engine running directly in-browser.
 * 
 * Flow:
 * User Question
 *   ↓
 * Local Query Embedding (all-MiniLM-L6-v2, 384-D, Unit L2-Normalized)
 *   ↓
 * Vector Index Search (IndexedDB inner-product cosine similarity scoped to userId)
 *   ↓
 * Similarity Filtering (score >= threshold, default: 0.35)
 *   ↓
 * Top-K Ranking (Sorted strictly by descending cosine similarity)
 *   ↓
 * Retrieved Chunks (Verbatim text with complete provenance: fileId, fileName, pageNumber, chunkIndex)
 * 
 * STRICT GUARANTEES:
 * - Real local embeddings using the SAME model as document indexing (all-MiniLM-L6-v2).
 * - Zero cloud APIs, zero Gemini/OpenAI/cloud search endpoints.
 * - No keyword-matching fallback as primary retrieval.
 * - No fake similarity scores; scores are mathematical inner products on normalized vectors.
 * - No AI answer generation at this stage; purely reliable local semantic retrieval.
 */

import { localEmbeddingService, EXPECTED_DIMENSIONS } from './localEmbeddingService';
import {
  clientVectorIndexService,
  EXPECTED_DIMENSION,
  EXPECTED_MODEL,
  DEFAULT_SIMILARITY_THRESHOLD,
  VectorIndexStats,
} from './clientVectorIndexService';
import { SearchExecutionStats, VectorSearchDebugCandidate, VectorSearchScoreStats } from '../types';

export interface SemanticSearchResultItem {
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
  text: string;
  location?: string;
  fileType?: string;
  extractionMethod?: string;
  ocrConfidence?: number;
}

export type SearchProgressStage =
  | 'idle'
  | 'embedding_query'
  | 'searching_index'
  | 'ranking_results'
  | 'completed'
  | 'failed';

export interface SemanticSearchOptions {
  topK?: number;
  threshold?: number;
  semanticWeight?: number;
  lexicalWeight?: number;
  fileId?: string;
  pageNumber?: number;
  onProgress?: (stage: SearchProgressStage, message: string) => void;
}

export interface SemanticSearchDiagnostics {
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
}

export interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchResultItem[];
  stats: SearchExecutionStats;
  hasIndexedData: boolean;
  status: 'found' | 'not_found' | 'no_index' | 'error';
  statusMessage: string;
  diagnostics?: SemanticSearchDiagnostics;
}

export class ClientSemanticSearchService {
  private isInitialized = false;

  /**
   * Initializes dependencies if not already ready.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await clientVectorIndexService.initialize();
    this.isInitialized = true;
  }

  /**
   * Validates query string to avoid pointless embeddings on empty/whitespace input.
   */
  private sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    return query.trim();
  }

  /**
   * Validates vector numerical correctness and dimension.
   */
  private validateVector(vec: number[], expectedDim: number = EXPECTED_DIMENSION): void {
    if (!Array.isArray(vec)) {
      throw new Error(`Invalid query vector: expected array, received ${typeof vec}`);
    }
    if (vec.length !== expectedDim) {
      throw new Error(
        `Query embedding dimension mismatch: expected ${expectedDim}, got ${vec.length}`
      );
    }
    for (let i = 0; i < vec.length; i++) {
      const val = vec[i];
      if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
        throw new Error(
          `Query vector contains non-finite numerical value at index ${i}: ${val}`
        );
      }
    }
  }

  /**
   * Executes real semantic retrieval across the user's local vector index.
   * 
   * @param userId Authenticated user ID (ensures tenant isolation)
   * @param query Natural language user query
   * @param options Search options (topK, threshold, onProgress)
   */
  async search(
    userId: string,
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResponse> {
    const startTime = performance.now();
    const cleanQuery = this.sanitizeQuery(query);
    const topK = options.topK !== undefined && options.topK > 0 ? options.topK : 5;
    const threshold = options.threshold !== undefined ? options.threshold : DEFAULT_SIMILARITY_THRESHOLD;
    const onProgress = options.onProgress;

    // Guard: Require authenticated userId
    if (!userId) {
      throw new Error('User ID is required for semantic search to ensure strict vault isolation.');
    }

    // Step 0: Ensure index service is initialized
    await this.initialize();

    // Step 1: Check if user has any indexed knowledge vectors
    let userStats: VectorIndexStats;
    try {
      userStats = await clientVectorIndexService.getIndexStats(userId);
    } catch (err: any) {
      throw new Error(`Failed to access local vector index: ${err?.message || 'Database error'}`);
    }

    // Guard: Empty query string
    if (!cleanQuery) {
      return {
        query,
        results: [],
        stats: {
          indexedFiles: userStats.totalFiles,
          indexedVectors: userStats.totalVectors,
          returnedResults: 0,
          topK,
          threshold,
          embeddingModel: EXPECTED_MODEL,
          dimensions: EXPECTED_DIMENSION,
          executionTimeMs: Math.round(performance.now() - startTime),
        },
        hasIndexedData: userStats.totalVectors > 0,
        status: 'not_found',
        statusMessage: 'Search query is empty.',
      };
    }

    // Guard: No indexed data available for this user
    if (userStats.totalVectors === 0 || userStats.totalFiles === 0) {
      return {
        query: cleanQuery,
        results: [],
        stats: {
          indexedFiles: 0,
          indexedVectors: 0,
          returnedResults: 0,
          topK,
          threshold,
          embeddingModel: EXPECTED_MODEL,
          dimensions: EXPECTED_DIMENSION,
          executionTimeMs: Math.round(performance.now() - startTime),
        },
        hasIndexedData: false,
        status: 'no_index',
        statusMessage: 'No indexed knowledge available. Process and index a document first.',
      };
    }

    // Stage 1: Local Query Embedding
    if (onProgress) {
      onProgress('embedding_query', 'Generating 384-D query embedding using all-MiniLM-L6-v2...');
    }

    const queryEmbedStartTime = performance.now();
    let queryVector: number[];
    try {
      queryVector = await localEmbeddingService.embedQuery(cleanQuery);
    } catch (err: any) {
      if (onProgress) onProgress('failed', 'Query embedding failed.');
      throw new Error(
        `Query embedding failed: ${err?.message || 'Local ONNX embedding model inference failed.'}`
      );
    }
    const queryEmbeddingTimeMs = Math.round(performance.now() - queryEmbedStartTime);

    // Validate query vector structure and dimensions
    this.validateVector(queryVector, EXPECTED_DIMENSION);

    const semanticWeight = options.semanticWeight !== undefined ? options.semanticWeight : 0.65;
    const lexicalWeight = options.lexicalWeight !== undefined ? options.lexicalWeight : 0.35;

    // Stage 2: Hybrid Retrieval (Dense Semantic + Lexical Keyword)
    if (onProgress) {
      onProgress('searching_index', `Executing hybrid retrieval across ${userStats.totalVectors} vectors (Dense + Lexical)...`);
    }

    let searchResults: SemanticSearchResultItem[] = [];
    let diagnostics: SemanticSearchDiagnostics | undefined;

    try {
      const searchOutput = await clientVectorIndexService.searchHybridWithDiagnostics(
        userId,
        queryVector,
        cleanQuery,
        topK,
        threshold,
        semanticWeight,
        lexicalWeight,
        {
          fileId: options.fileId,
          pageNumber: options.pageNumber,
        }
      );

      // Preserve verbatim text and complete provenance
      searchResults = searchOutput.results.map((match) => ({
        rank: match.rank,
        score: match.score,
        semanticScore: match.semanticScore,
        lexicalScore: match.lexicalScore,
        hybridScore: match.hybridScore,
        accepted: match.accepted,
        acceptanceReason: match.acceptanceReason,
        matchedTokens: match.matchedTokens,
        matchedIdentifiers: match.matchedIdentifiers,
        chunkId: match.chunkId,
        fileId: match.fileId,
        fileName: match.fileName,
        pageNumber: match.pageNumber,
        chunkIndex: match.chunkIndex,
        text: match.text, // Verbatim original chunk text
        location: match.location,
        fileType: match.fileType,
        extractionMethod: match.extractionMethod,
        ocrConfidence: match.ocrConfidence,
      }));
      diagnostics = {
        ...searchOutput.diagnostics,
        queryText: cleanQuery,
        queryEmbeddingTimeMs,
      };
    } catch (err: any) {
      if (onProgress) onProgress('failed', 'Hybrid vector index search failed.');
      throw new Error(
        `Vector index search failed: ${err?.message || 'Database error while searching vectors.'}`
      );
    }

    // Stage 3: Top-K Ranking & Verification
    if (onProgress) {
      onProgress('ranking_results', `Ranked ${searchResults.length} relevant candidate chunks.`);
    }

    const hasResults = searchResults.length > 0;
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (onProgress) {
      onProgress('completed', hasResults ? 'Relevant Information Found' : 'No relevant results found');
    }

    return {
      query: cleanQuery,
      results: searchResults,
      stats: {
        indexedFiles: userStats.totalFiles,
        indexedVectors: userStats.totalVectors,
        returnedResults: searchResults.length,
        topK,
        threshold,
        semanticWeight,
        lexicalWeight,
        embeddingModel: EXPECTED_MODEL,
        dimensions: EXPECTED_DIMENSION,
        executionTimeMs,
      },
      hasIndexedData: true,
      status: hasResults ? 'found' : 'not_found',
      statusMessage: hasResults
        ? 'Relevant Information Found'
        : 'No sufficiently relevant information was found in your indexed knowledge.',
      diagnostics,
    };
  }

  /**
   * Retrieves live vector statistics for the authenticated user.
   */
  async getStats(userId: string): Promise<VectorIndexStats> {
    await this.initialize();
    return clientVectorIndexService.getIndexStats(userId);
  }
}

// Export singleton instance for seamless app-wide consumption
export const clientSemanticSearchService = new ClientSemanticSearchService();
