#!/usr/bin/env python3
"""
fix_robe_frames.py - Surgical fixes for robe frames that fail skin validation.

This script applies targeted adjustments to specific frames:
- Widening robe for side-facing animations (rows 8, 10)
- Shifting pixels to cover exposed chest area

Usage:
    python fix_robe_frames.py
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw

# Frames that failed validation (row_col format)
FAILED_FRAMES = {
    # Row 8 (Walk Left) - need wider robe on right side
    (8, 0): {"expand_right": 4, "expand_left": 0},
    (8, 1): {"expand_right": 4, "expand_left": 0},
    (8, 2): {"expand_right": 5, "expand_left": 0},
    (8, 3): {"expand_right": 6, "expand_left": 0},
    (8, 4): {"expand_right": 5, "expand_left": 0},
    (8, 5): {"expand_right": 4, "expand_left": 0},
    (8, 6): {"expand_right": 4, "expand_left": 0},
    (8, 7): {"expand_right": 3, "expand_left": 0},
    (8, 8): {"expand_right": 4, "expand_left": 0},
    
    # Row 10 (Walk Right) - need wider robe on left side  
    (10, 0): {"expand_left": 4, "expand_right": 0},
    (10, 1): {"expand_left": 4, "expand_right": 0},
    (10, 2): {"expand_left": 4, "expand_right": 0},
    (10, 4): {"expand_left": 4, "expand_right": 0},
    (10, 5): {"expand_left": 4, "expand_right": 0},
    (10, 6): {"expand_left": 5, "expand_right": 0},
    (10, 7): {"expand_left": 5, "expand_right": 0},
    (10, 8): {"expand_left": 5, "expand_right": 0},
}

# Palette
C_OUTLINE = (26, 26, 46, 255)
C_SHADOW = (53, 53, 69, 255)
C_BASE = (40, 40, 58, 255)
C_HIGHLIGHT = (64, 64, 85, 255)

# Frame geometry
CENTER_X = 32
SHOULDER_Y = 24
HEM_Y = 58
CHEST_BOX = (24, 28, 42, 48)  # Area to cover


def expand_robe_frame(img: Image.Image, expand_left: int, expand_right: int) -> Image.Image:
    """
    Expand robe coverage to cover exposed chest area.
    
    For side-facing animations, the robe needs to be wider on the exposed side.
    """
    result = img.copy()
    draw = ImageDraw.Draw(result)
    pixels = result.load()
    
    # Find the current robe bounds at chest height
    chest_y = (CHEST_BOX[1] + CHEST_BOX[3]) // 2
    
    # Find leftmost and rightmost robe pixels at chest height
    robe_left = None
    robe_right = None
    
    for x in range(img.width):
        if pixels[x, chest_y][3] > 0:  # Non-transparent
            if robe_left is None:
                robe_left = x
            robe_right = x
    
    if robe_left is None:
        return result  # No robe pixels found
    
    # Expand left side
    if expand_left > 0:
        for y in range(SHOULDER_Y, HEM_Y):
            # Find leftmost robe pixel at this y
            for x in range(img.width):
                if pixels[x, y][3] > 0:
                    # Extend left by expand_left pixels
                    for dx in range(1, expand_left + 1):
                        new_x = x - dx
                        if new_x >= 0:
                            # Use shadow color for expansion (it's the hidden side)
                            draw.point((new_x, y), fill=C_SHADOW)
                    # Add outline on outer edge
                    if x - expand_left - 1 >= 0:
                        draw.point((x - expand_left - 1, y), fill=C_OUTLINE)
                    break
    
    # Expand right side
    if expand_right > 0:
        for y in range(SHOULDER_Y, HEM_Y):
            # Find rightmost robe pixel at this y
            for x in range(img.width - 1, -1, -1):
                if pixels[x, y][3] > 0:
                    # Extend right by expand_right pixels
                    for dx in range(1, expand_right + 1):
                        new_x = x + dx
                        if new_x < img.width:
                            draw.point((new_x, y), fill=C_SHADOW)
                    # Add outline on outer edge
                    if x + expand_right + 1 < img.width:
                        draw.point((x + expand_right + 1, y), fill=C_OUTLINE)
                    break
    
    return result


def fix_frames(input_dir: str, output_dir: str):
    """Apply fixes to failed frames."""
    in_path = Path(input_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    fixed_count = 0
    
    for (row, col), fix_params in FAILED_FRAMES.items():
        filename = f"{row}_{col}.png"
        frame_path = in_path / filename
        
        if not frame_path.exists():
            print(f"⚠️  Frame {filename} not found")
            continue
        
        img = Image.open(frame_path).convert("RGBA")
        
        # Apply expansion fix
        fixed = expand_robe_frame(
            img,
            expand_left=fix_params.get("expand_left", 0),
            expand_right=fix_params.get("expand_right", 0)
        )
        
        fixed.save(out_path / filename)
        fixed_count += 1
        print(f"✅ Fixed {filename} (L+{fix_params.get('expand_left', 0)}, R+{fix_params.get('expand_right', 0)})")
    
    print(f"\n✅ Fixed {fixed_count} frames → {output_dir}/")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Fix robe frames with skin leaks")
    parser.add_argument("--input", default="workspace/frames/male_robe",
                        help="Input robe frames directory")
    parser.add_argument("--output", default="workspace/frames/male_robe_fixed",
                        help="Output fixed frames directory")
    
    args = parser.parse_args()
    fix_frames(args.input, args.output)


if __name__ == "__main__":
    main()
