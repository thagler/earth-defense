import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { BackgroundRenderer } from '../systems/BackgroundRenderer';

/**
 * MenuScene -- main menu with title, subtitle, and level select buttons.
 *
 * Provides a "Start Game" button (level 1) plus individual level buttons
 * so the player can jump to any level for testing or replay.
 *
 * Visual enhancements:
 *   - Animated starfield background
 *   - Floating background particles
 *   - Pulsing "EARTH DEFENSE" title glow
 *   - Small rotating "Earth" circle
 *   - Hover scale animations on level select buttons
 *   - Fade-in transition on scene start
 */
export class MenuScene extends Phaser.Scene {
  private backgroundRenderer: BackgroundRenderer | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // ---- Fade-in transition ----
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 600,
      ease: 'Quad.easeOut',
    });

    // ---- Starfield background ----
    this.backgroundRenderer = new BackgroundRenderer(this);
    this.backgroundRenderer.createStarfield();

    // ---- Floating background particles ----
    this.createFloatingParticles(width, height);

    // ---- "Earth" circle in background ----
    this.createEarthCircle(width, height);

    // ---- Title with glow/pulse ----
    const title = this.add
      .text(width / 2, height * 0.2, 'EARTH DEFENSE', {
        fontSize: '48px',
        color: '#00ffcc',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Glow duplicate behind the title (slightly larger, blurred look via alpha)
    const titleGlow = this.add
      .text(width / 2, height * 0.2, 'EARTH DEFENSE', {
        fontSize: '48px',
        color: '#00ffcc',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0.3)
      .setScale(1.04);

    titleGlow.setDepth(title.depth - 1);

    // Pulse the glow layer
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.15,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Subtle pulse on the main title as well
    this.tweens.add({
      targets: title,
      alpha: 0.85,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // ---- Subtitle ----
    this.add
      .text(width / 2, height * 0.3, 'Defend Earth from the alien invasion', {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // ---- Start Game button (always level 1) ----
    const startButton = this.add
      .text(width / 2, height * 0.42, '[ START GAME ]', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#333366',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setColor('#00ffcc');
      this.tweens.add({
        targets: startButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 120,
        ease: 'Back.easeOut',
      });
    });
    startButton.on('pointerout', () => {
      startButton.setColor('#ffffff');
      this.tweens.add({
        targets: startButton,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });
    startButton.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 1 });
    });

    // ---- Level select ----
    this.add
      .text(width / 2, height * 0.55, 'Level Select', {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const buttonWidth = 140;
    const buttonSpacing = 16;
    const totalWidth = LEVELS.length * buttonWidth + (LEVELS.length - 1) * buttonSpacing;
    const startX = width / 2 - totalWidth / 2 + buttonWidth / 2;

    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      const bx = startX + i * (buttonWidth + buttonSpacing);
      const by = height * 0.64;

      const buttonHeight = 48;

      // Background rectangle (interactive hit area)
      const btnBg = this.add
        .rectangle(bx, by, buttonWidth, buttonHeight, 0x222244)
        .setInteractive({ useHandCursor: true });

      // Centered label text (no background -- the rectangle handles that)
      const btnLabel = this.add
        .text(bx, by, `${lvl.level}. ${lvl.name}`, {
          fontSize: '13px',
          color: '#cccccc',
          fontFamily: 'monospace',
          align: 'center',
          wordWrap: { width: buttonWidth - 16 },
        })
        .setOrigin(0.5);

      btnBg.on('pointerover', () => {
        btnLabel.setColor('#00ffcc');
        this.tweens.add({
          targets: [btnBg, btnLabel],
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 120,
          ease: 'Back.easeOut',
        });
      });
      btnBg.on('pointerout', () => {
        btnLabel.setColor('#cccccc');
        this.tweens.add({
          targets: [btnBg, btnLabel],
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });
      btnBg.on('pointerdown', () => {
        this.scene.start('GameScene', { level: lvl.level });
      });
    }

    // ---- Footer (version links to changelog) ----
    const versionText = this.add
      .text(width / 2, height * 0.9, 'v1.0.1 -- Earth Defense', {
        fontSize: '12px',
        color: '#444444',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    versionText.on('pointerover', () => versionText.setColor('#555555'));
    versionText.on('pointerout', () => versionText.setColor('#444444'));
    versionText.on('pointerdown', () => {
      window.open('/changelog.html', '_blank');
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
   * Scatter a handful of slow-drifting particles across the background.
   */
  private createFloatingParticles(width: number, height: number): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Phaser.Math.FloatBetween(0.8, 2);
      const color = Phaser.Math.RND.pick([0x00ffcc, 0x44ff88, 0x88ccff]);

      const p = this.add.arc(x, y, size, 0, 360, false, color, Phaser.Math.FloatBetween(0.08, 0.2));
      p.setDepth(-8);

      // Gentle drift
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: Phaser.Math.FloatBetween(0.04, 0.15),
        duration: Phaser.Math.Between(4000, 8000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  /**
   * A small "Earth" representation -- a filled circle with a subtle stroke,
   * slowly rotating (via a continuously incrementing angle tween that modulates
   * a child indicator line).
   */
  private createEarthCircle(width: number, height: number): void {
    const cx = width * 0.5;
    const cy = height * 0.78;
    const radius = 18;

    // Earth body
    const earth = this.add.arc(cx, cy, radius, 0, 360, false, 0x224488, 0.35);
    earth.setStrokeStyle(1.5, 0x4488cc, 0.5);
    earth.setDepth(-7);

    // Small "continent" accent dot that orbits to give a rotation feel
    const accent = this.add.arc(cx + 8, cy - 4, 4, 0, 360, false, 0x44aa66, 0.4);
    accent.setDepth(-7);

    // Orbit animation -- the accent circles the earth center
    let orbitAngle = 0;
    this.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 12000,
      repeat: -1,
      onUpdate: (tween) => {
        orbitAngle = Phaser.Math.DegToRad(tween.getValue() ?? 0);
        accent.setPosition(
          cx + Math.cos(orbitAngle) * (radius * 0.55),
          cy + Math.sin(orbitAngle) * (radius * 0.35),
        );
      },
    });
  }
}
