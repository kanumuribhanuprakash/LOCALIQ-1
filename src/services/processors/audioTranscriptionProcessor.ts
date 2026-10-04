import { SupportedFileType, DocumentChunk } from '../../types';
import { ProcessorResult, ProcessorOptions, ExtractedSection } from './types';
import { clientLocalASRService } from '../clientLocalASRService';
import { ClientChunkingService, ExtractedPageInput } from '../clientChunkingService';

const VALID_AUDIO_EXTENSIONS: SupportedFileType[] = ['mp3', 'wav', 'm4a'];

const VALID_AUDIO_MIME_PREFIXES = [
  'audio/',
  'application/ogg',
  'video/mp4', // Some m4a files report video/mp4 MIME type in browsers
];

export class AudioTranscriptionProcessor {
  /**
   * Evaluates audio files (MP3, WAV, M4A) for local on-device transcription
   * using browser-local Whisper ONNX via Transformers.js.
   *
   * LOCALIQ Air-Gap Privacy Mandate:
   * 1. 100% On-Device: Audio data is never transmitted to any external server or API.
   * 2. Preserves timestamps when provided by the local ASR engine (e.g., 00:00–00:08).
   * 3. Detects silence/empty speech and halts indexing with truthful "No meaningful speech detected."
   * 4. Integrates seamlessly with ClientChunkingService, LocalEmbeddingService, and ClientVectorIndexService.
   */
  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const extension = (fileName.split('.').pop() || '').toLowerCase() as SupportedFileType;

    // 1. Format & MIME validation
    const isValidExt = VALID_AUDIO_EXTENSIONS.includes(extension);
    const isValidMime =
      !file.type ||
      VALID_AUDIO_MIME_PREFIXES.some((prefix) => file.type.toLowerCase().startsWith(prefix));

    if (!isValidExt || !isValidMime) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'audio',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Unsupported Format',
        errorMessage: `Unsupported Audio Format. LOCALIQ supports MP3, WAV, and M4A audio files (received .${extension || 'unknown'}).`,
        chunks: [],
        metadata: {
          processorName: 'Local Whisper Speech-to-Text Processor',
          truthfulProvenanceType: 'Audio Transcript',
        },
      };
    }

    // 2. Zero-byte check
    if (file.size === 0) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'audio',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: true,
        extractionStatus: 'Failed',
        errorMessage: 'Empty audio file (0 bytes). File contains no audio data.',
        chunks: [],
        metadata: {
          processorName: 'Local Whisper Speech-to-Text Processor',
          truthfulProvenanceType: 'Audio Transcript',
        },
      };
    }

    // 3. Initiate Local Speech-to-Text
    options?.onProgress?.({
      stage: 'transcribing',
      current: 10,
      total: 100,
      message: 'Initializing browser-local Whisper speech model...',
    });

    try {
      const transcriptionResult = await clientLocalASRService.transcribe(file, {
        onProgress: (p) => {
          options?.onProgress?.({
            stage: p.stage === 'loading_model' ? 'transcribing' : 'transcribing',
            current: p.percent,
            total: 100,
            message: p.message,
          });
        },
      });

      // 4. Silence / Meaningless Speech Check
      if (!transcriptionResult.isMeaningful || !transcriptionResult.text.trim()) {
        return {
          fileId,
          fileName,
          fileType: extension,
          category: 'audio',
          totalCharacters: 0,
          sections: [],
          fullText: '',
          isEmpty: false,
          extractionStatus: 'Failed',
          errorMessage: 'No meaningful speech detected.',
          chunks: [],
          metadata: {
            processorName: 'Local Whisper Speech-to-Text Processor',
            truthfulProvenanceType: 'Audio Transcript',
          },
        };
      }

      // 5. Structure Extracted Sections with Truthful Provenance
      const sections: ExtractedSection[] = [];

      if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
        for (const seg of transcriptionResult.segments) {
          const text = seg.text.trim();
          if (!text) continue;

          sections.push({
            page_number: null,
            location_label: seg.locationLabel,
            text,
            characters: text.length,
            status: 'SUCCESS',
            extraction_method: 'local_speech_to_text',
          });
        }
      }

      // Fallback to full text section if no segments produced
      if (sections.length === 0 && transcriptionResult.text.trim()) {
        const fullTxt = transcriptionResult.text.trim();
        sections.push({
          page_number: null,
          location_label: `Audio Transcript 00:00–${transcriptionResult.durationFormatted}`,
          text: fullTxt,
          characters: fullTxt.length,
          status: 'SUCCESS',
          extraction_method: 'local_speech_to_text',
        });
      }

      // 6. Semantic Chunking through ClientChunkingService
      options?.onProgress?.({
        stage: 'chunking',
        current: 75,
        total: 100,
        message: 'Creating semantic chunks with preserved timestamps...',
      });

      const pagesToChunk: ExtractedPageInput[] = sections.map((sec) => ({
        page_number: null,
        text: sec.text,
        characters: sec.characters,
        extraction_method: 'local_speech_to_text',
        location_label: sec.location_label,
      }));

      const generatedChunks: DocumentChunk[] = ClientChunkingService.chunkDocumentPages(
        fileId,
        fileName,
        pagesToChunk,
        {
          chunkSize: options?.chunkSize || 500,
          chunkOverlap: options?.chunkOverlap || 50,
        }
      );

      // Explicitly enforce audio provenance attributes on all chunks
      const audioChunks: DocumentChunk[] = generatedChunks.map((c, idx) => ({
        ...c,
        file_type: extension,
        page_number: null,
        page_start: null,
        page_end: null,
        extraction_method: 'local_speech_to_text',
        sourceType: 'document_content',
        location_label: c.location_label || sections[idx]?.location_label || 'Audio Transcript',
        metadata: {
          ...c.metadata,
          durationFormatted: transcriptionResult.durationFormatted,
          durationSeconds: transcriptionResult.durationSeconds,
          modelName: transcriptionResult.modelName,
        },
      }));

      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'audio',
        totalCharacters: transcriptionResult.text.length,
        sections,
        fullText: transcriptionResult.text,
        isEmpty: false,
        extractionStatus: 'Text Extracted',
        chunks: audioChunks,
        metadata: {
          processorName: 'Local Whisper Speech-to-Text Processor',
          truthfulProvenanceType: 'Audio Transcript',
          sectionCount: sections.length,
          textCharacters: transcriptionResult.text.length,
          pageCount: undefined,
          extractablePagesCount: undefined,
        },
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Local audio speech-to-text processing failed.';
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'audio',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Failed',
        errorMessage: errMsg,
        chunks: [],
        metadata: {
          processorName: 'Local Whisper Speech-to-Text Processor',
          truthfulProvenanceType: 'Audio Transcript',
        },
      };
    }
  }
}
