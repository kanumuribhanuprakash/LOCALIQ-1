import { FileCategory, SupportedFileType } from '../types';

export const SUPPORTED_EXTENSIONS: SupportedFileType[] = [
  'pdf',
  'doc',
  'docx',
  'txt',
  'md',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'mp3',
  'wav',
  'm4a',
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function getFileCategory(extension: string): FileCategory {
  const ext = (extension || '').toLowerCase().replace('.', '');
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  return 'document';
}

export function isValidSupportedExtension(filename: string): boolean {
  const ext = (filename || '').split('.').pop()?.toLowerCase() as SupportedFileType;
  if (!ext) return false;
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatUploadLabel(timestamp?: number, defaultDate?: string): string {
  if (!timestamp) {
    if (defaultDate && defaultDate.includes('Today')) return defaultDate;
    return 'Uploaded Today';
  }
  const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
  if (diffHours < 24) {
    return 'Uploaded Today';
  } else if (diffHours < 48) {
    return 'Uploaded Yesterday';
  }
  return formatDate(new Date(timestamp));
}

export function getFileTypeBadgeColor(ext: SupportedFileType): string {
  switch (ext) {
    case 'pdf':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'doc':
    case 'docx':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'txt':
    case 'md':
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'mp3':
    case 'wav':
    case 'm4a':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
  }
}

export interface FileValidationError {
  fileName: string;
  reason: string;
}

export function validateUploadedFiles(files: FileList | File[]): {
  validFiles: File[];
  errors: FileValidationError[];
} {
  const fileArray = Array.from(files);
  const validFiles: File[] = [];
  const errors: FileValidationError[] = [];

  for (const file of fileArray) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (!ext || !SUPPORTED_EXTENSIONS.includes(ext as SupportedFileType)) {
      errors.push({
        fileName: file.name,
        reason: `Unsupported file format ".${ext || 'unknown'}". Allowed formats: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, MP3, WAV, M4A.`,
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({
        fileName: file.name,
        reason: `File size exceeds the 50 MB local vault threshold (${formatBytes(file.size)}).`,
      });
      continue;
    }

    if (file.size === 0) {
      errors.push({
        fileName: file.name,
        reason: `File is empty (0 bytes).`,
      });
      continue;
    }

    validFiles.push(file);
  }

  return { validFiles, errors };
}

