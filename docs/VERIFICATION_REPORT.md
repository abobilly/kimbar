
> kimbar@0.1.0 validate:tiled
> node scripts/validate-tiled-maps.mjs

🗺️  Tiled Map Validation
========================

Checking for __MACOSX directories...
✓ No __MACOSX directories found

Validating TMX maps in rooms/...

✓ rooms\cafeteria.tmx
✓ rooms\chambers_alito.tmx
✓ rooms\chambers_barrett.tmx
✓ rooms\chambers_gorsuch.tmx
✓ rooms\chambers_jackson.tmx
✓ rooms\chambers_kagan.tmx
✓ rooms\chambers_kavanaugh.tmx
✓ rooms\chambers_roberts.tmx
✓ rooms\chambers_sotomayor.tmx
✓ rooms\chambers_thomas.tmx
✓ rooms\courthouse_exterior.tmx
✓ rooms\courtroom_main.tmx
✓ rooms\library.tmx
✓ rooms\press_room.tmx
✓ rooms\records_vault.tmx
✓ rooms\robing_room.tmx
✓ rooms\room_scotus_hall_01.tmx
✓ rooms\scotus_chambers_shell.tmx
✓ rooms\scotus_courtroom_shell.tmx
✓ rooms\scotus_hallway_01.tmx
✓ rooms\scotus_library_shell.tmx
✓ rooms\scotus_lobby_small.tmx
✓ rooms\scotus_lobby.tmx
✓ rooms\scotus_office_shell.tmx

Validating Tiled JSON maps...

✓ supreme-court\chambers_roberts.json
✓ supreme-court\courthouse_exterior.json
✓ supreme-court\courtroom_main.json
✓ supreme-court\hallway.json
✓ supreme-court\lobby.json
✓ supreme-court\scotus_lobby.json

Validation: 30 passed, 0 failed (30 total maps)

✅ All Tiled maps valid

> kimbar@0.1.0 compile:tiled
> node scripts/compile-tiled-maps.mjs

🔨 Tiled Map Compilation
========================

Found 6 JSON files and 24 TMX files

✓ cafeteria (tmx)
✓ chambers_alito (tmx)
✓ chambers_barrett (tmx)
✓ chambers_gorsuch (tmx)
✓ chambers_jackson (tmx)
✓ chambers_kagan (tmx)
✓ chambers_kavanaugh (tmx)
✓ chambers_roberts (tmx)
✓ chambers_sotomayor (tmx)
✓ chambers_thomas (tmx)
✓ courthouse_exterior (tmx)
✓ courtroom_main (tmx)
✓ library (tmx)
✓ press_room (tmx)
✓ records_vault (tmx)
✓ robing_room (tmx)
✓ room_scotus_hall_01 (tmx)
✓ scotus_chambers_shell (tmx)
✓ scotus_courtroom_shell (tmx)
✓ scotus_hallway_01 (tmx)
✓ scotus_library_shell (tmx)
✓ scotus_lobby_small (tmx)
✓ scotus_lobby (tmx)
✓ scotus_office_shell (tmx)
✓ supreme-court/chambers_roberts (json)
✓ supreme-court/courthouse_exterior (json)
✓ supreme-court/courtroom_main (json)
✓ supreme-court/hallway (json)
✓ supreme-court/lobby (json)
✓ supreme-court/scotus_lobby (json)

Compilation: 30 succeeded, 0 failed

✅ Compiled to c:\Users\andre\lawchuck\badgey.org\kimbar\public\generated\levels\tiled

> kimbar@0.1.0 build:tiled-world
> node scripts/build-tiled-world.mjs

Tiled World Generation Script
==============================

Found 18 room entries

Processing: cafeteria
  ✓ Dimensions: 640x480px
Processing: chambers_alito
  ✓ Dimensions: 480x384px
Processing: chambers_barrett
  ✓ Dimensions: 480x384px
Processing: chambers_gorsuch
  ✓ Dimensions: 480x384px
Processing: chambers_jackson
  ✓ Dimensions: 480x384px
Processing: chambers_kagan
  ✓ Dimensions: 480x384px
Processing: chambers_kavanaugh
  ✓ Dimensions: 480x384px
Processing: chambers_roberts
  ✓ Dimensions: 480x384px
Processing: chambers_sotomayor
  ✓ Dimensions: 480x384px
Processing: chambers_thomas
  ✓ Dimensions: 480x384px
Processing: courthouse_exterior
  ✓ Dimensions: 800x640px
  ✓ Found world graph bounds: 60x80 tiles
Processing: courtroom_main
  ✓ Dimensions: 960x640px
  ✓ Found world graph bounds: 20x15 tiles
Processing: library
  ✓ Dimensions: 640x480px
Processing: press_room
  ✓ Dimensions: 480x384px
Processing: records_vault
  ✓ Dimensions: 480x384px
Processing: robing_room
  ✓ Dimensions: 480x384px
Processing: room_scotus_hall_01
  ✓ Dimensions: 640x480px
Processing: scotus_lobby
  ✓ Dimensions: 640x480px
  ✓ Found world graph bounds: 20x15 tiles

Collected 18 maps for world file

==================================================
Summary
==================================================
✓ Generated: c:\Users\andre\lawchuck\badgey.org\kimbar\public\content\tiled\worlds\scotus.world
✓ Maps included: 18

Maps in world:
  - cafeteria: (0, 0) 640x480px
  - chambers_alito: (704, 0) 480x384px
  - chambers_barrett: (1248, 0) 480x384px
  - chambers_gorsuch: (1792, 0) 480x384px
  - chambers_jackson: (0, 544) 480x384px
  - chambers_kagan: (544, 544) 480x384px
  - chambers_kavanaugh: (1088, 544) 480x384px
  - chambers_roberts: (1632, 544) 480x384px
  - chambers_sotomayor: (0, 992) 480x384px
  - chambers_thomas: (544, 992) 480x384px
  - courthouse_exterior: (1088, 992) 800x640px
  - courtroom_main: (1952, 992) 960x640px
  - library: (0, 1696) 640x480px
  - press_room: (704, 1696) 480x384px
  - records_vault: (1248, 1696) 480x384px
  - robing_room: (1792, 1696) 480x384px
  - room_scotus_hall_01: (0, 2240) 640x480px
  - scotus_lobby: (704, 2240) 640x480px

> kimbar@0.1.0 build:levels
> node scripts/build-levels.js

🧭 Building Level Index (Tiled-first)

  📦 cafeteria: Tiled
  📦 chambers_alito: Tiled
  📦 chambers_barrett: Tiled
  📦 chambers_gorsuch: Tiled
  📦 chambers_jackson: Tiled
  📦 chambers_kagan: Tiled
  📦 chambers_kavanaugh: Tiled
  📦 chambers_roberts: Tiled
  📦 chambers_sotomayor: Tiled
  📦 chambers_thomas: Tiled
  📦 courthouse_exterior: Tiled
  📦 courtroom_main: Tiled
  📦 library: Tiled
  📦 press_room: Tiled
  📦 records_vault: Tiled
  📦 robing_room: Tiled
  📦 room_scotus_hall_01: Tiled
  📦 scotus_chambers_shell: Tiled
  📦 scotus_courtroom_shell: Tiled
  📦 scotus_hallway_01: Tiled
  📦 scotus_library_shell: Tiled
  📦 scotus_lobby: Tiled
  📦 scotus_lobby_small: Tiled
  📦 scotus_office_shell: Tiled
  📦 supreme-court/chambers_roberts: Tiled (compiled only, no .tmx source)
  📦 supreme-court/courthouse_exterior: Tiled (compiled only, no .tmx source)
  📦 supreme-court/courtroom_main: Tiled (compiled only, no .tmx source)
  📦 supreme-court/hallway: Tiled (compiled only, no .tmx source)
  📦 supreme-court/lobby: Tiled (compiled only, no .tmx source)
  📦 supreme-court/scotus_lobby: Tiled (compiled only, no .tmx source)
  ⏭️ cafeteria: Skipping LDtk (Tiled source exists)
  ⏭️ cafeteria: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_alito: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_alito: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_barrett: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_barrett: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_gorsuch: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_gorsuch: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_jackson: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_jackson: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_kagan: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_kagan: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_kavanaugh: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_kavanaugh: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_roberts: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_roberts: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_sotomayor: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_sotomayor: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_thomas: Skipping LDtk (Tiled source exists)
  ⏭️ chambers_thomas: Skipping LDtk (Tiled source exists)
  ⏭️ courthouse_exterior: Skipping LDtk (Tiled source exists)
  ⏭️ courthouse_exterior: Skipping LDtk (Tiled source exists)
  ⏭️ courtroom_main: Skipping LDtk (Tiled source exists)
  ⏭️ courtroom_main: Skipping LDtk (Tiled source exists)
  ⏭️ library: Skipping LDtk (Tiled source exists)
  ⏭️ library: Skipping LDtk (Tiled source exists)
  ⏭️ press_room: Skipping LDtk (Tiled source exists)
  ⏭️ press_room: Skipping LDtk (Tiled source exists)
  ⏭️ records_vault: Skipping LDtk (Tiled source exists)
  ⏭️ records_vault: Skipping LDtk (Tiled source exists)
  ⏭️ robing_room: Skipping LDtk (Tiled source exists)
  ⏭️ robing_room: Skipping LDtk (Tiled source exists)
  📦 room.scotus_hall_01: LDtk (fallback)
  ⏭️ room.scotus_hall_01: Skipping LDtk (Tiled compiled exists)
  ⏭️ scotus_lobby: Skipping LDtk (Tiled source exists)
  ⏭️ scotus_lobby: Skipping LDtk (Tiled source exists)
  📦 Level_0: LDtk (fallback)
  ⏭️ Level_0: Skipping LDtk (Tiled compiled exists)

──────────────────────────────────────────────────
✅ Wrote level index: c:\Users\andre\lawchuck\badgey.org\kimbar\public\generated\levels\index.json
   Tiled: 30
   LDtk:  2

> kimbar@0.1.0 validate
> node scripts/validate.js

🔍 Kim Bar Content Validator

==================================================

📜 Loading Content Contract...
  ✅ Loaded contract v1.1.0

📋 Loading Schemas...
  📋 Loaded schema: AiJobSpec
  📋 Loaded schema: AssetRegistry
  📋 Loaded schema: AssetSpec
  📋 Loaded schema: CharacterSpec
  📋 Loaded schema: content_contract
  📋 Loaded schema: FlashcardPack
  📋 Loaded schema: FlashcardsFile
  📋 Loaded schema: PlacementDraft
  📋 Loaded schema: RoomEntry
  📋 Loaded schema: RoomSpec
  📋 Loaded schema: TilesetParts
  📋 Loaded schema: TilesetRegistry
  📋 Loaded schema: UlpcManifest
  📋 Loaded schema: WorldGraph

📜 Validating Content Contract...
  ✅ Contract schema valid

📚 Validating Registry...
  ✅ Schema valid
  ✅ 13 outfits defined
  ✅ 16 subjects defined
  ✅ 18 rooms registered
  ✅ 1 flashcard packs registered
  ✅ 4 ink stories registered

🧱 Validating Tilesets...
  ✅ Tileset registry schema valid
  ✅ 197 tileset(s) indexed
  ✅ windows-doors.parts.json: schema valid

📇 Validating Flashcard Packs...
  Validating pack: cloze
  ✅ cloze: 1154 cloze cards (NDJSON format)

🏛️ Validating Room Entries...
  Validating room: cafeteria
  ✅ cafeteria: Tiled source exists (LDtk check skipped)
  Validating room: chambers_alito
  ✅ chambers_alito: Tiled source exists (LDtk check skipped)
  Validating room: chambers_barrett
  ✅ chambers_barrett: Tiled source exists (LDtk check skipped)
  Validating room: chambers_gorsuch
  ✅ chambers_gorsuch: Tiled source exists (LDtk check skipped)
  Validating room: chambers_jackson
  ✅ chambers_jackson: Tiled source exists (LDtk check skipped)
  Validating room: chambers_kagan
  ✅ chambers_kagan: Tiled source exists (LDtk check skipped)
  Validating room: chambers_kavanaugh
  ✅ chambers_kavanaugh: Tiled source exists (LDtk check skipped)
  Validating room: chambers_roberts
  ✅ chambers_roberts: Tiled source exists (LDtk check skipped)
  Validating room: chambers_sotomayor
  ✅ chambers_sotomayor: Tiled source exists (LDtk check skipped)
  Validating room: chambers_thomas
  ✅ chambers_thomas: Tiled source exists (LDtk check skipped)
  Validating room: courthouse_exterior
  ✅ courthouse_exterior: Tiled source exists (LDtk check skipped)
  Validating room: courtroom_main
  ✅ courtroom_main: Tiled source exists (LDtk check skipped)
  Validating room: library
  ✅ library: Tiled source exists (LDtk check skipped)
  Validating room: press_room
  ✅ press_room: Tiled source exists (LDtk check skipped)
  Validating room: records_vault
  ✅ records_vault: Tiled source exists (LDtk check skipped)
  Validating room: robing_room
  ✅ robing_room: Tiled source exists (LDtk check skipped)
  Validating room: room_scotus_hall_01
  ✅ room_scotus_hall_01: Tiled source exists (LDtk check skipped)
  Validating room: scotus_lobby
  ✅ scotus_lobby: Tiled source exists (LDtk check skipped)

📜 Validating Ink Entries...
  Validating ink story: justices
  ✅ justices: 0 knots found
  Validating ink story: rewards
  ✅ rewards: 0 knots found
  Validating ink story: story
  ✅ story: 0 knots found
  Validating ink story: tutorial
  ✅ tutorial: 0 knots found

🖼️ Validating Portrait Assets...
  ✅ 34 portrait(s) checked

🗺️ Validating World Graph...
  ✅ World graph schema valid
  ✅ 5 nodes, 8 edges

🎭 Validating Character Specs...
  ✅ char.kim.json: schema valid
  ✅ npc.bailiff.json: schema valid
  ✅ npc.clerk.json: schema valid
  ✅ npc.clerk_01.json: schema valid
  ✅ npc.juror_01.json: schema valid
  ✅ npc.juror_02.json: schema valid
  ✅ npc.justice_alito.json: schema valid
  ✅ npc.justice_barrett.json: schema valid
  ✅ npc.justice_gorsuch.json: schema valid
  ✅ npc.justice_jackson.json: schema valid
  ✅ npc.justice_kagan.json: schema valid
  ✅ npc.justice_kavanaugh.json: schema valid
  ✅ npc.justice_roberts.json: schema valid
  ✅ npc.justice_sotomayor.json: schema valid
  ✅ npc.justice_thomas.json: schema valid
  ✅ npc.lawyer_defense.json: schema valid
  ✅ npc.lawyer_prosecution.json: schema valid
  ✅ npc.librarian.json: schema valid
  ✅ npc.reporter.json: schema valid
  ✅ npc.tourist.json: schema valid
  ✅ npc.visitor_female.json: schema valid
  ✅ npc.visitor_male.json: schema valid

🏗️ Validating Room Specs (specs/rooms)...
  ✅ courthouse_exterior.json: RoomSpec schema valid
  ✅ scotus_lobby.json: RoomSpec schema valid

🌍 Validating Room Specs Against World Graph...
  ✅ courthouse_exterior.json: matches world graph
  ✅ scotus_lobby.json: matches world graph

🏛️ Validating Room Entry Specs (specs/room_entries)...
  ✅ cafeteria.json: RoomEntry schema valid
  ✅ chambers_alito.json: RoomEntry schema valid
  ✅ chambers_barrett.json: RoomEntry schema valid
  ✅ chambers_gorsuch.json: RoomEntry schema valid
  ✅ chambers_jackson.json: RoomEntry schema valid
  ✅ chambers_kagan.json: RoomEntry schema valid
  ✅ chambers_kavanaugh.json: RoomEntry schema valid
  ✅ chambers_roberts.json: RoomEntry schema valid
  ✅ chambers_sotomayor.json: RoomEntry schema valid
  ✅ chambers_thomas.json: RoomEntry schema valid
  ✅ courthouse_exterior.json: RoomEntry schema valid
  ✅ courtroom_main.json: RoomEntry schema valid
  ✅ library.json: RoomEntry schema valid
  ✅ press_room.json: RoomEntry schema valid
  ✅ records_vault.json: RoomEntry schema valid
  ✅ robing_room.json: RoomEntry schema valid
  ✅ room_scotus_hall_01.json: RoomEntry schema valid
  ✅ scotus_lobby.json: RoomEntry schema valid

🗺️ Validating Tiled-First Room Sources...
  ✅ cafeteria: Tiled source + compiled ✓
  ✅ chambers_alito: Tiled source + compiled ✓
  ✅ chambers_barrett: Tiled source + compiled ✓
  ✅ chambers_gorsuch: Tiled source + compiled ✓
  ✅ chambers_jackson: Tiled source + compiled ✓
  ✅ chambers_kagan: Tiled source + compiled ✓
  ✅ chambers_kavanaugh: Tiled source + compiled ✓
  ✅ chambers_roberts: Tiled source + compiled ✓
  ✅ chambers_sotomayor: Tiled source + compiled ✓
  ✅ chambers_thomas: Tiled source + compiled ✓
  ✅ courthouse_exterior: Tiled source + compiled ✓
  ✅ courtroom_main: Tiled source + compiled ✓
  ✅ library: Tiled source + compiled ✓
  ✅ press_room: Tiled source + compiled ✓
  ✅ records_vault: Tiled source + compiled ✓
  ✅ robing_room: Tiled source + compiled ✓
  ✅ room_scotus_hall_01: Tiled source + compiled ✓
  ✅ scotus_lobby: Tiled source + compiled ✓

  📊 Tiled-First Summary:
     Tiled: 18
     LDtk fallback: 0

🎨 Checking LPC Style Guide...
  ✅ LPC v1.1.0 style loaded
    📐 Grid: 32×32 tiles, 16×16 subtiles
    📐 Frame size: 64×64 (enforced)
    📐 Perspective: 60° orthographic
    📐 Drop shadow: #322125 @ 60%
    📐 Dithering: disallow
    📐 Outlines: tiles/props=no_pure_black, chars=near_black_no_selective
    📐 Char bounding: base 32×48, clothing 48×64
    📐 Row order: back → left → front → right

🧾 Validating ULPC Manifest...
  ✅ ULPC manifest loaded (0 file(s), 0 glob(s))

🧭 Validating Placement Drafts...
  ✅ prop_placements.json: schema valid

🧱 Validating Tile Completeness...
  ✅ Tile manifest: 230 defined, 0 generated (0%)
  📋 18 rooms checked, 18 have missing tiles

==================================================

📊 Validation Summary:

Warnings:
  ⚠️ World graph: node 'hallway' not found in registry (room may not exist yet)
  ⚠️ scotus_lobby.json: door 'scotus_lobby_to_courtroom_main' position (0,7) differs from portal (19,6.5)
  ⚠️ scotus_lobby.json: door 'scotus_lobby_to_library' position (19,7) differs from portal (0,6.5)
  ⚠️ ULPC manifest is empty (no files/globs listed)
  ⚠️ Room 'scotus_lobby' missing 14 tile(s): tile.floor.marble.white_*, tile.floor.marble.black_inset_*, tile.trim.stone_*...
  ⚠️ Room 'room.scotus_hall_01' missing 9 tile(s): tile.floor.marble.white_*, tile.trim.stone_*, tile.wall.interior_stone_*...
  ⚠️ Room 'courtroom_main' missing 17 tile(s): tile.trim.stone_*, tile.wall.interior_stone_*, tile.door.double_wood_*...
  ⚠️ Room 'robing_room' missing 9 tile(s): tile.floor.court_wood_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'press_room' missing 8 tile(s): tile.wall.interior_stone_*, tile.door.double_wood_*, tile.floor.press_carpet_*...
  ⚠️ Room 'records_vault' missing 6 tile(s): tile.floor.vault_stone_*, tile.wall.vault_reinforced_*, tile.door.vault_round_*...
  ⚠️ Room 'library' missing 8 tile(s): tile.wall.interior_woodpanel_*, tile.door.single_wood_*, tile.floor.library_wood_*...
  ⚠️ Room 'cafeteria' missing 10 tile(s): tile.wall.interior_stone_*, tile.door.double_wood_*, tile.floor.cafeteria_tile_*...
  ⚠️ Room 'courthouse_exterior' missing 10 tile(s): tile.ground.grass_*, tile.ground.sidewalk_*, tile.steps.granite_*...
  ⚠️ Room 'chambers_roberts' missing 16 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_thomas' missing 16 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_alito' missing 17 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_sotomayor' missing 17 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_kagan' missing 15 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_gorsuch' missing 15 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_kavanaugh' missing 15 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_barrett' missing 16 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...
  ⚠️ Room 'chambers_jackson' missing 17 tile(s): tile.floor.chambers_carpet_*, tile.wall.interior_woodpanel_*, tile.door.single_wood_*...

✅ All validations passed!
