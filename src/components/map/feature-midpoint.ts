import type { Feature } from '../../domain/feature';
import { coordinateToAngle } from './plasmid-geometry';

export function getFeatureMidpointAngle(feature: Feature, sequenceLength: number): number {
  if (feature.segments.length === 0) return 0;

  
  let maxArcLength = -1;
  let bestStartAngle = 0;

  for (const seg of feature.segments) {
    const startAngle = coordinateToAngle(seg.start0, sequenceLength);
    const endAngle = coordinateToAngle(seg.end0Exclusive, sequenceLength);
    
    let arcLength = startAngle - endAngle;
    while (arcLength < 0) arcLength += Math.PI * 2;
    
    if (arcLength > maxArcLength) {
      maxArcLength = arcLength;
      bestStartAngle = startAngle;
      
    }
  }

  // Midpoint is halfway along the arc in the clockwise direction
  let midAngle = bestStartAngle - (maxArcLength / 2);
  
  // Normalize just to be safe
  while (midAngle < 0) midAngle += Math.PI * 2;
  while (midAngle >= Math.PI * 2) midAngle -= Math.PI * 2;
  
  return midAngle;
}

export function getIntervalMidpointAngle(start0: number, end0Exclusive: number, sequenceLength: number): number {
  if (sequenceLength <= 0) return 0;
  let span = end0Exclusive - start0;
  if (span < 0) {
    span += sequenceLength;
  }
  const midCoord = (start0 + span / 2) % sequenceLength;
  return coordinateToAngle(midCoord, sequenceLength);
}
