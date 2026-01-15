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
            '@content': path.resolve(__dirname, '../src/content'),
            '@game': path.resolve(__dirname, '../src/game')
        }
    },
    server: {
        port: 8080
    }
});
