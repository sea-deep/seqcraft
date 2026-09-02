import { useState } from 'react';
import type { SequenceDocument } from '../../domain/document';
import { useWorkspaceStore } from '../../state/workspace-store';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

export function DocumentSettingsDialog({ document, open, onOpenChange }: { document: SequenceDocument; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(document.name);
  const [topology, setTopology] = useState(document.topology);
  const renameDocument = useWorkspaceStore(state => state.renameDocument);
  const setDocumentTopology = useWorkspaceStore(state => state.setDocumentTopology);
  const removeDocument = useWorkspaceStore(state => state.removeDocument);
  const save = () => {
    renameDocument(document.id, name);
    setDocumentTopology(document.id, topology);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] gap-4">
        <DialogHeader><DialogTitle>Document settings</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 outline-none focus:border-[var(--accent)]" /></label>
          <label className="grid gap-1.5"><span className="text-[var(--text-secondary)]">Topology</span><select value={topology} onChange={event => setTopology(event.target.value as SequenceDocument['topology'])} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="linear">Linear</option><option value="circular">Circular</option></select></label>
          <div className="text-[var(--text-muted)]">{document.length.toLocaleString()} bp · {document.alphabet} · version {document.version}</div>
        </div>
        <DialogFooter className="items-center">
          <button onClick={() => { if (window.confirm(`Remove “${document.name}” from this workspace?`)) { removeDocument(document.id); onOpenChange(false); } }} className="mr-auto h-[34px] rounded-md px-3 text-[var(--danger)] hover:bg-[var(--panel-muted)]">Remove document</button>
          <button onClick={() => onOpenChange(false)} className="h-[34px] rounded-md border border-[var(--border)] px-3 hover:bg-[var(--panel-muted)]">Cancel</button>
          <button onClick={save} className="h-[34px] rounded-md bg-[var(--accent)] px-3 font-medium text-white">Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
