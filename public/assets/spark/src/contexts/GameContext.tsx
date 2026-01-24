import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { FlashcardDeck, CanonicalSubject, Flashcard, CardPerformance, SubjectStats } from '@/types/flashcard';
import { PlayerOutfit, OUTFIT_ITEMS } from '@/types/outfit';

export interface Boon {
  id: string;
  name: string;
  description: string;
  effect: 'free-reveal' | 'max-hp' | 'reroll';
}

export const AVAILABLE_BOONS: Boon[] = [
  { id: 'reveal', name: 'Cheat Sheet', description: 'One free Reveal per encounter', effect: 'free-reveal' },
  { id: 'hp', name: 'Energy Drink', description: '+20 Max HP', effect: 'max-hp' },
  { id: 'reroll', name: 'Second Chance', description: 'Reroll one question per room', effect: 'reroll' },
];

interface GameState {
  deck: FlashcardDeck | null;
  setDeck: (deck: FlashcardDeck | null) => void;
  
  activeSubjects: Set<CanonicalSubject>;
  toggleSubject: (subject: CanonicalSubject) => void;
  
  isInRun: boolean;
  startRun: () => void;
  endRun: () => void;
  
  hp: number;
  maxHp: number;
  gold: number;
  streak: number;
  addGold: (amount: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  
  activeBoons: Boon[];
  addBoon: (boon: Boon) => void;
  
  currentCard: Flashcard | null;
  setCurrentCard: (card: Flashcard | null) => void;
  
  recordAnswer: (cardId: string, correct: boolean, shaky: boolean) => void;
  performances: Record<string, CardPerformance>;
  
  completedSubjects: Set<CanonicalSubject>;
  markSubjectComplete: (subject: CanonicalSubject) => void;
  
  runStats: Record<CanonicalSubject, SubjectStats>;
  updateRunStats: (subject: CanonicalSubject, correct: boolean) => void;
  
  unlockedOutfits: Set<string>;
  unlockOutfit: (itemId: string) => void;
  equippedOutfit: PlayerOutfit;
  equipOutfitItem: (slot: string, itemId: string) => void;
  
  missedCards: string[];
  shakyCards: string[];
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [activeSubjects, setActiveSubjects] = useState<Set<CanonicalSubject>>(
    new Set([
      'Civil Procedure',
      'Constitutional Law',
      'Contracts and Sales',
      'Criminal Law and Procedure',
      'Evidence',
      'Real Property',
      'Torts',
    ])
  );
  
  const [isInRun, setIsInRun] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [gold, setGold] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeBoons, setActiveBoons] = useState<Boon[]>([]);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [completedSubjects, setCompletedSubjects] = useState<Set<CanonicalSubject>>(new Set());
  const [runStats, setRunStats] = useState<Record<CanonicalSubject, SubjectStats>>({} as any);
  const [missedCards, setMissedCards] = useState<string[]>([]);
  const [shakyCards, setShakyCards] = useState<string[]>([]);
  
  const [performances, setPerformances] = useKV<Record<string, CardPerformance>>('card-performances', {});
  const [unlockedOutfitsArray, setUnlockedOutfitsArray] = useKV<string[]>('unlocked-outfits', ['hair-1', 'torso-1', 'legs-1', 'shoes-1']);
  const [equippedOutfit, setEquippedOutfit] = useKV<PlayerOutfit>('equipped-outfit', {
    hair: 'hair-1',
    torso: 'torso-1',
    legs: 'legs-1',
    shoes: 'shoes-1',
  });

  const unlockedOutfits = new Set(unlockedOutfitsArray || ['hair-1', 'torso-1', 'legs-1', 'shoes-1']);

  const toggleSubject = useCallback((subject: CanonicalSubject) => {
    setActiveSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        if (next.size > 1) {
          next.delete(subject);
        }
      } else {
        next.add(subject);
      }
      return next;
    });
  }, []);

  const startRun = useCallback(() => {
    setIsInRun(true);
    setHp(100);
    setMaxHp(100);
    setGold(0);
    setStreak(0);
    setActiveBoons([]);
    setCompletedSubjects(new Set());
    setMissedCards([]);
    setShakyCards([]);
    
    const initialStats: Record<CanonicalSubject, SubjectStats> = {} as any;
    activeSubjects.forEach(subject => {
      initialStats[subject] = { total: 0, correct: 0, attempts: 0 };
    });
    setRunStats(initialStats);
  }, [activeSubjects]);

  const endRun = useCallback(() => {
    setIsInRun(false);
    setCurrentCard(null);
  }, []);

  const addGold = useCallback((amount: number) => {
    setGold(prev => prev + amount);
  }, []);

  const takeDamage = useCallback((amount: number) => {
    setHp(prev => Math.max(0, prev - amount));
  }, []);

  const heal = useCallback((amount: number) => {
    setHp(prev => Math.min(maxHp, prev + amount));
  }, [maxHp]);

  const incrementStreak = useCallback(() => {
    setStreak(prev => prev + 1);
  }, []);

  const resetStreak = useCallback(() => {
    setStreak(0);
  }, []);

  const addBoon = useCallback((boon: Boon) => {
    setActiveBoons(prev => [...prev, boon]);
    if (boon.effect === 'max-hp') {
      setMaxHp(prev => prev + 20);
      setHp(prev => prev + 20);
    }
  }, []);

  const recordAnswer = useCallback((cardId: string, correct: boolean, shaky: boolean) => {
    setPerformances((current) => {
      const currentPerfs = current || {};
      const perf = currentPerfs[cardId] || { cardId, attempts: 0, correct: 0, lastShaky: false, lastAttemptTime: 0 };
      return {
        ...currentPerfs,
        [cardId]: {
          ...perf,
          attempts: perf.attempts + 1,
          correct: perf.correct + (correct ? 1 : 0),
          lastShaky: shaky,
          lastAttemptTime: Date.now(),
        },
      };
    });

    if (!correct) {
      setMissedCards(prev => [...prev, cardId]);
    }
    if (shaky) {
      setShakyCards(prev => [...prev, cardId]);
    }
  }, [setPerformances]);

  const markSubjectComplete = useCallback((subject: CanonicalSubject) => {
    setCompletedSubjects(prev => new Set([...prev, subject]));
  }, []);

  const updateRunStats = useCallback((subject: CanonicalSubject, correct: boolean) => {
    setRunStats(prev => ({
      ...prev,
      [subject]: {
        total: (prev[subject]?.total || 0) + 1,
        correct: (prev[subject]?.correct || 0) + (correct ? 1 : 0),
        attempts: (prev[subject]?.attempts || 0) + 1,
      },
    }));
  }, []);

  const unlockOutfit = useCallback((itemId: string) => {
    setUnlockedOutfitsArray((current) => {
      const currentArray = current || ['hair-1', 'torso-1', 'legs-1', 'shoes-1'];
      if (!currentArray.includes(itemId)) {
        return [...currentArray, itemId];
      }
      return currentArray;
    });
  }, [setUnlockedOutfitsArray]);

  const equipOutfitItem = useCallback((slot: string, itemId: string) => {
    setEquippedOutfit((current) => ({
      ...current,
      [slot]: itemId,
    }));
  }, [setEquippedOutfit]);

  const value: GameState = {
    deck,
    setDeck,
    activeSubjects,
    toggleSubject,
    isInRun,
    startRun,
    endRun,
    hp,
    maxHp,
    gold,
    streak,
    addGold,
    takeDamage,
    heal,
    incrementStreak,
    resetStreak,
    activeBoons,
    addBoon,
    currentCard,
    setCurrentCard,
    recordAnswer,
    performances: performances || {},
    completedSubjects,
    markSubjectComplete,
    runStats,
    updateRunStats,
    unlockedOutfits,
    unlockOutfit,
    equippedOutfit: equippedOutfit || { hair: 'hair-1', torso: 'torso-1', legs: 'legs-1', shoes: 'shoes-1' },
    equipOutfitItem,
    missedCards,
    shakyCards,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
