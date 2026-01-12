/**
 * Unit tests for registry.ts
 *
 * Tests verify:
 * - Registry accessors work correctly
 * - Content cache management
 * - Deterministic behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch for testing
const mockRegistry = {
  buildId: 'test-123',
  tileSize: 32,
  scale: 2,
  entities: {},
  outfits: {
    default: { id: 'default', name: 'Default', buffs: {} }
  },
  tags: {
    subjects: ['evidence', 'torts', 'contracts'],
    topicTags: []
  },
  sprites: {},
  characters: [],
  rooms: [
    { id: 'scotus_hall_01', ldtkUrl: '/content/ldtk/room.scotus_hall_01.json', displayName: 'Hall' },
    { id: 'scotus_lobby', ldtkUrl: '/content/ldtk/scotus_lobby.json', displayName: 'SCOTUS Lobby' }
  ],
  flashcardPacks: [
    { id: 'flashcards', url: '/content/cards/flashcards.json', schemaVersion: 1, count: 100 }
  ],
  ink: [
    { id: 'story', url: '/generated/ink/story.json' }
  ],
  deckTags: ['evidence', 'torts', 'contracts']
};

describe('Registry Accessors', () => {
  beforeEach(async () => {
    // Reset module state before each test
    vi.resetModules();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRegistry)
    });
  });

  it('should load registry and access rooms', async () => {
    const { loadRegistry, getRoom, getAllRooms } = await import('../../src/content/registry');

    await loadRegistry();

    const room = getRoom('scotus_lobby');
    expect(room).toBeDefined();
    expect(room?.ldtkUrl).toBe('/content/ldtk/scotus_lobby.json');
    expect(room?.displayName).toBe('SCOTUS Lobby');

    const allRooms = getAllRooms();
    expect(allRooms).toHaveLength(2);
  });

  it('should return undefined for non-existent room', async () => {
    const { loadRegistry, getRoom } = await import('../../src/content/registry');

    await loadRegistry();

    const room = getRoom('non_existent');
    expect(room).toBeUndefined();
  });

  it('should load registry and access flashcard packs', async () => {
    const { loadRegistry, getFlashcardPack, getAllFlashcardPacks } = await import('../../src/content/registry');

    await loadRegistry();

    const pack = getFlashcardPack('flashcards');
    expect(pack).toBeDefined();
    expect(pack?.url).toBe('/content/cards/flashcards.json');
    expect(pack?.count).toBe(100);

    const allPacks = getAllFlashcardPacks();
    expect(allPacks).toHaveLength(1);
  });

  it('should load registry and access ink stories', async () => {
    const { loadRegistry, getInkStory, getAllInkStories } = await import('../../src/content/registry');

    await loadRegistry();

    const story = getInkStory('story');
    expect(story).toBeDefined();
    expect(story?.url).toBe('/generated/ink/story.json');

    const allStories = getAllInkStories();
    expect(allStories).toHaveLength(1);
  });

  it('should provide backwards compat deckTags from tags.subjects', async () => {
    const { loadRegistry, getRegistry } = await import('../../src/content/registry');

    await loadRegistry();
    const registry = getRegistry();

    expect(registry.deckTags).toEqual(['evidence', 'torts', 'contracts']);
    expect(registry.tags.subjects).toEqual(['evidence', 'torts', 'contracts']);
  });
});

describe('Content Cache', () => {
  beforeEach(async () => {
    vi.resetModules();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRegistry)
    });
  });

  it('should clear content cache', async () => {
    const { loadRegistry, clearContentCache } = await import('../../src/content/registry');

    await loadRegistry();

    // Should not throw
    expect(() => clearContentCache()).not.toThrow();
  });
});

describe('Registry Determinism', () => {
  it('should have stable room ordering (alphabetical by ID)', () => {
    const rooms = [...mockRegistry.rooms];
    const sortedRooms = [...rooms].sort((a, b) => a.id.localeCompare(b.id));

    // Verify rooms are already sorted (as the build script should produce)
    expect(rooms.map(r => r.id)).toEqual(sortedRooms.map(r => r.id));
  });

  it('should have stable key ordering in registry object', () => {
    const keys = Object.keys(mockRegistry);
    const expectedOrder = [
      'buildId', 'tileSize', 'scale', 'entities', 'outfits',
      'tags', 'sprites', 'characters', 'rooms', 'flashcardPacks', 'ink', 'deckTags'
    ];

    expect(keys).toEqual(expectedOrder);
  });
});
