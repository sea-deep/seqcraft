import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Primer } from '../../domain/primer';
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface PrimerDialogProps {
  document: SequenceDocument;
  primer?: Primer;
  selection?: { start0: number; end0Exclusive: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function selectedSequence(document: SequenceDocument, selection?: { start0: number; end0Exclusive: number }): string {
  if (!selection) return '';
  return selection.end0Exclusive >= selection.start0
    ? getMemorySequence(document).raw.slice(selection.start0, selection.end0Exclusive)
    : getMemorySequence(document).raw.slice(selection.start0) + getMemorySequence(document).raw.slice(0, selection.end0Exclusive);
}

export function PrimerDialog({ document, primer, selection, open, onOpenChange }: PrimerDialogProps) {
  const addPrimer = useWorkspaceStore(state => state.addPrimer);
  const updatePrimer = useWorkspaceStore(state => state.updatePrimer);
  const deletePrimer = useWorkspaceStore(state => state.deletePrimer);
  const templateSequence = useMemo(() => selectedSequence(document, selection).toUpperCase(), [document, selection]);
  const [name, setName] = useState(primer?.name ?? `Primer ${(document.primers?.length ?? 0) + 1}`);
  const [sequence, setSequence] = useState(primer?.sequence ?? templateSequence);
  const [description, setDescription] = useState(primer?.description ?? '');
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward');
  const validSequence = sequence.length > 0 && /^[ACGTRYSWKMBDHVN]+$/i.test(sequence);

  const changeDirection = (next: 'forward' | 'reverse') => {
    setDirection(next);
    if (!primer && templateSequence) setSequence(next === 'forward' ? templateSequence : reverseComplementIupac(templateSequence));
  };

  const save = () => {
    if (!name.trim() || !validSequence) return;
    const next: Primer = { id: primer?.id ?? generateId(), name: name.trim(), sequence: sequence.toUpperCase(), description: description.trim() || undefined };
    if (primer) updatePrimer(document.id, next);
    else addPrimer(document.id, next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-5 gap-4">
        <DialogHeader><DialogTitle>{primer ? 'Edit primer' : 'Create primer'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 outline-none focus:border-[var(--accent)]" /></label>
          {!primer && templateSequence && (
            <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Direction from selection</span><select value={direction} onChange={event => changeDirection(event.target.value as 'forward' | 'reverse')} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="forward">Forward (selected strand)</option><option value="reverse">Reverse complement</option></select></label>
          )}
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Sequence (5′→3′)</span><textarea value={sequence} onChange={event => setSequence(event.target.value.replace(/\s/g, '').toUpperCase())} className="min-h-[76px] resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 font-mono outline-none focus:border-[var(--accent)]" /></label>
          {!validSequence && sequence && <div className="text-[var(--danger)]">Use DNA IUPAC bases only.</div>}
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Description</span><input value={description} onChange={event => setDescription(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 outline-none focus:border-[var(--accent)]" /></label>
        </div>
        <DialogFooter className="items-center">
          {primer && <button onClick={() => { if (window.confirm(`Delete primer “${primer.name}”?`)) { deletePrimer(document.id, primer.id); onOpenChange(false); } }} className="mr-auto h-[34px] rounded-md px-3 text-[var(--danger)] hover:bg-[var(--panel-muted)]">Delete</button>}
          <button onClick={() => onOpenChange(false)} className="h-[34px] rounded-md border border-[var(--border)] px-3 hover:bg-[var(--panel-muted)] cursor-pointer">Cancel</button>
          <button onClick={save} className="h-[34px] rounded-md bg-[var(--accent)] px-3 text-[13px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors cursor-pointer">Save primer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
