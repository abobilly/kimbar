# Asset Pipeline: Scout → Audit → Ingest → Integrate

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Stage 1: Scout │────▶│  Stage 2: Audit │────▶│ Stage 3: Ingest │────▶│ Stage 4: LDtk   │
│  (3× Flash)     │     │  (1× Flash/Pro) │     │ (Script)        │     │ (1× Pro)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
 scout_*.ndjson          audited.ndjson         vendor/tiles/          _template.ldtk
                                                manifest.json          + scotus_lobby
```

## Stage 1: Scouts (Parallel, Gemini Flash)

Run 3 terminals simultaneously:

**Terminal 1 — Floor Tiles:**
```bash
gemini -m gemini-2.5-flash --approval-mode yolo "$(cat .github/prompts/scout-floor-tiles.prompt.md)"
```

**Terminal 2 — Wall Tiles:**
```bash
gemini -m gemini-2.5-flash --approval-mode yolo "$(cat .github/prompts/scout-wall-tiles.prompt.md)"
```

**Terminal 3 — Props:**
```bash
gemini -m gemini-2.5-flash --approval-mode yolo "$(cat .github/prompts/scout-props.prompt.md)"
```

**Expected output:**
- `generated/scout_floor_tiles.ndjson`
- `generated/scout_wall_tiles.ndjson`
- `generated/scout_props.ndjson`

## Stage 2: Auditor (Single, Gemini Flash or Pro)

```bash
gemini -m gemini-2.5-flash --approval-mode yolo "$(cat .github/prompts/auditor-assets.prompt.md)"
```

**Expected output:**
- `generated/asset_candidates_audited.ndjson` (approved)
- `generated/asset_candidates_rejected.ndjson` (rejected)

## Stage 3: Ingest (Deterministic Script)

**Dry run first:**
```bash
npm run ingest:assets:dry
```

**Live run (downloads + packs atlas):**
```bash
npm run ingest:assets
```

**Requires:** ImageMagick installed (`magick` command available)

**Expected output:**
- `vendor/tiles/courthouse_mvp/*.png` (individual tiles)
- `vendor/tiles/courthouse_mvp/courthouse_tiles.png` (atlas)
- `vendor/tiles/courthouse_mvp/manifest.json`
- `vendor/props/courthouse_mvp/*.png`

## Stage 4: LDtk Integrator (Gemini Pro recommended)

```bash
gemini -m gemini-2.5-pro --approval-mode yolo "$(cat .github/prompts/ldtk-integrator.prompt.md)"
```

**Expected output:**
- `public/content/ldtk/_template.ldtk` patched with tileset defs
- `public/content/ldtk/scotus_lobby.ldtk` painted with example tiles
- `docs/TILESET_MAPPING.md` documentation

## Validation

After full pipeline:
```bash
npm run validate
npm run check:fast
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scout finds no candidates | Try broader search terms, check OGA is accessible |
| Auditor rejects everything | Review licenseEvidence — scouts may have guessed |
| Ingest dimension mismatch | Check if upscale allowed in spec, or find 32×32 source |
| ImageMagick not found | Install: `winget install ImageMagick.ImageMagick` |
| LDtk won't load tileset | Check relPath is correct relative to .ldtk file |

## Files Reference

| File | Purpose |
|------|---------|
| `content/asset_specs/courthouse_mvp.json` | Asset contract (source of truth) |
| `.github/prompts/scout-*.prompt.md` | Scout prompts |
| `.github/prompts/auditor-assets.prompt.md` | Auditor prompt |
| `.github/prompts/ldtk-integrator.prompt.md` | LDtk integration prompt |
| `scripts/ingest-assets.mjs` | Download/validate/pack script |
