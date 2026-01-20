# Asset Pipeline

> **See also**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for comprehensive asset placement guide.

## Overview

All static assets live in the committed `public/assets/` folder. Authored specs live in `specs/`. Build outputs go to `public/generated/` (gitignored).

```
specs/                      public/assets/               public/generated/
  characters/*.json  ──┐      props/                      sprites/*.png
  rooms/*.json       ──┤      tilesets/                   characters/*.json
  ink/*.ink         ──┤      bg.png, logo.png            ink/*.json
                       ▼                                  registry/
                 ┌──────────────────────────────────────────────────┐
                 │              npm run prepare:content              │
                 │  fetch-vendor → import:scotus → import:lpc →      │
                 │  build:chars → gen:sprites → compile:ink →        │
                 │  build:tiled → build:levels → build:asset-index → │
                 │  validate                                         │
                 └──────────────────────────────────────────────────┘
                                      ▼
                               public/ (runtime root)
```

## Directory Structure

```
public/assets/                # ✅ COMMITTED - All static assets
├── bg.png                   # Background image
├── logo.png                 # Game logo
├── props/                   # Props and decorations
│   ├── legal/              # Gavels, scales, law books
│   ├── office/             # Desks, chairs, computers
│   └── exterior/           # Outdoor items
└── tilesets/               # Tile atlases for Tiled
    ├── lpc/               # LPC-standard tiles
    └── scotus_exterior_building_pack_v2/  # SCOTUS architecture

specs/                        # ✅ COMMITTED - Authored specs
├── characters/              # Character JSON specs
├── ink/                     # Ink dialogue sources
├── rooms/                   # Room specs
└── room_entries/            # Room entry bridge specs

public/content/               # ✅ COMMITTED - Direct-serve content
└── tiled/                   # Tiled maps + templates + tilesets

public/generated/            # ❌ GITIGNORED - Build outputs
├── sprites/                 # Character spritesheets
├── characters/              # Processed character JSON
├── ink/                     # Compiled dialogue JSON
├── portraits/               # Character portraits
└── registry/                # Registry + asset index

vendor/                      # ❌ GITIGNORED - Large generators only
└── lpc/Universal-LPC-...    # ULPC Character Generator (~915MB)
```

## Commands

```bash
# Full content pipeline (run before dev/build)
npm run prepare:content

# Individual steps
npm run fetch-vendor        # Clone ULPC generator (first time only)
npm run import:scotus       # Import SCOTUS source packs
npm run import:lpc          # Import LPC source packs
npm run build:chars         # Generate character JSON
npm run gen:sprites         # Generate character spritesheets
npm run compile:ink         # Compile Ink dialogue
npm run build:tiled         # Validate + compile Tiled maps
npm run build:levels        # Build unified level index
npm run build:asset-index   # Index all assets
npm run validate            # Validate content
```

## Adding New Assets

1. **Props**: Add PNG to `public/assets/props/<category>/`
2. **Tilesets**: Add atlas PNG to `public/assets/tilesets/<pack>/`
3. **Characters**: Add spec to `specs/characters/`, run `npm run build:chars && npm run gen:sprites`
4. **Tiled rooms**: Add JSON to `public/content/tiled/<pack>/`

## Validation

```bash
npm run validate            # Schema + content validation
npm run check:fast          # Quick gate (unit tests only)
npm run check               # Full gate (all tests + build)
```
