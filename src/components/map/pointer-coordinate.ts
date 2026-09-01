import { angleToCoordinate } from './plasmid-geometry';
import { Ray, Matrix4, Plane, Vector3 } from 'three';

const LOCAL_XY_PLANE = new Plane(new Vector3(0, 0, 1), 0);

/**
 * Resolves a 2D local plane point on the plasmid to an integer nucleotide coordinate [0, sequenceLength).
 * Local plane mapping:
 * - top (0, r) -> coordinate 0 (angle = PI/2)
 * - right (r, 0) -> coordinate L/4 (angle = 0)
 * - bottom (0, -r) -> coordinate L/2 (angle = -PI/2)
 * - left (-r, 0) -> coordinate 3L/4 (angle = PI or -PI)
 */
export function pointToCoordinate(point: { x: number; y: number }, sequenceLength: number): number {
  const angle = Math.atan2(point.y, point.x);
  return angleToCoordinate(angle, sequenceLength);
}

/**
 * Intersects a world-space Ray with the object's local XY plane (Z=0) and returns the coordinate.
 * This allows drag events to resolve coordinates even when the pointer moves beyond the original mesh geometry.
 */
export function resolveRayPlaneCoordinate(
  worldRay: Ray,
  worldMatrix: Matrix4,
  sequenceLength: number
): { coord: number; angle: number } | null {
  const inverseMatrix = new Matrix4().copy(worldMatrix).invert();
  const localRay = worldRay.clone().applyMatrix4(inverseMatrix);

  const localIntersection = new Vector3();
  if (!localRay.intersectPlane(LOCAL_XY_PLANE, localIntersection)) {
    return null;
  }

  const angle = Math.atan2(localIntersection.y, localIntersection.x);
  const coord = pointToCoordinate(localIntersection, sequenceLength);
  return { coord, angle };
}

/**
 * Resolves circular selection range from drag gesture.
 * totalAngularDelta is in radians (negative = clockwise drag, positive = counter-clockwise drag).
 */
export function resolveCircularDragRange(
  anchorCoord: number,
  currentCoord: number,
  totalAngularDelta: number,
  sequenceLength: number,
  fullCircleReached: boolean
): { start0: number; end0Exclusive: number } {
  if (sequenceLength <= 0) return { start0: 0, end0Exclusive: 0 };

  const absDelta = Math.abs(totalAngularDelta);
  const fullCircleThreshold = Math.PI * 2 - 0.15; // ~8.5 degrees tolerance

  // 1. Full revolution reached -> entire sequence
  if (fullCircleReached || absDelta >= fullCircleThreshold) {
    return { start0: 0, end0Exclusive: sequenceLength };
  }

  // 2. Negligible angular movement -> single nucleotide
  if (absDelta < 0.05) {
    const end0 = anchorCoord + 1 > sequenceLength ? sequenceLength : anchorCoord + 1;
    return { start0: anchorCoord, end0Exclusive: end0 };
  }

  // 3. Ordinary clockwise/counter-clockwise drag
  if (totalAngularDelta < 0) {
    // Clockwise drag (angular delta is negative)
    return {
      start0: anchorCoord,
      end0Exclusive: currentCoord === 0 ? sequenceLength : currentCoord
    };
  } else {
    // Counter-clockwise drag (angular delta is positive)
    return {
      start0: currentCoord,
      end0Exclusive: anchorCoord === 0 ? sequenceLength : anchorCoord
    };
  }
}
