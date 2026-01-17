# Tiled Scaffold Inventory

This document inventories **all** assets under `public/assets/tilesets/` for the Tiled pipeline.

## Summary

- **TSX files**: 11
- **TMX files**: 6
- **PNG files**: 203

## TSX inventory

| TSX file | Referenced PNG | Tile size | Tile count | Columns | Wang sets | Terrain defs | Automapping rules |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| `public/assets/tilesets/lpc/__MACOSX/lpc-floors/._floors.tsx` | — | — | — | — | — | — | Not detected |
| `public/assets/tilesets/lpc/__MACOSX/lpc-walls/._walls.tsx` | — | — | — | — | — | — | Not detected |
| `public/assets/tilesets/lpc/lpc-floors/floors.tsx` | `public/assets/tilesets/lpc/lpc-floors/floors.png` | 32×32 | 2048 | 32 | Yes | No | Not detected |
| `public/assets/tilesets/lpc/lpc-walls/walls.tsx` | `public/assets/tilesets/lpc/lpc-walls/walls.png` | 32×32 | 6144 | 64 | Yes | No | Not detected |
| `public/assets/tilesets/lpc/terrains/terrain-map-v7-repacked.tsx` | `public/assets/tilesets/lpc/terrains/terrain-map-v7-repacked.png` | 32×32 | 16384 | 128 | No | Yes | Not detected |
| `public/assets/tilesets/lpc/terrains/terrain-map-v7.tsx` | `public/assets/tilesets/lpc/terrains/terrain-map-v7.png` | 32×32 | 15562 | 16 | No | Yes | Not detected |
| `public/assets/tilesets/lpc/terrains/terrain-v7.tsx` | `public/assets/tilesets/lpc/terrains/terrain-v7.png` | 32×32 | 2048 | 32 | No | Yes | Not detected |
| `public/assets/tilesets/lpc/victorian/bricks.tsx` | `public/assets/tilesets/lpc/victorian/bricks.png` | 32×32 | 2048 | 32 | No | Yes | Not detected |
| `public/assets/tilesets/lpc/victorian/roofs.tsx` | `public/assets/tilesets/lpc/victorian/roofs.png` | 32×32 | 4096 | 64 | No | Yes | Not detected |
| `public/assets/tilesets/lpc/victorian/terrain-map-v8.tsx` | `public/assets/tilesets/lpc/victorian/terrain-map-v8.png` | 32×32 | 15562 | 16 | No | Yes | Not detected |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/scotus_exterior_building.tsx` | `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/scotus_exterior_building.atlas.png` | 32×32 | 105 | 15 | No | No | Not detected |

## TMX inventory

| TMX file | Map size (tiles) | Tilesets referenced | Layers |
| --- | ---: | --- | --- |
| `public/assets/tilesets/lpc/__MACOSX/office/._office.tmx` | — | — | — |
| `public/assets/tilesets/lpc/office/office.tmx` | 20×20 | cubicles; chair; carpet | background; object |
| `public/assets/tilesets/lpc/terrains/terrain-preview.tmx` | 256×256 | terrain-map-v7.tsx; terrain-v7.tsx | Tile Layer 1 |
| `public/assets/tilesets/lpc/victorian/victorian-preview.tmx` | 128×128 | terrain-map-v8.tsx; vten; windoors; vhouse; roofs.tsx; vacc; bricks.tsx; vwindoors; container; vmkt; vgard; vstreets; food; trees | Trn_1; Trn_2; Trn_3; Bldg_1; Bldg_2; Bldg_3; Bldg_4 |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/scotus_exterior_building.sample.tmx` | 15×7 | scotus_exterior_building.tsx | building |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/victorian-preview.tmx` | 128×128 | terrain-map-v8.tsx; vten; windoors; vhouse; roofs.tsx; vacc; bricks.tsx; vwindoors; container; vmkt; vgard; vstreets; food; trees | Trn_1; Trn_2; Trn_3; Bldg_1; Bldg_2; Bldg_3; Bldg_4 |

## PNG inventory

| PNG file | Dimensions (px) | Referenced by TSX |
| --- | ---: | --- |
| `public/assets/tilesets/lpc/__MACOSX/lpc-floors/._floors.png` | unknown | No |
| `public/assets/tilesets/lpc/__MACOSX/lpc-walls/._walls.png` | unknown | No |
| `public/assets/tilesets/lpc/__MACOSX/lpc-windows-doors-v2/._windows-doors.png` | unknown | No |
| `public/assets/tilesets/lpc/castle.png` | 256×608 | No |
| `public/assets/tilesets/lpc/floors.png` | 1024×2048 | No |
| `public/assets/tilesets/lpc/LPC_house_interior/interior.png` | 512×512 | No |
| `public/assets/tilesets/lpc/LPC_house_interior/preview.png` | 1040×704 | No |
| `public/assets/tilesets/lpc/lpc-floors/floors.png` | 1024×2048 | Yes |
| `public/assets/tilesets/lpc/lpc-walls/walls.png` | 2048×3072 | Yes |
| `public/assets/tilesets/lpc/lpc-windows-doors-v2/windows-doors.png` | 1024×1024 | No |
| `public/assets/tilesets/lpc/office/office.png` | 608×368 | No |
| `public/assets/tilesets/lpc/office/out_chair/0001.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0002.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0003.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0004.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0005.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0006.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0007.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/0008.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_chair/chair.png` | 256×256 | No |
| `public/assets/tilesets/lpc/office/out_floor/0001.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0002.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0003.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0004.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0005.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0006.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0007.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0008.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0009.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0010.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0011.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0012.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0013.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0014.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0015.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/0016.png` | 64×32 | No |
| `public/assets/tilesets/lpc/office/out_floor/carpet.png` | 256×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0001.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0002.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0003.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0004.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0005.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0006.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0007.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0008.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0009.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0010.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0011.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0012.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0013.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0014.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0015.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0016.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0017.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0018.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0019.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0020.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0021.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0022.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0023.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0024.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0025.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0026.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0027.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0028.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0029.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0030.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0031.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/0032.png` | 64×128 | No |
| `public/assets/tilesets/lpc/office/out_walls/cubicles.png` | 256×1024 | No |
| `public/assets/tilesets/lpc/stairs.png` | 256×352 | No |
| `public/assets/tilesets/lpc/terrains/terrain-map-v7-repacked.png` | 4096×4096 | Yes |
| `public/assets/tilesets/lpc/terrains/terrain-map-v7.png` | 512×31488 | Yes |
| `public/assets/tilesets/lpc/terrains/terrain-v7.png` | 1024×2048 | Yes |
| `public/assets/tilesets/lpc/victorian/bricks.png` | 1024×2048 | Yes |
| `public/assets/tilesets/lpc/victorian/container.png` | 512×2048 | No |
| `public/assets/tilesets/lpc/victorian/food.png` | 1024×1024 | No |
| `public/assets/tilesets/lpc/victorian/roofs.png` | 2048×2048 | Yes |
| `public/assets/tilesets/lpc/victorian/terrain-map-v8.png` | 512×31488 | Yes |
| `public/assets/tilesets/lpc/victorian/trees-green.png` | 1024×1024 | No |
| `public/assets/tilesets/lpc/victorian/victorian-accessories.png` | 1024×2560 | No |
| `public/assets/tilesets/lpc/victorian/victorian-garden.png` | 512×2048 | No |
| `public/assets/tilesets/lpc/victorian/victorian-mansion.png` | 1024×2048 | No |
| `public/assets/tilesets/lpc/victorian/victorian-market.png` | 512×2560 | No |
| `public/assets/tilesets/lpc/victorian/victorian-preview.png` | 4096×4096 | No |
| `public/assets/tilesets/lpc/victorian/victorian-streets.png` | 512×3072 | No |
| `public/assets/tilesets/lpc/victorian/victorian-tenement.png` | 1024×3072 | No |
| `public/assets/tilesets/lpc/victorian/victorian-windows-doors.png` | 1024×5120 | No |
| `public/assets/tilesets/lpc/victorian/windows-doors.png` | 1024×1024 | No |
| `public/assets/tilesets/lpc/walls.png` | 2048×3072 | No |
| `public/assets/tilesets/lpc/windows-doors.png` | 1024×1024 | No |
| `public/assets/tilesets/scotus_architecture.png` | 512×96 | No |
| `public/assets/tilesets/scotus_decor.png` | 512×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/Column.png` | 256×640 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/scotus_exterior_building.atlas.png` | 480×224 | Yes |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r00c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r01c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r02c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r03c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r04c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r05c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c00.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c01.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c02.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c03.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c04.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c05.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c06.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c07.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c08.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c09.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c10.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c11.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c12.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c13.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building_pack_v2/scotus_exterior_building_v2/tiles/r06c14.png` | 32×32 | No |
| `public/assets/tilesets/scotus_exterior_building.png` | 480×224 | No |
| `public/assets/tilesets/scotus_floors.png` | 512×64 | No |
| `public/assets/tilesets/scotus_tiles.png` | 512×480 | No |

## Issues / flags

- **Oversized atlases (>2048px in either dimension):**
  - `public/assets/tilesets/lpc/lpc-walls/walls.png` (2048×3072)
  - `public/assets/tilesets/lpc/terrains/terrain-map-v7-repacked.png` (4096×4096)
  - `public/assets/tilesets/lpc/terrains/terrain-map-v7.png` (512×31488)
  - `public/assets/tilesets/lpc/victorian/terrain-map-v8.png` (512×31488)
  - `public/assets/tilesets/lpc/victorian/victorian-accessories.png` (1024×2560)
  - `public/assets/tilesets/lpc/victorian/victorian-market.png` (512×2560)
  - `public/assets/tilesets/lpc/victorian/victorian-preview.png` (4096×4096)
  - `public/assets/tilesets/lpc/victorian/victorian-streets.png` (512×3072)
  - `public/assets/tilesets/lpc/victorian/victorian-tenement.png` (1024×3072)
  - `public/assets/tilesets/lpc/victorian/victorian-windows-doors.png` (1024×5120)
  - `public/assets/tilesets/lpc/walls.png` (2048×3072)
- **Tile sizes (TSX):** 32×32

## Notes

- This inventory includes all subdirectories under `public/assets/tilesets/`.
- `__MACOSX` artifacts are present and can be safely excluded from ingestion.
- Automapping rules were not detected in any TSX.
