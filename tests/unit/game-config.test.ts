import { describe, it, expect, vi } from 'vitest';

let capturedConfig: { scene?: unknown[] } | undefined;

vi.mock('phaser', () => {
  class Scene {}
  class Game {
    constructor(config: { scene?: unknown[] }) {
      capturedConfig = config;
    }
  }

  const PhaserDefault = {
    Events: {
      EventEmitter: class {}
    },
    Math: {
      Vector2: class {
        normalize() { return this; }
        scale() { return this; }
      }
    },
    Input: {
      Keyboard: {
        KeyCodes: {}
      }
    }
  };

  const Dummy = class {};
  const GameObjects = {
    Container: Dummy,
    Graphics: Dummy,
    Text: Dummy,
    Rectangle: Dummy,
    Image: Dummy,
    Sprite: Dummy
  };

  return {
    AUTO: 'AUTO',
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
    Game,
    Scene,
    GameObjects,
    default: PhaserDefault
  };
});

describe('game config', () => {
  it('registers WorldScene for direct launch', async () => {
    if (!globalThis.localStorage) {
      const store = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); }
      } as unknown as Storage;
    }

    const { default: StartGame } = await import('../../src/game/main');

    StartGame('game-container');

    const sceneNames = capturedConfig?.scene?.map((scene) => (scene as { name?: string })?.name);
    expect(sceneNames).toContain('WorldScene');
  });
});
