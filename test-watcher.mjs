
import { watch } from 'chokidar';
import path from 'path';

const WATCH_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const WATCH_PATTERNS = [
    '**/*.tmx',
    '**/*.tsx',
    '**/*.world'
];

console.log(`Watching: ${WATCH_DIR}`);
console.log(`Patterns: ${WATCH_PATTERNS.join(', ')}`);

const watcher = watch(WATCH_PATTERNS, {
    cwd: WATCH_DIR,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
    }
});

watcher.on('all', (event, relativePath) => {
    console.log(`Event: ${event} - File: ${relativePath}`);
});

watcher.on('error', (error) => {
    console.error(`Watcher error: ${error.message}`);
});

console.log('Waiting for changes... (press Ctrl+C to stop)');
