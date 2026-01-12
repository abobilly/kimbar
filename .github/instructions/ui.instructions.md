---
applyTo: "src/game/ui/**,src/game/systems/**,src/game/scenes/**"
---

# UI Layer / Modal Systems Area

You are operating in the **UI / Modal** area.

## Sacred invariant

All UI must be created on the UI layer (e.g., `WorldScene.getUILayer()`), rendered by the UI camera, unaffected by world camera zoom/scroll.

## Dual Camera Architecture

```
┌────────────────────────────────────────────────────────┐
│  worldCam (main camera)     │  uiCam (fixed camera)    │
│  - Follows player           │  - scroll=(0,0), zoom=1  │
│  - May zoom                 │  - Renders ONLY uiLayer  │
│  - Ignores uiLayer          │                          │
├─────────────────────────────┼──────────────────────────┤
│  Renders:                   │  uiLayer (depth=1000):   │
│  • Tilemap                  │  • Stats panel           │
│  • Player sprite            │  • Menu button           │
│  • NPCs + world labels      │  • EncounterSystem UI    │
│  • Interactables            │  • DialogueSystem UI     │
│  • Trigger zones            │  • Notifications         │
└─────────────────────────────┴──────────────────────────┘
```

## Rules

- Any UI component constructor should take `(scene, uiLayer)` or call `scene.getUILayer()` internally.
- Do not use `scrollFactor` to "pin" UI; fix layering.
- Respect modal priority ordering (Encounter > Dialogue > Menu). Don't create new modal stacks ad hoc.
- Any overlay must:
  - block input to world
  - close on overlay click (unless explicitly designed not to)
  - release input cleanly on close

## How to comply

```typescript
// ✅ CORRECT
const container = this.scene.add.container(x, y);
this.scene.getUILayer().add(container);

// ❌ WRONG - Do not add UI directly to scene
this.scene.add.container(x, y); // This goes to world, not UI!
```

## Key methods in WorldScene

- `setupCameras()` - Creates dual camera system with uiLayer
- `syncCameraIgnoreList()` - Ensures no object rendered by both cameras
- `getUILayer()` - Public accessor for systems to add their containers
- `getUICam()` - Returns the UI camera reference

## Testing expectations

- Test with Z key (dev mode) to toggle world camera zoom - UI should stay fixed
- Add at least one test or validation that would fail if UI elements are added to the world layer
- If adding new UI primitives, add lightweight unit tests for layout/interaction

## Anti-patterns

- Creating UI elements directly via `this.add.*` without attaching to UI layer
- New global input handlers that don't respect modal priority
- Using `scrollFactor` to fake fixed positioning
