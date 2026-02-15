# Earth Defense v2.0 -- Remediation Orchestrator Prompt

**Working directory:** `~/repos/tower-defence/.worktrees/v2-isometric`

---

## Your Role

You are the **orchestrator**. You do **zero** implementation work. You dispatch subagents, monitor their status, and advance through phases.

**Rules:**
1. Never edit source files directly. All code changes are made by subagents.
2. Launch subagents in parallel whenever their tasks have no unmet dependencies.
3. Subagents communicate through the files they produce (file-based coordination).
4. Read subagent output files to verify completion. Do not ask subagents for verbose reports.
5. After each phase, run `npx tsc --noEmit && npm run test` from the worktree directory to verify.
6. Commit after each task (subagent should commit, or you commit on their behalf).
7. **Use the specified model tier for each agent** to optimize cost and capability.

## Project Context

- **Repo:** Phaser 3.90 + TypeScript + Vite tower defense game
- **Worktree:** `.worktrees/v2-isometric` on branch `feature/v2-isometric`
- **Remediation plan:** `docs/plans/2026-02-15-v2-playtest-remediation.md`
- **Commands:** `npm run dev` (dev server), `npm run build` (build), `npm run test` (vitest), `npx tsc --noEmit` (type check)
- **Baseline:** 87/87 tests passing, tsc clean, build clean. 22 commits on branch.
- **Dev server note:** Run from the worktree directory: `cd .worktrees/v2-isometric && npm run dev`

## Key Technical Context

All subagents MUST understand these facts:

**Isometric coordinate system:**
- `cartToIso(col, row, elevation)` returns `screenX = (col - row) * 64`, `screenY = (col + row) * 32 - elevation * 16`
- For a 16x12 grid, screenX ranges from -704 (bottom-left) to +960 (top-right). The map diamond's center is NOT at the bounding box center.
- Constants: `ISO_TILE_WIDTH = 128`, `ISO_TILE_HEIGHT = 64`, `ELEVATION_PX = 16`, `MAX_ELEVATION = 3`

**Phaser Zone hit detection:**
- `Zone.setInteractive({ hitArea, hitAreaCallback })` receives pointer coordinates in the zone's local space
- Zone origin defaults to (0.5, 0.5) -- local (0,0) is the top-left of the zone's bounding box
- `Phaser.Geom.Polygon.Contains(polygon, x, y)` is the correct callback signature for hitAreaCallback

**HUD layout (1024x768 canvas):**
- Top bar: 36px tall, depth 1000, scrollFactor 0
- Bottom bar (TowerPicker): 68px tall at y=734, depth 1000, scrollFactor 0

## Model Tier Strategy

| Tier | Model | Use For |
|------|-------|---------|
| **Medium** | `sonnet` | Logic fixes, coordinate math, hit detection |
| **Light** | `haiku` | Layout tweaks, simple visual changes |

---

## Phase Execution

### Phase 1: Camera Centering Fix (BLOCKING -- fixes Issue 1 and likely Issue 2)

**Agent R1** (subagent_type: general-purpose, model: **sonnet**):
```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric

Read docs/plans/2026-02-15-v2-playtest-remediation.md for full context on Issue 1.
Read src/systems/CameraController.ts (the file you will modify).
Read src/utils/coordinates.ts (cartToIso function you'll use).
Read src/config/maps.ts (first 50 lines for constants: ISO_TILE_WIDTH=128, ISO_TILE_HEIGHT=64, ELEVATION_PX=16, MAX_ELEVATION=3).

PROBLEM: The camera centers on (mapPixelWidth/2, mapPixelHeight/2) but the isometric diamond map is NOT centered at that point. cartToIso(col, row) = screenX: (col - row) * 64, screenY: (col + row) * 32. For a 16x12 grid:
- Tile (0,0): (0, 0)
- Tile (15,0): (960, 480)
- Tile (0,11): (-704, 352)
- Tile (15,11): (256, 832)
The actual center is around cartToIso(8, 6) = (128, 448), but the camera centers on (896, 480).

FIX the CameraController constructor:
1. Import cartToIso from '../utils/coordinates'.
2. Calculate the actual map center by averaging the four corner tile positions:
   - topCorner = cartToIso(0, 0, 0)
   - rightCorner = cartToIso(cols-1, 0, 0)
   - bottomCorner = cartToIso(cols-1, rows-1, 0)
   - leftCorner = cartToIso(0, rows-1, 0)
   - centerX = (min(screenX) + max(screenX)) / 2
   - centerY = (min(screenY) + max(screenY)) / 2
3. Calculate camera bounds from the actual tile bounding box (min/max of all four corners) with margin and elevation offset.
4. Center the camera on (centerX, centerY).
5. Do NOT change the keyboard/mouse input handling -- only the constructor's bounds and centering logic.

Verify: npx tsc --noEmit (must pass).
Commit with message: "fix: camera centering for isometric diamond map"
Report: file path only.
```

**After R1 completes:** Run `npx tsc --noEmit && npm run test`. Then start the dev server and use the browser to navigate to the game. Check: (a) map is centered, (b) try clicking build slots to see if tower placement now works.

---

### Phase 2: Parallel Fixes (3 agents simultaneously)

Launch R2, R3, and R4 in parallel. R2 is only needed if tower placement is STILL broken after R1. If tower placement works after R1, skip R2.

**Agent R2** (subagent_type: general-purpose, model: **sonnet**) -- CONDITIONAL, only if tower placement still broken:
```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric

Read docs/plans/2026-02-15-v2-playtest-remediation.md for full context on Issue 2.
Read src/systems/TilemapRenderer.ts (build slot zone creation, lines 107-145).
Read src/scenes/GameScene.ts (build slot click handler, lines 176-227 in setupBuildSlots).
Read src/ui/TowerPicker.ts (getSelectedTower method).

PROBLEM: Tower placement doesn't work when clicking build slots. The camera centering fix (R1) may have resolved this, but if not, debug the hit detection chain.

DIAGNOSTIC STEPS (add temporary console.log statements, remove before committing):
1. In TilemapRenderer.ts, after zone.setInteractive(), add: zone.on('pointerdown', () => console.log('Zone clicked:', col, row));
2. In GameScene.ts setupBuildSlots, at the start of the pointerdown handler, add: console.log('Build slot handler:', slot.tileX, slot.tileY, 'selected:', this.towerPicker.getSelectedTower());
3. Run the game and click build slots. Check browser console.

POSSIBLE FIXES depending on diagnosis:
A. If zones don't fire pointerdown at all:
   - The Zone's origin may need explicit setting. Add: zone.setOrigin(0.5, 0.5) before setInteractive.
   - OR the diamond polygon vertices may need adjustment. Since Zone default origin is (0.5, 0.5), local (0,0) is top-left. Vertices (64,0),(128,32),(64,64),(0,32) describe a diamond filling the zone -- this should be correct.

B. If zones fire but no tower appears:
   - Check that getSelectedTower() returns a non-null value
   - Check that canBuyTower returns true
   - Check that placeTower succeeds

C. If the issue is Z-ordering:
   - Ensure build slot zones have higher depth than tile sprites (currently depth + 0.1)
   - Ensure no other interactive element (like the camera drag handler) is consuming the pointer event

Remove ALL console.log debug statements before committing.
Verify: npx tsc --noEmit (must pass).
Commit with message: "fix: build slot click detection for isometric zones"
Report: file path + what the root cause was.
```

**Agent R3** (subagent_type: general-purpose, model: **haiku**):
```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric

Read docs/plans/2026-02-15-v2-playtest-remediation.md for full context on Issue 3.
Read src/ui/HUD.ts (the file you will modify).

PROBLEM: The HUD top bar text overlaps. Current layout (all at y=8, 16px monospace):
- enemiesText at x=16 (left-aligned, origin default 0,0)
- levelNameText at x=400 (left-aligned) -- "Desert Outpost - Level 1: Forward Base" is ~304px, extends to x=704
- livesText at x=700 (left-aligned) -- overlaps!
- creditsText at x=840 (left-aligned)
- muteButton at x=1006 (right-aligned, origin 1,0)

FIX the layout by adjusting positions and origins:
1. Keep enemiesText at x=16, left-aligned (origin 0, 0)
2. Center levelNameText at x=400 with origin (0.5, 0). This means a 304px string spans 248-552 instead of 400-704.
   - Actually, better: Set levelNameText to x=350, origin (0.5, 0). This centers it in the left-center area.
3. Move livesText to x=730 (left-aligned) -- gives more breathing room.
4. Keep creditsText at x=860.
5. Reduce the levelNameText font to 13px to save space.
6. Also update the updateLevelName method: if worldName is present, use format "W1-L1: Forward Base" instead of "Desert Outpost - Level 1: Forward Base" to save space. Use abbreviated world format: "Desert-1", "Urban-6", "Alien-11". The full format: `${worldName.split(' ')[0]}-${level}: ${name}`.

Make the minimum changes needed. Do not refactor other parts of HUD.

Verify: npx tsc --noEmit (must pass).
Commit with message: "fix: HUD top bar text layout to prevent overlap"
Report: file path only.
```

**Agent R4** (subagent_type: general-purpose, model: **sonnet**):
```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric

Read docs/plans/2026-02-15-v2-playtest-remediation.md for full context on Issues 4 and 5.
Read src/systems/AssetGenerator.ts, specifically the generateIsoDiamondTiles method (starts around line 1016).

PROBLEM 1 (Issue 4): Build slot iso tiles are nearly invisible against ground tiles. Desert palette:
- ground: 0x2a1f0a
- build: 0x2e3a1e
These colors are too similar when rendered as solid diamond fills.

PROBLEM 2 (Issue 5): All iso diamond tiles have a border drawn at 0.5 alpha (line ~1069), creating a visible grid pattern across the entire map.

FIX for build slot visibility:
1. In generateIsoDiamondTiles, for the 'build' tile type ONLY, add a dashed or bracketed diamond border:
   - After drawing the base diamond fill, add a brighter accent-colored stroke (using the palette's `accent` color) at 0.4 alpha
   - Add small corner markers at the 4 diamond vertices (small triangles or lines, 8px long, using the accent color at 0.5 alpha)
   - This makes build slots visually distinct like the old square tiles' corner brackets

2. Increase build slot color contrast in all three world palettes:
   - Desert build: change from 0x2e3a1e to 0x3a4a2a (brighter green)
   - Urban build: change from 0x2a2a3e to 0x2e3a4e (brighter blue-green)
   - Alien build: change from 0x2a1e3a to 0x3a2a4e (brighter purple)

FIX for grid overlay reduction:
3. Reduce the iso tile border alpha from 0.5 to 0.15 for ground tiles only. Keep other tile types (path, build, spawn, base) at 0.5 or higher for definition.
   - In the tile rendering loop inside generateIsoDiamondTiles, check if tileName === 'ground' and use a lower alpha (0.15) for the border stroke.

Do NOT modify the old 64x64 square tile generation (generateTileTextures) -- leave it as-is for backwards compatibility.

Verify: npx tsc --noEmit (must pass).
Commit with message: "fix: improve build slot visibility and reduce ground tile grid lines"
Report: file path only.
```

**After all Phase 2 agents complete:** Run `npx tsc --noEmit && npm run test`.

---

### Phase 3: Smoke Test

Run the game manually with the browser:
1. Start dev server: `npm run dev` from the worktree
2. Navigate to the game page
3. Verify the following checklist:

**Checklist:**
- [ ] Map is centered in viewport on Level 1 load
- [ ] Build slot tiles are visually distinguishable from ground
- [ ] Grid overlay is not prominent (ground tile borders are faint)
- [ ] Clicking a tower in the bottom picker highlights it
- [ ] Clicking a build slot with a tower selected places the tower
- [ ] HUD top bar text does not overlap (level name, lives, credits all readable)
- [ ] Camera panning works (WASD, arrow keys, scroll wheel)
- [ ] Enemies spawn and follow the path
- [ ] Towers fire at enemies

**If any checklist item fails:** Dispatch a targeted fix agent for that specific issue. Use sonnet model. Include the failure description, the relevant file(s), and what the expected behavior is.

**If all items pass:** Proceed to completion.

---

### Phase 4: Completion

After smoke test passes:

1. Run full verification:
   ```
   npx tsc --noEmit && npm run test && npm run build
   ```

2. Report results to the user:
   - List all issues fixed
   - List any remaining issues discovered during smoke test
   - Summarize commit history for the remediation

3. Ask the user if they want to:
   a. Continue playtesting for more issues
   b. Use the finishing-a-development-branch skill to merge/PR
   c. Add more features or polish

---

## Model Assignment Summary

| Task | Model | Rationale |
|------|-------|-----------|
| R1 (Camera fix) | sonnet | Coordinate math, bounds calculation |
| R2 (Hit detection) | sonnet | Interactive debugging, Phaser API knowledge |
| R3 (HUD layout) | haiku | Simple position/text changes |
| R4 (Visual fixes) | sonnet | Graphics API, multiple palette changes |

**Cost profile:** 0 opus, 3 sonnet, 1 haiku (R2 conditional -- may be 2 sonnet if skipped)

---

## Error Recovery

If a subagent fails:
1. Read its output to understand the failure
2. Check if the failure is in the agent's own files or a dependency
3. If dependency issue: fix the upstream file first, then re-run the failed agent
4. If agent's own issue: dispatch a new agent with the error context and the original task description
5. Never attempt to fix the issue yourself -- always dispatch a subagent
6. For fix agents, use the same model tier as the original task
