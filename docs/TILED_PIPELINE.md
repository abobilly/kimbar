# Tiled Pipeline Documentation

> **Canonical Reference**: This document is the single source of truth for the Tiled content pipeline in kimbar.

---

## 1. Overview

Kimbar uses **Tiled** as the primary authoring tool for all playable rooms. The Tiled pipeline validates, compiles, and indexes room maps from TMX source files into runtime-ready LevelData JSON.

**Current Status**: 18+ playable rooms authored in Tiled, with a `.world` manifest for spatial organization.

---

## 2. Authoritative Source Policy

### Tiled-First Policy

All new playable rooms **MUST** be authored in Tiled. The build system follows a strict priority order:

1. **Tiled TMX** (`public/content/tiled/rooms/*.tmx`) — Primary source
2. **LDtk** (`public/content/ldtk/*.ldtk`) — Legacy fallback only

When both sources exist for a room ID, **Tiled always wins**.

### TILED_ONLY Strict Mode

For CI/CD and strict validation, use the `TILED_ONLY=1` environment variable:

```bash
TILED_ONLY=1 npm run validate
```

In strict mode:
- LDtk fallback is disabled
- Any room without a Tiled source fails validation
- Use this mode before releases to ensure full Tiled coverage

### LDtk Legacy Fallback

LDtk files in `public/content/ldtk/` are only used when:
- No corresponding TMX file exists in `public/content/tiled/rooms/`
- `TILED_ONLY=1` is NOT set

**Migration Goal**: Eliminate all LDtk dependencies.

---

## 3. Folder Layout Invariants

| Directory | Purpose | Committed? |
|-----------|---------|------------|
| `specs/**` | Authored compilation inputs (room_entries, characters, ink) | ✅ Yes |
| `public/content/**` | Runtime-authored content root (Tiled sources, cards) | ✅ Yes |
| `public/generated/**` | Build outputs (compiled levels, sprites, registries) | ❌ No (gitignored) |
| `vendor/**` | External dumps (ULPC generator, large asset packs) | ❌ No (gitignored) |
| `tools/**` | Committed tooling (tailor, lpc-builder) | ✅ Yes |

### Tiled-Specific Paths

```
public/content/tiled/
├── rooms/              # TMX source files (*.tmx)
├── templates/          # Room template (room-template.json)
├── schemas/            # JSON schemas for validation
├── tilesets/           # TSX tileset definitions (*.tsx)
├── tiles/              # PNG tile atlases
└── worlds/             # .world manifest files

public/generated/levels/
├── tiled/              # Compiled Tiled LevelData (*.json)
├── ldtk/               # Compiled LDtk LevelData (legacy)
└── index.json          # Unified level index
```

### Sacred Invariant

> **NEVER** commit to `public/generated/`. All outputs are rebuilt by `npm run prepare:content`.

---

## 4. Tiled Authoring Contract

### Room Template

Use the canonical template at [`public/content/tiled/templates/room-template.json`](../public/content/tiled/templates/room-template.json) as a starting point for new rooms.

**Template defaults**:
- Tile size: 32×32 pixels
- Default dimensions: 20×15 tiles (640×480 pixels)
- Orientation: orthogonal
- Render order: right-down

### Required Layers (In Order)

Every room map **MUST** include these 6 layers in this exact order:

| # | Layer Name | Type | Purpose |
|---|------------|------|---------|
| 1 | `Floor` | tilelayer | Base terrain tiles |
| 2 | `Walls` | tilelayer | Wall tiles |
| 3 | `Trim` | tilelayer | Decorative borders/molding |
| 4 | `Overlays` | tilelayer | Objects that render above floor |
| 5 | `Collision` | tilelayer | Collision shapes (uses collision.tsx) |
| 6 | `Entities` | objectgroup | NPCs, doors, triggers, spawns |

**Validation enforces**:
- All 6 layers must exist
- Layer order must match exactly
- Tile layers must have correct dimensions
- Entities layer must be an objectgroup

### Map Dimension Constraints

| Constraint | Value |
|------------|-------|
| Minimum | 5×5 tiles |
| Maximum | 100×100 tiles |
| Tile size | 32×32 pixels (fixed) |

### Tileset Reference Conventions

All tileset references **MUST**:
- Use relative paths: `../tilesets/<name>.tsx`
- Point to TSX files in `public/content/tiled/tilesets/`
- Use consistent firstgid values across rooms

**Standard tilesets**:
```xml
<tileset firstgid="1" source="../tilesets/scotus_floors.tsx"/>
<tileset firstgid="1001" source="../tilesets/scotus_structures.tsx"/>
<tileset firstgid="2001" source="../tilesets/scotus_decor.tsx"/>
<tileset firstgid="3001" source="../tilesets/collision.tsx"/>
```

---

## 5. Entity Types and Properties

### Entity Schema

Objects in the `Entities` layer must have a valid `type` attribute. The following entity types are supported:

#### PlayerSpawn

Defines where the player can spawn in the room.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `spawnId` | string | ✅ | Unique spawn identifier (e.g., `default`, `from_lobby`) |

**Example**:
```xml
<object name="spawn_main" type="PlayerSpawn" x="320" y="416" width="32" height="32">
  <properties>
    <property name="spawnId" type="string" value="default"/>
  </properties>
</object>
```

#### Door

Defines a transition to another room.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `toMap` | string | ✅ | Target room ID |
| `toSpawn` | string | ✅ | Spawn ID in target room |
| `facing` | string | ❌ | Direction player faces after transition |

**Example**:
```xml
<object name="door_courtroom" type="Door" x="320" y="32" width="32" height="32">
  <properties>
    <property name="toMap" type="string" value="courtroom_main"/>
    <property name="toSpawn" type="string" value="default"/>
  </properties>
</object>
```

#### NPC

Defines an interactive character.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `characterId` | string | ✅ | Character registry ID |
| `storyKnot` | string | ❌ | Ink dialogue knot to start |

**Example**:
```xml
<object name="npc_clerk" type="NPC" x="160" y="224" width="32" height="32">
  <properties>
    <property name="characterId" type="string" value="npc.clerk_01"/>
    <property name="storyKnot" type="string" value="court_clerk_intro"/>
  </properties>
</object>
```

#### EncounterTrigger

Defines a flashcard battle encounter.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `deckTag` | string | ✅ | Flashcard deck tag to use |
| `count` | int | ✅ | Number of cards in encounter |
| `once` | bool | ✅ | Whether encounter can only trigger once |
| `rewardId` | string | ❌ | Reward item ID on completion |

**Example**:
```xml
<object name="encounter_roberts" type="EncounterTrigger" x="224" y="128" width="32" height="32">
  <properties>
    <property name="deckTag" type="string" value="constitutional_law"/>
    <property name="count" type="int" value="7"/>
    <property name="once" type="bool" value="true"/>
    <property name="rewardId" type="string" value="conlaw_robe"/>
  </properties>
</object>
```

#### Prop

Defines a decorative object.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `sprite` | string | ❌ | Sprite registry ID |
| `layer` | string | ❌ | Render layer override |
| `collision` | bool | ❌ | Whether prop blocks movement |

#### OutfitChest

Defines an interactive chest that rewards an outfit.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `outfitId` | string | ✅ | Outfit registry ID to unlock |
| `once` | bool | ❌ | Whether chest can only be opened once |

---

## 6. Build/Verify Commands

### Validation

```bash
npm run validate:tiled
```

**What it does**:
- Parses all TMX files in `public/content/tiled/rooms/`
- Validates against schema in `public/content/tiled/schemas/tiled_room.schema.json`
- Checks required layers exist and are in correct order
- Validates entity types and required properties
- Checks tileset references point to valid TSX files
- Verifies map dimensions are within bounds
- Scans for and rejects `__MACOSX` directories

**When to use**: After editing any TMX file, before committing.

### Compilation

```bash
npm run compile:tiled
```

**What it does**:
- Reads validated TMX files from `public/content/tiled/rooms/`
- Converts to LevelData JSON format
- Outputs to `public/generated/levels/tiled/<room_id>.json`
- Extracts entities, layers, and tileset references
- Sorts entities deterministically (by type, then x, then y)

**When to use**: After validation passes, to generate runtime files.

### Combined Build

```bash
npm run build:tiled
```

**What it does**: Runs `validate:tiled` then `compile:tiled` in sequence.

**When to use**: Standard workflow for Tiled changes.

### World Building

```bash
npm run build:tiled-world
```

**What it does**:
- Reads room entries from `specs/room_entries/*.json`
- Parses TMX dimensions from `public/content/tiled/rooms/*.tmx`
- Generates `.world` manifest at `public/content/tiled/worlds/scotus.world`
- Arranges rooms in a grid layout (4 per row, 64px padding)

**When to use**: After adding new rooms to update the world manifest.

### Level Index Building

```bash
npm run build:levels
```

**What it does**:
- Scans compiled Tiled levels in `public/generated/levels/tiled/`
- Falls back to LDtk for rooms without Tiled sources
- Generates unified index at `public/generated/levels/index.json`
- Records source type (tiled/ldtk) and metadata for each room

**When to use**: After compiling Tiled maps, to update the level index.

### Full Validation

```bash
npm run validate
```

**What it does**: Runs all validators including Tiled, schemas, and content checks.

### Strict Mode Validation

```bash
TILED_ONLY=1 npm run validate
```

**What it does**: Same as `validate` but fails if any room lacks a Tiled source.

**When to use**: Before releases, in CI/CD pipelines.

### Development Workflows

#### Watch Mode

```bash
npm run watch:tiled
```

**What it does**:
- Watches `public/content/tiled/**` for changes to .tmx, .tsx, and .world files
- Debounces changes by 300ms to avoid unnecessary builds
- On change, runs: `validate:tiled` → `compile:tiled` → `build:tiled-world` → `build:levels`
- Prints helpful output with file changed, summary counts, and timing
- Handles errors gracefully (stops pipeline on failure, continues watching)
- Supports `--no-validate` to skip validation for faster iteration
- Supports `--verbose` for detailed output

**Usage examples**:
```bash
# Skip validation for faster iteration
npm run watch:tiled -- --no-validate

# Verbose output
npm run watch:tiled -- --verbose
```

#### Concurrent Dev Server + Watch

```bash
npm run dev:tiled
```

**What it does**: Runs `watch:tiled` and Vite dev server in parallel:
- `[tiled]` (cyan): File watcher + auto-rebuild
- `[vite]` (magenta): Vite dev server
- Uses `dev-nolog` to reduce Vite's default logging

#### Full Pipeline

```bash
npm run prepare:content
```

**What it does**: Runs the complete content pipeline including:
1. `fetch-vendor` — Download external tools
2. `import:scotus` — Import SCOTUS assets
3. `import:lpc` — Import LPC assets
4. `build:chars` — Generate characters
5. `gen:sprites` — Generate spritesheets
6. `compile:ink` — Compile dialogues
7. `build:tiled` — Validate + compile Tiled maps
8. `build:levels` — Build level index
9. `build:asset-index` — Index all assets
10. `validate` — Final validation

---

## 7. How to Add a New Playable Room

### Step-by-Step Checklist

- [ ] **1. Create TMX file**
  - Open Tiled
  - File → New → New Map
  - Set tile size to 32×32
  - Set dimensions (min 5×5, max 100×100)
  - Save as `public/content/tiled/rooms/<room_id>.tmx`

- [ ] **2. Add required layers**
  - Create layers in order: `Floor`, `Walls`, `Trim`, `Overlays`, `Collision`, `Entities`
  - Set `Entities` as objectgroup, others as tilelayers

- [ ] **3. Add tilesets**
  - Map → Add External Tileset
  - Add from `public/content/tiled/tilesets/`
  - Use relative paths (`../tilesets/<name>.tsx`)

- [ ] **4. Add required entities**
  - At least one `PlayerSpawn` with `spawnId` property
  - At least one `Door` (unless dead-end room)
  - Set entity `type` attribute correctly

- [ ] **5. Create room entry**
  - Create `specs/room_entries/<room_id>.json`:
  ```json
  {
    "$schema": "../../schemas/RoomEntry.schema.json",
    "id": "<room_id>",
    "displayName": "Room Display Name",
    "environment": "interior"
  }
  ```

- [ ] **6. Validate**
  ```bash
  npm run validate:tiled
  ```

- [ ] **7. Compile**
  ```bash
  npm run build:tiled
  ```

- [ ] **8. Update world manifest**
  ```bash
  npm run build:tiled-world
  ```

- [ ] **9. Build level index**
  ```bash
  npm run build:levels
  ```

- [ ] **10. Run full check**
  ```bash
  npm run check
  ```

---

## 8. Troubleshooting

### "Map looks insanely wide"

**Symptom**: Room renders stretched or with wrong aspect ratio.

**Cause**: Map dimensions don't match layer dimensions.

**Fix**:
1. Open TMX in Tiled
2. Map → Resize Map
3. Ensure all layers have matching width/height
4. Re-save and recompile

### "Missing required layer"

**Symptom**: Validation fails with layer error.

**Cause**: Layer missing or misspelled.

**Fix**:
1. Check layer names are exactly: `Floor`, `Walls`, `Trim`, `Overlays`, `Collision`, `Entities`
2. Check layer order matches required order
3. Ensure `Entities` is objectgroup, others are tilelayers

### "Tileset source must point to ../tilesets/*.tsx"

**Symptom**: Validation fails with tileset path error.

**Cause**: Tileset uses absolute path or wrong relative path.

**Fix**:
1. Remove tileset from map
2. Re-add using Map → Add External Tileset
3. Navigate to `public/content/tiled/tilesets/`
4. Ensure path is `../tilesets/<name>.tsx`

### "Object has no type property"

**Symptom**: Validation fails for entity without type.

**Cause**: Object in Entities layer missing `type` attribute.

**Fix**:
1. Select object in Tiled
2. Set Type field (not Class) to valid entity type
3. Valid types: `PlayerSpawn`, `Door`, `NPC`, `EncounterTrigger`, `Prop`, `OutfitChest`

### "Missing required property"

**Symptom**: Validation fails for entity missing property.

**Cause**: Entity type requires specific properties.

**Fix**:
1. Check entity type requirements in Section 5
2. Add missing properties via Object Properties panel
3. Ensure property types match (string, int, bool)

### "Map content bounds exceed maximum"

**Symptom**: Validation fails with bounds error mentioning "stray tiles/objects".

**Cause**: Map has content extending far beyond expected bounds (often due to stray tiles/objects placed accidentally).

**Fix**:
1. Open TMX in Tiled
2. Zoom out to see entire map
3. Look for stray tiles or objects far from main content
4. Delete or move them closer to the main area
5. Re-save and recompile

**Escape Hatches**:
- **Custom property**: Add `allowLargeMap=true` to map properties (Window → Map Properties)
- **Environment variable**: `MAX_MAP_WIDTH=200 MAX_MAP_HEIGHT=200 npm run validate:tiled`
- **Allowlist**: Rooms with prefixes in `BOUNDS_CONFIG.allowlist` skip bounds check

### "__MACOSX directories found"

**Symptom**: Validation fails with FATAL error about __MACOSX.

**Cause**: macOS archive artifacts in content directories.

**Fix**:
```bash
rm -rf public/content/tiled/**/__MACOSX
rm -rf public/assets/tilesets/**/__MACOSX
```

### "No TMX files found"

**Symptom**: Validation reports no maps to validate.

**Cause**: TMX files not in correct directory or have wrong extension.

**Fix**:
1. Ensure files are in `public/content/tiled/rooms/`
2. Ensure extension is `.tmx` (not `.tmx.xml` or `.json`)
3. Ensure filenames don't start with `_` (underscore prefix is skipped)

---

## 9. Related Documentation

- [`docs/WORLD_CONTRACT.md`](./WORLD_CONTRACT.md) — Room structure and entity contracts
- [`docs/MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) — Asset architecture and pipeline overview
- [`docs/ASSET_PIPELINE.md`](./ASSET_PIPELINE.md) — Full asset pipeline documentation
- [`public/content/tiled/schemas/tiled_room.schema.json`](../public/content/tiled/schemas/tiled_room.schema.json) — JSON schema for validation

---

*Last updated: 2026-01-20*
