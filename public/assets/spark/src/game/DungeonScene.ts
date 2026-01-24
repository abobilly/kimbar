import Phaser from 'phaser';
import { CanonicalSubject, SUBJECT_COLORS } from '@/types/flashcard';

export interface DungeonConfig {
  activeSubjects: CanonicalSubject[];
  onEncounter: (subject: CanonicalSubject, encounterId: string) => void;
  onRoomComplete: (subject: CanonicalSubject) => void;
  onExitReached: () => void;
  encounterCounts: Record<CanonicalSubject, number>;
}

interface Room {
  subject: CanonicalSubject;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  encounters: Phaser.GameObjects.Rectangle[];
  encounterIds: string[];
  defeated: Set<string>;
}

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  private rooms: Room[] = [];
  private walls: Phaser.GameObjects.Rectangle[] = [];
  private config!: DungeonConfig;
  private exitSprite?: Phaser.GameObjects.Rectangle;
  private exitUnlocked = false;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  init(data: DungeonConfig) {
    this.config = data;
    this.exitUnlocked = false;
  }

  create() {
    this.createHub();
    this.createSubjectRooms();
    this.createPlayer();
    this.createControls();
    
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  private createHub() {
    const hubX = 400;
    const hubY = 300;
    const hubWidth = 200;
    const hubHeight = 400;

    const hubBg = this.add.rectangle(hubX, hubY, hubWidth, hubHeight, 0x1a1a2e);
    hubBg.setOrigin(0.5);

    this.createWalls(hubX, hubY, hubWidth, hubHeight);

    this.exitSprite = this.add.rectangle(hubX, hubY - 150, 40, 40, 0x888888);
    this.exitSprite.setAlpha(0.5);
    
    const exitText = this.add.text(hubX, hubY - 180, 'EXIT', {
      fontSize: '12px',
      color: '#888888',
    });
    exitText.setOrigin(0.5);
  }

  private createSubjectRooms() {
    const subjects = this.config.activeSubjects;
    const roomPositions = this.calculateRoomPositions(subjects.length);

    subjects.forEach((subject, index) => {
      const pos = roomPositions[index];
      this.createRoom(subject, pos.x, pos.y);
    });
  }

  private calculateRoomPositions(count: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const hubX = 400;
    const hubY = 300;
    const distance = 350;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: hubX + Math.cos(angle) * distance,
        y: hubY + Math.sin(angle) * distance,
      });
    }

    return positions;
  }

  private createRoom(subject: CanonicalSubject, x: number, y: number) {
    const width = 180;
    const height = 180;
    const colorStr = SUBJECT_COLORS[subject];
    const color = this.parseOklch(colorStr);

    const bg = this.add.rectangle(x, y, width, height, color, 0.3);
    bg.setOrigin(0.5);

    const border = this.add.rectangle(x, y, width + 4, height + 4);
    border.setOrigin(0.5);
    border.setStrokeStyle(3, color);
    border.setFillStyle(0x000000, 0);

    const label = this.add.text(x, y - height / 2 - 20, subject, {
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width },
    });
    label.setOrigin(0.5);

    const encounterCount = this.config.encounterCounts[subject] || 2;
    const encounters: Phaser.GameObjects.Rectangle[] = [];
    const encounterIds: string[] = [];

    for (let i = 0; i < encounterCount; i++) {
      const angle = (i / encounterCount) * Math.PI * 2;
      const radius = 50;
      const encX = x + Math.cos(angle) * radius;
      const encY = y + Math.sin(angle) * radius;

      const encounter = this.add.rectangle(encX, encY, 20, 20, color);
      encounter.setStrokeStyle(2, 0xffffff);
      const encounterId = `${subject}-${i}`;
      encounter.setData('subject', subject);
      encounter.setData('id', encounterId);
      
      encounters.push(encounter);
      encounterIds.push(encounterId);

      this.tweens.add({
        targets: encounter,
        y: encY - 5,
        duration: 1000 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.rooms.push({
      subject,
      x,
      y,
      width,
      height,
      color: colorStr,
      encounters,
      encounterIds,
      defeated: new Set(),
    });

    this.createWalls(x, y, width, height);
  }

  private createWalls(centerX: number, centerY: number, width: number, height: number) {
    const wallThickness = 10;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const top = this.add.rectangle(centerX, centerY - halfHeight - wallThickness / 2, width + wallThickness * 2, wallThickness, 0x000000, 0);
    const bottom = this.add.rectangle(centerX, centerY + halfHeight + wallThickness / 2, width + wallThickness * 2, wallThickness, 0x000000, 0);
    const left = this.add.rectangle(centerX - halfWidth - wallThickness / 2, centerY, wallThickness, height, 0x000000, 0);
    const right = this.add.rectangle(centerX + halfWidth + wallThickness / 2, centerY, wallThickness, height, 0x000000, 0);

    this.walls.push(top, bottom, left, right);
  }

  private createPlayer() {
    this.player = this.add.rectangle(400, 300, 24, 24, 0xff1493);
    this.player.setStrokeStyle(2, 0xffffff);
  }

  private createControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update() {
    const speed = 3;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += speed;

    if (dx !== 0 || dy !== 0) {
      const newX = this.player.x + dx;
      const newY = this.player.y + dy;

      if (!this.checkWallCollision(newX, newY)) {
        this.player.x = newX;
        this.player.y = newY;
      }
    }

    this.checkEncounterCollisions();
    this.checkExitCollision();
  }

  private checkWallCollision(x: number, y: number): boolean {
    const playerBounds = new Phaser.Geom.Rectangle(x - 12, y - 12, 24, 24);

    for (const wall of this.walls) {
      const wallBounds = wall.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, wallBounds)) {
        return true;
      }
    }

    return false;
  }

  private checkEncounterCollisions() {
    if (!this.rooms || !Array.isArray(this.rooms)) return;
    
    for (const room of this.rooms) {
      if (!room || !room.encounters || !Array.isArray(room.encounters)) continue;
      if (!room.encounterIds || !Array.isArray(room.encounterIds)) continue;
      
      for (let i = 0; i < room.encounters.length; i++) {
        const encounter = room.encounters[i];
        const encounterId = room.encounterIds[i];

        if (!encounter || !encounterId) continue;
        if (room.defeated && room.defeated.has(encounterId)) continue;

        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          encounter.x,
          encounter.y
        );

        if (distance < 25) {
          if (room.defeated) {
            room.defeated.add(encounterId);
          }
          this.config.onEncounter(room.subject, encounterId);
          
          this.tweens.add({
            targets: encounter,
            alpha: 0,
            scale: 0,
            duration: 300,
            onComplete: () => {
              encounter.destroy();
            },
          });

          if (room.defeated && room.encounters && room.defeated.size === room.encounters.length) {
            this.config.onRoomComplete(room.subject);
            this.checkAllRoomsComplete();
          }

          break;
        }
      }
    }
  }

  private checkExitCollision() {
    if (!this.exitUnlocked || !this.exitSprite) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.exitSprite.x,
      this.exitSprite.y
    );

    if (distance < 30) {
      this.config.onExitReached();
    }
  }

  private checkAllRoomsComplete() {
    if (!this.rooms || !Array.isArray(this.rooms)) return;
    
    const allComplete = this.rooms.every(room => 
      room && 
      room.encounters && 
      Array.isArray(room.encounters) && 
      room.defeated && 
      room.defeated.size === room.encounters.length
    );

    if (allComplete && !this.exitUnlocked) {
      this.exitUnlocked = true;
      if (this.exitSprite) {
        this.exitSprite.setFillStyle(0x00ff00);
        this.exitSprite.setAlpha(1);
        
        this.tweens.add({
          targets: this.exitSprite,
          scale: 1.2,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  private parseOklch(oklchStr: string): number {
    const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/);
    if (!match) return 0xffffff;

    const l = parseFloat(match[1]);
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);

    const r = Math.max(0, Math.min(255, Math.round(l * 255)));
    const g = Math.max(0, Math.min(255, Math.round((l + c * 0.3) * 255)));
    const b = Math.max(0, Math.min(255, Math.round((l - c * 0.3) * 255)));

    return (r << 16) | (g << 8) | b;
  }

  public clearEncounter(subject: CanonicalSubject, encounterId: string) {
    const room = this.rooms.find(r => r.subject === subject);
    if (room) {
      room.defeated.add(encounterId);
      
      if (room.defeated.size === room.encounters.length) {
        this.checkAllRoomsComplete();
      }
    }
  }
}
