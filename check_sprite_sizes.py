#!/usr/bin/env python3
"""
Quick Check for Procedural-Artist Agent and Repo Art Gen Flow

This script validates that generated sprites follow the 32x32 unit convention:
- Small items: 32x32
- Large items: 32x64 (tall) or 64x32 (wide)
- Max: 64x64 for very large items

Usage:
    python check_sprite_sizes.py
"""

import os
from pathlib import Path
from PIL import Image

# Expected sizes for different categories
SMALL_ITEMS = (32, 32)
TALL_ITEMS = (32, 64)
WIDE_ITEMS = (64, 32)
LARGE_ITEMS = (64, 64)

# Categorize items by expected size
EXPECTED_SIZES = {
    # 1. Chambers
    "accident_report_proc.png": (32, 32),
    "badge_stand_proc.png": (32, 32),
    "classical_bust_proc.png": (32, 64),
    "constitution_scroll_proc.png": (32, 32),
    "contract_scroll_proc.png": (32, 32),
    "counsel_chair_proc.png": (32, 32),
    "counsel_table_proc.png": (32, 64),
    "deed_ledger_proc.png": (32, 32),
    "docket_stack_proc.png": (32, 32),
    "door_plaque_proc.png": (32, 32),
    "evidence_board_proc.png": (32, 64),
    "family_photo_frame_proc.png": (32, 32),
    "hazard_sign_proc.png": (32, 32),
    "house_keys_proc.png": (32, 32),
    "judge_bench_proc.png": (64, 64),
    "jury_box_proc.png": (48, 64),
    "map_plot_proc.png": (32, 32),
    "press_backdrop_proc.png": (96, 32),
    "press_chair_proc.png": (32, 32),
    "procedure_chart_proc.png": (32, 32),
    "reading_table_proc.png": (32, 64),
    "robe_rack_proc.png": (32, 64),
    "scotus_plaque_proc.png": (32, 32),
    "statue_proc.png": (32, 64),
    "tape_recorder_proc.png": (32, 32),
    "toy_blocks_proc.png": (32, 32),

    # 2. Library / Cafeteria
    "book_ladder_proc.png": (32, 64),
    "card_catalog_proc.png": (32, 64),
    "cafeteria_chair_proc.png": (32, 32),
    "cafeteria_table_proc.png": (64, 32),
    "desk_lamp_proc.png": (16, 32),
    "menu_board_proc.png": (32, 32),
    "metal_shelf_proc.png": (64, 64),

    # 3. Press Room / Lobby
    "camera_rig_proc.png": (48, 32),
    "clock_proc.png": (32, 32),
    "flag_stand_proc.png": (32, 64),
    "podium_proc.png": (32, 64),

    # 4. Legal / Vault / Other
    "caution_cone_proc.png": (32, 32),
    "cctv_monitor_proc.png": (32, 32),
    "handcuffs_proc.png": (32, 32),
    "handshake_sculpture_proc.png": (32, 32),
    "locker_proc.png": (32, 64),
    "medical_chart_proc.png": (32, 32),
    "mirror_proc.png": (32, 32),
    "serving_counter_proc.png": (64, 32),
    "vault_door_proc.png": (32, 64),
    "vending_machine_proc.png": (32, 64),
    "warning_light_proc.png": (32, 32),
    "bollard_proc.png": (32, 32),

    # Existing items
    "scales_of_justice_proc.png": (64, 64),
    "quill_pen_proc.png": (32, 32),
    "legal_document_proc.png": (32, 32),
    "gavel_proc.png": (32, 32),
    "gavel_block_proc.png": (32, 32),
    "law_book_proc.png": (32, 32),
    "briefcase_proc.png": (32, 32),
    "nameplate_proc.png": (48, 16),
    "paper_stack_proc.png": (32, 32),
    "witness_stand_proc.png": (64, 64),
    "jury_bench_proc.png": (64, 32), # This conflicts with loop above? No, wait dictionary keys are unique.
                                     # The loop has "jury_box_proc" (48x64). "jury_bench_proc" is (64,32) in old.
                                     # Prompt has "prop.jury_box – 48×64 (benches)".
                                     # Is "jury_bench_proc" the same? The key is unique filename.
                                     # If "jury_bench_proc" exists, it's (64,32).
                                     # I will keep existing "jury_bench_proc" as (64,32) if it's separate from "jury_box".
    "courtroom_railing_proc.png": (64, 32),
    "evidence_box_proc.png": (32, 32),
    "microphone_proc.png": (16, 32),
    "water_pitcher_proc.png": (32, 32),
    "court_seal_proc.png": (48, 48),
    "exit_sign_proc.png": (32, 16),
    "spittoon_proc.png": (16, 16),
    "pewter_mug_proc.png": (16, 16),
    "argument_lectern_proc.png": (32, 32),
    "quill_pen_crossed_proc.png": (32, 16),
    "conference_table_proc.png": (64, 64),
    "bookshelf_proc.png": (32, 64),
    "file_cabinet_proc.png": (32, 64),
    "laptop_proc.png": (32, 32),
    "whiteboard_proc.png": (64, 32),
    "fat_boy_lollipop.png": (64, 64),
    "big_fat_boy_one_tooth_spinner_hat.png": (64, 64),
    
    # NPCs
    "clerk_proc.png": (64, 64),
    "reporter_proc.png": (64, 64),
    "tourist_proc.png": (64, 64),
}

def check_sprite_sizes():
    """Check that all generated sprites have the expected sizes."""
    legal_dir = Path("vendor/props/legal")
    exterior_dir = Path("vendor/props/exterior")
    
    all_passed = True
    issues = []
    
    # Check legal props
    if legal_dir.exists():
        for file_path in legal_dir.glob("*.png"):
            expected = EXPECTED_SIZES.get(file_path.name)
            if expected:
                actual = get_image_size(file_path)
                if actual != expected:
                    issues.append(f"{file_path.name}: expected {expected}, got {actual}")
                    all_passed = False
            else:
                issues.append(f"{file_path.name}: not in expected sizes mapping")
                all_passed = False
    
    # Check exterior props
    if exterior_dir.exists():
        for file_path in exterior_dir.glob("*.png"):
            # Exterior items have various sizes, just check they exist
            if file_path.stat().st_size == 0:
                issues.append(f"{file_path.name}: empty file")
                all_passed = False
    
    if all_passed:
        print("✅ All sprite sizes are correct!")
        return True
    else:
        print("❌ Issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False

def get_image_size(file_path):
    """Get the size of a PNG image."""
    try:
        with Image.open(file_path) as img:
            return img.size
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def validate_generation_flow():
    """Validate that the generation flow works correctly."""
    print("\n🔍 Validating generation flow...")
    
    # Check if make_icons.py exists
    if not Path("make_icons.py").exists():
        print("❌ make_icons.py not found")
        return False
    
    # Check if required directories exist
    legal_dir = Path("vendor/props/legal")
    exterior_dir = Path("vendor/props/exterior")
    
    if not legal_dir.exists():
        print(f"❌ {legal_dir} does not exist")
        return False
    
    if not exterior_dir.exists():
        print(f"❌ {exterior_dir} does not exist")
        return False
    
    # Check if palettes are defined
    with open("make_icons.py", "r") as f:
        content = f.read()
        required_palettes = ["SKIN", "HAIR", "CLOTHES", "GOLD", "WOOD", "BLACK"]
        for palette in required_palettes:
            if palette not in content:
                print(f"❌ Palette {palette} not found in make_icons.py")
                return False
    
    print("✅ Generation flow validation passed")
    return True

if __name__ == "__main__":
    print("🖼️  Checking Procedural-Artist Agent and Repo Art Gen Flow")
    print("=" * 60)
    
    flow_ok = validate_generation_flow()
    sizes_ok = check_sprite_sizes()
    
    if flow_ok and sizes_ok:
        print("\n🎉 All checks passed! The procedural-artist agent is working correctly.")
    else:
        print("\n⚠️  Some issues found. Please review and fix.")