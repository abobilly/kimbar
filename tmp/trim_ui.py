from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src).convert("RGBA")

# row2 and row3
for name, x1, y1, x2, y2 in [
    ("row2", 630, 55, 810, 95),
    ("row3", 630, 95, 810, 135),
]:
    crop = img.crop((x1, y1, x2 + 1, y2 + 1))
    w, h = crop.size
    pix = crop.load()
    min_x = w
    min_y = h
    max_x = -1
    max_y = -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x > max_x: max_x = x
            if y > max_y: max_y = y
    print(name, "local bbox", min_x, min_y, max_x, max_y, "size", max_x-min_x+1, max_y-min_y+1)
    print(name, "global bbox", x1+min_x, y1+min_y, x1+max_x, y1+max_y)
