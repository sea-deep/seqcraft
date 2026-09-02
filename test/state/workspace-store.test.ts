import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { SequenceDocument } from '../../src/domain/document';
import { ScientificSequence } from '../../src/scientific/nucleotide';

const createMockDoc = (id: string, seqString: string = "ATGC"): SequenceDocument => ({
  id,
  name: `Doc ${id}`,
  topology: "linear",
  sequence: new ScientificSequence(seqString),
  length: seqString.length,
  storageMode: 'memory',
  alphabet: "DNA",
  features: [],
  primers: [],
  source: "raw",
  version: 1
});

describe('WorkspaceStore Invariants', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      selection: null,
      stagedProposals: []
    });
  });

  it('rejects duplicate document IDs', () => {
    const store = useWorkspaceStore.getState();
    const doc1 = createMockDoc('doc1');
    store.addDocument(doc1);
    
    expect(() => useWorkspaceStore.getState().addDocument(doc1)).toThrow(/already exists/);
  });

  it('rejects activating an unknown document ID', () => {
    const store = useWorkspaceStore.getState();
    expect(() => store.setActiveDocument('unknown-id')).toThrow(/unknown document/);
  });

  it('clears selection if it does not belong to the newly active document', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(createMockDoc('doc1'));
    store.addDocument(createMockDoc('doc2'));
    store.setActiveDocument('doc1');
    store.setSelection('doc1', 0, 2);
    
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 0, end0Exclusive: 2 });
    
    useWorkspaceStore.getState().setActiveDocument('doc2');
    
    expect(useWorkspaceStore.getState().selection).toBeNull();
  });

  it('keeps selection if it belongs to the active document', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(createMockDoc('doc1'));
    store.setActiveDocument('doc1');
    store.setSelection('doc1', 0, 2);
    
    useWorkspaceStore.getState().setActiveDocument('doc1');
    expect(useWorkspaceStore.getState().selection).toEqual({ documentId: 'doc1', start0: 0, end0Exclusive: 2 });
  });

  it('removes a document and updates active document', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(createMockDoc('doc1'));
    store.addDocument(createMockDoc('doc2'));
    
    expect(useWorkspaceStore.getState().activeDocumentId).toBe('doc2');

    useWorkspaceStore.getState().removeDocument('doc1');
    expect(useWorkspaceStore.getState().activeDocumentId).toBe('doc2');
  });

  it('clears selection when its document is removed', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(createMockDoc('doc1'));
    store.addDocument(createMockDoc('doc2'));
    store.setSelection('doc1', 0, 2);
    
    useWorkspaceStore.getState().removeDocument('doc1');
    expect(useWorkspaceStore.getState().selection).toBeNull();
  });

  it('rejects selection with invalid coordinates', () => {
    const store = useWorkspaceStore.getState();
    store.addDocument(createMockDoc('doc1', 'ATGC'));
    
    expect(() => store.setSelection('doc1', -1, 2)).toThrow(/cannot be negative/);
    expect(() => store.setSelection('doc1', 2, 1)).toThrow(/end0Exclusive must be >= start0/);
    expect(() => store.setSelection('doc1', 0, 10)).toThrow(/exceeds sequence length/);
  });
});
