# Kim Bar - Agent Handoff Document
**Last Update**: January 14, 2026

> **This is the canonical handoff document.** Update it at the end of each session.
> Keep it concise but complete. New agents should read this first.

---

## 1. Project Overview

**Kim Bar** is a Phaser 3 game for bar exam preparation through flashcard encounters in a SCOTUS-themed courthouse. Player controls Kim, a law student, navigating rooms and answering legal questions.

**Live**: https://kimbar.badgey.org
**Repo**: https://github.com/abobilly/kimbar

### Tech Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Engine | Phaser 3 | 3.90.0 |
| Build | Vite | 6.3.1 |
| Language | TypeScript | 5.7.2 |
| Sprites | ULPC composite layers | - |
| Dialogue | Ink (inkjs) | 2.3.2 |
| Levels | LDtk JSON | - |
| Testing | Vitest + Playwright | - |
| Deploy | GitHub Actions → Cloudflare Pages | - |

---

## 2. Recent Changes: Wardrobe UI + Room Transitions + Ink Fixes

### What Was Done (January 14, 2026)

This session focused on gameplay loop blockers: fixing dialogue loading, enabling room traversal, and adding an interface for the outfit system.

**Files Modified:**
- `content/ink/story.ink` - Consolidated `justices.ink`, `tutorial.ink`, and `rewards.ink` into main story file (Option A fix) to resolve multiple-file loading issues.
- `src/game/scenes/WorldScene.ts` - 
    - Implemented `createWardrobeUI` / `showOutfits` modal with buff display and equipment logic.
    - Updated `create()` to accept `{ level: string }` data, enabling `this.scene.restart({ level: '...' })` for door transitions.

### Previous Changes: LDtk Normalizer + Ink Tag Enhancement (January 13)

**New Files Created:**
- `src/content/ldtk-normalizer.ts`, `src/content/ldtk-validator.ts`
- `src/services/semantic-service.ts` (Feature flag OFF)

**Files Modified:**
- `src/game/systems/DialogueSystem.ts` (Portrait tags)
- `content/ink/story.ink` (Tag docs)

### Key Improvements

1. **Dialogue Stability**: Consolidated Ink files ensure all knots (justices, tutorial) are available at runtime without complex multi-story management.
2. **Wardrobe UI**: Players can now see unlocked outfits and their buffs (Hints, Extra Time, etc.) and equip them.
3. **Traversal**: "Door" entities now correctly trigger scene restarts with the target level.

---

## 3. Sacred Invariants

> **READ `docs/INVARIANTS.md` for full details**

1. **UI Isolation (SACRED)** - All UI on uiLayer, rendered by uiCam only
2. **Registry-Driven Routing (SACRED)** - No hardcoded content paths
3. **Generated vs Authored** - Build artifacts in `generated/`, sources in `content/`
4. **Agent-Friendly Workflow** - All operations via `npm run ...`
5. **No Slapdash Hardcoding** - Magic values in config files
6. **Schema-Enforced Content** - JSON schemas for all content types
7. **Pipeline Determinism** - Same inputs → same outputs

---

## 4. How to Add New Content

### Adding Flashcards

1. **Create or edit** `public/content/cards/{pack-id}.json`:
   ```json
   {
     "schemaVersion": 1,
     "cards": [
       {
         "id": "unique-card-id",
         "question": "What is hearsay?",
         "answer": "An out-of-court statement offered for the truth of the matter asserted.",
         "subject": "evidence",
         "tags": ["hearsay", "fre"]
       }
     ]
   }
   ```
2. **Run**: `npm run prepare:content`
3. **Verify**: `npm run validate` — confirms pack registered with correct count
4. **Access in code**: `await loadFlashcardsFromPack('{pack-id}')`

### Adding a Room/Level

1. **Create LDtk level** and export JSON to `public/content/ldtk/{room-id}.json`
2. **Create room spec** at `content/rooms/{room-id}.json`:
   ```json
   {
     "id": "{room-id}",
     "displayName": "Hall of Justice",
     "ldtkFile": "{room-id}.json"
   }
   ```
3. **Run**: `npm run prepare:content` — room auto-registered
4. **Verify**: Check `generated/registry.json` has the room entry
5. **Access in code**: `getRoom('{room-id}').ldtkUrl`

### Adding a Character/NPC

1. **Create spec** at `content/characters/{char-id}.json`:
   ```json
   {
     "id": "{char-id}",
     "name": "Justice Thomas",
     "ulpcArgs": {
       "body": "male/dark",
       "hair": "short/gray",
       "torso": "robes/black"
     }
   }
   ```
2. **Run**: `npm run prepare:content` — sprite generated + registered
3. **Verify**: `generated/sprites/{char-id}.png` exists
4. **Access in code**: `registry.sprites['{char-id}']`

### Adding Ink Dialogue

1. **Create ink file** at `content/ink/{story-id}.ink`
2. **Run**: `npm run prepare:content` — compiles to `generated/ink/{story-id}.json`
3. **Verify**: `npm run validate` shows ink story registered
4. **Access in code**: `getInkStory('{story-id}').url`

---

## 5. Architecture

### Dual-Camera System

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
│  • Wardrobe UI           │
└─────────────────────────────┴──────────────────────────┘
```

### Registry-Driven Loading

```typescript
// Room loading (WorldScene.ts)
const room = getRoom('scotus_lobby');
const response = await fetch(room.ldtkUrl);

// Ink story loading (WorldScene.ts)
const story = getInkStory('story');
await dialogueSystem.loadStory(story.url);

// Flashcard loading (registry.ts)
const cards = await loadFlashcardsFromPack('flashcards');
```

---

## 6. Content Pipeline

```bash
npm run prepare:content  # Full pipeline (auto-runs before dev/build)
```

**Pipeline Stages**:
1. `fetch-vendor` - Download ULPC assets
2. `build:chars` - Process character specs, scan rooms/flashcards/ink, generate registry
3. `gen:sprites` - Composite ULPC layers into spritesheets
4. `compile:ink` - Compile .ink → `generated/ink/*.json`
5. `build:asset-index` - Generate asset manifest with dimension validation
6. `sync:public` - Copy `generated/` → `public/generated/`
7. `validate` - Schema validation for all content types

**Content Locations**:
| Type | Source | Runtime |
|------|--------|---------|
| Characters | `content/characters/*.json` | `generated/characters/*.json` |
| Sprites | (generated) | `public/generated/sprites/*.png` |
| Flashcards | `public/content/cards/*.json` | (same - authored) |
| Ink | `content/ink/*.ink` | `public/generated/ink/*.json` |
| LDtk Rooms | `public/content/ldtk/*.json` | (same - authored) |
| Registry | (generated) | `public/generated/registry.json` |

---

## 7. Testing

```bash
npm run test:unit   # Unit tests including registry
npm run test:e2e    # E2E with Playwright
npm run test        # Both
npm run validate    # Content validation
```

### Debug Keys (dev mode)
- **E** - Quick flashcard encounter
- **Z** - Toggle world camera zoom

---

## 8. Key Files Reference

| Purpose | File |
|---------|------|
| Main game scene | `src/game/scenes/WorldScene.ts` |
| Registry loader | `src/content/registry.ts` |
| Content types | `src/content/types.ts` |
| LDtk normalizer | `src/content/ldtk-normalizer.ts` |
| LDtk validator | `src/content/ldtk-validator.ts` |
| Semantic service | `src/services/semantic-service.ts` |
| Sacred rules | `docs/INVARIANTS.md` |
| Registry config | `content/registry_config.json` |
| Build registry | `scripts/build-characters.js` |
| Flashcard battles | `src/game/systems/EncounterSystem.ts` |
| NPC dialogue | `src/game/systems/DialogueSystem.ts` |
| Responsive layout | `src/game/ui/layout.ts` |
| Schema validation | `scripts/validate.js` |
| Phaser types check | `scripts/check-phaser-types.mjs` |

---

## 9. Commands

```bash
npm run dev           # Start dev server (port 8080)
npm run build         # Production build
npm run prepare:content  # Full asset pipeline
npm run gen:sprites   # Regenerate character sprites
npm run validate      # Validate all content
npm run test          # Run all tests
```

---

## 10. Suggested Next Steps

1. **Quest System UI** - Need a way to visualize active quests and story progress (storyFlags are currently hidden).
2. **Sound System** - `sfx:` tags are logged but not audible.
3. **Semantic Search** - Enable `VITE_ENABLE_SEMANTIC=true`, add "Related Cards" panel.
4. **Mobile Touch Controls** - Virtual D-pad, touch-friendly UI.
5. **Content Expansion** - Add more room layouts (LDtk) to replace placeholders.

---

## 11. Verification

Run these commands to verify everything works:

```bash
npm run prepare:content  # Should complete without errors
npm run validate         # Should pass all checks
npm run test:unit        # Should pass all tests
npm run build            # Should build successfully
```

---

*End of handoff document.*
