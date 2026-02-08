export interface WaveSegment {
  enemyKey: string;
  count: number;
  spawnInterval: number; // seconds between spawns
}

export interface LevelConfig {
  level: number;
  name: string;
  theme: string;
  startingCredits: number;
  passiveIncomeRate: number; // credits per second
  lives: number;
  buildSlots: number;
  segments: WaveSegment[]; // continuous trickle segments played in sequence
  hpScale: number; // multiplier on enemy base HP for this level
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Desert Outpost',
    theme: 'desert',
    startingCredits: 200,
    passiveIncomeRate: 5,
    lives: 10,
    buildSlots: 8,
    hpScale: 1.0,
    segments: [
      { enemyKey: 'drone', count: 15, spawnInterval: 2.0 },
      { enemyKey: 'drone', count: 10, spawnInterval: 1.5 },
    ],
  },
  {
    level: 2,
    name: 'Coastal Base',
    theme: 'coastal',
    startingCredits: 200,
    passiveIncomeRate: 5,
    lives: 10,
    buildSlots: 10,
    hpScale: 1.2,
    segments: [
      { enemyKey: 'drone', count: 10, spawnInterval: 2.0 },
      { enemyKey: 'skitter', count: 8, spawnInterval: 1.2 },
      { enemyKey: 'drone', count: 10, spawnInterval: 1.5 },
      { enemyKey: 'skitter', count: 12, spawnInterval: 1.0 },
    ],
  },
  {
    level: 3,
    name: 'Mountain Pass',
    theme: 'mountain',
    startingCredits: 200,
    passiveIncomeRate: 5,
    lives: 10,
    buildSlots: 12,
    hpScale: 1.5,
    segments: [
      { enemyKey: 'drone', count: 10, spawnInterval: 1.8 },
      { enemyKey: 'skitter', count: 6, spawnInterval: 1.2 },
      { enemyKey: 'brute', count: 4, spawnInterval: 4.0 },
      { enemyKey: 'drone', count: 15, spawnInterval: 1.2 },
      { enemyKey: 'brute', count: 6, spawnInterval: 3.0 },
    ],
  },
  {
    level: 4,
    name: 'Urban Ruins',
    theme: 'urban',
    startingCredits: 200,
    passiveIncomeRate: 5,
    lives: 10,
    buildSlots: 14,
    hpScale: 1.8,
    segments: [
      { enemyKey: 'drone', count: 8, spawnInterval: 1.5 },
      { enemyKey: 'shielded', count: 5, spawnInterval: 3.0 },
      { enemyKey: 'skitter', count: 10, spawnInterval: 1.0 },
      { enemyKey: 'brute', count: 4, spawnInterval: 3.5 },
      { enemyKey: 'shielded', count: 8, spawnInterval: 2.5 },
      { enemyKey: 'drone', count: 15, spawnInterval: 1.0 },
    ],
  },
  {
    level: 5,
    name: 'Mothership Approach',
    theme: 'mothership',
    startingCredits: 200,
    passiveIncomeRate: 5,
    lives: 10,
    buildSlots: 16,
    hpScale: 2.0,
    segments: [
      { enemyKey: 'drone', count: 10, spawnInterval: 1.5 },
      { enemyKey: 'skitter', count: 8, spawnInterval: 1.0 },
      { enemyKey: 'brute', count: 5, spawnInterval: 3.0 },
      { enemyKey: 'shielded', count: 6, spawnInterval: 2.5 },
      { enemyKey: 'swarm', count: 8, spawnInterval: 3.0 },
      { enemyKey: 'brute', count: 4, spawnInterval: 2.5 },
      { enemyKey: 'shielded', count: 5, spawnInterval: 2.0 },
      { enemyKey: 'swarm', count: 6, spawnInterval: 2.5 },
      { enemyKey: 'drone', count: 20, spawnInterval: 0.8 },
    ],
  },
];
