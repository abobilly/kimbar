import asyncio
import httpx
import json
import base64
import sys
import os
import argparse
from pathlib import Path

SERVER_URL = "https://pixel-mcp-server-production.up.railway.app"
SSE_ENDPOINT = f"{SERVER_URL}/sse"

class RobustTileGenerator:
    def __init__(self, output_dir="generated/tiles"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    async def generate_tile(self, tile_spec):
        tile_id = tile_spec["id"]
        category = tile_spec.get("category", "")
        subcategory = tile_spec.get("subcategory", "")
        palette = tile_spec.get("palette", ["#FFFFFF"])
        description = tile_spec.get("description", "")
        
        print(f"\nProcessing {tile_id}...")
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, read=None)) as client:
            try:
                async with client.stream("GET", SSE_ENDPOINT) as sse_response:
                    session_id = None
                    sprite_id = None
                    
                    async def send_msg(name, args, msg_id):
                        url = f"{SERVER_URL}/message?session_id={session_id}"
                        payload = {
                            "jsonrpc": "2.0",
                            "id": msg_id,
                            "method": "tools/call",
                            "params": {"name": name, "arguments": args}
                        }
                        return await client.post(url, json=payload)

                    async for line in sse_response.aiter_lines():
                        if not line: continue
                        if line.startswith("data:"):
                            data = line[5:].strip()
                            
                            if "?session_id=" in data and not session_id:
                                session_id = data.split("=")[1].strip().strip('"').strip('}')
                                print(f"  Session: {session_id[:8]}...")
                                await asyncio.sleep(1.0)
                                await send_msg("create_sprite", {"width": 32, "height": 32, "color_mode": "rgba"}, 1)
                                continue
                            
                            if session_id and data.startswith("{"):
                                try: msg = json.loads(data)
                                except: continue
                                
                                msg_id = msg.get("id")
                                if "error" in msg:
                                    print(f"  Error in tool {msg_id}: {msg['error']}")
                                    return False
                                
                                if msg_id == 1: # create_sprite result
                                    text = msg["result"]["content"][0]["text"]
                                    inner = json.loads(text)
                                    sprite_id = inner["sprite_id"]
                                    print(f"  Sprite: {sprite_id}")
                                    color = palette[1] if len(palette) > 1 else palette[0]
                                    await send_msg("draw_rectangle", {
                                        "sprite_id": sprite_id, "x": 0, "y": 0, "width": 32, "height": 32, 
                                        "color": color, "filled": True
                                    }, 2)
                                
                                elif msg_id == 2: # draw_rectangle result (base)
                                    # Category-specific details
                                    if category == "floor":
                                        if "marble" in subcategory:
                                            vein_color = palette[2] if len(palette) > 2 else "#D0D0D0"
                                            pixels = []
                                            for i in range(0, 32, 8):
                                                for j in range(3):
                                                    x, y = i + j, i + j + 2
                                                    if 0 <= x < 32 and 0 <= y < 32: pixels.append([x, y, vein_color])
                                            await send_msg("draw_pixels", {"sprite_id": sprite_id, "pixels": pixels}, 10)
                                        elif "wood" in subcategory:
                                            seam_color = palette[-1]
                                            for x in [7, 15, 23]:
                                                await send_msg("draw_line", {"sprite_id": sprite_id, "x1": x, "y1": 0, "x2": x, "y2": 31, "color": seam_color}, 10)
                                        else: await send_msg("draw_pixels", {"sprite_id": sprite_id, "pixels": [[0,0,palette[0]]]}, 10) # dummy
                                    elif category == "wall":
                                        shadow_color = palette[-1]
                                        await send_msg("draw_rectangle", {"sprite_id": sprite_id, "x": 0, "y": 30, "width": 32, "height": 2, "color": shadow_color, "filled": True}, 10)
                                    elif category == "trim":
                                        highlight_color = palette[0]
                                        await send_msg("draw_line", {"sprite_id": sprite_id, "x1": 0, "y1": 0, "x2": 31, "y2": 0, "color": highlight_color}, 10)
                                    elif category == "steps":
                                        highlight_color = palette[0]
                                        await send_msg("draw_line", {"sprite_id": sprite_id, "x1": 0, "y1": 2, "x2": 31, "y2": 2, "color": highlight_color}, 10)
                                    else:
                                        # Default object placeholder
                                        main_color = palette[0]
                                        await send_msg("draw_rectangle", {"sprite_id": sprite_id, "x": 8, "y": 8, "width": 16, "height": 16, "color": main_color, "filled": True}, 10)
                                
                                elif msg_id == 10: # detail result
                                    await send_msg("export_sprite", {"sprite_id": sprite_id, "format": "png"}, 20)
                                
                                elif msg_id == 20: # export result
                                    if "result" in msg and "content" in msg["result"]:
                                        content = msg["result"]["content"]
                                        img_data = None
                                        for item in content:
                                            if item.get("type") == "image": img_data = base64.b64decode(item["data"])
                                            elif item.get("type") == "text":
                                                try:
                                                    inner = json.loads(item["text"])
                                                    if "data" in inner: img_data = base64.b64decode(inner["data"])
                                                except: pass
                                        if img_data:
                                            out_path = self.output_dir / f"{tile_id}.png"
                                            out_path.write_bytes(img_data)
                                            print(f"  Saved to {out_path}")
                                            return True
                                    return False
            except Exception as e:
                print(f"  Error: {e}")
                return False
        return False

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="content/ai_jobs/tileset_manifest.json")
    parser.add_argument("--priority", default="P0")
    args = parser.parse_args()
    
    with open(args.manifest, "r") as f: manifest = json.load(f)
    tiles = [t for t in manifest.get("tiles", []) if t.get("priority") == args.priority]
    print(f"Generating {len(tiles)} tiles with priority {args.priority}")
    generator = RobustTileGenerator()
    for tile in tiles:
        await generator.generate_tile(tile)
        await asyncio.sleep(0.3)

if __name__ == "__main__":
    asyncio.run(main())