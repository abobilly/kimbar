import sys
from PIL import Image

path = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(path).convert("RGB")

if len(sys.argv) != 5:
    print("usage: ui_bbox.py x1 y1 x2 y2")
    sys.exit(1)

x1, y1, x2, y2 = map(int, sys.argv[1:])
region = img.crop((x1, y1, x2 + 1, y2 + 1))
w, h = region.size
pix = region.load()

min_x = w
min_y = h
max_x = -1
max_y = -1

for y in range(h):
    for x in range(w):
        r, g, b = pix[x, y]
        if r + g + b <= 10:
            continue
        if x < min_x: min_x = x
        if y < min_y: min_y = y
        if x > max_x: max_x = x
        if y > max_y: max_y = y

if max_x < 0:
    print("no non-black pixels found")
    sys.exit(0)

# Convert to full image coords
bx1 = x1 + min_x
by1 = y1 + min_y
bx2 = x1 + max_x
by2 = y1 + max_y

print(f"bbox: {bx1} {by1} {bx2} {by2} (w={bx2-bx1+1} h={by2-by1+1})")
