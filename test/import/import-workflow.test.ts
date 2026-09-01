import { describe, it, expect, beforeEach } from 'vitest';
import { handleImportDocument } from '../../src/workflows/import-document';
import { useWorkspaceStore } from '../../src/state/workspace-store';

describe('Import Workflow', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ documents: [], activeDocumentId: null, selection: null });
  });

  it('imports one document into an empty workspace', () => {
    handleImportDocument('ATGC', 'Raw1');
    const state = useWorkspaceStore.getState();
    expect(state.documents).toHaveLength(1);
    expect(state.activeDocumentId).toBe(state.documents[0].id);
  });

  it('imports multiple FASTA records and activates the last one', () => {
    const fasta = `>seq1\nATGC\n>seq2\nCGTA`;
    handleImportDocument(fasta);
    
    const state = useWorkspaceStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.documents[0].name).toBe('seq1');
    expect(state.documents[1].name).toBe('seq2');
    expect(state.activeDocumentId).toBe(state.documents[0].id);
  });

  it('keeps existing documents intact and does not duplicate IDs', () => {
    handleImportDocument('ATGC', 'Doc1');
    handleImportDocument('CGTA', 'Doc2');
    
    const state = useWorkspaceStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.documents[0].id).not.toBe(state.documents[1].id);
  });

  it('infers RNA alphabet for raw and FASTA', () => {
    handleImportDocument('AUGC', 'RNA1');
    handleImportDocument('>seq\nAUGC', 'RNA2');
    
    const state = useWorkspaceStore.getState();
    expect(state.documents[0].alphabet).toBe('RNA');
    expect(state.documents[1].alphabet).toBe('RNA');
  });

  it('infers MIXED for mixed T and U', () => {
    handleImportDocument('ATGCU', 'MIXED1');
    const state = useWorkspaceStore.getState();
    expect(state.documents[0].alphabet).toBe('MIXED');
  });
});
