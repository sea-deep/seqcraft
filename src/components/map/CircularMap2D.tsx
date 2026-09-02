import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { LocateFixed, Maximize2, Minus, Plus, Scissors } from 'lucide-react';
import type { Feature } from '../../domain/feature';
import type { SequenceDocument } from '../../domain/document';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { useWorkspaceStore } from '../../state/workspace-store';
import { getMemorySequence } from '../../utils/document-utils';
import { assignFeatureLanes } from './map-layout';
import { circularArcPath, circularPoint, clusterCircularRestrictionSites, createDirectionalCircularArcGeometry, localPointToCircularCoordinate, placeCircularFeatureLabels, resolveScreenCircularDragRange } from './circular-map-2d-geometry';
import { getFeatureColor } from '../../domain/feature-colors';

function featureColor(feature: Feature): string { return getFeatureColor(feature.type); }

export function CircularMap2D({ document }: { document: SequenceDocument }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ coordinate0: number; lastAngle: number; accumulated: number } | null>(null);
  const [hoverCoordinate0, setHoverCoordinate0] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showRestrictionSites, setShowRestrictionSites] = useState(false);
  const [showPrimers, setShowPrimers] = useState(false);
  const sequence = document.storageMode === 'memory' ? getMemorySequence(document).raw : '';
  const placedFeatures = useMemo(() => assignFeatureLanes(document.features), [document.features]);
  const visibleFeatures = useMemo(() => placedFeatures.slice(0, 80), [placedFeatures]);
  const labels = useMemo(() => placeCircularFeatureLabels(visibleFeatures.map(item => item.feature).slice(0, 28), document.length), [document.length, visibleFeatures]);
  const restrictionSites = useMemo(() => sequence && document.length <= 250_000 ? analyzeRestrictionSites(sequence, 'circular', BUILTIN_ENZYMES).slice(0, 160) : [], [document.length, sequence]);
  const restrictionClusters = useMemo(() => clusterCircularRestrictionSites(restrictionSites, document.length), [document.length, restrictionSites]);
  const primerBindings = useMemo(() => (document.primers ?? []).flatMap(primer => analyzePrimerBindings(sequence, 'circular', primer).map(binding => ({ primer, binding }))).slice(0, 80), [document.primers, sequence]);
  const selectedFeatureId = useWorkspaceStore(state => state.selectedFeatureId);
  const selectedRestrictionSiteId = useWorkspaceStore(state => state.selectedRestrictionSiteId);
  const selectedPrimerId = useWorkspaceStore(state => state.selectedPrimerId);
  const selection = useWorkspaceStore(state => state.selection?.documentId === document.id ? state.selection : null);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const selectDocumentFeature = useWorkspaceStore(state => state.selectDocumentFeature);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);
  const backboneRadius = 205;
  const renderedPrimerBindings = showPrimers
    ? primerBindings
    : selectedPrimerId ? primerBindings.filter(({ primer }) => primer.id === selectedPrimerId) : [];
  const renderedRestrictionClusters = showRestrictionSites
    ? restrictionClusters
    : selectedRestrictionSiteId ? restrictionClusters.filter(cluster => cluster.sites.some(site => site.id === selectedRestrictionSiteId)) : [];

  const eventCoordinate = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { coordinate0: 0, angle: 0 };
    const local = point.matrixTransform(matrix.inverse());
    return localPointToCircularCoordinate(local.x, local.y, document.length);
  };
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{ startX: number; startY: number; initialPan: { x: number; y: number } } | null>(null);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const startSelection = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const value = eventCoordinate(event as unknown as ReactPointerEvent<SVGSVGElement>);
    dragRef.current = { coordinate0: value.coordinate0, lastAngle: value.angle, accumulated: 0 };
    setSelection(document.id, value.coordinate0, Math.min(document.length, value.coordinate0 + 1));
  };
  const moveSelection = (event: ReactPointerEvent<SVGCircleElement>) => {
    const value = eventCoordinate(event as unknown as ReactPointerEvent<SVGSVGElement>);
    setHoverCoordinate0(value.coordinate0);
    if (!dragRef.current) return;
    let delta = value.angle - dragRef.current.lastAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    dragRef.current.accumulated += delta;
    dragRef.current.lastAngle = value.angle;
    const range = resolveScreenCircularDragRange(dragRef.current.coordinate0, value.coordinate0, dragRef.current.accumulated, document.length, Math.abs(dragRef.current.accumulated) >= Math.PI * 2 - 0.15);
    const current = useWorkspaceStore.getState().selection;
    if (!current || current.documentId !== document.id || current.start0 !== range.start0 || current.end0Exclusive !== range.end0Exclusive) setSelection(document.id, range.start0, range.end0Exclusive);
  };
  const endSelection = () => { dragRef.current = null; };

  const startPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest?.('circle.editor-cursor-radial') || target.closest?.('[role="button"]') || target.closest?.('g.cursor-pointer')) return;
    setIsPanning(true);
    panDragRef.current = { startX: event.clientX, startY: event.clientY, initialPan: { ...pan } };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer capture optional */ }
  };
  const movePan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panDragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = (720 / zoom) / rect.width;
    const dx = (event.clientX - panDragRef.current.startX) * scale;
    const dy = (event.clientY - panDragRef.current.startY) * scale;
    setPan({
      x: panDragRef.current.initialPan.x + dx,
      y: panDragRef.current.initialPan.y + dy,
    });
  };
  const endPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panDragRef.current = null;
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer capture optional */ }
    }
  };

  const changeZoom = (next: number) => setZoom(Math.min(4.0, Math.max(0.6, Number(next.toFixed(2)))));
  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const nx = mouseX / rect.width;
    const ny = mouseY / rect.height;

    const factor = event.deltaY < 0 ? 1.14 : 0.88;
    const newZoom = Math.min(4.0, Math.max(0.6, zoom * factor));
    if (newZoom === zoom) return;

    const currentW = 720 / zoom;
    const currentH = 720 / zoom;
    const newW = 720 / newZoom;
    const newH = 720 / newZoom;

    setPan(prev => ({
      x: prev.x + (nx - 0.5) * (currentW - newW),
      y: prev.y + (ny - 0.5) * (currentH - newH),
    }));
    setZoom(newZoom);
  };

  const selectionSegments = selection && !selectedFeatureId ? (selection.end0Exclusive >= selection.start0
    ? [{ start0: selection.start0, end0Exclusive: selection.end0Exclusive }]
    : [{ start0: selection.start0, end0Exclusive: document.length }, { start0: 0, end0Exclusive: selection.end0Exclusive }]) : [];

  const viewW = 720 / zoom;
  const viewH = 720 / zoom;
  const viewX = 360 - 360 / zoom - pan.x;
  const viewY = 360 - 360 / zoom - pan.y;
  const visibleMin = viewX;
  const visibleMax = viewX + viewW;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-editor)] scientific-grid">
      <div className="absolute left-4 top-4 z-20 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)] p-0.5 shadow-sm">
        <button aria-label="Zoom out" title="Zoom out" onClick={() => changeZoom(zoom / 1.25)} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Minus size={13} /></button>
        <button aria-label="Reset view" title="Click to reset (100%)" onClick={resetView} className="w-11 text-center font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--text)]">{Math.round(zoom * 100)}%</button>
        <button aria-label="Zoom in" title="Zoom in" onClick={() => changeZoom(zoom * 1.25)} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Plus size={13} /></button>
        <button aria-label="Reset zoom" title="Reset zoom" onClick={resetView} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Maximize2 size={12} /></button>
        {(restrictionClusters.length > 0 || primerBindings.length > 0) && <span className="mx-1 h-4 w-px bg-[var(--border)]" />}
        {restrictionClusters.length > 0 && <button aria-label="Toggle restriction sites" aria-pressed={showRestrictionSites} title="Show or hide restriction sites" onClick={() => setShowRestrictionSites(value => !value)} className={`flex h-7 items-center gap-1 rounded px-2 text-[10px] ${showRestrictionSites ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}><Scissors size={11} />Sites</button>}
        {primerBindings.length > 0 && <button aria-label="Toggle primers" aria-pressed={showPrimers} title="Show or hide primer bindings" onClick={() => setShowPrimers(value => !value)} className={`flex h-7 items-center gap-1 rounded px-2 text-[10px] ${showPrimers ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}><LocateFixed size={11} />Primers</button>}
      </div>
      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="img"
        aria-label={`2D circular map of ${document.name}`}
        onWheel={handleWheel}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <g>
          {Array.from({ length: 12 }, (_, index) => index).map(index => {
            const fraction = index / 12;
            const major = index % 3 === 0;
            const point1 = circularPoint(document.length * fraction, document.length, backboneRadius - (major ? 10 : 5));
            const point2 = circularPoint(document.length * fraction, document.length, backboneRadius + (major ? 10 : 5));
            const angleLabel = circularPoint(document.length * fraction, document.length, backboneRadius + 30);
            const baseLabel = circularPoint(document.length * fraction, document.length, backboneRadius - 22);
            return <g key={index}><line x1={point1.x} y1={point1.y} x2={point2.x} y2={point2.y} stroke="var(--border-strong)" strokeWidth={major ? 1.5 : 1} />{index !== 0 && <text x={angleLabel.x} y={angleLabel.y} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text-muted)] font-mono text-[8px]">{index * 30}°</text>}{major && index !== 0 && <text x={baseLabel.x} y={baseLabel.y} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text-muted)] font-mono text-[9px]">{Math.round(document.length * fraction).toLocaleString()}</text>}</g>;
          })}
          <circle cx="360" cy="360" r={backboneRadius} fill="none" stroke="var(--border-strong)" strokeWidth="7" />
          <circle cx="360" cy="360" r={backboneRadius + 12} fill="none" stroke="transparent" strokeWidth="24" className="editor-cursor-radial" onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={endSelection} onPointerCancel={endSelection} onPointerLeave={() => setHoverCoordinate0(null)} />
          {(() => { const start = circularPoint(0, document.length, backboneRadius + 8); const end = circularPoint(0, document.length, backboneRadius + 24); const label = circularPoint(0, document.length, backboneRadius + 39); return <g><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--accent)" strokeWidth="2" /><circle cx={end.x} cy={end.y} r="2.5" fill="var(--accent)" /><text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--accent)] font-ui text-[9px] font-semibold">ORIGIN · 1</text></g>; })()}
          {visibleFeatures.map(({ feature, lane }) => {
            const radius = backboneRadius - 22 - lane * 18;
            const selected = selectedFeatureId === feature.id;
            const ribbonWidth = selected ? 14 : 10;
            return <g key={feature.id} role="button" tabIndex={0} onClick={() => selectDocumentFeature(document.id, feature.id)} className="cursor-pointer" aria-label={`${feature.name}, ${feature.type}, ${feature.strand === 1 ? 'forward' : 'reverse'} strand`}>
              {feature.segments.map((_segment, index) => {
                const geometry = createDirectionalCircularArcGeometry(feature, index, document.length, radius, ribbonWidth);
                return <g key={index} opacity={selected ? 1 : 0.86} style={selected ? { filter: 'drop-shadow(0 0 2.5px var(--selection-border))' } : undefined}><path d={circularArcPath(geometry.bodyInterval, document.length, radius)} fill="none" stroke={featureColor(feature)} strokeWidth={ribbonWidth} strokeLinecap="butt" />{geometry.arrowPoints && <polygon points={geometry.arrowPoints.map(point => `${point.x},${point.y}`).join(' ')} fill={featureColor(feature)} />}</g>;
              })}
            </g>;
          })}
          {selectionSegments.map((segment, index) => <path key={index} d={circularArcPath(segment, document.length, backboneRadius + 14)} fill="none" stroke="var(--selection-border)" strokeWidth="9" strokeLinecap="round" pointerEvents="none" />)}
          {renderedPrimerBindings.map(({ primer, binding }, index) => {
            const primerRadius = backboneRadius + 28 + (index % 2) * 9;
            const isSelected = selectedPrimerId === primer.id;
            const primerWidth = isSelected ? 6 : 4;
            const reverse = binding.orientation === 'reverse';
            return (
              <g 
                key={`${primer.id}:${binding.start0}:${binding.orientation}`} 
                onClick={() => { setSelection(document.id, binding.start0, binding.end0Exclusive); selectPrimer(primer.id); }} 
                className="cursor-pointer"
                style={isSelected ? { filter: 'drop-shadow(0 0 2px var(--selection-border))' } : undefined}
              >
                <title>{`${primer.name} · ${binding.orientation} primer`}</title>
                {binding.segments.map((segment, segIdx) => {
                  const isTerminal = segIdx === (reverse ? 0 : binding.segments.length - 1);
                  const segSpan = segment.end0Exclusive - segment.start0;
                  const arrowLengthBp = isTerminal ? Math.min(segSpan * 0.45, (document.length / (2 * Math.PI * primerRadius)) * 9) : 0;
                  
                  let bodyStart0 = segment.start0;
                  let bodyEnd0 = segment.end0Exclusive;
                  let arrowPoints: { x: number; y: number }[] | null = null;
                  
                  if (isTerminal && arrowLengthBp > 0) {
                    if (!reverse) {
                      bodyEnd0 = Math.max(segment.start0, segment.end0Exclusive - arrowLengthBp);
                      const tip = circularPoint(segment.end0Exclusive, document.length, primerRadius);
                      const left = circularPoint(bodyEnd0, document.length, primerRadius + primerWidth * 0.85);
                      const right = circularPoint(bodyEnd0, document.length, primerRadius - primerWidth * 0.85);
                      arrowPoints = [tip, left, right];
                    } else {
                      bodyStart0 = Math.min(segment.end0Exclusive, segment.start0 + arrowLengthBp);
                      const tip = circularPoint(segment.start0, document.length, primerRadius);
                      const left = circularPoint(bodyStart0, document.length, primerRadius + primerWidth * 0.85);
                      const right = circularPoint(bodyStart0, document.length, primerRadius - primerWidth * 0.85);
                      arrowPoints = [tip, left, right];
                    }
                  }
                  
                  return (
                    <g key={segIdx}>
                      <path
                        d={circularArcPath({ start0: bodyStart0, end0Exclusive: bodyEnd0 }, document.length, primerRadius)}
                        fill="none"
                        stroke="var(--bio-primer)"
                        strokeWidth={primerWidth}
                        strokeLinecap={arrowPoints ? 'butt' : 'round'}
                      />
                      {arrowPoints && (
                        <polygon
                          points={arrowPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="var(--bio-primer)"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {renderedRestrictionClusters.map(cluster => {
            const representative = cluster.sites[0];
            const selected = cluster.sites.some(site => site.id === selectedRestrictionSiteId);
            const inner = circularPoint(cluster.coordinate0, document.length, backboneRadius + 24);
            const outer = circularPoint(cluster.coordinate0, document.length, backboneRadius + 34);
            const title = cluster.sites.map(site => `${site.enzymeName} ${site.forwardCut0 + 1}`).join(' · ');
            return <g key={cluster.sites.map(site => site.id).join(':')} className="cursor-pointer" onClick={() => selectRestrictionSite(representative.id)}><title>{title}</title><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={selected ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={selected ? 2.5 : 1.5} />{cluster.sites.length > 1 ? <><circle cx={outer.x} cy={outer.y} r="7" fill="var(--panel)" stroke={selected ? 'var(--accent)' : 'var(--border-strong)'} /><text x={outer.x} y={outer.y} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-[var(--text-secondary)] font-mono text-[7px]">{cluster.sites.length}</text></> : <circle cx={outer.x} cy={outer.y} r="2.5" fill={selected ? 'var(--accent)' : 'var(--text-muted)'} />}</g>;
          })}
          {labels.map(label => {
            const feature = visibleFeatures.find(item => item.feature.id === label.featureId)!.feature;
            const labelX = label.side === 'left' ? visibleMin + 14 : visibleMax - 14;
            const elbowX = label.side === 'left' ? visibleMin + 62 : visibleMax - 62;
            return <g key={label.featureId} pointerEvents="none"><polyline points={`${label.anchor.x},${label.anchor.y} ${elbowX},${label.y} ${labelX},${label.y}`} fill="none" stroke="var(--border-strong)" strokeWidth="1" /><circle cx={label.anchor.x} cy={label.anchor.y} r="2" fill={featureColor(feature)} /><text x={labelX} y={label.y} textAnchor={label.side === 'left' ? 'start' : 'end'} dominantBaseline="middle" className="fill-[var(--text)] font-ui text-[10px] font-medium">{feature.name}</text></g>;
          })}
          <circle cx="360" cy="360" r="126" fill="var(--panel)" stroke="var(--border)" />
          <text x="360" y="345" textAnchor="middle" className="fill-[var(--text)] font-ui text-[17px] font-semibold">{document.name}</text>
          <text x="360" y="368" textAnchor="middle" className="fill-[var(--text-secondary)] font-mono text-[12px]">{document.length.toLocaleString()} bp · circular</text>
          <text x="360" y="391" textAnchor="middle" className="fill-[var(--accent)] font-mono text-[11px]">{hoverCoordinate0 === null ? 'drag ring to select' : `base ${hoverCoordinate0 + 1} · ${Math.round(hoverCoordinate0 / document.length * 360)}°`}</text>
        </g>
      </svg>
      {placedFeatures.length > visibleFeatures.length && <div className="absolute bottom-4 right-4 rounded border border-[var(--warning)]/30 bg-[var(--panel)] px-2 py-1 text-[10px] text-[var(--warning)]">Showing first {visibleFeatures.length} of {placedFeatures.length} annotations</div>}
    </div>
  );
}
