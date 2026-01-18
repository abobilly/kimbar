#!/usr/bin/env node
/**
 * Standalone indexer - runs repo.reindex directly without MCP protocol
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually from kimbar root (bypass dotenvx auto-injection)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);

const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx);
            const val = trimmed.slice(eqIdx + 1);
            process.env[key] = val;
        }
    }
}
import { createHash } from 'crypto';
import OpenAI from 'openai';

// Environment
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_REPO_COLLECTION || 'kimbar_repo_v1_3072';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-large';
const EMBED_DIMS = parseInt(process.env.OPENAI_EMBED_DIMS || '3072', 10);
const CHUNK_LINES = parseInt(process.env.REPO_CHUNK_LINES || '150', 10);
const CHUNK_OVERLAP = parseInt(process.env.REPO_CHUNK_OVERLAP || '20', 10);
const INDEX_SCOPE = (process.env.REPO_INDEX_SCOPE || 'src,docs,public/content,schemas,scripts').split(',');

// Validation
if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error('ERROR: QDRANT_URL and QDRANT_API_KEY must be set');
    process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY must be set');
    process.exit(1);
}

console.log('Config:', {
    QDRANT_URL,
    QDRANT_COLLECTION,
    EMBED_MODEL,
    EMBED_DIMS,
    CHUNK_LINES,
    INDEX_SCOPE
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Qdrant helpers
async function qdrantRequest(endpoint, method = 'GET', body) {
    const url = `${QDRANT_URL}${endpoint}`;
    const headers = {
        'api-key': QDRANT_API_KEY,
        'Content-Type': 'application/json',
    };
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Qdrant ${method} ${endpoint} failed: ${res.status} ${text}`);
    }
    return res.json();
}

// Embedding helper with rate limiting
let embedCount = 0;
async function embed(text) {
    embedCount++;
    if (embedCount % 10 === 0) {
        console.log(`  Embedded ${embedCount} chunks...`);
    }
    // Rate limit: ~3000 RPM for text-embedding-3-large
    if (embedCount % 50 === 0) {
        await new Promise(r => setTimeout(r, 1000));
    }
    const response = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: text,
        dimensions: EMBED_DIMS,
    });
    return response.data[0].embedding;
}

// UUID v5 helper for stable point IDs
function uuidv5(name, namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8') {
    const hash = createHash('sha1');
    hash.update(namespace + name);
    const hex = hash.digest('hex');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        '5' + hex.slice(13, 16),
        ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20),
        hex.slice(20, 32),
    ].join('-');
}

// File helpers
function shouldIndex(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    // Skip patterns
    if (normalized.includes('node_modules/')) return false;
    if (normalized.includes('dist/')) return false;
    if (normalized.includes('build/')) return false;
    if (normalized.includes('generated/')) return false;
    if (normalized.includes('__MACOSX/')) return false;
    if (normalized.includes('/._')) return false;
    if (normalized.includes('code-assistant-manager/')) return false;  // Skip other repos
    if (normalized.includes('Qwen-Agent/')) return false;  // Skip other repos
    if (normalized.includes('flashcards.json')) return false;  // Use dedicated flashcards collection
    if (normalized.endsWith('.png') || normalized.endsWith('.jpg') || normalized.endsWith('.gif')) return false;
    if (normalized.endsWith('.aseprite')) return false;
    if (normalized.endsWith('.woff') || normalized.endsWith('.woff2') || normalized.endsWith('.ttf')) return false;

    // Check scope
    return INDEX_SCOPE.some(scope => normalized.includes(scope));
}

function getKind(filePath) {
    if (filePath.endsWith('.md')) return 'doc';
    if (filePath.endsWith('.json')) return 'config';
    if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'code';
    if (filePath.endsWith('.ink')) return 'dialogue';
    return 'other';
}

function chunkFile(content, filePath) {
    const lines = content.split('\n');
    const chunks = [];

    for (let i = 0; i < lines.length; i += CHUNK_LINES - CHUNK_OVERLAP) {
        const startLine = i + 1;
        const endLine = Math.min(i + CHUNK_LINES, lines.length);
        const chunkLines = lines.slice(i, endLine);
        const text = chunkLines.join('\n');

        if (text.trim().length > 0) {
            chunks.push({ text, startLine, endLine });
        }

        if (endLine >= lines.length) break;
    }

    return chunks;
}

async function walkDir(dir) {
    const files = [];

    async function walk(currentDir) {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await walk(fullPath);
                }
            } else if (entry.isFile() && shouldIndex(fullPath)) {
                files.push(fullPath);
            }
        }
    }

    await walk(dir);
    return files;
}

// Main
async function main() {
    const startTime = Date.now();
    const cwd = path.resolve(process.cwd(), '../..');  // Go up to kimbar root
    console.log(`Indexing from: ${cwd}`);

    const files = await walkDir(cwd);
    console.log(`Found ${files.length} files to index`);

    let indexedChunks = 0;
    const points = [];

    for (const file of files) {
        try {
            const content = await fs.promises.readFile(file, 'utf-8');
            const relPath = path.relative(cwd, file).replace(/\\/g, '/');
            const chunks = chunkFile(content, relPath);

            console.log(`Processing ${relPath} (${chunks.length} chunks)`);

            for (const chunk of chunks) {
                const pointId = uuidv5(`${relPath}:${chunk.startLine}-${chunk.endLine}`);
                const vector = await embed(chunk.text);

                points.push({
                    id: pointId,
                    vector,
                    payload: {
                        path: relPath,
                        startLine: chunk.startLine,
                        endLine: chunk.endLine,
                        text: chunk.text,
                        kind: getKind(relPath),
                        ext: path.extname(relPath),
                    },
                });

                indexedChunks++;

                // Batch upsert every 20 points
                if (points.length >= 20) {
                    console.log(`  Upserting batch of ${points.length} points...`);
                    await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
                    points.length = 0;
                }
            }
        } catch (err) {
            console.error(`Error indexing ${file}:`, err.message);
        }
    }

    // Final batch
    if (points.length > 0) {
        console.log(`  Upserting final batch of ${points.length} points...`);
        await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
    }

    const durationMs = Date.now() - startTime;
    console.log('\n=== Indexing Complete ===');
    console.log(`Files: ${files.length}`);
    console.log(`Chunks: ${indexedChunks}`);
    console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`Collection: ${QDRANT_COLLECTION}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
