/**
 * Cloudflare Worker: Flashcard API
 *
 * Serves flashcard data from R2 with CORS protection.
 * Only allows requests from whitelisted domains.
 */

interface Env {
  FLASHCARD_BUCKET: R2Bucket;
  ALLOWED_ORIGINS: string;
}

// File key in R2 bucket
const FLASHCARD_FILE_KEY = 'flashcards.json';

// Cache flashcard data in memory (Worker instances are reused)
let cachedData: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Parse allowed origins from environment
    const allowedOrigins = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim().toLowerCase())
      .filter(Boolean);

    const origin = request.headers.get('Origin')?.toLowerCase() || '';
    const isAllowedOrigin = allowedOrigins.some(allowed => {
      // Support wildcard subdomains: *.badgey.org
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
      }
      return origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`;
    });

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, isAllowedOrigin ? origin : '', allowedOrigins);
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Route handling
    if (url.pathname === '/flashcards' || url.pathname === '/flashcards.json') {
      return handleFlashcards(request, env, isAllowedOrigin ? origin : '', allowedOrigins);
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleFlashcards(
  request: Request,
  env: Env,
  origin: string,
  allowedOrigins: string[]
): Promise<Response> {
  // Check origin (but allow empty origin for direct browser access during dev)
  const requestOrigin = request.headers.get('Origin');

  if (requestOrigin && !origin) {
    // Origin header present but not in allowlist
    return new Response(JSON.stringify({
      error: 'Forbidden',
      message: 'Origin not allowed'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return createSuccessResponse(cachedData, origin);
    }

    // Fetch from R2
    const object = await env.FLASHCARD_BUCKET.get(FLASHCARD_FILE_KEY);

    if (!object) {
      return new Response(JSON.stringify({
        error: 'Not found',
        message: 'Flashcard data not available'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read and cache the data
    const data = await object.text();
    cachedData = data;
    cacheTimestamp = now;

    return createSuccessResponse(data, origin);

  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: 'Failed to load flashcard data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function createSuccessResponse(data: string, origin: string): Response {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // Browser cache for 5 min
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Vary'] = 'Origin';
  }

  return new Response(data, { headers });
}

function handleCORS(request: Request, origin: string, allowedOrigins: string[]): Response {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return new Response(null, { status: 204, headers });
}
