# Props & Assets — Naming, Registry, Validation

## Naming policy
- File names for props follow `prop.<category>_<descriptor>.png`.
- Metadata files live beside sprites as `prop.<category>_<descriptor>.json`.
- Keep naming deterministic; avoid spaces, uppercase, or ambiguous abbreviations.

## Metadata requirements
- Each metadata JSON must include:
  - `id`
  - `size` (width/height)
  - `anchor`
  - `collision`
  - `tags`
- Document palette/style notes when relevant.

## Registry contract
- Maintain a single authoritative registry (e.g., `props.registry.json`).
- Every prop sprite and metadata file must be referenced by the registry.
- Registry must include category labels, source attribution, and usage notes.

## Validation gates
- Add checks to ensure:
  - No orphan sprite/metadata files exist outside the registry.
  - No registry entries point to missing files.
  - Dimensions, anchors, and collision bounds align with metadata.
- Integrate prop validation into `npm run verify` or a dedicated script and list it in `01_GATES.md` if separate.

## Content hygiene
- Remove deprecated props via scripted migrations so history remains traceable.
- Update placement drafts and level files immediately after prop changes.
- Record asset provenance (manual, LPC import, procedural) for each new entry.
