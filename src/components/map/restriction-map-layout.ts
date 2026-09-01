import type { RestrictionSite } from '../../scientific/restriction-analysis';
import { coordinateToAngle } from './plasmid-geometry';

export interface PlacedRestrictionSite3D {
  site: RestrictionSite;
  lane: number;
  angle: number;
}

export function assignRestrictionMapLanes(
  sites: RestrictionSite[],
  sequenceLength: number,
  angularPadding: number = 0.08 // Substantially tighter angular packing
): PlacedRestrictionSite3D[] {
  const sorted = [...sites].sort((a, b) => {
    if (a.forwardCut0 !== b.forwardCut0) return a.forwardCut0 - b.forwardCut0;
    return a.enzymeName.localeCompare(b.enzymeName);
  });

  const laneAngles: number[][] = []; 
  const placed: PlacedRestrictionSite3D[] = [];

  for (const site of sorted) {
    const angle = coordinateToAngle(site.forwardCut0, sequenceLength);
    
    let lane = 0;
    let placedInLane = false;

    while (!placedInLane) {
      if (!laneAngles[lane]) {
        laneAngles[lane] = [];
      }

      let overlap = false;
      for (const existingAngle of laneAngles[lane]) {
        let diff = Math.abs(angle - existingAngle);
        while (diff > Math.PI) diff = 2 * Math.PI - diff;
        
        if (diff < angularPadding) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        laneAngles[lane].push(angle);
        placed.push({ site, lane, angle });
        placedInLane = true;
      } else {
        lane++;
      }
    }
  }

  return placed;
}

export interface RestrictionSiteRadii {
  cutRadius: number;
  markerStartRadius: number;
  markerEndRadius: number;
}

export function getRestrictionMarkerRadii(
  baseRadius: number,
  lane: number,
  isEmphasized: boolean
): RestrictionSiteRadii {
  // Substantially tighter spacing to keep the MCS cluster looking cohesive
  const LANE_SPACING = 0.45;
  // Short default tick rather than a long spoke
  const baseMarkerLength = 0.2; 
  // Slight extension when hovered/selected
  const emphasisExtension = isEmphasized ? 0.3 : 0;
  
  const cutRadius = baseRadius;
  const markerStartRadius = cutRadius;
  const markerEndRadius = cutRadius + baseMarkerLength + lane * LANE_SPACING + emphasisExtension;
  
  return {
    cutRadius,
    markerStartRadius,
    markerEndRadius
  };
}
