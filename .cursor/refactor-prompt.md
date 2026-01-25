# CURSOR EXECUTION PROMPT — Kimbar Phaser Refactor

## ROLE & CONSTRAINTS

You are an expert Phaser 3 + Vite + TypeScript engineer executing an in-place refactor. **Do not plan—implement.**

### Model Selection (Cursor-specific)

| Task | Model | Reasoning |
|------|-------|-----------|
| PASS 0 debugging, root-cause analysis | Claude Opus 4.5 | Best at tracing execution paths |
| Implementation after root cause found | GPT-5.2-Codex (High reasoning) | Fast, accurate code changes |
| Stuck after 2 attempts | Escalate to Opus Thinking or Codex xhigh | Only if needed |

---

## REPO CONTEXT (treat as ground truth)

**Canonical Flow (Spark MVP):**

```
Boot → Preloader → MainMenu → SubjectSelectScene → DungeonScene → Encounter → RunEndScene → GameOver
```

**Key Files:**

- `src/game/main.ts` — scene registration
- `src/game/systems/RunState.ts` — HP, streak, boons, mastery
- `src/game/systems/EncounterSystem.ts` — question grading
- `src/content/flashcard-loader.ts` — Spark + cloze loading
- `src/content/registry.ts` — central content registry

**Legacy (NOT default):** WorldScene, Tiled/LDtk loaders, Outfit/Wardrobe panels

**Sacred Invariants:** Registry-first content loading. UI on uiLayer only. See `AGENTS.md`, `.github/copilot-instructions.md`.

---

## MISSION — 3 GATED PASSES

### PASS 0 — STABILIZE

**Exit Criteria:** Smoke run GREEN with zero console errors.

Click path to verify:

```
MainMenu[NEW RUN] → SubjectSelectScene[toggle ≥1 subject] → [START] → DungeonScene → [any door] → Encounter[answer] → RunEndScene
```

**Likely Blockers (verify, don't assume):**

1. `getRegistry()` called before `loadRegistry()` completes
2. EncounterSystem expects fields missing from Spark JSON
3. Scene transitions pass undefined/stale data

**Deliverable:** Create `docs/SMOKE.md` with exact manual checklist.

---

### PASS 1 — CORE ISOLATION

**Gate:** PASS 0 must be GREEN.

Create `/src/core/` with pure TypeScript (no Phaser imports):

```
src/core/
├── run/
│   ├── state.ts      # RunState logic
│   ├── mastery.ts    # Mastery tracking
│   └── persistence.ts # get/set/remove abstraction
├── encounter/
│   ├── selector.ts   # Question selection
│   ├── grader.ts     # Answer grading
│   └── outcomes.ts   # HP/streak/mastery updates
└── content/
    └── flashcards.ts # Normalization wrappers
```

**Rule:** After PASS 1, scenes must NOT touch `localStorage` directly.

---

### PASS 2 — QUARANTINE LEGACY

**Gate:** PASS 1 must be GREEN.

- Add `VITE_FEATURE_WORLD=0` (default OFF)
- Conditionally register WorldScene in `main.ts`
- Update `README.md` and `NEXT_SESSION.md`

---

## NON-NEGOTIABLE RULES

1. **One issue per step.** No mass renames. No broad reshuffles.
2. **After EVERY step:** `npm run build` must pass. Smoke run must pass.
3. **Preserve behavior** unless fixing a smoke blocker.
4. **No new dependencies** without justification.
5. **Pure TypeScript in /src/core/** — no Phaser types.
6. **When ambiguous:** smallest change that gets smoke green. Document tradeoff.

---

## OUTPUT FORMAT (repeat for each step)

```markdown
### Step N: [Goal in one sentence]

**Files Changed:**
- path/to/file.ts

**What Changed:**
- Bullet 1
- Bullet 2

**Commands + Results:**
```bash
npm run build
# ✓ No errors
```

**Smoke Run:** ✅ PASS | ❌ FAIL

- Click path: MainMenu → ... → RunEndScene
- Console errors: none | [error text]

**Next:** [one sentence]

```

---

## STOP CONDITIONS

- ❌ Smoke fails after a step → Fix immediately before continuing
- ❌ Change touches >10 files → STOP, re-scope to smallest viable fix
- ❌ Unsure about invariant → Check `AGENTS.md` or ask before proceeding

---

## VERIFICATION COMMANDS (run after each step)

```bash
npm run build          # Must exit 0
npm run check:fast     # Quick gate (unit tests)
# Then manual smoke click path in browser
```

---

## BEGIN EXECUTION

**PASS 0, Step 1:** Run the build and capture the first failure.

```bash
npm install
npm run build
npm run dev
```

Open <http://127.0.0.1:5173> in browser. Attempt the smoke click path. Capture the **first** console error or crash with file/line. Identify root cause. Fix only that blocker.

**Start now.**
