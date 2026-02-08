import Phaser from 'phaser';
import { TOWERS, TowerConfig } from '../config/towers';
import { LevelConfig } from '../config/levels';

export interface EconomyStats {
  totalEarned: number;
  totalSpent: number;
  totalFromKills: number;
  totalFromPassive: number;
}

/**
 * EconomyManager handles all credit-related operations for a level.
 *
 * Responsibilities:
 * - Tracking the player's current credit balance
 * - Applying passive income each frame (with fractional accumulation)
 * - Validating and executing tower purchases, upgrades, and sales
 * - Emitting 'credits-changed' events for UI synchronization
 * - Tracking statistics for end-of-level summary
 *
 * Fractional passive income handling:
 *   passiveIncomeRate is in credits/second. Each update() call accumulates
 *   (rate * delta/1000) into a fractional accumulator. Only whole credits
 *   are transferred to the balance, keeping sub-credit precision intact.
 */
export class EconomyManager extends Phaser.Events.EventEmitter {
  private credits: number;
  private passiveIncomeRate: number;
  private fractionalAccumulator: number = 0;

  // Stats tracking
  private totalEarned: number = 0;
  private totalSpent: number = 0;
  private totalFromKills: number = 0;
  private totalFromPassive: number = 0;

  constructor(levelConfig: LevelConfig) {
    super();
    this.credits = levelConfig.startingCredits;
    this.passiveIncomeRate = levelConfig.passiveIncomeRate;
    this.totalEarned = levelConfig.startingCredits;
  }

  /**
   * Returns the player's current credit balance.
   */
  getCredits(): number {
    return this.credits;
  }

  /**
   * Adds credits to the player's balance.
   * Used for kill rewards, bonuses, or any external credit source.
   */
  addCredits(amount: number): void {
    if (amount <= 0) return;
    this.credits += amount;
    this.totalEarned += amount;
    this.totalFromKills += amount;
    this.emit('credits-changed', this.credits);
  }

  /**
   * Deducts credits from the player's balance.
   * Returns false if the player has insufficient credits (balance unchanged).
   */
  spendCredits(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.totalSpent += amount;
    this.emit('credits-changed', this.credits);
    return true;
  }

  /**
   * Returns whether the player can afford the given amount.
   */
  canAfford(amount: number): boolean {
    return this.credits >= amount;
  }

  /**
   * Applies passive income based on elapsed time.
   * Call this from the scene's update loop, passing the Phaser delta (ms).
   *
   * Fractional credits are accumulated internally; only whole credits
   * are added to the balance to avoid floating-point display issues.
   */
  update(delta: number): void {
    if (this.passiveIncomeRate <= 0) return;

    this.fractionalAccumulator += this.passiveIncomeRate * (delta / 1000);

    if (this.fractionalAccumulator >= 1) {
      const wholeCredits = Math.floor(this.fractionalAccumulator);
      this.fractionalAccumulator -= wholeCredits;
      this.credits += wholeCredits;
      this.totalEarned += wholeCredits;
      this.totalFromPassive += wholeCredits;
      this.emit('credits-changed', this.credits);
    }
  }

  /**
   * Returns a tower config by key, or undefined if not found.
   */
  private getTowerConfig(towerKey: string): TowerConfig | undefined {
    return TOWERS[towerKey];
  }

  /**
   * Checks if the player can afford to buy the given tower type.
   */
  canBuyTower(towerKey: string): boolean {
    const tower = this.getTowerConfig(towerKey);
    if (!tower) return false;
    return this.canAfford(tower.baseCost);
  }

  /**
   * Attempts to buy a tower. Deducts the base cost and returns true,
   * or returns false if the tower key is invalid or credits are insufficient.
   */
  buyTower(towerKey: string): boolean {
    const tower = this.getTowerConfig(towerKey);
    if (!tower) return false;
    return this.spendCredits(tower.baseCost);
  }

  /**
   * Checks if the player can afford to upgrade the tower to the next tier.
   *
   * currentTier is 1-indexed:
   *   - Tier 1 -> upgrade to Tier 2: cost = upgradeCosts[0]
   *   - Tier 2 -> upgrade to Tier 3: cost = upgradeCosts[1]
   *   - Tier 3: max tier, cannot upgrade
   */
  canUpgradeTower(towerKey: string, currentTier: number): boolean {
    const tower = this.getTowerConfig(towerKey);
    if (!tower) return false;
    if (currentTier < 1 || currentTier >= 3) return false;
    const upgradeCost = tower.upgradeCosts[currentTier - 1];
    return this.canAfford(upgradeCost);
  }

  /**
   * Attempts to upgrade a tower. Deducts the upgrade cost and returns true,
   * or returns false if the upgrade is not possible.
   */
  upgradeTower(towerKey: string, currentTier: number): boolean {
    const tower = this.getTowerConfig(towerKey);
    if (!tower) return false;
    if (currentTier < 1 || currentTier >= 3) return false;
    const upgradeCost = tower.upgradeCosts[currentTier - 1];
    return this.spendCredits(upgradeCost);
  }

  /**
   * Sells a tower and adds the refund to the player's balance.
   *
   * Refund = (baseCost + sum of upgrade costs paid so far) * sellRefundRate
   *
   * currentTier is 1-indexed:
   *   - Tier 1: refund based on baseCost only
   *   - Tier 2: refund based on baseCost + upgradeCosts[0]
   *   - Tier 3: refund based on baseCost + upgradeCosts[0] + upgradeCosts[1]
   */
  sellTower(towerKey: string, currentTier: number): number {
    const tower = this.getTowerConfig(towerKey);
    if (!tower) return 0;

    let totalInvested = tower.baseCost;
    for (let i = 0; i < currentTier - 1; i++) {
      totalInvested += tower.upgradeCosts[i];
    }

    const refund = Math.floor(totalInvested * tower.sellRefundRate);
    this.credits += refund;
    this.totalEarned += refund;
    this.emit('credits-changed', this.credits);
    return refund;
  }

  /**
   * Returns aggregate statistics for the current level session.
   * Useful for end-of-level summary screens.
   */
  getStats(): EconomyStats {
    return {
      totalEarned: this.totalEarned,
      totalSpent: this.totalSpent,
      totalFromKills: this.totalFromKills,
      totalFromPassive: this.totalFromPassive,
    };
  }
}
