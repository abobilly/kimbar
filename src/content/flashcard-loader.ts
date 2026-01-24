// Flashcard Loader - Handles master-bar-flashcards.json schema
// Validates and normalizes flashcard data from Spark format

import { Flashcard, FlashcardGame } from './types';
import { CanonicalSubject, SUBJECT_TO_DECK_TAG, CANONICAL_SUBJECTS } from '@game/systems/RunState';

export interface FlashcardDeck {
    source?: string;
    version?: string;
    totalCards: number;
    subjects: string[];
    cards: RawFlashcard[];
}

/** Raw flashcard from master-bar-flashcards.json */
interface RawFlashcard {
    id: string;
    subject: string;
    topic?: string;
    frontPrompt?: string;
    backPlain?: string;
    clozeLite?: string;
    game?: {
        schemaVersion?: string | number;
        mode?: string;
        stem?: string;
        choices?: string[];
        answerIndex?: number;
        clozeLite?: string;
        hint?: string;
        explain?: string;
        confusables?: string[];
        remediationTargets?: string[];
    };
}

export interface DeckStats {
    totalCards: number;
    subjectCounts: Record<string, number>;
    skippedCards: number;
    skippedReasons: string[];
}

// Module-level deck storage
let loadedDeck: FlashcardDeck | null = null;
let normalizedCards: Flashcard[] = [];
let selectedSubjects: CanonicalSubject[] = [...CANONICAL_SUBJECTS];

// ============================================
// DECK LOADING
// ============================================

/**
 * Load flashcards from URL (supports JSON, NDJSON formats).
 * Validates and normalizes the data.
 */
export async function loadFlashcardDeck(url: string): Promise<DeckStats> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load flashcard deck: ${response.status}`);
    }

    const text = await response.text();

    // Detect format based on content or file extension
    if (url.endsWith('.ndjson') || text.startsWith('{') && text.includes('\n{')) {
        // NDJSON format (one JSON object per line)
        return processNdjsonData(text);
    } else {
        // Standard JSON format
        const data = JSON.parse(text);
        return processDeckData(data);
    }
}

/**
 * Process NDJSON format (kimbar cloze.ndjson format).
 */
function processNdjsonData(text: string): DeckStats {
    const stats: DeckStats = {
        totalCards: 0,
        subjectCounts: {},
        skippedCards: 0,
        skippedReasons: [],
    };

    const lines = text.trim().split('\n').filter(line => line.trim());
    const rawCards: RawFlashcard[] = [];

    for (let i = 0; i < lines.length; i++) {
        try {
            const line = lines[i].trim();
            if (!line) continue;

            const obj = JSON.parse(line) as {
                subject?: string;
                cloze?: string;
                clozeCount?: number;
                charCount?: number;
            };

            // Skip empty cloze cards
            if (!obj.cloze || obj.cloze.trim() === '') {
                stats.skippedCards++;
                stats.skippedReasons.push(`Empty cloze at line ${i + 1}`);
                continue;
            }

            // Convert to RawFlashcard format
            const raw: RawFlashcard = {
                id: `cloze_${i}_${Date.now()}`,
                subject: obj.subject || 'Unknown',
                clozeLite: obj.cloze,
            };
            rawCards.push(raw);
        } catch (err) {
            stats.skippedCards++;
            stats.skippedReasons.push(`Parse error at line ${i + 1}: ${err}`);
        }
    }

    // Process like standard deck
    loadedDeck = {
        source: 'ndjson',
        totalCards: rawCards.length,
        subjects: [],
        cards: rawCards,
    };

    return processDeckCards(rawCards, stats);
}

/**
 * Process cards array (shared between JSON and NDJSON formats).
 */
function processDeckCards(rawCards: RawFlashcard[], stats: DeckStats): DeckStats {
    normalizedCards = [];
    const subjectSet = new Set<string>();

    for (const raw of rawCards) {
        // Skip MPT cards (hardcoded exclusion per Spark spec)
        if (raw.subject === 'MPT') {
            stats.skippedCards++;
            stats.skippedReasons.push(`MPT excluded: ${raw.id}`);
            continue;
        }

        // Validate required fields
        if (!raw.id) {
            stats.skippedCards++;
            stats.skippedReasons.push('Missing id');
            continue;
        }

        // Normalize the card
        const normalized = normalizeCard(raw);
        if (normalized) {
            normalizedCards.push(normalized);
            subjectSet.add(raw.subject);
            stats.subjectCounts[raw.subject] = (stats.subjectCounts[raw.subject] || 0) + 1;
        } else {
            stats.skippedCards++;
            stats.skippedReasons.push(`Invalid card: ${raw.id}`);
        }
    }

    stats.totalCards = normalizedCards.length;
    if (loadedDeck) {
        loadedDeck.subjects = Array.from(subjectSet);
    }

    console.log(`Loaded ${stats.totalCards} flashcards (${stats.skippedCards} skipped)`);

    return stats;
}

/**
 * Process deck data from JSON (useful for drag-and-drop upload).
 */
export function processDeckData(data: unknown): DeckStats {
    const stats: DeckStats = {
        totalCards: 0,
        subjectCounts: {},
        skippedCards: 0,
        skippedReasons: [],
    };

    // Validate top-level structure
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid deck data: expected object');
    }

    const deck = data as Record<string, unknown>;

    // Handle both array format and object with 'cards' array
    let rawCards: RawFlashcard[];
    if (Array.isArray(deck)) {
        rawCards = deck as RawFlashcard[];
        loadedDeck = {
            totalCards: rawCards.length,
            subjects: [],
            cards: rawCards,
        };
    } else if (Array.isArray(deck.cards)) {
        rawCards = deck.cards as RawFlashcard[];
        loadedDeck = {
            source: deck.source as string | undefined,
            version: deck.version as string | undefined,
            totalCards: (deck.totalCards as number) || rawCards.length,
            subjects: (deck.subjects as string[]) || [],
            cards: rawCards,
        };
    } else {
        throw new Error('Invalid deck data: missing cards array');
    }

    // Use shared card processing
    return processDeckCards(rawCards, stats);
}

/**
 * Normalize a raw flashcard to internal format.
 */
function normalizeCard(raw: RawFlashcard): Flashcard | null {
    // Need at least some content
    const hasContent = raw.frontPrompt || raw.game?.stem || raw.clozeLite || raw.game?.clozeLite;
    if (!hasContent) {
        return null;
    }

    // Build game data if present
    let game: FlashcardGame | undefined;
    if (raw.game) {
        game = {
            schemaVersion: typeof raw.game.schemaVersion === 'string'
                ? parseInt(raw.game.schemaVersion)
                : raw.game.schemaVersion,
            mode: raw.game.mode as 'mcq' | 'cloze' | undefined,
            stem: raw.game.stem,
            choices: raw.game.choices,
            answerIndex: raw.game.answerIndex,
            clozeLite: raw.game.clozeLite,
            hint: raw.game.hint,
            explain: raw.game.explain,
            confusables: raw.game.confusables,
            remediationTargets: raw.game.remediationTargets,
        };
    }

    return {
        id: raw.id,
        frontPrompt: raw.frontPrompt || raw.game?.stem || '',
        subject: raw.subject,
        topic: raw.topic,
        backPlain: raw.backPlain,
        clozeLite: raw.clozeLite || raw.game?.clozeLite,
        easyContent: raw.game?.explain || raw.backPlain,
        tagsNormalized: raw.subject ? [raw.subject.toLowerCase().replace(/\s+/g, '_')] : [],
        confusableWith: raw.game?.confusables,
        game,
    };
}

// ============================================
// CARD RETRIEVAL
// ============================================

/**
 * Get all loaded flashcards.
 */
export function getLoadedCards(): Flashcard[] {
    return normalizedCards;
}

/**
 * Get cards by subject (canonical name).
 */
export function getCardsBySubject(subject: CanonicalSubject): Flashcard[] {
    const deckSubjects = SUBJECT_TO_DECK_TAG[subject];
    const subjectArray = Array.isArray(deckSubjects) ? deckSubjects : [deckSubjects];

    return normalizedCards.filter(card =>
        card.subject && subjectArray.includes(card.subject)
    );
}

/**
 * Get cards by deck subject string (raw from JSON).
 */
export function getCardsByDeckSubject(deckSubject: string): Flashcard[] {
    return normalizedCards.filter(card => card.subject === deckSubject);
}

/**
 * Get random cards from a subject.
 */
export function getRandomCardsFromSubject(subject: CanonicalSubject, count: number): Flashcard[] {
    const subjectCards = getCardsBySubject(subject);
    const shuffled = [...subjectCards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Get random cards biased toward weak/shaky cards.
 * Prioritizes cards marked as "shaky" or with low mastery.
 */
export function getWeightedRandomCards(
    subject: CanonicalSubject,
    count: number,
    masteryData?: Record<string, { attempts: number; correct: number; shakyCount: number }>
): Flashcard[] {
    const subjectCards = getCardsBySubject(subject);

    if (!masteryData || Object.keys(masteryData).length === 0) {
        // No mastery data, just return random
        return getRandomCardsFromSubject(subject, count);
    }

    // Score cards by weakness
    const scored = subjectCards.map(card => {
        const data = masteryData[card.id];
        let score = Math.random(); // Base random factor

        if (data) {
            // Boost score for shaky cards
            if (data.shakyCount > 0) score += 2;
            // Boost score for low correct rate
            if (data.attempts > 0) {
                const rate = data.correct / data.attempts;
                score += (1 - rate) * 1.5;
            }
        } else {
            // Unseen cards get a small boost
            score += 0.5;
        }

        return { card, score };
    });

    // Sort by score descending and take top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(s => s.card);
}

/**
 * Map a deck subject string to canonical subject.
 */
export function mapToCanonicalSubject(deckSubject: string): CanonicalSubject | null {
    for (const canonical of CANONICAL_SUBJECTS) {
        const tags = SUBJECT_TO_DECK_TAG[canonical];
        const tagArray = Array.isArray(tags) ? tags : [tags];
        if (tagArray.includes(deckSubject)) {
            return canonical;
        }
    }
    return null;
}

/**
 * Get deck statistics.
 */
export function getDeckInfo(): { source?: string; version?: string; totalCards: number; subjects: string[] } | null {
    if (!loadedDeck) return null;
    return {
        source: loadedDeck.source,
        version: loadedDeck.version,
        totalCards: normalizedCards.length,
        subjects: loadedDeck.subjects,
    };
}

/**
 * Check if a deck is loaded.
 */
export function isDeckLoaded(): boolean {
    return normalizedCards.length > 0;
}

/**
 * Clear loaded deck.
 */
export function clearDeck(): void {
    loadedDeck = null;
    normalizedCards = [];
}

/**
 * Set selected subjects for the current run.
 */
export function setSelectedSubjects(subjects: CanonicalSubject[]): void {
    selectedSubjects = subjects;
}

/**
 * Get selected subjects for the current run.
 */
export function getSelectedSubjects(): CanonicalSubject[] {
    return selectedSubjects;
}

/**
 * Get cards from all selected subjects combined.
 */
export function getCardsFromSelectedSubjects(): Flashcard[] {
    const allCards: Flashcard[] = [];
    for (const subject of selectedSubjects) {
        allCards.push(...getCardsBySubject(subject));
    }
    return allCards;
}
