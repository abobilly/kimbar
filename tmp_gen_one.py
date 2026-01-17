import asyncio
import httpx
import json
import base64
import sys
import os

SERVER_URL = "https://pixel-mcp-server-production.up.railway.app"
SSE_ENDPOINT = f"{SERVER_URL}/sse"

async def generate_tile(tile_id, palette, description):
    print(f"Generating {tile_id}...")
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
                            session_id = data.split("=")[1]
                            print(f"  Session ID: {session_id}")
                            await asyncio.sleep(1.0)
                            await send_msg("create_sprite", {"width": 32, "height": 32, "color_mode": "rgba"}, 1)
                            continue
                        
                        if session_id and data.startswith("{"):
                            msg = json.loads(data)
                            msg_id = msg.get("id")
                            
                            if msg_id == 1:
                                if "result" in msg and "content" in msg["result"]:
                                    text = msg["result"]["content"][0]["text"]
                                    inner = json.loads(text)
                                    sprite_id = inner["sprite_id"]
                                    print(f"  Sprite created: {sprite_id}")
                                    color = palette[0]
                                    await send_msg("draw_rectangle", {"sprite_id": sprite_id, "x": 0, "y": 0, "width": 32, "height": 32, "color": color, "filled": True}, 2)
                                else:
                                    print("  Failed to create sprite")
                                    return False
                            
                            elif msg_id == 2:
                                print("  Base filled")
                                await send_msg("export_sprite", {"sprite_id": sprite_id, "format": "png"}, 3)
                            
                            elif msg_id == 3:
                                print("  Exported")
                                if "result" in msg and "content" in msg["result"]:
                                    content = msg["result"]["content"]
                                    # Export tool usually returns the image data in a specific field or as an image item
                                    for item in content:
                                        if item.get("type") == "image":
                                            png_data = base64.b64decode(item["data"])
                                            os.makedirs("generated/tiles", exist_ok=True)
                                            with open(f"generated/tiles/{tile_id}.png", "wb") as f:
                                                f.write(png_data)
                                            print(f"  Saved to generated/tiles/{tile_id}.png")
                                            return True
                                        if item.get("type") == "text":
                                            # Check if it's base64 in text
                                            text = item["text"]
                                            try:
                                                inner = json.loads(text)
                                                if "data" in inner:
                                                    png_data = base64.b64decode(inner["data"])
                                                    os.makedirs("generated/tiles", exist_ok=True)
                                                    with open(f"generated/tiles/{tile_id}.png", "wb") as f:
                                                        f.write(png_data)
                                                    print(f"  Saved to generated/tiles/{tile_id}.png")
                                                    return True
                                            except:
                                                pass
                                return False
        except Exception as e:
            print(f"  Error: {e}")
            return False

async def main():
    # Generate the first P0 tile as a test
    success = await generate_tile(
        "tile.floor.marble.white_base",
        ["#F8F8F8", "#E8E8E8", "#D0D0D0", "#B0B0B0"],
        "Off-white marble with subtle gray veining"
    )
    if success:
        print("Success!")
    else:
        print("Failed.")

if __name__ == "__main__":
    asyncio.run(main())