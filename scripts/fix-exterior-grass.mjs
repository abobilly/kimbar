#!/usr/bin/env node
/**
 * fix-exterior-grass.mjs - Convert exterior level to grass
 * 
 * Updates courthouse_exterior.ldtk to use grass tiles instead of floor.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const LDTK_FILE = path.resolve('public/content/ldtk/courthouse_exterior.ldtk');

// IntGrid values
const INT = { EMPTY: 0, FLOOR: 1, WALL: 2, GRASS: 3 };

async function main() {
  console.log('🌿 Converting exterior level to grass...\n');

  const content = await fs.readFile(LDTK_FILE, 'utf-8');
  const ldtk = JSON.parse(content);

  const level = ldtk.levels?.[0];
  if (!level) {
    console.error('No level found');
    return;
  }

  const floorLayer = level.layerInstances?.find(l => l.__identifier === 'Floor');
  if (!floorLayer) {
    console.error('No Floor layer found');
    return;
  }

  const width = floorLayer.__cWid;
  const height = floorLayer.__cHei;
  const grid = [...floorLayer.intGridCsv];

  let grassCount = 0;
  let pathCount = 0;

  // Create a proper exterior layout:
  // - Grass on most of the map
  // - Stone path in center leading to building
  // - Building footprint at top (walls)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const current = grid[idx];

      // Top 3 rows = building (walls)
      if (y < 3) {
        grid[idx] = INT.WALL;
        continue;
      }

      // Center path (3 tiles wide)
      const centerX = Math.floor(width / 2);
      if (x >= centerX - 1 && x <= centerX + 1) {
        // Keep as floor (stone path)
        if (current === INT.WALL) {
          grid[idx] = INT.FLOOR;
          pathCount++;
        }
        continue;
      }

      // Everything else is grass
      if (current === INT.FLOOR || current === INT.WALL) {
        grid[idx] = INT.GRASS;
        grassCount++;
      }
    }
  }

  floorLayer.intGridCsv = grid;

  // Save
  await fs.writeFile(LDTK_FILE, JSON.stringify(ldtk, null, 2));

  console.log(`✅ Converted ${grassCount} tiles to grass`);
  console.log(`✅ Created ${pathCount} path tiles`);
  console.log(`✅ Saved ${LDTK_FILE}`);
}

main().catch(console.error);
