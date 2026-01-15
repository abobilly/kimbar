from PIL import Image

src = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(src)
img.crop((252, 128, 525 + 1, 170 + 1)).save(r"C:\Users\andre\lawchuck\badgey.org\kimbar\tmp\crop_frame_mid_rect_full.png")
