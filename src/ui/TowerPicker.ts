import Phaser from 'phaser';
import { TOWERS, TowerConfig } from '../config/towers';
import { EconomyManager } from '../systems/EconomyManager';
import { SoundManager } from '../systems/SoundManager';

/**
 * Individual button state within the TowerPicker.
 */
interface TowerButton {
  key: string;
  config: TowerConfig;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  colorSwatch: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  affordable: boolean;
}

/**
 * TowerPicker -- Bottom-bar tower selection panel for the Earth Defense game.
 *
 * Renders a horizontal row of tower buttons at the bottom of the screen.
 * Each button shows the tower's color, name, and cost. Buttons are dimmed
 * when the player cannot afford them. Clicking a button selects/deselects
 * that tower type.
 *
 * Emits 'tower-selected' event with the tower key string (or null on deselect).
 * All elements are fixed to the camera and drawn at depth 1000.
 */
export class TowerPicker extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;

  // ---- Visual elements ----
  private barBg: Phaser.GameObjects.Rectangle;
  private buttons: TowerButton[] = [];
  private selectedKey: string | null = null;

  // ---- Style constants ----
  private static readonly FONT_FAMILY = 'monospace';
  private static readonly LABEL_COLOR = '#00ffcc';
  private static readonly VALUE_COLOR = '#ffffff';
  private static readonly DIMMED_COLOR = '#666666';
  private static readonly BG_COLOR = 0x1a1a2e;
  private static readonly BG_ALPHA = 0.8;
  private static readonly BAR_HEIGHT = 68;
  private static readonly BAR_Y = 768 - 68 / 2; // centered at bottom
  private static readonly DEPTH = 1000;
  private static readonly SELECTED_STROKE_COLOR = 0x00ffcc;
  private static readonly DEFAULT_STROKE_COLOR = 0x444466;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;

    // ---- Semi-transparent bottom bar ----
    this.barBg = scene.add.rectangle(
      512,
      TowerPicker.BAR_Y,
      1024,
      TowerPicker.BAR_HEIGHT,
      TowerPicker.BG_COLOR,
      TowerPicker.BG_ALPHA,
    );
    this.barBg.setScrollFactor(0);
    this.barBg.setDepth(TowerPicker.DEPTH);

    // ---- Build one button per tower type ----
    const towerKeys = Object.keys(TOWERS);
    const buttonWidth = 120;
    const totalWidth = towerKeys.length * buttonWidth;
    const startX = (1024 - totalWidth) / 2 + buttonWidth / 2;

    towerKeys.forEach((key, index) => {
      const config = TOWERS[key];
      const x = startX + index * buttonWidth;
      const y = TowerPicker.BAR_Y;

      this.createButton(key, config, x, y);
    });
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Returns the currently selected tower key, or null if nothing is selected.
   */
  getSelectedTower(): string | null {
    return this.selectedKey;
  }

  /**
   * Alias for getSelectedTower -- used by GameScene for clarity.
   */
  getSelectedTowerKey(): string | null {
    return this.selectedKey;
  }

  /**
   * Update which buttons are affordable.
   *
   * Accepts either a raw credit number or an EconomyManager instance
   * (the manager's getCredits() method is called internally).
   */
  updateAffordability(creditsOrManager: number | EconomyManager): void {
    const credits =
      typeof creditsOrManager === 'number'
        ? creditsOrManager
        : creditsOrManager.getCredits();

    for (const btn of this.buttons) {
      const canAfford = credits >= btn.config.baseCost;
      btn.affordable = canAfford;

      if (canAfford) {
        btn.colorSwatch.setAlpha(1);
        btn.nameText.setColor(TowerPicker.LABEL_COLOR);
        btn.costText.setColor(TowerPicker.VALUE_COLOR);
      } else {
        btn.colorSwatch.setAlpha(0.3);
        btn.nameText.setColor(TowerPicker.DIMMED_COLOR);
        btn.costText.setColor(TowerPicker.DIMMED_COLOR);

        // If currently selected tower becomes unaffordable, deselect it
        if (this.selectedKey === btn.key) {
          this.deselectCurrent();
        }
      }
    }
  }

  /**
   * Clear the current selection without emitting an event.
   */
  clearSelection(): void {
    this.deselectCurrent();
  }

  /**
   * Clean up all picker game objects. Call when the scene shuts down.
   */
  destroy(): void {
    this.barBg.destroy();
    for (const btn of this.buttons) {
      btn.container.destroy(true);
    }
    this.buttons = [];
    super.destroy();
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  /**
   * Create a single tower button at the given position.
   */
  private createButton(key: string, config: TowerConfig, x: number, y: number): void {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(TowerPicker.DEPTH);

    // Button background
    const bg = this.scene.add.rectangle(0, 0, 110, 58, 0x222244, 0.6);
    bg.setStrokeStyle(2, TowerPicker.DEFAULT_STROKE_COLOR, 0.8);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Color swatch (icon sprite if available, fallback to colored square)
    const iconTextureKey = `icon-tower-${key}`;
    let colorSwatch: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
    if (this.scene.textures.exists(iconTextureKey)) {
      const iconSprite = this.scene.add.sprite(-38, 0, iconTextureKey);
      iconSprite.setDisplaySize(22, 22);
      colorSwatch = iconSprite;
    } else {
      const colorInt = Phaser.Display.Color.HexStringToColor(config.color).color;
      colorSwatch = this.scene.add.rectangle(-38, 0, 22, 22, colorInt, 1);
      (colorSwatch as Phaser.GameObjects.Rectangle).setStrokeStyle(1, 0xffffff, 0.4);
    }
    container.add(colorSwatch);

    // Tower name (abbreviated to fit)
    const displayName = this.abbreviateName(config.name);
    const nameText = this.scene.add.text(10, -12, displayName, {
      fontFamily: TowerPicker.FONT_FAMILY,
      fontSize: '11px',
      color: TowerPicker.LABEL_COLOR,
    });
    nameText.setOrigin(0.5, 0.5);
    container.add(nameText);

    // Cost text
    const costText = this.scene.add.text(10, 8, `$${config.baseCost}`, {
      fontFamily: TowerPicker.FONT_FAMILY,
      fontSize: '12px',
      color: TowerPicker.VALUE_COLOR,
    });
    costText.setOrigin(0.5, 0.5);
    container.add(costText);

    const button: TowerButton = {
      key,
      config,
      container,
      bg,
      colorSwatch,
      nameText,
      costText,
      affordable: true,
    };

    // ---- Interaction handlers ----
    bg.on('pointerover', () => {
      if (button.affordable) {
        bg.setFillStyle(0x333366, 0.8);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x222244, 0.6);
    });

    bg.on('pointerdown', () => {
      if (!button.affordable) return;

      // Play click sound
      const sm = this.scene.registry.get('soundManager') as SoundManager | undefined;
      sm?.play('ui-click');

      if (this.selectedKey === key) {
        // Deselect
        this.deselectCurrent();
        this.emit('tower-selected', null);
      } else {
        // Deselect previous, select new
        this.deselectCurrent();
        this.selectedKey = key;
        bg.setStrokeStyle(2, TowerPicker.SELECTED_STROKE_COLOR, 1);
        this.emit('tower-selected', key);
      }
    });

    this.buttons.push(button);
  }

  /**
   * Visually deselect the currently selected button and clear the key.
   */
  private deselectCurrent(): void {
    if (this.selectedKey !== null) {
      const prev = this.buttons.find((b) => b.key === this.selectedKey);
      if (prev) {
        prev.bg.setStrokeStyle(2, TowerPicker.DEFAULT_STROKE_COLOR, 0.8);
      }
      this.selectedKey = null;
    }
  }

  /**
   * Shorten tower names to fit the button space.
   */
  private abbreviateName(name: string): string {
    // Remove common words, keep it short
    return name.replace('Turret', '').replace('Battery', '').replace('Emitter', '').replace('Cannon', '').trim();
  }
}
