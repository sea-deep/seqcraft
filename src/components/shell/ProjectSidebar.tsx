import { useWorkspaceStore } from '../../state/workspace-store';
import { Search, Circle, Minus, FileUp } from 'lucide-react';
import { ImportDialog } from '../ui/ImportDialog';

export function ProjectSidebar() {
  const documents = useWorkspaceStore(s => s.documents);
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const setActiveDocument = useWorkspaceStore(s => s.setActiveDocument);

  const formatLen = new Intl.NumberFormat('en-US');

  return (
    <div className="flex flex-col h-full bg-[var(--panel-muted)] text-[var(--text)] font-ui">
      {/* Header */}
      <div className="p-3 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase shrink-0">
        Project
      </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded flex h-7 text-[12px] pl-7 pr-2 focus:outline-none focus:border-[var(--accent)] text-[var(--text)]"
            disabled
          />
        </div>
      </div>

      {/* Sequences List */}
      <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase shrink-0">
        DNA Sequences
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
        {documents.map(doc => {
          const isActive = activeDocumentId === doc.id;
          const isCircular = doc.topology === 'circular';
          
          return (
            <button
              key={doc.id}
              onClick={() => setActiveDocument(doc.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors border-l-2 ${
                isActive 
                  ? 'bg-[var(--accent-soft)] text-[var(--text)] border-[var(--accent)]' 
                  : 'hover:bg-[var(--panel)] text-[var(--text-muted)] border-transparent hover:text-[var(--text)]'
              }`}
            >
              <div className="flex-none text-[var(--text-muted)]">
                {isCircular ? <Circle size={10} /> : <Minus size={12} />}
              </div>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className={`truncate ${isActive ? 'font-medium' : ''}`}>{doc.name}</span>
                <span className="text-[10px] opacity-70 truncate">
                  {formatLen.format(doc.sequence.length)} bp · {isCircular ? 'Circular' : 'Linear'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer / Import */}
      <div className="p-3 shrink-0 border-t border-[var(--border)]">
        <ImportDialog>
          <div className="w-full cursor-pointer bg-[var(--bg)] hover:bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] rounded flex items-center justify-center gap-2 h-7 text-[12px] transition-colors">
            <FileUp size={14} />
            Import sequence
          </div>
        </ImportDialog>
      </div>
    </div>
  );
}
