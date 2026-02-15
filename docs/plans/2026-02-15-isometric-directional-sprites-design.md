# Isometric Directional Sprites Design

**Date:** 2026-02-15
**Branch:** `feature/v2-isometric` (worktree: `.worktrees/v2-isometric`)
**Baseline:** Depth sorting remediation complete, 100/100 tests, tsc clean.

---

## Problem

Entities (enemies and towers) appear to float or list sideways in the isometric view. Two root causes:

1. **Centering:** Entity sprites have their visual center at the tile center point. In isometric projection, the visual bottom should sit at the tile center to appear grounded.
2. **Flat sprites:** Entities are flat geometric shapes (circles, diamonds) rendered as 2D icons in 3D isometric space. They lack volume and directional facing.

## Solution

Three changes, layered together:

1. **Bottom-align offset** -- shift sprites up within their containers so the visual bottom sits at the tile center.
2. **Directional sprites** -- generate 4 isometric viewing angles per entity type, mirrored to cover 8 directions. Enemies face their movement direction; towers face their target.
3. **Ground shadows** -- elliptical shadow beneath each entity to anchor it to the tile surface.

---

## Directional Sprite System

### 4 Unique Angles, Mirrored to 8

Draw 4 sprites per entity type: **S, SW, W, NW** (in screen-space isometric orientation). Mirror horizontally for the other 4.

| Screen Direction | Sprite Key | FlipX |
|------------------|-----------|-------|
| S (down) | `south` | No |
| SW (down-left) | `southwest` | No |
| W (left) | `west` | No |
| NW (up-left) | `northwest` | No |
| SE (down-right) | `south` | Yes |
| E (right) | `southwest` | Yes |
| NE (up-right) | `west` | Yes |
| N (up) | `northwest` | Yes |

Note: S is symmetric, so S mirrored still works. The mirror axis is the vertical center line.

### Direction Computation

**Enemies:** Compute movement direction from the velocity vector (difference between current position and previous position, or current waypoint segment direction). Snap to nearest of 8 compass directions. Update sprite on direction change.

**Towers:** Compute direction from tower position to current target enemy. Snap to nearest of 8 directions. When idle (no target), default to S (facing the camera). Update sprite when target changes.

### Sprite Selection

Each entity stores a `currentDirection` enum value (0-7 for the 8 directions). On direction change:
1. Look up which of the 4 base sprites to use (from the mirror table).
2. Set `flipX` on the sprite accordingly.
3. No interpolation or animation between directions -- instant snap is fine for this art style.

---

## Enemy Silhouettes

All enemies are alien creatures. Each type has a distinct silhouette drawn procedurally via Phaser Graphics, suggesting a 3D form viewed from an isometric angle.

### Sprite Sizes

| Type | Sprite Size | Notes |
|------|-------------|-------|
| Drone | 28x28 | Small flying disc |
| Skitter | 30x20 | Wide, low profile |
| Brute | 32x40 | Tall, hulking |
| Shielded | 28x32 | Medium with visible shield |
| Swarm | 24x24 | Cluster of dots |
| Mini Drone | 16x16 | Half-size drone |

### Visual Concepts

**Drone** -- Small hovering saucer. Domed top, flat underside with glow. Thin antennae. From the side, shows the dome profile and underside glow. The hover gap (no legs touching ground) suggests flight.

**Skitter** -- Low insectoid. Elongated oval body with 4-6 short legs visible from each angle. Legs on the near side are visible, far side hidden. Fast, menacing silhouette.

**Brute** -- Hulking bipedal form. Broad shoulders, thick legs, heavy stance. Arms hang low. From behind (NW), shows wide back and shoulder plates. Largest enemy sprite.

**Shielded** -- Armored walker with visible carapace plates. Similar proportions to Drone but with angular armor segments. Shield visual is a translucent overlay arc on the front-facing side.

**Swarm** -- Cluster of 5-8 tiny dots in a loose cloud formation. The cloud shifts slightly per direction to suggest movement. On death, dots scatter outward.

**Mini Drone** -- Simplified, smaller version of Drone. Single body dot with tiny wings/antennae.

### Drawing Approach

Each direction variant is drawn as a separate texture. The isometric viewing angle means:
- **South-facing:** Entity faces toward the camera. Front details visible, back hidden.
- **Southwest-facing:** Three-quarter view. Front and left side visible.
- **West-facing:** Side profile. Full side silhouette visible.
- **Northwest-facing:** Three-quarter rear view. Back and left side visible.

Use Phaser Graphics primitives: `fillRect`, `fillTriangle`, `fillCircle`, `lineTo`, `arc`, `fillRoundedRect`. Layer darker fills for far-side details, lighter for near-side. Stroke outlines for definition.

---

## Tower Silhouettes

All towers are Earth defense structures. Each has a distinct mechanical/military silhouette suggesting a ground-mounted weapon system.

### Sprite Sizes

All towers: **40x40** (matching current size). Tier scaling (1.0, 1.15, 1.30) continues to apply.

### Visual Concepts

**Laser** -- Cylindrical base with a rotating turret barrel on top. The barrel points in the facing direction. Targeting lens glow at the barrel tip. Clean, precise lines suggest high-tech.

**Missile** -- Boxy launcher platform with 2-4 angled launch tubes. Tubes angle toward the facing direction. Stocky, industrial silhouette. Vents on the back side.

**Cryo** -- Hemisphere dome on a platform base. Frost vents/nozzles face the target direction. Cool-toned highlights. Pipes run from base to dome.

**Rail Gun** -- Long barrel extending from a compact tracked base. The barrel is the dominant visual feature, pointing in the facing direction. Power coils/rings along the barrel. Most elongated silhouette.

**Pulse** -- Concentric ring emitter on a central pylon. Antenna spokes radiate outward. The rings tilt to face the target direction. Sci-fi glow emanates from the center.

### Drawing Approach

Same technique as enemies. The facing direction determines which side details are visible:
- **South:** Front-facing, barrel/emitter pointed at camera.
- **Southwest:** Barrel angled left, side armor visible.
- **West:** Side profile, barrel pointing left.
- **Northwest:** Rear three-quarter, back details visible.

---

## Ground Shadows

### Implementation

Each entity gets a small elliptical shadow drawn beneath it:
- **Shape:** Filled ellipse (isometric foreshortening: width > height).
- **Size:** Slightly wider than the entity sprite. Tower shadow ~48x24. Enemy shadow scaled to entity size.
- **Color:** Black at 15-20% opacity.
- **Position:** At the container's base position (tile center), at a depth just above the tile.
- **Behavior:** Shadow is a child of the entity container, positioned at the "ground" level (y=0 relative to container, since the body sprite is shifted up).

### Shadow Depth

The shadow needs to render above the ground tile but below the entity body. Since the entity body sprite is shifted up within the container, the shadow at y=0 with a local depth ordering will naturally layer correctly.

---

## Bottom-Align Offset

### Approach

The entity sprite (body) is shifted upward within its container by half the sprite height. The container position remains at the tile center (the "ground point"). This means:

- The sprite's bottom edge aligns with the tile center.
- Health bars, tier pips, and other UI elements adjust relative to the shifted body.
- The ground shadow stays at y=0 (the ground point).

### Offsets by Entity

| Entity | Sprite Height | Body Y Offset | Shadow Y |
|--------|--------------|---------------|----------|
| Tower (all) | 40 | -20 | 0 |
| Drone | 28 | -14 | 0 |
| Skitter | 20 | -10 | 0 |
| Brute | 40 | -20 | 0 |
| Shielded | 32 | -16 | 0 |
| Swarm | 24 | -12 | 0 |
| Mini Drone | 16 | -8 | 0 |

---

## Texture Naming Convention

```
tower-{type}-{direction}    e.g. tower-laser-south, tower-laser-southwest
enemy-{type}-{direction}    e.g. enemy-drone-south, enemy-skitter-west
```

Directions: `south`, `southwest`, `west`, `northwest` (4 unique textures per entity type).

The entity code uses the direction enum to select the texture key and set flipX.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/systems/AssetGenerator.ts` | Major: new directional sprite generation for all enemy and tower types |
| `src/entities/Enemy.ts` | Direction tracking, sprite switching, body offset, shadow |
| `src/entities/Tower.ts` | Direction tracking toward target, sprite switching, body offset, shadow |
| `src/config/enemies.ts` | Add sprite size per enemy type (if not already present) |
| `src/config/towers.ts` | Verify sprite size config |

### New Files

| File | Purpose |
|------|---------|
| `src/utils/direction.ts` | Direction enum, vector-to-direction snapping, mirror/flip lookup table |

---

## Scope and Effort

This is a **large** change (4-5 EUs). The bulk of the work is in AssetGenerator drawing 44 unique directional sprites (5 enemy types + mini_drone = 6 x 4 directions = 24 enemy sprites, 5 tower types x 4 directions = 20 tower sprites).

### Implementation Phases

**Phase 1: Foundation** -- Direction utility, bottom-align offset, ground shadows. Can be verified immediately.

**Phase 2: Tower sprites** -- Redesign 5 tower types with directional variants. Tower facing logic.

**Phase 3: Enemy sprites** -- Redesign 6 enemy types with directional variants. Enemy direction tracking from movement vector.

**Phase 4: Visual polish** -- Tune sizes, offsets, shadow opacity. Playtest and iterate.
