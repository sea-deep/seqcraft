import { useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RestrictionSite } from '../../scientific/restriction-analysis';
import { getEndType } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { angleToPosition } from './plasmid-geometry';
import { useWorkspaceStore } from '../../state/workspace-store';

import { getRestrictionMarkerRadii } from './restriction-map-layout';

interface RestrictionSite3DProps {
  site: RestrictionSite;
  angle: number;
  lane: number;
  baseRadius: number;
}

export function RestrictionSite3D({ site, angle, lane, baseRadius }: RestrictionSite3DProps) {
  const selectedRestrictionSiteId = useWorkspaceStore(s => s.selectedRestrictionSiteId);
  const selectRestrictionSite = useWorkspaceStore(s => s.selectRestrictionSite);
  
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedRestrictionSiteId === site.id;
  const isEmphasized = hovered || isSelected;

  const { cutRadius, markerStartRadius, markerEndRadius } = useMemo(
    () => getRestrictionMarkerRadii(baseRadius, lane, isEmphasized),
    [baseRadius, lane, isEmphasized]
  );
  
  const markerLength = markerEndRadius - markerStartRadius;
  
  // Radial blade mesh
  const bladeGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(markerLength, 0.06, 0.05);
    // Move center so its left edge is at origin
    geom.translate(markerLength / 2, 0, 0);
    // Translate radially by markerStartRadius
    geom.translate(markerStartRadius, 0, 0);
    // Rotate to angle
    geom.rotateZ(angle);
    // Translate in Z
    geom.translate(0, 0, 0.05);
    return geom;
  }, [angle, markerStartRadius, markerLength]);

  const notchGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // V-shaped cut indicator visibly intersecting the plasmid boundary
    const w = 0.25;
    const h = 0.25;
    shape.moveTo(-w/2, h);
    shape.lineTo(w/2, h);
    shape.lineTo(0, -0.05); // inward penetration
    
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: false,
    });
    
    geom.rotateZ(angle + Math.PI / 2);
    geom.translate(Math.cos(angle) * cutRadius, Math.sin(angle) * cutRadius, 0.05);
    return geom;
  }, [angle, cutRadius]);

  const color = isSelected ? '#3b82f6' : (hovered ? '#60a5fa' : '#9ca3af');
  const emissive = isSelected ? '#3b82f6' : (hovered ? '#60a5fa' : '#000000');
  const emissiveIntensity = isSelected ? 0.6 : (hovered ? 0.4 : 0);

  const labelPos = angleToPosition(angle, markerEndRadius + 0.5);

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectRestrictionSite(site.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
  };

  const endType = useMemo(() => {
    const enzyme = BUILTIN_ENZYMES.find(e => e.id === site.enzymeId);
    return enzyme ? getEndType(enzyme) : 'unknown';
  }, [site.enzymeId]);
  
  return (
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
    >
      <mesh geometry={bladeGeometry}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      <mesh geometry={notchGeometry}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      
      {isEmphasized && (
        <Html position={labelPos} center className="pointer-events-none select-none z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded px-2 py-1.5 shadow-lg whitespace-nowrap text-xs text-[var(--text)] flex flex-col gap-0.5">
            <div className="font-semibold text-blue-500">{site.enzymeName}</div>
            <div className="font-mono text-[10px] text-[var(--text-muted)]">{site.recognitionSequence}</div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {site.forwardCut0 + 1} / {site.reverseCut0 + 1}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] italic">{endType}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
