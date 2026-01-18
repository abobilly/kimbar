/**
 * UIButton - Code-first button primitive with hover/pressed/disabled states.
 * No image assets required - uses Graphics rectangles.
 * INVARIANT: Attach to UI layer via WorldScene.getUILayer()
 */

import { Scene, GameObjects } from 'phaser';
import { uiTheme, getButtonConfig, getTextStyle } from '../uiTheme';

export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

export interface UIButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: keyof typeof uiTheme.fonts;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Creates a code-first button using Phaser Graphics.
 * Handles hover, pressed, and disabled states automatically.
 */
export class UIButton extends GameObjects.Container {
  private background: GameObjects.Graphics;
  private label: GameObjects.Text;
  private buttonWidth: number;
  private buttonHeight: number;
  private currentState: ButtonState = 'normal';
  private onClick: (() => void) | null = null;
  private isDisabled: boolean = false;

  constructor(scene: Scene, config: UIButtonConfig) {
    super(scene, config.x, config.y);

    this.buttonWidth = config.width;
    this.buttonHeight = config.height;
    this.onClick = config.onClick ?? null;
    this.isDisabled = config.disabled ?? false;

    // Create graphics background
    this.background = scene.add.graphics();
    this.add(this.background);

    // Create label
    const textStyle = getTextStyle(config.fontSize ?? 'md', 'textPrimary');
    this.label = scene.add.text(0, 0, config.text, textStyle);
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    // Set initial state
    this.currentState = this.isDisabled ? 'disabled' : 'normal';
    this.drawState();

    // Set up hit area for interactivity
    this.setSize(this.buttonWidth, this.buttonHeight);
    this.setInteractive({ useHandCursor: !this.isDisabled });

    // Event handlers
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);

    // Add to scene
    scene.add.existing(this);
  }

  private drawState(): void {
    this.background.clear();

    const config = getButtonConfig(this.currentState);
    const halfWidth = this.buttonWidth / 2;
    const halfHeight = this.buttonHeight / 2;

    // Fill
    this.background.fillStyle(config.fillColor, 1);
    this.background.fillRect(-halfWidth, -halfHeight, this.buttonWidth, this.buttonHeight);

    // Stroke
    this.background.lineStyle(config.strokeWidth, config.strokeColor, 1);
    this.background.strokeRect(-halfWidth, -halfHeight, this.buttonWidth, this.buttonHeight);

    // Update text color based on state
    if (this.currentState === 'disabled') {
      this.label.setColor(uiTheme.colors.textDisabled);
    } else if (this.currentState === 'hover') {
      this.label.setColor(uiTheme.colors.textAccent);
    } else {
      this.label.setColor(uiTheme.colors.textPrimary);
    }
  }

  private onPointerOver(): void {
    if (this.isDisabled) return;
    this.currentState = 'hover';
    this.drawState();
  }

  private onPointerOut(): void {
    if (this.isDisabled) return;
    this.currentState = 'normal';
    this.drawState();
  }

  private onPointerDown(): void {
    if (this.isDisabled) return;
    this.currentState = 'pressed';
    this.drawState();
  }

  private onPointerUp(): void {
    if (this.isDisabled) return;
    
    // Only trigger click if still over the button
    if (this.currentState === 'pressed') {
      this.currentState = 'hover';
      this.drawState();
      
      if (this.onClick) {
        this.onClick();
      }
    }
  }

  /**
   * Set the button text.
   */
  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  /**
   * Get the button text.
   */
  getText(): string {
    return this.label.text;
  }

  /**
   * Enable/disable the button.
   */
  setDisabled(disabled: boolean): this {
    this.isDisabled = disabled;
    this.currentState = disabled ? 'disabled' : 'normal';
    this.setInteractive({ useHandCursor: !disabled });
    this.drawState();
    return this;
  }

  /**
   * Check if button is disabled.
   */
  getDisabled(): boolean {
    return this.isDisabled;
  }

  /**
   * Set the click handler.
   */
  setOnClick(handler: (() => void) | null): this {
    this.onClick = handler;
    return this;
  }

  /**
   * Resize the button.
   */
  setButtonSize(width: number, height: number): this {
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.setSize(width, height);
    this.drawState();
    return this;
  }

  /**
   * Get button dimensions.
   */
  getButtonSize(): { width: number; height: number } {
    return { width: this.buttonWidth, height: this.buttonHeight };
  }

  /**
   * Clean up resources.
   */
  destroy(fromScene?: boolean): void {
    this.off('pointerover', this.onPointerOver, this);
    this.off('pointerout', this.onPointerOut, this);
    this.off('pointerdown', this.onPointerDown, this);
    this.off('pointerup', this.onPointerUp, this);
    this.background.destroy();
    this.label.destroy();
    super.destroy(fromScene);
  }
}

/**
 * Factory function for creating a UIButton.
 */
export function createButton(scene: Scene, config: UIButtonConfig): UIButton {
  return new UIButton(scene, config);
}
