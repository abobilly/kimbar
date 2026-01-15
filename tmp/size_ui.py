from PIL import Image

for name in ["button_primary", "button_hover", "button_pressed"]:
    img = Image.open(f"vendor/ui/golden/{name}.png")
    print(name, img.size)
