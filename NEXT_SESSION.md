# Kim Bar - Agent Handoff Document
**Last Update**: January 13, 2026

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

## 2. Recent Changes: LDtk Normalizer + Ink Tag Enhancement + Semantic Layer

### What Was Done (January 13, 2026)

This session added typing improvements, LDtk normalization, enhanced Ink tag handling, and a semantic layer extension point.

**New Files Created:**
- `src/content/ldtk-normalizer.ts` - Converts raw LDtk JSON to internal LevelData format
- `src/content/ldtk-validator.ts` - Validates level data (checks PlayerSpawn exists, field types)
- `src/services/semantic-service.ts` - Provider-agnostic embedding service interface (feature flag OFF by default)
- `src/services/transformers-backend.ts` - Transformers.js backend stub (lazy-loaded when enabled)
- `scripts/check-phaser-types.mjs` - Sentinel check ensuring Phaser types resolve from node_modules
- `tests/unit/ldtk-normalizer.test.ts` - 16 unit tests for LDtk normalization + validation
- `docs/SEMANTIC_LAYER.md` - Documentation for enabling semantic features

**Files Modified:**
- `scripts/verify.js` - Added Phaser types check to verification suite
- `src/game/scenes/WorldScene.ts` - Now uses ldtk-normalizer module, enhanced tag handling
- `src/game/systems/DialogueSystem.ts` - Added portrait tag support (`portrait:id:emotion`)
- `src/vite-env.d.ts` - Added `VITE_ENABLE_SEMANTIC` feature flag type
- `content/ink/story.ink` - Added tag reference docs and demo tags

### Key Improvements

1. **LDtk Normalization**: Level parsing extracted from WorldScene to reusable module with validation
2. **Ink Tag Grammar**: Expanded to support `speaker:`, `portrait:`, `sfx:`, `quest:`, `encounter:` (key=value format)
3. **Semantic Layer**: Opt-in embedding service with WebGPU support (disabled by default, zero bundle cost)
4. **Phaser Types**: Sentinel check ensures official types used, no custom d.ts conflicts

### Previous Changes: Asset Pipeline Hardening (January 12)

**New Files Created:**
- `docs/INVARIANTS.md` - 7 sacred rules that must be followed
- `content/registry_config.json` - Extracted registry template config
- `schemas/FlashcardPack.schema.json` - Registry entry schema
- `schemas/FlashcardsFile.schema.json` - Flashcards file schema
- `schemas/RoomEntry.schema.json` - Room registry entry schema
- `tests/unit/registry.test.ts` - Registry accessor tests

**Files Modified:**
- `scripts/build-characters.js` - Now reads from config, auto-scans rooms/flashcards/ink
- `scripts/compile-ink.mjs` - Output path fixed to `generated/ink/`
- `scripts/validate.js` - Enhanced with flashcard pack, room, ink validation
- `scripts/build-asset-index.mjs` - Actual image dimension validation with Sharp
- `src/content/types.ts` - Added RoomEntry, FlashcardPackEntry, InkEntry interfaces
- `src/content/registry.ts` - Added typed accessors (getRoom, getFlashcardPack, getInkStory) with caching
- `src/game/scenes/WorldScene.ts` - Registry-driven room/ink loading

**Files Deleted:**
- `public/content/registry.json` - Stale duplicate removed
- `public/content/ink/story.json` - Now generated to `generated/ink/`

### Registry Structure

The registry now contains all content routing information:

```json
{
  "buildId": "dev-...",
  "tileSize": 32,
  "scale": 2,
  "entities": { ... },
  "outfits": { ... },
  "tags": { "subjects": [...] },
  "sprites": { ... },
  "characters": [ ... ],
  "rooms": [
    { "id": "scotus_lobby", "ldtkUrl": "/content/ldtk/scotus_lobby.json", ... }
  ],
  "flashcardPacks": [
    { "id": "flashcards", "url": "/content/cards/flashcards.json", "count": 1154 }
  ],
  "ink": [
    { "id": "story", "url": "/generated/ink/story.json" }
  ]
}
```

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

Now that LDtk normalization and Ink tag handling are enhanced, consider:

1. **Sound System** - Wire up `sfx:` tags to actual audio playback
2. **Outfit System UI** - Wardrobe screen, visual preview, buff display
3. **Room Transitions** - Door entity handling, scene transitions, spawn management
4. **Quest System** - UI for tracking story flags set by `quest:set` tags
5. **Semantic Search** - Enable `VITE_ENABLE_SEMANTIC=true`, add "Related Cards" panel
6. **Mobile Touch Controls** - Virtual D-pad, touch-friendly UI
7. **More Ink Content** - Expand story.ink with more knots and dialogue branches

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
