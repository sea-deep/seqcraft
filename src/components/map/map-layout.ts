import type { Feature } from '../../domain/feature';
import { deduplicateFeaturesForDisplay } from '../sequence/feature-layout';

export interface PlacedMapFeature {
  feature: Feature;
  lane: number;
}

export function assignFeatureLanes(features: Feature[]): PlacedMapFeature[] {
  // Exclude source and deduplicate
  const visible = deduplicateFeaturesForDisplay(features.filter(f => f.type !== 'source'));
  
  const placed: PlacedMapFeature[] = [];
  
  // Sort features by starting position
  const sorted = [...visible].sort((a, b) => {
    const aMin = Math.min(...a.segments.map(s => s.start0));
    const bMin = Math.min(...b.segments.map(s => s.start0));
    return aMin - bMin;
  });

  const lanes: Feature[][] = [];

  for (const feature of sorted) {
    let placedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      let overlap = false;
      for (const existing of lanes[i]) {
        // Map features are circular, so they can overlap across the origin.
        // It's safer to check segments against segments
        for (const segA of feature.segments) {
          for (const segB of existing.segments) {
            // Half open intervals overlap if max(starts) < min(ends)
            if (Math.max(segA.start0, segB.start0) < Math.min(segA.end0Exclusive, segB.end0Exclusive)) {
              overlap = true;
              break;
            }
          }
          if (overlap) break;
        }
        if (overlap) break;
      }
      if (!overlap) {
        lanes[i].push(feature);
        placedLane = i;
        break;
      }
    }
    
    if (placedLane === -1) {
      lanes.push([feature]);
      placedLane = lanes.length - 1;
    }
    
    placed.push({ feature, lane: placedLane });
  }

  return placed;
}
