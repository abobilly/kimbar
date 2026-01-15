from PIL import Image

# 1. Change this to the path of one of your existing LPC character sheets
INPUT_FILE = "vendor/characters/justice_roberts.png" 

# 2. Where exactly in the sheet is the face? 
# Standard LPC sheets: The "Down" facing idle frame is usually near the top.
# Let's crop a 64x64 square from the top-left (adjust x/y if needed)
CROP_BOX = (0, 0, 64, 64) 

def test_upscale():
    try:
        img = Image.open(INPUT_FILE)
    except FileNotFoundError:
        print(f"Could not find {INPUT_FILE}. specific a valid sprite path!")
        return

    # Crop just the head/body
    sprite = img.crop(CROP_BOX)

    # Method 1: Nearest Neighbor (Crisp, Giant Pixels) -> "The Retro Look"
    retro = sprite.resize((512, 512), resample=Image.NEAREST)
    retro.save("test_portrait_retro.png")
    print("Saved test_portrait_retro.png (Crisp giant pixels)")

    # Method 2: Bilinear (Blurry) -> "The Bad Look" (Just to show you why we don't do this)
    smooth = sprite.resize((512, 512), resample=Image.BILINEAR)
    smooth.save("test_portrait_blurry.png")
    print("Saved test_portrait_blurry.png (Don't use this, it looks muddy)")

if __name__ == "__main__":
    test_upscale()