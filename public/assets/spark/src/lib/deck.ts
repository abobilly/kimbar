import { FlashcardDeck, Flashcard, CANONICAL_SUBJECTS, CanonicalSubject, CardPerformance } from '@/types/flashcard';

export function validateDeck(data: any): { valid: boolean; deck?: FlashcardDeck; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON structure');
    return { valid: false, errors };
  }

  if (!data.cards || !Array.isArray(data.cards)) {
    errors.push('Missing or invalid cards array');
    return { valid: false, errors };
  }

  const validCards: Flashcard[] = [];
  let skipped = 0;

  for (let i = 0; i < data.cards.length; i++) {
    const card = data.cards[i];
    
    if (card.subject === 'MPT') {
      skipped++;
      continue;
    }

    if (!card.id || !card.subject) {
      skipped++;
      continue;
    }

    if (!card.game || typeof card.game !== 'object') {
      skipped++;
      continue;
    }

    if (!card.game.stem && !card.frontPrompt) {
      skipped++;
      continue;
    }

    validCards.push(card as Flashcard);
  }

  if (skipped > 0) {
    errors.push(`Skipped ${skipped} invalid or MPT cards`);
  }

  if (validCards.length === 0) {
    errors.push('No valid cards found after filtering');
    return { valid: false, errors };
  }

  const subjects = Array.from(new Set(validCards.map(c => c && c.subject).filter(Boolean)));

  const deck: FlashcardDeck = {
    source: data.source,
    version: data.version,
    totalCards: validCards.length,
    subjects: subjects || [],
    cards: validCards,
  };

  return { valid: true, deck, errors };
}

export function mapDeckSubjectsToCanonical(deck: FlashcardDeck | null | undefined): Record<CanonicalSubject, Flashcard[]> {
  const mapped: Record<string, Flashcard[]> = {
    'Civil Procedure': [],
    'Constitutional Law': [],
    'Contracts and Sales': [],
    'Criminal Law and Procedure': [],
    'Evidence': [],
    'Real Property': [],
    'Torts': [],
  };

  if (!deck || !deck.cards || !Array.isArray(deck.cards)) {
    return mapped as Record<CanonicalSubject, Flashcard[]>;
  }

  for (const card of deck.cards) {
    if (!card || !card.subject) continue;
    const subject = card.subject;

    if (subject === 'Civil Procedure') {
      mapped['Civil Procedure'].push(card);
    } else if (subject === 'Con Law') {
      mapped['Constitutional Law'].push(card);
    } else if (subject === 'Contracts') {
      mapped['Contracts and Sales'].push(card);
    } else if (subject === 'Criminal Law' || subject === 'Criminal Procedure') {
      mapped['Criminal Law and Procedure'].push(card);
    } else if (subject === 'Evidence') {
      mapped['Evidence'].push(card);
    } else if (subject === 'Real Property') {
      mapped['Real Property'].push(card);
    } else if (subject === 'Torts') {
      mapped['Torts'].push(card);
    }
  }

  return mapped as Record<CanonicalSubject, Flashcard[]>;
}

export function getSubjectStats(deck: FlashcardDeck | null | undefined): Record<CanonicalSubject, number> {
  if (!deck) {
    return {
      'Civil Procedure': 0,
      'Constitutional Law': 0,
      'Contracts and Sales': 0,
      'Criminal Law and Procedure': 0,
      'Evidence': 0,
      'Real Property': 0,
      'Torts': 0,
    };
  }
  
  const mapped = mapDeckSubjectsToCanonical(deck);
  const stats: Record<string, number> = {};

  for (const [subject, cards] of Object.entries(mapped)) {
    stats[subject] = (cards && Array.isArray(cards)) ? cards.length : 0;
  }

  return stats as Record<CanonicalSubject, number>;
}

export function selectEncounterCards(
  cards: Flashcard[] | null | undefined,
  count: number,
  performances: Record<string, CardPerformance> | null | undefined
): Flashcard[] {
  if (!cards || !Array.isArray(cards) || cards.length === 0) return [];
  if (cards.length <= count) return [...cards];
  
  const safePerformances = performances || {};

  const weighted = cards.map(card => {
    const perf = safePerformances[card.id];
    let weight = 1;

    if (perf) {
      const accuracy = perf.attempts > 0 ? perf.correct / perf.attempts : 0;
      
      if (perf.lastShaky) {
        weight *= 3;
      }
      
      if (accuracy < 0.5) {
        weight *= 2;
      } else if (accuracy > 0.8) {
        weight *= 0.5;
      }
      
      const hoursSinceLastAttempt = (Date.now() - perf.lastAttemptTime) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt > 24) {
        weight *= 1.5;
      }
    } else {
      weight *= 1.2;
    }

    return { card, weight };
  });

  const selected: Flashcard[] = [];
  const pool = [...weighted];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selected.push(pool[j].card);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}
