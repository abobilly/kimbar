import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        // Load registry for dynamic asset discovery
        // Use timestamp to avoid stale cached registry
        const cacheBust = `?t=${Date.now()}`;
        this.load.json('registry', `/generated/registry.json${cacheBust}`);
    }

    create ()
    {
        const registry = this.cache.json.get('registry');
        this.scene.start('Preloader', { registry });
    }
}
