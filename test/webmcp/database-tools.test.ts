import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import {
  seqcraftSearchSequenceDatabaseTool,
  seqcraftImportFromDatabaseTool
} from '../../src/webmcp/tools/database';
import { getMemorySequence } from '../../src/utils/document-utils';

describe('WebMCP Database Import Tools', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      selection: null
    });
  });

  it('seqcraft_search_sequence_database returns compact candidate records', async () => {
    const res = await seqcraftSearchSequenceDatabaseTool.execute({
      provider: 'ncbi',
      query: 'pBR322',
      limit: 3
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const { result } = res;
    expect(result.provider).toBe('ncbi');
    expect(result.query).toBe('pBR322');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    const first = result.results[0];
    expect(first.accession).toBeDefined();
    expect(first.title).toBeDefined();
    expect(typeof first.lengthBp === 'number' || first.lengthBp === undefined).toBe(true);
  }, 15000);

  it('seqcraft_search_sequence_database handles empty query and unknown provider gracefully', async () => {
    const errRes1 = await seqcraftSearchSequenceDatabaseTool.execute({ query: '' });
    expect(errRes1.ok).toBe(false);
    if (!errRes1.ok) {
      expect(errRes1.error.code).toBe('INVALID_INPUT');
    }

    const errRes2 = await seqcraftSearchSequenceDatabaseTool.execute({ provider: 'fake_db', query: 'pBR322' });
    expect(errRes2.ok).toBe(false);
    if (!errRes2.ok) {
      expect(errRes2.error.code).toBe('UNKNOWN_PROVIDER');
    }
  });

  it('seqcraft_import_from_database imports pBR322 (J01749.1) with full GenBank annotations and provenance', async () => {
    const res = await seqcraftImportFromDatabaseTool.execute({
      provider: 'ncbi',
      accession: 'J01749.1',
      openAfterImport: true
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const { result } = res;
    expect(result.status).toBe('imported');
    expect(result.name).toBe('pBR322');
    expect(result.accession).toBe('J01749.1');
    expect(result.lengthBp).toBe(4361);
    expect(result.topology).toBe('circular');
    expect(result.featureCount).toBe(50);
    expect(result.documentId).toBeDefined();
    expect(result.activeDocumentId).toBe(result.documentId);

    // Verify committed state in Zustand store
    const store = useWorkspaceStore.getState();
    expect(store.activeDocumentId).toBe(result.documentId);
    const doc = store.documents.find(d => d.id === result.documentId);
    expect(doc).toBeDefined();
    expect(doc?.name).toBe('pBR322');
    expect(doc?.length).toBe(4361);
    expect(doc?.topology).toBe('circular');
    expect(doc?.features.length).toBe(50);

    // Verify provenance attachment
    expect(doc?.provenance).toBeDefined();
    expect(doc?.provenance?.provider).toBe('ncbi');
    expect(doc?.provenance?.accession).toBe('J01749.1');
    expect(doc?.provenance?.sourceUrl).toBe('https://www.ncbi.nlm.nih.gov/nuccore/J01749.1');
    expect(doc?.provenance?.fetchedAt).toBeDefined();
  }, 20000);

  it('seqcraft_import_from_database imports eGFP (OQ870305.1) and updates active document', async () => {
    const res = await seqcraftImportFromDatabaseTool.execute({
      provider: 'ncbi',
      accession: 'OQ870305.1',
      openAfterImport: true
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const { result } = res;
    expect(result.status).toBe('imported');
    expect(result.accession).toBe('OQ870305.1');
    expect(result.lengthBp).toBe(783);
    expect(result.topology).toBe('linear');
    expect(result.featureCount).toBeGreaterThan(0);
    expect(result.activeDocumentId).toBe(result.documentId);

    const doc = useWorkspaceStore.getState().documents.find(d => d.id === result.documentId);
    expect(doc?.features.some(f => f.name.includes('eGFP') || f.type.toLowerCase().includes('cds'))).toBe(true);
  }, 20000);

  it('seqcraft_import_from_database imports Addgene curated plasmid 12260 (pX330)', async () => {
    const res = await seqcraftImportFromDatabaseTool.execute({
      provider: 'addgene',
      accession: '12260',
      openAfterImport: true
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const { result } = res;
    expect(result.status).toBe('imported');
    expect(result.name).toBe('pX330');
    expect(result.accession).toBe('12260');
    expect(result.lengthBp).toBe(8484);
    expect(result.topology).toBe('circular');
    expect(result.featureCount).toBe(7);

    const doc = useWorkspaceStore.getState().documents.find(d => d.id === result.documentId);
    expect(doc?.provenance?.provider).toBe('addgene');
    expect(doc?.provenance?.sourceUrl).toBe('https://www.addgene.org/12260/');
  });

  it('seqcraft_import_from_database returns structured error on invalid accession', async () => {
    const res = await seqcraftImportFromDatabaseTool.execute({
      provider: 'ncbi',
      accession: 'INVALID_NONEXISTENT_99999'
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('UNKNOWN_ACCESSION');
      expect(res.error.message).toContain('could not find accession');
    }
  }, 15000);
});
