// World Scene - Main gameplay scene
import { Scene } from 'phaser';
import { EncounterSystem } from '@game/systems/EncounterSystem';
import { DialogueSystem } from '@game/systems/DialogueSystem';
import { OutfitSystem } from '@game/systems/OutfitSystem';
import { loadRegistry, loadFlashcards, getGameState, saveGameState } from '@content/registry';
import { EntityData, LevelData, EncounterConfig } from '@content/types';

export class WorldScene extends Scene {
  // Systems
  private encounterSystem!: EncounterSystem;
  private dialogueSystem!: DialogueSystem;

  // Player
  private player!: Phaser.GameObjects.Sprite;
  private playerTarget: { x: number; y: number } | null = null;
  private moveSpeed = 200;
  private lastDirection: string = 'down';  // Track facing direction for idle
  private inEncounter: boolean = false; // Whether an encounter is active

  // Level data
  private levelData: LevelData | null = null;
  private entities: Map<string, EntityData & { sprite?: Phaser.GameObjects.Sprite }> = new Map();

  // UI
  private statsText!: Phaser.GameObjects.Text;

  // Keyboard controls
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('WorldScene');
  }

  async create(): Promise<void> {
    // Initialize systems
    this.encounterSystem = new EncounterSystem(this);
    this.dialogueSystem = new DialogueSystem(this);

    // Load game content
    await loadRegistry();
    await loadFlashcards();

    // Load story
    await this.dialogueSystem.loadStory('/content/ink/story.json');

    // Load level
    await this.loadLevel('lobby');

    // Create player
    this.createPlayer();

    // Create UI
    this.createUI();

    // Setup input
    this.setupInput();

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private async loadLevel(levelId: string): Promise<void> {
    try {
      // Try to load LDtk level data
      const response = await fetch(`/content/ldtk/${levelId}.json`);
      if (response.ok) {
        this.levelData = await response.json();
        this.renderLevel();
      } else {
        // Create a placeholder level for testing
        this.createPlaceholderLevel();
      }
    } catch (error) {
      console.warn('Level not found, creating placeholder:', error);
      this.createPlaceholderLevel();
    }
  }

  private createPlaceholderLevel(): void {
    const { width, height } = this.scale;

    // Floor
    const floor = this.add.rectangle(width / 2, height / 2, 800, 600, 0x2a2a4a);
    floor.setStrokeStyle(4, 0x4a4a6a);

    // Decorative tiles pattern
    for (let x = 0; x < 800; x += 64) {
      for (let y = 0; y < 600; y += 64) {
        const tile = this.add.rectangle(
          width / 2 - 400 + x + 32,
          height / 2 - 300 + y + 32,
          62, 62,
          (x + y) % 128 === 0 ? 0x3a3a5a : 0x2a2a4a
        );
        tile.setDepth(-1);
      }
    }

    // Courtroom banner
    this.add.text(width / 2, height / 2 - 250, '⚖️ SUPREME COURT LOBBY ⚖️', {
      fontSize: '28px',
      color: '#FFD700',
      fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    // Add test entities
    this.createTestEntities();

    // Set level data
    this.levelData = {
      width: 800,
      height: 600,
      tileSize: 32,
      entities: [],
      playerSpawn: { x: width / 2, y: height / 2 + 100 }
    };
  }

  private createTestEntities(): void {
    const { width, height } = this.scale;

    // Court Clerk NPC
    const clerkEntity: EntityData = {
      id: 'npc.clerk_01',
      type: 'NPC',
      x: width / 2 - 150,
      y: height / 2 - 50,
      properties: {
        name: 'Court Clerk',
        storyKnot: 'court_clerk_intro'
      }
    };
    this.createEntity('npc.clerk_01', clerkEntity);

    // Encounter trigger (Justice 1)
    const justiceEntity: EntityData = {
      id: 'justice1',
      type: 'EncounterTrigger',
      x: width / 2 + 150,
      y: height / 2 - 50,
      properties: {
        encounterConfig: {
          deckTag: 'evidence',
          count: 3,
          rewardId: 'court_blazer'
        }
      }
    };
    this.createEntity('justice1', justiceEntity);

    // Outfit chest
    const chestEntity: EntityData = {
      id: 'chest1',
      type: 'OutfitChest',
      x: width / 2 + 250,
      y: height / 2 + 150,
      properties: {
        outfitId: 'power_suit'
      }
    };
    this.createEntity('chest1', chestEntity);
  }

  private createEntity(id: string, entity: EntityData): void {
    // Prefer explicit characterId/sprite property to select real sprite
    const spriteKey = entity.properties?.characterId || entity.properties?.sprite || entity.id;
    if (spriteKey && this.textures.exists(spriteKey)) {
      const npc = this.add.sprite(entity.x, entity.y, spriteKey, 0)
        .setOrigin(0.5, 1)
        .setDepth(entity.y);

      // Name tag
      if (entity.properties?.name) {
        const nameTag = this.add.text(entity.x, entity.y - 70, entity.properties.name, {
          fontSize: '14px',
          color: '#FFFFFF',
          backgroundColor: '#00000088',
          padding: { x: 6, y: 2 }
        }).setOrigin(0.5).setDepth(entity.y + 1);
        void nameTag; // Used for display
      }

      // Make interactive
      npc.setInteractive({ useHandCursor: true });
      npc.on('pointerdown', () => {
        if (!this.dialogueSystem.isActive()) {
          this.handleEntityInteraction(id, entity);
        }
      });

      this.entities.set(id, { ...entity, sprite: npc });
      return;
    }
    
    // Fallback: placeholder sprite for other entities
    let color = 0xFFFFFF;
    let emoji = '❓';

    switch (entity.type) {
      case 'NPC':
        color = 0x4CAF50;
        emoji = '👤';
        break;
      case 'EncounterTrigger':
        color = 0xF44336;
        emoji = '⚔️';
        break;
      case 'OutfitChest':
        color = 0xFFD700;
        emoji = '👗';
        break;
      case 'Door':
        color = 0x8B4513;
        emoji = '🚪';
        break;
    }

    // Create placeholder sprite (circle with emoji)
    const container = this.add.container(entity.x, entity.y);
    const circle = this.add.circle(0, 0, 24, color, 0.8);
    const label = this.add.text(0, 0, emoji, { fontSize: '24px' }).setOrigin(0.5);
    container.add([circle, label]);
    container.setSize(48, 48);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(entity.y); // Y-sorting

    // Name tag for NPCs
    if (entity.type === 'NPC' && entity.properties?.name) {
      const nameTag = this.add.text(0, -40, entity.properties.name, {
        fontSize: '14px',
        color: '#FFFFFF',
        backgroundColor: '#00000088',
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5);
      container.add(nameTag);
    }

    // Interaction handler
    container.on('pointerdown', () => {
      if (!this.dialogueSystem.isActive()) {
        this.handleEntityInteraction(id, entity);
      }
    });

    this.entities.set(id, { ...entity, sprite: container as unknown as Phaser.GameObjects.Sprite });
  }

  private renderLevel(): void {
    if (!this.levelData) return;

    // Detect if the loaded level is LDtk JSON (has layerInstances)
    const raw = this.levelData as unknown as any;
    if (raw && raw.layerInstances) {
      // Convert simplified LDtk level export into internal LevelData format
      const layer = raw.layerInstances.find((l: any) => l.__identifier === 'Entities');
      const tileSize = layer?.__gridSize || 32;

      const level: LevelData = {
        id: raw.identifier || 'level',
        width: raw.pxWid || (layer?.__cWid * tileSize) || this.scale.width,
        height: raw.pxHei || (layer?.__cHei * tileSize) || this.scale.height,
        tileSize,
        entities: [],
        playerSpawn: undefined
      };

      const triggersToCreate: Array<any> = [];

      for (const inst of layer.entityInstances) {
        const props: Record<string, any> = {};
        for (const f of inst.fieldInstances || []) {
          props[f.__identifier] = f.__value;
        }

        // Normalize property names expected by the game
        if (props.inkKnot && !props.storyKnot) {
          props.storyKnot = props.inkKnot;
        }
        if (props.knot && !props.storyKnot) {
          props.storyKnot = props.knot;
        }

        const entity: EntityData = {
          id: inst.iid || `${inst.__identifier}_${inst.defUid}`,
          type: inst.__identifier,
          x: inst.__worldX || (inst.px ? inst.px[0] + tileSize / 2 : 0),
          y: inst.__worldY || (inst.px ? inst.px[1] + tileSize : 0),
          properties: props
        };

        if (inst.__identifier === 'PlayerSpawn') {
          level.playerSpawn = { x: entity.x, y: entity.y };
        } else {
          level.entities.push(entity);

          // Collect encounter triggers to create later (after player exists)
          if (inst.__identifier === 'EncounterTrigger') {
            triggersToCreate.push({ entity, tileSize });
          }
        }
      }

      // Replace levelData with converted format
      this.levelData = level;

      // Clean up any existing entities
      this.entities.forEach((e) => {
        if (e.sprite) e.sprite.destroy();
      });
      this.entities.clear();

      // Create entities
      for (const entity of level.entities) {
        this.createEntity(entity.id, entity);
      }

      // Create player AFTER entities so overlap checks can be set up
      this.createPlayer();

      // Create overlap triggers (after player exists)
      for (const t of triggersToCreate) {
        const e = t.entity as EntityData;
        const centerX = e.x; // __worldX is centered horizontally
        const centerY = (e.y - (t.tileSize / 2)); // convert bottom-based y to center y

        const zone = this.add.zone(centerX, centerY, t.tileSize, t.tileSize).setOrigin(0.5);
        this.physics.add.existing(zone);
        const body = zone.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);

        // Debug visual (only in dev)
        if (import.meta.env.DEV) {
          const debugRect = this.add.rectangle(centerX, centerY, t.tileSize, t.tileSize, 0x00ff00, 0.2);
          debugRect.setDepth(900);
        }

        this.physics.add.overlap(this.player, zone, () => {
          if (this.dialogueSystem.isActive() || this.inEncounter) return;

          const cfg: EncounterConfig = {
            deckTag: e.properties.deckTag || 'evidence',
            count: e.properties.count ?? 1,
            rewardId: e.properties.rewardId
          };

          this.startEncounter(cfg);

          const once = e.properties.once === true || e.properties.once === 'true';
          if (once) zone.destroy();
        }, undefined, this);
      }

      // Done rendering LDtk level
      return;
    }

    // Fallback: legacy placeholder
    this.createPlaceholderLevel();
  }

  private createPlayer(): void {
    const spawn = this.levelData?.playerSpawn || { x: this.scale.width / 2, y: this.scale.height / 2 };

    // Create physics sprite with real texture (fallback to placeholder if missing)
    if (this.textures.exists('char.kim')) {
      const player = this.physics.add.sprite(spawn.x, spawn.y, 'char.kim', 0);
      player.setOrigin(0.5, 1);  // Feet anchored
      player.setDepth(spawn.y);
      player.setCollideWorldBounds(true);
      
      // Tweak hitbox for LPC sprite
      const body = player.body as Phaser.Physics.Arcade.Body;
      body.setSize(24, 18);
      body.setOffset(20, 46);
      
      this.player = player;
    } else {
      // Fallback placeholder if sprite not loaded
      console.warn('char.kim sprite not loaded, using placeholder');
      const container = this.add.container(spawn.x, spawn.y);
      const body = this.add.circle(0, 0, 20, 0xFF69B4);
      const head = this.add.circle(0, -25, 12, 0xFFDFC4);
      const hair = this.add.ellipse(0, -32, 28, 20, 0x2a1a0a);
      const dress = this.add.triangle(0, 15, -15, 0, 15, 0, 0, 30, 0xFF1493);
      container.add([dress, body, head, hair]);
      container.setSize(40, 60);
      container.setDepth(spawn.y);
      
      const name = this.add.text(0, -55, '👑 Kim', {
        fontSize: '12px',
        color: '#FFD700',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      container.add(name);
      
      this.player = container as unknown as Phaser.GameObjects.Sprite;
    }
  }

  private createUI(): void {
    // Stats panel (top-left)
    const panel = this.add.rectangle(120, 50, 220, 80, 0x1a1a2e, 0.9)
      .setStrokeStyle(2, 0x4a90a4)
      .setScrollFactor(0)
      .setDepth(800);
    void panel; // Panel renders automatically

    this.statsText = this.add.text(20, 20, '', {
      fontSize: '14px',
      color: '#FFFFFF',
      lineSpacing: 4
    })
      .setScrollFactor(0)
      .setDepth(801);

    this.updateUI();

    // Menu button (top-right)
    const menuBtn = this.add.text(this.scale.width - 20, 20, '☰', {
      fontSize: '32px',
      color: '#FFD700'
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(801)
      .setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => this.showMenu());
  }

  private updateUI(): void {
    const state = getGameState();
    const outfit = OutfitSystem.getEquippedOutfit();

    this.statsText.setText([
      `⚖️ Citations: ${state.citations}`,
      `👗 Outfit: ${outfit?.name || 'Default'}`,
      `💎 Tokens: ${state.fashionTokens}`,
      `⚠️ Sanctions: ${state.sanctionMeter}%`
    ].join('\n'));
  }

  private setupInput(): void {
    // Keyboard controls (WASD + arrow keys)
    if (this.input.keyboard) {
      this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
      this.cursorKeys = this.input.keyboard.createCursorKeys();

      // Interaction: Press E to start a quick flashcard encounter (dev-only DEBUG key)
      // Only enabled in development builds
      if (import.meta.env && import.meta.env.DEV) {
        this.input.keyboard.on('keydown-E', () => {
          if (this.dialogueSystem.isActive() || this.inEncounter) return;
          const config: EncounterConfig = { deckTag: 'evidence', count: 1 };
          this.startEncounter(config);
        });
      }
    }
    
    // Tap-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't move if UI is active
      if (this.dialogueSystem.isActive()) return;

      // Get world position
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Check if clicked on an entity
      let clickedEntity = false;
      this.entities.forEach((entity, _id) => {
        if (entity.sprite) {
          const bounds = entity.sprite.getBounds();
          if (bounds.contains(worldPoint.x, worldPoint.y)) {
            clickedEntity = true;
          }
        }
      });

      // Only move if not clicking an entity
      if (!clickedEntity) {
        this.playerTarget = { x: worldPoint.x, y: worldPoint.y };
        
        // Show tap indicator
        const indicator = this.add.circle(worldPoint.x, worldPoint.y, 8, 0xFFD700, 0.5);
        this.tweens.add({
          targets: indicator,
          alpha: 0,
          scale: 2,
          duration: 300,
          onComplete: () => indicator.destroy()
        });
      }
    });
  }

  private handleEntityInteraction(id: string, entity: EntityData): void {
    console.log('Interacting with:', id, entity.type);

    switch (entity.type) {
      case 'NPC':
        if (entity.properties?.storyKnot) {
          this.dialogueSystem.start(entity.properties.storyKnot, () => {
            console.log('Dialogue complete');
            this.updateUI();
          }, (tag) => {
            this.handleDialogueTag(tag);
          });
        }
        break;

      case 'EncounterTrigger':
        const config = entity.properties?.encounterConfig as EncounterConfig;
        if (config) {
          this.startEncounter(config);
        }
        break;

      case 'OutfitChest':
        const outfitId = entity.properties?.outfitId;
        if (outfitId) {
          OutfitSystem.unlockOutfit(outfitId);
          this.showNotification(`👗 Unlocked: ${outfitId}!`);
          
          // Remove chest after opening
          const entityData = this.entities.get(id);
          if (entityData?.sprite) {
            entityData.sprite.destroy();
          }
          this.entities.delete(id);
        }
        break;

      case 'Door':
        const targetLevel = entity.properties?.targetLevel;
        if (targetLevel) {
          this.scene.restart({ level: targetLevel });
        }
        break;
    }
  }

  private handleDialogueTag(tag: string): void {
    console.log('Dialogue tag:', tag);

    if (tag.startsWith('encounter:')) {
      const encounterData = tag.substring(10);
      // Parse encounter config from tag
      // e.g., "encounter:evidence,3,court_blazer"
      const parts = encounterData.split(',');
      const config: EncounterConfig = {
        deckTag: parts[0] || 'general',
        count: parseInt(parts[1]) || 3,
        rewardId: parts[2]
      };
      this.startEncounter(config);
    }

    if (tag.startsWith('give:')) {
      const itemId = tag.substring(5);
      OutfitSystem.unlockOutfit(itemId);
      this.showNotification(`Received: ${itemId}`);
    }

    if (tag === 'save') {
      saveGameState();
      this.showNotification('💾 Game saved!');
    }
  }

  private startEncounter(config: EncounterConfig): void {
    if (this.inEncounter) return;
    this.inEncounter = true;

    this.encounterSystem.start(config, (result) => {
      console.log('Encounter result:', result);
      this.updateUI();

      if (result.won) {
        this.showNotification(`🎉 Victory! +${result.correctCount * 10} citations`);
      } else {
        this.showNotification('⚠️ Better luck next time...');
      }

      // Clear encounter state
      this.inEncounter = false;
    });
  }

  private showNotification(message: string): void {
    const { width, height } = this.scale;
    
    const notification = this.add.text(width / 2, height - 50, message, {
      fontSize: '20px',
      color: '#FFFFFF',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.tweens.add({
      targets: notification,
      y: height - 80,
      alpha: 0,
      duration: 2000,
      delay: 1500,
      onComplete: () => notification.destroy()
    });
  }

  private showMenu(): void {
    // Simple pause menu
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(1100)
      .setInteractive();

    const menu = this.add.container(width / 2, height / 2)
      .setScrollFactor(0)
      .setDepth(1101);

    const title = this.add.text(0, -150, '⚖️ MENU ⚖️', {
      fontSize: '36px',
      color: '#FFD700',
      fontFamily: 'Georgia'
    }).setOrigin(0.5);

    const buttons = [
      { text: '📝 Resume', action: () => this.closeMenu(overlay, menu) },
      { text: '👗 Outfits', action: () => this.showOutfits() },
      { text: '💾 Save', action: () => { saveGameState(); this.showNotification('💾 Saved!'); } },
      { text: '🚪 Main Menu', action: () => this.scene.start('MainMenu') }
    ];

    const buttonElements: Phaser.GameObjects.Text[] = [];
    buttons.forEach((btn, i) => {
      const button = this.add.text(0, -50 + i * 60, btn.text, {
        fontSize: '24px',
        color: '#FFFFFF',
        backgroundColor: '#2a4858',
        padding: { x: 30, y: 12 }
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => button.setColor('#FFD700'));
      button.on('pointerout', () => button.setColor('#FFFFFF'));
      button.on('pointerdown', btn.action);

      buttonElements.push(button);
    });

    menu.add([title, ...buttonElements]);
  }

  private closeMenu(overlay: Phaser.GameObjects.Rectangle, menu: Phaser.GameObjects.Container): void {
    overlay.destroy();
    menu.destroy();
  }

  private showOutfits(): void {
    // Outfit selection screen - simplified
    const unlocked = OutfitSystem.getUnlockedOutfits();
    console.log('Unlocked outfits:', unlocked);
    this.showNotification(`You have ${unlocked.length} outfits`);
  }

  // Movement constants
  private readonly PLAYER_SPEED = 160;
  private readonly ARRIVE_DIST = 6;

  update(_time: number, _delta: number): void {
    if (!this.player) return;
    
    // Bail if dialogue is open or an encounter is active
    if (this.dialogueSystem.isActive() || this.inEncounter) {
      // Stop player if using physics
      if (this.player.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      return;
    }
    
    // Check if player has physics body (real sprite) or is placeholder container
    const hasPhysics = this.player.body && 'setVelocity' in this.player.body;
    
    // Check keyboard input (WASD + arrows) - keyboard overrides tap-to-move
    let keyboardDx = 0;
    let keyboardDy = 0;
    
    if (this.wasdKeys) {
      if (this.wasdKeys.W?.isDown || this.cursorKeys?.up?.isDown) keyboardDy = -1;
      if (this.wasdKeys.S?.isDown || this.cursorKeys?.down?.isDown) keyboardDy = 1;
      if (this.wasdKeys.A?.isDown || this.cursorKeys?.left?.isDown) keyboardDx = -1;
      if (this.wasdKeys.D?.isDown || this.cursorKeys?.right?.isDown) keyboardDx = 1;
    }
    
    const usingKeyboard = keyboardDx !== 0 || keyboardDy !== 0;
    
    // If using keyboard, cancel any tap-to-move target
    if (usingKeyboard) {
      this.playerTarget = null;
    }
    
    // Determine movement direction
    let dx = 0;
    let dy = 0;
    
    if (usingKeyboard) {
      // Keyboard movement: direct velocity from key presses
      dx = keyboardDx;
      dy = keyboardDy;
    } else if (this.playerTarget) {
      // Tap-to-move: direction toward target
      dx = this.playerTarget.x - this.player.x;
      dy = this.playerTarget.y - this.player.y;
      
      const distSq = dx * dx + dy * dy;
      
      // Check if arrived at target
      if (distSq <= this.ARRIVE_DIST * this.ARRIVE_DIST) {
        if (hasPhysics) {
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        this.player.setPosition(this.playerTarget.x, this.playerTarget.y);
        this.playerTarget = null;
        this.player.setDepth(this.player.y);
        
        // Play idle in last direction
        const idleKey = `char.kim.idle_${this.lastDirection}`;
        if (hasPhysics && this.anims.exists(idleKey) && this.player.anims?.currentAnim?.key !== idleKey) {
          this.player.play(idleKey);
        }
        return;
      }
    }
    
    // No movement input - idle
    if (dx === 0 && dy === 0) {
      if (hasPhysics) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        const idleKey = `char.kim.idle_${this.lastDirection}`;
        if (this.anims.exists(idleKey) && this.player.anims?.currentAnim?.key !== idleKey) {
          this.player.play(idleKey);
        }
      }
      return;
    }
    
    // Compute direction for animation
    const animDir = this.getAnimDirection(dx, dy);
    this.lastDirection = animDir;
    
    // Apply movement
    if (hasPhysics) {
      const velocity = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.PLAYER_SPEED);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
      
      // Play walk animation
      const animKey = `char.kim.walk_${animDir}`;
      if (this.anims.exists(animKey) && this.player.anims?.currentAnim?.key !== animKey) {
        this.player.play(animKey);
      }
    } else {
      // Position-based fallback for placeholder
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = this.moveSpeed * (_delta / 1000);
      const ratio = Math.min(speed / dist, 1);
      this.player.x += dx * ratio;
      this.player.y += dy * ratio;
    }
    
    // Update depth for Y-sorting
    this.player.setDepth(this.player.y);
  }
  
  private getAnimDirection(dx: number, dy: number): string {
    // Determine primary direction based on larger delta
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
}
