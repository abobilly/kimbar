/**
 * Quest Panel UI - displays active quests parsed from Ink story state.
 * Toggleable with Q key.
 *
 * INVARIANT: All UI rendered on uiLayer via WorldScene.getUILayer(),
 * unaffected by world camera zoom/scroll.
 */

import { Scene } from 'phaser';
import { getGameState } from '@content/registry';
import { DEPTH_HUD } from '@game/constants/depth';
import { UI_MARGIN, UI_PADDING } from '@game/constants';

const QUEST_PREFIXES = ['quest_', 'has_', 'met_'] as const;
type QuestPrefix = typeof QUEST_PREFIXES[number];

const QUEST_PREFIX_ORDER: Record<QuestPrefix, number> = {
  quest_: 0,
  has_: 1,
  met_: 2
};

interface QuestEntry {
  key: string;
  name: string;
  description: string;
  completed: boolean;
  prefix: QuestPrefix;
}

function getQuestPrefix(flag: string): QuestPrefix | null {
  for (const prefix of QUEST_PREFIXES) {
    if (flag.startsWith(prefix)) return prefix;
  }
  return null;
}

function toTitleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function describePrefix(prefix: QuestPrefix): string {
  switch (prefix) {
    case 'quest_':
      return 'Objective';
    case 'has_':
      return 'Reward unlocked';
    case 'met_':
      return 'Contact met';
  }
}

export class QuestPanel {
  private scene: Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private qKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupInput();
  }

  private setupInput(): void {
    if (this.scene.input.keyboard) {
      this.qKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.qKey.on('down', () => this.toggle());
    }
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the quest panel.
   */
  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.createUI();
  }

  /**
   * Hide the quest panel.
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.destroyUI();
  }

  /**
   * Create the quest panel UI elements.
   * INVARIANT: All elements added to uiLayer for camera isolation.
   */
  private createUI(): void {
    const { width } = this.scene.scale;

    // Get UI layer from WorldScene for camera isolation
    const worldScene = this.scene as unknown as { getUILayer?: () => Phaser.GameObjects.Layer };
    const uiLayer = worldScene.getUILayer?.();

    if (!uiLayer) {
      console.warn('[QuestPanel] No UI layer available - panel will not be camera-isolated');
      this.isVisible = false;
      return;
    }

    // Create container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(DEPTH_HUD + 10); // Slightly above HUD

    // Add to UI layer for camera isolation
    if (uiLayer) {
      uiLayer.add(this.container);
    }

    // Panel dimensions
    const panelWidth = 280;
    const panelX = width - panelWidth - UI_MARGIN;
    const panelY = 130; // Below the menu button area

    // Parse active quests
    const quests = this.getActiveQuests();
    const lineHeight = 50;
    const headerHeight = 40;
    const panelHeight = Math.max(100, headerHeight + quests.length * lineHeight + UI_PADDING * 2);

    // Background panel
    const bg = this.scene.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a2e,
      0.92
    ).setStrokeStyle(2, 0x4a90a4);
    this.container.add(bg);

    // Header
    const header = this.scene.add.text(
      panelX + UI_PADDING,
      panelY + UI_PADDING,
      `Active Quests (${quests.length}) [Q]`,
      {
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold'
      }
    );
    this.container.add(header);

    // Quest list
    if (quests.length === 0) {
      const noQuests = this.scene.add.text(
        panelX + UI_PADDING,
        panelY + headerHeight + UI_PADDING,
        'No active quests.\nSpeak with NPCs to begin!',
        {
          fontSize: '14px',
          color: '#888888',
          lineSpacing: 4
        }
      );
      this.container.add(noQuests);
    } else {
      quests.forEach((quest, index) => {
        const y = panelY + headerHeight + UI_PADDING + index * lineHeight;

        // Quest status indicator
        const statusIcon = quest.completed ? '✓' : '○';
        const statusColor = quest.completed ? '#4CAF50' : '#FFD700';

        const status = this.scene.add.text(
          panelX + UI_PADDING,
          y,
          statusIcon,
          {
            fontSize: '16px',
            color: statusColor
          }
        );
        this.container.add(status);

        // Quest name
        const name = this.scene.add.text(
          panelX + UI_PADDING + 25,
          y,
          quest.name,
          {
            fontSize: '14px',
            color: quest.completed ? '#888888' : '#FFFFFF',
            fontStyle: quest.completed ? 'normal' : 'bold'
          }
        );
        this.container.add(name);

        // Quest description
        const desc = this.scene.add.text(
          panelX + UI_PADDING + 25,
          y + 18,
          quest.description,
          {
            fontSize: '12px',
            color: '#AAAAAA',
            wordWrap: { width: panelWidth - UI_PADDING * 2 - 25 }
          }
        );
        this.container.add(desc);
      });
    }
  }

  /**
   * Destroy the quest panel UI elements.
   */
  private destroyUI(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  /**
   * Parse active quests from game state story flags.
   * Returns quests that are started but not completed, plus completed quests.
   */
  private getActiveQuests(): Array<{ name: string; description: string; completed: boolean }> {
    const state = getGameState();
    const flags = state.storyFlags;
    const quests: QuestEntry[] = [];

    for (const [key, value] of Object.entries(flags)) {
      if (typeof value !== 'boolean') continue;
      const prefix = getQuestPrefix(key);
      if (!prefix) continue;

      const rawName = key.slice(prefix.length);
      const name = toTitleCase(rawName || key);

      quests.push({
        key,
        name,
        description: describePrefix(prefix),
        completed: value,
        prefix
      });
    }

    return quests.sort((a, b) => {
      const prefixOrder = QUEST_PREFIX_ORDER[a.prefix] - QUEST_PREFIX_ORDER[b.prefix];
      if (prefixOrder !== 0) return prefixOrder;
      if (a.name === b.name) return a.key < b.key ? -1 : 1;
      return a.name < b.name ? -1 : 1;
    });
  }

  /**
   * Refresh the quest panel if visible.
   * Call after story flags change.
   */
  refresh(): void {
    if (this.isVisible) {
      this.destroyUI();
      this.createUI();
    }
  }

  /**
   * Cleanup - call on scene shutdown.
   */
  destroy(): void {
    if (this.qKey) {
      this.qKey.off('down');
      this.qKey = null;
    }
    this.destroyUI();
  }

  /**
   * Check if panel is currently visible.
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }
}
