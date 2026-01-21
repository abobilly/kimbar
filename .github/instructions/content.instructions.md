---
applyTo: "public/content/**,specs/**,schemas/**,scripts/**,tools/**"
---

# Content Intake / Registry Area

You are operating in the **Content Intake / Registry** area.

> **Canonical Documentation**:
> - [`docs/TILED_PIPELINE.md`](../../docs/TILED_PIPELINE.md) — Authoritative Tiled pipeline documentation
> - [`docs/WORLD_CONTRACT.md`](../../docs/WORLD_CONTRACT.md) — World manifest and room connectivity
> - [`docs/MIGRATION_GUIDE.md`](../../docs/MIGRATION_GUIDE.md) — Migration guidance for legacy content
> - See also: "Content + Levels Rules" in [`AGENTS.md`](../../AGENTS.md)

## Your mission

Streamline asset/content integration so it's:
"drop files → run `npm run prepare:content` → asset index/registries update deterministically → validations pass → runtime loads."

## Canonical pipeline (existing)

`npm run prepare:content` runs:

1. `fetch-vendor` - Download ULPC assets
2. `import:scotus` - Import SCOTUS sources into vendor/
3. `import:lpc` - Import LPC packs + tileset metadata
4. `build:chars` - Compile character specs, generate registry.json
5. `gen:sprites` - Composite LPC layers into spritesheets
6. `compile:ink` - Compile .ink → .json
7. `build:tiled` - Validate + compile Tiled maps
8. `build:levels` - Build unified level index
9. `build:asset-index` - Generate asset manifest
10. `validate` - Schema validation, cross-references

Separately, invariants run via:

- `npm run verify`
- `npm run check-boundaries`

## Rules

- Registry/asset-index first: every loadable thing must be represented in the asset index or a registry under `public/generated/registry/**`.
- Determinism: stable sorting + stable output.
- Schemas: prefer JSON Schema validation at `validate` time; deeper invariants in `verify`.
- Runtime should assume content is already validated (avoid heavy validation in hot paths).
- **Directory separation (STRICT)**: 
  - `specs/rooms/` validates against RoomSpec.schema.json ONLY (Tiled authoring specs)
  - `specs/room_entries/` validates against RoomEntry.schema.json ONLY (registry bridge entries)
  - **NEVER** allow dual-schema validation in a single directory
- **No LDtk scanning**: Room registry is populated from explicit specs in `specs/room_entries/`, NOT by scanning `public/content/ldtk/` directories.

## Room Authoring Flow

### Current: Tiled-First (Authoritative)

**Tiled is now authoritative for all playable rooms.** See [`docs/TILED_PIPELINE.md`](../../docs/TILED_PIPELINE.md) for complete details.

1. Create TMX file in `public/content/tiled/rooms/{room-id}.tmx` from canonical template
2. Add room to world manifest: `public/content/tiled/worlds/scotus.world`
3. Create room entry in `specs/room_entries/{room-id}.json` (RoomEntry schema)
4. Run `npm run build:tiled` → validates + compiles to LevelData
5. Run `npm run validate` → validates RoomEntry schema + Tiled map
6. Use `TILED_ONLY=1 npm run validate` for strict mode (fails if LDtk fallback used)

### Legacy: LDtk Fallback (Deprecated)

LDtk rooms in `public/content/ldtk/` are legacy fallback only:
- When both Tiled and LDtk exist for a room ID, **Tiled always wins**
- New rooms MUST NOT be created in LDtk
- Existing LDtk rooms should be migrated to Tiled (see [`docs/MIGRATION_GUIDE.md`](../../docs/MIGRATION_GUIDE.md))

### Validation Pipeline

- `npm run validate:tiled` — validates raw Tiled JSON maps
- `npm run compile:tiled` — compiles validated maps to LevelData
- `npm run validate` — validates all content including room_entries and rooms

### What NOT to Do

- **NEVER** scan `public/content/ldtk/` to auto-discover rooms
- **NEVER** put RoomEntry specs in `specs/rooms/` (that's for RoomSpec only)
- **NEVER** "fix" empty `specs/rooms/` by scanning directories
- If `specs/rooms/` is empty, that's expected (Tiled authoring not started)

## Content types and their registries

| Content Type | Registry Location         | Loader API                                   |
| ------------ | ------------------------- | -------------------------------------------- |
| Sprites      | `registry.sprites`        | `registry.sprites[id]`                       |
| Characters   | `registry.characters`     | `registry.characters.find(c => c.id === id)` |
| Rooms/LDtk   | `registry.rooms`          | `content.getRoom(id)`                        |
| Flashcards   | `registry.flashcardPacks` | `content.loadFlashcards(id)`                 |
| Ink stories  | `registry.ink`            | `content.getInkStory(id)`                    |
| Outfits      | `registry.outfits`        | `registry.outfits[id]`                       |

## Flashcards

- Do not allow a "special case" `flashcards.json` outside the registry long-term.
- Register in `flashcardPacks` array with url, schemaVersion, count, subjects.
- Enforce: file exists + schema passes in `validate`/`verify`.

## Required outputs for new content types

1. Schema for registry entry (+ minimal schema for pointed-to file)
2. Intake step that emits entries deterministically (usually in `build:chars` or `build:asset-index`)
3. Validation: missing file / schema failure / duplicate IDs must fail
4. Update `NEXT_SESSION.md` with "How to add X" in 3–6 steps

## Common pitfalls to avoid

- Don't let "one special file" live outside the registry. Register it as a dataset.
- Don't write one-off scripts for each asset pack; extend the intake pipeline instead.
- Don't forget to run `npm run validate` after content changes.
