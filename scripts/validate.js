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
// Validate against the generated registry (single source of truth)
const REGISTRY_PATH = './generated/registry.json';
const FLASHCARDS_DIR = './public/content/cards';
// Ink is now generated - check both locations
const INK_GENERATED_DIR = './generated/ink';
const INK_PUBLIC_DIR = './public/generated/ink';
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
    error('registry.json not found - run npm run prepare:content first');
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

    // Check rooms array
    if (registry.rooms) {
      ok(`${registry.rooms.length} rooms registered`);
    }

    // Check flashcardPacks array
    if (registry.flashcardPacks) {
      ok(`${registry.flashcardPacks.length} flashcard packs registered`);
    }

    // Check ink array
    if (registry.ink) {
      ok(`${registry.ink.length} ink stories registered`);
    }

    return registry;
  } catch (e) {
    error(`Failed to parse registry: ${e.message}`);
    return null;
  }
}

async function validateFlashcardPacks(schemas, registry, contract) {
  console.log('\n📇 Validating Flashcard Packs...');

  if (!registry?.flashcardPacks || registry.flashcardPacks.length === 0) {
    warn('No flashcard packs registered in registry');
    return;
  }

  // Get policy skip prefixes from contract
  const skipPrefixes = contract?.policySkips?.flashcards?.skipIdPrefixes || [];
  const skipReason = contract?.policySkips?.flashcards?.reason || 'Policy skip';

  // Get valid subjects from registry
  const validSubjects = new Set(registry?.tags?.subjects || []);

  for (const pack of registry.flashcardPacks) {
    console.log(`  Validating pack: ${pack.id}`);

    // Validate registry entry against schema
    if (schemas.FlashcardPack) {
      const packValid = schemas.FlashcardPack(pack);
      if (!packValid) {
        for (const err of schemas.FlashcardPack.errors) {
          error(`Flashcard pack ${pack.id} registry entry invalid: ${err.instancePath} ${err.message}`);
        }
        continue;
      }
    }

    // Check file exists
    const filePath = join('public', pack.url);
    if (!existsSync(filePath)) {
      error(`Flashcard pack ${pack.id}: file not found at ${filePath}`);
      continue;
    }

    // Load and validate file
    try {
      const fileContent = await loadJson(filePath);

      // Handle both array format and object with 'cards' array
      const cards = Array.isArray(fileContent) ? fileContent : (fileContent.cards || []);

      if (!Array.isArray(cards)) {
        error(`Flashcard pack ${pack.id}: file must have "cards" array`);
        continue;
      }

      // For large files, validate structure + sample
      const isLargeFile = cards.length > 1000;

      if (schemas.FlashcardsFile) {
        if (isLargeFile) {
          // Fast validation: top-level + first 10 cards
          const sampleFile = {
            ...fileContent,
            cards: cards.slice(0, 10)
          };
          const sampleValid = schemas.FlashcardsFile(sampleFile);
          if (!sampleValid) {
            for (const err of schemas.FlashcardsFile.errors) {
              error(`Flashcard pack ${pack.id} file invalid: ${err.instancePath} ${err.message}`);
            }
          }
        } else {
          // Full validation
          const fileValid = schemas.FlashcardsFile(fileContent);
          if (!fileValid) {
            for (const err of schemas.FlashcardsFile.errors) {
              error(`Flashcard pack ${pack.id} file invalid: ${err.instancePath} ${err.message}`);
            }
          }
        }
      }

      // Business logic: count matches
      if (pack.count !== undefined && pack.count !== cards.length) {
        error(`Flashcard pack ${pack.id}: count mismatch. Registry: ${pack.count}, Actual: ${cards.length}`);
      }

      // Business logic: unique IDs
      const ids = new Set();
      const duplicates = [];
      let skippedCount = 0;
      let validatedCount = 0;

      for (const card of cards) {
        // Policy skip check
        const shouldSkip = skipPrefixes.some(prefix => card.id?.startsWith(prefix));
        if (shouldSkip) {
          skippedCount++;
          continue;
        }

        validatedCount++;

        if (!card.id) {
          error(`Flashcard pack ${pack.id}: card missing id`);
          continue;
        }

        if (ids.has(card.id)) {
          duplicates.push(card.id);
        }
        ids.add(card.id);

        // Required field checks
        if (!card.frontPrompt && !card.front) {
          error(`Flashcard pack ${pack.id}: card ${card.id} missing frontPrompt or front`);
        }
      }

      if (duplicates.length > 0) {
        error(`Flashcard pack ${pack.id}: duplicate card IDs: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
      }

      if (skippedCount > 0) {
        skip(`${skippedCount} cards skipped in ${pack.id} (${skipReason})`);
      }

      ok(`${pack.id}: ${validatedCount} cards validated`);
    } catch (e) {
      error(`Failed to validate flashcard pack ${pack.id}: ${e.message}`);
    }
  }
}

async function validateRoomEntries(schemas, registry) {
  console.log('\n🏛️ Validating Room Entries...');

  if (!registry?.rooms || registry.rooms.length === 0) {
    warn('No rooms registered in registry');
    return;
  }

  for (const room of registry.rooms) {
    console.log(`  Validating room: ${room.id}`);

    // Validate registry entry against schema
    if (schemas.RoomEntry) {
      const roomValid = schemas.RoomEntry(room);
      if (!roomValid) {
        for (const err of schemas.RoomEntry.errors) {
          error(`Room ${room.id} registry entry invalid: ${err.instancePath} ${err.message}`);
        }
        continue;
      }
    }

    // Check file exists
    const filePath = join('public', room.ldtkUrl);
    if (!existsSync(filePath)) {
      error(`Room ${room.id}: LDtk file not found at ${filePath}`);
      continue;
    }

    ok(`${room.id}: LDtk file exists at ${room.ldtkUrl}`);
  }
}

async function validateInkEntries(registry) {
  console.log('\n📜 Validating Ink Entries...');

  if (!registry?.ink || registry.ink.length === 0) {
    warn('No ink stories registered in registry');
    return;
  }

  // Determine ink directory (prefer generated, fall back to public/generated)
  const inkDir = existsSync(INK_GENERATED_DIR) ? INK_GENERATED_DIR :
                 existsSync(INK_PUBLIC_DIR) ? INK_PUBLIC_DIR : null;

  for (const ink of registry.ink) {
    console.log(`  Validating ink story: ${ink.id}`);

    // The URL is /generated/ink/story.json, which maps to generated/ink/story.json
    // or after sync, public/generated/ink/story.json
    const generatedPath = `generated/ink/${ink.id}.json`;
    const publicPath = `public/generated/ink/${ink.id}.json`;

    const fileExists = existsSync(generatedPath) || existsSync(publicPath);

    if (!fileExists) {
      warn(`Ink story ${ink.id}: compiled JSON not found (run npm run compile:ink)`);
      continue;
    }

    // Try to load and check knot count
    try {
      const inkPath = existsSync(generatedPath) ? generatedPath : publicPath;
      const story = await loadJson(inkPath);
      const knotCount = Object.keys(story).filter(k =>
        !['inkVersion', 'root', 'listDefs'].includes(k)
      ).length;
      ok(`${ink.id}: ${knotCount} knots found`);
    } catch (e) {
      warn(`Ink story ${ink.id}: failed to parse JSON`);
    }
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
  console.log('\n🏗️ Validating Room Specs (content/rooms)...');

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
  console.log('='.repeat(50));

  // Load contract and schemas
  console.log('\n📜 Loading Content Contract...');
  const contract = await loadContract();

  console.log('\n📋 Loading Schemas...');
  const { schemas } = await loadSchemas();

  // Validate contract against its own schema
  await validateContract(schemas, contract);

  // Validate registry
  const registry = await validateRegistry(schemas, contract);

  // Validate registry-driven content
  await validateFlashcardPacks(schemas, registry, contract);
  await validateRoomEntries(schemas, registry);
  await validateInkEntries(registry);

  // Validate source content
  await validateCharacterSpecs(schemas, contract);
  await validateRoomSpecs(schemas, registry, contract);
  await validateLpcStyleGuide(contract);

  // Summary
  console.log('\n' + '='.repeat(50));
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
