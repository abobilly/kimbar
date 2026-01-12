# Kim Bar - Session Handoff Document

> **⚠️ DELETE THIS FILE after reading and acting on it. Do not commit to repository.**

## What This Is

**Kim Bar** is a Phaser 3 game for studying law (bar exam prep) through flashcard encounters in a SCOTUS-themed environment. The player controls Kim, a law student navigating courthouse rooms, interacting with NPCs, and answering legal flashcards.

### Tech Stack
- **Engine**: Phaser 3.87 + TypeScript + Vite
- **Sprites**: ULPC (Universal LPC Spritesheet) composited layers
- **Dialogue**: Ink (inkjs) for branching conversations
- **Levels**: LDtk for room layouts
- **Deploy**: Cloudflare Pages via GitHub Actions
- **Live URL**: https://kimbar.badgey.org

## Current State (January 2026)

### ✅ Working
1. **CI/CD Pipeline** - GitHub Actions → Cloudflare Pages auto-deploy on push
2. **Registry-driven Preloader** - Loads sprites/animations from `public/content/registry.json`
3. **Sprite Compositing** - 6 layers: body + eyes + hair + torso + legs + feet
4. **Walking Animations** - Velocity-based direction (rows 7-10 of ULPC sheet)
5. **Tap-to-move** - Click anywhere to move player with physics
6. **Y-sorting** - Depth updates based on player.y position

### 🔄 Needs Testing
- **Eyes layer** - Just added, verify brown eyes visible on Kim at localhost:8080

### ⏳ Not Yet Implemented
1. **Flashcard encounters** - Cards exist in `public/content/cards/flashcards.json` (1038 cards) but no trigger/UI
2. **Clerk dialogue** - NPC exists (`npc.clerk_01`) but no interaction wired
3. **LDtk rooms** - Schema exists but no actual level rendering from LDtk files
4. **Outfit system** - OutfitSystem.ts stub exists, needs implementation
5. **Encounter system** - EncounterSystem.ts stub exists, needs flashcard UI

## Key Files

| Purpose | File |
|---------|------|
| Player movement + anims | `src/game/scenes/WorldScene.ts` |
| Asset loading + anim creation | `src/game/scenes/Preloader.ts` |
| Sprite generation | `scripts/generate-sprites.mjs` |
| Character specs | `content/characters/*.json` |
| Flashcards | `public/content/cards/flashcards.json` |
| Ink story | `public/content/ink/story.json` |
| Registry schema | `schemas/AssetRegistry.schema.json` |

## Recommended Next Steps (Priority Order)

### 1. Test Walking In-Game
```bash
npm run dev
# Open http://localhost:8080
# Click to move Kim, verify:
# - Walk animations play in correct direction
# - Eyes visible (not naked silhouette)
# - Idle animation when stopped
```

### 2. Wire One Flashcard Encounter
- Create trigger zone in WorldScene
- On enter: pause movement, show random flashcard from `flashcards.json`
- Show question + 4 choices, handle correct/incorrect
- Resume movement after answer

### 3. Wire Clerk Dialogue
- Make `npc.clerk_01` interactable (click or proximity)
- Load Ink story from `public/content/ink/story.json`
- Use existing `DialogueSystem.ts` to display

### 4. Integrate LDtk Rooms
- Export real room from LDtk
- Update `public/content/ldtk/` with room data
- Render tilemap in WorldScene

## ULPC Animation Reference

| Animation | Row | Frames | Key Format |
|-----------|-----|--------|------------|
| walk_up | 7 | 9 | `char.kim.walk_up` |
| walk_left | 8 | 9 | `char.kim.walk_left` |
| walk_down | 9 | 9 | `char.kim.walk_down` |
| walk_right | 10 | 9 | `char.kim.walk_right` |
| idle_* | same | 1 | `char.kim.idle_down` |

Sheet size: 832×1344 (13 cols × 21 rows × 64px)

## Commands

```bash
npm run dev           # Start dev server (runs prepare:content first)
npm run build         # Production build
npm run gen:sprites   # Regenerate character sprites
npm run validate      # Validate all content
```

---

**⚠️ REMINDER: Delete this file (`NEXT_SESSION.md`) after reading. Do not commit.**
