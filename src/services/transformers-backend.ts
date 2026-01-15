/**
 * Transformers.js Backend - WebGPU/CPU text embedding implementation
 *
 * This module implements the SemanticService interface using Transformers.js.
 * It is lazy-loaded only when VITE_ENABLE_SEMANTIC=true.
 *
 * REQUIREMENTS (when enabling):
 * 1. Install: npm install @xenova/transformers
 * 2. Set VITE_ENABLE_SEMANTIC=true in .env or environment
 *
 * MODEL SOURCES:
 * - 'huggingface': Download from HF Hub (dev convenience)
 * - 'local': Load from /public/models/ (production, offline)
 *
 * WEBGPU:
 * - Uses WebGPU when available for ~10x speedup
 * - Falls back to CPU (WASM) when WebGPU unavailable
 */

import {
  SemanticService,
  SemanticServiceConfig,
  EmbeddedItem,
  SimilarityResult,
  cosineSimilarity,
  isWebGPUAvailable,
} from './semantic-service';

// Type stubs for Transformers.js (actual types come from package)
// These are placeholders - real implementation imports from @xenova/transformers
type Pipeline = {
  (texts: string | string[], options?: Record<string, unknown>): Promise<{
    data: Float32Array;
  }[]>;
};

/**
 * Transformers.js implementation of SemanticService
 */
export class TransformersBackend implements SemanticService {
  private config: SemanticServiceConfig;
  private pipeline: Pipeline | null = null;
  private device: 'webgpu' | 'cpu' = 'cpu';
  private ready = false;

  constructor(config: SemanticServiceConfig) {
    this.config = config;
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    console.log('[TransformersBackend] Initializing...');

    // Check WebGPU availability
    if (this.config.preferWebGPU) {
      const hasWebGPU = await isWebGPUAvailable();
      this.device = hasWebGPU ? 'webgpu' : 'cpu';
      console.log(`[TransformersBackend] Device: ${this.device}`);
    }

    try {
      // Dynamic import of Transformers.js
      // This is where the actual library would be loaded
      // const { pipeline, env } = await import('@xenova/transformers');

      // For now, throw an error indicating the dependency isn't installed
      throw new Error(
        'Transformers.js not installed. Run: npm install @xenova/transformers'
      );

      // Real implementation would look like:
      // env.allowLocalModels = this.config.modelSource === 'local';
      // if (this.config.localModelPath) {
      //   env.localModelPath = this.config.localModelPath;
      // }
      //
      // this.pipeline = await pipeline('feature-extraction', this.config.modelId, {
      //   device: this.device,
      //   dtype: this.device === 'webgpu' ? 'fp16' : 'fp32',
      // });
      //
      // this.ready = true;
      // console.log(`[TransformersBackend] Ready with model: ${this.config.modelId}`);
    } catch (e) {
      console.error('[TransformersBackend] Failed to initialize:', e);
      throw e;
    }
  }

  async embedText(text: string): Promise<number[]> {
    const embeddings = await this.embedTexts([text]);
    return embeddings[0];
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.ready || !this.pipeline) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const results = await this.pipeline(texts, {
      pooling: 'mean',
      normalize: true,
    });

    return results.map((r) => Array.from(r.data));
  }

  async findSimilar<T>(
    query: string,
    items: EmbeddedItem<T>[],
    topK = 5
  ): Promise<SimilarityResult<T>[]> {
    if (items.length === 0) return [];

    const queryEmbedding = await this.embedText(query);

    const scored = items.map((item) => ({
      item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  getInfo(): { model: string; device: string; ready: boolean } {
    return {
      model: this.config.modelId,
      device: this.device,
      ready: this.ready,
    };
  }
}
