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
      { enemyKey: 'drone', count: 30, spawnInterval: 2.0 },
      { enemyKey: 'drone', count: 20, spawnInterval: 1.5 },
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
      { enemyKey: 'drone', count: 20, spawnInterval: 2.0 },
      { enemyKey: 'skitter', count: 16, spawnInterval: 1.2 },
      { enemyKey: 'drone', count: 20, spawnInterval: 1.5 },
      { enemyKey: 'skitter', count: 24, spawnInterval: 1.0 },
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
      { enemyKey: 'drone', count: 20, spawnInterval: 1.8 },
      { enemyKey: 'skitter', count: 12, spawnInterval: 1.2 },
      { enemyKey: 'brute', count: 8, spawnInterval: 4.0 },
      { enemyKey: 'drone', count: 30, spawnInterval: 1.2 },
      { enemyKey: 'brute', count: 12, spawnInterval: 3.0 },
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
      { enemyKey: 'drone', count: 16, spawnInterval: 1.5 },
      { enemyKey: 'shielded', count: 10, spawnInterval: 3.0 },
      { enemyKey: 'skitter', count: 20, spawnInterval: 1.0 },
      { enemyKey: 'brute', count: 8, spawnInterval: 3.5 },
      { enemyKey: 'shielded', count: 16, spawnInterval: 2.5 },
      { enemyKey: 'drone', count: 30, spawnInterval: 1.0 },
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
      { enemyKey: 'drone', count: 20, spawnInterval: 1.5 },
      { enemyKey: 'skitter', count: 16, spawnInterval: 1.0 },
      { enemyKey: 'brute', count: 10, spawnInterval: 3.0 },
      { enemyKey: 'shielded', count: 12, spawnInterval: 2.5 },
      { enemyKey: 'swarm', count: 16, spawnInterval: 3.0 },
      { enemyKey: 'brute', count: 8, spawnInterval: 2.5 },
      { enemyKey: 'shielded', count: 10, spawnInterval: 2.0 },
      { enemyKey: 'swarm', count: 12, spawnInterval: 2.5 },
      { enemyKey: 'drone', count: 40, spawnInterval: 0.8 },
    ],
  },
];
