/**
 * PlayerController - Handles player movement, animation, and input.
 *
 * Extracted from WorldScene to reduce complexity and improve testability.
 * Manages keyboard input (WASD + arrows) and tap-to-move functionality.
 *
 * INVARIANT: Player depth is updated based on Y position for proper sorting.
 * INVARIANT: Movement is blocked when modals are open.
 */

import { BaseSystem } from "./ISystem";
import { isModalOpen } from "@game/ui/modal";

export interface PlayerControllerConfig {
  /** Movement speed in pixels/second */
  speed?: number;
  /** Distance threshold for arrival */
  arriveDistance?: number;
  /** Character sprite key prefix (e.g., "char.kim") */
  characterKey?: string;
}

const DEFAULT_CONFIG: Required<PlayerControllerConfig> = {
  speed: 160,
  arriveDistance: 6,
  characterKey: "char.kim",
};

export class PlayerController extends BaseSystem {
  private config: Required<PlayerControllerConfig>;

  // Player state
  private player: Phaser.GameObjects.Sprite | null = null;
  private playerTarget: { x: number; y: number } | null = null;
  private moveTween: Phaser.Tweens.Tween | null = null;
  private lastDirection: string = "down";
  private lastPlayerY: number = 0;

  // Input
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor(config: PlayerControllerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  protected onInit(): void {
    this.setupInput();
  }

  /**
   * Set the player sprite to control.
   */
  setPlayer(player: Phaser.GameObjects.Sprite): void {
    this.player = player;
    this.lastPlayerY = player.y;
  }

  /**
   * Get the controlled player sprite.
   */
  getPlayer(): Phaser.GameObjects.Sprite | null {
    return this.player;
  }

  /**
   * Set a target position for tap-to-move.
   */
  setTarget(x: number, y: number): void {
    this.playerTarget = { x, y };
  }

  /**
   * Clear the current movement target.
   */
  clearTarget(): void {
    this.playerTarget = null;
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }
  }

  /**
   * Get the last facing direction.
   */
  getLastDirection(): string {
    return this.lastDirection;
  }

  private setupInput(): void {
    if (!this.scene?.input?.keyboard) return;

    this.wasdKeys = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.cursorKeys = this.scene.input.keyboard.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    if (!this.scene || !this.player) return;

    // Block movement when modals are open
    if (isModalOpen()) {
      this.stopMovement();
      return;
    }

    const hasPhysics = this.hasPhysicsBody();

    // Check keyboard input
    const { dx: keyboardDx, dy: keyboardDy } = this.getKeyboardInput();
    const usingKeyboard = keyboardDx !== 0 || keyboardDy !== 0;

    // Keyboard overrides tap-to-move
    if (usingKeyboard) {
      this.clearTarget();
    }

    // Determine movement
    let dx = 0;
    let dy = 0;

    if (usingKeyboard) {
      dx = keyboardDx;
      dy = keyboardDy;
    } else if (this.playerTarget && !this.moveTween) {
      this.startTweenToTarget(hasPhysics);
      return;
    }

    // No movement - idle
    if (dx === 0 && dy === 0) {
      this.setIdle(hasPhysics);
      return;
    }

    // Apply movement
    this.applyMovement(dx, dy, delta, hasPhysics);
  }

  private hasPhysicsBody(): boolean {
    return !!(this.player?.body && "setVelocity" in this.player.body);
  }

  private getKeyboardInput(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.wasdKeys) {
      if (this.wasdKeys.W?.isDown || this.cursorKeys?.up?.isDown) dy = -1;
      if (this.wasdKeys.S?.isDown || this.cursorKeys?.down?.isDown) dy = 1;
      if (this.wasdKeys.A?.isDown || this.cursorKeys?.left?.isDown) dx = -1;
      if (this.wasdKeys.D?.isDown || this.cursorKeys?.right?.isDown) dx = 1;
    }

    return { dx, dy };
  }

  private stopMovement(): void {
    if (!this.player) return;

    if (this.hasPhysicsBody()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
      this.playerTarget = null;
    }
  }

  private startTweenToTarget(hasPhysics: boolean): void {
    if (!this.scene || !this.player || !this.playerTarget) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.playerTarget.x,
      this.playerTarget.y
    );
    const duration = (distance / this.config.speed) * 1000;

    // Determine direction for animation
    const targetDx = this.playerTarget.x - this.player.x;
    const targetDy = this.playerTarget.y - this.player.y;
    const animDir = this.getAnimDirection(targetDx, targetDy);
    this.lastDirection = animDir;

    // Play walk animation
    if (hasPhysics) {
      this.playAnimation(`walk_${animDir}`);
    }

    // Create movement tween
    this.moveTween = this.scene.tweens.add({
      targets: this.player,
      x: this.playerTarget.x,
      y: this.playerTarget.y,
      duration,
      ease: "Linear",
      onUpdate: () => this.updateDepth(),
      onComplete: () => this.onTweenComplete(hasPhysics),
    });
  }

  private onTweenComplete(hasPhysics: boolean): void {
    if (!this.player) return;

    if (hasPhysics) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    this.player.setDepth(this.player.y);
    this.lastPlayerY = this.player.y;
    this.playerTarget = null;
    this.moveTween = null;

    // Play idle animation
    if (hasPhysics) {
      this.playAnimation(`idle_${this.lastDirection}`);
    }
  }

  private setIdle(hasPhysics: boolean): void {
    if (!this.player) return;

    if (hasPhysics) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.playAnimation(`idle_${this.lastDirection}`);
    }
  }

  private applyMovement(dx: number, dy: number, delta: number, hasPhysics: boolean): void {
    if (!this.player) return;

    const animDir = this.getAnimDirection(dx, dy);
    this.lastDirection = animDir;

    if (hasPhysics) {
      const velocity = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.config.speed);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
      this.playAnimation(`walk_${animDir}`);
    } else {
      // Position-based fallback for placeholder
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = this.config.speed * (delta / 1000);
      const ratio = Math.min(speed / dist, 1);
      this.player.x += dx * ratio;
      this.player.y += dy * ratio;
    }

    this.updateDepth();
  }

  private updateDepth(): void {
    if (!this.player) return;

    const currentY = Math.floor(this.player.y);
    if (Math.abs(currentY - this.lastPlayerY) >= 4) {
      this.player.setDepth(currentY);
      this.lastPlayerY = currentY;
    }
  }

  private playAnimation(animSuffix: string): void {
    if (!this.scene || !this.player) return;

    const animKey = `${this.config.characterKey}.${animSuffix}`;
    if (this.scene.anims.exists(animKey) && this.player.anims?.currentAnim?.key !== animKey) {
      this.player.play(animKey);
    }
  }

  private getAnimDirection(dx: number, dy: number): string {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
  }

  protected onCleanup(): void {
    this.clearTarget();
    this.player = null;
    this.wasdKeys = null;
    this.cursorKeys = null;
  }
}
