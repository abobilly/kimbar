/**
 * Entity Spawner — Spawns entities from compiled LevelData
 * 
 * Handles spawning of all entity types defined in the Tiled pipeline:
 * - PlayerSpawn: Stores spawn point coordinates
 * - Door: Creates interactive transition zones
 * - NPC: Spawns NPC characters linked to character registry
 * - EncounterTrigger: Creates flashcard encounter zones
 * 
 * INVARIANT: Entities spawn on world layer, NOT UI layer.
 * INVARIANT: Character IDs are resolved via character registry.
 */

import type { Scene } from 'phaser';
import type { 
  TiledLevelData, 
  TiledEntityData,
  PlayerSpawnProperties,
  DoorProperties,
  NPCProperties,
  EncounterTriggerProperties
} from '@/types/level-data';
import { isPlayerSpawn, isDoor, isNPC, isEncounterTrigger } from '@/types/level-data';

// ============================================================
// Types
// ============================================================

/**
 * Spawned entity with runtime references.
 */
export interface SpawnedEntity {
  /** Original entity data */
  data: TiledEntityData;
  /** Phaser game object (sprite, zone, etc.) */
  gameObject?: Phaser.GameObjects.GameObject;
  /** Collision/interaction zone */
  zone?: Phaser.GameObjects.Zone;
  /** Whether entity is active/enabled */
  active: boolean;
}

/**
 * Player spawn point data.
 */
export interface SpawnPoint {
  /** Spawn ID from entity properties */
  id: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Facing direction */
  facing: 'up' | 'down' | 'left' | 'right';
}

/**
 * Door transition data.
 */
export interface DoorData {
  /** Target map ID */
  toMap: string;
  /** Target spawn ID */
  toSpawn: string;
  /** Zone bounds */
  bounds: { x: number; y: number; width: number; height: number };
  /** Whether door is locked */
  locked: boolean;
}

/**
 * NPC spawn data.
 */
export interface NPCData {
  /** Character registry ID */
  characterId: string;
  /** Position */
  x: number;
  y: number;
  /** Ink story knot for dialogue */
  storyKnot?: string;
  /** Facing direction */
  facing: 'up' | 'down' | 'left' | 'right';
}

/**
 * Encounter trigger data.
 */
export interface EncounterData {
  /** Deck tag */
  deckTag: string;
  /** Card count */
  count: number;
  /** Trigger zone bounds */
  bounds: { x: number; y: number; width: number; height: number };
  /** Whether this triggers only once */
  once: boolean;
  /** Reward ID on completion */
  rewardId?: string;
  /** Encounter ID for tracking */
  encounterId?: string;
  /** Whether encounter has been triggered */
  triggered: boolean;
}

/**
 * Result of spawning all entities from a level.
 */
export interface SpawnResult {
  /** All spawn points (PlayerSpawn entities) */
  spawnPoints: Map<string, SpawnPoint>;
  /** All doors (Door entities) */
  doors: DoorData[];
  /** All NPCs (NPC entities) */
  npcs: NPCData[];
  /** All encounter triggers */
  encounters: EncounterData[];
  /** All spawned entities for cleanup */
  allEntities: SpawnedEntity[];
  /** Statistics */
  stats: {
    total: number;
    byType: Record<string, number>;
  };
}

// ============================================================
// Entity Spawner Class
// ============================================================

/**
 * EntitySpawner handles spawning all entity types from compiled LevelData.
 * 
 * Usage:
 * ```typescript
 * const spawner = new EntitySpawner(scene);
 * const result = spawner.spawnAll(levelData);
 * 
 * // Access spawn points
 * const mainSpawn = result.spawnPoints.get('main');
 * 
 * // Set up door overlaps
 * for (const door of result.doors) {
 *   // Create zone and add overlap...
 * }
 * ```
 */
export class EntitySpawner {
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  /**
   * Spawn all entities from level data.
   * 
   * @param levelData Compiled level data
   * @returns SpawnResult with all spawned entity data
   */
  spawnAll(levelData: TiledLevelData): SpawnResult {
    console.log(`[EntitySpawner] Spawning entities for level: ${levelData.id}`);
    
    const result: SpawnResult = {
      spawnPoints: new Map(),
      doors: [],
      npcs: [],
      encounters: [],
      allEntities: [],
      stats: {
        total: levelData.entities.length,
        byType: {}
      }
    };
    
    for (const entity of levelData.entities) {
      // Track stats
      result.stats.byType[entity.type] = (result.stats.byType[entity.type] || 0) + 1;
      
      // Log entity spawn
      console.log(`[EntitySpawner] Spawning ${entity.type} at (${entity.x}, ${entity.y})`);
      
      // Spawn based on type
      const spawned = this.spawnEntity(entity, result);
      if (spawned) {
        result.allEntities.push(spawned);
      }
    }
    
    console.log(`[EntitySpawner] Spawn complete: ${result.stats.total} entities`);
    console.log(`[EntitySpawner] - SpawnPoints: ${result.spawnPoints.size}`);
    console.log(`[EntitySpawner] - Doors: ${result.doors.length}`);
    console.log(`[EntitySpawner] - NPCs: ${result.npcs.length}`);
    console.log(`[EntitySpawner] - Encounters: ${result.encounters.length}`);
    
    return result;
  }
  
  /**
   * Spawn a single entity.
   */
  private spawnEntity(entity: TiledEntityData, result: SpawnResult): SpawnedEntity | null {
    if (isPlayerSpawn(entity)) {
      return this.spawnPlayerSpawn(entity, result);
    }
    
    if (isDoor(entity)) {
      return this.spawnDoor(entity, result);
    }
    
    if (isNPC(entity)) {
      return this.spawnNPC(entity, result);
    }
    
    if (isEncounterTrigger(entity)) {
      return this.spawnEncounterTrigger(entity, result);
    }
    
    // Unknown entity type
    console.warn(`[EntitySpawner] Unknown entity type: ${entity.type}`);
    return {
      data: entity,
      active: false
    };
  }
  
  /**
   * Spawn a PlayerSpawn entity.
   * Stores spawn point coordinates for player positioning.
   */
  private spawnPlayerSpawn(
    entity: TiledEntityData & { properties: PlayerSpawnProperties },
    result: SpawnResult
  ): SpawnedEntity {
    const props = entity.properties;
    const spawnId = props.spawnId || 'main';
    const facing = props.facing || 'down';
    
    console.log(`[EntitySpawner] PlayerSpawn: spawnId="${spawnId}"`);
    
    const spawnPoint: SpawnPoint = {
      id: spawnId,
      x: entity.x + entity.width / 2,  // Center of entity
      y: entity.y + entity.height / 2,
      facing
    };
    
    result.spawnPoints.set(spawnId, spawnPoint);
    
    // Optionally create a debug marker in dev mode
    let gameObject: Phaser.GameObjects.GameObject | undefined;
    if (import.meta.env?.DEV) {
      const marker = this.scene.add.circle(
        spawnPoint.x,
        spawnPoint.y,
        8,
        0x00ff00,
        0.3
      );
      marker.setDepth(-100);
      gameObject = marker;
    }
    
    return {
      data: entity,
      gameObject,
      active: true
    };
  }
  
  /**
   * Spawn a Door entity.
   * Creates an interactive zone that triggers room transitions.
   */
  private spawnDoor(
    entity: TiledEntityData & { properties: DoorProperties },
    result: SpawnResult
  ): SpawnedEntity {
    const props = entity.properties;
    
    console.log(`[EntitySpawner] Door: toMap="${props.toMap}", toSpawn="${props.toSpawn}"`);
    
    const doorData: DoorData = {
      toMap: props.toMap,
      toSpawn: props.toSpawn,
      bounds: {
        x: entity.x,
        y: entity.y,
        width: entity.width,
        height: entity.height
      },
      locked: props.locked ?? false
    };
    
    result.doors.push(doorData);
    
    // Create interaction zone
    const zone = this.scene.add.zone(
      entity.x + entity.width / 2,
      entity.y + entity.height / 2,
      entity.width,
      entity.height
    );
    
    // Enable physics for overlap detection
    this.scene.physics.add.existing(zone, true); // true = static
    
    // Store door data on zone for retrieval
    zone.setData('doorData', doorData);
    zone.setData('entityType', 'Door');
    
    // Debug visualization in dev mode
    if (import.meta.env?.DEV) {
      const rect = this.scene.add.rectangle(
        entity.x + entity.width / 2,
        entity.y + entity.height / 2,
        entity.width,
        entity.height,
        0x0088ff,
        0.2
      );
      rect.setStrokeStyle(2, 0x0088ff);
      rect.setDepth(-99);
    }
    
    return {
      data: entity,
      zone,
      active: true
    };
  }
  
  /**
   * Spawn an NPC entity.
   * Creates an NPC character linked to the character registry.
   */
  private spawnNPC(
    entity: TiledEntityData & { properties: NPCProperties },
    result: SpawnResult
  ): SpawnedEntity {
    const props = entity.properties;
    
    console.log(`[EntitySpawner] NPC: characterId="${props.characterId}"`);
    
    const npcData: NPCData = {
      characterId: props.characterId,
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
      storyKnot: props.storyKnot,
      facing: props.facing || 'down'
    };
    
    result.npcs.push(npcData);
    
    // Create placeholder sprite (will be replaced with actual character sprite)
    // The actual sprite loading is handled by WorldScene using character registry
    const placeholder = this.scene.add.circle(
      npcData.x,
      npcData.y,
      16,
      0xff8800,
      0.5
    );
    placeholder.setData('npcData', npcData);
    placeholder.setData('entityType', 'NPC');
    placeholder.setData('characterId', props.characterId);
    placeholder.setData('storyKnot', props.storyKnot);
    
    // Create interaction zone
    const zone = this.scene.add.zone(
      npcData.x,
      npcData.y,
      entity.width,
      entity.height
    );
    this.scene.physics.add.existing(zone, true);
    zone.setData('npcData', npcData);
    zone.setData('entityType', 'NPC');
    
    return {
      data: entity,
      gameObject: placeholder,
      zone,
      active: true
    };
  }
  
  /**
   * Spawn an EncounterTrigger entity.
   * Creates a trigger zone that starts flashcard encounters.
   */
  private spawnEncounterTrigger(
    entity: TiledEntityData & { properties: EncounterTriggerProperties },
    result: SpawnResult
  ): SpawnedEntity {
    const props = entity.properties;
    
    console.log(`[EntitySpawner] EncounterTrigger: deckTag="${props.deckTag}", count=${props.count}`);
    
    const encounterData: EncounterData = {
      deckTag: props.deckTag,
      count: props.count,
      bounds: {
        x: entity.x,
        y: entity.y,
        width: entity.width,
        height: entity.height
      },
      once: props.once ?? false,
      rewardId: props.rewardId,
      encounterId: props.encounterId,
      triggered: false
    };
    
    result.encounters.push(encounterData);
    
    // Create trigger zone
    const zone = this.scene.add.zone(
      entity.x + entity.width / 2,
      entity.y + entity.height / 2,
      entity.width,
      entity.height
    );
    
    this.scene.physics.add.existing(zone, true);
    zone.setData('encounterData', encounterData);
    zone.setData('entityType', 'EncounterTrigger');
    
    // Debug visualization in dev mode
    if (import.meta.env?.DEV) {
      const rect = this.scene.add.rectangle(
        entity.x + entity.width / 2,
        entity.y + entity.height / 2,
        entity.width,
        entity.height,
        0xff0088,
        0.2
      );
      rect.setStrokeStyle(2, 0xff0088);
      rect.setDepth(-99);
    }
    
    return {
      data: entity,
      zone,
      active: true
    };
  }
  
  /**
   * Clean up all spawned entities.
   * Call this when transitioning away from a level.
   */
  cleanup(result: SpawnResult): void {
    console.log(`[EntitySpawner] Cleaning up ${result.allEntities.length} entities`);
    
    for (const spawned of result.allEntities) {
      if (spawned.gameObject) {
        spawned.gameObject.destroy();
      }
      if (spawned.zone) {
        spawned.zone.destroy();
      }
    }
    
    result.allEntities.length = 0;
    result.spawnPoints.clear();
    result.doors.length = 0;
    result.npcs.length = 0;
    result.encounters.length = 0;
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Find the default spawn point from a spawn result.
 * Tries 'main' first, then 'default', then first available.
 */
export function getDefaultSpawn(result: SpawnResult): SpawnPoint | null {
  // Try common default names
  const defaultNames = ['main', 'default', 'start', 'entry'];
  
  for (const name of defaultNames) {
    const spawn = result.spawnPoints.get(name);
    if (spawn) return spawn;
  }
  
  // Return first spawn point if any exist
  const firstSpawn = result.spawnPoints.values().next();
  return firstSpawn.done ? null : firstSpawn.value;
}

/**
 * Find a spawn point by ID or prefix match.
 */
export function findSpawnPoint(
  result: SpawnResult, 
  idOrPrefix: string
): SpawnPoint | null {
  // Exact match first
  const exact = result.spawnPoints.get(idOrPrefix);
  if (exact) return exact;
  
  // Try prefix match
  for (const [id, spawn] of result.spawnPoints) {
    if (id.startsWith(idOrPrefix) || id.includes(idOrPrefix)) {
      return spawn;
    }
  }
  
  return null;
}
