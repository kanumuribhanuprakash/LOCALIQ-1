import { ClientChunkingService, CHUNK_SIZE, CHUNK_OVERLAP, ExtractedPageInput } from '../clientChunkingService';
import { ProcessorResult, ProcessorOptions, ExtractedSection } from './types';

export class TXTProcessor {
  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `txt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const chunkSize = options?.chunkSize || CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap || CHUNK_OVERLAP;

    options?.onProgress?.({
      stage: 'extracting',
      current: 1,
      total: 1,
      message: 'Reading text file content locally...',
    });

    // Check empty file
    if (file.size === 0) {
      return {
        fileId,
        fileName,
        fileType: 'txt',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: true,
        extractionStatus: 'Failed',
        errorMessage: 'Empty file (0 bytes). Document contains no content to index.',
        chunks: [],
        metadata: {
          processorName: 'Native Browser TextReader',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    let rawText: string;
    try {
      rawText = await file.text();
    } catch (err: any) {
      return {
        fileId,
        fileName,
        fileType: 'txt',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Failed',
        errorMessage: `Failed to read document text: ${err?.message || 'Access error'}`,
        chunks: [],
        metadata: {
          processorName: 'Native Browser TextReader',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    const cleanText = rawText.trim();
    if (!cleanText) {
      return {
        fileId,
        fileName,
        fileType: 'txt',
        category: 'document',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: true,
        extractionStatus: 'Failed',
        errorMessage: 'Empty text document: File contains only whitespace or blank characters.',
        chunks: [],
        metadata: {
          processorName: 'Native Browser TextReader',
          truthfulProvenanceType: 'Document Section / Paragraph',
        },
      };
    }

    // Split into paragraphs / sections to establish honest provenance without inventing fake pages
    const rawParagraphs = cleanText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const sections: ExtractedSection[] = [];
    const chunkingPages: ExtractedPageInput[] = [];

    // Group paragraphs into logical sections (~2000 chars each) for chunking provenance
    let currentSectionText = '';
    let sectionIdx = 1;

    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i];
      if (currentSectionText.length + p.length > 2000 && currentSectionText.length > 0) {
        sections.push({
          page_number: sectionIdx,
          location_label: `Section ${sectionIdx} (Paragraphs)`,
          text: currentSectionText.trim(),
          characters: currentSectionText.trim().length,
        });
        chunkingPages.push({
          page_number: sectionIdx,
          text: currentSectionText.trim(),
          characters: currentSectionText.trim().length,
        });
        sectionIdx++;
        currentSectionText = p + '\n\n';
      } else {
        currentSectionText += (currentSectionText ? '\n\n' : '') + p;
      }
    }

    if (currentSectionText.trim().length > 0) {
      sections.push({
        page_number: sectionIdx,
        location_label: `Section ${sectionIdx} (Paragraphs)`,
        text: currentSectionText.trim(),
        characters: currentSectionText.trim().length,
      });
      chunkingPages.push({
        page_number: sectionIdx,
        text: currentSectionText.trim(),
        characters: currentSectionText.trim().length,
      });
    }

    options?.onProgress?.({
      stage: 'chunking',
      current: sections.length,
      total: sections.length,
      message: 'Generating semantic chunks with word-boundary preservation...',
    });

    const rawChunks = ClientChunkingService.chunkDocumentPages(fileId, fileName, chunkingPages, {
      chunkSize,
      chunkOverlap,
    });

    const chunks = rawChunks.map((c) => ({
      ...c,
      location_label: `Section ${c.page_number} / Paragraphs`,
      file_type: 'txt' as const,
    }));

    return {
      fileId,
      fileName,
      fileType: 'txt',
      category: 'document',
      totalCharacters: cleanText.length,
      sections,
      fullText: cleanText,
      isEmpty: false,
      extractionStatus: 'Text Extracted',
      chunks,
      metadata: {
        processorName: 'Native Browser TextReader',
        sectionCount: sections.length,
        truthfulProvenanceType: 'Document Section / Paragraph',
      },
    };
  }
}
