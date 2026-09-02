import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Feature } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { useWorkspaceStore } from '../../state/workspace-store';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { assignFeatureLanes } from './map-layout';
import { getSegmentTerminal, type TerminalType } from './feature-endpoints';
import {
  coordinateToLinearX,
  LINEAR_MAP_END_X,
  LINEAR_MAP_START_X,
  linearXToCoordinate,
} from './linear-map-geometry';

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 440;
const BASELINE_Y = 230;
const FEATURE_HEIGHT = 26;
const FEATURE_GAP = 10;

function featureY(feature: Feature, lane: number): number {
  return feature.strand === 1
    ? BASELINE_Y - 46 - lane * (FEATURE_HEIGHT + FEATURE_GAP)
    : BASELINE_Y + 20 + lane * (FEATURE_HEIGHT + FEATURE_GAP);
}

function featurePoints(x1: number, x2: number, y: number, terminal: TerminalType): string {
  const width = x2 - x1;
  if (terminal === 'none' || width < 6) {
    return `${x1},${y} ${x2},${y} ${x2},${y + FEATURE_HEIGHT} ${x1},${y + FEATURE_HEIGHT}`;
  }

  const arrow = Math.min(12, Math.max(3, width * 0.35));
  const middle = y + FEATURE_HEIGHT / 2;
  if (terminal === 'clockwise-arrow') {
    return `${x1},${y} ${x2 - arrow},${y} ${x2},${middle} ${x2 - arrow},${y + FEATURE_HEIGHT} ${x1},${y + FEATURE_HEIGHT}`;
  }
  return `${x1 + arrow},${y} ${x2},${y} ${x2},${y + FEATURE_HEIGHT} ${x1 + arrow},${y + FEATURE_HEIGHT} ${x1},${middle}`;
}

function visibleFeatureLabel(name: string, width: number): string | null {
  const maxCharacters = Math.floor((width - 10) / 7);
  if (maxCharacters < 3) return null;
  return name.length <= maxCharacters ? name : `${name.slice(0, Math.max(1, maxCharacters - 1))}…`;
}

export function LinearMap({ document }: { document: SequenceDocument }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const [showRestrictionSites, setShowRestrictionSites] = useState(false);
  const [showPrimers, setShowPrimers] = useState(false);
  const selectedFeatureId = useWorkspaceStore(state => state.selectedFeatureId);
  const selectedRestrictionSiteId = useWorkspaceStore(state => state.selectedRestrictionSiteId);
  const selectedPrimerId = useWorkspaceStore(state => state.selectedPrimerId);
  const selection = useWorkspaceStore(state => state.selection);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const selectFeature = useWorkspaceStore(state => state.selectFeature);
  const selectDocumentFeature = useWorkspaceStore(state => state.selectDocumentFeature);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);

  const rawSeq = document.storageMode === 'memory' ? getMemorySequence(document).raw : '';
  const placedFeatures = useMemo(() => assignFeatureLanes(document.features), [document.features]);
  const restrictionSites = useMemo(
    () => analyzeRestrictionSites(rawSeq, 'linear', BUILTIN_ENZYMES),
    [rawSeq],
  );
  const primerBindings = useMemo(() => (document.primers ?? []).flatMap(primer => analyzePrimerBindings(rawSeq, 'linear', primer).map(binding => ({ primer, binding }))), [document.primers, rawSeq]);
  const renderedPrimerBindings = showPrimers
    ? primerBindings
    : selectedPrimerId ? primerBindings.filter(({ primer }) => primer.id === selectedPrimerId) : [];

  const restrictionClusters = useMemo(() => {
    if (!showRestrictionSites && !selectedRestrictionSiteId) return [];
    const activeSites = showRestrictionSites 
      ? restrictionSites 
      : selectedRestrictionSiteId ? restrictionSites.filter(s => s.id === selectedRestrictionSiteId) : [];
    if (activeSites.length === 0) return [];
    const sorted = [...activeSites].sort((a, b) => a.forwardCut0 - b.forwardCut0);
    const thresholdBp = Math.max(1, Math.floor(document.length / 120));
    const clusters: { coordinate0: number; sites: typeof activeSites }[] = [];
    for (const site of sorted) {
      const prev = clusters.at(-1);
      if (prev && site.forwardCut0 - prev.sites.at(-1)!.forwardCut0 <= thresholdBp) {
        prev.sites.push(site);
      } else {
        clusters.push({ coordinate0: site.forwardCut0, sites: [site] });
      }
    }
    return clusters;
  }, [showRestrictionSites, selectedRestrictionSiteId, restrictionSites, document.length]);
  const activeSelection = selection?.documentId === document.id ? selection : null;
  const formattedLength = new Intl.NumberFormat('en-US').format(document.length);

  const pointerCoordinate = (event: ReactPointerEvent<SVGRectElement>): number => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return 0;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localPoint = point.matrixTransform(matrix.inverse());
    return linearXToCoordinate(localPoint.x, document.length);
  };

  const updateSelection = (anchor: number, current: number) => {
    const start0 = Math.min(anchor, current);
    const end0Exclusive = Math.min(document.length, Math.max(anchor, current) + 1);
    setSelection(document.id, start0, end0Exclusive);
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGRectElement>) => {
    const coordinate = pointerCoordinate(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragAnchorRef.current = coordinate;
    selectFeature(null);
    updateSelection(coordinate, coordinate);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    if (dragAnchorRef.current === null) return;
    updateSelection(dragAnchorRef.current, pointerCoordinate(event));
  };

  const handlePointerEnd = (event: ReactPointerEvent<SVGRectElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragAnchorRef.current = null;
  };

  const tickCoordinates = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map(fraction => (
    Math.round(document.length * fraction)
  ))));

  return (
    <div className="relative h-full w-full bg-[var(--bg-editor)] text-[var(--text-primary)] select-none" data-map-topology="linear">
      <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setShowRestrictionSites(s => !s)}
          className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${showRestrictionSites ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
        >
          Sites ({restrictionSites.length})
        </button>
        <button
          type="button"
          onClick={() => setShowPrimers(s => !s)}
          className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${showPrimers ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
        >
          Primers ({primerBindings.length})
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label={`Linear map of ${document.name}, ${formattedLength} base pairs`}
      >
        <text x={LINEAR_MAP_START_X} y={52} fill="var(--text-primary)" fontSize="16" fontWeight="600">
          {document.name}
        </text>
        <text x={LINEAR_MAP_START_X} y={72} fill="var(--text-secondary)" fontSize="12">
          Linear DNA · {formattedLength} bp
        </text>

        {activeSelection && !selectedFeatureId && (
          <rect
            x={coordinateToLinearX(activeSelection.start0, document.length)}
            y={BASELINE_Y - 16}
            width={Math.max(2, coordinateToLinearX(activeSelection.end0Exclusive, document.length) - coordinateToLinearX(activeSelection.start0, document.length))}
            height={32}
            rx={4}
            fill="var(--selection-bg)"
            stroke="var(--selection-border)"
          />
        )}

        <line
          x1={LINEAR_MAP_START_X}
          x2={LINEAR_MAP_END_X}
          y1={BASELINE_Y}
          y2={BASELINE_Y}
          stroke="var(--border-strong)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line x1={LINEAR_MAP_START_X} x2={LINEAR_MAP_START_X} y1={BASELINE_Y - 14} y2={BASELINE_Y + 14} stroke="var(--text-secondary)" strokeWidth="2" />
        <line x1={LINEAR_MAP_END_X} x2={LINEAR_MAP_END_X} y1={BASELINE_Y - 14} y2={BASELINE_Y + 14} stroke="var(--text-secondary)" strokeWidth="2" />
        <text x={LINEAR_MAP_START_X - 12} y={BASELINE_Y + 5} fill="var(--text-secondary)" fontSize="12" textAnchor="end">5′</text>
        <text x={LINEAR_MAP_END_X + 12} y={BASELINE_Y + 5} fill="var(--text-secondary)" fontSize="12">3′</text>

        <rect
          x={LINEAR_MAP_START_X}
          y={BASELINE_Y - 18}
          width={LINEAR_MAP_END_X - LINEAR_MAP_START_X}
          height={36}
          fill="transparent"
          className="cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />

        {tickCoordinates.map(coordinate => {
          const x = coordinateToLinearX(coordinate, document.length);
          const publicCoordinate = coordinate === 0 ? 1 : coordinate;
          return (
            <g key={coordinate}>
              <line x1={x} x2={x} y1={BASELINE_Y + 13} y2={BASELINE_Y + 20} stroke="var(--text-muted)" />
              <text x={x} y={BASELINE_Y + 38} fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)">
                {new Intl.NumberFormat('en-US').format(publicCoordinate)}
              </text>
            </g>
          );
        })}

        {placedFeatures.flatMap(({ feature, lane }) => feature.segments.map((segment, segmentIndex) => {
          const x1 = coordinateToLinearX(segment.start0, document.length);
          const x2 = coordinateToLinearX(segment.end0Exclusive, document.length);
          const y = featureY(feature, lane);
          const label = visibleFeatureLabel(feature.name, x2 - x1);
          const selected = selectedFeatureId === feature.id;
          const terminal = getSegmentTerminal(feature, segmentIndex, document.length);
          return (
            <g
              key={`${feature.id}-${segmentIndex}`}
              className="cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                selectDocumentFeature(document.id, feature.id);
              }}
            >
              <title>{`${feature.name} · ${feature.type} · ${segment.start0 + 1}–${segment.end0Exclusive}`}</title>
              <polygon
                points={featurePoints(x1, x2, y, terminal)}
                fill={getFeatureColor(feature.type)}
                fillOpacity={selected ? 1 : 0.82}
                stroke={selected ? 'var(--selection-border)' : 'var(--bg-panel)'}
                strokeWidth={selected ? 3 : 1}
              />
              {label && (
                <text x={(x1 + x2) / 2} y={y + 17} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600" pointerEvents="none">
                  {label}
                </text>
              )}
            </g>
          );
        }))}

        {restrictionClusters.map(cluster => {
          const x = coordinateToLinearX(cluster.coordinate0, document.length);
          const hasSelected = cluster.sites.some(s => s.id === selectedRestrictionSiteId);
          const representative = cluster.sites[0];
          const isCluster = cluster.sites.length > 1;
          const title = cluster.sites.map(s => `${s.enzymeName} ${s.forwardCut0 + 1}`).join(' · ');

          return (
            <g
              key={cluster.sites.map(s => s.id).join(':')}
              className="cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                selectRestrictionSite(representative.id);
              }}
            >
              <title>{title}</title>
              <line
                x1={x}
                x2={x}
                y1={BASELINE_Y - (hasSelected ? 22 : 14)}
                y2={BASELINE_Y + (hasSelected ? 22 : 14)}
                stroke={hasSelected ? 'var(--accent)' : 'var(--text-muted)'}
                strokeWidth={hasSelected ? 2.5 : 1.5}
              />
              {isCluster ? (
                <g>
                  <circle
                    cx={x}
                    cy={BASELINE_Y - 26}
                    r="8"
                    fill="var(--panel)"
                    stroke={hasSelected ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={BASELINE_Y - 26}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none fill-[var(--text-secondary)] font-mono text-[11px] font-medium"
                  >
                    {cluster.sites.length}
                  </text>
                </g>
              ) : (
                hasSelected && (
                  <text x={x} y={BASELINE_Y - 28} textAnchor="middle" fill="var(--accent)" fontSize="11" fontWeight="600">
                    {representative.enzymeName} · {representative.forwardCut0 + 1}
                  </text>
                )
              )}
            </g>
          );
        })}

        {renderedPrimerBindings.flatMap(({ primer, binding }, bindingIndex) => binding.segments.map((segment, segmentIndex) => {
          const x1 = coordinateToLinearX(segment.start0, document.length);
          const x2 = coordinateToLinearX(segment.end0Exclusive, document.length);
          const y = 330 + (bindingIndex % 3) * 22;
          const reverse = binding.orientation === 'reverse';
          const width = Math.max(0, x2 - x1);
          const isTerminal = segmentIndex === (reverse ? 0 : binding.segments.length - 1);
          const arrow = isTerminal && width >= 6 ? Math.min(8, Math.max(3, width * 0.4)) : 0;
          
          let points: string;
          if (isTerminal && reverse && arrow > 0) {
            points = `${x1 + arrow},${y} ${x2},${y} ${x2},${y + 14} ${x1 + arrow},${y + 14} ${x1},${y + 7}`;
          } else if (isTerminal && !reverse && arrow > 0) {
            points = `${x1},${y} ${x2 - arrow},${y} ${x2},${y + 7} ${x2 - arrow},${y + 14} ${x1},${y + 14}`;
          } else {
            points = `${x1},${y} ${x2},${y} ${x2},${y + 14} ${x1},${y + 14}`;
          }

          return (
            <g 
              key={`${primer.id}-${bindingIndex}-${segmentIndex}`} 
              className="cursor-pointer" 
              onClick={() => { setSelection(document.id, binding.start0, binding.end0Exclusive); selectPrimer(primer.id); }}
            >
              <title>{`${primer.name} · ${binding.orientation} primer`}</title>
              <polygon 
                points={points} 
                fill="var(--bio-primer)" 
                fillOpacity={selectedPrimerId === primer.id ? 1 : 0.72} 
                stroke={selectedPrimerId === primer.id ? 'var(--selection-border)' : 'none'} 
                strokeWidth={selectedPrimerId === primer.id ? 1.5 : 0}
              />
              <text x={(x1 + x2) / 2} y={y + 11} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500" pointerEvents="none">
                {primer.name}
              </text>
            </g>
          );
        }))}

      </svg>
    </div>
  );
}
