# Earth Defense v2.0 Design: Isometric + Elevation + Rebalance

**Date:** 2026-02-15
**Status:** Approved
**Scope:** Isometric rendering conversion, full tactical elevation system, economy/tower rebalance, 15 levels across 3 themed worlds

---

## Problem Statement

The game is heavily imbalanced in favor of the player. Most levels can be defeated by placing a few Laser towers near spawn points. The economy generates surplus credits, the Laser tower dominates cost-efficiency by 2x, and map layouts place build slots where spawn-camping is optimal. Additionally, the top-down grid aesthetic is functional but lacks visual depth.

## Solution Overview

Three interconnected improvements:

1. **Isometric rendering** with camera panning -- visual upgrade using Phaser 3's native isometric tilemap support
2. **Full tactical elevation** -- range bonuses, speed modifiers, LOS blocking, elevation-priced build slots
3. **Balance overhaul** -- economy nerf, tower rebalancing, exponential HP scaling, 15 new levels across 3 themed worlds

---

## 1. Isometric Rendering Architecture

### Coordinate System

Replace orthogonal grid (`x = col * 64, y = row * 64`) with isometric diamond projection:

```
screenX = (col - row) * (TILE_WIDTH / 2) + offsetX
screenY = (col + row) * (TILE_HEIGHT / 2) - (elevation * ELEVATION_PX) + offsetY
```

- **Tile dimensions:** 128x64 pixels (2:1 diamond ratio)
- **Elevation step:** 16px vertical offset per level
- **Canvas:** 1024x768 with `Phaser.Scale.FIT`

### Camera System

- **Panning:** Click-and-drag and WASD/arrow keys to scroll the viewport
- **Bounds:** Camera constrained to map edges with small margin
- **UI layer:** HUD, TowerPicker, TowerInfoPanel remain at `scrollFactor: 0` (already implemented)
- **Mini-map:** Deferred to polish phase

### Map Data Structure

```typescript
export interface MapConfig {
  level: number;
  name: string;
  world: number;                // 1, 2, or 3
  grid: TileType[][];           // tile types
  heightGrid: number[][];       // elevation per cell (0-3)
  pathPoints: MapPoint[];       // enemy waypoints
  pathElevations: number[];     // elevation at each waypoint
  buildSlotElevations: number[];// elevation per build slot
}
```

### Depth Sorting

Elevation-bucketed with screen Y as tiebreaker:

```
DEPTH_BAND = 900  (> canvas height)
depth = (elevation * DEPTH_BAND) + screenY
```

Bands: E0 = 0-899, E1 = 900-1799, E2 = 1800-2699, E3 = 2700-3599

### Cliff Face Rendering

- Check 4 cardinal neighbors of each tile
- If neighbor is lower, draw cliff face (darker shade, ELEVATION_PX * heightDiff tall)
- 4-bit bitmask (N/S/E/W) selects cliff variant
- Generated procedurally in AssetGenerator

### Asset Generation Changes

New methods in AssetGenerator:
- `generateIsoDiamondTile(type, width=128, height=64)` -- diamond tiles per type
- `generateCliffFace(type, direction, heightDiff)` -- cliff edge graphics
- `generateIsoTower(towerType, tier)` -- towers for diamond grid
- `generateIsoEnemy(enemyType)` -- enemies with perspective adjustment

---

## 2. Full Tactical Elevation

### Elevation Levels

- Range: 0-3 (4 distinct heights)
- Visual step: 16px per level
- World 1 uses 0-1, World 2 uses 0-2, World 3 uses 0-3

### Tower Range Bonus (High Ground Advantage)

```
effectiveRange = baseRange * (1 + heightAdvantage * 0.15)
```

- Tower E2, enemy E0 = +30% range
- Tower E0, enemy E2 = -30% range (minimum 50% of base)
- Same elevation = no modifier

### Movement Speed Modifiers

```
speedModifier = 1.0 + (currentElevation - nextElevation) * 0.1
```

- Downhill: +10% speed per level descended
- Uphill: -10% speed per level climbed
- Flat: no change

### Line-of-Sight Blocking

- Check method: Bresenham line from tower tile to enemy tile
- Blocking condition: Any intervening tile has `elevation > max(tower.elevation, enemy.elevation)`
- Computed on target acquisition only (not per-frame), cached until target changes or enemy moves to new tile
- Forces strategic tower placement -- cannot snipe through mountains

### Elevation-Priced Build Slots

- Cost multiplier: `1.0 + elevation * 0.25`
- High ground: fewer slots, more expensive, better coverage
- Low ground: plentiful, standard cost, limited by LOS and range penalties

---

## 3. Balance Overhaul

### Economy

| Parameter | Current | Proposed |
|-----------|---------|----------|
| Starting credits | 200 | 150 |
| Passive income | 5/sec | 2/sec |
| Kill rewards | 10-30 | Unchanged |
| Sell refund rate | 50% | 40% |
| High-ground multiplier | N/A | +25% per elevation |

### Tower Rebalancing

| Tower | Current T3 DPS | Proposed T3 DPS | Current Cost | Proposed Cost |
|-------|---------------|-----------------|--------------|--------------|
| Laser | 108 | 84 | 225 | 225 |
| Missile | 78 | 78 | 337 | 300 |
| Cryo | 24 | 24 | 270 | 200 |
| Rail Gun | 78 | 90 | 450 | 400 |
| Pulse | 64 | 80 | 950 | 700 |

Key: Laser nerfed (fire rate 6->5/s), Rail Gun buffed (+15% dmg, -11% cost), Pulse much cheaper (950->700).

### HP Scaling (Exponential)

| Level | HP Scale |
|-------|----------|
| 1 | 1.0x |
| 2-3 | 1.3x, 1.7x |
| 4-5 | 2.2x, 2.8x |
| 6-8 | 3.5x, 4.2x, 5.0x |
| 9-10 | 6.0x, 7.5x |
| 11-13 | 9.0x, 11.0x, 13.0x |
| 14-15 | 16.0x, 20.0x |

### Enemy Introduction Per World

- World 1 (1-5): Drone, Skitter
- World 2 (6-10): Brute, Shielded
- World 3 (11-15): Swarm (+ all)

---

## 4. World and Level Structure

### World 1: Desert Outpost (Levels 1-5)

Aesthetic: Sandy browns, dusty oranges, muted olive greens. Rocky outcrops.
Elevation: 0-1

| Level | Name | Grid | Elev | Slots | Enemies | Teaching |
|-------|------|------|------|-------|---------|----------|
| 1 | Forward Base | 16x12 | Flat | 6 | 40 Drones | Basics |
| 2 | Rocky Pass | 18x14 | 0-1 | 8 | 50 Drones + 20 Skitters | Elevation intro |
| 3 | Canyon Run | 20x14 | 0-1 | 10 | 60 Drones + 30 Skitters | Valley pathing |
| 4 | Dust Storm | 20x16 | 0-1 | 10 | 70 mixed | Fast spawns |
| 5 | Outpost Siege | 22x16 | 0-1 | 12 | 80 mixed | World 1 finale |

### World 2: Urban Ruins (Levels 6-10)

Aesthetic: Concrete grays, steel blues, neon accents. Rubble, broken buildings.
Elevation: 0-2

| Level | Name | Grid | Elev | Slots | Enemies | Teaching |
|-------|------|------|------|-------|---------|----------|
| 6 | City Gate | 20x16 | 0-2 | 10 | Mixed + 10 Brutes | Brute intro |
| 7 | Overpass | 22x16 | 0-2 | 12 | Mixed + Brutes | Multi-elevation paths |
| 8 | Downtown | 22x18 | 0-2 | 12 | Intro Shielded | Shield regen |
| 9 | Industrial Zone | 24x18 | 0-2 | 14 | All W1-W2 types | LOS blocking critical |
| 10 | Ruins Gauntlet | 24x18 | 0-2 | 14 | Heavy mixed | World 2 finale |

### World 3: Alien Terrain (Levels 11-15)

Aesthetic: Deep purples, alien greens, bioluminescent glows. Organic/crystalline.
Elevation: 0-3

| Level | Name | Grid | Elev | Slots | Enemies | Teaching |
|-------|------|------|------|-------|---------|----------|
| 11 | Hive Approach | 24x18 | 0-3 | 14 | All + Swarm | Swarm intro |
| 12 | Crystal Maze | 26x20 | 0-3 | 16 | Heavy mixed | Extreme elevation |
| 13 | Spore Fields | 26x20 | 0-3 | 16 | Swarm-heavy | Multi-path convergence |
| 14 | Mothership Shadow | 28x20 | 0-3 | 18 | Max density | Everything at once |
| 15 | Last Stand | 28x22 | 0-3 | 20 | Endless scaling | Survive N waves |

### Level Design Principles

1. No build slots adjacent to spawn points (minimum 3 tiles gap)
2. Best build slots are mid-path and elevated
3. Paths weave through elevation changes (natural slow/fast zones)
4. Each level has 2-3 decision points with multiple viable strategies
5. Later levels have path Y-junctions (enemies randomly choose branch)

---

## 5. Mockup Strategy

Before full implementation:

1. **Isomer.js mockup** -- standalone HTML generating 3D-prism mockups of existing maps rendered isometrically with elevation. Quick visual approval.
2. **Phaser iso preview scene** -- `IsoPreviewScene` using native isometric tilemap API with generated diamond textures. Builds toward real implementation.

---

## 6. Implementation Architecture

**Orchestrator pattern:** New conversation window with a self-contained prompt. Orchestrator coordinates only; all implementation by subagents.

**File-based agent coordination:** Agents communicate through artifact files, not shared memory. Each step produces files that serve as the API for the next step.

**Parallel execution:** Subagents run in parallel wherever dependencies allow (separate files, independent systems).

**Minimal reporting:** Subagents write results to files; orchestrator reads files rather than receiving verbose reports.

---

## Technical Notes

- Phaser 3.90 has native isometric tilemap support (since v3.50)
- Do NOT migrate to Phaser 4 -- GPU tilemap layers only support orthographic
- Elevation-bucketed depth sorting: `depth = (elevation * 900) + screenY`
- LOS check uses Bresenham line, computed only on target acquisition
- All assets remain 100% procedural (AssetGenerator pattern)
- Camera panning via Phaser camera bounds + input handling
- UI layer unaffected (scrollFactor: 0 already in place)
