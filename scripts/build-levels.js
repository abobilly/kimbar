#!/usr/bin/env node
/**
 * Build Levels - Normalize LDtk exports and build a unified level index.
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

const TILED_DIR = path.join(process.cwd(), 'public', 'generated', 'levels', 'tiled');
const LDTK_SOURCE_DIR = path.join(process.cwd(), 'public', 'content', 'ldtk');
const LDTK_OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated', 'levels', 'ldtk');
const INDEX_PATH = path.join(process.cwd(), 'public', 'generated', 'levels', 'index.json');

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
  console.log('🧭 Building Level Index\n');

  const indexEntries = {};

  // Tiled compiled LevelData
  const tiledFiles = await listFilesRecursive(TILED_DIR, ['.json'], new Set(['templates', 'schemas', 'tilesets', 'tiles']));
  for (const filePath of tiledFiles) {
    const relativePath = path.relative(TILED_DIR, filePath).replace(/\\/g, '/');
    const id = relativePath.replace(/\.json$/, '');
    const url = `/generated/levels/tiled/${relativePath}`;

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
    } catch (err) {
      console.warn(`⚠️ Failed to read tiled level ${filePath}: ${err.message}`);
    }
  }

  // LDtk raw files -> normalized LevelData
  const ldtkFiles = await listFilesRecursive(LDTK_SOURCE_DIR, ['.json', '.ldtk'], new Set(), '_');
  if (ldtkFiles.length > 0) {
    await mkdir(LDTK_OUTPUT_DIR, { recursive: true });
  }

  for (const filePath of ldtkFiles) {
    const relativePath = path.relative(LDTK_SOURCE_DIR, filePath).replace(/\\/g, '/');
    const fallbackId = relativePath.replace(/\.(json|ldtk)$/i, '');
    const url = `/generated/levels/ldtk/${fallbackId}.json`;

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
      } else {
        console.log(`ℹ️ Skipping LDtk level ${normalized.id} (Tiled exists)`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to normalize LDtk level ${filePath}: ${err.message}`);
    }
  }

  const ordered = {};
  for (const id of Object.keys(indexEntries).sort((a, b) => a.localeCompare(b))) {
    ordered[id] = indexEntries[id];
  }

  await mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify({ levels: ordered }, null, 2));

  console.log(`✅ Wrote level index: ${INDEX_PATH}`);
  console.log(`   Tiled: ${Object.values(ordered).filter(e => e.source === 'tiled').length}`);
  console.log(`   LDtk: ${Object.values(ordered).filter(e => e.source === 'ldtk').length}`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
