import Phaser from 'phaser';
import {
  MapConfig,
  TileType,
  ISO_TILE_WIDTH,
  ISO_TILE_HEIGHT,
  ELEVATION_PX,
} from '../config/maps';
import { LEVELS } from '../config/levels';
import { cartToIso, tileToWorld } from '../utils/coordinates';
import { calculateDepth } from '../utils/elevation';

const HALF_W = ISO_TILE_WIDTH / 2;  // 64
const HALF_H = ISO_TILE_HEIGHT / 2; // 32

/**
 * Maps TileType enum values to the base portion of the iso texture key.
 * World-specific suffixes are appended at render time.
 */
const ISO_TILE_NAMES: Record<TileType, string> = {
  [TileType.Ground]:    'ground',
  [TileType.Path]:      'path',
  [TileType.BuildSlot]: 'build',
  [TileType.Spawn]:     'spawn',
  [TileType.Base]:      'base',
};

/**
 * Stores run-time data about a single build-slot tile so that the game can
 * perform click-detection and placement logic.
 */
export interface BuildSlotInfo {
  /** Tile column index */
  tileX: number;
  /** Tile row index */
  tileY: number;
  /** World x of tile center (isometric) */
  worldX: number;
  /** World y of tile center (isometric, with elevation offset) */
  worldY: number;
  /** Elevation of this build slot */
  elevation: number;
  /** The interactive zone game object for this slot (diamond hit area) */
  rect: Phaser.GameObjects.Zone;
}

/**
 * TilemapRenderer -- draws an isometric diamond-tile map onto a Phaser scene
 * using pre-generated iso textures from AssetGenerator.
 *
 * Tiles are positioned using cartToIso() for isometric projection and shifted
 * vertically by elevation * ELEVATION_PX. Cliff faces are drawn between tiles
 * at different elevations. Depth is set via calculateDepth() for correct
 * painter-ordering across elevation bands.
 *
 * Usage:
 *   const renderer = new TilemapRenderer(scene, mapConfig);
 *   renderer.render();
 *   const slots = renderer.getBuildSlots();
 *   const waypoints = renderer.getPathPoints();
 */
export class TilemapRenderer {
  private scene: Phaser.Scene;
  private map: MapConfig;
  private buildSlots: BuildSlotInfo[] = [];
  private worldNumber: number;
  private rows: number;
  private cols: number;

  constructor(scene: Phaser.Scene, map: MapConfig) {
    this.scene = scene;
    this.map = map;
    this.rows = map.grid.length;
    this.cols = map.grid[0]?.length ?? 0;
    this.worldNumber = LEVELS.find(l => l.level === map.level)?.world ?? 1;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Draw the entire isometric tilemap: ground tiles, cliff faces, build slots,
   * spawn/base markers, and decorations.
   */
  render(): void {
    // Build-slot index tracks which entry in buildSlotElevations to use
    let buildSlotIndex = 0;

    // Render back-to-front: row by row, then column by column within each row.
    // This ensures tiles nearer the camera (higher row+col) overlay farther tiles.
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tileValue = this.map.grid[row][col] as TileType;
        const elevation = this.map.heightGrid[row]?.[col] ?? 0;

        // Isometric screen position with elevation offset
        const { screenX, screenY } = cartToIso(col, row, elevation);
        const depth = calculateDepth(screenY, elevation);

        // Resolve the texture key for this tile
        const textureKey = this.getTextureKey(tileValue);

        // Draw cliff faces first (below the tile) if there are elevation transitions
        this.drawCliffFaces(col, row, elevation, screenX, screenY);

        if (tileValue === TileType.BuildSlot) {
          // Determine this build slot's elevation from the map config
          const slotElevation = this.map.buildSlotElevations[buildSlotIndex] ?? elevation;
          buildSlotIndex++;

          // Place the tile sprite
          if (textureKey && this.scene.textures.exists(textureKey)) {
            const sprite = this.scene.add.sprite(screenX, screenY, textureKey);
            sprite.setDepth(depth);
          }

          // Create an interactive zone with a diamond-shaped hit area
          const zone = this.scene.add.zone(screenX, screenY, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

          // Diamond polygon vertices in local coordinates.
          // The hitAreaCallback receives local coords where (0,0) is the TOP-LEFT
          // of the zone's bounding box, NOT the center. The zone is 128x64.
          // We need a diamond centered at local (64, 32) - the box center.
          const diamondShape = new Phaser.Geom.Polygon([
            new Phaser.Geom.Point(HALF_W, 0),              // top (center of top edge)
            new Phaser.Geom.Point(ISO_TILE_WIDTH, HALF_H), // right (right edge, center y)
            new Phaser.Geom.Point(HALF_W, ISO_TILE_HEIGHT), // bottom (center of bottom edge)
            new Phaser.Geom.Point(0, HALF_H),               // left (left edge, center y)
          ]);

          zone.setInteractive({
            hitArea: diamondShape,
            hitAreaCallback: Phaser.Geom.Polygon.Contains,
            useHandCursor: true,
          });

          zone.setDepth(depth + 0.1); // Slightly above the tile sprite for click priority

          this.buildSlots.push({
            tileX: col,
            tileY: row,
            worldX: screenX,
            worldY: screenY,
            elevation: slotElevation,
            rect: zone,
          });
        } else {
          // Non-interactive tile: just place the sprite
          if (textureKey && this.scene.textures.exists(textureKey)) {
            const sprite = this.scene.add.sprite(screenX, screenY, textureKey);
            sprite.setDepth(depth);
          }
        }
      }
    }
  }

  /**
   * Returns an array of build-slot metadata objects. Each slot contains tile
   * coordinates, isometric world coordinates, elevation, and the interactive
   * zone so that the calling code can attach pointer events.
   */
  getBuildSlots(): BuildSlotInfo[] {
    return this.buildSlots;
  }

  /**
   * Converts the map's tile-coordinate path points into isometric world-coordinate
   * waypoints with elevation offsets. Enemy movement systems should follow
   * these points in order.
   */
  getPathPoints(): { x: number; y: number }[] {
    return this.map.pathPoints.map((p, i) => {
      const elevation = this.map.pathElevations[i] ?? 0;
      return tileToWorld(p.x, p.y, elevation);
    });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve the iso texture key for a given tile type, accounting for
   * world-specific texture variants.
   *
   * World 1 uses unsuffixed keys: iso-tile-ground
   * World 2+ uses suffixed keys: iso-tile-ground-w2, iso-tile-ground-w3
   */
  private getTextureKey(tileType: TileType): string {
    const baseName = ISO_TILE_NAMES[tileType];
    if (this.worldNumber === 1) {
      return `iso-tile-${baseName}`;
    }
    return `iso-tile-${baseName}-w${this.worldNumber}`;
  }

  /**
   * Resolve the cliff face texture key for a direction, accounting for
   * world-specific variants.
   */
  private getCliffTextureKey(direction: string): string {
    if (this.worldNumber === 1) {
      return `iso-cliff-${direction}`;
    }
    return `iso-cliff-${direction}-w${this.worldNumber}`;
  }

  /**
   * Draw cliff faces between this tile and its neighbors when there is an
   * elevation difference. Cliff faces are drawn below the tile surface to
   * give the appearance of raised terrain.
   *
   * For isometric rendering, we check the south (row+1) and east (col+1)
   * neighbors -- these are the two visible cliff faces from the camera's
   * perspective. When this tile is higher than its neighbor, we draw cliff
   * faces on the side of this tile going down. When a neighbor is higher,
   * we draw the cliff face on the neighbor's side (handled when that
   * neighbor is processed).
   *
   * We also check north (row-1) and west (col-1) to handle the case where
   * the current tile is lower than its neighbor (the cliff face appears
   * above this tile).
   */
  private drawCliffFaces(col: number, row: number, elevation: number, screenX: number, screenY: number): void {
    // Check south neighbor (row + 1): if current is higher, draw S cliff face
    if (row + 1 < this.rows) {
      const neighborElev = this.map.heightGrid[row + 1]?.[col] ?? 0;
      const elevDiff = elevation - neighborElev;
      if (elevDiff > 0) {
        // Draw south-facing cliff: visible below-right of the diamond
        this.drawCliffStack('S', screenX, screenY, elevDiff);
      }
    }

    // Check east neighbor (col + 1): if current is higher, draw E cliff face
    if (col + 1 < this.cols) {
      const neighborElev = this.map.heightGrid[row]?.[col + 1] ?? 0;
      const elevDiff = elevation - neighborElev;
      if (elevDiff > 0) {
        // Draw east-facing cliff: visible below-right of the diamond
        this.drawCliffStack('E', screenX, screenY, elevDiff);
      }
    }

    // Check north neighbor (row - 1): if current is higher, draw N cliff face
    if (row - 1 >= 0) {
      const neighborElev = this.map.heightGrid[row - 1]?.[col] ?? 0;
      const elevDiff = elevation - neighborElev;
      if (elevDiff > 0) {
        this.drawCliffStack('N', screenX, screenY, elevDiff);
      }
    }

    // Check west neighbor (col - 1): if current is higher, draw W cliff face
    if (col - 1 >= 0) {
      const neighborElev = this.map.heightGrid[row]?.[col - 1] ?? 0;
      const elevDiff = elevation - neighborElev;
      if (elevDiff > 0) {
        this.drawCliffStack('W', screenX, screenY, elevDiff);
      }
    }
  }

  /**
   * Draw a stack of cliff face sprites for a given direction.
   * Each elevation step adds one cliff face texture (ELEVATION_PX tall)
   * stacked vertically below the tile.
   */
  private drawCliffStack(direction: string, tileScreenX: number, tileScreenY: number, elevationSteps: number): void {
    const cliffKey = this.getCliffTextureKey(direction);
    if (!this.scene.textures.exists(cliffKey)) return;

    for (let step = 0; step < elevationSteps; step++) {
      // Position cliff face below the tile surface.
      // The tile sprite is centered at (tileScreenX, tileScreenY).
      // The cliff face goes below the diamond's lower edge.
      let cliffX = tileScreenX;
      let cliffY = tileScreenY + HALF_H + (step * ELEVATION_PX) + (ELEVATION_PX / 2);

      // Offset cliff position based on direction for isometric perspective
      if (direction === 'S') {
        // South cliff: visible below-left of diamond
        cliffX = tileScreenX - HALF_W / 2;
        cliffY = tileScreenY + HALF_H / 2 + (step * ELEVATION_PX) + (ELEVATION_PX / 2);
      } else if (direction === 'E') {
        // East cliff: visible below-right of diamond
        cliffX = tileScreenX + HALF_W / 2;
        cliffY = tileScreenY + HALF_H / 2 + (step * ELEVATION_PX) + (ELEVATION_PX / 2);
      } else if (direction === 'N') {
        // North cliff: visible above-right of diamond (rarely visible)
        cliffX = tileScreenX + HALF_W / 2;
        cliffY = tileScreenY - HALF_H / 2 + (step * ELEVATION_PX) + (ELEVATION_PX / 2);
      } else if (direction === 'W') {
        // West cliff: visible above-left of diamond (rarely visible)
        cliffX = tileScreenX - HALF_W / 2;
        cliffY = tileScreenY - HALF_H / 2 + (step * ELEVATION_PX) + (ELEVATION_PX / 2);
      }

      const cliffSprite = this.scene.add.sprite(cliffX, cliffY, cliffKey);
      // Cliff faces render just below the tile they belong to
      const cliffDepth = calculateDepth(tileScreenY, 0) + step * 0.01;
      cliffSprite.setDepth(cliffDepth);
    }
  }
}
