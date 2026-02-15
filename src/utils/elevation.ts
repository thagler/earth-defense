import { DEPTH_BAND, ISO_TILE_HEIGHT } from '../config/maps';

/** Calculate Phaser depth value using elevation-bucketed sorting. */
export function calculateDepth(screenY: number, elevation: number): number {
  return elevation * DEPTH_BAND + screenY;
}

/** Calculate Phaser depth for TILE sprites using top-edge of diamond.
 *  Tiles use top-edge depth so that entities standing on them always sort
 *  in front (entities use calculateDepth based on actual screen Y). */
export function calculateTileDepth(screenY: number, elevation: number): number {
  return elevation * DEPTH_BAND + (screenY - ISO_TILE_HEIGHT / 2);
}

/** Effective tower range accounting for height advantage/disadvantage. */
export function getEffectiveRange(baseRange: number, towerElevation: number, targetElevation: number): number {
  const heightDiff = towerElevation - targetElevation;
  const multiplier = 1 + heightDiff * 0.15;
  return baseRange * Math.max(multiplier, 0.5);
}

/** Speed modifier for enemy moving between elevation levels. */
export function getSlopeSpeedModifier(currentElevation: number, nextElevation: number): number {
  return 1.0 + (currentElevation - nextElevation) * 0.1;
}

/** Tower cost multiplier based on build slot elevation. */
export function getElevationCostMultiplier(elevation: number): number {
  return 1.0 + elevation * 0.25;
}
