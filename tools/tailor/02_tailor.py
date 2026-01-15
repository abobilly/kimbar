#!/usr/bin/env python3
"""
02_tailor.py - Composite layers and validate skin coverage.

Part of the Digital Tailor pipeline for LPC sprite layer creation.

The "Brain" of the pipeline:
1. Composites body + robe layers
2. Runs "Skin Leak Validation" on chest area
3. Reports frames that need manual fixing

Usage:
    python 02_tailor.py --config config_justice_robes.json
    python 02_tailor.py --body workspace/frames/body --robe workspace/frames/robe
"""

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from PIL import Image

# LPC Standard Constants
TILE_SIZE = 64
SHEET_COLS = 13
SHEET_ROWS = 21

# Walk animation rows (critical for validation)
WALK_ROWS = [7, 8, 9, 10]  # Up, Left, Down, Right

# Skin detection thresholds (flesh tones)
SKIN_TONES = [
    # Light skin range
    {"r_min": 200, "r_max": 255, "g_min": 160, "g_max": 220, "b_min": 130, "b_max": 190},
    # Medium skin range
    {"r_min": 180, "r_max": 230, "g_min": 130, "g_max": 180, "b_min": 100, "b_max": 160},
    # Dark skin range
    {"r_min": 100, "r_max": 180, "g_min": 70, "g_max": 140, "b_min": 50, "b_max": 120},
]

# Chest box coordinates (where skin should NOT show through robes)
CHEST_BOX = (24, 28, 42, 48)  # x1, y1, x2, y2


@dataclass
class ValidationResult:
    """Result of skin leak validation for a single frame."""
    row: int
    col: int
    passed: bool
    leak_count: int
    leak_pixels: List[Tuple[int, int]]


def is_skin_pixel(pixel: Tuple[int, int, int, int]) -> bool:
    """
    Check if a pixel is likely a flesh tone.
    
    Args:
        pixel: RGBA tuple
        
    Returns:
        True if pixel appears to be skin
    """
    r, g, b, a = pixel
    
    # Transparent or semi-transparent = not skin
    if a < 200:
        return False
    
    # Check against known skin tone ranges
    for tone in SKIN_TONES:
        if (tone["r_min"] <= r <= tone["r_max"] and
            tone["g_min"] <= g <= tone["g_max"] and
            tone["b_min"] <= b <= tone["b_max"]):
            # Additional heuristic: skin tends to have R > G > B
            if r >= g and g >= b * 0.9:
                return True
    
    return False


def validate_coverage(img: Image.Image, row: int, col: int, 
                      tolerance: int = 5) -> ValidationResult:
    """
    The "Skin Leak Test".
    
    Checks the chest area for exposed skin pixels that should be
    covered by the robe layer.
    
    Args:
        img: Composited frame image
        row: Row index
        col: Column index
        tolerance: Maximum allowed skin pixels before failure
        
    Returns:
        ValidationResult with pass/fail and leak details
    """
    pixels = img.load()
    leak_pixels = []
    
    x1, y1, x2, y2 = CHEST_BOX
    
    for y in range(y1, min(y2, img.height)):
        for x in range(x1, min(x2, img.width)):
            pixel = pixels[x, y]
            if is_skin_pixel(pixel):
                leak_pixels.append((x, y))
    
    passed = len(leak_pixels) <= tolerance
    
    return ValidationResult(
        row=row,
        col=col,
        passed=passed,
        leak_count=len(leak_pixels),
        leak_pixels=leak_pixels
    )


def composite_frame(body_path: Path, robe_path: Path) -> Image.Image:
    """
    Composite body and robe layers.
    
    Args:
        body_path: Path to body frame
        robe_path: Path to robe frame
        
    Returns:
        Composited RGBA image
    """
    body = Image.open(body_path).convert("RGBA")
    
    if robe_path.exists():
        robe = Image.open(robe_path).convert("RGBA")
        body.alpha_composite(robe)
    
    return body


def tailor_frames(body_dir: str, robe_dir: str, output_dir: str,
                  validate_rows: List[int] = None) -> List[ValidationResult]:
    """
    Process all frames: composite and validate.
    
    Args:
        body_dir: Directory with body frames
        robe_dir: Directory with robe frames
        output_dir: Output directory for composited frames
        validate_rows: Rows to validate (default: walk rows 7-10)
        
    Returns:
        List of ValidationResults for validated frames
    """
    if validate_rows is None:
        validate_rows = WALK_ROWS
    
    body_path = Path(body_dir)
    robe_path = Path(robe_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    results = []
    processed = 0
    
    # Process all body frames
    for frame_file in sorted(body_path.glob("*.png")):
        name = frame_file.name
        parts = name.replace(".png", "").split("_")
        
        if len(parts) != 2:
            continue
            
        r, c = int(parts[0]), int(parts[1])
        
        # Composite
        robe_frame = robe_path / name
        composited = composite_frame(frame_file, robe_frame)
        
        # Validate critical rows
        if r in validate_rows:
            result = validate_coverage(composited, r, c)
            results.append(result)
            
            if not result.passed:
                print(f"⚠️  WARNING: Frame {r}_{c} has exposed skin! "
                      f"(Leaks: {result.leak_count})")
        
        # Save composited frame
        composited.save(out_path / name)
        processed += 1
    
    print(f"\n✅ Tailored {processed} frames → {output_dir}/")
    
    # Summary
    failed = [r for r in results if not r.passed]
    if failed:
        print(f"\n❌ {len(failed)} frames failed skin validation:")
        for f in failed:
            print(f"   - Frame {f.row}_{f.col}: {f.leak_count} skin pixels exposed")
    else:
        print(f"\n✅ All {len(results)} validated frames passed!")
    
    return results


def validate_robe_only(robe_dir: str, body_dir: str = None,
                       validate_rows: List[int] = None) -> List[ValidationResult]:
    """
    Validate a robe layer by compositing with a reference body.
    
    If no body_dir provided, validates robe coverage directly
    (checking that robe covers the chest area).
    """
    if validate_rows is None:
        validate_rows = WALK_ROWS
    
    robe_path = Path(robe_dir)
    results = []
    
    for frame_file in sorted(robe_path.glob("*.png")):
        name = frame_file.name
        parts = name.replace(".png", "").split("_")
        
        if len(parts) != 2:
            continue
            
        r, c = int(parts[0]), int(parts[1])
        
        if r not in validate_rows:
            continue
        
        robe = Image.open(frame_file).convert("RGBA")
        
        # Check robe coverage (robe should have non-transparent pixels in chest area)
        pixels = robe.load()
        x1, y1, x2, y2 = CHEST_BOX
        coverage = 0
        
        for y in range(y1, min(y2, robe.height)):
            for x in range(x1, min(x2, robe.width)):
                if pixels[x, y][3] > 200:  # Non-transparent
                    coverage += 1
        
        # Chest box is ~14x20 = 280 pixels; expect >50% coverage
        min_coverage = 140
        passed = coverage >= min_coverage
        
        result = ValidationResult(
            row=r, col=c,
            passed=passed,
            leak_count=min_coverage - coverage if not passed else 0,
            leak_pixels=[]
        )
        results.append(result)
        
        if not result.passed:
            print(f"⚠️  Frame {r}_{c}: Robe coverage too thin ({coverage} pixels)")
    
    return results


def load_config(config_path: str) -> dict:
    """Load configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Composite and validate sprite layers")
    parser.add_argument("--config", help="Path to config JSON file")
    parser.add_argument("--body", help="Body frames directory")
    parser.add_argument("--robe", help="Robe frames directory")
    parser.add_argument("--output", default="workspace/frames/composite",
                        help="Output directory")
    parser.add_argument("--validate-only", action="store_true",
                        help="Only validate robe coverage (no compositing)")
    
    args = parser.parse_args()
    
    if args.config:
        config = load_config(args.config)
        workspace = config.get("workspace_dir", "workspace/frames")
        
        for job in config.get("tailor_jobs", []):
            body_dir = f"{workspace}/{job['body_label']}"
            robe_dir = f"{workspace}/{job['robe_label']}"
            output_dir = f"{workspace}/composite_{job['output_label']}"
            
            tailor_frames(body_dir, robe_dir, output_dir)
    elif args.robe:
        if args.validate_only:
            validate_robe_only(args.robe)
        elif args.body:
            tailor_frames(args.body, args.robe, args.output)
        else:
            validate_robe_only(args.robe)
    else:
        # Default paths
        tailor_frames(
            "workspace/frames/body",
            "workspace/frames/robe",
            "workspace/frames/composite"
        )


if __name__ == "__main__":
    main()
