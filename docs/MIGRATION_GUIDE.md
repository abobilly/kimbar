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
│  content/                          generated/                            │
│    characters/*.json  ───────────▶   characters/*.json                  │
│    ink/*.ink          ───────────▶   ink/*.json                         │
│    rooms/*.json                      sprites/*.png                       │
│    tilesets/*.json                   portraits/*.png                     │
│                                      registry.json                       │
│  assets/               ─────────────────────────────┐                   │
│    props/                                           │                   │
│    tilesets/                                        ▼                   │
│                                    public/assets/  (synced)             │
│                                    public/generated/ (synced)           │
│                                                                          │
│  public/content/       (direct serve - Tiled maps, cards)               │
│    tiled/                                                                │
│    cards/                                                                │
│                                                                          │
│  vendor/lpc/           (gitignored - 915MB ULPC generator)              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Reference

### 1. `content/` — Spec Files (COMMITTED)

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

### 2. `assets/` — Static Art (COMMITTED)

**Purpose**: All committed binary art assets. Synced to `public/assets/` by the pipeline.

```
assets/
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
- ✅ Add new props to appropriate `props/<category>/`
- ✅ Add tileset PNGs to `tilesets/<pack_name>/`
- ❌ Never add generated sprites here (they go to `generated/`)
- ❌ Never add UI assets (UI is now Phaser-native, no PNG themes)

---

### 3. `generated/` — Build Outputs (GITIGNORED)

**Purpose**: All outputs from the content pipeline. Rebuilt by `npm run prepare:content`.

```
generated/
├── characters/       # Processed character JSON
├── sprites/          # Generated character spritesheets (64×64 frames)
├── portraits/        # Character portrait crops
├── ink/              # Compiled Ink dialogue JSON
├── levels/           # Processed level data
├── tilesets/         # Generated tileset manifests
├── ai-sprites/       # AI-generated sprite variations
├── registry.json     # Master content registry (IMPORTANT!)
├── asset_index.ndjson # Searchable asset index
└── content.db        # SQLite database for queries
```

**Rules**:
- ❌ Never manually edit files here
- ❌ Never commit (except `README.md`, `registry.json`)
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
│   ├── rooms/        # Tiled TMX room files (AUTHOR HERE)
│   ├── tilesets/     # TSX tileset definitions
│   ├── tiles/        # PNG tile atlases
│   └── scotus_tileset_contract.json  # Tile ID contract
├── cards/            # Flashcard JSON files
└── ldtk/             # Legacy LDtk files (deprecated)
```

**Rules**:
- ✅ Create new Tiled rooms in `tiled/rooms/`
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
7. `build:tiled` — Build Tiled tilesets
8. `build:asset-index` — Index all assets
9. `sync:public` — Sync to public/
10. `validate` — Validate all content

### Individual Commands
```bash
npm run build:chars        # Character generation only
npm run gen:sprites        # Sprite generation only
npm run compile:ink        # Ink compilation only
npm run build:tiled        # Tiled tileset generation
npm run sync:public        # Sync assets to public/
npm run validate           # Validate content
npm run check              # Full gate (tests + build)
npm run check:fast         # Quick gate (unit tests only)
```

---

## Adding New Content

### Add a New Character

1. Create spec in `content/characters/<name>.json`:
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

3. Sprite appears in `generated/sprites/lawyer_01.png`

---

### Add a New Prop

1. Add PNG to `assets/props/<category>/`:
```
assets/props/legal/evidence_box.png
```

2. Sync to public:
```bash
npm run sync:public
```

3. Reference via registry in game code (never hardcode paths).

---

### Add a New Tiled Room

1. Open Tiled, create new map with:
   - Tile size: 32×32
   - Required layers: `Floor`, `Walls`, `Trim`, `Overlays`, `Collision`, `Entities`

2. Save to `public/content/tiled/rooms/<room_name>.tmx`

3. Add room spec to `content/rooms/<room_name>.json`:
```json
{
  "id": "scotus_new_room",
  "name": "New Room",
  "mapFile": "tiled/rooms/scotus_new_room.tmx",
  "connections": []
}
```

4. Validate:
```bash
npm run validate:tiled
```

---

### Add Ink Dialogue

1. Create dialogue in `content/ink/<story>.ink`

2. Compile:
```bash
npm run compile:ink
```

3. Output appears in `generated/ink/<story>.json`

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
| `assets/` | 31.6MB | 439 | Committed art |
| `content/` | 0.5MB | ~100 | Authored specs |
| `generated/` | 3.7MB | 355 | Build outputs |
| `vendor/lpc/` | 915MB | 109K | External (gitignored) |
| `public/content/` | ~10MB | ~200 | Direct-serve |

---

## Forbidden Actions

1. **Never hardcode paths**: Use registry API, not `/content/...` strings
2. **Never commit generated/**: Except `README.md`, `registry.json`
3. **Never commit vendor/**: 915MB external tools
4. **Never bypass schemas**: All content must validate
5. **Never add UI to world layer**: Use `WorldScene.getUILayer()`

---

## Quick Reference Card

| I want to... | Put it in... | Then run... |
|--------------|--------------|-------------|
| Add a prop PNG | `assets/props/<category>/` | `npm run sync:public` |
| Add a tileset | `assets/tilesets/<pack>/` | `npm run sync:public` |
| Add a character | `content/characters/*.json` | `npm run build:chars && npm run gen:sprites` |
| Add dialogue | `content/ink/*.ink` | `npm run compile:ink` |
| Add a Tiled room | `public/content/tiled/rooms/*.tmx` | `npm run validate:tiled` |
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
