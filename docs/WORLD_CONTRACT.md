# World Contract

This document defines the structure and rules for rooms/levels in kimbar.

## Directory Structure

Room content is split into two directories with strict schema separation:

| Directory | Schema | Purpose |
|-----------|--------|---------|
| `content/room_entries/` | RoomEntry.schema.json | Bridge entries pointing to existing LDtk rooms |
| `content/rooms/` | RoomSpec.schema.json | Future Tiled-authored room specifications |

**INVARIANT**: No implicit room discovery. Rooms are registered via explicit JSON specs only.

## Canonical World Graph (Source of Truth)

World topology is defined in one place:

- **File**: `content/world_graph.json`
- **Schema**: `schemas/WorldGraph.schema.json`
- **Validator**: `scripts/validate.js` (`validateWorldGraph()`)

### What it contains

- **Nodes** (rooms): `id`, `displayName`, `region`, `spawns`
- **Bounds** (optional): `width`/`height` in tiles
- **Portals**: door/exit IDs with tile coordinates and facing
- **Edges**: transitions that reference a portal in the source room and a spawn tag in the destination room

### Naming conventions

- **Portal/Door IDs**: `${fromRoomId}_to_${toRoomId}` (snake_case)
- **Spawn tags**: `from_{source_room}` or `{direction}_entry` (plus `main`/`default` for hubs)

### Tiled authoring alignment

- Door object **name** in Tiled must match the portal/door ID in `world_graph.json`.
- Door object properties (`toMap`, `toSpawn`, `facing`) must align with the world graph edge.
- Spawn tags in Tiled must exist in the destination room’s `spawns` list.

## Bridge Period: RoomEntry (Current)

During the LDtk→Tiled transition, rooms are registered via `content/room_entries/{room-id}.json`:

```json
{
  "$schema": "../../schemas/RoomEntry.schema.json",
  "id": "scotus_lobby",
  "displayName": "SCOTUS Lobby",
  "environment": "interior",
  "ldtkUrl": "/content/ldtk/scotus_lobby.json"
}
```

These entries point to existing LDtk files in `public/content/ldtk/`.

## Future: RoomSpec (Tiled-Authored)

When Tiled authoring is complete, full room specs will be in `content/rooms/{room-id}.json`:

```json
{
  "id": "scotus_lobby",
  "displayName": "SCOTUS Lobby",
  "width": 20,
  "height": 15,
  "tilesetTheme": "scotus_interior",
  "tileset": "tileset.scotus_tiles",
  "defaultSpawn": { "x": 10, "y": 12 },
  "exits": [
    { "doorId": "lobby_to_exterior", "toRoomId": "courthouse_exterior", "toSpawnTag": "from_lobby" }
  ],
  "entities": [
    { "type": "NPC", "id": "npc.clerk", "x": 5, "y": 8, "storyKnot": "clerk_intro" }
  ]
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique room identifier (snake_case) |
| `displayName` | string | Human-readable name for UI |
| `width` | number | Room width in tiles |
| `height` | number | Room height in tiles |
| `tilesetTheme` | string | Visual theme identifier |
| `tileset` | string | Registry reference to tileset |
| `defaultSpawn` | {x,y} | Fallback spawn position |
| `exits` | Exit[] | Door/portal definitions |

## Tileset Themes

| Theme | Description | Primary tileset |
|-------|-------------|-----------------|
| `scotus_interior` | Marble floors, wood panels | `tileset.scotus_tiles` |
| `scotus_exterior` | Stone, grass, columns | `tileset.scotus_exterior` |
| `lpc_victorian` | Victorian buildings | `tileset.lpc_victorian` |

## Layer Contract (Tiled maps)

Every room map must include these layers (in order):

1. **Floor** — base terrain tiles
2. **Walls** — wall tiles with collision
3. **Trim** — decorative borders/molding
4. **Overlays** — objects that render above floor
5. **Collision** — collision shapes (invisible)
6. **Entities** — object layer for NPCs, doors, triggers

## Bounds and Navigation

- Tile size: 32×32 pixels
- Room bounds: `width * 32` × `height * 32` pixels
- Player cannot exit navigable bounds
- Collision layer defines walkable areas

## Entity Types

| Type | Required Fields | Description |
|------|-----------------|-------------|
| `PlayerSpawn` | `x`, `y`, `tag` | Spawn point with named tag |
| `Door` | See DOOR_CONTRACT.md | Room transition |
| `NPC` | `id`, `x`, `y`, `storyKnot` | Interactive character |
| `Prop` | `propId`, `x`, `y` | Static decoration |
| `Trigger` | `x`, `y`, `width`, `height`, `action` | Invisible interaction zone |
| `OutfitChest` | `x`, `y`, `outfitId` | Unlockable costume |

## Validation Rules

- Every room must have at least one `PlayerSpawn`
- Every room must have at least one `Door` (except dead-ends with explicit flag)
- All entity references must resolve in registry
- Room dimensions must match Tiled map dimensions
- No overlapping collision areas

## Runtime Loading

```typescript
const room = getRoom('scotus_lobby');
const levelData = await fetch(room.levelDataUrl).then(r => r.json());
```

Rooms are loaded via registry; never hardcode paths.
