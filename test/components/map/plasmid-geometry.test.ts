import { describe, it, expect } from 'vitest';
import { coordinateToAngle } from '../../../src/components/map/plasmid-geometry';

describe('plasmid-geometry coordinateToAngle', () => {
  it('maps 0 to 12 o\'clock (PI/2)', () => {
    const angle = coordinateToAngle(0, 100);
    expect(angle).toBeCloseTo(Math.PI / 2);
  });

  it('maps L/4 to 3 o\'clock (0)', () => {
    const angle = coordinateToAngle(25, 100);
    expect(angle).toBeCloseTo(0);
  });

  it('maps L/2 to 6 o\'clock (3PI/2 or -PI/2)', () => {
    const angle = coordinateToAngle(50, 100);
    // PI/2 - PI = -PI/2 -> normalized to 3PI/2
    expect(angle).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('maps 3L/4 to 9 o\'clock (PI)', () => {
    const angle = coordinateToAngle(75, 100);
    expect(angle).toBeCloseTo(Math.PI);
  });
});
