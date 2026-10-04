/**
 * LOCALIQ Client Document Outline Service (ClientDocumentOutlineService)
 * 
 * Provides structural document-level representation for Step 23 Intelligent
 * Document-Level Retrieval, Overviews, Summarization, and Main Concepts.
 * 
 * Guarantees:
 * - 100% on-device, air-gapped extraction and storage.
 * - Extracts truthful headings without hallucinating non-existent structure.
 * - IndexedDB storage in `localiq_document_outlines` strictly isolated by userId.
 * - Seamless fallback for legacy/preloaded documents without re-upload.
 */

import {
  DocumentOutlineRecord,
  DocumentOutlineSection,
  DocumentChunk,
  SupportedFileType,
  KnowledgeFile,
} from '../types';

const OUTLINE_DB_NAME = 'localiq_document_outlines';
const OUTLINE_DB_VERSION = 1;
const OUTLINE_STORE_NAME = 'outlines';

export interface RawSectionInput {
  heading?: string;
  pageNumber?: number | null;
  text: string;
  chunkId?: string;
}

export class ClientDocumentOutlineService {
  private static instance: ClientDocumentOutlineService;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryStore = new Map<string, DocumentOutlineRecord>(); // fallback memory store

  static getInstance(): ClientDocumentOutlineService {
    if (!ClientDocumentOutlineService.instance) {
      ClientDocumentOutlineService.instance = new ClientDocumentOutlineService();
    }
    return ClientDocumentOutlineService.instance;
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(OUTLINE_DB_NAME, OUTLINE_DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(OUTLINE_STORE_NAME)) {
            const store = db.createObjectStore(OUTLINE_STORE_NAME, { keyPath: 'compositeId' });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_file', 'documentId', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('Failed to open localiq_document_outlines IndexedDB, using memory store:', request.error);
          this.dbPromise = null;
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed for outlines, using memory store:', err);
        this.dbPromise = null;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves a DocumentOutlineRecord to persistent IndexedDB storage with user tenant isolation.
   */
  async saveOutline(outline: DocumentOutlineRecord): Promise<void> {
    if (!outline.userId || !outline.documentId) {
      throw new Error('userId and documentId are required to persist a DocumentOutlineRecord.');
    }

    const compositeId = `${outline.userId}::${outline.documentId}`;
    const recordWithKey = { ...outline, compositeId };

    this.memoryStore.set(compositeId, outline);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([OUTLINE_STORE_NAME], 'readwrite');
        const store = tx.objectStore(OUTLINE_STORE_NAME);
        const req = store.put(recordWithKey);
        req.onsuccess = () => resolve();
        req.onerror = () => {
          console.warn('Error saving outline to IndexedDB, stored in memory:', req.error);
          resolve();
        };
      } catch (err) {
        console.warn('Transaction error saving outline, stored in memory:', err);
        resolve();
      }
    });
  }

  /**
   * Retrieves an outline for a given file and user.
   */
  async getOutline(userId: string, documentId: string): Promise<DocumentOutlineRecord | null> {
    if (!userId || !documentId) return null;

    const compositeId = `${userId}::${documentId}`;
    if (this.memoryStore.has(compositeId)) {
      return this.memoryStore.get(compositeId)!;
    }

    const db = await this.getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([OUTLINE_STORE_NAME], 'readonly');
        const store = tx.objectStore(OUTLINE_STORE_NAME);
        const req = store.get(compositeId);
        req.onsuccess = () => {
          const res = req.result as DocumentOutlineRecord | undefined;
          if (res) {
            this.memoryStore.set(compositeId, res);
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Retrieves all outlines belonging to a specific user.
   */
  async getOutlinesForUser(userId: string): Promise<DocumentOutlineRecord[]> {
    if (!userId) return [];

    const db = await this.getDB();
    if (!db) {
      return Array.from(this.memoryStore.values()).filter((o) => o.userId === userId);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([OUTLINE_STORE_NAME], 'readonly');
        const store = tx.objectStore(OUTLINE_STORE_NAME);
        const index = store.index('by_user');
        const req = index.getAll(userId);
        req.onsuccess = () => {
          const list = (req.result || []) as DocumentOutlineRecord[];
          for (const item of list) {
            this.memoryStore.set(`${userId}::${item.documentId}`, item);
          }
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Deletes an outline for a file.
   */
  async deleteOutline(userId: string, documentId: string): Promise<void> {
    const compositeId = `${userId}::${documentId}`;
    this.memoryStore.delete(compositeId);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([OUTLINE_STORE_NAME], 'readwrite');
        const store = tx.objectStore(OUTLINE_STORE_NAME);
        const req = store.delete(compositeId);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Clears all outlines for a user.
   */
  async clearUserOutlines(userId: string): Promise<void> {
    for (const key of Array.from(this.memoryStore.keys())) {
      if (key.startsWith(`${userId}::`)) {
        this.memoryStore.delete(key);
      }
    }

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([OUTLINE_STORE_NAME], 'readwrite');
        const store = tx.objectStore(OUTLINE_STORE_NAME);
        const index = store.index('by_user');
        const req = index.openCursor(IDBKeyRange.only(userId));
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Lazily gets or generates a DocumentOutlineRecord from existing chunks and metadata.
   */
  async getOrCreateOutline(
    userId: string,
    file: KnowledgeFile,
    chunks: DocumentChunk[]
  ): Promise<DocumentOutlineRecord> {
    const existing = await this.getOutline(userId, file.id);
    if (existing && existing.sections.length > 0) {
      return existing;
    }

    const newOutline = this.extractOutlineFromChunks(userId, file, chunks);
    await this.saveOutline(newOutline);
    return newOutline;
  }

  /**
   * Extracts a structured DocumentOutlineRecord directly from document chunks.
   * Recognizes:
   * - Numbered headings ("1. Introduction", "2. UDP", "5. Selective-repeat (SR)")
   * - Section prefixes ("Section 1: ...", "Chapter 3: ...", "Part A: ...")
   * - Markdown headings ("# ...", "## ...")
   * - Prominent heading lines in uppercase or title case
   */
  public extractOutlineFromChunks(
    userId: string,
    file: KnowledgeFile,
    chunks: DocumentChunk[]
  ): DocumentOutlineRecord {
    const fileId = file.id;
    const fileName = file.name;
    const fileType = ((file as any).file_type || file.extension || fileName.split('.').pop() || 'pdf').toLowerCase() as SupportedFileType;

    const sections: DocumentOutlineSection[] = [];
    const headings: string[] = [];
    const representativeChunkIds: string[] = [];
    const pageDistribution: Record<number, number> = {};

    let maxPage = file.pagesCount || (file as any).page_count || 1;

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const page = c.page_number || 1;
      if (page > maxPage) maxPage = page;
      pageDistribution[page] = (pageDistribution[page] || 0) + 1;

      // Detect heading inside chunk text
      const detectedHeading = this.detectHeadingFromChunkText(c.text);

      if (detectedHeading) {
        const lead = c.text
          .replace(detectedHeading.fullMatch, '')
          .trim()
          .substring(0, 300);

        sections.push({
          sectionId: `sec_${fileId}_${sections.length + 1}`,
          heading: detectedHeading.cleanTitle,
          level: detectedHeading.level,
          startPage: page,
          endPage: page,
          representativeChunkIds: [c.chunk_id],
          leadText: lead || c.text.substring(0, 250),
        });

        headings.push(detectedHeading.cleanTitle);
        representativeChunkIds.push(c.chunk_id);
      }
    }

    // Fallback: If no explicit headings were detected, synthesize page-based or paragraph sections
    if (sections.length === 0 && chunks.length > 0) {
      const chunksByPage = new Map<number, DocumentChunk[]>();
      for (const c of chunks) {
        const p = c.page_number || 1;
        if (!chunksByPage.has(p)) chunksByPage.set(p, []);
        chunksByPage.get(p)!.push(c);
      }

      const sortedPages = Array.from(chunksByPage.keys()).sort((a, b) => a - b);
      for (const p of sortedPages) {
        const pChunks = chunksByPage.get(p)!;
        const firstChunk = pChunks[0];
        const lines = firstChunk.text.split('\n').map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || `Content Overview`;
        const headingTitle = lines.length > 0 && lines[0].length < 80 ? lines[0] : `Page ${p} Overview`;

        sections.push({
          sectionId: `sec_${fileId}_p${p}`,
          heading: headingTitle,
          level: 1,
          startPage: p,
          endPage: p,
          representativeChunkIds: [firstChunk.chunk_id],
          leadText: firstChunk.text.substring(0, 300),
        });

        headings.push(headingTitle);
        representativeChunkIds.push(firstChunk.chunk_id);
      }
    }

    // Determine clean title from filename or first section
    let docTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (sections.length > 0 && sections[0].heading.toLowerCase().includes('introduction')) {
      docTitle = `${fileName.replace(/\.[^/.]+$/, '')} (Overview)`;
    }

    return {
      documentId: fileId,
      userId,
      fileName,
      fileType,
      title: docTitle,
      pageCount: maxPage,
      sections,
      headings,
      pageDistribution,
      representativeChunkIds,
      extractionMethod: chunks[0]?.extraction_method || 'pdf_text',
      timestamp: Date.now(),
      version: 1,
    };
  }

  /**
   * Inspects chunk text to detect natural section headings.
   */
  private detectHeadingFromChunkText(
    text: string
  ): { cleanTitle: string; level: number; fullMatch: string } | null {
    if (!text || text.trim().length === 0) return null;

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Check first 3 lines
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i];

      // Pattern 1: Numbered headings: "1. Introduction", "2. Connectionless Transport: UDP", "5. Selective-repeat (SR)"
      const numberedMatch = line.match(/^(\d+)(?:\.(\d+))?\s*[:.-]\s*(.+)$/);
      if (numberedMatch && numberedMatch[3] && numberedMatch[3].length <= 90) {
        const fullTitle = `${numberedMatch[1]}${numberedMatch[2] ? `.${numberedMatch[2]}` : ''}. ${numberedMatch[3].trim()}`;
        return {
          cleanTitle: fullTitle,
          level: numberedMatch[2] ? 2 : 1,
          fullMatch: line,
        };
      }

      // Pattern 2: Explicit Section/Chapter prefixes: "Section 1: Architectural Overview", "Chapter 3: Transport Layer"
      const sectionMatch = line.match(/^(Section|Chapter|Part|Module)\s+(\d+)\s*[:.-]\s*(.+)$/i);
      if (sectionMatch && sectionMatch[3] && sectionMatch[3].length <= 90) {
        return {
          cleanTitle: `${sectionMatch[1]} ${sectionMatch[2]}: ${sectionMatch[3].trim()}`,
          level: 1,
          fullMatch: line,
        };
      }

      // Pattern 3: Markdown style: "# Heading", "## Subheading"
      const mdMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (mdMatch && mdMatch[2] && mdMatch[2].length <= 90) {
        return {
          cleanTitle: mdMatch[2].trim(),
          level: mdMatch[1].length,
          fullMatch: line,
        };
      }

      // Pattern 4: Prominent stand-alone title line (e.g. "Selective-repeat (SR)", "Go-Back-N (GBN)")
      // Must be relatively short (< 60 chars), start with a capital, not end with punctuation like a regular sentence
      const standaloneTitle = line.match(/^([A-Z][A-Za-z0-9\s()/-]{3,60})$/);
      if (
        standaloneTitle &&
        !line.endsWith('.') &&
        !line.endsWith(',') &&
        !line.endsWith(';') &&
        !line.toLowerCase().startsWith('for example') &&
        !line.toLowerCase().startsWith('in this') &&
        !line.toLowerCase().startsWith('this document')
      ) {
        return {
          cleanTitle: line.trim(),
          level: 2,
          fullMatch: line,
        };
      }
    }

    return null;
  }
}

export const clientDocumentOutlineService = ClientDocumentOutlineService.getInstance();
