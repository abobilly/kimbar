#!/usr/bin/env python3
"""
LPC Character Builder - Dual Mode Tool

Usage:
  CLI Mode (for AI agents):
    python lpc-builder.py --config config.json --output character.png
    python lpc-builder.py --list-options
    python lpc-builder.py --random --output random_character.png
    
  UI Mode (launches web server):
    python lpc-builder.py --ui
    
  Batch Mode:
    python lpc-builder.py --batch batch.json --output-dir ./characters/
"""

import os
import sys
import json
import argparse
import random
import base64
import io
from pathlib import Path
from PIL import Image

# Constants
SCRIPT_DIR = Path(__file__).parent
ULPC_DIR = SCRIPT_DIR.parent.parent / "vendor" / "lpc" / "Universal-LPC-Spritesheet-Character-Generator"
SHEET_DEFS_DIR = ULPC_DIR / "sheet_definitions"
SPRITESHEETS_DIR = ULPC_DIR / "spritesheets"

# LPC sheet dimensions
FRAME_WIDTH = 64
FRAME_HEIGHT = 64
SHEET_COLS = 13
SHEET_ROWS = 21
SHEET_WIDTH = FRAME_WIDTH * SHEET_COLS   # 832
SHEET_HEIGHT = FRAME_HEIGHT * SHEET_ROWS  # 1344


# Cache for definitions
_definitions_cache = None


def load_sheet_definitions() -> dict:
    """Load all sheet definition JSON files (cached)"""
    global _definitions_cache
    if _definitions_cache is not None:
        return _definitions_cache
        
    defs = {}
    if not SHEET_DEFS_DIR.exists():
        print(f"Warning: Sheet definitions not found at {SHEET_DEFS_DIR}")
        return defs
        
    for json_file in sorted(SHEET_DEFS_DIR.glob("*.json")):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                defs[json_file.stem] = data
        except Exception as e:
            print(f"Warning: Could not load {json_file}: {e}")
    
    _definitions_cache = defs
    return defs


def get_z_pos(definition: dict) -> int:
    """Extract z-position from sheet definition"""
    layer = definition.get("layer_1", {})
    return layer.get("zPos", 50)


def get_body_path(definition: dict, body_type: str) -> str | None:
    """Get the path for a body type from definition"""
    layer = definition.get("layer_1", {})
    
    # Direct match
    if body_type in layer:
        return layer[body_type]
    
    # Fallback mappings
    fallbacks = {
        "muscular": "male",
        "teen": "male", 
        "pregnant": "female",
        "child": "male",
    }
    if body_type in fallbacks and fallbacks[body_type] in layer:
        return layer[fallbacks[body_type]]
    
    # Use first available (skip zPos)
    for key, value in layer.items():
        if key != "zPos" and isinstance(value, str):
            return value
    
    return None


def get_available_options() -> dict:
    """Get all available options organized by category"""
    options = {
        "body_types": ["male", "female", "muscular", "teen", "child"],
        "body": {"skin_colors": []},
        "eyes": {"colors": []},
        "hair": {},  # style -> colors
        "beard": {}, # style -> colors  
        "clothing": {
            "torso": {},   # item_name -> colors
            "legs": {},
            "feet": {},
        },
        "accessories": {
            "head": {},
            "belt": {},
            "cape": {},
        }
    }
    
    defs = load_sheet_definitions()
    
    for name, data in defs.items():
        variants = data.get("variants", [])
        
        # Body skin colors
        if name == "body":
            options["body"]["skin_colors"] = variants
        
        # Eyes
        elif name == "eyes":
            options["eyes"]["colors"] = variants
            
        # Hair styles
        elif name.startswith("hair_"):
            style = name.replace("hair_", "")
            options["hair"][style] = variants
            
        # Beards
        elif name.startswith("beards_"):
            style = name.replace("beards_", "")
            options["beard"][style] = variants
            
        # Torso clothing
        elif name.startswith("torso_"):
            options["clothing"]["torso"][name] = variants
            
        # Legs
        elif name.startswith("legs_"):
            options["clothing"]["legs"][name] = variants
            
        # Feet
        elif name.startswith("feet_"):
            options["clothing"]["feet"][name] = variants
            
        # Head items
        elif name.startswith("head_"):
            options["accessories"]["head"][name] = variants
            
        # Belts
        elif name.startswith("belt_"):
            options["accessories"]["belt"][name] = variants
            
        # Capes
        elif name.startswith("cape_"):
            options["accessories"]["cape"][name] = variants
    
    return options


def find_spritesheet(sheet_name: str, body_type: str, variant: str) -> Path | None:
    """Find the spritesheet PNG file for a given sheet/body/variant combination"""
    defs = load_sheet_definitions()
    
    if sheet_name not in defs:
        return None
        
    definition = defs[sheet_name]
    base_path = get_body_path(definition, body_type)
    
    if not base_path:
        return None
    
    # Normalize variant name
    variant_normalized = variant.lower().replace(" ", "_")
    
    # Try normalized name (space -> underscore)
    sheet_path = SPRITESHEETS_DIR / base_path / f"{variant_normalized}.png"
    if sheet_path.exists():
        return sheet_path
    
    # Try with original spaces
    sheet_path = SPRITESHEETS_DIR / base_path / f"{variant}.png"
    if sheet_path.exists():
        return sheet_path
    
    # Try removing all spaces/underscores
    variant_no_spaces = variant.lower().replace(" ", "").replace("_", "")
    sheet_path = SPRITESHEETS_DIR / base_path / f"{variant_no_spaces}.png"
    if sheet_path.exists():
        return sheet_path
        
    return None


def composite_character(config: dict, verbose: bool = True) -> Image.Image:
    """Composite all layers into a single character spritesheet"""
    result = Image.new("RGBA", (SHEET_WIDTH, SHEET_HEIGHT), (0, 0, 0, 0))
    
    defs = load_sheet_definitions()
    body_type = config.get("body_type", "male")
    layers_to_composite = []
    
    # 1. Body (required)
    skin_color = config.get("skin_color", "light")
    body_sheet = find_spritesheet("body", body_type, skin_color)
    if body_sheet:
        layers_to_composite.append(("body", body_sheet, 10))
    elif verbose:
        print(f"  ! Body not found: body/{body_type}/{skin_color}")
    
    # 2. Eyes
    if config.get("eye_color"):
        eye_sheet = find_spritesheet("eyes", body_type, config["eye_color"])
        if eye_sheet:
            z = get_z_pos(defs.get("eyes", {}))
            layers_to_composite.append(("eyes", eye_sheet, z))
    
    # 3. Hair
    hair_style = config.get("hair_style")
    hair_color = config.get("hair_color", "brown")
    if hair_style:
        hair_def_name = f"hair_{hair_style}"
        hair_sheet = find_spritesheet(hair_def_name, body_type, hair_color)
        if hair_sheet:
            z = get_z_pos(defs.get(hair_def_name, {}))
            layers_to_composite.append(("hair", hair_sheet, z))
        elif verbose:
            print(f"  ! Hair not found: {hair_def_name}/{body_type}/{hair_color}")
    
    # 4. Beard
    beard_style = config.get("beard_style")
    beard_color = config.get("beard_color", hair_color)
    if beard_style:
        beard_def_name = f"beards_{beard_style}"
        beard_sheet = find_spritesheet(beard_def_name, body_type, beard_color)
        if beard_sheet:
            z = get_z_pos(defs.get(beard_def_name, {}))
            layers_to_composite.append(("beard", beard_sheet, z))
    
    # 5. Torso clothing
    torso_item = config.get("torso")
    torso_color = config.get("torso_color", "white")
    if torso_item:
        torso_sheet = find_spritesheet(torso_item, body_type, torso_color)
        if torso_sheet:
            z = get_z_pos(defs.get(torso_item, {}))
            layers_to_composite.append(("torso", torso_sheet, z))
        elif verbose:
            print(f"  ! Torso not found: {torso_item}/{body_type}/{torso_color}")
    
    # 6. Legs
    legs_item = config.get("legs")
    legs_color = config.get("legs_color", "white")
    if legs_item:
        legs_sheet = find_spritesheet(legs_item, body_type, legs_color)
        if legs_sheet:
            z = get_z_pos(defs.get(legs_item, {}))
            layers_to_composite.append(("legs", legs_sheet, z))
        elif verbose:
            print(f"  ! Legs not found: {legs_item}/{body_type}/{legs_color}")
    
    # 7. Feet
    feet_item = config.get("feet")
    feet_color = config.get("feet_color", "black")
    if feet_item:
        feet_sheet = find_spritesheet(feet_item, body_type, feet_color)
        if feet_sheet:
            z = get_z_pos(defs.get(feet_item, {}))
            layers_to_composite.append(("feet", feet_sheet, z))
    
    # 8. Belt
    belt_item = config.get("belt")
    belt_color = config.get("belt_color", "brown")
    if belt_item:
        belt_sheet = find_spritesheet(belt_item, body_type, belt_color)
        if belt_sheet:
            z = get_z_pos(defs.get(belt_item, {}))
            layers_to_composite.append(("belt", belt_sheet, z))
    
    # 9. Cape
    cape_item = config.get("cape")
    cape_color = config.get("cape_color", "black")
    if cape_item:
        cape_sheet = find_spritesheet(cape_item, body_type, cape_color)
        if cape_sheet:
            z = get_z_pos(defs.get(cape_item, {}))
            layers_to_composite.append(("cape", cape_sheet, z))
    
    # 10. Head items
    head_item = config.get("head")
    head_color = config.get("head_color", "")
    if head_item:
        head_sheet = find_spritesheet(head_item, body_type, head_color)
        if head_sheet:
            z = get_z_pos(defs.get(head_item, {}))
            layers_to_composite.append(("head", head_sheet, z))
    
    # Sort by z-order and composite
    layers_to_composite.sort(key=lambda x: x[2])
    
    for name, path, z in layers_to_composite:
        try:
            layer_img = Image.open(path).convert("RGBA")
            # Resize if needed
            if layer_img.size != (SHEET_WIDTH, SHEET_HEIGHT):
                if verbose:
                    print(f"  ~ {name}: resizing from {layer_img.size}")
                layer_img = layer_img.resize((SHEET_WIDTH, SHEET_HEIGHT), Image.NEAREST)
            result = Image.alpha_composite(result, layer_img)
            if verbose:
                print(f"  + {name}: {path.name} (z={z})")
        except Exception as e:
            if verbose:
                print(f"  ! Failed to load {name}: {e}")
    
    return result


def extract_frame(sheet: Image.Image, row: int, col: int) -> Image.Image:
    """Extract a single frame from a spritesheet"""
    x = col * FRAME_WIDTH
    y = row * FRAME_HEIGHT
    return sheet.crop((x, y, x + FRAME_WIDTH, y + FRAME_HEIGHT))


def generate_random_config() -> dict:
    """Generate a random character configuration"""
    options = get_available_options()
    
    body_type = random.choice(options["body_types"])
    skin_colors = options["body"].get("skin_colors", ["light"])
    eye_colors = options["eyes"].get("colors", ["blue"])
    
    # Pick a random hair style
    hair_styles = list(options["hair"].keys())
    hair_style = random.choice(hair_styles) if hair_styles and random.random() > 0.1 else ""
    hair_colors = options["hair"].get(hair_style, ["brown"]) if hair_style else ["brown"]
    
    config = {
        "body_type": body_type,
        "skin_color": random.choice(skin_colors),
        "eye_color": random.choice(eye_colors) if eye_colors else "blue",
        "hair_style": hair_style,
        "hair_color": random.choice(hair_colors) if hair_colors else "brown",
    }
    
    # Maybe add beard (25% chance for male/muscular)
    if body_type in ["male", "muscular"] and random.random() < 0.25:
        beard_styles = list(options["beard"].keys())
        if beard_styles:
            beard_style = random.choice(beard_styles)
            beard_colors = options["beard"].get(beard_style, [config["hair_color"]])
            config["beard_style"] = beard_style
            config["beard_color"] = random.choice(beard_colors) if beard_colors else config["hair_color"]
    
    # Clothing (70% chance each)
    if random.random() < 0.7:
        torso_items = list(options["clothing"]["torso"].keys())
        if torso_items:
            torso = random.choice(torso_items)
            colors = options["clothing"]["torso"].get(torso, ["white"])
            config["torso"] = torso
            config["torso_color"] = random.choice(colors) if colors else "white"
    
    if random.random() < 0.7:
        legs_items = list(options["clothing"]["legs"].keys())
        if legs_items:
            legs = random.choice(legs_items)
            colors = options["clothing"]["legs"].get(legs, ["white"])
            config["legs"] = legs
            config["legs_color"] = random.choice(colors) if colors else "white"
    
    if random.random() < 0.5:
        feet_items = list(options["clothing"]["feet"].keys())
        if feet_items:
            feet = random.choice(feet_items)
            colors = options["clothing"]["feet"].get(feet, ["black"])
            config["feet"] = feet
            config["feet_color"] = random.choice(colors) if colors else "black"
    
    return config


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL Image to base64 data URL"""
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def run_ui():
    """Launch the web-based UI for visual selection with real-time compositing API"""
    import http.server
    import socketserver
    import webbrowser
    import threading
    import urllib.parse
    
    UI_DIR = SCRIPT_DIR / "ui"
    PORT = 8765
    
    if not UI_DIR.exists():
        print(f"UI directory not found at {UI_DIR}")
        sys.exit(1)
    
    # Generate fresh options
    options = get_available_options()
    with open(UI_DIR / "options.json", "w") as f:
        json.dump(options, f, indent=2)
    
    class LPCHandler(http.server.SimpleHTTPRequestHandler):
        """Custom handler with API endpoints for compositing"""
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(UI_DIR), **kwargs)
        
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            
            # API: Generate composite spritesheet
            if parsed.path == "/api/composite":
                query = urllib.parse.parse_qs(parsed.query)
                config_json = query.get("config", ["{}"])[0]
                
                try:
                    config = json.loads(config_json)
                    sheet = composite_character(config, verbose=False)
                    
                    # Return as PNG
                    buffer = io.BytesIO()
                    sheet.save(buffer, format="PNG")
                    buffer.seek(0)
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "image/png")
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    self.wfile.write(buffer.getvalue())
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
                return
            
            # API: Get single frame as base64
            if parsed.path == "/api/frame":
                query = urllib.parse.parse_qs(parsed.query)
                config_json = query.get("config", ["{}"])[0]
                row = int(query.get("row", [8])[0])  # Default to walk row
                col = int(query.get("col", [0])[0])
                scale = int(query.get("scale", [4])[0])
                
                try:
                    config = json.loads(config_json)
                    sheet = composite_character(config, verbose=False)
                    frame = extract_frame(sheet, row, col)
                    
                    # Scale up for preview
                    if scale > 1:
                        frame = frame.resize(
                            (frame.width * scale, frame.height * scale),
                            Image.NEAREST
                        )
                    
                    b64 = image_to_base64(frame)
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    self.wfile.write(json.dumps({"image": b64}).encode())
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
                return
            
            # Serve static files
            return super().do_GET()
        
        def log_message(self, format, *args):
            # Suppress request logging
            pass
    
    with socketserver.TCPServer(("", PORT), LPCHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"LPC Builder UI running at {url}")
        print("Press Ctrl+C to stop")
        
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")


def main():
    parser = argparse.ArgumentParser(description="LPC Character Builder")
    parser.add_argument("--config", "-c", help="JSON config file or inline JSON string")
    parser.add_argument("--output", "-o", help="Output PNG file path")
    parser.add_argument("--list-options", action="store_true", help="List all available options as JSON")
    parser.add_argument("--random", action="store_true", help="Generate a random character")
    parser.add_argument("--ui", action="store_true", help="Launch web UI")
    parser.add_argument("--batch", help="Batch config JSON file")
    parser.add_argument("--output-dir", help="Output directory for batch mode")
    parser.add_argument("--quiet", "-q", action="store_true", help="Suppress verbose output")
    
    args = parser.parse_args()
    verbose = not args.quiet
    
    if args.list_options:
        options = get_available_options()
        print(json.dumps(options, indent=2))
        return
    
    if args.ui:
        run_ui()
        return
    
    if args.random:
        config = generate_random_config()
        print("Generated config:")
        print(json.dumps(config, indent=2))
        
        if args.output:
            print("\nCompositing...")
            result = composite_character(config, verbose=verbose)
            result.save(args.output)
            print(f"Saved to {args.output}")
        return
    
    if args.config:
        # Handle inline JSON or file path
        if args.config.strip().startswith("{"):
            config = json.loads(args.config)
        else:
            with open(args.config, 'r') as f:
                config = json.load(f)
        
        print("Config:")
        print(json.dumps(config, indent=2))
        print("\nCompositing...")
        
        result = composite_character(config, verbose=verbose)
        
        output_path = args.output or "character.png"
        result.save(output_path)
        print(f"Saved to {output_path}")
        return
    
    if args.batch:
        with open(args.batch, 'r') as f:
            batch_configs = json.load(f)
        
        output_dir = Path(args.output_dir or "./characters")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for i, config in enumerate(batch_configs):
            name = config.get("name", f"character_{i}")
            print(f"\n[{i+1}/{len(batch_configs)}] {name}")
            result = composite_character(config, verbose=verbose)
            output_path = output_dir / f"{name}.png"
            result.save(output_path)
            print(f"  -> {output_path}")
        
        print(f"\nGenerated {len(batch_configs)} characters in {output_dir}")
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
