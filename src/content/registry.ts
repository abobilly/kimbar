// Content Registry Loader
import { GameState, DEFAULT_GAME_STATE, Flashcard, Outfit } from './types';

export interface SpriteEntry {
  url: string;
  portraitUrl?: string;
  frameWidth?: number;
  frameHeight?: number;
  kind?: 'spritesheet' | 'image' | 'atlas';
  // Legacy fields for backwards compat
  atlas?: string;
  key?: string;
}

export interface Registry {
  tileSize: number;
  scale: number;
  buildId?: string;  // Cache-busting identifier (commit SHA or timestamp)
  entities: Record<string, { required: string[]; optional?: string[] }>;
  outfits: Record<string, Outfit>;
  deckTags: string[];
  sprites: Record<string, SpriteEntry>;
  characters?: Array<{ id: string; name: string; spriteKey: string }>;
}

let registry: Registry | null = null;
let flashcards: Flashcard[] = [];
let gameState: GameState = { ...DEFAULT_GAME_STATE };

export async function loadRegistry(): Promise<Registry> {
  if (registry) return registry;
  
  const response = await fetch('/generated/registry.json');
  registry = await response.json();
  return registry!;
}

export async function loadFlashcards(): Promise<Flashcard[]> {
  if (flashcards.length > 0) return flashcards;
  
  try {
    const response = await fetch('/content/cards/flashcards.json');
    const data = await response.json();
    // Handle both array format and object with 'cards' array
    flashcards = Array.isArray(data) ? data : (data.cards || []);
    console.log(`Loaded ${flashcards.length} flashcards`);
  } catch (e) {
    console.warn('No flashcards.json found, using sample cards');
    flashcards = getSampleCards();
  }
  return flashcards;
}

export function getRegistry(): Registry {
  if (!registry) throw new Error('Registry not loaded');
  return registry;
}

export function getFlashcards(): Flashcard[] {
  return flashcards;
}

export function getCardsByTag(tag: string): Flashcard[] {
  return flashcards.filter(card => 
    card.tagsNormalized?.includes(tag) || 
    card.tagsNormalized?.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

export function getRandomCards(tag: string, count: number): Flashcard[] {
  const tagCards = getCardsByTag(tag);
  if (tagCards.length === 0) {
    // Fallback to any cards if tag not found
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  const shuffled = [...tagCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getGameState(): GameState {
  return gameState;
}

export function updateGameState(updates: Partial<GameState>): void {
  gameState = { ...gameState, ...updates };
  saveGameState();
}

export function saveGameState(): void {
  localStorage.setItem('kimbar_save', JSON.stringify(gameState));
}

export function loadGameState(): GameState {
  const saved = localStorage.getItem('kimbar_save');
  if (saved) {
    gameState = { ...DEFAULT_GAME_STATE, ...JSON.parse(saved) };
  }
  return gameState;
}

export function resetGameState(): void {
  gameState = { ...DEFAULT_GAME_STATE };
  localStorage.removeItem('kimbar_save');
}

function getSampleCards(): Flashcard[] {
  return [
    {
      id: 'sample_1',
      frontPrompt: 'What is hearsay?',
      cloze: 'An out-of-court statement offered to prove the {{truth of the matter asserted}}',
      easyContent: 'Hearsay = someone said something outside court, and you want to use it to prove that thing is true.',
      mediumContent: 'Hearsay is an out-of-court statement offered for the truth of the matter asserted. It is generally inadmissible unless an exception applies.',
      hardContent: 'Under FRE 801(c), hearsay is a statement that (1) the declarant does not make while testifying at the current trial or hearing; and (2) a party offers in evidence to prove the truth of the matter asserted in the statement.',
      tagsNormalized: ['evidence'],
      difficulty: 1,
      priority: 1,
      mnemonic: 'TOMA - Truth Of the Matter Asserted',
      confusableWith: ['present sense impression', 'excited utterance']
    },
    {
      id: 'sample_2', 
      frontPrompt: 'What are the elements of negligence?',
      cloze: 'Duty, {{Breach}}, Causation (actual and proximate), and Damages',
      easyContent: 'Did they owe you a duty? Did they break it? Did that cause your harm?',
      mediumContent: 'Negligence requires: (1) Duty of care, (2) Breach of that duty, (3) Actual causation (but-for), (4) Proximate causation (foreseeability), (5) Damages.',
      hardContent: 'A prima facie case for negligence requires the plaintiff to establish that the defendant owed a duty of care to the plaintiff, the defendant breached that duty by failing to conform to the required standard of conduct, the defendant\'s negligent conduct was the actual cause (cause-in-fact) of the plaintiff\'s injury, the defendant\'s negligent conduct was the proximate cause of the injury, and the plaintiff suffered actual damages.',
      tagsNormalized: ['torts'],
      difficulty: 1,
      priority: 1,
      mnemonic: 'Dumb Babies Cry A Lot - Duty, Breach, Causation, Actual, Legal (proximate)',
      confusableWith: ['strict liability', 'intentional torts']
    },
    {
      id: 'sample_3',
      frontPrompt: 'What is personal jurisdiction?',
      cloze: 'A court\'s power over the {{parties}} to the litigation',
      easyContent: 'Can this court make YOU follow its rules?',
      mediumContent: 'Personal jurisdiction is the court\'s authority over the defendant. It requires minimum contacts with the forum state such that exercising jurisdiction does not offend traditional notions of fair play and substantial justice.',
      hardContent: 'Under International Shoe and its progeny, personal jurisdiction requires that the defendant have minimum contacts with the forum state such that maintenance of the suit does not offend traditional notions of fair play and substantial justice. Contacts may be general (continuous and systematic) or specific (arising from or related to the defendant\'s forum contacts).',
      tagsNormalized: ['civil_procedure'],
      difficulty: 2,
      priority: 1,
      mnemonic: 'Minimum Contacts = Maximum Fairness',
      confusableWith: ['subject matter jurisdiction', 'venue']
    },
    {
      id: 'sample_4',
      frontPrompt: 'What is the Commerce Clause?',
      cloze: 'Congress has power to regulate commerce {{among the several states}}',
      easyContent: 'Congress can make rules about stuff crossing state lines.',
      mediumContent: 'Article I, Section 8, Clause 3 gives Congress power to regulate interstate commerce. Under modern interpretation, this includes activities that substantially affect interstate commerce.',
      hardContent: 'The Commerce Clause grants Congress power to regulate (1) channels of interstate commerce, (2) instrumentalities of interstate commerce, and (3) activities that substantially affect interstate commerce. Under United States v. Lopez, there must be a rational basis for concluding that the regulated activity substantially affects interstate commerce.',
      tagsNormalized: ['constitutional_law'],
      difficulty: 2,
      priority: 1,
      mnemonic: 'CIS - Channels, Instrumentalities, Substantial effects',
      confusableWith: ['dormant commerce clause', 'privileges and immunities']
    },
    {
      id: 'sample_5',
      frontPrompt: 'What is consideration in contract law?',
      cloze: 'A bargained-for {{exchange}} of legal value',
      easyContent: 'You give something, they give something. Deal!',
      mediumContent: 'Consideration requires (1) a bargained-for exchange (2) of legal value. Past consideration is not valid. Pre-existing duty rule: promising to do what you\'re already obligated to do is not consideration.',
      hardContent: 'Consideration is the inducement to a contract, consisting of a benefit to the promisor or a detriment to the promisee. It requires a bargained-for exchange where each party\'s promise or performance is the price for the other\'s. Nominal consideration may be insufficient. Under the Restatement, consideration is a performance or return promise that is bargained for.',
      tagsNormalized: ['contracts'],
      difficulty: 1,
      priority: 1,
      mnemonic: 'BEL - Bargained-for Exchange of Legal value',
      confusableWith: ['promissory estoppel', 'illusory promise']
    }
  ];
}
