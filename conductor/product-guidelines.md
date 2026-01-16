# Product Guidelines: Kim Bar

## 1. Visual Identity & Tone
- **Aesthetic:** **Liberated Pixel Cup (LPC)** style.
    - Assets must strictly adhere to the 32x32 tile grid and top-down perspective.
    - Characters, robes, and props must maintain consistent scaling and palette with existing LPC assets.
- **Tone:** **Playful & Satirical**.
    - The premise of "battling Supreme Court Justices with flashcards" is inherently absurd; the game embraces this.
    - While the educational content is accurate, the presentation should be fun, lighthearted, and serve as an escape from the stress of bar prep.
    - Avoid "serious/academic" UI styling that mimics boring study tools.

## 2. User Interface (UI) Architecture
- **Structure:** **Modular Components**.
    - UI elements (DialoguePanel, WardrobePanel, FlashcardArena) must be independent, decoupled systems.
    - Components should be capable of being loaded, displayed, and destroyed independently.
    - Avoid global monolithic overlays or unnecessary full-scene transitions for UI operations.

## 3. Engineering Invariants (Sacred)
These rules are enforced by CI gates (`npm run check`) and must not be violated.
- **UI Isolation:** All UI must exist on the dedicated UI layer (`WorldScene.getUILayer()`) and be rendered ONLY by the UI Camera. Never attach UI elements to the World Camera or world space.
- **Registry-First Loading:** No hardcoded asset paths (e.g., `this.load.image('x', 'content/...')`) in runtime code. All content must be loaded via the central `registry` module.
- **Deterministic Pipelines:** Asset generation scripts must produce stable, deterministic outputs (sorted keys, consistent formatting) to prevent noisy git diffs.
- **Schema Validation:** All content files (characters, rooms, flashcards) must validate against their respective JSON schemas (`schemas/*.schema.json`).

## 4. Code Style & Conventions
- **Formatting:** Enforced via strict linting (ESLint/Prettier) and pre-commit hooks.
- **TypeScript Usage:** Use idiomatic TypeScript.
    - Prefer `interface` over `type` for public APIs.
    - Use `async/await` for asynchronous operations.
    - Enable and respect `strictNullChecks`.
- **Architectural Pattern:** **Pragmatic Hybrid**.
    - **Utility/Content Logic:** Prefer pure functions. Logic for processing data (registry, stats, inventory) should be testable and immutable where possible.
    - **Game/Engine Logic:** Accept Object-Oriented Programming (OOP) for Phaser integration (Scenes, GameObjects).
    - **State Management:** Avoid global mutable state outside of the managed Phaser Scene systems.
