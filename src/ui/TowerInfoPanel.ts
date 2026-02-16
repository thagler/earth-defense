import Phaser from 'phaser';
import { Tower, UPGRADE_KILLS_REQUIRED } from '../entities/Tower';
import { TowerTier, TOWERS } from '../config/towers';
import { SoundManager } from '../systems/SoundManager';
import { getEffectiveRange } from '../utils/elevation';

/**
 * TowerInfoPanel -- Floating info/action panel for a placed tower.
 *
 * Shown when the player clicks a placed tower. Displays the tower's current
 * stats, and provides Upgrade, Sell, and Close buttons.
 *
 * Emits:
 *   'upgrade-requested' { tower: Tower }
 *   'sell-requested'    { tower: Tower }
 *
 * Depth is 1001 (above HUD at 1000).
 */
export class TowerInfoPanel extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private currentTower: Tower | null = null;

  // ---- Click-away listener reference ----
  private clickAwayHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  // ---- Interactive elements tracking ----
  // Interactive elements must be placed directly on scene with scrollFactor(0)
  // instead of as container children to work correctly when camera is scrolled
  private interactiveElements: Phaser.GameObjects.GameObject[] = [];

  // ---- Style constants ----
  private static readonly FONT_FAMILY = 'monospace';
  private static readonly LABEL_COLOR = '#00ffcc';
  private static readonly VALUE_COLOR = '#ffffff';
  private static readonly DIMMED_COLOR = '#666666';
  private static readonly BG_COLOR = 0x1a1a2e;
  private static readonly BG_ALPHA = 0.95;
  private static readonly PANEL_WIDTH = 200;
  private static readonly PANEL_HEIGHT = 260;
  private static readonly DEPTH = 1001;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Show the info panel for the given tower.
   *
   * @param tower            - The Tower entity to display info for.
   * @param canAffordUpgrade - Whether the player can afford the next upgrade.
   *                           Defaults to true when not provided (the upgrade
   *                           button will still be disabled at max tier).
   */
  show(tower: Tower, canAffordUpgrade?: boolean): void {
    // Default to true -- the button is self-disabling at max tier anyway
    if (canAffordUpgrade === undefined) {
      canAffordUpgrade = true;
    }
    // If already showing for this tower, just refresh
    this.hide();

    this.currentTower = tower;
    const config = tower.config;
    const tier: TowerTier = tower.getCurrentTierStats();
    const tierNum = tower.currentTier;

    // ---- Calculate panel position (offset to stay on screen) ----
    // Convert tower world position to screen coordinates (container is in screen space)
    const camera = this.scene.cameras.main;
    const screenX = tower.x - camera.scrollX;
    const screenY = tower.y - camera.scrollY;
    const panelW = TowerInfoPanel.PANEL_WIDTH;
    const panelH = TowerInfoPanel.PANEL_HEIGHT;
    let px = screenX + 50;
    let py = screenY - panelH / 2;

    // Keep panel within canvas bounds (1024x768)
    if (px + panelW / 2 > 1024) {
      px = tower.x - 50 - panelW;
    }
    if (px - panelW / 2 < 0) {
      px = panelW / 2 + 4;
    }
    if (py - panelH / 2 < 0) {
      py = panelH / 2 + 4;
    }
    if (py + panelH / 2 > 768) {
      py = 768 - panelH / 2 - 4;
    }

    this.container = this.scene.add.container(px, py);
    this.container.setScrollFactor(0);
    this.container.setDepth(TowerInfoPanel.DEPTH);

    // Increase panel height slightly to accommodate new stats
    const adjustedPanelH = panelH + 20;

    // ---- Panel background ----
    const bg = this.scene.add.rectangle(
      0,
      0,
      panelW,
      adjustedPanelH,
      TowerInfoPanel.BG_COLOR,
      TowerInfoPanel.BG_ALPHA,
    );
    bg.setStrokeStyle(2, 0x00ffcc, 0.8);
    this.container.add(bg);

    // ---- Tower name ----
    let lineY = -adjustedPanelH / 2 + 20;
    const nameText = this.scene.add.text(0, lineY, config.name, {
      fontFamily: TowerInfoPanel.FONT_FAMILY,
      fontSize: '14px',
      color: TowerInfoPanel.LABEL_COLOR,
      align: 'center',
    });
    nameText.setOrigin(0.5);
    this.container.add(nameText);

    // ---- Tier ----
    lineY += 22;
    const tierLabel = tierNum >= 3 ? 'Tier 3 (MAX)' : `Tier ${tierNum}`;
    const tierText = this.scene.add.text(0, lineY, tierLabel, {
      fontFamily: TowerInfoPanel.FONT_FAMILY,
      fontSize: '12px',
      color: TowerInfoPanel.VALUE_COLOR,
      align: 'center',
    });
    tierText.setOrigin(0.5);
    this.container.add(tierText);

    // ---- Stats ----
    lineY += 24;

    // Calculate effective range at ground level (elevation 0)
    const towerElevation = (tower as any).elevation || 0;
    const effectiveRangeAtGround = getEffectiveRange(tier.range, towerElevation, 0);

    const statsLines = [
      `DMG: ${tier.damage}`,
      `Base RNG: ${tier.range}`,
      `Eff. RNG: ${Math.round(effectiveRangeAtGround)} @ ground`,
      `ROF: ${tier.fireRate}/s`,
    ];

    // Show tower elevation if it has one
    if (towerElevation > 0) {
      statsLines.push(`Elevation: ${towerElevation}`);
    }

    // Append special stats if applicable
    if (tier.splashRadius !== undefined && tier.splashRadius > 0) {
      statsLines.push(`Splash: ${tier.splashRadius}`);
    }
    if (tier.slowFactor !== undefined) {
      statsLines.push(`Slow: ${Math.round((1 - tier.slowFactor) * 100)}%`);
    }

    // Kill count and upgrade requirement
    if (tierNum < 3) {
      const required = UPGRADE_KILLS_REQUIRED[tierNum - 1];
      statsLines.push(`Kills: ${tower.kills}/${required}`);
    } else {
      statsLines.push(`Kills: ${tower.kills}`);
    }

    for (const line of statsLines) {
      const statText = this.scene.add.text(0, lineY, line, {
        fontFamily: TowerInfoPanel.FONT_FAMILY,
        fontSize: '11px',
        color: TowerInfoPanel.VALUE_COLOR,
        align: 'center',
      });
      statText.setOrigin(0.5);
      this.container.add(statText);
      lineY += 18;
    }

    // ---- Buttons area ----
    const buttonY = adjustedPanelH / 2 - 56;

    // Upgrade button
    const isMaxTier = tierNum >= 3;
    const upgradeCost = isMaxTier ? -1 : config.upgradeCosts[tierNum - 1];
    const needsMoreKills = !isMaxTier && !tower.hasEnoughKills();
    const killsNeeded = needsMoreKills ? tower.killsUntilUpgrade() : 0;
    const upgradeLabel = isMaxTier
      ? 'MAX TIER'
      : needsMoreKills
        ? `Need ${killsNeeded} more kill${killsNeeded !== 1 ? 's' : ''}`
        : `Upgrade ($${upgradeCost})`;
    const upgradeEnabled = !isMaxTier && canAffordUpgrade && !needsMoreKills;

    this.createPanelButton(
      0,
      buttonY,
      upgradeLabel,
      upgradeEnabled,
      () => {
        if (this.currentTower) {
          this.emit('upgrade-requested', this.currentTower);
        }
      },
    );

    // Sell button
    const sellValue = tower.getSellValue();
    this.createPanelButton(
      0,
      buttonY + 32,
      `Sell ($${sellValue})`,
      true,
      () => {
        if (this.currentTower) {
          this.emit('sell-requested', this.currentTower);
          this.hide();
        }
      },
    );

    // Close button (top-right corner)
    // Place directly on scene with scrollFactor(0) for correct input handling
    const closeBgX = px + panelW / 2 - 14;
    const closeBgY = py - adjustedPanelH / 2 + 14;
    const closeBg = this.scene.add.rectangle(
      closeBgX,
      closeBgY,
      20,
      20,
      0xff4444,
      0.3,
    );
    closeBg.setStrokeStyle(1, 0xff4444, 0.6);
    closeBg.setScrollFactor(0);
    closeBg.setDepth(TowerInfoPanel.DEPTH);
    closeBg.setInteractive({ useHandCursor: true });
    this.interactiveElements.push(closeBg);

    const closeText = this.scene.add.text(closeBgX, closeBgY, 'X', {
      fontFamily: TowerInfoPanel.FONT_FAMILY,
      fontSize: '12px',
      color: '#ff4444',
    });
    closeText.setOrigin(0.5);
    closeText.setScrollFactor(0);
    closeText.setDepth(TowerInfoPanel.DEPTH);
    this.container.add(closeText);

    closeBg.on('pointerover', () => closeBg.setFillStyle(0xff4444, 0.5));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0xff4444, 0.3));
    closeBg.on('pointerdown', () => {
      const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
      sm?.play('ui-click');
      this.hide();
    });

    // ---- Click-away to dismiss ----
    // We delay attaching this handler by one frame so that the click that
    // opened the panel does not immediately close it.
    this.scene.time.delayedCall(50, () => {
      if (!this.container) return;

      this.clickAwayHandler = (pointer: Phaser.Input.Pointer) => {
        if (!this.container) return;

        // Check if click was inside the panel bounds (use screen coords since container is in screen space)
        const localX = pointer.x - this.container.x;
        const localY = pointer.y - this.container.y;

        if (
          Math.abs(localX) > panelW / 2 ||
          Math.abs(localY) > adjustedPanelH / 2
        ) {
          this.hide();
        }
      };

      this.scene.input.on('pointerdown', this.clickAwayHandler);
    });
  }

  /**
   * Hide and destroy the info panel.
   */
  hide(): void {
    if (this.clickAwayHandler) {
      this.scene.input.off('pointerdown', this.clickAwayHandler);
      this.clickAwayHandler = null;
    }

    // Clean up interactive elements
    for (const element of this.interactiveElements) {
      element.destroy();
    }
    this.interactiveElements = [];

    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }

    this.currentTower = null;
  }

  /**
   * Refresh the panel for the given tower (e.g. after an upgrade).
   * Tears down and rebuilds the panel contents.
   */
  refresh(tower: Tower, canAffordUpgrade?: boolean): void {
    if (canAffordUpgrade === undefined) {
      canAffordUpgrade = true;
    }
    this.show(tower, canAffordUpgrade);
  }

  /**
   * Returns whether the panel is currently visible.
   */
  isVisible(): boolean {
    return this.container !== null;
  }

  /**
   * Clean up everything. Call when the scene shuts down.
   */
  destroy(): void {
    this.hide();
    super.destroy();
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  /**
   * Create a clickable button within the info panel.
   * Interactive backgrounds are placed directly on scene with scrollFactor(0).
   * Non-interactive text labels remain in the container.
   */
  private createPanelButton(
    x: number,
    y: number,
    label: string,
    enabled: boolean,
    callback: () => void,
  ): void {
    if (!this.container) return;

    const btnWidth = 170;
    const btnHeight = 26;

    // Calculate screen position (container position + local offset)
    const screenX = this.container.x + x;
    const screenY = this.container.y + y;

    // Place button background directly on scene for correct input handling
    const btnBg = this.scene.add.rectangle(
      screenX,
      screenY,
      btnWidth,
      btnHeight,
      enabled ? 0x00ffcc : 0x444466,
      enabled ? 0.15 : 0.1,
    );
    btnBg.setStrokeStyle(1, enabled ? 0x00ffcc : 0x444466, enabled ? 0.6 : 0.3);
    btnBg.setScrollFactor(0);
    btnBg.setDepth(TowerInfoPanel.DEPTH);

    if (enabled) {
      btnBg.setInteractive({ useHandCursor: true });
      this.interactiveElements.push(btnBg);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x00ffcc, 0.3);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x00ffcc, 0.15);
      });
      btnBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Stop propagation so click-away handler does not fire
        pointer.event.stopPropagation();
        // Play click sound
        const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
        sm?.play('ui-click');
        callback();
      });
    } else {
      // Non-interactive buttons still need to be destroyed with the panel
      this.interactiveElements.push(btnBg);
    }

    const btnText = this.scene.add.text(x, y, label, {
      fontFamily: TowerInfoPanel.FONT_FAMILY,
      fontSize: '11px',
      color: enabled ? TowerInfoPanel.LABEL_COLOR : TowerInfoPanel.DIMMED_COLOR,
      align: 'center',
    });
    btnText.setOrigin(0.5);
    this.container.add(btnText);
  }
}
