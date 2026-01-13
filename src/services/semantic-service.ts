/**
 * Semantic Service - Provider-agnostic text embedding interface
 *
 * This module provides an abstraction layer for semantic text operations:
 * - Text embeddings (convert text to vectors)
 * - Similarity search (find related items)
 *
 * DESIGN DECISIONS:
 * 1. Feature flag OFF by default (VITE_ENABLE_SEMANTIC=false)
 * 2. Lazy loading - no bundle cost when disabled
 * 3. Provider-agnostic - can use Transformers.js, OpenAI, or local models
 * 4. WebGPU-first with CPU fallback
 *
 * INVARIANT: When flag is OFF, no semantic code is loaded or executed.
 */

/**
 * A text item with an embedding vector
 */
export interface EmbeddedItem<T = unknown> {
  id: string;
  text: string;
  embedding: number[];
  data?: T;
}

/**
 * Similarity search result
 */
export interface SimilarityResult<T = unknown> {
  item: EmbeddedItem<T>;
  score: number; // 0-1, higher = more similar
}

/**
 * Semantic service configuration
 */
export interface SemanticServiceConfig {
  /** Model source: 'huggingface' or 'local' */
  modelSource: 'huggingface' | 'local';
  /** Model ID (e.g., 'Xenova/all-MiniLM-L6-v2') */
  modelId: string;
  /** Local model path (when modelSource='local') */
  localModelPath?: string;
  /** Whether to prefer WebGPU over CPU */
  preferWebGPU: boolean;
}

/**
 * Semantic service interface
 */
export interface SemanticService {
  /** Check if service is ready */
  isReady(): boolean;

  /** Initialize the service (loads model) */
  initialize(): Promise<void>;

  /** Generate embedding for text */
  embedText(text: string): Promise<number[]>;

  /** Batch embed multiple texts */
  embedTexts(texts: string[]): Promise<number[][]>;

  /** Find similar items from a collection */
  findSimilar<T>(
    query: string,
    items: EmbeddedItem<T>[],
    topK?: number
  ): Promise<SimilarityResult<T>[]>;

  /** Get service info (model name, device, etc.) */
  getInfo(): { model: string; device: string; ready: boolean };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SemanticServiceConfig = {
  modelSource: 'huggingface',
  modelId: 'Xenova/all-MiniLM-L6-v2',
  preferWebGPU: true,
};

/**
 * Check if semantic features are enabled
 */
export function isSemanticEnabled(): boolean {
  // Check environment variable (Vite injects at build time)
  const envValue = import.meta.env?.VITE_ENABLE_SEMANTIC;
  return envValue === 'true' || envValue === '1';
}

/**
 * Check if WebGPU is available
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!('gpu' in navigator)) return false;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Stub implementation when semantic is disabled
 */
class StubSemanticService implements SemanticService {
  isReady(): boolean {
    return false;
  }

  async initialize(): Promise<void> {
    console.warn('[SemanticService] Feature disabled. Set VITE_ENABLE_SEMANTIC=true to enable.');
  }

  async embedText(_text: string): Promise<number[]> {
    throw new Error('Semantic service not enabled');
  }

  async embedTexts(_texts: string[]): Promise<number[][]> {
    throw new Error('Semantic service not enabled');
  }

  async findSimilar<T>(
    _query: string,
    _items: EmbeddedItem<T>[],
    _topK?: number
  ): Promise<SimilarityResult<T>[]> {
    throw new Error('Semantic service not enabled');
  }

  getInfo(): { model: string; device: string; ready: boolean } {
    return { model: 'none', device: 'none', ready: false };
  }
}

// Singleton instance
let serviceInstance: SemanticService | null = null;

/**
 * Get the semantic service instance
 *
 * When VITE_ENABLE_SEMANTIC=true, this will lazy-load the Transformers.js backend.
 * When disabled, returns a stub that throws on use.
 *
 * @param config - Optional configuration override
 */
export async function getSemanticService(
  config: Partial<SemanticServiceConfig> = {}
): Promise<SemanticService> {
  if (serviceInstance) {
    return serviceInstance;
  }

  if (!isSemanticEnabled()) {
    serviceInstance = new StubSemanticService();
    return serviceInstance;
  }

  // Lazy load the actual implementation
  // This dynamic import ensures Transformers.js isn't bundled when disabled
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const { TransformersBackend } = await import('./transformers-backend');
    serviceInstance = new TransformersBackend(fullConfig);
    return serviceInstance;
  } catch (e) {
    console.error('[SemanticService] Failed to load Transformers backend:', e);
    serviceInstance = new StubSemanticService();
    return serviceInstance;
  }
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
