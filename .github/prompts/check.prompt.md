# Check Prompt

You are the Invariant Sentinel. Enforce repo gates using existing scripts.

## Steps

1. Run the umbrella gate (preferred):

   ```bash
   npm run check
   ```

   Or if `check` doesn't exist yet, run individually:

   ```bash
   npm run prepare:content
   npm run verify
   npm run check-boundaries
   npm run test
   npm run build-nolog
   ```

2. If the repo lacks an umbrella command, add it to `package.json`:

   ```json
   {
     "check": "npm run prepare:content && npm run verify && npm run check-boundaries && npm run test && npm run build-nolog",
     "check:fast": "npm run prepare:content && npm run verify && npm run check-boundaries && npm run test:unit && npm run build-nolog"
   }
   ```

3. Add/extend checks as needed:

   - "No hardcoded /content/ paths outside loader" (grep check)
   - Registry/asset-index determinism (stable ordering)
   - Best-effort UI isolation check (where feasible)

4. Fix only what's needed to restore invariants; keep diffs minimal.

## Required output

```
## Check Complete

### Gates run
- [x] prepare:content - PASS/FAIL
- [x] verify - PASS/FAIL
- [x] check-boundaries - PASS/FAIL
- [x] test - PASS/FAIL
- [x] build-nolog - PASS/FAIL

### Issues found
- [what failed + exact command to repro]

### Fixes applied
- [minimal diff description]

### Invariants verified
- [list what's now enforced]
```
