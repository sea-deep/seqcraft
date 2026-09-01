import { useWorkspaceStore } from '../../state/workspace-store';
import { X } from 'lucide-react';

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
              h-[30px] flex items-center gap-2 px-3 text-[12px] font-ui border-r border-[var(--border)]
              border-t-2 cursor-pointer transition-colors shrink-0 max-w-[200px] group
              ${isActive 
                ? 'bg-[var(--bg)] text-[var(--text)] border-t-[var(--accent)] border-l border-l-[var(--border)] -ml-[1px]' 
                : 'bg-[var(--panel-muted)] text-[var(--text-muted)] hover:bg-[var(--panel)] border-t-transparent'
              }
            `}
          >
            <span className="truncate">{doc.name}</span>
            <button 
              className={`p-0.5 rounded-sm hover:bg-[var(--border)] ${isActive ? 'text-[var(--text-muted)] hover:text-[var(--text)]' : 'opacity-0 group-hover:opacity-100 hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                closeDocumentTab(id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
