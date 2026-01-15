from PIL import Image
import os
import glob

# CONFIG
SPRITES_DIR = "generated/sprites"
PORTRAITS_DIR = "generated/portraits"
TILE_SIZE = 64
SCALE_FACTOR = 8  # 8x zoom = 256px wide portrait

# LPC sprite sheet layout: 13 columns x 21 rows
# Front-facing idle is frame 117 = row 9, col 0 (0-indexed)
ROW_INDEX = 9  # Walk down row (facing camera)
COL_INDEX = 0  # First frame (idle stance)

def extract_portrait(input_file, output_file):
    try:
        sheet = Image.open(input_file)
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        return False

    # 1. Locate the 64x64 tile (front-facing frame)
    x = COL_INDEX * TILE_SIZE
    y = ROW_INDEX * TILE_SIZE
    
    full_body = sheet.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))

    # 2. Crop to Head & Shoulders (The Bust)
    # (Left, Top, Right, Bottom) relative to the 64x64 tile
    bust = full_body.crop((16, 8, 48, 40)) 

    # 3. Create Background (Neutral Dark Grey)
    final_portrait = Image.new("RGBA", bust.size, (45, 45, 55, 255))
    final_portrait.paste(bust, (0, 0), bust)

    # 4. Scale Up (Nearest Neighbor for crisp pixels)
    new_size = (bust.width * SCALE_FACTOR, bust.height * SCALE_FACTOR)
    large_portrait = final_portrait.resize(new_size, resample=Image.NEAREST)

    large_portrait.save(output_file)
    return True

def main():
    os.makedirs(PORTRAITS_DIR, exist_ok=True)
    
    sprite_files = glob.glob(os.path.join(SPRITES_DIR, "*.png"))
    
    success_count = 0
    for sprite_path in sprite_files:
        filename = os.path.basename(sprite_path)
        char_id = filename.replace(".png", "")
        output_file = os.path.join(PORTRAITS_DIR, f"{char_id}.png")
        
        if extract_portrait(sprite_path, output_file):
            print(f"✓ {char_id}")
            success_count += 1
        else:
            print(f"✗ {char_id}")
    
    print(f"\nGenerated {success_count}/{len(sprite_files)} portraits")

if __name__ == "__main__":
    main()
