#!/usr/bin/env python3
"""
generate_female_robe.py - Procedural generation of female judge robe LPC spritesheet.

Generates a complete 832×1344 (13 cols × 21 rows) LPC spritesheet with 
black judicial robes for a female character.

Key differences from male robe:
- Slightly narrower shoulders
- Must fully cover curved chest area
- Narrower waist, slightly wider hips
- Chest box coverage (24-42 in x, 28-48 in y) is CRITICAL

Usage:
    cd tools/tailor
    python generate_female_robe.py

Output:
    vendor/lpc/custom/torso_robe_judge_female_black.png
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw

# === LPC SHEET DIMENSIONS ===
COLS = 13
ROWS = 21
TILE_SIZE = 64
SHEET_WIDTH = COLS * TILE_SIZE   # 832
SHEET_HEIGHT = ROWS * TILE_SIZE  # 1344

# === PALETTE: Black Judge Robes ===
C_OUTLINE = (26, 26, 46)     # #1a1a2e - external edges only
C_SHADOW = (53, 53, 69)      # Internal folds, right side
C_BASE = (40, 40, 58)        # Main robe color
C_HIGHLIGHT = (64, 64, 85)   # Top-left lit areas

# === FRAME GEOMETRY (within 64×64) ===
# All coordinates relative to frame origin (0,0)
CENTER_X = 32
SHOULDER_Y = 24
HEM_Y = 58

# Female-specific geometry:
# - Slightly narrower shoulders than male (9 vs 10)
# - Similar hem width to maintain coverage
SHOULDER_HALF_W = 9   # Narrower shoulders than male (10)
HEM_HALF_W = 13       # Slightly narrower than male (14)

# Chest box that MUST be covered: (24,28)-(42,48)
CHEST_BOX_LEFT = 24
CHEST_BOX_RIGHT = 42
CHEST_BOX_TOP = 28
CHEST_BOX_BOTTOM = 48

# === ROW DEFINITIONS ===
# Standard LPC layout:
# Row 0: Spellcast Up
# Row 1: Spellcast Left
# Row 2: Spellcast Down
# Row 3: Spellcast Right
# Row 4: Thrust Up
# Row 5: Thrust Left
# Row 6: Thrust Down/Right
# Row 7: Walk Up (back view) - cols 0-8
# Row 8: Walk Left - cols 0-8
# Row 9: Walk Down (front view) - cols 0-8
# Row 10: Walk Right - cols 0-8
# Row 11-13: Slash animations
# Row 14-17: Shoot animations
# Row 18-20: Hurt/Death

WALK_UP_ROW = 7
WALK_LEFT_ROW = 8
WALK_DOWN_ROW = 9
WALK_RIGHT_ROW = 10
WALK_FRAME_COUNT = 9  # frames 0-8


def draw_robe_front(draw, x, y, frame_idx=0):
    """
    Draw front-facing robe (walk down direction).
    
    Female version has:
    - Slightly narrower shoulders
    - Curved silhouette indication via shading
    - Full chest coverage
    
    Args:
        draw: ImageDraw object
        x, y: Top-left of the 64×64 frame
        frame_idx: Animation frame (0=idle, 1-8=walk)
    """
    cx = x + CENTER_X
    
    # Sway offset for walk animation
    sway = 0
    if frame_idx > 0:
        # Alternate left/right sway
        sway = [-1, 0, 1, 0, -1, 0, 1, 0][frame_idx - 1] if frame_idx <= 8 else 0
    
    # Trapezoid vertices (top-left, top-right, bottom-right, bottom-left)
    left_top = cx - SHOULDER_HALF_W
    right_top = cx + SHOULDER_HALF_W
    left_bot = cx - HEM_HALF_W + sway
    right_bot = cx + HEM_HALF_W + sway
    top_y = y + SHOULDER_Y
    bot_y = y + HEM_Y
    
    # Main trapezoid body
    trapezoid = [
        (left_top, top_y),
        (right_top, top_y),
        (right_bot, bot_y),
        (left_bot, bot_y),
    ]
    
    # Draw filled trapezoid (base color)
    draw.polygon(trapezoid, fill=C_BASE)
    
    # External outline
    draw.line([trapezoid[0], trapezoid[1]], fill=C_OUTLINE, width=1)  # Top
    draw.line([trapezoid[1], trapezoid[2]], fill=C_OUTLINE, width=1)  # Right edge
    draw.line([trapezoid[2], trapezoid[3]], fill=C_OUTLINE, width=1)  # Bottom
    draw.line([trapezoid[3], trapezoid[0]], fill=C_OUTLINE, width=1)  # Left edge
    
    # Left highlight strip (2px wide)
    for i in range(2):
        x1 = left_top + 1 + i
        x2 = left_bot + 1 + i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_HIGHLIGHT, width=1)
    
    # Right shadow strip (2px wide)
    for i in range(2):
        x1 = right_top - 2 - i
        x2 = right_bot - 2 - i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_SHADOW, width=1)
    
    # Center fold line (vertical, using shadow color)
    draw.line([(cx + sway, top_y + 4), (cx + sway, bot_y - 2)], fill=C_SHADOW, width=1)
    
    # Waist curve indication - subtle shadow curves suggesting feminine shape
    # This creates a slight cinching effect at the waist
    waist_y = y + 42  # Mid-torso
    draw.line([(cx - 4 + sway, waist_y), (cx - 2 + sway, waist_y + 2)], fill=C_SHADOW, width=1)
    draw.line([(cx + 4 + sway, waist_y), (cx + 2 + sway, waist_y + 2)], fill=C_SHADOW, width=1)
    
    # Bottom hem fold wedges (small triangles)
    wedge_y = bot_y - 4
    # Left wedge
    draw.polygon([
        (left_bot + 3 + sway, bot_y),
        (left_bot + 5 + sway, wedge_y),
        (left_bot + 7 + sway, bot_y),
    ], fill=C_SHADOW)
    # Right wedge
    draw.polygon([
        (right_bot - 7 + sway, bot_y),
        (right_bot - 5 + sway, wedge_y),
        (right_bot - 3 + sway, bot_y),
    ], fill=C_SHADOW)
    # Center wedge
    draw.polygon([
        (cx - 2 + sway, bot_y),
        (cx + sway, wedge_y),
        (cx + 2 + sway, bot_y),
    ], fill=C_SHADOW)


def draw_robe_back(draw, x, y, frame_idx=0):
    """
    Draw back-facing robe (walk up direction).
    
    Args:
        draw: ImageDraw object
        x, y: Top-left of the 64×64 frame
        frame_idx: Animation frame (0=idle, 1-8=walk)
    """
    cx = x + CENTER_X
    
    # Sway offset
    sway = 0
    if frame_idx > 0:
        sway = [-1, 0, 1, 0, -1, 0, 1, 0][frame_idx - 1] if frame_idx <= 8 else 0
    
    # Same trapezoid shape as front, but simpler shading (less detail from back)
    left_top = cx - SHOULDER_HALF_W
    right_top = cx + SHOULDER_HALF_W
    left_bot = cx - HEM_HALF_W + sway
    right_bot = cx + HEM_HALF_W + sway
    top_y = y + SHOULDER_Y
    bot_y = y + HEM_Y
    
    trapezoid = [
        (left_top, top_y),
        (right_top, top_y),
        (right_bot, bot_y),
        (left_bot, bot_y),
    ]
    
    draw.polygon(trapezoid, fill=C_BASE)
    
    # External outline
    draw.line([trapezoid[0], trapezoid[1]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[1], trapezoid[2]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[2], trapezoid[3]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[3], trapezoid[0]], fill=C_OUTLINE, width=1)
    
    # Left highlight
    for i in range(2):
        x1 = left_top + 1 + i
        x2 = left_bot + 1 + i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_HIGHLIGHT, width=1)
    
    # Right shadow
    for i in range(2):
        x1 = right_top - 2 - i
        x2 = right_bot - 2 - i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_SHADOW, width=1)
    
    # Back center seam (single vertical line)
    draw.line([(cx + sway, top_y + 2), (cx + sway, bot_y - 1)], fill=C_SHADOW, width=1)
    
    # Waist curve indication from back
    waist_y = y + 42
    draw.line([(cx - 3 + sway, waist_y), (cx - 1 + sway, waist_y + 1)], fill=C_SHADOW, width=1)
    draw.line([(cx + 3 + sway, waist_y), (cx + 1 + sway, waist_y + 1)], fill=C_SHADOW, width=1)
    
    # Simple hem folds
    wedge_y = bot_y - 3
    draw.polygon([
        (cx - 3 + sway, bot_y),
        (cx + sway, wedge_y),
        (cx + 3 + sway, bot_y),
    ], fill=C_SHADOW)


def draw_robe_left(draw, x, y, frame_idx=0):
    """
    Draw left-facing robe (walk left direction).
    
    CRITICAL: Must cover chest box (24-42 in x, 28-48 in y).
    Character is facing left, so we see the right side of the robe.
    
    Args:
        draw: ImageDraw object
        x, y: Top-left of the 64×64 frame
        frame_idx: Animation frame (0=idle, 1-8=walk)
    """
    cx = x + CENTER_X
    
    # Leg motion sway
    leg_phase = 0
    if frame_idx > 0:
        leg_phase = [0, 1, 2, 1, 0, -1, -2, -1][frame_idx - 1] if frame_idx <= 8 else 0
    
    # CRITICAL: Widened to cover chest box (24-42 in local coords)
    # cx=32, so need left edge at ≤23 and right edge at ≥43
    # left_top = 32 - 10 + 0 = 22 (covers from 22)
    # right_top = 32 + 10 + 0 - 2 = 40 (need to extend to 43+)
    shoulder_w = 10  # Wide enough for chest coverage
    hem_w = 12
    
    # Offset for side view (back visible on right side of screen)
    offset = 0
    
    # Extend robe width to ensure chest box coverage
    # For left-facing: we need coverage at x=24 and x=42 (local frame coords)
    left_top = cx - shoulder_w + offset - 1   # 32 - 10 - 1 = 21
    right_top = cx + shoulder_w + offset + 1  # 32 + 10 + 1 = 43
    left_bot = cx - hem_w + offset + leg_phase - 1
    right_bot = cx + hem_w + offset + leg_phase + 1
    top_y = y + SHOULDER_Y
    bot_y = y + HEM_Y
    
    trapezoid = [
        (left_top, top_y),
        (right_top, top_y),
        (right_bot, bot_y),
        (left_bot, bot_y),
    ]
    
    draw.polygon(trapezoid, fill=C_BASE)
    
    # External outline
    draw.line([trapezoid[0], trapezoid[1]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[1], trapezoid[2]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[2], trapezoid[3]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[3], trapezoid[0]], fill=C_OUTLINE, width=1)
    
    # Since facing left, highlight is on the back (right side of shape)
    for i in range(2):
        x1 = right_top - 1 - i
        x2 = right_bot - 1 - i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_HIGHLIGHT, width=1)
    
    # Shadow on the front (left side of shape)
    for i in range(2):
        x1 = left_top + 1 + i
        x2 = left_bot + 1 + i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_SHADOW, width=1)
    
    # Side fold near center
    fold_x = cx + offset
    draw.line([(fold_x, top_y + 4), (fold_x + leg_phase // 2, bot_y - 2)], fill=C_SHADOW, width=1)
    
    # Bust/chest curve indication (subtle shadow showing form)
    chest_y = y + 34
    draw.line([(left_top + 4, chest_y), (left_top + 5, chest_y + 2)], fill=C_SHADOW, width=1)
    
    # Hem fold
    wedge_y = bot_y - 3
    hem_cx = (left_bot + right_bot) // 2
    draw.polygon([
        (hem_cx - 2, bot_y),
        (hem_cx, wedge_y),
        (hem_cx + 2, bot_y),
    ], fill=C_SHADOW)


def draw_robe_right(draw, x, y, frame_idx=0):
    """
    Draw right-facing robe (walk right direction).
    
    CRITICAL: Must cover chest box (24-42 in x, 28-48 in y).
    Mirrored version of left-facing.
    
    Args:
        draw: ImageDraw object
        x, y: Top-left of the 64×64 frame
        frame_idx: Animation frame (0=idle, 1-8=walk)
    """
    cx = x + CENTER_X
    
    leg_phase = 0
    if frame_idx > 0:
        leg_phase = [0, 1, 2, 1, 0, -1, -2, -1][frame_idx - 1] if frame_idx <= 8 else 0
    
    # CRITICAL: Widened to cover chest box (24-42 in local coords)
    shoulder_w = 10
    hem_w = 12
    
    # Offset for side view (back visible on left side of screen)
    offset = 0
    
    # Extend robe width to ensure chest box coverage
    left_top = cx - shoulder_w + offset - 1   # 32 - 10 - 1 = 21
    right_top = cx + shoulder_w + offset + 1  # 32 + 10 + 1 = 43
    left_bot = cx - hem_w + offset + leg_phase - 1
    right_bot = cx + hem_w + offset + leg_phase + 1
    top_y = y + SHOULDER_Y
    bot_y = y + HEM_Y
    
    trapezoid = [
        (left_top, top_y),
        (right_top, top_y),
        (right_bot, bot_y),
        (left_bot, bot_y),
    ]
    
    draw.polygon(trapezoid, fill=C_BASE)
    
    # External outline
    draw.line([trapezoid[0], trapezoid[1]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[1], trapezoid[2]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[2], trapezoid[3]], fill=C_OUTLINE, width=1)
    draw.line([trapezoid[3], trapezoid[0]], fill=C_OUTLINE, width=1)
    
    # Highlight on front (left side of shape when facing right)
    for i in range(2):
        x1 = left_top + 1 + i
        x2 = left_bot + 1 + i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_HIGHLIGHT, width=1)
    
    # Shadow on back (right side)
    for i in range(2):
        x1 = right_top - 2 - i
        x2 = right_bot - 2 - i
        draw.line([(x1, top_y + 1), (x2, bot_y - 1)], fill=C_SHADOW, width=1)
    
    # Side fold
    fold_x = cx + offset
    draw.line([(fold_x, top_y + 4), (fold_x + leg_phase // 2, bot_y - 2)], fill=C_SHADOW, width=1)
    
    # Bust/chest curve indication (subtle shadow showing form, mirrored side)
    chest_y = y + 34
    draw.line([(right_top - 4, chest_y), (right_top - 5, chest_y + 2)], fill=C_SHADOW, width=1)
    
    # Hem fold
    wedge_y = bot_y - 3
    hem_cx = (left_bot + right_bot) // 2
    draw.polygon([
        (hem_cx - 2, bot_y),
        (hem_cx, wedge_y),
        (hem_cx + 2, bot_y),
    ], fill=C_SHADOW)


def validate_chest_coverage(img):
    """
    Validate that all walk frames (rows 7-10) cover the chest box.
    
    Chest box: (24,28)-(42,48) within each 64x64 frame.
    Returns True if all frames pass, False otherwise.
    """
    pixels = img.load()
    errors = []
    
    for row in [WALK_UP_ROW, WALK_LEFT_ROW, WALK_DOWN_ROW, WALK_RIGHT_ROW]:
        row_y = row * TILE_SIZE
        for col in range(WALK_FRAME_COUNT):
            frame_x = col * TILE_SIZE
            
            # Check chest box coverage
            # We check a sampling of points within the box
            uncovered_count = 0
            for local_y in range(CHEST_BOX_TOP, CHEST_BOX_BOTTOM + 1, 2):
                for local_x in range(CHEST_BOX_LEFT, CHEST_BOX_RIGHT + 1, 2):
                    px = frame_x + local_x
                    py = row_y + local_y
                    if pixels[px, py][3] == 0:  # Transparent
                        uncovered_count += 1
            
            # Allow some tolerance (corners might be cut)
            total_samples = ((CHEST_BOX_BOTTOM - CHEST_BOX_TOP) // 2 + 1) * ((CHEST_BOX_RIGHT - CHEST_BOX_LEFT) // 2 + 1)
            coverage_ratio = 1 - (uncovered_count / total_samples)
            
            if coverage_ratio < 0.85:  # Require 85% coverage
                errors.append(f"Row {row}, Col {col}: {coverage_ratio*100:.1f}% chest coverage")
    
    return errors


def generate_spritesheet():
    """
    Generate complete 832×1344 LPC spritesheet.
    """
    # Create transparent RGBA image
    img = Image.new('RGBA', (SHEET_WIDTH, SHEET_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # === WALK ANIMATIONS (Critical rows) ===
    
    # Row 7: Walk Up (back view)
    for col in range(WALK_FRAME_COUNT):
        frame_x = col * TILE_SIZE
        frame_y = WALK_UP_ROW * TILE_SIZE
        draw_robe_back(draw, frame_x, frame_y, frame_idx=col)
    
    # Row 8: Walk Left
    for col in range(WALK_FRAME_COUNT):
        frame_x = col * TILE_SIZE
        frame_y = WALK_LEFT_ROW * TILE_SIZE
        draw_robe_left(draw, frame_x, frame_y, frame_idx=col)
    
    # Row 9: Walk Down (front view)
    for col in range(WALK_FRAME_COUNT):
        frame_x = col * TILE_SIZE
        frame_y = WALK_DOWN_ROW * TILE_SIZE
        draw_robe_front(draw, frame_x, frame_y, frame_idx=col)
    
    # Row 10: Walk Right
    for col in range(WALK_FRAME_COUNT):
        frame_x = col * TILE_SIZE
        frame_y = WALK_RIGHT_ROW * TILE_SIZE
        draw_robe_right(draw, frame_x, frame_y, frame_idx=col)
    
    # === ADDITIONAL ROWS (populate with idle poses) ===
    
    # Rows 0-3: Spellcast (use idle front/back/side poses)
    for col in range(7):  # Spellcast has 7 frames
        # Row 0: Up (back)
        draw_robe_back(draw, col * TILE_SIZE, 0 * TILE_SIZE, frame_idx=0)
        # Row 1: Left
        draw_robe_left(draw, col * TILE_SIZE, 1 * TILE_SIZE, frame_idx=0)
        # Row 2: Down (front)
        draw_robe_front(draw, col * TILE_SIZE, 2 * TILE_SIZE, frame_idx=0)
        # Row 3: Right
        draw_robe_right(draw, col * TILE_SIZE, 3 * TILE_SIZE, frame_idx=0)
    
    # Rows 4-6: Thrust
    for col in range(8):
        draw_robe_back(draw, col * TILE_SIZE, 4 * TILE_SIZE, frame_idx=0)
        draw_robe_left(draw, col * TILE_SIZE, 5 * TILE_SIZE, frame_idx=0)
        draw_robe_front(draw, col * TILE_SIZE, 6 * TILE_SIZE, frame_idx=0)
    
    # Rows 11-14: Slash
    for row in range(11, 15):
        direction = (row - 11) % 4
        for col in range(6):
            if direction == 0:
                draw_robe_back(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            elif direction == 1:
                draw_robe_left(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            elif direction == 2:
                draw_robe_front(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            else:
                draw_robe_right(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
    
    # Rows 15-18: Shoot
    for row in range(15, 19):
        direction = (row - 15) % 4
        for col in range(13):
            if direction == 0:
                draw_robe_back(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            elif direction == 1:
                draw_robe_left(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            elif direction == 2:
                draw_robe_front(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
            else:
                draw_robe_right(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
    
    # Rows 19-20: Hurt/Death (front view)
    for row in range(19, 21):
        for col in range(6):
            draw_robe_front(draw, col * TILE_SIZE, row * TILE_SIZE, frame_idx=0)
    
    return img


def main():
    # Determine output path (relative to repo root)
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent  # tools/tailor -> tools -> repo root
    output_dir = repo_root / "vendor" / "lpc" / "custom"
    output_path = output_dir / "torso_robe_judge_female_black.png"
    
    # Create output directory if needed
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating female judge robe spritesheet...")
    print(f"  Dimensions: {SHEET_WIDTH}×{SHEET_HEIGHT}")
    print(f"  Tiles: {COLS} cols × {ROWS} rows @ {TILE_SIZE}×{TILE_SIZE}")
    
    # Generate the spritesheet
    img = generate_spritesheet()
    
    # Save
    img.save(output_path)
    print(f"  Saved: {output_path}")
    
    # Pixel count validation
    print("\nPixel count by row:")
    pixels = img.load()
    for row in [7, 8, 9, 10]:
        row_y = row * TILE_SIZE
        non_trans = 0
        for y in range(row_y, row_y + TILE_SIZE):
            for x in range(WALK_FRAME_COUNT * TILE_SIZE):
                if pixels[x, y][3] > 0:
                    non_trans += 1
        print(f"  Row {row} (walk): {non_trans} non-transparent pixels")
    
    # Chest coverage validation
    print("\nChest box coverage validation:")
    errors = validate_chest_coverage(img)
    if errors:
        print("  ❌ FAILED - insufficient chest coverage:")
        for err in errors:
            print(f"     {err}")
        return 1
    else:
        print("  ✓ All walk frames have adequate chest coverage")
    
    print("\n✓ Generation complete!")
    return 0


if __name__ == "__main__":
    exit(main())
