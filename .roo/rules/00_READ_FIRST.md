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
1. UI isolation — build UI on the UI layer via the UI camera; never patch with `scrollFactor`.
2. Registry-first loading — no hardcoded `/content/...` runtime paths outside the central loader.
3. Deterministic pipelines — generated artifacts must be stable and reproducible.
4. Agent-friendly workflow — every operation is an npm script; validators block regressions.
5. MCP controlled — use only allowlisted read-only tools; all edits validated via local gates.

## MCP Policy (KIMBAR)
- **Allowed**: `repo.search`, `repo.lookup`, `repo.status`, `repo.reindex` (scope=changed only by default), `flashcards.get`, `flashcards.search`.
- **Forbidden**: arbitrary command execution, modifying system config, or any tool not explicitly allowlisted above.
- All edits must still pass local gates (lint/typecheck/tests/content validators) before being considered done.
- Never commit secrets. Use env vars only.

## Run gates
- After every subtask, execute the verification commands listed in `01_GATES.md`.
- Capture logs using the tee/Tee-Object patterns when output would exceed terminal limits.

## Update `NEXT_SESSION.md`
- Append a “What changed / What’s next / Gates run” entry at the end of each task.
- Call out skipped gates with reasons and capture manual validation notes.
