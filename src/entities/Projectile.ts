import Phaser from 'phaser';
import type { Tower } from './Tower';
import { calculateDepth } from '../utils/elevation';

export interface ProjectileConfig {
  startX: number;
  startY: number;
  target: any; // enemy reference (enemy system built in parallel)
  speed: number; // pixels per second
  damage: number;
  color: string; // hex color string
  splashRadius: number; // 0 = no splash
  towerKey?: string; // tower type key for texture lookup
  sourceTower?: Tower; // the tower that fired this projectile (for kill attribution)
}

const HIT_THRESHOLD = 5; // pixels; projectile considered "arrived" at target
const TRAIL_LIFETIME = 120; // ms for trail particles to fade out
const STALE_THRESHOLD = 10000; // ms; destroy projectile if it has been alive too long

export class Projectile extends Phaser.GameObjects.Container {
  private config: ProjectileConfig;
  private bullet: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  private elapsed: number = 0;
  private trailTimer: number = 0;
  private trails: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, config: ProjectileConfig) {
    super(scene, config.startX, config.startY);
    this.config = config;

    // -- Bullet visual (sprite if projectile texture exists, fallback to arc) --
    const projTextureKey = config.towerKey ? `projectile-${config.towerKey}` : '';
    if (projTextureKey && scene.textures.exists(projTextureKey)) {
      const sprite = scene.add.sprite(0, 0, projTextureKey);
      sprite.setDisplaySize(8, 8);
      this.bullet = sprite;
    } else {
      const colorInt = Phaser.Display.Color.HexStringToColor(config.color).color;
      this.bullet = scene.add.arc(0, 0, 4, 0, 360, false, colorInt, 1);
    }
    this.add(this.bullet);

    scene.add.existing(this);

    // Set initial depth for isometric rendering (projectiles render above entities at same elevation)
    const sourceTowerElevation = config.sourceTower ? ((config.sourceTower as any).elevation ?? 0) : 0;
    this.setDepth(calculateDepth(this.y, sourceTowerElevation) + 50);

    // Register an update callback so the projectile drives itself each frame.
    // We store the listener reference so we can clean up on destroy.
    this.scene.events.on('update', this.tick, this);
    this.once('destroy', () => {
      this.scene.events.off('update', this.tick, this);
      // Clean up any remaining trail particles
      for (const t of this.trails) {
        t.destroy();
      }
      this.trails = [];
    });
  }

  /** Called each frame via the scene 'update' event. */
  private tick = (_time: number, delta: number): void => {
    if (!this.active) return;

    this.elapsed += delta;

    // Safety net: destroy if the projectile has been alive far too long.
    if (this.elapsed > STALE_THRESHOLD) {
      this.destroy();
      return;
    }

    const target = this.config.target;

    // If the target is gone / destroyed, just remove the projectile.
    if (!target || !target.active) {
      this.destroy();
      return;
    }

    // Move toward the target
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= HIT_THRESHOLD) {
      this.onHitTarget();
      return;
    }

    const step = (this.config.speed * delta) / 1000;
    const ratio = Math.min(step / dist, 1);
    this.x += dx * ratio;
    this.y += dy * ratio;

    // Update depth for isometric sorting as Y position changes
    const sourceTowerElevation = this.config.sourceTower ? ((this.config.sourceTower as any).elevation ?? 0) : 0;
    this.setDepth(calculateDepth(this.y, sourceTowerElevation) + 50);

    // Trail effect: spawn a small fading circle every few ms
    this.trailTimer += delta;
    if (this.trailTimer >= 30) {
      this.trailTimer = 0;
      this.spawnTrail();
    }
  };

  /** Impact logic when reaching the target. */
  private onHitTarget(): void {
    const target = this.config.target;

    if (this.config.splashRadius > 0) {
      // Splash damage: get all active enemies from the scene and damage those in radius.
      this.applySplashDamage();
    } else {
      // Single-target damage
      if (target && typeof target.takeDamage === 'function') {
        const wasAlive = target.isAlive;
        target.takeDamage(this.config.damage);
        if (wasAlive && !target.isAlive && this.config.sourceTower) {
          this.config.sourceTower.addKill();
        }
      }
    }

    // Impact flash
    this.playImpactFlash();

    this.destroy();
  }

  /** Deal splash damage to all enemies within the splash radius centered on impact point. */
  private applySplashDamage(): void {
    // The TowerManager stores its towers' scene reference. Enemies can be located via
    // a well-known registry key or a scene data property. We search for them dynamically
    // to remain decoupled from the enemy system.
    const impactX = this.x;
    const impactY = this.y;
    const radius = this.config.splashRadius;

    // Attempt to read the enemy list from the scene's data store (set by EnemyManager or TowerManager).
    const enemies: any[] = this.scene.data.get('enemies') ?? [];

    for (const enemy of enemies) {
      if (!enemy || !enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(impactX, impactY, enemy.x, enemy.y);
      if (dist <= radius) {
        if (typeof enemy.takeDamage === 'function') {
          const wasAlive = enemy.isAlive;
          enemy.takeDamage(this.config.damage);
          if (wasAlive && !enemy.isAlive && this.config.sourceTower) {
            this.config.sourceTower.addKill();
          }
        }
      }
    }
  }

  /** Small expanding ring at the impact site. */
  private playImpactFlash(): void {
    const colorInt = Phaser.Display.Color.HexStringToColor(this.config.color).color;
    const flashRadius = this.config.splashRadius > 0 ? this.config.splashRadius : 12;

    const flash = this.scene.add.arc(this.x, this.y, 4, 0, 360, false, colorInt, 0.6);
    flash.setStrokeStyle(1, colorInt, 0.8);

    this.scene.tweens.add({
      targets: flash,
      radius: flashRadius,
      alpha: 0,
      duration: this.config.splashRadius > 0 ? 300 : 150,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** Spawn a small fading trail circle at the current position. */
  private spawnTrail(): void {
    const colorInt = Phaser.Display.Color.HexStringToColor(this.config.color).color;
    const trail = this.scene.add.arc(this.x, this.y, 2, 0, 360, false, colorInt, 0.5);
    this.trails.push(trail);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: TRAIL_LIFETIME,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const idx = this.trails.indexOf(trail);
        if (idx !== -1) this.trails.splice(idx, 1);
        trail.destroy();
      },
    });
  }
}
