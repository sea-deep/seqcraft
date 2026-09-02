import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  useDefaultLayout,
} from "react-resizable-panels";
import { useWorkspaceStore } from "../state/workspace-store";
import { Info, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from 'react-hotkeys-hook';

import { WorkspaceCenter } from "../components/workspace/WorkspaceCenter";
import { Inspector } from "../components/inspector/Inspector";
import { WebMCPBridge } from '../webmcp/WebMCPBridge';
import { CloningApprovalModal } from '../components/cloning/CloningApprovalModal';
import { useActivityStore, type ActivityEvent } from "../state/activity-store";
import { applyThemePreference, useThemeStore } from "../state/theme-store";

import { AppCommandBar } from '../components/shell/AppCommandBar';
import { ProjectSidebar } from '../components/shell/ProjectSidebar';
import { EditorStatusBar } from '../components/shell/EditorStatusBar';
import { AnnotationApprovalModal } from '../components/features/AnnotationApprovalModal';
import { initializeDocumentPersistence, loadPersistedDocuments } from '../storage/document-persistence';

export function AppShell() {
  const documents = useWorkspaceStore(s => s.documents);
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const inspectorOpen = useWorkspaceStore(s => s.inspectorOpen);
  const setInspectorOpen = useWorkspaceStore(s => s.setInspectorOpen);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);
  const themePreference = useThemeStore(s => s.preference);
  const initialized = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelIds = useMemo(() => [
    ...(sidebarOpen ? ['sidebar'] : []),
    'center',
    ...(inspectorOpen ? ['inspector'] : []),
  ], [inspectorOpen, sidebarOpen]);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'seqcraft-main-layout',
    panelIds,
  });

  // Keyboard Shortcuts
  useHotkeys('alt+b', (e) => { e.preventDefault(); setSidebarOpen(!sidebarOpen); }, [sidebarOpen]);
  useHotkeys('alt+i', (e) => { e.preventDefault(); setInspectorOpen(!inspectorOpen); }, [inspectorOpen]);
  useHotkeys('alt+w', (e) => { 
    e.preventDefault(); 
    if (activeDocumentId) closeDocumentTab(activeDocumentId);
  }, [activeDocumentId]);
  
  useHotkeys('1', () => setActiveView('map'));
  useHotkeys('2', () => setActiveView('sequence'));
  useHotkeys('3', () => setActiveView('features'));
  useHotkeys('4', () => setActiveView('primers'));
  useHotkeys('5', () => setActiveView('enzymes'));

  useEffect(() => {
    return initializeDocumentPersistence();
  }, []);

  useEffect(() => {
    if (!initialized.current && documents.length === 0) {
      initialized.current = true;
      loadPersistedDocuments().then(dbDocs => {
        if (dbDocs.length > 0) {
          useWorkspaceStore.getState().addDocuments(dbDocs);
        }
      });
    }
  }, [documents.length]);

  useEffect(() => {
    applyThemePreference(themePreference);

    if (themePreference !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = () => applyThemePreference('system');
    colorScheme.addEventListener('change', handleColorSchemeChange);

    return () => colorScheme.removeEventListener('change', handleColorSchemeChange);
  }, [themePreference]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden font-ui">
      <AppCommandBar />

      <div className="flex-1 min-h-0">
        <PanelGroup
          id="seqcraft-main-layout"
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          {sidebarOpen && (
            <>
              <Panel id="sidebar" defaultSize={220} minSize={200} maxSize={320} className="bg-[var(--panel-muted)] flex flex-col">
                <ProjectSidebar />
              </Panel>
              <PanelResizeHandle className="w-px bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />
            </>
          )}

          <Panel id="center" className="bg-[var(--bg)] relative">
            <WorkspaceCenter />
          </Panel>

          {inspectorOpen && (
            <>
              <PanelResizeHandle className="w-px bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />
              <Panel id="inspector" defaultSize={260} minSize={220} maxSize={380} className="bg-[var(--panel)] flex flex-col">
                <div className="h-[36px] border-b border-[var(--border)] flex items-center justify-between px-3 shrink-0 bg-[var(--panel-muted)]">
                  <div className="flex items-center text-[var(--text)] text-[12px] font-semibold">
                    <Info className="w-3.5 h-3.5 mr-1.5 text-[var(--text-muted)]" />
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
      <AnnotationApprovalModal />
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
