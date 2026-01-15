from pathlib import Path

from PIL import Image

SRC = Path("vendor/ui/golden_ui_big.png")
OUT_DIR = Path("vendor/ui/golden")

ASSETS = {
    "dialogue_panel": (441, 169, 616, 262),
    "button_primary": (632, 5, 810, 55),
    "button_hover": (630, 55, 810, 95),
    "button_pressed": (630, 95, 810, 135),
}


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, (x1, y1, x2, y2) in ASSETS.items():
        crop = img.crop((x1, y1, x2 + 1, y2 + 1))
        crop.save(OUT_DIR / f"{name}.png")


if __name__ == "__main__":
    main()
