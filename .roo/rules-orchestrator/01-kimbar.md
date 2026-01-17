# Orchestrator Mode — Kimbar

- Follow MARKDOWN RULES: wrap every filename/function reference as `...`.
- Tool rule: one tool call per response; if delegating, use new_task only.

Orchestrator custom prompt (append):

READ FIRST PROBE (run as the very first action in this task): list every rules file you loaded (full relative paths) and summarize the top 5 binding invariants you will enforce. If you did not load any, say “NO RULES LOADED” and stop.

PRIMARY GOAL: Convert kimbar to a Tiled-first “room template + room pack” workflow that becomes the canonical authored map source, with build-time compilation to a stable LevelData schema and runtime loading/spawning that stays registry-driven. LDtk is legacy/optional and must not be relied on unless explicitly verified.

NON-NEGOTIABLE INVARIANTS:

- 32×32 tiles.
- Required layers in every room map: Floor, Walls, Trim, Overlays, Collision, Entities.
- Avoid tileset reorder/GID drift; tile IDs are append-only.
- Exclude __MACOSX from any scans/imports; add guardrails so it never reappears.
- No new runtime hardcoded asset paths; keep registry/data-driven loading and central loader.
- Generated artifacts remain in generated/ and are gitignored.
- Honor UI isolation invariant (UI stays on UI layer).

SOURCE OF TRUTH FILES TO READ BEFORE EDITS:

- NEXT_SESSION.md
- docs/TILED_PIPELINE.md (create if missing)
- docs/TILED_SCAFFOLD_INVENTORY.md
- Any discovered rules under .roo/rules/** and .roo/rules-orchestrator/**
- AGENTS.md

DELEGATION PLAN (use at most 4 subtasks; each subtask must be file-bounded and end with touched files + diff hunks + verify commands):

1) Contract + docs subtask (Architect): define the canonical “Room Template” spec and “Room Pack” layout, including required layers, naming conventions, and Entities object schema (Door/Spawn/NPC/Trigger). Output concrete examples and acceptance criteria.

2) Build pipeline subtask (Code): implement/extend scripts to (a) validate all maps under public/maps/** (or chosen authored dir) against the contract, (b) compile authored Tiled JSON into a stable LevelData JSON format under generated/levels/**, and (c) add npm scripts to run these steps. Prefer Tiled JSON; avoid runtime TMX/XML parsing.

3) Runtime loader subtask (Code/Debug): update runtime to load LevelData (generated) + spawn entities (Door, PlayerSpawn, NPC, EncounterTrigger) without hardcoded paths, using registry/central loader. Add minimal instrumentation to prove loading and entity spawning.

4) Hygiene gates subtask (Code): ensure .rooignore/.gitignore and pipeline scripts exclude __MACOSX and oversized atlases; add a guard that fails validation when these are present.

OUTPUT REQUIREMENTS FOR EACH SUBTASK:

- Explicitly list allowed directories/files before making changes.
- Minimal diffs only; no unrelated refactors.
- If ambiguity: add instrumentation/logging/asserts first.
- Provide verification commands (npm scripts) and expected outputs.
- Respect terminal truncation: tee logs to tmp/last_run.log and summarize via tail/grep patterns if needed.

FINAL SYNTHESIS (after all subtasks complete):

- Provide a single “How to author a new room” checklist.
- Provide the exact canonical template map path and one example room map path.
- Provide the exact commands to validate + compile + run the game.
- Update NEXT_SESSION.md with what changed and what remains.

START NOW: execute the READ FIRST PROBE as the first step, then proceed with delegation.
