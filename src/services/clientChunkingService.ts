/**
 * LOCALIQ Intelligent Client-Side Text Chunking Engine
 * 
 * Performs semantic text chunking directly in the browser with:
 * - 5-level intelligent boundary hierarchy:
 *   1. Paragraph boundary
 *   2. Sentence boundary
 *   3. Line boundary
 *   4. Word boundary
 *   5. Character boundary (fallback only for unbroken tokens > CHUNK_SIZE)
 * - Natural overlap at word boundaries (~120 chars)
 * - Strict page provenance preservation (page_number, page_start, page_end)
 * - Deterministic, collision-free chunk IDs
 * - Zero external cloud dependencies (100% air-gapped)
 */

import { DocumentChunk } from '../types';

/**
 * Configurable default constants
 */
export const CHUNK_SIZE = 700;
export const CHUNK_OVERLAP = 120;

export interface ExtractedPageInput {
  page_number: number | null;
  text: string;
  characters?: number;
  has_images?: boolean;
  extraction_method?: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string;
  location_label?: string;
}

export interface ChunkingConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  fileId: string;
  fileName: string;
}

/**
 * Normalizes text: trims excess whitespace while preserving paragraph breaks
 */
export function normalizeChunkText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n') // Normalize Windows newlines
    .replace(/\r/g, '\n')   // Normalize old Mac newlines
    .replace(/[^\S\r\n]+/g, ' ') // Collapse horizontal whitespace (spaces, tabs) to 1 space
    .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to standard double newlines (paragraphs)
    .trim();
}

/**
 * Extracts tail words from a text block up to targetLen characters without cutting any words.
 * Guarantees that the returned text is strictly smaller than the input text to prevent loops.
 */
export function extractTailWords(text: string, targetLen: number): string {
  if (!text || text.length <= targetLen) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return '';

  const selectedWords: string[] = [];
  let currentLen = 0;

  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    const wouldBe = currentLen + w.length + (selectedWords.length > 0 ? 1 : 0);
    if (wouldBe <= targetLen || selectedWords.length === 0) {
      selectedWords.unshift(w);
      currentLen = wouldBe;
    } else {
      break;
    }
  }

  // Safety guard: overlap must NEVER include all words of the chunk
  if (selectedWords.length >= words.length) {
    selectedWords.shift();
  }

  return selectedWords.join(' ').trim();
}

/**
 * Decomposes a text block into fine-grained atomic units using the 5-stage boundary hierarchy:
 * 1. Paragraph boundary (double newlines)
 * 2. Sentence boundary (. ? ! … followed by space or newline)
 * 3. Line boundary (single newline / list items / headers)
 * 4. Word boundary (spaces)
 * 5. Character boundary (fallback only for unbroken words > chunkSize)
 */
export function decomposeIntoSemanticUnits(cleanText: string, chunkSize: number): string[] {
  if (!cleanText) return [];

  // Level 1: Split into paragraphs
  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const units: string[] = [];

  for (const paragraph of paragraphs) {
    // Level 2: Split paragraph into sentences on punctuation (. ? ! … with optional closing quotes)
    const sentences = paragraph
      .split(/(?<=[.?!…]["'”’)]?)\s+|\n+/)
      .map(s => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      if (sentence.length <= chunkSize) {
        units.push(sentence);
      } else {
        // Level 3: Split long sentence by linebreaks (e.g. headers or bullet lists)
        const lines = sentence
          .split(/\n+/)
          .map(l => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          if (line.length <= chunkSize) {
            units.push(line);
          } else {
            // Level 4: Split line by word boundaries (whitespace)
            const words = line.split(/\s+/).filter(Boolean);
            let currentWordUnit = '';

            for (const word of words) {
              if (word.length > chunkSize) {
                // Level 5: Character boundary fallback (unbroken token exceeds chunkSize)
                if (currentWordUnit) {
                  units.push(currentWordUnit);
                  currentWordUnit = '';
                }
                let remaining = word;
                while (remaining.length > 0) {
                  units.push(remaining.slice(0, chunkSize));
                  remaining = remaining.slice(chunkSize);
                }
              } else if (currentWordUnit.length + word.length + 1 > chunkSize) {
                if (currentWordUnit) {
                  units.push(currentWordUnit);
                }
                currentWordUnit = word;
              } else {
                currentWordUnit = currentWordUnit ? `${currentWordUnit} ${word}` : word;
              }
            }

            if (currentWordUnit) {
              units.push(currentWordUnit);
            }
          }
        }
      }
    }
  }

  return units;
}

export class ClientChunkingService {
  /**
   * Splits a single page's text into semantic chunks respecting
   * paragraph, sentence, and word boundaries with configurable overlap.
   */
  static splitTextIntoChunks(
    text: string,
    fileId: string,
    fileName: string,
    pageNumber: number | null,
    startChunkIndex = 0,
    chunkSize = CHUNK_SIZE,
    chunkOverlap = CHUNK_OVERLAP,
    extractionMethod: 'pdf_text' | 'ocr' | 'docx' | 'txt' | 'audio' | 'docx_local_parser' | string = 'pdf_text',
    locationLabel?: string,
    sourceType: 'document_content' | 'application_metadata' = 'document_content'
  ): DocumentChunk[] {
    const cleanText = normalizeChunkText(text);
    if (!cleanText) return [];

    const defaultLocation =
      locationLabel ||
      (pageNumber !== null && pageNumber !== undefined
        ? (extractionMethod === 'ocr' ? `Page ${pageNumber} (Local OCR)` : `Page ${pageNumber}`)
        : `Section ${startChunkIndex + 1}`);

    const isImage =
      extractionMethod === 'tesseract_local_ocr' ||
      extractionMethod === 'ocr' ||
      Boolean(locationLabel && locationLabel.toLowerCase().includes('image'));

    const isAudio =
      extractionMethod === 'local_speech_to_text' ||
      extractionMethod === 'audio' ||
      Boolean(locationLabel && locationLabel.toLowerCase().includes('audio'));

    const pageToken =
      pageNumber !== null && pageNumber !== undefined
        ? `p${pageNumber}`
        : isAudio
        ? 'aud_sec'
        : isImage
        ? 'img_sec'
        : 'sec';

    // Ensure overlap is strictly less than chunk size
    const effectiveOverlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2));

    // Fast path: If the entire text fits within a single chunk, return immediately
    if (cleanText.length <= chunkSize) {
      const chunkId = `${fileId}_${pageToken}_c${startChunkIndex}`;
      return [
        {
          chunk_id: chunkId,
          file_id: fileId,
          file_name: fileName,
          page_number: pageNumber,
          page_start: pageNumber,
          page_end: pageNumber,
          chunk_index: startChunkIndex,
          text: cleanText,
          character_count: cleanText.length,
          location_label: defaultLocation,
          extraction_method: extractionMethod as any,
          sourceType,
          metadata: {
            isMetadataOnly: sourceType === 'application_metadata',
            excludedFromIndex: sourceType === 'application_metadata',
          },
        },
      ];
    }

    // Decompose text into atomic semantic units (Levels 1 to 5)
    const units = decomposeIntoSemanticUnits(cleanText, chunkSize);
    if (units.length === 0) return [];

    const chunks: DocumentChunk[] = [];
    let currentUnits: string[] = [];
    let currentLen = 0;
    let globalIndex = startChunkIndex;

    for (const unit of units) {
      const unitLen = unit.length;
      const separatorLen = currentUnits.length > 0 ? 1 : 0;

      // If adding this unit exceeds the target chunk size, emit the chunk
      if (currentUnits.length > 0 && currentLen + separatorLen + unitLen > chunkSize) {
        const chunkStr = currentUnits.join(' ').trim();
        const chunkId = `${fileId}_${pageToken}_c${globalIndex}`;

        chunks.push({
          chunk_id: chunkId,
          file_id: fileId,
          file_name: fileName,
          page_number: pageNumber,
          page_start: pageNumber,
          page_end: pageNumber,
          chunk_index: globalIndex,
          text: chunkStr,
          character_count: chunkStr.length,
          location_label: defaultLocation,
          extraction_method: extractionMethod as any,
          sourceType,
          metadata: {
            isMetadataOnly: sourceType === 'application_metadata',
            excludedFromIndex: sourceType === 'application_metadata',
          },
        });
        globalIndex++;

        // Calculate overlap units from the tail of currentUnits
        const overlapUnits: string[] = [];
        let overlapLen = 0;

        for (let i = currentUnits.length - 1; i >= 0; i--) {
          const u = currentUnits[i];
          const wouldBe = overlapLen + u.length + (overlapUnits.length > 0 ? 1 : 0);
          if (wouldBe <= effectiveOverlap || overlapUnits.length === 0) {
            overlapUnits.unshift(u);
            overlapLen = wouldBe;
          } else {
            break;
          }
        }

        // Safety: Overlap units must never equal or exceed all currentUnits
        if (overlapUnits.length >= currentUnits.length) {
          overlapUnits.shift();
        }

        // If overlapUnits is empty because the single unit was long, extract tail words
        if (overlapUnits.length === 0 && chunkStr.length > effectiveOverlap) {
          const tail = extractTailWords(chunkStr, effectiveOverlap);
          if (tail && tail !== chunkStr) {
            overlapUnits.push(tail);
          }
        }

        currentUnits = [...overlapUnits];
        currentLen = currentUnits.reduce((acc, u) => acc + u.length, 0) + Math.max(0, currentUnits.length - 1);
      }

      currentUnits.push(unit);
      currentLen += unitLen + (currentUnits.length > 1 ? 1 : 0);
    }

    // Flush remaining units
    if (currentUnits.length > 0) {
      const chunkStr = currentUnits.join(' ').trim();
      if (chunkStr && (chunks.length === 0 || chunks[chunks.length - 1].text !== chunkStr)) {
        const chunkId = `${fileId}_${pageToken}_c${globalIndex}`;
        chunks.push({
          chunk_id: chunkId,
          file_id: fileId,
          file_name: fileName,
          page_number: pageNumber,
          page_start: pageNumber,
          page_end: pageNumber,
          chunk_index: globalIndex,
          text: chunkStr,
          character_count: chunkStr.length,
          location_label: defaultLocation,
          extraction_method: extractionMethod as any,
          sourceType,
          metadata: {
            isMetadataOnly: sourceType === 'application_metadata',
            excludedFromIndex: sourceType === 'application_metadata',
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Synchronously chunks a list of extracted document pages, preserving page provenance.
   * Skips empty pages without error.
   */
  static chunkDocumentPages(
    fileId: string,
    fileName: string,
    pages: ExtractedPageInput[],
    options?: {
      chunkSize?: number;
      chunkOverlap?: number;
    }
  ): DocumentChunk[] {
    const chunkSize = options?.chunkSize ?? CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap ?? CHUNK_OVERLAP;

    const allChunks: DocumentChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      const pageNum = page.page_number;
      const pageText = page.text || '';

      if (!pageText.trim()) {
        // Skip empty pages without producing 0-character chunks
        continue;
      }

      const pageChunks = this.splitTextIntoChunks(
        pageText,
        fileId,
        fileName,
        pageNum,
        globalChunkIndex,
        chunkSize,
        chunkOverlap,
        page.extraction_method,
        page.location_label
      );

      allChunks.push(...pageChunks);
      globalChunkIndex += pageChunks.length;
    }

    return allChunks;
  }

  /**
   * Asynchronously chunks extracted pages, yielding the browser event loop
   * on multi-page documents to keep UI smooth and 60fps responsive.
   */
  static async chunkDocumentPagesAsync(
    fileId: string,
    fileName: string,
    pages: ExtractedPageInput[],
    options?: {
      chunkSize?: number;
      chunkOverlap?: number;
      onProgress?: (processedPages: number, totalPages: number, chunksCreated: number) => void;
    }
  ): Promise<DocumentChunk[]> {
    const chunkSize = options?.chunkSize ?? CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap ?? CHUNK_OVERLAP;

    const allChunks: DocumentChunk[] = [];
    let globalChunkIndex = 0;
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const pageNum = page.page_number;
      const pageText = page.text || '';

      if (pageText.trim()) {
        const pageChunks = this.splitTextIntoChunks(
          pageText,
          fileId,
          fileName,
          pageNum,
          globalChunkIndex,
          chunkSize,
          chunkOverlap,
          page.extraction_method,
          page.location_label
        );

        allChunks.push(...pageChunks);
        globalChunkIndex += pageChunks.length;
      }

      options?.onProgress?.(i + 1, totalPages, allChunks.length);

      // Yield event loop every 3 pages on documents with more than 5 pages
      if (totalPages > 5 && i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return allChunks;
  }
}
