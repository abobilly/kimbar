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

async function findLayerAsset(layerType, variant, bodyType = 'male', color = null) {
  // Try various path patterns common in ULPC structure
  const patterns = [];
  
  if (layerType === 'body') {
    patterns.push(
      `body/bodies/${bodyType}/${variant}.png`,
      `body/${bodyType}/${variant}.png`,
      `body/${variant}.png`
    );
  } else if (layerType === 'eyes') {
    // Pattern: eyes/{type}/{bodyType}/{color}.png
    if (color) {
      patterns.push(
        `eyes/${variant}/${bodyType}/${color}.png`,
        `eyes/${variant}/adult/${color}.png`,
        `eyes/human/${bodyType}/${color}.png`,
        `eyes/human/adult/${color}.png`
      );
    }
    patterns.push(
      `eyes/${variant}/${bodyType}.png`,
      `eyes/${variant}/adult.png`,
      `eyes/human/${bodyType}.png`
    );
  } else if (layerType === 'hair') {
    // Pattern: hair/{style}/{bodyType}/{color}.png or hair/{style}/adult/{color}.png
    if (color) {
      patterns.push(
        `hair/${variant}/${bodyType}/${color}.png`,
        `hair/${variant}/adult/${color}.png`,
        `hair/${variant}/female/${color}.png`,
        `hair/${variant}/male/${color}.png`
      );
    }
    patterns.push(
      `hair/${variant}/${bodyType}.png`,
      `hair/${variant}/adult.png`,
      `hair/${variant}/male.png`,
      `hair/${variant}.png`
    );
  } else if (layerType === 'torso') {
    // Pattern: torso/clothes/{type}/{bodyType}/{color}.png or torso/clothes/{type}/formal/{bodyType}/{color}.png
    if (color) {
      patterns.push(
        `torso/clothes/${variant}/${bodyType}/${color}.png`,
        `torso/clothes/${variant}/formal/${bodyType}/${color}.png`,
        `torso/clothes/longsleeve/formal/${bodyType}/${color}.png`,
        `torso/clothes/${variant}/female/${color}.png`,
        `torso/clothes/${variant}/male/${color}.png`,
        `torso/${variant}/${bodyType}/${color}.png`
      );
    }
    patterns.push(
      `torso/clothes/${variant}/${bodyType}.png`,
      `torso/${variant}/${bodyType}.png`,
      `torso/${variant}/male.png`,
      `torso/${variant}.png`
    );
  } else if (layerType === 'legs') {
    // Pattern: legs/{type}/{style}/{bodyType}/{color}.png  
    if (color) {
      patterns.push(
        `legs/skirts/${variant}/${bodyType}/${color}.png`,
        `legs/pants/${variant}/${bodyType}/${color}.png`,
        `legs/${variant}/${bodyType}/${color}.png`,
        `legs/skirts/${variant}/female/${color}.png`,
        `legs/pants/${variant}/male/${color}.png`
      );
    }
    patterns.push(
      `legs/skirts/${variant}/${bodyType}.png`,
      `legs/pants/${variant}/${bodyType}.png`,
      `legs/${variant}/${bodyType}.png`,
      `legs/${variant}.png`
    );
  } else if (layerType === 'feet') {
    // Pattern: feet/{type}/{bodyType}/{color}.png
    if (color) {
      patterns.push(
        `feet/${variant}/${bodyType}/${color}.png`,
        `feet/shoes/${bodyType}/${color}.png`,
        `feet/boots/${bodyType}/${color}.png`
      );
    }
    patterns.push(
      `feet/${variant}/${bodyType}.png`,
      `feet/shoes/${bodyType}.png`,
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
    const missing = [];
    
    // Body layer (required)
    const bodyVariant = ulpcArgs.body || 'male';
    const skinVariant = ulpcArgs.skin || 'light';
    const bodyPath = await findLayerAsset('body', skinVariant, bodyVariant);
    if (bodyPath) {
      layers.push({ input: bodyPath, top: 0, left: 0 });
      info(`  + body: ${bodyPath}`);
    } else {
      missing.push(`body (${bodyVariant}/${skinVariant})`);
      warn(`  ✗ body layer not found for ${bodyVariant}/${skinVariant}`);
    }
    
    // Eyes layer (after body, before hair)
    if (ulpcArgs.eyes) {
      const eyesPath = await findLayerAsset('eyes', 'human', 'adult', ulpcArgs.eyes);
      if (eyesPath) {
        layers.push({ input: eyesPath, top: 0, left: 0 });
        info(`  + eyes: ${eyesPath}`);
      } else {
        missing.push(`eyes (${ulpcArgs.eyes})`);
        warn(`  ✗ eyes layer not found: human/adult/${ulpcArgs.eyes}`);
      }
    }
    
    // Hair layer
    if (ulpcArgs.hair) {
      const hairColor = ulpcArgs.hairColor || 'brown';
      const hairPath = await findLayerAsset('hair', ulpcArgs.hair, bodyVariant, hairColor);
      if (hairPath) {
        layers.push({ input: hairPath, top: 0, left: 0 });
        info(`  + hair: ${hairPath}`);
      } else {
        missing.push(`hair (${ulpcArgs.hair}/${hairColor})`);
        warn(`  ✗ hair layer not found: ${ulpcArgs.hair}/${bodyVariant}/${hairColor}`);
      }
    }
    
    // Torso layer
    if (ulpcArgs.torso) {
      const torsoColor = ulpcArgs.torsoColor || 'white';
      const torsoPath = await findLayerAsset('torso', ulpcArgs.torso, bodyVariant, torsoColor);
      if (torsoPath) {
        layers.push({ input: torsoPath, top: 0, left: 0 });
        info(`  + torso: ${torsoPath}`);
      } else {
        missing.push(`torso (${ulpcArgs.torso}/${torsoColor})`);
        warn(`  ✗ torso layer not found: ${ulpcArgs.torso}/${bodyVariant}/${torsoColor}`);
      }
    }
    
    // Legs layer
    if (ulpcArgs.legs) {
      const legsColor = ulpcArgs.legsColor || 'charcoal';
      const legsPath = await findLayerAsset('legs', ulpcArgs.legs, bodyVariant, legsColor);
      if (legsPath) {
        layers.push({ input: legsPath, top: 0, left: 0 });
        info(`  + legs: ${legsPath}`);
      } else {
        missing.push(`legs (${ulpcArgs.legs}/${legsColor})`);
        warn(`  ✗ legs layer not found: ${ulpcArgs.legs}/${bodyVariant}/${legsColor}`);
      }
    }
    
    // Feet layer
    if (ulpcArgs.feet) {
      const feetColor = ulpcArgs.feetColor || 'black';
      const feetPath = await findLayerAsset('feet', ulpcArgs.feet, bodyVariant, feetColor);
      if (feetPath) {
        layers.push({ input: feetPath, top: 0, left: 0 });
        info(`  + feet: ${feetPath}`);
      } else {
        missing.push(`feet (${ulpcArgs.feet}/${feetColor})`);
        warn(`  ✗ feet layer not found: ${ulpcArgs.feet}/${bodyVariant}/${feetColor}`);
      }
    }
    
    // Report missing layers
    if (missing.length > 0) {
      warn(`  ⚠ Missing ${missing.length} layer(s): ${missing.join(', ')}`);
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
    
    // Standard LPC sheet size (21 rows × 64px = 1344, 13 cols × 64px = 832)
    const STANDARD_WIDTH = 832;
    const STANDARD_HEIGHT = 1344;
    
    // Determine target size - use standard size if any layer matches it
    let targetWidth = STANDARD_WIDTH;
    let targetHeight = STANDARD_HEIGHT;
    
    // Get all layer metadata
    const layerMetas = await Promise.all(
      layers.map(async (layer) => ({
        ...layer,
        meta: await sharp(layer.input).metadata()
      }))
    );
    
    // Check if we have standard-sized layers
    const hasStandardSize = layerMetas.some(
      l => l.meta.width === STANDARD_WIDTH && l.meta.height === STANDARD_HEIGHT
    );
    
    if (hasStandardSize) {
      info(`  Using standard sheet size: ${STANDARD_WIDTH}×${STANDARD_HEIGHT}`);
    } else {
      // Fall back to first layer's size
      targetWidth = layerMetas[0].meta.width;
      targetHeight = layerMetas[0].meta.height;
      info(`  Using extended sheet size: ${targetWidth}×${targetHeight}`);
    }
    
    // Normalize all layers to target size
    const normalizedLayers = [];
    for (const layerData of layerMetas) {
      const { input, meta } = layerData;
      
      if (meta.width === targetWidth && meta.height === targetHeight) {
        // Already correct size
        normalizedLayers.push({ input, top: 0, left: 0 });
      } else if (meta.width === targetWidth && meta.height > targetHeight) {
        // Extended sheet - crop to standard size
        const cropped = await sharp(input)
          .extract({ left: 0, top: 0, width: targetWidth, height: targetHeight })
          .toBuffer();
        normalizedLayers.push({ input: cropped, top: 0, left: 0 });
        info(`  Cropped ${basename(input)} from ${meta.height} to ${targetHeight}px height`);
      } else if (meta.width === targetWidth && meta.height < targetHeight) {
        // Smaller sheet - extend with transparency
        const extended = await sharp(input)
          .extend({
            top: 0, bottom: targetHeight - meta.height, left: 0, right: 0,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toBuffer();
        normalizedLayers.push({ input: extended, top: 0, left: 0 });
        info(`  Extended ${basename(input)} from ${meta.height} to ${targetHeight}px height`);
      } else {
        warn(`  Skipping layer (width mismatch: ${meta.width}×${meta.height}): ${input}`);
      }
    }
    
    if (normalizedLayers.length === 0) {
      error(`  No compatible layers for ${charId}`);
      return { success: false, error: 'No compatible layers' };
    }
    
    info(`  Compositing ${normalizedLayers.length} layers...`);
    
    // Start with first layer as base
    let composite = sharp(normalizedLayers[0].input);
    
    // Composite remaining layers
    if (normalizedLayers.length > 1) {
      composite = composite.composite(normalizedLayers.slice(1));
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
