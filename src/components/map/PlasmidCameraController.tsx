import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { Vector3, Euler } from 'three';
import { getFeatureMidpointAngle, getIntervalMidpointAngle } from './feature-midpoint';
import { calculateFeatureFocusPosition } from './camera-math';
import type { Feature } from '../../domain/feature';
import type { RestrictionSite } from '../../scientific/restriction-analysis';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { coordinateToAngle } from './plasmid-geometry';

interface PlasmidCameraControllerProps {
  selectedFeature: Feature | null;
  selectedRestrictionSite: RestrictionSite | null;
  sequenceLength: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  resetToken: number;
  selection: { start0: number; end0Exclusive: number } | null;
  isDraggingSelection: boolean;
}

export function PlasmidCameraController({ 
  selectedFeature, 
  selectedRestrictionSite,
  sequenceLength, 
  controlsRef, 
  resetToken,
  selection,
  isDraggingSelection
}: PlasmidCameraControllerProps) {
  const { camera } = useThree();
  const [targetPos, setTargetPos] = useState<Vector3 | null>(null);

  // Focus feature, restriction site, or nucleotide selection
  useEffect(() => {
    if (isDraggingSelection) {
      setTargetPos(null);
      return;
    }

    let midAngle: number | null = null;

    if (selectedRestrictionSite) {
      midAngle = coordinateToAngle(selectedRestrictionSite.forwardCut0, sequenceLength);
    } else if (selectedFeature) {
      midAngle = getFeatureMidpointAngle(selectedFeature, sequenceLength);
    } else if (selection) {
      midAngle = getIntervalMidpointAngle(selection.start0, selection.end0Exclusive, sequenceLength);
    }

    if (midAngle !== null) {
      const groupEuler = new Euler(-18 * Math.PI / 180, 10 * Math.PI / 180, 0);
      const distance = camera.position.length();
      const focusDistance = Math.min(Math.max(distance, 18), 28);
      const pos = calculateFeatureFocusPosition(midAngle, groupEuler, focusDistance, Math.PI / 4);
      setTargetPos(pos);
    }
  }, [selectedRestrictionSite?.id, selectedFeature?.id, selection?.start0, selection?.end0Exclusive, sequenceLength]); // omit isDraggingSelection to avoid flying after drag

  // Reset view
  useEffect(() => {
    if (resetToken > 0) {
      setTargetPos(new Vector3(0, 0, 25));
    }
  }, [resetToken]);

  // Handle user interruption
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const handleStart = () => setTargetPos(null);
    controls.addEventListener('start', handleStart);
    return () => controls.removeEventListener('start', handleStart);
  }, [controlsRef]);

  useFrame((_state, delta) => {
    if (targetPos && controlsRef.current) {
      camera.position.lerp(targetPos, 6 * delta);
      controlsRef.current.update();
      
      if (camera.position.distanceTo(targetPos) < 0.1) {
        setTargetPos(null);
      }
    }
  });

  return null;
}
