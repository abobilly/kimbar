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
// Use generated registry (single source of truth)
const REGISTRY_PATH = './generated/registry.json';
const PLACEMENT_DRAFT_PATH = './content/placement_drafts/prop_placements.json';

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

async function loadPlacementDrafts() {
  if (!existsSync(PLACEMENT_DRAFT_PATH)) {
    return null;
  }

  try {
    const content = await readFile(PLACEMENT_DRAFT_PATH, 'utf-8');
    const draft = JSON.parse(content);
    return draft.placements || null;
  } catch (e) {
    console.warn(`⚠️ Failed to load placement drafts: ${e.message}`);
    return null;
  }
}

function buildPlacementEntities(roomId, drafts) {
  if (!drafts || !drafts[roomId]) return [];
  const entries = drafts[roomId] || [];

  return entries.map((entry, idx) => {
    const zoneToken = (entry.zone || 'zone').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const baseId = (entry.id || 'prop').replace(/^prop\./, 'prop_');
    const uniqueId = `${baseId}__${zoneToken}__${idx + 1}`;
    const spriteKey = entry.properties?.sprite || entry.id;

    const properties = {};
    if (spriteKey) properties.sprite = spriteKey;
    if (typeof entry.properties?.collision === 'boolean') {
      properties.collision = entry.properties.collision;
    }
    if (entry.id) properties.propId = entry.id;

    return {
      type: entry.type || 'Prop',
      x: entry.x,
      y: entry.y,
      id: uniqueId,
      properties
    };
  });
}

function convertToLdtkLevel(spec, registry, placementDrafts) {
  const tileSize = registry.tileSize || 32;
  const pixelWidth = spec.width * tileSize;
  const pixelHeight = spec.height * tileSize;
  const placementEntities = buildPlacementEntities(spec.id, placementDrafts);
  const allEntities = (spec.entities || []).concat(placementEntities);
  
  // Convert entities to LDtk format
  const entityInstances = allEntities.map((entity, index) => ({
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
    fieldInstances: Object.entries(entity.properties || {}).map(([key, value]) => {
      let fieldType = 'String';
      if (typeof value === 'number') fieldType = 'Int';
      if (typeof value === 'boolean') fieldType = 'Bool';
      return {
        __identifier: key,
        __type: fieldType,
        __value: value,
        defUid: 0,
        realEditorValues: []
      };
    })
  }));

  const gridCount = spec.width * spec.height;
  const collisionsCsv = new Array(gridCount).fill(0);
  const floorCsv = new Array(gridCount).fill(1);

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
      },
      {
        __identifier: 'Collisions',
        __type: 'IntGrid',
        __cWid: spec.width,
        __cHei: spec.height,
        __gridSize: tileSize,
        intGridCsv: collisionsCsv,
        autoLayerTiles: [],
        gridTiles: [],
        entityInstances: []
      },
      {
        __identifier: 'Floor',
        __type: 'IntGrid',
        __cWid: spec.width,
        __cHei: spec.height,
        __gridSize: tileSize,
        intGridCsv: floorCsv,
        autoLayerTiles: [],
        gridTiles: [],
        entityInstances: []
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

async function buildLevel(file, spec, registry, placementDrafts) {
  console.log(`\n🏛️ Building level: ${spec.id} (${spec.name})`);
  
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // Convert to LDtk format
  const ldtkLevel = convertToLdtkLevel(spec, registry, placementDrafts);
  
  // Write output
  const outputPath = join(OUTPUT_DIR, `${spec.id}.json`);
  await writeFile(outputPath, JSON.stringify(ldtkLevel, null, 2));
  
  console.log(`  ✅ Generated: ${outputPath}`);
  console.log(`  📐 Size: ${spec.width}x${spec.height} tiles (${ldtkLevel.pxWid}x${ldtkLevel.pxHei}px)`);
  console.log(`  🎯 Entities: ${ldtkLevel.layerInstances?.[0]?.entityInstances?.length || 0}`);
  
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
  const placementDrafts = await loadPlacementDrafts();
  
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
      await buildLevel(file, spec, registry, placementDrafts);
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
