# Task: Generate Male Judge Robe Sprite Sheet

## Agent: procedural-artist (Gemini 3 Flash)

## Objective
Create a male judge robe sprite sheet compatible with ULPC standard for use with male justice characters.

## Output Specification

- **File:** `vendor/lpc/custom/torso_robe_judge_male_black.png`
- **Dimensions:** 832 × 1344 pixels (13 columns × 21 rows of 64×64 frames)
- **Format:** PNG with transparency (RGBA)

## LPC Sprite Sheet Layout

The robe must be drawn for each animation frame. LPC standard row order:

| Rows | Animation | Frames per row |
|------|-----------|----------------|
| 0-6  | (unused/spellcast) | 13 |
| 7    | Walk Up (back view) | 9 frames (cols 0-8) |
| 8    | Walk Left | 9 frames |
| 9    | Walk Down (front view) | 9 frames |
| 10   | Walk Right | 9 frames |
| 11-20| (unused/combat) | 13 |

**Critical rows:** 7, 8, 9, 10 (walk cycles). Other rows can be transparent or copies.

## Palette (from ART_STYLE_GUIDE.md)

```python
# Judge Robe Palette
C_OUTLINE = (26, 26, 46)      # Navy UI #1a1a2e - external edges only
C_SHADOW = (53, 53, 69)       # Robe shadow - internal folds
C_BASE = (40, 40, 55)         # Robe base
C_HIGHLIGHT = (60, 60, 80)    # Top-left lit areas
```

## LPC Clothing Physics Rules (CRITICAL)

### Rule 1: 2-Pixel Fold Rule
- Folds are **geometric wedges** (triangles), not 1px lines
- Minimum fold width: 2 pixels

### Rule 2: Inside/Outside Outlining
- **External edges:** Use `C_OUTLINE` (darkest)
- **Internal details (lapels, seams, folds):** Use `C_SHADOW` (NOT outline color)
- This creates fabric volume, not cartoon lines

### Rule 3: Top-Left Light Source
- **Highlights:** Top of shoulders, left side of sleeves
- **Shadows:** Under right arm, right side of robe, below hem

### Rule 4: No Pillow Shading
- Shading is directional (left lit → right dark)
- Never light center with dark edges

### Rule 5: Robe Geometry
- **Shape:** Trapezoid (flares at bottom), NOT tube/rectangle
- **Hem:** Ends at approximately y=58 (pixel within 64×64 frame) to reveal shoes
- **Width:** Matches male body width at shoulders (~20px), flares to ~28px at hem

## Frame Drawing Approach

For each 64×64 frame:

```python
def draw_robe_frame(d, w, h, direction, frame_idx):
    """
    d: ImageDraw
    w, h: 64, 64
    direction: 'up', 'down', 'left', 'right'
    frame_idx: 0-8 for walk cycle
    """
    cx = w // 2  # Center x = 32
    
    # Body coverage area (approximate for male body)
    shoulder_y = 24
    hem_y = 58
    shoulder_width = 10  # Half-width from center
    hem_width = 14       # Flared half-width
    
    # Main robe shape (trapezoid)
    left_shoulder = cx - shoulder_width
    right_shoulder = cx + shoulder_width
    left_hem = cx - hem_width
    right_hem = cx + hem_width
    
    # Draw based on direction
    if direction == 'down':  # Front view
        # Base shape
        d.polygon([
            (left_shoulder, shoulder_y),
            (right_shoulder, shoulder_y),
            (right_hem, hem_y),
            (left_hem, hem_y)
        ], fill=C_BASE, outline=C_OUTLINE)
        
        # Left highlight (top-left light)
        d.polygon([
            (left_shoulder, shoulder_y),
            (left_shoulder + 4, shoulder_y),
            (left_hem + 4, hem_y),
            (left_hem, hem_y)
        ], fill=C_HIGHLIGHT)
        
        # Right shadow
        d.polygon([
            (right_shoulder - 4, shoulder_y),
            (right_shoulder, shoulder_y),
            (right_hem, hem_y),
            (right_hem - 4, hem_y)
        ], fill=C_SHADOW)
        
        # Center fold (uses SHADOW color, not outline)
        d.line([cx, shoulder_y + 12, cx, hem_y], fill=C_SHADOW, width=1)
        
        # Side fold wedges (geometric, not lines)
        d.polygon([
            (cx - 8, hem_y),
            (cx - 10, hem_y),
            (cx - 9, hem_y - 12)
        ], fill=C_SHADOW)
        d.polygon([
            (cx + 8, hem_y),
            (cx + 10, hem_y),
            (cx + 9, hem_y - 12)
        ], fill=C_SHADOW)
```

## Walk Animation Notes

- **Frame 0:** Standing/idle
- **Frames 1-8:** Walk cycle with leg movement
- Robe hem should have subtle sway (±1-2px) on walk frames
- Keep silhouette consistent across frames

## Reference

Use existing female robe as structural reference:
`vendor/lpc/Universal-LPC-Spritesheet-Character-Generator/spritesheets/torso/clothes/robe/female/black.png`

## Validation Checklist

- [ ] 832×1344 pixels total
- [ ] Transparent background (alpha=0)
- [ ] Walk rows (7-10) fully populated
- [ ] Trapezoid shape (not tube)
- [ ] Internal lines use shadow color (not outline)
- [ ] Top-left lighting consistent
- [ ] Hem at y≈58 per frame

## Integration Test

After generation, test with:
```bash
# Copy to custom location
cp vendor/lpc/custom/torso_robe_judge_male_black.png vendor/lpc/Universal-LPC-Spritesheet-Character-Generator/spritesheets/torso/clothes/robe/male/black.png

# Regenerate a male justice
node scripts/generate-sprites.mjs npc.justice_roberts
```
