/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PHYS_DEBUG?: string;
  /** Enable semantic search features (Transformers.js). Default: false */
  readonly VITE_ENABLE_SEMANTIC?: string;
  /** External flashcard API URL (for production with private data) */
  readonly VITE_FLASHCARD_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
