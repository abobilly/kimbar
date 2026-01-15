# Scout: Courtroom Props

You are an asset scout. Your job is to find candidate assets from OpenGameArt.org that match the spec. **DO NOT DOWNLOAD FILES.** Output candidates only.

## Asset Spec

Read `content/asset_specs/courthouse_mvp.json` for full constraints. Summary:

- **Prop size:** 64×64 pixels (exact, or 32×32 if upscale allowed)
- **Background:** Transparent PNG
- **Style:** LPC-compatible top-down or 3/4 view pixel art, limited palette
- **License (priority order):** CC0 > CC-BY > CC-BY-SA > GPL > OGA-BY
- **REJECT:** CC-BY-NC, CC-BY-ND, unknown license, isometric, blurry

## Assets to Find

1. `prop.gavel_wood` - Wooden judge's gavel (substitute: hammer, mallet)
2. `prop.lawbook_stack` - Stack of leather-bound books (substitute: book stack, tomes)
3. `prop.scales_justice` - Scales of justice (substitute: balance scale)
4. `prop.document_folder` - Legal documents/folder (substitute: papers, scroll, parchment)
5. `prop.podium_wood` - Wooden podium/lectern (substitute: stand, desk)
6. `prop.briefcase` - Leather briefcase (substitute: bag, satchel)

## Required Output Format

Output NDJSON (one JSON object per line). Each candidate must have ALL fields:

```
{"assetId":"prop.gavel_wood","candidateName":"RPG Items - hammer","sourceUrl":"https://opengameart.org/content/rpg-items","downloadUrl":"https://opengameart.org/sites/default/files/items.png","licenseId":"CC0","licenseEvidence":"License field on page: 'CC0 (Public Domain)'","author":"Kenney","dimensions":"64x64","dimensionProof":"Each sprite in grid is 64x64 per description","tileable":false,"transparentBg":true,"matchScore":0.7,"notes":"Hammer sprite, close enough to gavel"}
```

## Rules

1. Find 2-5 candidates per assetId
2. **licenseEvidence** must be EXACT TEXT from the page (quote it)
3. **dimensionProof** must state where you verified size (page text, zip contents, image info)
4. If exact courtroom prop not found, use allowedSubstitutes (books, hammer, etc.)
5. If license is unclear, DO NOT include candidate
6. Prefer CC0/CC-BY over SA/GPL
7. Output raw NDJSON only, no markdown, no commentary

## Search Strategy

1. Search OpenGameArt for: "RPG items", "book sprite", "scroll pixel art", "furniture RPG", "desk podium"
2. Check Kenney assets: https://opengameart.org/users/kenney
3. Check LPC objects: https://opengameart.org/content/lpc-objects
4. Check medieval items packs for substitute props
5. Verify license on each page before adding candidate

## Output

Write results to: `generated/scout_props.ndjson`
