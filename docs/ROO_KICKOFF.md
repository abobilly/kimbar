# Roo Kickoff Protocol

Use this protocol every time you begin a new Roo session.

## First message to Roo

```
READ FIRST PROTOCOL:
1) Preflight: list rule files you are following + summarize top 5 invariants.
2) Inventory repo structure: key dirs for src/, public/content/, ldtk/tiled, assets, registries/manifests.
3) Propose a plan with 3–5 subtasks max, each with: deliverables, files touched, verification commands.
4) Execute ONE subtask at a time. After each, list gates and update NEXT_SESSION.md.
Clean-as-you-go is mandatory: do not add assets or data without registry references and validation.
```

## Fix order (coupled issues)

Follow these phases in order.

### Phase A — UI (stop the bleeding)
- Deliverable: `UIScene` + RexUI primitives + migrate Dialogue first.
- Acceptance:
  - Dialogue panel never clips.
  - Choices disable after click.
  - UI does not move with the camera.
- Do not let Roo touch doors/props during this phase.

### Phase B — Doors/ports mismatch
- Goal: add a validator before touching maps.
- Door contract requirements:
  - `doorId`
  - `fromRoomId`
  - `toRoomId`
  - `toSpawnTag` (or `toSpawnX/Y`)
  - Optional: `locked`, `requires`, `oneWay`
- Validator must fail when:
  - `toRoomId` missing
  - `toSpawnTag` missing in destination room
  - duplicate `doorId`
  - door positioned outside bounds
- Deliverable: `npm run doors:validate` (or integrated into map validator).

### Phase C — Props cleanup
- Enforce:
  - `prop.*.png` naming.
  - `prop.*.json` metadata with size, anchor, collision, tags.
  - Single `props.registry.json` enumerating props used in rooms.
- Validator must ensure no unreferenced or missing props.

## Qdrant positioning
- D2 remains the source of truth for flashcards.
- Qdrant is optional for the semantic layer, to be enabled later.
- Store Qdrant URL/API keys in server-side environment variables only.

## Operational notes
- Keep secrets/config out of Vite client envs.
- Update `NEXT_SESSION.md` after each subtask with:
  - What changed (files list)
  - What’s next
  - Gates run / not run (and why)
