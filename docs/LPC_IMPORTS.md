# LPC Asset Imports

This repo includes LPC-derived packs that are imported into the runtime asset
pipeline via `npm run import:lpc`. The import script is deterministic and
rebuildable.

## Source Folders

- `content/sources/lpc/terrains-repacked/`
- `content/sources/lpc/victorian-preview/`
- `content/sources/lpc/trees/`
- `content/sources/lpc/victorian-preview/windows-doors.objects.json` (object map)

## Output Targets

- Tilesets: `vendor/tilesets/lpc/terrains/*`, `vendor/tilesets/lpc/victorian/*`
- Windows/doors tileset: `vendor/tilesets/lpc/windows-doors.png`
- Windows/doors object crops: `vendor/props/exterior/lpc_*.png`
- Trees (downscaled): `vendor/props/exterior/lpc_tree_*.png`
- Object pairing map: `content/tilesets/windows-doors.parts.json`
- Tileset registry: `content/tilesets/tilesets.json`
- Credits: `docs/credits/lpc-terrains/` and `docs/credits/lpc-victorian/`

## Windows/Doors Pairing Convention

`content/tilesets/windows-doors.parts.json` captures how 32x32 tiles should be
paired to compose multi-tile objects.

Each object entry includes:
- `tileX`, `tileY`, `tilesWide`, `tilesHigh`
- `parts[]`: row-major list of 32x32 tiles with `dx`, `dy`, `tileX`, `tileY`,
  and `tileIndex`
- `propId`: cropped sprite ID for quick placement as a prop

Cluster entries and low-confidence blocks are skipped.

## Tileset Registry Notes

`content/tilesets/tilesets.json` records every tileset image with a registry ID
and runtime URL. These IDs follow the `tileset.*` namespace and are loaded via
the registry at runtime. Legacy Phaser keys are preserved with a `key` override
for `scotus_tiles`, `floor_tiles`, and `lpc_windows_doors`.

The registry file is synced into `public/content/tilesets` during
`npm run sync:public` so it can be fetched at runtime.

## Usage

```bash
npm run import:lpc
npm run prepare:content
npm run sync:public
```

## Credits

The Victorian preview bundle is CC-BY-SA 4.0 and requires attribution. The
import script copies all `CREDITS-*.txt` files into `docs/credits/` and keeps
the originals alongside the tilesets under `vendor/tilesets/lpc/`.
