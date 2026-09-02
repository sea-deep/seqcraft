
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dna, Plus, Search, FileUp, Circle, Minus, BookOpen, Trash2, CheckSquare, Square, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../state/workspace-store';
import { ImportDialog } from '../components/ui/ImportDialog';
import { useWorkspaceCloudSync } from '../platform/workspace-sync';

export function DashboardPage() {
  const navigate = useNavigate();
  const documents = useWorkspaceStore(s => s.documents);
  const setActiveDocument = useWorkspaceStore(s => s.setActiveDocument);
  const removeDocument = useWorkspaceStore(s => s.removeDocument);
  const cloud = useWorkspaceCloudSync();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openDocument = (id: string) => {
    setActiveDocument(id);
    navigate('/editor');
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      removeDocument(id);
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    }
  };

  const toggleSelection = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected sequences?`)) {
      const remaining = documents.filter(d => !selectedIds.has(d.id));
      useWorkspaceStore.setState({ 
        documents: remaining, 
        activeDocumentId: useWorkspaceStore.getState().activeDocumentId && selectedIds.has(useWorkspaceStore.getState().activeDocumentId!) ? null : useWorkspaceStore.getState().activeDocumentId 
      });
      setSelectedIds(new Set());
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(documents.map(d => d.id))); // Select all
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center gap-2 font-semibold">
          <div className="w-8 h-8 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <Dna size={18} />
          </div>
          Workspace
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]" title={cloud.accountName ?? 'Sequences remain private in this browser'}>
            {cloud.status === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> : cloud.status === 'synced' ? <Cloud size={14} className="text-[var(--success)]" /> : <CloudOff size={14} />}
            {cloud.status === 'synced' ? 'Metadata synced' : cloud.status === 'syncing' ? 'Syncing metadata' : cloud.status === 'error' ? 'Sync unavailable' : 'Private guest'}
          </div>
          <Link to="/docs" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5">
            <BookOpen size={14} /> Documentation
          </Link>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-[var(--accent)] cursor-pointer" title="My Account" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Your Sequences</h1>
            {documents.length > 0 && (
              <button 
                onClick={handleSelectAll}
                className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5 ml-4"
              >
                {selectedIds.size === documents.length ? <CheckSquare size={16} /> : <Square size={16} />}
                Select All
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="text-white bg-[var(--danger)] hover:bg-[var(--danger)]/90 px-3 py-2 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2"
                title="Delete selected sequences"
              >
                <Trash2 size={16} /> Delete Selected ({selectedIds.size})
              </button>
            )}
            
            {documents.length > 0 && selectedIds.size === 0 && (
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete all ${documents.length} sequences? This cannot be undone.`)) {
                    useWorkspaceStore.setState({ documents: [], activeDocumentId: null });
                  }
                }}
                className="text-[var(--danger)] hover:bg-[var(--danger)]/10 px-3 py-2 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2"
                title="Delete all sequences"
              >
                <Trash2 size={16} /> Delete All
              </button>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="pl-9 pr-4 py-2 text-[13px] rounded-md border border-[var(--border)] bg-[var(--panel)] outline-none focus:border-[var(--accent)] w-64"
              />
            </div>
            <ImportDialog>
              <div className="cursor-pointer bg-[var(--accent)] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2 hover:bg-[var(--accent)]/90 transition-colors">
                <Plus size={16} /> New Sequence
              </div>
            </ImportDialog>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl py-24 text-center">
            <div className="w-16 h-16 bg-[var(--panel-muted)] rounded-full flex items-center justify-center mb-4 text-[var(--text-muted)]">
              <FileUp size={28} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
            <p className="text-[var(--text-muted)] text-[14px] max-w-sm mb-6">
              Get started by importing a FASTA, GenBank, or raw sequence file to begin designing.
            </p>
            <ImportDialog>
              <div className="cursor-pointer bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2 hover:bg-[var(--panel-muted)] transition-colors">
                <FileUp size={16} /> Import File
              </div>
            </ImportDialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div 
                  key={doc.id}
                  onClick={() => openDocument(doc.id)}
                  className={`group relative border bg-[var(--panel)] rounded-lg p-5 cursor-pointer transition-colors flex flex-col h-40 ${isSelected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="pt-0.5" onClick={(e) => toggleSelection(e, doc.id)}>
                      {isSelected ? (
                        <CheckSquare size={16} className="text-[var(--accent)] cursor-pointer" />
                      ) : (
                        <Square size={16} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden pr-8">
                      <h3 className="font-semibold text-[15px] truncate" title={doc.name}>{doc.name}</h3>
                    </div>
                    {!isSelected && (
                      <button 
                        onClick={(e) => handleDelete(e, doc.id, doc.name)}
                        className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[var(--bg)]"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] mt-auto border-t border-[var(--border)] pt-3">
                    <span className="flex items-center gap-1">
                      {doc.topology === 'circular' ? <Circle size={12} /> : <Minus size={12} />}
                      {doc.topology === 'circular' ? 'Circular' : 'Linear'}
                    </span>
                    <span>•</span>
                    <span>{new Intl.NumberFormat('en-US').format(doc.length)} bp</span>
                    <span>•</span>
                    <span>{doc.features.length} features</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
