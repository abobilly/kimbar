from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src).convert("RGBA")

# Button crops (global bboxes)
buttons = {
    "button_primary": (630, 5, 810, 55),
    "button_hover": (633, 55, 810, 95),
    "button_pressed": (634, 95, 806, 135),
}

out_dir = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden"

for name, (x1, y1, x2, y2) in buttons.items():
    crop = img.crop((x1, y1, x2 + 1, y2 + 1))
    crop.save(f"{out_dir}\\{name}.png")
    print(name, crop.size)
