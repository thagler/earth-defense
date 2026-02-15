# Earth Defense v2.0 -- Phase 2 Remediation Orchestrator

**Working directory:** `~/repos/tower-defence`

---

## Role

You are an orchestrator. You dispatch subagents, verify results, and make go/no-go decisions. You do **zero implementation** yourself. All code changes are done by subagents.

## Required Skills

Before starting any work:
1. Invoke the **phaser-vite** skill -- all subagents must receive Phaser 3 + Vite patterns
2. Invoke the **executing-plans** skill -- follow its batch execution process
3. Invoke the **dispatching-parallel-agents** skill -- use parallel dispatch for independent tasks
4. Invoke the **webapp-testing** skill -- for the final smoke test phase

## Constraints

- **MUST use subagents** for all implementation. Minimum 3 subagents dispatched.
- **MUST include the phaser-vite skill reference** in every subagent prompt (paste the Container Input and Zone Hit Area patterns from the plan).
- **MUST run in the worktree:** `~/repos/tower-defence/.worktrees/v2-isometric`
- **MUST NOT modify files on main branch.** All work happens in the worktree.
- **MUST verify** `npx tsc --noEmit && npm run test` passes after each phase.

---

## Pre-flight Checks

Before dispatching any agents:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
git log --oneline -3          # Verify latest commit is the Phase 1 remediation
npx tsc --noEmit              # Must pass
npm run test                  # 87/87 must pass
```

Read the plan: `docs/plans/2026-02-15-v2-phase2-remediation.md`

---

## Phase A: Parallel Fix Dispatch (4 agents)

Launch all 4 agents simultaneously in a single message with multiple Task tool calls.

### Agent R6 (sonnet): Fix TowerInfoPanel Buttons

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-v2-phase2-remediation.md (Issue 6 section)
- src/ui/TowerInfoPanel.ts (the file you will modify)

PROBLEM: TowerInfoPanel has interactive children (closeBg at line 229, btnBg at
line 346) inside a Container with scrollFactor(0) at line 89. When the camera is
scrolled, Phaser's input system transforms screen clicks to world coordinates,
but scrollFactor(0) containers render at screen coordinates. The hit test fails
because screen coords != world coords when camera is scrolled.

PHASER PATTERN - Container + scrollFactor(0) input bug:
  WRONG: child.setInteractive() inside scrollFactor(0) container
  RIGHT option A: container.setSize(w,h); container.setInteractive()
  RIGHT option B: place each interactive element directly on scene with its own
    scrollFactor(0) and setDepth(), not as container children

FIX: Since TowerInfoPanel has MULTIPLE interactive children at different positions
(close button, upgrade button, sell button), option B is the cleanest approach:
1. Extract all interactive elements (closeBg, upgrade btnBg, sell btnBg) from the
   container. Place them directly on the scene with scrollFactor(0) and the same
   depth as the container.
2. Position them at the same SCREEN coordinates the container would place them at
   (container.x + childLocalX, container.y + childLocalY).
3. Store them in a tracking array (e.g., this.interactiveElements) for cleanup in
   hide() and destroy().
4. Keep non-interactive elements (text labels, bg panel) in the container.
5. When show() repositions the container, also reposition the interactive elements.

Verify: npx tsc --noEmit (must pass), npm run test (must pass).
Commit: "fix: extract TowerInfoPanel interactive elements from scrollFactor container"
Report: files changed + approach taken.
```

### Agent R7 (sonnet): Fix HUD Overlay Buttons

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-v2-phase2-remediation.md (Issue 7 section)
- src/ui/HUD.ts (the file you will modify, focus on createOverlayBase and
  createOverlayButton methods)

PROBLEM: HUD overlay screens (wave-complete, level-complete) create buttons via
createOverlayButton() at line 326. These btnBg rectangles have setInteractive()
but are children of a container with scrollFactor(0) at line 264. Same bug as
TowerInfoPanel: clicks fail when camera is scrolled.

PHASER PATTERN - Container + scrollFactor(0) input bug:
  WRONG: child.setInteractive() inside scrollFactor(0) container
  RIGHT option B: place each interactive element directly on scene with its own
    scrollFactor(0) and setDepth(), not as container children

FIX: In createOverlayButton():
1. Create btnBg as a scene-level rectangle (NOT added to the container)
2. Set btnBg.setScrollFactor(0) and btnBg.setDepth(container.depth + 0.1)
3. Attach pointer handlers directly on btnBg
4. Store btnBg in a separate array (e.g., this.overlayInteractiveElements) for
   cleanup when the overlay is dismissed
5. In clearOverlay(), destroy all elements in the interactive array too
6. Keep non-interactive elements (text labels, dim bg, panel bg) in the container

The overlay text labels (btnText) do NOT need setInteractive, so they can stay in
the container for grouping.

Verify: npx tsc --noEmit (must pass), npm run test (must pass).
Commit: "fix: extract HUD overlay buttons from scrollFactor container"
Report: files changed + approach taken.
```

### Agent R8 (haiku): Audit HUD Mute Button

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read src/ui/HUD.ts, lines 115-130.

TASK: Verify that the mute/SFX button does NOT suffer from the Container +
scrollFactor(0) input bug.

Check:
1. Is muteButton a direct scene object or a child of a Container?
2. Does muteButton have its own scrollFactor(0)?
3. Does muteButton have setInteractive() on itself (not on a parent)?

If the mute button is correctly set up (direct scene object with own scrollFactor
and own setInteractive), report "PASS: muteButton is correctly configured" with
evidence.

If the mute button has the bug, fix it using the same pattern as R6/R7.

Do NOT make changes unless a bug is found.
Report: PASS or FAIL with evidence.
```

### Agent R9 (haiku): Zone Polygon Regression Test

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- src/systems/TilemapRenderer.ts (lines 118-136, zone creation code)
- src/config/maps.ts (first 20 lines, for constants)
- src/systems/__tests__/CameraController.test.ts (for test file patterns)
- vitest.setup.ts (for test environment setup)

TASK: Create a NEW test file src/systems/__tests__/TilemapRenderer.test.ts that
verifies the build slot zone polygon is correctly defined.

Tests to write:
1. "diamond polygon vertices are in top-left-relative local space"
   - Import ISO_TILE_WIDTH (128), ISO_TILE_HEIGHT (64) from config/maps
   - Create a Phaser.Geom.Polygon with the expected vertices:
     (64, 0), (128, 32), (64, 64), (0, 32)
   - Verify Phaser.Geom.Polygon.Contains(polygon, 64, 32) === true (center)
   - Verify Phaser.Geom.Polygon.Contains(polygon, 0, 0) === false (corner)
   - Verify Phaser.Geom.Polygon.Contains(polygon, 128, 0) === false (corner)

2. "diamond polygon rejects center-relative coordinates"
   - Create a polygon with WRONG center-relative vertices:
     (0, -32), (64, 0), (0, 32), (-64, 0)
   - Verify Phaser.Geom.Polygon.Contains(polygon, 64, 32) === false
   - This proves the center-relative approach is wrong

Note: You may need to import Phaser in the test. Check how other test files
handle this. The vitest.setup.ts stubs Canvas but Phaser.Geom should work
without canvas.

Verify: npm run test (all tests must pass, including the new ones).
Commit: "test: add TilemapRenderer zone polygon regression tests"
Report: file path + test count.
```

---

## Phase A Verification

After all 4 agents complete:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # All tests must pass (87 + new R9 tests)
git log --oneline -6 # Verify all commits present
```

If any agent failed, diagnose and dispatch a follow-up agent.

---

## Phase B: Smoke Test

Start the dev server and verify ALL interactive UI elements work:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npm run dev
```

Use the **webapp-testing** skill with Playwright to test:

### Checklist

1. **Menu screen:** Click START GAME -- navigates to GameScene
2. **Tower picker:** Click Laser button -- verify it selects (check via JS: `towerPicker.getSelectedTower()`)
3. **Build slot:** Click a build slot -- tower appears, credits decrease
4. **Tower info panel:** Click placed tower -- panel appears with upgrade/sell buttons
5. **Tower info close:** Click X button -- panel closes
6. **Tower info upgrade:** Accumulate credits, click upgrade button -- tower upgrades
7. **Tower info sell:** Click sell button -- tower removed, credits refunded
8. **Mute button:** Click [SFX] button -- verify toggle works
9. **Wave complete overlay (if reachable):** Verify CONTINUE button works

### Playwright Tips for Phaser

Phaser canvas doesn't expose DOM elements. Use these patterns:

```javascript
// Navigate to game scene via JS (faster than clicking through menus)
await page.evaluate(() => { window.__GAME__ = game; }); // if game exposed
// OR use mouse.move + mouse.down + mouse.up pattern:
await page.mouse.move(x, y);
await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
await page.mouse.down();
await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
await page.mouse.up();
```

**IMPORTANT:** To access game state for verification, temporarily add
`(window as any).__GAME__ = new Phaser.Game(config);` in main.ts. Revert before
final commit.

---

## Phase B Verification

After smoke test passes:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
# Revert any debug code in main.ts
npx tsc --noEmit     # Must pass
npm run test         # Must pass
npm run build        # Must succeed
git log --oneline    # Review full commit history
```

---

## Completion

Report final status:
- Commits added (count + messages)
- Tests passing (count)
- Build status
- Smoke test checklist results
- Any remaining known issues

Then ask the user: "Ready to merge, create PR, or continue testing?"
