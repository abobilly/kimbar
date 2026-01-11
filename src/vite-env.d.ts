/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PHYS_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
