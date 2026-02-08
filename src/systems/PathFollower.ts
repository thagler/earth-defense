import Phaser from 'phaser';

export interface Waypoint {
  x: number;
  y: number;
}

/**
 * PathFollower is a utility that tracks movement along a sequence of waypoints.
 *
 * It computes the next position given a speed and delta time, tracks which
 * waypoint is currently being targeted, and reports progress as a 0.0-1.0
 * fraction of total path length traveled.
 */
export class PathFollower {
  private waypoints: Waypoint[];
  private currentWaypointIndex: number;
  private totalPathLength: number;
  private segmentLengths: number[];
  private distanceTraveled: number;

  /** True once the follower has reached (or passed) the final waypoint. */
  public finished: boolean = false;

  /**
   * @param waypoints          - Array of at least 2 waypoints (world coordinates).
   * @param startWaypointIndex - The index of the waypoint the entity is currently AT.
   *                             Movement will target waypoint[startWaypointIndex + 1].
   *                             Defaults to 0 (start of path).
   */
  constructor(waypoints: Waypoint[], startWaypointIndex: number = 0) {
    if (waypoints.length < 2) {
      throw new Error('PathFollower requires at least 2 waypoints');
    }

    this.waypoints = waypoints;

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
   * Compute the next position given the current position, speed, and elapsed
   * time. Handles crossing multiple waypoints in a single frame if the
   * entity moves fast enough.
   *
   * @param currentX - Current world X position.
   * @param currentY - Current world Y position.
   * @param speed    - Movement speed in pixels per second.
   * @param deltaSec - Elapsed time in seconds for this frame.
   * @returns The new {x, y} position after moving.
   */
  update(currentX: number, currentY: number, speed: number, deltaSec: number): Waypoint {
    if (this.finished) {
      return { x: currentX, y: currentY };
    }

    let remaining = speed * deltaSec;
    let x = currentX;
    let y = currentY;

    while (remaining > 0 && !this.finished) {
      const target = this.waypoints[this.currentWaypointIndex];
      const distToTarget = Phaser.Math.Distance.Between(x, y, target.x, target.y);

      if (distToTarget <= remaining) {
        // We can reach (or pass) this waypoint
        x = target.x;
        y = target.y;
        remaining -= distToTarget;
        this.distanceTraveled += distToTarget;

        // Advance to the next waypoint
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex >= this.waypoints.length) {
          // Reached the final waypoint
          this.currentWaypointIndex = this.waypoints.length - 1;
          this.finished = true;
          this.distanceTraveled = this.totalPathLength;
        }
      } else {
        // Move toward the target but do not reach it
        const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
        x += Math.cos(angle) * remaining;
        y += Math.sin(angle) * remaining;
        this.distanceTraveled += remaining;
        remaining = 0;
      }
    }

    return { x, y };
  }
}
