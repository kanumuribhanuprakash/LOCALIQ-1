/**
 * LOCALIQ Client-Side Local Speech-to-Text (ASR) Engine
 * 
 * Powered by @huggingface/transformers (Transformers.js v3) using Whisper-tiny ONNX.
 * 
 * Guarantees:
 * - 100% Browser-Local: Executes on-device using WebGPU (or WASM fallback).
 * - Zero Cloud / Air-Gapped: Audio binary data never leaves the client device.
 * - No External Speech APIs: No OpenAI Whisper API, Google Speech-to-Text, or cloud services.
 * - Sample Rate Conversion: Resamples to 16,000 Hz mono via native Web Audio API (OfflineAudioContext).
 * - Real Timestamps: Preserves segment start/end timestamps from the ASR decoder.
 * - Meaningful Speech Validation: Detects silence / low-energy buffers and reports "No meaningful speech detected."
 * - Truthful States: Idle, Loading Model, Model Ready, Transcribing, Completed, Cancelled, Failed.
 */

import { pipeline, env } from '@huggingface/transformers';

// Browser cache configuration for ONNX model weights
if (typeof window !== 'undefined') {
  env.useBrowserCache = true;
  env.allowLocalModels = false;
}

export type ASRState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'transcribing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ASRStatusInfo {
  state: ASRState;
  stateLabel: 'Idle' | 'Loading Model' | 'Model Ready' | 'Transcribing' | 'Completed' | 'Cancelled' | 'Failed';
  message: string;
  progress?: number;
  error?: string;
  modelName: string;
  isLocal: boolean;
}

export interface TranscriptSegment {
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  locationLabel: string; // e.g. "Audio Transcript 00:00–00:08"
}

export interface AudioTranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  durationSeconds: number;
  durationFormatted: string;
  sampleRate: number;
  isMeaningful: boolean;
  extractionMethod: 'local_speech_to_text';
  modelName: string;
  executionTimeMs: number;
  warning?: string;
}

export interface TranscribeOptions {
  onProgress?: (progress: { stage: string; percent: number; message: string }) => void;
  signal?: AbortSignal;
}

export const PRIMARY_WHISPER_MODEL = 'onnx-community/whisper-tiny.en';
export const FALLBACK_WHISPER_MODEL = 'Xenova/whisper-tiny.en';

export class ClientLocalASRService {
  private static instance: ClientLocalASRService | null = null;
  private transcriberPromise: Promise<any> | null = null;
  private transcriberInstance: any = null;
  private state: ASRState = 'idle';
  private statusMessage: string = 'Local ASR engine idle. Ready to transcribe.';
  private activeModelName: string = PRIMARY_WHISPER_MODEL;
  private statusListeners: Array<(info: ASRStatusInfo) => void> = [];
  private currentAbortController: AbortController | null = null;

  private constructor() {}

  public static getInstance(): ClientLocalASRService {
    if (!ClientLocalASRService.instance) {
      ClientLocalASRService.instance = new ClientLocalASRService();
    }
    return ClientLocalASRService.instance;
  }

  public addStatusListener(listener: (info: ASRStatusInfo) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getStatusInfo());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public onStatusChange(listener: (info: ASRStatusInfo) => void): () => void {
    return this.addStatusListener(listener);
  }

  private updateStatus(state: ASRState, message: string, progress?: number, error?: string): void {
    this.state = state;
    this.statusMessage = message;
    const info = this.getStatusInfo(progress, error);
    for (const listener of this.statusListeners) {
      try {
        listener(info);
      } catch (err) {
        console.error('Error in ASR status listener:', err);
      }
    }
  }

  public getStatus(): ASRState {
    return this.state;
  }

  public getStatusInfo(progress?: number, error?: string): ASRStatusInfo {
    let stateLabel: ASRStatusInfo['stateLabel'] = 'Idle';
    switch (this.state) {
      case 'loading':
        stateLabel = 'Loading Model';
        break;
      case 'ready':
        stateLabel = 'Model Ready';
        break;
      case 'transcribing':
        stateLabel = 'Transcribing';
        break;
      case 'completed':
        stateLabel = 'Completed';
        break;
      case 'cancelled':
        stateLabel = 'Cancelled';
        break;
      case 'error':
        stateLabel = 'Failed';
        break;
      case 'idle':
      default:
        stateLabel = 'Idle';
        break;
    }

    return {
      state: this.state,
      stateLabel,
      message: this.statusMessage,
      progress,
      error,
      modelName: this.activeModelName,
      isLocal: true,
    };
  }

  public isModelReady(): boolean {
    return this.state === 'ready' && this.transcriberInstance !== null;
  }

  /**
   * Detects whether WebGPU or WASM is available for Whisper local execution.
   */
  public getBackendInfo(): { device: 'webgpu' | 'wasm'; label: string } {
    const hasWebGPU =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      Boolean((navigator as any).gpu);
    return {
      device: hasWebGPU ? 'webgpu' : 'wasm',
      label: hasWebGPU ? 'Local Whisper (WebGPU)' : 'Local Whisper (WASM)',
    };
  }

  /**
   * Initializes and loads the browser-local Whisper ASR model.
   */
  public async loadModel(options?: {
    onProgress?: (progress: number, message: string) => void;
    forceReload?: boolean;
  }): Promise<any> {
    if (this.transcriberInstance && !options?.forceReload) {
      this.updateStatus('ready', `Model ${this.activeModelName} ready in browser.`);
      return this.transcriberInstance;
    }

    if (this.transcriberPromise && !options?.forceReload) {
      return this.transcriberPromise;
    }

    this.updateStatus(
      'loading',
      'Loading on-device Whisper speech model (WebGPU / WASM)...',
      10
    );

    this.transcriberPromise = (async () => {
      try {
        // Attempt Primary Model
        this.activeModelName = PRIMARY_WHISPER_MODEL;
        options?.onProgress?.(20, `Fetching weights for ${PRIMARY_WHISPER_MODEL}...`);

        const transcriber = await pipeline(
          'automatic-speech-recognition',
          PRIMARY_WHISPER_MODEL,
          {
            dtype: {
              encoder_model: 'fp32',
              decoder_model_merged: 'q4',
            },
            progress_callback: (progressData: any) => {
              if (progressData && progressData.status === 'progress') {
                const percent = Math.min(
                  95,
                  Math.round((progressData.loaded / (progressData.total || 1)) * 100)
                );
                this.updateStatus(
                  'loading',
                  `Downloading local ASR weights (${percent}%)...`,
                  percent
                );
                options?.onProgress?.(percent, `Downloading local ASR weights (${percent}%)...`);
              }
            },
          }
        );

        this.transcriberInstance = transcriber;
        this.updateStatus(
          'ready',
          `Model ${this.activeModelName} ready. Local transcription active (audio never leaves device).`,
          100
        );
        return transcriber;
      } catch (err: any) {
        console.warn(
          `Primary model ${PRIMARY_WHISPER_MODEL} load failed, attempting fallback:`,
          err
        );

        try {
          this.activeModelName = FALLBACK_WHISPER_MODEL;
          this.updateStatus(
            'loading',
            `Attempting fallback to ${FALLBACK_WHISPER_MODEL}...`,
            40
          );

          const fallbackTranscriber = await pipeline(
            'automatic-speech-recognition',
            FALLBACK_WHISPER_MODEL,
            {
              dtype: {
                encoder_model: 'fp32',
                decoder_model_merged: 'q4',
              },
            }
          );

          this.transcriberInstance = fallbackTranscriber;
          this.updateStatus(
            'ready',
            `Model ${this.activeModelName} ready. Local transcription active (audio never leaves device).`,
            100
          );
          return fallbackTranscriber;
        } catch (fallbackErr: any) {
          const errMsg = fallbackErr?.message || err?.message || 'Failed to initialize local speech model.';
          this.updateStatus('error', `ASR Model loading failed: ${errMsg}`, undefined, errMsg);
          this.transcriberPromise = null;
          this.transcriberInstance = null;
          throw new Error(`Failed to load browser-local speech-to-text model: ${errMsg}`);
        }
      }
    })();

    return this.transcriberPromise;
  }

  /**
   * Decodes an audio ArrayBuffer / File into 16,000 Hz mono PCM Float32Array
   * and calculates duration.
   */
  public async decodeAndResampleAudio(
    audioData: ArrayBuffer | Uint8Array,
    mimeType?: string
  ): Promise<{
    audio16k: Float32Array;
    durationSeconds: number;
    durationFormatted: string;
    sampleRate: number;
    rms: number;
  }> {
    const rawBuffer =
      audioData instanceof Uint8Array
        ? audioData.buffer.slice(
            audioData.byteOffset,
            audioData.byteOffset + audioData.byteLength
          )
        : audioData;

    // Browser environment: Web Audio API
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();

      try {
        // Clone buffer to avoid detach issues with decodeAudioData
        const bufferCopy = rawBuffer.slice(0);
        const decodedBuffer: AudioBuffer = await audioCtx.decodeAudioData(bufferCopy);
        const durationSeconds = decodedBuffer.duration;
        const durationFormatted = this.formatDuration(durationSeconds);

        // Resample to 16,000 Hz mono using OfflineAudioContext
        const targetSampleRate = 16000;
        const targetLength = Math.max(1, Math.ceil(durationSeconds * targetSampleRate));

        let resampledChannelData: Float32Array;

        if (typeof OfflineAudioContext !== 'undefined') {
          const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
          const bufferSource = offlineCtx.createBufferSource();
          bufferSource.buffer = decodedBuffer;
          bufferSource.connect(offlineCtx.destination);
          bufferSource.start(0);

          const renderedBuffer = await offlineCtx.startRendering();
          resampledChannelData = renderedBuffer.getChannelData(0);
        } else {
          // Fallback downmix + linear resample
          resampledChannelData = this.manualResample(decodedBuffer, targetSampleRate);
        }

        // Calculate RMS (energy level)
        let sumSq = 0;
        for (let i = 0; i < resampledChannelData.length; i++) {
          sumSq += resampledChannelData[i] * resampledChannelData[i];
        }
        const rms = Math.sqrt(sumSq / (resampledChannelData.length || 1));

        return {
          audio16k: resampledChannelData,
          durationSeconds,
          durationFormatted,
          sampleRate: targetSampleRate,
          rms,
        };
      } finally {
        try {
          await audioCtx.close();
        } catch (_) {}
      }
    }

    // Non-browser / Node.js / Headless environment fallback (e.g., PCM WAV parser)
    return this.parseWavBufferFallback(rawBuffer);
  }

  /**
   * Fallback parser for PCM WAV buffers in Node/test environments
   */
  private parseWavBufferFallback(buffer: ArrayBuffer): {
    audio16k: Float32Array;
    durationSeconds: number;
    durationFormatted: string;
    sampleRate: number;
    rms: number;
  } {
    const dataView = new DataView(buffer);
    let sampleRate = 16000;
    let numChannels = 1;
    let bitsPerSample = 16;
    let dataOffset = 44;
    let dataLength = buffer.byteLength - 44;

    try {
      // Check RIFF header
      const riffHeader = String.fromCharCode(
        dataView.getUint8(0),
        dataView.getUint8(1),
        dataView.getUint8(2),
        dataView.getUint8(3)
      );

      if (riffHeader === 'RIFF') {
        numChannels = dataView.getUint16(22, true);
        sampleRate = dataView.getUint32(24, true);
        bitsPerSample = dataView.getUint16(34, true);

        // Find "data" chunk
        let offset = 12;
        while (offset < buffer.byteLength - 8) {
          const chunkId = String.fromCharCode(
            dataView.getUint8(offset),
            dataView.getUint8(offset + 1),
            dataView.getUint8(offset + 2),
            dataView.getUint8(offset + 3)
          );
          const chunkSize = dataView.getUint32(offset + 4, true);
          if (chunkId === 'data') {
            dataOffset = offset + 8;
            dataLength = chunkSize;
            break;
          }
          offset += 8 + chunkSize;
        }
      }
    } catch (_) {
      // Default to standard offset
      dataOffset = 44;
      dataLength = buffer.byteLength - 44;
    }

    let pcmFloats: Float32Array;
    if (bitsPerSample === 16) {
      const sampleCount = Math.floor(dataLength / (2 * numChannels));
      pcmFloats = new Float32Array(sampleCount);
      let bytePtr = dataOffset;
      for (let i = 0; i < sampleCount; i++) {
        let channelSum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          if (bytePtr + 1 < buffer.byteLength) {
            channelSum += dataView.getInt16(bytePtr, true);
          }
          bytePtr += 2;
        }
        pcmFloats[i] = channelSum / numChannels / 32768.0;
      }
    } else {
      pcmFloats = new Float32Array(Math.floor(dataLength / 2));
    }

    // Resample to 16,000 Hz if needed
    let audio16k = pcmFloats;
    if (sampleRate !== 16000 && sampleRate > 0) {
      const ratio = sampleRate / 16000;
      const targetLen = Math.round(pcmFloats.length / ratio);
      audio16k = new Float32Array(targetLen);
      for (let i = 0; i < targetLen; i++) {
        const srcIdx = Math.floor(i * ratio);
        audio16k[i] = pcmFloats[srcIdx] || 0;
      }
    }

    const durationSeconds = audio16k.length / 16000;
    const durationFormatted = this.formatDuration(durationSeconds);

    let sumSq = 0;
    for (let i = 0; i < audio16k.length; i++) {
      sumSq += audio16k[i] * audio16k[i];
    }
    const rms = Math.sqrt(sumSq / (audio16k.length || 1));

    return {
      audio16k,
      durationSeconds,
      durationFormatted,
      sampleRate: 16000,
      rms,
    };
  }

  private manualResample(audioBuffer: AudioBuffer, targetSampleRate: number): Float32Array {
    const numChannels = audioBuffer.numberOfChannels;
    const originalRate = audioBuffer.sampleRate;
    const originalLength = audioBuffer.length;
    const ratio = originalRate / targetSampleRate;
    const targetLength = Math.round(originalLength / ratio);
    const output = new Float32Array(targetLength);

    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelData.push(audioBuffer.getChannelData(c));
    }

    for (let i = 0; i < targetLength; i++) {
      const originalIdx = Math.min(originalLength - 1, Math.floor(i * ratio));
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += channelData[c][originalIdx] || 0;
      }
      output[i] = sum / numChannels;
    }

    return output;
  }

  /**
   * Transcribe an audio file/buffer locally using Whisper.
   */
  public async transcribe(
    audioInput: File | Blob | ArrayBuffer,
    options?: TranscribeOptions
  ): Promise<AudioTranscriptionResult> {
    const startTime = Date.now();
    this.currentAbortController = new AbortController();

    if (options?.signal) {
      options.signal.addEventListener('abort', () => this.cancel());
    }

    try {
      this.updateStatus('transcribing', 'Preparing audio buffer and checking energy levels...', 5);
      options?.onProgress?.({
        stage: 'transcribing',
        percent: 5,
        message: 'Preparing audio buffer and checking energy levels...',
      });

      // 1. Convert to ArrayBuffer
      let rawBuffer: ArrayBuffer;
      let mimeType: string | undefined;

      if (audioInput instanceof Blob) {
        mimeType = audioInput.type;
        rawBuffer = await audioInput.arrayBuffer();
      } else {
        rawBuffer = audioInput;
      }

      if (this.currentAbortController?.signal.aborted) {
        throw new DOMException('Transcription cancelled by user.', 'AbortError');
      }

      // 2. Decode and Resample to 16kHz mono Float32Array
      this.updateStatus('transcribing', 'Decoding audio stream & resampling to 16kHz mono...', 15);
      options?.onProgress?.({
        stage: 'transcribing',
        percent: 15,
        message: 'Decoding audio stream & resampling to 16kHz mono...',
      });

      const { audio16k, durationSeconds, durationFormatted, rms } =
        await this.decodeAndResampleAudio(rawBuffer, mimeType);

      if (this.currentAbortController?.signal.aborted) {
        throw new DOMException('Transcription cancelled by user.', 'AbortError');
      }

      // 3. Audio Silence / Zero-Energy Detection
      // A threshold of 0.0003 RMS reliably detects silence or mute recordings
      if (audio16k.length === 0 || rms < 0.0003 || durationSeconds < 0.1) {
        this.updateStatus(
          'completed',
          'No meaningful speech detected (silent or empty recording).',
          100
        );
        return {
          text: '',
          segments: [],
          durationSeconds,
          durationFormatted,
          sampleRate: 16000,
          isMeaningful: false,
          extractionMethod: 'local_speech_to_text',
          modelName: this.activeModelName,
          executionTimeMs: Date.now() - startTime,
          warning: 'No meaningful speech detected.',
        };
      }

      // 4. Ensure Whisper Model is Ready
      this.updateStatus('loading', 'Checking local Whisper model availability...', 25);
      options?.onProgress?.({
        stage: 'loading_model',
        percent: 25,
        message: 'Initializing local Whisper speech model...',
      });

      const transcriber = await this.loadModel({
        onProgress: (p, msg) => {
          const scaled = 25 + Math.round((p / 100) * 35);
          options?.onProgress?.({
            stage: 'loading_model',
            percent: scaled,
            message: msg,
          });
        },
      });

      if (this.currentAbortController?.signal.aborted) {
        throw new DOMException('Transcription cancelled by user.', 'AbortError');
      }

      // 5. Execute Local Neural Inference
      this.updateStatus('transcribing', 'Running browser-local Whisper speech recognition...', 65);
      options?.onProgress?.({
        stage: 'transcribing',
        percent: 65,
        message: 'Running browser-local speech recognition (audio never leaves device)...',
      });

      // Long audio segmentation: chunk_length_s: 30, stride_length_s: 5
      const asrOutput = await transcriber(audio16k, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      if (this.currentAbortController?.signal.aborted) {
        throw new DOMException('Transcription cancelled by user.', 'AbortError');
      }

      // 6. Process Segments and Timestamps
      const rawText = (asrOutput?.text || '').trim();
      const rawChunks: Array<{ timestamp?: [number, number]; text: string }> =
        asrOutput?.chunks || [];

      const segments: TranscriptSegment[] = [];

      if (rawChunks.length > 0) {
        for (const c of rawChunks) {
          const segText = (c.text || '').trim();
          if (!segText) continue;

          let start = 0;
          let end = durationSeconds;

          if (Array.isArray(c.timestamp) && c.timestamp.length >= 2) {
            start = Math.max(0, c.timestamp[0] ?? 0);
            end = Math.min(durationSeconds, Math.max(start, c.timestamp[1] ?? durationSeconds));
          }

          const startFmt = this.formatTimestamp(start);
          const endFmt = this.formatTimestamp(end);

          segments.push({
            startTime: start,
            endTime: end,
            text: segText,
            locationLabel: `Audio Transcript ${startFmt}–${endFmt}`,
          });
        }
      }

      // If no chunks produced but raw text exists
      if (segments.length === 0 && rawText) {
        segments.push({
          startTime: 0,
          endTime: durationSeconds,
          text: rawText,
          locationLabel: `Audio Transcript 00:00–${this.formatTimestamp(durationSeconds)}`,
        });
      }

      // Check for empty or hallucinatory silence output (e.g. repeated lone punctuation or "you")
      const combinedText = segments.map((s) => s.text).join(' ').trim() || rawText;
      const isMeaningful =
        combinedText.length > 0 &&
        /[a-zA-Z0-9]/.test(combinedText) &&
        !/^(\.|,|\?|!|\s)+$/.test(combinedText);

      this.updateStatus(
        isMeaningful ? 'completed' : 'ready',
        isMeaningful
          ? `Transcribed ${combinedText.length} characters in ${segments.length} segments.`
          : 'No meaningful speech detected.',
        100
      );

      options?.onProgress?.({
        stage: 'completed',
        percent: 100,
        message: 'Local speech-to-text transcription completed.',
      });

      return {
        text: isMeaningful ? combinedText : '',
        segments: isMeaningful ? segments : [],
        durationSeconds,
        durationFormatted,
        sampleRate: 16000,
        isMeaningful,
        extractionMethod: 'local_speech_to_text',
        modelName: this.activeModelName,
        executionTimeMs: Date.now() - startTime,
        warning: isMeaningful ? undefined : 'No meaningful speech detected.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || this.state === 'cancelled') {
        this.updateStatus('cancelled', 'Audio transcription cancelled by user.');
        throw new Error('Transcription cancelled by user.');
      }
      const errMsg = err?.message || 'Local audio transcription failed.';
      this.updateStatus('error', errMsg, undefined, errMsg);
      throw err;
    } finally {
      this.currentAbortController = null;
    }
  }

  /**
   * Cancel ongoing transcription
   */
  public cancel(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.updateStatus('cancelled', 'Audio transcription cancelled by user.');
  }

  public cleanup(): void {
    this.cancel();
    this.transcriberInstance = null;
    this.transcriberPromise = null;
    this.updateStatus('idle', 'Local ASR service reset.');
  }

  /**
   * Formats seconds into MM:SS (or HH:MM:SS if >= 1 hour)
   */
  public formatTimestamp(seconds: number): string {
    const totalSec = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  public formatDuration(seconds: number): string {
    return this.formatTimestamp(seconds);
  }
}

export const clientLocalASRService = ClientLocalASRService.getInstance();
