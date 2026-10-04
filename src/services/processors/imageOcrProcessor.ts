import { SupportedFileType } from '../../types';
import { ClientChunkingService, CHUNK_SIZE, CHUNK_OVERLAP, ExtractedPageInput } from '../clientChunkingService';
import { localOcrService } from '../localOcrService';
import { ProcessorResult, ProcessorOptions, ExtractedSection } from './types';

interface PreprocessedImage {
  source: HTMLCanvasElement | File;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
  cleanup?: () => void;
}

/**
 * Preprocesses an image in-memory for optimal local Tesseract OCR recognition.
 * Applies dimension bounding (caps at 2600px to prevent browser canvas memory exhaustion),
 * gentle upscaling for small text/screenshots, grayscale conversion, and contrast normalization.
 */
async function loadAndPreprocessImage(file: File): Promise<PreprocessedImage> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      source: file,
      dimensions: { width: 0, height: 0 },
      originalDimensions: { width: 0, height: 0 },
    };
  }

  let imgSource: ImageBitmap | HTMLImageElement | null = null;
  let originalWidth = 0;
  let originalHeight = 0;

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        imgSource = bitmap;
        originalWidth = bitmap.width;
        originalHeight = bitmap.height;
      } catch {
        imgSource = null;
      }
    }

    if (!imgSource) {
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image element into DOM.'));
          img.src = objectUrl;
        });
        imgSource = img;
        originalWidth = img.naturalWidth || img.width;
        originalHeight = img.naturalHeight || img.height;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    // Safety checks
    if (!originalWidth || !originalHeight) {
      return {
        source: file,
        dimensions: { width: 0, height: 0 },
        originalDimensions: { width: 0, height: 0 },
      };
    }

    const maxDim = Math.max(originalWidth, originalHeight);
    const MAX_ALLOWED_DIMENSION = 2600; // Safeguard against GPU texture / memory limits
    let scale = 1.0;

    if (maxDim > MAX_ALLOWED_DIMENSION) {
      // Proportionally downscale large images
      scale = MAX_ALLOWED_DIMENSION / maxDim;
    } else if (maxDim > 0 && maxDim < 850) {
      // Upscale small text / icons so font x-height >= 25-30px for Tesseract
      scale = Math.min(2.0, 1600 / maxDim);
    }

    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      if ('close' in imgSource && typeof (imgSource as ImageBitmap).close === 'function') {
        (imgSource as ImageBitmap).close();
      }
      return {
        source: file,
        dimensions: { width: targetWidth, height: targetHeight },
        originalDimensions: { width: originalWidth, height: originalHeight },
      };
    }

    // Draw to canvas
    ctx.drawImage(imgSource, 0, 0, targetWidth, targetHeight);

    if ('close' in imgSource && typeof (imgSource as ImageBitmap).close === 'function') {
      (imgSource as ImageBitmap).close();
    }

    // Grayscale & Contrast Normalization in-place
    try {
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imgData.data;
      const len = data.length;

      // Sample pixels to find min & max luminance for contrast stretching
      let minL = 255;
      let maxL = 0;
      const step = Math.max(4, Math.floor(len / 40000) * 4);

      for (let i = 0; i < len; i += step) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < minL) minL = lum;
        if (lum > maxL) maxL = lum;
      }

      const range = maxL - minL;
      const doStretch = range > 20 && range < 235;

      for (let i = 0; i < len; i += 4) {
        let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (doStretch) {
          lum = Math.max(0, Math.min(255, ((lum - minL) / range) * 255));
        }
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (pixelErr) {
      console.warn('Canvas pixel processing skipped:', pixelErr);
    }

    return {
      source: canvas,
      dimensions: { width: targetWidth, height: targetHeight },
      originalDimensions: { width: originalWidth, height: originalHeight },
      cleanup: () => {
        // Zero canvas dimensions to release GPU and memory buffers immediately
        canvas.width = 0;
        canvas.height = 0;
      },
    };
  } catch (err) {
    console.warn('Image preprocessing error, falling back to raw file:', err);
    return {
      source: file,
      dimensions: { width: 0, height: 0 },
      originalDimensions: { width: 0, height: 0 },
    };
  }
}

export class ImageOCRProcessor {
  /**
   * Performs real local on-device Optical Character Recognition (OCR) on images
   * (PNG, JPG, JPEG) using WebAssembly and Web Workers.
   * 100% browser execution, zero cloud API calls, complete air-gapped privacy.
   */
  static async process(file: File, options?: ProcessorOptions): Promise<ProcessorResult> {
    const fileId = options?.fileId || `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name;
    const rawExtension = (fileName.split('.').pop() || '').toLowerCase();
    const extension = rawExtension as SupportedFileType;
    const chunkSize = options?.chunkSize || CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap || CHUNK_OVERLAP;

    // 1. Validate File Format (MIME type and file extension)
    const allowedExtensions = ['png', 'jpg', 'jpeg'];
    const mimeType = (file.type || '').toLowerCase();
    const isAllowedExt = allowedExtensions.includes(rawExtension);
    const isAllowedMime =
      !mimeType ||
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/jpg' ||
      mimeType === 'image/pjpeg';

    if (!isAllowedExt || !isAllowedMime) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'image',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'Unsupported Image Format',
        errorMessage: `Unsupported image format (${mimeType || rawExtension}). LOCALIQ supports PNG, JPG, and JPEG images for local OCR.`,
        chunks: [],
        metadata: {
          processorName: 'Tesseract WebAssembly OCR',
          truthfulProvenanceType: 'Image OCR Content',
        },
      };
    }

    // 2. Empty File Check
    if (file.size === 0) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'image',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: true,
        extractionStatus: 'Failed',
        errorMessage: 'Empty image file (0 bytes). Image contains no data.',
        chunks: [],
        metadata: {
          processorName: 'Tesseract WebAssembly OCR',
          truthfulProvenanceType: 'Image OCR Content',
        },
      };
    }

    options?.onProgress?.({
      stage: 'ocr',
      current: 10,
      total: 100,
      message: 'Preprocessing image in-memory for local OCR recognition...',
    });

    // 3. Preprocess image in-memory (resizing, grayscale, contrast normalization)
    const preprocessed = await loadAndPreprocessImage(file);

    let extractedText = '';
    let confidence = 0;

    try {
      options?.onProgress?.({
        stage: 'ocr',
        current: 25,
        total: 100,
        message: 'Initializing local on-device OCR engine (Tesseract WASM)...',
      });

      const ocrResult = await localOcrService.recognizeImage(preprocessed.source, {
        onProgress: (pct) => {
          options?.onProgress?.({
            stage: 'ocr',
            current: Math.max(25, pct),
            total: 100,
            message: `OCR scanning typographic glyphs: ${pct}%...`,
          });
        },
        onStatus: (info) => {
          options?.onProgress?.({
            stage: 'ocr',
            current: info.progress,
            total: 100,
            message: info.message,
          });
        },
      });

      if (ocrResult.error) {
        throw new Error(ocrResult.error);
      }

      extractedText = (ocrResult.text || '').trim();
      confidence = ocrResult.confidence || 0;
    } catch (ocrErr: any) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'image',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'OCR Failed',
        errorMessage: `Local OCR model failed to initialize or execute: ${ocrErr?.message || 'WASM runtime error'}`,
        chunks: [],
        metadata: {
          processorName: 'Tesseract WebAssembly OCR',
          truthfulProvenanceType: 'Image OCR Content',
          imageDimensions: preprocessed.dimensions,
          originalDimensions: preprocessed.originalDimensions,
          visualLimitationNotice:
            'Visual understanding (diagram interpretation, semantic captioning) requires a multimodal vision model, which is excluded to preserve 100% on-device data privacy.',
        },
      };
    } finally {
      // Free canvas buffer memory immediately
      if (preprocessed.cleanup) {
        preprocessed.cleanup();
      }
    }

    // 4. No Meaningful Text Detected Guard
    // Check if any alphanumeric characters exist in the output
    const alphaNumericCount = extractedText.replace(/[^a-zA-Z0-9]/g, '').length;
    if (!extractedText || alphaNumericCount === 0) {
      return {
        fileId,
        fileName,
        fileType: extension,
        category: 'image',
        totalCharacters: 0,
        sections: [],
        fullText: '',
        isEmpty: false,
        extractionStatus: 'No Text Detected',
        errorMessage: 'No meaningful text detected.',
        chunks: [],
        metadata: {
          processorName: 'Tesseract WebAssembly OCR',
          ocrConfidence: confidence,
          imageDimensions: preprocessed.dimensions,
          originalDimensions: preprocessed.originalDimensions,
          truthfulProvenanceType: 'Image OCR Content',
          visualLimitationNotice:
            'OCR extracted 0 meaningful characters. Visual understanding (diagram interpretation, scene understanding) requires a multimodal vision model, which is excluded to maintain 100% on-device privacy.',
        },
      };
    }

    // 5. Structure Extracted OCR Text into Sections (truthful page_number: null)
    const rawParagraphs = extractedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [extractedText];

    const sections: ExtractedSection[] = paragraphs.map((p, idx) => ({
      page_number: null,
      location_label: paragraphs.length > 1 ? `Image OCR (Section ${idx + 1})` : 'Image OCR',
      text: p,
      characters: p.length,
      extraction_method: 'tesseract_local_ocr',
      ocr_confidence: confidence,
    }));

    const chunkingPages: ExtractedPageInput[] = sections.map((s) => ({
      page_number: null,
      text: s.text,
      characters: s.characters,
      extraction_method: 'tesseract_local_ocr',
      location_label: s.location_label,
    }));

    options?.onProgress?.({
      stage: 'chunking',
      current: sections.length,
      total: sections.length,
      message: `Chunking ${sections.length} OCR text sections for neural embedding...`,
    });

    // 6. Semantic Chunking through existing ClientChunkingService
    const rawChunks = ClientChunkingService.chunkDocumentPages(fileId, fileName, chunkingPages, {
      chunkSize,
      chunkOverlap,
    });

    // Ensure all chunks have strict truthful image provenance
    const chunks = rawChunks.map((c) => ({
      ...c,
      page_number: null,
      page_start: null,
      page_end: null,
      location_label: c.location_label || 'Image OCR',
      extraction_method: 'tesseract_local_ocr' as const,
      ocr_confidence: confidence,
      sourceType: 'document_content' as const,
      file_type: extension,
      metadata: {
        isMetadataOnly: false,
        excludedFromIndex: false,
        sourceType: 'document_content',
        imageDimensions: preprocessed.dimensions,
        originalDimensions: preprocessed.originalDimensions,
      },
    }));

    return {
      fileId,
      fileName,
      fileType: extension,
      category: 'image',
      totalCharacters: extractedText.length,
      sections,
      fullText: extractedText,
      isEmpty: false,
      extractionStatus: 'Text Extracted',
      chunks,
      metadata: {
        processorName: 'Tesseract WebAssembly OCR',
        ocrConfidence: confidence,
        sectionCount: sections.length,
        imageDimensions: preprocessed.dimensions,
        originalDimensions: preprocessed.originalDimensions,
        truthfulProvenanceType: 'Image OCR Content',
        visualLimitationNotice:
          'Local on-device OCR extracts recognized text characters and spatial headings from images. Diagrams, geometric charts, visual layouts, and handwriting cannot be semantically interpreted without multimodal vision models.',
      },
    };
  }
}
