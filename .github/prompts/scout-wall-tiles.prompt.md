# Scout: Wall Tiles

You are an asset scout. Your job is to find candidate assets from OpenGameArt.org that match the spec. **DO NOT DOWNLOAD FILES.** Output candidates only.

## Asset Spec

Read `content/asset_specs/courthouse_mvp.json` for full constraints. Summary:

- **Tile size:** 32×32 pixels (exact, or 16×16 if upscale allowed)
- **Style:** LPC-compatible top-down pixel art, limited palette, no gradients
- **License (priority order):** CC0 > CC-BY > CC-BY-SA > GPL > OGA-BY
- **REJECT:** CC-BY-NC, CC-BY-ND, unknown license, isometric, blurry

## Assets to Find

1. `tile.wall_wood_panel` - Dark wood wainscoting/paneling wall texture
2. `tile.wall_bookshelf` - Bookshelf wall for library room

## Required Output Format

Output NDJSON (one JSON object per line). Each candidate must have ALL fields:

```
{"assetId":"tile.wall_wood_panel","candidateName":"LPC Interiors - wood wall","sourceUrl":"https://opengameart.org/content/lpc-interiors","downloadUrl":"https://opengameart.org/sites/default/files/interiors.zip","licenseId":"CC-BY 3.0","licenseEvidence":"License field on page: 'Attribution 3.0 Unported (CC BY 3.0)'","author":"Lanea Zimmerman","dimensions":"32x32","dimensionProof":"README states '32x32 tile grid'","tileable":true,"transparentBg":false,"matchScore":0.85,"notes":"wood_panel.png in walls/ folder"}
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

1. Search OpenGameArt for: "LPC walls", "wood panel tiles", "bookshelf RPG", "library tiles pixel art"
2. Check LPC interiors: https://opengameart.org/content/lpc-interior-tiles
3. Check LPC house: https://opengameart.org/content/lpc-house-interior-and-decorations
4. Verify license on each page before adding candidate

## Output

Write results to: `generated/scout_wall_tiles.ndjson`
