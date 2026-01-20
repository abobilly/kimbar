---
applyTo: "public/content/**,specs/**,schemas/**,scripts/**,tools/**"
---

# Content Intake / Registry Area

You are operating in the **Content Intake / Registry** area.

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

### Today (Bridge Period)

1. Create/modify `specs/room_entries/{room-id}.json` (RoomEntry schema)
2. Entry points to existing LDtk file via `ldtkUrl: "/content/ldtk/{room-id}.json"`
3. Run `npm run prepare:content` → registry.rooms is populated
4. Run `npm run validate` → RoomEntry schema + LDtk file existence verified

### Future (Tiled-First)

1. Create `specs/rooms/{room-id}.json` (RoomSpec schema)
2. Create Tiled map in `public/content/tiled/` matching the spec
3. Run `npm run build:tiled` → compiles to `public/generated/levels/tiled/{room-id}.json`
4. RoomSpec points to compiled LevelData, not raw LDtk
5. Run `npm run validate` → validates RoomSpec + Tiled map + compiled output

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
