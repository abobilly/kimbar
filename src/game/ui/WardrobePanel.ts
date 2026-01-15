/**
 * Wardrobe Panel UI - displays unlocked outfits and allows equipping them.
 * Toggleable with C key.
 */

import { Scene } from 'phaser';
import { OutfitSystem } from '@game/systems/OutfitSystem';
import { DEPTH_HUD } from '@game/constants/depth';
import { UI_MARGIN, UI_PADDING } from '@game/constants';
import { Outfit } from '@content/types';

export class WardrobePanel {
  private scene: Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private toggleKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupInput();
  }

  private setupInput(): void {
    if (this.scene.input.keyboard) {
      this.toggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      this.toggleKey.on('down', () => this.toggle());
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.createUI();
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.destroyUI();
  }

  private createUI(): void {
    const { width, height } = this.scene.scale;
    const worldScene = this.scene as unknown as { getUILayer?: () => Phaser.GameObjects.Layer };
    const uiLayer = worldScene.getUILayer?.();

    if (!uiLayer) {
      console.warn('[WardrobePanel] No UI layer available');
      this.isVisible = false;
      return;
    }

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(DEPTH_HUD + 20); // Top level
    uiLayer.add(this.container);

    // Panel dimensions
    const panelWidth = 400;
    const panelHeight = 500;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Background
    const bg = this.scene.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a2e,
      0.95
    ).setStrokeStyle(3, 0xdaa520); // Gold border
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(
      panelX + panelWidth / 2,
      panelY + UI_PADDING + 10,
      'Wardrobe',
      {
        fontSize: '24px',
        color: '#daa520',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0);
    this.container.add(title);

    // Close Hint
    const closeHint = this.scene.add.text(
      panelX + panelWidth - UI_PADDING,
      panelY + UI_PADDING,
      '[C] Close',
      { fontSize: '14px', color: '#888' }
    ).setOrigin(1, 0);
    this.container.add(closeHint);

    // Outfits List
    this.renderOutfitsList(panelX, panelY + 60, panelWidth);
  }

  private renderOutfitsList(x: number, startY: number, width: number): void {
    if (!this.container) return;

    const outfits = OutfitSystem.getUnlockedOutfits();
    const equipped = OutfitSystem.getEquippedOutfit();
    const itemHeight = 60;

    if (outfits.length === 0) {
        const noOutfits = this.scene.add.text(
            x + width / 2,
            startY + 50,
            "No outfits unlocked yet.",
            { color: '#888', fontSize: '16px' }
        ).setOrigin(0.5);
        this.container.add(noOutfits);
        return;
    }

    outfits.forEach((outfit, index) => {
      const y = startY + (index * itemHeight);
      const isEquipped = equipped?.id === outfit.id;

      // Item Background (clickable)
      const bg = this.scene.add.rectangle(
        x + width / 2,
        y + itemHeight / 2,
        width - UI_PADDING * 2,
        itemHeight - 4,
        isEquipped ? 0x2d2d44 : 0x000000,
        0.5
      ).setInteractive({ useHandCursor: true });
      
      if (isEquipped) {
        bg.setStrokeStyle(1, 0x4CAF50);
      }

      bg.on('pointerover', () => bg.setFillStyle(0x3d3d54, 0.7));
      bg.on('pointerout', () => bg.setFillStyle(isEquipped ? 0x2d2d44 : 0x000000, 0.5));
      bg.on('pointerdown', () => this.equip(outfit));

      this.container!.add(bg);

      // Outfit Name
      const name = this.scene.add.text(
        x + UI_PADDING * 2,
        y + 10,
        outfit.name,
        {
          fontSize: '16px',
          color: isEquipped ? '#4CAF50' : '#ffffff',
          fontStyle: isEquipped ? 'bold' : 'normal'
        }
      );
      this.container!.add(name);

      // Buff Description
      const buffs = this.formatBuffs(outfit);
      if (buffs) {
        const buffText = this.scene.add.text(
          x + UI_PADDING * 2,
          y + 32,
          buffs,
          {
            fontSize: '12px',
            color: '#aaaaff'
          }
        );
        this.container!.add(buffText);
      }

      // Checkmark for equipped
      if (isEquipped) {
        const check = this.scene.add.text(
            x + width - UI_PADDING * 3,
            y + itemHeight / 2,
            'EQUIPPED',
            { fontSize: '12px', color: '#4CAF50', fontStyle: 'bold' }
        ).setOrigin(1, 0.5);
        this.container!.add(check);
      }
    });
  }

  private formatBuffs(outfit: Outfit): string {
    const parts = [];
    if (outfit.buffs.hints) parts.push(`+${outfit.buffs.hints} Hints`);
    if (outfit.buffs.strike) parts.push(`+${outfit.buffs.strike} Strike Capacity`);
    if (outfit.buffs.extraTime) parts.push(`+${outfit.buffs.extraTime}s Time`);
    if (outfit.buffs.citationBonus) parts.push(`+${outfit.buffs.citationBonus}% Citations`);
    return parts.join(', ');
  }

  private equip(outfit: Outfit): void {
    const success = OutfitSystem.equipOutfit(outfit.id);
    if (success) {
      this.refresh();
      // Notify scene to update player sprite
      if ('updatePlayerAppearance' in this.scene) {
        (this.scene as any).updatePlayerAppearance();
      }
    }
  }

  refresh(): void {
    if (this.isVisible) {
      this.destroyUI();
      this.createUI();
    }
  }

  private destroyUI(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  destroy(): void {
    if (this.toggleKey) {
      this.toggleKey.off('down');
      this.toggleKey = null;
    }
    this.destroyUI();
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
