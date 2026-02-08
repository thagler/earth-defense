# Earth Defense — Tower Defense Game Plan

**Date:** 2026-02-07
**Status:** Approved

## Objective

Build a chill, browser-based sci-fi tower defense game where Earthers defend against alien invaders across 5 levels with continuous enemy trickle pacing, 5 tower types with 3-tier upgrades, 5 enemy types with unique behaviors, and a forgiving economy.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Perspective | Top-down tile grid with depth-suggesting sprites | Visual charm, simple coordinate math |
| Pacing | Continuous slow enemy trickle | Zen, ambient feel — no rush |
| Tech Stack | Phaser 3 + TypeScript + Vite | Proven game framework, fast dev cycle |
| Map/Path | Fixed enemy paths, designated build tiles | Chill, no maze stress |
| Roster | 5 towers, 5 enemies | Strategic depth without balance nightmares |
| Upgrades | Linear 3-tier per tower | Satisfying progression, simple to implement |
| Economy | Kill rewards + passive income | Forgiving, never stuck |
| Structure | 5 levels (architecture supports future endless mode) | Clear progression, natural stopping points |
| Polish | Free sprite assets + basic SFX | Feels like a real game without custom art |

---

## Project Structure

```
tower-defence/
├── public/
│   └── assets/              # sprites, tilemaps, SFX
│       ├── sprites/
│       ├── tilemaps/
│       └── audio/
├── src/
│   ├── scenes/              # Phaser scenes (Boot, Menu, Game, GameOver)
│   ├── entities/            # Tower, Enemy, Projectile classes
│   ├── config/              # tower stats, enemy stats, level definitions
│   ├── systems/             # economy, wave spawner, upgrade manager
│   ├── ui/                  # HUD, tower picker, upgrade panel
│   └── main.ts              # Phaser game config & entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Towers (5 types, 3 upgrade tiers each)

| Tower | Role | Mechanic | Sci-Fi Flavor | Base Cost |
|-------|------|----------|---------------|-----------|
| Laser Turret | Fast single-target DPS | High fire rate, low damage, medium range | Rapid-pulse energy weapon | 50 |
| Missile Battery | Slow heavy hitter | Slow fire rate, high damage, area splash | Guided plasma warheads | 75 |
| Cryo Emitter | Crowd control / slow | Slows enemies in range, minimal damage | Freezing field generator | 60 |
| Rail Gun | Sniper / long range | Very slow fire rate, very high damage, longest range | Electromagnetic accelerator | 100 |
| Pulse Cannon | Area-of-effect | Medium fire rate, medium damage, hits all in radius | Shockwave emitter | 85 |

**Placement:** Designated build tiles adjacent to the path. One tower per tile.
**Selling:** 50% refund of total invested (base + upgrades).
**Upgrade costs:** Tier 2 = 1.5x base, Tier 3 = 2x base.
**Targeting:** "First" priority (closest to base). No targeting UI in v1.

---

## Enemies (5 types)

| Enemy | Role | Speed | HP | Special | Kill Reward |
|-------|------|-------|----|---------|-------------|
| Drone | Cannon fodder | Medium | Low | None | 10 |
| Skitter | Speed threat | Fast (2x) | Very Low | Punishes coverage gaps | 15 |
| Brute | Tank | Slow | Very High | Absorbs heavy damage | 30 |
| Shielded | Damage gate | Medium | Medium | Shield absorbs first 50% HP, regenerates after 3s no damage | 25 |
| Swarm Cluster | Split threat | Medium | Medium | Splits into 3 mini-drones on death (3 credits each) | 20 |

**Tower/Enemy interplay:**
- Laser Turret shreds Drones and Skitters, struggles against Brutes
- Missile Battery handles Brutes and Swarm Clusters (splash hits splits)
- Cryo Emitter essential for Skitters and buying time against Shielded regen
- Rail Gun punches through Shielded enemies before they regenerate
- Pulse Cannon handles mixed groups and Swarm splits

---

## Economy

| Source | Amount |
|--------|--------|
| Starting credits per level | 200 |
| Passive income | +5 credits/second |
| Kill rewards | See enemy table above |
| Tower sell refund | 50% of total invested |

---

## Level Structure (5 levels)

| Level | Map Theme | New Enemy | Build Slots | Duration | Twist |
|-------|-----------|-----------|-------------|----------|-------|
| 1 | Desert Outpost | Drone | 8 | ~2 min | Tutorial — simple S-curve path |
| 2 | Coastal Base | Skitter | 10 | ~3 min | Faster path with tighter turns |
| 3 | Mountain Pass | Brute | 12 | ~4 min | Long straight stretch rewards range |
| 4 | Urban Ruins | Shielded | 14 | ~5 min | Multiple path segments close together |
| 5 | Mothership Approach | Swarm Cluster | 16 | ~6 min | All enemy types, highest density |

**Lives:** 10 per level. Each enemy reaching base costs 1 life.
**Completion:** Survive all enemies in a level to unlock the next.
**Stats on completion:** Enemies killed, towers built, credits earned.

---

## Implementation Phases

### Phase 0 — Project Scaffolding (1 EU)
- [ ] Initialize git repo
- [ ] Set up Vite + Phaser 3 + TypeScript
- [ ] Create directory structure and placeholder files
- [ ] Verify dev server runs with empty Phaser game
- **Agent:** `Bash` agent (sequential — everything depends on this)
- **Skill:** None specific

### Phase 1 — Core Systems (5 EU serial / ~2 EU wall-clock)
**All four tasks run in parallel via `superpowers:dispatching-parallel-agents`:**

- [ ] **Tilemap & rendering system**
  - Load tile-based maps (2D array initially, Tiled JSON later)
  - Render ground tiles, path tiles, build-slot tiles
  - Camera setup, game canvas sizing
  - **Agent:** `feature-dev:code-architect` then implementation subagent

- [ ] **Tower system**
  - Tower base class with placement on build tiles
  - 5 tower types loaded from config
  - Targeting logic ("First" priority)
  - Projectile firing and hit detection
  - 3-tier upgrade stat scaling
  - **Agent:** `feature-dev:code-architect` then implementation subagent

- [ ] **Enemy system**
  - Enemy base class with path-following
  - 5 enemy types loaded from config
  - HP, damage, death handling
  - Special behaviors: Skitter speed, Brute tankiness, Shield + regen, Swarm split
  - **Agent:** `feature-dev:code-architect` then implementation subagent

- [ ] **Economy system**
  - Credit tracking (starting, passive, kill rewards)
  - Buy/sell/upgrade cost validation
  - Passive income tick
  - **Agent:** Implementation subagent
  - **Skill:** `superpowers:test-driven-development` (pure logic, no rendering)

### Phase 2 — Integration & UI (4 EU serial / ~2 EU wall-clock)
**Partially parallelizable:**

- [ ] **Game scene integration** (sequential — depends on all Phase 1)
  - Wire towers + enemies + economy in main game loop
  - Enemy-tower collision/damage pipeline
  - Economy events (kill → credits, build → deduct)
  - **Skill:** `superpowers:executing-plans` with review checkpoints

- [ ] **HUD & UI** (parallel with level definitions)
  - Credits display, lives counter, level indicator
  - Tower picker panel (bottom/side bar)
  - Tower upgrade panel (click tower → show upgrade option)
  - **Agent:** Parallel subagent

- [ ] **Level definitions** (parallel with UI)
  - 5 level config objects (enemy composition, spawn rates, map data)
  - Level progression logic (complete → unlock next)
  - **Agent:** Parallel subagent

- [ ] **Spawner system** (after integration, parallel with UI)
  - Continuous trickle logic reading from level config
  - Difficulty ramping (spawn rate + HP scaling)
  - Level completion detection (all enemies spawned and cleared)
  - **Skill:** `superpowers:test-driven-development`

### Phase 3 — Content & Polish (3 EU serial / ~1.5 EU wall-clock)
**All three tasks run in parallel:**

- [ ] **Source free sprite assets**
  - Sci-fi tower sprites, alien enemy sprites, ground/path tilesets
  - Projectile and effect sprites
  - Sources: OpenGameArt, itch.io free assets, Kenney.nl
  - **Agent:** `general-purpose` agent (web search + research)

- [ ] **Source free SFX**
  - Shooting, explosions, UI clicks, enemy death, level complete
  - Sources: Freesound.org, OpenGameArt, jsfxr for procedural SFX
  - **Agent:** `general-purpose` agent (web search + research)

- [ ] **Integrate assets and build scenes**
  - Replace placeholder sprites with real assets
  - Add SFX triggers to game events
  - Build Menu scene (start game, level select)
  - Build GameOver scene (stats, retry/next level)
  - **Agent:** Parallel subagent

**Later-stage notes (post-v1):**
- [ ] Source open-source ambient sci-fi music (OpenGameArt, Freesound, Kevin MacLeod)
- [ ] Add background music system with volume control
- [ ] Explore procedural SFX generation (jsfxr/sfxr.js) for custom sounds
- [ ] Expand SFX library with more varied sound effects

### Phase 4 — Verification & Review (2 EU)

- [ ] **Browser playtesting**
  - Automated: game loads, towers place, enemies spawn, levels complete
  - **Skill:** `webapp-testing` (Playwright)

- [ ] **Balance pass**
  - Play through all 5 levels manually
  - Adjust tower/enemy/economy configs as needed
  - **Skill:** `webapp-testing` for assisted playtesting

- [ ] **Code review**
  - Full codebase review
  - **Skill:** `superpowers:requesting-code-review`

- [ ] **Completion verification**
  - All systems functional, no broken builds, game playable start to finish
  - **Skill:** `superpowers:verification-before-completion`

---

## Workflow Skills Used Throughout

| Skill | When |
|-------|------|
| `superpowers:writing-plans` | Before Phase 1 — detailed implementation plan from this design |
| `superpowers:using-git-worktrees` | Each phase gets its own worktree for isolation |
| `superpowers:dispatching-parallel-agents` | Phase 1 (4 parallel), Phase 2 (3 parallel), Phase 3 (3 parallel) |
| `superpowers:test-driven-development` | Economy system, spawner system |
| `superpowers:executing-plans` | Phase 2 integration work |
| `superpowers:verification-before-completion` | End of each phase |
| `superpowers:requesting-code-review` | Phase 4 final review |
| `superpowers:finishing-a-development-branch` | Merge each phase back to main |
| `webapp-testing` | Phase 4 browser playtesting |

---

## Estimated Effort

| Phase | EUs (serial) | EUs (wall-clock with parallelism) |
|-------|-------------|----------------------------------|
| Phase 0: Scaffolding | 1 | 1 |
| Phase 1: Core Systems | 5 | ~2 |
| Phase 2: Integration & UI | 4 | ~2 |
| Phase 3: Content & Polish | 3 | ~1.5 |
| Phase 4: Verification | 2 | 2 |
| **Total** | **15** | **~8.5 (~43% savings)** |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free assets lack visual cohesion | Medium | Fallback to geometric shapes; source from single asset pack when possible |
| Balance tuning complexity (5x5x5) | Medium | Data-driven configs make adjustment fast; start conservative |
| Tiled editor learning curve | Low | Hand-code tilemaps as 2D arrays first, migrate to Tiled later |
| Phaser 3 API surface is large | Low | Only use: scenes, tilemaps, sprites, groups, tweens, input |

---

## Future Opportunities (post-v1)

- Endless/survival mode (architecture supports it — config change)
- Branching tower upgrades (tier 2 specializations)
- Open-source music and expanded SFX
- Additional levels and enemy types
- Mobile touch support (Phaser handles natively)
- Leaderboards (would require minimal backend)
