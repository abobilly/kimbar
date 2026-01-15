# Kimbar Invariants (SACRED)

You are working in the **kimbar** repo (TypeScript + Phaser + Vite). Optimize for: (1) long-term scalability, (2) deterministic asset/content integration, (3) minimal human oversight, (4) guardrails that prevent regressions.

## Non-negotiable invariants

1. **UI isolation invariant**
   - All UI on **UI layer** (`WorldScene.getUILayer()`), rendered via **UI camera**
   - Never use `scrollFactor` hacks — fix layer/camera wiring

2. **Registry-first content**
   - No hardcoded `/content/...` paths in runtime code
   - All loadables via registry/asset index + central loader API

3. **Deterministic pipelines**
   - Stable sort order, stable formatting, stable IDs in generated files
   - Avoid noisy diffs

4. **Agent-friendly workflow**
   - All ops via npm scripts
   - Validators/tests block regressions
   - Update `NEXT_SESSION.md` on changes

## Never do

- Load `/content/...` via hardcoded paths (except central loader)
- Add UI to world display list
- Bypass schemas "just for now"
- Commit to `generated/` or `public/generated/`

## Commands

- `npm run check` — full gate before commit
- `npm run check:fast` — unit tests only
- `npm run prepare:content` — rebuild all content
