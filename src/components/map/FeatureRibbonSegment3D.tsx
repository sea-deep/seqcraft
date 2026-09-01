import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Color, Mesh, MeshStandardMaterial } from 'three';
import { coordinateToAngle, RADIUS, FEATURE_INNER_OFFSET, FEATURE_WIDTH, FEATURE_LANE_SPACING, FEATURE_DEPTH, createArcRibbonGeometry } from './plasmid-geometry';
import type { Feature, SequenceInterval } from '../../domain/feature';
import { getSegmentTerminal } from './feature-endpoints';

interface FeatureRibbonSegment3DProps {
  feature: Feature;
  segment: SequenceInterval;
  segmentIndex: number;
  sequenceLength: number;
  lane: number;
  color: string;
  isHovered: boolean;
  isSelected: boolean;
}

export function FeatureRibbonSegment3D({ feature, segment, segmentIndex, sequenceLength, lane, color, isHovered, isSelected }: FeatureRibbonSegment3DProps) {
  const innerRadius = RADIUS + FEATURE_INNER_OFFSET + lane * (FEATURE_WIDTH + FEATURE_LANE_SPACING);
  const outerRadius = innerRadius + FEATURE_WIDTH;

  const terminal = getSegmentTerminal(feature, segmentIndex, sequenceLength);

  const startAngle = coordinateToAngle(segment.start0, sequenceLength);
  const endAngle = coordinateToAngle(segment.end0Exclusive, sequenceLength);

  const geometry = useMemo(() => {
    let arcLength = startAngle - endAngle;
    while (arcLength < 0) arcLength += Math.PI * 2;
    
    return createArcRibbonGeometry({
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      depth: FEATURE_DEPTH,
      terminal,
      segments: Math.max(16, Math.floor(arcLength * 64))
    });
  }, [innerRadius, outerRadius, startAngle, endAngle, terminal]);

  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  
  const baseColor = useMemo(() => new Color(color), [color]);
  const hoverColor = useMemo(() => new Color(color).offsetHSL(0, 0, 0.15), [color]);
  const emissiveColor = useMemo(() => new Color(color), [color]);

  useFrame((_state, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    let targetZ = 0;
    let targetEmissive = 0;
    let targetRoughness = 0.5;
    let targetMetalness = 0.1;
    let targetColor = baseColor;
    
    if (isSelected && isHovered) {
      targetZ = 0.18;
      targetEmissive = 0.5;
      targetRoughness = 0.3;
      targetMetalness = 0.3;
      targetColor = hoverColor;
    } else if (isSelected) {
      targetZ = 0.12;
      targetEmissive = 0.3;
      targetRoughness = 0.3; // Shinier for "light edge/highlight"
      targetMetalness = 0.3;
      targetColor = baseColor;
    } else if (isHovered) {
      targetZ = 0.15;
      targetEmissive = 0.25;
      targetRoughness = 0.4;
      targetMetalness = 0.2;
      targetColor = hoverColor;
    }

    // Lerp properties smoothly
    meshRef.current.position.z = MathUtils.lerp(meshRef.current.position.z, targetZ, 12 * delta);
    materialRef.current.emissiveIntensity = MathUtils.lerp(materialRef.current.emissiveIntensity, targetEmissive, 12 * delta);
    materialRef.current.roughness = MathUtils.lerp(materialRef.current.roughness, targetRoughness, 12 * delta);
    materialRef.current.metalness = MathUtils.lerp(materialRef.current.metalness, targetMetalness, 12 * delta);
    materialRef.current.color.lerp(targetColor, 12 * delta);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        ref={materialRef} 
        color={baseColor} 
        emissive={emissiveColor}
        emissiveIntensity={0}
        roughness={0.5} 
        metalness={0.1} 
      />
    </mesh>
  );
}
