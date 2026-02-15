/**
 * Isometric direction utilities for 8-directional sprite selection.
 * Supports 4 unique sprites (S, SW, W, NW) mirrored to cover 8 directions.
 */

/**
 * Eight cardinal and intercardinal directions in screen-space isometric orientation.
 * Values 0-7 map to 45-degree sectors starting from S (down).
 */
export enum IsoDirection {
  S = 0,   // South (down)
  SW = 1,  // Southwest (down-left)
  W = 2,   // West (left)
  NW = 3,  // Northwest (up-left)
  N = 4,   // North (up)
  NE = 5,  // Northeast (up-right)
  E = 6,   // East (right)
  SE = 7,  // Southeast (down-right)
}

/**
 * Maps each IsoDirection to a base sprite suffix and horizontal flip flag.
 * The 4 unique sprite angles (S, SW, W, NW) are mirrored to create the full 8.
 */
export const DIRECTION_SPRITE_MAP: Record<IsoDirection, { suffix: string; flipX: boolean }> = {
  [IsoDirection.S]:  { suffix: 'south',     flipX: false },
  [IsoDirection.SW]: { suffix: 'southwest', flipX: false },
  [IsoDirection.W]:  { suffix: 'west',      flipX: false },
  [IsoDirection.NW]: { suffix: 'northwest', flipX: false },
  [IsoDirection.N]:  { suffix: 'northwest', flipX: true },
  [IsoDirection.NE]: { suffix: 'west',      flipX: true },
  [IsoDirection.E]:  { suffix: 'southwest', flipX: true },
  [IsoDirection.SE]: { suffix: 'south',     flipX: true },
};

/**
 * The 4 canonical direction suffixes used for texture generation.
 */
export const DIRECTION_SUFFIXES = ['south', 'southwest', 'west', 'northwest'] as const;

/**
 * Snaps a movement vector (dx, dy) to the nearest of 8 isometric directions.
 * Uses Math.atan2 to compute angle and divides the circle into 8 sectors.
 *
 * @param dx - Horizontal component of movement vector (screen space)
 * @param dy - Vertical component of movement vector (screen space)
 * @returns The nearest IsoDirection (0-7)
 */
export function snapToDirection(dx: number, dy: number): IsoDirection {
  // Handle zero vector (no movement)
  if (dx === 0 && dy === 0) {
    return IsoDirection.S;
  }

  // Compute angle in radians (-π to π)
  // atan2(dy, dx) gives 0 for east, π/2 for south, π for west, -π/2 for north
  const angle = Math.atan2(dy, dx);

  // Convert to degrees and normalize to [0, 360)
  const degrees = (angle * 180 / Math.PI + 360) % 360;

  // Divide into 8 sectors of 45 degrees each
  // East (0°) = sector 0, Southeast (45°) = sector 1, South (90°) = sector 2, etc.
  // Offset by 22.5° so each direction is centered in its sector
  const sector = Math.round((degrees + 22.5) / 45) % 8;

  // Map sectors to IsoDirection enum:
  // Sector 0 (E) → E=6, Sector 1 (SE) → SE=7, Sector 2 (S) → S=0, etc.
  const sectorToDirection = [
    IsoDirection.E,   // 0: East (0°)
    IsoDirection.SE,  // 1: Southeast (45°)
    IsoDirection.S,   // 2: South (90°)
    IsoDirection.SW,  // 3: Southwest (135°)
    IsoDirection.W,   // 4: West (180°)
    IsoDirection.NW,  // 5: Northwest (225°)
    IsoDirection.N,   // 6: North (270°)
    IsoDirection.NE,  // 7: Northeast (315°)
  ];

  return sectorToDirection[sector];
}

/**
 * Returns the texture key and flipX flag for an entity sprite.
 *
 * @param prefix - Entity type prefix (e.g., "enemy-drone", "tower-laser")
 * @param direction - The IsoDirection the entity is facing
 * @returns Object with texture key and flipX flag
 */
export function getSpriteKey(prefix: string, direction: IsoDirection): { key: string; flipX: boolean } {
  const { suffix, flipX } = DIRECTION_SPRITE_MAP[direction];
  return {
    key: `${prefix}-${suffix}`,
    flipX,
  };
}
