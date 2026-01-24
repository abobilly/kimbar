import { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameProvider, useGame } from './contexts/GameContext';
import { DungeonScene, DungeonConfig } from './game/DungeonScene';
import { StartScreen } from './components/StartScreen';
import { DeckImport } from './components/DeckImport';
import { HUD } from './components/HUD';
import { FlashcardDuel } from './components/FlashcardDuel';
import { BoonSelection } from './components/BoonSelection';
import { Wardrobe } from './components/Wardrobe';
import { ResultsScreen } from './components/ResultsScreen';
import { mapDeckSubjectsToCanonical, selectEncounterCards, validateDeck } from './lib/deck';
import { CanonicalSubject, Flashcard } from './types/flashcard';
import { OUTFIT_ITEMS } from './types/outfit';
import { Toaster, toast } from 'sonner';

type GameScreen = 'start' | 'import' | 'playing' | 'results';

function GameContent() {
  const game = useGame();
  const {
    deck,
    setDeck,
    activeSubjects,
    isInRun,
    startRun,
    endRun,
    currentCard,
    setCurrentCard,
    recordAnswer,
    performances,
    takeDamage,
    heal,
    addGold,
    incrementStreak,
    resetStreak,
    completedSubjects,
    markSubjectComplete,
    updateRunStats,
    unlockOutfit,
    unlockedOutfits,
  } = game;

  const [screen, setScreen] = useState<GameScreen>('start');
  const [showBoonSelection, setShowBoonSelection] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [newUnlocks, setNewUnlocks] = useState<string[]>([]);
  const [encounterMap, setEncounterMap] = useState<Record<string, Flashcard>>({});
  
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<DungeonScene | null>(null);

  useEffect(() => {
    const loadBundledDeck = async () => {
      if (deck) return;
      
      try {
        const response = await fetch('/master-bar-flashcards.json');
        if (response.ok) {
          const data = await response.json();
          const { valid, deck: validatedDeck } = validateDeck(data);
          if (valid && validatedDeck) {
            setDeck(validatedDeck);
            toast.success('Bundled deck loaded!');
          }
        }
      } catch (err) {
        console.log('No bundled deck found');
      }
    };

    loadBundledDeck();
  }, [deck, setDeck]);

  useEffect(() => {
    if (screen === 'playing' && isInRun && !gameRef.current) {
      initPhaser();
      setTimeout(() => {
        const gameContainer = document.getElementById('phaser-game');
        if (gameContainer) {
          gameContainer.focus();
        }
      }, 100);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, [screen, isInRun]);

  const initPhaser = () => {
    if (!deck || !deck.cards || !Array.isArray(deck.cards) || deck.cards.length === 0) {
      console.error('Cannot initialize Phaser: missing deck or deck has no cards');
      return;
    }
    
    if (!activeSubjects || activeSubjects.size === 0) {
      console.error('Cannot initialize Phaser: no active subjects');
      return;
    }

    const subjectCards = mapDeckSubjectsToCanonical(deck);
    const encounterCounts: Record<CanonicalSubject, number> = {} as any;
    const encounters: Record<string, Flashcard> = {};

    Array.from(activeSubjects).forEach(subject => {
      const cards = subjectCards[subject] || [];
      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        console.warn(`No cards found for subject: ${subject}`);
        encounterCounts[subject] = 0;
        return;
      }
      
      const count = Math.min(2, cards.length);
      const selected = selectEncounterCards(cards, count, performances || {});
      
      encounterCounts[subject] = selected.length;
      
      selected.forEach((card, i) => {
        const encounterId = `${subject}-${i}`;
        encounters[encounterId] = card;
      });
    });

    setEncounterMap(encounters);

    const dungeonConfig: DungeonConfig = {
      activeSubjects: Array.from(activeSubjects),
      encounterCounts,
      onEncounter: handleEncounter,
      onRoomComplete: handleRoomComplete,
      onExitReached: handleExitReached,
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'phaser-game',
      backgroundColor: '#0a0a15',
      scene: DungeonScene,
    };

    try {
      gameRef.current = new Phaser.Game(config);
      
      gameRef.current.events.once('ready', () => {
        if (gameRef.current) {
          const scene = gameRef.current.scene.getScene('DungeonScene') as DungeonScene;
          if (scene) {
            sceneRef.current = scene;
            scene.scene.restart(dungeonConfig);
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize Phaser:', error);
    }
  };

  const handleEncounter = (subject: CanonicalSubject, encounterId: string) => {
    if (!encounterMap || !encounterMap[encounterId]) {
      console.error(`Card not found for encounter: ${encounterId}`);
      return;
    }
    const card = encounterMap[encounterId];
    setCurrentCard(card);
  };

  const handleAnswerComplete = (correct: boolean, shaky: boolean) => {
    if (!currentCard) return;

    recordAnswer(currentCard.id, correct, shaky);
    updateRunStats(currentCard.subject as CanonicalSubject, correct);

    if (correct) {
      heal(5);
      addGold(10);
      incrementStreak();
      toast.success('Correct!', { duration: 1000 });
    } else {
      takeDamage(15);
      resetStreak();
      toast.error('Incorrect', { duration: 1000 });
    }

    setCurrentCard(null);
  };

  const handleRoomComplete = (subject: CanonicalSubject) => {
    if (!completedSubjects.has(subject)) {
      markSubjectComplete(subject);
      
      const subjectItems = OUTFIT_ITEMS.filter(item => item.unlockSource === subject);
      const unlockedItem = subjectItems.find(item => !unlockedOutfits.has(item.id));
      
      if (unlockedItem) {
        unlockOutfit(unlockedItem.id);
        setNewUnlocks(prev => [...prev, unlockedItem.id]);
      }

      setShowBoonSelection(true);
    }
  };

  const handleExitReached = () => {
    const completionItems = OUTFIT_ITEMS.filter(item => item.unlockSource === 'completion');
    const unlockedItem = completionItems.find(item => !unlockedOutfits.has(item.id));
    
    if (unlockedItem) {
      unlockOutfit(unlockedItem.id);
      setNewUnlocks(prev => [...prev, unlockedItem.id]);
    }

    endRun();
    setScreen('results');
    
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    }
  };

  const handleStartRun = () => {
    if (!deck) return;
    startRun();
    setScreen('playing');
    setNewUnlocks([]);
  };

  const handleNewRun = () => {
    setScreen('start');
    setNewUnlocks([]);
  };

  return (
    <>
      <Toaster position="top-center" />
      
      {screen === 'start' && (
        <StartScreen
          onStartRun={handleStartRun}
          onImportDeck={() => setScreen('import')}
          onOpenWardrobe={() => setShowWardrobe(true)}
        />
      )}

      {screen === 'import' && (
        <DeckImport
          onImport={(importedDeck) => {
            setDeck(importedDeck);
            setScreen('start');
            toast.success('Deck imported successfully!');
          }}
          onCancel={() => setScreen('start')}
        />
      )}

      {screen === 'playing' && isInRun && (
        <>
          <HUD onWardrobeClick={() => setShowWardrobe(true)} />
          <div id="phaser-game" className="w-full h-screen" tabIndex={0} />
        </>
      )}

      {screen === 'results' && (
        <ResultsScreen
          onNewRun={handleNewRun}
          newUnlocks={newUnlocks}
        />
      )}

      {currentCard && (
        <FlashcardDuel
          card={currentCard}
          onComplete={handleAnswerComplete}
        />
      )}

      {showBoonSelection && (
        <BoonSelection
          onSelect={(boon) => {
            game.addBoon(boon);
            setShowBoonSelection(false);
            toast.success(`${boon.name} activated!`);
          }}
        />
      )}

      <Wardrobe
        open={showWardrobe}
        onClose={() => setShowWardrobe(false)}
      />
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;