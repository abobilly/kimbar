#!/usr/bin/env node
/**
 * fix-ldtk-visuals.mjs - Fix LDtk level visuals
 * 
 * Updates LDtk files to:
 * 1. Add wall/grass intGrid values to Floor layer definition
 * 2. Generate proper floor boundaries (walls around edges)
 * 3. Add grass for exterior areas
 * 4. Fix prop entity sprite references
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const LDTK_DIR = path.resolve('public/content/ldtk');

// IntGrid value mapping
const INT_VALUES = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  GRASS: 3,
  TRIM: 4
};

// Prop sprite mapping - maps entity IDs to actual prop sprites
const PROP_SPRITE_MAP = {
  'prop_banner': 'prop.flag',
  'prop_couch': 'prop.seating_area',
  'prop_info_desk': 'prop.reception_desk',
  'prop_metal_detector': 'prop.metal_detector',
  'prop_stanchion': 'prop.rope_stanchion',
  'prop_xray_belt': 'prop.security_scanner',
  'prop_bench': 'prop.bench',
  'prop_plant': 'prop.planter',
  'prop_bookshelf': 'prop.bookshelf',
  'prop_desk': 'prop.desk',
  'prop_chair': 'prop.chair',
  'prop_gavel': 'prop.gavel',
  'prop_lectern': 'prop.argument_lectern',
  'prop_file_cabinet': 'prop.file_cabinet'
};

async function loadLdtk(filename) {
  const content = await fs.readFile(path.join(LDTK_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

async function saveLdtk(filename, data) {
  await fs.writeFile(
    path.join(LDTK_DIR, filename),
    JSON.stringify(data, null, 2)
  );
}

function addIntGridValues(ldtk) {
  // Find Floor layer definition
  const floorLayerDef = ldtk.defs?.layers?.find(l => l.identifier === 'Floor');
  if (!floorLayerDef) {
    console.warn('  No Floor layer definition found');
    return false;
  }

  // Check if values already exist
  const existingValues = floorLayerDef.intGridValues || [];
  const hasWall = existingValues.some(v => v.identifier === 'Wall');
  const hasGrass = existingValues.some(v => v.identifier === 'Grass');

  if (!hasWall) {
    existingValues.push({
      value: INT_VALUES.WALL,
      identifier: 'Wall',
      color: '#4a4a4a'
    });
  }

  if (!hasGrass) {
    existingValues.push({
      value: INT_VALUES.GRASS,
      identifier: 'Grass',
      color: '#4a8f4a'
    });
  }

  floorLayerDef.intGridValues = existingValues;
  return true;
}

function generateWallBoundary(ldtk) {
  // Find the level and floor layer instance
  const level = ldtk.levels?.[0];
  if (!level) return false;

  const floorLayer = level.layerInstances?.find(l => l.__identifier === 'Floor');
  if (!floorLayer) return false;

  const width = floorLayer.__cWid;
  const height = floorLayer.__cHei;
  const grid = [...floorLayer.intGridCsv];

  // Track changes
  let changes = 0;

  // Add walls on perimeter (except south edge for exterior access)
  for (let x = 0; x < width; x++) {
    // North wall
    if (grid[x] === INT_VALUES.FLOOR) {
      grid[x] = INT_VALUES.WALL;
      changes++;
    }
    // South - keep as floor for door/exit
  }

  for (let y = 0; y < height; y++) {
    // West wall
    const westIdx = y * width;
    if (grid[westIdx] === INT_VALUES.FLOOR) {
      grid[westIdx] = INT_VALUES.WALL;
      changes++;
    }
    // East wall
    const eastIdx = y * width + (width - 1);
    if (grid[eastIdx] === INT_VALUES.FLOOR) {
      grid[eastIdx] = INT_VALUES.WALL;
      changes++;
    }
  }

  // Add inner wall row (row 1) except for door opening
  const doorX = Math.floor(width / 2); // Center door
  for (let x = 0; x < width; x++) {
    if (x < doorX - 1 || x > doorX + 1) {
      const idx = width + x; // Row 1
      if (grid[idx] === INT_VALUES.FLOOR) {
        grid[idx] = INT_VALUES.WALL;
        changes++;
      }
    }
  }

  floorLayer.intGridCsv = grid;
  console.log(`  Added ${changes} wall tiles`);
  return changes > 0;
}

function fixPropSprites(ldtk) {
  const level = ldtk.levels?.[0];
  if (!level) return false;

  const entityLayer = level.layerInstances?.find(l => l.__identifier === 'Entities');
  if (!entityLayer) return false;

  let fixed = 0;

  for (const entity of entityLayer.entityInstances) {
    if (entity.__identifier !== 'Prop') continue;

    // Extract base prop name from iid (e.g., "prop_banner__north_wall__1" -> "prop_banner")
    const iid = entity.iid || '';
    const match = iid.match(/^(prop_[a-z_]+)/);
    if (!match) continue;

    const baseName = match[1];
    const spriteKey = PROP_SPRITE_MAP[baseName];

    if (spriteKey) {
      // Find or create sprite field
      let spriteField = entity.fieldInstances?.find(f => f.__identifier === 'sprite');
      if (!spriteField) {
        entity.fieldInstances = entity.fieldInstances || [];
        entity.fieldInstances.push({
          __identifier: 'sprite',
          __type: 'String',
          __value: spriteKey,
          defUid: 999,
          realEditorValues: []
        });
      } else {
        spriteField.__value = spriteKey;
      }
      fixed++;
      console.log(`  Fixed prop: ${iid} -> ${spriteKey}`);
    }
  }

  return fixed > 0;
}

async function processFile(filename) {
  console.log(`Processing: ${filename}`);
  
  try {
    const ldtk = await loadLdtk(filename);
    
    let modified = false;
    
    // Step 1: Add intGrid values to definition
    if (addIntGridValues(ldtk)) {
      console.log('  Added Wall/Grass intGrid values');
      modified = true;
    }
    
    // Step 2: Generate wall boundaries
    if (generateWallBoundary(ldtk)) {
      modified = true;
    }
    
    // Step 3: Fix prop sprites
    if (fixPropSprites(ldtk)) {
      modified = true;
    }
    
    if (modified) {
      await saveLdtk(filename, ldtk);
      console.log(`  ✅ Saved changes`);
    } else {
      console.log(`  No changes needed`);
    }
    
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
  }
}

async function main() {
  console.log('🔧 Fixing LDtk level visuals...\n');
  
  const files = await fs.readdir(LDTK_DIR);
  const ldtkFiles = files.filter(f => f.endsWith('.ldtk'));
  
  for (const file of ldtkFiles) {
    await processFile(file);
    console.log('');
  }
  
  console.log('✨ Done!');
}

main().catch(console.error);
