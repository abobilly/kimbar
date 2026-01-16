# Track Specification: Asset Pipeline & UI Overhaul (with pixel-mcp)

**Track ID:** `asset_pipeline_20260115`
**Type:** Feature (Infrastructure)
**Description:** Comprehensive track to replace placeholder assets with high-quality pixel art (LPC-based + AI-generated) following a Neo-Classical SCOTUS theme. Utilizes the `pixel-mcp` toolchain for automated asset generation.
**Priority:** P0

## 1. Overview
This track aims to replace all placeholder assets (UI, props, tiles) with production-ready pixel art. The visual theme is "Neo-Classical SCOTUS" (marble, brass, wood).
The strategy shifts from pure manual sourcing to **AI-Augmented Generation**, utilizing the `pixel-mcp` (Aseprite) server.
*   **Architect:** Gemini (Plans, Code Structure, registry integration).
*   **Artist:** Claude (via `pixel-mcp`, generates/edits sprites, handles dithering/recoloring).

## 2. Visual Style & Theme
*   **Style:** **LPC-Compatible / Mixed Pixel Art**.
    *   Base: Liberated Pixel Cup (32x32 grid).
    *   Relaxation: Strict LPC palette/line-art rules are **relaxed** in favor of asset quantity and thematic fit. Use `pixel-mcp` to dither/unify colors post-generation if needed.
*   **Theme:** Neo-Classical Supreme Court (Federal).
    *   **Materials:** Marble (White/Grey), Oak Wood (Dark Brown), Brass/Gold (Yellow/Amber).
    *   **Colors:** Navy Blue backgrounds, Teal accents, Burgundy/Seal Red highlights.
    *   **UI:** 9-slice marble panels, brass borders, parchment backgrounds.

## 3. Functional Requirements
*   **Toolchain Setup:**
    *   Ensure `pixel-mcp` is active and Aseprite is accessible headless.
    *   Verify Claude can invoke `create_canvas`, `draw_pixels`, `export_sprite`.
*   **Asset Sourcing & Generation:**
    *   **Source:** OGA/Context7 for base LPC assets.
    *   **Generate:** Use Claude + `pixel-mcp` to create missing "Neo-Classical" props (e.g., specific busts, ornate railings, marble columns).
    *   **Refine:** Use Aseprite scripts via MCP to apply palette unification to heterogeneous assets.
*   **Pipeline Extension:**
    *   Create `tools/ui-slicer/` (or use Aseprite scripts) to generate 9-slice panels.
    *   Extend `tools/tailor/` to process static props and autotiles.
*   **Registry Integration:**
    *   Update `AssetRegistry` to support dynamic loading of generated assets.
    *   Ensure generated assets have stable IDs/Paths.
*   **UI Refactor:**
    *   Update Game UI (Dialogue, HUD, Menu) to use the new "Neo-Classical" assets.

## 4. Execution Strategy (Agent Workflow)
*   **Gemini (Coordinator):**
    1.  Identifies missing assets (e.g., "Need a 32x64 marble column").
    2.  Writes a prompt/request for Claude.
    3.  Integrates the resulting file into the Registry/Game Code.
*   **Claude (Executor):**
    1.  Receives task.
    2.  Calls `pixel-mcp` tools (`draw_rectangle`, `apply_shading`, `export_sprite`).
    3.  Produces final PNG artifact.

## 5. Non-Functional Requirements
*   **Invariants:**
    *   **Headless:** Generation must not require GUI interaction.
    *   **UI Isolation:** UI remains on `getUILayer()`.
    *   **Deterministic:** Scripts/Prompts should produce consistent results where possible.
*   **Testing:** Visual regression tests (`npm run screenshot`).

## 6. Acceptance Criteria
*   [ ] **Toolchain Active:** `pixel-mcp` verified working with Claude.
*   [ ] **Zero Placeholders:** No colored circles/debug rects in game.
*   [ ] **Theme Cohesion:** "Neo-Classical" aesthetic achieved (even if style varies slightly).
*   [ ] **Registry Update:** All new assets are properly indexed and loadable.
*   [ ] **Pipeline Integrity:** `npm run prepare:content` runs successfully.
