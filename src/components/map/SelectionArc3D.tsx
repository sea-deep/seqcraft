import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Color, Mesh, MeshStandardMaterial } from 'three';
import { coordinateToAngle, createArcRibbonGeometry, splitSelectionIntoSegments, angleToPosition } from './plasmid-geometry';

interface SelectionArc3DProps {
  start0: number;
  end0Exclusive: number;
  sequenceLength: number;
  baseRadius: number;
  showHandles?: boolean;
}

export function SelectionArc3D({ start0, end0Exclusive, sequenceLength, baseRadius, showHandles = false }: SelectionArc3DProps) {
  const innerRadius = baseRadius;
  const outerRadius = innerRadius + 0.15; // narrow width
  const midRadius = innerRadius + 0.075;
  
  const segments = splitSelectionIntoSegments(start0, end0Exclusive, sequenceLength);
  
  const color = useMemo(() => new Color('#3b82f6'), []); // bright blue accent
  const emissiveColor = useMemo(() => new Color('#3b82f6'), []);

  const startAngle = coordinateToAngle(start0, sequenceLength);
  const endAngle = coordinateToAngle(end0Exclusive, sequenceLength);
  const startPos = angleToPosition(startAngle, midRadius);
  const endPos = angleToPosition(endAngle, midRadius);
  
  const isFullSequence = start0 === 0 && end0Exclusive === sequenceLength;

  return (
    <group>
      {segments.map((segment, i) => (
        <SelectionArcSegment
          key={i}
          segment={segment}
          sequenceLength={sequenceLength}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          color={color}
          emissiveColor={emissiveColor}
        />
      ))}

      {showHandles && !isFullSequence && (
        <>
          <mesh position={[startPos[0], startPos[1], 0.15]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color="#60a5fa" 
              emissive="#3b82f6" 
              emissiveIntensity={0.8} 
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>
          <mesh position={[endPos[0], endPos[1], 0.15]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color="#60a5fa" 
              emissive="#3b82f6" 
              emissiveIntensity={0.8} 
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

interface SegmentProps {
  segment: { start0: number; end0Exclusive: number };
  sequenceLength: number;
  innerRadius: number;
  outerRadius: number;
  color: Color;
  emissiveColor: Color;
}

function SelectionArcSegment({ segment, sequenceLength, innerRadius, outerRadius, color, emissiveColor }: SegmentProps) {
  const startAngle = coordinateToAngle(segment.start0, sequenceLength);
  let endAngle = coordinateToAngle(segment.end0Exclusive, sequenceLength);

  // If selecting the entire sequence, we must render a full 2π ring.
  // coordinateToAngle(sequenceLength) evaluates to the same angle as 0.
  if (segment.start0 === 0 && segment.end0Exclusive === sequenceLength) {
    endAngle = startAngle - Math.PI * 2;
  }

  const geometry = useMemo(() => {
    let arcLength = startAngle - endAngle;
    if (arcLength <= 0 && !(segment.start0 === 0 && segment.end0Exclusive === sequenceLength)) {
       while (arcLength < 0) arcLength += Math.PI * 2;
    } else if (segment.start0 === 0 && segment.end0Exclusive === sequenceLength) {
       arcLength = Math.PI * 2;
    }
    
    return createArcRibbonGeometry({
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      depth: 0.15, // small raised depth
      terminal: 'none',
      segments: Math.max(8, Math.floor(arcLength * 64))
    });
  }, [innerRadius, outerRadius, startAngle, endAngle, segment.start0, segment.end0Exclusive, sequenceLength]);

  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame((_state, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Animate in slightly for a smooth entrance
    meshRef.current.position.z = MathUtils.lerp(meshRef.current.position.z, 0.1, 10 * delta);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, -0.2]}>
      <meshStandardMaterial 
        ref={materialRef} 
        color={color} 
        emissive={emissiveColor}
        emissiveIntensity={0.6}
        roughness={0.4} 
        metalness={0.2} 
        transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
}
