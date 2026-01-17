# Door Contract

This document defines the data contract and validation rules for room transitions.

## Door Entity Schema

```json
{
  "doorId": "lobby_to_exterior",
  "fromRoomId": "scotus_lobby",
  "toRoomId": "courthouse_exterior",
  "toSpawnTag": "from_lobby",
  "x": 10,
  "y": 0,
  "width": 2,
  "height": 1,
  "locked": false,
  "requires": null,
  "oneWay": false,
  "notes": "Main entrance"
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `doorId` | string | Unique identifier within the world |
| `fromRoomId` | string | Room containing this door |
| `toRoomId` | string | Destination room |
| `toSpawnTag` | string | Named spawn point in destination room |
| `x`, `y` | number | Door position in tiles |

## Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | number | 1 | Door width in tiles |
| `height` | number | 1 | Door height in tiles |
| `locked` | boolean | false | Requires key/condition to open |
| `requires` | string | null | Story flag or item required |
| `oneWay` | boolean | false | Cannot return through this door |
| `notes` | string | null | Developer notes |

## Spawn Tag Convention

Spawn tags follow the pattern: `from_{source_room}` or `{direction}_entry`

Examples:
- `from_lobby` — spawns player coming from lobby
- `south_entry` — spawns player at south edge
- `default` — fallback spawn point

## Validator Rules

The door validator (`npm run doors:validate`) must fail when:

1. **Missing destination**: `toRoomId` does not exist in room registry
2. **Missing spawn**: `toSpawnTag` does not exist in destination room
3. **Duplicate ID**: `doorId` appears more than once in the world
4. **Out of bounds**: Door position is outside room navigable area
5. **Orphan door**: No corresponding return door in destination (unless `oneWay: true`)
6. **Circular lock**: Door A requires door B which requires door A

## Validator Output

```
✓ 45 doors validated
✗ ERROR: lobby_to_vault - toSpawnTag 'from_lobby' not found in vault_main
✗ ERROR: exterior_secret - doorId duplicated (also in courthouse_exterior)
⚠ WARN: library_back - no return door in archives (marked oneWay: false)
```

## Implementation Notes

### Door Detection
```typescript
// Player overlaps door trigger zone
if (playerBounds.intersects(doorBounds)) {
  const door = getDoor(doorId);
  if (door.locked && !hasFlag(door.requires)) {
    showMessage("This door is locked.");
    return;
  }
  transitionToRoom(door.toRoomId, door.toSpawnTag);
}
```

### Spawn Resolution
```typescript
function getSpawnPosition(roomId: string, spawnTag: string): { x: number, y: number } {
  const room = getRoom(roomId);
  const spawn = room.spawns.find(s => s.tag === spawnTag);
  if (!spawn) {
    console.warn(`Spawn tag '${spawnTag}' not found, using default`);
    return room.defaultSpawn;
  }
  return { x: spawn.x, y: spawn.y };
}
```

## Migration Path

When adding new doors:
1. Add door entity to source room Tiled map
2. Add corresponding `PlayerSpawn` with matching tag in destination room
3. Run `npm run doors:validate`
4. Fix any errors before committing
