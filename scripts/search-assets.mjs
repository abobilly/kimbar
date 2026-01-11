#!/usr/bin/env node
/**
 * Search Assets - CLI tool to search the asset index
 * 
 * Usage: node scripts/search-assets.mjs "query"
 * 
 * Options:
 *   --all         Include non-passing assets
 *   --json        Output as JSON
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const INDEX_PATH = './generated/asset_index.ndjson';
const QUARANTINE_PATH = './generated/quarantine.ndjson';

async function loadIndex(path) {
  if (!existsSync(path)) return [];
  
  const content = await readFile(path, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function matchesQuery(entry, query) {
  const searchText = [
    entry.id,
    entry.label,
    entry.kind,
    ...(entry.tags || [])
  ].join(' ').toLowerCase();
  
  return query.toLowerCase().split(/\s+/).every(term => 
    searchText.includes(term)
  );
}

async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--all');
  const jsonOutput = args.includes('--json');
  const query = args.filter(a => !a.startsWith('--')).join(' ');
  
  if (!query) {
    console.log('Usage: node scripts/search-assets.mjs "query" [--all] [--json]');
    console.log('\nExamples:');
    console.log('  node scripts/search-assets.mjs "character"');
    console.log('  node scripts/search-assets.mjs "tile marble" --all');
    process.exit(0);
  }
  
  // Load index
  let entries = await loadIndex(INDEX_PATH);
  
  if (includeAll) {
    const quarantine = await loadIndex(QUARANTINE_PATH);
    entries = [...entries, ...quarantine];
  }
  
  if (entries.length === 0) {
    console.log('⚠️ No asset index found. Run: npm run build:asset-index');
    process.exit(1);
  }
  
  // Search
  const results = entries.filter(e => matchesQuery(e, query));
  
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`🔍 Search: "${query}"\n`);
    console.log(`Found ${results.length} result(s):\n`);
    
    for (const entry of results.slice(0, 20)) {
      console.log(`  ${entry.compliance === 'pass' ? '✅' : '⚠️'} ${entry.id}`);
      console.log(`     ${entry.kind} | ${entry.path}`);
    }
    
    if (results.length > 20) {
      console.log(`\n  ... and ${results.length - 20} more`);
    }
    
    if (results.length > 0) {
      console.log('\n💡 To add to registry, use the id field');
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
