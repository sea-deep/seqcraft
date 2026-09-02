import type { Feature, SequenceInterval } from '../../domain/feature';
import { baseX, segmentWidth, TRACK_HEIGHT } from './sequence-geometry';
import { getSegmentTerminal } from '../map/feature-endpoints';
import { getFeatureColor } from '../../domain/feature-colors';

interface FeatureSegmentProps {
  feature: Feature;
  segment: SequenceInterval;
  segmentIndex: number;
  sequenceLength: number;
  startIdx: number; // 0 to 59
  endIdxExclusive: number; // 1 to 60
  trackIndex: number;
  showLabel?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  lineStartIndex: number;
}

export function FeatureSegment({ 
  feature, 
  segment,
  segmentIndex,
  sequenceLength,
  isSelected, 
  onClick, 
  startIdx, 
  endIdxExclusive, 
  trackIndex, 
  showLabel, 
  lineStartIndex 
}: FeatureSegmentProps) {
  const leftCh = baseX(startIdx);
  const widthCh = segmentWidth(startIdx, endIdxExclusive);
  const topPx = trackIndex * 16; // 16px track lane allocation

  const actualStart = lineStartIndex + startIdx;
  const actualEnd = lineStartIndex + endIdxExclusive;

  // Use biological endpoint resolver
  const terminal = getSegmentTerminal(feature, segmentIndex, sequenceLength);
  const isRightArrow = terminal === 'clockwise-arrow' && actualEnd === segment.end0Exclusive;
  const isLeftArrow = terminal === 'counterclockwise-arrow' && actualStart === segment.start0;

  const color = getFeatureColor(feature.type);
  const bgColor = `color-mix(in srgb, ${color} 24%, transparent)`;
  const selectedBgColor = `color-mix(in srgb, ${color} 45%, transparent)`;

  // Arrowhead polygon
  // For standard widths, 8px gives an ideal arrow tip at 14px height.
  // For small widths (<= 1.5ch), scale down arrow depth so it doesn't distort.
  const arrowCutPx = widthCh <= 1.5 ? 5 : 8;

  let clipPath = 'none';
  if (isRightArrow) {
    clipPath = `polygon(0% 0%, calc(100% - ${arrowCutPx}px) 0%, 100% 50%, calc(100% - ${arrowCutPx}px) 100%, 0% 100%)`;
  } else if (isLeftArrow) {
    clipPath = `polygon(${arrowCutPx}px 0%, 100% 0%, 100% 100%, ${arrowCutPx}px 100%, 0% 50%)`;
  }

  // Label display logic
  const enoughWidth = widthCh >= 4;
  const displayLabel = showLabel && enoughWidth;

  return (
    <div
      className="absolute cursor-pointer transition-transform select-none group"
      onClick={onClick}
      style={{
        left: `${leftCh}ch`,
        width: `${widthCh}ch`,
        top: topPx,
        height: `${TRACK_HEIGHT}px`,
        zIndex: isSelected ? 30 : 10,
        filter: isSelected ? 'drop-shadow(0 0 1.5px var(--selection-border))' : undefined,
      }}
      title={`${feature.name} (${feature.type}) · ${feature.strand === 1 ? 'forward' : 'reverse'} strand · ${segment.start0 + 1}–${segment.end0Exclusive}`}
    >
      {/* Outer border shell following the exact polygon contour */}
      <div
        className="absolute inset-0 transition-colors"
        style={{
          backgroundColor: isSelected ? 'var(--selection-border)' : color,
          opacity: isSelected ? 1 : 0.85,
          clipPath,
          borderRadius: clipPath === 'none' ? '2px' : undefined,
        }}
      >
        {/* Inner fill layer creating the crisp 1px border along the arrow */}
        <div
          className="absolute inset-[1px] flex items-center overflow-hidden whitespace-nowrap"
          style={{
            backgroundColor: isSelected ? selectedBgColor : bgColor,
            clipPath,
            borderRadius: clipPath === 'none' ? '1.5px' : undefined,
          }}
        >
          {displayLabel && (
            <span 
              className="truncate text-[10px] font-semibold leading-none font-ui" 
              style={{ 
                color: isSelected ? 'var(--text-primary)' : color, 
                paddingLeft: isLeftArrow ? `${arrowCutPx + 3}px` : '4px',
                paddingRight: isRightArrow ? `${arrowCutPx + 3}px` : '4px',
              }}
            >
              {feature.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
