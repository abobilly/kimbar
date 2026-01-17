#!/usr/bin/env python3
"""
Batch tile generator for pixel-mcp (Railway SSE endpoint).

Supports generation modes:
1. AI: Uses HuggingFace FLUX model with auto-downsampling, palette quantization, and seamless
2. PROCEDURAL: Uses generate_procedural_sprite for symmetrical sprites
3. HYBRID: AI base + procedural polish via drawing primitives

Usage:
    python scripts/generate-tiles-batch.py --priority P0 --mode ai
    python scripts/generate-tiles-batch.py --tile "tile.floor.marble" --mode hybrid
"""

import asyncio
import argparse
import json
import base64
import sys
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    os.system(f"{sys.executable} -m pip install httpx")
    import httpx

# =============================================================================
# Configuration
# =============================================================================

SERVER_URL = os.environ.get("PIXEL_MCP_URL", "https://pixel-mcp-server-production.up.railway.app")
SSE_ENDPOINT = f"{SERVER_URL}/sse"
OUTPUT_DIR = Path("generated/tiles")
TIMEOUT_SECONDS = 180  # AI generation needs more time

class GenerationMode(Enum):
    AI = "ai"                  # HuggingFace FLUX generation
    PROCEDURAL = "procedural"  # Symmetric procedural generation
    HYBRID = "hybrid"          # AI base + procedural polish

@dataclass
class TileSpec:
    id: str
    category: str
    subcategory: str
    palette: List[str]
    description: str
    autotile: bool = False
    variants: int = 0
    priority: str = "P0"
    rooms: List[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TileSpec":
        return cls(
            id=d["id"],
            category=d["category"],
            subcategory=d.get("subcategory", ""),
            palette=d.get("palette", []),
            description=d.get("description", ""),
            autotile=d.get("autotile", False),
            variants=d.get("variants", 0),
            priority=d.get("priority", "P0"),
            rooms=d.get("rooms", [])
        )
    
    def to_prompt(self) -> str:
        """Generate a HuggingFace prompt from the tile spec."""
        base = f"32x32 pixel art tile, top-down view, {self.description}"
        
        # Add category hints
        if self.category == "floor":
            base += ", seamless texture, floor tile pattern"
        elif self.category == "wall":
            base += ", wall cap with shadow, architectural"
        elif self.category == "trim":
            base += ", border trim, decorative molding"
        elif self.category == "object":
            base += ", game prop, clear silhouette, small shadow"
        elif self.category == "decal":
            base += ", flat sign or decal, simple icon"
        elif self.category == "ground":
            base += ", outdoor ground texture, natural"
        elif self.category == "rug":
            base += ", fabric texture, carpet pattern"
        
        # Style suffix
        base += ", LPC style, clean pixel art, no dithering, cluster shading"
        
        return base

# =============================================================================
# MCP Session Manager - AI Generation Mode
# =============================================================================

async def process_tiles_ai(tiles: List[Dict], output_dir: Path):
    """Process tiles using generate_pixel_art (HuggingFace FLUX)."""
    
    print(f"Connecting to {SSE_ENDPOINT}...")
    print("Mode: AI (HuggingFace FLUX with auto-downsample + palette quantization)")
    timeout = httpx.Timeout(TIMEOUT_SECONDS, read=None)
    
    results = {"success": 0, "failed": 0}
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", SSE_ENDPOINT) as response:
            print("Connected to stream.")
            
            session_id = None
            current_tile_idx = 0
            current_msg_id = 0
            current_tile = None
            sprite_id = None
            generation_step = None  # "generate", "export"
            
            async for line in response.aiter_lines():
                if not line or line.startswith("event:"):
                    continue
                    
                if line.startswith("data:"):
                    data = line[5:].strip()
                    
                    # Handle session ID
                    if "?session_id=" in data and not session_id:
                        session_id = data.split("=")[1].strip().strip('"').strip('}')
                        print(f"Session ID: {session_id}")
                        await asyncio.sleep(1)
                        
                        # Start first tile with generate_pixel_art
                        if tiles:
                            current_tile = TileSpec.from_dict(tiles[0])
                            print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                            print(f"  Prompt: {current_tile.to_prompt()[:80]}...")
                            current_msg_id += 1
                            generation_step = "generate"
                            await _send_generate_pixel_art(client, session_id, current_msg_id, current_tile)
                        continue
                    
                    # Handle JSON responses
                    if data.startswith("{"):
                        try:
                            msg = json.loads(data)
                            if "--debug" in sys.argv:
                                print(f"  [DEBUG] Response: {json.dumps(msg)[:500]}...")
                            msg_id = msg.get("id")
                            
                            if msg_id == current_msg_id:
                                if generation_step == "generate":
                                    # Extract sprite_id from generate_pixel_art
                                    sprite_id = _extract_sprite_id(msg)
                                    error = _extract_error(msg)
                                    
                                    if error:
                                        print(f"  -> ERROR: {error}")
                                        results["failed"] += 1
                                    elif sprite_id:
                                        # Move to export step
                                        current_msg_id += 1
                                        generation_step = "export"
                                        await _send_export(client, session_id, current_msg_id, sprite_id)
                                        continue
                                    else:
                                        print(f"  -> ERROR: No sprite_id")
                                        results["failed"] += 1
                                    
                                    # Move to next tile (on error)
                                    current_tile_idx += 1
                                    if current_tile_idx < len(tiles):
                                        current_tile = TileSpec.from_dict(tiles[current_tile_idx])
                                        print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                                        print(f"  Prompt: {current_tile.to_prompt()[:80]}...")
                                        current_msg_id += 1
                                        generation_step = "generate"
                                        await _send_generate_pixel_art(client, session_id, current_msg_id, current_tile)
                                    else:
                                        break
                                        
                                elif generation_step == "export":
                                    # Extract PNG and save
                                    png_data = _extract_png_data(msg)
                                    if png_data:
                                        out_path = output_dir / f"{current_tile.id}.png"
                                        out_path.write_bytes(png_data)
                                        print(f"  -> {out_path} ({len(png_data)} bytes)")
                                        results["success"] += 1
                                    else:
                                        print(f"  -> ERROR: No PNG data")
                                        results["failed"] += 1
                                    
                                    # Move to next tile
                                    current_tile_idx += 1
                                    if current_tile_idx < len(tiles):
                                        current_tile = TileSpec.from_dict(tiles[current_tile_idx])
                                        print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                                        print(f"  Prompt: {current_tile.to_prompt()[:80]}...")
                                        current_msg_id += 1
                                        generation_step = "generate"
                                        await _send_generate_pixel_art(client, session_id, current_msg_id, current_tile)
                                    else:
                                        break
                                        
                        except json.JSONDecodeError:
                            pass
    
    return results

async def _send_generate_pixel_art(client: httpx.AsyncClient, session_id: str, msg_id: int, spec: TileSpec):
    """Send generate_pixel_art command (HuggingFace FLUX)."""
    url = f"{SERVER_URL}/message?session_id={session_id}"
    
    # Build arguments
    args = {
        "prompt": spec.to_prompt(),
        "target_width": 32,
        "target_height": 32,
        "model": "black-forest-labs/FLUX.1-dev",
        "remove_bg": spec.category in ["object", "decal"],  # Remove bg for objects
        "seamless": spec.autotile or spec.category in ["floor", "ground", "rug", "wall"],
    }
    
    # Add palette if specified
    if spec.palette:
        args["palette"] = spec.palette
    
    payload = {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": "tools/call",
        "params": {
            "name": "generate_pixel_art",
            "arguments": args
        }
    }
    await client.post(url, json=payload)

async def _send_export(client: httpx.AsyncClient, session_id: str, msg_id: int, sprite_id: str):
    """Send export_sprite command."""
    url = f"{SERVER_URL}/message?session_id={session_id}"
    payload = {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": "tools/call",
        "params": {
            "name": "export_sprite",
            "arguments": {"sprite_id": sprite_id, "format": "png"}
        }
    }
    await client.post(url, json=payload)

def _extract_sprite_id(msg: Dict) -> Optional[str]:
    """Extract sprite_id from response."""
    try:
        content = msg.get("result", {}).get("content", [])
        for item in content:
            if item.get("type") == "text":
                inner = json.loads(item["text"])
                return inner.get("sprite_id")
    except:
        pass
    return None

def _extract_error(msg: Dict) -> Optional[str]:
    """Extract error message from response."""
    try:
        # Check top-level error
        if "error" in msg:
            return str(msg["error"])
        # Check in result content
        content = msg.get("result", {}).get("content", [])
        for item in content:
            if item.get("type") == "text":
                inner = json.loads(item["text"])
                if inner.get("success") == False:
                    return inner.get("error", "Unknown error")
    except:
        pass
    return None

def _extract_png_data(msg: Dict) -> Optional[bytes]:
    """Extract PNG base64 data from export_sprite response."""
    try:
        content = msg.get("result", {}).get("content", [])
        for item in content:
            if item.get("type") == "text":
                inner = json.loads(item["text"])
                if "data" in inner:
                    return base64.b64decode(inner["data"])
    except:
        pass
    return None

# =============================================================================
# MCP Session Manager - Procedural Mode (simple shapes)
# =============================================================================

async def process_tiles_procedural(tiles: List[Dict], output_dir: Path):
    """Process tiles using basic drawing primitives (fast placeholder mode)."""
    
    print(f"Connecting to {SSE_ENDPOINT}...")
    print("Mode: PROCEDURAL (placeholder shapes)")
    timeout = httpx.Timeout(60.0, read=None)
    
    results = {"success": 0, "failed": 0}
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", SSE_ENDPOINT) as response:
            print("Connected to stream.")
            
            session_id = None
            current_tile_idx = 0
            current_msg_id = 0
            current_tile = None
            sprite_id = None
            generation_step = None
            
            async for line in response.aiter_lines():
                if not line or line.startswith("event:"):
                    continue
                    
                if line.startswith("data:"):
                    data = line[5:].strip()
                    
                    if "?session_id=" in data and not session_id:
                        session_id = data.split("=")[1].strip().strip('"').strip('}')
                        print(f"Session ID: {session_id}")
                        await asyncio.sleep(1)
                        
                        if tiles:
                            current_tile = TileSpec.from_dict(tiles[0])
                            print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                            current_msg_id += 1
                            generation_step = "create"
                            await _send_create_sprite(client, session_id, current_msg_id)
                        continue
                    
                    if data.startswith("{"):
                        try:
                            msg = json.loads(data)
                            msg_id = msg.get("id")
                            
                            # Debug: print all responses
                            if os.environ.get("DEBUG"):
                                print(f"  [DEBUG] msg_id={msg_id} step={generation_step} data={str(msg)[:200]}")
                            
                            if msg_id == current_msg_id:
                                if generation_step == "create":
                                    sprite_id = _extract_sprite_id(msg)
                                    print(f"  Created sprite: {sprite_id}")
                                    if sprite_id:
                                        current_msg_id += 1
                                        generation_step = "fill"
                                        bg_color = current_tile.palette[-1] if current_tile.palette else "#808080"
                                        await _send_fill(client, session_id, current_msg_id, sprite_id, bg_color)
                                    else:
                                        results["failed"] += 1
                                        current_tile_idx += 1
                                        if current_tile_idx < len(tiles):
                                            current_tile = TileSpec.from_dict(tiles[current_tile_idx])
                                            print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                                            current_msg_id += 1
                                            generation_step = "create"
                                            await _send_create_sprite(client, session_id, current_msg_id)
                                        else:
                                            break
                                            
                                elif generation_step == "fill":
                                    current_msg_id += 1
                                    generation_step = "draw"
                                    await _send_draw_details(client, session_id, current_msg_id, sprite_id, current_tile)
                                    
                                elif generation_step == "draw":
                                    current_msg_id += 1
                                    generation_step = "export"
                                    await _send_export(client, session_id, current_msg_id, sprite_id)
                                    
                                elif generation_step == "export":
                                    png_data = _extract_png_data(msg)
                                    if png_data:
                                        out_path = output_dir / f"{current_tile.id}.png"
                                        out_path.write_bytes(png_data)
                                        print(f"  -> {out_path} ({len(png_data)} bytes)")
                                        results["success"] += 1
                                    else:
                                        print(f"  -> ERROR: No PNG data")
                                        results["failed"] += 1
                                    
                                    current_tile_idx += 1
                                    if current_tile_idx < len(tiles):
                                        current_tile = TileSpec.from_dict(tiles[current_tile_idx])
                                        print(f"\n[{current_tile_idx + 1}/{len(tiles)}] {current_tile.id}")
                                        current_msg_id += 1
                                        generation_step = "create"
                                        await _send_create_sprite(client, session_id, current_msg_id)
                                    else:
                                        break
                                        
                        except json.JSONDecodeError:
                            pass
    
    return results

async def _send_create_sprite(client: httpx.AsyncClient, session_id: str, msg_id: int):
    """Send create_sprite command."""
    url = f"{SERVER_URL}/message?session_id={session_id}"
    payload = {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": "tools/call",
        "params": {
            "name": "create_sprite",
            "arguments": {"width": 32, "height": 32, "color_mode": "rgba"}
        }
    }
    await client.post(url, json=payload)

async def _send_fill(client: httpx.AsyncClient, session_id: str, msg_id: int, sprite_id: str, color: str):
    """Send draw_rect for background fill."""
    url = f"{SERVER_URL}/message?session_id={session_id}"
    payload = {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": "tools/call",
        "params": {
            "name": "draw_rect",
            "arguments": {
                "sprite_id": sprite_id,
                "x": 0, "y": 0,
                "width": 32, "height": 32,
                "color": color,
                "filled": True
            }
        }
    }
    await client.post(url, json=payload)

async def _send_draw_details(client: httpx.AsyncClient, session_id: str, msg_id: int, sprite_id: str, spec: TileSpec):
    """Send category-specific drawing commands using draw_pattern for textures."""
    url = f"{SERVER_URL}/message?session_id={session_id}"
    
    # Get colors from palette
    c1 = spec.palette[0] if spec.palette else "#FFFFFF"
    c2 = spec.palette[1] if len(spec.palette) > 1 else _darken(c1)
    c3 = spec.palette[2] if len(spec.palette) > 2 else _lighten(c1)
    
    # Choose pattern and params based on category and tile ID
    tile_id = spec.id.lower()
    
    if spec.category == "floor":
        if "marble" in tile_id:
            # Marble: subtle noise pattern
            pattern, scale = "noise", 1
        elif "wood" in tile_id:
            # Wood: horizontal stripes
            pattern, scale = "stripes_h", 2
        elif "tile" in tile_id or "cafeteria" in tile_id:
            # Checkerboard for cafeteria/generic tile
            pattern, scale = "checkerboard", 4
        elif "mosaic" in tile_id:
            pattern, scale = "checkerboard", 2
        elif "carpet" in tile_id:
            pattern, scale = "noise", 2
        elif "stone" in tile_id or "vault" in tile_id:
            pattern, scale = "brick", 4
        else:
            pattern, scale = "noise", 1
        
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": pattern,
                    "color1": c1, "color2": c2,
                    "scale": scale
                }
            }
        }
        
    elif spec.category == "ground":
        if "grass" in tile_id:
            pattern, scale = "noise", 1
        elif "sidewalk" in tile_id or "stone" in tile_id:
            pattern, scale = "grid", 8
        elif "asphalt" in tile_id or "driveway" in tile_id:
            pattern, scale = "noise", 2
        else:
            pattern, scale = "noise", 1
            
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": pattern,
                    "color1": c1, "color2": c2,
                    "scale": scale
                }
            }
        }
        
    elif spec.category == "wall":
        if "brick" in tile_id or "reinforced" in tile_id:
            pattern, scale = "brick", 4
        elif "wood" in tile_id or "panel" in tile_id:
            pattern, scale = "stripes_v", 4
        else:
            pattern, scale = "brick", 4
            
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": pattern,
                    "color1": c1, "color2": c2,
                    "scale": scale
                }
            }
        }
        
    elif spec.category == "trim":
        # Trim: horizontal stripe with highlight on top
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": "stripes_h",
                    "color1": c1, "color2": c2,
                    "scale": 8
                }
            }
        }
        
    elif spec.category == "rug":
        if "runner" in tile_id:
            pattern, scale = "stripes_h", 4
        else:
            pattern, scale = "grid", 4
            
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": pattern,
                    "color1": c1, "color2": c2,
                    "scale": scale
                }
            }
        }
        
    elif spec.category == "steps":
        # Steps: horizontal stripes to show step edges
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": "stripes_h",
                    "color1": c1, "color2": c2,
                    "scale": 8
                }
            }
        }
        
    elif spec.category == "column":
        # Columns: vertical stripes with lighter center
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": "stripes_v",
                    "color1": c1, "color2": c3,
                    "scale": 4
                }
            }
        }
        
    elif spec.category == "door":
        # Doors: solid with grid pattern for panels
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 4, "y": 4, "width": 24, "height": 24,
                    "pattern": "grid",
                    "color1": c1, "color2": c2,
                    "scale": 6
                }
            }
        }
        
    elif spec.category in ["object", "decal"]:
        # Objects/decals: centered shape with visible silhouette
        if "bench" in tile_id or "table" in tile_id or "desk" in tile_id:
            # Furniture: horizontal oriented rectangle
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_rect",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 2, "y": 8, "width": 28, "height": 16,
                        "color": c1, "filled": True
                    }
                }
            }
        elif "chair" in tile_id:
            # Chair: small square
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_rect",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 8, "y": 8, "width": 16, "height": 16,
                        "color": c1, "filled": True
                    }
                }
            }
        elif "column" in tile_id or "pillar" in tile_id:
            # Column cross-section: ellipse
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_ellipse",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 4, "y": 4, "width": 24, "height": 24,
                        "color": c1, "filled": True
                    }
                }
            }
        elif "plant" in tile_id or "shrub" in tile_id or "tree" in tile_id:
            # Vegetation: green ellipse
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_ellipse",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 4, "y": 4, "width": 24, "height": 24,
                        "color": c1, "filled": True
                    }
                }
            }
        elif "sign" in tile_id or "plaque" in tile_id:
            # Signs: small rectangle
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_rect",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 6, "y": 10, "width": 20, "height": 12,
                        "color": c1, "filled": True
                    }
                }
            }
        elif "shelf" in tile_id or "bookcase" in tile_id or "locker" in tile_id:
            # Shelving: grid pattern
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_pattern",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 2, "y": 2, "width": 28, "height": 28,
                        "pattern": "grid",
                        "color1": c1, "color2": c2,
                        "scale": 4
                    }
                }
            }
        else:
            # Default object: centered rectangle
            payload = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "method": "tools/call",
                "params": {
                    "name": "draw_rect",
                    "arguments": {
                        "sprite_id": sprite_id,
                        "x": 6, "y": 6, "width": 20, "height": 20,
                        "color": c1, "filled": True
                    }
                }
            }
    else:
        # Fallback: noise pattern
        payload = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": "draw_pattern",
                "arguments": {
                    "sprite_id": sprite_id,
                    "x": 0, "y": 0, "width": 32, "height": 32,
                    "pattern": "noise",
                    "color1": c1, "color2": c2,
                    "scale": 1
                }
            }
        }
    
    await client.post(url, json=payload)


def _darken(hex_color: str, factor: float = 0.7) -> str:
    """Darken a hex color."""
    hex_color = hex_color.lstrip("#")
    r = int(int(hex_color[0:2], 16) * factor)
    g = int(int(hex_color[2:4], 16) * factor)
    b = int(int(hex_color[4:6], 16) * factor)
    return f"#{r:02x}{g:02x}{b:02x}"


def _lighten(hex_color: str, factor: float = 1.3) -> str:
    """Lighten a hex color."""
    hex_color = hex_color.lstrip("#")
    r = min(255, int(int(hex_color[0:2], 16) * factor))
    g = min(255, int(int(hex_color[2:4], 16) * factor))
    b = min(255, int(int(hex_color[4:6], 16) * factor))
    return f"#{r:02x}{g:02x}{b:02x}"

# =============================================================================
# Batch Processing
# =============================================================================

async def process_batch(
    manifest_path: str,
    priority_filter: Optional[str] = None,
    tile_filter: Optional[str] = None,
    mode: GenerationMode = GenerationMode.AI,
    output_dir: Path = OUTPUT_DIR,
    dry_run: bool = False
):
    """Process a batch of tiles from manifest."""
    
    # Load manifest
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
    
    tiles = manifest.get("tiles", [])
    
    # Filter tiles
    if priority_filter:
        tiles = [t for t in tiles if t.get("priority") == priority_filter]
    if tile_filter:
        tiles = [t for t in tiles if tile_filter in t.get("id", "")]
    
    print(f"\nTiles to generate: {len(tiles)}")
    print(f"Output: {output_dir}")
    
    if dry_run:
        for t in tiles:
            spec = TileSpec.from_dict(t)
            print(f"  - {t['id']} ({t.get('priority', 'P0')})")
            print(f"    Prompt: {spec.to_prompt()[:60]}...")
        return
    
    # Ensure output dir exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Select processing function based on mode
    if mode == GenerationMode.AI:
        results = await process_tiles_ai(tiles, output_dir)
    elif mode == GenerationMode.PROCEDURAL:
        results = await process_tiles_procedural(tiles, output_dir)
    elif mode == GenerationMode.HYBRID:
        # AI first, then refine with procedural
        print("HYBRID mode: AI generation -> procedural polish")
        results = await process_tiles_ai(tiles, output_dir)
        # TODO: Add procedural refinement pass
    else:
        results = await process_tiles_ai(tiles, output_dir)
    
    print(f"\n{'='*40}")
    print(f"Complete: {results['success']} succeeded, {results['failed']} failed")

# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Batch tile generator for pixel-mcp")
    parser.add_argument("--manifest", "-m", default="content/ai_jobs/tileset_manifest.json",
                        help="Path to tileset manifest JSON")
    parser.add_argument("--priority", "-p", help="Filter by priority (P0, P1, etc.)")
    parser.add_argument("--tile", "-t", help="Filter by tile ID substring")
    parser.add_argument("--mode", choices=["ai", "procedural", "hybrid"],
                        default="ai", help="Generation mode (default: ai)")
    parser.add_argument("--output", "-o", default="generated/tiles",
                        help="Output directory for generated PNGs")
    parser.add_argument("--dry-run", "-n", action="store_true",
                        help="List tiles without generating")
    parser.add_argument("--debug", "-d", action="store_true",
                        help="Show verbose debug output")
    
    args = parser.parse_args()
    
    # Store debug flag globally
    global DEBUG_MODE
    DEBUG_MODE = args.debug
    
    mode = GenerationMode(args.mode)
    output_dir = Path(args.output)
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(process_batch(
        manifest_path=args.manifest,
        priority_filter=args.priority,
        tile_filter=args.tile,
        mode=mode,
        output_dir=output_dir,
        dry_run=args.dry_run
    ))

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
