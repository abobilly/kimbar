#!/usr/bin/env python3
"""
Assemble individual 32x32 tiles into a single tileset PNG for LDtk/Phaser.

Usage:
    python scripts/assemble-tileset.py
    
Output:
    generated/tilesets/scotus_tiles.png - Combined tileset image
    generated/tilesets/scotus_tiles.json - Tile index mapping
"""

import json
import math
from pathlib import Path
from PIL import Image

TILE_SIZE = 32
TILES_PER_ROW = 16  # 16 * 32 = 512px wide (reasonable texture size)
INPUT_DIR = Path("generated/tiles")
OUTPUT_DIR = Path("generated/tilesets")
MANIFEST_PATH = Path("content/ai_jobs/tileset_manifest.json")


def main():
    # Load manifest for ordering
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
    
    tiles = manifest.get("tiles", [])
    tile_ids = [t["id"] for t in tiles]
    
    # Find all tile PNGs
    tile_files = {}
    for png in INPUT_DIR.glob("*.png"):
        tile_id = png.stem
        tile_files[tile_id] = png
    
    # Order tiles by manifest (ensures consistent layout)
    ordered_tiles = []
    for tile_id in tile_ids:
        if tile_id in tile_files:
            ordered_tiles.append((tile_id, tile_files[tile_id]))
    
    # Add any tiles not in manifest at the end
    for tile_id, path in tile_files.items():
        if tile_id not in tile_ids:
            ordered_tiles.append((tile_id, path))
    
    if not ordered_tiles:
        print("No tiles found!")
        return
    
    # Calculate dimensions
    num_tiles = len(ordered_tiles)
    rows = math.ceil(num_tiles / TILES_PER_ROW)
    width = TILES_PER_ROW * TILE_SIZE
    height = rows * TILE_SIZE
    
    print(f"Assembling {num_tiles} tiles into {width}x{height} tileset ({TILES_PER_ROW} columns, {rows} rows)")
    
    # Create output image
    tileset = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    # Tile index mapping (tile_id -> index for LDtk)
    tile_index = {}
    
    for idx, (tile_id, tile_path) in enumerate(ordered_tiles):
        col = idx % TILES_PER_ROW
        row = idx // TILES_PER_ROW
        x = col * TILE_SIZE
        y = row * TILE_SIZE
        
        try:
            tile_img = Image.open(tile_path)
            if tile_img.size != (TILE_SIZE, TILE_SIZE):
                tile_img = tile_img.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
            tileset.paste(tile_img, (x, y))
            tile_index[tile_id] = {
                "index": idx,
                "x": x,
                "y": y,
                "col": col,
                "row": row
            }
        except Exception as e:
            print(f"  Warning: Could not load {tile_path}: {e}")
    
    # Save tileset
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    tileset_path = OUTPUT_DIR / "scotus_tiles.png"
    tileset.save(tileset_path, "PNG")
    print(f"✅ Saved tileset: {tileset_path}")
    
    # Save index mapping
    index_path = OUTPUT_DIR / "scotus_tiles.json"
    metadata = {
        "tileWidth": TILE_SIZE,
        "tileHeight": TILE_SIZE,
        "columns": TILES_PER_ROW,
        "rows": rows,
        "tileCount": num_tiles,
        "imageWidth": width,
        "imageHeight": height,
        "tiles": tile_index
    }
    with open(index_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Saved tile index: {index_path}")


if __name__ == "__main__":
    main()
