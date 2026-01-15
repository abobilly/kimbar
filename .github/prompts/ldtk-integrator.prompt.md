# LDtk Integrator: Wire Tilesets

You are an LDtk integrator. Your job is to patch `_template.ldtk` with tileset definitions so all rooms have working tilesets.

## Prerequisites

- Asset ingestion complete: `vendor/tiles/courthouse_mvp/manifest.json` exists
- Tile atlas built: `vendor/tiles/courthouse_mvp/courthouse_tiles.png`

## Input Files

1. `public/content/ldtk/_template.ldtk` — the template all rooms are based on
2. `vendor/tiles/courthouse_mvp/manifest.json` — list of ingested tiles with layout info

## Tasks

### 1. Add Tileset Definition

In `_template.ldtk`, find `"defs"` → `"tilesets"` array (currently `[]`).

Add a tileset entry:

```json
{
  "__cHei": 2,
  "__cWid": 4,
  "cachedPixelData": null,
  "customData": [],
  "embedAtlas": null,
  "enumTags": [],
  "identifier": "Courthouse_Tiles",
  "padding": 0,
  "pxHei": 64,
  "pxWid": 128,
  "relPath": "../../../vendor/tiles/courthouse_mvp/courthouse_tiles.png",
  "savedSelections": [],
  "spacing": 0,
  "tags": [],
  "tagsSourceEnumUid": null,
  "tileGridSize": 32,
  "uid": 1
}
```

**Calculate dimensions from manifest:**
- `pxWid` = columns × tileSize (e.g., 4 × 32 = 128)
- `pxHei` = rows × tileSize (e.g., 2 × 32 = 64)
- `__cWid` = columns
- `__cHei` = rows

### 2. Update Layer Definitions

Find `"defs"` → `"layers"` array. For each layer that should use tiles:

**Floor layer** (IntGrid or Tiles layer):
- Set `"tilesetDefUid": 1`
- Set `"autoTilesetDefUid": 1` if using auto-layers

**Example layer patch:**
```json
{
  "identifier": "Floor",
  "type": "Tiles",
  "tilesetDefUid": 1,
  ...
}
```

### 3. Create Tile ID Mapping

Document which tile position maps to which asset:

| Grid Position | Tile ID | Asset ID |
|---------------|---------|----------|
| 0,0 | 0 | tile.marble_white |
| 1,0 | 1 | tile.marble_checkered |
| 2,0 | 2 | tile.wood_parquet |
| 3,0 | 3 | tile.carpet_red |
| 0,1 | 4 | tile.wall_wood_panel |
| 1,1 | 5 | tile.wall_bookshelf |

### 4. Paint Example Room

Pick `scotus_lobby.ldtk` as the example room.

In the Floor layer instance, add grid tiles:
- Fill floor area with `tile.marble_checkered` (tileId: 1)
- Use IntGrid values or direct tile painting

**Minimal paint example** (for a 20×15 room, fill with checkered marble):
```json
"gridTiles": [
  { "px": [0, 0], "src": [32, 0], "f": 0, "t": 1 },
  { "px": [32, 0], "src": [32, 0], "f": 0, "t": 1 },
  ...
]
```

Or use auto-layer rules if defined.

### 5. Validation

After patching:
1. Run `npm run validate` — should pass
2. Open `_template.ldtk` in LDtk editor — tileset should appear
3. Verify one room loads in game with tiles visible

## Output

1. Patch `public/content/ldtk/_template.ldtk` with tileset defs
2. Patch `public/content/ldtk/scotus_lobby.ldtk` with example tiles painted
3. Create `docs/TILESET_MAPPING.md` documenting tile positions

## Rules

1. Use relative path from .ldtk file to atlas PNG
2. UID must be unique (start at 1, increment)
3. Do NOT repaint all 17 rooms — just template + 1 example
4. Keep existing entity/layer structure intact
5. Run validation after patching

## Model Recommendation

Use Gemini Pro or Claude for this task (JSON structure manipulation requires precision).
