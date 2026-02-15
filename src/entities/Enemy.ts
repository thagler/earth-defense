import Phaser from 'phaser';
import { ENEMIES, EnemyConfig } from '../config/enemies';
import { PathFollower, Waypoint } from '../systems/PathFollower';
import { SoundManager } from '../systems/SoundManager';
import { calculateDepth } from '../utils/elevation';

/**
 * Enemy is a Phaser Container that represents a single enemy unit on the map.
 *
 * It reads its stats from the ENEMIES config, renders as a colored rectangle
 * with a health bar, follows a waypoint path, and supports shield and split
 * special behaviors.
 */
export class Enemy extends Phaser.GameObjects.Container {
  // ---- Config & identity ----
  public readonly enemyKey: string;
  public readonly config: EnemyConfig;
  public readonly reward: number;

  // ---- Health ----
  private maxHp: number;
  private currentHp: number;

  // ---- Shield (optional) ----
  private maxShieldHp: number = 0;
  private currentShieldHp: number = 0;
  private shieldRegenDelay: number = 0; // seconds
  private timeSinceLastHit: number = 0; // seconds
  private hasShield: boolean = false;

  // ---- Movement ----
  private baseSpeed: number;
  private currentSpeed: number;
  private pathFollower: PathFollower;

  // ---- Elevation ----
  public currentElevation: number = 0;

  // ---- Slow effect ----
  private slowFactor: number = 1; // 1 = full speed
  private slowTimer: number = 0; // seconds remaining

  // ---- Visuals ----
  private bodyRect!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private shieldOverlay!: Phaser.GameObjects.Rectangle;

  // ---- State ----
  private _reachedEnd: boolean = false;
  private _alive: boolean = true;

  /**
   * @param scene            - The Phaser scene this enemy belongs to.
   * @param startX           - Starting world X position (first waypoint center).
   * @param startY           - Starting world Y position (first waypoint center).
   * @param enemyKey         - Key into the ENEMIES config record.
   * @param waypoints        - Array of world-coordinate waypoints to follow.
   * @param hpScale          - Multiplier applied to base HP (from level config).
   * @param startWaypointIdx - Optional waypoint index to start from (for split spawns).
   * @param pathElevations   - Optional array of elevation values parallel to waypoints.
   */
  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    enemyKey: string,
    waypoints: Waypoint[],
    hpScale: number = 1.0,
    startWaypointIdx: number = 0,
    pathElevations?: number[],
  ) {
    super(scene, startX, startY);

    this.enemyKey = enemyKey;
    this.config = ENEMIES[enemyKey];

    if (!this.config) {
      throw new Error(`Unknown enemy key: "${enemyKey}"`);
    }

    // ---- Stats ----
    this.maxHp = Math.round(this.config.baseHp * hpScale);
    this.currentHp = this.maxHp;
    this.reward = this.config.reward;
    this.baseSpeed = this.config.speed;
    this.currentSpeed = this.baseSpeed;

    // ---- Shield setup ----
    if (this.config.special?.type === 'shield') {
      this.hasShield = true;
      const shieldPercent = this.config.special.shieldPercent ?? 0.5;
      this.maxShieldHp = Math.round(this.maxHp * shieldPercent);
      this.currentShieldHp = this.maxShieldHp;
      this.shieldRegenDelay = this.config.special.shieldRegenDelay ?? 3;
      this.timeSinceLastHit = this.shieldRegenDelay; // start with shield up
    }

    // ---- Path following ----
    this.pathFollower = new PathFollower(waypoints, startWaypointIdx, pathElevations);

    // ---- Create visuals ----
    this.createVisuals();

    // Add to scene
    scene.add.existing(this);
  }

  // -------------------------------------------------------------------
  // Visual construction
  // -------------------------------------------------------------------

  private createVisuals(): void {
    const SIZE = 24;
    const HALF = SIZE / 2;
    const HEALTH_BAR_WIDTH = SIZE;
    const HEALTH_BAR_HEIGHT = 4;
    const HEALTH_BAR_Y = -(HALF + 6); // above the body

    // Body (sprite if texture exists, fallback to colored rectangle)
    // Enemy keys use underscores in config but hyphens in texture names
    const enemyTextureKey = `enemy-${this.enemyKey.replace(/_/g, '-')}`;
    if (this.scene.textures.exists(enemyTextureKey)) {
      const sprite = this.scene.add.sprite(0, 0, enemyTextureKey);
      sprite.setDisplaySize(SIZE, SIZE);
      this.bodyRect = sprite;
    } else {
      this.bodyRect = this.scene.add.rectangle(0, 0, SIZE, SIZE, Phaser.Display.Color.HexStringToColor(this.config.color).color);
    }
    this.add(this.bodyRect);

    // Shield overlay (slightly larger, semi-transparent blue) -- hidden when no shield
    this.shieldOverlay = this.scene.add.rectangle(0, 0, SIZE + 4, SIZE + 4);
    this.shieldOverlay.setStrokeStyle(2, 0x4488ff, 0.8);
    this.shieldOverlay.setFillStyle(0x4488ff, 0.2);
    this.shieldOverlay.setVisible(this.hasShield && this.currentShieldHp > 0);
    this.add(this.shieldOverlay);

    // Health bar background
    this.healthBarBg = this.scene.add.rectangle(0, HEALTH_BAR_Y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x333333);
    this.add(this.healthBarBg);

    // Health bar fill
    this.healthBarFill = this.scene.add.rectangle(0, HEALTH_BAR_Y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x00ff00);
    this.add(this.healthBarFill);
  }

  // -------------------------------------------------------------------
  // Public getters
  // -------------------------------------------------------------------

  get isAlive(): boolean {
    return this._alive;
  }

  get reachedEnd(): boolean {
    return this._reachedEnd;
  }

  get pathProgress(): number {
    return this.pathFollower.pathProgress;
  }

  get hp(): number {
    return this.currentHp;
  }

  get shieldHp(): number {
    return this.currentShieldHp;
  }

  // -------------------------------------------------------------------
  // Damage / slow
  // -------------------------------------------------------------------

  /**
   * Deal damage to this enemy. Damage hits the shield first (if active),
   * then HP.
   */
  takeDamage(amount: number): void {
    if (!this._alive) return;

    // Reset the shield regen timer on any hit
    if (this.hasShield) {
      this.timeSinceLastHit = 0;
    }

    let remaining = amount;

    // Shield absorbs damage first
    if (this.currentShieldHp > 0) {
      if (remaining <= this.currentShieldHp) {
        this.currentShieldHp -= remaining;
        remaining = 0;
      } else {
        remaining -= this.currentShieldHp;
        this.currentShieldHp = 0;
      }
    }

    // Remaining damage hits HP
    if (remaining > 0) {
      this.currentHp -= remaining;
    }

    // Update visuals
    this.updateHealthBar();
    this.updateShieldVisual();

    // Check death
    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.die();
    }
  }

  /**
   * Apply a slow effect. The factor is the speed multiplier (e.g. 0.5 = half speed).
   * If a stronger slow is already active, keep the stronger one; always refresh
   * duration to whichever is longer.
   */
  applySlow(factor: number, duration: number): void {
    if (!this._alive) return;

    // Use the stronger (lower factor) slow
    if (factor < this.slowFactor) {
      this.slowFactor = factor;
    }
    // Use the longer remaining duration
    if (duration > this.slowTimer) {
      this.slowTimer = duration;
    }
  }

  // -------------------------------------------------------------------
  // Update loop (called by spawner / scene)
  // -------------------------------------------------------------------

  /**
   * Main update tick. Handles movement along the path, slow decay, and
   * shield regeneration.
   *
   * @param _time  - Total elapsed game time (ms). Currently unused.
   * @param delta  - Frame delta in milliseconds.
   */
  update(_time: number, delta: number): void {
    if (!this._alive || this._reachedEnd) return;

    const deltaSec = delta / 1000;

    // ---- Slow effect decay ----
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaSec;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowFactor = 1;
      }
      this.currentSpeed = this.baseSpeed * this.slowFactor;
    } else {
      this.currentSpeed = this.baseSpeed;
    }

    // ---- Shield regeneration ----
    if (this.hasShield && this.currentShieldHp < this.maxShieldHp) {
      this.timeSinceLastHit += deltaSec;
      if (this.timeSinceLastHit >= this.shieldRegenDelay) {
        // Fully regenerate shield
        this.currentShieldHp = this.maxShieldHp;
        this.updateShieldVisual();
      }
    }

    // ---- Path following ----
    const newPos = this.pathFollower.update(this.x, this.y, this.currentSpeed, deltaSec);
    this.setPosition(newPos.x, newPos.y);

    // ---- Update elevation and depth ----
    this.currentElevation = newPos.elevation;
    this.setDepth(calculateDepth(this.y, this.currentElevation));

    // ---- Check if reached end ----
    if (this.pathFollower.finished) {
      this._reachedEnd = true;
      this.emit('enemy-reached-base', this);
      this.setVisible(false);
      this.setActive(false);
    }
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  private die(): void {
    this._alive = false;

    // Play enemy death sound
    const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
    sm?.play('enemy-death');

    // Emit split event for Swarm Cluster before the kill event.
    // waypointIndex here is the TARGET waypoint (the one the enemy was heading
    // toward). We subtract 1 to get the last waypoint already reached, because
    // PathFollower's constructor expects "I am AT this waypoint" semantics and
    // will set the next target to index + 1.
    if (this.config.special?.type === 'split') {
      const lastReachedIdx = Math.max(0, this.pathFollower.waypointIndex - 1);
      this.emit('enemy-split', {
        x: this.x,
        y: this.y,
        splitCount: this.config.special.splitCount ?? 0,
        splitEnemyKey: this.config.special.splitEnemyKey ?? '',
        waypointIndex: lastReachedIdx,
      });
    }

    this.emit('enemy-killed', { reward: this.reward, enemy: this });

    this.setVisible(false);
    this.setActive(false);
  }

  private updateHealthBar(): void {
    const fraction = Phaser.Math.Clamp(this.currentHp / this.maxHp, 0, 1);
    const BAR_WIDTH = 24;
    this.healthBarFill.setDisplaySize(BAR_WIDTH * fraction, 4);

    // Shift origin so the bar shrinks from right to left
    this.healthBarFill.setPosition(-(BAR_WIDTH * (1 - fraction)) / 2, this.healthBarBg.y);

    // Color gradient: green -> yellow -> red
    if (fraction > 0.6) {
      this.healthBarFill.setFillStyle(0x00ff00);
    } else if (fraction > 0.3) {
      this.healthBarFill.setFillStyle(0xffff00);
    } else {
      this.healthBarFill.setFillStyle(0xff0000);
    }
  }

  private updateShieldVisual(): void {
    if (!this.hasShield) return;
    this.shieldOverlay.setVisible(this.currentShieldHp > 0);
  }
}
