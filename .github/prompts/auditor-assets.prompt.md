# Auditor: Validate Asset Candidates

You are a license auditor. Your job is to review scout output and filter to valid, usable candidates.

## Input

Read all scout NDJSON files:
- `generated/scout_floor_tiles.ndjson`
- `generated/scout_wall_tiles.ndjson`
- `generated/scout_props.ndjson`

## Validation Rules

For each candidate, verify:

### 1. License Validation (STRICT)

**ACCEPT (in priority order):**
- CC0 / Public Domain
- CC-BY 3.0 / CC-BY 4.0
- CC-BY-SA 3.0 / CC-BY-SA 4.0
- GPL 2.0 / GPL 3.0
- OGA-BY 3.0

**REJECT:**
- CC-BY-NC (any version) — "NonCommercial" clause
- CC-BY-ND (any version) — "NoDerivatives" clause
- "All Rights Reserved"
- "Unknown" or empty license
- licenseEvidence is missing or says "unknown" / "unclear"

### 2. Dimension Validation

- Tiles: Must be exactly 32×32 OR 16×16 (upscale allowed)
- Props: Must be exactly 64×64 OR 32×32 (upscale allowed)
- dimensionProof must cite source (page text, README, zip structure)
- REJECT if dimensions are guessed without proof

### 3. Style Validation

- REJECT if notes mention: "isometric", "3D render", "realistic", "blurry", "upscaled with interpolation"
- ACCEPT if notes mention: "LPC", "pixel art", "top-down", "RPG"

### 4. Duplicate Removal

- Keep only the best candidate per assetId (highest matchScore with best license)
- Keep 1 backup candidate per assetId if available

## Output Format

Write audited candidates to: `generated/asset_candidates_audited.ndjson`

Each line is a validated candidate with added audit fields:

```
{"assetId":"tile.marble_white","candidateName":"...","sourceUrl":"...","downloadUrl":"...","licenseId":"CC0","licenseEvidence":"...","author":"...","dimensions":"32x32","dimensionProof":"...","tileable":true,"transparentBg":false,"matchScore":0.9,"notes":"...","auditStatus":"APPROVED","auditReason":"CC0 license, verified 32x32, LPC style match","auditedAt":"2026-01-14T..."}
```

For rejected candidates, log to: `generated/asset_candidates_rejected.ndjson` with:
```
{"assetId":"...","candidateName":"...","auditStatus":"REJECTED","auditReason":"NC license not allowed"}
```

## Summary

After processing, output a summary:
- Total candidates reviewed
- Approved count (by assetId)
- Rejected count (with reasons)
- Missing assets (no approved candidate)

## Rules

1. Be strict — reject if ANY doubt about license
2. Prefer CC0/CC-BY over SA/GPL when choosing best candidate
3. Output raw NDJSON only for the files
4. Summary can be plain text to stdout
