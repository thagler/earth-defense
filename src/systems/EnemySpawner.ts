import Phaser from 'phaser';
import { LevelConfig, WaveSegment } from '../config/levels';
import { Enemy } from '../entities/Enemy';
import { Waypoint } from './PathFollower';

/**
 * EnemySpawner manages the continuous trickle of enemies for a single level.
 *
 * It processes the level's `segments` array in order. For each segment it
 * spawns `count` enemies of `enemyKey` type at `spawnInterval` seconds apart.
 * When a segment is exhausted the next one begins immediately.
 *
 * The spawner also listens for split events (Swarm Cluster) and creates
 * mini-drones at the parent's death position continuing along the remaining
 * path.
 */
export class EnemySpawner extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private waypoints: Waypoint[];
  private pathElevations: number[];
  private levelConfig: LevelConfig;

  /** All enemies managed by this spawner, including dead/removed ones still in the group. */
  private enemyGroup: Phaser.GameObjects.Group;

  // ---- Segment tracking ----
  private segments: WaveSegment[];
  private currentSegmentIndex: number = 0;
  private spawnedInSegment: number = 0;

  // ---- Spawn timing ----
  /** Accumulator for spawn timing (seconds). */
  private spawnTimer: number = 0;
  /** The jittered interval for the next spawn (varies +/- 40% from base). */
  private nextSpawnDelay: number = 0;
  /** True once the very first enemy of the current segment has been spawned. */
  private firstSpawnDone: boolean = false;

  // ---- Completion tracking ----
  private allSegmentsExhausted: boolean = false;
  private enemiesReachedBase: number = 0;

  constructor(scene: Phaser.Scene, waypoints: Waypoint[], levelConfig: LevelConfig, pathElevations?: number[]) {
    super();
    this.scene = scene;
    this.waypoints = waypoints;
    this.pathElevations = pathElevations ?? Array(waypoints.length).fill(0);
    this.levelConfig = levelConfig;
    this.segments = [...levelConfig.segments]; // shallow copy, segments are read-only
    this.enemyGroup = this.scene.add.group();

    if (this.segments.length === 0) {
      this.allSegmentsExhausted = true;
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Returns an array of all alive, active (not destroyed) enemies.
   */
  getActiveEnemies(): Enemy[] {
    return (this.enemyGroup.getChildren() as Enemy[]).filter(
      (e) => e.active && e.isAlive && !e.reachedEnd,
    );
  }

  /**
   * Returns true when every segment has been fully spawned AND no enemies
   * remain alive on the field (either dead or reached end).
   */
  isComplete(): boolean {
    if (!this.allSegmentsExhausted) return false;
    return this.getActiveEnemies().length === 0;
  }

  /**
   * Returns how many enemies have reached the base (end of path).
   */
  getEnemiesReachedBase(): number {
    return this.enemiesReachedBase;
  }

  /**
   * Main update tick. Must be called from the scene's update method.
   *
   * @param time  - Total elapsed game time in ms (from Phaser).
   * @param delta - Frame delta in milliseconds.
   */
  update(time: number, delta: number): void {
    const deltaSec = delta / 1000;

    // ---- Spawn logic ----
    if (!this.allSegmentsExhausted) {
      this.updateSpawnTimer(deltaSec);
    }

    // ---- Update all active enemies ----
    const children = this.enemyGroup.getChildren() as Enemy[];
    for (let i = children.length - 1; i >= 0; i--) {
      const enemy = children[i];
      if (enemy.active) {
        enemy.update(time, delta);
      }
    }
  }

  /**
   * Clean up resources when the spawner is no longer needed.
   */
  destroy(): void {
    this.enemyGroup.destroy(true);
    super.destroy();
  }

  // -------------------------------------------------------------------
  // Spawn logic
  // -------------------------------------------------------------------

  /**
   * Compute a jittered spawn delay: base interval +/- 40% random variance.
   * This makes enemy entrance feel organic rather than metronomic.
   */
  private rollNextDelay(baseInterval: number): number {
    const variance = 0.4;
    const jitter = 1 + (Math.random() * 2 - 1) * variance; // 0.6 – 1.4
    return baseInterval * jitter;
  }

  private updateSpawnTimer(deltaSec: number): void {
    // Spawn the first enemy of the level immediately (timer starts at 0)
    if (!this.firstSpawnDone) {
      this.spawnNextEnemy();
      this.firstSpawnDone = true;
      const segment = this.segments[this.currentSegmentIndex];
      if (segment) this.nextSpawnDelay = this.rollNextDelay(segment.spawnInterval);
      return;
    }

    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) {
      this.allSegmentsExhausted = true;
      return;
    }

    this.spawnTimer += deltaSec;

    // Spawn when the jittered delay has elapsed
    while (this.spawnTimer >= this.nextSpawnDelay && !this.allSegmentsExhausted) {
      this.spawnTimer -= this.nextSpawnDelay;
      this.spawnNextEnemy();

      // Re-fetch segment and roll a new delay for the next spawn
      const currentSeg = this.segments[this.currentSegmentIndex];
      if (!currentSeg) break;
      this.nextSpawnDelay = this.rollNextDelay(currentSeg.spawnInterval);
    }
  }

  private spawnNextEnemy(): void {
    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) {
      this.allSegmentsExhausted = true;
      return;
    }

    // Spawn the enemy at the first waypoint
    const startPos = this.waypoints[0];
    this.createEnemy(segment.enemyKey, startPos.x, startPos.y, 0, this.pathElevations);

    this.spawnedInSegment++;

    // Check if this segment is exhausted
    if (this.spawnedInSegment >= segment.count) {
      this.currentSegmentIndex++;
      this.spawnedInSegment = 0;

      if (this.currentSegmentIndex >= this.segments.length) {
        this.allSegmentsExhausted = true;
      }
      // When advancing to the next segment, do NOT reset spawnTimer.
      // Any leftover time carries forward, so the next segment starts
      // seamlessly.
    }
  }

  /**
   * Create an enemy, wire up its events, and add it to the group.
   *
   * @param enemyKey         - Config key of the enemy to create.
   * @param x                - World X spawn position.
   * @param y                - World Y spawn position.
   * @param startWaypointIdx - Waypoint index to begin path following from.
   * @param elevations       - Array of elevation values parallel to waypoints.
   */
  private createEnemy(
    enemyKey: string,
    x: number,
    y: number,
    startWaypointIdx: number,
    elevations?: number[],
  ): Enemy {
    const enemy = new Enemy(
      this.scene,
      x,
      y,
      enemyKey,
      this.waypoints,
      this.levelConfig.hpScale,
      startWaypointIdx,
      elevations,
    );

    // ---- Wire events ----

    enemy.on('enemy-killed', (data: { reward: number; enemy: Enemy }) => {
      // Bubble the event up through the spawner
      this.emit('enemy-killed', data);
    });

    enemy.on('enemy-reached-base', (_reachedEnemy: Enemy) => {
      this.enemiesReachedBase++;
      this.emit('enemy-reached-base', { enemy: _reachedEnemy });
    });

    enemy.on('enemy-split', (data: {
      x: number;
      y: number;
      splitCount: number;
      splitEnemyKey: string;
      waypointIndex: number;
    }) => {
      this.handleSplit(data);
      this.emit('enemies-spawned-from-split', { count: data.splitCount });
    });

    this.enemyGroup.add(enemy);
    return enemy;
  }

  /**
   * Handle a split event by spawning mini-drones at the parent's death
   * position, continuing from the parent's current waypoint index.
   * Split-spawned children inherit the remaining path elevations from the parent's position.
   */
  private handleSplit(data: {
    x: number;
    y: number;
    splitCount: number;
    splitEnemyKey: string;
    waypointIndex: number;
  }): void {
    const { x, y, splitCount, splitEnemyKey, waypointIndex } = data;

    // Slice the pathElevations array from the parent's current waypoint index
    // to give children the remaining elevation data
    const remainingElevations = this.pathElevations.slice(waypointIndex);

    for (let i = 0; i < splitCount; i++) {
      // Offset each mini-drone slightly so they don't stack perfectly
      const offsetX = (Math.random() - 0.5) * 16;
      const offsetY = (Math.random() - 0.5) * 16;

      this.createEnemy(
        splitEnemyKey,
        x + offsetX,
        y + offsetY,
        waypointIndex,
        remainingElevations,
      );
    }
  }
}
