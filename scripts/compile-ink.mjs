#!/usr/bin/env node
/**
 * compile-ink.mjs - Compile .ink files to JSON for inkjs runtime
 *
 * Usage:
 *   node scripts/compile-ink.mjs
 *   npm run compile:ink
 *
 * Compiles all .ink files in content/ink/ to generated/ink/*.json
 * These are then synced to public/generated/ink/ by sync:public
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';

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

const INK_SOURCE_DIR = './content/ink';
const JSON_OUTPUT_DIR = './generated/ink';

async function compileInkFile(sourceFile, outputFile) {
  console.log(`[INFO] Reading: ${sourceFile}`);
  const inkSource = await readFile(sourceFile, 'utf-8');

  console.log('[INFO] Compiling...');

  const compiler = new Compiler(inkSource);
  const story = compiler.Compile();

  // Check for errors
  if (compiler.errors && compiler.errors.length > 0) {
    console.error('❌ Compilation errors:');
    compiler.errors.forEach(err => console.error(`   ${err}`));
    return false;
  }

  // Check for warnings
  if (compiler.warnings && compiler.warnings.length > 0) {
    console.warn('⚠️  Compilation warnings:');
    compiler.warnings.forEach(warn => console.warn(`   ${warn}`));
  }

  // Export to JSON
  const jsonOutput = story.ToJson();

  // Write output
  await writeFile(outputFile, jsonOutput, 'utf-8');

  // Parse to get stats
  const parsed = JSON.parse(jsonOutput);
  const knotCount = Object.keys(parsed).filter(k =>
    !['inkVersion', 'root', 'listDefs'].includes(k)
  ).length;

  console.log(`[INFO] inkVersion: ${parsed.inkVersion}`);
  console.log(`[INFO] Knots: ${knotCount}`);
  console.log(`✅ Written: ${outputFile}`);

  return true;
}

async function compileAllInk() {
  console.log('🖋️  Ink Compiler for Kim Bar\n');

  // Check source directory exists
  if (!existsSync(INK_SOURCE_DIR)) {
    console.warn(`⚠️ No ink source directory found at ${INK_SOURCE_DIR}`);
    console.warn('   Skipping ink compilation');
    return;
  }

  // Ensure output directory exists
  await mkdir(JSON_OUTPUT_DIR, { recursive: true });

  // Find all .ink files
  const files = await readdir(INK_SOURCE_DIR);
  const inkFiles = files.filter(f => f.endsWith('.ink'));

  if (inkFiles.length === 0) {
    console.warn('⚠️ No .ink files found in content/ink/');
    return;
  }

  console.log(`Found ${inkFiles.length} ink file(s)\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of inkFiles) {
    const sourcePath = join(INK_SOURCE_DIR, file);
    const outputName = basename(file, '.ink') + '.json';
    const outputPath = join(JSON_OUTPUT_DIR, outputName);

    try {
      const success = await compileInkFile(sourcePath, outputPath);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (e) {
      console.error(`❌ Failed to compile ${file}:`, e.message);
      errorCount++;
    }

    console.log(''); // Blank line between files
  }

  console.log('='.repeat(50));
  console.log(`✨ Ink compilation complete: ${successCount} success, ${errorCount} errors`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

compileAllInk().catch(e => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
