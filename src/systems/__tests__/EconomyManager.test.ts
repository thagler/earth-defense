import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EconomyManager } from '../EconomyManager';
import { LevelConfig } from '../../config/levels';
import { TOWERS } from '../../config/towers';

/**
 * Test suite for EconomyManager.
 *
 * These tests validate the full economy lifecycle: initialization,
 * passive income accumulation, tower purchasing/upgrading/selling,
 * edge cases, event emissions, and stats tracking.
 */

// Minimal LevelConfig fixture for testing.
// Only economy-relevant fields are populated; others are set to defaults.
function createTestLevel(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    level: 1,
    name: 'Test Level',
    theme: 'test',
    world: 1,
    startingCredits: 150,
    passiveIncomeRate: 2,
    lives: 10,
    buildSlots: 8,
    hpScale: 1.0,
    segments: [],
    ...overrides,
  };
}

describe('EconomyManager', () => {
  let economy: EconomyManager;
  let level: LevelConfig;

  beforeEach(() => {
    level = createTestLevel();
    economy = new EconomyManager(level);
  });

  // ──────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────

  describe('initialization', () => {
    it('should start with startingCredits from level config', () => {
      expect(economy.getCredits()).toBe(150);
    });

    it('should start with correct credits for different level configs', () => {
      const richLevel = createTestLevel({ startingCredits: 500 });
      const richEconomy = new EconomyManager(richLevel);
      expect(richEconomy.getCredits()).toBe(500);
    });

    it('should initialize stats with startingCredits as totalEarned', () => {
      const stats = economy.getStats();
      expect(stats.totalEarned).toBe(150);
      expect(stats.totalSpent).toBe(0);
      expect(stats.totalFromKills).toBe(0);
      expect(stats.totalFromPassive).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // Basic credit operations
  // ──────────────────────────────────────────────

  describe('addCredits', () => {
    it('should add credits to the balance', () => {
      economy.addCredits(50);
      expect(economy.getCredits()).toBe(200);
    });

    it('should ignore zero or negative amounts', () => {
      economy.addCredits(0);
      expect(economy.getCredits()).toBe(150);
      economy.addCredits(-10);
      expect(economy.getCredits()).toBe(150);
    });

    it('should track added credits in totalFromKills', () => {
      economy.addCredits(30);
      economy.addCredits(20);
      const stats = economy.getStats();
      expect(stats.totalFromKills).toBe(50);
    });
  });

  describe('spendCredits', () => {
    it('should deduct credits and return true on success', () => {
      const result = economy.spendCredits(50);
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(100);
    });

    it('should return false and not deduct when insufficient', () => {
      const result = economy.spendCredits(300);
      expect(result).toBe(false);
      expect(economy.getCredits()).toBe(150);
    });

    it('should allow spending exact balance', () => {
      const result = economy.spendCredits(150);
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(0);
    });

    it('should track spending in totalSpent', () => {
      economy.spendCredits(30);
      economy.spendCredits(20);
      expect(economy.getStats().totalSpent).toBe(50);
    });

    it('should handle zero amount gracefully', () => {
      const result = economy.spendCredits(0);
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(150);
    });
  });

  describe('canAfford', () => {
    it('should return true when credits are sufficient', () => {
      expect(economy.canAfford(100)).toBe(true);
    });

    it('should return true for exact balance', () => {
      expect(economy.canAfford(150)).toBe(true);
    });

    it('should return false when credits are insufficient', () => {
      expect(economy.canAfford(151)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Passive income
  // ──────────────────────────────────────────────

  describe('passive income (update)', () => {
    it('should accumulate passive income over time', () => {
      // 2 credits/sec * 1 second = 2 credits
      economy.update(1000);
      expect(economy.getCredits()).toBe(152);
    });

    it('should handle fractional accumulation correctly', () => {
      // 2 credits/sec * 16ms = 0.032 credits per tick
      // After 31 ticks: 0.032 * 31 = 0.992 -- not yet 1 whole credit
      for (let i = 0; i < 31; i++) {
        economy.update(16);
      }
      expect(economy.getCredits()).toBe(150); // No whole credit yet

      // 32nd tick: 0.032 * 32 = 1.024 -- 1 whole credit added
      economy.update(16);
      expect(economy.getCredits()).toBe(151);
    });

    it('should accumulate multiple whole credits from larger deltas', () => {
      // 2 credits/sec * 1000ms = 2 credits
      economy.update(1000);
      expect(economy.getCredits()).toBe(152);
    });

    it('should not lose fractional credits between updates', () => {
      // 2 credits/sec, delta = 1000ms => 2 credits per tick
      // Tick 1: +2
      economy.update(1000);
      expect(economy.getCredits()).toBe(152);

      // Tick 2: +2
      economy.update(1000);
      expect(economy.getCredits()).toBe(154);
    });

    it('should do nothing with zero passive income rate', () => {
      const noIncomeLevel = createTestLevel({ passiveIncomeRate: 0 });
      const noIncomeEconomy = new EconomyManager(noIncomeLevel);
      noIncomeEconomy.update(5000);
      expect(noIncomeEconomy.getCredits()).toBe(150);
    });

    it('should track passive income in stats separately from kill credits', () => {
      economy.update(1000); // +2 from passive
      economy.addCredits(10); // +10 from kills

      const stats = economy.getStats();
      expect(stats.totalFromPassive).toBe(2);
      expect(stats.totalFromKills).toBe(10);
    });

    it('should accumulate correctly over many small ticks', () => {
      // Simulate 1 second at ~60fps (16.67ms per frame)
      // 2 credits/sec * 1 sec = 2 credits expected
      for (let i = 0; i < 60; i++) {
        economy.update(16.6667);
      }
      // 60 * 16.6667 = 1000.002ms => 2.00001 credits
      // Should have added 2 whole credits
      expect(economy.getCredits()).toBe(152);
    });
  });

  // ──────────────────────────────────────────────
  // Tower buying
  // ──────────────────────────────────────────────

  describe('canBuyTower / buyTower', () => {
    it('should allow buying a tower when credits are sufficient', () => {
      // Laser costs 50
      expect(economy.canBuyTower('laser')).toBe(true);
      const result = economy.buyTower('laser');
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(100);
    });

    it('should deny buying when credits are insufficient', () => {
      // Railgun costs 100; spend down to 50 first
      economy.spendCredits(110);
      expect(economy.getCredits()).toBe(40);
      expect(economy.canBuyTower('railgun')).toBe(false);
      const result = economy.buyTower('railgun');
      expect(result).toBe(false);
      expect(economy.getCredits()).toBe(40);
    });

    it('should deduct the correct cost for each tower type', () => {
      // Buy each tower type and verify the deduction
      const laserCost = TOWERS['laser'].baseCost; // 50
      const missileCost = TOWERS['missile'].baseCost; // 75

      economy.buyTower('laser');
      expect(economy.getCredits()).toBe(150 - laserCost);

      economy.buyTower('missile');
      expect(economy.getCredits()).toBe(150 - laserCost - missileCost);
    });

    it('should return false for an invalid tower key', () => {
      expect(economy.canBuyTower('nonexistent')).toBe(false);
      expect(economy.buyTower('nonexistent')).toBe(false);
      expect(economy.getCredits()).toBe(150); // unchanged
    });

    it('should allow buying a tower with exactly enough credits', () => {
      // Set credits to exactly 50 (laser cost)
      economy.spendCredits(100);
      expect(economy.getCredits()).toBe(50);
      expect(economy.canBuyTower('laser')).toBe(true);
      expect(economy.buyTower('laser')).toBe(true);
      expect(economy.getCredits()).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // Tower upgrading
  // ──────────────────────────────────────────────

  describe('canUpgradeTower / upgradeTower', () => {
    it('should allow upgrading from tier 1 to tier 2', () => {
      // Laser tier 2 upgrade costs 75
      expect(economy.canUpgradeTower('laser', 1)).toBe(true);
      const result = economy.upgradeTower('laser', 1);
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(150 - 75);
    });

    it('should allow upgrading from tier 2 to tier 3', () => {
      // Laser tier 3 upgrade costs 100
      expect(economy.canUpgradeTower('laser', 2)).toBe(true);
      const result = economy.upgradeTower('laser', 2);
      expect(result).toBe(true);
      expect(economy.getCredits()).toBe(150 - 100);
    });

    it('should not allow upgrading past tier 3', () => {
      expect(economy.canUpgradeTower('laser', 3)).toBe(false);
      const result = economy.upgradeTower('laser', 3);
      expect(result).toBe(false);
      expect(economy.getCredits()).toBe(150); // unchanged
    });

    it('should deny upgrade when credits are insufficient', () => {
      // Railgun tier 2 costs 140; start with 150, spend 100 first
      economy.spendCredits(100);
      expect(economy.canUpgradeTower('railgun', 1)).toBe(false);
      const result = economy.upgradeTower('railgun', 1);
      expect(result).toBe(false);
      expect(economy.getCredits()).toBe(50);
    });

    it('should return false for invalid tower key', () => {
      expect(economy.canUpgradeTower('nonexistent', 1)).toBe(false);
      expect(economy.upgradeTower('nonexistent', 1)).toBe(false);
    });

    it('should return false for invalid tier values', () => {
      expect(economy.canUpgradeTower('laser', 0)).toBe(false);
      expect(economy.canUpgradeTower('laser', -1)).toBe(false);
      expect(economy.canUpgradeTower('laser', 4)).toBe(false);
      expect(economy.upgradeTower('laser', 0)).toBe(false);
    });

    it('should deduct the correct upgrade cost for each tower', () => {
      // Missile tier 2: upgradeCosts[0] = 105
      economy.upgradeTower('missile', 1);
      expect(economy.getCredits()).toBe(150 - 105);
    });
  });

  // ──────────────────────────────────────────────
  // Tower selling
  // ──────────────────────────────────────────────

  describe('sellTower', () => {
    it('should refund 40% of base cost for tier 1 tower', () => {
      // Laser: baseCost 50, sellRefundRate 0.4
      // Refund = 50 * 0.4 = 20
      economy.buyTower('laser'); // 150 - 50 = 100
      const refund = economy.sellTower('laser', 1);
      expect(refund).toBe(20);
      expect(economy.getCredits()).toBe(120);
    });

    it('should refund 40% of total invested for tier 2 tower', () => {
      // Laser: baseCost 50 + upgradeCost[0] 75 = 125 invested
      // Refund = 125 * 0.4 = 50 (floored)
      economy.buyTower('laser'); // 150 - 50 = 100
      economy.upgradeTower('laser', 1); // 100 - 75 = 25
      const refund = economy.sellTower('laser', 2);
      expect(refund).toBe(50); // floor(125 * 0.4) = 50
      expect(economy.getCredits()).toBe(25 + 50);
    });

    it('should refund 40% of total invested for tier 3 tower', () => {
      // Laser: baseCost 50 + upgrade[0] 75 + upgrade[1] 100 = 225 invested
      // Refund = 225 * 0.4 = 90 (floored)
      economy.addCredits(100); // 250 total for buying+upgrading
      economy.buyTower('laser'); // 250 - 50 = 200
      economy.upgradeTower('laser', 1); // 200 - 75 = 125
      economy.upgradeTower('laser', 2); // 125 - 100 = 25
      const refund = economy.sellTower('laser', 3);
      expect(refund).toBe(90); // floor(225 * 0.4)
      expect(economy.getCredits()).toBe(25 + 90);
    });

    it('should handle missile tower sell at tier 3 correctly', () => {
      // Missile: baseCost 75 + upgrade[0] 105 + upgrade[1] 120 = 300 invested
      // Refund = 300 * 0.4 = 120 (floored)
      economy.addCredits(200); // 350 total
      economy.buyTower('missile'); // 350 - 75 = 275
      economy.upgradeTower('missile', 1); // 275 - 105 = 170
      economy.upgradeTower('missile', 2); // 170 - 120 = 50
      const refund = economy.sellTower('missile', 3);
      expect(refund).toBe(120); // floor(300 * 0.4)
      expect(economy.getCredits()).toBe(50 + 120);
    });

    it('should return 0 for invalid tower key', () => {
      const refund = economy.sellTower('nonexistent', 1);
      expect(refund).toBe(0);
      expect(economy.getCredits()).toBe(150);
    });
  });

  // ──────────────────────────────────────────────
  // Credits cannot go negative
  // ──────────────────────────────────────────────

  describe('credits cannot go negative', () => {
    it('should never allow credits to drop below zero via spendCredits', () => {
      economy.spendCredits(151);
      expect(economy.getCredits()).toBe(150);
    });

    it('should never allow credits to drop below zero via buyTower', () => {
      economy.spendCredits(145); // down to 5
      economy.buyTower('laser'); // costs 50
      expect(economy.getCredits()).toBe(5);
    });

    it('should never allow credits to drop below zero via upgradeTower', () => {
      economy.spendCredits(145); // down to 5
      economy.upgradeTower('laser', 1); // costs 75
      expect(economy.getCredits()).toBe(5);
    });
  });

  // ──────────────────────────────────────────────
  // Stats tracking
  // ──────────────────────────────────────────────

  describe('stats tracking', () => {
    it('should track all economy activity accurately', () => {
      // Start: 150 credits (totalEarned = 150)
      economy.addCredits(50); // Kill reward: totalEarned=200, totalFromKills=50
      economy.update(1000); // Passive: +2, totalEarned=202, totalFromPassive=2
      economy.buyTower('laser'); // Spend 50: totalSpent=50
      economy.upgradeTower('laser', 1); // Spend 75: totalSpent=125
      economy.sellTower('laser', 2); // Refund 50: totalEarned=252

      const stats = economy.getStats();
      expect(stats.totalEarned).toBe(150 + 50 + 2 + 50); // 252
      expect(stats.totalSpent).toBe(50 + 75); // 125
      expect(stats.totalFromKills).toBe(50);
      expect(stats.totalFromPassive).toBe(2);
    });

    it('should not count failed purchases in stats', () => {
      economy.spendCredits(150); // spend all
      economy.buyTower('laser'); // should fail
      const stats = economy.getStats();
      expect(stats.totalSpent).toBe(150);
    });
  });

  // ──────────────────────────────────────────────
  // Event emission
  // ──────────────────────────────────────────────

  describe('credits-changed event', () => {
    it('should fire when credits are added', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.addCredits(10);
      expect(handler).toHaveBeenCalledWith(160);
    });

    it('should fire when credits are spent', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.spendCredits(10);
      expect(handler).toHaveBeenCalledWith(140);
    });

    it('should NOT fire when spending fails', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.spendCredits(999);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should fire when passive income adds whole credits', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.update(1000); // adds 2 credits
      expect(handler).toHaveBeenCalledWith(152);
    });

    it('should NOT fire when passive income is still fractional', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      // 2 credits/sec * 16ms = 0.032, no whole credit yet
      economy.update(16);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should fire when a tower is bought', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.buyTower('laser');
      expect(handler).toHaveBeenCalledWith(100);
    });

    it('should fire when a tower is sold', () => {
      economy.buyTower('laser'); // 150 - 50 = 100
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.sellTower('laser', 1); // +20 = 120
      expect(handler).toHaveBeenCalledWith(120);
    });

    it('should fire when a tower is upgraded', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.upgradeTower('laser', 1); // 150 - 75 = 75
      expect(handler).toHaveBeenCalledWith(75);
    });

    it('should NOT fire for zero addCredits', () => {
      const handler = vi.fn();
      economy.on('credits-changed', handler);
      economy.addCredits(0);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // Integration / complex scenarios
  // ──────────────────────────────────────────────

  describe('complex scenarios', () => {
    it('should handle a full game cycle: earn, buy, upgrade, sell', () => {
      // Start with 150
      economy.addCredits(100); // Kill rewards -> 250
      economy.update(2000); // 2 sec passive -> +4 -> 254

      economy.buyTower('cryo'); // -50 -> 204
      expect(economy.getCredits()).toBe(204);

      economy.upgradeTower('cryo', 1); // -70 -> 134
      expect(economy.getCredits()).toBe(134);

      // Sell cryo at tier 2: (50 + 70) * 0.4 = 48
      const refund = economy.sellTower('cryo', 2);
      expect(refund).toBe(48);
      expect(economy.getCredits()).toBe(182);
    });

    it('should handle buying multiple towers in sequence', () => {
      economy.buyTower('laser'); // -50 -> 100
      economy.buyTower('laser'); // -50 -> 50
      economy.buyTower('cryo'); // -50 -> 0
      expect(economy.getCredits()).toBe(0);

      // Cannot afford another cryo
      expect(economy.canBuyTower('cryo')).toBe(false);
      // Cannot afford a laser either
      expect(economy.canBuyTower('laser')).toBe(false);
    });

    it('should handle all five tower types', () => {
      const towerKeys = Object.keys(TOWERS);
      expect(towerKeys).toContain('laser');
      expect(towerKeys).toContain('missile');
      expect(towerKeys).toContain('cryo');
      expect(towerKeys).toContain('railgun');
      expect(towerKeys).toContain('pulse');

      // Verify canBuyTower works for all tower types
      for (const key of towerKeys) {
        const canBuy = economy.canBuyTower(key);
        expect(canBuy).toBe(economy.getCredits() >= TOWERS[key].baseCost);
      }
    });
  });
});
