import Phaser from 'phaser';
import { TOWERS, TowerConfig, TowerTier } from '../config/towers';
import { Projectile } from './Projectile';
import { SoundManager } from '../systems/SoundManager';
import { tileToWorld } from '../utils/coordinates';
import { calculateDepth } from '../utils/elevation';

const TILE_SIZE = 64;

/** Kills required before a tower can upgrade to the next tier. */
export const UPGRADE_KILLS_REQUIRED: [number, number] = [3, 5]; // tier 1→2, tier 2→3

export class Tower extends Phaser.GameObjects.Container {
  public readonly towerKey: string;
  public readonly config: TowerConfig;
  public currentTier: number = 1;
  public creditsSpent: number = 0;
  public kills: number = 0;
  public readonly elevation: number;

  private towerBody: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  private rangeIndicator: Phaser.GameObjects.Ellipse;
  private tierPips: Phaser.GameObjects.Arc[] = [];
  private fireCooldownRemaining: number = 0;
  private tilePos: { x: number; y: number };

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, towerKey: string, elevation: number = 0) {
    const worldPos = tileToWorld(tileX, tileY, elevation);
    super(scene, worldPos.x, worldPos.y);

    this.towerKey = towerKey;
    this.config = TOWERS[towerKey];
    this.elevation = elevation;

    if (!this.config) {
      throw new Error(`Tower config not found for key: "${towerKey}"`);
    }

    this.tilePos = { x: tileX, y: tileY };
    this.creditsSpent = this.config.baseCost;

    // -- Range indicator (scene-level object so it renders above all tiles) --
    // Draw as ellipse for isometric foreshortening (width = 2*range, height = range for 50% Y compression)
    const tier = this.getCurrentTierStats();
    this.rangeIndicator = scene.add.ellipse(worldPos.x, worldPos.y, tier.range * 2, tier.range, 0xffffff, 0.08);
    this.rangeIndicator.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(this.config.color).color, 0.25);
    this.rangeIndicator.setVisible(false);
    this.rangeIndicator.setDepth(999);

    // -- Ground shadow (ellipse at tile center, rendered behind tower body) --
    const shadow = scene.add.ellipse(0, 0, 48, 24, 0x000000, 0.15);
    this.add(shadow);

    // -- Tower body (sprite if texture exists, fallback to colored circle) --
    // Bottom-align: shift body up by half height so visual bottom sits at tile center
    const towerTextureKey = `tower-${this.towerKey}`;
    if (scene.textures.exists(towerTextureKey)) {
      const sprite = scene.add.sprite(0, -20, towerTextureKey);
      sprite.setDisplaySize(40, 40);
      this.towerBody = sprite;
    } else {
      const colorInt = Phaser.Display.Color.HexStringToColor(this.config.color).color;
      this.towerBody = scene.add.arc(0, -20, 20, 0, 360, false, colorInt, 1);
      (this.towerBody as Phaser.GameObjects.Arc).setStrokeStyle(2, 0xffffff, 0.6);
    }
    this.add(this.towerBody);

    // -- Tier pips --
    this.createTierPips();

    // -- Interactive hover for range display --
    this.setSize(TILE_SIZE, TILE_SIZE);
    this.setInteractive();

    this.on('pointerover', () => {
      this.rangeIndicator.setVisible(true);
    });

    this.on('pointerout', () => {
      this.rangeIndicator.setVisible(false);
    });

    this.on('pointerdown', () => {
      this.emit('tower-clicked', this);
    });

    scene.add.existing(this);

    // Set depth using elevation-aware calculation
    this.setDepth(calculateDepth(this.y, this.elevation));
  }

  /** Returns the stat block for the current tier (tiers are 1-indexed, array is 0-indexed). */
  public getCurrentTierStats(): TowerTier {
    return this.config.tiers[this.currentTier - 1];
  }

  /** Returns the tile grid position of this tower. */
  public getTilePos(): { x: number; y: number } {
    return { ...this.tilePos };
  }

  /** Advance the tower to the next tier. Returns false if already at max tier. */
  public upgrade(): boolean {
    if (this.currentTier >= 3) {
      return false;
    }

    const upgradeCost = this.config.upgradeCosts[this.currentTier - 1];
    this.creditsSpent += upgradeCost;
    this.currentTier++;

    // Update range indicator to reflect new range (ellipse for isometric)
    const tier = this.getCurrentTierStats();
    (this.rangeIndicator as Phaser.GameObjects.Ellipse).setSize(tier.range * 2, tier.range);

    // Scale up the tower body slightly to visually indicate power growth
    const scale = 1 + (this.currentTier - 1) * 0.15;
    this.towerBody.setScale(scale);

    // Refresh tier pips
    this.createTierPips();

    return true;
  }

  /** Total credits invested in this tower (base cost + all upgrade costs). */
  public getTotalInvestment(): number {
    return this.creditsSpent;
  }

  /** Credits returned when selling this tower. */
  public getSellValue(): number {
    return Math.floor(this.getTotalInvestment() * this.config.sellRefundRate);
  }

  /** Increment this tower's kill counter. */
  public addKill(): void {
    this.kills++;
  }

  /** Returns the number of kills still needed before the next upgrade is unlocked. */
  public killsUntilUpgrade(): number {
    if (this.currentTier >= 3) return 0;
    const required = UPGRADE_KILLS_REQUIRED[this.currentTier - 1];
    return Math.max(0, required - this.kills);
  }

  /** Whether this tower has enough kills to unlock the next tier. */
  public hasEnoughKills(): boolean {
    return this.killsUntilUpgrade() === 0;
  }

  /**
   * Main update loop called each frame by TowerManager.
   * @param time - total elapsed game time (ms)
   * @param delta - time since last frame (ms)
   * @param enemies - array of active enemies (typed loosely; enemy system built in parallel)
   */
  public update(time: number, delta: number, enemies: any[]): void {
    const tier = this.getCurrentTierStats();
    const cooldownPeriod = 1000 / tier.fireRate; // ms between shots

    this.fireCooldownRemaining -= delta;
    if (this.fireCooldownRemaining > 0) {
      return;
    }

    // Find enemies in range
    const inRange = enemies.filter((enemy) => {
      if (!enemy.active) return false;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      return dist <= tier.range;
    });

    if (inRange.length === 0) {
      return;
    }

    // ---- Area-effect towers (cryo / pulse) ----
    if (this.config.projectileSpeed === 0) {
      this.fireCooldownRemaining = cooldownPeriod;
      this.applyAreaEffect(inRange, tier);
      return;
    }

    // ---- Projectile towers ----
    // "First" targeting: enemy furthest along the path (highest pathProgress)
    const target = this.selectTarget(inRange);
    if (!target) return;

    this.fireCooldownRemaining = cooldownPeriod;
    this.fireProjectile(target, tier);
  }

  // ----------------------------------------------------------------
  //  Private helpers
  // ----------------------------------------------------------------

  /**
   * Selects the enemy closest to reaching the base.
   * We look for a `pathProgress` property (0..1). Higher = closer to base.
   * Falls back to the first enemy in the array if pathProgress is unavailable.
   */
  private selectTarget(enemiesInRange: any[]): any {
    let best: any = null;
    let bestProgress = -1;

    for (const enemy of enemiesInRange) {
      const progress: number = enemy.pathProgress ?? 0;
      if (progress > bestProgress) {
        bestProgress = progress;
        best = enemy;
      }
    }

    return best;
  }

  /** Fire a projectile toward the target enemy. */
  private fireProjectile(target: any, tier: TowerTier): void {
    const hasSplash = (tier.splashRadius ?? 0) > 0;

    new Projectile(this.scene, {
      startX: this.x,
      startY: this.y,
      target,
      speed: this.config.projectileSpeed,
      damage: tier.damage,
      color: this.config.color,
      splashRadius: hasSplash ? tier.splashRadius! : 0,
      towerKey: this.towerKey,
      sourceTower: this,
    });

    // Play the tower-type-specific firing sound
    const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
    sm?.play(`shoot-${this.towerKey}`);
  }

  /** Apply area-of-effect damage/slow to all enemies in range. */
  private applyAreaEffect(enemiesInRange: any[], tier: TowerTier): void {
    // Play the tower-type-specific firing sound
    const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
    sm?.play(`shoot-${this.towerKey}`);

    // Visual pulse effect
    this.playAreaPulse(tier.range);

    for (const enemy of enemiesInRange) {
      // Damage
      if (typeof enemy.takeDamage === 'function') {
        const wasAlive = enemy.isAlive;
        enemy.takeDamage(tier.damage);
        if (wasAlive && !enemy.isAlive) {
          this.addKill();
        }
      }

      // Slow (cryo)
      if (tier.slowFactor !== undefined && tier.slowDuration !== undefined) {
        if (typeof enemy.applySlow === 'function') {
          enemy.applySlow(tier.slowFactor, tier.slowDuration);
        }
      }
    }
  }

  /** Quick expanding ring to visualize an area pulse. */
  private playAreaPulse(range: number): void {
    const colorInt = Phaser.Display.Color.HexStringToColor(this.config.color).color;
    const ring = this.scene.add.arc(this.x, this.y, 10, 0, 360, false, colorInt, 0.3);
    ring.setStrokeStyle(2, colorInt, 0.6);
    ring.setDepth(this.depth - 1);

    this.scene.tweens.add({
      targets: ring,
      radius: range,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Clean up scene-level objects not parented to this container. */
  public destroy(fromScene?: boolean): void {
    this.rangeIndicator.destroy();
    super.destroy(fromScene);
  }

  /** Create / recreate the small pip dots that indicate the current tier. */
  private createTierPips(): void {
    // Destroy existing pips
    for (const pip of this.tierPips) {
      pip.destroy();
    }
    this.tierPips = [];

    const pipRadius = 3;
    const spacing = 10;
    const totalWidth = (this.currentTier - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.currentTier; i++) {
      const pip = this.scene.add.arc(startX + i * spacing, 26, pipRadius, 0, 360, false, 0xffffff, 0.9);
      this.add(pip);
      this.tierPips.push(pip);
    }
  }
}
