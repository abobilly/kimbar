# Kim Bar Content Contract

> **Canonical source of truth**: [`content/content_contract.json`](../content/content_contract.json)
> 
> This document explains the rules; the JSON file enforces them.

## Overview

This contract defines the hard rules for the Kim Bar content pipeline. All agents (AI or human) must follow these rules. The validator (`npm run validate`) enforces them.

---

## 1. Tile Assets

| Property | Value | Rationale |
|----------|-------|-----------|
| Tile size | **32×32 px** | Standard LPC grid; matches LDtk and Phaser tile layer |
| Tileset dimensions | Multiples of 32 | Validator rejects non-compliant tilesets |

---

## 2. Character Sprites

Based on [LPC/ULPC standard](https://lpc.opengameart.org/).

| Property | Value | Rationale |
|----------|-------|-----------|
| Frame size | **64×64 px** | LPC character frame standard |
| Directions | `down`, `left`, `right`, `up` | 4-directional movement |
| Anchor | `bottomCenter` | Feet at tile bottom for Y-sorting |

### Required Animations

Every character sheet must include these animation tags:

```
idle_down, idle_left, idle_right, idle_up
walk_down, walk_left, walk_right, walk_up
```

### Frame Counts

| Animation | Frames |
|-----------|--------|
| `idle_*` | 1 |
| `walk_*` | 9 |

---

## 3. Layer Compositing (Outfits)

When generating composite character sprites with ULPC:

```
body → hair → shirt → pants → shoes → accessories → outerwear → held_item
```

All layers must share the same frame grid (64×64, same frame order).

### Frame Size Restrictions (v1)

**No oversize weapon frames or large sprites allowed.**

LPC ecosystems include "oversized" assets (e.g., 192×192 weapons) that require larger frames. These are explicitly disallowed in v1:

- Max frame size: **64×64 px** (hard fail if exceeded)
- `strictFrameSize: true` in contract
- Validator rejects any character sheet with non-64×64 frames

### Sheet Row Order

Multi-directional sprite sheets use LPC standard row order:

| Row | Direction | Engine Direction |
|-----|-----------|------------------|
| 0 | back | up |
| 1 | left | left |
| 2 | front | down |
| 3 | right | right |

---

## 4. LPC Style Guide (Agent Guidance)

These are style recommendations from the [LPC Style Guide](https://lpc.opengameart.org/static/lpc-style-guide/styleguide.html). Most are **guidance** (warnings only), not hard errors.

| Rule | Value | Enforcement |
|------|-------|-------------|
| Grid | 32×32 px tiles, 16×16 subtiles | **Hard** (validator) |
| Perspective | Top-down ~60°, orthographic | Guidance |
| Lighting | Primary from top, slight left bias | Guidance |
| Drop shadow | `#322125` at 60% opacity | Guidance |
| Dithering | Disallow (sparingly if at all) | Guidance |
| Tile/prop outlines | Darker local color, no pure black | Guidance |
| Character outlines | Near-black, no selective outlining | Guidance |
| Character bounding | Base: 32×48, Clothing: 48×64 | Guidance |

### Hard-Checked by Validator

- Tile dimensions: multiples of 32
- Character frame size: exactly 64×64
- Spritesheet dimensions: divisible by frame size

### Guidance Only (Warnings)

- Lighting direction, shadow colors, dithering, outline colors
- These appear as warnings if detectable, but don't fail builds

---

## 5. Naming Conventions

**All IDs are dot-namespaced; each segment uses `snake_case`.**

The validator enforces per-type regex patterns from `content_contract.json`:

| Asset Type | Pattern | Example |
|------------|---------|---------|
| Character | `char.<id>` | `char.kim` |
| NPC | `npc.<id>` | `npc.clerk_01` |

The player character uses a normal `char.*` ID; `player` is not an ID namespace.

| Outfit | `outfit.<id>` | `outfit.evidence_blazer` |
| Tile | `tile.<set>.<name>` | `tile.scotus.marble_floor` |
| Prop | `prop.<name>` | `prop.podium` |
| Room | `room.<name>` | `room.scotus_lobby` |

---

## 5. Tags (Bar Exam Subjects)

### Canonical Subjects (16)

```json
["agency", "business_associations", "civil_procedure", "community_property", 
 "conflict_of_laws", "constitutional_law", "contracts", "criminal_law", 
 "criminal_procedure", "evidence", "family_law", "federal_income_tax", 
 "oil_gas", "property", "torts", "trusts_and_estates"]
```

### Tag Normalization

See [`content/tag_normalization.json`](../content/tag_normalization.json) for synonym mappings.

Examples:
- `civpro` → `civil_procedure`
- `conlaw` → `constitutional_law`
- `crim-law` → `criminal_law`

---

## 6. Agent Boundaries

### Editable Paths (agents MAY edit)

```
content/
docs/
scripts/
src/content/
src/game/
```

### Forbidden Paths (agents MUST NOT hand-edit)

```
generated/
vendor/
node_modules/
public/content/art/
```

**Note:** Build scripts (e.g., `npm run gen:sprites`) may write to these paths. Only *manual edits* are forbidden.

### Enforcement

Run `npm run check-boundaries` before committing. This script uses `git diff --name-only` (tracked files only) to detect forbidden path modifications.

---

## 7. LDtk Entity Fields

### Required Fields by Entity Type

| Entity | Required | Optional |
|--------|----------|----------|
| `PlayerSpawn` | `x`, `y` | |
| `NPC` | `x`, `y`, `inkKnot` | `sprite`, `name` |
| `EncounterTrigger` | `x`, `y`, `deckTag`, `count` | `rewardId` |
| `Door` | `x`, `y`, `targetLevel` | `locked`, `requiredItem` |
| `OutfitChest` | `x`, `y`, `outfitId` | |

---

## 8. Policy Skips

Some content is intentionally excluded from gameplay validation:

| ID Prefix | Reason |
|-----------|--------|
| `mpt-*` | MPT cards have different format; excluded from game deck |

These appear as "Policy Skips" in validator output, not errors.

---

## 9. Workflow for Agents

1. **Only edit** files in editable paths
2. **Reference assets by ID** from `registry.json`, never by filename
3. **Run validation** after every change:
   ```bash
   npm run verify
   ```
4. **Fix all hard errors** before committing
5. **Policy skips are informational** — no action needed

---

## 10. Schema Validation

- Contract itself: validated by `schemas/content_contract.schema.json`
- Character specs: validated by `schemas/CharacterSpec.schema.json`
- Room specs: validated by `schemas/RoomSpec.schema.json`
- Asset registry: validated by `schemas/AssetRegistry.schema.json`

---

## Quick Reference

```bash
# Validate all content
npm run validate

# Check agent didn't touch forbidden paths
npm run check-boundaries

# Run both (required before commit)
npm run verify
```
