# Review Implementation

Use the **Reviewer** agent to validate the implementation against the plan.

## Plan

<!-- Path to the plan being reviewed -->
$PLAN_PATH

## Diff

<!-- Paste git diff or use: git diff main..HEAD -->
```diff
$DIFF
```

## Instructions

1. Read the plan at `$PLAN_PATH`
2. Analyze the diff above (or run `git diff` if not provided)
3. Verify each plan step is implemented and acceptance criteria pass
4. Check "do not touch" areas are unchanged
5. Run `npm run check` and record results
6. Write the review to `.ai/reviews/$SLUG.md`

## Output

Save the review to: `.ai/reviews/$SLUG.md`

Use the format defined in `.github/agents/reviewer.agent.md`.

## After Review

- **APPROVED**: Merge the changes
- **CHANGES REQUESTED**: Address the required changes and re-review
- **BLOCKED**: Escalate to human or revert
