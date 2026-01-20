# Kimbar Agent Instructions

## Project

TypeScript + Phaser 3 + Vite game for bar exam prep.

## Sacred Invariants

1. **UI isolation**: UI is isolated on the UI layer rendered by the UI camera; attach via `WorldScene.getUILayer()`. Do not use `scrollFactor` hacks.

2. **Registry-first content**: No hardcoded `/content/...` paths in runtime code. All loadables (LDtk, ink, flashcards, sprites) addressed via registry and loaded through central loader API.

3. **Deterministic pipelines**: Generated registries/manifests have stable sort order, formatting, IDs. Avoid noisy diffs.

4. **Agent-friendly workflow**: All operations runnable via npm scripts. Validators/tests block regressions. Update `NEXT_SESSION.md` with changes.

## Forbidden Actions

- Loading `/content/...` via hardcoded paths (except central loader module)
- Adding UI elements directly to world display list
- Bypassing schemas/contracts
- Committing to `public/generated/`

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
| Characters | `specs/characters/*.json` | `public/generated/characters/*.json` |
| Rooms | `specs/rooms/*.json` | — |
| Ink dialogue | `specs/ink/*.ink` | `public/generated/ink/*.json` |
| Flashcards | `public/content/cards/*.json` | — |
| Sprites | character specs | `public/generated/sprites/*.png` |
| Tiled rooms | `public/content/tiled/**/*.json` | — |
| Tilesets (static) | `public/assets/tilesets/` | — |

## Key Documentation

- `.roo/rules/00_READ_FIRST.md` — sacred invariants and preflight protocol
- `NEXT_SESSION.md` — current session handoff
- `docs/MIGRATION_GUIDE.md` — **comprehensive asset placement guide**
- `docs/ASSET_PIPELINE.md` — pipeline overview
- `schemas/*.schema.json` — JSON schemas for validation

## 2-Stage Agent Workflow

Kimbar uses a **Plan → Review** pipeline with file-based handoffs:

```
┌─────────────────┐     ┌─────────────────┐
│  Stage 1: Plan  │────▶│ Stage 2: Review │
│  (Copilot)      │     │ (Copilot)       │
└─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
  .ai/plans/*.md         .ai/reviews/*.md
```

### Stage 1: Copilot Plan

Use the **Planner** agent (`.github/agents/planner.agent.md`) to decompose a goal:

1. Invoke with goal/issue description
2. Agent researches codebase and writes `.ai/plans/<slug>.md`
3. Review and approve the plan before implementation

**Prompt**: `.github/prompts/plan.prompt.md`

### Stage 2: Copilot Review

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

---

## Model-Specific Extensions

### Gemini CLI (Data Access)

When using Gemini CLI with MCP Toolbox:
- **Source**: `kimbar-content` (SQLite)
- **Tools**: `query-content`, `search-characters`
- **Sync**: Run `npm run db:sync` to refresh the database from JSON files.

### Codex (SQL Queries)

When using Codex with database access:
- **Database**: `public/generated/content.db` (SQLite)
- **Sync**: `npm run db:sync` (run first to ensure DB is fresh)

**Schema:**
- `characters`: `id`, `name`, `description`, `body`, `skin`, `hair`, `json`
- `assets`: `id`, `kind`, `label`, `path`, `tags`, `data`

**Query examples:**
```bash
npm run db:query "SELECT id, name FROM characters WHERE hair_color = 'black'"
npm run db:query "SELECT path FROM assets WHERE tags LIKE '%prop%'"
```

### Screenshot Agent

The screenshot agent (`scripts/screenshot-agent.mjs`) automates visual verification:
```bash
npm run screenshot
```

**Workflow:**
1. Invalidates cache (deletes `test-results/*.png`)
2. Runs headless E2E tests (`npm run test:e2e`)
3. Verifies new screenshots were generated atomically
