#!/usr/bin/env node
/**
 * MCP Flashcards Server - Qdrant-backed flashcard search & sync
 * 
 * Tools:
 * - flashcards.search: semantic search across indexed flashcards
 * - flashcards.sync: fetch from Cloudflare API and index to Qdrant
 * - flashcards.byCategory: list flashcards by category
 * - flashcards.status: collection stats
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'crypto';
import OpenAI from 'openai';

// Environment
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_FLASHCARDS_COLLECTION || 'kimbar_flashcards_v1_3072';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-large';
const EMBED_DIMS = parseInt(process.env.OPENAI_EMBED_DIMS || '3072', 10);
const FLASHCARD_API_URL = process.env.FLASHCARD_API_URL || 'https://flashcard-api.andrewsbadger.workers.dev/flashcards';

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

// Types
interface Flashcard {
    id: string;
    question: string;
    answer: string;
    category?: string;
    subject?: string;
    tags?: string[];
}

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

// Tool implementations
async function flashcardsSearch(query: string, limit = 10, category?: string): Promise<unknown> {
    const vector = await embed(query);

    const filter: Record<string, unknown> = {};
    if (category) {
        filter.must = [{ key: 'category', match: { value: category } }];
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
        id: r.payload.id,
        question: r.payload.question,
        answer: (r.payload.answer as string).slice(0, 500),
        category: r.payload.category,
        score: r.score,
    }));
}

async function flashcardsSync(): Promise<unknown> {
    const startTime = Date.now();

    // Fetch flashcards from Cloudflare API
    const response = await fetch(FLASHCARD_API_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch flashcards: ${response.status}`);
    }
    const flashcards: Flashcard[] = await response.json();

    let indexedCount = 0;
    const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

    for (const card of flashcards) {
        // Combine question and answer for embedding
        const text = `${card.question}\n\n${card.answer}`;
        const pointId = uuidv5(`flashcard:${card.id}`);

        try {
            const vector = await embed(text);

            points.push({
                id: pointId,
                vector,
                payload: {
                    id: card.id,
                    question: card.question,
                    answer: card.answer,
                    category: card.category || 'general',
                    subject: card.subject || '',
                    tags: card.tags || [],
                },
            });

            indexedCount++;

            // Batch upsert every 50 points
            if (points.length >= 50) {
                await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
                points.length = 0;
            }
        } catch (err) {
            console.error(`Error indexing flashcard ${card.id}:`, err);
        }
    }

    // Final batch
    if (points.length > 0) {
        await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points`, 'PUT', { points });
    }

    const durationMs = Date.now() - startTime;

    return {
        fetchedCards: flashcards.length,
        indexedCards: indexedCount,
        durationMs,
        collection: QDRANT_COLLECTION,
    };
}

async function flashcardsByCategory(category: string, limit = 20): Promise<unknown> {
    const result = await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points/scroll`, 'POST', {
        filter: {
            must: [{ key: 'category', match: { value: category } }],
        },
        limit,
        with_payload: true,
    }) as {
        result: { points: Array<{ id: string; payload: Record<string, unknown> }> };
    };

    return result.result.points.map((p) => ({
        id: p.payload.id,
        question: p.payload.question,
        answer: (p.payload.answer as string).slice(0, 200),
        category: p.payload.category,
    }));
}

async function flashcardsStatus(): Promise<unknown> {
    const result = await qdrantRequest(`/collections/${QDRANT_COLLECTION}`) as {
        result: { points_count: number; vectors_count: number };
    };

    return {
        collection: QDRANT_COLLECTION,
        embeddingModel: EMBED_MODEL,
        vectorSize: EMBED_DIMS,
        cardCount: result.result.points_count,
        apiUrl: FLASHCARD_API_URL,
    };
}

// MCP Server
const server = new Server(
    { name: 'kimbar-flashcards', version: '0.1.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'flashcards.search',
            description: 'Semantic search across indexed flashcards',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query (can be a question or topic)' },
                    limit: { type: 'number', description: 'Max results (default 10)' },
                    category: { type: 'string', description: 'Filter by category' },
                },
                required: ['query'],
            },
        },
        {
            name: 'flashcards.sync',
            description: 'Fetch flashcards from API and index to Qdrant',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'flashcards.byCategory',
            description: 'List flashcards by category',
            inputSchema: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Category name' },
                    limit: { type: 'number', description: 'Max results (default 20)' },
                },
                required: ['category'],
            },
        },
        {
            name: 'flashcards.status',
            description: 'Get collection stats',
            inputSchema: { type: 'object', properties: {} },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result: unknown;

        switch (name) {
            case 'flashcards.search':
                result = await flashcardsSearch(
                    (args as { query: string }).query,
                    (args as { limit?: number }).limit,
                    (args as { category?: string }).category
                );
                break;
            case 'flashcards.sync':
                result = await flashcardsSync();
                break;
            case 'flashcards.byCategory':
                result = await flashcardsByCategory(
                    (args as { category: string }).category,
                    (args as { limit?: number }).limit
                );
                break;
            case 'flashcards.status':
                result = await flashcardsStatus();
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
