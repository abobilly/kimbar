#!/usr/bin/env node
import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const CONTRACT_PATH = path.join(BASE_DIR, 'scotus_tileset_contract.json');
const CONTRACT_SCHEMA_PATH = path.join(BASE_DIR, 'schemas', 'tiled_contract.schema.json');
const ROOMS_DIR = path.join(BASE_DIR, 'rooms');
const TILESETS_DIR = path.join(BASE_DIR, 'tilesets');

function error(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function readPngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Invalid PNG signature');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function parseAttributes(tag) {
  const attrs = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(tag))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function extractLayerNames(xml) {
  const names = new Set();
  const layerRegex = /<(layer|objectgroup)[^>]*name="([^"]+)"/g;
  let match;
  while ((match = layerRegex.exec(xml))) {
    names.add(match[2]);
  }
  return names;
}

function extractObjectTypes(xml) {
  const types = [];
  const objectRegex = /<object[^>]*type="([^"]+)"[^>]*>/g;
  let match;
  while ((match = objectRegex.exec(xml))) {
    types.push(match[1]);
  }
  return types;
}

function extractTilesetSources(xml) {
  const sources = [];
  const regex = /<tileset[^>]*source="([^"]+)"/g;
  let match;
  while ((match = regex.exec(xml))) {
    sources.push(match[1]);
  }
  return sources;
}

async function validateContract() {
  if (!existsSync(CONTRACT_PATH)) {
    error(`Missing contract: ${CONTRACT_PATH}`);
    return null;
  }
  if (!existsSync(CONTRACT_SCHEMA_PATH)) {
    error(`Missing contract schema: ${CONTRACT_SCHEMA_PATH}`);
    return null;
  }
  const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf-8'));
  await readFile(CONTRACT_SCHEMA_PATH, 'utf-8');
  if (!contract.version || !contract.tileSize || !Array.isArray(contract.atlases) || !Array.isArray(contract.tiles)) {
    error('Contract missing required fields');
  } else {
    ok('Contract structure valid');
  }

  const ids = new Set();
  for (const tile of contract.tiles || []) {
    if (ids.has(tile.id)) {
      error(`Duplicate tile id: ${tile.id}`);
    }
    ids.add(tile.id);
  }

  return contract;
}

async function validateAtlases(contract) {
  for (const atlas of contract.atlases || []) {
    const atlasPath = path.join(BASE_DIR, atlas.path);
    if (!existsSync(atlasPath)) {
      error(`Atlas missing: ${atlas.path}`);
      continue;
    }
    const buffer = await readFile(atlasPath);
    const { width, height } = readPngSize(buffer);
    if (width > atlas.maxWidth || height > atlas.maxHeight) {
      error(`Atlas ${atlas.id} exceeds max ${atlas.maxWidth}x${atlas.maxHeight}`);
    }
    ok(`Atlas ${atlas.id}: ${width}x${height}`);
  }
}

async function validateTilesets() {
  if (!existsSync(TILESETS_DIR)) {
    error(`Tilesets dir missing: ${TILESETS_DIR}`);
    return;
  }
  const files = (await readdir(TILESETS_DIR)).filter((name) => name.endsWith('.tsx'));
  for (const file of files) {
    const xml = await readFile(path.join(TILESETS_DIR, file), 'utf-8');
    if (!xml.includes('<tileset')) {
      error(`Tileset ${file} missing tileset tag`);
    }
    if (!xml.includes('<image')) {
      error(`Tileset ${file} missing image tag`);
    }
  }
  ok(`${files.length} TSX tileset(s) validated`);
}

async function validateRooms(contract) {
  if (!existsSync(ROOMS_DIR)) {
    error(`Rooms dir missing: ${ROOMS_DIR}`);
    return;
  }
  const files = (await readdir(ROOMS_DIR)).filter((name) => name.endsWith('.tmx'));
  const requiredLayers = ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision', 'Entities'];
  const allowedTilesetPrefixes = new Set(
    (contract.atlases || []).map((a) => path.basename(a.tsxPath))
  );
  allowedTilesetPrefixes.add('collision.tsx');

  for (const file of files) {
    const xml = await readFile(path.join(ROOMS_DIR, file), 'utf-8');
    const layerNames = extractLayerNames(xml);
    for (const layer of requiredLayers) {
      if (!layerNames.has(layer)) {
        error(`${file}: missing layer ${layer}`);
      }
    }

    const objectTypes = extractObjectTypes(xml);
    if (!objectTypes.includes('PlayerSpawn')) {
      error(`${file}: missing PlayerSpawn entity`);
    }
    if (!objectTypes.includes('Door')) {
      error(`${file}: missing Door entity`);
    }

    const tilesets = extractTilesetSources(xml);
    for (const source of tilesets) {
      const base = path.basename(source);
      if (!allowedTilesetPrefixes.has(base)) {
        error(`${file}: unexpected tileset ${source}`);
      }
    }
  }
  ok(`${files.length} TMX room(s) validated`);
}

async function main() {
  console.log('🧩 Validating Tiled pipeline...');
  const contract = await validateContract();
  if (contract) {
    await validateAtlases(contract);
  }
  await validateTilesets();
  if (contract) {
    await validateRooms(contract);
  }

  if (process.exitCode === 1) {
    console.error('Tiled validation failed.');
    process.exit(1);
  }
  console.log('✅ Tiled validation passed.');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
