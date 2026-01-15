/**
 * Modal state machine with priority-based management.
 * Single source of truth for modal UI state.
 * 
 * INVARIANT: At most one modal type is "active" at a time (highest priority).
 * INVARIANT: Opening a higher-priority modal auto-closes lower-priority ones.
 * INVARIANT: Scene transitions must call clearAllModals().
 */

import Phaser from 'phaser';

export type ModalType = 'dialogue' | 'encounter' | 'menu';

// Priority map: higher number = higher priority (takes precedence)
const MODAL_PRIORITY: Record<ModalType, number> = {
  menu: 1,
  dialogue: 2,
  encounter: 3
};

// Track active modals
const activeModals = new Set<ModalType>();

// Close callbacks registered by each modal
const closeCallbacks = new Map<ModalType, () => void>();

// Event emitter for modal state changes
const eventEmitter = new Phaser.Events.EventEmitter();

/**
 * Register a modal as open.
 * Auto-closes any lower-priority modals.
 * @param type The modal type to open
 * @param onClose Optional callback to invoke when this modal should close
 */
export function openModal(type: ModalType, onClose?: () => void): void {
  const newPriority = MODAL_PRIORITY[type];
  
  // Close any lower-priority modals
  for (const existingType of activeModals) {
    if (MODAL_PRIORITY[existingType] < newPriority) {
      const callback = closeCallbacks.get(existingType);
      if (callback) {
        callback();
      }
      activeModals.delete(existingType);
      closeCallbacks.delete(existingType);
    }
  }
  
  activeModals.add(type);
  if (onClose) {
    closeCallbacks.set(type, onClose);
  }
  
  eventEmitter.emit('modal:change', { type, action: 'open' });
}

/**
 * Register a modal as closed.
 */
export function closeModal(type: ModalType): void {
  activeModals.delete(type);
  closeCallbacks.delete(type);
  eventEmitter.emit('modal:change', { type, action: 'close' });
}

/**
 * Check if any modal is currently open.
 */
export function isModalOpen(): boolean {
  return activeModals.size > 0;
}

/**
 * Check if a specific modal type is open.
 */
export function isModalTypeOpen(type: ModalType): boolean {
  return activeModals.has(type);
}

/**
 * Get the currently active (highest priority) modal type, or null if none.
 */
export function getActiveModal(): ModalType | null {
  if (activeModals.size === 0) return null;
  
  let highestType: ModalType | null = null;
  let highestPriority = -1;
  
  for (const type of activeModals) {
    if (MODAL_PRIORITY[type] > highestPriority) {
      highestPriority = MODAL_PRIORITY[type];
      highestType = type;
    }
  }
  
  return highestType;
}

/**
 * Force close all modals, invoking their close callbacks.
 * Use for scene transitions.
 */
export function forceCloseAll(): void {
  for (const type of activeModals) {
    const callback = closeCallbacks.get(type);
    if (callback) {
      callback();
    }
  }
  clearAllModals();
}

/**
 * Clear all modals without invoking callbacks.
 * Use for hard resets.
 */
export function clearAllModals(): void {
  activeModals.clear();
  closeCallbacks.clear();
  eventEmitter.emit('modal:change', { type: null, action: 'clear' });
}

/**
 * Subscribe to modal state changes.
 */
export function onModalChange(
  callback: (event: { type: ModalType | null; action: 'open' | 'close' | 'clear' }) => void
): void {
  eventEmitter.on('modal:change', callback);
}

/**
 * Unsubscribe from modal state changes.
 */
export function offModalChange(
  callback: (event: { type: ModalType | null; action: 'open' | 'close' | 'clear' }) => void
): void {
  eventEmitter.off('modal:change', callback);
}
