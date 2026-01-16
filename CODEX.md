# Kimbar Agent Instructions (Codex)

## Project
TypeScript + Phaser 3 + Vite game for bar exam prep.

## Data Access (New)
You have access to a rich SQL mirror of the game content for complex queries.
**Database**: `generated/content.db` (SQLite)
**Sync Command**: `npm run db:sync` (Run this first to ensure DB is fresh)

### Schema
- **`characters`**: `id`, `name`, `description`, `body`, `skin`, `hair`, `json` (full blob)
- **`assets`**: `id`, `kind`, `label`, `path`, `tags`, `data` (full blob)

### Query Examples
Run via shell:
```bash
# Find characters with specific hair color
npm run db:query "SELECT id, name FROM characters WHERE hair_color = 'black'"

# Find all prop assets
npm run db:query "SELECT path FROM assets WHERE tags LIKE '%prop%'"
```

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
| `npm run db:sync` | **Sync content JSONs to SQLite DB** |
| `npm run query:db` | (Optional) Helper to run SQL queries |

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
