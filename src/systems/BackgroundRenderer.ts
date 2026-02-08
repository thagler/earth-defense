import Phaser from 'phaser';

/**
 * BackgroundRenderer -- draws atmospheric background elements behind the tilemap.
 *
 * Features:
 *   - Two-layer parallax starfield (slow + fast layer)
 *   - Occasional horizontal "scan line" sweeping down the screen
 *   - Pulsing ambient glow around the spawn point (green)
 *   - Pulsing ambient glow around the base (red)
 *
 * All elements are rendered at depth -10 or below so they sit behind everything.
 * The renderer needs an update() call each frame to animate the stars and scan line.
 *
 * For menu/overlay usage, call createStarfield() alone and then updateStarfield()
 * each frame. The spawn/base glows are optional.
 */
export class BackgroundRenderer {
  private scene: Phaser.Scene;

  // ---- Starfield ----
  /** Layer 0 = far (slow), Layer 1 = near (fast) */
  private starLayers: Phaser.GameObjects.Arc[][] = [[], []];
  private readonly LAYER_SPEEDS = [0.08, 0.2]; // pixels per frame at 60fps (scaled by delta)
  private readonly STAR_COUNTS = [50, 30];
  private width: number;
  private height: number;

  // ---- Scan line ----
  private scanLine: Phaser.GameObjects.Rectangle | null = null;
  private scanLineY: number = 0;
  private scanLineCooldown: number = 0; // seconds until next scan line

  // ---- Ambient glows ----
  private spawnGlow: Phaser.GameObjects.Arc | null = null;
  private baseGlow: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.width = scene.scale.width;
    this.height = scene.scale.height;
  }

  // -------------------------------------------------------------------
  //  Public API
  // -------------------------------------------------------------------

  /**
   * Build the starfield and scan-line assets. This alone is suitable for
   * menus and overlays that only want an animated star background.
   */
  createStarfield(): void {
    for (let layer = 0; layer < 2; layer++) {
      const count = this.STAR_COUNTS[layer];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        const radius = layer === 0 ? Phaser.Math.FloatBetween(0.5, 1.2) : Phaser.Math.FloatBetween(0.8, 1.8);
        const alpha = layer === 0 ? Phaser.Math.FloatBetween(0.15, 0.35) : Phaser.Math.FloatBetween(0.25, 0.55);

        const star = this.scene.add.arc(x, y, radius, 0, 360, false, 0xffffff, alpha);
        star.setDepth(-10);
        this.starLayers[layer].push(star);
      }
    }

    // Initialise scan line cooldown
    this.scanLineCooldown = Phaser.Math.Between(4, 8);
  }

  /**
   * Add pulsing glow indicators at the spawn and base positions.
   *
   * @param spawnX  World X of the spawn tile centre
   * @param spawnY  World Y of the spawn tile centre
   * @param baseX   World X of the base tile centre
   * @param baseY   World Y of the base tile centre
   */
  createAmbientGlows(spawnX: number, spawnY: number, baseX: number, baseY: number): void {
    // Spawn glow -- pulsing green
    this.spawnGlow = this.scene.add.arc(spawnX, spawnY, 28, 0, 360, false, 0x44ff44, 0.12);
    this.spawnGlow.setDepth(-9);

    this.scene.tweens.add({
      targets: this.spawnGlow,
      alpha: 0.25,
      radius: 36,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Base glow -- pulsing red
    this.baseGlow = this.scene.add.arc(baseX, baseY, 28, 0, 360, false, 0xff4444, 0.12);
    this.baseGlow.setDepth(-9);

    this.scene.tweens.add({
      targets: this.baseGlow,
      alpha: 0.25,
      radius: 36,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Per-frame update for starfield drift and scan-line animation.
   *
   * @param delta Frame delta in milliseconds (from Phaser update).
   */
  update(delta: number): void {
    this.updateStarfield(delta);
    this.updateScanLine(delta);
  }

  /**
   * Per-frame starfield-only update (for use in menus without the full
   * background setup).
   */
  updateStarfield(delta: number): void {
    const dtFactor = delta / 16.67; // normalise to 60 fps baseline

    for (let layer = 0; layer < 2; layer++) {
      const speed = this.LAYER_SPEEDS[layer] * dtFactor;
      for (const star of this.starLayers[layer]) {
        star.y += speed;
        if (star.y > this.height + 2) {
          star.y = -2;
          star.x = Math.random() * this.width;
        }
      }
    }
  }

  // -------------------------------------------------------------------
  //  Clean up
  // -------------------------------------------------------------------

  destroy(): void {
    for (const layer of this.starLayers) {
      for (const star of layer) {
        star.destroy();
      }
    }
    this.starLayers = [[], []];
    this.scanLine?.destroy();
    this.scanLine = null;
    this.spawnGlow?.destroy();
    this.spawnGlow = null;
    this.baseGlow?.destroy();
    this.baseGlow = null;
  }

  // -------------------------------------------------------------------
  //  Internals
  // -------------------------------------------------------------------

  private updateScanLine(delta: number): void {
    const dtSec = delta / 1000;

    if (!this.scanLine) {
      // Cooldown before spawning a new scan line
      this.scanLineCooldown -= dtSec;
      if (this.scanLineCooldown <= 0) {
        this.scanLine = this.scene.add.rectangle(
          this.width / 2,
          -2,
          this.width,
          1,
          0x44ffaa,
          0.06,
        );
        this.scanLine.setDepth(-9);
        this.scanLineY = -2;
      }
    } else {
      // Move the scan line downward
      this.scanLineY += 60 * (delta / 1000); // 60 px/s
      this.scanLine.setY(this.scanLineY);

      if (this.scanLineY > this.height + 2) {
        this.scanLine.destroy();
        this.scanLine = null;
        this.scanLineCooldown = Phaser.Math.Between(5, 10);
      }
    }
  }
}
