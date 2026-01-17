# Props Contract

This document defines naming conventions, registry requirements, and validation rules for props.

## Naming Convention

### File Names
```
prop.{category}_{descriptor}.png
prop.{category}_{descriptor}.json
```

Examples:
- `prop.furniture_desk_wood.png`
- `prop.decor_bust_marble.png`
- `prop.legal_gavel.png`

### Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `furniture` | Tables, chairs, shelves | desk, chair, bookshelf |
| `decor` | Decorative items | bust, painting, plant |
| `legal` | Law-themed props | gavel, scales, books |
| `office` | Office equipment | computer, phone, lamp |
| `exterior` | Outdoor props | tree, bench, column |
| `container` | Storage items | chest, cabinet, locker |

## Metadata Schema

Every prop must have a companion JSON file:

```json
{
  "id": "prop.furniture_desk_wood",
  "name": "Wooden Desk",
  "category": "furniture",
  "size": { "width": 64, "height": 32 },
  "anchor": { "x": 0.5, "y": 1.0 },
  "collision": { "width": 60, "height": 28, "offsetX": 2, "offsetY": 2 },
  "tags": ["interior", "office", "wood"],
  "source": "lpc_import",
  "notes": "Standard office desk, 2 tiles wide"
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier matching filename |
| `name` | string | Human-readable display name |
| `category` | string | Category from allowed list |
| `size` | {width, height} | Sprite dimensions in pixels |
| `anchor` | {x, y} | Normalized anchor point (0-1) |
| `collision` | object | Collision bounds (or `null` for no collision) |
| `tags` | string[] | Searchable tags |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Origin: `lpc_import`, `procedural`, `manual` |
| `notes` | string | Developer notes |
| `variants` | string[] | Related prop IDs |
| `animated` | boolean | Has animation frames |

## Registry Contract

All props must be registered in `content/props/props.registry.json`:

```json
{
  "schemaVersion": 1,
  "props": [
    { "id": "prop.furniture_desk_wood", "path": "vendor/props/furniture/desk_wood.png" },
    { "id": "prop.decor_bust_marble", "path": "vendor/props/decor/bust_marble.png" }
  ]
}
```

## Validation Rules

The prop validator (`npm run props:validate`) must fail when:

1. **Orphan sprite**: PNG exists without corresponding JSON metadata
2. **Orphan metadata**: JSON exists without corresponding PNG
3. **Unregistered prop**: Prop files exist but not in registry
4. **Missing reference**: Registry references non-existent file
5. **Invalid category**: Category not in allowed list
6. **Size mismatch**: Metadata size doesn't match actual image dimensions
7. **Invalid anchor**: Anchor values outside 0-1 range
8. **Duplicate ID**: Same prop ID appears multiple times

## Validator Output

```
✓ 127 props validated
✗ ERROR: prop.furniture_chair_red - PNG exists but no metadata JSON
✗ ERROR: prop.legal_briefcase - registered but file not found at path
⚠ WARN: prop.decor_plant_01 - size in metadata (32x64) doesn't match image (32x32)
```

## Usage in Rooms

Props are placed via Tiled object layers:

```json
{
  "type": "Prop",
  "propId": "prop.furniture_desk_wood",
  "x": 160,
  "y": 256,
  "flipX": false
}
```

## Adding New Props

1. Create PNG at appropriate size (32×32 base, larger for multi-tile)
2. Create companion JSON with metadata
3. Add entry to `props.registry.json`
4. Run `npm run props:validate`
5. Run `npm run sync:public`

## Standard Sizes

| Type | Dimensions | Grid cells |
|------|------------|------------|
| Small | 32×32 | 1×1 |
| Tall | 32×64 | 1×2 |
| Wide | 64×32 | 2×1 |
| Large | 64×64 | 2×2 |
| Extra | 96×96+ | 3×3+ |

## Collision Guidelines

- Bottom-anchored props: collision at base
- Wall-mounted props: no collision (render only)
- Furniture: collision slightly smaller than visual bounds
- Decorative: consider walkability vs realism
