# Bar Exam Dungeon - Roguelite Flashcard Combat Game

A top-down roguelite where law school flashcards become tactical combat encounters in a satirical "exam dungeon" fever dream. Kim explores themed subject rooms, battles flashcard encounters, collects outfits, and builds mastery through repeated runs.

**Experience Qualities**:
1. **Snappy** - 10-20 minute runs with instant feedback, no waiting, fast transitions between encounters and rooms
2. **Playfully Tense** - Educational stakes wrapped in roguelite pressure (HP loss, streaks, boons) without feeling sterile or punishing
3. **Rewarding** - Visible progress through wardrobe unlocks, mastery tracking, and adaptive difficulty that respects player knowledge

**Complexity Level**: Light Application (multiple features with basic state)
This is a focused single-player game with interconnected systems (movement, combat/quiz, progression, wardrobe) but no backend complexity. The scope is deliberately constrained to one level, seven subjects, and local persistence.

## Essential Features

### Deck Import & Validation
- **Functionality**: Load flashcard JSON from bundled file or user drag-and-drop/file picker
- **Purpose**: Support custom deck updates and validate structure before gameplay
- **Trigger**: On app load (bundled) or via "Import Deck" button
- **Progression**: Select file → Parse JSON → Validate schema → Filter MPT → Display stats → Enable "Start Run" button
- **Success criteria**: Shows deck stats (total cards, per-subject counts), gracefully skips malformed cards with error report, absolutely excludes MPT everywhere

### Subject Selection
- **Functionality**: Toggle which of the seven canonical subjects to include in the run
- **Purpose**: Let players focus study sessions on specific areas
- **Trigger**: "Configure Subjects" button from start screen
- **Progression**: Show toggles for 7 subjects (all enabled by default) → Player toggles off unwanted subjects → Confirm → Returns to start screen
- **Success criteria**: Only toggled subjects spawn rooms/encounters; at least one subject must remain active; settings persist across runs

### Dungeon Exploration (Phaser)
- **Functionality**: Top-down movement through central hub and seven subject-themed rooms with collision
- **Purpose**: Spatial roguelite feel; makes study progression tangible
- **Trigger**: Player starts run
- **Progression**: Spawn in hub → Move with WASD/arrows → Collide with walls → Approach door trigger → Room label appears → Walk through to subject room → Encounter sprites appear → Touch encounter to start duel → Repeat → All rooms cleared → Exit unlocks → Enter exit for results
- **Success criteria**: Smooth WASD movement, wall collisions work, room transitions are instant, encounters are visually distinct from scenery

### Flashcard Duel Combat
- **Functionality**: Present question from card.game data as multiple-choice or cloze-fill; resolve answer; apply damage/rewards
- **Purpose**: Core learning mechanic disguised as combat
- **Trigger**: Player sprite touches encounter sprite
- **Progression**: Freeze movement → Show modal with stem/prompt → (Optional) Click hint → Player selects answer (1-4 keys for MCQ or type for cloze) → Submit → Show correct/incorrect → Display explanation → Player clicks "Got it" or "Still shaky" → Apply HP/gold/streak changes → Close modal → Encounter disappears → Resume movement
- **Success criteria**: Both MCQ and cloze modes work; answerIndex validates correctly; cloze parsing handles {{c1::text}}; case-insensitive checking; explanation always shown; self-rating stored

### Boon Selection
- **Functionality**: After clearing a subject room, offer 3 random boons (pick 1)
- **Purpose**: Roguelite strategy layer; reduces monotony
- **Trigger**: Last encounter in a subject room defeated
- **Progression**: Show modal with 3 boon options → Player clicks one → Apply boon effect → Store active boons → Close modal
- **Success criteria**: Boons like "Free Reveal," "+Max HP," "Reroll" actually work in subsequent encounters; effects clear between runs

### Wardrobe & Outfit System
- **Functionality**: Unlock and equip cosmetic outfit pieces (Hair, Torso, Legs, Shoes)
- **Purpose**: Tangible progression reward; personalization
- **Trigger**: Access via HUD "Wardrobe" button or automatically shown when new item unlocked
- **Progression**: Open wardrobe panel → Browse unlocked items by slot → Click to equip → Kim sprite updates immediately → Close panel
- **Success criteria**: 6-10 items exist; clearing subject room unlocks 1 item; completing run unlocks signature item; equipped outfit persists; sprite appearance changes

### Adaptive Card Selection
- **Functionality**: Bias encounter selection toward low-mastery and "Still shaky" cards within active subject
- **Purpose**: Focus study time on weak areas automatically
- **Trigger**: When spawning encounters for a room
- **Progression**: Load performance data from localStorage → Calculate mastery score per card (correct %, shaky flags) → Weight selection heavily toward low-mastery → Randomly pick N encounters → Spawn encounter sprites
- **Success criteria**: Repeated runs surface previously-missed cards more often; "Still shaky" cards reappear sooner; mastery improves over multiple runs

### Run End & Results
- **Functionality**: Summary screen with accuracy, missed cards, study queue, unlocked outfits
- **Purpose**: Closure; actionable review data; reward celebration
- **Trigger**: Player enters unlocked Exit
- **Progression**: Fade dungeon → Show results panel → Display accuracy by subject → List missed cards → List shaky cards (study queue) → Show new outfit unlocks → "Export JSON" and "Start New Run" buttons
- **Success criteria**: All data accurate; study queue is properly prioritized (missed + shaky); export JSON works; "Start New Run" resets game state

## Edge Case Handling

- **Empty subject pool**: If player disables all subjects or deck has no cards for a subject, show warning and prevent run start
- **Malformed cards**: Skip cards missing required fields (id, subject, game.stem or frontPrompt); log count to console and show in import stats
- **MPT leakage**: Double-check exclusion at import, room generation, and encounter selection; never surface MPT anywhere
- **Zero HP mid-run**: Allow continuation (player already paid time cost) but show "death" overlay; could add optional permadeath toggle later
- **Duplicate card IDs**: Use card ID + index as fallback key; warn in console
- **Extremely long text**: Truncate or scrollable for stem/explanation; ensure UI doesn't break
- **No bundled deck**: Show "Import Deck" screen immediately; disable "Start Run" until valid deck loaded

## Design Direction

The design should feel like a **midnight study session crossed with a retro dungeon crawler** — slightly surreal, high-contrast, playfully dramatic. Think neon highlighters, notebook paper textures, and arcade cabinet energy. This is NOT a polished corporate learning platform; it's a scrappy indie game that happens to teach law.

## Color Selection

**Primary Color**: `oklch(0.45 0.18 265)` Deep saturated purple — evokes late-night studying, legal robes, and retro dungeon crawlers. Represents authority and focus.

**Secondary Colors**:
- **Room accents**: Each subject gets a unique bright accent color for room borders and encounter highlights
  - Civil Procedure: `oklch(0.65 0.20 220)` Blue (procedural, systematic)
  - Con Law: `oklch(0.60 0.18 30)` Red-orange (constitutional drama)
  - Contracts: `oklch(0.70 0.18 140)` Green (money, deals)
  - Criminal Law: `oklch(0.50 0.20 350)` Deep red (crime, danger)
  - Evidence: `oklch(0.68 0.16 85)` Yellow (illumination, proof)
  - Real Property: `oklch(0.55 0.15 120)` Earth green (land, grounded)
  - Torts: `oklch(0.62 0.22 40)` Orange (harm, warning)

**Accent Color**: `oklch(0.75 0.25 330)` Hot pink — for correct answers, boon highlights, streak indicators, and outfit unlocks. Energetic and celebratory.

**Foreground/Background Pairings**:
- Background (Hub/Neutral): `oklch(0.15 0.02 265)` Very dark purple - White text `oklch(0.98 0 0)` - Ratio 14.2:1 ✓
- Card (Quiz Modal): `oklch(0.20 0.03 265)` Dark slate - White text `oklch(0.98 0 0)` - Ratio 11.8:1 ✓
- Primary (Buttons): `oklch(0.45 0.18 265)` Purple - White text `oklch(0.98 0 0)` - Ratio 5.1:1 ✓
- Accent (Hot Pink): `oklch(0.75 0.25 330)` - Dark text `oklch(0.15 0.02 265)` - Ratio 8.9:1 ✓
- Muted (Disabled/Secondary): `oklch(0.35 0.05 265)` Dimmed purple - Light gray text `oklch(0.75 0.02 265)` - Ratio 4.6:1 ✓

## Font Selection

Typography should balance **arcade nostalgia with modern readability** — chunky headers that feel like game UI, paired with clean body text for flashcard content.

- **Typographic Hierarchy**:
  - H1 (Game Title): Press Start 2P Bold / 32px / wide letter-spacing (0.1em) — Retro game title energy
  - H2 (Room Names, Modals): Space Grotesk Bold / 24px / tight letter-spacing (-0.02em) — Technical but friendly
  - Body (Questions, Explanations): Space Grotesk Regular / 16px / line-height 1.5 — Highly readable for dense content
  - UI Labels (HUD, Buttons): Space Grotesk Medium / 14px / uppercase / letter-spacing 0.05em — Crisp and clear
  - Monospace (Card IDs, Debugging): JetBrains Mono / 13px — For technical overlays

## Animations

Animations should feel **snappy and arcade-like** — instant feedback for actions, smooth but quick transitions, satisfying micro-interactions.

- **Combat feedback**: Correct answer = brief green flash + scale pulse on Kim (150ms); incorrect = red shake + HP bar drop (200ms)
- **Movement**: No easing on WASD movement (instant velocity changes for tight control); smooth camera follow with slight lag (0.1s)
- **Room transitions**: Instant cut (no fade) when crossing doors to maintain roguelite pace
- **Modal entry/exit**: Scale up from 0.9 to 1.0 with slight overshoot (spring, 250ms)
- **Boon selection**: Hover = subtle lift (2px) + glow; click = quick scale down/up (100ms)
- **Outfit equip**: Sprite layers crossfade (150ms) when changing items
- **Streak counter**: Bounce animation on increment; dramatic shake on reset

## Component Selection

- **Components**:
  - `Card` for quiz modal background, results panels, boon selection overlays
  - `Button` with `variant="default"` (primary actions), `variant="outline"` (secondary), `variant="ghost"` (cancel/close)
  - `Progress` for HP bar (custom colors: green→yellow→red gradient based on percentage)
  - `Badge` for subject tags, streak counter, gold display
  - `Dialog` for wardrobe panel (can pause game)
  - `Checkbox` for subject toggles on config screen
  - `Separator` to divide results sections
  - `ScrollArea` for long explanation text and missed-cards list
  - `Input` for cloze-mode answer entry
  - `Tooltip` for hint button (on hover)
  
- **Customizations**:
  - Custom HUD overlay component (position: fixed, top/left, z-index: 10) — not a shadcn component, just flexbox
  - Custom Phaser game canvas wrapper (full-screen minus HUD space)
  - Custom subject-colored room borders (CSS border + Phaser graphics)
  - Custom Kim sprite component (layered divs or canvas for outfit rendering)

- **States**:
  - Buttons: Default subtle shadow; Hover adds glow (--accent color); Active shrinks slightly; Disabled goes muted
  - Inputs (cloze): Default border-input; Focus border-accent with glow; Correct = border-green; Incorrect = border-red
  - Encounters (Phaser): Idle = gentle bob animation; Hover (nearby) = brighter glow; Defeated = fade out + scale down

- **Icon Selection**:
  - `Heart` for HP
  - `Coin` / `CurrencyDollar` for gold
  - `Fire` for streak
  - `BookOpen` for deck import
  - `Gear` for subject config
  - `Shirt` / `Palette` for wardrobe
  - `Question` for hint button
  - `Check` / `X` for correct/incorrect
  - `Download` for export JSON
  - `ArrowClockwise` for new run

- **Spacing**: Tight padding on HUD elements (p-2, p-3); generous padding on modals (p-6, p-8); gap-4 for button groups; gap-6 for card content sections

- **Mobile**: NOT a priority for MVP (dungeon crawling + WASD doesn't translate well to touch). Ensure modals are scrollable and readable on tablets (768px+), but gameplay assumes keyboard.
