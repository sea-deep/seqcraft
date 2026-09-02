import { useState } from 'react';
import { prepareRestrictionClone } from '../../application/cloning';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import type { SequenceDocument } from '../../domain/document';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

export function CloningDialog({ activeDocument, documents, open, onOpenChange }: { activeDocument: SequenceDocument; documents: SequenceDocument[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const insertOptions = documents.filter(document => document.id !== activeDocument.id);
  const [insertDocumentId, setInsertDocumentId] = useState(insertOptions[0]?.id ?? '');
  const [enzymeIds, setEnzymeIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const prepare = () => {
    const enzymeNames = enzymeIds.map(id => BUILTIN_ENZYMES.find(enzyme => enzyme.id === id)?.name).filter((name): name is string => Boolean(name));
    const result = prepareRestrictionClone({ vectorDocumentId: activeDocument.id, insertDocumentId, enzymeNames });
    if (!result.ok) {
      setMessage(result.error?.replaceAll('_', ' ').toLowerCase() ?? 'Could not prepare cloning proposal.');
      return;
    }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] gap-4">
        <DialogHeader><DialogTitle>Restriction cloning</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Circular vector</span><input value={activeDocument.name} readOnly className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--panel-muted)] px-2" /></label>
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Insert document</span><select value={insertDocumentId} onChange={event => setInsertDocumentId(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="">Choose insert</option>{insertOptions.map(document => <option key={document.id} value={document.id}>{document.name} · {document.length} bp</option>)}</select></label>
          <div><div className="mb-1.5 text-[var(--text-secondary)]">Restriction enzymes</div><div className="grid grid-cols-3 gap-1.5">{BUILTIN_ENZYMES.map(enzyme => <label key={enzyme.id} className="flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1.5"><input type="checkbox" checked={enzymeIds.includes(enzyme.id)} onChange={() => setEnzymeIds(current => current.includes(enzyme.id) ? current.filter(id => id !== enzyme.id) : [...current, enzyme.id])} /><span>{enzyme.name}</span></label>)}</div></div>
          {message && <div className="rounded border border-[var(--warning)] p-2 text-[var(--warning)]">{message}</div>}
          <div className="text-[var(--text-muted)]">The predicted construct remains staged for review before a recombinant document is created.</div>
        </div>
        <DialogFooter><button onClick={() => onOpenChange(false)} className="h-[34px] rounded-md border border-[var(--border)] px-3">Cancel</button><button onClick={prepare} className="h-[34px] rounded-md bg-[var(--accent)] px-3 font-medium text-white">Prepare proposal</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
