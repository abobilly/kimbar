# Task: Integrate Procedural Props into Runtime Loading

## Problem Summary

Procedural props (55 PNG files) are generated and deployed but **never appear in-game** because:
1. No `props` section in `generated/registry.json`
2. `Preloader.ts` doesn't load them
3. No entity type in LDtk to place them in levels

## Current State

| Stage | Status | Location |
|-------|--------|----------|
| Generation | ✅ Working | `python make_icons.py` → `vendor/props/` |
| Sync | ✅ Working | `sync-public.mjs` → `public/assets/props/` |
| Deploy | ✅ Working | Props exist on CF Pages |
| Registry | ❌ Missing | No `props` in `generated/registry.json` |
| Loading | ❌ Missing | `Preloader.ts` doesn't load props |
| Placement | ❌ Missing | No LDtk `Prop` entity, no rendering code |

## Files to Modify

### 1. Schema: `schemas/AssetRegistry.schema.json`

Add `props` to the registry schema:

```json
"props": {
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "path": { "type": "string" },
      "width": { "type": "integer" },
      "height": { "type": "integer" },
      "category": { "type": "string" }
    },
    "required": ["path"]
  }
}
```

### 2. Builder: `scripts/build-characters.js` (or new `build-props.js`)

Scan `vendor/props/` and add entries to registry:

```javascript
// Scan props directories
const PROPS_DIR = './vendor/props';
const categories = ['legal', 'exterior', 'office'];

const props = {};
for (const category of categories) {
  const dir = path.join(PROPS_DIR, category);
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.png')) {
        const id = file.replace('.png', '');
        props[id] = {
          path: `/assets/props/${category}/${file}`,
          category
        };
      }
    }
  }
}

registry.props = props;
```

### 3. Preloader: `src/game/scenes/Preloader.ts`

Load props as simple images (not spritesheets):

```typescript
// Load props from registry
if (registry.props) {
  for (const [id, prop] of Object.entries(registry.props)) {
    this.load.image(id, prop.path);
  }
}
```

### 4. WorldScene: `src/game/scenes/WorldScene.ts` (optional)

Handle Prop entities from LDtk:

```typescript
case 'Prop':
  const propKey = entity.properties?.propId;
  if (propKey && this.textures.exists(propKey)) {
    this.add.image(entity.x, entity.y, propKey)
      .setOrigin(0.5, 1)
      .setDepth(entity.y);
  }
  break;
```

## Prop Inventory

Current props in `vendor/props/`:

**legal/** (24 files):
- scales_of_justice_proc.png, gavel_proc.png, law_book_proc.png
- spittoon_proc.png, pewter_mug_proc.png, argument_lectern_proc.png
- conference_table_proc.png, quill_pen_crossed_proc.png, etc.

**exterior/** (10 files):
- scotus_column.png, scotus_stairs.png, lamp_post.png
- bench.png, tree.png, flagpole.png, etc.

## Constraints

- **Registry-first**: All props must be in registry, no hardcoded paths
- **Deterministic**: Registry output must have stable sort order
- **Gate**: Run `npm run check:fast` after changes

## Verification

1. `npm run prepare:content` → registry.json includes `props` section
2. `npm run dev` → no console errors about missing textures
3. Browser DevTools → Network tab shows props loading
4. (Optional) Add a Prop entity in LDtk → appears in game

## Reference

- Plan: `.ai/plans/visual-bugs-jan15.md`
- Prop generator: `make_icons.py`
- Sync script: `scripts/sync-public.mjs`
- Existing sprite loading: `src/game/scenes/Preloader.ts` lines 50-70
