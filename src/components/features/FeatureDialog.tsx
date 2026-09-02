import { useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Feature, FeatureType, SequenceInterval } from '../../domain/feature';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

const FEATURE_TYPES: FeatureType[] = ['CDS', 'gene', 'promoter', 'terminator', 'origin', 'resistance marker', 'tag', 'misc_feature'];

export interface FeatureSelection {
  start0: number;
  end0Exclusive: number;
}

function selectionToFeatureSegments(selection: FeatureSelection, document: SequenceDocument): SequenceInterval[] {
  if (selection.end0Exclusive >= selection.start0) return [{ ...selection }];
  return [
    { start0: selection.start0, end0Exclusive: document.length },
    { start0: 0, end0Exclusive: selection.end0Exclusive },
  ];
}

interface FeatureDialogProps {
  document: SequenceDocument;
  feature?: Feature;
  selection?: FeatureSelection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureDialog({ document, feature, selection, open, onOpenChange }: FeatureDialogProps) {
  const addFeature = useWorkspaceStore(state => state.addFeature);
  const updateFeature = useWorkspaceStore(state => state.updateFeature);
  const deleteFeature = useWorkspaceStore(state => state.deleteFeature);
  const note = feature?.qualifiers?.note;
  const [name, setName] = useState(feature?.name ?? 'New feature');
  const [type, setType] = useState<FeatureType>(feature?.type ?? 'misc_feature');
  const [strand, setStrand] = useState<1 | -1>(feature?.strand ?? 1);
  const [notes, setNotes] = useState(Array.isArray(note) ? note.join('\n') : (note ?? ''));

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const qualifiers = { ...(feature?.qualifiers ?? {}) };
    if (notes.trim()) qualifiers.note = notes.trim();
    else delete qualifiers.note;

    if (feature) {
      updateFeature(document.id, { ...feature, name: trimmedName, type, strand, qualifiers });
    } else if (selection) {
      addFeature(document.id, {
        id: generateId(), name: trimmedName, type, strand,
        segments: selectionToFeatureSegments(selection, document), qualifiers, source: 'manual',
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-4">
        <DialogHeader><DialogTitle>{feature ? 'Edit feature' : 'Add feature'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1.5">
            <span className="text-[var(--text-secondary)]">Name</span>
            <input autoFocus value={name} onChange={event => setName(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text)] outline-none focus:border-[var(--accent)]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[var(--text-secondary)]">Type</span>
              <select value={type} onChange={event => setType(event.target.value as FeatureType)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text)]">
                {FEATURE_TYPES.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[var(--text-secondary)]">Strand</span>
              <select value={strand} onChange={event => setStrand(Number(event.target.value) as 1 | -1)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text)]">
                <option value={1}>Forward</option><option value={-1}>Reverse</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[var(--text-secondary)]">Notes</span>
            <textarea value={notes} onChange={event => setNotes(event.target.value)} className="min-h-[90px] resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-[var(--text)] outline-none focus:border-[var(--accent)]" />
          </label>
          {!feature && selection && (
            <div className="text-[var(--text-muted)]">Coordinates: {selection.start0 + 1}–{selection.end0Exclusive}</div>
          )}
        </div>
        <DialogFooter className="items-center">
          {feature && (
            <button
              onClick={() => {
                if (window.confirm(`Delete feature “${feature.name}”?`)) {
                  deleteFeature(document.id, feature.id);
                  onOpenChange(false);
                }
              }}
              className="mr-auto h-[34px] rounded-md px-3 text-[var(--danger)] hover:bg-[var(--panel-muted)]"
            >Delete</button>
          )}
          <button onClick={() => onOpenChange(false)} className="h-[34px] rounded-md border border-[var(--border)] px-3 hover:bg-[var(--panel-muted)] cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="h-[34px] rounded-md bg-[var(--accent)] px-3 text-[13px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors cursor-pointer">Save feature</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
