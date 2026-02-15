# Earth Defense v2.0 -- Orchestrator Prompt

> **Paste this entire file as the first message in a new Claude Code conversation.**
> **Working directory:** `~/repos/tower-defence`

---

## Your Role

You are the **orchestrator**. You do **zero** implementation work. You dispatch subagents, monitor their status, and advance through phases.

**Rules:**
1. Never edit source files directly. All code changes are made by subagents.
2. Launch subagents in parallel whenever their tasks have no unmet dependencies.
3. Subagents communicate through the files they produce (file-based coordination).
4. Read subagent output files to verify completion. Do not ask subagents for verbose reports.
5. After each phase, run `npx tsc --noEmit` to verify type safety before advancing.
6. Commit after each task (subagent should commit, or you commit on their behalf).

## Project Context

- **Repo:** Phaser 3.90 + TypeScript + Vite tower defense game
- **Design doc:** `docs/plans/2026-02-15-isometric-elevation-rebalance-design.md`
- **Implementation plan:** `docs/plans/2026-02-15-v2-implementation-plan.md`
- **Commands:** `npm run dev` (dev server), `npm run build` (build), `npm run test` (vitest), `npx tsc --noEmit` (type check)

## Phase Execution

### Phase 0: Mockups (VISUAL APPROVAL GATE)

Launch 2 agents in parallel:

**Agent T0A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T0A: Isomer.js Standalone Mockup".
Read src/config/maps.ts for the grid arrays and src/systems/TilemapRenderer.ts for tile colors.
Implement the task exactly as described. Create tools/iso-mockup.html.
Commit when done. Report: file path only.
```

**Agent T0B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T0B: Phaser Isometric Preview Scene".
Read src/systems/AssetGenerator.ts for the existing pattern.
Implement the task exactly as described. Create src/scenes/IsoPreviewScene.ts, modify AssetGenerator.ts and main.ts.
Commit when done. Report: file paths only.
```

**After both complete:** Open `tools/iso-mockup.html` in browser and run `npm run dev` to preview. Ask user: "Do the isometric mockups look acceptable? Approve to continue to implementation."

**STOP HERE until user approves.**

---

### Phase 1: Foundation

**First, launch Agent T1A alone** (other Phase 1 tasks depend on its interfaces):

**Agent T1A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T1A: Config Interfaces and Constants".
Read src/config/maps.ts and src/config/levels.ts.
Implement: update MapConfig with world/heightGrid/elevation fields, add isometric constants, add backwards-compatible defaults to all 5 existing levels.
Write test, verify it passes, run npx tsc --noEmit, commit.
Report: file paths + test result + tsc result.
```

**After T1A completes, launch T1B + T1C + T1D in parallel:**

**Agent T1B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T1B: Coordinate Utility Module".
Read src/config/maps.ts for ISO_TILE_WIDTH, ISO_TILE_HEIGHT, ELEVATION_PX constants.
Create src/utils/coordinates.ts and src/utils/__tests__/coordinates.test.ts.
Write tests first, then implement, verify tests pass, commit.
Report: file paths + test result.
```

**Agent T1C** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T1C: Elevation Utility Module".
Read src/config/maps.ts for DEPTH_BAND constant.
Create src/utils/elevation.ts and src/utils/__tests__/elevation.test.ts.
Write tests first, then implement, verify tests pass, commit.
Report: file paths + test result.
```

**Agent T1D** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T1D: Line-of-Sight Utility Module".
Create src/utils/line-of-sight.ts and src/utils/__tests__/line-of-sight.test.ts.
Write tests first, then implement, verify tests pass, commit.
Report: file paths + test result.
```

**After all Phase 1 agents complete:** Run `npx tsc --noEmit && npm run test` to verify everything integrates.

---

### Phase 2: Parallel Streams (4 agents simultaneously)

Launch all 4 agents in parallel:

**Agent T2A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T2A: Isometric Asset Generation".
Read src/systems/AssetGenerator.ts for the existing generation pattern.
Add isometric diamond tile generation (128x64), cliff face textures, and world-themed color palettes.
Follow the exact same scene.make.graphics() + g.generateTexture() + g.destroy() pattern.
New texture keys: iso-tile-ground, iso-tile-path, iso-tile-build, iso-tile-spawn, iso-tile-base, iso-cliff-N/S/E/W.
Add WORLD_PALETTES for Desert/Urban/Alien themes.
Commit when done. Report: file path + texture key count.
```

**Agent T2B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T2B: Balance Config Changes".
Read and modify src/config/towers.ts, src/config/enemies.ts, src/config/levels.ts.
Apply all balance changes from the design doc:
- Towers: Laser nerf (T3 fire rate 6->5), Missile cost 337->300, Cryo cost 270->200, Rail Gun dmg 130->150 cost 450->400, Pulse dmg 32->40 cost 950->700
- ALL towers: sellRefundRate 0.5->0.4
- Economy: startingCredits 200->150, passiveIncomeRate 5->2 (all levels)
- HP scaling: 1.0, 1.3, 1.7, 2.2, 2.8 for existing 5 levels
Update src/systems/__tests__/EconomyManager.test.ts to match new values.
Run tests, commit. Report: file paths + test result.
```

**Agent T2C** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T2C: Level Content".
Read src/config/maps.ts for the MapConfig interface, TileType enum, and existing map format.
Replace the 5 existing levels with 15 new level map definitions. Each needs: grid, heightGrid, pathPoints, pathElevations, buildSlotElevations.
Grid sizes: L1=16x12, L2=18x14, L3=20x14, L4=20x16, L5=22x16, L6=20x16, L7=22x16, L8=22x18, L9=24x18, L10=24x18, L11=24x18, L12=26x20, L13=26x20, L14=28x20, L15=28x22.
Elevation ranges: W1(L1-5)=0-1, W2(L6-10)=0-2, W3(L11-15)=0-3.
Rules: No build slots within 3 tiles of spawn. Best slots are mid-path at high elevation. Paths weave through elevation.
Also create 15 LevelConfig entries in src/config/levels.ts with correct worlds, hpScale, and enemy segments.
MAP_COLS and MAP_ROWS should no longer be global constants -- derive from grid dimensions.
Commit when done. Report: file paths + level count.
```

**Agent T2D** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T2D: Camera Panning System".
Create src/systems/CameraController.ts and src/systems/__tests__/CameraController.test.ts.
Camera features: WASD/arrow key panning (400px/sec), click-and-drag with middle/right mouse, bounds clamping.
Map dimensions formula: mapWidth = (cols + rows) * (ISO_TILE_WIDTH / 2), mapHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX).
Write test, implement, verify tests pass, commit.
Report: file paths + test result.
```

**After all Phase 2 agents complete:** Run `npx tsc --noEmit && npm run test`.

---

### Phase 3: System Rewrites

Launch T3A + T3B in parallel, then T3C + T3D in parallel:

**Batch 1 (parallel):**

**Agent T3A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T3A: TilemapRenderer Isometric Rewrite".
Read src/systems/TilemapRenderer.ts (current implementation), src/utils/coordinates.ts, src/utils/elevation.ts, src/config/maps.ts.
Full rewrite of TilemapRenderer for isometric projection:
- Use cartToIso() for all tile positioning
- Render diamond tiles with iso texture keys
- Apply elevation Y-offset
- Draw cliff faces between elevation transitions using heightGrid
- Set depth with calculateDepth()
- Build slots use diamond-shaped hit areas (Phaser Polygon or Zone with diamond vertices)
- getPathPoints() returns isometric world coordinates with elevation offsets
- Handle variable grid sizes (read from grid dimensions, not global constants)
- BuildSlotInfo gains elevation: number field
Commit when done. Report: file path.
```

**Agent T3B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T3B: PathFollower Elevation Support".
Read src/systems/PathFollower.ts, src/utils/elevation.ts.
Update PathFollower:
- Accept elevations: number[] parallel to waypoints
- Apply getSlopeSpeedModifier() between waypoints at different elevations
- Expose currentElevation getter (interpolated)
- Return { x, y, elevation } from update()
Update existing tests if any.
Commit when done. Report: file path.
```

**After Batch 1, launch Batch 2 (parallel):**

**Agent T3C** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T3C: TowerManager Elevation Support".
Read src/systems/TowerManager.ts, src/utils/elevation.ts, src/utils/line-of-sight.ts.
Update TowerManager:
- Store elevation per tower
- Apply getEffectiveRange() for tower-to-enemy distance
- Apply hasLineOfSight() before target acquisition, cache result
- Apply getElevationCostMultiplier() for affordability checks
Commit when done. Report: file path.
```

**Agent T3D** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T3D: EnemySpawner Elevation Support".
Read src/systems/EnemySpawner.ts, src/config/maps.ts.
Update EnemySpawner:
- Pass pathElevations to Enemy constructor
- Split-spawned mini-drones inherit parent elevation and remaining path elevations
Commit when done. Report: file path.
```

**After Phase 3:** Run `npx tsc --noEmit && npm run test`.

---

### Phase 4: Entity Updates (3 agents in parallel)

**Agent T4A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T4A: Tower Entity".
Read src/entities/Tower.ts, src/utils/coordinates.ts, src/utils/elevation.ts.
Update Tower: accept elevation in constructor, use tileToWorld() for positioning, set depth with calculateDepth(), draw range as ellipse.
Commit. Report: file path.
```

**Agent T4B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T4B: Enemy Entity".
Read src/entities/Enemy.ts, src/utils/elevation.ts.
Update Enemy: receive elevation from PathFollower update(), set depth with calculateDepth(), expose currentElevation.
Commit. Report: file path.
```

**Agent T4C** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T4C: Projectile".
Read src/entities/Projectile.ts, src/utils/elevation.ts.
Update Projectile: set depth with calculateDepth() + 50 offset, adjust trail for isometric coords.
Commit. Report: file path.
```

**After Phase 4:** Run `npx tsc --noEmit && npm run test`.

---

### Phase 5: Integration

Launch T5B + T5C in parallel first (independent files), then T5A:

**Agent T5B** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T5B: MenuScene World Selector".
Read src/scenes/MenuScene.ts, src/config/levels.ts.
Update MenuScene: group levels by world (3 sections), world names, themed color backgrounds.
Commit. Report: file path.
```

**Agent T5C** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T5C: UI Updates".
Read src/ui/HUD.ts, src/ui/TowerPicker.ts, src/ui/TowerInfoPanel.ts.
Update: HUD shows world name, TowerPicker shows elevation cost multiplier, TowerInfoPanel shows effective range.
Commit. Report: file paths.
```

**After T5B + T5C, launch T5A:**

**Agent T5A** (subagent_type: general-purpose):
```
Read docs/plans/2026-02-15-v2-implementation-plan.md, section "Task T5A: GameScene Rewiring".
Read src/scenes/GameScene.ts and ALL system/entity files to understand current wiring.
Rewire GameScene:
- Instantiate CameraController
- Pass elevation data through all constructors
- Update camera in update loop
- Pass heightGrid to TilemapRenderer
- Pass pathElevations to EnemySpawner
- Wire ambient glows with isometric positions
- Existing event wiring stays the same
Commit. Report: file path.
```

---

### Phase 6: Verification

Run sequentially:

1. `npx tsc --noEmit` -- must have zero errors
2. `npm run build` -- must produce clean dist/
3. `npm run test` -- all tests must pass
4. `npm run dev` -- manually verify the play-test checklist from the plan

Report results to the user. If any phase fails, dispatch a fix agent for the specific failure.

---

## Error Recovery

If a subagent fails:
1. Read its output to understand the failure
2. Check if the failure is in the agent's own files or a dependency
3. If dependency issue: fix the upstream file first, then re-run the failed agent
4. If agent's own issue: dispatch a new agent with the error context and the original task description
5. Never attempt to fix the issue yourself -- always dispatch a subagent
