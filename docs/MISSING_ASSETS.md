# Kimbar Missing Assets (Second Pass: Generator + Placer Guidance)

This is the authoritative list of missing art assets (portraits excluded).
Use `docs/ART_STYLE_GUIDE.md` as the visual baseline.

## 1. Priority Legend

- P0: Required for MVP room readability or navigation.
- P1: Strongly recommended for thematic clarity.
- P2: Nice-to-have polish or optional UI art.

## 2. Global Generator Brief

- Style: LPC-inspired, clean, minimal texture, soft top-left lighting.
- Palette anchors: marble/wood/brass/navy per style guide.
- Output: PNG with transparency for props; tilesets as 32x32 tile atlases.
- No text, no logos, no watermarks, no photorealism.

## 3. Global Placer Brief

- Grid: 32x32 tiles, top-left origin.
- Anchor: props use bottom-center; tiles align to grid.
- Layer order: Floor -> Walls -> Decor -> Props -> Interactables.
- Collision: walls + large props block; keep center aisle clear.

## 4. Room Zone Map (for placers)

Zones are used below to avoid repeating coordinates.

- courthouse_exterior (25x20):
  - stairs: cols 4-21, rows 10-18
  - facade: cols 6-20, rows 3-9
  - plaza_edges: row 19 (street edge)
  - door_zone: cols 11-13, rows 6-8
- scotus_lobby (20x15):
  - center_aisle: cols 9-11, rows 2-13 (keep clear)
  - seal_center: cols 9-11, rows 6-8
  - seating_left: cols 2-6, rows 8-12
  - seating_right: cols 13-17, rows 8-12
  - south_entry: cols 8-12, rows 12-14
  - north_wall: row 1
- room.scotus_hall_01 (20x15):
  - runner: cols 9-11, rows 2-13
  - side_benches: cols 2-5 and 14-17, rows 8-11
  - doors: row 1, cols 4-16
- courtroom_main (30x20):
  - dais: cols 12-18, rows 2-4
  - aisle: cols 14-16, rows 5-18
  - counsel_left: cols 6-10, rows 10-12
  - counsel_right: cols 20-24, rows 10-12
  - jury_box: cols 4-8, rows 5-9
- library (20x15):
  - shelves_north: row 1-2
  - reading_center: cols 6-14, rows 7-10
- press_room (15x12):
  - podium_front: cols 6-9, rows 2-3
  - seating: rows 6-9
  - backdrop: row 1
- cafeteria (20x15):
  - serving_north: row 1-2
  - tables_center: cols 4-16, rows 6-12
- robing_room (15x12):
  - racks: cols 2-5 and 10-13, rows 2-4
  - lockers: row 1-2
- records_vault (15x12):
  - vault_wall: row 1-2
  - shelves: cols 2-5 and 10-13, rows 4-9
- chambers (15x12):
  - desk_zone: cols 5-9, rows 4-6
  - wall_props: row 1-2

## 5. Missing Tilesets (P0/P1)

### Marble Floors (P0)

- ID: `tile.scotus.marble_floor`
- Footprint: 32x32 tiles (atlas, 16-32 variants)
- Generator: plain, subtle veining, border, corner, inner-corner, seal medallion pieces
- Placer: `scotus_lobby`, `room.scotus_hall_01`, `courtroom_main` floors, seal at zone `seal_center`

### Marble Walls + Trims (P0)

- ID: `tile.scotus.marble_wall`
- Footprint: 32x32 tiles (atlas, 16-32 variants)
- Generator: wall blocks, trims, pillars, arch caps, door frames
- Placer: north walls of lobby/hall/courtroom

### Wood Paneling + Trim (P0)

- ID: `tile.scotus.wood_panel`
- Footprint: 32x32 tiles (atlas, 12-24 variants)
- Generator: wainscot, baseboards, corners
- Placer: courtroom + chambers

### Courtroom Dais (P0)

- ID: `tile.scotus.dais`
- Footprint: 32x32 tiles (atlas, 8-16 variants)
- Generator: platform top, front face, steps, corners
- Placer: `courtroom_main` zone `dais`

### Library Wood Floor (P1)

- ID: `tile.scotus.library_floor`
- Footprint: 32x32 tiles
- Placer: `library` floor

### Cafeteria Tile Floor (P1)

- ID: `tile.scotus.cafeteria_floor`
- Footprint: 32x32 tiles
- Placer: `cafeteria` floor

### Vault Metal Floor (P1)

- ID: `tile.scotus.vault_floor`
- Footprint: 32x32 tiles with warning stripe border
- Placer: `records_vault` floor

## 6. Missing Props (P0/P1)

Each prop lists: footprint, collision, rooms/zones.

### Exterior (P1)

- `prop.scotus_plaque` (1x1, no collision)
  - Placer: `courthouse_exterior` zone `facade`, near `door_zone`
- `prop.statue` (1x2, collision)
  - Placer: `courthouse_exterior` corners of `plaza_edges`
- `prop.bollard` (1x1, collision)
  - Placer: `courthouse_exterior` along `plaza_edges`

### Lobby + Hall (P0/P1)

- `prop.info_desk` (3x1, collision) P0
  - Placer: `scotus_lobby` zone `seating_left`
- `prop.metal_detector` (2x2, collision) P0
  - Placer: `scotus_lobby` south entry, keep `center_aisle` clear
- `prop.xray_belt` (3x1, collision) P0
  - Placer: near `prop.metal_detector`
- `prop.stanchion` (1x1, collision) P1
  - Placer: `scotus_lobby` around courtroom door
- `prop.couch` (2x1, collision) P1
  - Placer: `scotus_lobby` zones `seating_left` and `seating_right`
- `prop.wall_sconce` (1x1, no collision) P1
  - Placer: `room.scotus_hall_01` north wall
- `prop.door_plaque` (1x1, no collision) P1
  - Placer: outside chamber doors
- `prop.banner` (1x2, no collision) P1
  - Placer: `scotus_lobby` north wall

### Courtroom (P0)

- `prop.judge_bench` (4x2, collision)
  - Placer: `courtroom_main` zone `dais`
- `prop.counsel_table` (3x1, collision)
  - Placer: `courtroom_main` zones `counsel_left`, `counsel_right`
- `prop.counsel_chair` (1x1, collision)
  - Placer: behind counsel tables
- `prop.jury_box` (3x2, collision)
  - Placer: `courtroom_main` zone `jury_box`

### Library (P0/P1)

- `prop.book_ladder` (1x2, collision) P1
  - Placer: `library` zone `shelves_north`
- `prop.card_catalog` (2x1, collision) P0
  - Placer: `library` zone `reading_center`
- `prop.reading_table` (3x1, collision) P0
  - Placer: `library` zone `reading_center`
- `prop.desk_lamp` (1x1, no collision) P1
  - Placer: on tables

### Press Room (P0/P1)

- `prop.podium` (2x1, collision) P0
  - Placer: `press_room` zone `podium_front`
- `prop.camera_rig` (2x2, collision) P1
  - Placer: `press_room` back rows
- `prop.press_backdrop` (4x1, no collision) P0
  - Placer: `press_room` zone `backdrop`
- `prop.press_chair` (1x1, collision) P1
  - Placer: `press_room` seating rows

### Cafeteria (P0/P1)

- `prop.cafeteria_table` (2x2, collision) P0
  - Placer: `cafeteria` zone `tables_center`
- `prop.cafeteria_chair` (1x1, collision) P0
  - Placer: around tables
- `prop.vending_machine` (1x2, collision) P1
  - Placer: `cafeteria` wall edges
- `prop.menu_board` (2x1, no collision) P1
  - Placer: `cafeteria` zone `serving_north`
- `prop.serving_counter` (4x1, collision) P0
  - Placer: `cafeteria` zone `serving_north`

### Robing Room (P1)

- `prop.robe_rack` (2x2, collision)
  - Placer: `robing_room` zone `racks`
- `prop.mirror` (1x2, no collision)
  - Placer: `robing_room` zone `racks`
- `prop.locker` (2x2, collision)
  - Placer: `robing_room` zone `lockers`

### Records Vault (P1)

- `prop.vault_door` (2x2, collision)
  - Placer: `records_vault` zone `vault_wall`
- `prop.metal_shelf` (2x2, collision)
  - Placer: `records_vault` zone `shelves`
- `prop.warning_light` (1x1, no collision)
  - Placer: near `prop.vault_door`

### Justice Chambers (P0/P1)

Use 2-3 subject props per chamber to avoid clutter.

- Evidence: `prop.evidence_board` (2x2, no collision), `prop.tape_recorder` (1x1, no collision)
- Criminal Procedure: `prop.badge_stand` (1x1, no collision), `prop.handcuffs` (1x1, no collision), `prop.cctv_monitor` (1x1, no collision)
- Civil Procedure: `prop.docket_stack` (1x1, no collision), `prop.procedure_chart` (2x1, no collision)
- Property: `prop.deed_ledger` (1x1, no collision), `prop.map_plot` (2x1, no collision), `prop.house_keys` (1x1, no collision)
- Contracts: `prop.contract_scroll` (1x1, no collision), `prop.handshake_sculpture` (1x2, collision)
- Family Law: `prop.family_photo_frame` (1x1, no collision), `prop.toy_blocks` (1x1, no collision)
- Criminal Law: `prop.caution_cone` (1x1, collision)
- Torts: `prop.accident_report` (1x1, no collision), `prop.medical_chart` (1x1, no collision), `prop.hazard_sign` (1x1, collision)
- Constitutional Law: `prop.constitution_scroll` (1x1, no collision), `prop.classical_bust` (1x2, collision)

Placer: chambers use zone `desk_zone` for desks and `wall_props` for plaques.

## 7. Missing UI + VFX (P2)

If replacing UI shapes with art assets:

- `icon.locked_door` (64x64, no collision)
- `icon.quest_complete` (64x64, no collision)
- `vfx.sparkle_unlock` (64x64, no collision)
- `vfx.victory_burst` (64x64, no collision)

> **Note**: `ui.panel_frame` and `ui.button_*` removed - A1 migration to code-first UIPanel/UIButton primitives

## 8. Missing Character Sprites (P1)

- `npc.tourist` (ULPC 64x64 sheet, casual tourist attire)
- `npc.clerk` (ULPC 64x64 sheet, desk clerk variant distinct from npc.clerk_01)

## 9. Missing Player Outfit Variants (P0)

`char.kim` only declares three variants. Missing visual variants for outfits:

- evidence_blazer, civpro_suit, conlaw_robe, court_blazer
- power_suit, crimpro_badge, property_vest, contracts_tie
- family_cardigan, criminal_jacket, torts_blazer, supreme_robe

Generator: ULPC-compatible clothing layers or full sheet variants.
Placer: outfit swaps only; no room placement.
