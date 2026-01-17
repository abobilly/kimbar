SCOTUS Exterior (Building-only)

Footprint: 7 rows x 15 cols of 32x32 tiles (480x224).
- Rows 0-1: pediment/entablature
- Rows 2-4: portico/columns/walls + door pixels
- Rows 5-6: steps (walkable)

Files:
- scotus_exterior_building.atlas.png : 15x7 tile atlas (no padding)
- tiles/ : individual 32x32 tiles sliced from the atlas
- scotus_exterior_building.map.json : tile metadata + 15x7 layer data
- scotus_exterior_building.tsx : optional Tiled tileset definition
- scotus_exterior_building.sample.tmx : optional Tiled map placing the tiles

Interaction hint (in map.json -> specialLocations):
- doorGraphic tileId=67 (row4,col7) is decorative and should be solid.
- entranceTrigger tileId=82 (row5,col7) is the suggested interaction tile to enter the lobby.
