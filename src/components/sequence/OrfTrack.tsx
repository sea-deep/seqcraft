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

              const isRightArrow = isForward && isEnd;
              const isLeftArrow = !isForward && isStart;

              const arrowCutPx = width <= 1.5 ? 4 : 6;
              let clipPath = 'none';
              if (isRightArrow) {
                clipPath = `polygon(0% 0%, calc(100% - ${arrowCutPx}px) 0%, 100% 50%, calc(100% - ${arrowCutPx}px) 100%, 0% 100%)`;
              } else if (isLeftArrow) {
                clipPath = `polygon(${arrowCutPx}px 0%, 100% 0%, 100% 100%, ${arrowCutPx}px 100%, 0% 50%)`;
              }

              const frameLabel = placed.orf.frame > 0 ? `+${placed.orf.frame}` : `${placed.orf.frame}`;
              const orfStart0 = placed.orf.segments[0]?.start0 ?? 0;
              const orfEnd0 = placed.orf.segments.at(-1)?.end0Exclusive ?? 0;

              return (
                <div
                  key={`${placed.orf.id}-${idx}`}
                  className="absolute h-[10px] select-none cursor-pointer"
                  style={{
                    left: `${startX}ch`,
                    width: `${width}ch`,
                  }}
                  title={`ORF Frame ${frameLabel} (${isForward ? 'forward' : 'reverse'}) · ${orfStart0 + 1}–${orfEnd0} (${placed.orf.lengthBp} bp, ${placed.orf.protein.length} aa)`}
                >
                  {/* Outer border shell */}
                  <div
                    className="absolute inset-0 transition-opacity hover:opacity-100 opacity-90"
                    style={{
                      backgroundColor: borderColor,
                      clipPath,
                      borderRadius: clipPath === 'none' ? '2px' : undefined,
                    }}
                  >
                    {/* Inner fill */}
                    <div
                      className="absolute inset-[1px] flex items-center overflow-hidden whitespace-nowrap"
                      style={{
                        backgroundColor: color,
                        clipPath,
                        borderRadius: clipPath === 'none' ? '1px' : undefined,
                        paddingLeft: isLeftArrow ? `${arrowCutPx + 2}px` : '2px',
                        paddingRight: isRightArrow ? `${arrowCutPx + 2}px` : '2px',
                      }}
                    >
                      {width >= 4 && (
                        <span className="text-[7px] font-mono font-semibold text-white/95 leading-none">
                          {frameLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
