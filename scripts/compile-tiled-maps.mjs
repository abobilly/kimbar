#!/usr/bin/env node
/**
 * Tiled Map Compilation Script
 * 
 * Compiles validated Tiled maps to LevelData JSON format:
 * - TMX files (XML format) from public/content/tiled/rooms/*.tmx
 * - JSON maps from room pack subdirectories (e.g., supreme-court/)
 * 
 * Output: public/generated/levels/tiled/**
 * 
 * Usage: node scripts/compile-tiled-maps.mjs
 * 
 * See docs/TILED_PIPELINE.md for LevelData schema specification.
 */

import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const ROOMS_DIR = path.join(BASE_DIR, 'rooms');
const ZONE_DIR = path.join(ROOMS_DIR, 'scotus_zones');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated', 'levels', 'tiled');

const INCLUDE_LEGACY = process.argv.includes('--include-legacy');

/**
 * Recursively find all JSON map files (excluding templates, tilesets, etc.)
 * Only includes files in room pack subdirectories (depth > 0)
 */
async function findJsonMapFiles(dir, baseDir = dir, depth = 0) {
  const files = [];

  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Skip non-map directories (including rooms - handled separately for TMX)
      if (entry.name === 'templates' || entry.name === 'tilesets' ||
        entry.name === 'tiles' || entry.name === 'schemas' || entry.name === 'rooms' ||
        entry.name === 'worlds') {
        continue;
      }
      const nested = await findJsonMapFiles(fullPath, baseDir, depth + 1);
      files.push(...nested);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      // Only include JSON files in room pack subdirectories (depth > 0)
      if (depth > 0) {
        files.push({ path: fullPath, relativePath, format: 'json' });
      }
    }
  }

  return files;
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
        if (!includeLegacy && entry.name === '_legacy') continue;
        if (['templates', 'tiles', 'tilesets', 'schemas', 'worlds', 'automap'].includes(entry.name)) continue;
        await scan(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.tmx') && !entry.name.startsWith('_')) {
        const relativePath = path.relative(BASE_DIR, fullPath);
        files.push({ path: fullPath, relativePath, format: 'tmx' });
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Remove previously compiled JSON outputs so deleted/moved TMX files don't linger.
 */
async function cleanOutputDir(dirPath) {
  if (!existsSync(dirPath)) return;

  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await rm(fullPath, { recursive: true, force: true });
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      await rm(fullPath, { force: true });
    }
  }
}

/**
 * Get property value from Tiled properties array (JSON format)
 */
function getProperty(properties, name) {
  if (!Array.isArray(properties)) return undefined;
  const prop = properties.find(p => p.name === name);
  return prop ? prop.value : undefined;
}

/**
 * Extract properties object from Tiled properties array (JSON format)
 */
function extractProperties(properties) {
  if (!Array.isArray(properties)) return {};
  const result = {};
  for (const prop of properties) {
    result[prop.name] = prop.value;
  }
  return result;
}

/**
 * Extract properties from TMX XML property elements
 */
function extractTmxProperties(propertiesElement) {
  if (!propertiesElement) return {};

  const result = {};
  const props = Array.isArray(propertiesElement.property)
    ? propertiesElement.property
    : (propertiesElement.property ? [propertiesElement.property] : []);

  for (const prop of props) {
    const name = prop.$.name;
    const type = prop.$.type || 'string';
    let value = prop.$.value;

    // Convert value based on type
    if (type === 'int') {
      value = parseInt(value, 10);
    } else if (type === 'float') {
      value = parseFloat(value);
    } else if (type === 'bool') {
      value = value === 'true';
    }

    result[name] = value;
  }

  return result;
}

/**
 * Compute level ID from relative file path
 * e.g., "supreme-court/lobby.json" -> "supreme-court/lobby"
 * e.g., "rooms/scotus_lobby.tmx" -> "scotus_lobby"
 */
function computeLevelId(relativePath, format) {
  if (format === 'tmx') {
    // For TMX files in rooms/, just use the filename without extension
    return path.basename(relativePath, '.tmx');
  }
  return relativePath.replace(/\.json$/, '').replace(/\\/g, '/');
}

/**
 * Derive tileset key from source path
 * e.g., "../tilesets/scotus_floors.tsx" -> "scotus_floors"
 */
function deriveTilesetKey(source) {
  const basename = path.basename(source, '.tsx');
  return basename;
}

/**
 * Extract tile layer data (JSON format)
 */
function extractTileLayer(layer) {
  return {
    data: layer.data || [],
    width: layer.width,
    height: layer.height
  };
}

/**
 * Extract tile layer data from TMX layer element
 */
function extractTmxTileLayer(layer, mapWidth, mapHeight) {
  if (!layer) {
    return { data: [], width: mapWidth, height: mapHeight };
  }

  const width = parseInt(layer.$.width, 10) || mapWidth;
  const height = parseInt(layer.$.height, 10) || mapHeight;

  // Parse tile data from CSV format
  let data = [];
  if (layer.data) {
    const dataElement = layer.data;
    const encoding = dataElement.$ ? dataElement.$.encoding : undefined;

    if (encoding === 'csv' || !encoding) {
      // CSV encoded or plain text
      const csvText = typeof dataElement === 'string' ? dataElement : dataElement._;
      if (csvText) {
        data = csvText.trim().split(',').map(s => parseInt(s.trim(), 10) || 0);
      }
    }
  }

  return { data, width, height };
}

/**
 * Extract and normalize entities from object layer (JSON format)
 * Sorts by type, then x, then y for deterministic output
 */
function extractEntities(layer) {
  if (!layer || !Array.isArray(layer.objects)) return [];

  const entities = layer.objects.map(obj => ({
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    properties: extractProperties(obj.properties)
  }));

  // Deterministic sort: by type, then x, then y
  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return entities;
}

/**
 * Extract entities from TMX objectgroup
 */
function extractTmxEntities(objectgroup) {
  if (!objectgroup) return [];

  const objects = Array.isArray(objectgroup.object)
    ? objectgroup.object
    : (objectgroup.object ? [objectgroup.object] : []);

  const entities = objects.map(obj => ({
    type: obj.$.type || '',
    x: parseFloat(obj.$.x) || 0,
    y: parseFloat(obj.$.y) || 0,
    width: parseFloat(obj.$.width) || 0,
    height: parseFloat(obj.$.height) || 0,
    properties: extractTmxProperties(obj.properties)
  }));

  // Deterministic sort: by type, then x, then y
  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return entities;
}

function extractTmxSpawns(objectgroup) {
  if (!objectgroup) return [];

  const objects = Array.isArray(objectgroup.object)
    ? objectgroup.object
    : (objectgroup.object ? [objectgroup.object] : []);

  const entities = objects.map(obj => {
    const props = extractTmxProperties(obj.properties);
    return {
      type: 'PlayerSpawn',
      x: parseFloat(obj.$.x) || 0,
      y: parseFloat(obj.$.y) || 0,
      width: parseFloat(obj.$.width) || 0,
      height: parseFloat(obj.$.height) || 0,
      properties: {
        spawnId: props.spawnId || 'default',
        facing: props.facing || 'down'
      }
    };
  });

  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return entities;
}

function extractTmxPortals(objectgroup) {
  if (!objectgroup) return [];

  const objects = Array.isArray(objectgroup.object)
    ? objectgroup.object
    : (objectgroup.object ? [objectgroup.object] : []);

  const entities = objects.map(obj => {
    const props = extractTmxProperties(obj.properties);
    const targetMap = props.targetMap || props.toMap || '';
    const targetSpawnId = props.targetSpawnId || props.toSpawn || '';
    return {
      type: 'Door',
      x: parseFloat(obj.$.x) || 0,
      y: parseFloat(obj.$.y) || 0,
      width: parseFloat(obj.$.width) || 0,
      height: parseFloat(obj.$.height) || 0,
      properties: {
        toMap: targetMap,
        toSpawn: targetSpawnId,
        transition: props.transition,
        locked: props.locked === true,
        lockKeyId: props.lockKeyId
      }
    };
  });

  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  return entities;
}

/**
 * Extract tileset references (JSON format)
 * Sorts by firstGid for deterministic output
 */
function extractTilesets(tilesets) {
  if (!Array.isArray(tilesets)) return [];

  const refs = tilesets.map(ts => ({
    key: deriveTilesetKey(ts.source),
    firstGid: ts.firstgid,
    source: ts.source
  }));

  // Sort by firstGid for stability
  refs.sort((a, b) => a.firstGid - b.firstGid);

  return refs;
}

/**
 * Extract tileset references from TMX
 */
function extractTmxTilesets(tilesets) {
  if (!tilesets) return [];

  const tilesetArray = Array.isArray(tilesets) ? tilesets : [tilesets];

  const refs = tilesetArray.map(ts => ({
    key: deriveTilesetKey(ts.$.source),
    firstGid: parseInt(ts.$.firstgid, 10),
    source: ts.$.source
  }));

  // Sort by firstGid for stability
  refs.sort((a, b) => a.firstGid - b.firstGid);

  return refs;
}

/**
 * Compile a JSON Tiled map to LevelData format
 */
function compileJsonMap(tiledMap, levelId) {
  // Build layer lookup
  const layersByName = new Map();
  for (const layer of tiledMap.layers || []) {
    layersByName.set(layer.name, layer);
  }

  // Extract environment from map custom properties (default to 'interior')
  const mapEnvironment = getProperty(tiledMap.properties, 'environment') || 'interior';

  const levelData = {
    id: levelId,
    width: tiledMap.width,
    height: tiledMap.height,
    tileSize: tiledMap.tilewidth,
    environment: mapEnvironment,
    layers: {
      floor: extractTileLayer(layersByName.get('Floor') || { data: [], width: tiledMap.width, height: tiledMap.height }),
      walls: extractTileLayer(layersByName.get('Walls') || { data: [], width: tiledMap.width, height: tiledMap.height }),
      trim: extractTileLayer(layersByName.get('Trim') || { data: [], width: tiledMap.width, height: tiledMap.height }),
      overlays: extractTileLayer(layersByName.get('Overlays') || { data: [], width: tiledMap.width, height: tiledMap.height }),
      collision: extractTileLayer(layersByName.get('Collision') || { data: [], width: tiledMap.width, height: tiledMap.height })
    },
    entities: extractEntities(layersByName.get('Entities')),
    tilesets: extractTilesets(tiledMap.tilesets)
  };

  return levelData;
}

/**
 * Compile a TMX map to LevelData format
 */
function compileTmxMap(map, levelId) {
  const width = parseInt(map.$.width, 10);
  const height = parseInt(map.$.height, 10);
  const tileSize = parseInt(map.$.tilewidth, 10);

  // Get layers and objectgroups
  const layers = Array.isArray(map.layer) ? map.layer : (map.layer ? [map.layer] : []);
  const objectgroups = Array.isArray(map.objectgroup) ? map.objectgroup : (map.objectgroup ? [map.objectgroup] : []);

  // Build layer lookup by name
  const layersByName = new Map();
  for (const layer of layers) {
    layersByName.set(layer.$.name, layer);
  }
  for (const og of objectgroups) {
    layersByName.set(og.$.name, og);
  }

  // Extract environment from map properties (default to 'interior')
  const mapProps = extractTmxProperties(map.properties);
  const mapEnvironment = mapProps.environment || 'interior';

  const levelData = {
    id: levelId,
    width: width,
    height: height,
    tileSize: tileSize,
    environment: mapEnvironment,
    layers: {
      floor: extractTmxTileLayer(layersByName.get('Floor'), width, height),
      walls: extractTmxTileLayer(layersByName.get('Walls'), width, height),
      trim: extractTmxTileLayer(layersByName.get('Trim'), width, height),
      overlays: extractTmxTileLayer(layersByName.get('Overlays'), width, height),
      collision: extractTmxTileLayer(layersByName.get('Collision'), width, height)
    },
    entities: (() => {
      const merged = [
        ...extractTmxSpawns(layersByName.get('Spawns')),
        ...extractTmxPortals(layersByName.get('Portals')),
        ...extractTmxEntities(layersByName.get('Entities'))
      ];

      merged.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });

      return merged;
    })(),
    tilesets: extractTmxTilesets(map.tileset)
  };

  return levelData;
}

/**
 * Ensure output directory exists
 */
async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

async function main() {
  console.log('🔨 Tiled Map Compilation');
  console.log('========================\n');

  // Find all map files (zones by default; legacy/json only when requested)
  const jsonFiles = INCLUDE_LEGACY ? await findJsonMapFiles(BASE_DIR, BASE_DIR) : [];
  const tmxFiles = await findTmxFiles(INCLUDE_LEGACY ? ROOMS_DIR : ZONE_DIR, { includeLegacy: INCLUDE_LEGACY });

  const allFiles = [...tmxFiles, ...jsonFiles];

  if (allFiles.length === 0) {
    console.log('No map files found to compile.');
    process.exit(0);
  }

  // Sort for deterministic processing
  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Ensure output directory
  await ensureDir(OUTPUT_DIR);
  await cleanOutputDir(OUTPUT_DIR);

  let compiled = 0;
  let failed = 0;

  console.log(`Found ${jsonFiles.length} JSON files and ${tmxFiles.length} TMX files\n`);

  for (const { path: filePath, relativePath, format } of allFiles) {
    const levelId = computeLevelId(relativePath, format);

    try {
      let levelData;

      if (format === 'tmx') {
        // Parse and compile TMX
        const content = await readFile(filePath, 'utf-8');
        const parsed = await parseStringPromise(content, { explicitArray: false });
        levelData = compileTmxMap(parsed.map, levelId);
      } else {
        // Parse and compile JSON
        const content = await readFile(filePath, 'utf-8');
        const tiledMap = JSON.parse(content);
        levelData = compileJsonMap(tiledMap, levelId);
      }

      // Determine output path
      const outputPath = path.join(OUTPUT_DIR, `${levelId}.json`);
      const outputDir = path.dirname(outputPath);

      // Ensure subdirectory exists
      await ensureDir(outputDir);

      // Write with stable JSON formatting (2-space indent, sorted keys)
      const jsonOutput = JSON.stringify(levelData, null, 2);
      await writeFile(outputPath, jsonOutput + '\n', 'utf-8');

      console.log(`✓ ${levelId} (${format})`);
      compiled++;

    } catch (err) {
      console.log(`✗ ${levelId} (${format})`);
      console.log(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log(`\nCompilation: ${compiled} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(`\n✅ Compiled to ${OUTPUT_DIR}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
