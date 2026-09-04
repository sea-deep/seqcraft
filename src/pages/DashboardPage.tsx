import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Search, FileUp, Circle, Minus, BookOpen, Trash2,
  CheckSquare, Square, Cloud, CloudOff, RefreshCw, X, ArrowUpRight,
  Filter
} from 'lucide-react';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { AccountMenu } from '../components/account/AccountMenu';
import { useWorkspaceStore } from '../state/workspace-store';
import { ImportDialog } from '../components/ui/ImportDialog';
import { useWorkspaceCloudSync } from '../platform/workspace-sync';
import { DocumentCardSkeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export function DashboardPage() {
  const navigate = useNavigate();
  const documents = useWorkspaceStore(s => s.documents);
  const isHydrated = useWorkspaceStore(s => s.isHydrated);
  const setActiveDocument = useWorkspaceStore(s => s.setActiveDocument);
  const removeDocument = useWorkspaceStore(s => s.removeDocument);
  const removeDocuments = useWorkspaceStore(s => s.removeDocuments);

  const cloud = useWorkspaceCloudSync();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(q) ||
      doc.topology.toLowerCase().includes(q) ||
      doc.features.some(f => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
    );
  }, [documents, searchQuery]);

  const openDocument = (id: string) => {
    setActiveDocument(id);
    navigate('/editor');
  };

  const handleCardClick = (id: string) => {
    if (isSelectMode) {
      toggleSelection(id);
    } else {
      openDocument(id);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const handleExecuteBulkDelete = () => {
    removeDocuments(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setConfirmBulkDeleteOpen(false);
  };

  const handleExecuteSingleDelete = () => {
    if (!docToDelete) return;
    removeDocument(docToDelete.id);
    if (selectedIds.has(docToDelete.id)) {
      const next = new Set(selectedIds);
      next.delete(docToDelete.id);
      setSelectedIds(next);
    }
    setDocToDelete(null);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center gap-2.5 font-semibold text-[15px]">
          <div className="w-8 h-8 rounded-md bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
            <SeqCraftLogo size={20} />
          </div>
          <span className="tracking-tight">SeqCraft</span>
          <span className="hidden sm:inline text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--panel-muted)] text-[var(--text-muted)] border border-[var(--border)]">
            Workspace
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <div className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--text-muted)]" title={cloud.accountName ?? 'Sequences remain private in this browser'} aria-label={cloud.status === 'synced' ? 'Metadata synced' : cloud.status === 'syncing' ? 'Syncing metadata' : cloud.status === 'error' ? 'Sync unavailable' : 'Sequences remain private in this browser'}>
            {cloud.status === 'syncing' ? <RefreshCw size={14} className="animate-spin text-[var(--accent)]" /> : cloud.status === 'synced' ? <Cloud size={14} className="text-[var(--success)]" /> : <CloudOff size={14} />}
            <span className="hidden sm:inline">{cloud.status === 'synced' ? 'Metadata synced' : cloud.status === 'syncing' ? 'Syncing metadata' : cloud.status === 'error' ? 'Sync unavailable' : 'Private local'}</span>
          </div>
          <Link to="/docs" aria-label="Documentation" className="shrink-0 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-colors">
            <BookOpen size={14} /> <span className="hidden md:inline">Documentation</span>
          </Link>
          {cloud.user ? (
            <div className="flex shrink-0 items-center gap-2 border-l border-[var(--border)] pl-2 sm:pl-4">
              <span className="hidden max-w-48 truncate text-[12px] font-medium text-[var(--text-secondary)] lg:inline">{cloud.accountName}</span>
              <AccountMenu user={cloud.user} />
            </div>
          ) : cloud.status === 'checking' ? (
            <div className="size-8 shrink-0 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]" aria-label="Checking account" />
          ) : (
            <Link to="/auth" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border-l border-[var(--border)] pl-4">
              Sign in
            </Link>
          )}
          {documents.length > 0 && (
            <Link 
              to="/editor" 
              aria-label="Open Editor"
              className="h-8 px-2 sm:px-3 text-[12px] font-medium rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="hidden sm:inline">Open Editor</span><ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* Header and Contextual Toolbar */}
        <div className="mb-6">
          {isSelectMode ? (
            /* Contextual Selection Action Bar */
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between bg-[var(--panel)] border border-[var(--accent)]/40 rounded-lg px-4 py-3 shadow-sm animate-in fade-in-50 duration-150">
              <div className="flex flex-wrap items-center gap-3">
                <div className="size-8 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
                  <CheckSquare size={17} />
                </div>
                <div>
                  <div className="font-semibold text-[14px]">
                    {selectedIds.size} of {documents.length} selected
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Click sequences to toggle selection
                  </div>
                </div>
                <div className="hidden sm:block w-px h-6 bg-[var(--border)] mx-1" />
                <button 
                  onClick={handleSelectAllToggle}
                  className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] px-2.5 py-1.5 rounded hover:bg-[var(--panel-muted)] flex items-center gap-1.5 transition-colors"
                >
                  {selectedIds.size === documents.length ? (
                    <>
                      <Square size={15} /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare size={15} /> Select All
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedIds.size > 0 && (
                  <button 
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    className="h-9 px-3.5 text-[13px] font-medium rounded-md bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={14} />
                    Delete {selectedIds.size === documents.length ? 'All' : 'Selected'} ({selectedIds.size})
                  </button>
                )}
                <button 
                  onClick={exitSelectMode}
                  className="h-9 px-3.5 text-[13px] font-medium rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text)] transition-colors flex items-center gap-1.5"
                >
                  <X size={14} /> Done
                </button>
              </div>
            </div>
          ) : (
            /* Normal Browsing Header */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Your Sequences</h1>
                {documents.length > 0 && (
                  <span className="text-[12px] font-medium text-[var(--text-muted)] bg-[var(--panel-muted)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                    {documents.length}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {documents.length > 0 && (
                  <>
                    {/* Live Search Filter */}
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-3.5 h-3.5" />
                      <input 
                        type="text" 
                        aria-label="Search sequences"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sequences..." 
                        className="pl-8 pr-7 py-1.5 text-[13px] rounded-md border border-[var(--border)] bg-[var(--panel)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] w-full sm:w-52 transition-all placeholder:text-[var(--text-muted)]"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded"
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Enter Selection Mode */}
                    <button 
                      onClick={() => setIsSelectMode(true)}
                      className="h-9 px-3 text-[13px] font-medium rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5"
                      title="Select sequences to manage or delete"
                    >
                      <CheckSquare size={14} /> Select
                    </button>

                    {/* Primary New Sequence Action */}
                    <ImportDialog>
                      <button className="h-9 px-3.5 text-[13px] font-semibold rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                        <Plus size={15} /> New Sequence
                      </button>
                    </ImportDialog>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sequences Content */}
        {!isHydrated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          /* Empty State */
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl py-20 px-6 text-center bg-[var(--panel)]/40 shadow-sm">
            <div className="w-14 h-14 bg-[var(--panel-muted)] border border-[var(--border)] rounded-full flex items-center justify-center mb-4 text-[var(--accent)]">
              <FileUp size={24} />
            </div>
            <h2 className="text-lg font-semibold mb-1.5">No sequences in workspace</h2>
            <p className="text-[var(--text-muted)] text-[14px] max-w-sm mb-6 leading-relaxed">
              Import a GenBank, FASTA, or raw nucleotide sequence to begin inspecting, annotating, and designing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ImportDialog>
                <button className="h-10 px-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded-md text-[13px] font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
                  <FileUp size={15} /> Import sequence
                </button>
              </ImportDialog>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Search Empty State */
          <div className="py-16 text-center border border-[var(--border)] rounded-lg bg-[var(--panel)]/40">
            <Filter size={24} className="mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-[14px] font-medium text-[var(--text)]">No sequences match "{searchQuery}"</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">Try searching by sequence name, topology, or feature name.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Grid of Sequences */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <article
                  key={doc.id}
                  className={`group relative border rounded-lg p-5 transition-all flex flex-col justify-between h-44 ${
                    isSelected 
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--accent)]/5' 
                      : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)]/50 hover:shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    aria-label={isSelectMode ? `${isSelected ? 'Deselect' : 'Select'} ${doc.name}` : `Open ${doc.name}`}
                    aria-pressed={isSelectMode ? isSelected : undefined}
                    onClick={() => handleCardClick(doc.id)}
                    className="absolute inset-0 z-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  />
                  <div className="pointer-events-none relative z-[1]">
                    {/* Top Row: Checkbox / Name / Delete */}
                    <div className="flex items-start gap-2.5 mb-2">
                      {isSelectMode && (
                        <div className="pt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare size={17} className="text-[var(--accent)]" />
                          ) : (
                            <Square size={17} className="text-[var(--text-muted)]" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden pr-6">
                        <h2 className="font-semibold text-[15px] truncate text-[var(--text)] group-hover:text-[var(--accent)] transition-colors" title={doc.name}>
                          {doc.name}
                        </h2>
                      </div>
                    </div>

                    {/* Features Preview */}
                    {doc.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.features.slice(0, 3).map((f) => (
                          <span 
                            key={f.id} 
                            className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--panel-muted)] text-[var(--text-secondary)] border border-[var(--border)] max-w-[120px] truncate"
                          >
                            {f.name}
                          </span>
                        ))}
                        {doc.features.length > 3 && (
                          <span className="text-[11px] px-1 py-0.5 text-[var(--text-muted)]">
                            +{doc.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Row: Metadata Badges */}
                  <div className="pointer-events-none relative z-[1] flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                        {doc.topology === 'circular' ? (
                          <Circle size={11} className="text-[var(--accent)]" />
                        ) : (
                          <Minus size={11} />
                        )}
                        {doc.topology === 'circular' ? 'Circular' : 'Linear'}
                      </span>
                      <span>•</span>
                      <span>{new Intl.NumberFormat('en-US').format(doc.length)} bp</span>
                    </div>

                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {doc.features.length} {doc.features.length === 1 ? 'feature' : 'features'}
                    </span>
                  </div>
                  {!isSelectMode && (
                    <button
                      type="button"
                      onClick={() => setDocToDelete({ id: doc.id, name: doc.name })}
                      className="absolute top-3.5 right-3.5 z-10 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                      title={`Delete ${doc.name}`}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={confirmBulkDeleteOpen} onOpenChange={setConfirmBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
              <Trash2 size={18} />
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'Sequence' : 'Sequences'}
            </DialogTitle>
            <DialogDescription className="pt-2 text-[13px] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">{selectedIds.size}</span> selected {selectedIds.size === 1 ? 'sequence' : 'sequences'}? 
              This will remove all associated annotations, history, and metadata from your browser workspace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleExecuteBulkDelete}
              className="gap-1.5"
            >
              <Trash2 size={14} />
              Delete {selectedIds.size === 1 ? 'Sequence' : `${selectedIds.size} Sequences`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={Boolean(docToDelete)} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
              <Trash2 size={18} />
              Delete Sequence
            </DialogTitle>
            <DialogDescription className="pt-2 text-[13px] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">"{docToDelete?.name}"</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDocToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleExecuteSingleDelete}
              className="gap-1.5"
            >
              <Trash2 size={14} />
              Delete Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
