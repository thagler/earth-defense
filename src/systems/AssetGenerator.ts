import Phaser from 'phaser';
import { DIRECTION_SUFFIXES } from '../utils/direction';
import { TOWERS } from '../config/towers';

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
        // Barrel points down toward camera
        g.fillStyle(light, 1);
        g.fillRect(cx - 3, cy - 4, 6, 16);
        g.strokeRect(cx - 3, cy - 4, 6, 16);
        // Lens glow at tip
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx, cy + 12, 3);
        g.fillStyle(color, 0.6);
        g.fillCircle(cx, cy + 12, 2);
        break;
      case 'southwest':
        // Barrel angled down-left
        g.fillStyle(light, 1);
        g.beginPath();
        g.moveTo(cx - 2, cy - 5);
        g.lineTo(cx + 2, cy - 3);
        g.lineTo(cx - 8, cy + 11);
        g.lineTo(cx - 12, cy + 9);
        g.closePath();
        g.fillPath();
        g.strokePath();
        // Lens glow
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx - 10, cy + 10, 2.5);
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

    // -- Dome body (half-ellipse) --
    g.fillStyle(color, 0.9);
    g.beginPath();
    g.arc(cx, cy, 13, Math.PI, 0);
    g.lineTo(cx + 13, cy + 4);
    g.lineTo(cx - 13, cy + 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x000000, 0.7);
    g.strokePath();

    // -- Dome highlight (glass-like sheen) --
    g.fillStyle(light, 0.25);
    g.beginPath();
    g.arc(cx - 3, cy - 3, 8, Math.PI * 1.1, Math.PI * 1.7);
    g.lineTo(cx - 3, cy - 3);
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
  //  Enemy textures (24x24)
  // -------------------------------------------------------------------

  private static generateEnemyTextures(scene: Phaser.Scene): void {
    const SIZE = 24;

    // ---- enemy-drone: Green diamond/rhombus shape ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0x66cc66, 1);
      g.beginPath();
      g.moveTo(cx, cy - 10);
      g.lineTo(cx + 10, cy);
      g.lineTo(cx, cy + 10);
      g.lineTo(cx - 10, cy);
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0x88ff88, 0.8);
      g.beginPath();
      g.moveTo(cx, cy - 10);
      g.lineTo(cx + 10, cy);
      g.lineTo(cx, cy + 10);
      g.lineTo(cx - 10, cy);
      g.closePath();
      g.strokePath();

      // Center eye
      g.fillStyle(0xccffcc, 0.8);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(0x003300, 0.9);
      g.fillCircle(cx, cy, 1);

      g.generateTexture('enemy-drone', SIZE, SIZE);
      g.destroy();
    }

    // ---- enemy-skitter: Yellow elongated shape with legs ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Elongated body
      g.fillStyle(0xcccc22, 1);
      g.beginPath();
      g.moveTo(cx - 4, cy - 10);
      g.lineTo(cx + 4, cy - 10);
      g.lineTo(cx + 6, cy);
      g.lineTo(cx + 4, cy + 10);
      g.lineTo(cx - 4, cy + 10);
      g.lineTo(cx - 6, cy);
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0xffff44, 0.8);
      g.beginPath();
      g.moveTo(cx - 4, cy - 10);
      g.lineTo(cx + 4, cy - 10);
      g.lineTo(cx + 6, cy);
      g.lineTo(cx + 4, cy + 10);
      g.lineTo(cx - 4, cy + 10);
      g.lineTo(cx - 6, cy);
      g.closePath();
      g.strokePath();

      // Legs (3 pairs)
      g.lineStyle(1, 0xdddd33, 0.7);
      for (let i = -1; i <= 1; i++) {
        const ly = cy + i * 6;
        // Left leg
        g.beginPath();
        g.moveTo(cx - 5, ly);
        g.lineTo(cx - 11, ly - 2);
        g.strokePath();
        // Right leg
        g.beginPath();
        g.moveTo(cx + 5, ly);
        g.lineTo(cx + 11, ly - 2);
        g.strokePath();
      }

      // Eyes
      g.fillStyle(0xffff88, 0.9);
      g.fillCircle(cx - 2, cy - 6, 1.5);
      g.fillCircle(cx + 2, cy - 6, 1.5);

      g.generateTexture('enemy-skitter', SIZE, SIZE);
      g.destroy();
    }

    // ---- enemy-brute: Red large square with armor plating ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Main body (large rounded-ish square)
      g.fillStyle(0xcc2222, 1);
      g.fillRect(cx - 10, cy - 10, 20, 20);

      g.lineStyle(2, 0xff4444, 0.9);
      g.strokeRect(cx - 10, cy - 10, 20, 20);

      // Armor plating lines (horizontal stripes)
      g.lineStyle(1, 0x991111, 0.7);
      g.beginPath();
      g.moveTo(cx - 8, cy - 4);
      g.lineTo(cx + 8, cy - 4);
      g.strokePath();
      g.beginPath();
      g.moveTo(cx - 8, cy + 4);
      g.lineTo(cx + 8, cy + 4);
      g.strokePath();

      // Armor rivets (small dots at corners)
      g.fillStyle(0xff6666, 0.8);
      g.fillCircle(cx - 7, cy - 7, 1.5);
      g.fillCircle(cx + 7, cy - 7, 1.5);
      g.fillCircle(cx - 7, cy + 7, 1.5);
      g.fillCircle(cx + 7, cy + 7, 1.5);

      // Eye slit
      g.fillStyle(0xff8888, 0.9);
      g.fillRect(cx - 5, cy - 2, 10, 3);

      g.generateTexture('enemy-brute', SIZE, SIZE);
      g.destroy();
    }

    // ---- enemy-shielded: Blue circle with shield ring ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Shield ring (outer)
      g.lineStyle(2, 0x4488ff, 0.5);
      g.strokeCircle(cx, cy, 11);

      // Main body circle
      g.fillStyle(0x2266cc, 1);
      g.fillCircle(cx, cy, 9);

      g.lineStyle(1, 0x4488ff, 0.8);
      g.strokeCircle(cx, cy, 9);

      // Shield shimmer arcs
      g.lineStyle(1, 0x88bbff, 0.3);
      g.beginPath();
      g.arc(cx, cy, 11, -0.5, 0.5);
      g.strokePath();
      g.beginPath();
      g.arc(cx, cy, 11, 2.1, 3.1);
      g.strokePath();

      // Inner core
      g.fillStyle(0x88bbff, 0.6);
      g.fillCircle(cx, cy, 4);
      g.fillStyle(0xccddff, 0.7);
      g.fillCircle(cx, cy, 2);

      g.generateTexture('enemy-shielded', SIZE, SIZE);
      g.destroy();
    }

    // ---- enemy-swarm: Pink cluster of small dots ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      // Cluster of dots arranged in a cluster pattern
      const dots = [
        { x: 0, y: 0, r: 4 },
        { x: -5, y: -5, r: 3 },
        { x: 5, y: -5, r: 3 },
        { x: -6, y: 4, r: 3 },
        { x: 6, y: 4, r: 3 },
        { x: 0, y: -7, r: 2.5 },
        { x: 0, y: 7, r: 2.5 },
      ];

      // Draw soft glow behind
      g.fillStyle(0xff88ff, 0.1);
      g.fillCircle(cx, cy, 11);

      for (const dot of dots) {
        g.fillStyle(0xcc44cc, 1);
        g.fillCircle(cx + dot.x, cy + dot.y, dot.r);
        g.lineStyle(1, 0xff88ff, 0.7);
        g.strokeCircle(cx + dot.x, cy + dot.y, dot.r);
      }

      // Bright center
      g.fillStyle(0xffaaff, 0.6);
      g.fillCircle(cx, cy, 2);

      g.generateTexture('enemy-swarm', SIZE, SIZE);
      g.destroy();
    }

    // ---- enemy-mini-drone: Light green smaller diamond ----
    {
      const g = scene.make.graphics({} as any);
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      g.fillStyle(0x88dd88, 1);
      g.beginPath();
      g.moveTo(cx, cy - 7);
      g.lineTo(cx + 7, cy);
      g.lineTo(cx, cy + 7);
      g.lineTo(cx - 7, cy);
      g.closePath();
      g.fillPath();

      g.lineStyle(1, 0xccffcc, 0.8);
      g.beginPath();
      g.moveTo(cx, cy - 7);
      g.lineTo(cx + 7, cy);
      g.lineTo(cx, cy + 7);
      g.lineTo(cx - 7, cy);
      g.closePath();
      g.strokePath();

      // Tiny eye
      g.fillStyle(0xeeffee, 0.8);
      g.fillCircle(cx, cy, 2);

      g.generateTexture('enemy-mini-drone', SIZE, SIZE);
      g.destroy();
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
        const lighterColor = color + 0x0a0a0a;
        g.fillStyle(lighterColor, 0.15);
        g.beginPath();
        g.moveTo(64, 0);
        g.lineTo(128, 32);
        g.lineTo(64, 48);
        g.lineTo(0, 32);
        g.closePath();
        g.fillPath();

        // Add subtle border for definition (reduced alpha for ground tiles)
        const borderColor = color - 0x101010;
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
        const cliffColor = palette.ground - 0x0f0f0f;

        if (direction === 'N' || direction === 'S') {
          // North/South cliff faces (128x16) - full width
          g.fillStyle(cliffColor, 1);
          g.fillRect(0, 0, ISO_WIDTH, CLIFF_HEIGHT);

          // Add vertical striations
          g.lineStyle(1, cliffColor - 0x0a0a0a, 0.4);
          for (let x = 8; x < ISO_WIDTH; x += 12) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, CLIFF_HEIGHT);
            g.strokePath();
          }

          // Top edge highlight
          g.lineStyle(1, cliffColor + 0x0a0a0a, 0.3);
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(ISO_WIDTH, 0);
          g.strokePath();

          // Bottom edge shadow
          g.lineStyle(1, cliffColor - 0x0a0a0a, 0.5);
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
          g.lineStyle(1, cliffColor - 0x0a0a0a, 0.4);
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
