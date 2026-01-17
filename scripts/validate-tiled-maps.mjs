#!/usr/bin/env node
/**
 * Tiled Map Validation Script
 * 
 * Validates Tiled JSON maps in public/content/tiled/** against the contract
 * defined in docs/TILED_PIPELINE.md.
 * 
 * Usage: node scripts/validate-tiled-maps.mjs
 */

import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const TILESETS_DIR = path.join(process.cwd(), 'public', 'assets', 'tilesets');

// Required layers in order
const REQUIRED_LAYERS = ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision', 'Entities'];

// Valid entity types and their required properties
const ENTITY_SCHEMA = {
  PlayerSpawn: {
    required: ['spawnId'],
    optional: []
  },
  Door: {
    required: ['toMap', 'toSpawn'],
    optional: ['facing']
  },
  NPC: {
    required: ['characterId'],
    optional: ['storyKnot']
  },
  EncounterTrigger: {
    required: ['deckTag', 'count', 'once'],
    optional: ['rewardId']
  }
};

let passed = 0;
let failed = 0;
const errors = [];

function logOk(filePath) {
  console.log(`✓ ${filePath}`);
  passed++;
}

function logError(filePath, message) {
  console.log(`✗ ${filePath}`);
  console.log(`  ERROR: ${message}`);
  errors.push({ file: filePath, error: message });
  failed++;
}

function logFatal(message) {
  console.error(`\n🛑 FATAL: ${message}`);
  process.exit(1);
}

/**
 * Recursively scan for __MACOSX directories
 */
async function scanForMacOSX(dir) {
  const macosxPaths = [];
  
  async function scan(currentDir) {
    if (!existsSync(currentDir)) return;
    
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__MACOSX') {
          macosxPaths.push(fullPath);
        }
        await scan(fullPath);
      }
    }
  }
  
  await scan(dir);
  return macosxPaths;
}

/**
 * Recursively find all JSON map files (excluding templates)
 */
async function findMapFiles(dir, baseDir = dir, depth = 0) {
  const files = [];
  
  if (!existsSync(dir)) return files;
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      // Skip non-room-pack directories
      if (entry.name === 'templates' || entry.name === 'tilesets' ||
          entry.name === 'tiles' || entry.name === 'schemas' || entry.name === 'rooms') {
        continue;
      }
      const nested = await findMapFiles(fullPath, baseDir, depth + 1);
      files.push(...nested);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      // Only include JSON files that are in room pack subdirectories (depth > 0)
      // Skip root-level JSON files like scotus_tileset_contract.json
      if (depth > 0) {
        files.push({ path: fullPath, relativePath });
      }
    }
  }
  
  return files;
}

/**
 * Get property value from Tiled properties array
 */
function getProperty(properties, name) {
  if (!Array.isArray(properties)) return undefined;
  const prop = properties.find(p => p.name === name);
  return prop ? prop.value : undefined;
}

/**
 * Validate a single map file
 */
async function validateMap(filePath, relativePath) {
  let map;
  
  try {
    const content = await readFile(filePath, 'utf-8');
    map = JSON.parse(content);
  } catch (err) {
    logError(relativePath, `Failed to parse JSON: ${err.message}`);
    return false;
  }
  
  const mapErrors = [];
  
  // Check tile size (SACRED: 32x32)
  if (map.tilewidth !== 32 || map.tileheight !== 32) {
    mapErrors.push(`Invalid tile size: ${map.tilewidth}x${map.tileheight} (must be 32x32)`);
  }
  
  // Check map type
  if (map.type !== 'map') {
    mapErrors.push(`Invalid type: "${map.type}" (must be "map")`);
  }
  
  // Check for required layers
  const layerNames = new Map();
  if (Array.isArray(map.layers)) {
    for (const layer of map.layers) {
      layerNames.set(layer.name, layer);
    }
  }
  
  for (const requiredLayer of REQUIRED_LAYERS) {
    if (!layerNames.has(requiredLayer)) {
      mapErrors.push(`Missing required layer "${requiredLayer}"`);
    }
  }
  
  // Check Entities layer is objectgroup
  const entitiesLayer = layerNames.get('Entities');
  if (entitiesLayer && entitiesLayer.type !== 'objectgroup') {
    mapErrors.push(`"Entities" layer must be type "objectgroup", got "${entitiesLayer.type}"`);
  }
  
  // Check tile layers are tilelayer
  for (const name of ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision']) {
    const layer = layerNames.get(name);
    if (layer && layer.type !== 'tilelayer') {
      mapErrors.push(`"${name}" layer must be type "tilelayer", got "${layer.type}"`);
    }
  }
  
  // Validate entities
  if (entitiesLayer && Array.isArray(entitiesLayer.objects)) {
    for (const obj of entitiesLayer.objects) {
      if (!obj.type) {
        mapErrors.push(`Object "${obj.name || obj.id}" has no type property`);
        continue;
      }
      
      const schema = ENTITY_SCHEMA[obj.type];
      if (!schema) {
        mapErrors.push(`Object "${obj.name || obj.id}" has invalid type "${obj.type}" (valid: ${Object.keys(ENTITY_SCHEMA).join(', ')})`);
        continue;
      }
      
      // Check required properties
      for (const reqProp of schema.required) {
        const value = getProperty(obj.properties, reqProp);
        if (value === undefined || value === null || value === '') {
          mapErrors.push(`${obj.type} "${obj.name || obj.id}" missing required property "${reqProp}"`);
        }
      }
    }
  }
  
  if (mapErrors.length > 0) {
    console.log(`✗ ${relativePath}`);
    for (const err of mapErrors) {
      console.log(`  ERROR: ${err}`);
      errors.push({ file: relativePath, error: err });
    }
    failed++;
    return false;
  }
  
  logOk(relativePath);
  return true;
}

async function main() {
  console.log('🗺️  Tiled Map Validation');
  console.log('========================\n');
  
  // FATAL CHECK: Scan for __MACOSX directories
  console.log('Checking for __MACOSX directories...');
  
  const tiledMacOSX = await scanForMacOSX(BASE_DIR);
  const tilesetMacOSX = await scanForMacOSX(TILESETS_DIR);
  const allMacOSX = [...tiledMacOSX, ...tilesetMacOSX];
  
  if (allMacOSX.length > 0) {
    console.error('\n🛑 FATAL: __MACOSX directories found!\n');
    for (const macPath of allMacOSX) {
      console.error(`  ${macPath}`);
    }
    console.error('\nRemove these directories before proceeding:');
    console.error('  rm -rf public/content/tiled/**/__MACOSX');
    console.error('  rm -rf public/assets/tilesets/**/__MACOSX');
    process.exit(1);
  }
  console.log('✓ No __MACOSX directories found\n');
  
  // Find and validate map files
  console.log('Validating Tiled JSON maps...\n');
  
  if (!existsSync(BASE_DIR)) {
    console.error(`Base directory not found: ${BASE_DIR}`);
    process.exit(1);
  }
  
  const mapFiles = await findMapFiles(BASE_DIR, BASE_DIR);
  
  if (mapFiles.length === 0) {
    console.log('No JSON map files found to validate.');
    console.log('\nValidation: 0 maps found');
    process.exit(0);
  }
  
  // Sort files for deterministic output
  mapFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  
  for (const { path: filePath, relativePath } of mapFiles) {
    await validateMap(filePath, relativePath);
  }
  
  // Summary
  console.log(`\nValidation: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('\n✅ All Tiled maps valid');
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
