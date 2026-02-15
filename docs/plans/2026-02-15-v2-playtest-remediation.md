# Earth Defense v2.0 -- Playtest Remediation Plan

**Date:** 2026-02-15
**Branch:** `feature/v2-isometric` (worktree: `.worktrees/v2-isometric`)
**Baseline:** All 21 implementation tasks complete, 87/87 tests passing, tsc clean, build clean.

---

## Issues Found During Playtest

### Issue 1: Camera Not Centered on Map (CRITICAL)

**Symptom:** Map appears shifted to the upper-left on first load. On retry/reload, the map moves further off-center.

**Root Cause:** `CameraController` (line 47) centers the camera at `(mapPixelWidth / 2, mapPixelHeight / 2)`, where `mapPixelWidth = (cols + rows) * (ISO_TILE_WIDTH / 2)`. This assumes the isometric map's center is at the midpoint of the bounding box, but `cartToIso(col, row)` produces `screenX = (col - row) * 64`, which ranges from negative (high row, low col) to positive (low row, high col). For a 16x12 grid:
- Top-left tile (0,0): screenX = 0, screenY = 0
- Top-right tile (15,0): screenX = 960, screenY = 480
- Bottom-left tile (0,11): screenX = -704, screenY = 352
- Bottom-right tile (15,11): screenX = 256, screenY = 832
- Actual center: cartToIso(8, 6) = screenX = 128, screenY = 448
- CameraController centers on: (896, 480) -- off by ~768px horizontally!

**Fix:**
1. `CameraController` constructor should compute the actual map center by calling `cartToIso(cols/2, rows/2, 0)` (or by computing the bounding box from all four corner tiles).
2. Camera bounds should be calculated from the actual min/max screenX/screenY of corner tiles, not from `(0, 0, mapPixelWidth, mapPixelHeight)`.

**Files:** `src/systems/CameraController.ts`

---

### Issue 2: Cannot Place Towers on Build Slots (CRITICAL)

**Symptom:** Clicking build slots does nothing. No tower placement occurs despite having credits and a tower selected.

**Root Cause:** `TilemapRenderer` (line 119) creates `Phaser.GameObjects.Zone` at `(screenX, screenY)` with size `(ISO_TILE_WIDTH, ISO_TILE_HEIGHT)` = `(128, 64)`. By default, Phaser `Zone` has its origin at `(0.5, 0.5)` (center), so the zone is centered at the tile's screen position -- correct.

However, the diamond hit area polygon (lines 123-128) uses vertices `(64, 0), (128, 32), (64, 64), (0, 32)` which are specified in the zone's *local coordinate space*. Since the zone's origin is `(0.5, 0.5)`, local (0,0) is the top-left corner of the zone. These vertices describe a diamond centered at `(64, 32)` in local space -- which is the center of the zone. This part is actually correct.

The more likely cause is that Phaser's `Polygon.Contains` hit test receives pointer coordinates in local zone space, but the zone's position in world space is affected by the camera scroll. When the camera is off-center (Issue 1), pointer-to-world coordinate transformation may be broken, or the zone may not receive pointer events because it's outside the expected bounds.

Additional suspects:
- The `pointerdown` handler on build slot zones (GameScene line 180) checks `this.towerPicker.getSelectedTower()` -- if TowerPicker selection is lost between frames, this would silently fail.
- The zone's `setInteractive` with a custom `hitAreaCallback` must match Phaser's expected signature: `(hitArea, x, y, gameObject) => boolean`. `Phaser.Geom.Polygon.Contains` takes `(polygon, x, y) => boolean` which doesn't match -- **this is likely the actual bug**. Phaser passes 4 args, but `Polygon.Contains` ignores the 4th (gameObject) param since JS doesn't error on extra args. Actually, wait -- the signature is `hitAreaCallback(hitArea, x, y, gameObject)` where `hitArea` is the polygon itself. `Phaser.Geom.Polygon.Contains(polygon, x, y)` -- the args align: hitArea=polygon, x=x, y=y. This should work.

Most likely: Issue 1 (camera mis-centering) causes the world coordinates of pointer events to be wrong, making all build slot clicks miss their targets. Fixing Issue 1 should resolve or greatly help Issue 2.

Secondary fix needed: Add a visible highlight/outline effect to build slot zones so players can verify clickability.

**Files:** `src/systems/TilemapRenderer.ts`, `src/systems/CameraController.ts`

---

### Issue 3: HUD Text Overlap (MODERATE)

**Symptom:** "Desert Outpost - Level 1: Forward Base" text overlaps with "Lives: 10/10" in the top bar.

**Root Cause:** HUD uses hardcoded pixel positions:
- `enemiesText` at x=16 (left-aligned)
- `levelNameText` at x=400 (left-aligned)
- `livesText` at x=700 (left-aligned)
- `creditsText` at x=840 (left-aligned)
- `muteButton` at x=1006 (right-aligned)

The level name string `"Desert Outpost - Level 1: Forward Base"` is ~39 characters at 16px monospace (~7.8px/char = ~304px wide), placing its right edge at x=704, which overlaps `livesText` at x=700.

**Fix:** Restructure the HUD layout:
- Make `levelNameText` centered (origin 0.5) at x=512
- Move `livesText` further right, or abbreviate the level name
- OR: Use a two-row approach: world/level name on the left, stats on the right
- Simplest fix: Reduce level name font to 12px, or truncate to "L1: Forward Base"

**Files:** `src/ui/HUD.ts`

---

### Issue 4: Build Slots Nearly Invisible (MODERATE)

**Symptom:** Build slot diamond tiles are almost indistinguishable from ground tiles in the Desert theme.

**Root Cause:** `AssetGenerator.generateIsoDiamondTiles()` uses world palette colors:
- Desert ground: `0x2a1f0a`
- Desert build: `0x2e3a1e`

These are very close in perceived brightness, especially when the isometric tile only shows a diamond shape with subtle border. The old square tile textures had corner brackets and a crosshair dot for visual distinction.

**Fix:**
1. Add diamond-edge highlight or dashed border to build slot iso textures
2. Increase color contrast between build and ground tiles in all world palettes
3. Add a subtle animated pulse or corner marker overlay to build slot zones at runtime

**Files:** `src/systems/AssetGenerator.ts`

---

### Issue 5: Grid Overlay Lines Visible (LOW)

**Symptom:** Blue/dark grid lines visible on the game map, making it look like an orthogonal grid is showing through the isometric tiles.

**Root Cause:** `AssetGenerator.generateTileTextures()` (lines 738-937) still generates the old 64x64 square tile textures (`tile-ground`, `tile-path`, etc.) that have internal grid patterns and lines. These textures are registered but not used by the isometric TilemapRenderer. However, they may be leaking through if any game object references the old texture keys.

More likely: The old square tile textures have subtle grid lines baked in (lines 759-771 draw grid on `tile-ground` at 0.2 alpha). These old textures may not be visible at all -- the "grid" might just be the very faint diamond tile borders drawn on every iso tile (AssetGenerator line 1068-1076), which are dark and appear as a grid pattern when many tiles are side by side.

**Fix:**
1. Reduce or remove the border/outline from iso ground tile textures (currently drawn at 0.5 alpha)
2. Optionally remove old 64x64 tile texture generation entirely if no code references them
3. Make tile borders barely visible (0.15 alpha) for ground tiles, more visible for build/spawn/base

**Files:** `src/systems/AssetGenerator.ts`

---

## Remediation Task Breakdown

| Task | Issue | Description | Model | Files |
|------|-------|-------------|-------|-------|
| R1 | 1,2 | Fix camera centering and bounds | sonnet | CameraController.ts |
| R2 | 2 | Verify/fix build slot hit detection | sonnet | TilemapRenderer.ts, GameScene.ts |
| R3 | 3 | Fix HUD text layout overlap | haiku | HUD.ts |
| R4 | 4,5 | Improve build slot visibility and reduce grid overlay | sonnet | AssetGenerator.ts |
| R5 | -- | Smoke test: verify all fixes work together | -- | (orchestrator manual test) |

**Dependencies:**
- R1 must complete first (camera fix likely resolves much of R2)
- R2 depends on R1 (need correct camera to test hit detection)
- R3 and R4 are independent of R1/R2 and can run in parallel with them

**Execution order:**
1. R1 (camera) -- then verify tower placement works
2. R2 (hit detection) if still broken after R1 -- parallel with R3 + R4
3. R3 (HUD) + R4 (visuals) -- parallel
4. R5 (smoke test)
