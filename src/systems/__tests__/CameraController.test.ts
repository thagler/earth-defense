import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraController } from '../CameraController';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, MAX_ELEVATION, ELEVATION_PX } from '../../config/maps';

/**
 * Basic tests for CameraController.
 * These tests verify the constructor, update method existence, and bounds calculation logic.
 */
describe('CameraController', () => {
  let mockScene: any;
  let mockCamera: any;

  beforeEach(() => {
    // Create a minimal mock scene and camera
    mockCamera = {
      scrollX: 0,
      scrollY: 0,
      width: 1024,
      height: 768,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      setBounds: vi.fn((x: number, y: number, w: number, h: number) => {
        mockCamera.bounds = { x, y, width: w, height: h };
      }),
      centerOn: vi.fn((x: number, y: number) => {
        mockCamera.scrollX = x - mockCamera.width / 2;
        mockCamera.scrollY = y - mockCamera.height / 2;
      }),
    };

    mockScene = {
      cameras: { main: mockCamera },
      input: {
        keyboard: null,
        on: vi.fn(),
        off: vi.fn(),
      },
    };
  });

  it('constructor creates without error', () => {
    expect(() => {
      new CameraController(mockScene, 16, 12);
    }).not.toThrow();
  });

  it('update method exists', () => {
    const controller = new CameraController(mockScene, 16, 12);
    expect(typeof controller.update).toBe('function');
  });

  it('bounds calculation is correct for 16x12 grid', () => {
    const cols = 16;
    const rows = 12;
    new CameraController(mockScene, cols, rows);

    const expectedWidth = (cols + rows) * (ISO_TILE_WIDTH / 2);
    const expectedHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX);

    // Camera bounds should be set with margin
    const margin = 100;

    expect(mockCamera.setBounds).toHaveBeenCalledWith(
      -margin,
      -margin,
      expectedWidth + margin * 2,
      expectedHeight + margin * 2
    );
  });

  it('bounds calculation is correct for 20x14 grid', () => {
    const cols = 20;
    const rows = 14;
    new CameraController(mockScene, cols, rows);

    const expectedWidth = (cols + rows) * (ISO_TILE_WIDTH / 2);
    const expectedHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX);

    const margin = 100;

    expect(mockCamera.setBounds).toHaveBeenCalledWith(
      -margin,
      -margin,
      expectedWidth + margin * 2,
      expectedHeight + margin * 2
    );
  });

  it('camera starts centered on map', () => {
    const cols = 16;
    const rows = 12;
    new CameraController(mockScene, cols, rows);

    const mapPixelWidth = (cols + rows) * (ISO_TILE_WIDTH / 2);
    const mapPixelHeight = (cols + rows) * (ISO_TILE_HEIGHT / 2) + (MAX_ELEVATION * ELEVATION_PX);

    expect(mockCamera.centerOn).toHaveBeenCalledWith(mapPixelWidth / 2, mapPixelHeight / 2);
  });
});
