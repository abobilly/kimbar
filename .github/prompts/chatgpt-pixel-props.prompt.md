# ChatGPT Pixel Art Props Generation

## Context
I'm making a 2D pixel art game in the **LPC (Liberated Pixel Cup)** style. I need prop sprites that will be placed in a courthouse environment alongside existing LPC assets.

## CRITICAL Style Requirements

### LPC Pixel Art Rules
- **Grid size:** Each prop should fit in **64x64 pixels** or **32x32 pixels**
- **Palette:** Limited color palette (16-32 colors max per sprite)
- **Outline:** 1-pixel dark outline around all shapes
- **Shading:** Simple 2-3 step shading (highlight → base → shadow)
- **No anti-aliasing:** Hard pixel edges only, NO smooth gradients
- **No dithering patterns** unless very intentional
- **Top-down 3/4 view** (like looking at a table from above at ~45° angle)
- **Clean, readable silhouette** even at small size

### Visual Reference
The style should match these OpenGameArt LPC packs:
- https://opengameart.org/content/lpc-revised-the-office (desks, laptops)
- https://opengameart.org/content/lpc-hand-tools (hammer = our gavel reference)

Think: **SNES/GBA RPG item sprites** - simple, iconic, recognizable.

---

## Props Needed

### 1. Scales of Justice (Balance Scale)
**Dimensions:** 64x64 pixels (can use less, centered)

**Description:**
A classic balance scale / scales of justice - the symbol of law and fairness.

**Must include:**
- Central vertical post/pillar (metallic gold or brass)
- Horizontal balance beam at top
- Two hanging pans/dishes on chains (one on each side)
- Stable base/pedestal at bottom
- Metallic sheen (gold, brass, or silver with pixel highlights)

**Pose:** Balanced (both pans at same height) OR slightly tipped (one pan lower)

**Colors:** 
- Gold/brass tones: #D4AF37, #FFD700, #B8860B, #8B7355
- Highlights: Near-white #FFFACD
- Shadows: Dark brown #4A3C2A
- Optional: Dark outline #1A1A1A

**DO NOT:**
- Make it look 3D rendered
- Add complex textures or gradients
- Include a background (transparent only)
- Add glow effects or particles

---

### 2. Quill Pen (Feather Quill)
**Dimensions:** 32x32 pixels (can use less, centered)

**Description:**
A classic feather quill pen for writing - associated with legal documents, contracts, signing.

**Must include:**
- Feather body (white, cream, or light gray)
- Distinct feather barbs/texture (simplified, 2-3 pixel strokes)
- Pointed metal nib at writing end (gold or silver)
- Optional: Small ink spot at nib tip

**Pose:** Angled as if resting on a desk (~30-45° from horizontal), nib pointing bottom-right

**Colors:**
- Feather: #FFFFFF, #F5F5DC, #E8E8E8
- Feather shadows: #C0C0C0, #A0A0A0  
- Nib: #FFD700 (gold) or #C0C0C0 (silver)
- Nib tip/ink: #1A1A1A or #000080 (dark blue ink)
- Outline: #2A2A2A

**DO NOT:**
- Make it photorealistic
- Add complex feather detail (keep it iconic/simplified)
- Include inkwell (separate prop if needed)
- Add background

---

### 3. Legal Document / Scroll (BONUS if time)
**Dimensions:** 32x32 pixels

**Description:**
A rolled or flat legal document/parchment with a wax seal.

**Must include:**
- Parchment paper (cream/tan color)
- Either: Partially unrolled scroll OR flat document
- Red wax seal (circle with simple stamp impression)
- Optional: Ribbon tied around

**Colors:**
- Parchment: #F5DEB3, #DEB887, #D2B48C
- Seal: #8B0000, #A52A2A
- Ribbon: #8B0000 or #000080

---

## Output Format

For EACH prop, please generate:

1. **The sprite** - PNG with transparent background, exact pixel dimensions
2. **Zoomed preview** - Same sprite scaled 4x or 8x so I can see the pixels clearly

## Validation Checklist (I will verify)

After you generate, I'll check:
- [ ] Correct dimensions (64x64 or 32x32)
- [ ] Transparent background (no white/colored bg)
- [ ] True pixel art (no anti-aliasing, no gradients)
- [ ] Limited palette (count colors, should be <32)
- [ ] 1px outline present
- [ ] Matches LPC top-down 3/4 view style
- [ ] Readable at 1x scale

---

## Generation Instructions for ChatGPT

When generating with DALL-E, please:

1. **First image:** Generate the Scales of Justice at 64x64
2. **Second image:** Generate the Quill Pen at 32x32
3. **Third image (optional):** Generate the Legal Document at 32x32

Use these exact prompts for DALL-E:

### Scales of Justice Prompt:
```
Pixel art sprite of scales of justice, balance scale, 64x64 pixels on transparent background, top-down 3/4 RPG view, gold/brass metal, LPC Liberated Pixel Cup style, SNES RPG item icon, 1-pixel dark outline, limited 16-color palette, no anti-aliasing, no gradients, clean pixel edges, simple 2-step shading
```

### Quill Pen Prompt:
```
Pixel art sprite of feather quill pen, 32x32 pixels on transparent background, top-down 3/4 RPG view, white feather with gold metal nib, LPC Liberated Pixel Cup style, SNES RPG item icon, 1-pixel dark outline, limited 12-color palette, no anti-aliasing, angled as if on desk, clean pixel edges
```

### Legal Document Prompt:
```
Pixel art sprite of legal document parchment with red wax seal, 32x32 pixels on transparent background, top-down 3/4 RPG view, cream/tan paper, LPC Liberated Pixel Cup style, SNES item icon, 1-pixel dark outline, limited 10-color palette, no anti-aliasing, clean pixel edges
```

---

## Notes

DALL-E sometimes struggles with true pixel art. If results look "pixel art inspired" but have:
- Soft edges / anti-aliasing
- Too many colors
- Wrong dimensions
- Background colors

Then we'll need to either:
1. Manually clean up in an editor (Aseprite, GIMP)
2. Fall back to Replicate with a pixel-art-specific model
3. Commission from a pixel artist

But let's see what we get first!
