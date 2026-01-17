#!/usr/bin/env node
/**
 * Generate LDtk Tileset Definitions from Tile Manifest
 * 
 * Reads: content/ai_jobs/tileset_manifest.json
 * Outputs: 
 *   - public/content/ldtk/tilesets/_scotus_tiles.ldtkt (tileset definition)
 *   - Updates existing .ldtk files to reference the tileset
 * 
 * Usage: 
 *   node scripts/generate-ldtk-tilesets.mjs
 *   node scripts/generate-ldtk-tilesets.mjs --update-levels
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const MANIFEST_PATH = path.join(__dirname, '../content/ai_jobs/tileset_manifest.json');
const ROOM_REQUIREMENTS_PATH = path.join(__dirname, '../content/ai_jobs/room_tile_requirements.json');
const GENERATED_TILES_DIR = path.join(__dirname, '../generated/tiles');
const PUBLIC_TILES_DIR = path.join(__dirname, '../public/generated/tiles');
const LDTK_OUTPUT_DIR = path.join(__dirname, '../public/content/ldtk');
const TILESET_DEF_PATH = path.join(LDTK_OUTPUT_DIR, '_scotus_tileset_def.json');

const TILE_SIZE = 32;
const ARGS = process.argv.slice(2);
const UPDATE_LEVELS = ARGS.includes('--update-levels');
const DRY_RUN = ARGS.includes('--dry-run');

// Stable UID generation from tile ID
function stableUid(tileId, offset = 1000) {
  let hash = 0;
  for (let i = 0; i < tileId.length; i++) {
    hash = ((hash << 5) - hash) + tileId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit int
  }
  return offset + Math.abs(hash % 100000);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Check which tiles actually exist as PNGs
function getGeneratedTiles() {
  const tiles = new Set();
  
  for (const dir of [GENERATED_TILES_DIR, PUBLIC_TILES_DIR]) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.png')) {
          tiles.add(file.replace('.png', ''));
        }
      }
    }
  }
  
  return tiles;
}

// Group tiles by category for tileset organization
function groupTilesByCategory(tiles) {
  const groups = {};
  
  for (const tile of tiles) {
    const category = tile.category || 'misc';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tile);
  }
  
  // Sort each group by ID for determinism
  for (const category of Object.keys(groups)) {
    groups[category].sort((a, b) => a.id.localeCompare(b.id));
  }
  
  return groups;
}

// Generate a combined tileset image layout (for LDtk to reference)
// Returns tile positions in the combined sheet
function computeTilesetLayout(tiles, columns = 16) {
  const layout = {};
  let x = 0;
  let y = 0;
  
  for (const tile of tiles) {
    layout[tile.id] = { 
      x: x * TILE_SIZE, 
      y: y * TILE_SIZE,
      col: x,
      row: y
    };
    
    x++;
    if (x >= columns) {
      x = 0;
      y++;
    }
  }
  
  const rows = Math.ceil(tiles.length / columns);
  
  return {
    layout,
    width: columns * TILE_SIZE,
    height: rows * TILE_SIZE,
    columns,
    rows
  };
}

// Build LDtk tileset definition
function buildLdtkTilesetDef(manifest, generatedTiles) {
  const allTiles = manifest.tiles || [];
  
  // Filter to only tiles that exist as PNGs
  const availableTiles = allTiles.filter(t => generatedTiles.has(t.id));
  
  if (availableTiles.length === 0) {
    console.log('⚠️  No generated tiles found yet');
    return null;
  }
  
  // Group by category
  const groups = groupTilesByCategory(availableTiles);
  const categoryOrder = ['floor', 'wall', 'trim', 'door', 'column', 'steps', 'ground', 'rug', 'object', 'decal'];
  
  // Flatten in category order
  const orderedTiles = [];
  for (const cat of categoryOrder) {
    if (groups[cat]) {
      orderedTiles.push(...groups[cat]);
    }
  }
  // Add any remaining categories
  for (const cat of Object.keys(groups)) {
    if (!categoryOrder.includes(cat)) {
      orderedTiles.push(...groups[cat]);
    }
  }
  
  const { layout, width, height, columns, rows } = computeTilesetLayout(orderedTiles);
  
  // Build enum tags from categories
  const enumTags = [...new Set(orderedTiles.map(t => t.category))].map(cat => ({
    enumValueId: cat,
    tileIds: orderedTiles
      .filter(t => t.category === cat)
      .map(t => {
        const pos = layout[t.id];
        return pos.row * columns + pos.col;
      })
  }));
  
  // Build custom data for each tile (description, autotile info)
  const customData = orderedTiles.map(t => {
    const pos = layout[t.id];
    return {
      tileId: pos.row * columns + pos.col,
      data: JSON.stringify({
        id: t.id,
        autotile: t.autotile || false,
        subcategory: t.subcategory || '',
        description: t.description || ''
      })
    };
  });
  
  const tilesetDef = {
    __cWid: columns,
    __cHei: rows,
    identifier: "SCOTUS_Tiles",
    uid: stableUid("SCOTUS_Tiles_Main"),
    relPath: "../../../generated/tiles/_combined_tileset.png",
    embedAtlas: null,
    pxWid: width,
    pxHei: height,
    tileGridSize: TILE_SIZE,
    spacing: 0,
    padding: 0,
    tags: ["scotus", "interior", "courthouse"],
    tagsSourceEnumUid: null,
    enumTags: enumTags,
    customData: customData,
    savedSelections: [],
    cachedPixelData: null
  };
  
  return {
    tilesetDef,
    layout,
    orderedTiles,
    stats: {
      total: allTiles.length,
      available: availableTiles.length,
      missing: allTiles.length - availableTiles.length,
      categories: Object.keys(groups).length
    }
  };
}

// Build per-category tileset definitions (alternative approach)
function buildCategoryTilesets(manifest, generatedTiles) {
  const allTiles = manifest.tiles || [];
  const availableTiles = allTiles.filter(t => generatedTiles.has(t.id));
  const groups = groupTilesByCategory(availableTiles);
  
  const tilesets = [];
  let uidOffset = 5000;
  
  for (const [category, tiles] of Object.entries(groups)) {
    if (tiles.length === 0) continue;
    
    const { layout, width, height, columns, rows } = computeTilesetLayout(tiles, 8);
    
    const tilesetDef = {
      __cWid: columns,
      __cHei: rows,
      identifier: `SCOTUS_${category.charAt(0).toUpperCase() + category.slice(1)}`,
      uid: stableUid(`SCOTUS_${category}`, uidOffset),
      relPath: `../../../generated/tiles/_${category}_tileset.png`,
      pxWid: width,
      pxHei: height,
      tileGridSize: TILE_SIZE,
      spacing: 0,
      padding: 0,
      tags: ["scotus", category],
      enumTags: [],
      customData: tiles.map((t, i) => ({
        tileId: i,
        data: JSON.stringify({ id: t.id, autotile: t.autotile || false })
      })),
      savedSelections: [],
      cachedPixelData: null
    };
    
    tilesets.push({
      category,
      tilesetDef,
      tiles,
      layout
    });
    
    uidOffset += 100;
  }
  
  return tilesets;
}

// Generate tile ID → LDtk tile index mapping
function buildTileIdMapping(layout, columns) {
  const mapping = {};
  
  for (const [tileId, pos] of Object.entries(layout)) {
    mapping[tileId] = {
      tilesetUid: stableUid("SCOTUS_Tiles_Main"),
      tileId: pos.row * columns + pos.col,
      x: pos.x,
      y: pos.y
    };
  }
  
  return mapping;
}

async function main() {
  console.log('🧱 LDtk Tileset Generator\n');
  console.log('='.repeat(50));
  
  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Tileset manifest not found:', MANIFEST_PATH);
    process.exit(1);
  }
  
  const manifest = readJson(MANIFEST_PATH);
  console.log(`\n📋 Loaded manifest: ${manifest.tiles?.length || 0} tile definitions`);
  
  // Check generated tiles
  const generatedTiles = getGeneratedTiles();
  console.log(`📁 Found ${generatedTiles.size} generated tile PNGs`);
  
  if (generatedTiles.size === 0) {
    console.log('\n⚠️  No tiles generated yet. Run: npm run gen:tiles:p0');
    console.log('   Will create placeholder tileset definition.\n');
  }
  
  // Build tileset definition
  const result = buildLdtkTilesetDef(manifest, generatedTiles);
  
  if (result) {
    const { tilesetDef, layout, orderedTiles, stats } = result;
    
    console.log(`\n✅ Tileset definition built:`);
    console.log(`   - ${stats.available}/${stats.total} tiles available (${Math.round(stats.available/stats.total*100)}%)`);
    console.log(`   - ${stats.categories} categories`);
    console.log(`   - Grid: ${tilesetDef.__cWid}×${tilesetDef.__cHei} (${tilesetDef.pxWid}×${tilesetDef.pxHei}px)`);
    
    // Build mapping file
    const mapping = buildTileIdMapping(layout, tilesetDef.__cWid);
    
    if (!DRY_RUN) {
      ensureDir(LDTK_OUTPUT_DIR);
      
      // Write tileset definition
      writeJson(TILESET_DEF_PATH, {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        tileSize: TILE_SIZE,
        stats,
        tilesetDef,
        tileMapping: mapping
      });
      console.log(`\n📝 Wrote: ${TILESET_DEF_PATH}`);
      
      // Write tile ID mapping for runtime use
      const mappingPath = path.join(LDTK_OUTPUT_DIR, '_tile_mapping.json');
      writeJson(mappingPath, mapping);
      console.log(`📝 Wrote: ${mappingPath}`);
    } else {
      console.log('\n🔍 Dry run - no files written');
    }
    
    // Category breakdown
    console.log('\n📊 Category breakdown:');
    const groups = groupTilesByCategory(orderedTiles);
    for (const [cat, tiles] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`   ${cat}: ${tiles.length} tiles`);
    }
  } else {
    // Create placeholder definition
    if (!DRY_RUN) {
      ensureDir(LDTK_OUTPUT_DIR);
      writeJson(TILESET_DEF_PATH, {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        tileSize: TILE_SIZE,
        stats: { total: manifest.tiles?.length || 0, available: 0, missing: manifest.tiles?.length || 0 },
        tilesetDef: null,
        tileMapping: {},
        note: "No tiles generated yet. Run npm run gen:tiles"
      });
      console.log(`\n📝 Wrote placeholder: ${TILESET_DEF_PATH}`);
    }
  }
  
  // Update existing LDtk levels if requested
  if (UPDATE_LEVELS && result) {
    console.log('\n🔄 Updating LDtk levels...');
    // TODO: Inject tileset def into existing .ldtk files
    console.log('   (Not yet implemented - manual import for now)');
  }
  
  console.log('\n✨ Done');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
