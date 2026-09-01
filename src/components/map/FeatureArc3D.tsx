import type { Feature } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { FeatureRibbonSegment3D } from './FeatureRibbonSegment3D';
import { PlasmidFeatureLabel } from './PlasmidFeatureLabel';
import { getFeatureMidpointAngle } from './feature-midpoint';
import { angleToPosition, RADIUS, FEATURE_INNER_OFFSET, FEATURE_WIDTH, FEATURE_LANE_SPACING } from './plasmid-geometry';
import type { ThreeEvent } from '@react-three/fiber';

interface FeatureArc3DProps {
  feature: Feature;
  sequenceLength: number;
  lane: number;
  isHovered: boolean;
  isSelected: boolean;
  onHoverChange: (hovered: boolean) => void;
  onClick: () => void;
}

export function FeatureArc3D({ feature, sequenceLength, lane, isHovered, isSelected, onHoverChange, onClick }: FeatureArc3DProps) {
  const color = getFeatureColor(feature.type);
  
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange(true);
  };
  
  const handlePointerOut = () => {
    onHoverChange(false);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  const midpointAngle = getFeatureMidpointAngle(feature, sequenceLength);
  const featureRadius = RADIUS + FEATURE_INNER_OFFSET + lane * (FEATURE_WIDTH + FEATURE_LANE_SPACING) + FEATURE_WIDTH / 2;
  const labelRadius = featureRadius + 1.2;
  const labelPosition = angleToPosition(midpointAngle, labelRadius);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
  };

  return (
    <group 
      onPointerOver={handlePointerOver} 
      onPointerOut={handlePointerOut} 
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {feature.segments.map((segment, i) => (
        <FeatureRibbonSegment3D
          key={i}
          feature={feature}
          segment={segment}
          segmentIndex={i}
          sequenceLength={sequenceLength}
          lane={lane}
          color={color}
          isHovered={isHovered}
          isSelected={isSelected}
        />
      ))}
      {isHovered && <PlasmidFeatureLabel feature={feature} position={labelPosition} />}
    </group>
  );
}
