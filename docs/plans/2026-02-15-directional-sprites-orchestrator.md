@./.worktrees/v2-isometric/docs/plans/2026-02-15-isometric-directional-sprites-design.md

# Earth Defense v2.0 -- Isometric Directional Sprites Orchestrator

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

- **MUST use subagents** for all implementation. Orchestrator writes zero code.
- **MUST include the phaser-vite skill reference** in every subagent prompt.
- **MUST run in the worktree:** `~/repos/tower-defence/.worktrees/v2-isometric`
- **MUST NOT modify files on main branch.** All work happens in the worktree.
- **MUST verify** `npx tsc --noEmit && npm run test` passes after each phase.
- **MUST NOT commit** plan/prompt files to git. Only commit source code changes.

---

## Pre-flight Checks

Before dispatching any agents:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
git log --oneline -3          # Verify latest commit
npx tsc --noEmit              # Must pass
npm run test                  # All tests must pass
```

Read the design doc: `docs/plans/2026-02-15-isometric-directional-sprites-design.md`

---

## Phase 1: Foundation (3 agents in parallel)

Launch all three agents simultaneously.

### Agent S1 (sonnet): Direction Utility Module

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-isometric-directional-sprites-design.md (Direction System section)

TASK: Create src/utils/direction.ts with:

1. An IsoDirection enum with 8 values:
   S = 0, SW = 1, W = 2, NW = 3, N = 4, NE = 5, E = 6, SE = 7

2. A DIRECTION_SPRITE_MAP that maps each IsoDirection to a base sprite suffix
   and flipX boolean:
   S  -> { suffix: 'south',     flipX: false }
   SW -> { suffix: 'southwest', flipX: false }
   W  -> { suffix: 'west',      flipX: false }
   NW -> { suffix: 'northwest', flipX: false }
   N  -> { suffix: 'northwest', flipX: true  }
   NE -> { suffix: 'west',      flipX: true  }
   E  -> { suffix: 'southwest', flipX: true  }
   SE -> { suffix: 'south',     flipX: true  }

3. A function snapToDirection(dx: number, dy: number): IsoDirection
   Takes a movement vector (dx, dy) in screen space and returns the
   nearest of the 8 directions. Use Math.atan2 and divide the angle
   into 8 sectors (each 45 degrees). Handle zero vector by returning S.

4. A function getSpriteKey(prefix: string, direction: IsoDirection):
   { key: string; flipX: boolean }
   Returns the texture key (e.g., "enemy-drone-south") and whether
   to flip horizontally.

5. The 4 canonical direction suffixes as an exported array:
   export const DIRECTION_SUFFIXES = ['south', 'southwest', 'west', 'northwest'] as const;

Create tests in src/utils/__tests__/direction.test.ts:
- snapToDirection returns correct direction for each of 8 compass vectors
- snapToDirection returns S for zero vector
- getSpriteKey returns correct key and flipX for each direction
- DIRECTION_SPRITE_MAP covers all 8 directions

Verify: npx tsc --noEmit && npm run test
Commit: "feat: add direction utility for isometric sprite selection"
Report: file paths + test count.
```

### Agent S2 (sonnet): Bottom-Align Offset for Tower + Enemy

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-isometric-directional-sprites-design.md (Bottom-Align section)
- src/entities/Tower.ts
- src/entities/Enemy.ts

TASK: Apply bottom-align offset so entity sprites sit ON tiles, not centered.

In isometric view, an entity's visual bottom should be at the tile center point.
Currently, the sprite center is at the tile center, making entities look like
they float. The fix: shift sprite bodies upward within their containers.

1. In src/entities/Tower.ts:
   - Where the tower body sprite is created (around line 53), change y from 0
     to -(displayHeight / 2). For sprites: scene.add.sprite(0, -20, key).
     For fallback arcs: scene.add.arc(0, -20, ...).
   - The range indicator is a separate scene-level object at (worldPos.x,
     worldPos.y) -- do NOT change it.
   - Tier pips at y=26 should NOT change (they're below the body, correct).

2. In src/entities/Enemy.ts:
   - Find where the body sprite/rect is created (const SIZE = 24, around
     line 114-130). Change the body y position from 0 to -(SIZE / 2) = -12.
   - Also shift the shield overlay (around line 133) to match: y = -12.
   - Health bar position (HEALTH_BAR_Y) is already relative to the top of
     the body. Recalculate: new value should be -(SIZE + 6) since the body
     top is now at -(SIZE) = -24 and we want 6px above that = -30.
     Actually, compute it as: -(SIZE / 2) - (SIZE / 2) - 6 = -(SIZE + 6).
     Wait -- let me be precise:
     - Body center is at y = -12 (shifted up by half)
     - Body top edge is at y = -12 - 12 = -24
     - Health bar should be 6px above that: y = -30
     - Current HEALTH_BAR_Y = -(HALF + 6) = -18
     - New HEALTH_BAR_Y = -(SIZE + 6) = -30

Verify: npx tsc --noEmit && npm run test
Commit: "fix: bottom-align entity sprites for proper isometric grounding"
Report: files changed + specific offsets applied.
```

### Agent S3 (haiku): Ground Shadows

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-isometric-directional-sprites-design.md (Ground Shadows section)
- src/entities/Tower.ts
- src/entities/Enemy.ts

TASK: Add elliptical ground shadows beneath towers and enemies.

1. In src/entities/Tower.ts:
   - After creating the range indicator and before creating the tower body,
     add a ground shadow ellipse as a container child:
     const shadow = scene.add.ellipse(0, 0, 48, 24, 0x000000, 0.15);
     this.add(shadow);
   - The shadow must be added BEFORE the tower body so it renders behind it
     (Phaser container children render in add-order).

2. In src/entities/Enemy.ts:
   - After the container super() call and before creating the body sprite,
     add a ground shadow ellipse:
     const SIZE = 24; // already defined
     const shadow = this.scene.add.ellipse(0, 0, SIZE + 8, (SIZE + 8) / 2, 0x000000, 0.15);
     this.add(shadow);
   - Added BEFORE body sprite so it renders behind.
   - Shadow size is slightly wider than the enemy sprite body.

NOTE: The shadow stays at y=0 (the tile center / ground point). The body
sprite will be shifted up by agent S2, creating visual separation between
shadow and body that suggests the entity is standing on the ground.

Verify: npx tsc --noEmit && npm run test
Commit: "feat: add isometric ground shadows for towers and enemies"
Report: files changed.
```

---

## Phase 1 Verification

After all three agents complete:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # All tests must pass
git log --oneline -5 # Verify S1, S2, S3 commits present
```

If any agent failed, diagnose and dispatch a follow-up agent.

---

## Phase 2: Tower Directional Sprites (1 large agent)

### Agent S4 (opus): Redesign Tower AssetGenerator + Tower Facing Logic

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-isometric-directional-sprites-design.md (Tower Silhouettes section)
- src/systems/AssetGenerator.ts (current generateTowerTextures method)
- src/entities/Tower.ts (full file)
- src/utils/direction.ts (the direction utility created in Phase 1)
- src/config/towers.ts (tower config with colors)

TASK: Two parts -- (A) redesign tower sprite generation, (B) add facing logic.

PART A -- AssetGenerator Tower Sprites:

Replace the existing generateTowerTextures() method. For each of the 5 tower
types, generate 4 directional textures using the naming convention:
  tower-{type}-{direction}  (e.g., tower-laser-south)

Directions to generate: south, southwest, west, northwest.

Use the DIRECTION_SUFFIXES array from src/utils/direction.ts.

Each tower type should be a recognizable military silhouette drawn with Phaser
Graphics at 40x40 pixels. The design doc has visual concepts for each:

- Laser: Cylindrical base + rotating barrel. Barrel points toward facing direction.
- Missile: Boxy launcher + angled tubes. Tubes face the direction.
- Cryo: Dome on platform + frost vents facing direction.
- Rail Gun: Long barrel on tracked base. Barrel is dominant feature.
- Pulse: Ring emitter + antenna spokes on central pylon.

For each direction:
- South: Front-facing, main weapon feature points toward camera (down-screen).
- Southwest: Three-quarter view. Weapon and left side visible.
- West: Side profile. Full silhouette.
- Northwest: Three-quarter rear. Back details visible.

Use the tower's config color as the primary fill. Use darker shades for far-side
details and lighter/white for highlights and near-side edges. Black stroke outlines.

Keep the tower icon textures (generateTowerIconTextures) unchanged -- they are
used in the TowerPicker UI and don't need directional variants.

PART B -- Tower.ts Facing Logic:

1. Import IsoDirection, snapToDirection, getSpriteKey from utils/direction.
2. Add a private currentDirection: IsoDirection = IsoDirection.S property.
3. In the constructor, use the south-facing sprite:
   const { key } = getSpriteKey('tower-' + this.towerKey, IsoDirection.S);
   Use this key for the initial sprite instead of 'tower-{key}'.
4. In update(), after selecting a target, compute direction to target:
   const dx = target.x - this.x;
   const dy = target.y - this.y;
   const newDir = snapToDirection(dx, dy);
   if (newDir !== this.currentDirection) {
     this.currentDirection = newDir;
     const { key, flipX } = getSpriteKey('tower-' + this.towerKey, newDir);
     (this.towerBody as Phaser.GameObjects.Sprite).setTexture(key);
     (this.towerBody as Phaser.GameObjects.Sprite).setFlipX(flipX);
   }
5. When no target is found, revert to S facing if not already.
6. Handle the fallback case (arc body, no texture) gracefully -- skip
   direction changes if the body is an Arc, not a Sprite.

Verify: npx tsc --noEmit && npm run test
Commit: "feat: isometric directional tower sprites with target facing"
Report: files changed + number of textures generated.
```

---

## Phase 2 Verification

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # Must pass
git log --oneline -5 # Verify S4 commit
```

---

## Phase 3: Enemy Directional Sprites (1 large agent)

### Agent S5 (opus): Redesign Enemy AssetGenerator + Enemy Direction Tracking

```
WORKING DIRECTORY: ~/repos/tower-defence/.worktrees/v2-isometric
SKILL: Must use the phaser-vite skill for Phaser 3 patterns.

Read these files first:
- docs/plans/2026-02-15-isometric-directional-sprites-design.md (Enemy Silhouettes section)
- src/systems/AssetGenerator.ts (current generateEnemyTextures method + Phase 2 changes)
- src/entities/Enemy.ts (full file, including Phase 1 changes)
- src/utils/direction.ts (direction utility)
- src/config/enemies.ts (enemy config with types and colors)

TASK: Two parts -- (A) redesign enemy sprite generation, (B) add direction tracking.

PART A -- AssetGenerator Enemy Sprites:

Replace the existing generateEnemyTextures() method. For each of the 6 enemy
types (drone, skitter, brute, shielded, swarm, mini_drone), generate 4
directional textures:
  enemy-{type}-{direction}  (e.g., enemy-drone-south)

Sprite sizes from the design doc:
- Drone: 28x28 (small hovering saucer, domed top, antennae)
- Skitter: 30x20 (low insectoid, 4-6 legs, elongated body)
- Brute: 32x40 (hulking biped, broad shoulders, thick legs)
- Shielded: 28x32 (armored walker, carapace plates, angular)
- Swarm: 24x24 (cluster of 5-8 tiny dots in loose cloud)
- Mini Drone: 16x16 (simplified small saucer)

For each direction, draw the isometric perspective:
- South: Front-facing, creature faces camera.
- Southwest: Three-quarter view, front + left side.
- West: Full side profile.
- Northwest: Three-quarter rear view.

Use the enemy's config color as primary fill. Darker shades for far side,
lighter for near side. Outlines for definition. Suggest volume through
shading and overlapping forms.

PART B -- Enemy.ts Direction Tracking:

1. Import IsoDirection, snapToDirection, getSpriteKey from utils/direction.
2. Add a private currentDirection: IsoDirection = IsoDirection.S property.
3. Add a private prevX and prevY to track last position (for computing
   movement direction).
4. In the constructor, use south-facing sprite initially.
5. In update(), after position updates, compute direction:
   const dx = this.x - this.prevX;
   const dy = this.y - this.prevY;
   if (dx !== 0 || dy !== 0) {
     const newDir = snapToDirection(dx, dy);
     if (newDir !== this.currentDirection) {
       this.currentDirection = newDir;
       const { key, flipX } = getSpriteKey('enemy-' + this.config.key, newDir);
       (this.bodyRect as Phaser.GameObjects.Sprite).setTexture(key);
       (this.bodyRect as Phaser.GameObjects.Sprite).setFlipX(flipX);
     }
   }
   this.prevX = this.x;
   this.prevY = this.y;
6. Handle SIZE differences per enemy type. Currently SIZE = 24 is hardcoded.
   You may need to look up the sprite size from the design doc based on the
   enemy type key. Consider adding a SPRITE_SIZES map or reading from config.
   The display size set via setDisplaySize() should match the design doc sizes.

Verify: npx tsc --noEmit && npm run test
Commit: "feat: isometric directional enemy sprites with movement facing"
Report: files changed + number of textures generated.
```

---

## Phase 3 Verification

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # Must pass
git log --oneline -5 # Verify S5 commit
```

---

## Phase 4: Visual Smoke Test

Start the dev server and verify the directional sprites visually:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npm run dev
```

Use the **webapp-testing** skill with Playwright to test:

### Checklist

1. **Start game:** Navigate to game, click START GAME
2. **Verify enemy sprites:** Enemies should show recognizable alien silhouettes
   (not flat circles/diamonds). They should face their movement direction and
   change facing at path turns.
3. **Place a tower:** Select and place a Laser tower on a build slot. Verify it
   shows a military turret silhouette, not a flat circle.
4. **Verify tower facing:** Wait for an enemy to enter range. The tower should
   rotate to face the target enemy.
5. **Verify ground shadows:** Both towers and enemies should have a small dark
   elliptical shadow beneath them.
6. **Verify grounding:** Entities should appear to stand ON tiles, not float
   above them. Their "feet" should be at the tile center.
7. **Take screenshots** of all the above for review.

---

## Phase 4 Verification

After smoke test:

```bash
cd ~/repos/tower-defence/.worktrees/v2-isometric
npx tsc --noEmit     # Must pass
npm run test         # Must pass
npm run build        # Must succeed
git log --oneline -8 # Review full commit history
```

---

## Completion

Report final status:
- Commits added (count + messages)
- Tests passing (count)
- Build status
- Visual smoke test result (screenshots)
- Any remaining known issues

Then ask the user: "Ready to merge, create PR, or continue testing?"
