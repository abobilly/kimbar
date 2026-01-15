#!/usr/bin/env python3
"""
03_stitch.py - Reassemble validated frames into a game-ready spritesheet.

Part of the Digital Tailor pipeline for LPC sprite layer creation.

Usage:
    python 03_stitch.py --config config_justice_robes.json
    python 03_stitch.py --input workspace/frames/composite --output output.png
"""

import argparse
import json
import os
from pathlib import Path

from PIL import Image

# LPC Standard Constants
TILE_SIZE = 64
SHEET_COLS = 13
SHEET_ROWS = 21  # Standard; can be 46 for extended sheets


def stitch_sheet(input_dir: str, output_file: str,
                 rows: int = SHEET_ROWS, cols: int = SHEET_COLS) -> bool:
    """
    Reassemble frames into a spritesheet.
    
    Args:
        input_dir: Directory containing frame files (row_col.png)
        output_file: Output spritesheet path
        rows: Number of rows in output sheet
        cols: Number of columns in output sheet
        
    Returns:
        True if successful
    """
    input_path = Path(input_dir)
    
    if not input_path.exists():
        print(f"❌ Input directory not found: {input_dir}")
        return False
    
    # Create blank canvas
    width = cols * TILE_SIZE
    height = rows * TILE_SIZE
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    frames_placed = 0
    frames_missing = 0
    
    for r in range(rows):
        for c in range(cols):
            filename = f"{r}_{c}.png"
            frame_path = input_path / filename
            
            if frame_path.exists():
                tile = Image.open(frame_path).convert("RGBA")
                
                # Verify tile size
                if tile.size != (TILE_SIZE, TILE_SIZE):
                    print(f"⚠️  Frame {filename} is {tile.size}, expected {TILE_SIZE}x{TILE_SIZE}")
                    tile = tile.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.NEAREST)
                
                # Paste at correct position
                x = c * TILE_SIZE
                y = r * TILE_SIZE
                sheet.paste(tile, (x, y))
                frames_placed += 1
            else:
                frames_missing += 1
    
    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save
    sheet.save(output_file, "PNG")
    
    print(f"✅ Stitched {frames_placed} frames → {output_file}")
    if frames_missing > 0:
        print(f"   ({frames_missing} empty cells left transparent)")
    
    return True


def stitch_robe_layer(input_dir: str, output_file: str,
                      rows: int = SHEET_ROWS, cols: int = SHEET_COLS) -> bool:
    """
    Stitch a robe-only layer (no body compositing).
    
    Same as stitch_sheet but semantically for robe layers.
    """
    return stitch_sheet(input_dir, output_file, rows, cols)


def load_config(config_path: str) -> dict:
    """Load configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Stitch frames into spritesheet")
    parser.add_argument("--config", help="Path to config JSON file")
    parser.add_argument("--input", help="Input frames directory")
    parser.add_argument("--output", help="Output spritesheet path")
    parser.add_argument("--rows", type=int, default=SHEET_ROWS,
                        help="Number of rows in sheet")
    parser.add_argument("--cols", type=int, default=SHEET_COLS,
                        help="Number of columns in sheet")
    
    args = parser.parse_args()
    
    if args.config:
        config = load_config(args.config)
        workspace = config.get("workspace_dir", "workspace/frames")
        
        for output_config in config.get("outputs", []):
            input_dir = f"{workspace}/composite_{output_config['label']}"
            output_file = output_config["path"]
            
            stitch_sheet(
                input_dir,
                output_file,
                output_config.get("rows", SHEET_ROWS),
                output_config.get("cols", SHEET_COLS)
            )
    elif args.input and args.output:
        stitch_sheet(args.input, args.output, args.rows, args.cols)
    else:
        # Default
        stitch_sheet(
            "workspace/frames/composite",
            "../../vendor/lpc/custom/output.png"
        )


if __name__ == "__main__":
    main()
