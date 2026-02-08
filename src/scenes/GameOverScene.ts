import Phaser from 'phaser';
import { BackgroundRenderer } from '../systems/BackgroundRenderer';

interface GameOverData {
  level: number;
  stats: {
    enemiesKilled: number;
    creditsEarned: number;
  };
}

/**
 * GameOverScene -- shown when the player loses all lives.
 *
 * Displays: level number, enemies killed, credits earned.
 * Actions: Retry (restart the same level), Menu (return to MenuScene).
 *
 * Visual enhancements:
 *   - Animated starfield background
 *   - Screen flash on entry
 *   - Dramatic fade-in for "LEVEL FAILED" text
 *   - Falling debris/particle effect
 *   - Improved button styling with hover scale
 */
export class GameOverScene extends Phaser.Scene {
  private level: number = 1;
  private stats: { enemiesKilled: number; creditsEarned: number } = {
    enemiesKilled: 0,
    creditsEarned: 0,
  };
  private backgroundRenderer: BackgroundRenderer | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.level = data?.level ?? 1;
    this.stats = data?.stats ?? { enemiesKilled: 0, creditsEarned: 0 };
  }

  create(): void {
    const { width, height } = this.scale;

    // ---- Starfield background ----
    this.backgroundRenderer = new BackgroundRenderer(this);
    this.backgroundRenderer.createStarfield();

    // ---- Screen flash on entry ----
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff2222, 0.5);
    flash.setDepth(999);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    // ---- Camera shake on entry ----
    this.cameras.main.shake(300, 0.012);

    // ---- Falling debris particles ----
    this.createFallingDebris(width, height);

    // ---- Dim background ----
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(-5);

    // ---- Title: dramatic fade-in ----
    const title = this.add
      .text(width / 2, height * 0.2, 'LEVEL FAILED', {
        fontSize: '48px',
        color: '#ff4444',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(1.3);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
      delay: 200,
    });

    // Title glow effect (pulsing behind)
    const titleGlow = this.add
      .text(width / 2, height * 0.2, 'LEVEL FAILED', {
        fontSize: '48px',
        color: '#ff4444',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(1.05);

    titleGlow.setDepth(title.depth - 1);

    this.tweens.add({
      targets: titleGlow,
      alpha: 0.2,
      duration: 600,
      delay: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Start pulsing once visible
        this.tweens.add({
          targets: titleGlow,
          alpha: 0.08,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 1200,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      },
    });

    // ---- Level number ----
    const levelText = this.add
      .text(width / 2, height * 0.32, `Level ${this.level}`, {
        fontSize: '24px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: levelText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Quad.easeOut',
    });

    // ---- Stats ----
    const statsY = height * 0.44;
    const statsStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '18px',
      color: '#cccccc',
      fontFamily: 'monospace',
    };

    const stat1 = this.add
      .text(width / 2, statsY, `Enemies Killed: ${this.stats.enemiesKilled}`, statsStyle)
      .setOrigin(0.5)
      .setAlpha(0);

    const stat2 = this.add
      .text(width / 2, statsY + 30, `Credits Earned: ${this.stats.creditsEarned}`, statsStyle)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: stat1, alpha: 1, duration: 300, delay: 650, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: stat2, alpha: 1, duration: 300, delay: 750, ease: 'Quad.easeOut' });

    // ---- Buttons ----
    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333366',
      padding: { x: 20, y: 10 },
    };

    // Retry button -- restart the same level
    const retryButton = this.add
      .text(width / 2 - 100, height * 0.65, '[ RETRY ]', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    this.tweens.add({
      targets: retryButton,
      alpha: 1,
      duration: 300,
      delay: 900,
      ease: 'Quad.easeOut',
    });

    retryButton.on('pointerover', () => {
      retryButton.setColor('#00ffcc');
      this.tweens.add({
        targets: retryButton,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 120,
        ease: 'Back.easeOut',
      });
    });
    retryButton.on('pointerout', () => {
      retryButton.setColor('#ffffff');
      this.tweens.add({
        targets: retryButton,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });
    retryButton.on('pointerdown', () => {
      this.scene.start('GameScene', { level: this.level });
    });

    // Menu button -- return to main menu
    const menuButton = this.add
      .text(width / 2 + 100, height * 0.65, '[ MENU ]', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    this.tweens.add({
      targets: menuButton,
      alpha: 1,
      duration: 300,
      delay: 950,
      ease: 'Quad.easeOut',
    });

    menuButton.on('pointerover', () => {
      menuButton.setColor('#00ffcc');
      this.tweens.add({
        targets: menuButton,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 120,
        ease: 'Back.easeOut',
      });
    });
    menuButton.on('pointerout', () => {
      menuButton.setColor('#ffffff');
      this.tweens.add({
        targets: menuButton,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });
    menuButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // ---- Register update for background animation ----
    this.events.on('update', this.onUpdate, this);
    this.events.once('shutdown', () => {
      this.events.off('update', this.onUpdate, this);
      this.backgroundRenderer?.destroy();
      this.backgroundRenderer = null;
    });
  }

  // -------------------------------------------------------------------
  //  Per-frame update
  // -------------------------------------------------------------------

  private onUpdate = (_time: number, delta: number): void => {
    this.backgroundRenderer?.updateStarfield(delta);
  };

  // -------------------------------------------------------------------
  //  Visual helpers
  // -------------------------------------------------------------------

  /**
   * Continuously spawning debris dots that fall from the top of the screen
   * with slight horizontal drift, simulating destruction aftermath.
   */
  private createFallingDebris(width: number, height: number): void {
    const debrisColors = [0xff4444, 0xff8844, 0xffcc44, 0x888888, 0xaaaaaa];

    // Initial burst
    for (let i = 0; i < 20; i++) {
      this.spawnDebris(width, height, debrisColors, Phaser.Math.Between(0, 500));
    }

    // Ongoing slower stream
    this.time.addEvent({
      delay: 300,
      repeat: 30,
      callback: () => {
        this.spawnDebris(width, height, debrisColors, 0);
      },
    });
  }

  private spawnDebris(width: number, height: number, colors: number[], delay: number): void {
    const x = Math.random() * width;
    const y = -Phaser.Math.Between(5, 40);
    const size = Phaser.Math.FloatBetween(0.8, 2.5);
    const color = Phaser.Math.RND.pick(colors);

    const debris = this.add.arc(x, y, size, 0, 360, false, color, Phaser.Math.FloatBetween(0.3, 0.6));
    debris.setDepth(-4);

    this.tweens.add({
      targets: debris,
      x: x + Phaser.Math.Between(-60, 60),
      y: height + 20,
      alpha: 0,
      duration: Phaser.Math.Between(3000, 6000),
      delay,
      ease: 'Quad.easeIn',
      onComplete: () => debris.destroy(),
    });
  }
}
