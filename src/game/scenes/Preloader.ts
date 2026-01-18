import { Scene } from 'phaser';
import type { Registry } from '../../content/registry';
import { queueRegistryTilesetLoads } from '@game/services/asset-loader';
import { ensureCharacterAnims } from '@game/utils/characterAnims';

// Debug flag: log asset loading info to console
const DEBUG_ASSETS = false;

export class Preloader extends Scene {
    private registryData: Registry | null = null;
    private preloadedSpriteKeys: string[] = [];

    constructor() {
        super('Preloader');
    }

    init(data: { registry?: Registry }) {
        this.registryData = data.registry || null;
    }

    preload() {
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

        if (this.registryData?.tilesets) {
            const tilesetIds = [
                'tileset.scotus_tiles',
                'tileset.lpc_floors',
                'tileset.lpc_windows_doors'
            ].filter((id) => Boolean(this.registryData?.tilesets?.[id]));

            queueRegistryTilesetLoads(this, tilesetIds, this.registryData);

            if (DEBUG_ASSETS) {
                console.log('[Preloader] Tilesets queued:', tilesetIds);
            }
        } else {
            // Fallback: hardcoded tilesets if registry not available
            this.load.image('floor_tiles', 'assets/tilesets/lpc/floors.png');
            this.load.image('scotus_tiles', 'assets/tilesets/scotus_tiles.png');
            this.load.image('lpc_windows_doors', 'assets/tilesets/lpc/windows-doors.png');
        }

        // NOTE: Old UI sprite loading (ui.panel_frame, ui.button_*) removed.
        // DialogueSystem now uses code-first Graphics primitives (no image assets).
        // See src/game/ui/primitives/ for UIPanel, UIButton, UIChoiceList.

        // Registry-driven sprite loading (character sprites, portraits, etc.)
        if (this.registryData?.sprites) {
            // No UI sprites to queue - they are now code-first
            // Future: queue character sprites or other assets as needed
            if (DEBUG_ASSETS) {
                console.log('[Preloader] UI is now code-first, no UI sprites to load');
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

    create() {
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
