import { useMemo, useState } from 'react';
import { Check, Dna, Search, X } from 'lucide-react';
import type { SequenceDocument } from '../../domain/document';
import { detectKnownFeatures, matchToDetectedFeature } from '../../scientific/known-feature-detection';
import { useWorkspaceStore } from '../../state/workspace-store';
import { getMemorySequence } from '../../utils/document-utils';

export function KnownFeatureDialog({ document, onClose }: { document: SequenceDocument; onClose: () => void }) {
  const matches = useMemo(() => detectKnownFeatures(
    getMemorySequence(document).raw,
    document.topology,
    document.features,
  ), [document]);
  const available = matches.filter(match => !match.alreadyAnnotated);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(available.map(match => match.id)));
  const addFeature = useWorkspaceStore(state => state.addFeature);

  const apply = () => {
    for (const match of available) {
      if (selectedIds.has(match.id)) addFeature(document.id, matchToDetectedFeature(match));
    }
    onClose();
  };

  const toggle = (id: string) => setSelectedIds(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="known-feature-title">
      <div className="flex max-h-[min(680px,calc(100vh-32px))] w-full max-w-[680px] flex-col rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-xl">
        <header className="flex items-start justify-between border-b border-[var(--border)] px-4 py-3">
          <div><h2 id="known-feature-title" className="flex items-center gap-2 text-[14px] font-semibold"><Dna size={16} className="text-[var(--accent)]" />Known-feature scan</h2><p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Exact local matches only—no prediction and no sequence leaves this browser.</p></div>
          <button onClick={onClose} aria-label="Close known-feature scan" className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"><X size={16} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center"><Search size={24} className="mb-3 text-[var(--text-muted)]" /><div className="font-medium">No exact known-feature matches</div><p className="mt-1 max-w-[420px] text-[12px] text-[var(--text-muted)]">The bounded library checks common promoters, operators, cloning sites, and protein tags on both strands.</p></div>
          ) : matches.map(match => {
            const selected = selectedIds.has(match.id);
            const coordinate = match.segments.map(segment => `${segment.start0 + 1}–${segment.end0Exclusive}`).join(' + ');
            return (
              <label key={match.id} className={`grid grid-cols-[28px_1fr_auto] gap-2 border-b border-[var(--border)] px-4 py-3 ${match.alreadyAnnotated ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-[var(--panel-muted)]'}`}>
                <input type="checkbox" checked={match.alreadyAnnotated || selected} disabled={match.alreadyAnnotated} onChange={() => toggle(match.id)} className="sr-only" />
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${match.alreadyAnnotated || selected ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`}>{(match.alreadyAnnotated || selected) && <Check size={13} />}</span>
                <span><span className="flex items-center gap-2 font-medium">{match.name}<span className="rounded bg-[var(--panel-muted)] px-1.5 py-0.5 text-[11px] font-normal text-[var(--text-muted)]">{match.type}</span>{match.alreadyAnnotated && <span className="text-[11px] text-[var(--success)]">already annotated</span>}</span><span className="mt-1 block text-[11px] text-[var(--text-muted)]">{match.description}</span></span>
                <span className="text-right font-mono text-[11px]"><span className="block">{coordinate}</span><span className="text-[var(--text-muted)]">{match.strand === 1 ? 'forward' : 'reverse'} · {match.lengthBp} bp</span></span>
              </label>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
          <span>{available.length} new match{available.length === 1 ? '' : 'es'} · {selectedIds.size} selected</span>
          <div className="flex gap-2"><button onClick={onClose} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 text-[var(--text)]">Cancel</button><button onClick={apply} disabled={selectedIds.size === 0} className="h-[34px] rounded-md bg-[var(--accent)] px-3 font-medium text-white disabled:opacity-40">Add selected annotations</button></div>
        </footer>
      </div>
    </div>
  );
}
