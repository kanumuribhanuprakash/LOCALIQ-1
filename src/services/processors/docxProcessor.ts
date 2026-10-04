import mammoth from 'mammoth';
import { ClientChunkingService, CHUNK_SIZE, CHUNK_OVERLAP, ExtractedPageInput } from '../clientChunkingService';
import { ProcessorResult, ProcessorOptions, ExtractedSection } from './types';

export interface StructuredDocxBlock {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'text';
  text: string;
}

/**
 * Parses Mammoth HTML output into structured text blocks preserving
 * document order, headings, paragraphs, tables, and lists.
 */
export function parseMammothHtmlToStructuredBlocks(html: string): StructuredDocxBlock[] {
  if (!html || !html.trim()) return [];

  // 1. Browser Native DOMParser Path
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const blocks: StructuredDocxBlock[] = [];

      const children = Array.from(doc.body.children);
      if (children.length > 0) {
        for (const el of children) {
          const tag = el.tagName.toLowerCase();
          if (/^h[1-6]$/.test(tag)) {
            const text = el.textContent?.trim() || '';
            if (text) blocks.push({ type: 'heading', text: `Heading:\n${text}` });
          } else if (tag === 'p') {
            const text = el.textContent?.trim() || '';
            if (text) blocks.push({ type: 'paragraph', text });
          } else if (tag === 'table') {
            const rows: string[] = [];
            const trs = el.querySelectorAll('tr');
            trs.forEach((tr) => {
              const cells: string[] = [];
              tr.querySelectorAll('th, td').forEach((cell) => {
                cells.push(cell.textContent?.trim() || '');
              });
              if (cells.length > 0) {
                rows.push(cells.join(' | '));
              }
            });
            if (rows.length > 0) {
              blocks.push({ type: 'table', text: `Table:\n${rows.join('\n')}` });
            }
          } else if (tag === 'ul' || tag === 'ol') {
            const items: string[] = [];
            el.querySelectorAll('li').forEach((li) => {
              const itemText = li.textContent?.trim();
              if (itemText) items.push(`• ${itemText}`);
            });
            if (items.length > 0) {
              blocks.push({ type: 'list', text: items.join('\n') });
            }
          } else {
            const text = el.textContent?.trim() || '';
            if (text) blocks.push({ type: 'text', text });
          }
        }
        return blocks;
      }
    } catch {
      // Fallback to regex parser below
    }
  }

  // 2. Headless / SSR / Regex Fallback Path
  const blocks: StructuredDocxBlock[] = [];
  const tagRegex = /<(h[1-6]|p|table|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];

    if (/^h[1-6]$/.test(tag)) {
      const clean = content.replace(/<[^>]+>/g, '').trim();
      if (clean) blocks.push({ type: 'heading', text: `Heading:\n${clean}` });
    } else if (tag === 'p') {
      const clean = content.replace(/<[^>]+>/g, '').trim();
      if (clean) blocks.push({ type: 'paragraph', text: clean });
    } else if (tag === 'table') {
      const rows: string[] = [];
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = trRegex.exec(content)) !== null) {
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        const cells: string[] = [];
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
          const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
          cells.push(cellText);
        }
        if (cells.length > 0) rows.push(cells.join(' | '));
      }
      if (rows.length > 0) {
        blocks.push({ type: 'table', text: `Table:\n${rows.join('\n')}` });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(content)) !== null) {
        const itemText = liMatch[1].replace(/<[^>]+>/g, '').trim();
        if (itemText) items.push(`• ${itemText}`);
      }
      if (items.length > 0) blocks.push({ type: 'list', text: items.join('\n') });
    }
  }

  return blocks;
}

export class DOCXProcessor {
  /**
   * Validate that file has PK zip signature used by DOCX OpenXML packages (0x50, 0x4B, 0x03, 0x04)
   */
  static async validateDocxHeader(file: File): Promise<{ valid: boolean; reason?: string }> {
    if (file.size === 0) return { valid: false, reason: 'Empty file (0 bytes).' };
    if (file.size < 4) return { valid: false, reason: 'File is too small to be a valid DOCX.' };

    try {
      const slice = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(slice);
      // PK.. signature (0x50, 0x4B, 0x03, 0x04)
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        return {
          valid: false,
          reason: 'Invalid DOCX format: File does not contain standard OpenXML PK ZIP header signature.',
        };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: `Failed to inspect file header: ${err?.message || 'Read error'}` };
    }
  }

  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `docx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const chunkSize = options?.chunkSize || CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap || CHUNK_OVERLAP;

    options?.onProgress?.({
      stage: 'extracting',
      current: 0,
      total: 1,
      message: 'Validating DOCX package structure...',
    });

    // 1. Magic byte validation
    const headerCheck = await this.validateDocxHeader(file);
    if (!headerCheck.valid) {
      return {
        fileId,
        fileName,
        fileType: 'docx',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: file.size === 0,
        extractionStatus: 'Failed',
        errorMessage: headerCheck.reason || 'Invalid DOCX file.',
        chunks: [],
        metadata: {
          processorName: 'DOCX Local Parser',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    // 2. Read arrayBuffer in-memory
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (err: any) {
      return {
        fileId,
        fileName,
        fileType: 'docx',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Failed',
        errorMessage: `Failed to read DOCX into browser memory: ${err?.message || 'Access error'}`,
        chunks: [],
        metadata: {
          processorName: 'DOCX Local Parser',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    // 3. Extract text and HTML structure via Mammoth
    options?.onProgress?.({
      stage: 'extracting',
      current: 1,
      total: 1,
      message: 'Extracting headings, paragraphs, and tables from DOCX OpenXML...',
    });

    let htmlContent = '';
    let rawTextFallback = '';
    try {
      const mammothOptions: any = { arrayBuffer };
      if (typeof Buffer !== 'undefined') {
        mammothOptions.buffer = Buffer.isBuffer(arrayBuffer)
          ? arrayBuffer
          : Buffer.from(arrayBuffer);
      }
      const [htmlResult, rawResult] = await Promise.all([
        mammoth.convertToHtml(mammothOptions),
        mammoth.extractRawText(mammothOptions),
      ]);
      htmlContent = htmlResult?.value || '';
      rawTextFallback = rawResult?.value || '';
    } catch (extractErr: any) {
      return {
        fileId,
        fileName,
        fileType: 'docx',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Failed',
        errorMessage: `DOCX extraction error: ${extractErr?.message || 'Corrupted OpenXML document structure'}`,
        chunks: [],
        metadata: {
          processorName: 'DOCX Local Parser',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    // Parse into structured blocks
    const blocks = parseMammothHtmlToStructuredBlocks(htmlContent);

    let cleanFullText = '';
    let tableCount = 0;
    let headingCount = 0;

    if (blocks.length > 0) {
      cleanFullText = blocks.map((b) => b.text).join('\n\n').trim();
      tableCount = blocks.filter((b) => b.type === 'table').length;
      headingCount = blocks.filter((b) => b.type === 'heading').length;
    } else {
      cleanFullText = rawTextFallback.trim();
    }

    if (!cleanFullText) {
      return {
        fileId,
        fileName,
        fileType: 'docx',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: true,
        extractionStatus: 'Failed',
        errorMessage: 'Empty DOCX document: Document contains no text content.',
        chunks: [],
        metadata: {
          processorName: 'DOCX Local Parser',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    // 4. Build logical sections and chunking pages with truthful provenance
    // Note: Accurate physical page numbers cannot be obtained in a browser without a full Word layout engine.
    // As instructed by Section 4: "Do NOT invent page numbers. DOCX does not necessarily provide reliable fixed page numbers. Use: page_number = null unless an actual page number is available from the source/parser."
    const sections: ExtractedSection[] = [];
    const chunkingPages: ExtractedPageInput[] = [];

    // Group blocks or paragraphs into sections of ~1500–2000 chars
    const units = blocks.length > 0
      ? blocks.map((b) => b.text)
      : cleanFullText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    let currentSectionText = '';
    let sectionIdx = 1;
    let unitStartIdx = 1;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (currentSectionText.length + unit.length > 2000 && currentSectionText.length > 0) {
        const locationLabel = `Document section ${sectionIdx} (Paragraphs ${unitStartIdx}–${i})`;
        const trimmedText = currentSectionText.trim();
        sections.push({
          page_number: null,
          location_label: locationLabel,
          text: trimmedText,
          characters: trimmedText.length,
          extraction_method: 'docx_local_parser',
          status: 'SUCCESS',
        });
        chunkingPages.push({
          page_number: null,
          location_label: locationLabel,
          text: trimmedText,
          characters: trimmedText.length,
          extraction_method: 'docx_local_parser',
        });
        sectionIdx++;
        unitStartIdx = i + 1;
        currentSectionText = unit + '\n\n';
      } else {
        currentSectionText += (currentSectionText ? '\n\n' : '') + unit;
      }
    }

    if (currentSectionText.trim().length > 0) {
      const locationLabel = `Document section ${sectionIdx} (Paragraphs ${unitStartIdx}–${units.length})`;
      const trimmedText = currentSectionText.trim();
      sections.push({
        page_number: null,
        location_label: locationLabel,
        text: trimmedText,
        characters: trimmedText.length,
        extraction_method: 'docx_local_parser',
        status: 'SUCCESS',
      });
      chunkingPages.push({
        page_number: null,
        location_label: locationLabel,
        text: trimmedText,
        characters: trimmedText.length,
        extraction_method: 'docx_local_parser',
      });
    }

    options?.onProgress?.({
      stage: 'chunking',
      current: sections.length,
      total: sections.length,
      message: 'Generating semantic chunks from DOCX sections...',
    });

    const rawChunks = ClientChunkingService.chunkDocumentPages(fileId, fileName, chunkingPages, {
      chunkSize,
      chunkOverlap,
    });

    const chunks = rawChunks.map((c, idx) => {
      const matchingSection = sections[idx] || sections[0];
      return {
        ...c,
        page_number: null,
        page_start: null,
        page_end: null,
        location_label: matchingSection?.location_label || `Document section ${idx + 1} / paragraph`,
        extraction_method: 'docx_local_parser' as const,
        sourceType: 'document_content' as const,
        file_type: 'docx' as const,
      };
    });

    return {
      fileId,
      fileName,
      fileType: 'docx',
      category: 'document',
      totalCharacters: cleanFullText.length,
      sections,
      fullText: cleanFullText,
      isEmpty: false,
      extractionStatus: 'Text Extracted',
      chunks,
      metadata: {
        processorName: 'DOCX Local Parser',
        sectionCount: sections.length,
        tableCount,
        headingCount,
        truthfulProvenanceType: 'Document Section / Paragraph',
      },
    };
  }
}
