import { type Feature } from '../../domain/feature';
import { baseX, segmentWidth, TRACK_HEIGHT } from './sequence-geometry';

interface FeatureSegmentProps {
  feature: Feature;
  startIdx: number; // 0 to 59
  endIdxExclusive: number; // 1 to 60
  trackIndex: number;
  showLabel?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  lineStartIndex: number;
}

export function FeatureSegment({ feature, isSelected, onClick, startIdx, endIdxExclusive, trackIndex, showLabel, lineStartIndex }: FeatureSegmentProps) {
  const leftCh = baseX(startIdx);
  const widthCh = segmentWidth(startIdx, endIdxExclusive);
  const topPx = trackIndex * (TRACK_HEIGHT + 4);

  const actualStart = lineStartIndex + startIdx;
  const actualEnd = lineStartIndex + endIdxExclusive;

  // Find overall boundaries of the feature
  const minStart = Math.min(...feature.segments.map(s => s.start0));
  const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));

  const isBiologicalStart = actualStart === minStart;
  const isBiologicalEnd = actualEnd === maxEnd;

  const isLeftArrow = feature.strand === -1 && isBiologicalStart;
  const isRightArrow = feature.strand === 1 && isBiologicalEnd;

  // Colors based on feature type
  let colorVar = 'var(--text-muted)';
  let bgVar = 'var(--panel-muted)';
  
  if (feature.type === 'CDS' || feature.type === 'gene') {
    colorVar = '#4f46e5'; // indigo-600
    bgVar = 'rgba(79, 70, 229, 0.15)';
  } else if (feature.type === 'promoter') {
    colorVar = '#d97706'; // amber-600
    bgVar = 'rgba(217, 119, 6, 0.15)';
  } else if (feature.type === 'origin') {
    colorVar = '#0d9488'; // teal-600
    bgVar = 'rgba(13, 148, 136, 0.15)';
  } else {
    colorVar = '#7c3aed'; // violet-600
    bgVar = 'rgba(124, 58, 237, 0.15)';
  }

  // To draw arrows, we can use SVG or CSS clip-path.
  // CSS clip-path is easiest for arrowheads without extra elements.
  // A standard rectangle is: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)
  // A right arrow is: polygon(0% 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 0% 100%)
  // A left arrow is: polygon(6px 0%, 100% 0%, 100% 100%, 6px 100%, 0% 50%)

  let clipPath = 'none';
  if (isRightArrow && widthCh > 2) {
    clipPath = 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)';
  } else if (isLeftArrow && widthCh > 2) {
    clipPath = 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)';
  }

  // Label width logic
  // Only show label if the segment is wide enough, e.g., > 3 chars
  const enoughWidth = widthCh >= 4;
  const displayLabel = showLabel && enoughWidth;

  return (
    <div
      className={`absolute flex items-center overflow-hidden whitespace-nowrap cursor-pointer z-10 transition-colors ${isSelected ? "opacity-100 outline outline-1 outline-white/80 z-20" : "opacity-80 hover:opacity-100"}`}
      onClick={onClick}
      style={{
        left: `${leftCh}ch`,
        width: `${widthCh}ch`,
        top: topPx,
        height: '14px', // 12-14px body thickness
        backgroundColor: bgVar,
        clipPath: clipPath,
      }}
      title={`${feature.name} (${feature.type})`}
    >
      {displayLabel && (
        <span 
          className="px-2 text-[11px] font-medium leading-none font-ui" 
          style={{ color: colorVar, marginLeft: isLeftArrow ? '4px' : '0' }}
        >
          {feature.name}
        </span>
      )}
    </div>
  );
}
