import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { Feature } from '../../domain/feature';
import { getFeatureLength } from '../../domain/feature';
import type { SequenceDocument } from '../../domain/document';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { useWorkspaceStore } from '../../state/workspace-store';
import { getMemorySequence } from '../../utils/document-utils';
import { assignFeatureLanes } from './map-layout';
import { circularArcPath, circularPoint, clusterCircularRestrictionSites, localPointToCircularCoordinate, placeCircularFeatureLabels, resolveScreenCircularDragRange } from './circular-map-2d-geometry';

const FEATURE_COLORS: Record<string, string> = {
  CDS: 'var(--bio-cds)', promoter: 'var(--bio-promoter)', origin: 'var(--bio-origin)',
  gene: 'var(--bio-cds)', terminator: 'var(--warning)', 'resistance marker': 'var(--danger)',
  tag: 'var(--bio-primer)', misc_feature: 'var(--bio-misc)', source: 'var(--text-muted)',
};

function featureColor(feature: Feature): string { return FEATURE_COLORS[feature.type] ?? 'var(--bio-misc)'; }

function DirectionMarker({ feature, radius, sequenceLength }: { feature: Feature; radius: number; sequenceLength: number }) {
  const arcLengthPx = getFeatureLength(feature) / Math.max(1, sequenceLength) * Math.PI * 2 * radius;
  if (arcLengthPx < 42) return null;
  const coordinate0 = feature.strand === 1
    ? Math.max(...feature.segments.map(segment => segment.end0Exclusive))
    : Math.min(...feature.segments.map(segment => segment.start0));
  const tip = circularPoint(coordinate0, sequenceLength, radius);
  const arrowSpan = Math.max(1, Math.min(sequenceLength * 0.006, getFeatureLength(feature) * 0.28));
  const backCoordinate0 = coordinate0 + (feature.strand === 1 ? -1 : 1) * arrowSpan;
  const outer = circularPoint(backCoordinate0, sequenceLength, radius + 5);
  const inner = circularPoint(backCoordinate0, sequenceLength, radius - 5);
  return <polyline points={`${outer.x},${outer.y} ${tip.x},${tip.y} ${inner.x},${inner.y}`} fill="none" stroke={featureColor(feature)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />;
}

export function CircularMap2D({ document }: { document: SequenceDocument }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ coordinate0: number; lastAngle: number; accumulated: number } | null>(null);
  const [hoverCoordinate0, setHoverCoordinate0] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
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
  const startSelection = (event: ReactPointerEvent<SVGCircleElement>) => {
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
  const changeZoom = (next: number) => setZoom(Math.min(2.25, Math.max(0.8, Number(next.toFixed(2)))));
  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    changeZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89));
  };

  const selectionSegments = selection && !selectedFeatureId ? (selection.end0Exclusive >= selection.start0
    ? [{ start0: selection.start0, end0Exclusive: selection.end0Exclusive }]
    : [{ start0: selection.start0, end0Exclusive: document.length }, { start0: 0, end0Exclusive: selection.end0Exclusive }]) : [];
  const visibleMin = 360 - 360 / zoom;
  const visibleMax = 360 + 360 / zoom;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-editor)] scientific-grid">
      <div className="absolute left-4 top-4 z-20 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)] p-0.5 shadow-sm">
        <button aria-label="Zoom out" title="Zoom out" onClick={() => changeZoom(zoom / 1.2)} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Minus size={13} /></button>
        <span className="w-11 text-center font-mono text-[9px] text-[var(--text-muted)]">{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" title="Zoom in" onClick={() => changeZoom(zoom * 1.2)} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Plus size={13} /></button>
        <button aria-label="Reset zoom" title="Reset zoom" onClick={() => setZoom(1)} className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><Maximize2 size={12} /></button>
      </div>
      <svg ref={svgRef} viewBox={`${360 - 360 / zoom} ${360 - 360 / zoom} ${720 / zoom} ${720 / zoom}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full touch-none" role="img" aria-label={`2D circular map of ${document.name}`} onWheel={handleWheel}>
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
            return <g key={feature.id} role="button" tabIndex={0} onClick={() => selectDocumentFeature(document.id, feature.id)} className="cursor-pointer" aria-label={`${feature.name}, ${feature.type}, ${feature.strand === 1 ? 'forward' : 'reverse'} strand`}>
              {feature.segments.map((segment, index) => <path key={index} d={circularArcPath(segment, document.length, radius)} fill="none" stroke={featureColor(feature)} strokeWidth={selected ? 14 : 10} strokeLinecap="butt" opacity={selected ? 1 : 0.86} />)}
              <DirectionMarker feature={feature} radius={radius} sequenceLength={document.length} />
            </g>;
          })}
          {selectionSegments.map((segment, index) => <path key={index} d={circularArcPath(segment, document.length, backboneRadius + 14)} fill="none" stroke="var(--selection-border)" strokeWidth="9" strokeLinecap="round" pointerEvents="none" />)}
          {primerBindings.map(({ primer, binding }, index) => <g key={`${primer.id}:${binding.start0}:${binding.orientation}`} onClick={() => selectPrimer(primer.id)} className="cursor-pointer"><path d={binding.segments.map(segment => circularArcPath(segment, document.length, backboneRadius + 28 + index % 2 * 8)).join(' ')} fill="none" stroke="var(--bio-primer)" strokeWidth={selectedPrimerId === primer.id ? 7 : 4} /><title>{primer.name} · {binding.orientation}</title></g>)}
          {restrictionClusters.map(cluster => {
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
