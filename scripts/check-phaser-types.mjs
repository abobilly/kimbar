#!/usr/bin/env node
/**
 * check-phaser-types.mjs - Verify Phaser types resolve from node_modules
 *
 * This sentinel check ensures:
 * 1. No custom phaser.d.ts shadows official types
 * 2. Phaser package is installed with types
 *
 * Usage: node scripts/check-phaser-types.mjs
 */

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let errors = [];

function error(msg) {
  errors.push(`❌ ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠️ ${msg}`);
}

console.log('🎮 Phaser Type Check\n');

// 1. Check Phaser package exists
const phaserPath = join(ROOT, 'node_modules', 'phaser');
if (!existsSync(phaserPath)) {
  error('Phaser package not found in node_modules');
} else {
  ok('Phaser package installed');
}

// 2. Check Phaser types exist
const phaserTypesPath = join(phaserPath, 'types');
if (!existsSync(phaserTypesPath)) {
  error('Phaser types directory not found');
} else {
  ok('Phaser types directory exists');
}

// 3. Check no custom phaser.d.ts in src/
const srcDir = join(ROOT, 'src');
const customDtsFiles = [];

function scanForPhaserDts(dir) {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      scanForPhaserDts(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().includes('phaser') && entry.name.endsWith('.d.ts')) {
      customDtsFiles.push(fullPath.replace(ROOT, ''));
    }
  }
}

scanForPhaserDts(srcDir);

if (customDtsFiles.length > 0) {
  error(`Custom Phaser type definitions found (may shadow official types):`);
  customDtsFiles.forEach(f => console.log(`    ${f}`));
} else {
  ok('No custom phaser.d.ts files in src/');
}

// 4. Check vite-env.d.ts doesn't declare Phaser globals
const viteEnvPath = join(ROOT, 'src', 'vite-env.d.ts');
if (existsSync(viteEnvPath)) {
  const { readFileSync } = await import('fs');
  const content = readFileSync(viteEnvPath, 'utf-8');
  if (content.toLowerCase().includes('phaser')) {
    warn('vite-env.d.ts mentions Phaser - review for type conflicts');
  } else {
    ok('vite-env.d.ts clean (no Phaser overrides)');
  }
}

// Summary
console.log('\n' + '='.repeat(40));

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  ${e}`));
  console.log(`\n❌ Phaser type check failed with ${errors.length} error(s)`);
  process.exit(1);
} else {
  console.log('\n✅ Phaser types configured correctly');
  console.log('   Types resolve from node_modules/phaser/types');
}
