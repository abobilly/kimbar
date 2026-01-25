# Smoke Run Checklist (PASS 0)

## Setup
- `npm run dev`
- Open `http://localhost:8081/` (or the Vite URL printed in terminal)
- Open DevTools Console

## Click Path
1. App loads directly into **WorldScene** (scotus_wall_lab).
2. Move the player with WASD/arrow keys toward the door tile at the lower section.
3. Confirm the scene remains stable after touching the door trigger.

## Pass/Fail
- ✅ No console errors during the flow.
- ✅ Scene remains interactive without crashes or stalled UI.
