import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Feature } from '../../domain/feature';
import type { RestrictionCategory } from '../../domain/restriction';
import { getFeatureColor } from '../../domain/feature-colors';
import { getFeatureTypeMetadata, type FeatureCategory } from '../../domain/feature-ontology';
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
import { Scissors, LocateFixed } from 'lucide-react';

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

type CutterFilter = 'all' | 'unique' | 'double';
type EnzymeCategoryFilter = 'all' | RestrictionCategory;

export function LinearMap({ document }: { document: SequenceDocument }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const [showRestrictionSites, setShowRestrictionSites] = useState(true);
  const [showPrimers, setShowPrimers] = useState(false);
  const [cutterFilter, setCutterFilter] = useState<CutterFilter>('unique');
  const [categoryFilter, setCategoryFilter] = useState<EnzymeCategoryFilter>('all');
  const [featureCatFilter, setFeatureCatFilter] = useState<'all' | FeatureCategory>('all');
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);

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

  // Feature category filtering
  const filteredFeatures = useMemo(() => {
    if (featureCatFilter === 'all') return document.features;
    return document.features.filter(f => {
      const meta = getFeatureTypeMetadata(f.type);
      return meta.category === featureCatFilter;
    });
  }, [document.features, featureCatFilter]);

  const placedFeatures = useMemo(() => assignFeatureLanes(filteredFeatures), [filteredFeatures]);

  // Analyze all 80+ restriction enzymes
  const rawRestrictionSites = useMemo(
    () => (rawSeq ? analyzeRestrictionSites(rawSeq, 'linear', BUILTIN_ENZYMES) : []),
    [rawSeq],
  );

  const siteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const site of rawRestrictionSites) {
      counts.set(site.enzymeId, (counts.get(site.enzymeId) ?? 0) + 1);
    }
    return counts;
  }, [rawRestrictionSites]);

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

  const primerBindings = useMemo(
    () =>
      (document.primers ?? []).flatMap(primer =>
        analyzePrimerBindings(rawSeq, 'linear', primer).map(binding => ({ primer, binding })),
      ),
    [document.primers, rawSeq],
  );

  const renderedPrimerBindings = showPrimers
    ? primerBindings
    : selectedPrimerId
    ? primerBindings.filter(({ primer }) => primer.id === selectedPrimerId)
    : [];

  const restrictionClusters = useMemo(() => {
    if (!showRestrictionSites && !selectedRestrictionSiteId) return [];
    const activeSites = showRestrictionSites
      ? filteredRestrictionSites
      : selectedRestrictionSiteId
      ? filteredRestrictionSites.filter(s => s.id === selectedRestrictionSiteId)
      : [];
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
  }, [showRestrictionSites, selectedRestrictionSiteId, filteredRestrictionSites, document.length]);

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
    const coordinate = pointerCoordinate(event);
    updateSelection(dragAnchorRef.current, coordinate);
  };

  const handlePointerEnd = (event: ReactPointerEvent<SVGRectElement>) => {
    if (dragAnchorRef.current === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragAnchorRef.current = null;
  };

  const tickCoordinates = useMemo(() => {
    if (document.length <= 0) return [0];
    const targetTicks = 6;
    const roughStep = Math.max(1, Math.floor(document.length / targetTicks));
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalized = roughStep / magnitude;
    const stepMultiplier = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
    const step = stepMultiplier * magnitude;
    const ticks = [0];
    for (let pos = step; pos < document.length; pos += step) ticks.push(pos);
    if (ticks.at(-1) !== document.length) ticks.push(document.length);
    return Array.from(new Set(ticks));
  }, [document.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-editor)] scientific-grid">
      {/* Top Left Scientific Layers Toolbar */}
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-sm p-1 shadow-md text-xs">
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
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-full w-full select-none"
        role="img"
        aria-label={`Linear map for ${document.name}`}
      >
        <line
          x1={LINEAR_MAP_START_X}
          x2={LINEAR_MAP_END_X}
          y1={BASELINE_Y}
          y2={BASELINE_Y}
          stroke="var(--border-strong)"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Selection Rectangle */}
        {activeSelection && (
          <rect
            x={coordinateToLinearX(activeSelection.start0, document.length)}
            y={BASELINE_Y - 14}
            width={Math.max(
              2,
              coordinateToLinearX(activeSelection.end0Exclusive, document.length) -
                coordinateToLinearX(activeSelection.start0, document.length),
            )}
            height={28}
            fill="var(--accent-soft)"
            stroke="var(--selection-border)"
            strokeWidth={1.5}
            rx={3}
            pointerEvents="none"
          />
        )}

        {/* Interactive Pointer Area */}
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
              <text
                x={x}
                y={BASELINE_Y + 38}
                fill="var(--text-muted)"
                fontSize="11"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {new Intl.NumberFormat('en-US').format(publicCoordinate)}
              </text>
            </g>
          );
        })}

        {/* Biological Feature Blocks */}
        {placedFeatures.flatMap(({ feature, lane }) =>
          feature.segments.map((segment, segmentIndex) => {
            const x1 = coordinateToLinearX(segment.start0, document.length);
            const x2 = coordinateToLinearX(segment.end0Exclusive, document.length);
            const y = featureY(feature, lane);
            const label = visibleFeatureLabel(feature.name, x2 - x1);
            const selected = selectedFeatureId === feature.id;
            const terminal = getSegmentTerminal(feature, segmentIndex, document.length);
            const isCrispr = feature.type === 'crispr_target';

            return (
              <g
                key={`${feature.id}-${segmentIndex}`}
                role="button"
                tabIndex={0}
                aria-label={`${feature.name}, ${feature.type}, positions ${segment.start0 + 1} to ${segment.end0Exclusive}`}
                className="cursor-pointer"
                onPointerEnter={() => setHoveredFeature(feature)}
                onPointerLeave={() => setHoveredFeature(null)}
                onClick={event => {
                  event.stopPropagation();
                  selectDocumentFeature(document.id, feature.id);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectDocumentFeature(document.id, feature.id);
                  }
                }}
              >
                <title>{`${feature.name} · ${getFeatureTypeMetadata(feature.type).label} · ${segment.start0 + 1}–${segment.end0Exclusive}`}</title>
                <polygon
                  points={featurePoints(x1, x2, y, terminal)}
                  fill={getFeatureColor(feature.type)}
                  fillOpacity={selected ? 1 : 0.85}
                  stroke={selected ? 'var(--selection-border)' : 'var(--bg-panel)'}
                  strokeWidth={selected ? 3 : 1}
                  strokeDasharray={isCrispr ? '4 2' : undefined}
                />
                {label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={y + 17}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Restriction Site Clusters with Type IIS & Rare-cutter indicators */}
        {restrictionClusters.map(cluster => {
          const x = coordinateToLinearX(cluster.coordinate0, document.length);
          const hasSelected = cluster.sites.some(s => s.id === selectedRestrictionSiteId);
          const representative = cluster.sites[0];
          const enzyme = BUILTIN_ENZYMES.find(e => e.id === representative.enzymeId);
          const isTypeIIS = enzyme?.enzymeClass === 'type_iis';
          const isRare8 = enzyme?.category === 'rare_cutter';
          const isUnique = (siteCounts.get(representative.enzymeId) ?? 0) === 1;

          const strokeColor = hasSelected
            ? 'var(--accent)'
            : isTypeIIS
            ? '#f59e0b'
            : isRare8
            ? '#a855f7'
            : isUnique
            ? 'var(--accent)'
            : 'var(--text-muted)';

          const isCluster = cluster.sites.length > 1;
          const title = cluster.sites
            .map(s => `${s.enzymeName} (${s.forwardCut0 + 1}) [${s.recognitionSequence}]`)
            .join('\n');

          return (
            <g
              key={cluster.sites.map(s => s.id).join(':')}
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
                x1={x}
                x2={x}
                y1={BASELINE_Y - 14}
                y2={BASELINE_Y - 26}
                stroke={strokeColor}
                strokeWidth={hasSelected ? 2.5 : isTypeIIS || isRare8 ? 2 : 1.5}
              />
              {isCluster ? (
                <>
                  <circle cx={x} cy={BASELINE_Y - 34} r={8} fill="var(--panel)" stroke={strokeColor} strokeWidth={1.5} />
                  <text
                    x={x}
                    y={BASELINE_Y - 31}
                    fill="var(--text)"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {cluster.sites.length}
                  </text>
                </>
              ) : (
                <text
                  x={x}
                  y={BASELINE_Y - 30}
                  fill={strokeColor}
                  fontSize="10"
                  fontWeight={hasSelected ? '700' : '600'}
                  textAnchor="middle"
                >
                  {representative.enzymeName}
                </text>
              )}
            </g>
          );
        })}

        {/* Primers */}
        {renderedPrimerBindings.flatMap(({ primer, binding }) =>
          binding.segments.map((segment, segmentIndex) => {
            const x1 = coordinateToLinearX(segment.start0, document.length);
            const x2 = coordinateToLinearX(segment.end0Exclusive, document.length);
            const y = binding.orientation === 'forward' ? BASELINE_Y - 12 : BASELINE_Y + 8;
            const terminal = binding.orientation === 'forward' ? 'clockwise-arrow' : 'counterclockwise-arrow';
            return (
              <g
                key={`${primer.id}-${segmentIndex}`}
                role="button"
                tabIndex={0}
                aria-label={`${primer.name}, ${binding.orientation} primer, positions ${segment.start0 + 1} to ${segment.end0Exclusive}`}
                className="cursor-pointer"
                onClick={() => selectPrimer(primer.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectPrimer(primer.id);
                  }
                }}
              >
                <polygon
                  points={featurePoints(x1, x2, y, terminal)}
                  fill="var(--bio-primer)"
                  stroke="var(--bg-panel)"
                  strokeWidth={1}
                />
              </g>
            );
          }),
        )}
      </svg>

      {/* Construct Summary and Hover Card */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-3 py-1.5 shadow-sm text-xs">
        <div>
          <span className="font-semibold text-[var(--text)]">{document.name}</span>
          <span className="text-[var(--text-muted)] font-mono ml-2">{formattedLength} bp · linear</span>
        </div>

        {hoveredFeature && (
          <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)]">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getFeatureColor(hoveredFeature.type) }}
            />
            <span className="font-medium text-[var(--text)]">{hoveredFeature.name}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {getFeatureTypeMetadata(hoveredFeature.type).label} ({hoveredFeature.strand === 1 ? '+' : '-'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
