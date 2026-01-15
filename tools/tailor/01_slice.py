#!/usr/bin/env python3
"""
01_slice.py - Explode spritesheets into individual 64x64 frames.

Part of the Digital Tailor pipeline for LPC sprite layer creation.

Usage:
    python 01_slice.py --config config_justice_robes.json
    python 01_slice.py --sheet path/to/sheet.png --label body --output workspace/frames/
"""

import argparse
import json
import os
from pathlib import Path

from PIL import Image

# LPC Standard Constants
TILE_SIZE = 64
SHEET_COLS = 13
SHEET_ROWS = 21


def slice_sheet(sheet_path: str, label: str, output_dir: str) -> int:
    """
    Slice a spritesheet into individual frame files.
    
    Args:
        sheet_path: Path to the spritesheet PNG
        label: Label for output subdirectory (e.g., 'body', 'robe')
        output_dir: Base output directory
        
    Returns:
        Number of frames extracted
    """
    if not os.path.exists(sheet_path):
        print(f"❌ Missing sheet: {sheet_path}")
        return 0
    
    sheet = Image.open(sheet_path).convert("RGBA")
    width, height = sheet.size
    
    # Validate dimensions
    expected_width = SHEET_COLS * TILE_SIZE
    if width != expected_width:
        print(f"⚠️  Sheet width {width} != expected {expected_width}")
    
    rows = height // TILE_SIZE
    cols = width // TILE_SIZE
    
    # Create output directory
    save_dir = Path(output_dir) / label
    save_dir.mkdir(parents=True, exist_ok=True)
    
    frame_count = 0
    for r in range(rows):
        for c in range(cols):
            # Extract 64x64 tile
            left = c * TILE_SIZE
            top = r * TILE_SIZE
            tile = sheet.crop((left, top, left + TILE_SIZE, top + TILE_SIZE))
            
            # Check if frame is empty (all transparent)
            if tile.getbbox() is None:
                continue
            
            # Save with row_col naming convention
            tile.save(save_dir / f"{r}_{c}.png")
            frame_count += 1
    
    print(f"✅ Sliced {sheet_path} → {frame_count} frames in {save_dir}/")
    return frame_count


def load_config(config_path: str) -> dict:
    """Load configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Slice spritesheets into individual frames")
    parser.add_argument("--config", help="Path to config JSON file")
    parser.add_argument("--sheet", help="Path to spritesheet (if not using config)")
    parser.add_argument("--label", default="frames", help="Label for output subdirectory")
    parser.add_argument("--output", default="workspace/frames", help="Output directory")
    
    args = parser.parse_args()
    
    if args.config:
        config = load_config(args.config)
        output_dir = config.get("workspace_dir", "workspace/frames")
        
        for sheet_config in config.get("sheets", []):
            slice_sheet(
                sheet_config["path"],
                sheet_config["label"],
                output_dir
            )
    elif args.sheet:
        slice_sheet(args.sheet, args.label, args.output)
    else:
        # Default: slice justice_robes.png
        slice_sheet(
            "../../vendor/lpc/justice_robes.png",
            "robe",
            "workspace/frames"
        )
    
    print("\n✅ Slicing complete. Check 'workspace/frames/'")


if __name__ == "__main__":
    main()
