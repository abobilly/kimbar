// RunState - Roguelite run state management
// Tracks HP, streak, boons, mastery data for dungeon runs

export interface Boon {
    id: string;
    name: string;
    description: string;
    effect: 'free-reveal' | 'max-hp' | 'reroll' | 'streak-shield';
}

export const AVAILABLE_BOONS: Boon[] = [
    { id: 'free_reveal', name: 'Cheat Sheet', description: 'One free hint per encounter', effect: 'free-reveal' },
    { id: 'max_hp_up', name: 'Energy Drink', description: '+20 Max HP', effect: 'max-hp' },
    { id: 'reroll', name: 'Second Chance', description: 'Reroll one question per room', effect: 'reroll' },
    { id: 'streak_shield', name: 'Streak Shield', description: 'Wrong answer doesn\'t reset streak once', effect: 'streak-shield' },
];

export type CanonicalSubject =
    | 'Civil Procedure'
    | 'Constitutional Law'
    | 'Contracts and Sales'
    | 'Criminal Law and Procedure'
    | 'Evidence'
    | 'Real Property'
    | 'Torts';

export const CANONICAL_SUBJECTS: CanonicalSubject[] = [
    'Civil Procedure',
    'Constitutional Law',
    'Contracts and Sales',
    'Criminal Law and Procedure',
    'Evidence',
    'Real Property',
    'Torts',
];

/** Maps canonical subject names to deck subject strings */
export const SUBJECT_TO_DECK_TAG: Record<CanonicalSubject, string | string[]> = {
    'Civil Procedure': 'Civil Procedure',
    'Constitutional Law': 'Con Law',
    'Contracts and Sales': 'Contracts',
    'Criminal Law and Procedure': ['Criminal Law', 'Criminal Procedure'],
    'Evidence': 'Evidence',
    'Real Property': 'Real Property',
    'Torts': 'Torts',
};

/** Subject-themed colors (hex) */
export const SUBJECT_COLORS: Record<CanonicalSubject, number> = {
    'Civil Procedure': 0x3498db,     // Blue
    'Constitutional Law': 0xe74c3c,  // Red
    'Contracts and Sales': 0x2ecc71, // Green
    'Criminal Law and Procedure': 0x9b59b6, // Purple
    'Evidence': 0xf39c12,            // Orange
    'Real Property': 0x1abc9c,       // Teal
    'Torts': 0xe67e22,               // Dark Orange
};

export interface SubjectStats {
    total: number;
    correct: number;
    attempts: number;
}

export interface CardResult {
    cardId: string;
    correct: boolean;
    shaky: boolean;  // "Still shaky" button pressed
    timestamp: number;
}

export interface MasteryData {
    attempts: number;
    correct: number;
    shakyCount: number;
    lastSeen: number;
}

export interface RunState {
    seed: number;
    hp: number;
    maxHp: number;
    gold: number;
    streak: number;
    boons: Boon[];
    activeSubjects: Set<CanonicalSubject>;
    roomsCleared: Set<CanonicalSubject>;
    cardResults: CardResult[];
    outfitsUnlockedThisRun: string[];
    encountersCompleted: number;
    encountersTotal: number;
}

// Singleton run state
let currentRun: RunState | null = null;

// Persistent mastery data (survives across runs)
let masteryData: Record<string, MasteryData> = {};

const MASTERY_STORAGE_KEY = 'kimbar_mastery';
const DEFAULT_HP = 100;
const ENCOUNTERS_PER_SUBJECT = 2;

// ============================================
// RUN STATE MANAGEMENT
// ============================================

export function startNewRun(activeSubjects: CanonicalSubject[], seed?: number): RunState {
    currentRun = {
        seed: seed ?? Date.now(),
        hp: DEFAULT_HP,
        maxHp: DEFAULT_HP,
        gold: 0,
        streak: 0,
        boons: [],
        activeSubjects: new Set(activeSubjects),
        roomsCleared: new Set(),
        cardResults: [],
        outfitsUnlockedThisRun: [],
        encountersCompleted: 0,
        encountersTotal: activeSubjects.length * ENCOUNTERS_PER_SUBJECT,
    };
    return currentRun;
}

export function getRunState(): RunState | null {
    return currentRun;
}

export function isRunActive(): boolean {
    return currentRun !== null && currentRun.hp > 0;
}

export function endRun(): void {
    currentRun = null;
}

// ============================================
// HP / DAMAGE
// ============================================

export function takeDamage(amount: number): number {
    if (!currentRun) return 0;
    currentRun.hp = Math.max(0, currentRun.hp - amount);
    return currentRun.hp;
}

export function heal(amount: number): number {
    if (!currentRun) return 0;
    currentRun.hp = Math.min(currentRun.maxHp, currentRun.hp + amount);
    return currentRun.hp;
}

export function increaseMaxHp(amount: number): void {
    if (!currentRun) return;
    currentRun.maxHp += amount;
    currentRun.hp += amount; // Also heal by that amount
}

// ============================================
// STREAK / GOLD
// ============================================

export function incrementStreak(): number {
    if (!currentRun) return 0;
    currentRun.streak += 1;
    return currentRun.streak;
}

export function resetStreak(): void {
    if (!currentRun) return;

    // Check for streak shield boon
    const shieldIndex = currentRun.boons.findIndex(b => b.effect === 'streak-shield');
    if (shieldIndex >= 0) {
        // Consume the shield instead of resetting
        currentRun.boons.splice(shieldIndex, 1);
        return;
    }

    currentRun.streak = 0;
}

export function addGold(amount: number): number {
    if (!currentRun) return 0;
    currentRun.gold += amount;
    return currentRun.gold;
}

// ============================================
// BOONS
// ============================================

export function addBoon(boon: Boon): void {
    if (!currentRun) return;
    currentRun.boons.push(boon);

    // Apply immediate effects
    if (boon.effect === 'max-hp') {
        increaseMaxHp(20);
    }
}

export function hasBoon(effect: Boon['effect']): boolean {
    if (!currentRun) return false;
    return currentRun.boons.some(b => b.effect === effect);
}

export function consumeBoon(effect: Boon['effect']): boolean {
    if (!currentRun) return false;
    const index = currentRun.boons.findIndex(b => b.effect === effect);
    if (index >= 0) {
        currentRun.boons.splice(index, 1);
        return true;
    }
    return false;
}

export function getRandomBoons(count: number = 3): Boon[] {
    const available = [...AVAILABLE_BOONS];
    const selected: Boon[] = [];

    for (let i = 0; i < count && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        selected.push(available.splice(idx, 1)[0]);
    }

    return selected;
}

// ============================================
// ROOM / SUBJECT TRACKING
// ============================================

export function markRoomCleared(subject: CanonicalSubject): void {
    if (!currentRun) return;
    currentRun.roomsCleared.add(subject);
}

export function isRoomCleared(subject: CanonicalSubject): boolean {
    if (!currentRun) return false;
    return currentRun.roomsCleared.has(subject);
}

export function areAllRoomsCleared(): boolean {
    if (!currentRun) return false;
    return currentRun.roomsCleared.size >= currentRun.activeSubjects.size;
}

// ============================================
// CARD RESULTS / MASTERY
// ============================================

export function recordCardResult(cardId: string, correct: boolean, shaky: boolean): void {
    if (!currentRun) return;

    currentRun.cardResults.push({
        cardId,
        correct,
        shaky,
        timestamp: Date.now(),
    });

    // Update persistent mastery
    if (!masteryData[cardId]) {
        masteryData[cardId] = { attempts: 0, correct: 0, shakyCount: 0, lastSeen: 0 };
    }
    masteryData[cardId].attempts += 1;
    if (correct) masteryData[cardId].correct += 1;
    if (shaky) masteryData[cardId].shakyCount += 1;
    masteryData[cardId].lastSeen = Date.now();

    saveMasteryData();
}

export function getRunStats(): Record<CanonicalSubject, SubjectStats> {
    const stats: Record<string, SubjectStats> = {};

    CANONICAL_SUBJECTS.forEach(subject => {
        stats[subject] = { total: 0, correct: 0, attempts: 0 };
    });

    // Would need card->subject mapping to populate this properly
    // For now, return empty stats structure
    return stats as Record<CanonicalSubject, SubjectStats>;
}

export function getMissedCards(): string[] {
    if (!currentRun) return [];
    return currentRun.cardResults
        .filter(r => !r.correct)
        .map(r => r.cardId);
}

export function getShakyCards(): string[] {
    if (!currentRun) return [];
    return currentRun.cardResults
        .filter(r => r.shaky)
        .map(r => r.cardId);
}

// ============================================
// MASTERY PERSISTENCE
// ============================================

export function loadMasteryData(): void {
    try {
        const saved = localStorage.getItem(MASTERY_STORAGE_KEY);
        if (saved) {
            masteryData = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Failed to load mastery data:', e);
        masteryData = {};
    }
}

export function saveMasteryData(): void {
    try {
        localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(masteryData));
    } catch (e) {
        console.warn('Failed to save mastery data:', e);
    }
}

export function getMasteryData(cardId: string): MasteryData | undefined {
    return masteryData[cardId];
}

export function getAllMasteryData(): Record<string, MasteryData> {
    return { ...masteryData };
}

/** Get card IDs sorted by weakness (most attempts with lowest correct rate first) */
export function getWeakCards(limit: number = 20): string[] {
    return Object.entries(masteryData)
        .filter(([, data]) => data.attempts > 0)
        .sort(([, a], [, b]) => {
            const aRate = a.correct / a.attempts;
            const bRate = b.correct / b.attempts;
            // Sort by: more shaky, lower correct rate, more recent
            if (a.shakyCount !== b.shakyCount) return b.shakyCount - a.shakyCount;
            if (aRate !== bRate) return aRate - bRate;
            return b.lastSeen - a.lastSeen;
        })
        .slice(0, limit)
        .map(([cardId]) => cardId);
}

// ============================================
// OUTFIT UNLOCKS
// ============================================

export function unlockOutfitInRun(outfitId: string): void {
    if (!currentRun) return;
    if (!currentRun.outfitsUnlockedThisRun.includes(outfitId)) {
        currentRun.outfitsUnlockedThisRun.push(outfitId);
    }
}

// ============================================
// ENCOUNTER TRACKING
// ============================================

export function incrementEncountersCompleted(): void {
    if (!currentRun) return;
    currentRun.encountersCompleted += 1;
}

// Initialize mastery data on module load
loadMasteryData();
