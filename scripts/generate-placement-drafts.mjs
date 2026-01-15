#!/usr/bin/env node
/**
 * generate-placement-drafts.mjs
 *
 * Generates prop placement drafts from docs/MISSING_ASSETS_SPEC.json.
 * Output: content/placement_drafts/prop_placements.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SPEC_PATH = './docs/MISSING_ASSETS_SPEC.json';
const OUTPUT_DIR = './content/placement_drafts';
const OUTPUT_FILE = 'prop_placements.json';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveRoomSpec(rooms, roomId) {
  if (rooms[roomId]) return rooms[roomId];
  if (roomId.startsWith('chambers_') && rooms.chambers) {
    return rooms.chambers;
  }
  return null;
}

function pickPlacement(zoneRect, footprint) {
  const [x1, y1, x2, y2] = zoneRect;
  const width = x2 - x1 + 1;
  const height = y2 - y1 + 1;
  const [fw, fh] = footprint;

  const maxX = x2 - (fw - 1);
  const maxY = y2 - (fh - 1);

  const centerX = Math.floor((x1 + x2) / 2);
  const centerY = Math.floor((y1 + y2) / 2);

  const x = clamp(centerX - Math.floor((fw - 1) / 2), x1, maxX < x1 ? x1 : maxX);
  const y = clamp(centerY - Math.floor((fh - 1) / 2), y1, maxY < y1 ? y1 : maxY);

  return { x, y, width, height };
}

async function main() {
  if (!existsSync(SPEC_PATH)) {
    throw new Error(`Spec not found: ${SPEC_PATH}`);
  }

  const spec = JSON.parse(await readFile(SPEC_PATH, 'utf-8'));
  const rooms = spec.rooms || {};
  const assets = (spec.assets || []).filter((a) => a.kind === 'prop');

  const placements = {};

  for (const asset of assets) {
    const footprint = asset.footprint || [1, 1];
    const collision = Boolean(asset.collision);
    const placer = asset.placer || {};
    const roomIds = placer.rooms || [];
    const zones = placer.zones || [];

    for (const roomId of roomIds) {
      const roomSpec = resolveRoomSpec(rooms, roomId);
      if (!roomSpec || !roomSpec.zones) {
        continue;
      }

      for (const zoneName of zones) {
        const zone = roomSpec.zones[zoneName];
        if (!zone || !zone.rect) {
          continue;
        }

        const placement = pickPlacement(zone.rect, footprint);
        const entry = {
          type: 'Prop',
          id: asset.id,
          zone: zoneName,
          x: placement.x,
          y: placement.y,
          properties: {
            sprite: asset.id,
            collision
          }
        };

        if (!placements[roomId]) placements[roomId] = [];
        placements[roomId].push(entry);
      }
    }
  }

  // Sort deterministically
  const orderedPlacements = {};
  const roomKeys = Object.keys(placements).sort();
  for (const roomId of roomKeys) {
    const items = placements[roomId];
    items.sort((a, b) => {
      const idCompare = a.id.localeCompare(b.id);
      if (idCompare !== 0) return idCompare;
      return a.zone.localeCompare(b.zone);
    });
    orderedPlacements[roomId] = items;
  }

  const output = {
    $schema: '../../schemas/PlacementDraft.schema.json',
    schemaVersion: 1,
    sourceSpec: 'docs/MISSING_ASSETS_SPEC.json',
    placements: orderedPlacements
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, OUTPUT_FILE);
  await writeFile(outPath, JSON.stringify(output, null, 2));

  console.log(`✅ Wrote ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to generate placement drafts:', err.message);
  process.exit(1);
});
