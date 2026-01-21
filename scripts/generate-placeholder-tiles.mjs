#!/usr/bin/env node

/**
 * Deterministic Placeholder Tile Generator
 * 
 * Generates 32x32 PNG placeholder tiles for all tiles defined in the tileset manifest.
 * Uses stable hashing to create visually distinct patterns for easy identification.
 * 
 * Usage:
 *   node scripts/generate-placeholder-tiles.mjs [--force]
 * 
 * Options:
 *   --force   Regenerate all tiles even if they already exist
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const MANIFEST_PATH = './specs/ai_jobs/tileset_manifest.json';
const OUTPUT_DIR = './public/generated/tiles';
const INDEX_PATH = './public/generated/tiles/placeholders.index.json';
const TILE_SIZE = 32;

// Parse arguments
const args = process.argv.slice(2);
const FORCE_REGENERATE = args.includes('--force');

/**
 * Generate a deterministic color from a string using hash
 */
function hashToColor(str, index = 0) {
  const hash = createHash('md5').update(str + index).digest('hex');
  const r = parseInt(hash.substring(0, 2), 16);
  const g = parseInt(hash.substring(2, 4), 16);
  const b = parseInt(hash.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Generate SVG pattern for a tile based on category
 */
function generateTileSVG(tileId, category, subcategory) {
  // Get deterministic colors based on tile ID
  const baseColor = hashToColor(tileId, 0);
  const accentColor = hashToColor(tileId, 1);
  const borderColor = hashToColor(tileId, 2);
  
  const baseColorStr = `rgb(${baseColor.r},${baseColor.g},${baseColor.b})`;
  const accentColorStr = `rgb(${accentColor.r},${accentColor.g},${accentColor.b})`;
  const borderColorStr = `rgb(${borderColor.r},${borderColor.g},${borderColor.b})`;
  
  let pattern = '';
  
  // Category-specific patterns
  switch (category) {
    case 'floor':
      // Grid pattern for floors
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        ${Array.from({ length: 5 }, (_, i) => {
          const pos = i * 8;
          return `
            <line x1="${pos}" y1="0" x2="${pos}" y2="${TILE_SIZE}" stroke="${accentColorStr}" stroke-width="1" opacity="0.4"/>
            <line x1="0" y1="${pos}" x2="${TILE_SIZE}" y2="${pos}" stroke="${accentColorStr}" stroke-width="1" opacity="0.4"/>
          `;
        }).join('')}
      `;
      break;
      
    case 'wall':
      // Vertical lines for walls
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        ${Array.from({ length: 8 }, (_, i) => 
          `<rect x="${i * 4}" y="0" width="2" height="${TILE_SIZE}" fill="${accentColorStr}" opacity="0.4"/>`
        ).join('')}
      `;
      break;
      
    case 'trim':
      // Border pattern for trim
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        <rect x="0" y="0" width="${TILE_SIZE}" height="2" fill="${accentColorStr}" opacity="0.4"/>
        <rect x="0" y="${TILE_SIZE - 2}" width="${TILE_SIZE}" height="2" fill="${accentColorStr}" opacity="0.4"/>
      `;
      break;
      
    case 'door':
      // Centered rectangle for doors
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        <rect x="8" y="4" width="16" height="24" fill="${accentColorStr}" opacity="0.4"/>
      `;
      break;
      
    case 'column':
      // Circular pattern for columns
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        <circle cx="${TILE_SIZE / 2}" cy="${TILE_SIZE / 2}" r="12" fill="${accentColorStr}" opacity="0.4"/>
      `;
      break;
      
    case 'steps':
      // Horizontal lines for steps
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        ${Array.from({ length: 5 }, (_, i) => 
          `<rect x="0" y="${4 + i * 6}" width="${TILE_SIZE}" height="2" fill="${accentColorStr}" opacity="0.4"/>`
        ).join('')}
      `;
      break;
      
    case 'rug':
      // Diamond pattern for rugs
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        <polygon points="${TILE_SIZE / 2},2 ${TILE_SIZE - 2},${TILE_SIZE / 2} ${TILE_SIZE / 2},${TILE_SIZE - 2} 2,${TILE_SIZE / 2}" 
                 fill="${accentColorStr}" opacity="0.4"/>
      `;
      break;
      
    case 'decal':
    case 'object':
      // Centered square for objects/decals
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        <rect x="8" y="8" width="16" height="16" fill="${accentColorStr}" opacity="0.4"/>
      `;
      break;
      
    case 'ground':
      // Scattered dots for ground
      const dots = Array.from({ length: 20 }, (_, i) => {
        const hash = createHash('md5').update(tileId + i).digest('hex');
        const x = parseInt(hash.substring(0, 2), 16) % TILE_SIZE;
        const y = parseInt(hash.substring(2, 4), 16) % TILE_SIZE;
        return `<rect x="${x}" y="${y}" width="2" height="2" fill="${accentColorStr}" opacity="0.4"/>`;
      }).join('');
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        ${dots}
      `;
      break;
      
    default:
      // Default crosshatch pattern
      const crosshatch = Array.from({ length: 8 }, (_, i) => 
        `<rect x="${i * 4}" y="${i * 4}" width="2" height="2" fill="${accentColorStr}" opacity="0.4"/>
         <rect x="${TILE_SIZE - i * 4}" y="${i * 4}" width="2" height="2" fill="${accentColorStr}" opacity="0.4"/>`
      ).join('');
      pattern = `
        <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${baseColorStr}" opacity="0.2"/>
        ${crosshatch}
      `;
  }
  
  // Add border
  const idHash = createHash('md5').update(tileId).digest('hex').substring(0, 2).toUpperCase();
  
  return `
    <svg width="${TILE_SIZE}" height="${TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${pattern}
      <rect x="0.5" y="0.5" width="${TILE_SIZE - 1}" height="${TILE_SIZE - 1}" 
            fill="none" stroke="${borderColorStr}" stroke-width="1" opacity="0.8"/>
      <text x="2" y="8" font-family="monospace" font-size="6" fill="${borderColorStr}" opacity="0.9">${idHash}</text>
    </svg>
  `;
}

/**
 * Generate a single placeholder tile
 */
async function generatePlaceholderTile(tileSpec) {
  const { id, category = 'unknown', subcategory = '' } = tileSpec;
  
  // Generate SVG
  const svg = generateTileSVG(id, category, subcategory);
  
  // Convert SVG to PNG using sharp
  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  
  return buffer;
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Deterministic Placeholder Tile Generator\n');
  console.log('='.repeat(60));
  
  // Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Tileset manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const tiles = manifest.tiles || [];
  
  console.log(`📋 Loaded ${tiles.length} tile(s) from manifest`);
  
  if (tiles.length === 0) {
    console.log('⚠️  No tiles to generate');
    return;
  }
  
  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }
  
  // Generate tiles
  const index = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    tileSize: TILE_SIZE,
    tiles: []
  };
  
  let generated = 0;
  let skipped = 0;
  
  for (const tile of tiles) {
    const outputPath = join(OUTPUT_DIR, `${tile.id}.png`);
    
    // Skip if exists and not forcing
    if (!FORCE_REGENERATE && existsSync(outputPath)) {
      skipped++;
      index.tiles.push({
        id: tile.id,
        path: outputPath,
        category: tile.category,
        subcategory: tile.subcategory,
        placeholder: true
      });
      continue;
    }
    
    try {
      const buffer = await generatePlaceholderTile(tile);
      writeFileSync(outputPath, buffer);
      
      index.tiles.push({
        id: tile.id,
        path: outputPath,
        category: tile.category,
        subcategory: tile.subcategory,
        placeholder: true
      });
      
      generated++;
      
      if (generated % 50 === 0) {
        console.log(`  ✅ Generated ${generated} tiles...`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to generate ${tile.id}: ${error.message}`);
    }
  }
  
  // Write index file
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Generated ${generated} tile(s)`);
  if (skipped > 0) {
    console.log(`⏭️  Skipped ${skipped} existing tile(s) (use --force to regenerate)`);
  }
  console.log(`📝 Index written to: ${INDEX_PATH}`);
  console.log('\n💡 These are placeholder tiles with deterministic patterns.');
  console.log('   Replace them with final artwork when ready.');
  console.log('   Tile IDs are encoded in the pattern for easy identification.');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
