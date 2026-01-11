#!/usr/bin/env node
/**
 * Build Characters - Reads character specs and generates sprite sheets using ULPC
 * 
 * Usage: node scripts/build-characters.js [--character=<id>]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';

const CONTENT_DIR = './content/characters';
const OUTPUT_DIR = './public/assets/chars';
const ULPCG_CLI = './tools/ulpcg/cli.js';

async function loadCharacterSpecs() {
  const specs = [];
  
  if (!existsSync(CONTENT_DIR)) {
    console.log(`📁 No character specs directory found at ${CONTENT_DIR}`);
    return specs;
  }

  const files = await readdir(CONTENT_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    try {
      const content = await readFile(join(CONTENT_DIR, file), 'utf-8');
      const spec = JSON.parse(content);
      specs.push({ file, spec });
    } catch (e) {
      console.error(`❌ Failed to parse ${file}:`, e.message);
    }
  }
  
  return specs;
}

function buildUlpcArgs(ulpcArgs) {
  const args = [];
  
  for (const [key, value] of Object.entries(ulpcArgs)) {
    if (value !== null && value !== undefined && value !== '') {
      args.push(`--${key}=${value}`);
    }
  }
  
  return args;
}

async function runUlpcGenerator(outputPath, ulpcArgs) {
  return new Promise((resolve, reject) => {
    const args = [ULPCG_CLI, outputPath, ...buildUlpcArgs(ulpcArgs)];
    
    console.log(`  Running: node ${args.join(' ')}`);
    
    const proc = spawn('node', args, { stdio: 'inherit' });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ULPC generator exited with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

async function buildCharacter(file, spec) {
  console.log(`\n🎨 Building character: ${spec.id} (${spec.name})`);
  
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // Build base character
  const outputPath = join(OUTPUT_DIR, `${spec.id}.png`);
  
  try {
    await runUlpcGenerator(outputPath, spec.ulpcArgs);
    console.log(`  ✅ Generated: ${outputPath}`);
  } catch (e) {
    console.error(`  ❌ Failed: ${e.message}`);
    return false;
  }
  
  // Build variants if any
  if (spec.variants && spec.variants.length > 0) {
    for (const variant of spec.variants) {
      const variantArgs = { ...spec.ulpcArgs, ...variant.ulpcOverrides };
      const variantPath = join(OUTPUT_DIR, `${spec.id}_${variant.variantId}.png`);
      
      try {
        await runUlpcGenerator(variantPath, variantArgs);
        console.log(`  ✅ Generated variant: ${variantPath}`);
      } catch (e) {
        console.error(`  ❌ Variant failed: ${e.message}`);
      }
    }
  }
  
  return true;
}

async function main() {
  console.log('🎭 Kim Bar Character Builder\n');
  console.log('=' .repeat(50));
  
  // Check if ULPC generator exists
  if (!existsSync(ULPCG_CLI)) {
    console.error(`❌ ULPC generator not found at ${ULPCG_CLI}`);
    console.log('  Run: git clone https://github.com/basxto/Universal-Spritesheet-Character-Generator.git tools/ulpcg');
    process.exit(1);
  }
  
  // Parse command line args
  const args = process.argv.slice(2);
  const targetChar = args.find(a => a.startsWith('--character='))?.split('=')[1];
  
  // Load specs
  const specs = await loadCharacterSpecs();
  
  if (specs.length === 0) {
    console.log('\n📝 No character specs found.');
    console.log(`   Create JSON files in ${CONTENT_DIR}/`);
    console.log('   See schemas/CharacterSpec.schema.json for format');
    return;
  }
  
  console.log(`\n📋 Found ${specs.length} character spec(s)`);
  
  // Filter if specific character requested
  const toBuild = targetChar 
    ? specs.filter(s => s.spec.id === targetChar)
    : specs;
  
  if (targetChar && toBuild.length === 0) {
    console.error(`❌ Character '${targetChar}' not found`);
    process.exit(1);
  }
  
  // Build each character
  let success = 0;
  let failed = 0;
  
  for (const { file, spec } of toBuild) {
    const ok = await buildCharacter(file, spec);
    if (ok) success++; else failed++;
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`✨ Done! ${success} built, ${failed} failed`);
}

main().catch(console.error);
