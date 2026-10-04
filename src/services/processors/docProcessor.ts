import { ProcessorResult, ProcessorOptions } from './types';

export class DOCProcessor {
  /**
   * Evaluates binary Word 97-2003 .DOC file.
   * Binary OLE2 Compound Document Format cannot be parsed reliably or safely in browser JavaScript
   * without unmaintained native C-bindings or server-side LibreOffice instances.
   * Per LOCALIQ specification, we mark DOC as unsupported rather than pretending it works.
   */
  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;

    return {
      fileId,
      fileName,
      fileType: 'doc',
      category: 'document',
      totalCharacters: 0,
      sections: [],
      fullText: '',
      isEmpty: file.size === 0,
      extractionStatus: 'Unsupported Format',
      errorMessage:
        'DOC format is currently unsupported in browser-only mode. The legacy binary Word 97-2003 format cannot be parsed safely on-device without a native office runtime. Please convert your document to .DOCX or .PDF to index into LOCALIQ.',
      chunks: [],
      metadata: {
        processorName: 'DOC Binary Checker',
        truthfulProvenanceType: 'Document Section / Paragraph',
      },
    };
  }
}
