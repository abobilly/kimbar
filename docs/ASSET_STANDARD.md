# Kimbar Asset Management Standard

> **Version**: 1.0.0
> **Status**: Draft
> **Last Updated**: 2026-01-15

This document defines the comprehensive, time-stable standard for all asset management in the Kimbar project. It covers discovery, generation, sourcing, integration, and quality assurance for all visual and audio assets.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Asset Taxonomy](#asset-taxonomy)
3. [Directory Structure](#directory-structure)
4. [Asset Sourcing Strategy](#asset-sourcing-strategy)
5. [Procedural Generation Pipeline](#procedural-generation-pipeline)
6. [Quality Gates](#quality-gates)
7. [Registry Integration](#registry-integration)
8. [UI Asset Specifications](#ui-asset-specifications)
9. [Sprite Asset Specifications](#sprite-asset-specifications)
10. [Prop Asset Specifications](#prop-asset-specifications)
11. [Tile Asset Specifications](#tile-asset-specifications)
12. [Audio Asset Specifications](#audio-asset-specifications)
13. [Screenshot-Driven Development](#screenshot-driven-development)
14. [Migration Workflow](#migration-workflow)

---

## Core Principles

### 1. Registry-First Architecture
**Every asset must be addressable via the central registry.** No hardcoded paths in runtime code.

```typescript
// CORRECT
const sprite = registry.sprites['npc.justice_thomas'];
await loadRegistryAssets(scene, { sprites: [sprite.id] });

// FORBIDDEN
scene.load.image('thomas', '/assets/sprites/thomas.png');
```

### 2. Deterministic Pipelines
**All generated assets must be reproducible.** Given the same inputs, the pipeline must produce byte-identical outputs.

- Sorted keys in manifests
- Stable IDs (no timestamps, no UUIDs unless seeded)
- Version-controlled generation scripts

### 3. Pixel-Perfect Consistency
**All assets must adhere to the LPC pixel art standard:**

| Property | Value |
|----------|-------|
| Tile Grid | 32×32 pixels |
| Character Frames | 64×64 pixels |
| Runtime Scale | 2× (pixel snapping required) |
| Color Depth | Indexed palette (16-32 colors per asset) |
| Anti-aliasing | NONE (hard pixel edges) |

### 4. Theme Cohesion
**Neo-Classical SCOTUS aesthetic:**

| Element | Palette |
|---------|---------|
| Marble | `#d6d9de` (base), `#b2b7bf` (shadow), `#f1f3f6` (highlight) |
| Wood | `#7a4b2b` (base), `#5c3520` (shadow), `#9a6a3a` (highlight) |
| Brass/Gold | `#caa24a` (base), `#e3c46a` (highlight), `#8b6c2b` (shadow) |
| UI Background | `#1a1a2e` (navy), `#4a90a4` (teal accents) |
| Legal Accents | `#6b2430` (burgundy), `#9a2f3a` (seal red) |

### 5. Layered Sourcing
**Asset sourcing follows a priority hierarchy:**

1. **Existing Assets** - Use what's in `vendor/` first
2. **LPC-Compatible Search** - Find OGA/itch.io assets matching style
3. **Procedural Generation** - Extend `tools/tailor/` for new asset types
4. **AI-Assisted Generation** - Last resort, requires human review

---

## Asset Taxonomy

### Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| **UI** | Interface elements, overlays, HUD | Dialogue boxes, buttons, panels, icons |
| **Sprites** | Animated characters | Kim, Justices, NPCs |
| **Props** | Static world objects | Gavels, plants, furniture |
| **Tiles** | Repeating floor/wall patterns | Marble floors, wood panels |
| **Portraits** | Character face closeups | Dialogue portraits |
| **Audio** | Sound effects, music | Gavel tap, ambient court |
| **Effects** | Particle/animation effects | Sparkles, highlights |

### Asset State Machine

```
SPEC → SOURCED → VALIDATED → REGISTERED → DEPLOYED
  │       │           │           │            │
  │       │           │           │            └─ public/
  │       │           │           └─ generated/registry.json
  │       │           └─ npm run validate
  │       └─ vendor/ or generated/
  └─ content/asset_specs/
```

---

## Directory Structure

```
kimbar/
├── content/                          # AUTHORED SOURCE
│   ├── asset_specs/                  # Asset sourcing contracts
│   │   ├── ui_components.json        # UI asset requirements
│   │   ├── props_mvp.json           # Prop requirements
│   │   └── tiles_courthouse.json    # Tile requirements
│   ├── characters/                   # Character specs
│   └── rooms/                        # Room/level specs
│
├── vendor/                           # EXTERNAL ASSETS (versioned)
│   ├── lpc/                          # LPC base library
│   │   ├── spritesheets/            # Body part layers
│   │   └── custom/                  # Custom overlays (robes)
│   ├── ui/                          # UI asset sources
│   │   ├── lpc_pennomi/             # Pennomi UI kit
│   │   ├── lpc_pennomi_expansion/   # Extended UI kit
│   │   ├── rpg_gui_kit/             # RPG GUI kit
│   │   └── golden/                  # Golden theme elements
│   ├── tilesets/                    # Floor/wall tiles
│   └── props/                       # Static props
│
├── tools/                            # GENERATION TOOLS
│   ├── tailor/                       # Sprite generation pipeline
│   │   ├── 01_slice.py              # Explode sheets to frames
│   │   ├── 02_tailor.py             # Composite + validate
│   │   └── 03_stitch.py             # Reassemble to sheet
│   ├── ulpcg/                        # ULPCG submodule
│   ├── ui-slicer/                   # 9-slice UI processor (NEW)
│   └── asset-scout/                 # OGA/itch.io search tool (NEW)
│
├── generated/                        # BUILD OUTPUT (gitignored)
│   ├── sprites/                      # Character spritesheets
│   ├── portraits/                    # Character portraits
│   ├── ui/                          # Processed UI assets
│   ├── registry.json                # Central asset registry
│   └── asset_index.ndjson           # Full asset manifest
│
├── public/                           # RUNTIME ASSETS
│   ├── assets/                       # Static assets
│   │   ├── ui/                      # UI elements
│   │   ├── props/                   # World props
│   │   └── tiles/                   # Tilesets
│   ├── content/                      # Dynamic content
│   │   ├── ldtk/                    # Level files
│   │   └── cards/                   # Flashcards
│   └── generated/                    # Synced from generated/
│
└── schemas/                          # VALIDATION SCHEMAS
    ├── UIAssetSpec.schema.json       # UI asset contract
    ├── PropSpec.schema.json          # Prop contract
    └── TileSpec.schema.json          # Tile contract
```

---

## Asset Sourcing Strategy

### Decision Tree

```
Need asset?
    │
    ├─ Check vendor/ ──────────────────> USE EXISTING
    │       │
    │       └─ Not found
    │              │
    ├─ Search OGA/itch.io ─────────────> DOWNLOAD + ADAPT
    │   (Context7 or manual)                   │
    │       │                                  │
    │       └─ Not found / poor fit            │
    │              │                           │
    ├─ Procedural generation ──────────> tools/tailor/
    │   (extend existing pipeline)             │
    │       │                                  │
    │       └─ Too complex                     │
    │              │                           │
    └─ AI-assisted generation ─────────> Gemini/nanobanana
        (requires human QA review)             │
                                              │
                                   ┌──────────┴──────────┐
                                   │                     │
                              vendor/                generated/
                           (if external)           (if generated)
```

### Sourcing Priority Matrix

| Asset Type | Priority 1 | Priority 2 | Priority 3 |
|------------|-----------|-----------|-----------|
| UI Panels | LPC Pennomi | Procedural 9-slice | AI generate |
| Buttons | LPC Pennomi | Golden UI | Procedural |
| Characters | ULPCG + Tailor | — | — |
| Props | OGA Search | AI + Review | Procedural |
| Tiles | LPC Tilesets | OGA Search | Procedural |
| Portraits | Tailor pipeline | AI + Review | — |
| Icons | LPC sets | Procedural | AI + Review |

### Context7 Search Workflow

```bash
# 1. Resolve library ID
mcp context7 resolve-library-id \
  --query "LPC pixel art UI elements for RPG" \
  --libraryName "lpc-ui"

# 2. Query documentation
mcp context7 query-docs \
  --libraryId "/lpc/opengameart" \
  --query "9-slice dialogue box panel marble texture"

# 3. Download and validate
tools/asset-scout/download.py \
  --url "https://opengameart.org/..." \
  --dest vendor/ui/new_panel/ \
  --license "CC-BY-SA-3.0,CC0"
```

---

## Procedural Generation Pipeline

### tools/tailor/ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TAILOR PIPELINE                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  INPUT                    PROCESS                OUTPUT │
│  ─────                    ───────                ────── │
│                                                         │
│  vendor/lpc/          ┌─────────────┐                   │
│  spritesheets/   ───> │ 01_slice.py │ ───> temp/frames/ │
│  (832×1344)           │  Explode    │      (64×64 each) │
│                       └─────────────┘                   │
│                              │                          │
│                              ▼                          │
│  config_*.json        ┌─────────────┐                   │
│  (layer rules)   ───> │ 02_tailor.py│ ───> temp/composited/
│                       │  Composite  │      (validated)  │
│                       │  + Validate │                   │
│                       └─────────────┘                   │
│                              │                          │
│                              ▼                          │
│                       ┌─────────────┐   generated/      │
│                       │ 03_stitch.py│ ──> sprites/*.png │
│                       │  Reassemble │     (832×1344)    │
│                       └─────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Extension Points

**New: tools/ui-slicer/** - 9-slice UI processor
```python
# ui-slicer/slice_panel.py
def process_9slice(
    source_png: Path,
    output_dir: Path,
    corners: int = 8,      # Corner size in pixels
    min_center: int = 16   # Minimum stretchable center
) -> NineSliceManifest:
    """
    Slice source image into 9-slice components:
    - corner_tl, corner_tr, corner_bl, corner_br (fixed)
    - edge_t, edge_b, edge_l, edge_r (repeating)
    - center (stretchable)
    """
```

**New: tools/asset-scout/** - Asset search/download
```python
# asset-scout/search.py
def search_oga(
    query: str,
    tags: list[str],
    licenses: list[str] = ["CC0", "CC-BY-3.0", "CC-BY-SA-3.0"]
) -> list[AssetResult]:
    """Search OpenGameArt for matching assets"""
```

---

## Quality Gates

### Automated Validation

```bash
# Run full asset validation
npm run validate:assets

# Individual checks
npm run validate:assets:dimensions  # Check pixel dimensions
npm run validate:assets:palette     # Check color compliance
npm run validate:assets:registry    # Check registry consistency
npm run validate:assets:licenses    # Check license compliance
```

### Validation Rules

| Check | Rule | Failure Action |
|-------|------|----------------|
| Dimensions | Must be multiple of 32 (tiles) or 64 (sprites) | Block |
| Palette | Max 32 colors, must include theme colors | Warn |
| Anti-aliasing | No semi-transparent edge pixels | Block |
| File size | UI < 50KB, Sprites < 200KB, Tiles < 100KB | Warn |
| Naming | `{category}_{name}_{variant}.png` | Block |
| Registry | All assets must have registry entry | Block |
| License | Must be in allowlist | Block |

### Visual Regression

```bash
# Capture baseline screenshots
npm run screenshot:capture

# Compare against baseline
npm run screenshot:compare

# Update baseline after intentional changes
npm run screenshot:update
```

---

## Registry Integration

### Registry Schema Extension

```typescript
// generated/registry.json
{
  "buildId": "20260115-abc123",
  "assets": {
    "ui": {
      "dialogue_panel": {
        "id": "ui.dialogue_panel",
        "path": "/assets/ui/golden/dialogue_panel.png",
        "type": "9slice",
        "corners": 8,
        "minWidth": 200,
        "minHeight": 100,
        "variants": ["default", "hover", "pressed"]
      },
      "button_primary": {
        "id": "ui.button_primary",
        "path": "/assets/ui/golden/button_primary.png",
        "type": "9slice",
        "corners": 4,
        "states": ["default", "hover", "pressed", "disabled"]
      }
    },
    "sprites": { /* existing */ },
    "props": { /* existing */ },
    "tiles": {
      "floor_marble": {
        "id": "tile.floor_marble",
        "path": "/assets/tiles/marble_floor.png",
        "tileWidth": 32,
        "tileHeight": 32,
        "variants": ["clean", "cracked", "ornate"]
      }
    }
  }
}
```

### Asset Loader API Extension

```typescript
// src/content/asset-loader.ts

// Existing
queueRegistrySpriteLoads(scene, ids: string[]): void
queueRegistryPropLoads(scene, ids: string[]): void

// New
queueRegistryUILoads(scene, ids: string[]): void
queueRegistryTileLoads(scene, ids: string[]): void
loadNineSlice(scene, id: string, width: number, height: number): Phaser.GameObjects.NineSlice
```

---

## UI Asset Specifications

### Component Inventory

| Component | Current State | Target State | Priority |
|-----------|--------------|--------------|----------|
| Dialogue Panel | Golden 9-slice | Marble/brass theme | P0 |
| Choice Buttons | Golden buttons | Parchment + brass | P0 |
| Name Plate | Plain text | Brass nameplate frame | P1 |
| Portrait Frame | None | Ornate brass frame | P1 |
| HUD Stats Panel | Teal border | Marble panel | P1 |
| Menu Button | Orange hamburger | Brass icon button | P2 |
| Quest Panel | Basic scroll | Parchment scroll | P2 |
| Wardrobe Panel | Basic grid | Oak cabinet style | P2 |
| Flashcard Arena | Basic layout | Courtroom podium | P0 |
| Main Menu | Phaser default | SCOTUS facade | P1 |

### 9-Slice Specifications

```
┌─────┬───────────────────┬─────┐
│ TL  │        TOP        │ TR  │  ← Fixed corners (8px)
├─────┼───────────────────┼─────┤
│     │                   │     │
│ L   │      CENTER       │  R  │  ← Stretchable
│     │                   │     │
├─────┼───────────────────┼─────┤
│ BL  │       BOTTOM      │ BR  │  ← Fixed corners (8px)
└─────┴───────────────────┴─────┘

Standard sizes:
- Dialogue panel: 800×200 (min), 8px corners
- Button: 160×48 (standard), 4px corners
- Small button: 48×48 (icon), 4px corners
- Panel: variable, 8px corners
```

### UI Theme Contract

```json
// content/asset_specs/ui_theme.json
{
  "version": "1.0.0",
  "theme": "neo_classical_scotus",
  "palette": {
    "primary_bg": "#1a1a2e",
    "secondary_bg": "#2d2d44",
    "panel_bg": "#d6d9de",
    "accent": "#caa24a",
    "text_primary": "#f1f3f6",
    "text_secondary": "#b2b7bf"
  },
  "components": {
    "dialogue_panel": {
      "background": "marble_texture",
      "border": "brass_ornate",
      "shadow": "drop_shadow_soft"
    },
    "button": {
      "background": "parchment_texture",
      "border": "brass_simple",
      "hover": "glow_gold",
      "pressed": "inset_shadow"
    }
  }
}
```

---

## Sprite Asset Specifications

### Character Specifications

| Character | Base | Variants | Portrait |
|-----------|------|----------|----------|
| Kim (Player) | Female, light skin | 12 outfits | Yes |
| Justice Thomas | Male, dark skin | Robed, casual | Yes |
| Justice Sotomayor | Female, medium skin | Robed, casual | Yes |
| Justice Roberts | Male, light skin | Robed, casual | Yes |
| Court Clerk | Female, medium skin | Uniform | Yes |
| Bailiff | Male, dark skin | Uniform | Yes |

### Animation Specifications

```
LPC Standard Animation Map (13×21 grid):
Row 0-2: Spellcasting (unused)
Row 3-6: Thrust/combat (unused)
Row 7: Walk up (7 frames)
Row 8: Walk left (7 frames)
Row 9: Walk down (7 frames)
Row 10: Walk right (7 frames)
Row 11-14: Bow/special (unused)
Row 15-18: Combat (unused)
Row 19-20: Falling/hurt (unused)

Used animations:
- idle_down: Row 9, Frame 0 (single frame)
- walk_up: Row 7, Frames 0-6
- walk_left: Row 8, Frames 0-6
- walk_down: Row 9, Frames 0-6
- walk_right: Row 10, Frames 0-6
```

---

## Prop Asset Specifications

### Prop Categories

| Category | Examples | Grid Alignment |
|----------|----------|----------------|
| Furniture | Desks, chairs, podiums | 32×32 or 64×64 |
| Decorative | Plants, columns, statues | 32×32 multiples |
| Interactive | Chests, doors, triggers | 32×32 |
| Legal | Gavels, scales, books | 32×32 |

### Current Placeholder Props (To Replace)

| Placeholder | Target Prop | Priority |
|-------------|------------|----------|
| Green circle | Potted plant (LPC) | P1 |
| Red circle | Battle marker (brass icon) | P0 |
| Yellow circle | Wardrobe chest (oak chest) | P1 |
| Brown circle | Item chest (wooden chest) | P2 |

---

## Tile Asset Specifications

### Tileset Requirements

| Room | Floor Tile | Wall Tile | Accent |
|------|-----------|-----------|--------|
| Courthouse Exterior | Stone plaza | — | Grass edges |
| SCOTUS Lobby | Marble | Wood panels | Brass trim |
| Courtroom | Marble ornate | Oak panels | Red carpet |
| Justice Chambers | Wood parquet | Wallpaper | Bookcases |
| Robing Room | Marble | Marble walls | Lockers |

### Tileset Format

```
Standard LPC tileset: 256×256 or 512×512
- 8×8 or 16×16 tiles of 32×32 each
- Includes: solid, edges, corners, transitions
- Named: tileset_{location}_{material}.png
```

---

## Audio Asset Specifications

### Sound Effect Categories

| Category | Examples | Format |
|----------|----------|--------|
| UI | Click, hover, open, close | OGG, <100KB |
| Gameplay | Correct, wrong, victory | OGG, <200KB |
| Ambient | Court murmur, footsteps | OGG, <500KB |
| Character | Voice barks (optional) | OGG, <100KB |

### Audio Contract

```json
// content/asset_specs/audio.json
{
  "sfx": {
    "gavel_tap": { "required": true, "variants": 3 },
    "button_click": { "required": true },
    "correct_answer": { "required": true },
    "wrong_answer": { "required": true },
    "outfit_unlock": { "required": true },
    "door_open": { "required": false },
    "footstep_marble": { "required": false, "variants": 4 }
  },
  "music": {
    "main_menu": { "required": true, "loop": true },
    "exploration": { "required": true, "loop": true },
    "encounter": { "required": true, "loop": true },
    "victory": { "required": false, "loop": false }
  }
}
```

---

## Screenshot-Driven Development

### Workflow

1. **Capture** - Run E2E tests to generate current-state screenshots
2. **Analyze** - Review screenshots to identify UI/asset gaps
3. **Specify** - Create asset specs based on visual requirements
4. **Source** - Find/generate assets per sourcing strategy
5. **Integrate** - Add to registry, update components
6. **Verify** - Re-run screenshots, compare to baseline

### Screenshot Naming Convention

```
{type}-{room}-{viewport}--{state}.png

Types:
- ss: Static screenshot (no interaction)
- scnst: Scene state (with UI interaction)
- cmp: Component isolation

Examples:
- ss-scotus_lobby-desktop.png
- scnst-scotus_lobby-desktop--COURT_CLERK_DIALOGUE.png
- cmp-dialogue_panel-desktop--choice_hover.png
```

### Screenshot Locations

```
screenshots/           # Golden baseline images
test-results/         # Latest test run output
docs/mockups/         # Design mockups (optional)
```

---

## Migration Workflow

### Phase 1: Inventory & Audit
1. Catalog all existing UI components
2. Screenshot current state
3. Document gaps vs target design

### Phase 2: Asset Sourcing
1. Search Context7/OGA for matching assets
2. Evaluate license compatibility
3. Download to `vendor/` with attribution

### Phase 3: Pipeline Extension
1. Extend `tools/tailor/` for UI processing
2. Create `tools/ui-slicer/` for 9-slice
3. Update build scripts

### Phase 4: Integration
1. Add assets to registry schema
2. Update asset-loader API
3. Refactor UI components to use registry

### Phase 5: Validation
1. Run full test suite
2. Compare screenshots
3. Update baseline

---

## Appendix A: License Allowlist

| License | Status | Notes |
|---------|--------|-------|
| CC0 | Allowed | Public domain |
| CC-BY-3.0 | Allowed | Requires attribution |
| CC-BY-SA-3.0 | Allowed | Requires attribution + share-alike |
| CC-BY-4.0 | Allowed | Requires attribution |
| OGA-BY-3.0 | Allowed | OpenGameArt variant |
| GPL-2.0+ | Conditional | Code only, not assets |
| MIT | Conditional | Code only, not assets |

---

## Appendix B: Tooling Reference

| Tool | Purpose | Location |
|------|---------|----------|
| tailor | LPC sprite generation | `tools/tailor/` |
| ulpcg | ULPC base composition | `tools/ulpcg/` |
| ui-slicer | 9-slice processing | `tools/ui-slicer/` (NEW) |
| asset-scout | OGA/itch.io search | `tools/asset-scout/` (NEW) |
| screenshot-agent | E2E screenshot capture | `scripts/screenshot-agent.mjs` |

---

## Appendix C: Related Documents

- `docs/ART_STYLE_GUIDE.md` - Visual style specifications
- `docs/INVARIANTS.md` - Sacred engineering invariants
- `CLAUDE.md` - Agent instructions
- `conductor/product.md` - Product vision
- `schemas/*.schema.json` - Validation schemas
