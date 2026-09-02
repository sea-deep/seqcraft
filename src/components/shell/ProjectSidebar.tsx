import { useMemo, useState } from 'react';
import { Circle, FileUp, Minus, Search, X, Trash2 } from 'lucide-react';
import { searchWorkspace, type WorkspaceSearchResult } from '../../application/workspace-search';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { useWorkspaceStore } from '../../state/workspace-store';
import { ImportDialog } from '../ui/ImportDialog';

export function ProjectSidebar() {
  const [query, setQuery] = useState('');
  const documents = useWorkspaceStore(state => state.documents);
  const activeDocumentId = useWorkspaceStore(state => state.activeDocumentId);
  const setActiveDocument = useWorkspaceStore(state => state.setActiveDocument);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const selectDocumentFeature = useWorkspaceStore(state => state.selectDocumentFeature);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const formatLength = new Intl.NumberFormat('en-US');
  const results = useMemo(
    () => searchWorkspace(documents, activeDocumentId, BUILTIN_ENZYMES, query),
    [activeDocumentId, documents, query],
  );

  const openResult = (result: WorkspaceSearchResult) => {
    setActiveDocument(result.documentId);
    if (result.kind === 'coordinate') {
      setSelection(result.documentId, result.start0, result.end0Exclusive);
      setActiveView('sequence');
    } else if (result.kind === 'feature') {
      selectDocumentFeature(result.documentId, result.featureId);
      setActiveView('sequence');
    } else if (result.kind === 'primer') {
      selectPrimer(result.primerId);
      setActiveView('primers');
    } else if (result.kind === 'enzyme') {
      if (result.siteId) selectRestrictionSite(result.siteId);
      setActiveView('enzymes');
    }
    setQuery('');
  };

  return (
    <div className="flex h-full flex-col bg-[var(--panel-muted)] text-[var(--text)] font-ui">
      <div className="shrink-0 p-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Project</div>
      <div className="shrink-0 px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Search or go to coordinate"
            className="flex h-7 w-full rounded border border-[var(--border)] bg-[var(--bg)] pl-7 pr-7 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          {query && <button aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-1.5 top-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"><X size={14} /></button>}
        </div>
      </div>

      {query ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Results</div>
          {results.map((result, index) => (
            <button key={`${result.kind}-${result.documentId}-${index}`} onClick={() => openResult(result)} className="w-full rounded px-2 py-1.5 text-left hover:bg-[var(--panel)]">
              <div className="truncate text-[12px] text-[var(--text)]">{result.title}</div>
              <div className="truncate text-[10px] capitalize text-[var(--text-muted)]">{result.kind} · {result.detail}</div>
            </button>
          ))}
          {results.length === 0 && <div className="px-2 py-4 text-[11px] text-[var(--text-muted)]">No documents, features, primers, enzymes, or coordinates match.</div>}
        </div>
      ) : (
        <>
          <div className="shrink-0 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">DNA Sequences</div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2">
            {documents.map(document => {
              const active = activeDocumentId === document.id;
              const circular = document.topology === 'circular';
              return (
                <div key={document.id} className={`group flex w-full items-center gap-2 rounded border-l-2 px-2 py-1.5 text-left text-[12px] transition-colors ${active ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--panel)] hover:text-[var(--text)]'}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setActiveDocument(document.id)}>
                    <span className="shrink-0 text-[var(--text-muted)]">{circular ? <Circle size={10} /> : <Minus size={12} />}</span>
                    <span className="flex min-w-0 flex-col overflow-hidden">
                      <span className={`truncate ${active ? 'font-medium' : ''}`}>{document.name}</span>
                      <span className="truncate text-[10px] opacity-70">{formatLength.format(document.length)} bp · {circular ? 'Circular' : 'Linear'}</span>
                    </span>
                  </button>
                  <button 
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg)] hover:text-[var(--danger)] text-[var(--text-muted)] shrink-0" 
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete document "${document.name}"?`)) useWorkspaceStore.getState().removeDocument(document.id); }}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="shrink-0 border-t border-[var(--border)] p-3">
        <ImportDialog>
          <div className="flex h-7 w-full cursor-pointer items-center justify-center gap-2 rounded border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--text)] transition-colors hover:bg-[var(--panel)]"><FileUp size={14} />Import sequence</div>
        </ImportDialog>
      </div>
    </div>
  );
}
