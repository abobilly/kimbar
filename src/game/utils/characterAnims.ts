import { Scene } from 'phaser';

// ULPC animation layout: 13 columns × 21 rows (832×1344)
const ULPC_COLS = 13;
const ULPC_ANIMS = {
  walk_up: { row: 8, frames: 9, frameRate: 10, repeat: -1 },
  walk_left: { row: 9, frames: 9, frameRate: 10, repeat: -1 },
  walk_down: { row: 10, frames: 9, frameRate: 10, repeat: -1 },
  walk_right: { row: 11, frames: 9, frameRate: 10, repeat: -1 },
  idle_up: { row: 8, frames: 1, frameRate: 1, repeat: 0 },
  idle_left: { row: 9, frames: 1, frameRate: 1, repeat: 0 },
  idle_down: { row: 10, frames: 1, frameRate: 1, repeat: 0 },
  idle_right: { row: 11, frames: 1, frameRate: 1, repeat: 0 }
};

export function ensureCharacterAnims(scene: Scene, spriteKey: string): void {
  if (!scene.textures.exists(spriteKey)) return;
  if (scene.anims.exists(`${spriteKey}.idle_down`)) return;

  for (const [animName, config] of Object.entries(ULPC_ANIMS)) {
    const startFrame = config.row * ULPC_COLS;
    const frames = config.frames === 1
      ? [startFrame]
      : Array.from({ length: config.frames }, (_, i) => startFrame + i);

    scene.anims.create({
      key: `${spriteKey}.${animName}`,
      frames: scene.anims.generateFrameNumbers(spriteKey, { frames }),
      frameRate: config.frameRate,
      repeat: config.repeat
    });
  }
}
