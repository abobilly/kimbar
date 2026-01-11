#!/usr/bin/env node
/**
 * Build Levels - Reads room specs and generates LDtk-compatible level JSON
 * 
 * Usage: node scripts/build-levels.js [--room=<id>]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = './content/rooms';
const OUTPUT_DIR = './public/content/ldtk';
const REGISTRY_PATH = './public/content/registry.json';

async function loadRegistry() {
  const content = await readFile(REGISTRY_PATH, 'utf-8');
  return JSON.parse(content);
}

async function loadRoomSpecs() {
  const specs = [];
  
  if (!existsSync(CONTENT_DIR)) {
    console.log(`📁 No room specs directory found at ${CONTENT_DIR}`);
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

function convertToLdtkLevel(spec, registry) {
  const tileSize = registry.tileSize || 32;
  const pixelWidth = spec.width * tileSize;
  const pixelHeight = spec.height * tileSize;
  
  // Convert entities to LDtk format
  const entityInstances = spec.entities.map((entity, index) => ({
    __identifier: entity.type,
    __grid: [entity.x, entity.y],
    __pivot: [0.5, 1],
    __tags: [],
    __tile: null,
    __worldX: entity.x * tileSize + tileSize / 2,
    __worldY: entity.y * tileSize + tileSize,
    defUid: index + 1,
    iid: entity.id || `${entity.type}_${index}`,
    width: tileSize,
    height: tileSize,
    px: [entity.x * tileSize, entity.y * tileSize],
    fieldInstances: Object.entries(entity.properties || {}).map(([key, value]) => ({
      __identifier: key,
      __type: typeof value === 'number' ? 'Int' : 'String',
      __value: value,
      defUid: 0,
      realEditorValues: []
    }))
  }));

  // Simplified LDtk level export format (Super Simple Export compatible)
  return {
    identifier: spec.id,
    iid: spec.id,
    uid: 0,
    worldX: 0,
    worldY: 0,
    worldDepth: 0,
    pxWid: pixelWidth,
    pxHei: pixelHeight,
    bgColor: spec.background || '#1a1a2e',
    layerInstances: [
      {
        __identifier: 'Entities',
        __type: 'Entities',
        __cWid: spec.width,
        __cHei: spec.height,
        __gridSize: tileSize,
        entityInstances: entityInstances
      }
    ],
    // Kim Bar specific metadata
    _kimbar: {
      name: spec.name,
      description: spec.description,
      tileset: spec.tileset,
      music: spec.music,
      connections: spec.connections || []
    }
  };
}

async function buildLevel(file, spec, registry) {
  console.log(`\n🏛️ Building level: ${spec.id} (${spec.name})`);
  
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // Convert to LDtk format
  const ldtkLevel = convertToLdtkLevel(spec, registry);
  
  // Write output
  const outputPath = join(OUTPUT_DIR, `${spec.id}.json`);
  await writeFile(outputPath, JSON.stringify(ldtkLevel, null, 2));
  
  console.log(`  ✅ Generated: ${outputPath}`);
  console.log(`  📐 Size: ${spec.width}x${spec.height} tiles (${ldtkLevel.pxWid}x${ldtkLevel.pxHei}px)`);
  console.log(`  🎯 Entities: ${spec.entities.length}`);
  
  return true;
}

async function main() {
  console.log('🏛️ Kim Bar Level Builder\n');
  console.log('=' .repeat(50));
  
  // Load registry
  let registry;
  try {
    registry = await loadRegistry();
  } catch (e) {
    console.error('❌ Failed to load registry:', e.message);
    process.exit(1);
  }
  
  // Parse command line args
  const args = process.argv.slice(2);
  const targetRoom = args.find(a => a.startsWith('--room='))?.split('=')[1];
  
  // Load specs
  const specs = await loadRoomSpecs();
  
  if (specs.length === 0) {
    console.log('\n📝 No room specs found.');
    console.log(`   Create JSON files in ${CONTENT_DIR}/`);
    console.log('   See schemas/RoomSpec.schema.json for format');
    return;
  }
  
  console.log(`\n📋 Found ${specs.length} room spec(s)`);
  
  // Filter if specific room requested
  const toBuild = targetRoom 
    ? specs.filter(s => s.spec.id === targetRoom)
    : specs;
  
  if (targetRoom && toBuild.length === 0) {
    console.error(`❌ Room '${targetRoom}' not found`);
    process.exit(1);
  }
  
  // Build each level
  let success = 0;
  let failed = 0;
  
  for (const { file, spec } of toBuild) {
    try {
      await buildLevel(file, spec, registry);
      success++;
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`✨ Done! ${success} built, ${failed} failed`);
}

main().catch(console.error);
