export interface WaveSegment {
  enemyKey: string;
  count: number;
  spawnInterval: number; // seconds between spawns
}

export interface LevelConfig {
  level: number;
  name: string;
  theme: string;
  world: number;
  startingCredits: number;
  passiveIncomeRate: number; // credits per second
  lives: number;
  buildSlots: number;
  segments: WaveSegment[]; // continuous trickle segments played in sequence
  hpScale: number; // multiplier on enemy base HP for this level
}

export const LEVELS: LevelConfig[] = [
  // World 1: Desert Outpost
  { level: 1, name: 'Forward Base', theme: 'desert', world: 1, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 6, hpScale: 1.0, segments: [{ enemyKey: 'drone', count: 40, spawnInterval: 2.0 }] },
  { level: 2, name: 'Rocky Pass', theme: 'desert', world: 1, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 8, hpScale: 1.3, segments: [{ enemyKey: 'drone', count: 30, spawnInterval: 1.8 }, { enemyKey: 'skitter', count: 20, spawnInterval: 1.2 }] },
  { level: 3, name: 'Canyon Run', theme: 'desert', world: 1, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 10, hpScale: 1.7, segments: [{ enemyKey: 'drone', count: 40, spawnInterval: 1.5 }, { enemyKey: 'skitter', count: 30, spawnInterval: 1.0 }] },
  { level: 4, name: 'Dust Storm', theme: 'desert', world: 1, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 10, hpScale: 2.2, segments: [{ enemyKey: 'drone', count: 35, spawnInterval: 1.2 }, { enemyKey: 'skitter', count: 25, spawnInterval: 0.9 }, { enemyKey: 'drone', count: 20, spawnInterval: 1.0 }] },
  { level: 5, name: 'Outpost Siege', theme: 'desert', world: 1, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 12, hpScale: 2.8, segments: [{ enemyKey: 'drone', count: 40, spawnInterval: 1.5 }, { enemyKey: 'skitter', count: 30, spawnInterval: 1.0 }, { enemyKey: 'drone', count: 20, spawnInterval: 0.8 }] },

  // World 2: Urban Ruins
  { level: 6, name: 'City Gate', theme: 'urban', world: 2, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 10, hpScale: 3.5, segments: [{ enemyKey: 'drone', count: 25, spawnInterval: 1.5 }, { enemyKey: 'skitter', count: 20, spawnInterval: 1.2 }, { enemyKey: 'brute', count: 10, spawnInterval: 3.5 }] },
  { level: 7, name: 'Overpass', theme: 'urban', world: 2, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 12, hpScale: 4.2, segments: [{ enemyKey: 'drone', count: 30, spawnInterval: 1.3 }, { enemyKey: 'brute', count: 12, spawnInterval: 3.0 }, { enemyKey: 'skitter', count: 25, spawnInterval: 1.0 }] },
  { level: 8, name: 'Downtown', theme: 'urban', world: 2, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 12, hpScale: 5.0, segments: [{ enemyKey: 'drone', count: 25, spawnInterval: 1.2 }, { enemyKey: 'shielded', count: 12, spawnInterval: 2.5 }, { enemyKey: 'brute', count: 10, spawnInterval: 2.8 }, { enemyKey: 'skitter', count: 20, spawnInterval: 0.9 }] },
  { level: 9, name: 'Industrial Zone', theme: 'urban', world: 2, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 14, hpScale: 6.0, segments: [{ enemyKey: 'drone', count: 30, spawnInterval: 1.0 }, { enemyKey: 'brute', count: 12, spawnInterval: 2.5 }, { enemyKey: 'shielded', count: 15, spawnInterval: 2.2 }, { enemyKey: 'skitter', count: 25, spawnInterval: 0.8 }] },
  { level: 10, name: 'Ruins Gauntlet', theme: 'urban', world: 2, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 14, hpScale: 7.5, segments: [{ enemyKey: 'drone', count: 35, spawnInterval: 1.0 }, { enemyKey: 'brute', count: 15, spawnInterval: 2.3 }, { enemyKey: 'shielded', count: 18, spawnInterval: 2.0 }, { enemyKey: 'skitter', count: 30, spawnInterval: 0.7 }, { enemyKey: 'brute', count: 10, spawnInterval: 2.0 }] },

  // World 3: Alien Terrain
  { level: 11, name: 'Hive Approach', theme: 'alien', world: 3, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 14, hpScale: 9.0, segments: [{ enemyKey: 'drone', count: 30, spawnInterval: 0.9 }, { enemyKey: 'brute', count: 12, spawnInterval: 2.0 }, { enemyKey: 'swarm', count: 15, spawnInterval: 2.5 }, { enemyKey: 'shielded', count: 15, spawnInterval: 1.8 }] },
  { level: 12, name: 'Crystal Maze', theme: 'alien', world: 3, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 16, hpScale: 11.0, segments: [{ enemyKey: 'drone', count: 35, spawnInterval: 0.8 }, { enemyKey: 'swarm', count: 18, spawnInterval: 2.2 }, { enemyKey: 'brute', count: 15, spawnInterval: 1.8 }, { enemyKey: 'shielded', count: 20, spawnInterval: 1.6 }, { enemyKey: 'skitter', count: 30, spawnInterval: 0.6 }] },
  { level: 13, name: 'Spore Fields', theme: 'alien', world: 3, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 16, hpScale: 13.0, segments: [{ enemyKey: 'swarm', count: 20, spawnInterval: 2.0 }, { enemyKey: 'drone', count: 40, spawnInterval: 0.7 }, { enemyKey: 'brute', count: 18, spawnInterval: 1.6 }, { enemyKey: 'shielded', count: 22, spawnInterval: 1.5 }, { enemyKey: 'swarm', count: 15, spawnInterval: 1.8 }] },
  { level: 14, name: 'Mothership Shadow', theme: 'alien', world: 3, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 18, hpScale: 16.0, segments: [{ enemyKey: 'drone', count: 40, spawnInterval: 0.7 }, { enemyKey: 'swarm', count: 22, spawnInterval: 1.8 }, { enemyKey: 'brute', count: 20, spawnInterval: 1.5 }, { enemyKey: 'shielded', count: 25, spawnInterval: 1.4 }, { enemyKey: 'skitter', count: 35, spawnInterval: 0.5 }, { enemyKey: 'swarm', count: 18, spawnInterval: 1.6 }] },
  { level: 15, name: 'Last Stand', theme: 'alien', world: 3, startingCredits: 150, passiveIncomeRate: 2, lives: 10, buildSlots: 20, hpScale: 20.0, segments: [{ enemyKey: 'drone', count: 50, spawnInterval: 0.6 }, { enemyKey: 'swarm', count: 25, spawnInterval: 1.5 }, { enemyKey: 'brute', count: 25, spawnInterval: 1.3 }, { enemyKey: 'shielded', count: 30, spawnInterval: 1.2 }, { enemyKey: 'skitter', count: 40, spawnInterval: 0.5 }, { enemyKey: 'swarm', count: 20, spawnInterval: 1.4 }, { enemyKey: 'brute', count: 20, spawnInterval: 1.2 }, { enemyKey: 'shielded', count: 25, spawnInterval: 1.0 }] },
];
