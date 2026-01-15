Got it. I’ll stay in Supervisor mode and give the Worker clear, step‑by‑step instructions only (no code).

1) Read the relevant docs: `docs/INVARIANTS.md`, loader instructions (`loader.instructions.md`), and any registry/manifest docs so you know the registry-first and audio loading patterns to follow.  
2) Locate how Ink dialogue is parsed today. Find where tags are read from Ink (look for existing tag parsing or narrative event dispatch). Identify where “sfx:” tags can be surfaced as narrative events.  
3) Define the SoundManager service in `src/services/`. It should be responsible for: loading/lookup by registry id, playing/stop/volume controls if needed, and being called by narrative/tag handling. Keep it UI/world‑agnostic.  
4) Implement the tag parsing: detect tags prefixed with `sfx:` in Ink output, translate them into a structured event (e.g., `{ type: "sfx", id: ... }`) that the SoundManager can consume.  
5) Wire it into the narrative flow: wherever narrative events are emitted/handled, add a hook to call SoundManager for `sfx` events.  
6) Update the registry: add audio entries in the generated registry schema and ensure they are registry-first (no hardcoded `/content/...` paths). Follow stable sorting and deterministic formatting rules.  
7) Update loader or central content pipeline as required by `loader.instructions.md` so audio assets are loaded through the registry and available to SoundManager.  
8) Validate invariants: UI isolation (no UI in world list), no direct path loads, no schema bypass.  
9) Run the gate command `npm run verify` and fix any failures.  
10) Update `NEXT_SESSION.md` with a concise summary of changes and any follow‑ups.  

Let me know if you want me to review the diff or check the plan coverage after the Worker implements.
