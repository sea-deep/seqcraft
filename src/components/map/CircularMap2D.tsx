import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { LocateFixed, Maximize2, Minus, Plus, Scissors } from 'lucide-react';
import type { Feature } from '../../domain/feature';
import type { SequenceDocument } from '../../domain/document';
import type { RestrictionCategory } from '../../domain/restriction';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { useWorkspaceStore } from '../../state/workspace-store';
import { getMemorySequence } from '../../utils/document-utils';
import { assignFeatureLanes } from './map-layout';
import {
  circularArcPath,
  circularPoint,
  clusterCircularRestrictionSites,
  createDirectionalCircularArcGeometry,
  localPointToCircularCoordinate,
  resolveScreenCircularDragRange,
  circularCoordinateToAngle,
  featureMidpoint0
} from './circular-map-2d-geometry';
import { getFeatureColor } from '../../domain/feature-colors';
import { getFeatureTypeMetadata, type FeatureCategory } from '../../domain/feature-ontology';

function featureColor(feature: Feature): string {
  return getFeatureColor(feature.type);
}

/**
 * Wraps or truncates SVG center title text so it strictly fits inside the circular map badge.
 * Max chord width at radius 120 is ~230px, comfortable text width is ~180-195px (~22-25 characters per line).
 */
function wrapSvgCenterTitle(name: string, maxLines = 2, maxCharsPerLine = 22): string[] {
  if (!name) return [''];
  if (name.length <= maxCharsPerLine) return [name];

  const tokens = name.split(/(?<=\s|[-_+/:])/);
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if ((current + token).length <= maxCharsPerLine) {
      current += token;
    } else {
      if (current.trim()) {
        lines.push(current.trim());
      }
      if (lines.length === maxLines - 1) {
        const remaining = tokens.slice(i).join('').trim();
        if (remaining.length > maxCharsPerLine) {
          lines.push(remaining.slice(0, Math.max(1, maxCharsPerLine - 1)).trimEnd() + '…');
        } else {
          lines.push(remaining);
        }
        return lines;
      }
      current = token;
      while (current.length > maxCharsPerLine && lines.length < maxLines - 1) {
        lines.push(current.slice(0, maxCharsPerLine));
        current = current.slice(maxCharsPerLine);
      }
    }
  }

  if (current.trim() && lines.length < maxLines) {
    lines.push(current.trim());
  }

  if (lines.length === 0) {
    return [name.slice(0, maxCharsPerLine - 1) + '…'];
  }

  return lines;
}

type CutterFilter = 'all' | 'unique' | 'double';
type EnzymeCategoryFilter = 'all' | RestrictionCategory;

export function CircularMap2D({ document }: { document: SequenceDocument }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ coordinate0: number; lastAngle: number; accumulated: number } | null>(null);
  const [hoverCoordinate0, setHoverCoordinate0] = useState<number | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showRestrictionSites, setShowRestrictionSites] = useState(true);
  const [showPrimers, setShowPrimers] = useState(false);
  const [cutterFilter, setCutterFilter] = useState<CutterFilter>('unique');
  const [categoryFilter, setCategoryFilter] = useState<EnzymeCategoryFilter>('all');
  const [featureCatFilter, setFeatureCatFilter] = useState<'all' | FeatureCategory>('all');

  const sequence = document.storageMode === 'memory' ? getMemorySequence(document).raw : '';

  // Filter features by biological category
  const filteredFeatures = useMemo(() => {
    if (featureCatFilter === 'all') return document.features;
    return document.features.filter(f => {
      const meta = getFeatureTypeMetadata(f.type);
      return meta.category === featureCatFilter;
    });
  }, [document.features, featureCatFilter]);

  const placedFeatures = useMemo(() => assignFeatureLanes(filteredFeatures), [filteredFeatures]);
  const visibleFeatures = useMemo(() => placedFeatures.slice(0, 100), [placedFeatures]);

  // Analyze all 80+ restriction enzymes
  const rawRestrictionSites = useMemo(() => {
    return sequence && document.length <= 500_000
      ? analyzeRestrictionSites(sequence, 'circular', BUILTIN_ENZYMES)
      : [];
  }, [document.length, sequence]);

  const siteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const site of rawRestrictionSites) {
      counts.set(site.enzymeId, (counts.get(site.enzymeId) ?? 0) + 1);
    }
    return counts;
  }, [rawRestrictionSites]);

  // Apply cutter count & category filters
  const filteredRestrictionSites = useMemo(() => {
    return rawRestrictionSites.filter(site => {
      const enzyme = BUILTIN_ENZYMES.find(e => e.id === site.enzymeId);
      const count = siteCounts.get(site.enzymeId) ?? 0;

      const countMatch =
        cutterFilter === 'all' ||
        (cutterFilter === 'unique' && count === 1) ||
        (cutterFilter === 'double' && count === 2);

      const catMatch =
        categoryFilter === 'all' ||
        (categoryFilter === 'common_cloning' && enzyme?.isCommon) ||
        enzyme?.category === categoryFilter;

      return countMatch && catMatch;
    });
  }, [rawRestrictionSites, cutterFilter, categoryFilter, siteCounts]);

  const restrictionClusters = useMemo(() => {
    return clusterCircularRestrictionSites(filteredRestrictionSites, document.length);
  }, [document.length, filteredRestrictionSites]);

  const primerBindings = useMemo(() => {
    return (document.primers ?? [])
      .flatMap(primer => analyzePrimerBindings(sequence, 'circular', primer).map(binding => ({ primer, binding })))
      .slice(0, 80);
  }, [document.primers, sequence]);

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
    : selectedPrimerId
    ? primerBindings.filter(({ primer }) => primer.id === selectedPrimerId)
    : [];

  const renderedRestrictionClusters = showRestrictionSites
    ? restrictionClusters
    : selectedRestrictionSiteId
    ? restrictionClusters.filter(cluster => cluster.sites.some(site => site.id === selectedRestrictionSiteId))
    : [];

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
    const range = resolveScreenCircularDragRange(
      dragRef.current.coordinate0,
      value.coordinate0,
      dragRef.current.accumulated,
      document.length,
      Math.abs(dragRef.current.accumulated) >= Math.PI * 2 - 0.15
    );
    const current = useWorkspaceStore.getState().selection;
    if (
      !current ||
      current.documentId !== document.id ||
      current.start0 !== range.start0 ||
      current.end0Exclusive !== range.end0Exclusive
    ) {
      setSelection(document.id, range.start0, range.end0Exclusive);
    }
  };

  const endSelection = () => {
    dragRef.current = null;
  };

  const startPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (
      target.closest?.('circle.editor-cursor-radial') ||
      target.closest?.('[role="button"]') ||
      target.closest?.('g.cursor-pointer')
    )
      return;
    setIsPanning(true);
    panDragRef.current = { startX: event.clientX, startY: event.clientY, initialPan: { ...pan } };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
  };

  const movePan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panDragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = 720 / zoom / rect.width;
    const dx = (event.clientX - panDragRef.current.startX) * scale;
    const dy = (event.clientY - panDragRef.current.startY) * scale;
    setPan({
      x: panDragRef.current.initialPan.x + dx,
      y: panDragRef.current.initialPan.y + dy
    });
  };

  const endPan = () => {
    setIsPanning(false);
    panDragRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 0.85;
    changeZoom(zoom * factor, event.clientX, event.clientY);
  };

  const changeZoom = (targetZoom: number, clientX?: number, clientY?: number) => {
    const newZoom = Math.max(0.5, Math.min(8, targetZoom));
    if (newZoom === zoom) return;

    const svg = svgRef.current;
    if (!svg || clientX === undefined || clientY === undefined) {
      setZoom(newZoom);
      return;
    }

    const rect = svg.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;

    const currentW = 720 / zoom;
    const currentH = 720 / zoom;
    const newW = 720 / newZoom;
    const newH = 720 / newZoom;

    setPan(prev => ({
      x: prev.x + (nx - 0.5) * (currentW - newW),
      y: prev.y + (ny - 0.5) * (currentH - newH)
    }));
    setZoom(newZoom);
  };

  const selectionSegments =
    selection && !selectedFeatureId
      ? selection.end0Exclusive >= selection.start0
        ? [{ start0: selection.start0, end0Exclusive: selection.end0Exclusive }]
        : [
            { start0: selection.start0, end0Exclusive: document.length },
            { start0: 0, end0Exclusive: selection.end0Exclusive }
          ]
      : [];

  const viewW = 720 / zoom;
  const viewH = 720 / zoom;
  const viewX = 360 - 360 / zoom - pan.x;
  const viewY = 360 - 360 / zoom - pan.y;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-editor)] scientific-grid">
      {/* Top Left Navigation & Scientific Layers Toolbar */}
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-sm p-1 shadow-md text-xs max-w-[calc(100%-190px)]">
        {/* Zoom Controls */}
        <div className="flex items-center rounded border border-[var(--border)] bg-[var(--bg)] p-0.5">
          <button
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => changeZoom(zoom / 1.25)}
            className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <Minus size={12} />
          </button>
          <button
            aria-label="Reset view"
            title="Click to reset (100%)"
            onClick={resetView}
            className="w-10 text-center font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => changeZoom(zoom * 1.25)}
            className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Plus size={12} />
          </button>
          <button
            aria-label="Reset zoom"
            title="Reset zoom"
            onClick={resetView}
            className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Maximize2 size={11} />
          </button>
        </div>

        <span className="h-4 w-px bg-[var(--border)]" />

        {/* Restriction Site Layers & Filters */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Toggle restriction sites"
            aria-pressed={showRestrictionSites}
            title="Show or hide restriction sites"
            onClick={() => setShowRestrictionSites(v => !v)}
            className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors cursor-pointer ${
              showRestrictionSites
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Scissors size={11} />
            Sites ({filteredRestrictionSites.length})
          </button>

          {showRestrictionSites && (
            <>
              {/* Cutter count filter */}
              <select
                value={cutterFilter}
                onChange={e => setCutterFilter(e.target.value as CutterFilter)}
                className="h-6 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 text-[10px] text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
                title="Filter by cut frequency"
              >
                <option value="unique">Unique (1-cut)</option>
                <option value="double">2 Cutters</option>
                <option value="all">All Cutters</option>
              </select>

              {/* Enzyme category filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as EnzymeCategoryFilter)}
                className="h-6 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 text-[10px] text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
                title="Filter by commercial enzyme class"
              >
                <option value="all">All Classes</option>
                <option value="common_cloning">Common Cloning</option>
                <option value="type_iis">Type IIS (Golden Gate)</option>
                <option value="rare_cutter">8-Cutters</option>
                <option value="diagnostic_4cutter">4-Cutters</option>
              </select>
            </>
          )}
        </div>

        <span className="h-4 w-px bg-[var(--border)]" />

        {/* Feature Category Filter */}
        <select
          value={featureCatFilter}
          onChange={e => setFeatureCatFilter(e.target.value as any)}
          className="h-6 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 text-[10px] text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
          title="Filter annotations by biological category"
        >
          <option value="all">All Features ({document.features.length})</option>
          <option value="coding">Coding & Genes</option>
          <option value="regulatory">Promoters / Signals</option>
          <option value="synthetic">Markers / Tags / Recombination</option>
          <option value="rna">ncRNA / Riboswitches</option>
          <option value="structural">Origins & Structural</option>
          <option value="binding">Binding & CRISPR</option>
        </select>

        {primerBindings.length > 0 && (
          <button
            aria-label="Toggle primers"
            aria-pressed={showPrimers}
            title="Show or hide primer bindings"
            onClick={() => setShowPrimers(v => !v)}
            className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors cursor-pointer ${
              showPrimers
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'
            }`}
          >
            <LocateFixed size={11} /> Primers ({primerBindings.length})
          </button>
        )}
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
          {/* Plasmid base pair axis ticks */}
          {(() => {
            if (document.length <= 0) return null;
            const tickInterval =
              document.length <= 1500
                ? 250
                : document.length <= 3000
                ? 500
                : document.length <= 8000
                ? 1000
                : document.length <= 20000
                ? 2500
                : 5000;
            const ticks: { bp: number; isMajor: boolean }[] = [];
            for (let bp = tickInterval; bp < document.length; bp += tickInterval) {
              ticks.push({ bp, isMajor: bp % (tickInterval * 2) === 0 });
            }
            return ticks.map(({ bp, isMajor }) => {
              const tickStart = circularPoint(bp, document.length, backboneRadius);
              const tickEnd = circularPoint(bp, document.length, backboneRadius + (isMajor ? 6 : 3.5));
              const labelPos = circularPoint(bp, document.length, backboneRadius + 16);
              return (
                <g key={bp} pointerEvents="none">
                  <line
                    x1={tickStart.x}
                    y1={tickStart.y}
                    x2={tickEnd.x}
                    y2={tickEnd.y}
                    stroke="var(--border-strong)"
                    strokeWidth={isMajor ? 1.5 : 1}
                  />
                  {isMajor && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-[var(--text-muted)] font-mono text-[11px]"
                    >
                      {bp >= 1000 ? `${(bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1)}k` : `${bp}`}
                    </text>
                  )}
                </g>
              );
            });
          })()}

          {/* Plasmid backbone ring */}
          <circle cx="360" cy="360" r={backboneRadius} fill="none" stroke="var(--border-strong)" strokeWidth="6" />
          <circle
            cx="360"
            cy="360"
            r={backboneRadius + 12}
            fill="none"
            stroke="transparent"
            strokeWidth="24"
            className="editor-cursor-radial"
            onPointerDown={startSelection}
            onPointerMove={moveSelection}
            onPointerUp={endSelection}
            onPointerCancel={endSelection}
            onPointerLeave={() => setHoverCoordinate0(null)}
          />

          {/* Origin Marker at top */}
          {(() => {
            const start = circularPoint(0, document.length, backboneRadius - 2);
            const end = circularPoint(0, document.length, backboneRadius + 10);
            const label = circularPoint(0, document.length, backboneRadius + 22);
            return (
              <g pointerEvents="none">
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--accent)" strokeWidth="2" />
                <circle cx={end.x} cy={end.y} r="2.5" fill="var(--accent)" />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[var(--accent)] font-ui text-[11px] font-semibold"
                >
                  ORIGIN · 1
                </text>
              </g>
            );
          })()}

          {/* Biological Features (annular ribbons inside backbone) */}
          {visibleFeatures.map(({ feature, lane }) => {
            const radius = backboneRadius - 22 - lane * 18;
            const selected = selectedFeatureId === feature.id;
            const ribbonWidth = selected ? 14 : 10;
            const isCrispr = feature.type === 'crispr_target';

            return (
              <g
                key={feature.id}
                role="button"
                tabIndex={0}
                onClick={() => selectDocumentFeature(document.id, feature.id)}
                onPointerEnter={() => setHoveredFeature(feature)}
                onPointerLeave={() => setHoveredFeature(null)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectDocumentFeature(document.id, feature.id);
                  }
                }}
                className="cursor-pointer"
                aria-label={`${feature.name}, ${feature.type}, ${feature.strand === 1 ? 'forward' : 'reverse'} strand`}
              >
                {feature.segments.map((_segment, index) => {
                  const geometry = createDirectionalCircularArcGeometry(
                    feature,
                    index,
                    document.length,
                    radius,
                    ribbonWidth
                  );
                  return (
                    <g key={index} opacity={selected ? 1 : 0.88}>
                      <path
                        d={circularArcPath(geometry.bodyInterval, document.length, radius)}
                        fill="none"
                        stroke={featureColor(feature)}
                        strokeWidth={ribbonWidth}
                        strokeLinecap="butt"
                        strokeDasharray={isCrispr ? '4 2' : undefined}
                      />
                      {geometry.arrowPoints && (
                        <polygon
                          points={geometry.arrowPoints.map(point => `${point.x},${point.y}`).join(' ')}
                          fill={featureColor(feature)}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Selection Highlight directly on the backbone */}
          {selectionSegments.map((segment, index) => (
            <g key={index} pointerEvents="none">
              <path
                d={circularArcPath(segment, document.length, backboneRadius)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="11"
                strokeOpacity="0.35"
                strokeLinecap="round"
              />
              <path
                d={circularArcPath(segment, document.length, backboneRadius)}
                fill="none"
                stroke="var(--selection-border)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Primers */}
          {renderedPrimerBindings.map(({ primer, binding }, index) => {
            const primerRadius = backboneRadius + 28 + (index % 2) * 9;
            const isSelected = selectedPrimerId === primer.id;
            const primerWidth = isSelected ? 6 : 4;
            const reverse = binding.orientation === 'reverse';
            return (
              <g
                key={`${primer.id}:${binding.start0}:${binding.orientation}`}
                role="button"
                tabIndex={0}
                aria-label={`${primer.name}, ${binding.orientation} primer`}
                onClick={() => {
                  setSelection(document.id, binding.start0, binding.end0Exclusive);
                  selectPrimer(primer.id);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelection(document.id, binding.start0, binding.end0Exclusive);
                    selectPrimer(primer.id);
                  }
                }}
                className="cursor-pointer"
              >
                <title>{`${primer.name} · ${binding.orientation} primer`}</title>
                {binding.segments.map((segment, segIdx) => {
                  const isTerminal = segIdx === (reverse ? 0 : binding.segments.length - 1);
                  const segSpan = segment.end0Exclusive - segment.start0;
                  const arrowLengthBp = isTerminal
                    ? Math.min(segSpan * 0.45, (document.length / (2 * Math.PI * primerRadius)) * 9)
                    : 0;

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
                        <polygon points={arrowPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="var(--bio-primer)" />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Restriction Clusters with Type IIS & Rare-cutter distinctions */}
          {renderedRestrictionClusters.map(cluster => {
            const representative = cluster.sites[0];
            const selected = cluster.sites.some(site => site.id === selectedRestrictionSiteId);
            const enzyme = BUILTIN_ENZYMES.find(e => e.id === representative.enzymeId);
            const isTypeIIS = enzyme?.enzymeClass === 'type_iis';
            const isRare8 = enzyme?.category === 'rare_cutter';
            const isUnique = (siteCounts.get(representative.enzymeId) ?? 0) === 1;

            const strokeColor = selected
              ? 'var(--accent)'
              : isTypeIIS
              ? '#f59e0b' // Amber for Type IIS Golden Gate
              : isRare8
              ? '#a855f7' // Purple for rare 8-cutters
              : isUnique
              ? 'var(--accent)'
              : 'var(--text-muted)';

            const inner = circularPoint(cluster.coordinate0, document.length, backboneRadius + 6);
            const outer = circularPoint(cluster.coordinate0, document.length, backboneRadius + 16);
            const title = cluster.sites
              .map(site => `${site.enzymeName} (${site.forwardCut0 + 1}) [${site.recognitionSequence}]`)
              .join('\n');

            return (
              <g
                key={cluster.sites.map(site => site.id).join(':')}
                role="button"
                tabIndex={0}
                aria-label={`Show restriction site ${title}`}
                className="cursor-pointer"
                onClick={() => selectRestrictionSite(representative.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectRestrictionSite(representative.id);
                  }
                }}
              >
                <title>{title}</title>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={strokeColor}
                  strokeWidth={selected ? 2.5 : isTypeIIS || isRare8 ? 2 : 1.5}
                />
                {cluster.sites.length > 1 ? (
                  <>
                    <circle
                      cx={outer.x}
                      cy={outer.y}
                      r="7"
                      fill="var(--panel)"
                      stroke={strokeColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x={outer.x}
                      y={outer.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none fill-[var(--text)] font-mono text-[10px] font-bold"
                    >
                      {cluster.sites.length}
                    </text>
                  </>
                ) : (
                  <circle cx={outer.x} cy={outer.y} r="2.5" fill={strokeColor} />
                )}
              </g>
            );
          })}

          {/* Feature Labels with localized radial leader lines */}
          {visibleFeatures.map(({ feature, lane }) => {
            const radius = backboneRadius - 22 - lane * 18;
            const midpoint0 = featureMidpoint0(feature, document.length);
            const angle = circularCoordinateToAngle(midpoint0, document.length);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const outerLabelRadius = backboneRadius + 36 + (lane % 2) * 16;
            const innerPoint = circularPoint(midpoint0, document.length, radius + 7);
            const textPoint = circularPoint(midpoint0, document.length, outerLabelRadius);
            const textAnchor = cosA > 0.15 ? 'start' : cosA < -0.15 ? 'end' : 'middle';
            const dominantBaseline = sinA > 0.4 ? 'hanging' : sinA < -0.4 ? 'auto' : 'middle';
            const selected = selectedFeatureId === feature.id;

            return (
              <g key={`radial-label-${feature.id}`} pointerEvents="none">
                <line
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={textPoint.x}
                  y2={textPoint.y}
                  stroke="var(--border-strong)"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                  opacity={selected ? 1 : 0.6}
                />
                <circle cx={innerPoint.x} cy={innerPoint.y} r="2" fill={featureColor(feature)} />
                <text
                  x={textPoint.x}
                  y={textPoint.y}
                  textAnchor={textAnchor}
                  dominantBaseline={dominantBaseline}
                  className={`font-ui text-[11px] transition-colors ${
                    selected ? 'fill-[var(--accent)] font-bold' : 'fill-[var(--text)] font-medium'
                  }`}
                >
                  <title>{feature.name}</title>
                  {feature.name.length > 22 ? `${feature.name.slice(0, 20)}…` : feature.name}
                </text>
              </g>
            );
          })}

          {/* Center Informational Badge with Feature Inspector Details */}
          <circle cx="360" cy="360" r={120} fill="var(--panel)" stroke="var(--border)" className="shadow-inner" />
          
          {/* Plasmid Name (wrapped to safe chord width inside r=120 badge) */}
          {(() => {
            const titleLines = wrapSvgCenterTitle(document.name, hoveredFeature ? 2 : 3, 22);
            const isSingle = titleLines.length === 1;

            return (
              <text
                x="360"
                textAnchor="middle"
                className={`fill-[var(--text)] font-ui font-semibold select-none ${
                  isSingle ? 'text-[15px]' : titleLines.length === 2 ? 'text-[13px]' : 'text-[12px]'
                }`}
              >
                <title>{document.name}</title>
                {titleLines.map((line, idx) => {
                  let y = 345;
                  if (hoveredFeature) {
                    y = titleLines.length === 1 ? 324 : 316 + idx * 15;
                  } else {
                    if (titleLines.length === 1) y = 345;
                    else if (titleLines.length === 2) y = 336 + idx * 16;
                    else y = 327 + idx * 16;
                  }
                  return (
                    <tspan key={idx} x="360" y={y}>
                      {line}
                    </tspan>
                  );
                })}
              </text>
            );
          })()}

          <text
            x="360"
            y={
              hoveredFeature
                ? wrapSvgCenterTitle(document.name, 2, 22).length === 1
                  ? 344
                  : 349
                : wrapSvgCenterTitle(document.name, 3, 22).length === 1
                ? 368
                : wrapSvgCenterTitle(document.name, 3, 22).length === 2
                ? 373
                : 380
            }
            textAnchor="middle"
            className="fill-[var(--text-secondary)] font-mono text-[12px]"
          >
            {document.length.toLocaleString()} bp · circular
          </text>

          {hoveredFeature ? (
            <g pointerEvents="none">
              <rect x="255" y="360" width="210" height="44" rx="5" fill="var(--panel-muted)" stroke="var(--border)" />
              <text x="360" y="377" textAnchor="middle" className="fill-[var(--accent)] font-ui text-[11px] font-bold">
                <title>{hoveredFeature.name}</title>
                {hoveredFeature.name.length > 25 ? `${hoveredFeature.name.slice(0, 24)}…` : hoveredFeature.name}
              </text>
              <text x="360" y="393" textAnchor="middle" className="fill-[var(--text-muted)] font-ui text-[10px]">
                {getFeatureTypeMetadata(hoveredFeature.type).label} ({hoveredFeature.strand === 1 ? '+' : '-'})
              </text>
            </g>
          ) : (
            <text
              x="360"
              y={
                wrapSvgCenterTitle(document.name, 3, 22).length === 1
                  ? 391
                  : wrapSvgCenterTitle(document.name, 3, 22).length === 2
                  ? 394
                  : 398
              }
              textAnchor="middle"
              className="fill-[var(--accent)] font-mono text-[11px]"
            >
              {hoverCoordinate0 === null
                ? 'drag ring to select'
                : `base ${hoverCoordinate0 + 1} · ${Math.round((hoverCoordinate0 / document.length) * 360)}°`}
            </text>
          )}
        </g>
      </svg>

      {placedFeatures.length > visibleFeatures.length && (
        <div className="absolute bottom-4 right-4 rounded border border-[var(--warning)]/30 bg-[var(--panel)] px-2 py-1 text-[11px] text-[var(--warning)]">
          Showing first {visibleFeatures.length} of {placedFeatures.length} annotations
        </div>
      )}
    </div>
  );
}
