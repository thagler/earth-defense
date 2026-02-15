/**
 * Map definitions for all 5 levels of Earth Defense.
 *
 * Grid: 16 columns x 12 rows (1024x768 at 64px tiles)
 *
 * Tile types:
 *   0 = ground (empty, non-buildable)
 *   1 = path (where enemies walk)
 *   2 = build slot (where towers can be placed)
 *   3 = spawn point (where enemies enter)
 *   4 = base/goal (what enemies are trying to reach)
 */

export const TILE_SIZE = 64;
export const MAP_COLS = 16;
export const MAP_ROWS = 12;

export const ISO_TILE_WIDTH = 128;
export const ISO_TILE_HEIGHT = 64;
export const ELEVATION_PX = 16;
export const DEPTH_BAND = 900;
export const MAX_ELEVATION = 3;

export enum TileType {
  Ground = 0,
  Path = 1,
  BuildSlot = 2,
  Spawn = 3,
  Base = 4,
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapConfig {
  level: number;
  name: string;
  world: number;
  grid: number[][];
  heightGrid: number[][];
  pathPoints: MapPoint[];
  pathElevations: number[];
  buildSlotElevations: number[];
}

// ===========================================================================
// WORLD 1: DESERT OUTPOST (Levels 1-5, Elevation 0-1)
// ===========================================================================

// ---------------------------------------------------------------------------
// Level 1 -- Forward Base (16x12, flat)
// Simple S-curve path, 6 build slots
// ---------------------------------------------------------------------------
const level1Grid: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 0
  [ 3, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 1
  [ 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 2
  [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 3
  [ 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ], // row 4
  [ 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0 ], // row 5
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ], // row 6
  [ 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ], // row 7
  [ 0, 0, 0, 1, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0 ], // row 8
  [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 9
  [ 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4 ], // row 10
  [ 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 11
];

const level1Path: MapPoint[] = [
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
  { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 },
  { x: 7, y: 4 }, { x: 8, y: 4 }, { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 },
  { x: 12, y: 4 }, { x: 12, y: 5 }, { x: 12, y: 6 }, { x: 12, y: 7 }, { x: 11, y: 7 },
  { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 },
  { x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }, { x: 3, y: 8 }, { x: 3, y: 9 },
  { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 6, y: 10 }, { x: 7, y: 10 },
  { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 },
  { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 },
];

// ---------------------------------------------------------------------------
// Level 2 -- Coastal Base
// Faster path with tighter turns, 10 build slots
// Build slots at: (4,2),(7,2),(11,2),(2,4),(5,5),(8,5),(5,8),(8,8),(11,8),(13,11)
// ---------------------------------------------------------------------------
const level2Grid: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 0
  [ 0, 0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ], // row 1
  [ 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 1, 0, 0, 0 ], // row 2
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ], // row 3
  [ 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ], // row 4
  [ 0, 0, 0, 1, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0 ], // row 5
  [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 6
  [ 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ], // row 7
  [ 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 1, 0, 0, 0 ], // row 8
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ], // row 9
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 4 ], // row 10
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0 ], // row 11
];

const level2Path: MapPoint[] = [
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 6, y: 1 },
  { x: 7, y: 1 },
  { x: 8, y: 1 },
  { x: 9, y: 1 },
  { x: 10, y: 1 },
  { x: 11, y: 1 },
  { x: 12, y: 1 },
  { x: 12, y: 2 },
  { x: 12, y: 3 },
  { x: 12, y: 4 },
  { x: 11, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 4 },
  { x: 8, y: 4 },
  { x: 7, y: 4 },
  { x: 6, y: 4 },
  { x: 5, y: 4 },
  { x: 4, y: 4 },
  { x: 3, y: 4 },
  { x: 3, y: 5 },
  { x: 3, y: 6 },
  { x: 3, y: 7 },
  { x: 4, y: 7 },
  { x: 5, y: 7 },
  { x: 6, y: 7 },
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 9, y: 7 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
  { x: 12, y: 7 },
  { x: 12, y: 8 },
  { x: 12, y: 9 },
  { x: 12, y: 10 },
  { x: 13, y: 10 },
  { x: 14, y: 10 },
  { x: 15, y: 10 },
];

// ---------------------------------------------------------------------------
// Level 3 -- Mountain Pass
// Long straight stretches with U-turns, 12 build slots
// Build slots at: (1,2),(2,4),(4,4),(7,4),(10,4),(13,4),
//                 (2,8),(4,8),(7,8),(10,8),(13,8),(2,11)
// ---------------------------------------------------------------------------
const level3Grid: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 0
  [ 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 1
  [ 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 2
  [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ], // row 3
  [ 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 1, 0 ], // row 4
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ], // row 5
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ], // row 6
  [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ], // row 7
  [ 0, 1, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0 ], // row 8
  [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 9
  [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4 ], // row 10
  [ 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 11
];

const level3Path: MapPoint[] = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 3 },
  { x: 4, y: 3 },
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
  { x: 9, y: 3 },
  { x: 10, y: 3 },
  { x: 11, y: 3 },
  { x: 12, y: 3 },
  { x: 13, y: 3 },
  { x: 14, y: 3 },
  { x: 14, y: 4 },
  { x: 14, y: 5 },
  { x: 14, y: 6 },
  { x: 14, y: 7 },
  { x: 13, y: 7 },
  { x: 12, y: 7 },
  { x: 11, y: 7 },
  { x: 10, y: 7 },
  { x: 9, y: 7 },
  { x: 8, y: 7 },
  { x: 7, y: 7 },
  { x: 6, y: 7 },
  { x: 5, y: 7 },
  { x: 4, y: 7 },
  { x: 3, y: 7 },
  { x: 2, y: 7 },
  { x: 1, y: 7 },
  { x: 1, y: 8 },
  { x: 1, y: 9 },
  { x: 1, y: 10 },
  { x: 2, y: 10 },
  { x: 3, y: 10 },
  { x: 4, y: 10 },
  { x: 5, y: 10 },
  { x: 6, y: 10 },
  { x: 7, y: 10 },
  { x: 8, y: 10 },
  { x: 9, y: 10 },
  { x: 10, y: 10 },
  { x: 11, y: 10 },
  { x: 12, y: 10 },
  { x: 13, y: 10 },
  { x: 14, y: 10 },
  { x: 15, y: 10 },
];

// ---------------------------------------------------------------------------
// Level 4 -- Urban Ruins
// Multiple path segments close together, 14 build slots
// Build slots at: (2,1),(5,1),(7,3),(9,3),(12,3),(4,5),(7,5),(11,5),
//                 (3,8),(6,8),(8,8),(10,10),(11,11),(14,11)
// ---------------------------------------------------------------------------
const level4Grid: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ 0, 3, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 0
  [ 0, 0, 2, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 1
  [ 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ], // row 2
  [ 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 1, 0, 0 ], // row 3
  [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ], // row 4
  [ 0, 0, 1, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0 ], // row 5
  [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 6
  [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0 ], // row 7
  [ 0, 0, 0, 2, 0, 0, 2, 0, 2, 1, 0, 0, 0, 0, 0, 0 ], // row 8
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0 ], // row 9
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 1, 1, 4 ], // row 10
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0 ], // row 11
];

const level4Path: MapPoint[] = [
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 4, y: 0 },
  { x: 5, y: 0 },
  { x: 6, y: 0 },
  { x: 6, y: 1 },
  { x: 6, y: 2 },
  { x: 7, y: 2 },
  { x: 8, y: 2 },
  { x: 9, y: 2 },
  { x: 10, y: 2 },
  { x: 11, y: 2 },
  { x: 12, y: 2 },
  { x: 13, y: 2 },
  { x: 13, y: 3 },
  { x: 13, y: 4 },
  { x: 12, y: 4 },
  { x: 11, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 4 },
  { x: 8, y: 4 },
  { x: 7, y: 4 },
  { x: 6, y: 4 },
  { x: 5, y: 4 },
  { x: 4, y: 4 },
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
  { x: 2, y: 7 },
  { x: 3, y: 7 },
  { x: 4, y: 7 },
  { x: 5, y: 7 },
  { x: 6, y: 7 },
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 9, y: 7 },
  { x: 9, y: 8 },
  { x: 9, y: 9 },
  { x: 10, y: 9 },
  { x: 11, y: 9 },
  { x: 12, y: 9 },
  { x: 12, y: 10 },
  { x: 13, y: 10 },
  { x: 14, y: 10 },
  { x: 15, y: 10 },
];

// ---------------------------------------------------------------------------
// Level 5 -- Mothership Approach
// Complex winding spiral path, 16 build slots
// Spirals from top-left edge inward, exits bottom center
// ---------------------------------------------------------------------------
const level5Grid: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0 ], // row 0
  [ 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ], // row 1
  [ 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0 ], // row 2
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0 ], // row 3
  [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ], // row 4
  [ 0, 2, 1, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0 ], // row 5
  [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // row 6
  [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ], // row 7
  [ 0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1, 0, 0, 0, 0 ], // row 8
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0 ], // row 9
  [ 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0 ], // row 10
  [ 0, 0, 0, 0, 0, 0, 2, 4, 0, 2, 0, 0, 0, 0, 0, 0 ], // row 11
];

const level5Path: MapPoint[] = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 6, y: 1 },
  { x: 7, y: 1 },
  { x: 8, y: 1 },
  { x: 9, y: 1 },
  { x: 10, y: 1 },
  { x: 11, y: 1 },
  { x: 12, y: 1 },
  { x: 13, y: 1 },
  { x: 13, y: 2 },
  { x: 13, y: 3 },
  { x: 13, y: 4 },
  { x: 12, y: 4 },
  { x: 11, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 4 },
  { x: 8, y: 4 },
  { x: 7, y: 4 },
  { x: 6, y: 4 },
  { x: 5, y: 4 },
  { x: 4, y: 4 },
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
  { x: 2, y: 7 },
  { x: 3, y: 7 },
  { x: 4, y: 7 },
  { x: 5, y: 7 },
  { x: 6, y: 7 },
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 9, y: 7 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
  { x: 11, y: 8 },
  { x: 11, y: 9 },
  { x: 11, y: 10 },
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 7, y: 11 },
];

// ---------------------------------------------------------------------------
// Helper function to create zero-filled grids for backwards compatibility
// ---------------------------------------------------------------------------
function createZeroHeightGrid(grid: number[][]): number[][] {
  return grid.map(row => row.map(() => 0));
}

function createZeroElevations(length: number): number[] {
  return Array(length).fill(0);
}

// ---------------------------------------------------------------------------
// Exported map configurations
// ---------------------------------------------------------------------------
export const MAPS: MapConfig[] = [
  {
    level: 1,
    name: 'Desert Outpost',
    world: 1,
    grid: level1Grid,
    heightGrid: createZeroHeightGrid(level1Grid),
    pathPoints: level1Path,
    pathElevations: createZeroElevations(level1Path.length),
    buildSlotElevations: createZeroElevations(8),
  },
  {
    level: 2,
    name: 'Coastal Base',
    world: 1,
    grid: level2Grid,
    heightGrid: createZeroHeightGrid(level2Grid),
    pathPoints: level2Path,
    pathElevations: createZeroElevations(level2Path.length),
    buildSlotElevations: createZeroElevations(10),
  },
  {
    level: 3,
    name: 'Mountain Pass',
    world: 1,
    grid: level3Grid,
    heightGrid: createZeroHeightGrid(level3Grid),
    pathPoints: level3Path,
    pathElevations: createZeroElevations(level3Path.length),
    buildSlotElevations: createZeroElevations(12),
  },
  {
    level: 4,
    name: 'Urban Ruins',
    world: 1,
    grid: level4Grid,
    heightGrid: createZeroHeightGrid(level4Grid),
    pathPoints: level4Path,
    pathElevations: createZeroElevations(level4Path.length),
    buildSlotElevations: createZeroElevations(14),
  },
  {
    level: 5,
    name: 'Mothership Approach',
    world: 1,
    grid: level5Grid,
    heightGrid: createZeroHeightGrid(level5Grid),
    pathPoints: level5Path,
    pathElevations: createZeroElevations(level5Path.length),
    buildSlotElevations: createZeroElevations(16),
  },
];

/**
 * Retrieve a map config by level number.
 * Falls back to level 1 if the requested level is not found.
 */
export function getMapByLevel(level: number): MapConfig {
  return MAPS.find((m) => m.level === level) ?? MAPS[0];
}
