import { getMemorySequence } from '../../utils/document-utils';
import type { SequenceDocument } from '../../domain/document';
import { useState } from 'react';
import { DocumentSettingsDialog } from '../documents/DocumentSettingsDialog';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';

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
      <h2 className="text-[14px] font-semibold text-[var(--text)] mb-1">Document</h2>
      
      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-y-2">
        <div className="text-[var(--text-muted)]">Name</div>
        <div className="text-[var(--text)] font-semibold truncate" title={document.name}>{document.name}</div>
        
        <div className="text-[var(--text-muted)]">Topology</div>
        <div className="text-[var(--text-secondary)] capitalize">{document.topology}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text-secondary)] font-mono">{formatLen} bp</div>
        
        <div className="text-[var(--text-muted)]">Alphabet</div>
        <div className="text-[var(--text-secondary)] font-mono">{document.alphabet}</div>
        
        <div className="text-[var(--text-muted)]">GC Content</div>
        <div className="text-[var(--text-secondary)] font-mono">{gcPercent === null ? 'Unavailable for chunked documents' : `${gcPercent} %`}</div>

        <div className="text-[var(--text-muted)]">Storage</div>
        <div className="text-[var(--text-secondary)] capitalize">{document.storageMode}</div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1 grid grid-cols-[80px_minmax(0,1fr)]">
        <div className="text-[var(--text-muted)]">Features</div>
        <div className="text-[var(--text-secondary)]">{document.features.length} annotations</div>
      </div>
      <div className="border-t border-[var(--border)] pt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSettingsOpen(true)} 
          className="w-full justify-start gap-2 text-[12px] h-[30px]"
        >
          <Settings size={13} className="text-[var(--accent)]" />
          Edit document metadata
        </Button>
      </div>
      {settingsOpen && <DocumentSettingsDialog document={document} open onOpenChange={setSettingsOpen} />}
    </div>
  );
}
