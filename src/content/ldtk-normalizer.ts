/**
 * LDtk Normalizer - Converts raw LDtk JSON to internal LevelData format
 *
 * This module extracts LDtk-specific parsing from WorldScene into a
 * reusable, testable module that:
 * - Normalizes entity field names (inkKnot → storyKnot)
 * - Converts LDtk coordinates to game coordinates
 * - Strips editor-only metadata
 *
 * INVARIANT: No hardcoded content paths - this only transforms data.
 */

import { EntityData, LevelData } from './types';

/**
 * Raw LDtk field instance from exported JSON
 */
interface LdtkFieldInstance {
  __identifier: string;
  __type: string;
  __value: unknown;
  defUid?: number;
}

/**
 * Raw LDtk entity instance from exported JSON
 */
interface LdtkEntityInstance {
  __identifier: string;
  __grid?: [number, number];
  __pivot?: [number, number];
  __tags?: string[];
  __worldX?: number;
  __worldY?: number;
  defUid?: number;
  iid?: string;
  width?: number;
  height?: number;
  px?: [number, number];
  fieldInstances?: LdtkFieldInstance[];
}

/**
 * Raw LDtk layer instance from exported JSON
 */
interface LdtkLayerInstance {
  __identifier: string;
  __type: string;
  __cWid?: number;
  __cHei?: number;
  __gridSize?: number;
  entityInstances?: LdtkEntityInstance[];
}

/**
 * Raw LDtk level (single level export format)
 */
export interface LdtkLevelJson {
  identifier?: string;
  iid?: string;
  pxWid?: number;
  pxHei?: number;
  bgColor?: string;
  layerInstances?: LdtkLayerInstance[];
  // Custom kimbar metadata
  _kimbar?: {
    name?: string;
    description?: string;
    tileset?: string;
    music?: string;
  };
}

/**
 * Field name normalization map
 * Maps LDtk field names to internal property names
 */
const FIELD_NORMALIZATIONS: Record<string, string> = {
  inkKnot: 'storyKnot',
  knot: 'storyKnot',
  // Add more as needed
};

/**
 * Normalize a single entity field name
 */
function normalizeFieldName(name: string): string {
  return FIELD_NORMALIZATIONS[name] || name;
}

/**
 * Extract and normalize properties from LDtk field instances
 */
function extractProperties(
  fieldInstances: LdtkFieldInstance[] | undefined
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if (!fieldInstances) return props;

  for (const field of fieldInstances) {
    const name = normalizeFieldName(field.__identifier);
    props[name] = field.__value;
  }

  return props;
}

/**
 * Convert LDtk entity coordinates to game coordinates
 *
 * LDtk uses bottom-anchored sprites (pivot 0.5, 1), so __worldY is at feet.
 * Our game uses the same convention.
 */
function convertEntityCoordinates(
  entity: LdtkEntityInstance,
  gridSize: number
): { x: number; y: number } {
  // Prefer __worldX/__worldY if available (more accurate)
  if (entity.__worldX !== undefined && entity.__worldY !== undefined) {
    return {
      x: entity.__worldX,
      y: entity.__worldY,
    };
  }

  // Fall back to px array + offset
  if (entity.px) {
    return {
      x: entity.px[0] + gridSize / 2,
      y: entity.px[1] + gridSize,
    };
  }

  // Last resort: grid coordinates
  if (entity.__grid) {
    return {
      x: entity.__grid[0] * gridSize + gridSize / 2,
      y: (entity.__grid[1] + 1) * gridSize,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Convert a single LDtk entity to internal EntityData format
 */
function convertEntity(
  entity: LdtkEntityInstance,
  gridSize: number
): EntityData {
  const coords = convertEntityCoordinates(entity, gridSize);
  const props = extractProperties(entity.fieldInstances);

  return {
    id: entity.iid || `${entity.__identifier}_${entity.defUid || 0}`,
    type: entity.__identifier,
    x: coords.x,
    y: coords.y,
    properties: props as Record<string, unknown>,
  };
}

/**
 * Check if raw JSON is an LDtk level export or Project JSON
 */
export function isLdtkLevel(json: unknown): json is LdtkLevelJson {
  if (!json || typeof json !== 'object') return false;
  const obj = json as Record<string, unknown>;
  // Check for simplified export (layerInstances at root) or Project JSON (levels array)
  return Array.isArray(obj.layerInstances) || Array.isArray(obj.levels);
}

/**
 * Normalize raw LDtk JSON into internal LevelData format
 *
 * @param rawJson - Raw LDtk level JSON (single level export) or Project JSON
 * @returns Normalized LevelData for game use
 */
export function normalizeLdtkLevel(rawJson: LdtkLevelJson | any): LevelData {
  // Handle LDtk Project JSON (extract first level)
  let levelData = rawJson;
  if (Array.isArray(rawJson.levels) && rawJson.levels.length > 0) {
    levelData = rawJson.levels[0];
  }

  // Find Entities layer
  const entitiesLayer = levelData.layerInstances?.find(
    (layer: any) => layer.__identifier === 'Entities'
  );

  const gridSize = entitiesLayer?.__gridSize || 32;

  const level: LevelData = {
    id: levelData.identifier || levelData.iid || 'unknown',
    width: levelData.pxWid || 800,
    height: levelData.pxHei || 600,
    tileSize: gridSize,
    entities: [],
    playerSpawn: undefined,
  };

  // Process entities
  if (entitiesLayer?.entityInstances) {
    for (const ldtkEntity of entitiesLayer.entityInstances) {
      const entity = convertEntity(ldtkEntity, gridSize);

      if (ldtkEntity.__identifier === 'PlayerSpawn') {
        level.playerSpawn = { x: entity.x, y: entity.y };
      } else {
        level.entities.push(entity);
      }
    }
  }

  return level;
}

/**
 * Get encounter triggers from normalized level data
 * Useful for setting up physics zones
 */
export function getEncounterTriggers(level: LevelData): EntityData[] {
  return level.entities.filter((e) => e.type === 'EncounterTrigger');
}

/**
 * Get NPCs from normalized level data
 */
export function getNpcs(level: LevelData): EntityData[] {
  return level.entities.filter((e) => e.type === 'NPC');
}
