# Agent Task: Asset Pipeline Hardening

> **Operator**: Feed this entire file to a new Claude Opus instance with high context window.
> **Delete after completion**: This file should be deleted once the task is complete.

---

## ⚠️ Copilot Customization Files Now Exist

The following files have been created to enforce invariants automatically:

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Repo-wide invariants (auto-injected into all Copilot contexts) |
| `.github/instructions/content.instructions.md` | Content/registry area rules |
| `.github/instructions/ui.instructions.md` | UI isolation rules |
| `.github/instructions/loader.instructions.md` | Runtime loader rules |
| `.github/agents/sentinel.agent.md` | QA/guardrails agent |
| `.github/agents/content-intake.agent.md` | Content intake agent |
| `.github/agents/runtime-loader.agent.md` | Loader agent |
| `.github/agents/ui-modal.agent.md` | UI agent |
| `.github/prompts/check.prompt.md` | Run all gates |
| `.github/prompts/intake-assets.prompt.md` | Asset intake workflow |
| `.github/prompts/pr-prep.prompt.md` | PR preparation |
| `.github/workflows/validate.yml` | CI workflow (mirrors `npm run check`) |

**New commands added to package.json:**
- `npm run check` - Run all gates (content + verify + boundaries + test + build)
- `npm run check:fast` - Same but unit tests only (no e2e)

---

## Mission Statement

You are Claude Opus 4.5 acting as a staff-level game/tools engineer in a TypeScript + Phaser 3 + Vite repository ("kimbar"). Your mission is to **dramatically streamline asset integration and future scaling** by:

1. Hardening and automating the content/asset pipeline
2. Enforcing a small set of non-negotiable invariants
3. Making the registry the single source of truth for all content routing
4. Ensuring future edits are easy and safe (especially when multiple agents touch the code with limited human oversight)

---

## Project Context

**Kim Bar** is a Phaser 3 game for bar exam preparation through flashcard encounters in a SCOTUS-themed courthouse. Player controls Kim, a law student, navigating rooms and answering legal questions.

| Component | Technology | Version |
|-----------|------------|---------|
| Engine | Phaser 3 | 3.90.0 |
| Build | Vite | 6.3.1 |
| Language | TypeScript | 5.7.2 |
| Sprites | ULPC composite layers | - |
| Dialogue | Ink (inkjs) | 2.3.2 |
| Levels | LDtk JSON | - |
| Testing | Vitest + Playwright | - |

**Live**: https://kimbar.badgey.org
**Repo**: https://github.com/abobilly/kimbar

---

## Context Files (Read These First)

| File | Purpose | Priority |
|------|---------|----------|
| `NEXT_SESSION.md` | Current handoff, architecture overview, what's working | **READ FIRST** |
| `content/content_contract.json` | Machine-readable pipeline rules (extend, don't replace) | Critical |
| `src/content/registry.ts` | Existing loader with types (extend, don't replace) | Critical |
| `src/content/types.ts` | TypeScript interfaces for content | Critical |
| `scripts/build-characters.js` | Generates registry.json (has hardcoded template to extract) | Refactor target |
| `scripts/validate.js` | Comprehensive validation (extend for flashcards) | Extend |
| `schemas/*.schema.json` | Existing JSON schemas | Reference |

---

## Current Architecture (What Exists)

### Directory Flow
```
content/                    # SOURCE (human-authored, committed)
├── characters/*.json       # CharacterSpec (ulpcArgs, name, id)
├── rooms/*.json           # Room definitions
├── ink/story.ink          # Dialogue source
├── content_contract.json  # Pipeline rules
├── registry_config.json   # (TO CREATE) Extracted from build-characters.js

    ↓ (npm run prepare:content)

generated/                  # BUILD OUTPUT (gitignored, regenerated)
├── registry.json          # Master registry
├── characters/*.json      # Compiled character specs
├── sprites/*.png          # Composited spritesheets (832×1344)
├── portraits/*.png        # Character portraits (64×64)
├── ink/story.json         # (TO CREATE) Compiled ink output
├── asset_index.ndjson     # Asset search index
├── quarantine.ndjson      # Failed validation assets

    ↓ (sync:public)

public/generated/           # RUNTIME COPY (served by Vite)
├── registry.json          # ← Runtime loads from HERE
├── sprites/*.png
├── portraits/*.png
├── ink/story.json         # (TO CREATE)
└── ...

public/content/             # AUTHORED RUNTIME ASSETS (committed)
├── registry.json          # ⚠️ STALE - TO BE REMOVED
├── art/                   # Static art assets
├── cards/flashcards.json  # Flashcard data (1038 cards)
├── ink/story.json         # ⚠️ INCONSISTENT - should be in generated/
├── ldtk/*.json            # Level data
```

### Existing Pipeline Scripts
| Script | Purpose |
|--------|---------|
| `npm run prepare:content` | Master pipeline (runs before dev/build) |
| `fetch-vendor` | Downloads ULPC assets to `vendor/` |
| `build:chars` | Compiles character specs, generates `registry.json` |
| `gen:sprites` | Composites LPC layers into spritesheets |
| `compile:ink` | Compiles `.ink` → `.json` (⚠️ outputs to wrong location) |
| `build:asset-index` | Creates asset index (⚠️ dimension validation is TODO) |
| `sync:public` | Copies `generated/` → `public/generated/` |
| `validate` | Schema validation, cross-references, LPC style |

### Existing Registry Format (generated/registry.json)
```json
{
  "tileSize": 32,
  "scale": 2,
  "buildId": "dev-1768225963356",
  "entities": { /* Entity type definitions */ },
  "outfits": { /* Outfit definitions with sprites and buffs */ },
  "tags": { "subjects": [...], "topicTags": [] },
  "sprites": {
    "char.kim": {
      "key": "char.kim",
      "url": "/generated/sprites/char.kim.png",
      "portraitUrl": "/generated/portraits/char.kim.png",
      "frameWidth": 64, "frameHeight": 64,
      "kind": "spritesheet"
    }
  },
  "characters": [
    { "id": "char.kim", "specUrl": "/generated/characters/char.kim.json", "spriteKey": "char.kim" }
  ]
}
```

### Existing Loader (src/content/registry.ts)
```typescript
// Already has:
export async function loadRegistry(): Promise<ContentRegistry>
export function getGameState(): GameState
export function saveGameState(state: Partial<GameState>): void
export function resetGameState(): void

// NEEDS TO BE EXTENDED with:
// - getRoom(id): RoomEntry
// - getFlashcardPack(id): FlashcardPackEntry
// - loadFlashcards(id): Promise<Flashcard[]>
// - getInkStory(id): InkEntry
// - Cache management
```

### Dual Camera System (UI Isolation - SACRED)
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

**Key Methods** in `src/game/scenes/WorldScene.ts`:
- `setupCameras()` - Creates dual camera system with uiLayer
- `syncCameraIgnoreList()` - Ensures no object rendered by both cameras
- `getUILayer()` - Public accessor for systems to add their containers
- `getUICam()` - Returns the UI camera reference

---

## Known Issues to Fix

| Issue | Location | Fix Required |
|-------|----------|--------------|
| Stale registry duplication | `public/content/registry.json` | Remove, ensure all code uses `/generated/registry.json` |
| Hardcoded registry template | `scripts/build-characters.js` BASE_REGISTRY_TEMPLATE | Extract to `content/registry_config.json` |
| Ink output path inconsistent | `scripts/compile-ink.mjs` outputs to `public/content/ink/` | Output to `generated/ink/`, sync to `public/generated/ink/` |
| Image dimension validation TODO | `scripts/build-asset-index.mjs` | Implement actual PNG dimension checking |
| Flashcards not in registry | `public/content/cards/flashcards.json` hardcoded | Register in registry as `flashcardPacks` |
| Rooms/LDtk not in registry | WorldScene hardcodes paths | Register in registry as `rooms` |
| No flashcard schemas | - | Create `FlashcardPack.schema.json` + `FlashcardsFile.schema.json` |

---

## Hard Constraints (Do Not Violate)

### 1. UI Isolation Invariant (SACRED)
- World rendering and UI rendering MUST be separated via dual camera + UI layer
- All UI MUST be created on the UI layer obtained from `WorldScene.getUILayer()`
- NEVER add UI directly to the world display list
- NO "scrollFactor hacks" to make UI appear fixed
- If you find violations, fix them immediately

### 2. Registry-Driven Routing (SACRED)
- The registry is the **single source of truth** for "what content exists and where"
- Runtime code NEVER constructs content paths manually
- All content accessed via typed registry accessors:
  - `content.getSprite(id)` → SpriteSpec with url
  - `content.getRoom(id)` → RoomEntry with ldtkUrl
  - `content.getFlashcardPack(id)` → FlashcardPackEntry with url
- Hide all path concatenation behind helpers

### 3. Generated vs Authored Distinction
- `generated/` = build artifacts (gitignored, regenerated by pipeline)
- `content/` = human-authored source files (committed to git)
- `public/content/` = runtime-accessible authored content (committed)
- `public/generated/` = runtime-accessible build output (synced from generated/)
- NEVER commit to `generated/` or `public/generated/`

### 4. Agent-Friendly Workflow
- Minimize "tribal knowledge" - everything documented
- All workflows executable via `npm run …` commands
- Validations/tests fail loudly when invariants broken
- Actionable error messages for agents

### 5. No Slapdash Hardcoding
- If you're tempted to hardcode a path, STOP
- Route through registry/loader instead
- Use constants for magic values

### 6. Schema-Enforced Content
- All content types have JSON schemas defining required shape
- Schema validates structure; scripts validate business logic
- Validation runs at build/verify time, not runtime
- Runtime assumes validated content

### 7. Pipeline Determinism
- Same inputs → same outputs
- Stable sort order, stable formatting, stable IDs
- BuildId for cache-busting
- Content hashes for validation (optional)

---

## Registry Design Principle

The registry is the **routing table**, not just generator output. It answers:
- "What content exists?" (enumeration)
- "Where does it live?" (URL resolution)
- "What are its properties?" (metadata)

### Content Source Types
| Type | Examples | Pipeline Stage |
|------|----------|----------------|
| **Generated** | sprites, portraits, compiled ink | Produced by build scripts |
| **Authored** | flashcards, room specs, dialogue | Human-written, validated, registered |
| **External** | (future) API endpoints | Registered as resolvers |

### Target Registry Shape
```json
{
  "buildId": "dev-1736700000000",
  "tileSize": 32,
  "scale": 2,
  
  "sprites": {
    "char.kim": { 
      "key": "char.kim", 
      "url": "/generated/sprites/char.kim.png",
      "portraitUrl": "/generated/portraits/char.kim.png",
      "frameWidth": 64, 
      "frameHeight": 64,
      "kind": "spritesheet"
    }
  },
  
  "characters": [
    { "id": "char.kim", "specUrl": "/generated/characters/char.kim.json", "spriteKey": "char.kim" }
  ],
  
  "rooms": [
    { 
      "id": "scotus_lobby", 
      "ldtkUrl": "/content/ldtk/scotus_lobby.json", 
      "displayName": "SCOTUS Lobby",
      "spawns": ["main_entrance"]
    },
    { 
      "id": "scotus_hall_01", 
      "ldtkUrl": "/content/ldtk/room.scotus_hall_01.json", 
      "displayName": "Hall of Justice" 
    }
  ],
  
  "flashcardPacks": [
    { 
      "id": "txbar-core", 
      "url": "/content/cards/flashcards.json",
      "schemaVersion": 1,
      "count": 1038,
      "subjects": ["evidence", "torts", "contracts", "constitutional_law", "criminal_law", "criminal_procedure", "civil_procedure", "real_property", "wills_trusts", "family_law"]
    }
  ],
  
  "ink": [
    { "id": "story", "url": "/generated/ink/story.json" }
  ],
  
  "outfits": { /* existing */ },
  "entities": { /* existing */ },
  "tags": { /* existing */ }
}
```

---

## Schema Definitions

### FlashcardPack.schema.json (Registry Entry)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "FlashcardPack.schema.json",
  "title": "FlashcardPack",
  "description": "Registry entry for a flashcard pack",
  "type": "object",
  "required": ["id", "url", "schemaVersion"],
  "properties": {
    "id": { 
      "type": "string", 
      "pattern": "^[a-z0-9][a-z0-9-]*$",
      "description": "Unique identifier for this flashcard pack"
    },
    "url": { 
      "type": "string", 
      "pattern": "^/content/",
      "description": "URL path to the flashcards JSON file"
    },
    "schemaVersion": { 
      "type": "integer", 
      "minimum": 1,
      "description": "Schema version of the flashcards file"
    },
    "count": { 
      "type": "integer", 
      "minimum": 0,
      "description": "Number of cards in the pack (for validation)"
    },
    "contentHash": { 
      "type": "string",
      "description": "SHA256 hash of file contents (for cache invalidation)"
    },
    "subjects": { 
      "type": "array", 
      "items": { "type": "string" },
      "description": "Bar exam subjects covered"
    },
    "title": { "type": "string" },
    "description": { "type": "string" }
  },
  "additionalProperties": false
}
```

### FlashcardsFile.schema.json (Actual File)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "FlashcardsFile.schema.json",
  "title": "FlashcardsFile",
  "description": "A flashcard pack file containing quiz cards",
  "type": "object",
  "required": ["schemaVersion", "cards"],
  "properties": {
    "schemaVersion": { 
      "type": "integer", 
      "minimum": 1 
    },
    "cards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "q", "a"],
        "properties": {
          "id": { 
            "type": "string",
            "description": "Unique card identifier"
          },
          "q": { 
            "type": "string",
            "minLength": 1,
            "description": "Question text"
          },
          "a": { 
            "type": "string",
            "minLength": 1,
            "description": "Answer text"
          },
          "tags": { 
            "type": "array", 
            "items": { "type": "string" },
            "description": "Topic tags for filtering"
          },
          "deckTag": { 
            "type": "string",
            "description": "Primary subject/deck category"
          },
          "difficulty": { 
            "type": "integer", 
            "minimum": 1, 
            "maximum": 5,
            "description": "Difficulty rating 1-5"
          },
          "source": { 
            "type": "string",
            "description": "Citation or source reference"
          }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
}
```

### RoomEntry.schema.json (Registry Entry)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "RoomEntry.schema.json",
  "title": "RoomEntry",
  "description": "Registry entry for a room/level",
  "type": "object",
  "required": ["id", "ldtkUrl"],
  "properties": {
    "id": { 
      "type": "string", 
      "pattern": "^[a-z0-9][a-z0-9_]*$"
    },
    "ldtkUrl": { 
      "type": "string", 
      "pattern": "^/content/ldtk/"
    },
    "displayName": { "type": "string" },
    "spawns": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Named spawn points in this room"
    }
  },
  "additionalProperties": false
}
```

---

## Phased Approach

### Phase 1: Consolidation + Documentation + Schemas

**Goal**: Establish foundations without breaking existing functionality.

| ID | Deliverable | Details |
|----|-------------|---------|
| A | `docs/INVARIANTS.md` | Document all 7 sacred rules with enforcement locations |
| B | Remove stale registry | Delete `public/content/registry.json`, ensure Boot.ts uses `/generated/registry.json` |
| C | Extract registry config | Move BASE_REGISTRY_TEMPLATE from `build-characters.js` to `content/registry_config.json` |
| D | Fix Ink output path | Modify `compile-ink.mjs` to output to `generated/ink/`, update `sync:public` |
| E | Add `rooms` to registry | Scan `public/content/ldtk/*.json`, add to registry with id, ldtkUrl, displayName |
| F | Add `flashcardPacks` to registry | Register flashcards.json with url, schemaVersion, count, subjects |
| G | Create `schemas/FlashcardPack.schema.json` | Validates registry entry shape |
| H | Create `schemas/FlashcardsFile.schema.json` | Validates flashcards file shape |
| I | Create `schemas/RoomEntry.schema.json` | Validates room registry entry shape |
| J | Update `scripts/validate.js` | Add flashcard validation: schema + business logic |

**Checkpoint Required**: After Phase 1, print summary and proposed Phase 2 architecture. STOP and wait for user confirmation before proceeding.

### Phase 2: Enhanced Loader + Refactoring

**Goal**: Make runtime code use registry-driven loading everywhere.

| ID | Deliverable | Details |
|----|-------------|---------|
| K | Extend `src/content/registry.ts` | Add typed accessors with caching |
| L | Extend `src/content/types.ts` | Add RoomEntry, FlashcardPackEntry, InkEntry interfaces |
| M | Refactor WorldScene room loading | Use `content.getRoom(id).ldtkUrl` |
| N | Refactor EncounterSystem flashcard loading | Use `content.loadFlashcards(packId)` |
| O | Implement image dimension validation | Actually check PNG dimensions in `build-asset-index.mjs` |
| P | Unit test: `syncCameraIgnoreList()` | Verify camera isolation correctness |
| Q | Unit test: registry determinism | Verify stable keys/order across builds |
| R | Extend e2e camera isolation test | More comprehensive zoom/scroll scenarios |
| S | Update NEXT_SESSION.md | Full documentation of changes |

---

## Detailed Deliverable Specifications

### A. docs/INVARIANTS.md

Create this file with the following structure:

```markdown
# Kimbar Invariants

> These rules are SACRED. Breaking them will cause subtle bugs that are hard to diagnose.
> Every agent working on this codebase MUST read and understand these invariants.

## 1. UI Isolation (SACRED)

**Rule**: All UI must be created on the UI layer, rendered only by the UI camera.

**Why**: World camera may zoom/scroll. UI must remain fixed in screen-space.

**Implementation**:
- UI layer obtained via `WorldScene.getUILayer()`
- World camera ignores UI layer via `worldCam.ignore(uiLayer)`
- UI camera renders ONLY the UI layer
- `syncCameraIgnoreList()` enforces no object rendered by both cameras

**Enforcement**:
- `src/game/scenes/WorldScene.ts` - setupCameras(), syncCameraIgnoreList()
- `tests/e2e/smoke.spec.ts` - UI camera isolation test

**How to comply**:
```typescript
// ✅ CORRECT
const container = this.scene.add.container(x, y);
this.scene.getUILayer().add(container);

// ❌ WRONG - Do not add UI directly to scene
this.scene.add.container(x, y); // This goes to world, not UI!
```

## 2. Registry-Driven Routing (SACRED)

**Rule**: Runtime code never constructs content paths manually.

**Why**: Hardcoded paths become "tribal knowledge" that agents break.

**Implementation**:
- Registry loaded once at boot from `/generated/registry.json`
- All content accessed via typed accessors in `src/content/registry.ts`
- Paths are properties of registry entries, not string literals in game code

**Enforcement**:
- `src/content/registry.ts` - typed accessors
- `scripts/validate.js` - registry schema validation
- TypeScript types prevent accessing non-existent properties

**How to comply**:
```typescript
// ✅ CORRECT
const room = content.getRoom('scotus_lobby');
const levelData = await fetch(room.ldtkUrl);

// ❌ WRONG - Do not hardcode paths
const levelData = await fetch('/content/ldtk/scotus_lobby.json');
```

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
- `scripts/sync-public.mjs` copies generated/ → public/generated/

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

## 5. No Slapdash Hardcoding

**Rule**: Magic values go in config files or constants.

**Why**: Scattered magic values become impossible to update consistently.

**Implementation**:
- `content/content_contract.json` - Pipeline rules
- `content/registry_config.json` - Registry template values
- `src/game/constants/` - Runtime constants

## 6. Schema-Enforced Content

**Rule**: All content validated against JSON schemas before runtime.

**Why**: Runtime assumes valid content; catch errors at build time.

**Implementation**:
- Schemas in `schemas/*.schema.json`
- `scripts/validate.js` runs schema validation
- Business logic validation separate from schema validation

**Enforcement**:
- `npm run validate` fails if schemas don't match
- CI blocks merge on validation failure

## 7. Pipeline Determinism

**Rule**: Same inputs produce identical outputs.

**Why**: Non-determinism causes spurious diffs and cache invalidation.

**Implementation**:
- Stable sort order in all generated files
- Consistent JSON formatting
- BuildId based on timestamp for intentional cache-busting

**Enforcement**:
- Unit tests verify registry output stability
```

### C. content/registry_config.json

Extract from `scripts/build-characters.js` the hardcoded values:

```json
{
  "$schema": "./registry_config.schema.json",
  "tileSize": 32,
  "scale": 2,
  "entities": {
    "npc": {
      "required": ["id", "dialogue"],
      "optional": ["facing", "wanderRadius"]
    },
    "chest": {
      "required": ["id", "lootTable"],
      "optional": ["locked", "keyId"]
    },
    "trigger": {
      "required": ["id", "type"],
      "optional": ["enabled", "cooldown"]
    }
  },
  "outfits": {
    "casual": {
      "id": "casual",
      "name": "Casual",
      "spriteOverlay": null,
      "buffs": {}
    },
    "formal": {
      "id": "formal", 
      "name": "Formal Suit",
      "spriteOverlay": "overlay.formal",
      "buffs": { "confidence": 1.1 }
    }
  },
  "tags": {
    "subjects": [
      "evidence",
      "torts", 
      "contracts",
      "constitutional_law",
      "criminal_law",
      "criminal_procedure",
      "civil_procedure",
      "real_property",
      "wills_trusts",
      "family_law",
      "agency_partnership",
      "corporations",
      "secured_transactions",
      "conflict_of_laws",
      "federal_jurisdiction",
      "professional_responsibility"
    ],
    "topicTags": []
  }
}
```

### K. Extended src/content/registry.ts

Add these functions:

```typescript
// Cache for loaded content
const contentCache: Map<string, unknown> = new Map();

export interface RoomEntry {
  id: string;
  ldtkUrl: string;
  displayName?: string;
  spawns?: string[];
}

export interface FlashcardPackEntry {
  id: string;
  url: string;
  schemaVersion: number;
  count?: number;
  contentHash?: string;
  subjects?: string[];
  title?: string;
}

export interface InkEntry {
  id: string;
  url: string;
}

export interface Flashcard {
  id: string;
  q: string;
  a: string;
  tags?: string[];
  deckTag?: string;
  difficulty?: number;
  source?: string;
}

// Get room by ID
export function getRoom(id: string): RoomEntry | undefined {
  const registry = getCachedRegistry();
  return registry?.rooms?.find(r => r.id === id);
}

// Get flashcard pack by ID
export function getFlashcardPack(id: string): FlashcardPackEntry | undefined {
  const registry = getCachedRegistry();
  return registry?.flashcardPacks?.find(p => p.id === id);
}

// Get ink story by ID
export function getInkStory(id: string): InkEntry | undefined {
  const registry = getCachedRegistry();
  return registry?.ink?.find(i => i.id === id);
}

// Load flashcards with caching
export async function loadFlashcards(packId: string): Promise<Flashcard[]> {
  const cacheKey = `flashcards:${packId}`;
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey) as Flashcard[];
  }
  
  const pack = getFlashcardPack(packId);
  if (!pack) {
    throw new Error(`Flashcard pack not found: ${packId}`);
  }
  
  const response = await fetch(pack.url);
  if (!response.ok) {
    throw new Error(`Failed to load flashcards from ${pack.url}: ${response.status}`);
  }
  
  const data = await response.json();
  const cards = data.cards as Flashcard[];
  contentCache.set(cacheKey, cards);
  return cards;
}

// Load room LDtk data with caching
export async function loadRoomData(roomId: string): Promise<unknown> {
  const cacheKey = `room:${roomId}`;
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }
  
  const room = getRoom(roomId);
  if (!room) {
    throw new Error(`Room not found: ${roomId}`);
  }
  
  const response = await fetch(room.ldtkUrl);
  if (!response.ok) {
    throw new Error(`Failed to load room from ${room.ldtkUrl}: ${response.status}`);
  }
  
  const data = await response.json();
  contentCache.set(cacheKey, data);
  return data;
}

// Clear content cache (useful for hot reload)
export function clearContentCache(): void {
  contentCache.clear();
}
```

### J. Updated scripts/validate.js (Flashcard Validation)

Add this section:

```javascript
// ============================================
// FLASHCARD VALIDATION
// ============================================

async function validateFlashcards(registry, errors, warnings) {
  console.log('\n--- Validating Flashcards ---');
  
  if (!registry.flashcardPacks || registry.flashcardPacks.length === 0) {
    warnings.push('No flashcard packs registered in registry');
    return;
  }
  
  // Load schemas
  const packSchema = JSON.parse(fs.readFileSync('schemas/FlashcardPack.schema.json', 'utf8'));
  const fileSchema = JSON.parse(fs.readFileSync('schemas/FlashcardsFile.schema.json', 'utf8'));
  
  for (const pack of registry.flashcardPacks) {
    console.log(`  Validating pack: ${pack.id}`);
    
    // Validate registry entry against schema
    const packValid = ajv.validate(packSchema, pack);
    if (!packValid) {
      errors.push(`Flashcard pack ${pack.id} registry entry invalid: ${ajv.errorsText()}`);
      continue;
    }
    
    // Check file exists
    const filePath = path.join('public', pack.url);
    if (!fs.existsSync(filePath)) {
      errors.push(`Flashcard pack ${pack.id}: file not found at ${filePath}`);
      continue;
    }
    
    // Load and validate file
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // For large files, validate structure + sample
    const isLargeFile = fileContent.cards && fileContent.cards.length > 1000;
    
    if (isLargeFile) {
      // Fast validation: top-level + first 10 cards
      const sampleFile = {
        ...fileContent,
        cards: fileContent.cards.slice(0, 10)
      };
      const sampleValid = ajv.validate(fileSchema, sampleFile);
      if (!sampleValid) {
        errors.push(`Flashcard pack ${pack.id} file invalid: ${ajv.errorsText()}`);
      }
    } else {
      // Full validation
      const fileValid = ajv.validate(fileSchema, fileContent);
      if (!fileValid) {
        errors.push(`Flashcard pack ${pack.id} file invalid: ${ajv.errorsText()}`);
      }
    }
    
    // Business logic: count matches
    if (pack.count !== undefined && pack.count !== fileContent.cards.length) {
      errors.push(`Flashcard pack ${pack.id}: count mismatch. Registry: ${pack.count}, Actual: ${fileContent.cards.length}`);
    }
    
    // Business logic: unique IDs
    const ids = new Set();
    const duplicates = [];
    for (const card of fileContent.cards) {
      if (ids.has(card.id)) {
        duplicates.push(card.id);
      }
      ids.add(card.id);
    }
    if (duplicates.length > 0) {
      errors.push(`Flashcard pack ${pack.id}: duplicate card IDs: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
    }
    
    console.log(`    ✓ ${fileContent.cards.length} cards validated`);
  }
}
```

---

## Operating Procedure

Execute in this exact order:

### Step 1: Read and Understand
1. Read `NEXT_SESSION.md` completely
2. Read `content/content_contract.json`
3. Read `src/content/registry.ts` and `src/content/types.ts`
4. Read `scripts/build-characters.js` (identify BASE_REGISTRY_TEMPLATE)
5. Read `scripts/validate.js` (understand current validation)
6. List contents of `public/content/ldtk/` to find room files
7. Examine `public/content/cards/flashcards.json` structure

### Step 2: Execute Phase 1 (A-J)
1. Create `docs/INVARIANTS.md`
2. Delete `public/content/registry.json`
3. Verify `src/game/scenes/Boot.ts` uses `/generated/registry.json`
4. Create `content/registry_config.json` with extracted template
5. Modify `scripts/build-characters.js` to read from config
6. Modify `scripts/compile-ink.mjs` to output to `generated/ink/`
7. Update `scripts/sync-public.mjs` if needed for ink files
8. Modify `scripts/build-characters.js` to add `rooms` array by scanning `public/content/ldtk/`
9. Modify `scripts/build-characters.js` to add `flashcardPacks` array
10. Create schema files in `schemas/`
11. Update `scripts/validate.js` with flashcard validation

### Step 3: Checkpoint (REQUIRED)
Print the following and STOP:

```
## Phase 1 Complete

### What Changed
- [list all files created/modified]

### Commands to Verify
npm run prepare:content  # Should complete without errors
npm run validate         # Should pass all checks

### Proposed Phase 2 Architecture
[Describe how you'll extend registry.ts and refactor game systems]

### Questions/Concerns
[Any blockers or decisions needed]

---
Awaiting confirmation to proceed with Phase 2.
```

### Step 4: Execute Phase 2 (K-S) After Approval
1. Extend `src/content/types.ts` with new interfaces
2. Extend `src/content/registry.ts` with accessors and caching
3. Refactor `WorldScene.ts` room loading
4. Refactor `EncounterSystem.ts` flashcard loading
5. Implement image dimension validation in `build-asset-index.mjs`
6. Add unit tests
7. Run full test suite: `npm run test`
8. Run build: `npm run build`
9. Fix any errors

### Step 5: Final Documentation
1. Update `NEXT_SESSION.md` with all changes
2. Include "How to add new content" guides

---

## How to Add New Content (Target Documentation)

After completion, NEXT_SESSION.md should include these guides:

### Adding a New Character Sprite
1. Create character spec in `content/characters/{id}.json`
2. Run `npm run prepare:content`
3. Verify sprite appears in `generated/sprites/{id}.png`
4. Verify entry in `generated/registry.json` under `sprites` and `characters`
5. Access in code: `registry.sprites['{id}']`

### Adding a New Room/Level
1. Create LDtk file, export to `public/content/ldtk/{id}.json`
2. Add entry to `content/registry_config.json` under `rooms`:
   ```json
   { "id": "{id}", "ldtkUrl": "/content/ldtk/{id}.json", "displayName": "..." }
   ```
3. Run `npm run prepare:content`
4. Access in code: `content.getRoom('{id}').ldtkUrl`

### Adding a New Flashcard Pack
1. Create flashcards file at `public/content/cards/{id}.json`:
   ```json
   { "schemaVersion": 1, "cards": [...] }
   ```
2. Add entry to registry via `content/registry_config.json`:
   ```json
   { "id": "{id}", "url": "/content/cards/{id}.json", "schemaVersion": 1 }
   ```
3. Run `npm run validate` to verify schema compliance
4. Access in code: `await content.loadFlashcards('{id}')`

### Adding a New Ink Dialogue
1. Create ink file at `content/ink/{id}.ink`
2. Run `npm run prepare:content`
3. Verify compiled JSON at `public/generated/ink/{id}.json`
4. Add registry entry (automatic or manual depending on implementation)
5. Access in code: `content.getInkStory('{id}').url`

---

## Validation Split

| Layer | What It Validates | Tool |
|-------|-------------------|------|
| **JSON Schema** | Required keys exist, types correct, shapes valid | `schemas/*.schema.json` via `validate.js` |
| **Business Logic** | ID uniqueness, count matches, cross-references | `validate.js` custom checks |
| **CI Fast Path** | Top-level structure + sample cards + counts | `validate.js` for large files |
| **Full Validation** | Every single item | `npm run validate --full` (for authors) |

---

## Test Requirements

### Unit Test: syncCameraIgnoreList Correctness
```typescript
// tests/unit/camera_isolation.test.ts
describe('syncCameraIgnoreList', () => {
  it('should ensure no object is rendered by both cameras', () => {
    // Mock scene with uiLayer and world objects
    // Call syncCameraIgnoreList
    // Verify: uiCam ignores all world objects
    // Verify: worldCam ignores uiLayer
    // Verify: no object in both ignore lists (would mean invisible)
  });
});
```

### Unit Test: Registry Determinism
```typescript
// tests/unit/registry_determinism.test.ts
describe('registry generation', () => {
  it('should produce identical output for identical input', () => {
    // Run build-characters.js twice with same input
    // Compare output byte-for-byte (or parsed JSON deep equal)
  });
  
  it('should have stable key ordering', () => {
    // Parse generated registry
    // Verify keys in expected order (alphabetical or defined)
  });
});
```

---

## Output Format (Final Summary)

When complete, print:

```
## What I Changed

### New Files Created
- docs/INVARIANTS.md - Sacred rules documentation
- content/registry_config.json - Extracted registry template
- schemas/FlashcardPack.schema.json - Registry entry schema
- schemas/FlashcardsFile.schema.json - Flashcards file schema
- schemas/RoomEntry.schema.json - Room entry schema
- tests/unit/camera_isolation.test.ts - UI isolation test
- tests/unit/registry_determinism.test.ts - Registry stability test

### Files Modified
- scripts/build-characters.js - Reads from config, adds rooms/flashcards
- scripts/compile-ink.mjs - Output path fixed
- scripts/validate.js - Flashcard validation added
- src/content/registry.ts - Added typed accessors
- src/content/types.ts - Added new interfaces
- src/game/scenes/WorldScene.ts - Registry-driven room loading
- src/game/systems/EncounterSystem.ts - Registry-driven flashcard loading
- NEXT_SESSION.md - Updated with changes and guides

### Files Deleted
- public/content/registry.json - Stale duplicate removed

## Commands

npm run prepare:content  # Full pipeline
npm run validate         # Validation with flashcards
npm run test             # All tests pass
npm run build            # Production build succeeds

## Invariants Enforced

| Invariant | Enforcement Location |
|-----------|---------------------|
| UI Isolation | WorldScene.syncCameraIgnoreList(), e2e/smoke.spec.ts |
| Registry-Driven Routing | TypeScript types, validate.js |
| Generated vs Authored | .gitignore, sync-public.mjs |
| Schema Validation | schemas/*.json, validate.js |
| Determinism | Unit tests |

## How to Add Content

[Include the 4 guides from above]

## Risks/Assumptions

- Assumed flashcards.json has {cards: [...]} top-level structure
- Assumed LDtk files are already valid (no schema for LDtk)
- Room spawns are optional; may need manual population
- Large flashcard files use sampling for performance
```

---

## Do Not

- ❌ Ask questions unless truly blocked
- ❌ Start unrelated refactors
- ❌ Break existing functionality
- ❌ Commit to `generated/` or `public/generated/`
- ❌ Add UI elements without using `getUILayer()`
- ❌ Hardcode content paths in game code
- ❌ Skip the Phase 1 checkpoint

---

## Success Criteria

The task is complete when:

1. ✅ All Phase 1 and Phase 2 deliverables exist
2. ✅ `npm run prepare:content` completes without errors
3. ✅ `npm run validate` passes all checks including flashcards
4. ✅ `npm run test` passes (unit + e2e)
5. ✅ `npm run build` succeeds
6. ✅ `docs/INVARIANTS.md` documents all 7 rules
7. ✅ Registry contains `rooms`, `flashcardPacks`, and `ink` arrays
8. ✅ No hardcoded content paths remain in game code
9. ✅ NEXT_SESSION.md updated with guides

---

**END OF TASK SPECIFICATION**
