import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import { alignSequences } from '../../scientific/sequence-comparison';
import { useWorkspaceStore } from '../../state/workspace-store';

const BASES_PER_ROW = 80;

export function CompareView({ reference, documents }: { reference: SequenceDocument; documents: SequenceDocument[] }) {
  const options = documents.filter(document => document.id !== reference.id);
  const [queryDocumentId, setQueryDocumentId] = useState(options[0]?.id ?? '');
  const query = options.find(document => document.id === queryDocumentId);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);
  const referenceSequence = getMemorySequence(reference).raw;
  const querySequence = query ? getMemorySequence(query).raw : undefined;
  const comparison = useMemo(() => querySequence ? alignSequences(referenceSequence, querySequence) : null, [querySequence, referenceSequence]);

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px]">
      <div className="sticky top-0 z-10 flex h-[44px] items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3"><span className="font-medium">Compare {reference.name} with</span><select value={queryDocumentId} onChange={event => setQueryDocumentId(event.target.value)} className="h-[30px] min-w-[220px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="">Choose a document</option>{options.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select>{comparison && <span className="ml-auto text-[var(--text-secondary)]">{comparison.identityPercent.toFixed(2)}% identity · {comparison.differences.length} differences{!comparison.exact ? ' · approximate for large inputs' : ''}</span>}</div>
      {!query && <div className="p-8 text-center text-[var(--text-muted)]">Import or open another sequence to compare.</div>}
      {comparison && query && (
        <div className="grid min-h-full grid-cols-[minmax(0,1fr)_260px]">
          <div className="overflow-auto p-3 font-mono text-[12px] leading-5">{Array.from({ length: Math.ceil(comparison.alignedReference.length / BASES_PER_ROW) }, (_, row) => {
            const start = row * BASES_PER_ROW;
            const referenceChunk = comparison.alignedReference.slice(start, start + BASES_PER_ROW);
            const queryChunk = comparison.alignedQuery.slice(start, start + BASES_PER_ROW);
            return <div key={start} className="mb-3"><div className="flex"><span className="w-[70px] shrink-0 text-[var(--text-muted)]">REF {start + 1}</span><span>{referenceChunk.split('').map((base, index) => <span key={index} className={base !== queryChunk[index] ? 'bg-[var(--selection-bg)] text-[var(--accent)]' : ''}>{base}</span>)}</span></div><div className="flex"><span className="w-[70px] shrink-0 text-[var(--text-muted)]">QRY</span><span>{queryChunk.split('').map((base, index) => <span key={index} className={base !== referenceChunk[index] ? 'bg-[var(--selection-bg)] text-[var(--accent)]' : ''}>{base}</span>)}</span></div></div>;
          })}</div>
          <aside className="border-l border-[var(--border)] bg-[var(--panel)]"><div className="border-b border-[var(--border)] px-3 py-2 font-semibold">Differences</div><div className="max-h-full overflow-auto">{comparison.differences.map((difference, index) => <button key={`${difference.alignmentStart}-${index}`} onClick={() => { const start0 = Math.min(difference.referenceStart0, Math.max(0, reference.length - 1)); const end0Exclusive = Math.max(start0 + 1, difference.referenceEnd0Exclusive); setSelection(reference.id, start0, Math.min(reference.length, end0Exclusive)); setActiveView('sequence'); }} className="block w-full border-b border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--panel-muted)]"><div className="font-medium capitalize">{difference.kind}</div><div className="font-mono text-[11px] text-[var(--text-muted)]">Reference {difference.referenceStart0 + 1}–{Math.max(difference.referenceStart0 + 1, difference.referenceEnd0Exclusive)}</div></button>)}</div></aside>
        </div>
      )}
    </div>
  );
}
