# Plan: SCOTUS portals + spawns wiring

**Goal**: Wire all SCOTUS zone TMX maps with portals and arrival spawns that mirror `specs/world_graph.json` (exterior ↔ lobby ↔ basement ↔ second ↔ third ↔ roof) using the Tiled-first contract.
**Issue**: User request — portal/spawn wiring for SCOTUS zones
**Created**: 2026-01-23

## Steps

1. [ ] Derive portal + spawn matrix from `specs/world_graph.json`
   - **Acceptance**: Table prepared with every portal ID, source map, target map, target spawn tag, facing, and tile coords (convert to pixel: tile * 32). Arrival spawn tags per room enumerated (e.g., lobby needs `from_exterior`, `from_0`, `from_2`, etc.).
   - **Files**: `specs/world_graph.json`, `docs/DOOR_CONTRACT.md`, `docs/WORLD_CONTRACT.md`

2. [ ] Add portal objects to each SCOTUS TMX (Portals layer)
   - **Acceptance**: 
     - `scotus_1_lobby`: portals `lobby_to_exterior` (x=128,y=4,facing=down → target scotus_exterior/from_lobby), `lobby_to_basement` (x=240,y=128,facing=right → target scotus_0_basement/from_1), `lobby_to_second` (x=16,y=128,facing=left → target scotus_2_second/from_1).
     - `scotus_0_basement`: portal `basement_to_lobby` at (4,128) facing left → target scotus_1_lobby/from_0.
     - `scotus_2_second`: portals `second_to_lobby` at (252,128) facing right → target scotus_1_lobby/from_2; `second_to_third` at (4,128) facing left → target scotus_3_third/from_2.
     - `scotus_3_third`: portals `third_to_second` at (252,128) facing right → target scotus_2_second/from_3; `third_to_roof` at (4,128) facing left → target scotus_4_roof/from_3.
     - `scotus_4_roof`: portal `roof_to_third` at (128,252) facing down → target scotus_3_third/from_4.
     - Each portal is type `Door`, size 64×64 (2×2 tiles), placed at pixel coords (tile * 32), with properties `targetMap`, `targetSpawnId`, `facing` set.
   - **Files**: `public/content/tiled/rooms/scotus_zones/scotus_1_lobby.tmx`, `scotus_0_basement.tmx`, `scotus_2_second.tmx`, `scotus_3_third.tmx`, `scotus_4_roof.tmx`

3. [ ] Add arrival spawns matching world_graph edges (Spawns layer)
   - **Acceptance**: 
     - `scotus_1_lobby`: add `spawn_from_exterior` near lobby-to-exterior portal, `spawn_from_0` near lobby-to-basement portal, `spawn_from_2` near lobby-to-second portal (size 32×32, type `Spawn`, `spawnId` matches tag, `facing` matches inbound edge facing; keep existing `spawn_default`).
     - `scotus_0_basement`: add `spawn_from_1` adjacent to basement_to_lobby portal (keep `spawn_default`).
     - `scotus_2_second`: add `spawn_from_1` near second_to_lobby portal, `spawn_from_3` near second_to_third portal (keep `spawn_default`).
     - `scotus_3_third`: add `spawn_from_2` near third_to_second portal, `spawn_from_4` near third_to_roof portal (keep `spawn_default`).
     - `scotus_4_roof`: add `spawn_from_3` near roof_to_third portal (keep `spawn_default`).
     - Spawns sit on the interior side of their portal (grid-aligned), unique `spawnId` per map, with `facing` set to the direction of travel from the incoming edge (e.g., edge `facing=down` → spawn faces down).
   - **Files**: Same TMX files as Step 2 (Spawns object layer)

4. [ ] Bump object IDs and preserve layer stack
   - **Acceptance**: Each TMX `nextobjectid` reflects the highest new object ID + 1 (e.g., lobby likely 8 after 3 portals + 3 spawns + existing spawn), `Portals`/`Spawns` layers stay in their current order (8-layer template untouched), and object IDs are unique within each map.
   - **Files**: All edited TMX files

5. [ ] Validate and compile Tiled content
   - **Acceptance**: `npm run validate:tiled` passes for all `scotus_zones`; `npm run compile:tiled` and `npm run build:levels` complete without errors; optional `TILED_ONLY=1 npm run validate` noted for strict runs. Captured any validator warnings (e.g., duplicate spawn IDs) and resolved.
   - **Files**: Build/validation outputs (no commits), TMX sources if fixes needed

6. [ ] Update handoff notes
   - **Acceptance**: `NEXT_SESSION.md` updated with summary of portal/spawn wiring, coordinates/facing conventions used, commands run/not run, and remaining follow-ups (e.g., art/collision polish). Include quick “how to add/adjust SCOTUS portal” steps.
   - **Files**: `NEXT_SESSION.md`

## Do Not Touch

- `public/generated/**` outputs (gitignored; rebuild instead of editing)
- Runtime loader/scene code and registries (portal work is authoring-side only)
- World graph structure except for reading (no edge/node edits unless a mismatch is discovered)
- LDtk sources (Tiled is authoritative; no scanning or edits there)

## Gate Command

```bash
npm run check
```

## Notes

- Use Tiled grid alignment: portal tile coords × 32 for pixel placement; keep portal objects 64×64 and spawn objects 32×32.
- Ensure portal `facing` matches the edge direction in `specs/world_graph.json`; spawn `facing` should mirror the inbound edge’s facing.
- Keep layer order from the 8-layer template (Floor, Walls, Trim, Overlays, Collision, Entities, Portals, Spawns) untouched.
- Maintain deterministic edits (stable ordering, no noisy whitespace); avoid touching `nextlayerid`.