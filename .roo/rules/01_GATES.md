# Verification Gates — Run After Every Subtask

Execute or acknowledge each command below. If a command is skipped, document why in the task notes and `NEXT_SESSION.md`.

1. `npm run check-boundaries`
   - Acts as the lint pass. Ensures changes stay within allowed directories.
2. `npx tsc --noEmit`
   - Typecheck the project without emitting output.
3. `npm run test:unit`
   - Run Vitest unit coverage for immediate feedback.
4. `npm run test:e2e`
   - Execute Playwright scenarios when surface changes impact gameplay.
5. `npm run validate:tiled`
   - Validate Tiled maps against contracts before compiling.
6. `npm run build:tiled`
   - Compile validated Tiled assets into generated LevelData formats.
7. `npm run verify`
   - Run the umbrella content/schema verification pipeline.
8. `npm run dev`
   - Boot the game, confirm the target scene loads, and note the outcome before stopping the process.
