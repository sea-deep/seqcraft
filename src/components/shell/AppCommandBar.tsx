import { useWorkspaceStore } from '../../state/workspace-store';
import { ImportDialog } from '../ui/ImportDialog';
import { FileUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';

import { useState } from 'react';

export function AppCommandBar() {
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <header className="h-[36px] flex-none border-b border-[var(--border)] bg-[var(--panel)] flex items-center px-4 justify-between font-ui text-[13px] select-none">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-[14px]">SeqCraft</h1>
        
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">File</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>Import...</DropdownMenuItem>
              {activeDocumentId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => closeDocumentTab(activeDocumentId)}>Close Document</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => useWorkspaceStore.getState().closeAllDocuments()}>Close All Documents</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Edit</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>Copy</DropdownMenuItem>
              <DropdownMenuItem disabled>Select All</DropdownMenuItem>
              <DropdownMenuItem disabled>Add Feature</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">View</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setActiveView('map')}>Map</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('sequence')}>Sequence</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('features')}>Features</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('primers')}>Primers</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('enzymes')}>Enzymes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('history')}>History</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => useWorkspaceStore.getState().setSidebarOpen(!useWorkspaceStore.getState().sidebarOpen)}>Toggle Project Panel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => useWorkspaceStore.getState().setInspectorOpen(!useWorkspaceStore.getState().inspectorOpen)}>Toggle Inspector</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Actions</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>Simulate PCR...</DropdownMenuItem>
              <DropdownMenuItem disabled>Restriction Digest...</DropdownMenuItem>
              <DropdownMenuItem disabled>Restriction Cloning...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-2 py-1 rounded hover:bg-[var(--panel-muted)] outline-none data-[state=open]:bg-[var(--panel-muted)] cursor-default">Tools</DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>Translate Selection</DropdownMenuItem>
              <DropdownMenuItem disabled>Primer Analysis...</DropdownMenuItem>
              <DropdownMenuItem disabled>Restriction Analysis...</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('compare')}>Compare Sequences...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <ImportDialog>
          <div className="cursor-pointer bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white px-3 py-1 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors">
            <FileUp size={14} />
            Import
          </div>
        </ImportDialog>
      </div>
    </header>
  );
}
