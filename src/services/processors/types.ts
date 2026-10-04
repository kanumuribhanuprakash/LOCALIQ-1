import { SupportedFileType, FileCategory, DocumentChunk, PageDiagnostic, PdfDiagnosticData } from '../../types';

export interface ExtractedSection {
  page_number?: number | null;
  location_label: string; // e.g. "Page 1", "Section 1 / Paragraph 2", "Image OCR", "Audio Transcript"
  text: string;
  characters: number;
  status?: 'SUCCESS' | 'NO_TEXT' | 'FAILED';
  textItemCount?: number;
  extraction_method?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
  ocr_confidence?: number;
  pdfjsTextChars?: number;
  ocrChars?: number;
  ocrRequired?: boolean;
  chunksCount?: number;
  error?: string;
}

export interface ProcessorResult {
  fileId: string;
  fileName: string;
  fileType: SupportedFileType;
  category: FileCategory;
  totalCharacters: number;
  sections: ExtractedSection[];
  fullText: string;
  isEmpty: boolean;
  extractionStatus: 'Text Extracted' | 'Partially Extracted' | 'OCR Required' | 'OCR Failed' | 'Failed' | 'Unsupported Format' | 'Unsupported Image Format' | 'No Text Detected';
  errorMessage?: string;
  errorStage?: string;
  errorType?: string;
  pdfjsError?: string;
  stackTrace?: string;
  chunks: DocumentChunk[];
  metadata: {
    processorName: string;
    pageCount?: number;
    sectionCount?: number;
    tableCount?: number;
    headingCount?: number;
    extractablePagesCount?: number;
    ocrRequiredPagesCount?: number;
    failedPagesCount?: number;
    textPagesCount?: number;
    ocrPagesCount?: number;
    textCharacters?: number;
    ocrCharacters?: number;
    totalTextItems?: number;
    ocrConfidence?: number;
    isScanned?: boolean;
    requiresOcr?: boolean;
    visualLimitationNotice?: string;
    truthfulProvenanceType: 'Page' | 'Document Section / Paragraph' | 'Image OCR Content' | 'Audio Transcript';
    imageDimensions?: { width: number; height: number };
    originalDimensions?: { width: number; height: number };
    pdfDiagnostic?: PdfDiagnosticData;
    pageDiagnostics?: PageDiagnostic[];
  };
}

export interface ProcessorOptions {
  fileId?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  onProgress?: (progress: {
    stage: 'extracting' | 'ocr' | 'transcribing' | 'chunking' | 'complete';
    current: number;
    total: number;
    message: string;
  }) => void;
}
