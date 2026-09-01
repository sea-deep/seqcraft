/**
 * Coordinate math helper for 0-based half-open [start, end)
 */
export function toDisplayCoordinate(coord0: number): number {
  return coord0 + 1;
}

export function fromDisplayCoordinate(coordDisplay: number): number {
  return coordDisplay - 1;
}

export function validateSelection(
  start0: number, 
  end0Exclusive: number, 
  sequenceLength: number, 
  topology: 'circular' | 'linear' = 'circular'
): void {
  if (start0 < 0) throw new Error("Interval start0 cannot be negative");
  if (end0Exclusive < 0) throw new Error("Interval end0Exclusive cannot be negative");
  if (start0 > sequenceLength || end0Exclusive > sequenceLength) {
    throw new Error("Interval end0Exclusive exceeds sequence length");
  }
  if (topology === 'linear' && end0Exclusive < start0) {
    throw new Error("Interval end0Exclusive must be >= start0");
  }
}
