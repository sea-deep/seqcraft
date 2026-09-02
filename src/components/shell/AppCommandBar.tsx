import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';
import { ImportDialog } from '../ui/ImportDialog';
import { ExportDialog } from '../ui/ExportDialog';
import { PanelLeft, PanelRight, Download, ArrowLeft, ShieldCheck } from 'lucide-react';
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
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import { ScientificSequence } from '../../scientific/nucleotide';
import { generateId } from '../../utils/id';
import type { SequenceDocument } from '../../domain/document';

import { useState } from 'react';

export function AppCommandBar() {
  const navigate = useNavigate();
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

  return (
    <header className="h-[36px] flex-none border-b border-[var(--border)] bg-[var(--panel)] flex items-center px-4 justify-between font-ui text-[13px] select-none">
      <div className="flex items-center gap-4">
        
        <Link 
          to="/dashboard" 
          className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-0.5 rounded hover:bg-[var(--panel-muted)]" 
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={14} />
          <span className="text-[12px] font-medium hidden sm:inline">Dashboard</span>
        </Link>
        <div className="h-3.5 w-px bg-[var(--border)]" />
        <h1 className="font-semibold text-[14px]">SeqCraft</h1>
        
        <div className="flex items-center gap-1">
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
                onClick={() => { if (window.confirm('Are you sure you want to delete all sequences, history, and workspace data? This cannot be undone.')) useWorkspaceStore.getState().clearWorkspace(); }}
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
              {activeSelection ? (
                <>
                  <DropdownMenuItem onClick={copySequence}>Copy Selection<DropdownMenuShortcut>Cmd+C</DropdownMenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem onClick={openReverseComplement}>Open Reverse Complement</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFeatureOpen(true)}>Create Feature...</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>Select bases to edit</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => activeDocumentId && setSelection(activeDocumentId, 0, activeDocument?.length ?? 0)}>Select All<DropdownMenuShortcut>Cmd+A</DropdownMenuShortcut></DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => useWorkspaceStore.getState().setSidebarOpen(!useWorkspaceStore.getState().sidebarOpen)}>Toggle Project Panel<DropdownMenuShortcut>Alt+B</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => useWorkspaceStore.getState().setInspectorOpen(!useWorkspaceStore.getState().inspectorOpen)}>Toggle Inspector<DropdownMenuShortcut>Alt+I</DropdownMenuShortcut></DropdownMenuItem>
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
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Actions</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setActiveView('primers')}>Simulate PCR...</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('enzymes')}>Restriction Digest...</DropdownMenuItem>
              {activeDocument && <DropdownMenuItem onClick={() => setCloningOpen(true)}>Restriction Cloning...</DropdownMenuItem>}
              {activeDocument && <DropdownMenuItem onClick={() => setGoldenGateOpen(true)}>Golden Gate Assembly...</DropdownMenuItem>}
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
                  <DropdownMenuItem onClick={() => setGoldenGateOpen(true)}>Type IIS Golden Gate & Domestication...</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBiosecurityOpen(true)}>Biosecurity & Select Agent Screener...</DropdownMenuItem>
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
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`p-1 rounded flex items-center justify-center transition-colors cursor-pointer outline-none ${sidebarOpen ? 'bg-[var(--panel-muted)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle Project Panel (Alt+B)"
        >
          <PanelLeft size={16} />
        </button>
        <button
          className={`p-1 rounded flex items-center justify-center transition-colors cursor-pointer outline-none ${inspectorOpen ? 'bg-[var(--panel-muted)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
          onClick={() => setInspectorOpen(!inspectorOpen)}
          title="Toggle Inspector (Alt+I)"
        >
          <PanelRight size={16} />
        </button>
        {activeDocument && (
          <>
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <button
              onClick={() => setBiosecurityOpen(true)}
              className="cursor-pointer bg-[var(--panel-muted)] hover:bg-[var(--border)] text-[var(--text)] px-2.5 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors border border-[var(--border)] shadow-xs"
              title="Biosecurity & Select Agent Pre-Order Compliance (HHS/USDA 42 CFR 73.3)"
            >
              <ShieldCheck size={13} className="text-[var(--success)]" />
              <span className="hidden sm:inline">Biosecurity</span>
            </button>
            <ExportDialog document={activeDocument}>
              <div className="cursor-pointer bg-[var(--panel-muted)] hover:bg-[var(--border)] text-[var(--text)] px-3 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors">
                <Download size={14} />
                Export
              </div>
            </ExportDialog>
          </>
        )}
      </div>

      {activeDocument && settingsOpen && <DocumentSettingsDialog document={activeDocument} open onOpenChange={setSettingsOpen} />}
      {activeDocument && activeSelection && featureOpen && <FeatureDialog document={activeDocument} selection={activeSelection} open onOpenChange={setFeatureOpen} />}
      {activeDocument && cloningOpen && <CloningDialog activeDocument={activeDocument} documents={documents} open onOpenChange={setCloningOpen} />}
      {activeDocument && activeSelection && translationOpen && <TranslationDialog document={activeDocument} selection={activeSelection} open onOpenChange={setTranslationOpen} />}
      {activeDocument && crisprOpen && <CrisprDialog document={activeDocument} selection={activeSelection ?? undefined} open={crisprOpen} onOpenChange={setCrisprOpen} />}
      {activeDocument && goldenGateOpen && <GoldenGateDialog activeDocument={activeDocument} documents={documents} open={goldenGateOpen} onOpenChange={setGoldenGateOpen} />}
      {activeDocument && biosecurityOpen && <BiosecurityDialog document={activeDocument} open={biosecurityOpen} onOpenChange={setBiosecurityOpen} />}
    </header>
  );
}
