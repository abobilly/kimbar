/**
 * Standard interface for game systems.
 *
 * All systems should implement this interface to ensure consistent lifecycle management.
 * Systems are initialized when the scene starts and cleaned up when it shuts down.
 *
 * INVARIANT: Systems must clean up all resources in cleanup() to prevent memory leaks.
 * INVARIANT: Systems must not hold stale scene references after cleanup().
 */

import { Scene } from "phaser";

export interface ISystem {
  /**
   * Initialize the system with a scene reference.
   * Called once when the scene starts.
   */
  init(scene: Scene): void;

  /**
   * Update the system each frame (optional).
   * Not all systems need per-frame updates (e.g., event-driven systems).
   * @param time - Total elapsed time in ms
   * @param delta - Time since last frame in ms
   */
  update?(time: number, delta: number): void;

  /**
   * Clean up all system resources.
   * Called when the scene shuts down or the system is no longer needed.
   * Must destroy UI elements, cancel timers, remove event listeners, etc.
   */
  cleanup(): void;
}

/**
 * Base class for systems that provides common functionality.
 * Systems can extend this or implement ISystem directly.
 */
export abstract class BaseSystem implements ISystem {
  protected scene: Scene | null = null;
  protected isInitialized: boolean = false;

  init(scene: Scene): void {
    if (this.isInitialized) {
      console.warn(`${this.constructor.name} already initialized`);
      return;
    }
    this.scene = scene;
    this.isInitialized = true;
    this.onInit();
  }

  /**
   * Override this for system-specific initialization.
   */
  protected onInit(): void {
    // Override in subclass
  }

  /**
   * Optional update - override if system needs per-frame updates.
   */
  update?(_time: number, _delta: number): void;

  cleanup(): void {
    if (!this.isInitialized) {
      return;
    }
    this.onCleanup();
    this.scene = null;
    this.isInitialized = false;
  }

  /**
   * Override this for system-specific cleanup.
   */
  protected onCleanup(): void {
    // Override in subclass
  }

  /**
   * Check if system is ready to use.
   */
  protected assertInitialized(): void {
    if (!this.isInitialized || !this.scene) {
      throw new Error(`${this.constructor.name} not initialized`);
    }
  }
}
