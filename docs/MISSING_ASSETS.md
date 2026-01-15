# Kimbar Missing Assets (Generator + Placer Brief)

This is the authoritative list of missing art assets (excluding portraits). It is
structured for AI generators and AI placers. Use `docs/ART_STYLE_GUIDE.md` as the
visual baseline.

## 1. Global Generator Brief

- Style: LPC-inspired, clean, minimal texture, soft top-left lighting.
- Palette anchors: marble/wood/brass/navy per `docs/ART_STYLE_GUIDE.md`.
- Output: PNG with transparency for props; tilesets as 32x32 tile atlases.
- No text, no logos, no watermarks.
- Avoid dithering; avoid photorealism.

## 2. Global Placer Brief

- Grid: 32x32 tiles, top-left origin.
- Anchor: props use bottom-center; tiles align to grid.
- Layering: Floor -> Walls -> Decor -> Props -> Interactables.
- Collisions: walls and large props block movement; keep central aisles clear.

## 3. Tilesets (Missing)

Use tile IDs with `tile.scotus.*` namespace.

### Marble Floors

- ID: `tile.scotus.marble_floor`
- Generator: 32x32 tiles, set of 16-32 tiles: plain, subtle veined, border, corner, inner corner, seal medallion pieces.
- Placer: floors for `scotus_lobby`, `room.scotus_hall_01`, `courtroom_main`.

### Marble Walls + Trims

- ID: `tile.scotus.marble_wall`
- Generator: 32x32 wall blocks, trims, pillars, arch caps, door frames.
- Placer: upper rows in lobby/hall/courtroom, door thresholds at entrances.

### Wood Paneling + Trim

- ID: `tile.scotus.wood_panel`
- Generator: 32x32 wall panels, baseboards, wainscot borders, corners.
- Placer: courtroom and chambers walls.

### Courtroom Dais

- ID: `tile.scotus.dais`
- Generator: 32x32 tiles for platform top, front face, stairs, corners.
- Placer: `courtroom_main` top-center (rows 2-4, cols 12-18).

### Library Wood Floor

- ID: `tile.scotus.library_floor`
- Generator: 32x32 plank set (horizontal + vertical variants, border strips).
- Placer: `library` floor.

### Cafeteria Tile Floor

- ID: `tile.scotus.cafeteria_floor`
- Generator: 32x32 checker tiles (2-3 tone variants).
- Placer: `cafeteria` floor.

### Vault Metal Floor

- ID: `tile.scotus.vault_floor`
- Generator: 32x32 metal/grate tiles, warning stripe border.
- Placer: `records_vault` floor.

## 4. Exterior Additions (Missing Props)

- ID: `prop.scotus_plaque`
  - Generator: bronze wall plaque, 1x1 tile.
  - Placer: facade, near door.
- ID: `prop.statue`
  - Generator: small marble statue, 1x2 tiles.
  - Placer: courtyard corners.
- ID: `prop.bollard`
  - Generator: short metal bollard, 1x1 tile.
  - Placer: sidewalk edges.

## 5. Lobby + Hall Additions (Missing Props)

- ID: `prop.info_desk`
  - Generator: reception desk, 3x1 tiles.
  - Placer: lobby mid-left, keep center aisle clear.
- ID: `prop.metal_detector`
  - Generator: security gate, 2x2 tiles.
  - Placer: near lobby entrance.
- ID: `prop.xray_belt`
  - Generator: x-ray conveyor, 3x1 tiles.
  - Placer: beside metal detector.
- ID: `prop.stanchion`
  - Generator: velvet rope post, 1x1 tile.
  - Placer: queue lines to courtroom door.
- ID: `prop.couch`
  - Generator: low couch, 2x1 tiles.
  - Placer: lobby sides.
- ID: `prop.wall_sconce`
  - Generator: brass wall light, 1x1 tile.
  - Placer: hall walls in rows 1-2.
- ID: `prop.door_plaque`
  - Generator: brass nameplate, 1x1 tile.
  - Placer: outside chamber doors.
- ID: `prop.banner`
  - Generator: vertical banner with seal motif, 1x2 tiles.
  - Placer: lobby upper walls.

## 6. Courtroom Additions (Missing Props)

Existing legal props cover lectern, jury bench, rail, witness stand, flags, gavel.
Missing items below are still needed for layout completeness.

- ID: `prop.judge_bench`
  - Generator: large raised bench, 4x2 tiles.
  - Placer: dais top center.
- ID: `prop.counsel_table`
  - Generator: slim table, 3x1 tiles.
  - Placer: left and right of center aisle.
- ID: `prop.counsel_chair`
  - Generator: courtroom chair, 1x1 tile.
  - Placer: behind counsel tables.
- ID: `prop.jury_box`
  - Generator: enclosed jury seating, 3x2 tiles.
  - Placer: left or right rear quadrant.

## 7. Library Additions (Missing Props)

- ID: `prop.book_ladder`
  - Generator: rolling ladder, 1x2 tiles.
  - Placer: against shelves.
- ID: `prop.card_catalog`
  - Generator: small catalog cabinet, 2x1 tiles.
  - Placer: center-left.
- ID: `prop.reading_table`
  - Generator: long table, 3x1 tiles.
  - Placer: center area.
- ID: `prop.desk_lamp`
  - Generator: green desk lamp, 1x1 tile.
  - Placer: on tables.

## 8. Press Room Additions (Missing Props)

- ID: `prop.podium`
  - Generator: wooden podium with seal circle, 2x1 tiles.
  - Placer: front center.
- ID: `prop.camera_rig`
  - Generator: camera on tripod, 2x2 tiles.
  - Placer: back rows.
- ID: `prop.press_backdrop`
  - Generator: wall backdrop with seal motif (no text), 4x1 tiles.
  - Placer: back wall.
- ID: `prop.press_chair`
  - Generator: simple chair, 1x1 tile.
  - Placer: seating rows.

## 9. Cafeteria Additions (Missing Props)

- ID: `prop.cafeteria_table`
  - Generator: round or square table, 2x2 tiles.
  - Placer: floor grid, keep walkways.
- ID: `prop.cafeteria_chair`
  - Generator: chair, 1x1 tile.
  - Placer: around tables.
- ID: `prop.vending_machine`
  - Generator: vending unit, 1x2 tiles.
  - Placer: wall side.
- ID: `prop.menu_board`
  - Generator: wall board (no text), 2x1 tiles.
  - Placer: above serving line.
- ID: `prop.serving_counter`
  - Generator: cafeteria counter, 4x1 tiles.
  - Placer: north wall.

## 10. Robing Room Additions (Missing Props)

- ID: `prop.robe_rack`
  - Generator: robe rack with hangers, 2x2 tiles.
  - Placer: side wall.
- ID: `prop.mirror`
  - Generator: tall mirror, 1x2 tiles.
  - Placer: near racks.
- ID: `prop.locker`
  - Generator: locker bank, 2x2 tiles.
  - Placer: rear wall.

## 11. Records Vault Additions (Missing Props)

- ID: `prop.vault_door`
  - Generator: metal vault door, 2x2 tiles.
  - Placer: back wall center.
- ID: `prop.metal_shelf`
  - Generator: archive shelving, 2x2 tiles.
  - Placer: side walls.
- ID: `prop.warning_light`
  - Generator: small red light, 1x1 tile.
  - Placer: near vault door.

## 12. Justice Chambers Additions (Missing Props)

These are per-subject props not found in current inventory.

- Evidence: `prop.evidence_board` (2x2), `prop.tape_recorder` (1x1)
- Criminal Procedure: `prop.badge_stand` (1x1), `prop.handcuffs` (1x1), `prop.cctv_monitor` (1x1)
- Civil Procedure: `prop.docket_stack` (1x1), `prop.procedure_chart` (2x1)
- Property: `prop.deed_ledger` (1x1), `prop.map_plot` (2x1), `prop.house_keys` (1x1)
- Contracts: `prop.contract_scroll` (1x1), `prop.handshake_sculpture` (1x2)
- Family Law: `prop.family_photo_frame` (1x1), `prop.toy_blocks` (1x1)
- Criminal Law: `prop.caution_cone` (1x1)
- Torts: `prop.accident_report` (1x1), `prop.medical_chart` (1x1), `prop.hazard_sign` (1x1)
- Constitutional Law: `prop.constitution_scroll` (1x1), `prop.classical_bust` (1x2)

Placer notes:

- Each chamber is 15x12; keep desk and justice at (7,4) clear.
- Use 2-3 subject props per chamber to avoid clutter.

## 13. VFX and UI Sprites (Optional Missing)

If replacing UI shapes with art assets:

- `icon.locked_door` (64x64), `icon.quest_complete` (64x64)
- `vfx.sparkle_unlock` (64x64), `vfx.victory_burst` (64x64)
- `ui.panel_frame` (256x128), `ui.button_normal` (256x48)

## 14. Character Sprites (Missing)

- `npc.tourist` (ULPC 64x64 sheet, casual tourist attire)
- `npc.clerk` (ULPC 64x64 sheet, desk clerk variant distinct from npc.clerk_01)

## 15. Player Outfit Variants (Missing)

`char.kim` only declares 3 variants in `content/characters/char.kim.json`.
Missing visual variants for outfits in `content/registry_config.json`:

- evidence_blazer, civpro_suit, conlaw_robe, court_blazer
- power_suit, crimpro_badge, property_vest, contracts_tie
- family_cardigan, criminal_jacket, torts_blazer, supreme_robe

Generator: ULPC-compatible clothing layers or full sheet variants.
Placer: use OutfitSystem to swap equipped outfit; no room placement.
