# Integration Prompt: GitHub Spark MVP → Kimbar

## Context for Integrating Agent

You are integrating a GitHub Spark-generated roguelite flashcard game MVP into the existing **kimbar** repository. The goal is to **keep what works in kimbar** (Kim sprite, NPC characters, dialogue system, LPC sprite pipeline, outfit system, wardrobe) while **replacing what doesn't work** (complex Tiled/LDtk level loading, tileset rendering bugs) with the simpler code-first dungeon approach from Spark.

---

## 🎯 Integration Goal

Create a **playable 10-20 minute exam dungeon run** using:
- ✅ **KEEP**: Kim sprite + outfit variants (ULPC pipeline), all NPC Justice sprites, Ink dialogue system, OutfitSystem/WardrobePanel, encounter system concepts, registry-driven content loading
- ❌ **REPLACE**: Tiled/LDtk level loading, tileset rendering, complex room navigation
- ➕ **ADD**: Code-first dungeon generation, roguelite HP/streak/boons, run end screen, subject toggle, "Got it/Still shaky" tracking

---

## 📁 Files to KEEP (do not delete or break)

### Character/Sprite System
| File | Purpose | Keep Why |
|------|---------|----------|
| `specs/characters/*.json` | Character specs (Kim + all NPCs) | ULPC sprite generation |
| `scripts/build-characters.js` | Generates sprites from specs | LPC pipeline |
| `scripts/generate-sprites.mjs` | ULPC spritesheet generator | Kim's appearance |
| `public/generated/sprites/*.png` | Generated character spritesheets | Already working |

### Dialogue System
| File | Purpose | Keep Why |
|------|---------|----------|
| `src/game/systems/DialogueSystem.ts` | Inkjs integration | NPC conversations |
| `specs/ink/*.ink` | Justice dialogue scripts | Story content |
| `scripts/compile-ink.mjs` | Ink → JSON compilation | Dialogue loading |

### Outfit/Wardrobe System
| File | Purpose | Keep Why |
|------|---------|----------|
| `src/game/systems/OutfitSystem.ts` | Outfit buffs & equipping | Wardrobe logic |
| `src/game/ui/WardrobePanel.ts` | Wardrobe UI overlay | Outfit selection |
| `src/content/types.ts` → `Outfit`, `OutfitBuffs` | Type definitions | Type safety |

### Core Infrastructure
| File | Purpose | Keep Why |
|------|---------|----------|
| `src/content/registry.ts` | Content loading, game state | Central data access |
| `src/game/ui/primitives/*` | UIPanel, UIButton, UIChoiceList | Code-first UI |
| `src/game/ui/uiTheme.ts` | Consistent theming | Visual coherence |
| `src/game/ui/modal.ts`, `exitManager.ts` | Modal/ESC handling | UX patterns |
| `src/game/ui/layout.ts` | Responsive layout calculations | Multi-resolution support |

---

## 📁 Files to REPLACE or heavily modify

### Level System (REPLACE)
| File | Current State | Replace With |
|------|--------------|--------------|
| `src/content/level-loader.ts` | Complex Tiled/LDtk normalization | Simple code-first room loader |
| `src/game/scenes/WorldScene.ts` | 1800+ lines, tilemap rendering, camera systems | Simplified dungeon scene |
| `public/content/tiled/**` | TMX maps that don't render properly | Not needed |
| `public/content/ldtk/**` | Legacy LDtk levels | Not needed |

### Encounter System (MODIFY)
| File | Current State | Modify For |
|------|--------------|------------|
| `src/game/systems/EncounterSystem.ts` | Cloze parsing only | MCQ support (game.choices + answerIndex) |

---

## 🗂️ New Architecture

### Directory Structure (new files to create)
```
src/
  game/
    scenes/
      DungeonScene.ts       # NEW - Main roguelite gameplay scene
      RunEndScene.ts        # NEW - Run completion results screen
      SubjectSelectScene.ts # NEW - Subject toggle before run
    systems/
      EncounterSystem.ts    # MODIFY - Add MCQ mode, "Got it/Still shaky"
      RunState.ts           # NEW - HP, streak, boons, mastery tracking
      DungeonGenerator.ts   # NEW - Code-first room/encounter placement
    ui/
      HUD.ts                # NEW - HP bar, gold, streak, encounters remaining
      BoonSelectPanel.ts    # NEW - Post-room boon selection
  content/
    flashcard-loader.ts     # NEW - Handles master-bar-flashcards.json schema
    types.ts                # MODIFY - Add game.* fields to Flashcard
```

### Scene Flow
```
Boot → Preloader → MainMenu → SubjectSelectScene → DungeonScene ↔ RunEndScene
                                                        ↓
                                                  WardrobePanel (overlay)
                                                  EncounterSystem (modal)
                                                  DialogueSystem (modal)
```

---

## 🃏 Flashcard Schema Integration

**Spark's expected schema** (`master-bar-flashcards.json`):
```typescript
interface MasterFlashcard {
  id: string;
  subject: string;           // "Civil Procedure", "Con Law", "Contracts", etc.
  topic?: string;
  frontPrompt: string;
  backPlain: string;
  clozeLite?: string;        // "The {{c1::answer}} is here"
  game?: {
    schemaVersion: number;
    mode: 'mcq' | 'cloze';
    stem?: string;           // Alternative to frontPrompt
    choices?: string[];      // MCQ choices
    answerIndex?: number;    // Correct choice index (0-based)
    hint?: string;
    explain?: string;
    confusables?: string[];
    remediationTargets?: string[];
  };
}
```

**Current kimbar schema** (from `src/content/types.ts`):
```typescript
interface Flashcard {
  id: string;
  frontPrompt: string;
  cloze?: string;
  clozeLite?: string;
  easyContent?: string;      // Used as explanation
  tagsNormalized?: string[]; // Used for deckTag filtering
  confusableWith?: string[];
}
```

**Integration strategy**:
1. Extend `Flashcard` interface to include `game?: { ... }` fields
2. Add `subject?: string` field for subject filtering
3. Modify `EncounterSystem.showQuestion()` to check for `game.choices`/`game.answerIndex` and render MCQ if available
4. Fall back to cloze parsing if no MCQ data

---

## 🎮 DungeonScene Spec

### Layout (code-first, no tilemaps)
```
+------------------+
|   HALLWAY/HUB    |
|  [spawn point]   |
+--+----+----+----++
   |    |    |    |
 [Room1][Room2]...[Room7]
   CivPro ConLaw Contracts CrimLaw Evidence RealProp Torts
```

### Room Generation (per Spark spec)
```typescript
interface DungeonRoom {
  id: string;
  subject: string;              // Canonical subject
  displayName: string;          // "Civil Procedure Chamber"
  bounds: { x, y, width, height };
  encounters: EncounterTrigger[];  // 1-2 per room
  cleared: boolean;
  npc?: string;                 // Optional justice NPC
}

// Generate at run start
function generateDungeon(seed: number, enabledSubjects: string[]): DungeonRoom[]
```

### Simple Rendering (shapes, not tilemaps)
```typescript
// Floor: filled rectangle with subject-themed color
// Walls: stroked rectangle
// Doors: colored rectangles at boundaries
// Encounters: glowing circles/sprites
// NPCs: character sprites from existing system
```

---

## 👤 Player Character Integration

**Current system** (keep):
- Kim sprite loaded from `char.kim` registry entry
- Outfit variants: `char.kim_evidence_blazer`, `char.kim_civpro_suit`, etc.
- ULPC spritesheet: 64×64 frames, 9-frame walk cycles
- Animations defined in `specs/characters/char.kim.json`

**Add for Spark**:
- HP tracking in `RunState` (not outfit-dependent)
- Visual indicator when damaged
- Wardrobe accessible via HUD button

**Sprite key resolution** (existing logic to preserve):
```typescript
// From OutfitSystem.getOutfitSprite()
const spriteKey = outfit.sprite || `char.kim_${outfitId}`;
```

---

## ⚔️ Encounter System Modifications

### Current behavior (keep):
- Cloze parsing: `{{c1::answer}}` → `_____`
- Wrong answer generation from confusables
- Feedback panel with explanation
- `correctCount` tracking

### Add for Spark:

1. **MCQ mode** (when `game.choices` present):
```typescript
private showQuestion(): void {
  const card = this.currentCards[this.currentIndex];
  
  if (card.game?.choices && typeof card.game.answerIndex === 'number') {
    // MCQ mode: use game.choices directly
    this.showMCQQuestion(card);
  } else {
    // Cloze mode: existing behavior
    this.showClozeQuestion(card);
  }
}

private showMCQQuestion(card: Flashcard): void {
  const stem = card.game?.stem || card.frontPrompt;
  const choices = card.game!.choices!;
  const correctIndex = card.game!.answerIndex!;
  
  // Render 4 buttons with choices[i] text
  // On click: check if i === correctIndex
}
```

2. **"Got it / Still shaky" buttons** (post-answer):
```typescript
private showFeedback(card: Flashcard, correct: boolean): void {
  // ...existing feedback...
  
  // Add mastery buttons
  const gotItBtn = new UIButton(/* "Got it" */);
  gotItBtn.onClick = () => {
    this.recordMastery(card.id, 'got_it');
    this.nextQuestion();
  };
  
  const shakyBtn = new UIButton(/* "Still shaky" */);
  shakyBtn.onClick = () => {
    this.recordMastery(card.id, 'shaky');
    this.nextQuestion();
  };
}
```

3. **Hint button** (when `game.hint` present):
```typescript
if (card.game?.hint) {
  const hintBtn = new UIButton(/* "Hint" */);
  hintBtn.onClick = () => this.showHint(card.game!.hint!);
}
```

---

## 🎁 Roguelite Systems (NEW)

### RunState (`src/game/systems/RunState.ts`)
```typescript
interface RunState {
  seed: number;
  hp: number;
  maxHp: number;
  gold: number;
  streak: number;
  boons: Boon[];
  roomsCleared: string[];
  cardResults: Map<string, 'correct' | 'wrong' | 'got_it' | 'shaky'>;
  outfitsUnlockedThisRun: string[];
}

// Persist mastery across runs in localStorage
interface MasteryData {
  [cardId: string]: {
    attempts: number;
    correct: number;
    shaky: number;
    lastSeen: number;
  };
}
```

### Boons (`src/game/systems/Boon.ts`)
```typescript
const BOONS = [
  { id: 'free_reveal', name: 'Free Reveal', description: 'One free hint per encounter' },
  { id: 'max_hp_up', name: '+Max HP', description: 'Increase maximum HP by 1' },
  { id: 'reroll', name: 'Reroll', description: 'Reroll one question per room' },
  { id: 'streak_shield', name: 'Streak Shield', description: 'Wrong answer doesn\'t reset streak once' },
];
```

---

## 🎨 UI Components (NEW)

### HUD (`src/game/ui/HUD.ts`)
```typescript
// Fixed position, camera-independent (use uiLayer)
class HUD extends Phaser.GameObjects.Container {
  private hpBar: Phaser.GameObjects.Graphics;
  private goldText: Phaser.GameObjects.Text;
  private streakText: Phaser.GameObjects.Text;
  private encountersText: Phaser.GameObjects.Text;
  private wardrobeBtn: UIButton;
  
  updateHP(current: number, max: number): void;
  updateGold(amount: number): void;
  updateStreak(streak: number): void;
  updateEncounters(remaining: number, total: number): void;
}
```

### BoonSelectPanel (`src/game/ui/BoonSelectPanel.ts`)
```typescript
// Shown after clearing a room
class BoonSelectPanel {
  show(boons: Boon[], onSelect: (boon: Boon) => void): void;
}
```

---

## 📋 Subject Mapping

| Canonical Display Name | Deck Subject(s) | Room Theme |
|------------------------|-----------------|------------|
| Civil Procedure | "Civil Procedure" | Clerk's Office |
| Constitutional Law | "Con Law" | Roberts' Chamber |
| Contracts and Sales | "Contracts" | Deal Room |
| Criminal Law and Procedure | "Criminal Law" + "Criminal Procedure" | Holding Cell |
| Evidence | "Evidence" | Record Room |
| Real Property | "Real Property" | Deed Archive |
| Torts | "Torts" | Injury Court |

**Hardcoded exclusion**: `subject === "MPT"` filtered at load time.

---

## 🚫 Sacred Invariants (from kimbar)

1. **UI isolation**: All UI on `uiLayer`, rendered by `uiCam` only
2. **Registry-first content**: No hardcoded `/content/...` paths in runtime
3. **Deterministic pipelines**: Stable sort order, no noisy diffs
4. **Agent-friendly**: All ops via npm scripts, validators block regressions

---

## 📝 Implementation Order

### Phase 1: Core Systems (foundation)
1. [ ] Create `RunState.ts` with HP/streak/boons/mastery tracking
2. [ ] Extend `Flashcard` type with `subject` and `game` fields
3. [ ] Create `flashcard-loader.ts` to handle Spark schema + validation
4. [ ] Modify `EncounterSystem` for MCQ mode + "Got it/Still shaky"

### Phase 2: Scene Structure
5. [ ] Create `SubjectSelectScene.ts` (7 toggles + start button)
6. [ ] Create `DungeonScene.ts` (code-first rooms, replace WorldScene for gameplay)
7. [ ] Create `RunEndScene.ts` (accuracy by subject, missed cards, study queue)
8. [ ] Create `HUD.ts` component

### Phase 3: Roguelite Loop
9. [ ] Implement `DungeonGenerator.ts` (hub + 7 rooms)
10. [ ] Wire encounter triggers in dungeon rooms
11. [ ] Implement boon selection after room clear
12. [ ] Wire outfit unlocks per subject victory
13. [ ] Add localStorage persistence for mastery data

### Phase 4: Polish
14. [ ] Add drag-and-drop flashcard upload
15. [ ] Add deck stats display on import
16. [ ] Export Run Summary JSON / Study Queue JSON
17. [ ] Test 10-20 minute run timing
18. [ ] Mobile responsiveness pass

---

## 🧪 Validation Checklist

After each phase, verify:
- [ ] `npm run check:fast` passes (TypeScript + unit tests)
- [ ] Kim sprite renders correctly in dungeon
- [ ] Wardrobe panel opens/closes
- [ ] Dialogue system still works with NPCs
- [ ] Encounters load cards and track results
- [ ] HP/streak update correctly
- [ ] localStorage persists between sessions

---

## ⚠️ Known Issues to Address

1. **NPC movement**: Currently static; defer to future session
2. **Portrait quality**: Dialogue portraits need better assets; defer
3. **Tileset rendering**: Bypassed by code-first rooms (no longer needed)
4. **World graph**: Irrelevant for code-first dungeon

---

## 📚 Key Files to Reference

| For Understanding | Read |
|-------------------|------|
| Game state shape | `src/content/types.ts` |
| Content loading | `src/content/registry.ts` |
| UI primitives | `src/game/ui/primitives/UIPanel.ts`, `UIButton.ts` |
| Camera isolation | `src/game/scenes/WorldScene.ts` → `setupCameras()` |
| Dialogue integration | `src/game/systems/DialogueSystem.ts` |
| Outfit buffs | `src/game/systems/OutfitSystem.ts` |
| Encounter flow | `src/game/systems/EncounterSystem.ts` |
| Character specs | `specs/characters/char.kim.json` |
| Ink dialogue | `specs/ink/justices.ink` |

---

## 🔑 Commands

```bash
# Content pipeline
npm run prepare:content    # Full rebuild

# Development
npm run dev                # Vite dev server

# Validation
npm run check:fast         # TypeScript + unit tests
npm run check              # Full gate

# Specific builds
npm run build:chars        # Character sprites
npm run compile:ink        # Ink → JSON
```

---

This prompt gives the integrating agent everything needed to merge Spark's roguelite gameplay with kimbar's working character/dialogue/outfit systems while avoiding the broken tileset rendering pipeline.
