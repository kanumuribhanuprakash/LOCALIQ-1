/**
 * LOCALIQ Central Local Model Registry
 * 
 * Defines all verified, browser-executable language model configurations.
 * Strictly enforces truthfulness: only models verified to function in-browser
 * using @huggingface/transformers ONNX Runtime Web are exposed.
 */

export interface LocalLLMModelConfig {
  id: string;
  displayName: string;
  shortName: string;
  provider: string;
  runtime: 'transformers.js';
  supportedBackends: ('webgpu' | 'wasm')[];
  contextLength: number;
  approximateSize: string;
  dtype: 'auto' | 'uint8' | 'int8' | 'fp32' | 'fp16' | 'q8' | 'q4' | 'bnb4' | 'q4f16' | 'q2' | 'q2f16' | 'q1' | 'q1f16';
  description: string;
  verified: boolean;
  isDefault?: boolean;
  tag: string;
}

export const LOCAL_LLM_MODELS: LocalLLMModelConfig[] = [
  {
    id: 'HuggingFaceTB/SmolLM-135M-Instruct',
    displayName: 'SmolLM-135M-Instruct (Primary)',
    shortName: 'SmolLM-135M',
    provider: 'HuggingFaceTB',
    runtime: 'transformers.js',
    supportedBackends: ['webgpu', 'wasm'],
    contextLength: 2048,
    approximateSize: '~45 MB (q4 ONNX)',
    dtype: 'q4',
    description: 'Ultra-lightweight on-device instruct model. Rapid inference with minimal memory footprint (~150 MB RAM). Ideal for client-side grounded RAG.',
    verified: true,
    isDefault: true,
    tag: 'Verified • Fast',
  },
  {
    id: 'onnx-community/SmolLM-135M-Instruct',
    displayName: 'SmolLM-135M-Instruct (Community Mirror)',
    shortName: 'SmolLM-135M (Mirror)',
    provider: 'onnx-community',
    runtime: 'transformers.js',
    supportedBackends: ['webgpu', 'wasm'],
    contextLength: 2048,
    approximateSize: '~45 MB (q4 ONNX)',
    dtype: 'q4',
    description: 'Pre-quantized ONNX community mirror of SmolLM-135M. Optimized for browser web runtimes with identical weight structure.',
    verified: true,
    isDefault: false,
    tag: 'Verified • Mirror',
  },
];

export const DEFAULT_LOCAL_LLM_MODEL_ID = 'HuggingFaceTB/SmolLM-135M-Instruct';

/**
 * Returns configuration for the specified model ID, falling back to default.
 */
export function getLocalModelConfig(modelId?: string): LocalLLMModelConfig {
  if (!modelId) return LOCAL_LLM_MODELS[0];
  const found = LOCAL_LLM_MODELS.find(m => m.id === modelId);
  return found || LOCAL_LLM_MODELS[0];
}

/**
 * Checks whether a given model ID is officially verified in this browser environment.
 */
export function isModelVerified(modelId: string): boolean {
  const cfg = LOCAL_LLM_MODELS.find(m => m.id === modelId);
  return cfg ? cfg.verified : false;
}
