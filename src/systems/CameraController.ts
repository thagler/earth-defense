import Phaser from 'phaser';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, MAX_ELEVATION, ELEVATION_PX } from '../config/maps';

/**
 * CameraController handles player input for camera panning in isometric view.
 *
 * Supports:
 * - WASD / Arrow keys for directional panning
 * - Click-and-drag with middle mouse or right-click
 * - Mouse wheel / trackpad scroll for panning (primary method)
 *
 * The camera starts centered on the map and is constrained to map bounds.
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;

  private readonly PAN_SPEED = 400; // pixels per second
  private readonly SCROLL_SPEED = 50; // pixels per wheel event

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;

  constructor(scene: Phaser.Scene, cols: number, rows: number) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Calculate map pixel dimensions for isometric projection
    const mapPixelWidth = (cols + rows) * (ISO_TILE_WIDTH / 2);
    const mapPixelHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX);

    // Set camera bounds with small margin to prevent showing empty space
    const margin = 100;
    this.camera.setBounds(
      -margin,
      -margin,
      mapPixelWidth + margin * 2,
      mapPixelHeight + margin * 2
    );

    // Center camera on the map
    this.camera.centerOn(mapPixelWidth / 2, mapPixelHeight / 2);

    // Setup input handlers
    this.setupKeyboardInput();
    this.setupMouseInput();
  }

  /**
   * Setup WASD and arrow key input for panning.
   */
  private setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  /**
   * Setup mouse drag (middle/right button) and scroll wheel panning.
   */
  private setupMouseInput(): void {
    const input = this.scene.input;

    // Middle mouse or right-click drag
    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.camera.scrollX;
        this.cameraStartY = this.camera.scrollY;
      }
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = this.dragStartX - pointer.x;
        const deltaY = this.dragStartY - pointer.y;
        this.camera.scrollX = this.cameraStartX + deltaX;
        this.camera.scrollY = this.cameraStartY + deltaY;
      }
    });

    input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.middleButtonDown() && !pointer.rightButtonDown()) {
        this.isDragging = false;
      }
    });

    // Mouse wheel / trackpad scroll for panning (PRIMARY METHOD)
    input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number, deltaZ: number) => {
      this.camera.scrollY += deltaY * 0.5;
      this.camera.scrollX += deltaX * 0.5;
    });
  }

  /**
   * Update camera position based on keyboard input.
   * Should be called from GameScene.update(time, delta).
   */
  update(delta: number): void {
    if (!this.cursors || !this.wasd) return;

    const speed = (this.PAN_SPEED * delta) / 1000; // Convert to pixels per frame

    // Horizontal panning
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.camera.scrollX -= speed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.camera.scrollX += speed;
    }

    // Vertical panning
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.camera.scrollY -= speed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.camera.scrollY += speed;
    }
  }

  /**
   * Cleanup input listeners when the scene is destroyed.
   */
  destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.scene.input.off('wheel');
  }
}
