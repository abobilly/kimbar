import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        const { width, height } = this.scale;

        // Dark background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Loading title
        this.add.text(width / 2, height / 2 - 60, '⚖️ KIM BAR ⚖️', {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#FFD700'
        }).setOrigin(0.5);

        // Progress bar outline
        this.add.rectangle(width / 2, height / 2 + 20, 468, 32).setStrokeStyle(2, 0x4a90a4);

        // Progress bar fill
        const bar = this.add.rectangle(width / 2 - 230, height / 2 + 20, 4, 28, 0xFFD700);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 + 70, 'Loading...', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
            loadingText.setText(`Loading... ${Math.floor(progress * 100)}%`);
        });
    }

    preload ()
    {
        this.load.setPath('assets');

        // Load any sprite sheets or images here when we have them
        // For now, we're using procedural graphics
        
        // Simulate a brief loading time for polish
        for (let i = 0; i < 10; i++) {
            this.load.image(`placeholder_${i}`, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
    }

    create ()
    {
        // Brief delay before starting main menu
        this.time.delayedCall(500, () => {
            this.scene.start('MainMenu');
        });
    }
}
