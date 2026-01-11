import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { WorldScene } from './scenes/WorldScene';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

// Physics debug mode - enable via .env.local with VITE_PHYS_DEBUG=1
const PHYS_DEBUG = import.meta.env.DEV && import.meta.env.VITE_PHYS_DEBUG === "1";

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            debug: PHYS_DEBUG
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        WorldScene,  // Main gameplay scene
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
