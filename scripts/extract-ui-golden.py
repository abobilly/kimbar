from pathlib import Path

from PIL import Image

SRC = Path("vendor/ui/golden_ui_big.png")
OUT_DIR = Path("vendor/ui/golden")

ASSETS = {
    "dialogue_panel": (441, 169, 616, 262),
}

BUTTONS = {
    "button_primary": (630, 5, 810, 55, (0, 0, 0, 0)),
    "button_hover": (633, 55, 810, 95, (0, 5, 3, 5)),
    "button_pressed": (634, 95, 806, 135, (0, 5, 8, 5)),
}


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, (x1, y1, x2, y2) in ASSETS.items():
        crop = img.crop((x1, y1, x2 + 1, y2 + 1))
        crop.save(OUT_DIR / f"{name}.png")

    button_size = (181, 51)
    for name, (x1, y1, x2, y2, pad) in BUTTONS.items():
        crop = img.crop((x1, y1, x2 + 1, y2 + 1))
        if crop.size != button_size:
            canvas = Image.new("RGBA", button_size, (0, 0, 0, 0))
            canvas.paste(crop, (pad[0], pad[1]))
            crop = canvas
        crop.save(OUT_DIR / f"{name}.png")


if __name__ == "__main__":
    main()
