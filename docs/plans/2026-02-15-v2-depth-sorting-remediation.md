# Earth Defense v2.0 -- Depth Sorting Remediation Plan

**Date:** 2026-02-15
**Branch:** `feature/v2-isometric` (worktree: `.worktrees/v2-isometric`)
**Baseline:** Phase 2 remediation complete, 92/92 tests passing, tsc clean, build clean.

---

## Context

During playtesting, enemies visually disappear "underneath" ground tiles at grid line boundaries. The enemy sprite clips behind the next tile until it has fully crossed the tile center, at which point it pops back on top. This is a depth sorting issue in the isometric rendering pipeline.

### Root Cause Analysis

Both tiles and entities use the same depth formula:

```typescript
depth = elevation * DEPTH_BAND + screenY
```

Where `screenY = (col + row) * HALF_H` for tile centers.

The problem:
- **Tile depth is discrete** -- set once based on the tile's center screenY
- **Enemy depth is continuous** -- updated every frame based on exact position
- A tile's diamond extends HALF_H (32px) above its center. When an enemy enters the top portion of a tile's diamond, the enemy's screenY (and thus depth) is still less than the tile center's depth. The tile renders on top of the enemy.

Example with enemy moving from tile (5,5) toward tile (6,5):

| Object | screenY | Depth | Draws in front? |
|--------|---------|-------|-----------------|
| Tile (5,5) center | 320 | 320 | Enemy above (340 > 320) |
| Enemy mid-transition | 340 | 340 | -- |
| Tile (6,5) center | 352 | 352 | Tile above (352 > 340) -- BUG |

### Fix: Top-Edge Tile Depth (Option 2)

Reference: [Tuts+ Isometric Worlds Primer](https://code.tutsplus.com/creating-isometric-worlds-primer-for-game-developers-updated--cms-28392t) -- the correct isometric rendering order processes tiles back-to-front, drawing entities immediately after their ground tile. A tile's depth should represent its top edge (the "start" of its rendering slot), not its center.

**Solution:** Introduce a `calculateTileDepth()` function that subtracts `HALF_H` from screenY before computing depth. Tiles use this function; entities (enemies, towers, projectiles) continue using the existing `calculateDepth()`.

```typescript
// NEW: For tiles -- uses top edge of diamond (screenY - HALF_H)
export function calculateTileDepth(screenY: number, elevation: number): number {
  return elevation * DEPTH_BAND + (screenY - ISO_TILE_HEIGHT / 2);
}

// UNCHANGED: For entities -- uses actual screen position
export function calculateDepth(screenY: number, elevation: number): number {
  return elevation * DEPTH_BAND + screenY;
}
```

After the fix:

| Object | screenY | Depth | Draws in front? |
|--------|---------|-------|-----------------|
| Tile (5,5) top-edge depth | 320 | **288** | Enemy above (340 > 288) |
| Enemy mid-transition | 340 | **340** | -- |
| Tile (6,5) top-edge depth | 352 | **320** | Enemy above (340 > 320) |
| Tile (7,5) top-edge depth | 384 | **352** | Tile above (352 > 340) |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/elevation.ts` | Add `calculateTileDepth()` function |
| `src/config/maps.ts` | Export `ISO_TILE_HEIGHT` (already exported) |
| `src/systems/TilemapRenderer.ts` | Replace `calculateDepth` with `calculateTileDepth` for tile sprites, zones, and cliff faces |
| `src/utils/__tests__/elevation.test.ts` | Add tests for `calculateTileDepth` |

## Files NOT Modified (entity depth unchanged)

| File | Why unchanged |
|------|---------------|
| `src/entities/Enemy.ts` | Uses `calculateDepth(this.y, ...)` -- correct, based on actual position |
| `src/entities/Tower.ts` | Uses `calculateDepth(this.y, ...)` -- correct, towers render above ground |
| `src/entities/Projectile.ts` | Uses `calculateDepth(this.y, ...) + 50` -- correct, projectiles above all |

---

## Task Breakdown

### Task D1: Implement `calculateTileDepth` and Update TilemapRenderer

**Model:** sonnet
**Skill:** phaser-vite

1. Add `calculateTileDepth` to `src/utils/elevation.ts`:
   ```typescript
   import { DEPTH_BAND, ISO_TILE_HEIGHT } from '../config/maps';

   /** Calculate Phaser depth for TILE sprites using top-edge of diamond.
    *  Tiles use top-edge depth so that entities standing on them always sort
    *  in front (entities use calculateDepth which is based on center/actual Y). */
   export function calculateTileDepth(screenY: number, elevation: number): number {
     return elevation * DEPTH_BAND + (screenY - ISO_TILE_HEIGHT / 2);
   }
   ```

2. Update `src/systems/TilemapRenderer.ts`:
   - Change import: add `calculateTileDepth` alongside `calculateDepth`
   - Line 99: Change `calculateDepth(screenY, elevation)` to `calculateTileDepth(screenY, elevation)`
   - Line 303 (cliff faces): Change `calculateDepth(tileScreenY, 0)` to `calculateTileDepth(tileScreenY, 0)`
   - Remove unused `calculateDepth` import if no longer needed in this file

3. Verify: `npx tsc --noEmit && npm run test`
4. Commit: `fix: use top-edge depth for tiles to prevent entity clipping at grid boundaries`

### Task D2: Update Elevation Unit Tests

**Model:** haiku
**Skill:** phaser-vite

1. Read `src/utils/__tests__/elevation.test.ts`
2. Add a `describe('calculateTileDepth')` block with tests:
   - `"tile depth is less than entity depth at same screenY and elevation"` -- verifies `calculateTileDepth(y, e) < calculateDepth(y, e)` for any y, e
   - `"tile depth difference equals HALF_H"` -- verifies the gap is exactly `ISO_TILE_HEIGHT / 2`
   - `"elevation bucketing still works for tiles"` -- `calculateTileDepth(maxScreenY, 0) < calculateTileDepth(0, 1)` for reasonable maxScreenY values
3. Verify: `npm run test`
4. Commit: `test: add calculateTileDepth unit tests`

### Task D3: Depth Ordering Regression Test

**Model:** haiku
**Skill:** phaser-vite

1. Create or extend `src/systems/__tests__/TilemapRenderer.test.ts`
2. Add a `describe('depth sorting at tile boundaries')` block:
   - `"enemy between tiles always has depth above both tiles"` -- simulate an enemy at screenY between two adjacent tile centers, verify enemy depth > both tile depths
   - `"enemy entering tile diamond top edge still sorts above tile"` -- enemy screenY = tileCenterY - HALF_H + 1 (just inside diamond), verify enemy depth > tile depth
   - `"tiles at same elevation maintain relative ordering"` -- tile (col+1, row) has higher top-edge depth than tile (col, row)
3. Verify: `npm run test`
4. Commit: `test: add depth ordering regression tests for tile boundaries`

---

## Execution Plan

**Phase A:** Dispatch Task D1 (implementation).
**Phase B:** After D1 commits, dispatch Tasks D2 and D3 in parallel (tests).
**Phase C:** Verification -- tsc + all tests + visual smoke test.

---

## Phaser Patterns Reference

All agents must use the **phaser-vite** skill. Key patterns:

### Depth Sorting in Isometric Phaser Games
```typescript
// Tiles use top-edge depth (back of rendering slot)
sprite.setDepth(calculateTileDepth(screenY, elevation));

// Entities use actual-position depth (renders in front of ground at same position)
enemy.setDepth(calculateDepth(this.y, this.currentElevation));

// Formula difference:
// calculateTileDepth = elevation * DEPTH_BAND + (screenY - HALF_H)
// calculateDepth     = elevation * DEPTH_BAND + screenY
```

### Why Top-Edge Depth Works
In the isometric nested-loop rendering model (row by row, col by col), entities at tile (col, row) draw immediately after their ground tile. The ground tile's depth represents the "start" of that tile's slot (its top vertex at screenY - HALF_H). Any entity standing on the tile has screenY >= tileTopEdge, so entity depth > tile depth.
