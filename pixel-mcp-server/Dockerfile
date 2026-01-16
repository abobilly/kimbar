# Pixel-MCP Server - Containerized LibreSprite + MCP SSE Server
# For deployment on Railway or any Docker host

FROM python:3.11-slim-bookworm

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for LibreSprite
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools (if building from source)
    build-essential \
    cmake \
    ninja-build \
    git \
    # LibreSprite dependencies
    libx11-dev \
    libxcursor-dev \
    libxi-dev \
    libgl1-mesa-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libgif-dev \
    libjpeg-dev \
    libpng-dev \
    libtinyxml2-dev \
    libpixman-1-dev \
    libcurl4-openssl-dev \
    libwebp-dev \
    libarchive-dev \
    zlib1g-dev \
    # Virtual framebuffer for headless operation
    xvfb \
    # Runtime libs
    libgl1-mesa-glx \
    libglu1-mesa \
    curl \
    # Cleanup apt cache
    && rm -rf /var/lib/apt/lists/*

# Clone and build LibreSprite from source
# Pin to commit before CMake 4.1 requirement was added (2025-04-28)
WORKDIR /build
RUN git clone https://github.com/LibreSprite/LibreSprite.git && \
    cd LibreSprite && \
    git checkout 5770468d30fcced2a83e6b55e3b936c11072ad13 && \
    git submodule update --init --recursive && \
    mkdir build && cd build && \
    cmake -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/usr/local \
        -DWITH_WEBP_SUPPORT=ON \
        -DENABLE_UPDATER=OFF \
        .. && \
    ninja && \
    ninja install && \
    # Cleanup build directory to reduce image size
    cd / && rm -rf /build

# Create a wrapper script for headless LibreSprite execution
RUN echo '#!/bin/bash\nxvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" libresprite "$@"' > /usr/local/bin/libresprite-headless && \
    chmod +x /usr/local/bin/libresprite-headless

# Set up the MCP server
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .
COPY mcp_tools.py .

# Environment variables
ENV LIBRESPRITE_PATH=/usr/local/bin/libresprite-headless
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose the SSE port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the MCP SSE server
CMD ["python", "server.py"]
