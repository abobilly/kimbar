import { Scene } from 'phaser';
import { setRegistry } from '@content/registry';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load registry for dynamic asset discovery
        // Use timestamp to avoid stale cached registry
        const cacheBust = `?t=${Date.now()}`;
        this.load.json('registry', `/generated/registry/content.json${cacheBust}`);
    }

    create() {
        const registry = this.cache.json.get('registry');
        if (registry) {
            setRegistry(registry);
        }
        this.scene.start('Preloader', { registry });
    }
}
