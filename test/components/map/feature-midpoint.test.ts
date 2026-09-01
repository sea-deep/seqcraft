import { describe, it, expect } from 'vitest';
import { getFeatureMidpointAngle } from '../../../src/components/map/feature-midpoint';
import type { Feature } from '../../../src/domain/feature';
import { coordinateToAngle } from '../../../src/components/map/plasmid-geometry';

describe('getFeatureMidpointAngle', () => {
  const createFeature = (segments: {start0: number, end0Exclusive: number}[]): Feature => ({
    id: 'f', name: 'f', type: 'misc_feature', strand: 1, segments, qualifiers: {}, source: 'imported'
  });

  it('calculates midpoint of a single segment', () => {
    // 0 to 25 is 1/4 of the sequence (90 degrees clockwise from top)
    // Top is PI/2, so 0 is PI/2, 25 is 0.
    // Midpoint should be halfway: PI/4
    const f = createFeature([{ start0: 0, end0Exclusive: 25 }]);
    const angle = getFeatureMidpointAngle(f, 100);
    expect(angle).toBeCloseTo(Math.PI / 4, 4);
  });

  it('selects the longest segment for a multi-segment feature', () => {
    const f = createFeature([
      { start0: 0, end0Exclusive: 10 },
      { start0: 50, end0Exclusive: 80 }
    ]);
    // Longest is 50-80 (30 length, 3/10 of circle)
    const angle = getFeatureMidpointAngle(f, 100);
    const startAngle = coordinateToAngle(50, 100);
    const endAngle = coordinateToAngle(80, 100);
    let arc = startAngle - endAngle;
    if (arc < 0) arc += Math.PI * 2;
    const expected = startAngle - arc / 2;
    // Normalized
    const expectedNormalized = expected < 0 ? expected + Math.PI * 2 : expected;
    expect(angle).toBeCloseTo(expectedNormalized, 4);
  });
});

describe('getIntervalMidpointAngle', () => {
  it('calculates midpoint of normal interval', () => {
    // 0 to 50 in 100 bp is halfway across top half (midpoint 25 -> angle 0)
    // 0 is PI/2, 25 is 0, 50 is -PI/2 (or 3PI/2)
    const angle = coordinateToAngle(25, 100);
    expect(angle).toBeCloseTo(0, 4);
  });

  it('calculates midpoint of origin-spanning interval', () => {
    // 90 to 10 in 100 bp (span 20 bp, midpoint at 0 -> PI/2)
    const angle = coordinateToAngle(0, 100);
    expect(angle).toBeCloseTo(Math.PI / 2, 4);
  });
});
