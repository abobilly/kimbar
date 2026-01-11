#!/usr/bin/env node
/**
 * Build Asset Index - Scans vendor/ and creates searchable asset index
 * 
 * Usage: node scripts/build-asset-index.mjs
 * 
 * Outputs:
 *   - generated/asset_index.ndjson (passing assets)
 *   - generated/quarantine.ndjson (failing assets)
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

const VENDOR_DIR = './vendor';
const GENERATED_DIR = './generated';
const CONTRACT_PATH = './content/content_contract.json';

async function loadContract() {
  if (!existsSync(CONTRACT_PATH)) {
    return null;
  }
  const content = await readFile(CONTRACT_PATH, 'utf-8');
  return JSON.parse(content);
}

async function scanDirectory(dir, files = []) {
  if (!existsSync(dir)) return files;
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath, files);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function classifyAsset(filePath, contract) {
  const name = basename(filePath, extname(filePath)).toLowerCase();
  const dir = dirname(filePath).toLowerCase();
  
  // Simple classification based on path/name patterns
  if (dir.includes('character') || dir.includes('char') || name.includes('character')) {
    return 'character_sheet';
  }
  if (dir.includes('tileset') || dir.includes('tiles')) {
    return 'tileset';
  }
  if (dir.includes('prop') || dir.includes('object')) {
    return 'prop';
  }
  if (dir.includes('ui') || dir.includes('interface')) {
    return 'ui';
  }
  
  return 'unknown';
}

function generateId(filePath, kind) {
  const name = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  
  const prefix = {
    'character_sheet': 'char',
    'tileset': 'tile',
    'prop': 'prop',
    'ui': 'ui',
    'unknown': 'asset'
  }[kind] || 'asset';
  
  return `${prefix}.${name}`;
}

function getProvenance(filePath) {
  // Extract pack/source info from path
  // e.g., vendor/lpc/Universal-LPC-Spritesheet-Character-Generator/spritesheets/body/...
  const parts = filePath.replace(/\\/g, '/').split('/');
  
  if (parts[0] === 'vendor' || parts[0] === './vendor') {
    const vendorParts = parts.slice(1);
    
    // Check for known sources
    if (vendorParts[0] === 'lpc' && vendorParts[1]?.includes('Universal-LPC')) {
      return {
        source: 'ulpc-generator',
        packId: 'ulpc',
        license: 'CC-BY-SA 3.0 / GPL 3.0'
      };
    }
    
    // Generic vendor source
    return {
      source: vendorParts[0] || 'unknown',
      packId: vendorParts[1] || 'base',
      license: 'unknown'
    };
  }
  
  return {
    source: 'local',
    packId: 'custom',
    license: 'proprietary'
  };
}

function validateAsset(filePath, kind, contract) {
  const notes = [];
  
  // TODO: Add actual PNG dimension checking with sharp
  // For now, just mark as pending validation
  notes.push('dimensions not verified (TODO: implement image analysis)');
  
  return {
    compliance: notes.length === 0 ? 'pass' : 'pending',
    notes
  };
}

async function main() {
  console.log('🗂️ Build Asset Index\n');
  console.log('=' .repeat(50));
  
  // Load contract
  const contract = await loadContract();
  if (contract) {
    console.log(`\n✅ Loaded contract v${contract.version}`);
  }
  
  // Ensure generated directory exists
  await mkdir(GENERATED_DIR, { recursive: true });
  
  // Scan vendor directory
  console.log('\n📁 Scanning vendor/ for assets...');
  const files = await scanDirectory(VENDOR_DIR);
  
  if (files.length === 0) {
    console.log('\n⚠️ No image files found in vendor/');
    console.log('   Run: npm run fetch-vendor to download assets');
    return;
  }
  
  console.log(`   Found ${files.length} image file(s)`);
  
  // Process each file
  const passing = [];
  const failing = [];
  
  for (const filePath of files) {
    const kind = classifyAsset(filePath, contract);
    const id = generateId(filePath, kind);
    const { compliance, notes } = validateAsset(filePath, kind, contract);
    const provenance = getProvenance(filePath);
    
    const entry = {
      id,
      label: basename(filePath, extname(filePath)),
      source: provenance.source,
      packId: provenance.packId,
      license: provenance.license,
      path: filePath.replace(/\\/g, '/'),
      kind,
      compliance,
      notes
    };
    
    if (compliance === 'pass') {
      passing.push(entry);
    } else {
      failing.push(entry);
    }
  }
  
  // Write outputs
  const indexPath = join(GENERATED_DIR, 'asset_index.ndjson');
  const quarantinePath = join(GENERATED_DIR, 'quarantine.ndjson');
  
  await writeFile(indexPath, passing.map(e => JSON.stringify(e)).join('\n') + '\n');
  await writeFile(quarantinePath, failing.map(e => JSON.stringify(e)).join('\n') + '\n');
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 Index Summary:');
  console.log(`   ✅ Passing: ${passing.length}`);
  console.log(`   ⚠️ Pending/Failed: ${failing.length}`);
  console.log(`\n   Index: ${indexPath}`);
  console.log(`   Quarantine: ${quarantinePath}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
