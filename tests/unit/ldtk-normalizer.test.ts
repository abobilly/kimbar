/**
 * Unit tests for ldtk-normalizer.ts and ldtk-validator.ts
 *
 * Tests verify:
 * - LDtk JSON detection
 * - Entity normalization
 * - Field name mapping (inkKnot → storyKnot)
 * - Validation of required entities
 * - Error handling for invalid levels
 */

import { describe, it, expect } from 'vitest';
import {
  isLdtkLevel,
  normalizeLdtkLevel,
  getEncounterTriggers,
  getNpcs,
  LdtkLevelJson,
} from '../../src/content/ldtk-normalizer';
import {
  validateLdtkLevel,
  formatValidationErrors,
} from '../../src/content/ldtk-validator';

// Sample LDtk level JSON (minimal structure)
const mockLdtkLevel: LdtkLevelJson = {
  identifier: 'test_level',
  iid: 'test_iid',
  pxWid: 640,
  pxHei: 480,
  layerInstances: [
    {
      __identifier: 'Entities',
      __type: 'Entities',
      __cWid: 20,
      __cHei: 15,
      __gridSize: 32,
      entityInstances: [
        {
          __identifier: 'PlayerSpawn',
          __grid: [10, 13],
          __worldX: 336,
          __worldY: 448,
          defUid: 1,
          iid: 'spawn_main',
          fieldInstances: [],
        },
        {
          __identifier: 'NPC',
          __grid: [5, 7],
          __worldX: 176,
          __worldY: 256,
          defUid: 2,
          iid: 'npc_clerk',
          fieldInstances: [
            { __identifier: 'name', __type: 'String', __value: 'Court Clerk' },
            { __identifier: 'inkKnot', __type: 'String', __value: 'court_clerk_intro' },
          ],
        },
        {
          __identifier: 'EncounterTrigger',
          __grid: [15, 7],
          __worldX: 496,
          __worldY: 256,
          defUid: 3,
          iid: 'encounter_thomas',
          fieldInstances: [
            { __identifier: 'deckTag', __type: 'String', __value: 'evidence' },
            { __identifier: 'count', __type: 'Int', __value: 3 },
            { __identifier: 'rewardId', __type: 'String', __value: 'evidence_blazer' },
          ],
        },
      ],
    },
  ],
};

// Level missing PlayerSpawn
const mockLdtkLevelNoSpawn: LdtkLevelJson = {
  identifier: 'no_spawn_level',
  pxWid: 640,
  pxHei: 480,
  layerInstances: [
    {
      __identifier: 'Entities',
      __type: 'Entities',
      __gridSize: 32,
      entityInstances: [
        {
          __identifier: 'NPC',
          __worldX: 100,
          __worldY: 100,
          iid: 'lonely_npc',
          fieldInstances: [
            { __identifier: 'storyKnot', __type: 'String', __value: 'test' },
          ],
        },
      ],
    },
  ],
};

describe('LDtk Level Detection', () => {
  it('should detect valid LDtk level JSON', () => {
    expect(isLdtkLevel(mockLdtkLevel)).toBe(true);
  });

  it('should reject non-LDtk objects', () => {
    expect(isLdtkLevel({})).toBe(false);
    expect(isLdtkLevel(null)).toBe(false);
    expect(isLdtkLevel({ entities: [] })).toBe(false);
    expect(isLdtkLevel({ layerInstances: 'not an array' })).toBe(false);
  });
});

describe('LDtk Normalization', () => {
  it('should normalize level dimensions', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);

    expect(level.id).toBe('test_level');
    expect(level.width).toBe(640);
    expect(level.height).toBe(480);
    expect(level.tileSize).toBe(32);
  });

  it('should extract PlayerSpawn coordinates', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);

    expect(level.playerSpawn).toBeDefined();
    expect(level.playerSpawn?.x).toBe(336);
    expect(level.playerSpawn?.y).toBe(448);
  });

  it('should normalize field names (inkKnot → storyKnot)', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const npc = level.entities.find((e) => e.type === 'NPC');

    expect(npc).toBeDefined();
    expect(npc?.properties.storyKnot).toBe('court_clerk_intro');
    // Original inkKnot should not exist
    expect(npc?.properties.inkKnot).toBeUndefined();
  });

  it('should extract encounter trigger properties', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const trigger = level.entities.find((e) => e.type === 'EncounterTrigger');

    expect(trigger).toBeDefined();
    expect(trigger?.properties.deckTag).toBe('evidence');
    expect(trigger?.properties.count).toBe(3);
    expect(trigger?.properties.rewardId).toBe('evidence_blazer');
  });

  it('should not include PlayerSpawn in entities array', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const spawns = level.entities.filter((e) => e.type === 'PlayerSpawn');

    expect(spawns).toHaveLength(0);
  });
});

describe('LDtk Helper Functions', () => {
  it('should get encounter triggers', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const triggers = getEncounterTriggers(level);

    expect(triggers).toHaveLength(1);
    expect(triggers[0].id).toBe('encounter_thomas');
  });

  it('should get NPCs', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const npcs = getNpcs(level);

    expect(npcs).toHaveLength(1);
    expect(npcs[0].id).toBe('npc_clerk');
  });
});

describe('LDtk Validation', () => {
  it('should validate a valid level', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const result = validateLdtkLevel(level);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when PlayerSpawn is missing', () => {
    const level = normalizeLdtkLevel(mockLdtkLevelNoSpawn);
    const result = validateLdtkLevel(level);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_PLAYER_SPAWN')).toBe(true);
  });

  it('should warn about missing required NPC fields', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    // Remove storyKnot from NPC to trigger warning
    const npc = level.entities.find((e) => e.type === 'NPC');
    if (npc) {
      delete npc.properties.storyKnot;
    }

    const result = validateLdtkLevel(level);

    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
  });

  it('should format validation errors for logging', () => {
    const level = normalizeLdtkLevel(mockLdtkLevelNoSpawn);
    const result = validateLdtkLevel(level);
    const formatted = formatValidationErrors(result);

    expect(formatted).toContain('MISSING_PLAYER_SPAWN');
    expect(formatted).toContain('Level validation failed');
  });

  it('should validate encounter trigger count is positive', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const trigger = level.entities.find((e) => e.type === 'EncounterTrigger');
    if (trigger) {
      trigger.properties.count = -1;
    }

    const result = validateLdtkLevel(level);

    expect(result.errors.some((e) => e.code === 'INVALID_ENCOUNTER_COUNT')).toBe(true);
  });
});

describe('Coordinate Conversion', () => {
  it('should use __worldX/__worldY when available', () => {
    const level = normalizeLdtkLevel(mockLdtkLevel);
    const npc = level.entities.find((e) => e.type === 'NPC');

    expect(npc?.x).toBe(176);
    expect(npc?.y).toBe(256);
  });

  it('should fall back to px array', () => {
    const levelWithPx: LdtkLevelJson = {
      identifier: 'px_test',
      pxWid: 320,
      pxHei: 240,
      layerInstances: [
        {
          __identifier: 'Entities',
          __type: 'Entities',
          __gridSize: 32,
          entityInstances: [
            {
              __identifier: 'PlayerSpawn',
              iid: 'spawn',
              px: [100, 100], // px array without __worldX
              fieldInstances: [],
            },
          ],
        },
      ],
    };

    const level = normalizeLdtkLevel(levelWithPx);

    // Should compute from px: x = 100 + 16, y = 100 + 32
    expect(level.playerSpawn?.x).toBe(116);
    expect(level.playerSpawn?.y).toBe(132);
  });
});
