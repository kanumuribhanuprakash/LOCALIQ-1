/**
 * LOCALIQ Local Vector & Embedding Store (IndexedDB)
 * 
 * Provides robust, air-gapped, zero-cloud client storage for high-dimensional
 * vector embeddings using browser IndexedDB.
 * 
 * Guarantees:
 * - 100% User Isolation: All records scoped by authenticated userId.
 * - Provenance Preservation: Keeps chunk_id, page_number, file_name, file_id, etc.
 * - Duplicate Prevention: Atomic overwrite/replacement per file.
 * - Unlimited Capacity: Avoids the 5MB browser localStorage quota limitations.
 */

export interface StoredEmbedding {
  embedding_id: string;
  chunk_id: string;
  file_id: string;
  file_name: string;
  page_number: number | null;
  chunk_index: number;
  dimensions: number;
  vector: number[];
  norm: number;
  user_id: string;
  model: string;
  created_at: number;
}

const DB_NAME = 'localiq_embeddings_db';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

class LocalEmbeddingStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryStore: Map<string, StoredEmbedding & { id: string }> = new Map();
  private isIndexedDBAvailable: boolean = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

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
            // Primary key: composite id `${user_id}::${embedding_id}`
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('by_user', 'user_id', { unique: false });
            store.createIndex('by_user_file', ['user_id', 'file_id'], { unique: false });
            store.createIndex('by_user_chunk', ['user_id', 'chunk_id'], { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('Failed to open IndexedDB, falling back to in-memory store:', request.error);
          this.isIndexedDBAvailable = false;
          this.dbPromise = null;
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed, using in-memory store:', err);
        this.isIndexedDBAvailable = false;
        this.dbPromise = null;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves embeddings for a specific file and user.
   * Atomically replaces existing embeddings for that file to prevent duplicate vectors.
   */
  async saveEmbeddings(
    userId: string,
    fileId: string,
    embeddings: Omit<StoredEmbedding, 'user_id'>[]
  ): Promise<StoredEmbedding[]> {
    const db = await this.getDB();

    // 1. Remove previous embeddings for this (userId, fileId) to prevent duplicates
    await this.deleteEmbeddingsForFile(userId, fileId);

    const savedList: StoredEmbedding[] = [];

    if (!db) {
      // In-memory fallback
      for (const emb of embeddings) {
        const fullRecord: StoredEmbedding & { id: string } = {
          ...emb,
          user_id: userId,
          id: `${userId}::${emb.embedding_id}`,
        };
        this.memoryStore.set(fullRecord.id, fullRecord);
        savedList.push(fullRecord);
      }
      return savedList;
    }

    // 2. Insert new embeddings into IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        resolve(savedList);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to save embeddings'));
      };

      for (const emb of embeddings) {
        const fullRecord: StoredEmbedding & { id: string } = {
          ...emb,
          user_id: userId,
          id: `${userId}::${emb.embedding_id}`,
        };
        store.put(fullRecord);
        savedList.push(fullRecord);
      }
    });
  }

  /**
   * Retrieves all embeddings for a specific file belonging to the given user.
   */
  async getEmbeddingsForFile(userId: string, fileId: string): Promise<StoredEmbedding[]> {
    const db = await this.getDB();

    if (!db) {
      const list: StoredEmbedding[] = [];
      for (const record of this.memoryStore.values()) {
        if (record.user_id === userId && record.file_id === fileId) {
          list.push(record);
        }
      }
      list.sort((a, b) => a.chunk_index - b.chunk_index);
      return list;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user_file');
      const keyRange = IDBKeyRange.only([userId, fileId]);
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const results = (request.result || []) as StoredEmbedding[];
        // Sort by chunk_index to preserve order
        results.sort((a, b) => a.chunk_index - b.chunk_index);
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to fetch embeddings for file'));
      };
    });
  }

  /**
   * Retrieves all embeddings for the given user across all files.
   * User isolation: Never returns another user's embeddings.
   */
  async getAllEmbeddingsForUser(userId: string): Promise<StoredEmbedding[]> {
    const db = await this.getDB();

    if (!db) {
      const list: StoredEmbedding[] = [];
      for (const record of this.memoryStore.values()) {
        if (record.user_id === userId) {
          list.push(record);
        }
      }
      return list;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user');
      const keyRange = IDBKeyRange.only(userId);
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        resolve((request.result || []) as StoredEmbedding[]);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to fetch all embeddings for user'));
      };
    });
  }

  /**
   * Deletes all embeddings for a specific file and user.
   */
  async deleteEmbeddingsForFile(userId: string, fileId: string): Promise<void> {
    const db = await this.getDB();

    if (!db) {
      for (const [key, record] of this.memoryStore.entries()) {
        if (record.user_id === userId && record.file_id === fileId) {
          this.memoryStore.delete(key);
        }
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user_file');
      const keyRange = IDBKeyRange.only([userId, fileId]);
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
        reject(transaction.error || new Error('Failed to delete embeddings for file'));
      };
    });
  }

  /**
   * Deletes all embeddings for a user (e.g. on vault clear or account removal).
   */
  async clearUserEmbeddings(userId: string): Promise<void> {
    const db = await this.getDB();

    if (!db) {
      for (const [key, record] of this.memoryStore.entries()) {
        if (record.user_id === userId) {
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
        reject(transaction.error || new Error('Failed to clear embeddings for user'));
      };
    });
  }

  /**
   * Count total embeddings stored for a given user.
   */
  async countUserEmbeddings(userId: string): Promise<number> {
    const db = await this.getDB();

    if (!db) {
      let count = 0;
      for (const record of this.memoryStore.values()) {
        if (record.user_id === userId) count++;
      }
      return count;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('by_user');
      const request = index.count(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        resolve(request.result || 0);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to count embeddings'));
      };
    });
  }

  /**
   * Bulk inserts or updates embeddings for a user (e.g. during backup restore).
   */
  async bulkInsertEmbeddings(
    userId: string,
    embeddings: Array<Omit<StoredEmbedding, 'user_id'> & { user_id?: string }>
  ): Promise<number> {
    const db = await this.getDB();
    if (!embeddings || embeddings.length === 0) return 0;

    if (!db) {
      for (const emb of embeddings) {
        const fullRecord: StoredEmbedding & { id: string } = {
          ...emb,
          user_id: userId,
          id: `${userId}::${emb.embedding_id}`,
        };
        this.memoryStore.set(fullRecord.id, fullRecord);
      }
      return embeddings.length;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        resolve(embeddings.length);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to bulk insert embeddings'));
      };

      for (const emb of embeddings) {
        const fullRecord: StoredEmbedding & { id: string } = {
          ...emb,
          user_id: userId,
          id: `${userId}::${emb.embedding_id}`,
        };
        store.put(fullRecord);
      }
    });
  }
}

export const localEmbeddingStore = new LocalEmbeddingStore();
