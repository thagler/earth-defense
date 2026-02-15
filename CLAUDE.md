# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server at localhost:3000
npm run build        # tsc --noEmit && vite build → dist/
npm run test         # vitest run (all tests, once)
npm run test:watch   # vitest in watch mode
npx tsc --noEmit     # Type-check only (no output)
```

Tests use vitest with jsdom. `vitest.setup.ts` provides Canvas/AudioContext stubs for Phaser. Run a single test file with `npx vitest run src/systems/EconomyManager.test.ts`.

## Architecture

Phaser 3 + TypeScript + Vite. 1024x768 canvas, 64px tiles on a 16x12 grid.

**Scene flow:** BootScene (asset gen) → MenuScene (level select) → GameScene (gameplay) → GameOverScene

**Directory layout:**
- `src/config/` -- Pure data: tower/enemy/level/map definitions. Maps are 2D number grids with TileType enum (0=Ground, 1=Path, 2=BuildSlot, 3=Spawn, 4=Base).
- `src/systems/` -- Core logic: EnemySpawner, TowerManager, EconomyManager, TilemapRenderer, PathFollower, SoundManager, AssetGenerator, ParticleEffects, BackgroundRenderer.
- `src/entities/` -- Phaser Container subclasses: Tower, Enemy, Projectile. Each manages its own visuals and emits events.
- `src/scenes/` -- Phaser scenes. GameScene is the orchestrator that wires all systems together via events.
- `src/ui/` -- HUD (top bar), TowerPicker (bottom bar), TowerInfoPanel (upgrade/sell popup). All at depth 1000, scrollFactor 0.

## Key Patterns

**Event-driven communication.** Systems never reference each other directly. GameScene wires them together by listening to events and calling methods:
- EnemySpawner emits `enemy-killed`, `enemy-reached-base`, `enemies-spawned-from-split`
- TowerManager emits `tower-placed`, `tower-upgraded`
- EconomyManager emits `credits-changed`
- Tower entities emit `tower-clicked`

**Kill attribution.** Projectiles store a `sourceTower` reference. On hit, if the target dies, `sourceTower.addKill()` is called. Towers need 3 kills for tier 2, 5 for tier 3 before upgrading.

**Shared state.** `scene.data.set('enemies', activeEnemies)` lets Projectile find enemies for splash damage without coupling to EnemySpawner. `scene.registry.get('soundManager')` provides global sound access.

**Fractional passive income.** EconomyManager accumulates sub-integer credits internally and only emits whole-number changes to avoid float display issues.

**100% procedural assets.** AssetGenerator creates all textures via Phaser Graphics in BootScene. SoundManager synthesizes all audio via Web Audio API. No external asset files.

## Configuration Conventions

Towers have 3 tiers with `baseCost`, `upgradeCosts: [tier2, tier3]`, and `sellRefundRate: 0.5`. `projectileSpeed: 0` means instant area effect (cryo, pulse). Enemy specials: `shield` (absorbs damage, regenerates) and `split` (spawns children on death, adjusts total enemy count). Level `hpScale` multiplies all enemy baseHp.

## Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and pushes `dist/` to `gh-pages` branch via `peaceiris/actions-gh-pages`. The workflow stamps `__VERSION__` from package.json into HTML files before building. Custom domain: `tower-defense.tobbyhagler.com` (CNAME preserved via workflow config). Multi-page build: index.html (launcher), game.html, changelog.html, guide.html.

## Depth Layering

Background: -10 → Tiles/Towers: 0 → Enemies/Projectiles: default → UI: 1000 → TowerInfoPanel: 1001

## Development Artifacts

Plans, design docs, and orchestrator prompts in `docs/plans/` are **ephemeral development artifacts**. Do NOT commit them to git. They live in the worktree for reference during development but are not part of the codebase.

## Orchestrator Pattern

All multi-step implementation work follows this pattern:

1. **Design doc** (`docs/plans/YYYY-MM-DD-<topic>-design.md`) -- brainstormed with user, not committed.
2. **Orchestrator prompt** (`docs/plans/YYYY-MM-DD-<topic>-orchestrator.md`) -- references the design doc, not committed.
3. **Execution:** User starts a new context window (`/new`), then `@`-references the orchestrator prompt file. The orchestrator:
   - Does **zero implementation** itself -- all code via subagents.
   - Invokes **phaser-vite** skill before any work, and includes it in every subagent prompt.
   - Invokes **executing-plans** and **dispatching-parallel-agents** skills.
   - Runs pre-flight checks (`tsc --noEmit`, `npm run test`).
   - Dispatches subagents in phases, verifies after each phase.
   - Runs visual smoke test with **webapp-testing** skill at the end.
   - Reports final status and asks user for next steps.

The orchestrator prompt should include an `@`-path reference to the design doc on its first line so both files load into context when the user `@`-references the orchestrator.
