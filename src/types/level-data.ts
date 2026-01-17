/**
 * Level Data Types for Tiled Pipeline
 * 
 * These types represent the compiled LevelData format produced by the
 * Tiled compilation pipeline (scripts/compile-tiled-maps.mjs).
 * 
 * Contract: docs/TILED_PIPELINE.md
 * Generated files: generated/levels/**\/*.json
 */

/**
 * Reference to a tileset used in the level.
 * GID mapping is used to resolve tile indices to actual tileset frames.
 */
export interface TilesetReference {
  /** Registry key for the tileset (e.g., "lpc-floors") */
  key: string;
  /** First Global ID for this tileset */
  firstGid: number;
}

/**
 * Collision data for a level.
 * Can be a 2D boolean grid or a list of rectangles.
 */
export interface CollisionData {
  /** Collision grid (true = blocked) */
  grid?: boolean[][];
  /** Rectangle-based collision zones */
  rects?: Array<{ x: number; y: number; width: number; height: number }>;
}

/**
 * Layer data containing 2D tile indices.
 * Index 0 = empty tile, positive values reference tileset frames.
 */
export interface TiledLevelLayers {
  /** Base floor tiles */
  floor: number[][];
  /** Wall tiles */
  walls: number[][];
  /** Trim/decorative tiles */
  trim: number[][];
  /** Overlay tiles (above entities) */
  overlays: number[][];
  /** Processed collision data */
  collision: CollisionData;
}

/**
 * Entity data parsed from Tiled object layer.
 * All entities have a type, position, and properties bag.
 */
export interface TiledEntityData {
  /** Entity type: PlayerSpawn, Door, NPC, EncounterTrigger, Prop */
  type: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Width in pixels (for zones/triggers) */
  width: number;
  /** Height in pixels (for zones/triggers) */
  height: number;
  /** Entity-specific properties */
  properties: Record<string, unknown>;
}

/**
 * Compiled LevelData from Tiled maps.
 * This is the runtime format loaded by the game.
 */
export interface TiledLevelData {
  /** Level identifier (e.g., "supreme-court/lobby") */
  id: string;
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
  /** Tile size in pixels (always 32) */
  tileSize: 32;
  /** Tile layers */
  layers: TiledLevelLayers;
  /** Entities parsed from object layer */
  entities: TiledEntityData[];
  /** Tilesets used by this level */
  tilesets: TilesetReference[];
}

/**
 * Entry in the level registry/manifest.
 */
export interface LevelEntry {
  /** Level ID (e.g., "supreme-court/lobby") */
  id: string;
  /** Display name for UI */
  displayName?: string;
  /** Spawn point IDs available in this level */
  spawns?: string[];
  /** Room pack this level belongs to */
  pack?: string;
}

// ============================================================
// Entity Property Types (for type-safe property access)
// ============================================================

/**
 * Properties for PlayerSpawn entity.
 */
export interface PlayerSpawnProperties {
  /** Spawn point ID (e.g., "main", "from_hallway") */
  spawnId: string;
  /** Direction player faces on spawn */
  facing?: 'up' | 'down' | 'left' | 'right';
}

/**
 * Properties for Door entity.
 */
export interface DoorProperties {
  /** Target map ID (e.g., "supreme-court/hallway") */
  toMap: string;
  /** Target spawn ID in destination map */
  toSpawn: string;
  /** Whether door requires a key/condition */
  locked?: boolean;
  /** Condition ID for locked doors */
  unlockCondition?: string;
}

/**
 * Properties for NPC entity.
 */
export interface NPCProperties {
  /** Character registry ID (e.g., "npc.clerk_01") */
  characterId: string;
  /** Ink story knot for dialogue */
  storyKnot?: string;
  /** NPC facing direction */
  facing?: 'up' | 'down' | 'left' | 'right';
}

/**
 * Properties for EncounterTrigger entity.
 */
export interface EncounterTriggerProperties {
  /** Flashcard deck tag to pull from */
  deckTag: string;
  /** Number of cards in encounter */
  count: number;
  /** Only trigger once */
  once?: boolean;
  /** Reward ID on completion */
  rewardId?: string;
  /** Encounter ID for tracking completion */
  encounterId?: string;
}

/**
 * Type guard to check if entity is a PlayerSpawn.
 */
export function isPlayerSpawn(entity: TiledEntityData): entity is TiledEntityData & { properties: PlayerSpawnProperties } {
  return entity.type === 'PlayerSpawn';
}

/**
 * Type guard to check if entity is a Door.
 */
export function isDoor(entity: TiledEntityData): entity is TiledEntityData & { properties: DoorProperties } {
  return entity.type === 'Door';
}

/**
 * Type guard to check if entity is an NPC.
 */
export function isNPC(entity: TiledEntityData): entity is TiledEntityData & { properties: NPCProperties } {
  return entity.type === 'NPC';
}

/**
 * Type guard to check if entity is an EncounterTrigger.
 */
export function isEncounterTrigger(entity: TiledEntityData): entity is TiledEntityData & { properties: EncounterTriggerProperties } {
  return entity.type === 'EncounterTrigger';
}
