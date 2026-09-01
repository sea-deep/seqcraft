import { Shape, ExtrudeGeometry } from 'three';

export const RADIUS = 10;
export const TUBE_RADIUS = 0.3; // Thinner backbone (was 0.4)

// Lane sizing for ribbons
export const FEATURE_INNER_OFFSET = 0.38; // 10.38
export const FEATURE_WIDTH = 0.52;        // 10.90 outer
export const FEATURE_LANE_SPACING = 0.22; // 0.18-0.25 spacing between bands
export const FEATURE_DEPTH = 0.16;        // 0.12-0.20

/**
 * 0 -> 12 o'clock (+Y axis)
 * Clockwise progression.
 */
export function coordinateToAngle(index0: number, sequenceLength: number): number {
  if (sequenceLength === 0) return Math.PI / 2;
  const fraction = index0 / sequenceLength;
  let angle = Math.PI / 2 - (fraction * Math.PI * 2);
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

export function angleToPosition(angle: number, radius: number = RADIUS): [number, number, number] {
  return [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    0
  ];
}

export type TerminalType = 'none' | 'clockwise-arrow' | 'counterclockwise-arrow';

export function createArcRibbonGeometry({
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  depth,
  terminal = 'none',
  segments = 32
}: {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  depth: number;
  terminal?: TerminalType;
  segments?: number;
}): ExtrudeGeometry {
  const shape = new Shape();
  
  let arcLength = startAngle - endAngle;
  while (arcLength < 0) arcLength += Math.PI * 2;
  
  // A full circle cannot have an arrow natively unless it's just overlapping itself,
  // but if it's a full circle we just draw the ring
  const isFullCircle = Math.abs(arcLength - Math.PI * 2) < 0.0001;
  
  if (isFullCircle && terminal === 'none') {
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new Shape();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else {
    const ribbonWidth = outerRadius - innerRadius;
    const midRadius = (innerRadius + outerRadius) / 2;
    
    // Target ~1.5x ribbon width for the arrow axial length along the arc
    const preferredArrowAngle = (1.5 * ribbonWidth) / midRadius;
    
    // Clamp to at most 60% of the arc length for short features to preserve the ribbon body
    const arrowAngle = terminal !== 'none' ? Math.min(preferredArrowAngle, arcLength * 0.6) : 0;
    
    if (terminal === 'clockwise-arrow') {
      const arrowBase = endAngle + arrowAngle;
      
      shape.absarc(0, 0, outerRadius, startAngle, arrowBase, true);
      // line to tip
      shape.lineTo(Math.cos(endAngle) * midRadius, Math.sin(endAngle) * midRadius);
      // line to inner base
      shape.lineTo(Math.cos(arrowBase) * innerRadius, Math.sin(arrowBase) * innerRadius);
      shape.absarc(0, 0, innerRadius, arrowBase, startAngle, false);
      
    } else if (terminal === 'counterclockwise-arrow') {
      const arrowBase = startAngle - arrowAngle;
      
      // We start drawing from the tip? Or we can just start anywhere and the path closes itself.
      // Let's start at the tip
      shape.moveTo(Math.cos(startAngle) * midRadius, Math.sin(startAngle) * midRadius);
      // line to outer base
      shape.lineTo(Math.cos(arrowBase) * outerRadius, Math.sin(arrowBase) * outerRadius);
      // outer arc
      shape.absarc(0, 0, outerRadius, arrowBase, endAngle, true);
      // inner arc
      shape.absarc(0, 0, innerRadius, endAngle, arrowBase, false);
      // it will close itself back to the tip
      
    } else {
      shape.absarc(0, 0, outerRadius, startAngle, endAngle, true);
      shape.absarc(0, 0, innerRadius, endAngle, startAngle, false);
    }
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
    curveSegments: segments
  });
  
  geometry.translate(0, 0, -depth / 2);
  
  return geometry;
}

export function angleToCoordinate(angle: number, sequenceLength: number): number {
  let fraction = (Math.PI / 2 - angle) / (Math.PI * 2);
  fraction = fraction - Math.floor(fraction);
  return Math.round(fraction * sequenceLength) % sequenceLength;
}

export function splitSelectionIntoSegments(start0: number, end0Exclusive: number, sequenceLength: number): { start0: number; end0Exclusive: number }[] {
  if (start0 < end0Exclusive) {
    return [{ start0, end0Exclusive }];
  } else if (start0 > end0Exclusive) {
    return [
      { start0, end0Exclusive: sequenceLength },
      { start0: 0, end0Exclusive }
    ];
  }
  return [];
}
