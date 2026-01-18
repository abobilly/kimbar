// Dialogue System - inkjs Integration
// MIGRATED: Now uses code-first UI primitives (no image assets)
import { Scene } from 'phaser';
import { Story } from 'inkjs';
import { openModal, closeModal } from '@game/ui/modal';
import { registerExit, unregisterExit } from '@game/ui/exitManager';
import { layoutDialogue } from '@game/ui/layout';
import { DEPTH_OVERLAY } from '@game/constants/depth';
import { uiTheme, getTextStyle } from '@game/ui/uiTheme';
import { UIPanel, UIChoiceList } from '@game/ui/primitives';
import type { Choice } from '@game/ui/primitives';

export interface DialogueChoice {
  text: string;
  index: number;
}

export class DialogueSystem {
  private scene: Scene;
  private story: Story | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onComplete: (() => void) | null = null;
  private onTag: ((tag: string) => void) | null = null;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isAdvancing: boolean = false;  // Guard against double-click on choices

  // New primitives
  private dialoguePanel: UIPanel | null = null;
  private choiceList: UIChoiceList | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  async loadStory(storyPath: string): Promise<void> {
    try {
      const response = await fetch(storyPath);
      const storyContent = await response.json();
      this.story = new Story(storyContent);
    } catch (error) {
      console.error('Failed to load story:', storyPath, error);
    }
  }

  start(
    knotName?: string,
    onComplete?: () => void,
    onTag?: (tag: string) => void,
    targetEntity?: Phaser.GameObjects.Components.Transform
  ): void {
    if (!this.story) {
      console.error('No story loaded!');
      return;
    }

    this.onComplete = onComplete || null;
    this.onTag = onTag || null;

    // Jump to specific knot if provided
    if (knotName) {
      this.story.ChoosePathString(knotName);
    }

    this.showDialogueUI(targetEntity);
    this.continueStory();
  }

  private showDialogueUI(target?: Phaser.GameObjects.Components.Transform): void {
    // Register as modal to block world input
    openModal('dialogue');
    // Register ESC to close dialogue
    registerExit('dialogue', () => this.close());

    const { width, height } = this.scene.scale;

    // Check target position to avoid covering face
    let isTop = false;
    if (target) {
      // Get screen position of the target
      // Note: Assumes world camera is main camera
      const camera = this.scene.cameras.main;
      const cameraAny = camera as Phaser.Cameras.Scene2D.Camera & {
        worldToScreen?: (x: number, y: number) => { x: number; y: number };
      };
      const targetX = target.x as number;
      const targetY = target.y as number;
      let screenY: number;

      if (typeof cameraAny.worldToScreen === 'function') {
        screenY = cameraAny.worldToScreen(targetX, targetY).y;
      } else {
        screenY = (targetY - camera.scrollY) * camera.zoom + camera.y;
      }

      // If target is in the bottom ~35% of screen, put box at TOP
      if (screenY > height * 0.65) {
        isTop = true;
      }
    }

    const layout = layoutDialogue(width, height, isTop);

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(DEPTH_OVERLAY);

    // Add container to UI layer if available (camera isolation from world zoom)
    const worldScene = this.scene as unknown as { getUILayer?: () => Phaser.GameObjects.Layer };
    if (worldScene.getUILayer) {
      worldScene.getUILayer().add(this.container);
    }

    // Store layout for other methods
    this.container.setData('layout', layout);

    // Create code-first panel using UIPanel primitive (no image assets)
    this.dialoguePanel = new UIPanel(this.scene, {
      x: layout.boxCenterX,
      y: layout.boxCenterY,
      width: layout.boxWidth,
      height: layout.boxHeight - 20,
      fillColor: uiTheme.colors.panelBg,
      strokeColor: uiTheme.colors.panelBorder,
      strokeWidth: uiTheme.borders.normal,
      fillAlpha: 0.95,
      originX: 0.5,
      originY: 0.5,
    });
    this.dialoguePanel.setName('dialoguePanel');
    this.container.add(this.dialoguePanel);

    // Portrait placeholder (will be updated when speaker changes)
    const portrait = this.scene.add.image(layout.portraitX, layout.portraitY, '__DEFAULT');
    portrait.setName('portrait');
    portrait.setOrigin(0.5, 0.5);
    portrait.setVisible(false);
    this.container.add(portrait);

    // Speaker name plate - code-first rectangle
    const namePlate = this.scene.add.rectangle(
      layout.namePlateX,
      layout.namePlateY,
      160,
      30,
      uiTheme.colors.buttonNormal
    ).setStrokeStyle(
      uiTheme.borders.thin,
      Phaser.Display.Color.HexStringToColor(uiTheme.colors.textAccent).color
    );
    namePlate.setName('namePlate');
    this.container.add(namePlate);

    const nameText = this.scene.add.text(
      layout.namePlateX,
      layout.namePlateY,
      '',
      getTextStyle('md', 'textAccent', { bold: true })
    ).setOrigin(0.5);
    nameText.setName('nameText');
    this.container.add(nameText);

    // Dialogue text area (limited height to leave room for choices)
    const dialogueText = this.scene.add.text(
      layout.textX,
      layout.textY,
      '',
      {
        ...getTextStyle('lg', 'textPrimary'),
        wordWrap: { width: layout.textWrapWidth },
        lineSpacing: uiTheme.spacing.xs,
      }
    );
    dialogueText.setName('dialogueText');
    this.container.add(dialogueText);

    // Choices will be rendered using UIChoiceList
    // Create placeholder container for choices (will be populated by showChoices)
    const choicesContainer = this.scene.add.container(0, 0);
    choicesContainer.setName('choicesContainer');
    this.container.add(choicesContainer);

    // Continue indicator
    const continueIndicator = this.scene.add.text(
      layout.continueX,
      layout.continueY,
      '▼',
      getTextStyle('xl', 'textAccent')
    ).setOrigin(0.5);
    continueIndicator.setName('continueIndicator');
    continueIndicator.setVisible(false);
    this.container.add(continueIndicator);

    // Full-screen scrim behind dialogue to block world clicks
    const scrim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    scrim.setInteractive();  // Swallows pointer events
    scrim.setName('scrim');
    this.container.addAt(scrim, 0);  // Add at bottom of container

    // Subscribe to resize events for responsive layout
    this.scene.scale.on('resize', this.onResize, this);

    // Animate continue indicator
    this.scene.tweens.add({
      targets: continueIndicator,
      y: height - 25,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  private continueStory(): void {
    if (!this.story || !this.container) return;

    // Get next text
    let text = '';
    let speaker = '';
    let portraitOverride: string | null = null;
    let portraitEmotion: string | null = null;

    while (this.story.canContinue) {
      text += this.story.Continue() || '';

      // Process tags
      const tags = this.story.currentTags ?? [];
      for (const tag of tags) {
        if (tag.startsWith('speaker:')) {
          speaker = tag.substring(8).trim();
        } else if (tag.startsWith('portrait:')) {
          // Format: portrait:npc.clerk_01 or portrait:npc.clerk_01:neutral
          const portraitParts = tag.substring(9).split(':');
          portraitOverride = portraitParts[0]?.trim() || null;
          portraitEmotion = portraitParts[1]?.trim() || null;
        } else if (this.onTag) {
          this.onTag(tag);
        }
      }
    }

    // Update speaker name and portrait
    const nameText = this.container.getByName('nameText') as Phaser.GameObjects.Text;
    const namePlate = this.container.getByName('namePlate') as Phaser.GameObjects.Rectangle;
    const portrait = this.container.getByName('portrait') as Phaser.GameObjects.Image;

    if (nameText && namePlate) {
      nameText.setText(speaker);
      namePlate.setVisible(speaker.length > 0);
      nameText.setVisible(speaker.length > 0);
    }

    // Try to show portrait for speaker
    if (portrait) {
      let portraitKey: string | null = null;

      // Priority 1: Explicit portrait tag override
      if (portraitOverride) {
        // Try portrait.{id} first, then just {id}
        const withPrefix = `portrait.${portraitOverride}`;
        if (this.scene.textures.exists(withPrefix)) {
          portraitKey = withPrefix;
        } else if (this.scene.textures.exists(portraitOverride)) {
          portraitKey = portraitOverride;
        }
        // Emotion variants: portrait.npc.clerk_01.neutral, etc.
        if (portraitEmotion && portraitKey) {
          const emotionKey = `${portraitKey}.${portraitEmotion}`;
          if (this.scene.textures.exists(emotionKey)) {
            portraitKey = emotionKey;
          }
        }
      }

      // Priority 2: Speaker name mapping (fallback)
      if (!portraitKey && speaker) {
        const speakerPortraitMap: Record<string, string> = {
          'Court Clerk': 'portrait.npc.clerk_01',
          'Kim': 'portrait.char.kim',
        };
        const mappedKey = speakerPortraitMap[speaker];
        if (mappedKey && this.scene.textures.exists(mappedKey)) {
          portraitKey = mappedKey;
        }
      }

      if (portraitKey) {
        portrait.setTexture(portraitKey);
        portrait.setVisible(true);
      } else {
        portrait.setVisible(false);
      }
    }

    // Update dialogue text with typewriter effect
    const dialogueText = this.container.getByName('dialogueText') as Phaser.GameObjects.Text;
    if (dialogueText) {
      this.typewriterEffect(dialogueText, text.trim());
    }

    // Clear previous choices
    this.clearChoices();

    // Check for choices or end
    if (this.story.currentChoices.length > 0) {
      this.showChoices();
    } else {
      // No more content - show continue/close indicator
      this.showContinuePrompt(true);
    }
  }

  private typewriterEffect(textObject: Phaser.GameObjects.Text, fullText: string): void {
    // Cancel any existing typewriter
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    let charIndex = 0;
    textObject.setText('');

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 30,
      callback: () => {
        // Guard: container may have been destroyed
        if (!this.container || !textObject.scene) {
          this.typewriterTimer?.destroy();
          this.typewriterTimer = null;
          return;
        }

        charIndex++;
        textObject.setText(fullText.substring(0, charIndex));

        if (charIndex >= fullText.length) {
          this.typewriterTimer?.destroy();
          this.typewriterTimer = null;
          // Show choices or continue prompt after typing
          if (this.story?.currentChoices.length === 0) {
            this.showContinuePrompt(this.story.canContinue || false);
          }
        }
      },
      repeat: fullText.length - 1
    });

    // Allow skipping typewriter by clicking
    this.container?.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.scene.scale.width, this.scene.scale.height),
      Phaser.Geom.Rectangle.Contains
    );

    const skipHandler = () => {
      if (charIndex < fullText.length && this.typewriterTimer) {
        this.typewriterTimer.destroy();
        this.typewriterTimer = null;
        textObject.setText(fullText);
        charIndex = fullText.length;
        // Show choices or continue prompt after skip
        if (this.story?.currentChoices.length === 0) {
          this.showContinuePrompt(this.story.canContinue || false);
        }
      }
    };

    this.container?.once('pointerdown', skipHandler);
  }

  private clearChoices(): void {
    // Destroy UIChoiceList if exists
    if (this.choiceList) {
      this.choiceList.destroy();
      this.choiceList = null;
    }

    // Also clear legacy choicesContainer if present
    const choicesContainer = this.container?.getByName('choicesContainer') as Phaser.GameObjects.Container;
    if (choicesContainer) {
      choicesContainer.removeAll(true);
    }
  }

  private showChoices(): void {
    if (!this.story || !this.container) return;

    const layout = this.container.getData('layout') as ReturnType<typeof layoutDialogue>;
    if (!layout) return;

    const choices = this.story.currentChoices;

    // Convert ink choices to UIChoiceList format (text + index)
    const uiChoices: Choice[] = choices.map((choice, index) => ({
      text: `${index + 1}. ${choice.text}`,
      index,
    }));

    // Create UIChoiceList
    // Position: choices stack upward from bottom
    let anchorY: number;

    if (layout.isTop) {
      // Stack downwards from below the top-box
      anchorY = (layout.boxY + layout.boxHeight + 10) + (layout.choiceHeight / 2);
    } else {
      // Stack upwards from bottom of screen (default)
      anchorY = layout.choiceBaseY;
    }

    this.choiceList = new UIChoiceList(this.scene, {
      x: layout.boxCenterX,
      y: anchorY,
      width: layout.choiceWidth,
      choiceHeight: layout.choiceHeight,
      spacing: layout.choiceSpacing,
      onSelect: (choice) => {
        // Guard against double-click
        if (this.isAdvancing) return;
        this.isAdvancing = true;

        // Disable all choices immediately (key requirement)
        this.choiceList?.disableAll();

        // Process the choice using the index from Choice interface
        this.story?.ChooseChoiceIndex(choice.index);
        this.continueStory();

        // Reset after story advances
        this.isAdvancing = false;
      },
    });

    // Set the choices after construction
    this.choiceList.setChoices(uiChoices);

    // Add choice list to container
    this.container.add(this.choiceList);

    // Hide continue indicator when showing choices
    const continueIndicator = this.container.getByName('continueIndicator') as Phaser.GameObjects.Text;
    if (continueIndicator) continueIndicator.setVisible(false);
  }

  private showContinuePrompt(hasMore: boolean): void {
    if (!this.container) return;

    const continueIndicator = this.container.getByName('continueIndicator') as Phaser.GameObjects.Text;
    if (continueIndicator) {
      continueIndicator.setVisible(true);
      continueIndicator.setText(hasMore ? '▼' : '✕');
    }

    // Make dialogue box clickable to continue
    const layout = this.container.getData('layout') as ReturnType<typeof layoutDialogue>;
    const { width, height } = this.scene.scale;

    const clickZone = this.scene.add.rectangle(
      layout?.boxCenterX || width / 2, height - 100,
      width, 200, 0x000000, 0
    ).setInteractive({ useHandCursor: true });

    clickZone.setName('clickZone');
    this.container.add(clickZone);

    clickZone.once('pointerdown', () => {
      clickZone.destroy();

      if (hasMore && this.story?.canContinue) {
        this.continueStory();
      } else {
        this.close();
      }
    });
  }

  close(): void {
    // Cancel typewriter timer to prevent crash
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    // Destroy UIChoiceList
    if (this.choiceList) {
      this.choiceList.destroy();
      this.choiceList = null;
    }

    // Destroy UIPanel
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    // Unregister modal, exit handler, and resize listener
    unregisterExit('dialogue');
    closeModal('dialogue');
    this.scene.scale.off('resize', this.onResize, this);

    this.container?.destroy();
    this.container = null;
    this.onComplete?.();
  }

  /**
   * Handle viewport resize - reflow UI elements.
   */
  private onResize(): void {
    if (!this.container) return;

    const { width, height } = this.scene.scale;
    const layout = layoutDialogue(width, height);

    // Update stored layout
    this.container.setData('layout', layout);

    // Reposition scrim
    const scrim = this.container.getByName('scrim') as Phaser.GameObjects.Rectangle;
    if (scrim) {
      scrim.setPosition(width / 2, height / 2);
      scrim.setSize(width, height);
    }

    // Reposition dialogue panel
    if (this.dialoguePanel) {
      this.dialoguePanel.setPosition(layout.boxCenterX, layout.boxCenterY);
      this.dialoguePanel.setSize(layout.boxWidth, layout.boxHeight - 20);
    }

    // Reposition portrait
    const portrait = this.container.getByName('portrait') as Phaser.GameObjects.Image;
    if (portrait) {
      portrait.setPosition(layout.portraitX, layout.portraitY);
    }

    // Reposition name plate
    const namePlate = this.container.getByName('namePlate') as Phaser.GameObjects.Rectangle;
    if (namePlate) {
      namePlate.setPosition(layout.namePlateX, layout.namePlateY);
    }

    // Reposition name text
    const nameText = this.container.getByName('nameText') as Phaser.GameObjects.Text;
    if (nameText) {
      nameText.setPosition(layout.namePlateX, layout.namePlateY);
    }

    // Reposition dialogue text
    const dialogueText = this.container.getByName('dialogueText') as Phaser.GameObjects.Text;
    if (dialogueText) {
      dialogueText.setPosition(layout.textX, layout.textY);
      dialogueText.setWordWrapWidth(layout.textWrapWidth);
    }

    // Reposition continue indicator
    const continueIndicator = this.container.getByName('continueIndicator') as Phaser.GameObjects.Text;
    if (continueIndicator) {
      continueIndicator.setPosition(layout.continueX, layout.continueY);
    }

    // Note: UIChoiceList repositioning would require recreating choices
    // For now, choices will be correctly positioned on next showChoices() call
  }

  // Get/set story variables
  getVariable(name: string): unknown {
    return this.story?.variablesState[name];
  }

  setVariable(name: string, value: unknown): void {
    if (this.story) {
      this.story.variablesState[name] = value;
    }
  }

  isActive(): boolean {
    return this.container !== null;
  }
}
