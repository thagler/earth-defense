import { describe, it, expect } from 'vitest';
import { cartToIso, isoToCart, tileToWorld, worldToTile } from '../coordinates';

describe('cartToIso', () => {
  it('converts (0,0) to origin', () => {
    const { screenX, screenY } = cartToIso(0, 0, 0);
    expect(screenX).toBe(0);
    expect(screenY).toBe(0);
  });
  it('converts (1,0) correctly', () => {
    const { screenX, screenY } = cartToIso(1, 0, 0);
    expect(screenX).toBe(64);   // (1-0) * 64
    expect(screenY).toBe(32);   // (1+0) * 32
  });
  it('converts (0,1) correctly', () => {
    const { screenX, screenY } = cartToIso(0, 1, 0);
    expect(screenX).toBe(-64);  // (0-1) * 64
    expect(screenY).toBe(32);   // (0+1) * 32
  });
  it('applies elevation offset', () => {
    const e0 = cartToIso(1, 1, 0);
    const e1 = cartToIso(1, 1, 1);
    expect(e1.screenY).toBe(e0.screenY - 16);
  });
});

describe('isoToCart', () => {
  it('roundtrips with cartToIso', () => {
    const { screenX, screenY } = cartToIso(3, 5, 0);
    const { col, row } = isoToCart(screenX, screenY);
    expect(Math.round(col)).toBe(3);
    expect(Math.round(row)).toBe(5);
  });
});

describe('tileToWorld', () => {
  it('returns center of diamond tile at (0,0)', () => {
    const { x, y } = tileToWorld(0, 0, 0);
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
  });
});

describe('worldToTile', () => {
  it('roundtrips with tileToWorld', () => {
    const world = tileToWorld(4, 7, 0);
    const tile = worldToTile(world.x, world.y);
    expect(Math.round(tile.col)).toBe(4);
    expect(Math.round(tile.row)).toBe(7);
  });
});
