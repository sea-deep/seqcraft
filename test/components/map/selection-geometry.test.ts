import { describe, it, expect } from 'vitest';
import { angleToCoordinate, coordinateToAngle, splitSelectionIntoSegments } from '../../../src/components/map/plasmid-geometry';

describe('Selection Geometry', () => {
  const len = 1000;

  it('coordinate <-> angle round-trip works', () => {
    const coords = [0, 10, 500, 999];
    for (const c of coords) {
      const angle = coordinateToAngle(c, len);
      const roundTrip = angleToCoordinate(angle, len);
      expect(roundTrip).toBe(c);
    }
  });

  it('splits normal interval', () => {
    const segments = splitSelectionIntoSegments(500, 800, len);
    expect(segments).toEqual([{ start0: 500, end0Exclusive: 800 }]);
  });

  it('splits interval ending exactly at sequenceLength', () => {
    const segments = splitSelectionIntoSegments(500, 1000, len);
    expect(segments).toEqual([{ start0: 500, end0Exclusive: 1000 }]);
  });

  it('splits origin-spanning interval', () => {
    const segments = splitSelectionIntoSegments(800, 200, len);
    expect(segments).toEqual([
      { start0: 800, end0Exclusive: 1000 },
      { start0: 0, end0Exclusive: 200 }
    ]);
  });

  it('handles single-base interval', () => {
    const segments = splitSelectionIntoSegments(50, 51, len);
    expect(segments).toEqual([{ start0: 50, end0Exclusive: 51 }]);
  });
});
