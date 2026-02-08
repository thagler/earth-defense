# Earth Defense

A chill sci-fi tower defense game built with Phaser 3, TypeScript, and Vite. Defend Earth from waves of alien invaders across 5 levels using 5 upgradeable tower types.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |

## How to Play

1. Click **Start Game** or pick a level from the menu.
2. Select a tower from the bottom bar (Laser, Missile, Cryo, Rail Gun, Pulse).
3. Click an open build slot (dashed-border tiles) to place the tower.
4. Click a placed tower to open its info panel where you can upgrade or sell it.
5. Enemies stream from the green spawn point toward the red base. Don't let them through!

## Tech Stack

- **Phaser 3** -- game framework (rendering, input, scenes, tweens)
- **TypeScript** -- strict typing throughout
- **Vite** -- dev server and bundler
- **Vitest** -- unit testing
