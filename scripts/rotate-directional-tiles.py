#!/usr/bin/env python3
"""
Post-process directional tiles to apply proper rotations.

Tiles ending in _N, _E, _S, _W, _NE, _NW, _SE, _SW get rotated
from a base orientation (North = 0°).

Usage:
    python scripts/rotate-directional-tiles.py
"""

from pathlib import Path
from PIL import Image
import re

TILES_DIR = Path("generated/tiles")

# Direction → rotation angle (clockwise from North)
ROTATIONS = {
    "_N": 0,
    "_E": 270,  # 90° clockwise = 270° counter-clockwise (PIL rotates CCW)
    "_S": 180,
    "_W": 90,
    "_NE": 315,
    "_NW": 45,
    "_SE": 225,
    "_SW": 135,
}

# For edges/borders, we use different logic - flip/mirror rather than rotate
# N = top edge, E = right edge, etc.
EDGE_TRANSFORMS = {
    "_N": lambda img: img,  # Base - top edge highlighted
    "_E": lambda img: img.transpose(Image.ROTATE_270),
    "_S": lambda img: img.transpose(Image.ROTATE_180),
    "_W": lambda img: img.transpose(Image.ROTATE_90),
}

CORNER_TRANSFORMS = {
    "_NE": lambda img: img,  # Base - top-right corner
    "_NW": lambda img: img.transpose(Image.FLIP_LEFT_RIGHT),
    "_SE": lambda img: img.transpose(Image.FLIP_TOP_BOTTOM),
    "_SW": lambda img: img.transpose(Image.ROTATE_180),
}

INNER_CORNER_TRANSFORMS = {
    "_NE": lambda img: img,
    "_NW": lambda img: img.transpose(Image.FLIP_LEFT_RIGHT),
    "_SE": lambda img: img.transpose(Image.FLIP_TOP_BOTTOM),
    "_SW": lambda img: img.transpose(Image.ROTATE_180),
}


def get_base_tile(tile_id: str) -> str:
    """Get the base tile ID (without direction suffix)."""
    for suffix in ["_NE", "_NW", "_SE", "_SW", "_N", "_E", "_S", "_W"]:
        if tile_id.endswith(suffix):
            return tile_id[:-len(suffix)]
    return tile_id


def get_direction(tile_id: str) -> str:
    """Extract direction suffix from tile ID."""
    for suffix in ["_NE", "_NW", "_SE", "_SW", "_N", "_E", "_S", "_W"]:
        if tile_id.endswith(suffix):
            return suffix
    return None


def transform_tile(img: Image.Image, tile_id: str) -> Image.Image:
    """Apply appropriate transform based on tile type and direction."""
    direction = get_direction(tile_id)
    if not direction:
        return img
    
    tile_lower = tile_id.lower()
    
    # Corners use flip transforms
    if "inner_corner" in tile_lower:
        transform = INNER_CORNER_TRANSFORMS.get(direction)
    elif "outer_corner" in tile_lower or "corner" in tile_lower:
        transform = CORNER_TRANSFORMS.get(direction)
    # Edges use rotation
    elif "edge" in tile_lower or "border" in tile_lower:
        transform = EDGE_TRANSFORMS.get(direction)
    # T-junctions
    elif "t_junction" in tile_lower or "junction" in tile_lower:
        transform = EDGE_TRANSFORMS.get(direction)
    else:
        # Default: use edge transforms
        transform = EDGE_TRANSFORMS.get(direction)
    
    if transform:
        return transform(img)
    return img


def main():
    # Find all directional tiles
    directional_pattern = re.compile(r".*_(N|E|S|W|NE|NW|SE|SW)\.png$")
    
    tiles = [p for p in TILES_DIR.glob("*.png") if directional_pattern.match(p.name)]
    print(f"Found {len(tiles)} directional tiles")
    
    # Group by base tile
    base_groups = {}
    for tile_path in tiles:
        tile_id = tile_path.stem
        base = get_base_tile(tile_id)
        if base not in base_groups:
            base_groups[base] = []
        base_groups[base].append(tile_path)
    
    print(f"Found {len(base_groups)} base tile groups")
    
    # Process each group - use _N or first tile as source, transform others
    transformed = 0
    for base, paths in base_groups.items():
        # Find the base/north tile to use as source
        source_path = None
        for suffix in ["_N", "_NE"]:  # Prefer _N, then _NE as base
            candidate = TILES_DIR / f"{base}{suffix}.png"
            if candidate.exists():
                source_path = candidate
                break
        
        if not source_path:
            source_path = paths[0]  # Use first available
        
        try:
            source_img = Image.open(source_path)
            if source_img.mode != "RGBA":
                source_img = source_img.convert("RGBA")
        except Exception as e:
            print(f"  Warning: Could not load {source_path}: {e}")
            continue
        
        # Transform each variant
        for tile_path in paths:
            tile_id = tile_path.stem
            direction = get_direction(tile_id)
            
            if direction == "_N" or (direction == "_NE" and "corner" in tile_id.lower()):
                # This is the source, skip
                continue
            
            transformed_img = transform_tile(source_img.copy(), tile_id)
            transformed_img.save(tile_path, "PNG")
            transformed += 1
    
    print(f"✅ Transformed {transformed} directional tiles")


if __name__ == "__main__":
    main()
