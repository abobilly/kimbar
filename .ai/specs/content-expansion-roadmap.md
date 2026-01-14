# Content Expansion Roadmap for Kimbar

**Created**: January 14, 2026
**Purpose**: Massively expand characters, levels, dialogue, and content for the bar exam prep game.

---

## Current State

| Content Type | Count | Location |
|--------------|-------|----------|
| Characters | 2 (Kim, Court Clerk) | `content/characters/` |
| Rooms | 2 (lobby, hall) | `content/rooms/` |
| Ink dialogues | 1 story file | `content/ink/story.ink` |
| Flashcard packs | 1 (1,154 cards) | **R2 bucket via Worker API** |
| Outfits | 6 | `registry_config.json` |
| Subjects (deckTags) | 16 | `registry_config.json` |
| AI job specs | 2 (props, tiles) | `content/ai_jobs/` |
| ComfyUI workflows | 3 | `comfyui/workflows/` |

---

## Phase 1: Characters (9 Justices + Support NPCs)

**Goal**: Add the 9 Supreme Court Justices as boss encounters + 3 support NPCs.

| Character ID | Name | Subject | Location | Dialogue Knot |
|--------------|------|---------|----------|---------------|
| `npc.justice_thomas` | Justice Thomas | evidence | chambers_thomas | justice_thomas_intro |
| `npc.justice_roberts` | Chief Justice Roberts | constitutional_law | courtroom_main | justice_roberts_intro |
| `npc.justice_sotomayor` | Justice Sotomayor | criminal_procedure | chambers_sotomayor | justice_sotomayor_intro |
| `npc.justice_kagan` | Justice Kagan | civil_procedure | chambers_kagan | justice_kagan_intro |
| `npc.justice_gorsuch` | Justice Gorsuch | property | chambers_gorsuch | justice_gorsuch_intro |
| `npc.justice_kavanaugh` | Justice Kavanaugh | contracts | chambers_kavanaugh | justice_kavanaugh_intro |
| `npc.justice_barrett` | Justice Barrett | family_law | chambers_barrett | justice_barrett_intro |
| `npc.justice_alito` | Justice Alito | criminal_law | chambers_alito | justice_alito_intro |
| `npc.justice_jackson` | Justice Jackson | torts | chambers_jackson | justice_jackson_intro |
| `npc.librarian` | Law Librarian | (tutorial) | library | librarian_intro |
| `npc.bailiff` | Bailiff | (gatekeeper) | courtroom_main | bailiff_intro |
| `npc.reporter` | Court Reporter | (hints) | press_room | reporter_intro |

**Files to create**: `content/characters/npc.justice_*.json`, `npc.librarian.json`, `npc.bailiff.json`, `npc.reporter.json`

**Template**: Copy from `npc.clerk_01.json`, customize `ulpcArgs`, `dialogueKnot`, `metadata.subjects`.

---

## Phase 2: Rooms/Levels (Courthouse Map)

**Goal**: Build out the full courthouse with ~15 rooms.

| Room ID | Name | Contains |
|---------|------|----------|
| `scotus_lobby` | Main Lobby | ✓ exists |
| `scotus_hall_01` | Hall of Justice | ✓ exists |
| `courtroom_main` | Main Courtroom | Final boss area, CJ Roberts |
| `chambers_thomas` | Thomas Chambers | Justice Thomas encounter |
| `chambers_roberts` | Roberts Chambers | CJ Roberts secondary |
| `chambers_sotomayor` | Sotomayor Chambers | Justice Sotomayor encounter |
| `chambers_kagan` | Kagan Chambers | Justice Kagan encounter |
| `chambers_gorsuch` | Gorsuch Chambers | Justice Gorsuch encounter |
| `chambers_kavanaugh` | Kavanaugh Chambers | Justice Kavanaugh encounter |
| `chambers_barrett` | Barrett Chambers | Justice Barrett encounter |
| `chambers_alito` | Alito Chambers | Justice Alito encounter |
| `chambers_jackson` | Jackson Chambers | Justice Jackson encounter |
| `library` | Law Library | Tutorial, hints, Librarian NPC |
| `press_room` | Press Room | Court Reporter NPC |
| `robing_room` | Robing Room | Outfit chests |
| `records_vault` | Records Vault | Advanced flashcards |
| `cafeteria` | Court Cafeteria | Rest/save point |

**Files to create**: `content/rooms/*.json` (scaffold with TODO notes where LDtk exports don't exist).

---

## Phase 3: Dialogue Expansion (Ink)

**Goal**: Each NPC gets a rich dialogue tree with personality, hints, and encounter hooks.

**Structure** (split into files):
```
content/ink/
  story.ink        # main hub, includes other files
  justices.ink     # all justice intro/victory/defeat knots
  tutorial.ink     # librarian tutorials
  rewards.ink      # outfit acquisition dialogues
```

**Per-Justice dialogue pattern**:
```ink
=== justice_thomas_intro ===
# speaker:Justice Thomas
# portrait:npc.justice_thomas
# sfx:gavel_tap
Counselor. You dare challenge my command of the Rules of Evidence?
*   [I'm ready, Your Honor.]
    # encounter:deckTag=evidence count=5 rewardId=evidence_blazer
    -> END
*   [Not yet...]
    Return when you've studied. The Federal Rules don't forgive ignorance.
    -> END

=== justice_thomas_victory ===
# speaker:Justice Thomas
# portrait:npc.justice_thomas:impressed
# give:evidence_blazer
# quest:set defeated_thomas=true
Well argued, counselor. Wear this blazer with pride.
-> END

=== justice_thomas_defeat ===
# speaker:Justice Thomas
# portrait:npc.justice_thomas:smug
Objection sustained. Study harder.
-> END
```

---

## Phase 4: Flashcards via Worker API (REVISED)

### Current Architecture

```
┌──────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│  Game Client │────▶│ flashcard-api.workers.dev   │────▶│ R2: kimbar-     │
│  (Phaser)    │     │ (Cloudflare Worker)         │     │ flashcards      │
└──────────────┘     └─────────────────────────────┘     └─────────────────┘
                              │
                     VITE_FLASHCARD_API_URL
```

- **Storage**: R2 bucket `kimbar-flashcards` holds `flashcards.json`
- **API**: Worker at `flashcard-api.andrewsbadger.workers.dev/flashcards`
- **Client**: Fetches via `VITE_FLASHCARD_API_URL` env var

### ⚠️ IMPORTANT: Do NOT use `public/content/cards/*.json`

The earlier assumption of local flashcard files is **wrong**. All flashcards come from the Cloudflare Worker API.

### Option A: Single-file with client-side filtering (USE NOW)

- Keep one `flashcards.json` in R2 with all 1,154+ cards
- Each card already has `tags.subjects` — client filters by deckTag at encounter time
- No Worker changes needed

**Implementation**:
```typescript
// In encounter trigger, filter by subject
const pack = await loadFlashcards(); // full set, cached
const subjectCards = pack.cards.filter(c => c.tags?.subjects?.includes(deckTag));
const shuffled = shuffle(subjectCards).slice(0, count);
```

**Requirements**:
1. Client must cache/memoize the master flashcard fetch
2. Filter by `deckTag` against `card.tags.subjects`
3. Handle missing/unknown deckTag gracefully

### Option B: Subject-specific packs in R2 (SCAFFOLD FOR LATER)

When flashcard count exceeds ~2,000 or you want per-encounter preloading:

1. **Script**: `scripts/split-flashcards-to-r2.mjs` — splits master by subject, uploads to R2
2. **Worker update**: Add route `/flashcards/:packId`
3. **Registry update**: `flashcardPacks` array with URLs per subject

**Do NOT implement Option B now** — only scaffold/document.

### Validation Script

Create `scripts/validate-flashcard-subjects.mjs`:
- Fetch from `VITE_FLASHCARD_API_URL` (or accept URL arg)
- Verify every card has `tags.subjects` array
- Verify subjects are in allowed list from `registry_config.json`
- Output summary, exit nonzero on failures

---

## Phase 5: Outfits & Rewards

**Goal**: Expand from 6 to 16+ outfits (one per subject victory + special unlocks).

| Outfit ID | Name | Buff | Unlock |
|-----------|------|------|--------|
| `evidence_blazer` | Evidence Blazer | +1 hint | Beat Thomas |
| `civpro_suit` | Civ Pro Power Suit | +1 strike | Beat Kagan |
| `conlaw_robe` | Con Law Robe | +5 sec | Beat Roberts |
| `property_vest` | Property Vest | +10% cite | Beat Gorsuch |
| `contracts_tie` | Contracts Tie | +1 hint | Beat Kavanaugh |
| `family_cardigan` | Family Law Cardigan | +5 sec | Beat Barrett |
| `criminal_jacket` | Criminal Law Jacket | +1 strike | Beat Alito |
| `torts_blazer` | Torts Blazer | +10% cite | Beat Jackson |
| `crimpro_badge` | Crim Pro Badge | +1 hint | Beat Sotomayor |
| `supreme_robe` | Supreme Robe | All buffs | Beat all 9 |

**Update**: `content/registry_config.json` → `outfits` section.

---

## Phase 6: AI Asset Generation (Future)

**Goal**: Generate portraits, props, and tiles with ComfyUI.

**New AI job specs**:
```
content/ai_jobs/
  portraits.json     # Justice portraits (9+)
  backgrounds.json   # Room backgrounds
  items.json         # Outfit icons, reward items
```

---

## Phase 7: Progression System (Future)

**Goal**: Track player progress, unlock doors, and save state.

| Feature | Implementation |
|---------|---------------|
| Quest flags | Ink `# quest:set flag=value` already supported |
| Door unlocks | `requiredItem` in room entities already supported |
| Save system | `# save` tag + localStorage |
| Achievement badges | New system (UI modal) |

---

## Execution Order

1. **Phase 1: Characters** — Create 12 character specs
2. **Phase 2: Rooms** — Create 15 room specs (scaffolded)
3. **Phase 3: Dialogue** — Split Ink, add justice encounters
4. **Phase 4: Flashcards** — Ensure client filtering works, add validation script
5. **Phase 5: Outfits** — Registry updates, wire victory rewards
6. **Phase 6-7**: Future work

---

## Acceptance Gates

All changes must pass:
```bash
npm run verify
npm test
# No TypeScript build errors
```

## Hard Rules

- Do NOT reintroduce `public/content/cards/*.json` as source of truth
- No new dependencies unless absolutely necessary
- Keep changes minimal but complete
- Leave repo clean; no unguarded debug logs
