# Specification: Screenshot Pipeline Refactor

## Context
The project currently has a rudimentary screenshot capability (`scripts/screenshot-agent.mjs`) that runs E2E tests to capture game states. This needs to be formalized into a robust, unified pipeline that integrates with the CI/CD workflow and provides reliable visual verification.

## Goals
- **Formalize Script:** Ensure `screenshot-agent.mjs` is robust, well-documented, and error-handled.
- **CI Integration:** Verify `package.json` scripts and GitHub Actions workflows correctly trigger the screenshot generation.
- **Documentation:** Update developer docs to explain how to use the screenshot tool for local development and verification.
- **Context7 Compatibility:** Ensure artifacts are stored in a structure compatible with Context7 pipelines (`test-results/`).

## Requirements
- The screenshot script must atomically update screenshots (invalidate cache -> generate -> verify).
- E2E tests must be stable and deterministic to ensure consistent screenshots.
- The pipeline must handle CORS issues (already addressed, but needs verification).
- Screenshots should be committed or uploaded as artifacts in CI.

## Non-Goals
- Full visual regression testing (diffing images) is out of scope for this specific track, though this lays the groundwork for it.
