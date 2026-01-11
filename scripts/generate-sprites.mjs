#!/usr/bin/env node
/**
 * generate-sprites.mjs - Generate character sprites by compositing LPC layers
 * 
 * This script reads CharacterSpec JSON files and composites sprite sheets
 * from the ULPC layer assets.
 * 
 * Usage:
 *   node scripts/generate-sprites.mjs [character_id]
 *   npm run gen:sprites -- npc.clerk_01
 * 
 * If no character_id provided, generates ALL character specs.
 * 
 * Requirements:
 *   - sharp (npm install sharp)
 *   - ULPC cloned to vendor/lpc/Universal-LPC-Spritesheet-Character-Generator
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';

// Try to load sharp, provide helpful error if missing
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ sharp not installed. Run: npm install sharp');
  process.exit(1);
}

const ULPC_DIR = './vendor/lpc/Universal-LPC-Spritesheet-Character-Generator';
const CHAR_DIR = './content/characters';
const OUTPUT_DIR = './generated/sprites';

// LPC layer mapping (simplified for v1)
const LAYER_PATHS = {
  body: 'spritesheets/body',
  hair: 'spritesheets/hair',
  torso: 'spritesheets/torso',
  legs: 'spritesheets/legs',
  feet: 'spritesheets/feet',
  accessories: 'spritesheets/accessories'
};

// Standard LPC sheet dimensions (will detect from first layer)
const DEFAULT_SHEET_WIDTH = 832;  // 13 columns × 64px
const DEFAULT_SHEET_HEIGHT = 2944; // 46 rows × 64px (extended format)

function info(msg) { console.log(`[INFO] ${msg}`); }
function warn(msg) { console.log(`[WARN] ${msg}`); }
function error(msg) { console.error(`[ERROR] ${msg}`); }

async function loadJson(path) {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

async function findLayerAsset(layerType, variant, bodyType = 'male') {
  const basePath = join(ULPC_DIR, 'spritesheets');
  
  // Different search paths based on layer type
  const searchPaths = [];
  
  if (layerType === 'body') {
    // Body layers: spritesheets/body/bodies/{bodyType}/{skin}.png
    searchPaths.push(
      join(basePath, 'body', 'bodies', bodyType, `${variant}.png`),
      join(basePath, 'body', 'bodies', `${bodyType}.png`)
    );
  } else if (layerType === 'hair') {
    // Hair: spritesheets/hair/{style}/{variant}.png
    searchPaths.push(
      join(basePath, 'hair', variant, `${bodyType}.png`),
      join(basePath, 'hair', `${variant}.png`)
    );
  } else if (layerType === 'torso') {
    // Torso: spritesheets/torso/shirts or similar
    searchPaths.push(
      join(basePath, 'torso', 'shirts', variant, `${bodyType}.png`),
      join(basePath, 'torso', variant, `${bodyType}.png`),
      join(basePath, 'torso', `${variant}.png`)
    );
  } else if (layerType === 'legs') {
    searchPaths.push(
      join(basePath, 'legs', 'pants', variant, `${bodyType}.png`),
      join(basePath, 'legs', variant, `${bodyType}.png`),
      join(basePath, 'legs', `${variant}.png`)
    );
  } else if (layerType === 'feet') {
    searchPaths.push(
      join(basePath, 'feet', 'shoes', variant, `${bodyType}.png`),
      join(basePath, 'feet', variant, `${bodyType}.png`),
      join(basePath, 'feet', `${variant}.png`)
    );
  } else {
    searchPaths.push(
      join(basePath, layerType, variant, `${bodyType}.png`),
      join(basePath, layerType, `${variant}.png`)
    );
  }
  
  for (const candidate of searchPaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  return null;
}

async function generateCharacter(specFile) {
  const charId = basename(specFile, '.json');
  info(`Generating sprite for: ${charId}`);
  
  try {
    const spec = await loadJson(specFile);
    const ulpcArgs = spec.ulpcArgs || {};
    
    const layers = [];
    
    // Body layer
    const bodyVariant = ulpcArgs.body || 'male';
    const skinVariant = ulpcArgs.skin || 'light';
    const bodyPath = await findLayerAsset('body', skinVariant, bodyVariant);
    if (bodyPath) {
      layers.push({ input: bodyPath, top: 0, left: 0 });
      info(`  + body: ${bodyPath}`);
    } else {
      warn(`  - body layer not found for ${bodyVariant}/${skinVariant}`);
    }
    
    // Hair layer
    if (ulpcArgs.hair) {
      const hairPath = await findLayerAsset('hair', ulpcArgs.hair, bodyVariant);
      if (hairPath) {
        layers.push({ input: hairPath, top: 0, left: 0 });
        info(`  + hair: ${hairPath}`);
      }
    }
    
    // Torso layer
    if (ulpcArgs.torso) {
      const torsoPath = await findLayerAsset('torso', ulpcArgs.torso, bodyVariant);
      if (torsoPath) {
        layers.push({ input: torsoPath, top: 0, left: 0 });
        info(`  + torso: ${torsoPath}`);
      }
    }
    
    // Legs layer
    if (ulpcArgs.legs) {
      const legsPath = await findLayerAsset('legs', ulpcArgs.legs, bodyVariant);
      if (legsPath) {
        layers.push({ input: legsPath, top: 0, left: 0 });
        info(`  + legs: ${legsPath}`);
      }
    }
    
    // Feet layer
    if (ulpcArgs.feet) {
      const feetPath = await findLayerAsset('feet', ulpcArgs.feet, bodyVariant);
      if (feetPath) {
        layers.push({ input: feetPath, top: 0, left: 0 });
        info(`  + feet: ${feetPath}`);
      }
    }
    
    if (layers.length === 0) {
      // No layers found - create a placeholder
      warn(`  No layers found for ${charId}, creating placeholder`);
      
      const placeholder = sharp({
        create: {
          width: 64,
          height: 64,
          channels: 4,
          background: { r: 255, g: 0, b: 255, alpha: 255 }
        }
      });
      
      await mkdir(OUTPUT_DIR, { recursive: true });
      const outputPath = join(OUTPUT_DIR, `${charId}_placeholder.png`);
      await placeholder.png().toFile(outputPath);
      info(`  Created placeholder: ${outputPath}`);
      return { success: true, placeholder: true, path: outputPath };
    }
    
    // Get dimensions from first layer
    const firstLayerMeta = await sharp(layers[0].input).metadata();
    const sheetWidth = firstLayerMeta.width || DEFAULT_SHEET_WIDTH;
    const sheetHeight = firstLayerMeta.height || DEFAULT_SHEET_HEIGHT;
    info(`  Sheet size: ${sheetWidth}×${sheetHeight}`);
    
    // Composite all layers (filter to matching sizes)
    const compatibleLayers = [];
    for (const layer of layers) {
      const meta = await sharp(layer.input).metadata();
      if (meta.width === sheetWidth && meta.height === sheetHeight) {
        compatibleLayers.push(layer);
      } else {
        warn(`  Skipping layer (size mismatch: ${meta.width}×${meta.height}): ${layer.input}`);
      }
    }
    
    if (compatibleLayers.length === 0) {
      error(`  No compatible layers for ${charId}`);
      return { success: false, error: 'No compatible layers' };
    }
    
    // Start with first layer as base
    let composite = sharp(compatibleLayers[0].input);
    
    // Composite remaining layers
    if (compatibleLayers.length > 1) {
      composite = composite.composite(compatibleLayers.slice(1));
    }
    
    await mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = join(OUTPUT_DIR, `${charId}.png`);
    await composite.png().toFile(outputPath);
    
    info(`  ✅ Generated: ${outputPath}`);
    return { success: true, path: outputPath };
    
  } catch (e) {
    error(`  Failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🎨 LPC Sprite Generator for Kim Bar\n');
  console.log('=' .repeat(50));
  
  // Check ULPC is available
  if (!existsSync(ULPC_DIR)) {
    error(`ULPC not found at ${ULPC_DIR}`);
    console.log('\nRun: npm run fetch-vendor');
    process.exit(1);
  }
  info(`ULPC found at ${ULPC_DIR}`);
  
  // Check for sharp
  info('sharp library loaded');
  
  const target = process.argv[2];
  let success = 0;
  let failed = 0;
  let placeholders = 0;
  
  if (target) {
    // Generate specific character
    const specFile = join(CHAR_DIR, `${target}.json`);
    if (!existsSync(specFile)) {
      error(`Character spec not found: ${specFile}`);
      process.exit(1);
    }
    
    const result = await generateCharacter(specFile);
    if (result.success) {
      success++;
      if (result.placeholder) placeholders++;
    } else {
      failed++;
    }
  } else {
    // Generate all characters
    info('Generating all character sprites...\n');
    
    if (!existsSync(CHAR_DIR)) {
      error(`No characters directory: ${CHAR_DIR}`);
      process.exit(1);
    }
    
    const files = await readdir(CHAR_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const result = await generateCharacter(join(CHAR_DIR, file));
      if (result.success) {
        success++;
        if (result.placeholder) placeholders++;
      } else {
        failed++;
      }
      console.log('');
    }
  }
  
  console.log('=' .repeat(50));
  info(`Generation complete: ${success} succeeded (${placeholders} placeholders), ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
