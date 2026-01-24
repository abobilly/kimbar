export interface FlashcardGame {
  schemaVersion?: string;
  mode?: string;
  stem?: string;
  choices?: string[];
  answerIndex?: number;
  clozeLite?: string;
  hint?: string;
  explain?: string;
  confusables?: string[];
  remediationTargets?: string[];
}

export interface Flashcard {
  id: string;
  subject: string;
  topic?: string;
  frontPrompt?: string;
  backPlain?: string;
  clozeLite?: string;
  game: FlashcardGame;
}

export interface FlashcardDeck {
  source?: string;
  version?: string;
  totalCards: number;
  subjects: string[];
  cards: Flashcard[];
}

export interface CardPerformance {
  cardId: string;
  attempts: number;
  correct: number;
  lastShaky: boolean;
  lastAttemptTime: number;
}

export interface SubjectStats {
  total: number;
  correct: number;
  attempts: number;
}

export interface RunResults {
  seed?: string;
  completedAt: number;
  subjectStats: Record<string, SubjectStats>;
  missedCards: string[];
  shakyCards: string[];
  unlockedOutfits: string[];
}

export const CANONICAL_SUBJECTS = {
  'Civil Procedure': 'Civil Procedure',
  'Constitutional Law': 'Con Law',
  'Contracts and Sales': 'Contracts',
  'Criminal Law and Procedure': ['Criminal Law', 'Criminal Procedure'],
  'Evidence': 'Evidence',
  'Real Property': 'Real Property',
  'Torts': 'Torts',
} as const;

export type CanonicalSubject = keyof typeof CANONICAL_SUBJECTS;

export const SUBJECT_COLORS: Record<CanonicalSubject, string> = {
  'Civil Procedure': 'oklch(0.65 0.20 220)',
  'Constitutional Law': 'oklch(0.60 0.18 30)',
  'Contracts and Sales': 'oklch(0.70 0.18 140)',
  'Criminal Law and Procedure': 'oklch(0.50 0.20 350)',
  'Evidence': 'oklch(0.68 0.16 85)',
  'Real Property': 'oklch(0.55 0.15 120)',
  'Torts': 'oklch(0.62 0.22 40)',
};
