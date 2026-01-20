#!/usr/bin/env node
/**
 * Build Levels - Normalize LDtk exports and build a unified level index.
 *
 * Tiled-first behavior:
 * - For each room, check if a Tiled source exists at public/content/tiled/rooms/<room_id>.tmx
 * - If Tiled source exists, use compiled Tiled output from public/generated/levels/tiled/<room_id>.json
 * - Only fall back to LDtk when no Tiled source is present
 *
 * Outputs:
 * - public/generated/levels/ldtk/*.json (normalized LevelData)
 * - public/generated/levels/index.json (roomId -> { source, url, meta })
 *
 * Tiled outputs are compiled separately to:
 * - public/generated/levels/tiled/*.json
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Tiled source and compiled directories
const TILED_SOURCE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled', 'rooms');
const TILED_COMPILED_DIR = path.join(process.cwd(), 'public', 'generated', 'levels', 'tiled');

// LDtk source and output directories
const LDTK_SOURCE_DIR = path.join(process.cwd(), 'public', 'content', 'ldtk');
const LDTK_OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated', 'levels', 'ldtk');

// Room entries directory (specs)
const ROOM_ENTRIES_DIR = path.join(process.cwd(), 'specs', 'room_entries');

const INDEX_PATH = path.join(process.cwd(), 'public', 'generated', 'levels', 'index.json');

/**
 * Check if a Tiled TMX source exists for a given room ID
 */
function hasTiledSource(roomId) {
  const tmxPath = path.join(TILED_SOURCE_DIR, `${roomId}.tmx`);
  return existsSync(tmxPath);
}

/**
 * Check if a compiled Tiled JSON exists for a given room ID
 */
function hasTiledCompiled(roomId) {
  const jsonPath = path.join(TILED_COMPILED_DIR, `${roomId}.json`);
  return existsSync(jsonPath);
}

async function listFilesRecursive(dir, exts, skipDirs = new Set(), skipPrefix = '_') {
  const files = [];
  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(skipPrefix)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      files.push(...await listFilesRecursive(fullPath, exts, skipDirs, skipPrefix));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function normalizeLdtkLevel(rawJson, fallbackId) {
  const levelData = Array.isArray(rawJson?.levels) && rawJson.levels.length > 0
    ? rawJson.levels[0]
    : rawJson;

  const layers = levelData?.layerInstances || [];
  const entitiesLayer = layers.find((layer) => layer.__identifier === 'Entities');
  const floorLayer = layers.find((layer) => layer.__identifier === 'Floor');

  const gridSize = entitiesLayer?.__gridSize || floorLayer?.__gridSize || 32;
  const id = levelData?.identifier || levelData?.iid || fallbackId || 'unknown';

  const entities = [];
  let playerSpawn = undefined;

  if (entitiesLayer?.entityInstances) {
    for (const entity of entitiesLayer.entityInstances) {
      const coords = convertEntityCoordinates(entity, gridSize);
      const props = extractProperties(entity.fieldInstances);
      const entry = {
        id: entity.iid || `${entity.__identifier}_${entity.defUid || 0}`,
        type: entity.__identifier,
        x: coords.x,
        y: coords.y,
        properties: props
      };

      if (entity.__identifier === 'PlayerSpawn') {
        playerSpawn = { x: coords.x, y: coords.y };
      } else {
        entities.push(entry);
      }
    }
  }

  return {
    id,
    width: levelData?.pxWid || 0,
    height: levelData?.pxHei || 0,
    tileSize: gridSize,
    playerSpawn,
    entities,
    floorGrid: floorLayer?.intGridCsv,
    gridWidth: floorLayer?.__cWid,
    gridHeight: floorLayer?.__cHei,
    environment: levelData?._kimbar?.environment
  };
}

function convertEntityCoordinates(entity, gridSize) {
  if (entity?.__worldX !== undefined && entity?.__worldY !== undefined) {
    return { x: entity.__worldX, y: entity.__worldY };
  }

  if (Array.isArray(entity?.px)) {
    return { x: entity.px[0] + gridSize / 2, y: entity.px[1] + gridSize };
  }

  if (Array.isArray(entity?.__grid)) {
    return {
      x: entity.__grid[0] * gridSize + gridSize / 2,
      y: (entity.__grid[1] + 1) * gridSize
    };
  }

  return { x: 0, y: 0 };
}

function extractProperties(fieldInstances) {
  const props = {};
  if (!Array.isArray(fieldInstances)) return props;
  for (const field of fieldInstances) {
    props[field.__identifier] = field.__value;
  }
  return props;
}

function buildIndexEntry({ source, url, meta }) {
  return { source, url, meta };
}

async function main() {
  console.log('🧭 Building Level Index (Tiled-first)\n');

  const indexEntries = {};
  const sourceLog = { tiled: [], ldtk: [], missing: [] };

  // Step 1: Scan room_entries to get the list of rooms we need to process
  const roomEntries = [];
  if (existsSync(ROOM_ENTRIES_DIR)) {
    const entryFiles = await listFilesRecursive(ROOM_ENTRIES_DIR, ['.json'], new Set(), '_');
    for (const filePath of entryFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const entry = JSON.parse(content);
        if (entry.id) {
          roomEntries.push(entry);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to read room entry ${filePath}: ${err.message}`);
      }
    }
  }

  // Step 2: Process Tiled compiled LevelData (Tiled-first)
  // First, index all available Tiled compiled files
  const tiledFiles = await listFilesRecursive(TILED_COMPILED_DIR, ['.json'], new Set(['templates', 'schemas', 'tilesets', 'tiles']));
  for (const filePath of tiledFiles) {
    const relativePath = path.relative(TILED_COMPILED_DIR, filePath).replace(/\\/g, '/');
    const id = relativePath.replace(/\.json$/, '');
    const url = `/generated/levels/tiled/${relativePath}`;

    // Check if Tiled source exists (TMX file)
    const hasSource = hasTiledSource(id);

    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      indexEntries[id] = buildIndexEntry({
        source: 'tiled',
        url,
        meta: {
          width: data?.width,
          height: data?.height,
          tileSize: data?.tileSize,
          environment: data?.environment
        }
      });
      sourceLog.tiled.push(id);
      console.log(`  📦 ${id}: Tiled${hasSource ? '' : ' (compiled only, no .tmx source)'}`);
    } catch (err) {
      console.warn(`⚠️ Failed to read tiled level ${filePath}: ${err.message}`);
    }
  }

  // Step 3: Process LDtk files (fallback for rooms without Tiled)
  const ldtkFiles = await listFilesRecursive(LDTK_SOURCE_DIR, ['.json', '.ldtk'], new Set(), '_');
  if (ldtkFiles.length > 0) {
    await mkdir(LDTK_OUTPUT_DIR, { recursive: true });
  }

  for (const filePath of ldtkFiles) {
    const relativePath = path.relative(LDTK_SOURCE_DIR, filePath).replace(/\\/g, '/');
    const fallbackId = relativePath.replace(/\.(json|ldtk)$/i, '');
    const url = `/generated/levels/ldtk/${fallbackId}.json`;

    // Check if Tiled source exists - if so, skip LDtk
    if (hasTiledSource(fallbackId)) {
      console.log(`  ⏭️ ${fallbackId}: Skipping LDtk (Tiled source exists)`);
      continue;
    }

    try {
      const raw = JSON.parse(await readFile(filePath, 'utf-8'));
      const normalized = normalizeLdtkLevel(raw, fallbackId);

      const outputPath = path.join(LDTK_OUTPUT_DIR, `${fallbackId}.json`);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(normalized, null, 2));

      if (!indexEntries[normalized.id]) {
        indexEntries[normalized.id] = buildIndexEntry({
          source: 'ldtk',
          url,
          meta: {
            width: normalized.width,
            height: normalized.height,
            tileSize: normalized.tileSize,
            environment: normalized.environment
          }
        });
        sourceLog.ldtk.push(normalized.id);
        console.log(`  📦 ${normalized.id}: LDtk (fallback)`);
      } else {
        console.log(`  ⏭️ ${normalized.id}: Skipping LDtk (Tiled compiled exists)`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to normalize LDtk level ${filePath}: ${err.message}`);
    }
  }

  // Step 4: Check for rooms in room_entries that have no level data
  for (const entry of roomEntries) {
    if (!indexEntries[entry.id]) {
      sourceLog.missing.push(entry.id);
      console.log(`  ⚠️ ${entry.id}: No level data (neither Tiled nor LDtk)`);
    }
  }

  const ordered = {};
  for (const id of Object.keys(indexEntries).sort((a, b) => a.localeCompare(b))) {
    ordered[id] = indexEntries[id];
  }

  await mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify({ levels: ordered }, null, 2));

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Wrote level index: ${INDEX_PATH}`);
  console.log(`   Tiled: ${sourceLog.tiled.length}`);
  console.log(`   LDtk:  ${sourceLog.ldtk.length}`);
  if (sourceLog.missing.length > 0) {
    console.log(`   ⚠️ Missing: ${sourceLog.missing.length} (${sourceLog.missing.join(', ')})`);
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
