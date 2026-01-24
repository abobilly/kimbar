// SubjectSelectScene - Subject selection before dungeon run
// Players toggle subjects to include in the run

import { Scene } from 'phaser';
import { UIButton } from '@game/ui/primitives/UIButton';
import { CANONICAL_SUBJECTS, CanonicalSubject, startNewRun } from '@game/systems/RunState';
import { setSelectedSubjects, getCardsBySubject } from '@content/flashcard-loader';

interface SubjectToggle {
    subject: CanonicalSubject;
    enabled: boolean;
    button: UIButton;
    countText: Phaser.GameObjects.Text;
}

export class SubjectSelectScene extends Scene {
    private toggles: SubjectToggle[] = [];
    private startButton: UIButton | null = null;
    private totalCardsText: Phaser.GameObjects.Text | null = null;

    constructor() {
        super({ key: 'SubjectSelectScene' });
    }

    create(): void {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0a0a15)
            .setOrigin(0);

        // Title
        this.add.text(width / 2, 60, 'Select Subjects', {
            fontSize: '32px',
            color: '#FFD700',
            fontFamily: 'Georgia, serif'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 100, 'Toggle subjects to include in your run', {
            fontSize: '16px',
            color: '#888888',
        }).setOrigin(0.5);

        // Subject toggles grid
        this.createSubjectToggles();

        // Total cards display
        this.totalCardsText = this.add.text(width / 2, height - 140, '', {
            fontSize: '18px',
            color: '#CCCCCC',
        }).setOrigin(0.5);

        // Start Run button
        this.startButton = new UIButton(this, {
            x: width / 2,
            y: height - 80,
            width: 200,
            height: 50,
            text: 'Start Run',
            fontSize: 'lg',
            onClick: () => this.startRun()
        });
        this.add.existing(this.startButton);

        // Back button
        const backBtn = new UIButton(this, {
            x: 80,
            y: 40,
            width: 100,
            height: 36,
            text: '← Back',
            fontSize: 'sm',
            onClick: () => this.scene.start('MainMenu')
        });
        this.add.existing(backBtn);

        // Update initial state
        this.updateTotalCards();
    }

    private createSubjectToggles(): void {
        const { width } = this.scale;
        const startY = 160;
        const rowHeight = 60;
        const colWidth = width / 2;

        CANONICAL_SUBJECTS.forEach((subject, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = colWidth * col + colWidth / 2;
            const y = startY + row * rowHeight;

            // Get card count for this subject
            const cards = getCardsBySubject(subject);
            const count = cards.length;

            // Toggle button
            const button = new UIButton(this, {
                x,
                y,
                width: 280,
                height: 44,
                text: subject,
                fontSize: 'md',
                onClick: () => this.toggleSubject(subject)
            });
            this.add.existing(button);

            // Card count text
            const countText = this.add.text(x + 100, y, `(${count})`, {
                fontSize: '12px',
                color: count > 0 ? '#4CAF50' : '#F44336',
            }).setOrigin(0, 0.5);

            const toggle: SubjectToggle = {
                subject,
                enabled: count > 0, // Enable by default if cards available
                button,
                countText
            };

            if (count === 0) {
                toggle.enabled = false;
                button.setDisabled(true);
            } else {
                // Visual feedback for enabled state
                this.updateToggleVisual(toggle);
            }

            this.toggles.push(toggle);
        });
    }

    private toggleSubject(subject: CanonicalSubject): void {
        const toggle = this.toggles.find(t => t.subject === subject);
        if (!toggle) return;

        // Check if has cards
        const cards = getCardsBySubject(subject);
        if (cards.length === 0) return;

        toggle.enabled = !toggle.enabled;
        this.updateToggleVisual(toggle);
        this.updateTotalCards();
    }

    private updateToggleVisual(toggle: SubjectToggle): void {
        // Update button visual based on enabled state
        if (toggle.enabled) {
            toggle.button.setFeedback('correct'); // Green tint for enabled
        } else {
            toggle.button.setFeedback('none'); // Normal for disabled
        }
    }

    private updateTotalCards(): void {
        const enabledSubjects = this.toggles
            .filter(t => t.enabled)
            .map(t => t.subject);

        let totalCards = 0;
        enabledSubjects.forEach(subject => {
            totalCards += getCardsBySubject(subject).length;
        });

        if (this.totalCardsText) {
            this.totalCardsText.setText(
                `${enabledSubjects.length} subjects selected · ${totalCards} cards available`
            );
        }

        // Enable/disable start button based on selection
        if (this.startButton) {
            this.startButton.setDisabled(enabledSubjects.length === 0);
        }
    }

    private startRun(): void {
        const enabledSubjects = this.toggles
            .filter(t => t.enabled)
            .map(t => t.subject);

        if (enabledSubjects.length === 0) {
            // Should not happen if button is properly disabled
            return;
        }

        // Set selected subjects in flashcard loader
        setSelectedSubjects(enabledSubjects);

        // Initialize new run state
        startNewRun(enabledSubjects);

        // Transition to dungeon scene
        this.scene.start('DungeonScene', { subjects: enabledSubjects });
    }
}
