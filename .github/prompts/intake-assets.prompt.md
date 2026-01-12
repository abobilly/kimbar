# Intake Assets Prompt

You are the Content Intake + Registry agent. Your task:

## Steps

1. Read `NEXT_SESSION.md` first. Respect invariants.

2. Identify how content/assets flow into `public/content/` today via:

   - `scripts/build-asset-index.mjs`
   - `scripts/build-characters.js`
   - `scripts/sync-public.mjs`
   - `npm run prepare:content`

3. Improve the existing pipeline (do not invent new commands unless necessary):

   - Extend `build:chars` or `build:asset-index` to discover new content deterministically
   - Ensure `validate` covers schema validation for registries and content files
   - Ensure `verify` covers deeper invariants (duplicates, broken references)

4. Ensure failures are loud and actionable:

   - Registry entry points to missing file → FAIL
   - Schema validation fails → FAIL
   - Duplicate IDs → FAIL

5. Update documentation in `NEXT_SESSION.md`.

## Required output

At the end, output:

```
## Intake Complete

### Commands to run
- npm run prepare:content
- npm run verify

### Files changed
- [list files]

### How to add a new asset pack
1. [step 1]
2. [step 2]
3. [step 3]
...

### Validations added
- [what validates what]

### Handoff
Ready for Sentinel to run `/check`
```
