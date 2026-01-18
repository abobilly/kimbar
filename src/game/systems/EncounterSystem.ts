// Encounter System - Flashcard Combat
import { Scene } from 'phaser';
import { Flashcard, EncounterConfig } from '@content/types';
import { getRandomCards, getGameState, updateGameState, getRegistry } from '@content/registry';
import { openModal, closeModal } from '@game/ui/modal';
import { registerExit, unregisterExit } from '@game/ui/exitManager';
import { layoutEncounter } from '@game/ui/layout';
import { DEPTH_MODAL } from '@game/constants/depth';
import { FONT_LG, FONT_TITLE } from '@game/constants';
import { UIPanel } from '@game/ui/primitives/UIPanel';
import { UIButton } from '@game/ui/primitives/UIButton';
import { uiTheme } from '@game/ui/uiTheme';

export interface EncounterResult {
  won: boolean;
  correctCount: number;
  totalCount: number;
  reward?: string;
  aborted?: boolean;  // True if user cancelled via ESC/X
}

export class EncounterSystem {
  private scene: Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private currentCards: Flashcard[] = [];
  private currentIndex: number = 0;
  private correctCount: number = 0;
  private config: EncounterConfig | null = null;
  private onComplete: ((result: EncounterResult) => void) | null = null;
  private isEvaluating: boolean = false;  // True while showing feedback, blocks cancel

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
    // Register as modal to block world input
    openModal('encounter');
    
    const { width, height } = this.scene.scale;
    const layout = layoutEncounter(width, height);
    
    // Create overlay container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(DEPTH_MODAL);
    
    // Add container to UI layer if available (camera isolation from world zoom)
    const worldScene = this.scene as unknown as { getUILayer?: () => Phaser.GameObjects.Layer };
    if (worldScene.getUILayer) {
      worldScene.getUILayer().add(this.container);
    }

    // Dark overlay - make interactive to block clicks to world
    const overlay = this.scene.add.rectangle(layout.centerX, height / 2, width, height, 0x000000, 0.85);
    overlay.setInteractive();  // Swallows pointer events
    overlay.setName('overlay');
    this.container.add(overlay);

    // Title
    const title = this.scene.add.text(layout.centerX, layout.titleY, '⚖️ LEGAL ENCOUNTER ⚖️', {
      fontSize: `${FONT_TITLE}px`,
      color: '#FFD700',
      fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);
    title.setName('title');
    this.container.add(title);

    // Cancel button (X) in top-right corner
    const cancelBtn = this.scene.add.text(layout.cancelX, layout.cancelY, '✕', {
      fontSize: '28px',
      color: '#888888'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.setName('cancel_btn');
    cancelBtn.on('pointerover', () => cancelBtn.setColor('#FFFFFF'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#888888'));
    cancelBtn.on('pointerdown', () => this.cancelEncounter());
    this.container.add(cancelBtn);

    // Register ESC to cancel via exitManager
    registerExit('encounter', () => this.cancelEncounter());

    // Progress
    const progress = this.scene.add.text(layout.centerX, layout.progressY, '', {
      fontSize: `${FONT_LG}px`,
      color: '#FFFFFF'
    }).setOrigin(0.5);
    progress.setName('progress');
    this.container.add(progress);
    
    // Store layout for later use
    this.container.setData('layout', layout);
    
    // Subscribe to resize events
    this.scene.scale.on('resize', this.onResize, this);
  }

  private showQuestion(): void {
    if (!this.container || !this.config) return;

    const { width, height } = this.scene.scale;
    const layout = layoutEncounter(width, height);
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

    // Use cloze format: show text with blanks
    const { questionText: displayText, answers } = this.parseCloze(card);

    // Question text - use layout for positioning and width
    const questionText = this.scene.add.text(layout.centerX, layout.questionY, displayText, {
      fontSize: '20px',
      color: '#FFFFFF',
      wordWrap: { width: layout.questionWrapWidth },
      align: 'center',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0);
    questionText.setName('q_text');
    this.container.add(questionText);

    // Generate answer choices from cloze deletions
    const choices = this.generateChoicesFromCloze(card, answers);
    const questionHeight = questionText.height;
    const buttonStartY = layout.questionY + questionHeight + 30;

    choices.forEach((choice, index) => {
      const button = this.createAnswerButton(
        layout.centerX,
        buttonStartY + index * layout.buttonSpacing,
        choice.text,
        choice.correct,
        card,
        layout
      );
      button.setName('q_button_' + index);
      this.container!.add(button);
    });

    // Hint button (if player has hints)
    const state = getGameState();
    const registry = getRegistry();
    const outfit = registry.outfits[state.equippedOutfit];
    if (outfit?.buffs?.hints && outfit.buffs.hints > 0 && card.mnemonic) {
      const hintBtn = this.createHintButton(layout.hintX, layout.hintY, card.mnemonic);
      hintBtn.setName('q_hint');
      this.container.add(hintBtn);
    }
  }

  /**
   * Parse cloze deletions from card.
   * Returns question text with blanks and array of correct answers.
   */
  private parseCloze(card: Flashcard): { questionText: string; answers: string[] } {
    // Use clozeLite first (simpler), fallback to cloze
    const clozeText = card.clozeLite || card.cloze;
    if (!clozeText) {
      // Fallback to frontPrompt if no cloze
      return { questionText: card.frontPrompt || 'No question text', answers: ['Answer'] };
    }

    const answers: string[] = [];
    // Replace {{c1::text}} or {{text}} with _____ and extract answers
    const questionText = clozeText.replace(/\{\{(?:c\d+::)?(.+?)\}\}/g, (match, answer) => {
      answers.push(answer.trim());
      return '_____';
    });

    return { questionText, answers };
  }

  /**
   * Generate multiple choice options from cloze answers.
   * Uses first cloze deletion as the correct answer.
   */
  private generateChoicesFromCloze(card: Flashcard, answers: string[]): { text: string; correct: boolean }[] {
    const correctAnswer = answers[0] || 'Answer';

    // Generate wrong answers from other cloze deletions or confusables
    const wrongAnswers: string[] = [];
    
    // Use other cloze answers as distractors
    if (answers.length > 1) {
      wrongAnswers.push(...answers.slice(1, 4));
    }
    
    // Use confusable cards if available
    if (wrongAnswers.length < 3 && card.confusableWith && card.confusableWith.length > 0) {
      wrongAnswers.push(...card.confusableWith.slice(0, 3 - wrongAnswers.length));
    }
    
    // Pad with generic wrong answers if needed
    const genericWrong = [
      'None of the above',
      'All of the above', 
      'It depends on the jurisdiction',
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
    card: Flashcard,
    layout: ReturnType<typeof layoutEncounter>
  ): UIButton {
    // Create UIButton with code-first Graphics (no image assets)
    const button = new UIButton(this.scene, {
      x,
      y,
      width: layout.buttonWidth,
      height: layout.buttonHeight,
      text,
      fontSize: 'md',
      onClick: () => {
        // Disable all buttons and mark as evaluating (blocks cancel)
        this.isEvaluating = true;
        this.container?.each((child: Phaser.GameObjects.GameObject) => {
          if (child.name?.startsWith('q_button_')) {
            const btn = child as UIButton;
            if (btn.setDisabled) {
              btn.setDisabled(true);
            } else {
              (child as Phaser.GameObjects.Container).disableInteractive();
            }
          }
        });

        if (correct) {
          // Visual feedback for correct answer
          button.setTintFill(0x4CAF50);
          this.correctCount++;
          this.showFeedback(card, true);
        } else {
          // Visual feedback for incorrect answer
          button.setTintFill(0xF44336);
          // Update sanction meter
          const state = getGameState();
          updateGameState({ sanctionMeter: state.sanctionMeter + 10 });
          this.showFeedback(card, false);
        }
      }
    });

    // UIButton handles hover/pressed states automatically via code-first Graphics
    return button;
  }

  private createHintButton(x: number, y: number, hint: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    const bg = this.scene.add.circle(0, 0, 25, 0xFFD700);
    const label = this.scene.add.text(0, 0, '💡', { fontSize: '24px' }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(50, 50);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      // Show hint popup - use stored layout
      const layout = this.container?.getData('layout') as ReturnType<typeof layoutEncounter>;
      if (!layout) return;
      
      const hintPopup = this.scene.add.container(layout.centerX, this.scene.scale.height / 2);
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

    // Use stored layout from container
    const layout = this.container.getData('layout') as ReturnType<typeof layoutEncounter>;
    if (!layout) return;
    
    const explanation = card.easyContent || card.mediumContent || 'No explanation available.';
    
    // Use UIPanel primitive (code-first, no image assets)
    const feedbackPanel = new UIPanel(this.scene, {
      x: layout.centerX,
      y: layout.feedbackY,
      width: layout.feedbackWidth,
      height: layout.feedbackHeight,
      fillColor: uiTheme.colors.panelBg,
      fillAlpha: 0.95,
      strokeColor: correct ? 0x4CAF50 : 0xF44336,
      strokeWidth: 2,
    });
    feedbackPanel.setName('q_feedback_bg');
    
    const feedbackTitle = this.scene.add.text(layout.centerX, layout.feedbackY - 30, 
      correct ? '✅ CORRECT!' : '❌ INCORRECT', {
      fontSize: '18px',
      color: correct ? '#4CAF50' : '#F44336',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    feedbackTitle.setName('q_feedback_title');

    const feedbackText = this.scene.add.text(layout.centerX, layout.feedbackY + 5, explanation, {
      fontSize: '12px',
      color: '#CCCCCC',
      wordWrap: { width: layout.feedbackWidth - 40 },
      align: 'center'
    }).setOrigin(0.5, 0);
    feedbackText.setName('q_feedback_text');

    this.container.add([
      feedbackPanel,
      feedbackTitle,
      feedbackText
    ]);

    // Continue button - always visible at bottom
    const continueBtn = this.scene.add.text(layout.centerX, layout.continueY, 'TAP TO CONTINUE', {
      fontSize: '16px',
      color: '#FFD700',
      backgroundColor: '#2a4858',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    continueBtn.setName('q_continue');
    this.container.add(continueBtn);

    continueBtn.on('pointerdown', () => {
      this.isEvaluating = false;  // Allow cancel again
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
    const layout = layoutEncounter(width, height);
    const centerY = height / 2;

    // Clear question elements
    this.container.each((child: Phaser.GameObjects.GameObject) => {
      if (child.name?.startsWith('q_')) {
        child.destroy();
      }
    });

    // Result display
    const resultTitle = this.scene.add.text(layout.centerX, centerY - 100,
      result.won ? '🎉 OBJECTION SUSTAINED! 🎉' : '⚠️ MOTION DENIED ⚠️', {
      fontSize: '36px',
      color: result.won ? '#4CAF50' : '#F44336',
      fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    const scoreText = this.scene.add.text(layout.centerX, centerY,
      `Score: ${result.correctCount} / ${result.totalCount}`, {
      fontSize: '28px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    const elements = [resultTitle, scoreText];

    if (result.reward) {
      const registry = getRegistry();
      const outfit = registry.outfits[result.reward];
      const rewardText = this.scene.add.text(layout.centerX, centerY + 60,
        `🎁 Unlocked: ${outfit?.name || result.reward}!`, {
        fontSize: '24px',
        color: '#FFD700'
      }).setOrigin(0.5);
      elements.push(rewardText);
    }

    const continueBtn = this.scene.add.text(layout.centerX, centerY + 140,
      'RETURN TO COURT', {
      fontSize: '22px',
      color: '#FFFFFF',
      backgroundColor: '#2a4858',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    elements.push(continueBtn);
    this.container.add(elements);

    continueBtn.on('pointerdown', () => {
      this.cleanup();
      this.onComplete?.(result);
    });
  }

  /**
   * Handle viewport resize - reflow overlay and key UI elements.
   */
  private onResize(): void {
    if (!this.container) return;
    
    const { width, height } = this.scene.scale;
    const layout = layoutEncounter(width, height);
    
    // Update stored layout for other methods
    this.container.setData('layout', layout);
    
    // Reposition overlay to cover full viewport
    const overlay = this.container.getByName('overlay') as Phaser.GameObjects.Rectangle;
    if (overlay) {
      overlay.setPosition(layout.centerX, height / 2);
      overlay.setSize(width, height);
    }
    
    // Reposition title
    const title = this.container.getByName('title') as Phaser.GameObjects.Text;
    if (title) {
      title.setPosition(layout.centerX, layout.titleY);
    }
    
    // Reposition cancel button
    const cancelBtn = this.container.getByName('cancel_btn') as Phaser.GameObjects.Text;
    if (cancelBtn) {
      cancelBtn.setPosition(layout.cancelX, layout.cancelY);
    }
    
    // Reposition progress
    const progress = this.container.getByName('progress') as Phaser.GameObjects.Text;
    if (progress) {
      progress.setPosition(layout.centerX, layout.progressY);
    }
  }

  /**
   * Cancel the encounter (ESC or X button).
   * Returns to world with no reward, no penalty.
   * Blocked during answer evaluation.
   */
  private cancelEncounter(): void {
    // Don't allow cancel while evaluating an answer
    if (this.isEvaluating) return;
    if (!this.container || !this.onComplete) return;

    const result: EncounterResult = {
      won: false,
      correctCount: this.correctCount,
      totalCount: this.currentCards.length,
      aborted: true
    };

    this.cleanup();
    this.onComplete(result);
  }

  /**
   * Clean up encounter UI and keyboard listeners.
   */
  private cleanup(): void {
    // Unregister modal and exit handler, remove resize listener
    unregisterExit('encounter');
    closeModal('encounter');
    this.scene.scale.off('resize', this.onResize, this);
    
    // Destroy UI container
    this.container?.destroy();
    this.container = null;
    this.isEvaluating = false;
  }
}
