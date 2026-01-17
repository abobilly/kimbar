# Kimbar Registry Manifest

This is a comprehensive manifest for assets that should appear in the runtime registry.
It mirrors the schema in `schemas/AssetRegistry.schema.json` and the loader in `src/content/registry.ts`.

## 1. Registry Shape (Runtime)

The registry should include these top-level keys:

- buildId (string)
- tileSize (number, 32)
- scale (number, 2)
- entities (object)
- outfits (object)
- tags (object)
- sprites (object)
- characters (array)
- rooms (array)
- flashcardPacks (array)
- ink (array)
- props (object, planned)

## 2. Entity Types

Required and optional fields match the content contract.

- PlayerSpawn: required []
- NPC: required [storyKnot], optional [name, characterId, sprite]
- EncounterTrigger: required [deckTag, count], optional [rewardId, once, name, justiceId]
- Door: required [targetLevel], optional [locked, requiredItem]
- OutfitChest: required [outfitId]
- Prop: required [sprite], optional [collision, propId]

## 3. Rooms

All rooms should resolve to `/content/ldtk/<id>.ldtk` in the registry.
Room sizes match `content/rooms/*.json`.

- courthouse_exterior (25x20) -> `/content/ldtk/courthouse_exterior.ldtk`
- scotus_lobby (20x15) -> `/content/ldtk/scotus_lobby.ldtk`
- room.scotus_hall_01 (20x15) -> `/content/ldtk/room.scotus_hall_01.ldtk`
- courtroom_main (30x20) -> `/content/ldtk/courtroom_main.ldtk`
- library (20x15) -> `/content/ldtk/library.ldtk`
- press_room (15x12) -> `/content/ldtk/press_room.ldtk`
- cafeteria (20x15) -> `/content/ldtk/cafeteria.ldtk`
- robing_room (15x12) -> `/content/ldtk/robing_room.ldtk`
- records_vault (15x12) -> `/content/ldtk/records_vault.ldtk`
- chambers_thomas (15x12) -> `/content/ldtk/chambers_thomas.ldtk`
- chambers_sotomayor (15x12) -> `/content/ldtk/chambers_sotomayor.ldtk`
- chambers_kagan (15x12) -> `/content/ldtk/chambers_kagan.ldtk`
- chambers_gorsuch (15x12) -> `/content/ldtk/chambers_gorsuch.ldtk`
- chambers_kavanaugh (15x12) -> `/content/ldtk/chambers_kavanaugh.ldtk`
- chambers_barrett (15x12) -> `/content/ldtk/chambers_barrett.ldtk`
- chambers_alito (15x12) -> `/content/ldtk/chambers_alito.ldtk`
- chambers_jackson (15x12) -> `/content/ldtk/chambers_jackson.ldtk`
- chambers_roberts (15x12) -> `/content/ldtk/chambers_roberts.ldtk`

## 4. Characters (Spritesheets)

All character sprites are 64x64 ULPC spritesheets.
Registry entries should include `url`, `portraitUrl`, `frameWidth`, and `frameHeight`.

- char.kim
- npc.clerk_01
- npc.bailiff
- npc.librarian
- npc.reporter
- npc.justice_roberts
- npc.justice_thomas
- npc.justice_sotomayor
- npc.justice_kagan
- npc.justice_gorsuch
- npc.justice_kavanaugh
- npc.justice_barrett
- npc.justice_alito
- npc.justice_jackson

Missing but referenced in LDtk:

- npc.tourist (courthouse_exterior)
- npc.clerk (room.scotus_hall_01)

Expected output paths:

- sprite: `/generated/sprites/<id>.png`
- portrait: `/generated/portraits/<id>.png`

## 5. Portraits (Emotion Variants)

Portraits used by Ink tags in `content/ink/story.ink`:

Base portraits:

- npc.clerk_01
- npc.bailiff
- npc.librarian
- npc.reporter
- npc.justice_roberts
- npc.justice_thomas
- npc.justice_sotomayor
- npc.justice_kagan
- npc.justice_gorsuch
- npc.justice_kavanaugh
- npc.justice_barrett
- npc.justice_alito
- npc.justice_jackson

Emotion variants (suffix):

- npc.justice_roberts: impressed, stern
- npc.justice_thomas: impressed, stern
- npc.justice_sotomayor: impressed, concerned
- npc.justice_kagan: impressed, stern
- npc.justice_gorsuch: impressed, stern
- npc.justice_kavanaugh: impressed, stern
- npc.justice_barrett: impressed, concerned
- npc.justice_alito: impressed, stern
- npc.justice_jackson: impressed, concerned

Expected key format for emotions:

- portrait.npc.justice_roberts.impressed
- portrait.npc.justice_roberts.stern

## 6. Outfits

Registry outfit entries (from `content/registry_config.json`):

- default -> player_default
- evidence_blazer -> player_blazer
- civpro_suit -> player_suit
- conlaw_robe -> player_robe
- court_blazer -> player_court
- power_suit -> player_power
- crimpro_badge -> player_badge
- property_vest -> player_vest
- contracts_tie -> player_tie
- family_cardigan -> player_cardigan
- criminal_jacket -> player_jacket
- torts_blazer -> player_torts
- supreme_robe -> player_supreme

Note: `content/characters/char.kim.json` defines only three ULPC variants. Additional outfit art needs sprite variants or overlay assets.

## 7. Props

Registry entries map to `/assets/props/<category>/<file>.png` and use normalized
IDs with the `prop.<snake_case>` prefix. If a name collides across categories,
the builder falls back to `prop.<category>_<snake_case>`.
These are authored in `vendor/props/` and synced by scripts.

### exterior

- prop.bench
- prop.bush
- prop.flagpole
- prop.lamp_post
- prop.planter
- prop.scotus_column
- prop.scotus_entablature
- prop.scotus_pediment
- prop.scotus_stairs
- prop.tree

### legal

- prop.argument_lectern
- prop.briefcase
- prop.clock
- prop.conference_table
- prop.court_seal
- prop.courtroom_railing
- prop.evidence_box
- prop.exit_sign
- prop.flag_stand
- prop.gavel_block
- prop.gavel
- prop.jury_bench
- prop.law_book
- prop.legal_document
- prop.microphone
- prop.nameplate
- prop.paper_stack
- prop.pewter_mug
- prop.quill_pen_crossed
- prop.quill_pen
- prop.scales_of_justice
- prop.spittoon
- prop.water_pitcher
- prop.witness_stand

### office (normalized IDs)

Files in `vendor/props/office` use spaces and punctuation. Recommended ID map:

- Bins.png -> prop.bins
- Card Table.png -> prop.card_table
- Coffee Cup.png -> prop.coffee_cup
- Coffee Maker.png -> prop.coffee_maker
- Copy Machine - Copy Light.png -> prop.copy_machine_copy_light
- Copy Machine.png -> prop.copy_machine
- Desk, Ornate.png -> prop.desk_ornate
- Laptop.png -> prop.laptop
- Mailboxes.png -> prop.mailboxes
- Office Portraits.png -> prop.office_portraits
- Rotary Phones.png -> prop.rotary_phones
- Shopping Cart.png -> prop.shopping_cart
- Sink.png -> prop.sink
- TV, Widescreen.png -> prop.tv_widescreen
- Water Cooler.png -> prop.water_cooler
- bookshelf-brown.png -> prop.bookshelf_brown
- bookshelf-green.png -> prop.bookshelf_green

Exclude from runtime registry:

- _ Liberated Palette Ramps.png (palette reference)

## 8. Tilesets (LDtk-Only)

Tilesets referenced in LDtk projects:

- LPC_Floors -> `vendor/tilesets/lpc/floors.png`
- LPC_Walls -> `vendor/tilesets/lpc/walls.png`
- LPC_Castle -> `vendor/tilesets/lpc/castle.png`
- SCOTUS_Column -> `vendor/props/exterior/scotus_column.png`
- SCOTUS_Stairs -> `vendor/props/exterior/scotus_stairs.png`
- SCOTUS_Pediment -> `vendor/props/exterior/scotus_pediment.png`
- SCOTUS_Entablature -> `vendor/props/exterior/scotus_entablature.png`
- LPC_Terrain -> `.cache/asset-packs/lpc-terrains/terrain-v7.png`

These are used by LDtk tile layers, not the runtime registry yet.

## 9. Ink Stories

Compiled to `/generated/ink/<id>.json` and referenced by registry:

- story
- justices
- rewards
- tutorial

Runtime currently loads `story` by default.

## 10. Flashcard Packs

- flashcards -> `/content/cards/flashcards.json`

## 11. Tags (Subjects)

Canonical subject tags from `content/registry_config.json`:

- agency
- business_associations
- civil_procedure
- community_property
- conflict_of_laws
- constitutional_law
- contracts
- criminal_law
- criminal_procedure
- evidence
- family_law
- federal_income_tax
- oil_gas
- property
- torts
- trusts_and_estates

## 12. Determinism

Registry output must be stable and sorted (no noisy diffs).
All asset IDs should be deterministic and normalized to snake_case.
