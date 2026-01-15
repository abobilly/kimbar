from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src)

img.crop((630, 55, 810 + 1, 95 + 1)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\button_row2.png")
img.crop((630, 95, 810 + 1, 135 + 1)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\button_row3.png")
img.crop((630, 135, 810 + 1, 175 + 1)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\button_row4.png")
