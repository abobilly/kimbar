#!/usr/bin/env node
/**
 * assets-search.mjs
 * CLI tool to search the asset index
 * 
 * Usage:
 *   node scripts/assets-search.mjs <query>
 *   npm run assets:search -- "clerk sprite"
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, '..', 'generated', 'asset_index.ndjson');
const QUARANTINE_PATH = join(__dirname, '..', 'generated', 'quarantine.ndjson');

/**
 * Load an NDJSON file
 */
async function loadNdjson(path) {
  try {
    const content = await readFile(path, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Load the asset index (passing + quarantine)
 */
async function loadIndex() {
  const passing = await loadNdjson(INDEX_PATH);
  const quarantine = await loadNdjson(QUARANTINE_PATH);
  
  if (passing.length === 0 && quarantine.length === 0) {
    console.error('❌ Asset index not found. Run: npm run build:asset-index');
    process.exit(1);
  }
  
  // Mark quarantine assets
  quarantine.forEach(a => a._quarantine = true);
  
  return [...passing, ...quarantine];
}

/**
 * Score an asset against a query
 */
function scoreAsset(asset, queryTerms) {
  let score = 0;
  const searchable = [
    asset.id || '',
    asset.label || '',
    asset.path || '',
    asset.kind || '',
    ...(asset.tags || [])
  ].join(' ').toLowerCase();
  
  for (const term of queryTerms) {
    const lowerTerm = term.toLowerCase();
    
    // Exact ID match = highest score
    if (asset.id?.toLowerCase() === lowerTerm) {
      score += 100;
    }
    // ID contains term
    else if (asset.id?.toLowerCase().includes(lowerTerm)) {
      score += 50;
    }
    
    // Tag match
    if (asset.tags?.some(t => t.toLowerCase() === lowerTerm)) {
      score += 30;
    }
    
    // Kind match
    if (asset.kind?.toLowerCase().includes(lowerTerm)) {
      score += 20;
    }
    
    // Path/label contains term
    if (searchable.includes(lowerTerm)) {
      score += 10;
    }
  }
  
  return score;
}

/**
 * Generate registry snippet for an asset
 */
function generateSnippet(asset) {
  if (asset.kind === 'character_sheet' || asset.tags?.includes('spritesheet')) {
    return `{
  "id": "${asset.id}",
  "url": "${asset.url || asset.path}",
  "frameWidth": ${asset.frameWidth || 64},
  "frameHeight": ${asset.frameHeight || 64}
}`;
  }
  
  if (asset.tags?.includes('portrait')) {
    return `{
  "id": "${asset.id}",
  "portraitUrl": "${asset.url || asset.path}"
}`;
  }
  
  return `{
  "id": "${asset.id}",
  "path": "${asset.path}"
}`;
}

/**
 * Main CLI entry point
 */
async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  
  if (!query) {
    console.log('Usage: npm run assets:search -- "<query>"');
    console.log('\nExamples:');
    console.log('  npm run assets:search -- "clerk"');
    console.log('  npm run assets:search -- "portrait npc"');
    console.log('  npm run assets:search -- "character spritesheet"');
    process.exit(0);
  }
  
  console.log(`🔍 Searching for: "${query}"\n`);
  
  const index = await loadIndex();
  const terms = query.split(/\s+/).filter(Boolean);
  
  // Score and rank results
  const scored = index
    .map(asset => ({ asset, score: scoreAsset(asset, terms) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (scored.length === 0) {
    console.log('No matching assets found.\n');
    console.log('Try: npm run assets:search -- "lpc" or "sprite"');
    process.exit(0);
  }
  
  // Show top 10 results
  const top = scored.slice(0, 10);
  
  console.log(`Found ${scored.length} result(s). Top ${top.length}:\n`);
  console.log('─'.repeat(60));
  
  for (const { asset, score } of top) {
    const status = asset._quarantine ? '⚠️' : '✅';
    console.log(`\n${status} ${asset.id}`);
    console.log(`   Kind: ${asset.kind}`);
    console.log(`   Tags: ${(asset.tags || []).join(', ') || 'none'}`);
    console.log(`   Path: ${asset.path}`);
    if (asset.url) console.log(`   URL:  ${asset.url}`);
    if (asset._quarantine) console.log(`   Status: quarantine (${asset.compliance})`);
    console.log(`   Score: ${score}`);
    console.log(`\n   Registry snippet:`);
    console.log(generateSnippet(asset).split('\n').map(l => '   ' + l).join('\n'));
    console.log('\n' + '─'.repeat(60));
  }
  
  if (scored.length > 10) {
    console.log(`\n... and ${scored.length - 10} more result(s)`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
