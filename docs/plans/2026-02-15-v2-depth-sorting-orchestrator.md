# Earth Defense v2.0 -- Depth Sorting Remediation Orchestrator

**Working directory:** `~/repos/tower-defence/.worktrees/v2-isometric`

---

## Role

You are an orchestrator. You dispatch subagents, verify results, and make go/no-go decisions. You do **zero implementation** yourself. All code changes are done by subagents.

## Required Skills

Before starting any work:
1. Invoke the **phaser-vite** skill -- all subagents must receive Phaser 3 + Vite patterns
2. Invoke the **executing-plans** skill -- follow its batch execution process
3. Invoke the **dispatching-parallel-agents** skill -- use parallel dispatch for independent tasks

## Constraints

- **MUST use subagents** for all implementation. Minimum 3 subagents dispatched.
- **MUST include the phaser-vite skill reference** in every subagent prompt.
- **MUST run in the worktree:** `~/repos/tower-defence/.worktrees/v2-isometric`
- **MUST NOT modify files on main branch.** All work happens in the worktree.
- **MUST verify** `npx tsc --noEmit && npm run test` passes after each phase.

---

## Pre-flight Checks

Before dispatching any agents:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
git log --oneline -3          # Verify latest commit
npx tsc --noEmit              # Must pass
npm run test                  # 92/92 must pass
```

Read the plan: `docs/plans/2026-02-15-v2-depth-sorting-remediation.md`

---

## Phase A: Implementation (1 agent)

### Agent D1 (sonnet): Implement calculateTileDepth + Update TilemapRenderer

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-v2-depth-sorting-remediation.md (Task D1 section)
- src/utils/elevation.ts (you will add a function here)
- src/systems/TilemapRenderer.ts (you will update depth calls here)
- src/config/maps.ts (for ISO_TILE_HEIGHT constant)

PROBLEM: Enemies clip behind ground tiles at grid boundaries because tiles and
entities use the same depth formula based on tile center screenY. When an enemy
enters the top half of a tile's diamond, its screenY-based depth is less than
the tile center's depth, so the tile renders on top of the enemy.

FIX:

1. In src/utils/elevation.ts, add a new function calculateTileDepth:

   import { DEPTH_BAND, ISO_TILE_HEIGHT } from '../config/maps';

   /** Calculate Phaser depth for TILE sprites using top-edge of diamond.
    *  Tiles use top-edge depth so that entities standing on them always sort
    *  in front (entities use calculateDepth based on actual screen Y). */
   export function calculateTileDepth(screenY: number, elevation: number): number {
     return elevation * DEPTH_BAND + (screenY - ISO_TILE_HEIGHT / 2);
   }

   DO NOT modify the existing calculateDepth function. It stays unchanged.
   The import at the top of elevation.ts needs to change from:
     import { DEPTH_BAND } from '../config/maps';
   to:
     import { DEPTH_BAND, ISO_TILE_HEIGHT } from '../config/maps';

2. In src/systems/TilemapRenderer.ts:
   - Change the import to include calculateTileDepth:
     import { calculateTileDepth } from '../utils/elevation';
     (remove calculateDepth from import if it is no longer used in this file)
   - Line 99: Change calculateDepth(screenY, elevation) to calculateTileDepth(screenY, elevation)
   - Line 303 (cliff faces): Change calculateDepth(tileScreenY, 0) to calculateTileDepth(tileScreenY, 0)

3. DO NOT modify any entity files (Enemy.ts, Tower.ts, Projectile.ts).
   They correctly use calculateDepth() for entity depth.

Verify: npx tsc --noEmit (must pass), npm run test (must pass).
Commit: "fix: use top-edge depth for tiles to prevent entity clipping at grid boundaries"
Report: files changed + the specific lines modified.
```

---

## Phase A Verification

After D1 completes:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # All 92 tests must pass
git log --oneline -3 # Verify D1 commit present
```

If D1 failed, diagnose and dispatch a follow-up agent.

---

## Phase B: Test Agents (2 agents in parallel)

Launch both agents simultaneously in a single message with multiple Task tool calls.

### Agent D2 (haiku): Update Elevation Unit Tests

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-v2-depth-sorting-remediation.md (Task D2 section)
- src/utils/elevation.ts (to see the calculateTileDepth function)
- src/utils/__tests__/elevation.test.ts (the file you will modify)
- src/config/maps.ts (for ISO_TILE_HEIGHT and DEPTH_BAND constants)

TASK: Add unit tests for the new calculateTileDepth function.

In src/utils/__tests__/elevation.test.ts, add a new describe block:

describe('calculateTileDepth', () => {
  it('returns depth less than calculateDepth at same screenY and elevation', () => {
    // For any screenY and elevation, tile depth < entity depth
    // because tiles use top-edge (screenY - HALF_H) while entities use screenY
    expect(calculateTileDepth(400, 0)).toBeLessThan(calculateDepth(400, 0));
    expect(calculateTileDepth(200, 1)).toBeLessThan(calculateDepth(200, 1));
  });

  it('tile-entity depth gap equals ISO_TILE_HEIGHT / 2', () => {
    const screenY = 400;
    const elevation = 0;
    const gap = calculateDepth(screenY, elevation) - calculateTileDepth(screenY, elevation);
    expect(gap).toBe(ISO_TILE_HEIGHT / 2); // 32
  });

  it('elevation bucketing still separates tile depth bands', () => {
    // Highest possible tile depth at elevation 0 should be less than
    // lowest tile depth at elevation 1
    // Max screenY for a 16x12 grid: (15+11)*32 = 832
    expect(calculateTileDepth(832, 0)).toBeLessThan(calculateTileDepth(0, 1));
  });

  it('tiles at higher row+col have higher depth', () => {
    // Tile at (6,5) should have higher depth than tile at (5,5)
    const screenY_5_5 = (5 + 5) * 32; // 320
    const screenY_6_5 = (6 + 5) * 32; // 352
    expect(calculateTileDepth(screenY_5_5, 0)).toBeLessThan(calculateTileDepth(screenY_6_5, 0));
  });
});

Import calculateTileDepth and ISO_TILE_HEIGHT at the top of the test file.

Verify: npm run test (all tests must pass).
Commit: "test: add calculateTileDepth unit tests"
Report: test count + file path.
```

### Agent D3 (haiku): Depth Ordering Regression Test

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-v2-depth-sorting-remediation.md (Task D3 section)
- src/utils/elevation.ts (for calculateDepth and calculateTileDepth)
- src/utils/coordinates.ts (for cartToIso)
- src/systems/__tests__/TilemapRenderer.test.ts (existing test file to extend)

TASK: Add depth ordering regression tests to the EXISTING test file
src/systems/__tests__/TilemapRenderer.test.ts.

Add a new describe block at the end of the file (do NOT remove existing tests):

describe('depth sorting at tile boundaries', () => {
  it('enemy between two tiles has depth above both tiles', () => {
    // Enemy at screenY midway between tile (5,5) center and tile (6,5) center
    const tile55_centerY = (5 + 5) * 32; // 320
    const tile65_centerY = (6 + 5) * 32; // 352
    const enemyScreenY = (tile55_centerY + tile65_centerY) / 2; // 336

    const tile55_depth = calculateTileDepth(tile55_centerY, 0);
    const tile65_depth = calculateTileDepth(tile65_centerY, 0);
    const enemy_depth = calculateDepth(enemyScreenY, 0);

    expect(enemy_depth).toBeGreaterThan(tile55_depth);
    expect(enemy_depth).toBeGreaterThan(tile65_depth);
  });

  it('enemy at tile diamond top edge still sorts above tile', () => {
    // Enemy just barely inside tile (6,5) diamond top vertex
    const tile65_centerY = (6 + 5) * 32; // 352
    const HALF_H = 32;
    const enemyAtTopEdge = tile65_centerY - HALF_H + 1; // 321

    const tile65_depth = calculateTileDepth(tile65_centerY, 0);
    const enemy_depth = calculateDepth(enemyAtTopEdge, 0);

    expect(enemy_depth).toBeGreaterThan(tile65_depth);
  });

  it('tiles at same elevation maintain correct relative ordering', () => {
    const tile55_depth = calculateTileDepth((5 + 5) * 32, 0);
    const tile65_depth = calculateTileDepth((6 + 5) * 32, 0);
    const tile75_depth = calculateTileDepth((7 + 5) * 32, 0);

    expect(tile55_depth).toBeLessThan(tile65_depth);
    expect(tile65_depth).toBeLessThan(tile75_depth);
  });

  it('enemy at elevation 0 sorts behind elevation 1 tile', () => {
    const enemyDepth = calculateDepth(400, 0);
    const elevatedTileDepth = calculateTileDepth(200, 1);
    expect(enemyDepth).toBeLessThan(elevatedTileDepth);
  });
});

Import calculateDepth and calculateTileDepth from '../../utils/elevation' at the
top of the file if not already imported.

Verify: npm run test (all tests must pass).
Commit: "test: add depth ordering regression tests for tile boundaries"
Report: test count + file path.
```

---

## Phase B Verification

After both agents complete:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # All tests must pass (92 + new D2 + D3 tests)
git log --oneline -5 # Verify all commits present
```

If any agent failed, diagnose and dispatch a follow-up agent.

---

## Phase C: Visual Smoke Test

Start the dev server and verify the depth sorting fix visually:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npm run dev
```

Use the **webapp-testing** skill with Playwright to test:

### Checklist

1. **Start game:** Navigate to game, click START GAME
2. **Wait for enemies:** Let enemies spawn and begin moving along the path
3. **Take screenshot at grid boundary:** Capture a screenshot when enemies are crossing
   between two tiles -- they should render ON TOP of both tiles, not clipping behind
4. **Verify at multiple path segments:** Check at least 2 different path turns where
   enemies cross tile boundaries
5. **Verify build slot tiles:** Build slots should still render correctly (below entities)

### Playwright Tips for Visual Verification

Since this is a visual check, focus on screenshots rather than programmatic assertions:

```javascript
// Wait for enemies to spawn (a few seconds into gameplay)
await page.waitForTimeout(5000);

// Take a full-page screenshot for visual inspection
await page.screenshot({ path: '/tmp/depth-test-1.png' });

// Wait more for enemies to reach different positions
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/depth-test-2.png' });
```

**IMPORTANT:** Temporarily add `(window as any).__GAME__ = new Phaser.Game(config);`
in main.ts for game state access. Revert before final commit.

---

## Phase C Verification

After smoke test:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
# Revert any debug code in main.ts
npx tsc --noEmit     # Must pass
npm run test         # Must pass
npm run build        # Must succeed
git log --oneline -5 # Review full commit history
```

---

## Completion

Report final status:
- Commits added (count + messages)
- Tests passing (count)
- Build status
- Visual smoke test result (screenshots if applicable)
- Any remaining known issues

Then ask the user: "Ready to merge, create PR, or continue testing?"
