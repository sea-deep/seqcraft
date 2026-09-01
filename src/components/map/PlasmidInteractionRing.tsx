import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { resolveRayPlaneCoordinate } from './pointer-coordinate';
import { RADIUS } from './plasmid-geometry';
import type { Mesh } from 'three';

interface PlasmidInteractionRingProps {
  sequenceLength: number;
  onDragStart: (coord: number, angle: number) => void;
  onDragMove: (coord: number, angle: number) => void;
  onDragEnd: () => void;
  onHoverChange?: (hovering: boolean) => void;
}

export function PlasmidInteractionRing({
  sequenceLength,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHoverChange
}: PlasmidInteractionRingProps) {
  const meshRef = useRef<Mesh>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Only handle primary left button
    if (e.button !== 0) return;
    
    e.stopPropagation();
    if (!meshRef.current) return;

    activePointerIdRef.current = e.pointerId;
    const target = e.target as HTMLElement;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    const res = resolveRayPlaneCoordinate(e.ray, meshRef.current.matrixWorld, sequenceLength);
    if (res) {
      onDragStart(res.coord, res.angle);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    if (!meshRef.current) return;
    e.stopPropagation();

    const res = resolveRayPlaneCoordinate(e.ray, meshRef.current.matrixWorld, sequenceLength);
    if (res) {
      onDragMove(res.coord, res.angle);
    }
  };

  const handleFinish = (e: ThreeEvent<PointerEvent>) => {
    if (activePointerIdRef.current === e.pointerId) {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
      activePointerIdRef.current = null;
      onDragEnd();
      
      // If we are no longer over the ring physically, we should clear hover state.
      // But we can't easily detect if we're over the ring right now in this event.
      // The easiest way is to let onPointerOut handle it if we actually left.
      // R3F will fire onPointerOut eventually if needed, or we just trust the hover logic.
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange?.(true);
  };

  const handlePointerOut = () => {
    // Keep hover true if we are actively dragging
    if (activePointerIdRef.current === null) {
      onHoverChange?.(false);
    }
  };

  return (
    <mesh
      ref={meshRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handleFinish}
      onPointerCancel={handleFinish}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      position={[0, 0, 0]}
    >
      {/* Generous interaction surface around the backbone and track radius */}
      <ringGeometry args={[RADIUS - 1.5, RADIUS + 3.0, 64]} />
      <meshBasicMaterial visible={false} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
