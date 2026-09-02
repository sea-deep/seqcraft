import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { ScientificSequence } from '../../src/scientific/nucleotide';

describe('Workspace selection state', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      activeView: 'sequence',
      selection: null,
      selectedFeatureId: null,
      stagedProposals: []
    });
  });

  const mockDoc = {
    id: 'doc1',
    name: 'pUC19',
    topology: 'circular' as const,
    sequence: new ScientificSequence('ATGCATGCATGC', 'DNA'),
    length: 12,
    storageMode: 'memory' as const,
    alphabet: 'DNA' as const,
    features: [
      { id: 'f1', name: 'AmpR', type: 'CDS' as const, strand: 1 as const, segments: [{ start0: 2, end0Exclusive: 5 }], qualifiers: {}, source: 'imported' as const },
      { id: 'f2', name: 'ori', type: 'origin' as const, strand: -1 as const, segments: [{ start0: 8, end0Exclusive: 10 }], qualifiers: {}, source: 'imported' as const }
    ],
    primers: [],
    source: 'genbank' as const,
    version: 1,
  };

  it('shared feature selection action sets both featureId and sequence bounds', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    useWorkspaceStore.getState().selectDocumentFeature('doc1', 'f1');
    
    const state = useWorkspaceStore.getState();
    expect(state.selectedFeatureId).toBe('f1');
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 2, end0Exclusive: 5 });
  });

  it('switching selected features updates state correctly', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    store.selectDocumentFeature('doc1', 'f1');
    expect(useWorkspaceStore.getState().selectedFeatureId).toBe('f1');
    
    useWorkspaceStore.getState().selectDocumentFeature('doc1', 'f2');
    const state = useWorkspaceStore.getState();
    expect(state.selectedFeatureId).toBe('f2');
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 8, end0Exclusive: 10 });
  });

  it('feature selection survives workspace-view switching', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    store.selectDocumentFeature('doc1', 'f1');
    
    // Switch to Map
    useWorkspaceStore.getState().setActiveView('map');
    
    let state = useWorkspaceStore.getState();
    expect(state.activeView).toBe('map');
    expect(state.selectedFeatureId).toBe('f1');
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 2, end0Exclusive: 5 });
    
    // Switch back to Sequence
    useWorkspaceStore.getState().setActiveView('sequence');
    
    state = useWorkspaceStore.getState();
    expect(state.activeView).toBe('sequence');
    expect(state.selectedFeatureId).toBe('f1');
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 2, end0Exclusive: 5 });
  });

  it('handles single-base nucleotide selection', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    useWorkspaceStore.getState().setSelection('doc1', 4, 5);
    
    const state = useWorkspaceStore.getState();
    expect(state.selectedFeatureId).toBeNull();
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 4, end0Exclusive: 5 });
  });

  it('handles origin-spanning circular selection on circular topology', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    // Select from index 10 across origin to index 3
    useWorkspaceStore.getState().setSelection('doc1', 10, 3);
    
    const state = useWorkspaceStore.getState();
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 10, end0Exclusive: 3 });

    // Switching views preserves origin-spanning selection
    useWorkspaceStore.getState().setActiveView('map');
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 10, end0Exclusive: 3 });

    useWorkspaceStore.getState().setActiveView('sequence');
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 10, end0Exclusive: 3 });
  });

  it('beginning nucleotide selection clears active feature selection', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    // Select AmpR feature
    store.selectDocumentFeature('doc1', 'f1');
    expect(useWorkspaceStore.getState().selectedFeatureId).toBe('f1');
    
    // Now start a nucleotide selection
    store.setSelection('doc1', 5, 7);
    const state = useWorkspaceStore.getState();
    expect(state.selectedFeatureId).toBeNull();
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 5, end0Exclusive: 7 });
  });

  it('selecting a feature overrides active nucleotide selection with feature bounds', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(mockDoc);
    
    // Start with arbitrary nucleotide selection
    store.setSelection('doc1', 0, 2);
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 0, end0Exclusive: 2 });
    expect(useWorkspaceStore.getState().selectedFeatureId).toBeNull();
    
    // Select ori feature
    store.selectDocumentFeature('doc1', 'f2');
    const state = useWorkspaceStore.getState();
    expect(state.selectedFeatureId).toBe('f2');
    expect(state.selection).toEqual({ documentId: 'doc1', start0: 8, end0Exclusive: 10 });
  });
});
