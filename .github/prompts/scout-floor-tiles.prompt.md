# Scout: Floor Tiles

You are an asset scout. Your job is to find candidate assets from OpenGameArt.org that match the spec. **DO NOT DOWNLOAD FILES.** Output candidates only.

## Asset Spec

Read `content/asset_specs/courthouse_mvp.json` for full constraints. Summary:

- **Tile size:** 32×32 pixels (exact, or 16×16 if upscale allowed)
- **Style:** LPC-compatible top-down pixel art, limited palette, no gradients
- **License (priority order):** CC0 > CC-BY > CC-BY-SA > GPL > OGA-BY
- **REJECT:** CC-BY-NC, CC-BY-ND, unknown license, isometric, blurry

## Assets to Find

1. `tile.marble_white` - White/cream marble floor, polished, subtle veining
2. `tile.marble_checkered` - Black/white checkered marble, chess pattern
3. `tile.wood_parquet` - Wooden parquet/plank floor, oak/brown
4. `tile.carpet_red` - Red carpet/velvet texture

## Required Output Format

Output NDJSON (one JSON object per line). Each candidate must have ALL fields:

```
{"assetId":"tile.marble_white","candidateName":"LPC Terrain Repack - marble","sourceUrl":"https://opengameart.org/content/lpc-terrain","downloadUrl":"https://opengameart.org/sites/default/files/terrain.zip","licenseId":"CC-BY-SA 3.0","licenseEvidence":"License field on page: 'CC-BY-SA 3.0'","author":"Sharm, Hyptosis, Johann C","dimensions":"32x32","dimensionProof":"Stated in description: '32x32 tiles'","tileable":true,"transparentBg":false,"matchScore":0.9,"notes":"Contains marble_light.png in floors/ folder"}
```

## Rules

1. Find 2-5 candidates per assetId
2. **licenseEvidence** must be EXACT TEXT from the page (quote it)
3. **dimensionProof** must state where you verified size (page text, zip contents, image info)
4. If exact asset not found, use allowedSubstitutes from spec
5. If license is unclear, DO NOT include candidate
6. Prefer CC0/CC-BY over SA/GPL
7. Output raw NDJSON only, no markdown, no commentary

## Search Strategy

1. Search OpenGameArt for: "LPC floor tiles", "marble tiles RPG", "wood floor pixel art", "carpet tiles game"
2. Check LPC base assets first: https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
3. Check LPC terrain: https://opengameart.org/content/lpc-terrain
4. Verify license on each page before adding candidate

## Output

Write results to: `generated/scout_floor_tiles.ndjson`
