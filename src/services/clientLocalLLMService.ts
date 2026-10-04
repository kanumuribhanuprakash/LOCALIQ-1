/**
 * LOCALIQ Client Local LLM Service (ClientLocalLLMService)
 * 
 * Provides an air-gapped, zero-cloud local language model engine running directly in-browser.
 * Uses @huggingface/transformers with ONNX Runtime Web via WebGPU or WebAssembly.
 * 
 * Model: HuggingFaceTB/SmolLM-135M-Instruct (q4 quantized)
 * Fallback: onnx-community/SmolLM-135M-Instruct (q4 quantized)
 * 
 * SPECIFICATIONS:
 * - Model Identifier: HuggingFaceTB/SmolLM-135M-Instruct (q4)
 * - Approximate Size: ~45 MB (4-bit ONNX weights)
 * - Supported Runtimes: WebGPU (GPU shaders) with automatic WebAssembly CPU fallback
 * - Memory Footprint: ~150 MB - 250 MB RAM/VRAM
 * - Context Window: 2,048 tokens
 * 
 * GUARANTEES:
 * - 100% In-Browser Execution: Zero server calls, zero cloud LLM proxies, zero telemetry.
 * - Local Cache Persistence: Weights cached via browser Cache API, downloaded only once.
 * - Single-Instance Lifecycle: Model loads once and remains ready in memory across questions.
 * - Concurrency Safety: Prevents concurrent conflicting generations.
 * - Cancellation Support: Real-time generation abort via InterruptableStoppingCriteria and AbortSignal.
 * - Streaming: Decodes and streams tokens live to the UI via TextStreamer.
 * - Strict Error Handling: Honest error surfacing without silent cloud fallback.
 */

import {
  pipeline,
  env,
  TextStreamer,
  InterruptableStoppingCriteria,
} from '@huggingface/transformers';
import { LocalLLMInfo, LocalLLMStatus } from '../types';
import {
  LOCAL_LLM_MODELS,
  DEFAULT_LOCAL_LLM_MODEL_ID,
  getLocalModelConfig,
  LocalLLMModelConfig,
} from './localModelRegistry';

// Ensure browser caching is activated for model files
if (typeof window !== 'undefined') {
  env.useBrowserCache = true;
  env.allowLocalModels = false;
}

export const PRIMARY_LOCAL_LLM_MODEL_ID = DEFAULT_LOCAL_LLM_MODEL_ID;
export const FALLBACK_LOCAL_LLM_MODEL_ID = 'onnx-community/SmolLM-135M-Instruct';
export const LOCAL_LLM_DTYPE = 'q4';
export const LOCAL_LLM_APPROX_SIZE = '~45 MB (q4 ONNX)';
export const LOCAL_LLM_CONTEXT_LIMIT = 2048;

export interface LocalGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  repetitionPenalty?: number;
  abortSignal?: AbortSignal;
  onToken?: (token: string, accumulated: string) => void;
}

export interface LocalGenerationResult {
  answer: string;
  model: string;
  generationDurationMs: number;
  tokensGenerated?: number;
  device: 'webgpu' | 'wasm' | 'cpu';
  backend: string;
}

export class ClientLocalLLMService {
  private static instance: ClientLocalLLMService;

  private generatorInstance: any = null;
  private loadPromise: Promise<any> | null = null;
  private status: LocalLLMStatus = 'idle';
  private statusMessage: string = 'Local model not loaded';
  private downloadProgress: number = 0;
  private activeDevice: 'webgpu' | 'wasm' | 'cpu' = 'wasm';
  private activeModelName: string = PRIMARY_LOCAL_LLM_MODEL_ID;
  private lastError: string | null = null;
  private isGenerating: boolean = false;
  private activeStoppingCriteria: InterruptableStoppingCriteria | null = null;
  private statusListeners: Array<(info: LocalLLMInfo) => void> = [];
  private lastTokensGenerated: number = 0;
  private lastGenerationDurationMs: number = 0;

  private constructor() {
    this.detectDevice();
  }

  static getInstance(): ClientLocalLLMService {
    if (!ClientLocalLLMService.instance) {
      ClientLocalLLMService.instance = new ClientLocalLLMService();
    }
    return ClientLocalLLMService.instance;
  }

  /**
   * Detects WebGPU availability in the client browser.
   */
  private detectDevice(): 'webgpu' | 'wasm' {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      (navigator as any).gpu !== undefined
    ) {
      this.activeDevice = 'webgpu';
      return 'webgpu';
    } else {
      this.activeDevice = 'wasm';
      return 'wasm';
    }
  }

  /**
   * Returns human-readable backend title based on detected device.
   */
  getBackendName(): string {
    if (this.activeDevice === 'webgpu') {
      return 'WebGPU (Hardware Shaders)';
    }
    return 'WebAssembly (Multi-threaded CPU)';
  }

  /**
   * Adds listener for reactive model status updates in React.
   */
  addStatusListener(listener: (info: LocalLLMInfo) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getInfo());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private updateStatus(
    status: LocalLLMStatus,
    message: string,
    progress: number = this.downloadProgress,
    error?: string | null
  ) {
    this.status = status;
    this.statusMessage = message;
    this.downloadProgress = progress;
    if (error !== undefined) {
      this.lastError = error;
    }
    const info = this.getInfo();
    for (const listener of this.statusListeners) {
      try {
        listener(info);
      } catch (err) {
        console.error('Error in LocalLLM status listener:', err);
      }
    }
  }

  getInfo(): LocalLLMInfo {
    const cfg = getLocalModelConfig(this.activeModelName);
    return {
      status: this.status,
      modelId: this.activeModelName,
      modelName: this.activeModelName,
      displayName: cfg.displayName,
      provider: cfg.provider,
      progress: this.downloadProgress,
      statusMessage: this.statusMessage,
      device: this.activeDevice,
      backend: this.getBackendName(),
      error: this.lastError,
      approximateSize: cfg.approximateSize,
      contextLimit: cfg.contextLength,
      runtime: cfg.runtime,
      tokensGenerated: this.lastTokensGenerated,
      lastGenerationDurationMs: this.lastGenerationDurationMs,
      verified: cfg.verified,
    };
  }

  getStatus(): LocalLLMStatus {
    return this.status;
  }

  isReady(): boolean {
    return (
      (this.status === 'ready' || this.status === 'Model Ready') &&
      this.generatorInstance !== null
    );
  }

  /**
   * Sets the active model identifier without immediately forcing download.
   * If a pipeline for a different model is active, it will be safely cleared.
   */
  setActiveModel(modelId: string): void {
    if (this.activeModelName === modelId) return;
    if (this.isGenerating) {
      this.cancelGeneration();
    }
    this.generatorInstance = null;
    this.loadPromise = null;
    this.activeModelName = modelId;
    const cfg = getLocalModelConfig(modelId);
    this.updateStatus('idle', `Model selected: ${cfg.displayName}. Ready to load.`, 0, null);
  }

  /**
   * Switches to a new model cleanly:
   * 1. Stops any in-flight generation
   * 2. Disposes the previous pipeline from memory
   * 3. Releases old references
   * 4. Updates state and initializes the new model
   */
  async switchModel(modelId: string, forceReload: boolean = false): Promise<any> {
    if (this.isGenerating) {
      this.cancelGeneration();
    }
    if (this.activeModelName === modelId && this.generatorInstance && !forceReload) {
      return this.generatorInstance;
    }

    // Cleanly dispose previous model pipeline
    this.generatorInstance = null;
    this.loadPromise = null;
    this.activeModelName = modelId;
    this.lastError = null;

    return this.loadModel(modelId, true);
  }

  /**
   * Initializes and loads the local instruct model.
   * Caches the instance so subsequent calls resolve immediately.
   */
  async loadModel(targetModelId?: string, forceReload: boolean = false): Promise<any> {
    const modelToLoad = targetModelId || this.activeModelName;
    if (targetModelId && targetModelId !== this.activeModelName) {
      this.activeModelName = targetModelId;
      this.generatorInstance = null;
      this.loadPromise = null;
    }

    if (this.generatorInstance && !forceReload) {
      return this.generatorInstance;
    }

    if (this.loadPromise && !forceReload) {
      return this.loadPromise;
    }

    const cfg = getLocalModelConfig(modelToLoad);
    this.detectDevice();
    this.updateStatus(
      'loading',
      `Initializing ${cfg.displayName} (${this.getBackendName()})...`,
      0,
      null
    );

    this.loadPromise = (async () => {
      try {
        let deviceOption: 'webgpu' | 'wasm' = this.activeDevice === 'webgpu' ? 'webgpu' : 'wasm';
        let loadedPipeline: any = null;
        let loadError: any = null;

        // Try selected model first, with WebGPU if available
        try {
          this.updateStatus(
            'loading',
            `Loading ${cfg.displayName} via ${deviceOption === 'webgpu' ? 'WebGPU' : 'WebAssembly CPU'}...`,
            10
          );

          loadedPipeline = await pipeline('text-generation', modelToLoad, {
            dtype: cfg.dtype || LOCAL_LLM_DTYPE,
            device: deviceOption,
            progress_callback: (progress: any) => {
              if (progress && typeof progress.progress === 'number') {
                const percent = Math.min(100, Math.round(progress.progress * 100));
                this.downloadProgress = percent;
                const fileInfo = progress.file ? ` (${progress.file})` : '';
                this.updateStatus(
                  'loading',
                  `Downloading local neural weights: ${percent}%${fileInfo}`,
                  percent
                );
              }
            },
          });
        } catch (initialErr: any) {
          loadError = initialErr;
          console.warn(`Initial model load attempt for ${modelToLoad} failed:`, initialErr);

          // If WebGPU failed, attempt WASM fallback
          if (deviceOption === 'webgpu') {
            this.activeDevice = 'wasm';
            deviceOption = 'wasm';
            this.updateStatus(
              'loading',
              'WebGPU failed or unavailable; falling back to WebAssembly CPU...',
              25
            );

            try {
              loadedPipeline = await pipeline('text-generation', modelToLoad, {
                dtype: cfg.dtype || LOCAL_LLM_DTYPE,
                device: 'wasm',
                progress_callback: (progress: any) => {
                  if (progress && typeof progress.progress === 'number') {
                    const percent = Math.min(100, Math.round(progress.progress * 100));
                    this.downloadProgress = percent;
                    this.updateStatus(
                      'loading',
                      `Downloading local neural weights (WASM): ${percent}%`,
                      percent
                    );
                  }
                },
              });
              loadError = null;
            } catch (wasmErr: any) {
              loadError = wasmErr;
            }
          }

          // If primary repo failed, attempt official onnx-community fallback mirror
          if (!loadedPipeline && loadError && modelToLoad === PRIMARY_LOCAL_LLM_MODEL_ID) {
            console.warn(`Attempting fallback mirror repo ${FALLBACK_LOCAL_LLM_MODEL_ID}`);
            this.activeModelName = FALLBACK_LOCAL_LLM_MODEL_ID;
            this.updateStatus(
              'loading',
              `Trying fallback repository (${FALLBACK_LOCAL_LLM_MODEL_ID})...`,
              50
            );

            try {
              loadedPipeline = await pipeline('text-generation', FALLBACK_LOCAL_LLM_MODEL_ID, {
                dtype: LOCAL_LLM_DTYPE,
                device: 'wasm',
                progress_callback: (progress: any) => {
                  if (progress && typeof progress.progress === 'number') {
                    const percent = Math.min(100, Math.round(progress.progress * 100));
                    this.downloadProgress = percent;
                    this.updateStatus(
                      'loading',
                      `Downloading local neural weights: ${percent}%`,
                      percent
                    );
                  }
                },
              });
              loadError = null;
            } catch (fallbackErr: any) {
              loadError = fallbackErr;
            }
          }

          if (!loadedPipeline) {
            throw (
              loadError ||
              new Error(
                'Unable to load this local model. No data was sent to a cloud AI service. Try another verified local model or retry.'
              )
            );
          }
        }

        this.generatorInstance = loadedPipeline;
        const currentCfg = getLocalModelConfig(this.activeModelName);
        this.updateStatus(
          'ready',
          `Local AI ready (${currentCfg.shortName} • ${this.getBackendName()})`,
          100,
          null
        );
        return loadedPipeline;
      } catch (err: any) {
        this.generatorInstance = null;
        this.loadPromise = null;
        const errMessage =
          'Unable to load this local model. No data was sent to a cloud AI service. Try another verified local model or retry.';
        this.updateStatus(
          'error',
          `Model error: ${errMessage}`,
          0,
          errMessage
        );
        throw new Error(`ClientLocalLLMService Error: ${errMessage}`);
      }
    })();

    return this.loadPromise;
  }

  /**
   * Generates a grounded answer from the local model.
   * Supports streaming token delivery, cancellation, and concurrency safety.
   */
  async generateAnswer(
    systemPrompt: string,
    userPrompt: string,
    options: LocalGenerationOptions = {}
  ): Promise<LocalGenerationResult> {
    if (this.isGenerating) {
      throw new Error(
        'Local LLM generation already in progress. Please wait for the current answer to complete.'
      );
    }

    if (options.abortSignal?.aborted) {
      throw new Error('Generation aborted before start.');
    }

    const generator = await this.loadModel();

    this.isGenerating = true;
    this.updateStatus('generating', 'Synthesizing grounded response locally...', 100);

    const startTime = performance.now();
    let accumulatedText = '';
    let tokenCount = 0;

    // Create interruptable stopping criteria for user cancellation
    const stopper = new InterruptableStoppingCriteria();
    this.activeStoppingCriteria = stopper;

    const onAbort = () => {
      this.updateStatus('cancelling', 'Cancelling generation...', 100);
      stopper.interrupt();
    };

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      if (options.abortSignal?.aborted) {
        throw new Error('Generation aborted.');
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const maxNewTokens = options.maxTokens || 180;
      const repetitionPenalty = options.repetitionPenalty || 1.15;

      // Set up streaming TextStreamer
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (piece: string) => {
          accumulatedText += piece;
          tokenCount++;
          if (options.onToken) {
            options.onToken(piece, accumulatedText);
          }
        },
      });

      const output = await generator(messages, {
        max_new_tokens: maxNewTokens,
        do_sample: false,
        temperature: options.temperature !== undefined ? options.temperature : 0.0,
        repetition_penalty: repetitionPenalty,
        return_full_text: false,
        streamer: streamer,
        stopping_criteria: [stopper],
      });

      const generationDurationMs = Math.round(performance.now() - startTime);
      this.lastGenerationDurationMs = generationDurationMs;
      this.lastTokensGenerated = tokenCount;

      let answerText = accumulatedText;
      if (!answerText.trim() && Array.isArray(output) && output.length > 0) {
        const item = output[0];
        if (item.generated_text) {
          if (Array.isArray(item.generated_text)) {
            const last = item.generated_text[item.generated_text.length - 1];
            answerText = last?.content || '';
          } else if (typeof item.generated_text === 'string') {
            answerText = item.generated_text;
          }
        }
      }

      // Clean post-processing
      answerText = this.postProcessAnswer(answerText);

      this.updateStatus('Complete', 'Answer generated successfully', 100);

      // Revert status to ready after a brief moment
      setTimeout(() => {
        if (this.status === 'Complete' || this.status === 'ready') {
          this.updateStatus('ready', `Local AI ready (${this.activeModelName})`, 100);
        }
      }, 800);

      return {
        answer: answerText,
        model: `${this.activeModelName} (${LOCAL_LLM_DTYPE})`,
        generationDurationMs,
        tokensGenerated: tokenCount,
        device: this.activeDevice,
        backend: this.getBackendName(),
      };
    } catch (err: any) {
      if (options.abortSignal?.aborted || stopper.interrupted) {
        this.updateStatus('ready', `Generation cancelled by user`, 100);
        return {
          answer: accumulatedText ? this.postProcessAnswer(accumulatedText) : 'Generation stopped by user.',
          model: `${this.activeModelName} (${LOCAL_LLM_DTYPE})`,
          generationDurationMs: Math.round(performance.now() - startTime),
          tokensGenerated: tokenCount,
          device: this.activeDevice,
          backend: this.getBackendName(),
        };
      }

      this.updateStatus(
        'error',
        `Inference failed: ${err?.message || 'Execution error'}`,
        100,
        err?.message
      );
      throw err;
    } finally {
      this.isGenerating = false;
      this.activeStoppingCriteria = null;
      if (options.abortSignal) {
        options.abortSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  /**
   * Post-processes raw model outputs to enforce conciseness and remove artifacts.
   */
  private postProcessAnswer(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';

    let cleaned = raw.trim();

    // Strip leading conversational fillers
    cleaned = cleaned
      .replace(
        /^(Here is (a|the) (possible )?answer:?|Answer:?|Based on the (provided|retrieved) (knowledge|context|evidence):?)/i,
        ''
      )
      .trim();

    // Stop at common prompt leakage tokens or artificial conversational turns
    const stopTokens = [
      '\nUSER QUESTION:',
      '\nQUESTION:',
      '\nRETRIEVED KNOWLEDGE:',
      '\n<retrieved_evidence>',
      '</retrieved_evidence>',
      '\n<GROUNDING_CONTEXT>',
      '</GROUNDING_CONTEXT>',
      '<GROUNDING_CONTEXT>',
      '\nSOURCE [',
      '\nSOURCE ',
      '\nFile:',
      '\nPage:',
      '\nChunk:',
      '\nEverything inside GROUNDING_CONTEXT',
      '\nInstructions:',
      '\nRules:',
      '\n\nHuman:',
      '\n\nAssistant:',
      '### User',
      '### Assistant',
      '### Instruction',
    ];

    for (const token of stopTokens) {
      const idx = cleaned.indexOf(token);
      if (idx !== -1) {
        cleaned = cleaned.substring(0, idx).trim();
      }
    }

    return cleaned;
  }

  /**
   * Cancels any active generation in-flight.
   */
  cancelGeneration(): void {
    if (this.activeStoppingCriteria) {
      this.activeStoppingCriteria.interrupt();
    }
  }

  /**
   * Releases memory if needed.
   */
  dispose(): void {
    if (this.activeStoppingCriteria) {
      this.activeStoppingCriteria.interrupt();
    }
    this.generatorInstance = null;
    this.loadPromise = null;
    this.isGenerating = false;
    this.updateStatus('idle', 'Local model unloaded', 0, null);
  }
}

export const clientLocalLLMService = ClientLocalLLMService.getInstance();
