"""
Pixel-MCP SSE Server - FastAPI wrapper for MCP over Server-Sent Events

This server exposes LibreSprite pixel art capabilities via the MCP protocol
over HTTP/SSE for remote access from AI agents.
"""
import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

import mcp_tools

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("pixel-mcp")

# Server info
SERVER_NAME = "pixel-mcp"
SERVER_VERSION = "1.0.0"
MCP_VERSION = "2024-11-05"

# Session storage for SSE connections
sessions: dict[str, dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {SERVER_NAME} v{SERVER_VERSION}")
    await mcp_tools.ensure_workspace()
    yield
    logger.info("Shutting down pixel-mcp server")


app = FastAPI(
    title="Pixel-MCP Server",
    description="LibreSprite pixel art capabilities via MCP over SSE",
    version=SERVER_VERSION,
    lifespan=lifespan
)

# CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_mcp_response(id: str | int | None, result: Any = None, error: dict | None = None) -> dict:
    """Create a JSON-RPC 2.0 response."""
    response = {"jsonrpc": "2.0", "id": id}
    if error:
        response["error"] = error
    else:
        response["result"] = result
    return response


def create_mcp_error(id: str | int | None, code: int, message: str, data: Any = None) -> dict:
    """Create a JSON-RPC 2.0 error response."""
    error = {"code": code, "message": message}
    if data:
        error["data"] = data
    return create_mcp_response(id, error=error)


async def handle_initialize(params: dict) -> dict:
    """Handle MCP initialize request."""
    return {
        "protocolVersion": MCP_VERSION,
        "capabilities": {
            "tools": {},
            "resources": {},
            "prompts": {}
        },
        "serverInfo": {
            "name": SERVER_NAME,
            "version": SERVER_VERSION
        }
    }


async def handle_list_tools(params: dict) -> dict:
    """Handle tools/list request."""
    tools = []
    for name, tool_def in mcp_tools.TOOLS.items():
        tools.append({
            "name": name,
            "description": tool_def["description"],
            "inputSchema": tool_def["parameters"]
        })
    return {"tools": tools}


async def handle_call_tool(params: dict) -> dict:
    """Handle tools/call request."""
    tool_name = params.get("name")
    arguments = params.get("arguments", {})

    if tool_name not in mcp_tools.TOOLS:
        raise ValueError(f"Unknown tool: {tool_name}")

    tool_fn = mcp_tools.TOOLS[tool_name]["function"]
    result = await tool_fn(**arguments)

    # Format as MCP tool result
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(result, indent=2)
            }
        ],
        "isError": not result.get("success", True)
    }


async def handle_list_resources(params: dict) -> dict:
    """Handle resources/list request."""
    return {"resources": []}


async def handle_list_prompts(params: dict) -> dict:
    """Handle prompts/list request."""
    return {"prompts": []}


# MCP method handlers
MCP_HANDLERS = {
    "initialize": handle_initialize,
    "initialized": lambda p: {},  # Notification, no response needed
    "tools/list": handle_list_tools,
    "tools/call": handle_call_tool,
    "resources/list": handle_list_resources,
    "prompts/list": handle_list_prompts,
    "ping": lambda p: {},
}


async def process_mcp_message(message: dict) -> dict | None:
    """Process an MCP JSON-RPC message and return response."""
    msg_id = message.get("id")
    method = message.get("method")
    params = message.get("params", {})

    logger.info(f"Processing MCP method: {method}")

    # Handle notifications (no id = no response expected)
    if msg_id is None and method == "initialized":
        return None

    handler = MCP_HANDLERS.get(method)
    if not handler:
        return create_mcp_error(msg_id, -32601, f"Method not found: {method}")

    try:
        result = await handler(params)
        return create_mcp_response(msg_id, result)
    except Exception as e:
        logger.exception(f"Error handling {method}")
        return create_mcp_error(msg_id, -32603, str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    runtime = mcp_tools.get_runtime_health()
    status = "healthy" if runtime["ok"] else "degraded"
    return JSONResponse(
        status_code=200,
        content={"status": status, "server": SERVER_NAME, "version": SERVER_VERSION, "runtime": runtime},
    )


@app.get("/sse")
async def sse_endpoint(request: Request):
    """
    SSE endpoint for MCP communication.

    The client connects here to receive server events.
    Messages are sent via POST to /message with session_id.
    """
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "queue": asyncio.Queue(),
        "connected": True
    }

    logger.info(f"New SSE session: {session_id}")

    async def event_generator():
        # Send the session endpoint info first
        yield {
            "event": "endpoint",
            "data": f"/message?session_id={session_id}"
        }

        try:
            while sessions.get(session_id, {}).get("connected", False):
                try:
                    # Wait for messages with timeout
                    message = await asyncio.wait_for(
                        sessions[session_id]["queue"].get(),
                        timeout=30.0
                    )
                    yield {
                        "event": "message",
                        "data": json.dumps(message)
                    }
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"event": "ping", "data": ""}
                except Exception as e:
                    logger.error(f"SSE error: {e}")
                    break
        finally:
            if session_id in sessions:
                sessions[session_id]["connected"] = False
                del sessions[session_id]
            logger.info(f"SSE session closed: {session_id}")

    return EventSourceResponse(event_generator())


@app.post("/message")
async def message_endpoint(request: Request, session_id: str):
    """
    Receive MCP messages from client and queue responses.

    Messages are JSON-RPC 2.0 format.
    """
    if session_id not in sessions:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )

    try:
        body = await request.json()
        logger.debug(f"Received message: {body}")

        response = await process_mcp_message(body)

        if response:
            # Queue the response for SSE delivery
            await sessions[session_id]["queue"].put(response)

        return JSONResponse(content={"status": "ok"})

    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON"}
        )
    except Exception as e:
        logger.exception("Error processing message")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/")
async def root():
    """Root endpoint with server info."""
    return {
        "name": SERVER_NAME,
        "version": SERVER_VERSION,
        "mcp_version": MCP_VERSION,
        "description": "LibreSprite pixel art capabilities via MCP over SSE",
        "endpoints": {
            "sse": "/sse",
            "message": "/message?session_id=<id>",
            "health": "/health"
        },
        "tools": list(mcp_tools.TOOLS.keys())
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
