#!/usr/bin/env python3
"""
Import LPC packs into vendor/ and generate windows-doors mappings.

Outputs:
  - vendor/tilesets/lpc/terrains/* (PNG/TSX/TMX/TXT)
  - vendor/tilesets/lpc/victorian/* (PNG/TSX/TMX/TXT)
  - vendor/tilesets/lpc/windows-doors.png + windows-doors.objects.json
  - vendor/props/exterior/lpc_tree_*.png (32x32 downscaled)
  - vendor/props/exterior/lpc_*.png (windows/doors object crops)
  - content/tilesets/windows-doors.parts.json (object->parts mapping)
  - docs/credits/lpc-*/CREDITS-*.txt
"""

from __future__ import annotations

from pathlib import Path
import json
import re
import shutil
from typing import Dict, List

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

SRC_TERRAIN = ROOT / "content" / "sources" / "lpc" / "terrains-repacked"
SRC_VICTORIAN = ROOT / "content" / "sources" / "lpc" / "victorian-preview"
SRC_TREES = ROOT / "content" / "sources" / "lpc" / "trees"

SRC_WINDOWS_DOORS_JSON = SRC_VICTORIAN / "windows-doors.objects.json"
SRC_WINDOWS_DOORS_PNG = SRC_VICTORIAN / "windows-doors.png"

DST_TILESETS = ROOT / "vendor" / "tilesets" / "lpc"
DST_TERRAIN = DST_TILESETS / "terrains"
DST_VICTORIAN = DST_TILESETS / "victorian"
DST_WINDOWS_PNG = DST_TILESETS / "windows-doors.png"
DST_WINDOWS_JSON = DST_TILESETS / "windows-doors.objects.json"
VENDOR_TILESETS_ROOT = ROOT / "vendor" / "tilesets"
PUBLIC_TILESETS_ROOT = ROOT / "public" / "assets" / "tilesets"

DST_PROPS = ROOT / "vendor" / "props" / "exterior"

DST_TILESET_MAP_DIR = ROOT / "content" / "tilesets"
DST_TILESET_MAP = DST_TILESET_MAP_DIR / "windows-doors.parts.json"
DST_TILESET_REGISTRY = DST_TILESET_MAP_DIR / "tilesets.json"

DST_CREDITS = ROOT / "docs" / "credits"

COPY_EXTS = {".png", ".tsx", ".tmx", ".txt"}
TILE_SIZE = 32


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def is_mac_junk(path: Path) -> bool:
    return path.name.startswith("._") or path.name == ".DS_Store"


def copy_pack(src_dir: Path, dst_dir: Path) -> List[str]:
    copied: List[str] = []
    if not src_dir.exists():
        return copied
    ensure_dir(dst_dir)
    for path in sorted(src_dir.iterdir(), key=lambda p: p.name.lower()):
        if not path.is_file():
            continue
        if is_mac_junk(path):
            continue
        if path.suffix.lower() not in COPY_EXTS:
            continue
        dest = dst_dir / path.name
        shutil.copy2(path, dest)
        copied.append(dest.name)
    return copied


def copy_credits(src_dir: Path, dst_dir: Path) -> List[str]:
    copied: List[str] = []
    if not src_dir.exists():
        return copied
    ensure_dir(dst_dir)
    for path in sorted(src_dir.glob("CREDITS-*.txt")):
        if is_mac_junk(path):
            continue
        dest = dst_dir / path.name
        shutil.copy2(path, dest)
        copied.append(dest.name)
    return copied


def normalize_object_name(obj_id: str) -> str:
    base = obj_id
    if base.startswith("obj."):
        base = base[4:]
    base = base.replace(".", "_")
    base = re.sub(r"[^a-z0-9_]+", "_", base.lower())
    base = re.sub(r"_+", "_", base).strip("_")
    return base


def build_prop_filename(obj_id: str) -> str:
    return f"lpc_{normalize_object_name(obj_id)}.png"


def build_prop_id(filename: str) -> str:
    base = filename[:-4]
    return f"prop.{base}"


def extract_windows_doors() -> Dict[str, List[str]]:
    ensure_dir(DST_TILESETS)
    ensure_dir(DST_PROPS)
    ensure_dir(DST_TILESET_MAP_DIR)

    if SRC_WINDOWS_DOORS_PNG.exists():
        shutil.copy2(SRC_WINDOWS_DOORS_PNG, DST_WINDOWS_PNG)
    if SRC_WINDOWS_DOORS_JSON.exists():
        shutil.copy2(SRC_WINDOWS_DOORS_JSON, DST_WINDOWS_JSON)

    if not DST_WINDOWS_PNG.exists() or not DST_WINDOWS_JSON.exists():
        raise FileNotFoundError("Missing windows-doors PNG or objects JSON for import.")

    data = json.loads(DST_WINDOWS_JSON.read_text(encoding="utf-8"))
    objects = data.get("objects", {})
    tile_w = data.get("tileWidth", 32)
    tile_h = data.get("tileHeight", 32)
    img_w = data.get("imageWidth")
    img_h = data.get("imageHeight")
    tiles_per_row = img_w // tile_w if img_w and tile_w else 0

    image = Image.open(DST_WINDOWS_PNG).convert("RGBA")

    objects_map: Dict[str, Dict] = {}
    skipped: List[Dict[str, str]] = []
    cropped: List[str] = []

    for obj_id in sorted(objects.keys()):
        obj = objects[obj_id]
        confidence = obj.get("confidence", 1)
        if obj_id.startswith("cluster."):
            skipped.append({"id": obj_id, "reason": "cluster"})
            continue
        if confidence < 0.5:
            skipped.append({"id": obj_id, "reason": f"low_confidence_{confidence}"})
            continue
        if "tileX" not in obj or "tileY" not in obj or "tilesWide" not in obj or "tilesHigh" not in obj:
            skipped.append({"id": obj_id, "reason": "missing_tile_coords"})
            continue

        tile_x = int(obj["tileX"])
        tile_y = int(obj["tileY"])
        tiles_wide = int(obj["tilesWide"])
        tiles_high = int(obj["tilesHigh"])

        parts = []
        for dy in range(tiles_high):
            for dx in range(tiles_wide):
                part_tile_x = tile_x + dx
                part_tile_y = tile_y + dy
                tile_index = part_tile_y * tiles_per_row + part_tile_x
                parts.append(
                    {
                        "dx": dx,
                        "dy": dy,
                        "tileX": part_tile_x,
                        "tileY": part_tile_y,
                        "tileIndex": tile_index,
                    }
                )

        crop_x = int(obj.get("x", tile_x * tile_w))
        crop_y = int(obj.get("y", tile_y * tile_h))
        crop_w = int(obj.get("w", tiles_wide * tile_w))
        crop_h = int(obj.get("h", tiles_high * tile_h))
        crop = image.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))

        prop_filename = build_prop_filename(obj_id)
        prop_path = DST_PROPS / prop_filename
        crop.save(prop_path, "PNG")
        cropped.append(prop_filename)

        objects_map[obj_id] = {
            "tileX": tile_x,
            "tileY": tile_y,
            "tilesWide": tiles_wide,
            "tilesHigh": tiles_high,
            "pixelWidth": tiles_wide * tile_w,
            "pixelHeight": tiles_high * tile_h,
            "parts": parts,
            "propId": build_prop_id(prop_filename),
            "notes": obj.get("notes"),
        }

    mapping = {
        "schema": "kimbar.tileset.parts.v1",
        "image": "windows-doors.png",
        "tilesetPath": "/assets/tilesets/lpc/windows-doors.png",
        "tileWidth": tile_w,
        "tileHeight": tile_h,
        "columns": tiles_per_row,
        "rows": img_h // tile_h if img_h and tile_h else 0,
        "objects": objects_map,
        "skipped": skipped,
    }
    DST_TILESET_MAP.write_text(json.dumps(mapping, indent=2), encoding="utf-8")

    return {
        "cropped": cropped,
        "skipped": [s["id"] for s in skipped],
    }


def downscale_trees() -> List[str]:
    ensure_dir(DST_PROPS)
    outputs: List[str] = []

    for path in sorted(SRC_TREES.glob("*.png"), key=lambda p: p.name.lower()):
        if is_mac_junk(path):
            continue
        match = re.search(r"(\d+)", path.stem)
        if match:
            suffix = match.group(1).zfill(2)
            out_name = f"lpc_tree_{suffix}.png"
        else:
            out_name = f"lpc_{path.stem.lower()}.png"

        out_path = DST_PROPS / out_name
        with Image.open(path) as im:
            im = im.convert("RGBA")
            resized = im.resize((32, 32), resample=Image.NEAREST)
            resized.save(out_path, "PNG")
        outputs.append(out_name)

    return outputs


def normalize_slug(value: str) -> str:
    slug = value.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug


def build_tileset_id(rel_path: Path) -> str:
    parts = list(rel_path.parts[:-1]) + [rel_path.stem]
    if parts and parts[0] == "lpc":
        parts = parts[1:]
        prefix = "tileset.lpc_"
    else:
        prefix = "tileset."
    slug = "_".join(normalize_slug(part) for part in parts if part)
    return f"{prefix}{slug}"


def build_tileset_registry() -> List[Dict[str, object]]:
    ensure_dir(DST_TILESET_MAP_DIR)
    entries: List[Dict[str, object]] = []
    seen_urls: set[str] = set()
    seen_ids: set[str] = set()

    def resolve_tileset_key(rel_path: Path) -> str | None:
        rel = rel_path.as_posix()
        if rel == "lpc/floors.png":
            return "floor_tiles"
        if rel == "lpc/windows-doors.png":
            return "lpc_windows_doors"
        if rel == "scotus_tiles.png":
            return "scotus_tiles"
        return None

    if VENDOR_TILESETS_ROOT.exists():
        for path in sorted(VENDOR_TILESETS_ROOT.rglob("*.png")):
            if is_mac_junk(path):
                continue
            rel_path = path.relative_to(VENDOR_TILESETS_ROOT)
            url = f"/assets/tilesets/{rel_path.as_posix()}"
            if url in seen_urls:
                continue
            with Image.open(path) as im:
                width, height = im.size
            entry_id = build_tileset_id(rel_path)
            if entry_id in seen_ids:
                raise ValueError(f"Duplicate tileset id: {entry_id}")

            entry = {
                "id": entry_id,
                "url": url,
                "tileWidth": TILE_SIZE,
                "tileHeight": TILE_SIZE,
                "imageWidth": width,
                "imageHeight": height,
                "columns": width // TILE_SIZE,
                "rows": height // TILE_SIZE,
            }
            key = resolve_tileset_key(rel_path)
            if key:
                entry["key"] = key
            if rel_path.name == "windows-doors.png":
                entry["partsUrl"] = "/content/tilesets/windows-doors.parts.json"

            entries.append(entry)
            seen_urls.add(url)
            seen_ids.add(entry_id)

    if PUBLIC_TILESETS_ROOT.exists():
        for path in sorted(PUBLIC_TILESETS_ROOT.rglob("*.png")):
            if is_mac_junk(path):
                continue
            rel_path = path.relative_to(PUBLIC_TILESETS_ROOT)
            url = f"/assets/tilesets/{rel_path.as_posix()}"
            if url in seen_urls:
                continue
            with Image.open(path) as im:
                width, height = im.size
            entry_id = build_tileset_id(rel_path)
            if entry_id in seen_ids:
                raise ValueError(f"Duplicate tileset id: {entry_id}")

            entry = {
                "id": entry_id,
                "url": url,
                "tileWidth": TILE_SIZE,
                "tileHeight": TILE_SIZE,
                "imageWidth": width,
                "imageHeight": height,
                "columns": width // TILE_SIZE,
                "rows": height // TILE_SIZE,
            }
            key = resolve_tileset_key(rel_path)
            if key:
                entry["key"] = key
            entries.append(entry)
            seen_urls.add(url)
            seen_ids.add(entry_id)

    entries.sort(key=lambda item: item["id"])
    payload = {
        "schema": "kimbar.tileset.registry.v1",
        "tileSize": TILE_SIZE,
        "tilesets": entries,
    }
    DST_TILESET_REGISTRY.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return entries


def main() -> None:
    terrain_files = copy_pack(SRC_TERRAIN, DST_TERRAIN)
    victorian_files = copy_pack(SRC_VICTORIAN, DST_VICTORIAN)

    credits_terrain = copy_credits(SRC_TERRAIN, DST_CREDITS / "lpc-terrains")
    credits_victorian = copy_credits(SRC_VICTORIAN, DST_CREDITS / "lpc-victorian")

    doors_result = extract_windows_doors()
    trees = downscale_trees()

    tilesets = build_tileset_registry()

    print("Imported terrains:", len(terrain_files))
    print("Imported victorian:", len(victorian_files))
    print("Windows/doors cropped:", len(doors_result["cropped"]))
    print("Windows/doors skipped:", len(doors_result["skipped"]))
    print("Trees downscaled:", len(trees))
    print("Tilesets indexed:", len(tilesets))
    print("Credits copied:", len(credits_terrain) + len(credits_victorian))


if __name__ == "__main__":
    main()
