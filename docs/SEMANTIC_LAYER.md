# Semantic Layer (Optional Feature)

The semantic layer provides AI-powered text similarity features for Kim Bar, enabling features like "related flashcards" and semantic search.

## Status: Disabled by Default

This feature is **gated behind a feature flag** and adds **zero bundle cost** when disabled.

## Enabling the Feature

1. **Install Transformers.js** (not currently installed):
   ```bash
   npm install @xenova/transformers
   ```

2. **Set environment variable**:
   ```bash
   # In .env or shell
   VITE_ENABLE_SEMANTIC=true
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  semantic-service.ts                                         │
│  ├── SemanticService interface                               │
│  ├── isSemanticEnabled() - checks feature flag               │
│  ├── getSemanticService() - factory (lazy loads backend)     │
│  └── cosineSimilarity() - vector math utility                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (lazy import when enabled)
┌─────────────────────────────────────────────────────────────┐
│  transformers-backend.ts                                     │
│  ├── TransformersBackend implements SemanticService          │
│  ├── WebGPU detection + fallback to CPU                      │
│  └── Model loading from HF Hub or local path                 │
└─────────────────────────────────────────────────────────────┘
```

## API Reference

### SemanticService Interface

```typescript
interface SemanticService {
  // Check if service is ready
  isReady(): boolean;

  // Initialize (loads model, may take 10-30 seconds)
  initialize(): Promise<void>;

  // Generate embedding vector for text
  embedText(text: string): Promise<number[]>;

  // Batch embed multiple texts (more efficient)
  embedTexts(texts: string[]): Promise<number[][]>;

  // Find similar items from pre-embedded collection
  findSimilar<T>(
    query: string,
    items: EmbeddedItem<T>[],
    topK?: number
  ): Promise<SimilarityResult<T>[]>;

  // Get service info
  getInfo(): { model: string; device: string; ready: boolean };
}
```

### Usage Example

```typescript
import { getSemanticService, isSemanticEnabled, EmbeddedItem } from '@/services/semantic-service';

// Check if enabled before doing anything
if (!isSemanticEnabled()) {
  console.log('Semantic features disabled');
  return;
}

// Get service (lazy loads Transformers.js)
const service = await getSemanticService();

// Initialize (downloads model on first run)
await service.initialize();

// Embed some flashcards
const cards: EmbeddedItem[] = [];
for (const card of flashcards) {
  const embedding = await service.embedText(card.question);
  cards.push({
    id: card.id,
    text: card.question,
    embedding,
    data: card,
  });
}

// Find related cards
const related = await service.findSimilar('What is hearsay?', cards, 5);
console.log('Related cards:', related.map(r => r.item.data.question));
```

## Model Configuration

### Hugging Face Hub (Development)

Default behavior - downloads model from HF Hub on first use:

```typescript
const service = await getSemanticService({
  modelSource: 'huggingface',
  modelId: 'Xenova/all-MiniLM-L6-v2',  // ~23MB
});
```

### Local Models (Production)

For offline/production use, host models in `/public/models/`:

```typescript
const service = await getSemanticService({
  modelSource: 'local',
  modelId: 'all-MiniLM-L6-v2',
  localModelPath: '/models',
});
```

## WebGPU Support

The service automatically detects WebGPU availability:

- **WebGPU available**: Uses GPU acceleration (~10x faster)
- **WebGPU unavailable**: Falls back to CPU (WASM)

You can check device info:

```typescript
const info = service.getInfo();
console.log(`Using ${info.device} with model ${info.model}`);
```

## Bundle Impact

| State | Bundle Impact |
|-------|---------------|
| `VITE_ENABLE_SEMANTIC=false` (default) | 0 bytes |
| `VITE_ENABLE_SEMANTIC=true` | ~50MB (Transformers.js + model) |

The lazy import pattern ensures the large Transformers.js library is only loaded when the feature is enabled AND actually used.

## Potential Use Cases

1. **Related Flashcards**: Show cards similar to current question
2. **Semantic Search**: Search flashcards by meaning, not just keywords
3. **Study Recommendations**: Suggest cards based on weak areas
4. **Answer Validation**: Check if user's answer is semantically close to correct answer

## Limitations

- First initialization is slow (model download + warm-up)
- Requires modern browser with WASM support
- WebGPU requires Chrome 113+ or compatible browser
- Large bundle size when enabled

## Future Improvements

- [ ] Model caching in IndexedDB
- [ ] Progress callbacks during initialization
- [ ] Smaller model options (trade accuracy for size)
- [ ] Server-side embedding API option
