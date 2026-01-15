#!/usr/bin/env node
/**
 * generate-ai-jobs-from-spec.mjs
 *
 * Generates AI job specs from docs/MISSING_ASSETS_SPEC.json.
 * Outputs:
 *  - content/ai_jobs/props_missing_v1.json
 *  - content/ai_jobs/tiles_missing_v1.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SPEC_PATH = './docs/MISSING_ASSETS_SPEC.json';
const OUTPUT_DIR = './content/ai_jobs';
const PROPS_JOB = 'props_missing_v1.json';
const TILES_JOB = 'tiles_missing_v1.json';

const PROP_DEFAULTS = {
  style: 'top-down pixel art prop, courthouse theme, clean silhouette, limited palette, soft shading, transparent background, centered object',
  negativePrompt: 'blurry, watermark, text, ui, border, frame, background scene, multiple objects, ground shadow',
  size: 64,
  paletteColors: 24,
  anchor: [0.5, 1.0]
};

const TILE_DEFAULTS = {
  style: 'top-down RPG tileset, pixel art style, seamless texture, clean tiling, courthouse materials',
  negativePrompt: 'blurry, watermark, text, photo-realistic, 3d render, gradient, perspective',
  size: 32,
  paletteColors: 16,
  anchor: [0.5, 0.5]
};

const TILE_PROMPTS = {
  'tile.scotus.marble_floor': 'white marble floor tiles with subtle veining, polished stone, courthouse lobby floor',
  'tile.scotus.marble_wall': 'marble wall tiles with trim and pillar accents, clean courthouse wall texture',
  'tile.scotus.wood_panel': 'dark wood wall paneling, wainscoting texture, courthouse interior',
  'tile.scotus.dais': 'wooden dais platform tiles, courtroom judge platform with steps and front face',
  'tile.scotus.library_floor': 'wood plank floor texture, warm library flooring, subtle grain',
  'tile.scotus.cafeteria_floor': 'cafeteria floor tiles, light checker pattern, clean and simple',
  'tile.scotus.vault_floor': 'metal floor tiles with grates and warning stripe border, secure vault flooring'
};

const PROP_PROMPTS = {
  'prop.scotus_plaque': 'bronze courthouse wall plaque with embossed seal, simple decorative plaque',
  'prop.statue': 'small marble statue on pedestal, classical courthouse decor',
  'prop.bollard': 'short metal bollard, street barrier post, simple cylinder',
  'prop.info_desk': 'reception info desk, modern courthouse desk, wood and brass accents',
  'prop.metal_detector': 'security metal detector gate, courthouse entry device',
  'prop.xray_belt': 'x-ray conveyor belt, security screening machine, compact unit',
  'prop.stanchion': 'velvet rope stanchion post, brass stand',
  'prop.couch': 'low lobby couch, modern seating, simple shape',
  'prop.wall_sconce': 'brass wall sconce light, courthouse wall lamp',
  'prop.door_plaque': 'small brass door plaque, room nameplate, no text',
  'prop.banner': 'vertical courthouse banner with seal motif, fabric drape',
  'prop.judge_bench': 'large judge bench, courtroom furniture, raised wooden bench',
  'prop.counsel_table': 'courtroom counsel table, slim wooden desk',
  'prop.counsel_chair': 'courtroom chair, wooden chair with cushion',
  'prop.jury_box': 'jury box seating enclosure, wood rail with benches',
  'prop.book_ladder': 'rolling library ladder, wooden ladder on wheels',
  'prop.card_catalog': 'card catalog cabinet, library index drawers',
  'prop.reading_table': 'library reading table, long wooden table',
  'prop.desk_lamp': 'green banker desk lamp, brass base',
  'prop.podium': 'press podium with seal medallion, wooden lectern',
  'prop.camera_rig': 'press camera on tripod, compact news camera',
  'prop.press_backdrop': 'press room backdrop panel with seal motif, no text',
  'prop.press_chair': 'simple press chair, folding chair',
  'prop.cafeteria_table': 'cafeteria table, round or square table, simple metal legs',
  'prop.cafeteria_chair': 'cafeteria chair, simple metal chair',
  'prop.vending_machine': 'vending machine, tall rectangular unit with buttons',
  'prop.menu_board': 'cafeteria menu board, simple wall board, no text',
  'prop.serving_counter': 'cafeteria serving counter, long counter with tray rail',
  'prop.robe_rack': 'robe rack with hanging robes, courthouse wardrobe rack',
  'prop.mirror': 'tall standing mirror, simple frame',
  'prop.locker': 'locker bank, metal lockers, courthouse staff lockers',
  'prop.vault_door': 'vault door, round metal door with wheel handle',
  'prop.metal_shelf': 'metal archive shelving, simple storage rack',
  'prop.warning_light': 'small red warning light, industrial indicator',
  'prop.evidence_board': 'evidence board with pinned notes and string, no readable text',
  'prop.tape_recorder': 'small tape recorder, evidence device',
  'prop.badge_stand': 'police badge display stand, small badge on plaque',
  'prop.handcuffs': 'pair of metal handcuffs, closed cuffs',
  'prop.cctv_monitor': 'small CCTV monitor, wall mounted screen',
  'prop.docket_stack': 'stack of legal files and folders, docket pile',
  'prop.procedure_chart': 'procedure chart poster with simple arrows, no text',
  'prop.deed_ledger': 'property deed ledger book, thick bound ledger',
  'prop.map_plot': 'property map plot, rolled map or flat map sheet',
  'prop.house_keys': 'set of house keys on keyring',
  'prop.contract_scroll': 'rolled contract scroll with ribbon, no text',
  'prop.handshake_sculpture': 'handshake sculpture on small pedestal, bronze finish',
  'prop.family_photo_frame': 'family photo frame, simple wood frame, no faces',
  'prop.toy_blocks': 'small toy blocks, colorful cubes',
  'prop.caution_cone': 'orange caution cone, safety cone',
  'prop.accident_report': 'accident report clipboard, papers on clipboard, no text',
  'prop.medical_chart': 'medical chart clipboard, simple chart, no text',
  'prop.hazard_sign': 'hazard warning sign, simple icon, no text',
  'prop.constitution_scroll': 'constitution scroll, rolled parchment with ribbon',
  'prop.classical_bust': 'classical marble bust on pedestal'
};

function seedFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 2147483647;
  }
  return hash || 1;
}

function inferTags(id, kind) {
  const tags = new Set([kind]);
  const parts = id.split('.').pop()?.split('_') || [];
  for (const part of parts) {
    if (!part) continue;
    tags.add(part);
  }
  return Array.from(tags);
}

function sizeForFootprint(footprint) {
  if (!footprint || footprint.length !== 2) return PROP_DEFAULTS.size;
  const [w, h] = footprint;
  if (w > 2 || h > 2) return 128;
  return PROP_DEFAULTS.size;
}

async function loadSpec() {
  if (!existsSync(SPEC_PATH)) {
    throw new Error(`Spec not found: ${SPEC_PATH}`);
  }
  const content = await readFile(SPEC_PATH, 'utf-8');
  return JSON.parse(content);
}

async function writeJobFile(filename, job) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, filename);
  await writeFile(path, JSON.stringify(job, null, 2));
  return path;
}

function buildPropItems(assets) {
  const items = assets.map((asset) => {
    const prompt = PROP_PROMPTS[asset.id] || asset.id.replace('prop.', '').replace(/_/g, ' ');
    return {
      id: asset.id,
      prompt,
      size: sizeForFootprint(asset.footprint),
      seed: seedFromId(asset.id),
      tags: inferTags(asset.id, 'prop')
    };
  });

  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

function buildTileItems(assets) {
  const items = assets.map((asset) => {
    const prompt = TILE_PROMPTS[asset.id] || asset.id.replace('tile.', '').replace(/_/g, ' ');
    const tags = new Set(inferTags(asset.id, 'tile'));
    if (asset.id.includes('floor')) tags.add('floor');
    if (asset.id.includes('wall')) tags.add('wall');
    return {
      id: asset.id,
      prompt,
      seed: seedFromId(asset.id),
      tags: Array.from(tags)
    };
  });

  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

async function main() {
  const spec = await loadSpec();
  const assets = spec.assets || [];

  const propAssets = assets.filter((a) => a.kind === 'prop');
  const tileAssets = assets.filter((a) => a.kind === 'tileset');

  const propJob = {
    $schema: '../../schemas/AiJobSpec.schema.json',
    setId: 'props.missing_v1',
    workflow: 'wf_prop_pixelize_v1',
    defaults: PROP_DEFAULTS,
    items: buildPropItems(propAssets)
  };

  const tileJob = {
    $schema: '../../schemas/AiJobSpec.schema.json',
    setId: 'tiles.missing_v1',
    workflow: 'wf_tile_seamless_v1',
    defaults: TILE_DEFAULTS,
    items: buildTileItems(tileAssets)
  };

  const propPath = await writeJobFile(PROPS_JOB, propJob);
  const tilePath = await writeJobFile(TILES_JOB, tileJob);

  console.log(`✅ Wrote ${propPath}`);
  console.log(`✅ Wrote ${tilePath}`);
}

main().catch((err) => {
  console.error('❌ Failed to generate AI jobs:', err.message);
  process.exit(1);
});
