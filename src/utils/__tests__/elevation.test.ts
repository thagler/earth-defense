import { describe, it, expect } from 'vitest';
import { calculateDepth, getEffectiveRange, getSlopeSpeedModifier, getElevationCostMultiplier } from '../elevation';

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
