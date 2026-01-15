// Outfit System - Fashion & Buffs
import { Outfit } from '@content/types';
import { getGameState, updateGameState, getRegistry, saveGameState } from '@content/registry';

export interface OutfitBuffs {
  hints?: number;
  skipCard?: boolean;
  extraTime?: number;
  citationBonus?: number;
}

export class OutfitSystem {
  
  static getEquippedOutfit(): Outfit | null {
    const state = getGameState();
    const registry = getRegistry();
    return registry.outfits[state.equippedOutfit] || null;
  }

  static getUnlockedOutfits(): Outfit[] {
    const state = getGameState();
    const registry = getRegistry();
    return state.unlockedOutfits
      .map(id => registry.outfits[id])
      .filter((outfit): outfit is Outfit => outfit !== undefined);
  }

  static getAllOutfits(): Record<string, Outfit> {
    const registry = getRegistry();
    return registry.outfits;
  }

  static equipOutfit(outfitId: string): boolean {
    const state = getGameState();
    
    // Check if outfit is unlocked
    if (!state.unlockedOutfits.includes(outfitId)) {
      console.warn('Outfit not unlocked:', outfitId);
      return false;
    }

    updateGameState({ equippedOutfit: outfitId });
    saveGameState();
    return true;
  }

  static unlockOutfit(outfitId: string): void {
    const state = getGameState();
    if (!state.unlockedOutfits.includes(outfitId)) {
      updateGameState({
        unlockedOutfits: [...state.unlockedOutfits, outfitId]
      });
      saveGameState();
    }
  }

  static getActiveBuffs(): OutfitBuffs {
    const outfit = this.getEquippedOutfit();
    if (!outfit) return {};
    return outfit.buffs || {};
  }

  static hasHints(): boolean {
    const buffs = this.getActiveBuffs();
    return (buffs.hints || 0) > 0;
  }

  static canSkipCard(): boolean {
    const buffs = this.getActiveBuffs();
    return buffs.skipCard === true;
  }

  static getExtraTime(): number {
    const buffs = this.getActiveBuffs();
    return buffs.extraTime || 0;
  }

  static getCitationBonus(): number {
    const buffs = this.getActiveBuffs();
    return buffs.citationBonus || 0;
  }

  static purchaseOutfit(outfitId: string): boolean {
    const state = getGameState();
    const registry = getRegistry();
    const outfit = registry.outfits[outfitId];

    if (!outfit) {
      console.warn('Outfit not found:', outfitId);
      return false;
    }

    // Check if already unlocked
    if (state.unlockedOutfits.includes(outfitId)) {
      console.warn('Outfit already unlocked:', outfitId);
      return false;
    }

    // Check if player has enough fashion tokens (assuming cost = 50 per outfit)
    const cost = 50; // Could be stored in outfit data
    if (state.fashionTokens < cost) {
      console.warn('Not enough fashion tokens');
      return false;
    }

    updateGameState({
      fashionTokens: state.fashionTokens - cost,
      unlockedOutfits: [...state.unlockedOutfits, outfitId]
    });
    saveGameState();
    return true;
  }

  static getOutfitSprite(outfitId: string): string {
    const registry = getRegistry();
    const outfit = registry.outfits[outfitId];
    if (!outfit) return 'player_default';
    return outfit.sprite || `player_${outfitId}`;
  }
}

export default OutfitSystem;
