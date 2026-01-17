#!/usr/bin/env node
/**
 * MCP Repo Server - Qdrant-backed semantic code search
 * 
 * Tools:
 * - repo.search: semantic search across indexed code
 * - repo.lookup: read file contents by path
 * - repo.reindex: index/reindex repository chunks
 * - repo.status: collection stats
 * - repo.find: literal grep search (no embeddings)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
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

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Qdrant helpers
async function qdrantRequest(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
    const url = `${QDRANT_URL}${endpoint}`;
    const headers: Record<string, string> = {
        'api-key': QDRANT_API_KEY!,
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

// Embedding helper
async function embed(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: text,
        dimensions: EMBED_DIMS,
    });
    return response.data[0].embedding;
}

// UUID v5 helper for stable point IDs
function uuidv5(name: string, namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'): string {
    const hash = createHash('sha1');
    // Simple implementation - combine namespace and name
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
function shouldIndex(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    // Skip patterns
    if (normalized.includes('node_modules/')) return false;
    if (normalized.includes('dist/')) return false;
    if (normalized.includes('build/')) return false;
    if (normalized.includes('generated/')) return false;
    if (normalized.includes('__MACOSX/')) return false;
    if (normalized.includes('/._')) return false;
    if (normalized.endsWith('.png') || normalized.endsWith('.jpg') || normalized.endsWith('.gif')) return false;
    if (normalized.endsWith('.aseprite')) return false;
    if (normalized.endsWith('.woff') || normalized.endsWith('.woff2') || normalized.endsWith('.ttf')) return false;

    // Check scope
    return INDEX_SCOPE.some(scope => normalized.includes(scope));
}

function getKind(filePath: string): string {
    if (filePath.endsWith('.md')) return 'doc';
    if (filePath.endsWith('.json')) return 'config';
    if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'code';
    if (filePath.endsWith('.ink')) return 'dialogue';
    return 'other';
}

function chunkFile(content: string, filePath: string): Array<{ text: string; startLine: number; endLine: number }> {
    const lines = content.split('\n');
    const chunks: Array<{ text: string; startLine: number; endLine: number }> = [];

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

async function walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string) {
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

// Tool implementations
async function repoSearch(query: string, limit = 10, pathPrefix?: string, ext?: string[]): Promise<unknown> {
    const vector = await embed(query);

    const filter: Record<string, unknown> = {};
    if (pathPrefix || ext) {
        filter.must = [];
        if (pathPrefix) {
            (filter.must as unknown[]).push({ key: 'path', match: { text: pathPrefix } });
        }
        if (ext && ext.length > 0) {
            (filter.must as unknown[]).push({ key: 'ext', match: { any: ext } });
        }
    }

    const body: Record<string, unknown> = {
        vector,
        limit,
        with_payload: true,
    };
    if (Object.keys(filter).length > 0) {
        body.filter = filter;
    }

    const result = await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points/search`, 'POST', body) as {
        result: Array<{ id: string; score: number; payload: Record<string, unknown> }>;
    };

    return result.result.map((r) => ({
        path: r.payload.path,
        startLine: r.payload.startLine,
        endLine: r.payload.endLine,
        snippet: (r.payload.text as string).slice(0, 500),
        score: r.score,
    }));
}

async function repoLookup(filePath: string, startLine?: number, endLine?: number): Promise<unknown> {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absPath)) {
        return { error: `File not found: ${filePath}` };
    }

    const content = await fs.promises.readFile(absPath, 'utf-8');
    const lines = content.split('\n');

    const start = startLine ? startLine - 1 : 0;
    const end = endLine ? endLine : lines.length;

    return {
        path: filePath,
        startLine: start + 1,
        endLine: end,
        text: lines.slice(start, end).join('\n'),
    };
}

async function repoReindex(scope: 'changed' | 'pathPrefix' | 'all' = 'changed', pathPrefix?: string): Promise<unknown> {
    const startTime = Date.now();
    const cwd = process.cwd();
    const files = await walkDir(cwd);

    let filesToIndex = files;
    if (scope === 'pathPrefix' && pathPrefix) {
        filesToIndex = files.filter(f => f.replace(/\\/g, '/').includes(pathPrefix));
    }
    // For 'changed', we'd need git diff - for now, index all matching files

    let indexedChunks = 0;
    const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

    for (const file of filesToIndex) {
        try {
            const content = await fs.promises.readFile(file, 'utf-8');
            const relPath = path.relative(cwd, file).replace(/\\/g, '/');
            const chunks = chunkFile(content, relPath);

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

                // Batch upsert every 50 points
                if (points.length >= 50) {
                    await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
                    points.length = 0;
                }
            }
        } catch (err) {
            console.error(`Error indexing ${file}:`, err);
        }
    }

    // Final batch
    if (points.length > 0) {
        await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
    }

    const durationMs = Date.now() - startTime;

    return {
        indexedFiles: filesToIndex.length,
        indexedChunks,
        durationMs,
        collection: QDRANT_COLLECTION,
    };
}

async function repoStatus(): Promise<unknown> {
    const result = await qdrantRequest(`/collections/${QDRANT_COLLECTION}`) as {
        result: { points_count: number; vectors_count: number };
    };

    return {
        collection: QDRANT_COLLECTION,
        embeddingModel: EMBED_MODEL,
        vectorSize: EMBED_DIMS,
        pointCount: result.result.points_count,
        qdrantUrl: QDRANT_URL,
    };
}

async function repoFind(pattern: string, pathPrefix?: string, ext?: string[], caseSensitive = false): Promise<unknown> {
    const cwd = process.cwd();
    const files = await walkDir(cwd);

    let filesToSearch = files;
    if (pathPrefix) {
        filesToSearch = files.filter(f => f.replace(/\\/g, '/').includes(pathPrefix));
    }
    if (ext && ext.length > 0) {
        filesToSearch = filesToSearch.filter(f => ext.some(e => f.endsWith(e)));
    }

    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    const results: Array<{ path: string; line: number; text: string }> = [];

    for (const file of filesToSearch) {
        try {
            const content = await fs.promises.readFile(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    results.push({
                        path: path.relative(cwd, file).replace(/\\/g, '/'),
                        line: i + 1,
                        text: lines[i].trim().slice(0, 200),
                    });
                    if (results.length >= 100) break;
                }
                regex.lastIndex = 0; // Reset for global regex
            }

            if (results.length >= 100) break;
        } catch {
            // Skip unreadable files
        }
    }

    return results;
}

// MCP Server
const server = new Server(
    { name: 'kimbar-repo', version: '0.1.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'repo.search',
            description: 'Semantic search across indexed repository code',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'number', description: 'Max results (default 10)' },
                    pathPrefix: { type: 'string', description: 'Filter by path prefix' },
                    ext: { type: 'array', items: { type: 'string' }, description: 'Filter by extensions' },
                },
                required: ['query'],
            },
        },
        {
            name: 'repo.lookup',
            description: 'Read file contents by path',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path' },
                    startLine: { type: 'number', description: 'Start line (1-indexed)' },
                    endLine: { type: 'number', description: 'End line' },
                },
                required: ['path'],
            },
        },
        {
            name: 'repo.reindex',
            description: 'Index or reindex repository chunks to Qdrant',
            inputSchema: {
                type: 'object',
                properties: {
                    scope: { type: 'string', enum: ['changed', 'pathPrefix', 'all'], description: 'Index scope' },
                    pathPrefix: { type: 'string', description: 'Path prefix for pathPrefix scope' },
                },
            },
        },
        {
            name: 'repo.status',
            description: 'Get collection stats',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'repo.find',
            description: 'Literal regex search (no embeddings)',
            inputSchema: {
                type: 'object',
                properties: {
                    pattern: { type: 'string', description: 'Regex pattern' },
                    pathPrefix: { type: 'string', description: 'Filter by path prefix' },
                    ext: { type: 'array', items: { type: 'string' }, description: 'Filter by extensions' },
                    caseSensitive: { type: 'boolean', description: 'Case sensitive search' },
                },
                required: ['pattern'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result: unknown;

        switch (name) {
            case 'repo.search':
                result = await repoSearch(
                    (args as { query: string }).query,
                    (args as { limit?: number }).limit,
                    (args as { pathPrefix?: string }).pathPrefix,
                    (args as { ext?: string[] }).ext
                );
                break;
            case 'repo.lookup':
                result = await repoLookup(
                    (args as { path: string }).path,
                    (args as { startLine?: number }).startLine,
                    (args as { endLine?: number }).endLine
                );
                break;
            case 'repo.reindex':
                result = await repoReindex(
                    (args as { scope?: 'changed' | 'pathPrefix' | 'all' }).scope,
                    (args as { pathPrefix?: string }).pathPrefix
                );
                break;
            case 'repo.status':
                result = await repoStatus();
                break;
            case 'repo.find':
                result = await repoFind(
                    (args as { pattern: string }).pattern,
                    (args as { pathPrefix?: string }).pathPrefix,
                    (args as { ext?: string[] }).ext,
                    (args as { caseSensitive?: boolean }).caseSensitive
                );
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
