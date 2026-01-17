# Tiled Scaffold Inventory

This document captures the current tileset scaffolding used for the SCOTUS
Tiled pipeline. The goal is to keep a record of the atlas sources used so
future art swaps can target the same slots without breaking maps.

## Atlas Sources

| Atlas | Source | Notes |
| --- | --- | --- |
| `scotus_floors` | `public/assets/tilesets/scotus_floors.png` | Floor base textures |
| `scotus_structures` | `public/assets/tilesets/scotus_architecture.png` | Walls and structural tiles |
| `scotus_decor` | `public/assets/tilesets/scotus_decor.png` | Decorative tiles |

## Contract

The contract lives at:

```
public/content/tiled/scotus_tileset_contract.json
```

This defines tile IDs and atlas allocations. IDs are append-only.

## Notes

- All tiles are 32×32.
- Atlases are capped at 2048×2048.
- This inventory is a living document. Update it when atlas sources change.
