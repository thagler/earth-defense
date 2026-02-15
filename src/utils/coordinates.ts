import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ELEVATION_PX } from '../config/maps';

const HALF_W = ISO_TILE_WIDTH / 2;   // 64
const HALF_H = ISO_TILE_HEIGHT / 2;  // 32

/** Convert tile grid (col, row, elevation) to isometric screen position. */
export function cartToIso(col: number, row: number, elevation: number = 0): { screenX: number; screenY: number } {
  return {
    screenX: (col - row) * HALF_W,
    screenY: (col + row) * HALF_H - (elevation * ELEVATION_PX),
  };
}

/** Convert isometric screen position back to grid (col, row). Ignores elevation. */
export function isoToCart(screenX: number, screenY: number): { col: number; row: number } {
  return {
    col: (screenX / HALF_W + screenY / HALF_H) / 2,
    row: (screenY / HALF_H - screenX / HALF_W) / 2,
  };
}

/** Convert tile grid position to world coordinates (center of the diamond). */
export function tileToWorld(col: number, row: number, elevation: number = 0): { x: number; y: number } {
  const { screenX, screenY } = cartToIso(col, row, elevation);
  return { x: screenX, y: screenY };
}

/** Convert world coordinates back to approximate tile grid position. */
export function worldToTile(worldX: number, worldY: number): { col: number; row: number } {
  return isoToCart(worldX, worldY);
}
