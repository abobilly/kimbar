/**
 * LDtk Validator - Validates normalized LevelData against game requirements
 *
 * Run-time validation ensures level data meets game requirements:
 * - Required entities exist (PlayerSpawn)
 * - Entity properties have expected types
 * - References are valid
 *
 * INVARIANT: Fails early with clear errors rather than runtime crashes.
 */

import { EntityData, LevelData } from './types';

/**
 * Validation error with context
 */
export interface LdtkValidationError {
  code: string;
  message: string;
  entityId?: string;
  field?: string;
}

/**
 * Validation result
 */
export interface LdtkValidationResult {
  valid: boolean;
  errors: LdtkValidationError[];
  warnings: LdtkValidationError[];
}

/**
 * Entity field requirements from content contract
 */
const ENTITY_REQUIREMENTS: Record<
  string,
  { required: string[]; optional?: string[] }
> = {
  PlayerSpawn: {
    required: [],
  },
  NPC: {
    required: ['storyKnot'],
    optional: ['name', 'characterId', 'sprite'],
  },
  EncounterTrigger: {
    required: ['deckTag', 'count'],
    optional: ['rewardId', 'once', 'name', 'justiceId'],
  },
  Door: {
    required: ['targetLevel'],
    optional: ['locked', 'requiredItem'],
  },
  OutfitChest: {
    required: ['outfitId'],
  },
};

/**
 * Validate entity properties against requirements
 */
function validateEntityProperties(
  entity: EntityData,
  errors: LdtkValidationError[],
  warnings: LdtkValidationError[]
): void {
  const requirements = ENTITY_REQUIREMENTS[entity.type];

  if (!requirements) {
    // Unknown entity type - warn but don't fail
    warnings.push({
      code: 'UNKNOWN_ENTITY_TYPE',
      message: `Unknown entity type: ${entity.type}`,
      entityId: entity.id,
    });
    return;
  }

  // Check required fields
  for (const field of requirements.required) {
    const value = entity.properties[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: `Entity ${entity.type} missing required field: ${field}`,
        entityId: entity.id,
        field,
      });
    }
  }
}

/**
 * Validate encounter trigger properties
 */
function validateEncounterTrigger(
  entity: EntityData,
  errors: LdtkValidationError[],
  warnings: LdtkValidationError[]
): void {
  const { deckTag, count } = entity.properties;

  // Validate count is a positive number
  if (count !== undefined) {
    const countNum = typeof count === 'number' ? count : parseInt(String(count), 10);
    if (isNaN(countNum) || countNum < 1) {
      errors.push({
        code: 'INVALID_ENCOUNTER_COUNT',
        message: `EncounterTrigger count must be positive integer, got: ${count}`,
        entityId: entity.id,
        field: 'count',
      });
    }
  }

  // Warn if deckTag looks suspicious
  if (typeof deckTag === 'string' && deckTag.includes(' ')) {
    warnings.push({
      code: 'SUSPICIOUS_DECK_TAG',
      message: `deckTag contains spaces (did you mean underscores?): "${deckTag}"`,
      entityId: entity.id,
      field: 'deckTag',
    });
  }
}

/**
 * Validate a normalized LevelData object
 *
 * @param level - Normalized level data from ldtk-normalizer
 * @returns Validation result with errors and warnings
 */
export function validateLdtkLevel(level: LevelData): LdtkValidationResult {
  const errors: LdtkValidationError[] = [];
  const warnings: LdtkValidationError[] = [];

  // 1. Check level has valid dimensions
  if (!level.width || level.width <= 0) {
    errors.push({
      code: 'INVALID_LEVEL_WIDTH',
      message: `Level width must be positive, got: ${level.width}`,
    });
  }

  if (!level.height || level.height <= 0) {
    errors.push({
      code: 'INVALID_LEVEL_HEIGHT',
      message: `Level height must be positive, got: ${level.height}`,
    });
  }

  // 2. Check PlayerSpawn exists
  if (!level.playerSpawn) {
    errors.push({
      code: 'MISSING_PLAYER_SPAWN',
      message: 'Level must have a PlayerSpawn entity',
    });
  } else {
    // Validate spawn is within level bounds
    if (
      level.playerSpawn.x < 0 ||
      level.playerSpawn.x > level.width ||
      level.playerSpawn.y < 0 ||
      level.playerSpawn.y > level.height
    ) {
      warnings.push({
        code: 'SPAWN_OUT_OF_BOUNDS',
        message: `PlayerSpawn at (${level.playerSpawn.x}, ${level.playerSpawn.y}) may be outside level bounds`,
      });
    }
  }

  // 3. Validate each entity
  for (const entity of level.entities) {
    validateEntityProperties(entity, errors, warnings);

    // Type-specific validation
    if (entity.type === 'EncounterTrigger') {
      validateEncounterTrigger(entity, errors, warnings);
    }
  }

  // 4. Check for duplicate entity IDs
  const seenIds = new Set<string>();
  for (const entity of level.entities) {
    if (seenIds.has(entity.id)) {
      warnings.push({
        code: 'DUPLICATE_ENTITY_ID',
        message: `Duplicate entity ID: ${entity.id}`,
        entityId: entity.id,
      });
    }
    seenIds.add(entity.id);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation errors for console output
 */
export function formatValidationErrors(result: LdtkValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const err of result.errors) {
      const context = err.entityId ? ` [${err.entityId}]` : '';
      lines.push(`  ❌ ${err.code}${context}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warn of result.warnings) {
      const context = warn.entityId ? ` [${warn.entityId}]` : '';
      lines.push(`  ⚠️ ${warn.code}${context}: ${warn.message}`);
    }
  }

  if (result.valid) {
    lines.push('✅ Level validation passed');
  } else {
    lines.push(`❌ Level validation failed with ${result.errors.length} error(s)`);
  }

  return lines.join('\n');
}
