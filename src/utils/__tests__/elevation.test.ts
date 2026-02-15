import { describe, it, expect } from 'vitest';
import { calculateDepth, calculateTileDepth, getEffectiveRange, getSlopeSpeedModifier, getElevationCostMultiplier } from '../elevation';
import { ISO_TILE_HEIGHT } from '../../config/maps';

describe('calculateDepth', () => {
  it('elevation 0 objects have lower depth than elevation 1', () => {
    expect(calculateDepth(400, 0)).toBeLessThan(calculateDepth(0, 1));
  });
  it('within same elevation, higher screenY = higher depth', () => {
    expect(calculateDepth(100, 0)).toBeLessThan(calculateDepth(200, 0));
  });
});

describe('getEffectiveRange', () => {
  it('same elevation returns base range', () => {
    expect(getEffectiveRange(100, 1, 1)).toBe(100);
  });
  it('+1 elevation gives +15% range', () => {
    expect(getEffectiveRange(100, 2, 1)).toBeCloseTo(115);
  });
  it('-2 elevation gives -30% range, min 50%', () => {
    expect(getEffectiveRange(100, 0, 2)).toBeCloseTo(70);
  });
  it('never goes below 50% of base range', () => {
    expect(getEffectiveRange(100, 0, 3)).toBeGreaterThanOrEqual(50);
  });
});

describe('getSlopeSpeedModifier', () => {
  it('flat returns 1.0', () => {
    expect(getSlopeSpeedModifier(1, 1)).toBe(1.0);
  });
  it('downhill returns > 1.0', () => {
    expect(getSlopeSpeedModifier(2, 1)).toBeGreaterThan(1.0);
  });
  it('uphill returns < 1.0', () => {
    expect(getSlopeSpeedModifier(0, 1)).toBeLessThan(1.0);
  });
});

describe('getElevationCostMultiplier', () => {
  it('elevation 0 returns 1.0', () => {
    expect(getElevationCostMultiplier(0)).toBe(1.0);
  });
  it('elevation 2 returns 1.5', () => {
    expect(getElevationCostMultiplier(2)).toBe(1.5);
  });
});

describe('calculateTileDepth', () => {
  it('returns depth less than calculateDepth at same screenY and elevation', () => {
    // For any screenY and elevation, tile depth < entity depth
    // because tiles use top-edge (screenY - HALF_H) while entities use screenY
    expect(calculateTileDepth(400, 0)).toBeLessThan(calculateDepth(400, 0));
    expect(calculateTileDepth(200, 1)).toBeLessThan(calculateDepth(200, 1));
  });

  it('tile-entity depth gap equals ISO_TILE_HEIGHT / 2', () => {
    const screenY = 400;
    const elevation = 0;
    const gap = calculateDepth(screenY, elevation) - calculateTileDepth(screenY, elevation);
    expect(gap).toBe(ISO_TILE_HEIGHT / 2); // 32
  });

  it('elevation bucketing still separates tile depth bands', () => {
    // Highest possible tile depth at elevation 0 should be less than
    // lowest tile depth at elevation 1
    // Max screenY for a 16x12 grid: (15+11)*32 = 832
    expect(calculateTileDepth(832, 0)).toBeLessThan(calculateTileDepth(0, 1));
  });

  it('tiles at higher row+col have higher depth', () => {
    // Tile at (6,5) should have higher depth than tile at (5,5)
    const screenY_5_5 = (5 + 5) * 32; // 320
    const screenY_6_5 = (6 + 5) * 32; // 352
    expect(calculateTileDepth(screenY_5_5, 0)).toBeLessThan(calculateTileDepth(screenY_6_5, 0));
  });
});
