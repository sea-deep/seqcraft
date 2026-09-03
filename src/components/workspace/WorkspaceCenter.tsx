import { useWorkspaceStore, type WorkspaceView } from '../../state/workspace-store';
import { SequenceViewer } from '../sequence/SequenceViewer';
import { MoleculeMap } from '../map/MoleculeMap';
import { FeaturesView } from '../features/FeaturesView';
import { PrimersView } from '../primers/PrimersView';
import { EnzymesView } from '../enzymes/EnzymesView';
import { HistoryView } from '../history/HistoryView';
import { CompareView } from '../compare/CompareView';
import { ImportDialog } from '../ui/ImportDialog';
import { DocumentTabs } from '../shell/DocumentTabs';
import { getDocumentCapabilities } from '../../domain/document';
import { loadDemoWorkspace } from '../../data/demo-workspace';

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
          <div className="px-4">
            <p className="mb-4 text-[13px]">No sequence loaded</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ImportDialog>
                <button type="button" className="cursor-pointer bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] px-4 py-2 rounded-md text-[12px] font-semibold">
                  Import sequence
                </button>
              </ImportDialog>
              <button type="button" onClick={loadDemoWorkspace} className="cursor-pointer bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-muted)] text-[var(--text)] px-4 py-2 rounded-md text-[12px] font-medium">
                Open demo workspace
              </button>
            </div>
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
    { id: 'compare', label: 'Compare' },
  ];
  const capabilities = getDocumentCapabilities(activeDoc);
  const unsupported = (view: WorkspaceView) =>
    (view === 'map' && !capabilities.map) ||
    (view === 'features' && !capabilities.annotations) ||
    (view === 'primers' && !capabilities.primers) ||
    (view === 'enzymes' && !capabilities.wholeSequenceAnalysis) ||
    (view === 'compare' && !capabilities.wholeSequenceAnalysis);

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--bg)]">
      <DocumentTabs />
      <h1 className="sr-only">{activeDoc.name} — {views.find(view => view.id === activeView)?.label}</h1>
      
      {/* View Tabs */}
      <div className="h-[36px] flex-none border-b border-[var(--border)] bg-[var(--panel)] flex items-end px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2" role="tablist" aria-label="Sequence workspace views">
          {views.map(view => {
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                id={`workspace-tab-${view.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`workspace-panel-${view.id}`}
                onClick={() => !unsupported(view.id) && setActiveView(view.id)}
                disabled={unsupported(view.id)}
                title={unsupported(view.id) ? 'Unavailable for chunked large-reference documents' : undefined}
                className={`
                  px-3 h-[36px] flex items-center text-[12px] border-b-[3px] transition-colors font-ui
                  ${isActive 
                    ? 'border-[var(--accent)] text-[var(--text)] font-medium' 
                    : `border-transparent text-[var(--text-muted)] ${unsupported(view.id) ? 'cursor-not-allowed opacity-40' : 'hover:text-[var(--text)]'}`
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
      <div id={`workspace-panel-${activeView}`} role="tabpanel" aria-labelledby={`workspace-tab-${activeView}`} className="flex-1 min-h-0 min-w-0 relative bg-[var(--bg)]">
        {activeView === 'sequence' && (
          <SequenceViewer document={activeDoc} />
        )}
        
        {activeView === 'map' && capabilities.map && (
          <MoleculeMap document={activeDoc} />
        )}

        {activeView === 'features' && capabilities.annotations && <FeaturesView document={activeDoc} />}
        {activeView === 'primers' && capabilities.primers && <PrimersView document={activeDoc} />}
        {activeView === 'enzymes' && capabilities.wholeSequenceAnalysis && <EnzymesView document={activeDoc} />}
        {activeView === 'history' && <HistoryView document={activeDoc} />}
        
        {activeView === 'compare' && capabilities.wholeSequenceAnalysis && (
          <CompareView reference={activeDoc} documents={documents} />
        )}
        {unsupported(activeView) && <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--text-muted)]"><div><div className="mb-2 font-medium text-[var(--text)]">Operation unavailable</div><div>Whole-document scientific analysis is intentionally disabled for chunked large-reference documents.</div></div></div>}
      </div>
    </div>
  );
}
