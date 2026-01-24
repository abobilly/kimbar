# Plan: SCOTUS zone Tiled migration

**Goal**: Adapt the Tiled pipeline to support the new six-zone SCOTUS maps, including folder layout, validation/compile/build updates, registry/world alignment, asset intake rules, and runtime portal handling.
**Issue**: User request — 6-zone SCOTUS Tiled migration
**Created**: 2026-01-23

## Steps

1. [ ] Lock in zone layout + IDs
   - **Acceptance**: Canonical list of the six zone IDs (matching incoming TMX names) recorded; folder layout decided as `public/content/tiled/rooms/scotus_zones/<zone_id>.tmx` with matching compiled output paths and registry IDs; legacy single-room TMX/LDtk locations noted for quarantine.
   - **Files**: `docs/TILED_PIPELINE.md`, `AGENTS.md` (if naming guidance needed), directory scaffolding notes in `NEXT_SESSION.md`.

2. [ ] Define SCOTUS zone map contract
   - **Acceptance**: Documented required layers/order (Floor, Walls, Trim, Overlays, Collision, Entities), mandatory map properties (tile size 32, orthogonal, renderorder right-down, environment default), and entity/property rules for zone maps (Door toMap/toSpawn, PlayerSpawn spawnId, NPC/EncounterTrigger/Prop/OutfitChest). Any new zone-specific properties (e.g., `zoneId`, `region`, optional `allowLargeMap`) are specified; updated template/schema targets enumerated (tiled_room.schema, room template or new zone template) with stable defaults.
   - **Files**: `public/content/tiled/templates/*.json`, `public/content/tiled/schemas/tiled_room.schema.json`, `docs/TILED_PIPELINE.md`, `docs/DOOR_CONTRACT.md`.

3. [ ] Extend validators for zone sources
   - **Acceptance**: Validation flow covers nested TMX under `rooms/scotus_zones/**`; bounds rules updated (allowlist for large zones, per-map override property) with deterministic allowlist values; schema/unit changes outlined for new entity props if any; plan for `validate-tiled-maps.mjs` to enforce target-map allowlist (only zone IDs and approved legacy rooms) and to parse PlayerSpawn tags for cross-map checks. Cross-map portal validation strategy written: resolve each Door to a target map + spawn from compiled/parsed data and fail if missing.
   - **Files**: `scripts/validate-tiled-maps.mjs`, `public/content/tiled/schemas/tiled_room.schema.json`, `docs/TILED_PIPELINE.md`, `docs/DOOR_CONTRACT.md`.

4. [ ] Update compile/build/glob pipeline for zones
   - **Acceptance**: Changes identified to include nested zone TMX in `compile-tiled-maps.mjs` (levelId should retain subpath), ensure outputs land under `public/generated/levels/tiled/scotus_zones/<zone>.json`, and to refresh `build:tiled` orchestration. `build-levels.js` and `validate.js` update list captures: TILED_ONLY behavior with nested sources, target-map allowlist honored, missing-compilation warnings adjusted. Deterministic sorting rules retained/updated for subpaths.
   - **Files**: `scripts/compile-tiled-maps.mjs`, `scripts/build-levels.js`, `scripts/validate.js`, `package.json` scripts (if needed), `scripts/watch:tiled` (if globbed).

5. [ ] Legacy map quarantine + migration guardrails
   - **Acceptance**: Decision recorded on how to isolate legacy TMX/LDtk (e.g., move to `public/content/tiled/_legacy/`, prefix with `_`, or allowlist in validators). Validators/builders configured to skip quarantined maps while still allowing reference data if needed; TILED_ONLY + level index behavior documented for legacy skips. Any world_graph nodes/room_entries slated for removal or marked legacy are listed.
   - **Files**: `scripts/validate-tiled-maps.mjs` (skip rules), `scripts/compile-tiled-maps.mjs`, `scripts/build-levels.js`, `NEXT_SESSION.md` (instructions), potential file moves (documented only in plan).

6. [ ] Registry + world manifest alignment for zones
   - **Acceptance**: Plan enumerates required `specs/room_entries/<zone>.json` additions, world graph node/edge updates (portal IDs, spawn tags, bounds for each zone), and `.world` manifest strategy (extend existing `scotus.world` or add `scotus_zones.world`) with deterministic positioning. Strategy for mapping portal properties in TMX to world_graph edges (naming convention, spawn tags) is documented.
   - **Files**: `specs/room_entries/*.json`, `specs/world_graph.json`, `public/content/tiled/worlds/scotus.world` (or new world), `docs/WORLD_CONTRACT.md`, `docs/DOOR_CONTRACT.md`.

7. [ ] Asset/tileset intake conventions for zones
   - **Acceptance**: Tileset/atlas source locations and naming defined (e.g., `public/assets/tilesets/scotus_zones/*`), TSX references outlined with firstgid plan, and validation/intake updates listed (tileset registry, tile part schemas if needed). Any import/sync steps (e.g., `import-scotus-assets.py`, `build-tiled-tilesets.mjs`) identified for updates to pull zone art deterministically.
   - **Files**: `public/content/tiled/tilesets/*.tsx`, `public/assets/tilesets/**`, `specs/ai_jobs/*` if manifests needed, `scripts/import-scotus-assets.py`, `scripts/build-tiled-tilesets.mjs`, `docs/ASSET_PIPELINE.md`.

8. [ ] Runtime loader + portal transition implications
   - **Acceptance**: Plan states required updates (if any) to `src/content/registry.ts`, `loadRoomData`, level registry paths, and door handling (`entity-spawner`, transition systems) to accept subpath zone IDs and to reconcile portal validation (e.g., runtime assertion vs precompiled). Caching and preload behavior unchanged unless noted. Hardcoded path avoidance reaffirmed.
   - **Files**: `src/content/registry.ts`, `src/types/level-data.ts`, `src/world/entity-spawner.ts`, `src/game/scenes/WorldScene.ts`, `docs/TILED_PIPELINE.md` (runtime expectations).

9. [ ] Documentation and handoff updates
   - **Acceptance**: Updated sections identified for Tiled pipeline (zone folder layout, contract, validator rules), asset pipeline (tileset intake for zones), and handoff (`NEXT_SESSION.md` instructions for adding a new zone map + commands). Any additional doc touchpoints (MIGRATION_GUIDE, WORLD_CONTRACT) listed.
   - **Files**: `docs/TILED_PIPELINE.md`, `docs/ASSET_PIPELINE.md`, `docs/WORLD_CONTRACT.md`, `NEXT_SESSION.md`, `AGENTS.md` (brief note if needed).

10. [ ] Verification commands
    - **Acceptance**: Command list prepared for implementer (e.g., `npm run validate:tiled`, `npm run build:tiled`, `npm run build:levels`, `TILED_ONLY=1 npm run validate`, `npm run check`), including when to rerun after moving legacy maps and after adding new tilesets. Any new ad hoc checks (portal cross-map validator) included.
    - **Files**: `README.md`/`NEXT_SESSION.md` command snippets.

## Do Not Touch

- `public/generated/**` outputs (rebuilt via scripts; never committed)
- Hardcoded `/content/...` paths in runtime code outside loader (keep registry-first)
- UI layering invariants (no UI on world display list)
- Avoid scanning `public/content/ldtk/` for room discovery; use explicit specs only

## Gate Command

```bash
npm run check
```

## Notes

- Assume new six-zone TMX will arrive under `public/content/tiled/rooms/scotus_zones/`; confirm exact filenames before wiring allowlists.
- Bounds allowlist should stay deterministic (sorted) to avoid noisy diffs.
- Cross-map portal validation should leverage parsed PlayerSpawn tags rather than manual string lists to stay in sync with authored TMX.
- Preserve deterministic ordering in all generated manifests and indices when introducing subpaths.
