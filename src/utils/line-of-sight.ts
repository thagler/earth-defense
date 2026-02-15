/**
 * Check line-of-sight between two tile positions using Bresenham's line algorithm.
 * A tile blocks LOS if its elevation is strictly greater than both the source and target elevations.
 */
export function hasLineOfSight(
  heightGrid: number[][],
  fromCol: number, fromRow: number, fromElevation: number,
  toCol: number, toRow: number, toElevation: number,
): boolean {
  const maxElevation = Math.max(fromElevation, toElevation);

  // Bresenham's line algorithm
  let x0 = fromCol, y0 = fromRow;
  const x1 = toCol, y1 = toRow;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Skip the source and target tiles themselves
    if ((x0 !== fromCol || y0 !== fromRow) && (x0 !== toCol || y0 !== toRow)) {
      // Check bounds
      if (y0 >= 0 && y0 < heightGrid.length && x0 >= 0 && x0 < heightGrid[0].length) {
        if (heightGrid[y0][x0] > maxElevation) {
          return false; // Blocked
        }
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }

  return true;
}
