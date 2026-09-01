import { describe, it, expect } from 'vitest';
import { Euler, Vector3 } from 'three';
import { calculateFeatureFocusPosition } from '../../../src/components/map/camera-math';

describe('calculateFeatureFocusPosition', () => {
  it('calculates the correct camera position for a feature at 0 angle with 0 group rotation', () => {
    const midAngle = 0; // feature at +X
    const groupEuler = new Euler(0, 0, 0); // flat XY plane
    const distance = 10;
    const elevation = 0; // look directly edge-on from the feature side
    
    const pos = calculateFeatureFocusPosition(midAngle, groupEuler, distance, elevation);
    
    expect(pos.x).toBeCloseTo(10);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('calculates position with elevation', () => {
    const midAngle = Math.PI / 2; // feature at +Y
    const groupEuler = new Euler(0, 0, 0);
    const distance = 10;
    const elevation = Math.PI / 4; // 45 degrees up
    
    const pos = calculateFeatureFocusPosition(midAngle, groupEuler, distance, elevation);
    
    // Y should be 10 * cos(45), Z should be 10 * sin(45)
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(10 * Math.SQRT1_2);
    expect(pos.z).toBeCloseTo(10 * Math.SQRT1_2);
  });
});
