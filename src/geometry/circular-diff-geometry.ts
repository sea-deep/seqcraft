import type { FeatureType } from '../domain/feature';
import type { BaseDifferenceKind, CanonicalFeature, FeatureDifferenceKind, SequenceDiffResult } from '../domain/sequence-diff';

export interface Point2D { x: number; y: number }

export interface CircularDiffColors {
  backbone: string;
  origin: string;
  text: string;
  textMuted: string;
  labelBackground: string;
  labelBorder: string;
  substitution: string;
  insertion: string;
  deletion: string;
  featureAdded: string;
  featureRemoved: string;
  featureModified: string;
  featureUnchanged: string;
  featureTypes: Partial<Record<FeatureType, string>>;
}

export interface CircularDiffGeometryOptions {
  width?: number;
  height?: number;
  centerX?: number;
  centerY?: number;
  originAngle?: number;
  backboneRadius?: number;
  backboneWidth?: number;
  referenceTrackRadius?: number;
  queryTrackRadius?: number;
  differenceTrackRadius?: number;
  featureTrackWidth?: number;
  featureTrackGap?: number;
  labelRadius?: number;
  labelFontSize?: number;
  labelLineHeight?: number;
  labelPadding?: number;
  labelMargin?: number;
  maxLabels?: number;
  colors?: Partial<Omit<CircularDiffColors, 'featureTypes'>> & { featureTypes?: Partial<Record<FeatureType, string>> };
}

export interface ArcGeometry {
  center: Point2D;
  radius: number;
  startAngle: number;
  endAngle: number;
  clockwise: true;
  start: Point2D;
  end: Point2D;
  fullCircle: boolean;
}

export interface FeatureArcGeometry extends ArcGeometry {
  id: string;
  featureId: string;
  molecule: 'reference' | 'query';
  segmentIndex: number;
  lane: number;
  width: number;
  color: string;
  opacity: number;
  strand: 1 | -1;
  arrowAt: 'start' | 'end' | 'none';
  arrow: { tip: Point2D; left: Point2D; right: Point2D } | null;
  diffKind: FeatureDifferenceKind | null;
  label: string;
}

export interface DifferenceGeometry extends ArcGeometry {
  id: string;
  differenceId: string;
  kind: BaseDifferenceKind;
  color: string;
  width: number;
  marker: Point2D;
  referenceBases: string;
  queryBases: string;
}

export interface LabelGeometry {
  id: string;
  targetId: string;
  text: string;
  side: 'left' | 'right';
  anchor: Point2D;
  elbow: Point2D;
  position: Point2D;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  background: string;
  border: string;
}

export interface CircularDiffGeometry {
  schemaVersion: 1;
  id: string;
  width: number;
  height: number;
  center: Point2D;
  originAngle: number;
  sequenceLength: number;
  queryLength: number;
  backbone: ArcGeometry & { width: number; color: string };
  origin: { angle: number; inner: Point2D; outer: Point2D; label: Point2D; color: string };
  featureArcs: FeatureArcGeometry[];
  differences: DifferenceGeometry[];
  labels: LabelGeometry[];
  colors: CircularDiffColors;
  metrics: {
    referenceLaneCount: number;
    queryLaneCount: number;
    hiddenLabelCount: number;
  };
}

export const DEFAULT_CIRCULAR_DIFF_COLORS: CircularDiffColors = {
  backbone: '#8da19c',
  origin: '#0f766e',
  text: '#14201e',
  textMuted: '#5b6b67',
  labelBackground: '#ffffff',
  labelBorder: '#d2dedb',
  substitution: '#d97706',
  insertion: '#177245',
  deletion: '#b83232',
  featureAdded: '#177245',
  featureRemoved: '#b83232',
  featureModified: '#d97706',
  featureUnchanged: '#64748b',
  featureTypes: {
    CDS: '#4f46e5', gene: '#4f46e5', promoter: '#d97706', terminator: '#64748b',
    origin: '#0d9488', 'resistance marker': '#b83232', tag: '#0891b2', misc_feature: '#7c3aed', source: '#94a3b8',
  },
};

function pointAt(center: Point2D, radius: number, angle: number): Point2D {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

function coordinateAngle(coordinate: number, length: number, originAngle: number): number {
  return originAngle + (length === 0 ? 0 : coordinate / length) * Math.PI * 2;
}

function createArc(center: Point2D, radius: number, start0: number, end0Exclusive: number, length: number, originAngle: number): ArcGeometry {
  const startAngle = coordinateAngle(start0, length, originAngle);
  const fullCircle = start0 === 0 && end0Exclusive === length && length > 0;
  const endAngle = fullCircle ? startAngle + Math.PI * 2 : coordinateAngle(end0Exclusive, length, originAngle);
  return { center, radius, startAngle, endAngle, clockwise: true, start: pointAt(center, radius, startAngle), end: pointAt(center, radius, endAngle), fullCircle };
}

function createArrow(center: Point2D, radius: number, angle: number, direction: 1 | -1, width: number): { tip: Point2D; left: Point2D; right: Point2D } {
  const tip = pointAt(center, radius, angle);
  const tangent = direction === 1
    ? { x: -Math.sin(angle), y: Math.cos(angle) }
    : { x: Math.sin(angle), y: -Math.cos(angle) };
  const radial = { x: Math.cos(angle), y: Math.sin(angle) };
  const base = { x: tip.x - tangent.x * width * 1.35, y: tip.y - tangent.y * width * 1.35 };
  return {
    tip,
    left: { x: base.x + radial.x * width * 0.72, y: base.y + radial.y * width * 0.72 },
    right: { x: base.x - radial.x * width * 0.72, y: base.y - radial.y * width * 0.72 },
  };
}

function featuresOverlap(left: CanonicalFeature, right: CanonicalFeature): boolean {
  return left.segments.some(a => right.segments.some(b => Math.max(a.start0, b.start0) < Math.min(a.end0Exclusive, b.end0Exclusive)));
}

function assignLanes(features: CanonicalFeature[]): Map<string, number> {
  const sorted = [...features].sort((left, right) => {
    const leftStart = left.segments[0]?.start0 ?? 0;
    const rightStart = right.segments[0]?.start0 ?? 0;
    return leftStart - rightStart || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  });
  const lanes: CanonicalFeature[][] = [];
  const assignments = new Map<string, number>();
  for (const feature of sorted) {
    let lane = lanes.findIndex(items => items.every(item => !featuresOverlap(feature, item)));
    if (lane < 0) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push(feature);
    assignments.set(feature.id, lane);
  }
  return assignments;
}

function featureMidpoint(feature: CanonicalFeature, length: number): number {
  if (feature.segments.length === 0 || length === 0) return 0;
  const segments = [...feature.segments].sort((left, right) => left.start0 - right.start0);
  if (segments.length === 1) return (segments[0].start0 + segments[0].end0Exclusive) / 2;
  let largestGap = -1;
  let startIndex = 0;
  for (let index = 0; index < segments.length; index++) {
    const current = segments[index];
    const next = segments[(index + 1) % segments.length];
    const gap = index === segments.length - 1 ? next.start0 + length - current.end0Exclusive : next.start0 - current.end0Exclusive;
    if (gap > largestGap) {
      largestGap = gap;
      startIndex = (index + 1) % segments.length;
    }
  }
  const ordered = [...segments.slice(startIndex), ...segments.slice(0, startIndex)];
  const total = ordered.reduce((sum, segment) => sum + segment.end0Exclusive - segment.start0, 0);
  let remaining = total / 2;
  for (const segment of ordered) {
    const segmentLength = segment.end0Exclusive - segment.start0;
    if (remaining <= segmentLength) return (segment.start0 + remaining) % length;
    remaining -= segmentLength;
  }
  return ordered[0].start0;
}

function diffKindByFeature(result: SequenceDiffResult): Map<string, FeatureDifferenceKind> {
  const map = new Map<string, FeatureDifferenceKind>();
  for (const difference of result.featureDifferences) {
    if (difference.referenceFeature) map.set(`reference:${difference.referenceFeature.id}`, difference.kind);
    if (difference.queryFeature) map.set(`query:${difference.queryFeature.id}`, difference.kind);
  }
  return map;
}

interface LabelCandidate { id: string; targetId: string; text: string; coordinate: number; radius: number; priority: number }

function placeLabels(candidates: LabelCandidate[], center: Point2D, length: number, originAngle: number, options: Required<Pick<CircularDiffGeometryOptions, 'width' | 'height' | 'labelRadius' | 'labelFontSize' | 'labelLineHeight' | 'labelPadding' | 'labelMargin' | 'maxLabels'>>, colors: CircularDiffColors): { labels: LabelGeometry[]; hidden: number } {
  const perSideCapacity = Math.max(1, Math.floor((options.height - options.labelMargin * 2) / options.labelLineHeight) + 1);
  const visible = [...candidates]
    .sort((left, right) => right.priority - left.priority || left.coordinate - right.coordinate || left.id.localeCompare(right.id))
    .slice(0, Math.min(options.maxLabels, perSideCapacity * 2));
  const prepared = visible.map(candidate => {
    const angle = coordinateAngle(candidate.coordinate, length, originAngle);
    const anchor = pointAt(center, candidate.radius, angle);
    const side: LabelGeometry['side'] = Math.cos(angle) < 0 ? 'left' : 'right';
    const width = Math.max(38, candidate.text.length * options.labelFontSize * 0.58 + options.labelPadding * 2);
    return { candidate, angle, anchor, side, width, desiredY: center.y + Math.sin(angle) * options.labelRadius };
  });
  const labels: LabelGeometry[] = [];
  for (const side of ['left', 'right'] as const) {
    const sideItems = prepared.filter(item => item.side === side).sort((left, right) => left.desiredY - right.desiredY || left.candidate.id.localeCompare(right.candidate.id));
    const ys: number[] = [];
    for (let index = 0; index < sideItems.length; index++) {
      const minimum = index === 0 ? options.labelMargin : ys[index - 1] + options.labelLineHeight;
      ys[index] = Math.max(minimum, sideItems[index].desiredY);
    }
    const maximum = options.height - options.labelMargin;
    if (ys.length > 0 && ys.at(-1)! > maximum) {
      ys[ys.length - 1] = maximum;
      for (let index = ys.length - 2; index >= 0; index--) ys[index] = Math.min(ys[index], ys[index + 1] - options.labelLineHeight);
      if (ys[0] < options.labelMargin) {
        const shift = options.labelMargin - ys[0];
        for (let index = 0; index < ys.length; index++) ys[index] += shift;
      }
    }
    sideItems.forEach((item, index) => {
      const x = side === 'left' ? options.labelMargin : options.width - options.labelMargin;
      const edgeX = side === 'left' ? x + item.width : x - item.width;
      const elbow = { x: center.x + (side === 'left' ? -1 : 1) * options.labelRadius, y: ys[index] };
      labels.push({
        id: `label:${item.candidate.id}`,
        targetId: item.candidate.targetId,
        text: item.candidate.text,
        side,
        anchor: item.anchor,
        elbow,
        position: { x: side === 'left' ? edgeX - item.width : edgeX, y: ys[index] - options.labelLineHeight / 2 },
        width: item.width,
        height: options.labelLineHeight,
        fontSize: options.labelFontSize,
        color: colors.text,
        background: colors.labelBackground,
        border: colors.labelBorder,
      });
    });
  }
  return { labels: labels.sort((left, right) => left.id.localeCompare(right.id)), hidden: Math.max(0, candidates.length - visible.length) };
}

export function createCircularDiffGeometry(result: SequenceDiffResult, input: CircularDiffGeometryOptions = {}): CircularDiffGeometry {
  if (result.reference.topology !== 'circular' || result.query.topology !== 'circular') throw new Error('Circular diff geometry requires two circular sequences');
  const width = input.width ?? 720;
  const height = input.height ?? 640;
  const center = { x: input.centerX ?? width / 2, y: input.centerY ?? height / 2 };
  const originAngle = input.originAngle ?? -Math.PI / 2;
  const backboneRadius = input.backboneRadius ?? Math.max(40, Math.min(width, height) / 2 - 150);
  const backboneWidth = input.backboneWidth ?? 8;
  const featureTrackWidth = input.featureTrackWidth ?? 12;
  const featureTrackGap = input.featureTrackGap ?? 5;
  const referenceTrackRadius = input.referenceTrackRadius ?? backboneRadius + 20;
  const queryTrackRadius = input.queryTrackRadius ?? backboneRadius - 20;
  const differenceTrackRadius = input.differenceTrackRadius ?? backboneRadius;
  const labelRadius = input.labelRadius ?? backboneRadius + 92;
  const colors: CircularDiffColors = {
    ...DEFAULT_CIRCULAR_DIFF_COLORS,
    ...input.colors,
    featureTypes: { ...DEFAULT_CIRCULAR_DIFF_COLORS.featureTypes, ...input.colors?.featureTypes },
  };
  const options = {
    width, height, labelRadius,
    labelFontSize: input.labelFontSize ?? 11,
    labelLineHeight: input.labelLineHeight ?? 18,
    labelPadding: input.labelPadding ?? 5,
    labelMargin: input.labelMargin ?? 14,
    maxLabels: input.maxLabels ?? 28,
  };
  const referenceFeatures = result.reference.features.filter(feature => feature.type !== 'source');
  const queryFeatures = result.query.features.filter(feature => feature.type !== 'source');
  const referenceLanes = assignLanes(referenceFeatures);
  const queryLanes = assignLanes(queryFeatures);
  const kinds = diffKindByFeature(result);
  const featureArcs: FeatureArcGeometry[] = [];
  const labelCandidates: LabelCandidate[] = [];

  const appendFeatures = (features: CanonicalFeature[], molecule: 'reference' | 'query', length: number, baseRadius: number, direction: 1 | -1) => {
    const lanes = molecule === 'reference' ? referenceLanes : queryLanes;
    for (const feature of features) {
      const lane = lanes.get(feature.id) ?? 0;
      const radius = baseRadius + direction * lane * (featureTrackWidth + featureTrackGap);
      const diffKind = kinds.get(`${molecule}:${feature.id}`) ?? null;
      const statusColor = diffKind === 'added' ? colors.featureAdded : diffKind === 'removed' ? colors.featureRemoved : diffKind === 'modified' ? colors.featureModified : null;
      feature.segments.forEach((segment, segmentIndex) => {
        const arc = createArc(center, radius, segment.start0, segment.end0Exclusive, length, originAngle);
        const terminalSegment = feature.strand === 1 ? feature.segments.length - 1 : 0;
        const arrowAt: FeatureArcGeometry['arrowAt'] = segmentIndex === terminalSegment ? (feature.strand === 1 ? 'end' : 'start') : 'none';
        featureArcs.push({
          ...arc,
          id: `feature-arc:${molecule}:${feature.id}:${segmentIndex}`,
          featureId: feature.id,
          molecule,
          segmentIndex,
          lane,
          width: featureTrackWidth,
          color: statusColor ?? colors.featureTypes[feature.type] ?? colors.featureUnchanged,
          opacity: diffKind && diffKind !== 'unchanged' ? 1 : molecule === 'reference' ? 0.88 : 0.62,
          strand: feature.strand,
          arrowAt,
          arrow: arrowAt === 'none' ? null : createArrow(center, radius, arrowAt === 'end' ? arc.endAngle : arc.startAngle, feature.strand, featureTrackWidth),
          diffKind,
          label: feature.name,
        });
      });
      labelCandidates.push({
        id: `${molecule}:${feature.id}`,
        targetId: `feature-arc:${molecule}:${feature.id}:0`,
        text: `${molecule === 'reference' ? 'R' : 'Q'} · ${feature.name}`,
        coordinate: featureMidpoint(feature, length),
        radius,
        priority: diffKind && diffKind !== 'unchanged' ? 3 : 1,
      });
    }
  };
  appendFeatures(referenceFeatures, 'reference', result.reference.length, referenceTrackRadius, 1);
  appendFeatures(queryFeatures, 'query', result.query.length, queryTrackRadius, -1);

  const differenceColors: Record<BaseDifferenceKind, string> = { substitution: colors.substitution, insertion: colors.insertion, deletion: colors.deletion };
  const differences = result.differences.map(difference => {
    const start0 = difference.referenceStart0;
    const end0Exclusive = difference.kind === 'insertion' ? start0 : Math.max(start0 + 1, difference.referenceEnd0Exclusive);
    const arc = createArc(center, differenceTrackRadius, start0, Math.min(result.reference.length, end0Exclusive), result.reference.length, originAngle);
    return {
      ...arc,
      id: `difference-geometry:${difference.id}`,
      differenceId: difference.id,
      kind: difference.kind,
      color: differenceColors[difference.kind],
      width: difference.kind === 'substitution' ? backboneWidth + 5 : backboneWidth + 7,
      marker: pointAt(center, differenceTrackRadius, coordinateAngle(start0, result.reference.length, originAngle)),
      referenceBases: difference.referenceBases,
      queryBases: difference.queryBases,
    };
  });
  const placedLabels = placeLabels(labelCandidates, center, result.reference.length, originAngle, options, colors);
  const originInner = pointAt(center, backboneRadius - 13, originAngle);
  const originOuter = pointAt(center, backboneRadius + 13, originAngle);
  return {
    schemaVersion: 1,
    id: `geometry:${result.id}:${width}x${height}`,
    width,
    height,
    center,
    originAngle,
    sequenceLength: result.reference.length,
    queryLength: result.query.length,
    backbone: { ...createArc(center, backboneRadius, 0, result.reference.length, result.reference.length, originAngle), width: backboneWidth, color: colors.backbone },
    origin: { angle: originAngle, inner: originInner, outer: originOuter, label: pointAt(center, backboneRadius + 28, originAngle), color: colors.origin },
    featureArcs: featureArcs.sort((left, right) => left.molecule.localeCompare(right.molecule) || left.lane - right.lane || left.id.localeCompare(right.id)),
    differences,
    labels: placedLabels.labels,
    colors,
    metrics: {
      referenceLaneCount: referenceLanes.size === 0 ? 0 : Math.max(...referenceLanes.values()) + 1,
      queryLaneCount: queryLanes.size === 0 ? 0 : Math.max(...queryLanes.values()) + 1,
      hiddenLabelCount: placedLabels.hidden,
    },
  };
}
