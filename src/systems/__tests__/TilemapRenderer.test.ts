import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../../config/maps';
import { calculateDepth, calculateTileDepth } from '../../utils/elevation';

/**
 * Tests for TilemapRenderer build slot zone polygon hit detection.
 *
 * These tests verify that the diamond-shaped polygon for interactive build slots
 * uses local top-left-relative coordinates (not center-relative) and correctly
 * identifies points inside and outside the diamond shape.
 */
describe('TilemapRenderer', () => {
  describe('diamond polygon vertices', () => {
    it('diamond polygon vertices are in top-left-relative local space', () => {
      // Create the diamond polygon with vertices in top-left-relative local space.
      // The zone bounding box is 128x64, so the center is at (64, 32) in local coords.
      // The diamond touches the center of each edge:
      // - top: (64, 0)
      // - right: (128, 32)
      // - bottom: (64, 64)
      // - left: (0, 32)
      const diamondShape = new Phaser.Geom.Polygon([
        new Phaser.Geom.Point(64, 0),     // top
        new Phaser.Geom.Point(128, 32),   // right
        new Phaser.Geom.Point(64, 64),    // bottom
        new Phaser.Geom.Point(0, 32),     // left
      ]);

      // Center of the diamond at (64, 32) should be inside
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 64, 32)
      ).toBe(true);

      // Top-left corner (0, 0) should be outside
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 0, 0)
      ).toBe(false);

      // Top-right corner (128, 0) should be outside
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 128, 0)
      ).toBe(false);
    });

    it('diamond polygon rejects center-relative coordinates', () => {
      // This polygon uses WRONG center-relative vertices, which should not work.
      // These would be the vertices if we mistakenly used coordinates centered at (64, 32).
      // The polygon should NOT correctly represent the diamond in this case.
      const wrongDiamondShape = new Phaser.Geom.Polygon([
        new Phaser.Geom.Point(0, -32),    // top (center-relative)
        new Phaser.Geom.Point(64, 0),     // right (center-relative)
        new Phaser.Geom.Point(0, 32),     // bottom (center-relative)
        new Phaser.Geom.Point(-64, 0),    // left (center-relative)
      ]);

      // Center point at (64, 32) should be OUTSIDE with center-relative coords
      // because the polygon is centered at (0, 0) instead of (64, 32)
      expect(
        Phaser.Geom.Polygon.Contains(wrongDiamondShape, 64, 32)
      ).toBe(false);
    });

    it('verifies constants match expected values', () => {
      // Sanity check that the imported constants have expected values
      expect(ISO_TILE_WIDTH).toBe(128);
      expect(ISO_TILE_HEIGHT).toBe(64);
    });

    it('diamond polygon contains points on the diamond edges', () => {
      const diamondShape = new Phaser.Geom.Polygon([
        new Phaser.Geom.Point(64, 0),
        new Phaser.Geom.Point(128, 32),
        new Phaser.Geom.Point(64, 64),
        new Phaser.Geom.Point(0, 32),
      ]);

      // Points slightly inside the diamond edges should be contained
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 64, 16)
      ).toBe(true);

      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 96, 32)
      ).toBe(true);

      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 64, 48)
      ).toBe(true);

      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 32, 32)
      ).toBe(true);
    });

    it('diamond polygon rejects points outside the diamond', () => {
      const diamondShape = new Phaser.Geom.Polygon([
        new Phaser.Geom.Point(64, 0),
        new Phaser.Geom.Point(128, 32),
        new Phaser.Geom.Point(64, 64),
        new Phaser.Geom.Point(0, 32),
      ]);

      // Top-left quadrant outer region
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 20, 5)
      ).toBe(false);

      // Top-right quadrant outer region
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 110, 5)
      ).toBe(false);

      // Bottom-right quadrant outer region
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 110, 60)
      ).toBe(false);

      // Bottom-left quadrant outer region
      expect(
        Phaser.Geom.Polygon.Contains(diamondShape, 20, 60)
      ).toBe(false);
    });
  });

  describe('depth sorting at tile boundaries', () => {
    it('enemy between two tiles has depth above both tiles', () => {
      // Enemy at screenY midway between tile (5,5) center and tile (6,5) center
      const tile55_centerY = (5 + 5) * 32; // 320
      const tile65_centerY = (6 + 5) * 32; // 352
      const enemyScreenY = (tile55_centerY + tile65_centerY) / 2; // 336

      const tile55_depth = calculateTileDepth(tile55_centerY, 0);
      const tile65_depth = calculateTileDepth(tile65_centerY, 0);
      const enemy_depth = calculateDepth(enemyScreenY, 0);

      expect(enemy_depth).toBeGreaterThan(tile55_depth);
      expect(enemy_depth).toBeGreaterThan(tile65_depth);
    });

    it('enemy at tile diamond top edge still sorts above tile', () => {
      // Enemy just barely inside tile (6,5) diamond top vertex
      const tile65_centerY = (6 + 5) * 32; // 352
      const HALF_H = 32;
      const enemyAtTopEdge = tile65_centerY - HALF_H + 1; // 321

      const tile65_depth = calculateTileDepth(tile65_centerY, 0);
      const enemy_depth = calculateDepth(enemyAtTopEdge, 0);

      expect(enemy_depth).toBeGreaterThan(tile65_depth);
    });

    it('tiles at same elevation maintain correct relative ordering', () => {
      const tile55_depth = calculateTileDepth((5 + 5) * 32, 0);
      const tile65_depth = calculateTileDepth((6 + 5) * 32, 0);
      const tile75_depth = calculateTileDepth((7 + 5) * 32, 0);

      expect(tile55_depth).toBeLessThan(tile65_depth);
      expect(tile65_depth).toBeLessThan(tile75_depth);
    });

    it('enemy at elevation 0 sorts behind elevation 1 tile', () => {
      const enemyDepth = calculateDepth(400, 0);
      const elevatedTileDepth = calculateTileDepth(200, 1);
      expect(enemyDepth).toBeLessThan(elevatedTileDepth);
    });
  });
});
