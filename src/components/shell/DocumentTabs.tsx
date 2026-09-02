import { useWorkspaceStore } from '../../state/workspace-store';
import { Circle, CircleDot, Dna, X } from 'lucide-react';

export function DocumentTabs() {
  const documents = useWorkspaceStore(s => s.documents);
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const openDocumentIds = useWorkspaceStore(s => s.openDocumentIds);
  const setActiveDocument = useWorkspaceStore(s => s.setActiveDocument);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);

  if (openDocumentIds.length === 0) {
    return null; // or empty bar
  }

  return (
    <div className="flex-none h-[32px] bg-[var(--panel-muted)] flex items-end border-b border-[var(--border)] overflow-x-auto overflow-y-hidden scrollbar-none select-none">
      {openDocumentIds.map(id => {
        const doc = documents.find(d => d.id === id);
        if (!doc) return null;
        const isActive = activeDocumentId === id;
        
        return (
          <div
            key={id}
            onClick={() => setActiveDocument(id)}
            className={`
              h-[31px] flex items-center gap-2 px-3 text-[12px] font-ui border-r border-[var(--border)]
              border-b-2 cursor-pointer transition-colors shrink-0 max-w-[220px] group
              ${isActive 
                ? 'bg-[var(--bg)] text-[var(--text)] border-b-[var(--accent)]'
                : 'bg-[var(--panel-muted)] text-[var(--text-muted)] hover:bg-[var(--panel)] border-b-transparent'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>{doc.topology === 'circular' ? (isActive ? <CircleDot size={11} /> : <Circle size={10} />) : <Dna size={12} />}</span>
            <span className="truncate">{doc.name}</span>
            <button 
              className={`size-5 rounded flex items-center justify-center transition-all hover:bg-[var(--border)] focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] shrink-0 cursor-pointer ${isActive ? 'text-[var(--text-muted)] hover:text-[var(--text)]' : 'opacity-0 group-hover:opacity-100 hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                closeDocumentTab(id);
              }}
              title={`Close ${doc.name}`}
              aria-label={`Close tab for ${doc.name}`}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
