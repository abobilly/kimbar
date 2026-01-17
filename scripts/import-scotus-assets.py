#!/usr/bin/env python3
"""
Import SCOTUS-specific source packs into vendor/ for registry + runtime sync.

Outputs:
  - vendor/tilesets/scotus_exterior_building.png
  - vendor/tilesets/scotus_architecture.png
  - vendor/tilesets/scotus_decor.png
  - vendor/tilesets/scotus_floors.png
  - vendor/props/exterior/scotus_exterior_building.png
"""

from __future__ import annotations

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]

SRC_SCOTUS = ROOT / "content" / "sources" / "scotus"
SRC_EXTERIOR = SRC_SCOTUS / "exterior_building_v2"
SRC_INTERIOR = SRC_SCOTUS / "interior_spliced"

SRC_EXTERIOR_ATLAS = SRC_EXTERIOR / "scotus_exterior_building.atlas.png"
SRC_INTERIOR_FILES = [
    SRC_INTERIOR / "scotus_architecture.png",
    SRC_INTERIOR / "scotus_decor.png",
    SRC_INTERIOR / "scotus_floors.png",
]

DST_TILESETS = ROOT / "vendor" / "tilesets"
DST_PROPS = ROOT / "vendor" / "props" / "exterior"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def copy_file(src: Path, dst: Path) -> bool:
    if not src.exists():
        return False
    ensure_dir(dst.parent)
    shutil.copy2(src, dst)
    return True


def main() -> None:
    copied = []
    skipped = []

    if copy_file(SRC_EXTERIOR_ATLAS, DST_TILESETS / "scotus_exterior_building.png"):
        copied.append("tileset.scotus_exterior_building")
    else:
        skipped.append(str(SRC_EXTERIOR_ATLAS))

    if copy_file(SRC_EXTERIOR_ATLAS, DST_PROPS / "scotus_exterior_building.png"):
        copied.append("prop.scotus_exterior_building")
    else:
        skipped.append(str(SRC_EXTERIOR_ATLAS))

    for src in SRC_INTERIOR_FILES:
        dest = DST_TILESETS / src.name
        if copy_file(src, dest):
            copied.append(dest.name)
        else:
            skipped.append(str(src))

    print("Imported SCOTUS assets:", len(copied))
    if skipped:
        print("Skipped missing:", len(set(skipped)))


if __name__ == "__main__":
    main()
