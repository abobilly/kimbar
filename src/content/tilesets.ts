import { getRegistry } from './registry';
import type { TilesetEntry } from './registry';

export interface TilesetPart {
  dx: number;
  dy: number;
  tileX: number;
  tileY: number;
  tileIndex: number;
}

export interface TilesetObjectParts {
  tileX: number;
  tileY: number;
  tilesWide: number;
  tilesHigh: number;
  pixelWidth: number;
  pixelHeight: number;
  parts: TilesetPart[];
  propId?: string;
  notes?: string | null;
}

export interface TilesetPartsMap {
  schema: string;
  image: string;
  tilesetPath: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  objects: Record<string, TilesetObjectParts>;
  skipped: Array<{ id: string; reason: string }>;
}

const tilesetPartsCache: Map<string, TilesetPartsMap> = new Map();

export function getTileset(id: string): TilesetEntry | undefined {
  const registry = getRegistry();
  return registry.tilesets?.[id];
}

export function getTilesetKey(id: string): string | undefined {
  const entry = getTileset(id);
  if (!entry) return undefined;
  return entry.key ?? entry.id ?? id;
}

export async function loadTilesetParts(id: string): Promise<TilesetPartsMap> {
  if (tilesetPartsCache.has(id)) {
    return tilesetPartsCache.get(id)!;
  }

  const tileset = getTileset(id);
  if (!tileset?.partsUrl) {
    throw new Error(`Tileset parts map missing for ${id}`);
  }

  const response = await fetch(tileset.partsUrl);
  if (!response.ok) {
    throw new Error(`Failed to load tileset parts from ${tileset.partsUrl}: ${response.status}`);
  }

  const data = await response.json() as TilesetPartsMap;
  tilesetPartsCache.set(id, data);
  return data;
}
