# Asset Pipeline

> **See also**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for comprehensive asset placement guide.

## Overview

All static assets live in the committed `assets/` folder. The pipeline generates character sprites and syncs everything to `public/` for runtime access.

```
content/                    assets/                      generated/
  characters/*.json  ──┐      props/                       sprites/*.png
  rooms/*.json       ──┤      tilesets/                    characters/*.json
  ink/*.ink         ──┤      bg.png, logo.png             ink/*.json
                       ▼                                   registry.json
                 ┌──────────────────────────────────────────────────┐
                 │              npm run prepare:content              │
                 │  fetch-vendor → build:chars → gen:sprites →       │
                 │  compile:ink → build:tiled → build:asset-index →  │
                 │  sync:public → validate                           │
                 └──────────────────────────────────────────────────┘
                                      ▼
                               public/assets/     (synced from assets/)
                               public/generated/  (synced from generated/)
```

## Directory Structure

```
assets/                       # ✅ COMMITTED - All static assets
├── bg.png                   # Background image
├── logo.png                 # Game logo
├── props/                   # Props and decorations
│   ├── legal/              # Gavels, scales, law books
│   ├── office/             # Desks, chairs, computers
│   └── exterior/           # Outdoor items
└── tilesets/               # Tile atlases for Tiled
    ├── lpc/               # LPC-standard tiles
    └── scotus_exterior_building_pack_v2/  # SCOTUS architecture

vendor/                      # ❌ GITIGNORED - Large generators only
└── lpc/Universal-LPC-...   # ULPC Character Generator (~915MB)

generated/                   # ❌ GITIGNORED - Build outputs
├── sprites/                # Character spritesheets
├── characters/             # Processed character JSON
├── ink/                    # Compiled dialogue JSON
├── portraits/              # Character portraits
├── registry.json           # Runtime registry
└── asset_index.ndjson      # Asset search index
```

## Asset Groups

| Group | Count | Description |
|-------|-------|-------------|
| **props/** | ~200 files | Interactive objects (legal, office, exterior) |
| **tilesets/** | ~240 files | LPC tiles + custom SCOTUS architecture |
| **characters/** | Generated | LPC-style 64×64 character sheets |
| **sprites/** | Generated | Individual sprites/animations |

## Commands

```bash
# Full content pipeline (run before dev/build)
npm run prepare:content

# Individual steps
npm run fetch-vendor        # Clone ULPC generator (first time only)
npm run build:chars         # Generate character JSON
npm run gen:sprites         # Generate character spritesheets
npm run compile:ink         # Compile Ink dialogue
npm run build:tiled         # Build Tiled tilesets
npm run build:asset-index   # Index all assets
npm run sync:public         # Sync to public/
npm run validate            # Validate content
```

## Adding New Assets

1. **Props**: Add PNG to `assets/props/<category>/`
2. **Tilesets**: Add atlas PNG to `assets/tilesets/<pack>/`
3. **Characters**: Add spec to `content/characters/`, run `npm run build:chars && npm run gen:sprites`
4. **Tiled rooms**: Add TMX to `public/content/tiled/rooms/`

## Validation

```bash
npm run validate            # Schema + content validation
npm run check:fast          # Quick gate (unit tests only)
npm run check               # Full gate (all tests + build)
```
