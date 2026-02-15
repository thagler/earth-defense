import Phaser from 'phaser';
import { MAPS } from '../config/maps';

/**
 * IsoPreviewScene -- Phaser isometric preview using diamond tiles.
 *
 * Demonstrates isometric rendering with 128x64 diamond tiles.
 * - Arrow keys / WASD for camera panning
 * - Press 1-5 to switch between levels
 * - Press ESC to return to MenuScene
 */
export class IsoPreviewScene extends Phaser.Scene {
  private currentLevel = 1;
  private tileContainer: Phaser.GameObjects.Container | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;

  constructor() {
    super({ key: 'IsoPreviewScene' });
  }

  init(data: { level?: number }): void {
    this.currentLevel = data.level ?? 1;
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    // Title
    this.add
      .text(16, 16, `Isometric Preview - Level ${this.currentLevel}`, {
        fontSize: '20px',
        color: '#00ffcc',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(1000);

    // Instructions
    this.add
      .text(16, 48, 'WASD/Arrows: Pan | 1-5: Switch Levels | ESC: Menu', {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(1000);

    // Load the current level
    this.loadLevel(this.currentLevel);

    // Camera controls
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;

    // Level switch keys
    for (let i = 1; i <= 5; i++) {
      this.input.keyboard?.addKey(`NUMPAD_${i}`)?.on('down', () => this.switchLevel(i));
      this.input.keyboard?.addKey(`DIGIT_${i}`)?.on('down', () => this.switchLevel(i));
    }

    // ESC to return to menu
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)?.on('down', () => {
      this.scene.start('MenuScene');
    });
  }

  update(_time: number, delta: number): void {
    const camera = this.cameras.main;
    const panSpeed = 400 * (delta / 1000);

    // Arrow keys / WASD panning
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
      camera.scrollX -= panSpeed;
    }
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
      camera.scrollX += panSpeed;
    }
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
      camera.scrollY -= panSpeed;
    }
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
      camera.scrollY += panSpeed;
    }
  }

  private loadLevel(level: number): void {
    // Clean up previous tiles
    if (this.tileContainer) {
      this.tileContainer.destroy();
      this.tileContainer = null;
    }

    const mapConfig = MAPS.find((m) => m.level === level);
    if (!mapConfig) {
      console.warn(`Level ${level} not found`);
      return;
    }

    const cols = mapConfig.grid[0].length;
    const rows = mapConfig.grid.length;

    // Place diamond sprites at calculated isometric positions
    this.tileContainer = this.add.container(0, 0);
    const container = this.tileContainer;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileType = mapConfig.grid[row][col];
        const textureKey = this.getTileTexture(tileType);

        // Calculate isometric position
        const isoX = (col - row) * 64;
        const isoY = (col + row) * 32;

        const sprite = this.add.image(isoX, isoY, textureKey).setOrigin(0.5, 0.5);
        container.add(sprite);
      }
    }

    // Center camera on the map
    const mapCenterX = ((cols - 1 + rows - 1) / 2) * 64;
    const mapCenterY = ((cols - 1 + rows - 1) / 2) * 32;

    const camera = this.cameras.main;
    camera.centerOn(mapCenterX, mapCenterY);
    camera.setZoom(0.8);
  }

  private getTileTexture(tileType: number): string {
    switch (tileType) {
      case 0:
        return 'iso-tile-ground';
      case 1:
        return 'iso-tile-path';
      case 2:
        return 'iso-tile-build';
      case 3:
        return 'iso-tile-spawn';
      case 4:
        return 'iso-tile-base';
      default:
        return 'iso-tile-ground';
    }
  }

  private switchLevel(level: number): void {
    if (level < 1 || level > 5) return;
    if (level === this.currentLevel) return;

    this.currentLevel = level;
    this.scene.restart({ level });
  }
}
