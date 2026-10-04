/**
 * LOCALIQ Real Browser Local Embedding Engine
 * 
 * Powered by @huggingface/transformers (Transformers.js v3) using the standard
 * sentence-transformers/all-MiniLM-L6-v2 architecture (384-dimensional dense vectors).
 * 
 * Guarantees:
 * - 100% Real Neural Inference: Executes local ONNX model in-browser via WebAssembly.
 * - Zero Cloud / Air-Gapped: Document text never leaves the client browser.
 * - Unit L2 Normalization: Prepares vectors for cosine similarity & FAISS search.
 * - Model Cached: Loads once into memory and caches weights in browser Cache API.
 * - Batch Processing: Yields to browser event loop to keep UI responsive.
 * - Provenance: Preserves chunk_id, page_number, file_id, and dimensions.
 * - Strict Truthfulness: No fake/hash/deterministic pseudo-embeddings.
 */

import { pipeline, env } from '@huggingface/transformers';
import { DocumentChunk } from '../types';
import { localEmbeddingStore, StoredEmbedding } from './localEmbeddingStore';

// Browser cache configuration for ONNX model weights
if (typeof window !== 'undefined') {
  env.useBrowserCache = true;
  env.allowLocalModels = false; // In browser, download once and cache via Browser Cache API
}

export type ModelLoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelProgressInfo {
  status: ModelLoadingStatus;
  message: string;
  progress?: number;
  error?: string;
}

export interface EmbeddingProgressCallback {
  (progress: {
    current: number;
    total: number;
    percent: number;
    message: string;
    stage: 'loading_model' | 'embedding' | 'storing' | 'completed';
  }): void;
}

export const PRIMARY_MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2';
export const FALLBACK_MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
export const EXPECTED_DIMENSIONS = 384;

class LocalEmbeddingService {
  private pipelinePromise: Promise<any> | null = null;
  private pipelineInstance: any = null;
  private modelStatus: ModelLoadingStatus = 'idle';
  private statusMessage: string = 'Model not loaded';
  private activeModelName: string = PRIMARY_MODEL_NAME;
  private statusListeners: Array<(info: ModelProgressInfo) => void> = [];

  /**
   * Subscribe to model loading and status changes
   */
  addStatusListener(listener: (info: ModelProgressInfo) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getStatusInfo());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  onStatusChange(listener: (info: ModelProgressInfo) => void): () => void {
    return this.addStatusListener(listener);
  }

  private updateStatus(status: ModelLoadingStatus, message: string, progress?: number, error?: string) {
    this.modelStatus = status;
    this.statusMessage = message;
    const info: ModelProgressInfo = { status, message, progress, error };
    for (const listener of this.statusListeners) {
      try {
        listener(info);
      } catch (err) {
        console.error('Error in status listener:', err);
      }
    }
  }

  getStatus(): ModelLoadingStatus {
    return this.modelStatus;
  }

  getStatusInfo(): ModelProgressInfo {
    return {
      status: this.modelStatus,
      message: this.statusMessage,
    };
  }

  isLoaded(): boolean {
    return this.modelStatus === 'ready' && this.pipelineInstance !== null;
  }

  getModelInfo() {
    return {
      model_name: this.activeModelName,
      dimension: EXPECTED_DIMENSIONS,
      status: this.modelStatus,
      engine: 'Transformers.js (Local Browser ONNX)',
      is_loaded: this.isLoaded(),
    };
  }

  /**
   * Loads the local embedding pipeline once and caches it in memory.
   * Downloads ONNX weights on first use and caches them in the browser.
   */
  async loadModel(onProgress?: (info: ModelProgressInfo) => void): Promise<any> {
    if (this.pipelineInstance) {
      return this.pipelineInstance;
    }

    if (this.pipelinePromise) {
      return this.pipelinePromise;
    }

    this.updateStatus('loading', 'Loading local embedding model...');

    this.pipelinePromise = (async () => {
      try {
        const progressCallback = (p: any) => {
          if (p && p.status === 'progress' && typeof p.progress === 'number') {
            const pct = Math.round(p.progress);
            const msg = `Downloading model weights (${pct}%)...`;
            this.updateStatus('loading', msg, pct);
            if (onProgress) onProgress({ status: 'loading', message: msg, progress: pct });
          } else if (p && p.status === 'init') {
            const msg = 'Initializing local ONNX runtime...';
            this.updateStatus('loading', msg);
            if (onProgress) onProgress({ status: 'loading', message: msg });
          } else if (p && p.status === 'ready') {
            const msg = 'Model weights loaded.';
            this.updateStatus('loading', msg);
          }
        };

        let pipe: any = null;
        let lastError: any = null;

        // Try primary model identifier first
        try {
          this.activeModelName = PRIMARY_MODEL_NAME;
          pipe = await pipeline('feature-extraction', PRIMARY_MODEL_NAME, {
            dtype: 'fp32',
            progress_callback: progressCallback,
          });
        } catch (err: any) {
          console.warn(`Primary model identifier ${PRIMARY_MODEL_NAME} failed, trying ${FALLBACK_MODEL_NAME}:`, err);
          lastError = err;
          // Try Xenova mirror
          this.activeModelName = FALLBACK_MODEL_NAME;
          pipe = await pipeline('feature-extraction', FALLBACK_MODEL_NAME, {
            dtype: 'fp32',
            progress_callback: progressCallback,
          });
        }

        if (!pipe) {
          throw lastError || new Error('Failed to initialize feature-extraction pipeline');
        }

        this.pipelineInstance = pipe;
        this.updateStatus('ready', 'Embeddings ready');
        if (onProgress) onProgress({ status: 'ready', message: 'Embeddings ready' });
        return pipe;
      } catch (error: any) {
        this.pipelinePromise = null;
        this.pipelineInstance = null;
        const errorMsg = error?.message || 'Failed to load local embedding model';
        this.updateStatus('error', `Model initialization failed: ${errorMsg}`, undefined, errorMsg);
        if (onProgress) onProgress({ status: 'error', message: errorMsg, error: errorMsg });
        throw new Error(`LOCALIQ Local Embedding Model failed to initialize: ${errorMsg}`);
      }
    })();

    return this.pipelinePromise;
  }

  /**
   * Normalizes a dense float vector to unit L2 norm:
   * norm = sqrt(sum(v_i^2))
   * normalized_i = v_i / norm
   */
  normalizeVector(vector: number[]): { normalized: number[]; norm: number } {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      const val = vector[i];
      sumSq += val * val;
    }

    const norm = Math.sqrt(sumSq);

    if (norm === 0 || !Number.isFinite(norm)) {
      return {
        normalized: new Array(vector.length).fill(0),
        norm: 0,
      };
    }

    const normalized = new Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / norm;
    }

    return { normalized, norm };
  }

  /**
   * Generates a 384-dimensional embedding for a single text input (e.g. search query).
   * Applies mean pooling and unit L2 normalization.
   */
  async embedText(text: string): Promise<number[]> {
    const pipe = await this.loadModel();
    const cleanText = text.trim() || ' ';

    const output = await pipe(cleanText, {
      pooling: 'mean',
      normalize: true,
    });

    let rawVector: number[];
    if (output.tolist) {
      const list = output.tolist();
      rawVector = Array.isArray(list[0]) ? list[0] : list;
    } else if (output.data) {
      rawVector = Array.from(output.data);
    } else {
      throw new Error('Unrecognized tensor output format from local embedding model');
    }

    if (rawVector.length !== EXPECTED_DIMENSIONS) {
      throw new Error(
        `Unexpected embedding dimension: got ${rawVector.length}, expected ${EXPECTED_DIMENSIONS}`
      );
    }

    // Ensure strict unit L2 norm
    const { normalized } = this.normalizeVector(rawVector);
    return normalized;
  }

  /**
   * Embeds a query string for semantic search (consumed by Step 8 semantic search).
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.embedText(query);
  }

  /**
   * Embeds an array of texts in batches to prevent freezing the UI.
   * Yields to the browser event loop between batches.
   */
  async embedBatch(
    texts: string[],
    batchSize: number = 8,
    onProgress?: (current: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<number[][]> {
    const pipe = await this.loadModel();
    const results: number[][] = [];
    const total = texts.length;

    for (let i = 0; i < total; i += batchSize) {
      if (signal?.aborted) {
        throw new DOMException('Embedding generation cancelled by user.', 'AbortError');
      }
      const batchTexts = texts.slice(i, i + batchSize).map(t => (t.trim() ? t.trim() : ' '));

      // Neural inference on batch
      const output = await pipe(batchTexts, {
        pooling: 'mean',
        normalize: true,
      });

      let batchVectors: number[][];
      if (output.tolist) {
        batchVectors = output.tolist();
      } else if (output.dims && output.dims[0] && output.data) {
        // Unpack flat TypedArray if tolist is not present
        const numItems = output.dims[0];
        const dim = output.dims[1] || EXPECTED_DIMENSIONS;
        batchVectors = [];
        const flat = Array.from(output.data) as number[];
        for (let b = 0; b < numItems; b++) {
          batchVectors.push(flat.slice(b * dim, (b + 1) * dim));
        }
      } else {
        throw new Error('Unable to parse batch output from embedding model');
      }

      for (const rawVec of batchVectors) {
        if (rawVec.length !== EXPECTED_DIMENSIONS) {
          throw new Error(
            `Vector dimension mismatch: expected ${EXPECTED_DIMENSIONS}, got ${rawVec.length}`
          );
        }
        const { normalized } = this.normalizeVector(rawVec);
        results.push(normalized);
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }

      // Yield execution to browser event loop to allow UI to re-render
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return results;
  }

  /**
   * High-Level Pipeline Step: Embed all chunks of a document and store them in IndexedDB.
   * Connects directly to the Intelligent Chunking output.
   */
  async embedChunks(
    userId: string,
    file: { id: string; name: string },
    chunks: DocumentChunk[],
    onProgress?: EmbeddingProgressCallback,
    signal?: AbortSignal
  ): Promise<StoredEmbedding[]> {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    if (signal?.aborted) {
      throw new DOMException('Embedding cancelled by user.', 'AbortError');
    }

    if (onProgress) {
      onProgress({
        current: 0,
        total: chunks.length,
        percent: 0,
        message: 'Loading local embedding model...',
        stage: 'loading_model',
      });
    }

    // Step 1: Ensure model is loaded
    await this.loadModel((info) => {
      if (onProgress && info.status === 'loading') {
        onProgress({
          current: 0,
          total: chunks.length,
          percent: info.progress || 0,
          message: info.message,
          stage: 'loading_model',
        });
      }
    });

    if (signal?.aborted) {
      throw new DOMException('Embedding cancelled by user.', 'AbortError');
    }

    if (onProgress) {
      onProgress({
        current: 0,
        total: chunks.length,
        percent: 0,
        message: `Embedding 0 / ${chunks.length} chunks...`,
        stage: 'embedding',
      });
    }

    // Step 2: Extract text from each chunk
    const chunkTexts = chunks.map(c => c.text);

    // Step 3: Run real neural batch embedding with progress and signal
    const vectors = await this.embedBatch(chunkTexts, 8, (current, total) => {
      const pct = Math.round((current / total) * 100);
      if (onProgress) {
        onProgress({
          current,
          total,
          percent: pct,
          message: `Embedding ${current} / ${total}`,
          stage: 'embedding',
        });
      }
    }, signal);

    if (signal?.aborted) {
      throw new DOMException('Embedding cancelled by user.', 'AbortError');
    }

    if (onProgress) {
      onProgress({
        current: chunks.length,
        total: chunks.length,
        percent: 100,
        message: 'Persisting embeddings to local vault...',
        stage: 'storing',
      });
    }

    // Step 4: Associate vectors with chunk metadata (preserving provenance)
    const storedEmbeddings: Omit<StoredEmbedding, 'user_id'>[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];

      // Re-verify norm is ~1.0
      let sumSq = 0;
      for (const val of vector) sumSq += val * val;
      const norm = Math.sqrt(sumSq);

      const isImgChunk =
        chunk.extraction_method === 'tesseract_local_ocr' ||
        chunk.extraction_method === 'ocr' ||
        Boolean(chunk.location_label && chunk.location_label.toLowerCase().includes('image'));
      const pageToken =
        chunk.page_number !== null && chunk.page_number !== undefined
          ? `p${chunk.page_number}`
          : isImgChunk
          ? 'img_sec'
          : 'sec';
      storedEmbeddings.push({
        embedding_id: `emb_${file.id}_${pageToken}_c${chunk.chunk_index}_${i}`,
        chunk_id: chunk.chunk_id || `${file.id}_${pageToken}_c${chunk.chunk_index}`,
        file_id: file.id,
        file_name: file.name,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index,
        dimensions: EXPECTED_DIMENSIONS,
        vector,
        norm,
        model: this.activeModelName,
        created_at: timestamp,
      });
    }

    // Step 5: Save in IndexedDB scoped to this user
    const saved = await localEmbeddingStore.saveEmbeddings(userId, file.id, storedEmbeddings);

    if (onProgress) {
      onProgress({
        current: chunks.length,
        total: chunks.length,
        percent: 100,
        message: 'Embeddings ready',
        stage: 'completed',
      });
    }

    return saved;
  }
}

export const localEmbeddingService = new LocalEmbeddingService();
