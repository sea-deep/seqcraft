import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';
import { useActivityStore } from '../../state/activity-store';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';

interface EditorStatusBarProps {
  drawerOpen: boolean;
  setDrawerOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function EditorStatusBar({ drawerOpen, setDrawerOpen }: EditorStatusBarProps) {
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const documents = useWorkspaceStore(s => s.documents);
  const selection = useWorkspaceStore(s => s.selection);
  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);
  const selectedPrimerId = useWorkspaceStore(s => s.selectedPrimerId);
  const selectedRestrictionSiteId = useWorkspaceStore(s => s.selectedRestrictionSiteId);
  const eventCount = useActivityStore(s => s.events.length);
  
  const activeDoc = documents.find(d => d.id === activeDocumentId);
  
  const formatNum = new Intl.NumberFormat('en-US');
  let leftStatus = 'Ready';

  if (activeDoc) {
    if (selectedRestrictionSiteId && activeDoc.storageMode === 'memory') {
      const sites = analyzeRestrictionSites(getMemorySequence(activeDoc).raw, activeDoc.topology, BUILTIN_ENZYMES);
      const site = sites.find(s => s.id === selectedRestrictionSiteId);
      if (site) {
        leftStatus = `${site.enzymeName} · cut ${site.forwardCut0 + 1} / ${site.reverseCut0 + 1}`;
      }
    } else if (selectedFeatureId) {
      const feat = activeDoc.features.find(f => f.id === selectedFeatureId);
      if (feat) {
        leftStatus = `${feat.name} · ${feat.type}`;
      }
    } else if (selectedPrimerId) {
      const primer = activeDoc.primers?.find(item => item.id === selectedPrimerId);
      if (primer) leftStatus = `${primer.name} · primer · ${primer.sequence.length} nt`;
    } else if (selection && selection.documentId === activeDocumentId) {
      const len = selection.end0Exclusive < selection.start0 
        ? (activeDoc.length - selection.start0 + selection.end0Exclusive) 
        : (selection.end0Exclusive - selection.start0);
      leftStatus = `Selection ${formatNum.format(selection.start0 + 1)}–${formatNum.format(selection.end0Exclusive)} · ${formatNum.format(len)} bp`;
    } else {
      const isCircular = activeDoc.topology === 'circular';
      leftStatus = `${activeDoc.name} · ${activeDoc.alphabet} · ${isCircular ? 'Circular' : 'Linear'} · ${formatNum.format(activeDoc.length)} bp`;
    }
  }

  // WebMCP Status (always healthy for now since WebMCPBridge is always mounted locally)
  const isWebMCPHealthy = true;

  return (
    <footer className="h-[28px] flex-none border-t border-[var(--border)] bg-[var(--panel-muted)] flex items-center justify-between px-3 text-[11px] font-ui text-[var(--text-muted)] select-none">
      <div className="flex items-center gap-4">
        <span>{leftStatus}</span>
      </div>
      
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1.5" title="WebMCP Tools Connected">
          <span>WebMCP</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isWebMCPHealthy ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
        </div>
        
        <div className="w-px h-3 bg-[var(--border)]" />
        
        <button 
          className={`flex items-center gap-1.5 h-full px-2 hover:bg-[var(--panel)] hover:text-[var(--text)] transition-colors cursor-pointer ${drawerOpen ? 'bg-[var(--panel)] text-[var(--text)]' : ''}`}
          onClick={() => setDrawerOpen(p => !p)}
        >
          <span>Agent {eventCount}</span>
        </button>
      </div>
    </footer>
  );
}
