import Phaser from 'phaser';
import { DIRECTION_SUFFIXES } from '../utils/direction';
import { TOWERS } from '../config/towers';
import { ENEMIES } from '../config/enemies';

/**
 * Sprite sizes per enemy type for directional texture generation.
 * These match the design doc specifications.
 */
export const ENEMY_SPRITE_SIZES: Record<string, { width: number; height: number }> = {
  drone:      { width: 28, height: 28 },
  skitter:    { width: 30, height: 20 },
  brute:      { width: 32, height: 40 },
  shielded:   { width: 28, height: 32 },
  swarm:      { width: 24, height: 24 },
  mini_drone: { width: 16, height: 16 },
};

/**
 * AssetGenerator -- Programmatically generates all game sprite textures
 * using Phaser's Graphics API during the boot phase.
 *
 * Each texture is drawn onto a Graphics object, then committed to the
 * texture manager via `graphics.generateTexture(key, width, height)`.
 *
 * Call `AssetGenerator.generateAll(scene)` from BootScene before any
 * other scene uses the textures.
 */
export class AssetGenerator {
  // -------------------------------------------------------------------
  //  Color utilities
  // -------------------------------------------------------------------

  /**
   * Safe per-component color adjustment (clamps each channel 0-255).
   * Prevents underflow/overflow when adjusting colors by adding or subtracting
   * values from each RGB component independently.
   */
  private static adjustColor(color: number, amount: number): number {
    const r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
    const g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
    return (r << 16) | (g << 8) | b;
  }

  // -------------------------------------------------------------------
  //  Public entry point
  // -------------------------------------------------------------------

  static generateAll(scene: Phaser.Scene): void {
    AssetGenerator.generateTowerTextures(scene);
    AssetGenerator.generateTowerIconTextures(scene);
    AssetGenerator.generateEnemyTextures(scene);
    AssetGenerator.generateTileTextures(scene);
    AssetGenerator.generateProjectileTextures(scene);
    AssetGenerator.generateIsoDiamondTiles(scene);
  }

  // -------------------------------------------------------------------
  //  Tower textures (40x40) -- 4 directional variants per tower type
  //  Naming: tower-{type}-{direction}  (e.g., tower-laser-south)
  //  Directions: south, southwest, west, northwest
  //  The other 4 directions (SE, E, NE, N) are achieved via flipX at runtime.
  // -------------------------------------------------------------------

  private static generateTowerTextures(scene: Phaser.Scene): void {
    const SIZE = 40;
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    const towerKeys = Object.keys(TOWERS);
    for (const towerKey of towerKeys) {
      const config = TOWERS[towerKey];
      const colorInt = Phaser.Display.Color.HexStringToColor(config.color).color;
      // Darker shade for far-side / shadow details
      const darkColor = Phaser.Display.Color.ValueToColor(colorInt).darken(30).color;
      // Lighter shade for near-side highlights
      const lightColor = Phaser.Display.Color.ValueToColor(colorInt).lighten(30).color;

      for (const dir of DIRECTION_SUFFIXES) {
        const g = scene.make.graphics({} as any);
        const textureKey = `tower-${towerKey}-${dir}`;

        switch (towerKey) {
          case 'laser':
            AssetGenerator.drawLaserTower(g, cx, cy, SIZE, dir, colorInt, darkColor, lightColor);
            break;
          case 'missile':
            AssetGenerator.drawMissileTower(g, cx, cy, SIZE, dir, colorInt, darkColor, lightColor);
            break;
          case 'cryo':
            AssetGenerator.drawCryoTower(g, cx, cy, SIZE, dir, colorInt, darkColor, lightColor);
            break;
          case 'railgun':
            AssetGenerator.drawRailgunTower(g, cx, cy, SIZE, dir, colorInt, darkColor, lightColor);
            break;
          case 'pulse':
            AssetGenerator.drawPulseTower(g, cx, cy, SIZE, dir, colorInt, darkColor, lightColor);
            break;
        }

        g.generateTexture(textureKey, SIZE, SIZE);
        g.destroy();
      }
    }
  }

  // -------------------------------------------------------------------
  //  Directional tower drawing helpers
  // -------------------------------------------------------------------

  /**
   * Laser: Cylindrical base with a rotating turret barrel on top.
   * The barrel points in the facing direction.
   */
  private static drawLaserTower(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, _size: number,
    dir: string, color: number, dark: number, light: number,
  ): void {
    // -- Cylindrical base (ellipse at bottom) --
    g.fillStyle(dark, 1);
    g.fillEllipse(cx, cy + 6, 26, 14);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeEllipse(cx, cy + 6, 26, 14);

    // -- Base body cylinder (rectangle + top ellipse) --
    g.fillStyle(color, 1);
    g.fillRect(cx - 12, cy - 4, 24, 12);
    g.fillEllipse(cx, cy - 4, 26, 12);
    g.lineStyle(1, 0x000000, 0.6);
    g.strokeEllipse(cx, cy - 4, 26, 12);

    // -- Turret barrel --
    g.lineStyle(1, 0x000000, 0.8);
    switch (dir) {
      case 'south':
        // Barrel points down toward camera (foreshortened, stubby)
        g.fillStyle(light, 1);
        // Short barrel body below the base
        g.fillRect(cx - 3, cy + 2, 6, 7);
        g.strokeRect(cx - 3, cy + 2, 6, 7);
        // Barrel opening (muzzle) at the tip
        g.fillStyle(0x111111, 0.9);
        g.fillEllipse(cx, cy + 9, 6, 4);
        g.strokeEllipse(cx, cy + 9, 6, 4);
        // Lens glow at tip
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx, cy + 9, 2.5);
        g.fillStyle(color, 0.6);
        g.fillCircle(cx, cy + 9, 1.5);
        break;
      case 'southwest':
        // Barrel angled down-left (3/4 view, shorter/thicker)
        g.fillStyle(light, 1);
        g.beginPath();
        g.moveTo(cx - 2, cy - 3);
        g.lineTo(cx + 2, cy - 1);
        g.lineTo(cx - 4, cy + 6);
        g.lineTo(cx - 8, cy + 4);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Lens glow
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx - 6, cy + 5, 2.5);
        break;
      case 'west':
        // Barrel points left (side profile)
        g.fillStyle(light, 1);
        g.fillRect(cx - 18, cy - 6, 18, 5);
        g.strokeRect(cx - 18, cy - 6, 18, 5);
        // Lens glow
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx - 18, cy - 4, 2.5);
        break;
      case 'northwest':
        // Barrel angled up-left (rear view)
        g.fillStyle(dark, 1);
        g.beginPath();
        g.moveTo(cx - 2, cy - 3);
        g.lineTo(cx + 2, cy - 5);
        g.lineTo(cx - 8, cy - 15);
        g.lineTo(cx - 12, cy - 13);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Back detail: vent lines on base
        g.lineStyle(1, dark, 0.6);
        g.beginPath();
        g.moveTo(cx - 8, cy + 2);
        g.lineTo(cx + 8, cy + 2);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx - 6, cy + 5);
        g.lineTo(cx + 6, cy + 5);
        g.strokePath();
        break;
    }

    // -- Near-side highlight edge --
    g.lineStyle(1, light, 0.3);
    g.beginPath();
    g.arc(cx, cy - 4, 12, Math.PI * 0.7, Math.PI * 1.3);
    g.strokePath();
  }

  /**
   * Missile: Boxy launcher platform with 2-4 angled launch tubes.
   * Tubes face the direction. Stocky, industrial silhouette.
   */
  private static drawMissileTower(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, _size: number,
    dir: string, color: number, dark: number, light: number,
  ): void {
    // -- Platform base (boxy) --
    g.fillStyle(dark, 1);
    g.fillRect(cx - 13, cy + 2, 26, 10);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeRect(cx - 13, cy + 2, 26, 10);

    // -- Main body box --
    g.fillStyle(color, 1);
    g.fillRect(cx - 11, cy - 8, 22, 14);
    g.lineStyle(1, 0x000000, 0.7);
    g.strokeRect(cx - 11, cy - 8, 22, 14);

    // -- Launch tubes based on direction --
    switch (dir) {
      case 'south': {
        // Tubes angled toward camera (down), 2 tubes visible
        g.fillStyle(light, 1);
        g.fillRect(cx - 8, cy - 10, 5, 18);
        g.fillRect(cx + 3, cy - 10, 5, 18);
        g.lineStyle(1, 0x000000, 0.8);
        g.strokeRect(cx - 8, cy - 10, 5, 18);
        g.strokeRect(cx + 3, cy - 10, 5, 18);
        // Tube openings (dark circles at tips)
        g.fillStyle(0x111111, 0.9);
        g.fillCircle(cx - 5.5, cy + 8, 2);
        g.fillCircle(cx + 5.5, cy + 8, 2);
        // Exhaust vents on top
        g.fillStyle(dark, 0.6);
        g.fillRect(cx - 3, cy - 12, 6, 3);
        break;
      }
      case 'southwest': {
        // Tubes angled down-left, 3-quarter view
        g.fillStyle(light, 1);
        // Left-front tube
        g.beginPath();
        g.moveTo(cx - 4, cy - 10);
        g.lineTo(cx, cy - 10);
        g.lineTo(cx - 10, cy + 6);
        g.lineTo(cx - 14, cy + 4);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.7);
        g.strokePath();
        // Right-rear tube (partially visible)
        g.fillStyle(color, 0.8);
        g.beginPath();
        g.moveTo(cx + 2, cy - 10);
        g.lineTo(cx + 6, cy - 10);
        g.lineTo(cx - 4, cy + 6);
        g.lineTo(cx - 8, cy + 4);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Side armor plate
        g.fillStyle(dark, 0.5);
        g.fillRect(cx + 7, cy - 6, 4, 10);
        break;
      }
      case 'west': {
        // Side profile: tubes pointing left
        g.fillStyle(light, 1);
        // Top tube
        g.fillRect(cx - 18, cy - 10, 16, 4);
        g.lineStyle(1, 0x000000, 0.7);
        g.strokeRect(cx - 18, cy - 10, 16, 4);
        // Bottom tube
        g.fillStyle(color, 0.9);
        g.fillRect(cx - 16, cy - 5, 14, 4);
        g.strokeRect(cx - 16, cy - 5, 14, 4);
        // Tube openings
        g.fillStyle(0x111111, 0.9);
        g.fillCircle(cx - 18, cy - 8, 1.5);
        g.fillCircle(cx - 16, cy - 3, 1.5);
        // Side armor detail
        g.lineStyle(1, dark, 0.5);
        g.beginPath();
        g.moveTo(cx + 6, cy - 6);
        g.lineTo(cx + 6, cy + 6);
        g.strokePath();
        break;
      }
      case 'northwest': {
        // Rear three-quarter: back vents visible, tubes angle up-left
        g.fillStyle(dark, 0.9);
        // Rear tube stub
        g.beginPath();
        g.moveTo(cx - 4, cy - 8);
        g.lineTo(cx, cy - 10);
        g.lineTo(cx - 8, cy - 16);
        g.lineTo(cx - 12, cy - 14);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.7);
        g.strokePath();
        // Back vents (horizontal lines)
        g.fillStyle(0x111111, 0.5);
        g.fillRect(cx - 8, cy, 16, 2);
        g.fillRect(cx - 6, cy + 4, 12, 2);
        g.fillRect(cx - 4, cy + 8, 8, 2);
        // Back panel
        g.lineStyle(1, dark, 0.4);
        g.beginPath();
        g.moveTo(cx - 9, cy - 6);
        g.lineTo(cx + 9, cy - 6);
        g.strokePath();
        break;
      }
    }
  }

  /**
   * Cryo: Hemisphere dome on a platform base. Frost vents/nozzles face direction.
   * Cool-toned highlights. Pipes run from base to dome.
   */
  private static drawCryoTower(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, _size: number,
    dir: string, color: number, dark: number, light: number,
  ): void {
    // -- Platform base --
    g.fillStyle(dark, 1);
    g.fillRect(cx - 14, cy + 4, 28, 8);
    g.lineStyle(1, 0x000000, 0.7);
    g.strokeRect(cx - 14, cy + 4, 28, 8);

    // -- Dome body (isometric: ellipse compressed vertically for 3D view) --
    // Draw as half-ellipse with isometric proportions (wider than tall)
    g.fillStyle(color, 0.9);
    const domeY = cy - 4;
    g.beginPath();
    // Upper arc of ellipse using multiple points for smoother curve
    // Isometric dome: 26px wide, ~16px tall (60% height ratio)
    for (let angle = Math.PI; angle >= 0; angle -= 0.1) {
      const px = cx + Math.cos(angle) * 13;
      const py = domeY + Math.sin(angle) * -8;  // 8px vertical radius (compressed)
      if (angle === Math.PI) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.lineTo(cx + 13, cy + 4);
    g.lineTo(cx - 13, cy + 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x000000, 0.7);
    g.strokePath();

    // -- Dome highlight (glass-like sheen on upper-left) --
    g.fillStyle(light, 0.3);
    g.beginPath();
    // Small arc on upper-left for shininess
    for (let angle = Math.PI * 1.1; angle >= Math.PI * 1.8; angle -= 0.15) {
      const px = cx - 3 + Math.cos(angle) * 6;
      const py = domeY - 3 + Math.sin(angle) * -4;
      if (angle === Math.PI * 1.1) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.lineTo(cx - 3, domeY - 3);
    g.closePath();
    g.fillPath();

    // -- Frost pipes from base to dome --
    g.lineStyle(2, dark, 0.7);
    g.beginPath();
    g.moveTo(cx - 8, cy + 4);
    g.lineTo(cx - 8, cy - 2);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx + 8, cy + 4);
    g.lineTo(cx + 8, cy - 2);
    g.strokePath();

    // -- Frost vents based on direction --
    g.lineStyle(1, 0x000000, 0.6);
    switch (dir) {
      case 'south': {
        // Nozzle pointing down/forward
        g.fillStyle(light, 0.9);
        g.beginPath();
        g.moveTo(cx - 4, cy + 1);
        g.lineTo(cx + 4, cy + 1);
        g.lineTo(cx + 6, cy + 10);
        g.lineTo(cx - 6, cy + 10);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Frost particles (dots)
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(cx - 3, cy + 13, 1.5);
        g.fillCircle(cx + 2, cy + 14, 1);
        g.fillCircle(cx + 4, cy + 12, 1.5);
        break;
      }
      case 'southwest': {
        // Nozzle angled down-left
        g.fillStyle(light, 0.9);
        g.beginPath();
        g.moveTo(cx - 3, cy);
        g.lineTo(cx + 1, cy + 3);
        g.lineTo(cx - 9, cy + 12);
        g.lineTo(cx - 13, cy + 9);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Frost particles
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(cx - 14, cy + 11, 1.5);
        g.fillCircle(cx - 11, cy + 14, 1);
        break;
      }
      case 'west': {
        // Nozzle pointing left (side profile)
        g.fillStyle(light, 0.9);
        g.beginPath();
        g.moveTo(cx - 6, cy - 3);
        g.lineTo(cx - 6, cy + 3);
        g.lineTo(cx - 16, cy + 5);
        g.lineTo(cx - 16, cy - 5);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Frost particles
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(cx - 18, cy - 2, 1.5);
        g.fillCircle(cx - 17, cy + 3, 1);
        g.fillCircle(cx - 19, cy + 1, 1);
        break;
      }
      case 'northwest': {
        // Nozzle angled up-left (rear view, nozzle partially hidden)
        g.fillStyle(dark, 0.8);
        g.beginPath();
        g.moveTo(cx - 2, cy - 2);
        g.lineTo(cx + 2, cy);
        g.lineTo(cx - 8, cy - 12);
        g.lineTo(cx - 12, cy - 10);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Back detail: coolant tank
        g.fillStyle(dark, 0.6);
        g.fillEllipse(cx + 4, cy + 2, 8, 6);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx + 4, cy + 2, 8, 6);
        break;
      }
    }
  }

  /**
   * Rail Gun: Long barrel on a tracked base. Barrel is the dominant feature.
   * Power coils/rings along the barrel. Most elongated silhouette.
   */
  private static drawRailgunTower(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, _size: number,
    dir: string, color: number, dark: number, light: number,
  ): void {
    // -- Tracked base (two small rectangles) --
    g.fillStyle(0x333333, 1);
    g.fillRect(cx - 14, cy + 6, 10, 6);
    g.fillRect(cx + 4, cy + 6, 10, 6);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeRect(cx - 14, cy + 6, 10, 6);
    g.strokeRect(cx + 4, cy + 6, 10, 6);
    // Track treads
    g.lineStyle(1, 0x555555, 0.6);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(cx - 13 + i * 4, cy + 7);
      g.lineTo(cx - 13 + i * 4, cy + 11);
      g.strokePath();
      g.beginPath();
      g.moveTo(cx + 5 + i * 4, cy + 7);
      g.lineTo(cx + 5 + i * 4, cy + 11);
      g.strokePath();
    }

    // -- Turret housing (compact box on base) --
    g.fillStyle(color, 1);
    g.fillRect(cx - 8, cy - 4, 16, 12);
    g.lineStyle(1, 0x000000, 0.7);
    g.strokeRect(cx - 8, cy - 4, 16, 12);

    // -- Energy core in housing --
    g.fillStyle(light, 0.6);
    g.fillCircle(cx, cy + 2, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(cx, cy + 2, 2);

    // -- Barrel based on direction --
    switch (dir) {
      case 'south': {
        // Barrel pointing down (toward camera) -- foreshortened
        g.fillStyle(light, 1);
        g.fillRect(cx - 3, cy - 6, 6, 18);
        g.lineStyle(1, 0x000000, 0.8);
        g.strokeRect(cx - 3, cy - 6, 6, 18);
        // Power coils (horizontal lines across barrel)
        g.lineStyle(2, color, 0.7);
        g.beginPath(); g.moveTo(cx - 4, cy - 2); g.lineTo(cx + 4, cy - 2); g.strokePath();
        g.beginPath(); g.moveTo(cx - 4, cy + 3); g.lineTo(cx + 4, cy + 3); g.strokePath();
        g.beginPath(); g.moveTo(cx - 4, cy + 8); g.lineTo(cx + 4, cy + 8); g.strokePath();
        // Muzzle flash dot
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx, cy + 12, 2);
        break;
      }
      case 'southwest': {
        // Barrel angled down-left
        g.fillStyle(light, 1);
        g.beginPath();
        g.moveTo(cx - 1, cy - 6);
        g.lineTo(cx + 3, cy - 4);
        g.lineTo(cx - 13, cy + 10);
        g.lineTo(cx - 17, cy + 8);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.8);
        g.strokePath();
        // Power coils along barrel
        g.lineStyle(2, color, 0.6);
        g.beginPath(); g.moveTo(cx - 3, cy); g.lineTo(cx + 1, cy + 2); g.strokePath();
        g.beginPath(); g.moveTo(cx - 7, cy + 4); g.lineTo(cx - 3, cy + 6); g.strokePath();
        break;
      }
      case 'west': {
        // Barrel pointing left -- full length side profile (dominant feature)
        g.fillStyle(light, 1);
        g.fillRect(cx - 19, cy - 6, 24, 5);
        g.lineStyle(1, 0x000000, 0.8);
        g.strokeRect(cx - 19, cy - 6, 24, 5);
        // Power coils (vertical rings)
        g.lineStyle(2, color, 0.6);
        g.beginPath(); g.moveTo(cx - 4, cy - 7); g.lineTo(cx - 4, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx - 9, cy - 7); g.lineTo(cx - 9, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx - 14, cy - 7); g.lineTo(cx - 14, cy); g.strokePath();
        // Muzzle
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx - 19, cy - 4, 2);
        break;
      }
      case 'northwest': {
        // Barrel angled up-left (rear view)
        g.fillStyle(dark, 0.9);
        g.beginPath();
        g.moveTo(cx - 1, cy - 4);
        g.lineTo(cx + 3, cy - 6);
        g.lineTo(cx - 11, cy - 18);
        g.lineTo(cx - 15, cy - 16);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.8);
        g.strokePath();
        // Power coils
        g.lineStyle(2, color, 0.5);
        g.beginPath(); g.moveTo(cx - 3, cy - 8); g.lineTo(cx + 1, cy - 10); g.strokePath();
        g.beginPath(); g.moveTo(cx - 7, cy - 12); g.lineTo(cx - 3, cy - 14); g.strokePath();
        // Rear exhaust port
        g.fillStyle(0x111111, 0.6);
        g.fillCircle(cx + 2, cy + 4, 3);
        g.lineStyle(1, dark, 0.4);
        g.strokeCircle(cx + 2, cy + 4, 3);
        break;
      }
    }
  }

  /**
   * Pulse: Concentric ring emitter on a central pylon. Antenna spokes radiate outward.
   * Rings tilt to face the target direction. Sci-fi glow from center.
   */
  private static drawPulseTower(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, _size: number,
    dir: string, color: number, dark: number, light: number,
  ): void {
    // -- Central pylon (vertical column) --
    g.fillStyle(dark, 1);
    g.fillRect(cx - 4, cy - 8, 8, 18);
    g.lineStyle(1, 0x000000, 0.7);
    g.strokeRect(cx - 4, cy - 8, 8, 18);

    // -- Pylon cap --
    g.fillStyle(color, 1);
    g.fillEllipse(cx, cy - 8, 14, 8);
    g.lineStyle(1, 0x000000, 0.6);
    g.strokeEllipse(cx, cy - 8, 14, 8);

    // -- Center energy core --
    g.fillStyle(color, 0.7);
    g.fillCircle(cx, cy - 6, 4);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(cx, cy - 6, 2);

    // -- Antenna spokes (4 directions, always visible) --
    g.lineStyle(2, color, 0.5);
    const spokeLen = 8;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      g.beginPath();
      g.moveTo(cx + 5 * Math.cos(angle), cy - 6 + 5 * Math.sin(angle));
      g.lineTo(cx + (5 + spokeLen) * Math.cos(angle), cy - 6 + (5 + spokeLen) * Math.sin(angle));
      g.strokePath();
    }

    // -- Emitter rings based on direction (tilted perspective) --
    g.lineStyle(2, light, 0.5);
    switch (dir) {
      case 'south': {
        // Rings face camera: wide ellipses
        g.strokeEllipse(cx, cy - 2, 28, 10);
        g.lineStyle(1, color, 0.4);
        g.strokeEllipse(cx, cy + 2, 34, 12);
        // Glow downward
        g.fillStyle(color, 0.2);
        g.fillEllipse(cx, cy + 6, 20, 8);
        break;
      }
      case 'southwest': {
        // Rings tilted toward down-left (drawn as manual rotated ellipses)
        AssetGenerator.strokeRotatedEllipse(g, cx - 4, cy, 14, 7, -30);
        g.lineStyle(1, color, 0.3);
        AssetGenerator.strokeRotatedEllipse(g, cx - 6, cy + 3, 18, 8, -30);
        // Glow
        g.fillStyle(color, 0.15);
        g.fillCircle(cx - 8, cy + 6, 6);
        break;
      }
      case 'west': {
        // Rings tilted to face left (narrow vertical ellipses)
        g.strokeEllipse(cx - 6, cy - 4, 10, 22);
        g.lineStyle(1, color, 0.3);
        g.strokeEllipse(cx - 10, cy - 4, 12, 26);
        // Glow left
        g.fillStyle(color, 0.15);
        g.fillCircle(cx - 12, cy - 4, 5);
        break;
      }
      case 'northwest': {
        // Rings tilted up-left (rear view, drawn as manual rotated ellipses)
        AssetGenerator.strokeRotatedEllipse(g, cx - 4, cy - 8, 14, 7, 30);
        g.lineStyle(1, color, 0.3);
        AssetGenerator.strokeRotatedEllipse(g, cx - 6, cy - 11, 18, 8, 30);
        // Back detail: power conduit
        g.fillStyle(dark, 0.5);
        g.fillRect(cx - 2, cy + 2, 4, 8);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 2, cy + 2, 4, 8);
        break;
      }
    }

    // -- Base mounting ring --
    g.lineStyle(1, dark, 0.6);
    g.strokeEllipse(cx, cy + 10, 22, 8);
  }

  /**
   * Draws a rotated ellipse outline using manual path points.
   * Phaser Graphics lacks a native rotated ellipse method, so we approximate
   * with 24 line segments around the ellipse perimeter.
   */
  private static strokeRotatedEllipse(
    g: Phaser.GameObjects.Graphics,
    ecx: number, ecy: number,
    rx: number, ry: number,
    angleDeg: number,
    segments: number = 24,
  ): void {
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    g.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const px = rx * Math.cos(t);
      const py = ry * Math.sin(t);
      // Rotate point by angle
      const sx = ecx + px * cosA - py * sinA;
      const sy = ecy + px * sinA + py * cosA;
      if (i === 0) {
        g.moveTo(sx, sy);
      } else {
        g.lineTo(sx, sy);
      }
    }
    g.closePath();
    g.strokePath();
  }

  // -------------------------------------------------------------------
  //  Tower icon textures (32x32) for the tower picker
  // -------------------------------------------------------------------

  private static generateTowerIconTextures(scene: Phaser.Scene): void {
    const SIZE = 32;

    // ---- icon-tower-laser: simplified green hexagon ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      const r = 13;

      g.fillStyle(0x00cc66, 1);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0x00ff88, 0.9);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();

      g.fillStyle(0x00ff88, 0.4);
      g.fillCircle(cx, cy, 4);

      g.generateTexture('icon-tower-laser', SIZE, SIZE);
      g.destroy();
    }

    // ---- icon-tower-missile: simplified red octagon ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      const r = 13;

      g.fillStyle(0xcc4422, 1);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0xff6644, 0.9);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();

      g.fillStyle(0xff6644, 0.5);
      g.fillCircle(cx, cy, 3);

      g.generateTexture('icon-tower-missile', SIZE, SIZE);
      g.destroy();
    }

    // ---- icon-tower-cryo: simplified blue diamond ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0x2288cc, 1);
      g.beginPath();
      g.moveTo(cx, cy - 14);
      g.lineTo(cx + 12, cy);
      g.lineTo(cx, cy + 14);
      g.lineTo(cx - 12, cy);
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0x44ccff, 0.9);
      g.beginPath();
      g.moveTo(cx, cy - 14);
      g.lineTo(cx + 12, cy);
      g.lineTo(cx, cy + 14);
      g.lineTo(cx - 12, cy);
      g.closePath();
      g.strokePath();

      g.fillStyle(0xaaeeff, 0.4);
      g.fillCircle(cx, cy, 3);

      g.generateTexture('icon-tower-cryo', SIZE, SIZE);
      g.destroy();
    }

    // ---- icon-tower-railgun: simplified yellow angular shape ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0xcc9900, 1);
      g.beginPath();
      g.moveTo(cx, cy - 13);
      g.lineTo(cx + 11, cy - 5);
      g.lineTo(cx + 11, cy + 8);
      g.lineTo(cx, cy + 13);
      g.lineTo(cx - 11, cy + 8);
      g.lineTo(cx - 11, cy - 5);
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0xffcc00, 0.9);
      g.beginPath();
      g.moveTo(cx, cy - 13);
      g.lineTo(cx + 11, cy - 5);
      g.lineTo(cx + 11, cy + 8);
      g.lineTo(cx, cy + 13);
      g.lineTo(cx - 11, cy + 8);
      g.lineTo(cx - 11, cy - 5);
      g.closePath();
      g.strokePath();

      // Barrel
      g.lineStyle(2, 0xffdd44, 0.8);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx, cy - 11);
      g.strokePath();

      g.generateTexture('icon-tower-railgun', SIZE, SIZE);
      g.destroy();
    }

    // ---- icon-tower-pulse: simplified purple circle ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0x9922cc, 1);
      g.fillCircle(cx, cy, 13);

      g.lineStyle(1, 0xcc44ff, 0.9);
      g.strokeCircle(cx, cy, 13);

      g.lineStyle(1, 0xdd66ff, 0.5);
      g.strokeCircle(cx, cy, 9);

      g.fillStyle(0xee99ff, 0.6);
      g.fillCircle(cx, cy, 3);

      g.generateTexture('icon-tower-pulse', SIZE, SIZE);
      g.destroy();
    }
  }

  // -------------------------------------------------------------------
  //  Enemy textures -- 4 directional variants per enemy type
  //  Naming: enemy-{type}-{direction}  (e.g., enemy-drone-south)
  //  Directions: south, southwest, west, northwest
  //  The other 4 directions (SE, E, NE, N) are achieved via flipX at runtime.
  // -------------------------------------------------------------------

  private static generateEnemyTextures(scene: Phaser.Scene): void {
    const enemyKeys = Object.keys(ENEMIES);

    for (const enemyKey of enemyKeys) {
      const config = ENEMIES[enemyKey];
      const colorInt = Phaser.Display.Color.HexStringToColor(config.color).color;
      const darkColor = Phaser.Display.Color.ValueToColor(colorInt).darken(30).color;
      const lightColor = Phaser.Display.Color.ValueToColor(colorInt).lighten(30).color;
      // Texture key uses hyphens (mini_drone -> mini-drone)
      const texturePrefix = `enemy-${enemyKey.replace(/_/g, '-')}`;
      const spriteSize = ENEMY_SPRITE_SIZES[enemyKey] ?? { width: 24, height: 24 };

      for (const dir of DIRECTION_SUFFIXES) {
        const g = scene.make.graphics({} as any);
        const textureKey = `${texturePrefix}-${dir}`;
        const w = spriteSize.width;
        const h = spriteSize.height;
        const cx = w / 2;
        const cy = h / 2;

        switch (enemyKey) {
          case 'drone':
            AssetGenerator.drawDroneEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
          case 'skitter':
            AssetGenerator.drawSkitterEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
          case 'brute':
            AssetGenerator.drawBruteEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
          case 'shielded':
            AssetGenerator.drawShieldedEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
          case 'swarm':
            AssetGenerator.drawSwarmEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
          case 'mini_drone':
            AssetGenerator.drawMiniDroneEnemy(g, cx, cy, w, h, dir, colorInt, darkColor, lightColor);
            break;
        }

        g.generateTexture(textureKey, w, h);
        g.destroy();
      }
    }
  }

  // -------------------------------------------------------------------
  //  Directional enemy drawing helpers
  // -------------------------------------------------------------------

  /**
   * Drone: Small hovering saucer. Domed top, flat underside with glow.
   * Thin antennae. Hover gap suggests flight. (28x28)
   */
  private static drawDroneEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    switch (dir) {
      case 'south': {
        // Front-facing: full dome, underside glow visible
        // Dome (top half-ellipse)
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx, cy - 2, 10, Math.PI, 0);
        g.lineTo(cx + 10, cy + 2);
        g.lineTo(cx - 10, cy + 2);
        g.closePath();
        g.fillPath();
        // Dome highlight
        g.fillStyle(light, 0.3);
        g.beginPath();
        g.arc(cx, cy - 4, 6, Math.PI * 1.1, Math.PI * 1.8);
        g.lineTo(cx, cy - 4);
        g.closePath();
        g.fillPath();
        // Flat underside
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 3, 22, 8);
        g.lineStyle(1, 0x000000, 0.6);
        g.strokeEllipse(cx, cy + 3, 22, 8);
        // Underside glow
        g.fillStyle(light, 0.4);
        g.fillEllipse(cx, cy + 4, 12, 4);
        // Antennae (symmetrical for front view)
        g.lineStyle(1, dark, 0.7);
        g.beginPath(); g.moveTo(cx - 4, cy - 10); g.lineTo(cx - 6, cy - 14); g.strokePath();
        g.beginPath(); g.moveTo(cx + 4, cy - 10); g.lineTo(cx + 6, cy - 14); g.strokePath();
        // Antenna tips
        g.fillStyle(light, 0.8);
        g.fillCircle(cx - 6, cy - 14, 1);
        g.fillCircle(cx + 6, cy - 14, 1);
        // Outline
        g.lineStyle(1, 0x000000, 0.5);
        g.beginPath();
        g.arc(cx, cy - 2, 10, Math.PI, 0);
        g.strokePath();
        break;
      }
      case 'southwest': {
        // Three-quarter front-left: dome offset, one antenna more prominent
        // Far-side body (dark)
        g.fillStyle(dark, 0.8);
        g.fillEllipse(cx + 2, cy + 2, 18, 8);
        // Near-side dome
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx - 1, cy - 2, 10, Math.PI, 0);
        g.lineTo(cx + 9, cy + 1);
        g.lineTo(cx - 11, cy + 1);
        g.closePath();
        g.fillPath();
        // Dome highlight (near side, left)
        g.fillStyle(light, 0.3);
        g.beginPath();
        g.arc(cx - 4, cy - 4, 5, Math.PI * 1.2, Math.PI * 1.7);
        g.lineTo(cx - 4, cy - 4);
        g.closePath();
        g.fillPath();
        // Underside
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 3, 20, 7);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx, cy + 3, 20, 7);
        // Underside glow (offset left)
        g.fillStyle(light, 0.3);
        g.fillEllipse(cx - 2, cy + 3, 10, 4);
        // Left antenna (prominent)
        g.lineStyle(1, dark, 0.7);
        g.beginPath(); g.moveTo(cx - 6, cy - 10); g.lineTo(cx - 10, cy - 14); g.strokePath();
        g.fillStyle(light, 0.8);
        g.fillCircle(cx - 10, cy - 14, 1);
        // Right antenna (partially hidden)
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx + 3, cy - 10); g.lineTo(cx + 5, cy - 13); g.strokePath();
        // Outline
        g.lineStyle(1, 0x000000, 0.4);
        g.beginPath();
        g.arc(cx - 1, cy - 2, 10, Math.PI, 0);
        g.strokePath();
        break;
      }
      case 'west': {
        // Side profile: dome profile, single antenna, underside edge
        // Far-side shadow
        g.fillStyle(dark, 0.5);
        g.fillEllipse(cx + 2, cy + 2, 14, 7);
        // Dome side profile
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx, cy - 1, 10, Math.PI, 0);
        g.lineTo(cx + 10, cy + 2);
        g.lineTo(cx - 10, cy + 2);
        g.closePath();
        g.fillPath();
        // Near-side highlight (left half is near)
        g.fillStyle(light, 0.25);
        g.fillRect(cx - 10, cy - 8, 10, 10);
        // Dark far side
        g.fillStyle(dark, 0.2);
        g.fillRect(cx, cy - 8, 10, 10);
        // Underside strip
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 3, 20, 6);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx, cy + 3, 20, 6);
        // Antenna (one, left side)
        g.lineStyle(1, dark, 0.7);
        g.beginPath(); g.moveTo(cx - 2, cy - 10); g.lineTo(cx - 6, cy - 14); g.strokePath();
        g.fillStyle(light, 0.8);
        g.fillCircle(cx - 6, cy - 14, 1);
        // Outline
        g.lineStyle(1, 0x000000, 0.5);
        g.beginPath();
        g.arc(cx, cy - 1, 10, Math.PI, 0);
        g.strokePath();
        break;
      }
      case 'northwest': {
        // Three-quarter rear: back of dome, antenna behind, underside visible
        // Back of dome (darker)
        g.fillStyle(dark, 1);
        g.beginPath();
        g.arc(cx + 1, cy - 2, 10, Math.PI, 0);
        g.lineTo(cx + 11, cy + 1);
        g.lineTo(cx - 9, cy + 1);
        g.closePath();
        g.fillPath();
        // Slight near-side edge highlight
        g.fillStyle(color, 0.5);
        g.beginPath();
        g.arc(cx - 2, cy - 2, 8, Math.PI * 1.0, Math.PI * 1.5);
        g.lineTo(cx - 2, cy - 2);
        g.closePath();
        g.fillPath();
        // Underside
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 3, 20, 7);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx, cy + 3, 20, 7);
        // Underside glow (faint from rear)
        g.fillStyle(light, 0.15);
        g.fillEllipse(cx, cy + 4, 8, 3);
        // Antenna (visible but from behind)
        g.lineStyle(1, dark, 0.5);
        g.beginPath(); g.moveTo(cx - 4, cy - 10); g.lineTo(cx - 8, cy - 13); g.strokePath();
        // Back detail: exhaust vent
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx + 3, cy, 4, 3);
        // Outline
        g.lineStyle(1, 0x000000, 0.4);
        g.beginPath();
        g.arc(cx + 1, cy - 2, 10, Math.PI, 0);
        g.strokePath();
        break;
      }
    }
  }

  /**
   * Skitter: Low insectoid. Elongated body with 4-6 legs per side.
   * Fast, menacing silhouette. (30x20)
   */
  private static drawSkitterEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    switch (dir) {
      case 'south': {
        // Front-facing: oval body, legs splayed outward, eyes visible
        // Body (elongated oval heading toward camera)
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy, 16, 14);
        // Far-side shading
        g.fillStyle(dark, 0.3);
        g.fillEllipse(cx, cy - 2, 14, 8);
        // Near-side highlight
        g.fillStyle(light, 0.2);
        g.fillEllipse(cx, cy + 2, 10, 6);
        // Outline
        g.lineStyle(1, 0x000000, 0.6);
        g.strokeEllipse(cx, cy, 16, 14);
        // Legs (3 pairs, splayed outward)
        g.lineStyle(1.5, dark, 0.8);
        // Front legs
        g.beginPath(); g.moveTo(cx - 6, cy - 2); g.lineTo(cx - 13, cy - 6); g.strokePath();
        g.beginPath(); g.moveTo(cx + 6, cy - 2); g.lineTo(cx + 13, cy - 6); g.strokePath();
        // Mid legs
        g.beginPath(); g.moveTo(cx - 7, cy + 1); g.lineTo(cx - 14, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx + 7, cy + 1); g.lineTo(cx + 14, cy); g.strokePath();
        // Rear legs
        g.beginPath(); g.moveTo(cx - 6, cy + 4); g.lineTo(cx - 12, cy + 7); g.strokePath();
        g.beginPath(); g.moveTo(cx + 6, cy + 4); g.lineTo(cx + 12, cy + 7); g.strokePath();
        // Eyes
        g.fillStyle(light, 0.9);
        g.fillCircle(cx - 3, cy - 5, 1.5);
        g.fillCircle(cx + 3, cy - 5, 1.5);
        g.fillStyle(0x000000, 0.8);
        g.fillCircle(cx - 3, cy - 5, 0.7);
        g.fillCircle(cx + 3, cy - 5, 0.7);
        break;
      }
      case 'southwest': {
        // Three-quarter: body angled, near-side legs visible, far-side legs behind
        // Body (angled oval)
        g.fillStyle(dark, 0.7);
        g.fillEllipse(cx + 2, cy + 1, 14, 12);
        g.fillStyle(color, 1);
        g.fillEllipse(cx - 1, cy, 16, 13);
        // Near-side highlight
        g.fillStyle(light, 0.2);
        g.beginPath();
        g.arc(cx - 4, cy + 1, 5, 0, Math.PI);
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx - 1, cy, 16, 13);
        // Near-side legs (left, prominent)
        g.lineStyle(1.5, dark, 0.9);
        g.beginPath(); g.moveTo(cx - 6, cy - 3); g.lineTo(cx - 14, cy - 7); g.strokePath();
        g.beginPath(); g.moveTo(cx - 7, cy); g.lineTo(cx - 15, cy - 1); g.strokePath();
        g.beginPath(); g.moveTo(cx - 6, cy + 4); g.lineTo(cx - 13, cy + 6); g.strokePath();
        // Far-side legs (right, subdued)
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx + 5, cy - 2); g.lineTo(cx + 10, cy - 5); g.strokePath();
        g.beginPath(); g.moveTo(cx + 6, cy + 2); g.lineTo(cx + 11, cy + 1); g.strokePath();
        // Eye (near side)
        g.fillStyle(light, 0.9);
        g.fillCircle(cx - 4, cy - 5, 1.5);
        g.fillStyle(0x000000, 0.8);
        g.fillCircle(cx - 4, cy - 5, 0.7);
        break;
      }
      case 'west': {
        // Side profile: elongated body horizontal, legs below
        // Body (long horizontal oval)
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy - 1, 22, 10);
        // Near-side shading
        g.fillStyle(light, 0.15);
        g.fillEllipse(cx - 2, cy - 3, 18, 5);
        // Far-side shadow
        g.fillStyle(dark, 0.2);
        g.fillEllipse(cx + 2, cy + 1, 18, 5);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx, cy - 1, 22, 10);
        // Legs (all on near side, 4 visible)
        g.lineStyle(1.5, dark, 0.8);
        g.beginPath(); g.moveTo(cx - 7, cy + 3); g.lineTo(cx - 10, cy + 8); g.strokePath();
        g.beginPath(); g.moveTo(cx - 3, cy + 3); g.lineTo(cx - 5, cy + 9); g.strokePath();
        g.beginPath(); g.moveTo(cx + 2, cy + 3); g.lineTo(cx + 1, cy + 9); g.strokePath();
        g.beginPath(); g.moveTo(cx + 6, cy + 3); g.lineTo(cx + 5, cy + 8); g.strokePath();
        // Mandibles at front (left)
        g.lineStyle(1, dark, 0.7);
        g.beginPath(); g.moveTo(cx - 10, cy - 2); g.lineTo(cx - 14, cy - 4); g.strokePath();
        g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx - 14, cy + 1); g.strokePath();
        // Eye
        g.fillStyle(light, 0.9);
        g.fillCircle(cx - 8, cy - 3, 1.5);
        g.fillStyle(0x000000, 0.8);
        g.fillCircle(cx - 8, cy - 3, 0.7);
        break;
      }
      case 'northwest': {
        // Three-quarter rear: back of body, far legs, tail end prominent
        // Body (angled away)
        g.fillStyle(dark, 1);
        g.fillEllipse(cx + 1, cy, 16, 13);
        // Lighter near edge
        g.fillStyle(color, 0.6);
        g.beginPath();
        g.arc(cx - 3, cy - 1, 6, Math.PI, 0);
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx + 1, cy, 16, 13);
        // Near-side legs (left, from behind)
        g.lineStyle(1.5, dark, 0.7);
        g.beginPath(); g.moveTo(cx - 5, cy - 3); g.lineTo(cx - 13, cy - 6); g.strokePath();
        g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx - 14, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx - 5, cy + 4); g.lineTo(cx - 12, cy + 6); g.strokePath();
        // Far-side legs (faint)
        g.lineStyle(1, dark, 0.3);
        g.beginPath(); g.moveTo(cx + 5, cy - 2); g.lineTo(cx + 10, cy - 5); g.strokePath();
        g.beginPath(); g.moveTo(cx + 6, cy + 3); g.lineTo(cx + 10, cy + 5); g.strokePath();
        // Tail ridge
        g.lineStyle(1, dark, 0.5);
        g.beginPath(); g.moveTo(cx + 5, cy - 3); g.lineTo(cx + 9, cy - 1); g.lineTo(cx + 5, cy + 2); g.strokePath();
        break;
      }
    }
  }

  /**
   * Brute: Hulking bipedal form. Broad shoulders, thick legs, heavy stance.
   * Arms hang low. Largest enemy sprite. (32x40)
   */
  private static drawBruteEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    switch (dir) {
      case 'south': {
        // Front-facing: wide shoulders, thick legs, eye slit
        // Thick legs
        g.fillStyle(dark, 1);
        g.fillRect(cx - 8, cy + 6, 6, 12);
        g.fillRect(cx + 2, cy + 6, 6, 12);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 8, cy + 6, 6, 12);
        g.strokeRect(cx + 2, cy + 6, 6, 12);
        // Torso (broad)
        g.fillStyle(color, 1);
        g.fillRect(cx - 12, cy - 10, 24, 18);
        g.lineStyle(1, 0x000000, 0.6);
        g.strokeRect(cx - 12, cy - 10, 24, 18);
        // Shoulder plates
        g.fillStyle(light, 0.4);
        g.fillRect(cx - 14, cy - 12, 8, 8);
        g.fillRect(cx + 6, cy - 12, 8, 8);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 14, cy - 12, 8, 8);
        g.strokeRect(cx + 6, cy - 12, 8, 8);
        // Head (small, sits on shoulders)
        g.fillStyle(dark, 1);
        g.fillRect(cx - 5, cy - 18, 10, 8);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 5, cy - 18, 10, 8);
        // Eye slit
        g.fillStyle(light, 0.9);
        g.fillRect(cx - 4, cy - 15, 8, 2);
        // Armor plating lines on torso
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx - 10, cy - 4); g.lineTo(cx + 10, cy - 4); g.strokePath();
        g.beginPath(); g.moveTo(cx - 10, cy + 2); g.lineTo(cx + 10, cy + 2); g.strokePath();
        // Arms (hanging at sides)
        g.fillStyle(dark, 0.8);
        g.fillRect(cx - 15, cy - 6, 4, 14);
        g.fillRect(cx + 11, cy - 6, 4, 14);
        break;
      }
      case 'southwest': {
        // Three-quarter front-left: shoulder offset, one leg forward
        // Far leg (behind)
        g.fillStyle(dark, 0.7);
        g.fillRect(cx + 1, cy + 6, 6, 12);
        // Near leg (front, left)
        g.fillStyle(dark, 1);
        g.fillRect(cx - 7, cy + 7, 6, 12);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 7, cy + 7, 6, 12);
        // Torso
        g.fillStyle(color, 1);
        g.fillRect(cx - 11, cy - 10, 22, 18);
        // Far side shading
        g.fillStyle(dark, 0.25);
        g.fillRect(cx + 3, cy - 10, 8, 18);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 11, cy - 10, 22, 18);
        // Near shoulder plate (left, prominent)
        g.fillStyle(light, 0.5);
        g.fillRect(cx - 14, cy - 13, 9, 8);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 14, cy - 13, 9, 8);
        // Far shoulder (subdued)
        g.fillStyle(dark, 0.5);
        g.fillRect(cx + 5, cy - 11, 7, 6);
        // Head
        g.fillStyle(dark, 1);
        g.fillRect(cx - 5, cy - 18, 9, 7);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 5, cy - 18, 9, 7);
        // Eye slit
        g.fillStyle(light, 0.8);
        g.fillRect(cx - 4, cy - 15, 6, 2);
        // Near arm
        g.fillStyle(dark, 0.8);
        g.fillRect(cx - 15, cy - 6, 4, 14);
        // Armor lines
        g.lineStyle(1, dark, 0.3);
        g.beginPath(); g.moveTo(cx - 9, cy - 3); g.lineTo(cx + 8, cy - 3); g.strokePath();
        break;
      }
      case 'west': {
        // Side profile: full silhouette, one arm visible, legs in stride
        // Far leg
        g.fillStyle(dark, 0.6);
        g.fillRect(cx + 1, cy + 5, 5, 13);
        // Near leg
        g.fillStyle(dark, 1);
        g.fillRect(cx - 5, cy + 6, 5, 13);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 5, cy + 6, 5, 13);
        // Torso (narrower from side)
        g.fillStyle(color, 1);
        g.fillRect(cx - 8, cy - 10, 16, 18);
        // Near-side light
        g.fillStyle(light, 0.15);
        g.fillRect(cx - 8, cy - 10, 8, 18);
        // Far-side dark
        g.fillStyle(dark, 0.2);
        g.fillRect(cx, cy - 10, 8, 18);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 8, cy - 10, 16, 18);
        // Shoulder plate (side view)
        g.fillStyle(light, 0.4);
        g.fillRect(cx - 10, cy - 13, 6, 8);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 10, cy - 13, 6, 8);
        // Head (side)
        g.fillStyle(dark, 1);
        g.fillRect(cx - 5, cy - 18, 8, 7);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 5, cy - 18, 8, 7);
        // Eye (single dot from side)
        g.fillStyle(light, 0.9);
        g.fillCircle(cx - 3, cy - 15, 1.5);
        // Arm (near side)
        g.fillStyle(dark, 0.8);
        g.fillRect(cx - 11, cy - 5, 4, 14);
        // Back armor ridge
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx + 7, cy - 8); g.lineTo(cx + 7, cy + 6); g.strokePath();
        break;
      }
      case 'northwest': {
        // Three-quarter rear: wide back, shoulder plates from behind
        // Far leg
        g.fillStyle(dark, 0.6);
        g.fillRect(cx - 6, cy + 6, 5, 12);
        // Near leg
        g.fillStyle(dark, 0.9);
        g.fillRect(cx + 2, cy + 7, 5, 12);
        // Torso (back view)
        g.fillStyle(dark, 1);
        g.fillRect(cx - 11, cy - 10, 22, 18);
        // Lighter near edge (left side from behind is right on screen)
        g.fillStyle(color, 0.4);
        g.fillRect(cx - 11, cy - 10, 8, 18);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(cx - 11, cy - 10, 22, 18);
        // Shoulder plates (from behind)
        g.fillStyle(dark, 0.7);
        g.fillRect(cx - 13, cy - 12, 8, 7);
        g.fillRect(cx + 5, cy - 13, 8, 8);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 13, cy - 12, 8, 7);
        g.strokeRect(cx + 5, cy - 13, 8, 8);
        // Head (back of head)
        g.fillStyle(dark, 0.9);
        g.fillRect(cx - 4, cy - 18, 8, 7);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeRect(cx - 4, cy - 18, 8, 7);
        // Back spine ridge
        g.lineStyle(2, 0x000000, 0.3);
        g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx, cy + 4); g.strokePath();
        // Back vent slits
        g.lineStyle(1, 0x000000, 0.3);
        g.beginPath(); g.moveTo(cx - 8, cy - 2); g.lineTo(cx + 8, cy - 2); g.strokePath();
        g.beginPath(); g.moveTo(cx - 6, cy + 3); g.lineTo(cx + 6, cy + 3); g.strokePath();
        // Near arm (faint, from behind)
        g.fillStyle(dark, 0.5);
        g.fillRect(cx - 14, cy - 6, 3, 12);
        break;
      }
    }
  }

  /**
   * Shielded: Armored walker with carapace plates. Similar proportions to Drone
   * but with angular armor segments. Shield visual is a translucent arc. (28x32)
   */
  private static drawShieldedEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    switch (dir) {
      case 'south': {
        // Front-facing: angular body, carapace plates visible, shield arc at front
        // Legs (short, armored)
        g.fillStyle(dark, 1);
        g.fillRect(cx - 6, cy + 6, 4, 8);
        g.fillRect(cx + 2, cy + 6, 4, 8);
        // Main body (angular pentagon shape)
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(cx, cy - 12);
        g.lineTo(cx + 10, cy - 4);
        g.lineTo(cx + 8, cy + 6);
        g.lineTo(cx - 8, cy + 6);
        g.lineTo(cx - 10, cy - 4);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0x000000, 0.6);
        g.strokePath();
        // Carapace plate lines (angular)
        g.lineStyle(1, dark, 0.5);
        g.beginPath(); g.moveTo(cx - 8, cy - 2); g.lineTo(cx, cy - 6); g.lineTo(cx + 8, cy - 2); g.strokePath();
        g.beginPath(); g.moveTo(cx - 6, cy + 2); g.lineTo(cx, cy - 1); g.lineTo(cx + 6, cy + 2); g.strokePath();
        // Visor/eyes
        g.fillStyle(light, 0.8);
        g.fillRect(cx - 5, cy - 8, 10, 3);
        // Shoulder armor points
        g.fillStyle(light, 0.3);
        g.beginPath();
        g.moveTo(cx - 10, cy - 4);
        g.lineTo(cx - 13, cy - 6);
        g.lineTo(cx - 10, cy - 8);
        g.closePath();
        g.fillPath();
        g.beginPath();
        g.moveTo(cx + 10, cy - 4);
        g.lineTo(cx + 13, cy - 6);
        g.lineTo(cx + 10, cy - 8);
        g.closePath();
        g.fillPath();
        // Shield arc (translucent, front)
        g.lineStyle(2, light, 0.4);
        g.beginPath();
        g.arc(cx, cy, 13, Math.PI * 1.2, Math.PI * 1.8);
        g.strokePath();
        g.lineStyle(1, light, 0.2);
        g.beginPath();
        g.arc(cx, cy, 15, Math.PI * 1.25, Math.PI * 1.75);
        g.strokePath();
        break;
      }
      case 'southwest': {
        // Three-quarter: angular body angled, near-side armor more visible
        // Far leg
        g.fillStyle(dark, 0.6);
        g.fillRect(cx + 1, cy + 6, 4, 8);
        // Near leg
        g.fillStyle(dark, 1);
        g.fillRect(cx - 6, cy + 7, 4, 8);
        // Body
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(cx - 1, cy - 12);
        g.lineTo(cx + 9, cy - 5);
        g.lineTo(cx + 7, cy + 6);
        g.lineTo(cx - 9, cy + 6);
        g.lineTo(cx - 11, cy - 4);
        g.closePath();
        g.fillPath();
        // Far-side shading
        g.fillStyle(dark, 0.25);
        g.fillRect(cx + 2, cy - 10, 7, 16);
        g.lineStyle(1, 0x000000, 0.5);
        g.beginPath();
        g.moveTo(cx - 1, cy - 12);
        g.lineTo(cx + 9, cy - 5);
        g.lineTo(cx + 7, cy + 6);
        g.lineTo(cx - 9, cy + 6);
        g.lineTo(cx - 11, cy - 4);
        g.closePath();
        g.strokePath();
        // Carapace lines
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx - 9, cy - 1); g.lineTo(cx, cy - 5); g.lineTo(cx + 7, cy - 1); g.strokePath();
        // Visor
        g.fillStyle(light, 0.7);
        g.fillRect(cx - 5, cy - 9, 8, 2);
        // Near-side shoulder point
        g.fillStyle(light, 0.3);
        g.beginPath();
        g.moveTo(cx - 11, cy - 4);
        g.lineTo(cx - 14, cy - 7);
        g.lineTo(cx - 10, cy - 9);
        g.closePath();
        g.fillPath();
        // Shield arc (angled to front-left)
        g.lineStyle(2, light, 0.35);
        g.beginPath();
        g.arc(cx - 2, cy, 13, Math.PI * 1.1, Math.PI * 1.6);
        g.strokePath();
        break;
      }
      case 'west': {
        // Side profile: angular silhouette, carapace ridge visible
        // Far leg
        g.fillStyle(dark, 0.5);
        g.fillRect(cx + 2, cy + 5, 3, 9);
        // Near leg
        g.fillStyle(dark, 1);
        g.fillRect(cx - 4, cy + 6, 3, 9);
        // Body (narrower from side)
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(cx - 2, cy - 12);
        g.lineTo(cx + 6, cy - 6);
        g.lineTo(cx + 6, cy + 6);
        g.lineTo(cx - 6, cy + 6);
        g.lineTo(cx - 8, cy - 4);
        g.closePath();
        g.fillPath();
        // Near-side highlight
        g.fillStyle(light, 0.15);
        g.fillRect(cx - 8, cy - 10, 6, 16);
        g.lineStyle(1, 0x000000, 0.5);
        g.beginPath();
        g.moveTo(cx - 2, cy - 12);
        g.lineTo(cx + 6, cy - 6);
        g.lineTo(cx + 6, cy + 6);
        g.lineTo(cx - 6, cy + 6);
        g.lineTo(cx - 8, cy - 4);
        g.closePath();
        g.strokePath();
        // Carapace ridge
        g.lineStyle(1, dark, 0.5);
        g.beginPath(); g.moveTo(cx - 2, cy - 12); g.lineTo(cx - 2, cy + 4); g.strokePath();
        // Eye (side)
        g.fillStyle(light, 0.9);
        g.fillCircle(cx - 5, cy - 8, 1.5);
        // Shoulder spike
        g.fillStyle(light, 0.3);
        g.beginPath();
        g.moveTo(cx - 8, cy - 4);
        g.lineTo(cx - 12, cy - 8);
        g.lineTo(cx - 6, cy - 8);
        g.closePath();
        g.fillPath();
        // Shield arc (facing left)
        g.lineStyle(2, light, 0.35);
        g.beginPath();
        g.arc(cx - 2, cy, 12, Math.PI * 0.8, Math.PI * 1.2);
        g.strokePath();
        break;
      }
      case 'northwest': {
        // Three-quarter rear: back carapace plates, angular rear armor
        // Far leg
        g.fillStyle(dark, 0.5);
        g.fillRect(cx - 5, cy + 5, 4, 8);
        // Near leg
        g.fillStyle(dark, 0.9);
        g.fillRect(cx + 2, cy + 6, 4, 8);
        // Body (rear view, darker)
        g.fillStyle(dark, 1);
        g.beginPath();
        g.moveTo(cx + 1, cy - 12);
        g.lineTo(cx + 10, cy - 5);
        g.lineTo(cx + 8, cy + 6);
        g.lineTo(cx - 8, cy + 6);
        g.lineTo(cx - 10, cy - 4);
        g.closePath();
        g.fillPath();
        // Near-side edge color
        g.fillStyle(color, 0.4);
        g.fillRect(cx - 10, cy - 8, 6, 14);
        g.lineStyle(1, 0x000000, 0.5);
        g.beginPath();
        g.moveTo(cx + 1, cy - 12);
        g.lineTo(cx + 10, cy - 5);
        g.lineTo(cx + 8, cy + 6);
        g.lineTo(cx - 8, cy + 6);
        g.lineTo(cx - 10, cy - 4);
        g.closePath();
        g.strokePath();
        // Back carapace plates
        g.lineStyle(1, 0x000000, 0.3);
        g.beginPath(); g.moveTo(cx - 6, cy - 2); g.lineTo(cx + 1, cy - 8); g.lineTo(cx + 7, cy - 2); g.strokePath();
        g.beginPath(); g.moveTo(cx - 5, cy + 3); g.lineTo(cx + 1, cy - 1); g.lineTo(cx + 6, cy + 3); g.strokePath();
        // Back exhaust
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx + 2, cy + 2, 5, 3);
        break;
      }
    }
  }

  /**
   * Swarm: Cluster of 5-8 tiny dots in a loose cloud formation.
   * Cloud shifts per direction to suggest movement. (24x24)
   */
  private static drawSwarmEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    // Base dot layout shifts per direction to suggest drift
    interface SwarmDot { x: number; y: number; r: number; bright: boolean }
    let dots: SwarmDot[];

    switch (dir) {
      case 'south':
        // Cloud drifting toward camera (slightly spread downward)
        dots = [
          { x: 0, y: 1, r: 3.5, bright: true },
          { x: -4, y: -4, r: 2.5, bright: false },
          { x: 5, y: -3, r: 2.5, bright: false },
          { x: -6, y: 3, r: 2, bright: false },
          { x: 6, y: 4, r: 2, bright: false },
          { x: -1, y: -7, r: 2, bright: false },
          { x: 2, y: 6, r: 2.5, bright: true },
          { x: -3, y: 7, r: 1.5, bright: false },
        ];
        break;
      case 'southwest':
        // Cloud drifting down-left
        dots = [
          { x: -1, y: 1, r: 3.5, bright: true },
          { x: -6, y: -2, r: 2.5, bright: false },
          { x: 4, y: -4, r: 2, bright: false },
          { x: -7, y: 4, r: 2.5, bright: true },
          { x: 5, y: 3, r: 2, bright: false },
          { x: -3, y: -6, r: 2, bright: false },
          { x: 1, y: 6, r: 2, bright: false },
          { x: -5, y: 7, r: 1.5, bright: false },
        ];
        break;
      case 'west':
        // Cloud drifting left
        dots = [
          { x: -1, y: 0, r: 3.5, bright: true },
          { x: -6, y: -3, r: 2.5, bright: true },
          { x: 5, y: -2, r: 2, bright: false },
          { x: -7, y: 2, r: 2.5, bright: false },
          { x: 6, y: 3, r: 2, bright: false },
          { x: -2, y: -6, r: 2, bright: false },
          { x: -4, y: 5, r: 2, bright: false },
          { x: 3, y: 6, r: 1.5, bright: false },
        ];
        break;
      case 'northwest':
        // Cloud drifting up-left
        dots = [
          { x: -1, y: -1, r: 3.5, bright: true },
          { x: -5, y: -5, r: 2.5, bright: true },
          { x: 4, y: -3, r: 2, bright: false },
          { x: -6, y: 3, r: 2, bright: false },
          { x: 5, y: 2, r: 2, bright: false },
          { x: -3, y: -7, r: 2.5, bright: false },
          { x: 1, y: 6, r: 1.5, bright: false },
          { x: 3, y: -6, r: 2, bright: false },
        ];
        break;
      default:
        dots = [
          { x: 0, y: 0, r: 3, bright: true },
          { x: -4, y: -4, r: 2.5, bright: false },
          { x: 4, y: -4, r: 2.5, bright: false },
          { x: -5, y: 3, r: 2, bright: false },
          { x: 5, y: 3, r: 2, bright: false },
        ];
    }

    // Soft ambient glow
    g.fillStyle(color, 0.08);
    g.fillCircle(cx, cy, 11);

    // Draw each dot
    for (const dot of dots) {
      const dotColor = dot.bright ? color : dark;
      g.fillStyle(dotColor, 1);
      g.fillCircle(cx + dot.x, cy + dot.y, dot.r);
      g.lineStyle(1, light, dot.bright ? 0.6 : 0.3);
      g.strokeCircle(cx + dot.x, cy + dot.y, dot.r);
    }

    // Bright center glow
    g.fillStyle(light, 0.5);
    g.fillCircle(cx + dots[0].x, cy + dots[0].y, 1.5);
  }

  /**
   * Mini Drone: Simplified smaller version of Drone. Single body with
   * tiny wings/antennae. (16x16)
   */
  private static drawMiniDroneEnemy(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number,
    _w: number, _h: number, dir: string,
    color: number, dark: number, light: number,
  ): void {
    switch (dir) {
      case 'south': {
        // Front-facing: small dome, underside glow
        // Dome
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx, cy - 1, 5, Math.PI, 0);
        g.lineTo(cx + 5, cy + 1);
        g.lineTo(cx - 5, cy + 1);
        g.closePath();
        g.fillPath();
        // Highlight
        g.fillStyle(light, 0.3);
        g.fillCircle(cx - 1, cy - 3, 2);
        // Underside
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 2, 11, 4);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeEllipse(cx, cy + 2, 11, 4);
        // Underside glow
        g.fillStyle(light, 0.3);
        g.fillCircle(cx, cy + 2, 2);
        // Tiny antennae
        g.lineStyle(1, dark, 0.6);
        g.beginPath(); g.moveTo(cx - 2, cy - 5); g.lineTo(cx - 3, cy - 7); g.strokePath();
        g.beginPath(); g.moveTo(cx + 2, cy - 5); g.lineTo(cx + 3, cy - 7); g.strokePath();
        break;
      }
      case 'southwest': {
        // Three-quarter: offset dome, one antenna
        g.fillStyle(dark, 0.6);
        g.fillEllipse(cx + 1, cy + 1, 9, 4);
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx - 1, cy - 1, 5, Math.PI, 0);
        g.lineTo(cx + 4, cy + 1);
        g.lineTo(cx - 6, cy + 1);
        g.closePath();
        g.fillPath();
        g.fillStyle(light, 0.25);
        g.fillCircle(cx - 2, cy - 3, 2);
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 2, 10, 4);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeEllipse(cx, cy + 2, 10, 4);
        g.lineStyle(1, dark, 0.6);
        g.beginPath(); g.moveTo(cx - 3, cy - 5); g.lineTo(cx - 5, cy - 7); g.strokePath();
        break;
      }
      case 'west': {
        // Side profile
        g.fillStyle(color, 1);
        g.beginPath();
        g.arc(cx, cy, 5, Math.PI, 0);
        g.lineTo(cx + 5, cy + 1);
        g.lineTo(cx - 5, cy + 1);
        g.closePath();
        g.fillPath();
        g.fillStyle(light, 0.2);
        g.fillRect(cx - 5, cy - 4, 5, 4);
        g.fillStyle(dark, 0.15);
        g.fillRect(cx, cy - 4, 5, 4);
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 2, 10, 3);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeEllipse(cx, cy + 2, 10, 3);
        // Single antenna
        g.lineStyle(1, dark, 0.6);
        g.beginPath(); g.moveTo(cx - 1, cy - 5); g.lineTo(cx - 3, cy - 7); g.strokePath();
        break;
      }
      case 'northwest': {
        // Three-quarter rear
        g.fillStyle(dark, 0.9);
        g.beginPath();
        g.arc(cx + 1, cy - 1, 5, Math.PI, 0);
        g.lineTo(cx + 6, cy + 1);
        g.lineTo(cx - 4, cy + 1);
        g.closePath();
        g.fillPath();
        g.fillStyle(color, 0.4);
        g.fillCircle(cx - 2, cy - 2, 3);
        g.fillStyle(dark, 1);
        g.fillEllipse(cx, cy + 2, 10, 4);
        g.lineStyle(1, 0x000000, 0.4);
        g.strokeEllipse(cx, cy + 2, 10, 4);
        // Faint underside glow
        g.fillStyle(light, 0.1);
        g.fillCircle(cx, cy + 2, 1.5);
        // Antenna from behind
        g.lineStyle(1, dark, 0.4);
        g.beginPath(); g.moveTo(cx - 2, cy - 5); g.lineTo(cx - 4, cy - 7); g.strokePath();
        break;
      }
    }
  }

  // -------------------------------------------------------------------
  //  Tile textures (64x64)
  // -------------------------------------------------------------------

  private static generateTileTextures(scene: Phaser.Scene): void {
    const SIZE = 64;

    // ---- tile-ground: Dark textured square with subtle noise ----
    {
      const g = scene.make.graphics({} as any);

      // Base fill
      g.fillStyle(0x1a1a2e, 1);
      g.fillRect(0, 0, SIZE, SIZE);

      // Subtle noise dots
      for (let i = 0; i < 30; i++) {
        const nx = Math.random() * SIZE;
        const ny = Math.random() * SIZE;
        const shade = 0x1a1a2e + Math.floor(Math.random() * 0x0a0a0a);
        g.fillStyle(shade, 0.4);
        g.fillRect(nx, ny, 2, 2);
      }

      // Very subtle grid texture
      g.lineStyle(1, 0x222244, 0.2);
      for (let x = 0; x < SIZE; x += 16) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, SIZE);
        g.strokePath();
      }
      for (let y = 0; y < SIZE; y += 16) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(SIZE, y);
        g.strokePath();
      }

      g.generateTexture('tile-ground', SIZE, SIZE);
      g.destroy();
    }

    // ---- tile-path: Slightly lighter with directional lines ----
    {
      const g = scene.make.graphics({} as any);

      // Base fill (lighter than ground)
      g.fillStyle(0x2a2a3e, 1);
      g.fillRect(0, 0, SIZE, SIZE);

      // Directional lines (subtle horizontal stripes)
      g.lineStyle(1, 0x333348, 0.4);
      for (let y = 8; y < SIZE; y += 8) {
        g.beginPath();
        g.moveTo(4, y);
        g.lineTo(SIZE - 4, y);
        g.strokePath();
      }

      // Edge highlights
      g.lineStyle(1, 0x3a3a4e, 0.3);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(SIZE, 0);
      g.strokePath();
      g.beginPath();
      g.moveTo(0, SIZE - 1);
      g.lineTo(SIZE, SIZE - 1);
      g.strokePath();

      g.generateTexture('tile-path', SIZE, SIZE);
      g.destroy();
    }

    // ---- tile-build: Green-tinted with corner brackets ----
    {
      const g = scene.make.graphics({} as any);

      // Base fill (green tint)
      g.fillStyle(0x2e3a2e, 1);
      g.fillRect(0, 0, SIZE, SIZE);

      // Subtle green noise
      for (let i = 0; i < 15; i++) {
        const nx = Math.random() * SIZE;
        const ny = Math.random() * SIZE;
        g.fillStyle(0x3a4a3a, 0.3);
        g.fillRect(nx, ny, 2, 2);
      }

      // Corner brackets
      const bracketLen = 12;
      const bracketInset = 4;
      g.lineStyle(2, 0x5a7a5a, 0.7);

      // Top-left
      g.beginPath();
      g.moveTo(bracketInset, bracketInset + bracketLen);
      g.lineTo(bracketInset, bracketInset);
      g.lineTo(bracketInset + bracketLen, bracketInset);
      g.strokePath();

      // Top-right
      g.beginPath();
      g.moveTo(SIZE - bracketInset - bracketLen, bracketInset);
      g.lineTo(SIZE - bracketInset, bracketInset);
      g.lineTo(SIZE - bracketInset, bracketInset + bracketLen);
      g.strokePath();

      // Bottom-left
      g.beginPath();
      g.moveTo(bracketInset, SIZE - bracketInset - bracketLen);
      g.lineTo(bracketInset, SIZE - bracketInset);
      g.lineTo(bracketInset + bracketLen, SIZE - bracketInset);
      g.strokePath();

      // Bottom-right
      g.beginPath();
      g.moveTo(SIZE - bracketInset - bracketLen, SIZE - bracketInset);
      g.lineTo(SIZE - bracketInset, SIZE - bracketInset);
      g.lineTo(SIZE - bracketInset, SIZE - bracketInset - bracketLen);
      g.strokePath();

      // Center crosshair dot
      g.fillStyle(0x5a7a5a, 0.3);
      g.fillCircle(SIZE / 2, SIZE / 2, 2);

      g.generateTexture('tile-build', SIZE, SIZE);
      g.destroy();
    }

    // ---- tile-spawn: Bright green with pulsing arrow ----
    {
      const g = scene.make.graphics({} as any);

      // Base fill (green)
      g.fillStyle(0x225522, 1);
      g.fillRect(0, 0, SIZE, SIZE);

      // Bright green border
      g.lineStyle(2, 0x44ff44, 0.7);
      g.strokeRect(2, 2, SIZE - 4, SIZE - 4);

      // Arrow pointing right (spawn direction)
      g.fillStyle(0x44ff44, 0.7);
      g.beginPath();
      g.moveTo(SIZE / 2 - 8, SIZE / 2 - 10);
      g.lineTo(SIZE / 2 + 12, SIZE / 2);
      g.lineTo(SIZE / 2 - 8, SIZE / 2 + 10);
      g.closePath();
      g.fillPath();

      // Arrow glow
      g.lineStyle(1, 0x88ff88, 0.5);
      g.beginPath();
      g.moveTo(SIZE / 2 - 8, SIZE / 2 - 10);
      g.lineTo(SIZE / 2 + 12, SIZE / 2);
      g.lineTo(SIZE / 2 - 8, SIZE / 2 + 10);
      g.closePath();
      g.strokePath();

      g.generateTexture('tile-spawn', SIZE, SIZE);
      g.destroy();
    }

    // ---- tile-base: Red with shield/target icon ----
    {
      const g = scene.make.graphics({} as any);

      // Base fill (red)
      g.fillStyle(0x442222, 1);
      g.fillRect(0, 0, SIZE, SIZE);

      // Red border
      g.lineStyle(2, 0xff4444, 0.7);
      g.strokeRect(2, 2, SIZE - 4, SIZE - 4);

      // Target circle (outer)
      g.lineStyle(2, 0xff4444, 0.6);
      g.strokeCircle(SIZE / 2, SIZE / 2, 18);

      // Target circle (inner)
      g.lineStyle(2, 0xff6666, 0.5);
      g.strokeCircle(SIZE / 2, SIZE / 2, 10);

      // Target crosshairs
      g.lineStyle(1, 0xff4444, 0.5);
      g.beginPath();
      g.moveTo(SIZE / 2, SIZE / 2 - 22);
      g.lineTo(SIZE / 2, SIZE / 2 + 22);
      g.strokePath();
      g.beginPath();
      g.moveTo(SIZE / 2 - 22, SIZE / 2);
      g.lineTo(SIZE / 2 + 22, SIZE / 2);
      g.strokePath();

      // Center dot
      g.fillStyle(0xff4444, 0.8);
      g.fillCircle(SIZE / 2, SIZE / 2, 4);

      g.generateTexture('tile-base', SIZE, SIZE);
      g.destroy();
    }
  }

  // -------------------------------------------------------------------
  //  Projectile textures (8x8)
  // -------------------------------------------------------------------

  private static generateProjectileTextures(scene: Phaser.Scene): void {
    const SIZE = 8;

    // ---- projectile-laser: Green bright dot with glow ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0x00ff88, 0.2);
      g.fillCircle(cx, cy, 4);
      g.fillStyle(0x00ff88, 0.6);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(0xaaffcc, 1);
      g.fillCircle(cx, cy, 1.5);

      g.generateTexture('projectile-laser', SIZE, SIZE);
      g.destroy();
    }

    // ---- projectile-missile: Red/orange elongated with trail ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Trail glow
      g.fillStyle(0xff6644, 0.2);
      g.fillRect(0, cy - 2, SIZE, 4);

      // Body (elongated)
      g.fillStyle(0xff6644, 0.8);
      g.fillRect(cx - 3, cy - 2, 6, 4);

      // Bright tip
      g.fillStyle(0xffaa88, 1);
      g.fillCircle(cx + 2, cy, 1.5);

      g.generateTexture('projectile-missile', SIZE, SIZE);
      g.destroy();
    }

    // ---- projectile-railgun: Yellow bright line ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Glow
      g.fillStyle(0xffcc00, 0.2);
      g.fillRect(0, cy - 2, SIZE, 4);

      // Bright core line
      g.lineStyle(2, 0xffcc00, 1);
      g.beginPath();
      g.moveTo(0, cy);
      g.lineTo(SIZE, cy);
      g.strokePath();

      // Bright center
      g.fillStyle(0xffee88, 1);
      g.fillCircle(cx, cy, 1.5);

      g.generateTexture('projectile-railgun', SIZE, SIZE);
      g.destroy();
    }
  }

  // -------------------------------------------------------------------
  //  Isometric diamond tile textures (128x64) with world palettes
  // -------------------------------------------------------------------

  private static generateIsoDiamondTiles(scene: Phaser.Scene): void {
    const ISO_WIDTH = 128;
    const ISO_HEIGHT = 64;
    const CLIFF_HEIGHT = 16;

    // World-themed color palettes
    const WORLD_PALETTES = {
      1: { ground: 0x2a1f0a, path: 0x3a2f1a, build: 0x3a4a2a, accent: 0x88aa44 }, // Desert
      2: { ground: 0x1a1a2a, path: 0x2a2a3a, build: 0x2e3a4e, accent: 0x4488cc }, // Urban
      3: { ground: 0x1a0a2a, path: 0x2a1a3a, build: 0x3a2a4e, accent: 0xaa44ff }, // Alien
    };

    // Generate tiles for each world
    for (const worldId of [1, 2, 3]) {
      const palette = WORLD_PALETTES[worldId as keyof typeof WORLD_PALETTES];

      const tileColors: Record<string, number> = {
        ground: palette.ground,
        path: palette.path,
        build: palette.build,
        spawn: 0x44ff44, // Spawn tile always green
        base: 0xff4444,  // Base tile always red
      };

      const tileNames: Array<keyof typeof tileColors> = ['ground', 'path', 'build', 'spawn', 'base'];

      for (const tileName of tileNames) {
        const g = scene.make.graphics({} as any);
        const color = tileColors[tileName];

        // Draw diamond shape
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(64, 0);
        g.lineTo(128, 32);
        g.lineTo(64, 64);
        g.lineTo(0, 32);
        g.closePath();
        g.fillPath();

        // Add subtle texture gradient (top lighter than bottom)
        const lighterColor = AssetGenerator.adjustColor(color, 10);
        g.fillStyle(lighterColor, 0.15);
        g.beginPath();
        g.moveTo(64, 0);
        g.lineTo(128, 32);
        g.lineTo(64, 48);
        g.lineTo(0, 32);
        g.closePath();
        g.fillPath();

        // Add subtle border for definition (reduced alpha for ground tiles)
        const borderColor = AssetGenerator.adjustColor(color, -16);
        const borderAlpha = tileName === 'ground' ? 0.15 : 0.5;
        g.lineStyle(1, borderColor, borderAlpha);
        g.beginPath();
        g.moveTo(64, 0);
        g.lineTo(128, 32);
        g.lineTo(64, 64);
        g.lineTo(0, 32);
        g.closePath();
        g.strokePath();

        // Build slots: add accent-colored stroke and corner markers for visibility
        if (tileName === 'build') {
          // Accent-colored outline
          g.lineStyle(1.5, palette.accent, 0.4);
          g.beginPath();
          g.moveTo(64, 0);
          g.lineTo(128, 32);
          g.lineTo(64, 64);
          g.lineTo(0, 32);
          g.closePath();
          g.strokePath();

          // Corner markers at diamond vertices (small lines extending outward)
          const markerLength = 8;
          g.lineStyle(2, palette.accent, 0.5);

          // Top vertex (64, 0)
          g.beginPath();
          g.moveTo(64, 0);
          g.lineTo(64, -markerLength);
          g.strokePath();

          // Right vertex (128, 32)
          g.beginPath();
          g.moveTo(128, 32);
          g.lineTo(128 + markerLength, 32);
          g.strokePath();

          // Bottom vertex (64, 64)
          g.beginPath();
          g.moveTo(64, 64);
          g.lineTo(64, 64 + markerLength);
          g.strokePath();

          // Left vertex (0, 32)
          g.beginPath();
          g.moveTo(0, 32);
          g.lineTo(-markerLength, 32);
          g.strokePath();
        }

        // Generate texture with world prefix
        const textureKey = worldId === 1 ? `iso-tile-${tileName}` : `iso-tile-${tileName}-w${worldId}`;
        g.generateTexture(textureKey, ISO_WIDTH, ISO_HEIGHT);
        g.destroy();
      }
    }

    // Generate cliff face textures (direction: N, S, E, W)
    const cliffDirections = ['N', 'S', 'E', 'W'] as const;

    for (const worldId of [1, 2, 3]) {
      const palette = WORLD_PALETTES[worldId as keyof typeof WORLD_PALETTES];

      for (const direction of cliffDirections) {
        const g = scene.make.graphics({} as any);

        // Base cliff color (darker than ground)
        const cliffColor = AssetGenerator.adjustColor(palette.ground, -15);

        if (direction === 'N' || direction === 'S') {
          // North/South cliff faces (128x16) - full width
          g.fillStyle(cliffColor, 1);
          g.fillRect(0, 0, ISO_WIDTH, CLIFF_HEIGHT);

          // Add vertical striations
          g.lineStyle(1, AssetGenerator.adjustColor(cliffColor, -10), 0.4);
          for (let x = 8; x < ISO_WIDTH; x += 12) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, CLIFF_HEIGHT);
            g.strokePath();
          }

          // Top edge highlight
          g.lineStyle(1, AssetGenerator.adjustColor(cliffColor, 10), 0.3);
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(ISO_WIDTH, 0);
          g.strokePath();

          // Bottom edge shadow
          g.lineStyle(1, AssetGenerator.adjustColor(cliffColor, -10), 0.5);
          g.beginPath();
          g.moveTo(0, CLIFF_HEIGHT - 1);
          g.lineTo(ISO_WIDTH, CLIFF_HEIGHT - 1);
          g.strokePath();
        } else {
          // East/West cliff faces (128x16) - angled edges
          g.fillStyle(cliffColor, 1);
          g.beginPath();
          if (direction === 'E') {
            // East face: slanted right edge
            g.moveTo(0, 0);
            g.lineTo(ISO_WIDTH, 0);
            g.lineTo(ISO_WIDTH - 8, CLIFF_HEIGHT);
            g.lineTo(8, CLIFF_HEIGHT);
          } else {
            // West face: slanted left edge
            g.moveTo(8, 0);
            g.lineTo(ISO_WIDTH - 8, 0);
            g.lineTo(ISO_WIDTH, CLIFF_HEIGHT);
            g.lineTo(0, CLIFF_HEIGHT);
          }
          g.closePath();
          g.fillPath();

          // Add diagonal striations
          g.lineStyle(1, AssetGenerator.adjustColor(cliffColor, -10), 0.4);
          for (let i = 0; i < 10; i++) {
            const offset = i * 16;
            g.beginPath();
            if (direction === 'E') {
              g.moveTo(offset, 0);
              g.lineTo(offset - 8, CLIFF_HEIGHT);
            } else {
              g.moveTo(offset, 0);
              g.lineTo(offset + 8, CLIFF_HEIGHT);
            }
            g.strokePath();
          }
        }

        // Generate cliff texture with world prefix
        const textureKey = worldId === 1 ? `iso-cliff-${direction}` : `iso-cliff-${direction}-w${worldId}`;
        g.generateTexture(textureKey, ISO_WIDTH, CLIFF_HEIGHT);
        g.destroy();
      }
    }
  }
}
