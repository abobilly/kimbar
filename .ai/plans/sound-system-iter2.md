Got it. I’ll outline clear, step‑by‑step guidance for the Worker to implement this, without writing code.

**Worker Steps**

1) **Locate loader & registry patterns**
- Read `docs/INVARIANTS.md` and `docs/loader.instructions.md` for registry‑first audio loading rules.
- Inspect `generated/registry.json` and its schema file in `schemas/` to see how other asset types are represented.

2) **Find Ink parsing & narrative event flow**
- Search in `src/` for existing Ink parsing and narrative event dispatch (likely in services or scenes).
- Identify where tags are parsed (or can be parsed) in dialogue flow. Note how events are emitted or handled.

3) **Define new SFX registry entries**
- Update the relevant schema in `schemas/` to include audio/sfx entries consistent with other registry sections.
- Ensure stable ordering/IDs per deterministic pipeline rules.
- Do **not** add or commit changes to `generated/` or `public/generated/` (invariant).

4) **Create SoundManager service**
- Add `src/services/SoundManager.ts` (or similar) following existing service patterns.
- It should:
  - read audio entries from the registry (no hardcoded `/content/...` paths),
  - expose a `playSfx(tagOrId)` method,
  - handle preload/registration with the loader per `loader.instructions.md`.

5) **Wire into loader**
- Use the central loader API to register sound assets (likely in an existing loader module).
- Ensure audio assets are referred to by registry IDs (not hardcoded paths).
- Confirm this is consistent with UI isolation and registry‑first content invariants.

6) **Parse `sfx:` tags from Ink**
- Extend Ink tag parsing to detect tags like `sfx:foo`.
- On detection, emit a narrative event or directly invoke `SoundManager`—prefer existing event bus patterns.
- Make sure tags are stripped/ignored for display text.

7) **Trigger playback on narrative events**
- If there is an event dispatcher, add a handler that calls `SoundManager.playSfx` when `sfx` events fire.
- Keep audio playback decoupled from UI/world layers.

8) **Update `NEXT_SESSION.md`**
- Add a brief entry summarizing changes and any follow‑ups or open questions.

9) **Validation**
- Run `npm run verify`.
- If it fails, fix only what’s related and re‑run.

If you want, I can adjust the plan to match the existing code structure once you point me at the specific loader and Ink modules.
