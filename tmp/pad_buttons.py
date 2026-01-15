from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src).convert("RGBA")

# Target width/height
W, H = 181, 51

# Crops and pad sizes (left, top, right, bottom)
entries = {
    "button_primary": (630, 5, 810, 55, (0, 0, 0, 0)),
    "button_hover": (633, 55, 810, 95, (0, 5, 3, 5)),
    "button_pressed": (634, 95, 806, 135, (0, 5, 8, 5)),
}

out_dir = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden"

for name, (x1, y1, x2, y2, pad) in entries.items():
    crop = img.crop((x1, y1, x2 + 1, y2 + 1))
    if crop.size != (W, H):
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        canvas.paste(crop, (pad[0], pad[1]))
        crop = canvas
    crop.save(f"{out_dir}\\{name}.png")
    print(name, crop.size)
