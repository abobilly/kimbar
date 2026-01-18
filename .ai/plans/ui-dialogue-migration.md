# Plan: UI Dialogue Migration (Phase A1)

## Goal
Implement a consistent UI system using code-first primitives (no old "golden" image assets) and migrate the Dialogue UI to the new system.

## Binding Invariants
1. **UI isolation** — attach via `WorldScene.getUILayer()`; no scrollFactor hacks
2. **Registry-first** — no hardcoded `/content/...` paths
3. **Deterministic** — stable ordering/formatting
4. **Agent-friendly** — npm scripts; validators block regressions
5. **MCP controlled** — allowlisted tools only

## Current State Analysis

### Dialogue UI Location
- [`src/game/systems/DialogueSystem.ts`](../src/game/systems/DialogueSystem.ts) lines 60-180
- Uses `this.scene.add.container()` attached to `WorldScene.getUILayer()`
- Panel: either `ui.panel_frame` image or fallback rectangle (0x1a1a2e)
- Name plate: either `ui.button_normal` image or fallback rectangle
- Text: hardcoded font sizes ('18px', '16px')
- Choices: raw rectangles with hardcoded colors

### UI Layer Location
- [`src/game/scenes/WorldScene.ts`](../src/game/scenes/WorldScene.ts) lines 161-195
- `this.uiLayer = this.add.layer()` with depth=1000
- `getUILayer()` returns the layer

### Existing Constants
- [`src/game/constants.ts`](../src/game/constants.ts)
- UI_MARGIN=20, UI_PADDING=16, UI_GAP=8
- FONT_SM=14, FONT_MD=16, FONT_LG=18, FONT_XL=24, FONT_TITLE=32
- MIN_BUTTON_HEIGHT=36, MIN_CHOICE_HEIGHT=40
- DIALOGUE_BOX_HEIGHT_RATIO=0.32, MIN=200, MAX=320

### Old Assets to Deprecate
- `ui.panel_frame` → `/assets/ui/golden/dialogue_panel.png`
- `ui.button_normal` → `/assets/ui/golden/button_primary.png`
- `ui.button_hover` → `/assets/ui/golden/button_hover.png`
- `ui.button_pressed` → `/assets/ui/golden/button_pressed.png`

## Implementation Steps

### Step 1: Create UI Theme/Tokens (`src/game/ui/uiTheme.ts`)
Create centralized theme tokens extending existing constants:

```typescript
// src/game/ui/uiTheme.ts
import { 
  UI_MARGIN, UI_PADDING, UI_GAP, 
  FONT_SM, FONT_MD, FONT_LG, FONT_XL 
} from '@game/constants';

export const uiTheme = {
  // Spacing scale (derived from constants)
  spacing: {
    xs: UI_GAP / 2,      // 4
    sm: UI_GAP,          // 8
    md: UI_PADDING,      // 16
    lg: UI_MARGIN,       // 20
    xl: UI_MARGIN * 2,   // 40
  },
  
  // Colors (code-first, no images)
  colors: {
    // Panel backgrounds
    panelBg: 0x1a1a2e,
    panelBgAlpha: 0.95,
    panelBorder: 0x4a90a4,
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textAccent: '#FFD700',
    textDisabled: '#666666',
    
    // Button states
    buttonNormal: 0x2a4858,
    buttonHover: 0x3a5868,
    buttonPressed: 0x1a3848,
    buttonDisabled: 0x1a1a2e,
    buttonBorder: 0x4a90a4,
    buttonBorderHover: 0xFFD700,
    
    // Choice states
    choiceNormal: 0x2a3a4a,
    choiceHover: 0x3a4a5a,
    choiceSelected: 0x1a2a3a,
    choiceDisabled: 0x1a1a2e,
  },
  
  // Typography
  fonts: {
    sm: `${FONT_SM}px`,
    md: `${FONT_MD}px`,
    lg: `${FONT_LG}px`,
    xl: `${FONT_XL}px`,
  },
  
  // Border/stroke
  borders: {
    thin: 2,
    normal: 3,
    thick: 4,
  },
  
  // Z-depths (relative to UI layer)
  depth: {
    panel: 0,
    content: 10,
    overlay: 100,
    modal: 1000,
  },
  
  // Animation timing
  timing: {
    fast: 100,
    normal: 200,
    slow: 400,
  },
} as const;

export type UITheme = typeof uiTheme;
```

### Step 2: Create UI Primitives (`src/game/ui/primitives/`)

#### 2a. Panel Primitive
```typescript
// src/game/ui/primitives/UIPanel.ts
// Code-first panel using rectangles with border stroke
// No image assets required
```

#### 2b. Button Primitive  
```typescript
// src/game/ui/primitives/UIButton.ts
// Code-first button with hover/pressed/disabled states
// Uses uiTheme colors, no image assets
```

#### 2c. ChoiceList Primitive
```typescript
// src/game/ui/primitives/UIChoiceList.ts
// Vertical list of choices that disable after selection
// Stacks upward from bottom
```

#### 2d. Label Primitive
```typescript
// src/game/ui/primitives/UILabel.ts
// Text with consistent styling from uiTheme
```

#### 2e. Index export
```typescript
// src/game/ui/primitives/index.ts
export * from './UIPanel';
export * from './UIButton';
export * from './UIChoiceList';
export * from './UILabel';
```

### Step 3: Migrate DialogueSystem

Modify `src/game/systems/DialogueSystem.ts`:
1. Import uiTheme and primitives
2. Replace image-based panel with UIPanel (code-first rectangle)
3. Replace hardcoded font sizes with uiTheme.fonts
4. Replace hardcoded colors with uiTheme.colors
5. Use UIChoiceList for choices with disable-after-select behavior
6. Remove references to `ui.panel_frame` and `ui.button_*` texture keys

### Step 4: Deprecate Old UI Assets

1. Remove sprite references from `src/game/scenes/Preloader.ts` (lines 75-86):
   - Remove `ui.panel_frame`, `ui.button_normal`, `ui.button_hover`, `ui.button_pressed` from uiSpriteIds array

2. Update `content/registry_config.json`:
   - Comment out or remove the ui.* sprite entries (lines 191-210)

3. Create deprecation folder and move assets:
   - Create `public/assets/ui/deprecated/`
   - Move `public/assets/ui/golden/*` to deprecated folder

4. Document deprecation in NEXT_SESSION.md

## Files to Create/Modify

### Create:
- `src/game/ui/uiTheme.ts` — theme tokens
- `src/game/ui/primitives/UIPanel.ts` — panel primitive
- `src/game/ui/primitives/UIButton.ts` — button primitive
- `src/game/ui/primitives/UIChoiceList.ts` — choice list primitive
- `src/game/ui/primitives/UILabel.ts` — label primitive
- `src/game/ui/primitives/index.ts` — barrel export
- `public/assets/ui/deprecated/` — folder for old assets

### Modify:
- `src/game/systems/DialogueSystem.ts` — use new primitives
- `src/game/scenes/Preloader.ts` — remove old UI sprite loading
- `content/registry_config.json` — remove deprecated sprite entries

### Move (deprecation):
- `public/assets/ui/golden/dialogue_panel.png` → `deprecated/`
- `public/assets/ui/golden/button_primary.png` → `deprecated/`
- `public/assets/ui/golden/button_hover.png` → `deprecated/`
- `public/assets/ui/golden/button_pressed.png` → `deprecated/`

## Acceptance Criteria

1. **Theme tokens**: `uiTheme.ts` exports all spacing, colors, fonts, borders
2. **Primitives**: UIPanel, UIButton, UIChoiceList, UILabel created and exported
3. **DialogueSystem**: Uses primitives and theme, no magic numbers
4. **UI Layer**: All elements still attach via `WorldScene.getUILayer()`
5. **Choices**: Disable immediately after selection, remain visually distinct
6. **No clipping**: Panel bounds contain text properly
7. **Modal behavior**: World input blocked when dialogue open
8. **Old assets**: Moved to deprecated folder, no code references remain
9. **Gates pass**: typecheck, test:unit, verify all pass

## Verification Commands

```bash
npm run check-boundaries
npx tsc --noEmit
npm run test:unit
npm run verify
npm run dev  # Manual: confirm lobby loads, open dialogue
```

## Notes

- RexUI is mentioned in rules but NOT currently installed; use code-first Phaser primitives
- Prefer rectangles with stroke over 9-slice images for simplicity
- Keep existing layout.ts calculator; just update DialogueSystem to use theme tokens
