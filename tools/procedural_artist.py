#!/usr/bin/env python3
"""
Procedural-Artist Agent

This agent generates procedural pixel art for game assets using mathematical
symmetry and pixel art principles. Optimized for LPC-style spritesheets.

Usage:
    python procedural_artist.py --asset fountain --size 32x32 --output generated/art/fountain_proc.png
    python procedural_artist.py --random --output generated/art/random_proc.png
"""

import os
import sys
import json
import argparse
import random
import math
from pathlib import Path
from typing import Tuple, List, Optional

try:
    from PIL import Image, ImageDraw
    import numpy as np
except ImportError:
    print("PIL and numpy required: pip install pillow numpy")
    sys.exit(1)

# === CONFIGURATION ===
OUTPUT_DIR = Path(__file__).parent.parent / "generated" / "art"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Asset templates with generation parameters
ASSET_TEMPLATES = {
    "fountain": {
        "base_shape": "circle",
        "symmetry": "radial",
        "colors": ["#4169E1", "#1E90FF", "#00BFFF"],  # Blue tones
        "features": ["ripples", "base"]
    },
    "gavel": {
        "base_shape": "rectangle",
        "symmetry": "bilateral",
        "colors": ["#8B4513", "#654321", "#D2691E"],  # Brown tones
        "features": ["handle", "head"]
    },
    "scales": {
        "base_shape": "triangle",
        "symmetry": "bilateral",
        "colors": ["#FFD700", "#FFA500", "#FF8C00"],  # Gold tones
        "features": ["arms", "base"]
    }
}

# LPC Style constants
OUTLINE_COLOR = (0, 0, 0, 255)  # Black outline
SHADOW_COLOR_MULTIPLIER = 0.6   # Darken for shadows
HIGHLIGHT_COLOR_MULTIPLIER = 1.3  # Brighten for highlights
LIGHT_DIRECTION = (-1, -1)  # Top-left lighting


class ProceduralArtist:
    """Procedural pixel art generator following LPC style guidelines."""
    
    def __init__(self, size: Tuple[int, int] = (32, 32)):
        self.width, self.height = size
        self.base_img = Image.new('RGBA', size, (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.base_img)
    
    def generate_asset(self, asset_type: str, seed: Optional[int] = None) -> Image.Image:
        """Generate a procedural asset of the given type."""
        if seed:
            random.seed(seed)
            np.random.seed(seed)
        
        if asset_type not in ASSET_TEMPLATES:
            raise ValueError(f"Unknown asset type: {asset_type}")
        
        template = ASSET_TEMPLATES[asset_type]
        
        # Generate base shape
        self._draw_base_shape(template)
        
        # Add features
        for feature in template["features"]:
            self._add_feature(feature, template)
        
        # Apply shading
        self._apply_shading()
        
        # Add outline
        self._add_outline()
        
        return self.base_img
    
    def _draw_base_shape(self, template: dict):
        """Draw the base shape for the asset."""
        shape = template["base_shape"]
        colors = template["colors"]
        symmetry = template["symmetry"]
        
        center_x, center_y = self.width // 2, self.height // 2
        
        if shape == "circle":
            radius = min(self.width, self.height) // 3
            self._draw_circle(center_x, center_y, radius, colors[0])
            
        elif shape == "rectangle":
            w, h = self.width // 2, self.height // 3
            self._draw_rectangle(center_x - w//2, center_y - h//2, w, h, colors[0])
            
        elif shape == "triangle":
            size = min(self.width, self.height) // 2
            self._draw_triangle(center_x, center_y - size//2, size, colors[0])
    
    def _add_feature(self, feature: str, template: dict):
        """Add a specific feature to the asset."""
        colors = template["colors"]
        
        if feature == "ripples":
            self._add_ripples(colors[1])
        elif feature == "base":
            self._add_base(colors[2])
        elif feature == "handle":
            self._add_handle(colors[1])
        elif feature == "head":
            self._add_head(colors[2])
        elif feature == "arms":
            self._add_arms(colors[1])
    
    def _draw_circle(self, cx: int, cy: int, radius: int, color: str):
        """Draw a filled circle."""
        bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
        self.draw.ellipse(bbox, fill=color)
    
    def _draw_rectangle(self, x: int, y: int, w: int, h: int, color: str):
        """Draw a filled rectangle."""
        self.draw.rectangle((x, y, x + w, y + h), fill=color)
    
    def _draw_triangle(self, cx: int, cy: int, size: int, color: str):
        """Draw an equilateral triangle."""
        points = [
            (cx, cy),
            (cx - size//2, cy + size),
            (cx + size//2, cy + size)
        ]
        self.draw.polygon(points, fill=color)
    
    def _add_ripples(self, color: str):
        """Add ripple effects to circular assets."""
        arr = np.array(self.base_img)
        # Simple ripple effect by darkening concentric circles
        center_y, center_x = self.height // 2, self.width // 2
        y_coords, x_coords = np.ogrid[:self.height, :self.width]
        dist_from_center = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
        
        ripple_mask = (dist_from_center % 8 < 2) & (arr[:, :, 3] > 0)
        arr[ripple_mask, :3] = np.clip(arr[ripple_mask, :3] * 0.8, 0, 255)
        
        self.base_img = Image.fromarray(arr)
        self.draw = ImageDraw.Draw(self.base_img)
    
    def _add_base(self, color: str):
        """Add a base/platform."""
        base_y = self.height * 3 // 4
        self.draw.rectangle((0, base_y, self.width, self.height), fill=color)
    
    def _add_handle(self, color: str):
        """Add a handle to rectangular assets."""
        handle_width = self.width // 8
        handle_height = self.height // 2
        handle_x = self.width // 2 - handle_width // 2
        handle_y = self.height // 4
        self.draw.rectangle((handle_x, handle_y, handle_x + handle_width, handle_y + handle_height), fill=color)
    
    def _add_head(self, color: str):
        """Add a head to rectangular assets."""
        head_size = self.width // 4
        head_x = self.width // 2 - head_size // 2
        head_y = 0
        self.draw.rectangle((head_x, head_y, head_x + head_size, head_y + head_size), fill=color)
    
    def _add_arms(self, color: str):
        """Add arms to triangular assets."""
        arm_length = self.width // 3
        center_x = self.width // 2
        arm_y = self.height // 2
        
        # Left arm
        self.draw.line((center_x - arm_length, arm_y, center_x, arm_y), fill=color, width=3)
        # Right arm
        self.draw.line((center_x, arm_y, center_x + arm_length, arm_y), fill=color, width=3)
    
    def _apply_shading(self):
        """Apply 3-tone shading based on light direction."""
        arr = np.array(self.base_img)
        alpha = arr[:, :, 3]
        visible = alpha > 0
        
        if not np.any(visible):
            return
        
        # Calculate light direction gradient
        y_coords, x_coords = np.ogrid[:self.height, :self.width]
        light_x, light_y = LIGHT_DIRECTION
        
        # Normalize light direction
        light_len = math.sqrt(light_x**2 + light_y**2)
        light_x /= light_len
        light_y /= light_len
        
        # Dot product with light direction (simplified)
        light_intensity = (x_coords * light_x + y_coords * light_y) / max(self.width, self.height)
        light_intensity = (light_intensity + 1) / 2  # Normalize to 0-1
        
        # Apply shading
        for i in range(3):  # RGB channels
            channel = arr[:, :, i].astype(float)
            # Highlight where light hits
            highlight_mask = (light_intensity > 0.7) & visible
            channel[highlight_mask] *= HIGHLIGHT_COLOR_MULTIPLIER
            # Shadow where light doesn't hit
            shadow_mask = (light_intensity < 0.3) & visible
            channel[shadow_mask] *= SHADOW_COLOR_MULTIPLIER
            arr[:, :, i] = np.clip(channel, 0, 255).astype(np.uint8)
        
        self.base_img = Image.fromarray(arr)
        self.draw = ImageDraw.Draw(self.base_img)
    
    def _add_outline(self):
        """Add 1px dark outline around all shapes."""
        # Create outline by expanding the alpha channel
        arr = np.array(self.base_img)
        alpha = arr[:, :, 3]
        
        # Dilate alpha to create outline
        from scipy import ndimage
        dilated = ndimage.binary_dilation(alpha > 0)
        outline_mask = dilated & (alpha == 0)
        
        # Set outline pixels to black
        arr[outline_mask, :3] = [0, 0, 0]
        arr[outline_mask, 3] = 255
        
        self.base_img = Image.fromarray(arr)


def main():
    parser = argparse.ArgumentParser(description="Procedural-Artist Agent")
    parser.add_argument("--asset", choices=list(ASSET_TEMPLATES.keys()), help="Asset type to generate")
    parser.add_argument("--random", action="store_true", help="Generate random asset")
    parser.add_argument("--size", default="32x32", help="Image size (WxH)")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--seed", type=int, help="Random seed for reproducible generation")
    
    args = parser.parse_args()
    
    # Parse size
    try:
        w, h = map(int, args.size.split('x'))
        size = (w, h)
    except ValueError:
        print("Invalid size format. Use WxH (e.g., 32x32)")
        sys.exit(1)
    
    # Determine asset type
    if args.random:
        asset_type = random.choice(list(ASSET_TEMPLATES.keys()))
    elif args.asset:
        asset_type = args.asset
    else:
        print("Must specify --asset or --random")
        sys.exit(1)
    
    # Generate
    artist = ProceduralArtist(size)
    img = artist.generate_asset(asset_type, args.seed)
    
    # Save
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    
    print(f"Generated {asset_type} asset: {output_path}")


if __name__ == "__main__":
    main()