# Asset Usage and Visibility

This document explains how assets become "shown" in-game, how tilesets and
props are registered, and how to generate the used-asset report.

## High-Level Flow

1. **Author** content (LDtk levels, room specs, and asset sources).
2. **Import** external packs (LPC + SCOTUS) into `vendor/` and generate parts maps.
3. **Build registry** from source + vendor (`npm run build:chars`).
4. **Sync** assets into `public/` for runtime (`npm run sync:public`).
5. **Run report** to list assets actually referenced by LDtk content.

The game only renders assets referenced by content (LDtk entities, outfits, and
UI sprite keys). The report script inspects those references.

LPC source packs live under `content/sources/lpc/` so the repo root stays clean.

## Source Packs Layout

Keep large source packs out of the repo root. Use these locations:

- `content/sources/lpc/` for LPC terrains, Victorian preview, and trees.
- `content/sources/scotus/` for SCOTUS-specific sources:
  - `exterior_building_v2/` (exterior facade/tiles)
  - `interior_spliced/` (interior tiles and recipes)

If you add new packs, place them under `content/sources/<theme>/` and update any
import scripts to point there.

## Tileset Registry

Tilesets are indexed in `content/tilesets/tilesets.json`. Each entry records:

- `id` (registry key), `url` (runtime path), `tileWidth/Height`
- `imageWidth/Height`, `columns`, `rows`
- `partsUrl` (optional, for multi-tile object maps like windows/doors)
- `key` (optional Phaser texture key override, used for legacy names)

Use `npm run import:scotus` and `npm run import:lpc` to refresh the tileset
registry from SCOTUS and LPC packs.
Room specs should reference tilesets using the `tileset.*` registry IDs for
the report and runtime to resolve them cleanly.

## Windows/Doors Parts Map

`content/tilesets/windows-doors.parts.json` maps multi-tile objects into
32x32 parts and includes a `propId` for cropped sprites. This is how doors and
windows can be placed either as tile parts or as standalone props.

## Exterior-Only Assets

If an asset should only appear outside (Supreme Court exterior):

- Place the PNG in `vendor/props/exterior/` (or the LPC import output there).
- Place the entity in the **courthouse exterior** LDtk file or room spec.
- Prefer explicit `propId` / `sprite` values so the used-asset report can
  capture the reference.

This keeps exterior-only assets scoped to the relevant room.

## Door & Tree Refresh

We replaced the placeholder `tree`/`door_courthouse` visuals with LPC-sourced props in several rooms:

- `courthouse_exterior` now anchors the steps with `prop.lpc_tree_11`, `prop.lpc_tree_05`, `prop.lpc_tree_07`, and `prop.lpc_tree_13`, plus a decorative `prop.lpc_door_wood_tall_arched_window_01` beside the entrance.
- `scotus_lobby` mirrors the same tree palette and pairs it with `prop.lpc_door_double_white_glass_01` on the south door.
- The `robing_room` now shows two wardrobe cabinets (`prop.lpc_container_cabinet_wood_tall_{01,02}`) to better sell the clothes area.

Update these sections by editing their room specs (and optionally `content/placement_drafts/prop_placements.json`) and rerun `npm run gen:ldtk` + `npm run sync:public` so LDtk and `public` stay in sync.

## Used-Asset Report

The report lists assets actually referenced by content:

- LDtk entities (`Prop`, `NPC`, `OutfitChest`, `Door`).
- Registry outfits (sprite variants).
- Core UI sprites.
- Tilesets used by world rendering + room specs.

Run locally:

```bash
npm run import:scotus
npm run import:lpc
npm run build:chars
npm run assets:used
```

Output: `generated/used_assets.md`

## CI Bot (Push)

The GitHub Action `.github/workflows/used-assets.yml` runs on push and publishes
the report in the job summary (and as an artifact). This makes it easy to see
which assets are actually referenced by the game content.
