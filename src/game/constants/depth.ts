/**
 * Depth (z-order) constants for Phaser GameObjects.
 * Higher values render on top of lower values.
 * 
 * INVARIANT: These tiers must be respected across all scenes and systems.
 * World < NPC < Player < HUD < Overlay < Modal < Popup < Debug
 */

// World layer - tilemap, terrain, floor decorations
export const DEPTH_WORLD = 0;

// Entity layers - sorted by Y for proper overlap
export const DEPTH_NPC = 100;
export const DEPTH_PLAYER = 200;

// HUD layer - stats panel, menu button, always-visible UI
export const DEPTH_HUD = 800;

// Overlay layer - semi-transparent scrim behind modals
export const DEPTH_OVERLAY = 900;

// Modal layer - dialogue boxes, encounter UI, menu panels
export const DEPTH_MODAL = 1000;

// Popup layer - tooltips, hints, notifications above modals
export const DEPTH_POPUP = 1100;

// Debug layer - FPS, grid overlays, developer tools
export const DEPTH_DEBUG = 2000;
