import Phaser from 'phaser';
import { getMapByLevel, TileType } from '../config/maps';
import { LEVELS, LevelConfig } from '../config/levels';
import { TOWERS } from '../config/towers';
import { TilemapRenderer } from '../systems/TilemapRenderer';
import { TowerManager } from '../systems/TowerManager';
import { EnemySpawner } from '../systems/EnemySpawner';
import { EconomyManager } from '../systems/EconomyManager';
import { BackgroundRenderer } from '../systems/BackgroundRenderer';
import { CameraController } from '../systems/CameraController';
import { ParticleEffects } from '../systems/ParticleEffects';
import { Tower } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';
import { HUD } from '../ui/HUD';
import { TowerPicker } from '../ui/TowerPicker';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { SoundManager } from '../systems/SoundManager';
import { cartToIso } from '../utils/coordinates';

/**
 * GameScene -- the main gameplay scene that wires all systems together:
 * tilemap rendering, tower placement, enemy spawning, economy, and UI.
 *
 * Lifecycle:
 *   init(data) -> create() -> update(time, delta) per frame -> shutdown()
 */
export class GameScene extends Phaser.Scene {
  // ---- Level ----
  private level: number = 1;
  private levelConfig!: LevelConfig;

  // ---- Core systems ----
  private tilemapRenderer!: TilemapRenderer;
  private towerManager!: TowerManager;
  private enemySpawner!: EnemySpawner;
  private economyManager!: EconomyManager;

  // ---- Visual systems ----
  private backgroundRenderer: BackgroundRenderer | null = null;
  private cameraController!: CameraController;

  // ---- UI ----
  private hud!: HUD;
  private towerPicker!: TowerPicker;
  private towerInfoPanel!: TowerInfoPanel;

  // ---- Game state ----
  private lives: number = 10;
  private maxLives: number = 10;
  private totalEnemies: number = 0;
  private enemiesKilled: number = 0;
  private levelComplete: boolean = false;
  private gameOver: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  // -------------------------------------------------------------------
  //  Phaser lifecycle
  // -------------------------------------------------------------------

  init(data: { level: number }): void {
    this.level = data.level || 1;

    // Reset transient state for scene restart
    this.enemiesKilled = 0;
    this.levelComplete = false;
    this.gameOver = false;
  }

  create(): void {
    // ---- Level config lookup ----
    const foundConfig = LEVELS.find((l) => l.level === this.level);
    if (!foundConfig) {
      console.error(`GameScene: no level config for level ${this.level}, falling back to level 1`);
      this.levelConfig = LEVELS[0];
    } else {
      this.levelConfig = foundConfig;
    }

    this.lives = this.levelConfig.lives;
    this.maxLives = this.levelConfig.lives;
    this.totalEnemies = this.levelConfig.segments.reduce((sum, seg) => sum + seg.count, 0);

    // ---- Background (depth -10, behind everything) ----
    this.backgroundRenderer = new BackgroundRenderer(this);
    this.backgroundRenderer.createStarfield();

    // ---- Tilemap ----
    const mapConfig = getMapByLevel(this.level);
    this.tilemapRenderer = new TilemapRenderer(this, mapConfig);
    this.tilemapRenderer.render();

    // ---- Camera controller for isometric panning ----
    const cols = mapConfig.grid[0]?.length ?? 16;
    const rows = mapConfig.grid.length;
    this.cameraController = new CameraController(this, cols, rows);

    // ---- Ambient glows at spawn and base ----
    this.setupAmbientGlows(mapConfig);

    // ---- Economy ----
    this.economyManager = new EconomyManager(this.levelConfig);

    // ---- Tower Manager ----
    this.towerManager = new TowerManager(this, mapConfig.heightGrid);

    // ---- Path waypoints & Enemy Spawner ----
    const waypoints = this.tilemapRenderer.getPathPoints();
    this.enemySpawner = new EnemySpawner(this, waypoints, this.levelConfig, mapConfig.pathElevations);

    // ---- UI Components ----
    this.hud = new HUD(this);
    this.towerPicker = new TowerPicker(this);
    this.towerInfoPanel = new TowerInfoPanel(this);

    // Push initial state to HUD
    this.hud.updateCredits(this.economyManager.getCredits());
    this.hud.updateLives(this.lives, this.maxLives);
    this.hud.updateEnemiesRemaining(this.totalEnemies);
    // World name lookup for HUD display
    const worldNames: Record<number, string> = {
      1: 'Desert Outpost',
      2: 'Urban Ruins',
      3: 'Alien Terrain',
    };
    const worldName = worldNames[this.levelConfig.world] ?? '';
    this.hud.updateLevelName(this.levelConfig.level, this.levelConfig.name, worldName);
    this.towerPicker.updateAffordability(this.economyManager.getCredits());

    // ---- Build slot click handling ----
    this.setupBuildSlots();

    // ---- Event wiring ----
    this.wireEvents();
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.levelComplete) return;

    // ---- Camera panning ----
    this.cameraController.update(delta);

    // ---- Background animation ----
    this.backgroundRenderer?.update(delta);

    // ---- System updates ----
    this.economyManager.update(delta);
    this.enemySpawner.update(time, delta);

    const activeEnemies = this.enemySpawner.getActiveEnemies();
    this.towerManager.updateAll(time, delta, activeEnemies);

    // ---- HUD: enemies remaining ----
    // "Remaining" = total minus killed minus reached-base, showing how many are
    // still a threat (including not-yet-spawned).
    const enemiesRemaining = this.totalEnemies - this.enemiesKilled - this.enemySpawner.getEnemiesReachedBase();
    this.hud.updateEnemiesRemaining(Math.max(0, enemiesRemaining));

    // ---- Level completion check ----
    if (this.enemySpawner.isComplete() && this.lives > 0) {
      this.handleLevelComplete();
    }

    // ---- Game over check ----
    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  // -------------------------------------------------------------------
  //  Build slot setup
  // -------------------------------------------------------------------

  private setupBuildSlots(): void {
    const buildSlots = this.tilemapRenderer.getBuildSlots();

    for (const slot of buildSlots) {
      slot.rect.on('pointerdown', () => {
        // Check if a tower already exists at this slot
        const existingTower = this.towerManager.getTowerAt(slot.tileX, slot.tileY);

        if (existingTower) {
          // Show the tower info panel for the existing tower
          const canAfford = this.economyManager.canUpgradeTower(
            existingTower.towerKey,
            existingTower.currentTier,
          );
          this.towerInfoPanel.show(existingTower, canAfford);
          return;
        }

        // Check if a tower type is selected in the picker
        const selectedKey = this.towerPicker.getSelectedTower();
        if (!selectedKey) return;

        // Check if the economy can afford it
        if (!this.economyManager.canBuyTower(selectedKey)) return;

        // Purchase and place
        const purchased = this.economyManager.buyTower(selectedKey);
        if (!purchased) return;

        const tower = this.towerManager.placeTower(slot.tileX, slot.tileY, selectedKey, slot.elevation);

        if (!tower) {
          // Placement failed -- refund the cost. baseCost was already deducted
          // by buyTower, so we add it back.
          const towerCfg = TOWERS[selectedKey];
          if (towerCfg) {
            this.economyManager.addCredits(towerCfg.baseCost);
          }
          return;
        }

        // Play tower placement sound
        const sm = this.registry.get('soundManager') as SoundManager | undefined;
        sm?.play('tower-place');

        // Update UI
        this.hud.updateCredits(this.economyManager.getCredits());
        this.towerPicker.clearSelection();
        this.towerPicker.updateAffordability(this.economyManager.getCredits());
      });
    }
  }

  // -------------------------------------------------------------------
  //  Event wiring
  // -------------------------------------------------------------------

  private wireEvents(): void {
    // ---- Enemy killed: award credits + visual effect ----
    this.enemySpawner.on('enemy-killed', (data: { reward: number; enemy: Enemy }) => {
      this.economyManager.addCredits(data.reward);
      this.enemiesKilled++;
      this.hud.updateCredits(this.economyManager.getCredits());

      // Visual: death burst at enemy position
      if (data.enemy) {
        ParticleEffects.enemyDeathEffect(
          this,
          data.enemy.x,
          data.enemy.y,
          data.enemy.config.color,
        );
      }
    });

    // ---- Swarm split: adjust total enemy count for spawned children ----
    this.enemySpawner.on('enemies-spawned-from-split', (data: { count: number }) => {
      this.totalEnemies += data.count;
    });

    // ---- Enemy reached base: lose a life + visual effects ----
    this.enemySpawner.on('enemy-reached-base', (data: { enemy: Enemy }) => {
      this.lives--;
      this.hud.updateLives(this.lives, this.maxLives);

      // Play warning buzz
      const sm = this.registry.get('soundManager') as SoundManager | undefined;
      sm?.play('enemy-reached-base');

      // Visual: red pulse at base + camera shake
      if (data?.enemy) {
        ParticleEffects.enemyReachedBaseEffect(this, data.enemy.x, data.enemy.y);
      }
      this.cameras.main.shake(200, 0.005);

      if (this.lives <= 0) {
        this.handleGameOver();
      }
    });

    // ---- Tower placed: visual effect + click-to-inspect wiring ----
    this.towerManager.events.on('tower-placed', (data: { tower: Tower }) => {
      ParticleEffects.towerPlaceEffect(this, data.tower.x, data.tower.y);

      // When the player clicks a placed tower, show its info panel
      data.tower.on('tower-clicked', (tower: Tower) => {
        const canAfford = this.economyManager.canUpgradeTower(
          tower.towerKey,
          tower.currentTier,
        );
        this.towerInfoPanel.show(tower, canAfford);
      });
    });

    // ---- Tower upgraded: visual effect ----
    this.towerManager.events.on('tower-upgraded', (data: { tower: Tower; newTier: number; cost: number }) => {
      ParticleEffects.towerUpgradeEffect(this, data.tower.x, data.tower.y);
    });

    // ---- Credits changed: update tower picker affordability ----
    this.economyManager.on('credits-changed', (credits: number) => {
      this.hud.updateCredits(credits);
      this.towerPicker.updateAffordability(credits);
    });

    // ---- Tower info panel: upgrade requested ----
    this.towerInfoPanel.on('upgrade-requested', (tower: Tower) => {
      if (!tower.hasEnoughKills()) return;
      if (!this.economyManager.canUpgradeTower(tower.towerKey, tower.currentTier)) return;

      const spent = this.economyManager.upgradeTower(tower.towerKey, tower.currentTier);
      if (!spent) return;

      this.towerManager.upgradeTower(tower);
      this.hud.updateCredits(this.economyManager.getCredits());

      // Play upgrade sound
      const sm = this.registry.get('soundManager') as SoundManager | undefined;
      sm?.play('tower-upgrade');

      // Refresh the info panel to reflect the new tier stats
      const canAfford = this.economyManager.canUpgradeTower(tower.towerKey, tower.currentTier);
      this.towerInfoPanel.hide();
      this.towerInfoPanel.show(tower, canAfford);
    });

    // ---- Tower info panel: sell requested ----
    this.towerInfoPanel.on('sell-requested', (tower: Tower) => {
      const refund = this.towerManager.removeTower(tower);
      this.economyManager.addCredits(refund);
      this.hud.updateCredits(this.economyManager.getCredits());
      this.towerInfoPanel.hide();

      // Play sell sound
      const sm = this.registry.get('soundManager') as SoundManager | undefined;
      sm?.play('tower-sell');
    });
  }

  // -------------------------------------------------------------------
  //  Level completion / game over
  // -------------------------------------------------------------------

  private handleLevelComplete(): void {
    if (this.levelComplete) return;
    this.levelComplete = true;

    // Play level-complete jingle
    const sm = this.registry.get('soundManager') as SoundManager | undefined;
    sm?.play('level-complete');

    const stats = this.economyManager.getStats();
    const maxLevel = LEVELS.length;

    const levelStats = {
      enemiesKilled: this.enemiesKilled,
      creditsEarned: stats.totalEarned,
      livesRemaining: this.lives,
      livesMax: this.maxLives,
      level: this.level,
    };

    if (this.level >= maxLevel) {
      // Victory -- all levels completed. Show level complete overlay,
      // then after a delay return to the menu.
      this.hud.showLevelComplete(levelStats);

      this.time.delayedCall(5000, () => {
        this.scene.start('MenuScene');
      });
    } else {
      // Show level complete overlay with "Next Level" button
      this.hud.showLevelComplete(levelStats);

      // HUD emits 'next-level' when the player clicks the button
      this.hud.once('next-level', () => {
        this.scene.start('GameScene', { level: this.level + 1 });
      });
    }
  }

  private handleGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    // Play game-over descending tones
    const sm = this.registry.get('soundManager') as SoundManager | undefined;
    sm?.play('game-over');

    const stats = this.economyManager.getStats();

    // Brief delay so the player sees the final life lost
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', {
        level: this.level,
        stats: {
          enemiesKilled: this.enemiesKilled,
          creditsEarned: stats.totalEarned,
        },
      });
    });
  }

  // -------------------------------------------------------------------
  //  Visual setup helpers
  // -------------------------------------------------------------------

  /**
   * Scan the map grid for spawn (3) and base (4) tile types, then
   * add pulsing ambient glows at those isometric positions via BackgroundRenderer.
   */
  private setupAmbientGlows(mapConfig: { grid: number[][]; heightGrid: number[][] }): void {
    let spawnCol = 0;
    let spawnRow = 0;
    let baseCol = 0;
    let baseRow = 0;

    const rows = mapConfig.grid.length;
    const cols = mapConfig.grid[0]?.length ?? 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = mapConfig.grid[row][col];
        if (tile === TileType.Spawn) {
          spawnCol = col;
          spawnRow = row;
        } else if (tile === TileType.Base) {
          baseCol = col;
          baseRow = row;
        }
      }
    }

    // Convert tile positions to isometric world coordinates with elevation
    const spawnElev = mapConfig.heightGrid[spawnRow]?.[spawnCol] ?? 0;
    const baseElev = mapConfig.heightGrid[baseRow]?.[baseCol] ?? 0;
    const spawnIso = cartToIso(spawnCol, spawnRow, spawnElev);
    const baseIso = cartToIso(baseCol, baseRow, baseElev);

    this.backgroundRenderer?.createAmbientGlows(
      spawnIso.screenX, spawnIso.screenY,
      baseIso.screenX, baseIso.screenY,
    );
  }

  // -------------------------------------------------------------------
  //  Scene cleanup
  // -------------------------------------------------------------------

  shutdown(): void {
    this.cameraController?.destroy();
    this.towerManager?.destroy();
    this.enemySpawner?.destroy();
    this.economyManager?.removeAllListeners();
    this.hud?.destroy();
    this.towerPicker?.destroy();
    this.towerInfoPanel?.destroy();
    this.backgroundRenderer?.destroy();
    this.backgroundRenderer = null;
  }
}
