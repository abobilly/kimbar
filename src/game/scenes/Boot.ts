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
        this.load.json('registry', '/generated/registry.json');
    }

    create ()
    {
        const registry = this.cache.json.get('registry');
        this.scene.start('Preloader', { registry });
    }
}
