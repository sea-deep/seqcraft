import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Feature } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { useWorkspaceStore } from '../../state/workspace-store';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { assignFeatureLanes } from './map-layout';
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

function featurePoints(feature: Feature, x1: number, x2: number, y: number): string {
  const width = x2 - x1;
  if (width < 10) {
    return `${x1},${y} ${x2},${y} ${x2},${y + FEATURE_HEIGHT} ${x1},${y + FEATURE_HEIGHT}`;
  }

  const arrow = Math.min(12, width / 3);
  const middle = y + FEATURE_HEIGHT / 2;
  if (feature.strand === 1) {
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
  const selectedFeatureId = useWorkspaceStore(state => state.selectedFeatureId);
  const selectedRestrictionSiteId = useWorkspaceStore(state => state.selectedRestrictionSiteId);
  const selectedPrimerId = useWorkspaceStore(state => state.selectedPrimerId);
  const selection = useWorkspaceStore(state => state.selection);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const selectFeature = useWorkspaceStore(state => state.selectFeature);
  const selectDocumentFeature = useWorkspaceStore(state => state.selectDocumentFeature);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);

  const placedFeatures = useMemo(() => assignFeatureLanes(document.features), [document.features]);
  const restrictionSites = useMemo(
    () => analyzeRestrictionSites(getMemorySequence(document).raw, 'linear', BUILTIN_ENZYMES),
    [getMemorySequence(document).raw],
  );
  const primerBindings = useMemo(() => (document.primers ?? []).flatMap(primer => analyzePrimerBindings(getMemorySequence(document).raw, 'linear', primer).map(binding => ({ primer, binding }))), [document.primers, getMemorySequence(document).raw]);
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
    <div className="h-full w-full bg-[var(--bg-editor)] text-[var(--text-primary)] select-none" data-map-topology="linear">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label={`Linear map of ${document.name}, ${formattedLength} base pairs`}
      >
        <text x={LINEAR_MAP_START_X} y={42} fill="var(--text-primary)" fontSize="20" fontWeight="600">
          {document.name}
        </text>
        <text x={LINEAR_MAP_START_X} y={66} fill="var(--text-secondary)" fontSize="13">
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
                points={featurePoints(feature, x1, x2, y)}
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

        {restrictionSites.map(site => {
          const x = coordinateToLinearX(site.forwardCut0, document.length);
          const selected = selectedRestrictionSiteId === site.id;
          return (
            <g
              key={site.id}
              className="cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                selectRestrictionSite(site.id);
              }}
            >
              <title>{`${site.enzymeName} · cut ${site.forwardCut0 + 1}`}</title>
              <line
                x1={x}
                x2={x}
                y1={BASELINE_Y - (selected ? 24 : 15)}
                y2={BASELINE_Y + (selected ? 24 : 15)}
                stroke={selected ? 'var(--accent)' : 'var(--text-muted)'}
                strokeWidth={selected ? 3 : 1.5}
              />
              {selected && (
                <text x={x} y={BASELINE_Y - 31} textAnchor="middle" fill="var(--accent)" fontSize="11" fontWeight="600">
                  {site.enzymeName} · {site.forwardCut0 + 1}
                </text>
              )}
            </g>
          );
        })}

        {primerBindings.flatMap(({ primer, binding }, bindingIndex) => binding.segments.map((segment, segmentIndex) => {
          const x1 = coordinateToLinearX(segment.start0, document.length);
          const x2 = coordinateToLinearX(segment.end0Exclusive, document.length);
          const y = 330 + (bindingIndex % 3) * 22;
          const reverse = binding.orientation === 'reverse';
          return <g key={`${primer.id}-${bindingIndex}-${segmentIndex}`} className="cursor-pointer" onClick={() => { setSelection(document.id, binding.start0, binding.end0Exclusive); selectPrimer(primer.id); }}><title>{`${primer.name} · ${binding.orientation} primer`}</title><polygon points={reverse ? `${x1 + 8},${y} ${x2},${y} ${x2},${y + 14} ${x1 + 8},${y + 14} ${x1},${y + 7}` : `${x1},${y} ${x2 - 8},${y} ${x2},${y + 7} ${x2 - 8},${y + 14} ${x1},${y + 14}`} fill="var(--bio-primer)" fillOpacity={selectedPrimerId === primer.id ? 1 : 0.72} stroke={selectedPrimerId === primer.id ? 'var(--selection-border)' : 'none'} /><text x={(x1 + x2) / 2} y={y + 11} textAnchor="middle" fill="#fff" fontSize="10" pointerEvents="none">{primer.name}</text></g>;
        }))}

      </svg>
    </div>
  );
}
