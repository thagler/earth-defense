import { describe, it, expect } from 'vitest';
import { hasLineOfSight } from '../line-of-sight';

// Simple 5x5 height grid for testing
const flatGrid = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const wallGrid = [
  [0, 0, 0, 0, 0],
  [0, 0, 3, 0, 0],  // wall at (2,1) blocks LOS
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

describe('hasLineOfSight', () => {
  it('returns true on flat terrain', () => {
    expect(hasLineOfSight(flatGrid, 0, 0, 0, 4, 4, 0)).toBe(true);
  });
  it('returns true when looking from same cell', () => {
    expect(hasLineOfSight(flatGrid, 2, 2, 0, 2, 2, 0)).toBe(true);
  });
  it('returns false when wall blocks line', () => {
    // Tower at (0,1) elev 0, enemy at (4,1) elev 0, wall at (2,1) elev 3
    expect(hasLineOfSight(wallGrid, 0, 1, 0, 4, 1, 0)).toBe(false);
  });
  it('returns true when both above the wall', () => {
    // Tower at elev 3, enemy at elev 3, wall at elev 3 -- NOT blocking (must be > max)
    expect(hasLineOfSight(wallGrid, 0, 1, 3, 4, 1, 3)).toBe(true);
  });
});
