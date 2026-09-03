import { useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import type { Feature, FeatureType, SequenceInterval } from '../../domain/feature';
import { getFeatureTypesByCategory, FEATURE_CATEGORIES, type FeatureCategory } from '../../domain/feature-ontology';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

export interface FeatureSelection {
  start0: number;
  end0Exclusive: number;
}

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  coding: 'Coding & Expression',
  regulatory: 'Regulatory & Signals',
  rna: 'Non-Coding RNA',
  structural: 'Structural & Mobile',
  binding: 'Binding Sites',
  synthetic: 'Synthetic & Recombination',
  general: 'General & Source'
};

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

  const groupedTypes = getFeatureTypesByCategory();

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
        id: generateId(),
        name: trimmedName,
        type,
        strand,
        segments: selectionToFeatureSegments(selection, document),
        qualifiers,
        source: 'manual',
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-4">
        <DialogHeader>
          <DialogTitle>{feature ? 'Edit Feature' : 'Add Feature'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1.5">
            <span className="text-[var(--text-secondary)] font-medium">Feature Name</span>
            <input
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[var(--text-secondary)] font-medium">Biological Type</span>
              <select
                value={type}
                onChange={event => setType(event.target.value as FeatureType)}
                className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
              >
                {FEATURE_CATEGORIES.map(category => (
                  <optgroup key={category} label={CATEGORY_LABELS[category]}>
                    {groupedTypes[category].map(def => (
                      <option key={def.id} value={def.id}>
                        {def.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[var(--text-secondary)] font-medium">Strand Orientation</span>
              <select
                value={strand}
                onChange={event => setStrand(Number(event.target.value) as 1 | -1)}
                className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
              >
                <option value={1}>Forward (5' → 3')</option>
                <option value={-1}>Reverse (3' ← 5')</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[var(--text-secondary)] font-medium">Notes & Qualifiers</span>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="e.g. gene, product, or functional annotation note"
              className="min-h-[80px] resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          {!feature && selection && (
            <div className="text-[var(--text-muted)] font-mono text-[11px]">
              Coordinates: {selection.start0 + 1}–{selection.end0Exclusive} ({selection.end0Exclusive - selection.start0} bp)
            </div>
          )}
        </div>
        <DialogFooter className="items-center justify-between">
          {feature ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteFeature(document.id, feature.id);
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
