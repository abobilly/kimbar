#!/usr/bin/env node
/**
 * Fetch Vendor - Downloads and unpacks assets from curated sources
 * 
 * Usage: node scripts/fetch-vendor.mjs
 * 
 * Reads content/sources.opengameart.json and downloads packs to vendor/
 * Also clones ULPC generator if not present
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SOURCES_PATH = './content/sources.opengameart.json';
const VENDOR_DIR = './vendor';
const ULPC_DIR = './vendor/lpc/Universal-LPC-Spritesheet-Character-Generator';
const ULPC_REPO = 'https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator.git';

async function cloneULPC() {
  console.log('\n📥 ULPC Character Generator');
  
  if (existsSync(ULPC_DIR)) {
    console.log('   ✅ Already cloned');
    
    // Pull latest
    try {
      console.log('   🔄 Pulling latest...');
      await execAsync('git pull', { cwd: ULPC_DIR });
      console.log('   ✅ Updated');
    } catch (e) {
      console.log('   ⚠️ Could not update:', e.message);
    }
    return;
  }
  
  console.log(`   🔗 ${ULPC_REPO}`);
  console.log('   📦 Cloning (this may take a while)...');
  
  await mkdir('./vendor/lpc', { recursive: true });
  
  try {
    await execAsync(`git clone --depth 1 ${ULPC_REPO}`, { cwd: './vendor/lpc' });
    console.log('   ✅ Cloned successfully');
    
    // Install dependencies
    console.log('   📦 Installing dependencies...');
    await execAsync('npm install', { cwd: ULPC_DIR });
    console.log('   ✅ Dependencies installed');
  } catch (e) {
    console.error('   ❌ Failed to clone:', e.message);
  }
}

async function loadSources() {
  if (!existsSync(SOURCES_PATH)) {
    console.log('⚠️ No sources.opengameart.json found');
    return { sources: [] };
  }
  
  const content = await readFile(SOURCES_PATH, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  console.log('📦 Fetch Vendor Assets\n');
  console.log('=' .repeat(50));
  
  // Always try to clone/update ULPC first
  await cloneULPC();
  
  const config = await loadSources();
  
  if (config.sources.length === 0) {
    console.log('\nNo additional sources in sources.opengameart.json');
  } else {
    // Ensure vendor directory exists
    await mkdir(VENDOR_DIR, { recursive: true });
    
    console.log(`\nProcessing ${config.sources.length} source(s)...`);
    
    for (const source of config.sources) {
      console.log(`\n📥 ${source.name || source.id}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   License: ${source.license || 'Unknown'}`);
      
      // TODO: Implement download logic for archives
      console.log(`   ⚠️ Manual download required - place files in vendor/${source.id}/`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Fetch complete');
  console.log('\nNext steps:');
  console.log('  1. Manually download any pending packs');
  console.log('  2. Run: npm run build:asset-index');
  console.log('  3. Run: npm run gen:sprites -- [character_id]');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
