import { Vector3, Euler } from 'three';

export function calculateFeatureFocusPosition(
  midAngle: number,
  groupEuler: Euler,
  distance: number,
  elevation: number = Math.PI * 0.38
): Vector3 {
  const featureLocal = new Vector3(Math.cos(midAngle), Math.sin(midAngle), 0);
  const featureWorld = featureLocal.applyEuler(groupEuler);
  const planeNormal = new Vector3(0, 0, 1).applyEuler(groupEuler);
  
  const cameraDir = new Vector3()
    .addScaledVector(featureWorld, Math.cos(elevation))
    .addScaledVector(planeNormal, Math.sin(elevation))
    .normalize();
    
  return cameraDir.multiplyScalar(distance);
}
