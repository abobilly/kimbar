# Implementation Plan - Screenshot Pipeline Refactor

## Phase 1: Script Robustness & cleanup
- [x] Task: Audit `scripts/screenshot-agent.mjs` for error handling and edge cases.
    - [x] Sub-task: Write Tests for script logic (mocking spawn/fs).
    - [x] Sub-task: Refactor script to use proper logging and exit codes.
- [x] Task: Clean up redundant screenshot scripts/tools if any exist (check for `make_portrait.py` overlap or others).
    - [x] Sub-task: Verify `make_portrait.py` usage and document if it's distinct.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Test Stability
- [x] Task: Review E2E tests (`tests/e2e/smoke.spec.ts`) for deterministic behavior.
    - [x] Sub-task: Ensure waits are robust (no hardcoded sleeps if possible).
    - [x] Sub-task: Verify CORS handling is permanently solved for test environment.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: CI & Documentation Integration
- [x] Task: Verify GitHub Actions workflow (`.github/workflows/validate.yml`) for screenshot artifact upload.
    - [x] Sub-task: Ensure `npm run screenshot` is utilized or mirrored in CI steps.
- [x] Task: Update `GEMINI.md` and `README.md` with final usage instructions.
    - [x] Sub-task: Document `npm run screenshot` command.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
