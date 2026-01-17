# Tiled Pipeline (SCOTUS)

This directory hosts the **Tiled-first** room pipeline for SCOTUS interiors.
Rooms are authored in Tiled (`.tmx`), using the generated tilesets and a
contract that stabilizes tile IDs for future art swaps.

## Directory Layout

```
public/content/tiled/
├── tiles/                   # PNG atlases (authored or generated)
├── tilesets/                # TSX tilesets (authored or generated)
├── rooms/                   # TMX rooms (authored)
├── schemas/                 # JSON schemas for contract validation
└── scotus_tileset_contract.json
```

## Constraints

- 32×32 tiles only
- Atlas max size: 2048×2048
- Stable tile IDs: **append only** (never reorder)
- Rooms must include required layers:
  - `Floor`, `Walls`, `Trim`, `Overlays`, `Collision`, `Entities`

## Core Files

- `scotus_tileset_contract.json` — Master tileset contract
- `schemas/tiled_contract.schema.json` — Contract schema

## Authoring Flow

1. Edit/add tiles in `scotus_tileset_contract.json` (append only).
2. Regenerate atlases/TSX with `node scripts/build-tiled-tilesets.mjs`.
3. Build rooms in Tiled under `rooms/`.
4. Validate with `node scripts/validate-tiled-maps.mjs`.

## Validation

```
npm run validate:tiled
```

## Notes

- LDtk rooms remain supported; new rooms should use Tiled.
- The contract is the source of truth for tile IDs and categories.
