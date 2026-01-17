import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'),
            '@content': path.resolve(__dirname, '../src/content'),
            '@game': path.resolve(__dirname, '../src/game'),
            '@world': path.resolve(__dirname, '../src/world'),
            '@types': path.resolve(__dirname, '../src/types'),
            '@debug': path.resolve(__dirname, '../src/debug')
        }
    },
    server: {
        port: 8080
    }
});
