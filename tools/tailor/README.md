# Digital Tailor Pipeline

A 3-stage Python pipeline for creating LPC-compatible sprite layers (e.g., justice robes).

## Pipeline Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 01_slice.py │───▶│ 02_tailor.py│───▶│ 03_stitch.py│
│   Explode   │    │  Composite  │    │  Reassemble │
│   sheets    │    │  + Validate │    │  to sheet   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   workspace/         workspace/         vendor/lpc/
   frames/{body,      frames/            custom/
    robe}/            composite/         output.png
```

## LPC Sheet Specifications

| Property    | Value               |
|-------------|---------------------|
| Frame size  | 64×64 pixels        |
| Columns     | 13                  |
| Rows        | 21 (standard)       |
| Total size  | 832×1344            |

### Row Layout (walk animations)

| Row | Animation  | Direction  |
|-----|------------|------------|
| 7   | Walk       | Up (back)  |
| 8   | Walk       | Left       |
| 9   | Walk       | Down (front) |
| 10  | Walk       | Right      |

## Usage

### Quick Start

```bash
# Full pipeline for justice robes
npm run tailor:robes

# Or run manually:
cd tools/tailor
python 01_slice.py --config config_justice_robes.json
python 02_tailor.py --config config_justice_robes.json
python 03_stitch.py --config config_justice_robes.json
```

### Agent-Assisted Frame Fixing

When `02_tailor.py` reports skin leaks:

```
⚠️  WARNING: Frame 9_1 has exposed skin! (Leaks: 12)
```

Tell your agent:
> "Frame 9_1.png fails validate_coverage (12 skin pixels). Write a Pillow function to shift robe pixels up 2px for that frame, then re-run validation."

## Validation

The "Skin Leak Test" checks chest area (box 24,30 to 40,45) for exposed flesh-tone pixels.
Tolerance: <5 pixels = PASS.

## Output Locations

| Body Type | Output Path |
|-----------|-------------|
| Male      | `vendor/lpc/custom/torso_robe_judge_male_black.png` |
| Female    | `vendor/lpc/custom/torso_robe_judge_female_black.png` |

These are then registered in `content/asset_specs/` and referenced by character specs.
