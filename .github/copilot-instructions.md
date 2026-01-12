# Kimbar Copilot Instructions

You are working in the **kimbar** repo (TypeScript + Phaser + Vite). Optimize for: (1) long-term scalability, (2) deterministic asset/content integration, (3) minimal human oversight, (4) guardrails that prevent regressions when multiple agents contribute.

## North Star

Build systems that make future edits cheap. Prefer contracts + deterministic pipelines over ad-hoc fixes.

## Non-negotiable invariants (SACRED)

1. **UI isolation invariant**

   - All UI must be created on the **UI layer/container** provided by the scene (e.g., `WorldScene.getUILayer()`).
   - UI must render via **UI camera** and not be affected by world camera zoom/scroll.
   - Do not "fix" UI placement using `scrollFactor` hacks. Fix the layer/camera wiring instead.

2. **Registry-first content + assets**

   - No hardcoded content paths sprinkled across runtime code.
   - Anything loadable (levels/LDtk, ink, flashcards, atlases, sprites, etc.) must be addressable via a **registry/asset index** and loaded through a single loader API.

3. **Deterministic pipelines**

   - Generated registries/manifests must be stable: stable sort order, stable formatting, stable IDs.
   - Avoid noisy diffs.

4. **Agent-friendly workflow**
   - Every major operation must be runnable via npm scripts.
   - Validators/tests must block regressions automatically.
   - Update `NEXT_SESSION.md` with: what changed + how to use + hazards/invariants.

## Canonical commands (existing)

- Content prep (runs vendor fetch + chars + sprites + ink + asset index + sync + validate):
  - `npm run prepare:content`
- Additional invariant checks:
  - `npm run verify`
  - `npm run check-boundaries`
- Tests:
  - `npm run test` (unit + e2e)
  - `npm run test:unit` (unit only)
- Build:
  - `npm run build` (includes `prebuild` which runs `prepare:content`)
  - `npm run build-nolog` (no `prebuild` hook)
- Umbrella gate (run before PR):
  - `npm run check` (runs all gates)
  - `npm run check:fast` (unit tests only, no e2e)

## Key documentation

- `docs/INVARIANTS.md` - Full invariant documentation with code examples
- `NEXT_SESSION.md` - Current handoff state + how to add content
- `AGENT_TASK_PIPELINE_HARDENING.md` - Pipeline hardening task spec (delete when complete)

## Never do

- Never introduce new runtime code that loads `/content/...` via hardcoded string paths (except inside the central loader module).
- Never add UI elements directly to the world display list.
- Never bypass schemas/contracts "just for now."
- Never commit to `generated/` or `public/generated/` (gitignored build artifacts).

## Output expectations when asked to implement work

- "What changed" summary
- Commands to run
- Files touched
- "How to add new asset/content" steps
- Invariants enforced + where (scripts/tests)
