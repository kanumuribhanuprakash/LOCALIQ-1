/**
 * LOCALIQ Client-Side PDF Extraction Engine
 * Performs real, air-gapped PDF parsing page-by-page directly in the browser
 * using Mozilla PDF.js. No external server or cloud upload required.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import pdfjsWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { DocumentChunk, PageDiagnostic, PdfDiagnosticData } from '../types';
import { ClientChunkingService, CHUNK_SIZE, CHUNK_OVERLAP } from './clientChunkingService';
import { localOcrService } from './localOcrService';

// Configure Mozilla PDF.js worker URL with defensive fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  } catch (err) {
    console.warn('PDF.js workerSrc initialization notice:', err);
  }
}

export interface ExtractedPageData {
  page_number: number;
  text: string;
  characters: number;
  text_item_count: number;
  status: 'SUCCESS' | 'NO_TEXT' | 'FAILED';
  has_images?: boolean;
  ocr_required?: boolean;
  extraction_method?: 'pdf_text' | 'ocr';
  ocr_confidence?: number;
  location_label?: string;
  diagnostic_note?: string;
  error?: string;
  error_type?: string;
  pdfjs_error?: string;
  stack_trace?: string;
  pdfjs_text_chars?: number;
  ocr_chars?: number;
}

export interface ClientPdfExtractionResult {
  file_id: string;
  file_name: string;
  page_count: number;
  total_characters: number;
  total_text_items: number;
  text_pages_count: number;
  ocr_pages_count: number;
  text_characters: number;
  ocr_characters: number;
  extractable_pages_count: number;
  ocr_required_pages_count: number;
  failed_pages_count: number;
  pages: ExtractedPageData[];
  is_scanned: boolean;
  is_empty: boolean;
  requires_ocr: boolean;
  status: 'Text Extracted' | 'Partially Extracted' | 'OCR Required' | 'OCR Failed' | 'Failed';
  error_message?: string;
  error_stage?:
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
  error_type?: string;
  pdfjs_error?: string;
  stack_trace?: string;
  chunks: DocumentChunk[];
  diagnostic: PdfDiagnosticData;
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  stage: 'reading' | 'extracting' | 'ocr' | 'chunking' | 'complete';
  message?: string;
}

export class ClientPdfService {
  /**
   * Validate that the file has PDF content. Tolerant check inspecting up to 8KB.
   */
  static async validatePdfHeader(file: File): Promise<{ valid: boolean; reason?: string }> {
    if (file.size === 0) {
      return { valid: false, reason: 'Empty file (0 bytes).' };
    }
    if (file.size < 5) {
      return { valid: false, reason: 'File is too small to be a valid PDF.' };
    }

    try {
      // Check first 8KB for %PDF-
      const sliceSize = Math.min(file.size, 8192);
      const slice = await file.slice(0, sliceSize).arrayBuffer();
      const bytes = new Uint8Array(slice);
      const headerStr = new TextDecoder('latin1').decode(bytes);

      if (headerStr.includes('%PDF-')) {
        return { valid: true };
      }

      // If not in first 8KB, still allow PDF.js a chance but log warning
      console.warn('PDF magic bytes (%PDF-) not detected in initial 8KB; delegating to PDF.js stream parser.');
      return { valid: true };
    } catch (err: any) {
      return {
        valid: false,
        reason: `Failed to read file header: ${err?.message || 'Unknown read error'}`,
      };
    }
  }

  /**
   * Reads a PDF locally in the browser, extracts text page-by-page,
   * detects scanned/image-only pages, preserves truthful page numbers and metadata,
   * handles mixed PDFs with partial success, and splits valid extracted text into RAG chunks.
   */
  static async extractTextFromPdf(
    file: File,
    options?: {
      fileId?: string;
      chunkSize?: number;
      chunkOverlap?: number;
      onProgress?: (progress: ExtractionProgress) => void;
      signal?: AbortSignal;
    }
  ): Promise<ClientPdfExtractionResult> {
    const startTime = performance.now();
    const fileId = options?.fileId || `pdf-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const fileSize = file.size;
    const chunkSize = options?.chunkSize || 700;
    const chunkOverlap = options?.chunkOverlap || 120;

    const baseDiagnostic: PdfDiagnosticData = {
      fileName,
      fileSize,
      pdfjsVersion: (pdfjsLib as any).version || '6.3.289',
      pageCount: 0,
      extractablePagesCount: 0,
      ocrRequiredPagesCount: 0,
      failedPagesCount: 0,
      totalTextItems: 0,
      totalCharacters: 0,
      durationMs: 0,
      chunkCount: 0,
      embeddingCount: 0,
      vectorCount: 0,
      pageDiagnostics: [],
    };

    // 1. File validation stage
    const headerCheck = await this.validatePdfHeader(file);
    if (!headerCheck.valid) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        file_id: fileId,
        file_name: fileName,
        page_count: 0,
        total_characters: 0,
        total_text_items: 0,
        text_pages_count: 0,
        ocr_pages_count: 0,
        text_characters: 0,
        ocr_characters: 0,
        extractable_pages_count: 0,
        ocr_required_pages_count: 0,
        failed_pages_count: 0,
        pages: [],
        is_scanned: false,
        is_empty: file.size === 0,
        requires_ocr: false,
        status: 'Failed',
        error_stage: 'validation',
        error_type: 'FileValidationError',
        error_message: headerCheck.reason || 'Invalid PDF file format.',
        chunks: [],
        diagnostic: {
          ...baseDiagnostic,
          durationMs,
          errorStage: 'validation',
          errorType: 'FileValidationError',
          errorMessage: headerCheck.reason,
        },
      };
    }

    // 2. Read array buffer into memory
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        file_id: fileId,
        file_name: fileName,
        page_count: 0,
        total_characters: 0,
        total_text_items: 0,
        text_pages_count: 0,
        ocr_pages_count: 0,
        text_characters: 0,
        ocr_characters: 0,
        extractable_pages_count: 0,
        ocr_required_pages_count: 0,
        failed_pages_count: 0,
        pages: [],
        is_scanned: false,
        is_empty: false,
        requires_ocr: false,
        status: 'Failed',
        error_stage: 'validation',
        error_type: err?.name || 'FileReadError',
        error_message: `Unable to read file into memory: ${err?.message || 'File access error'}`,
        stack_trace: err?.stack,
        chunks: [],
        diagnostic: {
          ...baseDiagnostic,
          durationMs,
          errorStage: 'validation',
          errorType: err?.name || 'FileReadError',
          errorMessage: err?.message,
          stackTrace: err?.stack,
        },
      };
    }

    // 3. Load PDF Document via Mozilla PDF.js with local CMap & standard font endpoints
    let pdfDoc: any = null;
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      // Defensive defensive copy to prevent detached arrayBuffer issues
      const pdfBytes = new Uint8Array(arrayBuffer.slice(0));

      const loadingTask = pdfjsLib.getDocument({
        data: pdfBytes,
        cMapUrl: `${baseOrigin}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${baseOrigin}/standard_fonts/`,
        useSystemFonts: true,
        stopAtErrors: false,
        disableFontFace: false,
        verbosity: 0, // suppress noisy non-fatal internal font warnings
      });

      pdfDoc = await loadingTask.promise;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const errName = err?.name || 'PDFInitError';
      const errMsg = (err?.message || '').toLowerCase();
      const stack = err?.stack;

      // Detect password protection / encrypted files (Rule 11)
      if (
        errName === 'PasswordException' ||
        errMsg.includes('password') ||
        errMsg.includes('encrypt')
      ) {
        const passMsg = 'Password-protected PDF cannot be processed.';
        return {
          file_id: fileId,
          file_name: fileName,
          page_count: 0,
          total_characters: 0,
          total_text_items: 0,
          text_pages_count: 0,
          ocr_pages_count: 0,
          text_characters: 0,
          ocr_characters: 0,
          extractable_pages_count: 0,
          ocr_required_pages_count: 0,
          failed_pages_count: 0,
          pages: [],
          is_scanned: false,
          is_empty: false,
          requires_ocr: false,
          status: 'Failed',
          error_stage: 'document-init',
          error_type: 'PasswordException',
          error_message: passMsg,
          pdfjs_error: String(err),
          stack_trace: stack,
          chunks: [],
          diagnostic: {
            ...baseDiagnostic,
            durationMs,
            errorStage: 'document-init',
            errorType: 'PasswordException',
            errorMessage: passMsg,
            pdfjsError: String(err),
            stackTrace: stack,
          },
        };
      }

      // Detect corrupted PDF structure
      if (
        errName === 'InvalidPDFException' ||
        errMsg.includes('corrupt') ||
        errMsg.includes('structure') ||
        errMsg.includes('xref') ||
        errMsg.includes('trailer')
      ) {
        const corruptMsg = 'Corrupted PDF file. Could not parse document cross-reference table or trailer.';
        return {
          file_id: fileId,
          file_name: fileName,
          page_count: 0,
          total_characters: 0,
          total_text_items: 0,
          text_pages_count: 0,
          ocr_pages_count: 0,
          text_characters: 0,
          ocr_characters: 0,
          extractable_pages_count: 0,
          ocr_required_pages_count: 0,
          failed_pages_count: 0,
          pages: [],
          is_scanned: false,
          is_empty: false,
          requires_ocr: false,
          status: 'Failed',
          error_stage: 'document-init',
          error_type: errName,
          error_message: corruptMsg,
          pdfjs_error: String(err),
          stack_trace: stack,
          chunks: [],
          diagnostic: {
            ...baseDiagnostic,
            durationMs,
            errorStage: 'document-init',
            errorType: errName,
            errorMessage: corruptMsg,
            pdfjsError: String(err),
            stackTrace: stack,
          },
        };
      }

      // Generic PDF parsing error
      const genericMsg = `PDF initialization error: ${err?.message || 'Unrecognized PDF structure'}`;
      return {
        file_id: fileId,
        file_name: fileName,
        page_count: 0,
        total_characters: 0,
        total_text_items: 0,
        text_pages_count: 0,
        ocr_pages_count: 0,
        text_characters: 0,
        ocr_characters: 0,
        extractable_pages_count: 0,
        ocr_required_pages_count: 0,
        failed_pages_count: 0,
        pages: [],
        is_scanned: false,
        is_empty: false,
        requires_ocr: false,
        status: 'Failed',
        error_stage: 'document-init',
        error_type: errName,
        error_message: genericMsg,
        pdfjs_error: String(err),
        stack_trace: stack,
        chunks: [],
        diagnostic: {
          ...baseDiagnostic,
          durationMs,
          errorStage: 'document-init',
          errorType: errName,
          errorMessage: genericMsg,
          pdfjsError: String(err),
          stackTrace: stack,
        },
      };
    }

    const totalPages: number = pdfDoc.numPages || 0;
    if (totalPages === 0) {
      if (pdfDoc && typeof pdfDoc.destroy === 'function') {
        try { await pdfDoc.destroy(); } catch (_) {}
        pdfDoc = null;
      }
      const durationMs = Math.round(performance.now() - startTime);
      return {
        file_id: fileId,
        file_name: fileName,
        page_count: 0,
        total_characters: 0,
        total_text_items: 0,
        text_pages_count: 0,
        ocr_pages_count: 0,
        text_characters: 0,
        ocr_characters: 0,
        extractable_pages_count: 0,
        ocr_required_pages_count: 0,
        failed_pages_count: 0,
        pages: [],
        is_scanned: false,
        is_empty: true,
        requires_ocr: false,
        status: 'Failed',
        error_stage: 'document-init',
        error_type: 'EmptyDocumentError',
        error_message: 'Empty PDF: Document contains 0 pages.',
        chunks: [],
        diagnostic: {
          ...baseDiagnostic,
          durationMs,
          errorStage: 'document-init',
          errorType: 'EmptyDocumentError',
          errorMessage: 'Empty PDF: Document contains 0 pages.',
        },
      };
    }

    // 4. Page-by-page real text extraction with per-page isolation and Local OCR fallback
    const pagesData: ExtractedPageData[] = [];
    const pageDiagnostics: PageDiagnostic[] = [];
    let totalCharacters = 0;
    let totalTextItems = 0;
    let textPagesCount = 0;
    let ocrPagesCount = 0;
    let textCharacters = 0;
    let ocrCharacters = 0;
    let extractablePagesCount = 0;
    let ocrRequiredPagesCount = 0;
    let failedPagesCount = 0;
    let anyPageHasImages = false;

    options?.onProgress?.({
      currentPage: 0,
      totalPages,
      stage: 'extracting',
      message: `Preparing extraction for ${totalPages} pages...`,
    });

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (options?.signal?.aborted) {
        if (pdfDoc) {
          try { await pdfDoc.destroy(); } catch (_) {}
        }
        throw new DOMException('PDF extraction cancelled by user.', 'AbortError');
      }
      let pageText = '';
      let pageChars = 0;
      let pageItemCount = 0;
      let pageStatus: 'SUCCESS' | 'NO_TEXT' | 'FAILED' = 'SUCCESS';
      let pageError: string | undefined = undefined;
      let pageErrorType: string | undefined = undefined;
      let pagePdfjsError: string | undefined = undefined;
      let pageStackTrace: string | undefined = undefined;
      let pageHasImages = false;
      let pageOcrRequired = false;
      let pageExtractionMethod: 'pdf_text' | 'ocr' = 'pdf_text';
      let pageOcrConfidence: number | undefined = undefined;
      let pageLocationLabel = `Page ${pageNum}`;
      let pageDiagnosticNote = '';
      let initialPdfjsChars = 0;
      let ocrCharsCount = 0;

      let page: any = null;
      try {
        page = await pdfDoc.getPage(pageNum);

        // Inspect operators on page to detect scanned/image elements
        try {
          const ops = await page.getOperatorList();
          if (ops && ops.fnArray && pdfjsLib.OPS) {
            const imgOps = [
              pdfjsLib.OPS.paintImageXObject,
              pdfjsLib.OPS.paintInlineImageXObject,
              pdfjsLib.OPS.paintImageMaskXObject,
            ];
            pageHasImages = ops.fnArray.some((fn: number) => imgOps.includes(fn));
            if (pageHasImages) {
              anyPageHasImages = true;
            }
          }
        } catch {
          // Non-fatal operator inspection
        }

        // Extract text items from page
        const textContent = await page.getTextContent({
          includeMarkedContent: false,
          disableCombineTextItems: false,
        });

        const items = textContent?.items || [];
        pageItemCount = items.length;
        totalTextItems += pageItemCount;

        if (pageItemCount > 0) {
          // Assemble text preserving spacing, natural line breaks, and multi-column gaps
          let lastY: number | null = null;
          let lastX: number | null = null;
          let assembled = '';

          for (const item of items) {
            if ('str' in item) {
              const strItem = item as {
                str: string;
                transform?: number[];
                hasEOL?: boolean;
                width?: number;
              };
              const textStr = strItem.str;
              if (!textStr && !strItem.hasEOL) continue;

              const currentX = strItem.transform ? strItem.transform[4] : null;
              const currentY = strItem.transform ? strItem.transform[5] : null;

              if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
                // Different vertical line position -> newline
                assembled += '\n' + textStr;
              } else if (
                lastX !== null &&
                currentX !== null &&
                Math.abs(currentX - lastX) > 15
              ) {
                // Column spacing
                assembled += '   ' + textStr;
              } else if (
                assembled.length > 0 &&
                !assembled.endsWith('\n') &&
                !assembled.endsWith(' ') &&
                textStr.trim().length > 0
              ) {
                // Same line word separation
                assembled += ' ' + textStr;
              } else {
                assembled += textStr;
              }

              if (strItem.hasEOL) {
                assembled += '\n';
              }

              lastY = currentY;
              lastX =
                currentX !== null && strItem.width
                  ? currentX + strItem.width
                  : currentX;
            }
          }

          // Stage: Text normalization
          pageText = assembled
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          pageChars = pageText.length;
        }

        initialPdfjsChars = pageChars;
        ocrCharsCount = 0;

        // Check if page contains extractable digital text or requires real Local OCR
        if (pageChars < 25) {
          pageOcrRequired = true;
          console.log(
            `[PDF Extraction] Page ${pageNum}: Digital text insufficient (${pageChars} chars, ${pageItemCount} items). Triggering local on-device OCR...`
          );

          options?.onProgress?.({
            currentPage: pageNum,
            totalPages,
            stage: 'ocr',
            message: `Page ${pageNum}: Rendering high-DPI canvas & running local on-device OCR...`,
          });

          const ocrResult = await localOcrService.recognizePdfPage(page, pageNum, {
            scale: 2.0,
            onProgress: (pct) => {
              options?.onProgress?.({
                currentPage: pageNum,
                totalPages,
                stage: 'ocr',
                message: `Page ${pageNum} Local OCR: ${pct}%...`,
              });
            },
            onStatusMessage: (msg) => {
              options?.onProgress?.({
                currentPage: pageNum,
                totalPages,
                stage: 'ocr',
                message: `Page ${pageNum}: ${msg}`,
              });
            },
          });

          if (ocrResult.characters > 0) {
            pageText = ocrResult.text;
            pageChars = ocrResult.characters;
            ocrCharsCount = ocrResult.characters;
            pageStatus = 'SUCCESS';
            pageExtractionMethod = 'ocr';
            pageOcrConfidence = ocrResult.confidence;
            pageLocationLabel = `Page ${pageNum} (Local OCR)`;
            pageDiagnosticNote = `Extracted via Local OCR (${pageChars} chars, ${pageOcrConfidence}% confidence)`;
            ocrPagesCount++;
            ocrCharacters += pageChars;
            extractablePagesCount++;
            totalCharacters += pageChars;

            console.log(
              `[PDF Extraction] Page ${pageNum}: OCR Success — ${pageChars} chars, ${pageOcrConfidence}% confidence`
            );
          } else if (ocrResult.error) {
            pageStatus = 'FAILED';
            pageExtractionMethod = 'ocr';
            pageOcrRequired = true;
            failedPagesCount++;
            pageError = `Local OCR failed on page ${pageNum}: ${ocrResult.error}`;
            pageErrorType = 'LocalOcrError';
            pageDiagnosticNote = `Local OCR error: ${ocrResult.error}`;
          } else {
            pageStatus = 'NO_TEXT';
            pageOcrRequired = true;
            ocrRequiredPagesCount++;
            pageError = `Page ${pageNum} rendered for OCR, but no typographic characters were recognized.`;
            pageDiagnosticNote = 'Scanned page with no legible typographic text detected.';
          }
        } else {
          // Direct digital text extraction succeeded
          pageStatus = 'SUCCESS';
          pageExtractionMethod = 'pdf_text';
          pageLocationLabel = `Page ${pageNum}`;
          pageDiagnosticNote = `Direct PDF text layer (${pageChars} chars, ${pageItemCount} items)`;
          textPagesCount++;
          textCharacters += pageChars;
          extractablePagesCount++;
          totalCharacters += pageChars;
        }
      } catch (pageErr: any) {
        // Fallback to local OCR if getTextContent threw an unexpected error
        let ocrRecovered = false;
        if (page) {
          try {
            options?.onProgress?.({
              currentPage: pageNum,
              totalPages,
              stage: 'ocr',
              message: `Page ${pageNum}: Fallback local OCR running...`,
            });
            const fallbackOcr = await localOcrService.recognizePdfPage(page, pageNum, { scale: 2.0 });
            if (fallbackOcr.characters > 0) {
              pageText = fallbackOcr.text;
              pageChars = fallbackOcr.characters;
              ocrCharsCount = fallbackOcr.characters;
              pageStatus = 'SUCCESS';
              pageExtractionMethod = 'ocr';
              pageOcrConfidence = fallbackOcr.confidence;
              pageLocationLabel = `Page ${pageNum} (Local OCR)`;
              pageDiagnosticNote = `Recovered via fallback OCR (${pageChars} chars, ${pageOcrConfidence}% confidence)`;
              ocrPagesCount++;
              ocrCharacters += pageChars;
              extractablePagesCount++;
              totalCharacters += pageChars;
              ocrRecovered = true;
            }
          } catch {
            // Fallback OCR also threw
          }
        }

        if (!ocrRecovered) {
          pageStatus = 'FAILED';
          failedPagesCount++;
          pageError = pageErr?.message || 'PDF.js page extraction error';
          pageErrorType = pageErr?.name || 'PageExtractionError';
          pagePdfjsError = String(pageErr);
          pageStackTrace = pageErr?.stack;
          pageText = '';
          pageChars = 0;
          pageItemCount = 0;
        }
      } finally {
        if (page && typeof page.cleanup === 'function') {
          try {
            page.cleanup();
          } catch {
            // Ignore non-fatal page cleanup error
          }
        }
        page = null;
      }

      // Record page data
      pagesData.push({
        page_number: pageNum,
        text: pageText,
        characters: pageChars,
        text_item_count: pageItemCount,
        status: pageStatus,
        has_images: pageHasImages,
        ocr_required: pageOcrRequired,
        extraction_method: pageExtractionMethod,
        ocr_confidence: pageOcrConfidence,
        location_label: pageLocationLabel,
        diagnostic_note: pageDiagnosticNote,
        error: pageError,
        error_type: pageErrorType,
        pdfjs_error: pagePdfjsError,
        stack_trace: pageStackTrace,
        pdfjs_text_chars: initialPdfjsChars,
        ocr_chars: ocrCharsCount,
      });

      // Record page diagnostic
      pageDiagnostics.push({
        pageNumber: pageNum,
        status: pageStatus,
        characterCount: pageChars,
        textItemCount: pageItemCount,
        hasImages: pageHasImages,
        ocrRequired: pageOcrRequired,
        extractionMethod: pageExtractionMethod,
        ocrConfidence: pageOcrConfidence,
        diagnosticNote: pageDiagnosticNote,
        error: pageError,
        errorType: pageErrorType,
        pdfjsError: pagePdfjsError,
        stackTrace: pageStackTrace,
        pdfjsTextChars: initialPdfjsChars,
        ocrChars: ocrCharsCount,
      });

      // Development logging per Rule 3
      console.log(
        `[PDF Extraction] Page ${pageNum}: ${pageStatus} [${pageExtractionMethod}] — ${pageChars} chars, ${pageItemCount} items${
          pageError ? ` (${pageError})` : ''
        }`
      );

      options?.onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'extracting',
        message: `Extracted page ${pageNum} of ${totalPages} (${textPagesCount} digital text, ${ocrPagesCount} via local OCR)...`,
      });

      // Yield execution loop so UI remains responsive on multi-page files
      if (pageNum % 2 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    const diagnostic: PdfDiagnosticData = {
      fileName,
      fileSize,
      pdfjsVersion: (pdfjsLib as any).version || '6.3.289',
      pageCount: totalPages,
      extractablePagesCount,
      ocrRequiredPagesCount,
      failedPagesCount,
      textPagesCount,
      ocrPagesCount,
      textCharacters,
      ocrCharacters,
      totalTextItems,
      totalCharacters,
      durationMs,
      chunkCount: 0,
      embeddingCount: 0,
      vectorCount: 0,
      pageDiagnostics,
      pages: pageDiagnostics,
    };

    // 5. Document Classification

    // Case 1: All pages have 0 extractable text after both text & OCR attempts
    if (extractablePagesCount === 0) {
      if (pdfDoc && typeof pdfDoc.destroy === 'function') {
        try {
          await pdfDoc.destroy();
        } catch {
          // Ignore
        }
        pdfDoc = null;
      }
      const ocrAttempted = ocrRequiredPagesCount > 0 || failedPagesCount > 0;
      const failureMsg = ocrAttempted
        ? `Local OCR scanned all ${totalPages} pages, but no legible text was recognized.`
        : 'No selectable text was found in this PDF. The document may be scanned or image-based. OCR is required.';

      return {
        file_id: fileId,
        file_name: fileName,
        page_count: totalPages,
        total_characters: 0,
        total_text_items: totalTextItems,
        text_pages_count: 0,
        ocr_pages_count: 0,
        text_characters: 0,
        ocr_characters: 0,
        extractable_pages_count: 0,
        ocr_required_pages_count: ocrRequiredPagesCount,
        failed_pages_count: failedPagesCount,
        pages: pagesData,
        is_scanned: true,
        is_empty: totalTextItems === 0 && !anyPageHasImages,
        requires_ocr: !ocrAttempted,
        status: ocrAttempted ? 'OCR Failed' : 'OCR Required',
        error_stage: 'page-iteration',
        error_type: ocrAttempted ? 'LocalOcrFailed' : 'NoSelectableTextError',
        error_message: failureMsg,
        chunks: [],
        diagnostic: {
          ...diagnostic,
          errorStage: 'page-iteration',
          errorType: ocrAttempted ? 'LocalOcrFailed' : 'NoSelectableTextError',
          errorMessage: failureMsg,
        },
      };
    }

    // Filter only valid pages with non-empty text for chunking & embedding safety (Rule 12)
    const validPagesForChunking = pagesData.filter(
      (p) => p.status === 'SUCCESS' && p.characters > 0 && p.text.trim().length > 0
    );

    // Case 2: Partial Extraction or Full Extraction (Rule 6, 9)
    const isPartial = extractablePagesCount < totalPages;
    const documentStatus: 'Text Extracted' | 'Partially Extracted' = isPartial
      ? 'Partially Extracted'
      : 'Text Extracted';

    options?.onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'chunking',
      message: `Generating semantic chunks from ${extractablePagesCount} extracted pages (${ocrPagesCount} via local OCR)...`,
    });

    // Generate semantic chunks preserving real page numbers and provenance (Rule 13)
    const chunks = this.chunkExtractedPages(
      fileId,
      fileName,
      validPagesForChunking,
      chunkSize,
      chunkOverlap
    );

    options?.onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'complete',
      message: `Extraction complete: ${extractablePagesCount}/${totalPages} pages processed (${textPagesCount} text, ${ocrPagesCount} OCR) into ${chunks.length} chunks.`,
    });

    const summaryParts: string[] = [];
    if (textPagesCount > 0) {
      summaryParts.push(`${textPagesCount} digital text`);
    }
    if (ocrPagesCount > 0) {
      summaryParts.push(`${ocrPagesCount} via local OCR`);
    }
    if (failedPagesCount > 0) {
      summaryParts.push(`${failedPagesCount} failed`);
    }

    const finalSummaryMsg = isPartial
      ? `Partially Extracted: ${extractablePagesCount} of ${totalPages} pages extracted (${summaryParts.join(', ')}).`
      : undefined;

    // Cleanup PDF.js document to release worker and internal buffer memory
    if (pdfDoc && typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {
        // Non-fatal document cleanup error
      }
      pdfDoc = null;
    }

    return {
      file_id: fileId,
      file_name: fileName,
      page_count: totalPages,
      total_characters: totalCharacters,
      total_text_items: totalTextItems,
      text_pages_count: textPagesCount,
      ocr_pages_count: ocrPagesCount,
      text_characters: textCharacters,
      ocr_characters: ocrCharacters,
      extractable_pages_count: extractablePagesCount,
      ocr_required_pages_count: ocrRequiredPagesCount,
      failed_pages_count: failedPagesCount,
      pages: pagesData,
      is_scanned: anyPageHasImages && ocrPagesCount > 0,
      is_empty: false,
      requires_ocr: false,
      status: documentStatus,
      error_message: finalSummaryMsg,
      chunks,
      diagnostic: {
        ...diagnostic,
        chunkCount: chunks.length,
        errorMessage: finalSummaryMsg,
      },
    };
  }

  /**
   * Splits extracted document pages into semantic chunks respecting
   * paragraph, sentence, and word boundaries with configurable overlap.
   * Preserves file ID, file name, exact page number, and chunk index.
   */
  static chunkExtractedPages(
    fileId: string,
    fileName: string,
    pages: ExtractedPageData[],
    chunkSize = CHUNK_SIZE,
    chunkOverlap = CHUNK_OVERLAP
  ): DocumentChunk[] {
    return ClientChunkingService.chunkDocumentPages(fileId, fileName, pages, {
      chunkSize,
      chunkOverlap,
    });
  }
}
