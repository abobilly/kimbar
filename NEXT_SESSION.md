# Kim Bar - Agent Handoff Document
**Last Update**: January 16, 2026

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

## 2. Recent Changes: Claude/Gemini/Qwen CLI Setup

## 2. Recent Changes: Pixel-MCP (Railway + MCP Config)

### What Was Done (January 16, 2026)

- Added project-scoped `.mcp.json` to connect Claude Code to the Railway Pixel-MCP SSE endpoint.
- Updated `pixel-mcp-server` health reporting to surface missing LibreSprite (status becomes `degraded` with `runtime` details).
- Added PNG/PIL fallbacks for `create_sprite` and `export_sprite` when LibreSprite isn't present (e.g., when Railway accidentally builds with Nixpacks instead of the Dockerfile).
- Updated `pixel-mcp-server/README.md` to clarify `.mcp.json` location, remove broken 1-click template, and document Railway root-dir/Dockerfile pitfalls + common errors.
- Fixed `scripts/pixel_client.py` so it runs on Windows consoles (no emoji output).

---

## 2. Recent Changes: Claude/Gemini/Qwen CLI Setup

### What Was Done (January 15, 2026)

- Installed Claude Code via winget (`claude` CLI).
- Installed Gemini CLI via npm (`@google/gemini-cli`).
- Ensured Ollama is installed and pulled `qwen2.5-coder:7b`.
- Added wrappers in `C:\Users\andre\bin` for `claude`, `gemini`, and `qwen`.

---

## 2. Recent Changes: Copilot CLI Setup

### What Was Done (January 15, 2026)

- Installed GitHub Copilot CLI extension for `gh`.
- Added `C:\Users\andre\bin\copilot.cmd` wrapper to run `gh copilot`.

---

## 2. Recent Changes: Dialogue UI Fix

### What Was Done (January 15, 2026 - Night Session)

- Fixed dialogue UI crash on click by removing dependency on `camera.worldToScreen` (not present in Phaser 3.90). Dialogue now computes screen Y from camera scroll/zoom to decide top/bottom placement (`src/game/systems/DialogueSystem.ts`).

---

## 2. Recent Changes: Lazy Asset Loading

### What Was Done (January 15, 2026 - Night Session)

- Added registry-driven lazy asset loader (`src/game/services/asset-loader.ts`) and shared ULPC animation helper (`src/game/utils/characterAnims.ts`).
- Preloader now only queues essential UI assets instead of loading full sprite/prop registry, reducing boot-time load.
- WorldScene now preloads sprites/props per-room before rendering, shows a lightweight loading overlay with spinner + elapsed time during loads, and loads outfit sprites on equip.

---

## 2. Recent Changes: Asset Pipeline + World Density

### What Was Done (January 15, 2026 - Evening Session)

**Visual Bug Fixes:**
- Fixed double-click indicators appearing in UI view by calling `uiCam.ignore()` on the indicator object in `WorldScene.ts`.
- Fixed NPC mirroring issues where NPCs would stare at walls; improved `updateNPCFacing` logic to handle idle states and player proximity more gracefully.

**CI & Environment:**
- Updated `.github/workflows/validate.yml` to include `pip install Pillow` to support Python-based sprite generation/validation in the CI pipeline.

**World Connections (Doors):**
- Manually added `Door` entities to all 18 room `content/rooms/*.json` files. 
- Mapped connectivity between Exterior, Lobby, Courtroom, Chambers, Vault, etc. 
- Added `targetRoomId` and `targetDoorId` fields to ensure functional room transitions.

**Procedural Asset Pipeline (AI Mocking):**
- Initialized `generated/ai-manifest.json` to track all procedurally generated (or mocked) assets.
- Integrated all missing labels from `content/ai_jobs/props_missing_v1.json` (600+ items) and `tiles_missing_v1.json` into the manifest with `status: "mocked"`.
- Created `generated/ai-sprites/` directory to host asset placeholders.

**LDtk Level Generation:**
- Ran `scripts/generate-ldtk-levels.mjs` to compile the `content/rooms/*.json` and `content/placement_drafts/prop_placements.json` into fully featured LDtk projects.
- Injected `Prop` entities into LDtk layers, enabling visual level design using the new asset registry.

**How to verify transitions:**
- Launch game and walk to the south/north of rooms to trigger `Door` sensors.

**Invariants:**
- `generated/ai-manifest.json` is the source of truth for all procedurally loaded assets.
- `npc.isMirrored` is now handled dynamically based on facing direction relative to player/walls.
- **Wardrobe System Implemented**:
  - Generated sprite variants for all Kim's outfits (robes, suits, blazers).
  - Created `WardrobePanel` UI (toggle with 'C') to view and equip outfits.
  - Integrated outfit sprite swapping in `WorldScene`.
  - `OutfitChest` entities now unlock outfits correctly.

## High-Level Goals
---

## 2. Recent Changes: Justice Robes Pipeline (Digital Tailor)

### What Was Done (January 15, 2026)

**Problem**: Male justices were using the female robe layer (wrong body fit), and the existing ULPC robes had skin leak issues.

**Solution**: Created "Digital Tailor" pipeline - a 3-stage Python toolchain for procedural sprite layer generation with automated skin-leak validation.

**Files Created:**
- `tools/tailor/01_slice.py` - Explodes spritesheets into individual 64×64 frames
- `tools/tailor/02_tailor.py` - Composites body + robe, validates skin coverage (chest box 24-42 × 28-48)
- `tools/tailor/03_stitch.py` - Reassembles validated frames into game-ready sheet
- `tools/tailor/generate_male_robe.py` - Procedural male judge robe (832×1344 LPC sheet)
- `tools/tailor/generate_female_robe.py` - Procedural female judge robe (832×1344 LPC sheet)
- `tools/tailor/run_pipeline.py` - Orchestrates full pipeline
- `tools/tailor/fix_robe_frames.py` - Surgical fixes for frames that fail validation
- `tools/tailor/config_justice_robes.json` - Configuration for justice robes pipeline

**Outputs:**
- `vendor/lpc/custom/torso_robe_judge_male_black.png` - Male robe layer
- `vendor/lpc/custom/torso_robe_judge_female_black.png` - Female robe layer
- Copied to ULPC tree: `vendor/lpc/.../spritesheets/torso/clothes/robe/{male,female}/black.png`

**npm Scripts Added:**
- `npm run gen:robes` - Regenerate robe PNGs from Python generators
- `npm run tailor:robes` - Run full tailor pipeline with validation

**How to Add a New Robe Color:**
1. Duplicate `generate_male_robe.py`, update palette constants
2. Run generator: `python tools/tailor/generate_{body}_{color}.py`
3. Slice + validate: `python 02_tailor.py --body ... --robe ... --output ...`
4. If failures, run `fix_robe_frames.py` or adjust generator
5. Copy to ULPC tree and regenerate sprites

**Invariants:**
- All walk frames (rows 7-10) must pass skin-leak test (<5 exposed pixels in chest box)
- Side-view robes must extend to x=23 (left) and x=43 (right) to cover male/female body silhouettes

---

## 2. Recent Changes: AI Job + Placement Drafts

### What Was Done (January 15, 2026)

- Added generator scripts: `scripts/generate-ai-jobs-from-spec.mjs` and `scripts/generate-placement-drafts.mjs`.
- Added npm entry points: `npm run gen:ai:missing` and `npm run gen:placements`.
- Generated missing-asset AI job sets: `content/ai_jobs/props_missing_v1.json` and `content/ai_jobs/tiles_missing_v1.json`.
- Generated placement drafts: `content/placement_drafts/prop_placements.json` (+ README).
- Added schema + validation: `schemas/PlacementDraft.schema.json` and placement checks in `scripts/validate.js`.
- Expanded AI job schema IDs to allow dotted namespaces in `schemas/AiJobSpec.schema.json`.
- Updated `scripts/generate-ldtk-levels.mjs` to merge placement drafts into Prop entities (adds `propId` field definition).

---

## 3. Recent Changes: Golden UI Pass (Dialogue + Encounter)

### What Was Done (January 15, 2026)

- Added `scripts/extract-ui-golden.py` to crop and normalize Golden UI elements.
- Added Golden UI sprite entries to `content/registry_config.json` for dialogue panel and button states.
- Updated `scripts/sync-public.mjs` to sync `vendor/ui` into `public/assets/ui`.
- Preloader now loads registry sprites with `kind: "image"` as images (not spritesheets).
- Dialogue and encounter choices use Golden UI buttons when present; feedback panel uses Golden UI frame.
- Updated `scripts/build-levels.js` to merge placement drafts and include Floor/Collisions layers so `.json` exports render floors.
- Updated `scripts/build-characters.js` to prefer `.ldtk` over `.json` when both exist (prevents duplicate room entries).
- Added fast mode to `scripts/build-asset-index.mjs` and npm script `npm run build:asset-index:fast` for large asset sets.

---

## 2. Recent Changes: Missing Assets Guidance (Second Pass)

### What Was Done (January 15, 2026)

- Expanded missing assets guidance with footprints, collision flags, room zones, and priorities in `docs/MISSING_ASSETS.md`.
- Added machine-readable spec for generator/placer workflows: `docs/MISSING_ASSETS_SPEC.json`.

---

## 2. Recent Changes: Quest Panel UI

### What Was Done (January 14, 2026)

- Implemented `QuestPanel` to derive active entries from `quest_*`, `has_*`, and `met_*` story flags and display them on the UI layer (toggle with Q).
- Added a unit test to assert QuestPanel attaches to `WorldScene.getUILayer()`.

---

## 2. Recent Changes: LDtk Level Generation + Tooling Updates

### What Was Done (January 14, 2026)

**LDtk Level Generation:**
- Created `scripts/generate-ldtk-levels.mjs` to generate LDtk project files (`.ldtk`) from room specifications.
- Generated 17 room levels and a `_template.ldtk` in `public/content/ldtk/`.
- Updated `scripts/build-characters.js` to scan `.ldtk` files (in addition to `.json`) for the registry.
- Updated `src/content/ldtk-normalizer.ts` to support LDtk Project JSON format (handling nested `levels` array).

**Verification:**
- Validated all generated levels against the schema (`npm run validate`).
- Verified unit tests pass for the updated normalizer (`npm run test:unit`).

### Previous Changes: Wardrobe UI + Room Transitions + Ink Fixes (January 14, 2026)

**Files Modified:**
- `content/ink/story.ink` - Consolidated `justices.ink`, `tutorial.ink`, and `rewards.ink` into main story file.
- `src/game/scenes/WorldScene.ts` - Implemented `createWardrobeUI` and enabled level transitions.

**New Files Created:**
- `src/content/ldtk-normalizer.ts`, `src/content/ldtk-validator.ts`
- `src/services/semantic-service.ts` (Feature flag OFF)

### Key Improvements

1. **Level Generation**: Automated generation of LDtk files ensures all rooms defined in `content/rooms/*.json` have corresponding playable levels.
2. **Tooling Compatibility**: Registry and Runtime loaders now support native LDtk Project files.
3. **Dialogue Stability**: Consolidated Ink files ensure all knots are available.
4. **Wardrobe UI**: Players can manage outfits and view buffs.

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
npm run gen:ui:golden # Extract Golden UI slices
npm run gen:ai:missing  # Generate AI job files from missing asset spec
npm run gen:placements  # Generate prop placement drafts from missing asset spec
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
