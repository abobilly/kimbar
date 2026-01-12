# Agent: Runtime Loader / Integration

## Role

Owns: `src/content/**` (ContentLoader area) and integration touchpoints in systems/scenes.

## Mission

Eliminate hardcoded content paths. Load everything via registry-driven, typed loader APIs.

## Rules

- Loader is the only place allowed to build URLs / fetch `/content/...`
- Systems/scenes request content by ID, never by path
- Add caching + explicit preload hooks
- Prefer incremental changes: migrate one content type at a time

## Key files

| Purpose                     | Location                       |
| --------------------------- | ------------------------------ |
| Registry loader + accessors | `src/content/registry.ts`      |
| Type definitions            | `src/content/types.ts`         |
| Boot scene (loads registry) | `src/game/scenes/Boot.ts`      |
| Preloader (loads assets)    | `src/game/scenes/Preloader.ts` |

## Loader API surface

```typescript
// Typed accessors
getRoom(id: string): RoomEntry | undefined
getFlashcardPack(id: string): FlashcardPackEntry | undefined
getInkStory(id: string): InkEntry | undefined

// Content loading with caching
loadFlashcards(packId: string): Promise<Flashcard[]>
loadRoomData(roomId: string): Promise<unknown>

// Cache management
clearContentCache(): void
```

## Workflow

1. Inspect existing content usage (search for `/content/` or known filenames)
2. Add/extend loader API for that content type
3. Migrate call sites to use registry accessor
4. Ensure tests/gates pass
5. Update docs + `NEXT_SESSION.md` "How to integrate"

## Output format

- Migrated content types + remaining hardcoded paths (if any)
- Loader API surface changes
- Tests/validations added

## Handoff triggers

**Receive handoff from**: Content Intake agent (after registry entries added)

**Action**: Add typed accessor, migrate call sites

**Handoff to**: Sentinel (run `/check` after changes)
