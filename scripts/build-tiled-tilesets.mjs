#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'public', 'content', 'tiled');
const CONTRACT_PATH = path.join(BASE_DIR, 'scotus_tileset_contract.json');
const TILE_SIZE = 32;

function readPngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Invalid PNG signature');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function buildTilesetXml({ name, imageSource, width, height, columns, tileCount }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<tileset version="1.10" tiledversion="1.10.2" name="${name}" tilewidth="${TILE_SIZE}" tileheight="${TILE_SIZE}" tilecount="${tileCount}" columns="${columns}">`,
    ` <image source="${imageSource}" width="${width}" height="${height}"/>`,
    '</tileset>',
    ''
  ].join('\n');
}

function buildCollisionXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tileset version="1.10" tiledversion="1.10.2" name="scotus_collision" tilewidth="32" tileheight="32" tilecount="1" columns="1">',
    ' <image source="../tiles/scotus_floors.png" width="32" height="32"/>',
    ' <tile id="0">',
    '  <properties>',
    '   <property name="collision" type="bool" value="true"/>',
    '  </properties>',
    ' </tile>',
    '</tileset>',
    ''
  ].join('\n');
}

async function main() {
  if (!existsSync(CONTRACT_PATH)) {
    throw new Error(`Missing contract at ${CONTRACT_PATH}`);
  }

  const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf-8'));
  if (!Array.isArray(contract.atlases)) {
    throw new Error('Contract missing atlases array');
  }

  for (const atlas of contract.atlases) {
    const atlasPath = path.join(BASE_DIR, atlas.path);
    const buffer = await readFile(atlasPath);
    const { width, height } = readPngSize(buffer);
    const columns = Math.floor(width / TILE_SIZE);
    const rows = Math.floor(height / TILE_SIZE);
    const tileCount = columns * rows;
    const imageSource = path.join('..', atlas.path).replace(/\\/g, '/');
    const xml = buildTilesetXml({
      name: atlas.id,
      imageSource,
      width,
      height,
      columns,
      tileCount
    });
    const tsxPath = path.join(BASE_DIR, atlas.tsxPath);
    await writeFile(tsxPath, xml, 'utf-8');
  }

  const collisionPath = path.join(BASE_DIR, 'tilesets', 'collision.tsx');
  await writeFile(collisionPath, buildCollisionXml(), 'utf-8');

  console.log('✅ Generated Tiled tilesets');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
