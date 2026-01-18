#!/usr/bin/env node
/**
 * List used assets based on LDtk content + registry mappings.
 *
 * Usage:
 *   node scripts/list-used-assets.mjs --format md --output generated/used_assets.md
 *   node scripts/list-used-assets.mjs --format json
 */

import { readFile, readdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const REGISTRY_PATH = './generated/registry.json';
const REGISTRY_CONFIG_PATH = './content/registry_config.json';
const ROOM_SPEC_DIR = './content/rooms';
const LDTK_DIR = './public/content/ldtk';

// NOTE: UI sprite IDs removed - A1 migration to code-first UIPanel/UIButton primitives
// These sprites are no longer loaded or used at runtime
const UI_SPRITE_IDS = [];

const PROP_ALIAS_MAP = {
  'prop.banner': 'prop.flag_stand',
  'prop.couch': 'prop.bench',
  'prop.info_desk': 'prop.desk_ornate',
  'prop.metal_detector': 'prop.exit_sign',
  'prop.stanchion': 'prop.flagpole',
  'prop.xray_belt': 'prop.briefcase',
  'prop.desk': 'prop.desk_ornate',
  'prop.chair': 'prop.bench',
  'prop.plant': 'prop.planter',
  'prop.bookshelf': 'prop.bookshelf',
  'prop.lectern': 'prop.argument_lectern',
  'prop.gavel': 'prop.gavel',
  'prop.file_cabinet': 'prop.file_cabinet',
  'prop.clock': 'prop.clock',
  'prop.laptop': 'prop.laptop',
  'prop.microphone': 'prop.microphone',
  'prop.whiteboard': 'prop.whiteboard',
  'prop.water_cooler': 'prop.water_cooler',
  'prop.coffee_maker': 'prop.coffee_maker',
  'prop.scales': 'prop.scales_of_justice',
  'prop.witness_stand': 'prop.witness_stand',
  'prop.jury_bench': 'prop.jury_bench',
  'prop.railing': 'prop.courtroom_railing'
};

function normalizePropName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function resolvePropSpriteKey(rawKey, registry) {
  if (!rawKey) return null;

  const aliased = PROP_ALIAS_MAP[rawKey];
  if (aliased) {
    rawKey = aliased;
  }

  const normalized = normalizePropName(rawKey);
  const withPrefix = `prop.${normalized}`;

  if (registry?.props) {
    if (rawKey.startsWith('prop.') && registry.props[rawKey]) {
      return rawKey;
    }
    if (registry.props[withPrefix]) {
      return withPrefix;
    }
    if (registry.props[rawKey]) {
      return rawKey;
    }
  }

  return rawKey;
}

function resolveEntitySpriteKey(entityType, props, registry) {
  if (entityType === 'Prop') {
    const rawKey = props.propId || props.sprite || null;
    return resolvePropSpriteKey(rawKey, registry);
  }
  return props.characterId || props.sprite || null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const formatIndex = args.indexOf('--format');
  const outputIndex = args.indexOf('--output');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'md';
  const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
  return { format, output };
}

async function loadJson(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function loadRegistry() {
  if (existsSync(REGISTRY_PATH)) {
    return loadJson(REGISTRY_PATH);
  }

  if (!existsSync(REGISTRY_CONFIG_PATH)) {
    return null;
  }

  const config = await loadJson(REGISTRY_CONFIG_PATH);
  return {
    outfits: config.outfits || {},
    sprites: config.sprites || {},
    tilesets: {},
    props: {}
  };
}

function addUsed(map, id, source) {
  if (!id) return;
  const entry = map.get(id) || { id, sources: new Set() };
  entry.sources.add(source);
  map.set(id, entry);
}

async function collectRoomTilesets(tilesetsMap, registry) {
  const unresolved = [];
  if (!existsSync(ROOM_SPEC_DIR)) return;
  const files = (await readdir(ROOM_SPEC_DIR)).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    const spec = await loadJson(path.join(ROOM_SPEC_DIR, file));
    if (!spec.tileset) continue;
    const roomId = spec.id || file.replace('.json', '');
    if (registry?.tilesets?.[spec.tileset] || spec.tileset.startsWith('tileset.')) {
      addUsed(tilesetsMap, spec.tileset, `room:${roomId}`);
    } else {
      unresolved.push(`tileset:${spec.tileset} (room:${roomId})`);
    }
  }
  return unresolved;
}

function extractEntityProps(entity) {
  const props = {};
  for (const field of entity.fieldInstances || []) {
    props[field.__identifier] = field.__value;
  }
  return props;
}

function getLdtkLevels(data) {
  if (Array.isArray(data.levels)) {
    return data.levels;
  }
  return [data];
}

async function collectLdtkAssets(registry, usedSprites, usedProps) {
  if (!existsSync(LDTK_DIR)) return;
  const files = (await readdir(LDTK_DIR))
    .filter(f => f.endsWith('.json') || f.endsWith('.ldtk'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(LDTK_DIR, file);
    const data = await loadJson(fullPath);
    const levels = getLdtkLevels(data);

    for (const level of levels) {
      const entityLayer = (level.layerInstances || []).find(
        layer => layer.__identifier === 'Entities'
      );
      if (!entityLayer?.entityInstances) continue;

      for (const entity of entityLayer.entityInstances) {
        const entityType = entity.__identifier;
        const props = extractEntityProps(entity);
        const spriteKey = resolveEntitySpriteKey(entityType, props, registry);
        const source = `ldtk:${file}`;

        if (entityType === 'Prop') {
          if (spriteKey) {
            addUsed(usedProps, spriteKey, source);
          }
          continue;
        }

        if (!spriteKey) {
          continue;
        }

        if (registry?.props?.[spriteKey]) {
          addUsed(usedProps, spriteKey, source);
        } else {
          addUsed(usedSprites, spriteKey, source);
        }

        if (entityType === 'OutfitChest' && props.outfitId && registry?.outfits?.[props.outfitId]) {
          const outfitSprite = registry.outfits[props.outfitId]?.sprite;
          addUsed(usedSprites, outfitSprite, `${source}:outfit:${props.outfitId}`);
        }
      }
    }
  }
}

function finalizeEntries(map, registrySection) {
  const items = [];
  for (const entry of map.values()) {
    const registryEntry = registrySection ? registrySection[entry.id] : null;
    items.push({
      id: entry.id,
      url: registryEntry?.url || registryEntry?.path || null,
      sources: Array.from(entry.sources).sort(),
      missing: !registryEntry
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

function renderMarkdown(result) {
  const lines = [];
  lines.push(`# Used Assets Report`);
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push('');

  const sections = [
    { title: 'Sprites', items: result.sprites },
    { title: 'Props', items: result.props },
    { title: 'Tilesets', items: result.tilesets }
  ];

  for (const section of sections) {
    lines.push(`## ${section.title} (${section.items.length})`);
    for (const item of section.items) {
      const url = item.url ? item.url : '(missing)';
      const source = item.sources.join(', ');
      const missing = item.missing ? ' [missing]' : '';
      lines.push(`- ${item.id} -> ${url} (${source})${missing}`);
    }
    lines.push('');
  }

  if (result.unresolved.length > 0) {
    lines.push(`## Unresolved References (${result.unresolved.length})`);
    for (const item of result.unresolved) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const { format, output } = parseArgs();
  const registry = await loadRegistry();

  const usedSprites = new Map();
  const usedProps = new Map();
  const usedTilesets = new Map();
  const unresolved = new Set();

  addUsed(usedSprites, 'char.kim', 'player:default');
  for (const id of UI_SPRITE_IDS) {
    addUsed(usedSprites, id, 'ui:core');
  }

  if (registry?.characters) {
    for (const entry of registry.characters) {
      addUsed(usedSprites, entry.spriteKey, `character:${entry.id}`);
    }
  }

  if (registry?.outfits) {
    for (const [id, outfit] of Object.entries(registry.outfits)) {
      if (outfit.sprite) {
        addUsed(usedSprites, outfit.sprite, `outfit:${id}`);
      }
    }
  }

  if (registry?.tilesets) {
    if (registry.tilesets['tileset.scotus_tiles']) {
      addUsed(usedTilesets, 'tileset.scotus_tiles', 'worldscene:floor');
    }
    if (registry.tilesets['tileset.lpc_floors']) {
      addUsed(usedTilesets, 'tileset.lpc_floors', 'worldscene:fallback');
    }
  }

  const roomTilesetIssues = await collectRoomTilesets(usedTilesets, registry);
  await collectLdtkAssets(registry, usedSprites, usedProps);

  const sprites = finalizeEntries(usedSprites, registry?.sprites);
  const props = finalizeEntries(usedProps, registry?.props);
  const tilesets = finalizeEntries(usedTilesets, registry?.tilesets);

  for (const entry of [...sprites, ...props, ...tilesets]) {
    if (entry.missing) {
      unresolved.add(entry.id);
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    sprites,
    props,
    tilesets,
    unresolved: Array.from(unresolved).concat(roomTilesetIssues || []).sort()
  };

  const payload = format === 'json' ? JSON.stringify(result, null, 2) : renderMarkdown(result);
  if (output) {
    await writeFile(output, payload);
  }
  process.stdout.write(payload + '\n');
}

main().catch((err) => {
  console.error(`Failed to list used assets: ${err.message}`);
  process.exit(1);
});
