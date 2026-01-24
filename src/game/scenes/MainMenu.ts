import { Scene, GameObjects } from 'phaser';
import { getAllFlashcardPacks } from '@content/registry';
import { loadFlashcardDeck, isDeckLoaded } from '@content/flashcard-loader';

export class MainMenu extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    private loadingText: GameObjects.Text | null = null;

    constructor() {
        super('MainMenu');
    }

    async create() {
        const { width, height } = this.scale;

        // Dark gradient background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Decorative courtroom elements
        this.add.text(width / 2, 80, '🏛️ ⚖️ 🏛️', { fontSize: '48px' }).setOrigin(0.5);

        // Title
        this.title = this.add.text(width / 2, 180, 'KIM BAR', {
            fontFamily: 'Georgia, serif',
            fontSize: 72,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 260, 'Master the Bar. Conquer the Court.', {
            fontFamily: 'Georgia, serif',
            fontSize: 20,
            color: '#AAAAAA',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Loading indicator
        this.loadingText = this.add.text(width / 2, 380, '⏳ Loading flashcards...', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#888888',
        }).setOrigin(0.5);

        // Load flashcards then show play button
        await this.loadFlashcardsAndShowMenu();
    }

    private async loadFlashcardsAndShowMenu(): Promise<void> {
        const { width, height } = this.scale;

        // Load flashcards
        if (!isDeckLoaded()) {
            const packs = getAllFlashcardPacks();
            let loaded = false;
            for (const pack of packs) {
                try {
                    await loadFlashcardDeck(pack.url);
                    console.log(`✅ Loaded ${pack.id} flashcards`);
                    loaded = true;
                    break;
                } catch (err) {
                    console.warn(`Failed to load pack ${pack.id}:`, err);
                }
            }
            if (!loaded) {
                if (this.loadingText) {
                    this.loadingText.setText('❌ No flashcards found. Add packs to registry.');
                    this.loadingText.setColor('#F44336');
                }
                return;
            }
        }

        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }

        // NEW GAME button - THE main action
        const playBtn = this.add.text(width / 2, 380, '▶  NEW RUN', {
            fontFamily: 'Arial',
            fontSize: 36,
            color: '#FFFFFF',
            backgroundColor: '#2E7D32',
            padding: { x: 50, y: 18 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => {
            playBtn.setColor('#FFD700');
            playBtn.setScale(1.05);
        });
        playBtn.on('pointerout', () => {
            playBtn.setColor('#FFFFFF');
            playBtn.setScale(1);
        });
        playBtn.on('pointerdown', () => {
            this.scene.start('SubjectSelectScene');
        });

        // Quick instructions
        this.add.text(width / 2, 480,
            '🎯 Answer flashcards • 💪 Build streaks • 🏆 Clear all subjects', {
            fontSize: 16,
            color: '#666666'
        }).setOrigin(0.5);

        // Stats preview (if mastery data exists)
        const masteryKey = localStorage.getItem('kimbar_mastery');
        if (masteryKey) {
            try {
                const mastery = JSON.parse(masteryKey);
                const cardsSeen = Object.keys(mastery).length;
                if (cardsSeen > 0) {
                    this.add.text(width / 2, 540,
                        `📊 ${cardsSeen} cards studied`, {
                        fontSize: 14,
                        color: '#555555'
                    }).setOrigin(0.5);
                }
            } catch { /* ignore */ }
        }

        // Version
        this.add.text(width - 20, height - 20, 'v1.0.0', {
            fontSize: 14,
            color: '#444444'
        }).setOrigin(1, 1);
    }
}
