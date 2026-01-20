# Floor Tile Generation Prompt

## Task
Generate a 32×32 floor tile: `{{TILE_ID}}`

## Spec
- **Description**: {{DESCRIPTION}}
- **Palette**: {{PALETTE}}
- **Autotile**: {{AUTOTILE}}
- **Variants needed**: {{VARIANTS}}

## Floor-Specific Rules

### Marble Floors
1. Base color fills entire tile
2. Veining: 2-4 connected pixels forming natural curves
3. Vein contrast: max 2 shade steps from base
4. Keep veins sparse (5-10% of tile area)
5. Veins should exit tile edges to continue in neighbors

### Wood Floors
1. Plank seams: vertical lines every 6-8px
2. Grain: subtle horizontal 1px variations
3. Seam color: 1 shade darker than base
4. Knots optional: small 3-4px darker clusters (1-2 per tile max)

### Carpet/Rug Floors
1. Subtle texture via 1-shade-step variation clusters
2. Pattern (if any): 2-3px geometric repeats
3. Edges must match for seamless tiling

### Stone Floors
1. Larger clusters than marble
2. Less veining, more color block variation
3. Optional crack lines (1px, darker shade)

## Generation Sequence

```
1. create_sprite(32, 32, "rgba")
2. set_palette([{{PALETTE}}])
3. draw_rectangle(0, 0, 32, 32, "{{BASE_COLOR}}", filled=true)  // Base fill
4. [Add veining/grain/texture based on subcategory]
5. export_sprite("png", "{{TILE_ID}}.png")
```

## Seamless Tiling Check
After generating, mentally tile 2×2 and verify:
- No harsh edge discontinuities
- Pattern doesn't create obvious grid
- Veins/seams flow naturally across boundaries
