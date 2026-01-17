#!/usr/bin/env node
/**
 * inject-ldtk-tileset.mjs
 * 
 * Injects the SCOTUS tileset definition into all LDtk project files.
 * Also updates the Floor layer to use the tileset for auto-tiling.
 */

import fs from 'fs';
import path from 'path';

const LDTK_DIR = 'public/content/ldtk';
const TILESET_META_PATH = 'generated/tilesets/scotus_tiles.json';
const TILESET_REL_PATH = '../../generated/tilesets/scotus_tiles.png';

// Load tileset metadata
const tilesetMeta = JSON.parse(fs.readFileSync(TILESET_META_PATH, 'utf-8'));

// LDtk tileset definition
const tilesetDef = {
  __cWid: tilesetMeta.columns,
  __cHei: tilesetMeta.rows,
  identifier: "SCOTUS_Tiles",
  uid: 500,
  relPath: TILESET_REL_PATH,
  embedAtlas: null,
  pxWid: tilesetMeta.imageWidth,
  pxHei: tilesetMeta.imageHeight,
  tileGridSize: tilesetMeta.tileWidth,
  spacing: 0,
  padding: 0,
  tags: [],
  tagsSourceEnumUid: null,
  enumTags: [],
  customData: [],
  savedSelections: [],
  cachedPixelData: null
};

// Process all LDtk files
const ldtkFiles = fs.readdirSync(LDTK_DIR).filter(f => f.endsWith('.ldtk'));

let updated = 0;
for (const filename of ldtkFiles) {
  const filepath = path.join(LDTK_DIR, filename);
  const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  // Check if tileset already exists
  const existing = content.defs?.tilesets?.find(t => t.identifier === 'SCOTUS_Tiles');
  if (existing) {
    console.log(`⏭️  ${filename}: tileset already present`);
    continue;
  }
  
  // Add tileset to defs
  if (!content.defs) content.defs = {};
  if (!content.defs.tilesets) content.defs.tilesets = [];
  content.defs.tilesets.push(tilesetDef);
  
  // Update Floor layer to reference the tileset
  const floorLayer = content.defs?.layers?.find(l => l.identifier === 'Floor');
  if (floorLayer) {
    floorLayer.tilesetDefUid = 500;
    floorLayer.autoTilesetDefUid = 500;
  }
  
  // Write back
  fs.writeFileSync(filepath, JSON.stringify(content, null, 2));
  console.log(`✅ ${filename}: tileset injected`);
  updated++;
}

console.log(`\nDone: ${updated} files updated, ${ldtkFiles.length - updated} skipped`);

// Also create a tile name → index lookup for easy reference
const tileLookup = {};
for (const [name, info] of Object.entries(tilesetMeta.tiles)) {
  tileLookup[name] = info.index;
}
fs.writeFileSync('generated/tilesets/tile_lookup.json', JSON.stringify(tileLookup, null, 2));
console.log('✅ Created tile_lookup.json for easy tile ID → index mapping');
