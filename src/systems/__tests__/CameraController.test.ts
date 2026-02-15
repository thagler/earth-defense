import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraController } from '../CameraController';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, MAX_ELEVATION, ELEVATION_PX } from '../../config/maps';
import { cartToIso } from '../../utils/coordinates';

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

    // Calculate bounding box from corner tiles (same algorithm as implementation)
    const topCorner = cartToIso(0, 0, 0);
    const rightCorner = cartToIso(cols - 1, 0, 0);
    const bottomCorner = cartToIso(cols - 1, rows - 1, 0);
    const leftCorner = cartToIso(0, rows - 1, 0);

    const minX = Math.min(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const maxX = Math.max(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const minY = Math.min(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);
    const maxY = Math.max(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);

    const margin = 100;
    const elevationOffset = MAX_ELEVATION * ELEVATION_PX;

    expect(mockCamera.setBounds).toHaveBeenCalledWith(
      minX - margin,
      minY - margin - elevationOffset,
      (maxX - minX) + margin * 2,
      (maxY - minY) + margin * 2 + elevationOffset
    );
  });

  it('bounds calculation is correct for 20x14 grid', () => {
    const cols = 20;
    const rows = 14;
    new CameraController(mockScene, cols, rows);

    // Calculate bounding box from corner tiles (same algorithm as implementation)
    const topCorner = cartToIso(0, 0, 0);
    const rightCorner = cartToIso(cols - 1, 0, 0);
    const bottomCorner = cartToIso(cols - 1, rows - 1, 0);
    const leftCorner = cartToIso(0, rows - 1, 0);

    const minX = Math.min(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const maxX = Math.max(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const minY = Math.min(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);
    const maxY = Math.max(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);

    const margin = 100;
    const elevationOffset = MAX_ELEVATION * ELEVATION_PX;

    expect(mockCamera.setBounds).toHaveBeenCalledWith(
      minX - margin,
      minY - margin - elevationOffset,
      (maxX - minX) + margin * 2,
      (maxY - minY) + margin * 2 + elevationOffset
    );
  });

  it('camera starts centered on map', () => {
    const cols = 16;
    const rows = 12;
    new CameraController(mockScene, cols, rows);

    // Calculate center from bounding box of corner tiles (same algorithm as implementation)
    const topCorner = cartToIso(0, 0, 0);
    const rightCorner = cartToIso(cols - 1, 0, 0);
    const bottomCorner = cartToIso(cols - 1, rows - 1, 0);
    const leftCorner = cartToIso(0, rows - 1, 0);

    const minX = Math.min(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const maxX = Math.max(topCorner.screenX, rightCorner.screenX, bottomCorner.screenX, leftCorner.screenX);
    const minY = Math.min(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);
    const maxY = Math.max(topCorner.screenY, rightCorner.screenY, bottomCorner.screenY, leftCorner.screenY);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    expect(mockCamera.centerOn).toHaveBeenCalledWith(centerX, centerY);
  });
});
