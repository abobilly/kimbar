#!/usr/bin/env node
/**
 * Tiled Map Validation Script
 * 
 * Validates Tiled JSON maps in public/content/tiled/** against the room
 * template + schema in public/content/tiled/templates + schemas.
 * 
 * Usage: node scripts/validate-tiled-maps.mjs
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Ajv from 'ajv';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const TILESETS_DIR = path.join(process.cwd(), 'public', 'assets', 'tilesets');
const TEMPLATE_PATH = path.join(BASE_DIR, 'templates', 'room-template.json');
const MAP_SCHEMA_PATH = path.join(BASE_DIR, 'schemas', 'tiled_room.schema.json');

// Required layers in order
const REQUIRED_LAYERS = ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision', 'Entities'];
const MIN_DIMENSION = 5;
const MAX_DIMENSION = 100;

// Valid entity types and their required properties + types
const ENTITY_SCHEMA = {
  PlayerSpawn: {
    required: { spawnId: 'string' },
    optional: {}
  },
  Door: {
    required: { toMap: 'string', toSpawn: 'string' },
    optional: { facing: 'string' }
  },
  NPC: {
    required: { characterId: 'string' },
    optional: { storyKnot: 'string' }
  },
  EncounterTrigger: {
    required: { deckTag: 'string', count: 'int', once: 'bool' },
    optional: { rewardId: 'string' }
  }
};

let mapTemplate = null;
let validateMapSchema = null;

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

function getPropertyEntry(properties, name) {
  if (!Array.isArray(properties)) return undefined;
  return properties.find(p => p.name === name);
}

function validateFixedFields(map, template, mapErrors) {
  if (!template) return;
  const fixedKeys = ['compressionlevel', 'infinite', 'orientation', 'renderorder', 'tilewidth', 'tileheight', 'type'];
  for (const key of fixedKeys) {
    if (map[key] !== template[key]) {
      mapErrors.push(`Field "${key}" must match template value (${template[key]}), got ${map[key]}`);
    }
  }
}

function validateLayerData(layer, mapWidth, mapHeight, mapErrors) {
  if (layer.width !== mapWidth || layer.height !== mapHeight) {
    mapErrors.push(`Layer "${layer.name}" dimensions ${layer.width}x${layer.height} must match map ${mapWidth}x${mapHeight}`);
  }
  if (Array.isArray(layer.data) && layer.data.length !== mapWidth * mapHeight) {
    mapErrors.push(`Layer "${layer.name}" has ${layer.data.length} tiles, expected ${mapWidth * mapHeight}`);
  }
}

function validateTilesets(map, mapErrors) {
  if (!Array.isArray(map.tilesets) || map.tilesets.length === 0) {
    mapErrors.push('Map must declare at least one tileset');
    return;
  }

  for (const tileset of map.tilesets) {
    if (typeof tileset.source !== 'string') {
      mapErrors.push('Tileset source must be a string');
      continue;
    }
    if (!tileset.source.startsWith('../tilesets/') || !tileset.source.endsWith('.tsx')) {
      mapErrors.push(`Tileset source "${tileset.source}" must point to ../tilesets/*.tsx`);
    }
  }
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

  if (validateMapSchema) {
    const valid = validateMapSchema(map);
    if (!valid) {
      for (const err of validateMapSchema.errors || []) {
        mapErrors.push(`Schema ${err.instancePath || '(root)'}: ${err.message}`);
      }
    }
  }

  if (!Number.isInteger(map.width) || !Number.isInteger(map.height)) {
    mapErrors.push('Map width/height must be integers');
  } else {
    if (map.width < MIN_DIMENSION || map.height < MIN_DIMENSION) {
      mapErrors.push(`Map dimensions too small: ${map.width}x${map.height} (min ${MIN_DIMENSION}x${MIN_DIMENSION})`);
    }
    if (map.width > MAX_DIMENSION || map.height > MAX_DIMENSION) {
      mapErrors.push(`Map dimensions too large: ${map.width}x${map.height} (max ${MAX_DIMENSION}x${MAX_DIMENSION})`);
    }
  }

  validateFixedFields(map, mapTemplate, mapErrors);
  validateTilesets(map, mapErrors);

  // Check map type
  if (map.type !== 'map') {
    mapErrors.push(`Invalid type: "${map.type}" (must be "map")`);
  }

  // Check for required layers + order
  const layerNames = new Map();
  if (Array.isArray(map.layers)) {
    for (const layer of map.layers) {
      layerNames.set(layer.name, layer);
    }
  }

  const mapLayerNames = Array.isArray(map.layers) ? map.layers.map(layer => layer.name) : [];
  if (mapLayerNames.length !== REQUIRED_LAYERS.length) {
    mapErrors.push(`Layer count mismatch: expected ${REQUIRED_LAYERS.length}, got ${mapLayerNames.length}`);
  }

  for (let i = 0; i < REQUIRED_LAYERS.length; i++) {
    const expected = REQUIRED_LAYERS[i];
    const actual = mapLayerNames[i];
    if (!layerNames.has(expected)) {
      mapErrors.push(`Missing required layer "${expected}"`);
    } else if (actual !== expected) {
      mapErrors.push(`Layer order mismatch at index ${i}: expected "${expected}", got "${actual || 'undefined'}"`);
    }
  }

  // Check Entities layer is objectgroup
  const entitiesLayer = layerNames.get('Entities');
  if (entitiesLayer && entitiesLayer.type !== 'objectgroup') {
    mapErrors.push(`"Entities" layer must be type "objectgroup", got "${entitiesLayer.type}"`);
  }

  // Check tile layers are tilelayer + validate data size
  for (const name of ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision']) {
    const layer = layerNames.get(name);
    if (layer && layer.type !== 'tilelayer') {
      mapErrors.push(`"${name}" layer must be type "tilelayer", got "${layer.type}"`);
    }
    if (layer) {
      validateLayerData(layer, map.width, map.height, mapErrors);
    }
  }

  // Validate entities
  if (entitiesLayer && Array.isArray(entitiesLayer.objects)) {
    const tileWidth = Number.isInteger(map.tilewidth) ? map.tilewidth : 32;
    const tileHeight = Number.isInteger(map.tileheight) ? map.tileheight : 32;
    const maxX = map.width * tileWidth;
    const maxY = map.height * tileHeight;

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

      // Check required properties + types
      for (const [reqProp, reqType] of Object.entries(schema.required)) {
        const entry = getPropertyEntry(obj.properties, reqProp);
        const value = entry?.value;
        if (value === undefined || value === null || value === '') {
          mapErrors.push(`${obj.type} "${obj.name || obj.id}" missing required property "${reqProp}"`);
          continue;
        }
        if (entry?.type && entry.type !== reqType) {
          mapErrors.push(`${obj.type} "${obj.name || obj.id}" property "${reqProp}" must be type "${reqType}" (got "${entry.type}")`);
        }
      }

      for (const [optProp, optType] of Object.entries(schema.optional || {})) {
        const entry = getPropertyEntry(obj.properties, optProp);
        if (entry?.type && entry.type !== optType) {
          mapErrors.push(`${obj.type} "${obj.name || obj.id}" property "${optProp}" must be type "${optType}" (got "${entry.type}")`);
        }
      }

      if (typeof obj.x === 'number' && (obj.x < 0 || obj.x > maxX)) {
        mapErrors.push(`${obj.type} "${obj.name || obj.id}" x=${obj.x} out of bounds (0-${maxX})`);
      }
      if (typeof obj.y === 'number' && (obj.y < 0 || obj.y > maxY)) {
        mapErrors.push(`${obj.type} "${obj.name || obj.id}" y=${obj.y} out of bounds (0-${maxY})`);
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

  if (!existsSync(TEMPLATE_PATH)) {
    logFatal(`Missing Tiled room template at ${TEMPLATE_PATH}`);
  }

  if (!existsSync(MAP_SCHEMA_PATH)) {
    logFatal(`Missing Tiled room schema at ${MAP_SCHEMA_PATH}`);
  }

  try {
    mapTemplate = JSON.parse(await readFile(TEMPLATE_PATH, 'utf-8'));
    const schema = JSON.parse(await readFile(MAP_SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ allErrors: true });
    validateMapSchema = ajv.compile(schema);
  } catch (err) {
    logFatal(`Failed to load Tiled template/schema: ${err.message}`);
  }

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
