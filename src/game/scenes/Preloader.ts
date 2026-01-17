import { Scene } from 'phaser';
import type { Registry } from '../../content/registry';
import { queueRegistrySpriteLoads } from '@game/services/asset-loader';
import { ensureCharacterAnims } from '@game/utils/characterAnims';

// Debug flag: log asset loading info to console
const DEBUG_ASSETS = false;

export class Preloader extends Scene
{
    private registryData: Registry | null = null;
    private preloadedSpriteKeys: string[] = [];

    constructor ()
    {
        super('Preloader');
    }

    init (data: { registry?: Registry })
    {
        this.registryData = data.registry || null;
    }

    preload ()
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

        // Load floor tileset for level rendering
        this.load.image('floor_tiles', '/assets/tilesets/lpc/floors.png');
        
        // Load SCOTUS-themed tileset (procedurally generated)
        this.load.image('scotus_tiles', '/generated/tilesets/scotus_tiles.png');

        // Registry-driven asset loading (minimal UI + essentials only)
        if (this.registryData?.sprites) {
            const uiSpriteIds = [
                'ui.panel_frame',
                'ui.button_normal',
                'ui.button_hover',
                'ui.button_pressed'
            ].filter((id) => Boolean(this.registryData?.sprites?.[id]));

            const queued = queueRegistrySpriteLoads(this, uiSpriteIds, this.registryData);
            this.preloadedSpriteKeys = queued.anims;

            if (DEBUG_ASSETS) {
                console.log('[Preloader] UI sprites queued:', uiSpriteIds);
            }
        } else {
            // Fallback: hardcoded assets if registry not available
            console.warn('[Preloader] Registry not available, using fallback asset loading');
            this.load.spritesheet('char.kim', '/generated/sprites/char.kim.png', {
                frameWidth: 64,
                frameHeight: 64
            });
            this.preloadedSpriteKeys.push('char.kim');
        }
    }

    create ()
    {
        // Create animations for all loaded spritesheets using ULPC layout
        if (DEBUG_ASSETS) {
            console.log('[Preloader] Preloaded spritesheets:', this.preloadedSpriteKeys);
        }

        for (const spriteKey of this.preloadedSpriteKeys) {
            ensureCharacterAnims(this, spriteKey);
        }
        
        // Brief delay before starting main menu
        this.time.delayedCall(500, () => {
            this.scene.start('MainMenu');
        });
    }
    
    // Anim creation handled by ensureCharacterAnims utility.
}
