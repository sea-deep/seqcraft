import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useWorkspaceStore } from "../state/workspace-store";
import { Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from 'react-hotkeys-hook';

import { loadDemoWorkspace } from "../data/demo-workspace";
import { WorkspaceCenter } from "../components/workspace/WorkspaceCenter";
import { Inspector } from "../components/inspector/Inspector";
import { WebMCPBridge } from '../webmcp/WebMCPBridge';
import { CloningApprovalModal } from '../components/cloning/CloningApprovalModal';
import { useActivityStore, type ActivityEvent } from "../state/activity-store";

import { AppCommandBar } from '../components/shell/AppCommandBar';
import { ProjectSidebar } from '../components/shell/ProjectSidebar';
import { EditorStatusBar } from '../components/shell/EditorStatusBar';

export function AppShell() {
  const documents = useWorkspaceStore(s => s.documents);
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const inspectorOpen = useWorkspaceStore(s => s.inspectorOpen);
  const setInspectorOpen = useWorkspaceStore(s => s.setInspectorOpen);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);
  const initialized = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keyboard Shortcuts
  useHotkeys('mod+b', (e) => { e.preventDefault(); setSidebarOpen(!sidebarOpen); }, [sidebarOpen]);
  useHotkeys('mod+i', (e) => { e.preventDefault(); setInspectorOpen(!inspectorOpen); }, [inspectorOpen]);
  useHotkeys('mod+w', (e) => { 
    e.preventDefault(); 
    if (activeDocumentId) closeDocumentTab(activeDocumentId);
  }, [activeDocumentId]);
  
  useHotkeys('1', () => setActiveView('map'));
  useHotkeys('2', () => setActiveView('sequence'));
  useHotkeys('3', () => setActiveView('features'));
  useHotkeys('4', () => setActiveView('primers'));
  useHotkeys('5', () => setActiveView('enzymes'));

  useEffect(() => {
    if (!initialized.current && documents.length === 0) {
      initialized.current = true;
      loadDemoWorkspace();
    }
  }, [documents.length]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden font-ui">
      <AppCommandBar />

      <div className="flex-1 min-h-0">
        <PanelGroup autoSaveId="seqcraft-main-layout" orientation="horizontal">
          {sidebarOpen && (
            <>
              <Panel id="sidebar" order={1} defaultSize={220} minSize={200} maxSize={320} className="bg-[var(--panel-muted)] flex flex-col">
                <ProjectSidebar />
              </Panel>
              <PanelResizeHandle className="w-px bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />
            </>
          )}

          <Panel id="center" order={2} className="bg-[var(--bg)] relative">
            <WorkspaceCenter />
          </Panel>

          {inspectorOpen && (
            <>
              <PanelResizeHandle className="w-px bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />
              <Panel id="inspector" order={3} defaultSize={260} minSize={220} maxSize={380} className="bg-[var(--panel)] flex flex-col">
                <div className="h-[36px] border-b border-[var(--border)] flex items-center justify-between px-3 shrink-0 bg-[var(--panel-muted)]">
                  <div className="flex items-center text-[var(--text-muted)] text-[11px] font-semibold tracking-wider uppercase">
                    <Info className="w-3.5 h-3.5 mr-1.5" />
                    Inspector
                  </div>
                  <button 
                    className="p-1 hover:bg-[var(--panel)] rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => setInspectorOpen(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <Inspector />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {drawerOpen && (
        <div className="flex-none border-t border-[var(--border)] bg-[var(--panel)] overflow-hidden" style={{ height: 220 }}>
          <ActivityDrawerContent />
        </div>
      )}
      
      <EditorStatusBar drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
      
      <WebMCPBridge />
      <CloningApprovalModal />
    </div>
  );
}

function ActivityDrawerContent() {
  const events = useActivityStore(s => s.events);

  if (events.length === 0) {
    return (
      <div className="p-4 text-[12px] text-[var(--text-muted)] font-ui">
        No agent activity recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full font-ui">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] sticky top-0 bg-[var(--panel)]">
            <th className="px-3 py-1.5 font-medium w-[70px]">Time</th>
            <th className="px-3 py-1.5 font-medium">Tool</th>
            <th className="px-3 py-1.5 font-medium w-[50px]">Status</th>
            <th className="px-3 py-1.5 font-medium">Input</th>
            <th className="px-3 py-1.5 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event: ActivityEvent) => {
            const d = new Date(event.timestamp);
            const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
            const shortName = event.toolName.replace('seqcraft_', '');
            return (
              <tr
                key={event.id}
                className="border-b border-[var(--border)]/50 hover:bg-[var(--panel-muted)] transition-colors"
              >
                <td className="px-3 py-1 text-[var(--text-muted)]">{time}</td>
                <td className="px-3 py-1 text-[var(--accent)] font-medium truncate max-w-[200px]">{shortName}</td>
                <td className="px-3 py-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${event.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                </td>
                <td className="px-3 py-1 text-[var(--text-muted)] truncate max-w-[200px]">{event.inputSummary}</td>
                <td className="px-3 py-1 text-[var(--text)] truncate max-w-[260px]">{event.resultSummary}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
