import { SupportedFileType } from '../types';
import { ProcessorResult, ProcessorOptions } from './processors/types';
import { PDFProcessor } from './processors/pdfProcessor';
import { TXTProcessor } from './processors/txtProcessor';
import { DOCXProcessor } from './processors/docxProcessor';
import { DOCProcessor } from './processors/docProcessor';
import { ImageOCRProcessor } from './processors/imageOcrProcessor';
import { AudioTranscriptionProcessor } from './processors/audioTranscriptionProcessor';

export class ClientDocumentProcessingService {
  /**
   * Resolves the appropriate processor based on the file extension
   * and executes extraction returning a unified structure.
   */
  static async processFile(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const extension = (file.name.split('.').pop() || '').toLowerCase() as SupportedFileType;

    switch (extension) {
      case 'pdf':
        return await PDFProcessor.process(file, options);

      case 'txt':
      case 'md':
        return await TXTProcessor.process(file, options);

      case 'docx':
        return await DOCXProcessor.process(file, options);

      case 'doc':
        return await DOCProcessor.process(file, options);

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return await ImageOCRProcessor.process(file, options);

      case 'mp3':
      case 'wav':
      case 'm4a':
        return await AudioTranscriptionProcessor.process(file, options);

      default:
        return {
          fileId: options?.fileId || `unknown-${Date.now()}`,
          fileName: file.name,
          fileType: extension,
          category: 'document',
          totalCharacters: 0,
          sections: [],
          fullText: '',
          isEmpty: file.size === 0,
          extractionStatus: 'Unsupported Format',
          errorMessage: `Unsupported file format .${extension}. Supported formats are PDF, TXT, DOCX, PNG, JPG, JPEG, MP3, WAV, M4A.`,
          chunks: [],
          metadata: {
            processorName: 'None',
            truthfulProvenanceType: 'Document Section / Paragraph',
          },
        };
    }
  }
}
