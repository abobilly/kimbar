# Tiled Pipeline for SCOTUS Rooms

This document describes the **Tiled-first** workflow for authoring SCOTUS rooms.
It complements the existing LDtk pipeline and provides a stable contract for
tileset IDs so maps are resilient to art swaps.

## Why Tiled

- Fast, visual authoring in Tiled (`.tmx`/`.tsx`)
- Supports multi-layer workflows for floors, walls, trim, overlays
- Keeps tile IDs stable via a contract file

## Directory Structure

```
public/content/tiled/
├── tiles/                   # PNG atlases (authored or generated)
├── tilesets/                # TSX tilesets (generated)
├── rooms/                   # TMX rooms (authored)
├── schemas/                 # JSON schemas
└── scotus_tileset_contract.json
```

## Tileset Contract

`scotus_tileset_contract.json` is the source of truth for tile IDs.

Rules:

- **Append only**. Never reorder IDs.
- **Stable atlas IDs** (`scotus_floors`, `scotus_structures`, `scotus_decor`).
- **32×32 tiles only**.
- **Atlases must be ≤2048×2048**.

If you need a new tile, append it to the contract and rebuild tilesets.

## Layer Standards

All rooms must include:

- `Floor`
- `Walls`
- `Trim`
- `Overlays`
- `Collision`
- `Entities`

## Entity Standards

The `Entities` layer is an object layer. Required entities:

- At least one `PlayerSpawn`
- At least one `Door` with `targetLevel` property

Entity properties align with the existing LDtk schema (for consistency).

## Build Commands

```bash
npm run build:tilesets
npm run validate:tiled
```

## Validation

`scripts/validate-tiled-maps.mjs` checks:

- Contract schema
- Atlas size limits
- TSX presence
- Required layers in TMX
- `PlayerSpawn` and `Door` entities

Validation is wired into `npm run verify`.

## LDtk Deprecation

LDtk remains supported for legacy rooms. New SCOTUS rooms should be authored
in Tiled and committed under `public/content/tiled/rooms/`.

## Adding a New Room

1. Copy an existing room from `public/content/tiled/rooms/`.
2. Open in Tiled and edit layers.
3. Ensure `PlayerSpawn` and `Door` exist.
4. Run `npm run validate:tiled`.
