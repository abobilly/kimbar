import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
});
