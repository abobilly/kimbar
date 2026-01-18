/**
 * UILabel - Text primitive with consistent styling from uiTheme.
 * Wraps Phaser.GameObjects.Text with theme-aware defaults.
 * INVARIANT: Attach to UI layer via WorldScene.getUILayer()
 */

import { Scene, GameObjects } from 'phaser';
import { uiTheme, getTextStyle } from '../uiTheme';

export interface UILabelConfig {
  x: number;
  y: number;
  text: string;
  fontSize?: keyof typeof uiTheme.fonts;
  color?: 'textPrimary' | 'textSecondary' | 'textAccent' | 'textDisabled' | 'textError' | 'textSuccess';
  bold?: boolean;
  italic?: boolean;
  maxWidth?: number;
  lineSpacing?: number;
  align?: 'left' | 'center' | 'right';
  originX?: number;
  originY?: number;
}

/**
 * Creates a styled text label using theme tokens.
 */
export class UILabel extends GameObjects.Text {
  private config: UILabelConfig;

  constructor(scene: Scene, config: UILabelConfig) {
    const style = getTextStyle(
      config.fontSize ?? 'md',
      config.color ?? 'textPrimary',
      {
        bold: config.bold,
        italic: config.italic,
        lineSpacing: config.lineSpacing,
      }
    );

    // Add word wrap if maxWidth specified
    if (config.maxWidth) {
      style.wordWrap = { width: config.maxWidth };
    }

    // Add alignment
    if (config.align) {
      style.align = config.align;
    }

    super(scene, config.x, config.y, config.text, style);

    this.config = config;

    // Set origin
    this.setOrigin(config.originX ?? 0, config.originY ?? 0);

    // Add to scene
    scene.add.existing(this);
  }

  /**
   * Update the label text.
   */
  setLabelText(text: string): this {
    this.setText(text);
    return this;
  }

  /**
   * Update the label color using theme tokens.
   */
  setLabelColor(color: UILabelConfig['color']): this {
    if (color) {
      this.setColor(uiTheme.colors[color]);
    }
    return this;
  }

  /**
   * Update font size using theme tokens.
   */
  setFontSize(size: keyof typeof uiTheme.fonts): this {
    this.setStyle({ fontSize: uiTheme.fonts[size] });
    return this;
  }

  /**
   * Update max width for word wrapping.
   */
  setMaxWidth(width: number | undefined): this {
    if (width) {
      this.setWordWrapWidth(width);
    } else {
      this.setWordWrapWidth(undefined as unknown as number);
    }
    return this;
  }

  /**
   * Set bold style.
   */
  setBold(bold: boolean): this {
    const italic = this.style.fontStyle?.includes('italic') ?? false;
    this.setStyle({
      fontStyle: bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    });
    return this;
  }

  /**
   * Set italic style.
   */
  setItalic(italic: boolean): this {
    const bold = this.style.fontStyle?.includes('bold') ?? false;
    this.setStyle({
      fontStyle: bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    });
    return this;
  }

  /**
   * Get configuration used to create this label.
   */
  getConfig(): UILabelConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating a UILabel.
 */
export function createLabel(scene: Scene, config: UILabelConfig): UILabel {
  return new UILabel(scene, config);
}

/**
 * Helper to create a primary text label (white, default size).
 */
export function createPrimaryLabel(scene: Scene, x: number, y: number, text: string, maxWidth?: number): UILabel {
  return new UILabel(scene, {
    x,
    y,
    text,
    color: 'textPrimary',
    maxWidth,
  });
}

/**
 * Helper to create an accent text label (gold, bold).
 */
export function createAccentLabel(scene: Scene, x: number, y: number, text: string): UILabel {
  return new UILabel(scene, {
    x,
    y,
    text,
    color: 'textAccent',
    bold: true,
  });
}

/**
 * Helper to create a secondary/muted text label.
 */
export function createSecondaryLabel(scene: Scene, x: number, y: number, text: string, maxWidth?: number): UILabel {
  return new UILabel(scene, {
    x,
    y,
    text,
    color: 'textSecondary',
    fontSize: 'sm',
    maxWidth,
  });
}
