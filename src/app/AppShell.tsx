import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  useDefaultLayout,
} from "react-resizable-panels";
import { useWorkspaceStore } from "../state/workspace-store";
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
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
import { SequenceEditApprovalModal } from '../components/features/SequenceEditApprovalModal';
import { AgentRunPanel } from '../components/agent-run/AgentRunPanel';

export function AppShell() {
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const inspectorOpen = useWorkspaceStore(s => s.inspectorOpen);
  const setInspectorOpen = useWorkspaceStore(s => s.setInspectorOpen);
  const inspectorTab = useWorkspaceStore(s => s.inspectorTab);
  const setInspectorTab = useWorkspaceStore(s => s.setInspectorTab);
  const pendingTransaction = useActivityStore(s => s.pendingTransaction);
  const eventCount = useActivityStore(s => s.events.length);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const closeDocumentTab = useWorkspaceStore(s => s.closeDocumentTab);
  const themePreference = useThemeStore(s => s.preference);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (pendingTransaction) {
      setInspectorTab('agent_run');
      setInspectorOpen(true);
    }
  }, [pendingTransaction, setInspectorOpen, setInspectorTab]);
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
  useHotkeys('alt+b', (e) => {
    e.preventDefault();
    const next = !sidebarOpen;
    if (next && window.innerWidth < 760) setInspectorOpen(false);
    setSidebarOpen(next);
  }, [inspectorOpen, sidebarOpen]);
  useHotkeys('alt+i', (e) => {
    e.preventDefault();
    const next = !inspectorOpen;
    if (next && window.innerWidth < 760) setSidebarOpen(false);
    setInspectorOpen(next);
  }, [inspectorOpen, sidebarOpen]);
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
    if (typeof window.matchMedia !== 'function') return;

    const compact = window.matchMedia('(max-width: 999px)');
    const narrow = window.matchMedia('(max-width: 759px)');
    const enforceResponsivePanels = () => {
      if (compact.matches) setInspectorOpen(false);
      if (narrow.matches) setSidebarOpen(false);
    };

    enforceResponsivePanels();
    compact.addEventListener('change', enforceResponsivePanels);
    narrow.addEventListener('change', enforceResponsivePanels);
    return () => {
      compact.removeEventListener('change', enforceResponsivePanels);
      narrow.removeEventListener('change', enforceResponsivePanels);
    };
  }, [setInspectorOpen, setSidebarOpen]);

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
              <Panel id="inspector" defaultSize={300} minSize={240} maxSize={420} className="bg-[var(--panel)] flex flex-col">
                <div className="h-[36px] border-b border-[var(--border)] flex items-center justify-between px-2 shrink-0 bg-[var(--panel-muted)]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInspectorTab('details')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        inspectorTab === 'details'
                          ? 'bg-[var(--panel)] text-[var(--text)] font-semibold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('agent_run')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                        inspectorTab === 'agent_run'
                          ? 'bg-[var(--panel)] text-[var(--text)] font-semibold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span>Agent Run</span>
                      {pendingTransaction ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      ) : eventCount > 0 ? (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">({eventCount})</span>
                      ) : null}
                    </button>
                  </div>
                  <button 
                    className="p-1 hover:bg-[var(--panel)] rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                    onClick={() => setInspectorOpen(false)}
                    aria-label="Close inspector"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {inspectorTab === 'details' ? <Inspector /> : <AgentRunPanel />}
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
      <SequenceEditApprovalModal />
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
