/**
 * UIChoiceList - Vertical list of choices that disable after selection.
 * Stacks upward from bottom, per dialogue requirements.
 * INVARIANT: Attach to UI layer via WorldScene.getUILayer()
 */

import { Scene, GameObjects } from 'phaser';
import { uiTheme, getChoiceConfig } from '../uiTheme';

export interface Choice {
  text: string;
  index: number;
  data?: unknown;
}

export type ChoiceState = 'normal' | 'hover' | 'selected' | 'disabled';

export interface UIChoiceListConfig {
  x: number;
  y: number;
  width: number;
  choiceHeight: number;
  spacing?: number;
  onSelect?: (choice: Choice) => void;
}

interface ChoiceButton {
  container: GameObjects.Container;
  background: GameObjects.Graphics;
  label: GameObjects.Text;
  choice: Choice;
  state: ChoiceState;
}

/**
 * Creates a vertical list of choice buttons that disable after selection.
 * Choices stack upward from the anchor point.
 */
export class UIChoiceList extends GameObjects.Container {
  private choices: ChoiceButton[] = [];
  private choiceWidth: number;
  private choiceHeight: number;
  private spacing: number;
  private onSelect: ((choice: Choice) => void) | null = null;
  private isLocked: boolean = false;
  private selectedIndex: number = -1;

  constructor(scene: Scene, config: UIChoiceListConfig) {
    super(scene, config.x, config.y);

    this.choiceWidth = config.width;
    this.choiceHeight = config.choiceHeight;
    this.spacing = config.spacing ?? uiTheme.spacing.sm;
    this.onSelect = config.onSelect ?? null;

    // Add to scene
    scene.add.existing(this);
  }

  /**
   * Set the choices to display.
   * Clears any existing choices first.
   */
  setChoices(choices: Choice[]): this {
    this.clearChoices();
    this.isLocked = false;
    this.selectedIndex = -1;

    // Build choices from bottom to top (stack upward)
    choices.forEach((choice, i) => {
      // Y offset: first choice (i=0) at bottom, stack upward
      const yOffset = -i * (this.choiceHeight + this.spacing);
      const button = this.createChoiceButton(choice, yOffset);
      this.choices.push(button);
      this.add(button.container);
    });

    return this;
  }

  private createChoiceButton(choice: Choice, yOffset: number): ChoiceButton {
    const container = this.scene.add.container(0, yOffset);

    // Background graphics
    const background = this.scene.add.graphics();
    container.add(background);

    // Label with number prefix
    const text = `${choice.index + 1}. ${choice.text}`;
    const label = this.scene.add.text(0, 0, text, {
      fontSize: uiTheme.fonts.md,
      color: uiTheme.colors.textPrimary,
      wordWrap: { width: this.choiceWidth - uiTheme.spacing.lg * 2 },
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);

    const button: ChoiceButton = {
      container,
      background,
      label,
      choice,
      state: 'normal',
    };

    // Draw initial state
    this.drawChoiceState(button);

    // Set up interactivity
    container.setSize(this.choiceWidth, this.choiceHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => this.onChoiceOver(button));
    container.on('pointerout', () => this.onChoiceOut(button));
    container.on('pointerdown', () => this.onChoiceDown(button));

    return button;
  }

  private drawChoiceState(button: ChoiceButton): void {
    button.background.clear();

    const config = getChoiceConfig(button.state);
    const halfWidth = this.choiceWidth / 2;
    const halfHeight = this.choiceHeight / 2;

    // Fill
    button.background.fillStyle(config.fillColor, 1);
    button.background.fillRect(-halfWidth, -halfHeight, this.choiceWidth, this.choiceHeight);

    // Stroke
    button.background.lineStyle(config.strokeWidth, config.strokeColor, 1);
    button.background.strokeRect(-halfWidth, -halfHeight, this.choiceWidth, this.choiceHeight);

    // Update label color
    button.label.setColor(config.textColor);
  }

  private onChoiceOver(button: ChoiceButton): void {
    if (this.isLocked || button.state === 'disabled' || button.state === 'selected') return;
    button.state = 'hover';
    this.drawChoiceState(button);
  }

  private onChoiceOut(button: ChoiceButton): void {
    if (this.isLocked || button.state === 'disabled' || button.state === 'selected') return;
    button.state = 'normal';
    this.drawChoiceState(button);
  }

  private onChoiceDown(button: ChoiceButton): void {
    if (this.isLocked || button.state === 'disabled') return;

    // Lock all choices immediately
    this.isLocked = true;
    this.selectedIndex = button.choice.index;

    // Mark selected choice
    button.state = 'selected';
    this.drawChoiceState(button);

    // Disable all other choices
    this.choices.forEach(b => {
      if (b !== button) {
        b.state = 'disabled';
        b.container.disableInteractive();
        this.drawChoiceState(b);
      }
    });

    // Disable selected choice interactivity too
    button.container.disableInteractive();

    // Trigger callback
    if (this.onSelect) {
      this.onSelect(button.choice);
    }
  }

  /**
   * Manually disable all choices (e.g., when dialogue advances).
   */
  disableAll(): this {
    this.isLocked = true;
    this.choices.forEach(button => {
      if (button.state !== 'selected') {
        button.state = 'disabled';
      }
      button.container.disableInteractive();
      this.drawChoiceState(button);
    });
    return this;
  }

  /**
   * Clear all choices.
   */
  clearChoices(): this {
    this.choices.forEach(button => {
      button.container.removeAllListeners();
      button.background.destroy();
      button.label.destroy();
      button.container.destroy();
    });
    this.choices = [];
    this.isLocked = false;
    this.selectedIndex = -1;
    return this;
  }

  /**
   * Get the currently selected choice index, or -1 if none.
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * Check if choices are locked (selection made or manually disabled).
   */
  getLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Set the selection callback.
   */
  setOnSelect(handler: ((choice: Choice) => void) | null): this {
    this.onSelect = handler;
    return this;
  }

  /**
   * Get the total height of all choices (for layout calculations).
   */
  getTotalHeight(): number {
    if (this.choices.length === 0) return 0;
    return this.choices.length * this.choiceHeight + (this.choices.length - 1) * this.spacing;
  }

  /**
   * Clean up resources.
   */
  destroy(fromScene?: boolean): void {
    this.clearChoices();
    super.destroy(fromScene);
  }
}

/**
 * Factory function for creating a UIChoiceList.
 */
export function createChoiceList(scene: Scene, config: UIChoiceListConfig): UIChoiceList {
  return new UIChoiceList(scene, config);
}
