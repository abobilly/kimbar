#!/usr/bin/env node
/**
 * compile-ink.mjs - Compile .ink files to JSON for inkjs runtime
 * 
 * Usage:
 *   node scripts/compile-ink.mjs
 *   npm run compile:ink
 * 
 * Compiles content/ink/story.ink -> public/content/ink/story.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

// Import inkjs compiler
let Compiler;
try {
  const inkjs = await import('inkjs/full');
  Compiler = inkjs.Compiler;
} catch (e) {
  console.error('❌ Failed to load inkjs compiler:', e.message);
  console.error('   Make sure inkjs is installed: npm install inkjs');
  process.exit(1);
}

const INK_SOURCE = './content/ink/story.ink';
const JSON_OUTPUT = './public/content/ink/story.json';

async function compileInk() {
  console.log('🖋️  Ink Compiler for Kim Bar\n');

  // Check source exists
  if (!existsSync(INK_SOURCE)) {
    console.error(`❌ Source file not found: ${INK_SOURCE}`);
    process.exit(1);
  }

  console.log(`[INFO] Reading: ${INK_SOURCE}`);
  const inkSource = await readFile(INK_SOURCE, 'utf-8');

  console.log('[INFO] Compiling...');
  
  try {
    const compiler = new Compiler(inkSource);
    const story = compiler.Compile();
    
    // Check for errors
    if (compiler.errors && compiler.errors.length > 0) {
      console.error('❌ Compilation errors:');
      compiler.errors.forEach(err => console.error(`   ${err}`));
      process.exit(1);
    }
    
    // Check for warnings
    if (compiler.warnings && compiler.warnings.length > 0) {
      console.warn('⚠️  Compilation warnings:');
      compiler.warnings.forEach(warn => console.warn(`   ${warn}`));
    }

    // Export to JSON
    const jsonOutput = story.ToJson();
    
    // Ensure output directory exists
    await mkdir(dirname(JSON_OUTPUT), { recursive: true });
    
    // Write output
    await writeFile(JSON_OUTPUT, jsonOutput, 'utf-8');
    
    // Parse to get stats
    const parsed = JSON.parse(jsonOutput);
    const knotCount = Object.keys(parsed).filter(k => 
      !['inkVersion', 'root', 'listDefs'].includes(k)
    ).length;
    
    console.log(`[INFO] inkVersion: ${parsed.inkVersion}`);
    console.log(`[INFO] Knots: ${knotCount}`);
    console.log(`✅ Written: ${JSON_OUTPUT}`);
    
  } catch (e) {
    console.error('❌ Compilation failed:', e.message);
    if (e.stack) {
      console.error(e.stack);
    }
    process.exit(1);
  }
}

compileInk().catch(e => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
