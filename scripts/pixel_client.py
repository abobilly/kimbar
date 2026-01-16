import asyncio
import json
import httpx
import sys

SERVER_URL = "https://pixel-mcp-server-production.up.railway.app"
SSE_ENDPOINT = f"{SERVER_URL}/sse"

async def send_command(session_id):
    # Give the server a moment to ensure the session is fully registered
    await asyncio.sleep(0.5)
    
    url = f"{SERVER_URL}/message?session_id={session_id}"
    print(f"🚀 Sending command to: {url}")
    
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "create_sprite",
            "arguments": {
                "width": 16,
                "height": 16,
                "color_mode": "rgba"
            }
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
             print(f"❌ POST Error: {resp.status_code} {resp.text}")
        else:
             print("✅ Command sent.")

async def run_client():
    print(f"🔌 Connecting to {SSE_ENDPOINT}...")
    
    # Infinite read timeout for SSE
    timeout = httpx.Timeout(60.0, read=None) 
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("GET", SSE_ENDPOINT) as response:
            print("Connected to stream.")
            
            session_id = None
            command_task = None
            
            async for line in response.aiter_lines():
                if not line: continue
                
                if line.startswith("data:"):
                    data = line[5:].strip()
                    
                    # Check for session endpoint
                    if "?session_id=" in data and not session_id:
                        session_id = data.split("=")[1]
                        print(f"✅ Session ID: {session_id}")
                        # Launch command sender in background to not block the reader
                        command_task = asyncio.create_task(send_command(session_id))
                        continue
                    
                    # Check for tool result
                    try:
                        msg = json.loads(data)
                        if msg.get("id") == 1:
                            print("\n✨ RESULT RECEIVED:")
                            print(json.dumps(msg, indent=2))
                            
                            if "result" in msg and "content" in msg["result"]:
                                try:
                                    inner = json.loads(msg["result"]["content"][0]["text"])
                                    print("\n📦 Parsed Content:")
                                    print(json.dumps(inner, indent=2))
                                except:
                                    pass
                            return
                    except json.JSONDecodeError:
                        pass
                
                # Keepalive handling (optional)
                if line.startswith("event: ping"):
                    # print("Ping")
                    pass

if __name__ == "__main__":
    try:
        asyncio.run(run_client())
    except KeyboardInterrupt:
        print("\nDisconnected.")