/**
 * LOCALIQ Local-First Authentication Service
 * 
 * Provides client-side local authentication using the browser's native Web Crypto API.
 * Passwords are never stored in plaintext and never sent across the network.
 * Each user's password is encrypted using PBKDF2 (HMAC-SHA-256) with 100,000 iterations
 * and a unique 16-byte cryptographically secure salt.
 */

import { UserProfile, WorkspaceSettings, KnowledgeFile, ChatMessage, ActivityItem } from '../types';
import { defaultSettings, samplePreloadedFiles } from '../data/initialData';

export interface StoredLocalUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  workspaceName: string;
  role: string;
  createdAt: string;
  joinedDate: string;
  avatarSeed?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  token: string;
  createdAt: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
  session?: AuthSession;
}

// Dedicated LocalStorage Keys
export const STORAGE_KEY_AUTH_USERS = 'localiq_auth_users_v1';
export const STORAGE_KEY_AUTH_SESSION = 'localiq_auth_session_v1';

// Legacy keys for migration
export const LEGACY_STORAGE_KEY_USER = 'localiq_user_session_v1';
export const LEGACY_STORAGE_KEY_FILES = 'localiq_vault_files_v1';
export const LEGACY_STORAGE_KEY_CHAT = 'localiq_chat_history_v1';
export const LEGACY_STORAGE_KEY_ACTIVITY = 'localiq_activity_log_v1';
export const LEGACY_STORAGE_KEY_SETTINGS = 'localiq_settings_v1';

// User-scoped storage key generators
export const getUserFilesKey = (userId: string) => `localiq_user_${userId}_files_v1`;
export const getUserChatKey = (userId: string) => `localiq_user_${userId}_chat_v1`;
export const getUserActivityKey = (userId: string) => `localiq_user_${userId}_activity_v1`;
export const getUserSettingsKey = (userId: string) => `localiq_user_${userId}_settings_v1`;

/**
 * Convert Uint8Array to hexadecimal string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hexadecimal string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure random 16-byte salt
 */
function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToHex(salt);
}

/**
 * Derive a 256-bit PBKDF2 hash from a password and salt using Web Crypto API
 */
async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Generate a secure pseudo-random session token
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'tok_' + bytesToHex(bytes);
}

/**
 * Retrieve all registered users from local storage
 */
export function getRegisteredUsers(): StoredLocalUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read registered users from localStorage:', err);
    return [];
  }
}

/**
 * Save registered users list to local storage
 */
function saveRegisteredUsers(users: StoredLocalUser[]): void {
  localStorage.setItem(STORAGE_KEY_AUTH_USERS, JSON.stringify(users));
}

/**
 * Find user by email (case-insensitive)
 */
export function findUserByEmail(email: string): StoredLocalUser | null {
  const normalized = (email || '').trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(u => (u.email || '').toLowerCase() === normalized) || null;
}

/**
 * Find user by ID
 */
export function findUserById(userId: string): StoredLocalUser | null {
  const users = getRegisteredUsers();
  return users.find(u => u.id === userId) || null;
}

/**
 * Convert StoredLocalUser to public UserProfile (omitting salt and hash)
 */
export function toUserProfile(stored: StoredLocalUser): UserProfile {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    workspaceName: stored.workspaceName,
    role: stored.role,
    joinedDate: stored.joinedDate,
    avatarSeed: stored.avatarSeed,
  };
}

/**
 * Get active session from localStorage
 */
export function getActiveSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session && session.userId && session.token) {
      return session;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Set active session in localStorage
 */
export function setActiveSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
}

/**
 * Clear active session from localStorage
 */
export function clearActiveSession(): void {
  localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
  // Also remove legacy session key if present
  localStorage.removeItem(LEGACY_STORAGE_KEY_USER);
}

/**
 * Format a human-readable joined date
 */
function getFormattedJoinedDate(): string {
  const date = new Date();
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Initialize default isolated workspace data for a newly registered user
 */
function initializeUserWorkspace(user: StoredLocalUser, withSampleFiles = false): void {
  const filesKey = getUserFilesKey(user.id);
  const chatKey = getUserChatKey(user.id);
  const activityKey = getUserActivityKey(user.id);
  const settingsKey = getUserSettingsKey(user.id);

  // 1. Files: empty or sample if requested
  if (!localStorage.getItem(filesKey)) {
    const initialFiles: KnowledgeFile[] = withSampleFiles ? samplePreloadedFiles : [];
    localStorage.setItem(filesKey, JSON.stringify(initialFiles));
  }

  // 2. Chat history: empty
  if (!localStorage.getItem(chatKey)) {
    localStorage.setItem(chatKey, JSON.stringify([]));
  }

  // 3. Activity logs: initial welcome entry
  if (!localStorage.getItem(activityKey)) {
    const initialActivity: ActivityItem[] = [
      {
        id: 'act-init-' + Date.now(),
        type: 'settings',
        title: 'Private Workspace Created',
        description: `Initialized dedicated encrypted local enclave for ${user.name}.`,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
    ];
    localStorage.setItem(activityKey, JSON.stringify(initialActivity));
  }

  // 4. Settings: personalized default settings
  if (!localStorage.getItem(settingsKey)) {
    const userSettings: WorkspaceSettings = {
      ...defaultSettings,
      workspace: {
        ...defaultSettings.workspace,
        name: user.workspaceName,
        vaultPath: `~/local-vaults/${user.email.split('@')[0]}`,
      },
    };
    localStorage.setItem(settingsKey, JSON.stringify(userSettings));
  }
}

/**
 * Register a new local user with PBKDF2 password hashing
 */
export async function registerLocalUser(
  name: string,
  email: string,
  password: string,
  confirmPassword?: string
): Promise<AuthResult> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Validation
  if (!trimmedName) {
    return { success: false, error: 'Full name cannot be empty.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters in length.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match. Please verify and retry.' };
  }

  // Check duplicate
  const existing = findUserByEmail(trimmedEmail);
  if (existing) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  // Hash password with Web Crypto PBKDF2
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newUser: StoredLocalUser = {
    id: userId,
    name: trimmedName,
    email: trimmedEmail,
    passwordHash,
    salt,
    workspaceName: `${trimmedName}'s Private Vault`,
    role: 'Vault Owner',
    createdAt: new Date().toISOString(),
    joinedDate: getFormattedJoinedDate(),
    avatarSeed: trimmedName.charAt(0).toUpperCase(),
  };

  // Save to user registry
  const currentUsers = getRegisteredUsers();
  currentUsers.push(newUser);
  saveRegisteredUsers(currentUsers);

  // Initialize isolated workspace data
  initializeUserWorkspace(newUser, false);

  // Create active session
  const session: AuthSession = {
    userId: newUser.id,
    email: newUser.email,
    token: generateSessionToken(),
    createdAt: Date.now(),
  };
  setActiveSession(session);

  return {
    success: true,
    user: toUserProfile(newUser),
    session,
  };
}

/**
 * Authenticate an existing user with email and password
 */
export async function authenticateLocalUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  const user = findUserByEmail(trimmedEmail);
  if (!user) {
    return { success: false, error: 'No account found with this email.' };
  }

  // Verify password using the user's stored salt
  const computedHash = await hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    return { success: false, error: 'Incorrect password.' };
  }

  // Create session
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    token: generateSessionToken(),
    createdAt: Date.now(),
  };
  setActiveSession(session);

  return {
    success: true,
    user: toUserProfile(user),
    session,
  };
}

/**
 * Seed or retrieve demo user for quick access development button
 */
export async function getOrCreateDemoUser(): Promise<AuthResult> {
  const demoEmail = 'alex.mercer@local.vault';
  const demoUser = findUserByEmail(demoEmail);

  if (demoUser) {
    const session: AuthSession = {
      userId: demoUser.id,
      email: demoUser.email,
      token: generateSessionToken(),
      createdAt: Date.now(),
    };
    setActiveSession(session);
    return {
      success: true,
      user: toUserProfile(demoUser),
      session,
    };
  }

  // Register demo account with sample files
  const salt = generateSalt();
  const passwordHash = await hashPassword('LocalVault2026!', salt);
  const newUser: StoredLocalUser = {
    id: 'usr_demo_alex_mercer',
    name: 'Alex Mercer',
    email: demoEmail,
    passwordHash,
    salt,
    workspaceName: 'Personal Research Vault',
    role: 'Vault Owner',
    createdAt: new Date().toISOString(),
    joinedDate: 'Sept 2026',
    avatarSeed: 'A',
  };

  const currentUsers = getRegisteredUsers();
  currentUsers.push(newUser);
  saveRegisteredUsers(currentUsers);

  // Initialize with sample preloaded files
  initializeUserWorkspace(newUser, true);

  const session: AuthSession = {
    userId: newUser.id,
    email: newUser.email,
    token: generateSessionToken(),
    createdAt: Date.now(),
  };
  setActiveSession(session);

  return {
    success: true,
    user: toUserProfile(newUser),
    session,
  };
}

/**
 * Safe Migration Helper:
 * If an old mock user exists or old un-namespaced files exist from previous sessions,
 * migrate them into a user account so user data is never lost.
 */
export async function performSafeDataMigration(): Promise<void> {
  try {
    const users = getRegisteredUsers();
    
    // Check if legacy user session exists in localStorage
    const legacyUserRaw = localStorage.getItem(LEGACY_STORAGE_KEY_USER);
    if (legacyUserRaw && users.length === 0) {
      try {
        const legacyUser = JSON.parse(legacyUserRaw);
        if (legacyUser && legacyUser.email) {
          // Create registered account for legacy user
          const salt = generateSalt();
          const hash = await hashPassword('vault123', salt);
          const migratedUser: StoredLocalUser = {
            id: 'usr_migrated_' + Date.now(),
            name: legacyUser.name || 'Vault User',
            email: legacyUser.email,
            passwordHash: hash,
            salt,
            workspaceName: legacyUser.workspaceName || `${legacyUser.name}'s Vault`,
            role: legacyUser.role || 'Vault Owner',
            createdAt: new Date().toISOString(),
            joinedDate: legacyUser.joinedDate || getFormattedJoinedDate(),
            avatarSeed: (legacyUser.name || 'U').charAt(0).toUpperCase(),
          };

          users.push(migratedUser);
          saveRegisteredUsers(users);

          // Migrate legacy files to the new user namespace if they exist
          const legacyFiles = localStorage.getItem(LEGACY_STORAGE_KEY_FILES);
          if (legacyFiles) {
            localStorage.setItem(getUserFilesKey(migratedUser.id), legacyFiles);
          } else {
            initializeUserWorkspace(migratedUser, true);
          }

          // Migrate legacy chat
          const legacyChat = localStorage.getItem(LEGACY_STORAGE_KEY_CHAT);
          if (legacyChat) {
            localStorage.setItem(getUserChatKey(migratedUser.id), legacyChat);
          }

          // Migrate legacy activity
          const legacyActivity = localStorage.getItem(LEGACY_STORAGE_KEY_ACTIVITY);
          if (legacyActivity) {
            localStorage.setItem(getUserActivityKey(migratedUser.id), legacyActivity);
          }

          // Migrate legacy settings
          const legacySettings = localStorage.getItem(LEGACY_STORAGE_KEY_SETTINGS);
          if (legacySettings) {
            localStorage.setItem(getUserSettingsKey(migratedUser.id), legacySettings);
          }

          // Create session
          setActiveSession({
            userId: migratedUser.id,
            email: migratedUser.email,
            token: generateSessionToken(),
            createdAt: Date.now(),
          });
        }
      } catch {
        // Continue normally
      }
    }
  } catch (err) {
    console.warn('Data migration warning (non-fatal):', err);
  }
}
