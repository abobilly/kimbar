"""
LibreSprite MCP Tools - Pixel art generation via LibreSprite CLI

This module provides comprehensive pixel art creation tools including:
- Basic sprites and drawing primitives (pixels, lines, shapes, patterns)
- Tilesets for game maps (create grids, draw on individual tiles)
- Props/game objects with standard size presets
- Animation support with frames and spritesheet export

All tools return detailed success/error information and work with sprite IDs
for tracking assets across multiple operations.
"""
import asyncio
import base64
import json
import math
import os
import random
import tempfile
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

from PIL import Image, ImageDraw

LIBRESPRITE_PATH = os.environ.get("LIBRESPRITE_PATH", "libresprite-headless")
WORKSPACE_DIR = Path(os.environ.get("WORKSPACE_DIR", "/tmp/pixel-mcp-workspace"))

# Metadata storage for tilesets and animations
SPRITE_METADATA: Dict[str, Dict[str, Any]] = {}

# Standard prop size presets (width x height)
PROP_SIZE_PRESETS = {
    "tiny": (8, 8),        # Small items, particles
    "small": (16, 16),     # Standard items, small props
    "medium": (32, 32),    # Characters, medium objects
    "tall": (16, 32),      # Standing characters, doors
    "wide": (32, 16),      # Platforms, benches
    "large": (48, 48),     # Large objects, bosses
    "xlarge": (64, 64),    # Very large objects
}

# Prop categories for organization
PROP_CATEGORIES = [
    "character",    # NPCs, player, enemies
    "item",         # Pickups, collectibles, keys
    "furniture",    # Tables, chairs, beds, shelves
    "decoration",   # Plants, paintings, rugs
    "interactive",  # Doors, chests, switches, levers
    "effect",       # Particles, explosions, magic
    "ui",           # Icons, buttons, frames
    "nature",       # Trees, rocks, bushes, flowers
    "building",     # Walls, roofs, windows
]


def parse_color(color: str) -> Tuple[int, int, int, int]:
    """Parse hex color string to RGBA tuple."""
    hex_color = color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    a = int(hex_color[6:8], 16) if len(hex_color) == 8 else 255
    return (r, g, b, a)


def get_sprite_path(sprite_id: str) -> Optional[Path]:
    """Get the path to a sprite file, checking PNG first then aseprite."""
    png_path = WORKSPACE_DIR / f"{sprite_id}.png"
    if png_path.exists():
        return png_path
    aseprite_path = WORKSPACE_DIR / f"{sprite_id}.aseprite"
    if aseprite_path.exists():
        return aseprite_path
    return None


def load_sprite(sprite_id: str) -> Optional[Image.Image]:
    """Load a sprite as a PIL Image in RGBA mode."""
    path = get_sprite_path(sprite_id)
    if not path:
        return None
    img = Image.open(path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return img


def save_sprite(sprite_id: str, img: Image.Image) -> Path:
    """Save a sprite to PNG format."""
    png_path = WORKSPACE_DIR / f"{sprite_id}.png"
    img.save(png_path)
    return png_path


async def ensure_workspace():
    """Ensure workspace directory exists."""
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    return WORKSPACE_DIR


async def run_libresprite(args: list[str], timeout: float = 60.0) -> tuple[int, str, str]:
    """Run LibreSprite in batch mode with given arguments."""
    cmd = [LIBRESPRITE_PATH, "--batch"] + args

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout
        )
        return process.returncode or 0, stdout.decode(), stderr.decode()
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
        raise TimeoutError(f"LibreSprite command timed out after {timeout}s")


async def create_sprite(
    width: int = 32,
    height: int = 32,
    color_mode: str = "rgba",
    background_color: Optional[str] = None,
) -> dict:
    """
    Create a new sprite file.

    Args:
        width: Sprite width in pixels (default 32)
        height: Sprite height in pixels (default 32)
        color_mode: Color mode - 'rgba', 'indexed', or 'grayscale'
        background_color: Optional hex color for background (e.g., '#ff0000')

    Returns:
        dict with sprite_id and file path
    """
    await ensure_workspace()

    sprite_id = str(uuid.uuid4())[:8]
    output_path = WORKSPACE_DIR / f"{sprite_id}.aseprite"

    # Create a blank image with PIL first
    mode_map = {"rgba": "RGBA", "indexed": "P", "grayscale": "L"}
    pil_mode = mode_map.get(color_mode, "RGBA")

    # Parse background color
    bg = (0, 0, 0, 0) if pil_mode == "RGBA" else 0
    if background_color and background_color.startswith("#"):
        hex_color = background_color.lstrip("#")
        if len(hex_color) == 6:
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            bg = (r, g, b, 255) if pil_mode == "RGBA" else r

    img = Image.new(pil_mode, (width, height), bg)

    # Save as PNG first (LibreSprite can open it)
    png_path = WORKSPACE_DIR / f"{sprite_id}.png"
    img.save(png_path)

    # Convert to Aseprite format using LibreSprite
    returncode, stdout, stderr = await run_libresprite([
        str(png_path),
        "--save-as", str(output_path)
    ])

    # Clean up temp PNG
    png_path.unlink(missing_ok=True)

    if returncode != 0:
        return {
            "error": f"Failed to create sprite: {stderr}",
            "success": False
        }

    return {
        "success": True,
        "sprite_id": sprite_id,
        "path": str(output_path),
        "width": width,
        "height": height,
        "color_mode": color_mode
    }


async def export_sprite(
    sprite_id: str,
    format: str = "png",
    scale: int = 1,
    sheet: bool = False,
) -> dict:
    """
    Export a sprite to various formats.

    Args:
        sprite_id: The sprite ID returned from create_sprite
        format: Output format - 'png', 'gif', 'webp'
        scale: Scale factor (1-10)
        sheet: If True, export as spritesheet

    Returns:
        dict with base64-encoded image data
    """
    await ensure_workspace()

    input_path = WORKSPACE_DIR / f"{sprite_id}.aseprite"
    if not input_path.exists():
        # Try PNG fallback
        input_path = WORKSPACE_DIR / f"{sprite_id}.png"
        if not input_path.exists():
            return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    output_path = WORKSPACE_DIR / f"{sprite_id}_export.{format}"

    args = [str(input_path)]

    if scale > 1:
        args.extend(["--scale", str(min(scale, 10))])

    if sheet:
        args.extend(["--sheet", str(output_path)])
    else:
        args.extend(["--save-as", str(output_path)])

    returncode, stdout, stderr = await run_libresprite(args)

    if returncode != 0 or not output_path.exists():
        return {
            "error": f"Export failed: {stderr}",
            "success": False
        }

    # Read and encode the output
    with open(output_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    # Clean up export file
    output_path.unlink(missing_ok=True)

    return {
        "success": True,
        "format": format,
        "scale": scale,
        "data": image_data,
        "mime_type": f"image/{format}"
    }


async def draw_pixel(
    sprite_id: str,
    x: int,
    y: int,
    color: str,
) -> dict:
    """
    Draw a single pixel on the sprite.

    Args:
        sprite_id: The sprite ID
        x: X coordinate
        y: Y coordinate
        color: Hex color (e.g., '#ff0000')

    Returns:
        dict with success status
    """
    await ensure_workspace()

    # Find the sprite file
    sprite_path = WORKSPACE_DIR / f"{sprite_id}.aseprite"
    png_path = WORKSPACE_DIR / f"{sprite_id}.png"

    working_path = sprite_path if sprite_path.exists() else png_path
    if not working_path.exists():
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    # Use PIL for pixel manipulation (faster than CLI for single pixels)
    img = Image.open(working_path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Parse color
    hex_color = color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    a = 255
    if len(hex_color) == 8:
        a = int(hex_color[6:8], 16)

    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), (r, g, b, a))
    else:
        return {"error": f"Coordinates ({x}, {y}) out of bounds", "success": False}

    # Save back
    img.save(png_path)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "x": x,
        "y": y,
        "color": color
    }


async def draw_rect(
    sprite_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    color: str,
    filled: bool = True,
) -> dict:
    """
    Draw a rectangle on the sprite.

    Args:
        sprite_id: The sprite ID
        x: Top-left X coordinate
        y: Top-left Y coordinate
        width: Rectangle width
        height: Rectangle height
        color: Hex color
        filled: If True, fill the rectangle; if False, draw outline only

    Returns:
        dict with success status
    """
    await ensure_workspace()

    png_path = WORKSPACE_DIR / f"{sprite_id}.png"
    sprite_path = WORKSPACE_DIR / f"{sprite_id}.aseprite"

    working_path = png_path if png_path.exists() else sprite_path
    if not working_path.exists():
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    img = Image.open(working_path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Parse color
    hex_color = color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    a = 255
    if len(hex_color) == 8:
        a = int(hex_color[6:8], 16)

    pixels = img.load()

    for py in range(y, min(y + height, img.height)):
        for px in range(x, min(x + width, img.width)):
            if px < 0 or py < 0:
                continue
            if filled or px == x or px == x + width - 1 or py == y or py == y + height - 1:
                pixels[px, py] = (r, g, b, a)

    img.save(png_path)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "rect": {"x": x, "y": y, "width": width, "height": height},
        "color": color,
        "filled": filled
    }


async def list_sprites() -> dict:
    """
    List all sprites in the workspace.

    Returns:
        dict with list of sprite IDs and metadata
    """
    await ensure_workspace()

    sprites = []
    for path in WORKSPACE_DIR.glob("*.png"):
        if "_export" not in path.stem:
            try:
                img = Image.open(path)
                sprites.append({
                    "sprite_id": path.stem,
                    "width": img.width,
                    "height": img.height,
                    "mode": img.mode
                })
            except Exception:
                pass

    for path in WORKSPACE_DIR.glob("*.aseprite"):
        sprite_id = path.stem
        if not any(s["sprite_id"] == sprite_id for s in sprites):
            sprites.append({
                "sprite_id": sprite_id,
                "format": "aseprite"
            })

    return {
        "success": True,
        "sprites": sprites,
        "count": len(sprites)
    }


async def delete_sprite(sprite_id: str) -> dict:
    """
    Delete a sprite from the workspace.

    Args:
        sprite_id: The sprite ID to delete

    Returns:
        dict with success status
    """
    await ensure_workspace()

    deleted = []
    for ext in [".png", ".aseprite", "_export.png", "_export.gif", "_export.webp"]:
        path = WORKSPACE_DIR / f"{sprite_id}{ext}"
        if path.exists():
            path.unlink()
            deleted.append(str(path))

    if not deleted:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    return {
        "success": True,
        "sprite_id": sprite_id,
        "deleted_files": deleted
    }


async def resize_sprite(
    sprite_id: str,
    new_width: int,
    new_height: int,
    method: str = "nearest"
) -> dict:
    """
    Resize a sprite.

    Args:
        sprite_id: The sprite ID
        new_width: New width in pixels
        new_height: New height in pixels
        method: Resize method - 'nearest' (pixel-perfect) or 'bilinear'

    Returns:
        dict with success status
    """
    await ensure_workspace()

    png_path = WORKSPACE_DIR / f"{sprite_id}.png"
    if not png_path.exists():
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    img = Image.open(png_path)

    resample = Image.NEAREST if method == "nearest" else Image.BILINEAR
    img = img.resize((new_width, new_height), resample)
    img.save(png_path)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "new_width": new_width,
        "new_height": new_height,
        "method": method
    }


# =============================================================================
# DRAWING PRIMITIVES - For creating detailed pixel art with textures/patterns
# =============================================================================

async def draw_line(
    sprite_id: str,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    color: str,
    thickness: int = 1,
) -> dict:
    """
    Draw a line between two points using Bresenham's algorithm for pixel-perfect lines.

    Use this for:
    - Outlines and edges
    - Structural details (wood grain, cracks, seams)
    - Directional shading lines

    Args:
        sprite_id: The sprite to draw on
        x1, y1: Starting point coordinates
        x2, y2: Ending point coordinates
        color: Hex color (e.g., '#8B4513' for brown wood grain)
        thickness: Line thickness in pixels (1-5, default 1)

    Returns:
        dict with success status and line info
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    rgba = parse_color(color)
    draw = ImageDraw.Draw(img)

    # Use PIL's line drawing with width
    draw.line([(x1, y1), (x2, y2)], fill=rgba, width=min(thickness, 5))

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "line": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        "color": color,
        "thickness": thickness
    }


async def draw_ellipse(
    sprite_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    color: str,
    filled: bool = True,
) -> dict:
    """
    Draw an ellipse or circle on the sprite.

    Use this for:
    - Circular objects (coins, buttons, wheels, eyes)
    - Organic shapes (boulders, bushes, clouds)
    - Highlights and shadows on round surfaces

    Args:
        sprite_id: The sprite to draw on
        x, y: Top-left corner of bounding box
        width, height: Size of ellipse (equal values = circle)
        color: Hex color
        filled: True for solid fill, False for outline only

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    rgba = parse_color(color)
    draw = ImageDraw.Draw(img)

    bbox = [x, y, x + width - 1, y + height - 1]
    if filled:
        draw.ellipse(bbox, fill=rgba)
    else:
        draw.ellipse(bbox, outline=rgba)

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "ellipse": {"x": x, "y": y, "width": width, "height": height},
        "color": color,
        "filled": filled
    }


async def draw_polygon(
    sprite_id: str,
    points: List[List[int]],
    color: str,
    filled: bool = True,
) -> dict:
    """
    Draw a polygon with arbitrary vertices.

    Use this for:
    - Triangular shapes (arrows, rooftops, crystals)
    - Complex shapes (stars, gems, irregular objects)
    - Angular design elements

    Args:
        sprite_id: The sprite to draw on
        points: List of [x, y] coordinate pairs, e.g., [[0,10], [5,0], [10,10]]
        color: Hex color
        filled: True for solid fill, False for outline only

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    rgba = parse_color(color)
    draw = ImageDraw.Draw(img)

    # Convert to tuple format PIL expects
    point_tuples = [tuple(p) for p in points]

    if filled:
        draw.polygon(point_tuples, fill=rgba)
    else:
        draw.polygon(point_tuples, outline=rgba)

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "points": points,
        "color": color,
        "filled": filled
    }


async def flood_fill(
    sprite_id: str,
    x: int,
    y: int,
    color: str,
    tolerance: int = 0,
) -> dict:
    """
    Fill a contiguous area with a color (paint bucket tool).

    Use this for:
    - Filling enclosed shapes after drawing outlines
    - Coloring large background areas
    - Replacing one color with another in a region

    Args:
        sprite_id: The sprite to fill on
        x, y: Starting point for the fill
        color: Hex color to fill with
        tolerance: Color matching tolerance (0-255, higher = more colors match)

    Returns:
        dict with success status and pixels filled count
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    if not (0 <= x < img.width and 0 <= y < img.height):
        return {"error": f"Coordinates ({x}, {y}) out of bounds", "success": False}

    rgba = parse_color(color)
    pixels = img.load()
    target_color = pixels[x, y]

    if target_color == rgba:
        return {"success": True, "sprite_id": sprite_id, "pixels_filled": 0}

    def colors_match(c1, c2):
        if tolerance == 0:
            return c1 == c2
        return all(abs(a - b) <= tolerance for a, b in zip(c1, c2))

    # Flood fill using stack-based approach
    stack = [(x, y)]
    filled = set()

    while stack:
        cx, cy = stack.pop()
        if (cx, cy) in filled:
            continue
        if not (0 <= cx < img.width and 0 <= cy < img.height):
            continue
        if not colors_match(pixels[cx, cy], target_color):
            continue

        pixels[cx, cy] = rgba
        filled.add((cx, cy))

        stack.extend([(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)])

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "start": {"x": x, "y": y},
        "color": color,
        "pixels_filled": len(filled)
    }


async def draw_pattern(
    sprite_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    pattern: str,
    color1: str,
    color2: str,
    scale: int = 1,
) -> dict:
    """
    Draw a repeating pattern for textures. Essential for creating detailed tiles.

    Available patterns:
    - 'checkerboard': Alternating squares (floors, chess boards)
    - 'stripes_h': Horizontal stripes (wood planks, fabric)
    - 'stripes_v': Vertical stripes (columns, bars)
    - 'stripes_d': Diagonal stripes (caution tape, decorative)
    - 'dots': Polka dot pattern (fabric, decorative)
    - 'grid': Grid lines (tiles, graph paper, windows)
    - 'brick': Brick/stone wall pattern
    - 'noise': Random noise texture (gravel, dirt, static)

    Args:
        sprite_id: The sprite to draw on
        x, y: Top-left corner of pattern area
        width, height: Size of area to fill with pattern
        pattern: Pattern type (see list above)
        color1: Primary color (hex)
        color2: Secondary color (hex)
        scale: Pattern scale multiplier (1-8, larger = bigger pattern units)

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    rgba1 = parse_color(color1)
    rgba2 = parse_color(color2)
    pixels = img.load()
    scale = max(1, min(scale, 8))

    for py in range(y, min(y + height, img.height)):
        for px in range(x, min(x + width, img.width)):
            if px < 0 or py < 0:
                continue

            # Calculate pattern-local coordinates
            lx, ly = (px - x) // scale, (py - y) // scale

            use_color1 = False

            if pattern == "checkerboard":
                use_color1 = (lx + ly) % 2 == 0
            elif pattern == "stripes_h":
                use_color1 = ly % 2 == 0
            elif pattern == "stripes_v":
                use_color1 = lx % 2 == 0
            elif pattern == "stripes_d":
                use_color1 = (lx + ly) % 2 == 0
            elif pattern == "dots":
                use_color1 = (lx % 3 == 1) and (ly % 3 == 1)
            elif pattern == "grid":
                use_color1 = (lx % 4 == 0) or (ly % 4 == 0)
            elif pattern == "brick":
                row = ly % 4
                if row < 3:
                    offset = 4 if (ly // 4) % 2 == 0 else 0
                    use_color1 = ((lx + offset) % 8) < 7
                else:
                    use_color1 = False  # Mortar row
            elif pattern == "noise":
                use_color1 = random.random() > 0.5
            else:
                use_color1 = True

            pixels[px, py] = rgba1 if use_color1 else rgba2

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "pattern": pattern,
        "area": {"x": x, "y": y, "width": width, "height": height},
        "colors": [color1, color2],
        "scale": scale
    }


async def apply_dither(
    sprite_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    color1: str,
    color2: str,
    gradient_direction: str = "vertical",
) -> dict:
    """
    Apply dithering between two colors for smooth gradients in pixel art style.
    Creates the illusion of color blending without using additional colors.

    Use this for:
    - Sky gradients (light blue to dark blue)
    - Shading on surfaces (highlight to shadow)
    - Terrain transitions (grass to dirt)
    - Metallic/reflective surfaces

    Args:
        sprite_id: The sprite to modify
        x, y: Top-left corner of dither area
        width, height: Size of area
        color1: Starting color (hex)
        color2: Ending color (hex)
        gradient_direction: 'vertical', 'horizontal', or 'radial'

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    rgba1 = parse_color(color1)
    rgba2 = parse_color(color2)
    pixels = img.load()

    # Bayer 4x4 dither matrix
    bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ]

    for py in range(y, min(y + height, img.height)):
        for px in range(x, min(x + width, img.width)):
            if px < 0 or py < 0:
                continue

            # Calculate gradient position (0.0 to 1.0)
            if gradient_direction == "horizontal":
                t = (px - x) / max(width - 1, 1)
            elif gradient_direction == "radial":
                cx, cy = x + width / 2, y + height / 2
                dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
                max_dist = math.sqrt((width / 2) ** 2 + (height / 2) ** 2)
                t = min(dist / max_dist, 1.0)
            else:  # vertical
                t = (py - y) / max(height - 1, 1)

            # Apply Bayer dithering
            threshold = bayer[py % 4][px % 4] / 16.0
            use_color2 = t > threshold

            pixels[px, py] = rgba2 if use_color2 else rgba1

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "area": {"x": x, "y": y, "width": width, "height": height},
        "colors": [color1, color2],
        "direction": gradient_direction
    }


# =============================================================================
# TILESET TOOLS - For creating game map tilesets
# =============================================================================

async def create_tileset(
    name: str,
    columns: int,
    rows: int,
    tile_size: int = 16,
    spacing: int = 0,
    margin: int = 0,
    background_color: Optional[str] = None,
) -> dict:
    """
    Create a new tileset grid for game maps. Tilesets contain multiple tiles
    arranged in a grid, used by level editors like LDtk and Tiled.

    Standard tile sizes: 8, 16, 32, 48, 64 (16 and 32 most common)

    Example configurations:
    - Simple terrain: 8 columns x 4 rows = 32 tiles
    - Full tileset: 16 columns x 16 rows = 256 tiles
    - Auto-tile set: 4 columns x 4 rows = 16 tiles (for blob/Wang tiles)

    Args:
        name: Descriptive name for the tileset (used in export)
        columns: Number of tile columns
        rows: Number of tile rows
        tile_size: Size of each tile in pixels (default 16)
        spacing: Pixels between tiles (default 0)
        margin: Pixels around the entire tileset (default 0)
        background_color: Optional hex color for empty space

    Returns:
        dict with tileset_id, dimensions, and tile count
    """
    await ensure_workspace()

    tileset_id = str(uuid.uuid4())[:8]

    # Calculate total image size
    total_width = margin * 2 + columns * tile_size + (columns - 1) * spacing
    total_height = margin * 2 + rows * tile_size + (rows - 1) * spacing

    # Create image
    bg = (0, 0, 0, 0)
    if background_color:
        bg = parse_color(background_color)

    img = Image.new("RGBA", (total_width, total_height), bg)

    # Save image and metadata
    save_sprite(tileset_id, img)

    SPRITE_METADATA[tileset_id] = {
        "type": "tileset",
        "name": name,
        "columns": columns,
        "rows": rows,
        "tile_size": tile_size,
        "spacing": spacing,
        "margin": margin,
        "tile_count": columns * rows
    }

    return {
        "success": True,
        "tileset_id": tileset_id,
        "name": name,
        "dimensions": {"width": total_width, "height": total_height},
        "grid": {"columns": columns, "rows": rows},
        "tile_size": tile_size,
        "tile_count": columns * rows,
        "note": f"Use draw_on_tile with tile_index 0-{columns * rows - 1} to draw on individual tiles"
    }


async def draw_on_tile(
    tileset_id: str,
    tile_index: int,
    commands: List[Dict[str, Any]],
) -> dict:
    """
    Draw on a specific tile within a tileset using a batch of drawing commands.
    Coordinates in commands are relative to the tile (0,0 is top-left of tile).

    Available commands:
    - {"type": "fill", "color": "#hex"} - Fill entire tile
    - {"type": "pixel", "x": 0, "y": 0, "color": "#hex"}
    - {"type": "rect", "x": 0, "y": 0, "w": 8, "h": 8, "color": "#hex", "filled": true}
    - {"type": "line", "x1": 0, "y1": 0, "x2": 15, "y2": 15, "color": "#hex"}
    - {"type": "ellipse", "x": 2, "y": 2, "w": 12, "h": 12, "color": "#hex", "filled": true}
    - {"type": "pattern", "pattern": "brick", "color1": "#hex", "color2": "#hex", "scale": 1}

    Example - grass tile with texture:
    [
        {"type": "fill", "color": "#4a7c23"},
        {"type": "pattern", "pattern": "noise", "color1": "#4a7c23", "color2": "#3d6b1c", "scale": 1}
    ]

    Args:
        tileset_id: The tileset ID
        tile_index: Which tile (0-based, left-to-right, top-to-bottom)
        commands: List of drawing commands to execute on the tile

    Returns:
        dict with success status and commands executed
    """
    await ensure_workspace()

    img = load_sprite(tileset_id)
    if not img:
        return {"error": f"Tileset '{tileset_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(tileset_id)
    if not meta or meta.get("type") != "tileset":
        return {"error": f"'{tileset_id}' is not a tileset", "success": False}

    columns = meta["columns"]
    rows = meta["rows"]
    tile_size = meta["tile_size"]
    spacing = meta["spacing"]
    margin = meta["margin"]

    if not (0 <= tile_index < columns * rows):
        return {"error": f"Tile index {tile_index} out of range (0-{columns * rows - 1})", "success": False}

    # Calculate tile position
    col = tile_index % columns
    row = tile_index // columns
    tile_x = margin + col * (tile_size + spacing)
    tile_y = margin + row * (tile_size + spacing)

    pixels = img.load()
    draw = ImageDraw.Draw(img)

    for cmd in commands:
        cmd_type = cmd.get("type")

        if cmd_type == "fill":
            rgba = parse_color(cmd["color"])
            for py in range(tile_size):
                for px in range(tile_size):
                    pixels[tile_x + px, tile_y + py] = rgba

        elif cmd_type == "pixel":
            rgba = parse_color(cmd["color"])
            px, py = cmd["x"], cmd["y"]
            if 0 <= px < tile_size and 0 <= py < tile_size:
                pixels[tile_x + px, tile_y + py] = rgba

        elif cmd_type == "rect":
            rgba = parse_color(cmd["color"])
            filled = cmd.get("filled", True)
            rx, ry, rw, rh = cmd["x"], cmd["y"], cmd["w"], cmd["h"]
            for py in range(max(0, ry), min(tile_size, ry + rh)):
                for px in range(max(0, rx), min(tile_size, rx + rw)):
                    if filled or px == rx or px == rx + rw - 1 or py == ry or py == ry + rh - 1:
                        pixels[tile_x + px, tile_y + py] = rgba

        elif cmd_type == "line":
            rgba = parse_color(cmd["color"])
            draw.line(
                [(tile_x + cmd["x1"], tile_y + cmd["y1"]),
                 (tile_x + cmd["x2"], tile_y + cmd["y2"])],
                fill=rgba
            )

        elif cmd_type == "ellipse":
            rgba = parse_color(cmd["color"])
            filled = cmd.get("filled", True)
            ex, ey, ew, eh = cmd["x"], cmd["y"], cmd["w"], cmd["h"]
            bbox = [tile_x + ex, tile_y + ey, tile_x + ex + ew - 1, tile_y + ey + eh - 1]
            if filled:
                draw.ellipse(bbox, fill=rgba)
            else:
                draw.ellipse(bbox, outline=rgba)

        elif cmd_type == "pattern":
            rgba1 = parse_color(cmd["color1"])
            rgba2 = parse_color(cmd["color2"])
            pattern = cmd.get("pattern", "checkerboard")
            scale = cmd.get("scale", 1)

            for py in range(tile_size):
                for px in range(tile_size):
                    lx, ly = px // scale, py // scale
                    use_color1 = False

                    if pattern == "checkerboard":
                        use_color1 = (lx + ly) % 2 == 0
                    elif pattern == "stripes_h":
                        use_color1 = ly % 2 == 0
                    elif pattern == "stripes_v":
                        use_color1 = lx % 2 == 0
                    elif pattern == "brick":
                        row_idx = ly % 4
                        if row_idx < 3:
                            offset = 4 if (ly // 4) % 2 == 0 else 0
                            use_color1 = ((lx + offset) % 8) < 7
                    elif pattern == "noise":
                        use_color1 = random.random() > 0.5

                    pixels[tile_x + px, tile_y + py] = rgba1 if use_color1 else rgba2

    save_sprite(tileset_id, img)

    return {
        "success": True,
        "tileset_id": tileset_id,
        "tile_index": tile_index,
        "tile_position": {"col": col, "row": row},
        "commands_executed": len(commands)
    }


async def copy_tile(
    tileset_id: str,
    source_index: int,
    target_index: int,
) -> dict:
    """
    Copy a tile to another position in the tileset. Useful for creating
    variations of existing tiles.

    Args:
        tileset_id: The tileset ID
        source_index: Tile index to copy from
        target_index: Tile index to copy to

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(tileset_id)
    if not img:
        return {"error": f"Tileset '{tileset_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(tileset_id)
    if not meta or meta.get("type") != "tileset":
        return {"error": f"'{tileset_id}' is not a tileset", "success": False}

    columns = meta["columns"]
    rows = meta["rows"]
    tile_size = meta["tile_size"]
    spacing = meta["spacing"]
    margin = meta["margin"]
    max_index = columns * rows - 1

    if not (0 <= source_index <= max_index and 0 <= target_index <= max_index):
        return {"error": f"Tile indices must be 0-{max_index}", "success": False}

    # Calculate positions
    src_col, src_row = source_index % columns, source_index // columns
    tgt_col, tgt_row = target_index % columns, target_index // columns

    src_x = margin + src_col * (tile_size + spacing)
    src_y = margin + src_row * (tile_size + spacing)
    tgt_x = margin + tgt_col * (tile_size + spacing)
    tgt_y = margin + tgt_row * (tile_size + spacing)

    # Copy tile region
    tile_region = img.crop((src_x, src_y, src_x + tile_size, src_y + tile_size))
    img.paste(tile_region, (tgt_x, tgt_y))

    save_sprite(tileset_id, img)

    return {
        "success": True,
        "tileset_id": tileset_id,
        "source_index": source_index,
        "target_index": target_index
    }


async def export_tileset(
    tileset_id: str,
    format: str = "png",
    scale: int = 1,
    include_metadata: bool = True,
) -> dict:
    """
    Export a tileset with optional metadata for game engine import.

    The metadata JSON follows standard tileset formats compatible with
    LDtk, Tiled, and Phaser 3.

    Args:
        tileset_id: The tileset ID
        format: Image format ('png' recommended for tilesets)
        scale: Scale factor for export
        include_metadata: If True, returns JSON metadata for level editors

    Returns:
        dict with base64 image data and optional metadata
    """
    await ensure_workspace()

    img = load_sprite(tileset_id)
    if not img:
        return {"error": f"Tileset '{tileset_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(tileset_id, {})

    # Scale if needed
    if scale > 1:
        new_size = (img.width * scale, img.height * scale)
        img = img.resize(new_size, Image.NEAREST)

    # Export image
    output_path = WORKSPACE_DIR / f"{tileset_id}_export.{format}"
    img.save(output_path)

    with open(output_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    output_path.unlink(missing_ok=True)

    result = {
        "success": True,
        "tileset_id": tileset_id,
        "format": format,
        "scale": scale,
        "data": image_data,
        "mime_type": f"image/{format}"
    }

    if include_metadata and meta.get("type") == "tileset":
        result["metadata"] = {
            "name": meta.get("name", tileset_id),
            "tileWidth": meta["tile_size"] * scale,
            "tileHeight": meta["tile_size"] * scale,
            "columns": meta["columns"],
            "rows": meta["rows"],
            "tileCount": meta["tile_count"],
            "spacing": meta["spacing"] * scale,
            "margin": meta["margin"] * scale,
            "imageWidth": img.width,
            "imageHeight": img.height
        }

    return result


# =============================================================================
# PROP TOOLS - For creating game objects/items
# =============================================================================

async def create_prop(
    name: str,
    size_preset: str = "small",
    category: str = "item",
    custom_width: Optional[int] = None,
    custom_height: Optional[int] = None,
    background_color: Optional[str] = None,
) -> dict:
    """
    Create a new prop/game object with standard sizing for game development.
    Props are individual sprites used for characters, items, and decorations.

    Size presets:
    - 'tiny': 8x8 - Small items, particles, bullets
    - 'small': 16x16 - Standard items, small props, icons
    - 'medium': 32x32 - Characters, medium objects, chests
    - 'tall': 16x32 - Standing characters, doors, signs
    - 'wide': 32x16 - Platforms, benches, beds
    - 'large': 48x48 - Large objects, bosses, vehicles
    - 'xlarge': 64x64 - Very large objects, splash screens

    Categories (for organization):
    - 'character': NPCs, player, enemies
    - 'item': Pickups, collectibles, keys, coins
    - 'furniture': Tables, chairs, beds, shelves
    - 'decoration': Plants, paintings, rugs, vases
    - 'interactive': Doors, chests, switches, levers
    - 'effect': Particles, explosions, magic effects
    - 'ui': Icons, buttons, frames, HUD elements
    - 'nature': Trees, rocks, bushes, flowers
    - 'building': Walls, roofs, windows, architectural

    Args:
        name: Descriptive name for the prop
        size_preset: One of the preset sizes (or use custom_width/height)
        category: Category for organization
        custom_width: Override preset width
        custom_height: Override preset height
        background_color: Optional hex color (default transparent)

    Returns:
        dict with prop_id, dimensions, and metadata
    """
    await ensure_workspace()

    # Get dimensions
    if custom_width and custom_height:
        width, height = custom_width, custom_height
    elif size_preset in PROP_SIZE_PRESETS:
        width, height = PROP_SIZE_PRESETS[size_preset]
    else:
        width, height = 16, 16  # Default to small

    prop_id = str(uuid.uuid4())[:8]

    # Create image
    bg = (0, 0, 0, 0)
    if background_color:
        bg = parse_color(background_color)

    img = Image.new("RGBA", (width, height), bg)
    save_sprite(prop_id, img)

    SPRITE_METADATA[prop_id] = {
        "type": "prop",
        "name": name,
        "category": category,
        "size_preset": size_preset if not (custom_width and custom_height) else "custom"
    }

    return {
        "success": True,
        "prop_id": prop_id,
        "name": name,
        "category": category,
        "dimensions": {"width": width, "height": height},
        "size_preset": size_preset,
        "note": f"Use standard drawing tools (draw_pixel, draw_rect, draw_pattern, etc.) with sprite_id='{prop_id}' to create the prop artwork"
    }


async def export_prop(
    prop_id: str,
    format: str = "png",
    scale: int = 1,
    include_hitbox: bool = False,
    hitbox: Optional[Dict[str, int]] = None,
) -> dict:
    """
    Export a prop with optional hitbox/collision metadata.

    Args:
        prop_id: The prop ID
        format: Image format ('png' recommended)
        scale: Scale factor for export (1-10)
        include_hitbox: If True, include hitbox in metadata
        hitbox: Custom hitbox {x, y, width, height} (defaults to full sprite)

    Returns:
        dict with base64 image data and optional hitbox metadata
    """
    await ensure_workspace()

    img = load_sprite(prop_id)
    if not img:
        return {"error": f"Prop '{prop_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(prop_id, {})

    # Scale if needed
    if scale > 1:
        new_size = (img.width * scale, img.height * scale)
        img = img.resize(new_size, Image.NEAREST)

    # Export
    output_path = WORKSPACE_DIR / f"{prop_id}_export.{format}"
    img.save(output_path)

    with open(output_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    output_path.unlink(missing_ok=True)

    result = {
        "success": True,
        "prop_id": prop_id,
        "name": meta.get("name", prop_id),
        "category": meta.get("category", "unknown"),
        "format": format,
        "scale": scale,
        "data": image_data,
        "mime_type": f"image/{format}",
        "dimensions": {"width": img.width, "height": img.height}
    }

    if include_hitbox:
        if hitbox:
            result["hitbox"] = {
                "x": hitbox.get("x", 0) * scale,
                "y": hitbox.get("y", 0) * scale,
                "width": hitbox.get("width", img.width // scale) * scale,
                "height": hitbox.get("height", img.height // scale) * scale
            }
        else:
            # Default to full sprite hitbox
            result["hitbox"] = {
                "x": 0,
                "y": 0,
                "width": img.width,
                "height": img.height
            }

    return result


# =============================================================================
# ANIMATION TOOLS - For creating animated sprites
# =============================================================================

async def add_frame(
    sprite_id: str,
    frame_duration: int = 100,
    copy_from_frame: Optional[int] = None,
) -> dict:
    """
    Add a new animation frame to a sprite. Frames are stored as horizontal
    strips (each frame is appended to the right of the existing image).

    Args:
        sprite_id: The sprite to add a frame to
        frame_duration: Duration of this frame in milliseconds (default 100ms = 10fps)
        copy_from_frame: Optional frame index to copy as starting point

    Returns:
        dict with success status, new frame index, and total frames
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(sprite_id, {})

    # Initialize animation metadata if needed
    if "frames" not in meta:
        meta["type"] = "animation"
        meta["frame_width"] = img.width
        meta["frame_height"] = img.height
        meta["frames"] = [{"duration": frame_duration}]
        SPRITE_METADATA[sprite_id] = meta
        # First frame already exists, just add metadata
        return {
            "success": True,
            "sprite_id": sprite_id,
            "frame_index": 0,
            "total_frames": 1,
            "frame_duration": frame_duration,
            "note": "Initialized animation. Frame 0 is the original sprite."
        }

    frame_width = meta["frame_width"]
    frame_height = meta["frame_height"]
    current_frames = len(meta["frames"])

    # Create new wider image to accommodate new frame
    new_width = (current_frames + 1) * frame_width
    new_img = Image.new("RGBA", (new_width, frame_height), (0, 0, 0, 0))

    # Paste existing frames
    new_img.paste(img, (0, 0))

    # Copy from specified frame or leave blank
    if copy_from_frame is not None and 0 <= copy_from_frame < current_frames:
        src_x = copy_from_frame * frame_width
        frame_region = img.crop((src_x, 0, src_x + frame_width, frame_height))
        new_img.paste(frame_region, (current_frames * frame_width, 0))

    save_sprite(sprite_id, new_img)

    meta["frames"].append({"duration": frame_duration})
    SPRITE_METADATA[sprite_id] = meta

    return {
        "success": True,
        "sprite_id": sprite_id,
        "frame_index": current_frames,
        "total_frames": current_frames + 1,
        "frame_duration": frame_duration
    }


async def draw_on_frame(
    sprite_id: str,
    frame_index: int,
    commands: List[Dict[str, Any]],
) -> dict:
    """
    Draw on a specific animation frame. Same command format as draw_on_tile.

    Commands use coordinates relative to the frame (0,0 is top-left of frame).

    Available commands:
    - {"type": "fill", "color": "#hex"}
    - {"type": "pixel", "x": 0, "y": 0, "color": "#hex"}
    - {"type": "rect", "x": 0, "y": 0, "w": 8, "h": 8, "color": "#hex", "filled": true}
    - {"type": "line", "x1": 0, "y1": 0, "x2": 15, "y2": 15, "color": "#hex"}
    - {"type": "ellipse", "x": 2, "y": 2, "w": 12, "h": 12, "color": "#hex", "filled": true}

    Args:
        sprite_id: The animated sprite ID
        frame_index: Which frame to draw on (0-based)
        commands: List of drawing commands

    Returns:
        dict with success status
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(sprite_id, {})

    if "frames" not in meta:
        return {"error": "Sprite has no animation frames. Use add_frame first.", "success": False}

    frame_width = meta["frame_width"]
    frame_height = meta["frame_height"]
    total_frames = len(meta["frames"])

    if not (0 <= frame_index < total_frames):
        return {"error": f"Frame index {frame_index} out of range (0-{total_frames - 1})", "success": False}

    frame_x = frame_index * frame_width

    pixels = img.load()
    draw = ImageDraw.Draw(img)

    for cmd in commands:
        cmd_type = cmd.get("type")

        if cmd_type == "fill":
            rgba = parse_color(cmd["color"])
            for py in range(frame_height):
                for px in range(frame_width):
                    pixels[frame_x + px, py] = rgba

        elif cmd_type == "pixel":
            rgba = parse_color(cmd["color"])
            px, py = cmd["x"], cmd["y"]
            if 0 <= px < frame_width and 0 <= py < frame_height:
                pixels[frame_x + px, py] = rgba

        elif cmd_type == "rect":
            rgba = parse_color(cmd["color"])
            filled = cmd.get("filled", True)
            rx, ry, rw, rh = cmd["x"], cmd["y"], cmd["w"], cmd["h"]
            for py in range(max(0, ry), min(frame_height, ry + rh)):
                for px in range(max(0, rx), min(frame_width, rx + rw)):
                    if filled or px == rx or px == rx + rw - 1 or py == ry or py == ry + rh - 1:
                        pixels[frame_x + px, py] = rgba

        elif cmd_type == "line":
            rgba = parse_color(cmd["color"])
            draw.line(
                [(frame_x + cmd["x1"], cmd["y1"]),
                 (frame_x + cmd["x2"], cmd["y2"])],
                fill=rgba
            )

        elif cmd_type == "ellipse":
            rgba = parse_color(cmd["color"])
            filled = cmd.get("filled", True)
            ex, ey, ew, eh = cmd["x"], cmd["y"], cmd["w"], cmd["h"]
            bbox = [frame_x + ex, ey, frame_x + ex + ew - 1, ey + eh - 1]
            if filled:
                draw.ellipse(bbox, fill=rgba)
            else:
                draw.ellipse(bbox, outline=rgba)

    save_sprite(sprite_id, img)

    return {
        "success": True,
        "sprite_id": sprite_id,
        "frame_index": frame_index,
        "commands_executed": len(commands)
    }


async def export_animated(
    sprite_id: str,
    format: str = "gif",
    scale: int = 1,
) -> dict:
    """
    Export an animated sprite as GIF or spritesheet.

    Format options:
    - 'gif': Animated GIF with frame durations
    - 'spritesheet': Horizontal strip PNG with metadata

    Args:
        sprite_id: The animated sprite ID
        format: 'gif' for animated GIF, 'spritesheet' for PNG strip
        scale: Scale factor (1-10)

    Returns:
        dict with base64 image data and animation metadata
    """
    await ensure_workspace()

    img = load_sprite(sprite_id)
    if not img:
        return {"error": f"Sprite '{sprite_id}' not found", "success": False}

    meta = SPRITE_METADATA.get(sprite_id, {})

    if "frames" not in meta:
        return {"error": "Sprite has no animation frames", "success": False}

    frame_width = meta["frame_width"]
    frame_height = meta["frame_height"]
    frames_data = meta["frames"]
    total_frames = len(frames_data)

    if format == "gif":
        # Create animated GIF
        pil_frames = []
        for i in range(total_frames):
            frame_x = i * frame_width
            frame = img.crop((frame_x, 0, frame_x + frame_width, frame_height))
            if scale > 1:
                frame = frame.resize((frame_width * scale, frame_height * scale), Image.NEAREST)
            pil_frames.append(frame)

        output_path = WORKSPACE_DIR / f"{sprite_id}_anim.gif"

        # Get frame durations
        durations = [f.get("duration", 100) for f in frames_data]

        pil_frames[0].save(
            output_path,
            save_all=True,
            append_images=pil_frames[1:],
            duration=durations,
            loop=0
        )

        with open(output_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        output_path.unlink(missing_ok=True)

        return {
            "success": True,
            "sprite_id": sprite_id,
            "format": "gif",
            "scale": scale,
            "data": image_data,
            "mime_type": "image/gif",
            "frames": total_frames,
            "durations": durations
        }

    else:  # spritesheet
        if scale > 1:
            new_size = (img.width * scale, img.height * scale)
            img = img.resize(new_size, Image.NEAREST)

        output_path = WORKSPACE_DIR / f"{sprite_id}_sheet.png"
        img.save(output_path)

        with open(output_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        output_path.unlink(missing_ok=True)

        return {
            "success": True,
            "sprite_id": sprite_id,
            "format": "spritesheet",
            "scale": scale,
            "data": image_data,
            "mime_type": "image/png",
            "metadata": {
                "frameWidth": frame_width * scale,
                "frameHeight": frame_height * scale,
                "frames": total_frames,
                "durations": [f.get("duration", 100) for f in frames_data]
            }
        }


# Tool registry for MCP
TOOLS = {
    # ==========================================================================
    # BASIC SPRITE TOOLS
    # ==========================================================================
    "create_sprite": {
        "function": create_sprite,
        "description": "Create a new pixel art sprite canvas. Use this for general-purpose sprites. For game-specific assets, consider create_tileset or create_prop instead.",
        "parameters": {
            "type": "object",
            "properties": {
                "width": {"type": "integer", "description": "Width in pixels (common sizes: 8, 16, 32, 64)", "default": 32},
                "height": {"type": "integer", "description": "Height in pixels", "default": 32},
                "color_mode": {"type": "string", "enum": ["rgba", "indexed", "grayscale"], "default": "rgba"},
                "background_color": {"type": "string", "description": "Hex color for background (e.g., '#ffffff'). Leave empty for transparent."}
            }
        }
    },
    "export_sprite": {
        "function": export_sprite,
        "description": "Export a sprite to PNG, GIF, or WebP. Returns base64-encoded image data. For tilesets use export_tileset, for props use export_prop, for animations use export_animated.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string", "description": "The sprite ID from create_sprite"},
                "format": {"type": "string", "enum": ["png", "gif", "webp"], "default": "png"},
                "scale": {"type": "integer", "description": "Scale factor 1-10 (use for pixel-perfect upscaling)", "default": 1},
                "sheet": {"type": "boolean", "description": "Export as spritesheet (for animations)", "default": False}
            },
            "required": ["sprite_id"]
        }
    },
    "list_sprites": {
        "function": list_sprites,
        "description": "List all sprites, tilesets, props, and animations in the workspace with their dimensions and metadata.",
        "parameters": {"type": "object", "properties": {}}
    },
    "delete_sprite": {
        "function": delete_sprite,
        "description": "Delete a sprite and all its associated files from the workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string", "description": "The sprite/tileset/prop ID to delete"}
            },
            "required": ["sprite_id"]
        }
    },
    "resize_sprite": {
        "function": resize_sprite,
        "description": "Resize a sprite. Use 'nearest' for pixel-perfect scaling, 'bilinear' for smooth scaling.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "new_width": {"type": "integer"},
                "new_height": {"type": "integer"},
                "method": {"type": "string", "enum": ["nearest", "bilinear"], "default": "nearest", "description": "'nearest' preserves sharp pixels, 'bilinear' smooths edges"}
            },
            "required": ["sprite_id", "new_width", "new_height"]
        }
    },

    # ==========================================================================
    # DRAWING PRIMITIVES - For detailed pixel art
    # ==========================================================================
    "draw_pixel": {
        "function": draw_pixel,
        "description": "Draw a single pixel. Use for fine details, highlights, or building complex shapes one pixel at a time.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer", "description": "X coordinate (0 = left edge)"},
                "y": {"type": "integer", "description": "Y coordinate (0 = top edge)"},
                "color": {"type": "string", "description": "Hex color (e.g., '#ff0000' for red, '#ff000080' for 50% transparent red)"}
            },
            "required": ["sprite_id", "x", "y", "color"]
        }
    },
    "draw_rect": {
        "function": draw_rect,
        "description": "Draw a rectangle. Use for backgrounds, borders, platforms, or as a base shape before adding details.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer", "description": "Top-left X coordinate"},
                "y": {"type": "integer", "description": "Top-left Y coordinate"},
                "width": {"type": "integer"},
                "height": {"type": "integer"},
                "color": {"type": "string", "description": "Hex color"},
                "filled": {"type": "boolean", "default": True, "description": "True for solid fill, False for outline only"}
            },
            "required": ["sprite_id", "x", "y", "width", "height", "color"]
        }
    },
    "draw_line": {
        "function": draw_line,
        "description": "Draw a line between two points. Use for outlines, edges, wood grain, cracks, or directional shading.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x1": {"type": "integer", "description": "Start X"},
                "y1": {"type": "integer", "description": "Start Y"},
                "x2": {"type": "integer", "description": "End X"},
                "y2": {"type": "integer", "description": "End Y"},
                "color": {"type": "string", "description": "Hex color"},
                "thickness": {"type": "integer", "default": 1, "description": "Line width 1-5 pixels"}
            },
            "required": ["sprite_id", "x1", "y1", "x2", "y2", "color"]
        }
    },
    "draw_ellipse": {
        "function": draw_ellipse,
        "description": "Draw an ellipse or circle. Use for coins, buttons, wheels, eyes, boulders, bushes, or any round objects.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer", "description": "Top-left X of bounding box"},
                "y": {"type": "integer", "description": "Top-left Y of bounding box"},
                "width": {"type": "integer", "description": "Ellipse width (equal to height for circle)"},
                "height": {"type": "integer", "description": "Ellipse height"},
                "color": {"type": "string"},
                "filled": {"type": "boolean", "default": True}
            },
            "required": ["sprite_id", "x", "y", "width", "height", "color"]
        }
    },
    "draw_polygon": {
        "function": draw_polygon,
        "description": "Draw a polygon with any number of vertices. Use for triangles, arrows, rooftops, crystals, stars, gems.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "points": {"type": "array", "items": {"type": "array", "items": {"type": "integer"}}, "description": "List of [x, y] pairs, e.g., [[0,10], [5,0], [10,10]] for a triangle"},
                "color": {"type": "string"},
                "filled": {"type": "boolean", "default": True}
            },
            "required": ["sprite_id", "points", "color"]
        }
    },
    "flood_fill": {
        "function": flood_fill,
        "description": "Fill a contiguous area with color (paint bucket tool). Use after drawing outlines to fill enclosed shapes.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer", "description": "Starting X for fill"},
                "y": {"type": "integer", "description": "Starting Y for fill"},
                "color": {"type": "string", "description": "Color to fill with"},
                "tolerance": {"type": "integer", "default": 0, "description": "Color matching tolerance 0-255 (higher = more colors match)"}
            },
            "required": ["sprite_id", "x", "y", "color"]
        }
    },
    "draw_pattern": {
        "function": draw_pattern,
        "description": "Draw repeating patterns for textures. ESSENTIAL for detailed tiles. Patterns: checkerboard (floors), stripes_h/stripes_v (wood, fabric), stripes_d (diagonal), dots (decorative), grid (tiles, windows), brick (walls), noise (gravel, dirt).",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer"},
                "y": {"type": "integer"},
                "width": {"type": "integer"},
                "height": {"type": "integer"},
                "pattern": {"type": "string", "enum": ["checkerboard", "stripes_h", "stripes_v", "stripes_d", "dots", "grid", "brick", "noise"], "description": "Pattern type"},
                "color1": {"type": "string", "description": "Primary color"},
                "color2": {"type": "string", "description": "Secondary color"},
                "scale": {"type": "integer", "default": 1, "description": "Pattern scale 1-8 (larger = bigger pattern units)"}
            },
            "required": ["sprite_id", "x", "y", "width", "height", "pattern", "color1", "color2"]
        }
    },
    "apply_dither": {
        "function": apply_dither,
        "description": "Apply dithering for smooth gradients in pixel art style. Use for sky gradients, surface shading, terrain transitions, metallic effects.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "x": {"type": "integer"},
                "y": {"type": "integer"},
                "width": {"type": "integer"},
                "height": {"type": "integer"},
                "color1": {"type": "string", "description": "Starting color"},
                "color2": {"type": "string", "description": "Ending color"},
                "gradient_direction": {"type": "string", "enum": ["vertical", "horizontal", "radial"], "default": "vertical"}
            },
            "required": ["sprite_id", "x", "y", "width", "height", "color1", "color2"]
        }
    },

    # ==========================================================================
    # TILESET TOOLS - For game maps
    # ==========================================================================
    "create_tileset": {
        "function": create_tileset,
        "description": "Create a tileset grid for game maps (LDtk, Tiled, Phaser). Tilesets contain multiple tiles in a grid. Common configs: 8x4 (32 tiles), 16x16 (256 tiles), 4x4 (16 auto-tiles).",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Descriptive name (e.g., 'forest_terrain', 'dungeon_walls')"},
                "columns": {"type": "integer", "description": "Number of tile columns"},
                "rows": {"type": "integer", "description": "Number of tile rows"},
                "tile_size": {"type": "integer", "default": 16, "description": "Tile size in pixels (common: 8, 16, 32)"},
                "spacing": {"type": "integer", "default": 0, "description": "Pixels between tiles"},
                "margin": {"type": "integer", "default": 0, "description": "Pixels around entire tileset"},
                "background_color": {"type": "string", "description": "Background color (empty for transparent)"}
            },
            "required": ["name", "columns", "rows"]
        }
    },
    "draw_on_tile": {
        "function": draw_on_tile,
        "description": "Draw on a specific tile in a tileset using batch commands. Coordinates relative to tile (0,0 = tile's top-left). Commands: fill, pixel, rect, line, ellipse, pattern. Example for grass: [{\"type\": \"fill\", \"color\": \"#4a7c23\"}, {\"type\": \"pattern\", \"pattern\": \"noise\", \"color1\": \"#4a7c23\", \"color2\": \"#3d6b1c\", \"scale\": 1}]",
        "parameters": {
            "type": "object",
            "properties": {
                "tileset_id": {"type": "string"},
                "tile_index": {"type": "integer", "description": "Tile index 0-based (left-to-right, top-to-bottom)"},
                "commands": {"type": "array", "items": {"type": "object"}, "description": "Drawing commands: {type, color, x, y, w, h, pattern, ...}"}
            },
            "required": ["tileset_id", "tile_index", "commands"]
        }
    },
    "copy_tile": {
        "function": copy_tile,
        "description": "Copy a tile to another position in the tileset. Use to create variations of existing tiles.",
        "parameters": {
            "type": "object",
            "properties": {
                "tileset_id": {"type": "string"},
                "source_index": {"type": "integer", "description": "Tile to copy from"},
                "target_index": {"type": "integer", "description": "Tile to copy to"}
            },
            "required": ["tileset_id", "source_index", "target_index"]
        }
    },
    "export_tileset": {
        "function": export_tileset,
        "description": "Export tileset with metadata for LDtk/Tiled/Phaser. Returns base64 image + JSON metadata (tileWidth, tileHeight, columns, rows, spacing, margin).",
        "parameters": {
            "type": "object",
            "properties": {
                "tileset_id": {"type": "string"},
                "format": {"type": "string", "enum": ["png", "gif", "webp"], "default": "png"},
                "scale": {"type": "integer", "default": 1},
                "include_metadata": {"type": "boolean", "default": True, "description": "Include JSON metadata for game engines"}
            },
            "required": ["tileset_id"]
        }
    },

    # ==========================================================================
    # PROP TOOLS - For game objects/items
    # ==========================================================================
    "create_prop": {
        "function": create_prop,
        "description": "Create a game prop/object with standard sizes. Size presets: tiny (8x8), small (16x16), medium (32x32), tall (16x32), wide (32x16), large (48x48), xlarge (64x64). Categories: character, item, furniture, decoration, interactive, effect, ui, nature, building.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Prop name (e.g., 'health_potion', 'oak_tree', 'treasure_chest')"},
                "size_preset": {"type": "string", "enum": ["tiny", "small", "medium", "tall", "wide", "large", "xlarge"], "default": "small"},
                "category": {"type": "string", "enum": ["character", "item", "furniture", "decoration", "interactive", "effect", "ui", "nature", "building"], "default": "item"},
                "custom_width": {"type": "integer", "description": "Override preset width"},
                "custom_height": {"type": "integer", "description": "Override preset height"},
                "background_color": {"type": "string", "description": "Background (empty for transparent)"}
            },
            "required": ["name"]
        }
    },
    "export_prop": {
        "function": export_prop,
        "description": "Export prop with optional hitbox metadata for collision detection.",
        "parameters": {
            "type": "object",
            "properties": {
                "prop_id": {"type": "string"},
                "format": {"type": "string", "enum": ["png", "gif", "webp"], "default": "png"},
                "scale": {"type": "integer", "default": 1},
                "include_hitbox": {"type": "boolean", "default": False, "description": "Include collision hitbox in metadata"},
                "hitbox": {"type": "object", "description": "Custom hitbox {x, y, width, height} if different from sprite bounds"}
            },
            "required": ["prop_id"]
        }
    },

    # ==========================================================================
    # ANIMATION TOOLS
    # ==========================================================================
    "add_frame": {
        "function": add_frame,
        "description": "Add animation frame to a sprite. First call initializes animation. Frames stored as horizontal strip.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "frame_duration": {"type": "integer", "default": 100, "description": "Frame duration in ms (100 = 10fps, 50 = 20fps)"},
                "copy_from_frame": {"type": "integer", "description": "Copy existing frame as starting point"}
            },
            "required": ["sprite_id"]
        }
    },
    "draw_on_frame": {
        "function": draw_on_frame,
        "description": "Draw on specific animation frame. Same commands as draw_on_tile: fill, pixel, rect, line, ellipse.",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "frame_index": {"type": "integer", "description": "Frame to draw on (0-based)"},
                "commands": {"type": "array", "items": {"type": "object"}, "description": "Drawing commands"}
            },
            "required": ["sprite_id", "frame_index", "commands"]
        }
    },
    "export_animated": {
        "function": export_animated,
        "description": "Export animation as GIF (animated) or spritesheet (horizontal PNG strip with frame metadata).",
        "parameters": {
            "type": "object",
            "properties": {
                "sprite_id": {"type": "string"},
                "format": {"type": "string", "enum": ["gif", "spritesheet"], "default": "gif"},
                "scale": {"type": "integer", "default": 1}
            },
            "required": ["sprite_id"]
        }
    }
}
