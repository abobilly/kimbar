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
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';

const SCHEMA_DIR = './schemas';
const CONTENT_DIRS = {
  characters: './specs/characters',
  rooms: './specs/rooms',
  room_entries: './specs/room_entries',
  dialogue: './specs/dialogue'
};
// Validate against the generated registry (single source of truth)
const REGISTRY_PATH = './public/generated/registry/content.json';
const FLASHCARDS_DIR = './public/content/cards';
// Ink is generated under public/generated
const INK_GENERATED_DIR = './public/generated/ink';
const CONTRACT_PATH = './specs/content_contract.json';
const PLACEMENT_DRAFTS_DIR = './specs/placement_drafts';
const PLACEMENT_SPEC_PATH = './docs/MISSING_ASSETS_SPEC.json';
const TILESET_MANIFEST_PATH = './specs/ai_jobs/tileset_manifest.json';
const ROOM_TILE_REQUIREMENTS_PATH = './specs/ai_jobs/room_tile_requirements.json';
const GENERATED_TILES_DIR = './public/generated/tiles';
const TILESET_REGISTRY_PATH = './public/content/tilesets/tilesets.json';
const TILESET_PARTS_DIR = './public/content/tilesets';
const WORLD_GRAPH_PATH = './specs/world_graph.json';
const ULPC_MANIFEST_PATH = './specs/ulpc_manifest.json';

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
    error('registry content not found - run npm run prepare:content first');
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

async function validateTilesets(schemas) {
  console.log('\n🧱 Validating Tilesets...');

  if (!existsSync(TILESET_REGISTRY_PATH)) {
    warn('Tileset registry not found - run npm run import:lpc first');
    return;
  }

  try {
    const tilesetRegistry = await loadJson(TILESET_REGISTRY_PATH);
    if (schemas.TilesetRegistry) {
      const valid = schemas.TilesetRegistry(tilesetRegistry);
      if (!valid) {
        for (const err of schemas.TilesetRegistry.errors) {
          error(`Tileset registry ${err.instancePath}: ${err.message}`);
        }
      } else {
        ok('Tileset registry schema valid');
      }
    }

    const tilesets = tilesetRegistry.tilesets || [];
    ok(`${tilesets.length} tileset(s) indexed`);
  } catch (e) {
    error(`Failed to parse tileset registry: ${e.message}`);
  }

  if (!schemas.TilesetParts) {
    return;
  }

  if (!existsSync(TILESET_PARTS_DIR)) {
    warn('Tileset parts directory missing');
    return;
  }

  const partFiles = (await readdir(TILESET_PARTS_DIR))
    .filter(name => name.endsWith('.parts.json'))
    .sort((a, b) => a.localeCompare(b));

  if (partFiles.length === 0) {
    warn('No tileset parts maps found');
    return;
  }

  for (const file of partFiles) {
    try {
      const data = await loadJson(join(TILESET_PARTS_DIR, file));
      const valid = schemas.TilesetParts(data);
      if (!valid) {
        for (const err of schemas.TilesetParts.errors) {
          error(`Tileset parts ${file}${err.instancePath}: ${err.message}`);
        }
      } else {
        ok(`${file}: schema valid`);
      }
    } catch (e) {
      error(`Failed to parse tileset parts ${file}: ${e.message}`);
    }
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

    // Determine if NDJSON format
    const isNdjson = pack.url.endsWith('.ndjson');

    // Load and validate file
    try {
      let cards = [];

      if (isNdjson) {
        // Parse NDJSON: one JSON object per line
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            cards.push(JSON.parse(line));
          } catch (e) {
            // Skip malformed lines
          }
        }
        // NDJSON files skip schema validation - just check count
        if (cards.length !== pack.count) {
          warn(`Flashcard pack ${pack.id}: count mismatch (registry: ${pack.count}, file: ${cards.length})`);
        }
        ok(`${pack.id}: ${cards.length} cloze cards (NDJSON format)`);
        continue;
      }

      const fileContent = await loadJson(filePath);

      // Handle both array format and object with 'cards' array
      cards = Array.isArray(fileContent) ? fileContent : (fileContent.cards || []);

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

function resolvePublicOrGeneratedPath(urlPath) {
  if (!urlPath) return null;
  const normalized = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const generatedPath = normalized;
  const publicPath = join('public', normalized);
  if (existsSync(generatedPath)) return generatedPath;
  if (existsSync(publicPath)) return publicPath;
  return null;
}

async function validatePortraitAssets(registry) {
  console.log('\n🖼️ Validating Portrait Assets...');

  if (!registry?.sprites) {
    warn('No sprites registry found');
    return;
  }

  let checked = 0;
  for (const sprite of Object.values(registry.sprites)) {
    if (!sprite?.portraitUrl) continue;
    checked++;

    const resolved = resolvePublicOrGeneratedPath(sprite.portraitUrl);
    if (!resolved) {
      error(`Portrait missing for sprite '${sprite.key ?? sprite.id ?? 'unknown'}': ${sprite.portraitUrl}`);
    }
  }

  ok(`${checked} portrait(s) checked`);
}

async function validateWorldGraph(schemas, registry) {
  console.log('\n🗺️ Validating World Graph...');

  if (!existsSync(WORLD_GRAPH_PATH)) {
    warn('World graph not found at specs/world_graph.json');
    return;
  }

  try {
    const worldGraph = await loadJson(WORLD_GRAPH_PATH);

    // Schema validation
    if (schemas.WorldGraph) {
      const valid = schemas.WorldGraph(worldGraph);
      if (!valid) {
        for (const err of schemas.WorldGraph.errors) {
          error(`World graph ${err.instancePath}: ${err.message}`);
        }
      } else {
        ok('World graph schema valid');
      }
    }

    const doorIdPattern = /^[a-z0-9_]+_to_[a-z0-9_]+$/;
    const spawnTagPattern = /^(from_[a-z0-9_]+|[a-z]+_entry|main|default)$/;

    // Build sets for cross-reference validation
    const nodeIds = new Set();
    const nodeSpawns = {};
    const nodePortals = {};

    for (const node of worldGraph.nodes) {
      if (nodeIds.has(node.id)) {
        error(`World graph: duplicate node id '${node.id}'`);
      }
      nodeIds.add(node.id);

      const spawns = new Set(node.spawns || []);
      nodeSpawns[node.id] = spawns;

      for (const spawn of spawns) {
        if (!spawnTagPattern.test(spawn)) {
          warn(`World graph: spawn tag '${spawn}' in '${node.id}' does not match naming convention`);
        }
      }

      const portals = node.portals || [];
      const portalIds = new Set();
      const portalMap = new Map();
      const bounds = node.bounds || null;

      for (const portal of portals) {
        if (portalIds.has(portal.id)) {
          error(`World graph: duplicate portal id '${portal.id}' in room '${node.id}'`);
          continue;
        }
        portalIds.add(portal.id);
        portalMap.set(portal.id, portal);

        if (!doorIdPattern.test(portal.id)) {
          error(`World graph: portal id '${portal.id}' in '${node.id}' does not match naming convention`);
        }

        if (!portal.id.startsWith(`${node.id}_to_`)) {
          error(`World graph: portal id '${portal.id}' in '${node.id}' must start with '${node.id}_to_'`);
        }

        if (bounds) {
          const width = portal.width ?? 1;
          const height = portal.height ?? 1;
          if (portal.x < 0 || portal.y < 0 || portal.x + width > bounds.width || portal.y + height > bounds.height) {
            error(`World graph: portal '${portal.id}' in '${node.id}' out of bounds (${bounds.width}x${bounds.height})`);
          }
        }
      }

      nodePortals[node.id] = portalMap;
    }

    // Validate edges
    const edgeKeys = new Set();
    for (const edge of worldGraph.edges) {
      const key = `${edge.fromRoomId}:${edge.doorId}`;
      if (edgeKeys.has(key)) {
        error(`World graph: duplicate doorId '${edge.doorId}' in room '${edge.fromRoomId}'`);
      }
      edgeKeys.add(key);

      if (!doorIdPattern.test(edge.doorId)) {
        error(`World graph: edge '${edge.doorId}' does not match naming convention`);
      }

      const expectedPrefix = `${edge.fromRoomId}_to_${edge.toRoomId}`;
      if (!edge.doorId.startsWith(expectedPrefix)) {
        error(`World graph: edge '${edge.doorId}' must start with '${expectedPrefix}'`);
      }

      // fromRoomId must exist
      if (!nodeIds.has(edge.fromRoomId)) {
        error(`World graph: edge '${edge.doorId}' references unknown fromRoomId '${edge.fromRoomId}'`);
      }

      // toRoomId must exist
      if (!nodeIds.has(edge.toRoomId)) {
        error(`World graph: edge '${edge.doorId}' references unknown toRoomId '${edge.toRoomId}'`);
      }

      // Portal must exist in source room
      const portals = nodePortals[edge.fromRoomId];
      if (!portals || !portals.has(edge.doorId)) {
        error(`World graph: edge '${edge.doorId}' references missing portal in room '${edge.fromRoomId}'`);
      } else {
        const portal = portals.get(edge.doorId);
        if (portal?.facing && edge.facing && portal.facing !== edge.facing) {
          error(`World graph: edge '${edge.doorId}' facing '${edge.facing}' does not match portal facing '${portal.facing}'`);
        }
      }

      // toSpawnTag must exist in destination room
      const destSpawns = nodeSpawns[edge.toRoomId];
      if (destSpawns && !destSpawns.has(edge.toSpawnTag)) {
        error(`World graph: edge '${edge.doorId}' references unknown spawn '${edge.toSpawnTag}' in room '${edge.toRoomId}'`);
      }

      if (!spawnTagPattern.test(edge.toSpawnTag)) {
        warn(`World graph: edge '${edge.doorId}' spawn tag '${edge.toSpawnTag}' does not match naming convention`);
      }
    }

    // Bidirectional check (unless oneWay)
    for (const edge of worldGraph.edges) {
      if (edge.oneWay) continue;
      const reverse = worldGraph.edges.find(other =>
        other.fromRoomId === edge.toRoomId &&
        other.toRoomId === edge.fromRoomId &&
        !other.oneWay
      );
      if (!reverse) {
        error(`World graph: missing return edge for '${edge.doorId}' (${edge.fromRoomId} -> ${edge.toRoomId})`);
      }
    }

    // Cross-reference with registry rooms
    if (registry?.rooms) {
      const registryRoomIds = new Set(registry.rooms.map(r => r.id));
      for (const node of worldGraph.nodes) {
        if (!registryRoomIds.has(node.id)) {
          warn(`World graph: node '${node.id}' not found in registry (room may not exist yet)`);
        }
      }
    }

    ok(`${worldGraph.nodes.length} nodes, ${worldGraph.edges.length} edges`);
  } catch (e) {
    error(`Failed to parse world graph: ${e.message}`);
  }
}

async function validateUlpcManifest(schemas) {
  console.log('\n🧾 Validating ULPC Manifest...');

  if (!existsSync(ULPC_MANIFEST_PATH)) {
    warn('ULPC manifest not found at specs/ulpc_manifest.json');
    return;
  }

  try {
    const manifest = await loadJson(ULPC_MANIFEST_PATH);
    if (schemas.UlpcManifest) {
      const valid = schemas.UlpcManifest(manifest);
      if (!valid) {
        for (const err of schemas.UlpcManifest.errors) {
          error(`ULPC manifest ${err.instancePath}: ${err.message}`);
        }
        return;
      }
    }

    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const globs = Array.isArray(manifest.globs) ? manifest.globs : [];
    if (files.length === 0 && globs.length === 0) {
      warn('ULPC manifest is empty (no files/globs listed)');
    }
    ok(`ULPC manifest loaded (${files.length} file(s), ${globs.length} glob(s))`);
  } catch (e) {
    error(`Failed to parse ULPC manifest: ${e.message}`);
  }
}

async function validateInkEntries(registry) {
  console.log('\n📜 Validating Ink Entries...');

  if (!registry?.ink || registry.ink.length === 0) {
    warn('No ink stories registered in registry');
    return;
  }

  const inkDir = existsSync(INK_GENERATED_DIR) ? INK_GENERATED_DIR : null;

  for (const ink of registry.ink) {
    console.log(`  Validating ink story: ${ink.id}`);

    // The URL is /generated/ink/story.json, which maps to generated/ink/story.json
    // or after sync, public/generated/ink/story.json
    const publicPath = `public/generated/ink/${ink.id}.json`;

    const fileExists = existsSync(publicPath);

    if (!fileExists) {
      warn(`Ink story ${ink.id}: compiled JSON not found (run npm run compile:ink)`);
      continue;
    }

    // Try to load and check knot count
    try {
      const story = await loadJson(publicPath);
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
  console.log('\n🏗️ Validating Room Specs (specs/rooms)...');

  if (!existsSync(CONTENT_DIRS.rooms)) {
    // INFO: This is expected if Tiled authoring hasn't started yet
    console.log('  ℹ️  No specs/rooms directory (OK if Tiled authoring not started; room_entries provides current rooms)');
    return;
  }

  const files = await readdir(CONTENT_DIRS.rooms);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    // INFO: This is expected if Tiled authoring hasn't started yet
    console.log('  ℹ️  No room specs found (OK if Tiled authoring not started; room_entries provides current rooms)');
    return;
  }

  const validOutfits = new Set(Object.keys(registry?.outfits || {}));
  const validSubjects = new Set(registry?.tags?.subjects || registry?.deckTags || []);

  for (const file of jsonFiles) {
    try {
      const spec = await loadJson(join(CONTENT_DIRS.rooms, file));

      // RoomSpec schema validation only - strict contracts
      const schema = schemas.RoomSpec;

      // Schema validation
      if (schema) {
        const valid = schema(spec);
        if (!valid) {
          for (const err of schema.errors) {
            error(`${file} ${err.instancePath}: ${err.message}`);
          }
        } else {
          ok(`${file}: RoomSpec schema valid`);
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

async function validateRoomSpecsAgainstWorldGraph() {
  console.log('\n🌍 Validating Room Specs Against World Graph...');

  if (!existsSync(WORLD_GRAPH_PATH)) {
    warn('World graph not found - skipping room spec validation');
    return;
  }

  if (!existsSync(CONTENT_DIRS.rooms)) {
    console.log('  ℹ️  No specs/rooms directory - skipping validation');
    return;
  }

  try {
    const worldGraph = await loadJson(WORLD_GRAPH_PATH);
    const nodeMap = new Map();
    for (const node of worldGraph.nodes) {
      nodeMap.set(node.id, node);
    }

    const files = await readdir(CONTENT_DIRS.rooms);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const spec = await loadJson(join(CONTENT_DIRS.rooms, file));
        const roomId = spec.id;
        const node = nodeMap.get(roomId);

        if (!node) {
          warn(`${file}: room '${roomId}' not found in world graph`);
          continue;
        }

        // Check dimensions
        const specWidth = spec.width;
        const specHeight = spec.height;
        const graphWidth = node.bounds?.width;
        const graphHeight = node.bounds?.height;

        if (graphWidth && specWidth !== graphWidth) {
          error(`${file}: width ${specWidth} does not match world graph bounds ${graphWidth}`);
        }
        if (graphHeight && specHeight !== graphHeight) {
          error(`${file}: height ${specHeight} does not match world graph bounds ${graphHeight}`);
        }

        // Check spawns
        const specSpawns = new Set();
        for (const entity of spec.entities || []) {
          if (entity.type === 'PlayerSpawn') {
            specSpawns.add(entity.id);
          }
        }
        const graphSpawns = new Set(node.spawns || []);
        for (const spawn of specSpawns) {
          if (!graphSpawns.has(spawn)) {
            warn(`${file}: spawn '${spawn}' not in world graph spawns`);
          }
        }
        for (const spawn of graphSpawns) {
          if (!specSpawns.has(spawn)) {
            warn(`${file}: world graph spawn '${spawn}' not in room spec`);
          }
        }

        // Check doors/portals
        const specDoors = new Map();
        for (const entity of spec.entities || []) {
          if (entity.type === 'Door') {
            specDoors.set(entity.id, entity);
          }
        }
        const graphPortals = new Map();
        for (const portal of node.portals || []) {
          graphPortals.set(portal.id, portal);
        }

        for (const [doorId, door] of specDoors) {
          if (!graphPortals.has(doorId)) {
            error(`${file}: door '${doorId}' not in world graph portals`);
          } else {
            const portal = graphPortals.get(doorId);
            // Check position roughly matches
            if (Math.abs(door.x - portal.x) > 1 || Math.abs(door.y - portal.y) > 1) {
              warn(`${file}: door '${doorId}' position (${door.x},${door.y}) differs from portal (${portal.x},${portal.y})`);
            }
          }
        }
        for (const portalId of graphPortals.keys()) {
          if (!specDoors.has(portalId)) {
            error(`${file}: world graph portal '${portalId}' not in room spec doors`);
          }
        }

        ok(`${file}: matches world graph`);
      } catch (e) {
        error(`Failed to parse ${file}: ${e.message}`);
      }
    }
  } catch (e) {
    error(`Failed to load world graph: ${e.message}`);
  }
}

async function validateRoomEntrySpecs(schemas) {
  console.log('\n🏛️ Validating Room Entry Specs (specs/room_entries)...');

  if (!existsSync(CONTENT_DIRS.room_entries)) {
    warn('No room_entries directory');
    return;
  }

  const files = await readdir(CONTENT_DIRS.room_entries);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    warn('No room entry specs found');
    return;
  }

  for (const file of jsonFiles) {
    try {
      const spec = await loadJson(join(CONTENT_DIRS.room_entries, file));

      // RoomEntry schema validation only - strict contracts
      const schema = schemas.RoomEntry;

      if (schema) {
        const valid = schema(spec);
        if (!valid) {
          for (const err of schema.errors) {
            error(`${file} ${err.instancePath}: ${err.message}`);
          }
        } else {
          ok(`${file}: RoomEntry schema valid`);
        }
      }

      // Cross-reference: check LDtk file exists
      if (spec.ldtkUrl) {
        const ldtkPath = join('public', spec.ldtkUrl);
        if (!existsSync(ldtkPath)) {
          error(`${file}: LDtk file not found at ${ldtkPath}`);
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

async function validatePlacementDrafts(schemas) {
  console.log('\n🧭 Validating Placement Drafts...');

  if (!existsSync(PLACEMENT_DRAFTS_DIR)) {
    warn('No placement_drafts directory found');
    return;
  }

  if (!existsSync(PLACEMENT_SPEC_PATH)) {
    warn(`Missing placement spec at ${PLACEMENT_SPEC_PATH}`);
    return;
  }

  let spec;
  try {
    spec = await loadJson(PLACEMENT_SPEC_PATH);
  } catch (e) {
    error(`Failed to load placement spec: ${e.message}`);
    return;
  }

  const rooms = spec.rooms || {};
  const propAssets = new Set(
    (spec.assets || [])
      .filter(a => a.kind === 'prop')
      .map(a => a.id)
  );

  const files = await readdir(PLACEMENT_DRAFTS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    warn('No placement drafts found');
    return;
  }

  for (const file of jsonFiles) {
    try {
      const draft = await loadJson(join(PLACEMENT_DRAFTS_DIR, file));

      if (schemas.PlacementDraft) {
        const valid = schemas.PlacementDraft(draft);
        if (!valid) {
          for (const err of schemas.PlacementDraft.errors) {
            error(`${file} ${err.instancePath}: ${err.message}`);
          }
        } else {
          ok(`${file}: schema valid`);
        }
      }

      const placements = draft.placements || {};
      for (const [roomId, entries] of Object.entries(placements)) {
        const roomSpec = rooms[roomId] || (roomId.startsWith('chambers_') ? rooms.chambers : null);
        if (!roomSpec) {
          error(`${file}: unknown room '${roomId}' (no zones available)`);
          continue;
        }

        const zones = roomSpec.zones || {};
        const size = roomSpec.size || [0, 0];
        const maxX = size[0] ? size[0] - 1 : null;
        const maxY = size[1] ? size[1] - 1 : null;

        for (const entry of entries) {
          if (!propAssets.has(entry.id)) {
            error(`${file}: placement uses unknown prop id '${entry.id}'`);
          }

          if (entry.zone && !zones[entry.zone]) {
            error(`${file}: placement uses unknown zone '${entry.zone}' in room '${roomId}'`);
          }

          if (maxX !== null && (entry.x < 0 || entry.x > maxX)) {
            error(`${file}: placement '${entry.id}' x=${entry.x} out of bounds for room '${roomId}'`);
          }

          if (maxY !== null && (entry.y < 0 || entry.y > maxY)) {
            error(`${file}: placement '${entry.id}' y=${entry.y} out of bounds for room '${roomId}'`);
          }

          const zone = zones[entry.zone];
          if (zone?.rect) {
            const [x1, y1, x2, y2] = zone.rect;
            if (entry.x < x1 || entry.x > x2 || entry.y < y1 || entry.y > y2) {
              error(`${file}: placement '${entry.id}' (${entry.x},${entry.y}) outside zone '${entry.zone}'`);
            }
          }

          if (entry.properties?.sprite && entry.properties.sprite !== entry.id) {
            warn(`${file}: placement '${entry.id}' uses sprite '${entry.properties.sprite}' (expected '${entry.id}')`);
          }
        }
      }
    } catch (e) {
      error(`Failed to parse placement draft ${file}: ${e.message}`);
    }
  }
}

async function validateTileCompleteness() {
  console.log('\n🧱 Validating Tile Completeness...');

  // Skip if manifest doesn't exist (tiles not yet being tracked)
  if (!existsSync(TILESET_MANIFEST_PATH)) {
    warn('No tileset manifest found - tile validation skipped');
    return;
  }

  if (!existsSync(ROOM_TILE_REQUIREMENTS_PATH)) {
    warn('No room tile requirements found - tile validation skipped');
    return;
  }

  let manifest, requirements;
  try {
    manifest = await loadJson(TILESET_MANIFEST_PATH);
    requirements = await loadJson(ROOM_TILE_REQUIREMENTS_PATH);
  } catch (e) {
    error(`Failed to load tile manifest/requirements: ${e.message}`);
    return;
  }

  const definedTiles = new Set(manifest.tiles?.map(t => t.id) || []);
  const generatedTiles = new Set();

  // Scan generated tiles directory
  if (existsSync(GENERATED_TILES_DIR)) {
    try {
      const files = await readdir(GENERATED_TILES_DIR);
      for (const file of files) {
        if (file.endsWith('.png')) {
          // tile.floor.marble.white_base.png -> tile.floor.marble.white_base
          generatedTiles.add(file.replace('.png', ''));
        }
      }
    } catch (e) {
      warn(`Could not scan generated tiles: ${e.message}`);
    }
  }

  const totalDefined = definedTiles.size;
  const totalGenerated = generatedTiles.size;
  const completionPct = totalDefined > 0 ? Math.round((totalGenerated / totalDefined) * 100) : 0;

  ok(`Tile manifest: ${totalDefined} defined, ${totalGenerated} generated (${completionPct}%)`);

  // Check each room for required tiles
  const rooms = requirements.rooms || {};
  let roomsChecked = 0;
  let roomsMissing = 0;

  for (const [roomId, roomSpec] of Object.entries(rooms)) {
    const requiredPatterns = roomSpec.required || [];
    const uniquePatterns = roomSpec.unique || [];
    const allPatterns = [...requiredPatterns, ...uniquePatterns];

    let missingForRoom = [];

    for (const pattern of allPatterns) {
      // Pattern can be exact ID or wildcard (tile.floor.marble.*)
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        const hasMatch = [...generatedTiles].some(id => id.startsWith(prefix));
        if (!hasMatch) {
          // Check if at least defined in manifest
          const definedMatch = [...definedTiles].some(id => id.startsWith(prefix));
          if (definedMatch) {
            missingForRoom.push(pattern);
          }
        }
      } else {
        if (!generatedTiles.has(pattern) && definedTiles.has(pattern)) {
          missingForRoom.push(pattern);
        }
      }
    }

    roomsChecked++;
    if (missingForRoom.length > 0) {
      roomsMissing++;
      // Only warn, don't error - tiles are generated incrementally
      warn(`Room '${roomId}' missing ${missingForRoom.length} tile(s): ${missingForRoom.slice(0, 3).join(', ')}${missingForRoom.length > 3 ? '...' : ''}`);
    }
  }

  if (roomsMissing > 0) {
    console.log(`  📋 ${roomsChecked} rooms checked, ${roomsMissing} have missing tiles`);
  } else if (roomsChecked > 0 && totalGenerated > 0) {
    ok(`All ${roomsChecked} rooms have required tiles`);
  }
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

  await validateTilesets(schemas);

  // Validate registry-driven content
  await validateFlashcardPacks(schemas, registry, contract);
  await validateRoomEntries(schemas, registry);
  await validateInkEntries(registry);
  await validatePortraitAssets(registry);

  // Validate world topology
  await validateWorldGraph(schemas, registry);

  // Validate source content
  await validateCharacterSpecs(schemas, contract);
  await validateRoomSpecs(schemas, registry, contract);
  await validateRoomSpecsAgainstWorldGraph();
  await validateRoomEntrySpecs(schemas);
  await validateLpcStyleGuide(contract);
  await validateUlpcManifest(schemas);
  await validatePlacementDrafts(schemas);
  await validateTileCompleteness();

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
