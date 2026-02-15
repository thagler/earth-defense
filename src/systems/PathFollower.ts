import Phaser from 'phaser';
import { getSlopeSpeedModifier } from '../utils/elevation';

export interface Waypoint {
  x: number;
  y: number;
}

export interface WaypointWithElevation extends Waypoint {
  elevation: number;
}

/**
 * PathFollower is a utility that tracks movement along a sequence of waypoints.
 *
 * It computes the next position given a speed and delta time, tracks which
 * waypoint is currently being targeted, and reports progress as a 0.0-1.0
 * fraction of total path length traveled.
 *
 * Supports elevation: applies slope speed modifiers when moving between
 * waypoints at different elevations, and tracks current interpolated elevation.
 */
export class PathFollower {
  private waypoints: Waypoint[];
  private elevations: number[];
  private currentWaypointIndex: number;
  private totalPathLength: number;
  private segmentLengths: number[];
  private distanceTraveled: number;
  private progressInCurrentSegment: number = 0;

  /** True once the follower has reached (or passed) the final waypoint. */
  public finished: boolean = false;

  /**
   * @param waypoints          - Array of at least 2 waypoints (world coordinates).
   * @param startWaypointIndex - The index of the waypoint the entity is currently AT.
   *                             Movement will target waypoint[startWaypointIndex + 1].
   *                             Defaults to 0 (start of path).
   * @param elevations         - Array of elevation values parallel to waypoints.
   *                             If not provided, defaults to all zeros (backwards compatibility).
   */
  constructor(
    waypoints: Waypoint[],
    startWaypointIndex: number = 0,
    elevations?: number[]
  ) {
    if (waypoints.length < 2) {
      throw new Error('PathFollower requires at least 2 waypoints');
    }

    this.waypoints = waypoints;

    // If no elevations provided, default to all zeros (flat path)
    if (elevations && elevations.length === waypoints.length) {
      this.elevations = elevations;
    } else {
      this.elevations = new Array(waypoints.length).fill(0);
    }

    // The entity is AT startWaypointIndex, so the next target is index + 1.
    this.currentWaypointIndex = startWaypointIndex + 1;

    // Pre-compute segment lengths and total path length
    this.segmentLengths = [];
    this.totalPathLength = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const length = Phaser.Math.Distance.Between(
        waypoints[i].x,
        waypoints[i].y,
        waypoints[i + 1].x,
        waypoints[i + 1].y,
      );
      this.segmentLengths.push(length);
      this.totalPathLength += length;
    }

    // Compute distance already traveled if starting mid-path.
    // The follower begins AT waypoint[startWaypointIndex], meaning it has
    // already completed all segments up to and including that index.
    this.distanceTraveled = 0;
    for (let i = 0; i < startWaypointIndex; i++) {
      this.distanceTraveled += this.segmentLengths[i];
    }

    // If the next target is beyond the last waypoint, we are already finished.
    if (this.currentWaypointIndex >= this.waypoints.length) {
      this.currentWaypointIndex = this.waypoints.length - 1;
      this.finished = true;
      this.distanceTraveled = this.totalPathLength;
    }
  }

  /**
   * Returns the current target waypoint (the one we are moving toward).
   */
  get currentTarget(): Waypoint {
    return this.waypoints[this.currentWaypointIndex];
  }

  /**
   * Returns progress along the path as a value from 0.0 to 1.0.
   */
  get pathProgress(): number {
    if (this.totalPathLength === 0) return 1;
    return Phaser.Math.Clamp(this.distanceTraveled / this.totalPathLength, 0, 1);
  }

  /**
   * Returns the current waypoint index the follower is heading toward.
   */
  get waypointIndex(): number {
    return this.currentWaypointIndex;
  }

  /**
   * Returns the current interpolated elevation between waypoints.
   * Interpolates based on progress between the previous waypoint and the current target.
   */
  get currentElevation(): number {
    if (this.finished) {
      return this.elevations[this.elevations.length - 1];
    }

    const prevIndex = Math.max(0, this.currentWaypointIndex - 1);
    const fromElev = this.elevations[prevIndex];
    const toElev = this.elevations[this.currentWaypointIndex];

    return Phaser.Math.Linear(fromElev, toElev, this.progressInCurrentSegment);
  }

  /**
   * Compute the next position given the current position, speed, and elapsed
   * time. Handles crossing multiple waypoints in a single frame if the
   * entity moves fast enough.
   *
   * Applies slope speed modifiers when moving between waypoints at different elevations:
   * - Uphill (higher target elevation) slows the enemy
   * - Downhill (lower target elevation) speeds the enemy
   * - Flat terrain has no modifier
   *
   * @param currentX - Current world X position.
   * @param currentY - Current world Y position.
   * @param speed    - Movement speed in pixels per second.
   * @param deltaSec - Elapsed time in seconds for this frame.
   * @returns The new {x, y, elevation} position after moving.
   */
  update(currentX: number, currentY: number, speed: number, deltaSec: number): WaypointWithElevation {
    if (this.finished) {
      return {
        x: currentX,
        y: currentY,
        elevation: this.elevations[this.elevations.length - 1]
      };
    }

    let remaining = speed * deltaSec;
    let x = currentX;
    let y = currentY;

    while (remaining > 0 && !this.finished) {
      const target = this.waypoints[this.currentWaypointIndex];
      const prevIndex = Math.max(0, this.currentWaypointIndex - 1);
      const fromElev = this.elevations[prevIndex];
      const toElev = this.elevations[this.currentWaypointIndex];

      // Apply slope speed modifier
      const slopeModifier = getSlopeSpeedModifier(fromElev, toElev);
      const effectiveSpeed = remaining * slopeModifier;

      const distToTarget = Phaser.Math.Distance.Between(x, y, target.x, target.y);

      if (distToTarget <= effectiveSpeed) {
        // We can reach (or pass) this waypoint
        x = target.x;
        y = target.y;
        remaining -= distToTarget / slopeModifier; // Adjust remaining by inverse of modifier
        this.distanceTraveled += distToTarget;
        this.progressInCurrentSegment = 1.0; // Reached end of segment

        // Advance to the next waypoint
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex >= this.waypoints.length) {
          // Reached the final waypoint
          this.currentWaypointIndex = this.waypoints.length - 1;
          this.finished = true;
          this.distanceTraveled = this.totalPathLength;
          this.progressInCurrentSegment = 1.0;
        } else {
          // Reset progress for new segment
          this.progressInCurrentSegment = 0;
        }
      } else {
        // Move toward the target but do not reach it
        const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
        x += Math.cos(angle) * effectiveSpeed;
        y += Math.sin(angle) * effectiveSpeed;
        this.distanceTraveled += effectiveSpeed;

        // Update progress in current segment
        const segmentLength = this.segmentLengths[prevIndex];
        if (segmentLength > 0) {
          // Calculate how far we are in this segment
          const startWaypoint = this.waypoints[prevIndex];
          const distFromStart = Phaser.Math.Distance.Between(startWaypoint.x, startWaypoint.y, x, y);
          this.progressInCurrentSegment = Phaser.Math.Clamp(distFromStart / segmentLength, 0, 1);
        }

        remaining = 0;
      }
    }

    return { x, y, elevation: this.currentElevation };
  }
}
