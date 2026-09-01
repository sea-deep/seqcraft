import type { MouseEvent as ReactMouseEvent } from 'react';
import type { RestrictionSite } from '../../scientific/restriction-analysis';
import { baseX } from './sequence-geometry';

export interface PlacedRestrictionSite {
  site: RestrictionSite;
  lane: number;
}

export function assignRestrictionLanesLine(
  sitesOnLine: RestrictionSite[],
  lineStart0: number
  
): PlacedRestrictionSite[] {
  const sorted = [...sitesOnLine].sort((a, b) => {
    if (a.forwardCut0 !== b.forwardCut0) return a.forwardCut0 - b.forwardCut0;
    return a.enzymeName.localeCompare(b.enzymeName);
  });

  const laneEnds: number[] = [];
  const placed: PlacedRestrictionSite[] = [];
  const PADDING = 1.5; // characters padding between labels
  
  for (const site of sorted) {
    const localX = site.forwardCut0 - lineStart0;
    const labelEnd = localX + site.enzymeName.length + PADDING;
    
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > localX) {
      lane++;
    }
    laneEnds[lane] = labelEnd;
    placed.push({ site, lane });
  }
  
  return placed;
}

interface RestrictionTrackProps {
  sites: PlacedRestrictionSite[];
  lineStart0: number;
  selectedSiteId: string | null;
  onSiteClick: (site: RestrictionSite, e: ReactMouseEvent) => void;
  onSiteHover: (site: RestrictionSite | null) => void;
}

export function RestrictionTrack({ sites, lineStart0, selectedSiteId, onSiteClick, onSiteHover }: RestrictionTrackProps) {
  if (sites.length === 0) return null;

  const maxLane = Math.max(...sites.map(s => s.lane), -1);
  if (maxLane === -1) return null;

  const LANE_HEIGHT = 16;
  const totalHeight = (maxLane + 1) * LANE_HEIGHT + 8; // extra space for the tick mark

  return (
    <div className="relative w-full" style={{ height: totalHeight, marginBottom: "2px" }}>
      {sites.map((placed) => {
        const { site, lane } = placed;
        const localX = site.forwardCut0 - lineStart0;
        const leftCh = baseX(localX);
        const topPx = (maxLane - lane) * LANE_HEIGHT;
        const isSelected = site.id === selectedSiteId;

        // Colors

        return (
          <div
            key={site.id}
            className="absolute group cursor-pointer"
            style={{ 
              left: `calc(${leftCh}ch - 0.5ch)`, // Center over the cut gap
              top: 0,
              bottom: 0,
              width: `${site.enzymeName.length + 2}ch`,
              zIndex: isSelected ? 20 : 10
            }}
            onClick={(e) => onSiteClick(site, e)}
            onMouseEnter={() => onSiteHover(site)}
            onMouseLeave={() => onSiteHover(null)}
          >
            {/* Label */}
            <div 
              className={`absolute font-ui text-[11px] font-medium transition-colors ${isSelected ? 'text-blue-500' : 'text-[var(--text-muted)] group-hover:text-blue-400'}`}
              style={{ top: topPx, left: '0.5ch' }}
            >
              {site.enzymeName}
            </div>

            {/* Vertical Line */}
            <div 
              className={`absolute border-l transition-colors ${isSelected ? 'border-blue-500' : 'border-[var(--text-muted)] group-hover:border-blue-400'}`}
              style={{
                left: '0.5ch',
                top: topPx + 14,
                bottom: 0, // Stretch down to sequence
                opacity: isSelected ? 1 : 0.4
              }}
            />
            
            {/* Notch at bottom */}
            <div 
              className={`absolute w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent transition-colors ${isSelected ? 'border-t-blue-500' : 'border-t-[var(--text-muted)] group-hover:border-t-blue-400'}`}
              style={{
                left: 'calc(0.5ch - 3px)',
                bottom: -2 // Touch the text
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
