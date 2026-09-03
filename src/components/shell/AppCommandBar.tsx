import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';
import { ImportDialog } from '../ui/ImportDialog';
import { ExportDialog } from '../ui/ExportDialog';
import { PanelLeft, PanelRight, Download, ArrowLeft, ShieldCheck, Bot } from 'lucide-react';
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
import { SeqCraftLogo } from '../ui/SeqCraftLogo';
import { AccountMenu } from '../account/AccountMenu';
import { useAuthenticatedUser } from '../../platform/use-authenticated-user';

import { useState } from 'react';

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
  const [mutatorMode, setMutatorMode] = useState<"insert" | "replace" | "rotate_origin">("insert");
  const mutateDocumentSequence = useWorkspaceStore(s => s.mutateDocumentSequence);
  const activeDocument = documents.find(document => document.id === activeDocumentId);
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
          <span className="text-[12px] font-medium hidden sm:inline">Dashboard</span>
        </Link>
        <div className="hidden h-3.5 w-px bg-[var(--border)] md:block" />
        <div className="hidden items-center gap-1.5 md:flex">
          <SeqCraftLogo size={18} />
          <span className="font-semibold text-[14px]">SeqCraft</span>
        </div>
        
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
                onClick={async () => { 
                  if (window.confirm('Are you sure you want to delete all sequences, history, and workspace data? This cannot be undone.')) {
                    await clearAllWorkspaceStorage();
                    useWorkspaceStore.getState().clearWorkspace(); 
                  }
                }}
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
                <DropdownMenuItem onClick={() => { setMutatorMode('insert'); setMutatorOpen(true); }}>
                  Insert Bases / Motif...
                </DropdownMenuItem>
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
                        if (window.confirm(`Delete ${length.toLocaleString()} selected base${length === 1 ? '' : 's'}? This sequence edit cannot be undone.`)) {
                          mutateDocumentSequence(activeDocument.id, {
                            type: 'delete',
                            start0: activeSelection.start0,
                            end0Exclusive: activeSelection.end0Exclusive
                          });
                        }
                      }
                    }}
                    className="text-[var(--danger)] focus:bg-[var(--danger)]/10 focus:text-[var(--danger)]"
                  >
                    Delete Selected Bases...
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (activeDocument && activeSelection) {
                        if (window.confirm('Reverse-complement the selected bases in place? This sequence edit cannot be undone.')) {
                          mutateDocumentSequence(activeDocument.id, {
                            type: 'reverse_complement',
                            start0: activeSelection.start0,
                            end0Exclusive: activeSelection.end0Exclusive
                          });
                        }
                      }
                    }}
                  >
                    Reverse Complement In-Place...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openReverseComplement}>Open Reverse Complement As New Doc</DropdownMenuItem>
                  {activeDocument?.topology === 'circular' && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (activeDocument && activeSelection && window.confirm(`Set displayed position 1 to the current selection start (${activeSelection.start0 + 1})? Sequence and feature coordinates will be re-indexed.`)) {
                          mutateDocumentSequence(activeDocument.id, {
                            type: 'rotate_origin',
                            newOrigin0: activeSelection.start0
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
              <DropdownMenuItem onClick={() => activeDocumentId && setSelection(activeDocumentId, 0, activeDocument?.length ?? 0)}>Select All<DropdownMenuShortcut>Ctrl/Cmd+A</DropdownMenuShortcut></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">View</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setActiveView('map')}>Map<DropdownMenuShortcut>1</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('sequence')}>Sequence<DropdownMenuShortcut>2</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('features')}>Features<DropdownMenuShortcut>3</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('primers')}>Primers<DropdownMenuShortcut>4</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('enzymes')}>Enzymes<DropdownMenuShortcut>5</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('history')}>History</DropdownMenuItem>
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
              {activeSelection && <DropdownMenuItem onClick={() => setTranslationOpen(true)}>Translate Selection</DropdownMenuItem>}
              {!activeSelection && activeDocument && <DropdownMenuItem onClick={() => setActiveView('sequence')}>Select Bases to Translate</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => setActiveView('primers')}>Primer Analysis...</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('enzymes')}>Restriction Analysis...</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('compare')}>Compare Sequences...</DropdownMenuItem>
              {activeDocument && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCrisprOpen(true)}>CRISPR Target Radar & MMEJ...</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBiosecurityOpen(true)}>Local Biosecurity Motif Pre-Screen...</DropdownMenuItem>
                </>
              )}
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
            <button
              onClick={() => setBiosecurityOpen(true)}
              aria-label="Open local biosecurity motif pre-screen"
              className="cursor-pointer bg-[var(--panel-muted)] hover:bg-[var(--border)] text-[var(--text)] px-2.5 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors border border-[var(--border)] shadow-xs"
              title="Local biosecurity motif pre-screen (not a regulatory compliance determination)"
            >
              <ShieldCheck size={13} className="text-[var(--success)]" />
              <span className="hidden sm:inline">Biosecurity</span>
            </button>
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
    </header>
  );
}
