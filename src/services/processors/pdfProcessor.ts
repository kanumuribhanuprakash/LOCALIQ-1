import { ClientPdfService } from '../clientPdfService';
import { ProcessorResult, ProcessorOptions, ExtractedSection } from './types';

export class PDFProcessor {
  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;

    options?.onProgress?.({
      stage: 'extracting',
      current: 0,
      total: 1,
      message: 'Validating PDF header and structure...',
    });

    const pdfResult = await ClientPdfService.extractTextFromPdf(file, {
      fileId,
      chunkSize: options?.chunkSize,
      chunkOverlap: options?.chunkOverlap,
      onProgress: (p) => {
        options?.onProgress?.({
          stage:
            p.stage === 'extracting' || p.stage === 'ocr'
              ? 'extracting'
              : p.stage === 'chunking'
              ? 'chunking'
              : 'complete',
          current: p.currentPage,
          total: p.totalPages,
          message:
            p.stage === 'ocr'
              ? p.message || `Running local OCR on page ${p.currentPage}...`
              : p.stage === 'extracting'
              ? p.message || `Extracting page ${p.currentPage} of ${p.totalPages}...`
              : p.stage === 'chunking'
              ? p.message || 'Generating semantic chunks with page provenance...'
              : 'PDF extraction complete.',
        });
      },
    });

    // Attach location label & extraction method to chunks
    const chunks = pdfResult.chunks.map((c) => ({
      ...c,
      location_label: c.location_label || `Page ${c.page_number}`,
      extraction_method: c.extraction_method || 'pdf_text',
      file_type: 'pdf' as const,
      sourceType: 'document_content' as const,
    }));

    // Calculate chunks per page
    const chunksPerPage = new Map<number, number>();
    for (const chunk of chunks) {
      const pageNum = chunk.page_number;
      chunksPerPage.set(pageNum, (chunksPerPage.get(pageNum) || 0) + 1);
    }

    const sections: ExtractedSection[] = pdfResult.pages.map((p) => ({
      page_number: p.page_number,
      location_label: p.location_label || (p.extraction_method === 'ocr' ? `Page ${p.page_number} (Local OCR)` : `Page ${p.page_number}`),
      text: p.text,
      characters: p.characters,
      status: p.status,
      textItemCount: p.text_item_count,
      extraction_method: p.extraction_method || 'pdf_text',
      ocr_confidence: p.ocr_confidence,
      ocrRequired: p.ocr_required,
      pdfjsTextChars: p.pdfjs_text_chars,
      ocrChars: p.ocr_chars,
      chunksCount: chunksPerPage.get(p.page_number) || 0,
      error: p.error,
    }));

    const fullText = pdfResult.pages
      .filter((p) => p.text.trim().length > 0)
      .map((p) => {
        const methodTag = p.extraction_method === 'ocr' ? ' [Local OCR]' : '';
        return `--- Page ${p.page_number}${methodTag} ---\n${p.text}`;
      })
      .join('\n\n');

    // Enrich page diagnostics with chunksCount
    const enrichedPageDiagnostics = (pdfResult.diagnostic?.pageDiagnostics || []).map((diag) => ({
      ...diag,
      chunksCount: chunksPerPage.get(diag.pageNumber) || 0,
    }));

    return {
      fileId,
      fileName,
      fileType: 'pdf',
      category: 'document',
      totalCharacters: pdfResult.total_characters,
      sections,
      fullText,
      isEmpty: pdfResult.is_empty,
      extractionStatus: pdfResult.status,
      errorMessage: pdfResult.error_message,
      errorStage: pdfResult.error_stage,
      errorType: pdfResult.error_type,
      pdfjsError: pdfResult.pdfjs_error,
      stackTrace: pdfResult.stack_trace,
      chunks,
      metadata: {
        processorName: pdfResult.ocr_pages_count > 0 ? 'Mozilla PDF.js + Local Tesseract OCR' : 'Mozilla PDF.js Engine',
        pageCount: pdfResult.page_count,
        sectionCount: pdfResult.pages.length,
        extractablePagesCount: pdfResult.extractable_pages_count,
        ocrRequiredPagesCount: pdfResult.ocr_required_pages_count,
        ocrPagesCount: pdfResult.ocr_pages_count,
        textPagesCount: pdfResult.text_pages_count,
        ocrCharacters: pdfResult.ocr_characters,
        textCharacters: pdfResult.text_characters,
        failedPagesCount: pdfResult.failed_pages_count,
        totalTextItems: pdfResult.total_text_items,
        isScanned: pdfResult.is_scanned,
        requiresOcr: pdfResult.requires_ocr,
        truthfulProvenanceType: 'Page',
        pdfDiagnostic: pdfResult.diagnostic
          ? { ...pdfResult.diagnostic, pageDiagnostics: enrichedPageDiagnostics }
          : undefined,
        pageDiagnostics: enrichedPageDiagnostics,
      },
    };
  }
}
