// Dialogue System - inkjs Integration
import { Scene } from 'phaser';
import { Story } from 'inkjs';

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
    onTag?: (tag: string) => void
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

    this.showDialogueUI();
    this.continueStory();
  }

  private showDialogueUI(): void {
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(900);

    // Dialogue box at bottom of screen
    const boxHeight = 200;
    const boxY = height - boxHeight;

    // Background
    const bg = this.scene.add.rectangle(
      width / 2, boxY + boxHeight / 2,
      width - 40, boxHeight - 20,
      0x1a1a2e, 0.95
    ).setStrokeStyle(3, 0x4a90a4);
    this.container.add(bg);

    // Speaker name plate
    const namePlate = this.scene.add.rectangle(100, boxY + 10, 160, 30, 0x2a4858)
      .setStrokeStyle(2, 0xFFD700);
    namePlate.setName('namePlate');
    this.container.add(namePlate);

    const nameText = this.scene.add.text(100, boxY + 10, '', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    nameText.setName('nameText');
    this.container.add(nameText);

    // Dialogue text area
    const dialogueText = this.scene.add.text(40, boxY + 40, '', {
      fontSize: '20px',
      color: '#FFFFFF',
      wordWrap: { width: width - 100 },
      lineSpacing: 8
    });
    dialogueText.setName('dialogueText');
    this.container.add(dialogueText);

    // Choices container
    const choicesContainer = this.scene.add.container(0, 0);
    choicesContainer.setName('choicesContainer');
    this.container.add(choicesContainer);

    // Continue indicator
    const continueIndicator = this.scene.add.text(
      width - 60, height - 30, '▼', {
      fontSize: '24px',
      color: '#FFD700'
    }).setOrigin(0.5);
    continueIndicator.setName('continueIndicator');
    continueIndicator.setVisible(false);
    this.container.add(continueIndicator);

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

    while (this.story.canContinue) {
      text += this.story.Continue() || '';
      
      // Process tags
      const tags = this.story.currentTags;
      for (const tag of tags) {
        if (tag.startsWith('speaker:')) {
          speaker = tag.substring(8).trim();
        } else if (this.onTag) {
          this.onTag(tag);
        }
      }
    }

    // Update speaker name
    const nameText = this.container.getByName('nameText') as Phaser.GameObjects.Text;
    const namePlate = this.container.getByName('namePlate') as Phaser.GameObjects.Rectangle;
    if (nameText && namePlate) {
      nameText.setText(speaker);
      namePlate.setVisible(speaker.length > 0);
      nameText.setVisible(speaker.length > 0);
    }

    // Update dialogue text with typewriter effect
    const dialogueText = this.container.getByName('dialogueText') as Phaser.GameObjects.Text;
    if (dialogueText) {
      this.typewriterEffect(dialogueText, text.trim());
    }

    // Clear previous choices
    const choicesContainer = this.container.getByName('choicesContainer') as Phaser.GameObjects.Container;
    if (choicesContainer) {
      choicesContainer.removeAll(true);
    }

    // Check for choices or end
    if (this.story.currentChoices.length > 0) {
      this.showChoices();
    } else {
      // No more content - show continue/close indicator
      this.showContinuePrompt(true);
    }
  }

  private typewriterEffect(textObject: Phaser.GameObjects.Text, fullText: string): void {
    let charIndex = 0;
    textObject.setText('');
    
    const typeTimer = this.scene.time.addEvent({
      delay: 30,
      callback: () => {
        charIndex++;
        textObject.setText(fullText.substring(0, charIndex));
        
        if (charIndex >= fullText.length) {
          typeTimer.destroy();
          // Show choices or continue prompt after typing
          if (this.story?.currentChoices.length === 0) {
            this.showContinuePrompt(this.story.canContinue || false);
          }
        }
      },
      repeat: fullText.length - 1
    });

    // Allow skipping typewriter
    this.container?.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.scene.scale.width, this.scene.scale.height),
      Phaser.Geom.Rectangle.Contains
    );
    
    const skipHandler = () => {
      if (charIndex < fullText.length) {
        typeTimer.destroy();
        textObject.setText(fullText);
        charIndex = fullText.length;
      }
    };
    
    this.container?.once('pointerdown', skipHandler);
  }

  private showChoices(): void {
    if (!this.story || !this.container) return;

    const { width, height } = this.scene.scale;
    const choicesContainer = this.container.getByName('choicesContainer') as Phaser.GameObjects.Container;
    if (!choicesContainer) return;

    const choices = this.story.currentChoices;
    const startY = height - 180;
    const spacing = 45;

    choices.forEach((choice, index) => {
      const y = startY + index * spacing;
      
      const choiceBtn = this.scene.add.container(width / 2, y);
      
      const bg = this.scene.add.rectangle(0, 0, width - 100, 35, 0x2a4858)
        .setStrokeStyle(2, 0x4a90a4);
      
      const text = this.scene.add.text(0, 0, `${index + 1}. ${choice.text}`, {
        fontSize: '18px',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      choiceBtn.add([bg, text]);
      choiceBtn.setSize(width - 100, 35);
      choiceBtn.setInteractive({ useHandCursor: true });

      choiceBtn.on('pointerover', () => {
        bg.setFillStyle(0x3a5868);
        text.setColor('#FFD700');
      });

      choiceBtn.on('pointerout', () => {
        bg.setFillStyle(0x2a4858);
        text.setColor('#FFFFFF');
      });

      choiceBtn.on('pointerdown', () => {
        this.story?.ChooseChoiceIndex(index);
        this.continueStory();
      });

      choicesContainer.add(choiceBtn);
    });

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
    const { width, height } = this.scene.scale;
    
    const clickZone = this.scene.add.rectangle(
      width / 2, height - 100,
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
    this.container?.destroy();
    this.container = null;
    this.onComplete?.();
  }

  // Get/set story variables
  getVariable(name: string): any {
    return this.story?.variablesState[name];
  }

  setVariable(name: string, value: any): void {
    if (this.story) {
      this.story.variablesState[name] = value;
    }
  }

  isActive(): boolean {
    return this.container !== null;
  }
}
