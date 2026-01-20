# Kimbar Asset Migration Guide

## Executive Summary

This guide documents the consolidated asset architecture after the major cleanup (commit 966123c). Use this as the single source of truth for where assets live, how they flow through the pipeline, and where new assets should be placed.

---

## Asset Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ASSET FLOW DIAGRAM                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AUTHORED (committed)              GENERATED (gitignored)                │
│  ────────────────────              ───────────────────────               │
│                                                                          │
│  specs/                            public/generated/                    │
│    characters/*.json  ───────────▶   characters/*.json                  │
│    ink/*.ink          ───────────▶   ink/*.json                         │
│    rooms/*.json                      sprites/*.png                       │
│    room_entries/*.json              portraits/*.png                     │
│    tilesets/*.json                  registry/                            │
│                                                                          │
│  public/assets/        (committed, runtime root)                         │
│    props/                                                                │
│    tilesets/                                                             │
│                                                                          │
│  public/content/       (direct serve - Tiled maps, cards)               │
│    tiled/                                                                │
│    cards/                                                                │
│                                                                          │
│  vendor/               (gitignored - ULPC generator + sources)          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

`public/` is the runtime root. Authored specs live in `specs/`, and all build
outputs land in `public/generated/` (gitignored). No sync step is required.

---

## Directory Reference

### 1. `specs/` — Spec Files (COMMITTED)

**Purpose**: Authored JSON/Ink specs that drive the generation pipeline.

| Folder | Contents | Pipeline Step |
|--------|----------|---------------|
| `characters/` | Character definitions (traits, colors, dialogue refs) | `build:chars` → `gen:sprites` |
| `ink/` | Ink dialogue source files (`.ink`) | `compile:ink` |
| `rooms/` | Room specs (entities, connections, metadata) | `build:levels` |
| `room_entries/` | Room entry points and door connections | Validation |
| `tilesets/` | Tileset generation specs | `build:tiled` |
| `asset_specs/` | Asset generation specifications | AI agents |

**Rules**:
- ✅ Edit these files to add new characters, dialogues, rooms
- ✅ Run `npm run prepare:content` after changes
- ❌ Never put binary assets (PNG, JSON) here

---

### 2. `public/assets/` — Static Art (COMMITTED)

**Purpose**: All committed binary art assets. Served directly at `/assets/`.

```
public/assets/
├── props/
│   ├── exterior/     # Outdoor decorations (trees, benches, signs)
│   ├── legal/        # Legal props (gavels, scales, books)
│   └── office/       # Office furniture (desks, chairs, computers)
├── tilesets/
│   ├── lpc/          # LPC-standard floor, wall, door tiles
│   └── scotus_exterior_building_pack_v2/  # SCOTUS exterior architecture
├── bg.png            # Background image
└── logo.png          # Game logo
```

**Rules**:
- ✅ Add new props to appropriate `public/assets/props/<category>/`
- ✅ Add tileset PNGs to `public/assets/tilesets/<pack_name>/`
- ❌ Never add generated sprites here (they go to `public/generated/`)
- ❌ Never add UI assets (UI is now Phaser-native, no PNG themes)

---

### 3. `public/generated/` — Build Outputs (GITIGNORED)

**Purpose**: All outputs from the content pipeline. Rebuilt by `npm run prepare:content`.

```
public/generated/
├── characters/       # Processed character JSON
├── sprites/          # Generated character spritesheets (64×64 frames)
├── portraits/        # Character portrait crops
├── ink/              # Compiled Ink dialogue JSON
├── levels/           # Processed level data
├── tilesets/         # Generated tileset manifests
├── ai-sprites/       # AI-generated sprite variations
├── registry/         # Registries + asset index
│   ├── content.json
│   ├── characters.json
│   └── assets.ndjson
└── content.db        # SQLite database for queries
```

**Rules**:
- ❌ Never manually edit files here
- ❌ Never commit (gitignored)
- ✅ Regenerate with `npm run prepare:content`

---

### 4. `vendor/lpc/` — External Tools (GITIGNORED)

**Purpose**: Large external generators and asset packs (915MB+). Downloaded by `npm run fetch-vendor`.

```
vendor/lpc/
├── Universal-LPC-Spritesheet-Character-Generator/  # Main generator
├── LPC Base Assets/              # Core LPC asset packs
├── _generated/                   # Generator output staging
├── _Palette/                     # Color palettes for sprites
├── Objects/                      # LPC object sheets
├── terrains/                     # LPC terrain tiles
├── victorian/                    # Victorian-era assets
└── [other LPC packs...]
```

**Rules**:
- ❌ Never commit (915MB!)
- ✅ Fetch with `npm run fetch-vendor` (first time only)
- ✅ Reference via asset index, not direct paths

---

### 5. `public/content/` — Direct-Serve Content (COMMITTED)

**Purpose**: Content served directly by Vite without processing.

```
public/content/
├── tiled/
│   ├── templates/    # Room template + schemas
│   ├── supreme-court/# JSON room pack(s)
│   ├── tilesets/     # TSX tileset definitions
│   ├── tiles/        # PNG tile atlases
│   └── scotus_tileset_contract.json  # Tile ID contract
├── cards/            # Flashcard JSON files
└── ldtk/             # Legacy LDtk files (deprecated)
```

**Rules**:
- ✅ Create new Tiled rooms in pack folders (e.g. `tiled/supreme-court/`)
- ✅ Add flashcards to `cards/`
- ❌ Don't add tilesets here; use contract in `tiled/tilesets/`
- ⚠️ LDtk is deprecated; use Tiled for new rooms

---

## Pipeline Commands

### Full Pipeline
```bash
npm run prepare:content
```

Executes in order:
1. `fetch-vendor` — Clone ULPC generator (first time)
2. `import:scotus` — Import SCOTUS tileset
3. `import:lpc` — Import LPC assets
4. `build:chars` — Generate character JSON
5. `gen:sprites` — Generate spritesheets
6. `compile:ink` — Compile Ink dialogues
7. `build:tiled` — Validate + compile Tiled maps
8. `build:levels` — Build unified level index
9. `build:asset-index` — Index all assets
10. `validate` — Validate all content

### Individual Commands
```bash
npm run build:chars        # Character generation only
npm run gen:sprites        # Sprite generation only
npm run compile:ink        # Ink compilation only
npm run build:tiled        # Tiled map validation + compilation
npm run build:levels       # Build level index (Tiled + LDtk)
npm run validate           # Validate content
npm run check              # Full gate (tests + build)
npm run check:fast         # Quick gate (unit tests only)
```

---

## Adding New Content

### Add a New Character

1. Create spec in `specs/characters/<name>.json`:
```json
{
  "id": "lawyer_01",
  "name": "Sarah Chen",
  "body": "light",
  "hair": "ponytail",
  "hair_color": "black",
  "outfit": "suit_navy",
  "dialogueRef": "sarah_chen"
}
```

2. Run pipeline:
```bash
npm run build:chars && npm run gen:sprites
```

3. Sprite appears in `public/generated/sprites/lawyer_01.png`

---

### Add a New Prop

1. Add PNG to `public/assets/props/<category>/`:
```
public/assets/props/legal/evidence_box.png
```

2. Rebuild registry/index:
```bash
npm run build:asset-index
```

3. Reference via registry in game code (never hardcode paths).

---

### Add a New Tiled Room

1. Open Tiled, create new map with:
   - Tile size: 32×32
   - Required layers: `Floor`, `Walls`, `Trim`, `Overlays`, `Collision`, `Entities`

2. Save to `public/content/tiled/<pack>/<room_name>.json`

3. Add room spec to `specs/rooms/<room_name>.json`:
```json
{
  "id": "scotus_new_room",
  "name": "New Room",
  "width": 20,
  "height": 15,
  "tileset": "scotus_floors",
  "entities": []
}
```

4. Validate:
```bash
npm run validate:tiled
```

---

### Add Ink Dialogue

1. Create dialogue in `specs/ink/<story>.ink`

2. Compile:
```bash
npm run compile:ink
```

3. Output appears in `public/generated/ink/<story>.json`

---

## Consolidation Summary (Post-Cleanup)

### What Was Removed (Commit 966123c)

| Item | Size | Reason |
|------|------|--------|
| `assets/ui/golden/` | 1.2MB | Unused UI theme |
| `assets/ui/lpc_pennomi/` | 2.1MB | Unused UI theme |
| `assets/ui/rpg_gui_kit/` | 1.0MB | Unused UI theme |
| `tmp/` | 301 files | Temporary/cache |
| `.cache/` | 68MB | Build cache |
| `workers/gfx-mcp/` | 342MB | Unused MCP worker |
| Duplicate tilesets | ~5MB | Consolidated |
| Deprecated docs | 5 files | Outdated |

### What Remains

| Folder | Size | Files | Purpose |
|--------|------|-------|---------|
| `public/assets/` | 31.6MB | 439 | Committed art |
| `specs/` | 0.5MB | ~100 | Authored specs |
| `public/generated/` | 3.7MB | 355 | Build outputs |
| `vendor/` | 915MB | 109K | External (gitignored) |
| `public/content/` | ~10MB | ~200 | Direct-serve |

---

## Forbidden Actions

1. **Never hardcode paths**: Use registry API, not `/content/...` strings
2. **Never commit public/generated/**
3. **Never commit vendor/**: 915MB external tools
4. **Never bypass schemas**: All content must validate
5. **Never add UI to world layer**: Use `WorldScene.getUILayer()`

---

## Quick Reference Card

| I want to... | Put it in... | Then run... |
|--------------|--------------|-------------|
| Add a prop PNG | `public/assets/props/<category>/` | `npm run build:asset-index` |
| Add a tileset | `public/assets/tilesets/<pack>/` | `npm run build:asset-index` |
| Add a character | `specs/characters/*.json` | `npm run build:chars && npm run gen:sprites` |
| Add dialogue | `specs/ink/*.ink` | `npm run compile:ink` |
| Add a Tiled room | `public/content/tiled/**/*.json` | `npm run validate:tiled` |
| Add flashcards | `public/content/cards/*.json` | — (direct serve) |
| Regenerate everything | — | `npm run prepare:content` |
| Validate everything | — | `npm run check` |

---

## Migration Checklist for Agents

When starting a new session:

- [ ] Run `npm run check:fast` to verify environment
- [ ] Read `NEXT_SESSION.md` for handoff context
- [ ] Use registry API for asset references
- [ ] Update `NEXT_SESSION.md` with changes
- [ ] Run `npm run check` before committing

---

*Last updated: Post-cleanup commit 966123c*
