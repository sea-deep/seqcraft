import { useState } from 'react';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Primer, PrimerBinding } from '../../domain/primer';
import type { Feature } from '../../domain/feature';
import { useWorkspaceStore } from '../../state/workspace-store';
import { FeatureRibbonSegment3D } from './FeatureRibbonSegment3D';
import { angleToPosition, FEATURE_INNER_OFFSET, FEATURE_LANE_SPACING, FEATURE_WIDTH, RADIUS } from './plasmid-geometry';
import { getFeatureMidpointAngle } from './feature-midpoint';

export function PrimerArc3D({ primer, binding, sequenceLength, lane, selected }: { primer: Primer; binding: PrimerBinding; sequenceLength: number; lane: number; selected: boolean }) {
  const [hovered, setHovered] = useState(false);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);
  const activeDocumentId = useWorkspaceStore(state => state.activeDocumentId);
  const feature: Feature = {
    id: `primer-${primer.id}-${binding.start0}-${binding.orientation}`,
    name: primer.name, type: 'misc_feature', strand: binding.orientation === 'forward' ? 1 : -1,
    segments: binding.segments, qualifiers: {}, source: 'manual',
  };
  const midpointAngle = getFeatureMidpointAngle(feature, sequenceLength);
  const labelRadius = RADIUS + FEATURE_INNER_OFFSET + lane * (FEATURE_WIDTH + FEATURE_LANE_SPACING) + FEATURE_WIDTH + 0.8;
  const labelPosition = angleToPosition(midpointAngle, labelRadius);
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!activeDocumentId) return;
    setSelection(activeDocumentId, binding.start0, binding.end0Exclusive);
    selectPrimer(primer.id);
  };
  return (
    <group onPointerOver={event => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)} onPointerDown={event => event.stopPropagation()} onClick={click}>
      {binding.segments.map((segment, index) => <FeatureRibbonSegment3D key={index} feature={feature} segment={segment} segmentIndex={index} sequenceLength={sequenceLength} lane={lane} color="#0891b2" isHovered={hovered} isSelected={selected} />)}
      {hovered && <Html position={labelPosition} center className="pointer-events-none"><div className="whitespace-nowrap rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-[11px] text-[var(--text)] shadow">{primer.name} · {binding.orientation} primer</div></Html>}
    </group>
  );
}
