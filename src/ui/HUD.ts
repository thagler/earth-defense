import Phaser from 'phaser';
import { SoundManager } from '../systems/SoundManager';

/**
 * Stats object passed to level-complete and game-over overlays.
 *
 * The `level` and `isVictory` fields are optional -- they are used by the
 * showLevelComplete overlay to display the level number and distinguish
 * between a mid-game level clear and a final-level victory screen.
 */
export interface LevelStats {
  enemiesKilled: number;
  creditsEarned: number;
  livesRemaining?: number;
  livesMax?: number;
  level?: number;
  isVictory?: boolean;
}

/**
 * HUD -- Top-bar status display for the Earth Defense game.
 *
 * Renders Credits, Lives, and Enemies-remaining counters at the top of the
 * screen. All elements are fixed to the camera (scrollFactor 0) and drawn
 * at depth 1000 so they always render on top of the game world.
 *
 * Also provides overlay methods for level-complete and game-over screens.
 */
export class HUD extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;

  // ---- Top bar background ----
  private topBarBg: Phaser.GameObjects.Rectangle;

  // ---- Text displays ----
  private creditsText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private enemiesText: Phaser.GameObjects.Text;
  private levelNameText: Phaser.GameObjects.Text;

  // ---- Cached lives max for single-arg updateLives calls ----
  private livesMax: number = 10;

  // ---- Overlay container (level complete / game over) ----
  private overlayContainer: Phaser.GameObjects.Container | null = null;

  // ---- Interactive elements outside container (for proper click handling) ----
  private overlayInteractiveElements: Phaser.GameObjects.GameObject[] = [];

  // ---- Mute toggle button ----
  private muteButton: Phaser.GameObjects.Text;

  // ---- Style constants ----
  private static readonly FONT_FAMILY = 'monospace';
  private static readonly LABEL_COLOR = '#00ffcc';
  private static readonly VALUE_COLOR = '#ffffff';
  private static readonly BG_COLOR = 0x1a1a2e;
  private static readonly BG_ALPHA = 0.8;
  private static readonly BAR_HEIGHT = 36;
  private static readonly DEPTH = 1000;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;

    // ---- Semi-transparent top bar ----
    this.topBarBg = scene.add.rectangle(
      512, // center of 1024-wide canvas
      HUD.BAR_HEIGHT / 2,
      1024,
      HUD.BAR_HEIGHT,
      HUD.BG_COLOR,
      HUD.BG_ALPHA,
    );
    this.topBarBg.setScrollFactor(0);
    this.topBarBg.setDepth(HUD.DEPTH);

    // ---- Enemies remaining (left area) ----
    this.enemiesText = scene.add.text(16, 8, 'Enemies: 0', {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '16px',
      color: HUD.LABEL_COLOR,
    });
    this.enemiesText.setScrollFactor(0);
    this.enemiesText.setDepth(HUD.DEPTH);

    // ---- Lives display (center-right area) ----
    this.livesText = scene.add.text(700, 8, 'Lives: 10/10', {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '16px',
      color: HUD.LABEL_COLOR,
    });
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(HUD.DEPTH);

    // ---- Credits display (right area) ----
    this.creditsText = scene.add.text(840, 8, 'Credits: 200', {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '16px',
      color: HUD.LABEL_COLOR,
    });
    this.creditsText.setScrollFactor(0);
    this.creditsText.setDepth(HUD.DEPTH);

    // ---- Level name display (center area) ----
    this.levelNameText = scene.add.text(350, 8, '', {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '13px',
      color: HUD.VALUE_COLOR,
    });
    this.levelNameText.setOrigin(0.5, 0);
    this.levelNameText.setScrollFactor(0);
    this.levelNameText.setDepth(HUD.DEPTH);

    // ---- Mute toggle button (top-right corner) ----
    const sm = scene.registry.get('soundManager') as SoundManager | undefined;
    const muteLabel = sm?.isMuted ? '[MUTED]' : '[SFX]';
    this.muteButton = scene.add.text(1014, 8, muteLabel, {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '12px',
      color: sm?.isMuted ? '#666666' : HUD.LABEL_COLOR,
    });
    this.muteButton.setOrigin(1, 0);
    this.muteButton.setScrollFactor(0);
    this.muteButton.setDepth(HUD.DEPTH);
    this.muteButton.setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerover', () => {
      this.muteButton.setColor('#ffffff');
    });
    this.muteButton.on('pointerout', () => {
      const soundMgr = this.scene.registry.get('soundManager') as SoundManager | undefined;
      this.muteButton.setColor(soundMgr?.isMuted ? '#666666' : HUD.LABEL_COLOR);
    });
    this.muteButton.on('pointerdown', () => {
      const soundMgr = this.scene.registry.get('soundManager') as SoundManager | undefined;
      if (!soundMgr) return;
      const nowMuted = soundMgr.toggleMute();
      this.muteButton.setText(nowMuted ? '[MUTED]' : '[SFX]');
      this.muteButton.setColor(nowMuted ? '#666666' : HUD.LABEL_COLOR);
    });
  }

  // -------------------------------------------------------------------
  // Public update methods
  // -------------------------------------------------------------------

  /**
   * Update the credits counter display.
   */
  updateCredits(amount: number): void {
    this.creditsText.setText(`Credits: ${amount}`);
  }

  /**
   * Update the lives counter display.
   * Turns red when lives are critically low (<= 3).
   *
   * Can be called with one argument (current) -- uses the last known max --
   * or two arguments (current, max) to update both.
   */
  updateLives(current: number, max?: number): void {
    if (max !== undefined) {
      this.livesMax = max;
    }
    this.livesText.setText(`Lives: ${current}/${this.livesMax}`);

    if (current <= 3) {
      this.livesText.setColor('#ff4444');
    } else {
      this.livesText.setColor(HUD.LABEL_COLOR);
    }
  }

  /**
   * Update the enemies-remaining counter display.
   */
  updateEnemiesRemaining(count: number): void {
    this.enemiesText.setText(`Enemies: ${count}`);
  }

  /**
   * Update the level name displayed in the top bar.
   * Optionally include the world name in abbreviated format.
   */
  updateLevelName(level: number, name: string, worldName?: string): void {
    if (worldName) {
      const abbrevWorld = worldName.split(' ')[0];
      this.levelNameText.setText(`${abbrevWorld}-${level}: ${name}`);
    } else {
      this.levelNameText.setText(`Level ${level}: ${name}`);
    }
  }

  /**
   * Get the world name from world number.
   */
  private getWorldName(world: number): string {
    const worldNames: Record<number, string> = {
      1: 'Desert Outpost',
      2: 'Urban Ruins',
      3: 'Alien Terrain',
    };
    return worldNames[world] || '';
  }

  // -------------------------------------------------------------------
  // Overlay screens
  // -------------------------------------------------------------------

  /**
   * Show a centered "Level Complete" overlay with stats and a "Next Level" button.
   */
  showLevelComplete(stats: LevelStats): void {
    this.clearOverlay();

    const { container, yOffset } = this.createOverlayBase('LEVEL COMPLETE', stats);

    // "Next Level" button
    this.createOverlayButton(container, 0, yOffset, 'Next Level', () => {
      this.clearOverlay();
      this.emit('next-level');
    });

    this.overlayContainer = container;
  }

  /**
   * Show a centered "Game Over" overlay with stats and "Retry" / "Menu" buttons.
   */
  showGameOver(stats: LevelStats): void {
    this.clearOverlay();

    const { container, yOffset } = this.createOverlayBase('GAME OVER', stats);

    // "Retry" button
    this.createOverlayButton(container, -80, yOffset, 'Retry', () => {
      this.clearOverlay();
      this.emit('retry');
    });

    // "Menu" button
    this.createOverlayButton(container, 80, yOffset, 'Menu', () => {
      this.clearOverlay();
      this.emit('menu');
    });

    this.overlayContainer = container;
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  /**
   * Build the shared overlay base: dimmed backdrop, title, and stats text.
   * Returns the container and the Y offset where buttons should start.
   */
  private createOverlayBase(
    title: string,
    stats: LevelStats,
  ): { container: Phaser.GameObjects.Container; yOffset: number } {
    const centerX = 512;
    const centerY = 384;

    const container = this.scene.add.container(0, 0);
    container.setScrollFactor(0);
    container.setDepth(HUD.DEPTH + 1);

    // Full-screen dim overlay
    const dimBg = this.scene.add.rectangle(centerX, centerY, 1024, 768, 0x000000, 0.6);
    container.add(dimBg);

    // Panel background
    const panelWidth = 360;
    const panelHeight = 280;
    const panelBg = this.scene.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      HUD.BG_COLOR,
      0.95,
    );
    panelBg.setStrokeStyle(2, 0x00ffcc, 1);
    container.add(panelBg);

    // Title
    const titleText = this.scene.add.text(centerX, centerY - 100, title, {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '28px',
      color: HUD.LABEL_COLOR,
      align: 'center',
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    // Stats lines
    const statsLines: string[] = [];
    if (stats.level !== undefined) {
      statsLines.push(`Level: ${stats.level}`);
    }
    statsLines.push(`Enemies Killed: ${stats.enemiesKilled}`);
    statsLines.push(`Credits Earned: ${stats.creditsEarned}`);
    if (stats.livesRemaining !== undefined && stats.livesMax !== undefined) {
      statsLines.push(`Lives Remaining: ${stats.livesRemaining}/${stats.livesMax}`);
    }

    let lineY = centerY - 50;
    for (const line of statsLines) {
      const lineText = this.scene.add.text(centerX, lineY, line, {
        fontFamily: HUD.FONT_FAMILY,
        fontSize: '16px',
        color: HUD.VALUE_COLOR,
        align: 'center',
      });
      lineText.setOrigin(0.5);
      container.add(lineText);
      lineY += 28;
    }

    return { container, yOffset: centerY + 80 };
  }

  /**
   * Create a clickable text button for an overlay.
   *
   * The button background (btnBg) is created as a scene-level object with its
   * own scrollFactor(0) and depth to avoid the Phaser Container input bug.
   * The text label (btnText) remains in the container for visual grouping.
   */
  private createOverlayButton(
    container: Phaser.GameObjects.Container,
    offsetX: number,
    y: number,
    label: string,
    callback: () => void,
  ): void {
    const centerX = 512;

    // Create button background as a scene-level object (NOT a container child)
    const btnBg = this.scene.add.rectangle(centerX + offsetX, y, 140, 36, 0x00ffcc, 0.15);
    btnBg.setStrokeStyle(1, 0x00ffcc, 0.8);
    btnBg.setScrollFactor(0);
    btnBg.setDepth(container.depth + 0.1);
    btnBg.setInteractive({ useHandCursor: true });

    // Track for cleanup
    this.overlayInteractiveElements.push(btnBg);

    // Text label stays in container (non-interactive)
    const btnText = this.scene.add.text(centerX + offsetX, y, label, {
      fontFamily: HUD.FONT_FAMILY,
      fontSize: '16px',
      color: HUD.LABEL_COLOR,
      align: 'center',
    });
    btnText.setOrigin(0.5);
    container.add(btnText);

    // Hover effects
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x00ffcc, 0.3);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x00ffcc, 0.15);
    });
    btnBg.on('pointerdown', callback);
  }

  /**
   * Remove and destroy the current overlay, if any.
   */
  private clearOverlay(): void {
    if (this.overlayContainer) {
      this.overlayContainer.destroy(true);
      this.overlayContainer = null;
    }

    // Destroy all interactive elements that were placed outside the container
    for (const element of this.overlayInteractiveElements) {
      element.destroy();
    }
    this.overlayInteractiveElements = [];
  }

  /**
   * Clean up all HUD game objects. Call when the scene shuts down.
   */
  destroy(): void {
    this.clearOverlay();
    this.topBarBg.destroy();
    this.creditsText.destroy();
    this.livesText.destroy();
    this.enemiesText.destroy();
    this.levelNameText.destroy();
    this.muteButton.destroy();
    super.destroy();
  }
}
