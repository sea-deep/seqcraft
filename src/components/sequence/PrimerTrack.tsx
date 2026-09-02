import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Primer, PrimerBinding } from '../../domain/primer';
import { baseX, segmentWidth } from './sequence-geometry';
import type { PlacedPrimerBinding } from './primer-track-layout';

export function PrimerTrack({ bindings, selectedPrimerId, onPrimerClick }: { bindings: PlacedPrimerBinding[]; selectedPrimerId: string | null; onPrimerClick: (primer: Primer, binding: PrimerBinding, event: ReactMouseEvent) => void }) {
  if (bindings.length === 0) return null;
  const lanes = Math.max(...bindings.map(binding => binding.lane)) + 1;
  return (
    <div className="relative mb-1" style={{ height: lanes * 16 }}>
      {bindings.map((placed, index) => {
        const selected = selectedPrimerId === placed.primer.id;
        const reverse = placed.binding.orientation === 'reverse';
        return <button key={`${placed.primer.id}-${placed.binding.start0}-${placed.binding.orientation}-${index}`} onClick={event => onPrimerClick(placed.primer, placed.binding, event)} title={`${placed.primer.name} · ${placed.binding.orientation}`} className={`absolute h-[14px] overflow-hidden whitespace-nowrap border px-1 text-left text-[10px] ${selected ? 'z-20 border-[var(--selection-border)] bg-[var(--bio-primer)] text-white' : 'border-[var(--bio-primer)] bg-[color-mix(in_srgb,var(--bio-primer)_18%,transparent)] text-[var(--bio-primer)]'}`} style={{ left: `${baseX(placed.lineStart)}ch`, width: `${segmentWidth(placed.lineStart, placed.lineEndExclusive)}ch`, top: placed.lane * 16, clipPath: reverse ? 'polygon(7px 0,100% 0,100% 100%,7px 100%,0 50%)' : 'polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%)' }}>{placed.primer.name}</button>;
      })}
    </div>
  );
}
