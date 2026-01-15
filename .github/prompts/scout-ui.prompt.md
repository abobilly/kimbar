# UI Asset Scout Prompt (Gemini)

## Task
Search OpenGameArt.org for LPC-compatible **UI elements** for a legal-themed flashcard battle game. Output NDJSON to `tmp/candidates/ui.ndjson`.

## Required Elements (Priority Order)
1. **Card frames/borders** - for flashcard display (approximately 200x280px or 9-slice scalable)
2. **Dialog boxes/panels** - speech bubbles, text panels (9-slice preferred)
3. **Buttons** - normal/hover/pressed states (rectangular or ornate)
4. **Progress bars** - HP, XP, mana bars (horizontal, fillable)
5. **Inventory slots** - item containers, card slots
6. **Window frames** - modal borders, scroll decorations
7. **Icons** - checkmark, X, star, coin, heart

## Search Strategy
Run these OpenGameArt searches:
- `"LPC" "UI"` - general LPC UI packs
- `"pixel art" "buttons"` - button sets
- `"pixel art" "dialog box"` OR `"text box"` - panels
- `"pixel art" "card frame"` OR `"playing card"` - card borders
- `"pixel art" "GUI"` OR `"HUD"` - interface elements
- `"9-slice"` OR `"9-patch"` OR `"nine slice"` - scalable panels
- `"fantasy" "UI kit"` - themed interface packs

## UI-Specific Dimension Guidelines
Unlike tilesets (32x32), UI elements vary:
- **Buttons:** 32x16, 48x16, 64x24, or larger
- **Cards:** 180x250, 200x280, or similar card aspect ratios
- **Icons:** 16x16, 24x24, 32x32
- **Panels:** 9-slice scalable (any size, corners 8-16px)
- **Bars:** Variable width, 8-16px height

**REJECT** if:
- Low resolution raster (cannot scale)
- 3D rendered / realistic style (must match pixel art aesthetic)
- Non-transparent backgrounds on icons/buttons

## License Requirements (Same as Assets)
| Acceptable | Reject |
|------------|--------|
| CC0 / Public Domain | NC (No Commercial) |
| CC-BY 3.0/4.0 | ND (No Derivatives) |
| OGA-BY 3.0 | |
| CC-BY-SA 3.0/4.0 | |
| GPL 2.0/3.0 | |

**Prefer CC0 > CC-BY > CC-BY-SA > GPL**

## Output Format (NDJSON)
One JSON object per line to `tmp/candidates/ui.ndjson`:
```json
{"slug":"fantasy_gui_kit","url":"https://opengameart.org/content/fantasy-gui-kit","author":"PixelArtist","license":"CC-BY-SA 4.0","formats":["PNG"],"coverage":["buttons","panels","icons"],"notes":"9-slice panels, 3 button states","verdict":"APPROVE"}
```

### Fields
| Field | Description |
|-------|-------------|
| `slug` | Snake_case identifier (unique) |
| `url` | Full OpenGameArt URL |
| `author` | Original creator(s) |
| `license` | Exact license string |
| `formats` | File formats available: `["PNG", "SVG", "XCF"]` |
| `coverage` | Which UI categories it covers from Required Elements list |
| `notes` | Useful details (scalable? states? color variants?) |
| `verdict` | `APPROVE` or `REJECT` with reason |

## Process
1. **Search** each query above
2. **Inspect** each result's license AND preview images
3. **Verify** pixel art style compatibility
4. **Output** one NDJSON line per pack (APPROVE or REJECT)
5. **Target:** 5-10 approved packs covering all Required Elements

## Example Session Output
```
{"slug":"lpc_gui_base","url":"https://opengameart.org/content/lpc-gui-base","author":"Sharm","license":"CC-BY-SA 3.0","formats":["PNG"],"coverage":["buttons","panels","bars"],"notes":"Core LPC UI, 9-slice panels","verdict":"APPROVE"}
{"slug":"rpg_gui_construction_kit","url":"https://opengameart.org/content/rpg-gui-construction-kit","author":"Lamoot","license":"CC0","formats":["PNG","XCF"],"coverage":["panels","buttons","icons","window_frames"],"notes":"300+ elements, layered source","verdict":"APPROVE"}
{"slug":"3d_buttons_pack","url":"https://opengameart.org/content/3d-buttons","author":"Someone","license":"CC0","formats":["PNG"],"coverage":["buttons"],"notes":"3D rendered style","verdict":"REJECT - style mismatch"}
```

## Do NOT
- Include duplicate packs from previous scouts (check existing NDJSON files)
- Guess licenses - must verify from page
- Approve mixed packs where only one element matches style
- Approve icon packs without transparency
