# Kimbar Per-Room LDtk Art Passes

This document specifies the visual pass for each room.
It follows `docs/ART_STYLE_GUIDE.md` and current room specs in `content/rooms/*.json`.

## Global Conventions

- Grid: 32x32 tiles, origin (0,0) top-left.
- Layer order (recommended): Floor (Tiles), Walls (Tiles), Decor (Tiles), Props (Entities), Interactables (Entities).
- Collisions: keep walls and large props blocked; open paths for player flow.
- Runtime: current code renders Entities only; tile layers are still authored in LDtk for future renderer.

## courthouse_exterior (25x20)

- Theme: iconic SCOTUS facade and marble steps.
- Tilesets: exterior ground tiles + SCOTUS facade tiles.
- Layers:
  - Ground: plaza pavers, grass edges, curb line at row 19.
  - Stairs: wide marble stair runs from rows 10-18, cols 4-21.
  - Building: columns, pediment, entablature, window blocks.
- Props (Entities): lamp_post, bench, tree, flagpole, planter, bush.
- Interactables:
  - PlayerSpawn at (12,18).
  - NPC reporter at (6,16), NPC tourist at (20,14).
  - Door to lobby at (12,6).
- Notes: emphasize vertical climb on stairs; use shadows to separate facade from steps.

## scotus_lobby (20x15)

- Theme: grand entry with seal and seating.
- Tilesets: interior marble floor + wall/column trims.
- Layers:
  - Floor: marble tile grid with seal medallion centered at (10,7).
  - Walls: columns and arches along rows 0-2, with door trim at top.
  - Decor: wall sconces, banners, rope stanchions near courtroom door.
- Props: info desk, benches, water cooler, security stanchions.
- Interactables:
  - NPC clerk_01 at (5,7).
  - Encounter trigger at (15,7).
  - Outfit chest at (18,12).
  - Door to courtroom at (10,1).
- Notes: keep a clear central aisle from south entrance to courtroom door.

## room.scotus_hall_01 (20x15)

- Theme: marble hallway with door plaques leading to chambers.
- Tilesets: marble floor, wall trims, doorway kit.
- Layers:
  - Floor: long runner strip down center.
  - Walls: repeating arches/pilasters along rows 0-2 and 12-14.
  - Decor: door plaques and wall sconces.
- Props: benches at left/right mid rows, small table with gavel prop.
- Interactables:
  - NPC clerk at (10,8).
  - Encounter trigger at (15,5).
  - Outfit chest at (3,3).
  - Door to courtroom (locked) at (10,1).
- Notes: this hall should feel like a hub to chamber doors.

## courtroom_main (30x20)

- Theme: main courtroom with raised dais.
- Tilesets: marble floor, wood paneling, dais platform tiles.
- Layers:
  - Floor: marble with aisle runner from south to dais.
  - Walls: wood paneling along top and sides, seal backdrop center.
  - Decor: flags, sconces, wall plaques.
- Props: judge bench, witness stand, jury box, railings, counsel tables, lectern.
- Interactables:
  - NPC justice_roberts at (15,5).
  - NPC bailiff at (5,10).
- Notes: dais at top center (cols 12-18, rows 2-4). Keep sight lines clear.

## chambers_thomas (15x12)

- Theme: evidence-focused study.
- Tilesets: wood floor, dark wood walls.
- Props: evidence_box_proc, law_book_proc, paper_stack_proc, gavel_block_proc, bookcase.
- Interactables: NPC justice_thomas at (7,4), encounter trigger at same tile.
- Notes: add evidence board prop behind desk.

## chambers_sotomayor (15x12)

- Theme: criminal procedure.
- Props: badge stand, handcuffs (new prop), CCTV monitor (new prop), files.
- Interactables: NPC justice_sotomayor at (7,4), encounter trigger.
- Notes: include US flag and seal plaque for authority.

## chambers_kagan (15x12)

- Theme: civil procedure.
- Props: conference_table_proc, legal_document_proc, docket stacks (new prop), quill_pen_proc.
- Interactables: NPC justice_kagan at (7,4), encounter trigger.
- Notes: a wall chart with flow arrows (new prop).

## chambers_gorsuch (15x12)

- Theme: property law.
- Props: deed ledger (new prop), map plot (new prop), keys (new prop), bookshelf.
- Interactables: NPC justice_gorsuch at (7,4), encounter trigger.
- Notes: add a globe or land deed display.

## chambers_kavanaugh (15x12)

- Theme: contracts.
- Props: contract scroll (new prop), handshake sculpture (new prop), legal_document_proc.
- Interactables: NPC justice_kavanaugh at (7,4), encounter trigger.
- Notes: desk with stacked agreements, pen set.

## chambers_barrett (15x12)

- Theme: family law.
- Props: family photo frames (new prop), toy blocks (new prop), legal_document_proc.
- Interactables: NPC justice_barrett at (7,4), encounter trigger.
- Notes: softer palette accents (burgundy and warm wood).

## chambers_alito (15x12)

- Theme: criminal law.
- Props: evidence_box_proc, gavel_proc, law_book_proc, caution cone (new prop).
- Interactables: NPC justice_alito at (7,4), encounter trigger.
- Notes: darker wood and stronger contrast.

## chambers_jackson (15x12)

- Theme: torts.
- Props: accident report (new prop), caution sign (new prop), medical chart (new prop).
- Interactables: NPC justice_jackson at (7,4), encounter trigger.
- Notes: include small hazard tape motif on a wall placard.

## chambers_roberts (15x12)

- Theme: constitutional law.
- Props: Constitution scroll (new prop), seal plaque, flag_stand_proc, bust (new prop).
- Interactables: encounter trigger at (7,4).
- Notes: elevated desk placement and prominent seal backdrop.

## library (20x15)

- Theme: law library.
- Tilesets: wood floor and bookcase walls.
- Props: bookshelf-brown, bookshelf-green, card catalog (new prop), desk lamp (new prop).
- Interactables: NPC librarian at (10,5).
- Notes: place ladders and stacked books in corners.

## press_room (15x12)

- Theme: press briefing room.
- Props: podium (new prop), microphone_proc, camera rig (new prop), seating rows.
- Interactables: NPC reporter at (7,4).
- Notes: add backdrop wall with seal or wordmark.

## cafeteria (20x15)

- Theme: calm rest area.
- Props: tables, chairs, vending machine (new prop), water cooler, tray station.
- Interactables: PlayerSpawn only.
- Notes: warm lighting, simple floor pattern.

## robing_room (15x12)

- Theme: wardrobe and outfit collection.
- Props: robe racks (new prop), mirrors (new prop), bench, lockers.
- Interactables: outfit chests at (5,4) and (9,4).
- Notes: keep front area clear for chest interaction.

## records_vault (15x12)

- Theme: secure archive, final challenge.
- Props: vault door (new prop), metal shelving (new prop), warning lights.
- Interactables: encounter trigger at (7,4).
- Notes: cooler palette, metal/grate floor tile.
