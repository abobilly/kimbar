# READ FIRST — Preflight Protocol

## Preflight before edits
- Load all rule files in `.roo/rules/` and acknowledge them explicitly.
- State the top five binding invariants before taking any action.
- Confirm MCP usage follows the allowlist (see MCP Policy below); forbid arbitrary execution.
- Inventory the impacted subsystems and identify required validators before touching code.
- Log any assumptions or open questions before implementation.

## Minimal diffs
- Change only what is necessary to accomplish the goal.
- Preserve formatting and ordering unless the task requires adjustments for determinism.
- Prefer surgical refactors; if structural changes are required, justify them in the summary.

## Sacred invariants
1. UI isolation — UI is isolated on the UI layer rendered by the UI camera; attach via `WorldScene.getUILayer()`; do not use `scrollFactor` hacks.
2. Registry-first loading — no hardcoded `/content/...` runtime paths outside the central loader.
3. Deterministic pipelines — generated artifacts must be stable and reproducible.
4. Agent-friendly workflow — every operation is an npm script; validators block regressions.
5. MCP controlled — use only allowlisted read-only tools; all edits validated via local gates.
6. **Room registry source-of-truth** — Room registry is populated from explicit specs only:
   - `content/room_entries/*.json` (RoomEntry schema) — bridge entries pointing to existing LDtk rooms
   - `content/rooms/*.json` (RoomSpec schema) — future Tiled-authored rooms (may be empty now)
   - **FORBIDDEN**: scanning LDtk directories (`public/content/ldtk/**`) to auto-discover rooms
   - If `content/rooms/` is empty, that's acceptable (Tiled authoring not yet started).

## MCP Policy (KIMBAR)
- **Allowed**: `repo.search`, `repo.lookup`, `repo.status`, `repo.reindex` (scope=changed only by default).
- **Forbidden**: arbitrary command execution, modifying system config, or any tool not explicitly allowlisted above.
- All edits must still pass local gates (lint/typecheck/tests/content validators) before being considered done.
- Never commit secrets. Use env vars only.

## Run gates
- After every subtask, execute the verification commands listed in `01_GATES.md`.
- Capture logs using the tee/Tee-Object patterns when output would exceed terminal limits.

## Update `NEXT_SESSION.md`
- Append a “What changed / What’s next / Gates run” entry at the end of each task.
- Call out skipped gates with reasons and capture manual validation notes.
