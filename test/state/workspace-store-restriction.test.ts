import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import type { SequenceDocument } from '../../src/domain/document';

describe('WorkspaceStore - Restriction Sites', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [{ id: 'doc1', name: 'Doc 1', topology: 'circular', sequence: { raw: 'ATGC', length: 4 }, features: [] } as any],
      activeDocumentId: 'doc1',
      activeView: 'sequence',
      selectedFeatureId: null,
      selectedRestrictionSiteId: null,
      selection: null,
    });
  });

  it('selects a restriction site', () => {
    useWorkspaceStore.getState().selectRestrictionSite('ecori_1');
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBe('ecori_1');
    expect(useWorkspaceStore.getState().selectedFeatureId).toBeNull();
    expect(useWorkspaceStore.getState().selection).toBeNull();
  });

  it('clears restriction site when a feature is selected', () => {
    useWorkspaceStore.setState({ documents: [{ id: 'doc1', topology: 'circular', sequence: { raw: 'ATGC', length: 4 }, features: [{ id: 'feat1', segments: [{ start0: 0, end0Exclusive: 1 }] }] } as any] });
    useWorkspaceStore.getState().selectRestrictionSite('ecori_1');
    useWorkspaceStore.getState().selectDocumentFeature('doc1', 'feat1');
    
    expect(useWorkspaceStore.getState().selectedFeatureId).toBe('feat1');
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBeNull();
  });

  it('clears restriction site when sequence selection is made', () => {
    useWorkspaceStore.getState().selectRestrictionSite('ecori_1');
    useWorkspaceStore.getState().setSelection('doc1', 0, 2);
    
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 0, end0Exclusive: 2 });
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBeNull();
  });

  it('preserves restriction site selection when changing views', () => {
    useWorkspaceStore.getState().selectRestrictionSite('ecori_1');
    useWorkspaceStore.getState().setActiveView('map');
    
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBe('ecori_1');
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });
});
