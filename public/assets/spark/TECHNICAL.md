# Bar Exam Dungeon - Technical Overview

## Project Structure

```
src/
├── App.tsx                   # Main app orchestration
├── components/
│   ├── BoonSelection.tsx     # Post-room power-up selection
│   ├── DeckImport.tsx        # JSON deck upload/validation
│   ├── FlashcardDuel.tsx     # MCQ and cloze quiz modal
│   ├── HUD.tsx               # In-game HP/gold/streak display
│   ├── ResultsScreen.tsx     # End-of-run stats and export
│   ├── StartScreen.tsx       # Main menu with deck info
│   └── Wardrobe.tsx          # Outfit customization panel
├── contexts/
│   └── GameContext.tsx       # Global game state management
├── game/
│   └── DungeonScene.ts       # Phaser 3 top-down dungeon
├── lib/
│   ├── cloze.ts              # Anki-style cloze parsing
│   ├── deck.ts               # Deck validation & card selection
│   └── utils.ts              # shadcn helpers
├── types/
│   ├── flashcard.ts          # Deck/card TypeScript interfaces
│   └── outfit.ts             # Wardrobe item definitions
└── index.css                 # Theme and custom styles

public/
└── master-bar-flashcards.json  # Bundled sample deck (28 cards)
```

## Key Technologies

- **React 19** + TypeScript for UI
- **Phaser 3** for top-down dungeon gameplay
- **shadcn v4** for component library
- **Tailwind CSS v4** for styling
- **Vite** for build tooling
- **localStorage** (via `useKV` hook) for persistence
- **Sonner** for toast notifications

## Game Flow

1. **Start Screen**: Load bundled deck or import custom JSON
2. **Subject Config**: Toggle which subjects to include (7 canonical subjects)
3. **Dungeon Run**: Phaser scene with hub + 7 themed rooms
4. **Flashcard Duel**: Modal quiz triggered by encounter collision
5. **Boon Selection**: Choose power-up after each room clear
6. **Exit Unlocked**: All rooms cleared → green exit appears
7. **Results Screen**: Stats, missed cards, study queue, export JSON

## State Management

### Global State (GameContext)
- Deck data and active subjects
- Run state (HP, gold, streak, boons)
- Current flashcard in duel
- Performance tracking (attempts, accuracy per card)
- Outfit unlocks and equipped items
- Run statistics per subject

### Persistence (useKV)
- `card-performances`: Historical accuracy data
- `unlocked-outfits`: Array of unlocked item IDs
- `equipped-outfit`: Current outfit per slot

## Adaptive Learning

Cards are weighted for selection based on:
1. **Marked "Still Shaky"**: 3x more likely
2. **Low accuracy (<50%)**: 2x more likely
3. **High accuracy (>80%)**: 0.5x less likely
4. **Not seen recently**: 1.5x more likely
5. **Never attempted**: 1.2x more likely

## Deck Format

See `GAME_GUIDE.md` for full schema. Key points:
- Top-level: `totalCards`, `subjects`, `cards[]`
- Each card: `id`, `subject`, `game` object
- `game.stem` (question), `game.choices[]`, `game.answerIndex`
- `game.explain` (answer explanation)
- `clozeLite` for Anki-style `{{c1::blanks}}`
- **MPT automatically excluded**

## Subject Mapping

7 canonical subjects map to deck subjects:
- Civil Procedure → "Civil Procedure"
- Constitutional Law → "Con Law"
- Contracts and Sales → "Contracts"
- Criminal Law and Procedure → "Criminal Law" + "Criminal Procedure"
- Evidence → "Evidence"
- Real Property → "Real Property"
- Torts → "Torts"

## Phaser Integration

The Phaser game runs in a React-controlled div (`#phaser-game`):
- Scene initializes with `DungeonConfig` (active subjects, encounter callbacks)
- Player sprite moves with WASD/arrows
- Collision detection triggers React state updates
- React overlays (HUD, modals) render above canvas

## Outfit System

- 11 items across 4 slots (hair, torso, legs, shoes)
- Each subject room unlocks 1-2 themed items
- Completion rewards unlock on full run clear
- Items stored as string IDs, resolved via `OUTFIT_ITEMS` lookup
- Wardrobe accessible via HUD button or start screen

## Performance Considerations

- Phaser game destroys/recreates on run start/end (prevents memory leaks)
- Encounter map pre-computed to avoid runtime card selection
- useKV minimizes re-renders (only updates on explicit set)
- Flashcard duel uses keyboard event handler (no global listeners)

## Future Extension Points

- **Boss encounters**: Add harder multi-card encounters per room
- **Animated sprites**: Replace rectangles with layered sprite sheets
- **Difficulty modes**: Permadeath, relaxed study, timed runs
- **Leaderboards**: Track fastest clears, highest accuracy
- **Custom boons**: Mod system for community-created power-ups
- **More subjects**: Expand beyond bar exam (LSAT, MCAT, etc.)

## Development Notes

- No backend or API calls (fully offline after build)
- Deck validation is permissive (skips malformed cards rather than failing)
- Cloze mode supports multiple blanks per card
- Subject colors defined in `SUBJECT_COLORS` map
- All text is readable against dark theme (WCAG AA compliant)
