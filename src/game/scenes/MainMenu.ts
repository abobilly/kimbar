import { Scene, GameObjects } from 'phaser';
import { loadGameState } from '@content/registry';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const { width, height } = this.scale;

        // Dark gradient background
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // Decorative courtroom elements
        const pillars = this.add.text(width / 2, 100, '🏛️ 🏛️ 🏛️', { fontSize: '48px' }).setOrigin(0.5);

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

        // Play button
        const playBtn = this.add.text(width / 2, 400, '▶ NEW GAME', {
            fontFamily: 'Arial',
            fontSize: 32,
            color: '#FFFFFF',
            backgroundColor: '#2a4858',
            padding: { x: 40, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#FFD700'));
        playBtn.on('pointerout', () => playBtn.setColor('#FFFFFF'));
        playBtn.on('pointerdown', () => {
            this.scene.start('WorldScene');
        });

        // Continue button (if save exists)
        const continueBtn = this.add.text(width / 2, 480, '📂 CONTINUE', {
            fontFamily: 'Arial',
            fontSize: 28,
            color: '#888888',
            backgroundColor: '#1a2838',
            padding: { x: 35, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        continueBtn.on('pointerover', () => continueBtn.setColor('#FFD700'));
        continueBtn.on('pointerout', () => continueBtn.setColor('#888888'));
        continueBtn.on('pointerdown', () => {
            loadGameState();
            this.scene.start('WorldScene');
        });

        // Instructions
        this.add.text(width / 2, height - 100, 
            '📱 Tap to move • Talk to NPCs • Battle with flashcards!', {
            fontSize: 18,
            color: '#666666'
        }).setOrigin(0.5);

        // Version
        this.add.text(width - 20, height - 20, 'v0.1.0', {
            fontSize: 14,
            color: '#444444'
        }).setOrigin(1, 1);
    }
}
