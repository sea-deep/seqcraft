import { describe, expect, it } from 'vitest';
import { coordinateToLinearX, linearXToCoordinate } from '../../../src/components/map/linear-map-geometry';

describe('linear map coordinate geometry', () => {
  it('maps sequence endpoints and midpoint onto the map axis', () => {
    expect(coordinateToLinearX(0, 100, 10, 210)).toBe(10);
    expect(coordinateToLinearX(50, 100, 10, 210)).toBe(110);
    expect(coordinateToLinearX(100, 100, 10, 210)).toBe(210);
  });

  it('maps pointer positions to clamped 0-based coordinates', () => {
    expect(linearXToCoordinate(-20, 100, 10, 210)).toBe(0);
    expect(linearXToCoordinate(110, 100, 10, 210)).toBe(50);
    expect(linearXToCoordinate(260, 100, 10, 210)).toBe(99);
  });
});
