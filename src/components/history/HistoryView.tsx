import type { SequenceDocument } from '../../domain/document';
import { useWorkspaceStore } from '../../state/workspace-store';

const EMPTY_ARRAY: any[] = [];

export function HistoryView({ document }: { document: SequenceDocument }) {
  const historyEntries = useWorkspaceStore(state => state.historyEntries || EMPTY_ARRAY);
  
  if (!document) return null;

  const entries = historyEntries.filter(entry => entry && entry.documentId === document.id);

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px]">
      <div className="border-b border-[var(--border)] bg-[var(--panel)] px-3 py-3">
        <div className="font-semibold">Document history</div>
        <div className="text-[11px] text-[var(--text-muted)]">Local changes made during this browser session · version {document.version || 1}</div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {entries.map(entry => (
          <div key={entry?.id || Math.random()} className="grid grid-cols-[150px_90px_1fr] gap-3 px-3 py-2.5 hover:bg-[var(--panel-muted)]">
            <time className="font-mono text-[11px] text-[var(--text-muted)]">{entry?.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</time>
            <span className="capitalize text-[var(--text-secondary)]">{entry?.action || 'unknown'}</span>
            <span>{entry?.summary || ''}</span>
          </div>
        ))}
      </div>
      {entries.length === 0 && <div className="p-8 text-center text-[var(--text-muted)]">No recorded changes for this document yet.</div>}
    </div>
  );
}
