/**
 * Global exit/cancel manager for modal UIs.
 * Routes ESC key to the currently active modal's close handler.
 * 
 * INVARIANT: Only one ESC handler is active at a time (the highest priority modal).
 * INVARIANT: ESC always has a defined behavior when a modal is open.
 */

import { Scene } from 'phaser';
import { ModalType, getActiveModal } from './modal';

type CloseCallback = () => void;

// Registry of close callbacks per modal type
const closeCallbacks = new Map<ModalType, CloseCallback>();

// Reference to the ESC key (set once per scene)
let escKey: Phaser.Input.Keyboard.Key | null = null;

/**
 * Initialize the exit manager for a scene.
 * Call once in scene.create() to bind ESC key.
 */
export function initExitManager(scene: Scene): void {
  // Clean up previous binding if any
  clearExitManager();
  
  if (scene.input.keyboard) {
    escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on('down', handleEscPress);
  }
}

/**
 * Register a close callback for a modal type.
 * Call when opening a modal.
 */
export function registerExit(type: ModalType, callback: CloseCallback): void {
  closeCallbacks.set(type, callback);
}

/**
 * Unregister a close callback for a modal type.
 * Call when closing a modal.
 */
export function unregisterExit(type: ModalType): void {
  closeCallbacks.delete(type);
}

/**
 * Handle ESC key press - route to active modal's close handler.
 */
function handleEscPress(): void {
  const activeModal = getActiveModal();
  
  if (activeModal) {
    const callback = closeCallbacks.get(activeModal);
    if (callback) {
      callback();
    }
  }
}

/**
 * Clear all exit manager state.
 * Call on scene shutdown.
 */
export function clearExitManager(): void {
  if (escKey) {
    escKey.off('down', handleEscPress);
    escKey = null;
  }
  closeCallbacks.clear();
}

/**
 * Check if exit manager has a handler for the given modal type.
 */
export function hasExitHandler(type: ModalType): boolean {
  return closeCallbacks.has(type);
}
