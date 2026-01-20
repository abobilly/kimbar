# Assets

All game assets live in this folder. **Committed to git** (except ULPC generator).

## Structure

```
assets/
├── bg.png                    # Background image
├── logo.png                  # Game logo
├── characters/               # Generated character spritesheets (from content/characters/*.json)
├── sprites/                  # Generated sprites (from build pipeline)
├── props/                    # Props and decorations
│   ├── legal/               # Legal-themed props (gavel, scales, etc.)
│   ├── office/              # Office furniture and items
│   └── exterior/            # Outdoor props
├── tilesets/                 # Tile atlases for LDtk/Tiled
│   ├── lpc/                 # LPC-standard tilesets
│   ├── scotus_*.png         # Custom SCOTUS building tiles
│   └── scotus_tiles.json    # Tileset metadata
└── ui/                       # UI elements
    ├── golden/              # Golden UI theme
    ├── lpc_pennomi/         # LPC Pennomi UI pack
    └── rpg_gui_kit/         # RPG GUI kit
```

## Asset Groups

| Group | Description | Source |
|-------|-------------|--------|
| **characters/** | LPC-style character spritesheets (64x64 frames) | Generated from `content/characters/*.json` via ULPC |
| **sprites/** | Individual sprites/animations | Generated from build pipeline |
| **props/** | Interactive and decorative objects | Curated from OpenGameArt + procedural |
| **tilesets/** | Tile atlases for level backgrounds | LPC standard + custom SCOTUS |
| **ui/** | Buttons, panels, frames | LPC Pennomi, Golden UI, RPG GUI Kit |

## Adding New Assets

1. **Props**: Add PNG to `assets/props/<category>/`
2. **Tilesets**: Add atlas PNG + JSON to `assets/tilesets/`
3. **UI**: Add to appropriate subfolder in `assets/ui/`
4. **Characters**: Add spec to `content/characters/`, run `npm run build:chars`

## Build Pipeline

```bash
npm run prepare:content   # Generates characters + sprites into assets/
npm run build:asset-index # Indexes all assets for runtime lookup
```

## Licensing

- LPC assets: CC-BY-SA 3.0 / GPL 3.0 (see individual credits)
- Custom assets: See `CREDITS.md` in root
