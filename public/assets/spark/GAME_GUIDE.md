# Bar Exam Dungeon 🎓⚔️

A top-down roguelite study game where law school flashcards become tactical combat encounters. Navigate themed dungeon rooms, battle flashcard encounters, unlock cosmetic outfits, and build mastery through adaptive difficulty.

## 🎮 How to Play

### Starting a Run
1. The app loads with a bundled sample deck of bar exam flashcards
2. Click **"Start Run"** to begin exploring the exam dungeon
3. Optionally configure which subjects to include via **"Configure Subjects"**

### Dungeon Exploration
- **Move**: WASD or Arrow Keys
- Navigate through the central hub and seven subject-themed rooms
- Each room contains 1-2 flashcard encounters (glowing squares)
- Walk into an encounter to start a flashcard duel

### Flashcard Duels
- **Multiple Choice Mode**: Press 1-4 to select an answer, Enter to submit
- **Cloze Mode**: Type answers into blanks, or click "Reveal" if you have a boon
- **Hint Button** (❓): Shows additional context for tricky questions
- After answering, mark yourself "Got It" or "Still Shaky" to influence future runs

### Combat & Rewards
- ✅ **Correct Answer**: Heal HP, gain gold, increase streak
- ❌ **Incorrect Answer**: Lose HP, reset streak
- 🎁 **Boons**: After clearing each room, choose one of three power-ups:
  - **Cheat Sheet**: One free Reveal per encounter
  - **Energy Drink**: +20 Max HP
  - **Second Chance**: Reroll one question per room

### Wardrobe & Progression
- Clear subject rooms to unlock themed outfit pieces
- Complete entire runs for signature rewards
- Access the **Wardrobe** button from the HUD or start screen
- Four slots: Hair, Torso, Legs, Shoes
- Mix and match to customize Kim's appearance

### Completing a Run
- Clear all seven rooms to unlock the Exit (turns green)
- Enter the Exit to view your results:
  - Accuracy by subject
  - Missed cards list
  - Study queue (prioritizes weak areas)
  - Newly unlocked outfits
- Export results as JSON for external review

### Adaptive Learning
- The game tracks your performance on every card
- Cards marked "Still Shaky" or answered incorrectly appear more often in future runs
- Over time, the system adapts to focus on your weak areas

## 📁 Custom Decks

### Import Your Own Flashcards
1. Click **"Import Deck"** from the start screen
2. Drag-and-drop or browse for a JSON file
3. The app validates the format and shows stats

### Required JSON Schema
```json
{
  "totalCards": 100,
  "subjects": ["Torts", "Contracts", ...],
  "cards": [
    {
      "id": "unique-id",
      "subject": "Torts",
      "topic": "Negligence",
      "frontPrompt": "Question text",
      "backPlain": "Answer explanation",
      "clozeLite": "Text with {{c1::blanks}}",
      "game": {
        "stem": "Question text for game mode",
        "choices": ["A", "B", "C", "D"],
        "answerIndex": 2,
        "hint": "Optional hint text",
        "explain": "Why this is correct",
        "clozeLite": "Alternative cloze format"
      }
    }
  ]
}
```

### Subject Mapping
The game expects these seven canonical subjects:
- **Civil Procedure** (deck: "Civil Procedure")
- **Constitutional Law** (deck: "Con Law")
- **Contracts and Sales** (deck: "Contracts")
- **Criminal Law and Procedure** (deck: "Criminal Law" + "Criminal Procedure")
- **Evidence** (deck: "Evidence")
- **Real Property** (deck: "Real Property")
- **Torts** (deck: "Torts")

⚠️ **MPT cards are automatically excluded**

## 🎨 Design Philosophy

This isn't a sterile study app—it's a **midnight study session meets retro dungeon crawler**. Playful, saturated colors, arcade-style feedback, and roguelite pressure make studying feel like gameplay. Think "law school fever dream" aesthetic.

## 🔧 Technical Details

- **Framework**: React + TypeScript + Vite
- **Game Engine**: Phaser 3 for top-down dungeon exploration
- **UI**: shadcn components + Tailwind CSS
- **State**: React Context + localStorage persistence
- **No Backend**: Runs entirely offline after build

## 📊 Data Export

Click **"Export Results"** on the results screen to download:
- Run statistics (accuracy, attempts per subject)
- Missed card IDs
- "Still Shaky" card IDs  
- Study queue (prioritized list for review)

Use this data to sync with external spaced repetition systems or track progress over time.

## 🎯 Tips for Success

1. **Mark honestly**: "Still Shaky" helps the adaptive system serve you better cards
2. **Use boons strategically**: Save "Cheat Sheet" for subjects you struggle with
3. **Focus subjects**: Disable subjects you're confident in to concentrate on weak areas
4. **Review missed cards**: The results screen shows what tripped you up
5. **Replay for mastery**: Each run adapts to your performance—repetition builds proficiency

## 🚀 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| WASD / Arrows | Move Kim |
| 1-4 | Select multiple choice answer |
| Enter | Submit answer |
| Space | Interact / Continue |
| Esc | Close panels |

---

**Good luck, and may the curve be ever in your favor!** ⚖️✨
