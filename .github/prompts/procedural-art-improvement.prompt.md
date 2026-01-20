# Procedural Artist Improvement Prompt for Qwen

You are an expert pixel art evaluator and improver. Your goal is to iteratively improve procedural pixel art generation code using AI-generated references and systematic benchmarking.

## Your Capabilities

You have access to HuggingFace MCP tools including:
- **Z-Image-Turbo** (`mcp-tools/Z-Image-Turbo`): Generate high-quality reference images
- **Model Search**: Find evaluation and image processing models
- **Paper Search**: Research latest techniques in pixel art generation

## Workflow

### Phase 1: Generate Reference Images

Use Z-Image-Turbo to create reference images for each asset type:

```
For each asset (fountain, gavel, scales, briefcase, law_book, witness_stand):
  
  Prompt template:
  "pixel art {asset_name}, 16-bit SNES RPG style, top-down 3/4 view, 
   limited palette 8-16 colors, game asset sprite, transparent background,
   1px dark outline, 3-tone shading, sharp edges no anti-aliasing,
   LPC Universal Sprite Sheet compatible"

  Generate with:
  - Resolution: 1024x1024 (will be downscaled)
  - Steps: 8
  - Seed: Fixed for reproducibility
```

### Phase 2: Benchmark Existing Procedural Art

Run the benchmark tool on existing assets:

```bash
python tools/procedural_art_benchmark.py --image generated/icons/fountain.png
python tools/procedural_art_benchmark.py --image generated/icons/gavel.png
# ... for all assets
```

Evaluate on these dimensions:
1. **Aesthetic Quality** (0-100%): Color harmony, visual appeal
2. **Technical Quality** (0-100%): No anti-aliasing, proper transparency
3. **Style Consistency** (0-100%): LPC/SNES style adherence
4. **Palette Efficiency** (0-100%): Color count ≤16
5. **Readability** (0-100%): Clear at 32x32 or smaller
6. **Shading Quality** (0-100%): 3-tone with top-left light

### Phase 3: Compare & Analyze

For each asset, compare:
- Procedural version vs AI reference
- Identify dimension gaps (where procedural scores lower)
- Extract improvement patterns from higher-scoring references

Key questions:
- Does the AI reference have better outlines? → Add outline code
- Does it have cleaner shading? → Implement 3-tone gradient
- Is the palette more cohesive? → Reduce and unify colors

### Phase 4: Generate Improvement Code

Based on analysis, generate specific `make_icons.py` improvements:

```python
# EXAMPLE: Improve fountain with better shading

def draw_fountain_v2(d, w, h):
    """48x48 decorative stone fountain - IMPROVED
    
    Changes from v1:
    - Added proper 1px outlines on all shapes
    - Implemented 3-tone shading (highlight, base, shadow)
    - Reduced palette to 12 colors
    - Strengthened silhouette for readability
    """
    cx, cy = w // 2, h // 2
    
    # Basin (3-tone shading)
    d.ellipse([4, 28, w-5, h-4], fill=MARBLE[2], outline=MARBLE[0])  # Outline
    d.ellipse([6, 30, w-7, h-6], fill=MARBLE[3])  # Highlight top
    d.arc([4, 28, w-5, h-4], 180, 360, fill=MARBLE[1])  # Shadow bottom
    
    # Water with reflection
    d.ellipse([8, 32, w-9, h-8], fill=GLASS[1])
    d.line([12, 34, 20, 34], fill=GLASS[2], width=1)  # Reflection highlight
    
    # ... rest of improved code
```

### Phase 5: Iterate

1. Generate new assets with improved code
2. Re-benchmark
3. Compare scores
4. If improvement < 5%, try different approach
5. Repeat until score > 85% or 5 iterations

## Evaluation Criteria (LPC Style Bible)

| Criterion | Target | How to Check |
|-----------|--------|--------------|
| Outlines | 1px dark (#1A0F0A) on all shapes | Edge detection |
| Shading | 3 tones per color family | Luminance histogram |
| Palette | ≤16 colors total | Unique color count |
| Anti-aliasing | NONE | Semi-transparent pixel count = 0 |
| Light direction | Top-left | Highlight position analysis |
| Perspective | 3/4 top-down | Manual review |

## Output Format

After each iteration, report:

```markdown
## Iteration {N} Results

### Asset: {name}

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| Aesthetic | 72% | 84% | +12% |
| Technical | 65% | 91% | +26% |
| Style | 78% | 88% | +10% |
| Palette | 60% | 95% | +35% |
| Readability | 80% | 82% | +2% |
| Shading | 70% | 90% | +20% |
| **Overall** | **71%** | **88%** | **+17%** |

### Changes Made:
1. Added outline to basin ellipse
2. Implemented 3-tone marble shading
3. Reduced palette from 24 to 12 colors
4. Added water reflection highlight

### Code Diff:
{show specific line changes}

### Next Iteration Focus:
- Further improve readability at 16x16
- Add subtle texture to water
```

## Example Session

**User**: Improve the gavel asset in make_icons.py

**Assistant**:

1. First, let me generate an AI reference for comparison:
   [Calls Z-Image-Turbo with gavel prompt]

2. Benchmark current gavel:
   ```
   Current Score: 68%
   Issues: 
   - Missing outline on handle
   - Only 2 shading tones
   - 28 colors (too many)
   ```

3. Analyze reference (if available):
   ```
   Reference has:
   - Clean 1px outline throughout
   - 3-tone wood grain
   - Only 8 colors
   ```

4. Generate improved code:
   ```python
   def draw_gavel_v2(d, w, h):
       # ... improved implementation
   ```

5. Re-benchmark:
   ```
   New Score: 86% (+18%)
   All dimensions improved!
   ```

---

## Start Command

To begin improvement session:

```
Please analyze and improve the procedural art in make_icons.py using 
the benchmark system. Start with the {asset_name} asset. Generate an 
AI reference if possible, benchmark both, and provide improved code.
```
