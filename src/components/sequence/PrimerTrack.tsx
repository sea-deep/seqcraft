import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Primer, PrimerBinding } from '../../domain/primer';
import { baseX, segmentWidth } from './sequence-geometry';
import type { PlacedPrimerBinding } from './primer-track-layout';

export function PrimerTrack({ 
  bindings, 
  lineStart0 = 0,
  selectedPrimerId, 
  onPrimerClick 
}: { 
  bindings: PlacedPrimerBinding[]; 
  lineStart0?: number;
  selectedPrimerId: string | null; 
  onPrimerClick: (primer: Primer, binding: PrimerBinding, event: ReactMouseEvent) => void;
}) {
  if (bindings.length === 0) return null;
  const lanes = Math.max(...bindings.map(binding => binding.lane)) + 1;
  return (
    <div className="relative mb-1" style={{ height: lanes * 16 }}>
      {bindings.map((placed, index) => {
        const selected = selectedPrimerId === placed.primer.id;
        const reverse = placed.binding.orientation === 'reverse';
        const actualStart = lineStart0 + placed.lineStart;
        const actualEnd = lineStart0 + placed.lineEndExclusive;

        const isRightArrow = !reverse && actualEnd === placed.binding.end0Exclusive;
        const isLeftArrow = reverse && actualStart === placed.binding.start0;

        const widthCh = segmentWidth(placed.lineStart, placed.lineEndExclusive);
        const arrowCutPx = widthCh <= 1.5 ? 4 : 7;

        let clipPath = 'none';
        if (isRightArrow) {
          clipPath = `polygon(0% 0%, calc(100% - ${arrowCutPx}px) 0%, 100% 50%, calc(100% - ${arrowCutPx}px) 100%, 0% 100%)`;
        } else if (isLeftArrow) {
          clipPath = `polygon(${arrowCutPx}px 0%, 100% 0%, 100% 100%, ${arrowCutPx}px 100%, 0% 50%)`;
        }

        return (
          <button 
            key={`${placed.primer.id}-${placed.binding.start0}-${placed.binding.orientation}-${index}`} 
            onClick={event => onPrimerClick(placed.primer, placed.binding, event)} 
            title={`${placed.primer.name} · ${placed.binding.orientation} primer · ${placed.binding.start0 + 1}–${placed.binding.end0Exclusive}`} 
            className="absolute h-[14px] text-left select-none cursor-pointer group"
            style={{ 
              left: `${baseX(placed.lineStart)}ch`, 
              width: `${widthCh}ch`, 
              top: placed.lane * 16,
              zIndex: selected ? 30 : 15,
            }}
          >
            {/* Outer border shell */}
            <div
              className="absolute inset-0 transition-colors"
              style={{
                backgroundColor: selected ? 'var(--selection-border)' : 'var(--bio-primer)',
                clipPath,
                borderRadius: clipPath === 'none' ? '2px' : undefined,
              }}
            >
              {/* Inner fill */}
              <div
                className="absolute inset-[1px] flex items-center overflow-hidden whitespace-nowrap"
                style={{
                  backgroundColor: selected ? 'var(--bio-primer)' : 'color-mix(in srgb, var(--bio-primer) 18%, transparent)',
                  clipPath,
                  borderRadius: clipPath === 'none' ? '1.5px' : undefined,
                  paddingLeft: isLeftArrow ? `${arrowCutPx + 3}px` : '4px',
                  paddingRight: isRightArrow ? `${arrowCutPx + 3}px` : '4px',
                }}
              >
                <span className={`truncate text-[11px] font-semibold font-ui leading-none ${selected ? 'text-white' : 'text-[var(--bio-primer)]'}`}>
                  {placed.primer.name}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
