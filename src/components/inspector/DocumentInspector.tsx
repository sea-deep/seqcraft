import { getMemorySequence } from '../../utils/document-utils';
import type { SequenceDocument } from '../../domain/document';
import { useState } from 'react';
import { DocumentSettingsDialog } from '../documents/DocumentSettingsDialog';

export function DocumentInspector({ document }: { document: SequenceDocument }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Simple GC calculation
  const raw = document.storageMode === 'memory' ? getMemorySequence(document).raw.toUpperCase() : null;
  let gcCount = 0;
  for (let i = 0; i < (raw?.length ?? 0); i++) {
    if (raw?.[i] === 'G' || raw?.[i] === 'C') gcCount++;
  }
  const gcPercent = raw ? ((gcCount / raw.length) * 100).toFixed(1) : null;

  const formatLen = new Intl.NumberFormat('en-US').format(document.length);

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-3">
      <h2 className="text-[13px] font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Document</h2>
      
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        <div className="text-[var(--text-muted)]">Name</div>
        <div className="text-[var(--text)] font-medium truncate" title={document.name}>{document.name}</div>
        
        <div className="text-[var(--text-muted)]">Topology</div>
        <div className="text-[var(--text)] capitalize">{document.topology}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text)]">{formatLen} bp</div>
        
        <div className="text-[var(--text-muted)]">Alphabet</div>
        <div className="text-[var(--text)]">{document.alphabet}</div>
        
        <div className="text-[var(--text-muted)]">GC Content</div>
        <div className="text-[var(--text)]">{gcPercent === null ? 'Unavailable for chunked documents' : `${gcPercent} %`}</div>

        <div className="text-[var(--text-muted)]">Storage</div>
        <div className="text-[var(--text)] capitalize">{document.storageMode}</div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1 grid grid-cols-[80px_1fr]">
        <div className="text-[var(--text-muted)]">Features</div>
        <div className="text-[var(--text)]">{document.features.length} annotations</div>
      </div>
      <div className="border-t border-[var(--border)] pt-3"><button onClick={() => setSettingsOpen(true)} className="text-[var(--accent)] hover:underline">Edit document metadata</button></div>
      {settingsOpen && <DocumentSettingsDialog document={document} open onOpenChange={setSettingsOpen} />}
    </div>
  );
}
