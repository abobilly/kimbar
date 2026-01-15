from PIL import Image

for name in ["dialogue_panel", "button_primary", "button_hover", "button_pressed"]:
    path = f"vendor/ui/golden/{name}.png"
    img = Image.open(path)
    print(name, img.size)
