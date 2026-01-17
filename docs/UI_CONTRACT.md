# UI Contract

This document defines the canonical UI architecture for kimbar.

## Core Principle: UI Isolation

All UI must be:
1. Created on the **UI layer** (`WorldScene.getUILayer()`)
2. Rendered via the **UI camera** (fixed position, no zoom/scroll)
3. Never attached to the world display list

## Token System

### Spacing
```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};
```

### Colors
```typescript
const COLORS = {
  primary: 0x8B4513,      // Saddle brown (wood panels)
  secondary: 0xD4AF37,    // Gold (accents)
  background: 0x2C1810,   // Dark wood
  text: 0xFFFAF0,         // Floral white
  textMuted: 0xB8A088,    // Tan
  success: 0x228B22,      // Forest green
  error: 0xB22222,        // Firebrick
  disabled: 0x666666      // Gray
};
```

### Typography
```typescript
const FONTS = {
  heading: { fontFamily: 'Georgia', fontSize: '24px' },
  body: { fontFamily: 'Georgia', fontSize: '16px' },
  small: { fontFamily: 'Georgia', fontSize: '12px' },
  button: { fontFamily: 'Georgia', fontSize: '18px', fontStyle: 'bold' }
};
```

## Component Hierarchy

```
UIScene (or UI Layer)
├── StatsPanel (top-left)
│   ├── HP bar
│   ├── Score
│   └── Room name
├── MenuButton (top-right)
├── QuestPanel (toggle with Q)
├── WardrobePanel (toggle with C)
├── DialoguePanel (bottom, triggered by NPC)
│   ├── Speaker portrait
│   ├── Text area (BBCodeText)
│   └── Choice buttons
└── EncounterPanel (center, modal)
    ├── Question card
    ├── Answer choices
    └── Feedback overlay
```

## Layout Rules

1. **Screen anchoring**: Use percentage-based positioning relative to game dimensions
2. **Safe zones**: Keep 16px margin from screen edges
3. **Modal stacking**: Only one modal active at a time; dismiss before opening another
4. **Responsive**: Test at 800x600, 1280x720, 1920x1080

## Interaction States

All interactive elements must handle:
- `idle` — default appearance
- `hover` — highlight/glow
- `active` — pressed state
- `disabled` — grayed out, non-interactive
- `focus` — keyboard navigation indicator

## Choice Buttons

- Disable immediately on selection (prevent double-click)
- Show selected state until next prompt
- Never clip text; wrap or scroll if needed

## Accessibility Notes

- Minimum touch target: 44x44 pixels
- Color contrast: 4.5:1 for normal text
- Keyboard navigation support (future)

## DEV Hooks

For testing/automation:
```typescript
// Set when first scene renders
window.__KIMBAR_READY__ = true;

// Current scene identifier
window.__KIMBAR_SCENE__ = 'scotus_lobby';

// URL params for smoke testing
// ?smoke=1 — deterministic mode (no particles, fixed seed)
// ?ui=dialogue — force dialogue open
// ?ui=encounter — force encounter open
```
