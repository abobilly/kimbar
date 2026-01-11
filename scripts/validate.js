#!/usr/bin/env node
/**
 * Validate - Checks all content files against schemas, contract, and cross-references
 * 
 * Usage: node scripts/validate.js
 * 
 * Output sections:
 *   - Hard Errors: Must fix before commit (schema violations, missing IDs, etc.)
 *   - Policy Skips: Informational (e.g., mpt-* cards excluded from game deck)
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';

const SCHEMA_DIR = './schemas';
const CONTENT_DIRS = {
  characters: './content/characters',
  rooms: './content/rooms',
  dialogue: './content/dialogue'
};
const REGISTRY_PATH = './public/content/registry.json';
const FLASHCARDS_PATH = './public/content/cards/flashcards.json';
const INK_DIR = './public/content/ink';
const CONTRACT_PATH = './content/content_contract.json';

let hardErrors = [];
let policySkips = [];
let warnings = [];

function error(msg) {
  hardErrors.push(`❌ ${msg}`);
}

function skip(msg) {
  policySkips.push(`⏭️ ${msg}`);
}

function warn(msg) {
  warnings.push(`⚠️ ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

async function loadJson(path) {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

async function loadContract() {
  if (!existsSync(CONTRACT_PATH)) {
    warn('No content_contract.json found - using defaults');
    return null;
  }
  
  try {
    const contract = await loadJson(CONTRACT_PATH);
    ok(`Loaded contract v${contract.version}`);
    return contract;
  } catch (e) {
    error(`Failed to load content_contract.json: ${e.message}`);
    return null;
  }
}

async function loadSchemas() {
  const ajv = new Ajv({ allErrors: true });
  const schemas = {};
  
  if (!existsSync(SCHEMA_DIR)) {
    warn('No schemas directory found');
    return { ajv, schemas };
  }
  
  const files = await readdir(SCHEMA_DIR);
  for (const file of files) {
    if (!file.endsWith('.schema.json')) continue;
    
    try {
      const schema = await loadJson(join(SCHEMA_DIR, file));
      const name = file.replace('.schema.json', '');
      schemas[name] = ajv.compile(schema);
      console.log(`  📋 Loaded schema: ${name}`);
    } catch (e) {
      error(`Failed to load schema ${file}: ${e.message}`);
    }
  }
  
  return { ajv, schemas };
}

async function validateContract(schemas, contract) {
  console.log('\n📜 Validating Content Contract...');
  
  if (!contract) {
    warn('No contract to validate');
    return;
  }
  
  if (schemas.content_contract) {
    const valid = schemas.content_contract(contract);
    if (!valid) {
      for (const err of schemas.content_contract.errors) {
        error(`Contract ${err.instancePath}: ${err.message}`);
      }
    } else {
      ok('Contract schema valid');
    }
  }
}

async function validateRegistry(schemas, contract) {
  console.log('\n📚 Validating Registry...');
  
  if (!existsSync(REGISTRY_PATH)) {
    error('registry.json not found');
    return null;
  }
  
  try {
    const registry = await loadJson(REGISTRY_PATH);
    
    // Schema validation
    if (schemas.AssetRegistry) {
      const valid = schemas.AssetRegistry(registry);
      if (!valid) {
        for (const err of schemas.AssetRegistry.errors) {
          error(`Registry ${err.instancePath}: ${err.message}`);
        }
      } else {
        ok('Schema valid');
      }
    }
    
    // Check outfit IDs match keys
    for (const [key, outfit] of Object.entries(registry.outfits || {})) {
      if (outfit.id !== key) {
        error(`Outfit '${key}' has mismatched id: '${outfit.id}'`);
      }
    }
    ok(`${Object.keys(registry.outfits || {}).length} outfits defined`);
    
    // Check tags structure
    if (registry.tags?.subjects) {
      ok(`${registry.tags.subjects.length} subjects defined`);
    } else if (registry.deckTags) {
      warn('Registry uses deprecated deckTags - migrate to tags.subjects');
    }
    
    return registry;
  } catch (e) {
    error(`Failed to parse registry: ${e.message}`);
    return null;
  }
}

async function validateFlashcards(registry, contract) {
  console.log('\n📇 Validating Flashcards...');
  
  if (!existsSync(FLASHCARDS_PATH)) {
    warn('flashcards.json not found (using sample cards)');
    return [];
  }
  
  try {
    const data = await loadJson(FLASHCARDS_PATH);
    
    // Handle both array format and object with 'cards' array
    const cards = Array.isArray(data) ? data : (data.cards || null);
    
    if (!Array.isArray(cards)) {
      error('flashcards.json must be an array or object with "cards" array');
      return [];
    }
    
    // Get policy skip prefixes from contract
    const skipPrefixes = contract?.policySkips?.flashcards?.skipIdPrefixes || [];
    const skipReason = contract?.policySkips?.flashcards?.reason || 'Policy skip';
    
    // Get valid subjects from registry (new format) or fallback to deckTags
    const validSubjects = new Set(
      registry?.tags?.subjects || 
      registry?.deckTags || 
      []
    );
    
    let skippedCount = 0;
    let validatedCount = 0;
    const foundTags = new Set();
    
    for (const card of cards) {
      // Policy skip check
      const shouldSkip = skipPrefixes.some(prefix => card.id?.startsWith(prefix));
      if (shouldSkip) {
        skippedCount++;
        continue;
      }
      
      validatedCount++;
      
      // Required field checks
      if (!card.id) {
        error(`Card missing id: ${JSON.stringify(card).slice(0, 50)}`);
      }
      
      // Accept either enhanced format (frontPrompt) or basic format (front)
      if (!card.frontPrompt && !card.front) {
        error(`Card ${card.id} missing frontPrompt or front`);
      }
      
      // Tag validation (use subject field or normalized tags)
      const cardSubject = card.subject?.toLowerCase().replace(/\s+/g, '_');
      if (cardSubject) {
        foundTags.add(cardSubject);
      }
      
      for (const tag of card.tagsNormalized || card.tags?.map(t => t.toLowerCase()) || []) {
        foundTags.add(tag);
      }
    }
    
    ok(`${validatedCount} flashcards validated`);
    
    if (skippedCount > 0) {
      skip(`${skippedCount} cards skipped (${skipReason})`);
    }
    
    // Report subject coverage
    const subjectsFound = [...foundTags].filter(t => validSubjects.has(t));
    ok(`Subjects covered: ${subjectsFound.length}/${validSubjects.size}`);
    
    return cards;
  } catch (e) {
    error(`Failed to parse flashcards: ${e.message}`);
    return [];
  }
}

async function validateCharacterSpecs(schemas, contract) {
  console.log('\n🎭 Validating Character Specs...');
  
  if (!existsSync(CONTENT_DIRS.characters)) {
    warn('No character specs directory');
    return;
  }
  
  const files = await readdir(CONTENT_DIRS.characters);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    warn('No character specs found');
    return;
  }
  
  // Get naming pattern from contract
  const npcPattern = contract?.naming?.patterns?.npc;
  const charPattern = contract?.naming?.patterns?.character;
  const maxFrameSize = contract?.characters?.maxFrameSize || 64;
  const strictFrameSize = contract?.characters?.strictFrameSize ?? true;
  
  for (const file of jsonFiles) {
    try {
      const spec = await loadJson(join(CONTENT_DIRS.characters, file));
      
      // Schema validation
      if (schemas.CharacterSpec) {
        const valid = schemas.CharacterSpec(spec);
        if (!valid) {
          for (const err of schemas.CharacterSpec.errors) {
            error(`${file} ${err.instancePath}: ${err.message}`);
          }
        } else {
          ok(`${file}: schema valid`);
        }
      }
      
      // ID naming pattern validation (try both npc and character patterns)
      if (spec.id) {
        let matchesPattern = false;
        
        if (npcPattern && new RegExp(npcPattern).test(spec.id)) {
          matchesPattern = true;
        } else if (charPattern && new RegExp(charPattern).test(spec.id)) {
          matchesPattern = true;
        }
        
        if (!matchesPattern && (npcPattern || charPattern)) {
          warn(`${file}: id '${spec.id}' doesn't match pattern ^(npc|char)\\.[a-z0-9_]+$`);
        }
      }
      
      // Frame size validation (v1: no oversize sprites)
      if (strictFrameSize && spec.frameWidth && spec.frameWidth > maxFrameSize) {
        error(`${file}: frameWidth ${spec.frameWidth} exceeds max ${maxFrameSize}px (no oversize sprites in v1)`);
      }
      if (strictFrameSize && spec.frameHeight && spec.frameHeight > maxFrameSize) {
        error(`${file}: frameHeight ${spec.frameHeight} exceeds max ${maxFrameSize}px (no oversize sprites in v1)`);
      }
    } catch (e) {
      error(`Failed to parse ${file}: ${e.message}`);
    }
  }
}

async function validateRoomSpecs(schemas, registry, contract) {
  console.log('\n🏛️ Validating Room Specs...');
  
  if (!existsSync(CONTENT_DIRS.rooms)) {
    warn('No room specs directory');
    return;
  }
  
  const files = await readdir(CONTENT_DIRS.rooms);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    warn('No room specs found');
    return;
  }
  
  const validOutfits = new Set(Object.keys(registry?.outfits || {}));
  const validSubjects = new Set(registry?.tags?.subjects || registry?.deckTags || []);
  
  for (const file of jsonFiles) {
    try {
      const spec = await loadJson(join(CONTENT_DIRS.rooms, file));
      
      // Schema validation
      if (schemas.RoomSpec) {
        const valid = schemas.RoomSpec(spec);
        if (!valid) {
          for (const err of schemas.RoomSpec.errors) {
            error(`${file} ${err.instancePath}: ${err.message}`);
          }
        } else {
          ok(`${file}: schema valid`);
        }
      }
      
      // Cross-reference validation
      for (const entity of spec.entities || []) {
        const props = entity.properties || {};
        
        // Check outfit references
        if (props.outfitId && !validOutfits.has(props.outfitId)) {
          error(`${file}: entity references unknown outfit '${props.outfitId}'`);
        }
        if (props.rewardId && !validOutfits.has(props.rewardId)) {
          error(`${file}: entity references unknown reward outfit '${props.rewardId}'`);
        }
        
        // Check deck tag references against subjects
        if (props.deckTag && !validSubjects.has(props.deckTag)) {
          warn(`${file}: entity references unknown subject '${props.deckTag}'`);
        }
      }
    } catch (e) {
      error(`Failed to parse ${file}: ${e.message}`);
    }
  }
}

async function validateInkKnots(registry) {
  console.log('\n📜 Validating Ink Story References...');
  
  // Load all compiled ink stories
  const storyKnots = new Set();
  
  if (existsSync(INK_DIR)) {
    const files = await readdir(INK_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const story = await loadJson(join(INK_DIR, file));
        // Extract knot names from ink JSON
        if (story.root) {
          for (const key of Object.keys(story)) {
            if (key !== 'root' && key !== 'inkVersion' && key !== 'listDefs') {
              storyKnots.add(key);
            }
          }
        }
      } catch (e) {
        warn(`Failed to parse ink story ${file}`);
      }
    }
  }
  
  ok(`Found ${storyKnots.size} story knots`);
  
  // Check room specs reference valid knots
  if (existsSync(CONTENT_DIRS.rooms)) {
    const files = await readdir(CONTENT_DIRS.rooms);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const spec = await loadJson(join(CONTENT_DIRS.rooms, file));
        for (const entity of spec.entities || []) {
          const inkKnot = entity.properties?.inkKnot;
          if (inkKnot && storyKnots.size > 0 && !storyKnots.has(inkKnot)) {
            warn(`${file}: entity references unknown inkKnot '${inkKnot}'`);
          }
        }
      } catch (e) {
        // Already reported in room validation
      }
    }
  }
}

async function validateLpcStyleGuide(contract) {
  console.log('\n🎨 Checking LPC Style Guide...');
  
  const style = contract?.style?.lpc;
  if (!style) {
    warn('[LPC] No style.lpc block in contract - using defaults');
    return;
  }
  
  // Log what we're checking
  const checks = [];
  
  // Grid checks (HARD - enforced)
  const tileSize = contract?.tiles?.tileSize || 32;
  const subTileSize = contract?.tiles?.subTileSize || 16;
  if (tileSize !== 32) {
    error(`[LPC] Tile size must be 32px (found: ${tileSize})`);
  } else {
    checks.push(`Grid: ${tileSize}×${tileSize} tiles, ${subTileSize}×${subTileSize} subtiles`);
  }
  
  // Frame size (HARD - already enforced in character validation)
  const frameSize = contract?.characters?.frameWidth || 64;
  checks.push(`Frame size: ${frameSize}×${frameSize} (enforced)`);
  
  // Style guidance (informational)
  if (style.render) {
    checks.push(`Perspective: ${style.render.cameraAngleDeg}° ${style.render.projection}`);
  }
  
  if (style.shadows?.dropShadow) {
    checks.push(`Drop shadow: ${style.shadows.dropShadow.hex} @ ${style.shadows.dropShadow.opacity * 100}%`);
  }
  
  if (style.pixel?.dithering) {
    checks.push(`Dithering: ${style.pixel.dithering}`);
  }
  
  if (style.outlines) {
    checks.push(`Outlines: tiles/props=${style.outlines.tilesAndProps}, chars=${style.outlines.characters}`);
  }
  
  // Character bounding boxes (guidance)
  const boundingBoxes = contract?.characters?.boundingBoxes;
  if (boundingBoxes) {
    checks.push(`Char bounding: base ${boundingBoxes.base.w}×${boundingBoxes.base.h}, clothing ${boundingBoxes.clothing.w}×${boundingBoxes.clothing.h}`);
  }
  
  // Sheet row order
  const rowOrder = contract?.characters?.sheetRowOrder;
  if (rowOrder) {
    checks.push(`Row order: ${rowOrder.join(' → ')}`);
  }
  
  ok(`LPC v1.1.0 style loaded`);
  checks.forEach(c => console.log(`    📐 ${c}`));
}

async function main() {
  console.log('🔍 Kim Bar Content Validator\n');
  console.log('=' .repeat(50));
  
  // Load contract and schemas
  console.log('\n📜 Loading Content Contract...');
  const contract = await loadContract();
  
  console.log('\n📋 Loading Schemas...');
  const { schemas } = await loadSchemas();
  
  // Validate contract against its own schema
  await validateContract(schemas, contract);
  
  // Validate each content type
  const registry = await validateRegistry(schemas, contract);
  await validateFlashcards(registry, contract);
  await validateCharacterSpecs(schemas, contract);
  await validateRoomSpecs(schemas, registry, contract);
  await validateInkKnots(registry);
  await validateLpcStyleGuide(contract);
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 Validation Summary:\n');
  
  // Policy skips (informational)
  if (policySkips.length > 0) {
    console.log('Policy Skips (informational):');
    policySkips.forEach(s => console.log(`  ${s}`));
    console.log('');
  }
  
  // LPC style guide (guidance)
  const styleWarnings = warnings.filter(w => w.includes('[LPC]'));
  if (styleWarnings.length > 0) {
    console.log('LPC Style Guidance:');
    styleWarnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }
  
  // Other warnings
  const otherWarnings = warnings.filter(w => !w.includes('[LPC]'));
  if (otherWarnings.length > 0) {
    console.log('Warnings:');
    otherWarnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }
  
  // Hard errors
  if (hardErrors.length > 0) {
    console.log('Hard Errors (must fix):');
    hardErrors.forEach(e => console.log(`  ${e}`));
    console.log('');
    console.log(`❌ Validation failed with ${hardErrors.length} error(s)`);
    process.exit(1);
  } else {
    console.log('✅ All validations passed!');
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
