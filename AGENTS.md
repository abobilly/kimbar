# Kimbar Agent Instructions

## Project

TypeScript + Phaser 3 + Vite game for bar exam prep.

## Sacred Invariants

1. **UI isolation**: All UI created on UI layer (`WorldScene.getUILayer()`). UI renders via UI camera, unaffected by world camera zoom/scroll. Never use `scrollFactor` hacks.

2. **Registry-first content**: No hardcoded `/content/...` paths in runtime code. All loadables (LDtk, ink, flashcards, sprites) addressed via registry and loaded through central loader API.

3. **Deterministic pipelines**: Generated registries/manifests have stable sort order, formatting, IDs. Avoid noisy diffs.

4. **Agent-friendly workflow**: All operations runnable via npm scripts. Validators/tests block regressions. Update `NEXT_SESSION.md` with changes.

## Forbidden Actions

- Loading `/content/...` via hardcoded paths (except central loader module)
- Adding UI elements directly to world display list
- Bypassing schemas/contracts
- Committing to `generated/` or `public/generated/`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run check` | Full gate (content + verify + tests + build) |
| `npm run check:fast` | Quick gate (unit tests only) |
| `npm run prepare:content` | Rebuild content pipeline |
| `npm run validate` | Schema + content validation |

## Content Pipeline

| Type | Authored Location | Generated Location |
|------|-------------------|-------------------|
| Characters | `content/characters/*.json` | `generated/characters/*.json` |
| Rooms | `content/rooms/*.json` | — |
| Ink dialogue | `content/ink/*.ink` | `generated/ink/*.json` |
| Flashcards | `public/content/cards/*.json` | — |
| Sprites | character specs | `generated/sprites/*.png` |

## Key Documentation

- `docs/INVARIANTS.md` — full invariant documentation
- `NEXT_SESSION.md` — current session handoff
- `schemas/*.schema.json` — JSON schemas for validation

## 3-Stage Agent Workflow

Kimbar uses a **Plan → Implement → Review** pipeline with file-based handoffs:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Stage 1: Plan  │────▶│ Stage 2: Bounce │────▶│ Stage 3: Review │
│  (Copilot)      │     │ (Codex + Qwen)  │     │ (Copilot)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
  .ai/plans/*.md           git diff            .ai/reviews/*.md
```

### Stage 1: Copilot Plan

Use the **Planner** agent (`.github/agents/planner.agent.md`) to decompose a goal:

1. Invoke with goal/issue description
2. Agent researches codebase and writes `.ai/plans/<slug>.md`
3. Review and approve the plan before implementation

**Prompt**: `.github/prompts/plan.prompt.md`

### Stage 2: Bounce Harness (Codex + Qwen)

The implementation engine (`tools/bounce.mjs`) executes the plan:

1. Supervisor (Codex) coordinates, Worker (Qwen) implements
2. Gate command (`npm run check`) validates each iteration
3. Max 1–2 iterations per task
4. Output: git diff ready for review

**Run**: `node tools/bounce.mjs --plan .ai/plans/<slug>.md`

### Stage 3: Copilot Review

Use the **Reviewer** agent (`.github/agents/reviewer.agent.md`) to validate:

1. Invoke with plan path + git diff
2. Agent verifies plan coverage, runs gate, checks invariants
3. Writes `.ai/reviews/<slug>.md` with verdict

**Prompt**: `.github/prompts/review.prompt.md`

### File-Based Handoffs

| Artifact | Location | Purpose |
|----------|----------|---------|
| Plans | `.ai/plans/*.md` | Task decomposition specs |
| Reviews | `.ai/reviews/*.md` | Implementation validation |
| Session Handoff | `NEXT_SESSION.md` | Cross-session continuity |

### Agents

| Agent | File | Role |
|-------|------|------|
| Planner | `.github/agents/planner.agent.md` | Decomposes goals into specs |
| Reviewer | `.github/agents/reviewer.agent.md` | Validates implementation |
| Sentinel | `.github/agents/sentinel.agent.md` | QA and gate enforcement |
| Content Intake | `.github/agents/content-intake.agent.md` | Content pipeline ops |
