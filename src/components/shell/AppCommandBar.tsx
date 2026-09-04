import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';
import { ImportDialog } from '../ui/ImportDialog';
import { ExportDialog } from '../ui/ExportDialog';
import { PanelLeft, PanelRight, Download, ArrowLeft, Bot } from 'lucide-react';
import { useActivityStore } from '../../state/activity-store';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel
} from '../ui/dropdown-menu';
import { isThemePreference, useThemeStore } from '../../state/theme-store';
import { FeatureDialog } from '../features/FeatureDialog';
import { DocumentSettingsDialog } from '../documents/DocumentSettingsDialog';
import { CloningDialog } from '../cloning/CloningDialog';
import { GoldenGateDialog } from '../cloning/GoldenGateDialog';
import { TranslationDialog } from '../tools/TranslationDialog';
import { CrisprDialog } from '../tools/CrisprDialog';
import { BiosecurityDialog } from '../tools/BiosecurityDialog';
import { SequenceMutatorDialog } from '../tools/SequenceMutatorDialog';
import { clearAllWorkspaceStorage } from '../../storage/document-persistence';
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import { ScientificSequence } from '../../scientific/nucleotide';
import { generateId } from '../../utils/id';
import type { SequenceDocument } from '../../domain/document';
import { AccountMenu } from '../account/AccountMenu';
import { useAuthenticatedUser } from '../../platform/use-authenticated-user';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

import { useState } from 'react';

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => void | Promise<void>;
}

export function AppCommandBar() {
  const navigate = useNavigate();
  const auth = useAuthenticatedUser();
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const documents = useWorkspaceStore(s => s.documents);
  const selection = useWorkspaceStore(s => s.selection);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const setSelection = useWorkspaceStore(s => s.setSelection);
  const addDocument = useWorkspaceStore(s => s.addDocument);
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const inspectorOpen = useWorkspaceStore(s => s.inspectorOpen);
  const setInspectorOpen = useWorkspaceStore(s => s.setInspectorOpen);
  const inspectorTab = useWorkspaceStore(s => s.inspectorTab);
  const setInspectorTab = useWorkspaceStore(s => s.setInspectorTab);
  const pendingTransaction = useActivityStore(s => s.pendingTransaction);
  const themePreference = useThemeStore(s => s.preference);
  const setThemePreference = useThemeStore(s => s.setPreference);
  const [importOpen, setImportOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloningOpen, setCloningOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [crisprOpen, setCrisprOpen] = useState(false);
  const [goldenGateOpen, setGoldenGateOpen] = useState(false);
  const [biosecurityOpen, setBiosecurityOpen] = useState(false);
  const [mutatorOpen, setMutatorOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [mutatorMode, setMutatorMode] = useState<"insert" | "replace" | "rotate_origin">("insert");
  const mutateDocumentSequence = useWorkspaceStore(s => s.mutateDocumentSequence);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const undoStack = useWorkspaceStore(s => s.undoStack);
  const redoStack = useWorkspaceStore(s => s.redoStack);
  const activeDocument = documents.find(document => document.id === activeDocumentId);
  const canUndo = Boolean(activeDocument && undoStack[activeDocument.id]?.length);
  const canRedo = Boolean(activeDocument && redoStack[activeDocument.id]?.length);
  const activeSelection = activeDocument && selection?.documentId === activeDocument.id ? selection : null;
  const selectedSequence = activeDocument?.storageMode === 'memory' && activeSelection
    ? (activeSelection.end0Exclusive >= activeSelection.start0
      ? getMemorySequence(activeDocument).raw.slice(activeSelection.start0, activeSelection.end0Exclusive)
      : getMemorySequence(activeDocument).raw.slice(activeSelection.start0) + getMemorySequence(activeDocument).raw.slice(0, activeSelection.end0Exclusive))
    : (activeDocument?.storageMode === 'memory' ? getMemorySequence(activeDocument).raw : "") ?? '';

  const copySequence = async () => {
    if (!selectedSequence) return;
    try {
      await navigator.clipboard.writeText(selectedSequence);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const openReverseComplement = () => {
    if (!activeDocument || !selectedSequence) return;
    const nextDocument: SequenceDocument = {
      length: selectedSequence.length,
      storageMode: "memory",
      id: generateId(), name: `${activeDocument.name} reverse complement`, topology: 'linear',
      sequence: new ScientificSequence(reverseComplementIupac(selectedSequence), activeDocument.alphabet === 'RNA' ? 'RNA' : 'DNA'),
      alphabet: activeDocument.alphabet, features: [], primers: [], source: 'raw', version: 1,
    };
    addDocument(nextDocument);
    setActiveView('sequence');
  };

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    if (next && window.innerWidth < 760) setInspectorOpen(false);
    setSidebarOpen(next);
  };

  const toggleInspector = () => {
    const next = !inspectorOpen;
    if (next && window.innerWidth < 760) setSidebarOpen(false);
    setInspectorOpen(next);
  };

  return (
    <header className="h-[36px] flex-none border-b border-[var(--border)] bg-[var(--panel)] flex items-center px-2 sm:px-4 gap-2 font-ui text-[13px] select-none">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
        
        <Link 
          to="/dashboard" 
          className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-0.5 rounded hover:bg-[var(--panel-muted)]" 
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={14} />
          <span className="text-[12px] font-medium hidden sm:inline">Workspace</span>
        </Link>
        <div className="hidden h-3.5 w-px bg-[var(--border)] md:block" />
        
        <nav aria-label="Editor commands" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">File</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>Import...</DropdownMenuItem>
              {activeDocumentId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>Document Settings...</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => closeDocumentTab(activeDocumentId)}>Close Document<DropdownMenuShortcut>Alt+W</DropdownMenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => useWorkspaceStore.getState().closeAllDocuments()}>Close All Documents</DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setConfirmation({
                  title: 'Clear local workspace?',
                  description: 'Delete every sequence, annotation, primer, and history entry stored by SeqCraft in this browser? Your account will remain active. This cannot be undone.',
                  confirmLabel: 'Clear workspace',
                  action: async () => {
                    await clearAllWorkspaceStorage();
                    useWorkspaceStore.getState().clearWorkspace();
                  }
                })}
                className="text-[var(--danger)] focus:bg-[var(--danger)]/10 focus:text-[var(--danger)]"
              >
                Clear Workspace Data...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Edit</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {activeDocument && (
                <>
                  <DropdownMenuItem
                    disabled={!canUndo}
                    onClick={() => activeDocument && undo(activeDocument.id)}
                  >
                    Undo
                    <DropdownMenuShortcut>Ctrl/Cmd+Z</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canRedo}
                    onClick={() => activeDocument && redo(activeDocument.id)}
                  >
                    Redo
                    <DropdownMenuShortcut>Ctrl/Cmd+Y</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setMutatorMode('insert'); setMutatorOpen(true); }}>
                    Insert Bases / Motif...
                  </DropdownMenuItem>
                </>
              )}
              {activeSelection ? (
                <>
                  <DropdownMenuItem onClick={copySequence}>Copy Selection<DropdownMenuShortcut>Ctrl/Cmd+C</DropdownMenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setMutatorMode('replace'); setMutatorOpen(true); }}>
                    Mutate / Replace Bases...
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (activeDocument && activeSelection) {
                        const length = activeSelection.end0Exclusive >= activeSelection.start0
                          ? activeSelection.end0Exclusive - activeSelection.start0
                          : activeDocument.length - activeSelection.start0 + activeSelection.end0Exclusive;
                        const displayedRange = activeSelection.end0Exclusive >= activeSelection.start0
                          ? `${activeSelection.start0 + 1}–${activeSelection.end0Exclusive}`
                          : [
                              activeSelection.start0 + 1 === activeDocument.length
                                ? `${activeDocument.length}`
                                : `${activeSelection.start0 + 1}–${activeDocument.length}`,
                              activeSelection.end0Exclusive > 0
                                ? activeSelection.end0Exclusive === 1
                                  ? '1'
                                  : `1–${activeSelection.end0Exclusive}`
                                : null
                            ].filter(Boolean).join(' and ') + ' (across the origin)';
                        setConfirmation({
                          title: `Delete ${length.toLocaleString()} selected base${length === 1 ? '' : 's'}?`,
                          description: `Remove positions ${displayedRange} from “${activeDocument.name}”. Affected feature coordinates will be updated. You can undo this sequence edit.`,
                          confirmLabel: 'Delete selected bases',
                          action: () => {
                            mutateDocumentSequence(activeDocument.id, {
                              type: 'delete',
                              start0: activeSelection.start0,
                              end0Exclusive: activeSelection.end0Exclusive
                            });
                          }
                        });
                      }
                    }}
                    className="text-[var(--danger)] focus:bg-[var(--danger)]/10 focus:text-[var(--danger)]"
                  >
                    Delete Selected Bases...
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (activeDocument && activeSelection) {
                        setConfirmation({
                          title: 'Reverse-complement selected bases?',
                          description: `Replace the selected region in “${activeDocument.name}” with its reverse complement. You can undo this sequence edit.`,
                          confirmLabel: 'Reverse complement',
                          action: () => {
                            mutateDocumentSequence(activeDocument.id, {
                              type: 'reverse_complement',
                              start0: activeSelection.start0,
                              end0Exclusive: activeSelection.end0Exclusive
                            });
                          }
                        });
                      }
                    }}
                  >
                    Reverse Complement In-Place...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openReverseComplement}>Open Reverse Complement As New Doc</DropdownMenuItem>
                  {activeDocument?.topology === 'circular' && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (activeDocument && activeSelection) {
                          setConfirmation({
                            title: `Set position ${activeSelection.start0 + 1} as the new origin?`,
                            description: `Rotate “${activeDocument.name}” so the selected base becomes position 1. Sequence and feature coordinates will be re-indexed. You can undo this sequence edit.`,
                            confirmLabel: 'Set new origin',
                            action: () => {
                              mutateDocumentSequence(activeDocument.id, {
                                type: 'rotate_origin',
                                newOrigin0: activeSelection.start0
                              });
                            }
                          });
                        }
                      }}
                    >
                      Set As Circular Origin (Position 1)...
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFeatureOpen(true)}>Create Feature...</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>Select bases to edit</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!activeDocument} onClick={() => activeDocumentId && setSelection(activeDocumentId, 0, activeDocument?.length ?? 0)}>Select All<DropdownMenuShortcut>Ctrl/Cmd+A</DropdownMenuShortcut></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">View</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('map')}>Map<DropdownMenuShortcut>1</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('sequence')}>Sequence<DropdownMenuShortcut>2</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('features')}>Features<DropdownMenuShortcut>3</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('primers')}>Primers<DropdownMenuShortcut>4</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('enzymes')}>Enzymes<DropdownMenuShortcut>5</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!activeDocument} onClick={() => setActiveView('history')}>History</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleSidebar}>Toggle Project Panel<DropdownMenuShortcut>Alt+B</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={toggleInspector}>Toggle Inspector<DropdownMenuShortcut>Alt+I</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={themePreference} onValueChange={(v) => isThemePreference(v) && setThemePreference(v)}>
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Workflows</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {activeDocument ? (
                <>
                  <DropdownMenuItem onClick={() => setCloningOpen(true)}>Restriction Cloning...</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGoldenGateOpen(true)}>Golden Gate Assembly...</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>Open a sequence to start</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Tools</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {activeDocument && (
                <>
                  {activeSelection
                    ? <DropdownMenuItem onClick={() => setTranslationOpen(true)}>Translate Selection...</DropdownMenuItem>
                    : <DropdownMenuItem onClick={() => setActiveView('sequence')}>Select Bases to Translate</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => setCrisprOpen(true)}>CRISPR Target Radar & MMEJ...</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBiosecurityOpen(true)}>Local Biosecurity Motif Pre-Screen...</DropdownMenuItem>
                </>
              )}
              {!activeDocument && <DropdownMenuItem disabled>Open a sequence to use tools</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Help</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate('/docs')}>Documentation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          className={`p-1 rounded flex items-center justify-center transition-colors cursor-pointer outline-none ${sidebarOpen ? 'bg-[var(--panel-muted)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
          onClick={toggleSidebar}
          title="Toggle Project Panel (Alt+B)"
          aria-label={`${sidebarOpen ? 'Hide' : 'Show'} project panel`}
          aria-pressed={sidebarOpen}
        >
          <PanelLeft size={16} />
        </button>
        <button
          className={`p-1 rounded flex items-center justify-center transition-colors cursor-pointer outline-none ${inspectorOpen ? 'bg-[var(--panel-muted)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
          onClick={toggleInspector}
          title="Toggle Inspector (Alt+I)"
          aria-label={`${inspectorOpen ? 'Hide' : 'Show'} inspector`}
          aria-pressed={inspectorOpen}
        >
          <PanelRight size={16} />
        </button>
        <button
          className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer outline-none text-[12px] font-medium ${
            inspectorOpen && inspectorTab === 'agent_run'
              ? 'bg-[var(--panel-muted)] text-[var(--text)] font-semibold'
              : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'
          }`}
          onClick={() => {
            setInspectorTab('agent_run');
            setInspectorOpen(true);
          }}
          title="Open Agent Run timeline"
          aria-label="Open Agent Run"
        >
          <Bot size={15} />
          <span className="hidden md:inline">Agent Run</span>
          {pendingTransaction && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>
        {activeDocument && (
          <>
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <ExportDialog document={activeDocument}>
              <button type="button" aria-label={`Export ${activeDocument.name}`} className="cursor-pointer bg-[var(--panel-muted)] hover:bg-[var(--border)] text-[var(--text)] px-2 sm:px-3 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors">
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </ExportDialog>
          </>
        )}
        {auth.user ? (
          <>
            <div className="mx-1 h-4 w-px bg-[var(--border)]" />
            <AccountMenu user={auth.user} size="compact" />
          </>
        ) : auth.status === 'checking' ? (
          <div className="size-7 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]" aria-label="Checking account" />
        ) : null}
      </div>

      {activeDocument && settingsOpen && <DocumentSettingsDialog document={activeDocument} open onOpenChange={setSettingsOpen} />}
      {activeDocument && activeSelection && featureOpen && <FeatureDialog document={activeDocument} selection={activeSelection} open onOpenChange={setFeatureOpen} />}
      {activeDocument && cloningOpen && <CloningDialog activeDocument={activeDocument} documents={documents} open onOpenChange={setCloningOpen} />}
      {activeDocument && activeSelection && translationOpen && <TranslationDialog document={activeDocument} selection={activeSelection} open onOpenChange={setTranslationOpen} />}
      {activeDocument && crisprOpen && <CrisprDialog document={activeDocument} selection={activeSelection ?? undefined} open={crisprOpen} onOpenChange={setCrisprOpen} />}
      {activeDocument && goldenGateOpen && <GoldenGateDialog activeDocument={activeDocument} documents={documents} open={goldenGateOpen} onOpenChange={setGoldenGateOpen} />}
      {activeDocument && biosecurityOpen && <BiosecurityDialog document={activeDocument} open={biosecurityOpen} onOpenChange={setBiosecurityOpen} />}
      {activeDocument && mutatorOpen && (
        <SequenceMutatorDialog
          document={activeDocument}
          initialMode={mutatorMode}
          selection={activeSelection}
          open={mutatorOpen}
          onOpenChange={setMutatorOpen}
        />
      )}
      <ConfirmationDialog
        open={Boolean(confirmation)}
        onOpenChange={open => !open && setConfirmation(null)}
        title={confirmation?.title ?? 'Confirm action'}
        description={confirmation?.description ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        onConfirm={() => confirmation?.action()}
      />
    </header>
  );
}
