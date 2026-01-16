import { Scene } from 'phaser';
import type { Registry, PropEntry, SpriteEntry } from '@content/registry';
import { getRegistry } from '@content/registry';
import { ensureCharacterAnims } from '@game/utils/characterAnims';

type RegistrySource = Pick<Registry, 'sprites' | 'props' | 'buildId'>;

const loaderQueue = new WeakMap<Scene, Promise<void>>();

function getRegistrySource(override?: RegistrySource): RegistrySource {
  return override ?? getRegistry();
}

function withCacheBust(url: string, buildId: string): string {
  if (!buildId) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}v=${encodeURIComponent(buildId)}`;
}

function queueSceneLoad(scene: Scene): Promise<void> {
  const previous = loaderQueue.get(scene) ?? Promise.resolve();
  const next = previous.then(() => new Promise<void>((resolve) => {
    if (scene.load.list.size === 0) {
      resolve();
      return;
    }

    scene.load.once('complete', () => resolve());
    scene.load.start();
  }));

  loaderQueue.set(scene, next);
  return next;
}

function resolveSpriteEntry(registry: RegistrySource, id: string): SpriteEntry | null {
  const entry = registry.sprites?.[id];
  return entry ?? null;
}

function resolvePropEntry(registry: RegistrySource, id: string): PropEntry | null {
  const entry = registry.props?.[id];
  return entry ?? null;
}

export function queueRegistrySpriteLoads(
  scene: Scene,
  ids: Iterable<string>,
  overrideRegistry?: RegistrySource
): { queued: string[]; anims: string[] } {
  const registry = getRegistrySource(overrideRegistry);
  const buildId = registry.buildId ?? 'dev';
  const queued: string[] = [];
  const anims: string[] = [];

  for (const id of ids) {
    if (!id || scene.textures.exists(id)) continue;
    const sprite = resolveSpriteEntry(registry, id);
    if (!sprite) continue;

    const baseUrl = sprite.url || `/generated/sprites/${id}.png`;
    const url = withCacheBust(baseUrl, buildId);
    const kind = sprite.kind ?? 'spritesheet';
    const frameWidth = sprite.frameWidth ?? 64;
    const frameHeight = sprite.frameHeight ?? 64;

    if (kind === 'image') {
      scene.load.image(id, url);
      queued.push(id);
      continue;
    }

    scene.load.spritesheet(id, url, { frameWidth, frameHeight });
    queued.push(id);
    anims.push(id);

    if (sprite.portraitUrl) {
      const portraitKey = `portrait.${id}`;
      if (!scene.textures.exists(portraitKey)) {
        scene.load.image(portraitKey, withCacheBust(sprite.portraitUrl, buildId));
      }
    }
  }

  return { queued, anims };
}

export function queueRegistryPropLoads(
  scene: Scene,
  ids: Iterable<string>,
  overrideRegistry?: RegistrySource
): string[] {
  const registry = getRegistrySource(overrideRegistry);
  const buildId = registry.buildId ?? 'dev';
  const queued: string[] = [];

  for (const id of ids) {
    if (!id || scene.textures.exists(id)) continue;
    const prop = resolvePropEntry(registry, id);
    if (!prop?.path) continue;

    const url = withCacheBust(prop.path, buildId);
    scene.load.image(id, url);
    queued.push(id);
  }

  return queued;
}

export async function loadRegistryAssets(
  scene: Scene,
  assets: { sprites?: Iterable<string>; props?: Iterable<string> },
  overrideRegistry?: RegistrySource
): Promise<void> {
  const spriteIds = assets.sprites ?? [];
  const propIds = assets.props ?? [];

  const spriteQueued = queueRegistrySpriteLoads(scene, spriteIds, overrideRegistry);
  const propQueued = queueRegistryPropLoads(scene, propIds, overrideRegistry);

  if (spriteQueued.queued.length === 0 && propQueued.length === 0) {
    return;
  }

  await queueSceneLoad(scene);

  for (const spriteKey of spriteQueued.anims) {
    ensureCharacterAnims(scene, spriteKey);
  }
}
