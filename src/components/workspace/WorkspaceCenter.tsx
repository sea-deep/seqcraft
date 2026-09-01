import { useWorkspaceStore, type WorkspaceView } from '../../state/workspace-store';
import { SequenceViewer } from '../sequence/SequenceViewer';
import { PlasmidMap3D } from '../map/PlasmidMap3D';
import { ImportDialog } from '../ui/ImportDialog';
import { DocumentTabs } from '../shell/DocumentTabs';

export function WorkspaceCenter() {
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const documents = useWorkspaceStore(s => s.documents);
  const activeView = useWorkspaceStore(s => s.activeView);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  
  const activeDoc = documents.find(d => d.id === activeDocumentId);

  if (!activeDoc) {
    return (
      <div className="absolute inset-0 flex flex-col bg-[var(--bg)]">
        <DocumentTabs />
        <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted)]">
          <div>
            <p className="mb-4 text-[13px]">No sequence loaded</p>
            <ImportDialog>
              <div className="cursor-pointer bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-muted)] text-[var(--text)] px-4 py-2 rounded-md text-[12px] font-medium inline-block">
                Import FASTA/GenBank
              </div>
            </ImportDialog>
          </div>
        </div>
      </div>
    );
  }

  const views: { id: WorkspaceView; label: string }[] = [
    { id: 'map', label: 'Map' },
    { id: 'sequence', label: 'Sequence' },
    { id: 'features', label: 'Features' },
    { id: 'primers', label: 'Primers' },
    { id: 'enzymes', label: 'Enzymes' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--bg)]">
      <DocumentTabs />
      
      {/* View Tabs */}
      <div className="h-[36px] flex-none border-b border-[var(--border)] bg-[var(--panel)] flex items-end px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2">
          {views.map(view => {
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`
                  px-3 h-[36px] flex items-center text-[12px] border-b-[3px] transition-colors font-ui
                  ${isActive 
                    ? 'border-[var(--accent)] text-[var(--text)] font-medium' 
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }
                `}
              >
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace Content */}
      <div className="flex-1 min-h-0 min-w-0 relative bg-[var(--bg)]">
        {activeView === 'sequence' && (
          <SequenceViewer document={activeDoc} />
        )}
        
        {activeView === 'map' && (
          <PlasmidMap3D document={activeDoc} />
        )}

        {/* Placeholders */}
        {['features', 'primers', 'enzymes', 'history'].includes(activeView) && (
          <div className="h-full w-full flex items-center justify-center text-center p-8 bg-[var(--bg)]">
            <div className="text-[var(--text-muted)] font-ui">
              <h2 className="text-[14px] text-[var(--text-muted)] font-semibold mb-2 uppercase tracking-wider">{activeView}</h2>
              <p className="text-[12px]">View will appear here.</p>
            </div>
          </div>
        )}
        
        {activeView === 'compare' && (
          <div className="h-full w-full flex items-center justify-center text-center p-8 bg-[var(--bg)]">
            <div className="text-[var(--text-muted)] font-ui">
              <h2 className="text-[14px] text-[var(--text)] font-semibold mb-2">Compare sequences</h2>
              <p className="text-[12px]">Choose another workspace sequence to compare with {activeDoc.name}.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
