/**
 * Level Loader — Central loader for compiled LevelData
 * 
 * Loads LevelData JSON via the registry/loader pattern.
 * Validates structure and provides typed access.
 * 
 * INVARIANT: All level loading goes through this module.
 * INVARIANT: No hardcoded paths — uses level-registry for path resolution.
 */

import { getLevelPath } from './level-registry';
import type { TiledLevelData, TiledEntityData } from '@/types/level-data';

// ============================================================
// Level Cache
// ============================================================

/** Cache of loaded level data to avoid redundant fetches */
const levelCache: Map<string, TiledLevelData> = new Map();

// ============================================================
// Public API
// ============================================================

/**
 * Load compiled LevelData by ID.
 * 
 * Uses the level registry to resolve the path, then fetches and validates
 * the JSON data. Results are cached for subsequent requests.
 * 
 * @param levelId Level identifier (e.g., "supreme-court/lobby")
 * @returns Promise resolving to validated TiledLevelData
 * @throws Error if level cannot be loaded or is invalid
 * 
 * @example
 * const level = await loadLevelData("supreme-court/lobby");
 * console.log(`Loaded ${level.id}: ${level.width}x${level.height} tiles`);
 */
export async function loadLevelData(levelId: string): Promise<TiledLevelData> {
  console.log(`[LevelLoader] Loading level: ${levelId}`);
  
  // Check cache first
  const cached = levelCache.get(levelId);
  if (cached) {
    console.log(`[LevelLoader] Using cached level: ${levelId}`);
    return cached;
  }
  
  // Resolve path via registry
  const levelPath = getLevelPath(levelId);
  
  // Fetch the level data
  const response = await fetch(levelPath);
  
  if (!response.ok) {
    throw new Error(`[LevelLoader] Failed to load level ${levelId}: ${response.status} ${response.statusText}`);
  }
  
  const rawData = await response.json();
  
  // Validate and normalize the data
  const levelData = validateAndNormalize(rawData, levelId);
  
  // Log instrumentation
  console.log(`[LevelLoader] Level loaded: ${levelData.id} (${levelData.width}x${levelData.height} tiles)`);
  console.log(`[LevelLoader] Tilesets: ${levelData.tilesets.map(t => t.key).join(', ')}`);
  console.log(`[LevelLoader] Entities: ${levelData.entities.length} total`);
  
  // Log entity breakdown
  const entityCounts = countEntitiesByType(levelData.entities);
  for (const [type, count] of Object.entries(entityCounts)) {
    console.log(`[LevelLoader]   - ${type}: ${count}`);
  }
  
  // Cache the result
  levelCache.set(levelId, levelData);
  
  return levelData;
}

/**
 * Check if a level is currently cached.
 * 
 * @param levelId Level identifier
 * @returns True if level is in cache
 */
export function isLevelCached(levelId: string): boolean {
  return levelCache.has(levelId);
}

/**
 * Clear a specific level from cache.
 * 
 * @param levelId Level identifier
 */
export function clearLevelCache(levelId: string): void {
  levelCache.delete(levelId);
  console.log(`[LevelLoader] Cleared cache for: ${levelId}`);
}

/**
 * Clear all cached levels.
 */
export function clearAllLevelCache(): void {
  const count = levelCache.size;
  levelCache.clear();
  console.log(`[LevelLoader] Cleared all cache (${count} levels)`);
}

/**
 * Preload multiple levels into cache.
 * 
 * @param levelIds Array of level identifiers to preload
 * @returns Promise resolving when all levels are loaded
 */
export async function preloadLevels(levelIds: string[]): Promise<void> {
  console.log(`[LevelLoader] Preloading ${levelIds.length} levels...`);
  
  await Promise.all(
    levelIds.map(id => loadLevelData(id).catch(err => {
      console.warn(`[LevelLoader] Failed to preload ${id}:`, err);
    }))
  );
  
  console.log(`[LevelLoader] Preload complete`);
}

/**
 * Get entity statistics for a level.
 * 
 * @param levelId Level identifier
 * @returns Entity count breakdown or null if not cached
 */
export function getLevelStats(levelId: string): Record<string, number> | null {
  const level = levelCache.get(levelId);
  if (!level) return null;
  
  return countEntitiesByType(level.entities);
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate and normalize raw level data.
 * 
 * @param rawData Raw JSON data from file
 * @param levelId Level ID for error messages
 * @returns Validated TiledLevelData
 * @throws Error if data is invalid
 */
function validateAndNormalize(rawData: unknown, levelId: string): TiledLevelData {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error(`[LevelLoader] Invalid level data for ${levelId}: not an object`);
  }
  
  const data = rawData as Record<string, unknown>;
  
  // Required fields
  if (typeof data.width !== 'number' || data.width <= 0) {
    throw new Error(`[LevelLoader] Invalid level ${levelId}: missing or invalid width`);
  }
  
  if (typeof data.height !== 'number' || data.height <= 0) {
    throw new Error(`[LevelLoader] Invalid level ${levelId}: missing or invalid height`);
  }
  
  // Normalize tileSize (default to 32 if not specified)
  const tileSize = data.tileSize === 32 ? 32 : 32;
  
  // Validate layers
  const layers = data.layers as Record<string, unknown> | undefined;
  if (!layers || typeof layers !== 'object') {
    throw new Error(`[LevelLoader] Invalid level ${levelId}: missing layers`);
  }
  
  // Validate entities array
  const entities = data.entities as unknown[] | undefined;
  if (!Array.isArray(entities)) {
    throw new Error(`[LevelLoader] Invalid level ${levelId}: entities must be an array`);
  }
  
  // Validate tilesets array
  const tilesets = data.tilesets as unknown[] | undefined;
  if (!Array.isArray(tilesets)) {
    throw new Error(`[LevelLoader] Invalid level ${levelId}: tilesets must be an array`);
  }
  
  // Normalize ID
  const id = typeof data.id === 'string' ? data.id : levelId;
  
  // Build the validated object
  const levelData: TiledLevelData = {
    id,
    width: data.width as number,
    height: data.height as number,
    tileSize,
    layers: {
      floor: ensureLayer(layers.floor, 'floor', levelId),
      walls: ensureLayer(layers.walls, 'walls', levelId),
      trim: ensureLayer(layers.trim, 'trim', levelId),
      overlays: ensureLayer(layers.overlays, 'overlays', levelId),
      collision: normalizeCollision(layers.collision, levelId)
    },
    entities: entities.map((e, i) => normalizeEntity(e, i, levelId)),
    tilesets: tilesets.map((t, i) => normalizeTileset(t, i, levelId))
  };
  
  return levelData;
}

/**
 * Ensure a layer is a valid 2D number array.
 */
function ensureLayer(layer: unknown, layerName: string, levelId: string): number[][] {
  if (!Array.isArray(layer)) {
    // Return empty layer if not present (some layers are optional)
    console.warn(`[LevelLoader] Level ${levelId}: missing ${layerName} layer, using empty`);
    return [];
  }
  
  // Validate it's a 2D array of numbers
  for (let y = 0; y < layer.length; y++) {
    const row = layer[y];
    if (!Array.isArray(row)) {
      throw new Error(`[LevelLoader] Invalid ${layerName} layer in ${levelId}: row ${y} is not an array`);
    }
  }
  
  return layer as number[][];
}

/**
 * Normalize collision data.
 */
function normalizeCollision(collision: unknown, levelId: string): { grid?: boolean[][]; rects?: Array<{ x: number; y: number; width: number; height: number }> } {
  if (!collision || typeof collision !== 'object') {
    console.warn(`[LevelLoader] Level ${levelId}: no collision data`);
    return {};
  }
  
  const data = collision as Record<string, unknown>;
  
  return {
    grid: Array.isArray(data.grid) ? data.grid as boolean[][] : undefined,
    rects: Array.isArray(data.rects) ? data.rects as Array<{ x: number; y: number; width: number; height: number }> : undefined
  };
}

/**
 * Normalize an entity object.
 */
function normalizeEntity(entity: unknown, index: number, levelId: string): TiledEntityData {
  if (!entity || typeof entity !== 'object') {
    throw new Error(`[LevelLoader] Invalid entity ${index} in ${levelId}: not an object`);
  }
  
  const e = entity as Record<string, unknown>;
  
  return {
    type: typeof e.type === 'string' ? e.type : 'Unknown',
    x: typeof e.x === 'number' ? e.x : 0,
    y: typeof e.y === 'number' ? e.y : 0,
    width: typeof e.width === 'number' ? e.width : 32,
    height: typeof e.height === 'number' ? e.height : 32,
    properties: (e.properties && typeof e.properties === 'object') 
      ? e.properties as Record<string, unknown>
      : {}
  };
}

/**
 * Normalize a tileset reference.
 */
function normalizeTileset(tileset: unknown, index: number, levelId: string): { key: string; firstGid: number } {
  if (!tileset || typeof tileset !== 'object') {
    throw new Error(`[LevelLoader] Invalid tileset ${index} in ${levelId}: not an object`);
  }
  
  const t = tileset as Record<string, unknown>;
  
  return {
    key: typeof t.key === 'string' ? t.key : `tileset_${index}`,
    firstGid: typeof t.firstGid === 'number' ? t.firstGid : 1
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Count entities by type.
 */
function countEntitiesByType(entities: TiledEntityData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const entity of entities) {
    counts[entity.type] = (counts[entity.type] || 0) + 1;
  }
  
  return counts;
}
