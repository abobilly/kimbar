# Plan: Visual Bugs Remediation (January 15, 2026)

**Goal**: Fix double click indicators, mirrored NPC sprites, and document props loading gap
**Issue**: User-reported visual bugs affecting gameplay
**Created**: 2026-01-15

---

## Root Cause Analysis

### Issue 1: Props Not Visible
**Status**: Documented, requires larger registry integration

**Root Cause**: Props are synced to `public/assets/props/` but are not:
1. Registered in `generated/registry.json` (no `props` section exists)
2. Loaded by `Preloader.ts` (only loads `sprites` from registry)
3. Referenced in LDtk levels (no Prop entity type defined)

**Current State**:
- `make_icons.py` generates props to `vendor/props/`
- `sync-public.mjs` copies them to `public/assets/props/`
- 55 files confirmed in `public/assets/props/{exterior,legal,office}/`
- Files ARE deployed to production but never loaded or placed

**Resolution**: Requires registry schema extension + loader integration (separate task)

---

### Issue 2: Double Click Indicators ⚠️ HIGH PRIORITY
**Status**: Root cause identified, fix ready

**Root Cause**: Dual-camera rendering bug in [WorldScene.ts](../../src/game/scenes/WorldScene.ts#L638)

The scene uses a dual-camera system:
- `worldCam`: Renders world objects, follows player
- `uiCam`: Renders UI layer at fixed position

When click indicators are created at runtime (line 638), they are NOT added to the uiCam's ignore list because `syncCameraIgnoreList()` only runs once at scene creation (line 81).

**Result**: Click indicators render on BOTH cameras = 2 visible circles

**Fix**: After creating the click indicator, immediately tell `uiCam` to ignore it:
```typescript
const indicator = this.add.circle(worldPoint.x, worldPoint.y, 8, 0xFFD700, 0.5);
this.uiCam.ignore(indicator);  // <-- ADD THIS
```

---

### Issue 3: Mirrored/Flipped NPC Sprites ⚠️ HIGH PRIORITY
**Status**: Root cause identified, fix ready

**Root Cause**: NPCs spawn with frame 0 and no idle animation set in [WorldScene.ts](../../src/game/scenes/WorldScene.ts#L300)

The ULPC spritesheet layout (from [Preloader.ts](../../src/game/scenes/Preloader.ts#L7-L19)):
- Row 8: Walk Up (back facing)
- Row 9: Walk Left
- Row 10: Walk Down (front facing)
- Row 11: Walk Right

**Frame 0 is in Row 0** which is NOT one of the walk/idle rows - it may be a different animation or have unexpected orientation.

**Current Code** (line 300):
```typescript
const npc = this.add.sprite(entity.x, entity.y, spriteKey, 0)  // frame 0
```

**Fix**: Set NPCs to idle_down animation (facing the player) after creation:
```typescript
const npc = this.add.sprite(entity.x, entity.y, spriteKey)
  .setOrigin(0.5, 1)
  .setDepth(entity.y);

// Play idle animation facing player (down)
const idleKey = `${spriteKey}.idle_down`;
if (this.anims.exists(idleKey)) {
  npc.play(idleKey);
}
```

**Alternative**: Support per-NPC `facing` property from LDtk:
```typescript
const facing = entity.properties?.facing || 'down';
const idleKey = `${spriteKey}.idle_${facing}`;
```

---

## Steps

### 1. [ ] Fix double click indicators
   - **Acceptance**: Single indicator appears per click; verify with Z key (camera zoom toggle)
   - **Files**: [src/game/scenes/WorldScene.ts](../../src/game/scenes/WorldScene.ts#L635-L645)

### 2. [ ] Fix NPC sprite orientation at spawn
   - **Acceptance**: NPCs face forward (down) when spawned; clerk no longer appears mirrored
   - **Files**: [src/game/scenes/WorldScene.ts](../../src/game/scenes/WorldScene.ts#L296-L310)

### 3. [ ] Add debug key to verify NPC animations (optional)
   - **Acceptance**: Press N in dev mode cycles NPC through all directions
   - **Files**: [src/game/scenes/WorldScene.ts](../../src/game/scenes/WorldScene.ts#L590-L615)

### 4. [ ] Verify fixes locally
   - **Acceptance**: `npm run dev`, click ground = 1 indicator, clerk faces forward
   - **Files**: N/A (manual verification)

### 5. [ ] Run gate
   - **Acceptance**: `npm run check:fast` passes
   - **Files**: N/A

### 6. [ ] Document props loading gap for future task
   - **Acceptance**: Issue created or noted in NEXT_SESSION.md
   - **Files**: [NEXT_SESSION.md](../../NEXT_SESSION.md)

---

## Do Not Touch

- `src/game/scenes/Preloader.ts` - Animation definitions are correct (ULPC_ANIMS)
- `scripts/sync-public.mjs` - Props syncing works correctly
- `src/content/registry.ts` - No changes needed for this fix
- Camera setup in `setupCameras()` - The dual-camera design is correct

## Sacred Invariants Preserved

- **UI Isolation**: Fix respects camera system, doesn't use scrollFactor hacks
- **Registry-First**: No hardcoded paths introduced
- **Deterministic Pipelines**: No generated file changes

---

## Gate Command

```bash
npm run check:fast
```

---

## Code Changes Summary

### File 1: `src/game/scenes/WorldScene.ts`

**Change 1**: Click indicator camera isolation (around line 638)
```typescript
// BEFORE
const indicator = this.add.circle(worldPoint.x, worldPoint.y, 8, 0xFFD700, 0.5);
this.tweens.add({

// AFTER  
const indicator = this.add.circle(worldPoint.x, worldPoint.y, 8, 0xFFD700, 0.5);
this.uiCam.ignore(indicator);  // Prevent double-render
this.tweens.add({
```

**Change 2**: NPC spawn animation (around line 300)
```typescript
// BEFORE
const npc = this.add.sprite(entity.x, entity.y, spriteKey, 0)
  .setOrigin(0.5, 1)
  .setDepth(entity.y);

// AFTER
const npc = this.add.sprite(entity.x, entity.y, spriteKey)
  .setOrigin(0.5, 1)
  .setDepth(entity.y);

// Play idle animation facing forward (toward player)
const facing = (entity.properties?.facing as string) || 'down';
const idleKey = `${spriteKey}.idle_${facing}`;
if (this.anims.exists(idleKey)) {
  npc.play(idleKey);
}
```

---

## Notes

### Props Loading (Future Task)
The props system requires:
1. Add `props` section to registry schema (`schemas/AssetRegistry.schema.json`)
2. Modify `scripts/build-asset-index.mjs` to scan `vendor/props/` 
3. Add props to `Preloader.ts` loading
4. Define `Prop` entity type in LDtk
5. Handle prop placement in `WorldScene.renderLevel()`

This is a ~2-4 hour task and should be a separate plan.

### Issue 4: npm.ps1 Opening as Text
This is a Windows file association issue, not a code bug. User should:
- Right-click → "Run with PowerShell", OR
- Run from terminal: `powershell -ExecutionPolicy Bypass -File npm.ps1`, OR
- Fix .ps1 association: Settings → Apps → Default Apps → by file type

---

## Verification Checklist

- [ ] Single click indicator when tapping ground
- [ ] Press Z to zoom worldCam - indicator still single (not stuck at screen center)
- [ ] Court Clerk faces forward (down direction)
- [ ] NPC name tag positioned correctly above sprite
- [ ] No console errors about missing animations
- [ ] `npm run check:fast` passes
