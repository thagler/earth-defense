import Phaser from 'phaser';

/**
 * ParticleEffects -- lightweight utility class for spawning short-lived visual
 * effects using tweened Phaser graphics objects.
 *
 * All effects are fire-and-forget: they create temporary game objects, tween
 * them, and auto-destroy when the tween completes. No per-frame bookkeeping
 * is required by the caller.
 *
 * Design notes:
 *   - Follows the same pattern used by Projectile.ts (tweened Arc objects).
 *   - Every spawned object is placed at a moderate depth (5) so it renders
 *     above the tilemap but below the HUD.
 *   - Particle counts are intentionally small (4-12) to stay performant.
 */
export class ParticleEffects {
  // -------------------------------------------------------------------
  //  Enemy death burst
  // -------------------------------------------------------------------

  /**
   * Small burst of 8-12 particles scattering outward from the death position.
   * Particles inherit the enemy's color and fade out over 300 ms.
   */
  static enemyDeathEffect(scene: Phaser.Scene, x: number, y: number, color: string): void {
    const colorInt = Phaser.Display.Color.HexStringToColor(color).color;
    const count = Phaser.Math.Between(8, 12);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = Phaser.Math.Between(20, 45);
      const endX = x + Math.cos(angle) * dist;
      const endY = y + Math.sin(angle) * dist;
      const size = Phaser.Math.FloatBetween(1.5, 3.5);

      const dot = scene.add.arc(x, y, size, 0, 360, false, colorInt, 0.9);
      dot.setDepth(5);

      scene.tweens.add({
        targets: dot,
        x: endX,
        y: endY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(200, 350),
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // -------------------------------------------------------------------
  //  Tower placement ring
  // -------------------------------------------------------------------

  /**
   * Expanding ring of particles when a tower is placed.
   * White/green palette, 200 ms duration.
   */
  static towerPlaceEffect(scene: Phaser.Scene, x: number, y: number): void {
    // Central flash ring
    const ring = scene.add.arc(x, y, 6, 0, 360, false, 0x44ffaa, 0.5);
    ring.setStrokeStyle(2, 0x88ffcc, 0.7);
    ring.setDepth(5);

    scene.tweens.add({
      targets: ring,
      radius: 36,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Small scattered particles
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 30;
      const dotColor = i % 2 === 0 ? 0xffffff : 0x44ff88;

      const dot = scene.add.arc(x, y, 2, 0, 360, false, dotColor, 0.8);
      dot.setDepth(5);

      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // -------------------------------------------------------------------
  //  Tower upgrade sparkle
  // -------------------------------------------------------------------

  /**
   * Sparkle effect -- small bright particles rising upward, 400 ms.
   */
  static towerUpgradeEffect(scene: Phaser.Scene, x: number, y: number): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const startY = y + Phaser.Math.Between(-5, 10);
      const sparkColor = Phaser.Math.RND.pick([0xffffff, 0xffff88, 0xffcc44, 0x88ffff]);
      const size = Phaser.Math.FloatBetween(1.5, 3);

      const spark = scene.add.arc(x + offsetX, startY, size, 0, 360, false, sparkColor, 1);
      spark.setDepth(5);

      scene.tweens.add({
        targets: spark,
        y: startY - Phaser.Math.Between(25, 50),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(300, 450),
        ease: 'Cubic.easeOut',
        delay: Phaser.Math.Between(0, 100),
        onComplete: () => spark.destroy(),
      });
    }

    // Brief bright flash
    const flash = scene.add.arc(x, y, 8, 0, 360, false, 0xffffcc, 0.6);
    flash.setDepth(5);

    scene.tweens.add({
      targets: flash,
      radius: 24,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  // -------------------------------------------------------------------
  //  Enemy reached base
  // -------------------------------------------------------------------

  /**
   * Red flash/pulse at the base position when an enemy leaks through.
   */
  static enemyReachedBaseEffect(scene: Phaser.Scene, x: number, y: number): void {
    // Large red pulse ring
    const pulse = scene.add.arc(x, y, 10, 0, 360, false, 0xff2222, 0.4);
    pulse.setStrokeStyle(3, 0xff4444, 0.8);
    pulse.setDepth(5);

    scene.tweens.add({
      targets: pulse,
      radius: 50,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => pulse.destroy(),
    });

    // Brief red screen-edge overlay (rectangle with only border effect)
    const overlay = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      0xff0000,
      0.08,
    );
    overlay.setDepth(900); // Below HUD but above gameplay
    overlay.setScrollFactor(0);

    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => overlay.destroy(),
    });
  }

  // -------------------------------------------------------------------
  //  Projectile impact
  // -------------------------------------------------------------------

  /**
   * Small spray of 4-6 particles at a projectile's impact point.
   */
  static projectileImpactEffect(scene: Phaser.Scene, x: number, y: number, color: string): void {
    const colorInt = Phaser.Display.Color.HexStringToColor(color).color;
    const count = Phaser.Math.Between(4, 6);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(8, 20);
      const size = Phaser.Math.FloatBetween(1, 2.5);

      const dot = scene.add.arc(x, y, size, 0, 360, false, colorInt, 0.8);
      dot.setDepth(5);

      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(120, 200),
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
