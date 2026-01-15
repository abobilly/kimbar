/**
 * Universal constants for Kim Bar game.
 * These are the canonical values - derive everything else from these.
 */

// World grid constants
export const TILE_PX = 32;  // LPC standard tile size

// UI layout constants (viewport-relative)
export const UI_MARGIN = 20;        // Edge margin from viewport
export const UI_PADDING = 16;       // Internal padding in UI boxes
export const UI_GAP = 8;            // Gap between UI elements

// Font sizes
export const FONT_SM = 14;
export const FONT_MD = 16;
export const FONT_LG = 18;
export const FONT_XL = 24;
export const FONT_TITLE = 32;

// Minimum dimensions for UI elements
export const MIN_BUTTON_HEIGHT = 36;
export const MIN_CHOICE_HEIGHT = 40;

// Dialogue box sizing (as fraction of viewport height)
export const DIALOGUE_BOX_HEIGHT_RATIO = 0.32;
export const DIALOGUE_BOX_MIN_HEIGHT = 200;
export const DIALOGUE_BOX_MAX_HEIGHT = 320;
