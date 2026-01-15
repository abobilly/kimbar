# Bounce Harness

A local "supervisor/worker" agent loop using Codex CLI and Ollama (qwen2.5-coder).

## Prerequisites
- Node.js 22+
- Codex CLI (`npm i -g @openai/codex` or similar)
- Ollama running locally (`ollama list`)
- Model pulled: `ollama pull qwen2.5-coder:7b`

## Setup
Run the check to ensure environment is ready:
```bash
npm run bounce:check
```

## Usage
Run the bounce loop with a goal:
```bash
npm run bounce -- "Refactor the login function to use async/await"
```

### Advanced Usage
```bash
# Run with max 10 iterations (default 5)
npm run bounce -- "Fix the flaky test" --max-iterations 10

# Save permanent AI artifacts (plans/reviews) to .ai/ folder
npm run bounce -- "Implement new feature" --ai-artifacts

# Specify a custom slug for artifacts
npm run bounce -- "Implement new feature" --ai-artifacts --slug "feat-login"
```

## How it works
1. **Supervisor** (Codex GPT-5.2) plans the work.
2. **Worker** (Local Qwen 2.5) implements the work (with permission checks).
3. **Gate** (`npm run verify`) runs to validate changes.
4. **Supervisor** reviews the diff and test results.
5. Loop repeats until APPROVED or max iterations reached.

## Artifacts
The loop produces the following files in the project root (ignored by git):
- `.bounce.summary.txt`: Run log and outcomes.
- `.bounce.diff.patch`: The current git diff.
- `.bounce.commands.txt`: Log of all shell commands executed.
- `.bounce.supervisor.txt` / `.bounce.worker.txt`: Latest prompts/outputs.

If `--ai-artifacts` is used:
- `.ai/plans/<slug>-iterN.md`: Supervisor plans.
- `.ai/reviews/<slug>-iterN.md`: Supervisor reviews.

## Safety
- Changes are made to your working tree.
- **Review changes** with `git diff` before committing.
- **Never** auto-commits.