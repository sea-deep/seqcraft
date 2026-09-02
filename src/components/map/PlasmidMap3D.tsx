import { getMemorySequence } from '../../utils/document-utils';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { PlasmidRing } from './PlasmidRing';
import { FeatureArc3D } from './FeatureArc3D';
import { assignFeatureLanes } from './map-layout';
import { useWorkspaceStore } from '../../state/workspace-store';
import { PlasmidCameraController } from './PlasmidCameraController';
import { SelectionArc3D } from './SelectionArc3D';
import { PlasmidInteractionRing } from './PlasmidInteractionRing';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { assignRestrictionMapLanes } from './restriction-map-layout';
import { RestrictionSite3D } from './RestrictionSite3D';
import { RADIUS, FEATURE_INNER_OFFSET, FEATURE_WIDTH, FEATURE_LANE_SPACING } from './plasmid-geometry';
import { resolveCircularDragRange } from './pointer-coordinate';
import type { SequenceDocument } from '../../domain/document';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RefreshCcw } from 'lucide-react';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { PrimerArc3D } from './PrimerArc3D';

// Helper component to expose camera info to window for Puppeteer tests
function CameraExposer({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    (window as any).__cameraInfo = () => ({
      pos: camera.position.toArray(),
      quat: camera.quaternion.toArray(),
      target: controlsRef.current?.target.toArray()
    });
    return () => {
      delete (window as any).__cameraInfo;
    };
  }, [camera, controlsRef]);
  return null;
}

export function PlasmidMap3D({ document }: { document: SequenceDocument }) {
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [isHoveringRing, setIsHoveringRing] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  
  // Drag selection state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragAnchorRef = useRef<{ coord: number; lastAngle: number; accumulatedDelta: number; fullCircleReached: boolean } | null>(null);

  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);
  const selectedRestrictionSiteId = useWorkspaceStore(s => s.selectedRestrictionSiteId);
  const selectedPrimerId = useWorkspaceStore(s => s.selectedPrimerId);
  const selection = useWorkspaceStore(s => s.selection);
  const setSelection = useWorkspaceStore(s => s.setSelection);
  const selectFeature = useWorkspaceStore(s => s.selectFeature);
  const selectDocumentFeature = useWorkspaceStore(s => s.selectDocumentFeature);

  const formatLen = new Intl.NumberFormat('en-US').format(document.length);
  const placedFeatures = assignFeatureLanes(document.features);
  const maxLane = Math.max(...placedFeatures.map(pf => pf.lane), -1);
  const rawSeq = document.storageMode === 'memory' ? getMemorySequence(document).raw : '';
  const primerBindings = useMemo(() => (document.primers ?? []).flatMap(primer => analyzePrimerBindings(rawSeq, document.topology, primer).map(binding => ({ primer, binding }))), [document.primers, rawSeq, document.topology]);
  const primerLaneCount = Math.min(2, primerBindings.length);
  const maxVisualLane = Math.max(0, maxLane) + primerLaneCount;
  const selectionRadius = RADIUS + FEATURE_INNER_OFFSET + maxVisualLane * (FEATURE_WIDTH + FEATURE_LANE_SPACING) + FEATURE_WIDTH + 0.25;
  const restrictionBaseRadius = selectionRadius + 0.5;

  const restrictionSites = useMemo(() => {
    return analyzeRestrictionSites(rawSeq, document.topology, BUILTIN_ENZYMES);
  }, [rawSeq, document.topology]);
  
  const placedRestrictionSites = useMemo(() => {
    return assignRestrictionMapLanes(restrictionSites, document.length);
  }, [restrictionSites, document.length]);
  
  const selectedFeature = document.features.find(f => f.id === selectedFeatureId) || null;

  const handleDragStart = useCallback((coord: number, angle: number) => {
    if (controlsRef.current) {
      controlsRef.current.enableRotate = false;
    }
    setIsDraggingSelection(true);
    dragAnchorRef.current = {
      coord,
      lastAngle: angle,
      accumulatedDelta: 0,
      fullCircleReached: false
    };
    selectFeature(null);
    const end0 = coord + 1 > document.length ? document.length : coord + 1;
    setSelection(document.id, coord, end0);
  }, [document.id, document.length, selectFeature, setSelection]);

  const handleDragMove = useCallback((coord: number, angle: number) => {
    if (!dragAnchorRef.current) return;
    const { coord: anchorCoord, lastAngle, accumulatedDelta, fullCircleReached } = dragAnchorRef.current;

    let dTheta = angle - lastAngle;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;

    const nextAccumulated = accumulatedDelta + dTheta;
    const isNowFullCircle = fullCircleReached || Math.abs(nextAccumulated) >= Math.PI * 2 - 0.15;

    dragAnchorRef.current.lastAngle = angle;
    dragAnchorRef.current.accumulatedDelta = nextAccumulated;
    dragAnchorRef.current.fullCircleReached = isNowFullCircle;

    const range = resolveCircularDragRange(
      anchorCoord, 
      coord, 
      nextAccumulated, 
      document.length,
      isNowFullCircle
    );

    // Only trigger store update when resolved interval changes
    const currentSelection = useWorkspaceStore.getState().selection;
    if (
      !currentSelection ||
      currentSelection.start0 !== range.start0 ||
      currentSelection.end0Exclusive !== range.end0Exclusive
    ) {
      setSelection(document.id, range.start0, range.end0Exclusive);
    }
  }, [document.id, document.length, setSelection]);

  const handleDragEnd = useCallback(() => {
    dragAnchorRef.current = null;
    setIsDraggingSelection(false);
    // If not hovering ring anymore, rotation is safely available.
    // If hovering, they remain over the ring so rotation remains locked.
    if (controlsRef.current && !isHoveringRing) {
      controlsRef.current.enableRotate = true;
    }
  }, [isHoveringRing]);

  const handleHoverRing = useCallback((hovering: boolean) => {
    setIsHoveringRing(hovering);
    if (controlsRef.current && !isDraggingSelection && !dragAnchorRef.current) {
      controlsRef.current.enableRotate = !hovering;
    }
  }, [isDraggingSelection]);

  // Cursor priority
  const cursorStyle = hoveredFeatureId 
    ? 'pointer' 
    : (isDraggingSelection || isHoveringRing)
      ? 'crosshair'
      : isOrbiting
        ? 'grabbing'
        : 'grab';

  return (
    <div 
      className="w-full h-full relative select-none" 
      style={{ cursor: cursorStyle }}
    >
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setResetToken(t => t + 1)}
          className="flex items-center justify-center p-2 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-colors group"
          title="Reset view"
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      <Canvas camera={{ position: [0, 0, 25], fov: 50 }}>
        <CameraExposer controlsRef={controlsRef} />
        <PlasmidCameraController 
          selectedFeature={selectedFeature}
          selectedRestrictionSite={restrictionSites.find(s => s.id === selectedRestrictionSiteId) || null}
          sequenceLength={document.length}
          controlsRef={controlsRef}
          resetToken={resetToken}
          selection={selection?.documentId === document.id ? selection : null}
          isDraggingSelection={isDraggingSelection}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 15]} intensity={1.5} />
        <directionalLight position={[-10, -20, -15]} intensity={0.5} />
        
        <group rotation={[-18 * Math.PI / 180, 10 * Math.PI / 180, 0]}>
          <PlasmidRing />
          
          {placedFeatures.map((pf) => (
            <FeatureArc3D
              key={pf.feature.id}
              feature={pf.feature}
              sequenceLength={document.length}
              lane={pf.lane}
              isHovered={hoveredFeatureId === pf.feature.id}
              isSelected={selectedFeatureId === pf.feature.id}
              onClick={() => selectDocumentFeature(document.id, pf.feature.id)}
              onHoverChange={(hovered) => {
                if (hovered) setHoveredFeatureId(pf.feature.id);
                else setHoveredFeatureId((cur) => cur === pf.feature.id ? null : cur);
              }}
            />
          ))}

          {primerBindings.map(({ primer, binding }, index) => (
            <PrimerArc3D key={`${primer.id}-${binding.start0}-${binding.orientation}`} primer={primer} binding={binding} sequenceLength={document.length} lane={Math.max(0, maxLane) + 1 + (index % 2)} selected={selectedPrimerId === primer.id} />
          ))}

          {placedRestrictionSites.map((placed) => (
            <RestrictionSite3D
              key={placed.site.id}
              site={placed.site}
              angle={placed.angle}
              lane={placed.lane}
              baseRadius={restrictionBaseRadius}
            />
          ))}

          {/* Dedicated transparent circular interaction ring for direct nucleotide selection */}
          <PlasmidInteractionRing
            sequenceLength={document.length}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onHoverChange={handleHoverRing}
          />

          {selection && selection.documentId === document.id && !selectedFeatureId && (
            <SelectionArc3D 
              start0={selection.start0}
              end0Exclusive={selection.end0Exclusive}
              sequenceLength={document.length}
              baseRadius={selectionRadius}
              showHandles={isDraggingSelection}
            />
          )}
        </group>

        <Html center className="pointer-events-none select-none">
          <div className="text-center font-ui flex flex-col items-center">
            <h1 className="text-[20px] font-semibold text-[var(--text-primary)] whitespace-nowrap">{document.name}</h1>
            <p className="text-[13px] text-[var(--text-secondary)] whitespace-nowrap">{formatLen} bp</p>
          </div>
        </Html>
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={false}
          enableZoom={true} 
          enableRotate={!isDraggingSelection && !isHoveringRing}
          minDistance={17}
          maxDistance={36}
          enableDamping={true}
          dampingFactor={0.09}
          onStart={() => setIsOrbiting(true)}
          onEnd={() => setIsOrbiting(false)}
        />
      </Canvas>
    </div>
  );
}
