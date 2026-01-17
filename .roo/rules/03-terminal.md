# Terminal Output Limits & Logging Patterns

## Roo settings

- Terminal output limit: **5000**
- Terminal character limit: **100000**
- Collapse progress bars/spinners: **On**
- Use Inline Terminal: **On** (disable only when a command needs your shell profile)

## Log-to-file patterns (to work around the 5k line cap)

### PowerShell

- Run:
  - `npm run <script> 2>&1 | Tee-Object -FilePath tmp\last_run.log`
- Then:
  - `Get-Content tmp\last_run.log -Tail 200`
- If needed:
  - `Select-String -Path tmp\last_run.log -Pattern "ERR|Error|WARN|failed|Exception" | Select-Object -Last 50`

### Linux/macOS

- Run:
  - `npm run <script> 2>&1 | tee tmp/last_run.log`
- Then:
  - `tail -n 200 tmp/last_run.log`
- If needed:
  - `grep -E "ERR|Error|WARN|failed|Exception" tmp/last_run.log | tail -n 50`
