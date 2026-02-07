---
name: Copilot-Expert
description: Architecture and implementation guidance for GitHub Copilot SDK and Copilot CLI in 2026 Technical Preview workflows. Use when prompts mention Copilot SDK, Copilot CLI, /mcp, /delegate, MCP servers, or AI integration design and execution.
---

# Level 1 Trigger Logic

1. If the request mentions Copilot SDK, SDK client code, or embedding agent capabilities in an app, load `sdk-reference.md`.
2. If the request mentions Copilot CLI, slash commands, `/mcp`, `/delegate`, task delegation, or MCP CLI config, load `cli-reference.md`.
3. If the request is broad AI integration architecture, load both references and synthesize a single recommendation.
4. Keep this file as trigger-level routing only; keep detailed APIs and workflows in the reference files.
