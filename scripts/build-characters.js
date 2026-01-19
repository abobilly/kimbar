#!/usr/bin/env node
/**
 * Build Characters - Compiles character specs and generates registry.json
 *
 * This script:
 * - Reads base config from content/registry_config.json
 * - Reads character specs from content/characters/
 * - Copies compiled specs to generated/characters/
 * - Scans public/content/ldtk/ for rooms
 * - Scans public/content/cards/ for flashcard packs
 * - Scans content/ink/ for ink stories
 * - Generates generated/registry.json with all entries
 *
 * PNG generation is handled by gen:sprites (generate-sprites.mjs)
 *
 * Usage: node scripts/build-characters.js [--character=<id>]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';

const CONTENT_DIR = './content/characters';
const GENERATED_DIR = './generated';
const CHARS_OUTPUT_DIR = './generated/characters';
const REGISTRY_CONFIG_PATH = './content/registry_config.json';
const LDTK_DIR = './public/content/ldtk';
const FLASHCARDS_DIR = './public/content/cards';
const INK_SOURCE_DIR = './content/ink';
const AI_MANIFEST_PATH = './generated/ai-manifest.json';
const PROPS_DIR = './vendor/props';
const TILESET_REGISTRY_PATH = './content/tilesets/tilesets.json';
const PROPS_CATEGORIES = ['legal', 'exterior', 'office'];
const PROP_SKIP_FILES = new Set(['_ Liberated Palette Ramps.png']);

function normalizePropName(fileName) {
  const base = basename(fileName, extname(fileName));
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  const stripped = normalized.replace(/_proc$/, '') || normalized;
  return stripped;
}

function buildPropId(category, name, usedIds) {
  const baseId = `prop.${name}`;
  if (!usedIds.has(baseId)) {
    return baseId;
  }

  const categoryId = `prop.${category}_${name}`;
  if (!usedIds.has(categoryId)) {
    console.warn(`⚠️ Prop id collision for '${baseId}', using '${categoryId}' instead`);
    return categoryId;
  }

  let suffix = 2;
  while (usedIds.has(`${categoryId}_${suffix}`)) {
    suffix += 1;
  }
  const finalId = `${categoryId}_${suffix}`;
  console.warn(`⚠️ Prop id collision for '${baseId}', using '${finalId}' instead`);
  return finalId;
}

async function loadRegistryConfig() {
  if (!existsSync(REGISTRY_CONFIG_PATH)) {
    console.error(`❌ Registry config not found at ${REGISTRY_CONFIG_PATH}`);
    process.exit(1);
  }

  const content = await readFile(REGISTRY_CONFIG_PATH, 'utf-8');
  const config = JSON.parse(content);

  // Remove $schema before using as registry base
  delete config.$schema;

  // Add empty arrays/objects that will be populated
  config.sprites = config.sprites || {};
  config.characters = [];
  config.rooms = [];
  config.flashcardPacks = [];
  config.ink = [];
  config.props = {};
  config.tilesets = {};

  return config;
}

async function loadCharacterSpecs() {
  const specs = [];

  if (!existsSync(CONTENT_DIR)) {
    console.log(`📁 No character specs directory found at ${CONTENT_DIR}`);
    return specs;
  }

  const files = await readdir(CONTENT_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const content = await readFile(join(CONTENT_DIR, file), 'utf-8');
      const spec = JSON.parse(content);
      specs.push({ file, spec });
    } catch (e) {
      console.error(`❌ Failed to parse ${file}:`, e.message);
    }
  }

  return specs;
}

async function compileCharacter(file, spec) {
  const charId = spec.id || basename(file, '.json');
  console.log(`  📋 Compiling: ${charId} (${spec.name || 'unnamed'})`);

  // Compiled spec includes original data plus derived fields
  const compiled = {
    ...spec,
    id: charId,
    compiledAt: new Date().toISOString()
  };

  // Write compiled spec
  const outputPath = join(CHARS_OUTPUT_DIR, `${charId}.json`);
  await writeFile(outputPath, JSON.stringify(compiled, null, 2));
  console.log(`    ✅ Wrote: ${outputPath}`);

  return {
    id: charId,
    spec: compiled
  };
}

function buildSpriteEntry(charId) {
  return {
    key: charId,
    atlas: charId,
    url: `/generated/sprites/${charId}.png`,
    portraitUrl: `/generated/portraits/${charId}.png`,
    frameWidth: 64,
    frameHeight: 64,
    kind: 'spritesheet'
  };
}

function normalizeVariantId(variantId) {
  return variantId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function buildVariantSpriteId(charId, variantId) {
  const normalized = normalizeVariantId(variantId);
  return `${charId}_${normalized}`;
}

function buildCharacterEntry(charId) {
  return {
    id: charId,
    specUrl: `/generated/characters/${charId}.json`,
    spriteKey: charId
  };
}

/**
 * Scan content/room_entries/ for explicit RoomEntry JSON files and populate registry.
 * 
 * INVARIANT: Rooms MUST come from explicit specs in content/room_entries/*.json.
 * FORBIDDEN: Scanning ldtk/ directories to auto-discover rooms.
 * 
 * Directory separation:
 * - content/room_entries/ → RoomEntry schema (registry bridge entries)
 * - content/rooms/        → RoomSpec schema (Tiled authoring specs)
 * 
 * Each RoomEntry file defines:
 * - id: unique room identifier
 * - displayName: human-readable name
 * - ldtkUrl: path to LDtk JSON (bridge period only)
 * - environment: 'interior' | 'exterior'
 */
async function scanRooms() {
  const rooms = [];

  const ROOM_ENTRY_DIR = join(process.cwd(), 'content', 'room_entries');
  if (!existsSync(ROOM_ENTRY_DIR)) {
    console.log(`📁 No room entries directory found at ${ROOM_ENTRY_DIR}`);
    return rooms;
  }

  const files = await readdir(ROOM_ENTRY_DIR);
  const entryFiles = files.filter(f => f.endsWith('.json')).sort();

  for (const file of entryFiles) {
    try {
      const filePath = join(ROOM_ENTRY_DIR, file);
      const content = await readFile(filePath, 'utf-8');
      const spec = JSON.parse(content);

      // Validate required fields for RoomEntry
      if (!spec.id) {
        console.error(`❌ Room entry ${file} missing required 'id' field`);
        continue;
      }
      if (!spec.ldtkUrl) {
        console.error(`❌ Room entry ${file} missing required 'ldtkUrl' field`);
        continue;
      }

      const roomEntry = {
        id: spec.id,
        displayName: spec.displayName || spec.name || spec.id,
        environment: spec.environment || 'interior',
        ldtkUrl: spec.ldtkUrl
      };

      rooms.push(roomEntry);
      console.log(`  🏛️ Found room: ${roomEntry.id} (${roomEntry.displayName}) - ${roomEntry.environment}`);
    } catch (e) {
      console.error(`❌ Failed to parse room entry ${file}:`, e.message);
    }
  }

  // Sort rooms by ID for deterministic output
  rooms.sort((a, b) => a.id.localeCompare(b.id));

  return rooms;
}

/**
 * Scan public/content/cards/ for flashcard JSON/NDJSON files and create pack entries.
 */
async function scanFlashcardPacks() {
  const packs = [];

  if (!existsSync(FLASHCARDS_DIR)) {
    console.log(`📁 No flashcards directory found at ${FLASHCARDS_DIR}`);
    return packs;
  }

  const files = await readdir(FLASHCARDS_DIR);
  for (const file of files) {
    // Handle both .json and .ndjson formats
    if (!file.endsWith('.json') && !file.endsWith('.ndjson')) continue;

    try {
      const filePath = join(FLASHCARDS_DIR, file);
      const content = await readFile(filePath, 'utf-8');

      // Determine file extension for proper parsing
      const isNdjson = file.endsWith('.ndjson');
      const ext = isNdjson ? '.ndjson' : '.json';

      // Extract pack ID from filename (remove extension)
      const packId = basename(file, ext);

      let cards = [];
      let subjects = [];
      let title = null;

      if (isNdjson) {
        // Parse NDJSON: one JSON object per line
        const lines = content.split('\n').filter(line => line.trim());
        const subjectSet = new Set();

        for (const line of lines) {
          try {
            const card = JSON.parse(line);
            cards.push(card);
            if (card.subject) {
              const normalized = card.subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
              if (normalized && normalized !== 'mpt') {
                subjectSet.add(normalized);
              }
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
        subjects = [...subjectSet].sort();
        title = 'Cloze Cards';
      } else {
        // Parse regular JSON
        const data = JSON.parse(content);

        // Handle both array format and object with 'cards' array
        cards = Array.isArray(data) ? data : (data.cards || []);

        // Extract subjects from cards or top-level subjects field
        if (data.subjects && Array.isArray(data.subjects)) {
          // Normalize subject names to snake_case
          subjects = data.subjects
            .map(s => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
            .filter(s => s && s !== 'mpt'); // Exclude MPT
        } else {
          // Extract from cards
          const subjectSet = new Set();
          for (const card of cards) {
            if (card.subject) {
              const normalized = card.subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
              if (normalized && normalized !== 'mpt') {
                subjectSet.add(normalized);
              }
            }
            for (const tag of card.tagsNormalized || []) {
              subjectSet.add(tag);
            }
          }
          subjects = [...subjectSet].sort();
        }

        if (data.source) {
          title = data.source;
        }
      }

      const packEntry = {
        id: packId,
        url: `/content/cards/${file}`,
        schemaVersion: 1,
        count: cards.length,
        subjects
      };

      // Add title if available
      if (title) {
        packEntry.title = title;
      }

      packs.push(packEntry);
      console.log(`  📇 Found flashcard pack: ${packId} (${cards.length} cards)`);
    } catch (e) {
      console.error(`❌ Failed to parse flashcard pack ${file}:`, e.message);
    }
  }

  // Sort packs by ID for deterministic output
  packs.sort((a, b) => a.id.localeCompare(b.id));

  return packs;
}

/**
 * Scan content/ink/ for ink source files and create ink entries.
 * Note: The compiled JSON will be in generated/ink/ after compile-ink runs.
 */
async function scanInkStories() {
  const stories = [];

  if (!existsSync(INK_SOURCE_DIR)) {
    console.log(`📁 No ink source directory found at ${INK_SOURCE_DIR}`);
    return stories;
  }

  const files = await readdir(INK_SOURCE_DIR);
  for (const file of files) {
    if (!file.endsWith('.ink')) continue;

    const storyId = basename(file, '.ink');

    stories.push({
      id: storyId,
      url: `/generated/ink/${storyId}.json`
    });

    console.log(`  📜 Found ink story: ${storyId}`);
  }

  // Sort for deterministic output
  stories.sort((a, b) => a.id.localeCompare(b.id));

  return stories;
}

/**
 * Scan vendor/props/ for procedural prop PNGs and create prop entries.
 * Props are simple images (not spritesheets) stored by category.
 */
async function scanProps() {
  const props = {};
  const propEntries = [];
  const usedIds = new Set();

  if (!existsSync(PROPS_DIR)) {
    console.log(`📁 No props directory found at ${PROPS_DIR}`);
    return props;
  }

  for (const category of PROPS_CATEGORIES) {
    const categoryDir = join(PROPS_DIR, category);
    if (!existsSync(categoryDir)) {
      continue;
    }

    try {
      const files = await readdir(categoryDir);
      files.sort((a, b) => a.localeCompare(b));
      for (const file of files) {
        if (!file.endsWith('.png')) continue;
        if (file.startsWith('_') || PROP_SKIP_FILES.has(file)) continue;

        const normalizedName = normalizePropName(file);
        if (!normalizedName) {
          console.warn(`⚠️ Skipping prop with empty normalized name: ${file}`);
          continue;
        }

        const id = buildPropId(category, normalizedName, usedIds);
        usedIds.add(id);

        propEntries.push({
          id,
          path: `/assets/props/${category}/${file}`,
          category
        });
      }
    } catch (e) {
      console.error(`❌ Failed to scan props category ${category}:`, e.message);
    }
  }

  propEntries.sort((a, b) => a.id.localeCompare(b.id));
  for (const entry of propEntries) {
    props[entry.id] = {
      path: entry.path,
      category: entry.category
    };
    console.log(`  🪴 Found prop: ${entry.id}`);
  }

  return props;
}

async function loadTilesetRegistry() {
  if (!existsSync(TILESET_REGISTRY_PATH)) {
    console.log(`📁 No tileset registry found at ${TILESET_REGISTRY_PATH}`);
    return {};
  }

  try {
    const content = await readFile(TILESET_REGISTRY_PATH, 'utf-8');
    const payload = JSON.parse(content);
    const entries = Array.isArray(payload) ? payload : payload.tilesets;
    if (!Array.isArray(entries)) {
      console.warn('⚠️ Tileset registry missing tilesets array');
      return {};
    }

    const ordered = {};
    const sorted = [...entries].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    for (const entry of sorted) {
      if (!entry?.id || !entry?.url) {
        console.warn('⚠️ Skipping tileset entry missing id/url');
        continue;
      }
      ordered[entry.id] = { ...entry };
    }
    return ordered;
  } catch (e) {
    console.error(`⚠️ Failed to parse tileset registry: ${e.message}`);
    return {};
  }
}

/**
 * Load AI-generated assets from generated/ai-manifest.json if it exists.
 * Merges AI sprite entries into the registry sprites object.
 */
async function loadAiManifest() {
  if (!existsSync(AI_MANIFEST_PATH)) {
    return { entries: [] };
  }

  try {
    const content = await readFile(AI_MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(content);
    return manifest;
  } catch (e) {
    console.error(`⚠️ Failed to parse AI manifest: ${e.message}`);
    return { entries: [] };
  }
}

async function main() {
  console.log('🎭 Kim Bar Character Compiler\n');
  console.log('='.repeat(50));

  // Parse command line args
  const args = process.argv.slice(2);
  const targetChar = args.find(a => a.startsWith('--character='))?.split('=')[1];

  // Load registry config
  console.log('\n📝 Loading registry config...');
  const registry = await loadRegistryConfig();
  console.log(`  ✅ Loaded from ${REGISTRY_CONFIG_PATH}`);

  // Add buildId for cache-busting (from env or generate timestamp)
  registry.buildId = process.env.GITHUB_SHA
    || process.env.BUILD_ID
    || `dev-${Date.now()}`;
  console.log(`  🔖 buildId: ${registry.buildId}`);

  // Load character specs
  const specs = await loadCharacterSpecs();

  // Ensure output directories exist
  await mkdir(GENERATED_DIR, { recursive: true });
  await mkdir(CHARS_OUTPUT_DIR, { recursive: true });

  if (specs.length === 0) {
    console.log('\n📝 No character specs found.');
    console.log(`   Create JSON files in ${CONTENT_DIR}/`);
    console.log('   See schemas/CharacterSpec.schema.json for format');
  } else {
    console.log(`\n📋 Found ${specs.length} character spec(s)`);

    // Filter if specific character requested
    const toCompile = targetChar
      ? specs.filter(s => s.spec.id === targetChar || basename(s.file, '.json') === targetChar)
      : specs;

    if (targetChar && toCompile.length === 0) {
      console.error(`❌ Character '${targetChar}' not found`);
      process.exit(1);
    }

    // Compile each character
    console.log('\n📦 Compiling characters...');
    const compiled = [];
    for (const { file, spec } of toCompile) {
      try {
        const result = await compileCharacter(file, spec);
        compiled.push(result);
      } catch (e) {
        console.error(`  ❌ Failed to compile ${file}:`, e.message);
      }
    }

    // Add/update sprite entries
    for (const { id } of compiled) {
      registry.sprites[id] = buildSpriteEntry(id);
    }

    // Add sprite entries for outfit variants (do not register as characters)
    const variantSpriteIds = new Set();
    for (const { id, spec } of compiled) {
      const variants = [...(spec.variants || [])].sort((a, b) => {
        return a.variantId.localeCompare(b.variantId);
      });
      for (const variant of variants) {
        const variantSpriteId = buildVariantSpriteId(id, variant.variantId);
        if (registry.sprites[variantSpriteId]) continue;
        registry.sprites[variantSpriteId] = buildSpriteEntry(variantSpriteId);
        variantSpriteIds.add(variantSpriteId);
      }
    }
    if (variantSpriteIds.size > 0) {
      console.log(`  👗 Added ${variantSpriteIds.size} outfit variant sprite(s)`);
    }

    // Build characters array
    registry.characters = compiled.map(({ id }) => buildCharacterEntry(id));
  }

  // Scan for rooms
  console.log('\n🏛️ Scanning for rooms...');
  registry.rooms = await scanRooms();
  console.log(`  ✅ Found ${registry.rooms.length} room(s)`);

  // Scan for flashcard packs
  console.log('\n📇 Scanning for flashcard packs...');
  registry.flashcardPacks = await scanFlashcardPacks();
  console.log(`  ✅ Found ${registry.flashcardPacks.length} flashcard pack(s)`);

  // Scan for ink stories
  console.log('\n📜 Scanning for ink stories...');
  registry.ink = await scanInkStories();
  console.log(`  ✅ Found ${registry.ink.length} ink story(ies)`);

  // Scan for props
  console.log('\n🪴 Scanning for props...');
  registry.props = await scanProps();
  const propCount = Object.keys(registry.props).length;
  console.log(`  ✅ Found ${propCount} prop(s)`);

  // Load tileset registry
  console.log('\n🧩 Loading tilesets...');
  registry.tilesets = await loadTilesetRegistry();
  const tilesetCount = Object.keys(registry.tilesets).length;
  console.log(`  ✅ Found ${tilesetCount} tileset(s)`);

  // Load AI-generated assets
  console.log('\n🤖 Loading AI-generated assets...');
  const aiManifest = await loadAiManifest();
  let aiSpriteCount = 0;
  if (aiManifest.entries && aiManifest.entries.length > 0) {
    for (const entry of aiManifest.entries) {
      // Skip dry-run entries
      if (entry.source?.dryRun) continue;

      // Add sprite entry to registry
      registry.sprites[entry.id] = {
        key: entry.id,
        url: entry.url,
        frameWidth: entry.frameWidth || 64,
        frameHeight: entry.frameHeight || 64,
        kind: entry.kind || 'sprite',
        anchor: entry.anchor,
        tags: entry.tags,
        source: entry.source
      };
      aiSpriteCount++;
      console.log(`  🎨 Added AI sprite: ${entry.id}`);
    }
  }
  console.log(`  ✅ Loaded ${aiSpriteCount} AI-generated sprite(s)`);

  // Write registry with stable key order
  console.log('\n📝 Building registry...');
  const registryPath = join(GENERATED_DIR, 'registry.json');

  // Define key order for stable output
  const orderedRegistry = {
    buildId: registry.buildId,
    tileSize: registry.tileSize,
    scale: registry.scale,
    entities: registry.entities,
    outfits: registry.outfits,
    tags: registry.tags,
    sprites: registry.sprites,
    tilesets: registry.tilesets,
    characters: registry.characters,
    rooms: registry.rooms,
    flashcardPacks: registry.flashcardPacks,
    ink: registry.ink,
    props: registry.props
  };

  await writeFile(registryPath, JSON.stringify(orderedRegistry, null, 2));
  console.log(`  ✅ Wrote: ${registryPath}`);

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Done! Registry generated with:`);
  console.log(`   - ${registry.characters?.length || 0} character(s)`);
  console.log(`   - ${registry.rooms?.length || 0} room(s)`);
  console.log(`   - ${registry.flashcardPacks?.length || 0} flashcard pack(s)`);
  console.log(`   - ${registry.ink?.length || 0} ink story(ies)`);
  console.log(`   - ${propCount} prop(s)`);
  console.log(`   - ${tilesetCount} tileset(s)`);
  console.log(`   - ${aiSpriteCount} AI-generated sprite(s)`);
}

main().catch(console.error);
