import type { Feature, SequenceInterval } from '../../domain/feature';
import type { RestrictionSite } from '../../scientific/restriction-analysis';
import { resolveCircularDragRange } from './pointer-coordinate';

export interface Point2D { x: number; y: number }

export function circularCoordinateToAngle(coordinate0: number, sequenceLength: number): number {
  if (sequenceLength <= 0) return -Math.PI / 2;
  return ((coordinate0 % sequenceLength + sequenceLength) % sequenceLength) / sequenceLength * Math.PI * 2 - Math.PI / 2;
}

export function circularPoint(coordinate0: number, sequenceLength: number, radius: number, center = 360): Point2D {
  const angle = circularCoordinateToAngle(coordinate0, sequenceLength);
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
}

export function circularArcPath(interval: SequenceInterval, sequenceLength: number, radius: number, center = 360): string {
  const span = interval.end0Exclusive - interval.start0;
  if (span <= 0 || sequenceLength <= 0) return '';
  if (span >= sequenceLength) {
    const top = circularPoint(0, sequenceLength, radius, center);
    const bottom = circularPoint(sequenceLength / 2, sequenceLength, radius, center);
    return `M ${top.x} ${top.y} A ${radius} ${radius} 0 1 1 ${bottom.x} ${bottom.y} A ${radius} ${radius} 0 1 1 ${top.x} ${top.y}`;
  }
  const start = circularPoint(interval.start0, sequenceLength, radius, center);
  const end = circularPoint(interval.end0Exclusive, sequenceLength, radius, center);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${span > sequenceLength / 2 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

export function featureMidpoint0(feature: Feature, sequenceLength: number): number {
  if (sequenceLength <= 0 || feature.segments.length === 0) return 0;
  const originStart = feature.segments.find(segment => segment.start0 === 0);
  const originEnd = feature.segments.find(segment => segment.end0Exclusive === sequenceLength);
  if (originStart && originEnd && feature.segments.length >= 2) {
    const length = feature.segments.reduce((sum, segment) => sum + segment.end0Exclusive - segment.start0, 0);
    return (originEnd.start0 + length / 2) % sequenceLength;
  }
  const first = [...feature.segments].sort((left, right) => left.start0 - right.start0)[0];
  const length = feature.segments.reduce((sum, segment) => sum + segment.end0Exclusive - segment.start0, 0);
  return (first.start0 + length / 2) % sequenceLength;
}

export interface CircularLabelPlacement {
  featureId: string;
  anchor: Point2D;
  x: number;
  y: number;
  side: 'left' | 'right';
}

export function placeCircularFeatureLabels(features: Feature[], sequenceLength: number, radius = 278, center = 360): CircularLabelPlacement[] {
  const placements = features.map(feature => {
    const coordinate0 = featureMidpoint0(feature, sequenceLength);
    const anchor = circularPoint(coordinate0, sequenceLength, radius, center);
    const side = anchor.x < center ? 'left' as const : 'right' as const;
    return { featureId: feature.id, anchor, x: side === 'left' ? 46 : 674, y: anchor.y, side };
  });
  for (const side of ['left', 'right'] as const) {
    const items = placements.filter(item => item.side === side).sort((left, right) => left.y - right.y || left.featureId.localeCompare(right.featureId));
    let nextY = 42;
    for (const item of items) {
      item.y = Math.max(item.y, nextY);
      nextY = item.y + 22;
    }
    const overflow = Math.max(0, nextY - 22 - 678);
    if (overflow > 0) for (const item of items) item.y -= overflow;
  }
  return placements.sort((left, right) => left.featureId.localeCompare(right.featureId));
}

export function clientPointToCircularCoordinate(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  sequenceLength: number,
): { coordinate0: number; angle: number } {
  if (sequenceLength <= 0) return { coordinate0: 0, angle: 0 };
  // SVG's default xMidYMid/meet transform letterboxes rectangular panels.
  // Invert that exact transform so pointer geometry stays stable at every size.
  const scale = Math.min(bounds.width / 720, bounds.height / 720);
  const offsetX = (bounds.width - 720 * scale) / 2;
  const offsetY = (bounds.height - 720 * scale) / 2;
  const x = (clientX - bounds.left - offsetX) / scale - 360;
  const y = (clientY - bounds.top - offsetY) / scale - 360;
  let angle = Math.atan2(y, x) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  if (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return { coordinate0: Math.min(sequenceLength - 1, Math.floor(angle / (Math.PI * 2) * sequenceLength)), angle };
}

export function localPointToCircularCoordinate(x: number, y: number, sequenceLength: number, center = 360): { coordinate0: number; angle: number } {
  if (sequenceLength <= 0) return { coordinate0: 0, angle: 0 };
  let angle = Math.atan2(y - center, x - center) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  if (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return { coordinate0: Math.min(sequenceLength - 1, Math.floor(angle / (Math.PI * 2) * sequenceLength)), angle };
}

export function resolveScreenCircularDragRange(
  anchorCoordinate0: number,
  currentCoordinate0: number,
  clockwiseAngularDelta: number,
  sequenceLength: number,
  fullCircleReached = false,
): { start0: number; end0Exclusive: number } {
  return resolveCircularDragRange(anchorCoordinate0, currentCoordinate0, -clockwiseAngularDelta, sequenceLength, fullCircleReached);
}

export interface RestrictionSiteCluster {
  coordinate0: number;
  sites: RestrictionSite[];
}

export function clusterCircularRestrictionSites(sites: RestrictionSite[], sequenceLength: number): RestrictionSiteCluster[] {
  if (sites.length === 0) return [];
  const thresholdBp = Math.max(1, Math.floor(sequenceLength / 180));
  const sorted = [...sites].sort((left, right) => left.forwardCut0 - right.forwardCut0 || left.enzymeName.localeCompare(right.enzymeName));
  const clusters: RestrictionSiteCluster[] = [];
  for (const site of sorted) {
    const previous = clusters.at(-1);
    if (previous && site.forwardCut0 - previous.sites.at(-1)!.forwardCut0 <= thresholdBp) previous.sites.push(site);
    else clusters.push({ coordinate0: site.forwardCut0, sites: [site] });
  }
  if (clusters.length > 1) {
    const first = clusters[0];
    const last = clusters.at(-1)!;
    if (first.sites[0].forwardCut0 + sequenceLength - last.sites.at(-1)!.forwardCut0 <= thresholdBp) {
      first.sites = [...last.sites, ...first.sites];
      clusters.pop();
    }
  }
  return clusters;
}
