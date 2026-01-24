// DungeonScene - Code-first dungeon hub for roguelite runs
// Players navigate to subject rooms, defeating flashcard encounters

import { Scene } from 'phaser';
import { UIButton } from '@game/ui/primitives/UIButton';
import { UIPanel } from '@game/ui/primitives/UIPanel';
import { uiTheme } from '@game/ui/uiTheme';
import {
    CanonicalSubject,
    CANONICAL_SUBJECTS,
    getRunState,
    markRoomCleared,
    isRoomCleared,
    addBoon,
    AVAILABLE_BOONS,
    getAllMasteryData
} from '@game/systems/RunState';
import { getCardsBySubject, getWeightedRandomCards } from '@content/flashcard-loader';
import { EncounterSystem, EncounterResult } from '@game/systems/EncounterSystem';

// Room data structure
interface DungeonRoom {
    id: string;
    subject: CanonicalSubject;
    x: number;
    y: number;
    cleared: boolean;
    cardCount: number;
}

// Subject room colors for visual coding
const SUBJECT_COLORS: Record<CanonicalSubject, number> = {
    'Civil Procedure': 0x3498db,      // Blue
    'Constitutional Law': 0xe74c3c,   // Red
    'Contracts and Sales': 0x2ecc71,  // Green
    'Criminal Law and Procedure': 0x9b59b6, // Purple
    'Evidence': 0xf39c12,             // Orange
    'Real Property': 0x1abc9c,        // Teal
    'Torts': 0xe67e22,                // Dark Orange
};

// Subject abbreviations for buttons
const SUBJECT_ABBREV: Record<CanonicalSubject, string> = {
    'Civil Procedure': 'CivPro',
    'Constitutional Law': 'ConLaw',
    'Contracts and Sales': 'Contracts',
    'Criminal Law and Procedure': 'CrimLaw',
    'Evidence': 'Evidence',
    'Real Property': 'Property',
    'Torts': 'Torts',
};

export class DungeonScene extends Scene {
    private rooms: DungeonRoom[] = [];
    private selectedSubjects: CanonicalSubject[] = [];
    private encounter: EncounterSystem | null = null;
    private hudContainer: Phaser.GameObjects.Container | null = null;
    private kimSprite: Phaser.GameObjects.Sprite | null = null;

    constructor() {
        super({ key: 'DungeonScene' });
    }

    init(data: { subjects?: CanonicalSubject[] }): void {
        this.selectedSubjects = data.subjects || [...CANONICAL_SUBJECTS];
        this.rooms = [];
    }

    create(): void {
        const { width, height } = this.scale;

        // Background - dark dungeon color
        this.add.rectangle(0, 0, width, height, 0x0a0a15).setOrigin(0);

        // Create HUD (HP, gold, streak)
        this.createHUD();

        // Create dungeon layout
        this.createDungeonLayout();

        // Create encounter system
        this.encounter = new EncounterSystem(this);

        // Add Kim sprite in center (if available)
        this.createKimSprite();

        // Instructions
        this.add.text(width / 2, height - 40, 'Click a room to begin a flashcard encounter', {
            fontSize: '14px',
            color: '#666666',
        }).setOrigin(0.5);
    }

    private createHUD(): void {
        const { width } = this.scale;

        this.hudContainer = this.add.container(0, 0);

        // Background bar
        const hudBg = this.add.rectangle(width / 2, 30, width, 60, 0x1a1a2e, 0.9);
        this.hudContainer.add(hudBg);

        const runState = getRunState();
        const hp = runState?.hp || 100;
        const maxHp = runState?.maxHp || 100;
        const gold = runState?.gold || 0;
        const streak = runState?.streak || 0;

        // HP display
        const hpLabel = this.add.text(20, 30, `❤️ ${hp}/${maxHp}`, {
            fontSize: '18px',
            color: '#FF6B6B',
        }).setOrigin(0, 0.5);
        hpLabel.setName('hud_hp');
        this.hudContainer.add(hpLabel);

        // HP bar
        const hpBarBg = this.add.rectangle(150, 30, 100, 16, 0x333333);
        const hpBarFill = this.add.rectangle(150, 30, 100 * (hp / maxHp), 16, 0xFF6B6B).setOrigin(0.5);
        hpBarFill.setName('hud_hpbar');
        this.hudContainer.add([hpBarBg, hpBarFill]);

        // Gold display
        const goldLabel = this.add.text(280, 30, `💰 ${gold}`, {
            fontSize: '18px',
            color: '#FFD700',
        }).setOrigin(0, 0.5);
        goldLabel.setName('hud_gold');
        this.hudContainer.add(goldLabel);

        // Streak display
        const streakLabel = this.add.text(380, 30, `🔥 ${streak}`, {
            fontSize: '18px',
            color: '#FF9500',
        }).setOrigin(0, 0.5);
        streakLabel.setName('hud_streak');
        this.hudContainer.add(streakLabel);

        // Room progress
        const clearedCount = this.selectedSubjects.filter(s => isRoomCleared(s)).length;
        const progressLabel = this.add.text(width - 20, 30,
            `Rooms: ${clearedCount}/${this.selectedSubjects.length}`, {
            fontSize: '16px',
            color: '#AAAAAA',
        }).setOrigin(1, 0.5);
        progressLabel.setName('hud_progress');
        this.hudContainer.add(progressLabel);

        // Quit button
        const quitBtn = new UIButton(this, {
            x: width - 80,
            y: 30,
            width: 80,
            height: 30,
            text: 'Quit Run',
            fontSize: 'sm',
            onClick: () => this.quitRun()
        });
        this.hudContainer.add(quitBtn);

        // Set HUD to top depth
        this.hudContainer.setDepth(100);
    }

    private updateHUD(): void {
        if (!this.hudContainer) return;

        const runState = getRunState();
        if (!runState) return;

        // Update HP
        const hpLabel = this.hudContainer.getByName('hud_hp') as Phaser.GameObjects.Text;
        if (hpLabel) {
            hpLabel.setText(`❤️ ${runState.hp}/${runState.maxHp}`);
        }

        const hpBarFill = this.hudContainer.getByName('hud_hpbar') as Phaser.GameObjects.Rectangle;
        if (hpBarFill) {
            hpBarFill.width = 100 * (runState.hp / runState.maxHp);
        }

        // Update gold
        const goldLabel = this.hudContainer.getByName('hud_gold') as Phaser.GameObjects.Text;
        if (goldLabel) {
            goldLabel.setText(`💰 ${runState.gold}`);
        }

        // Update streak
        const streakLabel = this.hudContainer.getByName('hud_streak') as Phaser.GameObjects.Text;
        if (streakLabel) {
            streakLabel.setText(`🔥 ${runState.streak}`);
        }

        // Update room progress
        const clearedCount = this.selectedSubjects.filter(s => isRoomCleared(s)).length;
        const progressLabel = this.hudContainer.getByName('hud_progress') as Phaser.GameObjects.Text;
        if (progressLabel) {
            progressLabel.setText(`Rooms: ${clearedCount}/${this.selectedSubjects.length}`);
        }
    }

    private createDungeonLayout(): void {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;

        // Create room nodes in a circle around center
        const roomCount = this.selectedSubjects.length;
        const angleStep = (Math.PI * 2) / roomCount;

        this.selectedSubjects.forEach((subject, index) => {
            const angle = angleStep * index - Math.PI / 2; // Start from top
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const cards = getCardsBySubject(subject);
            const room: DungeonRoom = {
                id: `room_${index}`,
                subject,
                x,
                y,
                cleared: isRoomCleared(subject),
                cardCount: cards.length,
            };
            this.rooms.push(room);

            this.createRoomNode(room);
        });

        // Draw connecting lines from center to each room
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x333333, 0.5);
        this.rooms.forEach(room => {
            graphics.lineBetween(centerX, centerY, room.x, room.y);
        });
    }

    private createRoomNode(room: DungeonRoom): void {
        const color = SUBJECT_COLORS[room.subject];
        const abbrev = SUBJECT_ABBREV[room.subject];

        // Room background circle
        const circle = this.add.circle(room.x, room.y, 50, color, room.cleared ? 0.4 : 1);

        if (room.cleared) {
            // Cleared room - show checkmark
            this.add.text(room.x, room.y - 10, '✓', {
                fontSize: '28px',
                color: '#4CAF50',
            }).setOrigin(0.5);

            this.add.text(room.x, room.y + 15, abbrev, {
                fontSize: '12px',
                color: '#888888',
            }).setOrigin(0.5);
        } else {
            // Active room - clickable
            circle.setInteractive({ useHandCursor: true });
            circle.on('pointerdown', () => this.enterRoom(room));
            circle.on('pointerover', () => circle.setFillStyle(color, 0.8));
            circle.on('pointerout', () => circle.setFillStyle(color, 1));

            // Subject label
            this.add.text(room.x, room.y - 5, abbrev, {
                fontSize: '14px',
                color: '#FFFFFF',
                fontStyle: 'bold',
            }).setOrigin(0.5);

            // Card count
            this.add.text(room.x, room.y + 15, `${room.cardCount} cards`, {
                fontSize: '11px',
                color: '#CCCCCC',
            }).setOrigin(0.5);
        }
    }

    private createKimSprite(): void {
        const { width, height } = this.scale;

        // Try to load Kim sprite, or use placeholder
        if (this.textures.exists('kim')) {
            this.kimSprite = this.add.sprite(width / 2, height / 2, 'kim');
            this.kimSprite.setScale(2);
        } else {
            // Placeholder - colored circle with "K"
            this.add.circle(width / 2, height / 2, 30, 0xFFD700);
            this.add.text(width / 2, height / 2, 'K', {
                fontSize: '24px',
                color: '#000000',
                fontStyle: 'bold',
            }).setOrigin(0.5);
        }
    }

    private enterRoom(room: DungeonRoom): void {
        if (room.cleared || !this.encounter) return;

        // Get cards for this subject
        const masteryData = getAllMasteryData();
        const cards = getWeightedRandomCards(room.subject, 10, masteryData);

        if (cards.length === 0) {
            // No cards available - auto clear
            markRoomCleared(room.subject);
            this.refreshScene();
            return;
        }

        // Start encounter with these cards
        this.encounter.startWithCards(
            cards,
            (result: EncounterResult) => this.onEncounterComplete(room, result)
        );
    }

    private onEncounterComplete(room: DungeonRoom, result: EncounterResult): void {
        // Update HUD
        this.updateHUD();

        // Check for run end (HP depleted)
        const runState = getRunState();
        if (!runState || runState.hp <= 0) {
            this.endRun(false);
            return;
        }

        // Mark room as cleared if won
        if (result.won) {
            markRoomCleared(room.subject);
            room.cleared = true;

            // Check if all rooms cleared
            const allCleared = this.selectedSubjects.every(s => isRoomCleared(s));
            if (allCleared) {
                this.endRun(true);
                return;
            }

            // Show boon selection
            this.showBoonSelection();
        } else {
            // Failed room - can retry
            this.refreshScene();
        }
    }

    private showBoonSelection(): void {
        const { width, height } = this.scale;

        // Overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive();
        overlay.setDepth(200);

        // Panel
        const panel = new UIPanel(this, {
            x: width / 2,
            y: height / 2,
            width: 400,
            height: 350,
            fillColor: uiTheme.colors.panelBg,
            fillAlpha: 0.95,
            strokeColor: 0xFFD700,
            strokeWidth: 2,
        });
        panel.setDepth(201);

        // Title
        const title = this.add.text(width / 2, height / 2 - 130, 'Choose a Boon', {
            fontSize: '24px',
            color: '#FFD700',
            fontFamily: 'Georgia, serif',
        }).setOrigin(0.5);
        title.setDepth(202);

        // Random selection of 3 boons
        const shuffledBoons = [...AVAILABLE_BOONS].sort(() => Math.random() - 0.5);
        const choices = shuffledBoons.slice(0, 3);

        // Boon buttons
        choices.forEach((boon, index) => {
            const y = height / 2 - 50 + index * 70;

            const btn = new UIButton(this, {
                x: width / 2,
                y,
                width: 320,
                height: 55,
                text: `${boon.name}\n${boon.description}`,
                fontSize: 'sm',
                onClick: () => {
                    addBoon(boon);
                    overlay.destroy();
                    panel.destroy();
                    title.destroy();
                    this.refreshScene();
                }
            });
            btn.setDepth(202);
        });
    }

    private refreshScene(): void {
        // Restart scene with current state
        this.scene.restart({ subjects: this.selectedSubjects });
    }

    private quitRun(): void {
        // Return to subject select without saving
        this.scene.start('SubjectSelectScene');
    }

    private endRun(won: boolean): void {
        // Transition to run end scene
        this.scene.start('RunEndScene', {
            won,
            subjects: this.selectedSubjects,
        });
    }
}
