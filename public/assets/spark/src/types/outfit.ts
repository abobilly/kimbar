import { CanonicalSubject } from './flashcard';

export type OutfitSlot = 'hair' | 'torso' | 'legs' | 'shoes';

export interface OutfitItem {
  id: string;
  name: string;
  slot: OutfitSlot;
  unlockSource: CanonicalSubject | 'completion';
  color: string;
}

export interface PlayerOutfit {
  hair?: string;
  torso?: string;
  legs?: string;
  shoes?: string;
}

export const OUTFIT_ITEMS: OutfitItem[] = [
  { id: 'hair-1', name: 'Default Hair', slot: 'hair', unlockSource: 'completion', color: '#8B4513' },
  { id: 'hair-civil', name: 'Procedural Pompadour', slot: 'hair', unlockSource: 'Civil Procedure', color: '#4A90E2' },
  { id: 'hair-con', name: 'Constitutional Crown', slot: 'hair', unlockSource: 'Constitutional Law', color: '#E74C3C' },
  
  { id: 'torso-1', name: 'Default Shirt', slot: 'torso', unlockSource: 'completion', color: '#FFFFFF' },
  { id: 'torso-contracts', name: 'Deal Closer Blazer', slot: 'torso', unlockSource: 'Contracts and Sales', color: '#2ECC71' },
  { id: 'torso-criminal', name: 'Defendant\'s Hoodie', slot: 'torso', unlockSource: 'Criminal Law and Procedure', color: '#C0392B' },
  
  { id: 'legs-1', name: 'Default Pants', slot: 'legs', unlockSource: 'completion', color: '#34495E' },
  { id: 'legs-evidence', name: 'Proof Slacks', slot: 'legs', unlockSource: 'Evidence', color: '#F39C12' },
  
  { id: 'shoes-1', name: 'Default Shoes', slot: 'shoes', unlockSource: 'completion', color: '#2C3E50' },
  { id: 'shoes-property', name: 'Land Baron Boots', slot: 'shoes', unlockSource: 'Real Property', color: '#27AE60' },
  { id: 'shoes-torts', name: 'Liability Loafers', slot: 'shoes', unlockSource: 'Torts', color: '#E67E22' },
];
