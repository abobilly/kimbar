# Game Package — Agent Notes

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (runs content prep)
- `npm run test` — unit + e2e tests
- `npm run test:unit` — unit tests only
- `npm run prepare:content` — rebuild content pipeline
- `npm run verify` — invariant checks

## Invariants

- UI must render on the UI layer/camera only.
- Content and assets must load through the registry/loader APIs.
- Generated outputs are deterministic and should not be committed.
