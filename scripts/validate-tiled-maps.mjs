#!/usr/bin/env node
/**
 * Tiled Map Validation Script
 * 
 * Validates Tiled maps in public/content/tiled/** against the room
 * template + schema in public/content/tiled/templates + schemas.
 * 
 * Supports both:
 * - TMX files (XML format) in public/content/tiled/rooms/*.tmx
 * - JSON maps in room pack subdirectories
 * 
 * Usage: node scripts/validate-tiled-maps.mjs
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { parseStringPromise } from 'xml2js';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const ROOMS_DIR = path.join(BASE_DIR, 'rooms');
const ZONE_DIR = path.join(ROOMS_DIR, 'scotus_zones');
const LEGACY_ROOMS_DIR = path.join(ROOMS_DIR, '_legacy');
const TILESETS_DIR = path.join(process.cwd(), 'public', 'assets', 'tilesets');
const TEMPLATE_PATH = path.join(BASE_DIR, 'templates', 'room-template.json');
const MAP_SCHEMA_PATH = path.join(BASE_DIR, 'schemas', 'tiled_room.schema.json');

// Authoritative SCOTUS zone IDs
const AUTHORITATIVE_ZONE_IDS = [
  'scotus_exterior',
  'scotus_0_basement',
  'scotus_1_lobby',
  'scotus_2_second',
  'scotus_3_third',
  'scotus_4_roof'
];

// Required layers in order
const REQUIRED_TILE_LAYERS = ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision'];
const REQUIRED_OBJECT_LAYERS = ['Entities', 'Portals', 'Spawns'];
const REQUIRED_LAYERS = [...REQUIRED_TILE_LAYERS, ...REQUIRED_OBJECT_LAYERS];

const MIN_DIMENSION = 5;
const MAX_DIMENSION = 320; // allow large zone maps (target 256x256)

// Bounds validation configuration
// Detects maps with excessive content extent (e.g., stray tiles/objects far from main content)
const BOUNDS_CONFIG = {
  maxWidthTiles: parseInt(process.env.MAX_MAP_WIDTH) || 320,
  maxHeightTiles: parseInt(process.env.MAX_MAP_HEIGHT) || 320,
  allowLargeMapProperty: 'allowLargeMap',
  // Known large maps that are allowed (e.g., exteriors)
  allowlist: ['courthouse_exterior', 'scotus_exterior', ...AUTHORITATIVE_ZONE_IDS]
};

// CLI flags
const INCLUDE_LEGACY = process.argv.includes('--include-legacy');

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
  },
  // Props are decorative objects with no required properties
  Prop: {
    required: {},
    optional: { sprite: 'string', layer: 'string' }
  },
  // OutfitChest is an interactive object for outfit rewards
  OutfitChest: {
    required: { outfitId: 'string' },
    optional: { once: 'bool' }
  }
};

/**
 * Compute actual content bounds by scanning tile layers and object layers
 * Returns { minX, minY, maxX, maxY } in tile coordinates
 */
function computeContentBoundsJSON(map) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasContent = false;

  const mapWidth = map.width || 0;
  const mapHeight = map.height || 0;
  const tileWidth = map.tilewidth || 32;
  const tileHeight = map.tileheight || 32;

  // Scan tile layers for non-empty tiles
  if (Array.isArray(map.layers)) {
    for (const layer of map.layers) {
      if (layer.type === 'tilelayer' && Array.isArray(layer.data)) {
        const layerWidth = layer.width || mapWidth;
        for (let i = 0; i < layer.data.length; i++) {
          if (layer.data[i] !== 0) {
            const tileX = i % layerWidth;
            const tileY = Math.floor(i / layerWidth);
            minX = Math.min(minX, tileX);
            minY = Math.min(minY, tileY);
            maxX = Math.max(maxX, tileX);
            maxY = Math.max(maxY, tileY);
            hasContent = true;
          }
        }
      } else if (layer.type === 'objectgroup' && Array.isArray(layer.objects)) {
        // Scan objects for their positions
        for (const obj of layer.objects) {
          if (typeof obj.x === 'number' && typeof obj.y === 'number') {
            const tileX = Math.floor(obj.x / tileWidth);
            const tileY = Math.floor(obj.y / tileHeight);
            const objWidthTiles = Math.ceil((obj.width || tileWidth) / tileWidth);
            const objHeightTiles = Math.ceil((obj.height || tileHeight) / tileHeight);
            minX = Math.min(minX, tileX);
            minY = Math.min(minY, tileY);
            maxX = Math.max(maxX, tileX + objWidthTiles - 1);
            maxY = Math.max(maxY, tileY + objHeightTiles - 1);
            hasContent = true;
          }
        }
      }
    }
  }

  if (!hasContent) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Check if a map has the allowLargeMap custom property set to true
 */
function hasAllowLargeMapProperty(properties) {
  if (!Array.isArray(properties)) return false;
  const prop = properties.find(p => p.name === BOUNDS_CONFIG.allowLargeMapProperty);
  return prop && prop.value === true;
}

/**
 * Check if a map filename is in the allowlist
 */
function isInAllowlist(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  return BOUNDS_CONFIG.allowlist.some(allowed =>
    baseName === allowed || baseName.startsWith(allowed + '_')
  );
}

/**
 * Validate content bounds for JSON maps
 */
function validateContentBoundsJSON(map, relativePath, mapErrors) {
  // Check if this map is allowed to be large
  if (hasAllowLargeMapProperty(map.properties)) {
    return;
  }
  if (isInAllowlist(relativePath)) {
    return;
  }

  const bounds = computeContentBoundsJSON(map);

  if (bounds.width > BOUNDS_CONFIG.maxWidthTiles || bounds.height > BOUNDS_CONFIG.maxHeightTiles) {
    mapErrors.push(
      `Map content bounds exceed maximum\n` +
      `    Computed bounds: ${bounds.width}x${bounds.height} tiles (content extent from tile ${bounds.minX},${bounds.minY} to ${bounds.maxX},${bounds.maxY})\n` +
      `    Maximum allowed: ${BOUNDS_CONFIG.maxWidthTiles}x${BOUNDS_CONFIG.maxHeightTiles} tiles\n` +
      `    Hint: Check for stray tiles/objects far from main content\n` +
      `    To allow large maps, add custom property: ${BOUNDS_CONFIG.allowLargeMapProperty}=true`
    );
  }
}

/**
 * Compute actual content bounds for TMX maps by scanning tile layers and object layers
 * Returns { minX, minY, maxX, maxY, width, height } in tile coordinates
 */
function computeContentBoundsTMX(map, layers, objectgroups) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasContent = false;

  const mapWidth = parseInt(map.$.width, 10) || 0;
  const tileWidth = parseInt(map.$.tilewidth, 10) || 32;
  const tileHeight = parseInt(map.$.tileheight, 10) || 32;

  // Scan tile layers for non-empty tiles
  for (const layer of layers) {
    const layerWidth = parseInt(layer.$.width, 10) || mapWidth;

    // Handle CSV-encoded data
    if (layer.data && layer.data._) {
      const csvData = layer.data._.trim();
      const tiles = csvData.split(',').map(t => parseInt(t.trim(), 10));
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i] !== 0 && !isNaN(tiles[i])) {
          const tileX = i % layerWidth;
          const tileY = Math.floor(i / layerWidth);
          minX = Math.min(minX, tileX);
          minY = Math.min(minY, tileY);
          maxX = Math.max(maxX, tileX);
          maxY = Math.max(maxY, tileY);
          hasContent = true;
        }
      }
    } else if (typeof layer.data === 'string') {
      // Handle inline CSV data
      const csvData = layer.data.trim();
      const tiles = csvData.split(',').map(t => parseInt(t.trim(), 10));
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i] !== 0 && !isNaN(tiles[i])) {
          const tileX = i % layerWidth;
          const tileY = Math.floor(i / layerWidth);
          minX = Math.min(minX, tileX);
          minY = Math.min(minY, tileY);
          maxX = Math.max(maxX, tileX);
          maxY = Math.max(maxY, tileY);
          hasContent = true;
        }
      }
    }
  }

  // Scan object groups for object positions
  for (const objectgroup of objectgroups) {
    const objects = Array.isArray(objectgroup.object) ? objectgroup.object : (objectgroup.object ? [objectgroup.object] : []);
    for (const obj of objects) {
      const objX = parseFloat(obj.$.x);
      const objY = parseFloat(obj.$.y);
      const objWidth = parseFloat(obj.$.width) || tileWidth;
      const objHeight = parseFloat(obj.$.height) || tileHeight;

      if (!isNaN(objX) && !isNaN(objY)) {
        const tileX = Math.floor(objX / tileWidth);
        const tileY = Math.floor(objY / tileHeight);
        const objWidthTiles = Math.ceil(objWidth / tileWidth);
        const objHeightTiles = Math.ceil(objHeight / tileHeight);

        minX = Math.min(minX, tileX);
        minY = Math.min(minY, tileY);
        maxX = Math.max(maxX, tileX + objWidthTiles - 1);
        maxY = Math.max(maxY, tileY + objHeightTiles - 1);
        hasContent = true;
      }
    }
  }

  if (!hasContent) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Check if a TMX map has the allowLargeMap custom property set to true
 */
function hasAllowLargeMapPropertyTMX(map) {
  if (!map.properties || !map.properties.property) return false;
  const props = Array.isArray(map.properties.property) ? map.properties.property : [map.properties.property];
  const prop = props.find(p => p.$.name === BOUNDS_CONFIG.allowLargeMapProperty);
  return prop && (prop.$.value === 'true' || prop.$.value === true);
}

/**
 * Validate content bounds for TMX maps
 */
function validateContentBoundsTMX(map, layers, objectgroups, relativePath, mapErrors) {
  // Check if this map is allowed to be large
  if (hasAllowLargeMapPropertyTMX(map)) {
    return;
  }
  if (isInAllowlist(relativePath)) {
    return;
  }

  const bounds = computeContentBoundsTMX(map, layers, objectgroups);

  if (bounds.width > BOUNDS_CONFIG.maxWidthTiles || bounds.height > BOUNDS_CONFIG.maxHeightTiles) {
    mapErrors.push(
      `Map content bounds exceed maximum\n` +
      `    Computed bounds: ${bounds.width}x${bounds.height} tiles (content extent from tile ${bounds.minX},${bounds.minY} to ${bounds.maxX},${bounds.maxY})\n` +
      `    Maximum allowed: ${BOUNDS_CONFIG.maxWidthTiles}x${BOUNDS_CONFIG.maxHeightTiles} tiles\n` +
      `    Hint: Check for stray tiles/objects far from main content\n` +
      `    To allow large maps, add custom property: ${BOUNDS_CONFIG.allowLargeMapProperty}=true`
    );
  }
}

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

function collectSpawnsFromMap(map) {
  const objectgroups = Array.isArray(map.objectgroup) ? map.objectgroup : (map.objectgroup ? [map.objectgroup] : []);
  const spawnsLayer = objectgroups.find(l => l.$.name === 'Spawns');
  const spawns = new Set();

  if (!spawnsLayer) return spawns;

  const objects = Array.isArray(spawnsLayer.object) ? spawnsLayer.object : (spawnsLayer.object ? [spawnsLayer.object] : []);
  for (const obj of objects) {
    const props = Array.isArray(obj.properties?.property) ? obj.properties.property : (obj.properties?.property ? [obj.properties.property] : []);
    const spawnIdProp = props.find(p => p.$.name === 'spawnId');
    if (spawnIdProp && spawnIdProp.$?.value) {
      spawns.add(spawnIdProp.$.value);
    }
  }

  return spawns;
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
    const tilesetSource = tileset.source;
    const tilesetPattern = /^(\.\.\/)+tilesets\/.*\.tsx$/;
    if (!tilesetPattern.test(tilesetSource)) {
      mapErrors.push(`Tileset source "${tilesetSource}" must point to ../tilesets/*.tsx (allowing nested room folders)`);
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

  // Validate content bounds (detect stray tiles/objects)
  validateContentBoundsJSON(map, relativePath, mapErrors);

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

/**
 * Find all TMX files in the rooms directory
 */
async function findTmxFiles(dir, { includeLegacy = false } = {}) {
  const files = [];

  async function scan(currentDir) {
    if (!existsSync(currentDir)) return;

    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip legacy unless explicitly included
        if (!includeLegacy && entry.name === '_legacy') continue;
        // Skip templates/tilesets/tiles/schemas/worlds
        if (['templates', 'tilesets', 'tiles', 'schemas', 'worlds'].includes(entry.name)) continue;
        await scan(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.tmx') && !entry.name.startsWith('_')) {
        const relativePath = path.relative(BASE_DIR, fullPath);
        files.push({ path: fullPath, relativePath });
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Validate a TMX (XML) map file
 */
function validateTmxMap(map, relativePath, spawnIndex) {
  const mapErrors = [];

  const width = parseInt(map.$.width, 10);
  const height = parseInt(map.$.height, 10);
  const tilewidth = parseInt(map.$.tilewidth, 10);
  const tileheight = parseInt(map.$.tileheight, 10);

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    mapErrors.push('Map width/height must be integers');
  } else {
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      mapErrors.push(`Map dimensions too small: ${width}x${height} (min ${MIN_DIMENSION}x${MIN_DIMENSION})`);
    }
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      mapErrors.push(`Map dimensions too large: ${width}x${height} (max ${MAX_DIMENSION}x${MAX_DIMENSION})`);
    }
  }

  if (map.$.orientation !== 'orthogonal') {
    mapErrors.push(`Invalid orientation: "${map.$.orientation}" (must be "orthogonal")`);
  }
  if (map.$.renderorder !== 'right-down') {
    mapErrors.push(`Invalid renderorder: "${map.$.renderorder}" (must be "right-down")`);
  }

  // Tileset checks
  const tilesets = Array.isArray(map.tileset) ? map.tileset : (map.tileset ? [map.tileset] : []);
  if (tilesets.length === 0) {
    mapErrors.push('Map must declare at least one tileset');
  }

  for (const tileset of tilesets) {
    const source = tileset.$.source;
    if (typeof source !== 'string') {
      mapErrors.push('Tileset source must be a string');
      continue;
    }
    const tilesetPattern = /^(\.\.\/)+tilesets\/.*\.tsx$/;
    if (!tilesetPattern.test(source)) {
      mapErrors.push(`Tileset source "${source}" must point to ../tilesets/*.tsx (allowing nested room folders)`);
    }
  }

  const layers = Array.isArray(map.layer) ? map.layer : (map.layer ? [map.layer] : []);
  const objectgroups = Array.isArray(map.objectgroup) ? map.objectgroup : (map.objectgroup ? [map.objectgroup] : []);
  const allLayers = [...layers, ...objectgroups];
  const layerNames = allLayers.map(l => l.$.name);

  // Required layers
  for (const required of REQUIRED_LAYERS) {
    if (!layerNames.includes(required)) {
      mapErrors.push(`Missing required layer "${required}"`);
    }
  }

  const expectedOrder = REQUIRED_LAYERS.filter(name => layerNames.includes(name));
  const actualOrder = layerNames.filter(name => REQUIRED_LAYERS.includes(name));
  for (let i = 0; i < expectedOrder.length; i++) {
    if (actualOrder[i] !== expectedOrder[i]) {
      mapErrors.push(`Layer order mismatch: expected "${expectedOrder[i]}" at position ${i}, got "${actualOrder[i] || 'undefined'}"`);
      break;
    }
  }

  // Layer type checks
  for (const name of REQUIRED_TILE_LAYERS) {
    const tileLayer = layers.find(l => l.$.name === name);
    if (layerNames.includes(name) && !tileLayer) {
      mapErrors.push(`"${name}" layer must be a tile layer, not an objectgroup`);
    }
  }

  for (const name of REQUIRED_OBJECT_LAYERS) {
    const objLayer = objectgroups.find(l => l.$.name === name);
    if (layerNames.includes(name) && !objLayer) {
      mapErrors.push(`"${name}" layer must be an objectgroup, not a tile layer`);
    }
  }

  const entitiesLayer = objectgroups.find(l => l.$.name === 'Entities');
  const portalsLayer = objectgroups.find(l => l.$.name === 'Portals');
  const spawnsLayer = objectgroups.find(l => l.$.name === 'Spawns');

  const maxX = width * tilewidth;
  const maxY = height * tileheight;

  // Collision layer must be marked as collision
  const collisionLayer = layers.find(l => l.$.name === 'Collision');
  if (collisionLayer) {
    const props = Array.isArray(collisionLayer.properties?.property)
      ? collisionLayer.properties.property
      : (collisionLayer.properties?.property ? [collisionLayer.properties.property] : []);
    const collidesProp = props.find(p => p.$.name === 'isCollision');
    if (!collidesProp || !(collidesProp.$?.value === 'true' || collidesProp.$?.value === true)) {
      mapErrors.push('"Collision" layer must have property isCollision=true');
    }
  }

  // Validate entities
  if (entitiesLayer) {
    const objects = Array.isArray(entitiesLayer.object) ? entitiesLayer.object : (entitiesLayer.object ? [entitiesLayer.object] : []);

    for (const obj of objects) {
      const objType = obj.$.type || obj.$.class;
      const objName = obj.$.name || obj.$.id;

      if (!objType) {
        mapErrors.push(`Object "${objName}" has no type property`);
        continue;
      }

      const schema = ENTITY_SCHEMA[objType];
      if (!schema) {
        mapErrors.push(`Object "${objName}" has invalid type "${objType}" (valid: ${Object.keys(ENTITY_SCHEMA).join(', ')})`);
        continue;
      }

      const properties = {};
      if (obj.properties && obj.properties.property) {
        const props = Array.isArray(obj.properties.property) ? obj.properties.property : [obj.properties.property];
        for (const prop of props) {
          properties[prop.$.name] = { value: prop.$.value, type: prop.$.type };
        }
      }

      for (const [reqProp] of Object.entries(schema.required)) {
        const prop = properties[reqProp];
        if (!prop || prop.value === undefined || prop.value === null || prop.value === '') {
          mapErrors.push(`${objType} "${objName}" missing required property "${reqProp}"`);
        }
      }

      const objX = parseFloat(obj.$.x);
      const objY = parseFloat(obj.$.y);
      if (!isNaN(objX) && (objX < 0 || objX > maxX)) {
        mapErrors.push(`${objType} "${objName}" x=${objX} out of bounds (0-${maxX})`);
      }
      if (!isNaN(objY) && (objY < 0 || objY > maxY)) {
        mapErrors.push(`${objType} "${objName}" y=${objY} out of bounds (0-${maxY})`);
      }
    }
  }

  // Validate spawns
  const spawnSet = new Set();
  if (spawnsLayer) {
    const objects = Array.isArray(spawnsLayer.object) ? spawnsLayer.object : (spawnsLayer.object ? [spawnsLayer.object] : []);
    for (const obj of objects) {
      const props = Array.isArray(obj.properties?.property) ? obj.properties.property : (obj.properties?.property ? [obj.properties.property] : []);
      const spawnIdProp = props.find(p => p.$.name === 'spawnId');
      if (!spawnIdProp || !spawnIdProp.$.value) {
        mapErrors.push(`Spawn "${obj.$.name || obj.$.id}" missing required property "spawnId"`);
      } else {
        const sid = spawnIdProp.$.value;
        if (spawnSet.has(sid)) {
          mapErrors.push(`Duplicate spawnId "${sid}" in map`);
        }
        spawnSet.add(sid);
      }
      const objX = parseFloat(obj.$.x);
      const objY = parseFloat(obj.$.y);
      if (!isNaN(objX) && (objX < 0 || objX > maxX)) {
        mapErrors.push(`Spawn "${obj.$.name || obj.$.id}" x=${objX} out of bounds (0-${maxX})`);
      }
      if (!isNaN(objY) && (objY < 0 || objY > maxY)) {
        mapErrors.push(`Spawn "${obj.$.name || obj.$.id}" y=${objY} out of bounds (0-${maxY})`);
      }
    }
  }

  // Validate portals
  if (portalsLayer) {
    const objects = Array.isArray(portalsLayer.object) ? portalsLayer.object : (portalsLayer.object ? [portalsLayer.object] : []);
    for (const obj of objects) {
      const props = Array.isArray(obj.properties?.property) ? obj.properties.property : (obj.properties?.property ? [obj.properties.property] : []);
      const targetMap = (props.find(p => p.$.name === 'targetMap')?.$.value || '').trim();
      const targetSpawnId = (props.find(p => p.$.name === 'targetSpawnId')?.$.value || '').trim();
      const transition = props.find(p => p.$.name === 'transition')?.$.value;
      const lockedProp = props.find(p => p.$.name === 'locked');
      const locked = lockedProp ? (lockedProp.$.value === 'true' || lockedProp.$.value === true) : false;

      if (!targetMap) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" missing required property "targetMap"`);
      } else if (!AUTHORITATIVE_ZONE_IDS.includes(targetMap) && !INCLUDE_LEGACY) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" targetMap "${targetMap}" is not an allowed zone`);
      }

      if (!targetSpawnId) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" missing required property "targetSpawnId"`);
      } else if (targetMap) {
        const spawns = spawnIndex.get(targetMap);
        if (!spawns || !spawns.has(targetSpawnId)) {
          mapErrors.push(`Portal "${obj.$.name || obj.$.id}" targetSpawnId "${targetSpawnId}" not found in ${targetMap}`);
        }
      }

      if (transition && !['fade', 'stairs', 'door'].includes(transition)) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" transition "${transition}" must be one of fade|stairs|door`);
      }

      const objX = parseFloat(obj.$.x);
      const objY = parseFloat(obj.$.y);
      const objWidth = parseFloat(obj.$.width) || tilewidth;
      const objHeight = parseFloat(obj.$.height) || tileheight;
      if (!isNaN(objX) && (objX < 0 || objX > maxX)) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" x=${objX} out of bounds (0-${maxX})`);
      }
      if (!isNaN(objY) && (objY < 0 || objY > maxY)) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" y=${objY} out of bounds (0-${maxY})`);
      }
      if (objWidth <= 0 || objHeight <= 0) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" must have positive width/height`);
      }
      if (locked && !props.find(p => p.$.name === 'lockKeyId')) {
        mapErrors.push(`Portal "${obj.$.name || obj.$.id}" is locked but missing lockKeyId`);
      }
    }
  }

  validateContentBoundsTMX(map, layers, objectgroups, relativePath, mapErrors);

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
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
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

  // Find and validate TMX files (zones by default)
  const scanRoot = INCLUDE_LEGACY ? ROOMS_DIR : ZONE_DIR;
  console.log(`Validating TMX maps in ${path.relative(process.cwd(), scanRoot)}${INCLUDE_LEGACY ? ' (legacy included)' : ''}\n`);

  const tmxFiles = await findTmxFiles(scanRoot, { includeLegacy: INCLUDE_LEGACY });
  if (tmxFiles.length === 0) {
    console.log('No TMX files found');
    console.log(`\nValidation: ${passed} passed, ${failed} failed (0 total maps)`);
    process.exit(0);
  }

  // Sort for deterministic processing
  tmxFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const spawnIndex = new Map();
  const parsedMaps = [];

  for (const { path: filePath, relativePath } of tmxFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = await parseStringPromise(content, { explicitArray: false });
      const map = parsed.map;
      const mapId = path.basename(filePath, '.tmx');
      spawnIndex.set(mapId, collectSpawnsFromMap(map));
      parsedMaps.push({ relativePath, map });
    } catch (err) {
      logError(relativePath, `Failed to parse TMX: ${err.message}`);
    }
  }

  for (const { relativePath, map } of parsedMaps) {
    validateTmxMap(map, relativePath, spawnIndex);
  }

  // Summary
  const totalMaps = parsedMaps.length;
  console.log(`\nValidation: ${passed} passed, ${failed} failed (${totalMaps} total maps)`);

  if (failed > 0) {
    process.exit(1);
  }

  if (totalMaps === 0) {
    console.log('\n⚠️ No maps found to validate');
    process.exit(0);
  }

  console.log('\n✅ All Tiled maps valid');
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
