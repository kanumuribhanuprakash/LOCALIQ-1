/**
 * LOCALIQ Client-Side Encrypted Backup & Restore Service
 * 
 * Provides an air-gapped, zero-cloud, end-to-end encrypted backup and restore engine
 * running 100% locally in the browser using the native Web Crypto API.
 * 
 * Security Guarantees:
 * - Confidentiality & Authenticated Integrity: AES-GCM (256-bit key) with 12-byte IV.
 * - Key Derivation: PBKDF2 with SHA-256, 100,000 iterations, and fresh random 32-byte salt.
 * - Anti-Tamper: AES-GCM authentication tag verification detects any bit manipulation or truncation.
 * - Absolute Privacy: 0 network requests, 0 external APIs, 0 cloud storage.
 * - Identity Isolation: Backup files NEVER contain passwords, password hashes, auth salts, or session tokens.
 * - Storage Scope: Backs up Knowledge Base metadata, chunks, page provenance, embeddings,
 *   vectors, chat history, activity logs, and workspace preferences.
 * - Truthful Reporting: Accurately declares that original binary files are not persisted in browser storage.
 */

import { KnowledgeFile, ChatMessage, ActivityItem, WorkspaceSettings } from '../types';
import { localEmbeddingStore, StoredEmbedding } from './localEmbeddingStore';
import { clientVectorIndexService, IndexedVectorRecord, EXPECTED_DIMENSION, EXPECTED_MODEL } from './clientVectorIndexService';
import {
  getUserFilesKey,
  getUserChatKey,
  getUserActivityKey,
  getUserSettingsKey,
} from './localAuthService';

export const BACKUP_FORMAT_IDENTIFIER = 'LOCALIQ_BACKUP';
export const CURRENT_BACKUP_VERSION = 1;
export const BACKUP_FILE_EXTENSION = '.localiq';
export const PBKDF2_ITERATIONS = 100000;

export interface BackupEncryptionMetadata {
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  keyLength: number;
  saltBase64: string;
  ivBase64: string;
}

export interface BackupWorkspaceSummary {
  workspaceName: string;
  fileCount: number;
  chunkCount: number;
  vectorCount: number;
  vectorDimensions: number;
  embeddingModel: string;
  chatMessageCount: number;
  activityLogCount: number;
  hasOriginalBlobs: boolean;
  notice: string;
}

export interface BackupEnvelope {
  format: 'LOCALIQ_BACKUP';
  version: number;
  createdAt: string;
  appVersion: string;
  encryption: BackupEncryptionMetadata;
  metadata: BackupWorkspaceSummary;
  payload: string; // Base64 ciphertext with AES-GCM auth tag
}

export interface DecryptedWorkspacePayload {
  schemaVersion: number;
  exportedAt: number;
  workspace: {
    files: KnowledgeFile[];
    chatMessages: ChatMessage[];
    activityLogs: ActivityItem[];
    settings: WorkspaceSettings;
    embeddings: StoredEmbedding[];
    vectors: IndexedVectorRecord[];
  };
}

export interface CreateBackupOptions {
  userId: string;
  workspaceName: string;
  password: string;
  files: KnowledgeFile[];
  chatMessages: ChatMessage[];
  activityLogs: ActivityItem[];
  settings: WorkspaceSettings;
  onProgress?: (stage: string, percent: number) => void;
}

export interface BackupExportResult {
  fileName: string;
  fileSize: number;
  summary: BackupWorkspaceSummary;
  blobUrl: string;
}

export interface BackupInspectResult {
  valid: boolean;
  error?: string;
  envelope?: BackupEnvelope;
  summary?: BackupWorkspaceSummary;
}

export interface RestoreOptions {
  currentUserId: string;
  payload: DecryptedWorkspacePayload;
  mode: 'replace' | 'merge';
  currentFiles: KnowledgeFile[];
  currentChat: ChatMessage[];
  currentActivity: ActivityItem[];
  currentSettings: WorkspaceSettings;
  onProgress?: (stage: string, percent: number) => void;
}

export interface RestoreResult {
  mode: 'replace' | 'merge';
  restoredFilesCount: number;
  restoredVectorsCount: number;
  restoredEmbeddingsCount: number;
  restoredChatMessagesCount: number;
  finalFiles: KnowledgeFile[];
  finalChat: ChatMessage[];
  finalActivity: ActivityItem[];
  finalSettings: WorkspaceSettings;
}

/**
 * High-performance, stack-safe Uint8Array to Base64 encoder
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32,768 bytes per chunk to avoid stack limits
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * High-performance Base64 to Uint8Array decoder
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an AES-GCM 256-bit CryptoKey using PBKDF2 from a user password and salt
 */
async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKeyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

class ClientBackupService {
  /**
   * Creates an encrypted backup file from the current user workspace.
   */
  async createEncryptedBackup(options: CreateBackupOptions): Promise<BackupExportResult> {
    const {
      userId,
      workspaceName,
      password,
      files,
      chatMessages,
      activityLogs,
      settings,
      onProgress,
    } = options;

    if (!password || password.length < 6) {
      throw new Error('Backup password must be at least 6 characters long.');
    }
    if (!userId) {
      throw new Error('User ID is required to create a workspace backup.');
    }

    onProgress?.('Collecting workspace data...', 10);

    // 1. Fetch user-scoped embeddings and vectors from IndexedDB
    const userEmbeddings = await localEmbeddingStore.getAllEmbeddingsForUser(userId);
    onProgress?.('Collecting vector index...', 25);
    const userVectors = await clientVectorIndexService.getAllUserVectors(userId);

    // Calculate metrics
    const totalChunks = files.reduce((acc, f) => acc + (f.chunks?.length || 0), 0);

    const summary: BackupWorkspaceSummary = {
      workspaceName: workspaceName || settings.workspace.name || 'Private Workspace',
      fileCount: files.length,
      chunkCount: totalChunks,
      vectorCount: userVectors.length,
      vectorDimensions: EXPECTED_DIMENSION,
      embeddingModel: EXPECTED_MODEL,
      chatMessageCount: chatMessages.length,
      activityLogCount: activityLogs.length,
      hasOriginalBlobs: false,
      notice: 'Indexed knowledge, chunks, embeddings, and chat logs are backed up. Original uploaded binary files are not included because LOCALIQ does not persist raw binary files in browser storage.',
    };

    onProgress?.('Serializing payload...', 40);

    // 2. Prepare decrypted workspace payload (without ANY auth credentials, salts, or hashes)
    const payloadObject: DecryptedWorkspacePayload = {
      schemaVersion: CURRENT_BACKUP_VERSION,
      exportedAt: Date.now(),
      workspace: {
        files: files.map(f => {
          // Clone file and ensure no transient blob URLs remain
          const { imagePreviewUrl, ...rest } = f;
          return rest as KnowledgeFile;
        }),
        chatMessages,
        activityLogs,
        settings,
        embeddings: userEmbeddings,
        vectors: userVectors,
      },
    };

    const payloadJson = JSON.stringify(payloadObject);
    const enc = new TextEncoder();
    const plaintextBytes = enc.encode(payloadJson);

    onProgress?.('Generating cryptographic keys...', 55);

    // 3. Generate fresh cryptographic materials
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);

    const iv = new Uint8Array(12); // Standard 96-bit nonce for AES-GCM
    crypto.getRandomValues(iv);

    // 4. Derive key using PBKDF2 (100,000 iterations, SHA-256)
    const aesKey = await deriveEncryptionKey(password, salt, PBKDF2_ITERATIONS);

    onProgress?.('Encrypting workspace with AES-GCM-256...', 75);

    // 5. Encrypt with AES-GCM (appends 128-bit authentication tag)
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      aesKey,
      plaintextBytes
    );

    const ciphertextBytes = new Uint8Array(ciphertextBuffer);
    const ciphertextBase64 = uint8ArrayToBase64(ciphertextBytes);

    onProgress?.('Packaging .localiq backup file...', 90);

    // 6. Build versioned envelope
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT_IDENTIFIER,
      version: CURRENT_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      encryption: {
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2',
        hash: 'SHA-256',
        iterations: PBKDF2_ITERATIONS,
        keyLength: 256,
        saltBase64: uint8ArrayToBase64(salt),
        ivBase64: uint8ArrayToBase64(iv),
      },
      metadata: summary,
      payload: ciphertextBase64,
    };

    const envelopeJson = JSON.stringify(envelope, null, 2);
    const backupBlob = new Blob([envelopeJson], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(backupBlob);

    // Generate clean filename
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeWorkspace = (workspaceName || 'Workspace').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `LOCALIQ_Backup_${safeWorkspace}_${dateStamp}${BACKUP_FILE_EXTENSION}`;

    onProgress?.('Backup ready', 100);

    return {
      fileName,
      fileSize: backupBlob.size,
      summary,
      blobUrl,
    };
  }

  /**
   * Inspects and validates a backup file before asking for password
   */
  async inspectBackupFile(file: File): Promise<BackupInspectResult> {
    if (!file.name.endsWith(BACKUP_FILE_EXTENSION) && !file.name.endsWith('.json')) {
      return {
        valid: false,
        error: `Invalid file extension. Expected '${BACKUP_FILE_EXTENSION}'.`,
      };
    }

    try {
      const text = await file.text();
      let envelope: BackupEnvelope;
      try {
        envelope = JSON.parse(text);
      } catch {
        return {
          valid: false,
          error: 'Corrupted backup file: JSON syntax error.',
        };
      }

      if (envelope.format !== BACKUP_FORMAT_IDENTIFIER) {
        return {
          valid: false,
          error: `Unrecognized backup format. Expected '${BACKUP_FORMAT_IDENTIFIER}'.`,
        };
      }

      if (envelope.version !== CURRENT_BACKUP_VERSION) {
        return {
          valid: false,
          error: `Unsupported backup version (v${envelope.version}). Current system supports v${CURRENT_BACKUP_VERSION}.`,
        };
      }

      if (envelope.encryption?.algorithm !== 'AES-GCM' || envelope.encryption?.kdf !== 'PBKDF2') {
        return {
          valid: false,
          error: `Unsupported encryption suite: ${envelope.encryption?.algorithm || 'unknown'}/${envelope.encryption?.kdf || 'unknown'}. Expected AES-GCM/PBKDF2.`,
        };
      }

      if (!envelope.payload || !envelope.encryption.saltBase64 || !envelope.encryption.ivBase64) {
        return {
          valid: false,
          error: 'Corrupted backup file: Missing encryption parameters or payload.',
        };
      }

      return {
        valid: true,
        envelope,
        summary: envelope.metadata,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Failed to read backup file: ${message}`,
      };
    }
  }

  /**
   * Decrypts and validates the backup payload with the user-supplied password.
   * If AES-GCM authentication fails or payload is invalid, throws a safe error without modifying state.
   */
  async decryptAndValidateBackup(
    envelope: BackupEnvelope,
    password: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<DecryptedWorkspacePayload> {
    if (!envelope || typeof envelope !== 'object') {
      throw new Error('Invalid backup envelope: Expected JSON object.');
    }

    if (envelope.format !== BACKUP_FORMAT_IDENTIFIER) {
      throw new Error(`Unrecognized backup format. Expected '${BACKUP_FORMAT_IDENTIFIER}'.`);
    }

    if (envelope.version !== CURRENT_BACKUP_VERSION) {
      throw new Error(`Unsupported backup envelope version (v${envelope.version}). Current system supports v${CURRENT_BACKUP_VERSION}.`);
    }

    if (!password) {
      throw new Error('Password is required to decrypt this backup.');
    }

    onProgress?.('Deriving cryptographic key...', 20);

    const salt = base64ToUint8Array(envelope.encryption.saltBase64);
    const iv = base64ToUint8Array(envelope.encryption.ivBase64);
    const ciphertext = base64ToUint8Array(envelope.payload);

    const aesKey = await deriveEncryptionKey(
      password,
      salt,
      envelope.encryption.iterations || PBKDF2_ITERATIONS
    );

    onProgress?.('Verifying integrity and decrypting...', 50);

    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
        },
        aesKey,
        ciphertext as BufferSource
      );
    } catch {
      // AES-GCM MAC check failed
      throw new Error('Decryption failed: Incorrect password or corrupted/tampered backup file. Integrity check failed.');
    }

    onProgress?.('Validating workspace schema...', 75);

    const dec = new TextDecoder();
    const decryptedJson = dec.decode(decryptedBuffer);

    let parsed: DecryptedWorkspacePayload;
    try {
      parsed = JSON.parse(decryptedJson);
    } catch {
      throw new Error('Corrupted backup payload: Failed to parse decrypted workspace JSON.');
    }

    // Validate structural integrity
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Corrupted backup payload: Root object is invalid.');
    }
    if (parsed.schemaVersion !== CURRENT_BACKUP_VERSION) {
      throw new Error(`Incompatible workspace schema version: v${parsed.schemaVersion}.`);
    }
    if (!parsed.workspace || typeof parsed.workspace !== 'object') {
      throw new Error('Corrupted backup payload: Missing workspace container.');
    }

    const { files, vectors, embeddings, settings } = parsed.workspace;

    if (!Array.isArray(files)) {
      throw new Error('Corrupted backup payload: Invalid files collection.');
    }
    if (!Array.isArray(vectors)) {
      throw new Error('Corrupted backup payload: Invalid vectors collection.');
    }
    if (!Array.isArray(embeddings)) {
      throw new Error('Corrupted backup payload: Invalid embeddings collection.');
    }
    if (!settings || typeof settings !== 'object') {
      throw new Error('Corrupted backup payload: Invalid settings configuration.');
    }

    onProgress?.('Validating vector dimensions and numerical integrity...', 90);

    // Rigorous Vector Dimension & Numerical Validation (Requirement 11)
    for (let i = 0; i < vectors.length; i++) {
      const v = vectors[i];
      if (!v || !Array.isArray(v.vector)) {
        throw new Error(`Vector validation failed at index ${i}: vector array is missing.`);
      }
      if (v.vector.length !== EXPECTED_DIMENSION) {
        throw new Error(
          `Incompatible vector dimensions in backup: vector index ${i} has ${v.vector.length} dimensions, but current LOCALIQ runtime requires ${EXPECTED_DIMENSION} (${EXPECTED_MODEL}). Restoration blocked to prevent index corruption.`
        );
      }
      for (let j = 0; j < v.vector.length; j++) {
        const val = v.vector[j];
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          throw new Error(`Vector validation failed at index ${i}, dimension ${j}: non-finite numeric value.`);
        }
      }
    }

    onProgress?.('Decryption & validation complete', 100);

    return parsed;
  }

  /**
   * Restores the validated workspace data into browser storage and IndexedDB.
   * Supports 'replace' and 'merge' modes with deterministic conflict resolution.
   */
  async restoreWorkspace(options: RestoreOptions): Promise<RestoreResult> {
    const {
      currentUserId,
      payload,
      mode,
      currentFiles,
      currentChat,
      currentActivity,
      currentSettings,
      onProgress,
    } = options;

    if (!currentUserId) {
      throw new Error('Authenticated user ID is required to restore workspace.');
    }

    const incomingWorkspace = payload.workspace;
    const now = Date.now();

    onProgress?.('Preparing restoration plan...', 15);

    let finalFiles: KnowledgeFile[] = [];
    let finalChat: ChatMessage[] = [];
    let finalActivity: ActivityItem[] = [];
    let finalSettings: WorkspaceSettings = currentSettings;

    let vectorsToInsert: Array<Omit<IndexedVectorRecord, 'userId'>> = [];
    let embeddingsToInsert: StoredEmbedding[] = [];

    if (mode === 'replace') {
      onProgress?.('Purging existing user vectors and embeddings...', 30);

      // Clean existing user vectors and embeddings
      await localEmbeddingStore.clearUserEmbeddings(currentUserId);
      await clientVectorIndexService.clearUserIndex(currentUserId);

      // Re-attribute all restored records to current user
      finalFiles = incomingWorkspace.files.map(f => ({ ...f }));
      finalChat = incomingWorkspace.chatMessages.map(c => ({ ...c }));
      finalActivity = [
        {
          id: `act-restore-${now}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'settings',
          title: 'Workspace Restored (Replaced)',
          description: `Restored ${finalFiles.length} files, ${incomingWorkspace.vectors.length} vectors, and ${finalChat.length} chat messages from encrypted backup.`,
        },
        ...incomingWorkspace.activityLogs,
      ];
      finalSettings = incomingWorkspace.settings ? { ...incomingWorkspace.settings } : currentSettings;

      vectorsToInsert = incomingWorkspace.vectors.map(v => {
        const { userId, ...rest } = v;
        return rest;
      });

      embeddingsToInsert = incomingWorkspace.embeddings.map(e => ({
        ...e,
        user_id: currentUserId,
      }));
    } else {
      // MERGE MODE (Requirement 8): Deterministic conflict resolution
      onProgress?.('Resolving conflicts and mapping identifiers...', 30);

      const existingFileIds = new Set(currentFiles.map(f => f.id));
      const existingVectorIds = new Set(
        (await clientVectorIndexService.getAllUserVectors(currentUserId)).map(v => v.vectorId)
      );

      // Map of old file ID -> new file ID
      const fileIdMap = new Map<string, string>();
      // Map of old chunk ID -> new chunk ID
      const chunkIdMap = new Map<string, string>();

      const mergedIncomingFiles: KnowledgeFile[] = [];

      for (const incomingFile of incomingWorkspace.files) {
        if (existingFileIds.has(incomingFile.id)) {
          // Deterministic collision avoidance: generate new unique file ID
          const newFileId = `${incomingFile.id}-restored-${now.toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          fileIdMap.set(incomingFile.id, newFileId);

          const remappedChunks = (incomingFile.chunks || []).map(chunk => {
            const newChunkId = `${chunk.chunk_id}-r-${Math.random().toString(36).substring(2, 6)}`;
            chunkIdMap.set(chunk.chunk_id, newChunkId);
            return {
              ...chunk,
              chunk_id: newChunkId,
              file_id: newFileId,
            };
          });

          mergedIncomingFiles.push({
            ...incomingFile,
            id: newFileId,
            name: `${incomingFile.name} (Restored)`,
            chunks: remappedChunks,
          });
        } else {
          fileIdMap.set(incomingFile.id, incomingFile.id);
          mergedIncomingFiles.push({ ...incomingFile });
        }
      }

      // Merge files: current files + non-colliding/remapped restored files
      finalFiles = [...currentFiles, ...mergedIncomingFiles];

      // Merge vectors: remap file and chunk references if needed
      for (const incomingVec of incomingWorkspace.vectors) {
        const mappedFileId = fileIdMap.get(incomingVec.fileId) || incomingVec.fileId;
        const mappedChunkId = chunkIdMap.get(incomingVec.chunkId) || incomingVec.chunkId;
        const vectorIdCandidate = existingVectorIds.has(incomingVec.vectorId)
          ? `${incomingVec.vectorId}-m-${Math.random().toString(36).substring(2, 6)}`
          : incomingVec.vectorId;

        const { userId, ...rest } = incomingVec;
        vectorsToInsert.push({
          ...rest,
          vectorId: vectorIdCandidate,
          fileId: mappedFileId,
          chunkId: mappedChunkId,
        });
      }

      // Merge embeddings: remap file and chunk references if needed
      for (const incomingEmb of incomingWorkspace.embeddings) {
        const mappedFileId = fileIdMap.get(incomingEmb.file_id) || incomingEmb.file_id;
        const mappedChunkId = chunkIdMap.get(incomingEmb.chunk_id) || incomingEmb.chunk_id;
        embeddingsToInsert.push({
          ...incomingEmb,
          user_id: currentUserId,
          file_id: mappedFileId,
          chunk_id: mappedChunkId,
          embedding_id: `${incomingEmb.embedding_id}-m-${now.toString(36)}`,
        });
      }

      // Merge chat messages (deduplicate by id)
      const existingChatIds = new Set(currentChat.map(c => c.id));
      const incomingFilteredChat = incomingWorkspace.chatMessages.filter(c => !existingChatIds.has(c.id));
      finalChat = [...currentChat, ...incomingFilteredChat];

      // Merge activity logs
      const existingActIds = new Set(currentActivity.map(a => a.id));
      const incomingFilteredAct = incomingWorkspace.activityLogs.filter(a => !existingActIds.has(a.id));
      finalActivity = [
        {
          id: `act-restore-${now}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'settings',
          title: 'Workspace Restored (Merged)',
          description: `Merged ${mergedIncomingFiles.length} files, ${vectorsToInsert.length} vectors, and ${incomingFilteredChat.length} chat messages from encrypted backup.`,
        },
        ...currentActivity,
        ...incomingFilteredAct,
      ];

      finalSettings = currentSettings; // In merge mode, preserve active user settings
    }

    onProgress?.('Writing embeddings to local IndexedDB...', 60);
    await localEmbeddingStore.bulkInsertEmbeddings(currentUserId, embeddingsToInsert);

    onProgress?.('Indexing vectors into local IndexedDB...', 80);
    await clientVectorIndexService.addVectors(currentUserId, vectorsToInsert);

    onProgress?.('Persisting workspace collections...', 95);

    // Save to user-scoped localStorage
    localStorage.setItem(getUserFilesKey(currentUserId), JSON.stringify(finalFiles));
    localStorage.setItem(getUserChatKey(currentUserId), JSON.stringify(finalChat));
    localStorage.setItem(getUserActivityKey(currentUserId), JSON.stringify(finalActivity));
    localStorage.setItem(getUserSettingsKey(currentUserId), JSON.stringify(finalSettings));

    onProgress?.('Restoration completed successfully', 100);

    return {
      mode,
      restoredFilesCount: mode === 'replace' ? finalFiles.length : (finalFiles.length - currentFiles.length),
      restoredVectorsCount: vectorsToInsert.length,
      restoredEmbeddingsCount: embeddingsToInsert.length,
      restoredChatMessagesCount: mode === 'replace' ? finalChat.length : (finalChat.length - currentChat.length),
      finalFiles,
      finalChat,
      finalActivity,
      finalSettings,
    };
  }
}

export const clientBackupService = new ClientBackupService();
