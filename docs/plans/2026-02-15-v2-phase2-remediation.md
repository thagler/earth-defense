# Earth Defense v2.0 -- Phase 2 Remediation Plan

**Date:** 2026-02-15
**Branch:** `feature/v2-isometric` (worktree: `.worktrees/v2-isometric`)
**Baseline:** Phase 1 remediation complete (7 commits), 87/87 tests passing, tsc clean, build clean.

---

## Context

Phase 1 remediation fixed 5 playtest issues (camera centering, build slot zones, HUD overlap, build slot visibility, grid lines). During smoke testing, two systemic bugs were discovered that affect multiple UI components. These must be fixed before the v2.0 branch can be merged.

### Phaser 3 Container + scrollFactor(0) Input Bug

**Root cause:** When a child game object inside a Phaser Container has `setInteractive()`, and the Container has `scrollFactor(0)`, Phaser's input system fails to detect clicks. The input system transforms screen coordinates to world coordinates using the camera's scroll offset, then hit-tests against the child's world position. But for a scrollFactor(0) container, the child's VISUAL position is at screen coordinates while the input system checks WORLD coordinates. The mismatch grows with camera scroll distance.

**Example:** Camera at scrollX=-384, scrollY=32. A button rendered at screen (512, 400) inside a scrollFactor(0) container. Screen click at (512, 400) transforms to world (128, 432). The button's world position is (512, 400). Hit test: (128, 432) vs (512, 400) -- MISS.

**Fix pattern (from Phase 1 R5):** For single-hit-area containers (like TowerPicker), move `setInteractive()` from the child to the Container itself with `container.setSize(w, h)`. For multi-button panels, flatten the hierarchy: place each interactive element directly on the scene with its own `scrollFactor(0)` instead of as a Container child.

### Zone hitAreaCallback Coordinate Space

**Root cause (documented for reference, already fixed):** Phaser Zone `hitAreaCallback` receives local coordinates where (0,0) is the top-left of the zone's bounding box, regardless of origin setting. Polygon vertices must be in top-left-relative space: a diamond filling a 128x64 zone uses vertices `(64,0),(128,32),(64,64),(0,32)`, centered at local (64,32).

---

## Issues to Fix

### Issue 6: TowerInfoPanel Buttons Broken (CRITICAL)

**Symptom:** Upgrade, Sell, and Close buttons on the tower info popup do not respond to clicks when the camera is scrolled (which it always is after the R1 camera centering fix).

**Affected code:** `src/ui/TowerInfoPanel.ts`
- Line 88-90: `this.container` created with `setScrollFactor(0)`
- Line 229: `closeBg.setInteractive()` -- child of container
- Line 346: `btnBg.setInteractive()` for upgrade/sell buttons -- children of container

**Fix approach:** The TowerInfoPanel has multiple interactive children at different positions, so the "move setInteractive to container" approach won't work directly. Instead:

1. Track all interactive elements (closeBg, upgrade btnBg, sell btnBg) as direct scene objects with their own `scrollFactor(0)`, NOT as children of the container.
2. Position them using the same screen coordinates the container would place them at.
3. Add them to a separate tracking array for cleanup in `hide()`.
4. Keep non-interactive children (text labels, background rect) in the container for grouping.

**Alternative approach:** Use Phaser's `setInteractive()` on the container with a custom compound hit area, and determine which sub-region was clicked based on local coordinates in the callback. This is more complex but keeps the grouping clean.

**Simplest approach:** Convert the panel to a fixed position (always center-screen or bottom-right corner) and use the Container.setInteractive() pattern with a single large hit area, then check sub-regions in the handler. This also improves UX since the panel won't obscure the tower it describes.

**Files:** `src/ui/TowerInfoPanel.ts`

---

### Issue 7: HUD Overlay Buttons Broken (CRITICAL)

**Symptom:** CONTINUE, RETRY, and NEXT LEVEL buttons on the wave-complete and level-complete overlay screens do not respond to clicks.

**Affected code:** `src/ui/HUD.ts`
- Line 264: overlay container created with `setScrollFactor(0)`
- Line 336: `btnBg.setInteractive()` -- child of container
- All overlay buttons created via `createOverlayButton()` helper

**Fix approach:** The overlay container is always at position (0,0). Its children are at fixed screen coordinates (e.g., `(512, y)`). The fix:

1. In `createOverlayButton()`, set interactive on each button's Rectangle directly with `scrollFactor(0)`, instead of as a container child.
2. OR refactor: since the overlay container is at (0,0) and children use absolute coords, remove the container wrapper and place each element directly on the scene with `scrollFactor(0)`.
3. Store all overlay elements in an array for batch cleanup when the overlay is dismissed.

**Files:** `src/ui/HUD.ts`

---

### Issue 8: HUD Mute Button Audit (LOW)

**Symptom:** The mute/SFX button may have the same issue if it's inside a container.

**Current code:** `src/ui/HUD.ts` line 121-123: `muteButton` is a direct scene Text object with its own `scrollFactor(0)` and `setInteractive()`. This is NOT inside a Container, so it should work correctly.

**Action:** Audit only -- confirm the muteButton works, no fix needed.

**Files:** `src/ui/HUD.ts`

---

### Issue 9: Regression Test for Zone Hit Polygon (LOW)

**Symptom:** The Zone hit polygon was changed twice during Phase 1 (R2 used wrong coords, R2-fix corrected them). A regression test would prevent future breakage.

**Fix:** Add a unit test in `src/systems/__tests__/TilemapRenderer.test.ts` that verifies:
1. Build slot zones are created at the correct world positions
2. The diamond polygon vertices are in top-left-relative local space: `(HALF_W, 0), (ISO_TILE_WIDTH, HALF_H), (HALF_W, ISO_TILE_HEIGHT), (0, HALF_H)`
3. `Phaser.Geom.Polygon.Contains` returns `true` for the center point `(HALF_W, HALF_H)` and `false` for a corner `(0, 0)`

**Files:** `src/systems/__tests__/TilemapRenderer.test.ts` (new file)

---

## Remediation Task Breakdown

| Task | Issue | Description | Model | Files | Skill |
|------|-------|-------------|-------|-------|-------|
| R6 | 6 | Fix TowerInfoPanel interactive buttons | sonnet | TowerInfoPanel.ts | phaser-vite |
| R7 | 7 | Fix HUD overlay interactive buttons | sonnet | HUD.ts | phaser-vite |
| R8 | 8 | Audit HUD mute button (verify working) | haiku | HUD.ts | phaser-vite |
| R9 | 9 | Add TilemapRenderer zone polygon test | haiku | TilemapRenderer.test.ts | phaser-vite |
| R10 | -- | Smoke test: verify all UI interactions | -- | (orchestrator) | webapp-testing |

**Dependencies:**
- R6 and R7 are independent -- can run in parallel
- R8 is independent -- can run in parallel with R6/R7
- R9 is independent -- can run in parallel with R6/R7
- R10 depends on R6 + R7 completing

**Execution plan:**
1. Phase A: Dispatch R6, R7, R8, R9 in parallel (4 agents)
2. Verify: `npx tsc --noEmit && npm run test` (must pass)
3. Phase B: R10 smoke test using Playwright (orchestrator)
4. Commit results

---

## Phaser Patterns Reference

All subagents should use the **phaser-vite** skill and consult these patterns:

### Container Input (from skill reference)
```typescript
// WRONG: child interactive inside scrollFactor(0) container
const container = this.add.container(x, y);
container.setScrollFactor(0);
const bg = this.add.rectangle(0, 0, w, h, color);
bg.setInteractive(); // BROKEN when camera scrolled
container.add(bg);

// RIGHT option A: interactive on container itself (single hit area)
container.setSize(w, h);
container.setInteractive({ useHandCursor: true });

// RIGHT option B: flatten hierarchy (multiple interactive elements)
const bg = this.add.rectangle(x, y, w, h, color);
bg.setScrollFactor(0);
bg.setDepth(1000);
bg.setInteractive({ useHandCursor: true });
```

### Zone Hit Area Coordinates
```typescript
// hitAreaCallback receives local coords where (0,0) = TOP-LEFT of bounding box
const zone = this.add.zone(worldX, worldY, 128, 64);
const diamond = new Phaser.Geom.Polygon([
  new Phaser.Geom.Point(64, 0),    // top: center-x of box, top edge
  new Phaser.Geom.Point(128, 32),  // right: right edge, center-y
  new Phaser.Geom.Point(64, 64),   // bottom: center-x, bottom edge
  new Phaser.Geom.Point(0, 32),    // left: left edge, center-y
]);
zone.setInteractive({ hitArea: diamond, hitAreaCallback: Phaser.Geom.Polygon.Contains });
```
