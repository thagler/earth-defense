# Earth Defense v2.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the game from orthogonal top-down to isometric rendering with full tactical elevation, rebalance economy/towers, and expand from 5 to 15 levels across 3 themed worlds.

**Architecture:** File-based agent coordination. The orchestrator dispatches subagents that communicate through artifact files. Each phase produces code files that serve as the API for downstream phases. Subagents run in parallel wherever dependencies allow.

**Tech Stack:** Phaser 3.90, TypeScript, Vite, Vitest (jsdom)

**Design Doc:** `docs/plans/2026-02-15-isometric-elevation-rebalance-design.md`

---

## Coordination Architecture

### File-Based Agent Communication

Agents communicate through the files they produce, not through shared memory or verbose reporting. Each agent:
1. Reads its input files (listed in "Reads" for each task)
2. Writes its output files (listed in "Writes" for each task)
3. Writes a one-line status to `docs/plans/artifacts/status/<task-id>.done` on completion
4. Reports minimally to the orchestrator (file path + pass/fail only)

### Artifact Directory

```
docs/plans/artifacts/
  status/          # One file per completed task: "DONE" or "FAIL: reason"
  mockups/         # Isomer.js and Phaser preview outputs
```

### Dependency Graph

```
Phase 0: Mockups (visual approval gate)
  T0A: Isomer.js mockup ─────────────────────┐
  T0B: Phaser iso preview scene ──────────────┤
                                              ▼
                                    [User approves visuals]
                                              │
Phase 1: Foundation (all downstream depends on this)
  T1A: Config interfaces + constants ─────────┐
  T1B: Coordinate utility module ─────────────┤
  T1C: Elevation utility module ──────────────┤
  T1D: LOS utility module ───────────────────┤
                                              │
         ┌────────────────┬──────────────┬────┴────────────┐
         ▼                ▼              ▼                  ▼
Phase 2: Parallel Streams (4 agents simultaneously)
  T2A: Asset generation   T2B: Balance   T2C: Level content  T2D: Camera system
  (iso diamond tiles)     (towers/eco)   (15 maps+heights)   (panning input)
         │                │              │                    │
         └────────────────┴──────────────┴────────────────────┘
                                    │
Phase 3: System Rewrites (depends on Phase 1+2)
  T3A: TilemapRenderer (iso) ──┬── T3B: PathFollower (elevation) ──── PARALLEL
  T3C: TowerManager (elevation)┤
  T3D: EnemySpawner (elevation)┘
                    │
Phase 4: Entity Updates (depends on Phase 3)
  T4A: Tower entity ──┬── T4B: Enemy entity ──┬── T4C: Projectile ── PARALLEL
                      │                       │
Phase 5: Integration (depends on all above)
  T5A: GameScene rewiring ────────────────────┐
  T5B: MenuScene world selector ──────────────┤ PARALLEL (separate files)
  T5C: UI updates (HUD, TowerPicker, etc) ────┘
                    │
Phase 6: Verification
  T6A: Type check + build ────────────────────┐
  T6B: Test suite ────────────────────────────┤
  T6C: Manual play-test checklist ────────────┘
```

---

## Phase 0: Mockups (Visual Approval Gate)

### Task T0A: Isomer.js Standalone Mockup

**Reads:** `src/config/maps.ts` (grid arrays), `src/systems/TilemapRenderer.ts` (tile colors)
**Writes:** `tools/iso-mockup.html`

**Step 1: Create mockup HTML file**

Create `tools/iso-mockup.html` -- a standalone HTML file with embedded JavaScript that:
- Imports all 5 existing level grid arrays as inline JS (copy from maps.ts)
- Loads Isomer.js from CDN: `https://cdnjs.cloudflare.com/ajax/libs/isomer/0.2.6/isomer.min.js`
- Renders each level as isometric 3D prisms on a canvas
- Uses these colors from TilemapRenderer:
  ```
  Ground:    rgb(26, 26, 46)    -- height 0.05
  Path:      rgb(42, 42, 62)    -- height 0.02 (recessed)
  BuildSlot: rgb(46, 58, 46)    -- height 0.15 (raised platform)
  Spawn:     rgb(68, 255, 68)   -- height 0.1
  Base:      rgb(255, 68, 68)   -- height 0.1
  ```
- Adds sample elevation data for Level 1 (flat) and Level 3 (heights 0-1) to preview elevation rendering
- Adds a level selector dropdown to switch between maps
- Canvas size: 1800x900 for comfortable viewing

**Step 2: Open in browser and verify**

Run: `open tools/iso-mockup.html`
Expected: See all 5 maps rendered isometrically with 3D depth

**Step 3: Commit**

```bash
git add tools/iso-mockup.html
git commit -m "feat: add Isomer.js isometric mockup tool"
```

---

### Task T0B: Phaser Isometric Preview Scene

**Reads:** `src/config/maps.ts`, `src/systems/AssetGenerator.ts`
**Writes:** `src/scenes/IsoPreviewScene.ts`, modifies `src/main.ts`, `src/systems/AssetGenerator.ts`

**Step 1: Add isometric diamond tile generation to AssetGenerator**

Add new method `generateIsoDiamondTiles(scene)` at the end of `AssetGenerator.ts`:
- Generates 128x64 diamond tiles for each TileType using the same colors
- Texture keys: `iso-tile-ground`, `iso-tile-path`, `iso-tile-build`, `iso-tile-spawn`, `iso-tile-base`
- Draw diamond shape: moveTo(64,0) -> lineTo(128,32) -> lineTo(64,64) -> lineTo(0,32) -> close
- Call this from `generateAll()` after existing generation

**Step 2: Create IsoPreviewScene**

Create `src/scenes/IsoPreviewScene.ts`:
- Uses `Phaser.Tilemaps.MapData` with `orientation: Phaser.Tilemaps.Orientation.ISOMETRIC`
- `tileWidth: 128, tileHeight: 64`
- Creates tilemap from existing level grids
- Accepts `{ level: number }` in init data
- Arrow keys / WASD for camera panning
- Press 1-5 to switch levels

**Step 3: Register scene in main.ts**

Add IsoPreviewScene to the scene array in `src/main.ts`.
Add a keyboard shortcut (P key) in MenuScene to launch IsoPreviewScene.

**Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: Press P on menu to see isometric preview of Level 1; arrow keys pan camera

**Step 5: Commit**

```bash
git add src/scenes/IsoPreviewScene.ts src/systems/AssetGenerator.ts src/main.ts
git commit -m "feat: add Phaser isometric preview scene with diamond tiles"
```

**GATE: User must approve visual direction before proceeding to Phase 1.**

---

## Phase 1: Foundation (All Downstream Depends On This)

### Task T1A: Config Interfaces and Constants

**Reads:** `src/config/maps.ts`, `src/config/levels.ts`
**Writes:** `src/config/maps.ts`, `src/config/levels.ts`, `src/config/constants.ts`

**Step 1: Write test for new interfaces**

Create `src/config/__tests__/maps.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/__tests__/maps.test.ts`
Expected: FAIL -- missing exports

**Step 3: Update MapConfig interface in maps.ts**

In `src/config/maps.ts`, update the `MapConfig` interface:
```typescript
export const ISO_TILE_WIDTH = 128;
export const ISO_TILE_HEIGHT = 64;
export const ELEVATION_PX = 16;
export const DEPTH_BAND = 900;
export const MAX_ELEVATION = 3;

export interface MapConfig {
  level: number;
  name: string;
  world: number;
  grid: TileType[][];
  heightGrid: number[][];
  pathPoints: MapPoint[];
  pathElevations: number[];
  buildSlotElevations: number[];
}
```

Add `world: 1`, `heightGrid` (all-zeros matching grid dimensions), `pathElevations` (all-zeros matching pathPoints length), and `buildSlotElevations` (all-zeros matching build slot count) to ALL existing 5 level maps for backwards compatibility.

Update `LevelConfig` in `src/config/levels.ts`:
```typescript
export interface LevelConfig {
  level: number;
  name: string;
  theme: string;
  world: number;            // NEW
  startingCredits: number;
  passiveIncomeRate: number;
  lives: number;
  buildSlots: number;
  segments: WaveSegment[];
  hpScale: number;
}
```

Add `world: 1` to all 5 existing level configs.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/__tests__/maps.test.ts`
Expected: PASS

**Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: No errors (all existing code still works with new required fields)

**Step 6: Commit**

```bash
git add src/config/maps.ts src/config/levels.ts src/config/__tests__/maps.test.ts
git commit -m "feat: add isometric constants and elevation fields to MapConfig"
```

---

### Task T1B: Coordinate Utility Module

**Reads:** `src/config/maps.ts` (ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ELEVATION_PX)
**Writes:** `src/utils/coordinates.ts`, `src/utils/__tests__/coordinates.test.ts`

**Step 1: Write failing tests**

Create `src/utils/__tests__/coordinates.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/coordinates.test.ts`
Expected: FAIL -- module not found

**Step 3: Implement coordinates.ts**

Create `src/utils/coordinates.ts`:
```typescript
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
```

**Step 4: Run tests**

Run: `npx vitest run src/utils/__tests__/coordinates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/coordinates.ts src/utils/__tests__/coordinates.test.ts
git commit -m "feat: add isometric coordinate conversion utilities"
```

---

### Task T1C: Elevation Utility Module

**Reads:** `src/config/maps.ts` (DEPTH_BAND, MAX_ELEVATION)
**Writes:** `src/utils/elevation.ts`, `src/utils/__tests__/elevation.test.ts`

**Step 1: Write failing tests**

Create `src/utils/__tests__/elevation.test.ts`:
```typescript
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
```

**Step 2: Implement elevation.ts**

Create `src/utils/elevation.ts`:
```typescript
import { DEPTH_BAND } from '../config/maps';

/** Calculate Phaser depth value using elevation-bucketed sorting. */
export function calculateDepth(screenY: number, elevation: number): number {
  return elevation * DEPTH_BAND + screenY;
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
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/__tests__/elevation.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/elevation.ts src/utils/__tests__/elevation.test.ts
git commit -m "feat: add elevation utility functions (depth, range, speed, cost)"
```

---

### Task T1D: Line-of-Sight Utility Module

**Reads:** `src/config/maps.ts` (MapConfig interface)
**Writes:** `src/utils/line-of-sight.ts`, `src/utils/__tests__/line-of-sight.test.ts`

**Step 1: Write failing tests**

Create `src/utils/__tests__/line-of-sight.test.ts`:
```typescript
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
```

**Step 2: Implement line-of-sight.ts**

Create `src/utils/line-of-sight.ts`:
```typescript
/**
 * Check line-of-sight between two tile positions using Bresenham's line algorithm.
 * A tile blocks LOS if its elevation is strictly greater than both the source and target elevations.
 */
export function hasLineOfSight(
  heightGrid: number[][],
  fromCol: number, fromRow: number, fromElevation: number,
  toCol: number, toRow: number, toElevation: number,
): boolean {
  const maxElevation = Math.max(fromElevation, toElevation);

  // Bresenham's line algorithm
  let x0 = fromCol, y0 = fromRow;
  const x1 = toCol, y1 = toRow;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Skip the source and target tiles themselves
    if ((x0 !== fromCol || y0 !== fromRow) && (x0 !== toCol || y0 !== toRow)) {
      // Check bounds
      if (y0 >= 0 && y0 < heightGrid.length && x0 >= 0 && x0 < heightGrid[0].length) {
        if (heightGrid[y0][x0] > maxElevation) {
          return false; // Blocked
        }
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }

  return true;
}
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/__tests__/line-of-sight.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/line-of-sight.ts src/utils/__tests__/line-of-sight.test.ts
git commit -m "feat: add Bresenham line-of-sight utility with elevation blocking"
```

---

## Phase 2: Parallel Streams (4 Agents Simultaneously)

**All 4 tasks in this phase can run in parallel.** They depend only on Phase 1 artifacts and write to separate files.

### Task T2A: Isometric Asset Generation

**Reads:** `src/systems/AssetGenerator.ts`, `src/config/towers.ts`, `src/config/enemies.ts`
**Writes:** `src/systems/AssetGenerator.ts` (adds new methods)

Generate isometric diamond tile textures (128x64), cliff face textures, and perspective-adjusted tower/enemy sprites. Follow the exact same `scene.make.graphics()` + `g.generateTexture()` + `g.destroy()` pattern used by existing methods.

New texture keys to generate:
- `iso-tile-ground`, `iso-tile-path`, `iso-tile-build`, `iso-tile-spawn`, `iso-tile-base` (128x64 diamonds)
- `iso-cliff-N`, `iso-cliff-S`, `iso-cliff-E`, `iso-cliff-W` (cliff faces per direction, 128x16 per elevation step)
- Existing tower/enemy textures can remain as-is (they render as sprites on top of tiles)

Add world-themed color palettes:
```typescript
const WORLD_PALETTES = {
  1: { ground: 0x2a1f0a, path: 0x3a2f1a, build: 0x2e3a1e, accent: 0x88aa44 },  // Desert
  2: { ground: 0x1a1a2a, path: 0x2a2a3a, build: 0x2a2a3e, accent: 0x4488cc },  // Urban
  3: { ground: 0x1a0a2a, path: 0x2a1a3a, build: 0x2a1e3a, accent: 0xaa44ff },  // Alien
};
```

**Commit:** `feat: add isometric diamond tiles, cliff faces, and world palettes to AssetGenerator`

---

### Task T2B: Balance Config Changes

**Reads:** `src/config/towers.ts`, `src/config/enemies.ts`, `src/config/levels.ts`
**Writes:** Same files (number changes only)

Update tower stats per design doc:

**Towers (src/config/towers.ts):**
- Laser T3: fireRate 6->5, damage adjusted proportionally
- Missile: upgradeCosts total reduced from 337 to 300
- Cryo: total cost reduced from 270 to 200
- Rail Gun: T3 damage 130->150, total cost 450->400
- Pulse: T3 damage 32->40, total cost 950->700
- ALL towers: `sellRefundRate: 0.5` -> `0.4`

**Economy (src/config/levels.ts):**
- ALL levels: `startingCredits: 200` -> `150`
- ALL levels: `passiveIncomeRate: 5` -> `2`

**HP Scaling (src/config/levels.ts):**
- Update existing 5 levels with new hpScale values: 1.0, 1.3, 1.7, 2.2, 2.8

Update existing EconomyManager test to reflect new values.

**Commit:** `feat: rebalance economy, towers, and HP scaling per v2.0 design`

---

### Task T2C: Level Content (15 Maps + Height Grids)

**Reads:** `src/config/maps.ts` (MapConfig interface, TileType enum)
**Writes:** `src/config/maps.ts` (replace 5 existing levels with 15 new ones)

This is the largest content task. Create 15 new map definitions with:
- `grid: TileType[][]` -- tile type grid
- `heightGrid: number[][]` -- elevation per cell
- `pathPoints: MapPoint[]` -- waypoints
- `pathElevations: number[]` -- elevation at each waypoint
- `buildSlotElevations: number[]` -- elevation per build slot

**Grid sizes per level:**

| Level | Grid Size | Elevation Range |
|-------|-----------|----------------|
| 1 | 16x12 | 0 (flat) |
| 2 | 18x14 | 0-1 |
| 3 | 20x14 | 0-1 |
| 4 | 20x16 | 0-1 |
| 5 | 22x16 | 0-1 |
| 6 | 20x16 | 0-2 |
| 7 | 22x16 | 0-2 |
| 8 | 22x18 | 0-2 |
| 9 | 24x18 | 0-2 |
| 10 | 24x18 | 0-2 |
| 11 | 24x18 | 0-3 |
| 12 | 26x20 | 0-3 |
| 13 | 26x20 | 0-3 |
| 14 | 28x20 | 0-3 |
| 15 | 28x22 | 0-3 |

**Level design rules (enforced in each map):**
1. No build slots within 3 tiles of spawn point
2. Best (highest elevation) build slots are mid-path
3. Path weaves through elevation changes
4. Each level has 2-3 decision points
5. Levels 13-15 have path Y-junctions

Also create corresponding `LevelConfig` entries in `src/config/levels.ts` with:
- Correct `world` assignments (1-5 = W1, 6-10 = W2, 11-15 = W3)
- New hpScale values per design doc
- Enemy segments using only the enemies available in that world

The `MAP_COLS` and `MAP_ROWS` constants become per-level (stored in MapConfig or derived from grid dimensions) rather than global constants. Update the `MapConfig` interface if needed, or compute from `grid[0].length` and `grid.length`.

**Commit:** `feat: add 15 levels across 3 themed worlds with elevation grids`

---

### Task T2D: Camera Panning System

**Reads:** `src/main.ts`, `src/scenes/GameScene.ts`
**Writes:** `src/systems/CameraController.ts`, `src/systems/__tests__/CameraController.test.ts`

Create `src/systems/CameraController.ts`:
- Accepts a Phaser.Scene in constructor
- Sets camera bounds based on map dimensions: `camera.setBounds(minX, minY, mapWidth, mapHeight)`
- Handles input:
  - WASD / Arrow keys for panning (speed: 400px/sec)
  - Click-and-drag with middle mouse or right-click
  - Scroll wheel zoom (optional, can be deferred)
- `update(delta)` method called from GameScene.update
- Camera starts centered on the map

Map dimensions for isometric:
```
mapPixelWidth = (cols + rows) * (ISO_TILE_WIDTH / 2)
mapPixelHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX)
```

**Commit:** `feat: add camera panning controller with keyboard and mouse drag`

---

## Phase 3: System Rewrites (Depends on Phase 1 + 2)

**T3A and T3B can run in parallel** (separate files). **T3C and T3D can run in parallel** (separate files).

### Task T3A: TilemapRenderer Isometric Rewrite

**Reads:** `src/systems/TilemapRenderer.ts`, `src/config/maps.ts`, `src/utils/coordinates.ts`, `src/utils/elevation.ts`
**Writes:** `src/systems/TilemapRenderer.ts` (full rewrite)

Rewrite TilemapRenderer to:
1. Use `cartToIso()` for all tile positioning instead of `col * TILE_SIZE`
2. Render diamond tiles using iso texture keys
3. Apply elevation Y-offset: `screenY -= elevation * ELEVATION_PX`
4. Draw cliff faces between elevation transitions
5. Set tile depth using `calculateDepth(screenY, elevation)`
6. Build slots use isometric diamond hit areas instead of rectangles
7. `getPathPoints()` returns isometric world coordinates with elevation offsets
8. Handle variable grid sizes (read cols/rows from map grid dimensions, not global constants)

The `BuildSlotInfo` interface gains an `elevation: number` field.

Key change: Build slot interactivity must use diamond-shaped hit areas. Use a Phaser Polygon or Zone with diamond vertices for click detection.

**Commit:** `feat: rewrite TilemapRenderer for isometric projection with elevation`

---

### Task T3B: PathFollower Elevation Support

**Reads:** `src/systems/PathFollower.ts`, `src/utils/elevation.ts`
**Writes:** `src/systems/PathFollower.ts`

Update PathFollower to:
1. Accept `elevations: number[]` parallel to waypoints array
2. When moving between waypoints at different elevations, apply `getSlopeSpeedModifier()` to the speed parameter
3. Expose `currentElevation: number` getter (interpolated between waypoints)
4. Return `{ x, y, elevation }` from `update()` instead of just `{ x, y }`

**Commit:** `feat: add elevation-aware speed modifiers to PathFollower`

---

### Task T3C: TowerManager Elevation Support

**Reads:** `src/systems/TowerManager.ts`, `src/utils/elevation.ts`, `src/utils/line-of-sight.ts`
**Writes:** `src/systems/TowerManager.ts`

Update TowerManager to:
1. Store elevation per tower (passed in at placement from build slot elevation)
2. Apply `getEffectiveRange()` when checking tower-to-enemy distance
3. Apply `hasLineOfSight()` before acquiring a new target
4. Cache LOS result until target changes or moves to a new tile
5. Apply `getElevationCostMultiplier()` when checking affordability (pass to EconomyManager)

**Commit:** `feat: add elevation-aware targeting and LOS to TowerManager`

---

### Task T3D: EnemySpawner Elevation Support

**Reads:** `src/systems/EnemySpawner.ts`, `src/config/maps.ts`
**Writes:** `src/systems/EnemySpawner.ts`

Update EnemySpawner to:
1. Pass `pathElevations` to Enemy constructor (which passes to PathFollower)
2. Split-spawned mini-drones inherit parent's current elevation and remaining path elevations

**Commit:** `feat: pass elevation data through EnemySpawner to PathFollower`

---

## Phase 4: Entity Updates (Depends on Phase 3)

**All 3 tasks can run in parallel** (separate entity files).

### Task T4A: Tower Entity Isometric Positioning

**Reads:** `src/entities/Tower.ts`, `src/utils/coordinates.ts`, `src/utils/elevation.ts`
**Writes:** `src/entities/Tower.ts`

Update Tower entity:
1. Constructor accepts `elevation: number` parameter
2. Position uses `tileToWorld(tileX, tileY, elevation)` instead of `tileX * TILE_SIZE + TILE_SIZE / 2`
3. Set depth using `calculateDepth(this.y, elevation)`
4. Store elevation for range/LOS calculations
5. Range indicator draws as an ellipse (foreshortened circle for isometric perspective)

**Commit:** `feat: update Tower entity for isometric positioning and elevation depth`

---

### Task T4B: Enemy Entity Isometric Positioning

**Reads:** `src/entities/Enemy.ts`, `src/utils/coordinates.ts`, `src/utils/elevation.ts`
**Writes:** `src/entities/Enemy.ts`

Update Enemy entity:
1. `update()` receives position from PathFollower (now includes elevation)
2. Set depth using `calculateDepth(this.y, currentElevation)`
3. Store `currentElevation` for tower targeting

**Commit:** `feat: update Enemy entity for isometric positioning and elevation depth`

---

### Task T4C: Projectile Isometric Positioning

**Reads:** `src/entities/Projectile.ts`, `src/utils/elevation.ts`
**Writes:** `src/entities/Projectile.ts`

Update Projectile:
1. Trail and movement account for isometric coordinate space
2. Set depth using `calculateDepth(this.y, sourceTower.elevation) + 50` (render above entities at same elevation)

**Commit:** `feat: update Projectile for isometric depth sorting`

---

## Phase 5: Integration (Depends on All Above)

### Task T5A: GameScene Rewiring

**Reads:** `src/scenes/GameScene.ts`, all system and entity files
**Writes:** `src/scenes/GameScene.ts`

The orchestrator scene that wires everything together:
1. Instantiate CameraController with map dimensions
2. Pass elevation data through all system constructors
3. Update camera in update loop
4. Pass heightGrid to TilemapRenderer
5. Pass pathElevations to EnemySpawner
6. Pass buildSlotElevations to TowerManager (via TilemapRenderer.getBuildSlots())
7. Wire ambient glows using isometric positions
8. All existing event wiring stays the same (event-driven architecture is elevation-agnostic)

**Commit:** `feat: rewire GameScene for isometric rendering and elevation systems`

---

### Task T5B: MenuScene World Selector

**Reads:** `src/scenes/MenuScene.ts`, `src/config/levels.ts`
**Writes:** `src/scenes/MenuScene.ts`

Update MenuScene to:
1. Group levels by world (3 sections)
2. Show world names and themed color backgrounds
3. Level buttons arranged in world groups
4. Each world section has distinct color accent from WORLD_PALETTES

**Commit:** `feat: update MenuScene with world-grouped level selector`

---

### Task T5C: UI Updates

**Reads:** `src/ui/HUD.ts`, `src/ui/TowerPicker.ts`, `src/ui/TowerInfoPanel.ts`
**Writes:** Same files

Minor UI adjustments:
1. **HUD:** Show current world name alongside level name
2. **TowerPicker:** Show elevation cost multiplier on tower costs when a build slot is selected at elevation > 0
3. **TowerInfoPanel:** Show effective range (accounting for elevation) instead of base range

**Commit:** `feat: update UI components with elevation-aware displays`

---

## Phase 6: Verification

### Task T6A: Type Check and Build

Run: `npx tsc --noEmit && npm run build`
Expected: Zero type errors, clean Vite build

### Task T6B: Test Suite

Run: `npm run test`
Expected: All tests pass, including new utility tests

### Task T6C: Manual Play-Test Checklist

Open `npm run dev` and verify:
- [ ] Level 1 renders isometrically with flat terrain
- [ ] Level 2+ shows elevation differences visually
- [ ] Camera pans with WASD and mouse drag
- [ ] Towers can be placed on isometric build slots (click detection works)
- [ ] Enemies follow isometric paths with correct elevation offsets
- [ ] Enemies slow down uphill, speed up downhill
- [ ] Towers on high ground have visibly larger range indicators
- [ ] Towers cannot target enemies behind high cliffs (LOS blocking)
- [ ] High-ground build slots cost more
- [ ] Economy feels tighter (can't build everything immediately)
- [ ] All 3 worlds have distinct color palettes
- [ ] Level 15 is genuinely challenging
- [ ] Game over and level complete flows still work

**Commit:** `chore: verify v2.0 isometric + elevation + rebalance`

---

## Parallelization Summary

| Phase | Tasks | Parallel? | Est. Agents |
|-------|-------|-----------|-------------|
| 0 | T0A, T0B | Yes (2 parallel) | 2 |
| 1 | T1A, T1B, T1C, T1D | T1A first, then T1B+T1C+T1D parallel | 3 parallel |
| 2 | T2A, T2B, T2C, T2D | All 4 parallel | 4 |
| 3 | T3A+T3B parallel, T3C+T3D parallel | 2+2 parallel | 2 batches |
| 4 | T4A, T4B, T4C | All 3 parallel | 3 |
| 5 | T5A, T5B, T5C | T5B+T5C parallel, T5A sequential after | 2 parallel + 1 |
| 6 | T6A, T6B, T6C | Sequential (verification) | 1 |

**Maximum parallel agents at any time: 4 (Phase 2)**
**Total unique tasks: 21**
