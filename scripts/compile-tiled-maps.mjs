#!/usr/bin/env node
/**
 * Tiled Map Compilation Script
 * 
 * Compiles validated Tiled JSON maps from public/content/tiled/** to
 * LevelData JSON format in generated/levels/**.
 * 
 * Usage: node scripts/compile-tiled-maps.mjs
 * 
 * See docs/TILED_PIPELINE.md for LevelData schema specification.
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const OUTPUT_DIR = path.join(process.cwd(), 'generated', 'levels');

/**
 * Recursively find all JSON map files (excluding templates, tilesets, etc.)
 * Only includes files in room pack subdirectories (depth > 0)
 */
async function findMapFiles(dir, baseDir = dir, depth = 0) {
  const files = [];
  
  if (!existsSync(dir)) return files;
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      // Skip non-map directories
      if (entry.name === 'templates' || entry.name === 'tilesets' ||
          entry.name === 'tiles' || entry.name === 'schemas' || entry.name === 'rooms') {
        continue;
      }
      const nested = await findMapFiles(fullPath, baseDir, depth + 1);
      files.push(...nested);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      // Only include JSON files in room pack subdirectories (depth > 0)
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
 * Extract properties object from Tiled properties array
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
 * Compute level ID from relative file path
 * e.g., "supreme-court/lobby.json" -> "supreme-court/lobby"
 */
function computeLevelId(relativePath) {
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
 * Extract tile layer data
 */
function extractTileLayer(layer) {
  return {
    data: layer.data || [],
    width: layer.width,
    height: layer.height
  };
}

/**
 * Extract and normalize entities from object layer
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
 * Extract tileset references
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
 * Compile a single Tiled map to LevelData format
 */
function compileMap(tiledMap, levelId) {
  // Build layer lookup
  const layersByName = new Map();
  for (const layer of tiledMap.layers || []) {
    layersByName.set(layer.name, layer);
  }
  
  // Extract layers
  const levelData = {
    id: levelId,
    width: tiledMap.width,
    height: tiledMap.height,
    tileSize: tiledMap.tilewidth,
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
  
  // Find all map files
  const mapFiles = await findMapFiles(BASE_DIR, BASE_DIR);
  
  if (mapFiles.length === 0) {
    console.log('No JSON map files found to compile.');
    process.exit(0);
  }
  
  // Sort for deterministic processing
  mapFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  
  // Ensure output directory
  await ensureDir(OUTPUT_DIR);
  
  let compiled = 0;
  let failed = 0;
  
  for (const { path: filePath, relativePath } of mapFiles) {
    const levelId = computeLevelId(relativePath);
    
    try {
      // Read and parse source map
      const content = await readFile(filePath, 'utf-8');
      const tiledMap = JSON.parse(content);
      
      // Compile to LevelData
      const levelData = compileMap(tiledMap, levelId);
      
      // Determine output path
      const outputPath = path.join(OUTPUT_DIR, `${levelId}.json`);
      const outputDir = path.dirname(outputPath);
      
      // Ensure subdirectory exists
      await ensureDir(outputDir);
      
      // Write with stable JSON formatting (2-space indent, sorted keys)
      const jsonOutput = JSON.stringify(levelData, null, 2);
      await writeFile(outputPath, jsonOutput + '\n', 'utf-8');
      
      console.log(`✓ ${levelId}`);
      compiled++;
      
    } catch (err) {
      console.log(`✗ ${levelId}`);
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
