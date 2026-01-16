# Pixel-MCP Server

A containerized LibreSprite MCP server for pixel art generation, deployable on Railway or any Docker host. Exposes pixel art capabilities via MCP over SSE (Server-Sent Events) for remote access by AI agents.

## Features

- **Headless LibreSprite**: Full pixel art engine running in batch mode
- **MCP over SSE**: Remote access via HTTP/SSE transport
- **Multi-agent support**: Multiple AI clients can connect simultaneously
- **Complete game asset pipeline**: Sprites, tilesets, props, and animations

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Basic Sprites** | create_sprite, export_sprite, list_sprites, delete_sprite, resize_sprite | General sprite management |
| **Drawing** | draw_pixel, draw_rect, draw_line, draw_ellipse, draw_polygon, flood_fill | Shape primitives |
| **Textures** | draw_pattern, apply_dither | Detailed textures and gradients |
| **Tilesets** | create_tileset, draw_on_tile, copy_tile, export_tileset | Game map tiles for LDtk/Tiled |
| **Props** | create_prop, export_prop | Game objects with standard sizes |
| **Animation** | add_frame, draw_on_frame, export_animated | Animated sprites and spritesheets |

## Deploy to Railway

Railway doesn't currently have a maintained 1-click template for this repo; use the manual steps below.

### Manual Railway Deployment

1. **Fork or clone this repository**

2. **Create a new Railway project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository
   - If deploying from the Kimbar monorepo, set the service root directory to `pixel-mcp-server`
   - Ensure the service builds with the `Dockerfile` (not Nixpacks), otherwise LibreSprite won't be installed and tool calls will fail

3. **Configure environment variables** (optional)
   ```
   PORT=8000  # Railway auto-sets this
   ```

4. **Deploy**
   - Railway will automatically detect the Dockerfile and build
   - Wait for the build to complete (LibreSprite compilation takes several minutes)

5. **Get your public URL**
   - Once deployed, go to Settings → Networking → Generate Domain
   - Your URL will be something like: `https://pixel-mcp-production.up.railway.app`

## Local Development

### Using Docker

```bash
# Build the image
docker build -t pixel-mcp .

# Run the container
docker run -p 8000:8000 pixel-mcp
```

### Without Docker (requires LibreSprite installed)

```bash
# Install dependencies
pip install -r requirements.txt

# Set LibreSprite path
export LIBRESPRITE_PATH=/path/to/libresprite

# Run the server
python server.py
```

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pixel-mcp": {
      "transport": {
        "type": "sse",
        "url": "https://YOUR-RAILWAY-URL.up.railway.app/sse"
      }
    }
  }
}
```

### Claude Code

Add to your project-root `.mcp.json`:

```json
{
  "mcpServers": {
    "pixel-mcp": {
      "type": "sse",
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/sse"
    }
  }
}
```

### Gemini CLI

Add to your `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "pixel-mcp": {
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/sse"
    }
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available tools |
| `/health` | GET | Health check |
| `/sse` | GET | SSE connection endpoint for MCP |
| `/message?session_id=<id>` | POST | Send MCP messages |

---

## MCP Tools Reference

### Basic Sprite Tools

#### create_sprite
Create a new pixel art canvas.

```json
{
  "width": 32,
  "height": 32,
  "color_mode": "rgba",
  "background_color": "#ffffff"
}
```

#### export_sprite
Export to PNG, GIF, or WebP with optional scaling.

```json
{
  "sprite_id": "abc123",
  "format": "png",
  "scale": 4
}
```

Returns base64-encoded image data.

---

### Drawing Primitives

#### draw_pixel
Draw a single pixel for fine details.

```json
{
  "sprite_id": "abc123",
  "x": 10,
  "y": 15,
  "color": "#ff0000"
}
```

#### draw_rect
Draw rectangles for backgrounds, borders, platforms.

```json
{
  "sprite_id": "abc123",
  "x": 0,
  "y": 0,
  "width": 16,
  "height": 16,
  "color": "#00ff00",
  "filled": true
}
```

#### draw_line
Draw lines for outlines, wood grain, cracks.

```json
{
  "sprite_id": "abc123",
  "x1": 0,
  "y1": 0,
  "x2": 15,
  "y2": 15,
  "color": "#8B4513",
  "thickness": 1
}
```

#### draw_ellipse
Draw circles/ellipses for coins, buttons, boulders.

```json
{
  "sprite_id": "abc123",
  "x": 2,
  "y": 2,
  "width": 12,
  "height": 12,
  "color": "#FFD700",
  "filled": true
}
```

#### draw_polygon
Draw any polygon for triangles, arrows, crystals, stars.

```json
{
  "sprite_id": "abc123",
  "points": [[8, 0], [16, 16], [0, 16]],
  "color": "#9400D3",
  "filled": true
}
```

#### flood_fill
Fill contiguous areas (paint bucket tool).

```json
{
  "sprite_id": "abc123",
  "x": 8,
  "y": 8,
  "color": "#00FF00",
  "tolerance": 0
}
```

---

### Texture Tools

#### draw_pattern
Draw repeating patterns for textures. **Essential for detailed tiles.**

Available patterns:
- `checkerboard` - Alternating squares (floors, chess boards)
- `stripes_h` - Horizontal stripes (wood planks, fabric)
- `stripes_v` - Vertical stripes (columns, bars)
- `stripes_d` - Diagonal stripes (caution tape)
- `dots` - Polka dots (decorative)
- `grid` - Grid lines (tiles, windows)
- `brick` - Brick/stone wall pattern
- `noise` - Random noise (gravel, dirt)

```json
{
  "sprite_id": "abc123",
  "x": 0,
  "y": 0,
  "width": 16,
  "height": 16,
  "pattern": "brick",
  "color1": "#8B4513",
  "color2": "#654321",
  "scale": 2
}
```

#### apply_dither
Apply dithering for smooth gradients in pixel art style.

Gradient directions: `vertical`, `horizontal`, `radial`

```json
{
  "sprite_id": "abc123",
  "x": 0,
  "y": 0,
  "width": 32,
  "height": 32,
  "color1": "#87CEEB",
  "color2": "#1E90FF",
  "gradient_direction": "vertical"
}
```

---

### Tileset Tools

For creating game map tilesets compatible with LDtk, Tiled, and Phaser.

#### create_tileset
Create a tileset grid.

```json
{
  "name": "forest_terrain",
  "columns": 8,
  "rows": 4,
  "tile_size": 16,
  "spacing": 0,
  "margin": 0
}
```

#### draw_on_tile
Draw on a specific tile using batch commands. Coordinates relative to tile.

```json
{
  "tileset_id": "abc123",
  "tile_index": 0,
  "commands": [
    {"type": "fill", "color": "#4a7c23"},
    {"type": "pattern", "pattern": "noise", "color1": "#4a7c23", "color2": "#3d6b1c", "scale": 1},
    {"type": "rect", "x": 0, "y": 14, "w": 16, "h": 2, "color": "#3d6b1c", "filled": true}
  ]
}
```

Available command types:
- `fill` - Fill entire tile with color
- `pixel` - Draw single pixel
- `rect` - Draw rectangle
- `line` - Draw line
- `ellipse` - Draw ellipse
- `pattern` - Apply pattern (noise, brick, checkerboard, etc.)

#### copy_tile
Copy a tile to create variations.

```json
{
  "tileset_id": "abc123",
  "source_index": 0,
  "target_index": 1
}
```

#### export_tileset
Export with metadata for game engines.

```json
{
  "tileset_id": "abc123",
  "format": "png",
  "scale": 1,
  "include_metadata": true
}
```

Returns image data + metadata:
```json
{
  "metadata": {
    "name": "forest_terrain",
    "tileWidth": 16,
    "tileHeight": 16,
    "columns": 8,
    "rows": 4,
    "tileCount": 32,
    "spacing": 0,
    "margin": 0
  }
}
```

---

### Prop Tools

For creating game objects with standard sizes.

#### create_prop
Create a prop with preset sizes.

Size presets:
| Preset | Dimensions | Use Cases |
|--------|------------|-----------|
| `tiny` | 8x8 | Particles, bullets, small items |
| `small` | 16x16 | Standard items, icons |
| `medium` | 32x32 | Characters, chests |
| `tall` | 16x32 | Standing characters, doors |
| `wide` | 32x16 | Platforms, benches |
| `large` | 48x48 | Large objects, bosses |
| `xlarge` | 64x64 | Very large objects |

Categories: `character`, `item`, `furniture`, `decoration`, `interactive`, `effect`, `ui`, `nature`, `building`

```json
{
  "name": "health_potion",
  "size_preset": "small",
  "category": "item"
}
```

#### export_prop
Export with optional hitbox metadata.

```json
{
  "prop_id": "abc123",
  "format": "png",
  "scale": 2,
  "include_hitbox": true,
  "hitbox": {"x": 2, "y": 2, "width": 12, "height": 12}
}
```

---

### Animation Tools

#### add_frame
Add animation frames. First call initializes animation.

```json
{
  "sprite_id": "abc123",
  "frame_duration": 100,
  "copy_from_frame": 0
}
```

#### draw_on_frame
Draw on specific animation frame (same commands as draw_on_tile).

```json
{
  "sprite_id": "abc123",
  "frame_index": 1,
  "commands": [
    {"type": "fill", "color": "#ff0000"}
  ]
}
```

#### export_animated
Export as animated GIF or spritesheet.

```json
{
  "sprite_id": "abc123",
  "format": "gif",
  "scale": 2
}
```

For spritesheet format, returns frame metadata:
```json
{
  "metadata": {
    "frameWidth": 32,
    "frameHeight": 32,
    "frames": 4,
    "durations": [100, 100, 100, 100]
  }
}
```

---

## Example Workflows

### Create a Grass Tile

```
1. create_tileset(name="terrain", columns=4, rows=4, tile_size=16)
2. draw_on_tile(tileset_id, tile_index=0, commands=[
     {"type": "fill", "color": "#4a7c23"},
     {"type": "pattern", "pattern": "noise", "color1": "#4a7c23", "color2": "#3d6b1c", "scale": 1}
   ])
3. export_tileset(tileset_id, include_metadata=true)
```

### Create a Coin Prop

```
1. create_prop(name="gold_coin", size_preset="small", category="item")
2. draw_ellipse(prop_id, x=2, y=2, width=12, height=12, color="#FFD700")
3. draw_ellipse(prop_id, x=4, y=4, width=8, height=8, color="#FFA500", filled=false)
4. export_prop(prop_id, scale=2)
```

### Create a Simple Animation

```
1. create_sprite(width=16, height=16)
2. add_frame(sprite_id, frame_duration=100)  # Initialize animation
3. draw_on_frame(sprite_id, frame_index=0, commands=[...])
4. add_frame(sprite_id, frame_duration=100, copy_from_frame=0)
5. draw_on_frame(sprite_id, frame_index=1, commands=[...])  # Modify for frame 2
6. export_animated(sprite_id, format="gif")
```

---

## Architecture

```
                    Railway Host
  ┌───────────────────────────────────────────┐
  │              Docker Container              │
  │  ┌─────────────────────────────────────┐  │
  │  │     FastAPI + SSE Server (8000)     │  │
  │  │                 │                    │  │
  │  │    MCP Protocol Handler             │  │
  │  │                 │                    │  │
  │  │  ┌──────────────┴──────────────┐   │  │
  │  │  │      LibreSprite Engine     │   │  │
  │  │  │    (xvfb + headless CLI)    │   │  │
  │  │  └─────────────────────────────┘   │  │
  │  └─────────────────────────────────────┘  │
  └───────────────────────────────────────────┘
           ▲              ▲              ▲
           │              │              │
     Claude Desktop  Gemini CLI   Claude Code
```

## Troubleshooting

### Build fails on Railway
- LibreSprite compilation requires significant resources
- Ensure Railway plan supports builds with 2GB+ RAM
- Check build logs for missing dependencies

### Connection timeout
- Verify the Railway service is running (check logs)
- Ensure "Generate Domain" was clicked in Railway settings
- Check if firewall/proxy is blocking SSE connections

### "Session not found"
- `/sse` sessions are stored in-memory, so `/sse` and `/message` must hit the same running instance
- Ensure the Railway service is running a single replica (and a single web worker, if you customize the server runner)

### Tools not working
- Check `/health` endpoint and confirm `runtime.libresprite.ok` is `true` (otherwise you're in PNG/PIL fallback mode)
- Verify LibreSprite is accessible: check container logs for startup errors
- Ensure workspace directory is writable

## License

MIT
