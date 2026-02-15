import { describe, it, expect } from 'vitest';
import { MapConfig, TileType, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ELEVATION_PX, DEPTH_BAND } from '../maps';

describe('MapConfig interface', () => {
  it('should include world, heightGrid, and elevation arrays', () => {
    const mockMap: MapConfig = {
      level: 1,
      name: 'Test',
      world: 1,
      grid: [[0]],
      heightGrid: [[0]],
      pathPoints: [{ x: 0, y: 0 }],
      pathElevations: [0],
      buildSlotElevations: [0],
    };
    expect(mockMap.world).toBe(1);
    expect(mockMap.heightGrid[0][0]).toBe(0);
  });
});

describe('Isometric constants', () => {
  it('ISO_TILE_WIDTH should be 128', () => expect(ISO_TILE_WIDTH).toBe(128));
  it('ISO_TILE_HEIGHT should be 64', () => expect(ISO_TILE_HEIGHT).toBe(64));
  it('ELEVATION_PX should be 16', () => expect(ELEVATION_PX).toBe(16));
  it('DEPTH_BAND should be 900', () => expect(DEPTH_BAND).toBe(900));
});
