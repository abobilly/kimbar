#!/usr/bin/env node
/**
 * generate-sprites.mjs - Generate character sprites by compositing LPC layers
 * 
 * This script reads CharacterSpec JSON files and composites sprite sheets
 * from the ULPC layer assets using a glob-indexed lookup for reliability.
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
import { join, basename, relative } from 'path';

// Try to load sharp, provide helpful error if missing
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ sharp not installed. Run: npm install sharp');
  process.exit(1);
}

const ULPC_DIR = './vendor/lpc/Universal-LPC-Spritesheet-Character-Generator';
const ULPC_SPRITESHEETS = join(ULPC_DIR, 'spritesheets');
const CHAR_DIR = './content/characters';
const OUTPUT_DIR = './generated/sprites';
const PORTRAITS_DIR = './generated/portraits';

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

// ============================================================================
// GLOB-INDEXED LAYER LOOKUP
// ============================================================================

let _ulpcIndex = null;

async function scanDirectory(dir, files = []) {
  if (!existsSync(dir)) return files;
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function buildUlpcIndex() {
  info('Building ULPC layer index...');
  
  const allPngs = await scanDirectory(ULPC_SPRITESHEETS);
  
  const byBase = new Map();  // basename -> [absPath...]
  const byRel = new Map();   // relpath(lower) -> absPath

  for (const absPath of allPngs) {
    // Relative path from spritesheets root
    const rel = relative(ULPC_SPRITESHEETS, absPath).replace(/\\/g, '/');
    byRel.set(rel.toLowerCase(), absPath);
    
    const base = basename(absPath).toLowerCase();
    const arr = byBase.get(base) ?? [];
    arr.push(absPath);
    byBase.set(base, arr);
  }
  
  info(`  Indexed ${allPngs.length} PNG files`);
  return { byBase, byRel };
}

async function getUlpcIndex() {
  if (!_ulpcIndex) {
    _ulpcIndex = await buildUlpcIndex();
  }
  return _ulpcIndex;
}

/**
 * Resolve a layer reference to an absolute path.
 * 
 * @param {string} ref - Layer reference (can be basename like "light.png" or 
 *                       relative path like "body/bodies/male/light.png")
 * @returns {string} Absolute path to the layer PNG
 * @throws {Error} If layer not found or ambiguous
 */
async function resolveUlpcLayer(ref) {
  const { byBase, byRel } = await getUlpcIndex();
  
  const norm = ref.replace(/\\/g, '/').toLowerCase();
  
  // Prefer explicit relative paths if provided
  if (norm.includes('/')) {
    const hit = byRel.get(norm);
    if (hit) return hit;
    
    // Try without leading path segments
    for (const [key, val] of byRel) {
      if (key.endsWith(norm)) return val;
    }
  }
  
  // Fall back to basename lookup
  const base = basename(norm).toLowerCase();
  const hits = byBase.get(base);
  
  if (!hits || hits.length === 0) {
    throw new Error(`ULPC layer not found: ${ref}`);
  }
  
  // If ambiguous, throw with candidates (require disambiguation)
  if (hits.length > 1) {
    const candidates = hits.map(h => relative(ULPC_DIR, h)).join('\n  - ');
    throw new Error(
      `ULPC layer '${ref}' is ambiguous (${hits.length} matches). ` +
      `Specify full path:\n  - ${candidates}`
    );
  }
  
  return hits[0];
}

// ============================================================================
// LAYER RESOLUTION BY TYPE
// ============================================================================

async function findLayerAsset(layerType, variant, bodyType = 'male') {
  // Try various path patterns common in ULPC structure
  const patterns = [];
  
  if (layerType === 'body') {
    patterns.push(
      `body/bodies/${bodyType}/${variant}.png`,
      `body/${bodyType}/${variant}.png`,
      `body/${variant}.png`
    );
  } else if (layerType === 'hair') {
    patterns.push(
      `hair/${variant}/${bodyType}.png`,
      `hair/${variant}/male.png`,
      `hair/${variant}.png`
    );
  } else if (layerType === 'torso') {
    patterns.push(
      `torso/shirts/${variant}/${bodyType}.png`,
      `torso/${variant}/${bodyType}.png`,
      `torso/${variant}/male.png`,
      `torso/${variant}.png`
    );
  } else if (layerType === 'legs') {
    patterns.push(
      `legs/pants/${variant}/${bodyType}.png`,
      `legs/${variant}/${bodyType}.png`,
      `legs/${variant}.png`
    );
  } else if (layerType === 'feet') {
    patterns.push(
      `feet/shoes/${variant}/${bodyType}.png`,
      `feet/${variant}/${bodyType}.png`,
      `feet/${variant}.png`
    );
  } else {
    patterns.push(
      `${layerType}/${variant}/${bodyType}.png`,
      `${layerType}/${variant}.png`
    );
  }
  
  // Try each pattern
  for (const pattern of patterns) {
    try {
      return await resolveUlpcLayer(pattern);
    } catch {
      // Try next pattern
    }
  }
  
  // Last resort: try just the variant name as a basename
  try {
    return await resolveUlpcLayer(`${variant}.png`);
  } catch {
    return null;
  }
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
    
    // Generate portrait (crop frame 0,0 at 64×64)
    // TODO: Add portraitFrame and portraitCrop fields to CharacterSpec for customization
    await mkdir(PORTRAITS_DIR, { recursive: true });
    const portraitPath = join(PORTRAITS_DIR, `${charId}.png`);
    
    await sharp(outputPath)
      .extract({ left: 0, top: 0, width: 64, height: 64 })
      .png()
      .toFile(portraitPath);
    
    info(`  ✅ Portrait: ${portraitPath}`);
    
    return { success: true, path: outputPath, portraitPath };
    
  } catch (e) {
    error(`  Failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🎨 LPC Sprite Generator for Kim Bar\n');
  console.log('=' .repeat(50));
  
  // Check ULPC is available
  if (!existsSync(ULPC_SPRITESHEETS)) {
    error(`ULPC spritesheets not found at ${ULPC_SPRITESHEETS}`);
    console.log('\nRun: npm run fetch-vendor');
    process.exit(1);
  }
  info(`ULPC found at ${ULPC_DIR}`);
  
  // Check for sharp
  info('sharp library loaded');
  
  // Build the layer index once
  await getUlpcIndex();
  
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
