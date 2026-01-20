# Tiled Migration Discovery & Gap Analysis

**Date:** 2026-01-20  
**Status:** Analysis Complete  
**Objective:** Establish Tiled as the authoritative source for all playable rooms

---

## 1. Canonical Playable Room Set

### Source of Truth

The canonical list of playable rooms is defined in [`specs/room_entries/*.json`](specs/room_entries/). Each file follows the [`RoomEntry.schema.json`](schemas/RoomEntry.schema.json) schema.

**Key Schema Properties:**
- `id` (required): Unique room identifier (pattern: `^[a-z0-9][a-z0-9_]*$`)
- `ldtkUrl`: Legacy LDtk JSON path (pattern: `^/content/ldtk/`)
- `levelUrl`: Compiled Tiled LevelData JSON path (pattern: `^/generated/levels/`)
- `displayName`: Human-readable name
- `environment`: `interior` or `exterior`

### Complete Room Registry (18 rooms)

| Room ID | Display Name | Environment | Has levelUrl |
|---------|--------------|-------------|--------------|
| `cafeteria` | Cafeteria | interior | ❌ |
| `chambers_alito` | Justice Alito's Chambers | interior | ❌ |
| `chambers_barrett` | Justice Barrett's Chambers | interior | ❌ |
| `chambers_gorsuch` | Justice Gorsuch's Chambers | interior | ❌ |
| `chambers_jackson` | Justice Jackson's Chambers | interior | ❌ |
| `chambers_kagan` | Justice Kagan's Chambers | interior | ❌ |
| `chambers_kavanaugh` | Justice Kavanaugh's Chambers | interior | ❌ |
| `chambers_roberts` | Chief Justice Roberts' Chambers | interior | ❌ |
| `chambers_sotomayor` | Justice Sotomayor's Chambers | interior | ❌ |
| `chambers_thomas` | Justice Thomas' Chambers | interior | ❌ |
| `courthouse_exterior` | Courthouse Exterior | exterior | ✅ |
| `courtroom_main` | Main Courtroom | interior | ❌ |
| `library` | Library | interior | ❌ |
| `press_room` | Press Room | interior | ❌ |
| `records_vault` | Records Vault | interior | ❌ |
| `robing_room` | Robing Room | interior | ❌ |
| `room_scotus_hall_01` | SCOTUS Hall 01 | interior | ❌ |
| `scotus_lobby` | SCOTUS Lobby | interior | ✅ |

**Note:** Only 2 rooms (`courthouse_exterior`, `scotus_lobby`) have `levelUrl` pointing to compiled Tiled output.

---

## 2. Current Tiled Coverage Audit

### Existing Tiled Maps

Location: [`public/content/tiled/rooms/`](public/content/tiled/rooms/)

| TMX File | Dimensions (tiles) | Dimensions (px) | Notes |
|----------|-------------------|-----------------|-------|
| `scotus_chambers_shell.tmx` | 48×32 | 1536×1024 | Generic chambers shell |
| `scotus_courtroom_shell.tmx` | 48×32 | 1536×1024 | Courtroom shell |
| `scotus_hallway_01.tmx` | 48×32 | 1536×1024 | Hallway |
| `scotus_library_shell.tmx` | 48×32 | 1536×1024 | Library shell |
| `scotus_lobby_small.tmx` | 48×32 | 1536×1024 | Lobby variant |
| `scotus_office_shell.tmx` | 48×32 | 1536×1024 | Office shell |

**Total: 6 TMX files**

### Compiled Tiled Output

Location: [`public/content/tiled/supreme-court/`](public/content/tiled/supreme-court/)

| JSON File | Purpose |
|-----------|---------|
| `chambers_roberts.json` | Compiled level data |
| `courthouse_exterior.json` | Compiled level data |
| `courtroom_main.json` | Compiled level data |
| `hallway.json` | Compiled level data |
| `lobby.json` | Compiled level data |
| `scotus_lobby.json` | Compiled level data |

---

## 3. LDtk Inventory

### LDtk Source Files

Location: [`public/content/ldtk/`](public/content/ldtk/)

| LDtk File | JSON Export | Dimensions (px) | Dimensions (tiles @ 32px) |
|-----------|-------------|-----------------|---------------------------|
| `cafeteria.ldtk` | `cafeteria.json` | 640×480 | 20×15 |
| `chambers_alito.ldtk` | `chambers_alito.json` | 480×384 | 15×12 |
| `chambers_barrett.ldtk` | `chambers_barrett.json` | 480×384 | 15×12 |
| `chambers_gorsuch.ldtk` | `chambers_gorsuch.json` | 480×384 | 15×12 |
| `chambers_jackson.ldtk` | `chambers_jackson.json` | 480×384 | 15×12 |
| `chambers_kagan.ldtk` | `chambers_kagan.json` | 480×384 | 15×12 |
| `chambers_kavanaugh.ldtk` | `chambers_kavanaugh.json` | 480×384 | 15×12 |
| `chambers_roberts.ldtk` | `chambers_roberts.json` | 480×384 | 15×12 |
| `chambers_sotomayor.ldtk` | `chambers_sotomayor.json` | 480×384 | 15×12 |
| `chambers_thomas.ldtk` | `chambers_thomas.json` | 480×384 | 15×12 |
| `courthouse_exterior.ldtk` | `courthouse_exterior.json` | 800×640 | 25×20 |
| `courtroom_main.ldtk` | `courtroom_main.json` | 960×640 | 30×20 |
| `library.ldtk` | `library.json` | 640×480 | 20×15 |
| `press_room.ldtk` | `press_room.json` | 480×384 | 15×12 |
| `records_vault.ldtk` | `records_vault.json` | 480×384 | 15×12 |
| `robing_room.ldtk` | `robing_room.json` | 480×384 | 15×12 |
| `room.scotus_hall_01.ldtk` | `room.scotus_hall_01.json` | 640×480 | 20×15 |
| `scotus_lobby.ldtk` | `scotus_lobby.json` | 640×480 | 20×15 |

**Total: 18 LDtk files (matching room_entries count)**

### LDtk Support Files

- `_scotus_tileset_def.json` - Tileset definitions
- `_template.json` / `_template.ldtk` - Room template
- `_tile_mapping.json` - Tile ID mapping

---

## 4. Gap Analysis: Coverage Matrix

### Room Coverage Status

| Room ID | Has Tiled TMX | Has LDtk | LDtk Dimensions | Needs TMX |
|---------|---------------|----------|-----------------|-----------|
| `cafeteria` | ❌ | ✅ | 20×15 | ✅ **NEW** |
| `chambers_alito` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_barrett` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_gorsuch` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_jackson` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_kagan` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_kavanaugh` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_roberts` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_sotomayor` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `chambers_thomas` | ⚠️ shell | ✅ | 15×12 | ✅ **CUSTOMIZE** |
| `courthouse_exterior` | ❌ | ✅ | 25×20 | ✅ **NEW** |
| `courtroom_main` | ⚠️ shell | ✅ | 30×20 | ✅ **CUSTOMIZE** |
| `library` | ⚠️ shell | ✅ | 20×15 | ✅ **CUSTOMIZE** |
| `press_room` | ❌ | ✅ | 15×12 | ✅ **NEW** |
| `records_vault` | ❌ | ✅ | 15×12 | ✅ **NEW** |
| `robing_room` | ❌ | ✅ | 15×12 | ✅ **NEW** |
| `room_scotus_hall_01` | ⚠️ hallway | ✅ | 20×15 | ✅ **CUSTOMIZE** |
| `scotus_lobby` | ⚠️ small variant | ✅ | 20×15 | ✅ **CUSTOMIZE** |

### Summary

- **Rooms with dedicated TMX:** 0 (all existing are shells/variants)
- **Rooms needing new TMX:** 6 (cafeteria, courthouse_exterior, press_room, records_vault, robing_room)
- **Rooms needing shell customization:** 12 (all chambers, courtroom, library, hallway, lobby)
- **Total rooms requiring work:** 18

---

## 5. Template & Schema Requirements

### Required Layers (from template)

Per [`public/content/tiled/templates/room-template.json`](public/content/tiled/templates/room-template.json):

| Layer ID | Name | Type | Purpose |
|----------|------|------|---------|
| 1 | `Floor` | tilelayer | Base floor tiles |
| 2 | `Walls` | tilelayer | Wall structures |
| 3 | `Trim` | tilelayer | Decorative trim/molding |
| 4 | `Overlays` | tilelayer | Above-player decorations |
| 5 | `Collision` | tilelayer | Collision markers |
| 6 | `Entities` | objectgroup | Spawns, doors, NPCs, triggers |

### Required Tilesets

| firstgid | Source | Purpose |
|----------|--------|---------|
| 1 | `../tilesets/scotus_floors.tsx` | Floor tiles |
| 257 | `../tilesets/scotus_structures.tsx` | Wall/structure tiles |
| 513 | `../tilesets/scotus_decor.tsx` | Decorative tiles |
| 769 | `../tilesets/collision.tsx` | Collision markers |

### Entity Types (from template)

| Type | Required Properties | Purpose |
|------|---------------------|---------|
| `PlayerSpawn` | `spawnId` (string) | Player spawn point |
| `Door` | `toMap` (string), `toSpawn` (string) | Room transition |
| `NPC` | `characterId` (string) | NPC placement |
| `EncounterTrigger` | `deckTag` (string), `count` (int), `once` (bool) | Flashcard encounter |

### Map Constraints (from schema)

Per [`public/content/tiled/schemas/tiled_room.schema.json`](public/content/tiled/schemas/tiled_room.schema.json):

- **Tile size:** 32×32 (fixed)
- **Map dimensions:** 5-100 tiles (width and height)
- **Orientation:** orthogonal only
- **Render order:** right-down only
- **Infinite:** false (fixed-size maps only)

---

## 6. Recommended Migration Approach

### Phase 1: Dimension Standardization

The existing Tiled shells use 48×32 tiles (1536×1024 px), but LDtk rooms vary:

| LDtk Size | Rooms | Tiled Equivalent |
|-----------|-------|------------------|
| 15×12 | 10 chambers + press_room + records_vault + robing_room | 15×12 or scale to 20×15 |
| 20×15 | cafeteria, library, hallway, lobby | 20×15 |
| 25×20 | courthouse_exterior | 25×20 |
| 30×20 | courtroom_main | 30×20 |

**Decision needed:** Match LDtk dimensions exactly, or standardize to larger shells?

### Phase 2: Room-by-Room Migration

#### Priority 1: High-Traffic Rooms
1. `scotus_lobby` - Main entry point
2. `courtroom_main` - Core gameplay area
3. `library` - Key NPC location

#### Priority 2: Justice Chambers (9 rooms)
- Use `scotus_chambers_shell.tmx` as base
- Customize per-justice with unique decor
- Resize from 48×32 to 15×12 to match LDtk

#### Priority 3: Support Rooms
- `cafeteria`, `press_room`, `records_vault`, `robing_room`
- Create from template or adapt `scotus_office_shell.tmx`

#### Priority 4: Exterior
- `courthouse_exterior` - Requires exterior tileset work

### Phase 3: RoomEntry Updates

For each migrated room, update [`specs/room_entries/{room_id}.json`](specs/room_entries/):

```json
{
  "id": "room_id",
  "displayName": "Room Name",
  "environment": "interior",
  "levelUrl": "/generated/levels/supreme-court/{room_id}.json"
}
```

Remove `ldtkUrl` once Tiled version is validated.

### Phase 4: Validation & Cleanup

1. Run `npm run validate:tiled` on all new TMX files
2. Update room loader to prefer `levelUrl` over `ldtkUrl`
3. Archive LDtk files once migration complete

---

## 7. File Naming Convention

### Recommended TMX Naming

```
public/content/tiled/rooms/
├── scotus_lobby.tmx           # Match room_entry ID
├── courtroom_main.tmx
├── library.tmx
├── chambers_roberts.tmx       # Per-justice chambers
├── chambers_alito.tmx
├── ...
├── cafeteria.tmx
├── press_room.tmx
├── records_vault.tmx
├── robing_room.tmx
├── room_scotus_hall_01.tmx
└── courthouse_exterior.tmx
```

### Compiled Output

```
public/generated/levels/supreme-court/
├── scotus_lobby.json
├── courtroom_main.json
├── ...
```

---

## 8. Open Questions

1. **Dimension policy:** Should Tiled rooms match LDtk dimensions exactly, or use standardized larger shells?

2. **Shell reuse:** Can the 9 justice chambers share a single shell with per-room entity customization, or do they need unique tile layouts?

3. **Exterior tileset:** Does `scotus_exterior.tsx` have sufficient tiles for `courthouse_exterior`, or is additional tileset work needed?

4. **World graph:** Should a `world_graph.json` be created to define room connections, or continue using Door entities in maps?

5. **Migration timeline:** Parallel migration (both systems active) or sequential (complete Tiled before removing LDtk)?

---

## 9. Next Steps

1. [ ] Decide on dimension standardization policy
2. [ ] Create properly-sized TMX for `scotus_lobby` (20×15)
3. [ ] Validate Tiled→LevelData compilation pipeline
4. [ ] Update room loader to support both `levelUrl` and `ldtkUrl`
5. [ ] Migrate high-priority rooms (lobby, courtroom, library)
6. [ ] Create justice chambers from shell template
7. [ ] Create remaining support rooms
8. [ ] Handle exterior room (may need tileset work)
9. [ ] Update all RoomEntry files with `levelUrl`
10. [ ] Archive LDtk files

---

## Appendix: Dimension Reference

### LDtk Room Sizes (pixels → tiles @ 32px)

| Category | Rooms | px | tiles |
|----------|-------|-----|-------|
| Small | 10 chambers, press_room, records_vault, robing_room | 480×384 | 15×12 |
| Medium | cafeteria, library, hallway, lobby | 640×480 | 20×15 |
| Large | courthouse_exterior | 800×640 | 25×20 |
| XL | courtroom_main | 960×640 | 30×20 |

### Current Tiled Shell Sizes

All existing shells: 48×32 tiles (1536×1024 px) - significantly larger than any LDtk room.
