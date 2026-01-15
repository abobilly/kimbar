from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src)

# Attempt crop for top long button
img.crop((600, 12, 780, 50)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\crop_button_long1.png")
# Attempt crop for middle long button
img.crop((600, 52, 780, 90)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\crop_button_long2.png")
# Attempt crop for short button block (right)
img.crop((790, 12, 852, 48)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\crop_button_short1.png")
