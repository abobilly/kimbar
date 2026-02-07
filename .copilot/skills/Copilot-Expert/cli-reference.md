# Copilot CLI Reference (2026 Preview): `/mcp`, `/delegate`, Task Delegation

## Snapshot (verified February 6, 2026)
- Repository: `github/copilot-cli`
- Latest changelog entry: `0.0.405` dated `2026-02-05`.
- CLI is still described as early/public preview and changes rapidly.

## `/delegate` Workflow

### What `/delegate` does
- Delegates work asynchronously to Copilot coding agent.
- Initial behavior (introduced in `0.0.353`, 2025-10-28): unstaged changes are committed to a new branch, a PR is opened, and work continues in background.

### Key 2026 updates
- `0.0.394` (2026-01-24): `/delegate` accepts an optional prompt and uses conversation context.
- `0.0.394` (2026-01-24): supports GitHub Enterprise Cloud (`*.ghe.com`).
- `0.0.404` (2026-02-05): messaging for `/delegate` clarified.
- `0.0.354` (2025-11-03): fixed behavior when no local changes exist.

### Fast delegation shortcut
- `0.0.389` (2026-01-22): `&` prefix is equivalent to `/delegate` for background execution.

### Related task management
- `0.0.404` (2026-02-05): `/tasks` command added to view/manage background tasks.
- `0.0.404` (2026-02-05): background agents enabled for all users.

## `/mcp` Workflow

### Observed CLI capabilities from changelog
- `/mcp show` lists configured MCP servers (including defaults, additional config, plugin-provided servers).
- `/mcp show <server-name>` shows server details and available tools.
- `/mcp add` supports entering full server startup command in one field.

### MCP auth and remote compatibility
- `0.0.389` (2026-01-22): OAuth 2.0 for MCP servers with automatic token management/refresh.
- `0.0.400` (2026-01-30): improved compatibility for remote OAuth-based MCP servers.

### MCP config formats
- `0.0.401` (2026-02-03): supports Claude-style `.mcp.json` without `mcpServers` wrapper.
- Existing config location reference: `~/.copilot/mcp-config.json`.

## Session-Level MCP Overrides

Use CLI startup overrides with `--additional-mcp-config`.

```bash
copilot --additional-mcp-config '{"mcpServers": {"my-tool": {...}}}'
copilot --additional-mcp-config @/path/to/config.json
copilot --additional-mcp-config @base.json --additional-mcp-config @overrides.json
```

Later flags override earlier flags.

## Environment Variable Expansion Rule (Important)

Changelog notes for `~/.copilot/mcp-config.json` indicate literal env handling changes.
Use `${VAR_NAME}` when you want expansion.

```json
{
  "env": {
    "GITHUB_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

## Practical MCP Config Templates

### Traditional wrapper format

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "tools": ["*"]
    }
  }
}
```

### Claude-style direct format

```json
{
  "filesystem": {
    "type": "local",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
    "tools": ["*"]
  }
}
```

## SDK vs CLI Boundary
- The SDK compatibility guide marks `/mcp` management and `/delegate` as CLI-only interactive workflows.
- In SDK applications, use `mcpServers` plus your own orchestration logic to replicate equivalent behavior.
- Inference: exact slash-command UX is implementation-dependent; use changelog as source of truth for current preview behavior.
