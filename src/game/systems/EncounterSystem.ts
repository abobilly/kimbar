// Encounter System - Flashcard Combat
import { Scene } from 'phaser';
import { Flashcard, EncounterConfig } from '@content/types';
import { getRandomCards, getGameState, updateGameState, getRegistry } from '@content/registry';

export interface EncounterResult {
  won: boolean;
  correctCount: number;
  totalCount: number;
  reward?: string;
}

export class EncounterSystem {
  private scene: Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private currentCards: Flashcard[] = [];
  private currentIndex: number = 0;
  private correctCount: number = 0;
  private config: EncounterConfig | null = null;
  private onComplete: ((result: EncounterResult) => void) | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  start(config: EncounterConfig, onComplete: (result: EncounterResult) => void): void {
    this.config = config;
    this.onComplete = onComplete;
    this.currentCards = getRandomCards(config.deckTag, config.count);
    this.currentIndex = 0;
    this.correctCount = 0;
    
    if (this.currentCards.length === 0) {
      console.warn('No cards found for tag:', config.deckTag);
      onComplete({ won: true, correctCount: 0, totalCount: 0 });
      return;
    }

    this.showEncounterUI();
    this.showQuestion();
  }

  private showEncounterUI(): void {
    const { width, height } = this.scene.scale;
    
    // Create overlay container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);

    // Dark overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    this.container.add(overlay);

    // Title
    const title = this.scene.add.text(width / 2, 60, '⚖️ LEGAL ENCOUNTER ⚖️', {
      fontSize: '32px',
      color: '#FFD700',
      fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);
    this.container.add(title);

    // Progress
    const progress = this.scene.add.text(width / 2, 100, '', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    progress.setName('progress');
    this.container.add(progress);
  }

  private showQuestion(): void {
    if (!this.container || !this.config) return;

    const { width, height } = this.scene.scale;
    const card = this.currentCards[this.currentIndex];

    // Update progress
    const progress = this.container.getByName('progress') as Phaser.GameObjects.Text;
    if (progress) {
      progress.setText(`Question ${this.currentIndex + 1} of ${this.currentCards.length}`);
    }

    // Clear previous question elements
    this.container.each((child: Phaser.GameObjects.GameObject) => {
      if (child.name?.startsWith('q_')) {
        child.destroy();
      }
    });

    // Question text
    const questionText = this.scene.add.text(width / 2, 180, card.frontPrompt, {
      fontSize: '24px',
      color: '#FFFFFF',
      wordWrap: { width: width - 100 },
      align: 'center',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0);
    questionText.setName('q_text');
    this.container.add(questionText);

    // Generate answer choices
    const choices = this.generateChoices(card);
    const buttonY = 380;
    const buttonSpacing = 70;

    choices.forEach((choice, index) => {
      const button = this.createAnswerButton(
        width / 2,
        buttonY + index * buttonSpacing,
        choice.text,
        choice.correct,
        card
      );
      button.setName('q_button_' + index);
      this.container!.add(button);
    });

    // Hint button (if player has hints)
    const state = getGameState();
    const registry = getRegistry();
    const outfit = registry.outfits[state.equippedOutfit];
    if (outfit?.buffs?.hints && outfit.buffs.hints > 0 && card.mnemonic) {
      const hintBtn = this.createHintButton(width - 80, 60, card.mnemonic);
      hintBtn.setName('q_hint');
      this.container.add(hintBtn);
    }
  }

  private generateChoices(card: Flashcard): { text: string; correct: boolean }[] {
    // Extract the correct answer from cloze
    let correctAnswer = '';
    if (card.cloze) {
      const match = card.cloze.match(/\{\{(.+?)\}\}/);
      if (match) correctAnswer = match[1];
    }
    if (!correctAnswer && card.clozeLite) {
      const match = card.clozeLite.match(/\{\{(.+?)\}\}/);
      if (match) correctAnswer = match[1];
    }
    if (!correctAnswer) {
      correctAnswer = 'Correct Answer';
    }

    // Generate wrong answers from confusables or generic
    const wrongAnswers: string[] = [];
    if (card.confusableWith && card.confusableWith.length > 0) {
      wrongAnswers.push(...card.confusableWith.slice(0, 3));
    }
    
    // Pad with generic wrong answers if needed
    const genericWrong = [
      'None of the above',
      'All of the above', 
      'It depends on jurisdiction',
      'Only in federal court'
    ];
    while (wrongAnswers.length < 3) {
      const generic = genericWrong[wrongAnswers.length];
      if (generic && !wrongAnswers.includes(generic)) {
        wrongAnswers.push(generic);
      }
    }

    // Build choices array and shuffle
    const choices = [
      { text: correctAnswer, correct: true },
      ...wrongAnswers.slice(0, 3).map(text => ({ text, correct: false }))
    ];

    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return choices;
  }

  private createAnswerButton(
    x: number, 
    y: number, 
    text: string, 
    correct: boolean,
    card: Flashcard
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const { width } = this.scene.scale;

    const bg = this.scene.add.rectangle(0, 0, width - 80, 55, 0x2a4858, 1)
      .setStrokeStyle(2, 0x4a90a4);
    
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#FFFFFF',
      wordWrap: { width: width - 120 },
      align: 'center'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width - 80, 55);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => bg.setFillStyle(0x3a5868));
    container.on('pointerout', () => bg.setFillStyle(0x2a4858));
    
    container.on('pointerdown', () => {
      // Disable all buttons
      this.container?.each((child: Phaser.GameObjects.GameObject) => {
        if (child.name?.startsWith('q_button_')) {
          (child as Phaser.GameObjects.Container).disableInteractive();
        }
      });

      if (correct) {
        bg.setFillStyle(0x2d5a3d);
        bg.setStrokeStyle(2, 0x4CAF50);
        this.correctCount++;
        this.showFeedback(card, true);
      } else {
        bg.setFillStyle(0x5a2d2d);
        bg.setStrokeStyle(2, 0xF44336);
        // Update sanction meter
        const state = getGameState();
        updateGameState({ sanctionMeter: state.sanctionMeter + 10 });
        this.showFeedback(card, false);
      }
    });

    return container;
  }

  private createHintButton(x: number, y: number, hint: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    const bg = this.scene.add.circle(0, 0, 25, 0xFFD700);
    const label = this.scene.add.text(0, 0, '💡', { fontSize: '24px' }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(50, 50);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      // Show hint popup
      const { width, height } = this.scene.scale;
      const hintPopup = this.scene.add.container(width / 2, height / 2);
      hintPopup.setName('q_hintpopup');
      
      const hintBg = this.scene.add.rectangle(0, 0, 400, 150, 0x1a1a2e, 0.95)
        .setStrokeStyle(2, 0xFFD700);
      const hintText = this.scene.add.text(0, 0, `💡 ${hint}`, {
        fontSize: '18px',
        color: '#FFD700',
        wordWrap: { width: 360 },
        align: 'center'
      }).setOrigin(0.5);
      
      hintPopup.add([hintBg, hintText]);
      hintPopup.setDepth(1001);
      this.container?.add(hintPopup);

      // Auto-dismiss after 3 seconds
      this.scene.time.delayedCall(3000, () => hintPopup.destroy());
      
      // Disable hint button
      container.disableInteractive();
      bg.setFillStyle(0x666666);
    });

    return container;
  }

  private showFeedback(card: Flashcard, correct: boolean): void {
    if (!this.container) return;

    const { width, height } = this.scene.scale;
    
    // Feedback popup
    const feedbackY = height - 180;
    const explanation = card.easyContent || card.mediumContent || 'No explanation available.';
    
    const feedbackBg = this.scene.add.rectangle(width / 2, feedbackY, width - 60, 120, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, correct ? 0x4CAF50 : 0xF44336);
    feedbackBg.setName('q_feedback_bg');
    
    const feedbackTitle = this.scene.add.text(width / 2, feedbackY - 40, 
      correct ? '✅ CORRECT!' : '❌ INCORRECT', {
      fontSize: '20px',
      color: correct ? '#4CAF50' : '#F44336',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    feedbackTitle.setName('q_feedback_title');

    const feedbackText = this.scene.add.text(width / 2, feedbackY + 10, explanation, {
      fontSize: '14px',
      color: '#CCCCCC',
      wordWrap: { width: width - 100 },
      align: 'center'
    }).setOrigin(0.5, 0);
    feedbackText.setName('q_feedback_text');

    this.container.add([feedbackBg, feedbackTitle, feedbackText]);

    // Continue button
    const continueBtn = this.scene.add.text(width / 2, height - 40, 'TAP TO CONTINUE', {
      fontSize: '18px',
      color: '#FFD700',
      backgroundColor: '#2a4858',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    continueBtn.setName('q_continue');
    this.container.add(continueBtn);

    continueBtn.on('pointerdown', () => {
      this.currentIndex++;
      if (this.currentIndex < this.currentCards.length) {
        this.showQuestion();
      } else {
        this.endEncounter();
      }
    });
  }

  private endEncounter(): void {
    if (!this.container || !this.config || !this.onComplete) return;

    const won = this.correctCount >= Math.ceil(this.currentCards.length / 2);
    const result: EncounterResult = {
      won,
      correctCount: this.correctCount,
      totalCount: this.currentCards.length,
      reward: won ? this.config.rewardId : undefined
    };

    // Update game state
    const state = getGameState();
    if (won) {
      updateGameState({
        citations: state.citations + this.correctCount * 10,
        fashionTokens: state.fashionTokens + (this.config.rewardId ? 5 : 2)
      });

      if (this.config.rewardId && !state.unlockedOutfits.includes(this.config.rewardId)) {
        updateGameState({
          unlockedOutfits: [...state.unlockedOutfits, this.config.rewardId]
        });
      }
    }

    // Show result screen
    this.showResultScreen(result);
  }

  private showResultScreen(result: EncounterResult): void {
    if (!this.container) return;

    const { width, height } = this.scene.scale;

    // Clear question elements
    this.container.each((child: Phaser.GameObjects.GameObject) => {
      if (child.name?.startsWith('q_')) {
        child.destroy();
      }
    });

    // Result display
    const resultTitle = this.scene.add.text(width / 2, height / 2 - 100,
      result.won ? '🎉 OBJECTION SUSTAINED! 🎉' : '⚠️ MOTION DENIED ⚠️', {
      fontSize: '36px',
      color: result.won ? '#4CAF50' : '#F44336',
      fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    const scoreText = this.scene.add.text(width / 2, height / 2,
      `Score: ${result.correctCount} / ${result.totalCount}`, {
      fontSize: '28px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    const elements = [resultTitle, scoreText];

    if (result.reward) {
      const registry = getRegistry();
      const outfit = registry.outfits[result.reward];
      const rewardText = this.scene.add.text(width / 2, height / 2 + 60,
        `🎁 Unlocked: ${outfit?.name || result.reward}!`, {
        fontSize: '24px',
        color: '#FFD700'
      }).setOrigin(0.5);
      elements.push(rewardText);
    }

    const continueBtn = this.scene.add.text(width / 2, height / 2 + 140,
      'RETURN TO COURT', {
      fontSize: '22px',
      color: '#FFFFFF',
      backgroundColor: '#2a4858',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    elements.push(continueBtn);
    this.container.add(elements);

    continueBtn.on('pointerdown', () => {
      this.container?.destroy();
      this.container = null;
      this.onComplete?.(result);
    });
  }
}
