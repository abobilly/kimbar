#!/usr/bin/env node
/**
 * Generate Placeholder Tiles
 * 
 * Creates deterministic 32×32 PNG placeholders for all tiles defined in the tileset manifest.
 * Each placeholder is a transparent PNG with a subtle procedural pattern generated from
 * the tile ID as a seed, making it easy to identify as a placeholder while being
 * deterministically reproducible.
 * 
 * Usage:
 *   node scripts/generate-placeholder-tiles.mjs
 * 
 * Output:
 *   public/generated/tiles/{tile-id}.png (one per tile in manifest)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

// ============================================================================
// Configuration
// ============================================================================

const MANIFEST_PATH = './specs/ai_jobs/tileset_manifest.json';
const OUTPUT_DIR = './public/generated/tiles';
const TILE_SIZE = 32;

// ============================================================================
// Deterministic Random Number Generator
// ============================================================================

/**
 * Simple seeded PRNG for deterministic output.
 * Uses a variant of the mulberry32 algorithm.
 */
class SeededRandom {
  constructor(seed) {
    this.state = seed;
  }

  /**
   * Generate next random number [0, 1)
   */
  next() {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer [min, max]
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Generate a deterministic seed from a string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// Placeholder Generation
// ============================================================================

/**
 * Generate a deterministic procedural pattern for a placeholder tile.
 * Pattern is based on tile ID to ensure consistent output.
 * 
 * @param {string} tileId - Tile identifier (e.g., "tile.floor.marble.white_base")
 * @returns {Buffer} - Raw RGBA pixel data (32×32×4 bytes)
 */
function generatePlaceholderPattern(tileId) {
  const seed = hashString(tileId);
  const rng = new SeededRandom(seed);
  
  const width = TILE_SIZE;
  const height = TILE_SIZE;
  const pixels = Buffer.alloc(width * height * 4); // RGBA
  
  // Base: semi-transparent gray (almost transparent)
  const baseAlpha = 30; // Very subtle
  
  // Fill with transparent base
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 200;     // R
    pixels[i + 1] = 200; // G
    pixels[i + 2] = 200; // B
    pixels[i + 3] = baseAlpha; // A
  }
  
  // Generate deterministic pattern based on tile ID
  // Use a simple checkerboard/grid pattern that varies by tile
  const patternType = rng.nextInt(0, 3);
  const patternAlpha = 60; // Slightly more visible for pattern
  
  switch (patternType) {
    case 0: // Checkerboard
      {
        const gridSize = rng.nextInt(4, 8);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const checker = ((Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2) === 0;
            if (checker) {
              const idx = (y * width + x) * 4;
              pixels[idx + 3] = patternAlpha;
            }
          }
        }
      }
      break;
      
    case 1: // Diagonal lines
      {
        const spacing = rng.nextInt(3, 6);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if ((x + y) % spacing === 0) {
              const idx = (y * width + x) * 4;
              pixels[idx + 3] = patternAlpha;
            }
          }
        }
      }
      break;
      
    case 2: // Grid
      {
        const spacing = rng.nextInt(6, 12);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (x % spacing === 0 || y % spacing === 0) {
              const idx = (y * width + x) * 4;
              pixels[idx + 3] = patternAlpha;
            }
          }
        }
      }
      break;
      
    case 3: // Dots
      {
        const spacing = rng.nextInt(4, 8);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (x % spacing === spacing / 2 && y % spacing === spacing / 2) {
              const idx = (y * width + x) * 4;
              pixels[idx + 3] = patternAlpha;
            }
          }
        }
      }
      break;
  }
  
  // Add a subtle border marker (1px on edges) to clearly identify as placeholder
  for (let x = 0; x < width; x++) {
    // Top edge
    const topIdx = x * 4;
    pixels[topIdx] = 255;
    pixels[topIdx + 1] = 200;
    pixels[topIdx + 2] = 0;
    pixels[topIdx + 3] = 120; // Orange tint, semi-transparent
    
    // Bottom edge
    const bottomIdx = ((height - 1) * width + x) * 4;
    pixels[bottomIdx] = 255;
    pixels[bottomIdx + 1] = 200;
    pixels[bottomIdx + 2] = 0;
    pixels[bottomIdx + 3] = 120;
  }
  
  for (let y = 1; y < height - 1; y++) {
    // Left edge
    const leftIdx = (y * width) * 4;
    pixels[leftIdx] = 255;
    pixels[leftIdx + 1] = 200;
    pixels[leftIdx + 2] = 0;
    pixels[leftIdx + 3] = 120;
    
    // Right edge
    const rightIdx = (y * width + width - 1) * 4;
    pixels[rightIdx] = 255;
    pixels[rightIdx + 1] = 200;
    pixels[rightIdx + 2] = 0;
    pixels[rightIdx + 3] = 120;
  }
  
  return pixels;
}

/**
 * Generate and save a placeholder tile PNG.
 * 
 * @param {string} tileId - Tile identifier
 * @param {string} outputDir - Output directory path
 * @returns {Promise<void>}
 */
async function generatePlaceholderTile(tileId, outputDir) {
  const pattern = generatePlaceholderPattern(tileId);
  const outputPath = join(outputDir, `${tileId}.png`);
  
  try {
    await sharp(pattern, {
      raw: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 4
      }
    })
    .png({ compressionLevel: 9 }) // Maximum compression for small file size
    .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to save ${tileId}: ${error.message}`);
  }
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log('🎨 Placeholder Tile Generator\n');
  console.log('='.repeat(60));
  
  // Load manifest
  console.log('\n📋 Loading tileset manifest...');
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  
  const manifestData = readFileSync(MANIFEST_PATH, 'utf-8');
  const manifest = JSON.parse(manifestData);
  
  if (!manifest.tiles || !Array.isArray(manifest.tiles)) {
    console.error('❌ Manifest does not contain tiles array');
    process.exit(1);
  }
  
  console.log(`   Found ${manifest.tiles.length} tile definition(s)`);
  
  // Ensure output directory exists
  console.log(`\n📁 Creating output directory: ${OUTPUT_DIR}`);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Generate placeholders
  console.log('\n🎨 Generating placeholder tiles...\n');
  
  let generated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const tile of manifest.tiles) {
    const tileId = tile.id;
    const outputPath = join(OUTPUT_DIR, `${tileId}.png`);
    
    if (existsSync(outputPath)) {
      console.log(`   ⏭️  ${tileId} (already exists)`);
      skipped++;
      continue;
    }
    
    try {
      await generatePlaceholderTile(tileId, OUTPUT_DIR);
      console.log(`   ✅ ${tileId}`);
      generated++;
    } catch (error) {
      console.error(`   ❌ ${tileId}: ${error.message}`);
      errors++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Generation Summary:');
  console.log(`   ✅ Generated: ${generated}`);
  console.log(`   ⏭️  Skipped:   ${skipped}`);
  if (errors > 0) {
    console.log(`   ❌ Errors:    ${errors}`);
  }
  console.log(`   📦 Total:     ${manifest.tiles.length}`);
  
  if (errors > 0) {
    console.error('\n❌ Generation completed with errors');
    process.exit(1);
  }
  
  console.log('\n✅ All placeholder tiles generated successfully!');
  console.log(`\n💡 Tip: Run 'npm run validate' to verify zero missing tiles`);
}

// Run main
main().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
