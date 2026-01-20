/**
 * Level Registry — Registry-based level lookup
 * 
 * Provides registry-driven access to compiled LevelData files.
 * Paths are derived from the generated level index when available.
 * 
 * INVARIANT: No hardcoded /content/... paths in runtime code.
 * All level paths are derived from level IDs via convention.
 * 
 * Convention (fallback): Level ID "pack/room" → "/generated/levels/tiled/pack/room.json"
 */

import type { LevelEntry } from '@/types/level-data';

export interface LevelIndexEntry {
  source: 'tiled' | 'ldtk';
  url: string;
  meta?: {
    width?: number;
    height?: number;
    tileSize?: number;
    environment?: string;
  };
}

// ============================================================
// Configuration (convention-based path derivation)
// ============================================================

/** Base path for generated level files (relative to public root) */
const LEVELS_BASE_PATH = '/generated/levels';

/** File extension for compiled level data */
const LEVEL_EXTENSION = '.json';

// ============================================================
// Level Manifest (populated by prepare:content pipeline)
// ============================================================

/**
 * Level index cache.
 * This is populated by loading generated/levels/index.json
 * or by falling back to known level IDs.
 */
let levelIndex: Map<string, LevelIndexEntry> | null = null;

/**
 * Known room packs and their levels.
 * This serves as a fallback when no manifest is available.
 * In production, this should be populated by the build pipeline.
 */
const KNOWN_ROOM_PACKS: Record<string, string[]> = {
  'supreme-court': ['lobby', 'courtroom_main', 'hallway', 'chambers_roberts']
};

// ============================================================
// Public API
// ============================================================

/**
 * Get the URL path for a level by ID.
 * 
 * @param levelId Level identifier (e.g., "supreme-court/lobby")
 * @returns URL path to the compiled LevelData JSON
 * 
 * @example
 * getLevelPath("supreme-court/lobby")
 * // → "/generated/levels/tiled/supreme-court/lobby.json"
 */
export function getLevelPath(levelId: string): string {
  // Validate level ID format (pack/room or just room)
  if (!levelId || typeof levelId !== 'string') {
    throw new Error(`[LevelRegistry] Invalid level ID: ${levelId}`);
  }

  if (levelIndex?.has(levelId)) {
    return levelIndex.get(levelId)!.url;
  }

  // Derive path from convention (fallback)
  const path = `${LEVELS_BASE_PATH}/tiled/${levelId}${LEVEL_EXTENSION}`;

  console.log(`[LevelRegistry] Resolved level path: ${levelId} → ${path}`);

  return path;
}

/**
 * Get all known level IDs.
 * 
 * @returns Array of level IDs (e.g., ["supreme-court/lobby", "supreme-court/hallway"])
 */
export function getAllLevelIds(): string[] {
  // First, try to use the index if loaded
  if (levelIndex) {
    return Array.from(levelIndex.keys()).sort();
  }

  // Fall back to known room packs
  const levelIds: string[] = [];

  for (const [pack, rooms] of Object.entries(KNOWN_ROOM_PACKS)) {
    for (const room of rooms) {
      levelIds.push(`${pack}/${room}`);
    }
  }

  return levelIds.sort();
}

/**
 * Get level entry metadata by ID.
 * 
 * @param levelId Level identifier
 * @returns Level entry metadata or undefined if not found
 */
export function getLevelEntry(levelId: string): LevelEntry | undefined {
  // No LevelEntry metadata in index yet; fallback below.

  // Generate entry from known packs
  const parts = levelId.split('/');
  if (parts.length === 2) {
    const [pack, room] = parts;
    if (KNOWN_ROOM_PACKS[pack]?.includes(room)) {
      return {
        id: levelId,
        displayName: formatDisplayName(room),
        pack
      };
    }
  }

  return undefined;
}

/**
 * Check if a level exists in the registry.
 * 
 * @param levelId Level identifier
 * @returns True if level is known to exist
 */
export function hasLevel(levelId: string): boolean {
  if (levelIndex) {
    return levelIndex.has(levelId);
  }

  // Check known packs
  const parts = levelId.split('/');
  if (parts.length === 2) {
    const [pack, room] = parts;
    return KNOWN_ROOM_PACKS[pack]?.includes(room) ?? false;
  }

  return false;
}

/**
 * Get all levels in a specific room pack.
 * 
 * @param packId Pack identifier (e.g., "supreme-court")
 * @returns Array of level IDs in the pack
 */
export function getLevelsInPack(packId: string): string[] {
  if (levelIndex) {
    return Array.from(levelIndex.keys())
      .filter((id) => id.startsWith(`${packId}/`))
      .sort();
  }

  const rooms = KNOWN_ROOM_PACKS[packId];
  if (rooms) {
    return rooms.map(room => `${packId}/${room}`).sort();
  }

  return [];
}

/**
 * Get all known room pack IDs.
 * 
 * @returns Array of pack IDs
 */
export function getAllPackIds(): string[] {
  if (levelIndex) {
    const packs = new Set<string>();
    for (const id of levelIndex.keys()) {
      const [pack] = id.split('/');
      if (pack) packs.add(pack);
    }
    return Array.from(packs).sort();
  }

  return Object.keys(KNOWN_ROOM_PACKS).sort();
}

/**
 * Get the index entry (source + url) for a level id.
 */
export function getLevelIndexEntry(levelId: string): LevelIndexEntry | undefined {
  return levelIndex?.get(levelId);
}

/**
 * Load the level manifest from generated files.
 * Call this during game initialization to enable full registry features.
 * 
 * @returns Promise that resolves when manifest is loaded
 */
export async function loadLevelManifest(): Promise<void> {
  try {
    const manifestPath = `${LEVELS_BASE_PATH}/index.json`;
    const response = await fetch(manifestPath);

    if (!response.ok) {
      console.warn(`[LevelRegistry] Index not found at ${manifestPath}, using fallback`);
      initializeFallbackManifest();
      return;
    }

    const data = await response.json() as { levels: Record<string, LevelIndexEntry> };
    levelIndex = new Map();

    for (const [id, entry] of Object.entries(data.levels || {})) {
      levelIndex.set(id, entry);
    }

    console.log(`[LevelRegistry] Loaded index with ${levelIndex.size} levels`);
  } catch (error) {
    console.warn('[LevelRegistry] Failed to load index, using fallback:', error);
    initializeFallbackManifest();
  }
}

/**
 * Register a level dynamically (for testing or procedural levels).
 * 
 * @param entry Level entry to register
 */
export function registerLevel(entry: LevelEntry): void {
  if (!levelIndex) {
    levelIndex = new Map();
  }
  levelIndex.set(entry.id, { source: 'tiled', url: getLevelPath(entry.id) });
  console.log(`[LevelRegistry] Registered level: ${entry.id}`);
}

/**
 * Clear the level manifest (for testing).
 */
export function clearLevelManifest(): void {
  levelIndex = null;
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Initialize the manifest from known room packs.
 */
function initializeFallbackManifest(): void {
  levelIndex = new Map();

  for (const [pack, rooms] of Object.entries(KNOWN_ROOM_PACKS)) {
    for (const room of rooms) {
      const id = `${pack}/${room}`;
      levelIndex.set(id, {
        source: 'tiled',
        url: `${LEVELS_BASE_PATH}/tiled/${id}${LEVEL_EXTENSION}`
      });
    }
  }

  console.log(`[LevelRegistry] Initialized fallback index with ${levelIndex.size} levels`);
}

/**
 * Format a room name into a display name.
 * "lobby" → "Lobby"
 * "chambers_roberts" → "Chambers Roberts"
 */
function formatDisplayName(roomName: string): string {
  return roomName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
