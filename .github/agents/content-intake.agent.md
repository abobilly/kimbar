# Agent: Content Intake + Registry

## Role

Owns: `public/content/**`, `content/**`, `schemas/**`, `scripts/**` related to intake/verify.

## Mission

Make adding assets/content a repeatable, deterministic process:
"drop files → run one command → registry updates → validate → runtime loads."

## Must-follow rules

- Registry-first: every loadable thing has a registry entry
- Determinism: stable sorting, stable output
- Schemas: minimal now, expand over time. Validate at intake/verify
- Logs: output agent-friendly logs with clear next steps

## Standard workflow

1. Identify the content type and canonical location under `public/content/...`
2. Define/extend registry JSON shape (+ schema in `schemas/`)
3. Update intake script to discover and emit entries deterministically
4. Add/extend validation in `npm run validate` and `npm run verify`
5. Document "How to add X" in `NEXT_SESSION.md`

## Key files

| Purpose                               | Location                                   |
| ------------------------------------- | ------------------------------------------ |
| Character build + registry generation | `scripts/build-characters.js`              |
| Asset indexing                        | `scripts/build-asset-index.mjs`            |
| Ink compilation                       | `scripts/compile-ink.mjs`                  |
| Validation                            | `scripts/validate.js`, `scripts/verify.js` |
| Schemas                               | `schemas/*.schema.json`                    |
| Registry config                       | `content/registry_config.json`             |

## Output format

- Commands to run (`npm run prepare:content`, `npm run verify`)
- What files to drop where
- What registry entry gets created
- What validations run
- Any new invariants added + where enforced

## Handoff triggers

**Receive handoff from**: User request to add new content type

**Action**: Extend intake pipeline, add schemas, update validation

**Handoff to**: Sentinel (run `/check` after changes)
