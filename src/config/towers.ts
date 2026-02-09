export interface TowerTier {
  damage: number;
  range: number;
  fireRate: number; // shots per second
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface TowerConfig {
  key: string;
  name: string;
  description: string;
  baseCost: number;
  upgradeCosts: [number, number]; // tier 2, tier 3
  sellRefundRate: number;
  tiers: [TowerTier, TowerTier, TowerTier];
  projectileSpeed: number;
  color: string; // placeholder color until sprites
}

export const TOWERS: Record<string, TowerConfig> = {
  laser: {
    key: 'laser',
    name: 'Laser Turret',
    description: 'Rapid-pulse energy weapon. Fast fire rate, low damage.',
    baseCost: 50,
    upgradeCosts: [75, 100],
    sellRefundRate: 0.5,
    projectileSpeed: 600,
    color: '#00ff88',
    tiers: [
      { damage: 8, range: 120, fireRate: 4 },
      { damage: 12, range: 140, fireRate: 5 },
      { damage: 18, range: 160, fireRate: 6 },
    ],
  },
  missile: {
    key: 'missile',
    name: 'Missile Battery',
    description: 'Guided plasma warheads. Slow but devastating with splash damage.',
    baseCost: 75,
    upgradeCosts: [112, 150],
    sellRefundRate: 0.5,
    projectileSpeed: 300,
    color: '#ff6644',
    tiers: [
      { damage: 30, range: 140, fireRate: 0.8, splashRadius: 50 },
      { damage: 45, range: 160, fireRate: 1.0, splashRadius: 60 },
      { damage: 65, range: 180, fireRate: 1.2, splashRadius: 75 },
    ],
  },
  cryo: {
    key: 'cryo',
    name: 'Cryo Emitter',
    description: 'Freezing field generator. Slows enemies, minimal damage.',
    baseCost: 60,
    upgradeCosts: [90, 120],
    sellRefundRate: 0.5,
    projectileSpeed: 0, // area effect, no projectile
    color: '#44ccff',
    tiers: [
      { damage: 3, range: 100, fireRate: 2, slowFactor: 0.5, slowDuration: 2 },
      { damage: 5, range: 120, fireRate: 2.5, slowFactor: 0.4, slowDuration: 2.5 },
      { damage: 8, range: 140, fireRate: 3, slowFactor: 0.3, slowDuration: 3 },
    ],
  },
  railgun: {
    key: 'railgun',
    name: 'Rail Gun',
    description: 'Electromagnetic accelerator. Extreme range and damage, very slow.',
    baseCost: 100,
    upgradeCosts: [150, 200],
    sellRefundRate: 0.5,
    projectileSpeed: 900,
    color: '#ffcc00',
    tiers: [
      { damage: 60, range: 200, fireRate: 0.4 },
      { damage: 90, range: 240, fireRate: 0.5 },
      { damage: 130, range: 280, fireRate: 0.6 },
    ],
  },
  pulse: {
    key: 'pulse',
    name: 'Pulse Cannon',
    description: 'Shockwave emitter. Hits all enemies in radius.',
    baseCost: 150,
    upgradeCosts: [150, 200],
    sellRefundRate: 0.5,
    projectileSpeed: 0, // area effect
    color: '#cc44ff',
    tiers: [
      { damage: 15, range: 110, fireRate: 1.5, splashRadius: 110 },
      { damage: 22, range: 130, fireRate: 1.8, splashRadius: 130 },
      { damage: 32, range: 150, fireRate: 2.0, splashRadius: 150 },
    ],
  },
};
