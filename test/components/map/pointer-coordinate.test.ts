import { describe, it, expect } from 'vitest';
import { pointToCoordinate, resolveCircularDragRange, resolveRayPlaneCoordinate } from '../../../src/components/map/pointer-coordinate';
import { Ray, Vector3, Matrix4 } from 'three';

describe('pointer-coordinate helpers', () => {
  const L = 1000;
  const radius = 10;

  describe('resolveRayPlaneCoordinate', () => {
    it('resolves standard top ray correctly with identity matrix', () => {
      // Ray shooting straight down from (0, 10, 10) in direction (0, 0, -1)
      const ray = new Ray(new Vector3(0, radius, 10), new Vector3(0, 0, -1));
      const matrix = new Matrix4().identity();
      const res = resolveRayPlaneCoordinate(ray, matrix, L);
      expect(res).not.toBeNull();
      // Should hit (0, 10, 0), which is top point -> coord 0
      expect(res!.coord).toBe(0);
      expect(res!.angle).toBeCloseTo(Math.PI / 2);
    });

    it('resolves offset ray into scaled/rotated object space', () => {
      // Create a matrix that rotates 90 degrees around Z
      const matrix = new Matrix4().makeRotationZ(Math.PI / 2);
      // Ray shooting at (0, 10, 0) in world space
      const ray = new Ray(new Vector3(0, radius, 10), new Vector3(0, 0, -1));
      const res = resolveRayPlaneCoordinate(ray, matrix, L);
      expect(res).not.toBeNull();
      // In object space, world (0, 10, 0) becomes (10, 0, 0) due to -90 deg rotation of inverse
      // (10, 0, 0) is the right point -> coord L/4
      expect(res!.coord).toBe(250);
      expect(res!.angle).toBeCloseTo(0);
    });

    it('returns null if ray does not intersect Z=0 plane', () => {
      // Ray shooting parallel to Z=0 plane
      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(1, 0, 0));
      const matrix = new Matrix4().identity();
      const res = resolveRayPlaneCoordinate(ray, matrix, L);
      expect(res).toBeNull();
    });
  });

  describe('pointToCoordinate', () => {
    it('maps top point (0, r) to coordinate 0', () => {
      const coord = pointToCoordinate({ x: 0, y: radius }, L);
      expect(coord).toBe(0);
    });

    it('maps right point (r, 0) to coordinate L / 4', () => {
      const coord = pointToCoordinate({ x: radius, y: 0 }, L);
      expect(coord).toBe(250);
    });

    it('maps bottom point (0, -r) to coordinate L / 2', () => {
      const coord = pointToCoordinate({ x: 0, y: -radius }, L);
      expect(coord).toBe(500);
    });

    it('maps left point (-r, 0) to coordinate 3L / 4', () => {
      const coord = pointToCoordinate({ x: -radius, y: 0 }, L);
      expect(coord).toBe(750);
    });
  });

  describe('resolveCircularDragRange', () => {
    it('handles single-base click', () => {
      const range = resolveCircularDragRange(100, 100, 0, L, false);
      expect(range).toEqual({ start0: 100, end0Exclusive: 101 });
    });

    it('handles single-base click at boundary end', () => {
      const range = resolveCircularDragRange(999, 999, 0, L, false);
      expect(range).toEqual({ start0: 999, end0Exclusive: 1000 });
    });

    it('resolves normal clockwise drag', () => {
      // Dragging clockwise from 100 to 300: delta is negative
      const range = resolveCircularDragRange(100, 300, -1.25, L, false);
      expect(range).toEqual({ start0: 100, end0Exclusive: 300 });
    });

    it('resolves normal counter-clockwise drag', () => {
      // Dragging CCW from 300 to 100: delta is positive
      const range = resolveCircularDragRange(300, 100, 1.25, L, false);
      expect(range).toEqual({ start0: 100, end0Exclusive: 300 });
    });

    it('resolves origin-spanning clockwise drag (e.g. 900 to 100)', () => {
      // Dragging clockwise from 900 through 0 to 100
      const range = resolveCircularDragRange(900, 100, -1.25, L, false);
      expect(range).toEqual({ start0: 900, end0Exclusive: 100 });
    });

    it('resolves origin-spanning counter-clockwise drag (e.g. 100 to 900)', () => {
      // Dragging CCW from 100 backwards through 0 to 900
      const range = resolveCircularDragRange(100, 900, 1.25, L, false);
      expect(range).toEqual({ start0: 900, end0Exclusive: 100 });
    });

    it('resolves drag ending at coordinate zero', () => {
      // Dragging clockwise from 800 to 0 (end of sequence)
      const range = resolveCircularDragRange(800, 0, -1.25, L, false);
      expect(range).toEqual({ start0: 800, end0Exclusive: 1000 });
    });

    it('resolves full sequence when absolute delta is around 2PI', () => {
      const range1 = resolveCircularDragRange(100, 100, -Math.PI * 2, L, false);
      expect(range1).toEqual({ start0: 0, end0Exclusive: 1000 });

      const range2 = resolveCircularDragRange(500, 480, Math.PI * 2 - 0.05, L, false);
      expect(range2).toEqual({ start0: 0, end0Exclusive: 1000 });
    });

    it('resolves full sequence when fullCircleReached flag is true despite small delta', () => {
      const range = resolveCircularDragRange(100, 100, 0, L, true);
      expect(range).toEqual({ start0: 0, end0Exclusive: 1000 });
    });
  });
});
