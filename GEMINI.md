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
| `npm run screenshot` | Capture/update gameplay screenshots via E2E agent |

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
| Sentinel | `.github/agents/sentinel.agent.md` | QA and gate enforcement |
| Content Intake | `.github/agents/content-intake.agent.md` | Content pipeline ops |

## Screenshot Agent

The screenshot agent (`scripts/screenshot-agent.mjs`) automates visual verification.

**Usage:** `npm run screenshot`

**Workflow:**
1. Invalidates cache (deletes `test-results/*.png`)
2. Runs headless E2E tests (`npm run test:e2e`)
3. Verifies new screenshots were generated atomically

**Context7 Integration:**
This agent produces standard artifacts in `test-results/` compatible with Context7 visual diffing and Context7 CI reporting pipelines.

