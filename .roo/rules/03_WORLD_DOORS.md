# World Door Contract — Validation First

## Door entity contract
Every door entry must include the following fields:
- `doorId` — stable, unique identifier within the world.
- `fromRoomId` — room containing the door.
- `toRoomId` — destination room identifier (required).
- `toSpawnTag` (or precise `toSpawnX`/`toSpawnY`) — spawn target in the destination room.
- Optional fields: `locked`, `requires`, `oneWay`, `notes`.

## Validator requirements
- Implement `npm run doors:validate` (or fold into `npm run validate:tiled`).
- The validator must fail when:
  - `toRoomId` is missing or unknown.
  - `toSpawnTag` (or coordinates) do not exist in the destination room.
  - `doorId` is duplicated.
  - Doors are placed outside navigable room bounds.
- Gate must run before any manual map edits or migrations.

## Editing process
1. Run the validator.
2. Fix content issues detected by the validator.
3. Re-run validation and document the results.
4. Only then proceed with map or door logic refactors.

## Additional guidance
- Maintain append-only numbering/IDs to avoid GID churn.
- Prefer data-driven transitions; runtime code should look up door definitions from registries.
- Record any manual overrides or exceptional door behaviors in `NEXT_SESSION.md` for review.
