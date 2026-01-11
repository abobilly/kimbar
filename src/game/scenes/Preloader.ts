import { Scene } from 'phaser';
import type { Registry } from '../../content/registry';

// ULPC animation layout: 13 columns, rows defined in custom-animations.js
// walk-n (up): row 7, walk-w (left): row 8, walk-s (down): row 9, walk-e (right): row 10
// Each walk has 9 frames (0-8), with frame 0 being the idle/standing frame
const ULPC_COLS = 13;
const ULPC_ANIMS = {
    walk_up:    { row: 7, frames: 9, frameRate: 10, repeat: -1 },
    walk_left:  { row: 8, frames: 9, frameRate: 10, repeat: -1 },
    walk_down:  { row: 9, frames: 9, frameRate: 10, repeat: -1 },
    walk_right: { row: 10, frames: 9, frameRate: 10, repeat: -1 },
    idle_up:    { row: 7, frames: 1, frameRate: 1, repeat: 0 },
    idle_left:  { row: 8, frames: 1, frameRate: 1, repeat: 0 },
    idle_down:  { row: 9, frames: 1, frameRate: 1, repeat: 0 },
    idle_right: { row: 10, frames: 1, frameRate: 1, repeat: 0 },
};

export class Preloader extends Scene
{
    private registryData: Registry | null = null;

    constructor ()
    {
        super('Preloader');
    }

    init (data: { registry?: Registry })
    {
        this.registryData = data.registry || null;
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
        // Registry-driven asset loading
        if (this.registryData?.sprites) {
            for (const [id, sprite] of Object.entries(this.registryData.sprites)) {
                const url = sprite.url || `/generated/sprites/${id}.png`;
                const frameWidth = sprite.frameWidth ?? 64;
                const frameHeight = sprite.frameHeight ?? 64;
                
                // Load spritesheet
                this.load.spritesheet(id, url, { frameWidth, frameHeight });
                
                // Load portrait if available
                if (sprite.portraitUrl) {
                    this.load.image(`portrait.${id}`, sprite.portraitUrl);
                }
            }
        } else {
            // Fallback: hardcoded assets if registry not available
            console.warn('Registry not available, using fallback asset loading');
            this.load.spritesheet('char.kim', '/generated/sprites/char.kim.png', {
                frameWidth: 64,
                frameHeight: 64
            });
            
            this.load.spritesheet('npc.clerk_01', '/generated/sprites/npc.clerk_01.png', {
                frameWidth: 64,
                frameHeight: 64
            });
            
            this.load.image('portrait.char.kim', '/generated/portraits/char.kim.png');
            this.load.image('portrait.npc.clerk_01', '/generated/portraits/npc.clerk_01.png');
        }
    }

    create ()
    {
        // Create animations for all loaded spritesheets using ULPC layout
        const spriteKeys = this.registryData?.sprites 
            ? Object.keys(this.registryData.sprites)
            : ['char.kim', 'npc.clerk_01'];
        
        for (const spriteKey of spriteKeys) {
            this.createCharacterAnims(spriteKey);
        }
        
        // Brief delay before starting main menu
        this.time.delayedCall(500, () => {
            this.scene.start('MainMenu');
        });
    }
    
    private createCharacterAnims(spriteKey: string): void
    {
        for (const [animName, config] of Object.entries(ULPC_ANIMS)) {
            const startFrame = config.row * ULPC_COLS;
            const frames = config.frames === 1 
                ? [startFrame]  // Idle: just first frame
                : Array.from({ length: config.frames }, (_, i) => startFrame + i);
            
            this.anims.create({
                key: `${spriteKey}.${animName}`,
                frames: this.anims.generateFrameNumbers(spriteKey, { frames }),
                frameRate: config.frameRate,
                repeat: config.repeat
            });
        }
    }
}
