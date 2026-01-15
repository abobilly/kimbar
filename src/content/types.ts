// Game state types and interfaces

export interface OutfitBuffs {
  hints?: number;
  strike?: number;
  time?: number;
  skipCard?: boolean;
  extraTime?: number;
  citationBonus?: number;
}

export interface Outfit {
  id: string;
  name: string;
  sprite?: string;
  buffs: OutfitBuffs;
}

export interface Flashcard {
  id: string;
  frontPrompt: string;
  cloze?: string;
  clozeLite?: string;
  easyContent?: string;
  mediumContent?: string;
  hardContent?: string;
  tagsNormalized?: string[];
  difficulty?: number;
  priority?: number;
  mnemonic?: string;
  confusableWith?: string[];
}

export interface GameState {
  currentLevel: string;
  playerPosition: { x: number; y: number };
  equippedOutfit: string;
  unlockedOutfits: string[];
  completedEncounters: string[];
  sanctionMeter: number;
  fashionTokens: number;
  citations: number;
  storyFlags: Record<string, boolean>;
}

export interface EncounterConfig {
  deckTag: string;
  count: number;
  rewardId?: string;
}

// Registry entry types (from generated/registry.json)

export interface RoomEntry {
  id: string;
  ldtkUrl: string;
  displayName?: string;
  spawns?: string[];
}

export interface FlashcardPackEntry {
  id: string;
  url: string;
  schemaVersion: number;
  count?: number;
  contentHash?: string;
  subjects?: string[];
  title?: string;
}

export interface InkEntry {
  id: string;
  url: string;
}

export interface EntityData {
  id: string;
  type: string;
  x: number;
  y: number;
  properties: Record<string, any>;
}

export interface LevelData {
  id?: string;
  width: number;
  height: number;
  tileSize?: number;
  playerSpawn?: { x: number; y: number };
  layers?: {
    ground: number[][];
    collision: boolean[][];
    foreground?: number[][];
  };
  entities: EntityData[];
  tileset?: string;
  // Floor tile data from LDtk IntGrid
  floorGrid?: number[];  // 1D array of tile values
  gridWidth?: number;    // tiles across
  gridHeight?: number;   // tiles down
}

export const DEFAULT_GAME_STATE: GameState = {
  currentLevel: 'scotus_lobby',
  playerPosition: { x: 400, y: 500 },
  equippedOutfit: 'default',
  unlockedOutfits: ['default'],
  completedEncounters: [],
  sanctionMeter: 0,
  fashionTokens: 0,
  citations: 0,
  storyFlags: {}
};
