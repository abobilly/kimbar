# Object Tile Generation Prompt

## Task
Generate a 32×32 object tile: `{{TILE_ID}}`

## Spec
- **Description**: {{DESCRIPTION}}
- **Palette**: {{PALETTE}}
- **Subcategory**: {{SUBCATEGORY}}

## Object-Specific Rules

### Furniture (desk, table, bench, chair)
1. Show TOP surface (we're looking down)
2. Fill 60-80% of tile area
3. Include SE shadow blob (3-5px, darkest palette color or #00000020)
4. Wood grain: subtle 1px horizontal lines
5. Brass/metal accents: brightest palette color as 1-2px highlight

### Multi-tile Objects (left/mid/right segments)
1. `_left`: Include left terminator, right edge must continue
2. `_mid`: Both edges must connect to neighbors
3. `_right`: Include right terminator, left edge must continue
4. Maintain consistent surface line across segments

### Equipment (camera, microphone, tripod)
1. Simplify silhouette - recognizable shape only
2. Tripod: 3 legs radiating from center
3. Camera: rectangular body with lens circle
4. Cables: coiled shape, don't overdetail

### Props (books, papers, mugs)
1. Tiny scale - imply rather than detail
2. Paper stacks: 2-3px white rectangles with colored tab hints
3. Mugs: simple cylinder silhouette, handle optional
4. Books: colored spine rectangles, no text

### Plants
1. Pot: dark brown base, 6-8px wide
2. Foliage: green clusters above pot
3. Keep playful, not realistic

## Shadow Guidelines
- All objects cast a small SE shadow
- Shadow: 2-4px offset, 20-30% opacity black or darkest palette
- Furniture shadow larger than small props

## Generation Sequence

```
1. create_sprite(32, 32, "rgba")
2. set_palette([{{PALETTE}}])
3. // Draw shadow first (under object)
4. draw_ellipse(shadow_x, shadow_y, shadow_w, shadow_h, shadow_color, filled=true)
5. // Draw main object shape
6. [Draw object based on type]
7. // Add highlights on NW edges
8. draw_pixels([highlight positions with brightest color])
9. export_sprite("png", "{{TILE_ID}}.png")
```

## Multi-Tile Assembly Check
For segmented objects, verify:
- Surface lines align at 0px and 31px x-positions
- Shadow style consistent across segments
- Combined width makes sense (e.g., desk = 64px = 2 tiles)
