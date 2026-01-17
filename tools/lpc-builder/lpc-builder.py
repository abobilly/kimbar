#!/usr/bin/env python3
"""
LPC Character Builder - Dual Mode Tool

Usage:
  CLI Mode (for AI agents):
    python lpc-builder.py --config config.json --output character.png
    python lpc-builder.py --list-options
    python lpc-builder.py --random --output random_character.png
    
  UI Mode:
    python lpc-builder.py --ui
    
  Batch Mode:
    python lpc-builder.py --batch batch.json --output-dir ./characters/
"""

import os
import sys
import json
import argparse
import random
from pathlib import Path
from PIL import Image

# Constants
ULPC_DIR = Path(__file__).parent.parent.parent / "vendor" / "lpc" / "Universal-LPC-Spritesheet-Character-Generator"
SHEET_DEFS_DIR = ULPC_DIR / "sheet_definitions"
SPRITESHEETS_DIR = ULPC_DIR / "spritesheets"
PALETTES_DIR = ULPC_DIR / "palettes"

# LPC sheet dimensions
FRAME_WIDTH = 64
FRAME_HEIGHT = 64
SHEET_COLS = 13
SHEET_ROWS = 21

# Core layer categories with z-order
LAYER_ORDER = [
    # Behind character
    ("cape", ["cape_solid", "cape_tattered"]),
    ("wings", ["wings_bat", "wings_feathered", "wings_pixie", "wings_monarch"]),
    # Body base
    ("body", ["body"]),
    # Clothing layers (bottom to top)
    ("legs", ["legs_pants", "legs_skirt", "legs_shorts"]),
    ("torso", ["torso_clothes_longsleeve", "torso_clothes_shortsleeve", "torso_clothes_sleeveless", "torso_clothes_robe"]),
    ("belt", ["belt_leather", "belt_sash"]),
    # Face features
    ("eyes", ["eyes"]),
    ("nose", ["nose"]),
    ("ears", ["ears"]),
    # Hair & facial
    ("hair", ["hair_bangs", "hair_long", "hair_short", "hair_ponytail", "hair_mohawk"]),
    ("beard", ["beards_beard", "beards_mustache", "beards_5oclock_shadow"]),
    # Head gear
    ("head", ["head_cap", "head_hood", "head_helmet"]),
    # Accessories
    ("feet", ["feet_shoes", "feet_boots"]),
    ("hands", ["arms_gloves"]),
]


def load_sheet_definitions() -> dict:
    """Load all sheet definition JSON files"""
    defs = {}
    if not SHEET_DEFS_DIR.exists():
        print(f"Warning: Sheet definitions not found at {SHEET_DEFS_DIR}")
        return defs
        
    for json_file in SHEET_DEFS_DIR.glob("*.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                defs[json_file.stem] = data
        except Exception as e:
            print(f"Warning: Could not load {json_file}: {e}")
    return defs


def get_available_options() -> dict:
    """Get all available options organized by category"""
    options = {
        "body_types": ["male", "female", "muscular", "teen", "child"],
        "skin_colors": [
            "light", "amber", "olive", "taupe", "bronze", "brown", "black",
            "lavender", "blue", "green", "zombie_green"
        ],
        "hair_styles": [],
        "hair_colors": [],
        "eye_colors": [],
        "clothing": {},
        "accessories": {}
    }
    
    defs = load_sheet_definitions()
    
    # Extract hair options
    for name, data in defs.items():
        if name.startswith("hair_"):
            options["hair_styles"].append(name.replace("hair_", ""))
            if "variants" in data:
                for v in data["variants"]:
                    if v not in options["hair_colors"]:
                        options["hair_colors"].append(v)
    
    # Extract eye colors
    if "eyes" in defs and "variants" in defs["eyes"]:
        options["eye_colors"] = defs["eyes"]["variants"]
    
    # Extract clothing options
    for name, data in defs.items():
        if name.startswith("torso_") or name.startswith("legs_") or name.startswith("feet_"):
            category = name.split("_")[0]
            if category not in options["clothing"]:
                options["clothing"][category] = []
            options["clothing"][category].append(name)
            
    # Extract accessories
    for name, data in defs.items():
        if name.startswith("head_") or name.startswith("belt_") or name.startswith("cape_"):
            category = name.split("_")[0]
            if category not in options["accessories"]:
                options["accessories"][category] = []
            options["accessories"][category].append(name)
    
    return options


def find_spritesheet(sheet_name: str, body_type: str, variant: str) -> Path | None:
    """Find the spritesheet file for a given sheet/body/variant combination"""
    defs = load_sheet_definitions()
    
    if sheet_name not in defs:
        return None
        
    definition = defs[sheet_name]
    
    # Get the path pattern for this body type
    layer_key = f"layer_1"
    if layer_key in definition and body_type in definition[layer_key]:
        base_path = definition[layer_key][body_type]
    elif layer_key in definition and "male" in definition[layer_key]:
        # Fall back to male if body type not found
        base_path = definition[layer_key]["male"]
    else:
        return None
    
    # Build full path
    sheet_path = SPRITESHEETS_DIR / base_path / f"{variant}.png"
    if sheet_path.exists():
        return sheet_path
        
    # Try without variant
    sheet_path = SPRITESHEETS_DIR / base_path / f"{sheet_name}.png"
    if sheet_path.exists():
        return sheet_path
        
    return None


def composite_character(config: dict) -> Image.Image:
    """Composite all layers into a single character spritesheet"""
    # Create blank RGBA image (standard LPC sheet is 832x1344)
    sheet_width = FRAME_WIDTH * SHEET_COLS
    sheet_height = FRAME_HEIGHT * SHEET_ROWS
    result = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))
    
    body_type = config.get("body_type", "male")
    
    # Process layers in z-order
    layers_to_composite = []
    
    # Body first
    body_sheet = find_spritesheet("body", body_type, config.get("skin_color", "light"))
    if body_sheet:
        layers_to_composite.append(("body", body_sheet, 10))
    
    # Eyes
    if "eye_color" in config:
        eye_sheet = find_spritesheet("eyes", body_type, config["eye_color"])
        if eye_sheet:
            layers_to_composite.append(("eyes", eye_sheet, 50))
    
    # Hair
    if "hair_style" in config and "hair_color" in config:
        hair_sheet = find_spritesheet(f"hair_{config['hair_style']}", body_type, config["hair_color"])
        if hair_sheet:
            layers_to_composite.append(("hair", hair_sheet, 100))
    
    # Clothing layers
    for layer_name in ["torso", "legs", "feet", "belt"]:
        layer_key = f"{layer_name}_item"
        color_key = f"{layer_name}_color"
        if layer_key in config:
            sheet = find_spritesheet(config[layer_key], body_type, config.get(color_key, "white"))
            if sheet:
                z = {"torso": 30, "legs": 20, "feet": 25, "belt": 35}.get(layer_name, 30)
                layers_to_composite.append((layer_name, sheet, z))
    
    # Accessories
    for acc_name in ["head", "cape", "beard"]:
        acc_key = f"{acc_name}_item"
        color_key = f"{acc_name}_color"
        if acc_key in config:
            sheet = find_spritesheet(config[acc_key], body_type, config.get(color_key, "white"))
            if sheet:
                z = {"head": 110, "cape": 5, "beard": 90}.get(acc_name, 50)
                layers_to_composite.append((acc_name, sheet, z))
    
    # Sort by z-order and composite
    layers_to_composite.sort(key=lambda x: x[2])
    
    for name, path, z in layers_to_composite:
        try:
            layer_img = Image.open(path).convert("RGBA")
            result = Image.alpha_composite(result, layer_img)
            print(f"  + {name}: {path.name}")
        except Exception as e:
            print(f"  ! Failed to load {name}: {e}")
    
    return result


def generate_random_config() -> dict:
    """Generate a random character configuration"""
    options = get_available_options()
    
    config = {
        "body_type": random.choice(options["body_types"]),
        "skin_color": random.choice(options["skin_colors"]),
    }
    
    if options["eye_colors"]:
        config["eye_color"] = random.choice(options["eye_colors"])
    
    if options["hair_styles"]:
        config["hair_style"] = random.choice(options["hair_styles"])
        
    if options["hair_colors"]:
        config["hair_color"] = random.choice(options["hair_colors"])
    
    return config


def run_ui():
    """Launch the web-based UI for visual selection"""
    import http.server
    import socketserver
    import webbrowser
    import threading
    
    UI_DIR = Path(__file__).parent / "ui"
    PORT = 8765
    
    if not UI_DIR.exists():
        print(f"UI directory not found at {UI_DIR}")
        print("Run: python lpc-builder.py --generate-ui to create it")
        sys.exit(1)
    
    os.chdir(UI_DIR)
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"LPC Builder UI running at {url}")
        print("Press Ctrl+C to stop")
        
        # Open browser
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")


def main():
    parser = argparse.ArgumentParser(description="LPC Character Builder")
    parser.add_argument("--config", "-c", help="JSON config file for character")
    parser.add_argument("--output", "-o", help="Output PNG file path")
    parser.add_argument("--list-options", action="store_true", help="List all available options")
    parser.add_argument("--random", action="store_true", help="Generate a random character")
    parser.add_argument("--ui", action="store_true", help="Launch web UI")
    parser.add_argument("--batch", help="Batch config JSON file")
    parser.add_argument("--output-dir", help="Output directory for batch mode")
    parser.add_argument("--generate-ui", action="store_true", help="Generate UI files")
    
    args = parser.parse_args()
    
    if args.list_options:
        options = get_available_options()
        print(json.dumps(options, indent=2))
        return
    
    if args.generate_ui:
        generate_ui_files()
        return
    
    if args.ui:
        run_ui()
        return
    
    if args.random:
        config = generate_random_config()
        print("Random config:")
        print(json.dumps(config, indent=2))
        
        if args.output:
            result = composite_character(config)
            result.save(args.output)
            print(f"Saved to {args.output}")
        return
    
    if args.config:
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        result = composite_character(config)
        
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
            result = composite_character(config)
            output_path = output_dir / f"{name}.png"
            result.save(output_path)
            print(f"Saved: {output_path}")
        return
    
    parser.print_help()


def generate_ui_files():
    """Generate the web UI files"""
    ui_dir = Path(__file__).parent / "ui"
    ui_dir.mkdir(exist_ok=True)
    
    # Generate API endpoint info
    options = get_available_options()
    
    with open(ui_dir / "options.json", "w") as f:
        json.dump(options, f, indent=2)
    
    print(f"Generated UI data at {ui_dir}")
    print("Now create the HTML/CSS/JS files or run: python lpc-builder.py --ui")


if __name__ == "__main__":
    main()
