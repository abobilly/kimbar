# Optional Tools (Non-binding)

This file archives optional tooling notes. It is not a source of binding requirements or READ FIRST material.

## Pixel-MCP (Archived)

### SCOTUS Tileset Generation (January 17, 2026)

#### What Was Done

- **Generated 230 SCOTUS-themed tiles** using pixel-mcp-server (Railway) procedural patterns
- **Fixed pixel-mcp-server bugs**: PNG files now persist for PIL drawing ops; export_sprite prefers PNG over aseprite
- **Assembled tileset**: Combined 230 individual tiles into `scotus_tiles.png` (512x480, 16 columns × 15 rows)
- **Preloader updated**: Now loads both `floor_tiles` (LPC) and `scotus_tiles` (SCOTUS-themed)

#### Tile Categories Generated

| Category | Count | Pattern Used |
|----------|-------|--------------|
| Floor (marble, wood, carpet) | ~40 | noise, stripes_h, checkerboard |
| Wall (stone, wood panel) | ~25 | brick, stripes_v |
| Trim/Border | ~20 | stripes_h |
| Ground (grass, sidewalk) | ~15 | noise, grid |
| Objects (furniture, props) | ~80 | draw_rect, draw_ellipse, grid |
| Decals/Signs | ~30 | draw_rect |
| Doors, Steps, Columns | ~20 | grid, stripes |

#### npm Scripts Added

```bash
npm run gen:tiles              # Generate all 230 tiles via pixel-mcp
npm run gen:tiles:p0           # Generate P0 (highest priority) only
npm run gen:tiles:dry          # Dry run - list tiles without generating
npm run gen:tiles:assemble     # Assemble individual tiles into tileset PNG
```

#### How to Regenerate Tiles

1. **Generate tiles** (requires Railway pixel-mcp server):
   ```bash
   npm run gen:tiles --mode procedural
   ```

2. **Assemble into tileset**:
   ```bash
   npm run gen:tiles:assemble
   ```

3. **Sync to public**:
   ```bash
   npm run sync:public
   ```

#### Why No HuggingFace AI Generation?

The `generate_pixel_art` tool requires `HF_TOKEN` environment variable on Railway. It wasn't set, so we used pure procedural generation instead. To enable AI generation:

1. Add `HF_TOKEN` to Railway environment variables
2. Run with `--mode ai`: `npm run gen:tiles -- --mode ai`

Procedural is faster and produces consistent results; AI would provide more artistic variation.

#### Files Created/Modified

- `scripts/generate-tiles-batch.py` - Batch tile generator with procedural patterns
- `scripts/assemble-tileset.py` - Assembles tiles into single PNG
- `content/ai_jobs/tileset_manifest.json` - 230 tile definitions
- `generated/tiles/*.png` - Individual 32x32 tiles
- `generated/tilesets/scotus_tiles.png` - Combined tileset (512x480)
- `generated/tilesets/scotus_tiles.json` - Tile index mapping
- `src/game/scenes/Preloader.ts` - Added scotus_tiles loading

#### pixel-mcp-server Fixes (pushed to Railway)

- **create_sprite**: No longer deletes PNG after aseprite conversion (PIL needs it)
- **export_sprite**: Now prefers PNG over aseprite (PIL writes to PNG)

### Pixel-MCP (Railway + MCP Config) (January 16, 2026)

#### What Was Done

- Added project-scoped `.mcp.json` to connect Claude Code to the Railway Pixel-MCP SSE endpoint.
- Updated `pixel-mcp-server` health reporting to surface missing LibreSprite (status becomes `degraded` with `runtime` details).
- Added PNG/PIL fallbacks for `create_sprite` and `export_sprite` when LibreSprite isn't present (e.g., when Railway accidentally builds with Nixpacks instead of the Dockerfile).
- Updated `pixel-mcp-server/README.md` to clarify `.mcp.json` location, remove broken 1-click template, and document Railway root-dir/Dockerfile pitfalls + common errors.
- Fixed `scripts/pixel_client.py` so it runs on Windows consoles (no emoji output).
