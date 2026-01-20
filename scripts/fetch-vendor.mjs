#!/usr/bin/env node
/**
 * Fetch Vendor - Clones ULPC Character Generator for sprite generation
 * 
 * Usage: node scripts/fetch-vendor.mjs
 * 
 * Static assets (props, tilesets, UI) are now in the committed assets/ folder.
 * This script only handles the ULPC generator (too large to commit).
 */

import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

async function main() {
  console.log('📦 Fetch Vendor (ULPC Generator)\n');
  console.log('='.repeat(50));

  await cloneULPC();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Fetch complete');
  console.log('\nNote: Static assets are now in assets/ (committed to git)');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run gen:sprites -- [character_id]');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
