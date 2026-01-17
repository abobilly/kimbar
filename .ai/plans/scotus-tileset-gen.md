# Plan: SCOTUS Tileset Generation Pipeline

**Goal**: Convert room-by-room tile inventory into implementation-ready deliverables for pixel-mcp / Gemini agent automation
**Issue**: N/A (Asset pipeline task)
**Created**: 2026-01-16

## Steps

1. [x] **Create tileset naming manifest (JSON)** ✅
   - **Acceptance**: `content/ai_jobs/tileset_manifest.json` exists, validates against schema, contains all ~250 unique tile IDs from inventory
   - **Files**: `content/ai_jobs/tileset_manifest.json`, `schemas/TilesetManifest.schema.json`
   - **Result**: Created with 230 tile definitions, full palette specs, priority assignments

2. [x] **Create per-room minimum tile lists** ✅
   - **Acceptance**: `content/ai_jobs/room_tile_requirements.json` maps each room to its required tile IDs (with reuse %)
   - **Files**: `content/ai_jobs/room_tile_requirements.json`
   - **Result**: 18 rooms mapped with required/unique/optional tiles and reuse percentages

3. [x] **Extend pixel-mcp client for tile batch generation** ✅
   - **Acceptance**: `scripts/generate-tiles-batch.py` can POST tile generation jobs to Railway endpoint, returns PNG base64
   - **Files**: `scripts/generate-tiles-batch.py`
   - **Result**: Supports 4 modes (procedural, ai, hybrid, parallel); npm scripts added

4. [x] **Create tile generation prompt templates** ✅
   - **Acceptance**: `content/ai_jobs/tile_prompts/` contains category-specific prompt templates (floor, wall, object, decal)
   - **Files**: `content/ai_jobs/tile_prompts/*.md`
   - **Result**: system_prompt.md, floor_template.md, object_template.md created

5. [x] **Implement tile intake into registry** ✅
   - **Acceptance**: Generated tiles auto-register in `registry.tiles` with id/path/category/size
   - **Files**: `scripts/build-asset-index.mjs`, `content/registry_config.json`
   - **Result**: Asset index now classifies tile.* files from generated/tiles/, validates 32x32

6. [x] **Add LDtk tileset export integration** ✅
   - **Acceptance**: `npm run gen:ldtk:tilesets` produces LDtk-compatible tileset definitions from manifest
   - **Files**: `scripts/generate-ldtk-tilesets.mjs`
   - **Result**: Generates `_scotus_tileset_def.json` + `_tile_mapping.json`; 28/230 tiles (P0 complete)

7. [x] **Validate tile completeness per room** ✅
   - **Acceptance**: `npm run validate` fails if room references tile not in manifest or missing from generated/
   - **Files**: `scripts/validate.js`
   - **Result**: validateTileCompleteness() added, reports completion % and warns on missing tiles

## Do Not Touch

- `src/game/scenes/WorldScene.ts` (no runtime changes)
- `src/content/registry.ts` (loader API stable)
- Existing `generated/ai-manifest.json` structure (extend, don't replace)
- UI isolation invariant

## Gate Command

```bash
npm run check:fast
```

## Notes

### Tile Count Summary (from inventory)

| Category | Count | Reuse Potential |
|----------|-------|-----------------|
| **Shared Core** | ~50 tiles | 90%+ rooms |
| **scotus_lobby** | ~20 unique | lobby only |
| **room.scotus_hall_01** | ~10 unique | halls |
| **courtroom_main** | ~25 unique | courtroom |
| **robing_room** | ~12 unique | robing |
| **press_room** | ~15 unique | press |
| **records_vault** | ~15 unique | vault |
| **library** | ~20 unique | library |
| **cafeteria** | ~18 unique | cafeteria |
| **courthouse_exterior** | ~20 unique | exterior |
| **chambers_*** | ~25 shared + ~9 per-justice overlays | 9 chambers |

**Total unique tiles**: ~250
**Effective tiles (with reuse)**: ~180 generation jobs

### Manifest Schema (proposed)

```json
{
  "$schema": "./TilesetManifest.schema.json",
  "version": "1.0",
  "tileSize": 32,
  "lightDirection": "NW",
  "tiles": [
    {
      "id": "tile.floor.marble.white_base",
      "category": "floor",
      "subcategory": "marble",
      "autotile": true,
      "variants": 3,
      "palette": ["#F5F5F5", "#E0E0E0", "#BDBDBD", "#9E9E9E"],
      "description": "Off-white marble with subtle gray veining; 2-3px clusters",
      "rooms": ["scotus_lobby", "room.scotus_hall_01", "courtroom_main"]
    }
  ]
}
```

### Room Requirements Schema (proposed)

```json
{
  "rooms": {
    "scotus_lobby": {
      "required": ["tile.floor.marble.*", "tile.trim.stone_*", "tile.object.rope_*"],
      "optional": ["tile.decal.sign_*"],
      "uniqueTiles": ["tile.floor.lobby_mosaic_*", "tile.object.bench_marble_*"]
    }
  }
}
```

### Pixel Best Practices (embedded in prompts)

1. **Autotile completeness**: base + 3 variants + edges/corners/T/cross
2. **Seam discipline**: no highlights terminating at borders
3. **Cluster shading > dithering**: clean 3-5 shade ramps
4. **Global light NW**: never violate
5. **No subpixel AA**: palette steps only
6. **Silhouette first**: recognizable beats accurate at 32×32

### Agent Workflow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Gemini    │ ──── │  manifest +  │ ──── │   Claude    │
│ Coordinator │      │   prompts    │      │ pixel-mcp   │
└─────────────┘      └──────────────┘      └─────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐                           ┌─────────────┐
│ room_tile_  │                           │ generated/  │
│ requirements│                           │ tiles/*.png │
└─────────────┘                           └─────────────┘
       │                                          │
       └──────────────────┬───────────────────────┘
                          ▼
                  ┌───────────────┐
                  │ npm run       │
                  │ prepare:content│
                  └───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ LDtk tileset  │
                  │ integration   │
                  └───────────────┘
```

### Priority Order (for incremental generation)

1. **P0 - Shared Core** (unblocks all rooms): floors, walls, doors, columns
2. **P1 - Lobby + Hall** (entry experience): mosaic, stanchions, benches
3. **P2 - Courtroom** (main gameplay): bench, dais, gallery
4. **P3 - Chambers Kit** (9 rooms, high reuse): office furniture, shared decor
5. **P4 - Support Rooms**: library, cafeteria, vault, press, robing
6. **P5 - Exterior**: grass, sidewalk, steps
7. **P6 - Humor Decals**: signs, gag props (can ship without)
