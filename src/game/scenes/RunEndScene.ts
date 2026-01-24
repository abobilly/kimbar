// RunEndScene - Results screen after dungeon run ends
// Shows accuracy by subject, missed cards, and study queue

import { Scene } from 'phaser';
import { UIButton } from '@game/ui/primitives/UIButton';
import {
    CanonicalSubject,
    getRunState,
    getAllMasteryData,
} from '@game/systems/RunState';
import { getCardsBySubject } from '@content/flashcard-loader';

// Subject colors (matching DungeonScene)
const SUBJECT_COLORS: Record<CanonicalSubject, number> = {
    'Civil Procedure': 0x3498db,
    'Constitutional Law': 0xe74c3c,
    'Contracts and Sales': 0x2ecc71,
    'Criminal Law and Procedure': 0x9b59b6,
    'Evidence': 0xf39c12,
    'Real Property': 0x1abc9c,
    'Torts': 0xe67e22,
};

interface SubjectStats {
    subject: CanonicalSubject;
    attempted: number;
    correct: number;
    accuracy: number;
    shakyCount: number;
}

export class RunEndScene extends Scene {
    private won: boolean = false;
    private subjects: CanonicalSubject[] = [];

    constructor() {
        super({ key: 'RunEndScene' });
    }

    init(data: { won?: boolean; subjects?: CanonicalSubject[] }): void {
        this.won = data.won || false;
        this.subjects = data.subjects || [];
    }

    create(): void {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0a0a15).setOrigin(0);

        // Title - based on win/loss
        const titleText = this.won
            ? '🎉 Run Complete! 🎉'
            : '💔 Run Failed';
        const titleColor = this.won ? '#4CAF50' : '#F44336';

        this.add.text(width / 2, 60, titleText, {
            fontSize: '36px',
            color: titleColor,
            fontFamily: 'Georgia, serif',
        }).setOrigin(0.5);

        // Run summary
        const runState = getRunState();
        if (runState) {
            this.add.text(width / 2, 110,
                `Final Score: ${runState.gold} gold · Best Streak: ${runState.streak} · Encounters: ${runState.encountersCompleted}`, {
                fontSize: '16px',
                color: '#CCCCCC',
            }).setOrigin(0.5);
        }

        // Subject breakdown
        this.createSubjectBreakdown();

        // Missed cards review (if any)
        this.createMissedCardsSection();

        // Action buttons
        this.createActionButtons();
    }

    private createSubjectBreakdown(): void {
        const { width } = this.scale;
        const startY = 160;
        const rowHeight = 40;

        this.add.text(width / 2, startY - 20, 'Subject Performance', {
            fontSize: '18px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const masteryData = getAllMasteryData();
        const stats: SubjectStats[] = [];

        // Calculate stats per subject
        this.subjects.forEach(subject => {
            const cards = getCardsBySubject(subject);
            let attempted = 0;
            let correct = 0;
            let shakyCount = 0;

            cards.forEach(card => {
                const data = masteryData[card.id];
                if (data && data.attempts > 0) {
                    attempted += data.attempts;
                    correct += data.correct;
                    shakyCount += data.shakyCount || 0;
                }
            });

            const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
            stats.push({ subject, attempted, correct, accuracy, shakyCount });
        });

        // Sort by accuracy (worst first for study focus)
        stats.sort((a, b) => a.accuracy - b.accuracy);

        // Display stats
        stats.forEach((stat, index) => {
            const y = startY + 20 + index * rowHeight;
            const color = SUBJECT_COLORS[stat.subject];

            // Subject name
            this.add.text(100, y, stat.subject, {
                fontSize: '14px',
                color: '#FFFFFF',
            }).setOrigin(0, 0.5);

            // Accuracy bar
            const barWidth = 200;
            const barHeight = 20;
            const barX = width / 2;

            // Background
            this.add.rectangle(barX, y, barWidth, barHeight, 0x333333).setOrigin(0.5);

            // Fill
            const fillWidth = (stat.accuracy / 100) * barWidth;
            if (fillWidth > 0) {
                this.add.rectangle(barX - (barWidth - fillWidth) / 2, y, fillWidth, barHeight, color)
                    .setOrigin(0.5);
            }

            // Accuracy text
            this.add.text(barX, y, `${stat.accuracy}%`, {
                fontSize: '12px',
                color: '#FFFFFF',
                fontStyle: 'bold',
            }).setOrigin(0.5);

            // Stats text
            this.add.text(width - 100, y,
                `${stat.correct}/${stat.attempted}${stat.shakyCount > 0 ? ` (${stat.shakyCount} shaky)` : ''}`, {
                fontSize: '12px',
                color: '#888888',
            }).setOrigin(1, 0.5);
        });
    }

    private createMissedCardsSection(): void {
        const { width, height } = this.scale;
        const startY = height - 200;

        const masteryData = getAllMasteryData();

        // Find cards marked as shaky or with low accuracy
        const weakCards: { id: string; subject: string }[] = [];

        Object.entries(masteryData).forEach(([cardId, cardData]) => {
            if (cardData.shakyCount > 0 || (cardData.attempts > 0 && cardData.correct / cardData.attempts < 0.5)) {
                // Find the subject for this card
                for (const subject of this.subjects) {
                    const cards = getCardsBySubject(subject);
                    if (cards.find(c => c.id === cardId)) {
                        weakCards.push({ id: cardId, subject });
                        break;
                    }
                }
            }
        });

        if (weakCards.length === 0) {
            this.add.text(width / 2, startY, '✨ No cards need review!', {
                fontSize: '16px',
                color: '#4CAF50',
            }).setOrigin(0.5);
        } else {
            this.add.text(width / 2, startY - 20, `📚 ${weakCards.length} cards to review`, {
                fontSize: '16px',
                color: '#FFD700',
            }).setOrigin(0.5);

            // Show first few weak cards
            const displayCards = weakCards.slice(0, 3);
            displayCards.forEach((card, index) => {
                this.add.text(width / 2, startY + 10 + index * 20,
                    `• ${card.subject}: ${card.id.substring(0, 20)}...`, {
                    fontSize: '12px',
                    color: '#AAAAAA',
                }).setOrigin(0.5);
            });

            if (weakCards.length > 3) {
                this.add.text(width / 2, startY + 70,
                    `... and ${weakCards.length - 3} more`, {
                    fontSize: '12px',
                    color: '#666666',
                }).setOrigin(0.5);
            }
        }
    }

    private createActionButtons(): void {
        const { width, height } = this.scale;
        const buttonY = height - 60;

        // Try Again button
        const tryAgainBtn = new UIButton(this, {
            x: width / 2 - 120,
            y: buttonY,
            width: 160,
            height: 44,
            text: '🔄 Try Again',
            fontSize: 'md',
            onClick: () => this.scene.start('SubjectSelectScene')
        });
        this.add.existing(tryAgainBtn);

        // Main Menu button
        const menuBtn = new UIButton(this, {
            x: width / 2 + 120,
            y: buttonY,
            width: 160,
            height: 44,
            text: '🏠 Main Menu',
            fontSize: 'md',
            onClick: () => this.scene.start('MainMenu')
        });
        this.add.existing(menuBtn);
    }
}
