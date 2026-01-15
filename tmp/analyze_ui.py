from PIL import Image

path = r"C:\Users\andre\lawchuck\badgey.org\kimbar\vendor\ui\golden_ui_big.png"
img = Image.open(path).convert("RGB")
w, h = img.size
pix = img.load()

visited = bytearray(w * h)

def idx(x, y):
    return y * w + x

components = []

for y in range(h):
    for x in range(w):
        i = idx(x, y)
        if visited[i]:
            continue
        r, g, b = pix[x, y]
        if r + g + b <= 10:
            visited[i] = 1
            continue
        # BFS
        stack = [(x, y)]
        visited[i] = 1
        min_x = max_x = x
        min_y = max_y = y
        area = 0
        while stack:
            cx, cy = stack.pop()
            area += 1
            if cx < min_x: min_x = cx
            if cx > max_x: max_x = cx
            if cy < min_y: min_y = cy
            if cy > max_y: max_y = cy
            # neighbors
            for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                ni = idx(nx, ny)
                if visited[ni]:
                    continue
                rr, gg, bb = pix[nx, ny]
                if rr + gg + bb <= 10:
                    visited[ni] = 1
                    continue
                visited[ni] = 1
                stack.append((nx, ny))
        components.append((area, min_x, min_y, max_x, max_y))

# Filter and sort by area
components = [c for c in components if c[0] > 500]
components.sort(reverse=True)

print(f"image {w}x{h}, components: {len(components)}")
print("area, x1, y1, x2, y2, w, h")
for area, x1, y1, x2, y2 in components[:40]:
    print(f"{area}, {x1}, {y1}, {x2}, {y2}, {x2-x1+1}, {y2-y1+1}")
