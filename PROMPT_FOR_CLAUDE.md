# Role
You are an expert DevOps Engineer and Model Context Protocol (MCP) Architect.

# Objective
Containerize the `pixel-mcp` server so it can be deployed on **Railway** (or any Docker host) and accessed remotely by AI agents (Claude Desktop, Gemini CLI, etc.).

# Context
I am on Windows and want to avoid installing local dependencies like Aseprite/LibreSprite. I prefer a "set and forget" cloud service hosted on Railway that exposes pixel art capabilities via MCP.

# Technical Requirements

1.  **Docker Image (`Dockerfile`)**
    *   **Base**: Use a lightweight Linux base (e.g., `python:3.11-slim` or `debian:bookworm-slim`).
    *   **Pixel Engine**: Install `LibreSprite` (free fork of Aseprite).
        *   *Note*: You may need to build from source or use a pre-built AppImage/binary suitable for headless Linux.
        *   *Headless*: Ensure it runs in `--batch` mode. Include `xvfb` only if strictly necessary to satisfy display dependencies.
    *   **MCP Server**: Setup the `pixel-mcp` logic.
        *   *Assumption*: If `pixel-mcp` is a Python package, `pip install` it. If it's a binary, download the Linux `amd64` version. (If the specific repo isn't known, provide a placeholder or generic "Aseprite MCP" implementation in Python).
    *   **Transport Layer (CRITICAL)**:
        *   Standard MCP servers usually communicate via `stdio`.
        *   **Requirement**: Wrap the functionality in an **SSE (Server-Sent Events)** HTTP server so it works over the web on Railway.
        *   Use `fastapi` + `mcp` (Python SDK) or `starlette` to expose an endpoint (e.g., `/sse`) that proxies the MCP protocol.

2.  **Deployment**
    *   Target Platform: **Railway**.
    *   Port: Expose standard port (e.g., `8000`).

3.  **Client Integration**
    *   Provide the configuration snippet for `claude_desktop_config.json` (or `mcp-servers.json`) to connect to the remote Railway URL.

# Deliverables
1.  `Dockerfile`: The complete build definition.
2.  `server.py`: The entrypoint script (FastAPI/SSE wrapper).
3.  `requirements.txt`: Python dependencies.
4.  `README.md`: Short instructions for "One Click" deployment to Railway.

# Constraints
- The solution must be **headless**.
- It must allow **multiple agents** (Claude, Gemini) to connect via the public URL.