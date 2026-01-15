# PR Prep Prompt

Prepare a PR-ready summary and documentation update.

## Steps

1. Ensure gates pass:

   ```bash
   npm run check
   ```

   Or if `check` doesn't exist:

   ```bash
   npm run prepare:content && npm run verify && npm run check-boundaries && npm run test && npm run build-nolog
   ```

2. Update `NEXT_SESSION.md` with:

   - What changed
   - How to use (commands + steps)
   - Invariants (do not break)
   - Follow-ups / known issues

3. Produce PR description (copy to clipboard or output):

## PR Description Template

````markdown
## Summary

[One paragraph describing the change]

## Motivation

[Why this change is needed - 1-2 paragraphs]

## Technical Changes

- [Bullet list of what changed]
- [File by file or by area]

## Tests Run

```bash
npm run check  # All gates passed
```
````

## How to Add New Content

### Adding a [content type]

1. [step 1]
2. [step 2]
3. [step 3]

## Invariants Enforced

| Invariant | Enforcement          |
| --------- | -------------------- |
| [rule]    | [where it's checked] |

## Risks / Assumptions

- [Any risks or assumptions made]

## Follow-ups

- [ ] [Future work if any]

```

```
