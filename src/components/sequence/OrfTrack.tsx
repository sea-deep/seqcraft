import { baseX, segmentWidth } from './sequence-geometry';
import type { OpenReadingFrame } from '../../scientific/orf';

export interface PlacedOrf {
  orf: OpenReadingFrame;
  lineStart: number;
  lineEndExclusive: number;
}

export function OrfTrack({ orfs, lineStart0 }: { orfs: PlacedOrf[], lineStart0: number }) {
  if (orfs.length === 0) return null;

  // Group by frame
  const frames = [1, 2, 3, -1, -2, -3];
  const tracksByFrame = new Map<number, PlacedOrf[]>();
  for (const f of frames) tracksByFrame.set(f, []);
  
  for (const placed of orfs) {
    tracksByFrame.get(placed.orf.frame)?.push(placed);
  }

  // Only render frames that have at least one ORF on THIS line, or maybe we want a consistent layout?
  // Usually it's better to only take up space if there's an ORF on this line to save vertical space, 
  // but standard sequence viewers allocate fixed rows for frames if the setting is on.
  // For MVP, compact layout: only show frames that have ORFs on THIS line.
  const activeFrames = frames.filter(f => tracksByFrame.get(f)!.length > 0);

  if (activeFrames.length === 0) return null;

  return (
    <div className="relative mt-1" style={{ height: activeFrames.length * 14 }}>
      {activeFrames.map((frame, trackIdx) => {
        const trackOrfs = tracksByFrame.get(frame)!;
        return (
          <div key={frame} className="absolute left-0 right-0" style={{ top: trackIdx * 14, height: 12 }}>
            {trackOrfs.map((placed, idx) => {
              const startX = baseX(placed.lineStart);
              const width = segmentWidth(placed.lineStart, placed.lineEndExclusive);
              const isForward = placed.orf.strand === 1;
              const color = isForward ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'; // Red for forward, Blue for reverse
              const borderColor = isForward ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)';
              
              // Determine if this segment contains the start or end of the ORF
              // to draw an arrow or rounded corner
              let isStart = false;
              let isEnd = false;
              for (const seg of placed.orf.segments) {
                 if (seg.start0 === placed.lineStart + lineStart0) isStart = true;
                 if (seg.end0Exclusive === placed.lineEndExclusive + lineStart0) isEnd = true;
              }

              // We can render a simple div with borders
              return (
                <div
                  key={`${placed.orf.id}-${idx}`}
                  className="absolute h-[10px] text-[8px] font-mono leading-[10px] text-white overflow-hidden"
                  style={{
                    left: `${startX}ch`,
                    width: `${width}ch`,
                    backgroundColor: color,
                    border: `1px solid ${borderColor}`,
                    borderLeftWidth: (isForward ? isStart : isEnd) ? '1px' : '0px',
                    borderRightWidth: (isForward ? isEnd : isStart) ? '1px' : '0px',
                    borderRadius: isForward 
                       ? `${isStart ? '3px' : '0'} ${isEnd ? '4px' : '0'} ${isEnd ? '4px' : '0'} ${isStart ? '3px' : '0'}`
                       : `${isEnd ? '4px' : '0'} ${isStart ? '3px' : '0'} ${isStart ? '3px' : '0'} ${isEnd ? '4px' : '0'}`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
