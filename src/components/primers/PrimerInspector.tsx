import { getMemorySequence } from '../../utils/document-utils';
import { useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Primer } from '../../domain/primer';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { analyzePrimerProperties } from '../../scientific/primer-properties';
import { PrimerDialog } from './PrimerDialog';
import { Button } from '../ui/button';
import { Pencil } from 'lucide-react';

export function PrimerInspector({ document, primer }: { document: SequenceDocument; primer: Primer }) {
  const [editing, setEditing] = useState(false);
  const properties = analyzePrimerProperties(primer.sequence);
  const bindings = analyzePrimerBindings(getMemorySequence(document).raw, document.topology, primer);
  return (
    <div className="flex flex-col gap-3 text-[12px]">
      <div>
        <h2 className="text-[14px] font-semibold text-[var(--text)]">{primer.name}</h2>
        <div className="text-[11px] text-[var(--text-muted)]">Primer</div>
      </div>
      <div className="grid grid-cols-[84px_1fr] gap-y-2">
        <span className="text-[var(--text-muted)]">Length</span><span>{properties.length} nt</span>
        <span className="text-[var(--text-muted)]">GC</span><span>{properties.gcPercent.toFixed(1)} %</span>
        <span className="text-[var(--text-muted)]">Tm</span><span>{properties.meltingTemperature.toFixed(1)} °C</span>
        <span className="text-[var(--text-muted)]">Molecular wt.</span><span>{properties.molecularWeight.toFixed(1)} g/mol</span>
        <span className="text-[var(--text-muted)]">Bindings</span><span>{bindings.length}</span>
      </div>
      <div className="border-t border-[var(--border)] pt-3"><div className="mb-1 text-[var(--text-muted)]">Sequence 5′→3′</div><div className="break-all rounded border border-[var(--border)] bg-[var(--bg)] p-2 font-mono">{primer.sequence}</div></div>
      {bindings.map((binding, index) => <div key={`${binding.start0}-${binding.orientation}-${index}`} className="font-mono text-[11px] text-[var(--text-secondary)]">{binding.orientation} · {binding.start0 + 1}–{binding.end0Exclusive}</div>)}
      <div className="border-t border-[var(--border)] pt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEditing(true)} 
          className="w-full justify-start gap-2 text-[12px] h-[30px]"
        >
          <Pencil size={13} className="text-[var(--accent)]" />
          Edit primer
        </Button>
      </div>
      {editing && <PrimerDialog document={document} primer={primer} open onOpenChange={setEditing} />}
    </div>
  );
}
