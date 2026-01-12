# Kimbar Invariants

> These rules are SACRED. Breaking them will cause subtle bugs that are hard to diagnose.
> Every agent working on this codebase MUST read and understand these invariants.

---

## 1. UI Isolation (SACRED)

**Rule**: All UI must be created on the UI layer, rendered only by the UI camera.

**Why**: World camera may zoom/scroll. UI must remain fixed in screen-space.

**Implementation**:
- UI layer obtained via `WorldScene.getUILayer()`
- World camera ignores UI layer via `worldCam.ignore(uiLayer)`
- UI camera renders ONLY the UI layer
- `syncCameraIgnoreList()` enforces no object rendered by both cameras

**Enforcement**:
- [WorldScene.ts](../src/game/scenes/WorldScene.ts) - `setupCameras()`, `syncCameraIgnoreList()`
- [smoke.spec.ts](../tests/e2e/smoke.spec.ts) - UI camera isolation test

**How to comply**:
```typescript
// CORRECT
const container = this.scene.add.container(x, y);
this.scene.getUILayer().add(container);

// WRONG - Do not add UI directly to scene
this.scene.add.container(x, y); // This goes to world, not UI!
```

---

## 2. Registry-Driven Routing (SACRED)

**Rule**: Runtime code never constructs content paths manually.

**Why**: Hardcoded paths become "tribal knowledge" that agents break.

**Implementation**:
- Registry loaded once at boot from `/generated/registry.json`
- All content accessed via typed accessors in [registry.ts](../src/content/registry.ts)
- Paths are properties of registry entries, not string literals in game code

**Enforcement**:
- [registry.ts](../src/content/registry.ts) - typed accessors
- [validate.js](../scripts/validate.js) - registry schema validation
- TypeScript types prevent accessing non-existent properties

**How to comply**:
```typescript
// CORRECT
const room = content.getRoom('scotus_lobby');
const levelData = await fetch(room.ldtkUrl);

// WRONG - Do not hardcode paths
const levelData = await fetch('/content/ldtk/scotus_lobby.json');
```

---

## 3. Generated vs Authored Distinction

**Rule**: Build artifacts go in `generated/`, source files in `content/`.

**Why**: Prevents committing generated files, clarifies what's human-authored.

| Directory | Contents | Git Status |
|-----------|----------|------------|
| `content/` | Source specs, ink files | Committed |
| `generated/` | Build output | Gitignored |
| `public/content/` | Authored runtime assets | Committed |
| `public/generated/` | Synced build output | Gitignored |

**Enforcement**:
- `.gitignore` excludes `generated/` and `public/generated/`
- [sync-public.mjs](../scripts/sync-public.mjs) copies `generated/` to `public/generated/`

---

## 4. Agent-Friendly Workflow

**Rule**: All operations executable via npm scripts with clear output.

**Why**: Agents can't handle tribal knowledge or interactive prompts.

**Implementation**:
- `npm run prepare:content` - Full pipeline
- `npm run validate` - Check all invariants
- Scripts exit non-zero on errors with actionable messages

**Enforcement**:
- CI runs validation on every push
- Scripts use `process.exit(1)` for failures

**Commands**:
```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run prepare:content  # Full asset pipeline
npm run validate      # Validate all content
npm run test          # Run all tests
```

---

## 5. No Slapdash Hardcoding

**Rule**: Magic values go in config files or constants.

**Why**: Scattered magic values become impossible to update consistently.

**Implementation**:
- [content_contract.json](../content/content_contract.json) - Pipeline rules
- [registry_config.json](../content/registry_config.json) - Registry template values
- [src/game/constants/](../src/game/constants/) - Runtime constants

---

## 6. Schema-Enforced Content

**Rule**: All content validated against JSON schemas before runtime.

**Why**: Runtime assumes valid content; catch errors at build time.

**Implementation**:
- Schemas in `schemas/*.schema.json`
- [validate.js](../scripts/validate.js) runs schema validation
- Business logic validation separate from schema validation

**Enforcement**:
- `npm run validate` fails if schemas don't match
- CI blocks merge on validation failure

**Schemas**:
| Schema | Purpose |
|--------|---------|
| `CharacterSpec.schema.json` | Character definitions |
| `FlashcardPack.schema.json` | Registry entry for flashcard pack |
| `FlashcardsFile.schema.json` | Flashcards file structure |
| `RoomEntry.schema.json` | Room registry entry |
| `AssetRegistry.schema.json` | Full registry structure |

---

## 7. Pipeline Determinism

**Rule**: Same inputs produce identical outputs.

**Why**: Non-determinism causes spurious diffs and cache invalidation.

**Implementation**:
- Stable sort order in all generated files
- Consistent JSON formatting
- BuildId based on timestamp/commit SHA for intentional cache-busting

**Enforcement**:
- Unit tests verify registry output stability

---

## Quick Reference: Content Locations

| Content Type | Source Location | Runtime Location |
|--------------|-----------------|------------------|
| Character specs | `content/characters/*.json` | `generated/characters/*.json` |
| Character sprites | (generated) | `public/generated/sprites/*.png` |
| Flashcards | `public/content/cards/*.json` | (same - authored) |
| Ink stories | `content/ink/*.ink` | `public/generated/ink/*.json` |
| LDtk rooms | `public/content/ldtk/*.json` | (same - authored) |
| Registry | (generated) | `public/generated/registry.json` |

---

## Adding New Content

### Adding a New Character Sprite
1. Create character spec in `content/characters/{id}.json`
2. Run `npm run prepare:content`
3. Verify sprite appears in `generated/sprites/{id}.png`
4. Access in code: `registry.sprites['{id}']`

### Adding a New Room/Level
1. Create LDtk file, export to `public/content/ldtk/{id}.json`
2. Run `npm run prepare:content` (room will be auto-registered)
3. Access in code: `content.getRoom('{id}').ldtkUrl`

### Adding a New Flashcard Pack
1. Create flashcards file at `public/content/cards/{id}.json`:
   ```json
   { "schemaVersion": 1, "cards": [...] }
   ```
2. Run `npm run prepare:content` (pack will be auto-registered)
3. Run `npm run validate` to verify schema compliance
4. Access in code: `await content.loadFlashcards('{id}')`

### Adding a New Ink Dialogue
1. Create ink file at `content/ink/{id}.ink`
2. Run `npm run prepare:content`
3. Verify compiled JSON at `public/generated/ink/{id}.json`
4. Access in code: `content.getInkStory('{id}').url`

---

## Violation Detection

If you suspect an invariant violation:

1. **UI Isolation**: Press `Z` in dev mode to toggle world zoom. UI should not zoom.
2. **Registry Routing**: Search codebase for hardcoded paths: `grep -r "/content/" src/`
3. **Generated vs Authored**: Check `git status` for unexpected changes in `generated/` or `public/generated/`
4. **Schema Validation**: Run `npm run validate` and check for errors
