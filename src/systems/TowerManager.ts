import Phaser from 'phaser';
import { Tower } from '../entities/Tower';
import { TOWERS } from '../config/towers';
import { getEffectiveRange, getElevationCostMultiplier } from '../utils/elevation';
import { hasLineOfSight } from '../utils/line-of-sight';

/**
 * TowerManager
 *
 * Central manager for tower lifecycle: placement, upgrades, selling, and per-frame updates.
 * Emits Phaser events so that UI and other systems can react to tower actions.
 *
 * Events emitted (via this.events):
 *   'tower-placed'   { tower: Tower }
 *   'tower-sold'     { tower: Tower, refund: number }
 *   'tower-upgraded' { tower: Tower, newTier: number, cost: number }
 */
export class TowerManager {
  public readonly events: Phaser.Events.EventEmitter;

  private towers: Tower[] = [];
  private scene: Phaser.Scene;
  private towerElevations: Map<Tower, number> = new Map();
  private heightGrid: number[][] = [];

  constructor(scene: Phaser.Scene, heightGrid: number[][]) {
    this.scene = scene;
    this.heightGrid = heightGrid;
    this.events = new Phaser.Events.EventEmitter();
  }

  // ----------------------------------------------------------------
  //  Public API
  // ----------------------------------------------------------------

  /**
   * Place a new tower on the map.
   * @param tileX - tile grid X coordinate
   * @param tileY - tile grid Y coordinate
   * @param towerKey - key into TOWERS config (e.g. 'laser')
   * @param elevation - elevation of the build slot (default 0)
   * @returns the newly created Tower, or null if placement is invalid
   */
  public placeTower(tileX: number, tileY: number, towerKey: string, elevation: number = 0): Tower | null {
    // Validate tower key
    if (!TOWERS[towerKey]) {
      console.warn(`TowerManager.placeTower: unknown tower key "${towerKey}"`);
      return null;
    }

    // Prevent stacking — only one tower per tile
    if (this.getTowerAt(tileX, tileY)) {
      console.warn(`TowerManager.placeTower: tile (${tileX}, ${tileY}) already occupied`);
      return null;
    }

    const tower = new Tower(this.scene, tileX, tileY, towerKey, elevation);
    this.towers.push(tower);
    this.towerElevations.set(tower, elevation);

    this.events.emit('tower-placed', { tower });
    return tower;
  }

  /**
   * Remove and destroy a tower, returning its sell value.
   * @returns the credit refund amount, or 0 if the tower was not found
   */
  public removeTower(tower: Tower): number {
    const idx = this.towers.indexOf(tower);
    if (idx === -1) {
      console.warn('TowerManager.removeTower: tower not found in managed list');
      return 0;
    }

    const refund = tower.getSellValue();
    this.towers.splice(idx, 1);
    this.towerElevations.delete(tower);

    this.events.emit('tower-sold', { tower, refund });

    tower.destroy();
    return refund;
  }

  /**
   * Upgrade a tower to the next tier.
   * @returns the cost paid for the upgrade, or 0 if already at max tier
   */
  public upgradeTower(tower: Tower): number {
    if (tower.currentTier >= 3) {
      console.warn('TowerManager.upgradeTower: tower is already at max tier');
      return 0;
    }

    const cost = tower.config.upgradeCosts[tower.currentTier - 1];
    const success = tower.upgrade();

    if (!success) {
      return 0;
    }

    this.events.emit('tower-upgraded', {
      tower,
      newTier: tower.currentTier,
      cost,
    });

    return cost;
  }

  /**
   * Get the upgrade cost for a tower's next tier.
   * @returns the cost, or -1 if already at max tier
   */
  public getUpgradeCost(tower: Tower): number {
    if (tower.currentTier >= 3) return -1;
    return tower.config.upgradeCosts[tower.currentTier - 1];
  }

  /**
   * Returns the tower occupying the given tile, or null.
   */
  public getTowerAt(tileX: number, tileY: number): Tower | null {
    const pos = { x: tileX, y: tileY };
    for (const tower of this.towers) {
      const tp = tower.getTilePos();
      if (tp.x === pos.x && tp.y === pos.y) {
        return tower;
      }
    }
    return null;
  }

  /**
   * Returns a read-only snapshot of all currently placed towers.
   */
  public getAllTowers(): readonly Tower[] {
    return this.towers;
  }

  /**
   * Returns the number of towers currently placed.
   */
  public getTowerCount(): number {
    return this.towers.length;
  }

  /**
   * Called every frame by the game scene's update loop.
   * Forwards the update call to each tower with elevation-filtered enemy list.
   *
   * Also writes the enemy array into the scene data store so that
   * projectiles can discover enemies for splash damage resolution.
   */
  public updateAll(time: number, delta: number, enemies: any[]): void {
    // Publish enemies to scene data so Projectile can access them for splash.
    this.scene.data.set('enemies', enemies);

    for (const tower of this.towers) {
      const towerElevation = this.towerElevations.get(tower) ?? 0;
      const towerTilePos = tower.getTilePos();
      const tier = tower.getCurrentTierStats();

      // Filter enemies by effective range and line-of-sight
      const filteredEnemies = enemies.filter((enemy) => {
        if (!enemy.active) return false;

        // Get enemy elevation (placeholder: use 0 until Enemy entity gains currentElevation)
        const enemyElevation = enemy.currentElevation ?? 0;

        // Apply elevation-adjusted range
        const effectiveRange = getEffectiveRange(tier.range, towerElevation, enemyElevation);
        const dist = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
        if (dist > effectiveRange) return false;

        // Check line-of-sight
        const enemyTilePos = this.worldToTile(enemy.x, enemy.y);
        const hasLOS = hasLineOfSight(
          this.heightGrid,
          towerTilePos.x, towerTilePos.y, towerElevation,
          enemyTilePos.col, enemyTilePos.row, enemyElevation
        );

        return hasLOS;
      });

      tower.update(time, delta, filteredEnemies);
    }
  }

  /**
   * Approximate world-to-tile conversion for line-of-sight checks.
   * Uses a simple orthogonal approximation until proper isometric conversion is available.
   */
  private worldToTile(worldX: number, worldY: number): { col: number; row: number } {
    // Simplified conversion (Tower uses TILE_SIZE=64 orthogonal positioning for now)
    const TILE_SIZE = 64;
    return {
      col: Math.round(worldX / TILE_SIZE),
      row: Math.round(worldY / TILE_SIZE),
    };
  }

  /**
   * Get the elevation of a placed tower.
   */
  public getTowerElevation(tower: Tower): number {
    return this.towerElevations.get(tower) ?? 0;
  }

  /**
   * Get the base cost of a tower adjusted for elevation.
   */
  public getElevationAdjustedCost(towerKey: string, elevation: number): number {
    const config = TOWERS[towerKey];
    if (!config) return 0;
    return Math.floor(config.baseCost * getElevationCostMultiplier(elevation));
  }

  /**
   * Destroy all towers and clean up event listeners.
   * Call this when the scene shuts down.
   */
  public destroy(): void {
    for (const tower of this.towers) {
      tower.destroy();
    }
    this.towers = [];
    this.towerElevations.clear();
    this.events.destroy();
  }
}
