/**
 * Level Test — Debug module for testing Tiled level loading
 * 
 * This module provides functions to test the level loading system
 * independently of the game scene. Use during development to verify
 * the pipeline works correctly.
 * 
 * Usage in browser console:
 * ```javascript
 * import { testLoadLevel, testLevelRegistry } from './src/debug/level-test';
 * await testLoadLevel('supreme-court/lobby');
 * testLevelRegistry();
 * ```
 */

import { loadLevelData, clearAllLevelCache, getLevelStats } from '@/content/level-loader';
import { 
  getLevelPath, 
  getAllLevelIds, 
  getLevelEntry, 
  hasLevel,
  loadLevelManifest,
  getAllPackIds,
  getLevelsInPack
} from '@/content/level-registry';
import type { TiledLevelData } from '@/types/level-data';

// ============================================================
// Test Functions
// ============================================================

/**
 * Test loading a single level.
 * Logs detailed information about the loaded level data.
 * 
 * @param levelId Level to load (e.g., "supreme-court/lobby")
 */
export async function testLoadLevel(levelId: string): Promise<TiledLevelData | null> {
  console.log('='.repeat(60));
  console.log(`[LevelTest] Testing level: ${levelId}`);
  console.log('='.repeat(60));
  
  try {
    const level = await loadLevelData(levelId);
    
    console.log('\n[LevelTest] ✅ Level loaded successfully!');
    console.log('\n--- Level Summary ---');
    console.log(`ID: ${level.id}`);
    console.log(`Size: ${level.width}x${level.height} tiles (${level.width * 32}x${level.height * 32} px)`);
    console.log(`Tile Size: ${level.tileSize}px`);
    
    console.log('\n--- Tilesets ---');
    for (const ts of level.tilesets) {
      console.log(`  - ${ts.key} (firstGid: ${ts.firstGid})`);
    }
    
    console.log('\n--- Layers ---');
    console.log(`  - floor: ${level.layers.floor.length} rows`);
    console.log(`  - walls: ${level.layers.walls.length} rows`);
    console.log(`  - trim: ${level.layers.trim.length} rows`);
    console.log(`  - overlays: ${level.layers.overlays.length} rows`);
    console.log(`  - collision: ${level.layers.collision.grid ? `${level.layers.collision.grid.length} rows` : 'none'}`);
    
    console.log('\n--- Entities ---');
    console.log(`Total: ${level.entities.length}`);
    
    const byType: Record<string, number> = {};
    for (const entity of level.entities) {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    }
    
    for (const [type, count] of Object.entries(byType).sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  - ${type}: ${count}`);
    }
    
    console.log('\n--- Entity Details ---');
    for (const entity of level.entities) {
      console.log(`  ${entity.type} @ (${entity.x}, ${entity.y})`);
      for (const [key, value] of Object.entries(entity.properties)) {
        console.log(`    ${key}: ${JSON.stringify(value)}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    return level;
  } catch (error) {
    console.error('\n[LevelTest] ❌ Failed to load level:', error);
    console.log('='.repeat(60));
    return null;
  }
}

/**
 * Test the level registry.
 * Lists all known levels and their paths.
 */
export function testLevelRegistry(): void {
  console.log('='.repeat(60));
  console.log('[LevelTest] Testing Level Registry');
  console.log('='.repeat(60));
  
  console.log('\n--- Room Packs ---');
  const packs = getAllPackIds();
  for (const pack of packs) {
    console.log(`  📁 ${pack}`);
    const levels = getLevelsInPack(pack);
    for (const level of levels) {
      const entry = getLevelEntry(level);
      console.log(`     └─ ${level} → "${entry?.displayName || 'Unknown'}"`);
    }
  }
  
  console.log('\n--- All Level IDs ---');
  const allIds = getAllLevelIds();
  for (const id of allIds) {
    const path = getLevelPath(id);
    const exists = hasLevel(id);
    console.log(`  ${exists ? '✓' : '?'} ${id} → ${path}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Test loading all levels in a pack.
 * 
 * @param packId Pack to test (e.g., "supreme-court")
 */
export async function testLoadPack(packId: string): Promise<void> {
  console.log('='.repeat(60));
  console.log(`[LevelTest] Testing pack: ${packId}`);
  console.log('='.repeat(60));
  
  const levels = getLevelsInPack(packId);
  console.log(`Found ${levels.length} levels in pack\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const levelId of levels) {
    try {
      const level = await loadLevelData(levelId);
      console.log(`✅ ${levelId} - ${level.entities.length} entities`);
      success++;
    } catch (error) {
      console.log(`❌ ${levelId} - ${error}`);
      failed++;
    }
  }
  
  console.log(`\nResults: ${success} succeeded, ${failed} failed`);
  console.log('='.repeat(60));
}

/**
 * Initialize the level registry and run basic tests.
 */
export async function runFullTest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[LevelTest] Running Full Test Suite');
  console.log('='.repeat(60));
  
  // Clear cache for fresh test
  clearAllLevelCache();
  
  // Load manifest
  console.log('\n1. Loading level manifest...');
  await loadLevelManifest();
  
  // Test registry
  console.log('\n2. Testing registry...');
  testLevelRegistry();
  
  // Test loading supreme-court/lobby
  console.log('\n3. Testing level load...');
  const testLevelId = 'supreme-court/lobby';
  const level = await testLoadLevel(testLevelId);
  
  if (level) {
    console.log('\n4. Verifying entity data...');
    
    // Check for expected entity types
    const hasPlayerSpawn = level.entities.some(e => e.type === 'PlayerSpawn');
    const hasDoor = level.entities.some(e => e.type === 'Door');
    const hasNPC = level.entities.some(e => e.type === 'NPC');
    const hasEncounter = level.entities.some(e => e.type === 'EncounterTrigger');
    
    console.log(`  PlayerSpawn: ${hasPlayerSpawn ? '✅' : '⚠️ not found'}`);
    console.log(`  Door: ${hasDoor ? '✅' : '⚠️ not found'}`);
    console.log(`  NPC: ${hasNPC ? '✅' : '⚠️ not found'}`);
    console.log(`  EncounterTrigger: ${hasEncounter ? '✅' : '⚠️ not found'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('[LevelTest] Test Complete');
  console.log('='.repeat(60));
}

// ============================================================
// Global Export for Console Access
// ============================================================

// Make test functions available globally in dev mode
if (import.meta.env?.DEV) {
  (window as unknown as Record<string, unknown>).levelTest = {
    testLoadLevel,
    testLevelRegistry,
    testLoadPack,
    runFullTest,
    clearCache: clearAllLevelCache,
    getLevelStats
  };
  
  console.log('[LevelTest] Debug functions available at window.levelTest');
}
