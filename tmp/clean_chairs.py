from pathlib import Path
from PIL import Image

src = Path('tmp/tiles')
dst = Path('tmp/tiles_clean')
dst.mkdir(parents=True, exist_ok=True)
chairs = sorted([p for p in src.glob('*.png') if 'chair' in p.name])

for p in chairs:
    im = Image.open(p).convert('RGBA')
    w, h = im.size
    pix = im.load()
    alpha = [[pix[x, y][3] for x in range(w)] for y in range(h)]
    filled = 0
    removed = 0
    new_pixels = [[pix[x, y] for x in range(w)] for y in range(h)]

    for y in range(h):
        for x in range(w):
            a = alpha[y][x]
            neighbors = []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        if alpha[ny][nx] > 0:
                            neighbors.append((nx, ny))
            if a == 0:
                if len(neighbors) >= 5:
                    rs = gs = bs = 0
                    for nx, ny in neighbors:
                        r, g, b, _ = pix[nx, ny]
                        rs += r
                        gs += g
                        bs += b
                    count = len(neighbors)
                    new_pixels[y][x] = (rs // count, gs // count, bs // count, 255)
                    filled += 1
            else:
                if len(neighbors) == 0:
                    new_pixels[y][x] = (0, 0, 0, 0)
                    removed += 1

    out = Image.new('RGBA', (w, h))
    for y in range(h):
        for x in range(w):
            out.putpixel((x, y), new_pixels[y][x])

    out_path = dst / p.name
    out.save(out_path, 'PNG')
    print(f"{p.name}: filled {filled}, removed {removed} -> {out_path}")
