import { useRef } from 'react';
import type { Mesh } from 'three';
import { RADIUS, TUBE_RADIUS } from './plasmid-geometry';

export function PlasmidRing() {
  const meshRef = useRef<Mesh>(null);
  
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[RADIUS, TUBE_RADIUS, 16, 256]} />
      <meshStandardMaterial color="#334155" roughness={0.65} metalness={0.05} />
    </mesh>
  );
}
