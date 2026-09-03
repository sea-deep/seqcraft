import type { Feature } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { circularCoordinateToAngle, circularPoint, featureMidpoint0, type Point2D } from './circular-map-2d-geometry';

export interface BoundingBox2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedSingleLabel {
  kind: 'single';
  id: string;
  feature: Feature;
  displayName: string;
  color: string;
  priority: number;
  lane: number;
  anchorAngle: number;
  labelAngle: number;
  labelRadius: number;
  innerPoint: Point2D;
  anchorPoint: Point2D;
  textPoint: Point2D;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'hanging' | 'middle' | 'auto';
  bbox: BoundingBox2D;
  isSelected: boolean;
}

export interface PlacedClusterLabel {
  kind: 'cluster';
  id: string;
  features: Feature[];
  displayName: string; // e.g. "Features (3)"
  color: string;
  priority: number;
  lane: number;
  anchorAngle: number;
  labelAngle: number;
  labelRadius: number;
  innerPoint: Point2D;
  anchorPoint: Point2D;
  textPoint: Point2D;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'hanging' | 'middle' | 'auto';
  bbox: BoundingBox2D;
  count: number;
  isSelected: boolean;
}

export type PlacedCircularLabel = PlacedSingleLabel | PlacedClusterLabel;

export interface CircularLabelLayoutOptions {
  center?: number;
  backboneRadius?: number;
  laneRadii?: number[];
  viewBoxSize?: number;
  viewportPadding?: number;
  selectedFeatureId?: string | null;
  hoveredFeatureId?: string | null;
}

/**
 * Returns a biological importance score for a feature.
 * Higher score features receive primary placement and lane priority.
 */
export function getFeatureBiologicalPriority(feature: Feature, isSelected: boolean): number {
  if (isSelected) return 1000;

  const type = feature.type.toLowerCase();
  const name = feature.name.toLowerCase();

  // Core essential coding & replication features
  if (type === 'cds' || type === 'resistance marker' || type.includes('resistance')) return 100;
  if (type === 'rep_origin' || type === 'origin' || name.includes('ori') || name.includes('origin')) return 95;
  if (type === 'gene') return 80;

  // Promoters, terminators, operators
  if (type === 'promoter' || name.includes('promoter')) return 70;
  if (type === 'terminator' || type === 'operator') return 60;
  if (type === 'regulatory') return 55;

  // Mobile elements, repeats
  if (type === 'transposon' || type === 'mobile_element') return 50;
  if (type === 'repeat_region') return 40;

  // Peptides, misc features
  if (type === 'signal_peptide' || type === 'mat_peptide') return 35;
  if (type === 'misc_feature') return 30;

  // Low-priority dense signals
  if (type === 'misc_binding' || type.includes('binding')) return 15;
  if (type === 'misc_difference' || type === 'old_sequence') return 10;
  if (type === 'primer_bind') return 10;

  return 20;
}

/**
 * Returns a human-friendly display name, extracting notes for untitled features.
 */
export function resolveFeatureDisplayName(feature: Feature): string {
  const type = feature.type.toLowerCase();
  const isMinor = type === 'misc_feature' || type === 'misc_binding' || type === 'misc_difference' || type === 'old_sequence';
  const qualifiers = feature.qualifiers ?? {};

  // For minor types (e.g. tiny 4bp binding sites or mutations), don't inherit the parent gene name
  // which causes 5 separate "tet" labels to be rendered.
  if (isMinor) {
    if (qualifiers.bound_moiety) {
      const moiety = Array.isArray(qualifiers.bound_moiety) ? qualifiers.bound_moiety[0] : qualifiers.bound_moiety;
      return `${moiety} site`;
    }
    if (qualifiers.note) {
      const note = Array.isArray(qualifiers.note) ? qualifiers.note[0] : qualifiers.note;
      const shortNote = note.split('.')[0]?.split('(')[0]?.trim();
      if (shortNote && shortNote.length <= 24) return shortNote;
    }
    if (type === 'misc_binding') return 'binding site';
    if (type === 'misc_difference') return 'variation';
    if (type === 'old_sequence') return 'revision';
  }

  if (feature.name && feature.name !== 'Untitled Feature') {
    return feature.name;
  }
  if (qualifiers.bound_moiety) {
    const moiety = Array.isArray(qualifiers.bound_moiety) ? qualifiers.bound_moiety[0] : qualifiers.bound_moiety;
    return `${moiety} site`;
  }
  if (qualifiers.note) {
    const note = Array.isArray(qualifiers.note) ? qualifiers.note[0] : qualifiers.note;
    const shortNote = note.split('.')[0]?.split('(')[0]?.trim();
    if (shortNote && shortNote.length <= 24) return shortNote;
  }
  if (qualifiers.product) {
    const prod = Array.isArray(qualifiers.product) ? qualifiers.product[0] : qualifiers.product;
    return prod;
  }
  return feature.type === 'misc_feature' ? 'misc' : feature.type;
}

/**
 * Deduplicates co-extensive features (e.g. gene + CDS for bla or tet)
 * to avoid duplicate text rendering on identical loci.
 */
export function deduplicateFeaturesForLabels(features: Feature[]): Feature[] {
  const visible = features.filter(f => f.type !== 'source');
  const seenLoci = new Map<string, Feature>();

  for (const f of visible) {
    const s0 = f.segments[0]?.start0 ?? 0;
    const e0 = f.segments[f.segments.length - 1]?.end0Exclusive ?? 0;
    const displayName = resolveFeatureDisplayName(f);
    const key = `${displayName}::${s0}::${e0}`;
    const existing = seenLoci.get(key);

    if (!existing) {
      seenLoci.set(key, f);
    } else {
      // Keep the one with higher biological priority (e.g. CDS over gene)
      const existingScore = getFeatureBiologicalPriority(existing, false);
      const newScore = getFeatureBiologicalPriority(f, false);
      if (newScore > existingScore) {
        seenLoci.set(key, f);
      }
    }
  }

  return Array.from(seenLoci.values());
}

/**
 * Computes the minimum circular angular distance between two angles in radians.
 */
export function circularAngularDelta(angle1: number, angle2: number): number {
  let diff = Math.abs(angle1 - angle2) % (Math.PI * 2);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
}

/**
 * Checks if two bounding boxes collide with specified padding.
 */
export function bboxesCollide(b1: BoundingBox2D, b2: BoundingBox2D, padX = 8, padY = 4): boolean {
  return (
    b1.x - padX < b2.x + b2.width &&
    b1.x + b1.width + padX > b2.x &&
    b1.y - padY < b2.y + b2.height &&
    b1.y + b1.height + padY > b2.y
  );
}

/**
 * Computes bounding box and typography alignment for a label at a given angle and radius.
 */
export function computeLabelBox(
  angle: number,
  radius: number,
  text: string,
  center = 360,
  fontSize = 11,
  padding = 16
): {
  textPoint: Point2D;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'hanging' | 'middle' | 'auto';
  bbox: BoundingBox2D;
} {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const rawX = center + cosA * radius;
  const rawY = center + sinA * radius;

  // Approximate rendered text width (monospace/proportional average ~6.5px per char for 11px)
  const charWidth = fontSize * 0.62;
  const textWidth = Math.min(140, Math.max(24, text.length * charWidth + 8));
  const textHeight = fontSize + 4;

  let textAnchor: 'start' | 'middle' | 'end';
  let dominantBaseline: 'hanging' | 'middle' | 'auto';
  let bboxX = rawX;
  let bboxY = rawY;

  // Top/bottom poles (|cosA| < 0.28) use center alignment
  if (Math.abs(cosA) < 0.28) {
    textAnchor = 'middle';
    bboxX = rawX - textWidth / 2;
  } else if (cosA > 0) {
    textAnchor = 'start';
    bboxX = rawX + 4; // slight leader standoff
  } else {
    textAnchor = 'end';
    bboxX = rawX - textWidth - 4;
  }

  // Vertical baseline alignment
  if (sinA > 0.45) {
    dominantBaseline = 'hanging';
    bboxY = rawY + 2;
  } else if (sinA < -0.45) {
    dominantBaseline = 'auto';
    bboxY = rawY - textHeight - 2;
  } else {
    dominantBaseline = 'middle';
    bboxY = rawY - textHeight / 2;
  }

  // Viewport bounds clamping
  const minBound = padding;
  const maxBound = center * 2 - padding;

  if (bboxX < minBound) {
    const shift = minBound - bboxX;
    bboxX += shift;
  } else if (bboxX + textWidth > maxBound) {
    const shift = bboxX + textWidth - maxBound;
    bboxX -= shift;
  }

  if (bboxY < minBound) {
    const shift = minBound - bboxY;
    bboxY += shift;
  } else if (bboxY + textHeight > maxBound) {
    const shift = bboxY + textHeight - maxBound;
    bboxY -= shift;
  }

  return {
    textPoint: { x: rawX, y: rawY },
    textAnchor,
    dominantBaseline,
    bbox: { x: bboxX, y: bboxY, width: textWidth, height: textHeight }
  };
}

/**
 * Computes a deterministic, collision-aware label layout for a circular plasmid map.
 */
export function computeCircularLabelLayout(
  features: Feature[],
  sequenceLength: number,
  options: CircularLabelLayoutOptions = {}
): PlacedCircularLabel[] {
  if (!features || features.length === 0 || sequenceLength <= 0) return [];

  const center = options.center ?? 360;
  const backboneRadius = options.backboneRadius ?? 175;
  const selectedFeatureId = options.selectedFeatureId ?? null;

  // Concentric outward radial label lanes
  const laneRadii = options.laneRadii ?? [
    backboneRadius + 32, // Lane 0: ~207px
    backboneRadius + 56, // Lane 1: ~231px
    backboneRadius + 80, // Lane 2: ~255px
    backboneRadius + 104 // Lane 3: ~279px
  ];

  // 1. Deduplicate co-extensive duplicates
  const candidates = deduplicateFeaturesForLabels(features);

  // 2. Prepare items with base geometry and priority
  interface PreparedItem {
    feature: Feature;
    displayName: string;
    priority: number;
    midpoint0: number;
    anchorAngle: number;
    innerPoint: Point2D;
    anchorPoint: Point2D;
    isSelected: boolean;
  }

  const prepared: PreparedItem[] = candidates.map(feature => {
    const isSelected = feature.id === selectedFeatureId;
    const priority = getFeatureBiologicalPriority(feature, isSelected);
    const midpoint0 = featureMidpoint0(feature, sequenceLength);
    const anchorAngle = circularCoordinateToAngle(midpoint0, sequenceLength);
    const displayName = resolveFeatureDisplayName(feature);

    // Inner anchor on feature ribbon
    const innerPoint = circularPoint(midpoint0, sequenceLength, backboneRadius - 16, center);
    // Outer anchor just past restriction zone
    const anchorPoint = circularPoint(midpoint0, sequenceLength, backboneRadius + 14, center);

    return {
      feature,
      displayName,
      priority,
      midpoint0,
      anchorAngle,
      innerPoint,
      anchorPoint,
      isSelected
    };
  });

  // 3. Sort candidates deterministically:
  // - Selection first
  // - Higher priority first
  // - Longer features first
  // - Deterministic coordinate/id tie-breakers
  prepared.sort((a, b) => {
    if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    const lenA = a.feature.segments.reduce((acc, s) => acc + s.end0Exclusive - s.start0, 0);
    const lenB = b.feature.segments.reduce((acc, s) => acc + s.end0Exclusive - s.start0, 0);
    if (lenA !== lenB) return lenB - lenA;
    if (a.midpoint0 !== b.midpoint0) return a.midpoint0 - b.midpoint0;
    return a.feature.id.localeCompare(b.feature.id);
  });

  const placedLabels: PlacedCircularLabel[] = [];
  const unplacedItems: PreparedItem[] = [];

  // 4. Try placing each candidate across lanes and slight angular offsets
  const angularNudges = [0, -0.025, 0.025, -0.05, 0.05, -0.08, 0.08]; // in radians (~0° to ±4.5°)

  for (const item of prepared) {
    let placed = false;

    // Check each lane from inside out
    for (let lane = 0; lane < laneRadii.length; lane++) {
      const radius = laneRadii[lane];

      for (const nudge of angularNudges) {
        const candidateAngle = item.anchorAngle + nudge;
        const boxInfo = computeLabelBox(candidateAngle, radius, item.displayName, center);

        // Check collision against all already placed labels
        let collides = false;
        for (const existing of placedLabels) {
          if (bboxesCollide(boxInfo.bbox, existing.bbox, 6, 3)) {
            collides = true;
            break;
          }
        }

        if (!collides) {
          placedLabels.push({
            kind: 'single',
            id: item.feature.id,
            feature: item.feature,
            displayName: item.displayName,
            color: getFeatureColor(item.feature.type),
            priority: item.priority,
            lane,
            anchorAngle: item.anchorAngle,
            labelAngle: candidateAngle,
            labelRadius: radius,
            innerPoint: item.innerPoint,
            anchorPoint: item.anchorPoint,
            textPoint: boxInfo.textPoint,
            textAnchor: boxInfo.textAnchor,
            dominantBaseline: boxInfo.dominantBaseline,
            bbox: boxInfo.bbox,
            isSelected: item.isSelected
          });
          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      unplacedItems.push(item);
    }
  }

  // 5. Cluster dense unplaced items into clean "Features (N)" badges
  if (unplacedItems.length > 0) {
    // Sort unplaced items circularly by anchor angle
    unplacedItems.sort((a, b) => a.anchorAngle - b.anchorAngle);

    // Group unplaced items that are within ~0.4 rad (~23°) of each other
    const clusters: PreparedItem[][] = [];
    let currentCluster: PreparedItem[] = [unplacedItems[0]];

    for (let i = 1; i < unplacedItems.length; i++) {
      const prev = currentCluster[currentCluster.length - 1];
      const curr = unplacedItems[i];
      if (circularAngularDelta(prev.anchorAngle, curr.anchorAngle) <= 0.42) {
        currentCluster.push(curr);
      } else {
        clusters.push(currentCluster);
        currentCluster = [curr];
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Wrap around check: does first and last cluster touch across 0°/360°?
    if (clusters.length > 1) {
      const first = clusters[0];
      const last = clusters[clusters.length - 1];
      if (circularAngularDelta(first[0].anchorAngle, last[last.length - 1].anchorAngle) <= 0.42) {
        clusters[0] = [...last, ...first];
        clusters.pop();
      }
    }

    // Search radii for cluster placement: include an outer shelf if interior is dense
    const clusterRadii = [
      laneRadii[1],
      laneRadii[2],
      laneRadii[3],
      laneRadii[3] + 20
    ];

    // Angular search offsets (sweeping outward from cluster centroid)
    const sweepOffsets: number[] = [0];
    for (let step = 1; step <= 15; step++) {
      sweepOffsets.push(step * 0.035);
      sweepOffsets.push(-step * 0.035);
    }

    // Place each cluster badge
    for (const cluster of clusters) {
      // Centroid angle
      const avgSin = cluster.reduce((sum, it) => sum + Math.sin(it.anchorAngle), 0) / cluster.length;
      const avgCos = cluster.reduce((sum, it) => sum + Math.cos(it.anchorAngle), 0) / cluster.length;
      const clusterAngle = Math.atan2(avgSin, avgCos);

      // Representative type/name
      const count = cluster.length;
      const primaryType = cluster[0].feature.type;
      const displayName =
        primaryType === 'misc_binding'
          ? `Binding sites (${count})`
          : primaryType.includes('promoter') || primaryType === 'regulatory'
          ? `Signals (${count})`
          : `Features (${count})`;

      // Midpoint on circular track
      const repItem = cluster[Math.floor(cluster.length / 2)];

      let placedCluster = false;
      for (const radius of clusterRadii) {
        for (const offset of sweepOffsets) {
          const candidateAngle = clusterAngle + offset;
          const boxInfo = computeLabelBox(candidateAngle, radius, displayName, center, 10);

          let collides = false;
          for (const existing of placedLabels) {
            if (bboxesCollide(boxInfo.bbox, existing.bbox, 4, 3)) {
              collides = true;
              break;
            }
          }

          if (!collides) {
            const laneIndex = laneRadii.indexOf(radius);
            placedLabels.push({
              kind: 'cluster',
              id: `cluster-${cluster.map(c => c.feature.id).join('-')}`,
              features: cluster.map(c => c.feature),
              displayName,
              color: 'var(--bio-misc)',
              priority: 15,
              lane: laneIndex >= 0 ? laneIndex : 3,
              anchorAngle: clusterAngle,
              labelAngle: candidateAngle,
              labelRadius: radius,
              innerPoint: repItem.innerPoint,
              anchorPoint: repItem.anchorPoint,
              textPoint: boxInfo.textPoint,
              textAnchor: boxInfo.textAnchor,
              dominantBaseline: boxInfo.dominantBaseline,
              bbox: boxInfo.bbox,
              count,
              isSelected: cluster.some(it => it.isSelected)
            });
            placedCluster = true;
            break;
          }
        }
        if (placedCluster) break;
      }
    }
  }

  return placedLabels;
}
