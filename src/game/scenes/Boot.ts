import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  Boot Scene - minimal loading for preloader assets
        //  No external images needed for Kim Bar - using procedural graphics
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
