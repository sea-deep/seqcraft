import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import { Translation } from 'nucleotide-sequence';
import type { SequenceDocument } from '../../domain/document';
import { ScientificSequence } from '../../scientific/nucleotide';
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export function TranslationDialog({ document, selection, open, onOpenChange }: { document: SequenceDocument; selection: { start0: number; end0Exclusive: number }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [strand, setStrand] = useState<1 | -1>(1);
  const [frame, setFrame] = useState(1);
  const selected = selection.end0Exclusive >= selection.start0
    ? getMemorySequence(document).raw.slice(selection.start0, selection.end0Exclusive)
    : getMemorySequence(document).raw.slice(selection.start0) + getMemorySequence(document).raw.slice(0, selection.end0Exclusive);
  const aminoAcids = useMemo(() => {
    const oriented = strand === 1 ? selected : reverseComplementIupac(selected);
    const framed = oriented.slice(frame - 1);
    if (framed.length < 3) return '';
    return Translation.translate(new ScientificSequence(framed).engineSeq);
  }, [frame, selected, strand]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] gap-4">
        <DialogHeader><DialogTitle>Translate selection</DialogTitle></DialogHeader>
        <div className="flex gap-2 text-[12px]"><select value={strand} onChange={event => setStrand(Number(event.target.value) as 1 | -1)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value={1}>Forward strand</option><option value={-1}>Reverse strand</option></select><select value={frame} onChange={event => setFrame(Number(event.target.value))} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value={1}>Frame 1</option><option value={2}>Frame 2</option><option value={3}>Frame 3</option></select><span className="self-center text-[var(--text-muted)]">{selected.length} nt → {aminoAcids.length} aa</span></div>
        <div className="max-h-[280px] overflow-auto break-all rounded border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[13px]">{aminoAcids ? aminoAcids.split('').map((aminoAcid, index) => <span key={index} className={aminoAcid === '*' ? 'font-bold text-[var(--danger)]' : ''}>{aminoAcid}</span>) : 'Selection is too short to translate.'}</div>
      </DialogContent>
    </Dialog>
  );
}
