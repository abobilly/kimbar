# Kimbar Art Style Guide

This guide supplements `content/content_contract.json` and `docs/CONTENT_CONTRACT.md`.
It defines the visual style and production rules for all art assets.

## 1. Visual Goals

- Theme: neo-classical SCOTUS with a disciplined, aspirational tone.
- Mood: calm, prestigious, and studious with restrained flair.
- Readability: player and interactables must pop against architecture.
- Consistency: shared lighting, palette, and line weight across assets.

## 2. Grid, Scale, and Resolution

- World grid: 32x32 tiles.
- Character frames: 64x64 ULPC, 13 columns x 21 rows.
- Runtime scale: 2 (pixel snapping required).
- Tileset sizes: multiples of 32 (allowed sizes per content contract).

## 3. Palette (Core)

Use these as anchors; vary subtly per room.

- Marble base: #d6d9de
- Marble shadow: #b2b7bf
- Marble highlight: #f1f3f6
- Vein: #c4ccd6
- Wood base: #7a4b2b
- Wood shadow: #5c3520
- Wood highlight: #9a6a3a
- Brass base: #caa24a
- Brass highlight: #e3c46a
- Brass shadow: #8b6c2b
- Navy UI: #1a1a2e
- Teal stroke: #4a90a4
- Burgundy accent: #6b2430
- Seal red: #9a2f3a

## 4. Lighting and Shadows

- Primary light: top with slight left bias.
- Shadow color: #322125 at ~60% opacity.
- Shadows are short and soft; avoid long cast shadows.
- No dithering; use clean, flat shading bands.

## 5. Linework and Texture

- Tiles/props: darker local color for outlines, no pure black.
- Characters: near-black outlines, no selective outlining.
- Textures: minimal noise; emphasize large forms and clean silhouettes.

## 6. LPC Clothing Physics

When generating clothes or robes for LPC characters:

1. **Drape over form:** Clothes must follow the character's volume (shoulders, chest, hips).
2. **Gravity affects hems:** Bottom edges should hang naturally, not be perfectly straight unless rigid.
3. **Layering logic:** Inner layers (shirts) are tighter; outer layers (robes/coats) are looser.
4. **Fold shading:** Use 3-tone shading (highlight, mid, shadow) to indicate folds where fabric bunches (elbows, waist).
5. **No pillow shading:** Light comes from top-left.
- Detail density: low to medium; avoid cluttered tile patterns.

## 6. Characters (Sprites)

- ULPC rules from content contract are mandatory.
- Silhouettes must be distinct at 64x64.
- Costuming: modern legal attire with a subject-specific accessory.
- Avoid oversized weapons or props.

## 7. Portraits (Dialogue UI)

Use `comfyui/workflows/wf_portrait_v1.json`.

- Resolution: 768x768 PNG, square.
- Framing: head and shoulders, 3/4 view, centered composition.
- Lighting: soft studio light from top-left.
- Background: neutral, non-distracting, no transparency.
- Style: stylized illustration, no photorealism, no pixelization.
- Clean output: no text, watermark, logo, or borders.
- Safe crop: keep face inside central 60% of canvas for 256 or 128 downscale.

## 8. Environment Tiles

- Floor tiles should read at a glance; avoid busy micro-patterns.
- Wall tiles must tile seamlessly and support corners, edges, and trims.
- Use modular column and arch segments for halls and lobbies.

## 9. Props and Set Dressing

- Props must align to 32px grid and bottom-center origin.
- Tall props should be built from stacked tiles for clean depth sorting.
- Keep interactables visually distinct from background props.

## 10. UI Assets

- Panels: flat rectangles, gold headers, teal strokes.
- Buttons: normal, hover, correct, and wrong states.
- Fonts: serif headers (Georgia), simple sans for body.

## 11. Motion and VFX

- Use subtle pulses and fades (no aggressive particles).
- Victory/defeat: small sparkles or burst shapes.
- Locked doors: soft glow or red accent.

## 12. Integration Rules

- Registry-first loading only, no hardcoded asset paths.
- No manual edits in `generated/` or `public/generated/`.
- File naming: snake_case with consistent IDs.
- Follow entity field requirements in LDtk and the content contract.
