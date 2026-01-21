# World Contract

This document defines the structure and rules for rooms/levels in kimbar.

> **See Also**: [`docs/TILED_PIPELINE.md`](./TILED_PIPELINE.md) is the canonical reference for Tiled authoring, validation, and compilation.

---

## Directory Structure

Room content is organized across multiple directories:

| Directory | Schema | Purpose |
|-----------|--------|---------|
| `specs/room_entries/` | RoomEntry.schema.json | Room registry entries (metadata + source references) |
| `public/content/tiled/rooms/` | — | Tiled TMX source files (primary authoring) |
| `public/content/tiled/worlds/` | — | Tiled .world manifest files |
| `specs/world_graph.json` | WorldGraph.schema.json | Room connectivity and portal definitions |

**INVARIANT**: No implicit room discovery. Rooms are registered via explicit JSON specs in `specs/room_entries/`.

---

## Tiled World Manifest

### Overview

The world manifest is a Tiled `.world` file that provides spatial organization of all playable rooms. It enables visual layout editing in the Tiled editor and serves as a reference for room positions.

**Path**: `public/content/tiled/worlds/scotus.world`

### Structure

The `.world` file is a JSON document with the following structure:

```json
{
  "maps": [
    {
      "fileName": "../rooms/<room_id>.tmx",
      "x": 0,
      "y": 0,
      "width": 640,
      "height": 480
    }
  ],
  "type": "world"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maps` | array | List of map entries in the world |
| `maps[].fileName` | string | Relative path to TMX file from worlds directory |
| `maps[].x` | number | X position in world coordinates (pixels) |
| `maps[].y` | number | Y position in world coordinates (pixels) |
| `maps[].width` | number | Map width in pixels |
| `maps[].height` | number | Map height in pixels |
| `type` | string | Always `"world"` for Tiled world files |

### Current World Contents

The `scotus.world` manifest contains **18 playable rooms**:

| Room ID | Dimensions | Description |
|---------|------------|-------------|
| `cafeteria` | 640×480 | Staff cafeteria |
| `chambers_alito` | 480×384 | Justice Alito's chambers |
| `chambers_barrett` | 480×384 | Justice Barrett's chambers |
| `chambers_gorsuch` | 480×384 | Justice Gorsuch's chambers |
| `chambers_jackson` | 480×384 | Justice Jackson's chambers |
| `chambers_kagan` | 480×384 | Justice Kagan's chambers |
| `chambers_kavanaugh` | 480×384 | Justice Kavanaugh's chambers |
| `chambers_roberts` | 480×384 | Chief Justice Roberts' chambers |
| `chambers_sotomayor` | 480×384 | Justice Sotomayor's chambers |
| `chambers_thomas` | 480×384 | Justice Thomas's chambers |
| `courthouse_exterior` | 800×640 | Exterior courtyard |
| `courtroom_main` | 960×640 | Main courtroom |
| `library` | 640×480 | Law library |
| `press_room` | 480×384 | Press briefing room |
| `records_vault` | 480×384 | Records storage |
| `robing_room` | 480×384 | Justices' robing room |
| `room_scotus_hall_01` | 640×480 | Main hallway |
| `scotus_lobby` | 640×480 | Main lobby |

### Runtime vs Authoring Usage

**Current Status**: The `.world` file is **authoring-only**.

| Use Case | Supported? | Notes |
|----------|------------|-------|
| Visual layout in Tiled editor | ✅ Yes | Open `scotus.world` in Tiled to see all rooms spatially |
| Runtime minimap/layout | ❌ Not yet | Future feature; runtime uses world_graph.json for connectivity |
| Room position queries | ❌ Not yet | Positions are for editor convenience only |

The world manifest enables designers to:
- View all rooms in spatial context
- Navigate between rooms in the Tiled editor
- Maintain consistent relative positioning

---

## Room ID Mapping

### TMX Filename Convention

Room IDs map directly to TMX filenames:

```
Room ID: scotus_lobby
TMX File: public/content/tiled/rooms/scotus_lobby.tmx
World Entry: ../rooms/scotus_lobby.tmx
```

**Pattern**: `{room_id}` → `{room_id}.tmx`

### Room Entry Alignment

Each room in the world manifest must have a corresponding entry in `specs/room_entries/`:

```
specs/room_entries/scotus_lobby.json
├── id: "scotus_lobby"           ← Must match TMX filename (without .tmx)
├── displayName: "SCOTUS Lobby"  ← Human-readable name
├── environment: "interior"      ← Environment type
└── ldtkUrl: (legacy)            ← Optional LDtk fallback
```

### World Graph Alignment

The world graph (`specs/world_graph.json`) defines room connectivity:

```
world_graph.json node.id: "scotus_lobby"
                    ↓
room_entries/scotus_lobby.json id: "scotus_lobby"
                    ↓
tiled/rooms/scotus_lobby.tmx
                    ↓
scotus.world fileName: "../rooms/scotus_lobby.tmx"
```

**Alignment Rules**:
- World graph `node.id` must match room entry `id`
- Room entry `id` must match TMX filename (without extension)
- World manifest `fileName` must reference the correct TMX

---

## Canonical World Graph (Source of Truth)

World topology (connectivity) is defined in one place:

- **File**: `specs/world_graph.json`
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
- Spawn tags in Tiled must exist in the destination room's `spawns` list.

---

## Deterministic Build Behavior

### World Manifest Generation

```bash
npm run build:tiled-world
```

**Script**: [`scripts/build-tiled-world.mjs`](../scripts/build-tiled-world.mjs)

**What it does**:
1. Reads room entries from `specs/room_entries/*.json`
2. For each room entry, checks for corresponding TMX in `public/content/tiled/rooms/`
3. Parses TMX dimensions (width × tilewidth, height × tileheight)
4. Sorts rooms alphabetically for deterministic output
5. Arranges rooms in a grid layout (4 per row, 64px padding)
6. Writes `public/content/tiled/worlds/scotus.world`

**Layout Configuration**:
| Setting | Value |
|---------|-------|
| Maps per row | 4 |
| Padding between maps | 64 pixels |
| Default dimensions | 640×480 pixels (20×15 tiles) |

**Determinism Guarantees**:
- Rooms sorted alphabetically by ID
- Consistent JSON formatting (2-space indent)
- Stable grid positioning algorithm

### When to Rebuild

Run `npm run build:tiled-world` after:
- Adding a new room entry to `specs/room_entries/`
- Adding a new TMX file to `public/content/tiled/rooms/`
- Changing room dimensions in a TMX file

---

## Room Entry Schema

Room entries in `specs/room_entries/{room-id}.json`:

```json
{
  "$schema": "../../schemas/RoomEntry.schema.json",
  "id": "scotus_lobby",
  "displayName": "SCOTUS Lobby",
  "environment": "interior",
  "ldtkUrl": "/content/ldtk/scotus_lobby.json",
  "levelUrl": "/generated/levels/supreme-court/scotus_lobby.json"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique room identifier (snake_case) |
| `displayName` | string | ✅ | Human-readable name for UI |
| `environment` | string | ✅ | `interior` or `exterior` |
| `ldtkUrl` | string | ❌ | Legacy LDtk fallback path |
| `levelUrl` | string | ❌ | Compiled level output path |

---

## Layer Contract (Tiled maps)

Every room map must include these layers (in order):

1. **Floor** — base terrain tiles
2. **Walls** — wall tiles with collision
3. **Trim** — decorative borders/molding
4. **Overlays** — objects that render above floor
5. **Collision** — collision shapes (invisible)
6. **Entities** — object layer for NPCs, doors, triggers

> **Full Details**: See [`docs/TILED_PIPELINE.md`](./TILED_PIPELINE.md) Section 4 for complete layer contract.

---

## Bounds and Navigation

- Tile size: 32×32 pixels
- Room bounds: `width * 32` × `height * 32` pixels
- Player cannot exit navigable bounds
- Collision layer defines walkable areas

---

## Entity Types

| Type | Required Fields | Description |
|------|-----------------|-------------|
| `PlayerSpawn` | `x`, `y`, `spawnId` | Spawn point with named tag |
| `Door` | See DOOR_CONTRACT.md | Room transition |
| `NPC` | `characterId`, `x`, `y` | Interactive character |
| `Prop` | `x`, `y` | Static decoration |
| `EncounterTrigger` | `deckTag`, `count`, `once` | Flashcard battle zone |
| `OutfitChest` | `x`, `y`, `outfitId` | Unlockable costume |

> **Full Details**: See [`docs/TILED_PIPELINE.md`](./TILED_PIPELINE.md) Section 5 for complete entity specifications.

---

## Validation Rules

- Every room must have at least one `PlayerSpawn`
- Every room must have at least one `Door` (except dead-ends with explicit flag)
- All entity references must resolve in registry
- Room dimensions must match Tiled map dimensions
- No overlapping collision areas

---

## Runtime Loading

```typescript
const room = getRoom('scotus_lobby');
const levelData = await fetch(room.levelDataUrl).then(r => r.json());
```

Rooms are loaded via registry; never hardcode paths.

---

## Cross-References

| Document | Purpose |
|----------|---------|
| [`docs/TILED_PIPELINE.md`](./TILED_PIPELINE.md) | Canonical Tiled authoring, validation, and build documentation |
| [`docs/DOOR_CONTRACT.md`](./DOOR_CONTRACT.md) | Door entity specifications and transition behavior |
| [`docs/ASSET_PIPELINE.md`](./ASSET_PIPELINE.md) | Overall asset pipeline overview |
| [`schemas/WorldGraph.schema.json`](../schemas/WorldGraph.schema.json) | World graph JSON schema |
| [`schemas/RoomEntry.schema.json`](../schemas/RoomEntry.schema.json) | Room entry JSON schema |
