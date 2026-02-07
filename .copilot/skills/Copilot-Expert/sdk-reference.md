# Copilot SDK Reference (2026 Technical Preview)

## Snapshot (verified February 6, 2026)
- Repository: `github/copilot-sdk`
- Status: marked as Technical Preview in repo docs.
- Latest observed commit in local clone: `439e0f0` on `2026-02-06`.

## Core Architecture
- The SDK wraps Copilot CLI over JSON-RPC.
- Your app talks to `CopilotClient`; the client starts or connects to a CLI server.
- You create sessions, send prompts, receive event streams, and manage tools/hooks.

## Node.js Initialization Pattern

```ts
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient({
  // Optional:
  // cliPath: "copilot",
  // cliUrl: "http://127.0.0.1:8080", // connect to existing CLI server
  // githubToken: process.env.COPILOT_GITHUB_TOKEN,
  // useLoggedInUser: false,
});

await client.start();

const session = await client.createSession({
  model: "gpt-5",
});

session.on("assistant.message", (event) => {
  console.log(event.data.content);
});

await session.send({ prompt: "Explain this repository structure." });

await session.destroy();
await client.stop();
```

## Python Initialization Pattern

```py
import asyncio
from copilot import CopilotClient

async def main():
    client = CopilotClient({
        # Optional:
        # "cli_url": "http://127.0.0.1:8080",
        # "github_token": "...",
        # "use_logged_in_user": False,
    })
    await client.start()

    session = await client.create_session({"model": "gpt-5"})

    def on_event(event):
        if event.type.value == "assistant.message":
            print(event.data.content)

    session.on(on_event)
    await session.send({"prompt": "Summarize current auth options."})

    await session.destroy()
    await client.stop()

asyncio.run(main())
```

## CopilotClient API Surface (practical subset)
- Client lifecycle: `start()`, `stop()`, `forceStop()`.
- Session lifecycle: `createSession/create_session`, `resumeSession`, `listSessions`, `deleteSession`.
- Messaging: `send`, `sendAndWait` (or `send_and_wait`), `abort`, `getMessages/get_messages`.
- Eventing: subscribe to typed events like `assistant.message`, `assistant.message_delta`, `tool.execution_start`, `tool.execution_complete`, `session.idle`.
- Model control: session-level `model`, optional `reasoningEffort`/`reasoning_effort`.
- Extensibility: custom tools, hooks, custom agents, skills directories, MCP servers.

## Session Config Patterns You Will Reuse
- `model`: required when using custom provider.
- `tools`: register local tool handlers.
- `provider`: BYOK/custom model endpoint config.
- `mcpServers`/`mcp_servers`: connect local stdio servers or remote HTTP/SSE servers.
- `infiniteSessions`: background compaction for long-running sessions.
- `onUserInputRequest`: enable `ask_user` behavior in app-hosted flows.

## MCP with CopilotClient

### Node.js example

```ts
const session = await client.createSession({
  model: "gpt-5",
  mcpServers: {
    filesystem: {
      type: "local",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      tools: ["*"],
      timeout: 30000,
    },
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: { Authorization: "Bearer ${TOKEN}" },
      tools: ["*"],
    },
  },
});
```

### MCP config keys
- Local/stdio: `type`, `command`, `args`, optional `env`, `cwd`, `tools`, `timeout`.
- Remote HTTP/SSE: `type`, `url`, optional `headers`, `tools`, `timeout`.
- Tool filter semantics: `tools: ["*"]` for all tools, `tools: []` for none.

## Authentication Flows (2026)

### 1) Signed-in CLI user (default interactive)
- User logs in once with Copilot CLI device flow.
- SDK reuses stored credentials.

### 2) OAuth GitHub App user token
- Your app runs OAuth flow.
- Pass token via `githubToken` / `github_token`.
- Set `useLoggedInUser` / `use_logged_in_user` to `false` when you want strict explicit-token behavior.

### 3) Environment variable token auth
- Priority: `COPILOT_GITHUB_TOKEN` -> `GH_TOKEN` -> `GITHUB_TOKEN`.
- Useful for CI/CD or server processes.

### 4) BYOK (no Copilot subscription required)
- Use `provider` with your OpenAI/Azure/Anthropic-compatible endpoint.
- `baseUrl`/`base_url` is required.
- `bearerToken`/`bearer_token` takes precedence over API key.
- Azure endpoints must use provider type `azure`.

## Authentication Priority Order
1. Explicit SDK token (`githubToken`)
2. HMAC key (`CAPI_HMAC_KEY` or `COPILOT_HMAC_KEY`)
3. Direct API token (`GITHUB_COPILOT_API_TOKEN` + `COPILOT_API_URL`)
4. Env tokens (`COPILOT_GITHUB_TOKEN` -> `GH_TOKEN` -> `GITHUB_TOKEN`)
5. Stored OAuth credentials
6. GitHub CLI auth (`gh auth`)

## Notes for Architects
- The SDK and CLI are fast-moving preview surfaces; pin versions and test integration contracts per release.
- `/mcp` and `/delegate` are CLI workflows; in SDK apps you usually implement equivalent behavior via session config and orchestration logic.
- Inference: exact behavior for some UI slash commands can change quickly between prereleases; validate in current changelog before rollout.
