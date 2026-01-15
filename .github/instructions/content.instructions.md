---
applyTo: "public/content/**,content/**,schemas/**,scripts/**,tools/**"
---

# Content Intake / Registry Area

You are operating in the **Content Intake / Registry** area.

## Your mission

Streamline asset/content integration so it's:
"drop files → run `npm run prepare:content` → asset index/registries update deterministically → validations pass → runtime loads."

## Canonical pipeline (existing)

`npm run prepare:content` runs:

1. `fetch-vendor` - Download ULPC assets
2. `build:chars` - Compile character specs, generate registry.json
3. `gen:sprites` - Composite LPC layers into spritesheets
4. `compile:ink` - Compile .ink → .json
5. `build:asset-index` - Generate asset manifest
6. `sync:public` - Copy generated/ → public/generated/
7. `validate` - Schema validation, cross-references

Separately, invariants run via:

- `npm run verify`
- `npm run check-boundaries`

## Rules

- Registry/asset-index first: every loadable thing must be represented in the asset index or a registry under `public/content/**`.
- Determinism: stable sorting + stable output.
- Schemas: prefer JSON Schema validation at `validate` time; deeper invariants in `verify`.
- Runtime should assume content is already validated (avoid heavy validation in hot paths).

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
