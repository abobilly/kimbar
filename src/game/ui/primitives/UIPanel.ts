/**
 * UIPanel - Code-first panel primitive using Phaser Graphics.
 * No image assets required - uses rectangles with stroke.
 * INVARIANT: Attach to UI layer via WorldScene.getUILayer()
 */

import { Scene, GameObjects } from 'phaser';
import { uiTheme, getPanelConfig } from '../uiTheme';

export interface UIPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
  originX?: number;
  originY?: number;
}

/**
 * Creates a code-first panel using Phaser Graphics.
 * Returns a Container with a Graphics background that can have children added.
 */
export class UIPanel extends GameObjects.Container {
  private background: GameObjects.Graphics;
  private panelWidth: number;
  private panelHeight: number;
  private config: Required<Omit<UIPanelConfig, 'x' | 'y'>>;

  constructor(scene: Scene, config: UIPanelConfig) {
    super(scene, config.x, config.y);

    const panelDefaults = getPanelConfig();
    
    this.config = {
      width: config.width,
      height: config.height,
      fillColor: config.fillColor ?? panelDefaults.fillColor,
      fillAlpha: config.fillAlpha ?? panelDefaults.fillAlpha,
      strokeColor: config.strokeColor ?? panelDefaults.strokeColor,
      strokeWidth: config.strokeWidth ?? panelDefaults.strokeWidth,
      originX: config.originX ?? 0.5,
      originY: config.originY ?? 0.5,
    };

    this.panelWidth = this.config.width;
    this.panelHeight = this.config.height;

    // Create graphics for the background
    this.background = scene.add.graphics();
    this.drawBackground();
    this.add(this.background);

    // Add to scene
    scene.add.existing(this);
  }

  private drawBackground(): void {
    this.background.clear();

    // Calculate position based on origin
    const drawX = -this.panelWidth * this.config.originX;
    const drawY = -this.panelHeight * this.config.originY;

    // Fill
    this.background.fillStyle(this.config.fillColor, this.config.fillAlpha);
    this.background.fillRect(drawX, drawY, this.panelWidth, this.panelHeight);

    // Stroke
    if (this.config.strokeWidth > 0) {
      this.background.lineStyle(this.config.strokeWidth, this.config.strokeColor, 1);
      this.background.strokeRect(drawX, drawY, this.panelWidth, this.panelHeight);
    }
  }

  /**
   * Resize the panel and redraw.
   */
  setSize(width: number, height: number): this {
    this.panelWidth = width;
    this.panelHeight = height;
    this.config.width = width;
    this.config.height = height;
    this.drawBackground();
    return this;
  }

  /**
   * Get panel dimensions.
   */
  getSize(): { width: number; height: number } {
    return { width: this.panelWidth, height: this.panelHeight };
  }

  /**
   * Update panel colors dynamically.
   */
  setColors(fillColor?: number, strokeColor?: number, fillAlpha?: number): this {
    if (fillColor !== undefined) this.config.fillColor = fillColor;
    if (strokeColor !== undefined) this.config.strokeColor = strokeColor;
    if (fillAlpha !== undefined) this.config.fillAlpha = fillAlpha;
    this.drawBackground();
    return this;
  }

  /**
   * Get the inner content bounds (accounting for padding).
   */
  getContentBounds(padding: number = uiTheme.spacing.md): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const drawX = -this.panelWidth * this.config.originX;
    const drawY = -this.panelHeight * this.config.originY;
    
    return {
      x: drawX + padding,
      y: drawY + padding,
      width: this.panelWidth - padding * 2,
      height: this.panelHeight - padding * 2,
    };
  }

  /**
   * Clean up resources.
   */
  destroy(fromScene?: boolean): void {
    this.background.destroy();
    super.destroy(fromScene);
  }
}

/**
 * Factory function for creating a UIPanel.
 */
export function createPanel(scene: Scene, config: UIPanelConfig): UIPanel {
  return new UIPanel(scene, config);
}
