export interface EnemyConfig {
  key: string;
  name: string;
  description: string;
  baseHp: number;
  speed: number; // pixels per second
  reward: number; // credits on kill
  color: string; // placeholder color until sprites
  special?: {
    type: 'shield' | 'split' | 'none';
    shieldPercent?: number; // fraction of HP absorbed by shield
    shieldRegenDelay?: number; // seconds before shield regenerates
    splitCount?: number;
    splitEnemyKey?: string;
  };
}

export const ENEMIES: Record<string, EnemyConfig> = {
  drone: {
    key: 'drone',
    name: 'Drone',
    description: 'Small hovering alien scouts. Cheap, numerous.',
    baseHp: 65,
    speed: 60,
    reward: 10,
    color: '#88ff88',
  },
  skitter: {
    key: 'skitter',
    name: 'Skitter',
    description: 'Insectoid runner. Extremely fast, fragile.',
    baseHp: 35,
    speed: 120,
    reward: 15,
    color: '#ffff44',
  },
  brute: {
    key: 'brute',
    name: 'Brute',
    description: 'Hulking armored alien. Slow but extremely tough.',
    baseHp: 320,
    speed: 30,
    reward: 30,
    color: '#ff4444',
  },
  shielded: {
    key: 'shielded',
    name: 'Shielded',
    description: 'Floating alien with energy barrier. Shield regenerates.',
    baseHp: 130,
    speed: 50,
    reward: 25,
    color: '#4488ff',
    special: {
      type: 'shield',
      shieldPercent: 0.5,
      shieldRegenDelay: 3,
    },
  },
  swarm: {
    key: 'swarm',
    name: 'Swarm Cluster',
    description: 'Organic pod that bursts into mini-drones on death.',
    baseHp: 100,
    speed: 50,
    reward: 20,
    color: '#ff88ff',
    special: {
      type: 'split',
      splitCount: 3,
      splitEnemyKey: 'mini_drone',
    },
  },
  mini_drone: {
    key: 'mini_drone',
    name: 'Mini-Drone',
    description: 'Tiny fast drone spawned from Swarm Cluster.',
    baseHp: 25,
    speed: 90,
    reward: 3,
    color: '#ccffcc',
  },
};
