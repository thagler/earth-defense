import { describe, it, expect } from 'vitest';
import {
  IsoDirection,
  DIRECTION_SPRITE_MAP,
  DIRECTION_SUFFIXES,
  snapToDirection,
  getSpriteKey,
} from '../direction';

describe('direction utilities', () => {
  describe('IsoDirection enum', () => {
    it('should have 8 directions numbered 0-7', () => {
      expect(IsoDirection.S).toBe(0);
      expect(IsoDirection.SW).toBe(1);
      expect(IsoDirection.W).toBe(2);
      expect(IsoDirection.NW).toBe(3);
      expect(IsoDirection.N).toBe(4);
      expect(IsoDirection.NE).toBe(5);
      expect(IsoDirection.E).toBe(6);
      expect(IsoDirection.SE).toBe(7);
    });
  });

  describe('DIRECTION_SPRITE_MAP', () => {
    it('should cover all 8 directions', () => {
      expect(Object.keys(DIRECTION_SPRITE_MAP)).toHaveLength(8);
    });

    it('should map S to south without flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.S]).toEqual({ suffix: 'south', flipX: false });
    });

    it('should map SW to southwest without flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.SW]).toEqual({ suffix: 'southwest', flipX: false });
    });

    it('should map W to west without flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.W]).toEqual({ suffix: 'west', flipX: false });
    });

    it('should map NW to northwest without flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.NW]).toEqual({ suffix: 'northwest', flipX: false });
    });

    it('should map N to northwest with flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.N]).toEqual({ suffix: 'northwest', flipX: true });
    });

    it('should map NE to west with flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.NE]).toEqual({ suffix: 'west', flipX: true });
    });

    it('should map E to southwest with flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.E]).toEqual({ suffix: 'southwest', flipX: true });
    });

    it('should map SE to south with flip', () => {
      expect(DIRECTION_SPRITE_MAP[IsoDirection.SE]).toEqual({ suffix: 'south', flipX: true });
    });
  });

  describe('DIRECTION_SUFFIXES', () => {
    it('should contain exactly 4 canonical suffixes', () => {
      expect(DIRECTION_SUFFIXES).toHaveLength(4);
      expect(DIRECTION_SUFFIXES).toEqual(['south', 'southwest', 'west', 'northwest']);
    });
  });

  describe('snapToDirection', () => {
    it('should return S for zero vector', () => {
      expect(snapToDirection(0, 0)).toBe(IsoDirection.S);
    });

    it('should return E for east vector (1, 0)', () => {
      expect(snapToDirection(1, 0)).toBe(IsoDirection.E);
    });

    it('should return SE for southeast vector (1, 1)', () => {
      expect(snapToDirection(1, 1)).toBe(IsoDirection.SE);
    });

    it('should return S for south vector (0, 1)', () => {
      expect(snapToDirection(0, 1)).toBe(IsoDirection.S);
    });

    it('should return SW for southwest vector (-1, 1)', () => {
      expect(snapToDirection(-1, 1)).toBe(IsoDirection.SW);
    });

    it('should return W for west vector (-1, 0)', () => {
      expect(snapToDirection(-1, 0)).toBe(IsoDirection.W);
    });

    it('should return NW for northwest vector (-1, -1)', () => {
      expect(snapToDirection(-1, -1)).toBe(IsoDirection.NW);
    });

    it('should return N for north vector (0, -1)', () => {
      expect(snapToDirection(0, -1)).toBe(IsoDirection.N);
    });

    it('should return NE for northeast vector (1, -1)', () => {
      expect(snapToDirection(1, -1)).toBe(IsoDirection.NE);
    });

    it('should handle non-unit vectors correctly', () => {
      expect(snapToDirection(100, 0)).toBe(IsoDirection.E);
      expect(snapToDirection(0, -50)).toBe(IsoDirection.N);
      expect(snapToDirection(-3, 3)).toBe(IsoDirection.SW);
    });

    it('should snap near-diagonal vectors to closest direction', () => {
      // Slightly off southeast (closer to SE than S or E)
      expect(snapToDirection(10, 9)).toBe(IsoDirection.SE);
      // Slightly off northwest (closer to NW than N or W)
      expect(snapToDirection(-10, -9)).toBe(IsoDirection.NW);
    });
  });

  describe('getSpriteKey', () => {
    it('should return correct key and flipX for S direction', () => {
      const result = getSpriteKey('enemy-drone', IsoDirection.S);
      expect(result).toEqual({ key: 'enemy-drone-south', flipX: false });
    });

    it('should return correct key and flipX for SW direction', () => {
      const result = getSpriteKey('enemy-drone', IsoDirection.SW);
      expect(result).toEqual({ key: 'enemy-drone-southwest', flipX: false });
    });

    it('should return correct key and flipX for W direction', () => {
      const result = getSpriteKey('tower-laser', IsoDirection.W);
      expect(result).toEqual({ key: 'tower-laser-west', flipX: false });
    });

    it('should return correct key and flipX for NW direction', () => {
      const result = getSpriteKey('tower-laser', IsoDirection.NW);
      expect(result).toEqual({ key: 'tower-laser-northwest', flipX: false });
    });

    it('should return correct key and flipX for N direction (mirrored)', () => {
      const result = getSpriteKey('enemy-brute', IsoDirection.N);
      expect(result).toEqual({ key: 'enemy-brute-northwest', flipX: true });
    });

    it('should return correct key and flipX for NE direction (mirrored)', () => {
      const result = getSpriteKey('enemy-brute', IsoDirection.NE);
      expect(result).toEqual({ key: 'enemy-brute-west', flipX: true });
    });

    it('should return correct key and flipX for E direction (mirrored)', () => {
      const result = getSpriteKey('tower-missile', IsoDirection.E);
      expect(result).toEqual({ key: 'tower-missile-southwest', flipX: true });
    });

    it('should return correct key and flipX for SE direction (mirrored)', () => {
      const result = getSpriteKey('tower-missile', IsoDirection.SE);
      expect(result).toEqual({ key: 'tower-missile-south', flipX: true });
    });

    it('should work with different entity prefixes', () => {
      expect(getSpriteKey('enemy-drone', IsoDirection.S).key).toBe('enemy-drone-south');
      expect(getSpriteKey('tower-laser', IsoDirection.W).key).toBe('tower-laser-west');
      expect(getSpriteKey('enemy-mini_drone', IsoDirection.NW).key).toBe('enemy-mini_drone-northwest');
    });
  });
});
