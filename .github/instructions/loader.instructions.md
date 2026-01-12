---
applyTo: "src/content/**,src/game/**/ContentLoader*.ts,src/game/**/registry*.ts"
---

# Runtime Loader / Integration Area

You are operating in the **Runtime Loader / Integration** area.

## Mission

Provide a single typed API that loads registries and content via fetchable URLs, caches results, and eliminates hardcoded paths in gameplay/UI systems.

## Rules

- Centralize all path formation and fetch logic in the loader (`src/content/registry.ts`).
- Runtime systems must request content by ID via registry lookups:
  - `getRoom(id)` → RoomEntry with ldtkUrl
  - `getFlashcardPack(id)` → FlashcardPackEntry with url
  - `getInkStory(id)` → InkEntry with url
  - `loadFlashcards(id)` → Promise<Flashcard[]> (fetches + caches)
  - `loadRoomData(id)` → Promise<LDtkData> (fetches + caches)
- Prefer typed models + runtime validation at intake time (not in hot runtime loops).
- Cache aggressively and expose explicit preload/warm functions for scenes.

## Loader API (src/content/registry.ts)

```typescript
// Registry loading
export async function loadRegistry(): Promise<ContentRegistry>;

// Typed accessors
export function getRoom(id: string): RoomEntry | undefined;
export function getFlashcardPack(id: string): FlashcardPackEntry | undefined;
export function getInkStory(id: string): InkEntry | undefined;

// Content loading with caching
export async function loadFlashcards(packId: string): Promise<Flashcard[]>;
export async function loadRoomData(roomId: string): Promise<unknown>;

// Cache management
export function clearContentCache(): void;
```

## How to comply

```typescript
// ✅ CORRECT - Use registry accessor
const room = content.getRoom("scotus_lobby");
const levelData = await fetch(room.ldtkUrl);

// ❌ WRONG - Hardcoded path
const levelData = await fetch("/content/ldtk/scotus_lobby.json");
```

## Forbidden

- Hardcoded `/content/...` strings outside loader module
- Duplicating Phaser asset keys ad hoc; keys should map from registry ids deterministically
- Loading content without going through the registry

## Workflow for migrating content types

1. Inspect existing content usage (search for `/content/` or known filenames)
2. Add/extend loader API for that content type
3. Migrate call sites to use registry accessor
4. Ensure tests/gates pass
5. Update docs + `NEXT_SESSION.md` "How to integrate"
