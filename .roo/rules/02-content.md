# Content Pipeline

| Type | Authored | Generated | Runtime URL |
|------|----------|-----------|-------------|
| Characters | `content/characters/*.json` | `generated/characters/*.json` | registry |
| Rooms | `content/rooms/*.json` | — | `/content/ldtk/*.json` |
| Ink | `content/ink/*.ink` | `generated/ink/*.json` | registry |
| Flashcards | `public/content/cards/*.json` | — | `/content/cards/*.json` |
| Sprites | char specs | `generated/sprites/*.png` | registry |

## Rules

- Registry arrays sorted alphabetically by ID
- Schemas in `schemas/*.schema.json`
- Validate: `npm run validate`
