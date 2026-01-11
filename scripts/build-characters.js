#!/usr/bin/env node
/**
 * Build Characters - Compiles character specs and generates registry.json
 * 
 * This script:
 * - Reads character specs from content/characters/
 * - Copies compiled specs to generated/characters/
 * - Generates generated/registry.json with sprite/character entries
 * 
 * PNG generation is handled by gen:sprites (generate-sprites.mjs)
 * 
 * Usage: node scripts/build-characters.js [--character=<id>]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';

const CONTENT_DIR = './content/characters';
const GENERATED_DIR = './generated';
const CHARS_OUTPUT_DIR = './generated/characters';
const BASE_REGISTRY_PATH = './public/content/registry.json';

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

async function loadBaseRegistry() {
  try {
    const content = await readFile(BASE_REGISTRY_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`⚠️ Base registry not found at ${BASE_REGISTRY_PATH}, creating new`);
    return {
      tileSize: 32,
      scale: 2,
      entities: {},
      outfits: {},
      tags: { subjects: [], topicTags: [] },
      sprites: {},
      characters: []
    };
  }
}

async function compileCharacter(file, spec) {
  const charId = spec.id || basename(file, '.json');
  console.log(`  📋 Compiling: ${charId} (${spec.name || 'unnamed'})`);
  
  // Compiled spec includes original data plus derived fields
  const compiled = {
    ...spec,
    id: charId,
    compiledAt: new Date().toISOString()
  };
  
  // Write compiled spec
  const outputPath = join(CHARS_OUTPUT_DIR, `${charId}.json`);
  await writeFile(outputPath, JSON.stringify(compiled, null, 2));
  console.log(`    ✅ Wrote: ${outputPath}`);
  
  return {
    id: charId,
    spec: compiled
  };
}

function buildSpriteEntry(charId) {
  return {
    key: charId,
    atlas: charId,
    url: `/generated/sprites/${charId}.png`,
    portraitUrl: `/generated/portraits/${charId}.png`,
    frameWidth: 64,
    frameHeight: 64,
    kind: 'spritesheet'
  };
}

function buildCharacterEntry(charId) {
  return {
    id: charId,
    specUrl: `/generated/characters/${charId}.json`,
    spriteKey: charId
  };
}

async function main() {
  console.log('🎭 Kim Bar Character Compiler\n');
  console.log('='.repeat(50));
  
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
  const toCompile = targetChar 
    ? specs.filter(s => s.spec.id === targetChar || basename(s.file, '.json') === targetChar)
    : specs;
  
  if (targetChar && toCompile.length === 0) {
    console.error(`❌ Character '${targetChar}' not found`);
    process.exit(1);
  }
  
  // Ensure output directories exist
  await mkdir(GENERATED_DIR, { recursive: true });
  await mkdir(CHARS_OUTPUT_DIR, { recursive: true });
  
  // Compile each character
  console.log('\n📦 Compiling characters...');
  const compiled = [];
  for (const { file, spec } of toCompile) {
    try {
      const result = await compileCharacter(file, spec);
      compiled.push(result);
    } catch (e) {
      console.error(`  ❌ Failed to compile ${file}:`, e.message);
    }
  }
  
  // Build registry
  console.log('\n📝 Building registry...');
  const registry = await loadBaseRegistry();
  
  // Add/update sprite entries
  for (const { id } of compiled) {
    registry.sprites[id] = buildSpriteEntry(id);
  }
  
  // Build characters array
  registry.characters = compiled.map(({ id }) => buildCharacterEntry(id));
  
  // Write registry
  const registryPath = join(GENERATED_DIR, 'registry.json');
  await writeFile(registryPath, JSON.stringify(registry, null, 2));
  console.log(`  ✅ Wrote: ${registryPath}`);
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Done! ${compiled.length} character(s) compiled`);
}

main().catch(console.error);
