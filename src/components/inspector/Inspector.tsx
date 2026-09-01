import { useWorkspaceStore } from '../../state/workspace-store';
import { DocumentInspector } from './DocumentInspector';
import { SelectionInspector } from './SelectionInspector';
import { FeatureInspector } from './FeatureInspector';
import { RestrictionInspector } from './RestrictionInspector';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';

export function Inspector() {
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const documents = useWorkspaceStore(s => s.documents);
  const selection = useWorkspaceStore(s => s.selection);
  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);
  const selectedRestrictionSiteId = useWorkspaceStore(s => s.selectedRestrictionSiteId);

  const activeDoc = documents.find(d => d.id === activeDocumentId);

  if (!activeDoc) {
    return (
      <div className="p-4 text-[var(--text-muted)] text-sm">
        No sequence loaded
      </div>
    );
  }

  // We should compute restriction sites here to find the selected one.
  const restrictionSites = analyzeRestrictionSites(activeDoc.sequence.raw, activeDoc.topology, BUILTIN_ENZYMES);

  // Precedence: Restriction Site > Feature > Selection > Document
  let content = null;
  
  if (selectedRestrictionSiteId) {
    const site = restrictionSites.find(s => s.id === selectedRestrictionSiteId);
    if (site) {
      content = <RestrictionInspector site={site} />;
    }
  }
  
  if (!content && selectedFeatureId) {
    const feature = activeDoc.features.find(f => f.id === selectedFeatureId);
    if (feature) {
      content = <FeatureInspector feature={feature} />;
    }
  }
  
  if (!content && selection && selection.documentId === activeDocumentId) {
    content = <SelectionInspector document={activeDoc} selection={selection} />;
  }
  
  if (!content) {
    content = <DocumentInspector document={activeDoc} />;
  }

  return (
    <div className="p-3 h-full overflow-y-auto bg-[var(--panel)]">
      {content}
    </div>
  );
}
