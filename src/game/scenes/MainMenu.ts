import { Scene, GameObjects } from 'phaser';
import { loadGameState, getAllFlashcardPacks } from '@content/registry';
import { loadFlashcardDeck, isDeckLoaded } from '@content/flashcard-loader';

export class MainMenu extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    async create() {
        const { width, height } = this.scale;

        // Dark gradient background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Decorative courtroom elements
        this.add.text(width / 2, 100, '🏛️ 🏛️ 🏛️', { fontSize: '48px' }).setOrigin(0.5);

        // Title
        this.title = this.add.text(width / 2, 200, '⚖️ KIM BAR ⚖️', {
            fontFamily: 'Georgia, serif',
            fontSize: 64,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 280, 'Kim Goes to the Supreme Court', {
            fontFamily: 'Georgia, serif',
            fontSize: 24,
            color: '#CCCCCC',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Roguelite Mode button (NEW - primary CTA)
        const rogueliteBtn = this.add.text(width / 2, 380, '⚔️ ROGUELITE MODE', {
            fontFamily: 'Arial',
            fontSize: 32,
            color: '#FFFFFF',
            backgroundColor: '#8B4513',
            padding: { x: 40, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        rogueliteBtn.on('pointerover', () => rogueliteBtn.setColor('#FFD700'));
        rogueliteBtn.on('pointerout', () => rogueliteBtn.setColor('#FFFFFF'));
        rogueliteBtn.on('pointerdown', () => {
            this.startRogueliteMode();
        });

        // Classic Mode button (legacy WorldScene)
        const classicBtn = this.add.text(width / 2, 460, '🏛️ CLASSIC MODE', {
            fontFamily: 'Arial',
            fontSize: 28,
            color: '#CCCCCC',
            backgroundColor: '#2a4858',
            padding: { x: 35, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        classicBtn.on('pointerover', () => classicBtn.setColor('#FFD700'));
        classicBtn.on('pointerout', () => classicBtn.setColor('#CCCCCC'));
        classicBtn.on('pointerdown', () => {
            this.scene.start('WorldScene');
        });

        // Continue button (if save exists)
        const continueBtn = this.add.text(width / 2, 530, '📂 CONTINUE', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#666666',
            backgroundColor: '#1a2838',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        continueBtn.on('pointerover', () => continueBtn.setColor('#FFD700'));
        continueBtn.on('pointerout', () => continueBtn.setColor('#666666'));
        continueBtn.on('pointerdown', () => {
            loadGameState();
            this.scene.start('WorldScene');
        });

        // Instructions
        this.add.text(width / 2, height - 100,
            '⚔️ Roguelite: HP + Streaks + Boons | 🏛️ Classic: Explore the courthouse', {
            fontSize: 16,
            color: '#666666'
        }).setOrigin(0.5);

        // Version
        this.add.text(width - 20, height - 20, 'v0.2.0-spark', {
            fontSize: 14,
            color: '#444444'
        }).setOrigin(1, 1);

        // Pre-load flashcard deck in background
        this.preloadFlashcards();
    }

    private async preloadFlashcards(): Promise<void> {
        if (isDeckLoaded()) return;

        // Load from registry flashcard packs
        const packs = getAllFlashcardPacks();
        for (const pack of packs) {
            try {
                await loadFlashcardDeck(pack.url);
                console.log(`Flashcards pre-loaded from ${pack.id}`);
                return; // Loaded successfully, done
            } catch (err) {
                console.warn(`Failed to load pack ${pack.id}:`, err);
            }
        }
        console.warn('Could not pre-load any flashcards');
    }

    private async startRogueliteMode(): Promise<void> {
        // Ensure flashcards are loaded
        if (!isDeckLoaded()) {
            const packs = getAllFlashcardPacks();
            let loaded = false;
            for (const pack of packs) {
                try {
                    await loadFlashcardDeck(pack.url);
                    loaded = true;
                    break;
                } catch (err) {
                    console.warn(`Failed to load pack ${pack.id}:`, err);
                }
            }
            if (!loaded) {
                console.error('Failed to load any flashcards');
                const errorText = this.add.text(this.scale.width / 2, this.scale.height - 150,
                    '❌ Could not load flashcards. Check console.', {
                    fontSize: '16px',
                    color: '#F44336',
                }).setOrigin(0.5);
                this.time.delayedCall(3000, () => errorText.destroy());
                return;
            }
        }

        this.scene.start('SubjectSelectScene');
    }
}
